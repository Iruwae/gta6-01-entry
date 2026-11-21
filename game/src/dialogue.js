// dialogue.js — SOLMAR BAY dialogue box.
// Missions and crew moments hand this module a queue of lines; it shows
// one at a time and advances on click. A line may be a plain string in
// "NAME: text" form or an object with a name/speaker and text.
export function init(ctx) {
  const S = ctx.state || ctx.S;
  const dom = ctx.dom || {};
  const $ = (id) => dom[id] || document.getElementById(id);

  let lines = [];
  let idx = 0;
  let open = false;
  let onDone = null;

  function normalize(line) {
    if (typeof line === 'string') {
      const m = line.match(/^([^:]{1,40}):\s*([\s\S]*)$/);
      if (m) return { name: m[1].trim(), text: m[2].trim() };
      return { name: '', text: line };
    }
    if (line && typeof line === 'object') {
      return {
        name: line.name || line.speaker || line.who || '',
        text: line.text || line.line || line.say || '',
      };
    }
    return { name: '', text: '' };
  }

  function portraitColor(name) {
    let h = 0;
    for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
    return 'hsl(' + h + ', 55%, 45%)';
  }

  function render() {
    const line = lines[idx];
    if (!line) { hide(); return; }
    const nameEl = $('dlg-name');
    const textEl = $('dlg-text');
    const portraitEl = $('dlg-portrait');
    if (nameEl) nameEl.textContent = line.name;
    if (textEl) textEl.textContent = line.text;
    if (portraitEl) {
      portraitEl.textContent = (line.name || '?').charAt(0);
      portraitEl.style.background = portraitColor(line.name);
    }
  }

  function show(newLines, done) {
    lines = (newLines || []).map(normalize).filter((l) => l.text);
    idx = 0;
    onDone = typeof done === 'function' ? done : null;
    if (!lines.length) { hide(); return; }
    open = true;
    const box = $('dialogue');
    if (box) box.classList.remove('hidden');
    render();
  }

  function advance() {
    if (!open) return;
    idx += 1;
    if (idx >= lines.length) hide();
    else render();
  }

  function hide() {
    open = false;
    const box = $('dialogue');
    if (box) box.classList.add('hidden');
    const done = onDone;
    onDone = null;
    if (done) done();
  }

  const box = $('dialogue');
  if (box) box.addEventListener('click', advance);

  const api = {
    show, say: show, start: show,
    advance, next: advance,
    hide, isOpen: () => open,
    current: () => (open && lines[idx]) || null,
  };
  ctx.api = ctx.api || {};
  ctx.api.dialogue = api;
  ctx.api.showDialogue = show;
  ctx.api.say = show;
  S.dialogueDirector = api;
}
