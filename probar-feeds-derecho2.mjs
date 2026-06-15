// Reintento: recuperar fuentes de DOCTRINA / jurisprudencia ARGENTINA.
import Parser from "rss-parser";

const parser = new Parser({
  timeout: 20000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  },
});

const feeds = [
  ["Palabras del Derecho (a)", "https://palabrasdelderecho.com.ar/feed"],
  ["Palabras del Derecho (b)", "https://www.palabrasdelderecho.com.ar/feed/"],
  ["Pensamiento Penal (rss)", "https://www.pensamientopenal.com.ar/rss"],
  ["Diario Judicial (rss)", "https://www.diariojudicial.com/rss"],
  ["Diario Judicial (feed/)", "https://www.diariojudicial.com/feed/"],
  ["Comercio y Justicia · judiciales", "https://comercioyjusticia.info/judiciales/feed/"],
  ["Comercio y Justicia · profesionales", "https://comercioyjusticia.info/profesionales/feed/"],
  ["SAIJ novedades", "http://www.saij.gob.ar/rss-novedades.xml"],
  ["Todo Sobre la Corte", "https://www.todosobrelacorte.com/feed/"],
];

for (const [nombre, url] of feeds) {
  try {
    const feed = await parser.parseURL(url);
    const items = feed.items || [];
    console.log(`\nOK    ${nombre}  ->  ${items.length} notas`);
    for (const it of items.slice(0, 4)) {
      console.log(`        · ${(it.title || "").slice(0, 85)}`);
    }
  } catch (e) {
    console.log(`\nFALLA ${nombre}  ->  ${e.message}`);
  }
}
