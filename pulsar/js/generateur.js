'use strict';
/* PULSAR — générateur de niveaux.
   Principe : un « fantôme » joue le niveau pendant qu'on le construit (même physique que le joueur, appuis calés
   sur le rythme). Les obstacles sont posés autour de sa trajectoire avec une marge qui dépend de la difficulté :
   chaque niveau est donc toujours faisable, et le fantôme sert aussi de guide en entraînement. */

var VIDE = new Niveau();
var SPB = [128, 120, 112, 104, 100, 96, 88, 84, 80];   // pas par temps (240 pas/s) -> 112 à 180 bpm

function paramsD(D, R) {
  var d = Math.max(1, D);
  var P = { D: d };
  P.marge = Math.max(0.06, 0.24 - 0.008 * d);
  P.fenetre = 0.009 + 0.058 * Math.exp(-(d - 1) / 9);   // demi-fenêtre de timing garantie pour chaque saut (s)
  P.margeMur = {
    onde: Math.max(0.27, 1.0 - 0.025 * d),
    vaisseau: Math.max(0.4, 1.35 - 0.042 * d),
    ovni: Math.max(0.42, 1.4 - 0.042 * d)
  };
  P.sub = d < 3.5 ? 2 : (d < 9 ? (R() < (d - 3.5) / 5.5 ? 4 : 2) : 4);
  var bi = clamp(Math.round((d - 1) / 3.2 + R() * 1.6 - 0.8), 0, SPB.length - 1);
  P.spb = SPB[bi];
  P.modes = { cube: 3, vaisseau: 2 };
  if (d >= 1.6) P.modes.boule = 2;
  if (d >= 2.4) P.modes.onde = 2.2;
  if (d >= 3.3) P.modes.ovni = 1.6;
  if (d >= 12) { P.modes.cube = 2.4; P.modes.onde = 2.6; }
  P.pTampon = d >= 1.3 ? 0.1 : 0;
  P.pGravite = d >= 5 ? Math.min(0.12, 0.03 + 0.008 * d) : 0;
  P.pOrbe = d >= 2 ? Math.min(0.22, 0.07 + 0.012 * d) : 0;
  P.pChaine = d >= 3 ? Math.min(0.4, 0.1 + 0.02 * d) : 0;
  P.pPlafond = d >= 1.5 ? Math.min(0.65, 0.2 + 0.035 * d) : 0;
  P.pSaut = Math.min(0.88, 0.5 + 0.03 * d);
  P.maxPiques = d < 2 ? 2 : d < 8 ? 3 : 6;
  P.pFosse = Math.min(0.45, 0.1 + 0.03 * d);
  P.pMarche = Math.min(0.5, 0.15 + 0.03 * d);
  P.pObstacle = d >= 2 ? Math.min(0.75, 0.12 + 0.04 * d) : 0;
  P.mesures = function () { return d < 6 ? 4 : d < 14 ? (R() < 0.5 ? 4 : 3) : (R() < 0.5 ? 2 : 3); };
  P.ecartBoule = [Math.max(2.4, 4.6 - 0.08 * d), Math.max(3.4, 6 - 0.08 * d)];
  P.pMini = d >= 12 ? Math.min(0.4, 0.05 * (d - 11)) : 0;
  P.agite = Math.min(0.9, 0.25 + 0.035 * d);     // nervosité des trajectoires en couloir
  P.boss = Math.min(1, 0.25 + 0.04 * d);          // fréquence des attaques du boss
  P.margeBoss = Math.max(0.14, 1.0 - 0.032 * d);
  return P;
}

function choisirVitesse(R, d) {
  if (d < 2.5) return R() < 0.2 ? 0 : 1;
  if (d < 6) return R() < 0.6 ? 1 : 2;
  if (d < 12) return R() < 0.45 ? 2 : (R() < 0.5 ? 1 : 3);
  if (d < 18) return R.choix([1, 2, 2, 3, 3]);
  return R.choix([2, 3, 3, 4]);
}

/* ---------- Simulation ---------- */
function simuler(etat, n, tenir, L, marge, stop) {
  var s = copieEtat(etat); s.marge = marge;
  var tx = [], ty = [], tsol = [];
  for (var i = 0; i < n; i++) {
    pas(s, tenir(i), L, false);
    tx.push(s.x); ty.push(s.y); tsol.push(s.sol);
    if (s.mort) return { ok: false, s: s, x: tx, y: ty, sol: tsol, n: i + 1 };
    if (stop && stop(s, i)) return { ok: true, s: s, x: tx, y: ty, sol: tsol, n: i + 1 };
  }
  return { ok: true, s: s, x: tx, y: ty, sol: tsol, n: n };
}
function avancer(G, n, tenir) {
  var L = G.L, s = G.s;
  for (var i = 0; i < n; i++) {
    var t = tenir(i) ? 1 : 0;
    pas(s, !!t, L, false);
    if (s.mort) throw new Error('fantôme mort (' + s.cause + ') au pas ' + G.step + ' x=' + s.x.toFixed(2) + ' mode ' + s.mode);
    G.step++;
    L.ghost.push(t); L.xs.push(s.x); L.gy.push(s.y); L.gmode.push(MODES.indexOf(s.mode)); L.gsol.push(s.sol ? 1 : 0);
  }
}
function jusquAuCreneau(G) { var r = G.step % G.slot; return r === 0 ? 0 : G.slot - r; }

/* ---------- Plateformes ouvertes (sol / plafond) ---------- */
function ouvrirSol(G, x, h) {
  G.h = h;
  G.plat = h > 0.01 ? G.L.bloc(x, 0, 400, h, 1) : null;
}
function fermerSol(G, x) { if (G.plat) { G.plat.w = x - G.plat.x; if (G.plat.w < 0.05) G.plat.w = 0; } G.plat = null; }
function ouvrirPlafond(G, x, c) {
  G.c = c;
  G.plaf = c < HAUT - 0.01 ? G.L.bloc(x, c, 400, HAUT + 3 - c, 2) : null;
}
function fermerPlafond(G, x) { if (G.plaf) { G.plaf.w = x - G.plaf.x; if (G.plaf.w < 0.05) G.plaf.w = 0; } G.plaf = null; G.c = HAUT; }
function etatPlat(G) { return { plat: G.plat, w: G.plat ? G.plat.w : 0, h: G.h, plaf: G.plaf, pw: G.plaf ? G.plaf.w : 0, c: G.c }; }
function restaurerPlat(G, e) { G.plat = e.plat; if (e.plat) e.plat.w = e.w; G.h = e.h; G.plaf = e.plaf; if (e.plaf) e.plaf.w = e.pw; G.c = e.c; }

/* dégagement d'un rectangle de danger par rapport à une trajectoire (boîte de danger du fantôme gonflée) */
function rectLibre(traj, hz, x0, x1, y0, y1, dxw) {
  var dec = dxw ? [-dxw, -dxw / 2, 0, dxw / 2, dxw] : [0];
  for (var k = 0; k < dec.length; k++) {
    var o = dec[k];
    for (var i = 0; i < traj.x.length; i++) {
      var x = traj.x[i] + o, y = traj.y[i];
      if (x + hz > x0 && x - hz < x1 && y + hz > y0 && y - hz < y1) return false;
    }
  }
  return true;
}
function piqueLibre(traj, hz, xs, y, dir, dxw) {
  var y0 = dir === 1 ? y : y - 0.55, y1 = dir === 1 ? y + 0.55 : y;
  return rectLibre(traj, hz, xs + 0.35, xs + 0.65, y0, y1, dxw);
}

/* ---------- Motifs du cube ---------- */
function tenirTap(n) { return function (i) { return i < n; }; }

function motifCourse(G, creneaux, avecPlafond) {
  var L = G.L, P = G.P, R = G.R;
  var n = creneaux * G.slot + jusquAuCreneau(G);
  var x0 = G.s.x, v = VITESSES[G.s.vit];
  var x1 = x0 + n * DT * v;
  if (avecPlafond && G.s.mode === 'cube' && G.s.g === 1 && x1 - x0 > 5.5) {
    var m = L.marque(), e = etatPlat(G);
    var hz = PHYS.cube.hz + P.marge;
    var bas = G.h + 0.45 + hz + 0.58 + R() * 0.25;
    bas = Math.ceil(bas * 2) / 2;
    if (bas + 0.5 < HAUT - 0.5) {
      var xa = x0 + 0.8, xb = x1 - 3.2;
      if (xb - xa >= 1.5) {
        L.bloc(xa, bas, xb - xa, 0.5, 3);
        for (var xs = xa; xs + 1 <= xb + 0.01; xs += 1) L.pique(xs, bas, -1);
        var sim = simuler(G.s, n, function () { return false; }, L, P.marge);
        if (!sim.ok) { L.annuler(m); restaurerPlat(G, e); }
      }
    }
  }
  avancer(G, n, function () { return false; });
}

/* Saut du cube : de la hauteur h vers nh, avec éventuellement une fosse, un orbe ou un tampon.
   Renvoie true si le motif a été posé. */
function motifSaut(G, opt) {
  var L = G.L, P = G.P, R = G.R, s0 = G.s;
  if (s0.mode !== 'cube' || !s0.sol || s0.g !== 1) return false;
  var h = G.h, hs = PHYS.cube.hs, hz = PHYS.cube.hz + P.marge;
  var chaine = !!opt.chaine;
  var tapN = chaine ? 1e9 : 8;
  var tenir, libre;
  var orbePos = null, tampon = false;

  if (opt.type === 'tampon') {
    tampon = true;
    var e0 = copieEtat(s0); e0.vy = TAMPONS.jaune; e0.sol = false;
    tenir = function () { return false; };
    libre = simuler(e0, 400, tenir, VIDE, 0, function (s, i) { return i > 4 && s.sol; });
  } else if (opt.type === 'orbe') {
    var f0 = simuler(s0, 300, tenirTap(8), VIDE, 0, function (s, i) { return i > 4 && s.sol; });
    var iA = 0; for (var i = 1; i < f0.y.length; i++) if (f0.y[i] > f0.y[iA]) iA = i;
    var cands = [];
    for (var k = G.slot; k < f0.y.length - 10; k += G.slot) if (k >= iA - 22 && k <= iA + 30) cands.push(k);
    if (!cands.length) return false;
    var ko = R.choix(cands);
    orbePos = { x: f0.x[ko - 1], y: f0.y[ko - 1], k: ko };
    var tmp = new Niveau(); tmp.orbe(orbePos.x, orbePos.y, 'jaune');
    tenir = function (i) { return i < 8 || (i >= ko && i < ko + 8); };
    libre = simuler(s0, 500, tenir, tmp, 0, function (s, i) { return i > ko + 4 && s.sol; });
  } else {
    tenir = function (i) { return i < tapN; };
    libre = simuler(s0, 300, tenir, VIDE, 0, function (s, i) { return i > 4 && s.sol; });
  }
  var T = libre;
  var nT = T.y.length;
  var apex = 0; for (var j = 0; j < nT; j++) if (T.y[j] > T.y[apex]) apex = j;
  var hautMax = T.y[apex] - hs;

  // hauteur d'arrivée
  var nh = h;
  var choixH = [];
  if (opt.type === 'monte') { for (var dh = 1; dh <= 3; dh++) if (h + dh <= 7 && hautMax >= h + dh + 0.45) choixH.push(h + dh); }
  else if (opt.type === 'descend') { for (var dh2 = 1; dh2 <= 3; dh2++) if (h - dh2 >= 0) choixH.push(h - dh2); }
  else if (opt.type === 'orbe' || opt.type === 'tampon') { for (var dh3 = -2; dh3 <= 3; dh3++) if (h + dh3 >= 0 && h + dh3 <= 7 && hautMax >= h + dh3 + 0.6) choixH.push(h + dh3); }
  else choixH.push(h);
  if (!choixH.length) return false;
  nh = R.choix(choixH);
  var fosse = opt.fosse || opt.type === 'orbe' || opt.type === 'tampon';
  var u = fosse ? Math.max(0, Math.min(h, nh) - R.ent(1, 3)) : Math.min(h, nh);
  if (fosse && Math.min(h, nh) === 0) u = 0;

  // index d'atterrissage sur nh (en descendant)
  var iL = -1;
  for (var a = apex; a < nT; a++) if (T.y[a] - hs <= nh + 0.001) { iL = a; break; }
  if (iL < 0) return false;
  var xDeco = s0.x;   // x au décollage
  var dxw = chaine ? 0 : VITESSES[s0.vit] * P.fenetre;   // décalage d'un appui trop tôt / trop tard
  var xa, xb;
  // fin de l'ancienne plateforme
  if (nh === h && u === h) { xa = xb = null; }
  else {
    xa = xDeco + hs + dxw + R.entre(0.15, fosse ? 0.9 : 1.6);
    if (orbePos || tampon) xa = xDeco + hs + (orbePos ? dxw : 0) + R.entre(0.1, 0.6);
    // début de la nouvelle plateforme
    if (nh > u) {
      var lo = null;
      for (var b = 0; b <= iL; b++) { if (T.y[b] - hs >= nh + 0.12) { if (lo === null) lo = T.x[b] + hs + 0.02; } else if (lo !== null && b < apex) lo = null; }
      var hi = T.x[iL] + hs - 0.3 - dxw;
      if (lo !== null) lo += dxw;
      if (lo === null || lo > hi) return false;
      lo = Math.max(lo, xa);
      if (lo > hi) return false;
      xb = lo + (hi - lo) * (0.35 + 0.65 * R());
    } else xb = xa;
  }

  var m = L.marque(), e = etatPlat(G);
  if (tampon) L.tampon(s0.x + hs - 0.1 + 0.02, h, 'jaune', 1);
  if (orbePos) L.orbe(orbePos.x, orbePos.y, 'jaune');
  if (xa !== null) {
    fermerSol(G, xa);
    if (xb > xa + 0.01 && u > 0.01) L.bloc(xa, 0, xb - xa, u, 1);
    ouvrirSol(G, xb, nh);
  }
  // piques sous l'arc
  var trajD = { x: T.x.slice(0, iL + 1), y: T.y.slice(0, iL + 1) };
  var surf = function (x) { if (xa === null) return h; if (x < xa) return h; if (x < xb) return u; return nh; };
  var debut = xDeco + 0.2, finx = T.x[iL];
  var pos = [];
  for (var xs = debut; xs + 1 <= finx - hs; xs += 0.5) {
    var y0 = surf(xs), y1 = surf(xs + 1 - 0.001);
    if (y0 !== y1) continue;
    if (piqueLibre(trajD, hz, xs, y0, 1, dxw)) pos.push(xs);
  }
  var poses = 0;
  if (fosse && xa !== null) {
    // remplir la fosse de piques
    var occ = -1e9;
    for (var q = 0; q < pos.length; q++) { var xq = pos[q]; if (xq >= xa - 0.01 && xq + 1 <= xb + 0.01 && xq >= occ) { L.pique(xq, u, 1); occ = xq + 1; poses++; } }
  }
  if (!fosse || xa === null) {
    // un groupe de piques au milieu de l'arc, sur la même surface
    // chercher la plus longue suite de positions espacées de 1 sur une même surface
    var meilleur = [];
    for (var st = 0; st < pos.length; st++) {
      var suite = [pos[st]], sy0 = surf(pos[st]);
      for (var nx = st + 1; nx < pos.length; nx++) {
        if (Math.abs(pos[nx] - suite[suite.length - 1] - 1) < 0.01 && surf(pos[nx]) === sy0) suite.push(pos[nx]);
      }
      if (suite.length > meilleur.length) meilleur = suite;
    }
    var nb = Math.min(meilleur.length, P.D >= 8 && R() < 0.5 ? 99 : R.ent(1, P.maxPiques));
    if (nb === 0 && xa === null && !orbePos && !tampon) { L.annuler(m); restaurerPlat(G, e); return false; }
    var off = P.D < 6 ? Math.floor((meilleur.length - nb) / 2) : R.ent(0, meilleur.length - nb);
    for (var z = 0; z < nb; z++) { L.pique(meilleur[off + z], surf(meilleur[off + z]), 1); poses++; }
  }
  // vérification réelle
  var nSim = iL + 1;
  var v = simuler(s0, nSim + 2, tenir, L, P.marge);
  var atterri = v.ok && v.s.sol && Math.abs(v.s.y - (nh + hs)) < 0.02;
  if (!atterri) {
    // laisser le moteur atterrir un peu plus tard (arrondis)
    v = simuler(s0, nSim + 30, tenir, L, P.marge, function (s, i) { return i > nSim - 3 && s.sol; });
    atterri = v.ok && v.s.sol && Math.abs(v.s.y - (nh + hs)) < 0.02;
    nSim = v.n;
  }
  if (!atterri) { L.annuler(m); restaurerPlat(G, e); return false; }
  // la même chose sans appuyer doit être mortelle (sinon le saut serait gratuit)
  if (!opt.libre) {
    var sans = simuler(s0, nSim + 40, function () { return false; }, L, 0);
    var fautSauter = !sans.ok || Math.abs(sans.s.y - (nh + hs)) > 0.05;
    if (tampon) fautSauter = true;
    if (!fautSauter) { L.annuler(m); restaurerPlat(G, e); return false; }
  }
  avancer(G, chaine ? v.n : v.n, tenir);
  if (orbePos && G.R() < 0.8) G.eclatsVoulus.push({ x: orbePos.x, y: orbePos.y + 0.0 });
  else if (G.R() < 0.4 && !chaine) G.eclatsVoulus.push({ x: T.x[apex], y: T.y[apex] });
  return true;
}

/* Gravité inversée : tampon bleu vers le plafond, course à l'envers, orbe bleu à toucher pour revenir */
function motifGravite(G) {
  var L = G.L, P = G.P, R = G.R, s0 = G.s;
  if (s0.mode !== 'cube' || !s0.sol || s0.g !== 1 || G.plaf) return false;
  var h = G.h, hs = PHYS.cube.hs, hz = PHYS.cube.hz + P.marge, v = VITESSES[s0.vit];
  var c = h + R.ent(3, 5);
  if (c > HAUT - 0.6) return false;
  var m = L.marque(), e = etatPlat(G);
  var echec = function () { L.annuler(m); restaurerPlat(G, e); return false; };
  L.tampon(s0.x + hs - 0.1 + 0.02, h, 'bleu', 1);
  var xc0 = s0.x + hs + 0.4;
  var plaf = L.bloc(xc0, c, 80, HAUT + 3 - c, 2);
  var rien = function () { return false; };
  var s1 = simuler(s0, 300, rien, L, P.marge, function (q, i) { return i > 3 && q.sol && q.g === -1; });
  if (!s1.ok || !s1.s.sol || s1.s.g !== -1) return echec();
  var pasAtt = G.step + s1.n, r = (G.slot - pasAtt % G.slot) % G.slot;
  var ko = s1.n + r + R.ent(2, 4) * G.slot;
  var s2 = simuler(s0, ko, rien, L, P.marge);
  if (!s2.ok) return echec();
  var ox = s2.x[ko - 1], oy = s2.y[ko - 1];
  L.orbe(ox, oy, 'bleu');
  var tenir = function (i) { return i >= ko && i < ko + 8; };
  var s3 = simuler(s0, ko + 400, tenir, L, P.marge, function (q, i) { return i > ko + 3 && q.sol && q.g === 1; });
  if (!s3.ok || !s3.s.sol || s3.s.g !== 1 || Math.abs(s3.s.y - (h + hs)) > 0.02) return echec();
  // fin du plafond, avec des piques pour qui ne touche pas l'orbe
  var dxw = v * P.fenetre;
  var xFin = ox + hs + dxw + R.entre(1.6, 2.6);
  plaf.w = xFin - xc0;
  var trajVol = { x: s3.x.slice(ko - 1), y: s3.y.slice(ko - 1) };
  for (var xs = ox + hs + dxw + 0.4; xs + 1 <= xFin + 0.01; xs += 1) if (piqueLibre(trajVol, hz, xs, c, -1, dxw)) L.pique(xs, c, -1);
  // piques au sol sous la course à l'envers et la chute
  var xLand = s3.x[s3.n - 1];
  for (var xf = xc0 + 1; xf + 1 <= xLand - hs - dxw - 0.3; xf += 1) if (piqueLibre({ x: s3.x, y: s3.y }, hz, xf, h, 1, dxw)) L.pique(xf, h, 1);
  var s4 = simuler(s0, s3.n + 2, tenir, L, P.marge, function (q, i) { return i > ko + 3 && q.sol && q.g === 1; });
  if (!s4.ok || !s4.s.sol || s4.s.g !== 1) return echec();
  var sans = simuler(s0, s4.n + 60, rien, L, 0);
  if (sans.ok && sans.s.g === -1) return echec();      // sans toucher l'orbe, on doit mourir
  avancer(G, s4.n, tenir);
  if (R() < 0.7) G.eclatsVoulus.push({ x: ox, y: oy });
  return true;
}

/* Arrivée en l'air dans une section au sol (cube ou boule) : on pose un sol et on attend l'atterrissage */
function atterrir(G) {
  var s = G.s, L = G.L;
  if (s.sol && s.g === 1) return;
  var hs = PHYS[s.mode].hs;
  var deja = simuler(s, 500, function () { return false; }, L, G.P.marge, function (q) { return q.sol && q.g === 1; });
  if (deja.ok && deja.s.sol && Math.abs(deja.s.y - PHYS[deja.s.mode].hs - G.h) < 0.02) { avancer(G, deja.n, function () { return false; }); return; }
  var h0 = clamp(Math.floor(s.y - hs - G.R.entre(0.5, 3)), 0, 5);
  fermerSol(G, s.x);
  ouvrirSol(G, s.x - 0.2, h0);
  var n = 0;
  var sim = simuler(s, 600, function () { return false; }, L, G.P.marge, function (q) { return q.sol && q.g === 1; });
  if (!sim.ok) { fermerSol(G, s.x); ouvrirSol(G, s.x, 0); sim = simuler(s, 600, function () { return false; }, L, G.P.marge, function (q) { return q.sol && q.g === 1; }); }
  n = sim.n;
  avancer(G, n, function () { return false; });
}

function sectionCube(G, finStep) {
  var P = G.P, R = G.R;
  atterrir(G);
  var avant = 0;
  var chaine = false;
  while (G.step < finStep - G.slot) {
    var reste = finStep - G.step;
    var ok = false;
    if (chaine || (reste > G.slot * 5 && R() < P.pSaut)) {
      var types = { simple: 3, monte: 2.2 * P.pMarche * 3, descend: 1.8 * P.pMarche * 3 };
      if (P.pFosse) types.fosse = P.pFosse * 5;
      if (P.pOrbe && !chaine) types.orbe = P.pOrbe * 10;
      if (P.pTampon && !chaine) types.tampon = P.pTampon * 10;
      if (P.pGravite && !chaine && reste > G.slot * 12) types.gravite = P.pGravite * 10;
      var essais = 0;
      while (!ok && essais < 6) {
        var t = R.pondere(types);
        if (t === 'gravite') { ok = motifGravite(G); if (ok) chaine = false; essais++; continue; }
        var opt = { type: t === 'fosse' ? R.choix(['simple', 'monte', 'descend']) : t, fosse: t === 'fosse' };
        if (G.h >= 6) opt.type = 'descend';
        var suivante = !chaine ? R() < P.pChaine : R() < P.pChaine * 0.7;
        opt.chaine = suivante && reste > G.slot * 8;
        ok = motifSaut(G, opt);
        if (ok) chaine = opt.chaine;
        essais++;
      }
      if (!ok) chaine = false;
      if (ok && !chaine) { var r = jusquAuCreneau(G); if (r) avancer(G, r, function () { return false; }); }
    }
    if (!ok) {
      chaine = false;
      var k = Math.min(R.ent(1, P.D < 4 ? 4 : 3), Math.max(1, Math.floor((finStep - G.step) / G.slot) - 1));
      motifCourse(G, k, R() < P.pPlafond);
    }
    if (++avant > 400) break;
  }
  var fin = finStep - G.step; if (fin > 0) avancer(G, fin, function () { return false; });
}

/* ---------- Boule ---------- */
function sectionBoule(G, finStep) {
  var L = G.L, P = G.P, R = G.R;
  var hs = PHYS.boule.hs, hz = PHYS.boule.hz + P.marge;
  // poser le sol si on arrive en l'air
  if (!G.s.sol) {
    var s = G.s;
    if (s.g === 1) atterrir(G);
  }
  var ecart = function () { return Math.round(R.entre(P.ecartBoule[0], P.ecartBoule[1]) * 2) / 2; };
  if (!G.plaf) {
    var c = Math.min(HAUT, G.h + ecart());
    if (c > HAUT - 1.2) c = HAUT;
    ouvrirPlafond(G, G.s.x + hs + 0.05, c);
  }
  var garde = 0;
  while (G.step < finStep - G.slot * 2 && garde++ < 200) {
    var s0 = G.s;
    if (!s0.sol) { var pose = simuler(s0, 300, function () { return false; }, L, P.marge, function (q) { return q.sol; }); if (pose.ok) { avancer(G, pose.n, function () { return false; }); continue; } }
    // vol libre si on bascule maintenant
    var vol = simuler(s0, 400, tenirTap(6), L, P.marge, function (q, i) { return i > 3 && q.sol; });
    if (!vol.ok) {
      // impossible de basculer ici : on roule un créneau
      avancer(G, G.slot, function () { return false; });
      continue;
    }
    var k = R.ent(1, P.D < 4 ? 4 : 3);
    k = Math.min(k, Math.floor((finStep - G.step) / G.slot) - 2);
    if (k < 1) break;
    var n = k * G.slot;
    // piques sur la surface opposée pendant la course (une bascule trop tôt tue)
    var m = L.marque(), e = etatPlat(G);
    var surCiel = s0.g === -1;
    var opp = surCiel ? G.h : G.c;
    var xDeb = s0.x + 1.0, v = VITESSES[s0.vit];
    var xFinCourse = s0.x + n * DT * v;
    var dureeVol = vol.n * DT * v;
    var xMax = Math.min(xFinCourse + dureeVol - hs - 1.2 - P.marge, xFinCourse + hs);
    if (R() < 0.85 && opp < HAUT - 0.01) {
      for (var xs = xDeb; xs + 1 <= xMax; xs += 1) L.pique(xs, opp, surCiel ? 1 : -1);
    }
    var simC = simuler(s0, n, function () { return false; }, L, P.marge);
    if (!simC.ok) { L.annuler(m); restaurerPlat(G, e); avancer(G, G.slot, function () { return false; }); continue; }
    avancer(G, n, function () { return false; });
    // bascule, avec changement de hauteur de la surface d'arrivée
    var s1 = G.s;
    var m2 = L.marque(), e2 = etatPlat(G);
    var versCiel = s1.g === 1;
    var change = R() < 0.55; G.bordBoule = null;
    if (change) {
      var cible = versCiel ? G.c : G.h;
      var nv = cible + R.choix([-1, -1, 1, 1, -2, 2]) * (versCiel ? 1 : 1);
      var autre = versCiel ? G.h : G.c;
      var gap = versCiel ? nv - autre : autre - nv;
      if (nv > 0 && nv < HAUT && gap >= P.ecartBoule[0] && gap <= P.ecartBoule[1] + 1) {
        // le bord doit être franchi avant l'arrivée : on le place juste après le départ
        var xe = s1.x + hs + R.entre(0.2, 0.8);
        if (versCiel) { fermerPlafond(G, xe); ouvrirPlafond(G, xe, nv); }
        else { fermerSol(G, xe); ouvrirSol(G, xe, nv); }
        G.bordBoule = xe;
      }
    }
    var finVol = function (q, i) { return i > 3 && q.sol && (!G.bordBoule || q.x - hs > G.bordBoule + 0.05); };
    var vf = simuler(s1, 400, tenirTap(6), L, P.marge, finVol);
    if (!vf.ok || !vf.s.sol) { L.annuler(m2); restaurerPlat(G, e2); G.bordBoule = null; vf = simuler(s1, 400, tenirTap(6), L, P.marge, finVol); }
    if (!vf.ok || !vf.s.sol) { avancer(G, G.slot, function () { return false; }); continue; }
    // piques sur la surface quittée : basculer trop tard devient mortel
    if (P.D >= 3 && G.step + vf.n + G.spb * 3 < finStep && R() < Math.min(0.85, 0.3 + 0.04 * P.D)) {
      var m3 = L.marque();
      var dxw2 = VITESSES[s1.vit] * P.fenetre, surfY = versCiel ? G.h : G.c, dirP = versCiel ? 1 : -1;
      var xd = s1.x + hs + dxw2, nbp = R.ent(2, 4), posees = 0;
      while (xd < s1.x + 5 && !piqueLibre(vf, hz, xd, surfY, dirP, dxw2)) xd += 0.25;
      if (surfY < HAUT - 0.01 && xd < s1.x + 5) for (var kp = 0; kp < nbp; kp++) { var xsp = xd + kp; if (piqueLibre(vf, hz, xsp, surfY, dirP, dxw2)) { L.pique(xsp, surfY, dirP); posees++; } else break; }
      // et sur la surface d'arrivée juste avant le point d'arrivée : basculer trop tôt devient mortel
      var cY = versCiel ? G.c : G.h, cDir = versCiel ? -1 : 1, xl = vf.x[vf.n - 1] - hs - dxw2 - 1.35, xmin = (G.bordBoule || s1.x) + 0.3;
      if (cY < HAUT - 0.01 && cY > -0.01) for (var kc = 0; kc < R.ent(1, 3) && xl - kc >= xmin; kc++) { var xsc = xl - kc; if (piqueLibre(vf, hz, xsc, cY, cDir, dxw2)) { L.pique(xsc, cY, cDir); posees++; } else break; }
      if (posees) { var vf2 = simuler(s1, 400, tenirTap(6), L, P.marge, finVol); if (!vf2.ok || !vf2.s.sol || vf2.n !== vf.n) L.annuler(m3); }
    }
    if (R() < 0.35) G.eclatsVoulus.push({ x: vf.x[vf.n >> 1], y: vf.y[vf.n >> 1] });
    avancer(G, vf.n, tenirTap(6));
    var r = jusquAuCreneau(G); if (r) avancer(G, r, function () { return false; });
  }
  var fin = finStep - G.step; if (fin > 0) avancer(G, fin, function () { return false; });
}

/* ---------- Couloirs : vaisseau, onde, ovni ---------- */
function sectionCouloir(G, finStep) {
  var L = G.L, P = G.P, R = G.R;
  var mode = G.s.mode;
  var s0 = copieEtat(G.s), step0 = G.step;
  var hsz = PHYS[mode].hz;
  var bas = 1.0 + (mode === 'onde' ? 0.6 : 0.4), haut = HAUT - bas;
  var cible = R.entre(bas + 1, haut - 1), compte = 0;
  var etat = null;
  var seq = [];
  var v = VITESSES[G.s.vit];
  // décider créneau par créneau en simulant (sans décor : le couloir est construit ensuite)
  var sim = copieEtat(G.s); sim.marge = 0;
  var dernier = null, duree = 0;
  while (G.step + seq.length * G.slot < finStep) {
    if (--compte <= 0) { cible = R.entre(bas, haut); compte = R.ent(1, Math.max(1, Math.round(5 - P.agite * 4))); }
    var y = sim.y, vy = sim.vy, t;
    if (mode === 'onde') {
      var dy = v * sim.pente * G.slot * DT;
      t = y < cible ? 1 : 0;
      if (y + dy > haut) t = 0; if (y - dy < bas) t = 1;
      if (dernier !== null && duree < 1 && t !== dernier && y + (dernier ? dy : -dy) < haut && y - (dernier ? 0 : dy) > bas && R() < 0.5) t = dernier;
    } else if (mode === 'vaisseau') {
      var pred = y + vy * 0.22;
      t = pred < cible ? 1 : 0;
      if (R() < 0.15 * P.agite) t = 1 - t;
      if (y > haut - 0.5 && vy > 0) t = 0; if (y < bas + 0.5 && vy < 0) t = 1;
    } else {
      var pred2 = y + vy * 0.15;
      t = pred2 < cible ? 1 : 0;
      if (y > haut - 1.2) t = 0; if (y < bas + 0.3) t = 1;
    }
    if (t === dernier) duree++; else { dernier = t; duree = 0; }
    seq.push(t);
    for (var i = 0; i < G.slot; i++) pas(sim, mode === 'ovni' ? (t && i < 8) : !!t, VIDE, false);
  }
  var total = finStep - G.step;
  avancer(G, total, function (i) { var k = Math.floor(i / G.slot); var t = seq[Math.min(k, seq.length - 1)]; return mode === 'ovni' ? (t && (i % G.slot) < 8) : !!t; });

  // trajectoire de la section
  var X = L.xs, Y = L.gy;
  var x0 = X[step0], x1 = X[finStep];
  var marge = P.margeMur[mode];
  if (mode === 'onde') marge = Math.max(marge, 2.0 * VITESSES[G.s.vit] * G.s.pente * P.fenetre);
  else if (mode === 'vaisseau') marge = Math.max(marge, 0.9 * PHYS.vaisseau.vmax * P.fenetre * 4);
  var r = mode === 'onde' ? 0.3 : (mode === 'vaisseau' ? R.entre(1.0, 2.2) : R.entre(0.9, 1.8));
  var dx = 0.25, nb = Math.max(2, Math.ceil((x1 - x0) / dx) + 1);
  var f = new Array(nb), c = new Array(nb);
  for (var q = 0; q < nb; q++) { f[q] = 1e9; c[q] = -1e9; }
  var hzG = hsz + P.marge;
  for (var st = step0; st <= finStep; st++) {
    var xx = X[st], yy = Y[st];
    var qa = Math.max(0, Math.ceil((xx - r - x0) / dx)), qb = Math.min(nb - 1, Math.floor((xx + r + hsz - x0) / dx));
    var qa2 = Math.max(0, Math.ceil((xx - r - hsz - x0) / dx));
    for (var q2 = Math.min(qa, qa2); q2 <= qb; q2++) {
      if (yy - hzG < f[q2]) f[q2] = yy - hzG;
      if (yy + hzG > c[q2]) c[q2] = yy + hzG;
    }
  }
  var ondule = mode === 'onde' ? 0 : 0.5;
  for (var q3 = 0; q3 < nb; q3++) {
    if (f[q3] > 1e8) { f[q3] = 0; c[q3] = HAUT; continue; }
    var ff = f[q3] - (marge - P.marge), cc = c[q3] + (marge - P.marge);
    if (ondule) { ff = Math.floor(ff / ondule) * ondule; cc = Math.ceil(cc / ondule) * ondule; }
    f[q3] = ff <= 0.05 ? 0 : ff;
    c[q3] = cc >= HAUT - 0.05 ? HAUT : cc;
  }
  // adoucir l'entrée : pas de mur dans la première unité (le joueur arrive d'ailleurs)
  for (var q4 = 0; q4 < nb && q4 * dx < 0.75; q4++) { f[q4] = 0; c[q4] = HAUT; }
  for (var q5 = nb - 1; q5 >= 0 && (nb - 1 - q5) * dx < 1.0; q5--) { f[q5] = 0; c[q5] = HAUT; }
  L.mur(x0, dx, f, c, mode === 'onde' ? 1 : 0);

  // obstacles intérieurs (scies) dans les grands espaces
  if (P.pObstacle > 0) {
    for (var xo = x0 + 3; xo < x1 - 2; xo += R.entre(1.6, 3.2)) {
      if (R() > P.pObstacle) continue;
      var qi = Math.round((xo - x0) / dx);
      var fy = f[qi], cy = c[qi];
      var rad = R.entre(0.45, 0.95);
      for (var essai = 0; essai < 4; essai++) {
        var yo = R.entre(fy + rad * 0.5, cy - rad * 0.5);
        if (scieLibre(G, step0, finStep, xo, yo, rad, hsz)) { L.scie(xo, yo, rad); break; }
      }
    }
  }
  // éclats sur la trajectoire
  var chaque = G.spb * 2;
  for (var se = step0 + G.spb; se < finStep - 10; se += chaque) G.eclatsVoulus.push({ x: X[se], y: Y[se] });
}
function scieLibre(G, s0, s1, x, y, r, hz) {
  var X = G.L.xs, Y = G.L.gy, lim = r * 0.82 + G.P.marge + 0.08;
  for (var s = s0; s <= s1; s++) {
    if (Math.abs(X[s] - x) > r + 2) continue;
    var dx = Math.max(Math.abs(X[s] - x) - hz, 0), dy = Math.max(Math.abs(Y[s] - y) - hz, 0);
    if (dx * dx + dy * dy < lim * lim) return false;
  }
  return true;
}

/* ---------- Construction d'un niveau ---------- */
function creerGenerateur(opts) {
  var R = rngGraine(opts.graine);
  var L = new Niveau();
  L.graine = opts.graine; L.D = opts.D;
  var P = paramsD(opts.D, R);
  L.spb = P.spb; L.bpm = Math.round(14400 / P.spb * 10) / 10; L.sub = P.sub; L.slot = P.spb / P.sub;
  L.mode0 = 'cube'; L.vit0 = opts.vitesse != null ? opts.vitesse : (P.D < 2.5 ? 1 : choisirVitesse(R, P.D)); L.pente0 = 1;
  L.xs = [0]; L.gy = [PHYS.cube.hs]; L.gmode = [0]; L.gsol = [1];
  var G = { L: L, R: R, P: P, step: 0, h: 0, plat: null, plaf: null, c: HAUT, slot: L.slot, spb: L.spb, eclatsVoulus: [], recents: [], nSec: 0, opts: opts };
  G.s = nouvelEtat(L); G.s.marge = P.marge;
  // intro : une mesure tranquille
  var intro = opts.intro != null ? opts.intro : 4;
  avancer(G, L.spb * intro, function () { return false; });
  L.sections.push({ s0: 0, s1: G.step, x0: 0, x1: L.xs[G.step], mode: 'cube', vit: L.vit0, intro: true, n: 0 });
  return G;
}

function choisirMode(G) {
  var R = G.R, P = G.P;
  if (G.opts.modes) return R.choix(G.opts.modes);
  var poids = {}; for (var k in P.modes) poids[k] = P.modes[k];
  var r = G.recents;
  if (r.length) poids[r[r.length - 1]] *= 0.25;
  if (r.length > 1 && r[r.length - 1] === r[r.length - 2]) poids[r[r.length - 1]] = 0.01;
  return R.pondere(poids);
}

function ajouterSection(G, mesures, modeForce) {
  var L = G.L, R = G.R, P = G.P;
  var mode = modeForce || choisirMode(G);
  var s0 = G.step, x0 = G.s.x;
  var vit = G.opts.vitesseFixe != null ? G.opts.vitesseFixe : (G.nSec === 0 ? L.vit0 : (R() < 0.35 + P.D * 0.02 ? choisirVitesse(R, P.D) : G.s.vit));
  // portails
  var change = mode !== G.s.mode;
  var surSol = G.s.sol, gAvant = G.s.g;
  var pente = 1;
  if (mode === 'onde' && R() < P.pMini) pente = 2;
  if (change || (mode === 'onde' && pente !== G.s.pente)) {
    var po = L.portail(x0 + 0.001, 'mode', mode); po.pente = pente;
    if (mode !== 'cube' && mode !== 'boule') { fermerSol(G, x0 + 0.05); G.h = 0; }
    if (mode !== 'boule') fermerPlafond(G, x0 + 0.05);
  }
  if (vit !== G.s.vit) L.portail(x0 + 0.002, 'vit', vit);
  var finStep = G.step + mesures * 4 * G.spb;
  avancer(G, 1, function () { return false; });   // franchir les portails
  if (change) {
    // pas de nouvel appui juste après un portail (l'onde garde une direction sûre)
    var monte = mode === 'onde' && (surSol ? gAvant === 1 : G.s.y < HAUT / 2);
    var nLead = Math.round(G.spb / 2) + jusquAuCreneau(G);
    avancer(G, nLead, function () { return monte; });
  }
  var mesure = { s0: s0, x0: x0, mode: mode, vit: vit, n: ++G.nSec, pente: pente };
  if (mode === 'cube') sectionCube(G, finStep);
  else if (mode === 'boule') sectionBoule(G, finStep);
  else sectionCouloir(G, finStep);
  mesure.s1 = G.step; mesure.x1 = G.s.x;
  L.sections.push(mesure);
  G.recents.push(mode); if (G.recents.length > 4) G.recents.shift();
  poserEclats(G, s0);
  return mesure;
}

function poserEclats(G, s0) {
  var L = G.L;
  var liste = G.eclatsVoulus; G.eclatsVoulus = [];
  var dernier = -1e9;
  for (var i = 0; i < liste.length; i++) {
    var e = liste[i];
    if (e.x - dernier < 3) continue;
    // pas trop près d'un danger
    var ok = true;
    Grille.tour++;
    L.g.pres(e.x - 1, e.x + 1, function (o) {
      if (o.k === 'p' && Math.abs(o.x + 0.5 - e.x) < 0.7 && Math.abs((o.dir === 1 ? o.y + 0.3 : o.y - 0.3) - e.y) < 0.7) { ok = false; return true; }
      if (o.k === 'o' && Math.abs(o.x - e.x) < 0.9 && Math.abs(o.y - e.y) < 0.9) { ok = false; return true; }
    });
    if (!ok) continue;
    L.eclat(e.x, e.y); dernier = e.x;
  }
}

function terminerNiveau(G, mesuresFin) {
  var L = G.L;
  // fin : mode cube au sol, espace dégagé
  var x0 = G.s.x;
  if (G.s.mode !== 'cube') { L.portail(x0 + 0.001, 'mode', 'cube'); fermerPlafond(G, x0 + 0.3); if (!G.s.sol) { fermerSol(G, x0 + 0.6); G.h = 0; } }
  var fin = G.step + (mesuresFin || 1) * 4 * G.spb;
  avancer(G, 2, function () { return false; });
  atterrir(G);
  if (G.step < fin) avancer(G, fin - G.step, function () { return false; });
  fermerSol(G, G.s.x + 30);
  L.fin = L.xs[fin - Math.round(G.spb * 2)];
  L.nPas = fin;
  L.sections.push({ s0: L.sections[L.sections.length - 1].s1, s1: fin, x0: x0, x1: G.s.x, mode: 'cube', vit: G.s.vit, outro: true, n: ++G.nSec });
}

/* Niveau complet (Parcours, défis) */
function genNiveau(opts) {
  var G = creerGenerateur(opts);
  var L = G.L, P = G.P, R = G.R;
  var cibleTemps = opts.temps || (opts.grand ? 95 : 62);    // secondes visées
  var spbS = G.spb * DT;
  var cibleTemps0 = cibleTemps / spbS;                        // en temps (beats)
  while ((G.step / G.spb) < cibleTemps0 - 6) {
    var mes = P.mesures();
    ajouterSection(G, mes, G.nSec === 0 && P.D < 3 ? 'cube' : null);
  }
  terminerNiveau(G, 1);
  L.duree = L.nPas * DT;
  L.espece = opts.espece || 'oeil';
  if (typeof genAttaquesNiveau === 'function' && !opts.sansBoss) genAttaquesNiveau(G, 0, L.nPas);
  fusionBlocs(L);
  return L;
}

/* rassemble les blocs voisins identiques (affichage plus propre) */
function fusionBlocs(L) {
  var parY = {};
  L.blocs.forEach(function (b) { if (b.w < 0.04) b.mort = true; });
  L.blocs = L.blocs.filter(function (b) { return !b.mort; });
}
