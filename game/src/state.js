// SOLMAR BAY — shared state. createState builds the whole game state S
// plus the directors (respect, challenges, banter, heat, fence) that the
// feature modules wrap or replace at init time. The directors here are
// working fallbacks, so the game still runs if a feature module is missing.
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';
import { clamp, pick } from './random.js';

function nearestDistrictId(x, z) {
  let best = CONFIG.districts[0];
  let bestD = Infinity;
  for (const d of CONFIG.districts) {
    const dd = (d.x - x) * (d.x - x) + (d.z - z) * (d.z - z);
    if (dd < bestD) {
      bestD = dd;
      best = d;
    }
  }
  return best.id;
}

function rankFor(points) {
  let rank = CONFIG.respectLadder[0];
  for (const entry of CONFIG.respectLadder) {
    if (points >= entry.min) rank = entry;
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
    packages: CONFIG.packages.map((p) => ({ x: p.x, z: p.z, taken: false })),
    sunLight: null,
    skyDome: null,
    objective: 'Explore Solmar Bay — find work.',
    dayNight: { phase: 'SUNSET', night: 0 },
    player: {
      pos: new THREE.Vector3(-84, 0, -58),
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
    missions: null,
    respectDirector: null,
    challengesDirector: null,
    banterDirector: null,
    heatDirector: null,
    fenceDirector: null,
    tick: null,
  };

  // ---- Loadout: four slots, one magazine each. The equipped setter is
  // the unlock gate — a slot whose unlock count exceeds missionIndex
  // refuses the switch.
  const slots = CONFIG.weapons.map((def) => ({ def, mag: def.mag }));
  const loadout = {
    slots,
    _equipped: 0,
    current() {
      return this.slots[this._equipped];
    },
    equip(i) {
      if (i < 0 || i >= this.slots.length) return false;
      if (this.slots[i].def.unlock > S.missionIndex) return false;
      this._equipped = i;
      return true;
    },
  };
  Object.defineProperty(loadout, 'equipped', {
    get() {
      return this._equipped;
    },
    set(i) {
      if (i >= 0 && i < this.slots.length && this.slots[i].def.unlock <= S.missionIndex) {
        this._equipped = i;
      }
    },
    enumerable: true,
    configurable: true,
  });
  S.player.loadout = loadout;

  // S.player.ammo is a proxy for the current slot's magazine.
  Object.defineProperty(S.player, 'ammo', {
    get() {
      return loadout.current().mag;
    },
    set(v) {
      loadout.current().mag = v;
    },
    enumerable: true,
    configurable: true,
  });

  // S.health mirrors S.player.health both ways.
  Object.defineProperty(S, 'health', {
    get() {
      return S.player.health;
    },
    set(v) {
      S.player.health = v;
    },
    enumerable: true,
    configurable: true,
  });

  // ---- Missions
  S.missions = {
    current: null,
    list: CONFIG.missions,
    start(idOrIndex) {
      const idx =
        typeof idOrIndex === 'number'
          ? idOrIndex
          : CONFIG.missions.findIndex((m) => m.id === idOrIndex);
      const def = CONFIG.missions[idx];
      if (!def) return null;
      const job = {
        id: def.id,
        index: idx,
        title: def.title,
        giver: def.giver,
        pay: def.pay,
        desc: def.desc,
        objective: def.desc,
        stage: 0,
        startedAt: S.time,
      };
      S.missions.current = job;
      if (def.id === 'm5') {
        S.crew.active = true;
        if (!S.crew.mesh) {
          const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.7, 1.7, 0.4),
            new THREE.MeshLambertMaterial({ color: 0xff7a9e })
          );
          mesh.visible = false;
          S.crew.mesh = mesh;
        }
        S.crew.mesh.visible = true;
      }
      return job;
    },
    complete() {
      const cur = S.missions.current;
      if (!cur) return;
      S.cash += cur.pay;
      S.respectDirector.add(60, 'job done');
      S.missionIndex = Math.min(10, cur.index + 1);
      S.missions.current = null;
    },
    abandon() {
      S.missions.current = null;
    },
  };

  // ---- Respect
  S.respectDirector = {
    rank: rankFor(0),
    add(n, why) {
      S.respect = Math.max(0, S.respect + n);
      this.rank = rankFor(S.respect);
      return this.rank;
    },
  };

  // ---- Daily challenges
  S.challengesDirector = {
    today: CONFIG.challenges.map((c) => ({ ...c })),
    _paid: [],
    rows() {
      return this.today.map((c) => ({
        id: c.id,
        text: c.text,
        target: c.target,
        reward: c.reward,
        done: (S.stats[c.stat] || 0) >= c.target,
        paid: this._paid.includes(c.id),
      }));
    },
    tick() {
      for (const c of this.today) {
        if (!this._paid.includes(c.id) && (S.stats[c.stat] || 0) >= c.target) {
          this._paid.push(c.id);
          S.cash += c.reward;
          toast(`Challenge complete: ${c.text} +$${c.reward}`);
        }
      }
    },
  };

  // ---- Banter (fallback; crew.js installs the live one)
  const banterLines = {
    raceWin: [
      'LENA: "Told you. Nobody outdrives us on this bay."',
      'LENA: "That was clean. Vic is going to love this."',
    ],
    pickup: [
      'LENA: "Package secured. You make this look easy."',
      'VIC: "Good hands. Keep it quiet and keep it moving."',
    ],
    heatUp: [
      'VIC: "You lit the whole bay up. Cool it down, kid."',
      'LENA: "Cops everywhere. Lose them before you call me."',
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
    raceWin() {
      return this.say('LENA', pick(banterLines.raceWin).replace(/^LENA: "/, '').replace(/"$/, ''));
    },
    pickup() {
      const line = pick(banterLines.pickup);
      const m = line.match(/^(LENA|VIC): "(.*)"$/);
      return m ? this.say(m[1], m[2]) : false;
    },
    heatUp() {
      const line = pick(banterLines.heatUp);
      const m = line.match(/^(LENA|VIC): "(.*)"$/);
      return m ? this.say(m[1], m[2]) : false;
    },
  };

  // ---- Heat
  S.heatDirector = {
    sprayBooth: {
      armed: true,
      x: CONFIG.locations.spray.x,
      z: CONFIG.locations.spray.z,
      cost: CONFIG.locations.spray.cost,
      radius: CONFIG.locations.spray.radius,
    },
    add(n) {
      S.heat = clamp(S.heat + n, 0, 100);
    },
    cool(n) {
      S.heat = clamp(S.heat - n, 0, 100);
    },
  };

  // ---- Fence
  S.fenceDirector = {
    priceFor(car) {
      const base = CONFIG.fenceBase[car.kind] || 0;
      const maxH = car.maxHealth || 100;
      const condition = clamp((car.health ?? maxH) / maxH, 0.2, 1);
      return Math.round(base * (0.5 + 0.5 * condition));
    },
    wantedBonus() {
      return S.wanted * 20;
    },
  };

  // ---- Per-frame state tick
  S.tick = function tick(dt) {
    S.time += dt * CONFIG.timeRate;
    if (S.time >= CONFIG.minutesPerDay) {
      S.time -= CONFIG.minutesPerDay;
      S.day += 1;
    }
    S.wanted = Math.min(CONFIG.maxWanted, Math.floor(S.heat / CONFIG.heatPerStar));
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
    p.health = clamp(p.health, 0, CONFIG.maxHealth);
    S.district = nearestDistrictId(p.pos.x, p.pos.z);
  };

  return S;
}

export default createState;
