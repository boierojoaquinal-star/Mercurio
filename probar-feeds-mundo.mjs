// Prueba feeds INTERNACIONALES para la sección Mundo ("Atlas").
import Parser from "rss-parser";

const parser = new Parser({
  timeout: 20000,
  headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36" },
  customFields: { item: [["media:content", "mediaContent", { keepArray: true }], ["media:thumbnail", "mediaThumbnail", { keepArray: true }]] },
});

function tieneImg(it) {
  return !!(it.enclosure?.url || it.mediaContent?.[0]?.$?.url || it.mediaThumbnail?.[0]?.$?.url || /<img[^>]+src=/i.test(it["content:encoded"] || it.content || ""));
}

const feeds = [
  ["BBC Mundo", "https://feeds.bbci.co.uk/mundo/rss.xml"],
  ["El País Internacional", "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/internacional/portada"],
  ["France 24 (es)", "https://www.france24.com/es/rss"],
  ["Deutsche Welle (es)", "https://rss.dw.com/rdf/rss-sp-all"],
  ["Clarín Mundo", "https://www.clarin.com/rss/mundo/"],
  ["La Nación El Mundo", "https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/el-mundo/?outputType=xml"],
  ["Infobae América", "https://www.infobae.com/arc/outboundfeeds/rss/category/america/?outputType=xml"],
  ["The Guardian World", "https://www.theguardian.com/world/rss"],
];

for (const [nombre, url] of feeds) {
  try {
    const feed = await parser.parseURL(url);
    const items = feed.items || [];
    const conImg = items.filter(tieneImg).length;
    console.log(`\nOK    ${nombre}  ->  ${items.length} notas, ${conImg} con foto`);
    for (const it of items.slice(0, 3)) console.log(`        · ${(it.title || "").slice(0, 80)}`);
  } catch (e) {
    console.log(`\nFALLA ${nombre}  ->  ${e.message}`);
  }
}
