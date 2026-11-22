// SOLMAR BAY — keyboard + mouse input. `keys` is the held set, `pressed`
// is the edge set (cleared by endFrame), and `justPressed` is a true edge:
// it fires once per physical press even when the OS auto-repeats the
// keydown while the key is held, which is what headless play needs.
export function createInput() {
  const input = {
    keys: new Set(),
    pressed: new Set(),
    prevKeys: new Set(),
    mouse: { x: 0, y: 0, down: false },
    _attached: false,

    attach() {
      if (this._attached) return;
      this._attached = true;
      window.addEventListener('keydown', (e) => {
        this.keys.add(e.code);
        this.pressed.add(e.code);
      });
      window.addEventListener('keyup', (e) => {
        this.keys.delete(e.code);
      });
      window.addEventListener('blur', () => {
        this.keys.clear();
        this.mouse.down = false;
      });
      window.addEventListener('mousedown', (e) => {
        this.mouse.down = true;
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
      });
      window.addEventListener('mouseup', (e) => {
        this.mouse.down = false;
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
      });
      window.addEventListener('mousemove', (e) => {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
      });
    },

    endFrame() {
      this.prevKeys = new Set(this.keys);
      this.pressed.clear();
    },

    wasPressed(code) {
      return this.pressed.has(code);
    },

    justPressed(code) {
      return this.keys.has(code) && !this.prevKeys.has(code);
    },

    isDown(code) {
      return this.keys.has(code);
    },
  };
  return input;
}

export default createInput;
