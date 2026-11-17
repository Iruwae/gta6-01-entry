// SOLMAR BAY — all sound is synthesized WebAudio, no audio files: engine
// hum, police siren, gunshots, pickups, explosions and a bassline groove.
export class AudioSys {
  constructor() {
    this.ctx = null; this.master = null; this.muted = false;
    this.engineOsc = null; this.engineGain = null;
    this.sirenOsc = null; this.sirenGain = null; this.sirenOn = false;
    this.musicTimer = null; this.musicStep = 0;
  }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    // Engine: two detuned saws through a lowpass, pitch follows speed.
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    const engineOsc2 = this.ctx.createOscillator();
    engineOsc2.type = 'square';
    engineOsc2.frequency.value = 28;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 320;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineOsc.connect(lp); engineOsc2.connect(lp);
    lp.connect(this.engineGain); this.engineGain.connect(this.master);
    this.engineOsc.start(); engineOsc2.start();
    this._engineOsc2 = engineOsc2;
    // Siren: triangle that sweeps up and down while wanted.
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'triangle';
    this.sirenOsc.frequency.value = 700;
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0;
    this.sirenOsc.connect(this.sirenGain); this.sirenGain.connect(this.master);
    this.sirenOsc.start();
    this.startMusic();
  }
  setEngine(speed01, on) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.engineGain.gain.setTargetAtTime(on ? 0.05 + speed01 * 0.09 : 0, t, 0.1);
    this.engineOsc.frequency.setTargetAtTime(50 + speed01 * 130, t, 0.1);
    this._engineOsc2.frequency.setTargetAtTime(26 + speed01 * 60, t, 0.1);
  }
  setSiren(on, t) {
    if (!this.ctx) return;
    this.sirenOn = on;
    this.sirenGain.gain.setTargetAtTime(on ? 0.045 : 0, this.ctx.currentTime, 0.2);
    if (on) this.sirenOsc.frequency.setTargetAtTime(650 + Math.sin(t * 3.2) * 220, this.ctx.currentTime, 0.05);
  }
  blip(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol || 0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  noise(dur, vol, low) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = low || 1200;
    const g = this.ctx.createGain();
    g.gain.value = vol || 0.25;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
  }
  shoot() { this.noise(0.12, 0.35, 3000); this.blip(180, 0.08, 'square', 0.12, 60); }
  enemyShoot() { this.noise(0.1, 0.15, 2200); }
  pickup() { this.blip(660, 0.09, 'sine', 0.2); setTimeout(() => this.blip(990, 0.14, 'sine', 0.2), 80); }
  cash() { this.blip(880, 0.08, 'sine', 0.18); setTimeout(() => this.blip(1174, 0.08, 'sine', 0.18), 70); setTimeout(() => this.blip(1568, 0.16, 'sine', 0.18), 140); }
  hit() { this.blip(140, 0.1, 'sawtooth', 0.2, 70); }
  hurt() { this.blip(220, 0.25, 'sawtooth', 0.22, 55); }
  explosion() { this.noise(0.7, 0.5, 500); this.blip(90, 0.6, 'sine', 0.4, 30); }
  sirenBlip() { this.blip(900, 0.15, 'triangle', 0.12, 1400); }
  missionDone() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.18, 'sine', 0.2), i * 110)); }
  busted() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this.blip(f, 0.25, 'triangle', 0.2), i * 160)); }
  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }
  // A lazy bassline groove: root notes of a i–VI–III–VII loop, plus a hat tick.
  startMusic() {
    const roots = [55, 43.65, 65.41, 49];
    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.muted) return;
      const root = roots[Math.floor(this.musicStep / 4) % 4];
      const beat = this.musicStep % 4;
      if (beat === 0 || beat === 2) this.blip(root, 0.22, 'triangle', 0.1);
      if (beat === 3) this.blip(root * 1.5, 0.12, 'triangle', 0.07);
      if (this.musicStep % 2 === 1) this.noise(0.03, 0.03, 8000);
      this.musicStep++;
    }, 300);
  }
}
