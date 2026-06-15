// Prueba cual de los modelos "mejores" funciona gratis con tu llave.
// Va probando de mejor a mas basico y muestra el resultado de cada uno.

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error("No encontre la llave (GEMINI_API_KEY).");
  process.exit(1);
}

const headers = { "x-goog-api-key": key, "Content-Type": "application/json" };

// De mejor a mas seguro/probado.
const candidatos = ["gemini-3.5-flash", "gemini-3-flash-preview", "gemini-2.5-flash"];

for (const model of candidatos) {
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Responde solo con: ok" }] }],
        }),
      }
    );
    const t = await r.text();
    if (r.ok) {
      const j = JSON.parse(t);
      const out = j?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "(sin texto)";
      console.log(`FUNCIONA   ${model}   -> respondio: "${out}"`);
    } else {
      let motivo = `HTTP ${r.status}`;
      try {
        motivo += " " + (JSON.parse(t).error?.status || "");
      } catch {}
      console.log(`NO ANDA    ${model}   -> ${motivo}`);
    }
  } catch (e) {
    console.log(`NO ANDA    ${model}   -> ${e.message}`);
  }
}
