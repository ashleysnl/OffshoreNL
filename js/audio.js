export class AudioSystem {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this.master = null;
    this.themeTimer = null;
    this.themeStep = 0;
    this.themeBpm = 132;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) this.stopTheme();
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
      this.stopTheme();
      this.tone(420, 0.18, 'triangle', 0.09, -140);
      setTimeout(() => this.tone(280, 0.24, 'triangle', 0.08, -90), 150);
    }
  }

  midiToHz(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  playThemeStep(step) {
    const lead = [72, 74, 76, 79, 76, 74, 72, 69, 67, 69, 71, 72, 71, 69, 67, 64];
    const bass = [40, 40, 43, 43, 36, 36, 38, 38, 40, 40, 43, 43, 35, 35, 38, 38];

    const leadNote = lead[step % lead.length];
    const bassNote = bass[step % bass.length];

    this.tone(this.midiToHz(leadNote), 0.11, 'square', 0.04, -10);
    if (step % 2 === 0) {
      this.tone(this.midiToHz(bassNote), 0.18, 'triangle', 0.05, 4);
    }

    if (step % 4 === 2) {
      this.tone(1400, 0.03, 'square', 0.015, -100);
    }
  }

  startTheme() {
    if (!this.enabled) return;
    this.unlock();
    if (!this.ctx || this.themeTimer) return;

    const stepMs = (60_000 / this.themeBpm) / 2;
    this.playThemeStep(this.themeStep);
    this.themeTimer = setInterval(() => {
      if (!this.enabled) return;
      this.playThemeStep(this.themeStep);
      this.themeStep = (this.themeStep + 1) % 64;
    }, stepMs);
  }

  stopTheme() {
    if (this.themeTimer) {
      clearInterval(this.themeTimer);
      this.themeTimer = null;
    }
  }

  setThemePlaying(shouldPlay) {
    if (!this.enabled || !shouldPlay) {
      this.stopTheme();
      return;
    }
    this.startTheme();
  }
}
