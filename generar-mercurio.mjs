// ============================================================================
//  GENERAR-MERCURIO.MJS  ->  Diario definitivo en un index.html, con UN SOLO estilo
//  (el clásico de la sección Córdoba/Argentina) aplicado a TODAS las secciones.
//  Toma el contenido de cada sección y lo viste con el tema único de Mercurio.
// ============================================================================
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const CARPETA = dirname(fileURLToPath(import.meta.url));

const SECCIONES = [
  { id: "argentina", etiqueta: "Argentina", archivo: "diario.html" },
  { id: "foro", etiqueta: "Foro", archivo: "derecho.html" },
  { id: "mercado", etiqueta: "Mercado", archivo: "economia.html" },
  { id: "salon", etiqueta: "Salón", archivo: "arte.html" },
  { id: "atlas", etiqueta: "Atlas", archivo: "mundo.html" },
];

// Toma solo el contenido (HTML) y los <script> de cada sección; descarta su CSS.
function extraer(html) {
  let body = (html.match(/<body[^>]*>([\s\S]*?)<\/body>/) || [, ""])[1];
  const scripts = [...body.matchAll(/<script[\s\S]*?<\/script>/g)].map((m) => m[0]);
  body = body.replace(/<script[\s\S]*?<\/script>/g, "");
  return { body, scripts };
}

// ---- TEMA ÚNICO DE MERCURIO (clásico: marfil, Playfair, bordó) --------------
const TEMA = `
  .seccion{
    --tinta:#1a1713; --papel:#f6f2e9; --crema:#ece4d0; --rojo:#8a1f1f; --oro:#9c7a37;
    --gris:#857c6b; --linea:#d6cdb8;
    background:var(--crema); color:var(--tinta);
    font-family:'Spectral',Georgia,serif; font-size:18px; line-height:1.62; padding:34px 18px 50px;
  }
  .seccion *{ box-sizing:border-box; }
  .seccion .hoja,.seccion .pliego,.seccion .marco{
    max-width:1000px; margin:0 auto; background:var(--papel);
    border:1px solid var(--linea); box-shadow:0 0 0 7px var(--papel),0 0 0 8px var(--linea),0 14px 40px rgba(0,0,0,.16);
    padding:34px 40px 52px;
  }
  /* Cabeceras / mastheads de cada sección */
  .seccion .top,.seccion .cabecera-top,.seccion .kicker-row{
    display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;
    font-family:'Space Grotesk',sans-serif; font-size:11px; letter-spacing:2px; text-transform:uppercase;
    color:var(--gris); border-bottom:1px solid var(--linea); padding-bottom:8px; margin-bottom:6px;
  }
  .seccion h1,.seccion .cab,.seccion .nameplate{
    font-family:'Playfair Display',serif !important; font-weight:900; text-align:center; color:var(--tinta) !important;
    font-size:clamp(40px,8vw,66px); letter-spacing:1px; margin:8px 0 4px; line-height:1;
  }
  .seccion .lema,.seccion .sub,.seccion .maxima,.seccion .intro{
    text-align:center; font-style:italic; color:var(--gris); margin:0 auto 12px; font-family:'Spectral',serif; font-size:16px;
  }
  .seccion .balanza,.seccion .filete{ text-align:center; color:var(--rojo); }
  .seccion .filete{ display:flex; align-items:center; justify-content:center; gap:14px; margin:8px 0; }
  .seccion .filete::before,.seccion .filete::after{ content:""; border-top:3px double var(--tinta); width:min(150px,28%); }
  .seccion .filete span{ color:var(--oro); }
  /* Títulos de bloque / sección / etiquetas */
  .seccion .seccion-tit,.seccion .seccion-titulo{ display:flex; align-items:center; gap:14px; margin:30px 0 18px; }
  .seccion .seccion-tit h2,.seccion .seccion-titulo h2,.seccion .seccion-titulo h3{
    font-family:'Playfair Display',serif; font-size:clamp(18px,3vw,24px); letter-spacing:2px; text-transform:uppercase; margin:0; white-space:nowrap; color:var(--tinta);
  }
  .seccion .seccion-tit .raya,.seccion .seccion-titulo .raya{ flex:1; height:2px; background:var(--tinta); }
  .seccion .seccion-titulo::before,.seccion .seccion-titulo::after{ content:""; flex:1; border-top:3px double var(--linea); }
  .seccion .et,.seccion .etiqueta,.seccion .bloque-tit,.seccion .concepto-cab{
    font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:12px; letter-spacing:2px; text-transform:uppercase;
    color:var(--rojo); border-bottom:1px solid var(--linea); padding-bottom:6px; margin:0 0 12px;
  }
  /* Fuentes / regiones / país */
  .seccion .fuente,.seccion .src,.seccion .fuente-linea{
    font-family:'Space Grotesk',sans-serif; font-size:10.5px; letter-spacing:1.5px; text-transform:uppercase; color:var(--rojo); font-weight:600;
  }
  .seccion .region,.seccion .pais{
    display:inline-block; background:var(--rojo); color:#f6f2e9; font-family:'Space Grotesk',sans-serif;
    font-size:10px; letter-spacing:1.5px; text-transform:uppercase; padding:2px 9px;
  }
  .seccion .metas,.seccion .meta-linea{ display:flex; align-items:center; gap:8px; margin-bottom:6px; }
  .seccion .meta{ font-family:'Space Grotesk',sans-serif; font-size:11px; letter-spacing:1px; text-transform:uppercase; color:var(--gris); margin-bottom:10px; }
  /* Nota principal y grilla */
  .seccion .lead{ display:grid; grid-template-columns:1.1fr 1fr; gap:26px; align-items:center; border-top:3px double var(--tinta); padding-top:22px; margin-bottom:26px; }
  .seccion .lead-titulo{ font-family:'Playfair Display',serif; font-weight:700; font-size:clamp(28px,3.6vw,42px); line-height:1.1; margin:6px 0 12px; }
  .seccion .grilla{ display:grid; grid-template-columns:1fr 1fr; gap:30px;
    background:linear-gradient(var(--linea),var(--linea)) no-repeat; background-size:1px calc(100% - 20px); background-position:center 10px; }
  .seccion .titulo{ font-family:'Playfair Display',serif; font-weight:700; font-size:24px; line-height:1.16; margin:5px 0 9px; }
  .seccion .resumen{ font-size:16.5px; margin:0 0 10px; color:#3a342a; }
  .seccion .foto{ width:100%; height:200px; background-size:cover; background-position:center; border:1px solid var(--linea); }
  .seccion .foto-lead{ height:240px; }
  .seccion .fallo-foto{ width:100%; height:230px; background-size:cover; background-position:center; border:1px solid var(--linea); margin:6px 0 14px; }
  .seccion .nota .foto{ margin-bottom:10px; }
  .seccion .sin-foto,.seccion .sin-img{ display:flex; align-items:center; justify-content:center; background:#6b5436 !important;
    color:#f6f2e9; font-family:'Space Grotesk',sans-serif; font-size:12px; letter-spacing:1px; text-transform:uppercase; min-height:160px; text-align:center; padding:16px; }
  .seccion .leer{ font-family:'Space Grotesk',sans-serif; font-size:11px; letter-spacing:1px; text-transform:uppercase; color:var(--rojo); text-decoration:none; font-weight:600; }
  .seccion .leer:hover{ text-decoration:underline; }
  /* Economía: indicadores y gráficos */
  .seccion .bloque{ margin-bottom:18px; }
  .seccion .indic{ display:grid; grid-template-columns:repeat(4,1fr); gap:1px; background:var(--linea); border:1px solid var(--linea); }
  .seccion .ind{ background:var(--papel); padding:11px 10px; }
  .seccion .ind .l{ font-family:'Space Grotesk',sans-serif; font-size:10px; letter-spacing:.5px; text-transform:uppercase; color:var(--gris); }
  .seccion .ind .v{ font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:19px; margin-top:4px; }
  .seccion .chg{ font-size:12px; } .seccion .chg.up{ color:#0f6e56; } .seccion .chg.down{ color:var(--rojo); } .seccion .chg.flat{ color:var(--gris); }
  .seccion .alerta{ font-family:'Space Grotesk',sans-serif; font-size:10px; color:var(--rojo); margin-top:3px; }
  .seccion .data-nota{ text-align:right; font-family:'Space Grotesk',sans-serif; font-size:10px; color:var(--gris); margin:6px 0 18px; }
  .seccion .graficos{ display:grid; grid-template-columns:1fr 1fr; gap:24px; margin:8px 0 24px; }
  .seccion .grafico{ background:#fbf7ed; border:1px solid var(--linea); padding:14px; }
  .seccion .grafico h4{ font-family:'Space Grotesk',sans-serif; font-size:11px; letter-spacing:1.5px; text-transform:uppercase; color:var(--gris); margin:0 0 10px; }
  .seccion .grafico .lienzo{ position:relative; height:240px; }
  /* Derecho: fallo, doctrina, novedades, concepto */
  .seccion .fallo{ margin:26px 0; padding:24px 26px; background:#efe7d3; border:1px solid var(--linea); }
  .seccion .fallo-titulo{ font-family:'Playfair Display',serif; font-weight:700; font-size:clamp(26px,3.4vw,38px); line-height:1.16; margin:6px 0 14px; }
  .seccion .fallo-texto,.seccion .doctrina-texto,.seccion .texto{ font-size:18px; text-align:justify; margin:0 0 14px; }
  .seccion .fallo-texto::first-letter,.seccion .texto::first-letter{ float:left; font-family:'Playfair Display',serif; font-weight:700; font-size:54px; line-height:42px; padding:4px 12px 0 0; color:var(--rojo); }
  .seccion .doctrina{ margin:30px 0; } .seccion .doctrina-titulo{ font-family:'Playfair Display',serif; font-weight:700; font-size:26px; line-height:1.2; margin:5px 0 12px; }
  .seccion .lista-novedades{ list-style:none; margin:0; padding:0; }
  .seccion .novedad{ border-top:1px solid var(--linea); padding:15px 0; } .seccion .novedad:first-child{ border-top:none; }
  .seccion .novedad-cab{ display:flex; align-items:center; gap:8px; margin-bottom:4px; } .seccion .marca{ color:var(--rojo); font-weight:700; }
  .seccion .novedad-titulo,.seccion .nota-tit{ display:block; font-family:'Playfair Display',serif; font-weight:700; font-size:21px; line-height:1.22; color:var(--tinta); text-decoration:none; margin:3px 0 6px; }
  .seccion .novedad-titulo:hover,.seccion .nota-tit:hover{ color:var(--rojo); }
  .seccion .novedad-texto,.seccion .nota-txt{ margin:0; font-size:16px; color:#3a342a; }
  .seccion .concepto{ margin:30px 0; background:var(--tinta); color:var(--papel); padding:22px 26px; border-left:6px solid var(--rojo); }
  .seccion .concepto-cab{ color:#e8b86d; border:none; padding:0; }
  .seccion .concepto-titulo{ font-family:'Playfair Display',serif; font-weight:700; font-size:24px; margin:6px 0 10px; color:#fff; }
  .seccion .concepto-texto{ margin:0; font-size:17px; color:#e9e3d4; text-align:justify; }
  /* Arte: obras, álbum/película, noticias */
  .seccion .obra{ margin-bottom:44px; } .seccion .obra-num{ font-family:'Playfair Display',serif; font-style:italic; font-size:20px; color:var(--rojo); margin-bottom:8px; }
  .seccion .obra-img{ display:block; width:100%; max-height:540px; object-fit:contain; background:#2a2420; border:1px solid var(--linea); }
  .seccion .obra-tit,.seccion .cult-tit{ font-family:'Playfair Display',serif; font-weight:700; font-size:28px; line-height:1.12; margin:12px 0 4px; }
  .seccion .duo{ display:grid; grid-template-columns:1fr 1fr; gap:32px; }
  .seccion .cult-img{ display:block; width:100%; max-height:320px; object-fit:contain; background:#2a2420; border:1px solid var(--linea); margin-bottom:12px; }
  .seccion .news{ list-style:none; margin:0; padding:0; }
  .seccion .news .nota{ border-top:1px solid var(--linea); padding:15px 0; }
  /* Cierres editoriales */
  .seccion .editorial,.seccion .editor,.seccion .analisis{
    margin-top:32px; background:#efe7d3; border-left:5px solid var(--rojo); padding:22px 26px;
    font-style:italic; font-size:18px; text-align:justify; color:#332b22;
  }
  .seccion .editorial b,.seccion .editor b,.seccion .analisis b,.seccion .editorial h4{
    font-style:normal; font-family:'Space Grotesk',sans-serif; font-size:12px; letter-spacing:2px; text-transform:uppercase; color:var(--rojo); display:block; margin-bottom:8px;
  }
  .seccion footer{ margin-top:40px; text-align:center; font-family:'Space Grotesk',sans-serif; font-size:10.5px; letter-spacing:1.5px; text-transform:uppercase; color:var(--gris); border-top:1px solid var(--linea); padding-top:16px; }
  @media (max-width:680px){
    .seccion{ font-size:16.5px; }
    .seccion .hoja,.seccion .pliego,.seccion .marco{ padding:22px 18px 38px; }
    .seccion .lead,.seccion .grilla,.seccion .graficos,.seccion .duo{ grid-template-columns:1fr; }
    .seccion .grilla{ background:none; }
    .seccion .indic{ grid-template-columns:repeat(2,1fr); }
    /* En celular: nada de texto justificado (deja huecos feos). Todo a la izquierda. */
    .seccion .fallo-texto,.seccion .doctrina-texto,.seccion .texto,.seccion .resumen,
    .seccion .editorial,.seccion .editor,.seccion .analisis,.seccion .concepto-texto,
    .seccion .novedad-texto,.seccion .nota-txt,.seccion .lead-resumen{ text-align:left; }
    .seccion .fallo,.seccion .concepto{ padding:18px; }
  }
`;

const ahora = new Date();
const fechaLarga = ahora.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const edicion = ahora.getHours() < 14 ? "Edición de la mañana" : "Edición de la noche";

const partes = SECCIONES.map((s) => {
  const html = readFileSync(join(CARPETA, s.archivo), "utf8");
  return { ...s, ...extraer(html) };
});

const scripts = partes.flatMap((p) => p.scripts).join("\n");
const cuerpoSecciones = partes.map((p) => `<section id="sec-${p.id}" class="seccion">${p.body}</section>`).join("\n");
const navLinks = [{ id: "portada", etiqueta: "Portada" }, ...SECCIONES.map((s) => ({ id: "sec-" + s.id, etiqueta: s.etiqueta }))]
  .map((l) => `<a href="#${l.id}">${l.etiqueta}</a>`).join("");
const tarjetasPortada = SECCIONES.map((s) => `<a class="mx-card" href="#sec-${s.id}">${s.etiqueta}</a>`).join("");

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Mercurio — diario personal</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='16' fill='%231a1713'/><text x='50' y='74' font-size='66' text-anchor='middle' fill='%23e8b86d' font-family='Georgia,serif' font-weight='bold'>M</text></svg>" />
<meta name="theme-color" content="#1a1713" />
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
<meta http-equiv="Pragma" content="no-cache" />
<meta http-equiv="Expires" content="0" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;0,900;1,600&family=Spectral:ital,wght@0,400;0,500;1,400&family=Space+Grotesk:wght@400;500;700&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet" />
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<style>
  html{ scroll-behavior:smooth; }
  body{ margin:0; background:#1a1713; font-family:'Playfair Display',Georgia,serif; }
  .mx-nav{ position:sticky; top:0; z-index:1000; display:flex; align-items:center; gap:4px; flex-wrap:wrap; background:#1a1713; border-bottom:2px solid #9c7a37; padding:10px 18px; }
  .mx-nav .mx-logo{ font-family:'Playfair Display',serif; font-weight:900; font-size:20px; letter-spacing:2px; color:#e8b86d; text-transform:uppercase; margin-right:14px; }
  .mx-nav a{ font-family:'Space Grotesk',sans-serif; font-size:12px; letter-spacing:1.5px; text-transform:uppercase; color:#cdbf9f; text-decoration:none; padding:6px 12px; }
  .mx-nav a:hover{ color:#1a1713; background:#e8b86d; }
  .seccion{ scroll-margin-top:54px; }
  #portada{ scroll-margin-top:54px; background:#f6f2e9; color:#1a1713; text-align:center; padding:72px 24px 80px; border-bottom:4px double #1a1713; }
  #portada .kick{ font-family:'Space Grotesk',sans-serif; font-size:12px; letter-spacing:4px; text-transform:uppercase; color:#857c6b; }
  #portada h1{ font-family:'Playfair Display',serif; font-weight:900; font-size:clamp(64px,16vw,140px); letter-spacing:2px; margin:8px 0 4px; line-height:1; }
  #portada .pf-filete{ display:flex; align-items:center; justify-content:center; gap:16px; margin:10px 0 14px; }
  #portada .pf-filete::before,#portada .pf-filete::after{ content:""; border-top:3px double #1a1713; width:min(200px,30%); }
  #portada .pf-filete span{ color:#9c7a37; font-size:22px; }
  #portada .lema{ font-style:italic; font-size:19px; color:#5c5343; max-width:640px; margin:0 auto 28px; }
  .mx-cards{ display:flex; flex-wrap:wrap; justify-content:center; gap:14px; }
  .mx-card{ font-family:'Space Grotesk',sans-serif; font-size:13px; letter-spacing:2px; text-transform:uppercase; color:#1a1713; text-decoration:none; border:1px solid #1a1713; padding:12px 22px; }
  .mx-card:hover{ background:#1a1713; color:#f6f2e9; }
  #portada .baja{ font-family:'Space Grotesk',sans-serif; font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#857c6b; margin-top:34px; }
  ${TEMA}
</style>
</head>
<body>
  <nav class="mx-nav"><span class="mx-logo">Mercurio</span>${navLinks}</nav>
  <header id="portada">
    <div class="kick">${edicion} · ${fechaLarga}</div>
    <h1>Mercurio</h1>
    <div class="pf-filete"><span>&#9884;</span></div>
    <div class="lema">El diario personal que se cultiva: Argentina, derecho, economía, arte y el mundo.</div>
    <div class="mx-cards">${tarjetasPortada}</div>
    <div class="baja">&#8595; Entrá, o elegí una sección arriba</div>
  </header>
  ${cuerpoSecciones}
  ${scripts}
</body>
</html>`;

writeFileSync(join(CARPETA, "index.html"), html, "utf8");
console.log("LISTO. Diario definitivo (estilo único) en: " + join(CARPETA, "index.html"));
