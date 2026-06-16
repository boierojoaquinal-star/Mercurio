// ============================================================================
//  GENERAR-CONSOLA.MJS  ->  PROFUNDUM · LA MESA (una sola app, con menú)
//  Baja data en vivo + intel + radar jurídico, calcula alertas y memoria, y
//  arma UNA sola consola navegable (Tablero/Mercados/Argentina/Radar/Intel/
//  Expedientes/CRM/Cuaderno). Privada, detrás de clave. Sale en /profundum.
// ============================================================================
import { crearParser, limpiar, esc, llamarGemini, CARPETA } from "./comun.mjs";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const FREDK = process.env.FRED_API_KEY;
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36" };

// ---------- MEMORIA (núcleo) ----------
function leerMemoria(dir) { const f = join(dir, "memoria", "registro.json"); try { return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : []; } catch { return []; } }
function guardarMemoria(dir, arr) { const d = join(dir, "memoria"); mkdirSync(d, { recursive: true }); writeFileSync(join(d, "registro.json"), JSON.stringify(arr.slice(-300)), "utf8"); }

// ---------- DATA ----------
async function yahoo(s) { try { const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?interval=1d&range=5d`, { headers: UA }); if (!r.ok) return null; const m = (await r.json())?.chart?.result?.[0]?.meta; if (!m || m.regularMarketPrice == null) return null; const p = m.chartPreviousClose ?? m.previousClose; return { v: m.regularMarketPrice, chg: p ? ((m.regularMarketPrice - p) / p) * 100 : null }; } catch { return null; } }
async function fred(id) { if (!FREDK) return null; try { const r = await fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${FREDK}&file_type=json&sort_order=desc&limit=12`, { headers: UA }); if (!r.ok) return null; const o = ((await r.json()).observations || []).filter((x) => x.value !== "." && x.value !== ""); if (!o.length) return null; const v = parseFloat(o[0].value); return { v, chg: o[1] ? v - parseFloat(o[1].value) : null }; } catch { return null; } }
async function dolares() { try { const r = await fetch("https://dolarapi.com/v1/dolares", { headers: UA }); if (!r.ok) return {}; const a = await r.json(); const b = (c) => a.find((x) => x.casa === c)?.venta; return { oficial: b("oficial"), blue: b("blue"), mep: b("bolsa"), ccl: b("contadoconliqui"), cripto: b("cripto") }; } catch { return {}; } }
async function riesgoSerie() { try { const r = await fetch("https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais", { headers: UA }); return r.ok ? await r.json() : []; } catch { return []; } }
async function inflacion() { try { const r = await fetch("https://api.argentinadatos.com/v1/finanzas/indices/inflacion", { headers: UA }); const d = r.ok ? await r.json() : []; return d[d.length - 1]?.valor; } catch { return null; } }

const INTEL_FEEDS = [
  { f: "War on the Rocks", dom: "GEO", url: "https://warontherocks.com/feed/" }, { f: "Foreign Policy", dom: "GEO", url: "https://foreignpolicy.com/feed/" },
  { f: "The Diplomat", dom: "GEO", url: "https://thediplomat.com/feed/" }, { f: "Project Syndicate", dom: "IDEAS", url: "https://www.project-syndicate.org/rss" },
  { f: "NBER", dom: "ECO", url: "https://www.nber.org/rss/new.xml" }, { f: "Import AI", dom: "IA", url: "https://importai.substack.com/feed" },
  { f: "arXiv AI", dom: "IA", url: "http://export.arxiv.org/rss/cs.AI" }, { f: "MIT Tech Review", dom: "TEC", url: "https://www.technologyreview.com/feed/" },
  { f: "Quanta", dom: "CIENCIA", url: "https://www.quantamagazine.org/feed/" },
];
const LEGAL_FEEDS = [
  { f: "Infobae Judiciales", pais: "AR", url: "https://www.infobae.com/arc/outboundfeeds/rss/category/judiciales/?outputType=xml", filtrar: false },
  { f: "Comercio y Justicia", pais: "CBA", url: "https://comercioyjusticia.info/feed/", filtrar: true },
  { f: "Confilegal", pais: "ES", url: "https://confilegal.com/feed/", filtrar: false },
  { f: "Legal Today", pais: "ES", url: "https://www.legaltoday.com/feed/", filtrar: false },
  { f: "Almacén de Derecho", pais: "ES", url: "https://almacendederecho.org/feed", filtrar: false },
];
const reLegal = /(fallo|justicia|tribunal|juez|c[aá]mara|csjn|corte|\bley\b|derecho|causa|sentencia|fiscal|juicio|condena|amparo|constituc|penal|civil|laboral|c[oó]digo)/i;
async function feeds(lista, perItem, filtrarFn) { const p = crearParser(); const r = await Promise.all(lista.map(async (s) => { try { const fe = await p.parseURL(s.url); let it = fe.items || []; if (s.filtrar && filtrarFn) it = it.filter(filtrarFn); return it.slice(0, perItem).map((x) => ({ ...s, t: (x.title || "").trim(), sn: limpiar(x.contentSnippet || x.content || "", 200), link: x.link || "", fecha: x.isoDate || x.pubDate || "" })); } catch { return []; } })); return r.flat().sort((a, b) => new Date(b.fecha) - new Date(a.fecha)); }

const nf = (v, d = 2) => v == null ? "s/d" : new Intl.NumberFormat("es-AR", { maximumFractionDigits: d }).format(v);
const pesos = (v) => v == null ? "s/d" : "$" + nf(v, 0);
function chip(l, val, chg, u = "%") { let d = ""; if (chg != null) { const up = chg > 0; d = `<span class="d ${up ? "up" : chg < 0 ? "dn" : ""}">${up ? "▲" : chg < 0 ? "▼" : ""}${nf(Math.abs(chg), 2)}${u}</span>`; } return `<div class="ind"><div class="l">${esc(l)}</div><div class="v">${esc(val)} ${d}</div></div>`; }
function alertas(o) { const A = []; const { curva, vix, credit, brecha, rpTrend } = o; if (curva?.v != null) curva.v < 0 ? A.push(["DANGER", "Curva 2a/10a INVERTIDA — señal de recesión"]) : A.push(["OK", `Curva 2a/10a normal (+${nf(curva.v, 2)} pp)`]); if (vix?.v != null) { if (vix.v > 25) A.push(["WARN", `Volatilidad ALTA (VIX ${nf(vix.v, 1)})`]); else if (vix.v < 14) A.push(["INFO", `VIX bajo (${nf(vix.v, 1)}) — complacencia`]); } if (credit?.v != null && credit.v > 5) A.push(["WARN", `Credit spreads altos (${nf(credit.v, 2)}%)`]); if (brecha != null) brecha > 20 ? A.push(["WARN", `Brecha ${nf(brecha, 1)}% — presión devaluatoria`]) : A.push(["OK", `Brecha contenida (${nf(brecha, 1)}%)`]); if (rpTrend === "up") A.push(["WARN", "Riesgo país en alza"]); else if (rpTrend === "down") A.push(["OK", "Riesgo país en baja"]); return A; }

// ---------- RENDER: una sola mesa con menú ----------
function render(d) {
  const hora = new Date().toLocaleString("es-AR");
  const rp = d.rpSerie.slice(-60); const rpLast = rp.length ? rp[rp.length - 1].valor : null;
  const datosRP = JSON.stringify({ labels: rp.map((p) => p.fecha), data: rp.map((p) => p.valor) });
  const mem = d.memoria || {};
  const cambiosH = (mem.cambios && mem.cambios.length) ? mem.cambios.map((c) => `<div class="mc"><span class="l">${esc(c.label)}</span><span>${esc(c.de)} → ${esc(c.a)} <span class="d ${c.color}">${c.arrow}${esc(c.delta)}</span></span></div>`).join("") : (mem.prevFecha ? '<div class="dim">Sin cambios desde la última sincronización.</div>' : '<div class="dim">Primera sincronización — la memoria empieza hoy.</div>');
  const bitaH = (mem.bitacora || []).map((b) => `<div class="bita"><span>${esc(b.fecha)}</span><span>RP ${esc(b.riesgo)}</span><span>${esc(b.alertas)} al.</span></div>`).join("");
  const alertasH = d.alertas.map(([n, t]) => `<div class="al ${n}">${esc(t)}</div>`).join("");
  const intelH = d.intelItems.map((x) => `<a class="it" href="${esc(x.link)}" target="_blank" rel="noopener"><span class="dm">${esc(x.dom)}</span><span class="tx">${esc(x.t)}</span></a>`).join("");
  const radarH = (d.radar || []).map((x) => `<a class="it" href="${esc(x.link)}" target="_blank" rel="noopener"><span class="dm">${esc(x.pais)}</span><span class="tx">${esc(x.t)}</span></a>`).join("");
  const sintesisH = (d.sintesis || []).map((s) => `<div class="syn"><div class="syt">${esc(s.tema)}</div><div class="sytx">${esc(s.texto)}</div></div>`).join("");
  const juridicoH = (d.juridico || []).map((s) => `<div class="syn"><div class="syt"><span class="pz">${esc(s.pais || "")}</span> ${esc(s.tema)}</div><div class="sytx">${esc(s.texto)}</div></div>`).join("");
  const mercados = [chip("S&P 500", nf(d.spx?.v, 0), d.spx?.chg), chip("Nasdaq", nf(d.ndx?.v, 0), d.ndx?.chg), chip("VIX", nf(d.vix?.v, 1), d.vix?.chg), chip("Dólar DXY", nf(d.dxy?.v, 2), d.dxy?.chg), chip("Brent", "US$" + nf(d.brent?.v, 1), d.brent?.chg), chip("WTI", "US$" + nf(d.wti?.v, 1), d.wti?.chg), chip("Oro", "US$" + nf(d.oro?.v, 0), d.oro?.chg), chip("Cobre", "US$" + nf(d.cobre?.v, 2), d.cobre?.chg), chip("Bitcoin", "US$" + nf(d.btc?.v, 0), d.btc?.chg), chip("Emergentes", nf(d.eem?.v, 1), d.eem?.chg), chip("Treasury 10a", nf(d.dgs10?.v, 2) + "%", d.dgs10?.chg, "pp"), chip("Curva 2/10", (d.curva?.v >= 0 ? "+" : "") + nf(d.curva?.v, 2) + "pp", d.curva?.chg, "pp"), chip("Credit HY", nf(d.credit?.v, 2) + "%", d.credit?.chg, "pp"), chip("Breakeven", nf(d.breakeven?.v, 2) + "%", d.breakeven?.chg, "pp")].join("");
  const arg = [chip("Dólar oficial", pesos(d.dol.oficial), null), chip("Dólar blue", pesos(d.dol.blue), null), chip("Dólar MEP", pesos(d.dol.mep), null), chip("Contado c/liqui", pesos(d.dol.ccl), null), chip("Brecha", d.brecha != null ? nf(d.brecha, 1) + "%" : "s/d", null), chip("Riesgo país", nf(rpLast, 0), null), chip("Inflación m.", d.inflacion != null ? nf(d.inflacion, 1) + "%" : "s/d", null), chip("Dólar cripto", pesos(d.dol.cripto), null)].join("");
  const resumen = [chip("Riesgo país", nf(rpLast, 0), null), chip("Dólar blue", pesos(d.dol.blue), null), chip("S&P 500", nf(d.spx?.v, 0), d.spx?.chg), chip("VIX", nf(d.vix?.v, 1), d.vix?.chg)].join("");

  const NAV = [["tablero", "▦ Tablero"], ["mercados", "▮ Mercados"], ["argentina", "★ Argentina"], ["radar", "⚖ Radar jurídico"], ["intel", "◎ Intel"], ["expedientes", "▣ Expedientes"], ["crm", "◌ CRM"], ["cuaderno", "✎ Cuaderno"], ["watchlist", "⊕ Watchlist"], ["objetivos", "◈ Objetivos"], ["agenda", "▤ Agenda"], ["buscar", "⌕ Buscar"]];
  const navH = NAV.map((n, i) => `<button class="navb${i === 0 ? " act" : ""}" data-t="${n[0]}">${n[1]}</button>`).join("");

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>PROFUNDUM · La Mesa</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23060705'/><text x='50' y='74' font-size='62' text-anchor='middle' fill='%23b3be71' font-family='monospace' font-weight='bold'>P</text></svg>" />
<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Saira+Stencil+One&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<style>
  :root{ --fondo:#060705; --panel:#0b0c08; --p2:#0f110b; --tinta:#d8dbc8; --muted:#787c62; --oliva:#b3be71; --oliva2:#525c32; --rojo:#c5402f; --ambar:#d8a23a; --linea:#1c1f15; }
  *{ box-sizing:border-box; } body{ margin:0; background:var(--fondo); color:var(--tinta); font-family:'JetBrains Mono',ui-monospace,monospace; font-size:13px; line-height:1.55; }
  .clasif{ background:#54130d; color:#f1e4dd; text-align:center; font-size:11px; font-weight:700; letter-spacing:4px; padding:6px; text-transform:uppercase; }
  .app{ display:grid; grid-template-columns:200px 1fr; min-height:calc(100vh - 28px); }
  .side{ background:#070806; border-right:2px solid var(--oliva2); padding:16px 0; position:sticky; top:0; align-self:start; }
  .side .marca{ font-family:'Saira Stencil One',monospace; font-size:20px; letter-spacing:2px; color:#dfe2cc; text-transform:uppercase; padding:0 16px 12px; }
  .side .reloj{ font-size:10px; color:var(--muted); padding:0 16px 14px; letter-spacing:1px; border-bottom:1px solid var(--linea); margin-bottom:8px; }
  .navb{ display:block; width:100%; text-align:left; background:none; border:none; border-left:3px solid transparent; color:var(--muted); font-family:'JetBrains Mono',monospace; font-size:12.5px; letter-spacing:1px; padding:10px 16px; cursor:pointer; }
  .navb:hover{ color:var(--tinta); } .navb.act{ color:var(--oliva); border-left-color:var(--oliva); background:var(--p2); }
  main{ padding:20px 22px 50px; max-width:1000px; }
  .vista{ display:none; } .vista.act{ display:block; }
  .vh{ font-family:'Saira Stencil One',monospace; font-size:24px; letter-spacing:2px; color:#dfe2cc; text-transform:uppercase; margin:0 0 4px; }
  .vsub{ font-size:11px; color:var(--muted); letter-spacing:1px; text-transform:uppercase; margin-bottom:18px; }
  .panel{ background:var(--panel); border:1px solid var(--linea); border-top:2px solid var(--oliva2); margin-bottom:16px; }
  .ph{ font-size:11px; letter-spacing:2px; text-transform:uppercase; color:var(--oliva); padding:9px 14px; border-bottom:1px solid var(--linea); }
  .pb{ padding:12px 14px; }
  .inds{ display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:1px; background:var(--linea); border:1px solid var(--linea); }
  .ind{ background:var(--panel); padding:8px 10px; } .ind .l{ font-size:9.5px; letter-spacing:.5px; color:var(--muted); text-transform:uppercase; } .ind .v{ font-size:16px; font-weight:700; margin-top:3px; }
  .d{ font-size:11px; } .d.up{ color:var(--oliva); } .d.dn{ color:var(--rojo); }
  .al{ padding:8px 12px; border-left:3px solid var(--oliva2); margin-bottom:7px; font-size:12.5px; } .al.DANGER{ border-color:var(--rojo); color:#f0b8af; } .al.WARN{ border-color:var(--ambar); color:#e8cd92; } .al.INFO{ border-color:var(--oliva); } .al.OK{ border-color:var(--oliva2); color:var(--muted); }
  .it{ display:grid; grid-template-columns:58px 1fr; gap:8px; padding:9px 0; border-bottom:1px solid var(--linea); text-decoration:none; color:var(--tinta); } .it:hover{ color:var(--oliva); } .it .dm{ font-size:9px; color:var(--oliva); border:1px solid var(--oliva2); text-align:center; padding:2px 0; height:fit-content; letter-spacing:1px; } .it .tx{ font-size:12.5px; }
  .lienzo{ position:relative; height:200px; margin-top:10px; }
  .mc{ display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid var(--linea); } .mc .l{ color:var(--muted); } .bita{ display:flex; justify-content:space-between; font-size:11px; color:var(--muted); padding:4px 0; border-bottom:1px solid var(--linea); }
  .dim{ color:var(--muted); }
  .syn{ padding:11px 0; border-bottom:1px solid var(--linea); } .syn:last-child{ border-bottom:none; } .syt{ font-weight:700; color:var(--oliva); font-size:13.5px; margin-bottom:5px; } .sytx{ font-size:13.5px; line-height:1.7; } .pz{ font-size:9px; color:#0b0c08; background:var(--oliva); padding:1px 6px; letter-spacing:1px; }
  .refs .it .tx{ color:var(--muted); } .refs{ opacity:.85; }
  .exp a.dos{ display:block; padding:9px 0; border-bottom:1px solid var(--linea); color:var(--tinta); text-decoration:none; cursor:pointer; } .exp a.dos:hover{ color:var(--oliva); } .exp .sec{ font-size:10px; letter-spacing:2px; color:var(--oliva); text-transform:uppercase; margin:12px 0 4px; } .exp .vac{ color:var(--muted); }
  iframe{ width:100%; height:70vh; border:1px solid var(--oliva2); margin-top:12px; background:#060705; display:none; }
  input,textarea{ width:100%; background:#070806; color:var(--tinta); border:1px solid var(--linea); font-family:'JetBrains Mono',monospace; font-size:13px; padding:8px 10px; } input:focus,textarea:focus{ outline:none; border-color:var(--oliva2); } textarea{ resize:vertical; min-height:54px; line-height:1.6; }
  button.b{ background:var(--oliva2); color:#0b0c08; border:none; padding:8px 14px; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:11px; letter-spacing:1px; text-transform:uppercase; cursor:pointer; } button.b:hover{ background:var(--oliva); } button.ghost{ background:transparent; border:1px solid var(--oliva2); color:var(--oliva); } button.danger{ background:transparent; border:1px solid var(--rojo); color:var(--rojo); }
  .crm{ display:grid; grid-template-columns:280px 1fr; gap:14px; } @media(max-width:820px){ .crm{ grid-template-columns:1fr; } }
  .lista{ list-style:none; margin:0; padding:0; max-height:60vh; overflow:auto; } .lista li{ padding:9px 12px; border-bottom:1px solid var(--linea); cursor:pointer; } .lista li:hover,.lista li.sel{ background:var(--p2); } .lista .n{ font-weight:700; color:#dfe2cc; } .lista .s{ font-size:11px; color:var(--muted); }
  .campo{ margin-bottom:10px; } .campo label{ display:block; font-size:10px; letter-spacing:1.5px; text-transform:uppercase; color:var(--muted); margin-bottom:4px; }
  .btns{ display:flex; gap:8px; flex-wrap:wrap; margin-top:6px; } .brief{ background:var(--p2); border:1px solid var(--oliva2); padding:14px; margin-top:12px; white-space:pre-wrap; font-size:12.5px; line-height:1.7; display:none; } .ok{ color:var(--oliva); font-size:10px; }
  #gate{ position:fixed; inset:0; z-index:60; background:#040503; display:flex; align-items:center; justify-content:center; } .gbox{ width:min(340px,86vw); text-align:center; border:1px solid var(--oliva2); border-top:3px solid var(--oliva2); background:var(--panel); padding:30px 26px; } .gt{ font-family:'Saira Stencil One',monospace; font-size:30px; letter-spacing:4px; color:#dfe2cc; text-transform:uppercase; } .gs{ font-size:10px; letter-spacing:2px; color:var(--oliva); text-transform:uppercase; margin:6px 0 18px; } #gpass{ text-align:center; letter-spacing:3px; } #gbtn{ width:100%; margin-top:12px; } .gerr{ color:var(--rojo); font-size:11px; margin-top:10px; min-height:14px; }
  @media(max-width:720px){ .app{ grid-template-columns:1fr; } .side{ position:static; display:flex; flex-wrap:wrap; gap:4px; border-right:none; border-bottom:2px solid var(--oliva2); } .side .marca,.side .reloj{ width:100%; border:none; } .navb{ width:auto; border-left:none; border-bottom:2px solid transparent; } .navb.act{ border-left:none; border-bottom-color:var(--oliva); } }
</style></head><body>
  <div class="clasif">// PROFUNDUM // LA MESA — USO PERSONAL //</div>
  <div class="app">
    <div class="side">
      <div class="marca">Profundum</div>
      <div class="reloj"><span id="rl">—</span> · <span id="rz">—</span>Z<br/>sync ${esc(hora)}</div>
      ${navH}
    </div>
    <main>
      <section class="vista act" id="v-tablero"><div class="vh">Tablero</div><div class="vsub">El parte del día, de un vistazo</div>
        <div class="panel"><div class="ph">◆ Parte de situación</div><div class="pb"><p style="font-size:13.5px;line-height:1.7">${esc(d.parte || "—")}</p>${d.foco ? `<p style="color:var(--oliva);border-top:1px solid var(--linea);padding-top:10px;margin-top:10px">FOCO DEL DÍA: ${esc(d.foco)}</p>` : ""}</div></div>
        <div class="panel"><div class="ph">⚠ Alertas</div><div class="pb">${alertasH}</div></div>
        <div class="panel"><div class="ph">Resumen</div><div class="pb"><div class="inds">${resumen}</div></div></div>
        <div class="panel"><div class="ph">⟳ Qué cambió ${mem.prevFecha ? "(desde " + esc(mem.prevFecha) + ")" : ""}</div><div class="pb">${cambiosH}</div></div>
      </section>
      <section class="vista" id="v-mercados"><div class="vh">Mercados</div><div class="vsub">Global · Yahoo + FRED</div><div class="panel"><div class="pb"><div class="inds">${mercados}</div></div></div></section>
      <section class="vista" id="v-argentina"><div class="vh">Argentina</div><div class="vsub">dolarapi · argentinadatos</div><div class="panel"><div class="pb"><div class="inds">${arg}</div><div class="lienzo"><canvas id="rpc"></canvas></div></div></div></section>
      <section class="vista" id="v-radar"><div class="vh">Radar jurídico</div><div class="vsub">síntesis · lo que importa</div>
        <div class="panel"><div class="ph">⚖ Síntesis jurídica</div><div class="pb">${juridicoH || '<div class="dim">Sin síntesis disponible.</div>'}</div></div>
        <div class="panel"><div class="ph">Fuentes consultadas (ir a la fuente)</div><div class="pb refs">${radarH}</div></div></section>
      <section class="vista" id="v-intel"><div class="vh">Intel</div><div class="vsub">síntesis · río arriba</div>
        <div class="panel"><div class="ph">◎ Síntesis de inteligencia</div><div class="pb">${sintesisH || '<div class="dim">Sin síntesis disponible.</div>'}</div></div>
        <div class="panel"><div class="ph">Fuentes consultadas (ir a la fuente)</div><div class="pb refs">${intelH}</div></div></section>
      <section class="vista" id="v-expedientes"><div class="vh">Expedientes</div><div class="vsub">carpetas vivas que dominás</div>
        <div class="panel"><div class="ph">▣ Qué es un expediente</div><div class="pb"><div class="dim">Una carpeta VIVA sobre un tema que elegís dominar: acumula análisis, fuentes primarias y tu tesis, y crece con el tiempo. No es "noticias al azar" — es tu conocimiento componiéndose. Abrís uno cuando decidís volverte experto en algo.</div></div></div>
        <div class="panel"><div class="ph">Tus expedientes (1)</div><div class="pb exp">
          <a class="dos" data-src="ia-derecho.html">▸ Regulación de la IA (D-001) — abrir</a>
          <iframe id="dosframe"></iframe>
        </div></div></section>
      <section class="vista" id="v-crm"><div class="vh">CRM</div><div class="vsub">inteligencia de relaciones · privado</div>
        <div class="crm">
          <div class="panel"><div class="ph">◌ Contactos <span id="cnt" class="ok"></span></div><div class="pb"><input id="buscar" placeholder="Buscar…" /><button class="b" style="width:100%;margin-top:8px" id="bNuevo">+ Nueva ficha</button></div><ul class="lista" id="lista"></ul></div>
          <div class="panel"><div class="ph"><span id="dttl">Ficha</span> <span id="dsv" class="ok"></span></div><div class="pb" id="detalle"><div class="dim" style="padding:20px 0">Elegí un contacto o creá una <b>+ Nueva ficha</b>.</div></div></div>
        </div>
      </section>
      <section class="vista" id="v-cuaderno"><div class="vh">Cuaderno</div><div class="vsub">tus ideas · se guardan en tu equipo</div>
        <div class="panel"><div class="ph">✎ Cuaderno de campo <span id="cdsv" class="ok"></span></div><div class="pb">
          <div class="dim" style="margin-bottom:8px">Se guarda en ESTE navegador, en tu equipo (nunca se sube a internet). Para no perderlo si limpiás el navegador, descargá una copia cada tanto.</div>
          <textarea id="cd" style="min-height:200px" placeholder="Tus ideas, conexiones, tesis…"></textarea>
          <div style="margin-top:8px"><button class="b ghost" id="cdDl">Descargar copia</button></div>
        </div></div>
        <div class="panel"><div class="ph">⟳ Bitácora de memoria</div><div class="pb">${bitaH || '<div class="dim">Vacía por ahora.</div>'}</div></div>
      </section>
      <section class="vista" id="v-watchlist"><div class="vh">Watchlist</div><div class="vsub">lo que seguís de cerca</div><div class="panel"><div class="pb"><input id="wli" placeholder="Seguir actor/tema + Enter…" /><ul id="wll" style="list-style:none;margin:10px 0 0;padding:0"></ul></div></div></section>
      <section class="vista" id="v-objetivos"><div class="vh">Objetivos</div><div class="vsub">tus metas y el avance</div><div class="panel"><div class="pb"><input id="obi" placeholder="Nuevo objetivo + Enter…" /><ul id="obl" style="list-style:none;margin:10px 0 0;padding:0"></ul></div></div></section>
      <section class="vista" id="v-agenda"><div class="vh">Agenda</div><div class="vsub">vencimientos · audiencias · hitos</div><div class="panel"><div class="pb"><div style="display:flex;gap:8px;flex-wrap:wrap"><input id="agf" type="date" style="width:auto" /><input id="age" placeholder="Evento…" style="flex:1;min-width:160px" /><button class="b" id="agadd">Agregar</button></div><div id="agl" style="margin-top:12px"></div></div></div></section>
      <section class="vista" id="v-buscar"><div class="vh">Buscar</div><div class="vsub">en todo Profundum: cuaderno, CRM, agenda, objetivos</div><div class="panel"><div class="pb"><input id="bqi" placeholder="Buscar…" /><div id="bqr" style="margin-top:12px"></div></div></div></section>
    </main>
  </div>

  <div id="gate"><div class="gbox"><div class="gt">Profundum</div><div class="gs" id="gmsg">Ingresá tu clave</div><input id="gpass" type="password" placeholder="clave" autocomplete="off" /><button class="b" id="gbtn">Entrar</button><div class="gerr" id="gerr"></div></div></div>

<script>
  function z(n){return String(n).padStart(2,'0');}
  function reloj(){var d=new Date();document.getElementById('rl').textContent=z(d.getHours())+':'+z(d.getMinutes())+':'+z(d.getSeconds());document.getElementById('rz').textContent=z(d.getUTCHours())+':'+z(d.getUTCMinutes());}
  reloj();setInterval(reloj,1000);
  var DR=${datosRP}, chartHecho=false;
  function initChart(){ if(chartHecho||!window.Chart||!DR.data.length)return; chartHecho=true; Chart.defaults.font.family="'JetBrains Mono',monospace";Chart.defaults.color='#787c62'; new Chart(document.getElementById('rpc'),{type:'line',data:{labels:DR.labels,datasets:[{data:DR.data,borderColor:'#c5402f',backgroundColor:'rgba(197,64,47,.12)',fill:true,pointRadius:0,borderWidth:2,tension:.2}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{maxTicksLimit:4},grid:{color:'#1c1f15'}},y:{grid:{color:'#1c1f15'}}}}}); }
  // Navegación
  var btns=document.querySelectorAll('.navb');
  btns.forEach(function(b){ b.onclick=function(){ var t=b.getAttribute('data-t'); document.querySelectorAll('.vista').forEach(function(v){v.classList.remove('act');}); document.getElementById('v-'+t).classList.add('act'); btns.forEach(function(x){x.classList.remove('act');}); b.classList.add('act'); if(t==='argentina')initChart(); }; });
  // Expedientes (iframe)
  document.querySelectorAll('.dos[data-src]').forEach(function(a){ a.onclick=function(){ var f=document.getElementById('dosframe'); f.src=a.getAttribute('data-src'); f.style.display='block'; }; });
  // Cuaderno
  (function(){var el=document.getElementById('cd');try{el.value=localStorage.getItem('profundum_cuaderno')||'';}catch(e){}var t;el.addEventListener('input',function(){try{localStorage.setItem('profundum_cuaderno',el.value);document.getElementById('cdsv').textContent='guardado en tu equipo ✓';clearTimeout(t);t=setTimeout(function(){document.getElementById('cdsv').textContent='';},1400);}catch(e){}});var dl=document.getElementById('cdDl');if(dl){dl.onclick=function(){var b=new Blob([el.value],{type:'text/plain'});var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='cuaderno-profundum.txt';a.click();};}})();
  // CRM
  (function(){ var KEY='profundum_crm'; var CAMPOS=[['conoci','Cómo lo conocí'],['importa','Qué le importa (objetivos, intereses)'],['temas','Temas que hablamos'],['util','Cómo puedo serle útil'],['pendientes','Pendientes / follow-up'],['notas','Notas']];
    var datos=[]; try{datos=JSON.parse(localStorage.getItem('profundum_crm')||'[]');}catch(e){} var sel=null; var $=function(i){return document.getElementById(i);};
    function guardar(){try{localStorage.setItem(KEY,JSON.stringify(datos));}catch(e){}} function cnt(){$('cnt').textContent=datos.length+' fichas';}
    function lista(){ var q=($('buscar').value||'').toLowerCase(); var ul=$('lista'); ul.innerHTML=''; var f=datos.filter(function(p){return !q||(p.nombre||'').toLowerCase().indexOf(q)>=0;}); if(!f.length){var li=document.createElement('li');li.className='dim';li.style.padding='12px';li.textContent=datos.length?'Sin resultados.':'Todavía no cargaste a nadie.';ul.appendChild(li);return;} f.sort(function(a,b){return (a.nombre||'').localeCompare(b.nombre||'');}); f.forEach(function(p){var li=document.createElement('li');if(p.id===sel)li.className='sel';var n=document.createElement('div');n.className='n';n.textContent=p.nombre||'(sin nombre)';var s=document.createElement('div');s.className='s';s.textContent=(p.importa||'').slice(0,52);li.appendChild(n);li.appendChild(s);li.onclick=function(){sel=p.id;render();};ul.appendChild(li);}); }
    function actual(){return datos.filter(function(p){return p.id===sel;})[0];}
    function render(){ lista(); cnt(); var p=actual(); var det=$('detalle'); if(!p){det.innerHTML='<div class="dim" style="padding:20px 0">Elegí un contacto o creá una <b>+ Nueva ficha</b>.</div>';$('dttl').textContent='Ficha';return;} $('dttl').textContent=p.nombre||'Nueva ficha'; var h='<div class="campo"><label>Nombre</label><input id="f_nombre" /></div>'; CAMPOS.forEach(function(c){h+='<div class="campo"><label>'+c[1]+'</label><textarea id="f_'+c[0]+'"></textarea></div>';}); h+='<div class="btns"><button class="b" id="bG">Guardar</button><button class="b ghost" id="bB">Briefing pre-reunión</button><button class="b danger" id="bD">Eliminar</button></div><div class="brief" id="brief"></div>'; det.innerHTML=h; $('f_nombre').value=p.nombre||''; CAMPOS.forEach(function(c){$('f_'+c[0]).value=p[c[0]]||'';});
      $('bG').onclick=function(){p.nombre=$('f_nombre').value.trim();CAMPOS.forEach(function(c){p[c[0]]=$('f_'+c[0]).value.trim();});if(!p.nombre)p.nombre='(sin nombre)';guardar();$('dsv').textContent='guardado ✓';setTimeout(function(){$('dsv').textContent='';},1500);lista();$('dttl').textContent=p.nombre;};
      $('bD').onclick=function(){if(confirm('¿Eliminar a '+(p.nombre||'')+'?')){datos=datos.filter(function(x){return x.id!==p.id;});sel=null;guardar();render();}};
      $('bB').onclick=function(){brief(p);}; }
    function brief(p){ var L=function(t,v){return v?('▸ '+t+': '+v+'\\n'):'';}; var txt='BRIEFING — '+(p.nombre||'')+'\\n────────────────────\\n'+L('Cómo lo conocí',p.conoci)+L('Qué le importa',p.importa)+L('Últimos temas',p.temas)+L('Cómo serle útil',p.util)+L('Pendientes',p.pendientes)+L('Notas',p.notas); var pr='Sos mi asesor estratégico. Ficha de una persona con la que me voy a reunir:\\n\\n'+txt+'\\nDame: 1) resumen, 2) tres formas de aportarle valor, 3) dos temas para abrir, 4) qué evitar.'; var b=$('brief');b.style.display='block';b.textContent=txt+'\\n'; var w=document.createElement('div');w.style.marginTop='10px'; var b1=document.createElement('button');b1.className='b';b1.textContent='Copiar briefing';b1.onclick=function(){try{navigator.clipboard.writeText(txt);}catch(e){}}; var b2=document.createElement('button');b2.className='b ghost';b2.style.marginLeft='8px';b2.textContent='Copiar prompt para IA';b2.onclick=function(){try{navigator.clipboard.writeText(pr);}catch(e){}}; w.appendChild(b1);w.appendChild(b2);b.appendChild(w); }
    $('bNuevo').onclick=function(){var p={id:'p'+Date.now(),nombre:''};datos.push(p);sel=p.id;guardar();render();setTimeout(function(){var n=$('f_nombre');if(n)n.focus();},30);};
    $('buscar').addEventListener('input',lista); render();
  })();
  // Watchlist
  (function(){var K='profundum_watchlist',w=[];try{w=JSON.parse(localStorage.getItem(K)||'[]');}catch(e){}var inp=document.getElementById('wli'),ul=document.getElementById('wll');if(!inp)return;function s(){try{localStorage.setItem(K,JSON.stringify(w));}catch(e){}}function p(){ul.innerHTML='';w.forEach(function(x,i){var li=document.createElement('li');li.style.display='flex';li.style.justifyContent='space-between';li.style.padding='6px 0';li.style.borderBottom='1px solid var(--linea)';var sp=document.createElement('span');sp.textContent='▸ '+x;var b=document.createElement('button');b.className='b danger';b.style.padding='2px 8px';b.textContent='✕';b.onclick=function(){w.splice(i,1);s();p();};li.appendChild(sp);li.appendChild(b);ul.appendChild(li);});}p();inp.addEventListener('keydown',function(e){if(e.key==='Enter'&&this.value.trim()){w.push(this.value.trim());this.value='';s();p();}});})();
  // Objetivos
  (function(){var K='profundum_okr',o=[];try{o=JSON.parse(localStorage.getItem(K)||'[]');}catch(e){}var inp=document.getElementById('obi'),ul=document.getElementById('obl');if(!inp)return;function s(){try{localStorage.setItem(K,JSON.stringify(o));}catch(e){}}function p(){ul.innerHTML='';o.forEach(function(x,i){var li=document.createElement('li');li.style.padding='8px 0';li.style.borderBottom='1px solid var(--linea)';var top=document.createElement('div');top.style.display='flex';top.style.justifyContent='space-between';var sp=document.createElement('span');sp.textContent=x.t;var del=document.createElement('button');del.className='b danger';del.style.padding='2px 8px';del.textContent='✕';del.onclick=function(){o.splice(i,1);s();p();};top.appendChild(sp);top.appendChild(del);var rng=document.createElement('input');rng.type='range';rng.min=0;rng.max=100;rng.value=x.prog||0;rng.style.width='100%';var lbl=document.createElement('span');lbl.style.color='var(--oliva)';lbl.style.fontSize='11px';lbl.textContent=(x.prog||0)+'%';rng.oninput=function(){x.prog=+rng.value;lbl.textContent=x.prog+'%';s();};li.appendChild(top);li.appendChild(rng);li.appendChild(lbl);ul.appendChild(li);});}p();inp.addEventListener('keydown',function(e){if(e.key==='Enter'&&this.value.trim()){o.push({t:this.value.trim(),prog:0});this.value='';s();p();}});})();
  // Agenda
  (function(){var K='profundum_agenda',a=[];try{a=JSON.parse(localStorage.getItem(K)||'[]');}catch(e){}var fi=document.getElementById('agf'),ei=document.getElementById('age'),ul=document.getElementById('agl'),add=document.getElementById('agadd');if(!ul)return;function s(){try{localStorage.setItem(K,JSON.stringify(a));}catch(e){}}function p(){a.sort(function(x,y){return (x.f||'').localeCompare(y.f||'');});ul.innerHTML='';if(!a.length){ul.innerHTML='<div class="dim">Sin eventos. Cargá vencimientos, audiencias, hitos…</div>';return;}a.forEach(function(x,i){var li=document.createElement('div');li.style.display='flex';li.style.justifyContent='space-between';li.style.padding='7px 0';li.style.borderBottom='1px solid var(--linea)';var sp=document.createElement('span');var fe=document.createElement('span');fe.style.color='var(--oliva)';fe.textContent=x.f+'  ';var tx=document.createElement('span');tx.textContent=x.ev;sp.appendChild(fe);sp.appendChild(tx);var del=document.createElement('button');del.className='b danger';del.style.padding='2px 8px';del.textContent='✕';del.onclick=function(){a.splice(i,1);s();p();};li.appendChild(sp);li.appendChild(del);ul.appendChild(li);});}p();add.onclick=function(){if(fi.value&&ei.value.trim()){a.push({f:fi.value,ev:ei.value.trim()});fi.value='';ei.value='';s();p();}};})();
  // Buscar
  (function(){var inp=document.getElementById('bqi'),res=document.getElementById('bqr');if(!inp)return;function go(){var q=(inp.value||'').toLowerCase();res.innerHTML='';if(!q)return;var out=[];try{var cd=localStorage.getItem('profundum_cuaderno')||'';var k=cd.toLowerCase().indexOf(q);if(k>=0)out.push(['Cuaderno',cd.slice(Math.max(0,k-30),k+70)]);}catch(e){}try{var crm=JSON.parse(localStorage.getItem('profundum_crm')||'[]');crm.forEach(function(pp){if(JSON.stringify(pp).toLowerCase().indexOf(q)>=0)out.push(['CRM · '+(pp.nombre||''),(pp.importa||pp.notas||'')]);});}catch(e){}try{var ag=JSON.parse(localStorage.getItem('profundum_agenda')||'[]');ag.forEach(function(x){if((x.ev||'').toLowerCase().indexOf(q)>=0)out.push(['Agenda · '+x.f,x.ev]);});}catch(e){}try{var ok=JSON.parse(localStorage.getItem('profundum_okr')||'[]');ok.forEach(function(x){if((x.t||'').toLowerCase().indexOf(q)>=0)out.push(['Objetivo',x.t]);});}catch(e){}if(!out.length){res.innerHTML='<div class="dim">Sin resultados.</div>';return;}out.forEach(function(o){var d=document.createElement('div');d.style.padding='8px 0';d.style.borderBottom='1px solid var(--linea)';var t=document.createElement('div');t.style.color='var(--oliva)';t.style.fontSize='11px';t.textContent=o[0];var x=document.createElement('div');x.textContent=(o[1]||'').slice(0,120);d.appendChild(t);d.appendChild(x);res.appendChild(d);});}inp.addEventListener('input',go);})();
  // Gate
  (function(){var K='profundum_pass';function h(s){var x=0;for(var i=0;i<s.length;i++){x=(x*31+s.charCodeAt(i))|0;}return ''+x;}var g=document.getElementById('gate'),inp=document.getElementById('gpass'),b=document.getElementById('gbtn'),er=document.getElementById('gerr'),m=document.getElementById('gmsg'),st=null;try{st=localStorage.getItem(K);}catch(e){}if(!st){m.textContent='Creá tu clave de acceso';b.textContent='Crear';}function go(){var v=inp.value;if(!v)return;if(!st){try{localStorage.setItem(K,h(v));}catch(e){}g.style.display='none';return;}if(h(v)===st){g.style.display='none';}else{er.textContent='Clave incorrecta';inp.value='';}}b.onclick=go;inp.addEventListener('keydown',function(e){if(e.key==='Enter')go();});setTimeout(function(){inp.focus();},60);})();
</script>
</body></html>`;
}

async function main() {
  console.log("1) Bajando data en vivo...");
  const [dxy, vix, spx, ndx, eem, brent, wti, cobre, oro, btc, curva, credit, breakeven, dgs10, dol, rpSerie, inflacionV, intelItems, radarItems] = await Promise.all([
    yahoo("DX-Y.NYB"), yahoo("^VIX"), yahoo("^GSPC"), yahoo("^IXIC"), yahoo("EEM"), yahoo("BZ=F"), yahoo("CL=F"), yahoo("HG=F"), yahoo("GC=F"), yahoo("BTC-USD"),
    fred("T10Y2Y"), fred("BAMLH0A0HYM2"), fred("T10YIE"), fred("DGS10"), dolares(), riesgoSerie(), inflacion(),
    feeds(INTEL_FEEDS, 2).then((a) => a.slice(0, 14)), feeds(LEGAL_FEEDS, 3, (it) => reLegal.test(((it.title || "") + " " + (it.contentSnippet || "")).toLowerCase())).then((a) => a.slice(0, 11)),
  ]);
  const brecha = dol.ccl && dol.oficial ? (dol.ccl / dol.oficial - 1) * 100 : null;
  let rpTrend = null; if (rpSerie.length > 6) { const a = rpSerie[rpSerie.length - 1].valor, b = rpSerie[rpSerie.length - 6].valor; rpTrend = a > b ? "up" : a < b ? "down" : null; }
  const al = alertas({ curva, vix, credit, brecha, rpTrend });

  const dirP = join(CARPETA, "profundum");
  const memoria = leerMemoria(dirP);
  const rpUlt = rpSerie.length ? rpSerie[rpSerie.length - 1].valor : null;
  const snap = { ts: new Date().toISOString(), fecha: new Date().toLocaleDateString("es-AR"), riesgo: rpUlt, brecha: brecha != null ? +brecha.toFixed(1) : null, vix: vix?.v != null ? +vix.v.toFixed(1) : null, spx: spx?.v != null ? Math.round(spx.v) : null, alertas: al.length };
  const prevSnap = memoria.length ? memoria[memoria.length - 1] : null;
  const camb = (label, de, a, bsb) => { if (de == null || a == null || de === a) return null; const sube = a - de > 0; const bueno = bsb ? !sube : sube; return { label, de: String(de), a: String(a), delta: (sube ? "+" : "") + (Math.round((a - de) * 10) / 10), arrow: sube ? "▲" : "▼", color: bueno ? "up" : "dn" }; };
  const cambios = prevSnap ? [camb("Riesgo país", prevSnap.riesgo, snap.riesgo, true), camb("Brecha %", prevSnap.brecha, snap.brecha, true), camb("VIX", prevSnap.vix, snap.vix, true), camb("S&P 500", prevSnap.spx, snap.spx, false)].filter(Boolean) : [];
  const nuevaMem = [...memoria, snap];
  const bitacora = nuevaMem.slice(-6).reverse().map((s) => ({ fecha: s.fecha, riesgo: s.riesgo != null ? nf(s.riesgo, 0) : "s/d", alertas: s.alertas ?? 0 }));
  guardarMemoria(dirP, nuevaMem);

  console.log("2) El analista (IA) SINTETIZA la inteligencia (no lista)...");
  let parte = "", foco = "", sintesis = [], juridico = [];
  try {
    const items = intelItems.map((x) => `[${x.dom}] ${x.t} — ${x.sn}`).join("\n");
    const r = await llamarGemini(`Sos el analista jefe de un estratega de élite. NO listes noticias: SINTETIZÁ y ORGANIZÁ. Con estos despachos de fuentes de élite, devolvé inteligencia DESTILADA, en español de Argentina.
Mercado: S&P ${nf(spx?.v, 0)} (${nf(spx?.chg, 1)}%), VIX ${nf(vix?.v, 1)}, Curva2/10 ${nf(curva?.v, 2)}pp, Riesgo país ${nf(rpUlt, 0)}, Brecha ${nf(brecha, 1)}%, Inflación ${nf(inflacionV, 1)}%.
Despachos:
${items}
Devolvé SOLO este JSON:
{ "parte": "<parte de situación, 3-4 oraciones que conecten lo global con Argentina>", "foco": "<foco del día, 1 oración>", "sintesis": [ { "tema": "<título corto>", "texto": "<2-3 oraciones: qué pasa y POR QUÉ IMPORTA, fusionando varias fuentes; sin links>" } ] }
"sintesis": SOLO los 3 o 4 temas MÁS importantes. Nada de relleno.`);
    parte = r.parte || ""; foco = r.foco || ""; sintesis = r.sintesis || [];
  } catch (e) { parte = "(No disponible: " + e.message + ")"; }
  try {
    const litems = radarItems.map((x) => `[${x.pais}] ${x.t} — ${x.sn}`).join("\n");
    const r2 = await llamarGemini(`Sos un analista jurídico para un abogado. NO listes fallos: SINTETIZÁ lo que IMPORTA, en español. Con estos despachos jurídicos devolvé SOLO:
{ "juridico": [ { "tema": "<título corto>", "texto": "<2-3 oraciones: qué se decidió/debate y por qué importa para un abogado>", "pais": "AR|ES|Global" } ] }
SOLO 2 o 3 temas, los más relevantes.
Despachos:
${litems}`);
    juridico = r2.juridico || [];
  } catch (e) { juridico = []; }

  console.log("3) Ensamblando la mesa...");
  const html = render({ dxy, vix, spx, ndx, eem, brent, wti, cobre, oro, btc, curva, credit, breakeven, dgs10, dol, brecha, rpSerie, inflacion: inflacionV, intelItems, radar: radarItems, sintesis, juridico, alertas: al, parte, foco, memoria: { cambios, bitacora, prevFecha: prevSnap?.fecha } });
  mkdirSync(dirP, { recursive: true });
  writeFileSync(join(dirP, "consola.html"), html, "utf8");
  console.log("\nLISTO. La Mesa (unificada, con menú, PRIVADA) en: " + join(dirP, "consola.html"));
}
main().catch((e) => { console.error("Falló:", e.message); process.exitCode = 1; });
