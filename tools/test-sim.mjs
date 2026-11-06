// Prueba sin navegador: carga dist/sim.js en Node (sin DOM), crea una partida y simula 3000 ticks.
import fs from "node:fs";
import vm from "node:vm";
const ctx = vm.createContext({ console, performance, atob, Math, setTimeout });
vm.runInContext(fs.readFileSync("dist/sim.js", "utf8") + "\nsetupWorld();\nthis.__api={ setupWorld, newGame, gameTick, players, get tick(){return tick}, get me(){return me}, set spawned(v){ spawned=v }, get landTotal(){return landTotal}, spawnAt, borderCandidates, launchAttack };", ctx);
const g = ctx.__api;
g.setupWorld(); g.newGame("Prueba", 25, 1);
g.spawned = true;
const t0 = performance.now();
for (let i = 0; i < 3000; i++) g.gameTick();
const alive = g.players.filter(p => p.alive).length;
console.log(`sim sin DOM OK: tick=${g.tick}, vivos=${alive}/${g.players.length}, ${((performance.now() - t0) / 3000).toFixed(2)} ms/tick`);
if (g.tick !== 3000 || alive < 2) { console.error("FALLO"); process.exit(1); }
