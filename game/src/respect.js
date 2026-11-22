// Respect ranks — the ladder from config, driven by respectDirector.add.
import { CONFIG } from './config.js';

export function rankFor(respect) {
  let rank = CONFIG.respectLadder[0];
  for (const r of CONFIG.respectLadder) {
    if (respect >= r.min) rank = r;
  }
  return { title: rank.title, min: rank.min };
}

export function init(ctx) {
  const { state: S } = ctx;
  // Keep the rank object honest even if respect was set directly.
  ctx.updates.push(() => {
    S.respectDirector.rank = rankFor(S.respect);
  });
}

export default init;
