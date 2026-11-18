// SOLMAR BAY — banter.js
// BanterDirector: the city talks back. Lena and Vic drop one-liners as
// the job unfolds — a chase starts, the heat spikes, the sun goes down,
// a fare is delivered, a package is found. Lines are shown as a toast
// with a speaker tag, never over a briefing (the dialogue box wins), and
// never more than one line every nine seconds, so the chatter stays
// spice instead of noise. Every line is written for this game; the
// triggers are the moments that already exist in the loop.
//
// Triggers the director watches on its own (no wiring needed beyond
// construction + update): wanted rising to 3+, heat hitting 90, the
// district changing under the wheels, night falling, dawn breaking,
// the first package of a run, the crew dropping a rival.
// Triggers the game calls directly: raceWin(), taxiDone(fare),
// packageFound(n), crewKill(), heatSpike(), busted() (unused — a bust
// ends the run, so the line never lands; kept for the API).

import { S } from './state.js';

const LINES = {
  chase: [
    ['LENA', 'They are on us, Marco. Drive like you mean it.'],
    ['LENA', 'PD everywhere. Do not stop. Do not stop.'],
    ['VIC', 'You wanted the big jobs, kid. This is what they cost.'],
    ['LENA', 'I see three cruisers in the mirror. Make that four.'],
    ['VIC', 'Lose them in Old Town. The alleys are too tight for their boats.'],
    ['LENA', 'Hold on tight. I am about to earn my cut.'],
  ],
  heatMax: [
    ['VIC', 'Five stars, Marco. The whole bay is looking for you.'],
    ['LENA', 'That is every cop in Solmar. Every single one.'],
    ['VIC', 'Lay low or pay up. Those are the only two exits.'],
  ],
  heatDown: [
    ['LENA', 'They are peeling off. Keep it quiet for a minute.'],
    ['VIC', 'Good. Quiet streets, quiet heat. That is how you survive.'],
    ['LENA', 'Breathe. We are ghosts again.'],
  ],
  districtBeach: [
    ['LENA', 'Beach air. Even the cops slow down out here.'],
    ['VIC', 'The pier pays, the beach rests. Remember that.'],
  ],
  districtHarbor: [
    ['VIC', 'The harbor is my office. Keep your eyes open, your mouth shut.'],
    ['LENA', 'Crates, cranes, and men who do not ask questions.'],
  ],
  districtOldTown: [
    ['LENA', 'Old Town. My grandmother grew up on this street.'],
    ['VIC', 'Narrow streets, old money, older grudges.'],
  ],
  districtIndustrial: [
    ['VIC', 'The yards never sleep. Neither do the men watching them.'],
    ['LENA', 'Smokestacks and secrets. Smells like work.'],
  ],
  districtDowntown: [
    ['LENA', 'Downtown lights. Everybody here is somebody until they are not.'],
    ['VIC', 'The towers own the skyline. We own the streets below.'],
  ],
  districtUptown: [
    ['VIC', 'Uptown. Old money behind glass. The kind that pays for silence.'],
    ['LENA', 'Those towers have doormen. We have a crowbar. Different tools.'],
  ],
  districtStrip: [
    ['LENA', 'The Strip! Neon, noise, and everybody awake at once.'],
    ['VIC', 'The avenue never sleeps, so neither do its wallets.'],
  ],
  night: [
    ['LENA', 'Night in Solmar. The city puts on its other face.'],
    ['VIC', 'Dark streets, bright windows. Perfect working hours.'],
    ['LENA', 'Headlights on. The night is ours if we take it.'],
  ],
  dawn: [
    ['LENA', 'Sun is coming up. We made it through another night.'],
    ['VIC', 'Morning. The bay resets. So do we.'],
  ],
  raceWin: [
    ['LENA', 'You dusted them! That was beautiful, Marco.'],
    ['VIC', 'Fast hands, fast car. The ring road remembers winners.'],
    ['LENA', 'Three hundred dollars and bragging rights. Not bad.'],
  ],
  taxiDone: [
    ['LENA', 'Another happy passenger. You should tip yourself.'],
    ['VIC', 'Honest money. It spends the same as the other kind.'],
  ],
  package: [
    ['LENA', 'A package! Somebody left money on the street. Our money now.'],
    ['VIC', 'Twelve of those out there. A sharp eye pays for itself.'],
    ['LENA', 'Found one. The bay hides its change in plain sight.'],
  ],
  crewKill: [
    ['LENA', 'One down. I told you I can handle myself.'],
    ['LENA', 'That one is not getting up. Keep moving.'],
    ['VIC', 'Lena shoots straight. Remember that when you split the cut.'],
  ],
  heatSpike: [
    ['LENA', 'That ram shook the whole car. They are not playing.'],
    ['VIC', 'They ram, you run. That is the whole dance.'],
  ],
  missionDone: [
    ['VIC', 'Clean work. The money is already moving.'],
    ['LENA', 'Another job in the books. What is next, boss?'],
    ['VIC', 'That is how you build a name in this bay.'],
  ],
  shopBuy: [
    ['LENA', 'Supplies. A fed crew is a fast crew.'],
    ['VIC', 'Spend it to make it. The mart takes cash, not promises.'],
    ['LENA', 'Good. Now we are stocked for whatever comes next.'],
  ],
  garageStore: [
    ['LENA', 'She is yours now. Four bays, and this one is home.'],
    ['VIC', 'A stored car is money in the bank with wheels.'],
    ['LENA', 'Tune her up when you can. A fast car is a free car.'],
  ],
  safehouse: [
    ['LENA', 'Motel walls, hot water, no cops. Best room in Solmar.'],
    ['VIC', 'Rest is a weapon too. The bay waits for no one, but it waits for you.'],
    ['LENA', 'Heat gone, health back. We go again when you say.'],
  ],
  taxiStart: [
    ['LENA', 'A fare! Drive smooth, smile, and do not mention the pistol.'],
    ['VIC', 'Honest work pays honest money. Take the long way.'],
  ],
  raceStart: [
    ['LENA', 'Ring road. Four gates. Do not lift.'],
    ['VIC', 'Three hundred dollars says you are the fastest thing on this road.'],
    ['LENA', 'Eyes up, foot down. I will watch the gates.'],
  ],
  fenceSale: [
    ['VIC', 'Sold. Cash on the hood, no questions, no receipt.'],
    ['LENA', 'That car was hot ten minutes ago. Now it is just money.'],
    ['VIC', 'Vic pays fair. Vic always pays fair. Remember that.'],
  ],
  carStolen: [
    ['LENA', 'Nice lift. That one was begging for a new owner.'],
    ['VIC', 'Stolen clean. The fence or the garage — your call.'],
  ],
  lowHp: [
    ['LENA', 'Marco, you are bleeding. Get to the motel or buy a medkit.'],
    ['VIC', 'You cannot spend money dead. Patch up first.'],
    ['LENA', 'Health low. Burgers heal, medkits heal better.'],
  ],
  nightDrive: [
    ['LENA', 'Night driving. The city looks different with the lights on.'],
    ['VIC', 'The night shift pays double and asks half the questions.'],
  ],
  garageTune: [
    ['LENA', 'Tuned and ready. She will fly now, Marco.'],
    ['VIC', 'Money spent on the car is money spent on staying free.'],
  ],
  rankUp: [
    ['LENA', 'They are saying your name in the streets now.'],
    ['VIC', 'A new rank. Wear it like the suit it is.'],
  ],
  wantedBoard: [
    ['VIC', 'Three cars on my board today. Bring me one and the bonus is yours.'],
    ['LENA', 'Vic wants a specific ride. Keep your eyes open.'],
  ],
};

export class BanterDirector {
  constructor() {
    this._cooldown = 0;
    this._lastWanted = 0;
    this._lastDistrict = null;
    this._lastPhase = null;
    this._lastHeat = 0;
    this._used = new Map(); // trigger -> last line index, so lines rotate
  }

  _pick(trigger) {
    const pool = LINES[trigger];
    if (!pool || pool.length === 0) return null;
    let idx = (this._used.get(trigger) || 0) + 1;
    if (idx >= pool.length) idx = 0;
    // A little shuffle on the first pass so two runs do not open alike.
    if (this._used.get(trigger) === undefined) idx = Math.floor(Math.random() * pool.length);
    this._used.set(trigger, idx);
    return pool[idx];
  }

  _say(trigger) {
    if (!S || this._cooldown > 0) return;
    if (S.dialogue && S.dialogue.active) return; // never talk over a briefing
    const line = this._pick(trigger);
    if (!line) return;
    this._cooldown = 9;
    if (S.hud && typeof S.hud.toast === 'function') {
      S.hud.toast(line[0] + ': "' + line[1] + '"');
    }
  }

  // Direct calls from the systems that own the moment.
  raceWin() { this._say('raceWin'); }
  taxiDone() { this._say('taxiDone'); }
  packageFound() { this._say('package'); }
  crewKill() { this._say('crewKill'); }
  heatSpike() { this._say('heatSpike'); }
  missionDone() { this._say('missionDone'); }
  shopBuy() { this._say('shopBuy'); }
  garageStore() { this._say('garageStore'); }
  safehouse() { this._say('safehouse'); }
  taxiStart() { this._say('taxiStart'); }
  raceStart() { this._say('raceStart'); }
  fenceSale() { this._say('fenceSale'); }
  carStolen() { this._say('carStolen'); }
  lowHp() { this._say('lowHp'); }
  nightDrive() { this._say('nightDrive'); }
  garageTune() { this._say('garageTune'); }
  rankUp() { this._say('rankUp'); }
  wantedBoard() { this._say('wantedBoard'); }

  update(dt) {
    if (!S || S.mode !== 'playing') return;
    this._cooldown = Math.max(0, this._cooldown - dt);
    // Wanted climbing into the big leagues.
    if (S.wanted >= 3 && this._lastWanted < 3) this._say('chase');
    // Heat pinned at the top.
    if ((S.heat || 0) >= 90 && this._lastHeat < 90) this._say('heatMax');
    // Heat bleeding off after a chase.
    if ((S.heat || 0) < 25 && this._lastHeat >= 50) this._say('heatDown');
    this._lastWanted = S.wanted || 0;
    this._lastHeat = S.heat || 0;
    // District crossings get a line the first time each run.
    if (S.district && S.district !== this._lastDistrict) {
      const map = {
        beach: 'districtBeach', harbor: 'districtHarbor', oldtown: 'districtOldTown',
        industrial: 'districtIndustrial', downtown: 'districtDowntown',
        uptown: 'districtUptown', strip: 'districtStrip',
      };
      const trigger = map[S.district];
      if (trigger) this._say(trigger);
      this._lastDistrict = S.district;
    }
    // Nightfall and dawn.
    const phase = S.dayNight ? S.dayNight.phase : null;
    if (phase && phase !== this._lastPhase) {
      if (phase === 'NIGHT') this._say('night');
      if (phase === 'DAWN') this._say('dawn');
      this._lastPhase = phase;
    }
    // Night driving: a line when the player is rolling fast after dark.
    if (phase === 'NIGHT' && S.car && Math.abs(S.car.speed) > 20) this._say('nightDrive');
  }

  reset() {
    this._cooldown = 0;
    this._lastWanted = 0;
    this._lastDistrict = null;
    this._lastPhase = null;
    this._lastHeat = 0;
    this._used.clear();
  }
}
