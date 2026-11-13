let audioCtx = null;
let muted = false;

function getContext() {
  if (muted || typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundMuted() {
  return muted;
}

export function setSoundMuted(value) {
  muted = Boolean(value);
}

export function playSonarStep() {
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(195, now + 0.18);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(580, now);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.04, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.24);
}

export function playGateOpen() {
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  [293.66, 440].forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.08);

    gain.gain.setValueAtTime(0.001, now + idx * 0.08);
    gain.gain.linearRampToValueAtTime(0.045, now + idx * 0.08 + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.42);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + idx * 0.08);
    osc.stop(now + idx * 0.08 + 0.45);
  });
}

export function playTrapImpact() {
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(128, now);
  osc.frequency.exponentialRampToValueAtTime(52, now + 0.34);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(340, now);
  filter.frequency.exponentialRampToValueAtTime(110, now + 0.34);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.085, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.4);
}

export function playCompleteChord() {
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  [261.63, 329.63, 392.0, 523.25].forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.07);

    gain.gain.setValueAtTime(0.001, now + idx * 0.07);
    gain.gain.linearRampToValueAtTime(0.035, now + idx * 0.07 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.07 + 0.75);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + idx * 0.07);
    osc.stop(now + idx * 0.07 + 0.8);
  });
}
