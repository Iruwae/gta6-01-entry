// SOLMAR BAY — crew banter lines. The live director is installed by crew.js
// (banter loads just before crew, so crew's director is the one that stays).
export const BANTER_LINES = {
  raceWin: [
    ['LENA', 'That was clean. Vic is going to love this.'],
    ['LENA', 'Told you my lines work. Now drive like you mean it.'],
    ['VIC', 'You drive like the bay is yours. Keep it that way.'],
  ],
  pickup: [
    ['LENA', 'Package is in the bag. Easy money.'],
    ['VIC', 'Good hands. Keep it quiet and keep it moving.'],
    ['LENA', 'One more of those and we eat like kings tonight.'],
  ],
  heatUp: [
    ['VIC', 'Cops on you now. Lose them or pay for it.'],
    ['LENA', 'Heat is climbing. Do not lead them back to the garage.'],
    ['VIC', 'The whole bay heard that. Move.'],
  ],
  idle: [
    ['LENA', 'Sun is going down. Best light in the whole bay.'],
    ['VIC', 'Solmar Bay rewards the patient and punishes the loud.'],
    ['LENA', 'You ever think about what comes after all this? Me neither.'],
  ],
};

export function init(ctx) {
  ctx.banterLines = BANTER_LINES;
  return { lines: BANTER_LINES };
}

export default init;
