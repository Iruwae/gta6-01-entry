// SOLMAR BAY — respect ranks. The ladder lives in config; the
// respectDirector in state.js drives it (add() recomputes the rank).
import { CONFIG } from './config.js';

export function rankFor(points) {
  let rank = CONFIG.respectLadder[0];
  for (const r of CONFIG.respectLadder) {
    if (points >= r.min) rank = r;
  }
  return rank;
}

export function init(ctx) {
  const { state: S } = ctx;
  ctx.api.respect = {
    rankFor,
    add: (n, why) => S.respectDirector.add(n, why),
    rank: () => S.respectDirector.rank,
  };
}
