// Puerto con imán: pulsar cerca de la costa propia coloca el puerto en la casilla de costa más cercana.
import fs from "node:fs"; import vm from "node:vm";
const ctx = vm.createContext({ console, performance, atob, Math, setTimeout });
vm.runInContext(fs.readFileSync("dist/sim.js", "utf8") + `
setupWorld(); this.__t = { setupWorld,newGame,players,terrain,owner,setOwner,W,N,snapPort,canBuild,coastal,placeBuilding };`, ctx);
const g = ctx.__t; let fail = 0;
const ok = (c, m) => { console.log((c ? "OK   " : "FALLO ") + m); if (!c) fail = 1; };
g.setupWorld(); g.newGame("T", 4, 1);
const A = g.players[0], W = g.W;
// busca una costa recta con tierra libre tierra adentro: 1 casilla de mar y 14 de tierra hacia el este
let c = -1;
for (let i = W * 150; i < g.N - 20 && c < 0; i++) { if (g.terrain[i] || !g.terrain[i + 1]) continue; let good = true;
  for (let dx = 1; dx <= 14 && good; dx++) for (let dy = -14; dy <= 14; dy++) { const j = i + dy * W + dx; if (!g.terrain[j] || g.owner[j] >= 0) { good = false; break; } }
  if (good) c = i; }
ok(c >= 0, "hay una costa de prueba");
for (let dx = 1; dx <= 14; dx++) for (let dy = -14; dy <= 14; dy++) g.setOwner(c + dy * W + dx, A.id);
A.gold = 1e9;
const coast = c + 1;
const near = coast + 6;               // 6 casillas tierra adentro
const j = g.snapPort(A, near);
ok(j >= 0 && g.coastal(j), "pulsar a 6 casillas de la costa elige una casilla de costa");
ok(g.canBuild(A, "port", j) === null, "esa casilla admite el puerto");
ok(g.snapPort(A, coast + 13) === -1, "a 13 casillas de la costa no hay imán");
ok(g.snapPort(A, c) >= 0, "pulsar en el propio mar junto a tu costa también coloca el puerto");
g.placeBuilding(A, "port", j, false);
const j2 = g.snapPort(A, near);
ok(j2 < 0 || Math.hypot(j2 % W - j % W, ((j2 / W) | 0) - ((j / W) | 0)) > 3, "el siguiente puerto respeta la distancia mínima");
if (fail) { console.error("FALLO"); process.exit(1); } console.log("puerto OK");
