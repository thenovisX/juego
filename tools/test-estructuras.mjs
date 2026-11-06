// Rediseño: población x100 sin subir el oro, estructuras de oro nuevas, templo, cuartel/reclutar, posturas, retirar/reforzar.
import fs from "node:fs";
import vm from "node:vm";
const ctx = vm.createContext({ console, performance, atob, Math, setTimeout });
vm.runInContext(fs.readFileSync("dist/sim.js", "utf8") + `
setupWorld();
this.__u = { setupWorld, newGame, players, placeBuilding, canBuild, stats, buildings, owner, terrain, spawnAt, tilesOf, happyTarget, bCost, refreshEff,
  recruit, setStance, tileCost, launchAttack, recallAttack, reinforceAttack, borderCandidates, sendReinforcements, rel, attacks: ()=>attacks, W, POP_X, BT,
  set tick(v){ tick=v; }, get tick(){ return tick; } };`, ctx);
const g = ctx.__u; let fail = 0; const ok = (c, m) => { console.log((c ? "OK  " : "FALLO ") + m); if (!c) fail++; };
g.setupWorld(); g.newGame("T", 5, 1);
const me = g.players[0];
let c = 0; for (let y = 200; y < 330 && !c; y++) for (let x = 900; x < 1100; x++) { const i = y * g.W + x; if (g.terrain[i] === 1 && g.owner[i] < 0) { c = i; break; } }
g.spawnAt(me, c % g.W, (c / g.W) | 0, 12);
ok(me.troops === 700 * g.POP_X, `población inicial ×100 (${me.troops})`);
const base = g.stats(me);
me.troops *= 3; ok(Math.abs(g.stats(me).inc - base.inc) < 1e-6, "el oro que ganas NO depende de la población");
const L = g.tilesOf[me.id], city = g.buildings.find(b => b.owner === me.id && b.t === "city");
const free = (dx, dy) => { const i = ((city.y + dy) * g.W + city.x + dx); return i; };
ok(typeof g.canBuild(me, "market", free(30, 0)) === "string", "mercado lejos de una ciudad se rechaza");
me.gold = 1e9; me.res.done.mint = true;
const at = (dx, dy) => L.find(i => Math.abs((i % g.W) - city.x - dx) < 2 && Math.abs(((i / g.W) | 0) - city.y - dy) < 2);
const iM = at(7, 0); ok(iM !== undefined && g.canBuild(me, "market", iM) === null, "mercado junto a una ciudad se permite");
g.placeBuilding(me, "market", iM, true); g.tick = 100; g.refreshEff();
const m = g.buildings.find(b => b.t === "market"); ok(m.eff === 250 * 1, `mercado con 1 ciudad = +250 oro/s base ×GOLD_X (${m.eff})`);
ok(g.stats(me).inc - base.inc > 0, "el mercado sube los ingresos");
const iMint = at(-8, 0); ok(typeof g.canBuild(me, "mint", iMint) === "string", "casa de la moneda sin mina cerca se rechaza");
const iMine = L.find(i => g.canBuild(me, "mine", i) === null && Math.abs((i % g.W) - city.x) < 9 && Math.abs(((i / g.W) | 0) - city.y) < 9 && Math.abs(((i / g.W) | 0) - city.y) > 3); console.log("mine tile", iMine); g.placeBuilding(me, "mine", iMine, true);
const iMint2 = L.find(i => g.canBuild(me, "mint", i) === null);
ok(iMint2 !== undefined, "casa de la moneda con mina cerca se permite");
g.placeBuilding(me, "mint", iMint2, true); g.refreshEff(); ok(g.buildings.find(b => b.t === "mint").eff === (2 + 1.5) * 100, "casa de la moneda = 200 + 150 por mina");
const h0 = g.happyTarget(me); g.placeBuilding(me, "temple", at(10, 4), true); ok(g.happyTarget(me) - h0 === 4, "templo +4 de felicidad");
// cuartel y reclutamiento
ok(g.recruit(me) === "Necesitas un Cuartel terminado.", "sin cuartel no se recluta");
const max0 = g.stats(me).max; g.placeBuilding(me, "barracks", at(-10, -5), true);
ok(g.stats(me).max - max0 === 1000 * g.POP_X, "cuartel +100.000 de población máxima");
g.placeBuilding(me, "bank", at(-20, 10), true); g.buildings[g.buildings.length - 1].store = { piedra: 500, madera: 500, hierro: 500, comida: 500 };
me.troops = 1000; const gold0 = me.gold; ok(g.recruit(me) === null && me.troops === 21000 && gold0 - me.gold === 30000, "reclutar: +20.000 tropas por 30.000 de oro");
ok(typeof g.recruit(me) === "string", "el cuartel descansa tras reclutar");
// posturas
const enemy = g.players[1], ei = g.tilesOf[enemy.id][0];
const c1 = g.tileCost(me.id, enemy.id, ei); g.setStance(me, "agg"); const c2 = g.tileCost(me.id, enemy.id, ei); g.setStance(me, "bal");
enemy.stance = "def"; const c3 = g.tileCost(me.id, enemy.id, ei);
ok(Math.abs(c2 / c1 - 1.3) < 1e-9 && Math.abs(c3 / c1 - 1.4) < 1e-9, "postura ofensiva +30% bajas; defensiva del rival +40% de coste");
// retirar / reforzar
me.troops = 100000; g.setStance(me, "bal"); enemy.stance = "bal";
const cands = g.borderCandidates(me.id, -1); g.launchAttack(me.id, -1, 20000, cands);
ok(g.attacks().some(a => a.att === me.id), "ataque lanzado");
const r1 = g.reinforceAttack(me, -1, 0.25); ok(r1 > 0, `reforzar manda ${r1} tropas`);
const t0 = me.troops, back = g.recallAttack(me, -1); ok(back > 20000 && me.troops - t0 === back && !g.attacks().some(a => a.att === me.id), "retirar devuelve las tropas a la reserva");
// refuerzos a aliado
ok(typeof g.sendReinforcements(me.id, enemy.id, 0.2) === "string", "sin alianza no hay refuerzos");
g.rel(me.id, enemy.id).ally = true; enemy.troops = 1000; const a0 = me.troops;
const given = g.sendReinforcements(me.id, enemy.id, 0.2); ok(given > 0 && a0 - me.troops === given && enemy.troops === 1000 + given, "refuerzos a un aliado");
console.log(fail ? "FALLOS: " + fail : "estructuras OK"); process.exit(fail ? 1 : 0);
