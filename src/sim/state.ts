// ================= Estado =================
const owner = new Int16Array(N).fill(-1);
const bldAt = new Int32Array(N).fill(-1);
const tileIdx = new Int32Array(N).fill(-1);
const wall = new Uint8Array(N);
const fallout = new Uint32Array(N);
let players=[], tilesOf=[], buildings=[], attacks=[], boats=[], missiles=[], blasts=[], falloutQ=[];
let landTotal=0, tick=0, me=null, started=false, paused=false, over=false, spawned=false, spectating=false, diff=1, speed=1;
let netOn=false, netWinner=-1; // multijugador (ver net.ts)
let P=0, opin=null; const rels=new Map();

const GOLD_X = 100; // todos los precios y todo el oro ganado van multiplicados por esto
const POP_X = 100;  // la población (tropas) va multiplicada por esto; los ingresos NO dependen de la población
// Categorías de la barra de construcción (pestañas)
const CATS: any = {
  eco:{n:"Economía",       e:"{{gold}}",    tip:"Todo lo que te da oro y materiales. Los impuestos dan la base; estos edificios la multiplican."},
  pop:{n:"Pueblo y ejército", short:"Pueblo", e:"{{troops}}", tip:"Población máxima, felicidad (para subir impuestos) y reclutamiento de tropas."},
  def:{n:"Defensa",        e:"{{shield}}",  tip:"Hacen más difícil conquistarte o derriban los misiles enemigos."},
  log:{n:"Logística",      e:"{{station}}", tip:"Conectan tu reino: materiales por vías, comercio por mar y por aire."},
  arm:{n:"Armamento", short:"Armas",      e:"{{missile}}", tip:"Silo para misiles y bombas, y flotas o aviones de guerra para cazar el comercio enemigo."},
  sci:{n:"Ciencia",        e:"{{science}}", tip:"Las universidades generan puntos de investigación. Cuantas más universidades, antes desbloqueas edificios y armas avanzadas."},
  tro:{n:"Órdenes",        e:"{{attack}}",  tip:"Reclutar, retirar o reforzar las tropas que están en combate."},
};
// desc = para qué sirve (con números), where = dónde / qué necesita, r = radio de efecto, max = máximo permitido
const BT = {
  sawmill:{cat:"eco", n:"Aserradero", e:"{{sawmill}}", key:"w", base:30000, mul:1.4, desc:"+250 oro/s y produce madera (cada aserradero extra rinde menos oro, pero la madera se gasta en obras y mejoras: haz más).", where:"Solo en bosque."},
  farm:{cat:"eco", n:"Granja", e:"{{farm}}", key:"f", base:30000, mul:1.4, desc:"+250 oro/s y produce comida. Tus tropas comen: sin granjas suficientes pasan hambre y crecen muy despacio.", where:"Solo en llanura."},
  mine:{cat:"eco", n:"Mina", e:"{{mine}}", key:"2", base:15000, mul:1.45, desc:"Produce piedra (hierro en montaña) y da empleo: +20% de impuestos por la primera mina (cada una extra rinde menos; el doble en montaña) y más felicidad. Las obras y mejoras gastan cada vez más piedra.", where:"Cualquier terreno propio; en montaña da el doble de empleo."},
  foundry:{cat:"eco", n:"Metalúrgica", e:"{{foundry}}", key:"i", base:40000, mul:1.4, desc:"+250 oro/s y produce hierro (armas, ciudades, silos; cada metalúrgica extra rinde menos oro).", where:"Cualquier terreno propio."},
  market:{cat:"eco", n:"Mercado", e:"{{market}}", key:"r", base:45000, mul:1.45, r:20, desc:"+250 oro/s por cada ciudad a menos de 20 casillas (hasta 4 ciudades).", where:"Necesita una ciudad cerca (radio 20)."},
  mint:{cat:"eco", n:"Casa de la moneda", e:"{{mint}}", key:"c", base:90000, mul:1.6, r:20, max:3, desc:"+200 oro/s fijos y +150 oro/s por cada mina o metalúrgica a menos de 20 casillas (hasta 5).", where:"Necesita una mina o metalúrgica cerca (radio 20). Máx. 3."},
  tradehouse:{cat:"eco", n:"Casa de comercio", e:"{{tradehouse}}", key:"x", base:60000, mul:1.5, max:2, desc:"+300 oro/s por cada acuerdo comercial activo (hasta 5 socios).", where:"No depende del sitio. Máx. 2. Firma acuerdos en Diplomacia."},
  university:{cat:"sci", n:"Universidad", e:"{{university}}", key:"t", base:55000, mul:1.45, desc:"Genera 1 punto de investigación por segundo (por nivel). Cada universidad extra suma: investigas más rápido.", where:"Cualquier terreno propio. Elige qué investigar en esta pestaña."},
  city:{cat:"pop", n:"Ciudad", e:"{{city}}", key:"1", base:25000, mul:1.6, desc:"+200.000 de población máxima y crece más rápido. Da empleo e impulsa los mercados cercanos.", where:"Cualquier terreno propio."},
  temple:{cat:"pop", n:"Templo", e:"{{temple}}", key:"g", base:35000, mul:1.5, max:4, desc:"+4 de felicidad por nivel (hasta +15 en total): puedes subir los impuestos sin provocar revueltas.", where:"Cualquier terreno propio. Máx. 4."},
  barracks:{cat:"pop", n:"Cuartel", e:"{{barracks}}", key:"h", base:40000, mul:1.5, max:4, desc:"+100.000 de población máxima por nivel, tropas que crecen más rápido y permite RECLUTAR: paga oro y consigue tropas al instante.", where:"Cualquier terreno propio. Máx. 4."},
  fort:{cat:"def", n:"Fortaleza", e:"{{fort}}", key:"3", base:22000, mul:1.35, r:14, desc:"Las casillas a menos de 14 son 2,5 veces más caras de conquistar.", where:"Ponla en la frontera con un vecino peligroso."},
  sam:{cat:"def", n:"Antiaérea", e:"{{sam}}", key:"5", base:120000, mul:1.5, r:40, desc:"Intenta derribar (75% de acierto, 40% contra la bomba H) un misil que caiga a menos de 40 casillas (recarga 15 s). Protege también a tus aliados.", where:"Cualquier terreno propio."},
  station:{cat:"log", n:"Estación", e:"{{station}}", key:"7", base:50000, mul:1.35, r:14, desc:"Lleva materiales por vía a las obras cercanas (radio 14). Las estaciones a menos de 40 forman red: +50% de producción y exportación.", where:"Junto a minas, ciudades y puertos, sin pegarla."},
  bank:{cat:"log", n:"Banco de materiales", e:"{{bank}}", key:"m", base:50000, mul:1.4, desc:"Guarda hasta 500 de cada material y lo reparte por la red de estaciones.", where:"Dentro del radio de una estación."},
  port:{cat:"log", n:"Puerto", e:"{{port}}", key:"4", base:35000, mul:1.5, desc:"Envía flotas de desembarco y cargueros de comercio a otras costas.", where:"Solo junto al mar."},
  airport:{cat:"log", n:"Aeropuerto", e:"{{airport}}", key:"a", base:400000, mul:1.5, desc:"Despacha aviones comerciales que pagan oro a tus socios; con aviones de guerra derribas los ajenos.", where:"Cualquier terreno propio."},
  silo:{cat:"arm", n:"Silo", e:"{{silo}}", key:"6", base:80000, mul:1.6, desc:"Desbloquea misil, atómica y bomba H.", where:"Cualquier terreno propio."},
};
const WEAP = {
  missile:{n:"Misil",   e:"{{missile}}", key:"8", cost:300000, r:6,  neutral:false, kill:3,   desc:"Destruye edificios y tropas en radio 6."},
  atom:   {n:"Atómica", e:"{{atom}}", key:"9", cost:1500000, r:16, neutral:true,  kill:2,   desc:"Arrasa un radio de 16 y deja radiación 3 minutos."},
  hydro:  {n:"Bomba H", e:"{{hydro}}", key:"0", cost:4500000, r:32, neutral:true,  kill:2.5, desc:"Arrasa un radio de 32; difícil de derribar."},
};
// Investigación: lo que está aquí no se puede construir/lanzar hasta investigarlo (puntos de investigación = cost).
// Cada universidad terminada aporta 1 punto/s por nivel, así que con N universidades tardas N veces menos.
const RESEARCH: any = {
  mint:      {n:"Acuñación",           e:"{{mint}}",       cost:100,  desc:"Permite construir Casas de la moneda."},
  tradehouse:{n:"Comercio exterior",   e:"{{tradehouse}}", cost:100,  desc:"Permite construir Casas de comercio."},
  sam:       {n:"Defensa antiaérea",   e:"{{sam}}",        cost:200,  desc:"Permite construir Antiaéreas."},
  airport:   {n:"Aviación",            e:"{{airport}}",    cost:300,  desc:"Permite construir Aeropuertos, aviones comerciales y de guerra."},
  silo:      {n:"Misiles",             e:"{{silo}}",       cost:300,  desc:"Permite construir Silos y lanzar misiles."},
  atom:      {n:"Fisión nuclear",      e:"{{atom}}",       cost:600,  req:"silo", desc:"Permite lanzar la bomba atómica."},
  hydro:     {n:"Fusión nuclear",      e:"{{hydro}}",      cost:1200, req:"atom", desc:"Permite lanzar la bomba H."},
};
const RP_PER_SEC = 1; // puntos por segundo y por nivel de universidad terminada

// Posturas de combate: cambian la velocidad de avance, las bajas al atacar y lo difícil que eres de conquistar
const STANCE = {
  bal:{n:"Equilibrada", e:"{{stance_bal}}", key:"j", att:1,   cost:1,   def:1,   desc:"Sin bonos ni penalizaciones."},
  agg:{n:"Ofensiva",    e:"{{stance_agg}}", key:"k", att:1.6, cost:1.3, def:0.8, desc:"Tus ataques avanzan un 60% más rápido pero cuestan un 30% más de tropas, y eres un 20% más fácil de conquistar."},
  def:{n:"Defensiva",   e:"{{stance_def}}", key:"l", att:0.6, cost:1,   def:1.4, desc:"Tus ataques avanzan un 40% más despacio, pero eres un 40% más difícil de conquistar."},
};
const RECRUIT_TROOPS=20000, RECRUIT_COST=30000, RECRUIT_CD=250, REINF_CD=600;
// Economía: rendimientos decrecientes (cada edificio extra del mismo tipo rinde menos), oro base más bajo y comida para las tropas
const DIM_K=0.35, ECON_GOLD=2.5;   // oro/s por nivel de aserradero/granja/metalúrgica = ECON_GOLD * GOLD_X (100)
const FOOD_BASE=1.5, FOOD_DIV=2000, HUNGER_GROW=0.25; // las tropas comen (tropas/POP_X)/FOOD_DIV comida por segundo; con hambre crecen un 75% más despacio
const RECRUIT_FOOD=60, RECRUIT_IRON=20; // materiales por nivel de cuartel al reclutar
const MKT_R=20, MKT_MAX=4, MINT_R=20, MINT_MAX=5, TRADE_MAX=5;
const ST_LINK=40, ST_COV=14, BUILD_TIME=80, FORT_R=14, SAM_R=40, SAM_CD=150, NAP_TIME=3000, ALLY_TIME=6000, IMMUNE_TIME=450, BETRAY_TIME=300, SAM_HIT=0.75, SAM_HIT_H=0.4, ANNEX_MAX=400;
// Velocidad de avance de un ataque según el terreno de la casilla que se conquista (1 = normal)
const TER_SPEED=[1,1,0.9,0.7,1,0.85];

function nbs(i,out){ const x=i%W; out[0]= x===0 ? i+W-1 : i-1; out[1]= x===W-1 ? i-W+1 : i+1; out[2]= i>=W ? i-W : -1; out[3]= i<N-W ? i+W : -1; return out; }
const NB=[0,0,0,0], NB2=[0,0,0,0];
function wdx(a,b){ let d=Math.abs(a-b); return d>W/2? W-d : d; }
function disk(cx,cy,r,fn){ for(let dy=-r;dy<=r;dy++){ const y=cy+dy; if(y<0||y>=H) continue; const w=Math.floor(Math.sqrt(r*r-dy*dy));
  for(let dx=-w;dx<=w;dx++) fn(y*W+((cx+dx)%W+W)%W); } }

// Casillas cuyo color debe repintarse (las consume el cliente; el servidor puede ignorarlas)
const dirty = new Uint8Array(N); let dirtyList: number[]=[];
function markDirty(i){ if(!dirty[i]){ dirty[i]=1; dirtyList.push(i);} }
