// cutscene.js — SOLMAR BAY, round 8 rebuild.
// Cutscenes: the intro flyover that plays when a new game starts, and
// short briefing cutscenes missions can raise. While one plays,
// S.cutscene is true, S.mode is 'cutscene', and the overlay is visible.
// Any key — X in particular — skips it at once: the flag clears, the
// overlay hides, and play resumes. A long intro also ends on its own
// after its timer, so a cutscene can never trap the player.

const INTRO_TEXT = 'SOLMAR BAY — the sun is going down on the bay, and a nobody with $120 in his pocket is about to make a name for himself. Press X to skip.';
const INTRO_SECONDS = 30;

function el(ctx, id) {
  if (ctx.dom && ctx.dom[id]) return ctx.dom[id];
  return document.getElementById(id);
}

function keyDown(ctx, code) {
  const inp = ctx.input;
  if (!inp) return false;
  if (typeof inp.isDown === 'function') {
    try { return !!inp.isDown(code); } catch (e) { /* fall through */ }
  }
  const k = inp.keys;
  if (k) {
    if (typeof k.has === 'function') return k.has(code);
    if (Array.isArray(k)) return k.includes(code);
    if (typeof k === 'object') return !!k[code];
  }
  if (typeof inp[code] !== 'undefined') return !!inp[code];
  return false;
}

export function init(ctx) {
  const S = ctx.state;
  const grab = (id) => el(ctx, id);
  let timer = 0;
  let autoAfter = INTRO_SECONDS;
  let onDone = null;
  let prevX = false;

  function show(text) {
    const overlay = grab('cutscene');
    const textEl = grab('cutscene-text');
    if (textEl) textEl.textContent = text;
    if (overlay) overlay.classList.remove('hidden');
    S.cutscene = true;
    S.mode = 'cutscene';
    timer = 0;
  }

  function playIntro() {
    onDone = null;
    autoAfter = INTRO_SECONDS;
    show(INTRO_TEXT);
  }

  function play(text, seconds, cb) {
    onDone = typeof cb === 'function' ? cb : null;
    autoAfter = typeof seconds === 'number' && seconds > 0 ? seconds : 8;
    show(String(text || ''));
  }

  function skip() {
    if (!S.cutscene) return;
    S.cutscene = false;
    const overlay = grab('cutscene');
    if (overlay) overlay.classList.add('hidden');
    S.mode = 'playing';
    timer = 0;
    const cb = onDone;
    onDone = null;
    if (cb) {
      try { cb(); } catch (e) { /* a briefing callback must never break the skip */ }
    }
  }

  // Any key skips — the keydown listener catches it even between frames,
  // and the update poll below is the backup.
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', () => {
      if (S.cutscene) skip();
    });
  }
  const overlay = grab('cutscene');
  if (overlay) overlay.addEventListener('click', skip);

  ctx.api.cutscene = {
    play,
    playIntro,
    skip,
    isActive: () => !!S.cutscene,
  };

  ctx.updates.push((dt) => {
    if (!S.cutscene) {
      prevX = false;
      return;
    }
    // Backup skip on X through the shared input state.
    const xDown = keyDown(ctx, 'KeyX');
    if (xDown && !prevX) {
      prevX = xDown;
      skip();
      return;
    }
    prevX = xDown;

    timer += dt;
    // Slow flyover: drift the camera across the bay while the intro runs.
    try {
      const cam = ctx.camera;
      if (cam) {
        const k = Math.min(1, timer / 14);
        const x = -170 + 230 * k;
        const y = 72 - 44 * k;
        const z = 150 - 185 * k;
        cam.position.set(x, y, z);
        cam.lookAt(0, 4, 0);
      }
    } catch (e) { /* the camera belongs to main.js; never fight it */ }

    if (timer >= autoAfter) skip();
  });
}
