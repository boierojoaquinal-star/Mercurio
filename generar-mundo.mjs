// ============================================================================
//  GENERAR-MUNDO.MJS  ->  Sección MUNDO / INTERNACIONAL ("Atlas")
//  Noticias del mundo con etiqueta de región + análisis geopolítico. Diseño navy.
//  Genera "mundo.html".
// ============================================================================
import { crearParser, sacarImagen, limpiar, esc, llamarGemini, CARPETA } from "./comun.mjs";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const NOMBRE_SECCION = "Atlas";
const MAX_NOTICIAS = 12;

const FUENTES = [
  { nombre: "BBC Mundo", url: "https://feeds.bbci.co.uk/mundo/rss.xml" },
  { nombre: "El País", url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/internacional/portada" },
  { nombre: "France 24", url: "https://www.france24.com/es/rss" },
  { nombre: "The Guardian", url: "https://www.theguardian.com/world/rss" },
  { nombre: "La Nación", url: "https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/el-mundo/?outputType=xml" },
];

const parser = crearParser();

async function traerNoticias() {
  const todas = [];
  for (const f of FUENTES) {
    try {
      const feed = await parser.parseURL(f.url);
      for (const it of (feed.items || []).slice(0, 12)) {
        todas.push({ titulo: (it.title || "").trim(), link: it.link || "", snippet: limpiar(it.contentSnippet || it.content || ""), imagen: sacarImagen(it), fuente: f.nombre, fecha: it.isoDate || it.pubDate || "" });
      }
    } catch {}
  }
  todas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  return todas;
}

async function pedir(candidatas) {
  const listado = candidatas.map((n, i) => `[${i}] FUENTE: ${n.fuente}\nTITULO: ${n.titulo}\nTEXTO: ${n.snippet}`).join("\n\n");
  const prompt = `Sos el editor de internacionales de un diario de élite (lectores del 1%). Tono sobrio, experto y claro, en español de Argentina.
Te paso titulares del mundo (algunos en inglés).
REGLAS:
1) Elegí entre 8 y ${MAX_NOTICIAS} noticias INTERNACIONALES de verdadera relevancia (geopolítica, conflictos, economía global, democracia, ciencia/sociedad de impacto). La importancia manda.
2) Buscá DIVERSIDAD DE REGIONES y de fuentes. EXCLUÍ todo lo centrado en Argentina (riesgo país, dólar, economía o política argentina): eso va en otras secciones; acá es SOLO el mundo. Evitá también deportes y farándula.
3) Si una noticia se repite, elegí una sola.
4) Ordená por importancia (la PRIMERA es la principal).
Para CADA noticia elegida devolvé: "indice" (el número de la lista), "titulo_original" (copiá TEXTUALMENTE el comienzo del TITULO tal como figura en la lista, para poder identificarla), "region" (una de: Estados Unidos, América Latina, Europa, Medio Oriente, Asia, África, Oceanía, Global), "titulo" (en español, traducí si está en inglés, fiel y claro) y "resumen" (objetivo, 3 oraciones).
IMPORTANTE: "indice" y "titulo_original" deben ser de la MISMA noticia de la lista. No combines el título de una con el índice de otra.
Además, un "analisis" geopolítico del día (3-4 oraciones) que conecte los grandes temas.

Devolvé SOLO este JSON:
{ "seleccion": [ { "indice": <n>, "titulo_original": "", "region": "", "titulo": "", "resumen": "" } ], "analisis": "" }

Lista:
${listado}`;
  return llamarGemini(prompt);
}

function tarjeta(x, lead = false) {
  const n = x.nota;
  const foto = n.imagen ? `<div class="foto${lead ? " foto-lead" : ""}" style="background-image:url('${esc(n.imagen)}')"></div>` : `<div class="foto${lead ? " foto-lead" : ""} sin-foto">${esc(n.fuente)}</div>`;
  const titulo = x.titulo || n.titulo;
  return `
    <article class="${lead ? "lead" : "nota"}">
      ${foto}
      <div class="cuerpo">
        <div class="metas"><span class="region">${esc(x.region || "Mundo")}</span><span class="src">${esc(n.fuente)}</span></div>
        <h3 class="${lead ? "lead-titulo" : "titulo"}">${esc(titulo)}</h3>
        <p class="resumen">${esc(x.resumen)}</p>
        <a class="leer" href="${esc(n.link)}" target="_blank" rel="noopener">Leer la nota &#8594;</a>
      </div>
    </article>`;
}

function armarHtml(notas, analisis) {
  const ahora = new Date();
  const fechaLarga = ahora.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const lead = notas[0] ? tarjeta(notas[0], true) : "";
  const resto = notas.slice(1).map((x) => tarjeta(x)).join("\n");

  return `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(NOMBRE_SECCION)} · Mundo</title>
<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;0,900;1,600&family=Spectral:ital,wght@0,400;0,500;1,400&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet" />
<style>
  :root{ --papel:#eef0ec; --tinta:#16202b; --navy:#1f3148; --acero:#3a6079; --gris:#5d6b73; --linea:#c6cdc8; }
  *{ box-sizing:border-box; } body{ margin:0; background:#d4dad6; color:var(--tinta); font-family:'Spectral',Georgia,serif; font-size:18px; line-height:1.6; }
  .hoja{ max-width:1020px; margin:18px auto; background:var(--papel); border:1px solid var(--linea); box-shadow:0 0 0 7px var(--papel),0 0 0 8px var(--linea),0 16px 44px rgba(0,0,0,.3); padding:32px 38px 54px; }
  .top{ display:flex; justify-content:space-between; font-family:'Space Grotesk',sans-serif; font-size:11px; letter-spacing:3px; text-transform:uppercase; color:var(--gris); border-bottom:1px solid var(--navy); padding-bottom:7px; }
  h1.cab{ font-family:'Playfair Display',serif; font-weight:900; font-size:clamp(42px,9vw,72px); text-align:center; letter-spacing:1px; color:var(--navy); margin:10px 0 2px; }
  .filete{ display:flex; align-items:center; justify-content:center; gap:14px; margin:6px 0; } .filete::before,.filete::after{ content:""; height:0; border-top:3px double var(--navy); width:min(150px,28%); } .filete span{ color:var(--acero); font-size:18px; }
  .lema{ text-align:center; font-style:italic; color:var(--gris); margin-bottom:20px; }
  .metas{ display:flex; align-items:center; gap:8px; margin-bottom:6px; }
  .region{ display:inline-block; background:var(--navy); color:#eef0ec; font-family:'Space Grotesk',sans-serif; font-size:10px; letter-spacing:1.5px; text-transform:uppercase; padding:2px 9px; }
  .src{ font-family:'Space Grotesk',sans-serif; font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--acero); font-weight:700; }
  .lead{ display:grid; grid-template-columns:1.1fr 1fr; gap:26px; align-items:center; border-top:3px double var(--navy); padding-top:22px; margin-bottom:26px; }
  .foto{ width:100%; height:200px; background-size:cover; background-position:center; border:1px solid var(--linea); }
  .foto-lead{ height:250px; }
  .sin-foto{ display:flex; align-items:center; justify-content:center; background:var(--navy) !important; color:#cfdae2; font-family:'Space Grotesk',sans-serif; font-size:12px; letter-spacing:1px; text-transform:uppercase; }
  .lead-titulo{ font-family:'Playfair Display',serif; font-weight:700; font-size:clamp(28px,3.6vw,42px); line-height:1.1; margin:4px 0 12px; }
  .grilla{ display:grid; grid-template-columns:1fr 1fr; gap:30px; background:linear-gradient(var(--linea),var(--linea)) no-repeat; background-size:1px calc(100% - 20px); background-position:center 10px; }
  .nota .foto{ margin-bottom:10px; }
  .titulo{ font-family:'Playfair Display',serif; font-weight:700; font-size:24px; line-height:1.16; margin:4px 0 9px; }
  .resumen{ font-size:16.5px; margin:0 0 10px; color:#2b3640; }
  .leer{ font-family:'Space Grotesk',sans-serif; font-size:11px; letter-spacing:1px; text-transform:uppercase; color:var(--acero); text-decoration:none; font-weight:700; }
  .leer:hover{ text-decoration:underline; }
  .analisis{ margin-top:34px; background:#e4e8e3; border-left:5px solid var(--navy); padding:22px 26px; font-style:italic; font-size:18px; text-align:justify; color:#26313a; }
  .analisis b{ font-style:normal; font-family:'Space Grotesk',sans-serif; font-size:12px; letter-spacing:2px; text-transform:uppercase; color:var(--navy); display:block; margin-bottom:8px; }
  footer{ margin-top:40px; text-align:center; font-family:'Space Grotesk',sans-serif; font-size:10.5px; letter-spacing:1.5px; text-transform:uppercase; color:var(--gris); border-top:1px solid var(--linea); padding-top:14px; }
  @media (max-width:680px){ .lead,.grilla{ grid-template-columns:1fr; } .grilla{ background:none; } }
</style>
</head><body>
  <div class="hoja">
    <div class="top"><span>El mundo, en profundidad</span><span>${esc(fechaLarga)}</span></div>
    <h1 class="cab">${esc(NOMBRE_SECCION)}</h1>
    <div class="filete"><span>&#9737;</span></div>
    <div class="lema">Geopolítica y grandes temas globales</div>
    ${lead}
    <div class="grilla">${resto}</div>
    <div class="analisis"><b>Análisis · el tablero global</b>${esc(analisis)}</div>
    <footer>${esc(NOMBRE_SECCION)} · sección internacional de Mercurio · ${esc(fechaLarga)}<br/>Fuentes: BBC Mundo · El País · France 24 · The Guardian · La Nación · Resúmenes por IA</footer>
  </div>
</body></html>`;
}

async function main() {
  console.log("1) Trayendo noticias del mundo...");
  const todas = await traerNoticias();
  if (!todas.length) { console.error("No se trajo ninguna noticia."); process.exitCode = 1; return; }
  const candidatas = todas.slice(0, 50);
  console.log(`2) La IA elige, traduce y resume (${candidatas.length} candidatas)...`);
  const r = await pedir(candidatas);
  // Resuelve la noticia real: usa el índice solo si su título coincide con el que dio la IA;
  // si no, busca el candidato cuyo título coincida. Así la foto y el link siempre van con el título.
  const norm = (t) => (t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  function resolver(s) {
    const orig = norm(s.titulo_original);
    const porIndice = candidatas[s.indice];
    if (porIndice && orig.length > 6 && norm(porIndice.titulo).includes(orig.slice(0, 18))) return porIndice;
    if (orig.length > 6) {
      const hallado = candidatas.find((c) => norm(c.titulo).includes(orig.slice(0, 22)) || orig.includes(norm(c.titulo).slice(0, 22)));
      if (hallado) return hallado;
    }
    return porIndice;
  }
  const vistos = new Set();
  const notas = (r.seleccion || [])
    .map((s) => ({ nota: resolver(s), region: s.region, titulo: s.titulo, resumen: s.resumen }))
    .filter((x) => x.nota && x.nota.link && !vistos.has(x.nota.link) && vistos.add(x.nota.link));
  console.log(`3) Armando Atlas con ${notas.length} noticias...`);
  const html = armarHtml(notas, r.analisis || "");
  const salida = join(CARPETA, "mundo.html");
  writeFileSync(salida, html, "utf8");
  console.log(`\nLISTO. Sección Mundo generada en: ${salida}`);
}

main().catch((e) => { console.error("Falló la generación:", e.message); process.exitCode = 1; });
