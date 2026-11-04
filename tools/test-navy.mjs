// Escenario sin navegador: un buque de guerra intercepta un carguero ajeno y se queda su oro; conquista total = botín.
import fs from "node:fs"; import vm from "node:vm";
const ctx = vm.createContext({ console, performance, atob, Math, setTimeout });
vm.runInContext(fs.readFileSync("dist/sim.js", "utf8") + "\nthis.__a={ setupWorld,newGame,gameTick,players,placeBuilding,canBuild,tilesOf,coastal,rel,peaceful,sendTrade,buyWarship,get tships(){return tships},stepTrade,stepNavy,get wships(){return wships},eliminate,get tick(){return tick},set spawned(v){spawned=v}, set tick(v){tick=v} };", ctx);
const g = ctx.__a; g.setupWorld(); g.newGame("T", 60, 1); g.spawned = true;
for (let i = 0; i < 2500; i++) g.gameTick();
const port = p => { for (const i of g.tilesOf[p.id]) if (g.coastal(i) && !g.canBuild(p, "port", i)) { g.placeBuilding(p, "port", i, true); return true; } return false; };
const cand = g.players.filter(p => p.isBot && p.alive && p.tiles > 8 && port(p));
let ok = false, a, b, c;
outer: for (a of cand) for (b of cand) { if (a === b) continue; g.rel(a.id, b.id).trade = true; if (g.sendTrade(a.id, b.id) === null) { for (c of cand) { if (c === a || c === b) continue; ok = true; break outer; } } }
if (!ok) { console.log("sin escenario: candidatos=" + cand.length + " e=" + (cand.length>1?g.sendTrade(cand[0].id,cand[1].id):"-")); process.exit(0); }
g.rel(c.id, a.id).trade = false; g.rel(c.id, a.id).ally = false; g.wships.splice(0); const val = g.tships[g.tships.length - 1].val; c.gold = 1e9; const w = g.buyWarship(c);
g.wships.splice(0, g.wships.length - 1); const ship = g.tships.filter(s => s.from !== c.id && !(g.rel(c.id, s.from).trade) && !s.done && !g.peaceful(c.id, s.from) && s.from !== c.id).reduce((m, s) => ((s.path.length - s.pi) > (m.path.length - m.pi) ? s : m)); const w0 = g.wships[0]; w0.x = ship.x; w0.y = ship.y; w0.zx = ship.x; w0.zy = ship.y; w0.route = null; // cerca del carguero (la ruta es por mar)
const before = c.gold, st0 = c.st.trade||0; c.rival = -1; for (let i = 0; i < 80 && !ship.done; i++) { g.tick++; g.stepTrade(); g.stepNavy(); }
console.log(`compra=${w}, capturado por mi buque=${(c.st.trade||0)-st0>0?"sí (+"+Math.round((c.st.trade||0)-st0)+" de oro)":"no"}, owner ships=${g.wships.length}`);
if ((c.st.trade || 0) - st0 <= 0) { console.error("FALLO: el buque no capturó el carguero"); process.exit(1); }
// botín por conquista total
const loot = b.gold; const a0 = c.gold; b.gold = 5000; g.eliminate(b.id, c.id); console.log("botín:", c.gold - a0 >= 5000 ? "sí" : "no");
