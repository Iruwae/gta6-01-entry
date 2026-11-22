// Shared game state for SOLMAR BAY (createState) + a tiny vector class.
// Directors ship here as working fallbacks; feature modules wrap or
// replace them at init time.
import { CONFIG } from './config.js';
import { clamp } from './random.js';

// Minimal 3-vector: the smoke test drives .pos.set() / reads .pos.x,
// and the game only ever needs x/y/z numbers out of it.
export class V3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x; this.y = y; this.z = z;
  }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  clone() { return new V3(this.x, this.y, this.z); }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
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
    missions: null,
    respectDirector: null,
    challengesDirector: null,
    banterDirector: null,
    heatDirector: null,
    fenceDirector: null,
  };

  // ---- loadout (four weapon slots, unlock-gated equip) ----
  const loadout = {
    slots: CONFIG.weapons.map((def) => ({ def, mag: def.mag })),
    _equipped: 0,
    get equipped() { return this._equipped; },
    set equipped(i) {
      const def = CONFIG.weapons[i];
      if (!def) return;
      if (def.unlock > S.missionIndex) return; // locked: refuse the switch
      this._equipped = i;
    },
    equip(i) { this.equipped = i; },
    current() { return this.slots[this._equipped]; },
  };

  const player = {
    pos: new V3(CONFIG.playerStart.x, 0, CONFIG.playerStart.z),
    vel: new V3(0, 0, 0),
    heading: 0,
    health: CONFIG.maxHealth,
    speed: 0,
    reloading: false,
    reloadT: 0,
    fireT: 0,
    loadout,
  };
  Object.defineProperty(player, 'ammo', {
    get() { return loadout.current().mag; },
    set(v) { loadout.current().mag = v; },
  });
  S.player = player;
  // S.health mirrors S.player.health both ways.
  Object.defineProperty(S, 'health', {
    get() { return S.player.health; },
    set(v) { S.player.health = v; },
  });

  // ---- respect director ----
  S.respectDirector = {
    rank: rankFor(0),
    add(n, why) {
      S.respect = Math.max(0, S.respect + n);
      this.rank = rankFor(S.respect);
      return this.rank;
    },
  };

  // ---- challenges director ----
  S.challengesDirector = {
    today: CONFIG.challenges.map((c) => ({ ...c })),
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
          toast(`Challenge complete: ${c.text} (+$${c.reward})`);
        }
      }
    },
  };

  // ---- banter director (fallback; crew.js installs the live one) ----
  const banterLines = {
    raceWin: [
      ['LENA', 'Told you my lines were faster than theirs.'],
      ['VIC', 'Clean win. The bay is starting to notice you.'],
    ],
    pickup: [
      ['LENA', 'Package in hand. Now move, before somebody notices.'],
      ['VIC', 'Good hands. That one was worth the trouble.'],
    ],
    heatUp: [
      ['LENA', 'Cops on us! Drive like you mean it!'],
      ['VIC', 'Heat like that and you better have a plan.'],
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
      const [s, t] = banterLines.raceWin[Math.floor(Math.random() * banterLines.raceWin.length)];
      return this.say(s, t);
    },
    pickup() {
      const [s, t] = banterLines.pickup[Math.floor(Math.random() * banterLines.pickup.length)];
      return this.say(s, t);
    },
    heatUp() {
      const [s, t] = banterLines.heatUp[Math.floor(Math.random() * banterLines.heatUp.length)];
      return this.say(s, t);
    },
  };

  // ---- heat director ----
  S.heatDirector = {
    sprayBooth: { armed: true, x: CONFIG.spray.x, z: CONFIG.spray.z, cost: CONFIG.spray.cost, radius: CONFIG.spray.radius },
    add(n) { S.heat = clamp(S.heat + n, 0, 100); },
    cool(n) { S.heat = clamp(S.heat - n, 0, 100); },
  };

  // ---- fence director ----
  S.fenceDirector = {
    priceFor(car) {
      const base = CONFIG.fenceBase[car.kind] || 0;
      const condition = clamp((car.health ?? car.maxHealth) / car.maxHealth, 0.2, 1);
      return Math.round(base * (0.5 + 0.5 * condition));
    },
    wantedBonus() {
      return S.wanted * 20;
    },
  };

  // ---- missions ----
  const missions = {
    list: CONFIG.missions,
    current: null,
    start(indexOrId) {
      let idx = typeof indexOrId === 'number'
        ? indexOrId
        : CONFIG.missions.findIndex((m) => m.id === indexOrId);
      if (idx < 0 || idx >= CONFIG.missions.length) return null;
      const def = CONFIG.missions[idx];
      const job = {
        id: def.id, index: idx, title: def.title, giver: def.giver,
        pay: def.pay, desc: def.desc, objective: def.desc, stage: 0,
        startedAt: S.time,
      };
      missions.current = job;
      S.objective = def.desc;
      if (idx === 4) {
        S.crew.active = true;
        if (S.crew.mesh) S.crew.mesh.visible = true;
      }
      return job;
    },
    complete() {
      const job = missions.current;
      if (!job) return;
      S.cash += job.pay;
      S.respectDirector.add(60, 'job done');
      S.missionIndex = Math.min(CONFIG.missions.length, job.index + 1);
      missions.current = null;
      S.objective = 'Explore Solmar Bay — find work.';
      toast(`Job done: ${job.title} (+$${job.pay})`);
    },
    abandon() {
      missions.current = null;
      S.objective = 'Explore Solmar Bay — find work.';
    },
  };
  S.missions = missions;

  // ---- per-frame tick ----
  S.tick = function tick(dt) {
    S.time += dt * CONFIG.gameMinutesPerSecond;
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
        const cur = p.loadout.current();
        cur.mag = cur.def.mag; // atomic commit to a full magazine
      }
    }
    if (p.fireT > 0) p.fireT -= dt;
    if (S.banterDirector && S.banterDirector._cooldown > 0) {
      S.banterDirector._cooldown = Math.max(0, S.banterDirector._cooldown - dt);
    }
    p.health = clamp(p.health, 0, CONFIG.maxHealth);
    // District = nearest district centre to the player.
    let best = null;
    let bestD = Infinity;
    for (const d of CONFIG.districts) {
      const dd = (p.pos.x - d.x) * (p.pos.x - d.x) + (p.pos.z - d.z) * (p.pos.z - d.z);
      if (dd < bestD) { bestD = dd; best = d; }
    }
    if (best) S.district = best.id;
  };

  return S;
}

export default createState;
