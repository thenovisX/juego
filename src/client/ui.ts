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
  const eff=b.eff?`<br>Aporta <b>+${fmt(b.eff)}</b> oro/s ahora mismo.`:b.t==="temple"?`<br>Sube la felicidad objetivo de todo tu reino.`:"";
  const head=`${BT[b.t].e} <b>${BT[b.t].n}</b> · nivel ${b.lvl} de ${MAX_LVL}<br><span class="mut">${BT[b.t].desc}</span>${eff}${matInfo(b)?"<br>"+matInfo(b):""}`;
  if(b.done>tick){ showProp(isFinite(b.done)?`${head}<br>Todavía en obras.`:head,[["Cerrar",null]]); return; }
  const extra=b.t==="barracks"?[[`{{recruit}} Reclutar · ${fmt(RECRUIT_COST*b.lvl)}`,()=>{ const why=recruit(me); if(why){ log(why,"bad"); sfx("err"); } else { sfx("good"); log("{{recruit}} Nuevas tropas reclutadas.","good"); } }]]:[];
  if(b.lvl>=MAX_LVL){ showProp(`${head}<br>Está al nivel máximo.`,extra.concat([["Cerrar",null]])); return; }
  const c=upCost(b);
  showProp(`${head}<br>Mejorar a nivel ${b.lvl+1} cuesta <b>${fmt(c)}</b> {{gold}} y ${Object.entries(upMat(b)).map(([r,n])=>r+" "+n).join(", ")}: ${UP_DESC[b.t]}.`,
    [[`{{up}} Mejorar · ${fmt(c)}`,()=>{ const why=upgradeBuilding(me,b); if(why){ log(why,"bad"); sfx("err"); } else { log(`{{up}} ${BT[b.t].n} mejorada a nivel ${b.lvl}.`,"good"); sfx("build"); } }]].concat(extra,[["Cerrar",null]]));
}
function attackAt(i){
  const def=owner[i], troops=Math.floor(me.troops*ratio);
  if(troops<1){ log("No tienes tropas suficientes.","bad"); return; }
  const cands=borderCandidates(me.id,def);
  if(immune(def)){ log(`${players[def].name} acaba de fundarse y es inmune a ataques unos segundos.`,"bad"); sfx("err"); return; }
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
taxEl.oninput=()=>{ if(me) setTax(me,+taxEl.value); document.getElementById("taxV").textContent=taxEl.value+"%"; };
taxEl.addEventListener("pointerup",()=>taxEl.blur()); taxEl.addEventListener("change",()=>taxEl.blur());
const panesEl=document.getElementById("panes"), tabsEl=document.getElementById("dtabs"), infoEl=document.getElementById("dinfo");
let curCat="eco";
const paneOf={};
for(const c in CATS){ const pane=document.createElement("div"); pane.className="grp"; pane.id="pane_"+c; pane.hidden=c!==curCat; panesEl.appendChild(pane); paneOf[c]=pane;
  const tb=document.createElement("button"); tb.type="button"; tb.className="tab"+(c===curCat?" on":""); tb.id="tab_"+c; tb.setAttribute("role","tab"); tb.innerHTML=`${CATS[c].e} ${CATS[c].short||CATS[c].n}`; tb.onclick=()=>setCat(c); tabsEl.appendChild(tb); }
function setCat(c){ curCat=c; for(const k in CATS){ paneOf[k].hidden=k!==c; document.getElementById("tab_"+k).classList.toggle("on",k===c); } showInfo(null); }
let infoFn=null;
function showInfo(fn){ infoFn=fn; refreshInfo(); }
function refreshInfo(){ infoEl.innerHTML=infoFn?infoFn():`<span><b>${CATS[curCat].e} ${CATS[curCat].n}.</b> <span class="mut">${CATS[curCat].tip}</span></span>`; }
function mkCard(parent,id,e,label,key,title,onclick,cls,info){ const b=document.createElement("button"); b.type="button"; b.className="btn card"+(cls?" "+cls:""); b.id=id; b.title=title;
  b.innerHTML=`<kbd>${key}</kbd><span class="em">${e}</span><span class="lb">${label}</span><span class="co" id="${id}_c"></span>`;
  b.onclick=()=>{ onclick(); if(info) showInfo(info); }; if(info){ b.onmouseenter=()=>showInfo(info); b.onfocus=()=>showInfo(info); b.onmouseleave=()=>showInfo(null); }
  parent.appendChild(b); }
const infoBT=t=>()=>{ const d=BT[t]; return `<span><b>${d.e} ${d.n}</b> · <span class="co">${fmt(bCost(me,t))} {{gold}}</span> — ${d.desc} <span class="mut">${d.where}${matText(t,me)}${d.max?"":""}</span></span>`; };
const infoW=t=>()=>{ const d=WEAP[t]; return `<span><b>${d.e} ${d.n}</b> · ${fmt(d.cost)} {{gold}} — ${d.desc} <span class="mut">Necesita un Silo terminado. Elige el objetivo en el mapa (radio ${d.r}).</span></span>`; };
const infoText=(e,n,txt,extra)=>()=>`<span><b>${e} ${n}</b> — ${txt} <span class="mut">${extra||""}</span></span>`;
for(const t in BT) mkCard(paneOf[BT[t].cat],"b_"+t,BT[t].e,BT[t].n,BT[t].key,BT[t].desc+" "+BT[t].where+matText(t,me),()=>{ setCat(BT[t].cat); toggleMode({k:"build",t}); },"",infoBT(t));
// ---- Investigación (pestaña Ciencia)
const infoR=t=>()=>{ const R=RESEARCH[t], r=me.res, why=researchAvail(me,t), rate=rpRate(me);
  const st=r.done[t]?"Investigado.":r.cur===t?`En curso: ${Math.floor(r.prog)} / ${R.cost} puntos`+(rate>0?` · quedan ${fmtTime((R.cost-r.prog)/rate)}`:""):why?why:`Cuesta ${R.cost} puntos`+(rate>0?` · ${fmtTime(R.cost/rate)} con tus universidades`:" · construye una Universidad");
  return `<span><b>${R.e} ${R.n}</b> — ${R.desc} <span class="mut">${st} Tienes ${rate} punto${rate===1?"":"s"}/s (1 por nivel de universidad: con más universidades tardas menos).</span></span>`; };
const fmtTime=s=>s>=60?Math.floor(s/60)+" min "+Math.round(s%60)+" s":Math.round(s)+" s";
for(const t in RESEARCH){ mkCard(paneOf.sci,"r_"+t,RESEARCH[t].e,RESEARCH[t].n,"","Investigar: "+RESEARCH[t].desc,()=>{ const why=startResearch(me,t); if(why){ log(why,"bad"); sfx("err"); } else { sfx("build"); log(`{{science}} Investigando ${RESEARCH[t].n}.`); } },"res",infoR(t)); document.querySelector("#r_"+t+" kbd").remove(); }
const infoG=t=>()=>{ const G=GEAR[t], n=me.gear[t], cap=gearCap(me), why=gearWhy(me,t);
  return `<span><b>${G.e} ${G.n}</b> · <span class="co">${fmt(G.gold)} {{gold}}</span> — ${G.desc} <span class="mut">Materiales: ${Object.entries(G.mat).map(([r,q])=>RES_E[r]+" "+q).join(" ")}. Tienes ${n} / ${cap}. ${why&&n<cap?why:""}</span></span>`; };
for(const t in GEAR){ mkCard(paneOf.arm,"g_"+t,GEAR[t].e,GEAR[t].n,"","Fabricar: "+GEAR[t].desc,()=>{ const why=buyGear(me,t); if(why){ log(why,"bad"); sfx("err"); } else { sfx("build"); log(`${GEAR[t].e} ${GEAR[t].n} fabricado.`,"good"); } },"weap",infoG(t)); document.querySelector("#g_"+t+" kbd").remove(); }
for(const t in WEAP) mkCard(paneOf.arm,"w_"+t,WEAP[t].e,WEAP[t].n,WEAP[t].key,WEAP[t].desc,()=>toggleMode({k:"weap",t}),"weap",infoW(t));
mkCard(paneOf.arm,"w_ship","{{wship}}","Buque","B","Buque de guerra: patrulla desde tu puerto, intercepta cargueros enemigos y se queda su oro",()=>{ const why=buyWarship(me); if(why){ log(why,"bad"); sfx("err"); } else { sfx("build"); selShip=wships.filter(w=>w.owner===me.id).pop(); setMode({k:"patrol"}); log("{{wship}} Buque de guerra botado. Toca el punto del mar donde quieres que patrulle: se quedará por esa zona y cañoneará a los cargueros enemigos que entren."); } },"weap",
  infoText("{{wship}}","Buque de guerra","patrulla una zona del mar y se queda con la carga de los cargueros ajenos (salvo socios y aliados).","Necesita un Puerto terminado."));
mkCard(paneOf.arm,"w_patrol","{{wship}}","Zona de patrulla","Z","Elige un buque de guerra (tócalo) y luego el punto del mar donde debe quedarse patrullando",()=>toggleMode({k:"patrol"}),"weap",
  infoText("{{wship}}","Zona de patrulla","toca un buque tuyo y luego el punto del mar donde debe quedarse vigilando."));
mkCard(paneOf.arm,"w_plane","{{wplane}}","Avión de guerra","V","Avión de guerra: patrulla desde tu aeropuerto y derriba aviones comerciales enemigos",()=>{ const why=buyWarplane(me); if(why){ log(why,"bad"); sfx("err"); } else { sfx("build"); log("{{wplane}} Avión de guerra listo para patrullar."); } },"weap",
  infoText("{{wplane}}","Avión de guerra","patrulla desde tu aeropuerto y derriba los aviones comerciales de reinos sin pacto contigo.","Necesita un Aeropuerto terminado."));
refreshInfo();
// ---- Órdenes de tropas
const infoRecruit=()=>{ const ri=recruitInfo(me), lv=ri.free?ri.free.lvl||1:ri.best?ri.best.lvl||1:1; return `<span><b>{{recruit}} Reclutar</b> · <span class="co">${fmt(RECRUIT_COST*lv)} {{gold}}</span> y <b>${RECRUIT_FOOD*lv} comida + ${RECRUIT_IRON*lv} hierro</b> — consigues <b>${fmt(RECRUIT_TROOPS*lv)}</b> tropas al instante. <span class="mut">Necesita un Cuartel terminado; cada cuartel descansa 25 s. Un cuartel de más nivel recluta más.</span></span>`; };
mkCard(paneOf.tro,"t_recruit","{{recruit}}","Reclutar","u","Gasta oro y consigue tropas al instante (necesita Cuartel)",()=>{ const why=recruit(me); if(why){ log(why,"bad"); sfx("err"); } else { sfx("good"); log("{{recruit}} Nuevas tropas reclutadas.","good"); } },"tro",infoRecruit);
mkCard(paneOf.tro,"t_recall","{{retreat}}","Retirar","n","Retira las tropas de todos los frentes abiertos a tu reserva",()=>recallAll(),"tro",
  infoText("{{retreat}}","Retirar todo","las tropas que aún no han combatido en tus frentes vuelven a la reserva.","Para retirar un solo frente usa ↩ en el panel de frentes (arriba a la izquierda)."));
mkCard(paneOf.tro,"t_reinf","{{reinforce}}","Reforzar","y","Manda un 25% más de tu reserva a todos los frentes abiertos",()=>reinforceAll(),"tro",
  infoText("{{reinforce}}","Reforzar frentes","envía un 25% de tu reserva a cada frente abierto para romper una defensa dura.","También puedes mandar refuerzos a un aliado desde Diplomacia."));
// ---- Posturas (junto al deslizador de tropas)
const stEl=document.getElementById("stances");
for(const s in STANCE){ const b=document.createElement("button"); b.type="button"; b.className="btn"; b.id="st_"+s; b.title=STANCE[s].desc+" ("+STANCE[s].key.toUpperCase()+")"; b.innerHTML=`${STANCE[s].e} ${STANCE[s].n}`; b.onclick=()=>pickStance(s); stEl.appendChild(b); }
function pickStance(s){ if(!me) return; setStance(me,s); sfx("march"); updateStance(); }
function updateStance(){ if(!me) return; const cur=me.stance||"bal"; for(const s in STANCE) document.getElementById("st_"+s).classList.toggle("on",s===cur); document.getElementById("stanceInfo").textContent=STANCE[cur].desc; }
function recallAll(){ let n=0; for(const a of attacks.slice()) if(a.att===me.id) n+=recallAttack(me,a.def); if(n>0){ sfx("good"); log(`{{retreat}} ${fmt(n)} tropas vuelven a la reserva.`,"good"); } else { log("No tienes frentes abiertos.","bad"); sfx("err"); } }
function reinforceAll(){ let n=0, c=0; for(const a of attacks.slice()) if(a.att===me.id){ n+=reinforceAttack(me,a.def,0.25); c++; } if(n>0){ sfx("march"); log(`{{reinforce}} ${fmt(n)} tropas de refuerzo enviadas a ${c} frente${c>1?"s":""}.`); } else { log(c?"No te quedan tropas en reserva.":"No tienes frentes abiertos.","bad"); sfx("err"); } }
document.getElementById("dipBtn").onclick=()=>toggleMode({k:"dip"});
const sameMode=(a,b)=>!!a&&!!b&&a.k===b.k&&a.t===b.t;
function toggleMode(m){ setMode(sameMode(mode,m)?null:m); }
function setMode(m){ mode=m; if(m&&m.k==="build"&&BT[m.t].cat!==curCat) setCat(BT[m.t].cat); else if(m&&m.k==="weap"&&curCat!=="arm") setCat("arm");
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
  for(const t in STANCE) if(e.key===STANCE[t].key) pickStance(t);
  if(e.key==="u") document.getElementById("t_recruit").click();
  if(e.key==="n") recallAll();
  if(e.key==="y") reinforceAll();
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
  if(p.traitorUntil>tick) chips.push(`<span class="chip r">{{traitor}} Traidor${p.betrayals>1?" x"+p.betrayals:""}</span>`);
  const pct=Math.round(ratio*100), siloOk=me.B.silo.some(b=>b.done<=tick), mil=[], trd=[];
  mil.push(`<button class="btn" type="button" data-a="attack">{{attack}} Atacar <small>${pct}% · ${fmt(me.troops*ratio)}</small></button>`);
  mil.push(`<button class="btn" type="button" data-a="boat" ${me.B.port.some(b=>b.done<=tick)?"":"disabled"}>{{boat}} Enviar barco <small>${pct}% · desembarco</small></button>`);
  for(const t in WEAP){ const w=WEAP[t], off=!siloOk||me.gold<w.cost||!!researchWhy(me,t);
    mil.push(`<button class="btn" type="button" data-a="bomb:${t}" ${off?"disabled":""} title="${siloOk?w.desc:"Necesitas un silo terminado"}">${w.e} ${w.n} <small>${fmt(w.cost)} {{gold}}</small></button>`); }
  if(r.trade){ const why=tradeCheck(me.id,dipFor);
    trd.push(`<button class="btn" type="button" data-a="ship" ${why?"disabled":""} title="${why||"Exporta materiales por mar"}">{{cargo}} Enviar cargamento <small>+${fmt(tradeValue(me))} {{gold}}</small></button>`); }
  if(r.trade){ const why=airCheck(me.id,dipFor);
    trd.push(`<button class="btn" type="button" data-a="plane" ${why?"disabled":""} title="${why||"Envía un avión comercial a un aeropuerto del reino"}">{{plane}} Enviar avión comercial <small>+${fmt(airValue(me))} {{gold}}</small></button>`); }
  const acts=[];
  if(!r.ally && r.nap<=tick) acts.push(`<button class="btn" type="button" data-a="nap">{{nap}} Pacto de no agresión <small>5 min</small></button>`);
  if(!r.trade) acts.push(`<button class="btn" type="button" data-a="trade">{{trade}} Acuerdo comercial <small>+12% oro</small></button>`);
  if(!r.ally||r.allyEnd-tick<600) acts.push(`<button class="btn" type="button" data-a="ally">{{ally}} ${r.ally?"Renovar alianza":"Proponer alianza"} <small>10 min</small></button>`);
  acts.push(`<button class="btn" type="button" data-a="gift" ${me.gold<300*GOLD_X?"disabled":""}>{{gift}} Regalar ${fmt(300*GOLD_X)} de oro <small>mejora la relación</small></button>`);
  if(r.ally) acts.push(`<button class="btn" type="button" data-a="reinf" title="Cedes un 20% de tu reserva a tu aliado">{{reinforce}} Enviar refuerzos <small>20% · ${fmt(me.troops*0.2)}</small></button>`);
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
  else if(a==="reinf"){ const r=sendReinforcements(me.id,o,0.2); if(typeof r==="string"){ log(r,"bad"); sfx("err"); } else { sfx("march"); log(`{{reinforce}} ${fmt(r)} tropas enviadas como refuerzo a ${players[o].name}.`,"good"); } }
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
  document.getElementById("hGrow").textContent="+"+fmt(st.grow)+"/s · {{comida}}"+(st.food.make>=st.food.use?"+":"")+(st.food.make-st.food.use).toFixed(1)+"/s"+(me.hunger?" ¡HAMBRE!":"");
  document.getElementById("hGold").textContent=fmt(me.gold);
  document.getElementById("hInc").textContent="+"+fmt(st.inc)+"/s"+(st.tr?` · {{trade}}${st.tr}`:"")+(st.net.mines+st.net.cities+st.net.ports?` · {{station}}${st.net.mines+st.net.cities+st.net.ports}`:"");
  document.getElementById("hLand").textContent=(me.tiles/landTotal*100).toFixed(2)+"%";
  const alive=players.filter(p=>p.alive).sort((a,b)=>b.tiles-a.tiles);
  document.getElementById("hRank").textContent=me.alive?"#"+(alive.indexOf(me)+1)+" de "+alive.length:"—";
  for(const t in BT){ const c=bCost(me,t), lock=!!researchWhy(me,t); document.getElementById("b_"+t+"_c").textContent=lock?"🔒 investigar":fmt(c); document.getElementById("b_"+t).disabled=lock||me.gold<c||!me.alive; }
  { const rate=rpRate(me); for(const t in RESEARCH){ const R=RESEARCH[t], el=document.getElementById("r_"+t), c=document.getElementById("r_"+t+"_c");
      c.textContent=me.res.done[t]?"✔ listo":me.res.cur===t?Math.floor(me.res.prog/R.cost*100)+"%":researchAvail(me,t)?"🔒":R.cost+" pts";
      el.disabled=!me.alive||!!researchAvail(me,t)||rate<=0; el.classList.toggle("on",me.res.cur===t); } }
  for(const t in GEAR){ const why=gearWhy(me,t), el=document.getElementById("g_"+t); document.getElementById("g_"+t+"_c").textContent=researchWhy(me,t==="tank"?"arsenal":GEAR[t].req)?"🔒 investigar":me.gear[t]+"/"+gearCap(me); el.disabled=!!why||!me.alive; el.title=why||GEAR[t].desc; }
  const silo=me.B.silo.some(b=>b.done<=tick);
  for(const t in WEAP){ const lock=!!researchWhy(me,t); document.getElementById("w_"+t+"_c").textContent=lock?"🔒 investigar":fmt(WEAP[t].cost); const el=document.getElementById("w_"+t); el.disabled=lock||!silo||me.gold<WEAP[t].cost||!me.alive; el.title=lock?researchWhy(me,t):silo?WEAP[t].desc:"Construye un {{silo}} Silo para desbloquear"; }
  { const ok=me.B.port.some(b=>b.done<=tick); document.getElementById("w_ship_c").textContent=fmt(WSHIP_COST); document.getElementById("w_ship").disabled=!ok||me.gold<WSHIP_COST||!me.alive; }
  { const ok=readyAirports(me).length>0; document.getElementById("w_plane_c").textContent=fmt(WPLANE_COST); document.getElementById("w_plane").disabled=!ok||me.gold<WPLANE_COST||!me.alive; }
  { const ri=recruitInfo(me), lv=ri.free?ri.free.lvl||1:ri.best?ri.best.lvl||1:1, mine=attacks.some(a=>a.att===me.id);
    document.getElementById("t_recruit_c").textContent=ri.ready?(ri.free?fmt(RECRUIT_COST*lv):"descansa"):"sin cuartel";
    document.getElementById("t_recruit").disabled=!ri.free||me.gold<RECRUIT_COST*lv||!me.alive;
    document.getElementById("t_recall_c").textContent=mine?"frentes":"—"; document.getElementById("t_recall").disabled=!mine||!me.alive;
    document.getElementById("t_reinf_c").textContent=mine?"+25%":"—"; document.getElementById("t_reinf").disabled=!mine||!me.alive; }
  updateStance(); if(infoFn) refreshInfo();
  const rows=[];
  for(const a of attacks){ if(a.att===me.id) rows.push(`<div class="fr"><span>{{attack}} ${a.def<0?"Tierra libre":esc(players[a.def].name)}</span><span class="num">${fmt(a.troops)}</span><button type="button" data-recall="${a.def}" title="Retirar estas tropas a la reserva">↩</button><button type="button" data-reinf="${a.def}" title="Mandar un 25% más de tu reserva">➕</button></div>`);
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
document.getElementById("wars").addEventListener("pointerdown",e=>{ const b=e.target.closest("button"); if(!b||!me) return; e.preventDefault();
  if(b.dataset.recall!==undefined){ const n=recallAttack(me,+b.dataset.recall); if(n>0){ sfx("good"); log(`{{retreat}} ${fmt(n)} tropas vuelven a la reserva.`,"good"); } }
  else if(b.dataset.reinf!==undefined){ const n=reinforceAttack(me,+b.dataset.reinf,0.25); if(n>0){ sfx("march"); log(`{{reinforce}} ${fmt(n)} tropas de refuerzo enviadas al frente.`); } else { log("No te quedan tropas en reserva.","bad"); sfx("err"); } }
  updateHud(); });
document.getElementById("boardList").addEventListener("click",e=>{ const li=e.target.closest("li"); if(!li) return; const id=+li.dataset.id; if(id!==me.id) openDip(id); });

function showHelp(){
  const ov=document.getElementById("overlay"), box=document.getElementById("obox"), wasPaused=paused; paused=true;
  box.innerHTML=`<h1 style="font-size:32px">Cómo se juega</h1><div class="help">
  <p><b>Expandirte:</b> toca tierra libre. Envías el % de tropas del deslizador (Q / E). Las tropas son tu <b>población</b>: crece sola hasta un máximo que suben las ciudades y los cuarteles.</p>
  <p><b>Atacar:</b> toca un reino vecino. Montañas, bosques y fortalezas lo ponen más difícil. Sin frontera necesitas un {{port}} Puerto.</p>
  <p><b>Posturas</b> (J / K / L): {{stance_agg}} ofensiva avanza más rápido pero pierde más tropas y te deja más expuesto; {{stance_def}} defensiva avanza más lento pero eres más difícil de conquistar.</p>
  <p><b>Conquistas:</b> tomar el territorio de otro reino cuesta más del doble y avanza más despacio que ocupar tierra libre. Construye un {{arsenal}} <b>Arsenal</b> (tras investigar Industria militar) y fabrica {{tank}} <b>tanques</b> (gastan hierro y comida) y {{cannon}} <b>artillería</b>: los tanques abaratan tus ataques y protegen tus casillas, la artillería rompe fortalezas y murallas.</p>
  <p><b>Frentes:</b> en el panel de arriba a la izquierda cada ataque tiene ↩ para retirar sus tropas y ➕ para reforzarlo. En la pestaña <b>Órdenes</b> puedes hacerlo con todos a la vez y {{recruit}} <b>reclutar</b> tropas por oro (necesita {{barracks}} Cuartel).</p>
  <p><b>Construir:</b> la barra de abajo tiene pestañas. Pasa el ratón (o toca) cada edificio para leer para qué sirve, cuánto cuesta y dónde se puede poner. Mantén Mayús para construir varios. Clic en un edificio tuyo para mejorarlo.</p>
  <p><b>{{gold}} Ganar oro:</b> la base son los <b>impuestos</b> (deslizador). Encima: {{sawmill}} aserraderos, {{farm}} granjas y {{foundry}} metalúrgicas; {{market}} <b>mercados</b> junto a ciudades; {{mint}} <b>casas de la moneda</b> junto a minas; {{tradehouse}} <b>casas de comercio</b> por cada socio comercial. El oro NO depende de cuánta población tengas.</p>
  <p><b>Felicidad:</b> más impuestos = pueblo descontento. Los {{temple}} templos la suben para que puedas cobrar más sin revueltas.</p>
  <p><b>{{science}} Ciencia:</b> construye {{university}} <b>Universidades</b> (pestaña Ciencia): cada una da 1 punto de investigación por segundo. Con ellos investigas, de una en una, lo que desbloquea Casas de la moneda, Casas de comercio, Antiaéreas, Aeropuertos, Silos y las bombas atómica y H. Cuantas más universidades tengas, antes lo desbloqueas.</p>
  <p><b>Bombardear:</b> con un {{silo}} Silo terminado se desbloquean misil, atómica y bomba H (8, 9, 0). Las {{sam}} Antiaéreas las derriban.</p>
  <p><b>Clic derecho</b> (o pulsación larga) sobre un reino: atacar, enviar barco, lanzar misil/bomba, pactos, comercio y refuerzos a aliados.</p>
  <p><b>Comercio:</b> con acuerdo comercial y {{port}} puertos puedes enviar {{cargo}} cargueros que dan oro. Las {{station}} Estaciones (a menos de 40 una de otra) conectan minas, ciudades y puertos cercanos (radio 14): +50% de producción y exportación.</p>
  <p><b>Moverte:</b> arrastra el mapa, rueda o pellizco para zoom, minimapa para saltar. Espacio pausa.</p></div>
  <button class="go" type="button" id="helpOk">Volver al juego</button>`;
  ov.hidden=false; document.getElementById("helpOk").onclick=()=>{ ov.hidden=true; paused=wasPaused; };
}
function endGame(win){
  over=true; setMode(null); closeDip(); closeProp();
  const ov=document.getElementById("overlay"), box=document.getElementById("obox");
  const secs=Math.floor((tick-me.st.born)/10), mm=Math.floor(secs/60), ss=String(secs%60).padStart(2,"0");
  const alive=players.filter(p=>p.alive).length, killer=me.st.killer>=0?players[me.st.killer].name:null;
  box.innerHTML=`<h1 class="${win?"":"lose"}">${win?"{{crown}} Hegemonía":netWinner>=0?"Partida terminada":"Tu reino ha caído"}</h1>
    <p class="sub">${win?`Controlas el ${(me.tiles/landTotal*100).toFixed(0)}% del mundo. Ningún reino puede hacerte frente.`:netWinner>=0?`<b>${esc(players[netWinner].name)}</b> controla el ${(players[netWinner].tiles/landTotal*100).toFixed(0)}% del mundo y gana la partida.`:killer?`<b>${esc(killer)}</b> conquistó tus últimas tierras.`:"Tus últimas tierras se perdieron."}</p>
    <div class="stats">
      <div><span>{{time}} Tiempo</span><b>${mm}:${ss}</b></div>
      <div><span>{{medal}} Puesto final</span><b>${win?1:alive+1}º de ${players.length}</b></div>
      <div><span>{{land}} Territorio máximo</span><b>${(me.st.maxTiles/landTotal*100).toFixed(2)}%</b></div>
      <div><span>{{attack}} Reinos eliminados</span><b>${me.st.kills}</b></div>
      <div><span>{{built}} Edificios</span><b>${me.st.built}</b></div>
      <div><span>{{silo}} Bombas lanzadas</span><b>${me.st.bombs}</b></div>
    </div>
    <button class="go" type="button" id="againBtn">Jugar otra vez</button>
    ${win||netWinner>=0?"":`<button class="btn go2" type="button" id="specBtn">{{eye}} Seguir viendo la partida</button>`}`;
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
