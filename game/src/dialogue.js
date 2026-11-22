// Dialogue module. The dialogue box (queue, render, advance on click)
// lives in the boot hub (main.js) and is exposed through ctx.api — this
// module just marks itself loaded.
export function init(ctx) {
  ctx.dialogue = { loaded: true };
}
