// Creación del mundo y de la partida (sin DOM): la usan el navegador y cualquier servidor Node.
// setupWorld(mapId) genera el mapa (ver MAPDATA.maps) y deja el mundo vacío; newGame() coloca a los reinos.
function setupWorld(mapId?: string){
  const id=mapId || "tierra";
  if(MAPDEF && MAPID===id && !started && !players.length) return; // ya está generado y sin usar
  selectMap(id);
}
// Distancia mínima entre reinos iniciales: crece con la tierra libre por reino (en la Tierra normal con 45 reinos ≈ 60 casillas)
function spawnDist(nb: number){ return Math.max(18,Math.min(80*Math.max(1,TS),Math.sqrt(landTotal/Math.max(1,nb))*0.62)); }
function newGame(name: string, nb: number, difficulty: number){
  diff=difficulty;
  me=newPlayer(name.trim().slice(0,18)||"Mi reino",[58,160,255],false);
  const minD=spawnDist(nb), minD2=minD*minD;
  const used=new Set<string>(), spots: number[][]=[];
  for(let k=0;k<nb;k++){
    const c=hsl((k*137.508+20)%360, 55+rnd()*20, 46+rnd()*12);
    if(c[2]>c[0]+40 && c[2]>c[1]+20) c[0]=Math.min(255,c[0]+80);
    const p=newPlayer(makeName(used),c,true);
    for(let tries=0;tries<800;tries++){ const i=(rnd()*N)|0; if(!terrain[i]||owner[i]>=0||terrain[i]===5) continue;
      const x=i%W,y=(i/W)|0; if(spots.some(s=>wdx(s[0],x)**2+(s[1]-y)**2<minD2*(tries<700?1:0.4)) && tries<780) continue;
      spots.push([x,y]); spawnAt(p,x,y,5); break; }
  }
  P=players.length; opin=new Float32Array(P*P);
  started=true;
}

// Partida multijugador: los humanos ocupan los identificadores 0..h-1 (el servidor asigna el hueco) y luego van los bots.
// Todo sale de la semilla (rngFn ya sembrado en netBegin), así que todos los clientes crean exactamente el mismo mundo.
const NET_COLORS=[[58,160,255],[255,92,92],[96,214,120],[255,200,60],[190,110,255],[255,140,40],[60,220,220],[240,120,200]];
function newGameNet(humans: string[], nb: number, difficulty: number, you: number){
  diff=difficulty;
  const used=new Set<string>(), spots: number[][]=[];
  const place=(p: any, minDist: number, r: number)=>{
    for(let tries=0;tries<3000;tries++){ const i=(rnd()*N)|0; if(!terrain[i]||owner[i]>=0||terrain[i]===5) continue;
      const x=i%W,y=(i/W)|0; if(spots.some(s=>wdx(s[0],x)**2+(s[1]-y)**2<minDist*minDist) && tries<2900) continue;
      spots.push([x,y]); spawnAt(p,x,y,r); return; }
  };
  humans.forEach((name,k)=>{ const nm=(name||"Jugador "+(k+1)).trim().slice(0,18)||"Jugador "+(k+1); used.add(nm);
    const p=newPlayer(nm,NET_COLORS[k%NET_COLORS.length].slice(),false); place(p,Math.min(150*Math.max(1,TS),spawnDist(nb+humans.length)*2.5),7); });
  for(let k=0;k<nb;k++){
    const c=hsl((k*137.508+20)%360, 55+rnd()*20, 46+rnd()*12);
    if(c[2]>c[0]+40 && c[2]>c[1]+20) c[0]=Math.min(255,c[0]+80);
    const p=newPlayer(makeName(used),c,true); place(p,spawnDist(nb),5);
  }
  me=players[you]; P=players.length; opin=new Float32Array(P*P);
  started=true;
}
