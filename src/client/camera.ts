// @ts-nocheck  (cliente: DOM sin tipar de momento; la simulación sí se comprueba)
// ================= Cámara =================
const cv=document.getElementById("cv"), ctx=cv.getContext("2d",{alpha:false});
let dpr=1, vw=0, vh=0, shake=0;
const cam={x:0,y:0,z:1,tz:1,ax:0,ay:0};
function resize(){ vw=innerWidth; vh=innerHeight; dpr=Math.min(window.devicePixelRatio||1, vw<800?1.5:2); cv.width=vw*dpr; cv.height=vh*dpr; clampCam(); }
function fitZoom(){ return Math.max(vw/W, vh/H); }
function clampCam(){ const f=fitZoom(); cam.z=Math.max(f,Math.min(40,cam.z)); cam.tz=Math.max(f,Math.min(40,cam.tz)); cam.x=((cam.x%W)+W)%W; const maxY=H-vh/cam.z; cam.y=Math.max(Math.min(0,maxY/2),Math.min(Math.max(0,maxY),cam.y)); }
function applyZoom(sx,sy,f){ const wx=cam.x+sx/cam.z, wy=cam.y+sy/cam.z; cam.z*=f; clampCam(); cam.x=wx-sx/cam.z; cam.y=wy-sy/cam.z; clampCam(); }
function zoomAt(sx,sy,f){ cam.tz=Math.max(fitZoom(),Math.min(40,cam.tz*f)); cam.ax=sx; cam.ay=sy; }
function centerOn(x,y,z){ if(z) cam.z=cam.tz=z; clampCam(); cam.x=x-vw/2/cam.z; cam.y=y-vh/2/cam.z; clampCam(); }
function screenToTile(sx,sy){ const wx=cam.x+sx/cam.z, wy=cam.y+sy/cam.z; const x=((Math.floor(wx)%W)+W)%W, y=Math.floor(wy); if(y<0||y>=H) return -1; return y*W+x; }
function onScreen(x,y){ let sx=x-cam.x; if(sx<0) sx+=W; return sx*cam.z<vw && (y-cam.y)*cam.z>=0 && (y-cam.y)*cam.z<vh; }

let dangerAt=-1e9, lastAlarm=0; // efecto de pantalla roja (cliente)
