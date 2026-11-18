// SOLMAR BAY — challenges.js
// ChallengesDirector: three daily challenges, picked fresh every game
// day from the pool below and shown on the mission-select screen. They
// are the "one more run" hook: small, concrete goals with a cash prize
// that pay out the moment they are done, no menus to open, no claim to
// file. A challenge is a counter with a target and a reward; the
// director watches the same stats the rest of the game already keeps
// (cars stolen, races won, fares, packages, heat shed, cops dodged),
// so nothing new has to be tracked — it just reads the run.
//
// Pool (id, target, reward, how it is counted):
//   steal3     — steal 3 cars                       $250
//   race2      — win 2 street races                 $400
//   fare3      — deliver 3 taxi fares               $300
//   pack6      — collect 6 packages                 $200
//   ghost      — shed 100 heat at hideouts          $350
//   crew3      — Lena drops 3 rivals                $300
//   fence2     — sell 2 cars to Vic                 $450
//   nightowl   — earn $500 after nightfall          $300
//   cleanjob   — finish a job with wanted never
//                above 1 star                       $500
//   speedster  — hit 38 m/s in any car              $250
//
// The three for the day are picked by a seeded shuffle of the pool
// (seed = day number, so every player on the same day gets the same
// three — the leaderboard crowd can compare). Progress is read live
// from S.stats; the payout fires once per challenge per run.

import { S } from './state.js';

const POOL = [
  { id: 'steal3', text: 'Steal 3 cars', target: 3, reward: 250, stat: 'carsStolen' },
  { id: 'race2', text: 'Win 2 street races', target: 2, reward: 400, stat: 'racesWon' },
  { id: 'fare3', text: 'Deliver 3 taxi fares', target: 3, reward: 300, stat: 'faresDone' },
  { id: 'pack6', text: 'Collect 6 packages', target: 6, reward: 200, stat: 'packages' },
  { id: 'ghost', text: 'Shed 100 heat at hideouts', target: 100, reward: 350, stat: 'heatShed' },
  { id: 'crew3', text: 'Lena drops 3 rivals', target: 3, reward: 300, stat: 'crewKills' },
  { id: 'fence2', text: 'Sell 2 cars to Vic', target: 2, reward: 450, stat: 'fencesSold' },
  { id: 'nightowl', text: 'Earn $500 after nightfall', target: 500, reward: 300, stat: 'nightCash' },
  { id: 'cleanjob', text: 'Finish a job at 1 star or less', target: 1, reward: 500, stat: 'cleanJobs' },
  { id: 'speedster', text: 'Hit 38 m/s in any car', target: 38, reward: 250, stat: 'topSpeed' },
];

function daySeed(day) {
  let h = 2166136261;
  const str = 'solmar-day-' + day;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class ChallengesDirector {
  constructor() {
    this.today = [];
    this._paid = new Set();
    this._day = -1;
  }

  // Pick the three for the current game day. Called on a new run and
  // whenever the day rolls over; the pick is deterministic per day.
  roll(day) {
    const d = Math.max(1, Math.floor(day) || 1);
    if (d === this._day) return;
    this._day = d;
    this._paid = new Set();
    const rng = mulberry(daySeed(d));
    const deck = POOL.slice();
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = deck[i];
      deck[i] = deck[j];
      deck[j] = tmp;
    }
    this.today = deck.slice(0, 3);
  }

  progressOf(ch) {
    if (!S || !S.stats) return 0;
    const v = S.stats[ch.stat];
    return typeof v === 'number' ? v : 0;
  }

  doneOf(ch) {
    return this.progressOf(ch) >= ch.target;
  }

  // The per-frame check: pay out the moment a challenge completes.
  update() {
    if (!S || S.mode !== 'playing') return;
    const day = (S.day || 1);
    if (day !== this._day) this.roll(day);
    // Night-owl accounting: cash earned while the phase is NIGHT, read
    // off the wallet delta each frame (spending never counts against
    // it — only gains). Challenge payouts are excluded below, so the
    // board can never pay for itself.
    const cash = S.cash || 0;
    if (this._lastCash === undefined) this._lastCash = cash;
    const gained = cash - this._lastCash;
    this._lastCash = cash;
    if (gained > 0 && S.dayNight && S.dayNight.phase === 'NIGHT' && S.stats) {
      S.stats.nightCash = (S.stats.nightCash || 0) + gained;
    }
    for (const ch of this.today) {
      if (this._paid.has(ch.id)) continue;
      if (!this.doneOf(ch)) continue;
      this._paid.add(ch.id);
      S.cash = (S.cash || 0) + ch.reward;
      this._lastCash = (this._lastCash || 0) + ch.reward;
      if (S.stats) S.stats.cashEarned = (S.stats.cashEarned || 0) + ch.reward;
      if (S.respectDirector) S.respectDirector.add(25, 'Daily challenge done');
      if (S.hud && typeof S.hud.toast === 'function') {
        S.hud.toast('DAILY CHALLENGE DONE — ' + ch.text + ' — $' + ch.reward + ' in your pocket. Cash: $' + Math.floor(S.cash) + '.');
      }
      if (S.audio && typeof S.audio.jingle === 'function') S.audio.jingle();
    }
  }

  // Rows for the mission-select screen (menu.js reads this).
  rows() {
    return this.today.map((ch) => {
      const p = this.progressOf(ch);
      return {
        id: ch.id,
        text: ch.text,
        reward: ch.reward,
        done: this.doneOf(ch),
        paid: this._paid.has(ch.id),
        progress: Math.min(p, ch.target) + '/' + ch.target,
      };
    });
  }

  reset() {
    this._day = -1;
    this._paid = new Set();
    this.today = [];
  }
}
