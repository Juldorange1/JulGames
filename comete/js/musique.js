'use strict';
/* COMÈTE — musique électro générée (chaque colosse a la sienne, calée sur son tempo) et bruitages, en Web Audio */

var Son = {
  ctx: null, maitre: null, busM: null, busS: null, bruit: null, delai: null, reverb: null,
  piste: null, prochain: 0,
  init: function () {
    if (this.ctx) { if (this.ctx.state === 'suspended') try { this.ctx.resume(); } catch (e) { } return; }
    var A = window.AudioContext || window.webkitAudioContext; if (!A) return;
    var c = this.ctx = new A();
    this.maitre = c.createDynamicsCompressor();
    this.maitre.threshold.value = -14; this.maitre.ratio.value = 4;
    var sortie = c.createGain(); sortie.gain.value = 0.9;
    this.maitre.connect(sortie); sortie.connect(c.destination);
    this.busM = c.createGain(); this.busM.connect(this.maitre);
    this.mixM = c.createGain(); this.mixM.connect(this.busM);
    this.busS = c.createGain(); this.busS.connect(this.maitre);
    this.ducker = c.createGain(); this.ducker.connect(this.mixM);   // basse + nappes, « pompées » par la grosse caisse
    var n = c.sampleRate * 1.5, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    this.bruit = b;
    // écho
    this.delai = c.createDelay(1); var fb = c.createGain(); fb.gain.value = 0.32; var fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 3000;
    this.delai.connect(fl); fl.connect(fb); fb.connect(this.delai); fl.connect(this.mixM);
    // réverbération
    this.reverb = c.createConvolver();
    var rl = c.sampleRate * 1.8, rb = c.createBuffer(2, rl, c.sampleRate);
    for (var ch = 0; ch < 2; ch++) { var rd = rb.getChannelData(ch); for (var j = 0; j < rl; j++) rd[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / rl, 2.5); }
    this.reverb.buffer = rb; var rg = c.createGain(); rg.gain.value = 0.25; this.reverb.connect(rg); rg.connect(this.mixM);
    this.volumes();
  },
  volumes: function () {
    if (!this.ctx) return;
    var r = Sauve.d.reglages;
    this.busM.gain.value = r.musique * 0.55; this.busS.gain.value = r.sons * 0.7;
  },
  t: function () { return this.ctx ? this.ctx.currentTime : 0; },

  /* ---------- Musique ---------- */
  // cfg : { graine, b (durée d'un temps en s), intensite(tSec)->0..3 }
  jouer: function (cfg, tDepart) {
    if (!this.ctx) return;
    var R = rngGraine(cfg.graine * 13 + 7);
    var gammes = [[0, 2, 3, 5, 7, 8, 10], [0, 2, 3, 5, 7, 8, 11], [0, 2, 3, 5, 7, 9, 10], [0, 1, 3, 5, 7, 8, 10]];
    var prog = R.choix([[0, 5, 3, 4], [0, 3, 5, 4], [0, 5, 6, 4], [0, 6, 5, 3], [0, 2, 5, 4], [5, 3, 0, 4], [0, 4, 5, 3]]);
    var p = {
      cfg: cfg, racine: 33 + R.ent(0, 9), gamme: R.choix(gammes), prog: prog,
      dt16: cfg.b / 4, motifs: [], basse: R.choix([[0, 0, 12, 0, 0, 12, 0, 7], [0, 0, 0, 0, 12, 12, 0, 0], [0, 12, 0, 12, 0, 12, 7, 12], [0, 0, 7, 0, 0, 0, 10, 12]]),
      arp: R.choix([[0, 1, 2, 1], [0, 1, 2, 3], [2, 1, 0, 1], [0, 2, 1, 3]]), timbre: R.ent(0, 2),
      // rythmique : 0 = carré, 1 = cassé, 2 = demi-temps, 3 = galop
      style: R.choix([0, 0, 1, 2, 3]),
      kicks: [[0, 4, 8, 12], [0, 6, 10], [0, 10], [0, 3, 8, 11]],
      caisses: [[4, 12], [4, 12, 15], [8], [4, 12]]
    };
    for (var m = 0; m < 3; m++) {
      var mo = [];
      for (var s = 0; s < 16; s++) mo.push(R() < (s % 4 === 0 ? 0.75 : s % 2 === 0 ? 0.45 : 0.22) ? { d: R.ent(0, 6) + (R() < 0.25 ? 7 : 0), l: R() < 0.3 ? 2 : 1 } : null);
      p.motifs.push(mo);
    }
    this.piste = p;
    this.recaler(tDepart || 0);
    var g = this.busM.gain, now = this.ctx.currentTime;
    this.mixM.gain.cancelScheduledValues(now); this.mixM.gain.setValueAtTime(0.0001, now); this.mixM.gain.exponentialRampToValueAtTime(1, now + 0.05);
  },
  recaler: function (t) {
    if (!this.piste) return;
    this.prochain = Math.ceil(t / this.piste.dt16 - 0.001);
    if (this.ctx) { var now = this.ctx.currentTime; this.mixM.gain.cancelScheduledValues(now); this.mixM.gain.setValueAtTime(1, now); }
  },
  couper: function (fondu) {
    if (!this.ctx) return;
    var now = this.ctx.currentTime;
    this.mixM.gain.cancelScheduledValues(now); this.mixM.gain.setValueAtTime(this.mixM.gain.value, now);
    this.mixM.gain.linearRampToValueAtTime(0.0001, now + (fondu || 0.08));
    this.piste = null;
  },
  // appelé à chaque image avec le temps de jeu (s)
  avancer: function (tJeu) {
    var p = this.piste; if (!p || !this.ctx) return;
    var c = this.ctx, now = c.currentTime;
    var horizon = tJeu + 0.13;
    while (this.prochain * p.dt16 < horizon) {
      var n = this.prochain++, tn = n * p.dt16;
      if (tn < tJeu - 0.03) continue;
      var at = now + (tn - tJeu) + 0.02;
      this.pas16(p, n, at, p.cfg.intensite ? p.cfg.intensite(tn) : 2);
    }
  },
  note: function (p, deg, oct) {
    var g = p.gamme, o = Math.floor(deg / g.length), dd = ((deg % g.length) + g.length) % g.length;
    return p.racine + g[dd] + 12 * (o + (oct || 0));
  },
  pas16: function (p, n, at, I) {
    var dt = p.dt16, bar = Math.floor(n / 16), s = n % 16;
    var deg = p.prog[bar % 4];
    var st = I >= 3 ? p.style : (p.style === 2 ? 2 : 0);
    if (I >= 1 && p.kicks[st].indexOf(s) >= 0) this.kick(at, I >= 3 ? 1 : 0.85);
    if (I >= 3 && s === 14 && bar % 2 && st === 0) this.kick(at, 0.6);
    if (I >= 2 && p.caisses[st].indexOf(s) >= 0) this.caisse(at, s === 15 ? 0.3 : 0.55);
    if (I >= 1) { if (s % 2 === 0 || I >= 3) this.charley(at, s % 4 === 2 ? 0.28 : 0.13, s % 8 === 6 && I >= 2); }
    if (I >= 1 && s % 2 === 0) { var bn = this.note(p, deg, 0) + p.basse[(s / 2) % 8]; this.basse(at, bn, dt * 1.8, I); }
    if (s === 0) this.nappe(at, [this.note(p, deg, 1), this.note(p, deg + 2, 1), this.note(p, deg + 4, 1)], dt * 16, I);
    if (I >= 2) {
      var mo = p.motifs[(Math.floor(bar / 2) + (bar % 8 >= 6 ? 1 : 0)) % 3][s];
      if (mo) this.lead(at, this.note(p, deg + mo.d, 2), dt * (mo.l + 0.6), p.timbre);
    }
    if (I >= 3) { var ai = p.arp[s % 4]; this.arpege(at, this.note(p, deg + ai * 2, 3), dt * 0.9); }
    if (I >= 2 && s === 15 && bar % 4 === 3) this.montee(at, dt * 4);
  },
  env: function (g, at, a, v, d) { g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(v, at + a); g.gain.exponentialRampToValueAtTime(0.0001, at + a + d); },
  hz: function (m) { return 440 * Math.pow(2, (m - 69) / 12); },
  kick: function (at, v) {
    var c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(150, at); o.frequency.exponentialRampToValueAtTime(42, at + 0.13);
    this.env(g, at, 0.003, v * 0.9, 0.32); o.connect(g); g.connect(this.mixM); o.start(at); o.stop(at + 0.4);
    // pompe
    var dg = this.ducker.gain; dg.setValueAtTime(0.35, at); dg.linearRampToValueAtTime(1, at + 0.18);
  },
  caisse: function (at, v) {
    var c = this.ctx, b = c.createBufferSource(); b.buffer = this.bruit;
    var f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.7;
    var g = c.createGain(); this.env(g, at, 0.002, v, 0.18);
    b.connect(f); f.connect(g); g.connect(this.mixM); g.connect(this.reverb); b.start(at, Math.random()); b.stop(at + 0.25);
    var o = c.createOscillator(), g2 = c.createGain(); o.frequency.setValueAtTime(220, at); o.frequency.exponentialRampToValueAtTime(140, at + 0.08);
    this.env(g2, at, 0.002, v * 0.5, 0.09); o.connect(g2); g2.connect(this.mixM); o.start(at); o.stop(at + 0.15);
  },
  charley: function (at, v, ouvert) {
    var c = this.ctx, b = c.createBufferSource(); b.buffer = this.bruit;
    var f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7500;
    var g = c.createGain(); this.env(g, at, 0.001, v, ouvert ? 0.18 : 0.04);
    b.connect(f); f.connect(g); g.connect(this.mixM); b.start(at, Math.random()); b.stop(at + 0.25);
  },
  tom: function (at, v) {
    var c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(420, at); o.frequency.exponentialRampToValueAtTime(180, at + 0.09);
    this.env(g, at, 0.002, v, 0.11); o.connect(g); g.connect(this.mixM); o.start(at); o.stop(at + 0.15);
  },
  basse: function (at, m, d, I) {
    var c = this.ctx, o = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.value = this.hz(m); o2.type = 'sine'; o2.frequency.value = this.hz(m - 12);
    f.type = 'lowpass'; f.Q.value = 6; f.frequency.setValueAtTime(300 + I * 500, at); f.frequency.exponentialRampToValueAtTime(140, at + d);
    this.env(g, at, 0.005, 0.32, d);
    o.connect(f); o2.connect(g); f.connect(g); g.connect(this.ducker); o.start(at); o2.start(at); o.stop(at + d + 0.05); o2.stop(at + d + 0.05);
  },
  nappe: function (at, notes, d, I) {
    var c = this.ctx, g = c.createGain(), f = c.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 900 + I * 400;
    var v = I >= 3 ? 0.05 : 0.08;
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(v, at + d * 0.3); g.gain.linearRampToValueAtTime(0.0001, at + d);
    f.connect(g); g.connect(this.ducker); g.connect(this.reverb);
    for (var i = 0; i < notes.length; i++) for (var j = -1; j <= 1; j += 2) {
      var o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = this.hz(notes[i]); o.detune.value = j * 9;
      o.connect(f); o.start(at); o.stop(at + d + 0.05);
    }
  },
  lead: function (at, m, d, timbre) {
    var c = this.ctx, g = c.createGain(), f = c.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.setValueAtTime(4200, at); f.frequency.exponentialRampToValueAtTime(1200, at + d);
    this.env(g, at, 0.005, 0.11, d);
    f.connect(g); g.connect(this.mixM); g.connect(this.delai); g.connect(this.reverb);
    var types = [['square', 'sawtooth'], ['sawtooth', 'sawtooth'], ['square', 'triangle']][timbre];
    for (var i = 0; i < 2; i++) { var o = c.createOscillator(); o.type = types[i]; o.frequency.value = this.hz(m); o.detune.value = i ? 7 : -7; o.connect(f); o.start(at); o.stop(at + d + 0.05); }
  },
  arpege: function (at, m, d) {
    var c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'square'; o.frequency.value = this.hz(m);
    this.env(g, at, 0.003, 0.035, d); o.connect(g); g.connect(this.mixM); g.connect(this.delai); o.start(at); o.stop(at + d + 0.05);
  },
  montee: function (at, d) {
    var c = this.ctx, b = c.createBufferSource(); b.buffer = this.bruit;
    var f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(400, at); f.frequency.exponentialRampToValueAtTime(6000, at + d);
    var g = c.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(0.12, at + d * 0.95); g.gain.linearRampToValueAtTime(0.0001, at + d);
    b.connect(f); f.connect(g); g.connect(this.mixM); b.start(at); b.stop(at + d + 0.05);
  },

  /* ---------- Bruitages ---------- */
  sfx: function (nom, arg) {
    if (!this.ctx) return;
    var c = this.ctx, at = c.currentTime + 0.005, bus = this.busS;
    var osc = function (type, f0, f1, d, v, dest) {
      var o = c.createOscillator(), g = c.createGain(); o.type = type;
      o.frequency.setValueAtTime(f0, at); if (f1) o.frequency.exponentialRampToValueAtTime(f1, at + d);
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(v, at + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, at + d);
      o.connect(g); g.connect(dest || bus); o.start(at); o.stop(at + d + 0.05);
    };
    var bruit = function (f, d, v, type) {
      var b = c.createBufferSource(); b.buffer = Son.bruit; var fl = c.createBiquadFilter(); fl.type = type || 'lowpass'; fl.frequency.setValueAtTime(f, at); fl.frequency.exponentialRampToValueAtTime(Math.max(60, f / 8), at + d);
      var g = c.createGain(); g.gain.setValueAtTime(v, at); g.gain.exponentialRampToValueAtTime(0.0001, at + d);
      b.connect(fl); fl.connect(g); g.connect(bus); b.start(at, Math.random()); b.stop(at + d + 0.05);
    };
    var p = this.piste;
    var noteHz = function (deg, oct) { if (!p) return 523.25 * Math.pow(2, [0, 2, 4, 7, 9][deg % 5] / 12 + Math.floor(deg / 5)); return Son.hz(Son.note(p, deg, oct)); };
    switch (nom) {
      case 'boucle': // une note qui monte avec le combo, toujours dans la gamme de la musique
        var deg = Math.min(arg || 0, 14), f0 = noteHz(deg, 3);
        osc('triangle', f0, 0, 0.35, 0.22); osc('sine', f0 * 2, 0, 0.25, 0.08); osc('sine', f0 * 1.5, 0, 0.3, 0.05);
        break;
      case 'boucleVide': osc('sine', noteHz(0, 2), 0, 0.12, 0.06); break;
      case 'pile': osc('square', noteHz(7, 4), 0, 0.12, 0.05); osc('sine', noteHz(9, 4), 0, 0.2, 0.06); break;
      case 'degat': osc('square', 180, 90, 0.08, 0.12); bruit(3000, 0.08, 0.15, 'bandpass'); break;
      case 'balles': osc('sine', 1400, 2400, 0.1, 0.06); break;
      case 'bouclier': osc('square', 1800, 1500, 0.06, 0.06); osc('sine', 2600, 0, 0.12, 0.05); break;
      case 'noyau': bruit(4000, 0.7, 0.6); osc('sawtooth', 300, 60, 0.6, 0.25); osc('sine', noteHz(0, 2), 0, 0.8, 0.25); break;
      case 'coeurSort': bruit(1500, 1.4, 0.5, 'bandpass'); osc('sawtooth', 60, 220, 1.3, 0.25); break;
      case 'touche': bruit(5000, 0.5, 0.8); osc('sawtooth', 240, 50, 0.45, 0.35); osc('sine', 100, 35, 0.5, 0.5); break;
      case 'egide': osc('sine', 900, 400, 0.3, 0.25); bruit(6000, 0.3, 0.2, 'highpass'); break;
      case 'elan': bruit(2500, 0.18, 0.25, 'bandpass'); osc('sine', 300, 900, 0.12, 0.08); break;
      case 'coupe': osc('sawtooth', 700, 200, 0.12, 0.08); break;
      case 'novaPrete': [0, 4, 7, 12].forEach(function (s2, i2) { var o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = 659.25 * Math.pow(2, s2 / 12); var t0 = at + i2 * 0.05; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.1, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4); o.connect(g); g.connect(bus); o.start(t0); o.stop(t0 + 0.45); }); break;
      case 'nova': bruit(8000, 1.2, 0.7, 'highpass'); osc('sawtooth', 80, 30, 1.0, 0.4); osc('sine', noteHz(0, 3), noteHz(0, 1), 1.0, 0.25); break;
      case 'mine': bruit(1800, 0.3, 0.35); break;
      case 'comp': osc('triangle', noteHz(4, 3), noteHz(9, 3), 0.18, 0.16); osc('sine', noteHz(7, 4), 0, 0.3, 0.06); bruit(5000, 0.25, 0.12, 'highpass'); break;
      case 'rate': osc('square', 220, 180, 0.08, 0.05); break;
      case 'desamorce': osc('sine', 500, 1500, 0.12, 0.12); break;
      case 'annonce': osc('sine', 1200, 1000, 0.05, 0.03); break;
      case 'laser': bruit(9000, 0.35, 0.18, 'highpass'); osc('sawtooth', 110, 90, 0.3, 0.1); break;
      case 'onde': osc('sine', 200, 70, 0.4, 0.25); break;
      case 'meteore': bruit(900, 0.5, 0.6); osc('sine', 80, 30, 0.4, 0.4); break;
      case 'clic': osc('triangle', 900, 600, 0.05, 0.15); break;
      case 'survol': osc('sine', 1200, 0, 0.03, 0.04); break;
      case 'choix': osc('triangle', 660, 1320, 0.15, 0.15); osc('sine', 990, 0, 0.3, 0.08); break;
      case 'defaite': bruit(3000, 1.2, 0.5); osc('sawtooth', 200, 40, 1.2, 0.3); break;
      case 'victoire':
        [0, 4, 7, 12, 16, 19, 24].forEach(function (s, i) { var o = c.createOscillator(), g = c.createGain(); o.type = 'square'; o.frequency.value = 523.25 * Math.pow(2, s / 12); var t0 = at + i * 0.07; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5); o.connect(g); g.connect(bus); o.start(t0); o.stop(t0 + 0.55); });
        bruit(6000, 1.5, 0.3, 'highpass'); break;
      case 'succes': [0, 7, 12].forEach(function (s, i) { var o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = 784 * Math.pow(2, s / 12); var t0 = at + i * 0.09; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.15, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4); o.connect(g); g.connect(bus); o.start(t0); o.stop(t0 + 0.45); }); break;
    }
  }
};
