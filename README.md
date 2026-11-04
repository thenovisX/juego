# Hegemonía

Juego de conquista de territorios sobre el mapa de la Tierra, hecho con HTML, CSS y JavaScript.

## Jugar
- Doble clic en `JUGAR.bat` o en `index.html`.
- O con servidor local: `node server/server.js` y abre http://localhost:8080

## Estructura
- `index.html`: pantallas e interfaz.
- `css/style.css`: estilos.
- `js/mapdata.js`: costas reales de la Tierra (datos del mapa).
- `js/map.js`: terreno (montañas, desiertos, bosques, hielo).
- `js/state.js`: estado del mundo y dibujo del mapa por casillas.
- `js/players.js`: jugadores, diplomacia, edificios y economía.
- `js/combat.js`: ataques, barcos, misiles y bombas.
- `js/ai.js`: inteligencia de los bots.
- `js/loop.js`: bucle del juego y cámara.
- `js/ui.js`: controles, paneles, sonido y pantallas de victoria/derrota.
- `js/render.js`: dibujo en pantalla e inicio de partida.
- `electron/main.js`: ventana de escritorio para empaquetar el juego.

Los scripts se cargan en el orden de `index.html`; comparten el mismo espacio global.

## Versión de escritorio (Steam)
1. Instala Node.js.
2. `npm install`
3. `npm start` para probar, `npm run dist` para crear el instalador de Windows.
Para Steam se usa Steamworks con el paquete `steamworks.js` (logros, nube, multijugador) dentro de Electron.

## Pendiente
Tipos de unidades, tecnología, multijugador online (Node.js + WebSockets), fuentes locales para jugar sin internet.

## Desarrollo (TypeScript)
- Código fuente en `src/`: `src/sim` (simulación, sin DOM: mapa, economía, combate, IA, diplomacia, comercio) y `src/client` (dibujo, interfaz, sonido). La simulación solo habla con el cliente a través de `Hooks` (`src/sim/hooks.ts`), así que un servidor Node puede reutilizarla.
- `BUILD.bat` recompila a `dist/game.js` (juego) y `dist/sim.js` (solo simulación), comprueba tipos y ejecuta una partida sin navegador (`tools/test-sim.mjs`).
- `JUGAR.bat` abre `index.html`, que carga `dist/game.js`; no necesita Node. Node portable está en `tools/` (solo para compilar).

## Novedades de juego (resumen)
- **Economía:** el oro ya no lo dan las minas. Lo dan los impuestos (deslizador 0-80 %, con felicidad del pueblo y revueltas), los aserraderos y granjas (producen madera/comida y oro), el comercio por mar (cargueros) y el aéreo (aviones comerciales). Las minas producen minerales (hierro en montaña, piedra en el resto) y dan empleo: más impuestos y más felicidad.
- **Materiales y vías:** puerto, ciudad, silo, antiaérea, aeropuerto y banco piden materiales además de oro. Las vías (estaciones 🚉) solo cuestan oro y llevan los materiales de minas, aserraderos, granjas y bancos a las obras cercanas. Los bots no necesitan materiales.
- **Marina y aviación:** buques de guerra (B) y aviones de guerra (V) interceptan los cargueros y aviones comerciales de reinos sin pacto ni comercio con su dueño y se quedan la carga.
- **Mejoras:** clic en un edificio propio para subirlo hasta nivel 3.
- **Guardar/cargar:** 💾 y 📂 (archivo .json con versión).
- **Pruebas sin navegador:** `BUILD.bat` compila y ejecuta `tools/test-*.mjs` (simulación, guardado, mejoras/economía, impuestos, aviones, buques, bots y materiales).
