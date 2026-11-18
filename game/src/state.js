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
  heli: null,           // PD helicopter (3+ stars) or null
  skyWatch: null,       // SKY-7 news chopper (2+ stars) or null (round 5)
  heatDirector: null,   // wanted-depth director (round 5)
  cityLife: null,       // ambient-life director (round 5)
  menuDirector: null,   // mission-select + stats director (round 5)
  radioDirector: null,  // merged-station radio director (round 5)
  shopDirector: null,   // 24/7 MART shop (round 5)
  safehouseDirector: null, // Sunset Motel safehouse (round 5)
  garageDirector: null, // Bayline Garage collection + upgrades (round 5)
  districtDirector: null, // named districts (round 5)
  crew: null,           // Lena, getaway companion (round 5)
  sideActivities: null, // street race + taxi + packages (round 5)
  dayNight: null,       // day/night cycle director (round 5)
  respect: 0,            // respect points — the name Marco earns (respect.js)
  respectDirector: null, // respect meter + rank titles (round 5)
  banterDirector: null,  // Lena + Vic one-liners (round 5)
  cutsceneDirector: null, // intro / outro flyover (round 5)
  fenceDirector: null,   // Vic's fence at the harbor (round 5)
  challengesDirector: null, // three daily challenges (round 5)
  cutscene: false,       // a cutscene owns the camera right now
  outroPending: false,   // the ending sweep plays once the done dialogue clears
  garageCars: [],       // cars stored in the garage (garage.js shape)
  sunLight: null,       // directional sun (day/night owns intensity)
  hemiLight: null,      // hemisphere bounce light (day/night owns intensity)
  skyDome: null,        // sky dome mesh (day/night owns uNight)
  district: 'downtown', // current district id
  districtName: 'DOWNTOWN', // current district display name
  districtFog: 0xe08a5e, // current district fog tint
  replayPay: 1,         // mission payout multiplier (0.5 on job replays)
  heliOverhead: 0,      // 0..1: how directly the news chopper sits overhead
  lastKnown: null,      // police last-known position {x, z, seenAt} or null
  radioStation: 0,      // index into CFG.RADIO
  dialogue: null,       // dialogue runner (set by main.js)
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
    packages: 0,    // collectibles found this run (side.js)
    racesWon: 0,    // street races won this run (side.js)
    faresDone: 0,   // taxi fares delivered this run (side.js)
    heatShed: 0,    // heat shed at hideouts + spray booth (challenges)
    crewKills: 0,   // rivals Lena dropped (challenges)
    fencesSold: 0,  // cars sold to Vic's fence (challenges)
    nightCash: 0,   // cash earned after nightfall (challenges)
    cleanJobs: 0,   // jobs finished at 1 star or less (challenges)
    topSpeed: 0,    // fastest speed hit in any car, m/s (challenges)
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
      respect: S.respect || 0,
      garageCars: Array.isArray(S.garageCars) ? S.garageCars : [],
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
