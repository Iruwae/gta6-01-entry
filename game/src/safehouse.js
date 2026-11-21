// SOLMAR BAY — safehouse. H rests at the motel: full health, and the heat
// cools down by 40. Only works when the player is at the safehouse door.
export function init(ctx) {
  const { state: S, input, config, api } = ctx;
  ctx.updates.push(() => {
    if (S.mode !== 'playing') return;
    if (!input.wasPressed('KeyH')) return;
    const d = Math.hypot(S.player.pos.x - config.safehouse.x, S.player.pos.z - config.safehouse.z);
    if (d < config.safehouse.radius + 2) {
      S.health = config.maxHealth;
      S.heatDirector.cool(40);
      api.toast('You rested at the safehouse. Full health, cooler heat.');
    }
  });
  ctx.api.safehouseLoaded = true;
}

export default { init };
