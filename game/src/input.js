// SOLMAR BAY — keyboard and mouse input for the GTA6-01 round 7 rebuild.
//
// The held-keys set is the important part: at headless speed the game
// runs near one frame a second, so a key must stay "held" from the
// keydown event until its keyup, however many frames pass in between.
// A quick press that falls between two frames still counts, because
// the set is read on the next frame rather than on the event itself.

export function createInput() {
  return {
    keys: new Set(),
    mouse: { x: 0, y: 0, down: false, buttons: new Set() },
    isDown(code) {
      return this.keys.has(code);
    },
    anyDown(codes) {
      for (const c of codes) if (this.keys.has(c)) return true;
      return false;
    },
  };
}

export function init(ctx) {
  const input = createInput();
  ctx.input = input;

  const GAME_KEYS = new Set([
    'KeyW', 'KeyA', 'KeyS', 'KeyD',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'Space', 'ShiftLeft', 'ShiftRight',
  ]);

  function onKeyDown(e) {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    input.keys.add(e.code);
  }

  function onKeyUp(e) {
    input.keys.delete(e.code);
  }

  function onMouseMove(e) {
    input.mouse.x = e.clientX;
    input.mouse.y = e.clientY;
  }

  function onMouseDown(e) {
    input.mouse.down = true;
    input.mouse.buttons.add(e.button);
    input.mouse.x = e.clientX;
    input.mouse.y = e.clientY;
  }

  function onMouseUp(e) {
    input.mouse.down = false;
    input.mouse.buttons.delete(e.button);
  }

  function onBlur() {
    input.keys.clear();
    input.mouse.down = false;
    input.mouse.buttons.clear();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('blur', onBlur);

  input._detach = () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('blur', onBlur);
  };
}

export default init;
