'use strict';
/* PULSAR — base : constantes, hasard à graine, utilitaires, sauvegarde */

var DT = 1 / 240;            // pas de physique fixe (identique pour le fantôme et le joueur)
var HAUT = 10;               // hauteur du monde (sol y=0, plafond y=10)
var VITESSES = [8.4, 10.4, 12.96, 15.6, 19.2];
var NOMS_VITESSE = ['lente', 'normale', 'rapide', 'très rapide', 'folle'];
var MODES = ['cube', 'vaisseau', 'boule', 'onde', 'ovni'];
var NOMS_MODE = { cube: 'Cube', vaisseau: 'Vaisseau', boule: 'Boule', onde: 'Onde', ovni: 'Ovni' };

function rngGraine(s) {
  // mulberry32
  var a = (s >>> 0) || 1;
  var f = function () {
    a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.entre = function (a, b) { return a + (b - a) * f(); };
  f.ent = function (a, b) { return a + Math.floor((b - a + 1) * f()); };
  f.choix = function (t) { return t[Math.floor(f() * t.length)]; };
  f.pondere = function (o) { // {cle: poids}
    var tot = 0, k; for (k in o) tot += o[k];
    var r = f() * tot; for (k in o) { r -= o[k]; if (r <= 0) return k; }
    return k;
  };
  return f;
}
function hashTexte(t) {
  var h = 2166136261 >>> 0;
  for (var i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }

/* ---------- Difficulté ---------- */
function etiquetteD(D) {
  if (D < 2) return { nom: 'Facile', c: '#5ad0ff' };
  if (D < 4) return { nom: 'Normal', c: '#5dff8a' };
  if (D < 7) return { nom: 'Difficile', c: '#ffd23f' };
  if (D < 11) return { nom: 'Dur', c: '#ff9a3d' };
  if (D < 16) return { nom: 'Extrême', c: '#ff4d6d' };
  if (D < 22) return { nom: 'Démon facile', c: '#ff5ad8' };
  if (D < 30) return { nom: 'Démon', c: '#c06bff' };
  if (D < 40) return { nom: 'Démon extrême', c: '#8a5cff' };
  return { nom: 'Démon ' + romain(Math.floor((D - 40) / 10) + 1) + ' ∞', c: '#ffffff' };
}
function romain(n) {
  var v = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  var s = ''; for (var i = 0; i < v.length; i++) while (n >= v[i][0]) { s += v[i][1]; n -= v[i][0]; }
  return s;
}
// Difficulté d'un niveau du Parcours (sans fin)
function dParcours(n) {
  var base = 1 + (n - 1) * 0.3;
  if (n % 10 === 0) base += 0.8;             // grand boss
  else if (n % 10 === 1 && n > 1) base -= 0.6; // respiration après un grand boss
  return Math.max(1, Math.round(base * 10) / 10);
}

/* ---------- Sauvegarde ---------- */
var Sauve = {
  cle: 'pulsar_v1',
  d: null,
  defaut: function () {
    return {
      v: 1,
      pseudo: '',
      parcours: { debloque: 1, niv: {} },         // niv[n] = {essais, best, fini, eclats, eclatsMax, pratiqueBest, temps}
      defis: { jour: {}, semaine: {}, serie: 0, dernierJour: '' },
      infini: { record: 0, recordD: 0, parties: 0 },
      atelier: {},                                  // atelier[mode] = {D: record}
      stats: { essais: 0, sauts: 0, temps: 0, finis: 0, eclats: 0, morts: { cube: 0, vaisseau: 0, boule: 0, onde: 0, ovni: 0 }, causes: {}, grandsBoss: 0, premierEssai: 0 },
      icone: { cube: 0, c1: 0, c2: 5, trainee: 0, explosion: 0 },
      vus: {},                                      // objets déjà annoncés
      succes: {},
      tuto: false,
      reglages: { musique: 0.7, sons: 0.8, frappes: true, secousses: true, particules: true, guide: true, progression: true, fps: false, touches: null }
    };
  },
  charger: function () {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(this.cle) || 'null'); } catch (e) { d = null; }
    var def = this.defaut();
    if (!d || typeof d !== 'object') d = def;
    // compléter les champs manquants
    (function fusion(a, b) { for (var k in b) { if (a[k] === undefined) a[k] = b[k]; else if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && typeof a[k] === 'object') fusion(a[k], b[k]); } })(d, def);
    this.d = d;
    return d;
  },
  ecrire: function () { try { localStorage.setItem(this.cle, JSON.stringify(this.d)); } catch (e) { } }
};

function dateJour(dt) {
  dt = dt || new Date();
  return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
}
function numSemaine(dt) {
  dt = dt || new Date();
  var d = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()));
  var j = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - j);
  var a = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return d.getUTCFullYear() + '-S' + Math.ceil((((d - a) / 86400000) + 1) / 7);
}
