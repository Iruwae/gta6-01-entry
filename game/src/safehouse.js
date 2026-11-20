// SOLMAR BAY — safehouse (round 7 rebuild, builder D).
// Press H at the safehouse to rest: instant, no menu, no timer. Resting
// heals to full HP, cools the heat right down, and saves the game to
// localStorage under the key solmar-save. A save found on start is
// loaded back in.

const SAFEHOUSE = { x: 120, z: -120 };
const SAFEHOUSE_RADIUS = 30;
const SAVE_KEY = 'solmar-save';

export function init(ctx) {
  const S = ctx.state;
  const toast = (msg) => { try { if (ctx.api.showToast) ctx.api.showToast(msg); } catch (e) { /* silent */ } };
  let lastAutoSave = 0;

  function saveGame() {
    try {
      const data = {
        cash: S.cash,
        day: S.day,
        time: S.time,
        health: (S.player && S.player.health) || S.health || 100,
        respect: S.respect,
        missionIndex: S.missionIndex,
        stats: S.stats ? { ...S.stats } : { packages: 0, racesWon: 0, fencesSold: 0, faresDone: 0 },
        garageCars: Array.isArray(S.garageCars) ? S.garageCars.map((c) => c.kind || 'car') : [],
        player: S.player && S.player.pos ? { x: S.player.pos.x, z: S.player.pos.z } : null,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  function loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return false;
      if (typeof data.cash === 'number') S.cash = data.cash;
      if (typeof data.day === 'number') S.day = data.day;
      if (typeof data.time === 'number') S.time = data.time;
      if (typeof data.respect === 'number') S.respect = data.respect;
      if (typeof data.missionIndex === 'number') S.missionIndex = data.missionIndex;
      if (typeof data.health === 'number') {
        if (S.player) S.player.health = data.health;
        S.health = data.health;
      }
      if (data.stats && typeof data.stats === 'object' && S.stats) {
        for (const k of ['packages', 'racesWon', 'fencesSold', 'faresDone']) {
          if (typeof data.stats[k] === 'number') S.stats[k] = data.stats[k];
        }
      }
      if (data.player && S.player && S.player.pos && typeof S.player.pos.set === 'function') {
        S.player.pos.set(data.player.x || 0, 0, data.player.z || 0);
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function rest() {
    if (S.player) S.player.health = 100;
    S.health = 100;
    S.heat = Math.max(0, (typeof S.heat === 'number' ? S.heat : 0) - 60);
    if (S.heat === 0) {
      S.wanted = 0;
      try { S.lastKnown = null; } catch (e) { /* ignore */ }
    }
    saveGame();
    toast('Rested at the safehouse — HP full, heat cooled off.');
    try { if (ctx.api.audio && ctx.api.audio.pickup) ctx.api.audio.pickup(); } catch (e) { /* silent */ }
    return true;
  }

  function nearSafehouse() {
    const p = S.player && S.player.pos;
    if (!p) return false;
    return Math.hypot(p.x - SAFEHOUSE.x, p.z - SAFEHOUSE.z) < SAFEHOUSE_RADIUS;
  }

  ctx.api.rest = rest;
  ctx.api.saveGame = saveGame;
  ctx.api.loadGame = loadGame;
  ctx.api.safehousePos = SAFEHOUSE;

  // Load any earlier save as the game starts.
  loadGame();

  window.addEventListener('keydown', (e) => {
    if (e.repeat || e.code !== 'KeyH') return;
    if (S.mode !== 'playing') return;
    if (!nearSafehouse()) return;
    rest();
  });

  window.addEventListener('beforeunload', () => {
    try { if (S.mode === 'playing') saveGame(); } catch (e) { /* ignore */ }
  });

  // Quiet autosave while playing, about once a minute.
  ctx.updates.push((dt, t) => {
    try {
      if (S.mode === 'playing' && t - lastAutoSave > 60) {
        lastAutoSave = t;
        saveGame();
      }
    } catch (e) { /* saving must never break the loop */ }
  });
}
