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
const COUL_PHASE = ['#e3cfa8', '#4fb8ff', '#ffe2bf', '#ffe94a'];

let cv, cx, LARG = 0, HAUT = 0, DPR = 1;
let niv = null, th = THEMES.carriere, ZF = 2;
let cam = { x: 0, y: 0, z: 2, vx: 0, vy: 0, avance: 0 }, tremble = 0, flash = 0, flashC = '#fff';
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
    panneau: [], cassant: [], porte: [], bouton: [], rebondi: [], piece: [], lumieres: [] };
  for (let y = 0; y < n.h; y++) for (let x = 0; x < n.w; x++) {
    const k = n.g[y * n.w + x];
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
      case M.REBONDI: dyn.rebondi.push([x, y]); break;
      case M.PIECE: dyn.piece.push([x, y]); dyn.lumieres.push([x, y, '255,210,80', 30]); break;
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
  const N = 64, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d'), img = g.createImageData(N, N);
  const a = hexRvb(th.ombre), b = hexRvb(th.mur), d = hexRvb(th.clair);
  const val = (x, y, f, s) => {           // bruit de valeur raccordable (période N)
    const P = N / f, x0 = Math.floor(x / f), y0 = Math.floor(y / f), u = (x / f) - x0, v = (y / f) - y0;
    const h = (i, j) => alea(((i % P + P) % P) * 57.3 + ((j % P + P) % P) * 131.7 + s);
    const su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
    return (h(x0, y0) * (1 - su) + h(x0 + 1, y0) * su) * (1 - sv) + (h(x0, y0 + 1) * (1 - su) + h(x0 + 1, y0 + 1) * su) * sv;
  };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let n = val(x, y, 16, 1) * 0.5 + val(x, y, 8, 2) * 0.25 + val(x, y, 4, 3) * 0.15 + val(x, y, 2, 4) * 0.1;
    if (th.style === 'brique') { const ly = y % 8 === 7, lx = ((x + (Math.floor(y / 8) % 2) * 8) % 16) === 15; if (ly || lx) n *= 0.45; }
    if (th.style === 'metal') { if (x % 32 === 0 || y % 32 === 0) n *= 0.5; else if (x % 32 === 1 || y % 32 === 1) n = Math.min(1, n * 1.35); n = n * 0.6 + 0.25 + 0.08 * Math.sin(y * 0.9); }
    if (th.style === 'neige') n = n * 0.7 + 0.2;
    if (th.style === 'cristal' && val(x, y, 4, 9) > 0.78) n = 1.15;
    if (th.style === 'veines' && Math.abs(val(x, y, 16, 7) - 0.5) < 0.03) n = 1.25;
    const k = (x + y * N) * 4;
    for (let i = 0; i < 3; i++) {
      const v = n < 0.5 ? a[i] + (b[i] - a[i]) * (n / 0.5) : b[i] + (d[i] - b[i]) * Math.min(1.3, (n - 0.5) / 0.5);
      img.data[k + i] = Math.max(0, Math.min(255, v));
    }
    img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  textures.set(th, c);
  return c;
}
const motifs = new WeakMap();
function motifPour(g) {
  let m = motifs.get(g); if (!m) { m = new Map(); motifs.set(g, m); }
  if (!m.has(th)) m.set(th, g.createPattern(textureDe(th), 'repeat'));
  return m.get(th);
}
function murCase(g, x, y, px, py) {
  const prof = profondeur(x, y);
  const libre = (dx, dy) => !solideR(tuileR(x + dx, y + dy));
  // roche texturée, éclairée par le haut
  g.fillStyle = motifPour(g); g.fillRect(px, py, T, T);
  const gr = g.createLinearGradient(0, py, 0, py + T);
  gr.addColorStop(0, 'rgba(255,255,255,.07)'); gr.addColorStop(1, 'rgba(0,0,0,.12)');
  g.fillStyle = gr; g.fillRect(px, py, T, T);
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
    case 'pierre': if (s < 0.35) { g.fillStyle = '#7c9a4a'; for (let i = 0; i < 3; i++) g.fillRect(px + 3 + i * 4 + s * 3, py - 2 - (i % 2), 1.5, 3); } break;
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
  g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1;
  g.beginPath(); const s = alea(x * 9 + y * 4) * 8; g.moveTo(px + 2 + s, py + 3); g.lineTo(px + 5 + s, py + 11); g.stroke();
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
  for (let i = 0; i < 3; i++) {
    const bx = -8 + i * 5.33;
    const gr = g.createLinearGradient(bx, 0, bx + 5.33, 0);
    gr.addColorStop(0, '#f1f3f8'); gr.addColorStop(0.5, '#b9bfcc'); gr.addColorStop(1, '#6d7383');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(bx, 8); g.lineTo(bx + 2.66, -4); g.lineTo(bx + 5.33, 8); g.closePath(); g.fill();
  }
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-8, 6.5, 16, 1.5);
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
function rebondiCase(g, px, py) {
  const gr = g.createLinearGradient(0, py, 0, py + T);
  gr.addColorStop(0, '#9dff7a'); gr.addColorStop(1, '#3f9a3a');
  g.fillStyle = gr; g.fillRect(px, py + 2, T, T - 2);
  g.fillStyle = '#e8ffd8'; g.fillRect(px + 2, py + 3, T - 4, 2);
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(px, py + T - 3, T, 3);
}

/* ---------- Particules ---------- */
function part(x, y, vx, vy, vie, c, taille, grav, lum) {
  if (parts.length > 700) parts.shift();
  parts.push({ x, y, vx, vy, vie, max: vie, c, t: taille || 2, g: grav === undefined ? 0.1 : grav, lum: !!lum });
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
  if (ev & EV.NAGE) eclats(cxp, cyp, 12, '#bff', 1.6, -0.02);
  if (ev & EV.BOUTON) { eclats(e.evX * T + 8, e.evY * T + 14, 16, '#ffd84a', 2, 0, true); tremble = 2; }
  if (ev & EV.CRAQUE) eclats(e.evX * T + 8, e.evY * T + 2, 6, th.motif, 1, 0.1);
  if (ev & EV.PIECE) eclats(e.evX * T + 8, e.evY * T + 8, 14, '#ffd84a', 2.2, 0, true);
}

/* ---------- Caméra : douce, sans à-coups ---------- */
function suivre(e, hud, vw, vh) {
  // l'avance dans le sens de la course se règle lentement, pour ne pas sauter quand on change de direction
  const visee = Math.max(-1, Math.min(1, e.vx / 4)) * 70;
  cam.avance += (visee - cam.avance) * 0.03;
  const tx = e.x + PW / 2 + cam.avance;
  const ty = e.y + PH / 2 - 14 + Math.max(0, Math.min(36, e.vy * 5));
  if (!hud || hud.recadrer) { cam.x = tx; cam.y = ty; cam.vx = cam.vy = 0; }
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
  const z = zoom();
  cam.z = z;
  const vw = LARG / z, vh = HAUT / z;
  if (niv) suivre(e, hud, vw, vh);
  let ox = cam.x - vw / 2, oy = cam.y - vh / 2;
  if (tremble > 0 && (!hud || hud.tremble !== false)) { ox += (Math.random() - 0.5) * tremble; oy += (Math.random() - 0.5) * tremble; tremble *= 0.85; if (tremble < 0.3) tremble = 0; }
  if (themeDe) { const t2 = themeEn(Math.floor(cam.x / T)); if (t2 !== th) th = t2; }

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
  fleches(g, e, ox, vw);
  if (fantome && !fantome.fini) joueur(g, fantome, 0.32, true);
  if (e.mortT === 0) joueur(g, e, 1, false);
  eauDessus(g, vis);
  // carte de lumière : un voile sombre, percé par chaque source de lumière
  {
    const sombre = th.nuit || 0.38;
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
    if (e.mortT === 0 || !hud) trou(e.x + PW / 2, e.y + PH / 2, hud ? 120 : 260, 1);
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
    g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.t * 0.6, 0, 6.3); g.fill();
  }
  g.globalCompositeOperation = 'source-over';
  for (const p of parts) {
    if (p.lum) continue;
    g.globalAlpha = Math.min(1, p.vie / p.max * 1.5);
    g.fillStyle = p.c; g.fillRect(p.x - p.t / 2, p.y - p.t / 2, p.t, p.t);
  }
  g.globalAlpha = 1;
  ambiance(g, ox, oy, vw, vh);
  g.restore();

  if (flash > 0) { g.globalAlpha = flash; g.fillStyle = flashC; g.fillRect(0, 0, LARG, HAUT); g.globalAlpha = 1; flash *= 0.85; if (flash < 0.02) flash = 0; }
  // vignette colorée
  const vg = g.createRadialGradient(LARG / 2, HAUT / 2, Math.min(LARG, HAUT) * 0.38, LARG / 2, HAUT / 2, Math.max(LARG, HAUT) * 0.78);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)');
  g.fillStyle = vg; g.fillRect(0, 0, LARG, HAUT);
  interfaceJeu(g, e, hud);
}

/* ---------- Arrière-plan en couches (parallaxe) ---------- */
const couches = new Map();
function arrierePlan(g, ox, oy, z, enJeu) {
  const gr = g.createLinearGradient(0, 0, 0, HAUT);
  gr.addColorStop(0, th.ciel[0]); gr.addColorStop(1, th.ciel[1]);
  g.fillStyle = gr; g.fillRect(0, 0, LARG, HAUT);
  const id = th.style + th.nom;
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
  // brume au sol
  const br = g.createLinearGradient(0, HAUT * 0.55, 0, HAUT);
  br.addColorStop(0, 'rgba(0,0,0,0)'); br.addColorStop(1, `rgba(${th.lum},.06)`);
  g.fillStyle = br; g.fillRect(0, HAUT * 0.55, LARG, HAUT * 0.45);
  if (enJeu && th.style === 'cristal' && Math.sin(temps * 0.9) > 0.993) { flash = Math.max(flash, 0.12); flashC = '#e6dcff'; }
}
// particules d'ambiance dessinées dans le monde
function ambiance(g, ox, oy, vw, vh) {
  const n = 40;
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
    const px = x * T + (c ? (Math.random() - 0.5) * 2 * sec : 0), py = y * T;
    g.fillStyle = '#7a5532'; g.fillRect(px, py, T, 6);
    g.fillStyle = '#a77a4a'; g.fillRect(px, py, T, 2);
    g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(px + 7, py + 1, 1, 5);
    g.fillStyle = '#5b3e24'; g.fillRect(px + 2, py + 6, 2, 4); g.fillRect(px + T - 4, py + 6, 2, 4);
    if (sec > 0) { g.fillStyle = `rgba(255,80,60,${sec * 0.5})`; g.fillRect(px, py, T, 6); }
  }
  for (const [x, y] of dyn.porte) {
    if (!vis(x, y)) continue;
    const b = niv.porteDe.get(x * 1024 + y), ouvert = b !== undefined && e.boutons.indexOf(b) >= 0;
    const px = x * T, py = y * T;
    if (ouvert) { g.fillStyle = 'rgba(255,216,74,.12)'; g.fillRect(px + 6, py, 4, 3); continue; }
    g.fillStyle = '#2c2f36'; g.fillRect(px + 2, py, T - 4, T);
    g.fillStyle = '#8b93a1'; for (let i = 0; i < 3; i++) g.fillRect(px + 3 + i * 4, py, 2, T);
    g.fillStyle = '#ffd84a'; g.fillRect(px + 2, py + 7, T - 4, 2);
  }
  for (const [x, y] of dyn.bouton) {
    if (!vis(x, y)) continue;
    const appui = e.boutons.indexOf(x * 1024 + y) >= 0;
    const px = x * T, py = y * T;
    g.fillStyle = '#3a3a40'; g.fillRect(px + 1, py + T - 3, T - 2, 3);
    g.fillStyle = appui ? '#7dff9a' : '#ff5a4a'; g.fillRect(px + 3, py + T - (appui ? 4 : 7), T - 6, appui ? 1.5 : 4);
    if (!appui) { g.globalAlpha = 0.4 + 0.3 * Math.sin(tt * 6); g.fillStyle = '#ff5a4a'; g.beginPath(); g.arc(px + 8, py + T - 6, 7, 0, 7); g.fill(); g.globalAlpha = 1; }
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
    g.fillStyle = '#2a0c04'; g.fillRect(px + 1, py + T - 4, T - 2, 4);
    for (let i = 0; i < 5; i++) {
      const h = 9 + 5 * Math.sin(tt * 13 + i * 1.7 + x);
      g.fillStyle = ['#ff5a14', '#ff8a1a', '#ffd040', '#ff8a1a', '#ff5a14'][i];
      g.beginPath(); g.moveTo(px + i * 3, py + T - 3); g.quadraticCurveTo(px + 1.5 + i * 3, py + T - 3 - h, px + 4 + i * 3, py + T - 3); g.fill();
    }
    if (Math.random() < 0.1) part(px + Math.random() * T, py + 4, (Math.random() - 0.5) * 0.4, -0.9, 30, '#ffb040', 1.5, -0.01, true);
  }
  for (const [x, y] of dyn.ressort) {
    if (!vis(x, y)) continue;
    const px = x * T, py = y * T;
    g.strokeStyle = '#c9ffb8'; g.lineWidth = 1.5; g.beginPath();
    for (let i = 0; i < 4; i++) { g.moveTo(px + 3, py + 15 - i * 2.2); g.lineTo(px + 13, py + 14 - i * 2.2); }
    g.stroke();
    g.fillStyle = '#4fd46a'; g.fillRect(px + 1, py + 5, T - 2, 3); g.fillStyle = '#e6ffe8'; g.fillRect(px + 1, py + 5, T - 2, 1);
  }
  for (const [x, y] of dyn.cristal) {
    if (!vis(x, y)) continue;
    const i = x * 1024 + y, pris = e.cristaux.some(c => c[0] === i);
    const px = x * T + 8, py = y * T + 8 + Math.sin(tt * 3 + x) * 1.5;
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
  for (const [x, y] of dyn.piece) {
    if (!vis(x, y) || e.pieces.indexOf(x * 1024 + y) >= 0) continue;
    const px = x * T + 8, py = y * T + 8 + Math.sin(tt * 3 + x) * 1.5, l = Math.abs(Math.cos(tt * 3 + x * 0.7));
    g.fillStyle = '#b8860b'; g.beginPath(); g.ellipse(px, py, 5 * l + 1, 5, 0, 0, 7); g.fill();
    g.fillStyle = '#ffd84a'; g.beginPath(); g.ellipse(px, py, 4 * l + 0.6, 4, 0, 0, 7); g.fill();
    g.fillStyle = '#fff6c0'; g.fillRect(px - 0.6, py - 2.5, 1.2, 3);
  }
  for (const [x, y] of dyn.eclat) {
    if (!vis(x, y) || e.eclat) continue;
    const px = x * T + 8, py = y * T + 8 + Math.sin(tt * 2.5) * 2;
    g.save(); g.translate(px, py); g.rotate(Math.sin(tt * 2) * 0.4);
    g.fillStyle = '#ff7ae0'; g.beginPath();
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.lineTo(Math.cos(a) * (i % 2 ? 3 : 7), Math.sin(a) * (i % 2 ? 3 : 7)); }
    g.fill(); g.fillStyle = '#fff'; g.fillRect(-1, -3, 2, 2); g.restore();
  }
}
// flèches des arbalètes, calculées comme dans le moteur
function fleches(g, e, ox, vw) {
  if (!niv.fleches || !niv.fleches.length) return;
  g.save();
  for (const f of niv.fleches) {
    if (f.x * T < ox - 400 || f.x * T > ox + vw + 400) continue;
    for (const [ax, ay] of M.flechesEn(niv, e.temps, f)) {
      g.save(); g.translate(ax, ay); g.rotate(Math.atan2(f.dy, f.dx));
      g.fillStyle = '#e8d2a6'; g.fillRect(-7, -0.8, 12, 1.6);
      g.fillStyle = '#d0d4dc'; g.beginPath(); g.moveTo(8, 0); g.lineTo(4, -2.5); g.lineTo(4, 2.5); g.fill();
      g.fillStyle = '#ff5a5a'; g.fillRect(-8, -2, 3, 1.2); g.fillRect(-8, 0.8, 3, 1.2);
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
    g.fillStyle = 'rgba(30,150,210,.4)'; g.fillRect(px, py, T, T);
    // reflets mouvants (caustiques)
    const c1 = Math.sin(x * 1.3 + temps * 2.1) + Math.sin(y * 1.7 - temps * 1.6);
    if (c1 > 1.2) { g.fillStyle = `rgba(190,245,255,${(c1 - 1.2) * 0.18})`; g.fillRect(px + (Math.sin(temps + y) * 4 + 4), py + 4, 8, 1.5); }
    if (surf) {
      const o = Math.sin(temps * 3 + x * 0.8) * 1.5;
      g.fillStyle = 'rgba(200,245,255,.75)'; g.fillRect(px, py + 2 + o, T, 1.5);
      g.fillStyle = 'rgba(40,160,220,.25)'; g.fillRect(px, py, T, 2 + o);
    } else if (alea(x * 5 + y * 11 + Math.floor(temps * 2)) < 0.03) part(px + 8, py + 8, 0, -0.4, 40, 'rgba(200,250,255,.6)', 1.5, -0.005);
  }
}

/* ---------- Le joueur selon son état (sans traînée) ---------- */
function joueur(g, e, alpha, fantome) {
  const x = e.x, y = e.y, cxp = x + PW / 2, cyp = y + PH / 2;
  const c = COUL_PHASE[e.phase];
  g.globalAlpha = alpha;
  if (fantome) {
    g.fillStyle = c; arrondi(g, x, y, PW, PH, e.phase === M.S ? 3 : 6); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 1; g.stroke();
    g.globalAlpha = 1; return;
  }
  // ombre portée au sol
  if (e.sol) { g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(cxp, y + PH + 0.5, 7, 1.6, 0, 0, 7); g.fill(); }
  if (e.phase === M.S) {
    let sx = 1, sy = 1;
    if (e.slam) { sx = 0.8; sy = 1.2; } else if (!e.sol) { sx = 0.92; sy = 1.08; } else if (Math.abs(e.vx) > 2) { sx = 1.05; sy = 0.96; }
    const w = PW * sx, h = PH * sy;
    g.fillStyle = '#2b2116'; arrondi(g, cxp - w / 2 - 1, y + PH - h - 1, w + 2, h + 2, 4); g.fill();
    const gr = g.createLinearGradient(0, y + PH - h, 0, y + PH);
    gr.addColorStop(0, '#f6e6c4'); gr.addColorStop(1, '#b89a6a');
    g.fillStyle = gr; arrondi(g, cxp - w / 2, y + PH - h, w, h, 3); g.fill();
    g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(cxp - w / 2 + 2, y + PH - h + 1.5, w - 6, 1.2);
    yeux(g, cxp + e.face * 1.5, y + PH - h + 4.5, e.face, '#2a2018');
  } else if (e.phase === M.L) {
    const t = temps * 8;
    g.fillStyle = '#0f4c7a';
    const forme = () => {
      g.beginPath();
      if (e.att === 1 || e.att === 2) { const sd = e.att === 1 ? -1 : 1; g.ellipse(cxp + sd * 2, cyp, 5, 7.5 + Math.sin(t) * 0.6, 0, 0, 7); }
      else if (e.att === 3) g.ellipse(cxp, cyp - 2, 7.5 + Math.sin(t) * 0.6, 5, 0, 0, 7);
      else if (e.sol) g.ellipse(cxp, y + PH - 4.5, 8 + Math.min(2, Math.abs(e.vx) * 0.4), 5, 0, 0, 7);
      else { g.moveTo(cxp, y - 2); g.quadraticCurveTo(cxp + 8, cyp + 2, cxp, y + PH + 0.5); g.quadraticCurveTo(cxp - 8, cyp + 2, cxp, y - 2); }
    };
    g.lineWidth = 2; g.strokeStyle = '#0b2f4d'; forme(); g.stroke();
    const gr = g.createRadialGradient(cxp - 2, cyp - 2, 1, cxp, cyp, 9);
    gr.addColorStop(0, '#b9e8ff'); gr.addColorStop(1, '#2a8ad8');
    g.fillStyle = gr; forme(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(cxp - 2.5, cyp - 1.5, 1.4, 0, 7); g.fill();
    yeux(g, cxp + e.face, cyp, e.face, '#06243a');
  } else if (e.phase === M.Z) {
    const r = e.gaz / M.K.zDuree;
    g.globalAlpha = alpha * (0.5 + 0.5 * r);
    for (let i = 0; i < 6; i++) {
      const a = temps * 3 + i * 1.05;
      const gr = g.createRadialGradient(cxp + Math.cos(a) * 3.5, cyp + Math.sin(a) * 2.5, 0, cxp + Math.cos(a) * 3.5, cyp + Math.sin(a) * 2.5, 5);
      gr.addColorStop(0, '#fff6ea'); gr.addColorStop(1, 'rgba(255,200,150,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(cxp + Math.cos(a) * 3.5, cyp + Math.sin(a) * 2.5, 5, 0, 7); g.fill();
    }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(cxp, cyp, 4, 0, 7); g.fill();
    g.globalAlpha = alpha;
    yeux(g, cxp + e.face, cyp, e.face, '#6a3a20');
    // jauge de vapeur autour
    g.strokeStyle = 'rgba(255,170,80,.8)'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(cxp, cyp, 10, -Math.PI / 2, -Math.PI / 2 + r * Math.PI * 2); g.stroke();
    if (Math.random() < 0.3) part(cxp + (Math.random() - 0.5) * 8, cyp + 4, (Math.random() - 0.5) * 0.3, 0.2, 18, 'rgba(255,230,200,.5)', 2, -0.02);
  } else {
    g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(cxp, cyp, 0, cxp, cyp, 14);
    gr.addColorStop(0, 'rgba(255,250,180,.9)'); gr.addColorStop(1, 'rgba(255,220,60,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(cxp, cyp, 14, 0, 7); g.fill();
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#fff'; g.beginPath(); g.arc(cxp, cyp, 5, 0, 7); g.fill();
    g.strokeStyle = c; g.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      g.beginPath(); let a = Math.random() * 7, px = cxp, py = cyp; g.moveTo(px, py);
      for (let k = 0; k < 3; k++) { px += Math.cos(a) * 4; py += Math.sin(a) * 4; a += (Math.random() - 0.5) * 1.6; g.lineTo(px, py); }
      g.stroke();
    }
  }
  g.globalAlpha = 1;
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
    const lc = g.measureText(chrono(hud.chrono)).width + 36 * P;
    g.fillStyle = 'rgba(8,6,14,.55)'; arrondi(g, LARG / 2 - lc / 2, 8 * P, lc, (hud.sousChrono ? 68 : 48) * P, 12 * P); g.fill();
    const nl = (hud.lignes ? hud.lignes.length : 0) + 1;
    g.fillStyle = 'rgba(8,6,14,.45)'; arrondi(g, 8, 8 * P, 250 * P, (14 + nl * 18) * P, 10 * P); g.fill();
    if (hud.droite && hud.droite.length) { arrondi(g, LARG - 8 - 190 * P, 8 * P, 190 * P, (16 + (hud.droite.length + 1) * 18) * P, 10 * P); g.fill(); }
  }
  g.fillStyle = 'rgba(0,0,0,.55)'; g.fillText(chrono(hud.chrono), LARG / 2 + 2, 14 * P + 2);
  g.fillStyle = hud.couleurChrono || '#fff'; g.fillText(chrono(hud.chrono), LARG / 2, 14 * P);
  if (hud.sousChrono) {
    g.font = `600 ${Math.round(15 * P)}px "Chakra Petch", monospace`;
    g.fillStyle = hud.sousCouleur || '#bbb'; g.fillText(hud.sousChrono, LARG / 2, 54 * P);
  }
  // nom du niveau
  g.textAlign = 'left';
  g.font = `700 ${Math.round(16 * P)}px "Chakra Petch", sans-serif`;
  g.fillStyle = th.accent; g.fillText(hud.titre || '', 16, 14 * P);
  g.font = `500 ${Math.round(13 * P)}px "Chakra Petch", sans-serif`;
  g.fillStyle = '#ccc';
  if (hud.lignes) hud.lignes.forEach((l, i) => { g.fillStyle = l.c || '#ccc'; g.fillText(l.t, 16, (36 + i * 18) * P); });
  // morts
  g.textAlign = 'right';
  g.fillStyle = '#ccc'; g.fillText('☠ ' + e.morts, LARG - 16, 14 * P);
  if (hud.droite) hud.droite.forEach((l, i) => {
    g.fillStyle = l.c || '#aaa'; g.font = `${l.gras ? 700 : 500} ${Math.round(13 * P)}px "Chakra Petch", monospace`;
    g.fillText(l.t, LARG - 16, (36 + i * 18) * P);
  });
  // états + charges (bas gauche)
  const n = niv;
  const ph = [M.S, M.L, M.Z, M.P].filter(p => n && (n.phases & (1 << p)));
  const taille = 34 * P;
  let bx = 16, by = HAUT - taille - 18 * P;
  if (hud.tactile) { bx = LARG / 2 - (ph.length * (taille + 8) + 46 * P) / 2; by = (hud.sousChrono ? 80 : 62) * P; }   // en tactile : en haut, loin des pouces
  g.textAlign = 'center';
  ph.forEach((p, i) => {
    const x = bx + i * (taille + 8);
    const actif = e.phase === p;
    g.fillStyle = actif ? COUL_PHASE[p] : 'rgba(255,255,255,.08)';
    g.globalAlpha = actif ? 1 : 0.9;
    arrondi(g, x, by, taille, taille, 6); g.fill();
    g.strokeStyle = COUL_PHASE[p]; g.lineWidth = 2; g.stroke();
    g.fillStyle = actif ? '#111' : COUL_PHASE[p];
    g.font = `800 ${Math.round(15 * P)}px "Chakra Petch", sans-serif`;
    g.fillText((hud.touches && hud.touches[p]) || '', x + taille / 2, by + 5 * P);
    g.font = `600 ${Math.round(9 * P)}px "Chakra Petch", sans-serif`;
    g.fillText(((hud.nomsPhases && hud.nomsPhases[p]) || M.NOMS_PHASES[p]).toUpperCase(), x + taille / 2, by + taille - 13 * P);
    if (p === M.Z && e.phase === M.Z) { g.fillStyle = '#ff9a40'; g.fillRect(x + 3, by + taille + 3, (taille - 6) * e.gaz / M.K.zDuree, 3); }
  });
  g.globalAlpha = 1;
  if (ph.length > 1) {
    const cxh = bx + ph.length * (taille + 8) + 10;
    for (let i = 0; i < M.K.charges; i++) {
      const plein = i < e.charges;
      g.fillStyle = plein ? '#7dfcff' : 'rgba(255,255,255,.12)';
      g.beginPath(); const px = cxh + i * 18 * P + 6, py = by + taille / 2;
      g.moveTo(px, py - 8 * P); g.lineTo(px + 6 * P, py); g.lineTo(px, py + 8 * P); g.lineTo(px - 6 * P, py); g.fill();
    }
    if (hud.echec > 0) { g.fillStyle = `rgba(255,60,80,${hud.echec / 20})`; g.fillRect(cxh - 4, by + taille / 2 - 12 * P, 40 * P, 24 * P); }
  }
  // éclat
  if (n && n.aEclat) {
    g.font = `700 ${Math.round(18 * P)}px sans-serif`; g.textAlign = 'right';
    g.fillStyle = e.eclat ? '#ff7ae0' : 'rgba(255,255,255,.2)'; g.fillText('◆', LARG - 16, HAUT - 40 * P);
  }
  // entrées affichées
  if (hud.entrees != null) {
    const inp = hud.entrees, E = M.E;
    const k = 16 * P, x0 = LARG - 16 - k * 3 - 120 * P, y0 = HAUT - k * 2 - 18 * P;
    const touche = (x, y, on, t, w) => { g.fillStyle = on ? '#fff' : 'rgba(255,255,255,.12)'; g.fillRect(x, y, (w || 1) * k - 2, k - 2); g.fillStyle = on ? '#111' : '#888'; g.font = `700 ${Math.round(10 * P)}px sans-serif`; g.textAlign = 'center'; g.fillText(t, x + (w || 1) * k / 2 - 1, y + 3 * P); };
    touche(x0 + k, y0, inp & E.H, '↑'); touche(x0, y0 + k, inp & E.G, '←'); touche(x0 + k, y0 + k, inp & E.B, '↓'); touche(x0 + 2 * k, y0 + k, inp & E.D, '→');
    touche(x0 + 3.5 * k, y0 + k, inp & E.SAUT, 'saut', 3);
  }
  // panneau
  if (hud.panneau) {
    g.font = `600 ${Math.round(16 * P)}px "Chakra Petch", sans-serif`; g.textAlign = 'center';
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
    g.font = `600 ${Math.round(15 * P)}px "Chakra Petch", sans-serif`; g.textAlign = 'center';
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

racine.Rendu = { init, preparer, etendre, dessiner, evenements, chrono, ecart, THEMES, COUL_PHASE, redim };
})(window);
