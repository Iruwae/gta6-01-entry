// SOLMAR BAY — keyboard + mouse state (round 9 rebuild).
// main.js wires the listeners through here; every module reads the same
// object from ctx.input. `keys` is what is held right now, `pressed` is
// the edge set for this frame (cleared by main.js at the end of each
// frame), so a 2-second hold at headless speed still registers exactly
// once per frame.

export function createInput() {
  const GAME_KEYS = new Set([
    'KeyW', 'KeyA', 'KeyS', 'KeyD',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'Space', 'KeyX', 'KeyR', 'KeyE', 'KeyQ', 'KeyF', 'KeyH',
    'KeyG', 'KeyT', 'KeyY', 'KeyV', 'KeyP',
    'Digit1', 'Digit2', 'Digit3', 'Digit4',
    'ShiftLeft', 'ShiftRight',
  ]);

  const input = {
    keys: new Set(),
    pressed: new Set(),
    mouse: { x: 0, y: 0, down: false, clicked: false },
    attached: false,

    isDown(code) {
      return this.keys.has(code);
    },
    wasPressed(code) {
      return this.pressed.has(code);
    },
    consume(code) {
      this.pressed.delete(code);
      return true;
    },

    attach() {
      if (this.attached) return;
      this.attached = true;

      window.addEventListener('keydown', (e) => {
        if (GAME_KEYS.has(e.code)) e.preventDefault();
        if (!e.repeat) {
          this.keys.add(e.code);
          this.pressed.add(e.code);
        }
      });
      window.addEventListener('keyup', (e) => {
        this.keys.delete(e.code);
      });
      window.addEventListener('blur', () => {
        this.keys.clear();
        this.mouse.down = false;
      });
      window.addEventListener('mousemove', (e) => {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
      });
      window.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
        this.mouse.down = true;
        this.mouse.clicked = true;
      });
      window.addEventListener('mouseup', (e) => {
        if (e.button !== 0) return;
        this.mouse.down = false;
      });
      document.addEventListener('contextmenu', (e) => {
        const c = document.getElementById('game-container');
        if (c && c.contains(e.target)) e.preventDefault();
      });
    },

    // Called by main.js after every frame's updates have run.
    endFrame() {
      this.pressed.clear();
      this.mouse.clicked = false;
    },
  };

  return input;
}

export default createInput;
