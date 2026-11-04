// Script de un solo uso: conecta los aviones (src/sim/air.ts) con el estado, la IA, el dibujo y la interfaz.
import fs from "node:fs";
const E = (p, f) => fs.writeFileSync(p, f(fs.readFileSync(p, "utf8")));
const rep = (s, a, b) => { if (!s.includes(a)) throw new Error("falta: " + a.slice(0, 70)); return s.replace(a, b); };

E("src/sim/state.ts", s => rep(s, "  station:{",
  '  airport:{n:"Aeropuerto", e:"🛫", key:"a", base:400000, mul:1.5, desc:"Despacha aviones comerciales que pagan oro a socios comerciales; con 🛩️ aviones de guerra derribas los ajenos"},\n  station:{'));

E("src/sim/players.ts", s => {
  s = rep(s, "station:0}, B:{", "station:0,airport:0}, B:{");
  return rep(s, "station:[]}", "station:[],airport:[]}");
});

E("src/sim/loop.ts", s => rep(s, "stepNavy();", "stepNavy(); stepAir();"));

E("src/sim/ai.ts", s => rep(s, "  // marina:",
  '  if(p.gold>bCost(p,"airport") && p.tiles>15000 && p.cnt.airport<1 && tick>2400) tryPlace("airport");\n' +
  '  if(p.B.airport.length && Math.random()<0.1 && p.gold>WPLANE_COST*3 && wplanes.filter(w=>w.owner===p.id).length<1 && planes.some(s=>s.from!==p.id && canSeize(p.id,s.from))) buyWarplane(p);\n' +
  "  // marina:"));

E("tools/build.mjs", s => rep(s, '"navy", "ai"', '"navy", "air", "ai"'));

E("src/client/render.ts", s => rep(s, "  // barcos\n",
`  for(const s of planes){ wake(s.trail,"235,245,255"); const [sx,sy]=toS(s.x,s.y); if(sx<-40||sx>vw+40||sy<-40||sy>vh+40) continue;
    ctx.font=\`\${Math.max(14,Math.min(24,z*3))}px \${EMOJI_FONT}\`; ctx.fillText("✈️",sx,sy);
    ctx.font="600 11px 'IBM Plex Mono',monospace"; ctx.fillStyle="#f5d38c"; ctx.strokeStyle="#0b141d"; ctx.lineWidth=3; ctx.strokeText("+"+fmt(s.val),sx,sy-15); ctx.fillText("+"+fmt(s.val),sx,sy-15); }
  for(const w of wplanes){ wake(w.trail,"235,245,255"); const [sx,sy]=toS(w.x,w.y); if(sx<-40||sx>vw+40||sy<-40||sy>vh+40) continue;
    ctx.strokeStyle=\`rgb(\${players[w.owner].c})\`; ctx.lineWidth=2.5; ctx.beginPath(); ctx.arc(sx,sy,Math.max(10,Math.min(18,z*2.4)),0,Math.PI*2); ctx.stroke();
    ctx.font=\`\${Math.max(14,Math.min(24,z*3))}px \${EMOJI_FONT}\`; ctx.fillText("🛩️",sx,sy); }
  // barcos
`));

E("src/client/ui.ts", s => {
  s = rep(s, 'document.getElementById("dipBtn").onclick=',
`mkCard(weapEl,"w_plane","🛩️","Avión de guerra","V","Avión de guerra: patrulla desde tu aeropuerto y derriba aviones comerciales enemigos",()=>{ const why=buyWarplane(me); if(why){ log(why,"bad"); sfx("err"); } else { sfx("build"); log("🛩️ Avión de guerra listo para patrullar."); } },"weap");
document.getElementById("dipBtn").onclick=`);
  s = rep(s, 'document.getElementById("w_ship").disabled=!ok||me.gold<WSHIP_COST||!me.alive; }',
`document.getElementById("w_ship").disabled=!ok||me.gold<WSHIP_COST||!me.alive; }
  { const ok=readyAirports(me).length>0; document.getElementById("w_plane_c").textContent=fmt(WPLANE_COST); document.getElementById("w_plane").disabled=!ok||me.gold<WPLANE_COST||!me.alive; }`);
  s = rep(s, '  if(e.key==="b"||e.key==="B") document.getElementById("w_ship").click();',
    '  if(e.key==="b"||e.key==="B") document.getElementById("w_ship").click();\n  if(e.key==="v"||e.key==="V") document.getElementById("w_plane").click();');
  s = rep(s, "  const acts=[];\n  if(!r.ally",
`  if(r.trade){ const why=airCheck(me.id,dipFor);
    trd.push(\`<button class="btn" type="button" data-a="plane" \${why?"disabled":""} title="\${why||"Envía un avión comercial a un aeropuerto del reino"}">✈️ Enviar avión comercial <small>+\${fmt(airValue(me))} 🪙</small></button>\`); }
  const acts=[];
  if(!r.ally`);
  s = rep(s, '  else if(a==="ship"){',
`  else if(a==="plane"){ const why=sendPlane(me.id,o); if(why){ log(why,"bad"); sfx("err"); } else { sfx("march"); log(\`✈️ Avión comercial enviado a \${players[o].name}.\`); } }
  else if(a==="ship"){`);
  return s;
});
console.log("parche aplicado");
