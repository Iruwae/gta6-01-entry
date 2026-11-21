// SOLMAR BAY — respect ranks: the ladder from config, driven by
// respectDirector.add. Announces rank-ups over the toast line.
export function init(ctx) {
  const { state: S, config, api } = ctx;
  const director = S.respectDirector;
  const origAdd = director.add.bind(director);
  director.add = (n, why) => {
    const before = director.rank.title;
    const rank = origAdd(n, why);
    if (rank.title !== before) api.toast(`Respect up: ${rank.title}!`);
    return rank;
  };
  ctx.api.respectRankFor = (points) => {
    let best = config.respectLadder[0];
    for (const r of config.respectLadder) if (points >= r.min) best = r;
    return best.title;
  };
  ctx.api.respectLoaded = true;
}

export default { init };
