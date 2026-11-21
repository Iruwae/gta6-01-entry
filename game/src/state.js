// SOLMAR BAY — game state (round 9 rebuild).
// createState() builds the whole shared state object S. It also ships
// working fallback directors (respect, challenges, banter, heat, fence)
// so the game still runs if a feature module is missing; the real
// modules wrap or replace these directors at init time.

import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function nearestDistrict(x, z) {
  let best = CONFIG.districts[0];
  let bd = Infinity;
  for (const d of CONFIG.districts) {
    const dx = x - d.x;
    const dz = z - d.z;
    const q = dx * dx + dz * dz;
    if (q < bd) {
      bd = q;
      best = d;
    }
  }
  return best;
}

export function createState(hooks = {}) {
  const toast = typeof hooks.toast === 'function' ? hooks.toast : () => {};

  const S = {
    cash: CONFIG.startCash,
    day: CONFIG.startDay,
    // Minutes after the 18:28 sunset that day 1 opens on.
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
      loadout: null, // attached below (needs S for the unlock gate)
    },

    crew: {
      active: false,
      name: 'Lena Cruz',
      mesh: null,
    },

    stats: { packages: 0, racesWon: 0, fencesSold: 0, faresDone: 0 },

    sideActivities: {
      taxi: { active: false, dest: null, fare: 0 },
      race: { active: false, gates: [], next: 0 },
    },

    missions: {
      current: null,
      list: CONFIG.missions,
      start(id) {
        const idx =
          typeof id === 'number'
            ? id
            : CONFIG.missions.findIndex((m) => m.id === id);
        const def = CONFIG.missions[idx];
        if (!def) return null;
        const current = {
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
        S.missions.current = current;
        // Mission 5 is the crew job: Lena joins and is visible.
        if (def.id === 'm5') {
          S.crew.active = true;
          if (!S.crew.mesh) {
            const mesh = new THREE.Mesh(
              new THREE.BoxGeometry(0.7, 1.7, 0.7),
              new THREE.MeshStandardMaterial({ color: 0xff7a9e })
            );
            mesh.visible = true;
            S.crew.mesh = mesh;
          } else {
            S.crew.mesh.visible = true;
          }
        }
        return current;
      },
      complete() {
        const cur = S.missions.current;
        if (!cur) return;
        S.cash += cur.pay;
        S.respectDirector.add(60, 'job done');
        S.missionIndex = Math.min(CONFIG.missions.length, cur.index + 1);
        S.missions.current = null;
      },
      abandon() {
        S.missions.current = null;
      },
    },

    respectDirector: {
      rank: { title: 'NOBODY', min: 0 },
      add(n, why) {
        S.respect = Math.max(0, S.respect + n);
        let top = CONFIG.ranks[0];
        for (const r of CONFIG.ranks) {
          if (S.respect >= r.min) top = r;
        }
        S.respectDirector.rank.title = top.title;
        S.respectDirector.rank.min = top.min;
        return S.respectDirector.rank;
      },
    },

    challengesDirector: {
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
          }
        }
      },
    },

    banterDirector: {
      _cooldown: 0,
      _lines: {
        raceWin: [
          ['LENA', 'Told you my lines were faster than theirs. Nice driving, hustler.'],
          ['VIC', 'Clean win. The bay is starting to notice you.'],
        ],
        pickup: [
          ['LENA', 'Package is ours. Move like the sun is chasing you.'],
        ],
        heat: [
          ['VIC', 'Lay low, kid. Cops love a sunset chase.'],
        ],
      },
      say(speaker, text) {
        if (this._cooldown > 0) return false;
        this._cooldown = 9;
        toast(`${speaker}: "${text}"`);
        return true;
      },
      raceWin() {
        const line = this._lines.raceWin[Math.floor(Math.random() * this._lines.raceWin.length)];
        return this.say(line[0], line[1]);
      },
      pickup() {
        const line = this._lines.pickup[0];
        return this.say(line[0], line[1]);
      },
      heatUp() {
        const line = this._lines.heat[0];
        return this.say(line[0], line[1]);
      },
    },

    heatDirector: {
      sprayBooth: {
        armed: true,
        x: CONFIG.paynspray.x,
        z: CONFIG.paynspray.z,
        cost: CONFIG.paynspray.cost,
        radius: CONFIG.paynspray.radius,
      },
      add(n) {
        S.heat = clamp(S.heat + n, 0, 100);
      },
      cool(n) {
        S.heat = clamp(S.heat - n, 0, 100);
      },
    },

    fenceDirector: {
      priceFor(car) {
        if (!car) return 0;
        const base = CONFIG.fenceBase[car.kind] || 200;
        const cond = car.maxHealth ? clamp((car.health ?? car.maxHealth) / car.maxHealth, 0.2, 1) : 1;
        return Math.round(base * (0.5 + 0.5 * cond));
      },
      wantedBonus(car) {
        if (!car) return 0;
        return S.wanted * 20;
      },
    },

    tick(dt) {
      // Clock: minutes after the 18:28 sunset; roll over at midnight.
      S.time += dt * CONFIG.timeRate;
      if (S.time >= CONFIG.minutesPerDay) {
        S.time -= CONFIG.minutesPerDay;
        S.day += 1;
      }
      // Wanted stars follow heat, 20 heat per star, capped at 5.
      S.wanted = clamp(Math.floor(S.heat / CONFIG.heatPerStar), 0, CONFIG.maxWanted);
      // Reload timer: the commit is atomic — full magazine, flag cleared.
      const p = S.player;
      if (p.reloading) {
        p.reloadT -= dt;
        if (p.reloadT <= 0) {
          p.reloading = false;
          p.reloadT = 0;
          p.ammo = p.loadout.current().def.magSize;
        }
      }
      if (p.fireT > 0) p.fireT -= dt;
      // Banter cooldown ticks down in game seconds.
      if (S.banterDirector._cooldown > 0) S.banterDirector._cooldown -= dt;
      // Health stays in bounds; district follows the player.
      p.health = clamp(p.health, 0, CONFIG.maxHealth);
      S.district = nearestDistrict(p.pos.x, p.pos.z).id;
    },
  };

  // ---- Loadout: four slots, one magazine each. The equipped setter is
  // the unlock gate — a locked slot simply refuses the switch, so any
  // module (or the smoke test) that writes loadout.equipped gets the
  // same answer. Ammo is the current weapon's magazine, by proxy.
  const slots = CONFIG.weapons.map((def) => ({ def, mag: def.magSize }));
  const loadout = {
    slots,
    _equipped: 0,
    get equipped() {
      return this._equipped;
    },
    set equipped(i) {
      const slot = this.slots[i];
      if (!slot) return;
      if (slot.def.needsMissions > S.missionIndex) return;
      this._equipped = i;
    },
    equip(i) {
      this.equipped = i;
      return this._equipped;
    },
    current() {
      return this.slots[this._equipped];
    },
  };
  S.player.loadout = loadout;
  Object.defineProperty(S.player, 'ammo', {
    get() {
      return this.loadout.current().mag;
    },
    set(v) {
      this.loadout.current().mag = v;
    },
    enumerable: true,
    configurable: true,
  });

  // S.health mirrors the player's health both ways.
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

  return S;
}

export default createState;
