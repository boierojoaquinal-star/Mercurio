// Prueba traer IMÁGENES y datos de Wikipedia (gratis, sin clave) para obras/álbumes/películas.
async function wiki(query, lang = "es") {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages|extracts&piprop=original|thumbnail&pithumbsize=700&exintro=1&explaintext=1&redirects=1&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1`;
  try {
    const r = await fetch(url, { headers: { "User-Agent": "DiarioPersonal/1.0 (uso personal)" } });
    if (!r.ok) return { ok: false, status: `HTTP ${r.status}` };
    const pages = (await r.json())?.query?.pages;
    if (!pages) return { ok: false, status: "sin resultados" };
    const p = Object.values(pages)[0];
    return { ok: true, titulo: p.title, img: p.original?.source || p.thumbnail?.source || null, extracto: (p.extract || "").slice(0, 90) };
  } catch (e) {
    return { ok: false, status: e.message };
  }
}

const pruebas = [
  ["Pintura", "La persistencia de la memoria Dalí"],
  ["Pintura", "Las meninas Velázquez"],
  ["Álbum", "The Dark Side of the Moon Pink Floyd álbum"],
  ["Película", "El padrino película 1972"],
];

for (const [tipo, q] of pruebas) {
  const r = await wiki(q);
  if (r.ok) {
    console.log(`OK    ${tipo.padEnd(9)} "${r.titulo}"  | imagen: ${r.img ? "SÍ" : "NO"}`);
    if (r.img) console.log(`        ${r.img}`);
    console.log(`        ${r.extracto}...`);
  } else {
    console.log(`FALLA ${tipo.padEnd(9)} ${q} -> ${r.status}`);
  }
}
