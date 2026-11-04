// Script de un solo uso: reduce el coste por tick de buques, aviones y bots.
import fs from "node:fs";
const E = (p, f) => fs.writeFileSync(p, f(fs.readFileSync(p, "utf8")));
const rep = (s, a, b) => { if (!s.includes(a)) throw new Error("falta: " + a.slice(0, 90)); return s.replace(a, b); };

// Los cargueros muertos se marcan como "done" para no comprobar con includes() en cada tick
E("src/sim/trade.ts", s => rep(s, "tships=tships.filter(s=>!s.done && players[s.from].alive && players[s.to].alive);",
  "for(const s of tships) if(!players[s.from].alive||!players[s.to].alive) s.done=true;\n  tships=tships.filter(s=>!s.done);"));
E("src/sim/air.ts", s => {
  s = rep(s, "planes=planes.filter(s=>!s.done && players[s.from].alive && players[s.to].alive);",
    "for(const s of planes) if(!players[s.from].alive||!players[s.to].alive) s.done=true;\n  planes=planes.filter(s=>!s.done);");
  s = rep(s, "  for(const w of wplanes){\n    const P=players[w.owner]; if(!P.alive){ w.dead=true; continue; }\n    if(w.target && (w.target.done || !planes.includes(w.target))) w.target=null;\n    if(!w.target){ let bd=WPLANE_RANGE;",
    "  let wi=0;\n  for(const w of wplanes){ wi++;\n    const P=players[w.owner]; if(!P.alive){ w.dead=true; continue; }\n    if(w.target && w.target.done) w.target=null;\n    if(!w.target && (tick+wi)%4===0){ let bd=WPLANE_RANGE;");
  return s;
});
E("src/sim/navy.ts", s => {
  s = rep(s, "  for(const w of wships){\n    const P=players[w.owner]; if(!P.alive){ w.dead=true; continue; }\n    if(w.target && (w.target.done || !tships.includes(w.target))) w.target=null;\n    if(!w.target){ let bd=WSHIP_RANGE;",
    "  let wi=0;\n  for(const w of wships){ wi++;\n    const P=players[w.owner]; if(!P.alive){ w.dead=true; continue; }\n    if(w.target && w.target.done) w.target=null;\n    if(!w.target && (tick+wi)%4===0){ let bd=WSHIP_RANGE;");
  return s;
});
// El líder se calcula una vez por tick, no una vez por bot
E("src/sim/ai.ts", s => {
  s = rep(s, "function botThink(p){", "let leaderTick=-1, leaderCache: any=null;\nfunction currentLeader(){\n  if(leaderTick!==tick){ leaderTick=tick; leaderCache=players.reduce((m:any,q:any)=>q.alive&&q.tiles>(m?m.tiles:0)?q:m,null); }\n  return leaderCache;\n}\nfunction botThink(p){");
  return rep(s, "const leader=players.reduce((m:any,q:any)=>q.alive&&q.tiles>(m?m.tiles:0)?q:m,null);", "const leader=currentLeader();");
});
console.log("parche de rendimiento aplicado");
