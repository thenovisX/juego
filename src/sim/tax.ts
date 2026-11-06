// ================= Impuestos y descontento =================
// Cada reino fija una tasa (0-80 %). Los impuestos dan oro extra, pero la felicidad del pueblo baja hacia un objetivo
// que depende de la tasa. Con felicidad < 50 la economía y el reclutamiento se resienten; con < 25 estallan revueltas
// que dejan casillas sin dueño. Las revueltas desahogan algo el ambiente, pero el problema vuelve si no bajas la tasa.
const TAX_MAX=80;
function unrest(p:any){ return p.happy>=50?1:0.5+p.happy/100; }
function templeHappy(p:any){ let n=0; for(const b of p.B.temple) if(b.done<=tick) n+=4*(b.lvl||1); return Math.min(15,n); }
function happyTarget(p:any){
  return Math.max(0,Math.min(100, 92 - p.tax*1.05 + Math.min(10,p.cnt.city*1.5) + Math.min(8,p.cnt.mine*1.2) + templeHappy(p) - (p.lastHit>tick-300?8:0)));
}
function taxWarnings(p:any){
  if(p.happy>55) p.taxWarn=0;
  else if(p.happy<32 && p.taxWarn<2){ p.taxWarn=2; Hooks.log("{{warn}} ¡Revueltas inminentes! Baja los impuestos ya.","bad"); Hooks.sfx("alarm"); }
  else if(p.happy<45 && p.taxWarn<1){ p.taxWarn=1; Hooks.log("{{bell}} El pueblo está descontento por los impuestos: baja la tasa o habrá problemas.","bad"); }
}
function revolt(p:any){
  const L=tilesOf[p.id]; if(!L.length) return;
  const c=L[(rnd()*L.length)|0], r=1+Math.floor((25-p.happy)/6); let n=0;
  disk(c%W,(c/W)|0,r,(i:number)=>{ if(terrain[i] && owner[i]===p.id){ setOwner(i,-1); n++; } });
  if(p===me){ Hooks.log(`{{riot}} ¡Revuelta! ${n} casillas se han rebelado y quedan sin dueño.`,"bad"); Hooks.shake(8); Hooks.danger(); }
  p.happy=Math.min(100,p.happy+10);
}
function setTax(p:any,v:number){ p.tax=v; }
function stepTax(){
  for(const p of players){ if(!p.alive) continue;
    p.happy+=(happyTarget(p)-p.happy)*0.004;
    if(p===me) taxWarnings(p);
    if(tick%30===0 && p.happy<25 && rnd()<(25-p.happy)/40) revolt(p);
  }
}
