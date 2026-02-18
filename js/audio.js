export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.started = false;
    this.enabled = true;
  }

  init() {
    if (this.started) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.78;
    this.master.connect(this.ctx.destination);
    this.started = true;
  }

  setEnabled(value) {
    this.enabled = Boolean(value);
    if (this.master) {
      this.master.gain.setTargetAtTime(this.enabled ? 0.78 : 0.0001, this.ctx.currentTime, 0.02);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  tone({ freq = 440, duration = 0.08, type = 'sine', gain = 0.12, slide = 0, when = 0 } = {}) {
    if (!this.started || !this.enabled || !this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide !== 0) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + duration);
    }
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(amp);
    amp.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  noiseBurst({ duration = 0.08, gain = 0.09, when = 0 } = {}) {
    if (!this.started || !this.enabled || !this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + when;
    const buffer = this.ctx.createBuffer(1, Math.max(1, Math.floor(this.ctx.sampleRate * duration)), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
    }
    const src = this.ctx.createBufferSource();
    const hp = this.ctx.createBiquadFilter();
    const amp = this.ctx.createGain();
    hp.type = 'highpass';
    hp.frequency.value = 880;
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.buffer = buffer;
    src.connect(hp);
    hp.connect(amp);
    amp.connect(this.master);
    src.start(t0);
  }

  playShoot() {
    this.tone({ freq: 670, duration: 0.05, type: 'square', gain: 0.07, slide: 250 });
  }

  playEnemyHit() {
    this.tone({ freq: 260, duration: 0.07, type: 'triangle', gain: 0.08, slide: -60 });
  }

  playExplosion(big = false) {
    this.noiseBurst({ duration: big ? 0.18 : 0.1, gain: big ? 0.14 : 0.08 });
    this.tone({ freq: big ? 90 : 140, duration: big ? 0.2 : 0.1, type: 'sawtooth', gain: 0.09, slide: -40 });
  }

  playPlayerHit() {
    this.tone({ freq: 190, duration: 0.16, type: 'sawtooth', gain: 0.11, slide: -80 });
  }

  playBossWarning() {
    this.tone({ freq: 220, duration: 0.1, type: 'square', gain: 0.1 });
    this.tone({ freq: 300, duration: 0.1, type: 'square', gain: 0.1, when: 0.12 });
  }

  playBossNote() {
    this.tone({ freq: 440 + Math.random() * 200, duration: 0.09, type: 'triangle', gain: 0.08, slide: -50 });
  }

  playUI() {
    this.tone({ freq: 520, duration: 0.05, type: 'triangle', gain: 0.06, slide: 70 });
  }
}
