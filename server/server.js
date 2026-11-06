// Servidor de Hegemonía: sirve el juego (HTML/JS/CSS) y hace de sala de multijugador por WebSocket.
//   node server/server.js            (puerto 8080, o el de la variable PORT)
// No tiene dependencias: el protocolo WebSocket está implementado a mano (solo texto) para que funcione igual en un
// VPS, dentro de Electron o en un PC de casa. El servidor NO simula el juego: solo numera turnos (10 por segundo) y
// reparte las órdenes de los jugadores en el mismo orden a todos; cada cliente calcula la partida (ver src/sim/net.ts).
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.join(__dirname, "..");
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".woff2": "font/woff2", ".json": "application/json", ".svg": "image/svg+xml" };
const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const TURN_MS = 100, MAX_PLAYERS = 8, MAX_ROOMS = 100, MAX_CLIENTS = 600, MAX_FRAME = 64 * 1024;

function createServer() {
  const rooms = new Map();
  const clients = new Set();

  // ---------- Web estática ----------
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split("?")[0]);
    if (url === "/health") { res.writeHead(200); return res.end("ok"); }
    const file = path.normalize(path.join(root, url === "/" ? "index.html" : url));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end("No encontrado"); }
      res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
      res.end(data);
    });
  });

  // ---------- WebSocket mínimo ----------
  server.on("upgrade", (req, socket) => {
    const key = req.headers["sec-websocket-key"];
    if (!key || clients.size >= MAX_CLIENTS) { socket.destroy(); return; }
    const accept = crypto.createHash("sha1").update(key + GUID).digest("base64");
    socket.write("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " + accept + "\r\n\r\n");
    socket.setNoDelay(true);
    const c = { socket, buf: Buffer.alloc(0), frag: [], fragLen: 0, name: "", room: null, slot: -1, alive: true, tokens: 40, chatAt: 0 };
    clients.add(c);
    socket.on("data", d => {
      c.buf = Buffer.concat([c.buf, d]);
      try { parse(c); } catch { drop(c); }
    });
    socket.on("close", () => drop(c));
    socket.on("error", () => drop(c));
    send(c, { t: "hello", players: MAX_PLAYERS });
  });

  function parse(c) {
    for (;;) {
      const b = c.buf; if (b.length < 2) return;
      const fin = (b[0] & 0x80) !== 0, op = b[0] & 0x0f, masked = (b[1] & 0x80) !== 0;
      let len = b[1] & 0x7f, off = 2;
      if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (b.length < 10) return; len = Number(b.readBigUInt64BE(2)); off = 10; }
      if (!masked || len > MAX_FRAME) return drop(c); // los clientes siempre enmascaran
      if (b.length < off + 4 + len) return;
      const mask = b.subarray(off, off + 4), data = Buffer.from(b.subarray(off + 4, off + 4 + len));
      for (let i = 0; i < data.length; i++) data[i] ^= mask[i & 3];
      c.buf = b.subarray(off + 4 + len);
      if (op === 0x8) { drop(c); return; }
      if (op === 0x9) { raw(c, 0xA, data); continue; }
      if (op === 0xA) { c.alive = true; continue; }
      if (op === 0x1 || op === 0x0) {
        c.frag.push(data); c.fragLen += data.length;
        if (c.fragLen > MAX_FRAME) return drop(c);
        if (fin) { const text = Buffer.concat(c.frag).toString("utf8"); c.frag = []; c.fragLen = 0; onMessage(c, text); }
      }
    }
  }
  function raw(c, op, payload) {
    if (c.socket.destroyed) return;
    const n = payload.length; let head;
    if (n < 126) head = Buffer.from([0x80 | op, n]);
    else if (n < 65536) { head = Buffer.alloc(4); head[0] = 0x80 | op; head[1] = 126; head.writeUInt16BE(n, 2); }
    else { head = Buffer.alloc(10); head[0] = 0x80 | op; head[1] = 127; head.writeBigUInt64BE(BigInt(n), 2); }
    c.socket.write(Buffer.concat([head, payload]));
  }
  function send(c, obj) { raw(c, 0x1, Buffer.from(JSON.stringify(obj))); }
  function cast(room, obj) { const s = Buffer.from(JSON.stringify(obj)); for (const c of room.clients) raw(c, 0x1, s); }

  // ---------- Salas ----------
  const clean = (s, max) => String(s ?? "").replace(/[\u0000-\u001f<>&"'`\\]/g, "").trim().slice(0, max);
  function newCode() {
    const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    for (;;) { let s = ""; for (let i = 0; i < 4; i++) s += abc[crypto.randomInt(abc.length)]; if (!rooms.has(s)) return s; }
  }
  function roomInfo(r) {
    return { t: "room", code: r.code, host: r.clients[0] ? r.clients.indexOf(r.host) : -1, settings: r.settings, state: r.state,
      players: r.clients.map(c => ({ name: c.name })) };
  }
  function pushRoom(r) { r.clients.forEach((c, i) => send(c, { ...roomInfo(r), you: i })); }
  function leave(c) {
    const r = c.room; if (!r) return; c.room = null;
    if (r.state === "play") {
      // su reino pasa a la IA para todos, en el mismo turno
      r.cmds.push([c.slot, ["bot"]]); r.gone.add(c.slot);
      r.clients = r.clients.filter(x => x !== c);
      if (!r.clients.length) return closeRoom(r);
      if (r.host === c) r.host = r.clients[0];
    } else {
      r.clients = r.clients.filter(x => x !== c);
      if (!r.clients.length) return closeRoom(r);
      if (r.host === c) r.host = r.clients[0];
      pushRoom(r);
    }
  }
  function closeRoom(r) { clearInterval(r.timer); rooms.delete(r.code); }
  function drop(c) {
    if (!clients.has(c)) return; clients.delete(c); leave(c);
    try { c.socket.destroy(); } catch {}
  }
  function startRoom(r) {
    r.state = "play"; r.turn = 0; r.cmds = []; r.sums = new Map(); r.gone = new Set(); r.over = new Set(); r.desync = false;
    const seed = crypto.randomInt(1, 2 ** 31), humans = r.clients.map(c => c.name);
    r.clients.forEach((c, i) => { c.slot = i; });
    r.clients.forEach(c => send(c, { t: "start", seed, humans, bots: r.settings.bots, diff: r.settings.diff, map: r.settings.map, you: c.slot }));
    r.timer = setInterval(() => {
      r.turn++; const cmds = r.cmds; r.cmds = [];
      cast(r, { t: "turn", n: r.turn, c: cmds });
    }, TURN_MS);
  }

  function onMessage(c, text) {
    let m; try { m = JSON.parse(text); } catch { return; }
    if (!m || typeof m !== "object") return;
    const r = c.room;
    switch (m.t) {
      case "create": {
        if (r || rooms.size >= MAX_ROOMS) return send(c, { t: "error", msg: "No se puede crear la sala ahora." });
        c.name = clean(m.name, 18) || "Jugador";
        const room = { code: newCode(), clients: [c], host: c, state: "lobby", settings: { bots: 25, diff: 1, map: "tierra" }, turn: 0, cmds: [] };
        rooms.set(room.code, room); c.room = room; pushRoom(room); break;
      }
      case "join": {
        const room = rooms.get(clean(m.code, 4).toUpperCase());
        if (r) return;
        if (!room) return send(c, { t: "error", msg: "No existe esa sala." });
        if (room.state !== "lobby") return send(c, { t: "error", msg: "Esa partida ya ha empezado." });
        if (room.clients.length >= MAX_PLAYERS) return send(c, { t: "error", msg: "La sala está llena." });
        let name = clean(m.name, 18) || "Jugador";
        while (room.clients.some(x => x.name === name)) name = name.slice(0, 15) + "·" + (1 + Math.floor(Math.random() * 99));
        c.name = name; room.clients.push(c); c.room = room; pushRoom(room); break;
      }
      case "settings": {
        if (!r || r.state !== "lobby" || r.host !== c) return;
        const s = r.settings, bots = Number(m.bots), diff = Number(m.diff);
        if (Number.isInteger(bots) && bots >= 0 && bots <= 70) s.bots = bots;
        if ([0.7, 1, 1.35].includes(diff)) s.diff = diff;
        if (typeof m.map === "string") s.map = clean(m.map, 24) || "tierra";
        pushRoom(r); break;
      }
      case "start": if (r && r.state === "lobby" && r.host === c) startRoom(r); break;
      case "leave": leave(c); break;
      case "cmd": {
        if (!r || r.state !== "play" || !Array.isArray(m.c)) return;
        if (c.tokens <= 0) return;
        c.tokens--;
        const s = JSON.stringify(m.c); if (s.length > 300) return;
        r.cmds.push([c.slot, m.c]); break;
      }
      case "sum": {
        if (!r || r.state !== "play" || r.desync || !Number.isInteger(m.n)) return;
        let e = r.sums.get(m.n); if (!e) r.sums.set(m.n, e = new Map());
        e.set(c.slot, m.h);
        const live = r.clients.filter(x => !r.gone.has(x.slot)).length;
        if (e.size >= live) {
          const vals = new Set(e.values());
          if (vals.size > 1) { r.desync = true; cast(r, { t: "desync", n: m.n }); }
          r.sums.delete(m.n);
        }
        if (r.sums.size > 200) r.sums.delete(r.sums.keys().next().value);
        break;
      }
      case "over": // el cliente ya vio el final: si todos lo vieron, la sala deja de generar turnos
        if (r && r.state === "play") { r.over.add(c.slot); if (r.over.size >= r.clients.length) { clearInterval(r.timer); r.state = "end"; } }
        break;
      case "chat": {
        if (!r || Date.now() - c.chatAt < 700) return; c.chatAt = Date.now();
        const text = clean(m.text, 200); if (text) cast(r, { t: "chat", from: c.name, text });
        break;
      }
    }
  }

  // recarga de la cuota de órdenes (20 por segundo de media) y latido para detectar conexiones muertas
  const refill = setInterval(() => { for (const c of clients) c.tokens = Math.min(40, c.tokens + 2); }, 100);
  const beat = setInterval(() => {
    for (const c of clients) { if (!c.alive) { drop(c); continue; } c.alive = false; raw(c, 0x9, Buffer.alloc(0)); }
  }, 30000);
  server.on("close", () => { clearInterval(refill); clearInterval(beat); for (const r of rooms.values()) clearInterval(r.timer); for (const c of clients) c.socket.destroy(); });
  server.rooms = rooms;
  return server;
}

module.exports = { createServer };
if (require.main === module) {
  const port = +process.env.PORT || 8080;
  createServer().listen(port, () => console.log("Hegemonía en http://localhost:" + port + "  (multijugador: ws://localhost:" + port + ")"));
}
