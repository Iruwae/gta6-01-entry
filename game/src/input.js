// Keyboard + mouse input. No imports.
// Pointer-lock mouse-look when locked; click-drag look as a fallback so the
// game stays playable in browsers / embeds where pointer lock is refused.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.mouseDown = false;
    this.aimDown = false; // right mouse held: aim (over-the-shoulder)
    this._clicked = false;
    this._lastX = 0;
    this._lastY = 0;
    this._dragging = false;

    window.addEventListener('keydown', (e) => {
      // Stop Space / arrows scrolling the page while playing.
      if (
        e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown' ||
        e.code === 'ArrowLeft' || e.code === 'ArrowRight'
      ) {
        e.preventDefault();
      }
      this.keys.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    // Losing focus must not leave a key stuck down.
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseDown = false;
      this.aimDown = false;
      this._dragging = false;
    });

    // Left button fires, right button aims; drag-look works on either.
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouseDown = true;
      if (e.button === 2) this.aimDown = true;
      this._clicked = true;
      this._dragging = true;
      this._lastX = e.clientX;
      this._lastY = e.clientY;
    });
    // Never let the browser menu steal a right-click aim.
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
      if (e.button === 2) this.aimDown = false;
      this._dragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === canvas) {
        // Pointer-locked: use raw movement deltas.
        this.mouseDX += e.movementX || 0;
        this.mouseDY += e.movementY || 0;
      } else if (this._dragging) {
        // Fallback: click-drag look.
        this.mouseDX += e.clientX - this._lastX;
        this.mouseDY += e.clientY - this._lastY;
        this._lastX = e.clientX;
        this._lastY = e.clientY;
      }
    });
  }

  // True while the named physical key (e.code, e.g. 'KeyW') is held.
  down(code) {
    return this.keys.has(code);
  }

  // Accumulated mouse movement since the last call; resets to zero.
  takeMouse() {
    const out = { dx: this.mouseDX, dy: this.mouseDY };
    this.mouseDX = 0;
    this.mouseDY = 0;
    return out;
  }

  // True once per mouse press; consumes the flag.
  consumeClick() {
    const c = this._clicked;
    this._clicked = false;
    return c;
  }

  // Request pointer lock. Must be called from a user gesture (click).
  lockPointer() {
    if (document.pointerLockElement !== this.canvas) {
      try {
        this.canvas.requestPointerLock();
      } catch (e) {
        // Pointer lock unavailable — drag-look fallback still works.
      }
    }
  }

  get pointerLocked() {
    return document.pointerLockElement === this.canvas;
  }
}
