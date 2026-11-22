// SOLMAR BAY — respect ranks. The ladder (NOBODY at 0, SMALL-TIME at
// 50, STREET HUSTLER at 150, CREW LEADER at 400, BAY BOSS at 800, BAY
// LEGEND at 1500) is driven by respectDirector.add; this module keeps
// the HUD rank line honest even if the director is swapped.
import { CONFIG } from './config.js';

export function rankFor(points) {
  let rank = CONFIG.respectLadder[0];
  for (const entry of CONFIG.respectLadder) {
    if (points >= entry.min) rank = entry;
  }
  return rank;
}

export function init(ctx) {
  const S = ctx.state;
  ctx.updates.push(() => {
    if (S.respectDirector) {
      S.respectDirector.rank = rankFor(S.respect);
    }
  });
  ctx.flags.respect = true;
}
