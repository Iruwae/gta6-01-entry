// SOLMAR BAY — keyboard + mouse input. Edge presses live for one frame.
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
        if (e.repeat) return;
        if (!input.keys.has(e.code)) input.pressed.add(e.code);
        input.keys.add(e.code);
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
