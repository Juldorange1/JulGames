/* Shiftrun — outil « vitrine » (programme : electron . --vitrine) : fabrique les images de la page Steam,
   les icônes des succès et la bande-annonce, en se servant du vrai jeu. Ne fait rien dans une partie normale. */
(function () {
'use strict';
if (!/[?&]vitrine\b/.test(location.search)) return;
window.VITRINE = true;
const M = window.Moteur, R = window.Rendu, NIV = window.Niveaux;
const attendre = (ms) => new Promise(r => setTimeout(r, ms));
const ST = () => window.shiftrunSteam;
const ecrire = async (nom, blob) => { const b = new Uint8Array(await blob.arrayBuffer()); await ST().vitrineEcrire(nom, b); };
const enBlob = (c, type, q) => new Promise(r => c.toBlob(r, type || 'image/png', q));

// une scène du jeu : le Parfait d'un niveau, arrêté à une fraction de sa durée
async function scene(idx, frac) {
  const Jeu = window.Jeu;
  Jeu.regarder(idx, 'parfait');
  const J = Jeu.J;
  if (!J || !J.rejeu) return null;
  J.vitesse = 0; J.pauseRejeu = true;
  const k = Math.floor(J.rejeu.length * frac);
  for (let i = 0; i < k; i++) { J.ePrec = M.cloner(J.e); Jeu.pas(); }
  await attendre(400);                                    // quelques images dessinées par la boucle du jeu
  return document.getElementById('jeu');
}
// le logo : SHIFTRUN en dégradé, avec les formes des transformations
function logo(g, cx, cy, taille, sousTitre) {
  g.save();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `700 ${taille}px "Chakra Petch", sans-serif`;
  const w = g.measureText('SHIFTRUN').width;
  const gr = g.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
  gr.addColorStop(0, '#d9c6a5'); gr.addColorStop(0.35, '#4fb8ff'); gr.addColorStop(0.7, '#ffd9b0'); gr.addColorStop(1, '#ffe94a');
  g.shadowColor = 'rgba(0,0,0,.75)'; g.shadowBlur = taille * 0.25; g.shadowOffsetY = taille * 0.06;
  g.fillStyle = gr; g.fillText('SHIFTRUN', cx, cy);
  g.shadowBlur = 0; g.shadowOffsetY = 0;
  // les 10 formes, comme leurs hitbox
  const n = 10, s = taille * 0.26, y = cy + taille * 0.62;
  for (let i = 0; i < n; i++) {
    const f = M.FORMES[i], x = cx + (i - (n - 1) / 2) * s * 1.35;
    g.beginPath(); for (let k = 0; k < f.length; k += 2) g.lineTo(x + (f[k] - 6) * s / 12, y + (f[k + 1] - 6) * s / 12); g.closePath();
    g.fillStyle = R.COUL_PHASE[i]; g.fill(); g.lineWidth = Math.max(1, s * 0.08); g.strokeStyle = 'rgba(0,0,0,.6)'; g.stroke();
  }
  if (sousTitre) { g.font = `600 ${Math.round(taille * 0.2)}px "Chakra Petch", sans-serif`; g.fillStyle = '#f4f0fa'; g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 8; g.fillText(sousTitre, cx, y + taille * 0.42); }
  g.restore();
}
// image composée : la scène recadrée (couvre tout), un voile, le logo
function composer(src, w, h, opts) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (src && !opts.transparent) {
    const k = Math.max(w / src.width, h / src.height) * (opts.zoom || 1), sw = w / k, sh = h / k;
    g.drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 0, 0, w, h);
    const v = g.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(8,6,14,.25)'); v.addColorStop(0.55, 'rgba(8,6,14,.55)'); v.addColorStop(1, 'rgba(8,6,14,.85)');
    g.fillStyle = v; g.fillRect(0, 0, w, h);
  }
  if (opts.logo !== false) logo(g, w / 2, h * (opts.y || 0.42), Math.min(w * (opts.l || 0.16), h * 0.32), opts.sous);
  return c;
}
// icônes des succès (256×256, débloquées et grisées)
function iconeSucces(x, rang, gris) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), col = gris ? '#555a66' : window.Jeu.RANGS[rang].c;
  const gr = g.createRadialGradient(100, 90, 10, 128, 128, 128); gr.addColorStop(0, gris ? '#3a3d46' : '#ffffff'); gr.addColorStop(0.35, col); gr.addColorStop(1, '#0b0812');
  g.fillStyle = '#0b0812'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 116, 0, 7); g.fill();
  g.lineWidth = 10; g.strokeStyle = gris ? '#2a2c34' : '#fff6'; g.stroke();
  for (let k = 0; k <= rang; k++) { g.fillStyle = gris ? '#777' : '#fff'; g.beginPath(); g.arc(128 + (k - rang / 2) * 26, 214, 9, 0, 7); g.fill(); }
  g.font = '700 70px "Chakra Petch", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = gris ? '#999' : '#14101e'; g.fillText(x.nom.slice(0, 2).toUpperCase(), 128, 118);
  return c;
}
// bande-annonce : les Parfaits de plusieurs niveaux, avec des titres, enregistrés depuis le canvas du jeu
async function bandeAnnonce() {
  const cv = document.getElementById('jeu');
  const types = ['video/mp4;codecs=avc1.640028', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
  const type = types.find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || 'video/webm';
  const flux = cv.captureStream(60), rec = new MediaRecorder(flux, { mimeType: type, videoBitsPerSecond: 12000000 }), morceaux = [];
  rec.ondataavailable = (e) => { if (e.data.size) morceaux.push(e.data); };
  const g = cv.getContext('2d');
  let titre = null, carte = null;
  window.VITRINE_DESSUS = () => {
    const d = window.devicePixelRatio || 1, w = cv.width / d, h = cv.height / d;
    g.save(); g.setTransform(d, 0, 0, d, 0, 0);
    if (carte) { g.fillStyle = '#0b0812'; g.fillRect(0, 0, w, h); logo(g, w / 2, h * 0.42, Math.min(w * 0.14, h * 0.2), carte); }
    else if (titre) {
      g.font = `700 ${Math.round(h * 0.06)}px "Chakra Petch", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      const tw = g.measureText(titre).width + h * 0.06;
      g.fillStyle = 'rgba(8,6,14,.7)'; g.fillRect(w / 2 - tw / 2, h * 0.78, tw, h * 0.1);
      g.fillStyle = '#ffe94a'; g.fillText(titre, w / 2, h * 0.83);
    }
    g.restore();
  };
  window.VITRINE_SANS_HUD = true;
  rec.start(500);
  carte = 'Change de forme. Va plus vite.'; await attendre(3000); carte = null;
  const plans = [[2, 0.1, '10 transformations, chacune sa forme'], [16, 0.3, 'Chacune a sa compétence'], [24, 0.25, 'Glisser, planer, rebondir, traverser'],
    [31, 0.35, 'Pièges, lasers, scies, plateformes'], [38, 0.3, '48 longs niveaux faits pour le speedrun'], [44, 0.45, 'Peux-tu battre le temps du robot ?']];
  for (const [idx, frac, t] of plans) {
    window.Jeu.regarder(idx, 'parfait');
    const J = window.Jeu.J; const k = Math.floor(J.rejeu.length * frac);
    for (let i = 0; i < k; i++) { J.ePrec = M.cloner(J.e); window.Jeu.pas(); }
    J.vitesse = 1; J.pauseRejeu = false; titre = t;
    await attendre(4200);
  }
  titre = null; carte = 'Bientôt sur Steam'; await attendre(3500);
  rec.stop(); await attendre(800);
  window.VITRINE_DESSUS = null;
  return { blob: new Blob(morceaux, { type }), ext: type.startsWith('video/mp4') ? 'mp4' : 'webm' };
}

window.addEventListener('load', async () => {
  await attendre(1500);
  await document.fonts.ready;
  const Jeu = window.Jeu;
  // 1) captures d'écran 1920×1080 (une par zone ou presque)
  const caps = [2, 8, 14, 20, 26, 32, 38, 45], frac = [0.3, 0.45, 0.35, 0.5, 0.4, 0.3, 0.55, 0.4];
  let meilleure = null;
  for (let k = 0; k < caps.length; k++) {
    const cv = await scene(caps[k], frac[k]);
    if (!cv) continue;
    const copie = document.createElement('canvas'); copie.width = cv.width; copie.height = cv.height; copie.getContext('2d').drawImage(cv, 0, 0);
    if (k === 2) meilleure = copie;
    await ecrire('capture-' + (k + 1) + '.png', await enBlob(copie));
  }
  // scène propre (sans interface) pour les images de couverture
  window.VITRINE_SANS_HUD = true;
  const propre = await scene(14, 0.35);
  if (propre) { meilleure = document.createElement('canvas'); meilleure.width = propre.width; meilleure.height = propre.height; meilleure.getContext('2d').drawImage(propre, 0, 0); }
  window.VITRINE_SANS_HUD = false;
  meilleure = meilleure || document.getElementById('jeu');
  // 2) images de la page Steam
  const formats = [['entete-920x430.png', 920, 430, {}], ['petite-462x174.png', 462, 174, { l: 0.2, y: 0.4 }], ['principale-1232x706.png', 1232, 706, { sous: 'Change de forme. Va plus vite.' }],
    ['verticale-748x896.png', 748, 896, { l: 0.15, y: 0.35, sous: 'Speedrun' }], ['bibliotheque-600x900.png', 600, 900, { l: 0.15, y: 0.3 }],
    ['heros-3840x1240.png', 3840, 1240, { logo: false }], ['fond-1438x810.png', 1438, 810, { logo: false }], ['logo-1280x720.png', 1280, 720, { transparent: true, l: 0.16, y: 0.4 }],
    ['icone-512.png', 512, 512, { logo: false }]];
  for (const [nom, w, h, o] of formats) {
    let c = composer(meilleure, w, h, o);
    if (nom.startsWith('icone')) {           // icône : une goutte et un bloc, gros, sur fond sombre
      const g = c.getContext('2d'); g.fillStyle = '#0b0812'; g.fillRect(0, 0, w, h);
      for (const [p, x, y, s] of [[0, 150, 270, 230], [1, 330, 220, 200], [9, 250, 380, 120]]) {
        const f = M.FORMES[p]; g.beginPath(); for (let k = 0; k < f.length; k += 2) g.lineTo(x + (f[k] - 6) * s / 12, y + (f[k + 1] - 6) * s / 12); g.closePath();
        g.fillStyle = R.COUL_PHASE[p]; g.fill(); g.lineWidth = 12; g.strokeStyle = '#000a'; g.stroke();
      }
      await ecrire('icone-512.png', await enBlob(c));
      const ic = document.createElement('canvas'); ic.width = ic.height = 256; ic.getContext('2d').drawImage(c, 0, 0, 256, 256);
      await ecrire('icone-256.png', await enBlob(ic));
      continue;
    }
    await ecrire(nom, await enBlob(c, nom.includes('heros') || nom.includes('fond') ? 'image/jpeg' : 'image/png', 0.9));
  }
  // 3) icônes et liste des succès (pour Steamworks)
  let csv = 'nom_api;nom;description;icone;icone_grisee\n';
  for (const x of Jeu.SUCCES) for (let r = 0; r < 5; r++) {
    const api = x.id + '_' + (r + 1), nom = x.nom + ' · ' + Jeu.RANGS[r].nom, desc = x.but + ' : ' + x.p[r];
    await ecrire('succes-' + api + '.jpg', await enBlob(iconeSucces(x, r, false), 'image/jpeg', 0.92));
    await ecrire('succes-' + api + '-gris.jpg', await enBlob(iconeSucces(x, r, true), 'image/jpeg', 0.92));
    csv += [api, nom, desc, 'succes-' + api + '.jpg', 'succes-' + api + '-gris.jpg'].join(';') + '\n';
  }
  await ecrire('succes.csv', new Blob(['﻿' + csv], { type: 'text/csv' }));
  // 4) bande-annonce
  const ba = await bandeAnnonce();
  await ecrire('bande-annonce.' + ba.ext, ba.blob);
  await ST().vitrineFini();
});
})();
