// respect.js — SOLMAR BAY respect ranks.
// Respect starts at NOBODY. Adding points climbs the ladder; 200 points
// from zero lands on STREET HUSTLER. The HUD reads rank.title.
export function init(ctx) {
  const S = ctx.state || ctx.S;

  const RANKS = [
    { min: 0, title: 'NOBODY' },
    { min: 100, title: 'STREET HUSTLER' },
    { min: 300, title: 'BAY RUNNER' },
    { min: 600, title: 'CREW LEADER' },
    { min: 1000, title: 'BAY LEGEND' },
  ];

  function rankFor(points) {
    let found = RANKS[0];
    for (const r of RANKS) {
      if (points >= r.min) found = r;
    }
    return found;
  }

  if (typeof S.respect !== 'number') S.respect = 0;

  const director = {
    ranks: RANKS,
    rank: rankFor(S.respect),
    title() { return this.rank.title; },
    add(n, why) {
      S.respect = Math.max(0, (S.respect || 0) + (n || 0));
      this.rank = rankFor(S.respect);
      if (why && ctx.api && ctx.api.toast) {
        ctx.api.toast('Respect +' + n + ' — ' + why, 3000);
      }
    },
  };

  S.respectDirector = director;
  ctx.api = ctx.api || {};
  ctx.api.respect = director;
}
