// Script de un solo uso: integra los materiales (src/sim/material.ts) con el estado, la economía, el guardado y la interfaz.
import fs from "node:fs";
const E = (p, f) => fs.writeFileSync(p, f(fs.readFileSync(p, "utf8")));
const rep = (s, a, b) => { if (!s.includes(a)) throw new Error("falta: " + a.slice(0, 90)); return s.replace(a, b); };

E("src/sim/state.ts", s => rep(s, "  station:{",
  '  sawmill:{n:"Aserradero", e:"🪚", key:"w", base:30000, mul:1.4, desc:"Produce madera (solo en bosque)"},\n' +
  '  farm:{n:"Granja", e:"🌾", key:"f", base:30000, mul:1.4, desc:"Produce comida (solo en llanura)"},\n' +
  '  bank:{n:"Banco de materiales", e:"📦", key:"m", base:50000, mul:1.4, desc:"Guarda hasta 500 de cada material y lo reparte por la red de estaciones"},\n' +
  "  station:{"));

E("src/sim/players.ts", s => {
  s = rep(s, "cnt:{city:0,mine:0,fort:0,port:0,sam:0,silo:0,station:0,airport:0}", "cnt:Object.fromEntries(Object.keys(BT).map(k=>[k,0]))");
  s = rep(s, "B:{fort:[],port:[],sam:[],silo:[],station:[],airport:[]}", "B:Object.fromEntries(Object.keys(BT).map(k=>[k,[]]))");
  s = rep(s, 'if(t==="port" && !coastal(i)) return "El puerto tiene que estar junto al mar.";',
    'if(t==="port" && !coastal(i)) return "El puerto tiene que estar junto al mar.";\n  if(t==="sawmill" && terrain[i]!==2) return "El aserradero va en un bosque.";\n  if(t==="farm" && terrain[i]!==1) return "La granja va en una llanura.";');
  s = rep(s, "if(!instant){ p.gold-=bCost(p,t); p.st.built++; }",
    'if(!instant){ p.gold-=bCost(p,t); p.st.built++; }\n  if(!instant && !p.isBot && MAT_COST[t]){ b.need={...MAT_COST[t]}; b.done=Infinity; }\n  if(t==="bank") b.store={piedra:0,madera:0,hierro:0,comida:0};');
  s = rep(s, "const S=p.B.station.filter(b=>b.done<=tick); if(!S.length) return out;",
    "for(const b of buildings) if(b.owner===p.id) b.netId=-1;\n  const S=p.B.station.filter(b=>b.done<=tick); if(!S.length) return out;");
  s = rep(s, "  const comp=new Map();",
    "  for(const b of buildings){ if(b.dead||b.owner!==p.id) continue;\n    for(let k=0;k<S.length;k++){ const dx=wdx(S[k].x,b.x), dy=S[k].y-b.y;\n      if(dx*dx+dy*dy<=(ST_COV*(1+0.3*((S[k].lvl||1)-1)))**2){ b.netId=f(k); break; } } }\n  const comp=new Map();");
  return s;
});

E("src/sim/loop.ts", s => rep(s, "stepTax();", "stepTax(); stepMaterials();"));
E("tools/build.mjs", s => rep(s, '"upgrade", "tax"', '"upgrade", "tax", "material"'));

E("src/sim/save.ts", s => {
  s = rep(s, "buildings: buildings.filter((b:any)=>!b.dead).map((b:any)=>({t:b.t,i:b.i,owner:b.owner,done:b.done,cd:b.cd,lvl:b.lvl||1})),",
    "buildings: buildings.filter((b:any)=>!b.dead).map((b:any)=>({t:b.t,i:b.i,owner:b.owner,done:isFinite(b.done)?b.done:null,cd:b.cd,lvl:b.lvl||1,need:b.need||null,stock:b.stock||0,store:b.store||null})),");
  s = rep(s, "B:{fort:[],port:[],sam:[],silo:[],station:[],airport:[]}", "B:Object.fromEntries(Object.keys(BT).map(k=>[k,[]]))");
  return rep(s, "const nb:any={...b,x:b.i%W,y:(b.i/W)|0,dead:false};",
    "const nb:any={...b,done:b.done===null?Infinity:b.done,x:b.i%W,y:(b.i/W)|0,dead:false}; if(!nb.need) delete nb.need; if(!nb.store) delete nb.store;");
});

E("src/client/render.ts", s => rep(s, '    if(building){ ctx.strokeStyle="#f5d38c";',
  '    if(building && !isFinite(b.done)) ctx.fillText("📦",sx+sz*0.55,sy-sz*0.55);\n    if(building && isFinite(b.done)){ ctx.strokeStyle="#f5d38c";'));

E("index.html", s => rep(s, '  <div id="wars"></div>',
  '  <div id="mats" class="mats" title="Materiales almacenados en minas, aserraderos, granjas y bancos"></div>\n  <div id="wars"></div>'));
E("css/style.css", s => s + "#top .mats{font-family:var(--f-num);font-size:12px;color:var(--muted);margin-top:2px}\n");

E("src/client/ui.ts", s => {
  s = rep(s, "BT[t].key,BT[t].desc,()=>toggleMode({k:\"build\",t})", "BT[t].key,BT[t].desc+matText(t),()=>toggleMode({k:\"build\",t})");
  s = rep(s, "sfx(\"build\"); log(`${BT[mode.t].e} ${BT[mode.t].n} en construcción (5 s).`);",
    "sfx(\"build\"); { const nb=buildings[buildings.length-1]; log(nb.need?`📦 ${BT[mode.t].n}: esperando materiales. Conéctala con una estación a un productor.`:`${BT[mode.t].e} ${BT[mode.t].n} en construcción (5 s).`); }");
  s = rep(s, "nivel ${b.lvl} de ${MAX_LVL}`;", "nivel ${b.lvl} de ${MAX_LVL}${matInfo(b)?\"<br>\"+matInfo(b):\"\"}`;");
  return rep(s, '  document.getElementById("hGrow")',
    '  { const t=matTotals(me); document.getElementById("mats").textContent=RES.map(r=>RES_E[r]+" "+fmt(t[r])).join("   "); }\n  document.getElementById("hGrow")');
});
console.log("parche de materiales aplicado");
