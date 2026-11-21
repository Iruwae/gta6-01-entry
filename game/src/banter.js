// SOLMAR BAY — crew banter. Lena and Vic talk over the toast line while
// the player works. Every line carries a speaker tag up front ("LENA: …"
// / "VIC: …"). The live banter director is the one crew.js installs
// (banter loads just before crew); this module only holds the line banks
// and a trigger helper — it never fires on its own, so it can never talk
// over a briefing or another toast.
export const BANTER_LINES = {
  raceWin: [
    ['LENA', 'Told you. Nobody outdrives us on this bay.'],
    ['VIC', 'Clean win. The bay saw that — spend the money loud.'],
    ['LENA', 'That is how you take a corner. Again, slower, so they can watch.'],
  ],
  pickup: [
    ['LENA', 'Package is in the bag. Keep it smooth.'],
    ['VIC', 'Good hands. Vic pays people with good hands.'],
    ['LENA', 'One more of those and we eat like the Strip does.'],
  ],
  heatUp: [
    ['VIC', 'You got the whole bay looking at you. Lose them.'],
    ['LENA', 'Stars climbing. Drive like you mean it or park it and walk.'],
    ['VIC', 'The PD does not forget a face. Give them somewhere else to look.'],
  ],
};

export function init(ctx) {
  ctx.api.banterLines = BANTER_LINES;
  ctx.api.banter = (kind) => {
    const lines = BANTER_LINES[kind];
    if (!lines) return false;
    const [speaker, text] = lines[Math.floor(Math.random() * lines.length)];
    return ctx.state.banterDirector.say(speaker, text);
  };
}
