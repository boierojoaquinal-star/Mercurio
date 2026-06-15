// Prueba feeds JURIDICOS (España + Argentina): medios legales y blogs de doctrina.
import Parser from "rss-parser";

const parser = new Parser({
  timeout: 20000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  },
});

const feeds = [
  // --- España: medios y doctrina ---
  ["ES · Confilegal", "https://confilegal.com/feed/"],
  ["ES · Hay Derecho", "https://hayderecho.expansion.com/feed/"],
  ["ES · Almacén de Derecho (doctrina)", "https://almacendederecho.org/feed"],
  ["ES · El Derecho (Lefebvre)", "https://elderecho.com/feed"],
  ["ES · Legal Today", "https://www.legaltoday.com/feed/"],
  ["ES · Economist & Jurist", "https://www.economistjurist.es/feed/"],
  // --- Argentina: medios y doctrina ---
  ["AR · Diario Judicial", "https://www.diariojudicial.com/feed"],
  ["AR · Comercio y Justicia (Cba)", "https://comercioyjusticia.info/feed/"],
  ["AR · Palabras del Derecho", "https://palabrasdelderecho.com.ar/feed/"],
  ["AR · Pensamiento Penal", "https://www.pensamientopenal.com.ar/feed/"],
  ["AR · Infobae judiciales", "https://www.infobae.com/arc/outboundfeeds/rss/category/judiciales/?outputType=xml"],
  ["AR · La Nación seguridad", "https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/seguridad/?outputType=xml"],
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
