// missions.js — the ten story jobs of Solmar Bay.
//
// Each job is a briefing (dialogue lines), a place to reach, and a
// payout. The job board (menu.js) lists S.missions.list and starts a
// job by index; the first job also starts itself when the player walks
// up to the garage, because that is where the story begins.
//
// The spine (id, title, giver, brief) comes from S.config.missions so
// the board, the HUD and this module never disagree about a job's
// name. Everything else — reward, target, crew, lines — lives in the
// DETAIL table below, keyed by mission id.

// Per-job detail the config spine does not carry. Targets are map
// points; reaching one inside COMPLETE_RADIUS finishes the job.
const DETAIL = {
  m1: {
    reward: 200, crew: false,
    target: { x: 0, z: 135, label: 'THE STRIP' },
    objective: 'Take the garage sport car for a shake-down on the Strip',
    lines: [
      { speaker: 'LENA CRUZ', text: 'There she is. Red, loud, and already paid for — mostly. Take her down the Strip and see how she feels.' },
      { speaker: 'MARCO SOLIS', text: 'Easy on the gearbox, kid. Vic is watching this one, and Vic remembers every scratch.' },
    ],
    done: [
      { speaker: 'LENA CRUZ', text: 'She pulls clean. You drive like you mean it — Vic is going to like you.' },
    ],
  },
  m2: {
    reward: 250, crew: false,
    target: { x: 140, z: -100, label: 'UPTOWN DROP' },
    objective: 'Run Marco’s package to the uptown drop before dark',
    lines: [
      { speaker: 'MARCO SOLIS', text: 'A package, one address, no questions. Uptown, before the sun is gone. Do not open it.' },
      { speaker: 'LENA CRUZ', text: 'And do not let the PD get a look at you. They love a courier with a schedule.' },
    ],
    done: [
      { speaker: 'MARCO SOLIS', text: 'Delivered, sealed, no fuss. That is how you stay employed around here.' },
    ],
  },
  m3: {
    reward: 300, crew: false,
    target: { x: 120, z: 120, label: 'THE DOCKS' },
    objective: 'Scout the harbor docks and clock the night shift',
    lines: [
      { speaker: 'LENA CRUZ', text: 'The docks run a night shift that is not on any roster. Get down there, look around, and come back with what you see.' },
    ],
    done: [
      { speaker: 'LENA CRUZ', text: 'So the night shift is real. Vic will want to hear this himself.' },
    ],
  },
  m4: {
    reward: 300, crew: false,
    target: { x: -140, z: -40, label: 'OLD TOWN' },
    objective: 'Lose the tail through Old Town without firing a shot',
    lines: [
      { speaker: 'MARCO SOLIS', text: 'Somebody is following you, and they are not subtle about it. Old Town, tight streets, no gunfire. Lose them.' },
    ],
    done: [
      { speaker: 'MARCO SOLIS', text: 'Clean. Whoever that was, they are still circling the block looking for you.' },
    ],
  },
  m5: {
    reward: 600, crew: true,
    target: { x: 0, z: 165, label: 'THE PIER' },
    objective: 'Hit the pier job with Lena riding shotgun — do not miss',
    lines: [
      { speaker: 'VIC TORRES', text: 'Payday at the pier. The crew is counting on this one, so listen close: in fast, out faster, nobody gets left behind.' },
      { speaker: 'LENA CRUZ', text: 'I am riding shotgun. You drive, I handle the rest — and try not to scratch my door this time.' },
      { speaker: 'VIC TORRES', text: 'One more thing. If the PD shows up, you do not stop for a chat. You go.' },
    ],
    done: [
      { speaker: 'VIC TORRES', text: 'That is the payday I promised. Split is fair, crew is happy. You are one of us now.' },
      { speaker: 'LENA CRUZ', text: 'Told you we make a good team. Same time next week?' },
    ],
  },
  m6: {
    reward: 350, crew: false,
    target: { x: 110, z: 138, label: 'THE YARD' },
    objective: 'Boost a ride and bring it to Vic’s yard, clean, no heat',
    lines: [
      { speaker: 'VIC TORRES', text: 'First real boost. Pick a ride, bring it to my yard, and keep the heat off you. Clean is the whole job.' },
    ],
    done: [
      { speaker: 'VIC TORRES', text: 'No scratches, no sirens. The fence will pay well for this one.' },
    ],
  },
  m7: {
    reward: 450, crew: false,
    target: { x: 120, z: 60, label: 'HARBOR BRIDGE' },
    objective: 'Outrun the PD interceptor across the harbor bridge',
    lines: [
      { speaker: 'VIC TORRES', text: 'The interceptor unit is fast and it does not give up. Take them across the bridge and leave them in your mirrors.' },
    ],
    done: [
      { speaker: 'LENA CRUZ', text: 'You outran the interceptor! The whole bay is going to hear about this one.' },
    ],
  },
  m8: {
    reward: 500, crew: true,
    target: { x: 0, z: -100, label: 'THE ROADBLOCK' },
    objective: 'Drive the crew through the roadblock and keep everyone breathing',
    lines: [
      { speaker: 'LENA CRUZ', text: 'Roadblock ahead and the crew is in the car. Steady hands, steady speed — we go through, not around.' },
      { speaker: 'VIC TORRES', text: 'Nobody gets out of that car until we are clear. Understood?' },
    ],
    done: [
      { speaker: 'LENA CRUZ', text: 'Everyone breathing, nobody cuffed. That is how a crew stays a crew.' },
    ],
  },
  m9: {
    reward: 900, crew: false,
    target: { x: 120, z: -90, label: 'UPTOWN VAULT' },
    objective: 'The uptown vault job — everything rides on this one',
    lines: [
      { speaker: 'VIC TORRES', text: 'The vault job. Everything we have built rides on tonight, so no improvising. Get in, get the score, get out.' },
      { speaker: 'MARCO SOLIS', text: 'The route is planned to the metre. Trust the plan and the plan trusts you.' },
    ],
    done: [
      { speaker: 'VIC TORRES', text: 'The big score. That is retirement money for half the bay — and you earned your cut.' },
    ],
  },
  m10: {
    reward: 1000, crew: true,
    target: { x: 0, z: 150, label: 'THE BEACH' },
    objective: 'One last run at dawn — leave the bay, or own it',
    lines: [
      { speaker: 'LENA CRUZ', text: 'One last run, at dawn, on the beach road. After this, you either leave the bay or you own it.' },
      { speaker: 'VIC TORRES', text: 'Whatever you choose, kid — it was a pleasure doing business with you.' },
    ],
    done: [
      { speaker: 'LENA CRUZ', text: 'Solmar Bay is yours now. Try to look after it better than the last lot did.' },
    ],
  },
};

const COMPLETE_RADIUS = 10;
const GARAGE_RADIUS = 7;

function dist2(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

export function init(S) {
  const spine = (S.config && S.config.missions) || [];
  const anchors = (S.config && S.config.anchors) || {};
  const garage = anchors.garage || { x: -90, z: -66 };

  // The live list: config spine plus this module's detail. The job
  // board reads id / title / reward straight off these entries.
  const list = spine.map((job, i) => {
    const extra = DETAIL[job.id] || {};
    return {
      id: job.id,
      title: job.title,
      giver: job.giver,
      brief: job.brief,
      index: i,
      reward: extra.reward || 100,
      crew: !!extra.crew,
      target: extra.target || { x: 0, z: 0, label: 'SOLMAR BAY' },
      objective: extra.objective || job.brief,
      lines: extra.lines || [{ speaker: job.giver, text: job.brief }],
      done: extra.done || [{ speaker: job.giver, text: 'Job done. Well driven.' }],
    };
  });

  const missions = {
    list,
    current: null,
    completed: [],

    // Begin job i: set the crew flag, point the HUD at the target,
    // and open the briefing. Safe to call while paused (job board).
    start(i) {
      const job = list[i];
      if (!job) return null;
      missions.current = job;
      S.missionIndex = i;
      if (S.crew) S.crew.active = job.crew;
      showBriefing(job.lines);
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = 'JOB: ' + job.id.toUpperCase() + ' — ' + job.title;
        toast.classList.remove('hidden');
      }
      return job;
    },

    // The objective line the HUD prints for the active job.
    objectiveText() {
      const job = missions.current;
      if (!job) return '';
      return job.id.toUpperCase() + ' — ' + job.title + ': ' + job.objective;
    },

    // Per-frame, driven by main.js. Auto-starts the first job at the
    // garage, and finishes the active job when its target is reached.
    tick() {
      if (S.mode !== 'playing' && S.mode !== undefined) return;
      const anchor = S.car ? S.car.pos : (S.player && S.player.pos);
      if (!anchor) return;

      if (!missions.current && S.missionIndex === 0 && list.length > 0) {
        if (dist2(anchor.x, anchor.z, garage.x, garage.z) <= GARAGE_RADIUS * GARAGE_RADIUS) {
          missions.start(0);
          return;
        }
      }

      const job = missions.current;
      if (!job || !job.target) return;
      if (dist2(anchor.x, anchor.z, job.target.x, job.target.z) <= COMPLETE_RADIUS * COMPLETE_RADIUS) {
        finish(job);
      }
    },
  };
  // main.js prefers tick(), falls back to update().
  missions.update = missions.tick;

  function showBriefing(lines) {
    if (S.dialogue && typeof S.dialogue.show === 'function') {
      S.dialogue.show(lines);
      return;
    }
    // Dialogue not initialised yet (init order): write the box by hand
    // so a briefing is never silently lost.
    const box = document.getElementById('dialogue');
    const nameEl = document.getElementById('dlg-name');
    const textEl = document.getElementById('dlg-text');
    if (!box || !nameEl || !textEl || lines.length === 0) return;
    nameEl.textContent = lines[0].speaker;
    textEl.textContent = lines[0].text;
    box.classList.remove('hidden');
  }

  function finish(job) {
    missions.current = null;
    missions.completed.push(job.id);
    S.missionIndex = Math.min(job.index + 1, list.length);
    if (S.crew) S.crew.active = false;
    S.cash = (S.cash || 0) + job.reward;
    if (S.respectDirector && typeof S.respectDirector.add === 'function') {
      S.respectDirector.add(25, 'mission ' + job.id);
    }
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = 'JOB DONE: ' + job.title + ' +$' + job.reward;
      toast.classList.remove('hidden');
    }
    showBriefing(job.done);
  }

  // Replace the state.js stand-in (its start() only set current) with
  // the live object. Anything holding the old reference still sees a
  // working start() through S.missions.
  S.missions = missions;
  return missions;
}

export default init;
