// SOLMAR BAY — shared state. createState builds the whole game state S.
// Directors ship here as working fallbacks; feature modules wrap or
// replace them at init time.
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';
import { withTrail } from './random.js';

function nearestDistrict(x, z) {
  let best = CONFIG.districts[0];
  let bestD = Infinity;
  for (const d of CONFIG.districts) {
    const dx = d.x - x;
    const dz = d.z - z;
    const dd = dx * dx + dz * dz;
    if (dd < bestD) { bestD = dd; best = d; }
  }
  return best.id;
}

export function createState(hooks = {}) {
  const toast = typeof hooks.toast === 'function' ? hooks.toast : () => {};

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
    packages: CONFIG.packageSpots.map((p) => ({ x: p.x, z: p.z, taken: false, mesh: null })),
    sunLight: null,
    skyDome: null,
    objective: 'Explore Solmar Bay — find work.',
    dayNight: { phase: 'SUNSET', night: 0 },
    player: null, // built below (needs the loadout first)
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
    tick,
  };

  // ---- loadout: four weapon slots, equipped setter is the unlock gate
  const loadout = {
    slots: CONFIG.weapons.map((def) => ({ def, mag: def.mag })),
    _equipped: 0,
    current() {
      return this.slots[this._equipped];
    },
    equip(i) {
      this.equipped = i;
    },
  };
  Object.defineProperty(loadout, 'equipped', {
    get() { return this._equipped; },
    set(i) {
      const slot = this.slots[i];
      if (!slot) return;
      if (slot.def.unlock > S.missionIndex) return; // locked: refuse the switch
      this._equipped = i;
    },
    enumerable: true,
  });

  // ---- player
  const player = {
    pos: withTrail(new THREE.Vector3(-84, 0, -58)),
    vel: new THREE.Vector3(0, 0, 0),
    heading: 0,
    health: CONFIG.maxHealth,
    reloading: false,
    reloadT: 0,
    fireT: 0,
    loadout,
  };
  Object.defineProperty(player, 'ammo', {
    get() { return loadout.current().mag; },
    set(v) { loadout.current().mag = v; },
    enumerable: true,
  });
  S.player = player;

  // S.health mirrors S.player.health both ways.
  Object.defineProperty(S, 'health', {
    get() { return S.player.health; },
    set(v) { S.player.health = v; },
    enumerable: true,
  });

  // ---- missions
  const missions = {
    current: null,
    list: CONFIG.missions,
    start(idOrIndex) {
      const index = typeof idOrIndex === 'number'
        ? idOrIndex
        : CONFIG.missions.findIndex((m) => m.id === idOrIndex);
      const def = CONFIG.missions[index];
      if (!def) return null;
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
      this.current = job;
      if (def.id === 'm5') {
        S.crew.active = true;
        if (!S.crew.mesh) {
          const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.7, 1.8, 0.4),
            new THREE.MeshStandardMaterial({ color: 0xff7a9e }),
          );
          mesh.position.copy(S.player.pos);
          S.crew.mesh = mesh;
        }
        S.crew.mesh.visible = true;
      }
      return job;
    },
    complete() {
      const job = this.current;
      if (!job) return;
      S.cash += job.pay;
      S.respectDirector.add(60, 'job done');
      S.missionIndex = Math.min(10, job.index + 1);
      this.current = null;
    },
    abandon() {
      this.current = null;
    },
  };
  S.missions = missions;

  // ---- respect
  function rankFor(points) {
    let rank = CONFIG.respectLadder[0];
    for (const r of CONFIG.respectLadder) {
      if (points >= r.min) rank = r;
    }
    return rank;
  }
  const respectDirector = {
    rank: rankFor(0),
    add(n, why) {
      S.respect = Math.max(0, S.respect + n);
      this.rank = rankFor(S.respect);
      return this.rank;
    },
  };
  S.respectDirector = respectDirector;

  // ---- daily challenges
  const challengesDirector = {
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
        if (this._paid.includes(c.id)) continue;
        if (S.stats[c.stat] >= c.target) {
          this._paid.push(c.id);
          S.cash += c.reward;
          toast(`CHALLENGE DONE — ${c.text} (+$${c.reward})`);
        }
      }
    },
  };
  S.challengesDirector = challengesDirector;

  // ---- banter
  const BANTER_LINES = {
    raceWin: [
      ['LENA', 'That was clean. Vic is going to love this.'],
      ['LENA', 'Told you my line through the gates was faster.'],
      ['VIC', 'You drive like the bay owes you money. Good.'],
    ],
    pickup: [
      ['LENA', 'Package is in the bag. Keep it moving.'],
      ['VIC', 'Quiet hands, quick feet. That is how we work.'],
      ['LENA', 'One more and the whole bay knows our name.'],
    ],
    heatUp: [
      ['LENA', 'Cops on us. Do not stop for anything.'],
      ['VIC', 'Lose them first, talk later. Go.'],
      ['LENA', 'Heat is climbing — find a spray booth or a motel.'],
    ],
  };
  let _banterIdx = 0;
  const banterDirector = {
    _cooldown: 0,
    say(speaker, text) {
      if (this._cooldown > 0) return false;
      toast(`${speaker}: "${text}"`);
      this._cooldown = 9;
      return true;
    },
    _pick(kind) {
      const lines = BANTER_LINES[kind];
      const line = lines[_banterIdx % lines.length];
      _banterIdx++;
      return this.say(line[0], line[1]);
    },
    raceWin() { return this._pick('raceWin'); },
    pickup() { return this._pick('pickup'); },
    heatUp() { return this._pick('heatUp'); },
  };
  S.banterDirector = banterDirector;

  // ---- heat
  const heatDirector = {
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
  S.heatDirector = heatDirector;

  // ---- fence
  const fenceDirector = {
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
  S.fenceDirector = fenceDirector;

  // ---- per-frame tick
  function tick(dt) {
    S.time += dt * CONFIG.minutesPerRealSecond;
    if (S.time >= CONFIG.minutesPerDay) {
      S.time -= CONFIG.minutesPerDay;
      S.day += 1;
      S.challengesDirector.today = CONFIG.challenges.map((c) => ({ ...c }));
      S.challengesDirector._paid = [];
    }
    S.wanted = Math.min(CONFIG.maxWanted, Math.floor(S.heat / CONFIG.heatPerStar));
    // Reload commits atomically when the timer hits zero.
    if (S.player.reloading) {
      S.player.reloadT -= dt;
      if (S.player.reloadT <= 0) {
        S.player.reloading = false;
        S.player.reloadT = 0;
        S.player.loadout.current().mag = S.player.loadout.current().def.mag;
      }
    }
    if (S.player.fireT > 0) S.player.fireT -= dt;
    if (S.banterDirector._cooldown > 0) {
      S.banterDirector._cooldown = Math.max(0, S.banterDirector._cooldown - dt);
    }
    S.player.health = Math.max(0, Math.min(CONFIG.maxHealth, S.player.health));
    S.district = nearestDistrict(S.player.pos.x, S.player.pos.z);
  }

  return S;
}

export default createState;
