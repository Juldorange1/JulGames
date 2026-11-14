/* Phase — générateur de salles. Un niveau est une suite de salles creusées dans la roche, toutes reliées par le
   même couloir (rangées 14 à 19, sol plein à la rangée 20). Chaque salle a une difficulté d (0 = facile, 1 = dur).
   Sert aux 24 niveaux (graine fixe, difficulté constante dans un niveau) et aux modes Infini (sans fin, de plus en
   plus dur). Chaque type de salle est vérifié par le robot (outils/test-salles.js). */
(function (racine) {
'use strict';
const S = 0, L = 1, Z = 2, P = 3;
const HAUT = 26;

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
function Grille() {
  this.l = [];
  for (let y = 0; y < HAUT; y++) this.l.push([]);
  this.w = 0;
}
Grille.prototype.elargir = function (w2) {
  while (this.w < w2) { for (let y = 0; y < HAUT; y++) this.l[y].push('#'); this.w++; }
};
Grille.prototype.met = function (x, y, c) {
  if (y <= 0 || y >= HAUT - 1 || x < 0) return;
  if (x >= this.w) this.elargir(x + 1);
  if (x === 0 && c !== '#') return;
  this.l[y][x] = c;
};
Grille.prototype.carte = function () { return this.l.map(r => r.join('')); };

// outils relatifs au début d'une salle
function salle(g, x0) {
  const api = {
    r(xa, ya, xb, yb, c = '#') { for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) g.met(x0 + x, y, c); },
    c(xa, ya, xb, yb) { api.r(xa, ya, xb, yb, '.'); },
    p(x, y, c) { g.met(x0 + x, y, c); },
    n(x, y, k, c) { for (let i = 0; i < k; i++) g.met(x0 + x + i, y, c); },
    col(x, ya, yb, c) { for (let y = ya; y <= yb; y++) g.met(x0 + x, y, c); },
    couloir(xa, xb, haut = 14) { api.c(xa, haut, xb, 19); },
    sol(xa, xb, c) { api.r(xa, 20, xb, 20, c); }
  };
  return api;
}

/* ---------- Les salles ---------- */
// chaque salle : (s, rng, d, ctx) -> largeur ; ctx.glace pour les variantes de glace
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
  murLiquide: { phases: [S, L], f(s, rng, d) {
    const h = 6 + Math.round(d * 5), Lg = 6 + Math.round(d * 5) + ent(rng, 0, 1), a = ent(rng, 4, 6), st = 19 - h;
    s.couloir(0, a);
    s.c(a - 1, st, a, 19);
    s.c(a + 1, st, a + 2, st);
    s.c(a + 3, st, a + 2 + Lg, 19); s.c(a + 3, 20, a + Lg, 23); s.n(a + 3, 23, Lg - 2, '^');
    s.couloir(a + Lg + 3, a + Lg + 5);
    return a + Lg + 6;
  } },
  // Sol de grilles au-dessus des pics, murs de grilles : liquide en l'air puis solide avant de retomber
  grilles: { phases: [S, L], f(s, rng, d) {
    const Lg = ent(rng, 16, 22), k = 1 + Math.round(d * 1.6);
    s.couloir(0, 2, 13);
    s.c(3, 13, Lg, 19); s.r(3, 20, Lg, 20, '='); s.c(3, 21, Lg, 23); s.n(3, 23, Lg - 2, '^');
    const pas = Math.floor((Lg - 6) / k);
    for (let i = 0; i < k; i++) s.col(7 + i * pas, 13, 19, '=');
    s.couloir(Lg + 1, Lg + 3);
    return Lg + 4;
  } },
  // Tamis au plafond d'un cul-de-sac : monter en gaz, se poser en solide
  tamis: { phases: [S, L, Z], f(s, rng, d) {
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
  feu: { phases: [S, L, Z], f(s, rng, d) {
    const h = 7 + Math.round(d * 3), a = ent(rng, 4, 6), top = 19 - h - 3;
    s.couloir(0, a + 1);
    s.c(a - 1, top, a + 1, 19); s.p(a, 19, 'f');
    s.c(a + 2, top, a + 4, top + 2); s.c(a + 3, top, a + 6, 19);
    s.couloir(a + 7, a + 9);
    return a + 10;
  } },
  // Tunnel de vent entre deux rangées de pics : seul le gaz passe
  vent: { phases: [S, L, Z], f(s, rng, d) {
    const Lt = 8 + Math.round(d * 9) + ent(rng, 0, 2);
    s.couloir(0, 3);
    s.c(4, 14, 3 + Lt, 19); s.r(4, 15, 3 + Lt, 18, '>'); s.n(4, 14, Lt, '^'); s.n(4, 19, Lt, '^');
    s.couloir(4 + Lt, 6 + Lt);
    return 7 + Lt;
  } },
  // Mur fêlé puis longue fosse avec des cristaux
  eclair: { phases: [S, L, Z, P], f(s, rng, d) {
    const Lp = 7 + Math.round(d * 7) + ent(rng, 0, 1);
    s.couloir(0, 2); s.r(3, 14, 4, 19, 'x'); s.couloir(5, 6);
    s.c(7, 11, 6 + Lp, 23); s.n(7, 23, Lp, '^');
    for (let x = 11; x < 5 + Lp; x += 5 + ent(rng, 0, 1)) s.p(x, ent(rng, 14, 17), '*');
    s.couloir(7 + Lp, 9 + Lp);
    return 10 + Lp;
  } },
  // Tunnel noyé sous un plafond bas
  eau: { phases: [S, L, Z, P], f(s, rng, d) {
    const Lw = 8 + Math.round(d * 8);
    s.couloir(0, 2);
    s.c(3, 14, 4, 19); s.r(3, 20, 6 + Lw, 24, 'w'); s.c(5 + Lw, 14, 6 + Lw, 19);
    const k = 1 + Math.round(d * 3);
    for (let i = 0; i < k; i++) s.p(7 + Math.floor((Lw - 4) * (i + 0.5) / k), i % 2 ? 24 : 20, '^');
    s.couloir(7 + Lw, 9 + Lw);
    return 10 + Lw;
  } },
  // Niche en hauteur où se cache l'éclat (petit détour)
  alcove: { phases: [S], f(s, rng) {
    s.couloir(0, 9);
    s.r(1, 18, 1, 19); s.r(2, 17, 3, 19);          // petit escalier
    s.c(4, 12, 6, 13); s.p(5, 13, 'e');             // niche juste au-dessus du couloir
    return 10;
  } },
  // Plateformes en tapis roulants
  tapis: { phases: [S, L, Z, P], f(s, rng, d) {
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
  glace: { phases: [S, L, Z, P], f(s, rng, d) {
    s.couloir(0, 2, 13); s.sol(0, 2, 'i');
    let x = 3;
    const k = ent(rng, 3, 4);
    for (let i = 0; i < k; i++) {
      const pw = ent(rng, 4, 6);
      s.couloir(x, x + pw - 1, 13); s.sol(x, x + pw - 1, 'i');
      if (d > 0.3 && pw >= 5) s.p(x + 2, 19, '^');
      x += pw;
      const gw = Math.min(4, 2 + Math.round(d * 1.6));
      s.c(x, 13, x + gw - 1, 23); s.n(x, 23, gw, '^'); x += gw;
    }
    s.couloir(x, x + 2, 13); s.sol(x, x + 2, 'i');
    return x + 3;
  } },
  // Téléporteur au fond d'un trou, sortie de l'autre côté d'un mur
  teleport: { phases: [S, L, Z, P], f(s, rng, d) {
    const a = ent(rng, 3, 5), q = rng() < 0.5;
    s.couloir(0, a + 2);
    s.c(a, 20, a + 1, 23); s.p(a, 23, q ? 'Q' : 'P'); s.p(a + 1, 23, q ? 'Q' : 'P');
    s.c(a + 6, 9, a + 11, 19); s.p(a + 8, 10, q ? 'q' : 'p');
    if (d > 0.5) s.n(a + 7, 19, 2, '^');
    s.couloir(a + 12, a + 14);
    return a + 15;
  } }
};

/* ---------- Construction ---------- */
function debut(g, panneaux) {
  const s = salle(g, 0);
  s.couloir(1, 8, 13); s.p(2, 19, '@');
  panneaux.forEach((_, i) => s.p(4 + i * 2, 19, '?'));
  return 9;
}
function fin(g, x0) {
  const s = salle(g, x0);
  s.couloir(0, 6, 13); s.p(5, 19, 'G');
  g.elargir(x0 + 8);
  return x0 + 8;
}
function poser(g, x0, type, rng, d, ctx) {
  return x0 + SALLES[type].f(salle(g, x0), rng, borne(d, 0, 1.2), ctx || {});
}

/* Les 8 zones : quelles salles, lesquelles sont nouvelles (plus fréquentes) */
const ZONES_SALLES = [
  { types: ['trous', 'plafond', 'piliers', 'cheminee', 'fracas', 'ressort'], nouv: ['trous', 'cheminee', 'fracas', 'ressort'] },
  { types: ['trous', 'plafond', 'piliers', 'cheminee', 'fracas', 'ressort', 'murLiquide', 'grilles'], nouv: ['murLiquide', 'grilles'] },
  { types: ['trous', 'piliers', 'cheminee', 'fracas', 'murLiquide', 'grilles', 'tamis', 'feu', 'vent'], nouv: ['tamis', 'feu', 'vent'] },
  { types: ['trous', 'plafond', 'cheminee', 'murLiquide', 'grilles', 'tamis', 'feu', 'vent', 'eclair'], nouv: ['eclair'] },
  { types: ['trous', 'cheminee', 'fracas', 'murLiquide', 'tamis', 'vent', 'eclair', 'eau'], nouv: ['eau'] },
  { types: ['trous', 'plafond', 'piliers', 'grilles', 'feu', 'eclair', 'eau', 'tapis', 'teleport'], nouv: ['tapis', 'teleport'] },
  { types: ['cheminee', 'fracas', 'murLiquide', 'tamis', 'vent', 'eclair', 'eau', 'glace', 'cheminee*'], nouv: ['glace', 'cheminee*'] },
  { types: Object.keys(SALLES).filter(t => t !== 'alcove'), nouv: [] }
];

function choisir(rng, liste, nouv, prec) {
  const poids = liste.map(t => (t === prec ? 0 : (nouv.includes(t) ? 3 : 1)));
  let tot = poids.reduce((a, b) => a + b, 0), r = rng() * tot;
  for (let i = 0; i < liste.length; i++) { r -= poids[i]; if (r < 0) return liste[i]; }
  return liste[liste.length - 1];
}

// Un niveau de campagne : graine fixe, difficulté constante (d), nb salles
function niveau(zone, graine, d, nb, panneaux, imposees) {
  const rng = hasard(graine);
  const g = new Grille();
  let x = debut(g, panneaux || []);
  const zs = ZONES_SALLES[zone - 1];
  let prec = null;
  const suite = [];
  for (let i = 0; i < nb; i++) {
    let t = (imposees && imposees[i]) || choisir(rng, zs.types, zs.nouv, prec);
    prec = t;
    suite.push(t);
    if (i > 0 && i % 3 === 0) salle(g, x).p(1, 19, '!');
    if (i === Math.floor(nb / 2)) x = poser(g, x, 'alcove', rng, d, {});
    const glace = t.endsWith('*');
    x = poser(g, x, glace ? t.slice(0, -1) : t, rng, d + (rng() - 0.5) * 0.08, { glace });
  }
  x = fin(g, x);
  for (let y = 0; y < HAUT; y++) g.l[y][x - 1] = '#';
  return { carte: g.carte(), suite };
}

/* ---------- Mode infini ---------- */
const THEMES_INF = ['carriere', 'aqueduc', 'chaufferie', 'orage', 'abysses', 'usine', 'glacier', 'coeur'];
const TOUS = Object.keys(SALLES).filter(t => t !== 'alcove');
function Infini(graine, mode) {
  this.rng = hasard(graine);
  this.mode = mode;
  this.g = new Grille();
  this.bornes = [];        // début de chaque salle (en cases)
  this.themes = [];        // { x, theme } par région
  this.x = debut(this.g, []);
  this.i = 0;
  this.prec = null;
  this.themes.push({ x: 0, theme: THEMES_INF[0] });
}
Infini.prototype.difficulte = function (i) {
  return this.mode === 2 ? Math.min(1.2, 0.5 + i * 0.03) : Math.min(1.2, 0.05 + i * 0.02);
};
Infini.prototype.ajouter = function (k) {
  for (let j = 0; j < k; j++) {
    const i = this.i++;
    if (i > 0 && i % 6 === 0) this.themes.push({ x: this.x, theme: THEMES_INF[(i / 6) % THEMES_INF.length] });
    let t = choisir(this.rng, TOUS, [], this.prec);
    this.prec = t;
    this.bornes.push(this.x);
    const glace = this.themes[this.themes.length - 1].theme === 'glacier' && t === 'cheminee';
    this.x = poser(this.g, this.x, t, this.rng, this.difficulte(i), { glace });
  }
  this.g.elargir(this.x + 1);
  return this.g.carte();
};
Infini.prototype.theme = function (x) {
  let th = this.themes[0].theme;
  for (const r of this.themes) if (x >= r.x) th = r.theme;
  return th;
};

// pour les tests : une seule salle entre un départ et une arrivée
function essai(type, graine, d, glace) {
  const g = new Grille();
  let x = debut(g, []);
  x = poser(g, x, type, hasard(graine), d, { glace });
  x = fin(g, x);
  for (let y = 0; y < HAUT; y++) g.l[y][x - 1] = '#';
  return g.carte();
}

const Gen = { SALLES, ZONES_SALLES, niveau, Infini, essai, hasard, HAUT, THEMES_INF };
if (typeof module !== 'undefined' && module.exports) module.exports = Gen;
else racine.Gen = Gen;
})(typeof window !== 'undefined' ? window : globalThis);
