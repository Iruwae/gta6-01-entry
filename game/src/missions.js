// Story jobs (start/complete live in state.js) + the two street
// side-hustles: checkpoint races (T) and taxi fares (Y).
import { CONFIG } from './config.js';

export function init(ctx) {
  const { state: S, input } = ctx;

  function near(x, z, r) {
    const px = S.car ? S.car.pos.x : S.player.pos.x;
    const pz = S.car ? S.car.pos.z : S.player.pos.z;
    const dx = px - x;
    const dz = pz - z;
    return Math.sqrt(dx * dx + dz * dz) < r;
  }

  ctx.updates.push(() => {
    if (S.mode !== 'playing') return;
    // Read the activity objects fresh every frame: resetState replaces
    // them on a new game, so a reference captured at init would go stale.
    const race = S.sideActivities.race;
    const taxi = S.sideActivities.taxi;
    // --- Street race (T at the start pad, in a car) ---
    if (input.wasPressed('KeyT') && !race.active && S.car && near(CONFIG.racePad.x, CONFIG.racePad.z, 12)) {
      race.active = true;
      race.gates = CONFIG.raceGates.map((g) => ({ ...g }));
      race.next = 0;
      if (ctx.api.toast) ctx.api.toast('Street race started — hit all 4 gates in order!');
    }
    if (race.active && S.car) {
      const gate = race.gates[race.next];
      if (gate) {
        const dx = S.car.pos.x - gate.x;
        const dz = S.car.pos.z - gate.z;
        if (Math.sqrt(dx * dx + dz * dz) < 12) {
          race.next += 1;
          if (ctx.api.toast) ctx.api.toast(`Gate ${race.next} of 4!`);
          if (race.next >= race.gates.length) {
            race.active = false;
            race.next = 0;
            S.cash += CONFIG.racePad.prize;
            S.stats.racesWon += 1;
            if (ctx.api.toast) ctx.api.toast(`Race won! +$${CONFIG.racePad.prize}`);
            if (S.banterDirector) S.banterDirector.raceWin();
          }
        }
      }
    }
    // --- Taxi fare (Y at the stand, in a car) ---
    if (input.wasPressed('KeyY') && !taxi.active && S.car && near(CONFIG.taxiStand.x, CONFIG.taxiStand.z, 12)) {
      const dests = CONFIG.taxiDestinations;
      const dest = dests[S.stats.faresDone % dests.length];
      taxi.active = true;
      taxi.dest = { x: dest.x, z: dest.z, label: dest.label };
      taxi.fare = 80 + (S.stats.faresDone % 6) * 10;
      if (ctx.api.toast) ctx.api.toast(`Taxi fare: take them to ${dest.label} — $${taxi.fare}`);
    }
    if (taxi.active && S.car && taxi.dest) {
      const dx = S.car.pos.x - taxi.dest.x;
      const dz = S.car.pos.z - taxi.dest.z;
      if (Math.sqrt(dx * dx + dz * dz) < 10) {
        S.cash += taxi.fare;
        S.stats.faresDone += 1;
        if (ctx.api.toast) ctx.api.toast(`Fare delivered! +$${taxi.fare}`);
        taxi.active = false;
        taxi.dest = null;
        taxi.fare = 0;
      }
    }
  });
}

export default init;
