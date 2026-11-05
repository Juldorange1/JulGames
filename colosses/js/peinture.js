'use strict';
/* Colosses — rendu « peint » des boss : chaque corps reçoit un volume éclairé (lumière en haut à gauche,
   ombre en bas à droite), un liseré de lumière sur ses bords éclairés, un reflet, et une matière propre à son espèce
   (métal brossé, os, chitine, écailles, éther, flamme, chair). Tout est calculé ici : aucune image à télécharger.
   La forme ne change pas : la zone touchable (lue sur l'opacité du calque) reste exactement la même. */

const MATIERE_ESP = {
  forgeron: 'metal', metronome: 'metal', horloger: 'metal', sentinelle: 'metal', titan: 'pierre',
  bourreau: 'os', juge: 'os', mante: 'chitine', tisseuse: 'chitine', reine: 'chitine',
  hydre: 'ecailles', serpent: 'ecailles', spectre: 'ether', nebuleuse: 'ether', phenix: 'flamme', chimere: 'chair'
};
const _motifs = {};
// petites tuiles de texture, générées une fois
function motifMatiere(nom) {
  if (_motifs[nom] !== undefined) return _motifs[nom];
  if (typeof document === 'undefined') return (_motifs[nom] = null);
  const T = 96, cv = document.createElement('canvas'); cv.width = cv.height = T;
  const x = cv.getContext('2d'), r = RNG(hashStr('matiere:' + nom));
  const point = (px, py, rr, col) => { x.fillStyle = col; x.beginPath(); x.arc(px, py, rr, 0, TAU); x.fill(); };
  if (nom === 'metal') {
    for (let i = 0; i < 70; i++) { const y = r() * T; x.strokeStyle = `rgba(${r() < .5 ? '255,255,255' : '0,0,0'},${.05 + r() * .12})`; x.lineWidth = r.range(.5, 1.4); x.beginPath(); x.moveTo(0, y); x.lineTo(T, y + r.range(-2, 2)); x.stroke(); }
    for (let i = 0; i < 4; i++) { const px = r() * T, py = r() * T; point(px + .6, py + .6, 2.2, 'rgba(0,0,0,.35)'); point(px, py, 2, 'rgba(255,255,255,.28)'); }
  } else if (nom === 'pierre') {
    for (let i = 0; i < 260; i++) point(r() * T, r() * T, r.range(.4, 1.6), `rgba(${r() < .5 ? '255,255,255' : '0,0,0'},${r() * .16})`);
    for (let i = 0; i < 5; i++) { x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 1; x.beginPath(); let px = r() * T, py = r() * T; x.moveTo(px, py); for (let k = 0; k < 5; k++) { px += r.range(-10, 10); py += r.range(-10, 10); x.lineTo(px, py); } x.stroke(); }
  } else if (nom === 'os') {
    for (let i = 0; i < 40; i++) point(r() * T, r() * T, r.range(.5, 1.4), 'rgba(60,40,20,.22)');
    for (let i = 0; i < 6; i++) { x.strokeStyle = 'rgba(70,50,30,.2)'; x.lineWidth = .8; x.beginPath(); const px = r() * T, py = r() * T; x.moveTo(px, py); x.quadraticCurveTo(px + r.range(-14, 14), py + r.range(-14, 14), px + r.range(-24, 24), py + r.range(-24, 24)); x.stroke(); }
  } else if (nom === 'chitine') {
    for (let i = 0; i < 6; i++) { const y = i * T / 6; const g = x.createLinearGradient(0, y, 0, y + T / 6); g.addColorStop(0, 'rgba(255,255,255,.16)'); g.addColorStop(.3, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.2)'); x.fillStyle = g; x.fillRect(0, y, T, T / 6); }
    for (let i = 0; i < 30; i++) point(r() * T, r() * T, r.range(.4, 1), 'rgba(0,0,0,.25)');
  } else if (nom === 'ecailles') {
    const s = 12;
    for (let row = 0; row * s * .6 < T + s; row++) for (let col = -1; col * s < T + s; col++) {
      const cx = col * s + (row % 2 ? s / 2 : 0), cy = row * s * .6;
      x.strokeStyle = 'rgba(0,0,0,.3)'; x.lineWidth = 1; x.beginPath(); x.arc(cx, cy, s * .55, .15 * Math.PI, .85 * Math.PI); x.stroke();
      x.strokeStyle = 'rgba(255,255,255,.14)'; x.beginPath(); x.arc(cx, cy - 1, s * .5, 1.15 * Math.PI, 1.85 * Math.PI); x.stroke();
    }
  } else if (nom === 'ether') {
    for (let i = 0; i < 14; i++) { const px = r() * T, py = r() * T, rr = r.range(10, 26), g = x.createRadialGradient(px, py, 0, px, py, rr); g.addColorStop(0, `rgba(255,255,255,${r() * .16})`); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(px - rr, py - rr, rr * 2, rr * 2); }
  } else if (nom === 'flamme') {
    for (let i = 0; i < 18; i++) { const px = r() * T, py = r() * T; x.strokeStyle = `rgba(255,${180 + r() * 70 | 0},90,${.12 + r() * .12})`; x.lineWidth = r.range(1, 2.5); x.beginPath(); x.moveTo(px, py); x.bezierCurveTo(px + r.range(-6, 6), py - 8, px + r.range(-6, 6), py - 16, px + r.range(-4, 4), py - 24); x.stroke(); }
  } else {
    for (let i = 0; i < 60; i++) point(r() * T, r() * T, r.range(.6, 2.2), `rgba(${r() < .5 ? '120,20,30' : '0,0,0'},${r() * .2})`);
  }
  return (_motifs[nom] = cv);
}
// calque de travail pour le liseré
let _calqueRim = null;
function peindreCalque(cv, S, R, matiere, intensite) {
  const x = cv.getContext('2d');
  x.save(); x.setTransform(1, 0, 0, 1, 0, 0);
  const cx = S / 2, cy = S / 2, k = intensite === undefined ? 1 : intensite;
  x.globalCompositeOperation = 'source-atop';
  // matière
  const tuile = motifMatiere(matiere);
  if (tuile) { const pat = x.createPattern(tuile, 'repeat'); if (pat) { x.globalAlpha = .75 * k; x.fillStyle = pat; x.fillRect(0, 0, S, S); } }
  // volume : lumière en haut à gauche, ombre en bas à droite
  x.globalAlpha = 1;
  const g = x.createRadialGradient(cx - R * .45, cy - R * .55, R * .05, cx - R * .1, cy - R * .1, R * 1.55);
  g.addColorStop(0, `rgba(255,248,230,${.16 * k})`); g.addColorStop(.28, 'rgba(255,248,230,0)'); g.addColorStop(.62, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,8,${.55 * k})`);
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  // ombre portée vers le bas (le dessous du corps)
  const gb = x.createLinearGradient(0, cy - R * .2, 0, cy + R * 1.2); gb.addColorStop(0, 'rgba(0,0,0,0)'); gb.addColorStop(1, `rgba(0,0,0,${.32 * k})`);
  x.fillStyle = gb; x.fillRect(0, 0, S, S);
  // reflet (plus net sur le métal et la chitine)
  if (matiere === 'metal' || matiere === 'chitine' || matiere === 'ecailles') {
    const rg = x.createRadialGradient(cx - R * .35, cy - R * .45, 0, cx - R * .35, cy - R * .45, R * .35);
    rg.addColorStop(0, `rgba(255,255,255,${.22 * k})`); rg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = rg; x.fillRect(0, 0, S, S);
  }
  // liseré de lumière : le bord du corps tourné vers la lumière (silhouette moins elle-même décalée)
  if (!_calqueRim) _calqueRim = document.createElement('canvas');
  if (_calqueRim.width < S) _calqueRim.width = _calqueRim.height = S;
  const rx = _calqueRim.getContext('2d'), d = Math.max(1.5, R * .045);
  rx.setTransform(1, 0, 0, 1, 0, 0); rx.globalCompositeOperation = 'source-over'; rx.globalAlpha = 1; rx.clearRect(0, 0, S, S);
  rx.drawImage(cv, 0, 0, S, S, 0, 0, S, S);
  rx.globalCompositeOperation = 'source-in'; rx.fillStyle = matiere === 'flamme' ? '#ffe9a8' : matiere === 'ether' ? '#e8dcff' : '#fff6e0'; rx.fillRect(0, 0, S, S);
  rx.globalCompositeOperation = 'destination-out'; rx.drawImage(cv, 0, 0, S, S, d, d, S, S);
  x.globalCompositeOperation = 'source-atop'; x.globalAlpha = .38 * k; x.drawImage(_calqueRim, 0, 0, S, S, 0, 0, S, S); // source-atop : ne change jamais l'opacité (zone touchable intacte)
  x.restore();
}

// les boss : on peint le calque du corps juste avant qu'il soit détouré et posé dans l'arène
const _corpsFinPeint = corpsFin;
corpsFin = function (cm, b, h) {
  try {
    if (!window.PEINTURE_OFF && corpsInfo && calqueCorps && typeof document !== 'undefined' && cm !== calqueCorps.getContext('2d') && b && b.def) {
      const { S, k } = corpsInfo, R = b.r * k * 1.15;
      peindreCalque(calqueCorps, S, R, MATIERE_ESP[b.def.esp] || 'chair', b.spectral > 0 ? .4 : 1);
    }
  } catch (e) { }
  return _corpsFinPeint.apply(this, arguments);
};
