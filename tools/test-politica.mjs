// Casus belli/infamia, tradiciones y eventos sin navegador.
import fs from "node:fs";
import vm from "node:vm";
const ctx = vm.createContext({ console, performance, atob, Math, setTimeout });
vm.runInContext(fs.readFileSync("dist/sim.js", "utf8") + `
this.__t = { setupWorld, newGame, players, terrain, owner, spawnAt, stats, stepPolitica, hasCB, launchAttack, borderCandidates,
  adoptIdea, ideaCost, resolveEvent, IDEAS, EVENTS, hasIdea, tilesOf, W, N, INFAMY_COALITION,
  get tick(){ return tick; }, set tick(v){ tick = v; } };`, ctx);
const g = ctx.__t; let bad = 0; const ok = (c, m) => { if (!c) { console.error("FALLO:", m); bad++; } };
g.setupWorld(); g.newGame("T", 6, 1);
const A = g.players[0], B = g.players[1];
// vecinos: coloca B pegado a A
let spot = -1; for (let i = g.N / 3 | 0; i < g.N; i++) if (g.terrain[i] && g.terrain[i] !== 5 && g.owner[i] < 0) { spot = i; break; }
for (const p of g.players) for (const i of g.tilesOf[p.id].slice()) { /* limpia */ }
// sin casus belli: infamia
ok(g.hasCB(0, -1), "tierra libre siempre vale");
ok(!g.hasCB(0, 1), "sin motivo no hay casus belli");
A.troops = 1e6; g.tick = 1000;
const cands = [1]; // dummy: launchAttack exige candidatos; usamos una casilla de B
const tb = g.tilesOf[1][0];
g.launchAttack(0, 1, 1000, [tb]);
ok(A.infamy >= 8, "atacar sin casus belli da infamia (" + A.infamy + ")");
ok(g.hasCB(1, 0), "el atacado obtiene casus belli");
const inf0 = A.infamy; g.launchAttack(1, 0, 1000, [g.tilesOf[0][0]]);
ok(B.infamy === 0 || B.infamy === undefined || B.infamy === 0, "contraatacar con casus belli no da infamia");
for (let i = 0; i < 400; i++) { g.tick++; g.stepPolitica(); }
ok(A.infamy < inf0, "la infamia baja con el tiempo");
// tradiciones
A.pow = 0; ok(g.adoptIdea(A, "comercio"), "sin autoridad no se puede");
A.pow = 1000; const inc0 = g.stats(A).inc;
ok(g.adoptIdea(A, "comercio") === null, "adopta tradición"); ok(g.stats(A).inc > inc0 * 1.1, "Comercio libre sube el oro");
ok(g.adoptIdea(A, "comercio"), "no se repite"); ok(g.ideaCost(A) === 160, "la siguiente cuesta más");
// eventos: fuerza uno y resuélvelo
for (let k = 0; k < 2; k++) for (const E of g.EVENTS) { A.evt = { id: E.id, at: g.tick }; A.gold = 1e7; A.troops = 1e5; ok(g.resolveEvent(A, k) === null && !A.evt, "evento " + E.id + "/" + k); }
// los eventos aparecen y se resuelven solos (bots) y por tiempo (humano)
g.tick = 5000; A.evtAt = 0; A.evt = null; g.stepPolitica(); ok(A.evt, "al humano le llega un evento"); 
g.tick += 700; g.stepPolitica(); ok(!A.evt, "si no decide, se aplica la primera opción");
console.log(bad ? "FALLÓ" : "política OK"); process.exit(bad ? 1 : 0);
