// SOLMAR BAY — daily challenges board: the three rows, each paying exactly
// once the moment its stat reaches target (via challengesDirector).
export function init(ctx) {
  const { state: S } = ctx;
  ctx.updates.push(() => {
    S.challengesDirector.tick();
  });
  ctx.api.challengesLoaded = true;
}

export default { init };
