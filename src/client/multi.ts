// @ts-nocheck  (cliente: DOM sin tipar de momento; la simulación sí se comprueba)
// ================= Multijugador: pantalla de sala y conexión =================
// Todo vive en este archivo (crea su propio botón y su propia pantalla) para no depender del HTML del menú.
// La lógica de la partida en red está en src/sim/net.ts; el servidor, en server/server.js.
const MP_DEFAULT_SERVER = ""; // p. ej. "wss://juego.midominio.com". Vacío = el mismo sitio desde el que se cargó el juego.
const MP_MAPS = [["tierra", "La Tierra"]]; // otros mapas: añadir aquí [id, nombre] cuando existan (el id viaja en la sala)

(function multiplayerUI(){
  const $ = id => document.getElementById(id);
  const css = document.createElement("style");
  css.textContent = `
  #mpov{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(8,14,20,.97);z-index:12;padding:16px}
  #mpov[hidden]{display:none}
  #mpov .box{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:24px;max-width:460px;width:100%;box-sizing:border-box;box-shadow:0 20px 60px rgba(0,0,0,.5);max-height:calc(100% - 20px);overflow:auto;color:var(--fg)}
  #mpov h2{font-family:var(--f-display,inherit);font-weight:400;font-size:30px;letter-spacing:.06em;margin:0 0 6px;color:var(--brass2)}
  #mpov .sub{color:var(--muted);line-height:1.45;margin:0 0 14px;font-size:13px}
  #mpov .f{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}
  #mpov label{display:flex;flex-direction:column;gap:4px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);flex:1;min-width:120px}
  #mpov input,#mpov select{font:inherit;font-size:14px;background:var(--panel2);color:var(--fg);border:1px solid var(--line);border-radius:6px;padding:7px 9px;text-transform:none;letter-spacing:0}
  #mpov .code{font-family:var(--f-mono,monospace);font-size:38px;letter-spacing:.3em;text-align:center;color:var(--brass2);margin:4px 0 10px;user-select:all}
  #mpov ol{list-style:none;margin:0 0 14px;padding:0;display:flex;flex-direction:column;gap:6px}
  #mpov li{display:flex;align-items:center;gap:8px;background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:7px 10px}
  #mpov li i{width:12px;height:12px;border-radius:50%;flex:none}
  #mpov li em{margin-left:auto;font-style:normal;font-size:11px;color:var(--brass);text-transform:uppercase;letter-spacing:.08em}
  #mpov .err{color:var(--danger);min-height:18px;font-size:13px;margin:0 0 8px}
  #mpov .row{display:flex;gap:8px}#mpov .row>*{flex:1}
  #mpbadge{position:fixed;top:6px;left:50%;transform:translateX(-50%);z-index:5;background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:3px 12px;font-size:12px;color:var(--muted);pointer-events:none}
  #mpbadge.bad{color:var(--danger);border-color:var(--danger)}`;
  document.head.appendChild(css);

  const ov = document.createElement("div"); ov.id = "mpov"; ov.hidden = true; document.body.appendChild(ov);
  const el = (tag, props, ...kids) => { const e = document.createElement(tag); Object.assign(e, props || {}); for (const k of kids) e.append(k); return e; };
  const colorOf = i => "rgb(" + NET_COLORS[i % NET_COLORS.length].join(",") + ")";
  let ws = null, room = null, view = "menu", error = "";
  const store = { get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
  const defaultServer = () => MP_DEFAULT_SERVER || store.get("hegemonia.server", "") || (/^https?:$/.test(location.protocol) ? (location.protocol === "https:" ? "wss://" : "ws://") + location.host : "ws://localhost:8080");

  // ---- Botón en el menú principal
  const btn = el("button", { className: "btn go2", id: "mpBtn", type: "button", textContent: "🌐 Multijugador" });
  const anchor = $("loadFile") || $("loadStartBtn"); (anchor && anchor.parentNode ? anchor.parentNode : $("obox") || document.body).appendChild(btn);
  btn.onclick = () => { $("nameIn") && (nameVal = $("nameIn").value); view = ws && room ? "lobby" : "menu"; draw(); ov.hidden = false; };
  let nameVal = "";

  function connect(server, then) {
    error = ""; draw();
    try { ws = new WebSocket(server); } catch { error = "Dirección de servidor no válida."; draw(); return; }
    const sock = ws;
    sock.onopen = () => { store.set("hegemonia.server", server); then(); };
    sock.onmessage = ev => { let m; try { m = JSON.parse(ev.data); } catch { return; } onMsg(m); };
    sock.onclose = () => { if (ws !== sock) return; ws = null;
      if (netOn) { const b = $("mpbadge"); if (b) { b.textContent = "⚠ Conexión perdida"; b.className = "bad"; } log("Se ha perdido la conexión con el servidor.", "bad"); }
      else { room = null; view = "menu"; error = "No se pudo conectar con el servidor (" + server + ")."; draw(); ov.hidden = false; } };
  }
  const tx = m => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); };

  function onMsg(m) {
    if (m.t === "room") { room = m; view = "lobby"; error = ""; draw(); }
    else if (m.t === "error") { error = m.msg; draw(); }
    else if (m.t === "start") begin(m);
    else if (m.t === "turn") netOnMessage(m);
    else if (m.t === "desync") { netOnMessage(m); const b = $("mpbadge"); if (b) { b.textContent = "⚠ Desincronizado"; b.className = "bad"; } }
  }

  function begin(m) {
    initAudio();
    netSend = x => tx(x);
    netBegin(m);
    ov.hidden = true; $("overlay").hidden = true;
    for (const id of ["top", "board", "dock", "side", "send"]) { const e = $(id); if (e) e.hidden = false; }
    for (const id of ["spdBtn", "pauseBtn", "saveBtn", "loadBtn"]) { const e = $(id); if (e) e.style.display = "none"; }
    $("pname").textContent = me.name;
    const home = me.B.city[0]; if (home) centerOn(home.x, home.y, Math.max(cam.z, 4));
    const end = Hooks.end; Hooks.end = win => { end(win); if (netWinner >= 0) tx({ t: "over" }); };
    const b = el("div", { id: "mpbadge", textContent: "🌐 Sala " + (room ? room.code : "") + " · " + m.humans.length + " jugadores" }); document.body.appendChild(b);
    log("{{crown}} Partida multijugador: " + m.humans.join(", ") + " contra " + m.bots + " reinos de la IA. Tu reino ya está fundado.", "good");
    updateHud();
  }

  // ---- Pantallas
  function draw() {
    const box = el("div", { className: "box" });
    box.append(el("h2", { textContent: "Multijugador" }));
    if (view === "menu") {
      box.append(el("p", { className: "sub", textContent: "Juega contra otras personas en el mismo mundo. Uno crea la sala y comparte el código; los demás entran con él. Los reinos que queden libres los llevará la IA." }));
      const name = el("input", { maxLength: 18, value: nameVal || "Jugador", id: "mpName" }), srv = el("input", { value: defaultServer(), id: "mpServer", spellcheck: false }), code = el("input", { maxLength: 4, placeholder: "ABCD", id: "mpCode", style: "text-transform:uppercase" });
      const f1 = el("div", { className: "f" }, el("label", {}, "Tu nombre", name), el("label", {}, "Servidor", srv));
      box.append(f1);
      const create = el("button", { className: "go", type: "button", textContent: "Crear sala" });
      create.onclick = () => { nameVal = name.value; connect(srv.value.trim(), () => tx({ t: "create", name: name.value })); };
      box.append(create);
      const join = el("button", { className: "btn go2", type: "button", textContent: "Unirse" });
      join.onclick = () => { nameVal = name.value; if (code.value.trim().length < 4) { error = "Escribe el código de 4 letras."; draw(); return; } connect(srv.value.trim(), () => tx({ t: "join", code: code.value.trim(), name: name.value })); };
      box.append(el("div", { className: "f", style: "margin-top:14px" }, el("label", {}, "Código de sala", code)), join);
    } else {
      const host = room.you === room.host;
      box.append(el("p", { className: "sub", textContent: host ? "Comparte este código. Cuando estéis todos, empieza la partida." : "Esperando a que el anfitrión empiece la partida." }));
      box.append(el("div", { className: "code", textContent: room.code }));
      const ol = el("ol"); room.players.forEach((p, i) => { const li = el("li", {}, el("i", { style: "background:" + colorOf(i) }), p.name + (i === room.you ? " (tú)" : ""));
        if (i === room.host) li.append(el("em", { textContent: "anfitrión" })); ol.append(li); });
      box.append(ol);
      const s = room.settings, bots = el("select", { disabled: !host }), diff = el("select", { disabled: !host }), map = el("select", { disabled: !host || MP_MAPS.length < 2 });
      for (const n of [0, 10, 25, 45, 70]) bots.append(new Option(n + " reinos", n, false, n === s.bots));
      for (const [v, n] of [[0.7, "Fácil"], [1, "Normal"], [1.35, "Difícil"]]) diff.append(new Option(n, v, false, v === s.diff));
      for (const [v, n] of MP_MAPS) map.append(new Option(n, v, false, v === s.map));
      const push = () => tx({ t: "settings", bots: +bots.value, diff: +diff.value, map: map.value });
      bots.onchange = diff.onchange = map.onchange = push;
      box.append(el("div", { className: "f" }, el("label", {}, "IA", bots), el("label", {}, "Dificultad IA", diff), el("label", {}, "Mapa", map)));
      if (host) { const go = el("button", { className: "go", type: "button", textContent: room.players.length < 2 ? "Empezar (solo tú de momento)" : "Empezar partida" }); go.onclick = () => tx({ t: "start" }); box.append(go); }
    }
    box.append(el("p", { className: "err", textContent: error }));
    const back = el("button", { className: "btn go2", type: "button", textContent: view === "lobby" ? "Salir de la sala" : "Volver" });
    back.onclick = () => { if (view === "lobby") { tx({ t: "leave" }); if (ws) { const s = ws; ws = null; s.close(); } room = null; view = "menu"; draw(); } else ov.hidden = true; };
    box.append(back);
    ov.replaceChildren(box);
  }
})();
