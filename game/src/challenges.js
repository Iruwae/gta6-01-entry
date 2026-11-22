// SOLMAR BAY — daily challenges board. The three rows (collect 3
// packages, win 1 street race, finish 1 taxi fare) each pay exactly once
// the moment their stat reaches target, via the challengesDirector in
// state.js. The boot hub ticks it every frame.
export function init(ctx) {
  const S = ctx.state;
  ctx.api.challengeRows = () => S.challengesDirector.rows();
  ctx.flags.challenges = true;
}
