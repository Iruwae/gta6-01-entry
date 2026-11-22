// The 10 story jobs run through S.missions (see state.js); this module
// owns the two street side-hustles: checkpoint races (T) and taxi fares (Y).
import { CONFIG } from './config.js';

export function init(ctx) {
  const { state: S, input } = ctx;

  ctx.updates.push(() => {
    const race = S.sideActivities.race;
    const taxi = S.sideActivities.taxi;

    // Street race: T at the start pad starts it (4 gates, in order).
    if (input.wasPressed('KeyT') && S.car && !race.active) {
      const dx = S.car.pos.x - CONFIG.racePad.x;
      const dz = S.car.pos.z - CONFIG.racePad.z;
      if (dx * dx + dz * dz < CONFIG.racePad.radius * CONFIG.racePad.radius) {
        race.active = true;
        race.gates = CONFIG.raceGates.map((g) => ({ ...g }));
        race.next = 0;
        ctx.api.toast('Street race started — hit all 4 gates in order!');
      }
    }
    if (race.active && S.car) {
      const g = race.gates[race.next];
      if (g) {
        const dx = S.car.pos.x - g.x;
        const dz = S.car.pos.z - g.z;
        if (dx * dx + dz * dz < 64) { // 8 m gate radius
          race.next += 1;
          if (race.next >= race.gates.length) {
            race.active = false;
            S.cash += CONFIG.racePad.prize;
            S.stats.racesWon += 1;
            ctx.api.toast(`Race won! +$${CONFIG.racePad.prize}`);
            if (S.banterDirector) S.banterDirector.raceWin();
          }
        }
      }
    }

    // Taxi fare: Y at the stand starts it; drive onto the destination.
    if (input.wasPressed('KeyY') && S.car && !taxi.active) {
      const dx = S.car.pos.x - CONFIG.taxiStand.x;
      const dz = S.car.pos.z - CONFIG.taxiStand.z;
      if (dx * dx + dz * dz < CONFIG.taxiStand.radius * CONFIG.taxiStand.radius) {
        const dest = CONFIG.taxiLandmarks[S.stats.faresDone % CONFIG.taxiLandmarks.length];
        taxi.active = true;
        taxi.dest = { x: dest.x, z: dest.z, name: dest.name };
        taxi.fare = CONFIG.taxiFare;
        ctx.api.toast(`Taxi fare: take them to ${dest.name} (+$${taxi.fare}).`);
      }
    }
    if (taxi.active && S.car && taxi.dest) {
      const dx = S.car.pos.x - taxi.dest.x;
      const dz = S.car.pos.z - taxi.dest.z;
      if (dx * dx + dz * dz < 64) {
        S.cash += taxi.fare;
        S.stats.faresDone += 1;
        ctx.api.toast(`Fare delivered! +$${taxi.fare}`);
        taxi.active = false;
        taxi.dest = null;
      }
    }
  });
}
