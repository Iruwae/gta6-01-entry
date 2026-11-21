// SOLMAR BAY — the dialogue box: a queue of {name, text} lines, rendered
// one at a time, advanced by clicking the box. The boot hub owns the queue
// and exposes it through ctx.api; this module owns the render step.
export function init(ctx) {
  const { dom } = ctx;

  function portraitFor(name) {
    const parts = (name || '?').split(' ');
    return parts.map((p) => p[0] || '').join('').slice(0, 2).toUpperCase();
  }
  function colorFor(name) {
    if (name === 'LENA CRUZ') return '#ff7a9e';
    if (name === 'VIC TORRES') return '#ffb347';
    return '#5fb4c9';
  }

  ctx.api.renderDialogue = function renderDialogue(line) {
    if (!dom.dialogue) return;
    if (!line) {
      dom.dialogue.classList.add('hidden');
      return;
    }
    dom.dialogue.classList.remove('hidden');
    if (dom['dlg-portrait']) {
      dom['dlg-portrait'].textContent = portraitFor(line.name);
      dom['dlg-portrait'].style.background = colorFor(line.name);
    }
    if (dom['dlg-name']) dom['dlg-name'].textContent = line.name;
    if (dom['dlg-text']) dom['dlg-text'].textContent = line.text;
  };
  ctx.dialogueReady = true;
}
