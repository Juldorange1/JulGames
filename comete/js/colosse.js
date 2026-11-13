'use strict';
/* COMÈTE — création des colosses (chacun est fixe : même numéro = même colosse, pour pouvoir l'apprendre) */

var SYL1 = ['Vor', 'Kael', 'Ith', 'Mor', 'Zar', 'Ul', 'Thal', 'Xen', 'Ar', 'Sol', 'Nyx', 'Bra', 'Ophi', 'Kor', 'Elu', 'Ga', 'Rha', 'Ves', 'Dro', 'Ky', 'Lum', 'Ost', 'Py', 'Sar', 'Tor', 'Umb', 'Yr', 'Zeph'];
var SYL2 = ['a', 'o', 'e', 'i', 'u', 'ae', 'io', 'y'];
var SYL3 = ['rak', 'thos', 'mir', 'xis', 'lon', 'ndra', 'goth', 'rion', 'vel', 'zul', 'quar', 'nesh', 'tar', 'phon', 'drim', 'sk', 'lith', 'mos', 'riel', 'gar'];
var EPITHETES = ['le Veilleur', 'la Fournaise', 'le Tisseur d\'Orage', 'l\'Insomnie', 'le Pendule', 'la Marée Noire', 'le Prisme', 'l\'Éclipse',
  'le Glas', 'la Ronce Stellaire', 'le Métronome', 'l\'Abîme', 'le Diadème', 'la Spirale', 'le Grand Sablier', 'l\'Orage Immobile',
  'le Cristal Hurlant', 'la Comète Morte', 'le Gardien des Anneaux', 'la Forge Céleste', 'le Dévoreur d\'Échos', 'l\'Astre Brisé',
  'le Funambule', 'la Nébuleuse', 'le Juge Silencieux', 'le Cyclone', 'la Lanterne', 'le Roi Sans Ombre', 'l\'Ombre Pâle', 'le Vortex'];
var TITRES_TITAN = ['Titan', 'Titan Ancien', 'Titan Primordial', 'Titan Éternel', 'Titan Absolu'];

/* catalogue des attaques : niveau d'apparition, poids, durée d'annonce (en temps) */
var CATALOGUE = {
  rosace:    { dMin: 1, poids: 3, annonce: 1, nom: 'Rosace' },
  mines:     { dMin: 1, poids: 2, annonce: 1, nom: 'Mines' },
  salve:     { dMin: 2, poids: 3, annonce: 1, nom: 'Salve' },
  laser:     { dMin: 3, poids: 3, annonce: 1, nom: 'Laser' },
  eclats:    { dMin: 4, poids: 2, annonce: 1, nom: 'Éclats' },
  spirale:   { dMin: 4, poids: 2, annonce: 1, nom: 'Spirale' },
  onde:      { dMin: 5, poids: 2, annonce: 1, nom: 'Onde' },
  traqueurs: { dMin: 6, poids: 2, annonce: 1, nom: 'Traqueurs' },
  meteores:  { dMin: 7, poids: 2, annonce: 2, nom: 'Météores' },
  croix:     { dMin: 8, poids: 2, annonce: 2, nom: 'Croix' },
  ruee:      { dMin: 9, poids: 2, annonce: 1, nom: 'Ruée' },
  murs:      { dMin: 11, poids: 2, annonce: 2, nom: 'Murs' },
  balayage:  { dMin: 13, poids: 2, annonce: 2, nom: 'Balayage' },
  pluie:     { dMin: 15, poids: 2, annonce: 1, nom: 'Pluie' },
  fleur:     { dMin: 18, poids: 2, annonce: 1, nom: 'Fleur' }
};

function nomColosse(R) {
  var n = R.choix(SYL1) + R.choix(SYL2) + R.choix(SYL3);
  return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
}

/* opts : { n (numéro / difficulté), graine, titan, mut: {} } */
function genColosse(opts) {
  var d = Math.max(1, opts.n), graine = opts.graine != null ? opts.graine : Math.floor(d) * 7919 + 13;
  var R = rngGraine(graine);
  var titan = !!opts.titan;
  var def = { d: d, graine: graine, titan: titan };
  def.nom = nomColosse(R);
  def.epithete = titan ? R.choix(TITRES_TITAN) : R.choix(EPITHETES);
  def.teinte = R.ent(0, 359);
  // les noyaux ne sont jamais rouges (le rouge est réservé aux balles)
  def.teinte2 = R.choix([55, 80, 120, 150, 170, 185, 200, 215, 250, 270, 290]);
  def.bpm = Math.round(clamp(96 + d * 1.3 + R.ent(-5, 5), 92, 150) / 2) * 2;
  var f = clamp(d / 10, 0, 1);    // montée en puissance des mouvements

  // corps
  def.corps = {
    forme: R.choix(['poly', 'poly', 'etoile', 'cercle', 'couronne']),
    cotes: R.ent(3, 7),
    r: (titan ? 1.05 : 0.78) + R() * 0.22,
    rotV: R.entre(0.2, 0.7) * R.signe(),
    ax: R.entre(1.0, 3.2) * f, ay: R.entre(0.5, 1.6) * f,
    fx: R.entre(0.12, 0.3), fy: R.entre(0.15, 0.35), ph: R() * TAU
  };

  // noyaux
  var m = clamp(2 + Math.floor((d + 1) / 6) + (R() < 0.35 ? 1 : 0), 2, 6) + (titan ? 2 : 0);
  if (d <= 1) m = 2;
  m = Math.min(m, 7);
  var hp = Math.round((5 + d * 0.9) * (titan ? 1.25 : 1));
  var sens = R.signe();
  var w = (d <= 1 ? 0.22 : R.entre(0.15, 0.5) * (0.4 + f)) * sens;
  var bouclierP = d < 6 ? 0 : clamp(0.15 + (d - 6) * 0.025, 0, 0.6);
  def.noyaux = [];
  for (var i = 0; i < m; i++) {
    var nk = {
      hp: hp, dist: R.entre(1.9, 2.7) + (titan ? 0.3 : 0),
      a0: TAU * i / m + R.entre(-0.2, 0.2),
      w: w * (R() < 0.25 && d >= 8 ? -1.6 : 1),
      resp: d < 4 ? 0 : R.entre(0, 0.7) * f, respF: R.entre(0.4, 1.0), respPh: R() * TAU,
      bouclier: null, timide: d >= 10 && R() < clamp((d - 10) * 0.03, 0, 0.4)
    };
    if (R() < bouclierP) nk.bouclier = { per: R.choix([8, 8, 16]), debut: R.ent(0, 7), duree: R.choix([2, 3, 4]) };
    def.noyaux.push(nk);
  }
  // cœur
  def.coeur = {
    hp: Math.round((7 + d * 1.2) * (titan ? 1.5 : 1)),
    v: clamp(1.5 + d * 0.04, 1.5, 3.2) * (titan ? 1.1 : 1),        // unités par seconde
    f1: R.entre(0.8, 1.2), f2: R.entre(1.1, 1.7), ph: R() * TAU,
    sillage: d >= 6
  };

  // attaques : choix d'un répertoire propre au colosse
  var dispo = [];
  for (var k in CATALOGUE) if (CATALOGUE[k].dMin <= d) dispo.push([k, CATALOGUE[k].poids + (CATALOGUE[k].dMin > d - 6 ? 1.5 : 0)]);
  var nbTypes = clamp(2 + Math.floor(d / 5), 2, 6) + (titan ? 1 : 0);
  var rep = [];
  var garde = 0;
  while (rep.length < Math.min(nbTypes, dispo.length) && garde++ < 200) {
    var c = R.pondere(dispo); if (rep.indexOf(c) < 0) rep.push(c);
  }
  if (d <= 1) rep = ['rosace', 'mines'];
  def.attaques = rep;

  // cycles de 8 temps : quels coups, sur quels temps
  var densite = clamp(2 + Math.floor(d / 6), 2, 5) + (d >= 50 ? 1 : 0);
  var mkCycle = function (nb, liste) {
    var slots = [null, null, null, null, null, null, null, null];
    var ordre = R.melange([0, 2, 4, 6]).concat(R.melange([1, 3, 5, 7]));
    for (var j = 0; j < nb && j < 8; j++) slots[ordre[j]] = R.choix(liste);
    return slots;
  };
  def.cycles = []; def.cyclesRage = []; def.cyclesCoeur = [];
  for (var c2 = 0; c2 < 4; c2++) {
    def.cycles.push(mkCycle(densite, rep));
    def.cyclesRage.push(mkCycle(densite + 1 + (d >= 12 ? 1 : 0), rep));
    def.cyclesCoeur.push(mkCycle(Math.max(2, densite - 1) + (d >= 20 ? 1 : 0), rep));
  }
  // vitesse des projectiles
  def.vB = Math.min(6.0 + Math.max(0, d - 45) * 0.02, 2.5 + d * 0.085, 7.5);
  if (d <= 1) def.vB = 2.2;
  return def;
}

/* le colosse n du parcours Ascension : tous les 10 = Titan */
function colosseAscension(n) {
  return genColosse({ n: 1 + (n - 1) * 0.75, titan: n % 10 === 0, graine: n * 7919 + 13 });
}
