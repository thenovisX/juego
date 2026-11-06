// Genera assets/icons/*.svg: iconos planos y básicos dibujados en código (sin imágenes de IA).
// Estilo común: lienzo 32x32, contorno oscuro de 1.7, rellenos planos sin degradados.
// Uso: node tools/gen-icons.mjs
import fs from "node:fs";
const K="#1f2b36", GOLD="#f2c14e", GOLD2="#c8932a", RED="#d9534f", RED2="#a63a37", BLUE="#4a8fd6", BLUE2="#2f64a3", GRN="#5aa469", GRN2="#3a7a4a",
  BRN="#9a6a3e", BRN2="#6e4a2a", GRY="#aab3ba", GRY2="#6f7b85", WHT="#f4f1e8", STN="#c4bdae", SND="#e8d18f", ICE="#cfe8f3", ORG="#e98b3a", YEL="#f7dc5e";
const r=(x,y,w,h,f,rx=0)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}"/>`;
const p=(d,f)=>`<path d="${d}" fill="${f}"/>`;
const c=(x,y,R,f)=>`<circle cx="${x}" cy="${y}" r="${R}" fill="${f}"/>`;
const e=(x,y,rx,ry,f)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}"/>`;
const l=(d,w=1.7,s=K)=>`<path d="${d}" fill="none" stroke="${s}" stroke-width="${w}"/>`;
const pl=(pts,f)=>`<polygon points="${pts}" fill="${f}"/>`;
const win=(x,y)=>`<rect x="${x}" y="${y}" width="2.4" height="2.4" fill="${YEL}" stroke="none"/>`;
const face=(f,mouth,brows="")=>c(16,16,12.5,f)+c(11.5,13.5,1.5,K)+c(20.5,13.5,1.5,K)+mouth+brows;
const rocket=(col)=>`<g transform="rotate(45 16 16)">${p("M16 2 C20 7 20 14 19.5 22 L12.5 22 C12 14 12 7 16 2Z",WHT)}${p("M16 2 C18 4 19 6 19.3 8 L12.7 8 C13 6 14 4 16 2Z",col)}${c(16,13,2,BLUE)}${p("M12.5 18 L8 25 L12.5 23Z",col)}${p("M19.5 18 L24 25 L19.5 23Z",col)}${p("M13.5 22 L16 29 L18.5 22Z",ORG)}</g>`;
const bomb=(col,badge)=>`<g transform="rotate(-30 16 16)">${e(16,17,8,12,col)}${r(13,2,6,5,GRY2)}${p("M8.5 8 L3 4 L5 14Z",GRY2)}${p("M23.5 8 L29 4 L27 14Z",GRY2)}</g>${badge}`;
const ship=(hull,deck)=>`${p("M3 20 H29 L25 27 H7Z",hull)}${deck}`;
const tree=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})">${r(-1.4,10,2.8,5,BRN)}${p("M0 -2 L7 10 L-7 10Z",GRN)}${p("M0 -9 L5.5 3 L-5.5 3Z",GRN2)}</g>`;
const sword=(rot,col)=>`<g transform="rotate(${rot} 16 16)">${p("M16 2 L18.2 6 L18.2 21 L13.8 21 L13.8 6Z",GRY)}${r(10.5,21,11,2.8,col,1)}${r(14.6,23.8,2.8,5,BRN2)}${c(16,29.6,1.8,col)}</g>`;
const star=(n,R,r2)=>{const a=[];for(let i=0;i<n*2;i++){const q=i%2?r2:R,t=Math.PI*i/n-Math.PI/2;a.push((16+q*Math.cos(t)).toFixed(1)+","+(16+q*Math.sin(t)).toFixed(1));}return a.join(" ");};
const tref=(bg)=>c(16,16,13,bg)+[0,120,240].map(a=>`<path d="M16 16 L${(16+9*Math.sin((a-30)*Math.PI/180)).toFixed(1)} ${(16-9*Math.cos((a-30)*Math.PI/180)).toFixed(1)} A9 9 0 0 1 ${(16+9*Math.sin((a+30)*Math.PI/180)).toFixed(1)} ${(16-9*Math.cos((a+30)*Math.PI/180)).toFixed(1)}Z" fill="${K}"/>`).join("")+c(16,16,2.2,bg);
const cols=(x0,n,gap,y0,h,f)=>Array.from({length:n},(_,i)=>r(x0+i*gap,y0,2.6,h,f)).join("");
const arrow=(d,col)=>`<path d="${d}" fill="${col}"/>`;

const I={
// ---- edificios
city: r(3,15,9,14,GRY)+r(12,6,9,23,BLUE)+r(21,13,8,16,GRY)+win(5,18)+win(8,18)+win(5,23)+win(8,23)+win(14.5,10)+win(17.5,10)+win(14.5,15)+win(17.5,15)+win(14.5,20)+win(17.5,20)+win(23,17)+win(26,17)+win(23,22)+win(26,22),
mine: p("M2 29 L2 20 Q16 2 30 20 L30 29Z",GRY2)+p("M9 29 V20 Q16 12 23 20 V29Z",K)+r(8,19,16,3,BRN)+l("M9 29V20M23 29V20",2.6,BRN)+l("M22 7 L28 3 M25 3 Q29 3 29 8",2.2,BRN2),
fort: r(3,10,7,19,STN)+r(22,10,7,19,STN)+r(9,15,14,14,STN)+p("M3 10V6H5.5V8H7V6H10V10Z",STN)+p("M22 10V6H25V8H26.5V6H29V10Z",STN)+p("M9 15V12H12V14H14.5V12H17.5V14H20V12H23V15Z",STN)+p("M13 29V22Q16 18 19 22V29Z",BRN2)+r(5.5,15,2,4,K)+r(24.5,15,2,4,K),
port: l("M16 7V27M9 14H23",2.4,GRY2)+c(16,6,3,"none").replace('fill="none"',`fill="none" stroke="${GRY2}" stroke-width="2.2"`)+l("M5 20 Q6 27 16 27 Q26 27 27 20",2.6,GRY2)+l("M5 20 L3 22.5 M5 20 L7.5 22 M27 20 L29 22.5 M27 20 L24.5 22",2.2,GRY2),
sam: r(4,25,24,4,GRY2)+r(8,21,16,5,GRY)+`<g transform="rotate(-40 16 21)">${r(12,3,8,19,GRN2,1.5)}${p("M12 3 L16 -2 L20 3Z",RED)}</g>`+c(16,23,3,GRY2),
silo: r(7,13,18,16,GRY)+e(16,13,9,3.5,GRY2)+e(16,13,6,2,K)+p("M13 13 V5 Q16 -0 19 5 V13Z",WHT)+p("M13 6.5 Q16 1 19 6.5Z",RED)+r(7,24,18,2,GRY2),
airport: r(13,12,6,17,GRY)+r(10,6,12,7,BLUE)+r(8,5,16,2.5,GRY2)+r(11.5,8.5,9,2,WHT)+r(3,27,26,3,K)+r(7,28.2,4,0.8,WHT)+r(14,28.2,4,0.8,WHT)+r(21,28.2,4,0.8,WHT),
sawmill: r(2,22,28,5,BRN)+e(4,24.5,1.8,2.5,BRNL())+c(16,13,10,GRY)+c(16,13,3,K)+`<circle cx="16" cy="13" r="11.6" fill="none" stroke="${GRY2}" stroke-width="2.6" stroke-dasharray="2.4 2.5"/>`,
farm: pl("3,14 16,4 29,14 29,29 3,29",RED)+pl("3,14 16,4 29,14 26,14 16,7 6,14",RED2)+r(10,17,12,12,WHT)+l("M10 17L22 29M22 17L10 29",1.6)+r(10,17,12,12,"none").replace('fill="none"','fill="none" stroke="'+K+'" stroke-width="1.6"'),
bank: r(3,20,12,9,BRN)+r(14,14,13,15,BRNL())+l("M3 24H15M14 21H27M14 26H27M20.5 14V29",1.2)+pl("20,8 26,13 14,13",GRY)+pl("8,14 13,19 3,19",GRY2),
station: r(3,13,26,13,BRNL())+pl("1,13 16,5 31,13",RED)+r(13,17,6,9,BRN2)+r(5,16,5,5,ICE)+r(22,16,5,5,ICE)+r(0,27,32,3,K)+r(3,27.7,26,1.2,GRY),
obra: pl("16,3 27,28 5,28",ORG)+pl("12.5,14 19.5,14 21.5,19 10.5,19",WHT)+r(3,27,26,3,K),
// ---- armas y unidades
missile: rocket(RED),
atom: bomb(GRY2,c(24,23,6.5,YEL)+`<g transform="translate(24 23) scale(0.42) translate(-16 -16)">${[0,120,240].map(a=>`<path d="M16 16 L${(16+13*Math.sin((a-30)*Math.PI/180)).toFixed(1)} ${(16-13*Math.cos((a-30)*Math.PI/180)).toFixed(1)} A13 13 0 0 1 ${(16+13*Math.sin((a+30)*Math.PI/180)).toFixed(1)} ${(16-13*Math.cos((a+30)*Math.PI/180)).toFixed(1)}Z" fill="${K}" stroke="none"/>`).join("")}</g>`),
hydro: bomb(GRN2,c(24,23,6.5,WHT)+`<text x="24" y="26.8" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="9.5" text-anchor="middle" fill="${K}" stroke="none">H</text>`),
boat: p("M16 3 L26 17 H16Z",WHT)+p("M14 6 L5 17 H14Z",STN)+l("M16 3V22",1.7)+p("M3 20 H29 L25 27 H7Z",BRN),
cargo: ship(RED2,r(5,13,6,7,BLUE)+r(11,13,6,7,YEL)+r(17,13,6,7,GRN)+r(23,10,5,10,GRY)),
wship: ship(GRY2,pl("8,20 24,20 22,14 10,14",GRY)+r(14,9,6,5,GRY)+l("M17 11H27",2.6,K)+l("M7 16H10",2.4,K)),
plane: `<g transform="rotate(45 16 16)">${p("M16 2 Q19 3 19 9 L19 12 L30 18 V21 L19 18 L19 25 L23 28 V30 L16 28.5 L9 30 V28 L13 25 V18 L2 21 V18 L13 12 V9 Q13 3 16 2Z",WHT)}</g>`,
wplane: `<g transform="rotate(45 16 16)">${p("M16 1 L19 10 L19 15 L30 24 V27 L19 23 L19 27 L22 30 L16 29 L10 30 L13 27 L13 23 L2 27 V24 L13 15 V10Z",GRY2)}${p("M16 6 Q18 10 16 14 Q14 10 16 6Z",BLUE)}</g>`,
// ---- recursos
piedra: pl("3,25 7,12 16,7 25,11 29,25",GRY)+pl("7,12 16,7 16,25 3,25",STN)+l("M16 7V25M7 12L16 17L25 11",1.2),
madera: r(3,17,26,9,BRN)+e(3,21.5,3.5,4.5,BRNL())+r(7,8,22,9,BRN)+e(7,12.5,3.5,4.5,BRNL())+l("M12 20h13M14 12h12",1.1,BRN2),
hierro: r(3,21,12,7,GRY,1.5)+r(17,21,12,7,GRY,1.5)+r(10,13,12,7,BLUE2,1.5)+l("M6 24H12M20 24H26M13 16.5H19",1.2,WHT),
comida: l("M16 29V6",2.2,BRN)+[0,1,2,3].map(i=>e(11.5,8+i*5.2,2.4,4,GOLD)+e(20.5,8+i*5.2,2.4,4,GOLD)).join("").replace(/ry="4"/g,'ry="3.4"')+e(16,4.5,2.3,3.4,GOLD),
// ---- terrenos
t0: r(2,2,28,28,BLUE,4)+l("M5 12Q8 9 11 12T17 12T23 12T27 12",1.8,"#bfe0f7")+l("M5 20Q8 17 11 20T17 20T23 20T27 20",1.8,"#bfe0f7"),
plain: r(2,2,28,28,"#a7c57a",4)+l("M9 20 L9 14M9 20 L6.5 15M9 20 L11.5 15M21 24 L21 18M21 24 L18.5 19M21 24 L23.5 19M18 11 L18 7M18 11 L16 8M18 11 L20 8",1.6,GRN2),
forest: r(2,2,28,28,"#8cbf7c",4)+tree(10,9,0.95)+tree(21,12,0.95),
mountain: r(2,2,28,28,"#b4c4cf",4)+pl("3,28 13,8 20,18 24,12 29,28",GRY2)+pl("13,8 17,15 14.5,14 13,16 11,14 9.5,15",WHT),
desert: r(2,2,28,28,SND,4)+p("M2 26 Q9 18 16 25 Q23 19 30 26 V28 Q30 30 28 30 H4 Q2 30 2 28Z","#d5b868")+l("M22 22V11M22 17Q18 17 18 13M22 15Q26 15 26 11",2.6,GRN2),
t5: r(2,2,28,28,ICE,4)+pl("16,5 25,12 22,26 10,26 7,12",WHT)+l("M16 5V26M7 12H25M10 26L16 14L22 26",1.2,BLUE),
// ---- indicadores
troops: p("M6 18 Q6 6 16 6 Q26 6 26 18Z",GRN2)+r(4,17,24,4,GRN2,1.5)+e(16,24.5,7,5.5,"#f0c9a0")+r(8,16,16,3,K)+p("M16 6 V2",K),
gold: c(16,16,13,GOLD)+c(16,16,9,"none").replace('fill="none"',`fill="none" stroke="${GOLD2}" stroke-width="1.8"`)+r(14.8,9,2.4,14,GOLD2),
land: c(16,16,13,BLUE)+p("M7 9 Q12 6 15 9 L14 14 Q10 16 8 14Z",GRN)+p("M17 16 Q23 14 26 18 Q25 24 20 25 Q17 22 17 16Z",GRN)+p("M7 20 Q10 19 12 22 L10 26 Q7 24 7 20Z",GRN),
tax: pl("16,4 29,11 3,11",GRY)+cols(6,4,5.6,13,12,WHT)+r(3,25,26,4,GRY),
f1: face(YEL,l("M9 18Q16 27 23 18Z",1.7).replace('fill="none"','fill="'+WHT+'"')),
f2: face("#f7dc5e",l("M10 19Q16 24 22 19",1.9)),
f3: face("#efe6b8",l("M10.5 21H21.5",1.9)),
f4: face("#f1a64a",l("M10.5 22Q16 18 21.5 22",1.9),l("M8.5 10L13.5 12M23.5 10L18.5 12",1.9)),
f5: face("#e5584f",l("M10 21H22",3).replace('fill="none"','fill="none"')+l("M13 19.5V22.5M16 19.5V22.5M19 19.5V22.5",1.1),l("M8 9L13.5 12.5M24 9L18.5 12.5",2.2)),
shield: p("M16 3 L27 7 V16 Q27 25 16 30 Q5 25 5 16 V7Z",BLUE)+p("M16 3 L27 7 V16 Q27 25 16 30Z",BLUE2)+l("M16 3V30",1.1,WHT),
// ---- interfaz
play: pl("9,5 27,16 9,27",GRN),
pause: r(7,5,7,22,GRY2,1.5)+r(18,5,7,22,GRY2,1.5),
speed: pl("3,6 15,16 3,26",BLUE)+pl("16,6 28,16 16,26",BLUE),
snd_on: pl("4,12 10,12 17,6 17,26 10,20 4,20",GRY)+l("M21 12Q24 16 21 20M24 8.5Q30 16 24 23.5",1.9),
snd_off: pl("4,12 10,12 17,6 17,26 10,20 4,20",GRY)+l("M21 12L29 20M29 12L21 20",2.4,RED),
save: r(4,4,24,24,BLUE2,3)+r(9,4,14,9,WHT)+r(18,5.5,3,6,K)+r(8,17,16,11,STN),
load: p("M3 8 H12 L15 11 H29 V27 H3Z",GOLD2)+p("M3 27 L7 15 H31 L27 27Z",GOLD),
board: p("M9 4 H23 V14 Q23 21 16 22 Q9 21 9 14Z",GOLD)+l("M9 7H4Q4 15 10 15M23 7H28Q28 15 22 15",1.8)+r(14.5,22,3,4,GOLD2)+r(9,26,14,3.5,GOLD2,1),
help: c(16,16,13,BLUE)+`<text x="16" y="23.5" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="20" text-anchor="middle" fill="${WHT}" stroke="none">?</text>`,
home: pl("16,4 29,16 25,16 25,28 7,28 7,16 3,16",RED)+r(13,19,6,9,BRN2),
// ---- diplomacia
ally: p("M1 12 L9 9 L14 12 L10 19 L1 17Z",BLUE)+p("M31 12 L23 9 L18 12 L22 19 L31 17Z",GRN)+p("M9 9 L16 7 L23 9 L24 16 L20 25 L15 26 L11 24 L8 17Z","#f0c9a0")+l("M12 16Q16 20 20 16M13 20Q16 23 19 20",1.4),
nap: e(15,17,10,7,WHT)+c(24,10,4.5,WHT)+p("M28 10 L31 11 L28 12Z",ORG)+p("M6 14 Q2 8 5 5 Q9 8 12 14Z",STN)+c(25.5,9,1,K)+l("M9 27Q18 29 27 21",1.6,GRN2)+e(14,27,2.5,1.5,GRN)+e(20,26,2.5,1.5,GRN)+e(25,23,2.5,1.5,GRN),
trade: p("M12 6 Q16 9 20 6 L18 11 Q27 16 26 24 Q25 29 16 29 Q7 29 6 24 Q5 16 14 11Z",BRNL())+l("M12 6Q16 9 20 6",1.7)+c(16,21,5,GOLD)+r(15.3,17.5,1.4,7,GOLD2),
attack: sword(40,GOLD2)+sword(-40,GOLD2),
traitor: p("M8 28 Q2 28 3 22 Q4 17 12 17 Q22 17 21 12 Q20 7 14 8 Q10 9 10 13 H5 Q5 3 14 3 Q27 3 27 13 Q27 23 14 23 Q10 23 11 25 Q12 28 8 28Z",GRN)+c(22,7,0.1,K)+l("M8 28H5",1)+c(21.5,8.5,1.1,YEL)+l("M27 9L31 8M27 10L31 12",1.3,RED),
gift: r(4,13,24,15,RED,1)+r(2,9,28,6,RED2,1)+r(14,9,4,19,GOLD)+p("M16 9 Q9 0 8 6 Q8 10 16 9 Q24 10 24 6 Q23 0 16 9Z",GOLD),
sos: pl("9,3 23,3 29,9 29,23 23,29 9,29 3,23 3,9",RED)+`<text x="16" y="20.5" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="10.5" text-anchor="middle" fill="${WHT}" stroke="none">SOS</text>`,
break: p("M16 28 L4 15 Q1 8 8 6 Q13 5 16 10 L13 14 L18 18 L15 22Z",RED)+p("M16 28 L28 15 Q31 8 24 6 Q20 5 17.5 9 L21 13 L16 17 L19 21Z",RED2),
pin: p("M16 30 Q5 18 5 12 A11 11 0 0 1 27 12 Q27 18 16 30Z",RED)+c(16,12,4,WHT),
ok: c(16,16,13,GRN)+l("M9 16.5L14 21.5L23.5 11",3.4,WHT),
close: c(16,16,13,RED)+l("M10 10L22 22M22 10L10 22",3.4,WHT),
// ---- alertas y eventos
alarm: r(7,23,18,5,GRY2,1)+p("M9 23 Q9 9 16 9 Q23 9 23 23Z",RED)+r(12,11,3,7,"#f1a09c")+l("M16 3V6M5 8L7.5 10.5M27 8L24.5 10.5",2),
bell: p("M16 4 Q8 5 8 15 Q8 21 5 24 H27 Q24 21 24 15 Q24 5 16 4Z",GOLD)+c(16,27,3,GOLD2)+c(16,4,1.8,GOLD2),
warn: pl("16,3 30,28 2,28",YEL)+r(14.6,11,2.8,9,K)+c(16,23.8,1.7,K),
boom: pl(star(9,15,8.5),ORG)+pl(star(9,9.5,4.5),YEL),
rad: tref(YEL),
shot: p("M13 29 V14 Q16 5 19 14 V29Z",GOLD)+p("M13 14 Q16 5 19 14Z",RED)+r(12,25,8,4,GOLD2),
dead: p("M16 3 Q5 3 5 14 Q5 19 9 22 V27 H23 V22 Q27 19 27 14 Q27 3 16 3Z",WHT)+e(11.5,14,3,3.5,K)+e(20.5,14,3,3.5,K)+pl("16,18 14.5,21 17.5,21",K)+l("M13 27V23M16 27V23M19 27V23",1.3),
eye: p("M2 16 Q16 4 30 16 Q16 28 2 16Z",WHT)+c(16,16,5.5,BLUE2)+c(16,16,2.4,K)+c(17.5,14.5,1,WHT),
medal: p("M9 2 H15 L18 12 H12Z",BLUE)+p("M23 2 H17 L14 12 H20Z",RED)+c(16,20,9,GOLD)+c(16,20,5.5,GOLD2)+pl(star(5,4,1.8).replace(/([\d.]+),([\d.]+)/g,(m,a,b)=>(+a+0)+","+(+b+4)),YEL),
crown: p("M3 11 L10 17 L16 6 L22 17 L29 11 L26 25 H6Z",GOLD)+r(6,25,20,4,GOLD2,1)+c(3,10,2,RED)+c(16,5,2,RED)+c(29,10,2,RED),
time: c(16,16,13,WHT)+l("M16 8V16L22 19",2.4),
up: pl("16,3 29,17 21,17 21,29 11,29 11,17 3,17",GRN),
riot: p("M16 3 Q22 10 21 16 Q25 13 25 19 Q25 29 16 29 Q7 29 7 19 Q7 13 11 16 Q10 9 16 3Z",ORG)+p("M16 14 Q20 19 19 22 Q19 27 16 27 Q12 27 12 22 Q12 19 16 14Z",YEL),
built: `<g transform="rotate(45 16 16)">${r(14,12,4,18,BRN)}${r(8,5,16,9,GRY,1.5)}</g>`,
pirate: r(5,3,2.6,27,BRN2)+p("M7.6 5 H29 V20 H7.6Z",K)+c(18,11.5,4,WHT)+l("M13 17L23 15M13 15L23 17",1.8,WHT)+c(16.7,11,1,K)+c(19.3,11,1,K),
refuse: c(16,16,13,RED)+l("M7 25L25 7",3.4,WHT).replace("M7 25L25 7","M8 8L24 24")+c(16,16,9,"none").replace('fill="none"','fill="none" stroke="'+WHT+'" stroke-width="3"'),
reinforce: pl("3,11 17,11 17,5 29,16 17,27 17,21 3,21",GRN),
recruit: p("M3 21 Q3 10 13 10 Q22 10 22 21Z",GRN2)+r(1,20,23,3.5,GRN2,1.5)+e(12.5,26,6,3.5,"#f0c9a0")+c(25,8,6,GOLD)+r(24,4.5,2,7,K)+r(22.5,6.8,5,2.4,K),
retreat: p("M7 6 H17 Q27 6 27 16 Q27 26 17 26 H12 V20 H17 Q21 20 21 16 Q21 12 17 12 H7 V16 L1 9 L7 2Z",ORG),
stance_agg: sword(40,RED2)+sword(-40,RED2),
stance_def: p("M16 3 L27 7 V16 Q27 25 16 30 Q5 25 5 16 V7Z",GRY)+p("M16 3 L27 7 V16 Q27 25 16 30Z",GRY2)+pl("16,10 18,15 23,15 19,18.5 20.5,23.5 16,20.5 11.5,23.5 13,18.5 9,15 14,15",GOLD),
stance_bal: l("M16 5V27M7 27H25",2.4,GRY2)+l("M5 10H27",2.2)+l("M5 10L2 19H12ZM27 10L20 19H30Z",1.5).replace('fill="none"','fill="'+GOLD+'"')+r(13.5,4,5,3,GRY2),
wall: r(3,6,26,22,"#c97f5a")+l("M3 13.5H29M3 21H29M10 6V13.5M20 6V13.5M15 13.5V21M7 21V28M23 21V28",1.4),
science: p("M12 3 H20 V12 L28 26 Q29 29 26 29 H6 Q3 29 4 26 L12 12Z",ICE)+p("M8 20 H24 L28 26 Q29 29 26 29 H6 Q3 29 4 26Z",GRN)+r(10,2,12,3,GRY,1)+c(14,24,1.4,WHT)+c(19,22,1,WHT),
university: pl("16,4 30,11 16,18 2,11",K)+p("M8 15 V21 Q16 26 24 21 V15 L16 19Z",BLUE2)+l("M27 12V22",1.6)+c(27,23,2,GOLD),
temple: pl("16,3 30,12 2,12",STN)+r(3,12,26,3,GRY)+cols(6,4,6,15,10,WHT)+r(3,25,26,4,GRY)+r(1,29,30,1.5,GRY2),
market: r(4,15,24,14,BRNL())+p("M3 7 H29 L31 15 H1Z",RED)+[0,1,2,3].map(i=>p(`M${3+i*6.5} 7 H${9.5+i*6.5} L${9.5+i*6.5 + 0.5} 15 H${2.5+i*6.5}Z`,i%2?RED:WHT)).join("")+r(7,19,8,6,YEL)+r(18,19,7,10,BRN2),
mint: e(16,24,10,3.8,GOLD2)+e(16,20.5,10,3.8,GOLD)+e(16,17,10,3.8,GOLD2)+e(16,13.5,10,3.8,GOLD)+e(16,10,10,3.8,GOLD2)+e(16,8,8,2.8,YEL),
tradehouse: pl("16,3 29,13 3,13",RED)+r(5,13,22,15,WHT)+l("M10 19H22M19 16L22 19L19 22M22 24H10M13 21L10 24L13 27",1.8),
barracks: pl("16,4 30,26 2,26",GRN2)+pl("16,12 21,26 11,26",K)+l("M16 4V0",1.5)+pl("16,0 22,2 16,4",RED),
foundry: pl("4,22 28,22 25,28 7,28",GRY2)+r(8,17,16,5,GRY)+pl("6,17 26,17 22,12 10,12",K)+r(9,7,14,5,ORG)+r(10,8,5,2,YEL)+p("M26 22 H31 V25 H27Z",GRY2),
// ---- misc de interfaz usados en la HUD
hierro_: "",
};
function BRNL(){return "#c89560";}
// sprites que dependen de BRNL definido arriba (hoisting): se evalúan al construir I, así que BRNL debe existir antes
fs.mkdirSync("assets/icons",{recursive:true});
for(const f of fs.readdirSync("assets/icons")) if(f.endsWith(".png")||f.endsWith(".svg")) fs.unlinkSync("assets/icons/"+f);
let n=0;
for(const [id,body] of Object.entries(I)){ if(!body) continue;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 32 32"><g stroke="${K}" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round">${body}</g></svg>\n`;
  fs.writeFileSync(`assets/icons/${id}.svg`,svg); n++; }
console.log(n+" iconos SVG generados");
