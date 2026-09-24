// Sons generes via WebAudio (aucun fichier externe) : moteur de synthese "realiste".
// Chaque son imite un phenomene reel (detonation, arc electrique, lame qui fend l'air,
// explosion, vent, glace qui craque...) a partir de bruits filtres, de transitoires et de
// partiels inharmoniques, passes dans une petite reverberation et un compresseur communs.

const Audio2 = {
  ctx: null,
  on: true,
  volume: 0.7,
  _buffers: {},
  _last: {},
  _bus: null,

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

  // Evite qu'un meme son joue des dizaines de fois dans la meme fraction de seconde.
  _can(name, ms) {
    const now = performance.now();
    if (this._last[name] && now - this._last[name] < ms) return false;
    this._last[name] = now;
    return true;
  },

  // Chaine de sortie : compresseur (evite la saturation) + reverberation courte (espace).
  _out() {
    const ctx = this.ctx;
    if (this._bus && this._bus.ctx === ctx) return this._bus;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
    comp.connect(ctx.destination);
    const dry = ctx.createGain(); dry.gain.value = 1; dry.connect(comp);
    const verb = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 1.1);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    verb.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.16;
    verb.connect(wet).connect(comp);
    this._bus = { ctx, dry, verb };
    return this._bus;
  },
  // Point d'entree d'un son : gain -> (sec + envoi reverb dose par "space").
  _dest(space) {
    const bus = this._out();
    const g = this.ctx.createGain();
    g.connect(bus.dry);
    if (space) { const s = this.ctx.createGain(); s.gain.value = space; g.connect(s).connect(bus.verb); }
    return g;
  },

  _noiseBuf(kind) {
    const ctx = this.ctx;
    const key = kind + ctx.sampleRate;
    if (this._buffers[key]) return this._buffers[key];
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'white') d[i] = w;
      else if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else { b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0527; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; }
    }
    this._buffers[key] = buf;
    return buf;
  },

  // Rafale de bruit filtre avec enveloppe (attaque, maintien, declin exponentiel).
  _burst(o) {
    const ctx = this.ctx, t0 = ctx.currentTime + (o.delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuf(o.noise || 'white');
    src.playbackRate.value = o.rate || 1;
    const f = ctx.createBiquadFilter();
    f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.freq || 1000, t0);
    if (o.freqTo) f.frequency.exponentialRampToValueAtTime(Math.max(30, o.freqTo), t0 + (o.sweep || o.dur));
    f.Q.value = o.q != null ? o.q : 0.8;
    const g = ctx.createGain();
    const peak = (o.gain || 0.2) * this.volume;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + (o.attack || 0.004));
    if (o.hold) g.gain.setValueAtTime(peak, t0 + (o.attack || 0.004) + o.hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    src.connect(f).connect(g).connect(this._dest(o.space));
    src.start(t0, Math.random() * 1.5);
    src.stop(t0 + o.dur + 0.05);
    return { src, f, g, t0 };
  },

  // Oscillateur avec glissement de frequence et enveloppe percussive.
  _tone(o) {
    const ctx = this.ctx, t0 = ctx.currentTime + (o.delay || 0);
    const osc = ctx.createOscillator();
    osc.type = o.wave || 'sine';
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.freqTo) osc.frequency.exponentialRampToValueAtTime(Math.max(15, o.freqTo), t0 + (o.sweep || o.dur));
    if (o.detune) osc.detune.value = o.detune;
    const g = ctx.createGain();
    const peak = (o.gain || 0.15) * this.volume;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + (o.attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    let node = osc;
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; osc.connect(f); node = f; }
    node.connect(g).connect(this._dest(o.space));
    osc.start(t0); osc.stop(t0 + o.dur + 0.05);
    return { osc, g, t0 };
  },

  // Suite de micro-claquements (etincelles, crepitement de feu, craquement de glace, debris).
  _clicks(n, spread, o) {
    for (let i = 0; i < n; i++) {
      this._burst(Object.assign({ noise: 'white', type: 'highpass', freq: 2500, q: 0.7, dur: 0.012 + Math.random() * 0.02, gain: 0.12 }, o, { delay: (o.delay || 0) + Math.random() * spread, gain: (o.gain || 0.12) * (0.4 + Math.random() * 0.8) }));
    }
  },

  // ================= Sons =================

  // Detonation d'arme a feu : claquement sec + corps grave + petite queue de reverberation.
  gunshot(v) {
    if (!this._ready() || !this._can('gun', 45)) return;
    const k = v == null ? 1 : v;
    this._burst({ noise: 'white', type: 'highpass', freq: 1400, dur: 0.09, gain: 0.32 * k, space: 0.5 });
    this._burst({ noise: 'white', type: 'bandpass', freq: 3200, q: 1.2, dur: 0.03, gain: 0.25 * k });
    this._tone({ freq: 160, freqTo: 48, dur: 0.14, gain: 0.3 * k });
  },
  // Tir d'une tourelle / d'un boss : plus sourd et metallique, pour se distinguer des tirs du joueur.
  enemyShot() {
    if (!this._ready() || !this._can('eshot', 70)) return;
    this._burst({ noise: 'pink', type: 'bandpass', freq: 900, q: 1.1, dur: 0.1, gain: 0.16, space: 0.35 });
    this._tone({ freq: 120, freqTo: 55, dur: 0.12, gain: 0.14 });
    this._tone({ wave: 'triangle', freq: 1650, freqTo: 1500, dur: 0.06, gain: 0.025 });
  },
  // Arc electrique : bourdonnement hache + crepitements hautes frequences.
  electric(dur) {
    if (!this._ready() || !this._can('elec', 60)) return;
    const ctx = this.ctx, d = dur || 0.2, t0 = ctx.currentTime;
    const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 95 + Math.random() * 30;
    const osc2 = ctx.createOscillator(); osc2.type = 'square'; osc2.frequency.value = 180 + Math.random() * 40;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = 1.4;
    const g = ctx.createGain();
    const peak = 0.13 * this.volume;
    g.gain.setValueAtTime(0.0001, t0);
    // gain "hache" au hasard : c'est ce qui donne le grezillement d'un arc
    for (let t = 0; t < d; t += 0.008) g.gain.setValueAtTime(Math.random() < 0.65 ? peak * (0.3 + Math.random() * 0.7) : 0.0001, t0 + t);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.02);
    osc.connect(bp); osc2.connect(bp); bp.connect(g).connect(this._dest(0.25));
    osc.start(t0); osc2.start(t0); osc.stop(t0 + d + 0.05); osc2.stop(t0 + d + 0.05);
    this._clicks(9, d, { freq: 3500, gain: 0.16 });
    this._burst({ noise: 'white', type: 'highpass', freq: 5000, dur: 0.05, gain: 0.12 });
  },
  // Etincelle / petit claquement electrique.
  spark() {
    if (!this._ready() || !this._can('spark', 50)) return;
    this._clicks(4, 0.06, { freq: 4000, gain: 0.14 });
    this._tone({ wave: 'triangle', freq: 2400, freqTo: 1900, dur: 0.08, gain: 0.04 });
  },
  // Lame qui fend l'air puis tinte (couteaux de Ferro).
  knifeThrow() {
    if (!this._ready() || !this._can('knife', 60)) return;
    this._burst({ noise: 'pink', type: 'bandpass', freq: 900, freqTo: 4200, q: 2, dur: 0.16, gain: 0.2, attack: 0.02 });
    for (const [f, g] of [[3150, 0.03], [4630, 0.02], [6120, 0.012]]) this._tone({ freq: f, dur: 0.28, gain: g, delay: 0.01, space: 0.4 });
  },
  // Boomerang qui tournoie (vrombissement module).
  boomerang() {
    if (!this._ready() || !this._can('boom', 80)) return;
    const b = this._burst({ noise: 'pink', type: 'bandpass', freq: 1700, freqTo: 800, q: 3, dur: 0.45, gain: 0.2, attack: 0.03, hold: 0.15 });
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 21;
    const depth = this.ctx.createGain(); depth.gain.value = 0.12 * this.volume;
    lfo.connect(depth).connect(b.g.gain);
    lfo.start(b.t0); lfo.stop(b.t0 + 0.5);
  },
  // Flammes : souffle grave + crepitement.
  fire(v) {
    if (!this._ready() || !this._can('fire', 110)) return;
    const k = v == null ? 1 : v;
    this._burst({ noise: 'brown', type: 'lowpass', freq: 900, freqTo: 400, dur: 0.35 * Math.max(0.6, k), gain: 0.22 * k, attack: 0.03, space: 0.3 });
    this._burst({ noise: 'pink', type: 'bandpass', freq: 1500, q: 0.8, dur: 0.2, gain: 0.07 * k });
    this._clicks(Math.round(5 * k), 0.25, { freq: 2200, gain: 0.08 * k });
  },
  // Explosion : souffle sourd qui se referme, sous-grave, debris.
  explosion(size) {
    if (!this._ready() || !this._can('boom2', 70)) return;
    const s = size || 1;
    this._burst({ noise: 'brown', type: 'lowpass', freq: 1800, freqTo: 110, sweep: 0.6 * s, dur: 0.9 * s, gain: 0.45, attack: 0.006, space: 0.6 });
    this._burst({ noise: 'white', type: 'bandpass', freq: 1800, q: 0.6, dur: 0.12, gain: 0.18 });
    this._tone({ freq: 75, freqTo: 28, dur: 0.7 * s, gain: 0.38 });
    this._clicks(Math.round(8 * s), 0.5 * s, { freq: 1600, gain: 0.07, delay: 0.08 });
  },
  // Teleportation : scintillement ascendant + souffle d'air deplace.
  teleport() {
    if (!this._ready() || !this._can('tp', 70)) return;
    for (const [f, dt] of [[380, 0], [570, 3], [760, -4]]) this._tone({ freq: f, freqTo: f * 3.2, dur: 0.24, gain: 0.05, detune: dt, attack: 0.02, space: 0.5 });
    this._burst({ noise: 'white', type: 'highpass', freq: 2500, freqTo: 7000, dur: 0.16, gain: 0.08, attack: 0.03 });
    this._tone({ freq: 90, freqTo: 55, dur: 0.1, gain: 0.12, delay: 0.18 });
  },
  // Deplacement rapide (dash) : air fendu.
  whoosh() {
    if (!this._ready() || !this._can('whoosh', 70)) return;
    this._burst({ noise: 'pink', type: 'bandpass', freq: 350, freqTo: 2600, q: 1.1, dur: 0.26, gain: 0.24, attack: 0.05 });
  },
  // Rafale de vent.
  gust() {
    if (!this._ready() || !this._can('gust', 90)) return;
    const b = this._burst({ noise: 'brown', type: 'bandpass', freq: 380, freqTo: 900, sweep: 0.35, q: 0.9, dur: 0.75, gain: 0.3, attack: 0.12, space: 0.3 });
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 3;
    const depth = this.ctx.createGain(); depth.gain.value = 250;
    lfo.connect(depth).connect(b.f.frequency);
    lfo.start(b.t0); lfo.stop(b.t0 + 0.8);
  },
  // Bouclier d'energie : bourdonnement harmonique + scintillement.
  shield() {
    if (!this._ready() || !this._can('shield', 90)) return;
    for (const [f, dt] of [[220, 0], [330, 6], [440, -5]]) this._tone({ freq: f, dur: 0.45, gain: 0.05, detune: dt, attack: 0.04, space: 0.5 });
    this._burst({ noise: 'white', type: 'highpass', freq: 4000, dur: 0.3, gain: 0.05, attack: 0.05 });
  },
  // Glace : craquement + tintement cristallin.
  freeze() {
    if (!this._ready() || !this._can('freeze', 90)) return;
    this._clicks(10, 0.25, { freq: 3000, gain: 0.12 });
    for (const [f, d] of [[2637, 0], [3951, 0.05], [5274, 0.1]]) this._tone({ freq: f, dur: 0.4, gain: 0.03, delay: d, space: 0.6 });
  },
  // Coup encaisse par le joueur : impact sourd dans le corps.
  hurt() {
    if (!this._ready() || !this._can('hurt', 80)) return;
    this._tone({ freq: 110, freqTo: 45, dur: 0.18, gain: 0.3 });
    this._burst({ noise: 'brown', type: 'lowpass', freq: 600, dur: 0.12, gain: 0.25 });
  },
  // Projectile qui touche : claque courte.
  impact() {
    if (!this._ready() || !this._can('impact', 35)) return;
    this._burst({ noise: 'pink', type: 'bandpass', freq: 1300, q: 1, dur: 0.06, gain: 0.16 });
    this._tone({ freq: 230, freqTo: 90, dur: 0.08, gain: 0.1 });
  },
  // Tourelle detruite : fracas metallique + petite explosion.
  turretDown() {
    if (!this._ready() || !this._can('tdown', 60)) return;
    this._burst({ noise: 'white', type: 'bandpass', freq: 2400, q: 0.9, dur: 0.35, gain: 0.16, space: 0.5 });
    for (const [f, g] of [[523, 0.04], [1187, 0.03], [1943, 0.025], [2811, 0.015]]) this._tone({ freq: f, freqTo: f * 0.97, dur: 0.6, gain: g, space: 0.5 });
    this._tone({ freq: 90, freqTo: 40, dur: 0.3, gain: 0.25 });
    this._clicks(6, 0.3, { freq: 1800, gain: 0.07 });
  },
  // Boss (apparition / destruction) : grosse detonation grave.
  boss() { this.explosion(1.8); },
  // Charge d'energie qui monte.
  charge(dur) {
    if (!this._ready() || !this._can('charge', 120)) return;
    const d = dur || 0.6;
    this._tone({ wave: 'sawtooth', freq: 70, freqTo: 320, dur: d, gain: 0.07, lp: 900, attack: d * 0.6 });
    this._burst({ noise: 'pink', type: 'bandpass', freq: 400, freqTo: 2400, q: 2, dur: d, gain: 0.07, attack: d * 0.6 });
  },
  // Gravite : grondement qui "aspire" (vibrato grave).
  gravity() {
    if (!this._ready() || !this._can('grav', 150)) return;
    const t = this._tone({ freq: 95, freqTo: 40, dur: 0.8, gain: 0.3, space: 0.5 });
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 7;
    const depth = this.ctx.createGain(); depth.gain.value = 12;
    lfo.connect(depth).connect(t.osc.frequency);
    lfo.start(t.t0); lfo.stop(t.t0 + 0.85);
    this._burst({ noise: 'brown', type: 'lowpass', freq: 300, dur: 0.7, gain: 0.25, attack: 0.1 });
  },
  // Capacite generique : impulsion d'energie courte.
  ability() {
    if (!this._ready() || !this._can('ability', 80)) return;
    this._tone({ wave: 'triangle', freq: 300, freqTo: 720, dur: 0.18, gain: 0.08, space: 0.4 });
    this._burst({ noise: 'pink', type: 'bandpass', freq: 800, freqTo: 2400, dur: 0.15, gain: 0.06 });
  },
  // Verrouillage de cible (interface) : double bip net.
  lockOn() {
    if (!this._ready()) return;
    this._tone({ wave: 'triangle', freq: 880, dur: 0.06, gain: 0.07 });
    this._tone({ wave: 'triangle', freq: 1320, dur: 0.08, gain: 0.07, delay: 0.07 });
  },
  // Soin : carillon.
  heal() {
    if (!this._ready()) return;
    [[784, 0], [988, 0.08], [1319, 0.16]].forEach(([f, d]) => {
      this._tone({ freq: f, dur: 0.5, gain: 0.06, delay: d, space: 0.6 });
      this._tone({ freq: f * 2.01, dur: 0.25, gain: 0.015, delay: d });
    });
  },
  // Nouveau record : petite fanfare de cloches.
  record() {
    if (!this._ready()) return;
    [[659, 0], [784, 0.1], [988, 0.2], [1319, 0.32]].forEach(([f, d]) => {
      this._tone({ freq: f, dur: 0.7, gain: 0.07, delay: d, space: 0.7 });
      this._tone({ freq: f * 2.76, dur: 0.3, gain: 0.012, delay: d });
    });
  },

  // Anciens noms (compatibilite) redirigés vers les sons realistes correspondants.
  attack() { this.enemyShot(); },
  zap() { this.electric(0.18); },
  crackle() { this.electric(0.1); },
  boom2() { this.explosion(1); },
};
