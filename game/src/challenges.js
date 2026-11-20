// challenges.js — the daily challenge board of Solmar Bay.
// Three rows, one payout each, and each pays out exactly once.
// Written fresh for round 7 from the shared spec; no repo code was read.

const BOARD = [
  { id: 'ch-packages', text: 'Collect 3 packages', reward: 100, stat: 'packages', target: 3 },
  { id: 'ch-race', text: 'Win 1 street race', reward: 150, stat: 'racesWon', target: 1 },
  { id: 'ch-taxi', text: 'Finish 1 taxi fare', reward: 120, stat: 'faresDone', target: 1 },
];

function dom(ctx, id) {
  if (ctx.dom && ctx.dom[id]) return ctx.dom[id];
  if (typeof document !== 'undefined') return document.getElementById(id);
  return null;
}

export function init(ctx) {
  const S = ctx.state;
  if (!S.stats) S.stats = { packages: 0, racesWon: 0, fencesSold: 0, faresDone: 0 };
  for (const k of ['packages', 'racesWon', 'fencesSold', 'faresDone']) {
    if (typeof S.stats[k] !== 'number') S.stats[k] = 0;
  }
  if (typeof S.cash !== 'number') S.cash = 120;

  const today = BOARD.map((c) => ({ ...c }));

  function rows() {
    return today.map((c) => ({
      id: c.id,
      text: c.text,
      reward: c.reward,
      stat: c.stat,
      target: c.target,
      progress: Math.min(S.stats[c.stat] || 0, c.target),
      done: (S.stats[c.stat] || 0) >= c.target,
      paid: S.challengesDirector._paid.includes(c.id),
    }));
  }

  const director = {
    today,
    _paid: [],
    rows,
    check() {
      for (const c of today) {
        if (director._paid.includes(c.id)) continue;
        if ((S.stats[c.stat] || 0) >= c.target) {
          director._paid.push(c.id);
          S.cash += c.reward;
          const toast = dom(ctx, 'toast');
          if (toast) toast.textContent = 'Challenge complete: ' + c.text + ' — $' + c.reward + '.';
        }
      }
    },
  };
  S.challengesDirector = director;
  ctx.api.challenges = director;

  ctx.updates.push(() => { director.check(); });
}
