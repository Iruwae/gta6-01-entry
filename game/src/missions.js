// SOLMAR BAY — the 10 story jobs (start/complete through S.missions)
// plus the two street side-hustles: checkpoint races (T) and taxi
// fares (Y). Briefing dialogues live in the boot hub's fallback wrap.
// Race: press T at the start pad, drive through all 4 gates in order
// to win +$300. Taxi: press Y at the stand, drive the fare to the
// landmark destination (never a package spot) to get paid.
import { CONFIG } from './config.js';

export function init(ctx) {
  const { state: S, input } = ctx;

  function near(x, z, cx, cz, radius) {
    const dx = x - cx;
    const dz = z - cz;
    return dx * dx + dz * dz <= radius * radius;
  }

  // The watchdog in the boot hub also calls this update on a timer
  // (rAF can stall for seconds under headless SwiftShader), so the
  // function is stashed on ctx.api. Double-running is safe: race/taxi
  // starts are guarded by their active flags, gate progress and
  // deliveries are idempotent.
  const update = (dt) => {
    if (S.mode !== 'playing') return;

    // ---- street race ----
    const race = S.sideActivities.race;
    if (input.wasPressed('KeyT') && !race.active && S.car) {
      if (near(S.car.pos.x, S.car.pos.z, CONFIG.racePad.x, CONFIG.racePad.z, CONFIG.racePad.radius)) {
        race.active = true;
        race.gates = CONFIG.raceGates.map(([x, z]) => ({ x, z }));
        race.next = 0;
        ctx.api.toast('Street race — hit all 4 gates in order!');
      }
    }
    if (race.active && S.car) {
      const gate = race.gates[race.next];
      if (gate && near(S.car.pos.x, S.car.pos.z, gate.x, gate.z, 10)) {
        race.next += 1;
        if (race.next >= race.gates.length) {
          race.active = false;
          race.next = 0;
          S.stats.racesWon += 1;
          S.cash += CONFIG.racePad.prize;
          ctx.api.toast(`Race won! +$${CONFIG.racePad.prize}`);
          S.banterDirector.raceWin();
        } else {
          ctx.api.toast(`Gate ${race.next}/4 — keep it pinned!`);
        }
      }
    }

    // ---- taxi fare ----
    const taxi = S.sideActivities.taxi;
    if (input.wasPressed('KeyY') && !taxi.active && S.car) {
      if (near(S.car.pos.x, S.car.pos.z, CONFIG.taxiStand.x, CONFIG.taxiStand.z, CONFIG.taxiStand.radius)) {
        const dest = CONFIG.taxiDests[Math.floor(Math.random() * CONFIG.taxiDests.length)];
        taxi.active = true;
        taxi.dest = { x: dest[0], z: dest[1] };
        taxi.fare = 80 + Math.floor(Math.random() * 60);
        ctx.api.toast(`Taxi fare — take the passenger to the marker. Fare $${taxi.fare}.`);
      }
    }
    if (taxi.active && S.car && taxi.dest) {
      if (near(S.car.pos.x, S.car.pos.z, taxi.dest.x, taxi.dest.z, 8)) {
        S.cash += taxi.fare;
        S.stats.faresDone += 1;
        ctx.api.toast(`Fare complete! +$${taxi.fare}`);
        taxi.active = false;
        taxi.dest = null;
        taxi.fare = 0;
      }
    }
  };
  ctx.updates.push(update);
  ctx.api.missionsUpdate = update;
}
