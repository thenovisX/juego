// ================= Investigación =================
// Las universidades terminadas generan puntos. Se invierten en UNA investigación a la vez (p.res.cur).
// Una investigación desbloquea un edificio (clave de BT) o un arma (clave de WEAP) listados en RESEARCH.
function rpRate(p:any): number{ let r=0; for(const b of p.B.university) if(b.done<=tick) r+=(b.lvl||1)*RP_PER_SEC; return r*(hasIdea(p,"academia")?1.5:1); }
function researchWhy(p:any,t:string): string|null{
  const R=RESEARCH[t]; if(!R || p.res.done[t]) return null;
  return `Primero investiga «${R.n}» en la pestaña Ciencia (necesitas Universidades).`;
}
function researchAvail(p:any,t:string): string|null{
  const R=RESEARCH[t]; if(!R) return "Eso no se investiga.";
  if(p.res.done[t]) return "Ya está investigado.";
  if(R.req && !p.res.done[R.req]) return `Antes investiga «${RESEARCH[R.req].n}».`;
  return null;
}
function startResearch(p:any,t:string): string|null{
  const why=researchAvail(p,t); if(why) return why;
  if(!p.B.university.some((b:any)=>b.done<=tick)) return "Construye una Universidad para investigar.";
  if(p.res.cur!==t){ p.res.cur=t; p.res.prog=0; }
  return null;
}
function stepResearch(){
  for(const p of players){ if(!p.alive) continue;
    const rate=rpRate(p); if(rate<=0) continue;
    if(!p.res.cur && p.isBot){ // los bots eligen lo más barato que puedan investigar
      let best=null; for(const t in RESEARCH) if(!researchAvail(p,t) && (!best || RESEARCH[t].cost<RESEARCH[best].cost)) best=t;
      p.res.cur=best; p.res.prog=0; }
    const t=p.res.cur; if(!t) continue;
    p.res.prog+=rate/10;
    if(p.res.prog>=RESEARCH[t].cost){ p.res.done[t]=true; p.res.cur=null; p.res.prog=0;
      if(p===me) Hooks.log(`{{science}} Investigación completada: ${RESEARCH[t].n}. ${RESEARCH[t].desc}`+(Object.keys(RESEARCH).some(k=>!p.res.done[k])?" Elige la siguiente en la pestaña Ciencia.":""),"good"); }
  }
}
