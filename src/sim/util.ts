// Formato compacto de números (1.2k, 3.4M)
function fmt(n){{ n=Math.max(0,n); return n>=1e6?(n/1e6).toFixed(1)+"M":n>=1e4?(n/1e3).toFixed(0)+"k":n>=1e3?(n/1e3).toFixed(1)+"k":Math.floor(n).toString(); } }
