// Keyboard + mouse input.
//
// Edge presses are frame-safe: a keydown lands in `pressed` the moment it
// fires, and `beginFrame()` (called once per frame, before any update
// runs) moves that set into `active`, which is what `wasPressed` reads.
// A press that arrives mid-frame — e.g. during a long software render —
// therefore survives into the next frame's updates instead of being
// cleared by the same frame that never observed it.
export function createInput() {
  const input = {
    keys: new Set(),
    pressed: new Set(),
    active: new Set(),
    mouse: { x: 0, y: 0, down: false },
    _attached: false,
    attach() {
      if (input._attached) return;
      input._attached = true;
      window.addEventListener('keydown', (e) => {
        if (!input.keys.has(e.code)) input.pressed.add(e.code);
        input.keys.add(e.code);
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
          e.preventDefault();
        }
      });
      window.addEventListener('keyup', (e) => {
        input.keys.delete(e.code);
      });
      window.addEventListener('blur', () => {
        input.keys.clear();
        input.mouse.down = false;
      });
      window.addEventListener('mousemove', (e) => {
        input.mouse.x = e.clientX;
        input.mouse.y = e.clientY;
      });
      window.addEventListener('mousedown', (e) => {
        input.mouse.x = e.clientX;
        input.mouse.y = e.clientY;
        input.mouse.down = true;
      });
      window.addEventListener('mouseup', () => {
        input.mouse.down = false;
      });
    },
    // Call once per frame, before any update reads wasPressed.
    beginFrame() {
      input.active = new Set(input.pressed);
      input.pressed.clear();
    },
    // Kept for API compatibility; the edge set is consumed by beginFrame.
    endFrame() {},
    wasPressed(code) {
      return input.active.has(code);
    },
    isDown(code) {
      return input.keys.has(code);
    },
  };
  return input;
}

export default createInput;
