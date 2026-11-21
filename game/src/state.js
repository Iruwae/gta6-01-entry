// SOLMAR BAY — shared state (createState) plus the working-fallback
// directors, so the game still runs if a feature module is missing.
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';

function nearestDistrict(x, z) {
  let best = CONFIG.districts[0];
  let bestD = Infinity;
  for (const d of CONFIG.districts) {
    const dd = (d.x - x) * (d.x - x) + (d.z - z) * (d.z - z);
    if (dd < bestD) { bestD = dd; best = d; }
  }
  return best.id;
}

function rankFor(respect) {
  let rank = CONFIG.respectLadder[0];
  for (const r of CONFIG.respectLadder) {
    if (respect >= r.min) rank = r;
  }
  return rank;
}

export function createState(hooks = {}) {
  const toast = hooks.toast || (() => {});
  const S = {
    cash: CONFIG.startCash,
    day: CONFIG.startDay,
    time: 0, // minutes after 18:28
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
    packages: [],
    sunLight: null,
    skyDome: null,
    objective: CONFIG.defaultObjective,
    dayNight: { phase: 'SUNSET', night: 0 },
    player: {
      pos: new THREE.Vector3(CONFIG.playerStart.x, 0, CONFIG.playerStart.z),
      vel: new THREE.Vector3(0, 0, 0),
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
    missions: { current: null, list: CONFIG.missions, start() {}, complete() {}, abandon() {} },
    respectDirector: null,
    challengesDirector: null,
    banterDirector: null,
    heatDirector: null,
    fenceDirector: null,
    tick() {},
  };

  // S.health mirrors S.player.health both ways.
  Object.defineProperty(S, 'health', {
    get() { return S.player.health; },
    set(v) { S.player.health = v; },
    enumerable: true,
    configurable: true,
  });

  // ---- Loadout: four weapon slots, equipped setter is the unlock gate.
  const slots = CONFIG.weapons.map((def) => ({ def, mag: def.mag }));
  const loadout = {
    slots,
    _equipped: 0,
    current() { return this.slots[this._equipped]; },
    equip(i) { this.equipped = i; },
  };
  Object.defineProperty(loadout, 'equipped', {
    get() { return this._equipped; },
    set(i) {
      if (i < 0 || i >= slots.length) return;
      if (slots[i].def.unlock > S.missionIndex) return; // locked: refuse
      this._equipped = i;
    },
    enumerable: true,
    configurable: true,
  });
  S.player.loadout = loadout;
  // S.player.ammo is a proxy for the current slot's magazine.
  Object.defineProperty(S.player, 'ammo', {
    get() { return loadout.current().mag; },
    set(v) { loadout.current().mag = v; },
    enumerable: true,
    configurable: true,
  });

  // ---- Missions
  S.missions.start = function start(idOrIndex) {
    const idx = typeof idOrIndex === 'string'
      ? CONFIG.missions.findIndex((m) => m.id === idOrIndex)
      : idOrIndex;
    if (idx < 0 || idx >= CONFIG.missions.length) return null;
    const m = CONFIG.missions[idx];
    const job = { id: m.id, index: idx, title: m.title, giver: m.giver, pay: m.pay, desc: m.desc, objective: m.desc, stage: 0, startedAt: S.time };
    S.missions.current = job;
    if (idx === 4) {
      S.crew.active = true;
      if (!S.crew.mesh) {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.7, 1.8, 0.4),
          new THREE.MeshBasicMaterial({ color: 0xff7a9e }),
        );
        mesh.position.copy(S.player.pos);
        mesh.visible = true;
        S.crew.mesh = mesh;
      } else {
        S.crew.mesh.visible = true;
      }
    }
    return job;
  };
  S.missions.complete = function complete() {
    const job = S.missions.current;
    if (!job) return;
    S.cash += job.pay;
    S.respectDirector.add(60, 'job done');
    S.missionIndex = Math.min(10, job.index + 1);
    S.missions.current = null;
  };
  S.missions.abandon = function abandon() {
    S.missions.current = null;
  };

  // ---- Respect
  S.respectDirector = {
    ladder: CONFIG.respectLadder,
    rank: rankFor(0),
    add(n, why) {
      S.respect = Math.max(0, S.respect + n);
      this.rank = rankFor(S.respect);
      return this.rank;
    },
  };

  // ---- Daily challenges
  const today = CONFIG.challenges.map((c) => ({ ...c }));
  S.challengesDirector = {
    today,
    _paid: [],
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
          toast(`Daily challenge done: ${c.text} — +$${c.reward}`);
        }
      }
    },
  };

  // ---- Banter (fallback; crew.js installs the live one)
  const banterLines = {
    raceWin: [
      ['LENA', 'See that? Told you the bay was ours tonight.'],
      ['LENA', 'Clean win. Vic is going to love this.'],
      ['VIC', 'That is how you drive a getaway. Beautiful.'],
    ],
    pickup: [
      ['LENA', 'Package is ours. Do not stop for anybody.'],
      ['VIC', 'Good hands. Bring it home.'],
    ],
    heatUp: [
      ['LENA', 'Cops on us — drive like you mean it!'],
      ['VIC', 'Heat is rising. Lose them before the bridge.'],
    ],
  };
  S.banterDirector = {
    _cooldown: 0,
    say(speaker, text) {
      if (this._cooldown > 0) return false;
      toast(`${speaker}: "${text}"`);
      this._cooldown = 9;
      return true;
    },
    raceWin() { const [s, t] = banterLines.raceWin[Math.floor(Math.random() * banterLines.raceWin.length)]; return this.say(s, t); },
    pickup() { const [s, t] = banterLines.pickup[Math.floor(Math.random() * banterLines.pickup.length)]; return this.say(s, t); },
    heatUp() { const [s, t] = banterLines.heatUp[Math.floor(Math.random() * banterLines.heatUp.length)]; return this.say(s, t); },
  };

  // ---- Heat
  S.heatDirector = {
    sprayBooth: { armed: true, x: CONFIG.sprayBooth.x, z: CONFIG.sprayBooth.z, cost: CONFIG.sprayBooth.cost, radius: CONFIG.sprayBooth.radius },
    add(n) { S.heat = Math.max(0, Math.min(100, S.heat + n)); },
    cool(n) { S.heat = Math.max(0, Math.min(100, S.heat - n)); },
  };

  // ---- Fence
  S.fenceDirector = {
    priceFor(car) {
      const base = CONFIG.fenceBase[car.kind] || 300;
      const max = car.maxHealth || 100;
      const condition = Math.max(0.2, Math.min(1, (car.health ?? max) / max));
      return Math.round(base * (0.5 + 0.5 * condition));
    },
    wantedBonus() { return S.wanted * 20; },
  };

  // ---- Frame tick
  S.tick = function tick(dt) {
    S.time += dt * CONFIG.minutesPerSecond;
    if (S.time >= CONFIG.minutesPerDay) {
      S.time -= CONFIG.minutesPerDay;
      S.day += 1;
    }
    S.wanted = Math.min(5, Math.floor(S.heat / 20));
    const p = S.player;
    if (p.reloading) {
      p.reloadT -= dt;
      if (p.reloadT <= 0) {
        p.reloading = false;
        p.reloadT = 0;
        p.loadout.current().mag = p.loadout.current().def.mag;
      }
    }
    if (p.fireT > 0) p.fireT -= dt;
    if (S.banterDirector._cooldown > 0) S.banterDirector._cooldown -= dt;
    p.health = Math.max(0, Math.min(CONFIG.maxHealth, p.health));
    S.district = nearestDistrict(p.pos.x, p.pos.z);
  };

  return S;
}

export default createState;
