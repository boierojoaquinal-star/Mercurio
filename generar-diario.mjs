// ============================================================================
//  GENERAR-DIARIO.MJS  ->  Arma el diario personal (seccion Cordoba/Argentina)
//
//  Que hace, en criollo:
//   1) Lee las noticias de varias fuentes RSS (con su foto y su link).
//   2) Se las manda a la IA de Google (Gemini) para que elija las mejores
//      (mitad Cordoba, mitad nacionales), las resuma y escriba una conclusion.
//   3) Genera un archivo "diario.html" con diseño epico tipo diario antiguo.
// ============================================================================

import Parser from "rss-parser";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// ----------------------------------------------------------------------------
//  AJUSTES QUE PODES CAMBIAR FACIL
// ----------------------------------------------------------------------------
const TITULO = "Mercurio";                 // <-- el nombre del diario (cambialo aca)
const LEMA = "Crónica del día · ediciones de mañana y noche";
const MAX_NOTICIAS = 14;                    // tope de noticias por sección
const MODELO = "gemini-3.5-flash";

// --- Ubicacion de este archivo (para encontrar el .env y guardar el .html) ---
const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Cargar la llave desde .env (si existe). En GitHub usaremos un "Secret". ---
const envPath = join(__dirname, ".env");
if (existsSync(envPath)) {
  for (const linea of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("ERROR: no encontre la llave GEMINI_API_KEY.");
  process.exit(1);
}

// --- Las fuentes de la seccion Cordoba / Argentina ---------------------------
const FUENTES = [
  // La Voz = Córdoba. Las demás = nacional / internacional. Solo feeds de noticias DURAS.
  { nombre: "La Voz", url: "https://www.lavoz.com.ar/rss/politica/" },
  { nombre: "La Voz", url: "https://www.lavoz.com.ar/rss/sucesos/" },
  { nombre: "La Voz", url: "https://www.lavoz.com.ar/rss/negocios/" },
  { nombre: "Clarín", url: "https://www.clarin.com/rss/politica/" },
  { nombre: "Clarín", url: "https://www.clarin.com/rss/economia/" },
  { nombre: "Clarín", url: "https://www.clarin.com/rss/mundo/" },
  { nombre: "La Nación", url: "https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/politica/?outputType=xml" },
  { nombre: "Infobae", url: "https://www.infobae.com/arc/outboundfeeds/rss/category/politica/?outputType=xml" },
];

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  },
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
    ],
  },
});

// ----------------------------------------------------------------------------
//  FUNCIONES AUXILIARES
// ----------------------------------------------------------------------------
function sacarImagen(item) {
  if (item.enclosure?.url) return item.enclosure.url;
  const mc = item.mediaContent?.find((x) => x?.$?.url)?.$?.url;
  if (mc) return mc;
  const mt = item.mediaThumbnail?.find((x) => x?.$?.url)?.$?.url;
  if (mt) return mt;
  const html = item["content:encoded"] || item.content || "";
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (m) return m[1];
  return null;
}

function limpiar(texto = "", max = 280) {
  const sinHtml = texto.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return sinHtml.length > max ? sinHtml.slice(0, max) + "…" : sinHtml;
}

function esc(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Toma el PRIMER objeto JSON { ... } completo de un texto, ignorando lo que
// venga antes o despues (por si la IA agrega comentarios).
function extraerJson(texto) {
  const inicio = texto.indexOf("{");
  if (inicio === -1) throw new Error("La IA no devolvió un JSON.");
  let nivel = 0, dentroString = false, escapando = false;
  for (let i = inicio; i < texto.length; i++) {
    const c = texto[i];
    if (dentroString) {
      if (escapando) escapando = false;
      else if (c === "\\") escapando = true;
      else if (c === '"') dentroString = false;
    } else if (c === '"') dentroString = true;
    else if (c === "{") nivel++;
    else if (c === "}") { nivel--; if (nivel === 0) return texto.slice(inicio, i + 1); }
  }
  throw new Error("La respuesta de la IA quedó incompleta.");
}

// Convierte un numero a numero romano (para el "Año MMXXVI" de la cabecera).
function aRomano(num) {
  const t = [[1000,"M"],[900,"CM"],[500,"D"],[400,"CD"],[100,"C"],[90,"XC"],[50,"L"],[40,"XL"],[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]];
  let r = "";
  for (const [v, s] of t) while (num >= v) { r += s; num -= v; }
  return r;
}

// ----------------------------------------------------------------------------
//  1) TRAER LAS NOTICIAS DE TODAS LAS FUENTES
// ----------------------------------------------------------------------------
async function traerNoticias() {
  const todas = [];
  for (const fuente of FUENTES) {
    try {
      const feed = await parser.parseURL(fuente.url);
      const items = (feed.items || []).slice(0, 10);
      for (const it of items) {
        todas.push({
          titulo: (it.title || "").trim(),
          link: it.link || "",
          snippet: limpiar(it.contentSnippet || it.content || ""),
          imagen: sacarImagen(it),
          fuente: fuente.nombre,
          fecha: it.isoDate || it.pubDate || "",
        });
      }
      console.log(`  ok  ${fuente.nombre}: ${items.length} noticias`);
    } catch (e) {
      console.log(`  -   ${fuente.nombre}: no se pudo (${e.message})`);
    }
  }
  todas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  return todas;
}

// ----------------------------------------------------------------------------
//  2) PEDIRLE A GEMINI QUE ELIJA Y RESUMA
// ----------------------------------------------------------------------------
async function pedirAGemini(candidatas) {
  const listado = candidatas
    .map((n, i) => `[${i}] FUENTE: ${n.fuente}\nTITULO: ${n.titulo}\nTEXTO: ${n.snippet}`)
    .join("\n\n");

  const prompt = `Sos el editor jefe de un diario de élite para lectores muy informados (el 1% que busca señal, no ruido). Tu estándar de calidad es altísimo y tu tono, sobrio y culto.
Te paso una lista de noticias recientes de la sección "Córdoba y Argentina". La fuente "La Voz" es de Córdoba; Clarín, La Nación e Infobae son nacionales/internacionales.

REGLAS:
1) Elegí SOLO noticias de relevancia pública real: política, economía, justicia, sociedad de impacto e internacional de peso. La importancia manda sobre todo lo demás.
2) DESCARTÁ sin excepción: horóscopos, autoayuda y "psicología" pop ("según la psicología", "esta es la razón por la que..."), estilo de vida, bienestar y salud blanda, decoración y hogar, recetas, virales y redes sociales, listicles y "tips", farándula y espectáculos, deportes (salvo un hecho mayor), publinotas o notas de marca, efemérides triviales y notas de servicio rutinarias (ej.: "el dólar hoy" sin novedad real).
3) elegí entre 10 y ${MAX_NOTICIAS} noticias de CALIDAD. Hay material de sobra: NO te quedes corto, dame buena cantidad. Pero seguí descartando relleno y ruido (mejor una nota importante de más que una débil).
4) DIVERSIDAD DE FUENTES: NO elijas más de 4 noticias del mismo diario; buscá variedad entre La Voz, Clarín, La Nación e Infobae. Incluí varias noticias de Córdoba (fuente "La Voz") y algunas internacionales de peso. Pero jamás incluyas una nota débil solo para equilibrar.
5) Si la misma noticia aparece en varias fuentes, elegí una sola (la mejor redactada).
6) Ordená por importancia: la PRIMERA del array es la noticia MÁS importante del día (irá como nota principal destacada).

Para cada noticia elegida: un resumen objetivo, culto y claro de 3 oraciones.
Además, una "conclusion" editorial de 3 o 4 oraciones, con mirada reflexiva, que conecte los grandes temas del día.

Devolvé SOLO un JSON con esta forma exacta, sin texto adicional:
{
  "seleccion": [ { "indice": <numero de la lista>, "resumen": "<tu resumen>" } ],
  "conclusion": "<tu conclusión de la sección>"
}

Lista de noticias:
${listado}`;

  const cuerpo = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.5,
      maxOutputTokens: 16384,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`;

  let resp, txt;
  for (let intento = 1; intento <= 4; intento++) {
    resp = await fetch(url, {
      method: "POST",
      headers: { "x-goog-api-key": API_KEY, "Content-Type": "application/json" },
      body: cuerpo,
    });
    txt = await resp.text();
    if (resp.ok) break;
    if ((resp.status === 503 || resp.status === 429) && intento < 4) {
      console.log(`   (Gemini ocupado, reintento ${intento}/3 en ${intento * 4}s...)`);
      await new Promise((r) => setTimeout(r, intento * 4000));
      continue;
    }
    throw new Error(`Gemini respondió HTTP ${resp.status}: ${txt.slice(0, 300)}`);
  }

  const data = JSON.parse(txt);
  const cand = data?.candidates?.[0];
  const partes = cand?.content?.parts || [];
  const salida = partes.map((p) => p?.text || "").join("");
  if (!salida) throw new Error(`La IA no devolvió texto (motivo: ${cand?.finishReason || "desconocido"}).`);
  return JSON.parse(extraerJson(salida));
}

// ----------------------------------------------------------------------------
//  3) ARMAR EL HTML (diseño épico tipo diario antiguo)
// ----------------------------------------------------------------------------
function notaLead(n, resumen) {
  const foto = n.imagen
    ? `<div class="lead-foto" style="background-image:url('${esc(n.imagen)}')"></div>`
    : `<div class="lead-foto sin-foto">${esc(n.fuente)}</div>`;
  return `
  <article class="lead">
    ${foto}
    <div class="lead-cuerpo">
      <span class="fuente">${esc(n.fuente)}</span>
      <h2 class="lead-titulo">${esc(n.titulo)}</h2>
      <p class="lead-resumen">${esc(resumen)}</p>
      <a class="leer" href="${esc(n.link)}" target="_blank" rel="noopener">Leer la nota completa &#8594;</a>
    </div>
  </article>`;
}

function tarjeta(n, resumen) {
  const foto = n.imagen
    ? `<div class="foto" style="background-image:url('${esc(n.imagen)}')"></div>`
    : `<div class="foto sin-foto">${esc(n.fuente)}</div>`;
  return `
    <article class="nota">
      ${foto}
      <div class="cuerpo">
        <span class="fuente">${esc(n.fuente)}</span>
        <h3 class="titulo">${esc(n.titulo)}</h3>
        <p class="resumen">${esc(resumen)}</p>
        <a class="leer" href="${esc(n.link)}" target="_blank" rel="noopener">Leer la nota completa &#8594;</a>
      </div>
    </article>`;
}

function armarHtml(notas, conclusion) {
  const ahora = new Date();
  const fechaLarga = ahora.toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const edicion = ahora.getHours() < 14 ? "Edición de la mañana" : "Edición de la noche";
  const anioRomano = aRomano(ahora.getFullYear());
  const inicioAnio = new Date(ahora.getFullYear(), 0, 0);
  const numero = Math.floor((ahora - inicioAnio) / 86400000);

  const lead = notas[0] ? notaLead(notas[0].nota, notas[0].resumen) : "";
  const resto = notas.slice(1).map((x) => tarjeta(x.nota, x.resumen)).join("\n");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(TITULO)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet" />
<style>
  :root{
    --papel:#f1e7d0; --papel2:#ece0c4; --tinta:#241b10; --oro:#9c7a37;
    --oxido:#6d1a16; --gris:#5f5341; --linea:#cbbb95;
  }
  *{ box-sizing:border-box; }
  body{
    margin:0; background:#e6d9bb;
    color:var(--tinta); font-family:'EB Garamond',Georgia,serif;
    font-size:18px; line-height:1.6;
  }
  .marco{
    max-width:1080px; margin:18px auto; background:var(--papel);
    background-image:radial-gradient(circle at 50% 0,#f6eedb,transparent 60%);
    border:1px solid var(--oro); box-shadow:0 0 0 8px var(--papel), 0 0 0 9px var(--linea), 0 18px 50px rgba(0,0,0,.35);
    padding:32px 34px 56px;
  }
  /* ---- CABECERA ---- */
  .masthead{ text-align:center; }
  .kicker-row{
    display:flex; align-items:center; justify-content:center; gap:14px; flex-wrap:wrap;
    font-family:'Cinzel',serif; font-size:11.5px; letter-spacing:2px; text-transform:uppercase;
    color:var(--gris); border-top:1px solid var(--tinta); border-bottom:1px solid var(--tinta);
    padding:7px 0; margin-bottom:14px;
  }
  .kicker-row .orn{ color:var(--oro); }
  .nameplate{
    font-family:'Cinzel',serif; font-weight:900; text-transform:uppercase;
    font-size:clamp(46px,12vw,98px); line-height:1; letter-spacing:6px; margin:6px 0 2px;
    text-shadow:1px 1px 0 rgba(156,122,55,.25);
  }
  .filete{ display:flex; align-items:center; justify-content:center; gap:16px; margin:10px 0 6px; }
  .filete::before,.filete::after{ content:""; height:0; border-top:3px double var(--tinta); width:min(160px,30%); }
  .filete span{ color:var(--oro); font-size:22px; }
  .lema{ font-style:italic; font-size:15px; color:var(--gris); margin-bottom:6px; }
  /* ---- TITULO DE SECCION ---- */
  .seccion-titulo{ display:flex; align-items:center; justify-content:center; gap:18px; margin:34px 0 26px; }
  .seccion-titulo::before,.seccion-titulo::after{ content:""; flex:1; border-top:3px double var(--linea); }
  .seccion-titulo h3{
    font-family:'Cinzel',serif; font-weight:700; font-size:clamp(18px,3vw,26px);
    letter-spacing:5px; text-transform:uppercase; margin:0; white-space:nowrap;
  }
  /* ---- NOTA PRINCIPAL ---- */
  .lead{ display:grid; grid-template-columns:1.05fr .95fr; gap:32px; align-items:center;
    padding-bottom:30px; margin-bottom:30px; border-bottom:4px double var(--tinta); }
  .lead-foto{ height:400px; background-size:cover; background-position:center;
    border:1px solid var(--linea); filter:sepia(.14) contrast(1.02); }
  .lead-titulo{ font-family:'Cormorant Garamond',serif; font-weight:700; line-height:1.04;
    font-size:clamp(34px,4.4vw,56px); margin:6px 0 14px; }
  .lead-resumen{ font-size:19px; margin:0 0 16px; }
  .lead-resumen::first-letter{ float:left; font-family:'Cinzel',serif; font-weight:700;
    font-size:62px; line-height:46px; padding:4px 12px 0 0; color:var(--oxido); }
  /* ---- GRILLA DEL RESTO ---- */
  .grilla{ display:grid; grid-template-columns:1fr 1fr; gap:36px;
    background:linear-gradient(var(--linea),var(--linea)) no-repeat;
    background-size:1px calc(100% - 24px); background-position:center 12px; }
  .nota{ }
  .foto{ width:100%; height:210px; background-size:cover; background-position:center;
    border:1px solid var(--linea); margin-bottom:12px; filter:sepia(.14) contrast(1.02); }
  .sin-foto{ display:flex; align-items:center; justify-content:center; color:#efe3c6;
    background:#3a2c1c !important; font-family:'Cinzel',serif; font-size:13px; letter-spacing:2px;
    text-transform:uppercase; filter:none; }
  .fuente{ font-family:'Cinzel',serif; font-size:11px; text-transform:uppercase; letter-spacing:2px;
    color:var(--oxido); font-weight:600; }
  .titulo{ font-family:'Cormorant Garamond',serif; font-weight:700; line-height:1.12;
    font-size:27px; margin:5px 0 10px; }
  .resumen{ font-size:17.5px; margin:0 0 12px; color:#2c2316; }
  .leer{ font-family:'Cinzel',serif; font-size:11.5px; letter-spacing:1px; text-transform:uppercase;
    color:var(--oxido); text-decoration:none; font-weight:600; }
  .leer:hover{ text-decoration:underline; }
  /* ---- CONCLUSION ---- */
  .editorial{ margin-top:38px; background:var(--papel2); border:1px solid var(--oro);
    box-shadow:0 0 0 5px var(--papel), 0 0 0 6px var(--linea); padding:26px 30px; }
  .editorial .marbete{ display:flex; align-items:center; justify-content:center; gap:14px; margin-bottom:14px; }
  .editorial .marbete::before,.editorial .marbete::after{ content:""; flex:1; border-top:1px solid var(--oro); }
  .editorial h4{ font-family:'Cinzel',serif; font-weight:700; font-size:15px; letter-spacing:3px;
    text-transform:uppercase; margin:0; color:var(--oxido); white-space:nowrap; }
  .editorial p{ font-family:'Cormorant Garamond',serif; font-style:italic; font-size:20px;
    line-height:1.5; text-align:justify; margin:0; }
  .editorial p::first-letter{ font-family:'Cinzel',serif; font-style:normal; font-weight:700;
    font-size:40px; color:var(--oxido); padding-right:4px; }
  /* ---- PIE ---- */
  footer{ margin-top:40px; text-align:center; font-family:'Cinzel',serif; font-size:11px;
    letter-spacing:1.5px; color:var(--gris); text-transform:uppercase;
    border-top:3px double var(--tinta); padding-top:16px; }
  footer .orn{ color:var(--oro); font-size:16px; display:block; margin-bottom:8px; }
  /* ---- CELULAR ---- */
  @media (max-width:720px){
    .marco{ padding:22px 18px 40px; }
    .lead{ grid-template-columns:1fr; }
    .lead-foto{ height:240px; }
    .grilla{ grid-template-columns:1fr; background:none; }
  }
</style>
</head>
<body>
  <div class="marco">
    <header class="masthead">
      <div class="kicker-row">
        <span>Córdoba · Argentina</span>
        <span class="orn">&#10086;</span>
        <span>${esc(edicion)}</span>
        <span class="orn">&#10086;</span>
        <span>Año ${anioRomano} · N.º ${numero}</span>
      </div>
      <h1 class="nameplate">${esc(TITULO)}</h1>
      <div class="filete"><span>&#9884;</span></div>
      <div class="lema">${esc(LEMA)}</div>
      <div class="lema" style="font-style:normal;letter-spacing:1px;">${esc(fechaLarga)}</div>
    </header>

    <div class="seccion-titulo"><h3>Córdoba y Argentina</h3></div>

    ${lead}

    <div class="grilla">
      ${resto}
    </div>

    <div class="editorial">
      <div class="marbete"><h4>La mirada del editor</h4></div>
      <p>${esc(conclusion)}</p>
    </div>

    <footer>
      <span class="orn">&#10086; &#9884; &#10086;</span>
      ${esc(TITULO)} · diario personal generado automáticamente · ${esc(fechaLarga)}<br/>
      Fuentes: La Voz · Infobae · Clarín · La Nación &nbsp;—&nbsp; Resúmenes por IA (Gemini)
    </footer>
  </div>
</body>
</html>`;
}

// ----------------------------------------------------------------------------
//  PROGRAMA PRINCIPAL
// ----------------------------------------------------------------------------
async function main() {
  console.log("1) Trayendo noticias de las fuentes...");
  const todas = await traerNoticias();
  if (todas.length === 0) {
    console.error("No se trajo ninguna noticia. Revisá tu conexión a internet.");
    process.exit(1);
  }

  const candidatas = todas.slice(0, 60);
  console.log(`2) Pidiéndole a Gemini que elija y resuma (${candidatas.length} candidatas)...`);
  const r = await pedirAGemini(candidatas);

  const notas = (r.seleccion || [])
    .map((s) => ({ nota: candidatas[s.indice], resumen: s.resumen }))
    .filter((x) => x.nota);

  console.log(`3) Armando la página con ${notas.length} noticias...`);
  const html = armarHtml(notas, r.conclusion || "");

  const salida = join(__dirname, "diario.html");
  writeFileSync(salida, html, "utf8");
  console.log(`\nLISTO. Diario generado en: ${salida}`);
  console.log("Abrilo (o apretá F5 si ya lo tenías abierto) para verlo.");
}

main().catch((e) => {
  console.error("Falló la generación:", e.message);
  process.exitCode = 1;
});
