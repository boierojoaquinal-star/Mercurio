// Prueba feeds de ARTE Y CULTURA (Argentina + internacional).
import Parser from "rss-parser";

const parser = new Parser({
  timeout: 20000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  },
});

const feeds = [
  ["AR · La Nación Cultura", "https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/cultura/?outputType=xml"],
  ["AR · Clarín Cultura (Ñ)", "https://www.clarin.com/rss/cultura/"],
  ["AR · Infobae Cultura", "https://www.infobae.com/arc/outboundfeeds/rss/category/cultura/?outputType=xml"],
  ["AR · La Voz (VOS)", "https://www.lavoz.com.ar/rss/vos/"],
  ["AR · Página12 Cultura", "https://www.pagina12.com.ar/rss/suplementos/radar/notas"],
  ["INT · The Art Newspaper", "https://www.theartnewspaper.com/rss.xml"],
  ["INT · Hyperallergic", "https://hyperallergic.com/feed/"],
  ["ES · El País Cultura", "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/cultura/portada"],
];

for (const [nombre, url] of feeds) {
  try {
    const feed = await parser.parseURL(url);
    const items = feed.items || [];
    console.log(`\nOK    ${nombre}  ->  ${items.length} notas`);
    for (const it of items.slice(0, 4)) console.log(`        · ${(it.title || "").slice(0, 80)}`);
  } catch (e) {
    console.log(`\nFALLA ${nombre}  ->  ${e.message}`);
  }
}
