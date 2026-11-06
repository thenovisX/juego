// ================= Combate =================
function fortMult(d,i){
  const p=players[d], x=i%W, y=(i/W)|0;
  for(const b of p.B.fort){ if(b.done>tick) continue; const dx=wdx(b.x,x), dy=b.y-y; if(dx*dx+dy*dy<=FORT_R*FORT_R) return 2.5+0.75*((b.lvl||1)-1); }
  return 1;
}
function tileCost(att,def,i){
  const t=TER[terrain[i]]; let c;
  if(def<0) c=t.cost*0.7*POP_X;
  else { const d=players[def], dens=d.troops/Math.max(1,d.tiles); c=t.cost*(1.5*POP_X+dens*0.9)*t.def*fortMult(def,i)*(wall[i]?4:1)*STANCE[d.stance||"bal"].def; }
  if(def>=0 && (players[def].betrayUntil||0)>tick) c*=0.5; // un traidor tiene la mitad de defensa un rato
  c*=STANCE[players[att].stance||"bal"].cost;
  if(fallout[i]>tick) c*=2.5;
  return c;
}
function borderCandidates(att,def){
  const out=[], L=tilesOf[att];
  for(let k=0;k<L.length;k++){ nbs(L[k],NB); for(const j of NB){ if(j>=0 && terrain[j] && owner[j]===def) out.push(j); } }
  return out;
}
function seedCandidates(def,i){ const out=[]; nbs(i,NB); for(const j of NB) if(j>=0 && terrain[j] && owner[j]===def) out.push(j); return out; }
// ---- Órdenes a las tropas en combate
// Retirar: las tropas que aún no han combatido vuelven a la reserva.
function recallAttack(p,def){
  const a=attacks.find(x=>x.att===p.id && x.def===def); if(!a) return 0;
  const t=a.troops; refundAttack(a); attacks=attacks.filter(x=>x.troops>0); return t;
}
// Reforzar: manda otra parte de la reserva a un frente abierto.
function reinforceAttack(p,def,frac){
  const a=attacks.find(x=>x.att===p.id && x.def===def); if(!a) return 0;
  const t=Math.floor(p.troops*frac); if(t<1) return 0; p.troops-=t; a.troops+=t; return t;
}
function setStance(p,s){ if(STANCE[s]) p.stance=s; }
// Reclutar: un cuartel terminado y descansado convierte oro en tropas al instante.
function recruitInfo(p){
  const ready=p.B.barracks.filter(b=>b.done<=tick), best=ready.reduce((m,b)=>!m||(b.lvl||1)>(m.lvl||1)?b:m,null);
  const free=ready.filter(b=>b.cd<=tick).reduce((m,b)=>!m||(b.lvl||1)>(m.lvl||1)?b:m,null);
  return {ready:ready.length, best, free};
}
function recruit(p){
  const ri=recruitInfo(p);
  if(!ri.ready) return "Necesitas un Cuartel terminado.";
  if(!ri.free) return "Tus cuarteles están descansando (25 s entre reclutamientos).";
  const lv=ri.free.lvl||1, cost=RECRUIT_COST*lv;
  if(p.gold<cost) return `Te faltan ${fmt(cost-p.gold)} de oro.`;
  const max=stats(p).max*1.05;
  if(p.troops>=max) return "Tu población ya está al máximo: construye ciudades o cuarteles.";
  p.gold-=cost; p.troops=Math.min(max,p.troops+RECRUIT_TROOPS*lv); ri.free.cd=tick+RECRUIT_CD; return null;
}
// Refuerzo a un aliado: le cedes parte de tus tropas (reagrupar cuesta 1 minuto).
function sendReinforcements(from,to,frac){
  const r=peek(from,to); if(!r||!r.ally) return "Solo puedes mandar refuerzos a un aliado.";
  const F=players[from], T=players[to];
  if(tick<(F.reinfAt||0)) return `Tus tropas aún se reagrupan (${Math.ceil((F.reinfAt-tick)/10)} s).`;
  const t=Math.floor(F.troops*frac); if(t<1) return "No tienes tropas suficientes.";
  const room=Math.max(0,stats(T).max*1.05-T.troops); const give=Math.min(t,room);
  if(give<1) return "Tu aliado ya tiene la población al máximo.";
  F.troops-=give; T.troops+=give; F.reinfAt=tick+REINF_CD; addOp(to,from,6); return give;
}
// Un reino recién fundado no puede ser atacado durante los primeros 45 s
function immune(id){ return id>=0 && tick<players[id].st.born+IMMUNE_TIME; }
function launchAttack(att,def,troops,cands){
  if(!cands.length || troops<1 || peaceful(att,def) || immune(def)) return false;
  players[att].troops-=troops;
  let a=attacks.find(a=>a.att===att && a.def===def);
  if(a){ a.troops+=troops; for(const c of cands) a.q.push(c); }
  else { a={att,def,troops,q:cands,warn:-1e9}; attacks.push(a); }
  if(def>=0){ addOp(def,att,-6); if(!players[def].isBot && def!==att){ players[def].rival=att;
    if(def===me.id){
    if(tick-a.warn>=100){ a.warn=tick; Hooks.log(`{{alarm}} ¡${players[att].name} te ataca! Ataque en curso con ${fmt(a.troops)} tropas (le quedan ${fmt(players[att].troops)} en reserva).`,"bad"); Hooks.sfx("alarm"); } } } }
  return true;
}
// Anexión: un territorio enemigo que queda rodeado solo por casillas tuyas (sin mar ni otros reinos) pasa a ti sin bajas.
const annexSeen = new Uint32Array(N); let annexStamp=0; const NBA=[0,0,0,0];
function annexPockets(att,def,conq){
  annexStamp++; let budget=4000;
  for(const c of conq){ nbs(c,NBA); const seeds=[NBA[0],NBA[1],NBA[2],NBA[3]];
    for(const s of seeds){
      if(s<0||owner[s]!==def||annexSeen[s]===annexStamp||budget<=0) continue;
      const reg=[s]; annexSeen[s]=annexStamp; let ok=true;
      for(let h=0;h<reg.length&&ok;h++){ budget--; nbs(reg[h],NBA);
        for(let q=0;q<4;q++){ const v=NBA[q]; if(v<0) continue;
          if(!terrain[v]){ ok=false; break; }
          if(owner[v]===def){ if(annexSeen[v]!==annexStamp){ annexSeen[v]=annexStamp; reg.push(v); if(reg.length>ANNEX_MAX){ ok=false; break; } } }
          else if(owner[v]!==att){ ok=false; break; } } }
      if(ok&&reg.length){ for(const t of reg) setOwner(t,att);
        if(att===me.id||def===me.id) Hooks.log(`{{attack}} ${players[att].name} anexiona un territorio cercado de ${players[def].name} (${reg.length} casillas).`, att===me.id?"good":"bad"); }
    }
  }
}
function stepAttacks(){
  for(const a of attacks){
    const A=players[a.att], conq=[];
    let n=Math.min(a.q.length, Math.max(3, Math.floor(a.troops/(POP_X*20))), 220), stale=0;
    n=Math.max(1,Math.round(n*STANCE[A.stance||"bal"].att));
    while(n-- > 0 && a.q.length){
      const k=(rnd()*a.q.length)|0, t=a.q[k]; a.q[k]=a.q[a.q.length-1]; a.q.pop();
      if(owner[t]===a.def && terrain[t]>0 && rnd()>TER_SPEED[terrain[t]]){ a.q.push(t); continue; } // terreno difícil: se avanza más despacio
      if(owner[t]!==a.def){ if(++stale<3000) n++; continue; }
      let adj=false; nbs(t,NB); for(const j of NB) if(j>=0 && owner[j]===a.att){ adj=true; break; }
      if(!adj) continue;
      const c=tileCost(a.att,a.def,t);
      if(a.troops<c){ a.q.length=0; break; }
      a.troops-=c;
      if(a.def>=0){ const D=players[a.def]; D.troops=Math.max(0,D.troops-(D.troops/Math.max(1,D.tiles))*0.8); if(a.def===me.id) Hooks.danger(); }
      setOwner(t,a.att);
      if(a.def>=0) conq.push(t);
      if(!A.alive) break;
      nbs(t,NB2); for(const j of NB2) if(j>=0 && terrain[j] && owner[j]===a.def) a.q.push(j);
    }
    if(conq.length && A.alive && players[a.def]?.alive) annexPockets(a.att,a.def,conq);
    if(!a.q.length){ A.troops+=a.troops; a.troops=0; }
  }
  attacks=attacks.filter(a=>a.troops>0 && a.q.length && players[a.att].alive);
}
const BOAT_SPEED=0.5;
function sendBoat(p,ti,troops){
  const ready=p.B.port.filter(b=>b.done<=tick);
  if(!ready.length) return "Necesitas un puerto terminado para llegar por mar.";
  if(boats.filter(b=>b.owner===p.id).length>=4) return "Ya tienes 4 flotas en el mar.";
  if(owner[ti]>=0 && peaceful(p.id,owner[ti])) return "Tienes un pacto con ese reino.";
  const tx=ti%W, ty=(ti/W)|0; let best=null, bd=1e9;
  for(const b of ready){ const d=Math.hypot(wdx(b.x,tx),b.y-ty); if(d<bd){bd=d;best=b;} }
  if(bd>W*0.35) return "Ese destino está demasiado lejos de tus puertos.";
  let dx=wrapDx(tx-best.x);
  // ruta por mar más corta con giros de 90°, preferiendo mar abierto (nunca por tierra)
  const path=seaPath(best,{i:ti,x:tx,y:ty});
  if(!path) return "No hay ruta por mar hasta ahí: el destino tiene que dar al mar que alcanzan tus puertos.";
  p.troops-=troops;
  boats.push({owner:p.id,troops,trail:[[path[0][0],path[0][1]]],x:path[0][0],y:path[0][1],path,pi:1,ti});
  if(owner[ti]===me.id && p.id!==me.id) Hooks.log(`{{boat}} Una flota de ${p.name} se acerca a tus costas.`,"bad");
  return null;
}
function stepBoats(){
  for(const b of boats){
    if(!b.path){ b.path=[[b.x,b.y],[b.ti%W+0.5,((b.ti/W)|0)+0.5]]; b.pi=1; }
    moveAlong(b,b.path,"pi",BOAT_SPEED); b.trail.push([b.x,b.y]);
    if(b.pi>=b.path.length){
      const Pl=players[b.owner], t=b.ti, def=owner[t];
      if(def===b.owner || peaceful(b.owner,def)) Pl.troops+=b.troops;
      else { const c=tileCost(b.owner,def,t)*1.5;
        if(b.troops<c){ if(b.owner===me.id) Hooks.log("{{t0}} Tu desembarco ha fracasado.","bad"); }
        else { b.troops-=c; setOwner(t,b.owner); Pl.troops+=b.troops; launchAttack(b.owner,def,b.troops,seedCandidates(def,t)); } }
      b.done=true;
    }
  }
  boats=boats.filter(b=>!b.done);
}

// ================= Misiles =================
function launchMissile(p,type,ti){
  const W8=WEAP[type], silos=p.B.silo.filter(b=>b.done<=tick);
  { const why=researchWhy(p,type); if(why) return why; }
  if(!silos.length) return "Necesitas un silo de misiles terminado.";
  if(p.gold<W8.cost) return `Te faltan ${fmt(W8.cost-p.gold)} de oro.`;
  const o=owner[ti];
  if(o===p.id) return "No puedes bombardear tu propio reino.";
  if(o>=0 && peaceful(p.id,o)) return "Tienes un pacto con ese reino.";
  const tx=ti%W, ty=(ti/W)|0; let best=null, bd=1e9;
  for(const b of silos){ const d=Math.hypot(wdx(b.x,tx),b.y-ty); if(d<bd){bd=d;best=b;} }
  let dx=wrapDx(tx-best.x);
  p.gold-=W8.cost; p.st.bombs++;
  missiles.push({owner:p.id,type,sx:best.x+0.5,sy:best.y+0.5,dx,dy:ty-best.y,t:0,dur:Math.max(25,bd/4)/(best.lvl||1),ti});
  if(o>=0) addOp(o,p.id,-30);
  if(o===me.id){ Hooks.log(`{{alarm}} ¡${W8.e} ${W8.n} de ${p.name} en camino hacia ti!`,"bad"); Hooks.sfx("alarm"); Hooks.danger(); }
  return null;
}
function stepMissiles(){
  for(const m of missiles){ m.t++; if(m.t>=m.dur){ impact(m); m.done=true; } }
  missiles=missiles.filter(m=>!m.done);
}
function impact(m){
  const W8=WEAP[m.type], x=m.ti%W, y=(m.ti/W)|0, victim=owner[m.ti];
  if(victim>=0){
    for(const d of [victim,...allies(victim)]){ for(const b of players[d].B.sam){ if(b.done>tick || b.cd>tick) continue;
      const dx=wdx(b.x,x), dy=b.y-y; if(dx*dx+dy*dy>(SAM_R*(1+0.2*((b.lvl||1)-1)))**2) continue;
      b.cd=tick+SAM_CD*(1-0.2*((b.lvl||1)-1));
      if(rnd()>(m.type==="hydro"?SAM_HIT_H:SAM_HIT)) continue; // la antiaérea falla a veces (y queda en recarga)
      blasts.push({x:x+0.5,y:y+0.5,r:3,t0:Hooks.now()});
      if(victim===me.id || m.owner===me.id) Hooks.log(`{{sam}} La antiaérea de ${players[d].name} ha derribado ${m.owner===me.id?"tu":"un"} ${W8.n.toLowerCase()}.`, victim===me.id?"good":"bad");
      Hooks.sfx("pop"); return; } }
  }
  const loss=new Map();
  disk(x,y,W8.r,i=>{
    if(!terrain[i]) return;
    const o=owner[i];
    if(o>=0){ const D=players[o]; loss.set(o,(loss.get(o)||0) + D.troops/Math.max(1,D.tiles)*W8.kill); }
    const b=bldAt[i]; if(b>=0) destroyBuilding(buildings[b]);
    if(wall[i]){ wall[i]=0; markDirty(i); }
    if(W8.neutral){ if(o>=0) setOwner(i,-1); fallout[i]=tick+1800; markDirty(i); }
  });
  if(W8.neutral) falloutQ.push({at:tick+1800,x,y,r:W8.r});
  for(const [o,l] of loss){ const D=players[o]; D.troops=Math.max(0,D.troops-l); D.lastHit=tick;
    if(o!==m.owner){ addOp(o,m.owner,-40); D.rival=m.owner; for(const a of allies(o)) addOp(a,m.owner,-20); } }
  blasts.push({x:x+0.5,y:y+0.5,r:W8.r,t0:Hooks.now()});
  if(loss.has(me.id)){ Hooks.danger(); Hooks.shake(Math.min(18,6+W8.r/2)); Hooks.log(`${W8.e} ¡${players[m.owner].name} te ha lanzado ${W8.n==="Misil"?"un misil":"una "+W8.n.toLowerCase()}!`,"bad"); }
  else if(m.owner===me.id) Hooks.log(`${W8.e} Impacto confirmado${victim>=0?` en ${players[victim].name}`:""}.`,"good");
  else if(W8.neutral) Hooks.log(`${W8.e} ${players[m.owner].name} ha lanzado una ${W8.n.toLowerCase()} contra ${victim>=0&&victim!==m.owner?players[victim].name:"tierra en disputa"}.`);
  Hooks.sfx(W8.neutral?"nuke":"boom", Hooks.onScreen(x,y)?1:0.35);
}
function stepFallout(){ while(falloutQ.length && falloutQ[0].at<=tick){ const f=falloutQ.shift(); disk(f.x,f.y,f.r,i=>markDirty(i)); } }
