// side.js — SOLMAR BAY, round 8 rebuild.
// The three side activities: street races, taxi fares, and the twelve
// collectible packages hidden around the city.
//
// RACE — press T at the start pad (-60, -60). Four gates in order:
// (60,-60), (60,60), (-60,60), (-60,-60). Clear all four and the win
// pays $300 and counts one race won.
// TAXI — press Y at the stand (68, 60). A fare is offered with a
// destination and a price of at least $80; drive the car there to
// collect and count one fare done.
// PACKAGES — twelve gold boxes around the map. Walking onto one pays
// $50 and counts one package. Collection reads the player's own feet,
// never the car, so a fare route can never eat a package by accident.

import * as THREE from '../vendor/three.module.min.js';

const RACE_PAD = { x: -60, z: -60, r: 12 };
const RACE_GATES = [
  { x: 60, z: -60 },
  { x: 60, z: 60 },
  { x: -60, z: 60 },
  { x: -60, z: -60 },
];
const GATE_R = 12;
const RACE_PRIZE = 300;

const TAXI_STAND = { x: 68, z: 60, r: 10 };
const TAXI_DESTS = [
  { x: -120, z: -120 },
  { x: 120, z: 140 },
  { x: 140, z: -60 },
  { x: -60, z: 140 },
  { x: 0, z: -140 },
  { x: -140, z: 40 },
  { x: 100, z: -140 },
  { x: -140, z: -60 },
];
const DROP_R = 12;

const PACKAGE_SPOTS = [
  { x: -120, z: 120 },
  { x: -140, z: 140 },
  { x: 140, z: 140 },
  { x: -140, z: -140 },
  { x: 140, z: -140 },
  { x: 0, z: -150 },
  { x: -150, z: 60 },
  { x: 150, z: -60 },
  { x: -40, z: 150 },
  { x: 40, z: -150 },
  { x: 150, z: 120 },
  { x: -120, z: -40 },
];
const PACKAGE_R = 5;
const PACKAGE_PAY = 50;

function keyDown(ctx, code) {
  const inp = ctx.input;
  if (!inp) return false;
  if (typeof inp.isDown === 'function') {
    try { return !!inp.isDown(code); } catch (e) { /* fall through */ }
  }
  const k = inp.keys;
  if (k) {
    if (typeof k.has === 'function') return k.has(code);
    if (Array.isArray(k)) return k.includes(code);
    if (typeof k === 'object') return !!k[code];
  }
  if (typeof inp[code] !== 'undefined') return !!inp[code];
  return false;
}

function dist2d(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function init(ctx) {
  const S = ctx.state;
  const prev = {};

  if (!S.sideActivities) S.sideActivities = {};
  if (!S.sideActivities.taxi) S.sideActivities.taxi = { active: false };
  if (!S.sideActivities.race) S.sideActivities.race = { active: false };
  const taxi = S.sideActivities.taxi;
  const race = S.sideActivities.race;
  if (!Array.isArray(race.gates)) race.gates = RACE_GATES.map((g) => ({ x: g.x, z: g.z }));
  // The state ships the gates as [x, z] pairs; the progress check
  // below reads .x/.z, so normalize every entry to an object here.
  // (A gate left as a pair reads as a NaN distance and never clears.)
  race.gates = race.gates.map((g) => (Array.isArray(g) ? { x: g[0], z: g[1] } : { x: g.x, z: g.z }));
  if (typeof race.gate !== 'number') race.gate = 0;

  const packages = PACKAGE_SPOTS.map((s) => ({ x: s.x, z: s.z, taken: false, mesh: null }));
  S.sideActivities.packages = packages;

  // ---- world markers (pure decoration; the logic below is position-only)
  let gateMeshes = [];
  let taxiMarker = null;
  try {
    const scene = ctx.scene;
    if (scene) {
      for (const g of RACE_GATES) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(6, 0.45, 8, 28),
          new THREE.MeshBasicMaterial({ color: 0xffb347 })
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.set(g.x, 1.2, g.z);
        ring.visible = false;
        scene.add(ring);
        gateMeshes.push(ring);
      }
      const pad = new THREE.Mesh(
        new THREE.CircleGeometry(9, 24),
        new THREE.MeshBasicMaterial({ color: 0x8fb45a, transparent: true, opacity: 0.5 })
      );
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(RACE_PAD.x, 0.15, RACE_PAD.z);
      scene.add(pad);
      taxiMarker = new THREE.Mesh(
        new THREE.CircleGeometry(8, 24),
        new THREE.MeshBasicMaterial({ color: 0x4fb3a9, transparent: true, opacity: 0.5 })
      );
      taxiMarker.rotation.x = -Math.PI / 2;
      taxiMarker.position.set(TAXI_STAND.x, 0.15, TAXI_STAND.z);
      scene.add(taxiMarker);
      for (const p of packages) {
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(1.4, 1.4, 1.4),
          new THREE.MeshBasicMaterial({ color: 0xffd24d })
        );
        box.position.set(p.x, 1.2, p.z);
        scene.add(box);
        p.mesh = box;
      }
    }
  } catch (e) { /* markers are decoration; the activities work without them */ }

  function toast(msg) {
    if (ctx.api.toast) ctx.api.toast(msg);
    else {
      const t = document.getElementById('toast');
      if (t) t.textContent = msg;
    }
  }

  function drivePos() {
    if (S.car && S.car.pos) return S.car.pos;
    return S.player && S.player.pos;
  }

  function startRace() {
    race.active = true;
    race.gate = 0;
    toast('Street race — hit all 4 gates! First: east side, (60, -60).');
    if (ctx.api.audio && typeof ctx.api.audio.pickup === 'function') {
      try { ctx.api.audio.pickup(); } catch (e) { /* audio is best-effort */ }
    }
  }

  function winRace() {
    race.active = false;
    race.gate = 0;
    S.cash = (S.cash || 0) + RACE_PRIZE;
    if (S.stats) S.stats.racesWon = (S.stats.racesWon || 0) + 1;
    toast('Race won! +$' + RACE_PRIZE + '.');
    if (ctx.api.audio && typeof ctx.api.audio.pickup === 'function') {
      try { ctx.api.audio.pickup(); } catch (e) { /* audio is best-effort */ }
    }
    if (S.banterDirector && typeof S.banterDirector.raceWin === 'function') {
      try { S.banterDirector.raceWin(); } catch (e) { /* banter is best-effort */ }
    }
  }

  function startTaxi() {
    const dests = TAXI_DESTS.filter((d) => dist2d(d, TAXI_STAND) > 30);
    const dest = dests[Math.floor(Math.random() * dests.length)] || TAXI_DESTS[0];
    const fare = 80 + Math.round(dist2d(TAXI_STAND, dest) / 4);
    taxi.active = true;
    taxi.dest = { x: dest.x, z: dest.z };
    taxi.fare = fare;
    toast('Taxi fare — drop them at (' + dest.x + ', ' + dest.z + ') for $' + fare + '.');
  }

  function deliverTaxi() {
    const fare = taxi.fare || 80;
    taxi.active = false;
    taxi.dest = null;
    taxi.fare = 0;
    S.cash = (S.cash || 0) + fare;
    if (S.stats) S.stats.faresDone = (S.stats.faresDone || 0) + 1;
    toast('Fare delivered! +$' + fare + '.');
    if (ctx.api.audio && typeof ctx.api.audio.pickup === 'function') {
      try { ctx.api.audio.pickup(); } catch (e) { /* audio is best-effort */ }
    }
  }

  function collectPackage(p) {
    p.taken = true;
    if (p.mesh) p.mesh.visible = false;
    S.cash = (S.cash || 0) + PACKAGE_PAY;
    if (S.stats) S.stats.packages = (S.stats.packages || 0) + 1;
    toast('Package found! +$' + PACKAGE_PAY + '.');
    if (ctx.api.audio && typeof ctx.api.audio.pickup === 'function') {
      try { ctx.api.audio.pickup(); } catch (e) { /* audio is best-effort */ }
    }
  }

  ctx.api.side = {
    startRace,
    startTaxi,
    raceGates: RACE_GATES,
    taxiStand: TAXI_STAND,
    packages,
  };

  ctx.updates.push((dt, t) => {
    if (S.mode !== 'playing') return;

    const downT = keyDown(ctx, 'KeyT');
    const wasT = !!prev.KeyT;
    prev.KeyT = downT;
    if (downT && !wasT && !race.active) {
      const p = drivePos();
      if (p && dist2d(p, RACE_PAD) < RACE_PAD.r) startRace();
    }

    const downY = keyDown(ctx, 'KeyY');
    const wasY = !!prev.KeyY;
    prev.KeyY = downY;
    if (downY && !wasY && !taxi.active) {
      const p = drivePos();
      if (p && dist2d(p, TAXI_STAND) < TAXI_STAND.r) startTaxi();
    }

    // Race progress: gates in order, generous radius for teleports.
    if (race.active) {
      const p = drivePos();
      const gate = race.gates[race.gate] || RACE_GATES[race.gate];
      if (p && gate && dist2d(p, gate) < GATE_R) {
        race.gate += 1;
        if (race.gate >= RACE_GATES.length) winRace();
        else toast('Gate ' + race.gate + ' / 4 — keep going!');
      }
    }

    // Taxi drop-off.
    if (taxi.active && taxi.dest) {
      const p = drivePos();
      if (p && dist2d(p, taxi.dest) < DROP_R) deliverTaxi();
    }

    // Packages: the player's own feet only.
    if (S.player && S.player.pos) {
      for (const p of packages) {
        if (p.taken) continue;
        if (dist2d(S.player.pos, p) < PACKAGE_R) collectPackage(p);
      }
    }

    // Markers follow state.
    const now = typeof t === 'number' ? t : 0;
    gateMeshes.forEach((m, i) => {
      m.visible = !!race.active;
      if (race.active && i === race.gate) {
        const s = 1 + 0.18 * Math.sin(now * 5);
        m.scale.set(s, s, 1);
      } else {
        m.scale.set(1, 1, 1);
      }
    });
    packages.forEach((p, i) => {
      if (!p.mesh || p.taken) return;
      p.mesh.position.y = 1.2 + 0.3 * Math.sin(now * 2 + i);
      p.mesh.rotation.y += dt * 1.5;
    });
  });
}
