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
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (!e.repeat && !Input.k[e.code]) Input.p[e.code] = true;
  Input.k[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', e => { Input.k[e.code] = false; });
addEventListener('blur', () => Input.clear());
addEventListener('mousemove', e => { Input.sx = e.clientX; Input.sy = e.clientY; });
addEventListener('mousedown', e => {
  Son.init();
  if (e.button === 0) { Input.lmb = true; Input.lp = true; }
  if (e.button === 2) { Input.rmb = true; Input.rp = true; }
});
addEventListener('mouseup', e => {
  if (e.button === 0) Input.lmb = false;
  if (e.button === 2) Input.rmb = false;
});
addEventListener('contextmenu', e => e.preventDefault());

// ---------- Son (synthétisé, discret) ----------
const Son = {
  c: null, master: null, noiseBuf: null, last: {},
  init() {
    if (this.c) { if (this.c.state === 'suspended') this.c.resume(); return; }
    const A = window.AudioContext || window.webkitAudioContext;
    if (!A) return;
    try {
      this.c = new A();
      this.master = this.c.createGain();
      this.master.gain.value = Save.d ? Save.d.opts.vol : .5;
      this.master.connect(this.c.destination);
      const n = this.c.sampleRate;
      this.noiseBuf = this.c.createBuffer(1, n, n);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.c = null; }
  },
  setVol(v) { if (this.master) this.master.gain.value = v; },
  tone(f, d, type, v, f2, delay) {
    if (!this.c) return;
    const t0 = this.c.currentTime + (delay || 0);
    const o = this.c.createOscillator(), g = this.c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + d);
    g.gain.setValueAtTime(v, t0);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + d + .02);
  },
  noise(d, v, fc, delay, fc2) {
    if (!this.c || !this.noiseBuf) return;
    const t0 = this.c.currentTime + (delay || 0);
    const s = this.c.createBufferSource(), f = this.c.createBiquadFilter(), g = this.c.createGain();
    s.buffer = this.noiseBuf;
    f.type = 'lowpass'; f.frequency.setValueAtTime(fc || 1200, t0);
    if (fc2) f.frequency.exponentialRampToValueAtTime(fc2, t0 + d);
    g.gain.setValueAtTime(v, t0);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t0, Math.random() * .5); s.stop(t0 + d + .02);
  },
  play(n) {
    if (!this.c) return;
    const now = performance.now(), gap = { tir: 70, touche: 60, salve: 90, blesse: 120, explo: 60 }[n] || 30;
    if (this.last[n] && now - this.last[n] < gap) return;
    this.last[n] = now;
    switch (n) {
      case 'tir': this.tone(880 + Math.random() * 120, .05, 'square', .015, 500); break;
      case 'touche': this.tone(240 + Math.random() * 60, .05, 'triangle', .03, 160); break;
      case 'epee': this.noise(.12, .09, 3000, 0, 600); break;
      case 'salve': this.tone(300, .18, 'sawtooth', .025, 120); break;
      case 'tele': this.tone(520, .25, 'sine', .035, 780); break;
      case 'blesse': this.noise(.25, .22, 900, 0, 200); this.tone(160, .3, 'square', .06, 60); break;
      case 'explo': this.noise(.45, .16, 700, 0, 90); break;
      case 'gros': this.noise(.9, .28, 500, 0, 50); this.tone(70, .8, 'sine', .2, 30); break;
      case 'special': this.tone(330, .3, 'sawtooth', .05, 990); this.noise(.2, .05, 2500); break;
      case 'dash': this.noise(.14, .07, 2000, 0, 500); break;
      case 'parade': this.tone(1320, .35, 'triangle', .12, 1980); this.tone(660, .4, 'sine', .08); break;
      case 'phase': this.tone(110, 1.2, 'sawtooth', .08, 55); this.noise(1.2, .12, 400, 0, 60); break;
      case 'victoire': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, .5, 'triangle', .09, null, i * .12)); break;
      case 'mega': [392, 523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, .7, 'triangle', .09, null, i * .13)); break;
      case 'mort': this.tone(300, 1.4, 'sawtooth', .08, 40); this.noise(1, .1, 600, 0, 80); break;
      case 'clic': this.tone(660, .06, 'triangle', .04); break;
      case 'soin': this.tone(523, .25, 'sine', .06, 1046); break;
      case 'vide': this.tone(130, .1, 'square', .03); break;
    }
  }
};

// ---------- Sauvegarde ----------
const SAVE_KEY = 'colosses_v1';
const Save = {
  d: null,
  defaut() {
    return {
      up: { p: {}, s: {}, t: {} },
      palier: 0,              // nombre de méga boss vaincus = point de reprise
      record: 0,              // plus haute salle atteinte
      stats: { boss: 0, mega: 0, morts: 0, temps: 0, salles: 0 },
      codex: { att: {}, arm: {}, traits: {}, cartes: {}, invoc: {} },
      chasse: [],             // derniers boss vaincus
      megaTemps: {},          // meilleur temps par méga boss
      run: null,              // { salle, pv }
      opts: { vol: .5, tremble: true, auto: false, chiffres: true }
    };
  },
  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { d = null; }
    const def = this.defaut();
    if (!d || typeof d !== 'object') d = def;
    for (const k in def) if (d[k] === undefined) d[k] = def[k];
    for (const k in def.opts) if (d.opts[k] === undefined) d.opts[k] = def.opts[k];
    for (const k in def.codex) if (!d.codex[k]) d.codex[k] = {};
    for (const k in def.stats) if (d.stats[k] === undefined) d.stats[k] = 0;
    for (const k of ['p', 's', 't']) if (!d.up[k]) d.up[k] = {};
    this.d = d;
  },
  write() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.d)); } catch (e) { } }
};
Save.load();

// ---------- Lueurs pré-rendues ----------
const glowCache = {};
function glow(col, r) {
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
  glowCache[k] = c;
  return c;
}
function hsl(h, s, l, a) { return a === undefined ? `hsl(${h},${s}%,${l}%)` : `hsla(${h},${s}%,${l}%,${a})`; }
function fmtTemps(s) { s = Math.max(0, s); const m = Math.floor(s / 60), r = Math.floor(s % 60); return m + ':' + String(r).padStart(2, '0'); }
