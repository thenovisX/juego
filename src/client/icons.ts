// @ts-nocheck  (cliente: DOM sin tipar de momento)
// Iconos del juego: en el código los iconos se escriben como {{id}} (p. ej. {{city}}) y aquí se convierten en imágenes
// de assets/icons/<id>.svg. En el DOM se sustituyen en cuanto aparecen (vigilando el árbol); en el canvas se dibujan con drawImage.
const ICON_IMG = {};
function icoHTML(id){ return `<img class="ico" src="assets/icons/${id}.svg" alt="">`; }
function iconize(s){ return String(s).replace(/\{\{(\w+)\}\}/g,(_m,id)=>icoHTML(id)); }
function iconizeText(t){
  if(!t.parentNode) return;
  const tpl=document.createElement("template");
  tpl.innerHTML=iconize(t.data.replace(/&/g,"&amp;").replace(/</g,"&lt;"));
  t.parentNode.replaceChild(tpl.content,t);
}
function iconizeDom(root){
  if(root.nodeType===3){ if(root.data.includes("{{")) iconizeText(root); return; }
  const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT), todo=[];
  for(let n=walk.nextNode(); n; n=walk.nextNode()) if(n.data.includes("{{")) todo.push(n);
  for(const t of todo) iconizeText(t);
}
function startIcons(){
  iconizeDom(document.body);
  new MutationObserver(recs=>{
    for(const r of recs){
      if(r.type==="characterData"){ iconizeDom(r.target); continue; }
      for(const n of r.addedNodes) if(n.isConnected) iconizeDom(n);
    }
  }).observe(document.body,{childList:true,subtree:true,characterData:true});
}
function drawIcon(ctx, tok, x, y){
  const id=tok.replace(/\{\{|\}\}/g,""), m=/([\d.]+)px/.exec(ctx.font), px=m?parseFloat(m[1]):16;
  let im=ICON_IMG[id]; if(!im){ im=new Image(); im.src=`assets/icons/${id}.svg`; ICON_IMG[id]=im; }
  if(im.complete && im.naturalWidth) ctx.drawImage(im,x-px/2,y-px/2,px,px);
}
