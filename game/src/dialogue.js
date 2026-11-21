// The dialogue box for SOLMAR BAY. The queue itself lives in the boot
// hub (main.js) so briefings can fire before the modules finish
// loading; this module makes sure the box is wired through ctx.api and
// re-exposes the helpers for any module that needs them.
export function init(ctx) {
  const { api } = ctx;
  if (typeof api.showDialogue !== 'function') {
    api.showDialogue = () => {};
  }
  if (typeof api.advanceDialogue !== 'function') {
    api.advanceDialogue = () => {};
  }
  ctx.api.dialogue = {
    show: api.showDialogue,
    advance: api.advanceDialogue,
  };
}
