// SOLMAR BAY — daily challenges board: three rows, each paying exactly
// once the moment its stat reaches target (via challengesDirector.tick,
// which the boot hub calls every frame while playing).
export function init(ctx) {
  const { state: S } = ctx;
  ctx.api.challenges = () => S.challengesDirector.rows();
  ctx.updates.push(() => {
    // The boot hub already ticks the director; this is a safety net so a
    // payout can never be missed if the hub's call is ever skipped.
    if (S.mode === 'playing') S.challengesDirector.tick();
  });
  ctx.challengesReady = true;
}
