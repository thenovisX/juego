// Materiales sin navegador: una obra con coste en materiales espera sin estación; con una estación cerca de la mina
// recibe los materiales y empieza a construirse; sobrevive a guardar/cargar; los productores se llenan y paran.
import fs from "node:fs";
import vm from "node:vm";
const ctx = vm.createContext({ console, performance, atob, Math, setTimeout, Blob: class {}, URL });
vm.runInContext(fs.readFileSync("dist/sim.js", "utf8") + `
this.__m = { setupWorld, newGame, get players(){ return players; }, get tilesOf(){ return tilesOf; }, canBuild, placeBuilding, stepMaterials, matTotals, saveGame, loadGame, terrain, owner, spawnAt, wdx,
  get buildings(){ return buildings; }, get tick(){ return tick; }, set tick(v){ tick = v; } };`, ctx);
const g = ctx.__m;
g.setupWorld(); g.newGame("T", 5, 1);
const me = g.players[0];
let spot = -1; for (let i = g.tilesOf.length ? (g.terrain.length / 3 | 0) : 0; i < g.terrain.length; i++) if (g.terrain[i] && g.terrain[i] !== 5 && g.owner[i] < 0) { spot = i; break; }
g.spawnAt(me, spot % 2000, (spot / 2000) | 0, 14);
me.gold = 1e12; me.res.done.silo = true;
const T = g.tilesOf[me.id];
const near = (a, type, minD, maxD) => T.find(i => { const d = Math.hypot(g.wdx(i % 2000, a.x), ((i / 2000) | 0) - a.y); return d >= minD && d <= maxD && !g.canBuild(me, type, i); });

// 1) mina en montaña (da hierro) con el almacén lleno, y un silo (200 de hierro) en obra
const mineSpot = T.find(i => !g.canBuild(me, "foundry", i)); g.terrain[mineSpot] = 3;
g.placeBuilding(me, "foundry", mineSpot, true);
const mine = g.buildings.find(b => b.t === "foundry" && !b.dead && b.owner === me.id);
const siloSpot = near(mine, "silo", 5, 9);
g.placeBuilding(me, "silo", siloSpot, false);
let silo = g.buildings.find(b => b.t === "silo" && !b.dead && b.owner === me.id);
console.log(`silo en obra esperando: need=${JSON.stringify(silo.need)}, done=${silo.done}`);
if (!silo.need || isFinite(silo.done)) { console.error("FALLO: la obra debería esperar materiales"); process.exit(1); }
mine.stock = 200;

// 2) sin estación no llegan los materiales
for (let i = 0; i < 300; i++) { g.tick++; g.stepMaterials(); }
silo = g.buildings.find(b => b.t === "silo" && !b.dead && b.owner === me.id);
const waitingNoStation = !!silo.need && silo.need.hierro === 200;
console.log(`sin estación: sigue esperando=${waitingNoStation}`);

// 3) guardar y cargar con la obra pendiente
const back = g.loadGame(JSON.parse(JSON.stringify(g.saveGame())));
silo = g.buildings.find(b => b.t === "silo" && !b.dead);
const mine2 = g.buildings.find(b => b.t === "foundry" && !b.dead);
console.log(`tras guardar/cargar: error=${back}, obra pendiente conservada=${!!silo.need && !isFinite(silo.done)}`);

// 4) estación entre mina y silo: llegan los materiales
const meNow = g.players[0];
const stSpot = T.find(i => { const dm = Math.hypot(g.wdx(i % 2000, mine2.x), ((i / 2000) | 0) - mine2.y), ds = Math.hypot(g.wdx(i % 2000, silo.x), ((i / 2000) | 0) - silo.y); return dm < 12 && ds < 12 && !g.canBuild(meNow, "station", i); });
g.placeBuilding(meNow, "station", stSpot, true);
for (let i = 0; i < 400; i++) { g.tick++; g.stepMaterials(); }
silo = g.buildings.find(b => b.t === "silo" && !b.dead);
console.log(`con estación: need=${JSON.stringify(silo.need)}, done finito=${isFinite(silo.done)}, hierro en mina=${Math.floor(mine2.stock)}`);
const ok = waitingNoStation && !back && !silo.need && isFinite(silo.done) && mine2.stock < 200 && mine2.stock >= 0;
if (!ok) { console.error("FALLO"); process.exit(1); }

// 5) un productor se llena y deja de producir
const farm = { t: "foundry", i: mineSpot, owner: meNow.id, done: 0, lvl: 1, stock: 199 };
for (let i = 0; i < 100; i++) { g.tick++; g.stepMaterials(); }
console.log(`almacén de la mina tras 100 ticks: ${Math.floor(mine2.stock)} (máx. 200)`);
if (mine2.stock > 200) { console.error("FALLO: superó el máximo"); process.exit(1); }
console.log("materiales OK");
