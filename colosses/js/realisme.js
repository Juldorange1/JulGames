'use strict';
/* Colosses — sons et effets plus réalistes et cohérents :
   • son en stéréo selon la position (le boss à gauche s'entend à gauche) et un peu plus doux quand c'est loin ;
   • chaque coup porté au boss sonne et réagit selon sa matière (métal : étincelles et tintement, pierre : éclats
     et poussière, os : esquilles, carapace : giclures, éther : volutes, flammes : braises, chair : gouttes…) ;
   • les explosions projettent des débris qui retombent au sol, laissent de la fumée et un nuage de poussière ;
   • le héros touché fait jaillir des étincelles de son armure ; la mort d'un boss fait voler ses morceaux. */

// ---------- son spatial ----------
const SOURCE_SON = { tir: 'p', tirLourd: 'p', epee: 'p', dash: 'p', charge: 'p', special: 'p', missile: 'p', soin: 'p', ramasse: 'p', parade: 'p', blesse: 'p', vide: 'p',
  salve: 'b', tele: 'b', cri: 'b', phase: 'b', rayonTir: 'b', alerte: 'b', tic: 'b', tac: 'b', mortBoss: 'b', verre: 'b', gong: 'b' };
const _panneaux = {};
function panneauSon(x, y) {
  const C = Son.c; if (!C || !C.createStereoPanner) return null;
  const pan = Math.round(clamp((x - CX) / (AR.w / 2), -1, 1) * 4) / 4 * .65;
  const d = G.p ? Math.hypot(x - G.p.x, y - G.p.y) : 0, vol = d < 350 ? 1 : d < 800 ? .82 : .66;
  const k = pan + '|' + vol;
  if (!_panneaux[k]) { const p = C.createStereoPanner(), g = C.createGain(); p.pan.value = pan; g.gain.value = vol; p.connect(g); g.connect(Son.master); _panneaux[k] = p; }
  return _panneaux[k];
}
const _playSpatial = Son.play;
Son.play = function (n) {
  if (!this.c || !this.master) return _playSpatial.apply(this, arguments);
  let pos = this._pos;
  if (!pos && typeof G !== 'undefined' && G.etat !== 'menu') { const s = SOURCE_SON[n]; pos = s === 'p' ? G.p : s === 'b' ? G.boss : null; }
  const node = pos && Number.isFinite(pos.x) ? panneauSon(pos.x, pos.y) : null;
  if (!node) return _playSpatial.apply(this, arguments);
  const avant = this.sfx; this.sfx = node;
  try { return _playSpatial.apply(this, arguments); } finally { this.sfx = avant; }
};
function sonA(n, x, y) { Son._pos = { x, y }; try { Son.play(n); } finally { Son._pos = null; } }

// ---------- son d'impact selon la matière ----------
let _impSonT = 0;
function sonMatiere(mat, x, y, fort) {
  if (!Son.c) return;
  const now = performance.now(); if (now - _impSonT < (fort ? 45 : 75)) return; _impSonT = now;
  const node = panneauSon(x, y), avant = Son.sfx; if (node) Son.sfx = node;
  const v = fort ? 1.6 : 1, r = .9 + Math.random() * .2;
  try {
    switch (mat) {
      case 'metal': Son.tone(1900 * r, .09, 'triangle', .035 * v, 1500); Son.tone(3400 * r, .14, 'sine', .015 * v); Son.noise(.04, .05 * v, 6000); break;
      case 'pierre': Son.noise(.09, .09 * v, 700, 0, 200); Son.tone(95 * r, .1, 'sine', .07 * v, 60); break;
      case 'os': Son.noise(.035, .08 * v, 3500); Son.tone(420 * r, .05, 'square', .015 * v, 260); break;
      case 'chitine': Son.noise(.05, .07 * v, 2200, 0, 900); Son.noise(.04, .05 * v, 1600, .03); break;
      case 'ecailles': Son.noise(.07, .08 * v, 1100, 0, 400); Son.tone(180 * r, .07, 'triangle', .03 * v, 120); break;
      case 'ether': Son.tone(620 * r, .18, 'sine', .025 * v, 1250); Son.noise(.15, .02 * v, 3000, 0, 1200); break;
      case 'flamme': Son.noise(.12, .06 * v, 3200, 0, 700); Son.noise(.05, .04 * v, 5000, .05); break;
      default: Son.noise(.08, .08 * v, 520, 0, 150); Son.tone(110 * r, .09, 'sine', .06 * v, 70);
    }
  } finally { Son.sfx = avant; }
}

// ---------- débris, gouttes, braises, fumée (avec une fausse hauteur : ils retombent au sol) ----------
const Debris = {
  l: [], t0: 0,
  max() { return G.opts && G.opts.effetsReduits ? 120 : 340; },
  ajout(o) { if (this.l.length < this.max()) this.l.push(Object.assign({ t: 0, z: 0, vz: 0, rot: R() * TAU, vr: R.range(-9, 9), sol: 0 }, o)); },
  maj() {
    const now = performance.now(), dt = this.t0 ? Math.min(.05, (now - this.t0) / 1000) : 0; this.t0 = now;
    if (!dt) return;
    const k = G.ralenti > 0 ? .4 : 1, d = dt * k;
    for (const q of this.l) {
      q.t += d;
      if (q.type === 'volute') { q.x += q.vx * d; q.y += q.vy * d; q.vx *= .97; q.vy *= .97; q.r += q.vr2 * d; continue; }
      if (q.type === 'braise') { q.x += q.vx * d; q.y += q.vy * d; q.vy -= 30 * d; continue; }
      if (q.type === 'anneauSol') continue;
      if (q.sol) { q.vx *= .8; q.vy *= .8; q.x += q.vx * d; q.y += q.vy * d; continue; }
      q.x += q.vx * d; q.y += q.vy * d; q.z += q.vz * d; q.vz -= 900 * d; q.rot += q.vr * d;
      if (q.z <= 0) { q.z = 0; if (q.vz < -160 && !q.rebond) { q.vz = -q.vz * .35; q.vx *= .6; q.vy *= .6; q.rebond = true; } else { q.sol = 1; q.vz = 0; q.tSol = q.t; } }
    }
    this.l = this.l.filter(q => q.t < q.vie);
  },
  dessiner(c) {
    this.maj();
    if (!this.l.length) return;
    c.save();
    for (const q of this.l) {
      const f = Math.min(1, (q.vie - q.t) / .4);
      if (q.type === 'volute') { c.globalAlpha = q.a * f * Math.min(1, q.t * 6); c.fillStyle = q.col; c.beginPath(); c.arc(q.x, q.y, q.r, 0, TAU); c.fill(); continue; }
      if (q.type === 'anneauSol') { const k = q.t / q.vie; c.globalAlpha = .45 * (1 - k); c.strokeStyle = q.col; c.lineWidth = 6 * (1 - k) + 1; c.beginPath(); c.ellipse(q.x, q.y, q.r * (.4 + k), q.r * (.4 + k) * .55, 0, 0, TAU); c.stroke(); continue; }
      if (q.type === 'braise') { const fl = .5 + .5 * Math.sin(q.t * 30 + q.rot * 5); c.globalAlpha = f; c.fillStyle = fl > .5 ? q.col : '#fff3c0'; c.beginPath(); c.arc(q.x, q.y, q.taille * (.6 + .4 * fl), 0, TAU); c.fill(); continue; }
      // ombre au sol tant qu'il vole
      if (q.z > 1) { c.globalAlpha = .3 * f; c.fillStyle = '#000'; c.beginPath(); c.ellipse(q.x, q.y + 2, q.taille * .9, q.taille * .45, 0, 0, TAU); c.fill(); }
      c.globalAlpha = f;
      const y = q.y - q.z;
      if (q.type === 'goutte') {
        if (q.sol) { c.fillStyle = q.col; c.globalAlpha = f * .75; c.beginPath(); c.ellipse(q.x, q.y, q.taille * 1.6, q.taille * .8, q.rot, 0, TAU); c.fill(); }
        else { c.fillStyle = q.col; c.beginPath(); c.arc(q.x, y, q.taille * .7, 0, TAU); c.fill(); }
      } else if (q.type === 'etincelle') {
        if (q.sol) continue;
        const L = Math.hypot(q.vx, q.vy) * .025 + 2; const a = Math.atan2(q.vy - q.vz * .3, q.vx);
        c.strokeStyle = q.col; c.lineWidth = 1.6; c.globalCompositeOperation = 'lighter'; c.beginPath(); c.moveTo(q.x, y); c.lineTo(q.x - Math.cos(a) * L, y - Math.sin(a) * L); c.stroke(); c.globalCompositeOperation = 'source-over';
      } else { // éclat : petit polygone qui tourne
        c.save(); c.translate(q.x, y); c.rotate(q.rot); c.fillStyle = q.col;
        c.beginPath(); c.moveTo(q.taille, 0); c.lineTo(-q.taille * .4, q.taille * .8); c.lineTo(-q.taille * .7, -q.taille * .5); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1; c.stroke(); c.restore();
      }
    }
    c.restore();
  }
};
function jet(x, y, a, ouv, vmin, vmax) { const an = a + R.range(-ouv, ouv), v = R.range(vmin, vmax); return { x, y, vx: Math.cos(an) * v, vy: Math.sin(an) * v }; }
// couleurs de chaque matière (la teinte du boss colore les écailles et l'éther)
function couleursMatiere(mat, h) {
  switch (mat) {
    case 'metal': return { eclat: hsl(h, 10, 55), etin: '#ffd27a' };
    case 'pierre': return { eclat: '#8a8078', poussiere: 'rgba(170,160,150,.5)' };
    case 'os': return { eclat: '#ece4cc' };
    case 'chitine': return { eclat: hsl(h, 40, 30), goutte: '#b8d84a' };
    case 'ecailles': return { eclat: hsl(h, 60, 40) };
    case 'ether': return { volute: hsl(h, 80, 70) };
    case 'flamme': return { braise: '#ffb347' };
    default: return { goutte: '#7a1020', eclat: hsl(h, 30, 30) };
  }
}
let _impVisT = 0;
function impactBoss(x, y, fort) {
  const now = performance.now(); if (now - _impVisT < (fort ? 0 : 55)) return; _impVisT = now;
  const def = G.def; if (!def) return;
  const mat = (typeof MATIERE_ESP !== 'undefined' && MATIERE_ESP[def.esp]) || 'chair', C = couleursMatiere(mat, def.hue || 0);
  const a = G.p ? ang(G.p.x, G.p.y, x, y) : R() * TAU, n = fort ? 5 : 2;
  for (let i = 0; i < n; i++) {
    const j = jet(x, y, a, 1, 60, 220);
    if (C.etin) Debris.ajout(Object.assign(j, { type: 'etincelle', col: C.etin, z: 6, vz: R.range(150, 320), taille: 1.5, vie: .5 }));
    if (C.eclat && (i % 2 === 0 || !C.etin)) Debris.ajout(Object.assign(jet(x, y, a, .9, 50, 170), { type: 'eclat', col: C.eclat, z: 8, vz: R.range(120, 260), taille: R.range(2, 4), vie: 1.4 }));
    if (C.goutte) Debris.ajout(Object.assign(jet(x, y, a, .8, 40, 150), { type: 'goutte', col: C.goutte, z: 8, vz: R.range(90, 220), taille: R.range(2, 3.5), vie: 1.6 }));
    if (C.volute) Debris.ajout({ type: 'volute', x: x + R.range(-6, 6), y: y + R.range(-6, 6), vx: Math.cos(a) * 30 + R.range(-15, 15), vy: Math.sin(a) * 30 - 25, r: R.range(4, 7), vr2: 18, col: C.volute, a: .35, vie: .8 });
    if (C.braise) Debris.ajout({ type: 'braise', x, y, vx: R.range(-40, 40) + Math.cos(a) * 40, vy: R.range(-70, -20), taille: R.range(1.5, 2.5), col: C.braise, vie: .9 });
    if (C.poussiere && i === 0) Debris.ajout({ type: 'volute', x, y, vx: Math.cos(a) * 20, vy: Math.sin(a) * 20, r: 6, vr2: 30, col: C.poussiere, a: .4, vie: .7 });
  }
}
// explosions : débris, fumée qui monte et nuage de poussière au sol
function debrisExplosion(x, y, r, col) {
  if (r < 30) return;
  const n = Math.min(14, Math.round(r / 10)) * (G.opts && G.opts.effetsReduits ? .5 : 1);
  for (let i = 0; i < n; i++) Debris.ajout(Object.assign(jet(x, y, R() * TAU, Math.PI, r * 1.2, r * 3), { type: 'eclat', col: i % 3 ? '#3a3436' : '#5a4e48', z: 4, vz: R.range(200, 420), taille: R.range(2, 4.5), vie: 1.8 }));
  for (let i = 0; i < Math.min(5, 1 + r / 40); i++) Debris.ajout({ type: 'volute', x: x + R.range(-r, r) * .4, y: y + R.range(-r, r) * .4, vx: R.range(-20, 20), vy: R.range(-45, -15), r: r * R.range(.18, .3), vr2: r * .35, col: 'rgba(48,42,46,.9)', a: .35, vie: 1.5 });
  Debris.ajout({ type: 'anneauSol', x, y, r: r * 1.3, col: 'rgba(200,190,170,.8)', vie: .55 });
  for (let i = 0; i < Math.min(8, r / 15); i++) Debris.ajout({ type: 'braise', x: x + R.range(-r, r) * .5, y: y + R.range(-r, r) * .5, vx: R.range(-60, 60), vy: R.range(-120, -40), taille: R.range(1.5, 2.6), col: col && col[0] === '#' ? col : '#ffb347', vie: 1 });
}

// ---------- branchements ----------
const _frappeReel = G.frappe;
G.frappe = function (tg, dmg, o) {
  const r = _frappeReel.apply(this, arguments);
  try {
    const bo = G.boss;
    if (bo && !bo.mort && dmg > 0 && (tg === bo || (tg && tg.proxy === bo))) { const x = o && Number.isFinite(o.x) ? o.x : bo.x, y = o && Number.isFinite(o.y) ? o.y : bo.y; if (!(o && o.continu) || R() < .15) impactBoss(x, y, dmg >= 60); }
  } catch (e) { }
  return r;
};
const _exploReel = G.explo;
G.explo = function (x, y, r, col) { const res = _exploReel.apply(this, arguments); try { debrisExplosion(x, y, r, col); } catch (e) { } return res; };
const _blesserReel = G.blesser;
G.blesser = function () {
  const p = this.p, hp0 = p ? p.hp : 0;
  const r = _blesserReel.apply(this, arguments);
  try { if (p && p.hp < hp0) { for (let i = 0; i < 8; i++) Debris.ajout(Object.assign(jet(p.x, p.y, R() * TAU, Math.PI, 80, 260), { type: 'etincelle', col: i % 2 ? '#ffe9b0' : '#ff8a5c', z: 10, vz: R.range(150, 300), taille: 1.5, vie: .5 })); } } catch (e) { }
  return r;
};
const _mortReel = G.bossMort;
G.bossMort = function () {
  const b = this.boss, vivant = b && !b.mort;
  const r = _mortReel.apply(this, arguments);
  try {
    if (vivant && b && b.mort) {
      const mat = (typeof MATIERE_ESP !== 'undefined' && MATIERE_ESP[this.def.esp]) || 'chair', C = couleursMatiere(mat, this.def.hue || 0);
      for (let i = 0; i < 26; i++) Debris.ajout(Object.assign(jet(b.x, b.y, R() * TAU, Math.PI, 120, 420), { type: 'eclat', col: C.eclat || hsl(this.def.hue, 40, 35), z: 20, vz: R.range(250, 520), taille: R.range(3, 7), vie: 3 }));
      for (let i = 0; i < 8; i++) Debris.ajout({ type: 'volute', x: b.x + R.range(-b.r, b.r), y: b.y + R.range(-b.r, b.r), vx: R.range(-15, 15), vy: R.range(-40, -15), r: b.r * R.range(.3, .5), vr2: 30, col: 'rgba(40,36,42,.9)', a: .4, vie: 2.4 });
    }
  } catch (e) { }
  return r;
};
if (typeof explosionZone === 'function') { const _ez = explosionZone; explosionZone = function (h, cx, cy, r) { Son._pos = { x: cx, y: cy }; try { return _ez.apply(this, arguments); } finally { Son._pos = null; } }; }
const _fxReel = dessinerFx;
dessinerFx = function (c) { try { if (G.etat !== 'menu') Debris.dessiner(c); } catch (e) { } return _fxReel.apply(this, arguments); };
const _entrerReel = G.entrerSalle;
G.entrerSalle = function () { Debris.l.length = 0; return _entrerReel.apply(this, arguments); };
