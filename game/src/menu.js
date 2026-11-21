// menu.js — SOLMAR BAY start screen, pause menu and job board.
// P toggles pause. The job board lists all ten story jobs; picking one
// starts it through the missions system and drops back into the game.
export function init(ctx) {
  const S = ctx.state || ctx.S;
  const dom = ctx.dom || {};
  const $ = (id) => dom[id] || document.getElementById(id);

  const JOBS = [
    { id: 'm1', title: 'First Wheels' },
    { id: 'm2', title: 'Sunset Pickup' },
    { id: 'm3', title: 'Harbor Lights' },
    { id: 'm4', title: 'Strip Run' },
    { id: 'm5', title: 'Crew Up' },
    { id: 'm6', title: 'Uptown Heat' },
    { id: 'm7', title: 'Beachfront Score' },
    { id: 'm8', title: 'The Long Night' },
    { id: 'm9', title: 'Bay Legend Rising' },
    { id: 'm10', title: 'King of Solmar Bay' },
  ];

  function show(el) { if (el) el.classList.remove('hidden'); }
  function hide(el) { if (el) el.classList.add('hidden'); }
  function toast(msg) {
    if (ctx.api && ctx.api.toast) ctx.api.toast(msg);
    else { const el = $('toast'); if (el) el.textContent = msg; }
  }

  function jobDefs() {
    if (S.missions && Array.isArray(S.missions.list) && S.missions.list.length) return S.missions.list;
    if (S.missions && Array.isArray(S.missions.defs) && S.missions.defs.length) return S.missions.defs;
    if (ctx.api && typeof ctx.api.missionList === 'function') {
      try { const l = ctx.api.missionList(); if (Array.isArray(l) && l.length) return l; } catch (e) { /* fall through */ }
    }
    return JOBS;
  }

  function buildJobs() {
    const list = $('mission-list');
    if (!list) return;
    list.innerHTML = '';
    const defs = jobDefs();
    const next = S.missionIndex || 0;
    defs.forEach((job, i) => {
      const row = document.createElement('div');
      row.className = 'job-row';
      const status = i < next ? 'DONE' : i === next ? 'AVAILABLE' : 'LOCKED';
      const title = job.title || job.name || ('Job ' + (i + 1));
      row.textContent = (i + 1) + '. ' + title + ' — ' + status;
      row.addEventListener('click', () => {
        if (S.missions && typeof S.missions.start === 'function') {
          hide($('mission-select'));
          hide($('pause-menu'));
          S.mode = 'playing';
          S.missions.start(i);
        } else {
          toast('Jobs open once the story is ready.');
        }
      });
      list.appendChild(row);
    });
  }

  function pauseGame() {
    if (S.mode !== 'playing') return;
    S.mode = 'paused';
    show($('pause-menu'));
  }

  function resumeGame() {
    S.mode = 'playing';
    hide($('pause-menu'));
    hide($('mission-select'));
  }

  function openJobs() {
    buildJobs();
    show($('mission-select'));
  }

  function closeJobs() {
    hide($('mission-select'));
  }

  function startNewGame() {
    hide($('menu'));
    S.mode = 'playing';
    if (ctx.api && ctx.api.cutscene && typeof ctx.api.cutscene.playIntro === 'function') {
      ctx.api.cutscene.playIntro();
    } else {
      S.cutscene = true;
    }
  }

  const btnNew = $('btn-new');
  if (btnNew) btnNew.addEventListener('click', startNewGame);
  const btnResume = $('btn-resume');
  if (btnResume) btnResume.addEventListener('click', resumeGame);
  const btnMissions = $('btn-missions');
  if (btnMissions) btnMissions.addEventListener('click', openJobs);
  const btnCloseJobs = $('btn-close-jobs');
  if (btnCloseJobs) btnCloseJobs.addEventListener('click', closeJobs);

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code !== 'KeyP') return;
    if (S.mode === 'playing') pauseGame();
    else if (S.mode === 'paused') resumeGame();
  });

  // Show the start screen while the game is waiting at the menu.
  if (!S.mode || S.mode === 'menu') {
    S.mode = 'menu';
    show($('menu'));
  }

  ctx.api = ctx.api || {};
  ctx.api.menu = { pause: pauseGame, resume: resumeGame, openJobs, closeJobs, startNewGame, buildJobs };
  S.menuDirector = ctx.api.menu;
}
