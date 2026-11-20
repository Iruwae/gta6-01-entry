// side.js — the things to do between story jobs.
//
// Three activities, all driven off the config anchors:
//   - street races: T on the start pad, then four checkpoint gates in
//     order. Finish them all and the prize lands in your pocket.
//   - taxi fares: Y at the stand, then drive the passenger to the
//     beacon. The fare grows with the trip.
//   - packages: twelve glowing parcels hidden around the bay. Walk
//     or drive over one to pocket it.
//
// Gates, beacons and parcels are real meshes in the scene, so the
// screenshot staging can frame them — a race gate is a tall orange
// ring you can see from down the road.

import * as THREE from '../vendor/three.module.min.js';

const PAD_RADIUS = 8;
const GATE_RADIUS = 9;
const STAND_RADIUS = 8;
const DROP_RADIUS = 8;
const PARCEL_RADIUS = 4;

function dist2(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

function say(text) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = text;
  toast.classList.remove('hidden');
}

export function init(S) {
  const cfg = S.config || {};
  const raceCfg = cfg.race || {};
  const taxiCfg = cfg.taxi || {};
  const parcelSpots = cfg.packages || [];
  const pad = raceCfg.start || { x: -60, z: -60 };
  const gates = raceCfg.gates || [];
  const prize = raceCfg.prize || 300;
  const stand = (taxiCfg.stand || { x: 68, z: 60 });
  const destinations = taxiCfg.destinations || [];
  const minFare = taxiCfg.minFare || 80;

  // --- live state, hung off S.sideActivities ---------------------------
  const race = {
    active: false,
    gate: 0,
    gates: gates.map((g) => ({ x: g.x, z: g.z })),
    prize,
    start: { x: pad.x, z: pad.z },
  };
  const taxi = {
    active: false,
    dest: null,
    fare: 0,
    passenger: '',
  };
  const packages = {
    spots: parcelSpots.map((p) => ({ x: p.x, z: p.z, taken: false, mesh: null })),
    reward: cfg.packageReward || 50,
  };
  S.sideActivities = { race, taxi, packages };
  if (!S.stats) S.stats = { racesWon: 0, faresDone: 0, packages: 0, fencesSold: 0 };

  // --- scene dressing ----------------------------------------------------
  // Gate rings: tall, orange, upright. Only the next gate glows bright;
  // the rest wait dimmed. All of them hide when no race is running.
  const gateMeshes = [];
  function buildGates() {
    if (!S.scene) return;
    const ringGeo = new THREE.TorusGeometry(4, 0.35, 10, 28);
    gates.forEach((g, i) => {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xff7a3c, emissive: 0x993300, roughness: 0.5,
      });
      const ring = new THREE.Mesh(ringGeo, mat);
      ring.position.set(g.x, 3.2, g.z);
      ring.visible = false;
      S.scene.add(ring);
      gateMeshes.push(ring);
    });
    // The start pad: a flat amber disc so the pad reads on the road.
    const padGeo = new THREE.CylinderGeometry(5, 5, 0.15, 24);
    const padMat = new THREE.MeshStandardMaterial({ color: 0xffd24a, emissive: 0x664400 });
    const disc = new THREE.Mesh(padGeo, padMat);
    disc.position.set(pad.x, 0.1, pad.z);
    S.scene.add(disc);
  }

  // One beacon per taxi drop: a slim cyan pillar at the destination.
  let beacon = null;
  function showBeacon(dest) {
    hideBeacon();
    if (!S.scene || !dest) return;
    const geo = new THREE.CylinderGeometry(0.6, 0.6, 14, 10);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee, emissive: 0x0e7490, transparent: true, opacity: 0.75,
    });
    beacon = new THREE.Mesh(geo, mat);
    beacon.position.set(dest.x, 7, dest.z);
    S.scene.add(beacon);
  }
  function hideBeacon() {
    if (beacon && S.scene) S.scene.remove(beacon);
    beacon = null;
  }

  // Parcels: small gold boxes, one per spot, spinning slowly in tick.
  function buildParcels() {
    if (!S.scene) return;
    const geo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    for (const spot of packages.spots) {
      const mat = new THREE.MeshStandardMaterial({ color: 0xffd24a, emissive: 0x665500, roughness: 0.4 });
      const box = new THREE.Mesh(geo, mat);
      box.position.set(spot.x, 1, spot.z);
      S.scene.add(box);
      spot.mesh = box;
    }
  }

  buildGates();
  buildParcels();

  // --- races ---------------------------------------------------------------
  let gateFlash = 0;
  function startRace() {
    race.active = true;
    race.gate = 0;
    gateMeshes.forEach((m, i) => {
      m.visible = true;
      m.material.emissive.setHex(i === 0 ? 0xff5500 : 0x331100);
    });
    say('RACE: hit all ' + gates.length + ' gates — $' + prize + ' to the winner');
  }

  function raceTick(anchor) {
    if (!race.active) return;
    if (race.gate >= gates.length) return;
    const g = gates[race.gate];
    if (!g) return;
    if (dist2(anchor.x, anchor.z, g.x, g.z) <= GATE_RADIUS * GATE_RADIUS) {
      race.gate += 1;
      gateFlash = 1;
      gateMeshes.forEach((m, i) => {
        m.material.emissive.setHex(i === race.gate ? 0xff5500 : 0x331100);
      });
      if (race.gate >= gates.length) {
        race.active = false;
        gateMeshes.forEach((m) => { m.visible = false; });
        S.cash = (S.cash || 0) + prize;
        S.stats.racesWon = (S.stats.racesWon || 0) + 1;
        say('RACE WON: +$' + prize);
        if (S.respectDirector && typeof S.respectDirector.add === 'function') {
          S.respectDirector.add(15, 'race win');
        }
      } else {
        say('GATE ' + race.gate + '/' + gates.length + ' — next gate lit');
      }
    }
  }

  // --- taxi ------------------------------------------------------------------
  let destCursor = 0;
  function startFare() {
    if (destinations.length === 0) return;
    const dest = destinations[destCursor % destinations.length];
    destCursor += 1;
    const dx = dest.x - stand.x;
    const dz = dest.z - stand.z;
    const trip = Math.sqrt(dx * dx + dz * dz);
    taxi.active = true;
    taxi.dest = { x: dest.x, z: dest.z };
    taxi.fare = minFare + Math.round(trip / 25) * 10;
    taxi.passenger = 'FARE';
    showBeacon(taxi.dest);
    say('TAXI: passenger wants (' + dest.x + ', ' + dest.z + ') — fare $' + taxi.fare);
  }

  function taxiTick(anchor) {
    if (!taxi.active || !taxi.dest) return;
    if (dist2(anchor.x, anchor.z, taxi.dest.x, taxi.dest.z) <= DROP_RADIUS * DROP_RADIUS) {
      const fare = taxi.fare;
      taxi.active = false;
      taxi.dest = null;
      taxi.fare = 0;
      hideBeacon();
      S.cash = (S.cash || 0) + fare;
      S.stats.faresDone = (S.stats.faresDone || 0) + 1;
      say('FARE DONE: +$' + fare);
    }
  }

  // --- packages ----------------------------------------------------------------
  function parcelsTick(anchor, dt) {
    for (const spot of packages.spots) {
      if (spot.taken) continue;
      if (spot.mesh) spot.mesh.rotation.y += dt * 1.5;
      if (dist2(anchor.x, anchor.z, spot.x, spot.z) <= PARCEL_RADIUS * PARCEL_RADIUS) {
        spot.taken = true;
        if (spot.mesh && S.scene) S.scene.remove(spot.mesh);
        S.stats.packages = (S.stats.packages || 0) + 1;
        S.cash = (S.cash || 0) + packages.reward;
        say('PACKAGE FOUND: +$' + packages.reward + ' (' + S.stats.packages + '/12)');
      }
    }
  }

  // --- keys + frame ---------------------------------------------------------------
  let prevKeys = {};

  function tick(dt) {
    const keys = S.keys || {};
    const pressedT = !!keys.KeyT && !prevKeys.KeyT;
    const pressedY = !!keys.KeyY && !prevKeys.KeyY;
    prevKeys = { ...keys };
    if (S.mode !== 'playing' || S.cutscene) return;
    const anchor = S.car ? S.car.pos : (S.player && S.player.pos);
    if (!anchor) return;

    if (pressedT) {
      if (race.active) {
        say('Race already running — gate ' + (race.gate + 1) + '/' + gates.length);
      } else if (!S.car) {
        say('Races are driven — get in a car and come back to the start pad.');
      } else if (dist2(anchor.x, anchor.z, pad.x, pad.z) <= PAD_RADIUS * PAD_RADIUS) {
        startRace();
      } else {
        say('The street race starts at the pad downtown — look for the amber disc.');
      }
    }

    if (pressedY) {
      if (taxi.active) {
        say('Fare already running — follow the beacon.');
      } else if (!S.car) {
        say('Fares need a car — pick one up first.');
      } else if (dist2(anchor.x, anchor.z, stand.x, stand.z) <= STAND_RADIUS * STAND_RADIUS) {
        startFare();
      } else {
        say('The taxi stand is by the harbor road — look for the fares.');
      }
    }

    if (gateFlash > 0) gateFlash = Math.max(0, gateFlash - dt);
    raceTick(anchor);
    taxiTick(anchor);
    parcelsTick(anchor, dt);
  }

  S._tick.push(tick);
  S.side = { race, taxi, packages, startRace, startFare };
  return S.side;
}

export default init;
