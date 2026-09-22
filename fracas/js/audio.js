// Sons generes via WebAudio (aucun fichier externe requis) : bibliotheque etendue
// de sons courts, penses pour rester agreables (ondes douces sine/triangle, filtre
// passe-bas pour adoucir les rares ondes carrees/en dents de scie, enveloppes
// progressives) plutot que des bips "8-bit" agressifs.

const Audio2 = {
  ctx: null,
  on: true,
  volume: 0.7,
  _noiseBuffer: null,

  init() {
    this.on = Save.data ? Save.data.soundOn : true;
    this.volume = Save.data && Save.data.volume != null ? Save.data.volume : 0.7;
  },

  _ensureCtx() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },

  setOn(on) { this.on = on; Save.setSoundOn(on); },
  toggle() { this.setOn(!this.on); },
  setVolume(v) { this.volume = clamp(v, 0, 1); Save.setVolume(this.volume); },

  _ready() { return this.on && this.volume > 0 && this._ensureCtx(); },

  _getNoiseBuffer(ctx) {
    if (this._noiseBuffer && this._noiseBuffer.sampleRate === ctx.sampleRate) return this._noiseBuffer;
    const len = ctx.sampleRate * 1;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.06 * white) / 1.06; // legerement lissee (plus proche d'un bruit rose que blanc pur)
      data[i] = last * 3.2;
    }
    this._noiseBuffer = buf;
    return buf;
  },

  // Ton simple, avec un filtre passe-bas doux optionnel pour arrondir les angles
  // des ondes carrees/dents de scie (evite le cote "buzzy" agressif).
  _beep(freq, dur, type, gainMax, sweepTo, mellow) {
    const ctx = this._ready();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (sweepTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, sweepTo), t0 + dur);
    const peak = (gainMax || 0.13) * this.volume;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(Math.max(0.0002, peak), t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = osc;
    if (mellow !== false && (type === 'square' || type === 'sawtooth')) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(Math.max(freq * 2.4, 900), t0);
      lp.Q.value = 0.4;
      osc.connect(lp);
      node = lp;
    }
    node.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  },

  // Rafale de bruit filtre (whoosh, impact sourd, souffle de vent...), version "rose"
  // douce plutot que du bruit blanc plein spectre.
  _noise(dur, gainMax, filterFreq, filterType, sweepTo, q) {
    const ctx = this._ready();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this._getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = filterType || 'bandpass';
    filter.frequency.setValueAtTime(filterFreq || 1200, t0);
    if (sweepTo) filter.frequency.exponentialRampToValueAtTime(Math.max(40, sweepTo), t0 + dur);
    filter.Q.value = q != null ? q : 0.7;
    const gain = ctx.createGain();
    const peak = (gainMax || 0.13) * this.volume;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(Math.max(0.0003, peak), t0 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.03);
  },

  // Plusieurs oscillateurs doux en parallele (accord), pour les sons plus "riches"
  // sans jamais etre stridents (sine/triangle uniquement).
  _chord(freqs, dur, type, gainMax) {
    const ctx = this._ready();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    for (const f of freqs) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(f, t0);
      const peak = (gainMax || 0.1) * this.volume;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(Math.max(0.0002, peak), t0 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.03);
    }
  },

  // ---------------- Palette generique ----------------
  attack() { this._beep(480, 0.07, 'triangle', 0.08, 620); },
  impact() { this._beep(180, 0.09, 'sine', 0.11, 90); this._noise(0.05, 0.04, 900, 'bandpass', 500, 1.2); },
  ability() { this._beep(660, 0.14, 'triangle', 0.12, 880); },
  hurt() { this._beep(150, 0.16, 'sine', 0.13, 80); this._noise(0.08, 0.04, 500, 'lowpass', 200); },
  turretDown() { this._beep(340, 0.22, 'triangle', 0.12, 130, false); },
  boss() { this._beep(85, 0.5, 'sine', 0.18, 55); this._noise(0.35, 0.08, 300, 'lowpass', 90); },
  record() {
    if (!this._ready()) return;
    this._chord([660, 830], 0.12, 'sine', 0.12);
    setTimeout(() => this._chord([880, 1108, 1320], 0.22, 'sine', 0.12), 110);
  },

  // ---------------- Palette signature (une par grand type d'effet) ----------------
  teleport() {
    this._beep(320, 0.15, 'sine', 0.11, 1050);
    this._noise(0.09, 0.035, 2400, 'highpass', 4200, 0.6);
  },
  zap() {
    this._beep(1200, 0.06, 'triangle', 0.08, 380);
    this._beep(1700, 0.04, 'triangle', 0.05, 700);
  },
  crackle() {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => this._beep(1400 + Math.random() * 500, 0.04, 'triangle', 0.055, 260 + Math.random() * 200), i * 30);
    }
  },
  charge(dur) {
    this._beep(160, dur || 0.6, 'triangle', 0.075, 620);
  },
  heal() {
    this._chord([660, 990], 0.2, 'sine', 0.1);
    setTimeout(() => this._chord([880, 1320], 0.22, 'sine', 0.1), 110);
  },
  freeze() {
    this._beep(1200, 0.24, 'sine', 0.09, 550);
    this._noise(0.16, 0.035, 2800, 'highpass', 4800, 0.6);
  },
  shield() {
    this._chord([440, 660, 880], 0.28, 'sine', 0.08);
    this._noise(0.14, 0.04, 1600, 'bandpass', 2200, 0.6);
  },
  boom2() {
    this._noise(0.32, 0.16, 450, 'lowpass', 90, 0.5);
    this._beep(75, 0.32, 'sine', 0.14, 38);
  },
  whoosh() {
    this._noise(0.26, 0.1, 280, 'bandpass', 1500, 0.6);
  },
  gust() {
    this._noise(0.38, 0.085, 550, 'lowpass', 1900, 0.6);
  },
  spark() {
    this._beep(880, 0.07, 'triangle', 0.08, 1700);
  },
  gravity() {
    this._beep(190, 0.42, 'sine', 0.1, 55);
    this._noise(0.28, 0.04, 240, 'lowpass', 90, 0.5);
  },
  lockOn() {
    this._beep(480, 0.05, 'triangle', 0.06);
    setTimeout(() => this._beep(820, 0.06, 'triangle', 0.07), 70);
  },
};
