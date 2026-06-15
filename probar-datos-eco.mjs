// Verifica qué datos económicos se pueden traer GRATIS (mercado global + BCRA).
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36" };

// --- Yahoo Finance (gratis, sin clave): precio + variación del día ---
async function yahoo(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  try {
    const r = await fetch(url, { headers: UA });
    if (!r.ok) return { ok: false, status: r.status };
    const j = await r.json();
    const m = j?.chart?.result?.[0]?.meta;
    if (!m || m.regularMarketPrice == null) return { ok: false, status: "sin datos" };
    const price = m.regularMarketPrice;
    const prev = m.chartPreviousClose ?? m.previousClose;
    const chg = prev ? ((price - prev) / prev) * 100 : null;
    return { ok: true, price, chg };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

const symbols = [
  ["DXY (índice dólar)", "DX-Y.NYB"],
  ["VIX (miedo)", "^VIX"],
  ["S&P 500", "^GSPC"],
  ["Treasury 10y", "^TNX"],
  ["Treasury 5y", "^FVX"],
  ["Brent", "BZ=F"],
  ["WTI", "CL=F"],
  ["Cobre", "HG=F"],
  ["Oro", "GC=F"],
  ["MSCI EM (ETF EEM)", "EEM"],
];

console.log("== Yahoo Finance (mercado global) ==");
for (const [n, s] of symbols) {
  const r = await yahoo(s);
  console.log(
    r.ok
      ? `OK    ${n.padEnd(20)} ${String(r.price).padEnd(10)} ${r.chg != null ? (r.chg >= 0 ? "+" : "") + r.chg.toFixed(2) + "%" : "s/d"}`
      : `FALLA ${n.padEnd(20)} ${r.status || r.error}`
  );
}

// --- BCRA (gratis, sin clave) ---
console.log("\n== BCRA ==");
for (const v of ["v3.0/monetarias", "v2.0/principalesvariables"]) {
  try {
    const r = await fetch(`https://api.bcra.gob.ar/estadisticas/${v}`, { headers: UA });
    if (r.ok) {
      const j = await r.json();
      const arr = j.results || [];
      console.log(`OK    BCRA ${v}: ${arr.length} variables`);
      for (const x of arr.slice(0, 3)) console.log(`        · ${(x.descripcion || "").slice(0, 55)} = ${x.valor}`);
    } else {
      console.log(`FALLA BCRA ${v}: HTTP ${r.status}`);
    }
  } catch (e) {
    console.log(`FALLA BCRA ${v}: ${e.message}`);
  }
}
