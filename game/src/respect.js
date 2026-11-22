// Respect ranks — the ladder from config, driven by respectDirector.add
// (see state.js).
export function init(ctx) {
  ctx.respect = {
    ladder: ctx.config.respectLadder,
    add: (n, why) => ctx.state.respectDirector.add(n, why),
  };
}
