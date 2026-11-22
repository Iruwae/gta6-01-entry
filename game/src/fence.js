// SOLMAR BAY — Vic's fence yard at (110,138). The yard itself (walls
// and a gate, built by city.js) plus the quote logic through
// fenceDirector; the sale action itself lives in side.js (V to sell).
import { CONFIG } from './config.js';

export function init(ctx) {
  const S = ctx.state;
  ctx.api.fenceQuote = (car) =>
    S.fenceDirector.priceFor(car) + S.fenceDirector.wantedBonus(car);
  ctx.fenceYard = { ...CONFIG.locations.fenceYard };
  ctx.flags.fence = true;
}
