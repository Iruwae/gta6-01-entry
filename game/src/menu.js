// menu.js — pause + job board (round-5 rebuild, builder B2).
// KeyP toggles playing/paused and shows or hides the pause overlay.
// #btn-missions opens #mission-select with one .job-row per mission
// (clicking a row starts that job); #btn-close-jobs shuts it;
// #btn-resume returns to playing.
//
// NOTE (fixes, second pass):
// 1) Every element is looked up FRESH on each use and all button
//    clicks go through one delegated document listener. The pause
//    menu DOM can be rebuilt by the game, and listeners/refs captured
//    once at init end up attached to detached nodes.
// 2) Pausing hides every floating panel — shop, garage, dialogue,
//    toast. A panel left open from earlier play (the shop stays open
//    after buying) sits on top of the pause menu: clicks meant for
//    JOBS / RESUME land on a shop row instead, so the job board never
//    opens and resume never fires. Resume restores only an in-progress
//    conversation; shop/garage reopen with their own keys.

const OVERLAY_IDS = ['pause-overlay', 'pause-menu', 'pause-screen', 'pause-panel'];
const PANEL_IDS = ['shop-panel', 'garage-panel', 'dialogue', 'toast'];

function findOverlay() {
  for (const id of OVERLAY_IDS) {
    const el = document.getElementById(id);
    if (el) return el;
  }
  return null;
}

function hidePanels() {
  for (const id of PANEL_IDS) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  }
}

function restoreTopBars(S) {
  const d = S.dialogue;
  if (d && d.visible && d.lines && d.lines.length > 0) {
    const dlg = document.getElementById('dialogue');
    if (dlg) dlg.classList.remove('hidden');
  }
}

export function init(S) {
  function showOverlay() {
    const o = findOverlay();
    if (o) o.classList.remove('hidden');
  }
  function hideOverlay() {
    const o = findOverlay();
    if (o) o.classList.add('hidden');
  }

  function pause() {
    S.mode = 'paused';
    hidePanels();
    showOverlay();
  }
  function resume() {
    S.mode = 'playing';
    hideOverlay();
    const sp = document.getElementById('mission-select');
    if (sp) sp.classList.add('hidden');
    restoreTopBars(S);
  }

  function buildJobs() {
    const jobList = document.getElementById('mission-list');
    if (!jobList) return;
    jobList.innerHTML = '';
    const list = (S.missions && S.missions.list) || [];
    list.forEach((job, i) => {
      const row = document.createElement('div');
      row.className = 'job-row';
      row.dataset.index = String(i);
      const title = document.createElement('span');
      title.className = 'job-title';
      title.textContent = job.id.toUpperCase() + ' — ' + job.title;
      const pay = document.createElement('span');
      pay.className = 'job-reward';
      pay.textContent = '$' + job.reward;
      row.appendChild(title);
      row.appendChild(pay);
      jobList.appendChild(row);
    });
  }

  function openJobs() {
    hidePanels();
    buildJobs();
    const sp = document.getElementById('mission-select');
    if (sp) sp.classList.remove('hidden');
  }
  function closeJobs() {
    const sp = document.getElementById('mission-select');
    if (sp) sp.classList.add('hidden');
  }

  S.menu = { pause, resume, openJobs, closeJobs, buildJobs };

  // One delegated listener: survives the pause menu being rebuilt.
  document.addEventListener('click', (e) => {
    const t = e.target && e.target.closest
      ? e.target.closest('#btn-missions, #btn-close-jobs, #btn-resume, .job-row')
      : null;
    if (!t) return;
    if (t.id === 'btn-missions') openJobs();
    else if (t.id === 'btn-close-jobs') closeJobs();
    else if (t.id === 'btn-resume') resume();
    else if (t.classList.contains('job-row')) {
      const i = Number(t.dataset.index);
      if (S.missions && typeof S.missions.start === 'function') S.missions.start(i);
      closeJobs();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyP' || e.repeat) return;
    if (S.mode === 'paused') resume();
    else pause();
  });

  // Keep the board fresh so it is correct the moment it opens.
  buildJobs();

  return S.menu;
}

export default init;
