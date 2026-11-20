// respect.js — street reputation (round-5 rebuild, builder B2).
// S.respectDirector = { rank: { title }, add(n, why) }.
// Ranks climb with S.respect: NOBODY under 100, STREET HUSTLER to
// 299, WHEELMAN to 599, KINGPIN to 999, SOLMAR LEGEND at 1000+.
// The rank is a live getter, so it can never go stale — the HUD reads
// the same title this module computes.

const RANKS = [
  { min: 1000, title: 'SOLMAR LEGEND' },
  { min: 600, title: 'KINGPIN' },
  { min: 300, title: 'WHEELMAN' },
  { min: 100, title: 'STREET HUSTLER' },
  { min: 0, title: 'NOBODY' },
];

export function titleFor(points) {
  const p = points || 0;
  for (const r of RANKS) {
    if (p >= r.min) return r.title;
  }
  return 'NOBODY';
}

export function init(S) {
  if (typeof S.respect !== 'number') S.respect = 0;

  const director = {
    get rank() {
      return { title: titleFor(S.respect || 0) };
    },

    add(n, why) {
      S.respect = (S.respect || 0) + n;
      const toast = document.getElementById('toast');
      if (toast && n > 0) {
        toast.textContent = '+' + n + ' respect' + (why ? ' — ' + why : '') + ' (' + titleFor(S.respect) + ')';
        toast.classList.remove('hidden');
      }
      return S.respect;
    },
  };

  S.respectDirector = director;
  return director;
}

export default init;
