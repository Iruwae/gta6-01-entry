// SOLMAR BAY — daily challenges board. The three rows each pay exactly
// once the moment their stat reaches target (via the challengesDirector
// in state.js, ticked by the boot hub every frame).
export function init(ctx) {
  const { state: S, api } = ctx;
  ctx.api.challenges = {
    rows: () => S.challengesDirector.rows(),
    tick: () => S.challengesDirector.tick(),
  };
}
