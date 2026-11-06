// Prueba del multijugador: servidor real + 2 clientes (cada uno con su propia copia de la simulación, sin DOM).
// Comprueba que tras 600 turnos con órdenes de los dos lados (hechas como las haría la interfaz) los dos mundos son
// idénticos, que el servidor no detecta desincronización y que un jugador que se va pasa a la IA.
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { createServer } = require("../server/server.js");
const code = fs.readFileSync("dist/sim.js", "utf8");
const fail = m => { console.error("FALLO: " + m); process.exit(1); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function makeClient(name) {
  const ctx = vm.createContext({ console, performance, atob, Math, setTimeout });
  vm.runInContext(code + `\nthis.__api={ setupWorld, Hooks, netBegin, netOnMessage, netAdvance, netChecksum, players, owner, buildings, attacks, rels, tilesOf, bldAt, N,
    get tick(){return tick}, get me(){return me}, set netSend(f){ netSend=f },
    placeBuilding:(...a)=>placeBuilding(...a), launchAttack:(...a)=>launchAttack(...a), borderCandidates:(...a)=>borderCandidates(...a), propose:(...a)=>propose(...a),
    signPact:(...a)=>signPact(...a), setTax:(...a)=>setTax(...a), canBuild:(...a)=>canBuild(...a), stats:(...a)=>stats(...a), setStance:(...a)=>setStance(...a) }; // por nombre, como la interfaz (así pasan por las funciones interceptadas)`, ctx);
  const api = ctx.__api; api.setupWorld();
  api.name = name; api.offers = []; api.desync = false; api.msgs = [];
  api.Hooks.offer = (from, type) => api.offers.push([from, type]);
  api.Hooks.log = () => {};
  return api;
}
function connect(url, api) {
  const ws = new WebSocket(url); api.ws = ws;
  api.opened = new Promise(r => ws.addEventListener("open", r));
  ws.addEventListener("message", ev => {
    const m = JSON.parse(ev.data);
    if (m.t === "start") { api.netSend = x => ws.send(JSON.stringify(x)); api.netBegin(m); api.started = true; }
    else if (m.t === "desync") { api.desync = true; api.netOnMessage(m); }
    else if (m.t === "turn") { api.netOnMessage(m); api.netAdvance(50); api.onTurn && api.onTurn(); }
    else api.msgs.push(m);
  });
  api.send = x => ws.send(JSON.stringify(x));
  api.wait = async (pred, ms = 8000) => { const t0 = Date.now(); while (!pred()) { if (Date.now() - t0 > ms) fail("tiempo agotado esperando " + pred); await sleep(10); } };
}
const hashWorld = api => { let h = 2166136261 >>> 0; for (let i = 0; i < api.N; i++) h = Math.imul(h ^ (api.owner[i] + 2), 16777619) >>> 0;
  for (const p of api.players) { h = Math.imul(h ^ Math.floor(p.troops), 16777619) >>> 0; h = Math.imul(h ^ Math.floor(p.gold), 16777619) >>> 0; } return h; };

const server = createServer();
await new Promise(r => server.listen(0, r));
const url = "ws://127.0.0.1:" + server.address().port;

async function scenario(run) {
  const A = makeClient("Ana"), B = makeClient("Beto");
  connect(url, A); connect(url, B);
  await A.opened; await B.opened;
  A.send({ t: "create", name: "Ana" });
  await A.wait(() => A.msgs.some(m => m.t === "room"));
  const room = A.msgs.find(m => m.t === "room").code;
  B.send({ t: "join", code: room, name: "Beto" });
  await A.wait(() => A.msgs.filter(m => m.t === "room").pop().players.length === 2);
  A.send({ t: "settings", bots: 20, diff: 1, map: "tierra" });
  A.send({ t: "start" });
  await A.wait(() => A.started && B.started);
  if (A.me.id !== 0 || B.me.id !== 1) fail("huecos mal asignados");
  await run(A, B);
  A.ws.close(); B.ws.close();
  await sleep(100);
}

// ---- 1) Dos jugadores, 600 turnos, órdenes cruzadas y "ruido" de interfaz (leer estado a mitad de partida)
await scenario(async (A, B) => {
  const free = api => { const L = api.tilesOf[api.me.id]; for (let k = 0; k < L.length; k += 7) if (!api.canBuild(api.me, "farm", L[k])) return L[k]; return L[0]; };
  for (const api of [A, B]) api.onTurn = () => { api.stats(api.me); api.canBuild(api.me, "city", api.tilesOf[api.me.id][0]); };
  const done = new Set(), once = (t, n, f) => { if (t >= n && !done.has(n)) { done.add(n); f(); } };
  const t0 = Date.now();
  while (Math.min(A.tick, B.tick) < 600) {
    const t = Math.min(A.tick, B.tick);
    once(t, 20, () => { A.placeBuilding(A.me, "farm", free(A), false); B.placeBuilding(B.me, "mine", free(B), false); });
    once(t, 40, () => { A.launchAttack(A.me.id, -1, A.me.troops * 0.4, A.borderCandidates(A.me.id, -1)); B.launchAttack(B.me.id, -1, B.me.troops * 0.5, []); B.setTax(B.me, 30); B.setStance(B.me, "agg"); });
    once(t, 60, () => { A.propose(0, 1, "nap"); A.propose(0, 5, "trade"); });
    once(t, 80, () => { if (!B.offers.length) fail("B no recibió la oferta de A"); B.signPact(B.offers[0][0], B.me.id, B.offers[0][1]); });
    once(t, 200, () => { A.launchAttack(A.me.id, -1, A.me.troops * 0.5, A.borderCandidates(A.me.id, -1)); });
    await sleep(5);
    if (Date.now() - t0 > 120000) fail("la prueba tarda demasiado (tick A=" + A.tick + ", B=" + B.tick + ")");
  }
  await A.wait(() => A.tick === B.tick, 6000);
  if (A.desync || B.desync) fail("el servidor detectó desincronización");
  if (hashWorld(A) !== hashWorld(B)) fail("los mundos de A y B son distintos (tick " + A.tick + ")");
  if (A.netChecksum() !== B.netChecksum()) fail("checksums distintos");
  const pact = A.rels.get(0 * 1024 + 1); if (!pact || !(pact.nap > A.tick)) fail("el pacto entre humanos no se firmó");
  if (A.players[0].tax !== 10 || A.players[1].tax !== 30 || B.players[1].tax !== 30) fail("la orden de impuestos no se aplicó en todos");
  if (A.players[0].tiles < 10 || A.players[1].tiles < 10) fail("los jugadores no han crecido");
  console.log(`sync OK: ${A.tick} turnos, ${A.players.length} reinos, tierras A=${A.players[0].tiles} B=${A.players[1].tiles}, mundo idéntico (hash ${hashWorld(A).toString(16)})`);
});

// ---- 2) Un jugador se va: su reino pasa a la IA para el resto
await scenario(async (A, B) => {
  await A.wait(() => A.tick >= 50);
  B.ws.close();
  await A.wait(() => A.players[1].isBot, 4000);
  const t = A.tick; await A.wait(() => A.tick > t + 30, 4000);
  if (A.desync) fail("desincronización tras la salida");
  console.log("salida OK: el reino de B pasa a la IA y la partida sigue");
});

// ---- 3) Órdenes inválidas no rompen nada
await scenario(async (A, B) => {
  for (const c of [["build", "x", 1], ["atk", "a", 1e99], ["tax", 999], ["msl", "atom", -5], ["nada"], [], "zz", ["prop", 1, "ally"], ["accept", 7, "ally"]]) A.send({ t: "cmd", c });
  A.send({ t: "cmd", c: ["x".repeat(400)] }); A.ws.send("no es json"); A.ws.send(JSON.stringify({ t: "cmd" }));
  const t = A.tick; await A.wait(() => A.tick > t + 40 && B.tick > t + 40, 6000);
  if (A.desync || B.desync) fail("las órdenes inválidas desincronizaron");
  console.log("basura OK: órdenes inválidas ignoradas");
});
server.close();
console.log("test-net OK"); process.exit(0);
