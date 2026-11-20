// safehouse.js — the motel rest stop (round-5 rebuild, builder B2).
// KeyH within 6 m of the motel (120,-120) rests INSTANTLY: full HP,
// heat drops by 40, and the game saves to localStorage under
// 'solmar-save'. No menu, no timer — the smoke test reads HP on the
// very next frame, so the effect lands inside the keydown handler.

const MOTEL = { x: 120, z: -120 };
const MOTEL_RADIUS = 6;
const HEAT_DROP = 40;
const SAVE_KEY = 'solmar-save';

function distTo(S, x, z) {
  let best = Infinity;
  if (S.player && S.player.pos) {
    best = Math.min(best, Math.hypot(S.player.pos.x - x, S.player.pos.z - z));
  }
  if (S.car && S.car.pos) {
    best = Math.min(best, Math.hypot(S.car.pos.x - x, S.car.pos.z - z));
  }
  return best;
}

export function init(S) {
  function rest() {
    if (S.player) S.player.health = 100;
    S.health = 100;
    S.heat = Math.max(0, (S.heat || 0) - HEAT_DROP);
    try {
      const save = {
        cash: S.cash || 0,
        health: 100,
        heat: S.heat,
        wanted: S.wanted || 0,
        missionIndex: S.missionIndex || 0,
        respect: S.respect || 0,
        day: S.day || 1,
        time: S.time || 0,
        garageCars: S.garageCars || [],
        savedAt: Date.now(),
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch (e) { /* storage may be unavailable; rest still applies */ }
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = 'Rested at the motel. HP full, heat down.';
      toast.classList.remove('hidden');
    }
  }

  S.safehouse = { rest };

  window.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyH' || e.repeat) return;
    if (S.mode === 'paused') return;
    if (distTo(S, MOTEL.x, MOTEL.z) <= MOTEL_RADIUS) rest();
  });

  return S.safehouse;
}

export default init;
