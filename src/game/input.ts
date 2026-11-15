// Entrada: teclado, mouse (arrastrar para girar la cámara) y controles táctiles
// (joystick virtual y botones que escribe la interfaz de React).

export class Input {
  keys = new Set<string>();
  /** Joystick táctil (-1..1). */
  joy = { x: 0, y: 0 };
  /** Movimiento de cámara acumulado desde el último frame. */
  look = { dx: 0, dy: 0 };
  zoom = 0;
  actionPressed = false;
  actionHeld = false;
  jumpPressed = false;
  enabled = true;
  private dragging: number | null = null;
  private lastX = 0;
  private lastY = 0;
  private moved = 0;
  private el: HTMLElement;
  onTap: ((x: number, y: number) => void) | null = null;
  onKeyAction: ((key: string) => void) | null = null;
  /** Si devuelve verdadero (p. ej. hay un diálogo abierto), las teclas de acción no llegan al juego. */
  blocked: () => boolean = () => false;

  constructor(el: HTMLElement) {
    this.el = el;
    window.addEventListener('keydown', this.kd);
    window.addEventListener('keyup', this.ku);
    window.addEventListener('blur', this.blur);
    el.addEventListener('pointerdown', this.pd);
    window.addEventListener('pointermove', this.pm);
    window.addEventListener('pointerup', this.pu);
    window.addEventListener('pointercancel', this.pu);
    el.addEventListener('wheel', this.wheel, { passive: true });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private isTyping(e: Event) {
    const t = e.target as HTMLElement | null;
    return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  }

  private kd = (e: KeyboardEvent) => {
    if (this.isTyping(e)) return;
    const k = e.key.toLowerCase();
    if (!this.keys.has(k) && !this.blocked()) {
      if (k === 'e' || k === 'enter') this.actionPressed = true;
      if (k === ' ') this.jumpPressed = true;
      this.onKeyAction?.(k);
    }
    this.keys.add(k);
    if ((k === 'e' || k === 'enter') && !this.blocked()) this.actionHeld = true;
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  };
  private ku = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    this.keys.delete(k);
    if (k === 'e' || k === 'enter') this.actionHeld = false;
  };
  private blur = () => {
    this.keys.clear();
    this.actionHeld = false;
    this.joy.x = this.joy.y = 0;
  };
  private pd = (e: PointerEvent) => {
    if (this.dragging !== null) return;
    this.dragging = e.pointerId;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.moved = 0;
  };
  private pm = (e: PointerEvent) => {
    if (e.pointerId !== this.dragging) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.moved += Math.abs(dx) + Math.abs(dy);
    this.look.dx += dx;
    this.look.dy += dy;
  };
  private pu = (e: PointerEvent) => {
    if (e.pointerId !== this.dragging) return;
    this.dragging = null;
    if (this.moved < 10) {
      const r = this.el.getBoundingClientRect();
      this.onTap?.(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    }
  };
  private wheel = (e: WheelEvent) => {
    this.zoom += Math.sign(e.deltaY);
  };

  /** Dirección de movimiento (x: derecha, y: adelante) combinando teclado y joystick. */
  move(): { x: number; y: number; run: boolean } {
    if (!this.enabled) return { x: 0, y: 0, run: false };
    let x = this.joy.x;
    let y = this.joy.y;
    const k = this.keys;
    if (k.has('w') || k.has('arrowup')) y += 1;
    if (k.has('s') || k.has('arrowdown')) y -= 1;
    if (k.has('d') || k.has('arrowright')) x += 1;
    if (k.has('a') || k.has('arrowleft')) x -= 1;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y, run: k.has('shift') || Math.hypot(this.joy.x, this.joy.y) > 0.92 };
  }

  consume() {
    this.look.dx = this.look.dy = 0;
    this.zoom = 0;
    this.actionPressed = false;
    this.jumpPressed = false;
  }

  dispose() {
    window.removeEventListener('keydown', this.kd);
    window.removeEventListener('keyup', this.ku);
    window.removeEventListener('blur', this.blur);
    this.el.removeEventListener('pointerdown', this.pd);
    window.removeEventListener('pointermove', this.pm);
    window.removeEventListener('pointerup', this.pu);
    window.removeEventListener('pointercancel', this.pu);
  }
}
