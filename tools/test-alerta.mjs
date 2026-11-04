// Un enemigo ataca al jugador: el chat avisa quién y con cuántas tropas (una vez cada 100 ticks) y el ataque lista casillas mías.
import fs from "node:fs"; import vm from "node:vm";
const logs = [];
const ctx = vm.createContext({ console, performance, atob, Math, setTimeout });
vm.runInContext(fs.readFileSync("dist/sim.js", "utf8") + "\nthis.__a={ setupWorld,newGame,gameTick,players,borderCandidates,launchAttack,Hooks,get attacks(){return attacks},get tick(){return tick},set tick(v){tick=v},set spawned(v){spawned=v},get me(){return me} };", ctx);
const g = ctx.__a; g.setupWorld(); g.newGame("T", 30, 1); g.spawned = true;
for (let i = 0; i < 1500; i++) g.gameTick();
g.Hooks.log = (m, k) => logs.push([m, k]);
const me = g.me; const att = g.players.find(p => p !== me && p.alive), cands = [1000]; att.troops = 5000; g.launchAttack(att.id, me.id, 1000, [...cands]); g.launchAttack(att.id, me.id, 500, [...cands]);
const a = g.attacks.find(a => a.att === att.id && a.def === me.id);
console.log("avisos:", logs.length, logs[0] && logs[0][0], "| casillas mías en el frente:", a.q.filter(t => g.me && true).length);
if (logs.length !== 1 || !/te ataca/.test(logs[0][0]) || !logs[0][0].includes(att.name)) { console.error("FALLO"); process.exit(1); }
console.log("alerta OK");
