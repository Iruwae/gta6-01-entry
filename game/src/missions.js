// missions.js — Solmar Bay story jobs (round-5 rebuild, builder B2).
// Ten missions carry the arc: Marco hands over the first wheels, Lena
// drives the getaways, Vic Torres fences the hot metal, and the crew
// ends the season staring down a PD interceptor heist.
//
// Contract: S.missions = { list, current, start(i), update(dt) }.
// Briefings go out through the dialogue panel; a job pays the moment
// the player (on foot or behind the wheel) reaches its target.

const GARAGE_DOOR = { x: -90, z: -66 };
const AUTO_START_RADIUS = 8;
const FINISH_RADIUS = 10;

function dist2d(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

function nearestDistance(S, tx, tz) {
  let best = Infinity;
  if (S.player && S.player.pos) {
    best = Math.min(best, dist2d(S.player.pos.x, S.player.pos.z, tx, tz));
  }
  if (S.car && S.car.pos) {
    best = Math.min(best, dist2d(S.car.pos.x, S.car.pos.z, tx, tz));
  }
  return best;
}

const JOB_DEFS = [
  {
    id: 'm1',
    title: 'First Wheels',
    target: { x: -60, z: 120 },
    reward: 200,
    brief: [
      { speaker: 'LENA CRUZ', text: "Marco's got a ride with your name on it. Keys are in the ignition and the tank is nearly dry — take her down to the west end and don't let the cops sniff it." },
      { speaker: 'MARCO SOLIS', text: "Don't scratch the paint, bro. First job, first wheels. Bring her back in one piece and Vic might actually learn your name." },
    ],
    done: [
      { speaker: 'LENA CRUZ', text: 'Clean run. The west-end crew saw everything — word travels fast in Solmar.' },
    ],
  },
  {
    id: 'm2',
    title: 'Sunset Cruise',
    target: { x: 30, z: 150 },
    reward: 300,
    brief: [
      { speaker: 'LENA CRUZ', text: 'The Strip is crawling with tourists and their wallets tonight. Cruise the beachfront slow, look expensive, and pick up the package at the south lot.' },
      { speaker: 'MARCO SOLIS', text: 'If a cruiser tails you, lose it in Old Town. Alleys, not highways — trust me on this one.' },
    ],
    done: [
      { speaker: 'MARCO SOLIS', text: 'Package delivered, no heat. You drive like you were born here.' },
    ],
  },
  {
    id: 'm3',
    title: 'Harbor Lights',
    target: { x: 150, z: 90 },
    reward: 350,
    brief: [
      { speaker: 'LENA CRUZ', text: 'A crate came off a boat at the harbor with no paperwork and no owner. Grab it before the dock crew changes shifts.' },
      { speaker: 'VIC TORRES', text: 'Harbor cops nap after midnight. You have a small window — do not make it a big one.' },
    ],
    done: [
      { speaker: 'VIC TORRES', text: 'The crate is already sold. You move fast, kid. I like fast.' },
    ],
  },
  {
    id: 'm4',
    title: 'Midnight Courier',
    target: { x: -150, z: 30 },
    reward: 400,
    brief: [
      { speaker: 'MARCO SOLIS', text: 'A sealed envelope, no questions, no peeking. West industrial, past the old cannery. Somebody there is waiting up for it.' },
      { speaker: 'LENA CRUZ', text: 'And if the envelope feels light, that is not your business. Deliver it, get paid, go home.' },
    ],
    done: [
      { speaker: 'MARCO SOLIS', text: 'Envelope gone, money in hand. See? Easy when you stop asking questions.' },
    ],
  },
  {
    id: 'm5',
    title: 'Payday at the Pier',
    target: { x: 60, z: 120 },
    reward: 600,
    brief: [
      { speaker: 'VIC TORRES', text: 'The pier job pays real money, and real money brings real attention. Lena drives — she knows every exit on that waterfront.' },
      { speaker: 'LENA CRUZ', text: "I'm driving. You just sit tight, watch the mirrors, and don't get us killed before payday." },
      { speaker: 'VIC TORRES', text: 'Pier, midnight, no detours. The crew is counting on both of you.' },
    ],
    done: [
      { speaker: 'LENA CRUZ', text: 'Payday. Told you the pier run was worth it — now we can finally breathe.' },
      { speaker: 'VIC TORRES', text: 'Six hundred, clean. You two are officially my favorite crew in Solmar.' },
    ],
  },
  {
    id: 'm6',
    title: "Vic's First Fence",
    target: { x: 110, z: 138 },
    reward: 500,
    brief: [
      { speaker: 'VIC TORRES', text: 'First rule of my yard: the car arrives hot, the money leaves cold. Bring me something worth selling and I will show you the price board.' },
      { speaker: 'LENA CRUZ', text: 'Vic pays fair if the ride is clean. Bring him a wreck and he will laugh you out of the yard.' },
    ],
    done: [
      { speaker: 'VIC TORRES', text: 'Sold before the engine cooled. That is how a fence job is supposed to go.' },
    ],
  },
  {
    id: 'm7',
    title: 'Two for the Road',
    target: { x: 110, z: 138 },
    reward: 550,
    brief: [
      { speaker: 'VIC TORRES', text: 'Two rides, one night, my yard. The second one is parked behind a warehouse with a bored guard — be quick, be quiet.' },
      { speaker: 'MARCO SOLIS', text: 'I will keep the guard busy. You grab the keys and meet us back at Vic’s.' },
    ],
    done: [
      { speaker: 'VIC TORRES', text: 'Two cars, one night, zero paperwork. Beautiful work.' },
    ],
  },
  {
    id: 'm8',
    title: 'Escort Duty',
    target: { x: 120, z: -120 },
    reward: 700,
    brief: [
      { speaker: 'LENA CRUZ', text: 'The crew is moving product tonight and somebody tipped off a rival gang. We ride shotgun — literally — until they reach the motel safe.' },
      { speaker: 'VIC TORRES', text: 'If headlights follow you past the second light, do not stop. Keep rolling to the motel.' },
    ],
    done: [
      { speaker: 'LENA CRUZ', text: 'Crew is safe, product is safe, and nobody fired a shot. That is the best kind of escort.' },
    ],
  },
  {
    id: 'm9',
    title: 'Interceptor Heist',
    target: { x: 0, z: 0 },
    reward: 800,
    brief: [
      { speaker: 'VIC TORRES', text: 'The PD keeps an interceptor in the downtown impound — fastest thing they own. We are going to borrow it. Permanently.' },
      { speaker: 'LENA CRUZ', text: 'Downtown, cameras everywhere, cops on every corner. We go in fast, we come out faster.' },
    ],
    done: [
      { speaker: 'MARCO SOLIS', text: 'We stole a cop car from the cops. I am framing this night in my head forever.' },
    ],
  },
  {
    id: 'm10',
    title: 'The Big Score',
    target: { x: -60, z: -60 },
    reward: 1500,
    brief: [
      { speaker: 'VIC TORRES', text: 'Everything we have done was practice for tonight. One vault, one convoy, one shot at getting out of this life rich.' },
      { speaker: 'LENA CRUZ', text: 'Whatever happens out there — we go in together, we come out together. Solmar legends, remember?' },
    ],
    done: [
      { speaker: 'VIC TORRES', text: 'Legends. The whole bay will be talking about this one for years.' },
      { speaker: 'LENA CRUZ', text: 'We did it. Solmar is ours now — every street, every sunset, every score.' },
    ],
  },
];

function showLines(S, lines) {
  if (S.dialogue && typeof S.dialogue.show === 'function') {
    S.dialogue.show(lines);
    return;
  }
  // Dialogue module not ready yet: paint the first line directly and
  // stash the queue so dialogue.js can adopt it on init.
  S._dlgLines = lines.slice();
  S._dlgIndex = 0;
  const panel = document.getElementById('dialogue');
  const nameEl = document.getElementById('dlg-name');
  const textEl = document.getElementById('dlg-text');
  if (panel) panel.classList.remove('hidden');
  if (nameEl) nameEl.textContent = lines[0].speaker;
  if (textEl) textEl.textContent = lines[0].text;
}

export function init(S) {
  const missions = {
    list: JOB_DEFS.map((j) => ({
      id: j.id,
      title: j.title,
      brief: j.brief,
      target: { x: j.target.x, z: j.target.z },
      reward: j.reward,
    })),
    current: null,

    start(i) {
      const job = missions.list[i];
      if (!job) return;
      missions.current = job;
      if (i === 4 && S.crew) {
        S.crew.active = true;
        if (S.crew.mesh) S.crew.mesh.visible = true;
      }
      showLines(S, job.brief);
    },

    update(dt) {
      if (S.mode === 'paused') return;
      // m1 auto-starts when the player walks up to the garage door.
      if ((S.missionIndex || 0) === 0 && !missions.current && S.player && S.player.pos) {
        if (dist2d(S.player.pos.x, S.player.pos.z, GARAGE_DOOR.x, GARAGE_DOOR.z) <= AUTO_START_RADIUS) {
          missions.start(0);
          return;
        }
      }
      if (!missions.current) return;
      const job = missions.current;
      if (nearestDistance(S, job.target.x, job.target.z) <= FINISH_RADIUS) {
        S.cash = (S.cash || 0) + job.reward;
        S.missionIndex = (S.missionIndex || 0) + 1;
        missions.current = null;
        if (S.respectDirector && typeof S.respectDirector.add === 'function') {
          S.respectDirector.add(25, 'mission ' + job.id);
        }
        const def = JOB_DEFS.find((j) => j.id === job.id);
        showLines(S, (def && def.done) || [{ speaker: 'LENA CRUZ', text: 'Job done. Clean, fast, paid.' }]);
      }
    },
  };

  S.missions = missions;

  // Own ticker: guarantees the auto-start / completion checks run even
  // if the main loop never calls update (headless runs ~1 fps).
  setInterval(() => {
    try { missions.update(0.15); } catch (e) { /* never break the page */ }
  }, 150);
  if (Array.isArray(S._moduleTicks)) S._moduleTicks.push((dt) => missions.update(dt));

  return missions;
}

export default init;
