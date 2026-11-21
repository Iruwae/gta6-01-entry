// SOLMAR BAY — daily challenges board: pay out once the moment a stat lands.
export function init(ctx) {
  const S = ctx.state;

  ctx.updates.push(() => {
    if (S.mode !== 'playing') return;
    S.challengesDirector.tick();
  });

  ctx.challengeRows = () => S.challengesDirector.rows();

  return {};
}

export default init;
