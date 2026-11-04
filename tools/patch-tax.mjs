// Script de un solo uso: conecta los impuestos con el estado, la economía, la IA y la interfaz.
import fs from "node:fs";
const E = (p, f) => fs.writeFileSync(p, f(fs.readFileSync(p, "utf8")));
const rep = (s, a, b) => { if (!s.includes(a)) throw new Error("falta: " + a.slice(0, 80)); return s.replace(a, b); };

E("src/sim/players.ts", s => {
  s = rep(s, "troops:700,", "troops:700,tax:10,happy:80,taxWarn:0,");
  s = rep(s, "const grow = (20 + p.tiles*0.05 + (cities+net.cities*0.5)*15) * Math.max(0,1-p.troops/max) * (p.isBot?diff:1);",
    "const grow = (20 + p.tiles*0.05 + (cities+net.cities*0.5)*15) * Math.max(0,1-p.troops/max) * (p.isBot?diff:1) * unrest(p);");
  s = rep(s, "const inc = (1 + p.tiles*0.004 + (mines+net.mines*0.5)*4) * (1+0.12*tr) * GOLD_X;",
    "const taxInc = p.tiles*p.tax*0.01;\n  const inc = ((1 + p.tiles*0.004 + (mines+net.mines*0.5)*4) * (1+0.12*tr) * GOLD_X + taxInc) * unrest(p);");
  return rep(s, "return {max,grow,inc,cities,mines,tr,net};", "return {max,grow,inc,cities,mines,tr,net,taxInc};");
});
E("src/sim/loop.ts", s => rep(s, "stepAir();", "stepAir(); stepTax();"));
E("src/sim/ai.ts", s => rep(s, "  const underAttack=", "  // impuestos: sube mientras el pueblo esté contento (máx. 20 %), baja si empieza a inquietarse\n  if(p.happy<55) p.tax=Math.max(0,p.tax-5); else if(p.happy>78 && p.tax<20 && Math.random()<0.2) p.tax+=5;\n  const underAttack="));
E("tools/build.mjs", s => rep(s, '"upgrade", "trade"', '"upgrade", "tax", "trade"'));

E("index.html", s => rep(s, '  <div id="wars"></div>',
`  <div class="tax"><span class="lbl">🏛️ Impuestos <b id="taxV" class="num">10%</b></span>
    <input id="tax" type="range" min="0" max="80" step="5" value="10" aria-label="Tasa de impuestos">
    <div class="hap" title="Felicidad del pueblo: con menos de 50 baja la economía; con menos de 25 hay revueltas"><span id="hapE">😊</span><div class="meter"><div id="hapM"></div></div><b id="hapV" class="num">80</b></div></div>
  <div id="wars"></div>`));
E("css/style.css", s => s + `
#top .tax{display:flex;flex-direction:column;gap:3px;margin-top:2px}
#top .tax .lbl{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);display:flex;justify-content:space-between}
#top .tax .lbl b{color:var(--brass2)}
#tax{width:100%;accent-color:var(--brass)}
#top .hap{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center}
#top .hap .meter{margin:0}
#top .hap b{font-size:12px;min-width:22px;text-align:right}
`);
E("src/client/ui.ts", s => {
  s = rep(s, "const bldEl=document.getElementById(\"bld\")", `const taxEl=document.getElementById("tax");
taxEl.oninput=()=>{ if(me) me.tax=+taxEl.value; document.getElementById("taxV").textContent=taxEl.value+"%"; };
taxEl.addEventListener("pointerup",()=>taxEl.blur()); taxEl.addEventListener("change",()=>taxEl.blur());
const bldEl=document.getElementById("bld")`);
  return rep(s, '  document.getElementById("hGrow")', `  { const h=Math.round(me.happy); if(document.activeElement!==taxEl){ taxEl.value=me.tax; document.getElementById("taxV").textContent=me.tax+"%"; }
    const col=h>=60?"#7cc96f":h>=40?"#e0b158":"#e8584a", m=document.getElementById("hapM");
    m.style.width=h+"%"; m.style.background=col; document.getElementById("hapV").textContent=h;
    document.getElementById("hapE").textContent=h>=75?"😄":h>=55?"🙂":h>=40?"😐":h>=25?"😠":"🤬"; }
  document.getElementById("hGrow")`);
});
console.log("parche de impuestos aplicado");
