// ============================================================================
//  ACTUALIZAR.MJS  ->  Regenera TODO el diario de una sola vez.
//  Corre las 5 secciones y después arma el index.html definitivo.
//  Uso:  node actualizar.mjs    (o:  npm run build)
// ============================================================================
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CARPETA = dirname(fileURLToPath(import.meta.url));

const pasos = [
  "generar-diario.mjs",
  "generar-derecho.mjs",
  "generar-economia.mjs",
  "generar-arte.mjs",
  "generar-mundo.mjs",
  "generar-tecnologia.mjs",
  "generar-mercurio.mjs", // ensambla el index.html (debe ir último)
];

for (const paso of pasos) {
  console.log(`\n================  ${paso}  ================`);
  try {
    execSync(`node "${join(CARPETA, paso)}"`, { stdio: "inherit", cwd: CARPETA });
  } catch (e) {
    console.error(`(Falló ${paso}, sigo con el resto)`);
  }
}

console.log("\n✓ Diario actualizado: index.html");
