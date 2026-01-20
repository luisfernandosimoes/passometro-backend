function limpar(texto) {
  return texto
    .replace(/\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/* =====================================================
   CONTROLES — CHECKPOINT 14.0 (ADM CORRIGIDO)
===================================================== */

function normalizarControle(linha) {
  if (!linha || typeof linha !== "string") return linha;

  let texto = limpar(linha);

  texto = texto.replace(/\bDIU\b/gi, "DU");
  texto = texto.replace(/Débito urin[aá]rio/gi, "DU");
  texto = texto.replace(/\bDiurese\b/gi, "DU");

  const dataMatch = texto.match(/(\d{2}\/\d{2})/);
  const data = dataMatch ? dataMatch[1] : null;

  let termico = null;
  let febreValor = false;

  if (/afebril/i.test(texto)) {
    termico = "Afebril";
  } else if (/subfebril/i.test(texto)) {
    const vals = [...texto.matchAll(/(\d{2}[.,]\d)/g)].map(m => m[1]);
    termico = vals.length
      ? `Subfebril ${vals.length}x (${vals.join("; ")})`
      : "Subfebril";
    febreValor = true;
  } else if (/febre/i.test(texto)) {
    const vals = [...texto.matchAll(/(\d{2}[.,]\d)/g)].map(m => m[1]);
    termico = vals.length
      ? `Febre ${vals.length}x (${vals.join("; ")})`
      : "Febre";
    febreValor = true;
  }

  function intervalo(label, regex) {
    const m = texto.match(regex);
    if (!m) return null;
    return `${label} ${m[1]}–${m[2]}`;
  }

  const FC = intervalo("FC", /FC\s*(\d+)[^\d]+(\d+)/i);
  const FR = intervalo("FR", /FR\s*(\d+)[^\d]+(\d+)/i);
  const PAM = intervalo("PAM", /PAM\s*(\d+)[^\d]+(\d+)/i);
  const SAT = intervalo("SAT", /SAT\s*(\d+)[^\d]+(\d+)/i);
  const HGT = intervalo("HGT", /HGT\s*(\d+)[^\d]+(\d+)/i);

  /* ===== ADM — SOMENTE TOTAL EXPLÍCITO, SEM UNIDADE ===== */
  let ADM = null;
  const admMatch = texto.match(
    /\bADM\b\s*(total\s*)?(\d{3,5})\b/i
  );
  if (admMatch) {
    ADM = `ADM ${admMatch[2]}`;
  }

  let DU = null;
  const duMatch = texto.match(/DU\s*(\d+)/i);
  if (duMatch) DU = `DU ${duMatch[1]}`;

  /* ===== BLINDAGEM DEFINITIVA DO BH ===== */
  let BH = null;
  const bhMatch = texto.match(/BH\s*([+-]?\s*\d+)/i);
  if (bhMatch) {
    const valorNumerico = Number(
      bhMatch[1].replace(/\s+/g, "")
    );
    if (!Number.isNaN(valorNumerico)) {
      if (valorNumerico > 0) BH = `BH +${valorNumerico}`;
      else if (valorNumerico < 0) BH = `BH ${valorNumerico}`;
      else BH = "BH 0";
    }
  }

  let Dej = null;
  if (/dej\s*aus/i.test(texto)) Dej = "Dej aus";
  else if (/dej\s*(\d+)/i.test(texto)) {
    const m = texto.match(/dej\s*(\d+)/i);
    Dej = `Dej ${m[1]}x`;
  }

  const partes = [
    termico,
    FC,
    FR,
    PAM,
    SAT,
    HGT,
    ADM,
    DU,
    BH,
    Dej,
  ].filter(Boolean);

  if (!data || partes.length === 0) return linha;

  const destaques = {};

  if (DU) {
    const v = parseInt(DU.match(/DU\s*(\d+)/)[1], 10);
    if (v <= 500) destaques.DU = "alerta";
    else if (v <= 800) destaques.DU = "atencao";
  }

  if (FC) {
    const [a, b] = FC.match(/(\d+)–(\d+)/).slice(1).map(Number);
    if (b > 120 || a < 50) destaques.FC = "alerta";
  }

  if (febreValor) destaques.TERMICO = "alerta";

  return {
    texto: `${data}: ${partes.join(" | ")}`,
    destaques,
  };
}

/* =====================================================
   LABORATÓRIO — CHECKPOINT 13.3 (INALTERADO)
===================================================== */

function normalizarLaboratorio(linha) {
  if (!linha || typeof linha !== "string") return linha;

  let texto = limpar(linha);

  texto = texto.replace(/\bUr(eia|éia)?\b/gi, "U");
  texto = texto.replace(/\bCreatinina\b/gi, "Cr");
  texto = texto.replace(/\bS[oó]dio\b/gi, "Na");
  texto = texto.replace(/\bPot[aá]ssio\b/gi, "K");
  texto = texto.replace(/\bMagn[eé]sio\b/gi, "Mg");

  const destaques = {};

  function extrair(regex) {
    const m = texto.match(regex);
    if (!m) return null;
    return parseFloat(m[1].replace(",", "."));
  }

  const Hb = extrair(/Hb\s*([\d.,]+)/i);
  if (Hb !== null && Hb < 9) destaques.Hb = "alerta";

  const Ht = extrair(/Ht\s*([\d.,]+)/i);
  if (Ht !== null && Ht > 45) destaques.Ht = "alerta";

  const Cr = extrair(/Cr\s*([\d.,]+)/i);
  if (Cr !== null && Cr > 1.3) destaques.Cr = "alerta";

  const Na = extrair(/Na\s*([\d.,]+)/i);
  if (Na !== null && (Na < 135 || Na > 150)) destaques.Na = "alerta";

  const K = extrair(/K\s*([\d.,]+)/i);
  if (K !== null && (K < 3.5 || K > 5.1)) destaques.K = "alerta";

  const Mg = extrair(/Mg\s*([\d.,]+)/i);
  if (Mg !== null && (Mg < 1.58 || Mg > 2.56)) destaques.Mg = "alerta";

  const U = extrair(/U\s*([\d.,]+)/i);
  if (U !== null && U > 45) destaques.U = "alerta";

  const PCR = extrair(/PCR\s*([\d.,]+)/i);
  if (PCR !== null && PCR >= 6) destaques.PCR = "alerta";

  return {
    texto,
    destaques,
  };
}

/* =====================================================
   GASOMETRIA — CHECKPOINT 13.3 (INALTERADO)
===================================================== */

function normalizarGasometria(linha) {
  if (linha && typeof linha === "object" && typeof linha.texto === "string") {
    return {
      texto: limpar(linha.texto),
      destaques: linha.destaques || {},
    };
  }

  if (!linha || typeof linha !== "string") {
    return null;
  }

  const texto = limpar(linha);
  const destaques = {};

  function extrair(regex) {
    const m = texto.match(regex);
    if (!m) return null;
    return parseFloat(m[1].replace(",", "."));
  }

  const pH = extrair(/pH\s*([\d.]+)/i);
  if (pH !== null && (pH < 7.30 || pH > 7.50)) destaques.pH = "alerta";

  const pCO2 = extrair(/pCO2\s*([\d.]+)/i);
  if (pCO2 !== null && (pCO2 < 30 || pCO2 > 50)) destaques.pCO2 = "alerta";

  const pO2 = extrair(/pO2\s*([\d.]+)/i);
  if (pO2 !== null && pO2 < 60) destaques.pO2 = "alerta";

  const HCO3 = extrair(/HCO3\s*([\d.]+)/i);
  if (HCO3 !== null && (HCO3 < 18 || HCO3 > 28)) destaques.HCO3 = "alerta";

  const Aa = extrair(/A-a\s*([\d.]+)/i);
  if (Aa !== null && Aa > 50) destaques["A-a"] = "alerta";

  const PF = extrair(/P\/F\s*([\d.]+)/i);
  if (PF !== null) {
    if (PF < 200) destaques["P/F"] = "alerta";
    else if (PF < 300) destaques["P/F"] = "atencao";
  }

  const SAT = extrair(/SAT\s*(\d+)/i);
  if (SAT !== null && SAT < 90) destaques.SAT = "alerta";

  return {
    texto,
    destaques,
  };
}

module.exports = {
  normalizarControle,
  normalizarLaboratorio,
  normalizarGasometria,
  normalizarHDA, // 🔹 NOVO
};

/* =====================================================
   HDA — NORMALIZAÇÃO EM TÓPICOS
===================================================== */

function normalizarHDA(texto) {
  if (!texto || typeof texto !== "string") return texto;

  // Se não houver delimitador, retorna texto limpo
  if (!texto.includes("||")) {
    return texto.trim();
  }

  const topicos = texto
    .split("||")
    .map(t => t.trim())
    .filter(Boolean);

  // Renderização final: uma linha por tópico, com ▸
  return topicos.map(t => `▸ ${t}`).join("\n");
}