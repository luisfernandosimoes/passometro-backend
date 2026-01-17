require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { gerarPassometro } = require("./services/gerarPassometro");

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));

/* =========================
   ROTAS
========================= */

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

/* =========================
   ROTA DE SAÚDE (IMPORTANTE)
========================= */

app.get("/", (req, res) => {
  res.send("Passômetro Backend OK");
});

/* =========================
   SERVIDOR (RENDER)
========================= */

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Backend rodando na porta ${PORT}`);
});