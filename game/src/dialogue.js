// SOLMAR BAY — the dialogue box. The queue, render and advance live in
// the boot hub (ctx.api.showDialogue / advanceDialogue); this module
// adds keyboard advance (Enter or Space) so a briefing never needs the
// mouse, and the portrait colour rule (pink Lena, amber Vic, blue else).
export function portraitColor(name) {
  if (name === 'LENA CRUZ') return '#ff7a9e';
  if (name === 'VIC TORRES') return '#ffb347';
  return '#5fb4c9';
}

export function init(ctx) {
  const { state: S, input, dom } = ctx;
  ctx.api.portraitColor = portraitColor;
  ctx.updates.push(() => {
    if (!dom.dialogue || dom.dialogue.classList.contains('hidden')) return;
    if (S.mode === 'paused') return;
    if (input.wasPressed('Enter') || input.wasPressed('Space')) {
      ctx.api.advanceDialogue();
    }
  });
}
