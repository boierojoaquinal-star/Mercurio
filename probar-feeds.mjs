// Prueba una lista de feeds RSS y dice cuales funcionan y cuales traen foto.
import Parser from "rss-parser";

const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "Mozilla/5.0 (diario-personal)" },
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
    ],
  },
});

// Candidatos para la seccion Cordoba / Argentina.
const feeds = [
  ["La Voz del Interior", "https://www.lavoz.com.ar/arc/outboundfeeds/rss/?outputType=xml"],
  ["Cadena 3", "https://www.cadena3.com/rss/"],
  ["El Doce", "https://eldoce.tv/rss"],
  ["Infobae", "https://www.infobae.com/arc/outboundfeeds/rss/?outputType=xml"],
  ["Pagina 12", "https://www.pagina12.com.ar/rss/portada"],
  ["Clarin ultimo", "https://www.clarin.com/rss/lo-ultimo/"],
  ["La Nacion", "https://www.lanacion.com.ar/arc/outboundfeeds/rss/?outputType=xml"],
];

function getImage(item) {
  if (item.enclosure?.url) return item.enclosure.url;
  const mc = item.mediaContent?.[0]?.$?.url;
  if (mc) return mc;
  const mt = item.mediaThumbnail?.[0]?.$?.url;
  if (mt) return mt;
  const html = item["content:encoded"] || item.content || "";
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (m) return m[1];
  return null;
}

for (const [nombre, url] of feeds) {
  try {
    const feed = await parser.parseURL(url);
    const items = feed.items || [];
    const conImg = items.filter((i) => getImage(i)).length;
    console.log(`OK     ${nombre}  ->  ${items.length} noticias, ${conImg} con foto`);
    const primera = items[0];
    if (primera) {
      console.log(`         ejemplo: "${(primera.title || "").slice(0, 65)}"`);
      console.log(`         foto:    ${getImage(primera) || "(ninguna)"}`);
    }
  } catch (e) {
    console.log(`FALLA  ${nombre}  ->  ${e.message}`);
  }
}
