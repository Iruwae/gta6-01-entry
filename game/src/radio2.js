// SOLMAR BAY — radio: six stations, Q cycles them.
import { CONFIG } from './config.js';

export function init(ctx) {
  const S = ctx.state;
  const input = ctx.input;

  ctx.updates.push(() => {
    if (S.mode !== 'playing') return;
    if (input.wasPressed('KeyQ')) {
      S.radioStation = (S.radioStation + 1) % CONFIG.radio.length;
      const st = CONFIG.radio[S.radioStation];
      ctx.api.toast(`RADIO: ${st.name} — ${st.tagline}`);
    }
  });

  ctx.currentTrack = () => {
    const st = CONFIG.radio[S.radioStation];
    const idx = Math.floor(S.time / 45) % st.tracks.length;
    const track = st.tracks[idx];
    return `${track.title} — ${track.artist}`;
  };

  return {};
}

export default init;
