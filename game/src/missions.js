// SOLMAR BAY — the 10 story jobs (start/complete through S.missions;
// briefing dialogue for m1/m5 is shown by the boot hub's fallback wrap)
// plus the two street side-hustles: checkpoint races (T) and taxi
// fares (Y). A job completes when the player reaches its waypoint.
import { CONFIG } from './config.js';

// Waypoints are far corners and landmarks the smoke route never crosses
// while another job is current, so a job only completes on purpose.
const WAYPOINTS = {
  m1: { x: 140, z: -140 },
  m2: { x: 110, z: 138 },
  m3: { x: 0, z: 135 },
  m4: { x: -120, z: 120 },
  m5: { x: -140, z: 140 },
  m6: { x: 120, z: 120 },
  m7: { x: 140, z: 140 },
  m8: { x: -120, z: -60 },
  m9: { x: 0, z: 165 },
  m10: { x: 120, z: -90 },
};

export function init(ctx) {
  const S = ctx.state;
  const { input } = ctx;
  const toast = (m) => ctx.api.toast && ctx.api.toast(m);

  ctx.updates.push(() => {
    if (S.mode !== 'playing' || S.cutscene) return;
    const pad = CONFIG.locations.racePad;
    const stand = CONFIG.locations.taxiStand;
    const ref = S.car ? S.car.pos : S.player.pos;

    // Street race: T at the start pad, 4 gates in order, +$300 on the win.
    if (input.justPressed('KeyT') && S.car && !S.sideActivities.race.active) {
      const d = Math.hypot(ref.x - pad.x, ref.z - pad.z);
      if (d < pad.radius) {
        S.sideActivities.race.active = true;
        S.sideActivities.race.gates = CONFIG.raceGates.map((g) => ({ ...g }));
        S.sideActivities.race.next = 0;
        toast('Race started — hit all 4 gates in order!');
      }
    }
    if (S.sideActivities.race.active && S.car) {
      const race = S.sideActivities.race;
      const gate = race.gates[race.next];
      if (gate) {
        const d = Math.hypot(S.car.pos.x - gate.x, S.car.pos.z - gate.z);
        if (d < 15) {
          race.next += 1;
          if (race.next >= race.gates.length) {
            race.active = false;
            race.next = 0;
            S.stats.racesWon += 1;
            S.cash += CONFIG.locations.racePad.prize;
            toast(`Race won! +$${CONFIG.locations.racePad.prize}`);
            if (S.banterDirector) S.banterDirector.raceWin();
          } else {
            toast(`Gate ${race.next} of 4 — next gate ahead!`);
          }
        }
      }
    }

    // Taxi: Y at the stand starts a fare; drive onto the destination.
    if (input.justPressed('KeyY') && S.car && !S.sideActivities.taxi.active) {
      const d = Math.hypot(ref.x - stand.x, ref.z - stand.z);
      if (d < stand.radius) {
        const dest = CONFIG.taxiDests[S.stats.faresDone % CONFIG.taxiDests.length];
        S.sideActivities.taxi.active = true;
        S.sideActivities.taxi.dest = { ...dest };
        S.sideActivities.taxi.fare = CONFIG.taxiFare;
        toast(`Taxi fare: take the passenger to ${dest.name} (+$${CONFIG.taxiFare})`);
      }
    }
    if (S.sideActivities.taxi.active && S.car) {
      const taxi = S.sideActivities.taxi;
      const d = Math.hypot(S.car.pos.x - taxi.dest.x, S.car.pos.z - taxi.dest.z);
      if (d < 10) {
        S.cash += taxi.fare;
        S.stats.faresDone += 1;
        toast(`Fare delivered! +$${taxi.fare}`);
        taxi.active = false;
        taxi.dest = null;
        taxi.fare = 0;
      }
    }

    // Story job completion at the job waypoint.
    const cur = S.missions.current;
    if (cur) {
      const wp = WAYPOINTS[cur.id];
      if (wp) {
        const d = Math.hypot(ref.x - wp.x, ref.z - wp.z);
        if (d < 10) {
          const title = cur.title;
          const pay = cur.pay;
          S.missions.complete();
          toast(`Job done: ${title} +$${pay}`);
        }
      }
    }
  });

  ctx.flags.missions = true;
}
