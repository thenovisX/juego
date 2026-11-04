// Partida de bots sin navegador: comprueba que se planifican (estaciones), mejoran edificios, firman pactos y no fallan.
import fs from "node:fs";
import vm from "node:vm";
const ctx = vm.createContext({ console, performance, atob, Math, setTimeout });
vm.runInContext(fs.readFileSync("dist/sim.js", "utf8") + `
this.__b = { setupWorld, newGame, gameTick, players, buildings, rels, get tick(){ return tick; }, set spawned(v){ spawned = v; }, get landTotal(){ return landTotal; } };`, ctx);
const g = ctx.__b;
g.setupWorld(); g.newGame("T", 45, 1); g.spawned = true;
const t0 = performance.now();
for (let i = 0; i < 9000; i++) g.gameTick();
const ms = (performance.now() - t0) / 9000;
const live = g.buildings.filter(b => !b.dead);
const count = t => live.filter(b => b.t === t).length;
const upgraded = live.filter(b => b.lvl > 1).length;
let naps = 0, trades = 0;
for (const [, r] of g.rels) { if (r.nap > g.tick) naps++; if (r.trade) trades++; }
const alive = g.players.filter(p => p.alive);
const top = alive.reduce((m, p) => (p.tiles > m.tiles ? p : m));
console.log(`ticks=${g.tick}, ${ms.toFixed(2)} ms/tick, vivos=${alive.length}/${g.players.length}`);
console.log(`estaciones=${count("station")}, mejorados=${upgraded}, aeropuertos=${count("airport")}, puertos=${count("port")}`);
console.log(`pactos activos: no agresión=${naps}, comercio=${trades}; líder=${top.name} con ${(top.tiles / g.landTotal * 100).toFixed(1)}% del mundo`);
if (count("station") === 0 || upgraded === 0 || trades === 0) { console.error("FALLO: los bots no muestran la conducta esperada"); process.exit(1); }
console.log("bots OK");
