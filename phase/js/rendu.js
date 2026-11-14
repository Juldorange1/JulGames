/* Phase — rendu (Canvas 2D) : décor par zone, cases animées, joueur selon son état, particules, interface en jeu. */
(function (racine) {
'use strict';
const M = racine.Moteur;
const T = M.T, PW = M.W, PH = M.H;

const THEMES = {
  carriere: { ciel: ['#3a2618', '#140c07'], mur: '#7d5b3c', bord: '#d3a36a', ombre: '#3b2817', motif: '#94704c', loin: '#4a3220', accent: '#ffb35a', nom: 'Carrière' },
  aqueduc: { ciel: ['#10284a', '#050c18'], mur: '#3f5d78', bord: '#9fd0f0', ombre: '#1d2e3f', motif: '#4f7090', loin: '#1a3554', accent: '#5ec8ff', nom: 'Aqueduc' },
  chaufferie: { ciel: ['#3d1209', '#120302'], mur: '#5b2e22', bord: '#ff8a4a', ombre: '#2a110b', motif: '#6e3a2b', loin: '#4a1a0e', accent: '#ff7a2f', nom: 'Chaufferie' },
  orage: { ciel: ['#1e1446', '#06041a'], mur: '#3a3168', bord: '#c3a2ff', ombre: '#1a1536', motif: '#463c7c', loin: '#241b52', accent: '#ffe35a', nom: 'Orage' },
  abysses: { ciel: ['#04303a', '#010a10'], mur: '#1d4b50', bord: '#5ff0dc', ombre: '#0b2326', motif: '#255b60', loin: '#0b3a42', accent: '#5ff0dc', nom: 'Abysses' },
  usine: { ciel: ['#262a31', '#0b0c0f'], mur: '#4b5159', bord: '#d7dee6', ombre: '#22262b', motif: '#5a6169', loin: '#30353c', accent: '#ffc83a', nom: 'Usine' },
  glacier: { ciel: ['#24456a', '#0a1426'], mur: '#5f81a3', bord: '#effbff', ombre: '#2c4258', motif: '#7096bb', loin: '#36597d', accent: '#bff4ff', nom: 'Glacier' },
  coeur: { ciel: ['#2a0828', '#050109'], mur: '#3b1239', bord: '#ff6ad5', ombre: '#1a0619', motif: '#4c1a4a', loin: '#3a0d38', accent: '#ff6ad5', nom: 'Cœur' }
};
const COUL_PHASE = ['#d9c6a5', '#4fb8ff', '#ffd9b0', '#ffe94a'];

let cv, cx, LARG = 0, HAUT = 0, DPR = 1;
let niv = null, th = THEMES.carriere, fond = null, ZF = 2;
let cam = { x: 0, y: 0, z: 2 }, tremble = 0, flash = 0, flashC = '#fff';
let dyn = null;           // cases animées par type
let parts = [];
let temps = 0;
let decor = [];

function init(canvas) {
  cv = canvas; cx = cv.getContext('2d');
  redim(); addEventListener('resize', redim);
}
function redim() {
  DPR = Math.min(2, devicePixelRatio || 1);
  LARG = innerWidth; HAUT = innerHeight;
  cv.width = Math.round(LARG * DPR); cv.height = Math.round(HAUT * DPR);
  cv.style.width = LARG + 'px'; cv.style.height = HAUT + 'px';
}
function zoom() { return Math.max(1, Math.min(LARG / (34 * T), HAUT / (19 * T))); }

function alea(s) { let x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

/* ---------- Préparation d'un niveau : décor fixe dessiné une fois ---------- */
// themeId : nom du thème, ou fonction x(en cases) -> nom du thème (mode infini, le décor change par régions)
let themeDe = null, morceaux = new Map();
const MORC = 48;   // le décor fixe est dessiné par morceaux de 48 colonnes, à la demande
function preparer(n, themeId) {
  niv = n;
  themeDe = typeof themeId === 'function' ? themeId : null;
  th = THEMES[themeDe ? themeDe(0) : themeId] || THEMES.carriere;
  themeFixe = th;
  parts = [];
  morceaux = new Map();
  scanner();
  decor = [];
  for (let i = 0; i < 60; i++) decor.push({ x: alea(i * 3.1) * 2400, y: alea(i * 7.7) * n.h * T, s: 0.3 + alea(i * 1.3) * 0.5, k: alea(i * 5.9), r: 20 + alea(i * 9.1) * 90 });
}
let themeFixe = THEMES.carriere;
function themeEn(x) { return themeDe ? (THEMES[themeDe(x)] || THEMES.carriere) : themeFixe; }
// le niveau s'est allongé (mode infini) : on refait la liste des cases animées et le dernier morceau
function etendre(n, ancienW) {
  niv = n;
  scanner();
  for (const k of [...morceaux.keys()]) if ((k + 1) * MORC >= ancienW - 2) morceaux.delete(k);
}
const tuileR = (x, y) => (x < 0 || x >= niv.w || y < 0) ? M.MUR : (y >= niv.h ? M.VIDE : niv.g[y * niv.w + x]);
const solideR = (k) => k === M.MUR || k === M.GLACE || k === M.TAPIS_G || k === M.TAPIS_D || k === M.FRAGILE;
function scanner() {
  const n = niv;
  dyn = { fragile: [], cristal: [], feu: [], eau: [], vent: [], ressort: [], but: [], drapeau: [], tapis: [], tp: [], eclat: [], panneau: [] };
  for (let y = 0; y < n.h; y++) for (let x = 0; x < n.w; x++) {
    const k = n.g[y * n.w + x];
    switch (k) {
      case M.TAPIS_G: case M.TAPIS_D: dyn.tapis.push([x, y, k === M.TAPIS_G ? -1 : 1]); break;
      case M.FRAGILE: dyn.fragile.push([x, y]); break;
      case M.CRISTAL: dyn.cristal.push([x, y]); break;
      case M.FEU: dyn.feu.push([x, y]); break;
      case M.EAU: dyn.eau.push([x, y, tuileR(x, y - 1) !== M.EAU && !solideR(tuileR(x, y - 1))]); break;
      case M.VENT_D: case M.VENT_G: case M.VENT_H: case M.VENT_B: dyn.vent.push([x, y, k]); break;
      case M.RESSORT: dyn.ressort.push([x, y]); break;
      case M.BUT: dyn.but.push([x, y]); break;
      case M.DRAPEAU: dyn.drapeau.push([x, y]); break;
      case M.TP1: case M.TP2: case M.TP1S: case M.TP2S: dyn.tp.push([x, y, k]); break;
      case M.ECLAT: dyn.eclat.push([x, y]); break;
      case M.PANNEAU: dyn.panneau.push([x, y]); break;
    }
  }
}
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
        case M.MUR: murCase(g, x, y, px, py, tuileR, solideR); break;
        case M.GLACE: glaceCase(g, x, y, px, py, tuileR, solideR); break;
        case M.GRILLE: grilleCase(g, px, py); break;
        case M.TAMIS: tamisCase(g, px, py); break;
        case M.PICS: picsCase(g, x, y, px, py, tuileR, solideR); break;
        case M.PLATE: g.fillStyle = th.ombre; g.fillRect(px, py, T, 5); g.fillStyle = th.bord; g.fillRect(px, py, T, 2);
          g.fillStyle = th.motif; g.fillRect(px + 2, py + 5, 2, 3); g.fillRect(px + T - 4, py + 5, 2, 3); break;
        case M.TAPIS_G: case M.TAPIS_D: g.fillStyle = '#23262b'; g.fillRect(px, py, T, T); g.fillStyle = '#3c4148'; g.fillRect(px, py + 3, T, T - 6); break;
        case M.PANNEAU: panneauCase(g, px, py); break;
      }
    }
  }
  th = garde;
  morceaux.set(k, c);
  return c;
}

function murCase(g, x, y, px, py, t, solide) {
  g.fillStyle = th.mur; g.fillRect(px, py, T, T);
  const s = alea(x * 31 + y * 17);
  g.fillStyle = th.motif;
  if (s < 0.5) { g.fillRect(px + 2 + (s * 20 | 0) % 8, py + 4 + (s * 40 | 0) % 7, 3, 2); }
  g.fillStyle = th.ombre;
  if (alea(x * 7 + y * 3) < 0.4) g.fillRect(px + 9, py + 10, 2, 2);
  const libre = (k) => !solide(k);
  // profondeur : plus on est loin du vide, plus la roche est sombre
  let prof = 3;
  for (let r = 1; r <= 3 && prof === 3; r++)
    for (let dy = -r; dy <= r && prof === 3; dy++) for (let dx = -r; dx <= r; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= niv.w || yy >= niv.h) continue;
      if (libre(t(xx, yy))) { prof = r - 1; break; }
    }
  if (prof > 0) { g.fillStyle = `rgba(0,0,0,${[0, 0.28, 0.48, 0.62][prof]})`; g.fillRect(px, py, T, T); }
  if (libre(t(x, y + 1))) { g.fillStyle = th.ombre; g.fillRect(px, py + T - 3, T, 3); }
  if (libre(t(x - 1, y))) { g.fillStyle = th.ombre; g.fillRect(px, py, 2, T); }
  if (libre(t(x + 1, y))) { g.fillStyle = th.ombre; g.fillRect(px + T - 2, py, 2, T); }
  if (libre(t(x, y - 1))) {
    g.fillStyle = th.bord; g.fillRect(px, py, T, 3);
    g.fillStyle = th.motif; g.fillRect(px, py + 3, T, 1);
    if (alea(x * 13 + y) < 0.35) { g.fillStyle = th.bord; g.fillRect(px + (alea(x) * 12 | 0), py - 2, 2, 2); }
  }
}
function glaceCase(g, x, y, px, py, t, solide) {
  g.fillStyle = '#9fd8f2'; g.fillRect(px, py, T, T);
  let prof = 3;
  for (let r = 1; r <= 3 && prof === 3; r++)
    for (let dy = -r; dy <= r && prof === 3; dy++) for (let dx = -r; dx <= r; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= niv.w || yy >= niv.h) continue;
      if (!solide(t(xx, yy))) { prof = r - 1; break; }
    }
  if (prof > 0) { g.fillStyle = `rgba(20,40,70,${[0, 0.3, 0.5, 0.65][prof]})`; g.fillRect(px, py, T, T); return; }
  g.fillStyle = '#c9f0ff'; g.fillRect(px + 2, py + 2, 5, 2); g.fillRect(px + 9, py + 9, 4, 2);
  g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(px + 3 + (alea(x + y * 9) * 8 | 0), py + 5, 1, 6);
  if (!solide(t(x, y - 1))) { g.fillStyle = '#f2fdff'; g.fillRect(px, py, T, 2); }
  if (!solide(t(x, y + 1))) { g.fillStyle = '#6aa6c6'; g.fillRect(px, py + T - 2, T, 2); }
}
function grilleCase(g, px, py) {
  g.fillStyle = 'rgba(160,190,210,.18)'; g.fillRect(px, py, T, T);
  g.strokeStyle = '#8fb3c9'; g.lineWidth = 1.2;
  g.beginPath();
  for (let i = 2; i < T; i += 4) { g.moveTo(px + i, py); g.lineTo(px + i, py + T); g.moveTo(px, py + i); g.lineTo(px + T, py + i); }
  g.stroke();
  g.strokeStyle = '#d6ecf7'; g.strokeRect(px + 0.5, py + 0.5, T - 1, T - 1);
}
function tamisCase(g, px, py) {
  g.fillStyle = 'rgba(255,190,140,.16)'; g.fillRect(px, py, T, T);
  g.fillStyle = '#ffcfa0';
  for (let j = 1; j < T; j += 3) for (let i = (j % 2) + 1; i < T; i += 3) g.fillRect(px + i, py + j, 1, 1);
  g.strokeStyle = 'rgba(255,207,160,.7)'; g.lineWidth = 1; g.strokeRect(px + 0.5, py + 0.5, T - 1, T - 1);
}
function picsCase(g, x, y, px, py, t, solide) {
  let dir = 0; // 0 haut, 1 bas, 2 droite, 3 gauche
  if (solide(t(x, y + 1))) dir = 0; else if (solide(t(x, y - 1))) dir = 1; else if (solide(t(x - 1, y))) dir = 2; else if (solide(t(x + 1, y))) dir = 3;
  g.save(); g.translate(px + T / 2, py + T / 2); g.rotate([0, Math.PI, Math.PI / 2, -Math.PI / 2][dir]);
  g.fillStyle = '#c8ccd6'; g.strokeStyle = '#5a5f6a'; g.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const bx = -8 + i * 5.33;
    g.beginPath(); g.moveTo(bx, 8); g.lineTo(bx + 2.66, -4); g.lineTo(bx + 5.33, 8); g.closePath(); g.fill(); g.stroke();
  }
  g.restore();
}
function panneauCase(g, px, py) {
  g.fillStyle = '#5b3d22'; g.fillRect(px + 7, py + 8, 2, 8);
  g.fillStyle = '#e8d6b0'; g.fillRect(px + 2, py + 2, 12, 8);
  g.fillStyle = '#5b3d22'; g.fillRect(px + 7, py + 3, 2, 4); g.fillRect(px + 7, py + 8, 2, 1);
}

/* ---------- Particules ---------- */
function part(x, y, vx, vy, vie, c, taille, grav) { parts.push({ x, y, vx, vy, vie, max: vie, c, t: taille || 2, g: grav === undefined ? 0.1 : grav }); }
function eclats(x, y, n, c, force, grav) {
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, f = Math.random() * (force || 2); part(x, y, Math.cos(a) * f, Math.sin(a) * f, 20 + Math.random() * 25, c, 1.5 + Math.random() * 2, grav); }
}

function evenements(e, n) {
  const ev = e.ev, cxp = e.x + PW / 2, cyp = e.y + PH / 2;
  if (!ev) return;
  const EV = M.EV;
  if (ev & EV.MORT) { eclats(e.evX, e.evY, 40, COUL_PHASE[e.phase], 3.5); tremble = 8; flash = 0.35; flashC = '#ff3050'; }
  if (ev & EV.SAUT) eclats(cxp, e.y + PH, 6, th.bord, 1, 0.05);
  if (ev & EV.REBOND) { eclats(cxp, e.y + PH, 18, '#fff', 2.5, 0.05); tremble = 3; }
  if (ev & EV.MUR) eclats(e.evX < 0 ? e.x + PW : e.x, cyp, 6, th.bord, 1.2, 0.05);
  if (ev & EV.ATTERRIT) eclats(cxp, e.y + PH, 4, th.motif, 0.8, 0.05);
  if (ev & EV.CHANGE) eclats(cxp, cyp, 14, COUL_PHASE[e.phase], 2, 0);
  if (ev & EV.CASSE) { eclats(e.evX * T + 8, e.evY * T + 8, 18, th.motif, 3); tremble = Math.max(tremble, 4); }
  if (ev & EV.RESSORT) eclats(e.evX * T + 8, e.evY * T + 12, 10, '#9effa0', 2);
  if (ev & EV.BOUM) { eclats(e.evX * T + 8, e.evY * T + 8, 40, '#ffb040', 4.5, 0.02); tremble = 9; flash = 0.25; flashC = '#ffa030'; }
  if (ev & EV.EVAPORE) eclats(cxp, cyp, 24, '#fff', 2, -0.05);
  if (ev & EV.CRISTAL) { eclats(e.evX * T + 8, e.evY * T + 8, 16, '#7dfcff', 2.5, 0); }
  if (ev & EV.ECLAT) { eclats(e.evX * T + 8, e.evY * T + 8, 30, '#ff7ae0', 3, 0); flash = 0.2; flashC = '#ff7ae0'; }
  if (ev & EV.DRAPEAU) eclats(e.evX * T + 8, e.evY * T + 4, 14, '#7dff9a', 2);
  if (ev & EV.TP) { eclats(e.evX, e.evY, 16, '#c08bff', 2.5, 0); eclats(cxp, cyp, 16, '#c08bff', 2.5, 0); }
  if (ev & EV.FIN) { eclats(cxp, cyp, 60, th.accent, 4, 0); flash = 0.4; flashC = '#fff'; }
  if (ev & EV.FRACAS) eclats(cxp, e.y, 8, '#fff', 1.5, -0.05);
  if (ev & EV.CONVERSION) eclats(cxp, cyp, 10, '#bfe8ff', 2, 0);
  if (ev & EV.JET) eclats(cxp, cyp, 10, '#4fb8ff', 2, 0.1);
  if (ev & EV.NAGE) eclats(cxp, cyp, 10, '#bff', 1.5, -0.02);
}

/* ---------- Dessin d'une image ---------- */
// e : état du joueur ; fantome : état fantôme ou null ; hud : infos d'interface
function dessiner(e, fantome, hud, dt) {
  temps += dt || 1 / 60;
  const g = cx;
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  const z = zoom();
  cam.z = z;
  const vw = LARG / z, vh = HAUT / z;
  if (niv) {
    const tx = e.x + PW / 2 + Math.max(-90, Math.min(90, e.vx * 22)), ty = e.y + PH / 2 + Math.max(-30, Math.min(40, e.vy * 6)) - 10;
    if (!hud || hud.recadrer) { if (!hud) { cam.x += (tx - cam.x) * 0.05; cam.y += (ty - cam.y) * 0.05; } else { cam.x = tx; cam.y = ty; } }
    cam.x += (tx - cam.x) * 0.18; cam.y += (ty - cam.y) * 0.14;
    const lw = niv.w * T, lh = niv.h * T;
    cam.x = lw <= vw ? lw / 2 : Math.max(vw / 2, Math.min(lw - vw / 2, cam.x));
    cam.y = lh <= vh ? lh / 2 : Math.max(vh / 2, Math.min(lh - vh / 2, cam.y));
  }
  let ox = cam.x - vw / 2, oy = cam.y - vh / 2;
  if (tremble > 0 && (!hud || hud.tremble !== false)) { ox += (Math.random() - 0.5) * tremble; oy += (Math.random() - 0.5) * tremble; tremble *= 0.85; if (tremble < 0.3) tremble = 0; }

  // ciel (en mode infini, le thème dépend de l'endroit)
  if (themeDe) { const t2 = themeEn(Math.floor(cam.x / T)); if (t2 !== th) th = t2; }
  const gr = g.createLinearGradient(0, 0, 0, HAUT);
  gr.addColorStop(0, th.ciel[0]); gr.addColorStop(1, th.ciel[1]);
  g.fillStyle = gr; g.fillRect(0, 0, LARG, HAUT);
  ciel(g, ox, oy, z);

  g.save();
  g.scale(z, z);
  g.translate(-ox, -oy);
  // décor fixe
  if (niv) {
    g.imageSmoothingEnabled = false;
    const k0 = Math.max(0, Math.floor(ox / T / MORC)), k1 = Math.min(Math.ceil(niv.w / MORC) - 1, Math.floor((ox + vw) / T / MORC));
    for (let k = k0; k <= k1; k++) g.drawImage(morceau(k), k * MORC * T, 0, MORC * T, niv.h * T);
  }
  const vis = (x, y) => x * T + T > ox - 4 && x * T < ox + vw + 4 && y * T + T > oy - 4 && y * T < oy + vh + 4;
  casesAnimees(g, e, vis);
  // fantôme
  if (fantome && !fantome.fini) joueur(g, fantome, 0.35, true);
  // joueur
  if (e.mortT === 0) joueur(g, e, 1, false);
  // eau par-dessus
  eauDessus(g, vis);
  // particules
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.97; p.vie--;
    if (p.vie <= 0) { parts.splice(i, 1); continue; }
    g.globalAlpha = Math.min(1, p.vie / p.max * 1.5);
    g.fillStyle = p.c; g.fillRect(p.x - p.t / 2, p.y - p.t / 2, p.t, p.t);
  }
  g.globalAlpha = 1;
  g.restore();

  if (flash > 0) { g.globalAlpha = flash; g.fillStyle = flashC; g.fillRect(0, 0, LARG, HAUT); g.globalAlpha = 1; flash *= 0.85; if (flash < 0.02) flash = 0; }
  // vignette
  const vg = g.createRadialGradient(LARG / 2, HAUT / 2, Math.min(LARG, HAUT) * 0.35, LARG / 2, HAUT / 2, Math.max(LARG, HAUT) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)');
  g.fillStyle = vg; g.fillRect(0, 0, LARG, HAUT);
  interfaceJeu(g, e, hud);
}

function ciel(g, ox, oy, z) {
  const id = Object.keys(THEMES).find(k => THEMES[k] === th);
  g.save();
  for (const d of decor) {
    const x = ((d.x - ox * d.s) * z) % (LARG + 400) - 100, y = (d.y - oy * d.s * 0.6) * z * 0.5 + HAUT * 0.15;
    const xx = x < -200 ? x + LARG + 400 : x;
    g.globalAlpha = 0.25 + d.k * 0.25;
    g.fillStyle = th.loin;
    switch (id) {
      case 'carriere': g.beginPath(); g.moveTo(xx - d.r, HAUT); g.lineTo(xx, y); g.lineTo(xx + d.r * 0.8, HAUT); g.fill(); break;
      case 'aqueduc': g.fillRect(xx, y, d.r * 0.25, HAUT); g.beginPath(); g.arc(xx + d.r * 0.6, y + 10, d.r * 0.35, Math.PI, 0); g.lineWidth = 6; g.strokeStyle = th.loin; g.stroke(); break;
      case 'chaufferie': g.fillRect(xx, y, d.r * 0.3, HAUT); g.globalAlpha = 0.5 * (0.5 + 0.5 * Math.sin(temps * 2 + d.k * 9)); g.fillStyle = '#ff6a20'; g.fillRect(xx + d.r * 0.1, y + 10, d.r * 0.1, 6); break;
      case 'orage': g.fillStyle = '#fff'; g.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(temps * (0.5 + d.k) + d.k * 20)); g.fillRect(xx, y * 0.8 - 40, 1.5, 1.5); break;
      case 'abysses': g.strokeStyle = '#7ff'; g.globalAlpha = 0.25; g.beginPath(); g.arc(xx, (y - temps * 30 * d.s) % HAUT + HAUT * (y < 0 ? 1 : 0), 2 + d.k * 4, 0, 7); g.stroke(); break;
      case 'usine': g.beginPath(); g.arc(xx, y, d.r * 0.4, 0, 7); g.fill(); g.fillStyle = th.ciel[1]; g.beginPath(); g.arc(xx, y, d.r * 0.15, 0, 7); g.fill(); break;
      case 'glacier': g.fillStyle = '#fff'; g.globalAlpha = 0.5; g.fillRect(xx + Math.sin(temps + d.k * 9) * 10, (y + temps * 25 * (0.5 + d.k)) % HAUT, 2, 2); break;
      case 'coeur': g.strokeStyle = '#ff6ad5'; g.globalAlpha = 0.12 + 0.1 * Math.sin(temps * 3 + d.k * 6); g.lineWidth = 2; g.beginPath(); g.arc(LARG / 2, HAUT / 2, (d.r * 4 + temps * 40) % (LARG * 0.8), 0, 7); g.stroke(); break;
    }
  }
  if (id === 'orage' && Math.sin(temps * 0.7) > 0.995) { g.globalAlpha = 0.15; g.fillStyle = '#fff'; g.fillRect(0, 0, LARG, HAUT); }
  g.restore();
}

function casesAnimees(g, e, vis) {
  const tt = temps;
  for (const [x, y] of dyn.fragile) {
    if (!vis(x, y) || M.casse(e, x * 1024 + y)) continue;
    const px = x * T, py = y * T;
    g.fillStyle = th.motif; g.fillRect(px, py, T, T);
    g.fillStyle = th.ombre; g.fillRect(px + 1, py + 1, T - 2, T - 2);
    g.fillStyle = th.motif; g.fillRect(px + 2, py + 2, T - 4, T - 4);
    g.strokeStyle = th.ombre; g.lineWidth = 1.2; g.beginPath();
    g.moveTo(px + 3, py + 4); g.lineTo(px + 8, py + 8); g.lineTo(px + 6, py + 13); g.moveTo(px + 8, py + 8); g.lineTo(px + 13, py + 6);
    g.stroke();
  }
  for (const [x, y] of dyn.tapis) {
    if (!vis(x, y)) continue;
    const k = niv.g[y * niv.w + x] === M.TAPIS_G ? -1 : 1;
    const d = ((tt * 1.4 * 60 * k) % 8 + 8) % 8;
    g.fillStyle = '#ffc83a';
    for (let i = -8; i < T + 8; i += 8) {
      const xx = x * T + i + d;
      if (xx < x * T || xx > x * T + T - 3) continue;
      g.beginPath(); g.moveTo(xx, y * T + 4); g.lineTo(xx + 3 * k, y * T + 8); g.lineTo(xx, y * T + 12); g.lineTo(xx + 1.5, y * T + 8); g.fill();
    }
    g.fillStyle = '#16181c'; g.fillRect(x * T, y * T, T, 2); g.fillRect(x * T, y * T + T - 2, T, 2);
  }
  for (const [x, y, k] of dyn.vent) {
    if (!vis(x, y)) continue;
    const s = alea(x * 3 + y * 7);
    const d = ((tt * 90 + s * 64) % 32) - 8;
    g.strokeStyle = 'rgba(220,240,255,.28)'; g.lineWidth = 1;
    g.beginPath();
    const px = x * T, py = y * T;
    if (k === M.VENT_D) { g.moveTo(px + d, py + 4 + s * 8); g.lineTo(px + d + 7, py + 4 + s * 8); }
    else if (k === M.VENT_G) { g.moveTo(px + T - d, py + 4 + s * 8); g.lineTo(px + T - d - 7, py + 4 + s * 8); }
    else if (k === M.VENT_H) { g.moveTo(px + 4 + s * 8, py + T - d); g.lineTo(px + 4 + s * 8, py + T - d - 7); }
    else { g.moveTo(px + 4 + s * 8, py + d); g.lineTo(px + 4 + s * 8, py + d + 7); }
    g.stroke();
    g.fillStyle = 'rgba(200,230,255,.04)'; g.fillRect(px, py, T, T);
  }
  for (const [x, y] of dyn.feu) {
    if (!vis(x, y)) continue;
    const px = x * T, py = y * T;
    g.fillStyle = '#3a1208'; g.fillRect(px + 1, py + T - 4, T - 2, 4);
    for (let i = 0; i < 4; i++) {
      const h = 8 + 5 * Math.sin(tt * 12 + i * 1.7 + x);
      g.fillStyle = i % 2 ? '#ff7a1a' : '#ffd040';
      g.beginPath(); g.moveTo(px + 1 + i * 3.5, py + T - 3); g.quadraticCurveTo(px + 3 + i * 3.5, py + T - 3 - h, px + 5 + i * 3.5, py + T - 3); g.fill();
    }
    if (Math.random() < 0.08) part(px + Math.random() * T, py + 4, (Math.random() - 0.5) * 0.4, -0.8, 30, '#ffb040', 1.5, -0.01);
  }
  for (const [x, y] of dyn.ressort) {
    if (!vis(x, y)) continue;
    const px = x * T, py = y * T;
    g.strokeStyle = '#9effa0'; g.lineWidth = 1.5; g.beginPath();
    for (let i = 0; i < 4; i++) { g.moveTo(px + 3, py + 15 - i * 2.2); g.lineTo(px + 13, py + 14 - i * 2.2); }
    g.stroke();
    g.fillStyle = '#5ad46a'; g.fillRect(px + 1, py + 6, T - 2, 3); g.fillStyle = '#d6ffd8'; g.fillRect(px + 1, py + 6, T - 2, 1);
  }
  for (const [x, y] of dyn.cristal) {
    if (!vis(x, y)) continue;
    const i = x * 1024 + y, pris = e.cristaux.some(c => c[0] === i);
    const px = x * T + 8, py = y * T + 8 + Math.sin(tt * 3 + x) * 1.5;
    g.globalAlpha = pris ? 0.2 : 1;
    g.fillStyle = '#7dfcff'; g.beginPath(); g.moveTo(px, py - 7); g.lineTo(px + 5, py); g.lineTo(px, py + 7); g.lineTo(px - 5, py); g.fill();
    g.fillStyle = '#e6ffff'; g.beginPath(); g.moveTo(px, py - 5); g.lineTo(px + 2, py); g.lineTo(px, py + 1); g.fill();
    if (!pris) { g.globalAlpha = 0.25 + 0.15 * Math.sin(tt * 5); g.beginPath(); g.arc(px, py, 9, 0, 7); g.fill(); }
    g.globalAlpha = 1;
  }
  for (const [x, y] of dyn.but) {
    if (!vis(x, y)) continue;
    const px = x * T + 8, py = y * T + 8;
    for (let i = 0; i < 3; i++) {
      g.strokeStyle = i === 1 ? '#fff' : th.accent; g.lineWidth = 1.5; g.globalAlpha = 0.9 - i * 0.2;
      g.beginPath(); g.ellipse(px, py, 6 + i * 2.5 + Math.sin(tt * 4 + i) * 1, 9 + i * 2.5, 0, 0, 7); g.stroke();
    }
    g.globalAlpha = 1; g.fillStyle = '#fff'; g.beginPath(); g.arc(px, py, 2 + Math.sin(tt * 6), 0, 7); g.fill();
  }
  for (const [x, y] of dyn.drapeau) {
    if (!vis(x, y)) continue;
    const actif = e.cp && e.cp.tx === x && e.cp.ty === y;
    const px = x * T, py = y * T;
    g.fillStyle = '#ccc'; g.fillRect(px + 4, py + 1, 1.5, 15);
    g.fillStyle = actif ? '#7dff9a' : '#777';
    g.beginPath(); g.moveTo(px + 5.5, py + 1); g.lineTo(px + 13 + Math.sin(tt * 6) * 1, py + 3.5); g.lineTo(px + 5.5, py + 7); g.fill();
  }
  for (const [x, y, k] of dyn.tp) {
    if (!vis(x, y)) continue;
    const entree = k === M.TP1 || k === M.TP2;
    const c = (k === M.TP1 || k === M.TP1S) ? '#c08bff' : '#5ef2a0';
    const px = x * T + 8, py = y * T + 8;
    g.strokeStyle = c; g.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      g.globalAlpha = entree ? 0.9 - i * 0.25 : 0.4 - i * 0.1;
      g.beginPath(); g.arc(px, py, 3 + i * 2.5, tt * (entree ? 4 : -2) + i, tt * (entree ? 4 : -2) + i + 4.2); g.stroke();
    }
    g.globalAlpha = 1;
  }
  for (const [x, y] of dyn.eclat) {
    if (!vis(x, y) || e.eclat) continue;
    const px = x * T + 8, py = y * T + 8 + Math.sin(tt * 2.5) * 2, r = tt * 2;
    g.save(); g.translate(px, py); g.rotate(Math.sin(r) * 0.4);
    g.fillStyle = '#ff7ae0'; g.beginPath();
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.lineTo(Math.cos(a) * (i % 2 ? 3 : 7), Math.sin(a) * (i % 2 ? 3 : 7)); }
    g.fill(); g.fillStyle = '#fff'; g.fillRect(-1, -3, 2, 2); g.restore();
  }
}

function eauDessus(g, vis) {
  if (!dyn.eau.length) return;
  for (const [x, y, surf] of dyn.eau) {
    if (!vis(x, y)) continue;
    const px = x * T, py = y * T;
    g.fillStyle = 'rgba(40,160,220,.38)'; g.fillRect(px, py, T, T);
    if (surf) {
      const o = Math.sin(temps * 3 + x * 0.8) * 1.5;
      g.fillStyle = 'rgba(190,240,255,.7)'; g.fillRect(px, py + 2 + o, T, 1.5);
      g.fillStyle = 'rgba(40,160,220,.25)'; g.fillRect(px, py, T, 2 + o);
    } else if (alea(x * 5 + y * 11 + Math.floor(temps * 2)) < 0.03) part(px + 8, py + 8, 0, -0.4, 40, 'rgba(200,250,255,.6)', 1.5, -0.005);
  }
}

/* ---------- Le joueur selon son état ---------- */
function joueur(g, e, alpha, fantome) {
  const x = e.x, y = e.y, cxp = x + PW / 2, cyp = y + PH / 2;
  g.globalAlpha = alpha;
  const c = COUL_PHASE[e.phase];
  if (fantome) {
    g.fillStyle = c; arrondi(g, x, y, PW, PH, e.phase === M.S ? 3 : 6); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 1; g.stroke();
    g.globalAlpha = 1; return;
  }
  const vit = Math.hypot(e.vx, e.vy);
  // traînée de vitesse
  if (vit > 3.2 && !fantome) {
    for (let i = 1; i <= 3; i++) {
      g.globalAlpha = alpha * (0.18 - i * 0.04);
      g.fillStyle = c; g.fillRect(x - e.vx * i * 1.6, y - e.vy * i * 1.6, PW, PH);
    }
    g.globalAlpha = alpha;
  }
  if (e.phase === M.S) {
    let sx = 1, sy = 1;
    if (e.slam) { sx = 0.8; sy = 1.2; } else if (!e.sol) { sx = 0.92; sy = 1.08; }
    const w = PW * sx, h = PH * sy;
    g.fillStyle = '#5c4a35'; arrondi(g, cxp - w / 2, y + PH - h, w, h, 3); g.fill();
    g.fillStyle = c; arrondi(g, cxp - w / 2 + 1, y + PH - h + 1, w - 2, h - 3, 2.5); g.fill();
    g.fillStyle = '#fff6e0'; g.fillRect(cxp - w / 2 + 2, y + PH - h + 2, w - 6, 1.5);
    yeux(g, cxp + e.face * 1.5, y + PH - h + 5, e.face, '#2a2018');
  } else if (e.phase === M.L) {
    g.fillStyle = c;
    const t = temps * 8;
    if (e.att === 1 || e.att === 2) {
      const sd = e.att === 1 ? -1 : 1;
      g.beginPath(); g.ellipse(cxp + sd * 2, cyp, 4.5, 7 + Math.sin(t) * 0.6, 0, 0, 7); g.fill();
    } else if (e.att === 3) {
      g.beginPath(); g.ellipse(cxp, cyp - 2, 7 + Math.sin(t) * 0.6, 4.5, 0, 0, 7); g.fill();
    } else if (e.sol) {
      g.beginPath(); g.ellipse(cxp, y + PH - 4, 7.5 + Math.min(2, Math.abs(e.vx) * 0.4), 4.5, 0, 0, 7); g.fill();
    } else {
      g.beginPath(); g.moveTo(cxp, y - 2); g.quadraticCurveTo(cxp + 7, cyp + 2, cxp, y + PH); g.quadraticCurveTo(cxp - 7, cyp + 2, cxp, y - 2); g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(cxp - 2, cyp - 1, 1.5, 0, 7); g.fill();
    yeux(g, cxp + e.face, cyp, e.face, '#06243a');
  } else if (e.phase === M.Z) {
    const r = e.gaz / M.K.zDuree;
    g.globalAlpha = alpha * (0.45 + 0.55 * r);
    g.fillStyle = c;
    for (let i = 0; i < 5; i++) {
      const a = temps * 3 + i * 1.26;
      g.beginPath(); g.arc(cxp + Math.cos(a) * 3.5, cyp + Math.sin(a) * 2.5, 4 + Math.sin(temps * 5 + i) * 0.8, 0, 7); g.fill();
    }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(cxp, cyp, 4, 0, 7); g.fill();
    g.globalAlpha = alpha;
    yeux(g, cxp + e.face, cyp, e.face, '#6a3a20');
    if (Math.random() < 0.3) part(cxp + (Math.random() - 0.5) * 8, cyp + 4, (Math.random() - 0.5) * 0.3, 0.2, 18, 'rgba(255,230,200,.6)', 2, -0.02);
  } else {
    g.fillStyle = '#fff'; g.beginPath(); g.arc(cxp, cyp, 5, 0, 7); g.fill();
    g.strokeStyle = c; g.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      g.beginPath(); let a = Math.random() * 7, px = cxp, py = cyp; g.moveTo(px, py);
      for (let k = 0; k < 3; k++) { px += Math.cos(a) * 3.5; py += Math.sin(a) * 3.5; a += (Math.random() - 0.5) * 1.6; g.lineTo(px, py); }
      g.stroke();
    }
    g.globalAlpha = alpha * 0.4; g.fillStyle = c; g.beginPath(); g.arc(cxp, cyp, 9, 0, 7); g.fill();
    part(cxp, cyp, 0, 0, 12, c, 3, 0);
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
  const taille = 34 * P, bx = 16, by = HAUT - taille - 18 * P;
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
    g.fillText(M.NOMS_PHASES[p].toUpperCase(), x + taille / 2, by + taille - 13 * P);
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
    const hL = 22 * P, bh = lignes.length * hL + 20, bw = Math.min(LARG - 40, 760), bxx = (LARG - bw) / 2, byy = 84 * P;
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
