// Script de un solo uso: las vías (estaciones) solo cuestan oro; las minas producen minerales y empleo (más impuestos y
// felicidad) en lugar de oro; el oro de producción lo dan aserraderos y granjas.
import fs from "node:fs";
const E = (p, f) => fs.writeFileSync(p, f(fs.readFileSync(p, "utf8")));
const rep = (s, a, b) => { if (!s.includes(a)) throw new Error("falta: " + a.slice(0, 90)); return s.replace(a, b); };

E("src/sim/material.ts", s => rep(s, "  station:{madera:20}, airport:", "  airport:"));

E("src/sim/state.ts", s => {
  s = rep(s, 'desc:"+4 oro/s (el doble en montaña)"', 'desc:"Produce minerales (hierro en montaña, piedra en el resto) y da trabajo: más impuestos y más felicidad"');
  s = rep(s, 'desc:"Produce madera (solo en bosque)"', 'desc:"Produce madera y da oro (solo en bosque)"');
  return rep(s, 'desc:"Produce comida (solo en llanura)"', 'desc:"Produce comida y da oro (solo en llanura)"');
});

E("src/sim/players.ts", s => {
  s = rep(s, "let cities=0, mines=0;", "let cities=0, mines=0, econ=0;");
  s = rep(s, 'else if(b.t==="mine") mines += (terrain[b.i]===3?2:1)*(b.lvl||1);', 'else if(b.t==="mine") mines += (terrain[b.i]===3?2:1)*(b.lvl||1); else if(b.t==="sawmill"||b.t==="farm") econ+=b.lvl||1;');
  return rep(s, "const taxInc = p.tiles*p.tax*0.01;\n  const inc = ((1 + p.tiles*0.004 + (mines+net.mines*0.5)*4) * (1+0.12*tr) * GOLD_X + taxInc) * unrest(p);",
    "const jobs = 1 + 0.25*(mines+net.mines*0.5); // las minas dan empleo: más población que paga impuestos\n  const taxInc = p.tiles*p.tax*0.01*jobs;\n  const inc = ((1 + p.tiles*0.004 + econ*4) * (1+0.12*tr) * GOLD_X + taxInc) * unrest(p);");
});

E("src/sim/tax.ts", s => rep(s, "+ Math.min(10,p.cnt.city*1.5) -", "+ Math.min(10,p.cnt.city*1.5) + Math.min(8,p.cnt.mine*1.2) -"));

E("src/sim/upgrade.ts", s => {
  s = rep(s, 'mine:"más oro por nivel (el doble de efecto en montaña)",', 'mine:"más minerales y más empleo (impuestos y felicidad) por nivel",\n  sawmill:"más oro y más madera por nivel",\n  farm:"más oro y más comida por nivel",\n  bank:"guarda más material",');
  return s;
});

E("src/sim/ai.ts", s => rep(s, '  else if(p.gold>bCost(p,"port") && p.cnt.port===0',
  '  else if(p.gold>bCost(p,"sawmill") && p.cnt.sawmill<p.tiles/5000) tryPlace("sawmill");\n  else if(p.gold>bCost(p,"farm") && p.cnt.farm<p.tiles/5000) tryPlace("farm");\n  else if(p.gold>bCost(p,"port") && p.cnt.port===0'));
console.log("parche de economía aplicado");
