// cutscene.js — SOLMAR BAY cutscenes.
// The intro flyover plays when a new game starts: a full-screen overlay
// cycling through title lines. X skips at any moment. While a cutscene
// runs, S.cutscene is true and S.mode is 'cutscene'.
export function init(ctx) {
  const S = ctx.state || ctx.S;
  const dom = ctx.dom || {};
  const el = (id) => dom[id] || document.getElementById(id);

  const INTRO_LINES = [
    'SOLMAR BAY',
    'Golden hour. The city is waking up and the bay is on fire.',
    'Vic Torres has a job with your name on it.',
    'Steal a car. Lose the heat. Become a legend.',
  ];
  const LINE_TIME = 2.8;

  let active = false;
  let lines = INTRO_LINES;
  let idx = 0;
  let timer = 0;

  function paint() {
    const box = el('cutscene');
    const text = el('cutscene-text');
    if (text) text.textContent = lines[idx] || '';
    if (box) box.classList.remove('hidden');
  }

  function play(id, customLines) {
    lines = Array.isArray(customLines) && customLines.length ? customLines : INTRO_LINES;
    if (id === 'intro') lines = INTRO_LINES;
    idx = 0;
    timer = 0;
    active = true;
    S.cutscene = true;
    S.mode = 'cutscene';
    paint();
    return true;
  }

  function skip() {
    if (!active && !S.cutscene) return false;
    active = false;
    S.cutscene = false;
    if (S.mode === 'cutscene') S.mode = 'playing';
    const box = el('cutscene');
    if (box) box.classList.add('hidden');
    return true;
  }

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code !== 'KeyX') return;
    if (S.cutscene) skip();
  });

  if (Array.isArray(ctx.updates)) {
    ctx.updates.push((dt) => {
      try {
        // If something else raised the cutscene flag without going
        // through play(), adopt it and run the intro lines.
        if (S.cutscene && !active) {
          lines = INTRO_LINES;
          idx = 0;
          timer = 0;
          active = true;
          if (S.mode !== 'cutscene') S.mode = 'cutscene';
          paint();
          return;
        }
        if (!active) return;
        if (!S.cutscene) { skip(); return; }
        timer += dt || 0.016;
        if (timer >= LINE_TIME) {
          timer = 0;
          idx += 1;
          if (idx >= lines.length) skip();
          else paint();
        }
      } catch (e) { /* cutscenes must never crash the loop */ }
    });
  }

  ctx.api.playCutscene = play;
  ctx.api.startCutscene = play;
  ctx.api.skipCutscene = skip;
  ctx.api.cutscene = { play, start: play, skip, isPlaying: () => active };
}
