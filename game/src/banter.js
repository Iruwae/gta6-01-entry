// Crew banter line pools + a banter director. Banter loads just before
// crew, and crew.js installs the live director the game actually uses
// (same interface, same lines).
export const BANTER_LINES = {
  raceWin: [
    ['LENA', 'Told you my lines were faster than theirs.'],
    ['VIC', 'Clean win. The bay is starting to notice you.'],
  ],
  pickup: [
    ['LENA', 'Package in hand. Now move, before somebody notices.'],
    ['VIC', 'Good hands. That one was worth the trouble.'],
  ],
  heatUp: [
    ['LENA', 'Cops on us! Drive like you mean it!'],
    ['VIC', 'Heat like that and you better have a plan.'],
  ],
};

export function makeBanterDirector(toast) {
  return {
    _cooldown: 0,
    say(speaker, text) {
      if (this._cooldown > 0) return false;
      toast(`${speaker}: "${text}"`);
      this._cooldown = 9;
      return true;
    },
    raceWin() {
      const [s, t] = BANTER_LINES.raceWin[Math.floor(Math.random() * BANTER_LINES.raceWin.length)];
      return this.say(s, t);
    },
    pickup() {
      const [s, t] = BANTER_LINES.pickup[Math.floor(Math.random() * BANTER_LINES.pickup.length)];
      return this.say(s, t);
    },
    heatUp() {
      const [s, t] = BANTER_LINES.heatUp[Math.floor(Math.random() * BANTER_LINES.heatUp.length)];
      return this.say(s, t);
    },
  };
}

export function init(ctx) {
  ctx.state.banterDirector = makeBanterDirector(ctx.api.toast);
  ctx.banter = { makeDirector: makeBanterDirector, lines: BANTER_LINES };
}
