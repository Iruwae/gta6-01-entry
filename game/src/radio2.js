// Radio: six stations, Q cycles them. S.radioStation is a NUMBER index;
// the station NAME is what the HUD radio element shows.
import { CONFIG } from './config.js';

export function init(ctx) {
  const { state: S, input } = ctx;
  ctx.updates.push(() => {
    if (S.mode !== 'playing') return;
    if (input.wasPressed('KeyQ')) {
      S.radioStation = (S.radioStation + 1) % CONFIG.radio.length;
      const station = CONFIG.radio[S.radioStation];
      if (ctx.api.toast) ctx.api.toast(`${station.name} — ${station.tagline}`);
    }
  });
}

export default init;
