// SOLMAR BAY — heat.js
// HeatDirector: the wanted system grows teeth. Heat is no longer a flat
// drain — how fast it cools depends on how Marco behaves, and the city
// offers two legal-ish ways out of a dragnet.
//
// - Lay low: no crime for 8 s AND moving slowly (on foot, or crawling
//   under 3 m/s) triples the heat drain. Floor it at 15+ m/s and the
//   drain halves — running keeps the heat.
// - Hideouts: three quiet corners (garage backlot, motel courtyard,
//   north docks). Stand inside one for 3 s and a whole star (30 heat)
//   falls off. Each hideout rests 60 s after use.
// - Pay-n-spray: drive into the garage spray booth with $150 and the
//   booth strips 2 stars and repaints the car. Re-arms when you leave.
// - Heat spikes: a crime committed while already at 3+ stars adds a
//   +5 spike on top — the PD remembers repeat offenders.
//
// The director OWNS the heat drain: main.js calls update(dt) once per
// frame instead of draining heat itself. Crimes are detected by watching
// S.heat jump between frames (the director's own drain is accounted
// for first), so no other system has to remember to call in.

import * as THREE from 'three';
import { S } from './state.js';
import { CFG } from './config.js';

const HIDEOUT_REST = 60; // seconds before a used hideout works again
const HIDEOUT_HOLD = 3; // seconds standing inside to shed a star
const HIDEOUT_R = 8; // hideout radius in metres
const SPRAY_COST = 150;
const SPRAY_SHED = 60; // two stars
const SPRAY_R = 9;

function clamp(v, a, b) {
  if (v < a) return a;
  if (v > b) return b;
  return v;
}

export class HeatDirector {
  constructor() {
    // Hideouts are fixed city corners (all inside the ±150 bounds).
    this.hideouts = [
      { x: -108, z: -108, name: 'Garage backlot', cooldown: 0, holdT: 0 },
      { x: 120, z: -120, name: 'Motel courtyard', cooldown: 0, holdT: 0 },
      { x: -30, z: 120, name: 'North docks', cooldown: 0, holdT: 0 },
    ];
    // Spray booth: the garage forecourt, just south of the garage door.
    this.sprayBooth = { x: -90, z: -58, r: SPRAY_R, armed: true };
    this.lastCrimeT = -999;
    this.spikes = 0; // heat-spike crimes this run
    this.layLow = false; // true while the drain is tripled
    this.shedTotal = 0; // heat shed by hideouts + spray this run
    this._prevHeat = 0;
    this._sprayToastT = 0;
  }

  reset() {
    for (const h of this.hideouts) { h.cooldown = 0; h.holdT = 0; }
    this.sprayBooth.armed = true;
    this.lastCrimeT = -999;
    this.spikes = 0;
    this.layLow = false;
    this.shedTotal = 0;
    this._prevHeat = 0;
  }

  // Current drain multiplier, for the HUD heat meter to explain itself.
  drainRate() {
    return this.layLow ? 3 : 1;
  }

  // Nearest ready hideout, for the minimap + HUD hint. Null when none.
  nearestHideout(px, pz) {
    let best = null;
    let bestD = Infinity;
    for (const h of this.hideouts) {
      if (h.cooldown > 0) continue;
      const d = Math.hypot(h.x - px, h.z - pz);
      if (d < bestD) { bestD = d; best = h; }
    }
    return best ? { hideout: best, dist: bestD } : null;
  }

  update(dt) {
    if (!S || !S.player) return;
    const base = (CFG && CFG.WANTED && CFG.WANTED.decayPerSec) || 2.5;

    // --- crime detection: heat jumped since our last drain ---
    const jumped = S.heat - this._prevHeat;
    if (jumped > 0.5) {
      this.lastCrimeT = S.time;
      // A crime at 3+ stars spikes: the PD holds a grudge.
      if (S.wanted >= 3) {
        S.heat = Math.min(100, S.heat + 5);
        this.spikes++;
      }
    }

    // --- drain: lay-low triples it, speeding halves it ---
    const speed = S.car ? Math.abs(S.car.speed) : 0;
    const movingSlow = S.player.onFoot || speed < 3;
    const quietFor = S.time - this.lastCrimeT;
    this.layLow = quietFor > 8 && movingSlow;
    let rate = this.layLow ? base * 3 : base;
    if (!S.player.onFoot && speed > 15) rate = base * 0.5;
    S.heat = Math.max(0, S.heat - rate * dt);

    // --- hideouts: hold still inside one to shed a star ---
    const px = S.player.pos.x;
    const pz = S.player.pos.z;
    for (const h of this.hideouts) {
      if (h.cooldown > 0) { h.cooldown -= dt; continue; }
      const d = Math.hypot(h.x - px, h.z - pz);
      if (d <= HIDEOUT_R && S.wanted > 0) {
        h.holdT += dt;
        if (h.holdT >= HIDEOUT_HOLD) {
          h.holdT = 0;
          h.cooldown = HIDEOUT_REST;
          S.heat = Math.max(0, S.heat - 30);
          this.shedTotal += 30;
          if (S.stats) S.stats.heatShed = (S.stats.heatShed || 0) + 30;
          if (S.respectDirector) S.respectDirector.hideoutUsed();
          if (S.hud && typeof S.hud.toast === 'function') {
            S.hud.toast('Hideout: ' + h.name + ' — heat down a star.');
          }
          if (S.audio && typeof S.audio.pickup === 'function') S.audio.pickup();
        }
      } else {
        h.holdT = 0;
      }
    }

    // --- pay-n-spray: drive into the booth, $150, two stars gone ---
    const booth = this.sprayBooth;
    const bd = Math.hypot(booth.x - px, booth.z - pz);
    this._sprayToastT -= dt;
    if (bd <= booth.r && !S.player.onFoot && S.car && S.wanted > 0) {
      if (booth.armed && S.cash >= SPRAY_COST) {
        booth.armed = false;
        S.cash -= SPRAY_COST;
        S.heat = Math.max(0, S.heat - SPRAY_SHED);
        this.shedTotal += SPRAY_SHED;
        if (S.stats) S.stats.heatShed = (S.stats.heatShed || 0) + SPRAY_SHED;
        if (S.fx && typeof S.fx.burst === 'function') {
          S.fx.burst({ x: px, y: 1.2, z: pz }, 0x7fd4ff, 26, 7, 0.9);
        }
        if (S.hud && typeof S.hud.toast === 'function') {
          S.hud.toast('Pay-n-spray: fresh paint, -$' + SPRAY_COST + ', heat down two stars.');
        }
        if (S.audio && typeof S.audio.spray === 'function') S.audio.spray();
      } else if (booth.armed && this._sprayToastT <= 0) {
        this._sprayToastT = 6;
        if (S.hud && typeof S.hud.toast === 'function') {
          S.hud.toast('Pay-n-spray needs $' + SPRAY_COST + ' — you have $' + Math.floor(S.cash) + '.');
        }
      }
    } else if (bd > booth.r + 6) {
      booth.armed = true; // leaving the booth re-arms it
    }

    this._prevHeat = S.heat;
  }
}
