// SOLMAR BAY — sound (round 7 rebuild, builder D).
// Synthesized WebAudio only: beeps, tones and a noise burst for gunfire.
// No audio files, no network. Everything is guarded, so a browser with
// no audio (or a headless one) never throws. The audio context is only
// created after a real user gesture, and the engine hum follows the car.

export function init(ctx) {
  const S = ctx.state;
  let audioCtx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let engineOn = false;

  function ensure() {
    if (audioCtx) return audioCtx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
      master = audioCtx.createGain();
      master.gain.value = 0.16;
      master.connect(audioCtx.destination);
      return audioCtx;
    } catch (e) {
      audioCtx = null;
      return null;
    }
  }

  // First gesture unlocks audio; nothing is created before this.
  const unlock = () => { try { ensure(); } catch (e) { /* silent */ } };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });

  function tone(freq, dur, type, vol, slideTo) {
    try {
      const ac = ensure();
      if (!ac || !master) return;
      if (ac.state === 'suspended') ac.resume().catch(() => {});
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, ac.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + dur);
      gain.gain.setValueAtTime(vol || 0.5, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      osc.stop(ac.currentTime + dur);
    } catch (e) { /* sound must never throw */ }
  }

  function noiseBurst(dur, vol) {
    try {
      const ac = ensure();
      if (!ac || !master) return;
      if (ac.state === 'suspended') ac.resume().catch(() => {});
      const len = Math.max(1, Math.floor(ac.sampleRate * dur));
      const buffer = ac.createBuffer(1, len, ac.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ac.createBufferSource();
      src.buffer = buffer;
      const gain = ac.createGain();
      gain.gain.value = vol || 0.7;
      src.connect(gain);
      gain.connect(master);
      src.start();
    } catch (e) { /* sound must never throw */ }
  }

  function setEngine(on, speed) {
    try {
      if (!on) {
        if (engineGain) engineGain.gain.value = 0;
        engineOn = false;
        return;
      }
      const ac = ensure();
      if (!ac || !master) return;
      if (ac.state === 'suspended') ac.resume().catch(() => {});
      if (!engineOsc) {
        engineOsc = ac.createOscillator();
        engineOsc.type = 'sawtooth';
        engineGain = ac.createGain();
        engineGain.gain.value = 0;
        engineOsc.connect(engineGain);
        engineGain.connect(master);
        engineOsc.start();
      }
      const mph = typeof speed === 'number' ? speed : 0;
      engineOsc.frequency.setValueAtTime(48 + mph * 1.4, ac.currentTime);
      engineGain.gain.value = 0.05;
      engineOn = true;
    } catch (e) { /* sound must never throw */ }
  }

  const sfx = {
    click() { tone(880, 0.06, 'square', 0.25); },
    shot() { noiseBurst(0.14, 0.8); tone(160, 0.1, 'square', 0.35, 60); },
    pickup() { tone(660, 0.09, 'sine', 0.4); setTimeout(() => tone(990, 0.12, 'sine', 0.4), 70); },
    coin() { tone(1320, 0.08, 'sine', 0.35); setTimeout(() => tone(1760, 0.14, 'sine', 0.3), 80); },
    denied() { tone(220, 0.16, 'square', 0.3, 160); },
    engine(on, speed) { setEngine(on, speed); },
  };

  ctx.api.audio = sfx;
  ctx.api.sfx = sfx;
  ctx.api.playClick = () => sfx.click();
  ctx.api.playShot = () => sfx.shot();
  ctx.api.playPickup = () => sfx.pickup();
  ctx.api.setEngineSound = (on, speed) => sfx.engine(on, speed);

  // The engine hum follows the car; it stays silent until audio was
  // unlocked by a gesture, and setEngine no-ops until then.
  ctx.updates.push(() => {
    try {
      if (!audioCtx) return;
      if (S.mode !== 'playing') {
        if (engineOn) setEngine(false, 0);
        return;
      }
      const car = S.car;
      let speed = 0;
      if (car) {
        if (typeof car.speed === 'number') speed = car.speed;
        else if (car.vel && typeof car.vel.length === 'function') speed = car.vel.length();
      }
      setEngine(!!car, speed);
    } catch (e) { /* sound must never break the loop */ }
  });
}
