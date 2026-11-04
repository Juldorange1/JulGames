'use strict';
/* Colosses — « Avant d'entrer » : plus aucune bulle pendant les combats. Quand une salle contient quelque chose que
   tu ne connais pas encore (un colosse, un trait, une arme, le piège d'une région, le premier méga boss…), un écran
   l'explique AVANT le combat, avec une petite animation qui montre ce que fait la chose. Le combat ne commence qu'en
   cliquant « Entrer dans l'arène ». Réglage : Paramètres → Jeu → « Expliquer les nouveautés avant d'entrer ». */

// les anciennes bulles en plein combat sont coupées
Conseils.actifs = () => false;
Conseils.dessiner = () => { };
// la grande carte de région en plein combat aussi (elle passe dans l'écran d'avant)
Regions.dessinerCarte = () => { };

// seulement ce qui est difficile à comprendre tout seul en quelques secondes
const ARMES_COMPLEXES = new Set(['p:arc', 'p:laser', 'p:railgun', 'p:rattrape', 'p:echo', 'p:meteorite', 'p:gravite', 'p:iaido', 'p:lucioles', 'p:pacte', 'p:calice', 'p:froleur', 'p:couleuvrine', 'p:surchauffe', 'p:aiguilles', 'p:harpon', 'p:pistolet', 'p:jumelles', 'p:croix', 'p:ricochets',
  's:trou', 's:supernova', 's:renvoi', 's:aimantSpe', 's:miroir', 's:faille',
  't:parade', 't:contre', 't:ancre', 't:rembobine', 't:dephasage', 't:echange', 't:trampoline', 't:fantome', 't:leurre', 't:ombre', 't:esquive']);
const PIEGES_COMPLEXES = new Set(['vase', 'bourrasque']);
function vusAvant() { return Save.d.vusAvant || (Save.d.vusAvant = {}); }

// ---------- petites animations (canvas 260×140) ----------
const DW = 260, DH = 140;
const dHeros = (c, x, y, a, rouge) => {
  c.save(); c.translate(x, y); c.rotate(a || -Math.PI / 2);
  c.fillStyle = '#7a1a24'; c.beginPath(); c.moveTo(-4, -6); c.lineTo(-14, 0); c.lineTo(-4, 6); c.fill();
  c.fillStyle = rouge ? '#ff6b7d' : '#9fb4c8'; c.strokeStyle = '#000'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(0, 0, 7, 9, 0, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = '#d8e2ec'; c.beginPath(); c.arc(1, 0, 5, 0, TAU); c.fill(); c.stroke();
  c.strokeStyle = '#5fe0ff'; c.lineWidth = 2; c.beginPath(); c.arc(1, 0, 3.6, -.7, .7); c.stroke();
  c.restore();
};
const dBoss = (c, x, y, r, col, o) => {
  o = o || {};
  c.save(); c.globalAlpha = o.al === undefined ? 1 : o.al;
  const g = c.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r); g.addColorStop(0, '#fff'); g.addColorStop(.25, col); g.addColorStop(1, '#120a14');
  c.fillStyle = g; c.strokeStyle = '#000'; c.lineWidth = 2.5; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.stroke();
  const a = o.regard === undefined ? Math.PI / 2 : o.regard;
  for (const s of [-1, 1]) { const ex = x + Math.cos(a + s * .45) * r * .55, ey = y + Math.sin(a + s * .45) * r * .55; c.fillStyle = '#fff'; c.beginPath(); c.arc(ex, ey, r * .16, 0, TAU); c.fill(); c.fillStyle = '#000'; c.beginPath(); c.arc(ex + Math.cos(a) * 1.5, ey + Math.sin(a) * 1.5, r * .08, 0, TAU); c.fill(); }
  if (o.contour) { c.strokeStyle = o.contour; c.lineWidth = 3; c.beginPath(); c.arc(x, y, r + 4, 0, TAU); c.stroke(); }
  c.restore();
};
const dZone = (c, x, y, r, k) => {
  // k de 0 à 1 : la zone se remplit, puis frappe (k > 1)
  c.save();
  if (k <= 1) { c.fillStyle = 'rgba(255,40,60,.16)'; c.strokeStyle = 'rgba(255,60,80,.9)'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,40,60,.45)'; c.beginPath(); c.arc(x, y, r * k, 0, TAU); c.fill(); }
  else if (k < 1.25) { c.fillStyle = `rgba(255,220,200,${1.25 - k > 0 ? (1.25 - k) * 3 : 0})`; c.beginPath(); c.arc(x, y, r * 1.05, 0, TAU); c.fill(); }
  c.restore();
};
const dTexte = (c, t, x, y, col, taille) => { c.save(); c.font = `800 ${taille || 13}px ${POLICE}`; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.85)'; c.strokeText(t, x, y); c.fillStyle = col || '#fff'; c.fillText(t, x, y); c.restore(); };
const dBalle = (c, x, y, col, r) => { c.fillStyle = col || '#7ff'; c.strokeStyle = '#000'; c.lineWidth = 1.2; c.beginPath(); c.arc(x, y, r || 3, 0, TAU); c.fill(); c.stroke(); };
const dSol = c => { const g = c.createLinearGradient(0, 0, 0, DH); g.addColorStop(0, '#2a2420'); g.addColorStop(1, '#15110e'); c.fillStyle = g; c.fillRect(0, 0, DW, DH); c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1; for (let x = 0; x < DW; x += 26) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, DH); c.stroke(); } for (let y = 0; y < DH; y += 26) { c.beginPath(); c.moveTo(0, y); c.lineTo(DW, y); c.stroke(); } };
const cycleDemo = (t, d) => (t % d) / d;

const DEMOS = {
  base(c, t) {
    dSol(c); const u = cycleDemo(t, 4);
    dBoss(c, 130, 34, 22, '#c0405a');
    const k = clamp(u * 1.6, 0, 1.3);
    dZone(c, 90, 100, 30, k);
    const hx = u < .45 ? 90 : 90 + Math.min(1, (u - .45) * 6) * 80;
    dHeros(c, hx, 104, -Math.PI / 2 + (hx - 130) * -.004);
    for (let i = 0; i < 4; i++) { const q = (t * 2.4 + i / 4) % 1; dBalle(c, hx + (130 - hx) * q, 104 - 70 * q, '#9ff', 2.2); }
    dTexte(c, u < .45 ? 'la zone se remplit…' : 'sors-en avant qu\'elle frappe', 130, 134, '#ffd8a0', 11);
  },
  finale(c, t) {
    dSol(c); const u = cycleDemo(t, 4.5);
    dBoss(c, 130, 70, 16, '#c0405a', { contour: `rgba(255,120,80,${.5 + .5 * Math.sin(t * 20)})` });
    for (let i = 0; i < 3; i++) { const t0 = i * .22, k = (u - t0) / .25; if (k > 0 && k < 1.3) { c.save(); c.globalAlpha = k <= 1 ? .35 + .4 * k : 1.3 - k; c.strokeStyle = '#ff4060'; c.lineWidth = 16; c.beginPath(); c.arc(130, 70, 28 + i * 24, 0, TAU); c.stroke(); c.restore(); } }
    const hx = u < .3 ? 210 : u < .55 ? 210 - (u - .3) * 4 * 70 : 140 + 12;
    dHeros(c, hx, 70, Math.PI);
    dTexte(c, 'DERNIER SOUFFLE : rentre vers lui', 130, 132, '#ffd8a0', 11);
  },
  espece(c, t, d) {
    c.fillStyle = '#120e14'; c.fillRect(0, 0, DW, DH);
    const g = c.createRadialGradient(DW / 2, DH * .55, 10, DW / 2, DH * .55, 120); g.addColorStop(0, hsl(d.hue, 70, 30, .6)); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, DW, DH);
    if (d.img) { const s = 1 + Math.sin(t * 1.8) * .02, w = d.img.width * .5 * s, h = d.img.height * .5 * s; c.drawImage(d.img, DW / 2 - w / 2, DH * .55 - h / 2 + Math.sin(t * 1.4) * 2, w, h); }
  },
  mega(c, t) {
    dSol(c);
    c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(130, 70, 10, 130, 70, 70); g.addColorStop(0, 'rgba(255,200,90,.5)'); g.addColorStop(1, 'rgba(255,200,90,0)'); c.fillStyle = g; c.fillRect(0, 0, DW, DH); c.restore();
    dBoss(c, 130, 70, 30 + Math.sin(t * 2) * 1.5, '#d8a040', { contour: '#ffd86b' });
    dTexte(c, 'toutes les 5 salles', 130, 132, '#ffd86b', 11);
  },
  retour(c, t) {
    dSol(c); const u = cycleDemo(t, 3);
    dBoss(c, 130, 50, 22, '#7a5adf', { al: u < .5 ? 1 : .35 + (u - .5) });
    dTexte(c, u < .5 ? 'même boss…' : '…mêmes attaques : apprends-les', 130, 120, '#d8c8ff', 12);
  },
  cristaux(c, t) {
    dSol(c); const u = cycleDemo(t, 2.6);
    for (let i = 0; i < 3; i++) { const q = clamp(u * 1.5 - i * .15, 0, 1), x = 60 + (200 - 60) * q, y = 90 - Math.sin(q * Math.PI) * 50; if (q < 1) { c.fillStyle = '#7fe8ff'; c.strokeStyle = '#000'; c.save(); c.translate(x, y); c.rotate(t * 3); c.beginPath(); c.moveTo(0, -7); c.lineTo(5, 0); c.lineTo(0, 7); c.lineTo(-5, 0); c.closePath(); c.fill(); c.stroke(); c.restore(); } }
    icoDessin(c, 'ui:affinites', 200, 58, 30); icoDessin(c, 'ui:garderobe', 230, 92, 26);
    dTexte(c, 'affinités et apparences, jamais de puissance', 130, 132, '#bfefff', 11);
  },
  // ----- traits -----
  'trait:cristaux'(c, t) {
    dSol(c); const u = cycleDemo(t, 4), casses = Math.floor(u * 4);
    dBoss(c, 130, 60, 22, '#4a7adf');
    if (casses < 3) { c.strokeStyle = 'rgba(140,220,255,.9)'; c.lineWidth = 2; c.beginPath(); c.arc(130, 60, 32, 0, TAU); c.stroke(); }
    for (let i = 0; i < 3; i++) if (i >= casses) { const a = t + i * TAU / 3, x = 130 + Math.cos(a) * 55, y = 60 + Math.sin(a) * 35; c.fillStyle = '#7fe8ff'; c.strokeStyle = '#000'; c.beginPath(); c.moveTo(x, y - 8); c.lineTo(x + 6, y); c.lineTo(x, y + 8); c.lineTo(x - 6, y); c.closePath(); c.fill(); c.stroke(); }
    dHeros(c, 130, 118); dTexte(c, casses < 3 ? 'casse ses cristaux d\'abord' : 'bouclier brisé !', 130, 136, '#bfe8ff', 11);
  },
  'trait:dos'(c, t) {
    dSol(c); const a = t * .9, hx = 130 + Math.cos(a) * 80, hy = 70 + Math.sin(a) * 45;
    const regard = ang(130, 70, hx, hy) + Math.sin(t * 1.3) * .9;
    dBoss(c, 130, 70, 22, '#c07040', { regard });
    dHeros(c, hx, hy, ang(hx, hy, 130, 70));
    const dos = Math.abs(angDiff(regard, ang(130, 70, hx, hy))) > 2;
    dTexte(c, dos ? '×2,5 dans le dos' : '×0,4 de face', 130, 22, dos ? '#ffe14d' : '#ff8a8a', 13);
  },
  'trait:carapace'(c, t) {
    dSol(c); const u = cycleDemo(t, 4);
    dBoss(c, 130, 60, 24, '#8a8070');
    if (u < .75) { c.strokeStyle = '#d0d4dc'; c.lineWidth = 5; for (let i = 0; i < 5; i++) { const a0 = i * TAU / 5 + .1, fissure = u > .4 && i % 2; c.globalAlpha = fissure ? .5 : 1; c.beginPath(); c.arc(130, 60, 28, a0, a0 + TAU / 5 - .25); c.stroke(); } c.globalAlpha = 1; }
    dHeros(c, 130, 120); for (let i = 0; i < 3; i++) { const q = (t * 2 + i / 3) % 1; dBalle(c, 130, 120 - 50 * q, '#9ff', 2.2); }
    dTexte(c, u < .75 ? 'l\'armure absorbe : vise avec tes spéciales' : 'carapace brisée !', 130, 18, '#e0e6ee', 11);
  },
  'trait:miroir'(c, t) {
    dSol(c); const u = cycleDemo(t, 3), blanc = u > .4 && u < .8;
    dBoss(c, 130, 45, 22, blanc ? '#ffffff' : '#9a60c0', { contour: blanc ? '#fff' : null });
    dHeros(c, 130, 118);
    for (let i = 0; i < 4; i++) { const q = (t * 2 + i / 4) % 1; const y = blanc ? 70 + 45 * q : 112 - 45 * q; dBalle(c, 130 + (i - 1.5) * 6, y, blanc ? '#ff6a7a' : '#9ff', 2.2); }
    dTexte(c, blanc ? 'il brille : arrête de tirer !' : 'tire quand il ne brille pas', 130, 136, blanc ? '#ffb3c0' : '#d8e8ff', 11);
  },
  'trait:regen'(c, t) {
    dSol(c); const u = cycleDemo(t, 4), pv = u < .5 ? 1 - u * 1.2 : .4 + (u - .5) * 1.2;
    dBoss(c, 130, 64, 22, '#3a9a5a');
    c.fillStyle = '#000'; c.fillRect(70, 22, 120, 9); c.fillStyle = u < .5 ? '#ff5a6e' : '#46e39b'; c.fillRect(71, 23, 118 * pv, 7);
    dTexte(c, u < .5 ? 'tu le frappes…' : 'tu arrêtes 3 s : il se soigne', 130, 130, u < .5 ? '#fff' : '#9dffc4', 11);
  },
  'trait:souffle'(c, t) {
    dSol(c); const u = cycleDemo(t, 3), ouvert = u > .55;
    dBoss(c, 130, 60, 22, '#c0a040', { contour: ouvert ? `rgba(255,215,80,${.7 + .3 * Math.sin(t * 16)})` : null });
    dTexte(c, ouvert ? 'contour doré : ×2,2 !' : 'il attaque : ×0,5', 130, 22, ouvert ? '#ffe14d' : '#ff9a9a', 13);
    dHeros(c, 130, 118);
  },
  'trait:rage'(c, t) {
    dSol(c); const u = cycleDemo(t, 5), pv = 1 - u, vite = 1 + u * 3;
    dBoss(c, 130, 55, 22 + Math.sin(t * 6 * vite) * 1.5, '#d03a2a');
    c.fillStyle = '#000'; c.fillRect(70, 18, 120, 8); c.fillStyle = '#ff5a6e'; c.fillRect(71, 19, 118 * pv, 6);
    for (let i = 0; i < 6; i++) { const q = (t * .9 * vite + i / 6) % 1; dBalle(c, 130 + Math.cos(i) * 90 * q, 55 + Math.sin(i + 1) * 60 * q, '#ff8a5c', 2.5); }
    dTexte(c, 'moins il a de vie, plus il enchaîne', 130, 134, '#ffb08a', 11);
  },
  'trait:spectral'(c, t) {
    dSol(c); const u = cycleDemo(t, 3.4), trans = u > .5;
    dBoss(c, 130, 50, 22, '#8070d0', { al: trans ? .25 + .1 * Math.sin(t * 12) : 1 });
    dHeros(c, 130, 118); for (let i = 0; i < 4; i++) { const q = (t * 2 + i / 4) % 1; const y = 112 - 110 * q; if (!trans && y < 72) continue; dBalle(c, 130, y, '#9ff', 2.2); }
    dTexte(c, trans ? 'transparent : tes tirs passent' : 'visible : tu le touches', 130, 136, '#d8d0ff', 11);
  },
  // ----- pièges de région -----
  'piege:dalles'(c, t) {
    dSol(c); const u = cycleDemo(t, 3);
    const k = clamp(u * 1.4, 0, 1.3); c.fillStyle = k <= 1 ? `rgba(255,60,80,${.2 + .35 * k})` : `rgba(255,230,200,${(1.3 - k) * 3})`; c.fillRect(78, 52, 52, 52); c.strokeStyle = '#ff4060'; c.lineWidth = 2; c.strokeRect(78, 52, 52, 52);
    dHeros(c, u < .4 ? 104 : 104 + Math.min(1, (u - .4) * 5) * 60, 78);
    dTexte(c, 'quitte la case qui brille', 130, 132, '#ffd8a0', 11);
  },
  'piege:vapeur'(c, t) {
    dSol(c); const u = cycleDemo(t, 3), k = clamp(u * 1.4, 0, 1.3);
    c.fillStyle = '#05070a'; c.fillRect(110, 0, 40, 8);
    if (k <= 1) { c.fillStyle = `rgba(255,60,80,${.15 + .3 * k})`; c.fillRect(112, 8, 36, 90); c.strokeStyle = '#ff4060'; c.strokeRect(112, 8, 36, 90); }
    else { c.fillStyle = `rgba(230,240,255,${(1.3 - k) * 3})`; c.fillRect(108, 8, 44, 94); }
    dHeros(c, u < .35 ? 130 : 130 - Math.min(1, (u - .35) * 5) * 60, 70);
    dTexte(c, 'la grille souffle : sors de la bande', 130, 132, '#ffd8a0', 11);
  },
  'piege:vase'(c, t) {
    dSol(c); c.fillStyle = 'rgba(70,58,24,.9)'; c.beginPath(); c.ellipse(120, 70, 70, 40, 0, 0, TAU); c.fill();
    const x = 40 + ((t * 60) % 200), dans = Math.abs(x - 120) < 70, hx = dans ? 40 + ((t * 60) % 200) : x;
    for (let i = 0; i < 6; i++) { const px = hx - i * (dans ? 6 : 12); c.fillStyle = `rgba(52,214,255,${.4 - i * .06})`; c.beginPath(); c.arc(px, 72, 2, 0, TAU); c.fill(); }
    dHeros(c, hx, 72, 0);
    dTexte(c, 'la vase ralentit, et des bulles de gaz éclatent', 130, 132, '#e8dcb0', 11);
  },
  'piege:eruption'(c, t) {
    dSol(c); const u = cycleDemo(t, 3), k = clamp(u * 1.4, 0, 1.3);
    dZone(c, 70, 50, 24, k); dZone(c, 190, 90, 24, k); dZone(c, 120, 80, 24, k);
    dHeros(c, u < .4 ? 120 : 120 + Math.min(1, (u - .4) * 5) * 40, u < .4 ? 80 : 80 - Math.min(1, (u - .4) * 5) * 45);
    dTexte(c, 'trois cercles, dont un sous toi', 130, 132, '#ffd8a0', 11);
  },
  'piege:vitrail'(c, t) {
    dSol(c); const u = cycleDemo(t, 3), k = clamp(u * 1.5, 0, 1.4);
    if (k <= 1) { c.strokeStyle = 'rgba(255,80,100,.8)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(130, 0); c.lineTo(130, DH); c.stroke(); }
    else { c.fillStyle = `rgba(255,250,220,${(1.4 - k) * 2.5})`; c.fillRect(116, 0, 28, DH); }
    dHeros(c, u < .4 ? 130 : 130 + Math.min(1, (u - .4) * 5) * 50, 80);
    dTexte(c, 'une ligne fine annonce le rayon', 70, 20, '#ffe9b0', 11);
  },
  'piege:bourrasque'(c, t) {
    dSol(c); const u = cycleDemo(t, 3.2);
    c.strokeStyle = 'rgba(240,250,255,.7)'; c.lineWidth = 1.4;
    for (let i = 0; i < 9; i++) { const x = ((t * 260 + i * 53) % 300) - 20, y = 14 + i * 13; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 18, y); c.stroke(); }
    const pousse = u > .35 ? Math.min(1, (u - .35) * 3) : 0;
    dHeros(c, 110 + pousse * 40 - (u > .7 ? (u - .7) * 120 : 0), 76, Math.PI);
    dTexte(c, 'marche contre le vent', 130, 132, '#e8f4ff', 11);
  },
  // ----- armes -----
  'arme:p'(c, t) { dSol(c); dBoss(c, 210, 70, 20, '#b04060'); dHeros(c, 50, 70, 0); for (let i = 0; i < 5; i++) { const q = (t * 2 + i / 5) % 1; dBalle(c, 60 + 130 * q, 70 + Math.sin(i * 3) * 4 * q, '#ffd27a', 2.5); } },
  // spéciales et talents : la grande icône de l'arme, qui pulse (chacun fait quelque chose de différent : lis la description)
  'arme:s'(c, t, d) { dSol(c); const u = cycleDemo(t, 1.8); c.save(); c.globalAlpha = 1 - u; c.strokeStyle = '#7ab8ff'; c.lineWidth = 5; c.beginPath(); c.arc(130, 66, 30 + u * 50, 0, TAU); c.stroke(); c.restore(); icoDessin(c, d.ico, 130, 66, 64 + Math.sin(t * 4) * 3); },
  'arme:t'(c, t, d) { dSol(c); const u = cycleDemo(t, 1.8); c.save(); c.globalAlpha = 1 - u; c.strokeStyle = '#7dffb0'; c.lineWidth = 5; c.beginPath(); c.arc(130, 66, 30 + u * 50, 0, TAU); c.stroke(); c.restore(); icoDessin(c, d.ico, 130, 66, 64 + Math.sin(t * 4) * 3); }
};

// ---------- portrait du colosse (dessiné une fois, avec son vrai rendu) ----------
function portraitBoss(b) {
  try {
    const cv = document.createElement('canvas'); cv.width = cv.height = Math.ceil(b.r * 4.6);
    const x = cv.getContext('2d'), sx = b.x, sy = b.y, h = b.haut, al = b.alpha;
    b.x = cv.width / 2; b.y = cv.height / 2; b.haut = 0; b.alpha = 1;
    try { dessinerBoss(x, b); } finally { b.x = sx; b.y = sy; b.haut = h; b.alpha = al; }
    return cv;
  } catch (e) { return null; }
}

// ---------- les nouveautés de la salle ----------
const Avant = {
  cartes: [], raf: 0,
  calculer(av) {
    const d = Save.d, cx = d.codex, V = vusAvant(), out = [], def = G.def, b = G.boss;
    if (!V.base) out.push({ cle: 'base', demo: 'base', titre: 'Comment survivre', ico: 'ui:arme', texte: `Déplace-toi avec ${T_('haut')} ${T_('gauche')} ${T_('bas')} ${T_('droite')}, vise à la souris, maintiens ${T_('tir')} pour tirer (garder le bouton donne toujours la meilleure cadence). ${T_('spec')} : attaque spéciale, ${T_('tal')} : talent. Tout ce qui frappe est annoncé : une zone qui se remplit, une ligne fine, une onde avec un trou de ton côté.` });
    if (!av.esp) {
      const E = ESPECES[def.esp] || {};
      const sig = E.phases ? [...new Set(E.phases.flatMap(ph => ph.cycle || []).filter(id => ATK[id] && ATK[id].esp))].map(id => ATK[id].nom) : [];
      out.push({ cle: 'esp:' + def.esp, demo: 'espece', data: { hue: def.hue, img: portraitBoss(b) }, titre: 'Nouveau colosse : ' + nomMaj(E.nom || def.titre), ico: 'ui:codex', texte: (E.meca || '') + (sig.length ? ' Ses attaques fétiches : ' + sig.join(', ') + '.' : '') });
    }
    for (const t of def.traits) if (!av.traits[t] && TRAITS[t]) out.push({ cle: 'trait:' + t, demo: 'trait:' + t, titre: 'Trait : ' + TRAITS[t].nom, ico: 'tr:' + t, texte: TRAITS[t].desc });
    if (false) out.push({ cle: 'mega', demo: 'mega', titre: 'Méga boss', ico: 'ui:trophee', texte: 'Toutes les 5 salles : un boss plus résistant, avec un halo doré. Il rapporte trois fois plus de cristaux et deux fragments rares.' });
    const rg = typeof Regions !== 'undefined' && Regions.rg;
    if (rg && PIEGES_COMPLEXES.has(rg.piege) && !V['piege:' + rg.piege]) out.push({ cle: 'piege:' + rg.piege, demo: 'piege:' + rg.piege, titre: 'Région ' + romain(rg.num) + ' · ' + rg.nom, ico: 'ui:idee', texte: 'Piège de la région : ' + rg.pdesc });
    const armes = ['p', 's', 't'].filter(k => !av.arm[k + ':' + G.ars[k]] && ARMES_COMPLEXES.has(k + ':' + G.ars[k]));
    if (armes.length) {
      const L = { p: ['Arme', PRIM], s: ['Spéciale', SPEC], t: ['Talent', TAL] };
      for (const k of armes) { const a = L[k][1].find(x => x.id === G.ars[k]); if (a) out.push({ cle: 'arme:' + k + ':' + a.id, demo: 'arme:' + k, data: { ico: a.ico }, titre: L[k][0] + ' : ' + a.nom, ico: a.ico, texte: a.desc + (a.cout === undefined && a.rech ? ' Recharge : ' + a.rech + ' s.' : '') }); }
    }
    if (!V.finale && V.base) out.push({ cle: 'finale', demo: 'finale', titre: 'Dernier souffle', ico: 'ui:sablier', texte: 'Quand sa vie tombe à zéro, le colosse lance une dernière attaque spectaculaire. Il ne peut plus te tuer, mais chaque coup reçu compte pour les défis de maîtrise.' });
    if (G.mode === 'normal' && ((d.essais || {})[d.diff + ':' + G.salle] || 0) > 0 && !V.retour) out.push({ cle: 'retour', demo: 'retour', titre: 'Même boss', ico: 'ui:recommencer', texte: `Après une mort, tu retrouves exactement le même colosse avec les mêmes armes. Bloqué ? ${T_('pause')} puis « Passer ce boss » : le joker est commun aux 3 difficultés et revient après 3 boss vaincus.` });
    if (false) out.push({ cle: 'cristaux', demo: 'cristaux', titre: 'Cristaux', ico: 'ui:cristal', texte: 'Chaque boss vaincu donne des cristaux (Cauchemar ×2, Apprenti ×½). Ils achètent des affinités (tes armes préférées sortent plus souvent) et des apparences, au menu. Jamais de puissance.' });
    return out;
  },
  montrer(cartes) {
    this.cartes = cartes;
    const rg = Regions.rg;
    const html = `<div class="panneau avant"><div class="barre-titre"><h2>⟦ui:idee⟧ Avant d'entrer</h2><span class="avant-lieu">Salle ${G.salle}${rg ? ' · ' + romain(rg.num) + ' ' + rg.nom : ''}</span></div>
      <p class="mini">Voici ce que tu vas découvrir dans cette salle. Le combat ne commence que quand tu entres.</p>
      <div class="avant-cartes">${cartes.map((k, i) => `<div class="avant-c"><canvas width="${DW}" height="${DH}" data-i="${i}"></canvas><b>⟦${icoCle(k.ico)}⟧ ${k.titre}</b><p>${k.texte}</p></div>`).join('')}</div>
      <div class="rang"><button class="jouer-petit" data-a="avantGo" data-def>Entrer dans l'arène</button></div></div>`;
    UI.montrer(html);
    const cvs = [...document.querySelectorAll('.avant-c canvas')], t0 = performance.now();
    cancelAnimationFrame(this.raf);
    const anim = () => {
      if (!cvs[0] || !cvs[0].isConnected) return;
      const t = (performance.now() - t0) / 1000;
      cvs.forEach(cv => { const k = this.cartes[+cv.dataset.i], f = DEMOS[k.demo], x = cv.getContext('2d'); x.save(); try { if (f) f(x, t, k.data || {}); } catch (e) { } x.restore(); });
      this.raf = requestAnimationFrame(anim);
    };
    anim();
  },
  entrer() {
    const V = vusAvant(); for (const k of this.cartes) V[k.cle] = 1; Save.write();
    cancelAnimationFrame(this.raf); this.cartes = [];
    UI.cacher(); G.etat = 'combat'; G.toast = null; Input.clear(); Musique.baisser(1);
  }
};

const _entrerAvant = G.entrerSalle;
G.entrerSalle = function () {
  const cx = Save.d.codex, av = { esp: null, traits: Object.assign({}, cx.traits), arm: Object.assign({}, cx.arm) };
  const r = _entrerAvant.apply(this, arguments);
  try {
    av.esp = (cx.especes[this.def.esp] || {}).vus > 1;
    this.toast = null; // plus de « NOUVEAU » en plein combat
    if (this.mode === 'entrainement' || Save.d.opts.conseils === false || this.etat !== 'combat') return r;
    const cartes = Avant.calculer(av);
    if (cartes.length) { this.etat = 'avant'; Avant.montrer(cartes); }
  } catch (e) { console.warn('avant', e); }
  return r;
};
const _actionAvant = UI.action;
UI.action = function (a, btn) {
  if (a === 'avantGo') return Avant.entrer();
  if (a === 'conseilsRaz') { Save.d.vusAvant = {}; Save.d.opts.conseils = true; Save.write(); return this.options(this.ongletOptDepuis || 'menu', 'jeu'); }
  return _actionAvant.call(this, a, btn);
};
