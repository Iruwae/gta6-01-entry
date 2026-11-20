import * as THREE from '../vendor/three.module.min.js';

// SOLMAR BAY — the single shared state object.
// createState() builds every field the smoke contract reads, with
// small working stand-ins for the directors the other modules own.
// When those modules initialise they replace the stand-ins with the
// real thing; until then the game still boots and stays testable.
export function createState() {
  const S = {
    mode: 'menu',
    cash: 120,
    health: 100,
    time: 0,
    day: 1,
    heat: 0,
    wanted: 0,
    district: 'downtown',
    radioStation: 0,
    missionIndex: 0,
    config: null,
    scene: null,
    camera: null,
    renderer: null,
    sunLight: null,
    skyDome: null,
    hemi: null,
    cutscene: null,
    car: null,
    heli: null,
    lastKnown: null,
    keys: {},
    mouse: { down: false, x: 0, y: 0 },
    _tick: [],
    updates: [],
    cars: [],
    cops: [],
    garageCars: [],
    people: [],
    traffic: [],
    respect: 0,
    dayNight: { phase: 'SUNSET', night: 0 },
    sideActivities: {
      race: { active: false },
      taxi: { active: false, dest: null, fare: 0 },
    },
    stats: { racesWon: 0, faresDone: 0, packages: 0, fencesSold: 0 },
    crew: { active: false, mesh: null },
  };

  S.player = {
    pos: new THREE.Vector3(-90, 0, -66),
    heading: 0,
    health: 100,
    armor: 0,
    speed: 0,
    ammo: 12,
    reloading: false,
    reloadT: 0,
    loadout: {
      equipped: 0,
      defs: [
        { name: 'PISTOL', mag: 12, damage: 12 },
        { name: 'SMG', mag: 30, damage: 8 },
        { name: 'SHOTGUN', mag: 6, damage: 30 },
        { name: 'RIFLE', mag: 20, damage: 22 },
      ],
      current() {
        return { def: this.defs[this.equipped] };
      },
    },
  };

  S.missions = {
    list: [],
    current: null,
    start(i) {
      const m = this.list[i];
      if (!m) return null;
      this.current = m;
      S.missionIndex = i;
      return m;
    },
  };

  S.heatDirector = {
    sprayBooth: { armed: true, pos: { x: -90, z: -58 }, r: 9 },
    tick() {},
  };

  S.respectDirector = {
    rank: { title: 'NOBODY' },
    _refresh() {
      const table = (S.config && S.config.respectRanks) || [
        { min: 0, title: 'NOBODY' },
        { min: 100, title: 'STREET HUSTLER' },
        { min: 400, title: 'SHOT CALLER' },
        { min: 900, title: 'BAY LEGEND' },
      ];
      let picked = table[0];
      for (const row of table) if (S.respect >= row.min) picked = row;
      this.rank = { title: picked.title };
    },
    add(n, why) {
      S.respect = Math.max(0, S.respect + n);
      this._refresh();
      return S.respect;
    },
    tick() {},
  };

  S.banterDirector = {
    _cooldown: 0,
    _say(speaker, line) {
      const el = document.getElementById('toast');
      if (el) el.textContent = speaker + ': "' + line + '"';
    },
    raceWin() {
      if (this._cooldown > 0) return;
      this._cooldown = 9;
      this._say('LENA', 'That was clean driving. The bay is ours tonight.');
    },
    nearMiss() {
      if (this._cooldown > 0) return;
      this._cooldown = 9;
      this._say('VIC', 'Easy. You scratch my paint, I scratch your cut.');
    },
    tick(dt) {
      if (this._cooldown > 0) this._cooldown -= dt;
    },
  };

  S.fenceDirector = {
    priceFor(car) {
      if (!car) return 0;
      const table = (S.config && S.config.fenceBase) || { bike: 220, sport: 480, pickup: 350, sedan: 300 };
      const base = table[car.kind] || 200;
      const engine = car.tune && typeof car.tune.engine === 'number' ? car.tune.engine : 0;
      const armor = car.tune && typeof car.tune.armor === 'number' ? car.tune.armor : 0;
      return base + engine * 50 + armor * 30;
    },
    wantedBonus(car) {
      if (!car) return 0;
      return (S.wanted || 0) * 15;
    },
    quote(car) {
      return this.priceFor(car) + this.wantedBonus(car);
    },
    tick() {},
  };

  S.challengesDirector = {
    today: [
      { id: 'ch-race', stat: 'racesWon', target: 1, reward: 150, text: 'Win a street race' },
      { id: 'ch-fare', stat: 'faresDone', target: 2, reward: 120, text: 'Finish 2 taxi fares' },
      { id: 'ch-pack', stat: 'packages', target: 3, reward: 100, text: 'Collect 3 packages' },
    ],
    _paid: new Set(),
    rows() {
      return this.today.map((c) => ({ text: c.text, reward: c.reward }));
    },
    tick() {
      for (const c of this.today) {
        if (this._paid.has(c.id)) continue;
        const have = (S.stats && S.stats[c.stat]) || 0;
        if (have >= c.target) {
          this._paid.add(c.id);
          S.cash += c.reward;
          const el = document.getElementById('toast');
          if (el) el.textContent = 'CHALLENGE DONE: ' + c.text + ' +$' + c.reward;
        }
      }
    },
  };

  return S;
}

// Called once from main.js in the shared init order. The object is
// already complete from createState(); this keeps the slot warm for
// anything that wants to hang extra runtime state off S later.
export function init(S) {
  if (!S._tick) S._tick = [];
  if (!S.updates) S.updates = [];
  return S;
}
