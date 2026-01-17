const express = require("express");
const router = express.Router();

const {
  normalizarLaboratorio,
} = require("../services/normalizadores");

/* ===============================
   NORMALIZAR LABORATÓRIO (FRONT)
=============================== */

router.post("/normalizar-laboratorio", (req, res) => {
  try {
    const { texto } = req.body;

    if (!texto || typeof texto !== "string") {
      return res.status(400).json({ error: "Texto inválido" });
    }

    const linhas = texto
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean);

    const resultado = linhas.map(linha =>
      normalizarLaboratorio(linha)
    );

    res.json({ laboratorio: resultado });
  } catch (e) {
    console.error("Erro normalizando laboratório:", e);
    res.status(500).json({ error: "Erro interno" });
  }
});

module.exports = router;