// Creación del mundo y de la partida (sin DOM): la usan el navegador y cualquier servidor Node.
function setupWorld(){
  decodeMask(); genTerrain();
  landTotal=0; for(let i=0;i<N;i++) if(terrain[i]) landTotal++;
}
function newGame(name: string, nb: number, difficulty: number){
  diff=difficulty;
  me=newPlayer(name.trim().slice(0,18)||"Mi reino",[58,160,255],false);
  const used=new Set<string>(), spots: number[][]=[];
  for(let k=0;k<nb;k++){
    const c=hsl((k*137.508+20)%360, 55+Math.random()*20, 46+Math.random()*12);
    if(c[2]>c[0]+40 && c[2]>c[1]+20) c[0]=Math.min(255,c[0]+80);
    const p=newPlayer(makeName(used),c,true);
    for(let tries=0;tries<400;tries++){ const i=(Math.random()*N)|0; if(!terrain[i]||owner[i]>=0||terrain[i]===5) continue;
      const x=i%W,y=(i/W)|0; if(spots.some(s=>wdx(s[0],x)**2+(s[1]-y)**2<60*60) && tries<380) continue;
      spots.push([x,y]); spawnAt(p,x,y,5); break; }
  }
  P=players.length; opin=new Float32Array(P*P);
  started=true;
}
