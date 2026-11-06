// Empaqueta src/ en dist/game.js (juego completo, minificado) y dist/sim.js (solo simulación, sin DOM).
// Los archivos son scripts globales (sin import/export): se concatenan en orden y esbuild quita los tipos.
import fs from "node:fs";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url + "/../build/");
const esbuild = require("esbuild");

const SIM = ["mapdata", "hooks", "util", "map", "state", "players", "combat", "upgrade", "research", "tax", "material", "gear", "trade", "navy", "air", "ai", "loop", "save", "setup", "net"].map(f => `src/sim/${f}.ts`);
const CLIENT = ["icons", "camera", "pixels", "ui", "multi", "render", "boot"].map(f => `src/client/${f}.ts`);
const join = files => '"use strict";\n' + files.map(f => `// ---- ${f}\n` + fs.readFileSync(f, "utf8")).join("\n");
const minify = process.argv.includes("--dev") ? false : true;

if (process.argv.includes("--check")) {
  try { execFileSync(process.execPath, ["tools/build/node_modules/typescript/bin/tsc", "-p", "."], { stdio: "inherit" }); console.log("tipos OK"); }
  catch { console.log("tsc encontró errores de tipos (ver arriba)"); process.exitCode = 1; }
}
fs.mkdirSync("dist", { recursive: true });
for (const [name, files] of [["sim", SIM], ["game", [...SIM, ...CLIENT]]]) {
  const out = esbuild.transformSync(join(files), { loader: "ts", target: "es2020", minify, legalComments: "none", sourcefile: name + ".ts" });
  fs.writeFileSync(`dist/${name}.js`, out.code);
  console.log(`dist/${name}.js  ${(out.code.length / 1024).toFixed(1)} KB`);
}
