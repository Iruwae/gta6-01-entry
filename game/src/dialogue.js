// dialogue.js — the conversation box at the bottom of the screen.
// One job: show a speaker and a line, advance on click, hide when the
// conversation is over. Missions drive it for briefings and wrap-ups;
// banter stays on the toast, it never touches this box.
//
// A line is { speaker, text }. The portrait is a plain colour wash per
// speaker — no assets, no network — so the box works offline.

// One wash per voice in the story. Unknown speakers fall back to amber.
const PORTRAIT_WASH = {
  'LENA CRUZ': 'linear-gradient(135deg, #0e7490, #22d3ee)',
  'VIC TORRES': 'linear-gradient(135deg, #7a2a8a, #c026d3)',
  'MARCO SOLIS': 'linear-gradient(135deg, #166534, #4ade80)',
  'DISPATCH': 'linear-gradient(135deg, #1e3a8a, #60a5fa)',
  'NARRATOR': 'linear-gradient(135deg, #78350f, #f59e0b)',
};

const FALLBACK_WASH = 'linear-gradient(135deg, #ff7a3c, #7a2a8a)';

function washFor(speaker) {
  return PORTRAIT_WASH[speaker] || FALLBACK_WASH;
}

export function init(S) {
  const box = document.getElementById('dialogue');
  const portrait = document.getElementById('dlg-portrait');
  const nameEl = document.getElementById('dlg-name');
  const textEl = document.getElementById('dlg-text');

  // The conversation the box is showing right now. menu.js reads
  // `visible` + `lines` to decide whether to bring the box back after
  // a pause, so both stay truthful at all times.
  const dialogue = {
    visible: false,
    lines: [],
    index: 0,
    speaker: '',
    text: '',

    // Open the box on a fresh set of lines. Accepts plain strings
    // (spoken by the previous speaker) as well as { speaker, text }.
    show(rawLines) {
      const clean = (Array.isArray(rawLines) ? rawLines : []).map((line) => {
        if (typeof line === 'string') return { speaker: dialogue.speaker || 'NARRATOR', text: line };
        return { speaker: line.speaker || line.name || 'NARRATOR', text: line.text || '' };
      }).filter((line) => line.text.length > 0);
      if (clean.length === 0) return;
      dialogue.lines = clean;
      dialogue.index = 0;
      dialogue.visible = true;
      renderLine();
      if (box) box.classList.remove('hidden');
    },

    // Move to the next line, or close the box when the last one is done.
    // Returns true while a line is still showing.
    advance() {
      if (!dialogue.visible || dialogue.lines.length === 0) return false;
      dialogue.index += 1;
      if (dialogue.index >= dialogue.lines.length) {
        dialogue.hide();
        return false;
      }
      renderLine();
      return true;
    },

    hide() {
      dialogue.visible = false;
      dialogue.lines = [];
      dialogue.index = 0;
      dialogue.speaker = '';
      dialogue.text = '';
      if (box) box.classList.add('hidden');
    },

    // The line currently on screen, or null when the box is closed.
    current() {
      if (!dialogue.visible || dialogue.lines.length === 0) return null;
      return dialogue.lines[dialogue.index] || null;
    },
  };

  function renderLine() {
    const line = dialogue.lines[dialogue.index];
    if (!line) return;
    dialogue.speaker = line.speaker;
    dialogue.text = line.text;
    if (nameEl) nameEl.textContent = line.speaker;
    if (textEl) textEl.textContent = line.text;
    if (portrait) portrait.style.background = washFor(line.speaker);
  }

  // Clicking the box itself is the only way to advance: no key is
  // stolen, so driving keys keep working while a briefing is open.
  if (box) {
    box.addEventListener('click', (e) => {
      e.stopPropagation();
      dialogue.advance();
    });
  }

  S.dialogue = dialogue;
  return dialogue;
}

export default init;
