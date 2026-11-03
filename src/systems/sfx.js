// Sfx: tiny WebAudio synth, so there are no audio files to load.
// The AudioContext is only created inside a pointer event (browser autoplay rules).
export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
    try { this.muted = localStorage.getItem('toybox-muted') === '1'; } catch (e) { /* storage blocked */ }
  }

  ready() {
    if (this.muted) return false;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  toggle() {
    this.muted = !this.muted;
    try { localStorage.setItem('toybox-muted', this.muted ? '1' : '0'); } catch (e) { /* ignore */ }
    return this.muted;
  }

  // One oscillator with a quick attack and exponential decay.
  tone({ from, to = from, dur = 0.12, type = 'sine', vol = 0.2, delay = 0 }) {
    if (!this.ready()) return;
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // Filtered noise burst (used for crunches).
  noise({ dur = 0.06, vol = 0.25, freq = 1800, to = freq, delay = 0 }) {
    if (!this.ready()) return;
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(), filt = ctx.createBiquadFilter(), gain = ctx.createGain();
    src.buffer = buf;
    filt.type = 'bandpass';
    filt.frequency.setValueAtTime(freq, t);
    filt.frequency.exponentialRampToValueAtTime(to, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt).connect(gain).connect(ctx.destination);
    src.start(t);
  }

  pop()     { this.tone({ from: 380, to: 780, dur: 0.08, vol: 0.15 }); }
  thud(p)   { this.tone({ from: 150, to: 55, dur: 0.14, vol: 0.1 + 0.3 * p }); }
  boing()   { this.tone({ from: 200, to: 520, dur: 0.22, vol: 0.18 }); }
  sparkle() { this.tone({ from: 880, dur: 0.12, vol: 0.12 }); this.tone({ from: 1320, dur: 0.18, vol: 0.12, delay: 0.08 }); }
  cuddle()  { this.tone({ from: 520, dur: 0.14, vol: 0.14 }); this.tone({ from: 660, dur: 0.2, vol: 0.14, delay: 0.1 }); }
  giggle()  { [700, 880, 1040].forEach((f, i) => this.tone({ from: f, to: f * 1.15, dur: 0.07, vol: 0.12, delay: i * 0.07 })); }
  sour()    { this.tone({ from: 600, to: 260, dur: 0.35, type: 'triangle', vol: 0.16 }); }
  spicy()   { this.noise({ dur: 0.5, vol: 0.18, freq: 3500, to: 900 }); this.tone({ from: 300, to: 700, dur: 0.4, type: 'sawtooth', vol: 0.07 }); }
  yuck()    { this.tone({ from: 220, to: 120, dur: 0.4, type: 'sawtooth', vol: 0.12 }); }
  creak()   { this.tone({ from: 190, to: 130, dur: 0.28, type: 'sawtooth', vol: 0.05 }); this.tone({ from: 120, to: 170, dur: 0.2, type: 'triangle', vol: 0.08, delay: 0.1 }); }
  ding()    { this.tone({ from: 1200, dur: 0.25, vol: 0.14 }); this.tone({ from: 1600, dur: 0.35, vol: 0.12, delay: 0.12 }); }
  sizzle()  { this.noise({ dur: 0.7, vol: 0.1, freq: 5500, to: 3500 }); }
  click()   { this.tone({ from: 900, to: 500, dur: 0.05, type: 'square', vol: 0.08 }); }
  coin()    { this.tone({ from: 1300, dur: 0.08, vol: 0.12 }); this.tone({ from: 1750, dur: 0.18, vol: 0.12, delay: 0.07 }); }
  nope()    { this.tone({ from: 220, to: 160, dur: 0.18, type: 'square', vol: 0.07 }); }
  fanfare() { [523, 659, 784, 1046].forEach((f, i) => this.tone({ from: f, dur: 0.18, vol: 0.12, delay: i * 0.1 })); }
  whoosh()  { this.noise({ dur: 0.25, vol: 0.2, freq: 2800, to: 300 }); }
  crunch()  { for (let i = 0; i < 3; i++) this.noise({ delay: i * 0.09, freq: 1500 + i * 400 }); }
}

