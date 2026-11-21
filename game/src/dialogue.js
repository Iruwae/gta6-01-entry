// SOLMAR BAY — the dialogue box. The queue, render and advance-on-click
// live in the boot hub and are exposed through ctx.api; this module is
// the dialogue system's home and offers the same surface to other modules.
export function init(ctx) {
  ctx.api.dialogue = {
    show: (lines) => ctx.api.showDialogue(lines),
    advance: () => ctx.api.advanceDialogue(),
  };
}
