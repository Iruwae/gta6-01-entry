// SOLMAR BAY — dialogue.js
// Mission dialogue: a small data-driven runner (dialogue-systems) with
// visual-novel presentation (visual-novel-ui): portrait, nameplate, text,
// explicit advance (click / E) plus auto-advance. Gameplay never pauses
// for dialogue — the box is non-modal, bottom-centre, above the hint.
//
// Portraits are procedural canvas art (gamedev-2d-art-character-design:
// silhouette first, 2-3 decisive pixels for eyes/mouth, faction colour
// coding). Lena: long dark hair + gold hoop earring. Marco: red cap.
// No external assets, no network, fully deterministic.

import { S } from './state.js';

// ---- line data: stable IDs, speaker + expression + text -------------------
export const DIALOGUE = {
  m1_brief: [
    { who: 'lena', expr: 'happy', text: "Marco! You're back. I need wheels moved — take the sport car to the bank. Don't scratch it." },
    { who: 'marco', expr: 'neutral', text: 'One job, Lena. Then we talk about the debt.' },
  ],
  m1_done: [
    { who: 'lena', expr: 'happy', text: 'Clean delivery. $500 — you drive like you mean it, Marco.' },
  ],
  m2_brief: [
    { who: 'lena', expr: 'neutral', text: "Package at the harbor. Two drops, and the clock is ticking — late means no pay. Move!" },
    { who: 'marco', expr: 'happy', text: 'I drive fast. You pay fast. Deal?' },
  ],
  m2_done: [
    { who: 'lena', expr: 'happy', text: 'Both drops on time. $800. The harbor is starting to notice you.' },
  ],
  m3_brief: [
    { who: 'lena', expr: 'angry', text: 'A crew is muscling in on my harbor turf. Clear them out — then come home. Watch your back.' },
    { who: 'marco', expr: 'angry', text: 'They picked the wrong harbor.' },
  ],
  m3_done: [
    { who: 'lena', expr: 'happy', text: "Harbor's ours again. $1,200. You're not just a driver anymore, Marco." },
  ],
  m4_brief: [
    { who: 'lena', expr: 'neutral', text: "One last job. The bank van. Take it and the whole city comes for you — bring it home and we're square. All of it." },
    { who: 'marco', expr: 'neutral', text: "All of it? Then let's finish this." },
  ],
  m4_done: [
    { who: 'lena', expr: 'happy', text: "We did it. $2,500. Debt's gone, Marco. Solmar Bay is yours now." },
  ],
};

export const SPEAKERS = {
  lena: { name: 'LENA CRUZ', color: '#ffb703' },
  marco: { name: 'MARCO SOLIS', color: '#ff8a7a' },
};

// ---- procedural portraits ------------------------------------------------
// 96x96 canvas. Silhouette first: hair/cap shape reads the character at a
// glance; expressions are eye-brow angle + mouth curve only.

export function drawPortrait(canvas, who, expr) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width || 96;
  const H = canvas.height || 96;
  ctx.clearRect(0, 0, W, H);

  // Dusk panel backdrop.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#3a2350');
  bg.addColorStop(1, '#1c1030');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2;
  const skin = '#e8b98a';
  const skinShade = '#c98d5f';

  if (who === 'lena') {
    // Long dark hair: big silhouette behind the face, side part.
    ctx.fillStyle = '#241812';
    ctx.beginPath();
    ctx.ellipse(cx, 52, 34, 40, 0, 0, Math.PI * 2);
    ctx.fill();
    // Face.
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(cx, 50, 22, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hair fringe sweeping across the forehead.
    ctx.fillStyle = '#241812';
    ctx.beginPath();
    ctx.ellipse(cx - 2, 30, 23, 12, -0.25, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx - 20, 52, 7, 22, 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 20, 52, 7, 22, -0.12, 0, Math.PI * 2);
    ctx.fill();
    // Gold hoop earring (left).
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx - 21, 62, 5, 0, Math.PI * 2);
    ctx.stroke();
    drawFace(ctx, cx, 50, expr, '#2a1810', '#7a1f2b');
    // Neck + jacket shoulders.
    ctx.fillStyle = skinShade;
    ctx.fillRect(cx - 7, 74, 14, 10);
    ctx.fillStyle = '#7a1f2b';
    ctx.beginPath();
    ctx.moveTo(cx - 30, H);
    ctx.quadraticCurveTo(cx - 24, 78, cx - 8, 80);
    ctx.lineTo(cx + 8, 80);
    ctx.quadraticCurveTo(cx + 24, 78, cx + 30, H);
    ctx.closePath();
    ctx.fill();
  } else {
    // MARCO: red cap silhouette + stubble.
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(cx, 52, 22, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    // Cap dome + brim.
    ctx.fillStyle = '#cc2222';
    ctx.beginPath();
    ctx.ellipse(cx, 34, 23, 12, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - 23, 32, 46, 4);
    ctx.beginPath();
    ctx.ellipse(cx, 36, 26, 5, 0, 0, Math.PI);
    ctx.fill();
    // Stubble: shaded jaw.
    ctx.fillStyle = 'rgba(60,40,25,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, 66, 16, 10, 0, 0, Math.PI);
    ctx.fill();
    drawFace(ctx, cx, 52, expr, '#1a1210', '#5a2a20');
    // Burgundy jacket shoulders.
    ctx.fillStyle = '#7a1f2b';
    ctx.beginPath();
    ctx.moveTo(cx - 30, H);
    ctx.quadraticCurveTo(cx - 24, 80, cx - 8, 82);
    ctx.lineTo(cx + 8, 82);
    ctx.quadraticCurveTo(cx + 24, 80, cx + 30, H);
    ctx.closePath();
    ctx.fill();
    // White shirt strip.
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(cx - 4, 82, 8, 14);
  }
}

// Eyes + brows + mouth for one expression. Brow angle carries anger,
// mouth curve carries happy/neutral.
function drawFace(ctx, cx, cy, expr, dark, lip) {
  const eyeY = cy - 4;
  const browY = cy - 12;
  // Brows.
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (expr === 'angry') {
    ctx.moveTo(cx - 13, browY - 2); ctx.lineTo(cx - 4, browY + 2);
    ctx.moveTo(cx + 13, browY - 2); ctx.lineTo(cx + 4, browY + 2);
  } else {
    ctx.moveTo(cx - 13, browY); ctx.lineTo(cx - 4, browY - 1);
    ctx.moveTo(cx + 13, browY); ctx.lineTo(cx + 4, browY - 1);
  }
  ctx.stroke();
  // Eyes: 2 px dots, happy = slight upward curve.
  ctx.fillStyle = dark;
  ctx.beginPath(); ctx.arc(cx - 8, eyeY, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 8, eyeY, 2.4, 0, Math.PI * 2); ctx.fill();
  // Nose: one short line.
  ctx.strokeStyle = 'rgba(120,70,40,0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, eyeY + 4); ctx.lineTo(cx - 1, eyeY + 9);
  ctx.stroke();
  // Mouth.
  ctx.strokeStyle = lip;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  if (expr === 'happy') {
    ctx.arc(cx, cy + 8, 8, 0.15 * Math.PI, 0.85 * Math.PI);
  } else if (expr === 'angry') {
    ctx.moveTo(cx - 7, cy + 13); ctx.lineTo(cx + 7, cy + 13);
  } else {
    ctx.arc(cx, cy + 12, 6, 1.15 * Math.PI, 1.85 * Math.PI);
  }
  ctx.stroke();
}

// ---- runner ---------------------------------------------------------------

export class Dialogue {
  constructor() {
    this.queue = [];
    this.current = null;
    this.timer = 0;
    this.active = false;
    this._onDone = null;
  }

  // Play a line list; replaces any running dialogue (briefings win).
  play(lines, onDone) {
    if (!Array.isArray(lines) || lines.length === 0) return;
    this.queue = [...lines];
    this._onDone = typeof onDone === 'function' ? onDone : null;
    this.active = true;
    this._showNext();
  }

  _showNext() {
    this.current = this.queue.shift() || null;
    if (!this.current) {
      this.active = false;
      if (S && S.hud && typeof S.hud.hideDialogue === 'function') S.hud.hideDialogue();
      if (this._onDone) { const f = this._onDone; this._onDone = null; f(); }
      return;
    }
    this.timer = 5; // auto-advance after 5 s (visual-novel auto-play)
    if (S && S.hud && typeof S.hud.showDialogueLine === 'function') {
      S.hud.showDialogueLine(this.current.who, this.current.expr, this.current.text);
    }
  }

  // Explicit advance: click on the box or E. Never auto-commits a choice
  // (there are no choices — lines only), so advance is always safe.
  advance() {
    if (!this.active) return;
    this._showNext();
  }

  update(dt) {
    if (!this.active || !this.current) return;
    this.timer -= dt;
    if (this.timer <= 0) this._showNext();
  }
}
