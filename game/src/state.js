// SOLMAR BAY — shared state (createState). Everything the modules talk
// through lives here: money, clock, heat, missions, loadout, directors.
// The directors are working fallbacks: feature modules wrap or replace
// them at init time, but the game still runs if a module is missing.
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function rankFor(points) {
  let rank = CONFIG.respectLadder[0];
  for (const row of CONFIG.respectLadder) {
    if (points >= row.min) rank = row;
  }
  return rank;
}

export function createState(hooks = {}) {
  const toast = typeof hooks.toast === 'function' ? hooks.toast : () => {};

  const S = {
    cash: CONFIG.startCash,
    day: CONFIG.startDay,
    time: 0,
    mode: 'menu',
    cutscene: false,
    heat: 0,
    wanted: 0,
    radioStation: 0,
    district: 'downtown',
    missionIndex: 0,
    respect: 0,
    car: null,
    cars: [],
    cops: [],
    garageCars: [],
    heli: null,
    lastKnown: null,
    packages: CONFIG.packages.map(([x, z], i) => ({ id: i, x, z, taken: false })),
    sunLight: null,
    skyDome: null,
    objective: 'Explore Solmar Bay — find work.',
    dayNight: { phase: 'SUNSET', night: 0 },
    player: {
      pos: new THREE.Vector3(-84, 0, -58),
      vel: new THREE.Vector3(),
      heading: 0,
      health: CONFIG.maxHealth,
      reloading: false,
      reloadT: 0,
      fireT: 0,
      loadout: null,
      mesh: null,
    },
    crew: { active: false, name: 'Lena Cruz', mesh: null },
    stats: { packages: 0, racesWon: 0, fencesSold: 0, faresDone: 0 },
    sideActivities: {
      taxi: { active: false, dest: null, fare: 0 },
      race: { active: false, gates: [], next: 0 },
    },
    missions: null,
    respectDirector: null,
    challengesDirector: null,
    banterDirector: null,
    heatDirector: null,
    fenceDirector: null,
    tick: null,
    _hooks: hooks,
  };

  // S.health mirrors S.player.health both ways.
  Object.defineProperty(S, 'health', {
    get() { return S.player.health; },
    set(v) { S.player.health = clamp(v, 0, CONFIG.maxHealth); },
    enumerable: true,
    configurable: true,
  });

  // ---- loadout: four slots, unlock-gated equip, ammo proxy ----
  const slots = CONFIG.weapons.map((def) => ({ def, mag: def.mag }));
  const loadout = {
    slots,
    _equipped: 0,
    get equipped() { return this._equipped; },
    set equipped(i) {
      if (i < 0 || i >= this.slots.length) return;
      // Unlock gate: a slot whose unlock count exceeds jobs done refuses.
      if (this.slots[i].def.unlock > S.missionIndex) return;
      this._equipped = i;
      this.slots[i].mag = this.slots[i].def.mag;
    },
    current() { return this.slots[this._equipped]; },
    equip(i) { this.equipped = i; },
  };
  S.player.loadout = loadout;
  Object.defineProperty(S.player, 'ammo', {
    get() { return S.player.loadout.current().mag; },
    set(v) { S.player.loadout.current().mag = v; },
    enumerable: true,
    configurable: true,
  });

  // ---- respect ----
  S.respectDirector = {
    rank: rankFor(0),
    add(n, why) {
      S.respect = Math.max(0, S.respect + n);
      this.rank = rankFor(S.respect);
      return this.rank;
    },
  };

  // ---- daily challenges ----
  S.challengesDirector = {
    today: CONFIG.challenges.map((c) => ({ ...c })),
    _paid: [],
    _day: 1,
    rows() {
      return this.today.map((c) => ({
        id: c.id,
        text: c.text,
        target: c.target,
        reward: c.reward,
        done: S.stats[c.stat] >= c.target,
        paid: this._paid.includes(c.id),
      }));
    },
    tick() {
      for (const c of this.today) {
        if (!this._paid.includes(c.id) && S.stats[c.stat] >= c.target) {
          this._paid.push(c.id);
          S.cash += c.reward;
          toast(`Challenge complete: ${c.text} — +$${c.reward}`);
        }
      }
    },
  };

  // ---- banter (fallback; crew.js installs the live director) ----
  S.banterDirector = {
    _cooldown: 0,
    say(speaker, text) {
      if (this._cooldown > 0) return false;
      toast(`${speaker}: "${text}"`);
      this._cooldown = 9;
      return true;
    },
    raceWin() {
      return this.say('LENA', 'Told you. Nobody outdrives us on this bay.');
    },
    pickup() {
      return this.say('LENA', 'Package is in the bag. Keep it smooth.');
    },
    heatUp() {
      return this.say('VIC', 'You got the whole bay looking at you. Lose them.');
    },
  };

  // ---- heat ----
  S.heatDirector = {
    sprayBooth: {
      armed: true,
      x: CONFIG.spray.x,
      z: CONFIG.spray.z,
      cost: CONFIG.spray.cost,
      radius: CONFIG.spray.radius,
    },
    add(n) { S.heat = clamp(S.heat + n, 0, 100); },
    cool(n) { S.heat = clamp(S.heat - n, 0, 100); },
  };

  // ---- fence ----
  S.fenceDirector = {
    priceFor(car) {
      const base = CONFIG.fenceBase[car.kind] || 300;
      const max = car.maxHealth || 100;
      const condition = clamp((car.health ?? max) / max, 0.2, 1);
      return Math.round(base * (0.5 + 0.5 * condition));
    },
    wantedBonus() {
      return S.wanted * 20;
    },
  };

  // ---- missions ----
  const missionList = CONFIG.missions.map((m, i) => ({ ...m, index: i }));
  S.missions = {
    current: null,
    list: missionList,
    start(idOrIndex) {
      const idx = typeof idOrIndex === 'number'
        ? idOrIndex
        : missionList.findIndex((m) => m.id === idOrIndex);
      if (idx < 0 || idx >= missionList.length) return null;
      const m = missionList[idx];
      const job = {
        id: m.id,
        index: idx,
        title: m.title,
        giver: m.giver,
        pay: m.pay,
        desc: m.desc,
        objective: m.desc,
        stage: 0,
        startedAt: S.time,
      };
      S.missions.current = job;
      S.objective = m.desc;
      if (m.id === 'm5') {
        S.crew.active = true;
        if (!S.crew.mesh) S.crew.mesh = { visible: true };
        else S.crew.mesh.visible = true;
      }
      return job;
    },
    complete() {
      const job = S.missions.current;
      if (!job) return;
      S.cash += job.pay;
      S.respectDirector.add(60, 'job done');
      S.missionIndex = Math.min(10, job.index + 1);
      S.missions.current = null;
      S.objective = 'Explore Solmar Bay — find work.';
    },
    abandon() {
      S.missions.current = null;
      S.objective = 'Explore Solmar Bay — find work.';
    },
  };

  // ---- per-frame tick ----
  S.tick = function (dt) {
    S.time += dt * CONFIG.minutesPerSecond;
    if (S.time >= CONFIG.minutesPerDay) {
      S.time -= CONFIG.minutesPerDay;
      S.day += 1;
    }
    S.wanted = Math.min(5, Math.floor(S.heat / 20));
    if (S.player.reloading) {
      S.player.reloadT -= dt;
      if (S.player.reloadT <= 0) {
        // Atomic commit: reloading clears and the magazine refills whole.
        S.player.reloading = false;
        S.player.reloadT = 0;
        const cur = S.player.loadout.current();
        cur.mag = cur.def.mag;
      }
    }
    if (S.player.fireT > 0) S.player.fireT -= dt;
    if (S.banterDirector._cooldown > 0) {
      S.banterDirector._cooldown = Math.max(0, S.banterDirector._cooldown - dt);
    }
    S.player.health = clamp(S.player.health, 0, CONFIG.maxHealth);
    // District = nearest district centre to the player.
    let best = null;
    let bestDist = Infinity;
    for (const d of CONFIG.districts) {
      const dx = S.player.pos.x - d.x;
      const dz = S.player.pos.z - d.z;
      const dist = dx * dx + dz * dz;
      if (dist < bestDist) { bestDist = dist; best = d; }
    }
    if (best) S.district = best.id;
  };

  return S;
}

export default createState;
