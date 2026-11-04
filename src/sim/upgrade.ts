// ================= Mejoras de edificios (nivel 1 a 3) =================
// Cualquier edificio propio se puede mejorar hasta el nivel 3. Cada nivel cuesta el doble que el anterior
// y cambia su efecto (ver UP_DESC). Los efectos se aplican en el cálculo de cada sistema, no copiando datos.
const MAX_LVL=3;
const UP_DESC={
  city:"+2000 tropas máximas y crecen más rápido por nivel",
  mine:"más minerales y más empleo (impuestos y felicidad) por nivel",
  sawmill:"más oro y más madera por nivel",
  foundry:"más oro y más hierro por nivel",
  farm:"más oro y más comida por nivel",
  bank:"guarda más material",
  fort:"más defensa por nivel",
  sam:"más alcance y recarga más corta",
  port:"los cargamentos por mar pagan más",
  silo:"los misiles llegan más rápido",
  station:"la red cubre más radio",
  airport:"los aviones comerciales pagan más",
};
function upCost(b:any){ return Math.round(BT[b.t].base*2*Math.pow(2,b.lvl-1)); }
function maxLvl(list:any[]){ return Math.max(1,...list.map((b:any)=>b.lvl||1)); }
function upgradeBuilding(p:any,b:any): string|null{
  if(b.dead||b.owner!==p.id) return "Ese edificio ya no es tuyo.";
  if(b.done>tick) return "Espera a que termine la obra.";
  if(b.lvl>=MAX_LVL) return "Ya está al nivel máximo.";
  const c=upCost(b);
  if(p.gold<c) return `Te faltan ${fmt(c-p.gold)} de oro.`;
  p.gold-=c; b.lvl++; return null;
}
