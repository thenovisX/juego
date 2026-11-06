// Conquistas más duras + tanques y artillería.
import fs from "node:fs";
import vm from "node:vm";
const ctx = vm.createContext({ console, performance, atob, Math, setTimeout });
vm.runInContext(fs.readFileSync("dist/sim.js", "utf8") + `
this.__u = { setupWorld, newGame, players, placeBuilding, buildings, owner, terrain, spawnAt, tilesOf, tileCost, buyGear, gearWhy, gearCap, GEAR, W, OCC_X, matTotals,
  saveGame, loadGame, set tick(v){ tick=v; }, get tick(){ return tick; } };`, ctx);
const g = ctx.__u; let fail = 0; const ok = (c, m) => { console.log((c ? "OK  " : "FALLO ") + m); if (!c) fail++; };
g.setupWorld(); g.newGame("T", 5, 1);
const me = g.players[0], en = g.players[1];
let c = 0; for (let y = 200; y < 330 && !c; y++) for (let x = 900; x < 1100; x++) { const i = y * g.W + x; if (g.terrain[i] === 1 && g.owner[i] < 0) { c = i; break; } }
g.spawnAt(me, c % g.W, (c / g.W) | 0, 12);
const ei = g.tilesOf[en.id][0], free = g.tilesOf[me.id][0];
const own = g.tileCost(me.id, en.id, ei), neu = g.tileCost(me.id, -1, ei);
ok(own > neu * 2, `conquistar un reino cuesta más del doble que tierra libre (${Math.round(own)} vs ${Math.round(neu)})`);
ok(typeof g.buyGear(me, "tank") === "string", "sin investigar ni arsenal no se fabrican tanques");
me.res.done.arsenal = true; me.res.done.artillery = true; me.gold = 1e9;
ok(g.buyGear(me, "tank") === "Necesitas un Arsenal terminado.", "sin arsenal no hay tanques");
const L = g.tilesOf[me.id], at = L.find(i => { const x = i % g.W, y = (i / g.W) | 0; return Math.abs(x - (L[0] % g.W)) > 6; });
g.placeBuilding(me, "arsenal", at, true);
ok(g.gearCap(me) === 4, "un arsenal guarda 4 piezas");
ok(/materiales/.test(g.buyGear(me, "tank")), "sin materiales no se fabrica");
me.isBot = true; // los bots pagan solo oro
const g0 = me.gold; ok(g.buyGear(me, "tank") === null && me.gear.tank === 1 && g0 - me.gold === g.GEAR.tank.gold, "comprar un tanque");
const c1 = g.tileCost(me.id, en.id, ei);
ok(Math.abs(c1 / own - 0.94) < 1e-9, "1 tanque abarata un 6% conquistar");
const d0 = g.tileCost(en.id, me.id, free); me.gear.tank = 3; const d1 = g.tileCost(en.id, me.id, free);
ok(Math.abs(d1 / d0 - 1.15 / 1.05) < 1e-9, "3 tanques en vez de 1 encarecen conquistarte (+15% vs +5%)");
for (let k = 0; k < 3; k++) g.buyGear(me, "arty");
ok(me.gear.arty === 3, "artillería comprada");
me.gear.tank = 4; ok(typeof g.buyGear(me, "tank") === "string", "arsenal lleno");
me.isBot = false;
const s = JSON.parse(JSON.stringify(g.saveGame())); ok(s.players[0].gear.tank === 4, "el equipo se guarda");
console.log(fail ? "FALLOS: " + fail : "tanques OK"); process.exit(fail ? 1 : 0);
