// SOLMAR BAY — challenges.js (round 8 rebuild, written blind from the spec)
// Daily challenges: three rows on the board, each paying out once
// when its target is met. Talks to the game only through ctx.
export function init(ctx) {
  const S = ctx.state || ctx.S;
  const dom = ctx.dom || {};

  const $ = (id) => dom[id] || document.getElementById(id);

  const DEFS = [
    { id: 'ch-packages', text: 'Collect 3 packages', stat: 'packages', target: 3, reward: 100 },
    { id: 'ch-race', text: 'Win 1 street race', stat: 'racesWon', target: 1, reward: 150 },
    { id: 'ch-taxi', text: 'Finish 1 taxi fare', stat: 'faresDone', target: 1, reward: 120 },
  ];

  const director = {
    today: DEFS.map((d) => ({ ...d })),
    _paid: [],
    rows() {
      return this.today.map((c) => ({
        id: c.id,
        text: c.text,
        reward: c.reward,
        stat: c.stat,
        target: c.target,
        progress: S.stats[c.stat] || 0,
        done: (S.stats[c.stat] || 0) >= c.target,
        paid: this._paid.includes(c.id),
      }));
    },
  };
  S.challengesDirector = director;
  // The state fallback calls challengesDirector.tick() once a frame;
  // this director replaced the state's one without a tick, so the
  // fallback threw every frame. Pay out here too — the _paid list
  // makes it idempotent with the per-frame check below.
  director.tick = function () {
    for (const c of director.today) {
      if (director._paid.includes(c.id)) continue;
      if ((S.stats[c.stat] || 0) >= c.target) {
        director._paid.push(c.id);
        S.cash += c.reward;
      }
    }
  };

  function toast(msg) {
    const el = $('toast');
    if (el) el.textContent = msg;
  }

  ctx.updates.push(() => {
    if (S.mode && S.mode !== 'playing') return;
    for (const c of director.today) {
      if (director._paid.includes(c.id)) continue;
      if ((S.stats[c.stat] || 0) >= c.target) {
        director._paid.push(c.id);
        S.cash += c.reward;
        toast('Challenge complete: ' + c.text + ' — +$' + c.reward + '.');
      }
    }
  });
}
