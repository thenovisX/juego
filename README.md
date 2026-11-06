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

## Rediseño de ritmo y estructuras
- **Ritmo más pausado:** el crecimiento de población es un 40% más lento, los ataques avanzan menos casillas por segundo y las obras tardan 8 s en vez de 5 s.
- **Población x100:** tropas, población máxima y coste de conquista van multiplicados por 100 (`POP_X`). El oro NO depende de la población (impuestos, edificios y comercio no cambian).
- **Estructuras con un uso preciso:** la barra de construcción tiene pestañas (Economía, Pueblo, Defensa, Logística, Armas, Órdenes). Al pasar el ratón por un edificio se lee qué hace (con números), cuánto cuesta y dónde se puede poner; al colocarlo se ve su radio.
- **Nuevas estructuras de oro:** Mercado (+250 oro/s por ciudad cerca), Casa de la moneda (+200 y +150 por mina o metalúrgica cerca), Casa de comercio (+300 oro/s por socio comercial). También: Templo (+felicidad, permite subir impuestos) y Cuartel (+población máxima y reclutamiento).
- **Más interacción con las tropas:** posturas de combate (equilibrada, ofensiva, defensiva), retirar o reforzar cada frente (↩ / ➕) o todos a la vez, reclutar tropas con oro en un Cuartel y enviar refuerzos a un aliado desde Diplomacia.
- Los iconos nuevos (`assets/icons/market, mint, tradehouse, temple, barracks, recruit, retreat, reinforce, stance_*`) son provisionales (emoji): se pueden sustituir por arte propio con los mismos nombres.
- Las partidas guardadas con la versión anterior ya no se pueden cargar (versión de guardado 2).
- Prueba nueva: `node tools/test-estructuras.mjs`.
