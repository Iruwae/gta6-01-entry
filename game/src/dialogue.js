// SOLMAR BAY — the dialogue box: queue, render, advance on click.
export function init(ctx) {
  const dom = ctx.dom;
  let queue = [];
  let current = null;

  function portraitFor(name) {
    if (name === 'LENA CRUZ') return { initials: 'LC', color: '#ff7a9e' };
    if (name === 'VIC TORRES') return { initials: 'VT', color: '#ffb347' };
    if (name === 'MARCO SOLIS') return { initials: 'MS', color: '#5fb4c9' };
    const parts = (name || '?').split(' ');
    const initials = parts.map((p) => p[0] || '').join('').slice(0, 2).toUpperCase() || '?';
    return { initials, color: '#7ea8ff' };
  }

  function render() {
    if (!current) {
      dom.dialogue.classList.add('hidden');
      return;
    }
    const p = portraitFor(current.name);
    dom['dlg-portrait'].textContent = p.initials;
    dom['dlg-portrait'].style.background = p.color;
    dom['dlg-name'].textContent = current.name;
    dom['dlg-text'].textContent = current.text;
    dom.dialogue.classList.remove('hidden');
  }

  function showDialogue(lines) {
    if (!lines || lines.length === 0) return;
    queue = lines.map((l) => ({ name: l.name, text: l.text }));
    current = queue.shift();
    render();
  }

  function advanceDialogue() {
    if (queue.length > 0) {
      current = queue.shift();
      render();
    } else {
      current = null;
      queue = [];
      render();
    }
  }

  ctx.api.showDialogue = showDialogue;
  ctx.api.advanceDialogue = advanceDialogue;
  ctx.dialogueQueue = () => queue;
  ctx.clearDialogue = () => {
    queue = [];
    current = null;
    render();
  };

  return { showDialogue, advanceDialogue };
}

export default init;
