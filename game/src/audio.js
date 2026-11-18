// SOLMAR BAY — audio.js
// All sound is synthesized WebAudio — no audio files, no network, no
// external URLs. One master bus (gain 0.35) with headroom so stacked
// effects never clip; music sits low (0.05) under SFX and dips further
// while the siren runs (ducking, per audio-design). Repeated SFX get a
// small random pitch wobble so shots never sound like a machine loop.
// Every method guards !ctx and returns silently, so calls before the
// first user gesture are safe.

import { S } from './state.js';

const MASTER_LEVEL = 0.35;
const MUSIC_LEVEL = 0.05;
const MUSIC_DUCKED = 0.02;

// Chill night-drive progression: Am – F – C – G. Bass roots + pad tones.
const CHORDS = [
  { root: 55.0, pad: [220.0, 329.63] }, // Am
  { root: 43.65, pad: [174.61, 261.63] }, // F
  { root: 65.41, pad: [261.63, 392.0] }, // C
  { root: 49.0, pad: [196.0, 293.66] }, // G
];

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuf = null;
    this.engineOsc = null;
    this.engineOsc2 = null;
    this.engineGain = null;
    this.engineFilter = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenTimer = null;
    this.sirenHigh = false;
    this.musicTimer = null;
    this.musicStep = 0;
    this.musicGain = null;
    this.muted = !!(S && S.muted);
  }

  // ---- setup -------------------------------------------------------------

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : MASTER_LEVEL;
    this.master.connect(this.ctx.destination);
    // 1s of white noise, reused by shot/crash.
    const len = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }

  _now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  // Short oscillator blip with optional pitch slide.
  _tone({ type = 'sine', freq = 440, freqEnd = null, dur = 0.15, vol = 0.2, delay = 0 }) {
    if (!this.ctx) return;
    const t0 = this._now() + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // Filtered noise burst (shots, crashes).
  _noise({ dur = 0.2, vol = 0.4, filterType = 'highpass', filterFreq = 1000, delay = 0 }) {
    if (!this.ctx || !this.noiseBuf) return;
    const t0 = this._now() + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  // ---- vehicle engine ----------------------------------------------------

  setEngine(on, speed01) {
    if (!this.ctx) return;
    const s = Math.max(0, Math.min(1, speed01 || 0));
    if (on) {
      if (!this.engineOsc) {
        this.engineFilter = this.ctx.createBiquadFilter();
        this.engineFilter.type = 'lowpass';
        this.engineFilter.frequency.value = 700;
        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.value = 0;
        this.engineFilter.connect(this.engineGain);
        this.engineGain.connect(this.master);
        this.engineOsc = this.ctx.createOscillator();
        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.value = 55;
        this.engineOsc2 = this.ctx.createOscillator();
        this.engineOsc2.type = 'sawtooth';
        this.engineOsc2.frequency.value = 82.5;
        this.engineOsc2.detune.value = 8;
        this.engineOsc.connect(this.engineFilter);
        this.engineOsc2.connect(this.engineFilter);
        this.engineOsc.start();
        this.engineOsc2.start();
      }
      const t = this._now();
      const freq = 55 + s * 90;
      this.engineOsc.frequency.setTargetAtTime(freq, t, 0.08);
      this.engineOsc2.frequency.setTargetAtTime(freq * 1.5, t, 0.08);
      this.engineGain.gain.setTargetAtTime(0.05 + s * 0.08, t, 0.1);
    } else if (this.engineOsc) {
      const t = this._now();
      this.engineGain.gain.setTargetAtTime(0, t, 0.05);
      const osc = this.engineOsc;
      const osc2 = this.engineOsc2;
      const gain = this.engineGain;
      const filter = this.engineFilter;
      setTimeout(() => {
        try { osc.stop(); osc2.stop(); } catch (e) { /* already stopped */ }
        try { osc.disconnect(); osc2.disconnect(); gain.disconnect(); filter.disconnect(); } catch (e) { /* already gone */ }
      }, 300);
      this.engineOsc = null;
      this.engineOsc2 = null;
      this.engineGain = null;
      this.engineFilter = null;
    }
  }

  // ---- one-shots ---------------------------------------------------------

  shot() {
    if (!this.ctx) return;
    const wobble = 1 + (Math.random() - 0.5) * 0.12; // vary repeats
    this._noise({ dur: 0.12, vol: 0.5, filterType: 'highpass', filterFreq: 1200 });
    this._tone({ type: 'square', freq: 180 * wobble, freqEnd: 60, dur: 0.1, vol: 0.25 });
  }

  crash() {
    if (!this.ctx) return;
    this._noise({ dur: 0.4, vol: 0.5, filterType: 'lowpass', filterFreq: 500 });
    this._tone({ type: 'sine', freq: 70, freqEnd: 35, dur: 0.35, vol: 0.4 });
  }

  blip() {
    this._tone({ type: 'sine', freq: 880, dur: 0.08, vol: 0.2 });
  }

  pickup() {
    this._tone({ type: 'sine', freq: 660, dur: 0.1, vol: 0.22 });
    this._tone({ type: 'sine', freq: 990, dur: 0.14, vol: 0.22, delay: 0.09 });
  }

  reload() {
    this._tone({ type: 'square', freq: 1200, dur: 0.03, vol: 0.15 });
    this._tone({ type: 'square', freq: 1200, dur: 0.03, vol: 0.15, delay: 0.09 });
  }

  jingle() {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
    notes.forEach((f, i) => {
      this._tone({ type: 'sine', freq: f, dur: 0.14, vol: 0.22, delay: i * 0.12 });
    });
  }

  // ---- siren -------------------------------------------------------------

  siren(on) {
    if (on) {
      if (!this.ctx || this.sirenTimer) return;
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'sine';
      this.sirenOsc.frequency.value = 700;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0.12;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.master);
      this.sirenOsc.start();
      this.sirenHigh = false;
      this.sirenTimer = setInterval(() => {
        if (!this.sirenOsc) return;
        this.sirenHigh = !this.sirenHigh;
        this.sirenOsc.frequency.setTargetAtTime(this.sirenHigh ? 950 : 700, this._now(), 0.05);
      }, 450);
      this._duckMusic(true);
    } else {
      if (this.sirenTimer) {
        clearInterval(this.sirenTimer);
        this.sirenTimer = null;
      }
      if (this.sirenOsc) {
        try { this.sirenOsc.stop(); } catch (e) { /* already stopped */ }
        try { this.sirenOsc.disconnect(); this.sirenGain.disconnect(); } catch (e) { /* already gone */ }
        this.sirenOsc = null;
        this.sirenGain = null;
      }
      this._duckMusic(false);
    }
  }

  // ---- music -------------------------------------------------------------

  _duckMusic(ducked) {
    if (this.musicGain) {
      this.musicGain.gain.setTargetAtTime(ducked ? MUSIC_DUCKED : MUSIC_LEVEL, this._now(), 0.2);
    }
  }

  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.sirenTimer ? MUSIC_DUCKED : MUSIC_LEVEL;
    this.musicGain.connect(this.master);
    this.musicStep = 0;
    this.musicTimer = setInterval(() => {
      if (!this.ctx) return;
      const step = this.musicStep++;
      const bar = Math.floor(step / 8) % CHORDS.length;
      const chord = CHORDS[bar];
      const inBar = step % 8;
      // Bass on beats 0, 2, 4, 6 of each 8-step bar.
      if (inBar % 2 === 0) {
        this._musicTone('triangle', chord.root, 0.5, 0.09);
      }
      // Soft pad at the top of each bar — two detuned sines, low gain.
      if (inBar === 0) {
        this._musicTone('sine', chord.pad[0], 2.0, 0.03);
        this._musicTone('sine', chord.pad[1], 2.0, 0.03);
        this._musicTone('sine', chord.pad[1] * 1.005, 2.0, 0.02);
      }
    }, 250);
  }

  _musicTone(type, freq, dur, vol) {
    if (!this.ctx || !this.musicGain) return;
    const t0 = this._now();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.05);
    gain.gain.setValueAtTime(vol, t0 + dur - 0.3);
    gain.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.musicGain) {
      try { this.musicGain.disconnect(); } catch (e) { /* already gone */ }
      this.musicGain = null;
    }
  }

  // ---- mute --------------------------------------------------------------

  setMuted(m) {
    this.muted = !!m;
    if (this.master) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : MASTER_LEVEL, this._now(), 0.05);
    }
  }

  // ---- round 5 systems ---------------------------------------------------
  // Rotor wash: a low chopping loop while a helicopter is overhead.
  rotor(on) {
    if (!this.ctx) return;
    if (on && !this.rotorOsc) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 11;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.05;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      osc.start();
      this.rotorOsc = osc;
      this.rotorGain = gain;
    } else if (!on && this.rotorOsc) {
      try { this.rotorOsc.stop(); } catch (e) { /* already stopped */ }
      this.rotorOsc = null;
      this.rotorGain = null;
    }
  }

  // DJ jingle: a bright two-note sting when the radio DJ talks.
  djJingle() {
    if (!this.ctx) return;
    this._tone({ type: 'triangle', freq: 880, dur: 0.09, vol: 0.12 });
    this._tone({ type: 'triangle', freq: 1318, dur: 0.14, vol: 0.12, delay: 0.09 });
  }

  // Pay-n-spray: a short airbrush hiss + a cash-register chirp.
  spray() {
    if (!this.ctx) return;
    this._noise({ dur: 0.5, vol: 0.18, filterType: 'bandpass', filterFreq: 5200 });
    this._tone({ type: 'sine', freq: 1568, dur: 0.08, vol: 0.14, delay: 0.45 });
    this._tone({ type: 'sine', freq: 2093, dur: 0.12, vol: 0.14, delay: 0.53 });
  }

  // Shop purchase: a single coin chirp.
  purchase() {
    if (!this.ctx) return;
    this._tone({ type: 'sine', freq: 1046, dur: 0.08, vol: 0.16 });
    this._tone({ type: 'sine', freq: 1568, dur: 0.12, vol: 0.16, delay: 0.07 });
  }

  // Safehouse rest: a soft warm chord that says the day is done.
  rest() {
    if (!this.ctx) return;
    this._tone({ type: 'sine', freq: 261.63, dur: 0.7, vol: 0.1 });
    this._tone({ type: 'sine', freq: 329.63, dur: 0.7, vol: 0.1, delay: 0.05 });
    this._tone({ type: 'sine', freq: 392.0, dur: 0.9, vol: 0.1, delay: 0.1 });
  }
}
