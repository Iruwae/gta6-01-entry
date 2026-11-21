// SOLMAR BAY — keyboard + mouse input with edge detection.
export function createInput() {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false };
  let attached = false;

  function onKeyDown(e) {
    if (e.repeat) return;
    keys.add(e.code);
    pressed.add(e.code);
  }
  function onKeyUp(e) {
    keys.delete(e.code);
  }
  function onMouseMove(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }
  function onMouseDown(e) {
    mouse.down = true;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }
  function onMouseUp() {
    mouse.down = false;
  }
  function onBlur() {
    keys.clear();
    mouse.down = false;
  }

  const input = {
    keys,
    pressed,
    mouse,
    attach() {
      if (attached) return;
      attached = true;
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('blur', onBlur);
    },
    endFrame() {
      pressed.clear();
    },
    wasPressed(code) {
      return pressed.has(code);
    },
    isDown(code) {
      return keys.has(code);
    },
  };
  return input;
}

export default createInput;
