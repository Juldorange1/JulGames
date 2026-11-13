'use strict';
/* PULSAR — moteur : niveau, grille spatiale, physique à pas fixe, collisions.
   Le même code fait avancer le joueur et le « fantôme » qui sert à fabriquer les niveaux :
   tout niveau généré est donc franchissable. */

var PHYS = {
  cube: { g: 95, saut: 20, vmax: 28, hs: 0.45, hz: 0.3 },
  vaisseau: { haut: 52, bas: 46, vmax: 9.5, hs: 0.38, hz: 0.27 },
  boule: { g: 95, pousse: 9, vmax: 26, hs: 0.42, hz: 0.3 },
  onde: { hs: 0.2, hz: 0.18 },
  ovni: { g: 55, saut: 11.5, vmax: 15, hs: 0.4, hz: 0.28 }
};
var ORBES = { jaune: 20, rose: 14 };
var TAMPONS = { jaune: 28, rose: 15 };

/* ---------- Grille ---------- */
var CASE = 4;
function Grille() { this.b = new Map(); this.journal = []; }
Grille.prototype.ajouter = function (o, x0, x1) {
  var i0 = Math.floor(x0 / CASE), i1 = Math.floor(x1 / CASE);
  for (var i = i0; i <= i1; i++) {
    var a = this.b.get(i); if (!a) { a = []; this.b.set(i, a); }
    a.push(o); this.journal.push(a);
  }
};
Grille.prototype.marque = function () { return this.journal.length; };
Grille.prototype.annuler = function (m) { while (this.journal.length > m) this.journal.pop().pop(); };
Grille.prototype.pres = function (x0, x1, f) {
  var i0 = Math.floor(x0 / CASE), i1 = Math.floor(x1 / CASE);
  for (var i = i0; i <= i1; i++) {
    var a = this.b.get(i); if (!a) continue;
    for (var k = 0; k < a.length; k++) { var o = a[k]; if (o._v === Grille.tour) continue; o._v = Grille.tour; if (f(o) === true) return true; }
  }
  return false;
};
Grille.tour = 1;

/* ---------- Niveau ---------- */
function Niveau() {
  this.blocs = []; this.piques = []; this.scies = []; this.orbes = []; this.tampons = []; this.portails = [];
  this.eclats = []; this.murs = []; this.attaques = []; this.sections = []; this.deco = [];
  this.g = new Grille();
  this.ghost = [];      // entrée tenue par pas (0/1)
  this.gy = [];         // y du fantôme par pas
  this.gmode = [];      // index de mode par pas
  this.fin = 1e9;       // x de fin
  this.nid = 0;
}
Niveau.prototype.marque = function () {
  return { g: this.g.marque(), b: this.blocs.length, p: this.piques.length, s: this.scies.length, o: this.orbes.length, t: this.tampons.length, po: this.portails.length, e: this.eclats.length, m: this.murs.length, d: this.deco.length };
};
Niveau.prototype.annuler = function (m) {
  this.g.annuler(m.g);
  this.blocs.length = m.b; this.piques.length = m.p; this.scies.length = m.s; this.orbes.length = m.o;
  this.tampons.length = m.t; this.portails.length = m.po; this.eclats.length = m.e; this.murs.length = m.m; this.deco.length = m.d;
};
Niveau.prototype.bloc = function (x, y, w, h, style) {
  var o = { k: 'b', id: this.nid++, x: x, y: y, w: w, h: h, st: style || 0 };
  this.blocs.push(o); this.g.ajouter(o, x, x + w); return o;
};
Niveau.prototype.pique = function (x, y, dir, taille) {
  var o = { k: 'p', id: this.nid++, x: x, y: y, dir: dir, t: taille || 1 };
  this.piques.push(o); this.g.ajouter(o, x, x + 1); return o;
};
Niveau.prototype.scie = function (x, y, r) {
  var o = { k: 's', id: this.nid++, x: x, y: y, r: r };
  this.scies.push(o); this.g.ajouter(o, x - r, x + r); return o;
};
Niveau.prototype.orbe = function (x, y, t) {
  var o = { k: 'o', id: this.nid++, x: x, y: y, t: t };
  this.orbes.push(o); this.g.ajouter(o, x - 0.6, x + 0.6); return o;
};
Niveau.prototype.tampon = function (x, y, t, dir) {
  var o = { k: 't', id: this.nid++, x: x, y: y, t: t, dir: dir };
  this.tampons.push(o); this.g.ajouter(o, x, x + 1); return o;
};
Niveau.prototype.portail = function (x, t, v) {
  var o = { k: 'po', id: this.nid++, x: x, t: t, v: v };
  this.portails.push(o); this.g.ajouter(o, x - 0.5, x + 0.5); return o;
};
Niveau.prototype.eclat = function (x, y) {
  var o = { k: 'e', id: this.nid++, x: x, y: y, n: this.eclats.length };
  this.eclats.push(o); this.g.ajouter(o, x - 0.4, x + 0.4); return o;
};
Niveau.prototype.mur = function (x0, dx, f, c, style) {
  var o = { k: 'm', id: this.nid++, x0: x0, dx: dx, f: f, c: c, x1: x0 + dx * (f.length - 1), st: style || 0 };
  this.murs.push(o); this.g.ajouter(o, x0, o.x1); return o;
};
function murVal(m, tab, x) {
  var u = (x - m.x0) / m.dx; if (u < 0 || u > tab.length - 1) return NaN;
  var i = Math.floor(u); if (i >= tab.length - 1) return tab[tab.length - 1];
  var a = tab[i], b = tab[i + 1]; return a + (b - a) * (u - i);
}

/* ---------- Joueur ---------- */
function nouvelEtat(L) {
  return {
    x: 0, y: PHYS[L.mode0].hs, vy: 0, mode: L.mode0, g: 1, vit: L.vit0, pente: L.pente0 || 1,
    sol: true, mort: false, cause: '', step: 0, tenu: false, dernierAppui: -999, utilises: {}, eclats: 0, eclatsPris: {},
    rot: 0, sauts: 0, fini: false
  };
}
function copieEtat(p) {
  var q = {}; for (var k in p) q[k] = p[k];
  q.utilises = Object.assign({}, p.utilises); q.eclatsPris = Object.assign({}, p.eclatsPris);
  return q;
}
function xAuPas(L, step) { return L.xs ? L.xs[Math.min(step, L.xs.length - 1)] : 0; }

/* Un pas de simulation. tenu = la touche est enfoncée pendant ce pas. */
function pas(p, tenu, L, avecAttaques) {
  if (p.mort || p.fini) return;
  var appui = tenu && !p.tenu; p.tenu = tenu;
  if (appui) p.dernierAppui = p.step;
  var v = VITESSES[p.vit];
  var ox = p.x, oy = p.y;
  p.x += v * DT;
  Grille.tour++;
  var x0 = p.x - 1.2, x1 = p.x + 1.2;

  // portails
  if (L.g.pres(ox - 0.01, p.x + 0.01, function (o) {
    if (o.k !== 'po' || !(o.x > ox && o.x <= p.x)) return;
    if (o.t === 'mode') { var dh = PHYS[o.v].hs - PHYS[p.mode].hs; if (p.sol) p.y += (p.g === 1 ? dh : -dh); p.mode = o.v; p.g = 1; if (o.pente) p.pente = o.pente; var vm = (PHYS[p.mode].vmax || 10); p.vy = clamp(p.vy, -vm, vm); if (p.mode === 'onde') p.vy = 0; }
    else if (o.t === 'grav') { if (p.g !== o.v) { p.g = o.v; p.sol = false; } }
    else if (o.t === 'vit') { p.vit = o.v; }
    else if (o.t === 'fin') { p.fini = true; }
  })) { }
  if (p.fini) { p.step++; return; }
  var ph = PHYS[p.mode], hs = ph.hs;

  // orbes (appui pendant le contact, ou appui très récent en l'air)
  var bufferOK = (p.step - p.dernierAppui) <= 10 && !p.sol;
  if (appui || bufferOK) {
    Grille.tour++;
    L.g.pres(x0, x1, function (o) {
      if (o.k !== 'o' || p.utilises[o.id]) return;
      var dx = Math.max(Math.abs(o.x - p.x) - hs, 0), dy = Math.max(Math.abs(o.y - p.y) - hs, 0);
      if (dx * dx + dy * dy > 0.36) return;
      p.utilises[o.id] = 1; p.dernierAppui = -999;
      if (o.t === 'bleu') { p.g = -p.g; p.vy = -6 * p.g; }
      else p.vy = ORBES[o.t] * p.g * (p.mode === 'ovni' ? 0.7 : p.mode === 'vaisseau' ? 0.45 : 1);
      p.sol = false; p.orbeFlash = 1;
      return true;
    });
  }

  // mouvement vertical selon le mode
  var m = p.mode;
  if (m === 'cube') {
    if (p.sol && tenu) { p.vy = ph.saut * p.g; p.sol = false; p.sauts++; }
    p.vy -= ph.g * p.g * DT;
    if (p.vy * p.g < -ph.vmax) p.vy = -ph.vmax * p.g;
  } else if (m === 'vaisseau') {
    p.vy += (tenu ? ph.haut : -ph.bas) * p.g * DT;
    p.vy = clamp(p.vy, -ph.vmax, ph.vmax);
  } else if (m === 'onde') {
    p.vy = (tenu ? 1 : -1) * p.g * v * p.pente;
  } else if (m === 'boule') {
    var flip = p.sol && (appui || (p.step - p.dernierAppui) <= 14);
    if (flip) { p.g = -p.g; p.vy = -ph.pousse * p.g; p.sol = false; p.dernierAppui = -999; p.sauts++; }
    p.vy -= ph.g * p.g * DT;
    if (p.vy * p.g < -ph.vmax) p.vy = -ph.vmax * p.g;
  } else if (m === 'ovni') {
    if (appui) { p.vy = ph.saut * p.g; p.sauts++; }
    p.vy -= ph.g * p.g * DT;
    if (p.vy * p.g < -ph.vmax) p.vy = -ph.vmax * p.g;
  }
  p.y += p.vy * DT;
  p.sol = false;

  // limites du monde (sol et plafond sûrs)
  if (p.y - hs <= 0) { p.y = hs; if (p.vy < 0) p.vy = 0; if (p.g === 1) p.sol = true; }
  if (p.y + hs >= HAUT) { p.y = HAUT - hs; if (p.vy > 0) p.vy = 0; if (p.g === -1) p.sol = true; }

  // blocs
  var self = p;
  Grille.tour++;
  L.g.pres(p.x - hs, p.x + hs, function (o) {
    if (o.k !== 'b' || o.w <= 0.001) return;
    if (self.x + hs <= o.x || self.x - hs >= o.x + o.w || self.y + hs <= o.y || self.y - hs >= o.y + o.h) return;
    var top = o.y + o.h, bot = o.y;
    var penHaut = top - (self.y - hs), penBas = (self.y + hs) - bot;
    if (self.vy <= 0.001 && penHaut <= Math.max(0.22, -self.vy * DT + 0.03) && (oy - hs) >= top - 0.25) {
      self.y = top + hs; self.vy = 0;
      if (self.g === 1) self.sol = true;
      else if (m === 'cube' || m === 'boule') { self.mort = true; self.cause = 'bloc'; return true; }
    } else if (self.vy >= -0.001 && penBas <= Math.max(0.22, self.vy * DT + 0.03) && (oy + hs) <= bot + 0.25) {
      self.y = bot - hs; self.vy = 0;
      if (self.g === -1) self.sol = true;
      else if (m === 'cube' || m === 'boule') { self.mort = true; self.cause = 'bloc'; return true; }
    } else { self.mort = true; self.cause = 'bloc'; return true; }
  });
  if (p.mort) { p.step++; return; }

  // tampons
  Grille.tour++;
  L.g.pres(p.x - hs, p.x + hs, function (o) {
    if (o.k !== 't' || self.utilises[o.id]) return;
    var ty0 = o.dir === 1 ? o.y : o.y - 0.3, ty1 = ty0 + 0.3;
    if (self.x + hs <= o.x + 0.1 || self.x - hs >= o.x + 0.9 || self.y + hs <= ty0 || self.y - hs >= ty1) return;
    self.utilises[o.id] = 1;
    if (o.t === 'bleu') { self.g = -self.g; self.vy = -8 * self.g; }
    else self.vy = TAMPONS[o.t] * self.g;
    self.sol = false; self.orbeFlash = 1;
  });

  // dangers : piques, scies, murs
  var hz = ph.hz + (p.marge || 0);
  Grille.tour++;
  L.g.pres(p.x - 1.5, p.x + 1.5, function (o) {
    if (o.k === 'p') {
      var ph2 = 0.55 * o.t, l = 0.15 * o.t;
      var cx = o.x + 0.5, ya, yb;
      if (o.dir === 1) { ya = o.y; yb = o.y + ph2; } else { ya = o.y - ph2; yb = o.y; }
      if (self.x + hz > cx - l && self.x - hz < cx + l && self.y + hz > ya && self.y - hz < yb) { self.mort = true; self.cause = 'pique'; return true; }
    } else if (o.k === 's') {
      var dx = Math.max(Math.abs(o.x - self.x) - hz, 0), dy = Math.max(Math.abs(o.y - self.y) - hz, 0);
      var rr = o.r * 0.82; if (dx * dx + dy * dy < rr * rr) { self.mort = true; self.cause = 'scie'; return true; }
    } else if (o.k === 'm') {
      for (var s = -1; s <= 1; s++) {
        var sx = self.x + s * hz;
        var f = murVal(o, o.f, sx), c = murVal(o, o.c, sx);
        if (!isNaN(f) && f > 0.02 && self.y - hz < f) { self.mort = true; self.cause = 'mur'; return true; }
        if (!isNaN(c) && c < HAUT - 0.02 && self.y + hz > c) { self.mort = true; self.cause = 'mur'; return true; }
      }
    } else if (o.k === 'e' && !self.eclatsPris[o.id]) {
      var ex = Math.abs(o.x - self.x), ey = Math.abs(o.y - self.y);
      if (ex < hs + 0.32 && ey < hs + 0.32) { self.eclatsPris[o.id] = 1; self.eclats++; self.eclatFlash = 1; }
    }
  });
  if (p.mort) { p.step++; return; }

  // attaques du boss
  if (avecAttaques && L.attaques.length) {
    var t = (p.step + 1) * DT;
    var A = L.attaques;
    for (var i = 0; i < A.length; i++) {
      var a = A[i];
      if (a.t0 > t + 0.01) break;
      if (t < a.ta || t > a.tb) continue;
      if (ATTAQUES[a.type].touche(a, t, p.x, p.y, hz, L)) { p.mort = true; p.cause = 'boss'; break; }
    }
  }
  if (p.x >= L.fin) p.fini = true;
  p.step++;
}

/* Position x en fonction du pas (déterministe : le défilement ne s'arrête jamais) */
function calculerXs(L, n) {
  var xs = new Float32Array(n + 1);
  var x = 0, vit = L.vit0;
  var po = L.portails.filter(function (o) { return o.t === 'vit'; }).sort(function (a, b) { return a.x - b.x; });
  var k = 0;
  for (var i = 0; i <= n; i++) {
    xs[i] = x;
    var nx = x + VITESSES[vit] * DT;
    while (k < po.length && po[k].x <= nx) { if (po[k].x > x) vit = po[k].v; k++; }
    x = nx;
  }
  return xs;
}
