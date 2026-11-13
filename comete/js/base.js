'use strict';
/* COMÈTE — outils communs : hasard à graine, géométrie, sauvegarde */

var DT = 1 / 120;           // pas fixe de la simulation (s)

function rngGraine(s) {
  var a = (s >>> 0) || 1;
  var f = function () {
    a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.entre = function (x, y) { return x + f() * (y - x); };
  f.ent = function (x, y) { return x + Math.floor(f() * (y - x + 1)); };
  f.choix = function (l) { return l[Math.floor(f() * l.length)]; };
  f.signe = function () { return f() < 0.5 ? -1 : 1; };
  f.pondere = function (l) { // l : [[valeur, poids], ...]
    var tot = 0, i; for (i = 0; i < l.length; i++) tot += l[i][1];
    var r = f() * tot; for (i = 0; i < l.length; i++) { r -= l[i][1]; if (r <= 0) return l[i][0]; }
    return l[l.length - 1][0];
  };
  f.melange = function (l) { for (var i = l.length - 1; i > 0; i--) { var j = Math.floor(f() * (i + 1)), t = l[i]; l[i] = l[j]; l[j] = t; } return l; };
  return f;
}
function hashTexte(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function dist2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
function angDiff(a, b) { var d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; }
var TAU = Math.PI * 2;

/* ---------- géométrie ---------- */
// intersection des segments [p1,p2] et [p3,p4] → t sur le premier (0..1) ou -1
function interSeg(x1, y1, x2, y2, x3, y3, x4, y4) {
  var d = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
  if (Math.abs(d) < 1e-12) return -1;
  var t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / d;
  var u = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / d;
  if (t < 0 || t > 1 || u < 0 || u > 1) return -1;
  return t;
}
// point dans un polygone (tableau plat [x0,y0,x1,y1,...])
function dansPoly(px, py, P) {
  var dedans = false, n = P.length / 2;
  for (var i = 0, j = n - 1; i < n; j = i++) {
    var xi = P[i * 2], yi = P[i * 2 + 1], xj = P[j * 2], yj = P[j * 2 + 1];
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) dedans = !dedans;
  }
  return dedans;
}
function airePoly(P) {
  var a = 0, n = P.length / 2;
  for (var i = 0, j = n - 1; i < n; j = i++) a += P[j * 2] * P[i * 2 + 1] - P[i * 2] * P[j * 2 + 1];
  return Math.abs(a) / 2;
}
// distance² d'un point à un segment
function distSeg2(px, py, ax, ay, bx, by) {
  var dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  var x = ax + dx * t - px, y = ay + dy * t - py; return x * x + y * y;
}

/* ---------- dates ---------- */
function dateJour() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function numJour() { var d = new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); }
function pluriel(n, mot, motPl) { return n + ' ' + (n > 1 || n === 0 ? (motPl || mot + 's') : mot); }
function fmtTemps(s) { if (s == null) return '—'; var m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1); }

/* ---------- sauvegarde ----------
   Trois parties en cours, une par difficulté (chacune a sa progression, sa poussière, ses compétences) ;
   statistiques, succès, collection et réglages sont communs. */
function partieVide() {
  return {
    ascension: { debloque: 1, rec: {} },                 // rec[n] = { pct, temps, etoiles, essais, victoires }
    odyssee: { meilleur: 0, parties: 0 },
    jour: { date: '', meilleur: null, essais: 0, serie: 0, dernier: '', fait: 0 },
    poussiere: 0, poussiereTotale: 0,
    comp: { niv: { lasso: 1, supernova: 1 }, slots: ['lasso', null, 'supernova'], vus: {} },
    ameli: { vitesse: 0, trainee: 0, elan: 0, energie: 0, combo: 0, coeur: 0 },
    tuto: 0, joue: 0
  };
}
var Sauve = {
  cle: 'comete_v1', d: null,
  defaut: function () {
    return {
      diff: 'comete',
      parties: { etincelle: partieVide(), comete: partieVide(), trounoir: partieVide() },
      stats: { boucles: 0, balles: 0, colosses: 0, titans: 0, morts: 0, coups: 0, temps: 0, comboMax: 0, pile: 0, novas: 0, noyaux: 0, mortsPar: {}, multiMax: 0, ballesMax: 0, serrees: 0, comps: 0 },
      succes: {}, cosmetique: { couleur: 0, trainee: 0 },
      reglages: { musique: 0.7, sons: 0.8, tremblement: 1 }
    };
  },
  charger: function () {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(this.cle) || 'null'); } catch (e) { d = null; }
    var def = this.defaut();
    if (!d || typeof d !== 'object') d = def;
    // première version (une seule partie) : elle devient la partie « Comète »
    if (!d.parties) {
      var p = partieVide();
      if (d.ascension) p.ascension = d.ascension;
      if (d.odyssee) p.odyssee = d.odyssee;
      if (d.jour) p.jour = d.jour;
      p.tuto = d.tuto || 0;
      d.parties = { etincelle: partieVide(), comete: p, trounoir: partieVide() };
      delete d.ascension; delete d.odyssee; delete d.jour; delete d.tuto;
    }
    (function fusion(a, b) { for (var k in b) { if (!(k in a)) a[k] = b[k]; else if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') fusion(a[k], b[k]); } })(d, def);
    for (var k in d.parties) (function fusion(a, b) { for (var q in b) { if (!(q in a)) a[q] = b[q]; else if (b[q] && typeof b[q] === 'object' && !Array.isArray(b[q]) && a[q] && typeof a[q] === 'object') fusion(a[q], b[q]); } })(d.parties[k], partieVide());
    if (!d.parties[d.diff]) d.diff = 'comete';
    this.d = d; return d;
  },
  ecrire: function () { try { localStorage.setItem(this.cle, JSON.stringify(this.d)); } catch (e) { } }
};
function PR() { return Sauve.d.parties[Sauve.d.diff]; }
