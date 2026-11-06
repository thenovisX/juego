// Mecánicas nuevas sin navegador: anexión de bolsas, inmunidad inicial, traición, caducidad de alianza, terreno y antiaérea.
import fs from "node:fs";
import vm from "node:vm";
const ctx = vm.createContext({ console, performance, atob, Math, setTimeout });
vm.runInContext(fs.readFileSync("dist/sim.js", "utf8") + `
this.__t = { setupWorld, newGame, gameTick, players, terrain, owner, setOwner, spawnAt, tilesOf, W, N, launchAttack, stepAttacks, borderCandidates,
  signPact, breakPacts, tileCost, rel, stepDiplomacy, immune, TER_SPEED,
  get tick(){ return tick; }, set tick(v){ tick = v; } };`, ctx);
const g = ctx.__t; let fail = 0;
const ok = (c, m) => { console.log((c ? "OK   " : "FALLO ") + m); if (!c) fail = 1; };
g.setupWorld(); g.newGame("T", 4, 1);
const [A, B] = g.players;
// 1) Inmunidad: al principio no se puede atacar a un reino recién fundado
ok(g.immune(B.id) === true, "reino recién fundado es inmune");
g.tick = 1000;
ok(g.immune(B.id) === false, "la inmunidad termina");
// 2) Anexión: B dueño de una bolsa 3x3 de llanura rodeada por A
let spot = -1;
for (let i = g.W * 200; i < g.N; i++) { let good = true; for (let dy = -3; dy <= 3 && good; dy++) for (let dx = -3; dx <= 3; dx++) { const j = i + dy * g.W + dx; if (!g.terrain[j] || g.owner[j] >= 0) { good = false; break; } } if (good) { spot = i; break; } }
for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) g.setOwner(spot + dy * g.W + dx, A.id);
for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) g.setOwner(spot + dy * g.W + dx, B.id);
B.troops = 1; A.troops = 1e9;
const cands = g.borderCandidates(A.id, B.id);
g.launchAttack(A.id, B.id, 1e9, cands.slice(0, 1));
A.troops = 1e9;
for (let k = 0; k < 400 && g.owner[spot + 1] === B.id; k++) g.stepAttacks();
let left = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (g.owner[spot + dy * g.W + dx] === B.id) left++;
ok(left === 0, "la bolsa rodeada se anexiona entera (quedan " + left + " de 9)");
// 3) Traición: romper una no agresión baja la defensa a la mitad un rato
const C = g.players[2], D = g.players[3];
g.signPact(C.id, D.id, "nap");
const spotC = g.tilesOf[D.id][0];
const before = g.tileCost(C.id, D.id, spotC);
g.breakPacts(C.id, D.id);
const afterT = g.tileCost(D.id, C.id, g.tilesOf[C.id][0]);
g.tick += 400;
const normal = g.tileCost(D.id, C.id, g.tilesOf[C.id][0]);
ok(afterT < normal * 0.6, `el traidor tiene menos defensa (${afterT.toFixed(0)} < ${normal.toFixed(0)})`);
ok(C.betrayals === 1, "se cuenta la traición");
// 4) Alianza caduca
g.signPact(C.id, D.id, "ally");
ok(g.rel(C.id, D.id).ally === true, "alianza firmada");
g.tick = g.rel(C.id, D.id).allyEnd; g.stepDiplomacy();
ok(g.rel(C.id, D.id).ally === false, "la alianza caduca");
// 5) Terreno
ok(g.TER_SPEED[3] < g.TER_SPEED[1], "la montaña se avanza más despacio que la llanura");
process.exit(fail);
