// Prueba las fuentes de datos GRATIS para el panel de Economía.
async function get(url) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 diario" } });
    if (!r.ok) return { ok: false, status: r.status };
    return { ok: true, data: await r.json() };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// 1) DÓLARES
const dolares = await get("https://dolarapi.com/v1/dolares");
if (dolares.ok) {
  console.log("OK  Dólares (dolarapi.com):");
  for (const d of dolares.data) {
    console.log(`      ${d.nombre.padEnd(18)} compra ${d.compra}  venta ${d.venta}`);
  }
} else {
  console.log("FALLA Dólares:", dolares.status || dolares.error);
}

// 2) RIESGO PAÍS
const riesgo = await get("https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais/ultimo");
if (riesgo.ok) {
  console.log(`\nOK  Riesgo país (argentinadatos): ${riesgo.data.valor} puntos (al ${riesgo.data.fecha})`);
} else {
  console.log("\nFALLA Riesgo país:", riesgo.status || riesgo.error);
}

// 3) INFLACIÓN
const infl = await get("https://api.argentinadatos.com/v1/finanzas/indices/inflacion");
if (infl.ok && Array.isArray(infl.data) && infl.data.length) {
  const u = infl.data[infl.data.length - 1];
  console.log(`OK  Inflación mensual (argentinadatos): ${u.valor}% (${u.fecha})`);
} else {
  console.log("FALLA Inflación:", infl.status || infl.error);
}
