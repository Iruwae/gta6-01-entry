// SOLMAR BAY — story jobs plus the two street side-hustles: checkpoint
// races (T) and taxi fares (Y). Briefing dialogue lives in the boot hub.
export function init(ctx) {
  const { state: S, input, config, api } = ctx;
  ctx.updates.push(() => {
    if (S.mode !== 'playing') return;
    const race = S.sideActivities.race;
    const taxi = S.sideActivities.taxi;
    // Street race: T at the start pad.
    if (input.wasPressed('KeyT') && S.car && !race.active) {
      const d = Math.hypot(S.car.pos.x - config.racePad.x, S.car.pos.z - config.racePad.z);
      if (d < config.racePad.radius + 2) {
        race.active = true;
        race.gates = config.raceGates.map((g) => ({ ...g }));
        race.next = 0;
        api.toast('Street race started — hit all 4 gates in order!');
      }
    }
    if (race.active && S.car) {
      const gate = race.gates[race.next];
      if (gate) {
        const d = Math.hypot(S.car.pos.x - gate.x, S.car.pos.z - gate.z);
        if (d < 12) {
          race.next += 1;
          if (race.next >= race.gates.length) {
            race.active = false;
            race.next = 0;
            S.cash += config.racePad.prize;
            S.stats.racesWon += 1;
            api.toast(`Race won! +$${config.racePad.prize}`);
            if (S.banterDirector) S.banterDirector.raceWin();
          } else {
            api.toast(`Gate ${race.next} of 4 — keep going!`);
          }
        }
      }
    }
    // Taxi: Y at the stand.
    if (input.wasPressed('KeyY') && S.car && !taxi.active) {
      const d = Math.hypot(S.car.pos.x - config.taxiStand.x, S.car.pos.z - config.taxiStand.z);
      if (d < config.taxiStand.radius + 2) {
        const dest = config.taxiDests[S.stats.faresDone % config.taxiDests.length];
        taxi.active = true;
        taxi.dest = { ...dest };
        taxi.fare = 80 + ((S.stats.faresDone * 20) % 60);
        api.toast(`Taxi fare started — take them to (${dest.x}, ${dest.z}) for $${taxi.fare}.`);
      }
    }
    if (taxi.active && S.car && taxi.dest) {
      const d = Math.hypot(S.car.pos.x - taxi.dest.x, S.car.pos.z - taxi.dest.z);
      if (d < 8) {
        S.cash += taxi.fare;
        S.stats.faresDone += 1;
        api.toast(`Fare delivered! +$${taxi.fare}`);
        taxi.active = false;
        taxi.dest = null;
        taxi.fare = 0;
      }
    }
  });
  ctx.api.completeMission = () => S.missions.complete();
}

export default { init };
