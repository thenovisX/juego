// ================= Jugadores =================
const NAMES=["España","Francia","Alemania","Italia","Portugal","Reino Unido","Irlanda","Polonia","Ucrania","Rumanía","Grecia","Turquía","Suecia","Noruega","Finlandia","Rusia","Kazajistán","Mongolia","China","Japón","Corea","India","Pakistán","Irán","Irak","Arabia Saudí","Egipto","Libia","Argelia","Marruecos","Nigeria","Etiopía","Kenia","Sudán","Congo","Angola","Sudáfrica","Madagascar","Australia","Nueva Zelanda","Indonesia","Filipinas","Vietnam","Tailandia","Birmania","Afganistán","Canadá","Estados Unidos","México","Cuba","Colombia","Venezuela","Perú","Bolivia","Chile","Argentina","Brasil","Paraguay","Uruguay","Ecuador","Groenlandia","Islandia","Escandinavia","Siberia","Patagonia","Anatolia","Cáucaso","Balcanes","Tíbet","Manchuria","Indochina","Sahara","Amazonia","Alaska","Texas","Baviera","Cataluña","Escocia","Sicilia","Cerdeña","Creta","Hawái","Borneo","Sumatra","Java","Yemen","Omán","Siria","Jordania","Túnez","Ghana","Mali","Níger","Chad","Tanzania","Zambia","Namibia","Mozambique","Uganda","Camerún","Somalia","Nepal","Bangladés","Camboya","Laos","Bielorrusia","Hungría","Austria","Suiza","Bélgica","Países Bajos","Dinamarca","Serbia","Bulgaria","Croacia"];
function makeName(used){ for(let k=0;k<400;k++){ const n=NAMES[(rnd()*NAMES.length)|0]; if(!used.has(n)){used.add(n);return n;} } let n,c=2; do{ n="Nueva "+NAMES[(rnd()*NAMES.length)|0]+" "+c++; }while(used.has(n)); used.add(n); return n; }
function hsl(h,s,l){ s/=100;l/=100; const k=n=>(n+h/30)%12, a=s*Math.min(l,1-l); const f=n=>l-a*Math.max(-1,Math.min(k(n)-3,9-k(n),1)); return [f(0)*255|0,f(8)*255|0,f(4)*255|0]; }
function newPlayer(name,c,isBot){
  const id=players.length;
  const p={id,name,c,isBot,alive:true,troops:700*POP_X,stance:"bal",tax:10,happy:80,taxWarn:0,gold:150*GOLD_X,tiles:0,sumX:0,sumY:0,
    cnt:Object.fromEntries(Object.keys(BT).map(k=>[k,0])), B:Object.fromEntries(Object.keys(BT).map(k=>[k,[]])),
    aggro:0.15+rnd()*0.25, thinkAt:(rnd()*20)|0, rival:-1, focus:-1, traitorUntil:0, lastHit:-1e9,
    res:{done:{},cur:null,prog:0}, infamy:0, pow:0, ideas:{}, hitBy:{}, evt:null, evtAt:1200+((rnd()*1800)|0), st:{maxTiles:0,kills:0,built:0,bombs:0,born:0,killer:-1}};
  players.push(p); tilesOf.push([]); return p;
}
function setOwner(i,p){
  const o=owner[i]; if(o===p) return;
  const x=i%W, y=(i/W)|0;
  if(o>=0){ const L=tilesOf[o], k=tileIdx[i], last=L.pop(); if(last!==i){ L[k]=last; tileIdx[last]=k; }
    const op=players[o]; op.tiles--; op.sumX-=x; op.sumY-=y; }
  owner[i]=p; wall[i]=0;
  if(p>=0){ tileIdx[i]=tilesOf[p].length; tilesOf[p].push(i); const pp=players[p]; pp.tiles++; pp.sumX+=x; pp.sumY+=y; if(pp.tiles>pp.st.maxTiles) pp.st.maxTiles=pp.tiles; }
  else tileIdx[i]=-1;
  markDirty(i); nbs(i,NB); for(const j of NB) if(j>=0) markDirty(j);
  const b=bldAt[i]; if(b>=0){ if(p<0) destroyBuilding(buildings[b]); else transferBuilding(buildings[b],p,o); }
  if(o>=0 && players[o].tiles===0) eliminate(o,p);
}
function eliminate(o,by){
  const p=players[o]; if(!p.alive) return; p.alive=false; p.st.killer=by;
  attacks=attacks.filter(a=>a.att!==o); boats=boats.filter(b=>b.owner!==o);
  if(by>=0){ players[by].st.kills++; const loot=p.gold; if(loot>0){ players[by].gold+=loot; p.gold=0; Hooks.log(`{{trade}} ${players[by].name} se queda con los ${fmt(loot)} de oro de ${p.name}.`, by===me.id?"good":""); } }
  if(o===me.id){ Hooks.sfx("lose"); Hooks.log("{{dead}} Tu reino ha caído.","bad"); Hooks.end(false); }
  else Hooks.log(`{{attack}} ${p.name} ha sido conquistado${by>=0?` por ${players[by].name}`:""}.`, by===me.id?"good":"");
}
function spawnAt(p,cx,cy,r){
  disk(cx,cy,r,i=>{ if(terrain[i] && owner[i]<0) setOwner(i,p.id); });
  const ci=cy*W+cx; if(owner[ci]===p.id) placeBuilding(p,"city",ci,true);
  p.st.born=tick;
}

// ================= Diplomacia =================
const rkey=(a,b)=>a<b? a*1024+b : b*1024+a;
function rel(a,b){ const k=rkey(a,b); let r=rels.get(k); if(!r){ r={nap:0,trade:false,ally:false}; rels.set(k,r);} return r; }
function peek(a,b){ return rels.get(rkey(a,b)); }
function peaceful(a,b){ if(a<0||b<0||a===b) return false; const r=peek(a,b); return !!r && (r.ally || r.nap>tick); }
function partners(p){ let n=0; for(const [k,r] of rels){ if(!r.trade) continue; const a=(k/1024)|0, b=k%1024; if((a===p.id&&players[b].alive)||(b===p.id&&players[a].alive)) n++; } return n; }
function allies(id){ const out=[]; for(const [k,r] of rels){ if(!r.ally) continue; const a=(k/1024)|0, b=k%1024; if(a===id&&players[b].alive) out.push(b); else if(b===id&&players[a].alive) out.push(a); } return out; }
const op=(a,b)=>opin[a*P+b];
function addOp(a,b,v){ if(a===b||a<0||b<0) return; opin[a*P+b]=Math.max(-100,Math.min(100,opin[a*P+b]+v)); }
function relLabel(a,b){ const r=peek(a,b), out=[]; if(!r) return out;
  if(r.ally) out.push("{{ally}}"); else if(r.nap>tick) out.push("{{nap}}"); if(r.trade && !r.ally) out.push("{{trade}}"); return out; }
function breakPacts(a,b){
  const r=rel(a,b), had=r.ally||r.nap>tick||r.trade, wasPact=r.ally||r.nap>tick; r.ally=false; r.allyEnd=0; r.nap=0; r.trade=false;
  if(!had) return;
  players[a].traitorUntil=tick+1200;
  if(wasPact){ players[a].betrayUntil=tick+BETRAY_TIME; players[a].betrayals=(players[a].betrayals||0)+1; }
  for(let k=0;k<P;k++) addOp(k,a,-20);
  addOp(b,a,-100);
  Hooks.log(`{{break}} ${players[a].name} ha roto sus pactos con ${players[b].name}.`, a===me.id||b===me.id?"bad":"");
}
function botAnswer(bot,from,type){
  const b=players[bot], f=players[from], o=op(bot,from), s=f.troops/Math.max(1,b.troops), r=rel(bot,from);
  const tr=(f.traitorUntil>tick ? 40 : 0) + (f.infamy||0)*0.5 - (hasIdea(f,"diplomacia")?15:0);
  if(type==="nap") return o-tr > -35 && (s>0.7 || rnd()<0.45+o/200);
  if(type==="trade") return o-tr > -15 && rnd() < 0.55+o/150;
  if(type==="ally") return (r.trade || r.nap>tick) && o-tr > 20 && s>0.45 && rnd()<0.7;
  return false;
}
function signPact(a,b,type){
  const r=rel(a,b);
  if(type==="nap") r.nap=tick+NAP_TIME;
  if(type==="trade") r.trade=true;
  if(type==="ally"){ r.ally=true; r.trade=true; r.allyEnd=tick+ALLY_TIME; }
  if(type!=="trade") for(const x of attacks){ if((x.att===a&&x.def===b)||(x.att===b&&x.def===a)) refundAttack(x); }
  attacks=attacks.filter(x=>x.troops>0);
}
function propose(from,to,type){
  const T=players[to], nm={nap:"un pacto de no agresión",trade:"un acuerdo comercial",ally:"una alianza"}[type];
  if(!botAnswer(to,from,type)){ Hooks.log(`{{refuse}} ${T.name} rechaza ${nm}.`,"bad"); addOp(to,from,-2); Hooks.sfx("err"); return false; }
  signPact(from,to,type); addOp(to,from,8);
  Hooks.log(`${type==="ally"?"{{ally}}":type==="trade"?"{{trade}}":"{{nap}}"} ${T.name} acepta ${nm}.`,"good"); Hooks.sfx("good");
  return true;
}
function refundAttack(a){ players[a.att].troops+=a.troops; a.troops=0; }
function sendGift(from,to,amount){ const F=players[from]; if(F.gold<amount) return false; F.gold-=amount; players[to].gold+=amount; addOp(to,from,amount/GOLD_X/20); return true; }

// ================= Edificios =================
function bCost(p,t){ return Math.round(BT[t].base*Math.pow(BT[t].mul,p.cnt[t])); }
function nearAny(L,x,y,r){ for(const c of L){ const dx=wdx(c.x,x), dy=c.y-y; if(dx*dx+dy*dy<=r*r) return true; } return false; }
function countNear(L,b,r){ let n=0; for(const c of L){ if(c.done>tick) continue; const dx=wdx(c.x,b.x), dy=c.y-b.y; if(dx*dx+dy*dy<=r*r) n++; } return n; }
// Calcula cada segundo el oro/s de mercados, casas de la moneda y casas de comercio (se guarda en b.eff)
function refreshEff(){
  for(const p of players){ if(!p.alive) continue; let tr=-1;
    for(const b of p.B.market) b.eff = b.done>tick ? 0 : Math.min(MKT_MAX,countNear(p.B.city,b,MKT_R))*2.5*GOLD_X*(b.lvl||1);
    if(p.B.mint.length){ const src=p.B.mine.concat(p.B.foundry);
      for(const b of p.B.mint) b.eff = b.done>tick ? 0 : (2*GOLD_X + Math.min(MINT_MAX,countNear(src,b,MINT_R))*1.5*GOLD_X)*(b.lvl||1); }
    if(p.B.tradehouse.length){ tr=Math.min(TRADE_MAX,partners(p));
      for(const b of p.B.tradehouse) b.eff = b.done>tick ? 0 : tr*3*GOLD_X*(b.lvl||1); }
  }
}
function coastal(i){ nbs(i,NB); for(const j of NB) if(j>=0 && !terrain[j]) return true; return false; }
function canBuild(p,t,i){
  if(owner[i]!==p.id) return "Solo puedes construir en tu territorio.";
  if(bldAt[i]>=0) return "Ya hay un edificio ahí.";
  const x=i%W,y=(i/W)|0;
  for(let dy=-3;dy<=3;dy++) for(let dx=-3;dx<=3;dx++){ const yy=y+dy; if(yy<0||yy>=H) continue; if(bldAt[yy*W+((x+dx)%W+W)%W]>=0) return "Demasiado cerca de otro edificio."; }
  if(t==="port" && !coastal(i)) return "El puerto tiene que estar junto al mar.";
  if(t==="sawmill" && terrain[i]!==2) return "El aserradero va en un bosque.";
  if(t==="farm" && terrain[i]!==1) return "La granja va en una llanura.";
  { const why=researchWhy(p,t); if(why) return why; }
  if(BT[t].max && p.cnt[t]>=BT[t].max) return `Solo puedes tener ${BT[t].max} de este edificio (mejóralos en vez de construir más).`;
  if(t==="market" && !nearAny(p.B.city,x,y,MKT_R)) return "El mercado necesita una ciudad a menos de 20 casillas.";
  if(t==="mint" && !nearAny(p.B.mine.concat(p.B.foundry),x,y,MINT_R)) return "La casa de la moneda necesita una mina o metalúrgica a menos de 20 casillas.";
  if(p.gold<bCost(p,t)) return `Te faltan ${fmt(bCost(p,t)-p.gold)} de oro.`;
  return null;
}
function placeBuilding(p,t,i,instant){
  const b:any={t,i,owner:p.id,x:i%W,y:(i/W)|0,done:instant?0:tick+BUILD_TIME,cd:0,dead:false,lvl:1};
  if(!instant){ p.gold-=bCost(p,t); p.st.built++; }
  if(!instant && !p.isBot && MAT_COST[t]){ b.need={...MAT_COST[t]}; b.done=Infinity; }
  if(t==="bank") b.store={piedra:0,madera:0,hierro:0,comida:0};
  bldAt[i]=buildings.length; buildings.push(b); p.cnt[t]++; if(p.B[t]) p.B[t].push(b);
}
function unlink(b){ const o=players[b.owner]; o.cnt[b.t]--; if(o.B[b.t]){ const L=o.B[b.t]; L.splice(L.indexOf(b),1); } }
function transferBuilding(b,np,opn){
  if(b.t==="fort"){ if(opn===me.id) Hooks.log("{{fort}} Han derribado tu fortaleza al conquistarla.","bad"); else if(np===me.id) Hooks.log("{{fort}} Has derribado una fortaleza enemiga.","good"); destroyBuilding(b); return; }
  unlink(b); b.owner=np; const n=players[np]; n.cnt[b.t]++; if(n.B[b.t]) n.B[b.t].push(b);
  if(np===me.id && b.t==="city") Hooks.log(`{{city}} Has capturado una ciudad de ${players[opn].name}.`,"good");
  if(opn===me.id) Hooks.log(`${BT[b.t].e} ${n.name} ha capturado tu ${BT[b.t].n.toLowerCase()}.`,"bad");
}
function destroyBuilding(b){ if(b.dead) return; unlink(b); bldAt[b.i]=-1; b.dead=true; b.owner=-1; }

// ================= Economía =================
function stats(p){
  let cities=0, mines=0, econ=0, extra=0, barr=0;
  for(const b of buildings){ if(b.owner!==p.id || b.done>tick) continue;
    if(b.t==="city") cities+=b.lvl||1; else if(b.t==="mine") mines += (terrain[b.i]===3?2:1)*(b.lvl||1); else if(b.t==="sawmill"||b.t==="farm"||b.t==="foundry") econ+=b.lvl||1; else if(b.t==="barracks") barr+=b.lvl||1;
    if(b.eff) extra+=b.eff; }
  const max = (1000 + p.tiles*3 + cities*2000 + barr*1000) * POP_X;
  const net = stationNet(p);
  const grow = (20 + p.tiles*0.05 + (cities+net.cities*0.5)*15 + barr*8) * POP_X * 0.6 * Math.max(0,1-p.troops/max) * (p.isBot?diff:1) * unrest(p) * (hasIdea(p,"agraria")?1.2:1);
  const tr = Math.min(5,partners(p));
  const jobs = 1 + 0.25*(mines+net.mines*0.5); // las minas dan empleo: más población que paga impuestos
  const taxInc = p.tiles*p.tax*0.01*jobs;
  const inc = ((1 + p.tiles*0.004 + econ*4) * (1+0.12*tr) * GOLD_X + taxInc + extra) * unrest(p) * (hasIdea(p,"comercio")?1.12:1);
  return {max,grow,inc,cities,mines,tr,net,taxInc,extra,barr};
}
// Red de estaciones: las estaciones a menos de ST_LINK se unen; una red que cubre (ST_COV) al menos dos tipos de
// mina/ciudad/puerto da +50% a los edificios cubiertos. Se recalcula cada segundo.
function stationNet(p){
  if(p.net && tick-p.netAt<10 && tick>=p.netAt) return p.net;
  p.netAt=tick; const out={mines:0,cities:0,ports:0,links:[],rails:[]}; p.net=out;
  if(!p.isBot) for(const b of buildings) if(b.owner===p.id) b.netId=-1;
  const S=p.B.station.filter(b=>b.done<=tick); if(!S.length) return out;
  const par=S.map((_,i)=>i), f=i=>par[i]===i?i:(par[i]=f(par[i]));
  for(let a=0;a<S.length;a++) for(let b=a+1;b<S.length;b++){ const dx=wdx(S[a].x,S[b].x), dy=S[a].y-S[b].y;
    if(dx*dx+dy*dy<=ST_LINK*ST_LINK){ par[f(a)]=f(b); out.links.push([S[a],S[b]]); } }
  if(!p.isBot) for(const b of buildings){ if(b.dead||b.owner!==p.id) continue;
    for(let k=0;k<S.length;k++){ const dx=wdx(S[k].x,b.x), dy=S[k].y-b.y;
      if(dx*dx+dy*dy<=(ST_COV*(1+0.3*((S[k].lvl||1)-1)))**2){ b.netId=f(k);
        // las obras, productores y bancos también se unen con vía a su estación (para ver que están conectados)
        if(b.t!=="station" && (b.need || b.done>tick || b.store || resOf(b))) out.rails.push([S[k],b]);
        break; } } }
  const comp=new Map();
  for(const b of buildings){ if(b.dead||b.owner!==p.id||b.done>tick||(b.t!=="mine"&&b.t!=="city"&&b.t!=="port")) continue;
    for(let k=0;k<S.length;k++){ const dx=wdx(S[k].x,b.x), dy=S[k].y-b.y;
      if(dx*dx+dy*dy<=(ST_COV*(1+0.3*((S[k].lvl||1)-1)))**2){ if(p.isBot||!resOf(b)) out.rails.push([S[k],b]); const r=f(k); let c=comp.get(r); if(!c) comp.set(r,c={mine:new Set(),city:new Set(),port:new Set()}); c[b.t].add(b); break; } } }
  for(const c of comp.values()){ if(Number(c.mine.size>0)+Number(c.city.size>0)+Number(c.port.size>0)<2) continue;
    out.mines+=c.mine.size; out.cities+=c.city.size; out.ports+=c.port.size; }
  return out;
}
