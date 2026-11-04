// Cargueros: ruta en pocos tramos rectos que no cruzan tierra, a velocidad moderada.
import fs from "node:fs"; import vm from "node:vm";
const ctx = vm.createContext({ console, performance, atob, Math, setTimeout });
vm.runInContext(fs.readFileSync("dist/sim.js", "utf8") + "\nthis.__a={ setupWorld,newGame,gameTick,players,placeBuilding,canBuild,tilesOf,coastal,rel,peaceful,sendTrade,axisClear,buyWarship,get tships(){return tships},stepTrade,stepNavy,get wships(){return wships},eliminate,get tick(){return tick},set spawned(v){spawned=v}, set tick(v){tick=v} };", ctx);
const g = ctx.__a; g.setupWorld(); g.newGame("T", 60, 1); g.spawned = true;
for (let i = 0; i < 2500; i++) g.gameTick();
const port = p => { for (const i of g.tilesOf[p.id]) if (g.coastal(i) && !g.canBuild(p, "port", i)) { g.placeBuilding(p, "port", i, true); return true; } return false; };
const cand = g.players.filter(p => p.isBot && p.alive && p.tiles > 8 && port(p));
let ok = false, a, b, c;
outer: for (a of cand) for (b of cand) { if (a === b) continue; g.rel(a.id, b.id).trade = true; if (g.sendTrade(a.id, b.id) === null) { for (c of cand) { if (c === a || c === b) continue; ok = true; break outer; } } }
const s = g.tships[g.tships.length - 1], P = s.path; let diag = 0, land = 0, turns = 0, len = 0;
for (let k = 1; k < P.length; k++) { const dx = P[k][0] - P[k-1][0], dy = P[k][1] - P[k-1][1]; len += Math.abs(dx) + Math.abs(dy);
  if (Math.abs(dx) > 1000) continue; if (dx !== 0 && dy !== 0) diag++;
  if (k > 1 && k < P.length - 1 && !g.axisClear(P[k-1][0] - 0.5, P[k-1][1] - 0.5, P[k][0] - 0.5, P[k][1] - 0.5)) land++; }
let maxStep = 0, px = s.x, py = s.y;
for (let i = 0; i < 50 && !s.done; i++) { g.tick++; g.stepTrade(); maxStep = Math.max(maxStep, Math.hypot(s.x - px, s.y - py)); px = s.x; py = s.y; }
console.log(`ruta: ${P.length} puntos, ${Math.round(len)} casillas, tramos en diagonal=${diag}, tramos sobre tierra=${land}, paso máx. por tick=${maxStep.toFixed(2)}`);
if (diag > 2 || land || maxStep > 0.45 || P.length > len / 3 + 3) { console.error("FALLO"); process.exit(1); }
console.log("barcos OK");
