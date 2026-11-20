// SOLMAR BAY — game state for the GTA6-01 round 7 rebuild.
//
// createState() builds the one shared state object every module reads
// through ctx.state (also called S). The shape here is the debug-handle
// contract: the acceptance test drives the game through window.__solmar
// and expects exactly these fields, so nothing below is decorative.
//
// The clock: S.time counts minutes forward from the sunset opening.
// 18:28 plus 200 minutes is 21:48, when night engages. S.day starts 1.
// Heat runs 0-100 and one wanted star is 20 heat. Cash starts at $120.

import * as THREE from '../vendor/three.module.min.js';

const WEAPON_DEFS = [
  { name: 'PISTOL', mag: 12, damage: 25, rate: 0.28, unlockMission: 0 },
  { name: 'SMG', mag: 30, damage: 14, rate: 0.09, unlockMission: 1 },
  { name: 'SHOTGUN', mag: 6, damage: 60, rate: 0.9, unlockMission: 2 },
  { name: 'RIFLE', mag: 30, damage: 34, rate: 0.14, unlockMission: 3 },
];

const MISSION_TITLES = [
  'First Wheels',
  'Harbor Run',
  'The Strip Job',
  'Quiet Streets',
  'Crew Up',
  'Marina Lights',
  'Old Town Debt',
  'Night Shift',
  'The Big Score',
  'Bay Legend',
];

const RANK_TABLE = [
  { min: 0, title: 'NOBODY' },
  { min: 200, title: 'STREET HUSTLER' },
  { min: 500, title: 'BAY RUNNER' },
  { min: 900, title: 'CREW BOSS' },
  { min: 1500, title: 'BAY LEGEND' },
];

const CHALLENGE_DEFS = [
  { id: 'ch-packages', stat: 'packages', target: 3, reward: 100, text: 'Collect 3 packages' },
  { id: 'ch-race', stat: 'racesWon', target: 1, reward: 150, text: 'Win 1 street race' },
  { id: 'ch-taxi', stat: 'faresDone', target: 1, reward: 120, text: 'Finish 1 taxi fare' },
];

function rankFor(points) {
  let best = RANK_TABLE[0];
  for (const r of RANK_TABLE) if (points >= r.min) best = r;
  return best;
}

export function createState() {
  const S = {
    cash: 120,
    day: 1,
    // Minutes since the 18:28 sunset opening. 200 -> 21:48, night.
    time: 0,
    health: 100,
    mode: 'menu',
    cutscene: false,
    district: 'downtown',
    radioStation: 0,
    heat: 0,
    wanted: 0,
    respect: 0,
    missionIndex: 0,
    objective: 'Start a new game',
    car: null,
    cars: [],
    garageCars: [],
    cops: [],
    heli: null,
    lastKnown: null,
    sunLight: null,
    skyDome: null,
    dayNight: { phase: 'SUNSET', night: 0 },
    crew: { active: false, mesh: null, name: 'Lena Cruz' },
    flags: {},
  };

  // ---- the player -------------------------------------------------
  const slots = WEAPON_DEFS.map((def) => ({ def, ammo: def.mag }));
  const loadout = {
    equipped: 0,
    slots,
    current() {
      return slots[this.equipped];
    },
    canEquip(i, missionIndex) {
      if (i < 0 || i >= slots.length) return false;
      return missionIndex >= slots[i].def.unlockMission;
    },
    equip(i, missionIndex) {
      if (!this.canEquip(i, missionIndex)) return false;
      this.equipped = i;
      return true;
    },
  };

  S.player = {
    pos: new THREE.Vector3(0, 0, 0),
    heading: 0,
    speed: 0,
    health: 100,
    ammo: slots[0].ammo,
    reloading: false,
    reloadT: 0,
    loadout,
  };

  // ---- missions ---------------------------------------------------
  S.missions = {
    list: MISSION_TITLES.map((title, i) => ({
      id: 'm' + (i + 1),
      index: i,
      title,
      pay: [250, 300, 350, 400, 600, 450, 500, 550, 700, 1200][i],
    })),
    current: null,
    start(id) {
      let idx = -1;
      if (typeof id === 'number') idx = id;
      else if (typeof id === 'string') {
        const m = id.match(/^m(\d+)$/);
        if (m) idx = parseInt(m[1], 10) - 1;
        else idx = parseInt(id, 10);
      }
      if (idx < 0 || idx >= MISSION_TITLES.length) return null;
      const job = {
        id: 'm' + (idx + 1),
        index: idx,
        title: MISSION_TITLES[idx],
        stage: 0,
        pay: [250, 300, 350, 400, 600, 450, 500, 550, 700, 1200][idx],
      };
      this.current = job;
      S.objective = job.title;
      return job;
    },
    complete() {
      if (!this.current) return null;
      const done = this.current;
      S.cash += done.pay;
      S.missionIndex = Math.max(S.missionIndex, done.index + 1);
      this.current = null;
      return done;
    },
  };

  // ---- side activities -------------------------------------------
  S.sideActivities = {
    taxi: { active: false, dest: null, fare: 0, passenger: null },
    race: { active: false, gate: 0, gates: [], startedAt: 0 },
  };

  // ---- lifetime stats ---------------------------------------------
  S.stats = { packages: 0, racesWon: 0, fencesSold: 0, faresDone: 0 };

  // ---- respect ------------------------------------------------------
  S.respectDirector = {
    rank: { title: 'NOBODY', level: 0 },
    add(n, why) {
      S.respect += n;
      const r = rankFor(S.respect);
      this.rank.title = r.title;
      this.rank.level = RANK_TABLE.indexOf(r);
      return this.rank.title;
    },
  };

  // ---- daily challenges ---------------------------------------------
  S.challengesDirector = {
    today: CHALLENGE_DEFS.map((c) => ({ ...c })),
    _paid: [],
    rows() {
      return this.today.map((c) => ({
        id: c.id,
        text: c.text,
        reward: c.reward,
        stat: c.stat,
        target: c.target,
        progress: Math.min(S.stats[c.stat] || 0, c.target),
        done: (S.stats[c.stat] || 0) >= c.target,
        paid: this._paid.includes(c.id),
      }));
    },
    // Pay out any challenge whose target is met and that has not paid.
    // The challenges module calls this from its update loop.
    check() {
      for (const c of this.today) {
        if (this._paid.includes(c.id)) continue;
        if ((S.stats[c.stat] || 0) >= c.target) {
          this._paid.push(c.id);
          S.cash += c.reward;
        }
      }
    },
  };

  // ---- banter --------------------------------------------------------
  S.banterDirector = {
    _cooldown: 0,
    say(speaker, line) {
      if (typeof document !== 'undefined') {
        const el = document.getElementById('toast');
        if (el) el.textContent = speaker + ': "' + line + '"';
      }
      return speaker + ': "' + line + '"';
    },
    raceWin() {
      this._cooldown = 9;
      return this.say('LENA', 'Told you my lines were faster than yours. Nice driving, boss.');
    },
    missionWin() {
      this._cooldown = 9;
      return this.say('LENA', 'Clean job. Vic is going to love hearing about this one.');
    },
    idle() {
      this._cooldown = 9;
      return this.say('LENA', 'Bay is ours tonight. What are we hitting next?');
    },
  };

  // ---- heat / pay-n-spray --------------------------------------------
  S.heatDirector = {
    sprayBooth: { x: -90, z: -58, radius: 9, cost: 150, armed: true },
    addHeat(n) {
      S.heat = Math.max(0, Math.min(100, S.heat + n));
      S.wanted = Math.min(5, Math.floor(S.heat / 20));
      return S.wanted;
    },
    clearHeat() {
      S.heat = 0;
      S.wanted = 0;
    },
  };

  // ---- fence -----------------------------------------------------------
  S.fenceDirector = {
    basePrice: { bike: 220, sedan: 300, pickup: 350, sport: 600 },
    priceFor(car) {
      if (!car) return 0;
      return this.basePrice[car.kind] || 200;
    },
    wantedBonus(car) {
      if (!car) return 0;
      return car.wanted ? 0 : 0;
    },
  };

  return S;
}

export default createState;

// The boot hub builds the state itself, then calls this so the state
// module can wire anything that needs the full context later.
export function init(ctx) {
  if (!ctx.state) ctx.state = createState();
  ctx.S = ctx.state;
}
