// ============================================================================
//  GENERAR-ARTE.MJS  ->  Sección ARTE Y CULTURA ("Salón")
//  Curador IA: 3 obras pictóricas + 1 álbum + 1 película del día, con su contexto,
//  + noticias de cultura. Imágenes desde Wikipedia (gratis). Genera "arte.html".
// ============================================================================
import { crearParser, sacarImagen, limpiar, esc, llamarGemini, CARPETA } from "./comun.mjs";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const NOMBRE_SECCION = "Salón";

const FUENTES = [
  { nombre: "La Nación Cultura", url: "https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/cultura/?outputType=xml" },
  { nombre: "Ñ (Clarín)", url: "https://www.clarin.com/rss/cultura/" },
  { nombre: "Infobae Cultura", url: "https://www.infobae.com/arc/outboundfeeds/rss/category/cultura/?outputType=xml" },
  { nombre: "The Art Newspaper", url: "https://www.theartnewspaper.com/rss.xml" },
  { nombre: "El País Cultura", url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/cultura/portada" },
];

const parser = crearParser();

// --- Imagen desde Wikipedia (prueba español y luego inglés) -----------------
const normal = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Busca imagen en Wikipedia y la acepta SOLO si la página realmente trata de la obra:
// el apellido del autor (o una palabra distintiva del título) debe aparecer en el
// título o la introducción del artículo. Así evitamos imágenes equivocadas.
async function wikiImagenValida(query, titulo, autor) {
  const apellido = normal(autor).split(/\s+/).filter((w) => w.length > 3).pop() || "";
  const palabrasTitulo = normal(titulo).split(/\s+/).filter((w) => w.length > 4);
  for (const lang of ["en", "es"]) {
    try {
      const url = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages|extracts&piprop=original|thumbnail&pithumbsize=900&exintro=1&explaintext=1&redirects=1&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1`;
      const r = await fetch(url, { headers: { "User-Agent": "DiarioPersonal/1.0 (uso personal)" } });
      if (!r.ok) continue;
      const pages = (await r.json())?.query?.pages;
      if (!pages) continue;
      const p = Object.values(pages)[0];
      const img = p.original?.source || p.thumbnail?.source;
      if (!img) continue;
      const tituloPag = normal(p.title || "");
      const autorN = normal(autor);
      // Si la página es la biografía del autor (no la obra), descartar: evita mostrar su foto.
      const esBioDelAutor = tituloPag && tituloPag.split(/\s+/).every((w) => autorN.includes(w));
      if (esBioDelAutor) continue;
      const texto = normal((p.title || "") + " " + (p.extract || ""));
      if ((apellido && texto.includes(apellido)) || palabrasTitulo.some((w) => texto.includes(w))) return img;
    } catch {}
  }
  return null;
}

// --- 1) La IA curadora elige obras/álbum/película ---------------------------
async function curar() {
  const fecha = new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
  const prompt = `Sos un curador de arte y cultura, erudito y apasionado, que cada día forma a un lector para cultivarlo. Español de Argentina, tono cálido y culto. Fecha de hoy: ${fecha}.

Recomendá PARA HOY (variá respecto de lo más obvio, sorprendé):
- 3 OBRAS PICTÓRICAS de gran valor y VARIADAS: al menos una histórica/clásica y una moderna o contemporánea; distintos artistas, épocas y movimientos.
- 1 ÁLBUM de música memorable (cualquier época o género de prestigio).
- 1 PELÍCULA imprescindible.

Para CADA recomendación, escribí un texto DIDÁCTICO de 5 a 7 oraciones que cuente EL DETRÁS: quién es el artista/autor, el contexto histórico, la historia o anécdota de la obra, y qué apreciar para entenderla y disfrutarla. Que enseñe y dé ganas de buscar más.
Incluí en "busqueda" el mejor término para encontrar su imagen en Wikipedia (ej.: "Las meninas Velázquez", "Abbey Road The Beatles", "El padrino película 1972").

Devolvé SOLO este JSON, sin texto extra:
{
  "intro": "<2 oraciones de bienvenida del curador para hoy>",
  "obras": [ { "titulo": "", "artista": "", "anio": "", "movimiento": "", "museo": "", "busqueda": "", "texto": "" } ],
  "album": { "titulo": "", "artista": "", "anio": "", "genero": "", "busqueda": "", "texto": "" },
  "pelicula": { "titulo": "", "director": "", "anio": "", "busqueda": "", "texto": "" }
}
(El array "obras" debe tener exactamente 3 elementos.)`;
  return llamarGemini(prompt);
}

// --- 2) Noticias de cultura -------------------------------------------------
async function traerNoticias() {
  const todas = [];
  for (const f of FUENTES) {
    try {
      const feed = await parser.parseURL(f.url);
      for (const it of (feed.items || []).slice(0, 8)) {
        todas.push({ titulo: (it.title || "").trim(), link: it.link || "", snippet: limpiar(it.contentSnippet || it.content || ""), imagen: sacarImagen(it), fuente: f.nombre, fecha: it.isoDate || it.pubDate || "" });
      }
    } catch {}
  }
  todas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  return todas;
}

async function pedirNoticias(candidatas) {
  const listado = candidatas.map((n, i) => `[${i}] FUENTE: ${n.fuente}\nTITULO: ${n.titulo}\nTEXTO: ${n.snippet}`).join("\n\n");
  const prompt = `Sos el editor de cultura de un diario de élite. Tono culto, español de Argentina.
De esta lista elegí entre 5 y 7 noticias culturales relevantes (artes visuales, literatura, música, cine, patrimonio, ideas). Evitá farándula y virales. Diversificá fuentes. Resumen objetivo de 2 oraciones cada una.
Devolvé SOLO: { "seleccion": [ { "indice": <n>, "resumen": "<texto>" } ] }
Lista:
${listado}`;
  return llamarGemini(prompt);
}

// --- 3) Render --------------------------------------------------------------
function imgTag(src, alt, clase) {
  return src
    ? `<img class="${clase}" src="${esc(src)}" alt="${esc(alt)}" loading="lazy" />`
    : `<div class="${clase} sin-img">${esc(alt)}</div>`;
}

function bloqueObra(o, n) {
  const meta = [o.artista, o.anio, o.movimiento, o.museo].filter(Boolean).map(esc).join(" · ");
  return `
  <article class="obra">
    <div class="obra-num">${n}</div>
    ${imgTag(o.imagen, o.titulo, "obra-img")}
    <div class="obra-cuerpo">
      <h3 class="obra-tit">${esc(o.titulo)}</h3>
      <div class="meta">${meta}</div>
      <p class="texto">${esc(o.texto)}</p>
    </div>
  </article>`;
}

function tarjetaCultural(etiqueta, item, metaCampos) {
  const meta = metaCampos.filter(Boolean).map(esc).join(" · ");
  return `
  <article class="cult">
    <div class="et">${esc(etiqueta)}</div>
    ${imgTag(item.imagen, item.titulo, "cult-img")}
    <h3 class="cult-tit">${esc(item.titulo)}</h3>
    <div class="meta">${meta}</div>
    <p class="texto">${esc(item.texto)}</p>
  </article>`;
}

function armarHtml(c, noticias) {
  const ahora = new Date();
  const fechaLarga = ahora.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const obras = c.obras.map((o, i) => bloqueObra(o, i + 1)).join("\n");
  const album = tarjetaCultural("Álbum del día", c.album, [c.album.artista, c.album.anio, c.album.genero]);
  const peli = tarjetaCultural("Película del día", c.pelicula, [c.pelicula.director, c.pelicula.anio]);
  const news = noticias
    .map((x) => `<li class="nota"><span class="fuente">${esc(x.nota.fuente)}</span><a class="nota-tit" href="${esc(x.nota.link)}" target="_blank" rel="noopener">${esc(x.nota.titulo)}</a><p class="nota-txt">${esc(x.resumen)}</p></li>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(NOMBRE_SECCION)} · Arte y cultura</title>
<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,500;1,9..144,600&family=Spectral:ital,wght@0,400;0,500;1,400&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet" />
<style>
  :root{ --papel:#f3efe8; --tinta:#221c19; --terra:#7a3b2e; --gris:#7c6f66; --linea:#ddd3c6; }
  *{ box-sizing:border-box; } body{ margin:0; background:#e7ddcd; color:var(--tinta); font-family:'Spectral',Georgia,serif; font-size:18px; line-height:1.7; }
  .hoja{ max-width:920px; margin:18px auto; background:var(--papel); border:1px solid var(--linea); box-shadow:0 0 0 7px var(--papel),0 0 0 8px var(--linea),0 16px 44px rgba(0,0,0,.28); padding:34px 42px 56px; }
  .top{ display:flex; justify-content:space-between; font-family:'Space Grotesk',sans-serif; font-size:11px; letter-spacing:3px; text-transform:uppercase; color:var(--gris); border-bottom:1px solid var(--linea); padding-bottom:8px; }
  h1.cab{ font-family:'Fraunces',serif; font-weight:600; font-style:italic; font-size:clamp(46px,10vw,82px); text-align:center; color:var(--terra); margin:10px 0 6px; }
  .intro{ text-align:center; font-family:'Fraunces',serif; font-style:italic; font-size:19px; color:#4a3f37; max-width:680px; margin:0 auto 10px; }
  .seccion-tit{ display:flex; align-items:center; gap:14px; margin:40px 0 26px; }
  .seccion-tit h2{ font-family:'Space Grotesk',sans-serif; font-size:13px; letter-spacing:4px; text-transform:uppercase; margin:0; color:var(--terra); white-space:nowrap; }
  .seccion-tit .raya{ flex:1; height:1px; background:var(--linea); }
  .obra{ position:relative; margin-bottom:48px; }
  .obra-num{ font-family:'Fraunces',serif; font-style:italic; font-size:20px; color:var(--terra); margin-bottom:8px; }
  .obra-img{ display:block; width:100%; max-height:560px; object-fit:contain; background:#2a2420; border:1px solid var(--linea); }
  .sin-img{ display:flex; align-items:center; justify-content:center; min-height:220px; background:#2a2420; color:#cdbfae; font-family:'Space Grotesk',sans-serif; font-size:13px; text-align:center; padding:20px; }
  .obra-cuerpo{ margin-top:14px; }
  .obra-tit{ font-family:'Fraunces',serif; font-weight:600; font-size:30px; line-height:1.1; margin:0 0 4px; }
  .meta{ font-family:'Space Grotesk',sans-serif; font-size:11px; letter-spacing:1.5px; text-transform:uppercase; color:var(--gris); margin-bottom:12px; }
  .texto{ font-size:18px; text-align:justify; margin:0; }
  .texto::first-letter{ font-family:'Fraunces',serif; font-weight:600; font-size:46px; line-height:38px; float:left; padding:6px 10px 0 0; color:var(--terra); }
  .duo{ display:grid; grid-template-columns:1fr 1fr; gap:34px; }
  .cult .et{ font-family:'Space Grotesk',sans-serif; font-size:11px; letter-spacing:2px; text-transform:uppercase; color:var(--terra); margin-bottom:10px; border-bottom:1px solid var(--linea); padding-bottom:6px; }
  .cult-img{ display:block; width:100%; max-height:340px; object-fit:contain; background:#2a2420; border:1px solid var(--linea); margin-bottom:12px; }
  .cult-tit{ font-family:'Fraunces',serif; font-weight:600; font-size:24px; line-height:1.12; margin:0 0 4px; }
  .cult .texto::first-letter{ font-size:30px; line-height:26px; padding:4px 8px 0 0; }
  .news{ list-style:none; margin:0; padding:0; }
  .news .nota{ border-top:1px solid var(--linea); padding:16px 0; }
  .news .fuente{ font-family:'Space Grotesk',sans-serif; font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--terra); }
  .news .nota-tit{ display:block; font-family:'Fraunces',serif; font-weight:600; font-size:21px; line-height:1.2; color:var(--tinta); text-decoration:none; margin:3px 0 6px; }
  .news .nota-tit:hover{ color:var(--terra); }
  .news .nota-txt{ margin:0; font-size:16px; color:#43382f; }
  footer{ margin-top:44px; text-align:center; font-family:'Space Grotesk',sans-serif; font-size:10.5px; letter-spacing:1.5px; text-transform:uppercase; color:var(--gris); border-top:1px solid var(--linea); padding-top:16px; }
  @media (max-width:680px){ .hoja{ padding:24px 20px 40px; } .duo{ grid-template-columns:1fr; } }
</style>
</head><body>
  <div class="hoja">
    <div class="top"><span>Arte y cultura · histórica y contemporánea</span><span>${esc(fechaLarga)}</span></div>
    <h1 class="cab">${esc(NOMBRE_SECCION)}</h1>
    <div class="intro">${esc(c.intro || "")}</div>

    <div class="seccion-tit"><h2>Las obras del día</h2><div class="raya"></div></div>
    ${obras}

    <div class="seccion-tit"><h2>Para escuchar y ver</h2><div class="raya"></div></div>
    <div class="duo">${album}${peli}</div>

    <div class="seccion-tit"><h2>Noticias de cultura</h2><div class="raya"></div></div>
    <ul class="news">${news}</ul>

    <footer>${esc(NOMBRE_SECCION)} · sección arte y cultura de Mercurio · ${esc(fechaLarga)}<br/>Curaduría por IA · imágenes: Wikimedia Commons · noticias: La Nación, Ñ, Infobae, The Art Newspaper, El País</footer>
  </div>
</body></html>`;
}

// --- Principal ---------------------------------------------------------------
async function main() {
  console.log("1) La IA curadora elige obras, álbum y película...");
  const c = await curar();
  if (!c?.obras?.length) { console.error("La IA no devolvió obras."); process.exitCode = 1; return; }

  console.log("2) Buscando imágenes en Wikipedia (con verificación)...");
  const obrasImgs = await Promise.all(c.obras.map((o) => wikiImagenValida(`${o.titulo} ${o.artista}`, o.titulo, o.artista)));
  c.obras.forEach((o, i) => (o.imagen = obrasImgs[i]));
  const [albImg, pelImg] = await Promise.all([
    wikiImagenValida(`${c.album?.titulo} ${c.album?.artista} álbum`, c.album?.titulo, c.album?.artista),
    wikiImagenValida(`${c.pelicula?.titulo} ${c.pelicula?.director} película`, c.pelicula?.titulo, c.pelicula?.director),
  ]);
  c.album.imagen = albImg;
  c.pelicula.imagen = pelImg;

  console.log("3) Trayendo y eligiendo noticias de cultura...");
  const todas = await traerNoticias();
  const candidatas = todas.slice(0, 36);
  let noticias = [];
  try {
    const r = await pedirNoticias(candidatas);
    noticias = (r.seleccion || []).map((s) => ({ nota: candidatas[s.indice], resumen: s.resumen })).filter((x) => x.nota);
  } catch (e) {
    console.log("   (no se pudieron sumar noticias: " + e.message + ")");
  }

  console.log("4) Armando la sección Arte...");
  const html = armarHtml(c, noticias);
  const salida = join(CARPETA, "arte.html");
  writeFileSync(salida, html, "utf8");
  console.log(`\nLISTO. Sección Arte generada en: ${salida}`);
}

main().catch((e) => { console.error("Falló la generación:", e.message); process.exitCode = 1; });
