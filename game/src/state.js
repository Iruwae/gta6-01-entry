// SOLMAR BAY — shared state. createState builds the whole game state S
// plus working fallback directors, so the game still runs if a feature
// module is missing; the real modules wrap or replace them at init time.
import { CONFIG } from './config.js';
import * as THREE from '../vendor/three.module.min.js';

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function rankFor(points) {
  let best = CONFIG.respectLadder[0];
  for (const r of CONFIG.respectLadder) {
    if (points >= r.min) best = r;
  }
  return { title: best.title, min: best.min };
}

function nearestDistrict(x, z) {
  let best = CONFIG.districts[0];
  let bd = Infinity;
  for (const d of CONFIG.districts) {
    const dd = (d.x - x) * (d.x - x) + (d.z - z) * (d.z - z);
    if (dd < bd) {
      bd = dd;
      best = d;
    }
  }
  return best.id;
}

export function createState(hooks = {}) {
  const toast = hooks.toast || (() => {});
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
    packages: [],
    sunLight: null,
    skyDome: null,
    objective: CONFIG.defaultObjective,
    dayNight: { phase: 'SUNSET', night: 0 },
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

  // ---- player + loadout ----
  const slots = CONFIG.weapons.map((def) => ({ def, mag: def.mag }));
  let equippedIdx = 0;
  const loadout = {
    slots,
    current() {
      return slots[equippedIdx];
    },
    equip(i) {
      if (i < 0 || i >= slots.length) return false;
      if (slots[i].def.unlock > S.missionIndex) return false;
      equippedIdx = i;
      return true;
    },
  };
  Object.defineProperty(loadout, 'equipped', {
    get() {
      return equippedIdx;
    },
    set(i) {
      if (i < 0 || i >= slots.length) return;
      if (slots[i].def.unlock > S.missionIndex) return;
      equippedIdx = i;
    },
    enumerable: true,
    configurable: true,
  });
  const player = {
    pos: new THREE.Vector3(CONFIG.playerStart.x, 0, CONFIG.playerStart.z),
    vel: new THREE.Vector3(),
    heading: 0,
    health: CONFIG.maxHealth,
    reloading: false,
    reloadT: 0,
    fireT: 0,
    loadout,
    mesh: null,
  };
  Object.defineProperty(player, 'ammo', {
    get() {
      return loadout.current().mag;
    },
    set(v) {
      loadout.current().mag = v;
    },
    enumerable: true,
    configurable: true,
  });
  S.player = player;
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

  // ---- respect ----
  S.respectDirector = {
    rank: rankFor(0),
    add(n, why) {
      S.respect = Math.max(0, S.respect + n);
      this.rank = rankFor(S.respect);
      return this.rank;
    },
  };

  // ---- challenges ----
  const today = CONFIG.challenges.map((c) => ({ ...c }));
  const paid = [];
  S.challengesDirector = {
    today,
    _paid: paid,
    rows() {
      return today.map((c) => ({
        id: c.id,
        stat: c.stat,
        text: c.text,
        target: c.target,
        reward: c.reward,
        done: (S.stats[c.stat] || 0) >= c.target,
        paid: paid.includes(c.id),
      }));
    },
    tick() {
      for (const c of today) {
        if (!paid.includes(c.id) && (S.stats[c.stat] || 0) >= c.target) {
          paid.push(c.id);
          S.cash += c.reward;
          toast(`Challenge complete: ${c.text} +$${c.reward}`);
        }
      }
    },
  };

  // ---- banter (fallback; crew.js installs the live one) ----
  const banterLines = {
    raceWin: [
      ['LENA', 'Told you. Nobody outdrives us on this bay.'],
      ['LENA', 'That was clean. Vic is going to love this.'],
      ['VIC', 'Beautiful driving. You are worth every dollar.'],
    ],
    pickup: [
      ['LENA', 'Package is in the bag. Move, before they notice.'],
      ['VIC', 'Good hands. Bring it home slow and quiet.'],
      ['LENA', 'Got it. Now disappear like the sun just did.'],
    ],
    heatUp: [
      ['VIC', 'Cops are on you. Lose them or lose everything.'],
      ['LENA', 'Heat is climbing. Drive like you mean it.'],
      ['VIC', 'They saw you. Do not bring them to my yard.'],
    ],
  };
  let banterIdx = 0;
  S.banterDirector = {
    _cooldown: 0,
    say(speaker, text) {
      if (this._cooldown > 0) return false;
      toast(`${speaker}: "${text}"`);
      this._cooldown = 9;
      return true;
    },
    raceWin() {
      const line = banterLines.raceWin[banterIdx++ % banterLines.raceWin.length];
      return this.say(line[0], line[1]);
    },
    pickup() {
      const line = banterLines.pickup[banterIdx++ % banterLines.pickup.length];
      return this.say(line[0], line[1]);
    },
    heatUp() {
      const line = banterLines.heatUp[banterIdx++ % banterLines.heatUp.length];
      return this.say(line[0], line[1]);
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
    add(n) {
      S.heat = clamp(S.heat + n, 0, 100);
    },
    cool(n) {
      S.heat = clamp(S.heat - n, 0, 100);
    },
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
  S.missions = {
    list: CONFIG.missions,
    current: null,
    start(idOrIdx) {
      const idx =
        typeof idOrIdx === 'number'
          ? idOrIdx
          : CONFIG.missions.findIndex((m) => m.id === idOrIdx);
      if (idx < 0 || idx >= CONFIG.missions.length) return null;
      const cfg = CONFIG.missions[idx];
      const job = {
        id: cfg.id,
        index: idx,
        title: cfg.title,
        giver: cfg.giver,
        pay: cfg.pay,
        desc: cfg.desc,
        objective: cfg.desc,
        stage: 0,
        startedAt: S.time,
      };
      S.missions.current = job;
      S.objective = cfg.desc;
      if (cfg.id === 'm5') {
        S.crew.active = true;
        if (!S.crew.mesh) {
          const geo = new THREE.BoxGeometry(0.7, 1.8, 0.45);
          const mat = new THREE.MeshStandardMaterial({ color: 0xff7a9e });
          S.crew.mesh = new THREE.Mesh(geo, mat);
          S.crew.mesh.position.copy(S.player.pos);
        }
        S.crew.mesh.visible = true;
      }
      return job;
    },
    complete() {
      const cur = S.missions.current;
      if (!cur) return false;
      S.cash += cur.pay;
      S.respectDirector.add(60, 'job done');
      S.missionIndex = Math.min(10, cur.index + 1);
      S.missions.current = null;
      S.objective = CONFIG.defaultObjective;
      return true;
    },
    abandon() {
      S.missions.current = null;
      S.objective = CONFIG.defaultObjective;
    },
  };

  // ---- per-frame tick ----
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
    if (S.banterDirector._cooldown > 0) {
      S.banterDirector._cooldown = Math.max(0, S.banterDirector._cooldown - dt);
    }
    p.health = clamp(p.health, 0, CONFIG.maxHealth);
    S.district = nearestDistrict(p.pos.x, p.pos.z);
    if (S.time >= CONFIG.nightAt) S.dayNight.phase = 'NIGHT';
    else if (S.time >= CONFIG.duskAt) S.dayNight.phase = 'DUSK';
    else S.dayNight.phase = 'SUNSET';
  };

  return S;
}

export default createState;
