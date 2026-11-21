// Story jobs and the two street side-hustles: checkpoint races (T) and
// taxi fares (Y). Jobs start and complete through S.missions; the
// briefing dialogues for m1 and m5 are shown by the boot hub fallback.
// A race is 4 gates in order, worth $300. A taxi fare pays $80 or more
// for driving a passenger to a fixed landmark — never a package spot.
import { CONFIG } from './config.js';

export function init(ctx) {
  const { THREE, state: S, input, api } = ctx;
  const gateMarkers = [];
  let taxiMarker = null;

  function near(x, z, px, pz, r) {
    const dx = x - px;
    const dz = z - pz;
    return dx * dx + dz * dz < r * r;
  }

  function clearGateMarkers() {
    for (const m of gateMarkers) ctx.scene.remove(m);
    gateMarkers.length = 0;
  }

  function showGateMarkers() {
    clearGateMarkers();
    for (const g of CONFIG.raceGates) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(4, 0.35, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0xffb347 }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(g.x, 1.2, g.z);
      ctx.scene.add(ring);
      gateMarkers.push(ring);
    }
  }

  function startRace() {
    S.sideActivities.race = {
      active: true,
      gates: CONFIG.raceGates.map((g) => ({ x: g.x, z: g.z })),
      next: 0,
    };
    showGateMarkers();
    api.toast('Street race started — hit all 4 gates in order!');
  }

  function winRace() {
    S.sideActivities.race.active = false;
    S.sideActivities.race.next = 0;
    clearGateMarkers();
    S.cash += CONFIG.racePad.prize;
    S.stats.racesWon += 1;
    api.toast(`Race won! +$${CONFIG.racePad.prize}`);
    S.banterDirector.raceWin();
  }

  function startTaxi() {
    const dests = CONFIG.taxiDests;
    const dest = dests[Math.floor(Math.random() * dests.length)];
    const dx = dest.x - S.car.pos.x;
    const dz = dest.z - S.car.pos.z;
    const fare = 80 + Math.round(Math.hypot(dx, dz) / 5);
    S.sideActivities.taxi = { active: true, dest: { x: dest.x, z: dest.z, name: dest.name }, fare };
    if (taxiMarker) ctx.scene.remove(taxiMarker);
    taxiMarker = new THREE.Mesh(
      new THREE.CylinderGeometry(3, 3, 0.4, 20),
      new THREE.MeshBasicMaterial({ color: 0xf2d492, transparent: true, opacity: 0.7 }),
    );
    taxiMarker.position.set(dest.x, 0.3, dest.z);
    ctx.scene.add(taxiMarker);
    api.toast(`Taxi fare: take your passenger to ${dest.name} — $${fare}`);
  }

  function finishTaxi() {
    const taxi = S.sideActivities.taxi;
    S.cash += taxi.fare;
    S.stats.faresDone += 1;
    S.sideActivities.taxi = { active: false, dest: null, fare: 0 };
    if (taxiMarker) {
      ctx.scene.remove(taxiMarker);
      taxiMarker = null;
    }
    api.toast(`Fare delivered! +$${taxi.fare}`);
  }

  ctx.updates.push(() => {
    if (S.mode !== 'playing') return;

    // Mission completion: reach the job's target point.
    const job = S.missions.current;
    if (job && job.target) {
      const px = S.car ? S.car.pos.x : S.player.pos.x;
      const pz = S.car ? S.car.pos.z : S.player.pos.z;
      if (near(job.target.x, job.target.z, px, pz, 9)) {
        S.missions.complete();
      }
    }

    // Street race: T at the start pad, gates in order.
    if (input.wasPressed('KeyT') && S.car && !S.sideActivities.race.active) {
      if (near(CONFIG.racePad.x, CONFIG.racePad.z, S.car.pos.x, S.car.pos.z, CONFIG.racePad.radius)) {
        startRace();
      }
    }
    const race = S.sideActivities.race;
    if (race.active && S.car) {
      const gate = race.gates[race.next];
      if (gate && near(gate.x, gate.z, S.car.pos.x, S.car.pos.z, 8)) {
        race.next += 1;
        api.toast(`Gate ${race.next}/4!`);
        if (race.next >= race.gates.length) winRace();
      }
    }

    // Taxi: Y at the stand, deliver to the destination.
    if (input.wasPressed('KeyY') && S.car && !S.sideActivities.taxi.active) {
      if (near(CONFIG.taxiStand.x, CONFIG.taxiStand.z, S.car.pos.x, S.car.pos.z, CONFIG.taxiStand.radius)) {
        startTaxi();
      }
    }
    const taxi = S.sideActivities.taxi;
    if (taxi.active && S.car && taxi.dest) {
      if (near(taxi.dest.x, taxi.dest.z, S.car.pos.x, S.car.pos.z, 9)) {
        finishTaxi();
      }
    }
  });
}
