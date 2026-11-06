// ================= Comercio marítimo =================
// Con un acuerdo comercial y puertos en ambos reinos se envían cargueros que exportan materiales:
// el exportador cobra el valor completo y el receptor un 40%. Las estaciones conectadas a un puerto lo aumentan.
// Los cargueros navegan solo por agua (BFS sobre el mar, con caché por pareja de puertos) y dejan una estela.
let tships=[];
const TSHIP_SPEED=0.4, TRADE_CD=200, tradeCd=new Map(), seaCache=new Map();
const readyPorts=p=>p.B.port.filter(b=>b.done<=tick);
function tradeValue(p){ const st=stats(p);
  return Math.round((40 + st.mines*25 + st.cities*12 + st.net.mines*10) * (st.net.ports>0?1.5:1)*(1+0.3*(maxLvl(p.B.port)-1))) * GOLD_X; }
function waterNear(i,out){ out.length=0; nbs(i,NB2); for(const j of NB2) if(j>=0 && !terrain[j]) out.push(j); return out; }
// ¿Está libre de tierra el tramo horizontal o vertical entre dos casillas? (coordenadas enteras, x puede salirse del mundo)
function axisClear(x0:number,y0:number,x1:number,y1:number): boolean{
  const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0)), sx=Math.sign(x1-x0), sy=Math.sign(y1-y0);
  for(let k=0;k<=n;k++){ if(!isWater(x0+sx*k+0.5,y0+sy*k+0.5)) return false; } return true;
}
// Camino más corto de casillas de mar (BFS) -> pocos tramos horizontales/verticales que giran siempre 90° y no cruzan tierra.
// Cada tramo en L une dos casillas del camino y mide lo mismo que él (sigue siendo el más corto), solo con menos giros.
function straighten(tiles:number[]): number[][]{
  const n=tiles.length, X=new Array(n), Y=new Array(n); X[0]=tiles[0]%W; Y[0]=(tiles[0]/W)|0;
  for(let k=1;k<n;k++){ let d=wrapDx(tiles[k]%W-tiles[k-1]%W); X[k]=X[k-1]+d; Y[k]=(tiles[k]/W)|0; }
  const pt=(x:number,y:number)=>[((x%W)+W)%W+0.5,y+0.5], out=[pt(X[0],Y[0])]; let a=0;
  while(a<n-1){ let done=false;
    for(let j=Math.min(n-1,a+200);j>a&&!done;j--){ const dx=X[j]-X[a], dy=Y[j]-Y[a]; if(Math.abs(dx)+Math.abs(dy)!==j-a) continue;
      if(dx===0||dy===0){ if(!axisClear(X[a],Y[a],X[j],Y[j])) continue; }
      else if(axisClear(X[a],Y[a],X[j],Y[a]) && axisClear(X[j],Y[a],X[j],Y[j])) out.push(pt(X[j],Y[a]));
      else if(axisClear(X[a],Y[a],X[a],Y[j]) && axisClear(X[a],Y[j],X[j],Y[j])) out.push(pt(X[a],Y[j]));
      else continue;
      out.push(pt(X[j],Y[j])); a=j; done=true; }
    if(!done){ a++; out.push(pt(X[a],Y[a])); } }
  return out;
}
// Avanza un barco por su ruta (lista de puntos); o[idx] es el índice del siguiente punto.
function moveAlong(o:any,path:number[][],idx:string,speed:number){
  let rem=speed;
  while(rem>0 && o[idx]<path.length){ const [tx,ty]=path[o[idx]]; let dx=wrapDx(tx-o.x); const dy=ty-o.y, d=Math.hypot(dx,dy);
    if(d<=rem){ o.x=tx; o.y=ty; rem-=d; o[idx]++; } else { o.x=((o.x+dx/d*rem)%W+W)%W; o.y+=dy/d*rem; rem=0; } }
}
// Ruta marítima entre dos puertos como lista de puntos [x,y]; null si no hay mar conectado.
// Búferes reutilizados entre búsquedas: "seaSeen" guarda una marca de búsqueda para no limpiar arrays enteros.
let seaPar: Int32Array, seaQ: Int32Array, seaSeen: Uint32Array; let seaGen=0;
// Mapa acuático de los barcos (los soldados usan el terrestre): mar abierto = agua sin ninguna tierra en las 8 casillas vecinas.
// Los barcos prefieren el mar abierto y solo se acercan a la costa junto a sus puertos/destinos o por un estrecho.
let deepMask: Uint8Array|null=null;
// Los búferes del mar se crean al primer uso (en mapas grandes ocupan decenas de MB) y se descartan al cambiar de mapa.
function resetSeaBuffers(){ seaPar=seaQ=null as any; seaSeen=null as any; seaGen=0; deepMask=null; seaCache.clear(); }
function seaBuffers(){ if(!seaPar){ seaPar=new Int32Array(N); seaQ=new Int32Array(N); seaSeen=new Uint32Array(N); } }
function deepSea(): Uint8Array{
  if(deepMask) return deepMask; const d=new Uint8Array(N);
  for(let y=1;y<H-1;y++) for(let x=0;x<W;x++){ const i=y*W+x; if(terrain[i]) continue; const l=x===0?(WRAP?i+W-1:i):i-1, r=x===W-1?(WRAP?i-W+1:i):i+1;
    if(!terrain[l]&&!terrain[r]&&!terrain[i-W]&&!terrain[i+W]&&!terrain[l-W]&&!terrain[l+W]&&!terrain[r-W]&&!terrain[r+W]) d[i]=1; }
  return deepMask=d;
}
// BFS por el mar (camino más corto en casillas) desde cualquiera de "starts" hasta cualquiera de "goals". Primero solo por mar abierto
// (más allá de 3 casillas de los extremos); si no hay camino, por cualquier agua. Devuelve la lista de casillas o null.
function seaTiles(starts:number[],goals:number[]): number[]|null{
  if(!starts.length||!goals.length) return null; seaBuffers();
  const gs=new Set(goals), deep=deepSea(), anchors=starts.slice(0,4).concat(goals.slice(0,4)), nb=[0,0,0,0];
  const near=(j:number)=>{ const x=j%W, y=(j/W)|0; for(const a of anchors){ if(wdx(x,a%W)<=3 && Math.abs(y-((a/W)|0))<=3) return true; } return false; };
  for(const useDeep of [true,false]){
    const gen=++seaGen, par=seaPar, q=seaQ; let h=0,t=0,end=-1;
    for(const s of starts){ seaSeen[s]=gen; par[s]=-1; q[t++]=s; }
    while(h<t){ const c=q[h++]; if(gs.has(c)){ end=c; break; } nbs(c,nb);
      for(let k=0;k<4;k++){ const j=nb[k]; if(j>=0 && !terrain[j] && seaSeen[j]!==gen && (!useDeep||deep[j]||near(j))){ seaSeen[j]=gen; par[j]=c; q[t++]=j; } } }
    if(end>=0){ const tiles=[]; for(let c=end;c>=0;c=par[c]) tiles.push(c); tiles.reverse(); return tiles; }
  }
  return null;
}
function seaPath(pa,pb){
  const key=pa.i*N+pb.i; if(seaCache.has(key)) return seaCache.get(key);
  const tiles=seaTiles(waterNear(pa.i,[]),waterNear(pb.i,[]));
  const path=tiles?[[pa.x+0.5,pa.y+0.5],...straighten(tiles),[pb.x+0.5,pb.y+0.5]]:null;
  seaCache.set(key,path); return path;
}
function tradeCheck(a,b){
  const A=players[a], B=players[b], r=peek(a,b);
  if(!r||!r.trade) return "Necesitas un acuerdo comercial.";
  if(!readyPorts(A).length) return "Necesitas un puerto terminado.";
  if(!readyPorts(B).length) return `${B.name} no tiene puerto.`;
  if((tradeCd.get(a*1024+b)||0)>tick) return "Tu último cargamento aún está en ruta.";
  if(tships.filter(s=>s.from===a).length>=6) return "Demasiados cargueros en el mar.";
  return null;
}
function sendTrade(a,b){
  const why=tradeCheck(a,b); if(why) return why;
  const pa=readyPorts(players[a]), pb=readyPorts(players[b]), pairs=[];
  for(const x of pa) for(const y of pb) pairs.push([x,y,Math.hypot(wdx(x.x,y.x),x.y-y.y)]);
  pairs.sort((u,v)=>u[2]-v[2]);
  for(const [x,y] of pairs.slice(0,4)){ const path=seaPath(x,y); if(!path) continue;
    tships.push({from:a,to:b,x:path[0][0],y:path[0][1],path,pi:1,trail:[[path[0][0],path[0][1]]],val:tradeValue(players[a])});
    tradeCd.set(a*1024+b,tick+TRADE_CD); return null; }
  tradeCd.set(a*1024+b,tick+TRADE_CD);
  return "No hay ruta marítima entre vuestros puertos.";
}
function stepTrade(){
  for(const s of tships){
    if(s.done) continue;
    moveAlong(s,s.path,"pi",TSHIP_SPEED);
    s.trail.push([s.x,s.y]);
    if(s.pi>=s.path.length){ s.done=true; const A=players[s.from], B=players[s.to];
      if(A.alive){ A.gold+=s.val; A.st.trade=(A.st.trade||0)+s.val; }
      if(B.alive) B.gold+=s.val*0.4;
      addOp(s.from,s.to,1); addOp(s.to,s.from,1);
      if(s.from===me.id) Hooks.log(`{{cargo}} Tu cargamento llegó a ${B.name}: +${fmt(s.val)} de oro.`,"good");
      else if(s.to===me.id) Hooks.log(`{{cargo}} ${A.name} te ha enviado mercancías: +${fmt(s.val*0.4)} de oro.`,"good"); }
  }
  for(const s of tships) if(!players[s.from].alive||!players[s.to].alive) s.done=true;
  tships=tships.filter(s=>!s.done);
  if(tick%100===0) for(const [k,r] of rels){ if(!r.trade) continue; const a=(k/1024)|0, b=k%1024;
    if(!players[a].alive||!players[b].alive) continue;
    if(players[a].isBot) sendTrade(a,b); if(players[b].isBot) sendTrade(b,a); }
}
