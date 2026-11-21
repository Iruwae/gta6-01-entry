// SOLMAR BAY — respect ranks: the ladder from NOBODY to BAY LEGEND.
import { CONFIG } from './config.js';

export function init(ctx) {
  const S = ctx.state;

  ctx.respectRankFor = (respect) => {
    let rank = CONFIG.respectLadder[0];
    for (const r of CONFIG.respectLadder) {
      if (respect >= r.min) rank = r;
    }
    return rank;
  };

  ctx.updates.push(() => {
    // Keep the director's rank in sync if respect changed outside add().
    const rank = ctx.respectRankFor(S.respect);
    S.respectDirector.rank = { title: rank.title, min: rank.min };
  });

  return {};
}

export default init;
