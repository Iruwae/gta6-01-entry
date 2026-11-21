// SOLMAR BAY — daily challenges board. The three rows live in the
// challengesDirector (state.js): each pays exactly once the moment its
// stat reaches target. This module owns the day rollover: when the
// in-game day changes, the board refreshes and nothing stays paid.
import { CONFIG } from './config.js';

export function init(ctx) {
  const { state: S } = ctx;
  ctx.updates.push(() => {
    const d = S.challengesDirector;
    if (d._day !== S.day) {
      d._day = S.day;
      d.today = CONFIG.challenges.map((c) => ({ ...c }));
      d._paid = [];
    }
  });
}
