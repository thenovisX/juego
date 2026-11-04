// Guardar/cargar sin navegador: guarda una partida a medias, la serializa a texto, la carga y comprueba que el estado
// es idéntico; luego sigue jugando 500 ticks. También rechaza versiones y archivos ajenos.
import fs from "node:fs";
import vm from "node:vm";
const ctx = vm.createContext({ console, performance, atob, Math, setTimeout, Blob: class {}, URL });
vm.runInContext(fs.readFileSync("dist/sim.js", "utf8") + `
this.__s = { setupWorld, newGame, gameTick, saveGame, loadGame, get players(){ return players; }, get buildings(){ return buildings; },
  get attacks(){ return attacks; }, get tships(){ return tships; }, get planes(){ return planes; }, owner, fallout, rels, set spawned(v){ spawned = v; }, get tick(){ return tick; }, get me(){ return me; } };`, ctx);
const g = ctx.__s;
g.setupWorld(); g.newGame("T", 40, 1); g.spawned = true;
for (let i = 0; i < 4000; i++) g.gameTick();

const summary = () => {
  let h = 0; for (let i = 0; i < g.owner.length; i++) h = (h * 31 + g.owner[i] + 2) | 0;
  return JSON.stringify({ tick: g.tick, h, tiles: g.players.reduce((a, p) => a + p.tiles, 0), gold: Math.round(g.players.reduce((a, p) => a + p.gold, 0)),
    troops: Math.round(g.players.reduce((a, p) => a + p.troops, 0)), b: g.buildings.filter(b => !b.dead).length, lv: g.buildings.filter(b => !b.dead && b.lvl > 1).length,
    att: g.attacks.length, rels: g.rels.size, tsh: g.tships.length, pl: g.planes.length, me: g.me.id, happy: Math.round(g.players.reduce((a, p) => a + p.happy, 0)) });
};
const before = summary();
const text = JSON.stringify(g.saveGame());
console.log(`partida guardada: ${(text.length / 1024).toFixed(0)} KB`);

// perturbar el mundo para demostrar que la carga restaura de verdad
for (let i = 0; i < 700; i++) g.gameTick();
const changed = summary() !== before;
const why = g.loadGame(JSON.parse(text));
const after = summary();
console.log(`error de carga=${why}, estado restaurado=${after === before}, (antes de cargar había cambiado=${changed})`);
if (why || after !== before || !changed) { console.error("FALLO:", before, after); process.exit(1); }
for (let i = 0; i < 500; i++) g.gameTick();
console.log(`continúa tras cargar: tick=${g.tick}`);

const bad = [g.loadGame({ game: "otro" }), g.loadGame({ ...JSON.parse(text), version: 99 }), g.loadGame({ ...JSON.parse(text), W: 5 })];
console.log("rechazos:", bad.map(b => !!b).join(","));
if (bad.some(b => !b)) { console.error("FALLO en validación"); process.exit(1); }
console.log("guardar/cargar OK");
