// The daily challenges board for SOLMAR BAY: three rows, each paying
// exactly once the moment its stat reaches target, via the
// challengesDirector in state.js.
export function init(ctx) {
  const { state: S } = ctx;
  // The director ships with the state; this module just makes sure it
  // is the one the board reads, and exposes its rows for any UI.
  ctx.api.challengeRows = () => S.challengesDirector.rows();
  ctx.updates.push(() => {
    S.challengesDirector.tick();
  });
}
