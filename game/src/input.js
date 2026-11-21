// SOLMAR BAY — keyboard + mouse input. Edge presses live for one frame.
export function createInput() {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false };
  let attached = false;

  function onKeyDown(e) {
    if (e.repeat) return; // a held key must not re-trigger edge actions
    keys.add(e.code);
    pressed.add(e.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
  }
  function onKeyUp(e) {
    keys.delete(e.code);
  }
  function onMouseDown(e) {
    mouse.down = true;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }
  function onMouseUp(e) {
    mouse.down = false;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }
  function onMouseMove(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }

  function attach() {
    if (attached) return;
    attached = true;
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
  }

  function endFrame() {
    pressed.clear();
  }

  return {
    keys,
    pressed,
    mouse,
    attach,
    endFrame,
    wasPressed(code) { return pressed.has(code); },
    isDown(code) { return keys.has(code); },
  };
}

export default createInput;
