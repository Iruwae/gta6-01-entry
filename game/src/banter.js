// SOLMAR BAY — crew banter: Lena and Vic talk over the toast line while
// the player works. Every line carries a speaker tag up front. A short
// cooldown keeps the crew from talking over each other. The director the
// smoke test exercises is the one crew.js installs; this module provides
// the same director shape as a fallback.
export function init(ctx) {
  const { state: S } = ctx;
  const lines = {
    raceWin: [
      ['LENA', 'Told you. Nobody outdrives us on this bay.'],
      ['LENA', 'That was clean. Vic is going to love this.'],
      ['VIC', 'Beautiful driving. You are worth every dollar.'],
    ],
    pickup: [
      ['LENA', 'Package is in the bag. Move, before they notice.'],
      ['VIC', 'Good hands. Bring it home slow and quiet.'],
      ['LENA', 'Got it. Now disappear like the sun just did.'],
    ],
    heatUp: [
      ['VIC', 'Cops are on you. Lose them or lose everything.'],
      ['LENA', 'Heat is climbing. Drive like you mean it.'],
      ['VIC', 'They saw you. Do not bring them to my yard.'],
    ],
  };
  let idx = 0;
  S.banterDirector = {
    _cooldown: 0,
    say(speaker, text) {
      if (this._cooldown > 0) return false;
      ctx.api.toast(`${speaker}: "${text}"`);
      this._cooldown = 9;
      return true;
    },
    raceWin() {
      const l = lines.raceWin[idx++ % lines.raceWin.length];
      return this.say(l[0], l[1]);
    },
    pickup() {
      const l = lines.pickup[idx++ % lines.pickup.length];
      return this.say(l[0], l[1]);
    },
    heatUp() {
      const l = lines.heatUp[idx++ % lines.heatUp.length];
      return this.say(l[0], l[1]);
    },
  };
  ctx.api.banterLines = lines;
}

export default { init };
