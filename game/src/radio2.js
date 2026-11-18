// SOLMAR BAY — radio2.js
// RadioDirector: the dial doubles. Three new stations join the three in
// config.js, and every station gets a DJ who talks between tracks — a
// rotating line of banter that lands as a toast, so the radio feels like
// a broadcast instead of a playlist.
//
// The director owns the merged station list (CFG.RADIO + the three new
// ones). Main.js cycles Q through the merged list, and the HUD reads the
// merged list for its station/track display. Track rotation stays
// deterministic: track = floor(S.time / 45) % tracks.length, exactly
// like the original three stations.
//
// New stations:
// - VICE 99.9 — Synthwave Nights (the sunset station)
// - PIER 107.7 — Salsa & Latin (the harbor station)
// - STATIC 66.6 — Late Night Talk (the conspiracy station)

import { S } from './state.js';
import { CFG } from './config.js';

const EXTRA_STATIONS = [
  {
    name: 'VICE 99.9', genre: 'Synthwave Nights',
    tracks: ['Neon Palms — Vector Hold', 'Chrome Sunset — Midnight Mall', 'Afterglow — Cassette Kids'],
    dj: [
      'DJ Vector: "That sunset is doing half my job tonight, Solmar."',
      'DJ Vector: "Next up, a track that sounds like driving with no destination."',
      'DJ Vector: "If your dashboard is glowing, you are doing it right."',
    ],
  },
  {
    name: 'PIER 107.7', genre: 'Salsa & Latin',
    tracks: ['Mar y Fuego — Los Delfines', 'Baila Solmar — Rosa y Mar', 'Puerto Rico — Calle Ocho'],
    dj: [
      'DJ Rosa: "The harbor is dancing and you are invited, mi amor."',
      'DJ Rosa: "This one goes out to every driver stuck at the pier lights."',
      'DJ Rosa: "Salsa hour — windows down, volume up, worries out."',
    ],
  },
  {
    name: 'STATIC 66.6', genre: 'Late Night Talk',
    tracks: ['The Hollow Signal — Night Desk', 'Static Hour — The Listener', 'Dead Air — Frequency X'],
    dj: [
      'Night Desk: "Caller, you are on the air. Tell us what you saw over the bay."',
      'Night Desk: "They say the lights over the harbor are not boats. Discuss."',
      'Night Desk: "If you are listening at 3 a.m., you already know too much."',
    ],
  },
];

const DJ_EVERY = 55; // seconds between DJ lines

export class RadioDirector {
  constructor() {
    this.djT = 20; // first DJ line 20 s in — not on top of the intro toast
    this.djIdx = 0;
    this.lastTrackKey = '';
  }

  // All six stations, original three first (their indices never move).
  stations() {
    const base = (CFG && Array.isArray(CFG.RADIO)) ? CFG.RADIO : [];
    return base.concat(EXTRA_STATIONS);
  }

  count() {
    return this.stations().length;
  }

  stationAt(i) {
    const list = this.stations();
    if (list.length === 0) return null;
    return list[((i % list.length) + list.length) % list.length];
  }

  trackAt(i, time) {
    const stn = this.stationAt(i);
    if (!stn || !Array.isArray(stn.tracks) || stn.tracks.length === 0) return '';
    return stn.tracks[Math.floor((time || 0) / 45) % stn.tracks.length];
  }

  // DJ banter: one line per station rotation, as a toast. Only the
  // extra stations talk — the original three keep their silence (their
  // DJs are on strike, per station lore).
  update(dt) {
    if (!S || S.mode !== 'playing') return;
    this.djT -= dt;
    if (this.djT > 0) return;
    this.djT = DJ_EVERY;
    const stn = this.stationAt(S.radioStation || 0);
    if (!stn || !Array.isArray(stn.dj) || stn.dj.length === 0) return;
    const line = stn.dj[this.djIdx % stn.dj.length];
    this.djIdx++;
    if (S.hud && typeof S.hud.toast === 'function') S.hud.toast(line);
    if (S.audio && typeof S.audio.djJingle === 'function') S.audio.djJingle();
  }

  // Announce a station switch (Q): name + genre + current track.
  announceSwitch() {
    const stn = this.stationAt(S.radioStation || 0);
    if (!stn) return;
    const track = this.trackAt(S.radioStation || 0, S.time || 0);
    if (S.hud && typeof S.hud.toast === 'function') {
      S.hud.toast('RADIO: ' + stn.name + ' — ' + stn.genre + (track ? ' · ' + track : ''));
    }
    if (S.audio && typeof S.audio.blip === 'function') S.audio.blip();
  }
}
