// SOLMAR BAY — banter (round 8, written fresh from the spec).
// Crew and street chatter with speaker tags, shown in the toast /
// dialogue area. The director guards on a 9 game-second cooldown
// between lines so the toast never becomes a spam feed; a direct call
// with the cooldown cleared always lands immediately.
const COOLDOWN = 9;

const LENA_LINES = [
  'Sun is going down and the bay is ours. Drive like you mean it.',
  'Vic says the job pays if we are quiet. So be quiet and quick.',
  'I have seen worse plans than this one. Not many, but some.',
  'Keep the engine warm. When I say go, we go.',
  'You drive, I watch the mirrors. That is how we stay free.',
  'One more score and we are out of the small leagues, hustler.',
];

const LENA_RACE_WIN = [
  'That was clean! They never even saw the last corner coming.',
  'Told you my line through the plaza was faster. Pay up, bay.',
  'Winner\'s circle looks good on us. Again, same time tomorrow?',
];

const LENA_RACE_LOSE = [
  'Shake it off. We learn the corner, we take it next time.',
  'That one stung, but the bay still owes us. Rematch.',
];

const VIC_LINES = [
  'Business is business. You bring the car, I bring the cash.',
  'The yard is open. Do not bring me anything with a tracker.',
  'Word on the street is the heat is watching the Strip tonight.',
  'You want respect in this bay, you earn it one job at a time.',
];

const MARCO_LINES = [
  'Easy, hustler. The garage stays neutral ground, understand?',
  'I tuned that engine myself. Treat her like she is borrowed.',
  'If the cops ask, you were never here. Same as always.',
];

const PED_LINES = [
  'Did you see the sunset tonight? The whole bay was on fire.',
  'Traffic on the Strip is a nightmare after dark.',
  'I heard the harbor cranes run all night now.',
  'Best tacos in the bay are two blocks from the beach, trust me.',
];

function pickOne(list) {
  return list[(Math.random() * list.length) | 0];
}

export function init(ctx) {
  const S = ctx.state;

  function toastEl() {
    if (ctx.dom && ctx.dom.toast) return ctx.dom.toast;
    try { return document.getElementById('toast'); } catch (e) { return null; }
  }

  const director = {
    _cooldown: 0,
    _last: null,
    lines: { LENA: LENA_LINES, VIC: VIC_LINES, MARCO: MARCO_LINES, PED: PED_LINES },

    // Show a speaker-tagged line in the toast area. Returns true when
    // the line actually displayed, false while cooling down.
    say(speaker, text) {
      if (this._cooldown > 0) return false;
      const tag = String(speaker || 'LENA').toUpperCase();
      const line = tag + ': "' + text + '"';
      const el = toastEl();
      if (el) {
        el.textContent = line;
        el.classList.remove('hidden');
      }
      this._last = { speaker: tag, text, at: Date.now() };
      this._cooldown = COOLDOWN;
      return true;
    },
    // Same as say, for callers that think in "show a line" terms.
    show(speaker, text) { return this.say(speaker, text); },
    line(speaker, text) { return this.say(speaker, text); },

    lena() { return this.say('LENA', pickOne(LENA_LINES)); },
    vic() { return this.say('VIC', pickOne(VIC_LINES)); },
    marco() { return this.say('MARCO', pickOne(MARCO_LINES)); },
    pedestrian() { return this.say('PED', pickOne(PED_LINES)); },

    raceWin() { return this.say('LENA', pickOne(LENA_RACE_WIN)); },
    raceLose() { return this.say('LENA', pickOne(LENA_RACE_LOSE)); },
    missionStart() { return this.say('LENA', pickOne(LENA_LINES)); },
    missionComplete() {
      return this.say('VIC', 'Job done, money moved. Same again tomorrow, hustler.');
    },
    taxiPickup() { return this.say('LENA', 'Fare is waiting. Smooth ride, no drama, good tip.'); },
    fareDone() { return this.say('LENA', 'Fare delivered. The meter loved you today.'); },
    packageFound() { return this.say('VIC', 'A package, right where I said it would be. Nice.'); },
    chaseStart() { return this.say('LENA', 'Cops on our tail! Lose them or lose the night.'); },
    lowHealth() { return this.say('LENA', 'You are bleeding out here. Get to the safehouse, now.'); },
    fenceSale(amount) {
      return this.say('VIC', 'Pleasure doing business. $' + amount + ' for that one, no questions.');
    },
    random() {
      const roll = Math.random();
      if (roll < 0.45) return this.lena();
      if (roll < 0.7) return this.vic();
      if (roll < 0.85) return this.marco();
      return this.pedestrian();
    },
  };

  if (S) S.banterDirector = director;
  ctx.api.banter = director;
  ctx.api.banterDirector = director;

  // Tick the cooldown down in game seconds.
  ctx.updates.push(function banterUpdate(dt) {
    if (director._cooldown > 0) {
      director._cooldown = Math.max(0, director._cooldown - Math.max(0, dt));
    }
  });
}
