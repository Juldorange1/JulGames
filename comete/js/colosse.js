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

/* les espèces : la forme du colosse et la façon dont ses cristaux bougent */
var ESPECES = {
  sentinelle: { dMin: 1, nom: 'Sentinelle', desc: 'Ses cristaux tournent autour de lui.' },
  essaim:     { dMin: 3, nom: 'Essaim', desc: 'Une nuée de petits cristaux : encercles-en plusieurs à la fois.' },
  pendule:    { dMin: 5, nom: 'Pendule', desc: 'Ses cristaux se balancent au bout de longues chaînes.' },
  hydre:      { dMin: 7, nom: 'Hydre', desc: 'Il serpente dans l\'arène, ses cristaux le suivent en file.' },
  jumeaux:    { dMin: 9, nom: 'Jumeaux', desc: 'Deux corps qui tournent l\'un autour de l\'autre.' },
  forteresse: { dMin: 11, nom: 'Forteresse', desc: 'Un rempart tournant protège ses cristaux : entre par les brèches.' }
};
/* les sortes de cristaux (noyaux) */
var TYPES_NOYAU = {
  normal:   { dMin: 1, ico: '◆', nom: 'Cristal', court: 'entoure-le', desc: 'Encercle-le pour le frapper.' },
  sens:     { dMin: 4, ico: '↻', nom: 'Cristal tournant', court: 'suis la flèche', desc: 'Ne se brise que si tu tournes dans le sens de sa flèche jaune.' },
  blinde:   { dMin: 6, ico: '⛨', nom: 'Cristal blindé', court: 'petite boucle', desc: 'Seules les petites boucles serrées le frappent.' },
  lie:      { dMin: 8, ico: '⛓', nom: 'Cristaux liés', court: 'les deux ensemble', desc: 'Deux cristaux enchaînés : entoure-les ensemble.' },
  vivace:   { dMin: 10, ico: '🌱', nom: 'Cristal vivace', court: 'se répare vite', desc: 'Il se répare très vite si tu le laisses tranquille.' },
  eclatant: { dMin: 12, ico: '✸', nom: 'Cristal éclatant', court: 'éclate en deux', desc: 'Brisé, il éclate en deux petits cristaux rapides.' },
  fantome:  { dMin: 14, ico: '👻', nom: 'Cristal fantôme', court: 'parfois intouchable', desc: 'Il devient transparent et intouchable deux temps sur quatre.' }
};

/* catalogue des attaques : niveau d'apparition, poids, durée d'annonce (en temps) */
var CATALOGUE = {
  rosace:    { dMin: 1, poids: 3, annonce: 1, nom: 'Rosace' },
  mines:     { dMin: 1, poids: 2, annonce: 1, nom: 'Mines' },
  salve:     { dMin: 1, poids: 3, annonce: 1, nom: 'Salve' },
  laser:     { dMin: 2, poids: 3, annonce: 1, nom: 'Laser' },
  eclats:    { dMin: 3, poids: 2, annonce: 1, nom: 'Éclats' },
  spirale:   { dMin: 3, poids: 2, annonce: 1, nom: 'Spirale' },
  onde:      { dMin: 4, poids: 1.4, annonce: 2, nom: 'Onde' },
  traqueurs: { dMin: 5, poids: 2, annonce: 1, nom: 'Traqueurs' },
  faux:      { dMin: 6, poids: 2, annonce: 1, nom: 'Faux' },
  meteores:  { dMin: 6, poids: 2, annonce: 2, nom: 'Météores' },
  croix:     { dMin: 7, poids: 2, annonce: 2, nom: 'Croix' },
  cage:      { dMin: 8, poids: 2, annonce: 1, nom: 'Cage' },
  ruee:      { dMin: 8, poids: 2, annonce: 1, nom: 'Ruée' },
  serpent:   { dMin: 10, poids: 2, annonce: 1, nom: 'Serpent' },
  murs:      { dMin: 10, poids: 2, annonce: 2, nom: 'Murs' },
  eclair:    { dMin: 12, poids: 2, annonce: 2, nom: 'Éclair' },
  balayage:  { dMin: 12, poids: 2, annonce: 2, nom: 'Balayage' },
  pluie:     { dMin: 14, poids: 2, annonce: 1, nom: 'Pluie' },
  trounoir:  { dMin: 15, poids: 1.5, annonce: 2, nom: 'Trou noir' },
  fleur:     { dMin: 17, poids: 2, annonce: 1, nom: 'Fleur' }
};

var LOURDES = { onde: 1, murs: 1, croix: 1, balayage: 1, meteores: 1, trounoir: 1, cage: 1, eclair: 1, faux: 1, ruee: 1 };

function nomColosse(R) {
  var n = R.choix(SYL1) + R.choix(SYL2) + R.choix(SYL3);
  return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
}

/* opts : { n (difficulté), graine, titan } */
function genColosse(opts) {
  var d = Math.max(1, opts.n), graine = opts.graine != null ? opts.graine : Math.floor(d) * 7919 + 13;
  var R = rngGraine(graine);
  var titan = !!opts.titan;
  var def = { d: d, graine: graine, titan: titan };
  def.nom = nomColosse(R);
  def.epithete = titan ? R.choix(TITRES_TITAN) : R.choix(EPITHETES);
  def.teinte = R.ent(0, 359);
  // les cristaux ne sont jamais rouges (le rouge est réservé aux balles)
  def.teinte2 = R.choix([55, 80, 120, 150, 170, 185, 200, 215, 250, 270, 290]);
  def.bpm = Math.round(clamp(100 + d * 1.3 + R.ent(-5, 5), 96, 156) / 2) * 2;
  var f = clamp(d / 10, 0, 1);    // montée en puissance des mouvements

  // espèce
  var esp = [];
  for (var e in ESPECES) if (ESPECES[e].dMin <= d) esp.push([e, e === 'sentinelle' ? 1.2 : (ESPECES[e].dMin > d - 4 ? 2.5 : 1.5)]);
  def.espece = d <= 2 ? 'sentinelle' : R.pondere(esp);

  // corps
  def.corps = {
    forme: R.choix(['poly', 'poly', 'etoile', 'cercle', 'couronne']),
    cotes: R.ent(3, 7),
    r: (titan ? 1.0 : 0.78) + R() * 0.2,
    rotV: R.entre(0.2, 0.7) * R.signe(),
    ax: R.entre(1.0, 3.0) * f, ay: R.entre(0.5, 1.4) * f,
    fx: R.entre(0.12, 0.3), fy: R.entre(0.15, 0.35), ph: R() * TAU,
    f1: R.entre(0.8, 1.2), f2: R.entre(1.1, 1.6), vit: clamp(1.2 + d * 0.025, 1.2, 2.4)
  };
  if (def.espece === 'jumeaux') def.corps.r = 0.62;
  if (def.espece === 'forteresse') { def.corps.r = 0.7; def.rempart = { r: 2.95, rot: R.entre(0.22, 0.4) * R.signe(), larg: Math.max(1.0, 1.35 - d * 0.006) }; }

  // nombre et vie des cristaux
  var m = clamp(2 + Math.floor((d + 1) / 7) + (R() < 0.35 ? 1 : 0), 2, 6) + (titan ? 2 : 0);
  if (d <= 1) m = 2;
  var hpMul = 1;
  if (def.espece === 'essaim') { m = clamp(6 + Math.floor(d / 8), 6, 10) + (titan ? 3 : 0); hpMul = 0.42; }
  if (def.espece === 'jumeaux') m = Math.max(4, m + (m % 2));
  if (def.espece === 'pendule' || def.espece === 'hydre' || def.espece === 'jumeaux') m = Math.min(m, 6);
  if (def.espece === 'forteresse') m = Math.min(m, 4);
  m = Math.min(m, 13);
  var hp = Math.round((10 + d * 1.15) * (titan ? 1.25 : 1) * hpMul);

  // sortes de cristaux de ce colosse (une ou deux en plus des normaux)
  var typesDispo = [];
  for (var t in TYPES_NOYAU) if (t !== 'normal' && TYPES_NOYAU[t].dMin <= d && !(t === 'lie' && def.espece === 'essaim')) typesDispo.push(t);
  R.melange(typesDispo);
  def.types = typesDispo.slice(0, d < 4 ? 0 : d < 13 ? 1 : 2);
  var partType = clamp(0.35 + d * 0.012, 0.35, 0.8);

  var sens = R.signe();
  var w = (d <= 1 ? 0.22 : R.entre(0.15, 0.5) * (0.4 + f)) * sens;
  var bouclierP = d < 6 ? 0 : clamp(0.1 + (d - 6) * 0.02, 0, 0.45);
  def.noyaux = [];
  for (var i = 0; i < m; i++) {
    var nk = {
      hp: hp, r: def.espece === 'essaim' ? 0.24 : 0.3, type: 'normal', place: 'orbite',
      dist: R.entre(1.9, 2.7) + (titan ? 0.3 : 0), a0: TAU * i / m + R.entre(-0.2, 0.2),
      w: w * (R() < 0.25 && d >= 8 ? -1.6 : 1),
      resp: d < 4 ? 0 : R.entre(0, 0.7) * f, respF: R.entre(0.4, 1.0), respPh: R() * TAU,
      bouclier: null, timide: d >= 10 && R() < clamp((d - 10) * 0.025, 0, 0.3), corps: 0, lien: null
    };
    switch (def.espece) {
      case 'essaim': nk.dist = R.entre(1.4, 3.3); nk.w = R.entre(0.3, 0.9) * R.signe(); nk.bourdon = R.entre(0.25, 0.5); nk.bF = R.entre(1, 2); nk.bPh = R() * TAU; break;
      case 'pendule': nk.place = 'pendule'; nk.long = R.entre(2.3, 3.7); nk.amp = R.entre(0.4, 0.85); nk.om = R.entre(0.5, 0.9); nk.ph = R() * TAU; nk.pivot = (i - (m - 1) / 2) * 0.55; break;
      case 'hydre': nk.place = 'chaine'; nk.rang = i + 1; break;
      case 'jumeaux': nk.corps = i % 2; nk.dist = R.entre(1.7, 2.1); nk.a0 = TAU * Math.floor(i / 2) / Math.ceil(m / 2) + (i % 2) * 0.5; break;
      case 'forteresse': nk.dist = R.entre(1.6, 1.8); nk.resp = 0; nk.w = R.entre(0.15, 0.35) * sens; break;
    }
    if (R() < bouclierP) nk.bouclier = { per: R.choix([8, 8, 16]), debut: R.ent(0, 7), duree: R.choix([2, 3]) };
    if (def.types.length && R() < partType) {
      nk.type = R.choix(def.types);
      if (nk.type === 'sens') nk.sens = R.signe();
    }
    def.noyaux.push(nk);
  }
  // les cristaux liés vont par paires, côte à côte (sinon ils redeviennent normaux)
  var L = def.noyaux;
  for (i = 0; i < L.length; i++) {
    var a = L[i];
    if (a.type !== 'lie' || a.lien != null) continue;
    var b = null;
    for (var k2 = i + 1; k2 < L.length; k2++) if (L[k2].corps === a.corps && L[k2].lien == null && (L[k2].type === 'normal' || L[k2].type === 'lie')) { b = k2; break; }
    if (b == null) { a.type = 'normal'; continue; }
    var nb = L[b];
    nb.type = 'lie'; nb.sens = undefined; a.lien = b; nb.lien = i;
    nb.dist = a.dist; nb.w = a.w; nb.resp = a.resp; nb.respF = a.respF; nb.respPh = a.respPh; nb.a0 = a.a0 + 0.85 / a.dist;
    if (a.place === 'pendule') { nb.long = a.long; nb.amp = a.amp; nb.om = a.om; nb.ph = a.ph + 0.3; nb.pivot = a.pivot + 0.35; }
    if (a.place === 'chaine') nb.rang = a.rang + 0.55;
  }
  if (def.espece === 'hydre') {
    // file bien ordonnée derrière la tête
    var ordre = L.map(function (x, idx) { return idx; }).sort(function (x, y) { return L[x].rang - L[y].rang; });
    var nouv = ordre.map(function (idx) { return L[idx]; }), pos = {};
    ordre.forEach(function (idx, k) { pos[idx] = k; });
    nouv.forEach(function (x, k) { x.rang = k + 1 + (x.type === 'lie' && x.lien != null && pos[x.lien] < k ? -0.45 : 0); if (x.lien != null) x.lien = pos[x.lien]; });
    def.noyaux = nouv;
  }

  // cœur
  def.coeur = {
    hp: Math.round((16 + d * 1.6) * (titan ? 1.5 : 1)),
    v: clamp(1.6 + d * 0.04, 1.6, 3.3) * (titan ? 1.1 : 1),
    f1: R.entre(0.8, 1.2), f2: R.entre(1.1, 1.7), ph: R() * TAU,
    sillage: d >= 5
  };

  // attaques : un répertoire propre au colosse
  var dispo = [];
  for (var c in CATALOGUE) if (CATALOGUE[c].dMin <= d) dispo.push([c, CATALOGUE[c].poids + (CATALOGUE[c].dMin > d - 6 ? 1.5 : 0)]);
  var nbTypes = clamp(3 + Math.floor(d / 5), 3, 7) + (titan ? 1 : 0);
  var rep = [], garde = 0;
  while (rep.length < Math.min(nbTypes, dispo.length) && garde++ < 300) { var ch = R.pondere(dispo); if (rep.indexOf(ch) < 0) rep.push(ch); }
  if (d <= 1) rep = ['rosace', 'mines', 'salve'];
  def.attaques = rep;

  // cycles de 8 temps : quels coups, sur quels temps
  var densite = clamp(3 + Math.floor(d / 8), 3, 5) + (d >= 45 ? 1 : 0);
  // une seule grosse attaque (onde, murs, croix, météores…) par cycle de 8 temps, le reste en attaques légères
  var legeres = rep.filter(function (x) { return !LOURDES[x]; });
  var mkCycle = function (nb2, liste) {
    var slots = [null, null, null, null, null, null, null, null], lourde = false;
    var ord = R.melange([0, 2, 4, 6]).concat(R.melange([1, 3, 5, 7]));
    for (var j = 0; j < nb2 && j < 8; j++) {
      var ch2 = R.choix(liste);
      if (LOURDES[ch2]) { if (lourde) ch2 = legeres.length ? R.choix(legeres) : null; else lourde = true; }
      slots[ord[j]] = ch2;
    }
    return slots;
  };
  def.cycles = []; def.cyclesRage = []; def.cyclesCoeur = [];
  for (var c2 = 0; c2 < 4; c2++) {
    def.cycles.push(mkCycle(densite, rep));
    def.cyclesRage.push(mkCycle(densite + 1, rep));
    def.cyclesCoeur.push(mkCycle(Math.max(3, densite - 1) + (d >= 18 ? 1 : 0), rep));
  }
  def.vB = Math.min(6.4 + Math.max(0, d - 45) * 0.02, 3.0 + d * 0.1, 7.8);
  if (d <= 1) def.vB = 2.7;

  // traits : ce qui rend ce colosse différent des autres (il faut s'adapter)
  var tDispo = [];
  for (var tk in TRAITS) if (TRAITS[tk].dMin <= d) tDispo.push(tk);
  if (def.espece === 'forteresse') tDispo = tDispo.filter(function (x) { return x !== 'aimant'; });
  R.melange(tDispo);
  var nbT = d < 2.5 ? 0 : d < 14 ? 1 : 2;
  if (titan && d >= 2.5) nbT = Math.min(2, nbT + 1);
  // certains traits ensemble seraient injustes
  var exclus = { coriace: 'gardien', gardien: 'coriace', glace: 'aimant', aimant: 'glace' };
  def.traits = [];
  for (var ti = 0; ti < tDispo.length && def.traits.length < nbT; ti++) if (def.traits.indexOf(exclus[tDispo[ti]]) < 0) def.traits.push(tDispo[ti]);
  if (def.traits.indexOf('agile') >= 0) def.noyaux.forEach(function (x) { x.w *= 1.8; if (x.om) x.om *= 1.4; });
  if (def.espece === 'hydre' && def.traits.indexOf('agile') >= 0) def.corps.vit *= 1.25;
  def.coeur.saut = d >= 5 && R() < 0.45;
  return def;
}

/* le colosse n du parcours Ascension : tous les 10 = Titan */
function colosseAscension(n) {
  return genColosse({ n: 1 + (n - 1) * 0.8, titan: n % 10 === 0, graine: n * 7919 + 13 });
}
