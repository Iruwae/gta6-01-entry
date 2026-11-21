// SOLMAR BAY — shared state (createState) + working directors.
// The feature modules wrap or replace these directors at init time.
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';

function nearestDistrict(x, z) {
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

function rankFor(respect) {
  let rank = CONFIG.respectLadder[0];
  for (const r of CONFIG.respectLadder) {
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
    packages: CONFIG.packageSpots.map((p) => ({ x: p.x, z: p.z, taken: false })),
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
  };

  // ---- player + loadout ----
  const player = {
    pos: new THREE.Vector3(-84, 0, -58),
    vel: new THREE.Vector3(0, 0, 0),
    heading: 0,
    health: CONFIG.player.maxHealth,
    reloading: false,
    reloadT: 0,
    fireT: 0,
    loadout: null,
  };
  const slots = CONFIG.weapons.map((def) => ({ def, mag: def.mag }));
  let equippedIndex = 0;
  const loadout = {
    slots,
    get equipped() {
      return equippedIndex;
    },
    set equipped(i) {
      const slot = slots[i];
      if (!slot) return;
      if (slot.def.unlock > S.missionIndex) return; // unlock gate
      equippedIndex = i;
    },
    equip(i) {
      this.equipped = i;
    },
    current() {
      return slots[equippedIndex];
    },
  };
  player.loadout = loadout;
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
      return player.health;
    },
    set(v) {
      player.health = v;
    },
    enumerable: true,
    configurable: true,
  });

  // ---- respect director ----
  S.respectDirector = {
    rank: rankFor(0),
    add(n, _why) {
      S.respect = Math.max(0, S.respect + n);
      this.rank = rankFor(S.respect);
      return this.rank;
    },
  };

  // ---- challenges director ----
  const challengeDefs = CONFIG.challenges.map((c) => ({ ...c }));
  S.challengesDirector = {
    today: challengeDefs.map((c) => ({ ...c })),
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
        if (this._paid.includes(c.id)) continue;
        if ((S.stats[c.stat] || 0) >= c.target) {
          this._paid.push(c.id);
          S.cash += c.reward;
          toast(`CHALLENGE DONE: ${c.text} — +$${c.reward}`);
        }
      }
    },
  };

  // ---- banter director (fallback; crew.js installs the live one) ----
  const banterLines = {
    raceWin: [
      ['LENA', 'That was clean. Vic is going to love this.'],
      ['LENA', 'Told you my lines work. Now drive like you mean it.'],
    ],
    pickup: [
      ['LENA', 'Package is in the bag. Easy money.'],
      ['VIC', 'Good hands. Keep it quiet and keep it moving.'],
    ],
    heatUp: [
      ['VIC', 'Cops on you now. Lose them or pay for it.'],
      ['LENA', 'Heat is climbing. Do not lead them back to the garage.'],
    ],
  };
  S.banterDirector = {
    _cooldown: 0,
    _lineIdx: 0,
    say(speaker, text) {
      if (this._cooldown > 0) return false;
      toast(`${speaker}: "${text}"`);
      this._cooldown = 9;
      return true;
    },
    _pick(kind) {
      const lines = banterLines[kind];
      const line = lines[this._lineIdx % lines.length];
      this._lineIdx += 1;
      return this.say(line[0], line[1]);
    },
    raceWin() {
      return this._pick('raceWin');
    },
    pickup() {
      return this._pick('pickup');
    },
    heatUp() {
      return this._pick('heatUp');
    },
  };

  // ---- heat director ----
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

  // ---- fence director ----
  S.fenceDirector = {
    priceFor(car) {
      const base = CONFIG.fenceBase[car.kind] || 300;
      const maxH = car.maxHealth || 100;
      const condition = Math.max(0.2, Math.min(1, (car.health ?? maxH) / maxH));
      return Math.round(base * (0.5 + 0.5 * condition));
    },
    wantedBonus(_car) {
      return S.wanted * 20;
    },
  };

  // ---- missions ----
  const missionList = CONFIG.missions.map((m, i) => ({ ...m, index: i }));
  S.missions = {
    current: null,
    list: missionList,
    start(idOrIndex) {
      const job = typeof idOrIndex === 'number'
        ? missionList[idOrIndex]
        : missionList.find((m) => m.id === idOrIndex);
      if (!job) return null;
      const current = {
        id: job.id,
        index: job.index,
        title: job.title,
        giver: job.giver,
        pay: job.pay,
        desc: job.desc,
        objective: job.desc,
        stage: 0,
        startedAt: S.time,
      };
      S.missions.current = current;
      S.objective = job.desc;
      if (job.id === 'm5') {
        S.crew.active = true;
        if (!S.crew.mesh) {
          const geo = new THREE.BoxGeometry(0.7, 1.7, 0.4);
          const mat = new THREE.MeshStandardMaterial({ color: 0xff7a9e });
          S.crew.mesh = new THREE.Mesh(geo, mat);
          S.crew.mesh.position.copy(S.player.pos);
        }
        S.crew.mesh.visible = true;
      }
      return current;
    },
    complete() {
      const cur = S.missions.current;
      if (!cur) return;
      S.cash += cur.pay;
      S.respectDirector.add(60, 'job done');
      S.missionIndex = Math.min(10, cur.index + 1);
      S.missions.current = null;
      S.objective = CONFIG.defaultObjective;
      toast(`JOB DONE: ${cur.title} — +$${cur.pay}`);
    },
    abandon() {
      S.missions.current = null;
      S.objective = CONFIG.defaultObjective;
    },
  };

  // ---- frame tick ----
  S.tick = function tick(dt) {
    S.time += dt * CONFIG.minutesPerRealSecond;
    if (S.time >= CONFIG.minutesPerDay) {
      S.time -= CONFIG.minutesPerDay;
      S.day += 1;
      S.challengesDirector.today = challengeDefs.map((c) => ({ ...c }));
      S.challengesDirector._paid = [];
    }
    S.wanted = Math.min(5, Math.floor(S.heat / 20));
    // Reload: atomic commit when the timer hits zero.
    if (player.reloading) {
      player.reloadT -= dt;
      if (player.reloadT <= 0) {
        player.reloading = false;
        player.reloadT = 0;
        loadout.current().mag = loadout.current().def.mag;
      }
    }
    if (player.fireT > 0) player.fireT -= dt;
    if (S.banterDirector._cooldown > 0) {
      S.banterDirector._cooldown = Math.max(0, S.banterDirector._cooldown - dt * CONFIG.minutesPerRealSecond);
    }
    player.health = Math.max(0, Math.min(CONFIG.player.maxHealth, player.health));
    S.district = nearestDistrict(player.pos.x, player.pos.z);
  };

  return S;
}

export default createState;
