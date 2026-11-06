// ================= Política: casus belli, tradiciones y eventos =================
// Tres ideas tomadas de los grandes juegos de estrategia histórica, adaptadas a Hegemonía:
//  1) Casus belli e infamia: atacar a un reino sin motivo te hace infame (el pueblo se queja y el mundo desconfía).
//  2) Tradiciones: la Autoridad (que generan tus ciudades y universidades) compra bonos permanentes a elegir.
//  3) Eventos: cada pocos minutos algo ocurre en tu reino y tomas una decisión.
// Todo es determinista (solo rnd()), así que funciona igual en multijugador.

// ---- Casus belli e infamia
const INFAMY_NOCB=8, INFAMY_MISSILE=10, INFAMY_NUKE=25, INFAMY_COALITION=40, INFAMY_DECAY=0.03, CB_TIME=3000;
// ¿Tiene `att` motivo para atacar a `def`? Tierra sin dueño siempre vale. Si no: si `def` le atacó hace poco,
// si `def` es un traidor que rompió pactos, o si `def` es un agresor infame (coalición contra él).
function hasCB(att:number, def:number): boolean{
  if(def<0 || att<0) return true;
  const A=players[att], D=players[def];
  if(((A.hitBy||{})[def]||-1e9) > tick-CB_TIME) return true;
  if(D.traitorUntil>tick) return true;
  if((D.infamy||0)>=INFAMY_COALITION) return true;
  return false;
}
function addInfamy(p:any, v:number){
  p.infamy=Math.min(100,(p.infamy||0)+v);
  for(const q of players) if(q.alive && q.id!==p.id) addOp(q.id,p.id,-v/4);
  if(p===me) Hooks.log(`{{warn}} Ataque sin casus belli: tu infamia sube a ${Math.round(p.infamy)}. El pueblo se inquieta y los reinos desconfían de ti.`,"bad");
}
// Se llama al iniciar un ataque o bombardeo contra el reino `def`: anota la agresión y cobra la infamia si no había motivo.
function noteAggression(att:number, def:number, v:number){
  if(def<0 || att===def) return;
  if(!hasCB(att,def)) addInfamy(players[att], v);
  const D=players[def]; if(!D.hitBy) D.hitBy={}; D.hitBy[att]=tick;
}

// ---- Tradiciones (ideas nacionales)
const IDEAS: any = {
  comercio:   {n:"Comercio libre",       e:"{{trade}}",   desc:"+12% de oro."},
  agraria:    {n:"Reforma agraria",      e:"{{farm}}",    desc:"La población crece un 20% más rápido."},
  disciplina: {n:"Disciplina militar",   e:"{{attack}}",  desc:"Tus ataques cuestan un 15% menos de tropas."},
  patria:     {n:"Defensa de la patria", e:"{{shield}}",  desc:"Eres un 20% más difícil de conquistar."},
  fe:         {n:"Fe y cultura",         e:"{{temple}}",  desc:"+8 de felicidad: puedes cobrar más impuestos."},
  academia:   {n:"Academias",            e:"{{science}}", desc:"Tus universidades investigan un 50% más rápido."},
  diplomacia: {n:"Diplomacia",           e:"{{ally}}",    desc:"Los reinos aceptan tus pactos con más facilidad y tu infamia baja el doble de rápido."},
  expansion:  {n:"Destino manifiesto",   e:"{{land}}",    desc:"Conquistar tierra sin dueño cuesta un 25% menos."},
};
const IDEA_BASE=100, IDEA_STEP=60;
const hasIdea=(p:any,k:string):boolean=>!!(p.ideas && p.ideas[k]);
function ideaCount(p:any):number{ return p.ideas?Object.keys(p.ideas).length:0; }
function ideaCost(p:any):number{ return IDEA_BASE+IDEA_STEP*ideaCount(p); }
// Autoridad por segundo: base + ciudades + universidades
function powRate(p:any):number{ return 1+0.2*p.cnt.city+0.15*p.cnt.university; }
function adoptIdea(p:any,k:string): string|null{
  if(!IDEAS[k]) return "Esa tradición no existe.";
  if(hasIdea(p,k)) return "Ya tienes esa tradición.";
  const c=ideaCost(p); if((p.pow||0)<c) return `Te faltan ${Math.ceil(c-(p.pow||0))} de autoridad.`;
  p.pow-=c; if(!p.ideas) p.ideas={}; p.ideas[k]=true;
  if(p===me) Hooks.log(`${IDEAS[k].e} Nueva tradición: ${IDEAS[k].n}. ${IDEAS[k].desc}`,"good");
  return null;
}

// ---- Eventos
// o[i] = [texto del botón, qué ocurre (texto corto), efecto]
const EVENTS: any[] = [
  {id:"cosecha", e:"{{farm}}", n:"Buena cosecha", d:"Los campos rebosan de grano. ¿Qué hace el reino con el excedente?", o:[
    ["Almacenarlo y venderlo","+45 s de ingresos",(p:any,s:any)=>{ p.gold+=s.inc*45; }],
    ["Repartirlo al pueblo","+12 de felicidad",(p:any)=>{ p.happy=Math.min(100,p.happy+12); }]]},
  {id:"epidemia", e:"{{warn}}", n:"Epidemia", d:"Una enfermedad se extiende por las ciudades.", o:[
    ["Cuarentena y médicos","cuesta 30 s de ingresos",(p:any,s:any)=>{ p.gold=Math.max(0,p.gold-s.inc*30); }],
    ["Ignorarla","pierdes un 20% de tropas y 6 de felicidad",(p:any)=>{ p.troops*=0.8; p.happy=Math.max(0,p.happy-6); }]]},
  {id:"mercenarios", e:"{{recruit}}", n:"Mercenarios", d:"Una compañía de mercenarios ofrece sus espadas.", o:[
    ["Contratarlos","cuesta 60 s de ingresos y trae un 12% de tu población máxima",(p:any,s:any)=>{ const c=Math.min(p.gold,s.inc*60); p.gold-=c; p.troops=Math.min(s.max*1.05,p.troops+s.max*0.12*c/Math.max(1,s.inc*60)); }],
    ["Rechazarlos","+3 de felicidad",(p:any)=>{ p.happy=Math.min(100,p.happy+3); }]]},
  {id:"revuelta", e:"{{riot}}", n:"Disturbios", d:"Hay protestas en la capital.", o:[
    ["Reprimirlas","pierdes un 8% de tropas, +8 de felicidad",(p:any)=>{ p.troops*=0.92; p.happy=Math.min(100,p.happy+8); }],
    ["Negociar con los líderes","cuesta 30 s de ingresos, +12 de felicidad",(p:any,s:any)=>{ p.gold=Math.max(0,p.gold-s.inc*30); p.happy=Math.min(100,p.happy+12); }]]},
  {id:"erudito", e:"{{science}}", n:"Un erudito llega a la corte", d:"Un gran sabio quiere instalarse en tu reino.", o:[
    ["Fundar una escuela","+25% de la investigación en curso (o 50 de autoridad)",(p:any)=>{ if(p.res.cur) p.res.prog+=RESEARCH[p.res.cur].cost*0.25; else p.pow=(p.pow||0)+50; }],
    ["Nombrarle consejero","+40 de autoridad",(p:any)=>{ p.pow=(p.pow||0)+40; }]]},
  {id:"feria", e:"{{market}}", n:"Feria internacional", d:"Mercaderes de todo el mundo visitan tu reino.", o:[
    ["Abrir las fronteras","+30 s de ingresos y los reinos te aprecian más",(p:any,s:any)=>{ p.gold+=s.inc*30; for(const q of players) if(q.alive&&q.id!==p.id) addOp(q.id,p.id,3); }],
    ["Cobrar tasas","+20 s de ingresos y +5 de felicidad",(p:any,s:any)=>{ p.gold+=s.inc*20; p.happy=Math.min(100,p.happy+5); }]]},
];
const EVENT_WAIT=600; // ticks que tiene un humano para decidir (después se aplica la primera opción)
function resolveEvent(p:any,k:number): string|null{
  const ev=p.evt; if(!ev) return "No hay ninguna decisión pendiente.";
  const E=EVENTS.find((x:any)=>x.id===ev.id), o=E&&E.o[k]; if(!o) return "Opción no válida.";
  p.evt=null; o[2](p,stats(p));
  if(p===me) Hooks.log(`${E.e} ${E.n}: ${o[0].toLowerCase()} (${o[1]}).`);
  return null;
}
function stepPolitica(){
  for(const p of players){ if(!p.alive) continue;
    // Autoridad e infamia
    p.pow=(p.pow||0)+powRate(p)/10;
    if(p.infamy>0) p.infamy=Math.max(0,p.infamy-INFAMY_DECAY*(hasIdea(p,"diplomacia")?2:1));
    if(p.isBot && ideaCount(p)<IDEAS_N && p.pow>=ideaCost(p) && tick%10===0){
      const free=Object.keys(IDEAS).filter(k=>!hasIdea(p,k)); adoptIdea(p,free[(rnd()*free.length)|0]); }
    // Eventos
    if(p.evt){ if(tick>=p.evt.at+EVENT_WAIT) resolveEvent(p,0); }
    else if(tick>=(p.evtAt||0)){
      p.evtAt=tick+1800+((rnd()*1800)|0);
      if(tick>=1200){ const E=EVENTS[(rnd()*EVENTS.length)|0];
        if(p.isBot) { p.evt={id:E.id,at:tick}; resolveEvent(p,rnd()<0.5?0:1); }
        else { p.evt={id:E.id,at:tick}; if(p===me) Hooks.sfx("alarm2"); } }
    }
    // Coalición: los reinos desconfían cada vez más de un agresor infame
    if(tick%10===0 && p.infamy>=INFAMY_COALITION) for(const q of players) if(q.alive && q.id!==p.id) addOp(q.id,p.id,-0.5);
  }
}
const IDEAS_N=Object.keys(IDEAS).length;
