// Respect ranks for SOLMAR BAY. The ladder lives in config.js and the
// respectDirector in state.js drives it; this module keeps the rank
// title in step with the points.
import { CONFIG } from './config.js';

export function init(ctx) {
  const { state: S } = ctx;
  ctx.api.respectRank = () => {
    let rank = CONFIG.respectLadder[0];
    for (const r of CONFIG.respectLadder) {
      if (S.respect >= r.min) rank = r;
    }
    return rank;
  };
  ctx.updates.push(() => {
    S.respectDirector.rank = ctx.api.respectRank();
  });
}
