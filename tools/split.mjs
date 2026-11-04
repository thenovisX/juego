// Script de un solo uso: reparte el JS original (js/) en src/sim (sin DOM) y src/client (dibujo + interfaz).
import fs from "node:fs";
const R = p => fs.readFileSync(p, "utf8"), Wr = (p, s) => fs.writeFileSync(p, s);
const must = (s, a, b) => { if (!s.includes(a)) throw new Error("no encontrado: " + a); return s.replace(a, b); };

// --- loop: la cámara pasa al cliente ---
let loop = R("src/sim/loop.ts");
const iCam = loop.indexOf("// ================= Cámara");
Wr("src/client/camera.ts", loop.slice(iCam));
loop = loop.slice(0, iCam);
loop = must(loop, "  if(propOpen && propOpen.until<=tick) closeProp();\n", "  Hooks.tick(tick);\n");
loop = must(loop, 'sfx("win"); endGame(true);', "Hooks.end(true);");
Wr("src/sim/loop.ts", loop);

// --- state: el volcado de píxeles pasa al cliente ---
let st = R("src/sim/state.ts");
const iPix = st.indexOf("// ================= Render del mapa");
let pix = st.slice(iPix);
st = st.slice(0, iPix);
pix = must(pix, "const dirty = new Uint8Array(N); let dirtyList=[];\n", "");
pix = must(pix, "function markDirty(i){ if(!dirty[i]){ dirty[i]=1; dirtyList.push(i);} }\n", "");
st += "// Casillas cuyo color debe repintarse (las consume el cliente; el servidor puede ignorarlas)\nconst dirty = new Uint8Array(N); let dirtyList: number[]=[];\nfunction markDirty(i){ if(!dirty[i]){ dirty[i]=1; dirtyList.push(i);} }\n";
Wr("src/sim/state.ts", st);
Wr("src/client/pixels.ts", pix);

// --- combat ---
let cb = R("src/sim/combat.ts");
cb = must(cb, "let dangerAt=-1e9, lastAlarm=0;\n", "");
cb = cb.split("dangerAt=performance.now();").join("Hooks.danger();");
cb = must(cb, "shake=Math.min(18,6+W8.r/2);", "Hooks.shake(Math.min(18,6+W8.r/2));");
cb = cb.split("performance.now()").join("Hooks.now()");
cb = cb.split("onScreen(").join("Hooks.onScreen(");
Wr("src/sim/combat.ts", cb);

// --- ai ---
let ai = R("src/sim/ai.ts");
ai = must(ai, "!propOpen && tick-lastProp>350", "Hooks.canOffer()");
ai = must(ai, "offerToPlayer(p.id,type)", "Hooks.offer(p.id,type)");
Wr("src/sim/ai.ts", ai);

// --- players: fin de partida ---
let pl = R("src/sim/players.ts");
pl = must(pl, 'sfx("lose"); log("💀 Tu reino ha caído.","bad"); endGame(false);', 'Hooks.sfx("lose"); Hooks.log("💀 Tu reino ha caído.","bad"); Hooks.end(false);');

// --- llamadas a log/sfx en la simulación -> Hooks ---
for (const f of ["players", "combat", "trade", "loop", "ai"]) {
  let s = f === "players" ? pl : R(`src/sim/${f}.ts`);
  s = s.replace(/(?<![\w.])log\(/g, "Hooks.log(").replace(/(?<![\w.])sfx\(/g, "Hooks.sfx(");
  s = s.replace(/Hooks\.Hooks\./g, "Hooks.");
  Wr(`src/sim/${f}.ts`, s);
}

// --- fmt pasa a util (sim) ---
let ui = R("src/client/ui.ts");
const m = ui.match(/const fmt=.*\n/);
Wr("src/sim/util.ts", `// Formato compacto de números (1.2k, 3.4M)\n${m[0].replace("const fmt=n=>", "function fmt(n){").replace(/;\s*$/, "")} }\n`);
ui = ui.replace(m[0], "");
Wr("src/client/ui.ts", ui);

// quitar "use strict" repetido (se añade una sola vez al empaquetar)
for (const d of ["sim", "client"]) for (const f of fs.readdirSync(`src/${d}`)) {
  const p = `src/${d}/${f}`; Wr(p, R(p).replace(/^"use strict";\n/, ""));
}
console.log("ok");
