// SOLMAR BAY — keyboard + mouse input. Held keys live in `keys`, fresh
// presses in `pressed` (cleared once per frame by endFrame, so a press
// is never lost between slow frames). Repeats never count as presses.
export function createInput() {
  const input = {
    keys: new Set(),
    pressed: new Set(),
    mouse: { x: 0, y: 0, down: false },
    attach() {
      window.addEventListener('keydown', (e) => {
        if (e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'Space') {
          e.preventDefault();
        }
        input.keys.add(e.code);
        if (!e.repeat) input.pressed.add(e.code);
      });
      window.addEventListener('keyup', (e) => {
        input.keys.delete(e.code);
      });
      window.addEventListener('blur', () => {
        input.keys.clear();
        input.pressed.clear();
        input.mouse.down = false;
      });
      window.addEventListener('mousedown', (e) => {
        input.mouse.x = e.clientX;
        input.mouse.y = e.clientY;
        input.mouse.down = true;
      });
      window.addEventListener('mouseup', (e) => {
        input.mouse.x = e.clientX;
        input.mouse.y = e.clientY;
        input.mouse.down = false;
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
