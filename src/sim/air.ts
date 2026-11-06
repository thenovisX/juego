// ================= Aeropuertos y aviación =================
// Los aeropuertos despachan aviones comerciales en línea recta hacia un aeropuerto de un reino con acuerdo
// comercial (o entre dos aeropuertos propios). Al aterrizar, el exportador cobra y el receptor recibe un 40%.
// Los aviones de guerra patrullan desde tu aeropuerto, derriban aviones comerciales ajenos y se quedan su carga.
const PLANE_SPEED=2.4, WPLANE_SPEED=3.6, WPLANE_RANGE=70, WPLANE_CATCH=2.5, WPLANE_COST=200*GOLD_X, WPLANE_MAX=3, AIR_CD=120;
let planes: any[]=[], wplanes: any[]=[];
const airCd=new Map<number,number>();
const readyAirports=(p:any)=>p.B.airport.filter((b:any)=>b.done<=tick);
function airValue(p:any){ return Math.round(tradeValue(p)*0.8*(1+0.25*(maxLvl(p.B.airport)-1))); }
function airCheck(a:number,b:number): string|null{
  const A=players[a], B=players[b], need=a===b?2:1;
  if(a!==b){ const r=peek(a,b); if(!r||!r.trade) return "Necesitas un acuerdo comercial."; }
  if(readyAirports(A).length<need) return a===b?"Necesitas dos aeropuertos terminados.":"Necesitas un aeropuerto terminado.";
  if(readyAirports(B).length<need) return `${B.name} no tiene aeropuerto.`;
  if((airCd.get(a*1024+b)||0)>tick) return "Tu último avión aún está en el aire.";
  if(planes.filter(s=>s.from===a).length>=8) return "Demasiados aviones comerciales en el aire.";
  return null;
}
function sendPlane(a:number,b:number): string|null{
  const why=airCheck(a,b); if(why) return why;
  const pa=readyAirports(players[a]), pb=readyAirports(players[b]); let best:any=null, bd=1e9;
  for(const x of pa) for(const y of pb){ if(x===y) continue; const d=Math.hypot(wdx(x.x,y.x),x.y-y.y); if(d>0 && d<bd){ bd=d; best=[x,y]; } }
  if(!best) return "No hay dos aeropuertos distintos.";
  const [x,y]=best; let dx=y.x-x.x; if(dx>W/2) dx-=W; if(dx<-W/2) dx+=W; const dy=y.y-x.y, d=Math.hypot(dx,dy);
  planes.push({from:a,to:b,x:x.x+0.5,y:x.y+0.5,vx:dx/d,vy:dy/d,left:d,trail:[[x.x+0.5,x.y+0.5]],val:airValue(players[a])});
  airCd.set(a*1024+b,tick+AIR_CD); return null;
}
function movePlane(s:any,speed:number){
  const k=Math.min(speed,s.left); s.x=((s.x+s.vx*k)%W+W)%W; s.y+=s.vy*k; s.left-=k;
  s.trail.push([s.x,s.y]); if(s.trail.length>400) s.trail.shift();
}
function landPlane(s:any){
  const A=players[s.from], B=players[s.to];
  if(A.alive){ A.gold+=s.val; A.st.trade=(A.st.trade||0)+s.val; }
  if(B.alive) B.gold+=s.val*0.4;
  addOp(s.from,s.to,1); addOp(s.to,s.from,1);
  if(s.from===me.id) Hooks.log(`{{plane}} Tu avión comercial aterrizó en ${B.name}: +${fmt(s.val)} de oro.`,"good");
  else if(s.to===me.id) Hooks.log(`{{plane}} Un avión de ${A.name} aterrizó en tu aeropuerto: +${fmt(s.val*0.4)} de oro.`,"good");
}
function stepPlanes(){
  for(const s of planes){ if(s.done) continue; movePlane(s,PLANE_SPEED); if(s.left<=0){ s.done=true; landPlane(s); } }
  for(const s of planes) if(!players[s.from].alive||!players[s.to].alive) s.done=true;
  planes=planes.filter(s=>!s.done);
}
function buyWarplane(p:any): string|null{
  const ports=readyAirports(p);
  if(!ports.length) return "Necesitas un aeropuerto terminado.";
  if(wplanes.filter(w=>w.owner===p.id).length>=WPLANE_MAX) return `Máximo ${WPLANE_MAX} aviones de guerra.`;
  if(p.gold<WPLANE_COST) return `Te faltan ${fmt(WPLANE_COST-p.gold)} de oro.`;
  const ap=ports[(rnd()*ports.length)|0], x=ap.x+0.5, y=ap.y+0.5;
  p.gold-=WPLANE_COST; wplanes.push({owner:p.id,x,y,hx:x,hy:y,target:null,trail:[[x,y]]});
  return null;
}
function flyToward(w:any,tx:number,ty:number,speed:number){
  let dx=tx-w.x; if(dx>W/2) dx-=W; if(dx<-W/2) dx+=W; const dy=ty-w.y, d=Math.hypot(dx,dy); if(d<0.01) return;
  const k=Math.min(speed,d); w.x=((w.x+dx/d*k)%W+W)%W; w.y+=dy/d*k;
  w.trail.push([w.x,w.y]); if(w.trail.length>120) w.trail.shift();
}
function stepWarplanes(){
  let wi=0;
  for(const w of wplanes){ wi++;
    const P=players[w.owner]; if(!P.alive){ w.dead=true; continue; }
    if(w.target && w.target.done) w.target=null;
    if(!w.target && (tick+wi)%4===0){ let bd=WPLANE_RANGE;
      for(const s of planes){ if(s.done||!canSeize(w.owner,s.from)) continue; const d=Math.hypot(wdx(w.x,s.x),w.y-s.y); if(d<bd){ bd=d; w.target=s; } } }
    if(w.target){ const s=w.target; flyToward(w,s.x,s.y,WPLANE_SPEED);
      if(Math.hypot(wdx(w.x,s.x),w.y-s.y)<=WPLANE_CATCH){ s.done=true; P.gold+=s.val; P.st.trade=(P.st.trade||0)+s.val; addOp(s.from,w.owner,-25); w.target=null;
        if(w.owner===me.id) Hooks.log(`{{shot}} Tu avión de guerra ha derribado un avión de ${players[s.from].name}: +${fmt(s.val)} de oro.`,"good");
        else if(s.from===me.id) Hooks.log(`{{shot}} Un avión de guerra de ${P.name} ha derribado tu avión comercial: pierdes la carga.`,"bad"); } }
    else flyToward(w,w.hx,w.hy,WPLANE_SPEED*0.7);
  }
  wplanes=wplanes.filter(w=>!w.dead);
}
function stepAir(){
  stepPlanes(); stepWarplanes();
  if(tick%150===0) for(const [k,r] of rels){ if(!r.trade) continue; const a=(k/1024)|0, b=k%1024;
    if(!players[a].alive||!players[b].alive) continue;
    if(players[a].isBot) sendPlane(a,b); if(players[b].isBot) sendPlane(b,a); }
}
