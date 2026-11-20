// SOLMAR BAY — keyboard and mouse state (GTA6-01 round 8 rebuild).
// One held-keys set, fed by real keydown/keyup events. The set is never
// cleared per frame: at headless speed a frame can take two seconds, so
// a key held for two seconds must still read as held when the next
// frame finally runs. Edge presses (just pressed this frame) live in a
// separate set that main.js clears after each update pass.

const GAME_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyX', 'KeyR', 'KeyE', 'KeyQ', 'KeyF', 'KeyH', 'KeyG',
  'KeyT', 'KeyY', 'KeyV', 'KeyP',
  'Digit1', 'Digit2', 'Digit3', 'Digit4',
  'Space', 'ShiftLeft', 'ShiftRight', 'Enter', 'Escape',
]);

function makeInput() {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false, pressed: false, button: 0 };

  function onKeyDown(e) {
    if (e.repeat) return;
    keys.add(e.code);
    pressed.add(e.code);
    if (GAME_KEYS.has(e.code)) e.preventDefault();
  }

  function onKeyUp(e) {
    keys.delete(e.code);
  }

  function onBlur() {
    // A lost window must not leave a phantom held key behind.
    keys.clear();
  }

  function onMouseMove(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }

  function onMouseDown(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.down = true;
    mouse.pressed = true;
    mouse.button = e.button;
  }

  function onMouseUp(e) {
    mouse.down = false;
    mouse.button = e.button;
  }

  const input = {
    keys,
    pressed,
    mouse,
    // True while the key is physically held down.
    down(code) {
      return keys.has(code);
    },
    // True once for the frame in which the key went down; consumes it.
    consume(code) {
      if (pressed.has(code)) {
        pressed.delete(code);
        return true;
      }
      return false;
    },
    // Any of the movement keys held.
    moving() {
      return keys.has('KeyW') || keys.has('KeyA') || keys.has('KeyS') ||
        keys.has('KeyD') || keys.has('ArrowUp') || keys.has('ArrowDown') ||
        keys.has('ArrowLeft') || keys.has('ArrowRight');
    },
    // Called by the boot hub after every update pass.
    endFrame() {
      pressed.clear();
      mouse.pressed = false;
    },
    attach() {
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      window.addEventListener('blur', onBlur);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mouseup', onMouseUp);
    },
  };

  return input;
}

export const input = makeInput();

export default input;

// Wire the listeners and publish the input state onto the context.
export function init(ctx) {
  ctx.input = input;
  input.attach();
}
