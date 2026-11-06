// @ts-nocheck  (cliente: DOM sin tipar de momento; la simulación sí se comprueba)
// ================= Render del mapa =================
// El lienzo del mapa (1 píxel = 1 casilla) se crea con initPixels() cada vez que se elige mapa.
const off = document.createElement("canvas");
const octx = off.getContext("2d");
let img: ImageData, pix: Uint32Array, baseCol: Uint32Array, CW=0, chDirty: Uint8Array;
const CH=32;
function initPixels(){
  off.width=W; off.height=H; img=octx.createImageData(W,H); pix=new Uint32Array(img.data.buffer);
  baseCol=new Uint32Array(N); CW=Math.ceil(W/CH); chDirty=new Uint8Array(CW*Math.ceil(H/CH));
}
const cl=v=>v<0?0:v>255?255:v|0;
const rgba=(r,g,b)=>(255<<24)|(cl(b)<<16)|(cl(g)<<8)|cl(r);

function precomputeColors(){
  const dist=new Uint8Array(N).fill(255); let q=[];
  for(let i=0;i<N;i++) if(terrain[i]){ dist[i]=0; q.push(i); }
  const R=Math.round(12*Math.min(TS,2)); // grosor de la franja de mar poco profundo (en casillas)
  for(let d=1; d<=R && q.length; d++){ const nq=[];
    for(const i of q){ nbs(i,NB); for(const j of NB){ if(j>=0 && dist[j]===255){ dist[j]=d; nq.push(j);} } } q=nq; }
  for(let i=0;i<N;i++){
    const t=terrain[i], c=TER[t].c, x=i%W, y=(i/W)|0;
    if(!t){ const k=dist[i]===255?0:Math.pow((R+1-dist[i])/(R+1),1.6), s=fbm(x/(30*TS),y/(30*TS))*10;
      baseCol[i]= dist[i]===1 ? rgba(112,160,182) : rgba(c[0]+k*34-s, c[1]+k*52-s, c[2]+k*50-s); }
    else { const s=0.88+fbm(x/(6*TS),y/(6*TS))*0.22; baseCol[i]=rgba(c[0]*s,c[1]*s,c[2]*s); }
  }
}
function colorTile(i){
  const o=owner[i], b=baseCol[i], br=b&255, bg=(b>>8)&255, bb=(b>>16)&255;
  const fo = fallout[i]>tick;
  if(o<0){ pix[i]= fo ? rgba(br*0.5+60,bg*0.5+110,bb*0.4+20) : b; return; }
  const c=players[o].c; nbs(i,NB2); let border=false;
  for(const j of NB2){ if(j>=0 && terrain[j] && owner[j]!==o){ border=true; break; } }
  if(wall[i]){ const k=border?0.42:0.62; pix[i]=rgba((c[0]*0.3+125*0.7)*k+18,(c[1]*0.3+118*0.7)*k+18,(c[2]*0.3+110*0.7)*k+20); return; }
  if(border){ pix[i]=rgba(c[0]*0.55,c[1]*0.55,c[2]*0.55); return; }
  let r=c[0]*0.6+br*0.4, g=c[1]*0.6+bg*0.4, bl=c[2]*0.6+bb*0.4;
  if(fo){ r=r*0.6+30; g=g*0.6+90; bl*=0.5; }
  pix[i]=rgba(r,g,bl);
}
function flushPixels(full){
  if(full){ for(let i=0;i<N;i++) colorTile(i); octx.putImageData(img,0,0); dirtyList=[]; dirty.fill(0); return; }
  if(!dirtyList.length) return;
  const chunks=[];
  for(const i of dirtyList){ dirty[i]=0; colorTile(i); const c=(((i/W)|0)>>5)*CW+((i%W)>>5); if(!chDirty[c]){ chDirty[c]=1; chunks.push(c); } }
  dirtyList=[];
  // solo se vuelcan los bloques de 32x32 modificados (antes un único rectángulo que podía abarcar todo el mapa)
  for(const c of chunks){ chDirty[c]=0; octx.putImageData(img,0,0,(c%CW)*CH,((c/CW)|0)*CH,CH,CH); }
}
