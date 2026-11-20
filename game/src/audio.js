// audio.js — SOLMAR BAY sound.
// Tiny WebAudio synth: UI blips, gunshots, pickup chimes, cash
// arpeggios and a soft engine hum that follows the car. Everything is
// lazy and guarded — if the browser has no audio, the game plays on
// silently instead of throwing.
export function init(ctx) {
  const S = ctx.state || ctx.S;

  let ac = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let muted = false;

  function ensure() {
    if (ac) {
      if (ac.state === 'suspended') ac.resume().catch(() => {});
      return ac;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0.16;
      master.connect(ac.destination);
      // Engine hum: a low sawtooth kept quiet until the car moves.
      engineOsc = ac.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 42;
      engineGain = ac.createGain();
      engineGain.gain.value = 0;
      const filt = ac.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 320;
      engineOsc.connect(filt);
      filt.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
    } catch (e) {
      ac = null;
    }
    return ac;
  }

  // Create the context on the first real gesture so autoplay rules pass.
  window.addEventListener('pointerdown', ensure, { once: true });
  window.addEventListener('keydown', ensure, { once: true });

  function tone(freq, dur, type, vol, when) {
    if (muted) return;
    const ctx2 = ensure();
    if (!ctx2 || !master) return;
    try {
      const t0 = ctx2.currentTime + (when || 0);
      const o = ctx2.createOscillator();
      const g = ctx2.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol == null ? 0.5 : vol, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + (dur || 0.12));
      o.connect(g);
      g.connect(master);
      o.start(t0);
      o.stop(t0 + (dur || 0.12) + 0.02);
    } catch (e) { /* never let a beep crash the game */ }
  }

  function shot() {
    if (muted) return;
    const ctx2 = ensure();
    if (!ctx2 || !master) return;
    try {
      const len = Math.floor(ctx2.sampleRate * 0.09);
      const buf = ctx2.createBuffer(1, len, ctx2.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx2.createBufferSource();
      src.buffer = buf;
      const g = ctx2.createGain();
      g.gain.value = 0.7;
      src.connect(g);
      g.connect(master);
      src.start();
      tone(140, 0.08, 'square', 0.25);
    } catch (e) { /* ignore */ }
  }

  function pickup() { tone(660, 0.1, 'sine', 0.5); tone(990, 0.14, 'sine', 0.5, 0.08); }
  function cash() { tone(880, 0.09, 'triangle', 0.5); tone(1174, 0.09, 'triangle', 0.5, 0.07); tone(1568, 0.16, 'triangle', 0.5, 0.14); }
  function ui() { tone(520, 0.06, 'sine', 0.35); }
  function jingle() { tone(392, 0.1, 'triangle', 0.4); tone(523, 0.12, 'triangle', 0.4, 0.09); }
  function error() { tone(180, 0.16, 'square', 0.3); }

  function setMuted(m) {
    muted = !!m;
    if (master) master.gain.value = muted ? 0 : 0.16;
  }

  if (Array.isArray(ctx.updates)) {
    ctx.updates.push(() => {
      try {
        if (!engineOsc || !engineGain || !ac) return;
        const car = S && S.car;
        if (car && S.mode === 'playing') {
          const sp = typeof car.speed === 'number' ? Math.abs(car.speed) : 0;
          engineOsc.frequency.value = 42 + Math.min(90, sp * 1.6);
          engineGain.gain.value = muted ? 0 : Math.min(0.05, 0.012 + sp * 0.0006);
        } else {
          engineGain.gain.value = 0;
        }
      } catch (e) { /* ignore */ }
    });
  }

  ctx.api.audio = {
    ensure, tone, shot, pickup, cash, ui, jingle, error,
    setMuted, get muted() { return muted; },
  };
  ctx.api.playSound = tone;
}
