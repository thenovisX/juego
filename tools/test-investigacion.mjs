// Universidades e investigación: lo avanzado está bloqueado hasta investigarlo; más universidades = antes.
import fs from "node:fs";
import vm from "node:vm";
const ctx = vm.createContext({ console, performance, atob, Math, setTimeout, Blob: class {}, URL });
vm.runInContext(fs.readFileSync("dist/sim.js", "utf8") + `
this.__u = { setupWorld, newGame, players, placeBuilding, canBuild, tilesOf, spawnAt, terrain, owner, W, stepResearch, startResearch, rpRate, launchMissile, saveGame, loadGame, RESEARCH,
  set tick(v){ tick=v; }, get tick(){ return tick; } };`, ctx);
const g = ctx.__u; let fail = 0; const ok = (c, m) => { console.log((c ? "OK  " : "FALLO ") + m); if (!c) fail++; };
g.setupWorld(); g.newGame("T", 5, 1);
const me = g.players[0];
let c = 0; for (let y = 200; y < 330 && !c; y++) for (let x = 900; x < 1100; x++) { const i = y * g.W + x; if (g.terrain[i] === 1 && g.owner[i] < 0) { c = i; break; } }
g.spawnAt(me, c % g.W, (c / g.W) | 0, 14);
me.gold = 1e12; const L = g.tilesOf[me.id];
const spots = []; for (const i of L) { if (g.canBuild(me, "university", i) === null) { spots.push(i); g.placeBuilding(me, "university", i, true); if (spots.length === 3) break; } }
ok(typeof g.canBuild(me, "silo", L.find(i => g.canBuild(me, "university", i) === null)) === "string", "silo bloqueado sin investigar");
ok(g.rpRate(me) === 3, `3 universidades = 3 puntos/s (${g.rpRate(me)})`);
ok(g.startResearch(me, "hydro") !== null, "no se puede investigar Fusión sin Fisión");
ok(g.startResearch(me, "silo") === null, "se puede empezar a investigar Misiles");
let t = 0; while (!me.res.done.silo && t < 5000) { g.tick++; g.stepResearch(); t++; }
ok(t === 1000, `300 puntos con 3 universidades = 100 s = 1000 ticks (${t})`);
const spot = L.find(i => g.canBuild(me, "silo", i) === null); ok(spot !== undefined, "silo permitido tras investigarlo");
ok(typeof g.launchMissile(me, "atom", L[0]) === "string", "bomba atómica sigue bloqueada");
const back = g.loadGame(JSON.parse(JSON.stringify(g.saveGame()))); ok(back === null && g.players[0].res.done.silo === true, "la investigación sobrevive a guardar/cargar");
process.exit(fail ? 1 : 0);
