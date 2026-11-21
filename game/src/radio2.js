// SOLMAR BAY — radio. Six stations, Q cycles them. S.radioStation is a
// NUMBER index; the station NAME is what the HUD radio element shows.
// First station is the sunset station.
export function init(ctx) {
  const { state: S, input, config, api } = ctx;
  ctx.updates.push(() => {
    if (S.mode !== 'playing') return;
    if (input.wasPressed('KeyQ')) {
      S.radioStation = (S.radioStation + 1) % config.radioStations.length;
      const st = config.radioStations[S.radioStation];
      api.toast(`Radio: ${st.name} — ${st.tagline}`);
    }
  });
  ctx.api.radioLoaded = true;
}

export default { init };
