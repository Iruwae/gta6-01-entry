// SOLMAR BAY — side.js
// Side activities: the city pays outside the story jobs, too.
//  - Street race (T): a four-gate loop around the ring road (x/z = +/-60),
//    against the clock, $300 for a clean lap. Needs a car; leaving the car
//    cancels the run.
//  - Taxi (Y): pick up a fare at the stand by the bank, drive them to a
//    landmark inside 90 s. Fare scales with distance. One passenger at a
//    time, 20 s cooldown between jobs.
//  - Collectibles: 12 glowing green packages scattered on roads and the
//    beach margin, $50 each, counted in the run stats.
// All three are real systems wired to cash / stats / the HUD objective
// line — the HUD shows the race or taxi objective while one is active.

import * as THREE from 'three';
import { S } from './state.js';
import { Ped } from './people.js';

const RACE_START = { x: -60, z: -60, r: 12 };
const RACE_GATES = [
  { x: 60, z: -60 },
  { x: 60, z: 60 },
  { x: -60, z: 60 },
  { x: -60, z: -60 },
];
const RACE_PRIZE = 300;
const GATE_RADIUS = 8;

const TAXI_STAND = { x: 68, z: 60, r: 12 };
const TAXI_SPOTS = [
  { x: 30, z: 30, name: 'the Bank' },
  { x: 90, z: 138, name: 'the Harbor' },
  { x: -90, z: -66, name: 'the Garage' },
  { x: 0, z: 165, name: 'the Beach' },
  { x: -120, z: -120, name: 'Old Town' },
];
const TAXI_TIME = 90;
const TAXI_BASE = 80;
const TAXI_COOLDOWN = 20;

const PACKAGE_SPOTS = [
  [-120, -120], [120, -120], [-120, 120], [120, 120],
  [0, -120], [0, 120], [-120, 0], [120, 0],
  [-60, 120], [60, -120], [-132, 60], [132, -60],
];
const PACKAGE_CASH = 50;

export class SideActivities {
  constructor(scene) {
    this.scene = scene;
    this.race = { active: false, gate: 0, t: 0 };
    this.bestLap = null;
    this.taxi = { active: false, dest: null, fare: 0, timer: 0, passenger: null };
    this.taxiCooldown = 0;
    this.packages = [];
    this._buildGateMarkers();
    this._buildPackages();

    window.addEventListener('keydown', (e) => {
      if (!S || S.mode !== 'playing') return;
      if (e.code === 'KeyT') this.tryStartRace();
      if (e.code === 'KeyY') this.tryStartTaxi();
    });
  }

  // ---- street race -------------------------------------------------------

  _buildGateMarkers() {
    this._gateMeshes = [];
    const geo = new THREE.OctahedronGeometry(1.6);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd60a });
    for (const g of RACE_GATES) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(g.x, 7, g.z);
      m.visible = false;
      this.scene.add(m);
      this._gateMeshes.push(m);
    }
  }

  tryStartRace() {
    if (this.race.active || !S.player) return;
    const d = Math.hypot(S.player.pos.x - RACE_START.x, S.player.pos.z - RACE_START.z);
    if (d > RACE_START.r) return;
    if (!S.car) {
      if (S.hud) S.hud.toast('Street race needs a car — steal one first.');
      return;
    }
    this.race.active = true;
    this.race.gate = 0;
    this.race.t = 0;
    this._gateMeshes[0].visible = true;
    if (S.hud) S.hud.toast('STREET RACE — hit all 4 gates! $' + RACE_PRIZE + ' for the win.');
    if (S.audio && S.audio.jingle) S.audio.jingle();
    if (S.banterDirector) S.banterDirector.raceStart();
  }

  _updateRace(dt) {
    if (!this.race.active) return;
    if (!S.car) {
      this.race.active = false;
      this._hideGates();
      if (S.hud) S.hud.toast('Race cancelled — you left the car.');
      return;
    }
    this.race.t += dt;
    const g = RACE_GATES[this.race.gate];
    const d = Math.hypot(S.car.pos.x - g.x, S.car.pos.z - g.z);
    const marker = this._gateMeshes[this.race.gate];
    if (marker) {
      marker.rotation.y += dt * 2;
      marker.position.y = 7 + Math.sin((S.time || 0) * 3) * 0.8;
    }
    if (d < GATE_RADIUS) {
      this.race.gate++;
      if (this.race.gate >= RACE_GATES.length) {
        this.race.active = false;
        this._hideGates();
        const t = this.race.t;
        if (this.bestLap === null || t < this.bestLap) this.bestLap = t;
        if (S) {
          S.cash += RACE_PRIZE;
          if (S.stats) S.stats.racesWon = (S.stats.racesWon || 0) + 1;
        }
        if (S.hud) S.hud.toast('Race won in ' + t.toFixed(1) + 's! +$' + RACE_PRIZE);
        if (S.audio && S.audio.jingle) S.audio.jingle();
        if (S.respectDirector) S.respectDirector.raceWon();
        if (S.banterDirector) S.banterDirector.raceWin();
      } else {
        this._gateMeshes[this.race.gate].visible = true;
        if (S.hud) S.hud.toast('Gate ' + this.race.gate + '/4 — keep it flat!');
        if (S.audio && S.audio.blip) S.audio.blip();
      }
    }
  }

  _hideGates() {
    for (const m of this._gateMeshes) m.visible = false;
  }

  // ---- taxi --------------------------------------------------------------

  tryStartTaxi() {
    if (this.taxi.active || this.taxiCooldown > 0 || !S.player) return;
    const d = Math.hypot(S.player.pos.x - TAXI_STAND.x, S.player.pos.z - TAXI_STAND.z);
    if (d > TAXI_STAND.r) return;
    if (!S.car) {
      if (S.hud) S.hud.toast('Taxi work needs a car — steal one first.');
      return;
    }
    const dest = TAXI_SPOTS[Math.floor(Math.random() * TAXI_SPOTS.length)];
    const dist = Math.hypot(dest.x - TAXI_STAND.x, dest.z - TAXI_STAND.z);
    const fare = TAXI_BASE + Math.round(dist / 10) * 10;
    const pax = new Ped(this.scene, S.world, { x: TAXI_STAND.x + 2, z: TAXI_STAND.z, hostile: false });
    pax.mesh.visible = false; // riding in the back seat
    if (S.peds) S.peds.push(pax);
    this.taxi = { active: true, dest, fare, timer: TAXI_TIME, passenger: pax };
    if (S.hud) S.hud.toast('Fare picked up — take them to ' + dest.name + ' ($' + fare + ', ' + TAXI_TIME + 's).');
    if (S.banterDirector) S.banterDirector.taxiStart();
  }

  _updateTaxi(dt) {
    if (!this.taxi.active) {
      this.taxiCooldown = Math.max(0, this.taxiCooldown - dt);
      return;
    }
    this.taxi.timer -= dt;
    const pax = this.taxi.passenger;
    if (pax && S.car) {
      // The passenger rides with the car.
      pax.pos.copy(S.car.pos);
      pax.mesh.position.copy(S.car.pos);
    }
    if (!S.car) {
      this._endTaxi(false, 'Fare walked off — you left the cab.');
      return;
    }
    if (this.taxi.timer <= 0) {
      this._endTaxi(false, 'Too slow — the fare cancelled.');
      return;
    }
    const d = Math.hypot(S.car.pos.x - this.taxi.dest.x, S.car.pos.z - this.taxi.dest.z);
    if (d < 10) {
      const fare = this.taxi.fare;
      if (S) {
        S.cash += fare;
        if (S.stats) S.stats.faresDone = (S.stats.faresDone || 0) + 1;
      }
      this._endTaxi(true, 'Fare delivered — +$' + fare);
      if (S.audio && S.audio.pickup) S.audio.pickup();
      if (S.respectDirector) S.respectDirector.fareDone();
      if (S.banterDirector) S.banterDirector.taxiDone();
    }
  }

  _endTaxi(paid, msg) {
    const pax = this.taxi.passenger;
    if (pax) {
      // The passenger steps out and wanders off as an ordinary civilian.
      pax.mesh.visible = true;
      pax.pos.set(S.player ? S.player.pos.x + 3 : 0, 0, S.player ? S.player.pos.z + 3 : 0);
      pax.mesh.position.copy(pax.pos);
    }
    this.taxi = { active: false, dest: null, fare: 0, timer: 0, passenger: null };
    this.taxiCooldown = TAXI_COOLDOWN;
    if (S.hud && msg) S.hud.toast(msg);
  }

  // ---- collectibles ------------------------------------------------------

  _buildPackages() {
    this.packages = [];
    const geo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x2ed573, emissive: 0x2ed573, emissiveIntensity: 1.0, roughness: 0.5,
    });
    for (const [x, z] of PACKAGE_SPOTS) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, 1.0, z);
      this.scene.add(mesh);
      this.packages.push({ mesh, x, z, taken: false });
    }
  }

  _updatePackages(dt) {
    if (!S.player) return;
    let found = 0;
    for (const p of this.packages) found += p.taken ? 1 : 0;
    for (const p of this.packages) {
      if (p.taken) continue;
      p.mesh.rotation.y += dt * 1.5;
      p.mesh.position.y = 1.0 + Math.sin((S.time || 0) * 2 + p.x) * 0.25;
      const d = Math.hypot(S.player.pos.x - p.x, S.player.pos.z - p.z);
      if (d < 3) {
        p.taken = true;
        this.scene.remove(p.mesh);
        found++;
        if (S) {
          S.cash += PACKAGE_CASH;
          if (S.stats) S.stats.packages = (S.stats.packages || 0) + 1;
        }
        if (S.hud) S.hud.toast('Package found +$' + PACKAGE_CASH + ' (' + found + '/12)');
        if (S.audio && S.audio.pickup) S.audio.pickup();
        if (S.respectDirector) S.respectDirector.packageFound();
        if (S.banterDirector) S.banterDirector.packageFound();
      }
    }
  }

  // ---- frame -------------------------------------------------------------

  update(dt) {
    if (!S || S.mode !== 'playing' || dt <= 0) return;
    this._updateRace(dt);
    this._updateTaxi(dt);
    this._updatePackages(dt);
  }

  // The HUD objective line while a side job is live; null otherwise.
  objectiveLine() {
    if (this.race.active) {
      return 'STREET RACE — gate ' + (this.race.gate + 1) + '/4 · ' + this.race.t.toFixed(1) + 's · win $' + RACE_PRIZE;
    }
    if (this.taxi.active) {
      return 'TAXI — take the fare to ' + this.taxi.dest.name + ' · ' + Math.ceil(this.taxi.timer) + 's · $' + this.taxi.fare;
    }
    return null;
  }

  reset() {
    this.race.active = false;
    this._hideGates();
    if (this.taxi.passenger) {
      const i = (S.peds || []).indexOf(this.taxi.passenger);
      if (i >= 0) S.peds.splice(i, 1);
      if (this.taxi.passenger.mesh) this.scene.remove(this.taxi.passenger.mesh);
    }
    this.taxi = { active: false, dest: null, fare: 0, timer: 0, passenger: null };
    this.taxiCooldown = 0;
    for (const p of this.packages) this.scene.remove(p.mesh);
    this._buildPackages();
  }
}
