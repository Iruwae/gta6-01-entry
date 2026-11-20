// dialogue.js — SOLMAR BAY dialogue box.
// Shows a queue of speaker lines in #dialogue. A click advances to the
// next line; the box hides when the queue runs out. Missions hand their
// briefing lines to show(); this file never invents mission flow.
export function init(ctx) {
  const S = ctx.state || ctx.S;
  const dom = ctx.dom || {};
  const el = (id) => dom[id] || document.getElementById(id);

  // Built-in briefings, used only when a caller asks for a mission's
  // dialogue by id instead of passing its own lines.
  const BRIEFINGS = {
    m1: [
      { name: 'LENA CRUZ', text: 'Sunset is burning out, hustler. Vic has a job and it starts with wheels — that garage is ours tonight.' },
      { name: 'MARCO SOLIS', text: 'Keys are in the coupe, kid. Do not scratch her. Vic hates scratches more than he hates cops.' },
    ],
    m5: [
      { name: 'LENA CRUZ', text: 'Crew night, baby. I drive, you shoot, we both get paid. Stay close and do what I say.' },
      { name: 'VIC TORRES', text: 'This one is big. Harbor at midnight — no mistakes, no witnesses, no heroes.' },
    ],
  };

  const PORTRAIT_TINT = {
    'LENA CRUZ': '#e07840', 'VIC TORRES': '#8a4a6b', 'MARCO SOLIS': '#3f7d6b',
    'NARRATOR': '#5a5470',
  };

  let lines = [];
  let idx = 0;
  let active = false;

  function normalise(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map((l) => {
      if (typeof l === 'string') return { name: 'NARRATOR', text: l };
      if (Array.isArray(l)) return { name: l[0] || 'NARRATOR', text: l[1] || '' };
      return { name: l.name || l.speaker || 'NARRATOR', text: l.text || l.line || '' };
    }).filter((l) => l.text);
  }

  function render() {
    const line = lines[idx];
    if (!line) { hide(); return; }
    const box = el('dialogue');
    const nameEl = el('dlg-name');
    const textEl = el('dlg-text');
    const faceEl = el('dlg-portrait');
    if (nameEl) nameEl.textContent = line.name;
    if (textEl) textEl.textContent = line.text;
    if (faceEl) {
      const parts = line.name.split(' ').filter(Boolean);
      faceEl.textContent = parts.map((p) => p[0]).join('').slice(0, 2);
      faceEl.style.background = PORTRAIT_TINT[line.name] || '#5a5470';
    }
    if (box) box.classList.remove('hidden');
  }

  function show(rawLines) {
    lines = normalise(rawLines);
    if (!lines.length) return false;
    idx = 0;
    active = true;
    render();
    return true;
  }

  function showMission(id) {
    const brief = BRIEFINGS[id];
    if (brief) return show(brief);
    return false;
  }

  function advance() {
    if (!active) return false;
    idx += 1;
    if (idx >= lines.length) { hide(); return false; }
    render();
    return true;
  }

  function hide() {
    active = false;
    lines = [];
    idx = 0;
    const box = el('dialogue');
    if (box) box.classList.add('hidden');
  }

  const box = el('dialogue');
  if (box) box.addEventListener('click', () => { advance(); });

  ctx.api.showDialogue = show;
  ctx.api.showDialog = show;
  ctx.api.dialogue = {
    show,
    showMission,
    advance,
    hide,
    isOpen: () => active,
    current: () => (active ? lines[idx] || null : null),
  };
}
