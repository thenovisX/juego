"use strict";
// ================= IA =================
function sampleNeighbors(p,count){
  const L=tilesOf[p.id], res={neutral:0,enemies:new Map(),coast:[],front:[]};
  if(!L.length) return res;
  for(let s=0;s<count;s++){ const i=L[(Math.random()*L.length)|0]; nbs(i,NB);
    for(const j of NB){ if(j<0) continue; if(!terrain[j]){ if(res.coast.length<3) res.coast.push(i); continue; }
      const o=owner[j]; if(o===p.id) continue; if(o<0) res.neutral++; else { res.enemies.set(o,(res.enemies.get(o)||0)+1); if(res.front.length<6 && !peaceful(p.id,o)) res.front.push(i); } } }
  return res;
}
// Coloca un edificio cerca de otro (p. ej. una estación junto a una mina)
function placeNear(p,t,anchor,r){
  for(let k=0;k<14;k++){ const x=((anchor.x+((Math.random()*2-1)*r|0))%W+W)%W, y=Math.max(0,Math.min(H-1,anchor.y+((Math.random()*2-1)*r|0))), i=y*W+x;
    if(terrain[i] && !canBuild(p,t,i)){ placeBuilding(p,t,i,false); return true; } }
  return false;
}
let leaderTick=-1, leaderCache: any=null;
function currentLeader(){
  if(leaderTick!==tick){ leaderTick=tick; leaderCache=players.reduce((m:any,q:any)=>q.alive&&q.tiles>(m?m.tiles:0)?q:m,null); }
  return leaderCache;
}
function botThink(p){
  const st=stats(p), s=sampleNeighbors(p,160), L=tilesOf[p.id];
  const tryPlace=(t,pool?)=>{ for(let k=0;k<12;k++){ const i=pool?pool[(Math.random()*pool.length)|0]:L[(Math.random()*L.length)|0]; if(!canBuild(p,t,i)){ placeBuilding(p,t,i,false); return true; } } return false; };
  const hit = tick-p.lastHit<600;
  if(p.gold>bCost(p,"city") && p.cnt.city < 1+p.tiles/4000) tryPlace("city");
  else if(p.gold>bCost(p,"sam") && (hit || p.tiles>12000) && p.cnt.sam < 1+p.tiles/30000) tryPlace("sam");
  else if(p.gold>bCost(p,"mine") && p.cnt.mine < p.tiles/3000) tryPlace("mine");
  else if(p.gold>bCost(p,"sawmill") && p.cnt.sawmill<p.tiles/5000) tryPlace("sawmill");
  else if(p.gold>bCost(p,"farm") && p.cnt.farm<p.tiles/5000) tryPlace("farm");
  else if(p.gold>bCost(p,"port") && p.cnt.port===0 && s.coast.length && (s.neutral===0 || Math.random()<0.15)) tryPlace("port",s.coast);
  else if(p.gold>bCost(p,"silo") && p.tiles>18000 && p.cnt.silo===0 && tick>1800) tryPlace("silo");
  else if(p.gold>bCost(p,"fort") && s.front.length && p.cnt.fort < p.tiles/6000) tryPlace("fort",s.front);
  // impuestos: sube mientras el pueblo esté contento (máx. 20 %), baja si empieza a inquietarse
  if(p.happy<55) p.tax=Math.max(0,p.tax-5); else if(p.happy>78 && p.tax<20 && Math.random()<0.2) p.tax+=5;
  const underAttack=attacks.some(a=>a.def===p.id && a.att!==p.id);
  // red de estaciones: conecta minas, ciudades y puertos para producir y exportar más
  if(p.gold>bCost(p,"station")*1.5 && p.cnt.station<Math.min(4,1+(p.cnt.mine+p.cnt.city)/3) && p.cnt.mine+p.cnt.city+p.cnt.port>=2 && Math.random()<0.25){
    const anchors=buildings.filter(b=>!b.dead&&b.owner===p.id&&(b.t==="mine"||b.t==="city"||b.t==="port"));
    if(anchors.length) placeNear(p,"station",anchors[(Math.random()*anchors.length)|0],10);
  }
  // defensa reactiva: si le atacan, fortaleza en el frente
  if(underAttack && s.front.length && p.gold>bCost(p,"fort")*1.2 && p.cnt.fort<p.tiles/3000+1) tryPlace("fort",s.front);
  // mejoras: gasta el excedente en lo que más rinde (prefiere lo barato y útil)
  if(Math.random()<0.1){
    let pick=null, pv=0;
    for(const b of buildings){ if(b.dead||b.owner!==p.id||b.done>tick||b.lvl>=MAX_LVL) continue;
      const w={mine:3,city:3,port:1.5,station:1.5,airport:1.5,silo:1,sam:hit?2.5:1,fort:underAttack?2.5:1}[b.t]||1, c=upCost(b);
      if(p.gold>c*2 && w/Math.log(c)>pv){ pv=w/Math.log(c); pick=b; } }
    if(pick) upgradeBuilding(p,pick);
  }
  if(p.gold>bCost(p,"airport") && p.tiles>15000 && p.cnt.airport<1 && tick>2400) tryPlace("airport");
  if(p.B.airport.length && Math.random()<0.1 && p.gold>WPLANE_COST*3 && wplanes.filter(w=>w.owner===p.id).length<1 && planes.some(s=>s.from!==p.id && canSeize(p.id,s.from))) buyWarplane(p);
  // marina: un buque de guerra (dos si es grande) cuando hay cargueros ajenos navegando
  if(p.B.port.length && Math.random()<0.15 && p.gold>WSHIP_COST*3 && wships.filter(w=>w.owner===p.id).length<(p.tiles>15000?2:1) && tships.some(s=>s.from!==p.id && canSeize(p.id,s.from))) buyWarship(p);
  // bombas
  if(p.rival>=0 && players[p.rival].alive && !peaceful(p.id,p.rival) && p.B.silo.some(b=>b.done<=tick) && tick>=(p.nextBomb||0) && Math.random()<0.15*diff){
    const R=players[p.rival];
    const type = p.gold>WEAP.hydro.cost*1.2 && R.tiles>30000 ? "hydro" : p.gold>WEAP.atom.cost*1.2 ? "atom" : p.gold>WEAP.missile.cost*2 ? "missile" : null;
    if(type && R.tiles){ let tg;
      if(type==="missile" && R.B.sam.length) tg=R.B.sam[0].i;
      else { const c=buildings.find(b=>!b.dead&&b.owner===R.id&&b.t==="city"); tg=c?c.i:tilesOf[R.id][(Math.random()*R.tiles)|0]; }
      if(!launchMissile(p,type,tg)) p.nextBomb=tick+(700+Math.random()*900)/diff; }
  }
  // diplomacia entre bots
  // si un vecino es bastante más fuerte, pide no agresión; con vecinos amistosos firma comercio
  if(s.enemies.size && Math.random()<0.08){
    for(const o of s.enemies.keys()){ const e=players[o]; if(!e.isBot) continue; const r=peek(p.id,o);
      if(e.troops>p.troops*1.3 && !peaceful(p.id,o) && op(o,p.id)>-30){ signPact(p.id,o,"nap"); break; }
      if(!(r&&r.trade) && op(p.id,o)>-10 && op(o,p.id)>-10){ signPact(p.id,o,"trade"); break; } }
  }
  // propuestas al jugador
  if(me.alive && s.enemies.has(me.id) && Hooks.canOffer() && Math.random()<0.08){
    const r=rel(p.id,me.id), o=op(p.id,me.id); let type=null;
    if(!r.ally){
      if(r.nap<=tick && o>-10 && me.troops>p.troops*0.6) type="nap";
      else if(!r.trade && o>-5) type="trade";
      else if((r.trade||r.nap>tick) && o>35) type="ally";
    }
    if(type) Hooks.offer(p.id,type);
  }
  // coalición: si alguien domina el mapa, los bots se vuelven contra él
  const leader=currentLeader();
  if(leader && leader!==p && leader.tiles>landTotal*0.22 && !peaceful(p.id,leader.id) && p.focus<0) p.focus=leader.id;
  if(p.focus>=0 && !players[p.focus].alive) p.focus=-1;
  // ataques
  if(p.troops < st.max*p.aggro) return;
  if(attacks.filter(a=>a.att===p.id).length>=2) return;
  for(const a of attacks){ if(a.def>=0 && a.att!==p.id && peek(p.id,a.def)?.ally && s.enemies.has(a.att) && !peaceful(p.id,a.att)){
    launchAttack(p.id,a.att,p.troops*0.4,borderCandidates(p.id,a.att)); return; } }
  if(p.focus>=0 && players[p.focus].alive && s.enemies.has(p.focus) && !peaceful(p.id,p.focus)){
    launchAttack(p.id,p.focus,p.troops*0.45,borderCandidates(p.id,p.focus)); return; }
  if(s.neutral>0 && Math.random()<0.85){ launchAttack(p.id,-1,p.troops*(0.25+Math.random()*0.2),borderCandidates(p.id,-1)); return; }
  let target=-1, best=-1e9;
  for(const [o,cnt] of s.enemies){ if(peaceful(p.id,o)) continue; const e=players[o], ratio=p.troops/Math.max(1,e.troops);
    const score=ratio*2+cnt*0.02+(o===p.rival?1:0)+(o===me.id?0.3*diff:0)-op(p.id,o)/40;
    if(ratio<0.7) continue; if(score>best){best=score;target=o;} }
  if(target>=0){ p.rival=target; launchAttack(p.id,target,p.troops*Math.max(0.3,Math.min(0.75,0.3+0.2*Math.log(Math.max(1,p.troops/Math.max(1,players[target].troops))))),borderCandidates(p.id,target)); return; }
  if(s.neutral===0 && !s.enemies.size && p.B.port.some(b=>b.done<=tick) && Math.random()<0.4){
    const src=p.B.port[0];
    for(let k=0;k<40;k++){ const x=((src.x+((Math.random()*2-1)*220|0))%W+W)%W, y=Math.max(0,Math.min(H-1,src.y+((Math.random()*2-1)*140|0))), i=y*W+x;
      if(terrain[i] && owner[i]!==p.id && (owner[i]<0 || (!peaceful(p.id,owner[i]) && players[owner[i]].troops<p.troops*0.5))){ sendBoat(p,i,p.troops*0.35); break; } }
  }
}
