// Radio for SOLMAR BAY: six stations, Q cycles them. S.radioStation
// is a NUMBER index; the station NAME is what the HUD radio element
// shows. The first station is the sunset station.
import { CONFIG } from './config.js';

export function init(ctx) {
  const { state: S, input, api } = ctx;

  ctx.updates.push(() => {
    if (S.mode !== 'playing') return;
    if (input.wasPressed('KeyQ')) {
      S.radioStation = (S.radioStation + 1) % CONFIG.radio.length;
      const station = CONFIG.radio[S.radioStation];
      api.toast(`${station.name} — ${station.desc}`);
      if (api.audio) api.audio.station();
    }
  });
}
