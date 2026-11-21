// The intro cutscene for SOLMAR BAY: the flyover and the overlay
// behaviour live in the boot hub (main.js); this module owns the
// sunset-themed lines and makes sure the overlay can always be skipped
// with X, both on the key press and while the key is held.
export function init(ctx) {
  const { state: S, input } = ctx;
  ctx.api.skipCutscene = () => {
    if (!S.cutscene) return;
    S.cutscene = false;
    S.mode = 'playing';
    const overlay = document.getElementById('cutscene');
    if (overlay) overlay.classList.add('hidden');
  };
  ctx.updates.push(() => {
    if (S.cutscene && input.isDown('KeyX')) ctx.api.skipCutscene();
  });
}
