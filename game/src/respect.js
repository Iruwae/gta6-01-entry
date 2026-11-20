// SOLMAR BAY — respect.js (round 8 rebuild, written blind from the spec)
// Respect points and ranks: NOBODY, STREET HUSTLER, CREW LEADER,
// BAY BOSS, BAY LEGEND. Adding points updates the rank and the HUD.
// Talks to the game only through ctx.
export function init(ctx) {
  const S = ctx.state || ctx.S;
  const dom = ctx.dom || {};

  const $ = (id) => dom[id] || document.getElementById(id);

  const RANKS = [
    { min: 0, title: 'NOBODY' },
    { min: 100, title: 'STREET HUSTLER' },
    { min: 400, title: 'CREW LEADER' },
    { min: 900, title: 'BAY BOSS' },
    { min: 1800, title: 'BAY LEGEND' },
  ];

  function rankFor(points) {
    let rank = RANKS[0];
    for (const r of RANKS) if (points >= r.min) rank = r;
    return rank;
  }

  function refreshHud() {
    const num = $('respect-num');
    const rankEl = $('respect-rank');
    if (num) num.textContent = String(S.respect || 0);
    if (rankEl && S.respectDirector) rankEl.textContent = S.respectDirector.rank.title;
  }

  if (typeof S.respect !== 'number') S.respect = 0;

  const director = {
    rank: { title: rankFor(S.respect).title },
    add(n, reason) {
      S.respect = Math.max(0, (S.respect || 0) + n);
      this.rank.title = rankFor(S.respect).title;
      refreshHud();
      return S.respect;
    },
  };
  S.respectDirector = director;
  director.rank.title = rankFor(S.respect).title;

  ctx.updates.push(() => {
    // Keep the HUD in step even if respect changed somewhere else.
    const num = $('respect-num');
    if (num && num.textContent !== String(S.respect || 0)) refreshHud();
  });
}
