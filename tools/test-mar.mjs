// Partida de bots: ningún barco (carguero, flota de desembarco, buque de guerra) debe pisar tierra salvo en su puerto/destino.
import fs from "node:fs"; import vm from "node:vm";
const ctx = vm.createContext({ console, performance, atob, Math, setTimeout });
vm.runInContext(fs.readFileSync("dist/sim.js", "utf8") + "\nsetupWorld();\nthis.__a={ setupWorld,newGame,gameTick,isWater,get tships(){return tships},get boats(){return boats},get wships(){return wships},set spawned(v){spawned=v} };", ctx);
const g = ctx.__a; g.setupWorld(); g.newGame("T", 45, 1); g.spawned = true;
let seen = 0, onLand = 0;
for (let i = 0; i < 6000; i++) { g.gameTick();
  for (const s of [...g.tships, ...g.wships]) { seen++; if (!g.isWater(s.x, s.y)) onLand++; }
  for (const b of g.boats) { seen++; if (!g.isWater(b.x, b.y) && b.pi > 1 && b.pi < b.path.length - 1) onLand++; } }
console.log(`posiciones de barcos observadas=${seen}, sobre tierra=${onLand}`);
if (!seen || onLand) { console.error("FALLO"); process.exit(1); }
console.log("mar OK");
