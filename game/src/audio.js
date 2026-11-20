// audio.js — SOLMAR BAY, round 8 rebuild.
// All sound is synthesized with WebAudio: short oscillator blips for
// the UI and pickups, a square-wave bark for gunshots, and a low
// sawtooth hum whose pitch follows the car for the engine. No audio
// files, no network. Every call is guarded, so a browser without audio
// — or a headless one — simply hears nothing and the game never throws.
// Nothing starts until the player interacts: the context is created and
// resumed on the first pointer or key gesture.

export function init(ctx) {
  const S = ctx.state;
  let ac = null;
  let engineOsc = null;
  let engineGain = null;
  let engineOn = false;

  function ensure() {
    if (ac) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ac = new AC();
      engineOsc = ac.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ac.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain);
      engineGain.connect(ac.destination);
      engineOsc.start();
      engineOn = true;
      return true;
    } catch (e) {
      ac = null;
      engineOsc = null;
      engineGain = null;
      return false;
    }
  }

  function unlock() {
    try {
      if (ensure() && ac.state === 'suspended') ac.resume();
    } catch (e) { /* audio is best-effort */ }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  function tone(freq, dur, type, vol, slideTo) {
    try {
      if (!ensure()) return;
      if (ac.state === 'suspended') return;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, ac.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), ac.currentTime + dur);
      gain.gain.setValueAtTime(vol || 0.1, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + dur + 0.02);
    } catch (e) { /* never let a blip break the game */ }
  }

  function click() {
    tone(1250, 0.05, 'square', 0.06);
  }

  function pickup() {
    tone(880, 0.09, 'sine', 0.12);
    try {
      setTimeout(() => tone(1318, 0.12, 'sine', 0.12), 90);
    } catch (e) { /* one blip is enough */ }
  }

  function gunshot() {
    tone(170, 0.14, 'square', 0.16, 55);
  }

  function engineSet(speed) {
    try {
      if (!ac || !engineOsc || !engineGain || !engineOn) return;
      if (ac.state === 'suspended') return;
      const sp = Math.max(0, Number(speed) || 0);
      const freq = 52 + Math.min(95, sp * 2.2);
      engineOsc.frequency.setTargetAtTime(freq, ac.currentTime, 0.1);
      const target = S.car ? 0.04 : 0.0;
      engineGain.gain.setTargetAtTime(target, ac.currentTime, 0.2);
    } catch (e) { /* the hum is cosmetic */ }
  }

  ctx.api.audio = {
    ensure,
    unlock,
    click,
    pickup,
    gunshot,
    tone,
    engineSet,
  };

  ctx.updates.push(() => {
    if (!ac) return;
    const speed = S.car
      ? (typeof S.car.speed === 'number' ? S.car.speed : 0)
      : 0;
    engineSet(speed);
  });
}
