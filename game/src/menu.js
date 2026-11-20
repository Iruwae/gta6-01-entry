// menu.js — SOLMAR BAY menus.
// Start screen, pause menu and the job board (10 jobs). P toggles pause.
// The job list is read from the missions module when it offers one;
// otherwise this file's own fallback list of ten jobs is shown.
export function init(ctx) {
  const S = ctx.state || ctx.S;
  const dom = ctx.dom || {};
  const el = (id) => dom[id] || document.getElementById(id);

  const FALLBACK_JOBS = [
    { id: 'm1', index: 0, title: 'Borrowed Wheels', pay: 150 },
    { id: 'm2', index: 1, title: 'Sunset Drop', pay: 220 },
    { id: 'm3', index: 2, title: 'Harbor Lights', pay: 300 },
    { id: 'm4', index: 3, title: 'The Long Way Home', pay: 380 },
    { id: 'm5', index: 4, title: 'Crew Night', pay: 500 },
    { id: 'm6', index: 5, title: 'Strip Run', pay: 450 },
    { id: 'm7', index: 6, title: 'Quiet Harbor', pay: 520 },
    { id: 'm8', index: 7, title: 'High Tide', pay: 600 },
    { id: 'm9', index: 8, title: 'Bay Legend', pay: 750 },
    { id: 'm10', index: 9, title: 'The Last Sunset', pay: 1000 },
  ];

  function toast(msg) {
    try {
      if (ctx.api && typeof ctx.api.toast === 'function') { ctx.api.toast(msg); return; }
    } catch (e) { /* fall through */ }
    const t = el('toast');
    if (t) t.textContent = msg;
  }

  function show(id) { const n = el(id); if (n) n.classList.remove('hidden'); }
  function hide(id) { const n = el(id); if (n) n.classList.add('hidden'); }

  function jobList() {
    // Prefer the missions module's own list, in whatever shape it offers.
    try {
      const api = ctx.api && ctx.api.missions;
      if (api && typeof api.list === 'function') {
        const got = api.list();
        if (Array.isArray(got) && got.length) return got;
      }
      if (api && Array.isArray(api.jobs) && api.jobs.length) return api.jobs;
    } catch (e) { /* fall through to fallback */ }
    if (S.missions && Array.isArray(S.missions.list) && S.missions.list.length) return S.missions.list;
    if (Array.isArray(S.missionList) && S.missionList.length) return S.missionList;
    return FALLBACK_JOBS;
  }

  function normalise(job, i) {
    return {
      id: job.id || ('m' + (i + 1)),
      index: typeof job.index === 'number' ? job.index : i,
      title: job.title || job.name || ('Job ' + (i + 1)),
      pay: typeof job.pay === 'number' ? job.pay : (typeof job.reward === 'number' ? job.reward : 0),
      done: !!job.done || !!job.completed,
    };
  }

  function openJobs() {
    const list = el('mission-list');
    const panel = el('mission-select');
    if (!list || !panel) return;
    list.innerHTML = '';
    const jobs = jobList().map(normalise);
    const nextIdx = typeof S.missionIndex === 'number' ? S.missionIndex : 0;
    jobs.forEach((job) => {
      const row = document.createElement('div');
      row.className = 'job-row';
      const status = job.done ? 'DONE' : (job.index === nextIdx ? 'OPEN' : (job.index < nextIdx ? 'DONE' : 'LOCKED'));
      row.dataset.jobId = job.id;
      const t = document.createElement('span');
      t.className = 'job-title';
      t.textContent = (job.index + 1) + '. ' + job.title;
      const p = document.createElement('span');
      p.className = 'job-pay';
      p.textContent = '$' + job.pay;
      const s = document.createElement('span');
      s.className = 'job-status';
      s.textContent = status;
      row.appendChild(t);
      row.appendChild(p);
      row.appendChild(s);
      row.addEventListener('click', () => {
        try {
          if (S.missions && typeof S.missions.start === 'function') {
            closeJobs();
            resume();
            S.missions.start(job.index);
          } else {
            toast('That job is not ready yet.');
          }
        } catch (e) { /* ignore a bad click */ }
      });
      list.appendChild(row);
    });
    panel.classList.remove('hidden');
  }

  function closeJobs() { hide('mission-select'); }
  function jobsOpen() {
    const p = el('mission-select');
    return !!(p && !p.classList.contains('hidden'));
  }

  function pause() {
    if (S.mode !== 'playing') return;
    S.mode = 'paused';
    // (added) The shop and garage panels sit centred on the same spot
    // as the pause menu — if one is still open when the game pauses
    // it paints over the menu and swallows its buttons, so the job
    // board can never be reached. Dismiss them with the pause.
    hide('shop-panel');
    hide('garage-panel');
    show('pause-menu');
  }

  function resume() {
    if (S.mode !== 'paused') return;
    S.mode = 'playing';
    hide('pause-menu');
    closeJobs();
  }

  function newGame() {
    try { localStorage.removeItem('solmar-save'); } catch (e) { /* storage may be unavailable */ }
    hide('menu');
    hide('pause-menu');
    closeJobs();
    // A fresh run starts with the intro flyover. Prefer the cutscene
    // module; fall back to raising the flag and showing the overlay.
    let started = false;
    try {
      const api = ctx.api;
      if (api && typeof api.playCutscene === 'function') { api.playCutscene('intro'); started = true; }
      else if (api && api.cutscene && typeof api.cutscene.play === 'function') { api.cutscene.play('intro'); started = true; }
      else if (api && typeof api.startCutscene === 'function') { api.startCutscene('intro'); started = true; }
    } catch (e) { started = false; }
    if (!started) {
      S.cutscene = true;
      S.mode = 'cutscene';
      const cut = el('cutscene');
      if (cut) cut.classList.remove('hidden');
    }
    if (S.mode === 'menu') S.mode = 'playing';
  }

  const btnNew = el('btn-new');
  if (btnNew) btnNew.addEventListener('click', newGame);
  const btnResume = el('btn-resume');
  if (btnResume) btnResume.addEventListener('click', resume);
  const btnMissions = el('btn-missions');
  if (btnMissions) btnMissions.addEventListener('click', openJobs);
  const btnClose = el('btn-close-jobs');
  if (btnClose) btnClose.addEventListener('click', closeJobs);

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code !== 'KeyP') return;
    if (S.mode === 'playing') pause();
    else if (S.mode === 'paused') {
      if (jobsOpen()) closeJobs();
      else resume();
    }
  });

  ctx.api.menu = { openJobs, closeJobs, jobsOpen, pause, resume, newGame };
  ctx.api.pauseGame = pause;
  ctx.api.resumeGame = resume;
}
