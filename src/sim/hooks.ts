// Puntos de contacto entre la simulación y quien la use (navegador, servidor Node, pruebas).
// La simulación NUNCA toca el DOM: avisa a través de Hooks y el cliente los conecta a su interfaz.
const Hooks = {
  log(msg: string, kind?: string) {},
  sfx(name: string, vol?: number) {},
  danger() {},
  shake(amount: number) {},
  onScreen(x: number, y: number): boolean { return true; },
  now(): number { return performance.now(); },
  tick(t: number) {},
  end(win: boolean) {},
  canOffer(): boolean { return false; },
  offer(from: number, type: string) {},
};
