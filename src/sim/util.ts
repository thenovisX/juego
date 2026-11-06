// Formato compacto de números (1.2k, 3.4M)
function fmt(n){{ n=Math.max(0,n); return n>=1e6?(n/1e6).toFixed(1)+"M":n>=1e4?(n/1e3).toFixed(0)+"k":n>=1e3?(n/1e3).toFixed(1)+"k":Math.floor(n).toString(); } }
// Aleatorio de la simulación. En solitario es Math.random; en multijugador se cambia por un generador con semilla
// (net.ts) para que todos los clientes calculen exactamente lo mismo. La simulación NUNCA debe llamar a Math.random.
let rngFn: () => number = Math.random;
function rnd(): number { return rngFn(); }
