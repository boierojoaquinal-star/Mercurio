// ============================================================================
//  GENERAR-DERECHO.MJS  ->  Sección JURÍDICA (doctrina + jurisprudencia + aprender)
//  La IA actúa como catedrático: no solo informa, EXPLICA para que aprendas.
//  Genera "derecho.html" con diseño austero tipo Boletín Oficial.
// ============================================================================
import { crearParser, sacarImagen, limpiar, esc, llamarGemini, CARPETA } from "./comun.mjs";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const NOMBRE_SECCION = "Foro";
const SUBTITULO = "Derecho · doctrina, jurisprudencia y formación";
const MAXIMA = "Fiat iustitia";

// --- Fuentes jurídicas verificadas. "rol" le dice a la IA qué es cada una. ---
const FUENTES = [
  { nombre: "Almacén de Derecho", pais: "España", rol: "DOCTRINA (España)", url: "https://almacendederecho.org/feed" },
  { nombre: "Confilegal", pais: "España", rol: "Jurídico (España)", url: "https://confilegal.com/feed/" },
  { nombre: "Legal Today", pais: "España", rol: "Jurisprudencia (España)", url: "https://www.legaltoday.com/feed/" },
  { nombre: "Infobae Judiciales", pais: "Argentina", rol: "Fallos y casos (Argentina)", url: "https://www.infobae.com/arc/outboundfeeds/rss/category/judiciales/?outputType=xml" },
  { nombre: "Comercio y Justicia", pais: "Argentina", rol: "Jurídico (Córdoba) — puede traer ruido", url: "https://comercioyjusticia.info/feed/" },
];

const parser = crearParser();

// --- 1) Traer las notas jurídicas -------------------------------------------
async function traer() {
  const todas = [];
  for (const f of FUENTES) {
    try {
      const feed = await parser.parseURL(f.url);
      for (const it of (feed.items || []).slice(0, 12)) {
        todas.push({
          titulo: (it.title || "").trim(),
          link: it.link || "",
          snippet: limpiar(it.contentSnippet || it.content || ""),
          imagen: sacarImagen(it),
          fuente: f.nombre,
          pais: f.pais,
          rol: f.rol,
          fecha: it.isoDate || it.pubDate || "",
        });
      }
      console.log(`  ok  ${f.nombre}: traído`);
    } catch (e) {
      console.log(`  -   ${f.nombre}: no se pudo (${e.message})`);
    }
  }
  todas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  return todas;
}

// --- 2) La IA, como catedrática, arma la edición jurídica --------------------
async function pedir(candidatas) {
  const listado = candidatas
    .map((n, i) => `[${i}] (${n.rol} · ${n.fuente})\nTITULO: ${n.titulo}\nTEXTO: ${n.snippet}`)
    .join("\n\n");

  const prompt = `Actuás como CATEDRÁTICO de Derecho y editor de la sección jurídica de un diario de élite (lectores del 1%). Tu meta no es solo informar: es que el lector APRENDA derecho de verdad (España, Argentina y algo del resto del mundo). Tono riguroso, claro y didáctico, en español.

Te paso una lista de notas jurídicas. Cada una indica su ROL (DOCTRINA, jurisprudencia/fallos, jurídico general), su PAÍS de origen y su fuente. PRIORIDAD ABSOLUTA: el derecho argentino. Si hay un fallo o tema argentino de calidad, debe ser el PROTAGONISTA (el "fallo comentado" preferentemente argentino); España e internacional acompañan. En "novedades" también priorizá Argentina, con variedad de jurisdicciones.

Devolvé SOLO este JSON, sin texto adicional:
{
  "fallo": { "indice": <n>, "exposicion": "<exposición didáctica de 6 a 8 oraciones>" },
  "doctrina": { "indice": <n>, "exposicion": "<explicación de 4 a 6 oraciones>" },
  "novedades": [ { "indice": <n>, "resumen": "<2 oraciones>" } ],
  "concepto": { "titulo": "<concepto jurídico>", "explicacion": "<4 a 6 oraciones didácticas, con un ejemplo simple>" },
  "conclusion": "<nota del editor, 3 o 4 oraciones>"
}

INSTRUCCIONES:
- "fallo": elegí el FALLO o caso judicial más relevante (preferí roles de jurisprudencia/fallos, ej. "Infobae Judiciales" o "Legal Today"). En la exposición explicá: qué se resolvió, los hechos clave, el RAZONAMIENTO jurídico, la doctrina/principios/normas en juego y QUÉ SE APRENDE. Si no hay un fallo claro, tomá la nota jurídica más importante y explicala igual.
- "doctrina": elegí la mejor pieza de DOCTRINA (preferí "Almacén de Derecho"). Explicá la tesis o el debate, los argumentos centrales y por qué importa. Accesible pero con rigor.
- "novedades": 6 a 8 novedades jurídicas importantes y VARIADAS (leyes, reformas, fallos; España/Argentina/mundo). Resumen objetivo de 2 oraciones. No repitas el fallo ni la doctrina ya elegidos.
- "concepto": elegí UN concepto jurídico fundamental (ligado a los temas del día, o un clásico) y explicalo de forma didáctica con un ejemplo simple. Es tu aporte docente; no sale de la lista.
- DESCARTÁ todo ruido no jurídico (deportes, farándula, Mundial, virales), aunque aparezca en la lista.

Lista:
${listado}`;

  return llamarGemini(prompt);
}

// --- 3) Render del HTML (austero, institucional) ----------------------------
function chipPais(p) {
  return p ? `<span class="pais">${esc(p)}</span>` : "";
}

function bloqueFallo(n, exposicion) {
  const foto = n.imagen
    ? `<div class="fallo-foto" style="background-image:url('${esc(n.imagen)}')"></div>`
    : "";
  return `
  <section class="fallo">
    <div class="etiqueta">&#9878; El fallo comentado</div>
    ${foto}
    <div class="meta-linea">${chipPais(n.pais)}<span class="fuente-linea">${esc(n.fuente)}</span></div>
    <h2 class="fallo-titulo">${esc(n.titulo)}</h2>
    <p class="fallo-texto">${esc(exposicion)}</p>
    <a class="leer" href="${esc(n.link)}" target="_blank" rel="noopener">Leer la fuente &#8594;</a>
  </section>`;
}

function bloqueDoctrina(n, exposicion) {
  if (!n) return "";
  return `
  <section class="doctrina">
    <div class="etiqueta">&#167; Doctrina</div>
    <div class="meta-linea">${chipPais(n.pais)}<span class="fuente-linea">${esc(n.fuente)}</span></div>
    <h3 class="doctrina-titulo">${esc(n.titulo)}</h3>
    <p class="doctrina-texto">${esc(exposicion)}</p>
    <a class="leer" href="${esc(n.link)}" target="_blank" rel="noopener">Leer la pieza completa &#8594;</a>
  </section>`;
}

function bloqueNovedades(lista) {
  if (!lista.length) return "";
  const items = lista
    .map(
      (x) => `
      <li class="novedad">
        <div class="novedad-cab"><span class="marca">&#167;</span>${chipPais(x.nota.pais)}<span class="fuente-linea">${esc(x.nota.fuente)}</span></div>
        <a class="novedad-titulo" href="${esc(x.nota.link)}" target="_blank" rel="noopener">${esc(x.nota.titulo)}</a>
        <p class="novedad-texto">${esc(x.resumen)}</p>
      </li>`
    )
    .join("");
  return `
  <section class="novedades">
    <div class="etiqueta">Novedades jurídicas</div>
    <ul class="lista-novedades">${items}</ul>
  </section>`;
}

function bloqueConcepto(c) {
  if (!c?.titulo) return "";
  return `
  <aside class="concepto">
    <div class="concepto-cab">&#182; Concepto jurídico del día</div>
    <h4 class="concepto-titulo">${esc(c.titulo)}</h4>
    <p class="concepto-texto">${esc(c.explicacion)}</p>
  </aside>`;
}

function armarHtml(r, candidatas) {
  const ahora = new Date();
  const fechaLarga = ahora.toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const idx = (o) => (o && Number.isInteger(o.indice) ? candidatas[o.indice] : null);
  const notaFallo = idx(r.fallo) || candidatas[0];
  const notaDoctrina = idx(r.doctrina);
  const novedades = (r.novedades || [])
    .map((x) => ({ nota: candidatas[x.indice], resumen: x.resumen }))
    .filter((x) => x.nota);

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(NOMBRE_SECCION)} · Derecho</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Spectral:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet" />
<style>
  :root{
    --papel:#f0ece0; --papel2:#e8e2d2; --tinta:#1b1b18; --burdeos:#5e1622;
    --oro:#8a7335; --gris:#5a5448; --linea:#c7bda4;
  }
  *{ box-sizing:border-box; }
  body{ margin:0; background:#ded6c2; color:var(--tinta);
    font-family:'Spectral',Georgia,serif; font-size:18px; line-height:1.62; }
  .pliego{ max-width:920px; margin:18px auto; background:var(--papel);
    border:1px solid var(--burdeos); box-shadow:0 0 0 7px var(--papel), 0 0 0 8px var(--linea), 0 16px 44px rgba(0,0,0,.32);
    padding:34px 40px 56px; }
  /* ---- Cabecera ---- */
  .cab{ text-align:center; border-bottom:3px double var(--tinta); padding-bottom:16px; margin-bottom:8px; }
  .cab .top{ font-family:'Libre Baskerville',serif; font-size:11px; letter-spacing:3px;
    text-transform:uppercase; color:var(--gris); border-bottom:1px solid var(--linea); padding-bottom:8px; margin-bottom:12px; }
  .cab h1{ font-family:'Libre Baskerville',serif; font-weight:700; font-size:clamp(40px,9vw,72px);
    margin:6px 0 4px; letter-spacing:2px; }
  .cab .balanza{ color:var(--burdeos); font-size:24px; margin:2px 0; }
  .cab .sub{ font-style:italic; color:var(--gris); font-size:15px; }
  .cab .maxima{ font-family:'Libre Baskerville',serif; font-size:12px; letter-spacing:2px;
    text-transform:uppercase; color:var(--burdeos); margin-top:6px; }
  /* ---- Etiquetas de bloque ---- */
  .etiqueta{ font-family:'Libre Baskerville',serif; font-weight:700; font-size:13px; letter-spacing:3px;
    text-transform:uppercase; color:var(--burdeos); margin:0 0 12px; padding-bottom:7px;
    border-bottom:2px solid var(--tinta); }
  .fuente-linea{ font-family:'Libre Baskerville',serif; font-size:10.5px; letter-spacing:2px;
    text-transform:uppercase; color:var(--gris); }
  .meta-linea{ display:flex; align-items:center; gap:8px; margin-bottom:2px; }
  .pais{ display:inline-block; font-family:'Libre Baskerville',serif; font-size:10px; letter-spacing:1.5px;
    text-transform:uppercase; color:#fff; background:var(--burdeos); border-radius:2px; padding:2px 9px; }
  .leer{ font-family:'Libre Baskerville',serif; font-size:10.5px; letter-spacing:1px; text-transform:uppercase;
    color:var(--burdeos); text-decoration:none; }
  .leer:hover{ text-decoration:underline; }
  /* ---- El fallo comentado ---- */
  .fallo{ margin:30px 0; padding:26px 28px; background:var(--papel2);
    border:1px solid var(--linea); box-shadow:inset 0 0 0 1px var(--papel); }
  .fallo-foto{ width:100%; height:230px; background-size:cover; background-position:center;
    border:1px solid var(--linea); filter:grayscale(.35) sepia(.12); margin:4px 0 14px; }
  .fallo-titulo{ font-family:'Libre Baskerville',serif; font-weight:700; line-height:1.18;
    font-size:clamp(26px,3.6vw,40px); margin:6px 0 14px; }
  .fallo-texto{ font-size:19px; margin:0 0 16px; text-align:justify; }
  .fallo-texto::first-letter{ float:left; font-family:'Libre Baskerville',serif; font-weight:700;
    font-size:58px; line-height:44px; padding:4px 12px 0 0; color:var(--burdeos); }
  /* ---- Doctrina ---- */
  .doctrina{ margin:34px 0; }
  .doctrina-titulo{ font-family:'Libre Baskerville',serif; font-weight:700; font-size:26px;
    line-height:1.2; margin:5px 0 12px; }
  .doctrina-texto{ font-size:18px; text-align:justify; margin:0 0 12px; }
  /* ---- Novedades ---- */
  .novedades{ margin:34px 0; }
  .lista-novedades{ list-style:none; margin:0; padding:0; }
  .novedad{ border-top:1px solid var(--linea); padding:16px 0; }
  .novedad:first-child{ border-top:none; }
  .novedad-cab{ display:flex; align-items:center; gap:8px; margin-bottom:4px; }
  .novedad-cab .marca{ color:var(--burdeos); font-weight:700; }
  .novedad-titulo{ display:block; font-family:'Libre Baskerville',serif; font-weight:700;
    font-size:21px; line-height:1.25; color:var(--tinta); text-decoration:none; margin-bottom:6px; }
  .novedad-titulo:hover{ color:var(--burdeos); }
  .novedad-texto{ margin:0; font-size:17px; color:#2b2620; }
  /* ---- Concepto del día ---- */
  .concepto{ margin:36px 0; background:var(--tinta); color:var(--papel);
    padding:24px 28px; border-left:6px solid var(--burdeos); }
  .concepto-cab{ font-family:'Libre Baskerville',serif; font-size:11px; letter-spacing:3px;
    text-transform:uppercase; color:var(--oro); margin-bottom:10px; }
  .concepto-titulo{ font-family:'Libre Baskerville',serif; font-weight:700; font-size:25px;
    margin:0 0 10px; color:#fff; }
  .concepto-texto{ margin:0; font-size:18px; line-height:1.6; color:#e9e3d4; text-align:justify; }
  /* ---- Nota del editor ---- */
  .editor{ margin-top:36px; border-top:3px double var(--tinta); padding-top:18px;
    font-style:italic; font-size:18px; text-align:justify; color:#2b2620; }
  .editor b{ font-style:normal; font-family:'Libre Baskerville',serif; font-size:12px;
    letter-spacing:2px; text-transform:uppercase; color:var(--burdeos); display:block; margin-bottom:8px; }
  /* ---- Pie ---- */
  footer{ margin-top:40px; text-align:center; font-family:'Libre Baskerville',serif; font-size:10.5px;
    letter-spacing:1.5px; text-transform:uppercase; color:var(--gris);
    border-top:1px solid var(--linea); padding-top:16px; }
  @media (max-width:680px){ .pliego{ padding:22px 18px 40px; } .fallo{ padding:18px; } }
</style>
</head>
<body>
  <div class="pliego">
    <header class="cab">
      <div class="top">Mercurio &nbsp;·&nbsp; Sección Jurídica &nbsp;·&nbsp; ${esc(fechaLarga)}</div>
      <h1>${esc(NOMBRE_SECCION)}</h1>
      <div class="balanza">&#9878;</div>
      <div class="sub">${esc(SUBTITULO)}</div>
      <div class="maxima">${esc(MAXIMA)}</div>
    </header>

    ${bloqueFallo(notaFallo, r.fallo?.exposicion || "")}
    ${bloqueConcepto(r.concepto)}
    ${bloqueDoctrina(notaDoctrina, r.doctrina?.exposicion || "")}
    ${bloqueNovedades(novedades)}

    <div class="editor">
      <b>Nota del editor</b>
      ${esc(r.conclusion || "")}
    </div>

    <footer>
      ${esc(NOMBRE_SECCION)} · sección jurídica de Mercurio · ${esc(fechaLarga)}<br/>
      Fuentes: Almacén de Derecho · Confilegal · Legal Today · Infobae Judiciales · Comercio y Justicia
    </footer>
  </div>
</body>
</html>`;
}

// --- Programa principal ------------------------------------------------------
async function main() {
  console.log("1) Trayendo notas jurídicas...");
  const todas = await traer();
  if (todas.length === 0) {
    console.error("No se trajo ninguna nota. Revisá tu conexión.");
    process.exitCode = 1;
    return;
  }
  const candidatas = todas.slice(0, 60);
  console.log(`2) La IA (catedrático) arma la edición jurídica (${candidatas.length} candidatas)...`);
  const r = await pedir(candidatas);

  console.log("3) Armando la página de Derecho...");
  const html = armarHtml(r, candidatas);
  const salida = join(CARPETA, "derecho.html");
  writeFileSync(salida, html, "utf8");
  console.log(`\nLISTO. Sección Derecho generada en: ${salida}`);
}

main().catch((e) => {
  console.error("Falló la generación:", e.message);
  process.exitCode = 1;
});
