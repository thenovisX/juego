// ================= Mapa =================
// El mapa activo se elige con selectMap(id) (ver MAPDATA.maps). W, H, N y todos los arrays dependen de él.
let W = 0, H = 0, N = 0, LATTOP = 0, LATBOT = 0, LON0 = -180, LON1 = 180, WRAP = true, MAPID = "tierra", MAPDEF: any = null;
let TS = 1; // casillas por grado relativo a la Tierra normal (2000/360): escala el ruido para que el relieve no cambie de aspecto
const lonOf = x => LON0+(x+0.5)/W*(LON1-LON0);
const latOf = y => LATTOP-(y+0.5)/H*(LATTOP-LATBOT);
const toX = lon => (lon-LON0)/(LON1-LON0)*W, toY = lat => (LATTOP-lat)/(LATTOP-LATBOT)*H;

const TER = [
  {n:"Mar",       e:"{{t0}}", cost:0,   def:1,   c:[29,59,90]},
  {n:"Llanura",   e:"{{plain}}", cost:1.0, def:1.0, c:[178,192,124]},
  {n:"Bosque",    e:"{{forest}}", cost:1.5, def:1.3, c:[92,140,82]},
  {n:"Montaña",   e:"{{mountain}}", cost:3.0, def:1.7, c:[150,138,120]},
  {n:"Desierto",  e:"{{desert}}", cost:1.8, def:0.9, c:[226,204,146]},
  {n:"Hielo",     e:"{{t5}}", cost:2.4, def:1.1, c:[228,236,240]},
];
let terrain: Uint8Array = new Uint8Array(0);

function decodeMask(){
  const bin = atob(MAPDEF.rle); let i=0, pos=0, v=0;
  while(i<bin.length){ let r=0, sh=0, b; do{ b=bin.charCodeAt(i++); r|=(b&127)<<sh; sh+=7; }while(b&128);
    if(v) terrain.fill(1,pos,pos+r); pos+=r; v^=1; }
}
function hash(x,y){ let h=(x*374761393 + y*668265263)|0; h=(h^(h>>>13))*1274126177|0; return ((h^(h>>>16))>>>0)/4294967295; }
function vnoise(x,y){ const xi=Math.floor(x), yi=Math.floor(y), xf=x-xi, yf=y-yi, u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf);
  const a=hash(xi,yi), b=hash(xi+1,yi), c=hash(xi,yi+1), d=hash(xi+1,yi+1); return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v; }
function ridge(x,y){ return 1-Math.abs(vnoise(x,y)*2-1); }
function fbm(x,y){ return vnoise(x,y)*0.55+vnoise(x*2.1,y*2.1)*0.3+vnoise(x*4.3,y*4.3)*0.15; }

const RANGES: [number, number[][]][] = [
  [1.6,[[73,35.5],[78,33],[84,29],[88,28],[92,28],[96,28.5]]],[1.2,[[78,36],[90,36],[100,35]]],
  [1.2,[[66,35],[71,36.5],[75,38.5]]],[1.1,[[70,41],[78,42],[86,43],[94,43]]],[1,[[86,50],[92,49],[98,48]]],
  [1,[[96,47.5],[101,47]]],[1.2,[[44,37],[48,34],[52,30],[57,27]]],[0.8,[[38,44],[43,42.8],[48,41]]],
  [0.9,[[6,44.5],[7,46],[10,46.5],[14,47]]],[0.6,[[-1.5,43],[3,42.5]]],[0.7,[[18,49.5],[22,49],[25,47.5],[25,45.5],[22,44.8]]],
  [0.7,[[15,45],[19,43],[21,41]]],[1,[[6,59],[9,62],[13,65],[17,68],[20,69.5]]],[0.8,[[59,50],[59.5,56],[60,62],[62,67]]],
  [1,[[-9,30.5],[-5,32.5],[0,34],[5,35.5],[9,36]]],[1.5,[[37,8],[38.5,11],[39,14]]],[1,[[36,-3],[35,-8],[33,-12]]],
  [0.9,[[27,-31],[29.5,-29],[31,-26]]],[2.2,[[-142,61],[-132,58],[-124,54],[-117,49],[-112,45],[-108,40],[-106,35]]],
  [0.8,[[-122,48],[-121,44],[-120,39],[-118,36]]],[1,[[-108,30],[-104,25],[-101,21],[-97,18],[-93,16]]],
  [0.9,[[-85,34],[-82,36.5],[-78,39.5],[-75,42],[-71,44.5]]],
  [1.6,[[-75,10],[-77,5],[-78,0],[-79,-5],[-76,-12],[-71,-16],[-69,-20],[-69,-26],[-70,-33],[-71,-40],[-72,-47],[-73,-52]]],
  [0.8,[[-152,62],[-147,63],[-141,61.5]]],[0.5,[[131,32],[136,35.5],[140,38],[142,42.5]]],[1,[[128,62],[130,66],[134,69]]],
  [0.8,[[146,-38],[149,-33],[151,-29],[148,-22],[145,-16]]],[0.9,[[134,-4],[140,-4.5],[146,-6]]],[0.5,[[167,-46],[170,-43.5],[173,-41.5]]],
];
const DESERTS = [[10,23,24,7.5],[-8,22,8,6],[47,23,10,6],[58,31,6,3.5],[71,27,3.5,2.5],[83,39,7,2.3],[105,42.5,11,4],[60,40,6,3],
  [130,-25,15,7],[20,-23,5,5],[-70,-23,1.5,5],[-112,33,6,4],[-105,29,4,3],[46,6,4,4]];
function segDist(px,py,ax,ay,bx,by){ const dx=bx-ax, dy=by-ay, l=dx*dx+dy*dy; let t=l?((px-ax)*dx+(py-ay)*dy)/l:0; t=Math.max(0,Math.min(1,t));
  const ex=px-(ax+t*dx), ey=py-(ay+t*dy); return Math.sqrt(ex*ex+ey*ey); }
function genTerrain(){
  const mount = new Uint8Array(N), real = !MAPDEF.proc;
  for(const [w,pts] of (real?RANGES:[]) as typeof RANGES) for(let k=0;k+1<pts.length;k++){
    const [a0,a1]=pts[k], [b0,b1]=pts[k+1], pad=w*1.4;
    const x0=Math.floor(toX(Math.min(a0,b0)-pad)), x1=Math.ceil(toX(Math.max(a0,b0)+pad));
    const y0=Math.max(0,Math.floor(toY(Math.max(a1,b1)+pad))), y1=Math.min(H-1,Math.ceil(toY(Math.min(a1,b1)-pad)));
    for(let y=y0;y<=y1;y++){ const lat=latOf(y);
      for(let xx=x0;xx<=x1;xx++){ if(!WRAP&&(xx<0||xx>=W)) continue; const x=((xx%W)+W)%W, i=y*W+x; if(!terrain[i]) continue;
        if(segDist(lonOf(xx),lat,a0,a1,b0,b1) < w*(0.55+0.8*fbm(x/(14*TS),y/(14*TS)))) mount[i]=1; } }
  }
  for(let y=0;y<H;y++){ const lat=latOf(y);
    for(let x=0;x<W;x++){ const i=y*W+x; if(!terrain[i]) continue;
      const lon=lonOf(x), n=fbm(x/(22*TS),y/(22*TS)), n2=fbm(x/(9*TS)+50,y/(9*TS)+50); let t=1;
      if(lat>72 || lat<-54 || (lon>-75 && lon<-10 && lat>59.5) || (lat>64 && n>0.56)) t=5;
      else if(mount[i] || n2>0.86 || (!real && ridge(x/(40*TS),y/(40*TS))>0.94 && fbm(x/(120*TS)+30,y/(120*TS)+30)>0.52)) t=3;
      else {
        for(const [dl,dt,rx,ry] of (real?DESERTS:[])){ const a=(lon-dl)/rx, b=(lat-dt)/ry; if(a*a+b*b < 1+(n-0.5)*0.8){ t=4; break; } }
        if(t===1){ const al=Math.abs(lat), j=(n2-0.5)*14;
          if(!real && fbm(x/(60*TS)+9,y/(60*TS)+9)>0.56+Math.max(0,al-8)*0.022) t=4;
          else if((al<11+j && n>0.33) || (lat>48+j && lat<65+j && n>0.40) || n>0.63) t=2; }
      }
      terrain[i]=t;
    }}
}

// Mapas procedurales (sin datos): máscara de tierra con ruido determinista, así cada partida del mismo mapa tiene la misma geografía.
function genProcMask(kind: string){
  const sx = 1/(W/2000);
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    const u=x/W*2-1, v=y/H*2-1; let a: number;
    if(kind==="pangea"){
      const ang=Math.atan2(v,u), r=Math.hypot(u*0.85,v*1.0), wob=0.56+0.16*vnoise(ang*1.7+3,0.5)+0.07*vnoise(ang*5.3,7.5);
      a = (wob - r)*2.2 + (fbm(x*sx/38,y*sx/38)-0.5)*0.9;
    } else { // archipiélago: ruido de dos escalas, más tierra al centro
      const edge=Math.max(0,1-Math.hypot(u,v*1.15)*0.85);
      a = (fbm(x*sx/52+11,y*sx/52+5)-0.5)*1.5 + (fbm(x*sx/17+3,y*sx/17+8)-0.5)*0.55 - 0.15 + edge*0.18;
    }
    if(a>0.0) terrain[y*W+x]=1;
  }
  // margen de mar en los bordes laterales (la costura del mapa nunca une tierra con tierra) y arriba/abajo
  for(let y=0;y<H;y++) for(let k=0;k<8;k++){ terrain[y*W+k]=0; terrain[y*W+W-1-k]=0; }
  for(let x=0;x<W;x++) for(let k=0;k<4;k++){ terrain[k*W+x]=0; terrain[(H-1-k)*W+x]=0; }
  // quita islotes de menos de 6 casillas y charcos de agua de 1-2 casillas
  const seen=new Uint8Array(N), st: number[]=[];
  for(let i0=0;i0<N;i0++){ if(!terrain[i0]||seen[i0]) continue; const comp: number[]=[i0]; seen[i0]=1; st.length=0; st.push(i0);
    while(st.length){ const c=st.pop(); nbs(c,NB); for(const j of NB) if(j>=0&&terrain[j]&&!seen[j]){ seen[j]=1; comp.push(j); st.push(j); } }
    if(comp.length<6) for(const c of comp) terrain[c]=0; }
}
function mapList(){ return MAPDATA.maps; }
function mapInfo(id: string){ return MAPDATA.maps.find((m:any)=>m.id===id) || MAPDATA.maps[0]; }
// Elige el mapa, reserva memoria para él y lo genera. Borra cualquier partida en curso.
function selectMap(id: string){
  const m = mapInfo(id); MAPDEF=m; MAPID=m.id;
  W=m.W; H=m.H; N=W*H; LATTOP=m.latTop; LATBOT=m.latBot; LON0=m.lon0; LON1=m.lon1; WRAP=!!m.wrap; TS=(W/(LON1-LON0))/(2000/360);
  terrain=new Uint8Array(N);
  allocWorld();
  if(m.proc) genProcMask(m.proc); else decodeMask();
  genTerrain();
  landTotal=0; for(let i=0;i<N;i++) if(terrain[i]) landTotal++;
}
