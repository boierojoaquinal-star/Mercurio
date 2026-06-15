// Prueba si Gemini puede GENERAR imágenes con tu llave (y si es gratis).
import { writeFileSync } from "node:fs";

const key = process.env.GEMINI_API_KEY;
const model = "gemini-2.5-flash-image"; // el generador de imágenes ("Nano Banana")

const resp = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
  {
    method: "POST",
    headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text:
                "Grabado clásico en blanco y negro de una balanza de la justicia sobre fondo de pergamino antiguo, estilo ilustración de libro jurídico del siglo XIX, elegante, sobrio, alto detalle, sin texto.",
            },
          ],
        },
      ],
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
  }
);

const txt = await resp.text();
if (!resp.ok) {
  console.log(`NO funciona. HTTP ${resp.status}`);
  console.log(txt.slice(0, 600));
  process.exit(2);
}

const data = JSON.parse(txt);
const parts = data?.candidates?.[0]?.content?.parts || [];
const img = parts.find((p) => p.inlineData?.data);
if (!img) {
  console.log("Respondió pero SIN imagen. Contenido:");
  console.log(JSON.stringify(parts).slice(0, 400));
  process.exit(3);
}

const buf = Buffer.from(img.inlineData.data, "base64");
writeFileSync("C:\\Users\\joaco\\Desktop\\diario\\prueba-imagen.png", buf);
console.log(`OK: imagen generada (${img.inlineData.mimeType}, ${Math.round(buf.length / 1024)} KB) -> prueba-imagen.png`);
