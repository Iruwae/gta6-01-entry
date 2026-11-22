// Shared game state — the single source of truth every module talks through.
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';

const LADDER = CONFIG.respectLadder;

function rankFor(respect) {
  let rank = LADDER[0];
  for (const r of LADDER) {
    if (respect >= r.min) rank = r;
  }
  return { title: rank.title, min: rank.min };
}

export function createState(hooks = {}) {
  const toast = hooks.toast || (() => {});
  const S = {
    cash: CONFIG.startCash,
    day: CONFIG.startDay,
    time: 0, // game minutes after 18:28
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
    objective: 'Explore Solmar Bay — find work.',
    dayNight: { phase: 'SUNSET', night: 0 },
    player: null,
    crew: { active: false, name: 'Lena Cruz', mesh: null },
    stats: { packages: 0, racesWon: 0, fencesSold: 0, faresDone: 0 },
    sideActivities: {
      taxi: { active: false, dest: null, fare: 0 },
      race: { active: false, gates: [], next: 0 },
    },
  };

  // ---- loadout: four weapon slots, unlock-gated equip ----
  const slots = CONFIG.weapons.map((def) => ({ def, mag: def.mag }));
  let equippedIdx = 0;
  const loadout = {
    slots,
    get equipped() {
      return equippedIdx;
    },
    set equipped(i) {
      const idx = Math.floor(i);
      if (idx < 0 || idx >= slots.length) return;
      if (slots[idx].def.unlock > S.missionIndex) return; // locked: refuse
      equippedIdx = idx;
    },
    equip(i) {
      loadout.equipped = i;
    },
    current() {
      return slots[equippedIdx];
    },
  };

  const player = {
    pos: new THREE.Vector3(-84, 0, -58),
    vel: new THREE.Vector3(0, 0, 0),
    heading: 0,
    health: CONFIG.maxHealth,
    reloading: false,
    reloadT: 0,
    fireT: 0,
    loadout,
    mesh: null,
  };
  // S.player.ammo proxies the equipped slot's magazine.
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
  // S.health mirrors S.player.health both ways.
  Object.defineProperty(S, 'health', {
    get() {
      return S.player.health;
    },
    set(v) {
      S.player.health = Math.max(0, Math.min(CONFIG.maxHealth, v));
    },
    enumerable: true,
    configurable: true,
  });

  // ---- missions ----
  const missions = {
    current: null,
    list: CONFIG.missions,
    start(idOrIndex) {
      let index = -1;
      if (typeof idOrIndex === 'number') index = idOrIndex;
      else if (typeof idOrIndex === 'string') {
        index = CONFIG.missions.findIndex((m) => m.id === idOrIndex);
      }
      if (index < 0 || index >= CONFIG.missions.length) return null;
      const def = CONFIG.missions[index];
      const job = {
        id: def.id,
        index,
        title: def.title,
        giver: def.giver,
        pay: def.pay,
        desc: def.desc,
        objective: def.desc,
        stage: 0,
        startedAt: S.time,
      };
      missions.current = job;
      S.objective = def.desc;
      if (index === 4) {
        S.crew.active = true;
        if (S.crew.mesh) S.crew.mesh.visible = true;
      }
      return job;
    },
    complete() {
      const job = missions.current;
      if (!job) return false;
      S.cash += job.pay;
      S.respectDirector.add(60, 'job done');
      S.missionIndex = Math.min(10, job.index + 1);
      missions.current = null;
      S.objective = 'Explore Solmar Bay — find work.';
      return true;
    },
    abandon() {
      missions.current = null;
      S.objective = 'Explore Solmar Bay — find work.';
    },
  };
  S.missions = missions;

  // ---- respect ----
  S.respectDirector = {
    rank: rankFor(0),
    add(n, why) {
      S.respect = Math.max(0, S.respect + n);
      S.respectDirector.rank = rankFor(S.respect);
      return S.respectDirector.rank;
    },
  };

  // ---- daily challenges ----
  S.challengesDirector = {
    today: CONFIG.challenges.map((c) => ({ ...c })),
    _paid: [],
    rows() {
      return S.challengesDirector.today.map((c) => ({
        id: c.id,
        text: c.text,
        target: c.target,
        reward: c.reward,
        done: (S.stats[c.stat] || 0) >= c.target,
        paid: S.challengesDirector._paid.includes(c.id),
      }));
    },
    tick() {
      for (const c of S.challengesDirector.today) {
        if (S.challengesDirector._paid.includes(c.id)) continue;
        if ((S.stats[c.stat] || 0) >= c.target) {
          S.challengesDirector._paid.push(c.id);
          S.cash += c.reward;
          toast(`Challenge complete: ${c.text} +$${c.reward}`);
        }
      }
    },
  };

  // ---- banter (fallback; crew.js installs the live one) ----
  S.banterDirector = {
    _cooldown: 0,
    say(speaker, text) {
      if (S.banterDirector._cooldown > 0) return false;
      toast(`${speaker}: "${text}"`);
      S.banterDirector._cooldown = 9;
      return true;
    },
    raceWin() {
      return S.banterDirector.say('LENA', "That was clean driving. Vic's gonna love this.");
    },
    pickup() {
      return S.banterDirector.say('LENA', 'Package secured. Now don\'t get cute with it.');
    },
    heatUp() {
      return S.banterDirector.say('VIC', 'You lit up the whole bay, kid. Cool it down.');
    },
  };

  // ---- heat ----
  S.heatDirector = {
    sprayBooth: {
      armed: true,
      x: CONFIG.sprayBooth.x,
      z: CONFIG.sprayBooth.z,
      cost: CONFIG.sprayBooth.cost,
      radius: CONFIG.sprayBooth.radius,
    },
    add(n) {
      S.heat = Math.max(0, Math.min(100, S.heat + n));
    },
    cool(n) {
      S.heat = Math.max(0, Math.min(100, S.heat - n));
    },
  };

  // ---- fence ----
  S.fenceDirector = {
    priceFor(car) {
      const base = CONFIG.fenceBase[car.kind] || 0;
      const maxH = car.maxHealth || 1;
      const condition = Math.max(0.2, Math.min(1, (car.health ?? maxH) / maxH));
      return Math.round(base * (0.5 + 0.5 * condition));
    },
    wantedBonus() {
      return S.wanted * 20;
    },
  };

  // ---- per-frame tick (dt in real seconds) ----
  S.tick = function tick(dt) {
    S.time += dt * CONFIG.minutesPerSecond;
    if (S.time >= CONFIG.minutesPerDay) {
      S.time -= CONFIG.minutesPerDay;
      S.day += 1;
    }
    S.wanted = Math.min(5, Math.floor(S.heat / 20));
    if (S.player.reloading) {
      S.player.reloadT -= dt;
      if (S.player.reloadT <= 0) {
        S.player.reloading = false;
        S.player.reloadT = 0;
        S.player.loadout.current().mag = S.player.loadout.current().def.mag;
      }
    }
    if (S.player.fireT > 0) S.player.fireT = Math.max(0, S.player.fireT - dt);
    if (S.banterDirector._cooldown > 0) {
      S.banterDirector._cooldown = Math.max(0, S.banterDirector._cooldown - dt);
    }
    S.player.health = Math.max(0, Math.min(CONFIG.maxHealth, S.player.health));
    // District = nearest centre to the player.
    let best = null;
    let bestD = Infinity;
    for (const d of CONFIG.districts) {
      const dx = S.player.pos.x - d.x;
      const dz = S.player.pos.z - d.z;
      const dist = dx * dx + dz * dz;
      if (dist < bestD) {
        bestD = dist;
        best = d;
      }
    }
    if (best) S.district = best.id;
  };

  return S;
}

export default createState;
