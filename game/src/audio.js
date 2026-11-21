// SOLMAR BAY — tiny WebAudio synth for UI blips, gunshots, reloads and
// cash. No audio files, no network. If the browser has no audio context,
// every call silently does nothing.
export function init(ctx) {
  let ac = null;
  function context() {
    if (ac) return ac;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
    } catch (e) {
      return null;
    }
    return ac;
  }
  function tone(freq, dur, type, vol, slideTo) {
    const c = context();
    if (!c) return;
    try {
      if (c.state === 'suspended') c.resume();
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, c.currentTime);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
      g.gain.setValueAtTime(vol || 0.12, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      o.connect(g);
      g.connect(c.destination);
      o.start();
      o.stop(c.currentTime + dur);
    } catch (e) { /* silent */ }
  }
  function noise(dur, vol) {
    const c = context();
    if (!c) return;
    try {
      if (c.state === 'suspended') c.resume();
      const len = Math.floor(c.sampleRate * dur);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource();
      src.buffer = buf;
      const g = c.createGain();
      g.gain.setValueAtTime(vol || 0.2, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      src.connect(g);
      g.connect(c.destination);
      src.start();
    } catch (e) { /* silent */ }
  }

  ctx.api.audio = {
    blip() { tone(660, 0.08, 'square', 0.08); },
    click() { tone(220, 0.05, 'square', 0.06); },
    shot(name) {
      if (name === 'SHOTGUN') noise(0.22, 0.35);
      else if (name === 'SMG') noise(0.07, 0.16);
      else if (name === 'RIFLE') { noise(0.14, 0.28); tone(180, 0.1, 'sawtooth', 0.1, 60); }
      else noise(0.1, 0.22);
    },
    reload() { tone(440, 0.07, 'square', 0.07); setTimeout(() => tone(580, 0.07, 'square', 0.07), 120); },
    cash() { tone(880, 0.1, 'sine', 0.1); setTimeout(() => tone(1320, 0.14, 'sine', 0.1), 100); },
  };
  ctx.audioReady = true;
}
