// ================= Guardar y cargar partida =================
// saveGame() devuelve un objeto JSON-serializable con todo el estado vivo (mapa, reinos, edificios, ejércitos,
// diplomacia, comercio, aviones, barcos...). loadGame() lo restaura sobre un mundo ya generado (setupWorld).
// El campo version permite detectar partidas de otra versión del juego.
const SAVE_VERSION=4;
function rleEncode(a:ArrayLike<number>): number[]{
  const out:number[]=[]; let v=a[0], c=1;
  for(let i=1;i<a.length;i++){ if(a[i]===v) c++; else { out.push(v,c); v=a[i]; c=1; } }
  out.push(v,c); return out;
}
function rleDecode(pairs:number[], into:any){ let pos=0; for(let k=0;k<pairs.length;k+=2){ into.fill(pairs[k],pos,pos+pairs[k+1]); pos+=pairs[k+1]; } }
function saveGame(): any{
  const fo:number[]=[], wl:number[]=[];
  for(let i=0;i<N;i++){ if(fallout[i]>tick) fo.push(i,fallout[i]); if(wall[i]) wl.push(i); }
  return {
    game:"hegemonia", version:SAVE_VERSION, map:MAPID, W, H, tick, diff, meId:me.id, over, spectating, P,
    players: players.map((p:any)=>{ const {cnt,B,net,netAt,...rest}=p; return rest; }),
    owner: rleEncode(owner), fallout: fo, wall: wl,
    buildings: buildings.filter((b:any)=>!b.dead).map((b:any)=>({t:b.t,i:b.i,owner:b.owner,done:isFinite(b.done)?b.done:null,cd:b.cd,lvl:b.lvl||1,need:b.need||null,stock:b.stock||0,store:b.store||null})),
    attacks: attacks.map((a:any)=>({att:a.att,def:a.def,troops:a.troops,q:a.q.slice(0,5000)})),
    boats: boats.map((b:any)=>({...b})), missiles: missiles.map((m:any)=>({...m})), falloutQ: falloutQ.map((f:any)=>({...f})),
    rels: [...rels.entries()], opin: Array.from(opin as Float32Array,(v:number)=>Math.round(v*10)/10),
    tships: tships.map((s:any)=>({...s})), wships: wships.map((w:any)=>({...w,target:null})),
    planes: planes.map((s:any)=>({...s})), wplanes: wplanes.map((w:any)=>({...w,target:null})),
    tradeCd: [...tradeCd.entries()], airCd: [...airCd.entries()],
  };
}
// Devuelve null si todo fue bien, o un mensaje de error en español.
function loadGame(d:any): string|null{
  if(!d || d.game!=="hegemonia") return "Ese archivo no es una partida de Hegemonía.";
  if(d.version!==SAVE_VERSION) return `Es una partida de otra versión (${d.version}); este juego usa la ${SAVE_VERSION}.`;
  if((d.map||"tierra")!==MAPID || d.W!==W || d.H!==H) return "La partida es de otro mapa ("+mapInfo(d.map||"tierra").name+"): elige ese mapa antes de cargarla.";
  try{
    owner.fill(-1); bldAt.fill(-1); tileIdx.fill(-1); wall.fill(0); fallout.fill(0); dirty.fill(0); dirtyList=[];
    rleDecode(d.owner,owner);
    for(let k=0;k<d.fallout.length;k+=2) fallout[d.fallout[k]]=d.fallout[k+1];
    for(const i of d.wall) wall[i]=1;
    tick=d.tick; diff=d.diff; over=d.over; spectating=d.spectating; P=d.P;
    players=[]; tilesOf=[];
    for(const q of d.players){
      if(!q.gear) q.gear={tank:0,arty:0};
      players.push({...q, tiles:0, sumX:0, sumY:0,
        cnt:Object.fromEntries(Object.keys(BT).map(k=>[k,0])), B:Object.fromEntries(Object.keys(BT).map(k=>[k,[]]))});
      tilesOf.push([]);
    }
    for(let i=0;i<N;i++){ const o=owner[i]; if(o<0) continue;
      tileIdx[i]=tilesOf[o].length; tilesOf[o].push(i); const p=players[o]; p.tiles++; p.sumX+=i%W; p.sumY+=(i/W)|0; }
    buildings=[];
    for(const b of d.buildings){ const nb:any={...b,done:b.done===null?Infinity:b.done,x:b.i%W,y:(b.i/W)|0,dead:false}; if(!nb.need) delete nb.need; if(!nb.store) delete nb.store; bldAt[b.i]=buildings.length; buildings.push(nb);
      const p=players[nb.owner]; p.cnt[nb.t]++; if(p.B[nb.t]) p.B[nb.t].push(nb); }
    attacks=d.attacks; boats=d.boats; missiles=d.missiles; blasts=[]; falloutQ=d.falloutQ;
    rels.clear(); for(const [k,r] of d.rels) rels.set(k,r);
    opin=Float32Array.from(d.opin);
    tships=d.tships; wships=d.wships; planes=d.planes; wplanes=d.wplanes;
    tradeCd.clear(); for(const [k,v] of d.tradeCd) tradeCd.set(k,v);
    airCd.clear(); for(const [k,v] of d.airCd) airCd.set(k,v);
    seaCache.clear();
    landTotal=0; for(let i=0;i<N;i++) if(terrain[i]) landTotal++;
    me=players[d.meId]; started=true; spawned=true; paused=false;
    return null;
  }catch(e:any){ return "El archivo está dañado: "+e.message; }
}
