// banter.js — crew chatter for SOLMAR BAY.
// Lena Cruz and Vic Torres talk over the toast: race wins, jobs, heat,
// fares, packages, nightfall. Every line carries a speaker tag, and the
// director guards on a short cooldown so lines never stack on each
// other. It only ever hides a toast it set itself.
// Written fresh for round 8 from the shared contract.
export function init(ctx) {
  const S = ctx.state;
  const dom = ctx.dom || {};

  const LINES = {
    raceWin: [
      { who: 'LENA', text: 'Told you. My lines, your pedal. We make a good team, kid.' },
      { who: 'VIC', text: 'That was clean driving. The bay is starting to notice you.' },
      { who: 'LENA', text: 'Three hundred bucks and nobody even saw our plates. Beautiful.' },
    ],
    missionStart: [
      { who: 'LENA', text: 'Vic wants this done quiet. Quiet is my middle name. Mostly.' },
      { who: 'VIC', text: 'No noise, no witnesses, no excuses. You know the drill.' },
    ],
    heatUp: [
      { who: 'LENA', text: 'Heat is climbing. Lose them or lose the car, your call.' },
      { who: 'VIC', text: 'Cops on your tail means you did something right. Now disappear.' },
    ],
    fareDone: [
      { who: 'LENA', text: 'Another fare, another smile. You drive like my grandma, but it pays.' },
      { who: 'VIC', text: 'Tips are respect you can spend. Keep the meter running.' },
    ],
    packageFound: [
      { who: 'VIC', text: 'A package. Somebody hid money all over this bay. Keep looking.' },
      { who: 'LENA', text: 'Fifty bucks just sitting there. This city pays you to walk around.' },
    ],
    nightfall: [
      { who: 'LENA', text: 'Sun is down, bay lights up. Night is when this city really talks.' },
      { who: 'VIC', text: 'Dark streets, bright signs. Stay sharp after sunset.' },
    ],
    lowHealth: [
      { who: 'LENA', text: 'You are bleeding on my upholstery. Get to the motel, now.' },
      { who: 'VIC', text: 'You look half dead, kid. Eat something before the next job.' },
    ],
    ambient: [
      { who: 'LENA', text: 'You ever think about leaving this life? Me neither. Pass the aux.' },
      { who: 'VIC', text: 'Respect is a currency, kid. Spend it slow.' },
      { who: 'LENA', text: 'If the engine sounds funny, it is funny. Get it checked.' },
      { who: 'VIC', text: 'Every district has its own rules. Learn them before you break them.' },
    ],
  };

  function showToast(text) {
    const el = dom.toast;
    if (!el) return;
    el.textContent = text;
    el.classList.remove('hidden');
  }

  const director = {
    _cooldown: 0,
    _lastToast: '',
    _toastT: 0,
    _ambientT: 25,
    _nightSaid: false,

    say(who, text) {
      const line = who + ': "' + text + '"';
      this._lastToast = line;
      this._toastT = 5;
      this._cooldown = 9;
      showToast(line);
      return line;
    },

    _pick(list) {
      return list[Math.floor(Math.random() * list.length)];
    },

    _sayList(list) {
      if (this._cooldown > 0) return false;
      const l = this._pick(list);
      this.say(l.who, l.text);
      return true;
    },

    raceWin() { return this._sayList(LINES.raceWin); },
    missionStart() { return this._sayList(LINES.missionStart); },
    heatUp() { return this._sayList(LINES.heatUp); },
    fareDone() { return this._sayList(LINES.fareDone); },
    packageFound() { return this._sayList(LINES.packageFound); },
    nightfall() { return this._sayList(LINES.nightfall); },
    lowHealth() { return this._sayList(LINES.lowHealth); },
    ambient() { return this._sayList(LINES.ambient); },
  };

  S.banterDirector = director;
  ctx.api.banter = director;

  ctx.updates.push((dt) => {
    if (director._cooldown > 0) director._cooldown -= dt;
    if (director._toastT > 0) {
      director._toastT -= dt;
      if (director._toastT <= 0) {
        // Only hide a toast this director set.
        const el = dom.toast;
        if (el && el.textContent === director._lastToast) el.classList.add('hidden');
      }
    }
    // One nightfall line per night.
    const dn = S.dayNight;
    if (dn && dn.phase === 'NIGHT') {
      if (!director._nightSaid) {
        director._nightSaid = true;
        director.nightfall();
      }
    } else if (dn) {
      director._nightSaid = false;
    }
    // Idle chatter while playing, never during a cutscene.
    if (S.mode !== 'playing' || S.cutscene) return;
    director._ambientT -= dt;
    if (director._ambientT <= 0) {
      director._ambientT = 35 + Math.random() * 30;
      director.ambient();
    }
  });
}
