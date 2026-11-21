// SOLMAR BAY — six radio stations, Q cycles them. S.radioStation is a
// NUMBER index; the station NAME is what the HUD radio element shows.
import { CONFIG } from './config.js';

export function init(ctx) {
  const { state: S, input } = ctx;
  ctx.updates.push(() => {
    if (S.mode !== 'playing') return;
    if (input.wasPressed('KeyQ')) {
      S.radioStation = (S.radioStation + 1) % CONFIG.radio.length;
      const st = CONFIG.radio[S.radioStation];
      ctx.api.toast(`${st.name} — ${st.tag}`);
    }
  });
  ctx.radioReady = true;
}
