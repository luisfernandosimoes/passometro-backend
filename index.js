require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { gerarPassometro } = require("./services/gerarPassometro");

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));

/* =====================================================
   FUNÇÕES UTILITÁRIAS — IDENTIFICAÇÃO
===================================================== */

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

  if (numeroLeito && nome) {
    cabecalho = `LEITO ${numeroLeito}: ${nome}`;
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

/* =====================================================
   ROTAS
===================================================== */

app.post("/api/gerar-passometro", async (req, res) => {
  try {
    const {
      evolucaoAnterior = "",
      controles = "",
      laboratorio = "",
      gasometria = "",
    } = req.body;

    const resultado = await gerarPassometro({
      evolucaoAnterior,
      controles,
      laboratorio,
      gasometria,
    });

    res.json(resultado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao gerar passômetro" });
  }
});

/* =====================================================
   NOVA ROTA — FORMATAR IDENTIFICAÇÃO (EDIÇÃO MANUAL)
===================================================== */

app.post("/api/formatar-identificacao", (req, res) => {
  try {
    const identBruta = req.body || {};

    const identificacao = normalizarIdentificacao(identBruta);
    const identificacaoFormatada =
      formatarIdentificacaoFinal(identificacao);

    res.json({
      identificacao,
      identificacaoFormatada,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao formatar identificação" });
  }
});

/* =====================================================
   ROTA DE SAÚDE
===================================================== */

app.get("/", (req, res) => {
  res.send("Passômetro Backend OK");
});

/* =====================================================
   SERVIDOR
===================================================== */

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Backend rodando na porta ${PORT}`);
});