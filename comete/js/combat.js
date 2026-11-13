'use strict';
/* COMÈTE — simulation d'un combat (indépendante de l'affichage : sert aussi aux tests et au pilote automatique)
   La comète laisse une traînée ; quand la traînée se recoupe, la boucle fermée frappe tout ce qu'elle entoure. */

var VMAX = 10.0, ACCEL = 150, R_J = 0.085, DASH_DIST = 2.3, DASH_V = 27, DASH_CD = 0.9, TRACE_L = 10.5, TRACE_T = 3.2, PAS_TRACE = 0.05;
var T0 = 2.2;              // durée de l'entrée du colosse
var MIN_AIRE = 0.1, AIRE_SERREE = 1.3, AIRE_BLINDE = 2.0;

/* les trois difficultés (chacune a sa propre partie) */
var DIFFS = {
  etincelle: { nom: 'Étincelle', ico: '✦', desc: 'Pour apprendre : 5 cœurs, attaques plus lentes, moins nombreuses et annoncées plus tôt.', coeurs: 5, dens: 0.7, vit: 0.82, tele: 1, hp: 0.85, regen: 0.5, poussiere: 0.6, talent: 0.5 },
  comete:    { nom: 'Comète', ico: '☄', desc: 'Le vrai combat : 3 cœurs, des colosses rapides et coriaces.', coeurs: 3, dens: 1, vit: 1, tele: 0, hp: 1, regen: 1, poussiere: 1, talent: 1 },
  trounoir:  { nom: 'Trou noir', ico: '●', desc: '2 cœurs, des attaques plus denses et plus rapides. Pour qui connaît les colosses par cœur.', coeurs: 2, dens: 1.35, vit: 1.14, tele: 0, hp: 1.15, regen: 1.6, poussiere: 2, talent: 1.7 }
};

/* compétences : 2 compétences + 1 ultime équipées (touches J, K, L) ; elles coûtent de l'énergie */
var COMPETENCES = {
  lasso:      { nom: 'Lasso', ico: '➰', cout: 22, rech: 1.2, debloque: 1, desc: 'Referme d\'un coup ta traînée (ta comète est reliée au bout de la traînée) : une boucle instantanée.' },
  rempart:    { nom: 'Fil d\'or', ico: '🛡', cout: 30, rech: 4, duree: 3, debloque: 3, desc: 'Pendant 3 s, ta traînée détruit les balles qui la touchent et rien ne peut la couper.' },
  ancre:      { nom: 'Ancre', ico: '⚓', cout: 20, rech: 4, duree: 5, debloque: 6, desc: 'Pendant 5 s, ta traînée ne raccourcit plus : trace une immense boucle autour de tout le colosse.' },
  distorsion: { nom: 'Distorsion', ico: '⏳', cout: 35, rech: 6, duree: 2.5, debloque: 9, desc: 'Pendant 2,5 s, toutes les attaques ralentissent à 35 %.' },
  orbitales:  { nom: 'Orbitales', ico: '🪐', cout: 30, rech: 5, duree: 6, debloque: 12, desc: 'Trois petites lunes tournent autour de toi pendant 6 s et détruisent les balles qu\'elles touchent.' },
  vortex:     { nom: 'Vortex', ico: '🌀', cout: 18, rech: 4, duree: 2.5, debloque: 15, desc: 'Un tourbillon aspire les balles proches pendant 2,5 s : entoure-le ensuite pour tout détruire d\'un coup.' },
  fracture:   { nom: 'Fracture', ico: '💥', cout: 40, rech: 5, debloque: 18, desc: 'Ta prochaine boucle qui frappe fait ×2,5 et étourdit le colosse : il n\'attaque plus pendant 3 temps.' },
  echo:       { nom: 'Écho', ico: '👥', cout: 30, rech: 5, debloque: 21, desc: 'Un double de ta comète refait tes 2,5 dernières secondes de trajet : ses boucles frappent aussi (×0,6).' },
  supernova:  { nom: 'Supernova', ico: '✺', cout: 100, rech: 3, ultime: true, debloque: 1, desc: 'ULTIME. Détruit toutes les balles et frappe fort (×5) tout ce qui est à moins de 4,5 cases.' },
  filante:    { nom: 'Étoile filante', ico: '🌠', cout: 100, rech: 3, duree: 4, ultime: true, debloque: 10, desc: 'ULTIME. Pendant 4 s : invincible, 35 % plus rapide, et tes boucles font ×2.' },
  constellation: { nom: 'Constellation', ico: '✨', cout: 100, rech: 3, ultime: true, debloque: 20, desc: 'ULTIME. Frappe d\'un coup tous les cristaux et le cœur (×3 chacun, multiplié par ton combo).' }
};
function coutComp(id, niv) { return Math.round(COMPETENCES[id].cout * (COMPETENCES[id].ultime ? 1 : 1 - 0.07 * ((niv || 1) - 1))); }
function puissComp(niv) { return 1 + 0.15 * ((niv || 1) - 1); }   // durée / force selon le niveau

/* pouvoirs de l'Odyssée (gagnés entre deux colosses, perdus à la fin de la partie) */
var GLYPHES = {
  longue:   { nom: 'Traînée longue', desc: 'Ta traînée est 30 % plus longue.', max: 3, ico: '〰' },
  elan:     { nom: 'Élan vif', desc: 'L\'élan se recharge 30 % plus vite.', max: 3, ico: '⚡' },
  loin:     { nom: 'Grand élan', desc: 'L\'élan va 35 % plus loin.', max: 2, ico: '➶' },
  vitesse:  { nom: 'Comète vive', desc: 'Tu vas 8 % plus vite.', max: 3, ico: '✦' },
  combo:    { nom: 'Combo tenace', desc: 'Le combo dure 1,5 s de plus avant de retomber.', max: 2, ico: '⛓' },
  etau:     { nom: 'Étau', desc: 'Les boucles serrées font ×1,7 au lieu de ×1,3.', max: 1, ico: '◎' },
  nova:     { nom: 'Source d\'énergie', desc: 'Tu gagnes 40 % d\'énergie en plus.', max: 2, ico: '✺' },
  echo:     { nom: 'Résonance', desc: 'Chaque boucle qui frappe se répète 0,6 s plus tard (moitié des dégâts).', max: 1, ico: '◌' },
  coeur:    { nom: 'Cœur de cristal', desc: '+1 cœur maximum et 1 cœur rendu.', max: 3, ico: '♥' },
  egide:    { nom: 'Égide', desc: 'Le premier coup reçu contre chaque colosse est annulé.', max: 1, ico: '⛨' },
  aimant:   { nom: 'Aimant', desc: 'Les balles entourées donnent deux fois plus d\'énergie.', max: 1, ico: '🧲' },
  rythme:   { nom: 'Métronome', desc: 'Fermer une boucle pile sur le temps est deux fois plus facile et fait ×2.', max: 1, ico: '♪' },
  braise:   { nom: 'Braises', desc: 'Tes boucles brûlent encore 1,2 s : elles détruisent les balles qui y entrent.', max: 1, ico: '🔥' },
  chasseur: { nom: 'Chasseur', desc: 'Le cœur du colosse prend 40 % de dégâts en plus.', max: 2, ico: '☄' },
  souffle:  { nom: 'Souffle', desc: 'Ton élan détruit les balles qu\'il traverse.', max: 1, ico: '💨' },
  rempart:  { nom: 'Rempart', desc: 'Quand tu es touché, toutes les balles proches disparaissent et tu es protégé plus longtemps.', max: 1, ico: '🛡' },
  economie: { nom: 'Économe', desc: 'Tes compétences coûtent 25 % d\'énergie en moins.', max: 1, ico: '◇' },
  briseur:  { nom: 'Briseur', desc: 'Les cristaux blindés, tournants et liés prennent quand même la moitié des dégâts.', max: 1, ico: '⚒' }
};
/* variantes du défi du jour */
var MUTATEURS = {
  rapide:    { nom: 'Rapide', desc: 'Tout va 20 % plus vite, toi compris.' },
  courte:    { nom: 'Traînée courte', desc: 'Ta traînée est 40 % plus courte.' },
  fragile:   { nom: 'Fragile', desc: 'Un seul cœur.' },
  fureur:    { nom: 'Fureur', desc: 'Le colosse attaque toujours à pleine puissance.' },
  nuit:      { nom: 'Nuit', desc: 'On ne voit que près de la comète et du colosse.' },
  boucliers: { nom: 'Boucliers', desc: 'Tous les cristaux se protègent de temps en temps.' },
  sansComp:  { nom: 'À mains nues', desc: 'Aucune compétence : seulement tes boucles et ton élan.' }
};

function traceur() { return { tx: [], ty: [], tt: [], tl: 0 }; }

/* o : { W, H, diff, mods (Odyssée), mut (défi), coeurs, coeursMax, invincible, tuto, comp: {slots:[3], niv:{}}, ameli: {} } */
function creerCombat(def, o) {
  o = o || {};
  var W = o.W || 16, H = o.H || 9;
  var mods = o.mods || {}, mut = o.mut || {}, df = DIFFS[o.diff] || DIFFS.comete, am = o.ameli || {};
  var cm = (df.coeurs + (am.coeur || 0));
  var C = {
    def: def, W: W, H: H, t: 0, b: 60 / def.bpm, kb: -999, mods: mods, mut: mut, diff: df,
    vitJ: mut.rapide ? 1.2 : 1, ve: df.vit * (mut.rapide ? 1.2 : 1), lentE: 1,
    invincible: !!o.invincible, tuto: !!o.tuto,
    phase: 'entree', fini: null, tFin: 0,
    j: { x: W / 2, y: H - 1.4, vx: 0, vy: 0, coeurs: o.coeurs || cm, coeursMax: o.coeursMax || cm, invul: 0, dashCd: 0, dashT: 0, dx: 0, dy: -1, egide: !!mods.egide },
    tr: traceur(), hist: [],
    corps: { x: W / 2, y: H / 2 - 0.3, ang: 0, r: def.corps.r, ruee: null, i: 0 }, corps2: null,
    noyaux: [], coeur: null, hs: 0, hParam: 0, rempartA: 0,
    balles: [], lasers: [], ondes: [], mines: [], traqueurs: [], meteores: [], murs: [], emetteurs: [], bras: [], trous: [],
    annonces: [], echos: [], braises: [],
    combo: 0, comboT: 0, comboMax: 2.5 + 1.5 * (mods.combo || 0) + 0.3 * (am.combo || 0),
    en: 0, enMax: 100, gainEn: (1 + 0.4 * (mods.nova || 0)) * (1 + 0.08 * (am.energie || 0)),
    slots: mut.sansComp ? [null, null, null] : ((o.comp && o.comp.slots) || ['lasso', null, 'supernova']), niv: (o.comp && o.comp.niv) || {},
    cd: [0, 0, 0], eff: {}, fracture: 0, fantome: null, vortex: null,
    hpTotal: 0, calme: 0,
    ev: [],
    s: { boucles: 0, balles: 0, pile: 0, comboMax: 0, touches: 0, multiMax: 0, ballesMax: 0, novas: 0, serrees: 0, noyaux: 0, comps: 0 }
  };
  if (mut.fragile) { C.j.coeurs = 1; C.j.coeursMax = 1; }
  if (def.espece === 'jumeaux') C.corps2 = { x: W / 2, y: H / 2, ang: 0, r: def.corps.r, i: 1 };
  var hpMul = df.hp;
  for (var i = 0; i < def.noyaux.length; i++) {
    var n = def.noyaux[i];
    var bc = n.bouclier || (mut.boucliers ? { per: 8, debut: (i * 3) % 8, duree: 3 } : null);
    var hp = Math.max(2, Math.round(n.hp * hpMul));
    C.noyaux.push({ i: i, x: W / 2, y: H / 2, hp: hp, hpMax: hp, mort: false, flash: 0, dec: 0, bouclier: bc, prot: false, def: n, dernier: 0, regen: false, intang: false });
    C.hpTotal += hp;
  }
  C.hpCoeur = Math.round(def.coeur.hp * hpMul);
  C.hpTotal += C.hpCoeur;
  C.longMax = TRACE_L * Math.pow(1.3, mods.longue || 0) * (mut.courte ? 0.6 : 1) * (1 + 0.06 * (am.trainee || 0));
  C.vmax = VMAX * Math.pow(1.08, mods.vitesse || 0) * C.vitJ * (1 + 0.03 * (am.vitesse || 0));
  C.dashCdMax = DASH_CD * Math.pow(0.7, mods.elan || 0) * (1 - 0.06 * (am.elan || 0));
  C.dashDist = DASH_DIST * (1 + 0.35 * (mods.loin || 0));
  // l'hydre : on remplit l'historique de sa tête pour que sa file existe dès le début
  if (def.espece === 'hydre') { C.hs = -14; C.hist2 = []; for (var k = 0; k < 900; k++) avancerTete(C, 1 / 60); }
  placerBoss(C);
  return C;
}

function ev(C, o) { C.ev.push(o); }
function rage(C) { var m = 0, n = 0; for (var i = 0; i < C.noyaux.length; i++) { if (C.noyaux[i].def.mini) continue; n++; if (C.noyaux[i].mort) m++; } return n ? m / n : 1; }
function noyauxVivants(C) { var l = []; for (var i = 0; i < C.noyaux.length; i++) if (!C.noyaux[i].mort) l.push(C.noyaux[i]); return l; }
function tempsBeat(C, k) { return T0 + k * C.b; }
function corpsDe(C, i) { return i === 1 && C.corps2 ? C.corps2 : C.corps; }
function sensPoly(P) { var a = 0, n = P.length / 2; for (var i = 0, j = n - 1; i < n; j = i++) a += P[j * 2] * P[i * 2 + 1] - P[i * 2] * P[j * 2 + 1]; return a > 0 ? 1 : -1; }
function gagnerEnergie(C, v) { if (v <= 0) return; var avant = C.en; C.en = Math.min(C.enMax, C.en + v * C.gainEn); if (avant < C.enMax && C.en >= C.enMax) ev(C, { type: 'energiePleine' }); }

/* ---------- l'hydre : sa tête parcourt l'arène, la file de cristaux suit son chemin ---------- */
function posTete(C, s) {
  var cp = C.def.corps, A = C.W / 2 - 1.7, B = C.H / 2 - 1.5;
  return { x: C.W / 2 + A * Math.sin(cp.f1 * s + cp.ph), y: C.H / 2 + B * Math.sin(cp.f2 * s) };
}
function avancerTete(C, dt) {
  var cp = C.def.corps, A = C.W / 2 - 1.7, B = C.H / 2 - 1.5;
  var dx = A * cp.f1 * Math.cos(cp.f1 * C.hs + cp.ph), dy = B * cp.f2 * Math.cos(cp.f2 * C.hs);
  C.hs += cp.vit * dt / Math.max(1, Math.sqrt(dx * dx + dy * dy));
  var p = posTete(C, C.hs), h = C.hist2;
  if (!h.length || dist2(p.x, p.y, h[h.length - 1].x, h[h.length - 1].y) > 0.0025) { h.push(p); if (h.length > 700) h.shift(); }
}
function posFile(C, distance) {
  var h = C.hist2, acc = 0;
  for (var i = h.length - 1; i > 0; i--) {
    var l = Math.sqrt(dist2(h[i].x, h[i].y, h[i - 1].x, h[i - 1].y));
    if (acc + l >= distance) { var u = (distance - acc) / l; return { x: lerp(h[i].x, h[i - 1].x, u), y: lerp(h[i].y, h[i - 1].y, u) }; }
    acc += l;
  }
  return h.length ? h[0] : { x: C.W / 2, y: C.H / 2 };
}

/* ---------- positions du colosse ---------- */
function placerBoss(C) {
  var d = C.def, cp = d.corps, co = C.corps, t = C.t, esp = d.espece;
  var bx, by;
  var entree = C.phase === 'entree' ? Math.max(0, 1 - C.t / T0) * 4 : 0;
  if (esp === 'pendule') { bx = C.W / 2 + (C.W / 2 - 2.2) * Math.sin(0.12 * t * cp.vit + cp.ph); by = 1.5; }
  else if (esp === 'hydre') { var p = posTete(C, C.hs); bx = p.x; by = p.y; }
  else { bx = C.W / 2 + cp.ax * Math.sin(cp.fx * t); by = C.H / 2 - 0.3 + cp.ay * Math.sin(cp.fy * t + cp.ph); }
  by -= entree;
  if (esp === 'jumeaux') {
    var th = 0.35 * t * (cp.rotV > 0 ? 1 : -1), rj = Math.min(2.6, C.W / 2 - 2.6);
    C.corps2.x = bx - Math.cos(th) * rj; C.corps2.y = by - Math.sin(th) * rj * 0.8;
    bx += Math.cos(th) * rj; by += Math.sin(th) * rj * 0.8;
    C.corps2.ang = -cp.rotV * t;
  }
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
  if (d.rempart) C.rempartA = d.rempart.rot * t;
  for (var i = 0; i < C.noyaux.length; i++) {
    var n = C.noyaux[i], nd = n.def;
    if (n.mort) continue;
    var c = corpsDe(C, nd.corps);
    var ent = C.phase === 'entree' ? clamp(C.t / T0, 0.2, 1) : 1;
    if (nd.place === 'pendule') {
      var th2 = Math.PI / 2 + nd.amp * Math.sin(nd.om * t + nd.ph);
      var L = Math.min(nd.long, C.H - c.y - 0.6) * ent;
      n.x = c.x + nd.pivot + Math.cos(th2) * L; n.y = c.y + Math.sin(th2) * L;
    } else if (nd.place === 'chaine') {
      var q = posFile(C, nd.rang * 1.3 * ent);
      n.x = q.x; n.y = q.y - entree;
    } else {
      var a = nd.a0 + nd.w * t + n.dec;
      var dd = nd.dist + nd.resp * Math.sin(nd.respF * t + nd.respPh) + (nd.bourdon ? nd.bourdon * Math.sin(nd.bF * t + nd.bPh) : 0);
      dd *= ent;
      n.x = c.x + Math.cos(a) * dd; n.y = c.y + Math.sin(a) * dd;
    }
  }
}

function bouclierActif(C, n, avance) {
  if (!n.bouclier) return false;
  var k = (C.t + (avance || 0) - T0) / C.b; if (k < 0) return false;
  var bc = n.bouclier, p = ((Math.floor(k) - bc.debut) % bc.per + bc.per) % bc.per;
  return p < bc.duree;
}
function intangible(C, n, avance) {
  if (n.def.type !== 'fantome') return false;
  var k = (C.t + (avance || 0) - T0) / C.b; if (k < 0) return false;
  return ((Math.floor(k) + n.i) % 4) >= 2;
}

/* ---------- pas de simulation ----------
   E : { dx, dy (direction voulue, longueur ≤ 1), elan, c: [compétence 1, 2, ultime] } */
function pasCombat(C, E) {
  if (C.fini) { C.t += DT; return; }
  C.t += DT;
  var j = C.j;
  var k = Math.floor((C.t - T0) / C.b);
  if (k !== C.kb) { C.kb = k; if (k >= 0) { ev(C, { type: 'beat', k: k }); planifier(C, k); } }
  if (C.phase === 'entree' && C.t >= T0) C.phase = 'noyaux';
  if (C.phase === 'transition' && C.t >= C.tTrans) { C.phase = 'coeur'; }
  // effets de compétences qui se terminent
  for (var ef in C.eff) if (C.t >= C.eff[ef]) { delete C.eff[ef]; ev(C, { type: 'finComp', id: ef }); }
  C.lentE = C.eff.distorsion ? 0.35 : 1;
  for (var s = 0; s < 3; s++) C.cd[s] = Math.max(0, C.cd[s] - DT);
  if (E.c) for (s = 0; s < 3; s++) if (E.c[s]) utiliserComp(C, s);

  if (C.def.espece === 'hydre') avancerTete(C, DT * (C.phase === 'entree' ? 0 : 1));
  deplacerJoueur(C, E);
  placerBoss(C);
  majCoeur(C);
  majNoyaux(C);
  majFantome(C);
  for (var a = C.annonces.length - 1; a >= 0; a--) {
    var an2 = C.annonces[a];
    while (an2.tirs.length && C.t >= an2.tirs[0]) { an2.tirs.shift(); tirer(C, an2); }
    if (!an2.tirs.length && C.t >= an2.tFin) C.annonces.splice(a, 1);
  }
  majEnnemis(C);
  couperTrace(C, C.tr, !!C.eff.rempart);
  if (C.fantome) couperTrace(C, C.fantome.tr, false);
  if (C.eff.rempart) filDOr(C);
  collisions(C);
  if (C.comboT > 0) { C.comboT -= DT; if (C.comboT <= 0) { if (C.combo >= 5) ev(C, { type: 'comboFin', n: C.combo }); C.combo = 0; } }
  for (var e = C.echos.length - 1; e >= 0; e--) if (C.t >= C.echos[e].t) { var ec = C.echos.splice(e, 1)[0]; frapperBoucle(C, ec.poly, ec.aire, ec.mult, { echo: true }); }
  for (var bz = C.braises.length - 1; bz >= 0; bz--) {
    var br = C.braises[bz]; if (C.t >= br.tFin) { C.braises.splice(bz, 1); continue; }
    for (var bi = C.balles.length - 1; bi >= 0; bi--) { var bl = C.balles[bi]; if (bl.enc && dansPoly(bl.x, bl.y, br.poly)) { C.balles.splice(bi, 1); ev(C, { type: 'balleDetruite', x: bl.x, y: bl.y }); } }
  }
  if (C.phase === 'coeur' && C.coeur && C.coeur.hp <= 0) victoire(C);
}

function majNoyaux(C) {
  var j = C.j;
  for (var i = 0; i < C.noyaux.length; i++) {
    var n = C.noyaux[i]; if (n.mort) continue;
    n.flash = Math.max(0, n.flash - DT);
    var p = bouclierActif(C, n); if (p !== n.prot) { n.prot = p; ev(C, { type: p ? 'bouclierOn' : 'bouclierOff', x: n.x, y: n.y }); }
    n.intang = intangible(C, n);
    // réparation : un cristal qu'on laisse tranquille se répare
    var vivace = n.def.type === 'vivace', attente = vivace ? 3 : 8;
    n.regen = C.phase !== 'entree' && n.hp < n.hpMax && C.t - n.dernier > attente;
    if (n.regen) n.hp = Math.min(n.hpMax, n.hp + n.hpMax * (vivace ? 0.03 : 0.01) * C.diff.regen * DT);
    if (n.def.timide && C.phase !== 'entree') {
      var dj = Math.sqrt(dist2(n.x, n.y, j.x, j.y)), c = corpsDe(C, n.def.corps);
      if (dj < 1.6) { var ap = Math.atan2(j.y - c.y, j.x - c.x), an = Math.atan2(n.y - c.y, n.x - c.x); n.dec -= Math.sign(angDiff(an, ap)) * 1.3 * DT * (1.6 - dj); }
    }
  }
}

function deplacerJoueur(C, E) {
  var j = C.j;
  j.invul = Math.max(0, j.invul - DT); j.dashCd = Math.max(0, j.dashCd - DT);
  var ox = j.x, oy = j.y;
  var dx = E.dx || 0, dy = E.dy || 0, ll = Math.sqrt(dx * dx + dy * dy);
  if (ll > 1) { dx /= ll; dy /= ll; ll = 1; }
  if (ll > 0.05) { j.dx = dx / ll; j.dy = dy / ll; }
  var vm = C.vmax * (C.eff.filante ? 1.35 : 1);
  // accélération : les virages sont arrondis, ce qui aide à tracer des boucles au clavier
  var tvx = dx * vm, tvy = dy * vm, ex = tvx - j.vx, ey = tvy - j.vy, el = Math.sqrt(ex * ex + ey * ey), mx = ACCEL * DT;
  if (el > mx) { ex *= mx / el; ey *= mx / el; }
  var vx = j.vx + ex, vy = j.vy + ey;
  if (E.elan && j.dashCd <= 0 && j.dashT <= 0 && C.phase !== 'entree') {
    j.dashT = C.dashDist / DASH_V; j.dashCd = C.dashCdMax;
    j.ddx = j.dx; j.ddy = j.dy;
    ev(C, { type: 'elan', x: j.x, y: j.y });
  }
  var mvx = vx, mvy = vy;
  if (j.dashT > 0) {
    j.dashT -= DT; mvx = j.ddx * DASH_V; mvy = j.ddy * DASH_V;
    if (j.dashT <= 0) { j.invul = Math.max(j.invul, 0.07); vx = j.ddx * vm; vy = j.ddy * vm; }
    if (C.mods.souffle) for (var b = C.balles.length - 1; b >= 0; b--) { var bl = C.balles[b]; if (bl.enc && dist2(bl.x, bl.y, j.x, j.y) < 0.45 * 0.45) { C.balles.splice(b, 1); ev(C, { type: 'balleDetruite', x: bl.x, y: bl.y }); } }
  }
  // trous noirs : ils attirent la comète
  for (var t = 0; t < C.trous.length; t++) {
    var tn = C.trous[t], tdx = tn.x - j.x, tdy = tn.y - j.y, td = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
    var f = tn.force * C.lentE / (1 + td * td * 0.15);
    mvx += tdx / td * f; mvy += tdy / td * f;
  }
  j.x = clamp(j.x + mvx * DT, 0.15, C.W - 0.15); j.y = clamp(j.y + mvy * DT, 0.15, C.H - 0.15);
  j.vx = (j.x - ox) / DT; j.vy = (j.y - oy) / DT;
  if (j.dashT <= 0) { j.vx = clamp(vx, -vm, vm); j.vy = clamp(vy, -vm, vm); if (j.x <= 0.15 || j.x >= C.W - 0.15) j.vx = 0; if (j.y <= 0.15 || j.y >= C.H - 0.15) j.vy = 0; }
  C.hist.push(j.x, j.y); if (C.hist.length > 900) C.hist.splice(0, 2);
  majTrace(C, C.tr, j.x, j.y, false);
}

/* ---------- la traînée et les boucles ---------- */
function majTrace(C, T, x, y, fantome) {
  var tx = T.tx, ty = T.ty, tt = T.tt, n;
  var ancre = !fantome && C.eff.ancre;
  while (tx.length && C.t - tt[0] > (ancre ? 30 : TRACE_T)) retirerTete(T);
  n = tx.length;
  if (!n) { tx.push(x); ty.push(y); tt.push(C.t); return; }
  var lx = tx[n - 1], ly = ty[n - 1];
  var dd = Math.sqrt(dist2(lx, ly, x, y));
  if (dd < PAS_TRACE) return;
  var trouve = -1, tI = 0;
  for (var i = n - 3; i >= 0; i--) {
    var t = interSeg(lx, ly, x, y, tx[i], ty[i], tx[i + 1], ty[i + 1]);
    if (t >= 0) { trouve = i; tI = t; break; }
  }
  if (trouve >= 0) {
    var ix = lx + (x - lx) * tI, iy = ly + (y - ly) * tI;
    var poly = [ix, iy];
    for (var q = trouve + 1; q < n; q++) poly.push(tx[q], ty[q]);
    poly.push(x, y);
    var aire = airePoly(poly);
    T.tx = [x]; T.ty = [y]; T.tt = [C.t]; T.tl = 0;
    if (aire >= MIN_AIRE && poly.length >= 8) boucle(C, poly, aire, { fantome: fantome });
    return;
  }
  tx.push(x); ty.push(y); tt.push(C.t); T.tl += dd;
  var lmax = ancre ? 45 : C.longMax;
  while (T.tl > lmax && tx.length > 2) retirerTete(T);
}
function retirerTete(T) {
  if (T.tx.length > 1) T.tl -= Math.sqrt(dist2(T.tx[0], T.ty[0], T.tx[1], T.ty[1]));
  T.tx.shift(); T.ty.shift(); T.tt.shift();
  if (T.tx.length <= 1) T.tl = 0;
}
function viderTrace(C) { var j = C.j; C.tr.tx = [j.x]; C.tr.ty = [j.y]; C.tr.tt = [C.t]; C.tr.tl = 0; }

function boucle(C, poly, aire, o) {
  o = o || {};
  var mult = multCombo(C);
  var phase = ((C.t - T0) / C.b) % 1; if (phase < 0) phase += 1;
  var ecart = Math.min(phase, 1 - phase) * C.b;
  var pile = !o.fantome && C.t > T0 && ecart < (C.mods.rythme ? 0.13 : 0.065);
  var serre = aire < AIRE_SERREE;
  if (pile) mult *= C.mods.rythme ? 2 : 1.5;
  if (serre) mult *= C.mods.etau ? 1.7 : 1.3;
  if (C.eff.filante) mult *= 2;
  if (o.fantome) mult *= 0.6 * puissComp(C.niv.echo);
  var r = frapperBoucle(C, poly, aire, mult, { pile: pile, serre: serre, fantome: o.fantome, lasso: o.lasso });
  if (!o.fantome) C.s.boucles++;
  if (r.touche && !o.fantome) {
    if (pile) { C.s.pile++; gagnerEnergie(C, 2); }
    if (serre) C.s.serrees++;
    if (C.mods.echo) C.echos.push({ t: C.t + 0.6, poly: poly, aire: aire, mult: mult * 0.5 });
    if (C.mods.braise) C.braises.push({ poly: poly, tFin: C.t + 1.2 });
  }
}

// applique une boucle : renvoie { touche }
function frapperBoucle(C, poly, aire, mult, o) {
  o = o || {};
  var echo = !!o.echo, cibles = 0, balles = 0, total = 0, frac = false;
  var aFrapper = [], refus = null;
  for (var i = 0; i < C.noyaux.length; i++) { var n = C.noyaux[i]; if (!n.mort && dansPoly(n.x, n.y, poly)) aFrapper.push(n); }
  var co = C.coeur && C.phase === 'coeur' && C.coeur.hp > 0 && dansPoly(C.coeur.x, C.coeur.y, poly) ? C.coeur : null;
  if (!echo && C.fracture && (aFrapper.length || co)) { mult *= 2.5 * puissComp(C.niv.fracture) / 1; frac = true; C.fracture = 0; C.calme = Math.max(C.calme, C.t + C.b * 3); }
  var sens = sensPoly(poly);
  for (i = 0; i < aFrapper.length; i++) {
    var nk = aFrapper[i], nd = nk.def, m = mult, motif = null;
    if (nk.prot) { motif = 'bouclier'; }
    else if (nk.intang) { motif = 'intouchable'; }
    else if (nd.type === 'sens' && nd.sens !== sens) motif = 'sens';
    else if (nd.type === 'blinde' && aire > AIRE_BLINDE) motif = 'large';
    else if (nd.type === 'lie' && nd.lien != null && C.noyaux[nd.lien] && !C.noyaux[nd.lien].mort && aFrapper.indexOf(C.noyaux[nd.lien]) < 0) motif = 'lie';
    if (motif && C.mods.briseur && (motif === 'sens' || motif === 'large' || motif === 'lie')) { m *= 0.5; motif = null; }
    if (motif) { if (!echo) ev(C, { type: 'refus', motif: motif, x: nk.x, y: nk.y }); refus = motif; continue; }
    var dmg = Math.min(nk.hp, m); nk.hp -= dmg; total += m; cibles++;
    nk.flash = 0.18; nk.dernier = C.t;
    ev(C, { type: 'degat', x: nk.x, y: nk.y, v: m, echo: echo || o.fantome });
    if (!echo) gagnerEnergie(C, 3);
    if (nk.hp <= 1e-6) tuerNoyau(C, nk);
  }
  if (co) {
    var dm = mult * (1 + 0.4 * (C.mods.chasseur || 0));
    co.hp -= Math.min(co.hp, dm); total += dm; cibles++; co.flash = 0.18; co.dernier = C.t;
    ev(C, { type: 'degat', x: co.x, y: co.y, v: dm, coeur: true, echo: echo || o.fantome });
    if (!echo) gagnerEnergie(C, 3);
  }
  // balles, mines, traqueurs, trous noirs entourés
  var gain = 0, gb = C.mods.aimant ? 2 : 1;
  for (i = C.balles.length - 1; i >= 0; i--) { var b = C.balles[i]; if (b.enc && dansPoly(b.x, b.y, poly)) { C.balles.splice(i, 1); balles++; gain += 1.5 * gb; ev(C, { type: 'balleDetruite', x: b.x, y: b.y }); } }
  for (i = C.mines.length - 1; i >= 0; i--) { var mi = C.mines[i]; if (dansPoly(mi.x, mi.y, poly)) { C.mines.splice(i, 1); balles += 3; gain += 6 * gb; ev(C, { type: 'mineDesamorcee', x: mi.x, y: mi.y }); } }
  for (i = C.traqueurs.length - 1; i >= 0; i--) { var tq = C.traqueurs[i]; if (dansPoly(tq.x, tq.y, poly)) { C.traqueurs.splice(i, 1); balles += 2; gain += 5 * gb; ev(C, { type: 'balleDetruite', x: tq.x, y: tq.y, gros: true }); } }
  for (i = C.trous.length - 1; i >= 0; i--) { var tn = C.trous[i]; if (dansPoly(tn.x, tn.y, poly)) { C.trous.splice(i, 1); balles += 3; gain += 12; ev(C, { type: 'trouDetruit', x: tn.x, y: tn.y }); } }
  if (!echo) gagnerEnergie(C, gain);
  if (!o.fantome) { C.s.balles += balles; C.s.ballesMax = Math.max(C.s.ballesMax, balles); }
  var touche = cibles > 0 || balles > 0;
  if (touche && !echo) {
    C.combo += 1; C.comboT = C.comboMax;
    C.s.comboMax = Math.max(C.s.comboMax, Math.floor(C.combo));
    C.s.multiMax = Math.max(C.s.multiMax, cibles);
  }
  ev(C, { type: 'boucle', poly: poly, aire: aire, cibles: cibles, balles: balles, mult: mult, pile: !!o.pile && touche, serre: !!o.serre && cibles > 0, fracture: frac, echo: echo, fantome: !!o.fantome, lasso: !!o.lasso, refus: cibles ? null : refus, combo: Math.floor(C.combo) });
  return { touche: touche };
}

function tuerNoyau(C, n) {
  n.mort = true; n.hp = 0; C.s.noyaux++;
  C.calme = Math.max(C.calme, C.t + C.b * 1.5);
  gagnerEnergie(C, 12);
  // un cristal éclatant se brise en deux petits cristaux rapides
  if (n.def.type === 'eclatant') {
    var c = corpsDe(C, n.def.corps), a = Math.atan2(n.y - c.y, n.x - c.x), dd = Math.max(1.4, Math.sqrt(dist2(n.x, n.y, c.x, c.y)));
    for (var s = -1; s <= 1; s += 2) {
      var hp = Math.max(2, Math.round(n.hpMax * 0.35));
      var nd = { hp: hp, r: 0.2, type: 'normal', place: 'orbite', dist: dd, a0: a + s * 0.35 - (n.def.w * 1.9 + s * 0.9) * C.t, w: n.def.w * 1.9 + s * 0.9, resp: 0.3, respF: 1.3, respPh: 0, corps: n.def.corps, mini: true };
      C.noyaux.push({ i: C.noyaux.length, x: n.x, y: n.y, hp: hp, hpMax: hp, mort: false, flash: 0.2, dec: 0, bouclier: null, prot: false, def: nd, dernier: C.t, regen: false, intang: false });
      C.hpTotal += hp;
    }
    ev(C, { type: 'eclatement', x: n.x, y: n.y });
  }
  var reste = noyauxVivants(C).length;
  ev(C, { type: 'noyauMort', x: n.x, y: n.y, reste: reste });
  if (!reste) {
    C.phase = 'transition'; C.tTrans = C.t + 1.6; C.annonces = []; C.emetteurs = [];
    C.lasers = []; C.ondes = []; C.murs = []; C.meteores = []; C.bras = []; C.trous = [];
    for (var i = 0; i < C.balles.length; i++) ev(C, { type: 'balleDetruite', x: C.balles[i].x, y: C.balles[i].y, muet: true });
    C.balles = []; C.mines = []; C.traqueurs = [];
    var cd = C.def.coeur, sx = C.corps2 ? (C.corps.x + C.corps2.x) / 2 : C.corps.x, sy = C.corps2 ? (C.corps.y + C.corps2.y) / 2 : C.corps.y;
    C.coeur = { x: sx, y: sy, hp: C.hpCoeur, hpMax: C.hpCoeur, s: 0, flash: 0, sx: sx, sy: sy, prochain: 0 };
    ev(C, { type: 'coeurSort', x: sx, y: sy });
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
  var rg = 1 + 0.3 * (1 - co.hp / co.hpMax);
  var ddx = A * cd.f1 * Math.cos(cd.f1 * co.s + cd.ph), ddy = B * cd.f2 * Math.cos(cd.f2 * co.s + cd.ph * 1.3);
  var vs = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
  // sur le premier temps de chaque mesure, le cœur s'essouffle et ralentit : c'est le moment de l'encercler
  var kb = (C.t - T0) / C.b, pb = ((kb % 4) + 4) % 4;
  co.souffle = pb < 1 ? 1 - Math.abs(pb - 0.5) * 2 : 0;
  var lent = pb < 1 ? 0.18 : 1;
  co.s += cd.v * rg * lent * C.ve * C.lentE * DT / Math.max(vs, 1.5);
  co.x = C.W / 2 + A * Math.sin(cd.f1 * co.s + cd.ph);
  co.y = C.H / 2 + B * Math.sin(cd.f2 * co.s + cd.ph * 1.3);
  co.regen = C.t - (co.dernier || 0) > 8 && co.hp < co.hpMax;
  if (co.regen) co.hp = Math.min(co.hpMax, co.hp + co.hpMax * 0.01 * C.diff.regen * DT);
  if (cd.sillage && C.t >= co.prochain) {
    co.prochain = C.t + C.b * (C.def.d >= 20 ? 0.5 : 1);
    C.balles.push({ x: co.x, y: co.y, vx: 0, vy: 0, r: 0.13, enc: true, vie: 2.4, sillage: true, nait: C.t });
  }
}

function victoire(C) {
  C.fini = 'victoire'; C.tFin = C.t; C.phase = 'fin';
  C.balles = []; C.mines = []; C.traqueurs = []; C.lasers = []; C.ondes = []; C.murs = []; C.meteores = []; C.emetteurs = []; C.annonces = []; C.bras = []; C.trous = [];
  ev(C, { type: 'victoire', x: C.coeur.x, y: C.coeur.y });
}

/* ---------- compétences ---------- */
function utiliserComp(C, s) {
  var id = C.slots[s]; if (!id || C.fini || C.phase === 'entree') return;
  var cp = COMPETENCES[id], niv = C.niv[id] || 1, cout = coutComp(id, niv) * (C.mods.economie && !cp.ultime ? 0.75 : 1);
  if (C.cd[s] > 0) return;
  if (C.en < cout - 1e-6) { ev(C, { type: 'rate', id: id, raison: 'energie' }); C.cd[s] = 0.25; return; }
  var j = C.j, P = puissComp(niv);
  switch (id) {
    case 'lasso':
      var T = C.tr;
      if (T.tx.length < 6 || T.tl < 1.2) { ev(C, { type: 'rate', id: id, raison: 'court' }); C.cd[s] = 0.25; return; }
      var poly = [];
      for (var i = 0; i < T.tx.length; i++) poly.push(T.tx[i], T.ty[i]);
      poly.push(j.x, j.y);
      viderTrace(C);
      C.en -= cout; C.cd[s] = cp.rech; C.s.comps++;
      ev(C, { type: 'competence', id: id, x: j.x, y: j.y, poly: poly });
      var aire = airePoly(poly);
      if (aire >= MIN_AIRE) boucle(C, poly, aire, { lasso: true });
      return;
    case 'rempart': case 'ancre': case 'distorsion': case 'orbitales': case 'filante':
      C.eff[id] = C.t + cp.duree * P;
      break;
    case 'vortex':
      C.vortex = { x: j.x, y: j.y, tE: C.t + cp.duree * P };
      C.eff.vortex = C.vortex.tE;
      break;
    case 'fracture': C.fracture = 1; break;
    case 'echo':
      var h = C.hist, nbp = Math.min(h.length / 2, Math.round(2.5 * P / DT));
      if (nbp < 30) { ev(C, { type: 'rate', id: id, raison: 'court' }); C.cd[s] = 0.25; return; }
      C.fantome = { pts: h.slice(h.length - nbp * 2), k: 0, tr: traceur() };
      break;
    case 'supernova':
      C.s.novas++;
      var nb = C.balles.length + C.mines.length + C.traqueurs.length;
      for (i = 0; i < C.balles.length; i++) ev(C, { type: 'balleDetruite', x: C.balles[i].x, y: C.balles[i].y, muet: true });
      C.balles = []; C.mines = []; C.traqueurs = []; C.trous = [];
      var mult = 5 * multCombo(C) * P / 1.0, R = 4.5;
      for (i = 0; i < C.noyaux.length; i++) { var n = C.noyaux[i]; if (!n.mort && dist2(n.x, n.y, j.x, j.y) < R * R) blesser(C, n, mult); }
      if (C.coeur && C.phase === 'coeur' && dist2(C.coeur.x, C.coeur.y, j.x, j.y) < R * R) blesserCoeur(C, mult);
      ev(C, { type: 'nova', x: j.x, y: j.y, n: nb });
      break;
    case 'constellation':
      var m2 = 3 * multCombo(C) * P;
      var liste = noyauxVivants(C);
      for (i = 0; i < liste.length; i++) blesser(C, liste[i], m2);
      if (C.coeur && C.phase === 'coeur') blesserCoeur(C, m2);
      break;
  }
  C.en -= cout; C.cd[s] = cp.rech; C.s.comps++;
  ev(C, { type: 'competence', id: id, x: j.x, y: j.y });
}
function blesser(C, n, m) {
  if (n.mort) return;
  n.hp -= Math.min(n.hp, m); n.flash = 0.2; n.dernier = C.t;
  ev(C, { type: 'degat', x: n.x, y: n.y, v: m });
  if (n.hp <= 1e-6) tuerNoyau(C, n);
}
function blesserCoeur(C, m) {
  var co = C.coeur; co.hp -= Math.min(co.hp, m); co.flash = 0.2; co.dernier = C.t;
  ev(C, { type: 'degat', x: co.x, y: co.y, v: m, coeur: true });
}
// le double de l'Écho rejoue le trajet enregistré
function majFantome(C) {
  var f = C.fantome; if (!f) return;
  if (f.k * 2 >= f.pts.length) { C.fantome = null; ev(C, { type: 'finComp', id: 'echo' }); return; }
  f.x = f.pts[f.k * 2]; f.y = f.pts[f.k * 2 + 1]; f.k++;
  majTrace(C, f.tr, f.x, f.y, true);
}
// Fil d'or : la traînée détruit les balles qu'elle touche
function filDOr(C) {
  var T = C.tr, n = T.tx.length; if (n < 2) return;
  var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, i;
  for (i = 0; i < n; i++) { if (T.tx[i] < x0) x0 = T.tx[i]; if (T.tx[i] > x1) x1 = T.tx[i]; if (T.ty[i] < y0) y0 = T.ty[i]; if (T.ty[i] > y1) y1 = T.ty[i]; }
  for (var b = C.balles.length - 1; b >= 0; b--) {
    var bl = C.balles[b]; if (!bl.enc || bl.x < x0 - 0.3 || bl.x > x1 + 0.3 || bl.y < y0 - 0.3 || bl.y > y1 + 0.3) continue;
    for (i = 1; i < n; i += 1) if (distSeg2(bl.x, bl.y, T.tx[i - 1], T.ty[i - 1], T.tx[i], T.ty[i]) < Math.pow(bl.r + 0.06, 2)) { C.balles.splice(b, 1); gagnerEnergie(C, 0.5); ev(C, { type: 'balleDetruite', x: bl.x, y: bl.y }); break; }
  }
}

/* ---------- planification rythmique des attaques ---------- */
function planifier(C, k) {
  if (C.phase === 'transition' || C.phase === 'fin' || C.phase === 'entree') return;
  if (C.t < C.calme) return;
  if (C.tuto && k < 4) return;
  var d = C.def, table, df = C.diff;
  var rg = rage(C);
  if (C.phase === 'coeur') table = d.cyclesCoeur;
  else if (rg >= 0.5 || C.mut.fureur) table = d.cyclesRage;
  else table = d.cycles;
  var ci = Math.floor(k / 8), sl = k % 8;
  var R = rngGraine(d.graine * 31 + k * 7 + 1);
  var type = table[ci % 4][sl];
  // la difficulté enlève ou ajoute des attaques (toujours les mêmes pour un même colosse)
  if (type && df.dens < 1 && R() > df.dens) type = null;
  if (!type && df.dens > 1 && R() < df.dens - 1) { type = d.cyclesRage[(ci + 1) % 4][sl] || null; if (type && LOURDES[type]) type = null; }
  if (!type) return;
  var cat = CATALOGUE[type];
  var an = { type: type, tA: C.t, tF: tempsBeat(C, k + cat.annonce + (df.tele || 0)), R: R, k: k };
  an.tirs = [an.tF]; an.tFin = an.tF;
  preparer(C, an, R);
  if (an.annule) return;
  C.annonces.push(an);
  ev(C, { type: 'annonce', a: type });
}

function sourcePos(C, src) {
  if (src && src.noyau != null) { var n = C.noyaux[src.noyau]; if (n && !n.mort) return { x: n.x, y: n.y }; }
  if (C.phase === 'coeur' && src && src.coeur && C.coeur) return { x: C.coeur.x, y: C.coeur.y };
  if (src && src.corps === 1 && C.corps2) return { x: C.corps2.x, y: C.corps2.y };
  return { x: C.corps.x, y: C.corps.y };
}
function corpsSource(C, an) { return C.corps2 && an.k % 2 ? { corps: 1 } : null; }

function preparer(C, an, R) {
  var d = C.def.d, j = C.j, co = C.corps, W = C.W, H = C.H, b = C.b;
  var vivants = noyauxVivants(C), i;
  var vB = C.def.vB * C.ve;
  switch (an.type) {
    case 'rosace':
      an.n = clamp(8 + Math.floor(d / 4), 8, 16); an.off = R() * TAU; an.v = vB * 0.85;
      an.src = (d >= 10 && vivants.length && R() < 0.4) ? { noyau: R.choix(vivants).i } : (C.phase === 'coeur' && R() < 0.5 ? { coeur: 1 } : corpsSource(C, an));
      if (d >= 24) { an.tirs.push(an.tF + b / 2); an.tFin = an.tF + b / 2; }
      break;
    case 'mines':
      an.pts = [];
      var nb = clamp(2 + Math.floor(d / 6), 2, 6);
      for (i = 0; i < nb; i++) for (var essai = 0; essai < 20; essai++) {
        var x = R.entre(1, W - 1), y = R.entre(1, H - 1);
        if (dist2(x, y, j.x, j.y) > 2.2 * 2.2 && dist2(x, y, co.x, co.y) > 1.6 * 1.6) { an.pts.push(x, y); break; }
      }
      an.n = clamp(6 + Math.floor(d / 5), 6, 11); an.meche = 3 * b; an.v = vB * 0.7;
      break;
    case 'salve':
      an.n = clamp(3 + Math.floor(d / 8), 3, 6); an.ec = 0.2; an.v = vB * 1.05;
      an.src = C.phase === 'coeur' && R() < 0.5 ? { coeur: 1 } : corpsSource(C, an);
      if (d >= 14) { an.tirs.push(an.tF + b / 4); an.tFin = an.tF + b / 4; }
      if (d >= 30) { an.tirs.push(an.tF + b / 2); an.tFin = an.tF + b / 2; }
      break;
    case 'laser':
      var s = sourcePos(C, corpsSource(C, an));
      an.lasers = [{ x: s.x, y: s.y, a: Math.atan2(j.y - s.y, j.x - s.x) }];
      if (d >= 14) an.lasers.push({ x: s.x, y: s.y, a: an.lasers[0].a + R.choix([-0.7, 0.7]) });
      an.duree = b * 0.6;
      break;
    case 'eclats':
      if (!vivants.length) { an.type = 'salve'; an.n = 4; an.ec = 0.25; an.v = vB; an.src = C.phase === 'coeur' ? { coeur: 1 } : null; break; }
      an.par = d >= 11 ? 2 : 1; an.v = vB * 0.95;
      break;
    case 'spirale':
      an.bras = d >= 30 ? 3 : d >= 14 ? 2 : 1; an.a0 = R() * TAU; an.sens = R.signe(); an.v = vB * 0.75;
      an.src = vivants.length && d >= 13 && R() < 0.4 ? { noyau: R.choix(vivants).i } : corpsSource(C, an);
      break;
    case 'onde':
      an.gap = R() * TAU; an.larg = Math.max(0.95, 1.3 - d * 0.006);
      an.v = Math.min(4.0, 2.6 + d * 0.03) * C.ve;
      if (d >= 16) { an.tirs.push(an.tF + b); an.tFin = an.tF + b; an.gap2 = an.gap + R.entre(1.2, 2.4) * R.signe(); }
      break;
    case 'traqueurs':
      an.n = clamp(2 + Math.floor(d / 14), 2, 4);
      break;
    case 'faux':
      an.src = corpsSource(C, an); an.nb = d >= 16 ? 3 : 2; an.a0 = R() * TAU; an.rot = R.signe() * Math.min(1.6, 0.9 + d * 0.02); an.long = clamp(6 + Math.floor(d / 6), 6, 9);
      break;
    case 'meteores':
      an.pts = [j.x, j.y];
      var nm = clamp(3 + Math.floor(d / 6), 3, 8);
      for (var m = 1; m < nm; m++) { var a = R() * TAU, r = R.entre(1.2, 3.4); an.pts.push(clamp(j.x + Math.cos(a) * r, 0.5, W - 0.5), clamp(j.y + Math.sin(a) * r, 0.5, H - 0.5)); }
      an.r = 0.8;
      break;
    case 'croix':
      var nl = d >= 18 ? 6 : 4, a0 = R() * TAU;
      an.src = corpsSource(C, an);
      an.lasers = [];
      for (var c = 0; c < nl; c++) an.lasers.push({ x: co.x, y: co.y, a: a0 + TAU * c / nl, suit: true, corps: an.src ? 1 : 0 });
      an.duree = b * 0.75;
      break;
    case 'cage':
      an.cx = j.x; an.cy = j.y; an.r = 2.7; an.n = clamp(16 + Math.floor(d / 4), 16, 26); an.trou = R.ent(0, an.n - 1); an.trouN = d >= 20 ? 2 : 3;
      break;
    case 'ruee':
      if (co.ruee || C.def.espece === 'hydre' || C.def.espece === 'pendule') { an.type = 'salve'; an.n = 5; an.ec = 0.2; an.v = vB; an.src = null; break; }
      an.cible = { x: clamp(j.x, 1.2, W - 1.2), y: clamp(j.y, 1.2, H - 1.2) };
      break;
    case 'serpent':
      an.src = corpsSource(C, an); an.n = clamp(10 + Math.floor(d / 4), 10, 18); an.amp = R.entre(0.8, 1.4); an.v = vB * 0.8;
      break;
    case 'murs':
      an.cote = R.ent(0, 3); an.trou = R.entre(0.25, 0.75); an.tr = Math.max(1.4, 2.2 - d * 0.014);
      an.v = Math.min(4.4, 2.6 + d * 0.035) * C.ve;
      break;
    case 'eclair':
      // un éclair en zigzag qui traverse l'arène en passant près de la comète
      var vert = R() < 0.5, pts = [];
      for (var z = 0; z <= 5; z++) {
        var u = z / 5;
        if (vert) pts.push(clamp(j.x + R.entre(-1.4, 1.4) * (z % 2 ? 1 : 0.5), 0.3, W - 0.3), u * H);
        else pts.push(u * W, clamp(j.y + R.entre(-1.2, 1.2) * (z % 2 ? 1 : 0.5), 0.3, H - 0.3));
      }
      an.lasers = [];
      for (z = 0; z < 5; z++) { var x0 = pts[z * 2], y0 = pts[z * 2 + 1], x1 = pts[z * 2 + 2], y1 = pts[z * 2 + 3]; an.lasers.push({ x: x0, y: y0, a: Math.atan2(y1 - y0, x1 - x0), len: Math.sqrt(dist2(x0, y0, x1, y1)), w: 0.26 }); }
      an.duree = 0.35;
      break;
    case 'balayage':
      var sb = sourcePos(C, corpsSource(C, an)), aj = Math.atan2(j.y - sb.y, j.x - sb.x), sens = R.signe();
      an.src = corpsSource(C, an);
      an.lasers = [{ x: sb.x, y: sb.y, a: aj - sens * 1.1, rot: sens * 2.2 / (b * 1.5), suit: true, corps: an.src ? 1 : 0 }];
      an.duree = b * 1.5;
      break;
    case 'pluie':
      an.cols = []; var ncol = Math.floor(W / 0.75);
      var t1 = R.ent(1, ncol - 4), t2 = R.ent(1, ncol - 4);
      for (var cc = 0; cc < ncol; cc++) if (Math.abs(cc - t1) > 1 && Math.abs(cc - t2) > 1) an.cols.push(0.4 + cc * 0.75);
      an.haut = R() < 0.5; an.tirs.push(an.tF + b / 2); an.tFin = an.tF + b / 2; an.v = vB * 0.85;
      break;
    case 'trounoir':
      var px, py, ok = false;
      for (var e2 = 0; e2 < 30 && !ok; e2++) { px = R.entre(1.5, W - 1.5); py = R.entre(1.5, H - 1.5); ok = dist2(px, py, j.x, j.y) > 3.2 * 3.2 && dist2(px, py, co.x, co.y) > 2.2 * 2.2; }
      an.px = px; an.py = py; an.duree = b * 6;
      break;
    case 'fleur':
      if (!vivants.length) { an.type = 'rosace'; an.n = 12; an.off = R() * TAU; an.v = vB * 0.8; an.src = C.phase === 'coeur' ? { coeur: 1 } : null; break; }
      an.off = R() * TAU; an.v = vB * 0.7;
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
  var d = C.def.d, j = C.j, co = C.corps, b = C.b, i, s, a;
  ev(C, { type: 'tir', a: an.type });
  switch (an.type) {
    case 'rosace':
      s = sourcePos(C, an.src);
      var off = an.off + (an.tirs.length ? 0 : TAU / an.n / 2);
      for (i = 0; i < an.n; i++) { a = off + TAU * i / an.n; balle(C, s.x + Math.cos(a) * 0.5, s.y + Math.sin(a) * 0.5, a, an.v); }
      break;
    case 'mines':
      for (i = 0; i < an.pts.length; i += 2) C.mines.push({ x: an.pts[i], y: an.pts[i + 1], tB: C.t + an.meche, n: an.n, nait: C.t, meche: an.meche, v: an.v });
      break;
    case 'salve':
      s = sourcePos(C, an.src); a = Math.atan2(j.y - s.y, j.x - s.x);
      for (i = 0; i < an.n; i++) balle(C, s.x, s.y, a + (i - (an.n - 1) / 2) * an.ec, an.v);
      break;
    case 'eclats':
      var viv = noyauxVivants(C);
      for (i = 0; i < viv.length; i++) {
        a = Math.atan2(j.y - viv[i].y, j.x - viv[i].x);
        for (var p = 0; p < an.par; p++) balle(C, viv[i].x, viv[i].y, a + (p - (an.par - 1) / 2) * 0.22, an.v);
      }
      break;
    case 'spirale':
      C.emetteurs.push({ src: an.src, tFin: C.t + 2 * b, prochain: C.t, pas: b / 8, a: an.a0, da: 0.42 * an.sens, bras: an.bras, v: an.v });
      break;
    case 'serpent':
      s = sourcePos(C, an.src); a = Math.atan2(j.y - s.y, j.x - s.x);
      C.emetteurs.push({ src: an.src, tFin: C.t + an.n * b / 8, prochain: C.t, pas: b / 8, serpent: { a: a, amp: an.amp, v: an.v }, k: 0 });
      break;
    case 'laser': case 'croix': case 'balayage': case 'eclair':
      for (i = 0; i < an.lasers.length; i++) {
        var L = an.lasers[i], cs = corpsDe(C, L.corps || 0);
        C.lasers.push({ x: L.suit ? cs.x : L.x, y: L.suit ? cs.y : L.y, a: L.a, rot: L.rot || 0, w: L.w || 0.34, len: L.len || 40, tF: C.t, tE: C.t + an.duree, suit: L.suit, corps: L.corps || 0 });
      }
      break;
    case 'onde':
      var gap = an.tirs.length ? an.gap : (an.gap2 != null ? an.gap2 : an.gap);
      C.ondes.push({ x: co.x, y: co.y, r: co.r, v: an.v, w: 0.24, gap: gap, larg: an.larg });
      break;
    case 'traqueurs':
      for (i = 0; i < an.n; i++) { a = TAU * i / an.n + C.t; C.traqueurs.push({ x: co.x + Math.cos(a) * 0.6, y: co.y + Math.sin(a) * 0.6, a: a, v: Math.min(3.4, 1.9 + d * 0.03) * C.ve, tour: 1.8, vie: 7, nait: C.t }); }
      break;
    case 'faux':
      for (i = 0; i < an.nb; i++) C.bras.push({ src: an.src, a: an.a0 + TAU * i / an.nb, rot: an.rot, n: an.long, esp: 0.5, tE: C.t + b * 4, r: 0.14, nait: C.t });
      break;
    case 'meteores':
      for (i = 0; i < an.pts.length; i += 2) C.meteores.push({ x: an.pts[i], y: an.pts[i + 1], r: an.r, tB: C.t, tE: C.t + 0.2 });
      ev(C, { type: 'meteore' });
      break;
    case 'cage':
      for (i = 0; i < an.n; i++) {
        var ecart = ((i - an.trou) % an.n + an.n) % an.n; if (ecart < an.trouN) continue;
        a = TAU * i / an.n;
        balle(C, an.cx + Math.cos(a) * an.r, an.cy + Math.sin(a) * an.r, a + Math.PI, 1.25 * C.ve, 0.14, { vie: 2.1 });
      }
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
        if (an.haut) balle(C, x, -0.2, Math.PI / 2, an.v); else balle(C, x, C.H + 0.2, -Math.PI / 2, an.v);
      }
      break;
    case 'trounoir':
      C.trous.push({ x: an.px, y: an.py, tE: C.t + an.duree, force: Math.min(4.2, 2.6 + d * 0.04), r: 0.34, nait: C.t });
      break;
    case 'fleur':
      var vv = noyauxVivants(C);
      for (i = 0; i < vv.length; i++) for (var f = 0; f < 6; f++) { a = an.off + TAU * f / 6 + i * 0.5; balle(C, vv[i].x, vv[i].y, a, an.v); }
      break;
  }
}

/* ---------- ennemis ---------- */
function majEnnemis(C) {
  var i, W = C.W, H = C.H, j = C.j, co = C.corps, dtE = DT * C.lentE;
  // tourbillon et trous noirs : ils aspirent les balles
  var puits = [];
  if (C.vortex) { if (C.t >= C.vortex.tE) C.vortex = null; else puits.push({ x: C.vortex.x, y: C.vortex.y, f: 9, r: 4 }); }
  for (i = C.trous.length - 1; i >= 0; i--) { if (C.t >= C.trous[i].tE) { ev(C, { type: 'trouFin', x: C.trous[i].x, y: C.trous[i].y }); C.trous.splice(i, 1); } else puits.push({ x: C.trous[i].x, y: C.trous[i].y, f: 3, r: 3 }); }
  for (i = C.balles.length - 1; i >= 0; i--) {
    var b = C.balles[i];
    if (b.ond) {
      b.s += dtE; var o = b.ond, px = -Math.sin(o.a), py = Math.cos(o.a), w = Math.sin(b.s * 5 + o.ph) * o.amp;
      b.x = o.x + Math.cos(o.a) * o.v * b.s + px * w; b.y = o.y + Math.sin(o.a) * o.v * b.s + py * w;
    } else {
      for (var p = 0; p < puits.length; p++) {
        var pu = puits[p], ddx = pu.x - b.x, ddy = pu.y - b.y, dd = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dd < pu.r && dd > 0.05) { b.vx += (ddx / dd * pu.f - b.vx * 1.2) * DT; b.vy += (ddy / dd * pu.f - b.vy * 1.2) * DT; b.vie = Math.max(b.vie, 2); }
      }
      b.x += b.vx * dtE; b.y += b.vy * dtE;
    }
    b.vie -= dtE;
    if (b.vie <= 0 || b.x < -1 || b.x > W + 1 || b.y < -1 || b.y > H + 1) C.balles.splice(i, 1);
  }
  for (i = C.emetteurs.length - 1; i >= 0; i--) {
    var e = C.emetteurs[i];
    if (C.t >= e.tFin || C.phase === 'transition') { C.emetteurs.splice(i, 1); continue; }
    while (C.t >= e.prochain) {
      e.prochain += e.pas;
      var s = sourcePos(C, e.src);
      if (e.serpent) { var sp = e.serpent; balle(C, s.x, s.y, sp.a, 0, 0.13, { ond: { x: s.x, y: s.y, a: sp.a, v: sp.v, amp: sp.amp, ph: -e.k * 0.55 }, s: 0 }); e.k++; continue; }
      for (var k = 0; k < e.bras; k++) { var a = e.a + TAU * k / e.bras; balle(C, s.x + Math.cos(a) * 0.4, s.y + Math.sin(a) * 0.4, a, e.v); }
      e.a += e.da;
    }
  }
  for (i = C.lasers.length - 1; i >= 0; i--) {
    var L = C.lasers[i];
    if (C.t >= L.tE) { C.lasers.splice(i, 1); continue; }
    L.a += L.rot * dtE;
    if (L.suit) { var cs = corpsDe(C, L.corps); L.x = cs.x; L.y = cs.y; }
  }
  for (i = C.bras.length - 1; i >= 0; i--) {
    var br = C.bras[i]; if (C.t >= br.tE) { C.bras.splice(i, 1); continue; }
    br.a += br.rot * dtE; var sb = sourcePos(C, br.src); br.x = sb.x; br.y = sb.y;
  }
  for (i = C.ondes.length - 1; i >= 0; i--) { var on = C.ondes[i]; on.r += on.v * dtE; if (on.r > 22) C.ondes.splice(i, 1); }
  for (i = C.mines.length - 1; i >= 0; i--) {
    var m = C.mines[i];
    if (C.t >= m.tB) {
      C.mines.splice(i, 1);
      var off = C.t * 1.7;
      for (var q = 0; q < m.n; q++) { var aa = off + TAU * q / m.n; balle(C, m.x, m.y, aa, m.v, 0.12); }
      ev(C, { type: 'mineBoom', x: m.x, y: m.y });
    }
  }
  for (i = C.traqueurs.length - 1; i >= 0; i--) {
    var tq = C.traqueurs[i];
    tq.vie -= dtE; if (tq.vie <= 0) { C.traqueurs.splice(i, 1); ev(C, { type: 'balleDetruite', x: tq.x, y: tq.y, muet: true }); continue; }
    var ac = Math.atan2(j.y - tq.y, j.x - tq.x), df = angDiff(tq.a, ac);
    tq.a += clamp(df, -tq.tour * dtE, tq.tour * dtE);
    tq.x += Math.cos(tq.a) * tq.v * dtE; tq.y += Math.sin(tq.a) * tq.v * dtE;
  }
  for (i = C.meteores.length - 1; i >= 0; i--) if (C.t >= C.meteores[i].tE) C.meteores.splice(i, 1);
  for (i = C.murs.length - 1; i >= 0; i--) {
    var mu = C.murs[i]; mu.pos += mu.v * dtE;
    if (mu.pos > (mu.cote < 2 ? W : H) + 0.5) C.murs.splice(i, 1);
  }
  // les lunes de la compétence Orbitales
  if (C.eff.orbitales) {
    for (var l = 0; l < 3; l++) {
      var la = C.t * 5 + l * TAU / 3, lx = j.x + Math.cos(la) * 0.75, ly = j.y + Math.sin(la) * 0.75;
      for (var bb = C.balles.length - 1; bb >= 0; bb--) { var bl = C.balles[bb]; if (bl.enc && dist2(bl.x, bl.y, lx, ly) < Math.pow(bl.r + 0.16, 2)) { C.balles.splice(bb, 1); gagnerEnergie(C, 0.5); ev(C, { type: 'balleDetruite', x: bl.x, y: bl.y }); } }
      for (var tt = C.traqueurs.length - 1; tt >= 0; tt--) if (dist2(C.traqueurs[tt].x, C.traqueurs[tt].y, lx, ly) < 0.13) { ev(C, { type: 'balleDetruite', x: C.traqueurs[tt].x, y: C.traqueurs[tt].y, gros: true }); C.traqueurs.splice(tt, 1); }
    }
  }
}

/* géométrie des dangers */
function murRect(C, mu) {
  var vert = mu.cote < 2;
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
  var l = L.len || 40, ex = L.x + Math.cos(L.a) * l, ey = L.y + Math.sin(L.a) * l;
  return distSeg2(x, y, L.x, L.y, ex, ey) < Math.pow(L.w / 2 + marge, 2);
}
function dansOnde(o, x, y, marge) {
  var dd = Math.sqrt(dist2(x, y, o.x, o.y));
  if (Math.abs(dd - o.r) > o.w / 2 + marge) return false;
  var a = Math.atan2(y - o.y, x - o.x);
  return Math.abs(angDiff(a, o.gap)) > o.larg / 2;
}
function dansRempart(C, x, y, marge) {
  var rp = C.def.rempart; if (!rp || C.phase === 'coeur' || C.phase === 'transition' || C.phase === 'fin') return false;
  var co = C.corps, dd = Math.sqrt(dist2(x, y, co.x, co.y));
  if (Math.abs(dd - rp.r) > 0.11 + marge) return false;
  var a = Math.atan2(y - co.y, x - co.x);
  for (var g = 0; g < 2; g++) if (Math.abs(angDiff(a, C.rempartA + g * Math.PI)) < rp.larg / 2) return false;
  return true;
}
function brasPoints(br) { var l = []; for (var k = 0; k < br.n; k++) { var r = 0.7 + k * br.esp; l.push(br.x + Math.cos(br.a) * r, br.y + Math.sin(br.a) * r); } return l; }

function couperTrace(C, T, protege) {
  if (protege) return;
  var n = T.tx.length; if (n < 2) return;
  var idx = -1, cx = 0, cy = 0, cause = '';
  for (var i = n - 2; i >= 0 && idx < 0; i--) {
    var x = T.tx[i], y = T.ty[i], k;
    for (k = 0; k < C.lasers.length; k++) if (dansLaser(C.lasers[k], x, y, 0)) { idx = i; cause = 'laser'; break; }
    if (idx < 0) for (k = 0; k < C.ondes.length; k++) if (dansOnde(C.ondes[k], x, y, 0.02)) { idx = i; cause = 'onde'; break; }
    if (idx < 0) for (k = 0; k < C.murs.length; k++) if (dansMur(C, C.murs[k], x, y, 0)) { idx = i; cause = 'mur'; break; }
    if (idx < 0 && dansRempart(C, x, y, 0)) { idx = i; cause = 'rempart'; }
    if (idx >= 0) { cx = x; cy = y; }
  }
  if (idx >= 0) { for (var r = 0; r <= idx && T.tx.length; r++) retirerTete(T); if (T === C.tr) ev(C, { type: 'coupe', x: cx, y: cy, cause: cause }); }
}

function collisions(C) {
  var j = C.j;
  if (j.invul > 0 || j.dashT > 0 || C.eff.filante) return;
  var x = j.x, y = j.y, i, cause = null;
  for (i = 0; i < C.balles.length && !cause; i++) { var b = C.balles[i]; var rr = b.r * 0.78 + R_J; if (dist2(x, y, b.x, b.y) < rr * rr) { cause = b.sillage ? 'sillage' : b.ond ? 'serpent' : 'balle'; C.balles.splice(i, 1); } }
  for (i = 0; i < C.mines.length && !cause; i++) if (dist2(x, y, C.mines[i].x, C.mines[i].y) < Math.pow(0.2 + R_J, 2)) cause = 'mine';
  for (i = 0; i < C.traqueurs.length && !cause; i++) if (dist2(x, y, C.traqueurs[i].x, C.traqueurs[i].y) < Math.pow(0.17 + R_J, 2)) cause = 'traqueur';
  for (i = 0; i < C.lasers.length && !cause; i++) if (dansLaser(C.lasers[i], x, y, R_J - 0.04)) cause = C.lasers[i].len < 39 ? 'eclair' : 'laser';
  for (i = 0; i < C.ondes.length && !cause; i++) if (dansOnde(C.ondes[i], x, y, R_J - 0.03)) cause = 'onde';
  for (i = 0; i < C.murs.length && !cause; i++) if (dansMur(C, C.murs[i], x, y, R_J - 0.03)) cause = 'mur';
  for (i = 0; i < C.meteores.length && !cause; i++) { var m = C.meteores[i]; if (dist2(x, y, m.x, m.y) < Math.pow(m.r - 0.05, 2)) cause = 'meteore'; }
  for (i = 0; i < C.trous.length && !cause; i++) if (dist2(x, y, C.trous[i].x, C.trous[i].y) < Math.pow(C.trous[i].r + R_J - 0.05, 2)) cause = 'trounoir';
  for (i = 0; i < C.bras.length && !cause; i++) { var pts = brasPoints(C.bras[i]); for (var p = 0; p < pts.length; p += 2) if (dist2(x, y, pts[p], pts[p + 1]) < Math.pow(C.bras[i].r * 0.85 + R_J, 2)) { cause = 'faux'; break; } }
  if (!cause && dansRempart(C, x, y, R_J - 0.03)) cause = 'rempart';
  if (!cause && C.phase !== 'entree' && C.phase !== 'fin') {
    var co = C.corps; if (dist2(x, y, co.x, co.y) < Math.pow(co.r * 0.8 + R_J, 2)) cause = co.ruee ? 'ruee' : 'corps';
    if (!cause && C.corps2 && dist2(x, y, C.corps2.x, C.corps2.y) < Math.pow(C.corps2.r * 0.8 + R_J, 2)) cause = 'corps';
  }
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
  viderTrace(C);
  C.combo = 0; C.comboT = 0;
  if (C.invincible) { ev(C, { type: 'touche', x: j.x, y: j.y, cause: cause, entrainement: true }); return; }
  if (j.egide) { j.egide = false; ev(C, { type: 'egide', x: j.x, y: j.y, cause: cause }); return; }
  j.coeurs--;
  ev(C, { type: 'touche', x: j.x, y: j.y, cause: cause, reste: j.coeurs });
  if (j.coeurs <= 0) { C.fini = 'defaite'; C.tFin = C.t; C.cause = cause; ev(C, { type: 'defaite', cause: cause }); }
}

function multCombo(C) { return 1 + 0.05 * Math.min(Math.floor(C.combo), 30); }
function restantCombat(C) {
  var r = 0; for (var i = 0; i < C.noyaux.length; i++) if (!C.noyaux[i].mort) r += C.noyaux[i].hp;
  return r + (C.coeur ? C.coeur.hp : C.hpCoeur);
}
function pctCombat(C) { return C.fini === 'victoire' ? 1 : clamp(1 - restantCombat(C) / C.hpTotal, 0, 1); }
