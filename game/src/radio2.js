// SOLMAR BAY — radio. Six stations, Q cycles them. S.radioStation is a
// NUMBER index; the station NAME is what the HUD radio element shows.
// First station is the sunset station, SUNSET 88.5.
import { CONFIG } from './config.js';

export function init(ctx) {
  const S = ctx.state;
  const { input } = ctx;
  const toast = (m) => ctx.api.toast && ctx.api.toast(m);

  ctx.updates.push(() => {
    if (S.mode !== 'playing') return;
    if (input.justPressed('KeyQ')) {
      S.radioStation = (S.radioStation + 1) % CONFIG.radio.length;
      const st = CONFIG.radio[S.radioStation];
      toast(`${st.name} — ${st.tagline}`);
    }
  });

  ctx.api.station = () => CONFIG.radio[S.radioStation];
  ctx.flags.radio2 = true;
}
