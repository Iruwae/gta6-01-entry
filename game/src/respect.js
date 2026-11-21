// SOLMAR BAY — respect ranks: the ladder from NOBODY to BAY LEGEND,
// driven by respectDirector.add.
import { CONFIG } from './config.js';

export function init(ctx) {
  const { state: S } = ctx;
  ctx.api.respectLadder = () => CONFIG.respectLadder;
  ctx.api.respectRank = () => S.respectDirector.rank;
  ctx.updates.push(() => {
    // Keep the rank in sync even if respect was set directly.
    let rank = CONFIG.respectLadder[0];
    for (const r of CONFIG.respectLadder) {
      if (S.respect >= r.min) rank = r;
    }
    S.respectDirector.rank = rank;
  });
  ctx.respectReady = true;
}
