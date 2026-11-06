// Todos los mapas sin navegador: genera cada uno, comprueba su geografía (tierra, costura sin tierra en los mapas con bordes),
// coloca a los reinos, simula y mide el coste por tick. Opcional: node tools/test-mapas.mjs gigante  (solo ese mapa)
import fs from "node:fs";
import vm from "node:vm";
const ctx = vm.createContext({ console, performance, atob, Math, setTimeout });
vm.runInContext(fs.readFileSync("dist/sim.js", "utf8") + `
this.__m = { setupWorld, newGame, gameTick, saveGame, loadGame, mapList, get players(){ return players; }, get terrain(){ return terrain; }, get owner(){ return owner; },
  get W(){ return W; }, get H(){ return H; }, get N(){ return N; }, get WRAP(){ return WRAP; }, get landTotal(){ return landTotal; }, get tick(){ return tick; }, get me(){ return me; },
  set spawned(v){ spawned = v; }, get TS(){ return TS; } };`, ctx);
const g = ctx.__m, only = process.argv[2];
let bad = 0;
for (const m of g.mapList()) {
  if (only && m.id !== only) continue;
  const t0 = performance.now(); g.setupWorld(m.id); const tGen = performance.now() - t0;
  const { W, H, N, terrain } = g;
  let seam = 0; if (!g.WRAP) for (let y = 0; y < H; y++) if (terrain[y * W] || terrain[y * W + W - 1]) seam++;
  const pct = 100 * g.landTotal / N, nb = m.bots[1];
  g.newGame("Prueba", nb, 1); g.spawned = true;
  const placed = g.players.filter(p => p.tiles > 0).length;
  const t1 = performance.now(); const T = m.giant ? 1500 : 3000; for (let i = 0; i < T; i++) g.gameTick();
  const per = (performance.now() - t1) / T, alive = g.players.filter(p => p.alive).length;
  let own = 0; for (let i = 0; i < N; i++) if (g.owner[i] >= 0) own++;
  const ok = g.tick === T && seam === 0 && pct > 8 && pct < 70 && placed >= nb * 0.9 && alive >= 2 && own > 0;
  // guardar -> cargar en el mismo mapa
  const txt = JSON.stringify(g.saveGame()), back = g.loadGame(JSON.parse(txt));
  const ok2 = back === null;
  console.log(`${ok && ok2 ? "OK " : "FALLO"} ${m.id.padEnd(12)} ${W}x${H} (${(N / 1e6).toFixed(2)}M) tierra ${pct.toFixed(0)}% generar ${(tGen / 1000).toFixed(1)}s reinos ${placed}/${nb} vivos ${alive} ${per.toFixed(1)} ms/tick guardado ${(txt.length / 1024 / 1024).toFixed(1)} MB${seam ? " COSTURA CON TIERRA " + seam : ""}${back ? " carga: " + back : ""}`);
  if (!(ok && ok2)) bad++;
}
if (bad) { console.error("FALLO"); process.exit(1); } else console.log("mapas OK");
