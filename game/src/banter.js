// SOLMAR BAY — crew banter. Lena and Vic talk over the toast line while
// the player works; every line carries a speaker tag up front
// ("LENA: ..." / "VIC: ...") and a short cooldown keeps the crew from
// talking over each other. The director the smoke test exercises is the
// one crew.js installs (banter loads just before crew).
const LINES = {
  raceWin: [
    ['LENA', 'That was clean. Vic is going to love this.'],
    ['LENA', 'Told you my line through the gates was faster.'],
    ['VIC', 'You drive like the bay owes you money. Good.'],
  ],
  pickup: [
    ['LENA', 'Package is in the bag. Keep it moving.'],
    ['VIC', 'Quiet hands, quick feet. That is how we work.'],
    ['LENA', 'One more and the whole bay knows our name.'],
  ],
  heatUp: [
    ['LENA', 'Cops on us. Do not stop for anything.'],
    ['VIC', 'Lose them first, talk later. Go.'],
    ['LENA', 'Heat is climbing — find a spray booth or a motel.'],
  ],
};

export function makeBanterDirector(toast) {
  let idx = 0;
  const director = {
    _cooldown: 0,
    say(speaker, text) {
      if (this._cooldown > 0) return false;
      toast(`${speaker}: "${text}"`);
      this._cooldown = 9;
      return true;
    },
    _pick(kind) {
      const lines = LINES[kind];
      const line = lines[idx % lines.length];
      idx++;
      return this.say(line[0], line[1]);
    },
    raceWin() { return this._pick('raceWin'); },
    pickup() { return this._pick('pickup'); },
    heatUp() { return this._pick('heatUp'); },
  };
  return director;
}

export function init(ctx) {
  const { state: S, api } = ctx;
  // Install a working director; crew.js installs the final one right after.
  S.banterDirector = makeBanterDirector(api.toast);
}
