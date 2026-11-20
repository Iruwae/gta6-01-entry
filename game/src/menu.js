// menu.js — SOLMAR BAY, round 8 rebuild.
// The start menu, the pause menu (P), and the job board listing all ten
// story jobs. New Game wipes the old save and resets the run, then hands
// off to the intro cutscene. The job board is a read of the mission list
// with a click-to-start row for each job; the missions module itself owns
// what starting a job does.

const JOBS = [
  { id: 'm1', title: 'FIRST WHEELS', blurb: 'Borrow a car, the loud way.' },
  { id: 'm2', title: 'HARBOR LIGHTS', blurb: 'A pickup that must not be seen.' },
  { id: 'm3', title: 'STRIP RUN', blurb: 'Move the package down The Strip.' },
  { id: 'm4', title: 'THE COLLECTOR', blurb: 'Vic is owed. Go and collect.' },
  { id: 'm5', title: 'CREW UP', blurb: 'Lena rides with you now.' },
  { id: 'm6', title: 'NIGHT SHIFT', blurb: 'Downtown after dark.' },
  { id: 'm7', title: 'UPTOWN SCORE', blurb: 'The rich side of the bay.' },
  { id: 'm8', title: 'BEACHSIDE DEAL', blurb: 'Sand, sun, and a handoff.' },
  { id: 'm9', title: 'THE LONG SUNSET', blurb: 'One last run before dark.' },
  { id: 'm10', title: 'BAY LEGEND', blurb: 'Make the whole city know your name.' },
];

function el(ctx, id) {
  if (ctx.dom && ctx.dom[id]) return ctx.dom[id];
  return document.getElementById(id);
}

function keyDown(ctx, code) {
  const inp = ctx.input;
  if (!inp) return false;
  if (typeof inp.isDown === 'function') {
    try { return !!inp.isDown(code); } catch (e) { /* fall through */ }
  }
  const k = inp.keys;
  if (k) {
    if (typeof k.has === 'function') return k.has(code);
    if (Array.isArray(k)) return k.includes(code);
    if (typeof k === 'object') return !!k[code];
  }
  if (typeof inp[code] !== 'undefined') return !!inp[code];
  return false;
}

export function init(ctx) {
  const S = ctx.state;
  const prev = {};

  const grab = (id) => el(ctx, id);

  function show(elm, on) {
    if (!elm) return;
    elm.classList.toggle('hidden', !on);
  }

  function toast(msg) {
    if (ctx.api.toast) ctx.api.toast(msg);
    else {
      const t = grab('toast');
      if (t) t.textContent = msg;
    }
  }

  function freshRun() {
    try { localStorage.removeItem('solmar-save'); } catch (e) { /* storage may be off */ }
    S.cash = 120;
    S.day = 1;
    S.time = 0;
    S.heat = 0;
    if (typeof S.wanted === 'number') S.wanted = 0;
    S.respect = 0;
    S.missionIndex = 0;
    if (S.stats) {
      S.stats.packages = 0;
      S.stats.racesWon = 0;
      S.stats.fencesSold = 0;
      S.stats.faresDone = 0;
    }
    if (S.player) {
      S.player.health = 100;
      if (S.player.pos && typeof S.player.pos.set === 'function') {
        S.player.pos.set(-90, 0, -58);
      }
    }
    if (typeof S.health === 'number') S.health = 100;
    if (Array.isArray(S.garageCars)) S.garageCars.length = 0;
    if (S.missions) S.missions.current = null;
    if (S.sideActivities) {
      if (S.sideActivities.taxi) S.sideActivities.taxi.active = false;
      if (S.sideActivities.race) S.sideActivities.race.active = false;
    }
    if (typeof S.radioStation === 'number') S.radioStation = 0;
    S.cutscene = false;
    S.mode = 'playing';
    show(grab('menu'), false);
    show(grab('pause-menu'), false);
    show(grab('mission-select'), false);
    if (ctx.api.cutscene && typeof ctx.api.cutscene.playIntro === 'function') {
      ctx.api.cutscene.playIntro();
    } else {
      S.cutscene = true;
      S.mode = 'cutscene';
      show(grab('cutscene'), true);
    }
  }

  function resume() {
    S.mode = 'playing';
    show(grab('pause-menu'), false);
    show(grab('mission-select'), false);
    if (ctx.api.audio && typeof ctx.api.audio.click === 'function') {
      try { ctx.api.audio.click(); } catch (e) { /* audio is best-effort */ }
    }
  }

  function pause() {
    if (S.mode !== 'playing') return;
    S.mode = 'paused';
    show(grab('pause-menu'), true);
  }

  function jobStatus(i) {
    const next = S.missionIndex || 0;
    if (i < next) return 'DONE';
    if (i === next) return 'AVAILABLE';
    return 'LOCKED';
  }

  function openJobs() {
    const list = grab('mission-list');
    const panel = grab('mission-select');
    if (!list || !panel) return;
    list.innerHTML = '';
    JOBS.forEach((job, i) => {
      const row = document.createElement('div');
      row.className = 'job-row';
      const name = document.createElement('span');
      name.className = 'job-name';
      name.textContent = (i + 1) + '. ' + job.title;
      const blurb = document.createElement('span');
      blurb.className = 'job-blurb';
      blurb.textContent = job.blurb;
      const status = document.createElement('span');
      status.className = 'job-status';
      status.textContent = jobStatus(i);
      row.appendChild(name);
      row.appendChild(blurb);
      row.appendChild(status);
      row.addEventListener('click', () => {
        if (S.missions && typeof S.missions.start === 'function') {
          try { S.missions.start(i); } catch (e) { /* missions module guards */ }
          S.mode = 'playing';
          show(panel, false);
          show(grab('pause-menu'), false);
        } else {
          toast('Jobs are not ready yet.');
        }
      });
      list.appendChild(row);
    });
    show(panel, true);
  }

  function closeJobs() {
    show(grab('mission-select'), false);
  }

  const btnNew = grab('btn-new');
  if (btnNew) btnNew.addEventListener('click', freshRun);
  const btnResume = grab('btn-resume');
  if (btnResume) btnResume.addEventListener('click', resume);
  const btnMissions = grab('btn-missions');
  if (btnMissions) btnMissions.addEventListener('click', openJobs);
  const btnClose = grab('btn-close-jobs');
  if (btnClose) btnClose.addEventListener('click', closeJobs);

  ctx.api.menu = { newGame: freshRun, resume, pause, openJobs, closeJobs };

  ctx.updates.push(() => {
    // P toggles pause, rising edge only so a held key flips it once.
    const down = keyDown(ctx, 'KeyP');
    const was = !!prev.KeyP;
    prev.KeyP = down;
    if (down && !was) {
      if (S.mode === 'playing') pause();
      else if (S.mode === 'paused') resume();
    }

    // Keep the screens in step with the mode.
    const mode = S.mode || 'menu';
    show(grab('menu'), mode === 'menu');
    show(grab('pause-menu'), mode === 'paused');
    if (mode !== 'paused') show(grab('mission-select'), false);
    // Panels left open in the world (the shop especially) sit above
    // the pause menu and swallow its buttons — stand them down while
    // paused; they reopen with their own keys afterwards.
    if (mode === 'paused') {
      show(grab('shop-panel'), false);
      show(grab('garage-panel'), false);
    }
    const hud = grab('hud');
    if (hud) show(hud, mode !== 'menu');
  });
}
