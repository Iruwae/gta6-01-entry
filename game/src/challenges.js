// challenges.js — the daily board (round-5 rebuild, builder B2).
// S.challengesDirector = { today, rows(), _paid }.
// Three jobs refresh per session: collect packages, win a street
// race, run a taxi fare. rows() feeds the board UI; update() pays
// each challenge exactly once, the moment its stat reaches target.

const DAILY_JOBS = [
  { id: 'daily-packages', stat: 'packages', target: 3, reward: 100, label: 'Collect 3 packages' },
  { id: 'daily-race', stat: 'racesWon', target: 1, reward: 150, label: 'Win 1 street race' },
  { id: 'daily-taxi', stat: 'faresDone', target: 1, reward: 120, label: 'Finish 1 taxi fare' },
];

export function init(S) {
  if (!S.stats) S.stats = {};

  const director = {
    today: DAILY_JOBS.map((j) => ({ ...j })),
    _paid: new Set(),

    rows() {
      return director.today.map((c) => ({
        text: c.label + ' — $' + c.reward,
        reward: c.reward,
      }));
    },

    update(dt) {
      if (S.mode === 'paused') return;
      for (const c of director.today) {
        if (director._paid.has(c.id)) continue;
        if ((S.stats[c.stat] || 0) >= c.target) {
          director._paid.add(c.id);
          S.cash = (S.cash || 0) + c.reward;
          const toast = document.getElementById('toast');
          if (toast) {
            toast.textContent = 'Challenge done: ' + c.label + ' +$' + c.reward;
            toast.classList.remove('hidden');
          }
        }
      }
    },
  };

  S.challengesDirector = director;

  // Render into the board if the page has one.
  const board = document.getElementById('challenges-list');
  if (board) {
    board.innerHTML = '';
    for (const row of director.rows()) {
      const el = document.createElement('div');
      el.className = 'challenge-row';
      el.textContent = row.text;
      board.appendChild(el);
    }
  }

  setInterval(() => {
    try { director.update(0.4); } catch (e) { /* never break the page */ }
  }, 400);
  if (Array.isArray(S._moduleTicks)) S._moduleTicks.push((dt) => director.update(dt));

  return director;
}

export default init;
