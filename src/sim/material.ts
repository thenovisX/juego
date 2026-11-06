// ================= Materiales =================
// Cuatro materiales: piedra, madera, hierro y comida. Los producen minas (hierro en montaña, piedra en el resto),
// aserraderos (madera, en bosque) y granjas (comida, en llanura); cada uno acumula en su propio almacén hasta un
// máximo y entonces deja de producir. Los bancos de materiales guardan más y reciben lo que producen los productores
// conectados. Las construcciones del JUGADOR con coste en materiales esperan en obra hasta que les llegan por la red de
// estaciones ({{station}} cerca de la obra y del productor o banco). Los bots no necesitan materiales (la IA los da por supuestos).
const RES=["piedra","madera","hierro","comida"];
const RES_E:any={piedra:"{{piedra}}",madera:"{{madera}}",hierro:"{{hierro}}",comida:"{{comida}}"};
const MAT_COST:any={
  port:{piedra:50,madera:30}, city:{hierro:100,piedra:50,comida:40}, silo:{hierro:200}, sam:{hierro:100,piedra:50},
  airport:{hierro:60,madera:40}, bank:{piedra:30,madera:20}, foundry:{madera:30,piedra:40},
  mint:{hierro:50}, temple:{piedra:30}, barracks:{hierro:40,madera:20},
};
const PROD_RATE=2, PROD_CAP=200, BANK_CAP=500, MAT_FLOW=25;
function resOf(b:any): string|null{
  return b.t==="mine"?"piedra":b.t==="foundry"?"hierro":b.t==="sawmill"?"madera":b.t==="farm"?"comida":null;
}
function matText(t:string): string{
  const c=MAT_COST[t]; return c?" · Materiales: "+Object.entries(c).map(([r,n])=>r+" "+n).join(", "):"";
}
function matTotals(p:any){
  const t:any={piedra:0,madera:0,hierro:0,comida:0};
  for(const b of buildings){ if(b.dead||b.owner!==p.id||b.done>tick) continue;
    const r=resOf(b); if(r) t[r]+=b.stock||0; if(b.store) for(const k of RES) t[k]+=b.store[k]; }
  return t;
}
const RES_HOW:any={hierro:"una Metalúrgica (en cualquier terreno propio)",piedra:"una Mina",madera:"un Aserradero en un bosque",comida:"una Granja en una llanura"};
// Qué le falta a una obra, en lenguaje claro (recalcula la red al momento)
function matDiagnose(b:any): string{
  const p=players[b.owner]; p.netAt=-1000; stationNet(p);
  const left=RES.filter(r=>(b.need?.[r]||0)>0);
  if(!left.length) return "";
  if(!(b.netId>=0)) return "Sin conexión: construye una Estación a menos de "+ST_COV+" casillas de esta obra (no pegada: deja 3 casillas libres).";
  const out:string[]=[];
  for(const r of left){
    const prods=buildings.filter(x=>!x.dead&&x.owner===b.owner&&resOf(x)===r);
    const inNet=prods.filter(x=>x.netId===b.netId), banks=buildings.filter(x=>!x.dead&&x.owner===b.owner&&x.store&&x.netId===b.netId&&x.store[r]>0);
    if(!prods.length && !banks.length) out.push(`Falta ${r}: construye ${RES_HOW[r]}.`);
    else if(!inNet.length && !banks.length) out.push(`Tu productor de ${r} no está en esta red: pon una Estación a menos de ${ST_COV} casillas de él y a menos de ${ST_LINK} de la estación de esta obra.`);
    else if(inNet.some(x=>x.done>tick)) out.push(`El productor de ${r} aún se está construyendo.`);
    else out.push(`${r}: llegando (cada productor genera ${PROD_RATE} por segundo; paciencia).`);
  }
  return out.join(" ");
}
function matInfo(b:any): string{
  if(b.need){ const left=Object.entries(b.need).filter(([,n])=>(n as number)>0).map(([r,n])=>r+" "+Math.ceil(n as number)).join(", ");
    return `Esperando materiales (${left}). ${matDiagnose(b)}`; }

  const r=resOf(b);
  if(r) return `${RES_E[r]} Almacén: ${Math.floor(b.stock||0)} / ${PROD_CAP*(b.lvl||1)} (al llenarse deja de producir)`;
  if(b.store) return RES.map(k=>RES_E[k]+Math.floor(b.store[k])).join(" ")+` (máx. ${BANK_CAP*(b.lvl||1)} de cada uno)`;
  return "";
}
function stepMaterials(){
  if(tick%10) return;
  if(tick%300===0) for(const b of buildings) if(!b.dead&&b.need&&b.owner===me.id) Hooks.log(`Obra de ${BT[b.t].n}: ${matDiagnose(b)}`);
  for(const p of players) if(p.alive && !p.isBot) stationNet(p);
  const groups=new Map<string,any[]>();
  for(const b of buildings){
    if(b.dead) continue; const o=players[b.owner]; if(!o||o.isBot) continue;
    if(b.done<=tick && resOf(b)) b.stock=Math.min(PROD_CAP*(b.lvl||1),(b.stock||0)+PROD_RATE*(b.lvl||1));
    if(b.netId>=0){ const k=b.owner+":"+b.netId; let g=groups.get(k); if(!g) groups.set(k,g=[]); g.push(b); }
  }
  for(const g of groups.values()){
    const banks=g.filter(b=>b.done<=tick && b.store), builders=g.filter(b=>b.need);
    for(const pr of g){ const r=resOf(pr); if(!r||pr.done>tick||!(pr.stock>0)) continue;
      for(const bk of banks){ const mv=Math.min(pr.stock,BANK_CAP*(bk.lvl||1)-bk.store[r],20); if(mv>0){ pr.stock-=mv; bk.store[r]+=mv; } } }
    for(const bd of builders){
      for(const r of RES){ let need=bd.need[r]||0; if(need<=0) continue; let budget=MAT_FLOW;
        for(const s of g){ if(need<=0||budget<=0) break; if(s.done>tick) continue;
          if(resOf(s)===r){ const t=Math.min(need,budget,s.stock||0); if(t>0){ s.stock-=t; need-=t; budget-=t; } }
          else if(s.store){ const t=Math.min(need,budget,s.store[r]); if(t>0){ s.store[r]-=t; need-=t; budget-=t; } } }
        bd.need[r]=need; }
      if(RES.every(r=>!(bd.need[r]>0))){ delete bd.need; bd.done=tick+BUILD_TIME;
        if(bd.owner===me.id) Hooks.log(`{{obra}} Materiales completos: ${BT[bd.t].n} empieza a construirse.`,"good"); }
    }
  }
}
