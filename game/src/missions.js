// SOLMAR BAY — missions.js
// Story: Marco Solis comes home to Solmar Bay with $120 in his pocket and a
// debt on his back. Lena Cruz runs the Bayline garage and hands him jobs.
// Four sequential jobs. Fail a timed delivery and the job restarts — the
// debt doesn't forgive, but Lena always gives a second chance.
//
// Design note (game-design-theory): one clear loop — take job, drive/fight,
// get paid, next job — with stakes rising per job (drive -> timed deliveries
// -> combat -> full police escape). Every stage has a single readable
// objective; the reward is the competence signal, the wanted level is the
// pressure that keeps the loop from going flat.

import * as THREE from 'three';
import { S, saveGame } from './state.js';
import { CFG } from './config.js';
import { Car } from './vehicles.js';
import { Ped } from './people.js';
import { DIALOGUE } from './dialogue.js';

const FALLBACK_REWARDS = [500, 800, 1200, 2500, 4000, 5500, 7000, 9000, 12000, 20000];
const RIVAL_SHIRTS = [0xc0392b, 0x8e44ad, 0xd35400, 0x2c3e50];

function rewardFor(i) {
  // CFG.MISSIONS is the rewards array itself: [500, 800, 1200, 2500].
  // Also accept a { rewards: [...] } shape, just in case.
  const m = CFG && CFG.MISSIONS;
  const list = Array.isArray(m) ? m : (m && Array.isArray(m.rewards) ? m.rewards : FALLBACK_REWARDS);
  return typeof list[i] === 'number' ? list[i] : FALLBACK_REWARDS[i];
}

function dist2D(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

function clampCoord(v) {
  return Math.max(-145, Math.min(145, v));
}

export class Missions {
  constructor() {
    this.defs = [
      {
        id: 'm1',
        title: 'First Wheels',
        flavor: 'Steal the sport car, lose nobody, bring it to the bank.',
        briefing: 'Lena: "Marco! You\'re back. I need wheels moved — get to my garage, take the sport car, and drop it by the bank. Don\'t scratch it."',
        stages: [
          { type: 'goto', target: { x: -90, z: -66, r: 8 }, text: 'Go to the Bayline garage' },
          { type: 'enter', spawn: 'sport', target: { x: -90, z: -66, r: 12 }, text: 'Get in the sport car' },
          { type: 'drive', target: { x: 30, z: 52, r: 10 }, text: 'Drive the sport car to the Solmar Bank' },
        ],
      },
      {
        id: 'm2',
        title: 'Courier Run',
        flavor: 'Two drops against the clock. Late means no pay.',
        briefing: 'Lena: "Package waiting at the harbor. Two drops, and the clock is ticking — late means no pay. Move!"',
        stages: [
          { type: 'goto', target: { x: 90, z: 138, r: 10 }, text: 'Pick up the package at the harbor' },
          { type: 'deliver', target: { x: -30, z: 90, r: 8 }, time: 90, text: 'Deliver the package — North Docks (90s)' },
          { type: 'deliver', target: { x: 90, z: -30, r: 8 }, time: 60, text: 'Deliver the package — East Side (60s)' },
        ],
      },
      {
        id: 'm3',
        title: 'Harbor Heat',
        flavor: "A rival crew on Lena's turf. Clear them out.",
        briefing: 'Lena: "A crew is muscling in on my harbor turf. Go clear them out — then come home. Watch your back."',
        stages: [
          { type: 'goto', target: { x: 90, z: 138, r: 10 }, text: 'Go to the harbor' },
          { type: 'kill', spawn: 'rivals', target: { x: 90, z: 138, r: 14 }, text: 'Clear out the harbor crew' },
          { type: 'goto', target: { x: -90, z: -66, r: 8 }, text: 'Get back to the Bayline garage' },
        ],
      },
      {
        id: 'm4',
        title: 'The Big Score',
        flavor: 'The bank van. The whole city on you. Bring it home.',
        briefing: 'Lena: "One last job, Marco. The bank van. Take it, and the whole city will be on you — bring it to my garage and we\'re square. All of it."',
        stages: [
          { type: 'goto', target: { x: 30, z: 52, r: 10 }, text: 'Go to the Solmar Bank' },
          { type: 'enter', spawn: 'van', target: { x: 30, z: 52, r: 12 }, text: 'Get in the getaway van' },
          { type: 'escape', target: { x: -90, z: -66, r: 10 }, text: 'Escape! Bring the van to the Bayline garage' },
        ],
      },
      {
        id: 'm5',
        title: 'Payday at the Pier',
        flavor: 'Move the take from the pier to the bank. Vic is watching.',
        briefing: 'Lena: "The debt is gone but the garage still eats. A buyer at the pier wants the take moved — fast, quiet, no questions. Vic will be watching."',
        stages: [
          { type: 'goto', target: { x: 90, z: 138, r: 10 }, text: 'Go to the harbor pier' },
          { type: 'deliver', target: { x: 30, z: 52, r: 8 }, time: 75, heat: 25, text: 'Deliver the take to the bank (75s)' },
          { type: 'goto', target: { x: -90, z: -66, r: 8 }, text: 'Get back to the Bayline garage' },
        ],
      },
      {
        id: 'm6',
        title: 'The Fence',
        flavor: 'A hot GT at the motel. The cops like that car.',
        briefing: 'Vic: "You move clean, kid. I got a hot GT at the motel — take it across town to the north docks. Cops like that car. Do not let them keep it."',
        stages: [
          { type: 'goto', target: { x: 120, z: -120, r: 10 }, text: 'Meet Vic at the motel' },
          { type: 'enter', spawn: 'sport', spawnAt: { x: 108, z: -120 }, target: { x: 108, z: -120, r: 12 }, text: 'Get in the hot sport car' },
          { type: 'drive', target: { x: -30, z: 120, r: 10 }, heat: 40, text: 'Drive the hot car to the north docks' },
        ],
      },
      {
        id: 'm7',
        title: 'Turf War',
        flavor: 'Two crews, two turf fights, one afternoon.',
        briefing: 'Lena: "Two crews moved in while we were busy — one on my harbor, one at the bank. Take both lots down, Marco. The bay is ours."',
        stages: [
          { type: 'goto', target: { x: 90, z: 138, r: 10 }, text: 'Go to the harbor' },
          { type: 'kill', spawn: 'rivals', crewAt: { x: 90, z: 138 }, target: { x: 90, z: 138, r: 14 }, text: 'Clear the harbor crew' },
          { type: 'goto', target: { x: 30, z: 52, r: 10 }, text: 'Go to the bank' },
          { type: 'kill', spawn: 'rivals', crewAt: { x: 30, z: 52 }, target: { x: 30, z: 52, r: 14 }, heat: 55, text: 'Clear the bank crew' },
          { type: 'goto', target: { x: -90, z: -66, r: 8 }, text: 'Get back to the Bayline garage' },
        ],
      },
      {
        id: 'm8',
        title: 'Midnight Run',
        flavor: 'Two drops, one hold, and the PD on overtime.',
        briefing: 'Vic: "Big night, kid. Two drops, one pickup, and the whole PD on overtime. You hold the pier for twenty seconds while the deal closes — then you vanish."',
        stages: [
          { type: 'deliver', target: { x: -30, z: 90, r: 8 }, time: 90, text: 'Drop one — North Docks (90s)' },
          { type: 'deliver', target: { x: 90, z: -30, r: 8 }, time: 60, text: 'Drop two — East Side (60s)' },
          { type: 'hold', target: { x: 90, z: 138, r: 10 }, time: 20, heat: 70, text: 'Hold the pier — 20s while the deal closes' },
          { type: 'goto', target: { x: -90, z: -66, r: 8 }, text: 'Get back to the Bayline garage' },
        ],
      },
      {
        id: 'm9',
        title: 'Hot Wheels',
        flavor: 'Steal a PD interceptor in daylight. Five stars.',
        briefing: 'Lena: "You want legend status? Take a PD interceptor off the bank forecourt, in daylight, and bring it home. Five stars, Marco. Five."',
        stages: [
          { type: 'goto', target: { x: 30, z: 52, r: 10 }, text: 'Go to the Solmar Bank' },
          { type: 'enter', spawn: 'interceptor', target: { x: 30, z: 52, r: 12 }, text: 'Steal the PD interceptor' },
          { type: 'escape', target: { x: -90, z: -66, r: 10 }, heat: 90, text: 'Escape! Five stars — bring it to the garage' },
        ],
      },
      {
        id: 'm10',
        title: 'King of the Bay',
        flavor: 'Everything we built, one last run. The city is watching.',
        briefing: 'Lena: "Everything we built comes down to this. The bank van, the harbor, the whole city watching. Bring it all home, Marco — and Solmar Bay is yours. Forever."',
        stages: [
          { type: 'goto', target: { x: 30, z: 52, r: 10 }, text: 'Go to the Solmar Bank' },
          { type: 'enter', spawn: 'van', target: { x: 30, z: 52, r: 12 }, text: 'Get in the getaway van' },
          { type: 'escape', target: { x: 90, z: 138, r: 10 }, heat: 95, text: 'Escape to the harbor — five stars' },
          { type: 'hold', target: { x: 90, z: 138, r: 10 }, time: 15, text: 'Hold the harbor — 15s for the crew to load up' },
          { type: 'goto', target: { x: -90, z: -66, r: 8 }, text: 'Bring it home to the Bayline garage' },
        ],
      },
    ];
    this.current = null; // active mission def object
    this.currentIdx = -1;
    this.stageIdx = 0;
    this.timer = 0;
    this.rivals = [];
    this.targetVan = null;
    this.targetInterceptor = null; // m9: the stolen PD interceptor
    this.missionCar = null;
  }

  // Reward for job i (menu.js reads this for the job list).
  rewardOf(i) {
    return rewardFor(i);
  }

  // ---- helpers -----------------------------------------------------------

  _toast(text) {
    if (S && S.hud && typeof S.hud.toast === 'function') S.hud.toast(text);
  }

  _blip() {
    if (S && S.audio && typeof S.audio.blip === 'function') S.audio.blip();
  }

  _jingle() {
    if (S && S.audio && typeof S.audio.jingle === 'function') S.audio.jingle();
  }

  _playerPos() {
    if (S && S.player && S.player.pos) return S.player.pos;
    return null;
  }

  _near(target) {
    const p = this._playerPos();
    if (!p || !target) return false;
    return dist2D(p.x, p.z, target.x, target.z) <= (target.r || 8);
  }

  _scene() {
    return S && S.world ? S.world.scene : null;
  }

  _removeFrom(list, obj) {
    if (Array.isArray(list)) {
      const i = list.indexOf(obj);
      if (i >= 0) list.splice(i, 1);
    }
  }

  // ---- spawning ----------------------------------------------------------

  _spawnSportCar() {
    const scene = this._scene();
    if (!scene) return null;
    if (this.missionCar && !this.missionCar.dead) return this.missionCar;
    const car = new Car(scene, { x: -90, z: -66, heading: Math.PI / 2, color: 0xe74c3c, kind: 'sport' });
    car.parked = true; // stays put until the player takes it (else traffic AI drives it off)
    if (S && Array.isArray(S.cars)) S.cars.push(car);
    this.missionCar = car;
    return car;
  }

  _spawnSportCarAt(x, z) {
    const scene = this._scene();
    if (!scene) return null;
    if (this.missionCar && !this.missionCar.dead) return this.missionCar;
    const car = new Car(scene, { x, z, heading: Math.PI / 2, color: 0xe74c3c, kind: 'sport' });
    car.parked = true;
    if (S && Array.isArray(S.cars)) S.cars.push(car);
    this.missionCar = car;
    return car;
  }

  _spawnVan() {
    const scene = this._scene();
    if (!scene) return null;
    if (this.targetVan && !this.targetVan.dead) return this.targetVan;
    // The van waits on the bank forecourt (30, 52), south of the bank —
    // the old (30, 30) spot was the middle of the bank building, so the
    // van spawned inside the walls and got shoved out by collision.
    const van = new Car(scene, { x: 30, z: 52, heading: -Math.PI / 2, color: 0x95a5a6, kind: 'van' });
    van.parked = true; // stays put until the player takes it
    if (S && Array.isArray(S.cars)) S.cars.push(van);
    this.targetVan = van;
    return van;
  }

  // m9: a PD interceptor parked on the bank forecourt, waiting to be
  // stolen in daylight. Same shape as the van spawn, different prey.
  _spawnInterceptor() {
    const scene = this._scene();
    if (!scene) return null;
    if (this.targetInterceptor && !this.targetInterceptor.dead) return this.targetInterceptor;
    const car = new Car(scene, { x: 30, z: 52, heading: -Math.PI / 2, color: 0xf2f2f2, kind: 'police' });
    car.parked = true;
    if (S && Array.isArray(S.cars)) S.cars.push(car);
    this.targetInterceptor = car;
    return car;
  }

  // A hostile crew at an arbitrary corner (m7 hits two spots). Same
  // four-fighter shape as the harbor crew, placed where the stage says.
  _spawnCrewAt(x, z, count) {
    const scene = this._scene();
    if (!scene || !S || !S.world) return;
    if (this.rivals.length > 0) return;
    const offsets = [
      { x: -8, z: -6 }, { x: 8, z: -6 },
      { x: -8, z: 8 }, { x: 8, z: 8 },
      { x: 0, z: -12 }, { x: 0, z: 12 },
    ];
    const n = Math.max(1, Math.min(6, count || 4));
    for (let i = 0; i < n; i++) {
      const o = offsets[i % offsets.length];
      const ped = new Ped(scene, S.world, {
        x: clampCoord(x + o.x),
        z: clampCoord(z + o.z),
        hostile: true,
        shirt: RIVAL_SHIRTS[i % RIVAL_SHIRTS.length],
      });
      if (S && Array.isArray(S.peds)) S.peds.push(ped);
      this.rivals.push(ped);
    }
    this._toast('Hostile crew: ' + n + ' — clear them out!');
  }

  _spawnRivals() {
    const scene = this._scene();
    if (!scene || !S || !S.world) return;
    if (this.rivals.length > 0) return;
    const offsets = [
      { x: -8, z: -6 }, { x: 8, z: -6 },
      { x: -8, z: 8 }, { x: 8, z: 8 },
    ];
    for (let i = 0; i < 4; i++) {
      const o = offsets[i];
      const ped = new Ped(scene, S.world, {
        x: clampCoord(90 + o.x),
        z: clampCoord(138 + o.z),
        hostile: true,
        shirt: RIVAL_SHIRTS[i % RIVAL_SHIRTS.length],
      });
      if (S && Array.isArray(S.peds)) S.peds.push(ped);
      this.rivals.push(ped);
    }
    this._toast('Harbor crew: 4 hostiles — clear them out!');
  }

  // Which vehicle an 'enter' stage wants: the van for m4/m10, the
  // interceptor for m9, the sport car for the rest.
  _enterTarget() {
    if (!this.current) return null;
    if (this.current.id === 'm9') return this.targetInterceptor;
    if (this.current.id === 'm4' || this.current.id === 'm10') return this.targetVan;
    return this.missionCar;
  }

  _clearSpawns(removeVan) {
    for (const ped of this.rivals) {
      if (ped && typeof ped.remove === 'function') ped.remove();
      this._removeFrom(S ? S.peds : null, ped);
    }
    this.rivals = [];
    if (removeVan && this.targetVan) {
      if (typeof this.targetVan.remove === 'function') this.targetVan.remove();
      this._removeFrom(S ? S.cars : null, this.targetVan);
      this.targetVan = null;
    }
    if (removeVan && this.targetInterceptor) {
      if (typeof this.targetInterceptor.remove === 'function') this.targetInterceptor.remove();
      this._removeFrom(S ? S.cars : null, this.targetInterceptor);
      this.targetInterceptor = null;
    }
  }

  // ---- lifecycle ---------------------------------------------------------

  start(i) {
    if (typeof i !== 'number' || i < 0 || i >= this.defs.length) return;
    this._clearSpawns(true);
    this.current = this.defs[i];
    this.currentIdx = i;
    this.stageIdx = 0;
    this.timer = 0;
    this._enterStage();
    this._toast(this.current.briefing);
    // Lena joins every job as the getaway companion (crew.js).
    if (S && S.crew && typeof S.crew.joinMission === 'function') S.crew.joinMission(i);
    // Mission briefing as a dialogue box with Lena's portrait — the toast
    // stays as the stage text, the dialogue carries the story.
    if (S && S.dialogue && typeof S.dialogue.play === 'function') {
      const lines = DIALOGUE[this.current.id + '_brief'];
      if (lines) S.dialogue.play(lines);
    }
    this._jingle();
  }

  // Start the next job (S.missionIndex), if none is running.
  startNext() {
    if (this.current) return false;
    const i = S ? S.missionIndex : 0;
    if (typeof i !== 'number' || i < 0 || i >= this.defs.length) return false;
    this.start(i);
    return true;
  }

  // Full reset for a new run / loaded save: clear spawned mission actors.
  reset() {
    this._clearSpawns(true);
    this.current = null;
    this.currentIdx = -1;
    this.stageIdx = 0;
    this.timer = 0;
    this.missionCar = null;
    this.targetVan = null;
    this.targetInterceptor = null;
  }

  _enterStage() {
    const stage = this.current.stages[this.stageIdx];
    if (!stage) return;
    if (stage.type === 'deliver' || stage.type === 'hold') {
      this.timer = typeof stage.time === 'number' ? stage.time : 60;
    } else {
      this.timer = 0;
    }
    if (stage.spawn === 'rivals') {
      if (stage.crewAt) this._spawnCrewAt(stage.crewAt.x, stage.crewAt.z, 4);
      else this._spawnRivals();
    }
    if (stage.spawn === 'van') this._spawnVan();
    if (stage.spawn === 'interceptor') this._spawnInterceptor();
    if (stage.spawn === 'sport') {
      if (stage.spawnAt) this._spawnSportCarAt(stage.spawnAt.x, stage.spawnAt.z);
      else this._spawnSportCar();
    }
    // Stage heat: a stage can declare the wanted level it brings —
    // the stakes rise across the ten jobs, and the heat lands on entry.
    if (typeof stage.heat === 'number' && S) {
      S.heat = Math.max(S.heat || 0, stage.heat);
      if (stage.heat >= 70) this._toast('The whole city is on you now!');
    }
  }

  _advance() {
    const stage = this.current.stages[this.stageIdx];
    // Leaving with the bank van puts the whole city on Marco.
    if (stage && stage.type === 'enter' && this.current.id === 'm4') {
      if (S) {
        S.wanted = 3;
        S.heat = 55; // heat 55 reads as 3 stars on the main loop's scale
      }
      this._toast('The heat is on! 3 stars — lose them at the garage!');
      if (S && S.audio && typeof S.audio.siren === 'function') S.audio.siren(true);
    }
    this.stageIdx++;
    if (this.stageIdx >= this.current.stages.length) {
      this._complete();
      return;
    }
    this._enterStage();
    this._blip();
    const next = this.current.stages[this.stageIdx];
    if (next && next.text) this._toast(next.text);
  }

  _complete() {
    // Replays pay the repeat rate (menu.js sets S.replayPay to 0.5 for
    // a replayed job); first runs pay full. The rate resets here so the
    // next job always starts at full pay.
    const reward = Math.round(rewardFor(this.currentIdx) * (S ? (S.replayPay || 1) : 1));
    if (S) S.replayPay = 1;
    if (S) {
      S.cash += reward;
      if (S.stats) S.stats.missionsDone++;
      S.missionIndex++;
    }
    // Respect, chatter, and the clean-job tally live here: the moment a
    // job lands is the moment the bay notices.
    const doneIdx = this.currentIdx;
    if (S && S.respectDirector) S.respectDirector.jobDone(doneIdx);
    if (S && S.banterDirector) S.banterDirector.missionDone();
    if (S && S.stats && (S.wanted || 0) <= 1) S.stats.cleanJobs = (S.stats.cleanJobs || 0) + 1;
    // The tenth job ends the story: the outro sweep plays once the
    // done-line has cleared (main.js watches outroPending).
    if (doneIdx === 9 && S) S.outroPending = true;
    this._jingle();
    this._toast('Job done! +$' + reward);
    // Lena steps off the job with Marco (crew.js).
    if (S && S.crew && typeof S.crew.leaveMission === 'function') S.crew.leaveMission();
    if (S && S.dialogue && typeof S.dialogue.play === 'function') {
      const lines = DIALOGUE[this.current.id + '_done'];
      if (lines) S.dialogue.play(lines);
    }
    if (S && S.audio && typeof S.audio.siren === 'function') S.audio.siren(false);
    if (typeof saveGame === 'function') {
      try { saveGame(); } catch (e) { /* save is best-effort mid-game */ }
    }
    this.current = null;
    this.currentIdx = -1;
    this.stageIdx = 0;
    this.timer = 0;
    this.rivals = [];
    // The getaway van stays where the player left it; the sport car is theirs.
    this.targetVan = null;
    this.targetInterceptor = null;
  }

  fail() {
    const idx = this.currentIdx;
    this._toast('Job failed — try again');
    if (S && S.crew && typeof S.crew.leaveMission === 'function') S.crew.leaveMission();
    if (S && S.audio && typeof S.audio.siren === 'function') S.audio.siren(false);
    this._clearSpawns(true);
    this.current = null;
    this.currentIdx = -1;
    this.stageIdx = 0;
    this.timer = 0;
    if (idx >= 0 && idx < this.defs.length) this.start(idx);
  }

  // Called by the main loop / people system when a ped dies.
  registerKill(ped) {
    const i = this.rivals.indexOf(ped);
    if (i < 0) return;
    this.rivals.splice(i, 1);
    if (this.current && this.current.id === 'm3') {
      if (this.rivals.length > 0) {
        this._toast('Harbor crew: ' + this.rivals.length + ' left');
      } else {
        this._toast('Harbor clear — get back to the garage');
      }
    }
  }

  // ---- per-frame ---------------------------------------------------------

  update(dt) {
    if (!this.current) return;
    const stage = this.current.stages[this.stageIdx];
    if (!stage) return;

    if (stage.type === 'deliver') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.fail();
        return;
      }
      if (this._near(stage.target)) {
        if (this.stageIdx === 0) this._toast('Package collected');
        this._advance();
      }
      return;
    }

    if (stage.type === 'goto') {
      if (this._near(stage.target)) {
        if (this.current.id === 'm2' && this.stageIdx === 0) {
          this._toast('Package collected');
        }
        this._advance();
      }
      return;
    }

    if (stage.type === 'drive') {
      if (S && S.car && this._near(stage.target)) this._advance();
      return;
    }

    if (stage.type === 'enter') {
      const want = this._enterTarget();
      if (S && S.car && (!want || S.car === want)) this._advance();
      return;
    }

    if (stage.type === 'hold') {
      // Hold the zone: the timer only runs while Marco stands inside.
      if (this._near(stage.target)) {
        this.timer -= dt;
        if (this.timer <= 0) this._advance();
      }
      return;
    }

    if (stage.type === 'kill') {
      if (this.rivals.length === 0) this._advance();
      return;
    }

    if (stage.type === 'escape') {
      if (S && S.car && S.car === this._enterTarget() && this._near(stage.target)) {
        this._advance();
      }
      return;
    }
  }

  // ---- HUD queries -------------------------------------------------------

  objectiveText() {
    if (this.current) {
      const stage = this.current.stages[this.stageIdx];
      if (!stage) return this.current.title;
      let text = this.current.title + ': ' + stage.text;
      if (stage.type === 'kill') {
        text += ' (' + this.rivals.length + ' left)';
      }
      if (stage.type === 'deliver' && this.timer > 0) {
        text += ' — ' + Math.ceil(this.timer) + 's';
      }
      if (stage.type === 'hold' && this.timer > 0) {
        text += ' — hold ' + Math.ceil(this.timer) + 's';
      }
      return text;
    }
    if (S && typeof S.missionIndex === 'number' && S.missionIndex >= this.defs.length) {
      return 'All jobs done — Solmar Bay is yours';
    }
    return 'Free roam — visit the Bayline garage to start the next job';
  }

  marker() {
    if (!this.current) return null;
    const stage = this.current.stages[this.stageIdx];
    if (!stage) return null;
    if (stage.type === 'enter') {
      const want = this._enterTarget();
      if (want && want.pos) return { x: want.pos.x, z: want.pos.z };
    }
    if (stage.target) return { x: stage.target.x, z: stage.target.z };
    return null;
  }
}
