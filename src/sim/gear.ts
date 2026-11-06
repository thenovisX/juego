// ================= Equipo militar (tanques y artillería) =================
// Un Arsenal terminado deja comprar piezas con oro y materiales (hierro, madera, piedra, comida). Cada Arsenal guarda
// 4 piezas de cada tipo por nivel. Tanque: abarata conquistar casillas enemigas y encarece que te conquisten; se desgasta
// al conquistar. Artillería: reduce el efecto de fortalezas y murallas enemigas. Los bots pagan solo oro (sin materiales).
const GEAR:any={
  tank:{n:"Tanque",    e:"{{tank}}",   gold:60000*1, mat:{hierro:40,comida:15},          desc:"Cada tanque abarata un 6% conquistar casillas enemigas (hasta −50%) y hace un 5% más difícil que te conquisten (hasta +50%). Se desgastan al conquistar."},
  arty:{n:"Artillería",e:"{{cannon}}", gold:45000*1, mat:{hierro:25,madera:20,piedra:10}, desc:"Cada pieza reduce un 8% el efecto de fortalezas y murallas enemigas al atacar (hasta −60%).", req:"artillery"},
};
const GEAR_PER_LVL=4, TANK_ATT=0.06, TANK_DEF=0.05, TANK_WEAR=0.012, ART_RED=0.08;
function gearCap(p:any): number{ let n=0; for(const b of p.B.arsenal) if(b.done<=tick) n+=b.lvl||1; return n*GEAR_PER_LVL; }
const tankAtt=(p:any)=>Math.max(0.5,1-TANK_ATT*(p.gear?.tank||0));
const tankDef=(p:any)=>Math.min(1.5,1+TANK_DEF*(p.gear?.tank||0));
const artRed=(p:any)=>Math.max(0.4,1-ART_RED*(p.gear?.arty||0));
function tankWear(p:any){ if(p.gear?.tank>0 && rnd()<TANK_WEAR){ p.gear.tank--; if(p===me) Hooks.log("{{tank}} Un tanque se ha averiado en combate.","bad"); } }
// Gasta materiales de los almacenes de p (deterministas: en orden de construcción). Devuelve false sin tocar nada si faltan.
function takeMats(p:any,cost:any): boolean{
  if(p.isBot) return true;
  const t=matTotals(p); for(const r in cost) if(t[r]<cost[r]) return false;
  for(const r in cost){ let need=cost[r];
    for(const b of buildings){ if(need<=0) break; if(b.dead||b.owner!==p.id||b.done>tick) continue;
      if(resOf(b)===r){ const m=Math.min(need,b.stock||0); b.stock-=m; need-=m; }
      if(need>0 && b.store){ const m=Math.min(need,b.store[r]); b.store[r]-=m; need-=m; } } }
  return true;
}
function gearWhy(p:any,t:string): string|null{
  const G=GEAR[t]; if(!G) return "Eso no se fabrica.";
  const rq=t==="tank"?"arsenal":G.req; { const why=researchWhy(p,rq); if(why) return why; }
  if(!p.B.arsenal.some((b:any)=>b.done<=tick)) return "Necesitas un Arsenal terminado.";
  if(p.gear[t]>=gearCap(p)) return `Tus arsenales están llenos (${gearCap(p)}): mejora o construye otro Arsenal.`;
  if(p.gold<G.gold) return `Te faltan ${fmt(G.gold-p.gold)} de oro.`;
  if(!p.isBot){ const m=matTotals(p); const miss=Object.keys(G.mat).filter(r=>m[r]<G.mat[r]); if(miss.length) return "Te faltan materiales: "+miss.map(r=>`${r} ${Math.ceil(G.mat[r]-m[r])}`).join(", ")+"."; }
  return null;
}
function buyGear(p:any,t:string): string|null{
  const why=gearWhy(p,t); if(why) return why;
  if(!takeMats(p,GEAR[t].mat)) return "Faltan materiales.";
  p.gold-=GEAR[t].gold; p.gear[t]++; return null;
}
