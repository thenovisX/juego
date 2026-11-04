// ================= Estado =================
const owner = new Int16Array(N).fill(-1);
const bldAt = new Int32Array(N).fill(-1);
const tileIdx = new Int32Array(N).fill(-1);
const wall = new Uint8Array(N);
const fallout = new Uint32Array(N);
let players=[], tilesOf=[], buildings=[], attacks=[], boats=[], missiles=[], blasts=[], falloutQ=[];
let landTotal=0, tick=0, me=null, started=false, paused=false, over=false, spawned=false, spectating=false, diff=1, speed=1;
let P=0, opin=null; const rels=new Map();

const GOLD_X = 100; // todos los precios y todo el oro ganado van multiplicados por esto
const BT = {
  city:{n:"Ciudad",     e:"{{city}}", key:"1", base:25000,  mul:1.6,  desc:"+2000 tropas máximas y crecen más rápido"},
  mine:{n:"Mina",       e:"{{mine}}", key:"2", base:15000,  mul:1.45, desc:"Produce piedra y da trabajo: más impuestos y más felicidad (en montaña da más empleo)"},
  foundry:{n:"Metalúrgica", e:"{{foundry}}", key:"i", base:40000, mul:1.4, desc:"Produce hierro y da oro"},
  fort:{n:"Fortaleza",  e:"{{fort}}", key:"3", base:22000,  mul:1.35, desc:"Defensa x2,5 en un radio de 14"},
  port:{n:"Puerto",     e:"{{port}}", key:"4", base:35000,  mul:1.5,  desc:"Envía flotas a otras costas"},
  sam: {n:"Antiaérea",  e:"{{sam}}", key:"5", base:120000, mul:1.5,  desc:"Derriba misiles en un radio de 40 (recarga 15 s)"},
  silo:{n:"Silo",       e:"{{silo}}", key:"6", base:80000, mul:1.6,  desc:"Permite lanzar misiles y bombas"},
  airport:{n:"Aeropuerto", e:"{{airport}}", key:"a", base:400000, mul:1.5, desc:"Despacha aviones comerciales que pagan oro a socios comerciales; con aviones de guerra derribas los ajenos"},
  sawmill:{n:"Aserradero", e:"{{sawmill}}", key:"w", base:30000, mul:1.4, desc:"Produce madera y da oro (solo en bosque)"},
  farm:{n:"Granja", e:"{{farm}}", key:"f", base:30000, mul:1.4, desc:"Produce comida y da oro (solo en llanura)"},
  bank:{n:"Banco de materiales", e:"{{bank}}", key:"m", base:50000, mul:1.4, desc:"Guarda hasta 500 de cada material y lo reparte por la red de estaciones"},
  station:{n:"Estación", e:"{{station}}", key:"7", base:50000, mul:1.35, desc:"Conecta minas, ciudades y puertos en radio 14; las estaciones a menos de 40 forman red (+50% producción y exportación)"},
};
const WEAP = {
  missile:{n:"Misil",   e:"{{missile}}", key:"8", cost:300000, r:6,  neutral:false, kill:3,   desc:"Destruye edificios y tropas en radio 6"},
  atom:   {n:"Atómica", e:"{{atom}}", key:"9", cost:1500000, r:16, neutral:true,  kill:2,   desc:"Arrasa un radio de 16 y deja radiación"},
  hydro:  {n:"Bomba H", e:"{{hydro}}", key:"0", cost:4500000, r:32, neutral:true,  kill:2.5, desc:"Arrasa un radio de 32; difícil de derribar"},
};
const ST_LINK=40, ST_COV=14, BUILD_TIME=50, FORT_R=14, SAM_R=40, SAM_CD=150, NAP_TIME=3000;

function nbs(i,out){ const x=i%W; out[0]= x===0 ? i+W-1 : i-1; out[1]= x===W-1 ? i-W+1 : i+1; out[2]= i>=W ? i-W : -1; out[3]= i<N-W ? i+W : -1; return out; }
const NB=[0,0,0,0], NB2=[0,0,0,0];
function wdx(a,b){ let d=Math.abs(a-b); return d>W/2? W-d : d; }
function disk(cx,cy,r,fn){ for(let dy=-r;dy<=r;dy++){ const y=cy+dy; if(y<0||y>=H) continue; const w=Math.floor(Math.sqrt(r*r-dy*dy));
  for(let dx=-w;dx<=w;dx++) fn(y*W+((cx+dx)%W+W)%W); } }

// Casillas cuyo color debe repintarse (las consume el cliente; el servidor puede ignorarlas)
const dirty = new Uint8Array(N); let dirtyList: number[]=[];
function markDirty(i){ if(!dirty[i]){ dirty[i]=1; dirtyList.push(i);} }
