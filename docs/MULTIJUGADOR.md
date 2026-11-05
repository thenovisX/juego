# Multijugador

## Cómo se juega
1. Alguien arranca el servidor: `node server/server.js` (puerto 8080, o la variable `PORT`). También sirve el juego, así que los demás pueden abrir `http://IP:8080`.
2. En el menú, **🌐 Multijugador** → *Crear sala*. Sale un código de 4 letras.
3. Los demás: *Multijugador* → escribir el código → *Unirse*. De 2 a 8 personas.
4. El anfitrión elige cuántos reinos de IA hay (0-70), la dificultad y el mapa, y pulsa *Empezar*.
5. Si alguien se desconecta, su reino pasa a la IA. Gana quien llegue al 60% del mundo.

Diferencias con el modo solitario: no hay pausa, ni 2x/3x, ni guardar/cargar; cada jugador nace en un punto aleatorio lejos de los demás; los bots no hacen ofertas a los humanos (sí las aceptan o rechazan), y entre humanos las propuestas de pacto aparecen como en solitario.

## Cómo funciona (para quien toque el código)
- **Sincronización por turnos.** El servidor no simula nada: cada 100 ms envía `{t:"turn", n, c:[[hueco, orden],...]}`. Cada cliente aplica las órdenes y avanza un tick de la misma simulación, con la misma semilla. Por eso el servidor es pequeñísimo (`server/server.js`, sin dependencias) y hace falta muy poco ancho de banda.
- **La interfaz no cambia.** En red, `src/sim/net.ts` intercepta las funciones que llama la interfaz (`placeBuilding`, `launchAttack`, `propose`...): en vez de ejecutarlas las manda como orden, y se ejecutan al volver en un turno. Si añades una acción nueva para el jugador, añade su `netWrap(...)` en `netInstall` y su `case` en `netExec` (con validación).
- **Reglas para la simulación (`src/sim`):** no usar `Math.random` (usar `rnd()`), ni leer `me`, el reloj o el DOM para decidir nada que cambie el estado; lo visual va por `Hooks`. Si un cliente calcula algo distinto, el servidor lo detecta (huella cada 5 s) y los jugadores ven «⚠ Desincronizado».
- **Prueba:** `node tools/build.mjs && node tools/test-net.mjs` levanta el servidor real, conecta dos clientes sin navegador, juega 600 turnos con órdenes cruzadas y comprueba que los dos mundos son idénticos.
- Al añadir mapas: el id del mapa viaja en `settings.map` (sala → mensaje `start`); lista de la pantalla de sala en `MP_MAPS` (`src/client/multi.ts`). `netBegin` debe generar el mapa elegido antes de `newGameNet`.

## Dónde alojar el servidor
El servidor necesita un proceso Node que esté siempre encendido y acepte WebSockets. La web estática de Hostinger (HTML + JS) **no** basta para esto.

| Opción | Sirve | Coste aprox. | Notas |
|---|---|---|---|
| Hostinger hosting compartido (Premium/Single) | No | — | Solo estático + PHP; no deja procesos Node permanentes ni WebSockets. |
| Hostinger Business/Cloud con «Node.js» | Quizá | ya pagado | Comprobar en hPanel que existe «Node.js Web App» y que admite WebSockets; si no, no vale. |
| Hostinger VPS (o cualquier VPS: Hetzner, DigitalOcean...) | Sí | ~4-7 €/mes | Lo más cómodo y estable: `node server/server.js` con `pm2` y `nginx`/Caddy delante para `wss://`. |
| Render, Railway, Fly.io, Koyeb | Sí | gratis/pocos € | Los planes gratis se duermen sin uso (la primera conexión tarda). Despliegan desde GitHub. |
| Un jugador hace de servidor (PC de casa/Electron) | Sí | 0 € | `node server/server.js` + abrir el puerto en el router o usar un túnel (Tailscale, Cloudflare Tunnel). Sirve para amigos, no para público. |

La web puede seguir en Hostinger y el servidor de partidas estar en otro sitio: en el menú Multijugador se escribe su dirección (`wss://...`), o se fija en `MP_DEFAULT_SERVER` (`src/client/multi.ts`). Una página `https` solo puede conectar con `wss://` (necesita certificado: nginx/Caddy o el que dan Render/Fly).
Para Steam/Electron el mismo servidor sirve; más adelante se puede sustituir por Steam Networking. PHP no es adecuado para esto (solo para cuentas/ranking).

## Pendiente
Reconectar a media partida (hay `saveGame`/`loadGame` para mandar una foto del estado), elegir dónde nacer, chat, lista de salas públicas, cuentas.
