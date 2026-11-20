// SOLMAR BAY — keyboard + mouse state, read every frame by the loop.
// Keys are tracked by e.code so layouts do not matter, and a held key
// stays true across slow headless frames (the smoke test holds keys
// for two seconds at a time on purpose).
export function init(S) {
  S.keys = S.keys || {};
  S.mouse = S.mouse || { down: false, x: 0, y: 0 };

  window.addEventListener('keydown', (e) => {
    S.keys[e.code] = true;
    // Any key skips the intro flyover while it is running.
    if (S.cutscene && typeof S.cutscene.skip === 'function') {
      S.cutscene.skip();
    }
  });
  window.addEventListener('keyup', (e) => {
    S.keys[e.code] = false;
  });
  window.addEventListener('blur', () => {
    for (const k of Object.keys(S.keys)) S.keys[k] = false;
    S.mouse.down = false;
  });
  window.addEventListener('mousedown', (e) => {
    S.mouse.down = true;
    S.mouse.x = e.clientX;
    S.mouse.y = e.clientY;
  });
  window.addEventListener('mouseup', () => {
    S.mouse.down = false;
  });
  window.addEventListener('mousemove', (e) => {
    S.mouse.x = e.clientX;
    S.mouse.y = e.clientY;
  });

  S.input = {
    down(code) {
      return !!S.keys[code];
    },
    any(...codes) {
      return codes.some((c) => !!S.keys[c]);
    },
  };
  return S.input;
}
