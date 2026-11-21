// cutscene.js — SOLMAR BAY intro flyover and cutscene overlay.
// A new game opens on the intro. X skips it at any moment; clicking the
// overlay skips too. When it ends the game returns to normal play.
export function init(ctx) {
  const S = ctx.state || ctx.S;
  const dom = ctx.dom || {};
  const $ = (id) => dom[id] || document.getElementById(id);

  const INTRO_LINES = [
    'SOLMAR BAY',
    'The sun is going down on the bay, and the city is waking up.',
    'You came here with nothing but a name nobody knows yet.',
    'Vic Torres has a job for you. Lena Cruz is already waiting.',
    'Steal a car. Run the job. Make the bay remember you.',
  ];

  let playing = false;
  let lineIdx = 0;
  let lineTimer = null;
  let endTimer = null;

  function clearTimers() {
    if (lineTimer) { clearInterval(lineTimer); lineTimer = null; }
    if (endTimer) { clearTimeout(endTimer); endTimer = null; }
  }

  function setText(text) {
    const el = $('cutscene-text');
    if (el) el.textContent = text;
  }

  function play(lines) {
    const script = (lines && lines.length) ? lines : INTRO_LINES;
    playing = true;
    lineIdx = 0;
    S.cutscene = true;
    S.mode = 'cutscene';
    const overlay = $('cutscene');
    if (overlay) overlay.classList.remove('hidden');
    setText(script[0]);
    clearTimers();
    lineTimer = setInterval(() => {
      lineIdx = (lineIdx + 1) % script.length;
      setText(script[lineIdx]);
    }, 4000);
    endTimer = setTimeout(end, 30000);
  }

  function end() {
    if (!playing) return;
    playing = false;
    clearTimers();
    S.cutscene = false;
    if (S.mode === 'cutscene') S.mode = 'playing';
    const overlay = $('cutscene');
    if (overlay) overlay.classList.add('hidden');
  }

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'KeyX' && playing) end();
  });

  const overlay = $('cutscene');
  if (overlay) overlay.addEventListener('click', () => { if (playing) end(); });

  const api = {
    play, playIntro: () => play(INTRO_LINES),
    skip: end, end, isPlaying: () => playing,
  };
  ctx.api = ctx.api || {};
  ctx.api.cutscene = api;
  S.cutsceneDirector = api;
}
