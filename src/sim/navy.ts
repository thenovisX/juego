// ================= Marina de guerra =================
// Los buques de guerra patrullan desde su puerto, persiguen cargueros de reinos sin pacto ni comercio con su dueño
// y, al alcanzarlos, se quedan con el oro que llevaban. Navegan solo por agua, en tramos rectos.
const WSHIP_COST=150*GOLD_X, WSHIP_MAX=3, WSHIP_SPEED=0.5, WSHIP_ZONE=40, WSHIP_FIRE=12, WSHIP_SIEGE=18;
// Balas de cañón (solo visuales): salen del buque y vuelan hasta su objetivo
let shots: any[]=[];
let wships: any[]=[];
const isWater=(x:number,y:number)=>{ const yy=Math.floor(y); if(yy<0||yy>=H) return false; return !terrain[yy*W+((Math.floor(x)%W)+W)%W]; };
function buyWarship(p){
  const ports=readyPorts(p); if(!ports.length) return "Necesitas un puerto terminado.";
  if(wships.filter(w=>w.owner===p.id).length>=WSHIP_MAX) return `Máximo ${WSHIP_MAX} buques de guerra.`;
  if(p.gold<WSHIP_COST) return `Te faltan ${fmt(WSHIP_COST-p.gold)} de oro.`;
  const port=ports[(rnd()*ports.length)|0], sea=waterNear(port.i,[])[0];
  if(sea===undefined) return "El puerto no tiene salida al mar.";
  p.gold-=WSHIP_COST; const x=sea%W+0.5, y=((sea/W)|0)+0.5;
  wships.push({owner:p.id,x,y,hx:x,hy:y,zx:x,zy:y,target:null,fire:0,trail:[[x,y]]});
  return null;
}
function canSeize(owner:number,from:number){ return from!==owner && !peaceful(owner,from) && !peek(owner,from)?.trade; }
// Zona de patrulla: el buque se queda por ahí (radio WSHIP_ZONE) y solo persigue a quien entra en ella.
function setPatrol(w:any,x:number,y:number): string|null{
  if(!isWater(x,y)) return "Elige un punto del mar.";
  w.zx=x; w.zy=y; w.target=null; w.fire=0; w.route=null; return null;
}
// Ruta por mar con giros de 90° (BFS = la más corta) de (x0,y0) a (x1,y1); null si no hay camino.
function seaRoute(x0:number,y0:number,x1:number,y1:number): number[][]|null{
  const wrap=(x:number)=>((Math.floor(x)%W)+W)%W, s0=Math.floor(y0)*W+wrap(x0), g=Math.floor(y1)*W+wrap(x1);
  if(s0===g) return [[x1,y1]];
  if(terrain[s0]||terrain[g]) return null;
  const tiles=seaTiles([s0],[g]); return tiles?straighten(tiles):null;
}
// Navega hacia (tx,ty) por la ruta más corta; la recalcula si el objetivo se ha movido.
function sailToward(w,tx:number,ty:number,speed:number){
  const stale=!w.route || tick>=w.rtick+60 || Math.hypot(wdx(w.rtx,tx),w.rty-ty)>6;
  if(stale){ w.route=seaRoute(w.x,w.y,tx,ty); w.rtick=tick; w.rtx=tx; w.rty=ty; w.ri=0; }
  if(!w.route) return;
  moveAlong(w,w.route,"ri",speed);
  w.trail.push([w.x,w.y]); if(w.trail.length>120) w.trail.shift();
}
function stepNavy(){
  let wi=0;
  for(const w of wships){ wi++;
    if(w.zx===undefined){ w.zx=w.hx; w.zy=w.hy; }
    const P=players[w.owner]; if(!P.alive){ w.dead=true; continue; }
    if(w.target && (w.target.done || Math.hypot(wdx(w.zx,w.target.x),w.zy-w.target.y)>WSHIP_ZONE+WSHIP_SIEGE)){ w.target=null; w.fire=0; }
    if(!w.target && (tick+wi)%4===0){ let bd=WSHIP_ZONE;
      for(const s of tships){ if(s.done||!canSeize(w.owner,s.from)) continue; const d=Math.hypot(wdx(w.zx,s.x),w.zy-s.y); if(d<bd){ bd=d; w.target=s; } } }
    if(w.target){ const s=w.target, d=Math.hypot(wdx(w.x,s.x),w.y-s.y);
      if(d>WSHIP_FIRE){ w.fire=0; sailToward(w,s.x,s.y,WSHIP_SPEED); }
      else { // a tiro: cañonea el carguero hasta rendirlo
        w.fire++; if(w.fire%3===0) shots.push({x:w.x,y:w.y,tx:s.x+(rnd()-0.5),ty:s.y+(rnd()-0.5),t:0,dur:6});
        if(w.fire>=18){ s.done=true; P.gold+=s.val; P.st.trade=(P.st.trade||0)+s.val; addOp(s.from,w.owner,-25); w.target=null; w.fire=0;
          if(w.owner===me.id) Hooks.log(`{{pirate}} Tu buque ha capturado un carguero de ${players[s.from].name}: +${fmt(s.val)} de oro.`,"good");
          else if(s.from===me.id) Hooks.log(`{{pirate}} ${P.name} ha capturado tu carguero y se queda ${fmt(s.val)} de oro.`,"bad"); } } }
    else if(Math.hypot(wdx(w.x,w.zx),w.y-w.zy)>6) sailToward(w,w.zx,w.zy,WSHIP_SPEED);
  }
  wships=wships.filter(w=>!w.dead);
  for(const b of shots) b.t++; shots=shots.filter(b=>b.t<b.dur);
}
