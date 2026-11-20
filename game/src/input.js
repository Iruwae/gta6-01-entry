// Keyboard + mouse input state (round 8 rewrite).
//
// The shape every module reads through ctx.input:
//   input.keys    — Set of e.code strings currently held down.
//   input.pressed — Set of e.code strings pressed since the last frame.
//                   main.js clears it after the module updates run, so a
//                   key pressed between frames is never lost, and a
//                   one-shot action (Q, E, R, ...) fires exactly once.
//   input.mouse   — { x, y, down, clicked } in client pixels.
//   input.isDown(code) / input.consume(code) — convenience readers.
//
// Modules should read keys/pressed, never add their own listeners.

export function createInput() {
  const input = {
    keys: new Set(),
    pressed: new Set(),
    mouse: { x: 0, y: 0, down: false, clicked: false },
    isDown(code) {
      return this.keys.has(code);
    },
    // Take a pressed key out of the set; returns true only the first time.
    consume(code) {
      if (this.pressed.has(code)) {
        this.pressed.delete(code);
        return true;
      }
      return false;
    },
  };
  // (added) Whether the latest mouse press started on the game canvas
  // (not on a UI panel): a press that begins on a panel is a UI click,
  // never a trigger pull.
  input.mouse.downOnCanvas = false;
  return input;
}

export function attachInput(input) {
  window.addEventListener('keydown', (e) => {
    // Ignore auto-repeat: only the first keydown counts as a press.
    if (e.repeat) return;
    input.keys.add(e.code);
    input.pressed.add(e.code);
    // Keep arrows / space from scrolling the page while playing.
    if (e.code === 'Space' || e.code.indexOf('Arrow') === 0) {
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    input.keys.delete(e.code);
  });

  window.addEventListener('blur', () => {
    input.keys.clear();
  });

  window.addEventListener('mousemove', (e) => {
    input.mouse.x = e.clientX;
    input.mouse.y = e.clientY;
  });

  window.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      input.mouse.down = true;
      input.mouse.clicked = true;
      // (added) Record whether this press began on the game canvas —
      // the HUD is pointer-transparent, so a press over open water
      // lands on the canvas, while a press on a panel (dialogue,
      // pause menu, shop) lands on that panel instead.
      input.mouse.downOnCanvas = !!(e.target && typeof e.target.closest === 'function' && e.target.closest('#game-container'));
    }
  });

  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
      input.mouse.down = false;
    }
  });

  return input;
}
