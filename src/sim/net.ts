// ================= Multijugador (sincronización por turnos, "lockstep") =================
// Todos los clientes ejecutan la MISMA simulación con la misma semilla. El servidor no calcula nada: solo numera
// los turnos (10 por segundo = 1 tick) y reparte las órdenes de cada jugador en el orden en que llegaron.
// En cada turno cada cliente aplica las órdenes y avanza un tick, así que el estado es idéntico en todos.
//
// La interfaz sigue llamando a las funciones de siempre (placeBuilding, launchAttack...). En multijugador esas
// llamadas se INTERCEPTAN (netInstall): en vez de ejecutarse, se envían como orden al servidor y se ejecutan cuando
// vuelven dentro de un turno. Mientras la simulación corre, `simBusy` está activo y las funciones se ejecutan normal.
//
// Regla de oro para quien toque la simulación: NO usar Math.random ni nada que dependa de `me`, del reloj o del DOM
// dentro de lo que cambia el estado. Usa rnd() y deja lo visual en los Hooks. `tools/test-net.mjs` lo comprueba
// con dos clientes y el servidor real.
let netMe=-1, simBusy=false, netMuted=false, netInstalled=false;
let netSend: (m:any)=>void = ()=>{};
let netQueue: any[]=[];
const netPend: any[]=[]; // ofertas de pacto pendientes entre humanos {from,to,type,t}
const netOrig: any={};

function mulberry32(seed:number): ()=>number{
  let a=seed|0;
  return ()=>{ a=(a+0x6D2B79F5)|0; let t=Math.imul(a^(a>>>15),1|a); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; };
}

// Intercepta una función de la simulación: desde la interfaz envía una orden; desde la simulación se ejecuta normal.
function netWrap(name:string, fn:(a:any[])=>any){
  const g:any=globalThis; netOrig[name]=g[name]; const orig=g[name];
  g[name]=function(...a:any[]){ if(!netOn || simBusy) return orig(...a); return fn(a); };
}
function netCmd(...c:any[]){ netSend({t:"cmd",c}); }

function netInstall(){
  if(netInstalled) return; netInstalled=true;
  netWrap("placeBuilding", a=>{ if(a[3]) return netOrig.placeBuilding(...a); netCmd("build",a[1],a[2]); });
  netWrap("upgradeBuilding", a=>{ netCmd("up",a[1].i); return null; });
  netWrap("launchAttack", a=>{ netCmd("atk",a[1],a[2]); return true; });
  netWrap("stepAttacks", ()=>{}); // la interfaz lo llama tras atacar; en red solo avanza con los turnos
  netWrap("sendBoat", a=>{ netCmd("boat",a[1],a[2]); return null; });
  netWrap("launchMissile", a=>{ netCmd("msl",a[1],a[2]); return null; });
  netWrap("recallAttack", a=>{ netCmd("recall",a[1]); const x=attacks.find((q:any)=>q.att===netMe&&q.def===a[1]); return x?x.troops:0; });
  netWrap("reinforceAttack", a=>{ netCmd("reinf",a[1],a[2]); const x=attacks.find((q:any)=>q.att===netMe&&q.def===a[1]); return x?Math.floor(players[netMe].troops*a[2]):0; });
  netWrap("setStance", a=>{ netCmd("stance",a[1]); });
  netWrap("setTax", a=>{ netCmd("tax",a[1]); });
  netWrap("recruit", ()=>{ netCmd("recruit"); return null; });
  netWrap("sendReinforcements", a=>{ netCmd("rally",a[1],a[2]); return Math.floor(players[netMe].troops*a[2]); });
  netWrap("breakPacts", a=>{ netCmd("break",a[1]); });
  netWrap("propose", a=>{ netCmd("prop",a[1],a[2]); return true; });
  netWrap("signPact", a=>{ netCmd("accept",a[0],a[2]); });
  netWrap("sendGift", a=>{ netCmd("gift",a[1],a[2]); return true; });
  netWrap("sendPlane", a=>{ netCmd("plane",a[1]); return null; });
  netWrap("sendTrade", a=>{ netCmd("cargo",a[1]); return null; });
  netWrap("buyWarship", ()=>{ netCmd("wship"); return null; });
  netWrap("buyWarplane", ()=>{ netCmd("wplane"); return null; });
  netWrap("setPatrol", a=>{ if(!isWater(a[1],a[2])) return "Elige un punto del mar."; netCmd("patrol",wships.indexOf(a[0]),a[1],a[2]); return null; });
  netWrap("addOp", ()=>{}); // la interfaz ajusta opiniones a mano al aceptar/rechazar ofertas; en red lo decide la orden
  // El bucle de pantalla llama a gameTick() cada 100 ms: en red consume turnos recibidos del servidor.
  const g:any=globalThis; netOrig.gameTick=g.gameTick;
  g.gameTick=function(){ if(!netOn) return netOrig.gameTick(); netAdvance(1+Math.max(0,netQueue.length-4)); };
}

// Empieza una partida en red con los datos que manda el servidor (m = {seed, humans, bots, diff, you}).
function netBegin(m:any){
  netOn=true; netWinner=-1; netMe=m.you; netQueue=[]; netPend.length=0; netMuted=false;
  rngFn=mulberry32(m.seed);
  newGameNet(m.humans, m.bots, m.diff, m.you);
  spawned=true; paused=false; over=false; spectating=false; speed=1; tick=0;
  Hooks.canOffer=()=>false; // los bots no hacen ofertas a los humanos (dependería del cliente y rompería la sincronía)
  const log=Hooks.log, sfx=Hooks.sfx;
  Hooks.log=(msg:string,kind?:string)=>{ if(!netMuted) log(msg,kind); };
  Hooks.sfx=(name:string,vol?:number)=>{ if(!netMuted) sfx(name,vol); };
  netInstall();
}

// Mensajes del servidor que entiende la simulación. Devuelve true si lo ha consumido.
function netOnMessage(m:any): boolean{
  if(m.t==="turn"){ netQueue.push(m); return true; }
  if(m.t==="desync"){ Hooks.log("{{warn}} ¡Desincronización detectada! Tu partida ya no coincide con la de otros jugadores.","bad"); return true; }
  return false;
}

function netAdvance(max:number){
  let k=0;
  while(netQueue.length && k<max && netWinner<0){
    const m=netQueue.shift(); simBusy=true;
    try{
      for(const [slot,c] of m.c){ try{ netExec(slot,c); }catch(e){} }
      netOrig.gameTick();
    } finally { simBusy=false; netMuted=false; }
    k++;
    if(tick%50===0) netSend({t:"sum",n:tick,h:netChecksum()});
  }
}

// Huella del estado para detectar desincronizaciones (la compara el servidor).
function netChecksum(): number{
  let h=2166136261>>>0; const mix=(v:number)=>{ h=Math.imul(h^(v|0),16777619)>>>0; };
  for(const p of players){ mix(p.tiles); mix(Math.floor(p.troops)); mix(Math.floor(p.gold)); mix(p.alive?1:0); }
  for(let i=0;i<N;i+=97) mix(owner[i]);
  mix(buildings.length); mix(attacks.length); mix(boats.length); mix(missiles.length);
  return h;
}

// ---- Órdenes. Todo lo que llega de la red se valida: un cliente tramposo o con errores no debe romper a los demás.
const isNum=(v:any,lo:number,hi:number)=>typeof v==="number" && isFinite(v) && v>=lo && v<=hi;
const isInt=(v:any,lo:number,hi:number)=>isNum(v,lo,hi) && Math.floor(v)===v;
function netExec(slot:number, c:any){
  const p=players[slot]; if(!p || !Array.isArray(c) || typeof c[0]!=="string") return;
  const k=c[0], mine=slot===netMe;
  if(k==="bot"){ if(p.alive && !p.isBot){ p.isBot=true; Hooks.log(`{{break}} ${p.name} ha salido de la partida: su reino pasa a ser controlado por la IA.`); } return; }
  if(!p.alive) return;
  let why:any=null;
  const alive=(i:any)=>isInt(i,0,P-1) && i!==slot && players[i].alive;
  switch(k){
    case "build": if(typeof c[1]==="string" && BT[c[1]] && isInt(c[2],0,N-1)){ why=canBuild(p,c[1],c[2]); if(!why) placeBuilding(p,c[1],c[2],false); } break;
    case "up": { const b=isInt(c[1],0,N-1)&&bldAt[c[1]]>=0?buildings[bldAt[c[1]]]:null; if(b && !b.dead && b.owner===slot) why=upgradeBuilding(p,b); break; }
    case "atk": if(isInt(c[1],-1,P-1) && c[1]!==slot && (c[1]<0||players[c[1]].alive) && isNum(c[2],1,1e15)){
      const troops=Math.min(c[2],p.troops), cands=borderCandidates(slot,c[1]); if(troops>=1 && cands.length) launchAttack(slot,c[1],troops,cands); } break;
    case "boat": if(isInt(c[1],0,N-1) && isNum(c[2],1,1e15)) why=sendBoat(p,c[1],Math.min(c[2],p.troops)); break;
    case "msl": if(typeof c[1]==="string" && WEAP[c[1]] && isInt(c[2],0,N-1)) why=launchMissile(p,c[1],c[2]); break;
    case "recall": if(isInt(c[1],-1,P-1)) recallAttack(p,c[1]); break;
    case "reinf": if(isInt(c[1],-1,P-1) && isNum(c[2],0.01,1)) reinforceAttack(p,c[1],c[2]); break;
    case "stance": if(typeof c[1]==="string" && STANCE[c[1]]) setStance(p,c[1]); break;
    case "tax": if(isInt(c[1],0,80)) p.tax=c[1]; break;
    case "recruit": why=recruit(p); break;
    case "rally": if(alive(c[1]) && isNum(c[2],0.01,1)){ const r=sendReinforcements(slot,c[1],c[2]); if(typeof r==="string") why=r; } break;
    case "break": if(alive(c[1])) breakPacts(slot,c[1]); break;
    case "gift": if(alive(c[1]) && isNum(c[2],1,1e15)) sendGift(slot,c[1],c[2]); break;
    case "plane": if(alive(c[1])) why=sendPlane(slot,c[1]); break;
    case "cargo": if(alive(c[1])) why=sendTrade(slot,c[1]); break;
    case "wship": why=buyWarship(p); break;
    case "wplane": why=buyWarplane(p); break;
    case "patrol": { const w=isInt(c[1],0,1e6)?wships[c[1]]:null; if(w && w.owner===slot && isNum(c[2],0,W) && isNum(c[3],0,H)) why=setPatrol(w,c[2],c[3]); break; }
    case "prop": if(alive(c[1]) && (c[2]==="nap"||c[2]==="trade"||c[2]==="ally")){
      const to=c[1], type=c[2], r=rel(slot,to);
      if((type==="nap"&&r.nap>tick)||(type==="trade"&&r.trade)||(type==="ally"&&r.ally)){ why="Ya tenéis ese acuerdo."; break; }
      if(players[to].isBot){ netMuted=!mine; propose(slot,to,type); netMuted=false; }
      else {
        if(!netPend.some(q=>q.from===slot&&q.to===to&&q.type===type&&tick-q.t<600)) netPend.push({from:slot,to,type,t:tick});
        if(mine) Hooks.log(`{{trade}} Propuesta enviada a ${players[to].name}. Espera su respuesta.`);
        if(to===netMe) Hooks.offer(slot,type);
      } } break;
    case "accept": if(isInt(c[1],0,P-1) && (c[2]==="nap"||c[2]==="trade"||c[2]==="ally")){
      const k2=netPend.findIndex(q=>q.from===c[1]&&q.to===slot&&q.type===c[2]&&tick-q.t<1200);
      if(k2>=0 && players[c[1]].alive){ netPend.splice(k2,1); signPact(c[1],slot,c[2]); addOp(c[1],slot,10); addOp(slot,c[1],10);
        if(c[1]===netMe) Hooks.log(`{{ok}} ${p.name} ha aceptado tu propuesta.`,"good"); } } break;
  }
  if(why && mine){ Hooks.log(why,"bad"); Hooks.sfx("err"); }
}
