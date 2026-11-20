/* Phase — rendu (Canvas 2D) : décors en couches qui défilent, roches détaillées, cases animées, pièges,
   joueur selon son état, lumières, particules, interface en jeu. */
(function (racine) {
'use strict';
const M = racine.Moteur;
const T = M.T, PW = M.W, PH = M.H;

// motif : façon de dessiner la roche ; amb : particules d'ambiance ; lum : couleur de la lumière ambiante
const THEMES = {
  carriere: { ciel: ['#4a2f1c', '#1a0f08'], mur: '#86613f', clair: '#a9804f', bord: '#e2b072', ombre: '#3b2817', motif: '#9a7550',
    loin: ['#5a3b24', '#3d2817', '#2a1b10'], accent: '#ffb35a', nuit: 0.3, lum: '255,190,120', tapis: '#6f8f3f', style: 'pierre', amb: 'poussiere', nom: 'Carrière' },
  aqueduc: { ciel: ['#163a63', '#060f1d'], mur: '#466784', clair: '#5f86a8', bord: '#a8dcff', ombre: '#1d2e3f', motif: '#557a9c',
    loin: ['#22476e', '#183654', '#10243a'], accent: '#5ec8ff', nuit: 0.36, voile: '2,8,20', lum: '140,210,255', tapis: '#3f8f6a', style: 'brique', amb: 'gouttes', nom: 'Aqueduc' },
  chaufferie: { ciel: ['#4d160a', '#140302'], mur: '#5f3124', clair: '#7d4331', bord: '#ff9a55', ombre: '#2a110b', motif: '#704030',
    loin: ['#5a1d0f', '#3f130a', '#2a0b05'], accent: '#ff7a2f', nuit: 0.42, voile: '14,2,0', lum: '255,130,60', tapis: null, style: 'brique', amb: 'braises', nom: 'Chaufferie' },
  orage: { ciel: ['#25185a', '#07041c'], mur: '#3d3470', clair: '#544a92', bord: '#cdb0ff', ombre: '#1a1536', motif: '#4a4086',
    loin: ['#2c2266', '#201a4e', '#151036'], accent: '#ffe35a', nuit: 0.46, voile: '4,2,18', lum: '200,170,255', tapis: null, style: 'cristal', amb: 'pluie', nom: 'Orage' },
  abysses: { ciel: ['#05414d', '#010a10'], mur: '#1f5157', clair: '#2b6b72', bord: '#6ff7e3', ombre: '#0b2326', motif: '#286066',
    loin: ['#0b4a54', '#08363e', '#05252b'], accent: '#5ff0dc', nuit: 0.55, voile: '0,8,14', lum: '110,255,230', tapis: '#2f7f5f', style: 'corail', amb: 'bulles', nom: 'Abysses' },
  usine: { ciel: ['#2c313a', '#0b0c0f'], mur: '#4f565f', clair: '#6a737d', bord: '#e3e9ef', ombre: '#22262b', motif: '#5d656e',
    loin: ['#363c45', '#2a2f37', '#1e2228'], accent: '#ffc83a', nuit: 0.36, lum: '255,220,150', tapis: null, style: 'metal', amb: 'etincelles', nom: 'Usine' },
  glacier: { ciel: ['#2b5480', '#0a1426'], mur: '#6385a8', clair: '#86a9cc', bord: '#ffffff', ombre: '#2c4258', motif: '#7399bf',
    loin: ['#3c6690', '#2c4f73', '#1f3a57'], accent: '#bff4ff', nuit: 0.16, voile: '10,20,40', lum: '200,240,255', tapis: null, style: 'neige', amb: 'neige', nom: 'Glacier' },
  coeur: { ciel: ['#360a33', '#06010b'], mur: '#40143e', clair: '#5a1d57', bord: '#ff74da', ombre: '#1a0619', motif: '#521c50',
    loin: ['#3e0f3b', '#2c0a2a', '#1d061b'], accent: '#ff6ad5', nuit: 0.48, voile: '10,0,10', lum: '255,110,220', tapis: null, style: 'veines', amb: 'eclats', nom: 'Cœur' }
};
const COUL_PHASE = ['#e3cfa8', '#4fb8ff', '#ffe2bf', '#ffe94a', '#f1ecff', '#ff5ca8', '#a9b6c8', '#9a6bff', '#bff4ff', '#ff6a2a'];
let APPARENCE = { contour: 'base', motif: 'rien', yeux: 'base', tete: 'rien', trainee: 'rien', aura: 'rien' };   // apparences portées (boutique)
function choisirApparence(a) { APPARENCE = Object.assign({ contour: 'base', motif: 'rien', yeux: 'base', tete: 'rien', trainee: 'rien', aura: 'rien' }, a || {}); }

let cv, cx, LARG = 0, HAUT = 0, DPR = 1;
let niv = null, th = THEMES.carriere, ZF = 2;
const derVue = { ox: 0, oy: 0, z: 2 };
let transi = 0, transiC = '#fff';               // nouvelle région : un voile de sa couleur qui s'efface
// case de la carte sous un point de l'écran (souris de l'éditeur)
function versCase(sx, sy) { const rc = cv.getBoundingClientRect(); return [Math.floor((derVue.ox + (sx - rc.left) / derVue.z) / T), Math.floor((derVue.oy + (sy - rc.top) / derVue.z) / T)]; }
let camNeuve = true;
let cam = { x: 0, y: 0, z: 2, vx: 0, vy: 0, avance: 0 }, tremble = 0, flash = 0, flashC = '#fff';
let ACCES = { daltonien: false, sansFlash: false };
function accessibilite(r) { ACCES = { daltonien: !!r.daltonien, sansFlash: !!r.sansFlash }; }
// un symbole par état (mode daltonien) : la barrière se reconnaît sans les couleurs
const SYMBOLES = ['■', '💧', '☁', '⚡', '🪶', '●', '⚙', '◆', '❄', '🔥'];
let dyn = null;           // cases animées par type
let ombreCv = null;
let parts = [];
let temps = 0;

function init(canvas) {
  cv = canvas; cx = cv.getContext('2d');
  redim(); addEventListener('resize', redim);
}
function redim() {
  DPR = Math.min(2, devicePixelRatio || 1);
  LARG = innerWidth; HAUT = innerHeight;
  cv.width = Math.round(LARG * DPR); cv.height = Math.round(HAUT * DPR);
  cv.style.width = LARG + 'px'; cv.style.height = HAUT + 'px';
  couches.clear();
}
function zoom() { return Math.max(1, Math.min(LARG / (34 * T), HAUT / (19 * T))); }
function alea(s) { let x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
// petite onde lissée pour les reliefs
function bruit(x, s) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return alea(i * 1.7 + s) * (1 - u) + alea((i + 1) * 1.7 + s) * u;
}

/* ---------- Préparation d'un niveau ---------- */
// themeId : nom du thème, ou fonction x(en cases) -> nom du thème (mode infini et défi : le décor change par régions)
let themeDe = null, morceaux = new Map(), themeFixe = THEMES.carriere;
const MORC = 48;   // le décor fixe est dessiné par morceaux de 48 colonnes, à la demande
function preparer(n, themeId) {
  ZF = n.h > 60 ? 2 : 3;
  niv = n;
  themeDe = typeof themeId === 'function' ? themeId : null;
  th = THEMES[themeDe ? themeDe(0) : themeId] || THEMES.carriere;
  themeFixe = th;
  parts = [];
  morceaux = new Map();
  scanner();
}
function themeEn(x) { return themeDe ? (THEMES[themeDe(x)] || THEMES.carriere) : themeFixe; }
function etendre(n, ancienW) {
  niv = n;
  scanner();
  for (const k of [...morceaux.keys()]) if ((k + 1) * MORC >= ancienW - 4) morceaux.delete(k);
}
const tuileR = (x, y) => (x < 0 || x >= niv.w || y < 0) ? M.MUR : (y >= niv.h ? M.VIDE : niv.g[y * niv.w + x]);
const solideR = (k) => M.estDur(k);
function scanner() {
  const n = niv;
  dyn = { fragile: [], cristal: [], feu: [], eau: [], vent: [], ressort: [], but: [], drapeau: [], tapis: [], tp: [], eclat: [],
    panneau: [], cassant: [], porte: [], bouton: [], rebondi: [], piece: [], orbe: [], inter: [], bloc: [], tremp: [], ban: [], bonus: [], champi: [], barriere: [], boucle: [], boucleH: [], lumieres: [], levier: [], grilleL: [], plaque: [], cle: [], porteCle: [], rythme: [], minuteur: [], porteMin: [], apes: [] };
  for (let y = 0; y < n.h; y++) for (let x = 0; x < n.w; x++) {
    const k = n.g[y * n.w + x];
    // l'eau remplit aussi les cases non pleines qu'elle entoure (pics, orbes, cristaux… sous l'eau : pas de trou)
    if (k !== M.EAU && !solideR(k) && (tuileR(x, y - 1) === M.EAU || (tuileR(x - 1, y) === M.EAU && tuileR(x + 1, y) === M.EAU))) dyn.eau.push([x, y, false]);
    switch (k) {
      case M.TAPIS_G: case M.TAPIS_D: dyn.tapis.push([x, y, k === M.TAPIS_G ? -1 : 1]); break;
      case M.FRAGILE: dyn.fragile.push([x, y]); break;
      case M.CRISTAL: dyn.cristal.push([x, y]); dyn.lumieres.push([x, y, '120,250,255', 40]); break;
      case M.FEU: dyn.feu.push([x, y]); dyn.lumieres.push([x, y, '255,150,60', 56]); break;
      case M.EAU: dyn.eau.push([x, y, tuileR(x, y - 1) !== M.EAU && !solideR(tuileR(x, y - 1))]); break;
      case M.VENT_D: case M.VENT_G: case M.VENT_H: case M.VENT_B: dyn.vent.push([x, y, k]); break;
      case M.RESSORT: dyn.ressort.push([x, y]); break;
      case M.BUT: dyn.but.push([x, y]); dyn.lumieres.push([x, y, '255,240,200', 80]); break;
      case M.DRAPEAU: dyn.drapeau.push([x, y]); break;
      case M.TP1: case M.TP2: case M.TP1S: case M.TP2S: dyn.tp.push([x, y, k]); dyn.lumieres.push([x, y, '190,140,255', 40]); break;
      case M.ECLAT: dyn.eclat.push([x, y]); dyn.lumieres.push([x, y, '255,120,225', 44]); break;
      case M.PANNEAU: dyn.panneau.push([x, y]); break;
      case M.CASSANT: dyn.cassant.push([x, y]); break;
      case M.PORTE: dyn.porte.push([x, y]); break;
      case M.BOUTON: dyn.bouton.push([x, y]); break;
      case M.LEVIER: dyn.levier.push([x, y]); break;
      case M.CLE: dyn.cle.push([x, y]); dyn.lumieres.push([x, y, '255,215,90', 30]); break;
      case M.PORTE_CLE: dyn.porteCle.push([x, y]); break;
      case M.RYTHME: dyn.rythme.push([x, y]); break;
      case M.MINUTEUR: dyn.minuteur.push([x, y]); break;
      case M.PORTE_MIN: dyn.porteMin.push([x, y]); break;
      case M.APESANTEUR: dyn.apes.push([x, y]); break;
      case M.GRILLE_LEV: dyn.grilleL.push([x, y]); break;
      case M.PLAQUE0: case M.PLAQUE1: case M.PLAQUE2: dyn.plaque.push([x, y, k - M.PLAQUE0]); break;
      case M.REBONDI: dyn.rebondi.push([x, y]); break;
      case M.ORBE: dyn.orbe.push([x, y]); dyn.lumieres.push([x, y, '255,230,90', 34]); break;
      case M.INTER: dyn.inter.push([x, y]); break;
      case M.BLOC_R: case M.BLOC_B: dyn.bloc.push([x, y, k === M.BLOC_R ? 0 : 1]); break;
      case M.TREMP_G: case M.TREMP_D: dyn.tremp.push([x, y, k === M.TREMP_D ? 1 : -1]); break;
      case M.BAN_L: case M.BAN_Z: case M.BAN_P: dyn.ban.push([x, y, k === M.BAN_L ? 1 : k === M.BAN_Z ? 2 : 3]); break;
      case M.SAUT_PLUS: case M.SAUT_MOINS: dyn.bonus.push([x, y, k === M.SAUT_PLUS ? 1 : -1]); dyn.lumieres.push([x, y, k === M.SAUT_PLUS ? '120,255,140' : '255,170,80', 30]); break;
      case M.PIECE: dyn.piece.push([x, y]); dyn.lumieres.push([x, y, '255,210,80', 30]); break;
      case M.CHAMPI: dyn.champi.push([x, y]); break;
      case M.BOUCLE_H: case M.BOUCLE_B: dyn.boucle.push([x, y, k === M.BOUCLE_B]); break;
      case M.BOUCLE_G: case M.BOUCLE_D: dyn.boucleH.push([x, y, k === M.BOUCLE_D]); break;
      case M.BAR_S: case M.BAR_P: case M.BAR_PL: case M.BAR_CA: case M.BAR_ME: case M.BAR_GL: case M.BAR_MA: dyn.barriere.push([x, y, M.BARRIERE[k]]); break;
    }
  }
}

/* ---------- Décor fixe (dessiné une fois par morceau) ---------- */
function morceau(k) {
  let c = morceaux.get(k);
  if (c) return c;
  const n = niv, x0 = k * MORC, x1 = Math.min(n.w, x0 + MORC);
  c = document.createElement('canvas');
  c.width = MORC * T * ZF; c.height = n.h * T * ZF;
  const g = c.getContext('2d');
  g.scale(ZF, ZF); g.translate(-x0 * T, 0);
  const garde = th;
  for (let x = x0; x < x1; x++) {
    th = themeEn(x);
    for (let y = 0; y < n.h; y++) {
      const kk = n.g[y * n.w + x], px = x * T, py = y * T;
      switch (kk) {
        case M.MUR: murCase(g, x, y, px, py); break;
        case M.GLACE: glaceCase(g, x, y, px, py); break;
        case M.GRILLE: grilleCase(g, px, py); break;
        case M.TAMIS: tamisCase(g, px, py); break;
        case M.PICS: picsCase(g, x, y, px, py); break;
        case M.PLATE: g.fillStyle = th.ombre; g.fillRect(px, py, T, 5); g.fillStyle = th.bord; g.fillRect(px, py, T, 2); break;
        case M.TAPIS_G: case M.TAPIS_D: tapisCase(g, px, py); break;
        case M.PANNEAU: panneauCase(g, px, py); break;
        case M.ARBALETE: arbaleteCase(g, x, y, px, py); break;
        case M.REBONDI: rebondiCase(g, px, py); break;
        case M.PAROI: paroiCase(g, x, y, px, py); break;
        case M.LASER: laserCase(g, x, y, px, py); break;
        case M.BRULEUR: bruleurCase(g, x, y, px, py); break;
        case M.GEYSER: g.fillStyle = '#3a3330'; g.fillRect(px + 1, py + T - 5, T - 2, 5); g.fillStyle = '#6a5a50'; g.fillRect(px + 1, py + T - 5, T - 2, 1.5); g.fillStyle = '#120c0a'; for (let k = 3; k < T - 3; k += 3) g.fillRect(px + k, py + T - 3, 1.5, 3); break;
        case M.CASSANT: g.fillStyle = '#5b3e24'; g.fillRect(px, py, T, T); break;
      }
    }
  }
  th = garde;
  morceaux.set(k, c);
  return c;
}
function profondeur(x, y) {
  for (let r = 1; r <= 3; r++)
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= niv.w || yy >= niv.h) continue;
      if (!solideR(tuileR(xx, yy))) return r - 1;
    }
  return 3;
}
/* Textures procédurales (bruit fractal), une par zone, de 64×64 pixels et raccordables */
const textures = new Map();
function hexRvb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function textureDe(th) {
  if (textures.has(th)) return textures.get(th);
  const N = 192, c = document.createElement('canvas'); c.width = c.height = N;     // 192 texels = 64 unités du monde (3 texels par pixel)
  const g = c.getContext('2d'), img = g.createImageData(N, N);
  const A = hexRvb(th.ombre), B = hexRvb(th.mur), D = hexRvb(th.clair);
  const val = (x, y, f, sd) => {           // bruit de valeur raccordable (période N)
    const P = N / f, x0 = Math.floor(x / f), y0 = Math.floor(y / f), u = (x / f) - x0, v = (y / f) - y0;
    const h = (i, j) => alea(((i % P + P) % P) * 57.3 + ((j % P + P) % P) * 131.7 + sd);
    const su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
    return (h(x0, y0) * (1 - su) + h(x0 + 1, y0) * su) * (1 - sv) + (h(x0, y0 + 1) * (1 - su) + h(x0 + 1, y0 + 1) * su) * sv;
  };
  const fbm = (x, y, sd) => val(x, y, 48, sd) * 0.45 + val(x, y, 24, sd + 1) * 0.25 + val(x, y, 12, sd + 2) * 0.15 + val(x, y, 6, sd + 3) * 0.1 + val(x, y, 3, sd + 4) * 0.05;
  // cailloux de Voronoï raccordables : cellule la plus proche, distance au bord
  const G = th.style === 'neige' ? 5 : th.style === 'corail' ? 7 : 6, cs = N / G, pts = [];
  for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) pts.push([(i + 0.15 + alea(i * 7.1 + j * 3.3 + 9) * 0.7) * cs, (j + 0.15 + alea(i * 2.7 + j * 8.9 + 4) * 0.7) * cs, alea(i * 5.3 + j * 1.7)]);
  const voro = (x, y) => {
    let d1 = 1e9, d2 = 1e9, best = null;
    for (const p of pts) for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) {
      const dx = x - p[0] - ox, dy = y - p[1] - oy, d = dx * dx + dy * dy;
      if (d < d1) { d2 = d1; d1 = d; best = [p, dx, dy]; } else if (d < d2) d2 = d;
    }
    return { e: Math.sqrt(d2) - Math.sqrt(d1), p: best[0], dx: best[1], dy: best[2], d: Math.sqrt(d1) };
  };
  const mix = (n) => { const out = [0, 0, 0]; for (let i = 0; i < 3; i++) out[i] = n < 0.5 ? A[i] + (B[i] - A[i]) * (n / 0.5) : B[i] + (D[i] - B[i]) * Math.min(1.4, (n - 0.5) / 0.5); return out; };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let n = fbm(x, y, 1), lum = 1, add = [0, 0, 0];
    switch (th.style) {
      case 'pierre': case 'neige': case 'corail': case 'cristal': {
        const v = voro(x, y), bord = Math.min(1, v.e / 5);
        n = n * 0.55 + v.p[2] * 0.35 + 0.1;
        // chaque caillou est bombé et éclairé par le haut à gauche
        const k = Math.max(0, 1 - v.d / (cs * 0.8));
        lum = 0.72 + 0.28 * bord + 0.16 * k + (-v.dx - v.dy) / cs * 0.12;
        if (v.e < 2.2) lum *= 0.45 + v.e * 0.2;                       // joints sombres
        if (th.style === 'neige') { n = n * 0.6 + 0.35; if (v.e > 2.2 && v.dy < -cs * 0.25) add = [25, 30, 35]; }
        if (th.style === 'corail' && val(x, y, 6, 11) > 0.72) add = [10, 50, 45];          // pores bleutés
        if (th.style === 'cristal' && v.p[2] > 0.82) { lum = 1.15 + (v.dx - v.dy) / cs * 0.4; add = [40, 30, 70]; }   // facettes de cristal
        break;
      }
      case 'brique': {
        const bw = 48, bh = 24, row = Math.floor(y / bh), dec = (row % 2) * bw / 2, col = Math.floor((x + dec) / bw);
        const lx = (x + dec) % bw, ly = y % bh, id = alea(row * 13.7 + col * 7.3);
        n = n * 0.5 + id * 0.35 + 0.15;
        if (ly < 3 || lx < 3) lum = 0.42;                              // mortier
        else { if (ly < 6) lum = 1.15; else if (ly > bh - 4) lum = 0.82; if (lx < 6) lum *= 1.06; else if (lx > bw - 4) lum *= 0.88; }
        if (id > 0.85 && val(x, y, 4, 5) > 0.6) lum *= 0.75;            // briques abîmées
        break;
      }
      case 'metal': {
        const lx = x % 48, ly = y % 48;
        n = 0.5 + (val(x, y, 48, 3) - 0.5) * 0.3 + Math.sin(y * 1.7 + val(x, y, 6, 2) * 3) * 0.04;   // métal brossé
        if (lx < 2 || ly < 2) lum = 0.5; else if (lx < 4 || ly < 4) lum = 1.3; else if (lx > 45 || ly > 45) lum = 0.75;
        for (const [rx, ry] of [[8, 8], [40, 8], [8, 40], [40, 40]]) { const d = Math.hypot(lx - rx, ly - ry); if (d < 3) lum = d < 1.6 ? 1.45 : 0.6; }   // rivets
        if (val(x, y, 12, 9) > 0.74) add = [40, 14, -10];                // rouille
        break;
      }
      case 'veines': {
        const r = Math.abs(fbm(x, y, 7) - 0.5);
        n = n * 0.7 + 0.1;
        if (r < 0.025) { lum = 1.6; add = [90, 10, 70]; } else if (r < 0.05) add = [30, 0, 25];   // veines qui brillent
        break;
      }
    }
    const col = mix(n), k = (x + y * N) * 4;
    for (let i = 0; i < 3; i++) img.data[k + i] = Math.max(0, Math.min(255, col[i] * lum + add[i]));
    img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  textures.set(th, c);
  return c;
}
const motifs = new WeakMap();
function motifPour(g) {
  let m = motifs.get(g); if (!m) { m = new Map(); motifs.set(g, m); }
  if (!m.has(th)) { const pt = g.createPattern(textureDe(th), 'repeat'); if (pt.setTransform && typeof DOMMatrix !== 'undefined') pt.setTransform(new DOMMatrix().scale(1 / 3)); m.set(th, pt); }
  return m.get(th);
}
function murCase(g, x, y, px, py) {
  const prof = profondeur(x, y);
  const libre = (dx, dy) => !solideR(tuileR(x + dx, y + dy));
  // roche texturée, éclairée par le haut
  g.fillStyle = motifPour(g); g.fillRect(px, py, T, T);
  const gr = g.createLinearGradient(0, py, 0, py + T);
  gr.addColorStop(0, 'rgba(255,255,255,.05)'); gr.addColorStop(1, 'rgba(0,0,0,.1)');
  g.fillStyle = gr; g.fillRect(px, py, T, T);
  if (prof === 0) {                                           // arêtes en relief : la lumière vient d'en haut à gauche
    const bv = 3.5;
    if (libre(0, -1)) { const l2 = g.createLinearGradient(0, py, 0, py + bv); l2.addColorStop(0, `rgba(${th.lum},.35)`); l2.addColorStop(1, `rgba(${th.lum},0)`); g.fillStyle = l2; g.fillRect(px, py, T, bv); }
    if (libre(-1, 0)) { const l2 = g.createLinearGradient(px, 0, px + bv, 0); l2.addColorStop(0, 'rgba(255,255,255,.16)'); l2.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = l2; g.fillRect(px, py, bv, T); }
    if (libre(1, 0)) { const l2 = g.createLinearGradient(px + T - bv, 0, px + T, 0); l2.addColorStop(0, 'rgba(0,0,0,0)'); l2.addColorStop(1, 'rgba(0,0,0,.35)'); g.fillStyle = l2; g.fillRect(px + T - bv, py, bv, T); }
  }
  motifRoche(g, x, y, px, py);
  if (prof > 0) { g.fillStyle = `rgba(4,2,8,${[0, 0.38, 0.62, 0.78][prof]})`; g.fillRect(px, py, T, T); return; }
  // occlusion ambiante près des coins creux
  if (libre(0, 1) && (libre(-1, 1) || libre(1, 1))) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(px, py + T - 3, T, 3); }
  // ombres douces au contact du vide
  if (libre(0, 1)) { const o = g.createLinearGradient(0, py + T - 6, 0, py + T); o.addColorStop(0, 'rgba(0,0,0,0)'); o.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = o; g.fillRect(px, py + T - 6, T, 6); }
  if (libre(-1, 0)) { g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(px, py, 2, T); }
  if (libre(1, 0)) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(px + T - 2, py, 2, T); }
  if (libre(0, -1)) dessusRoche(g, x, y, px, py);
}
function motifRoche(g, x, y, px, py) {
  const s = alea(x * 31 + y * 17), s2 = alea(x * 13 + y * 29);
  g.save();
  switch (th.style) {
    case 'pierre':
      g.strokeStyle = 'rgba(40,25,12,.45)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(px, py + 5 + s * 6); g.lineTo(px + 7 + s2 * 4, py + 7 + s * 4); g.lineTo(px + T, py + 4 + s2 * 8); g.stroke();
      if (s < 0.4) { g.fillStyle = 'rgba(255,230,190,.12)'; g.fillRect(px + 3 + s2 * 8, py + 9, 3, 2); }
      break;
    case 'brique': {
      const dec = (y % 2) * 8;
      g.fillStyle = 'rgba(0,0,0,.28)';
      g.fillRect(px, py + 7, T, 1); g.fillRect(px, py + 15, T, 1);
      g.fillRect(px + ((dec + 4) % 16), py, 1, 7); g.fillRect(px + ((dec + 12) % 16), py + 8, 1, 7);
      if (th === THEMES.chaufferie && s < 0.25) { g.fillStyle = 'rgba(255,90,20,.18)'; g.fillRect(px + 2, py + 9, 6, 2); }
      if (th === THEMES.aqueduc && s < 0.2) { g.fillStyle = 'rgba(120,200,120,.25)'; g.fillRect(px + s2 * 10, py + 12, 4, 3); }
      break;
    }
    case 'cristal':
      if (s < 0.35) { g.strokeStyle = 'rgba(210,180,255,.35)'; g.beginPath(); g.moveTo(px + 2, py + T - 2); g.lineTo(px + 8, py + 4 + s2 * 4); g.lineTo(px + 13, py + T - 5); g.stroke(); }
      break;
    case 'corail':
      if (s < 0.5) { g.fillStyle = 'rgba(120,255,220,.13)'; g.beginPath(); g.arc(px + 4 + s2 * 8, py + 4 + s * 8, 2 + s * 2, 0, 7); g.fill(); }
      break;
    case 'metal':
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(px, py, T, 1); g.fillRect(px, py, 1, T);
      g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(px + 1, py + 1, T - 1, 1);
      g.fillStyle = 'rgba(20,20,20,.5)'; g.fillRect(px + 3, py + 3, 1.5, 1.5); g.fillRect(px + T - 4, py + T - 4, 1.5, 1.5);
      break;
    case 'neige':
      if (s < 0.4) { g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(px + s2 * 10, py + 4 + s * 8, 5, 2); }
      break;
    case 'veines':
      if (s < 0.45) { g.strokeStyle = 'rgba(255,90,210,.25)'; g.beginPath(); g.moveTo(px, py + 8 + s * 5); g.quadraticCurveTo(px + 8, py + s2 * 16, px + T, py + 6 + s2 * 6); g.stroke(); }
      break;
  }
  g.restore();
}
function dessusRoche(g, x, y, px, py) {
  // liseré lumineux et petite végétation / givre / suie selon la zone
  g.fillStyle = th.bord; g.fillRect(px, py, T, 2);
  g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(px, py + 2, T, 2);
  const s = alea(x * 11 + y * 5);
  switch (th.style) {
    case 'pierre': if (s < 0.55) { for (let i = 0; i < 7; i++) { const hx = px + 1 + i * 2.1 + alea(x * 3 + i) * 1.2, hh = 1.5 + alea(x * 5 + i * 3) * 2.5; g.fillStyle = i % 2 ? '#8fb04e' : '#6a8a38'; g.fillRect(hx, py + 3.5 - hh, 0.9, hh + 0.5); } } break;
    case 'brique': if (th === THEMES.aqueduc && s < 0.4) { g.fillStyle = '#4f9a6a'; g.fillRect(px + s * 10, py - 1, 5, 2); } break;
    case 'neige': g.fillStyle = '#fff'; g.beginPath(); g.moveTo(px, py + 2); for (let i = 0; i <= 4; i++) g.lineTo(px + i * 4, py - 1 - alea(x * 4 + i) * 2); g.lineTo(px + T, py + 2); g.fill(); break;
    case 'corail': if (s < 0.3) { g.fillStyle = '#ff7f9f'; g.fillRect(px + 4 + s * 6, py - 3, 2, 3); g.fillRect(px + 3 + s * 6, py - 4, 4, 1.5); } break;
    case 'metal': if (s < 0.3) { g.fillStyle = '#ffc83a'; for (let i = 0; i < 4; i++) g.fillRect(px + i * 4, py + 2, 2, 2); } break;
    case 'veines': g.fillStyle = 'rgba(255,110,220,.5)'; g.fillRect(px, py + 1, T, 1); break;
    default: break;
  }
}
function glaceCase(g, x, y, px, py) {
  const prof = profondeur(x, y);
  const gr = g.createLinearGradient(px, py, px + T, py + T);
  gr.addColorStop(0, '#cdf2ff'); gr.addColorStop(1, '#86c4e4');
  g.fillStyle = gr; g.fillRect(px, py, T, T);
  if (prof > 0) { g.fillStyle = `rgba(16,36,66,${[0, 0.38, 0.58, 0.72][prof]})`; g.fillRect(px, py, T, T); return; }
  const s = alea(x * 9 + y * 4) * 8;
  const rf = g.createLinearGradient(px, py, px + T, py + T); rf.addColorStop(0, 'rgba(255,255,255,.35)'); rf.addColorStop(0.45, 'rgba(255,255,255,0)'); rf.addColorStop(0.6, 'rgba(255,255,255,.15)'); rf.addColorStop(0.75, 'rgba(255,255,255,0)');
  g.fillStyle = rf; g.fillRect(px, py, T, T);                                       // reflets en biais
  g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 0.7;
  g.beginPath(); g.moveTo(px + 2 + s, py + 3); g.lineTo(px + 5 + s, py + 8); g.lineTo(px + 3 + s, py + 12); g.moveTo(px + 5 + s, py + 8); g.lineTo(px + 9 + s * 0.5, py + 10); g.stroke();   // fissures
  g.fillStyle = 'rgba(30,80,120,.12)'; g.beginPath(); g.arc(px + 4 + s, py + 11, 1.6, 0, 7); g.arc(px + 11, py + 5 + s * 0.5, 1.1, 0, 7); g.fill();   // bulles prises dans la glace
  if (!solideR(tuileR(x, y - 1))) { g.fillStyle = '#f6feff'; g.fillRect(px, py, T, 2); }
  if (!solideR(tuileR(x, y + 1))) { g.fillStyle = 'rgba(40,90,130,.5)'; g.fillRect(px, py + T - 2, T, 2); }
}
function grilleCase(g, px, py) {
  g.fillStyle = 'rgba(30,50,70,.35)'; g.fillRect(px, py, T, T);
  g.strokeStyle = '#9ec3da'; g.lineWidth = 1.4;
  g.beginPath();
  for (let i = 2; i < T; i += 4) { g.moveTo(px + i, py); g.lineTo(px + i, py + T); g.moveTo(px, py + i); g.lineTo(px + T, py + i); }
  g.stroke();
  g.strokeStyle = '#e0f4ff'; g.lineWidth = 1; g.strokeRect(px + 0.5, py + 0.5, T - 1, T - 1);
}
function tamisCase(g, px, py) {
  g.fillStyle = 'rgba(255,190,140,.18)'; g.fillRect(px, py, T, T);
  g.fillStyle = '#ffd2a8';
  for (let j = 1; j < T; j += 3) for (let i = (j % 2) + 1; i < T; i += 3) g.fillRect(px + i, py + j, 1, 1);
  g.strokeStyle = 'rgba(255,215,170,.8)'; g.lineWidth = 1; g.strokeRect(px + 0.5, py + 0.5, T - 1, T - 1);
}
function picsCase(g, x, y, px, py) {
  const dir = M.sensPics(niv, x, y);
  g.save(); g.translate(px + T / 2, py + T / 2); g.rotate([0, Math.PI, Math.PI / 2, -Math.PI / 2][dir]);
  for (let i = 0; i < 3; i++) {                       // exactement les 3 triangles de la zone mortelle
    const bx = -8 + i * 5.33;
    const gr = g.createLinearGradient(bx, 0, bx + 2.66, 0);
    gr.addColorStop(0, '#e8ecf4'); gr.addColorStop(1, '#a8b0c0');
    g.fillStyle = gr; g.beginPath(); g.moveTo(bx, 8); g.lineTo(bx + 2.66, -4); g.lineTo(bx + 2.66, 8); g.closePath(); g.fill();      // face éclairée
    const gr2 = g.createLinearGradient(bx + 2.66, 0, bx + 5.33, 0);
    gr2.addColorStop(0, '#6c7486'); gr2.addColorStop(1, '#3a404e');
    g.fillStyle = gr2; g.beginPath(); g.moveTo(bx + 2.66, -4); g.lineTo(bx + 5.33, 8); g.lineTo(bx + 2.66, 8); g.closePath(); g.fill();   // face dans l'ombre
    g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(bx + 2.2, -3, 0.8, 2.5);                                                      // éclat de lumière
    g.fillStyle = 'rgba(120,40,40,.35)'; g.beginPath(); g.moveTo(bx + 1, 6); g.lineTo(bx + 2.66, 1); g.lineTo(bx + 4.3, 6); g.closePath(); g.fill();   // traces de rouille
  }
  g.restore();
}
function tapisCase(g, px, py) {
  g.fillStyle = '#1d2024'; g.fillRect(px, py, T, T);
  g.fillStyle = '#3a4047'; g.fillRect(px, py + 3, T, T - 6);
  g.fillStyle = '#5a636d'; g.beginPath(); g.arc(px + 4, py + T / 2, 2.5, 0, 7); g.arc(px + 12, py + T / 2, 2.5, 0, 7); g.fill();
}
function panneauCase(g, px, py) {
  g.fillStyle = '#5b3d22'; g.fillRect(px + 7, py + 8, 2, 8);
  g.fillStyle = '#f0dfb8'; g.fillRect(px + 2, py + 2, 12, 8);
  g.strokeStyle = '#5b3d22'; g.lineWidth = 1; g.strokeRect(px + 2.5, py + 2.5, 11, 7);
  g.fillStyle = '#5b3d22'; g.fillRect(px + 7, py + 3, 2, 4); g.fillRect(px + 7, py + 8, 2, 1);
}
function arbaleteCase(g, x, y, px, py) {
  g.fillStyle = '#3a2e28'; g.fillRect(px, py, T, T);
  g.fillStyle = '#5c4a3e'; g.fillRect(px + 1, py + 1, T - 2, T - 2);
  const f = niv.fleches.find(o => o.x === x && o.y === y);
  const dx = f ? f.dx : 0, dy = f ? f.dy : 1;
  g.save(); g.translate(px + 8, py + 8); g.rotate(Math.atan2(dy, dx));
  g.strokeStyle = '#c99a5a'; g.lineWidth = 1.6;
  g.beginPath(); g.arc(2, 0, 6, -1.2, 1.2); g.stroke();
  g.fillStyle = '#111'; g.fillRect(4, -1.5, 5, 3);
  g.fillStyle = '#ff4a4a'; g.fillRect(-5, -1, 2, 2);
  g.restore();
}
function paroiCase(g, x, y, px, py) {
  g.fillStyle = 'rgba(110,60,200,.55)'; g.fillRect(px, py, T, T);
  g.strokeStyle = 'rgba(200,170,255,.45)'; g.lineWidth = 1;
  g.beginPath(); const s = alea(x * 5 + y * 9) * 6;
  g.moveTo(px, py + 4 + s); g.quadraticCurveTo(px + 8, py + s, px + T, py + 6 + s);
  g.moveTo(px, py + 11 + s / 2); g.quadraticCurveTo(px + 8, py + 8, px + T, py + 13); g.stroke();
}
function laserCase(g, x, y, px, py) {
  const l = niv.lasers.find(o => o.x === x && o.y === y);
  g.fillStyle = '#2a2c34'; g.fillRect(px, py, T, T);
  g.fillStyle = '#4a4e5c'; g.fillRect(px + 1, py + 1, T - 2, T - 2);
  g.fillStyle = '#16171c'; g.fillRect(px + 3, py + 3, T - 6, T - 6);
  if (!l) return;
  g.fillStyle = '#ff3a5a';
  if (l.balai) { g.beginPath(); g.arc(px + T / 2, py + T / 2, 3, 0, 7); g.fill(); return; }        // balayeur : œil rond qui pivote
  if (l.dx && l.dy) { g.fillRect(l.dx > 0 ? px + T - 4 : px, l.dy > 0 ? py + T - 4 : py, 4, 4); return; }   // en diagonale : buse dans l'angle
  if (l.dx) g.fillRect(l.dx > 0 ? px + T - 3 : px, py + 6, 3, 4); else g.fillRect(px + 6, l.dy > 0 ? py + T - 3 : py, 4, 3);
}
function bruleurCase(g, x, y, px, py) {               // bec de brûleur : bloc de fonte avec une buse
  const b = niv.bruleurs.find(o => o.x === x && o.y === y);
  g.fillStyle = '#2c2420'; g.fillRect(px, py, T, T);
  g.fillStyle = '#5a4438'; g.fillRect(px + 1, py + 1, T - 2, T - 2);
  g.fillStyle = '#3a2a22'; g.fillRect(px + 3, py + 3, T - 6, T - 6);
  g.fillStyle = '#8a6a50'; for (const [a, c] of [[2, 2], [T - 4, 2], [2, T - 4], [T - 4, T - 4]]) g.fillRect(px + a, py + c, 2, 2);
  if (!b) return;
  g.fillStyle = '#ff8a3a';
  if (b.dx) g.fillRect(b.dx > 0 ? px + T - 3 : px, py + 4, 3, 8); else g.fillRect(px + 4, b.dy > 0 ? py + T - 3 : py, 8, 3);
}
function rebondiCase(g, px, py) {
  const gr = g.createLinearGradient(0, py, 0, py + T);
  gr.addColorStop(0, '#9dff7a'); gr.addColorStop(1, '#3f9a3a');
  g.fillStyle = gr; g.fillRect(px, py + 2, T, T - 2);
  g.fillStyle = '#e8ffd8'; g.fillRect(px + 2, py + 3, T - 4, 2);
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(px, py + T - 3, T, 3);
}

/* ---------- Particules ---------- */
function part(x, y, vx, vy, vie, c, taille, grav, lum, forme) {
  if (parts.length > 700) parts.shift();
  parts.push({ x, y, vx, vy, vie, max: vie, c, t: taille || 2, g: grav === undefined ? 0.1 : grav, lum: !!lum, f: forme || 0, a: Math.random() * 6.3 });
}
// une particule avec sa forme (traînées de la boutique : cœurs, étoiles, notes, feuilles, flocons, flammes…)
function dessinerPart(g, p) {
  const k = p.vie / p.max, s = p.t;
  g.fillStyle = p.c;
  switch (p.f) {
    case 'coeur': g.beginPath(); g.arc(p.x - s * 0.3, p.y - s * 0.15, s * 0.36, 0, 7); g.arc(p.x + s * 0.3, p.y - s * 0.15, s * 0.36, 0, 7); g.fill(); g.beginPath(); g.moveTo(p.x - s * 0.64, p.y); g.lineTo(p.x, p.y + s * 0.7); g.lineTo(p.x + s * 0.64, p.y); g.fill(); return;
    case 'etoile': { const r1 = s * (0.8 + 0.4 * Math.sin(p.vie * 0.5)); g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + p.a, r = i % 2 ? r1 * 0.28 : r1; g.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r); } g.fill(); return; }
    case 'note': g.beginPath(); g.ellipse(p.x, p.y, s * 0.4, s * 0.3, -0.4, 0, 7); g.fill(); g.fillRect(p.x + s * 0.28, p.y - s * 1.1, s * 0.16, s * 1.1); g.fillRect(p.x + s * 0.28, p.y - s * 1.1, s * 0.5, s * 0.2); return;
    case 'feuille': g.save(); g.translate(p.x, p.y); g.rotate(p.a + p.vie * 0.08); g.beginPath(); g.ellipse(0, 0, s * 0.7, s * 0.3, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(0,60,0,.4)'; g.fillRect(-s * 0.6, -0.15, s * 1.2, 0.3); g.restore(); return;
    case 'flocon': g.strokeStyle = p.c; g.lineWidth = 0.5; g.beginPath(); for (let i = 0; i < 3; i++) { const a = p.a + i * Math.PI / 3; g.moveTo(p.x - Math.cos(a) * s * 0.7, p.y - Math.sin(a) * s * 0.7); g.lineTo(p.x + Math.cos(a) * s * 0.7, p.y + Math.sin(a) * s * 0.7); } g.stroke(); return;
    case 'bulle': g.strokeStyle = p.c; g.lineWidth = 0.6; g.beginPath(); g.arc(p.x, p.y, s * 0.6, 0, 7); g.stroke(); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(p.x - s * 0.3, p.y - s * 0.35, s * 0.2, s * 0.2); return;
    case 'eclair': g.strokeStyle = p.c; g.lineWidth = 0.7; g.beginPath(); g.moveTo(p.x, p.y - s); g.lineTo(p.x - s * 0.4, p.y); g.lineTo(p.x + s * 0.3, p.y); g.lineTo(p.x - s * 0.1, p.y + s); g.stroke(); return;
    case 'flamme': { const r = s * (0.4 + 0.8 * k), gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, r); gr.addColorStop(0, k > 0.6 ? 'rgba(255,250,200,.95)' : 'rgba(255,200,80,.9)'); gr.addColorStop(0.5, `rgba(255,${(90 + 80 * k) | 0},20,.7)`); gr.addColorStop(1, 'rgba(200,30,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, r, 0, 7); g.fill(); return; }
    case 'fumee': { const r = s * (1.6 - k), gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, r); gr.addColorStop(0, 'rgba(20,4,40,.75)'); gr.addColorStop(0.6, 'rgba(70,20,130,.35)'); gr.addColorStop(1, 'rgba(120,60,220,0)'); g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, r, 0, 7); g.fill(); return; }
    case 'scintille': { const r = s * (0.5 + 0.5 * Math.abs(Math.sin(p.vie * 0.4 + p.a))); g.fillRect(p.x - r, p.y - 0.25, r * 2, 0.5); g.fillRect(p.x - 0.25, p.y - r, 0.5, r * 2); g.beginPath(); g.arc(p.x, p.y, 0.6, 0, 7); g.fill(); return; }
    default: g.fillRect(p.x - s / 2, p.y - s / 2, s, s);
  }
}
function eclats(x, y, n, c, force, grav, lum) {
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, f = Math.random() * (force || 2); part(x, y, Math.cos(a) * f, Math.sin(a) * f, 20 + Math.random() * 25, c, 1.5 + Math.random() * 2, grav, lum); }
}
function evenements(e) {
  const ev = e.ev, cxp = e.x + PW / 2, cyp = e.y + PH / 2;
  if (!ev) return;
  const EV = M.EV;
  if (ev & EV.MORT) { eclats(e.evX, e.evY, 46, COUL_PHASE[e.phase], 4, 0.12, true); tremble = 9; flash = 0.3; flashC = '#ff3050'; }
  if (ev & EV.SAUT) eclats(cxp, e.y + PH, 7, 'rgba(255,255,255,.6)', 1.2, 0.04);
  if (ev & EV.REBOND) { eclats(cxp, e.y + PH, 20, '#fff', 2.8, 0.05, true); tremble = 3; }
  if (ev & EV.MUR) eclats(e.evX < 0 ? e.x + PW : e.x, cyp, 7, 'rgba(255,255,255,.6)', 1.3, 0.05);
  if (ev & EV.ATTERRIT) eclats(cxp, e.y + PH, 5, 'rgba(255,255,255,.35)', 0.9, 0.05);
  if (ev & EV.CHANGE) { eclats(cxp, cyp, 18, COUL_PHASE[e.phase], 2.4, 0, true); }
  if (ev & EV.CASSE) { eclats(e.evX * T + 8, e.evY * T + 8, 20, th.motif, 3.2); tremble = Math.max(tremble, 4); }
  if (ev & (EV.RESSORT | EV.BOND)) eclats(cxp, e.y + PH, 12, '#b6ff9a', 2.2, 0.05, true);
  if (ev & EV.BOUM) { eclats(e.evX * T + 8, e.evY * T + 8, 46, '#ffb040', 5, 0.02, true); tremble = 10; flash = 0.22; flashC = '#ffa030'; }
  if (ev & EV.EVAPORE) eclats(cxp, cyp, 26, '#fff', 2.2, -0.05);
  if (ev & EV.CRISTAL) eclats(e.evX * T + 8, e.evY * T + 8, 18, '#7dfcff', 2.6, 0, true);
  if (ev & EV.ECLAT) { eclats(e.evX * T + 8, e.evY * T + 8, 34, '#ff7ae0', 3.2, 0, true); flash = 0.18; flashC = '#ff7ae0'; }
  if (ev & EV.DRAPEAU) eclats(e.evX * T + 8, e.evY * T + 4, 16, '#7dff9a', 2.2, 0, true);
  if (ev & EV.TP) { eclats(e.evX, e.evY, 18, '#c08bff', 2.6, 0, true); eclats(cxp, cyp, 18, '#c08bff', 2.6, 0, true); }
  if (ev & EV.FIN) { eclats(cxp, cyp, 70, th.accent, 4.5, 0, true); flash = 0.35; flashC = '#fff'; }
  if (ev & EV.FRACAS) eclats(cxp, e.y, 8, '#fff', 1.6, -0.05);
  if (ev & EV.CONVERSION) eclats(cxp, cyp, 10, '#bfe8ff', 2, 0, true);
  if (ev & EV.JET) eclats(cxp, cyp, 12, '#4fb8ff', 2.2, 0.1);
  if (ev & EV.NAGE) { eclats(cxp, cyp, 12, '#bff', 1.6, -0.02); for (let k = 0; k < 14; k++) part(cxp + (Math.random() - 0.5) * 10, e.y, (Math.random() - 0.5) * 2.2, -1.5 - Math.random() * 2.2, 40, 'rgba(190,240,255,.85)', 1.8, 0.14); }   // éclaboussures qui retombent
  if (ev & EV.CAPA) { for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2; part(cxp, cyp, Math.cos(a) * 2.4, Math.sin(a) * 2.4, 22, COUL_PHASE[e.phase], 2, 0, true); } }
  if (e.torrent > 0) for (let k = 0; k < 3; k++) part(cxp - e.tdx * 6 + (Math.random() - 0.5) * 6, cyp - e.tdy * 6 + (Math.random() - 0.5) * 6, -e.tdx * 1.5 + (Math.random() - 0.5), -e.tdy * 1.5 + (Math.random() - 0.5), 24, 'rgba(120,200,255,.8)', 2.2, 0.06);   // le jet d'eau
  if (e.sol && Math.abs(e.vx) > 2.5 && Math.random() < 0.25) part(cxp - Math.sign(e.vx) * 5, e.y + PH - 1, -e.vx * 0.15, -0.3 - Math.random() * 0.4, 18, 'rgba(220,200,170,.4)', 1.6, 0.02);   // poussière de course
  if (ev & EV.BOUTON) { eclats(e.evX * T + 8, e.evY * T + 14, 16, '#ffd84a', 2, 0, true); tremble = 2; }
  if (ev & EV.CRAQUE) eclats(e.evX * T + 8, e.evY * T + 2, 6, th.motif, 1, 0.1);
  if (ev & EV.ORBE) { eclats(e.evX * T + 8, e.evY * T + 8, 16, '#ffe85a', 2.4, 0, true); }
  if (ev & EV.BASCULE) { flash = Math.max(flash, 0.08); flashC = e.bascule ? '#4a8cff' : '#ff4a5a'; }
  if (ev & EV.BANNI) eclats(e.evX * T + 8, e.evY * T + 8, 14, '#ff2a3a', 2, 0, true);
  if (ev & EV.BONUS) eclats(e.evX * T + 8, e.evY * T + 8, 14, e.bonus > 1 ? '#5aff7a' : '#ffaa50', 2, 0, true);
  if (ev & EV.PIECE) eclats(e.evX * T + 8, e.evY * T + 8, 14, '#ffd84a', 2.2, 0, true);
}

/* ---------- Caméra : douce, sans à-coups ---------- */
function suivre(e, hud, vw, vh) {
  // l'avance dans le sens de la course se règle lentement, pour ne pas sauter quand on change de direction
  const visee = Math.max(-1, Math.min(1, e.vx / 4)) * 70;
  cam.avance += (visee - cam.avance) * 0.03;
  const tx = e.x + PW / 2 + cam.avance;
  const ty = e.y + PH / 2 - 14 + Math.max(0, Math.min(36, e.vy * 5));
  if ((hud && hud.recadrer) || (!hud && camNeuve)) { cam.x = tx; cam.y = ty; cam.vx = cam.vy = 0; camNeuve = false; }   // fond du menu : suivi amorti aussi
  // ressort amorti (pas de saut brusque, même après un téléporteur ou une mort)
  const raideur = 0.045, amorti = 0.72;
  const dx = tx - cam.x, dy = ty - cam.y;
  if (Math.abs(dx) > vw * 1.2 || Math.abs(dy) > vh * 1.2) { cam.x += dx * 0.25; cam.y += dy * 0.25; }
  cam.vx = cam.vx * amorti + dx * raideur;
  cam.vy = cam.vy * amorti + (Math.abs(dy) < 10 ? dy * 0.4 : dy) * raideur;
  cam.x += cam.vx; cam.y += cam.vy;
  const lw = niv.w * T, lh = niv.h * T;
  cam.x = lw <= vw ? lw / 2 : Math.max(vw / 2, Math.min(lw - vw / 2, cam.x));
  cam.y = lh <= vh ? lh / 2 : Math.max(vh / 2, Math.min(lh - vh / 2, cam.y));
}

/* ---------- Dessin d'une image ---------- */
function dessiner(e, fantome, hud, dt) {
  temps += dt || 1 / 60;
  const g = cx;
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  const z = zoom() * (hud && hud.zoomNiv || 1);
  cam.z = z;
  const vw = LARG / z, vh = HAUT / z;
  if (niv) suivre(e, hud, vw, vh);
  let ox = cam.x - vw / 2, oy = cam.y - vh / 2;
  derVue.ox = ox; derVue.oy = oy; derVue.z = z;
  if (tremble > 0 && (!hud || hud.tremble !== false)) { ox += (Math.random() - 0.5) * tremble; oy += (Math.random() - 0.5) * tremble; tremble *= 0.85; if (tremble < 0.3) tremble = 0; }
  if (themeDe) { const t2 = themeEn(Math.floor(cam.x / T)); if (t2 !== th) { if (th && hud) { transi = 1; transiC = t2.accent; } th = t2; } }

  arrierePlan(g, ox, oy, z, !!hud);

  g.save();
  g.scale(z, z);
  g.translate(-ox, -oy);
  if (niv) {
    g.imageSmoothingEnabled = false;
    const k0 = Math.max(0, Math.floor(ox / T / MORC)), k1 = Math.min(Math.ceil(niv.w / MORC) - 1, Math.floor((ox + vw) / T / MORC));
    for (let k = k0; k <= k1; k++) g.drawImage(morceau(k), k * MORC * T, 0, MORC * T, niv.h * T);
    g.imageSmoothingEnabled = true;
  }
  const vis = (x, y) => x * T + T > ox - 8 && x * T < ox + vw + 8 && y * T + T > oy - 8 && y * T < oy + vh + 8;
  casesAnimees(g, e, vis);
  mobiles(g, e, ox, vw, vis);
  fleches(g, e, ox, vw);
  ennemis(g, e, ox, vw);
  if (hud && hud.monstres) for (const m of hud.monstres) {         // Survivant : chaque ennemi est un rond de rayon r (sa hitbox), détails dedans
    const r = m.r, cx2 = m.x + r, cy2 = m.y + r, tt = m.t;
    const C = { marcheur: ['#ff8a9a', '#c0304a', '#5a0a1a'], sauteur: ['#ffc080', '#d05a20', '#5a2008'], volant: ['#b8ecff', '#3a8ad0', '#0a2a50'], herisse: ['#f0f0f6', '#7a8296', '#2a2e3a'],
      tireur: ['#d4ffa0', '#4aa030', '#14380a'], fonceur: ['#ff8af0', '#a02090', '#40083a'], lourd: ['#e0b88a', '#7a5028', '#2a1808'], diviseur: ['#fff27a', '#c0a010', '#4a3a00'],
      petit: ['#fffac0', '#d0c040', '#4a4000'], fantome: ['#f4f0ff', '#8a7ac8', '#3a2a6a'], bombe: ['#6a6a76', '#202028', '#08080c'],
      archer: ['#a0ffd8', '#2a9a70', '#0a3a28'], invocateur: ['#d0a0ff', '#6a2aa0', '#24083a'], rebond: ['#ffa0c0', '#e04a7a', '#4a0a20'] }[m.type] || ['#ff8a9a', '#c0304a', '#5a0a1a'];
    g.globalAlpha = m.invisible ? 0.15 : 1;
    const ri = m.type === 'herisse' ? r - 2.5 : r;
    if (m.type === 'herisse') {
      g.fillStyle = '#f4eef2';
      for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + tt * 0.05; g.beginPath(); g.moveTo(cx2 + Math.cos(a) * r, cy2 + Math.sin(a) * r); g.lineTo(cx2 + Math.cos(a + 0.3) * ri, cy2 + Math.sin(a + 0.3) * ri); g.lineTo(cx2 + Math.cos(a - 0.3) * ri, cy2 + Math.sin(a - 0.3) * ri); g.fill(); }
    }
    g.fillStyle = C[2]; g.beginPath(); g.arc(cx2, cy2, ri, 0, 7); g.fill();                      // contour
    const gr = g.createRadialGradient(cx2 - ri * 0.35, cy2 - ri * 0.4, 0.5, cx2, cy2, ri);
    gr.addColorStop(0, C[0]); gr.addColorStop(0.7, C[1]); gr.addColorStop(1, C[2]);
    g.fillStyle = gr; g.beginPath(); g.arc(cx2, cy2, ri - 0.9, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(cx2 - ri * 0.35, cy2 - ri * 0.45, ri * 0.28, ri * 0.16, -0.5, 0, 7); g.fill();   // reflet
    // pattes qui trottinent (dans le rond)
    if (['marcheur', 'sauteur', 'lourd', 'diviseur', 'petit', 'tireur', 'archer', 'invocateur', 'fonceur', 'bombe'].includes(m.type)) {
      const pas2 = Math.sin(tt * 0.35) * 1.2; g.fillStyle = C[2];
      g.fillRect(cx2 - ri * 0.5 - 1, cy2 + ri - 2.2 + pas2 * 0.3, 2.4, 1.8); g.fillRect(cx2 + ri * 0.5 - 1.4, cy2 + ri - 2.2 - pas2 * 0.3, 2.4, 1.8);
    }
    // yeux qui regardent le joueur
    const ax = Math.max(-1, Math.min(1, (e.x + 6 - cx2) / 40)), ay = Math.max(-1, Math.min(1, (e.y + 6 - cy2) / 40));
    const ey = cy2 - ri * 0.18, ec = ri * 0.32, er = Math.max(1.4, ri * 0.24);
    for (const sx of m.type === 'invocateur' ? [0] : [-1, 1]) {
      g.fillStyle = '#fff'; g.beginPath(); g.arc(cx2 + sx * ec, ey, er, 0, 7); g.fill();
      g.fillStyle = m.type === 'fantome' ? '#3a2a6a' : '#140a10'; g.beginPath(); g.arc(cx2 + sx * ec + ax * er * 0.45, ey + ay * er * 0.45, er * 0.55, 0, 7); g.fill();
    }
    if (m.type === 'marcheur' || m.type === 'fonceur' || m.type === 'lourd') { g.strokeStyle = C[2]; g.lineWidth = 1; g.beginPath(); g.moveTo(cx2 - ec - er, ey - er - 0.5); g.lineTo(cx2 - ec + er * 0.6, ey - er * 0.4); g.moveTo(cx2 + ec + er, ey - er - 0.5); g.lineTo(cx2 + ec - er * 0.6, ey - er * 0.4); g.stroke(); }  // sourcils méchants
    if (m.type === 'volant') { g.fillStyle = 'rgba(255,255,255,.85)'; const bat = Math.sin(tt * 0.5) * 1.6; g.beginPath(); g.ellipse(cx2 - ri + 1.6, cy2 + bat * 0.4, 1.6, 2.6 + bat * 0.3, 0.4, 0, 7); g.ellipse(cx2 + ri - 1.6, cy2 - bat * 0.4, 1.6, 2.6 - bat * 0.3, -0.4, 0, 7); g.fill(); }
    if (m.type === 'rebond') { g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1; g.beginPath(); g.arc(cx2, cy2, ri * 0.6, 0.3, 2.8); g.stroke(); }
    if (m.type === 'archer') { g.strokeStyle = '#6a4a20'; g.lineWidth = 1.2; g.beginPath(); g.arc(cx2 + m.dir * ri * 0.45, cy2 + 1, ri * 0.45, -1.2, 1.2); g.stroke(); }
    if (m.type === 'invocateur') { g.fillStyle = 'rgba(40,10,70,.8)'; g.beginPath(); g.moveTo(cx2 - ri * 0.8, cy2 - ri * 0.3); g.lineTo(cx2, cy2 - ri + 0.5); g.lineTo(cx2 + ri * 0.8, cy2 - ri * 0.3); g.fill(); }
    if (m.type === 'tireur') { g.fillStyle = C[2]; g.fillRect(cx2 + (m.dir > 0 ? ri * 0.3 : -ri * 0.3 - 4), cy2 + 1, 4, 2.5); }
    if (m.type === 'lourd' && m.pv > 1) { g.strokeStyle = '#ffd34d'; g.lineWidth = 1.5; g.beginPath(); g.arc(cx2, cy2, ri - 1, 0, 7); g.stroke(); }
    if (m.elite) { g.strokeStyle = '#ffd34d'; g.lineWidth = 1.4; g.beginPath(); g.arc(cx2, cy2, ri - 0.8, 0, 7); g.stroke();       // élite : liseré et couronne dorés
      g.fillStyle = '#ffd34d'; g.beginPath(); g.moveTo(cx2 - 3, cy2 - ri + 3.5); g.lineTo(cx2 - 3, cy2 - ri + 1); g.lineTo(cx2 - 1.5, cy2 - ri + 2.4); g.lineTo(cx2, cy2 - ri + 0.8); g.lineTo(cx2 + 1.5, cy2 - ri + 2.4); g.lineTo(cx2 + 3, cy2 - ri + 1); g.lineTo(cx2 + 3, cy2 - ri + 3.5); g.fill(); }
    if (m.type === 'bombe') { g.fillStyle = m.meche && Math.floor(m.meche / 6) % 2 ? '#ff3a3a' : '#ffd34d'; g.fillRect(cx2 - 1, cy2 - ri, 2, 2.5);
      if (m.meche) { g.strokeStyle = `rgba(255,60,60,${0.3 + 0.3 * Math.sin(tt)})`; g.lineWidth = 1; g.beginPath(); g.arc(cx2, cy2, 3 * T, 0, 7); g.stroke(); } }
    if (m.type === 'fonceur' && m.prep > 0) { g.strokeStyle = `rgba(255,74,224,${0.25 + 0.25 * Math.sin(m.prep)})`; g.lineWidth = 2; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(cx2, cy2); g.lineTo(cx2 + m.dir * 90, cy2); g.stroke(); g.setLineDash([]); }   // préavis : sa trajectoire
    if (m.type === 'fonceur' && m.charge > 0) { g.fillStyle = 'rgba(255,74,224,.35)'; g.fillRect(cx2 - m.dir * (r + 9), cy2 - 2, 8, 4); }
    g.globalAlpha = 1;
  }
  if (hud && hud.prochain) {                                      // apparition annoncée : cercle qui se resserre et point d'exclamation
    const p2 = hud.prochain, cx2 = p2.x + p2.r, cy2 = p2.y + p2.r, k = Math.max(0, p2.t) / 72;
    g.strokeStyle = `rgba(255,80,90,${0.5 + 0.4 * Math.sin(temps * 14)})`; g.lineWidth = 2;
    g.beginPath(); g.arc(cx2, cy2, p2.r + k * 18, 0, 7); g.stroke();
    g.fillStyle = 'rgba(255,80,90,.18)'; g.beginPath(); g.arc(cx2, cy2, p2.r, 0, 7); g.fill();
    g.fillStyle = '#ff5a6a'; g.font = '800 14px "Chakra Petch", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', cx2, cy2); g.textBaseline = 'top';
  }
  if (hud && hud.balles) for (const b2 of hud.balles) { g.fillStyle = b2[5] ? '#a0ffd8' : '#c0ff8a'; g.beginPath(); g.arc(b2[0], b2[1], 2.5, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(b2[0] - 0.8, b2[1] - 1.5, 1.2, 1.2); }
  if (hud && hud.grille && niv) {                                // éditeur : grille fine
    g.strokeStyle = 'rgba(255,255,255,.09)'; g.lineWidth = 0.5; g.beginPath();
    const x0g = Math.max(0, Math.floor(ox / T)), x1g = Math.min(niv.w, Math.ceil((ox + vw) / T)), y0g = Math.max(0, Math.floor(oy / T)), y1g = Math.min(niv.h, Math.ceil((oy + vh) / T));
    for (let x = x0g; x <= x1g; x++) { g.moveTo(x * T, y0g * T); g.lineTo(x * T, y1g * T); }
    for (let y = y0g; y <= y1g; y++) { g.moveTo(x0g * T, y * T); g.lineTo(x1g * T, y * T); }
    g.stroke();
  }
  if (hud && hud.selection) { const [a, b, c2, d2] = hud.selection; g.fillStyle = 'rgba(120,200,255,.2)'; g.fillRect(a * T, b * T, (c2 - a + 1) * T, (d2 - b + 1) * T); g.strokeStyle = '#7cf'; g.lineWidth = 1; g.setLineDash([3, 2]); g.strokeRect(a * T, b * T, (c2 - a + 1) * T, (d2 - b + 1) * T); g.setLineDash([]); }
  if (hud && hud.curseur) {                                       // éditeur : case visée et aperçu de ce qu'on va poser
    const [cx3, cy3] = hud.curseur;
    g.strokeStyle = `rgba(255,233,74,${0.6 + 0.4 * Math.sin(temps * 8)})`; g.lineWidth = 1.5; g.strokeRect(cx3 * T - 0.5, cy3 * T - 0.5, T + 1, T + 1);
    g.fillStyle = 'rgba(255,233,74,.18)'; g.fillRect(cx3 * T, cy3 * T, T, T);
    g.fillStyle = '#fff'; g.font = '700 10px "Chakra Petch", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(hud.curseur[2], cx3 * T + T / 2, cy3 * T - 6); g.textBaseline = 'top';
  }
  if (fantome && !fantome.fini) joueur(g, fantome, hud && hud.fantomeFort ? 0.62 : 0.32, true);   // en entraînement, le robot se voit mieux
  competences(g, e);
  if (e.mortT === 0) joueur(g, e, 1, false);
  eauDessus(g, vis);
  // carte de lumière : un voile sombre, percé par chaque source de lumière
  {
    // nuit noire : tout est sombre, sauf un éclair de temps en temps (adouci si « réduire les flashs »)
    const nuitT = hud && hud.nuit >= 0 ? hud.nuit % 200 : -1, eclair = nuitT >= 0 && nuitT < 26 ? (1 - nuitT / 26) * (ACCES && ACCES.sansFlash ? 0.35 : 0.85) : 0;
    const sombre = hud && hud.brouillardFort ? 0.985 : hud && hud.brouillard ? 0.93 : nuitT >= 0 ? 0.97 - eclair : (th.nuit || 0.38) * 0.75;      // le paysage du fond reste visible
    if (!ombreCv || ombreCv.width !== Math.ceil(vw) || ombreCv.height !== Math.ceil(vh)) { ombreCv = document.createElement('canvas'); ombreCv.width = Math.ceil(vw); ombreCv.height = Math.ceil(vh); }
    const o = ombreCv.getContext('2d');
    o.globalCompositeOperation = 'source-over';
    o.clearRect(0, 0, ombreCv.width, ombreCv.height);
    o.fillStyle = `rgba(${th.voile || '6,4,14'},${sombre})`; o.fillRect(0, 0, ombreCv.width, ombreCv.height);
    o.globalCompositeOperation = 'destination-out';
    const trou = (wx, wy, r, f) => {
      const sx = wx - ox, sy = wy - oy;
      if (sx < -r || sy < -r || sx > vw + r || sy > vh + r) return;
      const l = o.createRadialGradient(sx, sy, 0, sx, sy, r);
      l.addColorStop(0, `rgba(0,0,0,${f})`); l.addColorStop(0.6, `rgba(0,0,0,${f * 0.45})`); l.addColorStop(1, 'rgba(0,0,0,0)');
      o.fillStyle = l; o.fillRect(sx - r, sy - r, r * 2, r * 2);
    };
    if (e.mortT === 0 || !hud) trou(e.x + PW / 2, e.y + PH / 2, hud ? (hud.brouillardFort ? 52 : hud.brouillard ? 85 : nuitT >= 0 ? 105 : 120) : 260, 1);
    for (const [x, y, c, r] of dyn.lumieres) if (vis(x, y)) trou(x * T + 8, y * T + 8, r * 2.2 * (0.92 + 0.08 * Math.sin(temps * 5 + x)), 0.95);
    g.drawImage(ombreCv, ox, oy, vw, vh);
  }
  // lumières (mode additif)
  g.globalCompositeOperation = 'lighter';
  for (const [x, y, c, r] of dyn.lumieres) {
    if (!vis(x, y)) continue;
    const px = x * T + 8, py = y * T + 8, rr = r * (0.9 + 0.1 * Math.sin(temps * 3 + x));
    const l = g.createRadialGradient(px, py, 0, px, py, rr);
    l.addColorStop(0, `rgba(${c},.28)`); l.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = l; g.fillRect(px - rr, py - rr, rr * 2, rr * 2);
  }
  if (e.mortT === 0) {
    const px = e.x + PW / 2, py = e.y + PH / 2, rr = 70;
    const l = g.createRadialGradient(px, py, 0, px, py, rr);
    l.addColorStop(0, `rgba(${th.lum},.16)`); l.addColorStop(1, `rgba(${th.lum},0)`);
    g.fillStyle = l; g.fillRect(px - rr, py - rr, rr * 2, rr * 2);
  }
  // particules
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.97; p.vie--;
    if (p.vie <= 0) { parts.splice(i, 1); continue; }
    if (!p.lum) continue;
    g.globalAlpha = Math.min(1, p.vie / p.max * 1.5);
    if (p.f) { dessinerPart(g, p); continue; }
    g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.t * 0.6, 0, 6.3); g.fill();
  }
  g.globalCompositeOperation = 'source-over';
  for (const p of parts) {
    if (p.lum) continue;
    g.globalAlpha = Math.min(1, p.vie / p.max * 1.5);
    if (p.f) { dessinerPart(g, p); continue; }
    g.fillStyle = p.c; g.fillRect(p.x - p.t / 2, p.y - p.t / 2, p.t, p.t);
  }
  g.globalAlpha = 1;
  ambiance(g, ox, oy, vw, vh);
  g.restore();

  // lignes de vitesse quand on file très vite
  if (hud && niv && e.mortT === 0) {
    const v = Math.hypot(e.vx, e.vy);
    if (v > 4.6) {
      const k = Math.min(1, (v - 4.6) / 3);
      g.strokeStyle = `rgba(255,255,255,${0.10 * k})`; g.lineWidth = 2;
      for (let i = 0; i < 14; i++) {
        const y = alea(i * 5.3 + Math.floor(temps * 20)) * HAUT, x = alea(i * 2.1 + Math.floor(temps * 20)) * LARG, lg = 40 + 80 * k;
        if (Math.abs(y - HAUT / 2) < HAUT * 0.18) continue;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x - Math.sign(e.vx || 1) * lg, y); g.stroke();
      }
    }
  }
  if (transi > 0 && !ACCES.sansFlash) { g.globalAlpha = transi * 0.22; g.fillStyle = transiC; g.fillRect(0, 0, LARG, HAUT); g.globalAlpha = 1; transi -= 0.012; }
  if (flash > 0 && ACCES.sansFlash) flash = Math.min(flash, 0.04);
  if (flash > 0) { g.globalAlpha = flash; g.fillStyle = flashC; g.fillRect(0, 0, LARG, HAUT); g.globalAlpha = 1; flash *= 0.85; if (flash < 0.02) flash = 0; }
  // vignette colorée
  const vg = g.createRadialGradient(LARG / 2, HAUT / 2, Math.min(LARG, HAUT) * 0.38, LARG / 2, HAUT / 2, Math.max(LARG, HAUT) * 0.78);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)');
  g.fillStyle = vg; g.fillRect(0, 0, LARG, HAUT);
  if (!(typeof window !== 'undefined' && window.VITRINE_SANS_HUD)) interfaceJeu(g, e, hud);
}

/* ---------- Arrière-plan en couches (parallaxe) ---------- */
const couches = new Map();
function arrierePlan(g, ox, oy, z, enJeu) {
  // un vrai paysage peint (js/paysages.js), en plusieurs plans qui défilent
  const P = racine.Paysages, cle = Object.keys(THEMES).find(k => THEMES[k] === th);
  if (P && cle) {
    const vh = HAUT / z, fy = niv ? Math.max(0, Math.min(1, oy / Math.max(1, niv.h * T - vh))) : 0.5;
    if (P.dessiner(g, cle, ox * z, fy, LARG, HAUT, temps)) {
      if (enJeu && th.style === 'cristal' && temps % 5.3 < 0.08) { flash = Math.max(flash, 0.1); flashC = '#e6dcff'; }
      return;
    }
  }
  const gr = g.createLinearGradient(0, 0, 0, HAUT);
  gr.addColorStop(0, th.ciel[0]); gr.addColorStop(1, th.ciel[1]);
  g.fillStyle = gr; g.fillRect(0, 0, LARG, HAUT);
  const id = th.style + th.nom;
  // étoiles et poussière lumineuse très lointaines, qui scintillent
  g.save();
  for (let i = 0; i < 90; i++) {
    const s1 = alea(i * 1.37 + 3), s2 = alea(i * 7.91 + 1);
    const x = ((s1 * LARG * 1.5 - ox * 0.03 * z) % LARG + LARG) % LARG, y = s2 * HAUT * 0.6;
    g.globalAlpha = (0.15 + 0.35 * Math.abs(Math.sin(temps * (0.5 + s1) + i))) * (th.nuit || 0.4);
    g.fillStyle = `rgb(${th.lum})`; g.fillRect(x, y, 1 + (i % 5 === 0 ? 1 : 0), 1 + (i % 5 === 0 ? 1 : 0));
  }
  g.restore();
  // rayons de lumière lointains
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const x = ((i * 397 - ox * 0.08 * z) % (LARG + 400) + LARG + 400) % (LARG + 400) - 200;
    const l = g.createLinearGradient(x, 0, x + 120, HAUT);
    l.addColorStop(0, `rgba(${th.lum},.07)`); l.addColorStop(1, `rgba(${th.lum},0)`);
    g.fillStyle = l;
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 60, 0); g.lineTo(x + 260, HAUT); g.lineTo(x + 140, HAUT); g.fill();
  }
  g.restore();
  // grand astre lumineux (soleil voilé, lune, lueur) qui défile très lentement
  {
    const ax = LARG * 0.72 - (ox * 0.02 * z) % (LARG * 0.6), ay = HAUT * 0.22, r = Math.min(LARG, HAUT) * 0.5;
    const l = g.createRadialGradient(ax, ay, 0, ax, ay, r);
    l.addColorStop(0, `rgba(${th.lum},.32)`); l.addColorStop(0.15, `rgba(${th.lum},.14)`); l.addColorStop(1, `rgba(${th.lum},0)`);
    g.fillStyle = l; g.fillRect(0, 0, LARG, HAUT);
  }
  // trois reliefs, du plus lointain au plus proche, chacun voilé de brume (perspective atmosphérique)
  for (let c = 0; c < 3; c++) {
    if (c > 0) {
      const hz = g.createLinearGradient(0, HAUT * 0.25, 0, HAUT);
      hz.addColorStop(0, 'rgba(0,0,0,0)'); hz.addColorStop(1, `rgba(${th.lum},.05)`);
      g.fillStyle = hz; g.fillRect(0, 0, LARG, HAUT);
    }
    const f = [0.12, 0.25, 0.42][c], base = HAUT * [0.42, 0.58, 0.74][c] - (oy * f * 0.3 * z) % 60, amp = HAUT * [0.18, 0.16, 0.14][c];
    g.fillStyle = th.loin[c];
    g.beginPath(); g.moveTo(0, HAUT);
    const dec = ox * f * z;
    for (let x = 0; x <= LARG + 20; x += 16) {
      const u = (x + dec) / 140;
      let h;
      switch (th.style) {
        case 'brique': case 'metal': h = Math.floor(bruit(u * 0.6, c * 9) * 4) / 4 * amp + (Math.floor(u) % 3 === 0 ? amp * 0.3 : 0); break;
        case 'cristal': h = Math.abs(((u * 2) % 2) - 1) * amp * bruit(u * 0.5, c); break;
        case 'neige': h = (bruit(u, c * 7) * 0.7 + Math.abs(((u * 1.3) % 2) - 1) * 0.3) * amp * 1.2; break;
        case 'corail': h = (bruit(u * 2, c * 5) * 0.6 + 0.4 * Math.sin(u * 3 + temps * 0.5)) * amp * 0.8; break;
        case 'veines': h = (0.5 + 0.5 * Math.sin(u * 1.7 + temps * (0.6 + c * 0.2))) * amp * 0.7; break;
        default: h = (bruit(u, c * 7) * 0.75 + bruit(u * 3, c * 3) * 0.25) * amp;
      }
      g.lineTo(x, base - h);
    }
    g.lineTo(LARG + 20, HAUT); g.fill();
    // arête éclairée par l'astre
    g.strokeStyle = `rgba(${th.lum},${0.05 + c * 0.03})`; g.lineWidth = 1.5; g.stroke();
    // fenêtres / détails sur les reliefs
    if (th.style === 'brique' || th.style === 'metal') {
      g.fillStyle = th === THEMES.chaufferie ? `rgba(255,120,40,${0.25 + 0.1 * Math.sin(temps * 2 + c)})` : `rgba(${th.lum},.12)`;
      for (let i = 0; i < 12; i++) {
        const x = ((i * 157 + c * 61 - dec) % (LARG + 100) + LARG + 100) % (LARG + 100) - 50;
        g.fillRect(x, base - amp * 0.4 + (i % 3) * 14, 6, 4);
      }
    }
  }
  objetsFond(g, ox, oy, z);
  decorPlus(g, ox, oy, z);
  // brume au sol
  const br = g.createLinearGradient(0, HAUT * 0.55, 0, HAUT);
  br.addColorStop(0, 'rgba(0,0,0,0)'); br.addColorStop(1, `rgba(${th.lum},.06)`);
  g.fillStyle = br; g.fillRect(0, HAUT * 0.55, LARG, HAUT * 0.45);
  if (enJeu && th.style === 'cristal' && Math.sin(temps * 0.9) > 0.993) { flash = Math.max(flash, 0.12); flashC = '#e6dcff'; }
}
// lumières flottantes, bancs de brume qui dérivent, et silhouettes proches qui encadrent l'écran (parallaxe forte)
function decorPlus(g, ox, oy, z) {
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 22; i++) {                                 // lucioles / bokeh flous
    const s1 = alea(i * 5.17 + 2), s2 = alea(i * 2.71 + 8), r = 6 + s1 * 22;
    const x = ((s1 * LARG * 2 - ox * (0.12 + s2 * 0.1) * z + Math.sin(temps * 0.3 + i) * 30) % (LARG + 80) + LARG + 80) % (LARG + 80) - 40;
    const y = HAUT * (0.15 + s2 * 0.7) + Math.sin(temps * (0.4 + s1 * 0.4) + i * 2) * 18;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${th.lum},${0.10 + 0.06 * Math.sin(temps * 1.3 + i)})`); gr.addColorStop(1, `rgba(${th.lum},0)`);
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  g.restore();
  // deux bancs de brume qui glissent lentement
  g.save();
  for (let k = 0; k < 2; k++) {
    const y = HAUT * (0.5 + k * 0.22), h = HAUT * 0.16, d = (temps * (8 + k * 6) + ox * (0.2 + k * 0.1) * z) % (LARG * 2);
    for (let j = -1; j <= 1; j++) {
      const x = j * LARG * 2 - d;
      const gr = g.createRadialGradient(x + LARG, y, 0, x + LARG, y, LARG);
      gr.addColorStop(0, `rgba(${th.lum},${0.05 - k * 0.015})`); gr.addColorStop(1, `rgba(${th.lum},0)`);
      g.fillStyle = gr; g.fillRect(x, y - h, LARG * 2, h * 2);
    }
  }
  g.restore();
  // silhouettes proches en haut et en bas de l'écran (stalactites, tuyaux, glaçons, coraux…)
  const f = 0.6, dec = ox * f * z, E = 90;
  const i0 = Math.floor(dec / E) - 1, i1 = i0 + Math.ceil(LARG / E) + 2;
  g.save();
  g.fillStyle = th.loin[2]; g.globalAlpha = 0.85;
  for (let i = i0; i <= i1; i++) {
    const s1 = alea(i * 4.3 + 11), s2 = alea(i * 8.9 + 3), x = i * E - dec;
    const lh = 20 + s1 * 70, lw = 18 + s2 * 34;
    switch (th.style) {
      case 'metal': if (s1 > 0.45) { g.fillRect(x, 0, 10, lh + 30); g.fillRect(x - 6, lh + 26, 22, 8); } break;               // tuyaux
      case 'brique': if (s1 > 0.5) { for (let k = 0; k < lh / 8; k++) g.fillRect(x + (k % 2) * 2, k * 8, 6, 6); } break;      // chaînes
      case 'neige': g.beginPath(); g.moveTo(x, 0); g.lineTo(x + lw * 0.5, lh * 1.2); g.lineTo(x + lw, 0); g.fill(); break;     // glaçons
      case 'corail': g.beginPath(); g.moveTo(x, HAUT); g.quadraticCurveTo(x + lw * 0.2 + Math.sin(temps + i) * 6, HAUT - lh * 1.4, x + lw * 0.5, HAUT - lh * 1.6); g.quadraticCurveTo(x + lw * 0.8, HAUT - lh, x + lw, HAUT); g.fill(); break;
      default: g.beginPath(); g.moveTo(x, 0); g.lineTo(x + lw * 0.45, lh); g.lineTo(x + lw, 0); g.fill();                    // stalactites
        if (s2 > 0.55) { g.beginPath(); g.moveTo(x + 10, HAUT); g.lineTo(x + 10 + lw * 0.4, HAUT - lh * 0.6); g.lineTo(x + 10 + lw * 0.8, HAUT); g.fill(); }
    }
  }
  g.restore();
}
// grands éléments du fond, propres à chaque zone (parallaxe moyenne)
function objetsFond(g, ox, oy, z) {
  const f = 0.33, dec = ox * f * z, E = 520;                 // un élément tous les 520 pixels d'écran
  const i0 = Math.floor(dec / E) - 1, i1 = i0 + Math.ceil(LARG / E) + 2;
  g.save();
  for (let i = i0; i <= i1; i++) {
    const s1 = alea(i * 7.3 + 1), s2 = alea(i * 3.1 + 5), x = i * E - dec + s1 * 200, base = HAUT * 0.78 - (oy * f * 0.3 * z) % 40;
    g.globalAlpha = 0.55;
    g.fillStyle = th.loin[1];
    switch (th.style) {
      case 'pierre': {      // arche rocheuse et grue de carrière
        g.beginPath(); g.moveTo(x, base); g.lineTo(x + 30, base - 160 - s2 * 60); g.lineTo(x + 150, base - 180 - s2 * 60); g.lineTo(x + 190, base);
        g.lineTo(x + 140, base); g.quadraticCurveTo(x + 95, base - 120, x + 50, base); g.fill();
        if (s2 > 0.5) { g.strokeStyle = th.loin[1]; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 260, base); g.lineTo(x + 260, base - 220); g.lineTo(x + 380, base - 220); g.moveTo(x + 360, base - 220); g.lineTo(x + 360, base - 170); g.stroke(); }
        break;
      }
      case 'brique':
        if (th === THEMES.chaufferie) {   // cheminées qui fument
          g.fillRect(x + 40, base - 260 - s2 * 80, 34, 300);
          g.fillStyle = `rgba(${th.lum},.25)`; g.fillRect(x + 46, base - 200, 6, 10);
          g.globalAlpha = 0.18; g.fillStyle = '#888';
          for (let k = 0; k < 6; k++) { const t2 = (temps * 0.25 + k / 6 + s1) % 1; g.beginPath(); g.arc(x + 57 + Math.sin(t2 * 6 + k) * 18 + t2 * 60, base - 270 - s2 * 80 - t2 * 200, 14 + t2 * 30, 0, 7); g.fill(); }
        } else {                           // grand aqueduc à arches et cascades
          g.fillRect(x - 20, base - 210, 540, 26);
          for (let k = 0; k < 4; k++) { g.fillRect(x + k * 130, base - 190, 26, 200); }
          g.globalAlpha = 0.25; g.fillStyle = '#9fd8ff';
          for (let k = 0; k < 3; k++) g.fillRect(x + 60 + k * 130 + ((temps * 40) % 6), base - 184, 4, 190);
        }
        break;
      case 'cristal': {     // éclair qui zèbre les nuages de temps en temps
        g.globalAlpha = 0.35; g.fillStyle = th.loin[0];
        for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(x + k * 90, HAUT * 0.18 + s2 * 50, 120, 36, 0, 0, 7); g.fill(); }
        if (Math.sin(temps * 1.3 + i * 2.7) > 0.985) {
          g.globalAlpha = 0.9; g.strokeStyle = '#efe6ff'; g.lineWidth = 2.5; g.beginPath();
          let lx = x + 150, ly = HAUT * 0.2; g.moveTo(lx, ly);
          for (let k = 0; k < 7; k++) { lx += (alea(i * 9 + k + Math.floor(temps * 4)) - 0.5) * 60; ly += HAUT * 0.08; g.lineTo(lx, ly); }
          g.stroke();
        }
        break;
      }
      case 'corail':        // algues géantes qui ondulent
        g.strokeStyle = th.loin[1]; g.lineWidth = 6; g.globalAlpha = 0.6;
        for (let k = 0; k < 3; k++) {
          g.beginPath(); g.moveTo(x + k * 40, base + 20);
          for (let h = 0; h < 10; h++) g.lineTo(x + k * 40 + Math.sin(temps * 1.2 + h * 0.6 + k) * (6 + h * 2), base + 20 - h * 28 - s2 * 30);
          g.stroke();
        }
        break;
      case 'metal': {       // roues dentées qui tournent
        const r = 60 + s2 * 70, cx2 = x + 120, cy2 = base - 120 - s1 * 80, a0 = temps * (s1 > 0.5 ? 0.3 : -0.25);
        g.beginPath();
        for (let k = 0; k < 24; k++) { const a = a0 + k * Math.PI / 12, rr = k % 2 ? r : r + 12; g.lineTo(cx2 + Math.cos(a) * rr, cy2 + Math.sin(a) * rr); }
        g.fill(); g.globalAlpha = 0.5; g.fillStyle = th.ciel[1]; g.beginPath(); g.arc(cx2, cy2, r * 0.35, 0, 7); g.fill();
        break;
      }
      case 'neige': {       // aurore et aiguilles de glace
        g.globalAlpha = 0.18;
        const gr = g.createLinearGradient(0, HAUT * 0.05, 0, HAUT * 0.35);
        gr.addColorStop(0, 'rgba(120,255,200,0)'); gr.addColorStop(0.5, 'rgba(120,255,200,.8)'); gr.addColorStop(1, 'rgba(160,120,255,0)');
        g.fillStyle = gr; g.beginPath(); g.moveTo(x, HAUT * 0.1);
        for (let k = 0; k <= 10; k++) g.lineTo(x + k * 52, HAUT * 0.12 + Math.sin(temps * 0.6 + k * 0.7 + i) * 30);
        g.lineTo(x + 520, HAUT * 0.35); g.lineTo(x, HAUT * 0.35); g.fill();
        g.globalAlpha = 0.5; g.fillStyle = '#c7e6ff';
        g.beginPath(); g.moveTo(x + 200, base); g.lineTo(x + 230, base - 200 - s2 * 90); g.lineTo(x + 260, base); g.fill();
        break;
      }
      case 'veines': {      // éclats de cristal qui flottent et tournent
        g.globalAlpha = 0.4; g.fillStyle = `rgba(${th.lum},.6)`;
        for (let k = 0; k < 3; k++) {
          const cx2 = x + k * 150, cy2 = HAUT * 0.4 + Math.sin(temps * 0.8 + k + i) * 30;
          g.save(); g.translate(cx2, cy2); g.rotate(temps * 0.3 + k);
          g.beginPath(); g.moveTo(0, -30); g.lineTo(12, 0); g.lineTo(0, 30); g.lineTo(-12, 0); g.fill(); g.restore();
        }
        break;
      }
    }
  }
  g.restore();
}
// particules d'ambiance dessinées dans le monde
function ambiance(g, ox, oy, vw, vh) {
  const n = 75;
  g.save();
  for (let i = 0; i < n; i++) {
    const s = alea(i * 3.7), s2 = alea(i * 9.1);
    let x = ox + ((s * vw * 1.2 + temps * 8 * (s2 - 0.5)) % vw + vw) % vw;
    let y = oy + ((s2 * vh) % vh);
    switch (th.amb) {
      case 'poussiere': g.fillStyle = 'rgba(255,220,170,.25)'; y = oy + ((s2 * vh + Math.sin(temps + i) * 6) % vh); g.fillRect(x, y, 1.2, 1.2); break;
      case 'gouttes': g.fillStyle = 'rgba(160,220,255,.35)'; y = oy + ((s2 * vh + temps * 90 * (0.6 + s)) % vh); g.fillRect(x, y, 1, 4); break;
      case 'braises': g.fillStyle = `rgba(255,${120 + s * 80 | 0},40,.6)`; y = oy + vh - ((s2 * vh + temps * 30 * (0.5 + s)) % vh); x += Math.sin(temps * 2 + i) * 4; g.fillRect(x, y, 1.6, 1.6); break;
      case 'pluie': g.strokeStyle = 'rgba(190,180,255,.25)'; y = oy + ((s2 * vh + temps * 320 * (0.7 + s * 0.5)) % vh); g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y + 10); g.stroke(); break;
      case 'bulles': g.strokeStyle = 'rgba(160,255,240,.35)'; y = oy + vh - ((s2 * vh + temps * 25 * (0.5 + s)) % vh); g.beginPath(); g.arc(x + Math.sin(temps * 2 + i) * 3, y, 1 + s * 2, 0, 7); g.stroke(); break;
      case 'etincelles': if (s < 0.3) { g.fillStyle = 'rgba(255,210,90,.7)'; y = oy + ((s2 * vh + temps * 60) % vh); g.fillRect(x, y, 1.2, 2); } break;
      case 'neige': g.fillStyle = 'rgba(255,255,255,.7)'; y = oy + ((s2 * vh + temps * 30 * (0.4 + s)) % vh); x += Math.sin(temps + i) * 6; g.fillRect(x, y, 1.6, 1.6); break;
      case 'eclats': g.fillStyle = `rgba(255,120,220,${0.2 + 0.2 * Math.sin(temps * 3 + i)})`; g.fillRect(x, y + Math.sin(temps + i) * 5, 1.6, 1.6); break;
    }
  }
  g.restore();
}

/* ---------- Cases animées ---------- */
function casesAnimees(g, e, vis) {
  const tt = temps;
  for (const [x, y] of dyn.fragile) {
    if (!vis(x, y) || M.casse(e, x * 1024 + y)) continue;
    const px = x * T, py = y * T;
    const gr = g.createLinearGradient(0, py, 0, py + T); gr.addColorStop(0, th.clair); gr.addColorStop(1, th.mur);
    g.fillStyle = gr; g.fillRect(px, py, T, T);
    g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 1.3; g.beginPath();
    g.moveTo(px + 3, py + 4); g.lineTo(px + 8, py + 8); g.lineTo(px + 6, py + 13); g.moveTo(px + 8, py + 8); g.lineTo(px + 13, py + 6);
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.25)'; g.strokeRect(px + 0.5, py + 0.5, T - 1, T - 1);
  }
  for (const [x, y] of dyn.cassant) {
    if (!vis(x, y)) continue;
    const k = x * 1024 + y, c = e.craque.find(o => o[0] === k);
    const dt = c ? e.temps - c[1] : -1;
    if (c && M.effondre(e, k)) {           // effondré : il revient bientôt, on voit son contour
      const reste = M.K.cassantDelai + M.K.cassantRetour - dt;
      if (reste < 40) { g.strokeStyle = `rgba(255,255,255,${0.5 - reste / 80})`; g.setLineDash([2, 2]); g.strokeRect(x * T + 1, y * T + 1, T - 2, T - 2); g.setLineDash([]); }
      continue;
    }
    const sec = c ? Math.min(1, dt / M.K.cassantDelai) : 0;
    const px = x * T, py = y * T;                   // bloc plein, comme sa hitbox
    g.fillStyle = '#7a5532'; g.fillRect(px, py, T, T);
    g.fillStyle = '#a77a4a'; g.fillRect(px, py, T, 3);
    g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(px + 7, py + 1, 1, 8); g.fillRect(px + 3, py + 9, 6, 1); g.fillRect(px + 11, py + 5, 1, 9);
    if (sec > 0) { g.fillStyle = `rgba(255,80,60,${sec * 0.55})`; g.fillRect(px, py, T, T); }
  }
  for (const [x, y] of dyn.porte) {
    if (!vis(x, y)) continue;
    const b = niv.porteDe.get(x * 1024 + y), ouvert = b !== undefined && e.boutons.indexOf(b) >= 0;
    const px = x * T, py = y * T;
    if (ouvert) { g.fillStyle = 'rgba(255,216,74,.12)'; g.fillRect(px + 6, py, 4, 3); continue; }
    g.fillStyle = '#2c2f36'; g.fillRect(px, py, T, T);
    g.fillStyle = '#8b93a1'; for (let i = 0; i < 4; i++) g.fillRect(px + 1 + i * 4, py, 2, T);
    g.fillStyle = '#ffd84a'; g.fillRect(px, py + 7, T, 2);
  }
  for (const [x, y] of dyn.cle) {                           // clé dorée qui flotte (disparaît une fois prise)
    if (!vis(x, y) || e.cles.indexOf(x * 1024 + y) >= 0) continue;
    const px = x * T + 8, py = y * T + 8 + Math.sin(tt * 3 + x) * 1.5;
    g.fillStyle = '#ffd84a'; g.beginPath(); g.arc(px - 2, py, 3, 0, 7); g.fill(); g.fillRect(px, py - 1, 6, 2); g.fillRect(px + 3, py + 1, 1.5, 2); g.fillRect(px + 5, py + 1, 1.5, 2);
    g.fillStyle = '#3a2a08'; g.beginPath(); g.arc(px - 2, py, 1.2, 0, 7); g.fill();
  }
  for (const [x, y] of dyn.porteCle) {                      // porte dorée à serrure
    if (!vis(x, y)) continue;
    const c = niv.porteCle.get(x * 1024 + y), ouvert = c !== undefined && e.cles.indexOf(c) >= 0, px = x * T, py = y * T;
    if (ouvert) { g.fillStyle = 'rgba(255,216,74,.12)'; g.fillRect(px + 2, py, T - 4, 2); continue; }
    g.fillStyle = '#5a4210'; g.fillRect(px, py, T, T); g.fillStyle = '#d8a83a'; g.fillRect(px + 1, py + 1, T - 2, T - 2);
    g.fillStyle = '#5a4210'; g.beginPath(); g.arc(px + 8, py + 6, 2.2, 0, 7); g.fill(); g.fillRect(px + 7, py + 7, 2, 5);
  }
  for (const [x, y] of dyn.rythme) {                        // plateforme en rythme : pleine quand elle est là, clignote avant de partir
    if (!vis(x, y)) continue;
    const px = x * T, py = y * T, la = M.rythmeLa(niv, e.temps, x, y), dd = niv.rythme.get(y * niv.w + x), k = (e.temps + dd) % M.K.rythmePer;
    if (la) {
      const part2 = k > M.K.rythmeOn - 24 && Math.floor(tt * 14) % 2;
      g.fillStyle = part2 ? 'rgba(160,120,255,.45)' : '#8a6aff'; g.fillRect(px, py, T, 5); g.fillStyle = '#d8ccff'; g.fillRect(px, py, T, 1.5);
    } else { g.strokeStyle = 'rgba(160,130,255,.35)'; g.lineWidth = 1; g.setLineDash([2, 2]); g.strokeRect(px + 0.5, py + 0.5, T - 1, 4); g.setLineDash([]); }
  }
  for (const [x, y] of dyn.minuteur) {                      // bouton à minuterie (bleu) + jauge du temps restant
    if (!vis(x, y)) continue;
    const px = x * T, py = y * T, actif = e.minut > e.temps;
    g.fillStyle = '#2a3440'; g.fillRect(px + 1, py + T - 3, T - 2, 3);
    g.fillStyle = actif ? '#7ad8ff' : '#3a8cff'; g.fillRect(px + 3, actif ? py + T - 4 : py + 9, T - 6, actif ? 1.5 : 4);
    if (actif) { g.fillStyle = '#7ad8ff'; g.fillRect(px, py - 3, T * (e.minut - e.temps) / M.K.minuterie, 2); }
  }
  for (const [x, y] of dyn.porteMin) {                      // porte bleue : ouverte tant que la minuterie tourne
    if (!vis(x, y)) continue;
    const px = x * T, py = y * T;
    if (e.temps < e.minut) { g.fillStyle = 'rgba(122,216,255,.15)'; g.fillRect(px + 2, py, T - 4, 2); continue; }
    g.fillStyle = '#16304a'; g.fillRect(px, py, T, T); g.fillStyle = '#3a8cff'; for (let i = 0; i < 3; i++) g.fillRect(px + 2 + i * 5, py, 2.5, T);
  }
  for (const [x, y] of dyn.apes) {                          // zone inversée : voile violet et poussière qui « tombe » vers le haut
    if (!vis(x, y)) continue;
    const px = x * T, py = y * T;
    g.fillStyle = 'rgba(190,120,255,.16)'; g.fillRect(px, py, T, T);
    g.fillStyle = 'rgba(230,200,255,.55)'; const o = (tt * 30 + x * 7) % T; g.fillRect(px + 4 + (x % 3) * 3, py + T - o, 1.5, 3);
  }
  if (niv.broyeurs && e.broy >= 0) {                        // broyeur : un mur de scies qui avance (tout ce qui est à sa gauche est perdu)
    const bx = e.broyX + 6, top = (cam.y - 400), bas = cam.y + 400;
    g.fillStyle = 'rgba(40,10,10,.85)'; g.fillRect(bx - 400, top, 400, bas - top);
    for (let yy = Math.floor(top / 12) * 12; yy < bas; yy += 12) {
      g.save(); g.translate(bx - 6, yy); g.rotate(tt * 12 + yy);
      g.fillStyle = '#c9ced8'; g.beginPath(); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, rr = i % 2 ? 4 : 6; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill();
      g.restore();
    }
    g.fillStyle = '#ff3a3a'; g.fillRect(bx - 1, top, 2, bas - top);
  }
  for (const [x, y] of dyn.levier) {                        // levier : socle + manche (à gauche, puis à droite une fois tiré)
    if (!vis(x, y)) continue;
    const tire = e.boutons.indexOf(x * 1024 + y) >= 0, px = x * T, py = y * T;
    g.fillStyle = '#4a3a2a'; g.fillRect(px + 3, py + T - 4, T - 6, 4);
    g.strokeStyle = '#c8b090'; g.lineWidth = 2; g.beginPath(); g.moveTo(px + 8, py + T - 4); g.lineTo(px + (tire ? 13 : 3), py + 5); g.stroke();
    g.fillStyle = tire ? '#7dff9a' : '#ffb03a'; g.beginPath(); g.arc(px + (tire ? 13 : 3), py + 5, 2.6, 0, 7); g.fill();
  }
  for (const [x, y] of dyn.grilleL) {                       // grille à leviers : barreaux + voyants (un par levier tiré)
    if (!vis(x, y)) continue;
    const px = x * T, py = y * T;
    if (M.grilleOuverte(niv, e, x, y)) { g.fillStyle = 'rgba(125,255,154,.15)'; g.fillRect(px + 2, py, T - 4, 2); continue; }
    g.fillStyle = '#23262e'; g.fillRect(px, py, T, T);
    g.fillStyle = '#b0884a'; for (let i = 0; i < 3; i++) g.fillRect(px + 2 + i * 5, py, 2.5, T);
    const l = niv.leviersDe.get(x * 1024 + y) || [];
    l.forEach((k, i) => { g.fillStyle = e.boutons.indexOf(k) >= 0 ? '#7dff9a' : '#ff5a4a'; g.fillRect(px + 2 + (i % 4) * 3.5, py + 6 + Math.floor(i / 4) * 3, 2.5, 2.5); });
  }
  for (const [x, y, k] of dyn.plaque) {                     // plaque de transformation : couleur de l'état qu'elle donne
    if (!vis(x, y)) continue;
    const p = M.plaqueEtat(niv, k), px = x * T, py = y * T;
    if (p === undefined) continue;
    g.fillStyle = '#2a2833'; g.fillRect(px, py + T - 4, T, 4);
    g.fillStyle = COUL_PHASE[p]; g.fillRect(px + 1, py + T - 6, T - 2, 3);
    const gr = g.createLinearGradient(0, py + T - 6, 0, py); gr.addColorStop(0, COUL_PHASE[p]); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = 0.35 + Math.sin(tt * 5 + x) * 0.15; g.fillStyle = gr; g.fillRect(px + 2, py, T - 4, T - 6); g.globalAlpha = 1;
  }
  for (const [x, y] of dyn.bouton) {
    if (!vis(x, y)) continue;
    const appui = e.boutons.indexOf(x * 1024 + y) >= 0;
    const px = x * T, py = y * T;
    g.fillStyle = '#3a3a40'; g.fillRect(px + 1, py + T - 3, T - 2, 3);
    g.fillStyle = appui ? '#7dff9a' : '#ff5a4a'; g.fillRect(px + 3, appui ? py + T - 4 : py + 9, T - 6, appui ? 1.5 : 4);
  }
  for (const [x, y] of dyn.rebondi) {
    if (!vis(x, y)) continue;
    const o = Math.sin(tt * 5 + x) * 0.8;
    g.fillStyle = 'rgba(220,255,200,.5)'; g.fillRect(x * T + 2, y * T + 2 + o, T - 4, 1);
  }
  for (const [x, y, k] of dyn.tapis) {
    if (!vis(x, y)) continue;
    const d = ((tt * 1.4 * 60 * k) % 8 + 8) % 8;
    g.fillStyle = '#ffc83a';
    for (let i = -8; i < T + 8; i += 8) {
      const xx = x * T + i + d;
      if (xx < x * T || xx > x * T + T - 3) continue;
      g.beginPath(); g.moveTo(xx, y * T + 4); g.lineTo(xx + 3 * k, y * T + 8); g.lineTo(xx, y * T + 12); g.lineTo(xx + 1.5, y * T + 8); g.fill();
    }
  }
  for (const [x, y, k] of dyn.vent) {
    if (!vis(x, y)) continue;
    const s = alea(x * 3 + y * 7);
    const d = ((tt * 110 + s * 64) % 32) - 8;
    g.strokeStyle = 'rgba(225,245,255,.35)'; g.lineWidth = 1;
    g.beginPath();
    const px = x * T, py = y * T;
    if (k === M.VENT_D) { g.moveTo(px + d, py + 4 + s * 8); g.lineTo(px + d + 8, py + 4 + s * 8); }
    else if (k === M.VENT_G) { g.moveTo(px + T - d, py + 4 + s * 8); g.lineTo(px + T - d - 8, py + 4 + s * 8); }
    else if (k === M.VENT_H) { g.moveTo(px + 4 + s * 8, py + T - d); g.lineTo(px + 4 + s * 8, py + T - d - 8); }
    else { g.moveTo(px + 4 + s * 8, py + d); g.lineTo(px + 4 + s * 8, py + d + 8); }
    g.stroke();
    g.fillStyle = 'rgba(200,230,255,.05)'; g.fillRect(px, py, T, T);
  }
  for (const [x, y] of dyn.feu) {
    if (!vis(x, y)) continue;
    const px = x * T, py = y * T;
    if (M.feuEteint(e, x, y)) {                                   // éteint par le torrent : braises qui fument
      g.fillStyle = '#2a0c04'; g.fillRect(px + 1, py + T - 4, T - 2, 4); g.fillStyle = 'rgba(255,90,30,.5)'; g.fillRect(px + 3, py + T - 3, T - 6, 1);
      if (Math.random() < 0.12) part(px + Math.random() * T, py + T - 4, (Math.random() - 0.5) * 0.3, -0.5, 40, 'rgba(200,200,210,.45)', 2.5, -0.005);
      continue;
    }
    g.fillStyle = '#2a0c04'; g.fillRect(px + 1, py + T - 4, T - 2, 4);
    for (let i = 0; i < 5; i++) {
      const h = 9 + 3 * Math.sin(tt * 13 + i * 1.7 + x);              // flammes entre 4 et 16 : la zone qui brûle
      g.fillStyle = ['#ff5a14', '#ff8a1a', '#ffd040', '#ff8a1a', '#ff5a14'][i];
      g.beginPath(); g.moveTo(px + i * 3, py + T - 3); g.quadraticCurveTo(px + 1.5 + i * 3, py + T - 3 - h, px + 4 + i * 3, py + T - 3); g.fill();
    }
    if (Math.random() < 0.1) part(px + Math.random() * T, py + 4, (Math.random() - 0.5) * 0.4, -0.9, 30, '#ffb040', 1.5, -0.01, true);
  }
  for (const [x, y] of dyn.ressort) {
    if (!vis(x, y)) continue;
    const px = x * T, py = y * T;
    g.fillStyle = 'rgba(30,60,30,.6)'; g.fillRect(px + 1, py + 5, T - 2, T - 5);
    g.strokeStyle = '#c9ffb8'; g.lineWidth = 1.5; g.beginPath();
    for (let i = 0; i < 4; i++) { g.moveTo(px + 3, py + 15 - i * 2.2); g.lineTo(px + 13, py + 14 - i * 2.2); }
    g.stroke();
    g.fillStyle = '#4fd46a'; g.fillRect(px + 1, py + 5, T - 2, 3); g.fillStyle = '#e6ffe8'; g.fillRect(px + 1, py + 5, T - 2, 1);
  }
  for (const [x, y] of dyn.cristal) {
    if (!vis(x, y)) continue;
    const i = x * 1024 + y, pris = e.cristaux.some(c => c[0] === i);
    const px = x * T + 8, py = y * T + 8;
    g.globalAlpha = pris ? 0.2 : 1;
    g.fillStyle = '#7dfcff'; g.beginPath(); g.moveTo(px, py - 7); g.lineTo(px + 5, py); g.lineTo(px, py + 7); g.lineTo(px - 5, py); g.fill();
    g.fillStyle = '#e6ffff'; g.beginPath(); g.moveTo(px, py - 5); g.lineTo(px + 2, py); g.lineTo(px, py + 1); g.fill();
    g.globalAlpha = 1;
  }
  for (const [x, y] of dyn.but) {
    if (!vis(x, y)) continue;
    const px = x * T + 8, py = y * T + 6;
    for (let i = 0; i < 4; i++) {
      g.strokeStyle = i % 2 ? '#fff' : th.accent; g.lineWidth = 1.6; g.globalAlpha = 0.95 - i * 0.18;
      g.beginPath(); g.ellipse(px, py, 6 + i * 2.6 + Math.sin(tt * 4 + i), 10 + i * 2.6, 0, tt * (i % 2 ? 1 : -1), tt * (i % 2 ? 1 : -1) + 5.4); g.stroke();
    }
    g.globalAlpha = 1; g.fillStyle = '#fff'; g.beginPath(); g.arc(px, py, 2.5 + Math.sin(tt * 6), 0, 7); g.fill();
  }
  for (const [x, y] of dyn.drapeau) {
    if (!vis(x, y)) continue;
    const actif = e.cp && e.cp.tx === x && e.cp.ty === y;
    const px = x * T, py = y * T;
    g.fillStyle = '#ddd'; g.fillRect(px + 4, py + 1, 1.5, 15);
    g.fillStyle = actif ? '#7dff9a' : 'rgba(255,255,255,.35)';
    g.beginPath(); g.moveTo(px + 5.5, py + 1); g.quadraticCurveTo(px + 9, py + 2 + Math.sin(tt * 6 + x), px + 13, py + 3.5); g.lineTo(px + 5.5, py + 7); g.fill();
  }
  for (const [x, y, k] of dyn.tp) {
    if (!vis(x, y)) continue;
    const entree = k === M.TP1 || k === M.TP2;
    const c = (k === M.TP1 || k === M.TP1S) ? '#c08bff' : '#5ef2a0';
    const px = x * T + 8, py = y * T + 8;
    g.strokeStyle = c; g.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) {
      g.globalAlpha = entree ? 0.95 - i * 0.25 : 0.45 - i * 0.1;
      g.beginPath(); g.arc(px, py, 3 + i * 2.6, tt * (entree ? 4 : -2) + i, tt * (entree ? 4 : -2) + i + 4.2); g.stroke();
    }
    g.globalAlpha = 1;
  }
  for (const [x, y] of dyn.orbe) {
    if (!vis(x, y)) continue;
    const k = x * 1024 + y, use = e.orbes && e.orbes.some(o => o[0] === k && e.temps - o[1] < M.K.orbeRecharge);
    const px = x * T + 8, py = y * T + 8, R0 = M.K.orbeRayon;   // cercle extérieur = zone où l'orbe se déclenche
    g.globalAlpha = use ? 0.3 : 1;
    g.fillStyle = 'rgba(255,220,60,.16)'; g.beginPath(); g.arc(px, py, R0, 0, 7); g.fill();
    g.strokeStyle = '#ffcf2a'; g.lineWidth = 1.5; g.beginPath(); g.arc(px, py, R0 - 0.75, 0, 7); g.stroke();
    g.strokeStyle = '#fff3a0'; g.lineWidth = 2; g.beginPath(); g.arc(px, py, 5.5 + Math.sin(tt * 6 + x) * 0.6, 0, 7); g.stroke();
    g.fillStyle = '#ffe85a'; g.beginPath(); g.arc(px, py, 2.4, 0, 7); g.fill();
    g.globalAlpha = 1;
  }
  for (const [x, y] of dyn.inter) {
    if (!vis(x, y)) continue;
    const px = x * T, py = y * T, c = e.bascule ? '#4a8cff' : '#ff4a5a';
    g.fillStyle = 'rgba(40,40,52,.75)'; g.fillRect(px + 3, py + 4, 10, 12);      // le boîtier = la zone qui bascule
    g.fillStyle = c; g.fillRect(px + 4, py + 5, 8, 2);
    g.save(); g.translate(px + 8, py + T - 2); g.rotate(e.bascule ? 0.45 : -0.45);
    g.fillStyle = '#ddd'; g.fillRect(-1, -8, 2, 8); g.fillStyle = c; g.beginPath(); g.arc(0, -8, 2.2, 0, 7); g.fill();
    g.restore();
  }
  for (const [x, y, c] of dyn.bloc) {
    if (!vis(x, y)) continue;
    const actif = e.bascule === c, px = x * T, py = y * T, coul = c === 0 ? '255,74,90' : '74,140,255';
    if (actif) {
      g.fillStyle = `rgba(${coul},.85)`; g.fillRect(px, py, T, T);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(px + 1, py + 1, T - 2, 2);
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.strokeRect(px + 0.5, py + 0.5, T - 1, T - 1);
      g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(px + 6, py + 6, 4, 4);
    } else {
      g.strokeStyle = `rgba(${coul},.45)`; g.setLineDash([2, 2]); g.strokeRect(px + 1.5, py + 1.5, T - 3, T - 3); g.setLineDash([]);
    }
  }
  for (const [x, y, d] of dyn.tremp) {
    if (!vis(x, y)) continue;
    const px = x * T, py = y * T;                       // rectangle 2..14 × 6..16 = la zone qui projette
    g.fillStyle = '#2f8a44'; g.fillRect(px + 2, py + 6, 12, 10);
    g.fillStyle = '#4fd46a'; g.fillRect(px + 2, py + 6, 12, 2);
    g.fillStyle = '#e6ffe8';
    g.beginPath(); g.moveTo(px + 8 + d * 5, py + 11); g.lineTo(px + 8 - d * 2, py + 8); g.lineTo(px + 8 - d * 2, py + 14); g.fill();
  }
  for (const [x, y, ph] of dyn.ban) {
    if (!vis(x, y)) continue;
    const px = x * T + 8, py = y * T + 8, c = COUL_PHASE[niv.emplacements[ph]];
    g.fillStyle = c; g.globalAlpha = 0.85;
    g.beginPath(); g.moveTo(px, py - 6); g.lineTo(px + 4, py); g.lineTo(px, py + 6); g.lineTo(px - 4, py); g.fill();
    g.globalAlpha = 1; g.strokeStyle = '#ff2a3a'; g.lineWidth = 2;
    g.beginPath(); g.arc(px, py, 6.5, 0, 7); g.moveTo(px - 4.5, py - 4.5); g.lineTo(px + 4.5, py + 4.5); g.stroke();
  }
  for (const [x, y, d] of dyn.bonus) {
    if (!vis(x, y)) continue;
    const px = x * T + 8, py = y * T + 8;
    g.fillStyle = d > 0 ? '#5aff7a' : '#ffaa50';
    g.beginPath(); g.arc(px, py, 5.5, 0, 7); g.fill();
    g.fillStyle = '#10301a';
    g.beginPath(); g.moveTo(px, py - 4 * d); g.lineTo(px + 3.5, py + 1.5 * d); g.lineTo(px - 3.5, py + 1.5 * d); g.fill();
  }
  for (const [x, y] of dyn.piece) {
    if (!vis(x, y) || e.pieces.indexOf(x * 1024 + y) >= 0) continue;
    const px = x * T + 8, py = y * T + 8, l = Math.cos(tt * 3 + x * 0.7);
    g.fillStyle = '#b8860b'; g.beginPath(); g.arc(px, py, 5, 0, 7); g.fill();
    g.fillStyle = '#ffd84a'; g.beginPath(); g.arc(px, py, 4, 0, 7); g.fill();
    g.fillStyle = '#fff6c0'; g.fillRect(px - 0.6 + l * 1.5, py - 2.5, 1.2, 5);
  }
  for (const [x, y] of dyn.eclat) {
    if (!vis(x, y) || e.eclat) continue;
    const px = x * T + 8, py = y * T + 8, f = M.FORME_ECLAT;   // gemme : même hexagone que sa hitbox
    g.fillStyle = '#c0309a'; g.beginPath();
    for (let i = 0; i < f.length; i += 2) g.lineTo(px + f[i], py + f[i + 1]);
    g.closePath(); g.fill();
    g.fillStyle = '#ff8ae6'; g.beginPath(); g.moveTo(px, py - 7); g.lineTo(px + 6, py - 3.5); g.lineTo(px, py); g.lineTo(px - 6, py - 3.5); g.closePath(); g.fill();
    g.fillStyle = `rgba(255,255,255,${0.5 + 0.4 * Math.sin(tt * 4)})`; g.fillRect(px - 1, py - 5, 2, 2);
  }
}
// compétences : fil du grappin, jets d'eau, perle, aura de suspension, blocs de glace
function competences(g, e) {
  if (e.glaces && e.glaces.length) for (const [k, fin] of e.glaces) {
    if (fin <= e.temps) continue;
    const tx = Math.floor(k / 1024), ty = k % 1024, px = tx * T, py = ty * T, a = Math.min(1, (fin - e.temps) / 40);
    g.globalAlpha = a; g.fillStyle = 'rgba(190,240,255,.85)'; g.fillRect(px, py, T, T);
    g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(px + 2, py + 2, T - 6, 2); g.strokeStyle = '#5ab8e0'; g.strokeRect(px + 0.5, py + 0.5, T - 1, T - 1); g.globalAlpha = 1;
  }
  if (e.grap) {
    g.strokeStyle = '#d9c6a5'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(e.x + PW / 2, e.y + PH / 2); g.lineTo(e.grap[0], e.grap[1]); g.stroke();
    g.fillStyle = '#ffe94a'; g.beginPath(); g.arc(e.grap[0], e.grap[1], 2.5, 0, 7); g.fill();
  }
  if (e.tirs && e.tirs.length) for (const t of e.tirs) { if (t[5] > 0) continue; g.fillStyle = '#9fe0ff'; g.beginPath(); g.arc(t[0], t[1], 2.4, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillRect(t[0] - 0.6, t[1] - 1.4, 1.2, 1.2); }
  if (e.perle) { const [px, py] = e.perle; g.fillStyle = '#2a1050'; g.beginPath(); g.arc(px, py, 3.5, 0, 7); g.fill(); g.strokeStyle = '#c8a8ff'; g.lineWidth = 1; g.stroke(); }
  if (e.hover > 0) {                                                // envol : deux ailes de lumière qui se referment
    const k = e.hover / M.K.hover, cx = e.x + PW / 2, cy = e.y + PH / 2 + 2;
    g.fillStyle = `rgba(241,236,255,${0.55 * k})`;
    for (const sg of [-1, 1]) { g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo(cx + sg * 16, cy - 14 * k, cx + sg * 20, cy + 4 - 10 * k); g.quadraticCurveTo(cx + sg * 10, cy + 2, cx, cy + 4); g.fill(); }
  }
}
// champignons, barrières d'état, plateformes mobiles, scies, lasers
// temps du dessin : entre deux images du moteur (les objets lents glissent sans saccade)
const tD = e => e.tR !== undefined ? e.tR : e.temps;
function mobiles(g, e, ox, vw, vis) {
  const tt = temps;
  for (const [x, y] of dyn.champi) {
    if (!vis(x, y)) continue;
    const cx2 = x * T + 8, cy2 = y * T + 8, r = M.K.champiRayon;      // le chapeau rond = la zone qui renvoie
    g.fillStyle = '#e83a5a'; g.beginPath(); g.arc(cx2, cy2, r, 0, 7); g.fill();
    g.fillStyle = '#fff2f4'; for (const [a, b, rr] of [[-2.5, -2.5, 1.6], [2.5, -1, 1.4], [-0.5, 2.5, 1.2]]) { g.beginPath(); g.arc(cx2 + a, cy2 + b, rr, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1; g.beginPath(); g.arc(cx2, cy2, r - 0.5, Math.PI * 1.1, Math.PI * 1.6); g.stroke();
  }
  for (const [x, y, bas] of dyn.boucle) {                        // bord bouclé : un rideau bleu qui ondule
    if (!vis(x, y)) continue;
    const px = x * T, py = y * T;
    const gr = g.createLinearGradient(0, bas ? py + T : py, 0, bas ? py : py + T);
    gr.addColorStop(0, 'rgba(90,200,255,.75)'); gr.addColorStop(1, 'rgba(90,200,255,0)');
    g.fillStyle = gr; g.fillRect(px, py, T, T);
    g.fillStyle = 'rgba(220,250,255,.8)'; g.fillRect(px, bas ? py + T - 2 - Math.sin(tt * 5 + x) : py + 1 + Math.sin(tt * 5 + x), T, 1.2);
  }
  for (const [x, y, droite] of dyn.boucleH) {                   // bord bouclé gauche/droite
    if (!vis(x, y)) continue;
    const px = x * T, py = y * T;
    const gr = g.createLinearGradient(droite ? px + T : px, 0, droite ? px : px + T, 0);
    gr.addColorStop(0, 'rgba(90,200,255,.75)'); gr.addColorStop(1, 'rgba(90,200,255,0)');
    g.fillStyle = gr; g.fillRect(px, py, T, T);
    g.fillStyle = 'rgba(220,250,255,.8)'; g.fillRect(droite ? px + T - 2 - Math.sin(tt * 5 + y) : px + 1 + Math.sin(tt * 5 + y), py, 1.2, T);
  }
  for (const [x, y, ph] of dyn.barriere) {
    if (!vis(x, y)) continue;
    const px = x * T, py = y * T, c = COUL_PHASE[ph], ouvert = e.phase === ph;
    g.globalAlpha = ouvert ? 0.35 : 0.8;
    g.fillStyle = c; g.fillRect(px, py, T, T);
    g.globalAlpha = ouvert ? 0.25 : 0.55;
    g.fillStyle = '#fff';
    const d = (tt * 20 + x * 3) % 8;
    for (let k = -8; k < T; k += 8) g.fillRect(px, py + ((k + d + 16) % 16), T, 1.5);
    g.globalAlpha = 1;
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.strokeRect(px + 0.5, py + 0.5, T - 1, T - 1);
    if (ACCES.daltonien && (y % 2 === 0)) { g.font = '10px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(SYMBOLES[ph], px + T / 2, py + T / 2 + 0.5); g.textBaseline = 'top'; }
  }
  if (niv.plates) for (const p of niv.plates) {
    if (p.x * T < ox - 600 || p.x * T > ox + vw + 600) continue;
    const [px, py] = M.plateEn(p, tD(e)), lg = M.K.platLarg * T, ep = M.K.platEp;
    g.fillStyle = '#3a3e4a'; g.fillRect(px, py, lg, ep);
    g.fillStyle = '#c8cedc'; g.fillRect(px, py, lg, 2);
    g.fillStyle = '#ffd84a'; for (let k = 4; k < lg - 2; k += 8) g.fillRect(px + k, py + 2.5, 4, 1.5);
  }
  if (niv.scies) for (const sc of niv.scies) {
    if (sc.x * T < ox - 600 || sc.x * T > ox + vw + 600) continue;
    const [cx2, cy2] = M.scieEn(sc, tD(e)), r = M.K.scieRayon;     // dents comprises dans le cercle de la hitbox
    g.save(); g.translate(cx2, cy2); g.rotate(tt * 14);
    g.fillStyle = '#c9ced8'; g.beginPath();
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; const rr = i % 2 ? r - 2 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    g.closePath(); g.fill();
    g.fillStyle = '#6a707c'; g.beginPath(); g.arc(0, 0, r - 3.5, 0, 7); g.fill();
    g.fillStyle = '#2a2c34'; g.beginPath(); g.arc(0, 0, 1.6, 0, 7); g.fill();
    g.restore();
  }
  if (niv.pilons) for (const p of niv.pilons) {            // pilon : chaîne + bloc d'acier = sa hitbox ; il tremble avant de tomber
    if (p.x * T < ox - 600 || p.x * T > ox + vw + 600) continue;
    const [a, b, c2, d2] = M.pilonRect(p, tD(e)), cyc = ((e.temps + p.dec) % p.per + p.per) % p.per;
    const tr = cyc > 38 && cyc < 60 ? Math.sin(tt * 70) * 0.8 : 0;
    const y0 = (p.ancre !== undefined ? p.ancre : p.y) * T;                        // chaîne accrochée au plafond
    g.fillStyle = '#3a3e48'; g.fillRect(p.x * T + 4, y0, 8, 2);
    g.fillStyle = '#5a5e68'; for (let yy = y0 + 2; yy < b; yy += 4) g.fillRect(p.x * T + 6.5, yy, 3, 2.5);
    const gr = g.createLinearGradient(a, 0, c2, 0); gr.addColorStop(0, '#9aa2b0'); gr.addColorStop(0.5, '#dfe5ee'); gr.addColorStop(1, '#6a7280');
    g.fillStyle = gr; g.fillRect(a + tr, b, c2 - a, d2 - b);
    // dessous hérissé de pointes rouges (dans le bloc : la hitbox ne change pas) : on ne le touche pas par en dessous
    // pointes seulement au milieu du dessous (= la zone qui tue), les bords restent lisses
    const pb = M.PILON_BORD, lp = (c2 - a - 2 * pb) / 3;
    g.fillStyle = '#7a1018'; g.fillRect(a + tr + pb, d2 - 6, c2 - a - 2 * pb, 1.5);
    g.fillStyle = '#ff4a5a'; for (let k = 0; k < 3; k++) { const px = a + tr + pb + k * lp; g.beginPath(); g.moveTo(px, d2 - 5); g.lineTo(px + lp, d2 - 5); g.lineTo(px + lp / 2, d2); g.fill(); }
    g.fillStyle = '#ffd0d4'; for (let k = 0; k < 3; k++) g.fillRect(a + tr + pb + k * lp + lp / 2 - 0.4, d2 - 4.5, 0.8, 2);
    g.fillStyle = '#2a2c34'; for (const [u, w2] of [[3, 3], [T - 5, 3]]) g.fillRect(a + tr + u, b + w2, 2, 2);
    if (cyc >= 72 && cyc < 76 && p.lg > 0) for (let k = 0; k < 3; k++) part(a + Math.random() * T, d2, (Math.random() - 0.5) * 2.5, -Math.random() * 1.2, 20, 'rgba(210,200,180,.6)', 1.8, 0.05);
  }
  if (niv.orbites) for (const o of niv.orbites) {          // pivot + deux scies (cercle = hitbox)
    if (o.x * T < ox - 600 || o.x * T > ox + vw + 600) continue;
    const cx0 = o.x * T + T / 2, cy0 = o.y * T + T / 2, r = M.K.scieRayon;
    const ps = M.orbiteEn(o, tD(e));
    g.strokeStyle = '#4a4e5a'; g.lineWidth = 2; g.beginPath(); g.moveTo(ps[0][0], ps[0][1]); g.lineTo(ps[1][0], ps[1][1]); g.stroke();
    g.fillStyle = '#2a2c34'; g.beginPath(); g.arc(cx0, cy0, 4, 0, 7); g.fill(); g.fillStyle = '#8a90a0'; g.beginPath(); g.arc(cx0, cy0, 2, 0, 7); g.fill();
    for (const [sx, sy] of ps) {
      g.save(); g.translate(sx, sy); g.rotate(tt * 16 * o.sens);
      g.fillStyle = '#d6dbe4'; g.beginPath();
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; const rr = i % 2 ? r - 2 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      g.closePath(); g.fill();
      g.fillStyle = '#8a3a3a'; g.beginPath(); g.arc(0, 0, r - 3.5, 0, 7); g.fill();
      g.fillStyle = '#2a2c34'; g.beginPath(); g.arc(0, 0, 1.6, 0, 7); g.fill();
      g.restore();
    }
  }
  if (niv.geysers) for (const gy of niv.geysers) {         // geyser : bulles au préavis, colonne d'eau bouillante quand il souffle (= sa zone)
    if (gy.x * T < ox - 600 || gy.x * T > ox + vw + 600) continue;
    const et = M.geyserEtat(gy, e.temps), [a, b, c2, d2] = M.geyserRect(gy);
    if (et === 1 && Math.random() < 0.4) part(a + Math.random() * (c2 - a), d2 - 4, (Math.random() - 0.5) * 0.4, -0.8 - Math.random(), 22, 'rgba(220,240,255,.7)', 1.6, 0);
    if (et !== 2) continue;
    const gr = g.createLinearGradient(0, b, 0, d2); gr.addColorStop(0, 'rgba(200,240,255,.15)'); gr.addColorStop(1, 'rgba(160,225,255,.7)');
    g.fillStyle = gr; g.fillRect(a, b, c2 - a, d2 - b);
    g.fillStyle = 'rgba(255,255,255,.7)'; for (let k = 0; k < 4; k++) { const yy = d2 - ((tt * 160 + k * 23) % (d2 - b)); g.fillRect(a + 2 + (k % 2) * 6, yy, 2, 6); }
    if (Math.random() < 0.5) part(a + Math.random() * (c2 - a), b + 2, (Math.random() - 0.5) * 2, -0.5, 26, 'rgba(230,248,255,.75)', 2, 0.08);
  }
  if (niv.bruleurs) for (const bu of niv.bruleurs) {       // brûleur : flamme = sa hitbox ; fumée quand le torrent l'a éteint
    if (bu.x * T < ox - 600 || bu.x * T > ox + vw + 600) continue;
    if (M.feuEteint(e, bu.x, bu.y)) { if (Math.random() < 0.1) part(bu.x * T + 8 + bu.dx * 9, bu.y * T + 8 + bu.dy * 9, 0, -0.5, 40, 'rgba(200,200,210,.45)', 2.5, -0.005); continue; }
    const et = M.bruleurEtat(bu, e.temps), [a, b, c2, d2] = M.bruleurRect(bu);
    if (et === 1) { if (Math.random() < 0.3) part(bu.x * T + 8 + bu.dx * 9, bu.y * T + 8 + bu.dy * 9, bu.dx * 0.6, bu.dy * 0.6 - 0.1, 14, 'rgba(255,170,60,.8)', 1.5, 0); continue; }
    if (et !== 2) continue;
    const gr = bu.dx ? g.createLinearGradient(bu.dx > 0 ? a : c2, 0, bu.dx > 0 ? c2 : a, 0) : g.createLinearGradient(0, bu.dy > 0 ? b : d2, 0, bu.dy > 0 ? d2 : b);
    gr.addColorStop(0, '#fff6c0'); gr.addColorStop(0.35, '#ffb02a'); gr.addColorStop(0.8, '#ff4a1a'); gr.addColorStop(1, '#c02000');
    g.fillStyle = gr; g.fillRect(a, b, c2 - a, d2 - b);
    g.fillStyle = 'rgba(255,255,220,.8)'; const fl = Math.sin(tt * 40) * 1;
    if (bu.dx) g.fillRect(a, (b + d2) / 2 - 1.5 + fl, c2 - a, 3); else g.fillRect((a + c2) / 2 - 1.5 + fl, b, 3, d2 - b);
    if (Math.random() < 0.5) part(bu.dx ? (bu.dx > 0 ? c2 : a) : a + Math.random() * (c2 - a), bu.dy ? (bu.dy > 0 ? d2 : b) : b + Math.random() * (d2 - b), bu.dx * 0.5, bu.dy * 0.5 - 0.3, 16, 'rgba(255,140,40,.7)', 1.6, -0.02);
  }
  if (niv.lasers) for (const l of niv.lasers) {
    if (l.x * T < ox - 600 || l.x * T > ox + vw + 600) continue;
    const etat = M.laserEtat(l, e.temps);
    if (!etat) continue;
    if (l.seg || l.balai) {                           // en biais : le même polygone que la hitbox
      const sg = M.laserSeg(niv, l, tD(e)), po = M.laserPoly(sg);
      if (etat === 1) { if (Math.floor(tt * 16) % 2) { g.strokeStyle = 'rgba(255,80,110,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(sg[0], sg[1]); g.lineTo(sg[2], sg[3]); g.stroke(); } continue; }
      g.fillStyle = '#ff2a55'; g.beginPath(); for (let k = 0; k < 8; k += 2) g.lineTo(po[k], po[k + 1]); g.closePath(); g.fill();
      g.strokeStyle = '#ffd6e0'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(sg[0], sg[1]); g.lineTo(sg[2], sg[3]); g.stroke();
      continue;
    }
    const [a, b, c2, d2] = M.laserRect(l);
    if (etat === 1) {                                 // préavis : fin trait clignotant, inoffensif
      if (Math.floor(tt * 16) % 2) { g.fillStyle = 'rgba(255,80,110,.5)'; g.fillRect((a + c2) / 2 - 0.5, (b + d2) / 2 - 0.5, l.dx ? c2 - a : 1, l.dy ? d2 - b : 1); }
      if (l.dx) { g.fillStyle = 'rgba(255,80,110,.5)'; g.fillRect(a, (b + d2) / 2 - 0.5, c2 - a, 1); }
      else { g.fillStyle = 'rgba(255,80,110,.5)'; g.fillRect((a + c2) / 2 - 0.5, b, 1, d2 - b); }
      continue;
    }
    g.fillStyle = '#ff2a55'; g.fillRect(a, b, c2 - a, d2 - b);                   // le rayon = sa hitbox
    g.fillStyle = '#ffd6e0'; if (l.dx) g.fillRect(a, (b + d2) / 2 - 0.75, c2 - a, 1.5); else g.fillRect((a + c2) / 2 - 0.75, b, 1.5, d2 - b);
  }
}
// ennemis : créatures hérissées qui patrouillent
function ennemis(g, e, ox, vw) {
  if (!niv.ennemis || !niv.ennemis.length) return;
  for (const en of niv.ennemis) {
    if (en.x * T < ox - 500 || en.x * T > ox + vw + 500) continue;
    const [ex, ey] = M.ennemiEn(en, tD(e)), cx2 = ex + 6, cy2 = ey + 6;
    const RE = M.K.ennemiRayon;                     // piquants compris dans le cercle de la hitbox
    g.save(); g.translate(cx2, cy2);
    g.rotate(en.hor ? (ex / 6) : 0);
    g.fillStyle = '#e8e0e4';
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.beginPath(); g.moveTo(Math.cos(a) * RE, Math.sin(a) * RE); g.lineTo(Math.cos(a + 0.4) * 3.6, Math.sin(a + 0.4) * 3.6); g.lineTo(Math.cos(a - 0.4) * 3.6, Math.sin(a - 0.4) * 3.6); g.fill(); }
    g.restore();
    const gr = g.createRadialGradient(cx2 - 1.5, cy2 - 1.5, 1, cx2, cy2, 4.6);
    const coul = en.sorte === 1 ? ['#9aff6a', '#2f8a20'] : en.sorte === 2 ? ['#c9a0ff', '#5a2aa0'] : ['#ff6a80', '#a0203a'];
    gr.addColorStop(0, coul[0]); gr.addColorStop(1, coul[1]);
    if (en.sorte === 2) {                                         // ailes (dans le cercle de la hitbox)
      const b = Math.sin(temps * 22) * 1.6;
      g.fillStyle = 'rgba(230,210,255,.75)'; g.beginPath(); g.ellipse(cx2 - 4, cy2 - 3 + b, 2.4, 1.4, -0.5, 0, 7); g.ellipse(cx2 + 4, cy2 - 3 + b, 2.4, 1.4, 0.5, 0, 7); g.fill();
    }
    g.fillStyle = gr; g.beginPath(); g.arc(cx2, cy2, 4.6, 0, 7); g.fill();
    g.fillStyle = '#ffde4a'; g.fillRect(cx2 - 3, cy2 - 1.5, 2, 2); g.fillRect(cx2 + 1, cy2 - 1.5, 2, 2);
  }
}
// flèches des arbalètes, calculées comme dans le moteur
function fleches(g, e, ox, vw) {
  if (!niv.fleches || !niv.fleches.length) return;
  g.save();
  for (const f of niv.fleches) {
    if (f.x * T < ox - 400 || f.x * T > ox + vw + 400) continue;
    for (const [ax, ay] of M.flechesEn(niv, tD(e), f)) {
      const parcouru = Math.abs(ax - (f.x * T + T / 2)) + Math.abs(ay - (f.y * T + T / 2));
      if (f.portee - parcouru < (f.vit || 4) * 1.5) {                // arrivée sur le mur : la flèche se brise
        g.save(); g.translate(ax, ay); g.rotate(Math.atan2(f.dy, f.dx));
        g.fillStyle = '#e8d2a6'; g.save(); g.rotate(0.6); g.fillRect(-6, -1, 6, 2); g.restore(); g.save(); g.rotate(-0.8); g.fillRect(-1, -1, 6, 2); g.restore();
        g.fillStyle = '#d0d4dc'; g.fillRect(4, -1, 3, 2); g.restore(); continue;
      }
      g.save(); g.translate(ax, ay); g.rotate(Math.atan2(f.dy, f.dx));
      g.fillStyle = '#e8d2a6'; g.fillRect(-8, -1, 13, 2);
      g.fillStyle = '#d0d4dc'; g.beginPath(); g.moveTo(8, 0); g.lineTo(4, -2.5); g.lineTo(4, 2.5); g.fill();
      g.fillStyle = '#ff5a5a'; g.fillRect(-8, -2.5, 3.5, 1.5); g.fillRect(-8, 1, 3.5, 1.5);
      g.restore();
    }
  }
  g.restore();
}

function eauDessus(g, vis) {
  if (!dyn.eau.length) return;
  for (const [x, y, surf] of dyn.eau) {
    if (!vis(x, y)) continue;
    const px = x * T, py = y * T;
    let fond = 0; for (let k = 1; k < 6 && tuileR(x, y - k) === M.EAU; k++) fond++;      // plus c'est profond, plus c'est sombre
    g.fillStyle = `rgba(${30 - fond * 4},${150 - fond * 18},${210 - fond * 16},${0.4 + fond * 0.08})`; g.fillRect(px, py, T, T);
    // reflets mouvants (caustiques)
    const c1 = Math.sin(x * 1.3 + temps * 2.1) + Math.sin(y * 1.7 - temps * 1.6);
    if (c1 > 1.2) { g.fillStyle = `rgba(190,245,255,${(c1 - 1.2) * 0.18})`; g.fillRect(px + (Math.sin(temps + y) * 4 + 4), py + 4, 8, 1.5); }
    if (surf) {
      const o = Math.sin(temps * 3 + x * 0.8) * 1.5;
      g.fillStyle = 'rgba(200,245,255,.75)'; g.fillRect(px, py + 2 + o, T, 1.5);
      g.fillStyle = 'rgba(255,255,255,.55)'; for (let k = 0; k < 3; k++) { const fx = px + ((temps * 9 + k * 6 + x * 5) % T); g.fillRect(fx, py + 1.6 + o + Math.sin(temps * 4 + k) * 0.5, 2, 0.8); }   // écume
      g.fillStyle = 'rgba(40,160,220,.25)'; g.fillRect(px, py, T, 2 + o);
    }
    const cour = niv.courants && niv.courants.get(y * niv.w + x);
    if (cour) {
      g.fillStyle = 'rgba(210,250,255,.55)';
      for (let k = 0; k < 2; k++) { const fx = ((temps * 34 * cour + k * 8 + y * 5) % T + T) % T; g.fillRect(px + fx - (cour > 0 ? 5 : 0), py + 4 + k * 7 + Math.sin(temps * 3 + x + k) * 1.2, 5, 1.2); }
    }
    if (!surf && alea(x * 5 + y * 11 + Math.floor(temps * 2)) < 0.03) part(px + 8, py + 8, 0, -0.4, 40, 'rgba(200,250,255,.6)', 1.5, -0.005);
  }
}

/* ---------- Le joueur : un carré de 12 × 12 (exactement sa hitbox), d'une matière différente selon l'état ---------- */
const MATIERE = {
  0: ['#f6e6c4', '#b89a6a', '#2b2116', '#2a2018'], 1: ['#b9e8ff', '#2a8ad8', '#0b2f4d', '#06243a'],
  2: ['#fffaf2', '#f0c8a0', '#9a6a40', '#6a3a20'], 3: ['#fffde0', '#ffd23a', '#a07a00', '#5a3a00'],
  4: ['#ffffff', '#cbc0ff', '#5a4aa0', '#4a3a8a'], 5: ['#ffb3d6', '#d6247a', '#5a0a30', '#4a0a2a'],
  6: ['#e6edf6', '#6a7584', '#20262e', '#10161e'], 7: ['#6a4aa8', '#1a0838', '#0a0418', '#e0d0ff'],
  8: ['#ffffff', '#8fd8ff', '#2a6a8a', '#0a3a5a'], 9: ['#ffd070', '#e0401a', '#3a0a04', '#2a0800']
};
function joueur(g, e, alpha, fantome) {
  const x = e.x, y = e.y;
  g.globalAlpha = alpha;
  if (fantome) {
    const fo2 = M.FORMES[e.phase] || M.FORMES[0];
    g.beginPath(); for (let i = 0; i < fo2.length; i += 2) g.lineTo(x + fo2[i], y + fo2[i + 1]); g.closePath();
    g.fillStyle = COUL_PHASE[e.phase]; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1; g.stroke();
    g.globalAlpha = 1; return;
  }
  if (e.invT > 0) g.globalAlpha = alpha * (Math.floor(e.invT / 4) % 2 ? 0.35 : 0.9);   // invincible : il clignote
  if (e.sol) { g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x + 1, y + PH, PW - 2, 1); }
  const ph = e.phase, m = MATIERE[ph];
  const haut = m[0], bas = m[1];
  if (!fantome) dessinerRuban(g, APPARENCE.trainee);
  aura(g, x + PW / 2, y + PH / 2, APPARENCE.aura);
  trainee(e, APPARENCE.trainee);
  // la forme de l'état (goutte, balle, losange…) : exactement la hitbox du moteur
  const fo = M.FORMES[ph] || M.FORMES[0];
  const chemin = (k) => {
    const cx2 = x + PW / 2, cy2 = y + PH / 2;
    g.beginPath();
    for (let i = 0; i < fo.length; i += 2) { const px = x + fo[i], py = y + fo[i + 1]; g.lineTo(cx2 + (px - cx2) * k, cy2 + (py - cy2) * k); }
    g.closePath();
  };
  chemin(1); g.fillStyle = couleurContour(APPARENCE.contour, m[2], g, x, y);     // contour (couleur de l'apparence)
  const lueurC = { neon: '#ff4aff', feu: '#ff7a20', galaxie: '#9a6aff', arcenciel: `hsl(${(temps * 140) % 360},95%,60%)` }[APPARENCE.contour];
  if (lueurC) { g.shadowColor = lueurC; g.shadowBlur = 7; }
  g.fill(); g.shadowBlur = 0;
  const gr = g.createLinearGradient(0, y, 0, y + PH); gr.addColorStop(0, haut); gr.addColorStop(1, bas);
  chemin(0.84); g.fillStyle = gr; g.fill();
  g.save(); chemin(0.84); g.clip();
  const t = temps;
  if (ph === M.S) {
    g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(x + 2, y + 2, PW - 5, 1);
  } else if (ph === M.L) {
    g.fillStyle = 'rgba(255,255,255,.55)';
    for (let k = 0; k < 2; k++) { const yy = y + 3 + k * 4 + Math.sin(t * 6 + k) * 0.8; g.fillRect(x + 2 + k, yy, 5, 1); }
    g.beginPath(); g.arc(x + 8 + Math.sin(t * 3), y + 8 - ((t * 8) % 6), 1, 0, 7); g.fill();
  } else if (ph === M.Z) {                                          // gaz : la vapeur restante remplit le carré
    const r = e.gaz / M.K.zDuree;
    g.fillStyle = 'rgba(255,170,90,.55)'; g.fillRect(x + 1, y + 1 + (PH - 2) * (1 - r), PW - 2, (PH - 2) * r);
    g.fillStyle = 'rgba(255,255,255,.7)';
    for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x + 3 + k * 3, y + 4 + Math.sin(t * 5 + k * 2) * 1.5, 1.6, 0, 7); g.fill(); }
  } else if (ph === M.P) {
    g.strokeStyle = '#ffffff'; g.lineWidth = 1.2; g.beginPath();
    let px = x + 1, py = y + 2 + Math.random() * 8; g.moveTo(px, py);
    for (let k = 0; k < 4; k++) { px += 2.6; py = y + 2 + Math.random() * 8; g.lineTo(px, py); }
    g.stroke();
  } else if (ph === M.PL) {
    g.strokeStyle = 'rgba(120,100,200,.6)'; g.lineWidth = 1;
    for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x + 2, y + 9 - k * 2.5); g.lineTo(x + 6, y + 6 - k * 2.5); g.lineTo(x + 10, y + 9 - k * 2.5); g.stroke(); }
  } else if (ph === M.CA) {
    g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(x + 2, y + 2, 4, 2); g.fillRect(x + 2, y + 4, 2, 2);
  } else if (ph === M.ME) {
    g.fillStyle = '#3a424c'; for (const [a, b] of [[2, 2], [PW - 3, 2], [2, PH - 3], [PW - 3, PH - 3]]) g.fillRect(x + a - 0.5, y + b - 0.5, 1.5, 1.5);
    g.fillStyle = 'rgba(255,255,255,.65)'; g.fillRect(x + 2, y + 1.5, 5, 1);
  } else if (ph === M.GL) {                                         // glace : facettes et reflet
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 6, y + 1); g.lineTo(x + 6, y + 11); g.moveTo(x + 1.5, y + 3.5); g.lineTo(x + 10.5, y + 8.5); g.moveTo(x + 10.5, y + 3.5); g.lineTo(x + 1.5, y + 8.5); g.stroke();
  } else if (ph === M.MA) {                                         // magma : fissures qui rougeoient
    g.strokeStyle = `rgba(255,${200 + 55 * Math.sin(t * 6) | 0},80,.95)`; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x + 1, y + 7); g.lineTo(x + 5, y + 5); g.lineTo(x + 7, y + 9); g.lineTo(x + 11, y + 6); g.stroke();
  } else if (ph === M.OM) {                                         // ombre : le temps restant remplit le carré
    const r = e.gaz / M.K.omDuree;
    g.fillStyle = `rgba(180,140,255,${0.25 + 0.15 * Math.sin(t * 10)})`; g.fillRect(x + 1, y + 1 + (PH - 2) * (1 - r), PW - 2, (PH - 2) * r);
  }
  {
    const vol = g.createRadialGradient(x + PW * 0.32, y + PH * 0.28, 0.5, x + PW / 2, y + PH / 2, PW * 0.75);
    vol.addColorStop(0, 'rgba(255,255,255,.32)'); vol.addColorStop(0.45, 'rgba(255,255,255,0)'); vol.addColorStop(1, 'rgba(0,0,0,.38)');
    g.fillStyle = vol; g.fillRect(x, y, PW, PH);                       // volume : lumière et ombre propre
    g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(x + PW * 0.3, y + PH * 0.24, 1.3, 0.8, -0.6, 0, 7); g.fill();   // éclat spéculaire
  }
  if (APPARENCE.motif !== 'rien') { g.globalAlpha *= 0.55; motif(g, APPARENCE.motif, x, y, PW, PH, t); g.globalAlpha /= 0.55; }   // le motif laisse voir la couleur de l'état
  yeuxStyle(g, x + PW / 2 + e.face, y + (ph === M.L ? 7.5 : ph === M.P ? 5.5 : 5), e.face, m[3], APPARENCE.yeux);
  accessoire(g, e, x, y);
  g.restore();
  g.globalAlpha = 1;
}
// couleur du contour selon l'apparence (les animées changent avec le temps)
function couleurContour(c, defaut, g, x, y) {
  const t = temps;
  if (g) switch (c) {
    case 'argent': case 'or': {                                     // métal poli : un reflet passe lentement
      const gr = g.createLinearGradient(x, y, x + PW, y + PH), k = (t * 0.6) % 1.6 - 0.3;
      const C = c === 'or' ? ['#8a5a10', '#ffe27a', '#fff8d8'] : ['#6a7684', '#dfe6ee', '#ffffff'];
      gr.addColorStop(0, C[0]); gr.addColorStop(Math.max(0, Math.min(1, k)), C[2]); gr.addColorStop(Math.max(0, Math.min(1, k + 0.15)), C[1]); gr.addColorStop(1, C[0]); return gr;
    }
    case 'galaxie': { const gr = g.createRadialGradient(x + PW / 2 + Math.cos(t) * 3, y + PH / 2 + Math.sin(t) * 3, 0, x + PW / 2, y + PH / 2, PW * 0.8); gr.addColorStop(0, '#ffb0f0'); gr.addColorStop(0.35, '#8a4aff'); gr.addColorStop(0.7, '#2a1070'); gr.addColorStop(1, '#05021a'); return gr; }
    case 'arcenciel': if (g.createConicGradient) { const gr = g.createConicGradient(t * 2, x + PW / 2, y + PH / 2); for (let k = 0; k <= 6; k++) gr.addColorStop(k / 6, `hsl(${k * 60},95%,62%)`); return gr; } break;
  }
  switch (c) {
    case 'blanc': return '#ffffff'; case 'noir': return '#0a0a0e'; case 'rose': return '#ff4ab8'; case 'cyan': return '#2ae0ff'; case 'vert': return '#3ae06a';
    case 'rouge': return '#ff2a3a'; case 'violet': return '#9a4aff'; case 'argent': return '#cfd6e0'; case 'or': return '#ffcc2a';
    case 'neon': return `hsl(300,100%,${45 + 20 * Math.sin(t * 6)}%)`; case 'feu': return `hsl(${20 + 20 * Math.sin(t * 8)},100%,55%)`;
    case 'galaxie': return `hsl(${250 + 40 * Math.sin(t * 2)},80%,${40 + 15 * Math.sin(t * 5)}%)`; case 'arcenciel': return `hsl(${(t * 140) % 360},95%,60%)`;
    default: return defaut;
  }
}
function aura(g, cx, cy, a) {
  if (!a || a === 'rien') return;
  g.save(); g.translate(cx, cy); g.scale(0.68, 0.68); g.translate(-cx, -cy);   // discrète : elle ne doit pas gêner la vue
  auraPleine(g, cx, cy, a);
  g.restore();
}
function auraPleine(g, cx, cy, a) {
  const t = temps, C = { douce: '255,255,255', glace: '150,230,255', rose: '255,110,210', toxique: '120,255,90', feu: '255,120,40', ombre: '60,20,120', doree: '255,210,70',
    electrique: '120,200,255', pulsar: '255,80,255', etoilee: '200,180,255', divine: '255,250,200', neant: '0,0,0', arcenciel: null }[a];
  const r = 15 + (a === 'pulsar' ? 4 * Math.sin(t * 6) : 0) + (a === 'divine' ? 3 : 0);
  const col = C || `${Math.round(127 + 127 * Math.sin(t * 3))},${Math.round(127 + 127 * Math.sin(t * 3 + 2))},${Math.round(127 + 127 * Math.sin(t * 3 + 4))}`;
  const gr = g.createRadialGradient(cx, cy, 4, cx, cy, r);
  gr.addColorStop(0, `rgba(${col},${a === 'neant' ? 0.6 : 0.45})`); gr.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
  if (a === 'electrique' && Math.random() < 0.3) { g.strokeStyle = 'rgba(200,240,255,.8)'; g.lineWidth = 1; g.beginPath(); let px = cx + (Math.random() - 0.5) * 20, py = cy + (Math.random() - 0.5) * 20; g.moveTo(px, py); for (let k = 0; k < 3; k++) { px += (Math.random() - 0.5) * 8; py += (Math.random() - 0.5) * 8; g.lineTo(px, py); } g.stroke(); }
  if (a === 'etoilee') for (let k = 0; k < 5; k++) {                     // petites étoiles en orbite qui scintillent
    const an = t * 1.4 + k * 1.2566, rr = 11 + Math.sin(t * 2 + k) * 1.5, px = cx + Math.cos(an) * rr, py = cy + Math.sin(an) * rr * 0.75, s2 = 1 + Math.abs(Math.sin(t * 4 + k)) * 1.4;
    g.fillStyle = '#efe4ff'; g.fillRect(px - s2, py - 0.25, s2 * 2, 0.5); g.fillRect(px - 0.25, py - s2, 0.5, s2 * 2);
  }
  if (a === 'divine') {                                               // rayons dorés qui tournent doucement
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 8; k++) { const an = t * 0.5 + k * Math.PI / 4, l = 17 + 3 * Math.sin(t * 2 + k); const gr = g.createLinearGradient(cx, cy, cx + Math.cos(an) * l, cy + Math.sin(an) * l); gr.addColorStop(0, 'rgba(255,240,170,.45)'); gr.addColorStop(1, 'rgba(255,240,170,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(an - 0.09) * l, cy + Math.sin(an - 0.09) * l); g.lineTo(cx + Math.cos(an + 0.09) * l, cy + Math.sin(an + 0.09) * l); g.fill(); }
    g.restore();
  }
  if (a === 'neant') {                                                // horizon du néant : anneau violet, poussière aspirée
    g.strokeStyle = `rgba(150,90,255,${0.55 + 0.2 * Math.sin(t * 3)})`; g.lineWidth = 0.8; g.beginPath(); g.arc(cx, cy, 12, 0, 7); g.stroke();
    for (let k = 0; k < 6; k++) { const p = (t * 0.6 + k / 6) % 1, an = k * 1.05 + p * 2.5, rr = 16 * (1 - p); g.fillStyle = `rgba(190,150,255,${p})`; g.fillRect(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr, 0.9, 0.9); }
  }
  if (a === 'arcenciel' && g.createConicGradient) {                   // anneau prismatique qui tourne
    const gr = g.createConicGradient(-t * 1.5, cx, cy); for (let k = 0; k <= 6; k++) gr.addColorStop(k / 6, `hsla(${k * 60},95%,65%,.7)`);
    g.strokeStyle = gr; g.lineWidth = 1.4; g.beginPath(); g.arc(cx, cy, 12.5, 0, 7); g.stroke();
  }
}
let derniereTrainee = 0, ruban = [];
// traînées de la boutique : des particules qui ont leur forme ; les plus chères laissent un ruban continu
function trainee(e, tr2) {
  if (!tr2 || tr2 === 'rien') return;
  const cx = e.x + PW / 2, cy = e.y + PH / 2;
  if (tr2 === 'arcenciel' || tr2 === 'ombre') {                         // ruban continu (prismatique ou d'ombre)
    const d = ruban.length ? ruban[ruban.length - 1] : null;
    if (d && (Math.abs(d[0] - cx) > 40 || Math.abs(d[1] - cy) > 40)) ruban = [];
    if (!d || Math.hypot(d[0] - cx, d[1] - cy) > 0.3) ruban.push([cx, cy, temps]);
  }
  if (Math.abs(e.vx) + Math.abs(e.vy) < 1.2) return;
  if (temps - derniereTrainee < 0.03) return;
  derniereTrainee = temps;
  const x = cx - Math.sign(e.vx) * 5 + (Math.random() - 0.5) * 4, y = cy + (Math.random() - 0.5) * 4;
  const hsl = `hsl(${(temps * 200) % 360},95%,65%)`;
  // [couleur, taille, gravité, lumineuse, forme, vie]
  const P2 = { poussiere: ['rgba(220,200,170,.6)', 2, 0.02], bulles: ['rgba(170,230,255,.85)', 3, -0.03, false, 'bulle'], feuilles: ['#6ad04a', 3.2, 0.03, false, 'feuille'], neige: ['#ffffff', 3, 0.01, false, 'flocon'],
    notes: ['#ffe94a', 3, -0.02, false, 'note'], pixels: ['#4ab8ff', 2, 0], etincelles: ['#ffd34d', 1.6, 0.05, true], coeurs: ['#ff4a8a', 3, -0.02, false, 'coeur'], etoiles: ['#fff6c0', 3.2, 0, true, 'etoile'],
    eclairs: ['#bfe8ff', 3.5, 0, true, 'eclair'], flammes: [null, 4.2, -0.07, true, 'flamme', 26], ombre: [null, 5, -0.01, false, 'fumee', 40], arcenciel: [hsl, 2.6, 0, true, 'scintille', 34] }[tr2];
  if (!P2) return;
  part(x, y, -e.vx * 0.15 + (Math.random() - 0.5) * 0.5, -e.vy * 0.1 + (Math.random() - 0.5) * 0.5, Math.round((P2[5] || 28) * 0.7), P2[0] || '#fff', P2[1] * 0.65, P2[2], !!P2[3], P2[4]);   // petite et brève : elle ne gêne pas
  if (tr2 === 'flammes' && Math.random() < 0.4) part(x, y, (Math.random() - 0.5) * 1.2, -0.6 - Math.random(), 15, '#ffd060', 0.8, -0.02, true);   // étincelles
}
// le ruban des traînées les plus chères : il suit le personnage et s'efface en 0,4 s
function dessinerRuban(g, tr2) {
  if (tr2 !== 'arcenciel' && tr2 !== 'ombre') { ruban = []; return; }
  ruban = ruban.filter(p => temps - p[2] < 0.35);
  if (ruban.length < 2) return;
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  if (tr2 === 'arcenciel') g.globalCompositeOperation = 'lighter';
  for (let i = 1; i < ruban.length; i++) {
    const [x0, y0] = ruban[i - 1], [x1, y1, t1] = ruban[i], k = 1 - (temps - t1) / 0.35;
    if (tr2 === 'arcenciel') {
      g.strokeStyle = `hsla(${(t1 * 240 + i * 8) % 360},95%,62%,${0.55 * k})`; g.lineWidth = 4 * k; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      g.strokeStyle = `rgba(255,255,255,${0.6 * k})`; g.lineWidth = 1 * k; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    } else {
      g.strokeStyle = `rgba(120,60,220,${0.35 * k})`; g.lineWidth = 6 * k; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      g.strokeStyle = `rgba(10,2,24,${0.8 * k})`; g.lineWidth = 4 * k; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    }
  }
  g.restore();
}
function yeuxStyle(g, x, y, face, c, st) {
  const f = face > 0 ? 1 : 0;
  switch (st) {
    case 'ronds': g.fillStyle = '#fff'; g.beginPath(); g.arc(x - 2, y, 2, 0, 7); g.arc(x + 2.5, y, 2, 0, 7); g.fill(); g.fillStyle = c; g.fillRect(x - 2.5 + f, y - 0.5, 1.4, 1.4); g.fillRect(x + 2 + f, y - 0.5, 1.4, 1.4); return;
    case 'fache': yeux(g, x, y, face, c); g.fillStyle = c; g.beginPath(); g.moveTo(x - 4, y - 2.5); g.lineTo(x - 0.5, y - 1); g.lineTo(x - 0.5, y - 2); g.fill(); g.beginPath(); g.moveTo(x + 4, y - 2.5); g.lineTo(x + 0.5, y - 1); g.lineTo(x + 0.5, y - 2); g.fill(); return;
    case 'endormi': g.fillStyle = c; g.fillRect(x - 3.5, y + 0.5, 3, 1); g.fillRect(x + 0.5, y + 0.5, 3, 1); return;
    case 'surpris': g.fillStyle = '#fff'; g.fillRect(x - 4, y - 2, 3.5, 4.5); g.fillRect(x + 0.5, y - 2, 3.5, 4.5); g.fillStyle = c; g.fillRect(x - 2.8, y - 0.5, 1.2, 1.2); g.fillRect(x + 1.7, y - 0.5, 1.2, 1.2); return;
    case 'mignon': g.fillStyle = c; g.fillRect(x - 3.5, y - 1, 3, 3); g.fillRect(x + 0.5, y - 1, 3, 3); g.fillStyle = '#fff'; g.fillRect(x - 3, y - 0.5, 1, 1); g.fillRect(x + 1, y - 0.5, 1, 1); g.fillStyle = 'rgba(255,120,160,.7)'; g.fillRect(x - 5, y + 2.5, 2, 1); g.fillRect(x + 3, y + 2.5, 2, 1); return;
    case 'cyclope': g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 2.6, 0, 7); g.fill(); g.fillStyle = c; g.beginPath(); g.arc(x + face * 0.8, y, 1.2, 0, 7); g.fill(); return;
    case 'croix': g.strokeStyle = c; g.lineWidth = 1; g.beginPath(); for (const ox of [-2, 2]) { g.moveTo(x + ox - 1.3, y - 1.3); g.lineTo(x + ox + 1.3, y + 1.3); g.moveTo(x + ox + 1.3, y - 1.3); g.lineTo(x + ox - 1.3, y + 1.3); } g.stroke(); return;
    case 'lunettes': g.fillStyle = '#111'; g.fillRect(x - 4.5, y - 1.5, 4, 3); g.fillRect(x + 0.5, y - 1.5, 4, 3); g.fillRect(x - 0.5, y - 0.5, 1, 1); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(x - 4, y - 1, 1.2, 1); return;
    case 'masque': g.fillStyle = 'rgba(20,20,30,.9)'; g.fillRect(x - 5.5, y - 2, 11, 4); g.fillStyle = '#fff'; g.fillRect(x - 3.5 + f, y - 0.5, 1.5, 1.5); g.fillRect(x + 1.5 + f, y - 0.5, 1.5, 1.5); return;
    case 'coeur': g.fillStyle = '#ff3a7a'; for (const ox of [-2, 2]) { g.beginPath(); g.arc(x + ox - 0.7, y - 0.5, 0.9, 0, 7); g.arc(x + ox + 0.7, y - 0.5, 0.9, 0, 7); g.fill(); g.beginPath(); g.moveTo(x + ox - 1.6, y - 0.2); g.lineTo(x + ox, y + 1.8); g.lineTo(x + ox + 1.6, y - 0.2); g.fill(); } return;
    case 'etoile': g.fillStyle = '#ffe94a'; for (const ox of [-2, 2]) { g.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 - Math.PI / 2, r = k % 2 ? 0.8 : 2; g.lineTo(x + ox + Math.cos(a) * r, y + Math.sin(a) * r); } g.fill(); } return;
    case 'robot': g.fillStyle = '#ff2a3a'; g.fillRect(x - 4.5, y - 0.8, 9, 1.6); g.fillStyle = `rgba(255,120,120,${0.5 + 0.5 * Math.sin(temps * 8)})`; g.fillRect(x - 4.5 + ((temps * 20) % 8), y - 0.8, 1.5, 1.6); return;
    case 'flamme': g.fillStyle = `hsl(${30 + 15 * Math.sin(temps * 10)},100%,60%)`; for (const ox of [-2, 2]) { g.beginPath(); g.moveTo(x + ox - 1.3, y + 1.5); g.quadraticCurveTo(x + ox, y - 3, x + ox + 1.3, y + 1.5); g.fill(); } return;
    default: yeux(g, x, y, face, c);
  }
}
// aperçu animé de la boutique : le personnage court d'un bord à l'autre (traînées, auras et contours visibles)
const apercus = new WeakMap();
function apercuAnime(cv, eq, dt, bouge) {
  let st = apercus.get(cv); if (!st) { st = { parts: [], t: Math.random() * 6, der: 0, ruban: [], px: null }; apercus.set(cv, st); }
  st.t += dt;
  const g = cv.getContext('2d'), sc = cv.height / 22, wu = cv.width / sc;
  const sP = parts, sA = APPARENCE, sT = temps, sD = derniereTrainee, sR = ruban;
  parts = st.parts; APPARENCE = Object.assign({}, APPARENCE, eq); temps = st.t; derniereTrainee = st.der; ruban = st.ruban;
  // il traverse l'aperçu en courant (comme en jeu), avec de petits bonds
  const x = bouge ? ((st.t * 46) % (wu + 30)) - 15 - PW / 2 : wu / 2 - PW / 2, y = 6 - (bouge ? Math.abs(Math.sin(st.t * 5)) * 3 : 0);
  const e = { x, y, vx: bouge ? 3.4 : 0, vy: 0, phase: 0, face: 1, sol: !bouge, invT: 0, gaz: 0, mortT: 0 };
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
  g.save(); g.scale(sc, sc);
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.97; p.vie--; if (p.vie <= 0) parts.splice(i, 1); }
  for (const p of parts) { g.globalAlpha = Math.min(1, p.vie / p.max * 1.5); if (p.f) dessinerPart(g, p); else { g.fillStyle = p.c; g.fillRect(p.x - p.t / 2, p.y - p.t / 2, p.t, p.t); } }
  g.globalAlpha = 1;
  joueur(g, e, 1, false);
  g.restore();
  st.der = derniereTrainee; st.ruban = ruban;
  parts = sP; APPARENCE = sA; temps = sT; derniereTrainee = sD; ruban = sR;
}
// aperçu de la boutique : le personnage (solide) avec ces apparences, en grand
function apercu(cv, eq) {
  const g = cv.getContext('2d'), sauve = APPARENCE;
  APPARENCE = Object.assign({}, APPARENCE, eq);
  g.clearRect(0, 0, cv.width, cv.height);
  g.save(); g.scale(cv.width / 24, cv.height / 24);
  const e = { x: 6, y: 6, vx: 0, vy: 0, phase: 0, face: 1, sol: false, invT: 0, gaz: 0, mortT: 0 };
  joueur(g, e, 1, false);
  g.restore();
  APPARENCE = sauve;
}
// motifs des apparences (boutique)
function motif(g, mo, x, y, w, h, t) {
  switch (mo) {
    case 'rayures': g.fillStyle = 'rgba(0,0,0,.18)'; for (let k = 0; k < w; k += 3) g.fillRect(x + k, y, 1.5, h); break;
    case 'points': g.fillStyle = 'rgba(255,255,255,.4)'; for (let a = 1; a < w; a += 3) for (let b = 1; b < h; b += 3) g.fillRect(x + a, y + b, 1, 1); break;
    case 'damier': g.fillStyle = 'rgba(0,0,0,.2)'; for (let a = 0; a < w; a += 2) for (let b = 0; b < h; b += 2) if ((a + b) % 4 === 0) g.fillRect(x + a, y + b, 2, 2); break;
    case 'etoiles': for (let k = 0; k < 6; k++) { const a = alea(k * 7.1), b = alea(k * 3.3); g.fillStyle = `rgba(255,255,255,${0.4 + 0.6 * Math.abs(Math.sin(t * 3 + k))})`; g.fillRect(x + a * (w - 1), y + b * (h - 1), 1, 1); } break;
    case 'lave': g.strokeStyle = `rgba(255,${150 + 80 * Math.sin(t * 4) | 0},40,.9)`; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y + 6); g.lineTo(x + 4, y + 4); g.lineTo(x + 6, y + 8); g.lineTo(x + w, y + 5); g.moveTo(x + 4, y + 4); g.lineTo(x + 5, y); g.stroke(); break;
    case 'facettes': g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w / 2, y + h / 2); g.lineTo(x, y + h); g.fill(); g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.moveTo(x + w, y); g.lineTo(x + w / 2, y + h / 2); g.lineTo(x + w, y + h); g.fill(); break;
    case 'arcenciel': for (let k = 0; k < h; k++) { g.fillStyle = `hsl(${(t * 120 + k * 30) % 360},90%,62%)`; g.fillRect(x, y + k, w, 1); } break;
    case 'brillant': { const k = ((t * 12) % (w * 3)) - w; g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.moveTo(x + k, y + h); g.lineTo(x + k + 3, y + h); g.lineTo(x + k + 7, y); g.lineTo(x + k + 4, y); g.fill(); break; }
    case 'zigzag': g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1; g.beginPath(); for (let b = 2; b < h; b += 4) { g.moveTo(x, y + b); for (let a = 0; a <= w; a += 3) g.lineTo(x + a, y + b + ((a / 3) % 2 ? 1.5 : -1.5)); } g.stroke(); break;
    case 'ecailles': g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 0.8; for (let b = 0; b < h; b += 3) for (let a = (b / 3) % 2 ? 1.5 : 0; a < w; a += 3) { g.beginPath(); g.arc(x + a + 1.5, y + b, 1.5, 0, Math.PI); g.stroke(); } break;
    case 'coeurs': g.fillStyle = 'rgba(255,60,130,.8)'; for (const [a, b] of [[3, 3], [8, 7], [3, 9]]) { g.beginPath(); g.arc(x + a - 0.6, y + b, 0.9, 0, 7); g.arc(x + a + 0.6, y + b, 0.9, 0, 7); g.fill(); g.beginPath(); g.moveTo(x + a - 1.5, y + b + 0.3); g.lineTo(x + a, y + b + 2); g.lineTo(x + a + 1.5, y + b + 0.3); g.fill(); } break;
    case 'circuit': g.strokeStyle = 'rgba(80,255,180,.8)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, y + 3); g.lineTo(x + 4, y + 3); g.lineTo(x + 4, y + 8); g.lineTo(x + w, y + 8); g.moveTo(x + 8, y); g.lineTo(x + 8, y + 5); g.stroke(); g.fillStyle = 'rgba(80,255,180,.9)'; g.fillRect(x + 3.5, y + 7.5, 1.2, 1.2); g.fillRect(x + 7.5, y + 4.5, 1.2, 1.2); break;
    case 'nebuleuse': { const g2 = g.createRadialGradient(x + w / 2 + Math.sin(t) * 2, y + h / 2, 0, x + w / 2, y + h / 2, w); g2.addColorStop(0, 'rgba(255,120,240,.7)'); g2.addColorStop(0.5, 'rgba(90,60,255,.4)'); g2.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = g2; g.fillRect(x, y, w, h); motif(g, 'etoiles', x, y, w, h, t); break; }
  }
}
// accessoire de la boutique : dessiné DANS le carré (la hitbox ne change pas)
function accessoire(g, e, x, y) {
  const a = APPARENCE.tete;
  if (!a || a === 'rien') return;
  const cx2 = x + PW / 2;
  switch (a) {
    case 'chapeau': g.fillStyle = '#1e1612'; g.fillRect(x, y, PW, 3); g.fillStyle = '#c0392b'; g.fillRect(x, y + 2, PW, 1); break;
    case 'couronne': {                                               // couronne d'or ciselée, rubis et saphirs, reflet qui passe
      const gr = g.createLinearGradient(x, y, x + PW, y + 4); gr.addColorStop(0, '#9a6a10'); gr.addColorStop(0.5, '#ffe680'); gr.addColorStop(1, '#b07a14');
      g.fillStyle = gr; g.beginPath(); g.moveTo(x + 1, y + 4); g.lineTo(x + 1, y + 0.5); g.lineTo(x + 3.3, y + 2.2); g.lineTo(cx2, y - 0.2); g.lineTo(x + PW - 3.3, y + 2.2); g.lineTo(x + PW - 1, y + 0.5); g.lineTo(x + PW - 1, y + 4); g.fill();
      g.fillStyle = '#7a4a08'; g.fillRect(x + 1, y + 3.3, PW - 2, 0.7);
      g.fillStyle = '#ff2a5a'; g.beginPath(); g.arc(cx2, y + 2.4, 0.9, 0, 7); g.fill(); g.fillStyle = '#3a8aff'; g.fillRect(x + 2.6, y + 2.6, 1.1, 1.1); g.fillRect(x + PW - 3.7, y + 2.6, 1.1, 1.1);
      const k = (temps * 0.7) % 2; if (k < 1) { g.fillStyle = `rgba(255,255,255,${0.8 * Math.sin(k * Math.PI)})`; g.fillRect(x + 1 + k * (PW - 3), y + 0.8, 0.8, 2.6); }
      break;
    }
    case 'echarpe': g.fillStyle = '#e74c3c'; g.fillRect(x, y + 8, PW, 2); g.fillRect(e.face > 0 ? x + 1 : x + PW - 3, y + 9, 2, 3); break;
    case 'lunettes': g.fillStyle = '#111'; g.fillRect(cx2 - 5 + e.face, y + 3.5, 4.5, 3); g.fillRect(cx2 + 0.5 + e.face, y + 3.5, 4.5, 3); break;
    case 'cornes': g.fillStyle = '#f5ead0'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 3, y); g.lineTo(x, y + 3); g.fill(); g.beginPath(); g.moveTo(x + PW, y); g.lineTo(x + PW - 3, y); g.lineTo(x + PW, y + 3); g.fill(); break;
    case 'aureole': { g.save(); g.shadowColor = '#fff6a0'; g.shadowBlur = 5; g.strokeStyle = `rgba(255,246,170,${0.75 + 0.25 * Math.sin(temps * 3)})`; g.lineWidth = 1; g.beginPath(); g.ellipse(cx2, y + 1.2, 4.2, 1, 0, 0, 7); g.stroke(); g.restore(); break; }
    case 'antenne': g.fillStyle = '#ff4a5a'; g.fillRect(cx2 - 1, y, 2, 2); g.fillStyle = '#ccc'; g.fillRect(cx2 - 0.5, y + 2, 1, 1.5); break;
    case 'noeud': g.fillStyle = '#ff6ad5'; g.beginPath(); g.moveTo(x + PW - 4, y + 2); g.lineTo(x + PW - 1, y); g.lineTo(x + PW - 1, y + 4); g.fill(); g.beginPath(); g.moveTo(x + PW - 4, y + 2); g.lineTo(x + PW - 7, y); g.lineTo(x + PW - 7, y + 4); g.fill(); break;
    case 'masque': g.fillStyle = 'rgba(20,20,30,.85)'; g.fillRect(x, y + 3, PW, 3.5); break;
    case 'moustache': g.fillStyle = '#2a1a10'; g.fillRect(cx2 - 4, y + 8, 3.5, 1.5); g.fillRect(cx2 + 0.5, y + 8, 3.5, 1.5); break;
    case 'bandeau': g.fillStyle = '#ffffff'; g.fillRect(x, y + 1.5, PW, 1.5); g.fillStyle = '#e83a3a'; g.fillRect(cx2 - 1, y + 1.5, 2, 1.5); break;
    case 'casquette': g.fillStyle = '#2a6ae0'; g.fillRect(x, y, PW, 3); g.fillRect(e.face > 0 ? x + PW - 4 : x, y + 2, 4, 1.5); break;
    case 'bonnet': g.fillStyle = '#e04a4a'; g.fillRect(x, y, PW, 3.5); g.fillStyle = '#fff'; g.fillRect(x, y + 2.5, PW, 1); g.fillRect(cx2 - 1, y, 2, 1.5); break;
    case 'oreilles': g.fillStyle = '#f0b0c0'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 4, y); g.lineTo(x + 1, y + 4); g.fill(); g.beginPath(); g.moveTo(x + PW, y); g.lineTo(x + PW - 4, y); g.lineTo(x + PW - 1, y + 4); g.fill(); break;
    case 'crete': g.fillStyle = '#ff3a6a'; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(cx2 - 4 + k * 3, y + 3); g.lineTo(cx2 - 2.5 + k * 3, y); g.lineTo(cx2 - 1 + k * 3, y + 3); g.fill(); } break;
    case 'plume': g.strokeStyle = '#7dffb0'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx2, y + 3); g.quadraticCurveTo(cx2 + 4, y, cx2 + 5, y + 0.5); g.stroke(); break;
    case 'diademe': {                                                // fin diadème d'argent, pierre rose taillée qui scintille
      g.strokeStyle = '#e8f6ff'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(x + 1, y + 2.6); g.quadraticCurveTo(cx2, y + 0.4, x + PW - 1, y + 2.6); g.stroke();
      g.fillStyle = '#ff6ad5'; g.beginPath(); g.moveTo(cx2, y + 0.2); g.lineTo(cx2 + 1.3, y + 1.6); g.lineTo(cx2, y + 3); g.lineTo(cx2 - 1.3, y + 1.6); g.fill();
      g.fillStyle = '#ffd0f4'; g.fillRect(cx2 - 0.5, y + 0.9, 0.6, 0.6);
      const k = Math.max(0, Math.sin(temps * 2.3)); if (k > 0.7) { g.fillStyle = `rgba(255,255,255,${(k - 0.7) * 3})`; g.fillRect(cx2 - 2.2, y + 1.45, 4.4, 0.3); g.fillRect(cx2 - 0.15, y - 0.6, 0.3, 4.4); }
      break;
    }
    case 'flammes': for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? '#ffd040' : '#ff6a14'; const h2 = 2 + 1.5 * Math.abs(Math.sin(temps * 9 + k)); g.fillRect(x + 1 + k * 2.6, y, 2, h2); } break;
  }
}
function yeux(g, x, y, face, c) {
  g.fillStyle = '#fff'; g.fillRect(x - 3.5, y - 1.5, 3, 3.5); g.fillRect(x + 0.5, y - 1.5, 3, 3.5);
  g.fillStyle = c; g.fillRect(x - 3 + (face > 0 ? 1 : 0), y - 0.5, 1.6, 2.2); g.fillRect(x + 1 + (face > 0 ? 1 : 0), y - 0.5, 1.6, 2.2);
}
function arrondi(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

/* ---------- Interface en jeu ---------- */
function chrono(f) {
  if (f == null) return '—';
  const ms = Math.round(f * 1000 / 60);
  const m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60, r = ms % 1000;
  return (m ? m + ':' + String(s).padStart(2, '0') : s) + '.' + String(r).padStart(3, '0');
}
function ecart(f) {
  if (f == null) return '';
  const ms = Math.round(Math.abs(f) * 1000 / 60);
  return (f < 0 ? '−' : '+') + (ms / 1000).toFixed(3);
}
function interfaceJeu(g, e, hud) {
  if (!hud) return;
  const P = Math.min(1.25, Math.max(0.75, LARG / 1100));
  g.save();
  g.textBaseline = 'top';
  // chrono principal
  g.textAlign = 'center';
  g.font = `800 ${Math.round(34 * P)}px "Chakra Petch", monospace`;
  {   // fonds sombres derrière les textes
    const lc = g.measureText(hud.texteCentre || chrono(hud.chrono)).width + 36 * P;
    g.fillStyle = 'rgba(8,6,14,.55)'; arrondi(g, LARG / 2 - lc / 2, 8 * P, lc, (hud.sousChrono ? 68 : 48) * P, 12 * P); g.fill();
    const nl = (hud.lignes ? hud.lignes.length : 0) + 1;
    g.fillStyle = 'rgba(8,6,14,.45)'; arrondi(g, 8, 8 * P, Math.max(330, 290 * P), 14 * P + Math.max(26, 24 * P) + (nl - 1) * Math.max(22, 20 * P) + 10, 10 * P); g.fill();
    if (hud.droite && hud.droite.length) { arrondi(g, LARG - 8 - 190 * P, 8 * P, 190 * P, (16 + (hud.droite.length + 1) * 18) * P, 10 * P); g.fill(); }
  }
  const centre = hud.texteCentre || chrono(hud.chrono);
  g.fillStyle = 'rgba(0,0,0,.55)'; g.fillText(centre, LARG / 2 + 2, 14 * P + 2);
  g.fillStyle = hud.couleurChrono || '#fff'; g.fillText(centre, LARG / 2, 14 * P);
  if (hud.sousChrono) {
    g.font = `600 ${Math.max(16, Math.round(15 * P))}px "Chakra Petch", monospace`;
    g.fillStyle = hud.sousCouleur || '#bbb'; g.fillText(hud.sousChrono, LARG / 2, 54 * P);
  }
  // nom du niveau
  g.textAlign = 'left';
  g.font = `700 ${Math.max(16, Math.round(16 * P))}px "Chakra Petch", sans-serif`;
  g.fillStyle = th.accent; g.fillText(hud.titre || '', 16, 14 * P);
  g.font = `500 ${Math.max(16, Math.round(13 * P))}px "Chakra Petch", sans-serif`;
  g.fillStyle = '#ccc';
  const pasL = Math.max(22, 20 * P);
  if (hud.lignes) hud.lignes.forEach((l, i) => { g.fillStyle = l.c || '#ccc'; g.fillText(l.t, 16, 14 * P + Math.max(26, 24 * P) + i * pasL); });
  // morts
  g.textAlign = 'right';
  g.fillStyle = '#ccc'; g.fillText('☠ ' + e.morts, LARG - 16, 14 * P);
  if (hud.droite) hud.droite.forEach((l, i) => {
    g.fillStyle = l.c || '#aaa'; g.font = `${l.gras ? 700 : 500} ${Math.max(16, Math.round(13 * P))}px "Chakra Petch", monospace`;
    g.fillText(l.t, LARG - 16, (36 + i * 18) * P);
  });
  // états + charges (bas gauche)
  const n = niv;
  const emp = n ? n.emplacements.slice() : [M.S];
  const ph = emp.filter(p => n && (n.phases & (1 << p)));
  const taille = Math.max(64, 54 * P), lg = Math.max(122, 104 * P);     // cases larges : les noms tiennent en 16 px au moins
  let bx = 16, by = HAUT - taille - 18 * P;
  if (hud.tactile) { bx = LARG / 2 - (ph.length * (lg + 8) + 46 * P) / 2; by = (hud.sousChrono ? 80 : 62) * P; }   // en tactile : en haut, loin des pouces
  g.textAlign = 'center';
  ph.forEach((p, i) => {
    const x = bx + i * (lg + 8);
    const actif = e.phase === p, slot = emp.indexOf(p);
    const banni = e.ban === p && e.temps < e.banT;
    g.fillStyle = actif ? COUL_PHASE[p] : 'rgba(255,255,255,.08)';
    g.globalAlpha = actif ? 1 : 0.9;
    arrondi(g, x, by, lg, taille, 8); g.fill();
    g.strokeStyle = COUL_PHASE[p]; g.lineWidth = 2; g.stroke();
    g.fillStyle = actif ? '#111' : COUL_PHASE[p];
    g.font = `800 ${Math.max(24, Math.round(22 * P))}px "Chakra Petch", sans-serif`;
    g.fillText((hud.touches && hud.touches[slot]) || '', x + lg / 2, by + 4 * P);
    const nomE = ((hud.nomsPhases && hud.nomsPhases[p]) || M.NOMS_PHASES[p]).toUpperCase();
    g.font = `700 ${Math.max(16, Math.round(14 * P))}px "Chakra Petch", sans-serif`;
    g.fillText(nomE, x + lg / 2, by + taille - Math.max(20, 18 * P));
    if (actif && hud.nomsCapas) {                    // la compétence : réappuyer sur la même touche
      g.font = `700 ${Math.max(16, Math.round(13 * P))}px "Chakra Petch", sans-serif`; g.fillStyle = e.capCd > 0 ? 'rgba(255,255,255,.4)' : '#ffe94a';
      g.fillText('↻ ' + hud.nomsCapas[p], x + lg / 2, by - Math.max(22, 20 * P));
    }
    if ((p === M.Z || p === M.OM) && e.phase === p) { g.fillStyle = '#ff9a40'; g.fillRect(x + 3, by + taille + 3, (lg - 6) * e.gaz / (p === M.Z ? M.K.zDuree : M.K.omDuree), 4); }
    if (banni) {                                  // état banni : grande croix rouge et temps restant
      g.globalAlpha = 1;
      g.fillStyle = 'rgba(20,0,4,.6)'; arrondi(g, x, by, lg, taille, 8); g.fill();
      g.strokeStyle = '#ff2a3a'; g.lineWidth = 4 * P; g.beginPath();
      g.moveTo(x + 7, by + 7); g.lineTo(x + lg - 7, by + taille - 7); g.moveTo(x + lg - 7, by + 7); g.lineTo(x + 7, by + taille - 7); g.stroke();
      g.fillStyle = '#ff2a3a'; g.fillRect(x + 3, by + taille + 3, (lg - 6) * Math.min(1, (e.banT - e.temps) / M.K.banDuree), 4);
    }
  });
  g.globalAlpha = 1;
  if (ph.length > 1) {
    const cxh = bx + ph.length * (lg + 8) + 10;
    for (let i = 0; i < M.K.charges; i++) {
      const plein = i < e.charges;
      g.fillStyle = plein ? '#7dfcff' : 'rgba(255,255,255,.12)';
      g.beginPath(); const px = cxh + i * 18 * P + 6, py = by + taille / 2;
      g.arc(px, py, 6.5 * P, 0, 7); g.fill();      // charges : des ronds bleus (le losange ◆ est réservé aux éclats, toujours roses)
    }
    if (hud.echec > 0) { g.fillStyle = `rgba(255,60,80,${hud.echec / 20})`; g.fillRect(cxh - 4, by + taille / 2 - 12 * P, 40 * P, 24 * P); }
  }
  // point de sauvegarde : lequel sur combien
  if (n && dyn.drapeau.length) {
    let k = 0;
    if (e.cp) for (const [fx] of dyn.drapeau) if (fx <= e.cp.tx) k++;
    g.textAlign = 'left'; g.font = `700 ${Math.max(16, Math.round(16 * P))}px "Chakra Petch", sans-serif`;
    const tx2 = '⚑ ' + k + ' / ' + dyn.drapeau.length;
    const yy = hud.tactile ? HAUT - 40 * P : by - Math.max(56, 52 * P);
    g.fillStyle = 'rgba(8,6,14,.55)'; arrondi(g, bx - 4, yy - 4, g.measureText(tx2).width + 14, 24 * P, 6); g.fill();
    g.fillStyle = k ? '#7dff9a' : '#ccc'; g.fillText(tx2, bx + 3, yy);
    g.textAlign = 'center';
  }
  // éclat
  if (n && n.aEclat) {
    g.font = `700 ${Math.max(16, Math.round(18 * P))}px sans-serif`; g.textAlign = 'right';
    g.fillStyle = e.eclat ? '#ff7ae0' : 'rgba(255,122,224,.35)'; g.fillText('◆', LARG - 16, HAUT - 40 * P);
  }
  // entrées affichées
  if (hud.entrees != null) {                                       // grandes touches : déplacements, saut, transformations
    const inp = hud.entrees, E = M.E;
    const k = Math.max(40, 46 * P), x0 = LARG - 24 - k * 7.2, y0 = HAUT - k * 2 - 70 * P;
    g.fillStyle = 'rgba(8,6,14,.72)'; arrondi(g, x0 - 12, y0 - 12, k * 7.2 + 16, k * 2 + 24, 12); g.fill();
    const touche = (x, y, on, t, w, c) => {
      g.fillStyle = on ? (c || '#ffe94a') : 'rgba(255,255,255,.12)'; arrondi(g, x, y, (w || 1) * k - 6, k - 6, 8); g.fill();
      g.strokeStyle = on ? '#fff' : (c || 'rgba(255,255,255,.45)'); g.lineWidth = on ? 3 : 2; g.stroke();
      g.fillStyle = on ? '#111' : '#f2f2f2'; g.font = `800 ${Math.max(18, Math.round(22 * P))}px "Chakra Petch", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(t, x + (w || 1) * k / 2 - 3, y + k / 2 - 2); g.textBaseline = 'top';
    };
    touche(x0 + k, y0, inp & E.H, '↑'); touche(x0, y0 + k, inp & E.G, '←'); touche(x0 + k, y0 + k, inp & E.B, '↓'); touche(x0 + 2 * k, y0 + k, inp & E.D, '→');
    touche(x0 + 3.4 * k, y0 + k, inp & E.SAUT, hud.nomSaut || 'saut', 3.8);
    const etat = (bit, i) => touche(x0 + 3.4 * k + i * 1.27 * k, y0, inp & bit, (hud.touches && hud.touches[i]) || '', 1.27, hud.coulEtats && hud.coulEtats[i]);
    etat(E.S, 0); etat(E.L, 1); if (!hud.coulEtats || hud.coulEtats.length > 2) etat(E.Z, 2);
  }
  // panneau
  if (hud.panneau) {
    g.font = `600 ${Math.max(16, Math.round(16 * P))}px "Chakra Petch", sans-serif`; g.textAlign = 'center';
    const lignes = couper(g, hud.panneau, Math.min(LARG - 60, 720));
    const hL = 22 * P, bh = lignes.length * hL + 20, bw = Math.min(LARG - 40, 760), bxx = (LARG - bw) / 2, byy = (hud.tactile ? 124 : 84) * P;
    g.fillStyle = 'rgba(10,8,16,.82)'; arrondi(g, bxx, byy, bw, bh, 10); g.fill();
    g.strokeStyle = th.accent; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = '#f2ead8';
    lignes.forEach((l, i) => g.fillText(l, LARG / 2, byy + 10 + i * hL));
  }
  if (hud.message) {
    g.font = `800 ${Math.round(22 * P)}px "Chakra Petch", sans-serif`; g.textAlign = 'center';
    g.fillStyle = hud.messageC || '#fff'; g.fillText(hud.message, LARG / 2, HAUT * 0.3);
  }
  if (hud.attente) {
    g.font = `600 ${Math.max(16, Math.round(15 * P))}px "Chakra Petch", sans-serif`; g.textAlign = 'center';
    g.globalAlpha = 0.6 + 0.4 * Math.sin(temps * 4);
    g.fillStyle = '#fff'; g.fillText(hud.attente, LARG / 2, HAUT - 46 * P);
    g.globalAlpha = 1;
  }
  g.restore();
}
function couper(g, texte, max) {
  const mots = texte.split(' '), out = [];
  let l = '';
  for (const m of mots) { const t = l ? l + ' ' + m : m; if (g.measureText(t).width > max && l) { out.push(l); l = m; } else l = t; }
  if (l) out.push(l);
  return out;
}

racine.Rendu = { recadrerMenu: () => { camNeuve = true; }, versCase, vue: () => derVue, init, choisirApparence, apercu, apercuAnime, accessibilite, SYMBOLES, preparer, etendre, dessiner, evenements, chrono, ecart, THEMES, COUL_PHASE, redim };
})(window);
