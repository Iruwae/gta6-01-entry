// SOLMAR BAY — cutscenes (round 7 rebuild, builder D).
// The intro flyover plays when a new game starts: S.cutscene is true
// and the cutscene overlay is visible. X (or a click on the overlay)
// skips it — S.cutscene goes false, the overlay hides, and the game
// resumes in playing mode. The same overlay serves short mission
// briefings through ctx.api.playCutscene.

const INTRO_TEXT = 'SOLMAR BAY — The sun is going down on the bay, and a nobody with a borrowed car is about to become somebody. Press X to skip.';
const MAX_CUTSCENE_SECONDS = 16;

export function init(ctx) {
  const S = ctx.state;
  const pick = (id) => (ctx.dom && ctx.dom[id]) || document.getElementById(id);
  let cutT = 0;

  function playCutscene(text) {
    S.cutscene = true;
    S.mode = 'cutscene';
    cutT = 0;
    const textEl = pick('cutscene-text');
    if (textEl) textEl.textContent = text || INTRO_TEXT;
    const overlay = pick('cutscene');
    if (overlay) overlay.classList.remove('hidden');
  }

  function skipCutscene() {
    if (!S.cutscene) return false;
    S.cutscene = false;
    const overlay = pick('cutscene');
    if (overlay) overlay.classList.add('hidden');
    if (S.mode === 'cutscene') S.mode = 'playing';
    return true;
  }

  ctx.api.playCutscene = playCutscene;
  ctx.api.startCutscene = playCutscene;
  ctx.api.skipCutscene = skipCutscene;
  ctx.api.endCutscene = skipCutscene;

  // The intro line is in place even if the menu shows the overlay
  // directly instead of calling playCutscene.
  try {
    const textEl = pick('cutscene-text');
    if (textEl && !textEl.textContent.trim()) textEl.textContent = INTRO_TEXT;
  } catch (e) { /* ignore */ }

  const overlay = pick('cutscene');
  if (overlay) overlay.addEventListener('click', skipCutscene);

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (!S.cutscene) return;
    if (e.code === 'KeyX' || e.code === 'Space' || e.code === 'Enter') skipCutscene();
  });

  ctx.updates.push((dt) => {
    try {
      if (!S.cutscene) return;
      // Keep the overlay visible for as long as the flag is set, even if
      // another module raised the flag without showing the overlay.
      const el = pick('cutscene');
      if (el && el.classList.contains('hidden')) el.classList.remove('hidden');
      cutT += dt || 0;
      if (cutT > MAX_CUTSCENE_SECONDS) skipCutscene();
    } catch (e) { /* cutscenes must never break the loop */ }
  });
}
