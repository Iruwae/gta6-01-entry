// SOLMAR BAY — start menu, pause menu and job board (round 7, builder D).
// NEW GAME starts a fresh run and rolls the intro cutscene. P pauses and
// resumes. The job board lists all ten jobs; picking one hands it to the
// missions system and drops the player straight back into the streets.

const JOBS = [
  { id: 'm1', title: 'The Garage Job', pay: 250, blurb: 'Vic needs a driver who keeps quiet.' },
  { id: 'm2', title: 'Sunset Run', pay: 300, blurb: 'Move a package across town before dark.' },
  { id: 'm3', title: 'Harbor Lights', pay: 350, blurb: 'The docks pay better than the streets.' },
  { id: 'm4', title: 'The Strip Score', pay: 400, blurb: 'Loud, fast, and gone before the sirens.' },
  { id: 'm5', title: 'Crew Up', pay: 600, blurb: 'The whole crew rides on this one.' },
  { id: 'm6', title: 'Bayline Blues', pay: 450, blurb: 'A rival crew is skimming the bay.' },
  { id: 'm7', title: 'Uptown Score', pay: 500, blurb: 'Rich streets, richer pickings.' },
  { id: 'm8', title: 'Marina Nights', pay: 550, blurb: 'Boats, money, and no witnesses.' },
  { id: 'm9', title: 'The Big Catch', pay: 700, blurb: 'Vic trusts you with the real money now.' },
  { id: 'm10', title: 'Legend of the Bay', pay: 1000, blurb: 'From nobody to a name they all know.' },
];

export function init(ctx) {
  const S = ctx.state;
  const pick = (id) => (ctx.dom && ctx.dom[id]) || document.getElementById(id);
  const show = (id) => { const el = pick(id); if (el) el.classList.remove('hidden'); };
  const hide = (id) => { const el = pick(id); if (el) el.classList.add('hidden'); };
  const click = (fn) => { try { if (ctx.api.audio && ctx.api.audio.click) ctx.api.audio.click(); } catch (e) { /* silent */ } };

  function resetRun() {
    try {
      S.cash = 120;
      S.day = 1;
      S.time = 0;
      S.health = 100;
      S.heat = 0;
      S.wanted = 0;
      S.respect = 0;
      S.missionIndex = 0;
      S.cutscene = false;
      if (S.player) {
        S.player.health = 100;
        try { S.player.pos.set(-80, 0, -50); } catch (e) { /* keep pos */ }
        if (typeof S.player.heading === 'number') S.player.heading = 0;
      }
      if (S.stats) {
        S.stats.packages = 0;
        S.stats.racesWon = 0;
        S.stats.fencesSold = 0;
        S.stats.faresDone = 0;
      }
      if (Array.isArray(S.garageCars)) S.garageCars.length = 0;
      if (Array.isArray(S.packages)) for (const p of S.packages) p.taken = false;
      S.car = null;
      if (S.missions) S.missions.current = null;
      if (S.sideActivities) {
        if (S.sideActivities.taxi) S.sideActivities.taxi.active = false;
        if (S.sideActivities.race) S.sideActivities.race.active = false;
      }
      if (S.respectDirector && S.respectDirector.rank) S.respectDirector.rank.title = 'NOBODY';
      if (S.crew) S.crew.active = false;
      try { localStorage.removeItem('solmar-save'); } catch (e) { /* no storage */ }
    } catch (e) { /* a fresh run must still start */ }
  }

  function newGame() {
    click();
    resetRun();
    hide('menu');
    hide('pause-menu');
    hide('mission-select');
    hide('shop-panel');
    hide('garage-panel');
    show('hud');
    // Roll the intro flyover through the cutscene module when it is
    // available; fall back to setting the shared flags directly.
    let played = false;
    try {
      if (ctx.api.playCutscene) { ctx.api.playCutscene(); played = true; }
    } catch (e) { /* fall back below */ }
    if (!played) {
      S.cutscene = true;
      S.mode = 'cutscene';
      show('cutscene');
    }
  }

  function pauseGame() {
    if (S.mode !== 'playing') return;
    S.mode = 'paused';
    // The pause menu must actually be clickable: an open shop or garage
    // panel sits above it in the DOM and would swallow its buttons.
    hide('shop-panel');
    hide('garage-panel');
    show('pause-menu');
  }

  function resumeGame() {
    click();
    hide('pause-menu');
    hide('mission-select');
    S.mode = 'playing';
  }

  function buildJobBoard() {
    const list = pick('mission-list');
    if (!list) return;
    while (list.firstChild) list.removeChild(list.firstChild);
    const next = typeof S.missionIndex === 'number' ? S.missionIndex : 0;
    JOBS.forEach((job, i) => {
      const row = document.createElement('div');
      row.className = 'job-row';
      row.dataset.job = job.id;
      row.dataset.index = String(i);
      const status = i < next ? 'DONE' : (i === next ? 'AVAILABLE' : 'LOCKED');
      const title = document.createElement('span');
      title.className = 'job-title';
      title.textContent = (i + 1) + '. ' + job.title;
      const pay = document.createElement('span');
      pay.className = 'job-pay';
      pay.textContent = '$' + job.pay;
      const state = document.createElement('span');
      state.className = 'job-status';
      state.textContent = status;
      const blurb = document.createElement('span');
      blurb.className = 'job-blurb';
      blurb.textContent = job.blurb;
      row.appendChild(title);
      row.appendChild(pay);
      row.appendChild(state);
      row.appendChild(blurb);
      row.addEventListener('click', () => {
        click();
        if (i > next) {
          if (ctx.api.showToast) ctx.api.showToast('Finish the current job first.');
          return;
        }
        try {
          if (S.missions && typeof S.missions.start === 'function') S.missions.start(i);
        } catch (e) { /* missions module reports its own errors */ }
        hide('mission-select');
        hide('pause-menu');
        S.mode = 'playing';
      });
      list.appendChild(row);
    });
  }

  function openJobBoard() {
    click();
    buildJobBoard();
    show('mission-select');
  }

  function closeJobBoard() {
    click();
    hide('mission-select');
  }

  ctx.api.newGame = newGame;
  ctx.api.startGame = newGame;
  ctx.api.pauseGame = pauseGame;
  ctx.api.resumeGame = resumeGame;
  ctx.api.openJobBoard = openJobBoard;
  ctx.api.closeJobBoard = closeJobBoard;
  ctx.api.jobList = JOBS;

  const btnNew = pick('btn-new');
  if (btnNew) btnNew.addEventListener('click', newGame);
  const btnResume = pick('btn-resume');
  if (btnResume) btnResume.addEventListener('click', resumeGame);
  const btnMissions = pick('btn-missions');
  if (btnMissions) btnMissions.addEventListener('click', openJobBoard);
  const btnCloseJobs = pick('btn-close-jobs');
  if (btnCloseJobs) btnCloseJobs.addEventListener('click', closeJobBoard);

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code !== 'KeyP') return;
    if (S.mode === 'playing') {
      pauseGame();
    } else if (S.mode === 'paused') {
      const board = pick('mission-select');
      if (board && !board.classList.contains('hidden')) closeJobBoard();
      else resumeGame();
    }
  });
}
