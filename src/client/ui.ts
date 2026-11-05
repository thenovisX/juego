// @ts-nocheck  (cliente: DOM sin tipar de momento; la simulación sí se comprueba)
// ================= Interacción =================
let selShip=null; let mode=null; // {k:"build",t} | {k:"weap",t} | {k:"dip"}
const pointers=new Map(); let drag=null, pinch=null, pressTimer=0, lastMouse=null;
cv.addEventListener("pointerdown",e=>{ cv.setPointerCapture(e.pointerId); pointers.set(e.pointerId,{x:e.clientX,y:e.clientY}); initAudio();
  if(pointers.size===1){ drag={sx:e.clientX,sy:e.clientY,cx:cam.x,cy:cam.y,moved:false,btn:e.button,long:false};
    if(e.pointerType!=="mouse"){ clearTimeout(pressTimer); pressTimer=setTimeout(()=>{ if(drag && !drag.moved){ drag.long=true; openDipAt(screenToTile(drag.sx,drag.sy)); } },550); } }
  else if(pointers.size===2){ const [a,b]=[...pointers.values()]; pinch={d:Math.hypot(a.x-b.x,a.y-b.y)}; drag=null; clearTimeout(pressTimer); } });
cv.addEventListener("pointermove",e=>{
  lastMouse=[e.clientX,e.clientY];
  if(pointers.has(e.pointerId)) pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pinch && pointers.size===2){ const [a,b]=[...pointers.values()], d=Math.hypot(a.x-b.x,a.y-b.y); applyZoom((a.x+b.x)/2,(a.y+b.y)/2,d/pinch.d); cam.tz=cam.z; pinch.d=d; return; }
  if(drag){ const dx=e.clientX-drag.sx, dy=e.clientY-drag.sy; if(Math.abs(dx)+Math.abs(dy)>7){ drag.moved=true; clearTimeout(pressTimer); }
    if(drag.moved){ cam.x=drag.cx-dx/cam.z; cam.y=drag.cy-dy/cam.z; clampCam(); } }
  if(e.pointerType==="mouse") updateTip(e.clientX,e.clientY);
});
const endPtr=e=>{ pointers.delete(e.pointerId); clearTimeout(pressTimer);
  if(drag && !drag.moved && !drag.long && e.type==="pointerup"){
    if(drag.btn===0) handleClick(screenToTile(e.clientX,e.clientY));
    else if(drag.btn===2){ if(mode) setMode(null); else openDipAt(screenToTile(e.clientX,e.clientY)); } }
  if(pointers.size<2) pinch=null; if(pointers.size===0) drag=null; };
cv.addEventListener("pointerup",endPtr); cv.addEventListener("pointercancel",endPtr);
cv.addEventListener("pointerleave",()=>{ tip.hidden=true; lastMouse=null; });
cv.addEventListener("contextmenu",e=>e.preventDefault());
cv.addEventListener("wheel",e=>{ e.preventDefault(); zoomAt(e.clientX,e.clientY,Math.exp(-e.deltaY*0.0018)); },{passive:false});
document.getElementById("zin").onclick=()=>zoomAt(vw/2,vh/2,1.6);
document.getElementById("zout").onclick=()=>zoomAt(vw/2,vh/2,1/1.6);
document.getElementById("home").onclick=()=>{ if(me&&me.tiles) centerOn(me.sumX/me.tiles,me.sumY/me.tiles,Math.max(cam.z,4)); };

const tip=document.getElementById("tip");
function updateTip(sx,sy){
  const i=screenToTile(sx,sy); if(i<0||!started){ tip.hidden=true; return; }
  const t=terrain[i]; let s=TER[t].e+" "+TER[t].n;
  if(t){ const o=owner[i], rl=o>=0?relLabel(me.id,o).join(""):"";
    s+=" · "+(o<0?"Tierra libre":players[o].name+(rl?" "+rl:""));
    if(wall[i]) s+=" · {{wall}} muralla"; if(fallout[i]>tick) s+=" · {{rad}} radiación";
    const b=bldAt[i]; if(b>=0){ const B=buildings[b]; s+=` · ${BT[B.t].e} ${BT[B.t].n}${B.lvl>1?" Nv "+B.lvl:""}${B.done>tick?" (en obras)":""}`; }
    if(o>=0 && o!==me.id) s+=` · {{troops}} ${fmt(players[o].troops)}`; }
  if(mode && spawned){
    if(mode.k==="build"){ const why=t?canBuild(me,mode.t,i):"Elige un punto de tu territorio."; s=(why||`Construir ${BT[mode.t].e} ${BT[mode.t].n}`)+" — "+s; }
    else if(mode.k==="weap") s=`${WEAP[mode.t].e} Lanzar ${WEAP[mode.t].n} (radio ${WEAP[mode.t].r}) — `+s;
    else if(mode.k==="dip") s="{{ally}} Elige un reino — "+s;
  }
  tip.textContent=s; tip.hidden=false; tip.style.left=Math.max(4,Math.min(sx+14,vw-tip.offsetWidth-6))+"px"; tip.style.top=(sy+16)+"px";
}

function handleClick(i){
  if(i<0 || (over && !spectating)) return;
  if(!spawned){
    if(!terrain[i] || owner[i]>=0 || terrain[i]===5){ log("Elige tierra libre (sin hielo) para empezar.","bad"); return; }
    spawnAt(me,i%W,(i/W)|0,7); spawned=true; document.getElementById("hint").hidden=true; sfx("build");
    centerOn(i%W,(i/W)|0,Math.max(cam.z,4));
    log("{{crown}} Tu reino ha nacido. Toca tierra libre para expandirte.","good"); return;
  }
  if(!me.alive) return;
  if(mode){
    if(mode.k==="build"){ const why=canBuild(me,mode.t,i); if(why){ log(why,"bad"); sfx("err"); return; }
      placeBuilding(me,mode.t,i,false); sfx("build"); { const nb=buildings[buildings.length-1]; log(nb.need?`{{obra}} ${BT[mode.t].n}: esperando materiales (${Object.entries(nb.need).map(([r,n])=>r+" "+n).join(", ")}). ${matDiagnose(nb)}`:`${BT[mode.t].e} ${BT[mode.t].n} en construcción (5 s).`); } if(!shiftHeld) setMode(null); return; }
    if(mode.k==="weap"){ const t=mode.t, why=launchMissile(me,t,i); if(why){ log(why,"bad"); sfx("err"); return; } sfx("launch"); log(`${WEAP[t].e} ${WEAP[t].n} lanzado.`); if(!shiftHeld) setMode(null); return; }
    if(mode.k==="dip"){ openDipAt(i); setMode(null); return; }
    if(mode.k==="patrol"){ const cx=i%W+0.5, cy=((i/W)|0)+0.5, mine=wships.filter(w=>w.owner===me.id);
      if(!mine.length){ log("No tienes buques de guerra. Compra uno con el botón Buque.","bad"); setMode(null); return; }
      const hit=mine.find(w=>Math.hypot(wdx(w.x,cx),w.y-cy)<=4);
      if(hit){ selShip=hit; log("{{wship}} Buque seleccionado. Ahora toca el punto del mar donde debe patrullar."); return; }
      const w=selShip&&mine.includes(selShip)?selShip:mine.reduce((m,x)=>Math.hypot(wdx(x.x,cx),x.y-cy)<Math.hypot(wdx(m.x,cx),m.y-cy)?x:m);
      const why=setPatrol(w,cx,cy); if(why){ log(why,"bad"); sfx("err"); return; }
      selShip=w; sfx("build"); log("{{wship}} El buque se dirige a esa zona y patrullará allí (radio "+WSHIP_ZONE+").","good"); if(!shiftHeld) setMode(null); return; }
  }
  if(!terrain[i]) return;
  const def=owner[i]; if(def===me.id){ openOwnBuilding(i); return; }
  if(def>=0 && peaceful(me.id,def)){
    showProp(`Tienes un pacto con <b>${esc(players[def].name)}</b>. Si atacas, lo romperás y los demás reinos desconfiarán de ti.`,
      [["Atacar igualmente",()=>{ breakPacts(me.id,def); attackAt(i); }],["Cancelar",null]]); return; }
  attackAt(i);
}
function openOwnBuilding(i){
  const b=bldAt[i]>=0?buildings[bldAt[i]]:null; if(!b||b.dead||b.owner!==me.id) return;
  const head=`${BT[b.t].e} <b>${BT[b.t].n}</b> · nivel ${b.lvl} de ${MAX_LVL}${matInfo(b)?"<br>"+matInfo(b):""}`;
  if(b.done>tick){ showProp(isFinite(b.done)?`${head}<br>Todavía en obras.`:head,[["Cerrar",null]]); return; }
  if(b.lvl>=MAX_LVL){ showProp(`${head}<br>Está al nivel máximo.`,[["Cerrar",null]]); return; }
  const c=upCost(b);
  showProp(`${head}<br>Mejorar a nivel ${b.lvl+1} cuesta <b>${fmt(c)}</b> {{gold}}: ${UP_DESC[b.t]}.`,
    [[`{{up}} Mejorar · ${fmt(c)}`,()=>{ const why=upgradeBuilding(me,b); if(why){ log(why,"bad"); sfx("err"); } else { log(`{{up}} ${BT[b.t].n} mejorada a nivel ${b.lvl}.`,"good"); sfx("build"); } }],["Cerrar",null]]);
}
function attackAt(i){
  const def=owner[i], troops=Math.floor(me.troops*ratio);
  if(troops<1){ log("No tienes tropas suficientes.","bad"); return; }
  const cands=borderCandidates(me.id,def);
  if(cands.length){ launchAttack(me.id,def,troops,cands); sfx("march"); if(def>=0) log(`{{attack}} Atacas a ${players[def].name} con ${fmt(troops)} tropas.`); stepAttacks(); return; }
  const why=sendBoat(me,i,troops);
  if(why){ log(def<0?`No tienes frontera con esa tierra. ${why}`:`No tienes frontera con ${players[def].name}. ${why}`,"bad"); sfx("err"); }
  else { log(`{{boat}} Flota enviada con ${fmt(troops)} tropas.`); sfx("march"); }
}

let ratio=0.3, shiftHeld=false;
const ratioEl=document.getElementById("ratio");
ratioEl.oninput=()=>{ ratio=ratioEl.value/100; document.getElementById("ratioV").textContent=ratioEl.value+"%"; updateRatioN(); document.querySelectorAll("#send .presets .btn").forEach(b=>b.classList.toggle("on",+b.dataset.r===+ratioEl.value)); };
function updateRatioN(){ document.getElementById("ratioN").textContent=me?fmt(Math.floor(me.troops*ratio)):"0"; }
document.querySelectorAll("#send .presets .btn").forEach(b=>b.onclick=()=>{ ratioEl.value=b.dataset.r; ratioEl.oninput(); });
ratioEl.oninput();
const taxEl=document.getElementById("tax");
taxEl.oninput=()=>{ if(me) me.tax=+taxEl.value; document.getElementById("taxV").textContent=taxEl.value+"%"; };
taxEl.addEventListener("pointerup",()=>taxEl.blur()); taxEl.addEventListener("change",()=>taxEl.blur());
const weapEl=document.getElementById("weap");
const TAB_OF={city:"eco",mine:"eco",foundry:"eco",port:"eco",airport:"eco",sawmill:"eco",farm:"eco",bank:"eco",station:"eco",fort:"def",sam:"def",silo:"def"};
const pageEl=k=>document.querySelector(`#dock [data-page="${k}"]`);
function showTab(k){ document.querySelectorAll("#dock .tab").forEach(t=>{ const on=t.dataset.tab===k; t.classList.toggle("on",on); t.setAttribute("aria-selected",on); }); document.querySelectorAll("#dock .page").forEach(p=>p.hidden=p.dataset.page!==k); }
document.querySelectorAll("#dock .tab").forEach(t=>t.onclick=()=>showTab(t.dataset.tab));
function mkCard(parent,id,e,label,key,title,onclick,cls){ const b=document.createElement("button"); b.type="button"; b.className="btn card"+(cls?" "+cls:""); b.id=id; b.title=title;
  b.innerHTML=`<kbd>${key}</kbd><span class="em">${e}</span><span class="lb">${label}</span><span class="co" id="${id}_c"></span>`; b.onclick=onclick; parent.appendChild(b); }
for(const t in BT) mkCard(pageEl(TAB_OF[t]||"eco"),"b_"+t,BT[t].e,BT[t].n,BT[t].key,BT[t].desc+matText(t),()=>toggleMode({k:"build",t}));
for(const t in WEAP) mkCard(weapEl,"w_"+t,WEAP[t].e,WEAP[t].n,WEAP[t].key,WEAP[t].desc,()=>toggleMode({k:"weap",t}),"weap");
mkCard(weapEl,"w_ship","{{wship}}","Buque","B","Buque de guerra: patrulla desde tu puerto, intercepta cargueros enemigos y se queda su oro",()=>{ const why=buyWarship(me); if(why){ log(why,"bad"); sfx("err"); } else { sfx("build"); selShip=wships.filter(w=>w.owner===me.id).pop(); setMode({k:"patrol"}); log("{{wship}} Buque de guerra botado. Toca el punto del mar donde quieres que patrulle: se quedará por esa zona y cañoneará a los cargueros enemigos que entren."); } },"weap");
mkCard(weapEl,"w_patrol","{{wship}}","Zona de patrulla","Z","Elige un buque de guerra (tócalo) y luego el punto del mar donde debe quedarse patrullando",()=>toggleMode({k:"patrol"}),"weap");
mkCard(weapEl,"w_plane","{{wplane}}","Avión de guerra","V","Avión de guerra: patrulla desde tu aeropuerto y derriba aviones comerciales enemigos",()=>{ const why=buyWarplane(me); if(why){ log(why,"bad"); sfx("err"); } else { sfx("build"); log("{{wplane}} Avión de guerra listo para patrullar."); } },"weap");
document.getElementById("dipBtn").onclick=()=>toggleMode({k:"dip"});
const sameMode=(a,b)=>!!a&&!!b&&a.k===b.k&&a.t===b.t;
function toggleMode(m){ setMode(sameMode(mode,m)?null:m); }
function setMode(m){ mode=m;
  if(m){ const k=m.k==="build"?(TAB_OF[m.t]||"eco"):m.k==="dip"?"dip":"weap"; showTab(k); }
  for(const t in BT) document.getElementById("b_"+t).classList.toggle("on",sameMode(m,{k:"build",t}));
  for(const t in WEAP) document.getElementById("w_"+t).classList.toggle("on",sameMode(m,{k:"weap",t}));
  document.getElementById("dipBtn").classList.toggle("on",!!m&&m.k==="dip"); document.getElementById("w_patrol").classList.toggle("on",!!m&&m.k==="patrol");
  cv.style.cursor=!m||m.k==="weap"||m.k==="patrol"?"crosshair":m.k==="dip"?"help":"copy"; }
document.getElementById("pauseBtn").onclick=togglePause;
function togglePause(){ paused=!paused; document.getElementById("pauseBtn").textContent=paused?"{{play}}":"{{pause}}"; }
document.getElementById("spdBtn").onclick=()=>{ speed=speed===1?2:speed===2?3:1; document.getElementById("spdBtn").textContent="{{speed}} "+speed+"x"; };
document.getElementById("boardBtn").onclick=()=>document.getElementById("board").classList.toggle("show");
document.getElementById("helpBtn").onclick=showHelp;
const panKeys=new Set(), PAN={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};
ratioEl.addEventListener("pointerup",()=>ratioEl.blur()); ratioEl.addEventListener("change",()=>ratioEl.blur());
addEventListener("blur",()=>panKeys.clear());
setInterval(()=>{ if(!panKeys.size||!started) return; let dx=0,dy=0; for(const k of panKeys){ const v=PAN[k]; dx+=v[0]; dy+=v[1]; }
  const sp=(shiftHeld?26:12)/cam.z; cam.x+=dx*sp; cam.y+=dy*sp; clampCam(); },16);
addEventListener("keyup",e=>{ panKeys.delete(e.key); panKeys.delete(e.key.toLowerCase()); });
addEventListener("keydown",e=>{ if(e.key in PAN && e.target.tagName!=="SELECT" && (e.target.tagName!=="INPUT"||e.target.type==="range") && started){ e.preventDefault(); panKeys.add(e.key); shiftHeld=e.shiftKey; return; }
  if(e.target.tagName==="INPUT"||e.target.tagName==="SELECT"||!started) return; shiftHeld=e.shiftKey;
  for(const t in BT) if(e.key===BT[t].key) toggleMode({k:"build",t});
  for(const t in WEAP) if(e.key===WEAP[t].key) toggleMode({k:"weap",t});
  if(e.key==="d"||e.key==="D") toggleMode({k:"dip"});
  if(e.key==="b"||e.key==="B") document.getElementById("w_ship").click();
  if(e.key==="z"||e.key==="Z") toggleMode({k:"patrol"});
  if(e.key==="v"||e.key==="V") document.getElementById("w_plane").click();
  if(e.key==="Escape"){ setMode(null); closeDip(); }
  if(e.key===" "){ e.preventDefault(); togglePause(); }
  if(e.key==="q"){ ratioEl.value=Math.max(5,+ratioEl.value-5); ratioEl.oninput(); }
  if(e.key==="e"){ ratioEl.value=Math.min(100,+ratioEl.value+5); ratioEl.oninput(); } });
addEventListener("keyup",e=>shiftHeld=e.shiftKey);

const mini=document.getElementById("mini"), mctx=mini.getContext("2d");
function miniJump(e){ const r=mini.getBoundingClientRect(); centerOn((e.clientX-r.left)/r.width*W,(e.clientY-r.top)/r.height*H); }
let miniDrag=false;
mini.addEventListener("pointerdown",e=>{ miniDrag=true; mini.setPointerCapture(e.pointerId); miniJump(e); });
mini.addEventListener("pointermove",e=>{ if(miniDrag) miniJump(e); });
mini.addEventListener("pointerup",()=>miniDrag=false);

// ================= UI =================
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const logEl=document.getElementById("log");
function log(msg,kind){ const d=document.createElement("div"); d.textContent=msg; if(kind) d.className=kind; logEl.prepend(d);
  while(logEl.children.length>5) logEl.lastChild.remove(); setTimeout(()=>{d.style.opacity=0; setTimeout(()=>d.remove(),700);},5500); }

let propOpen=null, lastProp=0;
const propEl=document.getElementById("prop");
function showProp(html,buttons,until){
  propEl.innerHTML=`<p>${html}</p><div class="row"></div>`; const row=propEl.querySelector(".row");
  buttons.forEach(([label,fn],k)=>{ const b=document.createElement("button"); b.type="button"; b.className="btn"+(k===0?" on":""); b.textContent=label; b.onclick=()=>{ closeProp(); if(fn) fn(); }; row.appendChild(b); });
  propEl.hidden=false; propOpen={until:until||Infinity};
}
function closeProp(){ propEl.hidden=true; propOpen=null; }
function offerToPlayer(from,type){
  lastProp=tick; const F=players[from];
  const txt={nap:`{{nap}} <b>${esc(F.name)}</b> te propone un pacto de no agresión durante 5 minutos.`,
             trade:`{{trade}} <b>${esc(F.name)}</b> te propone un acuerdo comercial: +12% de oro para los dos.`,
             ally:`{{ally}} <b>${esc(F.name)}</b> quiere formar una alianza contigo.`}[type];
  sfx("alarm2");
  showProp(txt,[["Aceptar",()=>{ signPact(from,me.id,type); addOp(from,me.id,10); log("{{ok}} Acuerdo firmado con "+F.name+".","good"); sfx("good"); }],
    ["Rechazar",()=>addOp(from,me.id,-8)]], tick+200);
}

const dipEl=document.getElementById("dip"); let dipFor=-1;
function openDipAt(i){ if(i<0||!spawned) return; const o=owner[i]; if(o===me.id){ log("Ese es tu propio reino."); return; } if(o<0) return; openDip(o); }
function openDip(o){ dipFor=o; renderDip(); dipEl.hidden=false; }
function closeDip(){ dipEl.hidden=true; dipFor=-1; }
function renderDip(){
  if(dipFor<0) return; const p=players[dipFor];
  if(!p.alive){ dipEl.innerHTML=`<button class="btn x" type="button" aria-label="Cerrar">{{close}}</button><h3>${esc(p.name)}</h3><p>Este reino ya no existe.</p>`; dipEl.querySelector(".x").onclick=closeDip; return; }
  const r=peek(me.id,dipFor)||{nap:0,trade:false,ally:false}, o=op(dipFor,me.id);
  const mood=o>35?["{{f1}} Amistoso","g"]:o>5?["{{f2}} Cordial","g"]:o>-20?["{{f3}} Neutral",""]:o>-50?["{{f4}} Desconfiado","r"]:["{{f5}} Hostil","r"];
  const chips=[`<span class="chip ${mood[1]}">${mood[0]}</span>`];
  if(r.ally) chips.push(`<span class="chip g">{{ally}} Aliados</span>`);
  else if(r.nap>tick) chips.push(`<span class="chip g">{{nap}} No agresión · ${Math.ceil((r.nap-tick)/10)} s</span>`);
  if(r.trade) chips.push(`<span class="chip g">{{trade}} Comercio</span>`);
  if(attacks.some(a=>a.att===dipFor&&a.def===me.id)) chips.push(`<span class="chip r">{{attack}} Te está atacando</span>`);
  if(p.traitorUntil>tick) chips.push(`<span class="chip r">{{traitor}} Traidor</span>`);
  const pct=Math.round(ratio*100), siloOk=me.B.silo.some(b=>b.done<=tick), mil=[], trd=[];
  mil.push(`<button class="btn" type="button" data-a="attack">{{attack}} Atacar <small>${pct}% · ${fmt(me.troops*ratio)}</small></button>`);
  mil.push(`<button class="btn" type="button" data-a="boat" ${me.B.port.some(b=>b.done<=tick)?"":"disabled"}>{{boat}} Enviar barco <small>${pct}% · desembarco</small></button>`);
  for(const t in WEAP){ const w=WEAP[t], off=!siloOk||me.gold<w.cost;
    mil.push(`<button class="btn" type="button" data-a="bomb:${t}" ${off?"disabled":""} title="${siloOk?w.desc:"Necesitas un silo terminado"}">${w.e} ${w.n} <small>${fmt(w.cost)} {{gold}}</small></button>`); }
  if(r.trade){ const why=tradeCheck(me.id,dipFor);
    trd.push(`<button class="btn" type="button" data-a="ship" ${why?"disabled":""} title="${why||"Exporta materiales por mar"}">{{cargo}} Enviar cargamento <small>+${fmt(tradeValue(me))} {{gold}}</small></button>`); }
  if(r.trade){ const why=airCheck(me.id,dipFor);
    trd.push(`<button class="btn" type="button" data-a="plane" ${why?"disabled":""} title="${why||"Envía un avión comercial a un aeropuerto del reino"}">{{plane}} Enviar avión comercial <small>+${fmt(airValue(me))} {{gold}}</small></button>`); }
  const acts=[];
  if(!r.ally && r.nap<=tick) acts.push(`<button class="btn" type="button" data-a="nap">{{nap}} Pacto de no agresión <small>5 min</small></button>`);
  if(!r.trade) acts.push(`<button class="btn" type="button" data-a="trade">{{trade}} Acuerdo comercial <small>+12% oro</small></button>`);
  if(!r.ally) acts.push(`<button class="btn" type="button" data-a="ally">{{ally}} Proponer alianza <small>permanente</small></button>`);
  acts.push(`<button class="btn" type="button" data-a="gift" ${me.gold<300*GOLD_X?"disabled":""}>{{gift}} Regalar ${fmt(300*GOLD_X)} de oro <small>mejora la relación</small></button>`);
  if(r.ally) acts.push(`<button class="btn" type="button" data-a="help">🆘 Pedir ayuda <small>ataca a tu enemigo</small></button>`);
  if(r.ally||r.nap>tick||r.trade) acts.push(`<button class="btn" type="button" data-a="break">{{break}} Romper acuerdos</button>`);
  acts.push(`<button class="btn" type="button" data-a="go">{{pin}} Ver en el mapa</button>`);
  dipEl.innerHTML=`<button class="btn x" type="button" aria-label="Cerrar">{{close}}</button>
    <h3><i style="background:rgb(${p.c})"></i>${esc(p.name)}</h3>
    <div class="st"><div><span>Tropas</span><b class="num">${fmt(p.troops)}</b></div><div><span>Territorio</span><b class="num">${(p.tiles/landTotal*100).toFixed(1)}%</b></div>
    <div><span>Oro</span><b class="num">${fmt(p.gold)}</b></div><div><span>Ciudades</span><b class="num">${p.cnt.city}</b></div></div>
    <div class="chips">${chips.join("")}</div><h4>Militar</h4><div class="acts">${mil.join("")}</div>
    <h4>Diplomacia y comercio</h4><div class="acts">${trd.concat(acts).join("")}</div>`;
  dipEl.querySelector(".x").onclick=closeDip;
  dipEl.querySelectorAll("[data-a]").forEach(b=>b.onclick=()=>dipAction(b.dataset.a));
}
function bombTarget(o){ const c=buildings.find(b=>!b.dead&&b.owner===o&&b.t==="city"); return c?c.i:tilesOf[o][(Math.random()*tilesOf[o].length)|0]; }
// Casilla enemiga más cercana a mis puertos (o a mi centro si no tengo): destino de desembarcos y ataques sin frontera.
function nearestEnemyTile(o){
  const L=tilesOf[o], src=me.B.port.filter(b=>b.done<=tick); if(!L.length) return -1;
  const sx=src.length?src[0].x:me.sumX/Math.max(1,me.tiles), sy=src.length?src[0].y:me.sumY/Math.max(1,me.tiles); let best=-1, bd=1e9;
  for(let k=0;k<Math.min(600,L.length);k++){ const i=L[(Math.random()*L.length)|0], d=Math.hypot(wdx(i%W,sx),((i/W)|0)-sy); if(d<bd){ bd=d; best=i; } }
  return best;
}
function militaryAction(o,a){
  const go=()=>{ if(a==="boat"){ const ti=nearestEnemyTile(o), troops=Math.floor(me.troops*ratio);
      if(troops<1){ log("No tienes tropas suficientes.","bad"); return; }
      const why=ti<0?"Ese reino no tiene tierras.":sendBoat(me,ti,troops); if(why){ log(why,"bad"); sfx("err"); } else { log(`{{boat}} Flota enviada contra ${players[o].name} con ${fmt(troops)} tropas.`); sfx("march"); } }
    else { const c=borderCandidates(me.id,o); attackAt(c.length?c[(Math.random()*c.length)|0]:nearestEnemyTile(o)); } };
  if(peaceful(me.id,o)) showProp(`Tienes un pacto con <b>${esc(players[o].name)}</b>. Si atacas, lo romperás y los demás reinos desconfiarán de ti.`,
    [["Atacar igualmente",()=>{ breakPacts(me.id,o); go(); }],["Cancelar",null]]);
  else go();
}
function dipAction(a){
  const o=dipFor; if(o<0) return;
  if(a==="nap"||a==="trade"||a==="ally") propose(me.id,o,a);
  else if(a==="attack"||a==="boat") militaryAction(o,a);
  else if(a.startsWith("bomb:")){ const t=a.slice(5), why=launchMissile(me,t,bombTarget(o)); if(why){ log(why,"bad"); sfx("err"); } else { sfx("launch"); log(`${WEAP[t].e} ${WEAP[t].n} lanzado contra ${players[o].name}.`); } }
  else if(a==="plane"){ const why=sendPlane(me.id,o); if(why){ log(why,"bad"); sfx("err"); } else { sfx("march"); log(`{{plane}} Avión comercial enviado a ${players[o].name}.`); } }
  else if(a==="ship"){ const why=sendTrade(me.id,o); if(why){ log(why,"bad"); sfx("err"); } else { sfx("march"); log(`{{cargo}} Cargamento enviado a ${players[o].name}.`); } }
  else if(a==="gift"){ if(sendGift(me.id,o,300*GOLD_X)){ log(`{{gift}} Has regalado ${fmt(300*GOLD_X)} de oro a ${players[o].name}.`,"good"); sfx("good"); } }
  else if(a==="help"){ const at=attacks.find(x=>x.def===me.id), enemy=at?at.att:me.rival;
    if(enemy>=0 && enemy!==o && players[enemy].alive){ players[o].focus=enemy; log(`🆘 ${players[o].name} atacará a ${players[enemy].name}.`,"good"); }
    else log("Ahora mismo nadie te está atacando.","bad"); }
  else if(a==="break") breakPacts(me.id,o);
  else if(a==="go"){ const p=players[o]; centerOn(p.sumX/p.tiles,p.sumY/p.tiles,Math.max(cam.z,3)); }
  renderDip();
}

function updateHud(){
  const st=stats(me);
  document.getElementById("hTroops").textContent=fmt(me.troops)+" / "+fmt(st.max);
  document.getElementById("hMeter").style.width=Math.min(100,me.troops/st.max*100)+"%";
  updateRatioN();
  { const h=Math.round(me.happy); if(document.activeElement!==taxEl){ taxEl.value=me.tax; document.getElementById("taxV").textContent=me.tax+"%"; }
    const col=h>=60?"#7cc96f":h>=40?"#e0b158":"#e8584a", m=document.getElementById("hapM");
    m.style.width=h+"%"; m.style.background=col; document.getElementById("hapV").textContent=h;
    document.getElementById("hapE").textContent=h>=75?"{{f1}}":h>=55?"{{f2}}":h>=40?"{{f3}}":h>=25?"{{f4}}":"{{f5}}"; }
  { const t=matTotals(me); document.getElementById("mats").textContent=RES.map(r=>RES_E[r]+" "+fmt(t[r])).join("   "); }
  document.getElementById("hGrow").textContent="+"+fmt(st.grow)+"/s";
  document.getElementById("hGold").textContent=fmt(me.gold);
  document.getElementById("hInc").textContent="+"+fmt(st.inc)+"/s"+(st.tr?` · {{trade}}${st.tr}`:"")+(st.net.mines+st.net.cities+st.net.ports?` · {{station}}${st.net.mines+st.net.cities+st.net.ports}`:"");
  document.getElementById("hLand").textContent=(me.tiles/landTotal*100).toFixed(2)+"%";
  const alive=players.filter(p=>p.alive).sort((a,b)=>b.tiles-a.tiles);
  document.getElementById("hRank").textContent=me.alive?"#"+(alive.indexOf(me)+1)+" de "+alive.length:"—";
  for(const t in BT){ const c=bCost(me,t); document.getElementById("b_"+t+"_c").textContent=fmt(c); document.getElementById("b_"+t).disabled=me.gold<c||!me.alive; }
  const silo=me.B.silo.some(b=>b.done<=tick);
  for(const t in WEAP){ document.getElementById("w_"+t+"_c").textContent=fmt(WEAP[t].cost); const el=document.getElementById("w_"+t); el.disabled=!silo||me.gold<WEAP[t].cost||!me.alive; el.title=silo?WEAP[t].desc:"Construye un {{silo}} Silo para desbloquear"; }
  { const ok=me.B.port.some(b=>b.done<=tick); document.getElementById("w_ship_c").textContent=fmt(WSHIP_COST); document.getElementById("w_ship").disabled=!ok||me.gold<WSHIP_COST||!me.alive; }
  { const ok=readyAirports(me).length>0; document.getElementById("w_plane_c").textContent=fmt(WPLANE_COST); document.getElementById("w_plane").disabled=!ok||me.gold<WPLANE_COST||!me.alive; }
  const rows=[];
  for(const a of attacks){ if(a.att===me.id) rows.push(`<div><span>{{attack}} ${a.def<0?"Tierra libre":esc(players[a.def].name)}</span><span class="num">${fmt(a.troops)}</span></div>`);
    else if(a.def===me.id) rows.push(`<div class="in"><span>{{shield}} ${esc(players[a.att].name)} te ataca</span><span class="num">${fmt(a.troops)}</span></div>`); }
  for(const b of boats){ if(b.owner===me.id) rows.push(`<div><span>{{boat}} Flota</span><span class="num">${fmt(b.troops)}</span></div>`); else if(owner[b.ti]===me.id) rows.push(`<div class="in"><span>{{boat}} ${esc(players[b.owner].name)}</span><span class="num">${fmt(b.troops)}</span></div>`); }
  for(const m of missiles){ if(owner[m.ti]===me.id && m.owner!==me.id) rows.push(`<div class="in"><span>{{alarm}} ${WEAP[m.type].e} ${esc(players[m.owner].name)}</span><span class="num">${Math.ceil((m.dur-m.t)/10)} s</span></div>`);
    else if(m.owner===me.id) rows.push(`<div><span>${WEAP[m.type].e} En vuelo</span><span class="num">${Math.ceil((m.dur-m.t)/10)} s</span></div>`); }
  document.getElementById("wars").innerHTML=rows.slice(0,8).join("");
  const list=alive.slice(0,10); if(!list.includes(me) && me.alive) list.push(me);
  document.getElementById("aliveN").textContent=alive.length+" vivos";
  document.getElementById("boardList").innerHTML=list.map(p=>`<li class="${p===me?"me":""}" data-id="${p.id}"><span class="sw" style="background:rgb(${p.c})"></span><span class="nm">${alive.indexOf(p)+1}. ${esc(p.name)} ${p===me?"":relLabel(me.id,p.id).join("")}</span><span class="num">${(p.tiles/landTotal*100).toFixed(1)}%</span></li>`).join("");
  if(!dipEl.hidden) renderDip();
}
document.getElementById("boardList").addEventListener("click",e=>{ const li=e.target.closest("li"); if(!li) return; const id=+li.dataset.id; if(id!==me.id) openDip(id); });

function showHelp(){
  const ov=document.getElementById("overlay"), box=document.getElementById("obox"), wasPaused=paused; paused=true;
  box.innerHTML=`<h1 style="font-size:32px">Cómo se juega</h1><div class="help">
  <p><b>Expandirte:</b> toca tierra libre. Envías el % de tropas del deslizador (teclas Q / E).</p>
  <p><b>Atacar:</b> toca un reino vecino. Montañas, bosques y fortalezas lo ponen más difícil. Sin frontera necesitas un {{port}} Puerto.</p>
  <p><b>Construir:</b> elige un edificio abajo (1–7) y toca tu territorio. Mantén Mayús para construir varios. Flechas: mover el mapa.</p>
  <p><b>Bombardear:</b> con un {{silo}} Silo terminado se desbloquean misil, atómica y bomba H (8, 9, 0). Las {{sam}} Antiaéreas las derriban.</p>
  <p><b>Clic derecho</b> (o pulsación larga) sobre un reino: atacar, enviar barco, lanzar misil/bomba, pactos y comercio.</p>
  <p><b>Comercio:</b> con acuerdo comercial y {{port}} puertos en ambos reinos puedes enviar {{cargo}} cargueros que dan oro. Las {{station}} Estaciones (a menos de 40 una de otra) conectan minas, ciudades y puertos cercanos (radio 14): +50% de producción y exportación; se ven como líneas azules.</p>
  <p><b>Diplomacia:</b> botón {{ally}} (D). Los pactos impiden atacaros; romperlos te marca como traidor.</p>
  <p><b>Moverte:</b> arrastra el mapa, rueda o pellizco para zoom, minimapa para saltar. Espacio pausa.</p></div>
  <button class="go" type="button" id="helpOk">Volver al juego</button>`;
  ov.hidden=false; document.getElementById("helpOk").onclick=()=>{ ov.hidden=true; paused=wasPaused; };
}
function endGame(win){
  over=true; setMode(null); closeDip(); closeProp();
  const ov=document.getElementById("overlay"), box=document.getElementById("obox");
  const secs=Math.floor((tick-me.st.born)/10), mm=Math.floor(secs/60), ss=String(secs%60).padStart(2,"0");
  const alive=players.filter(p=>p.alive).length, killer=me.st.killer>=0?players[me.st.killer].name:null;
  box.innerHTML=`<h1 class="${win?"":"lose"}">${win?"{{crown}} Hegemonía":"Tu reino ha caído"}</h1>
    <p class="sub">${win?`Controlas el ${(me.tiles/landTotal*100).toFixed(0)}% del mundo. Ningún reino puede hacerte frente.`:killer?`<b>${esc(killer)}</b> conquistó tus últimas tierras.`:"Tus últimas tierras se perdieron."}</p>
    <div class="stats">
      <div><span>{{time}} Tiempo</span><b>${mm}:${ss}</b></div>
      <div><span>{{medal}} Puesto final</span><b>${win?1:alive+1}º de ${players.length}</b></div>
      <div><span>{{land}} Territorio máximo</span><b>${(me.st.maxTiles/landTotal*100).toFixed(2)}%</b></div>
      <div><span>{{attack}} Reinos eliminados</span><b>${me.st.kills}</b></div>
      <div><span>{{built}} Edificios</span><b>${me.st.built}</b></div>
      <div><span>{{silo}} Bombas lanzadas</span><b>${me.st.bombs}</b></div>
    </div>
    <button class="go" type="button" id="againBtn">Jugar otra vez</button>
    ${win?"":`<button class="btn go2" type="button" id="specBtn">{{eye}} Seguir viendo la partida</button>`}`;
  ov.hidden=false;
  document.getElementById("againBtn").onclick=()=>location.reload();
  const sb=document.getElementById("specBtn"); if(sb) sb.onclick=()=>{ spectating=true; ov.hidden=true; };
}

// ================= Sonido =================
let actx=null, muted=false;
function initAudio(){ if(actx) return; try{ actx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} }
document.getElementById("sndBtn").onclick=()=>{ muted=!muted; document.getElementById("sndBtn").textContent=muted?"{{snd_off}}":"{{snd_on}}"; };
function tone(f,d,type,vol,slide){ const o=actx.createOscillator(), g=actx.createGain(), t=actx.currentTime; o.type=type||"sine"; o.frequency.setValueAtTime(f,t); if(slide) o.frequency.exponentialRampToValueAtTime(slide,t+d);
  g.gain.setValueAtTime(vol||0.08,t); g.gain.exponentialRampToValueAtTime(0.0001,t+d); o.connect(g).connect(actx.destination); o.start(t); o.stop(t+d); }
function noise(d,vol,freq){ const n=actx.sampleRate*d, buf=actx.createBuffer(1,n,actx.sampleRate), da=buf.getChannelData(0); for(let i=0;i<n;i++) da[i]=(Math.random()*2-1)*Math.pow(1-i/n,2);
  const s=actx.createBufferSource(), f=actx.createBiquadFilter(), g=actx.createGain(); f.type="lowpass"; f.frequency.value=freq; g.gain.value=vol; s.buffer=buf; s.connect(f).connect(g).connect(actx.destination); s.start(); }
function sfx(k,vol){ if(!actx||muted) return; vol=vol??1; try{
  if(k==="build"){ tone(520,0.12,"triangle",0.06); setTimeout(()=>tone(780,0.14,"triangle",0.05),70); }
  else if(k==="march") tone(220,0.1,"square",0.03,330);
  else if(k==="err") tone(180,0.15,"sawtooth",0.04,120);
  else if(k==="good"){ tone(660,0.12,"sine",0.06); setTimeout(()=>tone(990,0.18,"sine",0.05),90); }
  else if(k==="alarm"){ for(let i=0;i<3;i++) setTimeout(()=>tone(880,0.12,"square",0.04,660),i*180); }
  else if(k==="alarm2") tone(740,0.15,"sine",0.05,880);
  else if(k==="launch") tone(160,0.6,"sawtooth",0.04,600);
  else if(k==="pop") noise(0.25,0.15*vol,2500);
  else if(k==="boom") noise(0.7,0.35*vol,900);
  else if(k==="nuke"){ noise(2.2,0.55*vol,500); tone(60,1.8,"sine",0.25*vol,30); }
  else if(k==="win"){ [523,659,784,1046].forEach((f,i)=>setTimeout(()=>tone(f,0.4,"triangle",0.07),i*150)); }
  else if(k==="lose"){ [392,330,262].forEach((f,i)=>setTimeout(()=>tone(f,0.5,"triangle",0.07),i*220)); }
}catch(e){} }

// ================= Guardar / cargar =================
function saveToFile(){
  if(!started||!spawned){ log("Aún no hay partida que guardar.","bad"); return; }
  const blob=new Blob([JSON.stringify(saveGame())],{type:"application/json"}), a=document.createElement("a"), d=new Date(), pad=n=>String(n).padStart(2,"0");
  a.href=URL.createObjectURL(blob); a.download=`hegemonia-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  log("{{save}} Partida guardada en un archivo.","good");
}
function loadFromFile(file){
  const rd=new FileReader();
  rd.onload=()=>{
    let data; try{ data=JSON.parse(rd.result); }catch(e){ alert("El archivo no es una partida válida."); return; }
    const why=loadGame(data); if(why){ alert(why); return; }
    setMode(null); closeDip(); closeProp(); flushPixels(true);
    document.getElementById("overlay").hidden=true;
    for(const id of ["top","board","dock","side","send"]) document.getElementById(id).hidden=false;
    document.getElementById("hint").hidden=true; document.getElementById("pname").textContent=me.name;
    if(me.alive&&me.tiles) centerOn(me.sumX/me.tiles,me.sumY/me.tiles,Math.max(cam.z,4));
    updateHud(); log("{{load}} Partida cargada.","good");
  };
  rd.readAsText(file);
}
{ const lf=document.getElementById("loadFile");
  document.getElementById("saveBtn").onclick=saveToFile;
  document.getElementById("loadBtn").onclick=()=>lf.click();
  document.getElementById("loadStartBtn").onclick=()=>lf.click();
  lf.onchange=()=>{ if(lf.files[0]) loadFromFile(lf.files[0]); lf.value=""; }; }
