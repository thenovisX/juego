// Impuestos sin navegador: con 10 % el pueblo sigue contento; con 80 % cae el ánimo, hay revueltas y se pierde territorio.
import fs from "node:fs";
import vm from "node:vm";
const ctx = vm.createContext({ console, performance, atob, Math, setTimeout });
vm.runInContext(fs.readFileSync("dist/sim.js", "utf8") + `
this.__t = { setupWorld, newGame, players, terrain, owner, spawnAt, stats, stepTax, tilesOf, W, N,
  get tick(){ return tick; }, set tick(v){ tick = v; } };`, ctx);
const g = ctx.__t;
g.setupWorld(); g.newGame("T", 5, 1);
const me = g.players[0];
let spot = -1; for (let i = g.N / 3 | 0; i < g.N; i++) if (g.terrain[i] && g.terrain[i] !== 5 && g.owner[i] < 0) { spot = i; break; }
g.spawnAt(me, spot % g.W, (spot / g.W) | 0, 12);
const tiles0 = me.tiles, incLow = g.stats(me).inc;
for (let i = 0; i < 3000; i++) { g.tick++; g.stepTax(); }
const happyLow = me.happy;
me.tax = 80; const incHigh = g.stats(me).inc;
for (let i = 0; i < 9000 && me.alive; i++) { g.tick++; g.stepTax(); }
console.log(`10%: felicidad=${happyLow.toFixed(0)}, ingresos=${incLow.toFixed(0)} | 80%: ingresos=${incHigh.toFixed(0)}, felicidad=${me.happy.toFixed(0)}, casillas ${tiles0} -> ${me.tiles}`);
if (happyLow < 70 || !(incHigh > incLow) || !(me.tiles < tiles0 || !me.alive)) { console.error("FALLO"); process.exit(1); }
console.log("impuestos OK");
