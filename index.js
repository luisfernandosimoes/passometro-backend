require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { gerarPassometro } = require("./services/gerarPassometro");

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

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

app.listen(3001, () => {
  console.log("Backend rodando em http://localhost:3001");
});