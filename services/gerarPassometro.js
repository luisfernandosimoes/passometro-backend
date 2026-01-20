const OpenAI = require("openai");

const promptEvolucao = require("../prompts/promptEvolucao");
const promptControles = require("../prompts/promptControles");
const promptLaboratorio = require("../prompts/promptLaboratorio");
const promptGasometria = require("../prompts/promptGasometria");

const {
  normalizarControle,
  normalizarLaboratorio,
  normalizarGasometria,
  normalizarHDA, // 🔹 NOVO
} = require("./normalizadores");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* =====================================================
   FUNÇÕES UTILITÁRIAS
===================================================== */

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

function normalizarIdentificacao(ident = {}) {
  const out = {};

  if (ident.nome) {
    out.nome = String(ident.nome).trim().toUpperCase();
  }

  if (ident.leito) {
    out.leito = String(ident.leito).trim().toUpperCase();
  }

  if (ident.sexo) {
    out.sexo = String(ident.sexo).trim().toUpperCase();
  }

  if (ident.idade !== undefined && ident.idade !== null && ident.idade !== "") {
    out.idade = ident.idade;
  }

  return out;
}

function extrairNumeroLeito(leito) {
  if (!leito) return null;
  const m = String(leito).match(/(\d+)\s*$/);
  if (!m) return null;
  return m[1].padStart(2, "0");
}

function formatarIdentificacaoFinal(ident = {}) {
  const partes = [];

  const numeroLeito = extrairNumeroLeito(ident.leito);
  const nome = ident.nome;
  const idade = ident.idade;
  const sexo = ident.sexo;

  let cabecalho = null;

  if (numeroLeito) {
    if (nome) {
      cabecalho = `LEITO ${numeroLeito}: ${nome}`;
    } else {
      cabecalho = `LEITO ${numeroLeito}: PACIENTE NÃO IDENTIFICADO`;
    }
  } else if (nome) {
    cabecalho = nome;
  }

  if (cabecalho) {
    partes.push(cabecalho);
  }

  if (idade) {
    partes.push(`${idade} ANOS`);
  }

  if (sexo) {
    partes.push(sexo);
  }

  return partes.join(" | ");
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

/* =====================================================
   FUNÇÃO PRINCIPAL
===================================================== */

async function gerarPassometro({
  evolucaoAnterior = "",
  controles = "",
  laboratorio = "",
  gasometria = "",
  leitoInsercao = "", // 🔹 NOVO: vindo da tela de inserção
}) {
  const resultado = {
    identificacao: {},
    identificacaoFormatada: "",
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

  // Buffers
  let controlesHistoricos = [];
  let laboratorioHistorico = [];
  let gasometriaHistorica = [];

  let controlesNovos = [];
  let laboratorioNovo = [];
  let gasometriaNova = [];

  /* ================= EVOLUÇÃO ================= */

  if (evolucaoAnterior.trim()) {
    const r = await chamarIA(promptEvolucao, evolucaoAnterior);

    resultado.problemas = r.problemas || "";
    resultado.hda = normalizarHDA(r.hda || "");
    resultado.evolucao = r.evolucao || "";
    resultado.medicacoes = r.medicacoes || "";
    resultado.condutas = r.condutas || "";
    resultado.intercorrencias = r.intercorrencias ?? null;

    controlesHistoricos = (r.controles || []).map(normalizarControle);
    laboratorioHistorico = (r.laboratorio || []).map(normalizarLaboratorio);
    gasometriaHistorica = (r.gasometria || []).map(normalizarGasometria);
  }

  /* ================= CONTROLES (IDENTIFICAÇÃO DA IA) ================= */

  if (controles.trim()) {
    const r = await chamarIA(promptControles, controles);
    controlesNovos = (r.controles || []).map(normalizarControle);

    if (r.identificacao) {
      resultado.identificacao = r.identificacao;
    }
  }

  /* ================= LABORATÓRIO ================= */

  if (laboratorio.trim()) {
    const r = await chamarIA(promptLaboratorio, laboratorio);
    laboratorioNovo = (r.laboratorio || []).map(normalizarLaboratorio);
  }

  /* ================= GASOMETRIA ================= */

  if (gasometria.trim()) {
    const r = await chamarIA(promptGasometria, gasometria);

    let bruto = r.gasometria || [];
    if (typeof bruto === "string") bruto = [bruto];

    if (Array.isArray(bruto)) {
      gasometriaNova = bruto.map(normalizarGasometria);
    }
  }

  /* ================= FUSÃO ================= */

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

  /* ================= IDENTIFICAÇÃO FINAL ================= */

  // 🔹 Garantir leito mesmo sem controles
  if (leitoInsercao && !resultado.identificacao.leito) {
    resultado.identificacao.leito = leitoInsercao;
  }

  resultado.identificacao = normalizarIdentificacao(
    resultado.identificacao
  );

  resultado.identificacaoFormatada =
    formatarIdentificacaoFinal(resultado.identificacao);

  return resultado;
}

module.exports = { gerarPassometro };