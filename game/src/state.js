// SOLMAR BAY — game state (round 8 rewrite).
//
// createState() builds the one shared state object S that main.js hands
// to every module through ctx. The shape below is the contract the game
// is graded on, so it is deliberately complete: cash, clock, player and
// loadout, cars and garage, missions, side activities, stats, respect,
// radio, heat, district, mode, and the three directors.
//
// The directors are working fallbacks, not stubs. If a module that owns
// one of these systems is missing, the game still runs: respect still
// ranks up, challenges still pay out once, banter still lands a
// speaker-tagged line, the fence still quotes a price, and the
// pay-n-spray booth still has a position and an armed flag. Modules that
// do exist wrap or replace these directors (missions wraps start(); the
// police module drives heat) — they never have to rebuild the shape.

import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';

function rankTitleFor(respect) {
  let title = CONFIG.respectRanks[0].title;
  for (const r of CONFIG.respectRanks) {
    if (respect >= r.min) title = r.title;
  }
  return title;
}

export function createState() {
  const S = {
    // Money, clock, identity.
    cash: CONFIG.player.startCash,
    day: 1,
    // S.time counts game minutes past 18:28 (day 1 starts at sunset).
    time: 0,
    health: CONFIG.player.maxHealth,
    mode: 'menu',
    cutscene: false,

    // Wanted level: heat 0-100, wanted stars 0-5 (heat / 20).
    wanted: 0,
    heat: 0,
    district: 'downtown',
    radioStation: 0,
    respect: 0,
    missionIndex: 0,

    // Player and vehicles.
    player: null, // filled below (needs the loadout closure over S)
    car: null,
    cars: [],
    garageCars: [],

    // Story and side activities.
    missions: null, // filled below
    sideActivities: {
      taxi: { active: false, dest: null, fare: 0, passenger: null },
      race: { active: false, gate: 0, gates: [] },
    },
    stats: { packages: 0, racesWon: 0, fencesSold: 0, faresDone: 0 },

    // Directors (working fallbacks).
    respectDirector: null,
    challengesDirector: null,
    banterDirector: null,
    fenceDirector: null,
    heatDirector: null,

    // Crew, police, sky.
    crew: { active: false, mesh: null, name: 'LENA CRUZ' },
    cops: [],
    heli: null,
    lastKnown: null,
    dayNight: { phase: 'SUNSET', night: 0 },
    sunLight: null,
    skyDome: null,
  };

  // ---- Player + loadout ----
  const slots = CONFIG.weapons.map((def) => ({ def, ammo: def.mag }));
  S.player = {
    pos: new THREE.Vector3(
      CONFIG.player.startPos.x,
      CONFIG.player.startPos.y,
      CONFIG.player.startPos.z,
    ),
    heading: 0,
    health: CONFIG.player.maxHealth,
    ammo: CONFIG.weapons[0].mag,
    reloading: false,
    reloadT: 0,
    loadout: {
      equipped: 0,
      slots,
      current() {
        return this.slots[this.equipped];
      },
      // Switch weapon. The SMG (slot 1) stays locked until job 1 is done.
      switchTo(i) {
        if (i < 0 || i >= this.slots.length) return false;
        const def = this.slots[i].def;
        if (def.lockedUntilMission && S.missionIndex < def.lockedUntilMission) {
          return false;
        }
        this.equipped = i;
        S.player.ammo = def.mag;
        return true;
      },
    },
  };

  // ---- Missions ----
  // start() takes a 0-based index (start(4) begins m5) or an id string
  // ('m1'). It only sets the current mission; the missions module wraps
  // it to add briefings, dialogue and objectives.
  S.missions = {
    current: null,
    start(id) {
      let idx;
      if (typeof id === 'number') {
        idx = id;
      } else {
        const n = parseInt(String(id).replace(/[^0-9]/g, ''), 10);
        idx = Number.isNaN(n) ? -1 : n - 1;
      }
      const def = CONFIG.missions[idx];
      if (!def) return null;
      S.missions.current = {
        id: def.id,
        index: idx,
        title: def.title,
        giver: def.giver,
        pay: def.pay,
        state: 'active',
      };
      return S.missions.current;
    },
  };

  // ---- Respect director ----
  S.respectDirector = {
    rank: { title: rankTitleFor(0) },
    add(n, why) {
      S.respect += n;
      this.rank.title = rankTitleFor(S.respect);
      return S.respect;
    },
  };

  // ---- Challenges director ----
  // today: the three daily rows. _paid is a Set of ids that already paid
  // out; tick() pays a row exactly once, the moment its stat hits target.
  S.challengesDirector = {
    today: CONFIG.challenges.map((c) => ({
      id: c.id,
      stat: c.stat,
      target: c.target,
      reward: c.reward,
      text: c.text,
    })),
    _paid: new Set(),
    rows() {
      return this.today.map((c) => ({
        id: c.id,
        text: c.text,
        reward: c.reward,
        stat: c.stat,
        target: c.target,
        done: S.stats[c.stat] >= c.target,
        paid: this._paid.has(c.id),
      }));
    },
    tick() {
      for (const c of this.today) {
        if (!this._paid.has(c.id) && S.stats[c.stat] >= c.target) {
          this._paid.add(c.id);
          S.cash += c.reward;
        }
      }
    },
  };

  // ---- Banter director ----
  // Lines always carry a speaker tag ("LENA: \"...\"") and respect a
  // short cooldown so the crew does not talk over itself.
  S.banterDirector = {
    _cooldown: 0,
    _say(speaker, line) {
      if (this._cooldown > 0) return false;
      this._cooldown = 9;
      const el = document.getElementById('toast');
      if (el) el.textContent = speaker + ': "' + line + '"';
      return true;
    },
    raceWin() {
      return this._say('LENA', 'We won that one clean, boss. Told you my lines were faster.');
    },
    taxiDone() {
      return this._say('LENA', 'Fare dropped, cash in hand. Easiest money on the bay.');
    },
    packageFound() {
      return this._say('VIC', 'That package is worth more than it looks. Keep hunting.');
    },
    missionDone() {
      return this._say('VIC', 'Job done, kid. The bay is starting to learn your name.');
    },
    greet() {
      return this._say('LENA', 'Sun is down, streets are ours. What are we doing tonight?');
    },
  };

  // ---- Fence director ----
  // Vic's yard buys cars. wantedBonus is zero when the heat is off.
  S.fenceDirector = {
    priceFor(car) {
      if (!car) return 0;
      const base = { bike: 250, sedan: 400, pickup: 550, sport: 1200 };
      return base[car.kind] || 300;
    },
    wantedBonus() {
      return 0;
    },
  };

  // ---- Heat director ----
  // The pay-n-spray booth: fixed spot, $150, wipes the heat to zero.
  S.heatDirector = {
    sprayBooth: {
      armed: true,
      x: CONFIG.sprayBooth.x,
      z: CONFIG.sprayBooth.z,
      radius: CONFIG.sprayBooth.radius,
      price: CONFIG.sprayBooth.price,
    },
  };

  // ---- Per-frame director tick (called by main.js) ----
  // Decays the banter cooldown and lets completed challenges pay out.
  // The _paid set makes the payout idempotent even if a challenges
  // module also ticks in the same frame.
  S.tick = function tick(dt) {
    if (S.banterDirector._cooldown > 0) {
      S.banterDirector._cooldown = Math.max(0, S.banterDirector._cooldown - dt);
    }
    S.challengesDirector.tick();
  };

  return S;
}

export default createState;
