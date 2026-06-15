// ============================================================================
//  COMUN.MJS  ->  Caja de herramientas compartida por todas las secciones.
//  (cargar la llave, leer RSS, limpiar texto, llamar a Gemini, etc.)
// ============================================================================
import Parser from "rss-parser";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Cargar la llave desde .env (si existe) ---------------------------------
const envPath = join(__dirname, ".env");
if (existsSync(envPath)) {
  for (const linea of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

export const API_KEY = process.env.GEMINI_API_KEY;
export const MODELO = "gemini-3.5-flash";
export const CARPETA = __dirname;

export function crearParser() {
  return new Parser({
    timeout: 20000,
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
}

export function sacarImagen(item) {
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

export function limpiar(texto = "", max = 320) {
  const sinHtml = texto.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return sinHtml.length > max ? sinHtml.slice(0, max) + "…" : sinHtml;
}

export function esc(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Toma el PRIMER objeto JSON { ... } completo, ignorando texto extra.
export function extraerJson(texto) {
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

// Llama a Gemini y devuelve el JSON ya parseado.
export async function llamarGemini(prompt) {
  if (!API_KEY) throw new Error("Falta la llave GEMINI_API_KEY.");
  const cuerpo = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.5,
      maxOutputTokens: 16384,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
  // Si el modelo principal está sobrecargado (503), reintenta y luego prueba alternativos.
  const modelos = [MODELO, "gemini-2.5-flash", "gemini-2.0-flash"];
  let resp, txt, ok = false;
  for (const modelo of modelos) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;
    for (let intento = 1; intento <= 3; intento++) {
      resp = await fetch(url, {
        method: "POST",
        headers: { "x-goog-api-key": API_KEY, "Content-Type": "application/json" },
        body: cuerpo,
      });
      txt = await resp.text();
      if (resp.ok) { ok = true; break; }
      if ((resp.status === 503 || resp.status === 429) && intento < 3) {
        console.log(`   (Gemini ocupado [${modelo}], reintento ${intento}/2...)`);
        await new Promise((r) => setTimeout(r, intento * 3000));
        continue;
      }
      break;
    }
    if (ok) break;
    if (modelo !== modelos[modelos.length - 1]) console.log(`   (probando modelo alternativo...)`);
  }
  if (!ok) throw new Error(`Gemini respondió HTTP ${resp?.status}: ${(txt || "").slice(0, 300)}`);
  const data = JSON.parse(txt);
  const cand = data?.candidates?.[0];
  const salida = (cand?.content?.parts || []).map((p) => p?.text || "").join("");
  if (!salida) throw new Error(`La IA no devolvió texto (motivo: ${cand?.finishReason || "?"}).`);
  return JSON.parse(extraerJson(salida));
}
