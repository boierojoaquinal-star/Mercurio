// ============================================================================
//  GENERAR-ECONOMIA.MJS  ->  Dashboard de ECONOMÍA (datos + gráficos + noticias)
//  Datos gratis: Yahoo Finance (global), FRED (EE.UU.), dolarapi y argentinadatos (AR).
//  Diseño "diario financiero" (papel salmón) con Chart.js. Genera "economia.html".
// ============================================================================
import { crearParser, sacarImagen, limpiar, esc, llamarGemini, CARPETA } from "./comun.mjs";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const NOMBRE_SECCION = "Mercado";
const MAX_NOTICIAS = 10;
const FRED_KEY = process.env.FRED_API_KEY;
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36" };

const FUENTES = [
  { nombre: "La Nación", url: "https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/economia/?outputType=xml" },
  { nombre: "Clarín", url: "https://www.clarin.com/rss/economia/" },
  { nombre: "Infobae", url: "https://www.infobae.com/arc/outboundfeeds/rss/category/economia/?outputType=xml" },
  { nombre: "La Voz", url: "https://www.lavoz.com.ar/rss/negocios/" },
];

const parser = crearParser();

// ---------- FUENTES DE DATOS ----------
async function yahoo(symbol) {
  try {
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`, { headers: UA });
    if (!r.ok) return null;
    const m = (await r.json())?.chart?.result?.[0]?.meta;
    if (!m || m.regularMarketPrice == null) return null;
    const prev = m.chartPreviousClose ?? m.previousClose;
    return { price: m.regularMarketPrice, chg: prev ? ((m.regularMarketPrice - prev) / prev) * 100 : null };
  } catch { return null; }
}

async function fred(id) {
  if (!FRED_KEY) return null;
  try {
    const r = await fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${FRED_KEY}&file_type=json&sort_order=desc&limit=12`, { headers: UA });
    if (!r.ok) return null;
    const obs = ((await r.json()).observations || []).filter((o) => o.value !== "." && o.value !== "");
    if (!obs.length) return null;
    const v = parseFloat(obs[0].value);
    return { valor: v, chg: obs[1] ? v - parseFloat(obs[1].value) : null };
  } catch { return null; }
}

async function dolares() {
  try {
    const r = await fetch("https://dolarapi.com/v1/dolares", { headers: UA });
    if (!r.ok) return {};
    const arr = await r.json();
    const b = (casa) => arr.find((x) => x.casa === casa)?.venta;
    return { oficial: b("oficial"), blue: b("blue"), mep: b("bolsa"), ccl: b("contadoconliqui") };
  } catch { return {}; }
}

async function riesgoSerie() {
  try {
    const r = await fetch("https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais", { headers: UA });
    if (!r.ok) return [];
    return await r.json();
  } catch { return []; }
}

async function inflacionUlt() {
  try {
    const r = await fetch("https://api.argentinadatos.com/v1/finanzas/indices/inflacion", { headers: UA });
    if (!r.ok) return null;
    const d = await r.json();
    return d[d.length - 1]?.valor;
  } catch { return null; }
}

// ---------- NOTICIAS ----------
async function traerNoticias() {
  const todas = [];
  for (const f of FUENTES) {
    try {
      const feed = await parser.parseURL(f.url);
      for (const it of (feed.items || []).slice(0, 12)) {
        todas.push({
          titulo: (it.title || "").trim(), link: it.link || "",
          snippet: limpiar(it.contentSnippet || it.content || ""),
          imagen: sacarImagen(it), fuente: f.nombre, fecha: it.isoDate || it.pubDate || "",
        });
      }
    } catch {}
  }
  todas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  return todas;
}

async function pedir(candidatas) {
  const listado = candidatas.map((n, i) => `[${i}] FUENTE: ${n.fuente}\nTITULO: ${n.titulo}\nTEXTO: ${n.snippet}`).join("\n\n");
  const prompt = `Sos el editor de economía de un diario de élite (lectores del 1%), tono sobrio y experto, español de Argentina.
Te paso noticias económicas recientes (Argentina y global).
REGLAS: 1) Elegí entre 8 y ${MAX_NOTICIAS} noticias de verdadera relevancia (macro, dólar, deuda, mercados, empresas, política económica, mundo); la importancia manda. 2) DESCARTÁ ruido (finanzas personales triviales, "cómo ahorrar", virales, publinotas). 3) Priorizá Argentina pero incluí 1-2 globales de peso; no más de 4 del mismo diario. 4) Si una noticia se repite, elegí una sola. 5) Ordená por importancia (la PRIMERA es la principal). Para cada una: resumen objetivo de 3 oraciones. Además "conclusion" editorial de 3-4 oraciones.
Devolvé SOLO: { "seleccion": [ { "indice": <n>, "resumen": "<texto>" } ], "conclusion": "<texto>" }
Lista:
${listado}`;
  return llamarGemini(prompt);
}

// ---------- FORMATO ----------
const nf = (v, d = 2) => new Intl.NumberFormat("es-AR", { maximumFractionDigits: d }).format(v);
function mYahoo(label, y, dec = 2, simbolo = "") {
  if (!y) return { label, valor: "s/d", chg: null };
  return { label, valor: simbolo + nf(y.price, dec), chg: y.chg, chgStr: y.chg != null ? nf(Math.abs(y.chg), 2) + "%" : null };
}
function mFred(label, f, unidad = "%") {
  if (!f) return { label, valor: "s/d", chg: null };
  return { label, valor: nf(f.valor, 2) + unidad, chg: f.chg, chgStr: f.chg != null ? nf(Math.abs(f.chg), 2) : null };
}

// ---------- RENDER ----------
function flecha(m) {
  if (m.chg == null || m.chgStr == null) return "";
  const cls = m.chg > 0 ? "up" : m.chg < 0 ? "down" : "flat";
  const ar = m.chg > 0 ? "▲" : m.chg < 0 ? "▼" : "■";
  return ` <span class="chg ${cls}">${ar} ${esc(m.chgStr)}</span>`;
}
function celda(m) {
  return `<div class="ind"><div class="l">${esc(m.label)}</div><div class="v">${esc(m.valor)}${flecha(m)}</div>${m.alerta ? `<div class="alerta">${esc(m.alerta)}</div>` : ""}</div>`;
}
function bloque(titulo, metrics) {
  return `<section class="bloque"><h3 class="bloque-tit">${esc(titulo)}</h3><div class="indic">${metrics.map(celda).join("")}</div></section>`;
}
function tarjeta(n, resumen, lead = false) {
  const foto = n.imagen ? `<div class="foto${lead ? " foto-lead" : ""}" style="background-image:url('${esc(n.imagen)}')"></div>` : `<div class="foto${lead ? " foto-lead" : ""} sin-foto">${esc(n.fuente)}</div>`;
  return `<article class="${lead ? "lead" : "nota"}">${foto}<div class="cuerpo"><span class="src">${esc(n.fuente)}</span><h3 class="${lead ? "lead-titulo" : "titulo"}">${esc(n.titulo)}</h3><p class="resumen">${esc(resumen)}</p><a class="leer" href="${esc(n.link)}" target="_blank" rel="noopener">Leer la nota &#8594;</a></div></article>`;
}

function armarHtml({ bloques, datosGlobal, datosRiesgo }, notas, conclusion) {
  const ahora = new Date();
  const fechaLarga = ahora.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const lead = notas[0] ? tarjeta(notas[0].nota, notas[0].resumen, true) : "";
  const resto = notas.slice(1).map((x) => tarjeta(x.nota, x.resumen)).join("\n");

  return `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(NOMBRE_SECCION)} · Economía</title>
<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700;900&family=Spectral:ital,wght@0,400;0,500;1,400&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet" />
<style>
  :root{ --papel:#f5e3d7; --tinta:#2a201a; --verde:#0f6e56; --rojo:#a32d2d; --linea:#d8b9a6; --gris:#8a6b58; }
  *{ box-sizing:border-box; } body{ margin:0; background:#e3cab9; color:var(--tinta); font-family:'Spectral',Georgia,serif; font-size:18px; line-height:1.6; }
  .hoja{ max-width:1040px; margin:18px auto; background:var(--papel); border:1px solid var(--linea); box-shadow:0 0 0 7px var(--papel),0 0 0 8px var(--linea),0 16px 44px rgba(0,0,0,.3); padding:32px 36px 54px; }
  .top{ display:flex; justify-content:space-between; font-family:'Space Grotesk',sans-serif; font-size:11px; letter-spacing:2px; text-transform:uppercase; color:var(--gris); border-bottom:1px solid var(--tinta); padding-bottom:7px; }
  h1.cab{ font-family:'Playfair Display',serif; font-weight:900; font-size:clamp(40px,8vw,62px); text-align:center; margin:10px 0 2px; }
  .lema{ text-align:center; font-style:italic; color:var(--gris); margin-bottom:20px; }
  .bloque{ margin-bottom:20px; }
  .bloque-tit{ font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:12px; letter-spacing:2px; text-transform:uppercase; color:var(--gris); border-bottom:1px solid var(--linea); padding-bottom:6px; margin:0 0 10px; }
  .indic{ display:grid; grid-template-columns:repeat(4,1fr); gap:1px; background:var(--linea); border:1px solid var(--linea); }
  .ind{ background:var(--papel); padding:11px 10px; }
  .ind .l{ font-family:'Space Grotesk',sans-serif; font-size:10px; letter-spacing:.5px; text-transform:uppercase; color:var(--gris); }
  .ind .v{ font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:19px; margin-top:4px; }
  .chg{ font-size:12px; font-weight:500; } .chg.up{ color:var(--verde); } .chg.down{ color:var(--rojo); } .chg.flat{ color:var(--gris); }
  .alerta{ font-family:'Space Grotesk',sans-serif; font-size:10px; color:var(--rojo); margin-top:3px; }
  .data-nota{ text-align:right; font-family:'Space Grotesk',sans-serif; font-size:10px; color:var(--gris); margin:6px 0 18px; }
  .graficos{ display:grid; grid-template-columns:1fr 1fr; gap:24px; margin:8px 0 26px; }
  .grafico{ background:#fbf2e8; border:1px solid var(--linea); padding:14px; }
  .grafico h4{ font-family:'Space Grotesk',sans-serif; font-size:11px; letter-spacing:1.5px; text-transform:uppercase; color:var(--gris); margin:0 0 10px; }
  .grafico .lienzo{ position:relative; height:240px; }
  .lead{ display:grid; grid-template-columns:1.1fr 1fr; gap:26px; align-items:center; border-top:3px double var(--tinta); padding-top:22px; margin-bottom:26px; }
  .foto{ width:100%; height:200px; background-size:cover; background-position:center; border:1px solid var(--linea); }
  .foto-lead{ height:240px; }
  .sin-foto{ display:flex; align-items:center; justify-content:center; background:#6e4a36 !important; color:#f5e3d7; font-family:'Space Grotesk',sans-serif; font-size:12px; letter-spacing:1px; text-transform:uppercase; }
  .src{ font-family:'Space Grotesk',sans-serif; font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--verde); font-weight:700; }
  .lead-titulo{ font-family:'Playfair Display',serif; font-weight:700; font-size:clamp(28px,3.6vw,40px); line-height:1.1; margin:6px 0 12px; }
  .grilla{ display:grid; grid-template-columns:1fr 1fr; gap:30px; background:linear-gradient(var(--linea),var(--linea)) no-repeat; background-size:1px calc(100% - 20px); background-position:center 10px; }
  .nota .foto{ margin-bottom:10px; }
  .titulo{ font-family:'Playfair Display',serif; font-weight:700; font-size:24px; line-height:1.15; margin:5px 0 9px; }
  .resumen{ font-size:16.5px; margin:0 0 10px; color:#4a3b30; }
  .leer{ font-family:'Space Grotesk',sans-serif; font-size:11px; letter-spacing:1px; text-transform:uppercase; color:var(--verde); text-decoration:none; font-weight:700; }
  .editorial{ margin-top:34px; border-top:3px double var(--tinta); padding-top:18px; font-style:italic; font-size:18px; text-align:justify; color:#3a2e25; }
  .editorial b{ font-style:normal; font-family:'Space Grotesk',sans-serif; font-size:12px; letter-spacing:2px; text-transform:uppercase; color:var(--verde); display:block; margin-bottom:8px; }
  .seccion-tit{ display:flex; align-items:center; gap:12px; margin:30px 0 16px; } .seccion-tit h2{ font-family:'Space Grotesk',sans-serif; font-size:14px; letter-spacing:3px; text-transform:uppercase; margin:0; } .seccion-tit .raya{ flex:1; height:2px; background:var(--tinta); }
  footer{ margin-top:40px; text-align:center; font-family:'Space Grotesk',sans-serif; font-size:10.5px; letter-spacing:1.5px; text-transform:uppercase; color:var(--gris); border-top:1px solid var(--linea); padding-top:14px; }
  @media (max-width:680px){ .indic{ grid-template-columns:repeat(2,1fr); } .graficos,.lead,.grilla{ grid-template-columns:1fr; } .grilla{ background:none; } }
</style>
</head><body>
  <div class="hoja">
    <div class="top"><span>Economía · Argentina y el mundo</span><span>${esc(fechaLarga)}</span></div>
    <h1 class="cab">${esc(NOMBRE_SECCION)}</h1>
    <div class="lema">El tablero económico del día</div>

    ${bloques}

    <div class="data-nota">Datos en vivo: dolarapi.com · argentinadatos.com · Yahoo Finance · FRED (Reserva Federal de St. Louis)</div>

    <div class="graficos">
      <div class="grafico"><h4>Variación de hoy (%)</h4><div class="lienzo"><canvas id="chartGlobal"></canvas></div></div>
      <div class="grafico"><h4>Riesgo país — últimos 3 meses</h4><div class="lienzo"><canvas id="chartRiesgo"></canvas></div></div>
    </div>

    <div class="seccion-tit"><h2>Noticias económicas</h2><div class="raya"></div></div>
    ${lead}
    <div class="grilla">${resto}</div>

    <div class="editorial"><b>La mirada del editor</b>${esc(conclusion)}</div>
    <footer>${esc(NOMBRE_SECCION)} · sección economía de Mercurio · ${esc(fechaLarga)}<br/>Datos: dolarapi · argentinadatos · Yahoo Finance · FRED · Noticias y resúmenes por IA</footer>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
  <script>
    const DG = ${JSON.stringify(datosGlobal)};
    const DR = ${JSON.stringify(datosRiesgo)};
    if (window.Chart) {
      Chart.defaults.font.family = "'Space Grotesk', sans-serif";
      Chart.defaults.color = '#7a5c48';
      new Chart(document.getElementById('chartGlobal'), {
        type: 'bar',
        data: { labels: DG.labels, datasets: [{ data: DG.data, backgroundColor: DG.data.map(v => v >= 0 ? '#0f6e56' : '#a32d2d') }] },
        options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => v + '%' }, grid: { color: '#e3cdbb' } }, x: { grid: { display: false } } } }
      });
      new Chart(document.getElementById('chartRiesgo'), {
        type: 'line',
        data: { labels: DR.labels, datasets: [{ data: DR.data, borderColor: '#a32d2d', backgroundColor: 'rgba(163,45,45,.12)', fill: true, pointRadius: 0, borderWidth: 2, tension: .2 }] },
        options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { maxTicksLimit: 6 }, grid: { display: false } }, y: { grid: { color: '#e3cdbb' } } } }
      });
    }
  </script>
</body></html>`;
}

// ---------- PRINCIPAL ----------
async function main() {
  console.log("1) Trayendo datos (Yahoo + FRED + dolarapi + argentinadatos) y noticias...");
  const [dx, vix, spx, eem, brent, wti, cobre, oro, curva, credit, breakeven, dol, rpSerie, infl, todas] =
    await Promise.all([
      yahoo("DX-Y.NYB"), yahoo("^VIX"), yahoo("^GSPC"), yahoo("EEM"), yahoo("BZ=F"), yahoo("CL=F"), yahoo("HG=F"), yahoo("GC=F"),
      fred("T10Y2Y"), fred("BAMLH0A0HYM2"), fred("T10YIE"),
      dolares(), riesgoSerie(), inflacionUlt(), traerNoticias(),
    ]);

  // Bloque I — Costo del capital y liquidez global
  const curvaM = curva
    ? { label: "Curva 2a/10a (EE.UU.)", valor: (curva.valor >= 0 ? "+" : "") + nf(curva.valor, 2) + " pp", chg: curva.chg, chgStr: curva.chg != null ? nf(Math.abs(curva.chg), 2) : null, alerta: curva.valor < 0 ? "Invertida — señal de recesión" : null }
    : { label: "Curva 2a/10a (EE.UU.)", valor: "s/d", chg: null };
  const bloqueI = bloque("I · Costo del capital y liquidez global", [curvaM, mYahoo("Índice dólar (DXY)", dx), mFred("Credit spreads (HY)", credit)]);

  // Bloque II — Economía real
  const bloqueII = bloque("II · Economía real y materias primas", [mYahoo("Petróleo Brent", brent, 2, "US$ "), mYahoo("Petróleo WTI", wti, 2, "US$ "), mYahoo("Cobre", cobre, 3, "US$ "), mYahoo("Oro", oro, 0, "US$ ")]);

  // Bloque III — Sentimiento y expectativas
  const bloqueIII = bloque("III · Sentimiento de mercado", [mYahoo("VIX (índice del miedo)", vix), mYahoo("S&P 500", spx, 0), mYahoo("MSCI Emergentes", eem), mFred("Breakeven inflación 10a", breakeven)]);

  // Bloque IV — Argentina
  let rpVal = null, rpChg = null;
  if (rpSerie.length) { rpVal = rpSerie[rpSerie.length - 1].valor; rpChg = rpSerie.length > 1 ? rpVal - rpSerie[rpSerie.length - 2].valor : null; }
  const brecha = dol.ccl && dol.oficial ? (dol.ccl / dol.oficial - 1) * 100 : null;
  const pesos = (v) => (v == null ? "s/d" : "$" + nf(v, 0));
  const bloqueIV = bloque("IV · Argentina — riesgo y distorsión local", [
    { label: "Dólar oficial", valor: pesos(dol.oficial), chg: null },
    { label: "Dólar blue", valor: pesos(dol.blue), chg: null },
    { label: "Dólar MEP", valor: pesos(dol.mep), chg: null },
    { label: "Contado c/liqui", valor: pesos(dol.ccl), chg: null },
    { label: "Brecha (CCL/oficial)", valor: brecha != null ? nf(brecha, 1) + "%" : "s/d", chg: null },
    { label: "Riesgo país (EMBI)", valor: rpVal != null ? nf(rpVal, 0) : "s/d", chg: rpChg, chgStr: rpChg != null ? String(Math.abs(Math.round(rpChg))) : null },
    { label: "Inflación mensual", valor: infl != null ? nf(infl, 1) + "%" : "s/d", chg: null },
  ]);

  const bloques = bloqueI + bloqueII + bloqueIII + bloqueIV;

  // Datos de los gráficos
  const gItems = [["S&P 500", spx], ["Emergentes", eem], ["Brent", brent], ["Cobre", cobre], ["Oro", oro], ["VIX", vix], ["DXY", dx]].filter(([, y]) => y && y.chg != null);
  const datosGlobal = { labels: gItems.map((x) => x[0]), data: gItems.map((x) => +x[1].chg.toFixed(2)) };
  const rp = rpSerie.slice(-90);
  const datosRiesgo = { labels: rp.map((p) => p.fecha), data: rp.map((p) => p.valor) };

  // Noticias
  const candidatas = todas.slice(0, 48);
  console.log(`2) La IA elige y resume (${candidatas.length} candidatas)...`);
  const r = await pedir(candidatas);
  const notas = (r.seleccion || []).map((s) => ({ nota: candidatas[s.indice], resumen: s.resumen })).filter((x) => x.nota);

  console.log(`3) Armando dashboard con ${notas.length} noticias...`);
  const html = armarHtml({ bloques, datosGlobal, datosRiesgo }, notas, r.conclusion || "");
  const salida = join(CARPETA, "economia.html");
  writeFileSync(salida, html, "utf8");
  console.log(`\nLISTO. Dashboard de Economía generado en: ${salida}`);
}

main().catch((e) => { console.error("Falló la generación:", e.message); process.exitCode = 1; });
