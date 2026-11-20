// SOLMAR BAY — dialogue box (round 7 rebuild, builder D).
// Shows one speaker at a time: portrait, name, line of text. A click on
// the box advances to the next line; after the last line the box hides.
// Missions call ctx.api.showDialogue with their lines. As a backstop, the
// per-frame watch below also opens the canned briefing whenever a new
// mission with a briefing becomes current and no dialogue is showing.

const PORTRAIT_COLORS = {
  'LENA CRUZ': '#ff7ab8',
  'MARCO SOLIS': '#57c8ff',
  'VIC TORRES': '#ffc857',
};

const BRIEFINGS = {
  m1: [
    { speaker: 'LENA CRUZ', text: "Vic's got a job with your name on it, and it starts right here at the garage. You in, or are you still just talk?" },
    { speaker: 'MARCO SOLIS', text: "Easy, Lena. Kid's got good hands. Vic doesn't hire hands he can't trust — and he trusts you. For now." },
  ],
  m5: [
    { speaker: 'LENA CRUZ', text: "This one's the whole crew, not a solo run. I drive, you handle the loud part, and Vic counts the money. We do it clean." },
    { speaker: 'VIC TORRES', text: 'Listen to Lena. Nobody freelances on my jobs. We go in together, we come out together — and we get paid together.' },
  ],
};

function normalize(lines) {
  if (!Array.isArray(lines)) return [];
  return lines.map((l) => {
    if (typeof l === 'string') return { speaker: '', text: l };
    return {
      speaker: l.speaker || l.name || l.who || '',
      text: l.text || l.line || l.message || '',
    };
  }).filter((l) => l.text);
}

function initials(name) {
  const parts = String(name || '?').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.map((p) => p[0].toUpperCase()).slice(0, 2).join('');
}

export function init(ctx) {
  const S = ctx.state;
  const pick = (id) => (ctx.dom && ctx.dom[id]) || document.getElementById(id);
  let lines = [];
  let index = 0;
  let onDone = null;
  let briefedFor = null;

  function visible() {
    const el = pick('dialogue');
    return !!el && !el.classList.contains('hidden');
  }

  function render() {
    const line = lines[index];
    if (!line) { hideDialogue(); return; }
    const nameEl = pick('dlg-name');
    if (nameEl) nameEl.textContent = String(line.speaker || '').toUpperCase();
    const textEl = pick('dlg-text');
    if (textEl) textEl.textContent = line.text;
    const portraitEl = pick('dlg-portrait');
    if (portraitEl) {
      portraitEl.textContent = initials(line.speaker);
      const color = PORTRAIT_COLORS[String(line.speaker || '').toUpperCase()] || '#b9a7ff';
      portraitEl.style.background = color;
      portraitEl.style.color = '#1d1230';
    }
    const box = pick('dialogue');
    if (box) box.classList.remove('hidden');
  }

  function showDialogue(input, done) {
    const next = normalize(input);
    if (!next.length) return false;
    lines = next;
    index = 0;
    onDone = typeof done === 'function' ? done : null;
    try {
      if (S.missions && S.missions.current && S.missions.current.id) briefedFor = S.missions.current.id;
    } catch (e) { /* no mission to remember */ }
    render();
    return true;
  }

  function advanceDialogue() {
    if (!visible()) return false;
    try { if (ctx.api.audio && ctx.api.audio.click) ctx.api.audio.click(); } catch (e) { /* silent */ }
    index += 1;
    if (index >= lines.length) {
      hideDialogue();
      return true;
    }
    render();
    return true;
  }

  function hideDialogue() {
    const box = pick('dialogue');
    if (box) box.classList.add('hidden');
    lines = [];
    index = 0;
    const done = onDone;
    onDone = null;
    if (done) {
      try { done(); } catch (e) { /* the caller handles its own errors */ }
    }
  }

  function showBriefing(id) {
    const briefing = BRIEFINGS[id];
    if (!briefing) return false;
    briefedFor = id;
    return showDialogue(briefing);
  }

  ctx.api.showDialogue = showDialogue;
  ctx.api.startDialogue = showDialogue;
  ctx.api.dialogue = showDialogue;
  ctx.api.advanceDialogue = advanceDialogue;
  ctx.api.nextDialogue = advanceDialogue;
  ctx.api.hideDialogue = hideDialogue;
  ctx.api.showBriefing = showBriefing;
  ctx.api.missionBriefing = showBriefing;
  ctx.api.briefings = BRIEFINGS;

  const box = pick('dialogue');
  if (box) box.addEventListener('click', advanceDialogue);

  // Backstop: if a mission with a canned briefing starts and nothing is
  // showing its lines yet, open the briefing here. The guard on
  // briefedFor keeps it from re-opening after the player clicks through.
  ctx.updates.push(() => {
    try {
      const cur = S.missions && S.missions.current;
      if (!cur || !cur.id) return;
      if (visible()) return;
      if (briefedFor === cur.id) return;
      if (BRIEFINGS[cur.id]) showBriefing(cur.id);
    } catch (e) { /* dialogue must never break the loop */ }
    try {
      // A mission module may also queue lines on the state object.
      if (S.pendingDialogue && !visible()) {
        const queued = S.pendingDialogue;
        S.pendingDialogue = null;
        showDialogue(queued.lines || queued);
      }
    } catch (e) { /* ignore */ }
  });
}
