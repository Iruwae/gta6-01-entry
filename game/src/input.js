// Keyboard + mouse input for SOLMAR BAY.
export function createInput() {
  const input = {
    keys: new Set(),
    pressed: new Set(),
    mouse: { x: 0, y: 0, down: false },
    attach() {
      window.addEventListener('keydown', (e) => {
        if (!e.repeat) input.pressed.add(e.code);
        input.keys.add(e.code);
      });
      window.addEventListener('keyup', (e) => {
        input.keys.delete(e.code);
      });
      window.addEventListener('mousedown', (e) => {
        input.mouse.down = true;
        input.mouse.x = e.clientX;
        input.mouse.y = e.clientY;
        input.pressed.add('Mouse0');
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
      window.addEventListener('blur', () => {
        input.keys.clear();
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
