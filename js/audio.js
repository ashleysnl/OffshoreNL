export class AudioSystem {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this.master = null;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }

  ensureContext() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.12;
    this.master.connect(this.ctx.destination);
  }

  unlock() {
    this.ensureContext();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  tone(freq, duration, type = 'square', volume = 0.1, slide = 0) {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx || !this.master) return;

    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide !== 0) {
      osc.frequency.linearRampToValueAtTime(freq + slide, t0 + duration);
    }

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.01);
  }

  play(name) {
    if (name === 'button') {
      this.tone(740, 0.06, 'square', 0.08, -60);
      return;
    }

    if (name === 'alarm') {
      this.tone(480, 0.08, 'sawtooth', 0.08, 80);
      setTimeout(() => this.tone(390, 0.08, 'sawtooth', 0.07, 70), 95);
      return;
    }

    if (name === 'gameover') {
      this.tone(420, 0.18, 'triangle', 0.09, -140);
      setTimeout(() => this.tone(280, 0.24, 'triangle', 0.08, -90), 150);
    }
  }
}
