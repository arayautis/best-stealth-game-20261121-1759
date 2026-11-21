// Glimmerwick — keyboard and mouse input.
// One job: turn raw key/mouse events into the game's intent
// (move direction, sneak, toss a cog, menu clicks) with edge detection.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set(); // keys pressed since the last consume
    this.mouse = { x: 0, y: 0, clicked: false };
    this.canvas = canvas;
    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
        event.preventDefault();
      }
      if (!event.repeat) this.pressed.add(event.key.toLowerCase());
      this.keys.add(event.key.toLowerCase());
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.key.toLowerCase());
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
    });
    canvas.addEventListener('mousemove', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = event.clientX - rect.left;
      this.mouse.y = event.clientY - rect.top;
    });
    canvas.addEventListener('click', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = event.clientX - rect.left;
      this.mouse.y = event.clientY - rect.top;
      this.mouse.clicked = true;
    });
  }

  /** True while the key is held. */
  held(key) {
    return this.keys.has(key);
  }

  /** True once for the keypress; consumes it. */
  wasPressed(key) {
    if (this.pressed.has(key)) {
      this.pressed.delete(key);
      return true;
    }
    return false;
  }

  /** Movement vector from WASD / arrows, normalised. */
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.held('a') || this.held('arrowleft')) x -= 1;
    if (this.held('d') || this.held('arrowright')) x += 1;
    if (this.held('w') || this.held('arrowup')) y -= 1;
    if (this.held('s') || this.held('arrowdown')) y += 1;
    if (x !== 0 && y !== 0) {
      const length = Math.hypot(x, y);
      x /= length;
      y /= length;
    }
    return { x, y };
  }

  get sneaking() {
    return this.held('shift');
  }

  /** True once for a mouse click; consumes it. */
  consumeClick() {
    if (this.mouse.clicked) {
      this.mouse.clicked = false;
      return { x: this.mouse.x, y: this.mouse.y };
    }
    return null;
  }

  /** Clear edge-triggered state at the end of a frame. */
  endFrame() {
    this.pressed.clear();
    this.mouse.clicked = false;
  }
}
