// Dialogue box: queue, render, advance on click.
// The boot hub (main.js) owns the queue itself; this module exposes the
// same API surface so other modules can drive dialogue through ctx.api.
export function init(ctx) {
  ctx.dialogueLoaded = true;
  if (!ctx.api.showDialogue) {
    ctx.api.showDialogue = () => {};
  }
  if (!ctx.api.advanceDialogue) {
    ctx.api.advanceDialogue = () => {};
  }
}

export default init;
