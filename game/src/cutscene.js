// SOLMAR BAY — cutscene.js
// CutsceneDirector: the opening flyover. On a new game, before Marco
// takes the wheel, the camera sweeps the bay at golden hour — harbor
// cranes, the beach, the downtown towers — and lands at Lena's garage
// while three title cards tell the story. Any key or click skips it.
// The director owns the camera while it runs (main.js hands it the
// frame when S.cutscene is true) and hands control back cleanly at the
// end, so the first thing the player does is drive, not watch.
//
// The sweep is four legs, two seconds each, eight seconds total:
//   1. high over the harbor, looking down the cranes — "SOLMAR BAY"
//   2. low over the beach at sunset — "The bay never sleeps."
//   3. between the downtown towers — "Ten jobs. One crew."
//   4. down to the garage door — "No way out but up."
// Cards fade by swapping the overlay text at each leg boundary; the
// overlay itself is #cutscene in index.html, styled like the title
// screen so it reads as one piece.

import { S } from './state.js';

const LEGS = [
  {
    from: [150, 55, 190], to: [120, 42, 150],
    lookFrom: [90, 2, 138], lookTo: [60, 2, 120],
    card: 'SOLMAR BAY',
    sub: 'A city that pays in cash and collects in blood.',
  },
  {
    from: [60, 26, 185], to: [-30, 18, 178],
    lookFrom: [30, 1, 165], lookTo: [-40, 1, 160],
    card: 'The bay never sleeps.',
    sub: 'Golden hour. The streets are warm and the deals are warmer.',
  },
  {
    from: [-60, 34, 60], to: [-20, 30, -20],
    lookFrom: [-30, 4, 20], lookTo: [10, 6, -50],
    card: 'Ten jobs. One crew.',
    sub: 'Lena drives. Vic fences. Marco does the rest.',
  },
  {
    from: [-60, 22, -100], to: [-96, 7, -78],
    lookFrom: [-90, 1, -66], lookTo: [-90, 1, -66],
    card: 'No way out but up.',
    sub: 'Press any key to take the wheel.',
  },
];

const LEG_SECS = 2;
const TOTAL = LEGS.length * LEG_SECS;

// The outro: the same bay at dawn, after the tenth job. The sweep runs
// the other way — garage, downtown, beach, harbor — and the cards say
// what the run earned. It plays once, when King of the Bay is won,
// and it is skippable like the intro.
const OUTRO_LEGS = [
  {
    from: [-96, 7, -78], to: [-60, 22, -100],
    lookFrom: [-90, 1, -66], lookTo: [-60, 2, -90],
    card: 'Ten jobs. Done.',
    sub: 'Every fence paid. Every crew debt settled.',
  },
  {
    from: [-20, 30, -20], to: [-60, 34, 60],
    lookFrom: [10, 6, -50], lookTo: [-30, 4, 20],
    card: 'The towers know your name now.',
    sub: 'Shot Caller. Bay Boss. The titles stack up.',
  },
  {
    from: [-30, 18, 178], to: [60, 26, 185],
    lookFrom: [-40, 1, 160], lookTo: [30, 1, 165],
    card: 'The beach at dawn.',
    sub: 'The bay resets every morning. So do you — richer.',
  },
  {
    from: [120, 42, 150], to: [150, 55, 190],
    lookFrom: [60, 2, 120], lookTo: [90, 2, 138],
    card: 'KING OF THE BAY',
    sub: 'Solmar Bay is yours, Marco. Keep it.',
  },
];

function lerp3(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export class CutsceneDirector {
  constructor() {
    this.active = false;
    this.t = 0;
    this._leg = -1;
    this.el = null;
    this.elCard = null;
    this.elSub = null;
    this._legs = LEGS;
    this._total = TOTAL;
  }

  _els() {
    if (!this.el) {
      this.el = document.getElementById('cutscene');
      this.elCard = document.getElementById('cutscene-card');
      this.elSub = document.getElementById('cutscene-sub');
    }
    return !!this.el;
  }

  start() {
    if (!this._els()) return;
    this._legs = LEGS;
    this._total = TOTAL;
    this.active = true;
    this.t = 0;
    this._leg = -1;
    if (S) S.cutscene = true;
    this.el.classList.remove('hidden');
    this._showLeg(0);
    // Any key or click skips — bound once, removed on finish.
    this._skip = () => this.finish();
    window.addEventListener('keydown', this._skip);
    window.addEventListener('mousedown', this._skip);
  }

  // The ending sweep, after the tenth job. Same machinery, dawn legs.
  startOutro() {
    if (!this._els()) return;
    this._legs = OUTRO_LEGS;
    this._total = OUTRO_LEGS.length * LEG_SECS;
    this.active = true;
    this.t = 0;
    this._leg = -1;
    if (S) S.cutscene = true;
    this.el.classList.remove('hidden');
    this._showLeg(0);
    this._skip = () => this.finish();
    window.addEventListener('keydown', this._skip);
    window.addEventListener('mousedown', this._skip);
  }

  _showLeg(i) {
    if (i === this._leg) return;
    this._leg = i;
    const leg = this._legs[i];
    if (!leg || !this.elCard) return;
    this.elCard.textContent = leg.card;
    if (this.elSub) this.elSub.textContent = leg.sub;
    // A quick fade: restart the CSS animation by re-adding the class.
    this.elCard.classList.remove('card-in');
    void this.elCard.offsetWidth;
    this.elCard.classList.add('card-in');
  }

  update(dt, camera) {
    if (!this.active || !camera) return;
    this.t += dt;
    const legI = Math.min(this._legs.length - 1, Math.floor(this.t / LEG_SECS));
    const legT = Math.min(1, (this.t - legI * LEG_SECS) / LEG_SECS);
    // Ease the leg in and out so the sweep never jerks at a boundary.
    const e = legT < 0.5 ? 2 * legT * legT : 1 - Math.pow(-2 * legT + 2, 2) / 2;
    const leg = this._legs[legI];
    this._showLeg(legI);
    const pos = lerp3(leg.from, leg.to, e);
    const look = lerp3(leg.lookFrom, leg.lookTo, e);
    camera.position.set(pos[0], pos[1], pos[2]);
    camera.lookAt(look[0], look[1], look[2]);
    if (this.t >= this._total) this.finish();
  }

  finish() {
    if (!this.active) return;
    this.active = false;
    if (S) S.cutscene = false;
    if (this.el) this.el.classList.add('hidden');
    if (this._skip) {
      window.removeEventListener('keydown', this._skip);
      window.removeEventListener('mousedown', this._skip);
      this._skip = null;
    }
    // Hand the camera back where the garage is, so the first frame of
    // play is already framed on Marco and the sport car.
    if (S && S.camera) {
      S.camera.position.set(-84, 7, -52);
      S.camera.lookAt(-90, 1, -66);
    }
  }
}
