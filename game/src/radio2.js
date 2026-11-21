// SOLMAR BAY — radio. Six stations, Q cycles them. S.radioStation is a
// NUMBER index; the station NAME is what the HUD radio element shows.
// First station is the sunset station.
import { CONFIG } from './config.js';

export function init(ctx) {
  const { state: S, input, api } = ctx;
  ctx.updates.push(() => {
    if (input.wasPressed('KeyQ') && S.mode === 'playing') {
      S.radioStation = (S.radioStation + 1) % CONFIG.radio.length;
      const st = CONFIG.radio[S.radioStation];
      api.toast(`${st.name} — ${st.tagline}`);
      if (ctx.api.audio) ctx.api.audio.blip();
    }
  });
}
