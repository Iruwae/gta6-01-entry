// safehouse.js — SOLMAR BAY, round 8 rebuild.
// The safehouse motel at (120, -120). Press H nearby and the rest is
// instant: full health, heat wiped, and progress written to localStorage
// under the key solmar-save. The same file loads that save when the game
// boots, so a returning player picks up where they left off. No menu,
// no timer — one key, one rest.

const SAFEHOUSE = { x: 120, z: -120, r: 12 };
const SAVE_KEY = 'solmar-save';

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

function dist2d(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function init(ctx) {
  const S = ctx.state;
  const prev = {};

  function toast(msg) {
    if (ctx.api.toast) ctx.api.toast(msg);
    else {
      const t = document.getElementById('toast');
      if (t) t.textContent = msg;
    }
  }

  function saveGame() {
    try {
      const data = {
        cash: S.cash,
        health: S.player ? S.player.health : 100,
        day: S.day,
        time: S.time,
        respect: S.respect,
        missionIndex: S.missionIndex,
        radioStation: S.radioStation,
        stats: S.stats ? { ...S.stats } : {},
        pos: S.player && S.player.pos
          ? { x: S.player.pos.x, z: S.player.pos.z }
          : { x: -90, z: -58 },
        garageKinds: Array.isArray(S.garageCars)
          ? S.garageCars.map((c) => String(c.kind || 'car'))
          : [],
        savedAt: Date.now(),
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false; // storage unavailable: the game still runs
    }
  }

  function loadGame() {
    let data = null;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      data = JSON.parse(raw);
    } catch (e) {
      return false;
    }
    if (!data || typeof data !== 'object') return false;
    if (typeof data.cash === 'number') S.cash = data.cash;
    if (typeof data.day === 'number') S.day = data.day;
    if (typeof data.time === 'number') S.time = data.time;
    if (typeof data.respect === 'number') S.respect = data.respect;
    if (typeof data.missionIndex === 'number') S.missionIndex = data.missionIndex;
    if (typeof data.radioStation === 'number') S.radioStation = data.radioStation;
    if (typeof data.health === 'number' && S.player) {
      S.player.health = Math.max(0, Math.min(100, data.health));
      if (typeof S.health === 'number') S.health = S.player.health;
    }
    if (data.stats && S.stats) {
      for (const k of ['packages', 'racesWon', 'fencesSold', 'faresDone']) {
        if (typeof data.stats[k] === 'number') S.stats[k] = data.stats[k];
      }
    }
    if (data.pos && S.player && S.player.pos && typeof S.player.pos.set === 'function') {
      S.player.pos.set(data.pos.x || 0, 0, data.pos.z || 0);
    }
    return true;
  }

  function nearSafehouse() {
    const p = S.player && S.player.pos;
    if (!p) return false;
    return dist2d(p, SAFEHOUSE) < SAFEHOUSE.r;
  }

  function rest() {
    if (S.player) S.player.health = 100;
    if (typeof S.health === 'number') S.health = 100;
    S.heat = 0;
    if (typeof S.wanted === 'number') S.wanted = 0;
    saveGame();
    toast('Rested at the safehouse — full health, heat gone.');
    if (ctx.api.audio && typeof ctx.api.audio.pickup === 'function') {
      try { ctx.api.audio.pickup(); } catch (e) { /* audio is best-effort */ }
    }
  }

  // Load a previous run as soon as the game boots.
  loadGame();

  ctx.api.saveGame = saveGame;
  ctx.api.loadGame = loadGame;
  ctx.api.rest = rest;
  ctx.api.safehouse = { rest, saveGame, loadGame, near: nearSafehouse };

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      try { saveGame(); } catch (e) { /* nothing to do on the way out */ }
    });
  }

  ctx.updates.push(() => {
    const down = keyDown(ctx, 'KeyH');
    const was = !!prev.KeyH;
    prev.KeyH = down;
    if (!down || was) return;
    if (S.mode !== 'playing') return;
    if (nearSafehouse()) rest();
  });
}
