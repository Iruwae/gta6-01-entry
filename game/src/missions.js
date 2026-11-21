// SOLMAR BAY — the 10 story jobs (start/complete through S.missions;
// briefing dialogues for m1/m5 come from the boot hub fallback) plus the
// two street side-hustles: checkpoint races (T) and taxi fares (Y).
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';
import { randInt, pick, trailSince, trailSeq } from './random.js';

export function init(ctx) {
  const { scene, state: S, input, api } = ctx;

  // Race gate beacons: tall glowing posts at the four gates.
  const gateMat = new THREE.MeshStandardMaterial({
    color: 0x111111, emissive: new THREE.Color(0xffd27a), emissiveIntensity: 1.4,
  });
  const gateMeshes = [];
  for (const g of CONFIG.raceGates) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 7, 8), gateMat);
    post.position.set(g.x, 3.5, g.z);
    scene.add(post);
    gateMeshes.push(post);
  }

  function near(x, z, tx, tz, r) {
    return Math.hypot(x - tx, z - tz) <= r;
  }

  // Position trails: a gate (or a taxi destination) counts when the car
  // is observed at it OR when its trail log shows it passed there since
  // the last frame — so a teleport between two slow headless frames still
  // counts. Cursors reset when a race/fare starts so an old run's trail
  // can never advance a new one.
  let raceTrailSeq = 0;
  let taxiTrailSeq = 0;

  ctx.updates.push(() => {
    const race = S.sideActivities.race;
    const taxi = S.sideActivities.taxi;

    // --- street race (T at the start pad, in a car)
    if (input.wasPressed('KeyT') && !race.active && S.car) {
      if (near(S.car.pos.x, S.car.pos.z, CONFIG.racePad.x, CONFIG.racePad.z, CONFIG.racePad.radius)) {
        race.active = true;
        race.gates = CONFIG.raceGates.map((g) => ({ ...g }));
        race.next = 0;
        raceTrailSeq = trailSeq(S.car.pos);
        api.toast('Street race started — hit all 4 gates in order!');
      }
    }
    if (race.active && S.car) {
      const { points, lastSeq } = trailSince(S.car.pos, raceTrailSeq);
      raceTrailSeq = lastSeq;
      // The trail holds where the car has been since the last frame; the
      // current position is always checked too (its trail point may still
      // be waiting for its microtask flush).
      const spots = [...points, { x: S.car.pos.x, z: S.car.pos.z }];
      for (const spot of spots) {
        while (race.next < race.gates.length) {
          const gate = race.gates[race.next];
          if (!near(spot.x, spot.z, gate.x, gate.z, 10)) break;
          race.next += 1;
          if (race.next >= race.gates.length) {
            race.active = false;
            race.next = 0;
            S.cash += CONFIG.racePad.prize;
            S.stats.racesWon += 1;
            api.toast(`Race won! +$${CONFIG.racePad.prize}`);
            if (S.banterDirector) S.banterDirector.raceWin();
          } else {
            api.toast(`Gate ${race.next}/${race.gates.length} — keep going!`);
          }
        }
        if (!race.active) break;
      }
    }

    // --- taxi fare (Y at the stand, in a car)
    if (input.wasPressed('KeyY') && !taxi.active && S.car) {
      if (near(S.car.pos.x, S.car.pos.z, CONFIG.taxiStand.x, CONFIG.taxiStand.z, CONFIG.taxiStand.radius)) {
        const dest = pick(CONFIG.taxiDestinations);
        taxi.active = true;
        taxi.dest = { x: dest.x, z: dest.z, name: dest.name };
        taxi.fare = 80 + randInt(0, 4) * 20;
        taxiTrailSeq = trailSeq(S.car.pos);
        api.toast(`Taxi fare: take the passenger to ${dest.name} ($${taxi.fare}).`);
      }
    }
    if (taxi.active && S.car && taxi.dest) {
      const { points, lastSeq } = trailSince(S.car.pos, taxiTrailSeq);
      taxiTrailSeq = lastSeq;
      const spots = [...points, { x: S.car.pos.x, z: S.car.pos.z }];
      for (const spot of spots) {
        if (near(spot.x, spot.z, taxi.dest.x, taxi.dest.z, 8)) {
          const fare = taxi.fare;
          taxi.active = false;
          taxi.dest = null;
          taxi.fare = 0;
          S.cash += fare;
          S.stats.faresDone += 1;
          api.toast(`Fare delivered! +$${fare}`);
          break;
        }
      }
    }
  });
}
