// challenges.js — the daily board in Solmar Bay.
//
// Three rows, refreshed every day in spirit: collect three packages,
// win one street race, finish one taxi fare. Each one pays out exactly
// once, the moment its counter reaches the target, and the payout is
// tracked in _paid so a second look never double-pays.

const TODAY = [
  { id: 'daily-packages', text: 'Collect 3 packages', stat: 'packages', target: 3, reward: 100 },
  { id: 'daily-race', text: 'Win 1 street race', stat: 'racesWon', target: 1, reward: 150 },
  { id: 'daily-taxi', text: 'Finish 1 taxi fare', stat: 'faresDone', target: 1, reward: 120 },
];

function showToast(ctx, msg) {
  const api = ctx.api || {};
  if (typeof api.toast === 'function') {
    try { api.toast(msg); return; } catch (e) { /* fall through */ }
  }
  const el = (ctx.dom && ctx.dom.toast) ||
    (typeof document !== 'undefined' ? document.getElementById('toast') : null);
  if (el) el.textContent = msg;
}

export function init(ctx) {
  const S = ctx.state;
  if (!S.stats) S.stats = { packages: 0, racesWon: 0, fencesSold: 0, faresDone: 0 };
  for (const k of ['packages', 'racesWon', 'fencesSold', 'faresDone']) {
    if (typeof S.stats[k] !== 'number') S.stats[k] = 0;
  }

  const director = {
    today: TODAY.map((c) => ({ id: c.id, text: c.text, stat: c.stat, target: c.target, reward: c.reward })),
    _paid: [],
    rows() {
      return this.today.map((c) => ({
        id: c.id,
        text: c.text,
        reward: c.reward,
        target: c.target,
        stat: c.stat,
        done: (S.stats[c.stat] || 0) >= c.target,
        paid: this._paid.includes(c.id),
      }));
    },
  };
  S.challengesDirector = director;

  ctx.updates.push((dt, t) => {
    for (const c of director.today) {
      if (director._paid.includes(c.id)) continue;
      if ((S.stats[c.stat] || 0) >= c.target) {
        director._paid.push(c.id);
        S.cash = (S.cash || 0) + c.reward;
        showToast(ctx, 'DAILY DONE — ' + c.text + ' +$' + c.reward);
      }
    }
  });

  ctx.api.challenges = director;
}
