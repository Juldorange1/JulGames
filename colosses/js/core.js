'use strict';
/* Colosses — outils communs : maths, hasard à graine, entrées, son, sauvegarde, lueurs */

// ---------- Maths ----------
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
function d2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
function ang(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
function angDiff(a, b) { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU; return d; }
function segD2(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy;
  let t = l ? ((px - x1) * dx + (py - y1) * dy) / l : 0;
  t = clamp(t, 0, 1);
  return d2(px, py, x1 + dx * t, y1 + dy * t);
}
// distance le long d'un rayon jusqu'à un cercle (ou Infinity)
function rayCircle(x, y, ca, sa, cx, cy, r) {
  const ox = x - cx, oy = y - cy;
  const b = ox * ca + oy * sa, c = ox * ox + oy * oy - r * r;
  const disc = b * b - c;
  if (disc < 0) return Infinity;
  const s = Math.sqrt(disc), t1 = -b - s, t2 = -b + s;
  if (t1 > 0) return t1;
  if (t2 > 0 && c < 0) return 0;
  return Infinity;
}

// ---------- Hasard à graine (mulberry32) ----------
function RNG(seed) {
  let s = seed >>> 0;
  const f = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.range = (a, b) => a + f() * (b - a);
  f.int = (a, b) => Math.floor(a + f() * (b - a + 1));
  f.pick = arr => arr[Math.floor(f() * arr.length)];
  f.chance = p => f() < p;
  f.sign = () => f() < .5 ? -1 : 1;
  f.shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  f.weighted = (arr, w) => { let tot = 0; for (const x of arr) tot += w(x); let v = f() * tot; for (const x of arr) { v -= w(x); if (v <= 0) return x; } return arr[arr.length - 1]; };
  return f;
}
function hashNum(n) { n = Math.imul((n ^ 0x9E3779B9) >>> 0, 2654435761) >>> 0; n ^= n >>> 16; n = Math.imul(n, 0x85EBCA6B) >>> 0; n ^= n >>> 13; return n >>> 0; }
const R = RNG((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);

// ---------- Entrées ----------
const Input = {
  k: {}, p: {}, sx: 0, sy: 0, lmb: false, rmb: false, lp: false, rp: false,
  down(c) { return !!this.k[c]; },
  hit(c) { return !!this.p[c]; },
  endFrame() { this.p = {}; this.lp = this.rp = false; },
  clear() { this.k = {}; this.p = {}; this.lmb = this.rmb = false; }
};
addEventListener('keydown', e => {
  if (typeof Son !== 'undefined') Son.init();
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (!e.repeat && !Input.k[e.code]) Input.p[e.code] = true;
  Input.k[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', e => { Input.k[e.code] = false; });
addEventListener('blur', () => Input.clear());
addEventListener('mousemove', e => { Input.sx = e.clientX; Input.sy = e.clientY; });
// les boutons de la souris sont des « touches » comme les autres (Mouse0 = gauche, Mouse1 = molette, Mouse2 = droit, Mouse3/4 = côtés)
addEventListener('mousedown', e => {
  Son.init();
  const c = 'Mouse' + e.button;
  if (!Input.k[c]) Input.p[c] = true;
  Input.k[c] = true;
  if (e.button === 0) { Input.lmb = true; Input.lp = true; }
  if (e.button === 2) { Input.rmb = true; Input.rp = true; }
  if (e.button > 2 || e.button === 1) e.preventDefault();
});
addEventListener('mouseup', e => {
  Input.k['Mouse' + e.button] = false;
  if (e.button === 0) Input.lmb = false;
  if (e.button === 2) Input.rmb = false;
  if (e.button > 2) e.preventDefault();
});
addEventListener('auxclick', e => e.preventDefault());
// nom lisible d'une touche (selon la disposition du clavier quand le navigateur la donne : Z Q S D en AZERTY)
let DISPO = null;
try { if (navigator.keyboard && navigator.keyboard.getLayoutMap) navigator.keyboard.getLayoutMap().then(m => DISPO = m).catch(() => { }); } catch (e) { }
function nomTouche(c) {
  if (!c) return '—';
  const fixes = { Mouse0: 'Clic gauche', Mouse1: 'Clic molette', Mouse2: 'Clic droit', Mouse3: 'Souris 4', Mouse4: 'Souris 5', Space: 'Espace', ShiftLeft: 'Maj', ShiftRight: 'Maj droite',
    ControlLeft: 'Ctrl', ControlRight: 'Ctrl droit', AltLeft: 'Alt', Tab: 'Tab', Escape: 'Échap', Enter: 'Entrée', CapsLock: 'Verr. maj', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };
  if (fixes[c]) return fixes[c];
  if (DISPO && DISPO.get(c)) return DISPO.get(c).toUpperCase();
  return c.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'Pavé ');
}
function nomToucheCourt(c) { return ({ Mouse0: 'Clic G', Mouse1: 'Molette', Mouse2: 'Clic D' })[c] || nomTouche(c); }
addEventListener('contextmenu', e => e.preventDefault());

// ---------- Son : échantillons CC0 (dossier sfx/), synthèse en secours, réverbération ----------
const SFX = {
  explo_grosse: 'explo_grosse.ogg', explo_moyenne: 'explo_moyenne.ogg', explo_petite: 'explo_petite.ogg', explo_boss: 'explo_boss.mp3',
  choc1: 'choc1.ogg', choc2: 'choc2.ogg', choc3: 'choc3.ogg', blesse: 'blesse.ogg', blesse2: 'blesse2.ogg',
  touche1: 'touche1.ogg', touche2: 'touche2.ogg', verre1: 'verre1.ogg', verre2: 'verre2.ogg', tir1: 'tir1.ogg', tir2: 'tir2.ogg',
  laser: 'laser.ogg', tir_lourd: 'tir_lourd.ogg', rayon: 'rayon.wav', tele: 'tele.ogg', cri1: 'cri1.wav', cri2: 'cri2.wav',
  cri3: 'cri3.wav', cri4: 'cri4.wav', swish1: 'swish1.wav', swish2: 'swish2.wav', swish3: 'swish3.wav', gong: 'gong.ogg',
  parade: 'parade.ogg', missile: 'missile.ogg', charge: 'charge.ogg', pouvoir: 'pouvoir.ogg'
};
// bruitages deux fois plus présents que la musique, pour bien passer au-dessus d'elle
const GAIN_BRUITAGES = 1.5; // +25 %
const Son = {
  c: null, master: null, sfx: null, rev: null, noiseBuf: null, last: {}, buf: {},
  init() {
    if (this.c) { if (this.c.state === 'suspended') this.c.resume(); return; }
    const A = window.AudioContext || window.webkitAudioContext;
    if (!A) return;
    try {
      this.c = new A();
      this.master = this.c.createGain();
      this.master.gain.value = Save.d.opts.vol * Save.d.opts.master * GAIN_BRUITAGES;
      // compresseur doux + gain de compensation + limiteur : les bruitages passent au-dessus de la musique sans saturer
      const comp = this.c.createDynamicsCompressor();
      comp.threshold.value = -12; comp.ratio.value = 4; comp.knee.value = 10;
      const gainC = this.c.createGain(); gainC.gain.value = 1.6;
      const lim = this.c.createDynamicsCompressor(); lim.threshold.value = -1.5; lim.ratio.value = 20; lim.attack.value = .002; lim.release.value = .12;
      const doux = this.c.createBiquadFilter(); doux.type = 'lowpass'; doux.frequency.value = 9500; doux.Q.value = .5; // adoucit les aigus
      this.master.connect(doux); doux.connect(comp); comp.connect(gainC); gainC.connect(lim); lim.connect(this.c.destination);
      this.sfx = this.master;
      const n = this.c.sampleRate;
      this.noiseBuf = this.c.createBuffer(1, n, n);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      // réverbération : réponse impulsionnelle fabriquée (bruit qui décroît)
      const L = Math.floor(n * 2.2), ir = this.c.createBuffer(2, L, n);
      for (let ch = 0; ch < 2; ch++) { const x = ir.getChannelData(ch); for (let i = 0; i < L; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / L, 3.2); }
      this.rev = this.c.createConvolver(); this.rev.buffer = ir;
      const rg = this.c.createGain(); rg.gain.value = .35; this.rev.connect(rg); rg.connect(this.master);
      this.charger();
    } catch (e) { this.c = null; }
  },
  charger() {
    if (location.protocol === 'file:') return; // fetch impossible en file:// : on garde la synthèse
    for (const k in SFX) {
      fetch('sfx/' + SFX[k]).then(r => r.arrayBuffer()).then(a => this.c.decodeAudioData(a)).then(b => { this.buf[k] = b; }).catch(() => { });
    }
  },
  setVol() { if (this.master) this.master.gain.value = Save.d.opts.vol * Save.d.opts.master * GAIN_BRUITAGES; },
  ech(nom, v, rate, rev) {
    const b = this.buf[nom];
    if (!b || !this.c) return false;
    const s = this.c.createBufferSource(), g = this.c.createGain();
    s.buffer = b; s.playbackRate.value = rate || 1;
    g.gain.value = v;
    s.connect(g); g.connect(this.sfx);
    if (rev && this.rev) { const r = this.c.createGain(); r.gain.value = rev; g.connect(r); r.connect(this.rev); }
    s.start();
    return true;
  },
  tone(f, d, type, v, f2, delay, rev) {
    if (!this.c) return;
    const t0 = this.c.currentTime + (delay || 0);
    const o = this.c.createOscillator(), g = this.c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + d);
    g.gain.setValueAtTime(.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + .008);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    o.connect(g); g.connect(this.sfx);
    if (rev && this.rev) { const r = this.c.createGain(); r.gain.value = rev; g.connect(r); r.connect(this.rev); }
    o.start(t0); o.stop(t0 + d + .02);
  },
  noise(d, v, fc, delay, fc2, rev) {
    if (!this.c || !this.noiseBuf) return;
    const t0 = this.c.currentTime + (delay || 0);
    const s = this.c.createBufferSource(), f = this.c.createBiquadFilter(), g = this.c.createGain();
    s.buffer = this.noiseBuf;
    f.type = 'lowpass'; f.frequency.setValueAtTime(fc || 1200, t0);
    if (fc2) f.frequency.exponentialRampToValueAtTime(fc2, t0 + d);
    g.gain.setValueAtTime(v, t0);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    s.connect(f); f.connect(g); g.connect(this.sfx);
    if (rev && this.rev) { const r = this.c.createGain(); r.gain.value = rev; g.connect(r); r.connect(this.rev); }
    s.start(t0, Math.random() * .5); s.stop(t0 + d + .02);
  },
  pick(...noms) { return noms[Math.floor(Math.random() * noms.length)]; },
  play(n) {
    if (!this.c) return;
    const now = performance.now(), gap = { tir: 55, touche: 45, salve: 80, blesse: 120, explo: 50, tele: 60, tic: 30, epee: 40 }[n] || 25;
    if (this.last[n] && now - this.last[n] < gap) return;
    this.last[n] = now;
    const rr = () => .92 + Math.random() * .16;
    switch (n) {
      case 'tir': if (!this.ech(this.pick('tir1', 'tir2'), .05, rr() * 1.15)) this.tone(880, .05, 'square', .012, 500); break;
      case 'tirLourd': if (!this.ech('tir_lourd', .22, rr())) this.noise(.3, .2, 1500, 0, 200); this.tone(90, .25, 'sine', .15, 40); break;
      case 'touche': if (!this.ech(this.pick('touche1', 'touche2'), .09, rr() * 1.2)) this.tone(240, .05, 'triangle', .03, 160); break;
      case 'epee': if (!this.ech(this.pick('swish1', 'swish2', 'swish3'), .35, rr())) this.noise(.12, .09, 3000, 0, 600); break;
      case 'salve': this.tone(220, .2, 'sawtooth', .03, 90); this.noise(.12, .04, 1800, 0, 400); break;
      case 'tele': this.tone(380, .3, 'sine', .03, 900); this.tone(760, .25, 'triangle', .012, 1500); break;
      case 'rayonTir': if (!this.ech('rayon', .12, rr())) this.noise(.6, .1, 2500, 0, 300); break;
      case 'blesse': if (!this.ech(this.pick('blesse', 'blesse2'), .55, rr())) this.noise(.25, .22, 900, 0, 200); this.tone(120, .35, 'square', .07, 45); this.noise(.3, .18, 400, 0, 80); break;
      case 'explo': if (!this.ech(this.pick('explo_petite', 'explo_moyenne'), .28, rr(), .25)) this.noise(.45, .16, 700, 0, 90); break;
      case 'gros': if (!this.ech(this.pick('explo_grosse', 'choc1', 'choc3'), .55, rr() * .9, .4)) this.noise(.9, .28, 500, 0, 50); this.tone(55, .9, 'sine', .3, 28); break;
      case 'choc': if (!this.ech(this.pick('choc1', 'choc2', 'choc3'), .5, rr() * .8, .3)) this.noise(.5, .2, 400, 0, 60); this.tone(60, .5, 'sine', .25, 30); break;
      case 'special': if (!this.ech('pouvoir', .3, rr(), .2)) this.tone(330, .3, 'sawtooth', .05, 990); this.noise(.2, .05, 2500); break;
      case 'missile': if (!this.ech('missile', .2, rr() * 1.3)) this.noise(.4, .08, 2000, 0, 500); break;
      case 'dash': if (!this.ech(this.pick('swish1', 'swish2', 'swish3'), .3, rr() * .8)) this.noise(.14, .07, 2000, 0, 500); break;
      case 'parade': if (!this.ech('parade', .5, 1.2, .5)) this.tone(1320, .35, 'triangle', .12, 1980); this.tone(1980, .5, 'sine', .06, null, 0, .4); break;
      case 'verre': if (!this.ech(this.pick('verre1', 'verre2'), .45, rr(), .3)) this.noise(.4, .15, 6000, 0, 2000); break;
      case 'cri': if (!this.ech(this.pick('cri1', 'cri2', 'cri3', 'cri4'), .7, .55 + Math.random() * .25, .6)) this.tone(90, 1.2, 'sawtooth', .1, 45); this.tone(48, 1.3, 'sine', .25, 30); break;
      case 'phase': this.play('cri'); this.noise(1.4, .2, 600, 0, 50, .5); this.tone(55, 1.6, 'sawtooth', .07, 27); break;
      case 'gong': if (!this.ech('gong', .5, .8, .7)) this.tone(110, 2, 'sine', .2, 100); break;
      case 'portail': if (!this.ech('tele', .35, .7, .5)) this.tone(200, 1, 'sine', .08, 800); break;
      case 'teleporte': if (!this.ech('tele', .3, rr() * 1.2, .3)) this.tone(500, .25, 'sine', .05, 1500); break;
      case 'mortBoss': if (!this.ech('explo_boss', .7, .8, .6)) this.noise(1.5, .35, 600, 0, 40); this.tone(45, 2, 'sine', .35, 22); this.ech('explo_grosse', .5, .6, .6); break;
      case 'victoire': this.tone(392, .9, 'sine', .05, null, 0, .6); this.tone(587, 1.1, 'sine', .04, null, .12, .6); break;
      case 'mort': this.tone(200, 2, 'sawtooth', .08, 30, 0, .6); this.noise(1.6, .15, 500, 0, 50, .5); this.ech('choc3', .6, .5, .6); break;
      case 'clic': this.tone(660, .06, 'triangle', .04); break;
      case 'soin': this.tone(523, .25, 'sine', .07, 1046, 0, .3); this.tone(784, .3, 'sine', .05, 1568, .08, .3); break;
      case 'vide': this.tone(130, .1, 'square', .03); break;
      case 'tic': this.tone(1800, .03, 'square', .025); break;
      case 'tac': this.tone(900, .06, 'square', .04); this.tone(60, .15, 'sine', .15, 40); break;
      case 'coeur': this.tone(58, .14, 'sine', .3, 40); this.tone(52, .16, 'sine', .25, 36, .16); break;
      case 'alerte': this.tone(300, .35, 'sawtooth', .025, 600); break;
      case 'charge': if (!this.ech('charge', .25, rr())) this.tone(150, .8, 'sawtooth', .05, 600); break;
      case 'ramasse': this.tone(880, .12, 'triangle', .06, 1320); this.tone(1320, .2, 'sine', .04, 1760, .06); break;
    }
  }
};

// ---------- Musique (fichiers CC0 du dossier music/, fondus enchaînés) ----------
const MUS = {
  combat: ['combat01.ogg', 'combat02.ogg', 'combat03.ogg', 'combat04.ogg', 'combat05.mp3', 'combat06.mp3', 'combat07.ogg', 'combat08.ogg', 'combat09.ogg',
    'combat10.mp3', 'combat11.ogg', 'combat12.ogg', 'combat13.mp3', 'combat14.ogg', 'combat15.ogg', 'combat16.ogg', 'combat17.ogg'],
  mega: [['mega1.ogg', 'mega2.ogg', 'mega3.ogg'], ['mega4.mp3', 'mega2.ogg', 'mega3.ogg'], ['mega5.mp3', 'mega2.ogg', 'mega3.ogg']],
  menu: 'menu.ogg', victoire: 'victoire.ogg'
};
const Musique = {
  pistes: [], courant: null, derniers: [], duck: 1, duckCible: 1,
  volume() { return Math.min(1, Save.d.opts.musique * Save.d.opts.master * .875); }, // +25 %
  jouer(fichier, fondu) {
    fondu = fondu || 3;
    if (this.courant && this.courant.src === fichier) { this.courant.cible = 1; this.courant.vitesse = 1 / fondu; return; }
    if (this.courant) { this.courant.cible = 0; this.courant.vitesse = 1 / fondu; }
    let p = this.pistes.find(x => x.src === fichier);
    if (!p) {
      const el = new Audio('music/' + fichier);
      el.loop = true; el.volume = 0;
      p = { el, src: fichier, vol: 0 };
      this.pistes.push(p);
      const pr = el.play(); if (pr && pr.catch) pr.catch(() => { });
    }
    p.cible = 1; p.vitesse = 1 / fondu;
    this.courant = p;
  },
  // nouvelle = true pour changer de morceau (nouveau palier) ; sinon on garde celui qui joue
  combat(nouvelle) {
    if (!nouvelle && this.courant && MUS.combat.includes(this.courant.src)) { this.courant.cible = 1; return; }
    const libres = MUS.combat.filter(f => !this.derniers.includes(f));
    const f = libres[Math.floor(Math.random() * libres.length)];
    this.derniers.push(f); if (this.derniers.length > 6) this.derniers.shift();
    this.jouer(f, 4);
  },
  baisser(k) { this.duckCible = k; },
  stop() { this.duckCible = 0; },
  maj(dt) {
    this.duck += clamp(this.duckCible - this.duck, -dt * .7, dt * .7);
    const v = this.volume();
    for (const p of this.pistes) {
      p.vol += clamp(p.cible - p.vol, -dt * p.vitesse, dt * p.vitesse);
      p.el.volume = clamp(p.vol * this.duck * v, 0, 1);
      if (p.cible > 0 && p.el.paused && p.el.readyState > 2) { const pr = p.el.play(); if (pr && pr.catch) pr.catch(() => { }); }
      if (p.cible === 0 && p.vol <= 0) { p.el.pause(); p.mort = true; }
    }
    if (this.pistes.some(p => p.mort)) this.pistes = this.pistes.filter(p => !p.mort);
  }
};

// ---------- Sauvegarde ----------
const SAVE_KEY = 'colosses_v1';
const DIFFS = {
  apprenti: { nom: 'Apprenti', ico: '🛡', desc: 'Pour apprendre les boss sans trop souffrir.', pv: 100, dmg: .37, hp: 1, vit: .9, tele: 1.2, idle: 1.25, dens: .85, soin: 40 }, // plus résistant : plus de vie et des coups qui font moins mal
  guerrier: { nom: 'Guerrier', ico: '⚔', desc: 'Le vrai combat : rapide, dense, impitoyable.', pv: 100, dmg: 1.1, hp: 1, vit: 1.05, tele: .95, idle: .85, dens: 1.1, soin: 25 },
  cauchemar: { nom: 'Cauchemar', ico: '☠', desc: 'Trois ou quatre coups et c\'est fini. Pour qui connaît les boss par cœur.', pv: 100, dmg: 1.45, hp: 1, vit: 1.18, tele: .82, idle: .66, dens: 1.2, soin: 15, cran: 1 }
};
const VIE_CLASSIQUE = .75; // parties classiques (Apprenti, Guerrier, Cauchemar) : boss 25 % plus rapides à tuer
function progVide() { return { palier: 0, record: 0, up: { p: {}, s: {}, t: {} }, run: null, megaTemps: {} }; }
const Save = {
  d: null,
  defaut() {
    return {
      diff: 'guerrier',
      prog: { apprenti: progVide(), guerrier: progVide(), cauchemar: progVide() },
      stats: { boss: 0, mega: 0, morts: 0, temps: 0, salles: 0, parades: 0 },
      codex: { att: {}, arm: {}, traits: {}, cartes: {}, invoc: {}, especes: {} },
      chasse: [],
      defis: {}, essais: {},
      opts: { master: 1, vol: .6, musique: .5, tremble: 1, auto: false, chiffres: true, lumiere: true, particules: 'normale', fps: false, alerte: 'rouge', nomsAttaques: true, autoPause: true, decorAnime: true, contour: false, viseur: 'systeme', viseurCol: '#ffffff', vitesse: 1, luminosite: 1, chrono: true, zoomMenu: 1, postfx: true, postfxForce: 1, effetsReduits: false,
        touches: { haut: 'KeyW', bas: 'KeyS', gauche: 'KeyA', droite: 'KeyD', tir: 'Mouse0', spec: 'Mouse2', spec2: 'KeyE', tal: 'Space', tal2: 'ShiftLeft', pause: 'KeyP' } }
    };
  },
  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { d = null; }
    const def = this.defaut();
    if (!d || typeof d !== 'object') d = def;
    // ancienne version (une seule progression) → difficulté Guerrier
    if (!d.prog) {
      d.prog = def.prog;
      if (d.up) d.prog.guerrier = { palier: d.palier || 0, record: d.record || 0, up: d.up, run: null, megaTemps: d.megaTemps || {} };
      delete d.up; delete d.palier; delete d.record; delete d.run; delete d.megaTemps;
    }
    for (const k in def) if (d[k] === undefined) d[k] = def[k];
    for (const k in def.opts) if (d.opts[k] === undefined) d.opts[k] = def.opts[k];
    for (const k in def.codex) if (!d.codex[k]) d.codex[k] = {};
    for (const k in def.stats) if (d.stats[k] === undefined) d.stats[k] = 0;
    for (const k in DIFFS) { if (!d.prog[k]) d.prog[k] = progVide(); for (const c of ['p', 's', 't']) if (!d.prog[k].up[c]) d.prog[k].up[c] = {}; }
    if (!DIFFS[d.diff]) d.diff = 'guerrier';
    if (typeof d.opts.tremble === 'boolean') d.opts.tremble = d.opts.tremble ? 1 : 0;
    // ancienne configuration : la spéciale était « clic droit + une touche » → elle devient deux touches réglables
    if (d.opts.touches && !d.opts.touches.tir) { d.opts.touches.spec2 = d.opts.touches.spec || 'KeyE'; d.opts.touches.spec = 'Mouse2'; }
    for (const k in def.opts.touches) if (!d.opts.touches[k]) d.opts.touches[k] = def.opts.touches[k];
    if (!d.opts.viseurV2) { d.opts.viseurV2 = true; d.opts.viseur = 'colosses'; } // le jeu a maintenant son propre viseur
    this.d = d;
  },
  write() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.d)); } catch (e) { } }
};
Save.load();
function PR() { return Save.d.prog[Save.d.diff]; }
function enDefi() { try { return G.mode === 'jour' || G.mode === 'semaine'; } catch (e) { return false; } }
function aRelique(id) { try { return G.rel(id); } catch (e) { return false; } }
function DF() { return DIFFS[enDefi() ? 'guerrier' : Save.d.diff]; }
function TOUCHES() { return Save.d.opts.touches; }
function QUAL() { const q = { faible: .4, normale: 1, elevee: 1.4 }[Save.d.opts.particules] || 1; return Save.d.opts.effetsReduits ? Math.min(q, .35) : q; }

// ---------- Lueurs pré-rendues ----------
const glowCache = {};
// le rayon est arrondi (sinon chaque taille animée créait une nouvelle image : fuite de mémoire qui figeait le jeu)
let glowN = 0;
function glow(col, r) {
  r = r < 24 ? Math.max(1, Math.round(r)) : Math.round(r / 6) * 6;
  const k = col + '|' + r;
  let c = glowCache[k];
  if (c) return c;
  c = document.createElement('canvas');
  const s = Math.ceil(r * 2);
  c.width = c.height = s;
  const x = c.getContext('2d'), g = x.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, col);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, s, s);
  if (++glowN > 900) { for (const q in glowCache) delete glowCache[q]; glowN = 1; }
  glowCache[k] = c;
  return c;
}
function hsl(h, s, l, a) { return a === undefined ? `hsl(${h},${s}%,${l}%)` : `hsla(${h},${s}%,${l}%,${a})`; }
function fmtTemps(s) { s = Math.max(0, s); const m = Math.floor(s / 60), r = Math.floor(s % 60); return m + ':' + String(r).padStart(2, '0'); }
