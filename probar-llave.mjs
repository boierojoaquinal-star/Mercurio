// Mini-programa: SOLO prueba si la llave de Gemini funciona.
// No construye nada del diario; es una verificación.

const key = process.env.GEMINI_API_KEY;

if (!key) {
  console.error("No encontre la llave (GEMINI_API_KEY) en el archivo .env.");
  process.exit(1);
}

const headers = { "x-goog-api-key": key };

async function main() {
  // 1) Validar la llave pidiendole a Google la lista de modelos disponibles.
  const listResp = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models",
    { headers }
  );
  const listText = await listResp.text();

  if (!listResp.ok) {
    console.error(`La llave NO funciono. Codigo HTTP: ${listResp.status}`);
    console.error("Respuesta de Google:");
    console.error(listText.slice(0, 800));
    process.exit(2);
  }

  const data = JSON.parse(listText);
  const flash = (data.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map((m) => m.name.replace("models/", ""))
    .filter((n) => n.includes("flash"));

  console.log("OK: la llave funciona. Modelos Flash disponibles para vos:");
  flash.forEach((n) => console.log("   - " + n));

  // 2) Prueba real: pedirle a un modelo flash que conteste "hola".
  const model =
    flash.find((n) => n.includes("2.5")) ||
    flash.find((n) => n.includes("2.0")) ||
    flash[0];

  if (!model) {
    console.log("(La llave es valida, pero no encontre un modelo flash.)");
    return;
  }

  const genResp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Responde solo con la palabra: hola" }] }],
      }),
    }
  );
  const genText = await genResp.text();

  if (!genResp.ok) {
    console.error(`La llave es valida pero la generacion fallo (HTTP ${genResp.status}):`);
    console.error(genText.slice(0, 600));
    process.exit(3);
  }

  const gen = JSON.parse(genText);
  const out = gen?.candidates?.[0]?.content?.parts?.[0]?.text ?? "(sin texto)";
  console.log(`\nPrueba con el modelo "${model}":`);
  console.log("   Gemini respondio: " + out.trim());
  console.log("\nListo: la llave sirve para resumir noticias.");
}

main().catch((e) => {
  console.error("Error inesperado:", e.message);
  process.exit(9);
});
