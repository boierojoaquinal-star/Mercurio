// Segundo intento: recuperar los pesos pesados que cayeron, con otras direcciones.
import Parser from "rss-parser";
const parser = new Parser({
  timeout: 20000,
  headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36" },
});

const feeds = [
  ["CFR (a)", "https://www.cfr.org/rss/everything.xml"],
  ["CFR (b)", "https://www.cfr.org/rss/expert_briefs.xml"],
  ["VoxEU (a)", "https://voxeu.org/feeds/recent.rss"],
  ["VoxEU (b)", "https://cepr.org/rss/voxeu"],
  ["BIS (a)", "https://www.bis.org/list/all_rss/rss.xml"],
  ["BIS research (b)", "https://www.bis.org/list/wppublications/index.rss"],
  ["IMF News", "https://www.imf.org/en/News/RSS?language=eng"],
  ["Carnegie (a)", "https://carnegieendowment.org/feed"],
  ["Lawfare (a)", "https://www.lawfaremedia.org/rss.xml"],
  ["Brookings (research)", "https://www.brookings.edu/articles/feed/"],
  ["Foreign Policy", "https://foreignpolicy.com/feed/"],
  ["The Diplomat", "https://thediplomat.com/feed/"],
];

for (const [nombre, url] of feeds) {
  try {
    const feed = await parser.parseURL(url);
    const items = feed.items || [];
    console.log(`\nOK    ${nombre}  ->  ${items.length} items`);
    for (const it of items.slice(0, 2)) console.log(`        · ${(it.title || "").slice(0, 80)}`);
  } catch (e) {
    console.log(`\nFALLA ${nombre}  ->  ${e.message}`);
  }
}
