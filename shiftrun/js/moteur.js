/* Phase — moteur : simulation pure et déterministe à 60 images par seconde.
   Le même code sert au jeu (navigateur) et au robot qui calcule les temps « Parfait » (Node).
   Le joueur change d'état de la matière : SOLIDE (pierre), LIQUIDE (eau), GAZ (vapeur), PLASMA (éclair). */
(function (racine) {
'use strict';

const T = 16, W = 12, H = 12;                       // taille d'une case, boîte du joueur
const S = 0, L = 1, Z = 2, P = 3, PL = 4, CA = 5, ME = 6, OM = 7, GL = 8, MA = 9;   // les 10 états (3 par niveau)
const NOMS_PHASES = ['Solide', 'Liquide', 'Gaz', 'Plasma', 'Plume', 'Caoutchouc', 'Métal', 'Ombre', 'Glace', 'Magma'];
const E = { G: 1, D: 2, H: 4, B: 8, SAUT: 16, S: 32, L: 64, Z: 128, P: 256 };   // bits d'entrée
const EV = { SAUT: 1, MUR: 2, CHANGE: 4, MORT: 8, CASSE: 16, RESSORT: 32, BOUM: 64, CRISTAL: 128, FIN: 256,
  DRAPEAU: 512, TP: 1024, ECLAT: 2048, ECHEC: 4096, ATTERRIT: 8192, JET: 16384, FRACAS: 32768, CONVERSION: 65536,
  EVAPORE: 131072, REBOND: 262144, NAGE: 524288, BOND: 1048576, BOUTON: 2097152, CRAQUE: 4194304, PIECE: 8388608, ORBE: 16777216, BASCULE: 33554432, BANNI: 67108864, BONUS: 134217728, INVINCIBLE: 268435456, CAPA: 536870912 };

const VIDE = 0, MUR = 1, GRILLE = 2, TAMIS = 3, FRAGILE = 4, PICS = 5, FEU = 6, EAU = 7, GLACE = 8, RESSORT = 9,
  CRISTAL = 10, BUT = 11, DRAPEAU = 12, PLATE = 13, TAPIS_G = 14, TAPIS_D = 15, VENT_D = 16, VENT_G = 17,
  VENT_H = 18, VENT_B = 19, TP1 = 20, TP1S = 21, TP2 = 22, TP2S = 23, ECLAT = 24, PANNEAU = 25,
  ARBALETE = 26, CASSANT = 27, REBONDI = 28, BOUTON = 29, PORTE = 30, PIECE = 31,
  ORBE = 32, INTER = 33, BLOC_R = 34, BLOC_B = 35, TREMP_G = 36, TREMP_D = 37, ENNEMI_H = 38, ENNEMI_V = 39,
  BAN_L = 40, BAN_Z = 41, BAN_P = 42, SAUT_PLUS = 43, SAUT_MOINS = 44, PAROI = 45,
  BAR_S = 46, BAR_P = 47, BAR_PL = 48, BAR_CA = 49, BAR_ME = 50, PLAT_H = 51, PLAT_V = 52, SCIE_H = 53, SCIE_V = 54,
  LASER = 55, CHAMPI = 56, BOUCLE_H = 57, BOUCLE_B = 58, BAR_GL = 59, BAR_MA = 60, BOUCLE_G = 61, BOUCLE_D = 62;
// barrières d'état : seul cet état les traverse (grille = liquide, tamis = gaz, paroi = ombre, et les autres)
const BARRIERE = { [GRILLE]: L, [TAMIS]: Z, [PAROI]: OM, [BAR_S]: S, [BAR_P]: P, [BAR_PL]: PL, [BAR_CA]: CA, [BAR_ME]: ME, [BAR_GL]: GL, [BAR_MA]: MA };
const CH = { '.': VIDE, ' ': VIDE, '@': VIDE, '#': MUR, '=': GRILLE, '~': TAMIS, 'x': FRAGILE, '^': PICS, 'f': FEU,
  'w': EAU, 'i': GLACE, 's': RESSORT, '*': CRISTAL, 'G': BUT, '!': DRAPEAU, '-': PLATE, '[': TAPIS_G, ']': TAPIS_D,
  '>': VENT_D, '<': VENT_G, 'A': VENT_H, 'V': VENT_B, 'P': TP1, 'p': TP1S, 'Q': TP2, 'q': TP2S, 'e': ECLAT, '?': PANNEAU,
  'F': ARBALETE, 'c': CASSANT, 'b': REBONDI, 'o': BOUTON, 'D': PORTE, '$': PIECE,
  'O': ORBE, 'k': INTER, 'R': BLOC_R, 'B': BLOC_B, '(': TREMP_G, ')': TREMP_D, 'E': ENNEMI_H, 'Y': ENNEMI_V,
  '7': BAN_L, '8': BAN_Z, '9': BAN_P, 'H': SAUT_PLUS, 'h': SAUT_MOINS, '%': PAROI,
  'a': BAR_S, 'r': BAR_P, 'l': BAR_PL, 'n': BAR_CA, 'm': BAR_ME, 'M': PLAT_H, 'N': PLAT_V, 'Z': SCIE_H, 'z': SCIE_V,
  'L': LASER, 'U': CHAMPI, '{': BOUCLE_H, '}': BOUCLE_B, 'j': BAR_GL, 'v': BAR_MA, 'W': BOUCLE_G, 'X': BOUCLE_D };

/* ---------- Réglages physiques (px et px/image) ---------- */
const K = {
  charges: 2,
  // solide
  sCourse: 3.4, sAccSol: 0.42, sAccAir: 0.3, sFrein: 0.5, sDemiTour: 0.8, sFreinAir: 0.1,
  sAuDela: 0.1, sAuDelaAir: 0.025, gMonte: 0.42, gChute: 0.75, chuteMax: 8.5, glisseMur: 2.8,
  saut: 6.4, rebond: 8.0, murVy: 5.9, murVx: 3.6, fracas: 9, fracasMax: 11,
  ressort: 9.3, ressortFracas: 12,
  // liquide
  lCourse: 4.2, lAcc: 0.2, lAccAir: 0.14, lFrein: 0.035, lAuDela: 0.012, lGrav: 0.5, lRampe: 2.4,
  lDecroit: 0.05, lConv: 0.95, lConvMax: 8, lJetVx: 4.6, lJetVy: 4.6, lGiclee: 4.1, lNage: 5.5,
  // gaz
  zDuree: 60, zGrav: 0.15, zMonteMax: 2.6, zCourse: 3.4, zAcc: 0.3, zBouffee: 1.6,
  // plasma
  pVit: 8.5, pDuree: 9, pSortie: 4.8, pRecharge: 8,
  // vent, explosions, tapis
  vent: [0.08, 0.16, 0.7, 0, 0.5, 0.12, 0, 0, 0.1, 0.06], ventMax: 6.2, boum: 9, tapis: 1.4,
  // pièges
  flechePeriode: 84, flecheVit: 4.2, cassantDelai: 22, cassantRetour: 150, rebondMin: 8.2,
  orbeRecharge: 30, tremplinVx: 9.5, tremplinVy: 3.5, ennemiVit: 1.3, banDuree: 240, bonusDuree: 360, sautPlus: 1.45, sautMoins: 0.7,
  invincible: 50, orbeRayon: 10,
  platVit: 1.1, platLarg: 3, platEp: 5, scieVit: 1.5, scieRayon: 7, laserEp: 4, champiRayon: 6.5, champiForce: 7.6,
  ennemiRayon: 6.5,
  // glace, magma
  glCourse: 4.6, glAcc: 0.12, glFrein: 0.025, maCourse: 3.0, maSaut: 6.0,
  // compétences (réappuyer sur l'état actuel)
  capCd: 10, grapPortee: 7, grapVit: 7.5, grapDuree: 30, tirVit: 7, tirVie: 40, souffle: 8.5, marteau: 12, dashCA: 9, dashCAt: 10,
  hover: 45, hoverRecharge: 30, perleVx: 5.5, perleVy: -3.5, perleVie: 60, glaceVie: 150, explosion: 2.2,
  // plume, caoutchouc, métal, ombre
  plCourse: 3.2, plChute: 1.25, plSaut: 4.6, caCourse: 3.0, caRebond: 0.88, caPousse: 2.4, caMur: 0.85,
  meCourse: 2.6, meSaut: 6.4, meMonte: 0.6, meChute: 0.95, meChuteMax: 11, omDuree: 90, omVit: 2.8
};

/* ---------- Chargement d'un niveau ---------- */
function charger(def) {
  // les 4 états du niveau (touches 1 à 4) ; le premier est l'état de base, celui où l'on revient
  const et = (def.etats && def.etats.length >= 2) ? def.etats.slice() : [S, L, Z];
  let phases = 0;
  for (const p of (def.phases || et)) phases |= 1 << p;
  const n = { def, phases, emplacements: et, base: et[0], capacites: def.capacites !== false };
  recharger(n, def.carte);
  if (!n.dep) throw new Error('Pas de départ @ dans ' + def.id);
  return n;
}
// (re)lit une carte dans un niveau existant : sert aussi au mode infini, qui s'allonge vers la droite
function recharger(n, c) {
  const h = c.length;
  let w = 0;
  for (const l of c) w = Math.max(w, l.length);
  const g = new Uint8Array(w * h);
  let aEclat = false;
  const panneaux = [], sorties = [];
  for (let y = 0; y < h; y++) {
    const l = c[y];
    for (let x = 0; x < w; x++) {
      const ch = l[x] || '.';
      const t = CH[ch];
      if (t === undefined) throw new Error('Caractère inconnu « ' + ch + ' » dans ' + n.def.id + ' (' + x + ',' + y + ')');
      g[y * w + x] = t;
      if (ch === '@' && !n.dep) n.dep = { x: x * T + (T - W) / 2, y: (y + 1) * T - H };
      if (t === PANNEAU) panneaux.push({ x, y, texte: (n.def.panneaux || [])[panneaux.length] || '' });
      if (t === TP1S || t === TP2S) sorties.push({ x, y, t });
      if (t === ECLAT) aEclat = true;
    }
  }
  // chaque entrée de téléporteur mène à la sortie de même couleur la plus proche à sa droite
  const tp = new Map();
  for (let i = 0; i < w * h; i++) {
    const t = g[i];
    if (t !== TP1 && t !== TP2) continue;
    const x = i % w, y = Math.floor(i / w), cherche = t === TP1 ? TP1S : TP2S;
    let best = null;
    for (const s of sorties) if (s.t === cherche && s.x >= x && (!best || s.x < best.x)) best = s;
    if (!best) for (const s of sorties) if (s.t === cherche && (!best || Math.abs(s.x - x) < Math.abs(best.x - x))) best = s;
    if (best) tp.set(i, best);
  }
  // arbalètes : tirent vers le côté libre, à intervalles fixes (décalés selon la position)
  const fleches = [];
  const libre = (x, y) => x >= 0 && y >= 0 && x < w && y < h && !estDur(g[y * w + x]);
  for (let i = 0; i < w * h; i++) {
    if (g[i] !== ARBALETE) continue;
    const x = i % w, y = Math.floor(i / w);
    let dx = 0, dy = 0;
    if (libre(x - 1, y)) dx = -1; else if (libre(x + 1, y)) dx = 1; else if (libre(x, y + 1)) dy = 1; else if (libre(x, y - 1)) dy = -1;
    if (!dx && !dy) continue;
    let k = 1;
    while (k < 40 && libre(x + dx * k, y + dy * k)) k++;
    const hs = (x * 73856093 ^ y * 19349663) >>> 0;
    const per = 54 + hs % 70, vit = 3 + ((hs >> 8) % 5) * 0.6, rafale = 1 + ((hs >> 12) % 3);
    fleches.push({ x, y, dx, dy, portee: (k - 1) * T + T / 2, dec: (hs >> 4) % per, per, vit, rafale });
  }
  // portes : chacune s'ouvre avec le bouton le plus proche à sa gauche
  const boutons = [];
  for (let i = 0; i < w * h; i++) if (g[i] === BOUTON) boutons.push(i);
  const porteDe = new Map();
  for (let i = 0; i < w * h; i++) {
    if (g[i] !== PORTE) continue;
    const x = i % w;
    let best = -1;
    for (const b of boutons) { const bx = b % w; if (bx <= x && (best < 0 || bx > best % w)) best = b; }
    if (best >= 0) porteDe.set((x) * 1024 + Math.floor(i / w), (best % w) * 1024 + Math.floor(best / w));
  }
  // ennemis : ils patrouillent d'un mur à l'autre (horizontalement ou verticalement), selon le temps seulement
  const ennemis = [];
  const passeE = (x, y) => x >= 0 && y >= 0 && x < w && y < h && !estDur(g[y * w + x]) && g[y * w + x] !== PICS;
  for (let i = 0; i < w * h; i++) {
    const t = g[i];
    if (t !== ENNEMI_H && t !== ENNEMI_V) continue;
    const x = i % w, y = Math.floor(i / w), hor = t === ENNEMI_H;
    let a = 0, b = 0;
    while (a < 30 && passeE(hor ? x - a - 1 : x, hor ? y : y - a - 1)) a++;
    while (b < 30 && passeE(hor ? x + b + 1 : x, hor ? y : y + b + 1)) b++;
    ennemis.push({ x, y, hor, min: -a * T, max: b * T, dec: (x * 13 + y * 7) % 200 });
  }
  // plateformes mobiles (3 cases de large) et scies : aller-retour d'un mur à l'autre, selon le temps seulement
  const plates = [], scies = [];
  const passeP = (x, y) => x >= 0 && y >= 0 && x < w && y < h && !estDur(g[y * w + x]) && g[y * w + x] !== PICS;
  for (let i = 0; i < w * h; i++) {
    const t = g[i];
    if (t !== PLAT_H && t !== PLAT_V && t !== SCIE_H && t !== SCIE_V) continue;
    const x = i % w, y = Math.floor(i / w), plat = t === PLAT_H || t === PLAT_V, hor = t === PLAT_H || t === SCIE_H;
    const lg = plat ? K.platLarg : 1;
    const libreL = (xx, yy) => { for (let k = 0; k < (hor ? 1 : lg); k++) if (!(plat ? passeP(xx + k, yy) : (xx >= 0 && yy >= 0 && xx < w && yy < h && !estDur(g[yy * w + xx])))) return false; return true; };
    let a = 0, b = 0;
    if (hor) { while (a < 40 && libreL(x - a - 1, y)) a++; while (b < 40 && libreL(x + lg + b, y)) b++; }
    else { while (a < 40 && libreL(x, y - a - 1)) a++; while (b < 40 && libreL(x, y + b + 1)) b++; }
    const o = { x, y, hor, min: -a * T, max: b * T, dec: (x * 29 + y * 11) % 300 };
    (plat ? plates : scies).push(o);
  }
  // lasers : un rayon vers le côté libre, allumé par moments (avec un préavis)
  const lasers = [];
  for (let i = 0; i < w * h; i++) {
    if (g[i] !== LASER) continue;
    const x = i % w, y = Math.floor(i / w);
    let dx = 0, dy = 0;
    if (libre(x, y + 1)) dy = 1; else if (libre(x, y - 1)) dy = -1; else if (libre(x + 1, y)) dx = 1; else if (libre(x - 1, y)) dx = -1;
    if (!dx && !dy) continue;
    let k = 1;
    while (k < 40 && libre(x + dx * k, y + dy * k)) k++;
    const hs = (x * 19349663 ^ y * 83492791) >>> 0;
    const per = 110 + hs % 80, on = 40 + (hs >> 7) % 30;
    lasers.push({ x, y, dx, dy, lg: (k - 1) * T, per, on, dec: (hs >> 3) % per });
  }
  // trous bouclés : tomber dans le bas ramène en haut de la même colonne (et monter dans le haut ramène en bas)
  const boucle = new Map();
  for (let i = 0; i < w * h; i++) {
    if (g[i] !== BOUCLE_B) continue;
    const x = i % w;
    for (let y = Math.floor(i / w) - 1; y >= 0; y--) if (g[y * w + x] === BOUCLE_H) { boucle.set(i, y * w + x); boucle.set(y * w + x, i); break; }
  }
  for (let i = 0; i < w * h; i++) {                 // à droite on ressort à gauche (même rangée), et inversement
    if (g[i] !== BOUCLE_D) continue;
    const y = Math.floor(i / w);
    for (let x = i % w - 1; x >= 0; x--) if (g[y * w + x] === BOUCLE_G) { boucle.set(i, y * w + x); boucle.set(y * w + x, i); break; }
  }
  Object.assign(n, { w, h, g, panneaux, tp, aEclat, fleches, porteDe, ennemis, plates, scies, lasers, boucle });
  return n;
}

const estDur = (t) => t === MUR || t === GLACE || t === TAPIS_G || t === TAPIS_D || t === FRAGILE || t === ARBALETE ||
  t === CASSANT || t === REBONDI || t === PORTE || t === BLOC_R || t === BLOC_B || t === PAROI || t === LASER || (t >= BAR_S && t <= BAR_ME) || t === BAR_GL || t === BAR_MA;

/* ---------- État ---------- */
// l'état du joueur : une forme fixe, copiée champ par champ (le robot en copie des millions)
function Etat() {
  this.f = 0; this.temps = 0; this.demarre = false; this.fini = false; this.eclat = false;
  this.casses = []; this.cristaux = []; this.craque = []; this.boutons = []; this.pieces = []; this.orbes = [];
  this.bascule = 0; this.surInter = -1; this.ban = -1; this.banT = 0; this.bonus = 1; this.bonusT = 0; this.cp = null; this.cpN = 0; this.morts = 0;
  this.inpPrev = 0; this.ev = 0; this.evX = 0; this.evY = 0;
  this.x = 0; this.y = 0; this.vx = 0; this.vy = 0; this.phase = 0; this.plat = -1; this.champCd = 0; this.charges = 0; this.gaz = 0; this.dash = 0; this.cdP = 0;
  this.att = 0; this.slam = false; this.slamAt = 0; this.coyote = 0; this.tampon = 0; this.verrou = 0; this.jetCd = 0; this.jetSide = 0;
  this.tpCd = 0; this.sol = true; this.face = 1; this.mortT = 0; this.immun = 0; this.dansEau = false; this.porte = 0; this.tremCd = 0; this.invT = 0;
  this.capCd = 0; this.grap = null; this.grapT = 0; this.tirs = []; this.perle = null; this.hover = 0; this.hoverUse = false; this.dashCA = 0; this.glaces = [];
}
function nouvelEtat(n) {
  const e = new Etat();
  placer(e, n);
  return e;
}
function placer(e, n) {
  const d = e.cp || n.dep;
  e.x = d.x; e.y = d.y; e.vx = 0; e.vy = 0; e.phase = n.base; e.plat = -1; e.champCd = 0; e.charges = K.charges; e.gaz = 0; e.dash = 0; e.cdP = 0;
  e.att = 0; e.slam = false; e.slamAt = 0; e.coyote = 0; e.tampon = 0; e.verrou = 0; e.jetCd = 0; e.jetSide = 0;
  e.tpCd = 0; e.sol = true; e.face = 1; e.mortT = 0; e.immun = 0; e.cristaux = []; e.craque = []; e.orbes = []; e.dansEau = false; e.porte = 0; e.ban = -1; e.bonus = 1; e.tremCd = 0;
  e.capCd = 0; e.grap = null; e.grapT = 0; e.tirs = []; e.perle = null; e.hover = 0; e.hoverUse = false; e.dashCA = 0; e.glaces = [];
}
// les listes ne sont jamais modifiées sur place : la copie peut les partager
function cloner(e) {
  const c = new Etat();
  c.f = e.f; c.temps = e.temps; c.demarre = e.demarre; c.fini = e.fini; c.eclat = e.eclat;
  c.casses = e.casses; c.cristaux = e.cristaux; c.craque = e.craque; c.boutons = e.boutons; c.pieces = e.pieces; c.orbes = e.orbes;
  c.bascule = e.bascule; c.surInter = e.surInter; c.ban = e.ban; c.banT = e.banT; c.bonus = e.bonus; c.bonusT = e.bonusT; c.cp = e.cp; c.cpN = e.cpN; c.morts = e.morts;
  c.inpPrev = e.inpPrev; c.ev = e.ev; c.evX = e.evX; c.evY = e.evY;
  c.x = e.x; c.y = e.y; c.vx = e.vx; c.vy = e.vy; c.phase = e.phase; c.plat = e.plat; c.champCd = e.champCd; c.charges = e.charges; c.gaz = e.gaz; c.dash = e.dash; c.cdP = e.cdP;
  c.att = e.att; c.slam = e.slam; c.slamAt = e.slamAt; c.coyote = e.coyote; c.tampon = e.tampon; c.verrou = e.verrou; c.jetCd = e.jetCd; c.jetSide = e.jetSide;
  c.tpCd = e.tpCd; c.sol = e.sol; c.face = e.face; c.mortT = e.mortT; c.immun = e.immun; c.dansEau = e.dansEau; c.porte = e.porte; c.tremCd = e.tremCd; c.invT = e.invT;
  c.capCd = e.capCd; c.grap = e.grap; c.grapT = e.grapT; c.tirs = e.tirs; c.perle = e.perle; c.hover = e.hover; c.hoverUse = e.hoverUse; c.dashCA = e.dashCA; c.glaces = e.glaces;
  return c;
}

/* ---------- Cases ---------- */
// sol cassant : il s'effondre un moment après qu'on s'y est posé, puis revient
function effondre(e, k) {
  for (const c of e.craque) if (c[0] === k) { const dt = e.temps - c[1]; return dt >= K.cassantDelai && dt < K.cassantDelai + K.cassantRetour; }
  return false;
}
// position des flèches en vol : calcul direct à partir du temps, sans état
function flechesEn(n, temps, f) {
  const out = [], P2 = f.per || K.flechePeriode, v = f.vit || K.flecheVit, raf = f.rafale || 1;
  if (temps <= 0) return out;
  let k = Math.floor((temps - f.dec) / P2);
  for (; k >= 0; k--) {
    let loin = true;
    for (let j = 0; j < raf; j++) {                     // rafale : plusieurs flèches à 12 images d'écart
      const tir = f.dec + k * P2 + j * 12, d = (temps - tir) * v;
      if (d > f.portee) continue;
      loin = false;
      if (d >= 0) out.push([f.x * T + T / 2 + f.dx * (T / 2 + d), f.y * T + T / 2 + f.dy * (T / 2 + d)]);
    }
    if (loin) break;
  }
  return out;
}
// position d'un ennemi à un instant donné (aller-retour à vitesse constante)
function ennemiEn(en, temps) {
  const L = en.max - en.min;
  if (L <= 0) return [en.x * T + 2, en.y * T + 2];
  const d = ((temps + en.dec) * K.ennemiVit) % (2 * L), o = en.min + (d < L ? d : 2 * L - d);
  return en.hor ? [en.x * T + 2 + o, en.y * T + 2] : [en.x * T + 2, en.y * T + 2 + o];
}
// plateforme mobile / scie : position (coin haut-gauche de la plateforme, centre de la scie) à un instant
function allerRetour(o, temps, vit) {
  const L2 = o.max - o.min;
  if (L2 <= 0) return 0;
  const d = ((temps + o.dec) * vit) % (2 * L2);
  return o.min + (d < L2 ? d : 2 * L2 - d);
}
function plateEn(p, temps) { const o = allerRetour(p, temps, K.platVit); return p.hor ? [p.x * T + o, p.y * T] : [p.x * T, p.y * T + o]; }
function scieEn(s2, temps) { const o = allerRetour(s2, temps, K.scieVit); return s2.hor ? [s2.x * T + T / 2 + o, s2.y * T + T / 2] : [s2.x * T + T / 2, s2.y * T + T / 2 + o]; }
// laser : 0 éteint, 1 préavis (inoffensif), 2 allumé
function laserEtat(l, temps) {
  const k = ((temps + l.dec) % l.per + l.per) % l.per;
  return k < l.on ? 2 : k > l.per - 26 ? 1 : 0;
}
function laserRect(l) {
  const ep = K.laserEp / 2, cx = l.x * T + T / 2, cy = l.y * T + T / 2;
  if (l.dx) { const x0 = l.dx > 0 ? (l.x + 1) * T : l.x * T - l.lg; return [x0, cy - ep, x0 + l.lg, cy + ep]; }
  const y0 = l.dy > 0 ? (l.y + 1) * T : l.y * T - l.lg; return [cx - ep, y0, cx + ep, y0 + l.lg];
}
// forme du joueur selon son état (dans sa boîte de 12 × 12, qu'elle touche des 4 côtés) : c'est aussi sa hitbox
// contre les dangers et les objets ; le dessin utilise exactement ces points.
const cercle12 = (() => { const p = []; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; p.push(6 + Math.cos(a) * 6, 6 + Math.sin(a) * 6); } return p; })();
const FORMES = [
  [0, 0, 12, 0, 12, 12, 0, 12],                                                                    // solide : bloc
  [6, 0, 8.6, 3.2, 10.8, 6, 12, 8.6, 11.4, 10.6, 9.6, 12, 2.4, 12, 0.6, 10.6, 0, 8.6, 1.2, 6, 3.4, 3.2],   // liquide : goutte
  [3, 0, 9, 0, 12, 3.5, 12, 8.5, 9, 12, 3, 12, 0, 8.5, 0, 3.5],                                    // gaz : nuage
  [6, 0, 12, 6, 6, 12, 0, 6],                                                                      // plasma : losange
  [3, 0, 9, 0, 12, 6, 9, 12, 3, 12, 0, 6],                                                         // plume : hexagone
  cercle12,                                                                                        // caoutchouc : balle
  [1.5, 0, 10.5, 0, 12, 1.5, 12, 10.5, 10.5, 12, 1.5, 12, 0, 10.5, 0, 1.5],                        // métal : lingot
  [6, 0, 12, 3, 12, 9, 6, 12, 0, 9, 0, 3],                                                         // ombre : cristal noir
  [6, 0, 10.2, 1.8, 12, 6, 10.2, 10.2, 6, 12, 1.8, 10.2, 0, 6, 1.8, 1.8],                          // glace : flocon
  [6, 0, 12, 4.5, 10.2, 12, 1.8, 12, 0, 4.5]                                                       // magma : roche en fusion
];
function formeJoueur(e) { const f = FORMES[e.phase] || FORMES[0], o = new Array(f.length); for (let i = 0; i < f.length; i += 2) { o[i] = f[i] + e.x; o[i + 1] = f[i + 1] + e.y; } return o; }
// deux polygones convexes se touchent-ils ? (séparation des axes)
function polyPoly(A, B) {
  for (const P2 of [A, B]) for (let i = 0; i < P2.length; i += 2) {
    const j = (i + 2) % P2.length, ax = -(P2[j + 1] - P2[i + 1]), ay = P2[j] - P2[i];
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (let k = 0; k < A.length; k += 2) { const v = A[k] * ax + A[k + 1] * ay; if (v < a0) a0 = v; if (v > a1) a1 = v; }
    for (let k = 0; k < B.length; k += 2) { const v = B[k] * ax + B[k + 1] * ay; if (v < b0) b0 = v; if (v > b1) b1 = v; }
    if (a1 <= b0 + 1e-6 || b1 <= a0 + 1e-6) return false;
  }
  return true;
}
function polyCercle(A, cx, cy, r) {
  let best = Infinity, bx = 0, by = 0;
  for (let k = 0; k < A.length; k += 2) { const d = (A[k] - cx) * (A[k] - cx) + (A[k + 1] - cy) * (A[k + 1] - cy); if (d < best) { best = d; bx = A[k]; by = A[k + 1]; } }
  const axes = [[bx - cx, by - cy]];
  for (let i = 0; i < A.length; i += 2) { const j = (i + 2) % A.length; axes.push([-(A[j + 1] - A[i + 1]), A[j] - A[i]]); }
  for (const [ax, ay] of axes) {
    const L2 = Math.hypot(ax, ay) || 1;
    let a0 = Infinity, a1 = -Infinity;
    for (let k = 0; k < A.length; k += 2) { const v = (A[k] * ax + A[k + 1] * ay) / L2; if (v < a0) a0 = v; if (v > a1) a1 = v; }
    const c = (cx * ax + cy * ay) / L2;
    if (a1 <= c - r + 1e-6 || c + r <= a0 + 1e-6) return false;
  }
  return true;
}
function rectRect(e, a, b, c, d) {
  if (!(e.x + W > a && e.x < c && e.y + H > b && e.y < d)) return false;
  return e.phase === S || polyPoly(formeJoueur(e), [a, b, c, b, c, d, a, d]);
}
function rectCercle(e, cx, cy, r) {
  const qx = Math.max(e.x, Math.min(cx, e.x + W)), qy = Math.max(e.y, Math.min(cy, e.y + H));
  if ((qx - cx) * (qx - cx) + (qy - cy) * (qy - cy) >= r * r) return false;
  return e.phase === S || polyCercle(formeJoueur(e), cx, cy, r);
}
function rectPoly(e, pts) { return polyPoly(formeJoueur(e), pts); }
// les 3 pointes d'une case de pics, exactement comme elles sont dessinées
const PICS_TRI = [0, 1, 2, 3].map(dir => {
  const a = [0, Math.PI, Math.PI / 2, -Math.PI / 2][dir], c = Math.cos(a), s2 = Math.sin(a), out = [];
  for (let i = 0; i < 3; i++) {
    const bx = -8 + i * 5.33, loc = [bx, 8, bx + 2.66, -4, bx + 5.33, 8], tri = [];
    for (let k = 0; k < 6; k += 2) tri.push(loc[k] * c - loc[k + 1] * s2 + T / 2, loc[k] * s2 + loc[k + 1] * c + T / 2);
    out.push(tri);
  }
  return out;
});
function toucherPics(n, e, tx, ty) {
  for (const tri of PICS_TRI[sensPics(n, tx, ty)]) {
    const pts = tri.map((v, i) => v + (i % 2 ? ty * T : tx * T));
    if (rectPoly(e, pts)) return true;
  }
  return false;
}
const FORME_CRISTAL = [0, -7, 5, 0, 0, 7, -5, 0];
const FORME_ECLAT = [0, -7, 6, -3.5, 6, 3.5, 0, 7, -6, 3.5, -6, -3.5];
function formeEn(f, cx, cy) { return f.map((v, i) => v + (i % 2 ? cy : cx)); }
function casse(e, i) { return e.casses.length > 0 && e.casses.indexOf(i) >= 0; }
function tuile(n, tx, ty) {
  if (tx < 0 || tx >= n.w || ty < 0) return MUR;
  if (ty >= n.h) return VIDE;
  return n.g[ty * n.w + tx];
}
function glaceEn(e, tx, ty) {
  const k = tx * 1024 + ty;
  for (const g2 of e.glaces) if (g2[0] === k && g2[1] > e.temps) return true;
  return false;
}
function plein(n, e, tx, ty) {
  if (tx < 0 || tx >= n.w || ty < 0) return true;
  if (ty >= n.h) return false;
  const i = ty * n.w + tx, t = n.g[i];
  if (e.glaces && e.glaces.length && (t === VIDE || t === EAU) && glaceEn(e, tx, ty)) return true;
  switch (t) {
    case MUR: case GLACE: case TAPIS_G: case TAPIS_D: case ARBALETE: case REBONDI: return true;
    case CASSANT: return !effondre(e, tx * 1024 + ty);
    case BLOC_R: return e.bascule === 0;
    case BLOC_B: return e.bascule === 1;
    case PORTE: { const b = n.porteDe.get(tx * 1024 + ty); return b === undefined || e.boutons.indexOf(b) < 0; }
    case FRAGILE: return !casse(e, tx * 1024 + ty);
    case LASER: return true;
    case GRILLE: case TAMIS: case PAROI: case BAR_S: case BAR_P: case BAR_PL: case BAR_CA: case BAR_ME: case BAR_GL: case BAR_MA: return e.phase !== BARRIERE[t];
    default: return false;
  }
}
// case qui bloque le mouvement ; les fragiles cèdent sous un éclair ou un fracas
function bloque(n, e, tx, ty, brise) {
  if (!plein(n, e, tx, ty)) return false;
  if (brise && tx >= 0 && tx < n.w && ty >= 0 && ty < n.h) {
    const i = ty * n.w + tx;
    if (n.g[i] === FRAGILE) {
      e.casses = e.casses.concat(tx * 1024 + ty); e.ev |= EV.CASSE; e.evX = tx; e.evY = ty;
      return false;
    }
  }
  return true;
}

function bougerX(n, e, dx) {
  e.x += dx;
  const y0 = Math.floor(e.y / T), y1 = Math.floor((e.y + H - 0.001) / T);
  const brise = e.phase === P && e.dash > 0;
  let tx, hit = false;
  if (dx > 0) {
    tx = Math.floor((e.x + W - 0.001) / T);
    for (let ty = y0; ty <= y1; ty++) if (bloque(n, e, tx, ty, brise)) { hit = true; }
    if (hit) e.x = tx * T - W;
  } else if (dx < 0) {
    tx = Math.floor(e.x / T);
    for (let ty = y0; ty <= y1; ty++) if (bloque(n, e, tx, ty, brise)) { hit = true; }
    if (hit) e.x = (tx + 1) * T;
  }
  return hit;
}
function bougerY(n, e, dy) {
  const avantBas = e.y + H;
  e.y += dy;
  const x0 = Math.floor(e.x / T), x1 = Math.floor((e.x + W - 0.001) / T);
  let ty, hit = false;
  if (dy > 0) {
    const brise = (e.phase === P && e.dash > 0) || (e.phase === S && e.slam) || (e.phase === ME && e.vy > 6.5);
    ty = Math.floor((e.y + H - 0.001) / T);
    for (let tx = x0; tx <= x1; tx++) {
      if (bloque(n, e, tx, ty, brise)) hit = true;
      else if ((tuile(n, tx, ty) === PLATE || (e.phase === GL && tuile(n, tx, ty) === EAU && tuile(n, tx, ty - 1) !== EAU)) && avantBas <= ty * T + 0.001) hit = true;
    }
    if (hit) e.y = ty * T - H;
  } else if (dy < 0) {
    const brise = e.phase === P && e.dash > 0;
    ty = Math.floor(e.y / T);
    for (let tx = x0; tx <= x1; tx++) if (bloque(n, e, tx, ty, brise)) hit = true;
    if (hit) e.y = (ty + 1) * T;
  }
  return hit;
}

// contact dans une direction (0 bas, 1 haut, 2 gauche, 3 droite) : renvoie le type de case touchée (priorité aux non-glace), ou -1
function contact(n, e, dir) {
  let found = -1;
  const note = (t) => { if (found < 0 || found === GLACE) found = t; };
  if (dir < 2) {
    const x0 = Math.floor(e.x / T), x1 = Math.floor((e.x + W - 0.001) / T);
    if (dir === 0) {
      const yb = e.y + H, ty = Math.round(yb / T);
      if (Math.abs(ty * T - yb) > 0.01) return -1;
      for (let tx = x0; tx <= x1; tx++) {
        if (plein(n, e, tx, ty)) note(tuile(n, tx, ty));
        else if (tuile(n, tx, ty) === PLATE || (e.phase === GL && tuile(n, tx, ty) === EAU && tuile(n, tx, ty - 1) !== EAU)) note(PLATE);
      }
    } else {
      const ty = Math.round(e.y / T) - 1;
      if (Math.abs((ty + 1) * T - e.y) > 0.01) return -1;
      for (let tx = x0; tx <= x1; tx++) if (plein(n, e, tx, ty)) note(tuile(n, tx, ty));
    }
  } else {
    const y0 = Math.floor(e.y / T), y1 = Math.floor((e.y + H - 0.001) / T);
    let tx;
    if (dir === 2) { tx = Math.round(e.x / T) - 1; if (Math.abs((tx + 1) * T - e.x) > 0.01) return -1; }
    else { tx = Math.round((e.x + W) / T); if (Math.abs(tx * T - (e.x + W)) > 0.01) return -1; }
    for (let ty = y0; ty <= y1; ty++) if (plein(n, e, tx, ty)) note(tuile(n, tx, ty));
  }
  return found;
}
const collant = (t) => t >= 0 && t !== GLACE && t !== PLATE;

// partie mortelle d'une case de pics : seulement les pointes visibles, selon leur sens
const durs = estDur;
function sensPics(n, tx, ty) {
  if (durs(tuile(n, tx, ty + 1))) return 0;        // vers le haut
  if (durs(tuile(n, tx, ty - 1))) return 1;        // vers le bas
  if (durs(tuile(n, tx - 1, ty))) return 2;        // vers la droite
  if (durs(tuile(n, tx + 1, ty))) return 3;        // vers la gauche
  return 0;
}
function zonePics(n, tx, ty) {
  const bx = tx * T, by = ty * T;
  switch (sensPics(n, tx, ty)) {
    case 0: return [bx + 1.5, by + 7, bx + 14.5, by + 16];
    case 1: return [bx + 1.5, by, bx + 14.5, by + 9];
    case 2: return [bx, by + 1.5, bx + 9, by + 14.5];
    default: return [bx + 7, by + 1.5, bx + 16, by + 14.5];
  }
}

function mulSaut(e) { return e.temps < e.bonusT ? e.bonus : 1; }
function approche(v, c, d) { return v < c ? Math.min(c, v + d) : Math.max(c, v - d); }

// devenir un état qui ne passe pas là où l'on se trouve : écrasé
function ecrase(n, e) {
  const ax = Math.floor(e.x / T), bx = Math.floor((e.x + W - 0.001) / T), ay = Math.floor(e.y / T), by = Math.floor((e.y + H - 0.001) / T);
  for (let ty = ay; ty <= by; ty++) for (let tx = ax; tx <= bx; tx++) if (BARRIERE[tuile(n, tx, ty)] !== undefined && plein(n, e, tx, ty)) { mourir(e, true); return; }
}
function retour(n, e) { e.phase = n.base; e.dash = 0; e.gaz = 0; e.ev |= EV.CHANGE; ecrase(n, e); }
function mourir(e, force) {
  if (e.mortT > 0) return;
  if (e.invT > 0 && !force) return;
  e.mortT = 20; e.morts++; e.ev |= EV.MORT; e.evX = e.x + W / 2; e.evY = e.y + H / 2;
}

/* ---------- Changement d'état ---------- */
function changer(n, e, vers, h, v) {
  const avant = e.phase;
  if (vers === P) {
    let dx = h, dy = v;
    if (!dx && !dy) dx = e.face;
    const k = (dx && dy) ? Math.SQRT1_2 : 1;
    e.vx = dx * k * K.pVit; e.vy = dy * k * K.pVit;
    e.dash = K.pDuree; e.phase = P; e.att = 0; e.slam = false; e.gaz = 0;
  } else {
    e.phase = vers; e.dash = 0; e.slam = false;
    if (vers === OM) { e.gaz = K.omDuree; e.vx *= 0.5; e.vy *= 0.5; }
    else if (vers === Z) {
      e.gaz = K.zDuree;
      if (!e.sol && avant !== P && avant !== Z) e.vy = Math.max(-2.6, Math.min(e.vy, 0) - K.zBouffee);
    } else if (vers !== OM) e.gaz = 0;
    if (vers !== L) e.att = 0;
  }
  e.ev |= EV.CHANGE;
  ecrase(n, e);
}

/* ---------- Compétences : réappuyer sur la touche de l'état actuel ---------- */
function capacite(n, e, h, v) {
  if (e.capCd > 0) { e.ev |= EV.ECHEC; return; }
  const ph = e.phase, cxp = e.x + W / 2, cyp = e.y + H / 2;
  const payer = () => { if (e.charges <= 0) { e.ev |= EV.ECHEC; return false; } e.charges--; e.capCd = K.capCd; e.ev |= EV.CAPA; return true; };
  if (ph === S) {                                     // grappin : s'accroche au premier mur dans la direction visée
    let dx = h, dy = v; if (!dx && !dy) { dx = e.face; dy = -1; }
    const k = Math.hypot(dx, dy); dx /= k; dy /= k;
    let ax = -1, ay = -1;
    for (let d = 8; d <= K.grapPortee * T; d += 4) {
      const px = cxp + dx * d, py = cyp + dy * d;
      if (plein(n, e, Math.floor(px / T), Math.floor(py / T))) { ax = px - dx * 2; ay = py - dy * 2; break; }
    }
    if (ax < 0) { e.ev |= EV.ECHEC; return; }
    if (!payer()) return;
    e.grap = [ax, ay]; e.grapT = K.grapDuree; e.slam = false; e.att = 0;
  } else if (ph === L) {                              // rafale : 3 jets qui actionnent boutons et interrupteurs
    if (!payer()) return;
    let dx = h, dy = v; if (!dx && !dy) dx = e.face;
    const k = Math.hypot(dx, dy); dx /= k; dy /= k;
    e.tirs = e.tirs.concat([0, 5, 10].map(r => [cxp, cyp, dx * K.tirVit, dy * K.tirVit, K.tirVie + r, r]));
  } else if (ph === Z) {                              // souffle : grosse poussée à l'opposé de la direction visée
    if (!payer()) return;
    let dx = h, dy = v; if (!dx && !dy) dy = 1;
    const k = Math.hypot(dx, dy);
    e.vx = -dx / k * K.souffle; e.vy = -dy / k * K.souffle; e.sol = false; e.plat = -1; e.ev |= EV.BOUM; e.evX = cxp; e.evY = cyp;
  } else if (ph === P) {                              // éclair enchaîné dans une nouvelle direction
    if (!payer()) return;
    changer(n, e, P, h, v);
  } else if (ph === PL) {                             // suspension : immobile en l'air, recharge une charge
    if (e.sol || e.hoverUse) { e.ev |= EV.ECHEC; return; }
    e.hover = K.hover; e.hoverUse = true; e.capCd = K.capCd; e.ev |= EV.CAPA;
  } else if (ph === CA) {                             // dash rebondissant
    if (!payer()) return;
    e.dashCA = K.dashCAt; e.vx = (h || e.face) * K.dashCA; e.vy = 0;
  } else if (ph === ME) {                             // marteau : écrasement immédiat, brise les blocs fêlés
    if (!payer()) return;
    e.vy = K.marteau; e.vx *= 0.3; e.ev |= EV.FRACAS;
  } else if (ph === OM) {                             // perle : lancée, on se téléporte où elle s'arrête
    if (!payer()) return;
    e.perle = [cxp, cyp, (h || e.face) * K.perleVx, v > 0 ? 4 : v < 0 ? -5.5 : K.perleVy, K.perleVie];
  } else if (ph === GL) {                             // bloc de glace sous les pieds (ou devant, au sol)
    if (!payer()) return;
    let tx = Math.floor(cxp / T), ty = Math.floor((e.y + H + 1) / T);
    if (plein(n, e, tx, ty)) { tx = Math.floor((cxp + e.face * T) / T); ty = Math.floor(cyp / T); }
    if (!plein(n, e, tx, ty) && (tuile(n, tx, ty) === VIDE || tuile(n, tx, ty) === EAU)) e.glaces = e.glaces.filter(g2 => g2[1] > e.temps).concat([[tx * 1024 + ty, e.temps + K.glaceVie]]);
  } else if (ph === MA) {                             // explosion : brise les blocs fêlés autour, petit bond
    if (!payer()) return;
    const r = K.explosion, x0 = Math.floor(cxp / T - r), x1 = Math.floor(cxp / T + r), y0 = Math.floor(cyp / T - r), y1 = Math.floor(cyp / T + r);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (tuile(n, tx, ty) === FRAGILE && !casse(e, tx * 1024 + ty) && Math.hypot(tx * T + T / 2 - cxp, ty * T + T / 2 - cyp) <= r * T) { e.casses = e.casses.concat(tx * 1024 + ty); e.ev |= EV.CASSE; }
    }
    e.vy = Math.min(e.vy, -5.5); e.sol = false; e.plat = -1; e.ev |= EV.BOUM; e.evX = cxp; e.evY = cyp;
  }
}
// projectiles des compétences (jets du liquide, perle de l'ombre)
function projectiles(n, e) {
  if (e.tirs.length) {
    const out = [];
    for (const t of e.tirs) {
      if (t[5] > 0) { out.push([t[0], t[1], t[2], t[3], t[4], t[5] - 1]); continue; }
      const x = t[0] + t[2], y = t[1] + t[3], vie = t[4] - 1;
      const tx = Math.floor(x / T), ty = Math.floor(y / T), k = tx * 1024 + ty, tt = tuile(n, tx, ty);
      if (tt === BOUTON && e.boutons.indexOf(k) < 0) { e.boutons = e.boutons.concat(k); e.ev |= EV.BOUTON; e.evX = tx; e.evY = ty; continue; }
      if (tt === INTER) { e.bascule ^= 1; e.ev |= EV.BASCULE; e.evX = tx; e.evY = ty; continue; }
      if (vie <= 0 || plein(n, e, tx, ty)) continue;
      out.push([x, y, t[2], t[3], vie, 0]);
    }
    e.tirs = out;
  }
  if (e.perle) {
    const [x0, y0, vx, vy, vie] = e.perle;
    const x = x0 + vx, y = y0 + vy, tx = Math.floor(x / T), ty = Math.floor(y / T);
    if (vie <= 0 || plein(n, e, tx, ty) || tuile(n, tx, ty) === PICS) {
      // téléportation au dernier point libre de la perle
      let px = x0 - W / 2, py = y0 - H / 2;
      const libreB = (ax, ay) => { for (const [qx, qy] of [[ax, ay], [ax + W - 0.01, ay], [ax, ay + H - 0.01], [ax + W - 0.01, ay + H - 0.01]]) if (plein(n, e, Math.floor(qx / T), Math.floor(qy / T))) return false; return true; };
      for (let k2 = 0; k2 < 12 && !libreB(px, py); k2++) { px -= Math.sign(vx) * 2; py -= Math.sign(vy) * 2; }
      if (libreB(px, py)) { e.evX = e.x + W / 2; e.evY = e.y + H / 2; e.x = px; e.y = py; e.vx *= 0.5; e.vy = 0; e.plat = -1; e.ev |= EV.TP; }
      e.perle = null;
    } else e.perle = [x, y, vx, vy + 0.25, vie - 1];
  }
  if (e.glaces.length && e.glaces[0][1] <= e.temps) e.glaces = e.glaces.filter(g2 => g2[1] > e.temps);
}

/* ---------- Un pas de simulation ---------- */
function pas(n, e, inp) {
  e.ev = 0;
  if (e.fini) return;
  e.f++;
  const presse = inp & ~e.inpPrev;
  e.inpPrev = inp;
  if (!e.demarre) { if (!inp) return; e.demarre = true; }
  e.temps++;
  if (e.mortT > 0) { if (--e.mortT === 0) { placer(e, n); e.invT = K.invincible; e.ev |= EV.INVINCIBLE; } return; }
  if (e.invT > 0) e.invT--;

  if (e.craque.length && e.temps - e.craque[0][1] >= K.cassantDelai + K.cassantRetour) e.craque = e.craque.filter(c => e.temps - c[1] < K.cassantDelai + K.cassantRetour);
  if (e.cristaux.length && e.cristaux[0][1] <= e.temps) e.cristaux = e.cristaux.filter(c => c[1] > e.temps);
  if (e.jetCd > 0) e.jetCd--;
  if (e.tpCd > 0) e.tpCd--;
  if (e.immun > 0) e.immun--;
  if (e.cdP > 0) e.cdP--;
  if (e.slamAt > 0) e.slamAt--;

  let h = ((inp & E.D) ? 1 : 0) - ((inp & E.G) ? 1 : 0);
  const v = ((inp & E.B) ? 1 : 0) - ((inp & E.H) ? 1 : 0);
  if (h) e.face = h;
  if (presse & E.SAUT) e.tampon = 8; else if (e.tampon > 0) e.tampon--;
  if (e.verrou > 0) { e.verrou--; h = 0; }

  // milieu : eau, vent
  const cx = Math.floor((e.x + W / 2) / T), cy = Math.floor((e.y + H / 2) / T);
  const milieu = tuile(n, cx, cy);
  const eau = milieu === EAU;
  if (eau && !e.dansEau) e.ev |= EV.NAGE;
  e.dansEau = eau;

  // changements d'état demandés
  let vers = -1;
  if (e.capCd > 0) e.capCd--;
  if (presse & E.S) vers = n.emplacements[0]; else if (presse & E.L) vers = n.emplacements[1]; else if (presse & E.Z) vers = n.emplacements[2];
  if (vers >= 0 && vers === n.emplacements[0] && n.emplacements.length > 3 && (presse & E.P)) vers = n.emplacements[3];
  if (vers < 0 && (presse & E.P) && n.emplacements.length > 3) vers = n.emplacements[3];
  if (vers >= 0 && e.ban === vers && e.temps < e.banT) { e.ev |= EV.ECHEC; vers = -1; }
  if (vers >= 0 && vers === e.phase) { if (n.capacites) capacite(n, e, h, v); }   // déjà dans cet état : sa compétence (si le niveau les permet)
  else if (vers >= 0 && (n.phases & (1 << vers))) {
    if (vers === P && e.cdP > 0) { /* pas deux éclairs collés */ }
    else if (e.charges > 0) { e.charges--; e.grap = null; e.hover = 0; e.dashCA = 0; changer(n, e, vers, h, v); }
    else { e.ev |= EV.ECHEC; }
  }

  // porté par une plateforme mobile
  if (e.plat >= 0) {
    const pl = n.plates[e.plat], [px, py] = plateEn(pl, e.temps), [qx, qy] = plateEn(pl, e.temps - 1);
    if (e.x + W > qx && e.x < qx + K.platLarg * T && Math.abs(e.y + H - qy) < 0.6) {
      if (px !== qx) bougerX(n, e, px - qx);
      if (py !== qy) bougerY(n, e, py - qy);
    } else { e.plat = -1; e.sol = false; }
  }
  const sol0 = e.sol;
  let porte = 0;
  if (sol0) {
    const sous = contact(n, e, 0);
    if (sous === TAPIS_G) porte = -K.tapis; else if (sous === TAPIS_D) porte = K.tapis;
  }
  const glace = sol0 && contact(n, e, 0) === GLACE;

  /* ----- commandes selon l'état ----- */
  if (e.phase === S) {
    if (eau) {
      e.slam = false;
      e.vx = approche(e.vx, h * 1.8, 0.2);
      e.vy = Math.min(e.vy + 0.16, 2.2);
      if (e.tampon > 0) { e.vy = -3.6; e.tampon = 0; e.ev |= EV.SAUT; }
    } else {
      const max = K.sCourse;
      if (h !== 0) {
        if (Math.sign(e.vx) === h && Math.abs(e.vx) > max) e.vx -= h * (sol0 ? (glace ? 0.004 : K.sAuDela) : K.sAuDelaAir);
        else if (sol0 && e.vx !== 0 && Math.sign(e.vx) !== h) e.vx = approche(e.vx, 0, glace ? 0.05 : K.sDemiTour);
        else e.vx = approche(e.vx, h * max, sol0 ? (glace ? 0.04 : K.sAccSol) : K.sAccAir);
      } else e.vx = approche(e.vx, 0, sol0 ? (glace ? 0.02 : K.sFrein) : K.sFreinAir);
      // gravité
      const tient = (inp & E.SAUT) && e.vy < 0;
      e.vy += e.slam ? 0.9 : (tient ? K.gMonte : K.gChute);
      // mur
      const cG = sol0 ? -1 : contact(n, e, 2), cD = sol0 ? -1 : contact(n, e, 3);
      let maxChute = e.slam ? K.fracasMax : K.chuteMax;
      if (!e.slam && ((h < 0 && collant(cG)) || (h > 0 && collant(cD)))) maxChute = K.glisseMur;
      if (e.vy > maxChute) e.vy = Math.max(maxChute, e.vy - 0.9);
      if (sol0) e.coyote = 6; else if (e.coyote > 0) e.coyote--;
      if (e.tampon > 0) {
        if (sol0 || e.coyote > 0) {
          const reb = e.slamAt > 0;
          e.vy = -(reb ? K.rebond : K.saut) * mulSaut(e); e.tampon = 0; e.coyote = 0; e.sol = false; e.slamAt = 0;
          e.vx += porte; e.ev |= reb ? EV.REBOND : EV.SAUT;
        } else if (cG >= 0 || cD >= 0) {
          const loin = cG >= 0 ? 1 : -1;
          e.vy = -K.murVy * mulSaut(e); e.vx = loin * Math.max(K.murVx, Math.abs(e.vx) * 0.5); e.face = loin; e.verrou = 6;
          e.tampon = 0; e.slam = false; e.ev |= EV.MUR; e.evX = loin;
        }
      }
      if (!sol0 && !e.slam && (presse & E.B)) {
        e.slam = true; e.vy = Math.max(e.vy, K.fracas); e.vx *= 0.4; e.ev |= EV.FRACAS;
      }
    }
  } else if (e.phase === L) {
    if (eau) {
      e.att = 0;
      e.vx = approche(e.vx, h * K.lNage, 0.45);
      e.vy = approche(e.vy, v * K.lNage, 0.45);
    } else if (e.att === 1 || e.att === 2) {
      const side = e.att === 1 ? -1 : 1;
      if (e.tampon > 0) {
        e.vx = -side * K.lJetVx; e.vy = -K.lJetVy; e.att = 0; e.jetCd = 10; e.jetSide = side; e.tampon = 0;
        e.face = -side; e.ev |= EV.JET;
      } else if (h === -side) {
        e.vx = -side * 1.6; e.att = 0; e.jetCd = 8; e.jetSide = side;
      } else {
        const r = K.lRampe;
        if (v !== 0 && Math.sign(e.vy) === v && Math.abs(e.vy) > r) e.vy -= v * 0.04;
        else if (v === 0 && Math.abs(e.vy) > r) e.vy -= Math.sign(e.vy) * K.lDecroit;
        else e.vy = approche(e.vy, v * r, 0.35);
        e.vx = side * 0.5;
      }
    } else if (e.att === 3) {
      if (e.tampon > 0 || v > 0) { e.att = 0; e.vy = 1.4; e.jetCd = 8; e.jetSide = 0; e.tampon = 0; }
      else {
        const r = K.lRampe;
        if (h !== 0 && Math.sign(e.vx) === h && Math.abs(e.vx) > r) e.vx -= h * 0.04;
        else if (h === 0 && Math.abs(e.vx) > r) e.vx -= Math.sign(e.vx) * K.lDecroit;
        else e.vx = approche(e.vx, h * r, 0.35);
        e.vy = -0.5;
      }
    } else {
      const max = K.lCourse;
      if (h !== 0) {
        if (Math.sign(e.vx) === h && Math.abs(e.vx) > max) e.vx -= h * K.lAuDela;
        else e.vx = approche(e.vx, h * max, sol0 ? (glace ? 0.03 : K.lAcc) : K.lAccAir);
      } else e.vx = approche(e.vx, 0, sol0 ? (glace ? 0.006 : K.lFrein) : 0.03);
      e.vy = Math.min(e.vy + K.lGrav, K.chuteMax);
      if (sol0) e.coyote = 6; else if (e.coyote > 0) e.coyote--;
      if (e.tampon > 0 && (sol0 || e.coyote > 0)) {
        e.vy = -K.lGiclee * mulSaut(e); e.tampon = 0; e.coyote = 0; e.vx += porte; e.ev |= EV.SAUT;
      }
    }
  } else if (e.phase === Z) {
    if (eau) {
      e.vy = approche(e.vy, -4.6, 0.6);
      e.vx = approche(e.vx, h * 2, 0.3);
    } else {
      e.vy += -K.zGrav + (v > 0 ? 0.38 : 0) + (v < 0 ? -0.08 : 0);
      const monte = v < 0 ? -3.2 : -K.zMonteMax;
      if (e.vy < monte) e.vy = Math.min(monte, e.vy + 0.16);
      if (e.vy > 3.4) e.vy = 3.4;
      if (e.vy < -5.5) e.vy = -5.5;
      if (h !== 0) {
        if (Math.sign(e.vx) === h && Math.abs(e.vx) > K.zCourse) e.vx -= h * 0.05;
        else e.vx = approche(e.vx, h * K.zCourse, K.zAcc);
      } else e.vx = approche(e.vx, 0, 0.07);
    }
    if (--e.gaz <= 0) retour(n, e);
  } else if (e.phase === PL || e.phase === CA || e.phase === ME || e.phase === GL || e.phase === MA) {
    const pl = e.phase === PL, ca = e.phase === CA, me = e.phase === ME, gl = e.phase === GL, ma = e.phase === MA;
    if (eau) {
      e.vx = approche(e.vx, h * (me ? 2.2 : 1.8), 0.2);
      e.vy = me ? Math.min(e.vy + 0.4, 5) : Math.min(e.vy + (pl ? 0.06 : 0.16), pl ? 1 : 2.2);
      if (e.tampon > 0) { e.vy = me ? -2.6 : -3.6; e.tampon = 0; e.ev |= EV.SAUT; }
    } else {
      const max = pl ? K.plCourse : ca ? K.caCourse : gl ? K.glCourse : ma ? K.maCourse : K.meCourse;
      const acc = gl ? (sol0 ? K.glAcc : 0.2) : sol0 ? (glace ? 0.05 : (me ? 0.3 : 0.38)) : (pl ? 0.32 : me ? 0.18 : 0.28);
      if (h !== 0) {
        if (Math.sign(e.vx) === h && Math.abs(e.vx) > max) e.vx -= h * (sol0 ? (gl ? 0.01 : 0.1) : 0.02);
        else e.vx = approche(e.vx, h * max, acc);
      } else e.vx = approche(e.vx, 0, gl ? (sol0 ? K.glFrein : 0.03) : sol0 ? (glace ? 0.02 : 0.45) : (pl ? 0.04 : 0.08));
      const tient = (inp & E.SAUT) && e.vy < 0;
      if (pl) {                                   // plume : chute très lente, Bas pour descendre vite
        e.vy += tient ? 0.2 : 0.16;
        const lim = v > 0 ? 4 : K.plChute;
        if (e.vy > lim) e.vy = Math.max(lim, e.vy - 0.3);
      } else if (me) {                            // métal : lourd
        e.vy = Math.min(e.vy + (tient ? K.meMonte : K.meChute), K.meChuteMax);
      } else {                                    // caoutchouc
        e.vy = Math.min(e.vy + (tient ? K.gMonte : K.gChute), K.chuteMax);
      }
      if (sol0) e.coyote = 6; else if (e.coyote > 0) e.coyote--;
      if (e.tampon > 0 && (sol0 || e.coyote > 0)) {
        e.vy = -(pl ? K.plSaut : me ? K.meSaut : ma ? K.maSaut : K.saut) * mulSaut(e); e.tampon = 0; e.coyote = 0; e.sol = false; e.vx += porte; e.ev |= EV.SAUT;
      }
    }
  } else if (e.phase === OM) {                  // ombre : vol libre, traverse les parois spectrales, puis redevient solide
    e.vx = approche(e.vx, h * K.omVit, 0.4);
    e.vy = approche(e.vy, v * K.omVit, 0.4);
    if (--e.gaz <= 0) retour(n, e);           // dans une paroi au mauvais moment : écrasé
  } else { // plasma
    if (e.tampon > 0 && sol0) {
      e.phase = n.base; e.dash = 0; e.cdP = K.pRecharge; e.vy = -5.8;
      e.vx = Math.sign(e.vx || e.face) * Math.min(Math.abs(e.vx) + 0.8, 8);
      e.tampon = 0; e.sol = false; e.ev |= EV.SAUT;
    } else if (--e.dash <= 0) {
      e.cdP = K.pRecharge; retour(n, e);
      if (Math.abs(e.vx) > K.pSortie) e.vx = Math.sign(e.vx) * K.pSortie;
      if (e.vy < 0) e.vy *= 0.45; else e.vy = Math.min(e.vy, 4);
    }
  }

  // compétences en cours
  if (e.grap) {
    const dx = e.grap[0] - (e.x + W / 2), dy = e.grap[1] - (e.y + H / 2), d = Math.hypot(dx, dy);
    if (d < 9 || --e.grapT <= 0 || e.tampon > 0) {
      if (e.tampon > 0) { e.vy = Math.min(e.vy, -4.5); e.tampon = 0; e.ev |= EV.SAUT; }
      e.grap = null;
    } else { e.vx = dx / d * K.grapVit; e.vy = dy / d * K.grapVit; }
  }
  if (e.hover > 0) {
    e.vx = 0; e.vy = 0;
    if (--e.hover === K.hover - K.hoverRecharge && e.charges < K.charges) { e.charges++; e.ev |= EV.CRISTAL; e.evX = Math.floor((e.x + W / 2) / T); e.evY = Math.floor((e.y + H / 2) / T); }
    if (e.tampon > 0) { e.hover = 0; }
  }
  if (e.dashCA > 0) { e.dashCA--; e.vy = 0; }
  if (e.sol || e.att) e.hoverUse = false;
  if (e.tirs.length || e.perle || e.glaces.length) projectiles(n, e);

  // vent
  if (milieu >= VENT_D && milieu <= VENT_B && !(e.phase === P && e.dash > 0)) {
    const f = K.vent[e.phase] * ((e.phase === L && e.att) ? 0 : 1);
    const m = K.ventMax;
    if (milieu === VENT_D && e.vx < m) e.vx = Math.min(m, e.vx + f);
    else if (milieu === VENT_G && e.vx > -m) e.vx = Math.max(-m, e.vx - f);
    else if (milieu === VENT_H && e.vy > -m) e.vy = Math.max(-m, e.vy - f - (e.phase === Z ? 0 : 0.0));
    else if (milieu === VENT_B && e.vy < m) e.vy = Math.min(m, e.vy + f);
  }

  /* ----- déplacement ----- */
  const vxPre = e.vx, vyPre = e.vy, basAvant = e.y + H;
  let mx = e.vx + (sol0 && e.phase !== Z ? porte : 0), my = e.vy;
  const nPas = Math.max(1, Math.ceil(Math.max(Math.abs(mx), Math.abs(my)) / 4));
  let hitX = false, hitBas = false, hitHaut = false;
  for (let i = 0; i < nPas; i++) {
    if (mx && bougerX(n, e, mx / nPas)) { hitX = true; mx = 0; }
    if (my && bougerY(n, e, my / nPas)) { if (my > 0) hitBas = true; else hitHaut = true; my = 0; }
  }
  if (hitX) e.vx = 0;
  if (hitBas || hitHaut) e.vy = 0;

  // caoutchouc : rebondit sur le sol et les murs ; sauter à l'impact rebondit plus haut
  if (e.phase === CA) {
    if (hitBas && vyPre > 1.8) {
      e.vy = -Math.min(11.5, vyPre * K.caRebond + ((inp & E.SAUT) || e.tampon > 0 ? K.caPousse : 0)); e.tampon = 0;
      e.ev |= EV.BOND; e.evX = e.x + W / 2; e.evY = e.y + H;
    }
    if (hitX && Math.abs(vxPre) > 1.6) { e.vx = -vxPre * K.caMur; e.ev |= EV.BOND; e.evX = e.x + W / 2; e.evY = e.y + H / 2; }
  }
  // sol rebondissant : on repart vers le haut (sauf le gaz)
  if (hitBas && e.phase !== Z && e.phase !== OM && vyPre > 1) {
    const sous = contact(n, e, 0);
    if (sous === REBONDI) {
      e.vy = -Math.max(K.rebondMin, vyPre * 0.9 + (e.slam ? 2 : 0)); e.slam = false; e.att = 0;
      if (e.phase === P) { e.phase = n.base; e.dash = 0; e.cdP = K.pRecharge; }
      e.charges = K.charges; e.ev |= EV.BOND; e.evX = e.x + W / 2; e.evY = e.y + H;
    }
  }
  // atterrir sur une plateforme mobile (on ne la heurte que par le dessus)
  let surPlat = -1;
  if (n.plates.length && e.vy >= 0 && e.phase !== Z && e.phase !== OM) {
    for (let i = 0; i < n.plates.length; i++) {
      const pl = n.plates[i];
      if (Math.abs(pl.x * T - e.x) > 48 * T) continue;
      const [px, py] = plateEn(pl, e.temps);
      if (e.x + W <= px || e.x >= px + K.platLarg * T) continue;
      if (basAvant <= py + 0.6 && e.y + H >= py) {
        if (!(e.vy === 0 && e.sol && e.plat !== i && contact(n, e, 0) >= 0)) { e.y = py - H; e.vy = 0; surPlat = i; break; }
      }
    }
  }
  e.plat = surPlat;
  const sol = (contact(n, e, 0) >= 0 && e.vy >= 0) || surPlat >= 0;
  if (sol) {                                   // on se pose sur un sol cassant : il va céder
    const x0 = Math.floor(e.x / T), x1 = Math.floor((e.x + W - 0.001) / T), ty = Math.round((e.y + H) / T);
    for (let tx = x0; tx <= x1; tx++) if (tuile(n, tx, ty) === CASSANT) {
      const k = tx * 1024 + ty;
      if (!e.craque.some(c => c[0] === k)) { e.craque = e.craque.concat([[k, e.temps]]); e.ev |= EV.CRAQUE; e.evX = tx; e.evY = ty; }
    }
  }
  e.sol = sol;
  if (sol && !sol0) {
    e.ev |= EV.ATTERRIT;
    if (e.phase === S && e.slam) { e.slam = false; e.slamAt = 7; }
  }
  if (sol && e.phase === S) e.slam = false;

  // liquide : s'accrocher aux murs et plafonds, convertir la vitesse
  if (e.phase === L && !eau) {
    const cG = contact(n, e, 2), cD = contact(n, e, 3), cH = contact(n, e, 1);
    if (sol && !sol0 && vyPre > 3.2 && h !== 0) {             // éclaboussure : la chute devient de l'élan
      const vit = Math.max(Math.sign(e.vx) === h ? Math.abs(e.vx) : 0, vyPre * 0.75);
      e.vx = h * Math.min(K.lConvMax, vit); e.ev |= EV.CONVERSION;
    }
    if ((e.att === 1 && !collant(cG)) || (e.att === 2 && !collant(cD))) {
      const side = e.att === 1 ? -1 : 1;
      e.att = 0;
      if (e.vy < -0.3 && !sol) { e.vx = side * 1.9; e.vy = Math.min(e.vy, -2.9); }
    }
    if (e.att === 3 && !collant(cH)) e.att = 0;
    if ((e.att === 1 || e.att === 2) && collant(cH) && v < 0) {   // coin intérieur : du mur au plafond
      const side = e.att === 1 ? -1 : 1;
      e.vx = -side * Math.min(K.lConvMax, Math.max(Math.abs(vyPre), K.lRampe) * K.lConv); e.vy = -0.5; e.att = 3;
      if (Math.abs(vyPre) > 2) e.ev |= EV.CONVERSION;
    } else if (e.att === 3 && hitX) {                            // du plafond au mur
      const side = vxPre < 0 ? -1 : 1;
      e.att = side < 0 ? 1 : 2; e.vy = v > 0 ? Math.abs(vxPre) * K.lConv : 0; e.vx = side * 0.5;
    }
    if (e.att === 0) {
      const libreG = !(e.jetCd > 0 && e.jetSide === -1), libreD = !(e.jetCd > 0 && e.jetSide === 1);
      const accroche = (side) => {
        const vh = Math.abs(vxPre);
        if (vh > Math.abs(e.vy)) { e.vy = (v > 0 ? 1 : -1) * Math.min(K.lConvMax, vh * K.lConv); if (vh > 2) e.ev |= EV.CONVERSION; }
        e.att = side < 0 ? 1 : 2; e.vx = side * 0.5; e.sol = false;
      };
      if (collant(cG) && libreG && (!sol || h < 0)) accroche(-1);
      else if (collant(cD) && libreD && (!sol || h > 0)) accroche(1);
      else if (collant(cH) && !sol && !(e.jetCd > 0 && e.jetSide === 0) && vyPre <= 0) {
        const vit = Math.max(Math.abs(vyPre), Math.abs(e.vx));
        const dir = h || Math.sign(e.vx) || e.face;
        if (Math.abs(vyPre) > Math.abs(e.vx)) { e.vx = dir * Math.min(K.lConvMax, vit * K.lConv); if (vit > 2) e.ev |= EV.CONVERSION; }
        e.vy = -0.5; e.att = 3;
      }
    } else if ((e.att === 1 || e.att === 2) && sol && v > 0) e.att = 0;
  } else if (e.phase !== L) e.att = 0;

  // recharge au sol
  if (e.sol && e.phase !== Z && e.phase !== P && e.phase !== OM && e.charges < K.charges) e.charges = K.charges;

  /* ----- cases spéciales touchées ----- */
  // orbes : il suffit d'appuyer sur saut (ou de l'avoir pressé juste avant) quand le centre est assez près
  if (e.tampon > 0 && e.phase !== Z && e.phase !== OM) {
    const pcx = e.x + W / 2, pcy = e.y + H / 2, gx = Math.floor(pcx / T), gy = Math.floor(pcy / T);
    orbe: for (let ty = gy - 1; ty <= gy + 1; ty++) for (let tx = gx - 1; tx <= gx + 1; tx++) {
      if (tuile(n, tx, ty) !== ORBE) continue;
      const k = tx * 1024 + ty;
      if (!rectCercle(e, tx * T + T / 2, ty * T + T / 2, K.orbeRayon)) continue;
      if (e.orbes.some(o => o[0] === k && e.temps - o[1] < K.orbeRecharge)) continue;
      if (e.phase === P) { e.phase = n.base; e.dash = 0; e.cdP = K.pRecharge; }
      e.vy = -K.saut * mulSaut(e); e.tampon = 0; e.slam = false; e.att = 0; e.sol = false;
      e.orbes = e.orbes.filter(o => e.temps - o[1] < K.orbeRecharge).concat([[k, e.temps]]);
      e.ev |= EV.ORBE; e.evX = tx; e.evY = ty;
      break orbe;
    }
  }
  let touchInter = -1;
  const x0 = Math.floor(e.x / T), x1 = Math.floor((e.x + W - 0.001) / T);
  const y0 = Math.floor(e.y / T), y1 = Math.floor((e.y + H - 0.001) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const t = tuile(n, tx, ty);
    if (t <= MUR || t === GRILLE || t === TAMIS || t === EAU || t === PLATE || (t >= VENT_D && t <= VENT_B) || estDur(t)) continue;
    const bx = tx * T, by = ty * T;
    const dans = (m) => e.x + W > bx + m && e.x < bx + T - m && e.y + H > by + m && e.y < by + T - m;
    if (t === PICS) {
      if (toucherPics(n, e, tx, ty)) mourir(e);
    }
    else if (t === FEU) {
      if (!rectRect(e, bx, by + 4, bx + T, by + T) || e.immun > 0) continue;
      if (e.phase === ME || e.phase === P || e.phase === MA) { /* insensible */ }
      else if (e.phase !== L && e.phase !== Z) mourir(e);
      else if (e.phase === L) {                               // l'eau s'évapore : elle devient gaz
        e.phase = Z; e.gaz = K.zDuree; e.vy = -3; e.att = 0; e.immun = 10; e.ev |= EV.EVAPORE; e.evX = tx; e.evY = ty;
      } else if (e.phase === Z) {                              // la vapeur explose : propulsion
        let dx = e.x + W / 2 - (bx + T / 2), dy = e.y + H / 2 - (by + T / 2);
        const d = Math.hypot(dx, dy) || 1;
        if (d < 0.5) { dx = 0; dy = -1; } else { dx /= d; dy /= d; }
        e.vx = dx * K.boum + e.vx * 0.2; e.vy = dy * K.boum - 1.2; e.phase = n.base; e.gaz = 0; e.immun = 12; e.sol = false;
        e.ev |= EV.BOUM; e.evX = tx; e.evY = ty;
      }
    } else if (t === RESSORT) {
      if (!rectRect(e, bx + 1, by + 5, bx + T - 1, by + T) || e.vy < 0 || e.dansEau) continue;
      const fort = e.phase === S && (e.slam || e.slamAt > 0);
      if (e.phase === Z) e.vy = -4.6;
      else { e.vy = -(fort ? K.ressortFracas : K.ressort); if (e.phase === P) { e.phase = n.base; e.dash = 0; e.cdP = K.pRecharge; } }
      e.slam = false; e.slamAt = 0; e.sol = false; e.att = 0; e.charges = K.charges; e.ev |= EV.RESSORT; e.evX = tx; e.evY = ty;
    } else if (t === INTER) {
      const k = tx * 1024 + ty;
      if (rectRect(e, bx + 3, by + 4, bx + 13, by + T)) { touchInter = k; if (e.surInter !== k) { e.bascule ^= 1; e.ev |= EV.BASCULE; e.evX = tx; e.evY = ty; } }
    } else if (t === TREMP_G || t === TREMP_D) {            // tremplin latéral : projette sur le côté
      if (rectRect(e, bx + 2, by + 6, bx + 14, by + T) && e.tremCd <= 0) {
        const dir = t === TREMP_D ? 1 : -1;
        e.vx = dir * K.tremplinVx; e.vy = -K.tremplinVy; e.att = 0; e.slam = false; e.sol = false; e.tremCd = 12;
        if (e.phase === P) { e.phase = n.base; e.dash = 0; e.cdP = K.pRecharge; }
        e.charges = K.charges; e.ev |= EV.RESSORT; e.evX = tx; e.evY = ty;
      }
    } else if (t === BAN_L || t === BAN_Z || t === BAN_P) {    // bannissement : cet état est interdit un moment
      if (rectCercle(e, bx + T / 2, by + T / 2, 6.5)) {
        const ph = n.emplacements[t === BAN_L ? 1 : t === BAN_Z ? 2 : 3];   // 7, 8, 9 : les états 2, 3 et 4 du niveau
        if (e.ban !== ph || e.banT - e.temps < K.banDuree - 30) { e.ev |= EV.BANNI; e.evX = tx; e.evY = ty; }
        e.ban = ph; e.banT = e.temps + K.banDuree;
        if (e.phase === ph) { e.att = 0; retour(n, e); }
      }
    } else if (t === SAUT_PLUS || t === SAUT_MOINS) {           // multiplicateur de saut
      if (rectCercle(e, bx + T / 2, by + T / 2, 5.5)) {
        const m = t === SAUT_PLUS ? K.sautPlus : K.sautMoins;
        if (e.bonus !== m || e.bonusT - e.temps < K.bonusDuree - 30) { e.ev |= EV.BONUS; e.evX = tx; e.evY = ty; }
        e.bonus = m; e.bonusT = e.temps + K.bonusDuree;
      }
    } else if (t === PIECE) {
      const k = tx * 1024 + ty;
      if (rectCercle(e, bx + T / 2, by + T / 2, 5) && e.pieces.indexOf(k) < 0) { e.pieces = e.pieces.concat(k); e.ev |= EV.PIECE; e.evX = tx; e.evY = ty; }
    } else if (t === BOUTON) {
      const k = tx * 1024 + ty;
      if (rectRect(e, bx + 3, by + 9, bx + 13, by + T) && e.boutons.indexOf(k) < 0) { e.boutons = e.boutons.concat(k); e.ev |= EV.BOUTON; e.evX = tx; e.evY = ty; }
    } else if (t === CRISTAL) {
      const i = tx * 1024 + ty;
      if (e.charges < K.charges && rectPoly(e, formeEn(FORME_CRISTAL, bx + T / 2, by + T / 2)) && !e.cristaux.some(c => c[0] === i)) {
        e.charges = K.charges; e.cristaux = e.cristaux.concat([[i, e.temps + 150]]); e.ev |= EV.CRISTAL; e.evX = tx; e.evY = ty;
      }
    } else if (t === CHAMPI) {                                   // champignon : repousse loin de son centre
      const ccx = bx + T / 2, ccy = by + T / 2;
      if (e.champCd <= 0 && rectCercle(e, ccx, ccy, K.champiRayon)) {
        let dx = e.x + W / 2 - ccx, dy = e.y + H / 2 - ccy;
        const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
        e.vx = dx * K.champiForce; e.vy = dy * K.champiForce - 1.4; e.champCd = 10; e.slam = false; e.att = 0; e.sol = false; e.plat = -1;
        if (e.phase === P) { e.phase = n.base; e.dash = 0; e.cdP = K.pRecharge; }
        e.charges = K.charges; e.ev |= EV.RESSORT; e.evX = tx; e.evY = ty;
      }
    } else if (t === BUT) { e.fini = true; e.ev |= EV.FIN; }
    else if (t === ECLAT) { if (!e.eclat && rectPoly(e, formeEn(FORME_ECLAT, bx + T / 2, by + T / 2))) { e.eclat = true; e.ev |= EV.ECLAT; e.evX = tx; e.evY = ty; } }
    else if (t === DRAPEAU) {
      if ((!e.cp || e.cp.tx !== tx || e.cp.ty !== ty) && rectRect(e, bx + 3, by + 1, bx + 14, by + T)) {
        e.cp = { x: tx * T + (T - W) / 2, y: (ty + 1) * T - H, tx, ty }; e.cpN++; e.ev |= EV.DRAPEAU; e.evX = tx; e.evY = ty;
      }
    } else if ((t === TP1 || t === TP2) && e.tpCd === 0) {
      const ccx = e.x + W / 2, ccy = e.y + H / 2;
      if (ccx > bx && ccx < bx + T && ccy > by && ccy < by + T) {
        const s = n.tp.get(ty * n.w + tx);
        if (s) {
          e.evX = ccx; e.evY = ccy;
          e.x = s.x * T + (T - W) / 2; e.y = s.y * T + (T - H) / 2; e.tpCd = 20; e.ev |= EV.TP; e.att = 0;
        }
      }
    }
    if (e.fini || e.mortT > 0) break;
  }
  // trou bouclé : on ressort de l'autre bord, avec la même vitesse
  if (n.boucle.size && e.mortT === 0) {
    const bx2 = Math.floor((e.x + W / 2) / T), by2 = Math.floor((e.y + H / 2) / T), i = by2 * n.w + bx2, t = tuile(n, bx2, by2);
    if ((t === BOUCLE_B && e.vy > 0) || (t === BOUCLE_H && e.vy < 0)) {
      const j = n.boucle.get(i);
      if (j !== undefined) {
        const ty = Math.floor(j / n.w);
        e.evX = e.x + W / 2; e.evY = e.y + H / 2;
        e.y = t === BOUCLE_B ? ty * T + 1 : (ty + 1) * T - H - 1;
        e.plat = -1; e.sol = false; e.ev |= EV.TP;
      }
    } else if ((t === BOUCLE_D && e.vx > 0) || (t === BOUCLE_G && e.vx < 0)) {
      const j = n.boucle.get(i);
      if (j !== undefined) {
        const tx2 = j % n.w;
        e.evX = e.x + W / 2; e.evY = e.y + H / 2;
        e.x = t === BOUCLE_D ? tx2 * T + 1 : (tx2 + 1) * T - W - 1;
        e.plat = -1; e.ev |= EV.TP;
      }
    }
  }
  if (e.y > n.h * T + 8) mourir(e, true);
  e.surInter = touchInter;
  if (e.tremCd > 0) e.tremCd--;
  if (e.champCd > 0) e.champCd--;
  // un bloc de couleur qui apparaît sur le joueur l'écrase
  if ((e.ev & EV.BASCULE) && e.mortT === 0) {
    const ax = Math.floor(e.x / T), bx = Math.floor((e.x + W - 0.001) / T), ay = Math.floor(e.y / T), by = Math.floor((e.y + H - 0.001) / T);
    for (let ty = ay; ty <= by; ty++) for (let tx = ax; tx <= bx; tx++) { const tt = tuile(n, tx, ty); if ((tt === BLOC_R || tt === BLOC_B) && plein(n, e, tx, ty)) mourir(e); }
  }
  // ennemis proches
  if (n.ennemis.length && e.mortT === 0) {
    const px = e.x + W / 2;
    for (const en of n.ennemis) {
      if (Math.abs(en.x * T - px) > 40 * T) continue;
      const [ex, ey] = ennemiEn(en, e.temps);
      if (rectCercle(e, ex + 6, ey + 6, K.ennemiRayon)) { mourir(e); break; }
    }
  }
  // scies qui roulent
  if (n.scies.length && e.mortT === 0) {
    const px = e.x + W / 2;
    for (const sc of n.scies) {
      if (Math.abs(sc.x * T - px) > 48 * T) continue;
      const [cx, cy] = scieEn(sc, e.temps);
      if (rectCercle(e, cx, cy, K.scieRayon)) { mourir(e); break; }
    }
  }
  // lasers allumés (l'ombre les traverse)
  if (n.lasers.length && e.mortT === 0 && e.phase !== OM) {
    const px = e.x + W / 2;
    for (const la of n.lasers) {
      if (Math.abs(la.x * T - px) > 48 * T) continue;
      if (laserEtat(la, e.temps) !== 2) continue;
      const r = laserRect(la);
      if (rectRect(e, r[0], r[1], r[2], r[3])) { mourir(e); break; }
    }
  }
  // flèches des arbalètes proches
  if (n.fleches.length && e.mortT === 0 && e.phase !== ME) {
    const px = e.x + W / 2;
    for (const f of n.fleches) {
      if (Math.abs(f.x * T - px) > 44 * T) continue;
      for (const [ax, ay] of flechesEn(n, e.temps, f)) {
        const hx = f.dx ? 8 : 2.5, hy = f.dy ? 8 : 2.5;
        if (ax + hx > e.x && ax - hx < e.x + W && ay + hy > e.y && ay - hy < e.y + H) { mourir(e); break; }
      }
      if (e.mortT) break;
    }
  }
}

/* ---------- Entrées compactes (fantômes) ---------- */
function compresser(liste) {          // [inp, inp, ...] -> "valeur*nombre,..." en base 36
  const out = [];
  for (let i = 0; i < liste.length;) {
    let j = i; while (j < liste.length && liste[j] === liste[i]) j++;
    out.push(liste[i].toString(36) + (j - i > 1 ? '*' + (j - i).toString(36) : ''));
    i = j;
  }
  return out.join(',');
}
function decompresser(s) {
  const out = [];
  if (!s) return out;
  for (const morceau of s.split(',')) {
    const [a, b] = morceau.split('*');
    const v = parseInt(a, 36), k = b ? parseInt(b, 36) : 1;
    for (let i = 0; i < k; i++) out.push(v);
  }
  return out;
}

const Moteur = { T, W, H, S, L, Z, P, PL, CA, ME, OM, GL, MA, NOMS_PHASES, E, EV, K, CH,
  VIDE, MUR, GRILLE, TAMIS, FRAGILE, PICS, FEU, EAU, GLACE, RESSORT, CRISTAL, BUT, DRAPEAU, PLATE, TAPIS_G, TAPIS_D,
  VENT_D, VENT_G, VENT_H, VENT_B, TP1, TP1S, TP2, TP2S, ECLAT, PANNEAU,
  ARBALETE, CASSANT, REBONDI, BOUTON, PORTE, PIECE, ORBE, INTER, BLOC_R, BLOC_B, TREMP_G, TREMP_D, ENNEMI_H, ENNEMI_V,
  BAN_L, BAN_Z, BAN_P, SAUT_PLUS, SAUT_MOINS, PAROI, BAR_S, BAR_P, BAR_PL, BAR_CA, BAR_ME, PLAT_H, PLAT_V, SCIE_H, SCIE_V,
  LASER, CHAMPI, BOUCLE_H, BOUCLE_B, BOUCLE_G, BOUCLE_D, BAR_GL, BAR_MA, BARRIERE, FORMES, glaceEn, formeJoueur, polyCercle, polyPoly, estDur, flechesEn, effondre, ennemiEn, plateEn, scieEn, laserEtat, laserRect, PICS_TRI, FORME_CRISTAL, FORME_ECLAT,
  charger, recharger, nouvelEtat, cloner, pas, tuile, plein, casse, compresser, decompresser, sensPics, zonePics };
if (typeof module !== 'undefined' && module.exports) module.exports = Moteur;
else racine.Moteur = Moteur;
})(typeof window !== 'undefined' ? window : globalThis);
