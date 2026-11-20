// respect.js — the respect ladder of Solmar Bay.
// From NOBODY to bay legend, one job at a time.
// Written fresh for round 7 from the shared spec; no repo code was read.

const LADDER = [
  { at: 0, title: 'NOBODY' },
  { at: 100, title: 'STREET HUSTLER' },
  { at: 300, title: 'BAY RUNNER' },
  { at: 600, title: 'CREW BOSS' },
  { at: 1000, title: "VIC'S RIGHT HAND" },
  { at: 1500, title: 'BAY LEGEND' },
];

function dom(ctx, id) {
  if (ctx.dom && ctx.dom[id]) return ctx.dom[id];
  if (typeof document !== 'undefined') return document.getElementById(id);
  return null;
}

function rankFor(points) {
  let best = LADDER[0];
  for (const rung of LADDER) if (points >= rung.at) best = rung;
  return best;
}

export function init(ctx) {
  const S = ctx.state;
  if (typeof S.respect !== 'number') S.respect = 0;

  const rank = { title: rankFor(S.respect).title, level: LADDER.indexOf(rankFor(S.respect)) };

  function refreshHud() {
    const num = dom(ctx, 'respect-num');
    if (num) num.textContent = String(S.respect);
    const rankEl = dom(ctx, 'respect-rank');
    if (rankEl) rankEl.textContent = rank.title;
    // Never write textContent onto #respect-line itself: it is the
    // container of the two spans above, and replacing its text would
    // wipe them out of the DOM on every frame.
  }

  function add(n, why) {
    const before = rank.title;
    S.respect = Math.max(0, S.respect + n);
    const now = rankFor(S.respect);
    rank.title = now.title;
    rank.level = LADDER.indexOf(now);
    refreshHud();
    if (now.title !== before) {
      const toast = dom(ctx, 'toast');
      if (toast) toast.textContent = 'Respect up — you are now ' + now.title + (why ? ' (' + why + ')' : '') + '.';
    }
    return rank.title;
  }

  S.respectDirector = { rank, add, ladder: LADDER, rankFor };
  ctx.api.respect = S.respectDirector;

  refreshHud();
  ctx.updates.push(() => { refreshHud(); });
}
