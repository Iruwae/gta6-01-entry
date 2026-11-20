// respect.js — the reputation ladder of Solmar Bay.
//
// Vic starts as a NOBODY. Respect comes in from jobs, races and
// anything else that makes the bay talk, and every rung changes the
// rank title on the HUD. Two hundred points from zero puts him on the
// first real rung: STREET HUSTLER. The top of the ladder is BAY LEGEND.

const LADDER = [
  { min: 0, title: 'NOBODY' },
  { min: 200, title: 'STREET HUSTLER' },
  { min: 450, title: 'CORNER KING' },
  { min: 800, title: 'BLOCK CAPTAIN' },
  { min: 1300, title: 'BAY RUNNER' },
  { min: 2000, title: 'CREW LEADER' },
  { min: 3200, title: 'UNDERBOSS' },
  { min: 5000, title: 'BAY LEGEND' },
];

function el(ctx, id) {
  return (ctx.dom && ctx.dom[id]) ||
    (typeof document !== 'undefined' ? document.getElementById(id) : null);
}

function showToast(ctx, msg) {
  const api = ctx.api || {};
  if (typeof api.toast === 'function') {
    try { api.toast(msg); return; } catch (e) { /* fall through */ }
  }
  const box = el(ctx, 'toast');
  if (box) box.textContent = msg;
}

export function init(ctx) {
  const S = ctx.state;
  if (typeof S.respect !== 'number') S.respect = 0;

  function rankFor(pts) {
    let cur = LADDER[0];
    for (const r of LADDER) if (pts >= r.min) cur = r;
    return cur;
  }

  const rank = { title: rankFor(S.respect).title, min: rankFor(S.respect).min };

  function refreshHud() {
    const numEl = el(ctx, 'respect-num');
    if (numEl && numEl.textContent !== String(S.respect)) numEl.textContent = String(S.respect);
    const rankEl = el(ctx, 'respect-rank');
    if (rankEl && rankEl.textContent !== rank.title) rankEl.textContent = rank.title;
  }

  const director = {
    rank,
    ladder: LADDER.map((r) => ({ min: r.min, title: r.title })),
    add(n, reason) {
      S.respect = Math.max(0, (S.respect || 0) + n);
      const next = rankFor(S.respect);
      rank.title = next.title;
      rank.min = next.min;
      refreshHud();
      if (n > 0) showToast(ctx, 'RESPECT +' + n + ' — ' + rank.title);
      return S.respect;
    },
  };
  S.respectDirector = director;

  ctx.updates.push((dt, t) => {
    refreshHud();
  });

  ctx.api.respect = director;
}
