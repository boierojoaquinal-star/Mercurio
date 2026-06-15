// Tercera ronda: probar feeds de NOTICIAS DURAS (politica, economia, mundo).
// Imprime los primeros titulos de cada feed para juzgar la calidad.
import Parser from "rss-parser";

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  },
});

const feeds = [
  ["La Voz política", "https://www.lavoz.com.ar/rss/politica/"],
  ["La Voz sucesos", "https://www.lavoz.com.ar/rss/sucesos/"],
  ["La Voz negocios", "https://www.lavoz.com.ar/rss/negocios/"],
  ["La Voz mundo", "https://www.lavoz.com.ar/rss/mundo/"],
  ["Clarín política", "https://www.clarin.com/rss/politica/"],
  ["Clarín economía", "https://www.clarin.com/rss/economia/"],
  ["Clarín mundo", "https://www.clarin.com/rss/mundo/"],
  ["LaNación política", "https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/politica/?outputType=xml"],
  ["LaNación economía", "https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/economia/?outputType=xml"],
  ["Infobae política", "https://www.infobae.com/arc/outboundfeeds/rss/category/politica/?outputType=xml"],
  ["Infobae economía", "https://www.infobae.com/arc/outboundfeeds/rss/category/economia/?outputType=xml"],
];

for (const [nombre, url] of feeds) {
  try {
    const feed = await parser.parseURL(url);
    const items = feed.items || [];
    console.log(`\nOK   ${nombre}  ->  ${items.length} noticias`);
    for (const it of items.slice(0, 4)) {
      console.log(`       · ${(it.title || "").slice(0, 80)}`);
    }
  } catch (e) {
    console.log(`\nFALLA ${nombre}  ->  ${e.message}`);
  }
}
