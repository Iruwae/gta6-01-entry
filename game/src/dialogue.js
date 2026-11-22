// SOLMAR BAY — the dialogue box. The queue, render and advance-on-click
// live in the boot hub (ctx.api.showDialogue / advanceDialogue); this
// module keeps the portrait rules in one place: pink for Lena, amber
// for Vic, blue for everyone else.
export function portraitFor(name) {
  if (name === 'LENA CRUZ') return { initials: 'LC', color: '#ff7a9e' };
  if (name === 'VIC TORRES') return { initials: 'VT', color: '#ffb347' };
  const parts = String(name || '?').split(' ');
  return {
    initials: parts.map((p) => p[0] || '').join('').slice(0, 2) || '?',
    color: '#5fb4c9',
  };
}

export function init(ctx) {
  ctx.api.portraitFor = portraitFor;
  ctx.flags.dialogue = true;
}
