// Segunda ronda: buscar la direccion correcta de La Voz, Pagina12, El Doce, Cadena3.
import Parser from "rss-parser";

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  },
});

const feeds = [
  ["La Voz lo-ultimo", "https://www.lavoz.com.ar/rss/lo-ultimo/"],
  ["La Voz rss raiz", "https://www.lavoz.com.ar/rss/"],
  ["La Voz ciudadanos", "https://www.lavoz.com.ar/rss/ciudadanos/"],
  ["La Voz arc cat", "https://www.lavoz.com.ar/arc/outboundfeeds/rss/category/ciudadanos/?outputType=xml"],
  ["La Voz feeds", "https://www.lavoz.com.ar/feeds/rss/"],
  ["Pagina12 portada", "https://www.pagina12.com.ar/rss/portada"],
  ["Pagina12 elpais", "https://www.pagina12.com.ar/rss/secciones/el-pais/notas"],
  ["El Doce feed", "https://eldoce.tv/feed"],
  ["Cadena3 noticias", "https://www.cadena3.com/rss/nuevo/noticias.asp"],
];

for (const [nombre, url] of feeds) {
  try {
    const feed = await parser.parseURL(url);
    const items = feed.items || [];
    console.log(`OK     ${nombre}  ->  ${items.length} noticias`);
    if (items[0]) console.log(`         ejemplo: "${(items[0].title || "").slice(0, 60)}"`);
  } catch (e) {
    console.log(`FALLA  ${nombre}  ->  ${e.message}`);
  }
}
