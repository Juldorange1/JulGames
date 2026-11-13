'use strict';
/* COMÈTE — simulation d'un combat (indépendante de l'affichage : sert aussi aux tests et au bot)
   La comète laisse une traînée ; quand la traînée se recoupe, la boucle fermée frappe tout ce qu'elle entoure. */

var VMAX = 11.0, R_J = 0.085, DASH_DIST = 2.3, DASH_V = 27, DASH_CD = 0.85, TRACE_L = 10.5, TRACE_T = 3.2, PAS_TRACE = 0.05;
var T0 = 2.2;              // durée de l'entrée du colosse
var MIN_AIRE = 0.1;

/* pouvoirs de l'Odyssée (gagnés entre deux colosses, perdus à la fin de la partie) */
var GLYPHES = {
  longue:   { nom: 'Traînée longue', desc: 'Ta traînée est 30 % plus longue.', max: 3, ico: '〰' },
  elan:     { nom: 'Élan vif', desc: 'L\'élan se recharge 30 % plus vite.', max: 3, ico: '⚡' },
  loin:     { nom: 'Grand élan', desc: 'L\'élan va 35 % plus loin.', max: 2, ico: '➶' },
  vitesse:  { nom: 'Comète vive', desc: 'Tu vas 10 % plus vite.', max: 3, ico: '✦' },
  combo:    { nom: 'Combo tenace', desc: 'Le combo dure 1,5 s de plus avant de retomber.', max: 2, ico: '⛓' },
  etau:     { nom: 'Étau', desc: 'Les boucles serrées font ×1,7 au lieu de ×1,3.', max: 1, ico: '◎' },
  nova:     { nom: 'Nova précoce', desc: 'La Supernova se charge 35 % plus vite.', max: 2, ico: '✺' },
  echo:     { nom: 'Écho', desc: 'Chaque boucle qui frappe se répète 0,6 s plus tard (moitié des dégâts).', max: 1, ico: '◌' },
  coeur:    { nom: 'Cœur de cristal', desc: '+1 cœur maximum et 1 cœur rendu.', max: 3, ico: '♥' },
  egide:    { nom: 'Égide', desc: 'Le premier coup reçu contre chaque colosse est annulé.', max: 1, ico: '⛨' },
  aimant:   { nom: 'Aimant', desc: 'Les balles entourées remplissent la Supernova deux fois plus.', max: 1, ico: '🧲' },
  rythme:   { nom: 'Métronome', desc: 'Fermer une boucle pile sur le temps est deux fois plus facile et fait ×2.', max: 1, ico: '♪' },
  braise:   { nom: 'Braises', desc: 'Tes boucles brûlent encore 1,2 s : elles détruisent les balles qui y entrent.', max: 1, ico: '🔥' },
  chasseur: { nom: 'Chasseur', desc: 'Le cœur du colosse prend 40 % de dégâts en plus.', max: 2, ico: '☄' },
  souffle:  { nom: 'Souffle', desc: 'Ton élan détruit les balles qu\'il traverse.', max: 1, ico: '💨' },
  rempart:  { nom: 'Rempart', desc: 'Quand tu es touché, toutes les balles proches disparaissent et tu es protégé plus longtemps.', max: 1, ico: '🛡' }
};
/* variantes du défi du jour */
var MUTATEURS = {
  rapide:    { nom: 'Rapide', desc: 'Tout va 20 % plus vite, toi compris.' },
  courte:    { nom: 'Traînée courte', desc: 'Ta traînée est 40 % plus courte.' },
  fragile:   { nom: 'Fragile', desc: 'Un seul cœur.' },
  fureur:    { nom: 'Fureur', desc: 'Le colosse attaque toujours à pleine puissance.' },
  nuit:      { nom: 'Nuit', desc: 'On ne voit que près de la comète et du colosse.' },
  boucliers: { nom: 'Boucliers', desc: 'Tous les noyaux se protègent de temps en temps.' }
};

function creerCombat(def, o) {
  o = o || {};
  var W = o.W || 16, H = o.H || 9;
  var mods = o.mods || {}, mut = o.mut || {};
  var C = {
    def: def, W: W, H: H, t: 0, b: 60 / def.bpm, kb: -999, mods: mods, mut: mut,
    vit: mut.rapide ? 1.2 : 1,
    invincible: !!o.invincible, tuto: !!o.tuto,
    phase: 'entree', fini: null, tFin: 0,
    j: { x: W / 2, y: H - 1.4, vx: 0, vy: 0, coeurs: o.coeurs || 3, coeursMax: o.coeursMax || 3, invul: 0, dashCd: 0, dashT: 0, dx: 0, dy: -1, egide: !!mods.egide },
    tx: [], ty: [], tt: [], tl: 0,          // traînée
    corps: { x: W / 2, y: H / 2 - 0.3, ang: 0, r: def.corps.r, ruee: null, choc: 0, stun: 0 },
    noyaux: [], coeur: null,
    balles: [], lasers: [], ondes: [], mines: [], traqueurs: [], meteores: [], murs: [], emetteurs: [],
    annonces: [], echos: [], braises: [],
    combo: 0, comboT: 0, jauge: 0, jaugeMax: Math.round(26 * Math.pow(0.65, mods.nova || 0)), nova: false,
    degats: 0, hpTotal: 0, calme: 0,
    ev: [],
    s: { boucles: 0, balles: 0, pile: 0, comboMax: 0, touches: 0, multiMax: 0, ballesMax: 0, novas: 0, serrees: 0, noyaux: 0 }
  };
  if (mut.fragile) { C.j.coeurs = 1; C.j.coeursMax = 1; }
  var cx = W / 2, cy = H / 2 - 0.3;
  for (var i = 0; i < def.noyaux.length; i++) {
    var n = def.noyaux[i];
    var bc = n.bouclier || (mut.boucliers ? { per: 8, debut: (i * 3) % 8, duree: 3 } : null);
    C.noyaux.push({ i: i, x: cx, y: cy, hp: n.hp, hpMax: n.hp, mort: false, flash: 0, ifr: 0, dec: 0, bouclier: bc, prot: false, def: n });
    C.hpTotal += n.hp;
  }
  C.hpTotal += def.coeur.hp;
  C.longMax = TRACE_L * Math.pow(1.3, mods.longue || 0) * (mut.courte ? 0.6 : 1);
  C.vmax = VMAX * Math.pow(1.1, mods.vitesse || 0) * C.vit;
  C.dashCdMax = DASH_CD * Math.pow(0.7, mods.elan || 0);
  C.dashDist = DASH_DIST * (1 + 0.35 * (mods.loin || 0));
  placerBoss(C);
  return C;
}

function ev(C, o) { C.ev.push(o); }
function rage(C) { var m = 0; for (var i = 0; i < C.noyaux.length; i++) if (C.noyaux[i].mort) m++; return m / C.noyaux.length; }
function noyauxVivants(C) { var l = []; for (var i = 0; i < C.noyaux.length; i++) if (!C.noyaux[i].mort) l.push(C.noyaux[i]); return l; }
function tempsBeat(C, k) { return T0 + k * C.b; }

/* ---------- positions du colosse ---------- */
function placerBoss(C) {
  var d = C.def, cp = d.corps, co = C.corps, t = C.t * C.vit;
  var bx = C.W / 2 + cp.ax * Math.sin(cp.fx * t), by = C.H / 2 - 0.3 + cp.ay * Math.sin(cp.fy * t + cp.ph);
  if (C.phase === 'entree') by -= Math.max(0, 1 - C.t / T0) * 4;
  var r = co.ruee;
  if (r) {
    var u;
    if (C.t < r.tF) u = 0;
    else if (C.t < r.tF + r.dAller) { u = (C.t - r.tF) / r.dAller; u = 1 - (1 - u) * (1 - u); }
    else if (C.t < r.tF + r.dAller + r.dPause) u = 1;
    else if (C.t < r.tF + r.dAller + r.dPause + r.dRetour) { u = 1 - (C.t - r.tF - r.dAller - r.dPause) / r.dRetour; u = u * u * (3 - 2 * u); }
    else { co.ruee = null; u = 0; }
    co.x = lerp(bx, r.x1, u); co.y = lerp(by, r.y1, u);
  } else { co.x = bx; co.y = by; }
  co.ang = cp.rotV * t;
  for (var i = 0; i < C.noyaux.length; i++) {
    var n = C.noyaux[i], nd = n.def;
    if (n.mort) continue;
    var a = nd.a0 + nd.w * t + n.dec;
    var dd = nd.dist + nd.resp * Math.sin(nd.respF * t + nd.respPh);
    if (C.phase === 'entree') dd *= clamp(C.t / T0, 0.2, 1);
    n.x = co.x + Math.cos(a) * dd; n.y = co.y + Math.sin(a) * dd;
  }
}

function bouclierActif(C, n, avance) {
  if (!n.bouclier) return false;
  var k = (C.t + (avance || 0) - T0) / C.b; if (k < 0) return false;
  var bc = n.bouclier, p = ((Math.floor(k) - bc.debut) % bc.per + bc.per) % bc.per;
  return p < bc.duree;
}

/* ---------- pas de simulation ----------
   E : { mode: 'cible' | 'dir', cx, cy, dx, dy, elan } */
function pasCombat(C, E) {
  if (C.fini) { C.t += DT; return; }
  C.t += DT;
  var j = C.j;
  // temps musicaux
  var k = Math.floor((C.t - T0) / C.b);
  if (k !== C.kb) { C.kb = k; if (k >= 0) { ev(C, { type: 'beat', k: k }); planifier(C, k); } }
  if (C.phase === 'entree' && C.t >= T0) C.phase = 'noyaux';
  if (C.phase === 'transition' && C.t >= C.tTrans) { C.phase = 'coeur'; }

  deplacerJoueur(C, E);
  placerBoss(C);
  majCoeur(C);
  // boucliers
  for (var i = 0; i < C.noyaux.length; i++) {
    var n = C.noyaux[i]; if (n.mort) continue;
    n.flash = Math.max(0, n.flash - DT); n.ifr = Math.max(0, n.ifr - DT);
    var p = bouclierActif(C, n); if (p !== n.prot) { n.prot = p; ev(C, { type: p ? 'bouclierOn' : 'bouclierOff', x: n.x, y: n.y }); }
    if (n.def.timide && C.phase !== 'entree') {
      var dj = Math.sqrt(dist2(n.x, n.y, j.x, j.y));
      if (dj < 1.6) { var ap = Math.atan2(j.y - C.corps.y, j.x - C.corps.x), an = Math.atan2(n.y - C.corps.y, n.x - C.corps.x); n.dec -= Math.sign(angDiff(an, ap)) * 1.3 * DT * (1.6 - dj); }
    }
  }
  // attaques annoncées qui partent
  for (var a = C.annonces.length - 1; a >= 0; a--) {
    var an2 = C.annonces[a];
    while (an2.tirs.length && C.t >= an2.tirs[0]) { an2.tirs.shift(); tirer(C, an2); }
    if (!an2.tirs.length && C.t >= an2.tFin) C.annonces.splice(a, 1);
  }
  majEnnemis(C);
  couperTrace(C);
  collisions(C);
  // combo, échos, braises
  if (C.comboT > 0) { C.comboT -= DT; if (C.comboT <= 0) { if (C.combo >= 5) ev(C, { type: 'comboFin', n: C.combo }); C.combo = 0; } }
  for (var e = C.echos.length - 1; e >= 0; e--) if (C.t >= C.echos[e].t) { var ec = C.echos.splice(e, 1)[0]; frapperBoucle(C, ec.poly, ec.aire, ec.mult, true); }
  for (var bz = C.braises.length - 1; bz >= 0; bz--) {
    var br = C.braises[bz]; if (C.t >= br.tFin) { C.braises.splice(bz, 1); continue; }
    for (var bi = C.balles.length - 1; bi >= 0; bi--) { var bl = C.balles[bi]; if (bl.enc && dansPoly(bl.x, bl.y, br.poly)) { C.balles.splice(bi, 1); ev(C, { type: 'balleDetruite', x: bl.x, y: bl.y }); } }
  }
  if (C.phase === 'coeur' && C.coeur && C.coeur.hp <= 0) victoire(C);
}

function deplacerJoueur(C, E) {
  var j = C.j;
  j.invul = Math.max(0, j.invul - DT); j.dashCd = Math.max(0, j.dashCd - DT);
  var ox = j.x, oy = j.y, vx = 0, vy = 0;
  var dirx = 0, diry = 0;
  if (E.mode === 'cible') {
    var dx = E.cx - j.x, dy = E.cy - j.y, l = Math.sqrt(dx * dx + dy * dy);
    if (l > 1e-6) { dirx = dx / l; diry = dy / l; }
    var pas = Math.min(l, C.vmax * DT);
    vx = dirx * pas / DT; vy = diry * pas / DT;
  } else {
    var ll = Math.sqrt(E.dx * E.dx + E.dy * E.dy);
    if (ll > 1) { E.dx /= ll; E.dy /= ll; ll = 1; }
    if (ll > 0.01) { dirx = E.dx / ll; diry = E.dy / ll; }
    vx = E.dx * C.vmax; vy = E.dy * C.vmax;
  }
  if (dirx || diry) { j.dx = dirx; j.dy = diry; }
  if (E.elan && j.dashCd <= 0 && j.dashT <= 0 && C.phase !== 'entree') {
    j.dashT = C.dashDist / DASH_V; j.dashCd = C.dashCdMax;
    j.ddx = j.dx; j.ddy = j.dy;
    ev(C, { type: 'elan', x: j.x, y: j.y });
  }
  if (j.dashT > 0) {
    j.dashT -= DT; vx = j.ddx * DASH_V; vy = j.ddy * DASH_V;
    if (j.dashT <= 0) j.invul = Math.max(j.invul, 0.07);
    if (C.mods.souffle) for (var b = C.balles.length - 1; b >= 0; b--) { var bl = C.balles[b]; if (bl.enc && dist2(bl.x, bl.y, j.x, j.y) < 0.45 * 0.45) { C.balles.splice(b, 1); ev(C, { type: 'balleDetruite', x: bl.x, y: bl.y }); } }
  }
  j.x = clamp(j.x + vx * DT, 0.15, C.W - 0.15); j.y = clamp(j.y + vy * DT, 0.15, C.H - 0.15);
  j.vx = (j.x - ox) / DT; j.vy = (j.y - oy) / DT;
  majTrace(C);
}

/* ---------- la traînée et les boucles ---------- */
function majTrace(C) {
  var j = C.j, tx = C.tx, ty = C.ty, tt = C.tt, n = tx.length;
  // vieillissement
  while (tx.length && C.t - tt[0] > TRACE_T) retirerTete(C);
  n = tx.length;
  if (!n) { tx.push(j.x); ty.push(j.y); tt.push(C.t); return; }
  var lx = tx[n - 1], ly = ty[n - 1];
  var dd = Math.sqrt(dist2(lx, ly, j.x, j.y));
  if (dd < PAS_TRACE) return;
  // le nouveau segment recoupe-t-il la traînée ?
  var trouve = -1, tI = 0;
  for (var i = n - 3; i >= 0; i--) {
    var t = interSeg(lx, ly, j.x, j.y, tx[i], ty[i], tx[i + 1], ty[i + 1]);
    if (t >= 0) { trouve = i; tI = t; break; }
  }
  if (trouve >= 0) {
    var ix = lx + (j.x - lx) * tI, iy = ly + (j.y - ly) * tI;
    var poly = [ix, iy];
    for (var q = trouve + 1; q < n; q++) poly.push(tx[q], ty[q]);
    poly.push(j.x, j.y);
    var aire = airePoly(poly);
    // la traînée repart de zéro
    C.tx = [j.x]; C.ty = [j.y]; C.tt = [C.t]; C.tl = 0;
    if (aire >= MIN_AIRE && poly.length >= 8) boucle(C, poly, aire);
    return;
  }
  tx.push(j.x); ty.push(j.y); tt.push(C.t); C.tl += dd;
  while (C.tl > C.longMax && tx.length > 2) retirerTete(C);
}
function retirerTete(C) {
  if (C.tx.length > 1) C.tl -= Math.sqrt(dist2(C.tx[0], C.ty[0], C.tx[1], C.ty[1]));
  C.tx.shift(); C.ty.shift(); C.tt.shift();
  if (C.tx.length <= 1) C.tl = 0;
}
function couperA(C, idx, x, y, cause) {
  // supprime la traînée jusqu'au point idx inclus
  for (var i = 0; i <= idx && C.tx.length; i++) retirerTete(C);
  ev(C, { type: 'coupe', x: x, y: y, cause: cause });
}

function boucle(C, poly, aire) {
  var mult = multCombo(C);
  var phase = ((C.t - T0) / C.b) % 1; if (phase < 0) phase += 1;
  var ecart = Math.min(phase, 1 - phase) * C.b;
  var pile = C.t > T0 && ecart < (C.mods.rythme ? 0.13 : 0.065);
  var serre = aire < 1.15;
  if (pile) mult *= C.mods.rythme ? 2 : 1.5;
  if (serre) mult *= C.mods.etau ? 1.7 : 1.3;
  var r = frapperBoucle(C, poly, aire, mult, false, pile, serre);
  C.s.boucles++;
  if (r.touche) {
    if (pile) C.s.pile++;
    if (serre) C.s.serrees++;
    if (C.mods.echo) C.echos.push({ t: C.t + 0.6, poly: poly, aire: aire, mult: mult * 0.5 });
    if (C.mods.braise) C.braises.push({ poly: poly, tFin: C.t + 1.2 });
  }
}

// applique une boucle : renvoie { touche }
function frapperBoucle(C, poly, aire, mult, echo, pile, serre) {
  var cibles = 0, balles = 0, novaUtilisee = false, total = 0;
  var gainJ = C.mods.aimant ? 2 : 1;
  var aFrapper = [];
  for (var i = 0; i < C.noyaux.length; i++) { var n = C.noyaux[i]; if (!n.mort && dansPoly(n.x, n.y, poly)) aFrapper.push(n); }
  var co = C.coeur && C.phase === 'coeur' && C.coeur.hp > 0 && dansPoly(C.coeur.x, C.coeur.y, poly) ? C.coeur : null;
  if (!echo && C.nova && (aFrapper.length || co)) { mult *= 3; novaUtilisee = true; }
  for (i = 0; i < aFrapper.length; i++) {
    var nk = aFrapper[i];
    if (nk.prot) { ev(C, { type: 'bouclier', x: nk.x, y: nk.y }); continue; }
    var dmg = Math.min(nk.hp, mult); nk.hp -= dmg; C.degats += dmg; total += mult; cibles++;
    nk.flash = 0.18;
    ev(C, { type: 'degat', x: nk.x, y: nk.y, v: mult, echo: echo });
    if (nk.hp <= 1e-6) tuerNoyau(C, nk);
  }
  if (co) {
    var dm = mult * (1 + 0.4 * (C.mods.chasseur || 0));
    var d2 = Math.min(co.hp, dm); co.hp -= d2; C.degats += d2; total += dm; cibles++; co.flash = 0.18;
    ev(C, { type: 'degat', x: co.x, y: co.y, v: dm, coeur: true, echo: echo });
  }
  // balles, mines, traqueurs entourés
  for (i = C.balles.length - 1; i >= 0; i--) { var b = C.balles[i]; if (b.enc && dansPoly(b.x, b.y, poly)) { C.balles.splice(i, 1); balles++; ev(C, { type: 'balleDetruite', x: b.x, y: b.y }); } }
  for (i = C.mines.length - 1; i >= 0; i--) { var m = C.mines[i]; if (dansPoly(m.x, m.y, poly)) { C.mines.splice(i, 1); balles += 4; ev(C, { type: 'mineDesamorcee', x: m.x, y: m.y }); } }
  for (i = C.traqueurs.length - 1; i >= 0; i--) { var tq = C.traqueurs[i]; if (dansPoly(tq.x, tq.y, poly)) { C.traqueurs.splice(i, 1); balles += 3; ev(C, { type: 'balleDetruite', x: tq.x, y: tq.y, gros: true }); } }
  if (novaUtilisee) {
    C.nova = false; C.jauge = 0; C.s.novas++;
    var nb = C.balles.length + C.mines.length + C.traqueurs.length;
    for (i = 0; i < C.balles.length; i++) ev(C, { type: 'balleDetruite', x: C.balles[i].x, y: C.balles[i].y, muet: true });
    C.balles = []; C.mines = []; C.traqueurs = [];
    ev(C, { type: 'nova', x: C.j.x, y: C.j.y, n: nb });
  } else if (!echo && balles) {
    C.jauge += balles * gainJ;
    if (C.jauge >= C.jaugeMax && !C.nova) { C.nova = true; C.jauge = C.jaugeMax; ev(C, { type: 'novaPrete' }); }
  }
  C.s.balles += balles; C.s.ballesMax = Math.max(C.s.ballesMax, balles);
  var touche = cibles > 0 || balles > 0;
  if (touche && !echo) {
    C.combo += 1 + (C.mods.aimant && balles ? 0.5 : 0); C.comboT = 2.5 + 1.5 * (C.mods.combo || 0);
    C.s.comboMax = Math.max(C.s.comboMax, Math.floor(C.combo));
    C.s.multiMax = Math.max(C.s.multiMax, cibles);
  }
  ev(C, { type: 'boucle', poly: poly, aire: aire, cibles: cibles, balles: balles, mult: mult, pile: !!pile && touche, serre: !!serre && cibles > 0, nova: novaUtilisee, echo: !!echo, combo: Math.floor(C.combo) });
  return { touche: touche };
}

function tuerNoyau(C, n) {
  n.mort = true; n.hp = 0; C.s.noyaux++;
  C.calme = C.t + C.b * 1.5;
  ev(C, { type: 'noyauMort', x: n.x, y: n.y, reste: noyauxVivants(C).length });
  if (!noyauxVivants(C).length) {
    C.phase = 'transition'; C.tTrans = C.t + 1.6; C.annonces = []; C.emetteurs = [];
    C.lasers = []; C.ondes = []; C.murs = []; C.meteores = [];
    for (var i = 0; i < C.balles.length; i++) ev(C, { type: 'balleDetruite', x: C.balles[i].x, y: C.balles[i].y, muet: true });
    C.balles = []; C.mines = []; C.traqueurs = [];
    var cd = C.def.coeur;
    C.coeur = { x: C.corps.x, y: C.corps.y, hp: cd.hp, hpMax: cd.hp, s: 0, flash: 0, sx: C.corps.x, sy: C.corps.y, prochain: 0 };
    ev(C, { type: 'coeurSort', x: C.corps.x, y: C.corps.y });
  }
}

function majCoeur(C) {
  var co = C.coeur; if (!co) return;
  co.flash = Math.max(0, co.flash - DT);
  var cd = C.def.coeur, A = C.W / 2 - 1.3, B = C.H / 2 - 1.0;
  if (C.phase === 'transition') {
    var u = 1 - (C.tTrans - C.t) / 1.6; u = clamp(u, 0, 1); u = u * u * (3 - 2 * u);
    var px = C.W / 2 + A * Math.sin(cd.ph), py = C.H / 2 + B * Math.sin(cd.ph * 1.3);
    co.x = lerp(co.sx, px, u); co.y = lerp(co.sy, py, u);
    return;
  }
  if (C.phase !== 'coeur') return;
  var rg = 1 + 0.3 * (1 - co.hp / co.hpMax);       // le cœur accélère quand il faiblit
  // vitesse réelle constante (en unités par seconde) le long de sa trajectoire
  var ddx = A * cd.f1 * Math.cos(cd.f1 * co.s + cd.ph), ddy = B * cd.f2 * Math.cos(cd.f2 * co.s + cd.ph * 1.3);
  var vs = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
  // sur le premier temps de chaque mesure, le cœur s'essouffle et ralentit : c'est le moment de l'encercler
  var kb = (C.t - T0) / C.b, pb = ((kb % 4) + 4) % 4;
  co.souffle = pb < 1 ? 1 - Math.abs(pb - 0.5) * 2 : 0;
  var lent = pb < 1 ? 0.18 : 1;
  co.s += cd.v * rg * lent * C.vit * DT / Math.max(vs, 1.5);
  co.x = C.W / 2 + A * Math.sin(cd.f1 * co.s + cd.ph);
  co.y = C.H / 2 + B * Math.sin(cd.f2 * co.s + cd.ph * 1.3);
  if (cd.sillage && C.t >= co.prochain) {
    co.prochain = C.t + C.b * (C.def.d >= 20 ? 0.5 : 1);
    C.balles.push({ x: co.x, y: co.y, vx: 0, vy: 0, r: 0.13, enc: true, vie: 2.4, sillage: true, nait: C.t });
  }
}

function victoire(C) {
  C.fini = 'victoire'; C.tFin = C.t; C.phase = 'fin';
  C.balles = []; C.mines = []; C.traqueurs = []; C.lasers = []; C.ondes = []; C.murs = []; C.meteores = []; C.emetteurs = []; C.annonces = [];
  ev(C, { type: 'victoire', x: C.coeur.x, y: C.coeur.y });
}

/* ---------- planification rythmique des attaques ---------- */
function planifier(C, k) {
  if (C.phase === 'transition' || C.phase === 'fin' || C.phase === 'entree') return;
  if (C.t < C.calme) return;
  if (C.tuto && k < 4) return;
  var d = C.def, table;
  var rg = rage(C);
  if (C.phase === 'coeur') table = d.cyclesCoeur;
  else if (rg >= 0.5 || C.mut.fureur) table = d.cyclesRage;
  else table = d.cycles;
  var ci = Math.floor(k / 8), sl = k % 8;
  var type = table[ci % 4][sl];
  if (!type) return;
  var R = rngGraine(d.graine * 31 + k * 7 + 1);
  var cat = CATALOGUE[type];
  var an = { type: type, tA: C.t, tF: tempsBeat(C, k + cat.annonce), R: R };
  an.tirs = [an.tF]; an.tFin = an.tF;
  preparer(C, an, R);
  if (an.annule) return;
  C.annonces.push(an);
  ev(C, { type: 'annonce', a: type });
}

function sourcePos(C, src) {
  if (src && src.noyau != null) { var n = C.noyaux[src.noyau]; if (n && !n.mort) return { x: n.x, y: n.y }; }
  if (C.phase === 'coeur' && src && src.coeur && C.coeur) return { x: C.coeur.x, y: C.coeur.y };
  return { x: C.corps.x, y: C.corps.y };
}

function preparer(C, an, R) {
  var d = C.def.d, j = C.j, co = C.corps, W = C.W, H = C.H, b = C.b, vv = C.vit;
  var vivants = noyauxVivants(C);
  switch (an.type) {
    case 'rosace':
      an.n = clamp(8 + Math.floor(d / 3), 8, 22); an.off = R() * TAU; an.v = C.def.vB * 0.85;
      an.src = (d >= 10 && vivants.length && R() < 0.4) ? { noyau: R.choix(vivants).i } : (C.phase === 'coeur' && R() < 0.5 ? { coeur: 1 } : null);
      if (d >= 16) { an.tirs.push(an.tF + b / 2); an.tFin = an.tF + b / 2; }
      break;
    case 'mines':
      an.pts = [];
      var nb = clamp(2 + Math.floor(d / 7), 2, 5);
      for (var i = 0; i < nb; i++) {
        for (var essai = 0; essai < 20; essai++) {
          var x = R.entre(1, W - 1), y = R.entre(1, H - 1);
          if (dist2(x, y, j.x, j.y) > 2.2 * 2.2 && dist2(x, y, co.x, co.y) > 1.6 * 1.6) { an.pts.push(x, y); break; }
        }
      }
      an.n = clamp(6 + Math.floor(d / 5), 6, 12); an.meche = 3 * b;
      break;
    case 'salve':
      an.n = clamp(3 + Math.floor(d / 7), 3, 7); an.ec = 0.2;
      an.src = C.phase === 'coeur' && R() < 0.5 ? { coeur: 1 } : null;
      if (d >= 14) { an.tirs.push(an.tF + b / 4); an.tFin = an.tF + b / 4; }
      if (d >= 26) { an.tirs.push(an.tF + b / 2); an.tFin = an.tF + b / 2; }
      break;
    case 'laser':
      var s = { x: co.x, y: co.y };
      an.lasers = [{ x: s.x, y: s.y, a: Math.atan2(j.y - s.y, j.x - s.x) }];
      if (d >= 16) an.lasers.push({ x: s.x, y: s.y, a: an.lasers[0].a + R.choix([-0.7, 0.7]) });
      an.duree = b * 0.6; an.fixe = true;
      break;
    case 'eclats':
      if (!vivants.length) { an.type = 'salve'; an.n = 3; an.ec = 0.25; an.src = C.phase === 'coeur' ? { coeur: 1 } : null; break; }
      an.par = d >= 12 ? 2 : 1;
      break;
    case 'spirale':
      an.bras = d >= 22 ? 3 : d >= 12 ? 2 : 1; an.a0 = R() * TAU; an.sens = R.signe();
      an.src = vivants.length && d >= 15 && R() < 0.4 ? { noyau: R.choix(vivants).i } : null;
      break;
    case 'onde':
      an.gap = R() * TAU; an.larg = Math.max(0.75, 1.0 - d * 0.005);
      an.v = Math.min(4.6, 3.0 + d * 0.035) * vv;
      if (d >= 18) { an.tirs.push(an.tF + b); an.tFin = an.tF + b; an.gap2 = an.gap + R.entre(1.2, 2.4) * R.signe(); }
      break;
    case 'traqueurs':
      an.n = clamp(2 + Math.floor(d / 12), 2, 4);
      break;
    case 'meteores':
      an.pts = [j.x, j.y];
      var nm = clamp(3 + Math.floor(d / 8), 3, 7);
      for (var m = 1; m < nm; m++) { var a = R() * TAU, r = R.entre(1.2, 3.2); an.pts.push(clamp(j.x + Math.cos(a) * r, 0.5, W - 0.5), clamp(j.y + Math.sin(a) * r, 0.5, H - 0.5)); }
      an.r = 0.78;
      break;
    case 'croix':
      var nl = d >= 20 ? 6 : 4, a0 = R() * TAU;
      an.lasers = [];
      for (var c = 0; c < nl; c++) an.lasers.push({ x: co.x, y: co.y, a: a0 + TAU * c / nl, suit: true });
      an.duree = b * 0.75;
      break;
    case 'ruee':
      if (co.ruee) { an.annule = true; break; }
      var tx = clamp(j.x, 1.2, W - 1.2), ty = clamp(j.y, 1.2, H - 1.2);
      an.cible = { x: tx, y: ty };
      break;
    case 'murs':
      var cote = R.ent(0, 3);
      an.cote = cote; an.trou = R.entre(0.25, 0.75); an.tr = Math.max(1.5, 2.2 - d * 0.012);
      an.v = Math.min(4.2, 2.6 + d * 0.03) * vv;
      break;
    case 'balayage':
      var sb = { x: co.x, y: co.y }, aj = Math.atan2(j.y - sb.y, j.x - sb.x), sens = R.signe();
      an.lasers = [{ x: sb.x, y: sb.y, a: aj - sens * 1.1, rot: sens * 2.2 / (b * 1.5), suit: true }];
      an.duree = b * 1.5;
      break;
    case 'pluie':
      an.cols = []; var nc = Math.floor(W / 0.75);
      var t1 = R.ent(1, nc - 4), t2 = R.ent(1, nc - 4);
      for (var cc = 0; cc < nc; cc++) if (Math.abs(cc - t1) > 1 && Math.abs(cc - t2) > 1) an.cols.push(0.4 + cc * 0.75);
      an.haut = R() < 0.5; an.tirs.push(an.tF + b / 2); an.tFin = an.tF + b / 2;
      break;
    case 'fleur':
      if (!vivants.length) { an.type = 'rosace'; an.n = 12; an.off = R() * TAU; an.v = C.def.vB * 0.8; an.src = C.phase === 'coeur' ? { coeur: 1 } : null; break; }
      an.off = R() * TAU;
      break;
  }
}

function balle(C, x, y, a, v, r, o) {
  var bl = { x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: r || 0.13, enc: true, vie: 14, nait: C.t };
  if (o) for (var k in o) bl[k] = o[k];
  C.balles.push(bl);
  return bl;
}

function tirer(C, an) {
  var d = C.def.d, j = C.j, co = C.corps, b = C.b, vB = C.def.vB * C.vit, i, s, a;
  ev(C, { type: 'tir', a: an.type });
  switch (an.type) {
    case 'rosace':
      s = sourcePos(C, an.src);
      var off = an.off + (an.tirs.length ? 0 : TAU / an.n / 2);
      for (i = 0; i < an.n; i++) { a = off + TAU * i / an.n; balle(C, s.x + Math.cos(a) * 0.5, s.y + Math.sin(a) * 0.5, a, an.v * C.vit); }
      break;
    case 'mines':
      for (i = 0; i < an.pts.length; i += 2) C.mines.push({ x: an.pts[i], y: an.pts[i + 1], tB: C.t + an.meche, n: an.n, nait: C.t, meche: an.meche });
      break;
    case 'salve':
      s = sourcePos(C, an.src); a = Math.atan2(j.y - s.y, j.x - s.x);
      for (i = 0; i < an.n; i++) balle(C, s.x, s.y, a + (i - (an.n - 1) / 2) * an.ec, vB * 1.05);
      break;
    case 'eclats':
      var viv = noyauxVivants(C);
      for (i = 0; i < viv.length; i++) {
        a = Math.atan2(j.y - viv[i].y, j.x - viv[i].x);
        for (var p = 0; p < an.par; p++) balle(C, viv[i].x, viv[i].y, a + (p - (an.par - 1) / 2) * 0.22, vB * 0.95);
      }
      break;
    case 'spirale':
      C.emetteurs.push({ src: an.src, tFin: C.t + 2 * b, prochain: C.t, pas: b / 8, a: an.a0, da: 0.42 * an.sens, bras: an.bras, v: vB * 0.75 });
      break;
    case 'laser': case 'croix': case 'balayage':
      for (i = 0; i < an.lasers.length; i++) {
        var L = an.lasers[i];
        C.lasers.push({ x: L.x, y: L.y, a: L.a, rot: L.rot || 0, w: 0.34, tF: C.t, tE: C.t + an.duree, suit: L.suit, dx: L.suit ? 0 : L.x - co.x, dy: L.suit ? 0 : L.y - co.y });
      }
      break;
    case 'onde':
      var gap = an.tirs.length ? an.gap : (an.gap2 != null ? an.gap2 : an.gap);
      C.ondes.push({ x: co.x, y: co.y, r: co.r, v: an.v, w: 0.24, gap: gap, larg: an.larg });
      break;
    case 'traqueurs':
      for (i = 0; i < an.n; i++) { a = TAU * i / an.n + C.t; C.traqueurs.push({ x: co.x + Math.cos(a) * 0.6, y: co.y + Math.sin(a) * 0.6, a: a, v: Math.min(3.2, 1.8 + d * 0.025) * C.vit, tour: 1.7, vie: 7, nait: C.t }); }
      break;
    case 'meteores':
      for (i = 0; i < an.pts.length; i += 2) C.meteores.push({ x: an.pts[i], y: an.pts[i + 1], r: an.r, tB: C.t, tE: C.t + 0.2 });
      ev(C, { type: 'meteore' });
      break;
    case 'ruee':
      co.ruee = { x1: an.cible.x, y1: an.cible.y, tF: C.t, dAller: b * 0.6, dPause: b * 0.4, dRetour: b * 2 };
      break;
    case 'murs':
      C.murs.push({ cote: an.cote, pos: -0.3, v: an.v, trou: an.trou, tr: an.tr, ep: 0.28 });
      break;
    case 'pluie':
      var dec = an.tirs.length ? 0 : 0.37;
      for (i = 0; i < an.cols.length; i++) {
        var x = an.cols[i] + dec; if (x > C.W - 0.2) continue;
        if (an.haut) balle(C, x, -0.2, Math.PI / 2, vB * 0.85); else balle(C, x, C.H + 0.2, -Math.PI / 2, vB * 0.85);
      }
      break;
    case 'fleur':
      var vv = noyauxVivants(C);
      for (i = 0; i < vv.length; i++) for (var f = 0; f < 6; f++) { a = an.off + TAU * f / 6 + i * 0.5; balle(C, vv[i].x, vv[i].y, a, vB * 0.7); }
      break;
  }
}

/* ---------- ennemis ---------- */
function majEnnemis(C) {
  var i, W = C.W, H = C.H, j = C.j, co = C.corps;
  for (i = C.balles.length - 1; i >= 0; i--) {
    var b = C.balles[i];
    b.x += b.vx * DT; b.y += b.vy * DT; b.vie -= DT;
    if (b.vie <= 0 || b.x < -1 || b.x > W + 1 || b.y < -1 || b.y > H + 1) C.balles.splice(i, 1);
  }
  for (i = C.emetteurs.length - 1; i >= 0; i--) {
    var e = C.emetteurs[i];
    if (C.t >= e.tFin || C.phase === 'transition') { C.emetteurs.splice(i, 1); continue; }
    while (C.t >= e.prochain) {
      e.prochain += e.pas;
      var s = sourcePos(C, e.src);
      for (var k = 0; k < e.bras; k++) { var a = e.a + TAU * k / e.bras; balle(C, s.x + Math.cos(a) * 0.4, s.y + Math.sin(a) * 0.4, a, e.v); }
      e.a += e.da;
    }
  }
  for (i = C.lasers.length - 1; i >= 0; i--) {
    var L = C.lasers[i];
    if (C.t >= L.tE) { C.lasers.splice(i, 1); continue; }
    L.a += L.rot * DT;
    if (L.suit) { L.x = co.x + L.dx; L.y = co.y + L.dy; }
  }
  for (i = C.ondes.length - 1; i >= 0; i--) { var o = C.ondes[i]; o.r += o.v * DT; if (o.r > 22) C.ondes.splice(i, 1); }
  for (i = C.mines.length - 1; i >= 0; i--) {
    var m = C.mines[i];
    if (C.t >= m.tB) {
      C.mines.splice(i, 1);
      var off = C.t * 1.7;
      for (var q = 0; q < m.n; q++) { var aa = off + TAU * q / m.n; balle(C, m.x, m.y, aa, C.def.vB * 0.7 * C.vit, 0.12); }
      ev(C, { type: 'mineBoom', x: m.x, y: m.y });
    }
  }
  for (i = C.traqueurs.length - 1; i >= 0; i--) {
    var tq = C.traqueurs[i];
    tq.vie -= DT; if (tq.vie <= 0) { C.traqueurs.splice(i, 1); ev(C, { type: 'balleDetruite', x: tq.x, y: tq.y, muet: true }); continue; }
    var ac = Math.atan2(j.y - tq.y, j.x - tq.x), df = angDiff(tq.a, ac);
    tq.a += clamp(df, -tq.tour * DT, tq.tour * DT);
    tq.x += Math.cos(tq.a) * tq.v * DT; tq.y += Math.sin(tq.a) * tq.v * DT;
  }
  for (i = C.meteores.length - 1; i >= 0; i--) if (C.t >= C.meteores[i].tE) C.meteores.splice(i, 1);
  for (i = C.murs.length - 1; i >= 0; i--) {
    var mu = C.murs[i]; mu.pos += mu.v * DT;
    var lim = (mu.cote < 2 ? W : H) + 0.5;
    if (mu.pos > lim) C.murs.splice(i, 1);
  }
}

/* géométrie des dangers « tranchants » */
function murRect(C, mu) {
  // renvoie { horiz, c (coordonnée du mur), g0, g1 (trou) }
  var vert = mu.cote < 2;           // mur vertical qui balaie en x
  var c = mu.cote === 0 ? mu.pos : mu.cote === 1 ? C.W - mu.pos : mu.cote === 2 ? mu.pos : C.H - mu.pos;
  var long = vert ? C.H : C.W, cent = mu.trou * long;
  return { vert: vert, c: c, g0: cent - mu.tr / 2, g1: cent + mu.tr / 2 };
}
function dansMur(C, mu, x, y, marge) {
  var g = murRect(C, mu);
  var u = g.vert ? x : y, v = g.vert ? y : x;
  return Math.abs(u - g.c) < mu.ep / 2 + marge && (v < g.g0 || v > g.g1);
}
function dansLaser(L, x, y, marge) {
  var ex = L.x + Math.cos(L.a) * 40, ey = L.y + Math.sin(L.a) * 40;
  return distSeg2(x, y, L.x, L.y, ex, ey) < Math.pow(L.w / 2 + marge, 2);
}
function dansOnde(o, x, y, marge) {
  var dd = Math.sqrt(dist2(x, y, o.x, o.y));
  if (Math.abs(dd - o.r) > o.w / 2 + marge) return false;
  var a = Math.atan2(y - o.y, x - o.x);
  return Math.abs(angDiff(a, o.gap)) > o.larg / 2;
}

function couperTrace(C) {
  var n = C.tx.length; if (n < 2) return;
  var idx = -1, cx = 0, cy = 0, cause = '';
  for (var i = n - 2; i >= 0 && idx < 0; i--) {
    var x = C.tx[i], y = C.ty[i], k;
    for (k = 0; k < C.lasers.length; k++) if (dansLaser(C.lasers[k], x, y, 0)) { idx = i; cause = 'laser'; break; }
    if (idx < 0) for (k = 0; k < C.ondes.length; k++) if (dansOnde(C.ondes[k], x, y, 0.02)) { idx = i; cause = 'onde'; break; }
    if (idx < 0) for (k = 0; k < C.murs.length; k++) if (dansMur(C, C.murs[k], x, y, 0)) { idx = i; cause = 'mur'; break; }
    if (idx >= 0) { cx = x; cy = y; }
  }
  if (idx >= 0) couperA(C, idx, cx, cy, cause);
}

function collisions(C) {
  var j = C.j;
  if (j.invul > 0 || j.dashT > 0) return;
  var x = j.x, y = j.y, i, cause = null;
  for (i = 0; i < C.balles.length && !cause; i++) { var b = C.balles[i]; var rr = b.r * 0.78 + R_J; if (dist2(x, y, b.x, b.y) < rr * rr) { cause = b.sillage ? 'sillage' : 'balle'; C.balles.splice(i, 1); } }
  for (i = 0; i < C.mines.length && !cause; i++) if (dist2(x, y, C.mines[i].x, C.mines[i].y) < Math.pow(0.2 + R_J, 2)) cause = 'mine';
  for (i = 0; i < C.traqueurs.length && !cause; i++) if (dist2(x, y, C.traqueurs[i].x, C.traqueurs[i].y) < Math.pow(0.17 + R_J, 2)) cause = 'traqueur';
  for (i = 0; i < C.lasers.length && !cause; i++) if (dansLaser(C.lasers[i], x, y, R_J - 0.04)) cause = 'laser';
  for (i = 0; i < C.ondes.length && !cause; i++) if (dansOnde(C.ondes[i], x, y, R_J - 0.03)) cause = 'onde';
  for (i = 0; i < C.murs.length && !cause; i++) if (dansMur(C, C.murs[i], x, y, R_J - 0.03)) cause = 'mur';
  for (i = 0; i < C.meteores.length && !cause; i++) { var m = C.meteores[i]; if (dist2(x, y, m.x, m.y) < Math.pow(m.r - 0.05, 2)) cause = 'meteore'; }
  if (!cause && C.phase !== 'entree' && C.phase !== 'fin') { var co = C.corps; if (dist2(x, y, co.x, co.y) < Math.pow(co.r * 0.8 + R_J, 2)) cause = co.ruee ? 'ruee' : 'corps'; }
  if (cause) toucher(C, cause);
}

function toucher(C, cause) {
  var j = C.j;
  C.s.touches++;
  var rayon = C.mods.rempart ? 3.5 : 1.4;
  for (var i = C.balles.length - 1; i >= 0; i--) if (dist2(C.balles[i].x, C.balles[i].y, j.x, j.y) < rayon * rayon) { ev(C, { type: 'balleDetruite', x: C.balles[i].x, y: C.balles[i].y, muet: true }); C.balles.splice(i, 1); }
  for (i = C.traqueurs.length - 1; i >= 0; i--) if (dist2(C.traqueurs[i].x, C.traqueurs[i].y, j.x, j.y) < rayon * rayon) C.traqueurs.splice(i, 1);
  for (i = C.mines.length - 1; i >= 0; i--) if (dist2(C.mines[i].x, C.mines[i].y, j.x, j.y) < 0.6) C.mines.splice(i, 1);
  j.invul = C.mods.rempart ? 2.2 : 1.3;
  C.tx = [j.x]; C.ty = [j.y]; C.tt = [C.t]; C.tl = 0;
  C.combo = 0; C.comboT = 0;
  if (C.invincible) { ev(C, { type: 'touche', x: j.x, y: j.y, cause: cause, entrainement: true }); return; }
  if (j.egide) { j.egide = false; ev(C, { type: 'egide', x: j.x, y: j.y, cause: cause }); return; }
  j.coeurs--;
  ev(C, { type: 'touche', x: j.x, y: j.y, cause: cause, reste: j.coeurs });
  if (j.coeurs <= 0) { C.fini = 'defaite'; C.tFin = C.t; C.cause = cause; ev(C, { type: 'defaite', cause: cause }); }
}

function multCombo(C) { return 1 + 0.05 * Math.min(Math.floor(C.combo), 30); }
function pctCombat(C) { return clamp(C.degats / C.hpTotal, 0, 1); }
