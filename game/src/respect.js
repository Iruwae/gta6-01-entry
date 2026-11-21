// SOLMAR BAY — respect ranks. The ladder (NOBODY 0, SMALL-TIME 50,
// STREET HUSTLER 150, CREW LEADER 400, BAY BOSS 800, BAY LEGEND 1500)
// is driven by respectDirector.add; this module exposes the rank lookup
// so the HUD and the job board always read the same title.
import { CONFIG } from './config.js';

export function rankFor(points) {
  let rank = CONFIG.respectLadder[0];
  for (const row of CONFIG.respectLadder) {
    if (points >= row.min) rank = row;
  }
  return rank;
}

export function init(ctx) {
  ctx.api.respectRankFor = rankFor;
}
