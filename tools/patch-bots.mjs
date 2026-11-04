// Script de un solo uso: bots más inteligentes (planificación, red de estaciones, mejoras, defensa reactiva,
// coalición contra el líder, diplomacia según fuerza y tamaño del ataque según la ventaja).
import fs from "node:fs";
const E = (p, f) => fs.writeFileSync(p, f(fs.readFileSync(p, "utf8")));
const rep = (s, a, b) => { if (!s.includes(a)) throw new Error("falta: " + a.slice(0, 80)); return s.replace(a, b); };

E("src/sim/ai.ts", s => {
  s = rep(s, "function botThink(p){", `// Coloca un edificio cerca de otro (p. ej. una estación junto a una mina)
function placeNear(p,t,anchor,r){
  for(let k=0;k<14;k++){ const x=((anchor.x+((Math.random()*2-1)*r|0))%W+W)%W, y=Math.max(0,Math.min(H-1,anchor.y+((Math.random()*2-1)*r|0))), i=y*W+x;
    if(terrain[i] && !canBuild(p,t,i)){ placeBuilding(p,t,i,false); return true; } }
  return false;
}
function botThink(p){`);

  s = rep(s, '  if(p.gold>bCost(p,"airport") && p.tiles>15000', `  const underAttack=attacks.some(a=>a.def===p.id && a.att!==p.id);
  // red de estaciones: conecta minas, ciudades y puertos para producir y exportar más
  if(p.gold>bCost(p,"station")*1.5 && p.cnt.station<Math.min(4,1+(p.cnt.mine+p.cnt.city)/3) && p.cnt.mine+p.cnt.city+p.cnt.port>=2 && Math.random()<0.25){
    const anchors=buildings.filter(b=>!b.dead&&b.owner===p.id&&(b.t==="mine"||b.t==="city"||b.t==="port"));
    if(anchors.length) placeNear(p,"station",anchors[(Math.random()*anchors.length)|0],10);
  }
  // defensa reactiva: si le atacan, fortaleza en el frente
  if(underAttack && s.front.length && p.gold>bCost(p,"fort")*1.2 && p.cnt.fort<p.tiles/3000+1) tryPlace("fort",s.front);
  // mejoras: gasta el excedente en lo que más rinde (prefiere lo barato y útil)
  if(Math.random()<0.2){
    let pick=null, pv=0;
    for(const b of buildings){ if(b.dead||b.owner!==p.id||b.done>tick||b.lvl>=MAX_LVL) continue;
      const w={mine:3,city:3,port:1.5,station:1.5,airport:1.5,silo:1,sam:hit?2.5:1,fort:underAttack?2.5:1}[b.t]||1, c=upCost(b);
      if(p.gold>c*2 && w/Math.log(c)>pv){ pv=w/Math.log(c); pick=b; } }
    if(pick) upgradeBuilding(p,pick);
  }
  if(p.gold>bCost(p,"airport") && p.tiles>15000`);

  s = rep(s, `  if(Math.random()<0.03 && s.enemies.size){
    const arr=[...s.enemies.keys()], o=arr[(Math.random()*arr.length)|0];
    if(players[o].isBot && !peaceful(p.id,o) && op(p.id,o)>-20 && op(o,p.id)>-20) signPact(p.id,o,Math.random()<0.6?"nap":"trade");
  }`, `  // si un vecino es bastante más fuerte, pide no agresión; con vecinos amistosos firma comercio
  if(s.enemies.size && Math.random()<0.08){
    for(const o of s.enemies.keys()){ const e=players[o]; if(!e.isBot) continue; const r=peek(p.id,o);
      if(e.troops>p.troops*1.3 && !peaceful(p.id,o) && op(o,p.id)>-30){ signPact(p.id,o,"nap"); break; }
      if(!(r&&r.trade) && op(p.id,o)>0 && op(o,p.id)>0 && p.B.port.length){ signPact(p.id,o,"trade"); break; } }
  }`);

  s = rep(s, "  // ataques\n  if(p.troops < st.max*p.aggro) return;", `  // coalición: si alguien domina el mapa, los bots se vuelven contra él
  const leader=players.reduce((m:any,q:any)=>q.alive&&q.tiles>(m?m.tiles:0)?q:m,null);
  if(leader && leader!==p && leader.tiles>landTotal*0.22 && !peaceful(p.id,leader.id) && p.focus<0) p.focus=leader.id;
  if(p.focus>=0 && !players[p.focus].alive) p.focus=-1;
  // ataques
  if(p.troops < st.max*p.aggro) return;`);

  s = rep(s, "p.troops*(0.35+Math.random()*0.25),borderCandidates(p.id,target)",
    "p.troops*Math.max(0.3,Math.min(0.75,0.3+0.2*Math.log(Math.max(1,p.troops/Math.max(1,players[target].troops))))),borderCandidates(p.id,target)");
  return s;
});
console.log("parche de bots aplicado");
