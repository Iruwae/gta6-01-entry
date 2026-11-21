// SOLMAR BAY — keyboard + mouse input. Edge presses live one frame.
export function createInput() {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false };
  let attached = false;

  function onKeyDown(e) {
    if (!e.repeat) pressed.add(e.code);
    keys.add(e.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
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
