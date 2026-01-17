const OpenAI = require("openai");

const promptEvolucao = require("../prompts/promptEvolucao");
const promptControles = require("../prompts/promptControles");
const promptLaboratorio = require("../prompts/promptLaboratorio");
const promptGasometria = require("../prompts/promptGasometria");

const {
  normalizarControle,
  normalizarLaboratorio,
  normalizarGasometria,
} = require("./normalizadores");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function parseJSONSeguro(texto) {
  if (!texto || typeof texto !== "string") {
    throw new Error("Resposta inválida da IA");
  }

  const inicio = texto.indexOf("{");
  const fim = texto.lastIndexOf("}");

  if (inicio === -1 || fim === -1 || fim <= inicio) {
    throw new Error("JSON não encontrado na resposta");
  }

  return JSON.parse(texto.slice(inicio, fim + 1));
}

async function chamarIA(prompt, texto) {
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    max_tokens: 1400,
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: texto },
    ],
  });

  return parseJSONSeguro(completion.choices[0].message.content);
}

async function gerarPassometro({
  evolucaoAnterior = "",
  controles = "",
  laboratorio = "",
  gasometria = "",
}) {
  const resultado = {
    identificacao: {}, // SOMENTE controles podem preencher
    problemas: "",
    hda: "",
    evolucao: "",
    controles: [],
    laboratorio: [],
    gasometria: [],
    medicacoes: "",
    condutas: "",
    intercorrencias: null,
  };

  // Buffers internos
  let controlesHistoricos = [];
  let laboratorioHistorico = [];
  let gasometriaHistorica = [];

  let controlesNovos = [];
  let laboratorioNovo = [];
  let gasometriaNova = [];

  // 🔹 EVOLUÇÃO (histórica – SEM identificação)
  if (evolucaoAnterior.trim()) {
    const r = await chamarIA(promptEvolucao, evolucaoAnterior);

    resultado.problemas = r.problemas || "";
    resultado.hda = r.hda || "";
    resultado.evolucao = r.evolucao || "";
    resultado.medicacoes = r.medicacoes || "";
    resultado.condutas = r.condutas || "";
    resultado.intercorrencias = r.intercorrencias ?? null;

    controlesHistoricos = (r.controles || []).map(normalizarControle);
    laboratorioHistorico = (r.laboratorio || []).map(normalizarLaboratorio);
    gasometriaHistorica = (r.gasometria || []).map(normalizarGasometria);
  }

  // 🔹 CONTROLES NOVOS (FONTE ÚNICA DA IDENTIFICAÇÃO)
  if (controles.trim()) {
    const r = await chamarIA(promptControles, controles);

    controlesNovos = (r.controles || []).map(normalizarControle);

    if (r.identificacao) {
      resultado.identificacao = r.identificacao;
    }
  }

  // 🔹 LABORATÓRIO NOVO
  if (laboratorio.trim()) {
    const r = await chamarIA(promptLaboratorio, laboratorio);
    laboratorioNovo = (r.laboratorio || []).map(normalizarLaboratorio);
  }

  // 🔹 GASOMETRIA NOVA
  if (gasometria.trim()) {
    const r = await chamarIA(promptGasometria, gasometria);

    let bruto = r.gasometria || [];

    if (typeof bruto === "string") {
      bruto = [bruto];
    }

    if (Array.isArray(bruto)) {
      gasometriaNova = bruto.map(normalizarGasometria);
    }
  }

  // 🔹 FUSÃO FINAL (regras clínicas)
  resultado.controles = [
    ...controlesNovos,
    ...controlesHistoricos,
  ].slice(0, 3);

  resultado.laboratorio = [
    ...laboratorioNovo,
    ...laboratorioHistorico,
  ].slice(0, 3);

  resultado.gasometria = [
    ...gasometriaNova,
    ...gasometriaHistorica,
  ].slice(0, 3);

  return resultado;
}

module.exports = { gerarPassometro };