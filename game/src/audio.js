// audio.js — SOLMAR BAY sound effects.
// Tiny WebAudio synth for UI blips, gunshots, reloads and cash. No audio
// files, no network: every sound is an oscillator shaped in code. If the
// browser has no audio context, every call silently does nothing.
export function init(ctx) {
  const S = ctx.state || ctx.S;
  let ac = null;

  function ensure() {
    try {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) ac = new AC();
      }
      if (ac && ac.state === 'suspended') ac.resume();
    } catch (e) { ac = null; }
    return ac;
  }

  function tone(freq, dur, type, vol, slideTo) {
    const a = ensure();
    if (!a) return;
    try {
      const osc = a.createOscillator();
      const gain = a.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, a.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, a.currentTime + dur);
      gain.gain.setValueAtTime(vol || 0.06, a.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
      osc.connect(gain);
      gain.connect(a.destination);
      osc.start();
      osc.stop(a.currentTime + dur + 0.02);
    } catch (e) { /* stay silent rather than crash the game */ }
  }

  const api = {
    tone,
    blip() { tone(660, 0.08, 'square', 0.04); },
    click() { tone(520, 0.05, 'square', 0.03); },
    shoot() { tone(190, 0.07, 'sawtooth', 0.05, 70); },
    reload() { tone(440, 0.09, 'triangle', 0.05); setTimeout(() => tone(620, 0.09, 'triangle', 0.05), 110); },
    cash() { tone(880, 0.09, 'sine', 0.06); setTimeout(() => tone(1318, 0.14, 'sine', 0.06), 90); },
    pickup() { tone(740, 0.1, 'sine', 0.06); setTimeout(() => tone(988, 0.12, 'sine', 0.05), 80); },
    crash() { tone(120, 0.25, 'sawtooth', 0.07, 40); },
    siren() { tone(700, 0.3, 'sine', 0.02, 950); },
    ensure,
  };

  // Warm the audio context up on the first gesture, so later sounds
  // are allowed to play.
  const warm = () => ensure();
  window.addEventListener('pointerdown', warm, { once: true });
  window.addEventListener('keydown', warm, { once: true });

  ctx.api = ctx.api || {};
  ctx.api.audio = api;
  S.audioDirector = api;
}
