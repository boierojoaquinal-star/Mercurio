// Diagnóstico: ¿corrieron las automatizaciones? ¿qué fecha tiene la web publicada?
const UA = { "User-Agent": "diag", Accept: "application/vnd.github+json" };

const r = await fetch("https://api.github.com/repos/boierojoaquinal-star/Mercurio/actions/runs?per_page=10", { headers: UA });
console.log("=== Corridas de GitHub Actions (status API " + r.status + ") ===");
if (r.ok) {
  const j = await r.json();
  for (const w of j.workflow_runs || []) {
    console.log(`${w.created_at}  evento=${w.event}  estado=${w.status}  resultado=${w.conclusion}`);
  }
  if (!(j.workflow_runs || []).length) console.log("(no hay corridas registradas)");
} else {
  console.log(await r.text());
}

const s = await fetch("https://boierojoaquinal-star.github.io/Mercurio/?cb=" + Date.now(), { headers: { "User-Agent": "diag" } });
console.log("\n=== Web publicada (HTTP " + s.status + ") ===");
const t = await s.text();
const fechas = [...new Set([...t.matchAll(/(\d{1,2} de [a-záéíóúA-ZÁÉÍÓÚ]+ de \d{4})/g)].map((x) => x[1]))];
console.log("fechas que muestra:", fechas.slice(0, 4).join("  /  ") || "(no encontré fecha)");
console.log("edición:", (t.match(/Edición de la (mañana|noche)/) || [])[1] || "?");
