// Mejoras y economía sin navegador:
//  - una granja da oro y mejorarla lo sube; el coste se duplica y no pasa del nivel 3
//  - una mina NO da oro por sí sola, pero mejorarla sube los impuestos (empleo) y la felicidad objetivo
import fs from "node:fs";
import vm from "node:vm";
const ctx = vm.createContext({ console, performance, atob, Math, setTimeout });
vm.runInContext(fs.readFileSync("dist/sim.js", "utf8") + `
setupWorld();
this.__u = { setupWorld, newGame, players, placeBuilding, canBuild, stats, upCost, upgradeBuilding, buildings, terrain, owner, spawnAt, tilesOf, happyTarget,
  get tick(){ return tick; } };`, ctx);
const g = ctx.__u;
g.setupWorld(); g.newGame("T", 5, 1);
const me = g.players[0];
let spot = -1; for (let i = (g.terrain.length / 3) | 0; i < g.terrain.length; i++) if (g.terrain[i] && g.terrain[i] !== 5 && g.owner[i] < 0) { spot = i; break; }
g.spawnAt(me, spot % 2000, (spot / 2000) | 0, 12);
me.gold = 1e12;
const T = g.tilesOf[me.id];
const free = type => T.find(i => !g.canBuild(me, type, i));

// granja (llanura): da oro
const fSpot = T.find(i => !g.canBuild(me, "farm", i) || (g.terrain[i] === 1 && !g.canBuild(me, "farm", i)));
const base = g.stats(me).inc;
let farmSpot = T.find(i => { g.terrain[i] = 1; return !g.canBuild(me, "farm", i); });
g.placeBuilding(me, "farm", farmSpot, true);
const farm = g.buildings[g.buildings.length - 1];
const incFarm1 = g.stats(me).inc, c1 = g.upCost(farm);
const e1 = g.upgradeBuilding(me, farm), incFarm2 = g.stats(me).inc, c2 = g.upCost(farm);
const e2 = g.upgradeBuilding(me, farm), e3 = g.upgradeBuilding(me, farm);
console.log(`granja: nivel=${farm.lvl}, errores=${e1},${e2}|${e3}, coste ${c1} -> ${c2}, ingresos ${base.toFixed(0)} -> ${incFarm1.toFixed(0)} -> ${incFarm2.toFixed(0)}`);
if (farm.lvl !== 3 || e3 === null || !(incFarm1 > base) || !(incFarm2 > incFarm1) || c2 !== c1 * 2) { console.error("FALLO en granja"); process.exit(1); }

// mina: sin oro directo, pero empleo
const mSpot = T.find(i => !g.canBuild(me, "mine", i));
const before = g.stats(me).inc, hBefore = g.happyTarget(me);
g.placeBuilding(me, "mine", mSpot, true);
const mine = g.buildings[g.buildings.length - 1];
const after = g.stats(me).inc, hAfter = g.happyTarget(me);
g.upgradeBuilding(me, mine);
const after2 = g.stats(me).inc;
console.log(`mina: ingresos ${before.toFixed(0)} -> ${after.toFixed(0)} -> ${after2.toFixed(0)} (solo por empleo/impuestos), felicidad objetivo ${hBefore.toFixed(1)} -> ${hAfter.toFixed(1)}`);
// el incremento por una mina es pequeño comparado con una granja (4 * GOLD_X por nivel)
if (!(after > before) || !(after2 > after) || (after - before) > 4 * 100 * 0.5 || !(hAfter > hBefore)) { console.error("FALLO en mina"); process.exit(1); }
console.log("mejoras y economía OK");
