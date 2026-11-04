// Escenario sin navegador: un avión comercial aterriza y paga; un avión de guerra derriba uno ajeno y se queda la carga.
import fs from "node:fs";
import vm from "node:vm";
const ctx = vm.createContext({ console, performance, atob, Math, setTimeout });
vm.runInContext(fs.readFileSync("dist/sim.js", "utf8") + `
this.__a = { setupWorld, newGame, gameTick, players, placeBuilding, canBuild, tilesOf, rel, sendPlane, buyWarplane, stepAir,
  get planes(){ return planes; }, get wplanes(){ return wplanes; }, set spawned(v){ spawned = v; }, get tick(){ return tick; }, set tick(v){ tick = v; } };`, ctx);
const g = ctx.__a;
g.setupWorld(); g.newGame("T", 60, 1); g.spawned = true;
for (let i = 0; i < 2500; i++) g.gameTick();

const airport = p => { for (const i of g.tilesOf[p.id]) if (!g.canBuild(p, "airport", i)) { g.placeBuilding(p, "airport", i, true); return true; } return false; };
const cand = g.players.filter(p => p.isBot && p.alive && p.tiles > 8 && airport(p));
let a = null, b = null;
outer: for (const x of cand) for (const y of cand) {
  if (x === y) continue;
  g.rel(x.id, y.id).trade = true;
  if (g.sendPlane(x.id, y.id) === null) { a = x; b = y; break outer; }
}
if (!a) { console.log("sin escenario de aeropuertos en este mapa"); process.exit(0); }

// 1) aterrizaje y cobro
const pl = g.planes[g.planes.length - 1], val = pl.val, before = a.gold;
for (let i = 0; i < 2000 && !pl.done; i++) g.stepAir();
console.log(`avión aterrizó=${!!pl.done}, exportador cobra=${a.gold - before === val}`);

// 2) derribo por avión de guerra ajeno
const c = g.players.find(p => p.isBot && p.alive && p !== a && p !== b && airport(p));
if (!c) { console.log("sin tercer reino con aeropuerto; derribo omitido"); process.exit(0); }
g.rel(c.id, a.id).trade = false; g.rel(c.id, a.id).ally = false; g.rel(c.id, a.id).nap = 0;
g.wplanes.splice(0);
g.rel(a.id, b.id).trade = true; g.tick += 200;
if (typeof g.sendPlane(a.id, b.id) !== "string" && g.planes.length) { /* enviado */ }
const target = g.planes[g.planes.length - 1];
if (!target) { console.log("no hay avión en vuelo para derribar"); process.exit(0); }
c.gold = 1e9; const why = g.buyWarplane(c);
const w = g.wplanes[g.wplanes.length - 1]; w.x = target.x + 3; w.y = target.y;
const cGold = c.gold, tv = target.val;
for (let i = 0; i < 300 && !target.done; i++) g.stepAir();
console.log(`compra=${why}, derribado=${!!target.done}, cargador se queda la carga=${c.gold - cGold >= tv}`);
