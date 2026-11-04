// @ts-nocheck  (cliente: DOM sin tipar de momento; la simulación sí se comprueba)
// Conecta los Hooks de la simulación con la interfaz del navegador.
startIcons();
Hooks.log = log;
Hooks.sfx = sfx;
Hooks.danger = () => { dangerAt = performance.now(); };
Hooks.shake = a => { shake = a; };
Hooks.onScreen = onScreen;
Hooks.tick = t => { if (propOpen && propOpen.until <= t) closeProp(); };
Hooks.end = win => { if (win) sfx("win"); endGame(win); };
Hooks.canOffer = () => !propOpen && tick - lastProp > 350;
Hooks.offer = offerToPlayer;
