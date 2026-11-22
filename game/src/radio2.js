// Radio: six stations, Q cycles them. S.radioStation is a NUMBER index;
// the station NAME is what the HUD radio element shows.
export function init(ctx) {
  const { state: S, input } = ctx;
  ctx.updates.push(() => {
    if (input.wasPressed('KeyQ')) {
      S.radioStation = (S.radioStation + 1) % 6;
      const st = ctx.config.radio[S.radioStation];
      ctx.api.toast(`Radio: ${st.name} — ${st.tagline}`);
    }
  });
}
