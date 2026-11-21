// Keyboard + mouse input for SOLMAR BAY. `keys` is the held set,
// `pressed` is the edge set (cleared by endFrame each frame). Key repeat
// events never re-arm the edge set, so holding a key fires it once.
export function createInput() {
  const input = {
    keys: new Set(),
    pressed: new Set(),
    mouse: { x: 0, y: 0, down: false },
    attached: false,

    attach() {
      if (input.attached) return;
      input.attached = true;
      window.addEventListener('keydown', (e) => {
        if (e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'Space') {
          e.preventDefault();
        }
        if (!e.repeat) input.pressed.add(e.code);
        input.keys.add(e.code);
      });
      window.addEventListener('keyup', (e) => {
        input.keys.delete(e.code);
      });
      window.addEventListener('blur', () => {
        input.keys.clear();
        input.mouse.down = false;
      });
      window.addEventListener('mousedown', (e) => {
        input.mouse.down = true;
        input.mouse.x = e.clientX;
        input.mouse.y = e.clientY;
      });
      window.addEventListener('mouseup', (e) => {
        input.mouse.down = false;
        input.mouse.x = e.clientX;
        input.mouse.y = e.clientY;
      });
      window.addEventListener('mousemove', (e) => {
        input.mouse.x = e.clientX;
        input.mouse.y = e.clientY;
      });
    },

    endFrame() {
      input.pressed.clear();
    },

    wasPressed(code) {
      return input.pressed.has(code);
    },

    isDown(code) {
      return input.keys.has(code);
    },
  };
  return input;
}

export default createInput;
