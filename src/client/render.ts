// @ts-nocheck  (cliente: DOM sin tipar de momento; la simulación sí se comprueba)
// ================= Dibujo =================
const dangerEl=document.getElementById("danger");
const EMOJI_FONT='"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
function draw(now){
  if(cam.z!==cam.tz){ const f=Math.abs(cam.tz-cam.z)>cam.z*0.003 ? Math.pow(cam.tz/cam.z,0.25) : cam.tz/cam.z; applyZoom(cam.ax,cam.ay,f); }
  ctx.setTransform(dpr,0,0,dpr,0,0);
  if(shake>0.3){ ctx.translate((Math.random()-0.5)*shake,(Math.random()-0.5)*shake); shake*=0.9; } else shake=0;
  ctx.fillStyle="#0b141d"; ctx.fillRect(-20,-20,vw+40,vh+40);
  ctx.imageSmoothingEnabled = cam.z<1.5;
  const z=cam.z;
  for(const ox of [-W,0,W]){ const sx=(ox-cam.x)*z; if(sx>vw || sx+W*z<0) continue; ctx.drawImage(off,sx,-cam.y*z,W*z,H*z); }
  const toS=(x,y)=>{ let sx=(x-cam.x); if(sx<-W/2) sx+=W; if(sx>W/2+vw/z) sx-=W; return [sx*z,(y-cam.y)*z]; };
  ctx.textAlign="center"; ctx.textBaseline="middle";
  // frente atacado: mis casillas fronterizas que un enemigo está asaltando se ponen en rojo parpadeante
  { let hot=0; ctx.fillStyle=`rgba(255,40,40,${(0.4+0.2*Math.sin(now/180)).toFixed(2)})`;
    for(const a of attacks){ if(a.def!==me.id||a.att===me.id) continue;
      for(const t of a.q){ if(hot>6000) break; if(owner[t]!==me.id) continue; const [sx,sy]=toS(t%W,(t/W)|0); if(sx<-z||sy<-z||sx>vw||sy>vh) continue; ctx.fillRect(sx,sy,z+0.5,z+0.5); hot++; } } }
  // red de estaciones (solo la mía): se dibuja ANTES que los edificios para que las vías nunca los tapen
  if(me && me.net && (me.net.links.length||me.net.rails.length)){
    const segs=me.net.links.concat(me.net.rails).filter(([a,b])=>!a.dead&&!b.dead&&Math.abs(a.x-b.x)<=W/2), lw=Math.max(2.5,Math.min(7,z*0.8));
    // vías: tramos rectos con giros de 90° sobre la cuadrícula (primero horizontal, luego vertical), traviesas y dos raíles
    const sg=Math.sign, ro=Math.max(1.2,lw*0.55), tl=ro+Math.max(1,lw*0.45), gap=Math.max(5,lw*2.2);
    const routes=segs.map(([a,b])=>{ const A=toS(a.x+0.5,a.y+0.5), B=toS(b.x+0.5,b.y+0.5); return [A,[B[0],A[1]],B]; });
    const ballast=()=>{ ctx.beginPath(); for(const [A,C,B] of routes){ ctx.moveTo(A[0],A[1]); ctx.lineTo(C[0],C[1]); ctx.lineTo(B[0],B[1]); } };
    ctx.lineCap="butt"; ctx.lineJoin="miter"; ctx.strokeStyle="rgba(40,32,24,.55)"; ctx.lineWidth=tl*2+2; ballast(); ctx.stroke();
    ctx.strokeStyle="rgba(112,76,44,.95)"; ctx.lineWidth=Math.max(1.5,lw*0.5); ctx.beginPath();
    for(const [A,C,B] of routes) for(const [P,Q,h] of [[A,C,true],[C,B,false]]){ const len=Math.abs(Q[0]-P[0])+Math.abs(Q[1]-P[1]); if(len<1) continue; const dx=sg(Q[0]-P[0]), dy=sg(Q[1]-P[1]);
      for(let d=gap/2;d<len;d+=gap){ const x=P[0]+dx*d, y=P[1]+dy*d; if(h){ ctx.moveTo(x,y-tl); ctx.lineTo(x,y+tl); } else { ctx.moveTo(x-tl,y); ctx.lineTo(x+tl,y); } } }
    ctx.stroke();
    ctx.strokeStyle="rgba(205,210,216,.95)"; ctx.lineWidth=Math.max(1,lw*0.28);
    for(const sd of [-1,1]){ ctx.beginPath();
      for(const [A,C,B] of routes){ const h1=Math.abs(C[0]-A[0])>=1, v2=Math.abs(B[1]-C[1])>=1;
        if(h1&&v2){ const d1=sg(C[0]-A[0]), d2=sg(B[1]-C[1]); 
          ctx.moveTo(A[0],A[1]+sd*ro); const cx=C[0]-d1*sd*d2*ro; ctx.lineTo(cx,A[1]+sd*ro); ctx.lineTo(cx,B[1]); }
        else if(h1){ ctx.moveTo(A[0],A[1]+sd*ro); ctx.lineTo(B[0],A[1]+sd*ro); }
        else if(v2){ ctx.moveTo(A[0]+sd*ro,C[1]); ctx.lineTo(A[0]+sd*ro,B[1]); } }
      ctx.stroke(); } }
  // edificios
  const sz=Math.max(10,Math.min(28,z*3));
  ctx.font=`${sz*0.74}px ${EMOJI_FONT}`;
  for(const b of buildings){ if(b.dead || z<0.6 || (z<1.6 && b.owner!==me.id)) continue;
    const [sx,sy]=toS(b.x+0.5,b.y+0.5); if(sx<-30||sy<-30||sx>vw+30||sy>vh+30) continue;
    const c=players[b.owner].c, building=b.done>tick;
    ctx.globalAlpha=building?0.6:1;
    ctx.fillStyle=`rgba(${c[0]*0.45|0},${c[1]*0.45|0},${c[2]*0.45|0},0.92)`; ctx.strokeStyle=`rgb(${c})`; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(sx,sy,sz*0.62,0,Math.PI*2); ctx.fill(); ctx.stroke();
    drawIcon(ctx,BT[b.t].e,sx,sy+1);
    ctx.globalAlpha=1;
    if(building && !isFinite(b.done)){ drawIcon(ctx,"{{obra}}",sx+sz*0.55,sy-sz*0.55);
      if(b.owner===me.id && z>=1.2 && b.need){ const t=Object.entries(b.need).filter(([,n])=>n>0).map(([r,n])=>r+" "+Math.ceil(n)).join(" · ")+(b.netId>=0?"":" · SIN ESTACIÓN");
        ctx.font="600 10px 'IBM Plex Mono',monospace"; ctx.fillStyle=b.netId>=0?"#f5d38c":"#ff8a7a"; ctx.strokeStyle="#0b141d"; ctx.lineWidth=3; ctx.strokeText(t,sx,sy+sz*0.9); ctx.fillText(t,sx,sy+sz*0.9); ctx.font=`${sz*0.74}px ${EMOJI_FONT}`; } }
    if(building && isFinite(b.done)){ ctx.strokeStyle="#f5d38c"; ctx.lineWidth=2.5; ctx.beginPath(); ctx.arc(sx,sy,sz*0.8,-Math.PI/2,-Math.PI/2+2*Math.PI*(1-(b.done-tick)/BUILD_TIME)); ctx.stroke(); }
    if(b.t==="sam" && b.cd>tick){ ctx.strokeStyle="rgba(255,120,100,.85)"; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(sx,sy,sz*0.8,-Math.PI/2,-Math.PI/2+2*Math.PI*(1-(b.cd-tick)/SAM_CD)); ctx.stroke(); }
    if(b.owner===me.id && !building && z>2.5 && (b.t==="fort"||b.t==="sam")){ const R=b.t==="fort"?FORT_R:SAM_R; ctx.globalAlpha=0.3; ctx.strokeStyle=b.t==="fort"?"#f3ead6":"#7cc0ff"; ctx.lineWidth=1.5; ctx.setLineDash([5,5]); ctx.beginPath(); ctx.arc(sx,sy,R*z,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha=1; }
  }
  if(mode && lastMouse){
    if(mode.k==="weap"){ ctx.strokeStyle="rgba(255,110,80,.9)"; ctx.fillStyle="rgba(255,110,80,.12)"; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(lastMouse[0],lastMouse[1],WEAP[mode.t].r*z,0,Math.PI*2); ctx.fill(); ctx.stroke(); }
    else if(mode.k==="build" && mode.t==="sam"){ ctx.lineWidth=2; ctx.setLineDash([6,6]); ctx.strokeStyle="rgba(124,192,255,.95)"; ctx.fillStyle="rgba(124,192,255,.10)"; ctx.beginPath(); ctx.arc(lastMouse[0],lastMouse[1],SAM_R*z,0,Math.PI*2); ctx.fill(); ctx.stroke(); ctx.setLineDash([]); }
    else if(mode.k==="build" && BT[mode.t].r && mode.t!=="station"){ ctx.lineWidth=1.5; ctx.setLineDash([5,5]); ctx.strokeStyle="rgba(245,211,140,.9)"; ctx.fillStyle="rgba(245,211,140,.08)"; ctx.beginPath(); ctx.arc(lastMouse[0],lastMouse[1],BT[mode.t].r*z,0,Math.PI*2); ctx.fill(); ctx.stroke(); ctx.setLineDash([]); }
    else if(mode.k==="build" && mode.t==="station"){ ctx.lineWidth=1.5; ctx.setLineDash([5,5]); ctx.strokeStyle="rgba(124,192,255,.9)"; ctx.beginPath(); ctx.arc(lastMouse[0],lastMouse[1],ST_COV*z,0,Math.PI*2); ctx.stroke(); ctx.strokeStyle="rgba(245,211,140,.6)"; ctx.beginPath(); ctx.arc(lastMouse[0],lastMouse[1],ST_LINK*z,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]); }
  }
  // estelas de los barcos hasta llegar a destino
  const wake=(trail,col)=>{ const n=trail.length; if(n<2) return; ctx.lineCap="round"; ctx.lineJoin="round";
    for(const [from,to,al,w] of [[0,n,0.22,2.5],[Math.max(0,n-40),n,0.5,1.6]]){ ctx.strokeStyle=`rgba(${col},${al})`; ctx.lineWidth=w; ctx.beginPath(); let pen=false, px=0;
      for(let k=from;k<to;k++){ const [sx,sy]=toS(trail[k][0],trail[k][1]); if(pen && Math.abs(sx-px)>vw) pen=false; if(pen) ctx.lineTo(sx,sy); else ctx.moveTo(sx,sy); pen=true; px=sx; } ctx.stroke(); } ctx.lineCap="butt"; };
  for(const s of tships) wake(s.trail,"235,245,255"); for(const b of boats) wake(b.trail,"235,245,255");
  for(const s of tships){ const [sx,sy]=toS(s.x,s.y); if(sx<-40||sx>vw+40||sy<-40||sy>vh+40) continue;
    ctx.font=`${Math.max(14,Math.min(24,z*3))}px ${EMOJI_FONT}`; drawIcon(ctx,"{{cargo}}",sx,sy);
    ctx.font="600 11px 'IBM Plex Mono',monospace"; ctx.fillStyle="#f5d38c"; ctx.strokeStyle="#0b141d"; ctx.lineWidth=3; ctx.strokeText("+"+fmt(s.val),sx,sy-15); ctx.fillText("+"+fmt(s.val),sx,sy-15); }
  for(const w of wships){ if(w.owner===me.id){ const [zx,zy]=toS(w.zx,w.zy); ctx.strokeStyle=`rgba(${players[w.owner].c},${w===selShip?0.9:0.4})`; ctx.lineWidth=w===selShip?2:1.2; ctx.setLineDash([7,6]); ctx.beginPath(); ctx.arc(zx,zy,WSHIP_ZONE*z,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]); }
    const [sx,sy]=toS(w.x,w.y); if(sx<-40||sx>vw+40||sy<-40||sy>vh+40) continue; wake(w.trail,"235,245,255");
    ctx.strokeStyle=`rgb(${players[w.owner].c})`; ctx.lineWidth=2.5; ctx.beginPath(); ctx.arc(sx,sy,Math.max(10,Math.min(18,z*2.4)),0,Math.PI*2); ctx.stroke();
    ctx.font=`${Math.max(16,Math.min(26,z*3.2))}px ${EMOJI_FONT}`; drawIcon(ctx,"{{wship}}",sx,sy); }
  for(const b of shots){ const k=b.t/b.dur, [x0,y0]=toS(b.x,b.y), [x1,y1]=toS(b.tx,b.ty), px=x0+(x1-x0)*k, py=y0+(y1-y0)*k;
    ctx.strokeStyle="rgba(255,220,150,.7)"; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(px-(x1-x0)*0.12,py-(y1-y0)*0.12); ctx.lineTo(px,py); ctx.stroke();
    ctx.fillStyle="#ffd27a"; ctx.beginPath(); ctx.arc(px,py,Math.max(2,z*0.5),0,Math.PI*2); ctx.fill();
    if(k>0.8){ ctx.fillStyle="rgba(255,140,60,.8)"; ctx.beginPath(); ctx.arc(x1,y1,Math.max(4,z*1.2),0,Math.PI*2); ctx.fill(); } }
  for(const s of planes){ wake(s.trail,"235,245,255"); const [sx,sy]=toS(s.x,s.y); if(sx<-40||sx>vw+40||sy<-40||sy>vh+40) continue;
    ctx.font=`${Math.max(14,Math.min(24,z*3))}px ${EMOJI_FONT}`; drawIcon(ctx,"{{plane}}",sx,sy);
    ctx.font="600 11px 'IBM Plex Mono',monospace"; ctx.fillStyle="#f5d38c"; ctx.strokeStyle="#0b141d"; ctx.lineWidth=3; ctx.strokeText("+"+fmt(s.val),sx,sy-15); ctx.fillText("+"+fmt(s.val),sx,sy-15); }
  for(const w of wplanes){ wake(w.trail,"235,245,255"); const [sx,sy]=toS(w.x,w.y); if(sx<-40||sx>vw+40||sy<-40||sy>vh+40) continue;
    ctx.strokeStyle=`rgb(${players[w.owner].c})`; ctx.lineWidth=2.5; ctx.beginPath(); ctx.arc(sx,sy,Math.max(10,Math.min(18,z*2.4)),0,Math.PI*2); ctx.stroke();
    ctx.font=`${Math.max(14,Math.min(24,z*3))}px ${EMOJI_FONT}`; drawIcon(ctx,"{{wplane}}",sx,sy); }
  // barcos
  for(const b of boats){ const [sx,sy]=toS(b.x,b.y); if(sx<-40||sx>vw+40||sy<-40||sy>vh+40) continue;
    ctx.font=`${Math.max(14,Math.min(24,z*3))}px ${EMOJI_FONT}`; drawIcon(ctx,"{{boat}}",sx,sy);
    ctx.font="600 11px 'IBM Plex Mono',monospace"; ctx.fillStyle=`rgb(${players[b.owner].c})`; ctx.strokeStyle="#0b141d"; ctx.lineWidth=3; ctx.strokeText(fmt(b.troops),sx,sy-15); ctx.fillText(fmt(b.troops),sx,sy-15); }
  // misiles
  for(const m of missiles){ const k=m.t/m.dur, h=Math.min(140,Math.hypot(m.dx,m.dy)*z*0.25);
    const pt=t=>{ const [x,y]=toS(m.sx+m.dx*t,m.sy+m.dy*t); return [x,y-Math.sin(Math.PI*t)*h]; };
    ctx.strokeStyle="rgba(255,200,150,.35)"; ctx.lineWidth=1.5; ctx.setLineDash([3,4]); ctx.beginPath();
    for(let s=0;s<=24;s++){ const [x,y]=pt(s/24); if(s) ctx.lineTo(x,y); else ctx.moveTo(x,y); } ctx.stroke(); ctx.setLineDash([]);
    const [x,y]=pt(k); ctx.fillStyle="rgba(255,140,60,.45)"; ctx.beginPath(); ctx.arc(x,y,8,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#fff1d0"; ctx.beginPath(); ctx.arc(x,y,3.5,0,Math.PI*2); ctx.fill();
    const [tx,ty]=toS(m.ti%W+0.5,(m.ti/W|0)+0.5); ctx.strokeStyle=`rgba(255,90,70,${0.5+0.4*Math.sin(now/120)})`; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(tx,ty,Math.max(6,WEAP[m.type].r*z),0,Math.PI*2); ctx.stroke(); }
  // explosiones
  blasts=blasts.filter(b=>now-b.t0<1600);
  for(const b of blasts){ const k=Math.max(0,(now-b.t0)/1600), [sx,sy]=toS(b.x,b.y), R=Math.max(10,b.r*z)*(0.4+k*1.1), a=1-k;
    const g=ctx.createRadialGradient(sx,sy,0,sx,sy,R);
    g.addColorStop(0,`rgba(255,255,230,${a})`); g.addColorStop(0.35,`rgba(255,190,90,${a*0.9})`); g.addColorStop(0.7,`rgba(220,70,30,${a*0.6})`); g.addColorStop(1,"rgba(80,20,10,0)");
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(sx,sy,R,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=`rgba(255,240,210,${a*0.7})`; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(sx,sy,R*1.25,0,Math.PI*2); ctx.stroke(); }
  // nombres
  ctx.lineJoin="round";
  for(const p of players){ if(!p.alive||p.tiles<25) continue;
    const fs=Math.sqrt(p.tiles)*z*0.16; if(fs<9) continue; const f=Math.min(fs,48);
    const [sx,sy]=toS(p.sumX/p.tiles,p.sumY/p.tiles); if(sx<-200||sx>vw+200||sy<-60||sy>vh+60) continue;
    const icons=p===me?"":relLabel(me.id,p.id).join(""), nm=p.name+(icons?" "+icons:"");
    ctx.font=`${f}px 'Marcellus SC',Georgia,serif`; ctx.lineWidth=Math.max(2.5,f/6); ctx.strokeStyle="rgba(8,14,20,.8)"; ctx.fillStyle=p===me?"#ffe3a0":"#f6efdf";
    ctx.strokeText(nm,sx,sy-f*0.3); ctx.fillText(nm,sx,sy-f*0.3);
    ctx.font=`600 ${Math.max(9,f*0.55)}px 'IBM Plex Mono',monospace`; ctx.strokeText(fmt(p.troops),sx,sy+f*0.48); ctx.fillText(fmt(p.troops),sx,sy+f*0.48);
  }
  // pantalla roja
  const dk=Math.max(0,1-(now-dangerAt)/900);
  dangerEl.style.opacity=dk>0?(dk*(0.7+0.3*Math.sin(now/90))).toFixed(2):"0";
  if(dk>0.9 && now-lastAlarm>4000 && me && me.alive){ lastAlarm=now; sfx("alarm2"); }
}
function drawMini(){
  mctx.imageSmoothingEnabled=true; mctx.drawImage(off,0,0,mini.width,mini.height);
  const k=mini.width/W; mctx.strokeStyle="#f5d38c"; mctx.lineWidth=3;
  const rx=cam.x*k, ry=cam.y*k, rw=vw/cam.z*k, rh=vh/cam.z*k;
  mctx.strokeRect(rx,ry,rw,rh); if(rx+rw>mini.width) mctx.strokeRect(rx-mini.width,ry,rw,rh);
}

let last=performance.now(), acc=0, hudAt=0, miniAt=0, flushAt=0;
function frame(now){
  acc+=Math.min(400,now-last)*speed; last=now;
  let steps=0; while(acc>=100 && steps<8){ gameTick(); acc-=100; steps++; }
  if(steps===8) acc=0;
  if(now-flushAt>60){ flushPixels(false); flushAt=now; } draw(now); // el volcado de casillas a ~16 Hz basta y ahorra mucho
  if(started && spawned && now-hudAt>250){ updateHud(); hudAt=now; }
  if(started && now-miniAt>150){ drawMini(); miniAt=now; }
  requestAnimationFrame(frame);
}

// ================= Inicio =================
function init(){
  setupWorld();
  precomputeColors(); flushPixels(true);
  resize(); cam.z=cam.tz=fitZoom(); clampCam();
  requestAnimationFrame(frame);
  document.getElementById("loadStartBtn").disabled=false;
  const sb=document.getElementById("startBtn"); sb.disabled=false; sb.textContent="Empezar partida";
}
function startGame(){
  initAudio();
  newGame(document.getElementById("nameIn").value, +document.getElementById("botsIn").value, +document.getElementById("diffIn").value);
  document.getElementById("overlay").hidden=true;
  for(const id of ["top","board","dock","side","send"]) document.getElementById(id).hidden=false;
  document.getElementById("pname").textContent=me.name;
  document.getElementById("hint").hidden=false;
  updateHud();
}
document.getElementById("startBtn").onclick=startGame;
addEventListener("resize",resize);
setTimeout(init,30);
