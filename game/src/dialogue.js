// dialogue.js — SOLMAR BAY, round 8 rebuild.
// The dialogue box: speaker name, portrait initials, and one line of
// text at a time. A click on the box advances to the next line; after
// the last line the box hides and an optional callback runs. Missions
// drive it through ctx.api.dialogue.show(lines, onDone), and a queue
// left on S.dialogueQueue is picked up automatically, so a briefing can
// be raised from either side without this module knowing the story.

const PORTRAIT_COLORS = {
  'LENA CRUZ': '#e8873a',
  'MARCO SOLIS': '#5a8fd0',
  'VIC TORRES': '#8fb45a',
};

function el(ctx, id) {
  if (ctx.dom && ctx.dom[id]) return ctx.dom[id];
  return document.getElementById(id);
}

function initials(name) {
  const parts = String(name || '?').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function normalize(lines) {
  if (!Array.isArray(lines)) return [];
  return lines.map((line) => {
    if (typeof line === 'string') return { name: '', text: line };
    if (line && typeof line === 'object') {
      return {
        name: line.name || line.speaker || line.who || '',
        text: line.text || line.line || '',
      };
    }
    return { name: '', text: String(line) };
  }).filter((l) => l.text);
}

export function init(ctx) {
  const S = ctx.state;
  let lines = [];
  let idx = 0;
  let onDone = null;
  let active = false;

  const grab = (id) => el(ctx, id);

  function render() {
    const line = lines[idx];
    if (!line) return;
    const box = grab('dialogue');
    const nameEl = grab('dlg-name');
    const textEl = grab('dlg-text');
    const portraitEl = grab('dlg-portrait');
    const name = String(line.name || '???').toUpperCase();
    if (nameEl) nameEl.textContent = name;
    if (textEl) textEl.textContent = line.text;
    if (portraitEl) {
      portraitEl.textContent = initials(name);
      portraitEl.style.background = PORTRAIT_COLORS[name] || '#7a6fd0';
    }
    if (box) box.classList.remove('hidden');
  }

  function hide() {
    active = false;
    lines = [];
    idx = 0;
    const box = grab('dialogue');
    if (box) box.classList.add('hidden');
    const cb = onDone;
    onDone = null;
    if (cb) {
      try { cb(); } catch (e) { /* a briefing callback must never break the box */ }
    }
  }

  function show(newLines, cb) {
    lines = normalize(newLines);
    idx = 0;
    onDone = typeof cb === 'function' ? cb : null;
    if (lines.length === 0) {
      hide();
      return;
    }
    active = true;
    render();
  }

  function advance() {
    if (!active) return;
    if (ctx.api.audio && typeof ctx.api.audio.click === 'function') {
      try { ctx.api.audio.click(); } catch (e) { /* audio is best-effort */ }
    }
    idx += 1;
    if (idx >= lines.length) hide();
    else render();
  }

  const box = grab('dialogue');
  if (box) box.addEventListener('click', advance);

  ctx.api.dialogue = {
    show,
    hide,
    advance,
    isActive: () => active,
    current: () => (active ? lines[idx] || null : null),
  };
  ctx.api.showDialogue = show;

  ctx.updates.push(() => {
    // Pick up a briefing queue left on state by a mission, if any.
    if (!active && Array.isArray(S.dialogueQueue) && S.dialogueQueue.length > 0) {
      const queued = S.dialogueQueue.splice(0, S.dialogueQueue.length);
      show(queued);
    }
  });
}
