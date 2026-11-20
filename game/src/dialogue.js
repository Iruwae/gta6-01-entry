// dialogue.js — the conversation panel (round-5 rebuild, builder B2).
// Owns #dialogue / #dlg-name / #dlg-text and paints a procedural
// portrait for whoever is speaking: no image files, just canvas arcs
// in each character's colours. Click the panel to advance; the last
// click closes it.
//
// NOTE (fix, second pass): the page ships #dlg-portrait as a DIV, not
// a canvas, so the portrait must live on a canvas we create inside
// that frame. Showing the panel never depends on the portrait — the
// panel un-hides first, the drawing is best-effort behind try/catch.

const PALETTES = {
  'LENA CRUZ': { bg: '#123f4d', skin: '#e8b48c', hair: '#ff7a59', shirt: '#0e7490', lip: '#c2410c' },
  'MARCO SOLIS': { bg: '#3d2b1f', skin: '#c98f5f', hair: '#241a12', shirt: '#78350f', lip: '#7c2d12' },
  'VIC TORRES': { bg: '#1d2733', skin: '#d9a066', hair: '#9aa0a6', shirt: '#334155', lip: '#57534e' },
};

function paletteFor(speaker) {
  return PALETTES[speaker] || { bg: '#27272a', skin: '#d9a066', hair: '#3f3f46', shirt: '#52525b', lip: '#44403c' };
}

function drawPortrait(canvas, speaker) {
  try {
    if (!canvas || typeof canvas.getContext !== 'function') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const p = paletteFor(speaker);
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    ctx.clearRect(0, 0, w, h);
    // Backdrop disc.
    ctx.fillStyle = p.bg;
    ctx.beginPath();
    ctx.arc(cx, h / 2, w / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    // Shoulders / shirt.
    ctx.fillStyle = p.shirt;
    ctx.beginPath();
    ctx.moveTo(cx - 30, h + 4);
    ctx.quadraticCurveTo(cx - 28, h - 26, cx, h - 26);
    ctx.quadraticCurveTo(cx + 28, h - 26, cx + 30, h + 4);
    ctx.closePath();
    ctx.fill();
    // Neck.
    ctx.fillStyle = p.skin;
    ctx.fillRect(cx - 7, h - 40, 14, 16);
    // Face.
    ctx.beginPath();
    ctx.arc(cx, h - 48, 19, 0, Math.PI * 2);
    ctx.fill();
    // Hair: a cap over the top of the face, shaped per character.
    ctx.fillStyle = p.hair;
    ctx.beginPath();
    ctx.arc(cx, h - 52, 19, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    if (speaker === 'LENA CRUZ') {
      // Long side hair falling past the jaw.
      ctx.fillRect(cx - 21, h - 54, 6, 26);
      ctx.fillRect(cx + 15, h - 54, 6, 26);
    } else if (speaker === 'VIC TORRES') {
      // Silver side part + a neat moustache.
      ctx.fillRect(cx - 19, h - 56, 12, 5);
      ctx.fillStyle = p.hair;
      ctx.fillRect(cx - 8, h - 38, 16, 4);
    } else {
      // Marco: short crop with a gold chain glint.
      ctx.fillStyle = '#f4d35e';
      ctx.fillRect(cx - 12, h - 28, 24, 2);
    }
    // Eyes.
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.arc(cx - 7, h - 50, 2.2, 0, Math.PI * 2);
    ctx.arc(cx + 7, h - 50, 2.2, 0, Math.PI * 2);
    ctx.fill();
    // Smile.
    ctx.strokeStyle = p.lip;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(cx, h - 42, 6, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  } catch (e) { /* portrait is decoration; never block the dialogue */ }
}

export function init(S) {
  const panel = document.getElementById('dialogue');
  const nameEl = document.getElementById('dlg-name');
  const textEl = document.getElementById('dlg-text');

  // Portrait surface: reuse the page's canvas if it really is one;
  // otherwise paint on a fresh canvas nested inside the portrait
  // frame (the page's #dlg-portrait is a DIV, so this is the path
  // that actually runs). Never touch a node we cannot draw on.
  let portrait = null;
  const frame = document.getElementById('dlg-portrait');
  if (frame && frame.tagName === 'CANVAS' && typeof frame.getContext === 'function') {
    portrait = frame;
  } else {
    portrait = document.createElement('canvas');
    portrait.width = 84;
    portrait.height = 84;
    portrait.style.cssText = 'width:100%;height:100%;border-radius:50%;display:block;';
    if (frame) frame.appendChild(portrait);
    else if (panel) panel.insertBefore(portrait, panel.firstChild);
  }

  const dialogue = {
    lines: [],
    index: 0,
    visible: false,

    show(lines) {
      if (!lines || !lines.length) return;
      dialogue.lines = lines.slice();
      dialogue.index = 0;
      dialogue.visible = true;
      // Un-hide FIRST: a portrait failure must never swallow a line.
      if (panel) panel.classList.remove('hidden');
      try { dialogue.render(); } catch (e) { /* portrait is best-effort */ }
    },

    render() {
      const line = dialogue.lines[dialogue.index];
      if (!line) return;
      if (nameEl) nameEl.textContent = line.speaker;
      if (textEl) textEl.textContent = line.text;
      drawPortrait(portrait, line.speaker);
    },

    next() {
      dialogue.index += 1;
      if (dialogue.index >= dialogue.lines.length) {
        dialogue.hide();
        return;
      }
      dialogue.render();
    },

    hide() {
      dialogue.lines = [];
      dialogue.index = 0;
      dialogue.visible = false;
      if (panel) panel.classList.add('hidden');
    },
  };

  S.dialogue = dialogue;

  // Adopt a briefing that missions.js painted before we were ready.
  if (Array.isArray(S._dlgLines) && S._dlgLines.length) {
    dialogue.lines = S._dlgLines.slice();
    dialogue.index = S._dlgIndex || 0;
    dialogue.visible = true;
    if (panel) panel.classList.remove('hidden');
    try { dialogue.render(); } catch (e) { /* portrait is best-effort */ }
    delete S._dlgLines;
    delete S._dlgIndex;
  }

  if (panel) {
    panel.addEventListener('click', () => dialogue.next());
  }

  return dialogue;
}

export default init;
