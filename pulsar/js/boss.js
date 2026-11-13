'use strict';
/* PULSAR — boss : espèces, attaques en rythme (annoncées, toutes esquivables : vérifiées contre le fantôme). */

var BOSS_DX = 10.8;   // le boss flotte à cette distance devant le joueur
var BOSS_Y = 5.2;

function xAuTemps(L, t) { var i = Math.round(t / DT); if (i < 0) i = 0; if (i >= L.xs.length) i = L.xs.length - 1; return L.xs[i]; }
function bossPos(L, t) { return { x: xAuTemps(L, t) + BOSS_DX, y: BOSS_Y + Math.sin(t * 1.3) * 1.2 }; }

/* distance point-boîte (joueur : boîte carrée de demi-côté hz) */
function distBoite(px, py, hz, x, y) { var dx = Math.max(Math.abs(x - px) - hz, 0), dy = Math.max(Math.abs(y - py) - hz, 0); return Math.sqrt(dx * dx + dy * dy); }

var ATTAQUES = {
  laser: {
    nom: 'Laser',
    touche: function (a, t, x, y, hz) { return Math.abs(y - a.y) < a.e + hz; }
  },
  porte: {
    nom: 'Porte',
    touche: function (a, t, x, y, hz) { return Math.abs(x - a.x) < 0.22 + hz && (y - hz < a.g0 || y + hz > a.g1); }
  },
  balle: {
    nom: 'Salve',
    pos: function (a, t) { var d = t - a.ts; return { x: a.x0 + a.vx * d, y: a.y0 + a.vy * d }; },
    touche: function (a, t, x, y, hz) { if (t < a.ts) return false; var p = ATTAQUES.balle.pos(a, t); return distBoite(x, y, hz, p.x, p.y) < a.r; }
  },
  pluie: {
    nom: 'Pluie',
    pos: function (a, t) { return { x: a.x, y: HAUT + 1 - a.v * (t - a.ts) }; },
    touche: function (a, t, x, y, hz) { if (t < a.ts) return false; var p = ATTAQUES.pluie.pos(a, t); if (p.y < -1) return false; return distBoite(x, y, hz, p.x, p.y) < a.r; }
  },
  anneau: {
    nom: 'Onde de choc',
    touche: function (a, t, x, y, hz) {
      if (t < a.ts) return false;
      var R = a.v * (t - a.ts), d = Math.hypot(x - a.cx, y - a.cy);
      if (Math.abs(d - R) > a.w + hz) return false;
      var ang = Math.atan2(y - a.cy, x - a.cx), da = Math.abs(((ang - a.ga) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
      var marge = (hz * 0.7) / Math.max(R, 0.5);
      return da > a.gl - marge;
    }
  },
  faisceau: {
    nom: 'Faisceau',
    angle: function (a, t) { return a.a0 + a.w * (t - a.ta); },
    touche: function (a, t, x, y, hz, L) {
      var c = bossPos(L, t), ang = ATTAQUES.faisceau.angle(a, t);
      var ux = Math.cos(ang), uy = Math.sin(ang), dx = x - c.x, dy = y - c.y;
      var proj = dx * ux + dy * uy; if (proj < 0) return false;
      return Math.abs(dx * uy - dy * ux) < a.e + hz * 1.2;
    }
  },
  mine: {
    nom: 'Mine',
    touche: function (a, t, x, y, hz) {
      var d = distBoite(x, y, hz, a.x, a.y);
      if (t < a.te) return d < 0.32;
      return d < a.re;
    }
  },
  pilon: {
    nom: 'Pilon',
    touche: function (a, t, x, y, hz) {
      if (Math.abs(x - a.x) > a.l + hz) return false;
      return a.haut ? (y + hz > a.yb) : (y - hz < a.yb);
    }
  }
};

/* vérifie une attaque contre la trajectoire du fantôme */
function attaqueSure(L, a, marge) {
  var s0 = Math.max(0, Math.floor(a.ta / DT)), s1 = Math.min(L.xs.length - 1, Math.ceil(a.tb / DT));
  var T = ATTAQUES[a.type];
  for (var s = s0; s <= s1; s += 1) {
    var hz = PHYS[MODES[L.gmode[s]]].hz + marge;
    if (T.touche(a, s * DT, L.xs[s], L.gy[s], hz, L)) return false;
  }
  return true;
}

/* ---------- Espèces ---------- */
var ESPECES = {
  oeil: { nom: "L'Œil", c1: '#ff4d6d', c2: '#ffd23f', att: { laser: 3, faisceau: 2, porte: 1.5, balle: 1 } },
  meduse: { nom: 'La Méduse', c1: '#5ad0ff', c2: '#c06bff', att: { pluie: 3, balle: 2, anneau: 1.5, laser: 0.5 } },
  prisme: { nom: 'Le Prisme', c1: '#7cffea', c2: '#ff6fd8', att: { porte: 3, laser: 2, faisceau: 1.5 } },
  crane: { nom: 'Le Crâne', c1: '#f2f2e0', c2: '#ff5a3d', att: { balle: 3, pilon: 2, mine: 1.5 } },
  horloge: { nom: "L'Horloge", c1: '#ffcf5a', c2: '#5affb0', att: { anneau: 3, faisceau: 2, laser: 1.5 } },
  serpent: { nom: 'Le Serpent', c1: '#7dff5a', c2: '#ffe45a', att: { balle: 2.5, pluie: 2, porte: 1.5, mine: 1 } },
  forge: { nom: 'La Forge', c1: '#ff8a3d', c2: '#ffdd88', att: { pilon: 3, mine: 2, laser: 1.5 } },
  neant: { nom: 'Le Néant', c1: '#b48cff', c2: '#ffffff', att: { laser: 1, porte: 1, balle: 1, pluie: 1, anneau: 1, faisceau: 1, mine: 1, pilon: 1 } }
};
var ORDRE_ESPECES = ['oeil', 'meduse', 'crane', 'prisme', 'serpent', 'horloge', 'forge', 'neant'];
var EPITHETES = ['du Néon', 'des Abysses', 'du Vide', "de l'Aube", 'du Dernier Battement', 'aux Mille Éclats', 'de Cristal', 'de la Fin', 'des Échos', 'du Tonnerre',
  'des Cendres', 'du Silence', 'de la Rupture', 'du Pouls', 'des Marées', 'de Minuit', 'du Gouffre', "de l'Orage", 'des Étoiles', 'du Chaos', 'de Verre', 'du Métronome'];

function especePour(n, R) {
  // le Parcours présente les espèces dans l'ordre, puis au hasard
  if (n <= 7) return ORDRE_ESPECES[(n - 1) % 7];
  if (n % 10 === 0) return n >= 30 ? 'neant' : ORDRE_ESPECES[(n / 10) % 7];
  var liste = ORDRE_ESPECES.slice(0, n >= 25 ? 8 : 7);
  return liste[Math.floor(R() * liste.length)];
}
function nomBoss(espece, graine) {
  var R = rngGraine(graine ^ 0x9e3779b9);
  return ESPECES[espece].nom + ' ' + EPITHETES[Math.floor(R() * EPITHETES.length)];
}

/* ---------- Génération des attaques ---------- */
function phaseAuPas(L, step) {
  if (L.phaseFixe != null) return L.phaseFixe;
  if (L.infini) return 1;
  var f = step / L.nPas;
  return f < 0.34 ? 0 : f < 0.67 ? 1 : 2;
}

function genAttaquesNiveau(G, s0, s1) {
  var L = G.L, P = G.P, R = rngGraine((L.graine ^ 0x51ed27) + s0);
  var esp = ESPECES[L.espece || 'oeil'];
  var beat = G.spb * DT;
  var marge = P.margeBoss;
  var tel = Math.max(0.42, 1.0 - 0.025 * P.D);           // durée d'annonce en secondes
  var telB = Math.max(1, Math.round(tel / beat * 2) / 2);  // en temps (demi-temps)
  var maxSim = Math.min(3, 1 + Math.floor(P.D / 7));
  var debut = Math.max(s0, G.spb * 6), fin = L.infini ? s1 - G.spb : Math.min(s1, (L.nPas || s1) - G.spb * 6);
  var actifs = [];
  var dernier = -99;
  var bDeb = Math.ceil(debut / G.spb), bFin = Math.floor(fin / G.spb);
  for (var b = bDeb; b < bFin; b++) {
    var step = b * G.spb, t = step * DT;
    var ph = phaseAuPas(L, step);
    var dens = P.boss * [0.32, 0.5, 0.72][ph];
    if (b - dernier < (ph === 2 ? 1 : 2)) continue;
    actifs = actifs.filter(function (a) { return a.tb > t; });
    if (actifs.length >= maxSim) continue;
    if (R() > dens) continue;
    var type = R.pondere(esp.att);
    var n = 1;
    if (ph >= 1 && R() < 0.25 + P.D * 0.01) n = ph === 2 ? 3 : 2;   // rafales
    var poses = 0;
    for (var k = 0; k < n; k++) {
      var tk = t + k * beat * (type === 'balle' ? 0.5 : 1);
      var a = creerAttaque(type, L, R, tk, beat, telB, P, ph, marge, s1);
      if (a) { L.attaques.push(a); actifs.push(a); poses++; }
    }
    if (poses) dernier = b;
  }
  L.attaques.sort(function (a, b) { return a.t0 - b.t0; });
}

function creerAttaque(type, L, R, t, beat, telB, P, ph, marge, s1) {
  var tMax = (s1 - 2) * DT;
  for (var essai = 0; essai < 10; essai++) {
    var a = { type: type, ph: ph };
    if (type === 'laser') {
      a.t0 = t; a.ta = t + telB * beat; a.tb = a.ta + Math.max(0.22, beat * (P.D < 8 ? 0.5 : 0.75));
      a.e = R.entre(0.35, 0.6 + 0.3 * ph); a.y = R.entre(0.6, HAUT - 0.6);
    } else if (type === 'porte') {
      var tg = t + (telB + 1) * beat;
      var sg = Math.round(tg / DT); if (sg >= L.xs.length) return null;
      a.x = L.xs[sg]; a.t0 = t; a.ta = t; a.tb = tg + 0.4;
      // trou autour du fantôme au moment du passage
      var lo = 1e9, hi = -1e9;
      for (var s = sg - 40; s <= sg + 40; s++) { if (s < 0 || s >= L.xs.length) continue; if (Math.abs(L.xs[s] - a.x) < 0.9) { lo = Math.min(lo, L.gy[s]); hi = Math.max(hi, L.gy[s]); } }
      var hzz = 0.45 + marge + 0.25;
      var taille = (hi - lo) + 2 * hzz + R.entre(0.2, Math.max(0.3, 1.8 - P.D * 0.05));
      var dec = R.entre(-(taille - (hi - lo) - 2 * hzz) / 2, (taille - (hi - lo) - 2 * hzz) / 2);
      var mil = (lo + hi) / 2 + dec;
      a.g0 = mil - taille / 2; a.g1 = mil + taille / 2;
    } else if (type === 'balle') {
      var bp = bossPos(L, t + telB * 0.5 * beat);
      a.t0 = t; a.ts = t + Math.max(0.3, telB * 0.5 * beat); a.ta = a.ts; a.tb = a.ts + 2.6;
      a.x0 = bp.x - 1.5; a.y0 = bp.y + R.entre(-1.2, 1.2);
      var vit = R.entre(7, 10 + P.D * 0.15);
      var cy = R.entre(0.5, HAUT - 0.5), cx = a.x0 - 14;
      var d = Math.hypot(cx - a.x0, cy - a.y0);
      a.vx = (cx - a.x0) / d * vit; a.vy = (cy - a.y0) / d * vit; a.r = R.entre(0.35, 0.6);
    } else if (type === 'pluie') {
      a.t0 = t; a.ts = t + telB * beat; a.v = R.entre(13, 18);
      var sm = Math.round((a.ts + 0.45) / DT); if (sm >= L.xs.length) return null;
      a.x = L.xs[sm] + R.entre(-2, 7); a.r = R.entre(0.45, 0.7); a.ta = a.ts; a.tb = a.ts + (HAUT + 3) / a.v;
    } else if (type === 'anneau') {
      var c = bossPos(L, t + telB * beat);
      a.t0 = t; a.ts = t + telB * beat; a.ta = a.ts; a.tb = a.ts + 1.8; a.cx = c.x; a.cy = c.y;
      a.v = R.entre(7, 10); a.w = 0.25;
      // trouver la rencontre avec le fantôme pour y placer l'ouverture
      var meet = -1, best = 1e9;
      for (var s2 = Math.round(a.ts / DT); s2 < Math.min(L.xs.length, Math.round(a.tb / DT)); s2++) {
        var R2 = a.v * (s2 * DT - a.ts), dd = Math.hypot(L.xs[s2] - a.cx, L.gy[s2] - a.cy);
        if (Math.abs(dd - R2) < best) { best = Math.abs(dd - R2); meet = s2; }
      }
      if (meet < 0) return null;
      a.ga = Math.atan2(L.gy[meet] - a.cy, L.xs[meet] - a.cx) + R.entre(-0.08, 0.08);
      var Rm = a.v * (meet * DT - a.ts);
      a.gl = Math.min(0.9, (1.4 + Math.max(0, 2.2 - P.D * 0.06)) / Math.max(Rm, 1));
    } else if (type === 'faisceau') {
      a.t0 = t; a.ta = t + telB * beat; a.tb = a.ta + R.entre(0.5, 1.0);
      a.a0 = Math.PI + R.entre(-0.7, 0.7); a.w = (R() < 0.5 ? -1 : 1) * R.entre(0.25, 0.6 + ph * 0.15); a.e = 0.28;
    } else if (type === 'mine') {
      a.te = t + (telB + 1) * beat; a.t0 = t; a.ta = t; a.tb = a.te + 0.18;
      var sm2 = Math.round(a.te / DT); if (sm2 >= L.xs.length) return null;
      a.x = L.xs[sm2] + R.entre(-1.5, 3.5); a.y = R.entre(0.8, HAUT - 0.8); a.re = R.entre(1.0, 1.7 + ph * 0.3);
    } else if (type === 'pilon') {
      a.t0 = t; a.ta = t + telB * beat; a.tb = a.ta + 0.3;
      var sp = Math.round(a.ta / DT); if (sp >= L.xs.length) return null;
      a.x = L.xs[sp] + R.entre(-0.8, 2.5); a.l = R.entre(0.5, 0.9); a.haut = R() < 0.5;
      a.yb = a.haut ? R.entre(2.5, 7) : R.entre(2, 6.5);
    }
    if (a.tb > tMax) return null;
    if (attaqueSure(L, a, marge)) return a;
  }
  return null;
}
