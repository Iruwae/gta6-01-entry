// SOLMAR BAY — game state (GTA6-01 round 8 rebuild).
// createState() builds every field the game and the acceptance checks
// read: wallet, clock, player and loadout, vehicles, missions, side
// activities, stats, respect, radio, heat, districts, challenges,
// banter, fence and spray-booth directors, crew and day/night.
// The directors here are working fallbacks: a feature module may
// replace any of them during its own init, but nothing in the game
// ever has to guess whether a field exists.

import * as THREE from '../vendor/three.module.min.js';
import { config } from './config.js';

const GARAGE = { x: -90, z: -66 };

const WEAPON_DEFS = [
  { name: 'PISTOL', mag: 12, damage: 25, rate: 0.28, spread: 0.02 },
  { name: 'SMG', mag: 30, damage: 14, rate: 0.09, spread: 0.05 },
  { name: 'SHOTGUN', mag: 6, damage: 55, rate: 0.8, spread: 0.12 },
  { name: 'RIFLE', mag: 30, damage: 34, rate: 0.13, spread: 0.015 },
];

const MISSION_DEFS = [
  { title: 'First Wheels', pay: 200, brief: 'Lena has a car waiting at the garage. Go get it.' },
  { title: 'Harbor Lights', pay: 250, brief: 'Move a package through the harbor without a scene.' },
  { title: 'Strip Run', pay: 300, brief: 'Drive the strip, lose the tail, make the drop.' },
  { title: 'Beach Party Crash', pay: 350, brief: 'Somebody is selling on our beach. Shut it down.' },
  { title: 'Crew Up', pay: 500, brief: 'Lena rides with you now. Hit the uptown score together.' },
  { title: 'Uptown Score', pay: 450, brief: 'A safe in uptown with your name on it.' },
  { title: 'Night Shift', pay: 400, brief: 'Work the night streets while the city sleeps.' },
  { title: "The Fence's Favor", pay: 550, brief: 'Vic needs a car. Bring him something worth selling.' },
  { title: 'Heat Wave', pay: 600, brief: 'Five stars and a helicopter. Make it home anyway.' },
  { title: 'Bay Legend', pay: 1000, brief: 'One last job. The whole bay is watching.' },
];

// Briefing lines per mission, in speaker order. Mission 1 opens with
// Lena, then Marco; the crew mission opens with Lena, then Vic.
const BRIEFINGS = {
  0: [
    { name: 'LENA CRUZ', text: 'You made it. The car is yours — try not to scratch the paint this time.' },
    { name: 'MARCO SOLIS', text: 'Vic says the job pays two hundred. Wheels first, questions later.' },
  ],
  4: [
    { name: 'LENA CRUZ', text: 'I am riding with you on this one. Uptown, big score, no mistakes.' },
    { name: 'VIC TORRES', text: 'Lena drives, you handle the loud part. Split is fair. Go.' },
  ],
};

function defaultBriefing(n) {
  const def = MISSION_DEFS[n];
  return [
    { name: 'VIC TORRES', text: def.title + ' — ' + def.brief },
    { name: 'LENA CRUZ', text: 'Got it. I will watch your back out there.' },
  ];
}

function heatToWanted(heat) {
  if (heat <= 0) return 0;
  if (heat < 20) return 1;
  if (heat < 40) return 2;
  if (heat < 60) return 3;
  if (heat < 80) return 4;
  return 5;
}

function rankFor(points) {
  let best = config.respectRanks[0];
  for (const r of config.respectRanks) {
    if (points >= r.min) best = r;
  }
  return { title: best.title, min: best.min };
}

function toastLine(ctx, text) {
  const el = (ctx && ctx.dom && ctx.dom.toast) || document.getElementById('toast');
  if (el) el.textContent = text;
}

export function createState() {
  const S = {
    cash: config.startCash,
    day: config.startDay,
    // Minutes since 18:28 on day 1. 200 means 21:48, deep night.
    time: 0,
    health: config.startHealth,
    district: 'downtown',
    mode: 'menu',
    cutscene: false,
    paused: false,

    player: {
      pos: new THREE.Vector3(0, 0, 20),
      heading: 0,
      speed: 0,
      vel: { x: 0, z: 0 },
      health: config.startHealth,
      ammo: WEAPON_DEFS[0].mag,
      reloading: false,
      reloadT: 0,
      loadout: null, // filled in below, needs a back-reference to S
    },

    car: null,
    cars: [],
    garageCars: [],
    cops: [],
    heli: null,
    lastKnown: null,

    missions: {
      list: MISSION_DEFS.map((d, i) => ({ id: 'm' + (i + 1), index: i, title: d.title, pay: d.pay, brief: d.brief })),
      current: null,
      start(id) {},
    },
    missionIndex: 0,

    sideActivities: {
      taxi: { active: false, dest: null, fare: 0, passenger: null },
      race: {
        active: false,
        gate: 0,
        gates: [[60, -60], [60, 60], [-60, 60], [-60, -60]],
        startedAt: 0,
      },
    },

    stats: { packages: 0, racesWon: 0, fencesSold: 0, faresDone: 0 },

    respect: 0,
    respectDirector: {
      rank: { title: 'NOBODY', min: 0 },
      add(n, why) {},
    },

    radioStation: 0,
    radioStations: config.stations,

    heat: 0,
    wanted: 0,

    dayNight: { phase: 'SUNSET', night: 0 },
    sunLight: null,
    skyDome: null,

    crew: { active: false, mesh: null, name: 'Lena Cruz' },

    challengesDirector: {
      today: [
        { id: 'pkg3', stat: 'packages', target: 3, reward: 100, text: 'Collect 3 packages' },
        { id: 'race1', stat: 'racesWon', target: 1, reward: 150, text: 'Win 1 street race' },
        { id: 'taxi1', stat: 'faresDone', target: 1, reward: 120, text: 'Finish 1 taxi fare' },
      ],
      _paid: [],
      rows() { return []; },
    },

    banterDirector: {
      _cooldown: 0,
      raceWin() {},
      say() {},
    },

    fenceDirector: {
      priceFor(car) { return 0; },
      wantedBonus(car) { return 0; },
    },

    heatDirector: {
      sprayBooth: { armed: true, x: -90, z: -58, radius: 9 },
      layLow: [{ x: -120, z: 90 }, { x: 120, z: -90 }],
      hideouts: [{ x: 120, z: -120 }],
    },

    // Twelve package spots, including the corners the city funnels
    // the player through.
    packageSpots: [
      { x: -120, z: 120, taken: false },
      { x: 120, z: -120, taken: false },
      { x: -120, z: -120, taken: false },
      { x: 120, z: 120, taken: false },
      { x: 0, z: 165, taken: false },
      { x: 120, z: -90, taken: false },
      { x: 0, z: 135, taken: false },
      { x: -60, z: 60, taken: false },
      { x: 60, z: -60, taken: false },
      { x: -90, z: -58, taken: false },
      { x: 110, z: 138, taken: false },
      { x: 68, z: 60, taken: false },
    ],

    taxiDests: [
      { x: -120, z: -120 },
      { x: 120, z: 120 },
      { x: 0, z: 165 },
      { x: -120, z: 90 },
      { x: 120, z: -90 },
    ],

    saveKey: config.saveKey,
    _dlg: null,
    _m1AutoDone: false,
  };

  // ---- Loadout: four slots, SMG locked until the first job is done.
  const weapons = WEAPON_DEFS.map((def) => ({ def, ammo: def.mag }));
  S.player.loadout = {
    equipped: 0,
    weapons,
    current() {
      return this.weapons[this.equipped];
    },
    canEquip(slot) {
      if (slot === 1 && S.missionIndex < 1) return false;
      return slot >= 0 && slot < this.weapons.length;
    },
    equip(slot) {
      if (!this.canEquip(slot)) return false;
      this.equipped = slot;
      S.player.ammo = this.weapons[slot].ammo;
      return true;
    },
  };

  // Player combat helpers, shared by the weapons module.
  S.player.fire = function fire() {
    if (S.player.reloading) return false;
    const w = S.player.loadout.current();
    if (!w || w.ammo <= 0) return false;
    w.ammo -= 1;
    S.player.ammo = w.ammo;
    return true;
  };
  S.player.startReload = function startReload() {
    if (S.player.reloading) return false;
    const w = S.player.loadout.current();
    if (!w || w.ammo >= w.def.mag) return false;
    S.player.reloading = true;
    S.player.reloadT = config.reloadSeconds;
    return true;
  };

  // ---- Missions: start(n) opens job n (0-based) as m(n+1).
  S.missions.start = function startMission(n) {
    const idx = Math.max(0, Math.min(MISSION_DEFS.length - 1, n | 0));
    const def = S.missions.list[idx];
    if (S.missions.current && S.missions.current.id === def.id) return S.missions.current;
    S.missions.current = { id: def.id, index: idx, title: def.title, pay: def.pay, brief: def.brief, stage: 0 };
    S.missionIndex = idx + 1;
    if (idx === 4) {
      S.crew.active = true;
      if (S.crew.mesh) S.crew.mesh.visible = true;
    }
    showBriefing(idx);
    return S.missions.current;
  };

  function showBriefing(idx) {
    const lines = (BRIEFINGS[idx] || defaultBriefing(idx)).slice();
    const ctx = S._ctx;
    // Prefer a dialogue module that registered itself on ctx.api.
    if (ctx && ctx.api) {
      if (typeof ctx.api.showDialogue === 'function') { ctx.api.showDialogue(lines); return; }
      if (ctx.api.dialogue && typeof ctx.api.dialogue.show === 'function') { ctx.api.dialogue.show(lines); return; }
      if (typeof ctx.api.say === 'function') { ctx.api.say(lines); return; }
    }
    // Fallback: drive the dialogue box directly.
    S._dlg = { lines, i: 0 };
    renderDlgLine(ctx);
    const box = (ctx && ctx.dom && ctx.dom.dialogue) || document.getElementById('dialogue');
    if (box && !box._solmarBound) {
      box._solmarBound = true;
      box.addEventListener('click', () => {
        if (!S._dlg) return;
        S._dlg.i += 1;
        if (S._dlg.i >= S._dlg.lines.length) {
          S._dlg = null;
          box.classList.add('hidden');
          return;
        }
        renderDlgLine(ctx);
      });
    }
  }

  function renderDlgLine(ctx) {
    const d = S._dlg;
    if (!d) return;
    const line = d.lines[d.i];
    const dom = (ctx && ctx.dom) || {};
    const nameEl = dom['dlg-name'] || document.getElementById('dlg-name');
    const textEl = dom['dlg-text'] || document.getElementById('dlg-text');
    const box = dom.dialogue || document.getElementById('dialogue');
    if (nameEl) nameEl.textContent = line.name;
    if (textEl) textEl.textContent = line.text;
    if (box) box.classList.remove('hidden');
  }

  // ---- Respect: adding points moves the rank and the HUD with it.
  S.respectDirector.add = function addRespect(n, why) {
    S.respect += n;
    S.respectDirector.rank = rankFor(S.respect);
    const num = document.getElementById('respect-num');
    const rankEl = document.getElementById('respect-rank');
    if (num) num.textContent = String(S.respect);
    if (rankEl) rankEl.textContent = S.respectDirector.rank.title;
    return S.respectDirector.rank;
  };

  // ---- Daily challenges: three rows, each pays once on completion.
  S.challengesDirector.rows = function challengeRows() {
    return S.challengesDirector.today.map((c) => ({
      id: c.id,
      text: c.text,
      reward: c.reward,
      stat: c.stat,
      target: c.target,
      done: S.stats[c.stat] >= c.target,
      paid: S.challengesDirector._paid.indexOf(c.id) !== -1,
    }));
  };

  function payDueChallenges(ctx) {
    for (const c of S.challengesDirector.today) {
      if (S.stats[c.stat] >= c.target && S.challengesDirector._paid.indexOf(c.id) === -1) {
        S.challengesDirector._paid.push(c.id);
        S.cash += c.reward;
        toastLine(ctx, 'CHALLENGE COMPLETE: ' + c.text + ' — +$' + c.reward);
      }
    }
  }

  // ---- Banter: speaker-tagged crew lines on the toast.
  S.banterDirector.say = function sayBanter(speaker, text) {
    if (S.banterDirector._cooldown > 0) return false;
    S.banterDirector._cooldown = config.banterCooldown;
    toastLine(S._ctx, speaker + ': "' + text + '"');
    return true;
  };
  S.banterDirector.raceWin = function raceWinBanter() {
    return S.banterDirector.say('LENA', 'That was clean driving, boss. The whole bay saw that.');
  };
  S.banterDirector.fareDone = function fareDoneBanter() {
    return S.banterDirector.say('VIC', 'Fare paid, no questions. That is how you run a cab.');
  };
  S.banterDirector.busted = function bustedBanter() {
    return S.banterDirector.say('LENA', 'Do not let them box you in. Keep moving!');
  };

  // ---- Fence: what Vic pays for a car, plus a heat bonus.
  S.fenceDirector.priceFor = function priceFor(car) {
    if (!car) return 0;
    const base = { bike: 220, sedan: 350, pickup: 420, sport: 650 };
    const b = base[car.kind] || 250;
    const tune = car.tune || {};
    return b + (tune.engine || 0) * 40 + (tune.armor || 0) * 25 + (tune.nos ? 50 : 0);
  };
  S.fenceDirector.wantedBonus = function wantedBonus(car) {
    return S.heat > 0 ? 30 : 0;
  };

  S._payDueChallenges = payDueChallenges;
  S._heatToWanted = heatToWanted;
  return S;
}

// init(ctx): publish the state on the context and register the small
// per-frame housekeeping that belongs to state, not to any feature:
// wanted stars follow heat, the mirrored health follows the player,
// reloads commit, banter cools down, due challenge payouts land, and
// the first job offers itself when the player walks into the garage.
export function init(ctx) {
  const S = ctx.state;
  S._ctx = ctx;
  ctx.state = S;

  ctx.updates.push(function stateHousekeeping(dt) {
    // Wanted stars are derived from heat, one star per 20 heat.
    S.wanted = S._heatToWanted(S.heat);
    // S.health mirrors the player; the player is the source of truth.
    S.health = S.player.health;

    // Reload commit: the timer runs down, then the magazine refills.
    if (S.player.reloading) {
      S.player.reloadT -= dt;
      if (S.player.reloadT <= 0) {
        const w = S.player.loadout.current();
        if (w) {
          w.ammo = w.def.mag;
          S.player.ammo = w.ammo;
        }
        S.player.reloading = false;
        S.player.reloadT = 0;
      }
    }

    if (S.banterDirector._cooldown > 0) {
      S.banterDirector._cooldown = Math.max(0, S.banterDirector._cooldown - dt);
    }

    S._payDueChallenges(ctx);

    // Mission 1 offers itself at the garage door.
    if (
      S.mode === 'playing' &&
      !S.missions.current &&
      S.missionIndex === 0 &&
      !S._m1AutoDone
    ) {
      const dx = S.player.pos.x - GARAGE.x;
      const dz = S.player.pos.z - GARAGE.z;
      if (dx * dx + dz * dz < 100) {
        S._m1AutoDone = true;
        S.missions.start(0);
      }
    }
  });
}

export default createState;
