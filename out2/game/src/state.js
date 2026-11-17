// Shared mutable game state. No imports — every system reads/writes this
// one object, so main.js never has to thread state through constructors.
export const S = {
  mode: 'title',        // 'title' | 'playing' | 'paused' | 'dead' | 'win'
  time: 0,              // seconds since session start (scaled by timescale)
  cash: 120,            // starting pocket money
  missionIndex: 0,      // next story mission to play (0-based)
  health: 100,
  wanted: 0,            // whole stars currently shown (0..5)
  heat: 0,              // raw 0..100 heat; wanted stars derive from it
  player: null,         // player controller object (set by main.js)
  car: null,            // car the player is currently driving, or null
  cars: [],             // traffic / parked cars in the world
  peds: [],             // pedestrians
  cops: [],             // pursuing police cars
  world: null,          // city.js world object
  fx: null,             // effects system (particles, flashes)
  audio: null,          // audio system
  hud: null,            // HUD updater
  missions: null,       // mission system
  input: null,          // Input instance
  stats: {
    kills: 0,
    carsStolen: 0,
    missionsDone: 0,
    shotsFired: 0,
  },
  muted: false,
  timescale: 1,         // 1 = normal; 0 pauses the simulation clock
};

const SAVE_KEY = 'solmar-bay-save-v1';

// Persist progress. Only plain data — never live objects or functions.
export function saveGame() {
  try {
    const p = S.player;
    const data = {
      cash: S.cash,
      missionIndex: S.missionIndex,
      health: S.health,
      player: p
        ? { x: p.pos.x, z: p.pos.z, heading: p.heading }
        : null,
      stats: { ...S.stats },
      savedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

// Returns the parsed save object, or null when there is none / it is corrupt.
export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    return data;
  } catch (e) {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (e) {
    // Storage unavailable — nothing to clear.
  }
}
