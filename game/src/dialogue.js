// SOLMAR BAY — the dialogue box: queue, render, advance on click.
// Installed by the boot hub's module loader; the boot hub falls back to
// its own copy if this module never loads.
export function init(ctx) {
  const { dom } = ctx;
  const queue = ctx.dialogueQueue;
  const colors = { 'LENA CRUZ': '#ff7a9e', 'VIC TORRES': '#ffb347' };

  function render() {
    const line = queue[0];
    if (!line) {
      dom.dialogue.classList.add('hidden');
      return;
    }
    dom.dialogue.classList.remove('hidden');
    if (dom.dlgName) dom.dlgName.textContent = line.name;
    if (dom.dlgText) dom.dlgText.textContent = line.text;
    if (dom.dlgPortrait) {
      dom.dlgPortrait.textContent = line.name.split(' ').map((w) => w[0]).join('');
      dom.dlgPortrait.style.background = colors[line.name] || '#5fb4c9';
    }
  }

  ctx.api.showDialogue = (lines) => {
    for (const l of lines) queue.push(l);
    render();
  };
  ctx.api.advanceDialogue = () => {
    if (!queue.length) return;
    queue.shift();
    render();
  };
  ctx.api.dialogueLoaded = true;
  if (dom.dialogue) {
    dom.dialogue.addEventListener('click', () => ctx.api.advanceDialogue());
  }
}

export default { init };
