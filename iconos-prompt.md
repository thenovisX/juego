# Spritesheet de iconos de Hegemonía

Reemplaza todos los emoticonos del juego. Una única imagen en cuadrícula de **10 columnas × 8 filas = 80 celdas** (78 iconos + 2 vacías).
Tamaño recomendado: **2560 × 2048 px** (celdas de 256 × 256 px). Si el generador no da esa resolución, vale cualquier imagen con proporción 5:4; se recortará igual.

## Prompt para pegar en el generador de imágenes

```
Genera UNA SOLA imagen: una hoja de sprites (sprite sheet) de iconos para un videojuego de estrategia sobre un mapa del mundo, con estilo coherente en TODOS los iconos.

FORMATO ESTRICTO:
- Imagen de 2560 x 2048 px, proporción 5:4.
- Cuadrícula exacta de 10 columnas x 8 filas = 80 celdas, todas del mismo tamaño (256 x 256 px), perfectamente alineadas, sin márgenes exteriores ni separación entre celdas.
- Fondo: color plano sólido verde croma puro #00FF00 en TODA la imagen (sin degradados, sin sombras proyectadas, sin suelo, sin texturas), para poder recortar y quitar el fondo. No uses verde en los iconos, salvo donde se pida expresamente.
- Sin líneas de cuadrícula visibles, sin números, sin etiquetas, sin texto, sin marcos.
- Cada icono está CENTRADO en su celda y ocupa aprox. el 75% de la celda (margen de ~12% por lado). Un único objeto por celda, sin salirse de su celda ni tocar las vecinas.

ESTILO (idéntico en las 78 piezas), en inglés: flat vector game icons, clean cartoon style, thick uniform dark navy outline (#14212e), saturated but balanced colors, simple 2-tone cel shading with light from the top-left, small highlight, no photorealism, no pixel art, no gradients, consistent line weight, same perspective and same palette across the whole sheet, friendly browser strategy game look, readable at 24 px with simple clear silhouettes. Los iconos de interfaz (controles) pueden ser más planos y esquemáticos, pero con el mismo contorno y paleta.

CONTENIDO, de izquierda a derecha y de arriba a abajo (celda 1 = arriba izquierda, celda 10 = arriba derecha, celda 11 = segunda fila a la izquierda, etc.):

Fila 1 — EDIFICIOS:
1 Ciudad: grupo de edificios/rascacielos pequeños. 2 Mina: entrada de mina con pico y vagoneta. 3 Fortaleza: castillo con torres y almenas. 4 Puerto: ancla grande con un muelle. 5 Antiaérea: torreta con lanzamisiles apuntando al cielo. 6 Silo: silo circular con tapa abierta y misil asomando. 7 Aeropuerto: torre de control con pista y avioncito. 8 Aserradero: sierra circular y troncos. 9 Granja: granero rojo con campo de trigo. 10 Banco de materiales: almacén con cajas y lingotes apilados.

Fila 2 — EDIFICIOS, ARMAS Y UNIDADES:
11 Estación: estación de tren pequeña con andén. 12 Obra en construcción: cartel de obras con cono y andamio (se usará pequeño como marca). 13 Misil: misil convencional con punta roja. 14 Bomba atómica: bomba gris con símbolo de radiación amarillo. 15 Bomba H: bomba grande verde oscuro con símbolo de peligro biológico. 16 Barco de tropas: velero pequeño de desembarco con soldados. 17 Carguero comercial: barco de carga con contenedores de colores. 18 Buque de guerra: destructor gris con cañones. 19 Avión comercial: avión de pasajeros blanco. 20 Avión de guerra: caza de combate gris.

Fila 3 — MATERIALES Y TERRENOS:
21 Piedra: roca gris. 22 Madera: tres troncos apilados. 23 Hierro: lingotes de hierro metálicos apilados. 24 Comida: pan y espiga de trigo en una cesta. 25 Terreno: Mar: olas azules. 26 Terreno: Llanura: pradera verde clara con hierba. 27 Terreno: Bosque: dos pinos verdes. 28 Terreno: Montaña: pico gris con cima nevada. 29 Terreno: Desierto: dunas amarillas con un cactus. 30 Terreno: Hielo: bloque de hielo celeste.

Fila 4 — RECURSOS, ÁNIMO Y DEFENSA:
31 Tropas: tres soldados con casco. 32 Oro: moneda dorada grande con brillo. 33 Territorio: mapamundi / globo terráqueo. 34 Impuestos: edificio de gobierno con columnas. 35 Cara muy feliz (felicidad ≥75 / amistoso): cara redonda amarilla, sonrisa grande. 36 Cara contenta (≥55 / cordial): sonrisa suave. 37 Cara neutral (≥40 / neutral): boca recta. 38 Cara enfadada (≥25 / desconfiado): cejas fruncidas, boca hacia abajo. 39 Cara furiosa (<25 / hostil): roja, dientes apretados. 40 Escudo de defensa / te atacan: escudo azul con borde metálico, DISTINTO de la antiaérea.

Fila 5 — CONTROLES DE INTERFAZ:
41 Reanudar: triángulo de play. 42 Pausa: dos barras verticales. 43 Velocidad: doble flecha de avance rápido. 44 Sonido activado: altavoz con ondas. 45 Sonido silenciado: altavoz con una X. 46 Guardar partida: disquete. 47 Cargar partida: carpeta abierta. 48 Ranking / potencias: trofeo dorado. 49 Ayuda: interrogación en un círculo. 50 Inicio / centrar mapa: casa.

Fila 6 — DIPLOMACIA:
51 Alianza / diplomacia: apretón de manos. 52 Pacto de no agresión / paz: paloma blanca con rama de olivo. 53 Comercio: bolsa de dinero con símbolo de moneda. 54 Ataque / guerra: dos espadas cruzadas. 55 Traidor: serpiente verde enroscada. 56 Regalo: caja de regalo con lazo. 57 Pedir ayuda: cartel SOS rojo. 58 Romper acuerdos: corazón partido en dos. 59 Ver en el mapa: chincheta/pin de ubicación rojo. 60 Aceptado / firmado: check verde en un círculo.

Fila 7 — ALERTAS Y EVENTOS:
61 Advertencia: triángulo amarillo con exclamación. 62 Aviso: campana dorada. 63 Revuelta: llama de fuego. 64 Alarma de misil entrante: sirena roja. 65 Explosión: estallido naranja y amarillo. 66 Radiación: solo el símbolo de radiación amarillo y negro, sin bomba. 67 Muralla: tramo de muro de ladrillos. 68 Reino caído: calavera. 69 Captura pirata: bandera pirata negra con calavera. 70 Derribo: diana con flecha clavada.

Fila 8 — MARCADORES FINALES:
71 Corona / hegemonía: corona dorada. 72 Tiempo: cronómetro. 73 Puesto final: medalla con cinta. 74 Edificios construidos: grúa de construcción. 75 Espectador: ojo. 76 Mejorar nivel: flecha verde hacia arriba gruesa. 77 Rechazo: mano abierta levantada (alto). 78 Cerrar: X gruesa roja. 79 celda VACÍA (solo fondo croma). 80 celda VACÍA (solo fondo croma).

Las caras 35-39 son redondas amarillas (la 39 roja), de la más feliz a la más furiosa, en el mismo estilo entre ellas.

IMPORTANTE: respeta exactamente el orden y la posición de cada celda; no repitas iconos; no añadas elementos extra; todo sobre el mismo fondo verde #00FF00; ningún icono toca el borde de su celda.
```

## Notas para el recorte posterior
- Celda i: fila `ceil(i/10)`, columna `((i-1) % 10)+1`; recorte de 256×256 px (o ancho/10 × alto/8 si la imagen sale con otra resolución).
- Quitar el fondo `#00FF00` (chroma key) para tener PNG transparentes.
- Si el generador no respeta la cuadrícula de 80 celdas (es habitual), pedir dos hojas de 5 columnas × 8 filas (celdas 1-40 y 41-80) con el mismo prompt; el mapeo no cambia.
- Reutilizaciones que se separan en iconos propios: 🌾 → Granja (9), Comida (24), Llanura (26); 📦 → Banco (10) y Obra (12); 🛡️ → Antiaérea (5) y Escudo (40); 💥 → Misil (13) y Explosión (65). Los 5 rostros (35-39) sirven para la barra de felicidad y para el ánimo en diplomacia (antes allí 😊🙂😐😠😡).

## Mapeo celda → icono actual

| Celda | Fila | Col | id | Emoji actual | Significado |
|---|---|---|---|---|---|
| 1 | 1 | 1 | `city` | 🏙️ | Ciudad |
| 2 | 1 | 2 | `mine` | ⛏️ | Mina |
| 3 | 1 | 3 | `fort` | 🏰 | Fortaleza |
| 4 | 1 | 4 | `port` | ⚓ | Puerto |
| 5 | 1 | 5 | `sam` | 🛡️ (en código) | Antiaérea |
| 6 | 1 | 6 | `silo` | 🚀 | Silo |
| 7 | 1 | 7 | `airport` | 🛫 | Aeropuerto |
| 8 | 1 | 8 | `sawmill` | 🪚 | Aserradero |
| 9 | 1 | 9 | `farm` | 🌾 | Granja |
| 10 | 1 | 10 | `bank` | 📦 | Banco de materiales |
| 11 | 2 | 1 | `station` | 🚉 | Estación |
| 12 | 2 | 2 | `obra` | 📦 (sobre el edificio) | Obra en construcción |
| 13 | 2 | 3 | `missile` | 💥 | Misil |
| 14 | 2 | 4 | `atom` | ☢️ | Bomba atómica |
| 15 | 2 | 5 | `hydro` | ☣️ | Bomba H |
| 16 | 2 | 6 | `boat` | ⛵ | Barco de tropas |
| 17 | 2 | 7 | `cargo` | 🚢 | Carguero comercial |
| 18 | 2 | 8 | `wship` | 🛳️ | Buque de guerra |
| 19 | 2 | 9 | `plane` | ✈️ | Avión comercial |
| 20 | 2 | 10 | `wplane` | 🛩️ | Avión de guerra |
| 21 | 3 | 1 | `piedra` | 🪨 | Piedra |
| 22 | 3 | 2 | `madera` | 🪵 | Madera |
| 23 | 3 | 3 | `hierro` | ⚙️ | Hierro |
| 24 | 3 | 4 | `comida` | 🌾 | Comida |
| 25 | 3 | 5 | `t0` | 🌊 | Terreno: Mar |
| 26 | 3 | 6 | `t1` | 🌾 | Terreno: Llanura |
| 27 | 3 | 7 | `t2` | 🌲 | Terreno: Bosque |
| 28 | 3 | 8 | `t3` | ⛰️ | Terreno: Montaña |
| 29 | 3 | 9 | `t4` | 🏜️ | Terreno: Desierto |
| 30 | 3 | 10 | `t5` | 🧊 | Terreno: Hielo |
| 31 | 4 | 1 | `troops` | 👥 | Tropas |
| 32 | 4 | 2 | `gold` | 🪙 | Oro |
| 33 | 4 | 3 | `land` | 🗺️ | Territorio |
| 34 | 4 | 4 | `tax` | 🏛️ | Impuestos |
| 35 | 4 | 5 | `f1` | 😄 | Cara muy feliz (felicidad ≥75 / amistoso) |
| 36 | 4 | 6 | `f2` | 🙂 | Cara contenta (≥55 / cordial) |
| 37 | 4 | 7 | `f3` | 😐 | Cara neutral (≥40 / neutral) |
| 38 | 4 | 8 | `f4` | 😠 | Cara enfadada (≥25 / desconfiado) |
| 39 | 4 | 9 | `f5` | 🤬 | Cara furiosa (<25 / hostil) |
| 40 | 4 | 10 | `shield` | 🛡️ | Escudo de defensa / te atacan |
| 41 | 5 | 1 | `play` | ▶️ | Reanudar |
| 42 | 5 | 2 | `pause` | ⏸ | Pausa |
| 43 | 5 | 3 | `speed` | ⏩ | Velocidad |
| 44 | 5 | 4 | `snd_on` | 🔊 | Sonido activado |
| 45 | 5 | 5 | `snd_off` | 🔇 | Sonido silenciado |
| 46 | 5 | 6 | `save` | 💾 | Guardar partida |
| 47 | 5 | 7 | `load` | 📂 | Cargar partida |
| 48 | 5 | 8 | `board` | 🏆 | Ranking / potencias |
| 49 | 5 | 9 | `help` | ❔ | Ayuda |
| 50 | 5 | 10 | `home` | 🏠 | Inicio / centrar mapa |
| 51 | 6 | 1 | `ally` | 🤝 | Alianza / diplomacia |
| 52 | 6 | 2 | `nap` | 🕊️ | Pacto de no agresión / paz |
| 53 | 6 | 3 | `trade` | 💰 | Comercio |
| 54 | 6 | 4 | `attack` | ⚔️ | Ataque / guerra |
| 55 | 6 | 5 | `traitor` | 🐍 | Traidor |
| 56 | 6 | 6 | `gift` | 🎁 | Regalo |
| 57 | 6 | 7 | `sos` | 🆘 | Pedir ayuda |
| 58 | 6 | 8 | `break` | 💔 | Romper acuerdos |
| 59 | 6 | 9 | `pin` | 📍 | Ver en el mapa |
| 60 | 6 | 10 | `ok` | ✅ | Aceptado / firmado |
| 61 | 7 | 1 | `warn` | ⚠️ | Advertencia |
| 62 | 7 | 2 | `bell` | 🔔 | Aviso |
| 63 | 7 | 3 | `riot` | 🔥 | Revuelta |
| 64 | 7 | 4 | `alarm` | 🚨 | Alarma de misil entrante |
| 65 | 7 | 5 | `boom` | 💥 | Explosión |
| 66 | 7 | 6 | `rad` | ☢️ | Radiación |
| 67 | 7 | 7 | `wall` | 🧱 | Muralla |
| 68 | 7 | 8 | `dead` | 💀 | Reino caído |
| 69 | 7 | 9 | `pirate` | 🏴‍☠️ | Captura pirata |
| 70 | 7 | 10 | `shot` | 🎯 | Derribo |
| 71 | 8 | 1 | `crown` | 👑 | Corona / hegemonía |
| 72 | 8 | 2 | `time` | ⏱️ | Tiempo |
| 73 | 8 | 3 | `medal` | 🏅 | Puesto final |
| 74 | 8 | 4 | `built` | 🏗️ | Edificios construidos |
| 75 | 8 | 5 | `eye` | 👁️ | Espectador |
| 76 | 8 | 6 | `up` | ⬆️ | Mejorar nivel |
| 77 | 8 | 7 | `refuse` | ✋ | Rechazo |
| 78 | 8 | 8 | `close` | ✕ | Cerrar |
| 79 | 8 | 9 | `spare1` |  | (reserva) |
| 80 | 8 | 10 | `spare2` |  | (reserva) |

## Dónde se usan hoy (para el paso de aplicar)
- `src/sim/state.ts` (BT y WEAP, campo `e`), `src/sim/map.ts` (TER), `src/sim/material.ts` (RES_E, 🚉, 📦).
- `src/client/render.ts`: dibujo en canvas con `fillText` de edificios, 📦 de obra, 🚢 ⛵ 🛳️ ✈️ 🛩️ (hay que pasar a `drawImage`).
- `src/client/ui.ts` e `index.html`: botones, HUD, diplomacia, tooltips, ayuda y pantalla final (muchos emojis van dentro de textos y `textContent`; habrá que cambiarlos por `<img>`/clases CSS).
- `src/sim/*.ts` (players, tax, combat, navy, air, trade, loop): emojis solo dentro de mensajes del registro (`Hooks.log`).
