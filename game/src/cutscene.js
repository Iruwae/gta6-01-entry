// cutscene.js — intro flyover (round-5 rebuild, builder B2).
// S.cutscene is null between scenes and { t } while one plays. A new
// game starts it (we listen for #btn-new ourselves so the scene opens
// even if nothing else drives it); KeyX or ten seconds ends it.
//
// NOTE (fix, second pass): ending the flyover is also what leaves the
// main menu — the game sits in mode 'menu' while the cutscene plays,
// and nothing else flips it to 'playing'. So end() sets S.mode to
// 'playing' and hides the #menu overlay. Without this the menu layer
// keeps covering the screen: dialogue clicks land on it, police never
// spawn, and mouse fire never reaches the canvas.

const MAX_T = 10;

export function init(S) {
  if (typeof S.cutscene === 'undefined') S.cutscene = null;

  let panel = document.getElementById('cutscene');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'cutscene';
    panel.className = 'hidden';
    panel.innerHTML = '<div class="cut-title">SOLMAR BAY</div><div class="cut-sub">Every sunset is a getaway waiting to happen. Press X to skip.</div>';
    document.body.appendChild(panel);
  }

  function show() {
    if (panel) panel.classList.remove('hidden');
  }
  function hide() {
    if (panel) panel.classList.add('hidden');
  }

  function hideMenuOverlay() {
    const menu = document.getElementById('menu');
    if (menu) menu.classList.add('hidden');
  }

  function begin() {
    S.cutscene = { t: 0 };
    show();
  }
  function end() {
    S.cutscene = null;
    hide();
    // The flyover is the last step of starting a new game: leaving
    // it drops the player into the world and clears the menu layer.
    if (S.mode === 'menu' || !S.mode) {
      S.mode = 'playing';
      hideMenuOverlay();
    }
  }

  function update(dt) {
    if (S.cutscene) {
      S.cutscene.t = (S.cutscene.t || 0) + (dt || 0.15);
      show();
      if (S.cutscene.t > MAX_T) end();
    } else {
      hide();
    }
  }

  // New game: start the flyover just after the game's own handler runs,
  // unless the game already started one itself. Never restart the intro
  // while already playing (a focused New Game button + Enter/Space
  // would otherwise replay it mid-game).
  const btnNew = document.getElementById('btn-new');
  if (btnNew) {
    btnNew.addEventListener('click', () => {
      setTimeout(() => {
        if (!S.cutscene && S.mode !== 'playing') begin();
      }, 120);
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyX' && S.cutscene) end();
  });

  S.cutsceneDirector = { begin, end, update };

  setInterval(() => {
    try { update(0.15); } catch (e) { /* never break the page */ }
  }, 150);
  if (Array.isArray(S._moduleTicks)) S._moduleTicks.push((dt) => update(dt));

  return S.cutsceneDirector;
}

export default init;
