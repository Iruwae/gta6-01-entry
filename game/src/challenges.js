// challenges.js — SOLMAR BAY daily challenges.
// Three rows on the board. Each pays out exactly once, the moment its
// stat reaches its target: 3 packages pay $100, 1 street race win pays
// $150, 1 finished taxi fare pays $120.
export function init(ctx) {
  const S = ctx.state || ctx.S;

  const TODAY = [
    { id: 'daily-packages', stat: 'packages', target: 3, reward: 100, text: 'Collect 3 packages' },
    { id: 'daily-race', stat: 'racesWon', target: 1, reward: 150, text: 'Win 1 street race' },
    { id: 'daily-fare', stat: 'faresDone', target: 1, reward: 120, text: 'Complete 1 taxi fare' },
  ];

  function toast(msg) {
    if (ctx.api && ctx.api.toast) ctx.api.toast(msg, 5000);
  }

  // One shared payout check: a row pays exactly once, the moment its
  // stat reaches its target. Both the frame update and the state's
  // per-frame tick call it, and the _paid list keeps it idempotent.
  function payDue() {
    if (!S.stats) return;
    for (const row of TODAY) {
      if (director._paid.includes(row.id)) continue;
      if ((S.stats[row.stat] || 0) < row.target) continue;
      director._paid.push(row.id);
      S.cash = (S.cash || 0) + row.reward;
      toast('Daily challenge complete: ' + row.text + ' +$' + row.reward);
      if (ctx.api && ctx.api.audio && typeof ctx.api.audio.cash === 'function') {
        try { ctx.api.audio.cash(); } catch (e) { /* quiet */ }
      }
    }
  }

  const director = {
    today: TODAY,
    _paid: [],
    tick: payDue,
    rows() {
      return TODAY.map((r) => ({
        id: r.id,
        text: r.text,
        reward: r.reward,
        target: r.target,
        stat: r.stat,
        done: (S.stats && (S.stats[r.stat] || 0)) >= r.target,
        paid: this._paid.includes(r.id),
      }));
    },
  };

  S.challengesDirector = director;
  ctx.api = ctx.api || {};
  ctx.api.challenges = director;

  ctx.updates = ctx.updates || [];
  ctx.updates.push(payDue);
}
