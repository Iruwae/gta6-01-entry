// SOLMAR BAY — respect.js
// RespectDirector: the champion entries have a respect meter, so Solmar
// Bay has one too — and it is real. Respect is earned by doing the
// work: jobs, races, fares, packages, crew kills. It is never bought
// and never spent. At each threshold the rank title changes, the HUD
// bar fills, and Vic or Lena says so. The rank is saved with the run,
// so a returning player keeps the name they earned.
//
// Ranks (respect points):
//   0     WHEELMAN        — the new kid with a stolen sedan
//   150   STREET HUSTLER  — the bay is starting to notice
//   350   SHOT CALLER     — crews take your calls now
//   600   BAY BOSS        — the harbor answers to you
//   900   KING OF THE BAY — the name on every wall in Solmar
//
// Sources (points): job complete 50 + 15 per job index, race win 40,
// taxi fare 15, package 5, crew kill 10, fence sale 20, heat shed at a
// hideout 10. The bar in the stats panel is driven by hud.js, which
// reads S.respect and S.respectRank.

import { S, saveGame } from './state.js';

export const RESPECT_RANKS = [
  { at: 0, title: 'WHEELMAN' },
  { at: 150, title: 'STREET HUSTLER' },
  { at: 350, title: 'SHOT CALLER' },
  { at: 600, title: 'BAY BOSS' },
  { at: 900, title: 'KING OF THE BAY' },
];

export const RESPECT_MAX = 1000;

export function rankFor(points) {
  let rank = RESPECT_RANKS[0];
  for (const r of RESPECT_RANKS) if (points >= r.at) rank = r;
  return rank;
}

export function nextRankFor(points) {
  for (const r of RESPECT_RANKS) if (points < r.at) return r;
  return null;
}

export class RespectDirector {
  constructor() {
    this._lastRank = null;
  }

  get points() {
    return (S && typeof S.respect === 'number') ? S.respect : 0;
  }

  get rank() {
    return rankFor(this.points);
  }

  get next() {
    return nextRankFor(this.points);
  }

  // Earn respect. `why` is the toast suffix, e.g. 'Job 5 done'.
  add(n, why) {
    if (!S) return;
    const before = this.points;
    S.respect = Math.min(RESPECT_MAX, before + n);
    const afterRank = rankFor(S.respect);
    const beforeRank = rankFor(before);
    if (afterRank.at !== beforeRank.at) {
      if (S.hud && typeof S.hud.toast === 'function') {
        S.hud.toast('RESPECT UP — you are now ' + afterRank.title + ' (' + S.respect + '/' + RESPECT_MAX + ').');
      }
      if (S.audio && typeof S.audio.jingle === 'function') S.audio.jingle();
      if (S.banterDirector) S.banterDirector.rankUp();
    } else if (why && S.hud && typeof S.hud.toast === 'function') {
      S.hud.toast('+' + n + ' respect — ' + why + ' (' + S.respect + '/' + RESPECT_MAX + ').');
    }
    saveGame();
  }

  // Called by the systems that hand out respect, so the numbers live
  // in one place and the HUD never has to know the price list.
  jobDone(i) { this.add(50 + 15 * i, 'Job ' + (i + 1) + ' done'); }
  raceWon() { this.add(40, 'Street race won'); }
  fareDone() { this.add(15, 'Taxi fare delivered'); }
  packageFound() { this.add(5, 'Package found'); }
  crewKill() { this.add(10, 'Lena dropped one'); }
  fenceSale() { this.add(20, 'Fence sale'); }
  hideoutUsed() { this.add(10, 'Laid low at a hideout'); }

  reset() {
    this._lastRank = null;
  }
}
