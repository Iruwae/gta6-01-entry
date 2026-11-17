// SOLMAR BAY — keyboard + mouse input. Tracks held keys, edge-triggered
// presses, mouse drag orbit and click-to-shoot. No pointer lock: dragging
// orbits the camera, which also works in headless playtests.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseDX = 0; this.mouseDY = 0;
    this.mouseDown = false; this.mouseClicked = false;
    this.dragging = false; this.lastX = 0; this.lastY = 0;
    this._down = (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      this.pressed.add(e.code);
    };
    this._up = (e) => this.keys.delete(e.code);
    this._blur = () => { this.keys.clear(); this.dragging = false; };
    this._md = (e) => {
      this.mouseDown = true; this.mouseClicked = true;
      this.dragging = true; this.lastX = e.clientX; this.lastY = e.clientY;
    };
    this._mu = () => { this.mouseDown = false; this.dragging = false; };
    this._mm = (e) => {
      if (!this.dragging) return;
      this.mouseDX += e.clientX - this.lastX;
      this.mouseDY += e.clientY - this.lastY;
      this.lastX = e.clientX; this.lastY = e.clientY;
    };
    window.addEventListener('keydown', this._down);
    window.addEventListener('keyup', this._up);
    window.addEventListener('blur', this._blur);
    canvas.addEventListener('mousedown', this._md);
    window.addEventListener('mouseup', this._mu);
    window.addEventListener('mousemove', this._mm);
  }
  held(code) { return this.keys.has(code); }
  wasPressed(code) { return this.pressed.has(code); }
  axis(neg, pos) { return (this.keys.has(pos) ? 1 : 0) - (this.keys.has(neg) ? 1 : 0); }
  // Call once per frame after the game has read the input.
  endFrame() {
    this.pressed.clear();
    this.mouseDX = 0; this.mouseDY = 0; this.mouseClicked = false;
  }
  // Scripted input for the automated playtest and screenshot staging.
  inject(code, down) {
    if (down) { this.keys.add(code); this.pressed.add(code); }
    else this.keys.delete(code);
  }
}
