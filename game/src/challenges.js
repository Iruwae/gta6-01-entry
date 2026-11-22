// Daily challenges board — the three rows, each paying exactly once the
// moment its stat reaches target (via the challengesDirector in state.js).
export function init(ctx) {
  const { state: S } = ctx;
  ctx.updates.push(() => {
    if (S.mode !== 'playing') return;
    S.challengesDirector.tick();
  });
}

export default init;
