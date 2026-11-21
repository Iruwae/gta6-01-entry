// SOLMAR BAY — story jobs, street races (T) and taxi fares (Y).
import { CONFIG } from './config.js';

const MISSION_TARGETS = [
  { x: 0, z: 135 }, // m1 FIRST JOB — the Strip
  { x: 110, z: 138 }, // m2 HOT WHEELS — Vic's yard
  { x: 0, z: 135 }, // m3 DEAD DROP — the Strip
  { x: -120, z: -60 }, // m4 QUIET STREETS — Old Town
  { x: 120, z: 120 }, // m5 CREW UP — the harbor convoy
  { x: 120, z: 120 }, // m6 HARBOR LIGHTS — the night boat
  { x: 0, z: 165 }, // m7 THE LONG WAY — the beach
  { x: 120, z: -90 }, // m8 PAYBACK — Uptown
  { x: -120, z: 120 }, // m9 GOLDEN HOUR — Palm Row
  { x: 0, z: 0 }, // m10 BAY LEGEND — downtown
];

export function init(ctx) {
  const S = ctx.state;
  const input = ctx.input;
  let taxiCycle = 0;

  function playerPos() {
    return S.car ? S.car.pos : S.player.pos;
  }

  function taxiDestinations() {
    // Fixed landmarks, never a package spot.
    return CONFIG.taxiDestinations.filter(
      (d) => !CONFIG.packageSpots.some((p) => p.x === d.x && p.z === d.z),
    );
  }

  function startRace() {
    const race = S.sideActivities.race;
    race.active = true;
    race.gates = CONFIG.raceGates.map((g) => ({ ...g }));
    race.next = 0;
    ctx.api.toast('STREET RACE: hit all 4 gates in order. $300 on the line.');
  }

  function startTaxi() {
    const taxi = S.sideActivities.taxi;
    const dests = taxiDestinations();
    const dest = dests[taxiCycle % dests.length];
    taxiCycle += 1;
    const from = playerPos();
    const dist = Math.hypot(dest.x - from.x, dest.z - from.z);
    taxi.active = true;
    taxi.dest = { x: dest.x, z: dest.z, label: dest.label };
    taxi.fare = Math.max(80, 80 + Math.round(dist * 0.5));
    ctx.api.toast(`TAXI FARE: take them to ${dest.label}. $${taxi.fare} if you make it.`);
  }

  // Position-based checks, sampled on a timer as well as in the frame
  // update: at headless speed rAF can stall for seconds, and a 2.5 s gate
  // window or a taxi delivery must not be missed because no frame ran.
  function logicTick() {
    if (S.mode !== 'playing') return;
    const pos = playerPos();

    // Mission completion: reach the job's target spot.
    const cur = S.missions.current;
    if (cur) {
      const target = MISSION_TARGETS[cur.index];
      if (target && Math.hypot(pos.x - target.x, pos.z - target.z) < 8) {
        S.missions.complete();
      }
    }

    // Race gates, strictly in order. (The start pad IS the final gate's
    // spot, so a tolerant scan would win the race the moment it starts.)
    const race = S.sideActivities.race;
    if (race.active && race.gates.length > 0) {
      const gate = race.gates[race.next];
      if (gate && Math.hypot(pos.x - gate.x, pos.z - gate.z) < 10) {
        race.next += 1;
        ctx.api.toast(`GATE ${race.next}/4`);
        if (race.next >= race.gates.length) {
          race.active = false;
          race.gates = [];
          race.next = 0;
          S.stats.racesWon += 1;
          S.cash += CONFIG.racePad.prize;
          ctx.api.toast(`RACE WON! +$${CONFIG.racePad.prize}`);
          if (S.banterDirector) S.banterDirector.raceWin();
        }
      }
    }

    // Taxi delivery.
    const taxi = S.sideActivities.taxi;
    if (taxi.active && taxi.dest) {
      if (Math.hypot(pos.x - taxi.dest.x, pos.z - taxi.dest.z) < 8) {
        S.stats.faresDone += 1;
        S.cash += taxi.fare;
        ctx.api.toast(`FARE DONE: +$${taxi.fare}`);
        taxi.active = false;
        taxi.dest = null;
        taxi.fare = 0;
      }
    }
  }

  ctx.updates.push((_dt) => {
    if (S.mode !== 'playing') return;
    const pos = playerPos();

    // T: street race at the start pad.
    if (input.wasPressed('KeyT') && !S.sideActivities.race.active) {
      const pad = CONFIG.racePad;
      if (Math.hypot(pos.x - pad.x, pos.z - pad.z) <= pad.radius + 2) {
        startRace();
      }
    }

    // Y: taxi fare at the stand.
    if (input.wasPressed('KeyY') && !S.sideActivities.taxi.active) {
      const stand = CONFIG.taxiStand;
      if (Math.hypot(pos.x - stand.x, pos.z - stand.z) <= stand.radius + 2) {
        startTaxi();
      }
    }

    logicTick();
  });
  setInterval(logicTick, 500);

  return { startRace, startTaxi, MISSION_TARGETS };
}

export default init;
