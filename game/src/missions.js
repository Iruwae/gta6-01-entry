// SOLMAR BAY — story jobs plus the two street side-hustles: checkpoint
// races (T at the start pad) and taxi fares (Y at the stand).
import { CONFIG } from './config.js';

// Where each story job completes when the player (or their car) arrives.
const JOB_SPOTS = [
  { x: 0, z: 135 }, { x: 110, z: 138 }, { x: 0, z: 135 }, { x: 0, z: 165 },
  { x: 120, z: 120 }, { x: 120, z: 120 }, { x: 120, z: -90 }, { x: 0, z: 0 },
  { x: 0, z: 165 }, { x: 0, z: 135 },
];

export function init(ctx) {
  const { state: S, input } = ctx;
  let currentId = null;
  let currentSince = 0;

  function refPos() {
    return S.car ? S.car.pos : S.player.pos;
  }
  function near(x, z, r) {
    const p = refPos();
    return Math.hypot(p.x - x, p.z - z) <= r;
  }

  ctx.updates.push((dt) => {
    if (S.mode !== 'playing') return;
    // Story job completion: reach the job spot (after a short grace).
    const job = S.missions.current;
    if (job) {
      if (currentId !== job.id) { currentId = job.id; currentSince = performance.now(); }
      const spot = JOB_SPOTS[job.index];
      if (spot && performance.now() - currentSince > 3000 && near(spot.x, spot.z, 10)) {
        const pay = job.pay;
        const title = job.title;
        S.missions.complete();
        currentId = null;
        ctx.api.toast(`Job done: ${title} — +$${pay}`);
        if (S.banterDirector) S.banterDirector.pickup();
      }
    } else {
      currentId = null;
    }

    // Street race: T at the start pad.
    const race = S.sideActivities.race;
    if (!race.active && S.car && input.wasPressed('KeyT') && near(CONFIG.racePad.x, CONFIG.racePad.z, CONFIG.racePad.radius)) {
      race.active = true;
      race.gates = CONFIG.raceGates.map((g) => ({ ...g }));
      race.next = 0;
      ctx.api.toast('Street race started — hit all 4 gates in order!');
    } else if (race.active && S.car) {
      const gate = race.gates[race.next];
      if (gate && Math.hypot(S.car.pos.x - gate.x, S.car.pos.z - gate.z) <= 10) {
        race.next += 1;
        ctx.api.toast(`Gate ${race.next}/4!`);
        if (race.next >= race.gates.length) {
          race.active = false;
          race.next = 0;
          S.stats.racesWon += 1;
          S.cash += CONFIG.racePad.prize;
          ctx.api.toast(`Race won! +$${CONFIG.racePad.prize}`);
          if (S.banterDirector) S.banterDirector.raceWin();
        }
      }
    }

    // Taxi: Y at the stand.
    const taxi = S.sideActivities.taxi;
    if (!taxi.active && S.car && input.wasPressed('KeyY') && near(CONFIG.taxiStand.x, CONFIG.taxiStand.z, CONFIG.taxiStand.radius)) {
      const dest = CONFIG.taxiDests[S.stats.faresDone % CONFIG.taxiDests.length];
      taxi.active = true;
      taxi.dest = { x: dest.x, z: dest.z, name: dest.name };
      taxi.fare = 120;
      ctx.api.toast(`Taxi fare: take them to ${dest.name}. Fare $${taxi.fare}.`);
    } else if (taxi.active && S.car && taxi.dest) {
      if (Math.hypot(S.car.pos.x - taxi.dest.x, S.car.pos.z - taxi.dest.z) <= 10) {
        const fare = taxi.fare;
        taxi.active = false;
        taxi.dest = null;
        S.stats.faresDone += 1;
        S.cash += fare;
        ctx.api.toast(`Fare delivered! +$${fare}`);
      }
    }
  });
  ctx.missionsReady = true;
}
