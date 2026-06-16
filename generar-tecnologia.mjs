// ============================================================================
//  GENERAR-TECNOLOGIA.MJS  ->  Sección TECNOLOGÍA E IA ("Silicio")
//  Feeds tech/IA → la IA elige, traduce y resume en español. Genera tecnologia.html
// ============================================================================
import { crearParser, sacarImagen, limpiar, esc, llamarGemini, CARPETA } from "./comun.mjs";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const NOMBRE_SECCION = "Silicio";
const MAX_NOTICIAS = 12;

const FUENTES = [
  { nombre: "MIT Tech Review", url: "https://www.technologyreview.com/feed/" },
  { nombre: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
  { nombre: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index" },
  { nombre: "Xataka", url: "https://www.xataka.com/index.xml" },
  { nombre: "Import AI", url: "https://importai.substack.com/feed" },
  { nombre: "OpenAI", url: "https://openai.com/blog/rss.xml" },
];

const parser = crearParser();

async function traer() {
  const todas = [];
  for (const f of FUENTES) {
    try {
      const feed = await parser.parseURL(f.url);
      for (const it of (feed.items || []).slice(0, 10)) {
        todas.push({ titulo: (it.title || "").trim(), link: it.link || "", snippet: limpiar(it.contentSnippet || it.content || ""), imagen: sacarImagen(it), fuente: f.nombre, fecha: it.isoDate || it.pubDate || "" });
      }
    } catch {}
  }
  todas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  return todas;
}

async function pedir(candidatas) {
  const listado = candidatas.map((n, i) => `[${i}] FUENTE: ${n.fuente}\nTITULO: ${n.titulo}\nTEXTO: ${n.snippet}`).join("\n\n");
  const prompt = `Sos el editor de tecnología de un diario de élite, en español de Argentina. Tono claro y experto.
Te paso titulares de tecnología e IA (varios en inglés).
REGLAS:
1) Elegí entre 8 y ${MAX_NOTICIAS} noticias de verdadera relevancia (IA, hardware/chips, software, ciencia aplicada, big tech, política/regulación tech). La importancia manda. Evitá reviews triviales de gadgets y rumores.
2) Diversificá temas y fuentes (no todo IA). Si una noticia se repite, una sola.
3) Ordená por importancia (la PRIMERA es la principal).
Para CADA una: "indice", "titulo_original" (copiá el comienzo del título tal cual figura), "categoria" (una de: IA, Hardware, Software, Ciencia, Big Tech, Regulación), "titulo" (en español, traducí si está en inglés, fiel) y "resumen" (objetivo, 3 oraciones).
IMPORTANTE: "indice" y "titulo_original" deben ser de la MISMA noticia.
Además una "analisis" (3-4 oraciones) sobre hacia dónde va la tecnología hoy.
Devolvé SOLO: { "seleccion": [ { "indice": <n>, "titulo_original": "", "categoria": "", "titulo": "", "resumen": "" } ], "analisis": "" }
Lista:
${listado}`;
  return llamarGemini(prompt);
}

function tarjeta(x, lead = false) {
  const n = x.nota;
  const foto = n.imagen ? `<div class="foto${lead ? " foto-lead" : ""}" style="background-image:url('${esc(n.imagen)}')"></div>` : `<div class="foto${lead ? " foto-lead" : ""} sin-foto">${esc(n.fuente)}</div>`;
  return `
    <article class="${lead ? "lead" : "nota"}">
      ${foto}
      <div class="cuerpo">
        <div class="metas"><span class="region">${esc(x.categoria || "Tech")}</span><span class="src">${esc(n.fuente)}</span></div>
        <h3 class="${lead ? "lead-titulo" : "titulo"}">${esc(x.titulo || n.titulo)}</h3>
        <p class="resumen">${esc(x.resumen)}</p>
        <a class="leer" href="${esc(n.link)}" target="_blank" rel="noopener">Leer la nota &#8594;</a>
      </div>
    </article>`;
}

function armarHtml(notas, analisis) {
  const ahora = new Date();
  const fechaLarga = ahora.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const lead = notas[0] ? tarjeta(notas[0], true) : "";
  const resto = notas.slice(1).map((x) => tarjeta(x)).join("\n");
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(NOMBRE_SECCION)} · Tecnología</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Spectral:wght@400;500&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet" />
<style>
  body{ margin:0; background:#eceee9; color:#16201b; font-family:'Spectral',Georgia,serif; font-size:18px; }
  .hoja{ max-width:1000px; margin:0 auto; padding:30px; background:#f6f7f4; }
  h1{ font-family:'Playfair Display',serif; font-size:56px; text-align:center; }
  .region{ background:#2a6f5f; color:#fff; font-family:'Space Grotesk',sans-serif; font-size:10px; letter-spacing:1px; text-transform:uppercase; padding:2px 8px; }
  .lead,.grilla{ display:grid; grid-template-columns:1fr 1fr; gap:26px; } .foto{ height:200px; background-size:cover; background-position:center; } .titulo,.lead-titulo{ font-family:'Playfair Display',serif; }
</style></head><body>
  <div class="hoja">
    <div class="top"><span>Tecnología e inteligencia artificial</span><span>${esc(fechaLarga)}</span></div>
    <h1 class="cab">${esc(NOMBRE_SECCION)}</h1>
    <div class="lema">El pulso de la tecnología y la IA</div>
    ${lead}
    <div class="grilla">${resto}</div>
    <div class="analisis"><b>Hacia dónde va</b>${esc(analisis)}</div>
    <footer>${esc(NOMBRE_SECCION)} · sección tecnología de Mercurio · ${esc(fechaLarga)}<br/>Fuentes: MIT Tech Review · The Verge · Ars Technica · Xataka · Import AI · OpenAI · Resúmenes por IA</footer>
  </div>
</body></html>`;
}

async function main() {
  console.log("1) Trayendo noticias de tecnología e IA...");
  const todas = await traer();
  if (!todas.length) { console.error("Sin noticias."); process.exitCode = 1; return; }
  const candidatas = todas.slice(0, 50);
  console.log(`2) La IA elige, traduce y resume (${candidatas.length})...`);
  const r = await pedir(candidatas);
  const norm = (t) => (t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  function resolver(s) {
    const orig = norm(s.titulo_original); const porI = candidatas[s.indice];
    if (porI && orig.length > 6 && norm(porI.titulo).includes(orig.slice(0, 18))) return porI;
    if (orig.length > 6) { const h = candidatas.find((c) => norm(c.titulo).includes(orig.slice(0, 22)) || orig.includes(norm(c.titulo).slice(0, 22))); if (h) return h; }
    return porI;
  }
  const vistos = new Set();
  const notas = (r.seleccion || []).map((s) => ({ nota: resolver(s), categoria: s.categoria, titulo: s.titulo, resumen: s.resumen })).filter((x) => x.nota && x.nota.link && !vistos.has(x.nota.link) && vistos.add(x.nota.link));
  console.log(`3) Armando Silicio con ${notas.length} noticias...`);
  writeFileSync(join(CARPETA, "tecnologia.html"), armarHtml(notas, r.analisis || ""), "utf8");
  console.log("\nLISTO. Sección Tecnología generada en: " + join(CARPETA, "tecnologia.html"));
}
main().catch((e) => { console.error("Falló:", e.message); process.exitCode = 1; });
