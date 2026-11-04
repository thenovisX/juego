// Script de un solo uso: aplica los efectos de nivel a cada sistema y añade el menú de mejora en la interfaz.
import fs from "node:fs";
const E = (p, f) => fs.writeFileSync(p, f(fs.readFileSync(p, "utf8")));
const rep = (s, a, b) => { if (!s.includes(a)) throw new Error("falta: " + a.slice(0, 70)); return s.replace(a, b); };

E("src/sim/players.ts", s => {
  s = rep(s, "cd:0,dead:false};", "cd:0,dead:false,lvl:1};");
  s = rep(s, "cities++; else if(b.t===\"mine\") mines += terrain[b.i]===3?2:1;", "cities+=b.lvl||1; else if(b.t===\"mine\") mines += (terrain[b.i]===3?2:1)*(b.lvl||1);");
  s = rep(s, "if(dx*dx+dy*dy<=ST_COV*ST_COV){", "if(dx*dx+dy*dy<=(ST_COV*(1+0.3*((S[k].lvl||1)-1)))**2){");
  return s;
});
E("src/sim/combat.ts", s => {
  s = rep(s, "FORT_R*FORT_R) return 2.5;", "FORT_R*FORT_R) return 2.5+0.75*((b.lvl||1)-1);");
  s = rep(s, "if(dx*dx+dy*dy>SAM_R*SAM_R) continue;", "if(dx*dx+dy*dy>(SAM_R*(1+0.2*((b.lvl||1)-1)))**2) continue;");
  s = rep(s, "b.cd=tick+SAM_CD;", "b.cd=tick+SAM_CD*(1-0.2*((b.lvl||1)-1));");
  s = rep(s, "dur:Math.max(25,bd/4),", "dur:Math.max(25,bd/4)/(best.lvl||1),");
  return s;
});
E("src/sim/trade.ts", s => rep(s, "(st.net.ports>0?1.5:1)) * GOLD_X;", "(st.net.ports>0?1.5:1)*(1+0.3*(maxLvl(p.B.port)-1))) * GOLD_X;"));
E("src/sim/air.ts", s => rep(s, "return Math.round(tradeValue(p)*0.8); }", "return Math.round(tradeValue(p)*0.8*(1+0.25*(maxLvl(p.B.airport)-1))); }"));
E("tools/build.mjs", s => rep(s, '"trade", "navy"', '"upgrade", "trade", "navy"'));

E("src/client/ui.ts", s => {
  s = rep(s, "${BT[B.t].n}${B.done>tick", "${BT[B.t].n}${B.lvl>1?\" Nv \"+B.lvl:\"\"}${B.done>tick");
  s = rep(s, "function attackAt(i){", `function openOwnBuilding(i){
  const b=bldAt[i]>=0?buildings[bldAt[i]]:null; if(!b||b.dead||b.owner!==me.id) return;
  const head=\`\${BT[b.t].e} <b>\${BT[b.t].n}</b> · nivel \${b.lvl} de \${MAX_LVL}\`;
  if(b.done>tick){ showProp(\`\${head}<br>Todavía en obras.\`,[["Cerrar",null]]); return; }
  if(b.lvl>=MAX_LVL){ showProp(\`\${head}<br>Está al nivel máximo.\`,[["Cerrar",null]]); return; }
  const c=upCost(b);
  showProp(\`\${head}<br>Mejorar a nivel \${b.lvl+1} cuesta <b>\${fmt(c)}</b> 🪙: \${UP_DESC[b.t]}.\`,
    [[\`⬆️ Mejorar · \${fmt(c)}\`,()=>{ const why=upgradeBuilding(me,b); if(why){ log(why,"bad"); sfx("err"); } else { log(\`⬆️ \${BT[b.t].n} mejorada a nivel \${b.lvl}.\`,"good"); sfx("build"); } }],["Cerrar",null]]);
}
function attackAt(i){`);
  return rep(s, "  const def=owner[i]; if(def===me.id) return;", "  const def=owner[i]; if(def===me.id){ openOwnBuilding(i); return; }");
});
E("src/sim/air.ts", s => s);
console.log("parche de mejoras aplicado");
