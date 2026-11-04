// ================= Bucle =================
function stepEconomy(){
  for(const p of players){ if(!p.alive) continue; const st=stats(p);
    p.troops=Math.min(st.max*1.05, p.troops+st.grow/10); p.gold+=st.inc/10*(p.isBot?diff:1); }
}
function stepDiplomacy(){
  if(tick%10) return;
  for(const [k,r] of rels){ const a=(k/1024)|0, b=k%1024;
    if(r.nap && r.nap<=tick){ r.nap=0; if(a===me.id||b===me.id) Hooks.log(`{{nap}} El pacto de no agresión con ${players[a===me.id?b:a].name} ha expirado.`); }
    if(r.trade){ addOp(a,b,0.15); addOp(b,a,0.15); } }
}
function gameTick(){
  if(!started || !spawned || paused || (over && !spectating)) return;
  tick++;
  stepEconomy(); stepAttacks(); stepBoats(); stepMissiles(); stepTrade(); stepNavy(); stepAir(); stepTax(); stepMaterials(); stepFallout(); stepDiplomacy();
  for(const p of players){ if(p.isBot && p.alive && (tick+p.thinkAt)%10===0) botThink(p); }
  Hooks.tick(tick);
  if(!over && me.alive && me.tiles>=landTotal*0.6){ Hooks.end(true); }
}

