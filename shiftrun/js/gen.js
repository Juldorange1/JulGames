/* Phase — générateur de salles. Un niveau est une suite de salles creusées dans la roche, toutes reliées par le
   même couloir (rangées 14 à 19, sol plein à la rangée 20). Chaque salle a une difficulté d (0 = facile, 1 = dur).
   Sert aux 24 niveaux (graine fixe, difficulté constante dans un niveau) et aux modes Infini (sans fin, de plus en
   plus dur). Chaque type de salle est vérifié par le robot (outils/test-salles.js). */
(function (racine) {
'use strict';
const S = 0, L = 1, Z = 2, P = 3, PL = 4, CA = 5, ME = 6, OM = 7, GL = 8, MA = 9;
const VARIABLES = [Z, P, PL, CA, ME, OM];      // états « spéciaux »
const TOUS_ETATS = [S, L, Z, P, PL, CA, ME, OM, GL, MA];
const STABLES = [S, L, PL, CA, ME, GL, MA];             // états qui peuvent servir d'état de base (on y revient après gaz, plasma, ombre)
const CAR_BARRIERE = { [S]: 'a', [L]: '=', [Z]: '~', [P]: 'r', [PL]: 'l', [CA]: 'n', [ME]: 'm', [OM]: '%', [GL]: 'j', [MA]: 'v' };
const HAUT = 40;                 // assez haut pour des gouffres et des tours (le couloir reste aux rangées 14 à 19)

function hasard(graine) {           // mulberry32
  let a = graine >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ent = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
const borne = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- Grille qui s'allonge vers la droite ---------- */
const DESC = 20;                 // les niveaux de campagne ont 20 rangées de plus : le couloir peut descendre et remonter
const PALIER = 10;               // une salle de transition fait monter ou descendre le couloir de 10 rangées
function Grille(h) {
  this.h = h || HAUT;
  this.l = [];
  for (let y = 0; y < this.h; y++) this.l.push([]);
  this.w = 0;
}
Grille.prototype.elargir = function (w2) {
  while (this.w < w2) { for (let y = 0; y < this.h; y++) this.l[y].push('#'); this.w++; }
};
Grille.prototype.met = function (x, y, c) {
  if (y <= 0 || y >= this.h - 1 || x < 0) return;
  if (x >= this.w) this.elargir(x + 1);
  if (x === 0 && c !== '#') return;
  this.l[y][x] = c;
};
Grille.prototype.carte = function () { return this.l.map(r => r.join('')); };

// un drapeau ne sert que si l'on peut mourir avant le suivant : sinon on l'enlève
const MORTEL = new Set(['^', 'f', 'L', 'F', 'E', 'Y', 'S', 'I', 'Z', 'z', 'C', 'K', 't', '_']);
function elaguerDrapeaux(l, sens) {            // l : tableau de rangées (tableaux de caractères) ; sens : 'haut', 'bas' ou rien (vers la droite)
  const H = l.length, W = l[0].length, fl = [];
  let but = null;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (l[y][x] === '!') fl.push([x, y]); if (l[y][x] === 'G') but = [x, y]; }
  const cle = sens === 'haut' ? (p) => -p[1] : sens === 'bas' ? (p) => p[1] : (p) => p[0];
  fl.sort((a, b) => cle(a) - cle(b));
  for (let i = 0; i < fl.length; i++) {
    const a = fl[i], b = fl[i + 1] || but || (sens ? [a[0], sens === 'haut' ? 0 : H - 1] : [W - 1, a[1]]);
    let danger = false;
    if (sens) { const y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]); for (let y = y0; y <= y1 && !danger; y++) for (let x = 0; x < W; x++) if (MORTEL.has(l[y][x])) { danger = true; break; } }
    else { const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]); for (let x = x0; x <= x1 && !danger; x++) for (let y = 0; y < H; y++) if (MORTEL.has(l[y][x])) { danger = true; break; } }
    if (!danger) l[a[1]][a[0]] = '.';
  }
}
// outils relatifs au début d'une salle
function salle(g, x0, dy) {
  dy = dy || 0;                                          // décalage vertical du couloir (niveaux qui montent et descendent)
  const api = {
    r(xa, ya, xb, yb, c = '#') { for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) g.met(x0 + x, y + dy, c); },
    c(xa, ya, xb, yb) { api.r(xa, ya, xb, yb, '.'); },
    p(x, y, c) { g.met(x0 + x, y + dy, c); },
    n(x, y, k, c) { for (let i = 0; i < k; i++) g.met(x0 + x + i, y + dy, c); },
    col(x, ya, yb, c) { for (let y = ya; y <= yb; y++) g.met(x0 + x, y + dy, c); },
    couloir(xa, xb, haut = 14) { api.c(xa, haut, xb, 19); },
    sol(xa, xb, c) { api.r(xa, 20, xb, 20, c); }
  };
  return api;
}

/* ---------- Les salles ---------- */
// salle à barrière : mur épais, double mur au-dessus d'une fosse, ou mur posé sur une marche
function porte(etat) {
  const ch = CAR_BARRIERE[etat];
  return { phases: [S], req: [etat], f(s, rng, d) {
    const forme = Math.floor(rng() * 3);
    s.couloir(0, 3);
    let x = 4;
    if (forme === 0) { s.couloir(x, x + 2); s.r(x, 14, x + 1 + (d > 0.6 ? 1 : 0), 19, ch); x += 3; }
    else if (forme === 1) {
      s.couloir(x, x + 1); s.r(x, 14, x + 1, 19, ch); x += 2;
      s.couloir(x, x + 2); x += 3;
      const gw = 1 + Math.round(d * 1.5); s.c(x, 14, x + gw - 1, 23); s.n(x, 23, gw, '^'); x += gw;
      s.couloir(x, x + 2); s.r(x + 1, 14, x + 2, 19, ch); x += 3;
    } else { s.couloir(x, x + 6); s.r(x, 19, x + 6, 19); s.r(x + 3, 14, x + 4, 18, ch); x += 7; }
    s.couloir(x, x + 2);
    return x + 3;
  } };
}
// chaque salle : (s, rng, d, ctx) -> largeur ; ctx.glace pour les variantes de glace
// détour : montée par des plateformes fines, galerie en hauteur (rangées 4 à 10) avec un défi, l'éclat, puis un trou
// qui retombe dans le couloir. La variante 6 passe sous le sol, dans un tunnel noyé.
function detour(v) {
  return { phases: [S], f(s, rng) {
    const L = 30 + ent(rng, 0, 6), a = 3, b = L - 5, mid = Math.floor((a + b) / 2);
    s.couloir(0, L);
    if (v === 6) {                                   // tunnel noyé sous le couloir, avec des courants
      s.c(a, 21, b + 1, 26); s.r(a, 21, b + 1, 26, 'w');
      s.n(a, 20, 2, '-'); s.n(b, 20, 2, '-');          // entrée et sortie : plateformes fines (bas pour plonger)
      let i = 0;
      for (let x = a + 5; x < b - 2; x += 6, i++) { s.r(x, 21, x, 23); s.r(x - 3, 25, x + 2, 26, i % 2 ? 'u' : 'y'); s.p(x + 2, 26, '^'); }
      s.p(mid, 24, 'e');
      return L + 1;
    }
    s.c(a, 4, a + 1, 13); s.c(a + 2, 4, b + 1, 10);  // le puits de montée et la galerie
    s.n(a + 2, 17, 2, '-'); s.n(a, 14, 2, '-');       // marches fines (on les traverse par-dessous)
    s.c(b, 11, b + 1, 13);                            // trou de retour vers le couloir
    const x0 = a + 5, x1 = b - 2;
    if (v === 0) { for (let x = x0; x < x1; x += 4) s.n(x, 10, 2, '^'); s.p(mid, 6, 'e'); }
    else if (v === 1) {                                // fosse à pics traversée sur des plateformes mobiles
      s.c(x0, 11, x1, 11); s.n(x0, 12, x1 - x0 + 1, '^');
      for (let x = x0 + 7; x < x1; x += 8) s.r(x, 9, x, 11);
      for (let x = x0; x < x1 - 2; x += 8) s.p(x, 9, 'M');
      s.p(mid, 6, 'e');
    }
    else if (v === 2) { for (let x = x0; x < x1; x += 4) s.p(x, 3, 'L'); s.p(mid + 2, 9, 'e'); }
    else if (v === 3) { for (let x = x0; x < x1; x += 4) s.p(x, 4, 'K'); s.p(mid + 2, 10, 'e'); }
    else if (v === 4) { for (let x = x0 + 2; x < x1; x += 7) s.p(x, 7, 'C'); s.p(mid, 9, 'e'); }
    else if (v === 5) { for (let x = x0; x < x1; x += 3) s.p(x, (x / 3) % 2 ? 11 : 3, 't'); s.p(mid, 7, 'e'); }
    else {                                             // ennemis qui patrouillent et tombent du plafond
      for (let x = x0; x < x1; x += 7) { s.p(x, 10, '#'); s.p(x + 3, 10, 'E'); }
      for (let x = x0 + 5; x < x1; x += 9) s.p(x, 4, 'Y');
      s.p(mid, 6, 'e');
    }
    return L + 1;
  } };
}
const SALLES = {
  // Trous à pics à sauter
  trous: { phases: [S], f(s, rng, d) {
    s.couloir(0, 2, 13);
    let x = 3;
    const k = ent(rng, 3, 4);
    for (let i = 0; i < k; i++) {
      const gw = Math.min(4, 2 + Math.round(d * 1.6 + rng() * 0.9));
      s.c(x, 13, x + gw - 1, 23); s.n(x, 23, gw, '^');
      x += gw;
      const pw = Math.max(2, ent(rng, 3, 5) - Math.round(d * 1.5));
      s.couloir(x, x + pw - 1, 13);
      if (rng() < 0.4) s.r(x, 19, x + pw - 1, 19);
      x += pw;
    }
    s.couloir(x, x + 1);
    return x + 2;
  } },
  // Couloir bas : pics au sol et au plafond, petits sauts obligatoires
  plafond: { phases: [S], f(s, rng, d) {
    const Lg = ent(rng, 14, 20);
    s.couloir(0, 1); s.c(2, 16, Lg + 1, 19);
    let k = 4;
    while (k < Lg - 1) {
      const gw = d > 0.6 && rng() < 0.5 ? 2 : 1;
      s.n(k, 19, gw, '^');
      if (d > 0.25) s.n(k - 1, 16, gw + 2, '^');
      k += gw + ent(rng, 3, 5) - (d > 0.8 ? 1 : 0);
    }
    s.couloir(Lg + 2, Lg + 3);
    return Lg + 4;
  } },
  // Piliers de hauteurs différentes au-dessus des pics
  piliers: { phases: [S], f(s, rng, d) {
    s.couloir(0, 2, 10);
    let x = 3, h = 0;
    const k = ent(rng, 3, 5);
    for (let i = 0; i < k; i++) {
      const gw = d > 0.7 && rng() < 0.5 ? 3 : 2;
      s.c(x, 10, x + gw - 1, 23); s.n(x, 23, gw, '^');
      x += gw;
      let nh = borne(h + ent(rng, -1, 2), 0, 3);
      if (nh - h > 2) nh = h + 2;
      const pw = Math.max(2, ent(rng, 2, 4) - Math.round(d));
      s.c(x, 10, x + pw - 1, 19);
      if (nh > 0) s.r(x, 20 - nh, x + pw - 1, 19);
      h = nh; x += pw;
    }
    s.couloir(x, x + 2, 10);
    return x + 3;
  } },
  // Cheminée : sauts muraux pour monter, puis on redescend
  cheminee: { phases: [S], f(s, rng, d, ctx) {
    const hg = 5 + Math.round(d * 5) + ent(rng, 0, 1), a = ent(rng, 3, 5), top = 19 - hg - 2;
    s.couloir(0, a - 2); s.c(a - 1, 17, a - 1, 19); s.c(a, top, a + 2, 19);
    s.c(a + 3, top, a + 5, top + 1); s.c(a + 4, top, a + 7, 19);
    if (ctx.glace) { s.col(a - 1, top, 16, 'i'); s.col(a + 3, top + 2, 19, 'i'); }
    if (d >= 0.7) s.p(a + 2, top + Math.floor(hg / 2) + 2, '^');
    s.couloir(a + 8, a + 10);
    return a + 11;
  } },
  // Sol fêlé : fracas pour passer dessous, puis rebond pour remonter
  fracas: { phases: [S], f(s, rng, d) {
    const a = ent(rng, 3, 4), b = a + 2, fw = d > 0.6 ? 2 : 3;
    s.couloir(0, b + fw + 1);
    s.r(b, 20, b + fw - 1, 21, 'x');
    const e = b + fw + 4 + ent(rng, 0, 3);
    s.c(b, 22, e, 23);
    s.c(e + 1, 14, e + 3, 23);
    s.couloir(e + 4, e + 6);
    return e + 7;
  } },
  // Ressort au pied d'un mur couvert de pics
  ressort: { phases: [S], f(s, rng, d) {
    const h = Math.min(9, 5 + Math.round(d * 4.5)), a = ent(rng, 4, 6), top = 19 - h - 3;
    s.couloir(0, a + 2);
    s.c(a - 1, top, a + 2, 19); s.p(a, 19, 's');
    s.col(a + 2, top + 4, 18, '^');
    s.c(a + 3, top, a + 5, top + 2); s.c(a + 4, top, a + 7, 19);
    s.couloir(a + 8, a + 10);
    return a + 11;
  } },
  // Grand mur à grimper en liquide puis plafond à longer au-dessus des pics
  murLiquide: { phases: [S, L], req: [L], f(s, rng, d) {
    const h = 6 + Math.round(d * 5), Lg = 6 + Math.round(d * 5) + ent(rng, 0, 1), a = ent(rng, 4, 6), st = 19 - h;
    s.couloir(0, a);
    s.c(a - 1, st, a, 19);
    s.c(a + 1, st, a + 2, st);
    s.c(a + 3, st, a + 2 + Lg, 19); s.c(a + 3, 20, a + Lg, 23); s.n(a + 3, 23, Lg - 2, '^');
    s.couloir(a + Lg + 3, a + Lg + 5);
    return a + Lg + 6;
  } },
  // Sol de grilles au-dessus des pics, murs de grilles : liquide en l'air puis solide avant de retomber
  grilles: { phases: [S, L], req: [L], f(s, rng, d) {
    const Lg = ent(rng, 16, 22), k = 1 + Math.round(d * 1.6);
    s.couloir(0, 2, 13);
    s.c(3, 13, Lg, 19); s.r(3, 20, Lg, 20, '='); s.c(3, 21, Lg, 23); s.n(3, 23, Lg - 2, '^');
    const pas = Math.floor((Lg - 6) / k);
    for (let i = 0; i < k; i++) { const gx = 7 + i * pas; s.col(gx, 13, 19, '='); if (d < 0.45) s.r(gx - 2, 20, gx + 2, 20); }
    s.couloir(Lg + 1, Lg + 3);
    return Lg + 4;
  } },
  // Tamis au plafond d'un cul-de-sac : monter en gaz, se poser en solide
  tamis: { phases: [S, L], req: [Z], f(s, rng, d) {
    const a = ent(rng, 3, 5), k = ent(rng, 4, 6), b = a + k + ent(rng, 5, 8);
    s.couloir(0, a + k);
    s.r(a, 13, a + k, 13, '~');
    s.c(a, 8, b, 12);
    if (d > 0.4) s.n(a + k + 2, 12, d > 0.9 ? 2 : 1, '^');
    s.c(b - 2, 13, b, 19);
    s.couloir(b + 1, b + 3);
    return b + 4;
  } },
  // Feu au pied d'un mur : le gaz explose et propulse
  feu: { phases: [S, L], req: [Z], f(s, rng, d) {
    const h = 7 + Math.round(d * 3), a = ent(rng, 4, 6), top = 19 - h - 3;
    s.couloir(0, a + 1);
    s.c(a - 1, top, a + 1, 19); s.p(a, 19, 'f');
    s.c(a + 2, top, a + 4, top + 2); s.c(a + 3, top, a + 6, 19);
    if (d > 0.3) s.col(a - 1, top + 2, 15 - Math.round((1.2 - d) * 4), '^');   // paroi gauche hérissée
    if (d > 0.7) s.n(a + 4, 19, 2, '^');                                     // réception piégée
    s.couloir(a + 7, a + 9);
    return a + 10;
  } },
  // Tunnel de vent entre deux rangées de pics : seul le gaz passe
  vent: { phases: [S, L], req: [Z], f(s, rng, d) {
    const Lt = 8 + Math.round(d * 9) + ent(rng, 0, 2);
    s.couloir(0, 3);
    s.c(4, 14, 3 + Lt, 19); s.r(4, 15, 3 + Lt, 18, '>'); s.n(4, 14, Lt, '^'); s.n(4, 19, Lt, '^');
    s.couloir(4 + Lt, 6 + Lt);
    return 7 + Lt;
  } },
  // Mur fêlé puis longue fosse avec des cristaux
  eclair: { phases: [S, L], req: [P], f(s, rng, d) {
    const Lp = 7 + Math.round(d * 7) + ent(rng, 0, 1);
    s.couloir(0, 2); s.r(3, 14, 4, 19, 'x'); s.couloir(5, 6);
    s.c(7, 11, 6 + Lp, 23); s.n(7, 23, Lp, '^');
    for (let x = 11; x < 5 + Lp; x += 5 + ent(rng, 0, 1)) s.p(x, ent(rng, 14, 17), '*');
    s.couloir(7 + Lp, 9 + Lp);
    return 10 + Lp;
  } },
  // Tunnel noyé sous un plafond bas
  eau: { phases: [S, L], f(s, rng, d) {
    const Lw = 6 + Math.round(d * 10);
    s.couloir(0, 2);
    s.c(3, 14, 4, 19); s.r(3, 20, 6 + Lw, 24, 'w'); s.c(5 + Lw, 14, 6 + Lw, 19);
    const k = Math.round(d * 3.4);
    for (let i = 0; i < k; i++) s.p(7 + Math.floor((Lw - 4) * (i + 0.5) / k), i % 2 ? 24 : 20, '^');
    if (d < 0.4) s.r(6 + Lw, 20, 6 + Lw, 21);   // marche pour sortir de l'eau
    s.couloir(7 + Lw, 9 + Lw);
    return 10 + Lw;
  } },
  // Arbalètes au plafond (et une au sol) : passer entre les flèches
  fleches: { phases: [S], f(s, rng, d) {
    const Lg = ent(rng, 14, 20), forme = Math.floor(rng() * 4);
    s.couloir(0, 2); s.c(3, 13, Lg, 19);
    const k = 2 + Math.round(d * 4);
    const pos = (i, n2) => 4 + Math.floor((Lg - 5) * (i + 0.5 + (rng() - 0.5) * 0.4) / n2);
    if (forme === 0) {                      // pluie depuis le plafond
      for (let i = 0; i < k; i++) s.p(pos(i, k), 12, 'F');
      if (d > 0.6) for (let i = 0; i < k - 1; i++) s.p(4 + Math.floor((Lg - 5) * (i + 1) / k), 13, '^');
    } else if (forme === 1) {               // bornes au sol qui tirent vers l'arrière, à sauter
      for (let i = 0; i < Math.ceil(k * 0.7); i++) s.p(pos(i, Math.ceil(k * 0.7)), 19, 'F');
      if (d > 0.5) s.p(pos(0, 2), 12, 'F');
    } else if (forme === 2) {               // tirs du sol vers le haut, à travers des grilles
      for (let i = 0; i < k; i++) { const x = pos(i, k); s.c(x, 20, x, 21); s.p(x, 22, 'F'); s.p(x, 20, '='); }
    } else {                                // couloir haut avec arbalètes murales qui balaient à différentes hauteurs
      s.c(3, 10, Lg, 19);
      for (let i = 0; i < k; i++) { const x = pos(i, k); s.r(x, 10, x, 10 + ent(rng, 1, 4), '#'); s.p(x, 11 + ent(rng, 0, 3), 'F'); }
    }
    s.couloir(Lg + 1, Lg + 3);
    return Lg + 4;
  } },
  // Ponts de sol cassant au-dessus des pics : ne pas traîner
  cassant: { phases: [S], f(s, rng, d) {
    s.couloir(0, 2, 13);
    let x = 3;
    const k = ent(rng, 2, 3);
    for (let i = 0; i < k; i++) {
      const Lp = 5 + Math.round(d * 4) + ent(rng, 0, 2);
      s.c(x, 13, x + Lp - 1, 23); s.r(x, 20, x + Lp - 1, 20, 'c'); s.n(x, 23, Lp, '^');
      if (d > 0.3 && Lp > 5) s.p(x + Math.floor(Lp / 2), 20, '.');
      if (d > 0.85 && Lp > 7) { s.p(x + 2, 20, '.'); s.n(x + 1, 14, Lp - 2, '^'); }
      x += Lp;
      s.couloir(x, x + 1, 13); x += 2;
    }
    s.couloir(x, x + 1);
    return x + 2;
  } },
  // Sols rebondissants au-dessus des pics, plafond hérissé : ne pas trop rebondir
  rebond: { phases: [S], f(s, rng, d) {
    s.couloir(0, 2);
    let x = 3;
    const k = ent(rng, 3, 4);
    for (let i = 0; i < k; i++) {
      const gw = Math.min(4, 2 + Math.round(d * 1.5 + rng() * 0.6));
      s.c(x, 14, x + gw - 1, 23); s.n(x, 23, gw, '^'); x += gw;
      s.couloir(x, x + 1); s.r(x, 20, x + 1, 20, 'b');
      if (d > 0.35) s.n(x - 1, 14, 4, '^');
      x += 2;
    }
    s.couloir(x, x + 2);
    return x + 3;
  } },
  // Bouton au fond d'un creux : il ouvre la porte un peu plus loin
  bouton: { phases: [S], f(s, rng, d) {
    const a = ent(rng, 3, 6), lc = 5 + Math.round(d * 3);
    s.couloir(0, a + lc + 8);
    s.c(a, 20, a + lc, 21); s.p(a + lc - 1, 21, 'o');
    if (d > 0.5) s.p(a + 1, 21, '^');
    if (d > 0.9) s.p(a + lc - 3, 21, '^');
    s.col(a + lc + 4, 14, 19, 'D');
    s.couloir(a + lc + 9, a + lc + 10);
    return a + lc + 11;
  } },
  // Orbes de saut au-dessus d'une grande fosse : appuyer sur saut en les touchant
  orbes: { phases: [S], f(s, rng, d) {
    const Lp = 8 + Math.round(d * 6) + ent(rng, 0, 2);
    s.couloir(0, 2, 13); s.c(3, 9, 2 + Lp, 23); s.n(3, 23, Lp, '^');
    const k = Math.max(1, Math.ceil(Lp / 5) - 1);
    for (let i = 0; i < k; i++) s.p(3 + Math.round((i + 1) * Lp / (k + 1)), ent(rng, 15, 17), 'O');
    if (d > 0.6) s.n(5, 9, Lp - 4, '^');
    s.couloir(3 + Lp, 5 + Lp, 13);
    return 6 + Lp;
  } },
  // Interrupteurs : les blocs rouges et bleus s'échangent (nombre pair : on finit dans l'état de départ)
  bascule: { phases: [S], f(s, rng, d) {
    let n = 2 + Math.round(d * 2);
    if (n % 2) n++;
    s.couloir(0, 2);
    let x = 3;
    for (let i = 0; i < n; i++) {
      const L = ent(rng, 5, 7), etat = (i + 1) % 2;         // état juste après cet interrupteur
      s.couloir(x, x + L + 1);
      s.p(x + 1, 19, 'k');
      if (d > 0.45) { s.c(x + 3, 21, x + 4, 22); s.n(x + 3, 23, 2, '^'); s.r(x + 3, 23, x + 4, 23, '^'); s.r(x + 3, 20, x + 4, 20, etat ? 'B' : 'R'); }
      s.col(x + L, 14, 19, etat ? 'R' : 'B');                  // ce mur est ouvert dans l'état atteint
      x += L + 2;
    }
    s.couloir(x, x + 2);
    return x + 3;
  } },
  // Tremplins latéraux : ils projettent par-dessus de longues fosses
  tremplins: { phases: [S], f(s, rng, d) {
    s.couloir(0, 3, 12);
    let x = 4;
    const k = ent(rng, 1, 2);
    for (let i = 0; i < k; i++) {
      s.p(x - 1, 19, ')');
      const Lp = 7 + Math.round(d * 3) + ent(rng, 0, 1);
      s.c(x, 10, x + Lp - 1, 23); s.n(x, 23, Lp, '^');
      if (d > 0.5) s.n(x + 2, 10, Lp - 4, '^');
      x += Lp; s.couloir(x, x + 3, 12); x += 4;
    }
    return x;
  } },
  // Ennemis qui patrouillent au sol, et d'autres qui montent et descendent
  ennemis: { phases: [S], f(s, rng, d) {
    const Lg = ent(rng, 16, 22);
    s.couloir(0, Lg, 13);
    const k = 1 + Math.round(d * 2);
    let prec = 1;
    for (let i = 0; i < k; i++) {
      const fin = Math.round(1 + (Lg - 2) * (i + 1) / k);
      if (i < k - 1) s.p(fin, 19, '#');                          // petit muret qui borne la patrouille
      s.p(Math.floor((prec + fin) / 2), 19, 'E');
      prec = fin + 1;
    }
    if (d > 0.5) s.p(Math.floor(Lg * 0.3) + 1, 13, 'Y');
    if (d > 0.9) s.p(Math.floor(Lg * 0.75), 13, 'Y');
    s.couloir(Lg + 1, Lg + 2);
    return Lg + 3;
  } },
  // Bannissement : un état est interdit un moment, il faut grimper autrement
  banni: { phases: [S, L], f(s, rng, d, ctx) {
    const tile = ['7', '8', '9'][Math.floor(rng() * 3)];      // 7 : liquide, 8 et 9 : les deux états du niveau
    s.couloir(0, 4); s.col(2, 14, 19, tile);
    const hg = 5 + Math.round(d * 4), a = 6, top = 19 - hg - 2;
    s.couloir(4, a - 2); s.c(a - 1, 17, a - 1, 19); s.c(a, top, a + 2, 19);
    s.c(a + 3, top, a + 5, top + 1); s.c(a + 4, top, a + 7, 19);
    s.couloir(a + 8, a + 10);
    return a + 11;
  } },
  // Multiplicateur de saut : un grand saut pour une haute corniche, puis petits sauts sous des pics
  supersaut: { phases: [S], f(s, rng, d) {
    s.couloir(0, 5); s.p(2, 19, 'H');
    const hm = 5 + (d > 0.6 ? 1 : 0);
    s.c(6, 19 - hm - 3, 12, 19); s.r(9, 20 - hm, 12, 19); s.col(8, 20 - hm, 18, '^');
    s.c(13, 19 - hm - 3, 16, 20 - hm - 1);
    // descente vers un couloir bas hérissé
    s.c(17, 19 - hm - 3, 18, 19); s.p(17, 19, 'h');
    const Lb = 8 + Math.round(d * 6);
    s.c(19, 17, 18 + Lb, 19);
    for (let x = 21; x < 18 + Lb; x += 3) { s.p(x, 17, '^'); if (d > 0.4) s.p(x + 1, 19, '^'); }
    s.couloir(19 + Lb, 21 + Lb);
    return 22 + Lb;
  } },
  // Plume : longue fosse à traverser en planant depuis un escalier (plafond de glace : le liquide n'y colle pas)
  plane: { phases: [S, L], req: [PL], f(s, rng, d) {
    const Lp = 10 + Math.round(d * 4) + ent(rng, 0, 1);
    s.couloir(0, 3); s.c(4, 8, 7 + Lp, 19);
    s.r(4, 17, 5, 19); s.r(6, 14, 7, 19);
    s.r(8, 20, 7 + Lp, 22, '.'); s.c(8, 20, 7 + Lp, 22); s.n(8, 23, Lp, '^'); s.r(8, 7, 7 + Lp, 7, 'i');
    if (d > 0.5) s.n(10, 8, Lp - 4, '^');
    s.couloir(8 + Lp, 10 + Lp);
    return 11 + Lp;
  } },
  // Caoutchouc : marches trop hautes pour un saut, faces de glace ; il faut rebondir de plus en plus haut
  rebondir: { phases: [S, L], req: [CA], f(s, rng, d) {
    const k = 2 + (d > 0.6 ? 1 : 0), hm = 5;
    s.couloir(0, 3);
    let x = 4, haut = 19;
    s.c(4, 19 - hm * k - 4, 6 + k * 4 + 4, 19);
    for (let i = 0; i < k; i++) {
      x += 3; haut -= hm;
      s.r(x, haut + 1, x + 3 + (k - i - 1) * 4, 19);
      s.col(x, haut + 1, haut + hm, 'i');
    }
    const xf = 6 + k * 4 + 5;
    s.c(xf - 1, 19 - hm * k - 4, xf + 2, 19);
    s.couloir(xf, xf + 2);
    return xf + 3;
  } },
  // Métal : couloir sous une pluie de flèches et un vent contraire ; le métal ne craint ni l'un ni l'autre
  blinde: { phases: [S, L], req: [ME], f(s, rng, d) {
    const Lg = ent(rng, 16, 22);
    s.couloir(0, 2); s.c(3, 14, Lg, 19); s.r(3, 14, Lg, 19, '<');
    for (let x = 4; x < Lg; x += 2) s.p(x, 13, 'F');
    s.couloir(Lg + 1, Lg + 3);
    return Lg + 4;
  } },
  // Ombre : paroi spectrale épaisse que seule l'ombre traverse
  traverse: { phases: [S, L], req: [OM], f(s, rng, d) {
    const ep = 4 + Math.round(d * 5), a = 4;
    s.couloir(0, a - 1);
    s.c(a, 10, a + ep - 1, 19); s.r(a, 10, a + ep - 1, 19, '%');
    if (d > 0.5) { const m = a + Math.floor(ep / 2); s.p(m, 13, '^'); s.p(m, 17, '^'); }
    s.couloir(a + ep, a + ep + 3);
    return a + ep + 4;
  } },
  // Détours de l'éclat ◆ : le couloir continue tout droit, mais une galerie en hauteur (ou sous l'eau) part, plus longue
  // et plus dure, avec l'éclat au milieu, et rejoint le couloir plus loin (le niveau choisit un détour faisable)
  alcove0: detour(0), alcove1: detour(1), alcove2: detour(2), alcove3: detour(3),
  alcove4: detour(4), alcove5: detour(5), alcove6: detour(6), alcove7: detour(7),
  // Barrières d'état : seul un état précis les traverse (une salle par état, le niveau prend celles de ses états)
  porteS: porte(S), porteL: porte(L), porteZ: porte(Z), porteP: porte(P), portePL: porte(PL), porteCA: porte(CA), porteME: porte(ME), porteOM: porte(OM),
  porteGL: porte(GL), porteMA: porte(MA),
  // Lac : un grand bassin dont le fond est hérissé ; la glace marche dessus et file
  lac: { phases: [S], req: [GL], f(s, rng, d) {
    const Lp = 12 + Math.round(d * 8) + ent(rng, 0, 2);
    s.couloir(0, 2); s.c(3, 14, 2 + Lp, 19); s.r(3, 20, 2 + Lp, 25, 'w'); s.n(3, 26, Lp, '^'); s.r(3, 26, 2 + Lp, 26, '^');
    if (d > 0.5) s.n(5, 13, Lp - 4, '^');
    s.couloir(3 + Lp, 5 + Lp);
    return 6 + Lp;
  } },
  // Brasier : un long couloir dont le sol brûle ; le magma n'en a rien à faire
  brasier: { phases: [S], req: [MA], f(s, rng, d) {
    const Lp = 10 + Math.round(d * 8) + ent(rng, 0, 2);
    s.couloir(0, 2); s.c(3, 14 + (d > 0.6 ? 2 : 0), 2 + Lp, 19); s.r(3, 19, 2 + Lp, 19, 'f');
    s.couloir(3 + Lp, 5 + Lp);
    return 6 + Lp;
  } },
  // Gouffre : le couloir est muré, il faut descendre au fond d'un puits et remonter par un ascenseur
  gouffre: { phases: [S], f(s, rng, d) {
    const prof = 30 + Math.round(d * 6), a = 3;
    s.couloir(0, a + 12);
    s.r(a + 4, 14, a + 7, 19);                                    // le mur qui coupe le couloir
    s.c(a, 20, a + 2, prof); s.c(a, prof - 3, a + 11, prof); s.c(a + 8, 20, a + 10, prof);
    for (let y = 24; y < prof - 4; y += 4) s.p(y % 8 ? a : a + 2, y, '^');      // pics sur les parois de la descente
    if (d > 0.5) s.n(a + 4, prof, 3, '^');
    s.r(a, prof + 1, a + 11, prof + 1);
    s.p(a + 8, prof, 'N');                                         // l'ascenseur du retour
    return a + 13;
  } },
  // Tour : le couloir est muré, il faut grimper très haut et redescendre de l'autre côté
  tour: { phases: [S], f(s, rng, d) {
    const top = 3 + ent(rng, 0, 2), a = 3;
    s.couloir(0, a + 12);
    s.r(a + 4, 4, a + 7, 19);                                     // la tour pleine au milieu
    s.c(a, top, a + 2, 13); s.c(a, top, a + 10, top + 1); s.c(a + 8, top, a + 10, 13);
    for (let y = top + 3; y < 12; y += 3) s.p(a + 1, y, 'O');     // orbes pour monter
    if (d > 0.4) s.p(a + 5, top - 1, '^');
    return a + 13;
  } },
  // Trou bouclé : trop large pour être sauté ; tomber dedans fait ressortir par le haut (on dérive à chaque chute)
  boucle: { phases: [S], f(s, rng, d) {
    const Lp = 9 + Math.round(d * 5) + ent(rng, 0, 2);
    s.couloir(0, 2); s.c(3, 6, 2 + Lp, 23);
    s.r(3, 23, 2 + Lp, 23, '}'); s.r(3, 6, 2 + Lp, 6, '{');            // le bas et le haut sont reliés
    if (d > 0.35) { const m = 3 + Math.floor(Lp / 2); s.r(m, 13, m, 16); }   // pilier suspendu à contourner
    if (d > 0.75) s.n(4, 7, Lp - 2, '^');
    s.couloir(3 + Lp, 5 + Lp);
    return 6 + Lp;
  } },
  // Navette : plateformes mobiles au-dessus d'une fosse à pics
  navette: { phases: [S], f(s, rng, d) {
    const Lp = 11 + Math.round(d * 5) + ent(rng, 0, 2), deux = Lp >= 14;
    s.couloir(0, 2, 12); s.c(3, 12, 2 + Lp, 23); s.n(3, 23, Lp, '^');
    if (deux) { const m = 3 + Math.floor(Lp / 2); s.r(m, 20, m, 23); s.p(3, 20, 'M'); s.p(m + 1, 20, 'M'); }
    else s.p(3, 20, 'M');
    if (d > 0.6) s.n(5, 12, Lp - 4, '^');
    s.couloir(3 + Lp, 5 + Lp, 12);
    return 6 + Lp;
  } },
  // Ascenseur : une plateforme monte et descend dans un puits ; on sort tout en haut
  ascenseur: { phases: [S], f(s, rng, d) {
    const h = 8 + Math.round(d * 3) + ent(rng, 0, 1), top = 19 - h;
    s.couloir(0, 3);
    s.c(4, top - 3, 6, 23); s.n(4, 23, 3, '^'); s.p(4, 19, 'N');
    s.c(7, top - 3, 9, top - 1);
    if (d > 0.5) s.p(8, top - 3, '^');
    s.c(10, top - 3, 12, 19);
    s.couloir(13, 15);
    return 16;
  } },
  // Scies : elles balaient le couloir de haut en bas, et roulent au sol
  scies: { phases: [S], f(s, rng, d) {
    const Lg = ent(rng, 15, 21);
    s.couloir(0, Lg, 13);
    const k = 2 + Math.round(d * 2.2);
    for (let i = 0; i < k; i++) s.p(4 + Math.floor((Lg - 6) * (i + 0.5) / k), 13, 'z');
    if (d > 0.4) { const a = 2 + ent(rng, 0, 2); s.p(a, 19, '#'); s.p(Lg - 1, 19, '#'); s.p(a + 3, 19, 'Z'); }
    s.couloir(Lg + 1, Lg + 2);
    return Lg + 3;
  } },
  // Lasers : ils s'allument et s'éteignent (un préavis clignote juste avant) ; l'ombre les traverse
  lasers: { phases: [S], f(s, rng, d) {
    const Lg = ent(rng, 14, 20), forme = Math.floor(rng() * 3);
    s.couloir(0, 2); s.c(3, 14, Lg, 19);
    const k = 2 + Math.round(d * 2.5);
    for (let i = 0; i < k; i++) {
      const x = 4 + Math.floor((Lg - 5) * (i + 0.5) / k);
      if (forme === 0 || (forme === 2 && i % 2)) s.p(x, 13, 'L');        // depuis le plafond
      else s.p(x, 20, 'L');                                            // depuis le sol
    }
    if (forme === 1 && d > 0.5) s.n(5, 13, 2, '^');
    s.couloir(Lg + 1, Lg + 3);
    return Lg + 4;
  } },
  // Champignons : ils renvoient au loin, au-dessus d'une fosse
  champis: { phases: [S], f(s, rng, d) {
    const Lp = 9 + Math.round(d * 5) + ent(rng, 0, 1);
    s.couloir(0, 2, 11); s.c(3, 8, 2 + Lp, 23); s.n(3, 23, Lp, '^');
    const k = Math.max(2, Math.ceil(Lp / 4));
    for (let i = 0; i < k; i++) s.p(3 + Math.round((i + 0.6) * Lp / (k + 0.2)), ent(rng, 18, 20), 'U');
    if (d > 0.6) s.n(5, 8, Lp - 4, '^');
    s.couloir(3 + Lp, 5 + Lp, 11);
    return 6 + Lp;
  } },
  // Plateformes en tapis roulants
  tapis: { phases: [S, L], f(s, rng, d) {
    s.couloir(0, 2, 12);
    let x = 3;
    const k = ent(rng, 3, 4);
    for (let i = 0; i < k; i++) {
      const pw = ent(rng, 3, 5), contre = rng() < 0.35 + d * 0.3;
      s.couloir(x, x + pw - 1, 12); s.sol(x, x + pw - 1, contre ? '[' : ']'); x += pw;
      const gw = contre ? 2 : Math.min(6, 3 + Math.round(d * 2 + rng()));
      s.c(x, 12, x + gw - 1, 23); s.n(x, 23, gw, '^'); x += gw;
    }
    s.couloir(x, x + 2, 12);
    return x + 3;
  } },
  // Sol de glace avec trous et pics
  glace: { phases: [S, L], f(s, rng, d) {
    s.couloir(0, 2, 13); s.sol(0, 2, 'i');
    let x = 3;
    const k = ent(rng, 3, 4);
    for (let i = 0; i < k; i++) {
      const pw = ent(rng, 5, 7) - Math.round(d * 1.5);
      s.couloir(x, x + pw - 1, 13); s.sol(x, x + pw - 1, 'i');
      if (d > 0.6 && pw >= 5) s.p(x + pw - 2, 19, '^');
      x += pw;
      const gw = Math.min(4, 1 + Math.round(d * 2.2));
      s.c(x, 13, x + gw - 1, 23); s.n(x, 23, gw, '^'); x += gw;
    }
    s.couloir(x, x + 2, 13); s.sol(x, x + 2, 'i');
    return x + 3;
  } },
  // Téléporteur au fond d'un trou, sortie de l'autre côté d'un mur
  teleport: { phases: [S, L], f(s, rng, d) {
    const a = ent(rng, 3, 5), q = rng() < 0.5;
    s.couloir(0, a + 2);
    s.c(a, 20, a + 1, 23); s.p(a, 23, q ? 'Q' : 'P'); s.p(a + 1, 23, q ? 'Q' : 'P');
    s.c(a + 6, 9, a + 11, 19); s.p(a + 8, 10, q ? 'q' : 'p');
    const pk = Math.round(d * 3.2);
    if (pk > 0) s.n(a + 6, 19, Math.min(4, pk + 1), '^');
    if (d > 0.8) s.p(a + 11, 12, '^');
    s.couloir(a + 12, a + 14);
    return a + 15;
  } },
  // Pilons : des blocs d'acier tombent du plafond et écrasent le couloir ; passer entre deux chutes
  pilons: { phases: [S], f(s, rng, d) {
    const k = 2 + Math.round(d * 2.4), pas = 4 + (d < 0.5 ? 1 : 0), Lg = 3 + k * pas;
    s.couloir(0, Lg, 13);
    for (let i = 0; i < k; i++) s.p(4 + i * pas, 14, 'K');
    if (d > 0.7) s.p(4 + Math.floor(pas / 2), 14, '^');
    s.couloir(Lg + 1, Lg + 2);
    return Lg + 3;
  } },
  // Orbites : des scies tournent autour d'un pivot au milieu du couloir
  orbites: { phases: [S], f(s, rng, d) {
    const k = 1 + Math.round(d * 2), pas = 8, Lg = 4 + k * pas;
    s.couloir(0, Lg, 12);
    for (let i = 0; i < k; i++) s.p(4 + Math.floor(pas / 2) + i * pas, 17, 'C');
    s.couloir(Lg + 1, Lg + 2);
    return Lg + 3;
  } },
  // Geysers : une colonne d'eau bouillante jaillit par moments et projette tout en haut d'un mur
  geysers: { phases: [S], f(s, rng, d) {
    const hm = 4 + Math.round(d * 2), deux = d > 0.55, xe = deux ? 15 : 10;
    s.couloir(0, 3); s.c(4, 6, xe + 2, 19);
    s.p(5, 19, 'g'); s.r(7, 20 - hm, deux ? 11 : 9, 19);           // le mur à franchir
    if (deux) { s.p(11, 19 - hm, 'g'); s.r(12, 17 - hm, 14, 19); }  // un second geyser sur le mur, vers un mur plus haut
    if (d > 0.35) s.p(6, 19, '^');
    s.couloir(xe + 3, xe + 5);
    return xe + 6;
  } },
  // Brûleurs : des becs crachent des flammes par moments, du sol et du plafond (le torrent les éteint)
  bruleurs: { phases: [S], f(s, rng, d) {
    const k = 2 + Math.round(d * 2.5), pas = 4, Lg = 4 + k * pas;
    s.couloir(0, Lg, 13);
    for (let i = 0; i < k; i++) s.p(4 + i * pas, i % 2 ? 13 : 20, 't');
    s.couloir(Lg + 1, Lg + 2);
    return Lg + 3;
  } },
  // Sous-marin : un grand bassin à traverser sous l'eau, entre des rideaux de roche, avec des courants
  sousMarin: { phases: [S, L], f(s, rng, d) {
    const k = 2 + Math.round(d * 2), pas = 6, Lw = 3 + k * pas;
    s.couloir(0, 2);
    s.c(3, 13, 2 + Lw, 27); s.r(3, 17, 2 + Lw, 27, 'w');
    for (let i = 0; i < k; i++) {
      const x = 5 + i * pas;
      s.r(x, 13, x + 1, 20 + (i % 2));                         // rideau : il faut plonger dessous
      const c = i % 2 ? 'y' : 'u';
      s.r(x - 2, 22, x + 3, 25, c);                             // un courant sous le rideau
      if (d > 0.5) s.p(x + 3, 27, '^');
    }
    if (d > 0.8) s.n(4, 27, 2, '^');
    s.r(3 + Lw, 17, 3 + Lw, 27); s.c(3 + Lw, 13, 5 + Lw, 16);
    s.couloir(6 + Lw, 8 + Lw);
    return 9 + Lw;
  } },
  // Ballet : un gouffre traversé sur des plateformes qui vont et viennent, dans tous les sens
  ballet: { phases: [S], f(s, rng, d) {
    const k = 3 + Math.round(d * 1.6), lc = 7, Lp = k * lc + 1;
    s.couloir(0, 2, 12); s.c(3, 11, 2 + Lp, 23); s.n(3, 23, Lp, '^');
    for (let i = 0; i < k; i++) {
      const x = 3 + i * lc;
      if (i > 0) s.r(x, 18 + (i % 2) * 2, x, 22);                     // pilier de séparation
      if (i % 2 === 0) s.p(x + 1, 19, 'M'); else s.p(x + 3, 21, 'N');
    }
    if (d > 0.6) s.n(5, 11, Lp - 6, '^');
    s.couloir(3 + Lp, 5 + Lp, 12);
    return 6 + Lp;
  } },
  // Arène : une longue galerie pleine d'ennemis qui patrouillent au sol et tombent du plafond
  arene: { phases: [S], f(s, rng, d) {
    const Lg = ent(rng, 22, 28);
    s.couloir(0, Lg, 11);
    const k = 2 + Math.round(d * 2);
    let prec = 1;
    for (let i = 0; i < k; i++) {
      const fin = Math.round(1 + (Lg - 2) * (i + 1) / k);
      if (i < k - 1) s.p(fin, 19, '#');
      s.p(Math.floor((prec + fin) / 2), 19, 'E');
      prec = fin + 1;
    }
    for (let i = 0; i < 1 + Math.round(d * 2); i++) s.p(4 + Math.floor((Lg - 6) * (i + 0.5) / (1 + Math.round(d * 2))), 11, 'Y');
    s.n(Math.floor(Lg / 2) - 2, 15, 4, '-');
    s.couloir(Lg + 1, Lg + 2);
    return Lg + 3;
  } }
};

/* ---------- Combinaisons de menaces : des modules posés à la suite dans le couloir (rangées 14 à 19) ----------
   Chaque module occupe quelques colonnes ; une salle « combo » enchaîne un motif de modules, répété selon la
   difficulté. Toutes sont vérifiées par le robot (outils/parallele.js test). */
const MOD = {
  picsSol: [4, (s, x) => s.n(x + 1, 19, 2, '^')],
  picsPlafond: [3, (s, x) => s.n(x, 14, 3, '^')],
  fosse: [5, (s, x) => { s.c(x + 1, 20, x + 3, 21); s.n(x + 1, 22, 3, '^'); }],
  laserPlafond: [3, (s, x) => s.p(x + 1, 13, 'L')],
  laserSol: [3, (s, x) => s.p(x + 1, 20, 'L')],
  arbalete: [3, (s, x) => s.p(x + 1, 13, 'F')],
  scieV: [3, (s, x) => s.p(x + 1, 13, 'z')],
  pilon: [3, (s, x) => s.p(x + 1, 14, 'K')],
  orbite: [7, (s, x) => s.p(x + 3, 17, 'C')],
  bruleurSol: [3, (s, x) => s.p(x + 1, 20, 't')],
  bruleurPlafond: [3, (s, x) => s.p(x + 1, 13, 't')],
  ennemi: [8, (s, x) => { s.p(x, 19, '#'); s.p(x + 7, 19, '#'); s.p(x + 3, 19, 'E'); }],
  sauteur: [8, (s, x) => { s.p(x, 19, '#'); s.p(x + 7, 19, '#'); s.p(x + 3, 19, 'S'); }],
  volant: [8, (s, x) => { s.r(x, 14, x, 15); s.r(x + 7, 14, x + 7, 15); s.p(x + 3, 16, 'I'); }],
  geyserMur: [7, (s, x) => { s.p(x + 1, 19, 'g'); s.r(x + 3, 15, x + 5, 19); }],
  muret: [3, (s, x) => s.r(x + 1, 17, x + 1, 19)],
  serre: [6, (s, x) => { s.r(x, 14, x + 5, 16); s.n(x + 1, 17, 4, '^'); }],
  orbeFosse: [7, (s, x) => { s.c(x + 1, 20, x + 5, 21); s.n(x + 1, 22, 5, '^'); s.p(x + 3, 16, 'O'); }],
  fines: [6, (s, x) => { s.n(x, 17, 6, '-'); s.p(x + 2, 13, 'L'); s.p(x + 3, 20, 'L'); }]
};
const COMBOS = {
  pilonsLasers: ['pilon', 'laserPlafond'], feuxCroises: ['bruleurSol', 'bruleurPlafond'], sciesPics: ['scieV', 'picsSol'],
  arbaletesPilons: ['arbalete', 'pilon'], orbitesFosses: ['orbite', 'fosse'], ennemisLasers: ['ennemi', 'laserSol'],
  sauteurs: ['sauteur', 'sauteur'], volants: ['volant', 'picsSol'], serreLaser: ['serre', 'laserPlafond'],
  serrePilon: ['serre', 'pilon'], muretsArbaletes: ['muret', 'arbalete'], fossesLasers: ['fosse', 'laserSol'],
  pilonsFosses: ['pilon', 'fosse'], orbitesEnnemis: ['orbite', 'ennemi'], bruleursFosses: ['bruleurPlafond', 'fosse'],
  geysersPilons: ['geyserMur', 'pilon'], geysersLasers: ['geyserMur', 'laserPlafond'], picsAlternes: ['picsSol', 'picsPlafond'],
  sciesOrbite: ['scieV', 'scieV', 'orbite'], lasersCroises: ['laserSol', 'laserPlafond'], arbaletesFosses: ['arbalete', 'fosse'],
  volantsPilons: ['volant', 'pilon'], sauteursFosses: ['sauteur', 'fosse'], murets: ['muret', 'picsSol', 'muret'],
  serreBruleur: ['serre', 'bruleurSol'], orbitesLasers: ['orbite', 'laserPlafond'], grandFeu: ['bruleurSol', 'bruleurSol', 'bruleurPlafond'],
  machines: ['pilon', 'orbite', 'bruleurSol', 'laserPlafond'], zoo: ['ennemi', 'sauteur', 'volant'], geysersFosses: ['geyserMur', 'fosse'],
  orbesFeu: ['orbeFosse', 'bruleurPlafond'], finesLasers: ['fines', 'pilon'], sciesFosses: ['scieV', 'fosse', 'arbalete']
};
function comboSalle(motif) {
  return { phases: [S], f(s, rng, d) {
    const k = 1 + Math.round(d * 1.6) + (motif.length < 3 ? 1 : 0);
    let x = 3;
    const suite = [];
    for (let i = 0; i < k; i++) suite.push(...motif);
    let total = 3; for (const m of suite) total += MOD[m][0] + 1;
    s.couloir(0, total + 2);
    for (const m of suite) { MOD[m][1](s, x, rng, d); x += MOD[m][0] + 1; }
    return total + 3;
  } };
}
// le chaos : 4 à 6 modules tirés au hasard
SALLES.chaos = { phases: [S], f(s, rng, d) {
  const noms = Object.keys(MOD), suite = [];
  for (let i = 0; i < 4 + Math.round(d * 2); i++) suite.push(noms[Math.floor(rng() * noms.length)]);
  let total = 3; for (const m of suite) total += MOD[m][0] + 1;
  s.couloir(0, total + 2);
  let x = 3; for (const m of suite) { MOD[m][1](s, x, rng, d); x += MOD[m][0] + 1; }
  return total + 3;
} };
for (const nom in COMBOS) SALLES[nom] = comboSalle(COMBOS[nom]);
// salles à barrière : la barrière d'une transformation (pleine hauteur) mêlée à des menaces ; 5 par transformation
const MOTIFS_BAR = { Pilons: ['bar', 'pilon', 'bar'], Lasers: ['laserPlafond', 'bar', 'fosse'], Orbite: ['bar', 'orbite'],
  Feux: ['bruleurSol', 'bar', 'bruleurPlafond'], Serre: ['bar', 'serre', 'bar'] };
const NOMS_ETATS = ['S', 'L', 'Z', 'P', 'PL', 'CA', 'ME', 'OM', 'GL', 'MA'];
for (let et = 0; et < 10; et++) for (const m in MOTIFS_BAR) {
  const c = CAR_BARRIERE[et], motif = MOTIFS_BAR[m];
  SALLES['bar' + NOMS_ETATS[et] + m] = { phases: [S], req: [et], f(s, rng, d) {
    let total = 3; for (const k of motif) total += (k === 'bar' ? 3 : MOD[k][0]) + 1;
    s.couloir(0, total + 2);
    let x = 3;
    for (const k of motif) {
      if (k === 'bar') { s.r(x + 1, 14, x + 1, 19, c); x += 4; }
      else { MOD[k][1](s, x, rng, d); x += MOD[k][0] + 1; }
    }
    return total + 3;
  } };
}
// Leviers : trois leviers cachés en hauteur, dans une fosse et derrière des pics ouvrent la grille de sortie
SALLES.leviers = { phases: [S], f(s, rng, d) {
  s.couloir(0, 30, 8);
  s.r(4, 13, 6, 19); s.n(4, 12, 3, '-'); s.p(5, 9, 'J');                      // levier 1 : en haut d'un pilier
  s.c(10, 20, 14, 23); s.n(10, 23, 2, '^'); s.n(13, 23, 2, '^'); s.p(12, 23, 'J');   // levier 2 : au fond d'une fosse à pics
  s.n(17, 19, 2, '^'); s.r(20, 15, 22, 19); s.p(19, 19, 'J');                 // levier 3 : coincé entre pics et mur
  if (d > 0.5) { s.p(8, 8, 'L'); s.p(16, 8, 'K'); }
  s.r(26, 8, 26, 19, 'T');                                                    // la grille
  s.couloir(27, 32);
  return 33;
} };
// Plaques : elles transforment sans dépenser de charge (dans la transformation 2 ou 3 du niveau)
SALLES.plaques = { phases: [S], f(s, rng, d) {
  const Lg = 22 + ent(rng, 0, 4);
  s.couloir(0, Lg, 11);
  for (let x = 4; x < Lg - 4; x += 6) { s.p(x, 19, x % 12 === 4 ? ';' : '&'); s.c(x + 2, 20, x + 3, 21); s.n(x + 2, 22, 2, '^'); }
  s.p(Lg - 2, 19, ':');
  if (d > 0.5) for (let x = 6; x < Lg - 4; x += 6) s.p(x, 11, 'F');
  s.couloir(Lg + 1, Lg + 2);
  return Lg + 3;
} };
// Lacets : une grande salle en zigzag à gravir (droite, gauche, droite…) dans des passages bas, puis on redescend
SALLES.lacets = { phases: [S], f(s, rng, d) {
  s.couloir(0, 3);
  s.c(4, 2, 18, 19);
  [17, 14, 11, 8, 5].forEach((y, i) => {
    if (i % 2 === 0) s.r(4, y, 16, y); else s.r(6, y, 18, y);
    if (d > 0.35 && i > 0) s.n(i % 2 ? 9 : 10, y - 1, 2, '^');                        // pics sur l'étage
    if (d > 0.8 && i % 2 === 0) s.p(11, y + 2, 'S');
  });
  s.r(19, 5, 19, 19); s.c(19, 2, 21, 4); s.c(20, 5, 21, 19);
  if (d > 0.5) { s.p(5, 19, '#'); s.p(9, 19, 'E'); }
  s.couloir(22, 24);
  return 25;
} };
// Lacets vers le bas : le couloir s'arrête, on descend en zigzag puis une plateforme remonte au couloir
SALLES.lacetsBas = { phases: [S], f(s, rng, d) {
  s.couloir(0, 5);
  s.c(4, 20, 18, 32); s.r(6, 14, 18, 19);
  [23, 26, 29].forEach((y, i) => {
    if (i % 2 === 0) s.r(4, y, 16, y); else s.r(6, y, 18, y);
    if (d > 0.4) s.n(i % 2 ? 10 : 8, y - 1, 2, '^');
  });
  s.n(4, 32, 15, '^'); s.c(4, 31, 18, 31);
  s.r(4, 32, 18, 32); if (d > 0.6) s.n(7, 32, 3, '^');
  s.c(19, 14, 21, 31); s.p(19, 31, 'N');
  s.couloir(22, 24);
  return 25;
} };
// Clé : la clé attend en haut d'une colonne de pics ; il faut ensuite la porter tout le long d'un couloir piégé
// jusqu'à la porte dorée (tomber fait perdre la clé : on la reprend depuis le dernier drapeau)
SALLES.cle = { phases: [S], f(s, rng, d) {
  const Lg = 38 + Math.round(d * 10);
  s.couloir(0, Lg, 9);
  s.r(6, 14, 8, 19); s.p(5, 19, '^'); s.p(9, 19, '^'); s.n(3, 16, 2, '-');       // un pilier entouré de pics, une marche fine
  s.p(7, 13, '+');                                                               // la clé en haut du pilier
  if (d > 0.6) s.n(6, 9, 3, '^');
  let x = 13, der = -1;
  while (x < Lg - 7) {                                                          // le long trajet avec la clé
    let k = ent(rng, 0, 3); if (k === der) k = (k + 1) % 4; der = k;
    if (k === 0) { s.c(x, 20, x + 2, 21); s.n(x, 22, 3, '^'); x += 7; }                   // fosse à pics
    else if (k === 1) { s.n(x, 19, 2, '^'); s.n(x + 1, 9, 2, '^'); x += 6; }               // pics au sol et au plafond
    else if (k === 2) { s.r(x, 17, x + 1, 19); s.n(x, 16, 2, '^'); s.n(x - 1, 13, 1, '-'); x += 6; }   // bloc hérissé à enjamber
    else { s.p(x + 2, 19, 'S'); x += 7; }                                                  // une boule qui bondit
    if (d > 0.5 && rng() < 0.35) s.p(x - 2, 9, 'F');
  }
  s.r(Lg - 2, 9, Lg - 2, 19, 'd');                                              // la porte dorée, tout au bout
  s.couloir(Lg + 1, Lg + 3);
  return Lg + 4;
} };
// Rythme : une fosse à pics qu'on traverse sur des plateformes qui apparaissent et disparaissent en cadence
SALLES.rythme = { phases: [S], f(s, rng, d) {
  const Lp = 14 + Math.round(d * 6);
  s.couloir(0, 2, 12); s.c(3, 12, 2 + Lp, 23); s.n(3, 23, Lp, '^');
  for (let x = 4, i = 0; x < 2 + Lp - 1; x += 4, i++) s.n(x, i % 2 ? 18 : 20, 2, '|');
  s.couloir(3 + Lp, 5 + Lp, 12);
  return 6 + Lp;
} };
// Minuterie : un bouton bleu ouvre la porte bleue quelques secondes ; il faut filer, sans heurter les menaces
SALLES.minuterie = { phases: [S], f(s, rng, d) {
  const Lg = 32 + Math.round(d * 5);                                            // la porte est loin du bouton : il faut tout faire d'une traite
  s.couloir(0, Lg, 13);
  s.p(3, 19, '/');
  for (let x = 7; x < Lg - 4; x += 5) { if ((x / 5) % 2 < 1) s.n(x, 19, 2, '^'); else s.p(x, 13, 'L'); }
  s.r(Lg - 2, 14, Lg - 2, 19, '"');
  s.couloir(Lg + 1, Lg + 2);
  return Lg + 3;
} };
// Zone inversée : un puits où tout tombe vers le haut ; on remonte, on file en hauteur, on redescend
SALLES.inversee = { phases: [S], f(s, rng, d) {
  s.couloir(0, 4);
  s.r(5, 14, 7, 19);
  s.c(3, 4, 4, 13); s.r(3, 6, 4, 13, ',');                                      // le puits inversé
  s.c(3, 3, 17, 5);
  if (d > 0.4) for (let x = 7; x < 16; x += 4) s.p(x, 3, '^');
  if (d > 0.7) s.p(11, 5, 'S');
  s.c(16, 6, 17, 19);
  s.couloir(18, 20);
  return 21;
} };
// Broyeur : un mur de scies se met en marche et pousse jusqu'au bout de la salle (le « boss » de fin de zone)
SALLES.broyeur = { phases: [S], f(s, rng, d) {
  const Lg = 34 + Math.round(d * 8);
  s.couloir(0, Lg, 11);
  s.p(2, 19, '_');
  for (let x = 8; x < Lg - 4; x += 6) {
    const k = Math.floor(rng() * 4);
    if (k === 0) { s.c(x, 20, x + 2, 21); s.n(x, 22, 3, '^'); }
    else if (k === 1) s.r(x, 11, x + 2, 16);
    else if (k === 2) s.r(x + 1, 17, x + 1, 19);
    else { s.p(x + 1, 11, 'K'); }
  }
  s.p(Lg - 1, 19, '_');
  s.couloir(Lg + 1, Lg + 3);
  return Lg + 4;
} };
// Transitions : le couloir change de hauteur (decale = rangées gagnées vers le bas)
// Chute : un grand puits aux parois hérissées, on atterrit dans un couloir plus bas
SALLES.chute = { phases: [S], decale: PALIER, f(s, rng, d) {
  const L = 16;
  s.couloir(0, 2); s.c(3, 14, 8, 23); s.c(3, 24, L, 29);
  for (let y = 16, i = 0; y < 23; y += 3, i++) s.p(i % 2 ? 8 : 3, y, '^');
  if (d > 0.4) s.n(5, 18, 2, '-');
  if (d > 0.6) s.n(11, 29, 2, '^');
  return L + 1;
} };
// Montée : un puits à gravir par des plateformes fines, on ressort dans un couloir plus haut
SALLES.montee = { phases: [S], decale: -PALIER, f(s, rng, d) {
  const L = 18;
  s.couloir(0, 3); s.c(4, 4, 9, 19); s.c(10, 4, L, 9);
  [16, 13, 10, 7].forEach((y, i) => s.n(i % 2 ? 4 : 7, y, 3, '-'));
  if (d > 0.5) s.p(4, 18, '^');
  if (d > 0.7) s.p(13, 3, 'L');
  return L + 1;
} };
// Retour : le couloir est muré ; on plonge dans un boyau bas qui repart vers la GAUCHE, puis on retombe et on repart à droite
SALLES.retour = { phases: [S], decale: PALIER, f(s, rng, d) {
  const L = 34;
  s.couloir(0, 30); s.c(27, 20, 28, 20);                       // le trou au bout du couloir muré
  s.c(3, 21, 28, 22);                                          // le boyau (2 rangées) vers la gauche
  for (let x = 23; x > 6; x -= 5) s.p(x, 22, '^');
  s.c(3, 23, 4, 23);                                           // le trou du bout du boyau
  s.c(3, 24, L, 29);                                           // le couloir du dessous, vers la droite
  if (d > 0.4) for (let x = 10; x < L - 4; x += 8) s.n(x, 29, 2, '^');
  if (d > 0.7) s.p(18, 24, 'K');
  return L + 1;
} };
// Descente puis remontée : un puits qu'on descend en évitant les pics des parois, et des plateformes fines pour remonter
SALLES.puits = { phases: [S], f(s, rng, d) {
  const prof = 10 + Math.round(d * 6);
  s.couloir(0, 3);
  s.c(4, 14, 8, 19 + prof);
  for (let y = 21, i = 0; y < 19 + prof - 2; y += 3, i++) s.p(i % 2 ? 8 : 4, y, '^');
  s.n(4, 19 + prof, 5, '#');
  s.c(9, 19 + prof - 3, 14, 19 + prof - 1);                                  // le fond s'ouvre à droite
  s.c(12, 14, 15, 19 + prof - 1);
  for (let y = 19 + prof - 3, i = 0; y > 15; y -= 3, i++) s.n(i % 2 ? 12 : 14, y, 2, '-');
  if (d > 0.6) s.p(13, 13, 'L');
  s.couloir(16, 18);
  return 19;
} };

/* ---------- Construction ---------- */
function debut(g, panneaux, dy) {
  const s = salle(g, 0, dy);
  const larg = Math.max(9, 5 + panneaux.length * 2);
  s.couloir(1, larg - 1, 13); s.p(2, 19, '@');
  panneaux.forEach((_, i) => s.p(4 + i * 2, 19, '?'));
  return larg;
}
function fin(g, x0, dy) {
  const s = salle(g, x0, dy);
  s.couloir(0, 6, 13); s.p(5, 19, 'G');
  g.elargir(x0 + 8);
  return x0 + 8;
}
// Calibrage mesuré par outils/difficulte.js : pour chaque type de salle, la difficulté demandée est convertie en
// réglage interne, afin que toutes les salles d'une même difficulté soient aussi dures les unes que les autres.
const CAL = (typeof module !== 'undefined' && module.exports) ? (() => { try { return require('./calibrage.js'); } catch (e) { return {}; } })() : (racine.CALIBRAGE || {});
function calibre(type, d) {
  const c = CAL[type];
  if (!c || !c.length) return d;
  if (d <= c[0][0]) return c[0][1];
  for (let i = 1; i < c.length; i++) if (d <= c[i][0]) { const [a, va] = c[i - 1], [b, vb] = c[i]; return va + (vb - va) * (d - a) / (b - a); }
  return c[c.length - 1][1];
}
/* ---------- Variations : 0 à 3 ajouts tirés au hasard sur chaque salle (des milliers de combinaisons) ----------
   On ne touche qu'aux couloirs plats (sol plein en 20, plafond plein en 13, vide entre) et aux fosses, pour rester
   franchissable (vérifié par outils/test-salles.js --varier). */
const VARIATIONS = ['cristal', 'arbalete', 'ennemi', 'pics', 'glace', 'arbalete', 'ennemi', 'pics', 'laser', 'scie', 'champi'];
function varier(g, x0, x1, rng, d, ctx) {
  const dy = (ctx && ctx.dy) || 0, gm = g;
  g = { met: (x, y, c) => gm.met(x, y + dy, c), l: gm.l };
  const L = (x, y) => (gm.l[y + dy] && gm.l[y + dy][x]) || '#';
  const plat = (x) => L(x, 20) === '#' && L(x, 13) === '#' && L(x, 12) === '#' && [14, 15, 16, 17, 18, 19].every(y => L(x, y) === '.');
  const fosse = (x) => L(x, 20) === '.' && L(x, 23) === '^' && L(x, 16) === '.';
  const k = Math.floor(rng() * (1.6 + d * 2.2));
  const faits = [];
  for (let i = 0; i < k; i++) {
    const v = VARIATIONS[Math.floor(rng() * VARIATIONS.length)];
    for (let essai = 0; essai < 12; essai++) {
      const x = x0 + 2 + Math.floor(rng() * Math.max(1, x1 - x0 - 4));
      if (faits.some(f => Math.abs(f - x) < 4)) continue;
      if ((v === 'orbe' || v === 'cristal') && fosse(x) && L(x, 15) === '.') { g.met(x, 15, v === 'orbe' ? 'O' : '*'); faits.push(x); break; }
      if (v === 'arbalete' && plat(x) && plat(x - 1) && plat(x + 1)) { g.met(x, 13, 'F'); faits.push(x); break; }
      if (v === 'laser' && plat(x) && plat(x - 1) && plat(x + 1)) { g.met(x, 13, 'L'); faits.push(x); break; }
      if (v === 'scie' && plat(x) && plat(x - 1) && plat(x + 1)) { g.met(x, 13, 'z'); faits.push(x); break; }
      if (v === 'champi' && fosse(x) && L(x, 19) === '.') { g.met(x, 19, 'U'); faits.push(x); break; }
      if (v === 'pics' && plat(x) && plat(x + 1) && plat(x - 1) && plat(x + 2)) { g.met(x, 14, '^'); g.met(x + 1, 14, '^'); faits.push(x); break; }
      if (v === 'ennemi' || v === 'glace') {
        if (!plat(x)) continue;                        // ne jamais écraser un objet de la salle (interrupteur, ressort…)
        let a = x, b = x;
        while (a > x0 && plat(a - 1)) a--;
        while (b < x1 - 1 && plat(b + 1)) b++;
        if (b - a < 7) continue;
        if (v === 'ennemi') { g.met(a + 1, 19, '#'); g.met(b - 1, 19, '#'); g.met(Math.floor((a + b) / 2), 19, 'E'); }
        else for (let xx = a + 2; xx <= b - 2; xx++) g.met(xx, 20, 'i');
        faits.push(a, b); break;
      }
    }
  }
}
function poser(g, x0, type, rng, d, ctx) {
  ctx = ctx || {};
  const dd = ctx.brut ? d : calibre(ctx.glace ? type + '*' : type, d);
  const x1 = x0 + SALLES[type].f(salle(g, x0, ctx.dy), rng, borne(dd, 0, 1.2), ctx);
  if (ctx.varier) varier(g, x0, x1, ctx.rngV || rng, borne(d, 0, 1.2), ctx);
  return x1;
}

/* Les 8 zones : quelles salles, lesquelles sont nouvelles (plus fréquentes) */
const ZONES_SALLES = [
  { types: ['trous', 'plafond', 'piliers', 'cheminee', 'fracas', 'ressort', 'cassant', 'fleches', 'rebond', 'bouton', 'orbes', 'bascule', 'tremplins', 'ennemis', 'supersaut'], nouv: ['orbes', 'bascule', 'tremplins', 'ennemis', 'supersaut'] },
  { types: ['orbes', 'bascule', 'tremplins', 'ennemis', 'supersaut', 'banni', 'trous', 'plafond', 'piliers', 'cheminee', 'fracas', 'ressort', 'cassant', 'fleches', 'rebond', 'bouton', 'murLiquide', 'grilles'], nouv: ['murLiquide', 'grilles'] },
  { types: ['orbes', 'bascule', 'tremplins', 'ennemis', 'supersaut', 'banni', 'trous', 'piliers', 'cheminee', 'fracas', 'cassant', 'fleches', 'rebond', 'bouton', 'murLiquide', 'grilles', 'tamis', 'feu', 'vent'], nouv: ['tamis', 'feu', 'vent'] },
  { types: ['orbes', 'bascule', 'tremplins', 'ennemis', 'supersaut', 'banni', 'trous', 'plafond', 'cheminee', 'cassant', 'fleches', 'rebond', 'bouton', 'murLiquide', 'grilles', 'tamis', 'feu', 'vent', 'eclair'], nouv: ['eclair'] },
  { types: ['orbes', 'bascule', 'tremplins', 'ennemis', 'supersaut', 'banni', 'trous', 'cheminee', 'fracas', 'cassant', 'fleches', 'rebond', 'murLiquide', 'tamis', 'vent', 'eclair', 'eau', 'bouton'], nouv: ['eau'] },
  { types: ['orbes', 'bascule', 'tremplins', 'ennemis', 'supersaut', 'banni', 'trous', 'plafond', 'piliers', 'grilles', 'feu', 'fleches', 'rebond', 'bouton', 'eclair', 'eau', 'tapis', 'teleport'], nouv: ['tapis', 'teleport'] },
  { types: ['orbes', 'bascule', 'tremplins', 'ennemis', 'supersaut', 'banni', 'cheminee', 'fracas', 'cassant', 'fleches', 'murLiquide', 'tamis', 'vent', 'eclair', 'eau', 'glace', 'cheminee*', 'rebond'], nouv: ['glace', 'cheminee*'] },
  { types: Object.keys(SALLES).filter(t => t !== 'alcove'), nouv: [] }
];

// tirage pondéré : jamais une salle vue parmi les 3 dernières, et moins souvent une salle déjà beaucoup vue
function choisir(rng, liste, nouv, recents, compte) {
  const poids = liste.map(t => (recents.includes(t) ? 0 : (nouv.includes(t) ? 2.5 : 1) / (1 + ((compte && compte[t]) || 0) * 0.7)));
  if (poids.every(p => p === 0)) return liste[Math.floor(rng() * liste.length)];
  let tot = poids.reduce((a, b) => a + b, 0), r = rng() * tot;
  for (let i = 0; i < liste.length; i++) { r -= poids[i]; if (r < 0) return liste[i]; }
  return liste[liste.length - 1];
}

// Un niveau de campagne : graine fixe, difficulté constante (d), nb salles
// salles jouables avec ces états variables (Solide et Liquide sont toujours là)
// compatibilité mesurée par le robot (outils/compat.js) : avec quels états de base chaque salle est faisable
const COMPAT = (typeof module !== 'undefined' && module.exports) ? (() => { try { return require('./compat.js'); } catch (e) { return {}; } })() : (racine.COMPAT || {});
function compatible(t, etats) {
  const nom = t.replace('*', ''), sl = SALLES[nom];
  if (!sl || !(sl.req || []).every(r => etats.includes(r))) return false;
  const b = COMPAT[nom];
  return b ? b.some(x => etats.includes(x)) : etats.includes(S);
}
const ALCOVES = ['alcove0', 'alcove1', 'alcove2', 'alcove3', 'alcove4', 'alcove5', 'alcove6', 'alcove7'];
function sallesPour(etats) {
  const l = Object.keys(SALLES).filter(t => !t.startsWith('alcove') && !SALLES[t].decale && compatible(t, etats));
  if (compatible('cheminee', etats) && etats.includes(S)) l.push('cheminee*');   // la glace : sauts muraux du solide
  return l;
}
// 4 états au hasard : le premier (état de base) est un état stable ; assez de salles possibles
function etatsAuHasard(rng, impose, nb) {
  nb = nb || 3;
  for (let essai = 0; essai < 200; essai++) {
    const et = [];
    const base = impose !== undefined && STABLES.includes(impose) && rng() < 0.5 ? impose : STABLES[Math.floor(rng() * STABLES.length)];
    et.push(base);
    if (impose !== undefined && !et.includes(impose)) et.push(impose);
    while (et.length < nb) { const c = TOUS_ETATS[Math.floor(rng() * TOUS_ETATS.length)]; if (!et.includes(c)) et.push(c); }
    const ordre = [et[0]].concat(et.slice(1).sort((a, b) => a - b));
    if (sallesPour(ordre).length >= (nb < 3 ? 8 : 12) && ALCOVES.some(a => compatible(a, ordre) && (COMPAT[a] || []).includes(ordre[0]))) return ordre;
  }
  return nb < 3 ? [S, L] : [S, L, Z];
}
const VERTICALES = ['gouffre', 'tour', 'puits', 'lacets', 'lacetsBas', 'ascenseur', 'cheminee', 'geysers', 'leviers', 'inversee', 'cle'];
function niveau(zone, graine, d, nb, panneaux, imposees, etats) {
  const rng = hasard(graine), rngV = hasard(graine * 7 + 3);
  const g = new Grille(HAUT + DESC);
  let oy = rng() < 0.5 ? 0 : PALIER;                     // hauteur du couloir (0, 10 ou 20 rangées plus bas)
  let x = debut(g, panneaux || [], oy);
  const types = sallesPour(etats || [S, L, Z]);
  const descentes = ['chute', 'retour'].filter(t => compatible(t, etats || [S, L, Z])), montees = ['montee'].filter(t => compatible(t, etats || [S, L, Z]));
  const nouv = types.filter(t => (SALLES[t.replace('*', '')].req || []).length > 0);
  const et0 = etats || [S, L, Z];
  // de préférence une cachette faisable avec l'état de départ du niveau (sans dépendre d'un changement d'état)
  let alcoves = ALCOVES.filter(a => compatible(a, et0) && (COMPAT[a] || []).includes(et0[0]));
  if (!alcoves.length) alcoves = ALCOVES.filter(a => compatible(a, et0));
  const suite = [], compte = {};
  // une salle sur deux exige une des autres transformations, à tour de rôle : le Parfait doit toutes les jouer ;
  // une salle sur quatre fait monter, descendre ou revenir vers la gauche
  const autres = et0.slice(1), parEtat = {};
  for (const st of autres) parEtat[st] = types.filter(t => (SALLES[t.replace('*', '')].req || []).includes(st));
  const verticales = types.filter(t => VERTICALES.includes(t));
  for (let i = 0; i < nb; i++) {
    let liste = types;
    if (i % 2 === 1 && autres.length) { const l2 = parEtat[autres[(i >> 1) % autres.length]]; if (l2 && l2.length) liste = l2; }
    else if (i % 4 === 2 && verticales.length) liste = verticales;
    let t = (imposees && imposees[i]) || choisir(rng, liste, nouv, suite.slice(-3), compte);
    // de temps en temps (et souvent dès le départ), le couloir descend, remonte ou repart vers la gauche
    if (!(imposees && imposees[i]) && (i === 0 ? rng() < 0.55 : i % 5 === 3)) {
      const bas = oy + PALIER <= DESC ? descentes : [], haut = oy - PALIER >= 0 ? montees : [];
      const choix = (i === 0 && bas.length) ? bas : bas.concat(haut);
      if (choix.length) t = choix[Math.floor(rng() * choix.length)];
    }
    compte[t] = (compte[t] || 0) + 1;
    suite.push(t);
    if (i === Math.floor(nb / 2) && alcoves.length) x = poser(g, x, alcoves[Math.floor(rng() * alcoves.length)], rng, d, { dy: oy });
    const glace = t.endsWith('*'), x0 = x, oy0 = oy, nom = glace ? t.slice(0, -1) : t;
    x = poser(g, x, nom, rng, d + (rng() - 0.5) * 0.08, { glace, varier: !SALLES[nom].decale, rngV, dy: oy });
    oy += SALLES[nom].decale || 0;
    if (i > 0 && i % 2 === 0) salle(g, x0, oy0).p(1, 19, '!');   // un drapeau (point de sauvegarde) toutes les deux salles
  }
  x = fin(g, x, oy);
  for (let y = 0; y < g.h; y++) g.l[y][x - 1] = '#';
  elaguerDrapeaux(g.l);
  return { carte: g.carte(), suite };
}

/* ---------- Mode infini ---------- */
const THEMES_INF = ['carriere', 'aqueduc', 'chaufferie', 'orage', 'abysses', 'usine', 'glacier', 'coeur'];
const TOUS = Object.keys(SALLES).filter(t => !t.startsWith('alcove') && !SALLES[t].decale && !(SALLES[t].req || []).length);
const SANS_BAN = TOUS.filter(t => t !== 'banni');
function Infini(graine, mode, opts) {
  this.rng = hasard(graine);
  this.mode = mode;
  this.opts = opts || {};
  this.g = new Grille();
  this.bornes = [];        // début de chaque salle (en cases)
  this.themes = [];        // { x, theme } par région
  this.x = debut(this.g, []);
  this.i = 0;
  this.prec = null;
  this.themes.push({ x: 0, theme: THEMES_INF[0] });
  this.etats = this.opts.etats || etatsAuHasard(this.rng);
  if (this.opts.depart) { this.i = this.opts.depart; this.themes[0].theme = THEMES_INF[Math.floor(this.i / 6) % THEMES_INF.length]; }
  this.types = sallesPour(this.etats).filter(t => !t.endsWith('*'));
}
Infini.prototype.difficulte = function (i) {
  if (this.opts.rampe) return Math.min(1.2, this.opts.rampe[0] + i * this.opts.rampe[1]);
  return this.mode === 2 ? Math.min(1.2, 0.5 + i * 0.03) : Math.min(1.2, 0.05 + i * 0.02);
};
Infini.prototype.ajouter = function (k) {
  for (let j = 0; j < k; j++) {
    const i = this.i++;
    if (i > 0 && i % 6 === 0) this.themes.push({ x: this.x, theme: THEMES_INF[(i / 6) % THEMES_INF.length] });
    this.recents = this.recents || [];
    const t = choisir(this.rng, this.types, [], this.recents.slice(-3));
    this.recents.push(t);
    this.bornes.push(this.x);
    const glace = this.themes[this.themes.length - 1].theme === 'glacier' && t === 'cheminee';
    const x0 = this.x;
    this.x = poser(this.g, this.x, t, this.rng, this.difficulte(i), { glace, varier: true });
    if (this.opts.drapeaux && i > 0) salle(this.g, x0).p(1, 19, '!');
  }
  this.g.elargir(this.x + 1);
  return this.g.carte();
};
Infini.prototype.theme = function (x) {
  let th = this.themes[0].theme;
  for (const r of this.themes) if (x >= r.x) th = r.theme;
  return th;
};

// Défi du jour : une très longue suite de salles difficiles, la même pour tout le monde ce jour-là
function defi(cle, opts) {
  opts = opts || {};
  const rng = hasard((cle * 2654435761) >>> 0);
  const g = new Grille();
  let x = debut(g, []);
  const suite = [], compte = {};
  const rngE = hasard(cle * 31 + 7);
  const etats = opts.etats || etatsAuHasard(rngE);
  const liste = (opts.types || sallesPour(etats)).filter(t => !t.endsWith('*'));
  let pieces = 0;
  for (let i = 0; i < (opts.nb || 26); i++) {
    const t = choisir(rng, liste, [], suite.slice(-3), compte);
    compte[t] = (compte[t] || 0) + 1; suite.push(t);
    const x0 = x;
    x = poser(g, x, t, rng, (opts.d || 0.75) + rng() * 0.3, { varier: true });
    if (opts.drapeaux !== false && i > 0 && i % 2 === 0) salle(g, x0).p(1, 19, '!');
    if (opts.pieces) {               // des pièces dans chaque salle, certaines bien cachées en hauteur
      for (let k = 0; k < 4; k++) for (let essai = 0; essai < 30; essai++) {
        const px = x0 + 1 + Math.floor(rng() * (x - x0 - 2)), py = 6 + Math.floor(rng() * 14);
        if (g.l[py][px] === '.' && g.l[py + 1][px] !== '^' && g.l[py - 1][px] !== '^') { g.l[py][px] = '$'; pieces++; break; }
      }
    }
  }
  x = fin(g, x);
  for (let y = 0; y < HAUT; y++) g.l[y][x - 1] = '#';
  elaguerDrapeaux(g.l);
  return { carte: g.carte(), suite, pieces, etats, theme: THEMES_INF[cle % THEMES_INF.length] };
}

/* ---------- Défis spéciaux : descendre ou monter de N mètres (1 case = 1 mètre) ---------- */
function vertical(graine, sens, metres, etats) {
  const rng = hasard(graine * 131 + 7), Wd = 30, Hh = metres + 16, l = [];
  for (let y = 0; y < Hh; y++) l.push(new Array(Wd).fill('#'));
  const c = (xa, ya, xb, yb, ch = '.') => { for (let y = Math.max(1, ya); y <= Math.min(Hh - 2, yb); y++) for (let x = Math.max(1, xa); x <= Math.min(Wd - 2, xb); x++) l[y][x] = ch; };
  const p = (x, y, ch) => { if (y > 0 && y < Hh - 1 && x > 0 && x < Wd - 1) l[y][x] = ch; };
  c(2, 2, Wd - 3, Hh - 3);                                          // le grand puits
  const debutY = sens === 'bas' ? 6 : Hh - 4, finY = sens === 'bas' ? Hh - 4 : 6;
  // tranches de 9 mètres, chacune avec son obstacle
  let k = 0;
  for (let y = 10; y < Hh - 8; y += 9, k++) {
    const t = Math.floor(rng() * 6);
    if (sens === 'bas') {
      if (t === 0 || t === 3) {                                     // plancher percé d'un trou, pics autour
        const gx = 3 + Math.floor(rng() * (Wd - 9)), gw = 3;
        c(2, y, Wd - 3, y, '#'); c(gx, y, gx + gw - 1, y, '.');
        if (k > 1) { p(gx - 1, y - 1, '^'); p(gx + gw, y - 1, '^'); }
      } else if (t === 1) { p(3 + Math.floor(rng() * 6), y + 3, 'Z'); p(Wd - 9 + Math.floor(rng() * 5), y + 6, 'Z'); }   // scies qui balaient
      else if (t === 2) { p(1, y + 2, 'L'); p(Wd - 2, y + 6, 'L'); }                                                   // lasers à préavis
      else if (t === 4) {                                           // goulet étroit aux parois hérissées
        const gx = 6 + Math.floor(rng() * (Wd - 14));
        c(2, y, gx - 1, y + 5, '#'); c(gx + 3, y, Wd - 3, y + 5, '#');      // 3 rangées libres dessous avant la tranche suivante
        for (let yy = y + 1; yy < y + 5; yy += 3) p((yy % 2) ? gx - 1 : gx + 3, yy, '^');
      } else { const gx = 4 + Math.floor(rng() * (Wd - 10)); c(2, y + 4, Wd - 3, y + 4, '^'); c(gx, y + 4, gx + 3, y + 4, '.'); p(gx + 1, y + 1, 'U'); }  // champignon au-dessus des pics
    } else {
      if (t === 0 || t === 3) {                                     // plancher percé : il faut trouver le trou en montant
        const gx = 3 + Math.floor(rng() * (Wd - 9));
        c(2, y, Wd - 3, y, '#'); c(gx, y, gx + 2, y, '.');
        p(gx + 1, y + 3, 'O'); p(gx + 1, y + 6, 's'); c(gx, y + 7, gx + 2, y + 7, '#'); p(gx + 1, y + 6, 's');
      } else if (t === 1) { const gx = 3 + Math.floor(rng() * (Wd - 9)); p(gx, y + 7, 'N'); }   // ascenseur
      else if (t === 2) { for (let j = 0; j < 3; j++) p(6 + j * 7 + Math.floor(rng() * 3), y + 2 + j * 2, 'O'); }   // orbes en escalier
      else if (t === 4) { for (let j = 0; j < 4; j++) c(3 + j * 6, y + 7 - j * 2, 6 + j * 6, y + 7 - j * 2, '#'); }   // marches
      else { p(5 + Math.floor(rng() * (Wd - 12)), y + 7, 'U'); }                                                       // champignon
    }
  }
  c(2, debutY + 1, Wd - 3, debutY + 1, '#'); p(Math.floor(Wd / 2), debutY, '@');
  if (sens === 'bas') c(Wd - 8, debutY + 1, Wd - 6, debutY + 1, '.');          // le trou pour commencer à descendre
  if (sens === 'bas') { c(2, Hh - 3, Wd - 3, Hh - 3, '.'); l[Hh - 3][Math.floor(Wd / 2)] = 'G'; }
  else { c(2, debutY + 1, Wd - 3, debutY + 1, '#'); l[finY][Math.floor(Wd / 2)] = 'G'; c(Math.floor(Wd / 2) - 2, finY + 1, Math.floor(Wd / 2) + 2, finY + 1, '#'); }
  // drapeaux (points de sauvegarde) environ tous les 20 mètres, sur un endroit où l'on tient debout
  for (let y0 = 14; y0 < Hh - 14; y0 += 20) {
    let best = null;
    for (let y = y0; y < y0 + 20 && y < Hh - 2; y++) for (let x = 3; x < Wd - 3; x++) {
      if (l[y][x] !== '.' || l[y + 1][x] !== '#' || l[y - 1][x] !== '.' || l[y][x - 1] === '^' || l[y][x + 1] === '^') continue;
      const sc = Math.abs(x - Wd / 2) + Math.abs(y - (y0 + 10));
      if (!best || sc < best[2]) best = [x, y, sc];
    }
    if (best) l[best[1]][best[0]] = '!';
  }
  elaguerDrapeaux(l, sens);
  return { carte: l.map(r => r.join('')), etats: etats || etatsAuHasard(rng) };
}

// pour les tests : une seule salle entre un départ et une arrivée
function essai(type, graine, d, glace, brut, avecVariations, phases) {
  const dec = (SALLES[type] && SALLES[type].decale) || 0, oy = dec < 0 ? -dec : 0;
  const g = new Grille(dec ? HAUT + DESC : HAUT);
  let x = debut(g, [], oy);
  x = poser(g, x, type, hasard(graine), d, { glace, brut, varier: !!avecVariations, rngV: hasard(graine * 31 + 5), phases, dy: oy });
  x = fin(g, x, oy + dec);
  for (let y = 0; y < g.h; y++) g.l[y][x - 1] = '#';
  return g.carte();
}

const Gen = { vertical, SALLES, ZONES_SALLES, TOUS, VARIABLES, TOUS_ETATS, STABLES, ALCOVES, COMPAT, compatible, etatsAuHasard, sallesPour, calibre, niveau, Infini, essai, defi, hasard, HAUT, THEMES_INF };
if (typeof module !== 'undefined' && module.exports) module.exports = Gen;
else racine.Gen = Gen;
})(typeof window !== 'undefined' ? window : globalThis);
