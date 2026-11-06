// Genera src/sim/mapdata.ts: máscara tierra/mar (RLE base64) de cada mapa real, a partir de las costas de world-atlas (land-50m).
// Uso: cd tools/build && npm i world-atlas d3-geo topojson-client && cd ../.. && node tools/gen-maps.mjs
// Los mapas procedurales ("proc") no llevan datos: se generan en el juego con ruido determinista (src/sim/map.ts).
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url + "/../build/");
const { geoEquirectangular, geoPath } = require("d3-geo");
const { feature } = require("topojson-client");
const topo = JSON.parse(fs.readFileSync("tools/build/node_modules/world-atlas/land-50m.json"));
const land = feature(topo, topo.objects.land);

// W = ancho en casillas; lon0..lon1 / latTop..latBot = zona del globo; wrap = el mapa da la vuelta horizontalmente (solo el mundo entero)
const MAPS = [
  { id: "tierra", name: "Tierra", desc: "El mundo entero a tamaño normal. El mapa da la vuelta: se puede navegar de un borde al otro.", W: 2000, lon0: -180, lon1: 180, latTop: 84, latBot: -58, wrap: true, bots: [25, 45, 70] },
  { id: "gigante", name: "Mundo gigante", desc: "La Tierra a doble resolución: 6,3 millones de casillas, costas finas y distancias enormes. Para partidas largas con muchos reinos.", W: 4000, lon0: -180, lon1: 180, latTop: 84, latBot: -58, wrap: true, bots: [60, 100, 150], giant: true },
  { id: "europa", name: "Europa y Mediterráneo", desc: "Europa, el norte de África y Oriente Próximo: fronteras terrestres, mares cerrados y muchos vecinos.", W: 1700, lon0: -25, lon1: 60, latTop: 72, latBot: 30, wrap: false, bots: [20, 35, 55] },
  { id: "america", name: "Las Américas", desc: "Del Ártico a la Patagonia: dos continentes unidos por un istmo estrecho.", W: 1400, lon0: -170, lon1: -30, latTop: 75, latBot: -57, wrap: false, bots: [15, 28, 45] },
  { id: "africa", name: "África", desc: "Un continente compacto con sabana, selva y el Sáhara; las rutas por mar son clave.", W: 1480, lon0: -20, lon1: 55, latTop: 38, latBot: -36, wrap: false, bots: [15, 28, 45] },
  { id: "archipielago", name: "Archipiélago", desc: "Cientos de islas generadas al azar (siempre la misma): la guerra se gana con puertos y flotas.", W: 2000, H: 1000, lon0: -180, lon1: 180, latTop: 60, latBot: -60, wrap: false, proc: "archi", bots: [20, 35, 55] },
  { id: "pangea", name: "Pangea", desc: "Un único supercontinente rodeado de océano: guerra terrestre sin escapatoria.", W: 1600, H: 1000, lon0: -180, lon1: 180, latTop: 65, latBot: -55, wrap: false, proc: "pangea", bots: [20, 35, 55] },
];

function rasterize(m) {
  const s = m.W / ((m.lon1 - m.lon0) * Math.PI / 180);
  const H = Math.round(s * (m.latTop - m.latBot) * Math.PI / 180), W = m.W;
  const proj = geoEquirectangular().scale(s).translate([-m.lon0 * Math.PI / 180 * s, s * m.latTop * Math.PI / 180]);
  const rings = []; let cur = null;
  geoPath(proj, { moveTo(x, y) { cur = [[x, y]]; rings.push(cur); }, lineTo(x, y) { cur.push([x, y]); }, closePath() {}, arc() {}, rect() {} })(land);
  const mask = new Uint8Array(W * H), buckets = Array.from({ length: H }, () => []);
  for (const r of rings) for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; if (a[1] === b[1]) continue;
    const e = a[1] < b[1] ? [a[0], a[1], b[0], b[1]] : [b[0], b[1], a[0], a[1]];
    const y0 = Math.max(0, Math.ceil(e[1] - 0.5)), y1 = Math.min(H - 1, Math.floor(e[3] - 0.5)); for (let y = y0; y <= y1; y++) buckets[y].push(e); }
  for (let y = 0; y < H; y++) { const cy = y + 0.5, xs = [];
    for (const e of buckets[y]) if (cy >= e[1] && cy < e[3]) xs.push(e[0] + (cy - e[1]) * (e[2] - e[0]) / (e[3] - e[1]));
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) { const x0 = Math.max(0, Math.ceil(xs[i] - 0.5)), x1 = Math.min(W - 1, Math.floor(xs[i + 1] - 0.5)); for (let x = x0; x <= x1; x++) mask[y * W + x] ^= 1; } }
  if (!m.wrap) { // margen de mar en los bordes laterales: así la costura del mapa nunca une tierra con tierra
    const M = 6; for (let y = 0; y < H; y++) for (let k = 0; k < M; k++) { mask[y * W + k] = 0; mask[y * W + W - 1 - k] = 0; } }
  return { H, mask };
}
function rle(mask) {
  const runs = []; let v = 0, n = 0;
  for (let i = 0; i < mask.length; i++) { if (mask[i] === v) n++; else { runs.push(n); v = mask[i]; n = 1; } } runs.push(n);
  const bytes = []; for (let r of runs) { while (r >= 128) { bytes.push((r & 127) | 128); r >>= 7; } bytes.push(r); }
  return Buffer.from(bytes).toString("base64");
}
const out = [];
for (const m of MAPS) {
  const o = { ...m };
  if (!m.proc) { const { H, mask } = rasterize(m); o.H = H; o.rle = rle(mask); let l = 0; for (const x of mask) l += x;
    console.log(m.id, m.W + "x" + H, "tierra", (100 * l / mask.length).toFixed(1) + "%", "rle", (o.rle.length / 1024).toFixed(1) + " KB"); }
  out.push(o);
}
fs.writeFileSync("src/sim/mapdata.ts", "// Generado por tools/gen-maps.mjs (no editar a mano)\nconst MAPDATA = " + JSON.stringify({ maps: out }) + ";\n");
