// Daily challenges board — the three rows, each paying exactly once the
// moment its stat reaches target (via the challengesDirector in state.js,
// ticked by the boot hub each frame).
export function init(ctx) {
  ctx.challenges = { rows: () => ctx.state.challengesDirector.rows() };
}
