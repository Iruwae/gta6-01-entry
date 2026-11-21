// SOLMAR BAY — crew banter: Lena and Vic talk over the toast line while
// the player works. Every line carries a speaker tag up front, and a short
// cooldown keeps the crew from talking over each other. (The director the
// smoke test exercises is the one crew.js installs — banter loads just
// before crew.)
const LINES = {
  raceWin: [
    ['LENA', 'See that? Told you the bay was ours tonight.'],
    ['LENA', 'Clean win. Vic is going to love this.'],
    ['VIC', 'That is how you drive a getaway. Beautiful.'],
  ],
  pickup: [
    ['LENA', 'Package is ours. Do not stop for anybody.'],
    ['VIC', 'Good hands. Bring it home.'],
    ['LENA', 'One more for the crew. Keep moving.'],
  ],
  heatUp: [
    ['LENA', 'Cops on us — drive like you mean it!'],
    ['VIC', 'Heat is rising. Lose them before the bridge.'],
    ['LENA', 'They are gaining. Floor it!'],
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
    raceWin() { const [s, t] = LINES.raceWin[Math.floor(Math.random() * LINES.raceWin.length)]; return this.say(s, t); },
    pickup() { const [s, t] = LINES.pickup[Math.floor(Math.random() * LINES.pickup.length)]; return this.say(s, t); },
    heatUp() { const [s, t] = LINES.heatUp[Math.floor(Math.random() * LINES.heatUp.length)]; return this.say(s, t); },
  };
}

export function init(ctx) {
  ctx.state.banterDirector = makeBanterDirector(ctx.api.toast);
  ctx.updates.push((dt) => {
    // Idle chatter: when the heat jumps, Vic or Lena pipes up.
    const S = ctx.state;
    if (S.mode !== 'playing') return;
    if (S.wanted >= 3 && S.banterDirector._cooldown <= 0 && Math.random() < dt * 0.05) {
      S.banterDirector.heatUp();
    }
  });
  ctx.banterReady = true;
}
