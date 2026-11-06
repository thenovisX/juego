// @ts-nocheck  (cliente: DOM sin tipar de momento; la simulación sí se comprueba)
// ================= Render del mapa =================
const off = document.createElement("canvas"); off.width=W; off.height=H;
const octx = off.getContext("2d");
const img = octx.createImageData(W,H);
const pix = new Uint32Array(img.data.buffer);
const baseCol = new Uint32Array(N);
const cl=v=>v<0?0:v>255?255:v|0;
const rgba=(r,g,b)=>(255<<24)|(cl(b)<<16)|(cl(g)<<8)|cl(r);

// Mapa más natural: relieve sombreado (luz desde el noroeste), transiciones suaves entre terrenos,
// playas y espuma en las costas, mar con profundidad y bosques/desiertos con textura.
function distFrom(seed:(i:number)=>boolean, cap:number){
  const d=new Uint8Array(N).fill(255); let q:number[]=[];
  for(let i=0;i<N;i++) if(seed(i)){ d[i]=0; q.push(i); }
  for(let k=1;k<=cap && q.length;k++){ const nq:number[]=[];
    for(const i of q){ nbs(i,NB); for(const j of NB){ if(j>=0 && d[j]===255){ d[j]=k; nq.push(j);} } } q=nq; }
  return d;
}
const mix=(a:number,b:number,k:number)=>a+(b-a)*k;
function precomputeColors(){
  const dist=distFrom(i=>terrain[i]!==0,13);           // mar: distancia a la costa
  const dl=distFrom(i=>terrain[i]===0,10);             // tierra: distancia al mar
  const hg=new Int16Array(N);
  for(let i=0;i<N;i++){ const t=terrain[i]; if(!t) continue; const x=i%W, y=(i/W)|0;
    let h=40+fbm(x/14,y/14)*34+Math.min(dl[i],10)*2.2;
    if(t===3){ const rid=1-Math.abs(vnoise(x/5,y/5)-0.5)*2; h+=70+rid*rid*120+fbm(x/3,y/3)*30; }
    else if(t===2) h+=10; else if(t===5) h+=14;
    hg[i]=h; }
  const H_=(x:number,y:number)=>hg[(y<0?0:y>=H?H-1:y)*W+((x+W)%W)];
  const SAND=[222,206,158];
  for(let i=0;i<N;i++){
    const t=terrain[i], x=i%W, y=(i/W)|0;
    if(!t){ const d=dist[i]===255?13:dist[i], k=Math.pow((13-d)/13,1.8), s=fbm(x/30,y/30)*12+vnoise(x/3,y/3)*4;
      let r=mix(24,74,k)-s*0.6, g=mix(52,142,k)-s*0.5, b=mix(84,166,k)-s*0.3;
      if(d===1){ r=mix(r,176,0.55); g=mix(g,214,0.55); b=mix(b,222,0.55); } else if(d===2){ r=mix(r,120,0.25); g=mix(g,176,0.25); b=mix(b,196,0.25); }
      baseCol[i]=rgba(r,g,b); continue; }
    // color propio mezclado con el de los terrenos vecinos (bordes suaves)
    let cr=0, cg=0, cb=0, wsum=0;
    for(const [dx,dy,w] of [[0,0,3],[3,0,1],[-3,0,1],[0,3,1],[0,-3,1],[2,2,0.6],[-2,-2,0.6]]){
      const xx=(x+dx+W)%W, yy=y+dy<0?0:y+dy>=H?H-1:y+dy, tt=terrain[yy*W+xx]; if(!tt) continue;
      const c=TER[tt].c; cr+=c[0]*w; cg+=c[1]*w; cb+=c[2]*w; wsum+=w; }
    let r=cr/wsum, g=cg/wsum, b=cb/wsum;
    const n1=fbm(x/38,y/38), n2=fbm(x/5,y/5), hh=hg[i];
    if(t===1){ const k=Math.max(0,Math.min(1,1.3-n1*1.8)); r=mix(r,128,k*0.7); g=mix(g,162,k*0.6); b=mix(b,90,k*0.7); }
    else if(t===2){ const sp=0.82+hash(x,y)*0.3; r*=sp*0.95; g*=sp; b*=sp*0.95; }
    else if(t===4){ const rp=fbm(x/4,y/14)*0.5+n2*0.3; r=mix(r,236,rp-0.2); g=mix(g,208,rp-0.2); b=mix(b,152,rp-0.2); }
    else if(t===3){ r=mix(r,118,0.45); g=mix(g,108,0.45); b=mix(b,94,0.45); const sn=Math.max(0,Math.min(1,(hh-255)/45+(n2-0.5)*0.8)); r=mix(r,242,sn); g=mix(g,246,sn); b=mix(b,250,sn); }
    else if(t===5){ b+=6; g+=2; }
    if(dl[i]===1 && t!==5 && t!==3){ r=mix(r,SAND[0],0.38); g=mix(g,SAND[1],0.38); b=mix(b,SAND[2],0.38); }
    const sh=1+Math.max(-0.4,Math.min(0.4,(H_(x+1,y+1)-H_(x-1,y-1)+(H_(x+1,y)-H_(x-1,y))*0.5)*0.0028))+(n2-0.5)*0.08;
    baseCol[i]=rgba(r*sh,g*sh,b*sh);
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
const CH=32, CW=Math.ceil(W/CH), chDirty=new Uint8Array(CW*Math.ceil(H/CH));
function flushPixels(full){
  if(full){ for(let i=0;i<N;i++) colorTile(i); octx.putImageData(img,0,0); dirtyList=[]; dirty.fill(0); return; }
  if(!dirtyList.length) return;
  const chunks=[];
  for(const i of dirtyList){ dirty[i]=0; colorTile(i); const c=(((i/W)|0)>>5)*CW+((i%W)>>5); if(!chDirty[c]){ chDirty[c]=1; chunks.push(c); } }
  dirtyList=[];
  // solo se vuelcan los bloques de 32x32 modificados (antes un único rectángulo que podía abarcar todo el mapa)
  for(const c of chunks){ chDirty[c]=0; octx.putImageData(img,0,0,(c%CW)*CH,((c/CW)|0)*CH,CH,CH); }
}
