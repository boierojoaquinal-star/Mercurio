// Prueba la API key de FRED trayendo los indicadores de EE.UU.
const key = process.env.FRED_API_KEY;
if (!key) {
  console.error("No encontré FRED_API_KEY en el .env.");
  process.exit(1);
}

async function serie(id) {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${key}&file_type=json&sort_order=desc&limit=12`;
  try {
    const r = await fetch(url);
    if (!r.ok) return { ok: false, status: `HTTP ${r.status}`, body: (await r.text()).slice(0, 160) };
    const j = await r.json();
    const obs = (j.observations || []).filter((o) => o.value !== "." && o.value !== "");
    if (!obs.length) return { ok: false, status: "sin datos" };
    const v = parseFloat(obs[0].value);
    const chg = obs[1] ? v - parseFloat(obs[1].value) : null;
    return { ok: true, fecha: obs[0].date, valor: v, chg };
  } catch (e) {
    return { ok: false, status: e.message };
  }
}

const series = [
  ["Curva 2y/10y (T10Y2Y)", "T10Y2Y"],
  ["Credit spreads HY (BAMLH0A0HYM2)", "BAMLH0A0HYM2"],
  ["Breakeven inflación 10y (T10YIE)", "T10YIE"],
  ["Treasury 2y (DGS2)", "DGS2"],
  ["Treasury 10y (DGS10)", "DGS10"],
];

for (const [n, id] of series) {
  const r = await serie(id);
  console.log(
    r.ok
      ? `OK    ${n.padEnd(34)} ${r.valor}   cambio ${r.chg != null ? (r.chg >= 0 ? "+" : "") + r.chg.toFixed(2) : "s/d"}   (${r.fecha})`
      : `FALLA ${n.padEnd(34)} ${r.status} ${r.body || ""}`
  );
}
