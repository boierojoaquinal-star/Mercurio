// ============================================================================
//  GENERAR-DOSSIER-IA.MJS  ->  PROFUNDUM · Expediente D-001: "IA y Derecho"
//  La IA actúa como ANALISTA: cruza fuentes río arriba (IA + jurídicas) y arma
//  el expediente en el molde militar clasificado. Sale PRIVADO en /profundum.
// ============================================================================
import { crearParser, limpiar, esc, llamarGemini, CARPETA } from "./comun.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const REF = "D-001";
const TITULO = "Inteligencia artificial y derecho";
const AMBITO = "Global · Argentina";
const SALA = "Derecho × Tecnología";
const CLASIFICACION = "RESERVADO"; // tier por debajo de MUTUS (esto es análisis, no radioactivo)

const FUENTES = [
  { nombre: "Import AI", tipo: "ai", url: "https://importai.substack.com/feed" },
  { nombre: "MIT Tech Review", tipo: "ai", url: "https://www.technologyreview.com/feed/" },
  { nombre: "OpenAI", tipo: "ai", url: "https://openai.com/blog/rss.xml" },
  { nombre: "arXiv cs.AI", tipo: "ai", url: "http://export.arxiv.org/rss/cs.AI" },
  { nombre: "Almacén de Derecho", tipo: "law", url: "https://almacendederecho.org/feed" },
  { nombre: "Confilegal", tipo: "law", url: "https://confilegal.com/feed/" },
  { nombre: "Legal Today", tipo: "law", url: "https://www.legaltoday.com/feed/" },
  { nombre: "Infobae Judiciales", tipo: "law", url: "https://www.infobae.com/arc/outboundfeeds/rss/category/judiciales/?outputType=xml" },
];

const reAI = /(\bia\b|inteligencia artificial|\bai\b|algoritm|machine learning|aprendizaje autom|modelo de lenguaje|\bllm\b|chatbot|openai|\bgpt|deep ?learning|datos personales|\bdigital\b|tecnolog)/i;
const reLaw = /(regula|regulat|\blaw\b|legal|\bley\b|derecho|tribunal|court|pol[ií]t|governance|gobernanza|copyright|propiedad intelectual|privacid|privacy|liabilit|responsabilidad|compliance|\bact\b|sentencia|fallo|normativ|[ée]tic|ethic|rights|derechos|safety|alignment)/i;

const parser = crearParser();

async function traer() {
  const todas = [];
  for (const f of FUENTES) {
    try {
      const feed = await parser.parseURL(f.url);
      for (const it of (feed.items || []).slice(0, 18)) {
        const titulo = (it.title || "").trim();
        const snippet = limpiar(it.contentSnippet || it.content || "", 240);
        const texto = (titulo + " " + snippet).toLowerCase();
        const relevante =
          (f.tipo === "ai" && reLaw.test(texto)) ||
          (f.tipo === "law" && reAI.test(texto)) ||
          (reAI.test(texto) && reLaw.test(texto));
        if (relevante) {
          todas.push({ titulo, link: it.link || "", snippet, fuente: f.nombre, fecha: it.isoDate || it.pubDate || "" });
        }
      }
      console.log(`  ok  ${f.nombre}`);
    } catch (e) {
      console.log(`  -   ${f.nombre}: ${e.message}`);
    }
  }
  todas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  return todas;
}

async function analizar(cand) {
  const listado = cand.map((n, i) => `[${i}] (${n.fuente}) ${n.titulo}\n    ${n.snippet}`).join("\n\n");
  const prompt = `Sos un ANALISTA de inteligencia estratégica. Construí un EXPEDIENTE clasificado sobre el tema "Inteligencia Artificial y Derecho: regulación e impacto legal" (foco global y lo que llega a Argentina). Tono riguroso, sobrio, de informe de inteligencia, en español.
Te paso fuentes recientes (papers, análisis de IA y notas jurídicas). Usalas + tu conocimiento experto.

Devolvé SOLO este JSON:
{
  "resumen_ejecutivo": "<3-4 oraciones: la situación de un vistazo>",
  "evaluacion": { "texto": "<qué significa y por qué importa, 3-4 oraciones>", "confianza": "ALTA|MEDIA|BAJA", "que_viene": "<1-2 oraciones de anticipación>" },
  "cronologia": [ { "fecha": "<año o fecha>", "evento": "<hito clave>" } ],
  "fuentes": [ { "indice": <n de la lista>, "tag": "<PAPER|ANÁLISIS|DOCTRINA|CASO|NORMA>", "nota": "<por qué importa, 1 oración>" } ],
  "actores": [ { "nombre": "", "rol": "", "posicion": "<su postura en 1 frase>" } ],
  "tesis_pregunta": "<una pregunta filosa para que el lector escriba su propia tesis>"
}

Reglas:
- "cronologia" (4 a 6 hitos, del más viejo al más nuevo) y "actores" (4 a 6: UE, EE.UU., empresas líderes, tribunales, Argentina) pueden venir de tu conocimiento; sé preciso y real.
- "fuentes" (4 a 7): elegí SOLO de la lista, por índice, las más pertinentes a IA+derecho. Si algo no es pertinente, no lo incluyas.

Lista de fuentes:
${listado}`;
  return llamarGemini(prompt);
}

// ---------- Render (molde militar oscuro) ----------
function render(d, cand) {
  const hoy = new Date().toISOString().slice(0, 10);
  const crono = (d.cronologia || []).map((e) => `<div class="ev"><span class="fecha">${esc(e.fecha)} —</span> ${esc(e.evento)}</div>`).join("");
  const fuentes = (d.fuentes || [])
    .map((f) => {
      const n = cand[f.indice];
      if (!n) return "";
      return `<div class="fuente"><span class="tag">${esc(f.tag || "FUENTE")}</span><div><a href="${esc(n.link)}" target="_blank" rel="noopener">${esc(n.titulo)}</a><div class="nota">${esc(f.nota || "")} <span class="org">· ${esc(n.fuente)}</span></div></div></div>`;
    })
    .join("");
  const actores = (d.actores || []).map((a) => `<div class="actor"><div class="n">${esc(a.nombre)}</div><div class="r">${esc(a.rol)}</div><div class="pos">${esc(a.posicion)}</div></div>`).join("");
  const conf = (d.evaluacion?.confianza || "MEDIA").toUpperCase();

  return `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>PROFUNDUM · ${esc(REF)} — ${esc(TITULO)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Saira+Stencil+One&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
<style>
  :root{ --fondo:#060705; --panel:#0b0c08; --panel2:#0f110b; --tinta:#d8dbc8; --muted:#787c62; --oliva:#b3be71; --oliva2:#525c32; --rojo:#c5402f; --rojo2:#54130d; --linea:#1c1f15; }
  *{ box-sizing:border-box; } body{ margin:0; background:var(--fondo); color:var(--tinta); font-family:'JetBrains Mono',ui-monospace,monospace; font-size:14px; line-height:1.7; background-image:radial-gradient(var(--linea) 1px,transparent 1px); background-size:22px 22px; }
  .clasif{ background:var(--rojo2); color:#f1e4dd; text-align:center; font-size:11px; font-weight:700; letter-spacing:4px; padding:7px 8px; text-transform:uppercase; }
  .doc{ max-width:860px; margin:0 auto; background:var(--panel); border-left:1px solid var(--linea); border-right:1px solid var(--linea); position:relative; padding:30px 40px 44px; overflow:hidden; }
  .sello{ position:absolute; top:80px; right:-6px; transform:rotate(11deg); border:3px solid var(--rojo); color:var(--rojo); font-family:'Saira Stencil One',monospace; font-size:26px; letter-spacing:5px; padding:4px 16px; opacity:.85; }
  .kick{ font-size:11px; letter-spacing:3px; color:var(--oliva); text-transform:uppercase; }
  .codigo{ font-size:11px; letter-spacing:2px; color:var(--muted); margin-top:14px; }
  h1{ font-family:'Saira Stencil One',monospace; font-weight:400; font-size:clamp(28px,5.5vw,44px); color:#dfe2cc; letter-spacing:1px; line-height:1.05; margin:4px 0 18px; text-transform:uppercase; }
  .meta{ display:grid; grid-template-columns:repeat(4,1fr); border-top:1px solid var(--linea); border-left:1px solid var(--linea); margin-bottom:8px; }
  .meta div{ border-right:1px solid var(--linea); border-bottom:1px solid var(--linea); padding:8px 10px; }
  .meta .l{ font-size:9.5px; letter-spacing:1.5px; color:var(--muted); text-transform:uppercase; } .meta .v{ font-size:12.5px; color:var(--tinta); margin-top:2px; font-weight:500; } .v.ok{ color:var(--oliva); } .v.cl{ color:var(--rojo); }
  section{ margin-top:30px; } h2{ display:flex; align-items:center; gap:12px; font-size:13px; font-weight:700; letter-spacing:2px; color:var(--oliva); text-transform:uppercase; margin:0 0 12px; } h2 .num{ color:var(--oliva2); } h2::after{ content:""; flex:1; height:1px; background:var(--linea); }
  p{ margin:0 0 12px; } .dim{ color:var(--muted); }
  .conf{ display:inline-flex; align-items:center; gap:7px; font-size:11px; letter-spacing:1px; color:var(--oliva); border:1px solid var(--oliva2); padding:3px 9px; text-transform:uppercase; } .conf .dot{ width:8px; height:8px; border-radius:50%; background:var(--oliva); }
  .crono{ border-left:2px solid var(--oliva2); padding-left:16px; } .crono .ev{ margin-bottom:12px; } .crono .fecha{ color:var(--oliva); font-weight:700; font-size:12.5px; letter-spacing:1px; }
  .fuente{ display:flex; gap:10px; align-items:baseline; padding:10px 0; border-bottom:1px solid var(--linea); } .tag{ flex:none; font-size:9.5px; font-weight:700; letter-spacing:1px; padding:2px 7px; border:1px solid var(--oliva2); color:var(--oliva); text-transform:uppercase; } .fuente a{ color:var(--tinta); text-decoration:none; border-bottom:1px dotted var(--muted); } .fuente a:hover{ color:var(--oliva); } .nota{ font-size:12px; color:var(--muted); margin-top:3px; } .org{ color:var(--oliva2); }
  .actores{ display:grid; grid-template-columns:1fr 1fr; gap:12px; } .actor{ border:1px solid var(--linea); background:var(--panel2); padding:11px 13px; } .actor .n{ font-weight:700; color:#dfe2cc; } .actor .r{ font-size:11px; color:var(--muted); } .actor .pos{ font-size:12px; margin-top:5px; }
  .tesis{ border:1px dashed var(--oliva2); background:rgba(179,190,113,.05); padding:16px 18px; } .tesis .et{ font-size:10px; letter-spacing:2px; color:var(--oliva); text-transform:uppercase; } .tesis .q{ color:var(--tinta); margin-top:8px; } .tesis .ph{ color:var(--muted); font-style:italic; margin-top:8px; }
  @media(max-width:620px){ .meta{ grid-template-columns:repeat(2,1fr); } .actores{ grid-template-columns:1fr; } .doc{ padding:24px 18px 32px; } }
</style></head><body>
  <div class="clasif">// PROFUNDUM // CLASIFICACIÓN: ${esc(CLASIFICACION)} — USO INTERNO //</div>
  <div class="doc">
    <div class="sello">${esc(CLASIFICACION)}</div>
    <div class="kick">Profundum · Archivo de inteligencia</div>
    <div class="codigo">DOSSIER ${esc(REF)} &nbsp;·&nbsp; ÁMBITO: ${esc(AMBITO).toUpperCase()} &nbsp;·&nbsp; SALA: ${esc(SALA).toUpperCase()}</div>
    <h1>${esc(TITULO)}</h1>
    <div class="meta">
      <div><div class="l">Ref.</div><div class="v">${esc(REF)}</div></div>
      <div><div class="l">Apertura</div><div class="v">${hoy}</div></div>
      <div><div class="l">Actualizado</div><div class="v">${hoy}</div></div>
      <div><div class="l">Estado</div><div class="v ok">● ACTIVO</div></div>
      <div><div class="l">Clasificación</div><div class="v cl">${esc(CLASIFICACION)}</div></div>
      <div><div class="l">Confianza</div><div class="v ok">${esc(conf)}</div></div>
      <div><div class="l">Analista</div><div class="v">IA · Gemini</div></div>
      <div><div class="l">Fuentes</div><div class="v">${(d.fuentes || []).length}</div></div>
    </div>
    <section><h2><span class="num">01</span> Resumen ejecutivo</h2><p>${esc(d.resumen_ejecutivo || "")}</p></section>
    <section><h2><span class="num">02</span> Evaluación</h2>
      <p><span class="conf"><span class="dot"></span> Confianza ${esc(conf)}</span></p>
      <p>${esc(d.evaluacion?.texto || "")}</p>
      <p><span class="dim">Qué viene:</span> ${esc(d.evaluacion?.que_viene || "")}</p>
    </section>
    <section><h2><span class="num">03</span> Cronología</h2><div class="crono">${crono}</div></section>
    <section><h2><span class="num">04</span> Fuentes primarias</h2>${fuentes}</section>
    <section><h2><span class="num">05</span> Actores</h2><div class="actores">${actores}</div></section>
    <section><h2><span class="num">06</span> Taller — tu tesis</h2>
      <div class="tesis"><div class="et">✎ Tu lectura (la IA te la discute)</div>
        <div class="q">${esc(d.tesis_pregunta || "")}</div>
        <div class="ph">— Acá escribís tu postura. —</div>
      </div>
    </section>
  </div>
  <div class="clasif">// FIN DEL DOCUMENTO // PROFUNDUM // ${esc(CLASIFICACION)} //</div>
</body></html>`;
}

async function main() {
  console.log("1) Cruzando fuentes río arriba (IA × Derecho)...");
  const todas = await traer();
  const cand = todas.slice(0, 30);
  console.log(`   ${cand.length} fuentes relevantes encontradas.`);
  if (cand.length === 0) { console.error("No hubo fuentes relevantes hoy."); process.exitCode = 1; return; }
  console.log("2) El analista (IA) construye el expediente...");
  const d = await analizar(cand);
  console.log("3) Sellando el dossier...");
  const dir = join(CARPETA, "profundum");
  mkdirSync(dir, { recursive: true });
  const salida = join(dir, "ia-derecho.html");
  writeFileSync(salida, render(d, cand), "utf8");
  console.log(`\nLISTO. Expediente ${REF} generado (PRIVADO) en: ${salida}`);
}

main().catch((e) => { console.error("Falló:", e.message); process.exitCode = 1; });
