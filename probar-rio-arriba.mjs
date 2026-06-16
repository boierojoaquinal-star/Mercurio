// Caza de FUENTES RÍO ARRIBA (élite / primarias) gratis y con RSS, para Profundum.
import Parser from "rss-parser";

const parser = new Parser({
  timeout: 20000,
  headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36" },
});

const feeds = [
  // --- Geopolítica / seguridad / política-derecho ---
  ["GEO · War on the Rocks", "https://warontherocks.com/feed/"],
  ["GEO · Lawfare", "https://www.lawfaremedia.org/feed/"],
  ["GEO · Carnegie Endowment", "https://carnegieendowment.org/feeds/rss/"],
  ["GEO · CFR", "https://www.cfr.org/rss.xml"],
  ["GEO · Project Syndicate", "https://www.project-syndicate.org/rss"],
  ["GEO · Brookings", "https://www.brookings.edu/feed/"],
  // --- Economía ---
  ["ECO · IMF Blog", "https://www.imf.org/en/Blogs/rss"],
  ["ECO · NBER working papers", "https://www.nber.org/rss/new.xml"],
  ["ECO · VoxEU (CEPR)", "https://cepr.org/rss/voxeu.xml"],
  ["ECO · BIS research", "https://www.bis.org/doclist/all_rss.rss"],
  // --- Tecnología / IA ---
  ["TEC · arXiv cs.AI", "http://export.arxiv.org/rss/cs.AI"],
  ["TEC · MIT Tech Review", "https://www.technologyreview.com/feed/"],
  ["TEC · Import AI", "https://importai.substack.com/feed"],
  ["TEC · OpenAI blog", "https://openai.com/blog/rss.xml"],
  // --- Ciencia / ideas ---
  ["IDEA · Quanta", "https://www.quantamagazine.org/feed/"],
  ["IDEA · Aeon", "https://aeon.co/feed.rss"],
  // --- Argentina alta señal ---
  ["AR · Cenital", "https://cenital.com/feed/"],
];

for (const [nombre, url] of feeds) {
  try {
    const feed = await parser.parseURL(url);
    const items = feed.items || [];
    console.log(`\nOK    ${nombre}  ->  ${items.length} items`);
    for (const it of items.slice(0, 3)) console.log(`        · ${(it.title || "").slice(0, 82)}`);
  } catch (e) {
    console.log(`\nFALLA ${nombre}  ->  ${e.message}`);
  }
}
