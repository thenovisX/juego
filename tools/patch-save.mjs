// Script de un solo uso: botones de guardar/cargar en la interfaz y registro de save.ts en el empaquetado.
import fs from "node:fs";
const E = (p, f) => fs.writeFileSync(p, f(fs.readFileSync(p, "utf8")));
const rep = (s, a, b) => { if (!s.includes(a)) throw new Error("falta: " + a.slice(0, 80)); return s.replace(a, b); };

E("tools/build.mjs", s => rep(s, '"loop", "setup"', '"loop", "save", "setup"'));

E("index.html", s => {
  s = rep(s, '<button class="btn" id="boardBtn"', '<button class="btn" id="saveBtn" type="button" title="Guardar partida en un archivo">💾</button>\n    <button class="btn" id="loadBtn" type="button" title="Cargar una partida guardada">📂</button>\n    <button class="btn" id="boardBtn"');
  return rep(s, '<button class="go" id="startBtn" type="button" disabled>Cargando mapa…</button>',
    '<button class="go" id="startBtn" type="button" disabled>Cargando mapa…</button>\n  <button class="btn go2" id="loadStartBtn" type="button" disabled>📂 Cargar partida guardada</button>\n  <input id="loadFile" type="file" accept=".json,application/json" hidden>');
});

E("src/client/render.ts", s => rep(s, 'const sb=document.getElementById("startBtn"); sb.disabled=false;', 'document.getElementById("loadStartBtn").disabled=false;\n  const sb=document.getElementById("startBtn"); sb.disabled=false;'));

E("src/client/ui.ts", s => s + `
// ================= Guardar / cargar =================
function saveToFile(){
  if(!started||!spawned){ log("Aún no hay partida que guardar.","bad"); return; }
  const blob=new Blob([JSON.stringify(saveGame())],{type:"application/json"}), a=document.createElement("a"), d=new Date(), pad=n=>String(n).padStart(2,"0");
  a.href=URL.createObjectURL(blob); a.download=\`hegemonia-\${d.getFullYear()}\${pad(d.getMonth()+1)}\${pad(d.getDate())}-\${pad(d.getHours())}\${pad(d.getMinutes())}.json\`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  log("💾 Partida guardada en un archivo.","good");
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
    updateHud(); log("📂 Partida cargada.","good");
  };
  rd.readAsText(file);
}
{ const lf=document.getElementById("loadFile");
  document.getElementById("saveBtn").onclick=saveToFile;
  document.getElementById("loadBtn").onclick=()=>lf.click();
  document.getElementById("loadStartBtn").onclick=()=>lf.click();
  lf.onchange=()=>{ if(lf.files[0]) loadFromFile(lf.files[0]); lf.value=""; }; }
`);
console.log("parche de guardar/cargar aplicado");
