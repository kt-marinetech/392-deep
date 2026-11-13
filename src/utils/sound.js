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

  // 1. Heavy muffled mechanical latch thud
  const latchOsc = ctx.createOscillator();
  const latchGain = ctx.createGain();
  const latchFilter = ctx.createBiquadFilter();
  latchOsc.type = 'triangle';
  latchOsc.frequency.setValueAtTime(140, now);
  latchOsc.frequency.exponentialRampToValueAtTime(44, now + 0.18);

  latchFilter.type = 'lowpass';
  latchFilter.frequency.setValueAtTime(280, now);

  latchGain.gain.setValueAtTime(0.001, now);
  latchGain.gain.linearRampToValueAtTime(0.11, now + 0.015);
  latchGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

  latchOsc.connect(latchFilter);
  latchFilter.connect(latchGain);
  latchGain.connect(ctx.destination);
  latchOsc.start(now);
  latchOsc.stop(now + 0.26);

  // 2. Muffled hydraulic underwater slide (filtered noise)
  const bufferSize = Math.floor(ctx.sampleRate * 0.45);
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(190, now + 0.03);
  noiseFilter.frequency.exponentialRampToValueAtTime(95, now + 0.44);
  noiseFilter.Q.value = 1.4;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.001, now + 0.02);
  noiseGain.gain.linearRampToValueAtTime(0.075, now + 0.09);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(now + 0.02);
  noise.stop(now + 0.46);

  // 3. Soft deep resonant confirmation tone
  [196, 293.66].forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + 0.1 + idx * 0.08);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(640, now + 0.1);

    gain.gain.setValueAtTime(0.001, now + 0.1 + idx * 0.08);
    gain.gain.linearRampToValueAtTime(0.032, now + 0.13 + idx * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55 + idx * 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + 0.1 + idx * 0.08);
    osc.stop(now + 0.58 + idx * 0.08);
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
