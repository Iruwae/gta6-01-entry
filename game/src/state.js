// SOLMAR BAY shared state. createState builds the whole game state S
// plus the directors that drive respect, challenges, banter, heat and
// the fence. Feature modules wrap or replace these directors at init;
// the ones here are working fallbacks so the game still runs alone.
import { CONFIG } from './config.js';

function nearestDistrict(x, z) {
  let best = CONFIG.districts[0];
  let bestD = Infinity;
  for (const d of CONFIG.districts) {
    const dx = x - d.x;
    const dz = z - d.z;
    const dd = dx * dx + dz * dz;
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
  return rank;
}

export function createState(hooks = {}) {
  const toast = typeof hooks.toast === 'function' ? hooks.toast : () => {};
  const THREE = hooks.THREE || null;

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
    stats: { packages: 0, racesWon: 0, fencesSold: 0, faresDone: 0 },
    sideActivities: {
      taxi: { active: false, dest: null, fare: 0 },
      race: { active: false, gates: [], next: 0 },
    },
    crew: { active: false, name: 'Lena Cruz', mesh: null },
    player: null, // filled below
    missions: null,
    respectDirector: null,
    challengesDirector: null,
    banterDirector: null,
    heatDirector: null,
    fenceDirector: null,
  };

  // ---- player + loadout -------------------------------------------------
  const loadout = {
    slots: CONFIG.weapons.map((def) => ({ def, mag: def.mag })),
    _equipped: 0,
    current() {
      return loadout.slots[loadout._equipped];
    },
    equip(i) {
      loadout.equipped = i;
    },
  };
  Object.defineProperty(loadout, 'equipped', {
    get() {
      return loadout._equipped;
    },
    set(i) {
      const slot = loadout.slots[i];
      if (!slot) return;
      // The unlock gate: a weapon whose unlock mission count exceeds the
      // jobs done refuses the switch.
      if (slot.def.unlock > S.missionIndex) return;
      loadout._equipped = i;
    },
    enumerable: true,
  });

  const player = {
    pos: null, // Vector3, set below once THREE is known
    vel: null,
    heading: 0,
    health: CONFIG.maxHealth,
    reloading: false,
    reloadT: 0,
    fireT: 0,
    loadout,
  };
  // S.player.ammo is a proxy for the current slot's magazine.
  Object.defineProperty(player, 'ammo', {
    get() {
      return loadout.current().mag;
    },
    set(v) {
      loadout.current().mag = v;
    },
    enumerable: true,
  });
  S.player = player;
  // S.health mirrors S.player.health both ways.
  Object.defineProperty(S, 'health', {
    get() {
      return S.player.health;
    },
    set(v) {
      S.player.health = v;
    },
    enumerable: true,
  });

  // THREE vectors need the library; fall back to plain {x,y,z} objects
  // with a set() helper so the state works even without a renderer.
  function makeVec(x, y, z) {
    if (THREE) return new THREE.Vector3(x, y, z);
    const v = { x, y, z };
    v.set = (nx, ny, nz) => {
      v.x = nx;
      v.y = ny;
      v.z = nz;
      return v;
    };
    v.length = () => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    v.clone = () => makeVec(v.x, v.y, v.z);
    return v;
  }
  player.pos = makeVec(-84, 0, -58);
  player.vel = makeVec(0, 0, 0);
  S._makeVec = makeVec;

  // ---- respect ----------------------------------------------------------
  const respectDirector = {
    rank: rankFor(0),
    add(n, why) {
      S.respect = Math.max(0, S.respect + n);
      respectDirector.rank = rankFor(S.respect);
      return respectDirector.rank;
    },
  };
  S.respectDirector = respectDirector;

  // ---- daily challenges ---------------------------------------------------
  const challengesDirector = {
    today: CONFIG.challenges.map((c) => ({ ...c })),
    _paid: [],
    rows() {
      return challengesDirector.today.map((c) => ({
        id: c.id,
        text: c.text,
        target: c.target,
        reward: c.reward,
        done: S.stats[c.stat] >= c.target,
        paid: challengesDirector._paid.includes(c.id),
      }));
    },
    tick() {
      for (const c of challengesDirector.today) {
        if (challengesDirector._paid.includes(c.id)) continue;
        if (S.stats[c.stat] >= c.target) {
          challengesDirector._paid.push(c.id);
          S.cash += c.reward;
          toast(`Challenge complete: ${c.text} +$${c.reward}`);
        }
      }
    },
  };
  S.challengesDirector = challengesDirector;

  // ---- banter (fallback; crew.js installs the live one) ------------------
  const banterLines = {
    raceWin: [
      ['LENA', 'Told you. Nobody outdrives us on this bay.'],
      ['LENA', 'That was clean. Vic is going to love this.'],
      ['VIC', 'Not bad, kid. The bay is starting to notice you.'],
    ],
    pickup: [
      ['LENA', 'Package is in the bag. Keep it smooth.'],
      ['VIC', 'Good hands. That is how you stay alive out here.'],
    ],
    heatUp: [
      ['LENA', 'Cops on us! Drive like you mean it!'],
      ['VIC', 'Heat is climbing. Lose them or pay for it.'],
    ],
  };
  const banterDirector = {
    _cooldown: 0,
    say(speaker, text) {
      if (banterDirector._cooldown > 0) return false;
      toast(`${speaker}: "${text}"`);
      banterDirector._cooldown = 9;
      return true;
    },
    raceWin() {
      const line = banterLines.raceWin[Math.floor(Math.random() * banterLines.raceWin.length)];
      return banterDirector.say(line[0], line[1]);
    },
    pickup() {
      const line = banterLines.pickup[Math.floor(Math.random() * banterLines.pickup.length)];
      return banterDirector.say(line[0], line[1]);
    },
    heatUp() {
      const line = banterLines.heatUp[Math.floor(Math.random() * banterLines.heatUp.length)];
      return banterDirector.say(line[0], line[1]);
    },
  };
  S.banterDirector = banterDirector;

  // ---- heat ---------------------------------------------------------------
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

  // ---- fence --------------------------------------------------------------
  const fenceDirector = {
    priceFor(car) {
      const base = CONFIG.fenceBase[car.kind] || 300;
      const max = car.maxHealth || 100;
      const hp = car.health ?? max;
      const condition = Math.max(0.2, Math.min(1, hp / max));
      return Math.round(base * (0.5 + 0.5 * condition));
    },
    wantedBonus(car) {
      return S.wanted * 20;
    },
  };
  S.fenceDirector = fenceDirector;

  // ---- missions -----------------------------------------------------------
  const missions = {
    current: null,
    list: CONFIG.missions,
    start(idOrIndex) {
      let index = -1;
      if (typeof idOrIndex === 'number') index = idOrIndex;
      else index = CONFIG.missions.findIndex((m) => m.id === idOrIndex);
      if (index < 0 || index >= CONFIG.missions.length) return null;
      const cfg = CONFIG.missions[index];
      const job = {
        id: cfg.id,
        index,
        title: cfg.title,
        giver: cfg.giver,
        pay: cfg.pay,
        desc: cfg.desc,
        objective: cfg.desc,
        stage: 0,
        startedAt: S.time,
        target: { x: cfg.target.x, z: cfg.target.z },
      };
      missions.current = job;
      S.objective = job.desc;
      if (cfg.id === 'm5') {
        S.crew.active = true;
        if (!S.crew.mesh && THREE) {
          const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.7, 1.8, 0.4),
            new THREE.MeshBasicMaterial({ color: 0xff7a9e }),
          );
          mesh.visible = true;
          S.crew.mesh = mesh;
        } else if (S.crew.mesh) {
          S.crew.mesh.visible = true;
        }
      }
      return job;
    },
    complete() {
      const job = missions.current;
      if (!job) return;
      S.cash += job.pay;
      respectDirector.add(60, 'job done');
      S.missionIndex = Math.min(CONFIG.missions.length, job.index + 1);
      missions.current = null;
      S.objective = CONFIG.defaultObjective;
      toast(`Job done: ${job.title} +$${job.pay}`);
    },
    abandon() {
      missions.current = null;
      S.objective = CONFIG.defaultObjective;
    },
  };
  S.missions = missions;

  // ---- per-frame tick ------------------------------------------------------
  S.tick = function tick(dt) {
    S.time += dt * CONFIG.minutesPerSecond;
    if (S.time >= CONFIG.minutesPerDay) {
      S.time -= CONFIG.minutesPerDay;
      S.day += 1;
    }
    S.wanted = Math.min(5, Math.floor(S.heat / 20));
    // Reload commits atomically the moment its timer reaches zero.
    if (player.reloading) {
      player.reloadT -= dt;
      if (player.reloadT <= 0) {
        player.reloading = false;
        player.reloadT = 0;
        loadout.current().mag = loadout.current().def.mag;
      }
    }
    if (player.fireT > 0) player.fireT -= dt;
    if (banterDirector._cooldown > 0) banterDirector._cooldown -= dt;
    if (player.health < 0) player.health = 0;
    if (player.health > CONFIG.maxHealth) player.health = CONFIG.maxHealth;
    S.district = nearestDistrict(player.pos.x, player.pos.z);
  };

  return S;
}

export default createState;
