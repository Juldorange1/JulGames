'use strict';
/* PULSAR — icônes du joueur (dessinées, aucune image) et collection */

var COULEURS = ['#5dff8a', '#5ad0ff', '#ffd23f', '#ff4d6d', '#c06bff', '#ffffff', '#ff8a3d', '#7cffea', '#ff6fd8', '#3d6bff',
  '#b4ff3d', '#ff3d3d', '#ffe9a8', '#3dffb4', '#8a5cff', '#202030', '#ff9ec7', '#00e5ff', '#ffb000', '#9b2cff'];
var NB_CUBES = 40;
var TRAINEES = ['Ruban', 'Étincelles', 'Arc-en-ciel', 'Flammes', 'Pixels', 'Néon double', 'Comète', 'Aucune'];
var EXPLOSIONS = ['Éclats', 'Onde', 'Pixels', 'Supernova', 'Confettis', 'Spirale'];

function ombre(c, f) {  // assombrir / éclaircir une couleur hex
  var n = parseInt(c.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
  return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
}

/* Cube : cadre (d % 5) x visage (floor(d/5) % 8) */
function dessinerCube(ctx, d, c1, c2, s) {
  var h = s / 2, cadre = d % 5, visage = Math.floor(d / 5) % 8;
  ctx.save();
  ctx.lineJoin = 'round';
  // corps
  var gr = ctx.createLinearGradient(-h, -h, h, h);
  gr.addColorStop(0, ombre(c1, 0.25)); gr.addColorStop(1, ombre(c1, -0.25));
  ctx.fillStyle = gr;
  ctx.beginPath();
  if (cadre === 2) arrondi(ctx, -h, -h, s, s, s * 0.22);
  else if (cadre === 3) { var e = s * 0.18; ctx.moveTo(-h + e, -h); ctx.lineTo(h - e, -h); ctx.lineTo(h, -h + e); ctx.lineTo(h, h - e); ctx.lineTo(h - e, h); ctx.lineTo(-h + e, h); ctx.lineTo(-h, h - e); ctx.lineTo(-h, -h + e); ctx.closePath(); }
  else ctx.rect(-h, -h, s, s);
  ctx.fill();
  ctx.lineWidth = Math.max(1, s * 0.07); ctx.strokeStyle = '#000'; ctx.stroke();
  if (cadre === 1 || cadre === 4) {
    ctx.strokeStyle = c2; ctx.lineWidth = Math.max(1, s * 0.06);
    var m = s * 0.16; ctx.strokeRect(-h + m, -h + m, s - 2 * m, s - 2 * m);
    if (cadre === 4) { ctx.beginPath(); ctx.moveTo(-h + m, -h + m); ctx.lineTo(h - m, h - m); ctx.moveTo(h - m, -h + m); ctx.lineTo(-h + m, h - m); ctx.globalAlpha = 0.35; ctx.stroke(); ctx.globalAlpha = 1; }
  }
  // visage
  ctx.fillStyle = c2; ctx.strokeStyle = c2; ctx.lineWidth = Math.max(1, s * 0.08);
  var u = s / 10;
  switch (visage) {
    case 0: ctx.fillRect(-3 * u, -2.5 * u, 2 * u, 2 * u); ctx.fillRect(1 * u, -2.5 * u, 2 * u, 2 * u); ctx.fillRect(-3 * u, 1.5 * u, 6 * u, 1.2 * u); break;
    case 1: ctx.beginPath(); ctx.arc(0, -0.5 * u, 2.6 * u, 0, 7); ctx.fill(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0.6 * u, -0.5 * u, 1.1 * u, 0, 7); ctx.fill(); break;
    case 2: ctx.fillRect(-3.5 * u, -1.8 * u, 7 * u, 1.6 * u); ctx.fillStyle = '#000'; ctx.fillRect(1.2 * u, -1.5 * u, 1.4 * u, 1 * u); ctx.fillStyle = c2; ctx.fillRect(-2 * u, 2 * u, 4 * u, 0.8 * u); break;
    case 3: ctx.beginPath(); ctx.arc(-1.8 * u, -1.5 * u, 0.9 * u, 0, 7); ctx.arc(1.8 * u, -1.5 * u, 0.9 * u, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(0, 0.5 * u, 2.5 * u, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); break;
    case 4: ctx.beginPath(); ctx.moveTo(-3 * u, -3 * u); ctx.lineTo(-1 * u, -1 * u); ctx.moveTo(-1 * u, -3 * u); ctx.lineTo(-3 * u, -1 * u); ctx.moveTo(1 * u, -3 * u); ctx.lineTo(3 * u, -1 * u); ctx.moveTo(3 * u, -3 * u); ctx.lineTo(1 * u, -1 * u); ctx.moveTo(-2 * u, 2 * u); ctx.lineTo(2 * u, 2 * u); ctx.stroke(); break;
    case 5: ctx.beginPath(); ctx.moveTo(0, -3 * u); ctx.lineTo(3 * u, 0); ctx.lineTo(0, 3 * u); ctx.lineTo(-3 * u, 0); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(0, -1.3 * u); ctx.lineTo(1.3 * u, 0); ctx.lineTo(0, 1.3 * u); ctx.lineTo(-1.3 * u, 0); ctx.fill(); break;
    case 6: for (var i = -2; i <= 2; i++) ctx.fillRect(i * 1.6 * u - 0.5 * u, -3.5 * u, u, 7 * u); ctx.fillStyle = '#000'; ctx.fillRect(-3.6 * u, -1 * u, 7.2 * u, 2 * u); ctx.fillStyle = c2; ctx.fillRect(-2.6 * u, -0.5 * u, 1.4 * u, u); ctx.fillRect(1.2 * u, -0.5 * u, 1.4 * u, u); break;
    case 7: ctx.beginPath(); ctx.moveTo(-3.5 * u, 2.5 * u); ctx.lineTo(-1 * u, 2.5 * u); ctx.lineTo(-1 * u, -1 * u); ctx.lineTo(2 * u, -1 * u); ctx.lineTo(2 * u, -3 * u); ctx.stroke(); ctx.beginPath(); ctx.arc(2 * u, -3 * u, 0.9 * u, 0, 7); ctx.arc(-3.5 * u, 2.5 * u, 0.9 * u, 0, 7); ctx.fill(); ctx.fillRect(0.6 * u, 1.2 * u, 2.6 * u, 2.6 * u); break;
  }
  ctx.restore();
}
function arrondi(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

/* Joueur dans un mode donné. s = taille d'un bloc en pixels. ang en radians. */
function dessinerJoueur(ctx, mode, ic, x, y, s, ang, g) {
  var c1 = COULEURS[ic.c1] || COULEURS[0], c2 = COULEURS[ic.c2] || COULEURS[5];
  ctx.save(); ctx.translate(x, y);
  if (g === -1 && mode !== 'cube' && mode !== 'boule') ctx.scale(1, -1);
  if (mode === 'cube') { ctx.rotate(ang); if (g === -1) ctx.scale(1, -1); dessinerCube(ctx, ic.cube, c1, c2, s * 0.9); }
  else if (mode === 'vaisseau') {
    ctx.rotate(ang);
    ctx.fillStyle = c1; ctx.strokeStyle = '#000'; ctx.lineWidth = s * 0.06;
    ctx.beginPath(); ctx.moveTo(s * 0.6, s * 0.1); ctx.lineTo(-s * 0.15, -s * 0.05); ctx.lineTo(-s * 0.55, -s * 0.3); ctx.lineTo(-s * 0.45, s * 0.35); ctx.lineTo(s * 0.35, s * 0.35); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(-s * 0.45, s * 0.15); ctx.lineTo(s * 0.3, s * 0.15); ctx.lineTo(s * 0.35, s * 0.3); ctx.lineTo(-s * 0.45, s * 0.3); ctx.fill();
    ctx.save(); ctx.translate(-s * 0.08, -s * 0.22); dessinerCube(ctx, ic.cube, c1, c2, s * 0.42); ctx.restore();
  } else if (mode === 'onde') {
    ctx.rotate(ang);
    ctx.fillStyle = c1; ctx.strokeStyle = '#000'; ctx.lineWidth = s * 0.05;
    ctx.beginPath(); ctx.moveTo(s * 0.32, 0); ctx.lineTo(-s * 0.25, -s * 0.24); ctx.lineTo(-s * 0.13, 0); ctx.lineTo(-s * 0.25, s * 0.24); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(s * 0.14, 0); ctx.lineTo(-s * 0.1, -s * 0.09); ctx.lineTo(-s * 0.1, s * 0.09); ctx.fill();
  } else if (mode === 'boule') {
    ctx.rotate(ang);
    var r = s * 0.42;
    var gr = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    gr.addColorStop(0, ombre(c1, 0.35)); gr.addColorStop(1, ombre(c1, -0.3));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = s * 0.06; ctx.stroke();
    ctx.strokeStyle = c2; ctx.lineWidth = s * 0.07;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0.2, 1.4); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0.2 + Math.PI, 1.4 + Math.PI); ctx.stroke();
    ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, 7); ctx.fill();
  } else if (mode === 'ovni') {
    ctx.rotate(ang);
    ctx.fillStyle = 'rgba(180,240,255,0.45)'; ctx.beginPath(); ctx.arc(0, -s * 0.05, s * 0.3, Math.PI, 0); ctx.fill();
    ctx.save(); ctx.translate(0, -s * 0.12); dessinerCube(ctx, ic.cube, c1, c2, s * 0.32); ctx.restore();
    ctx.fillStyle = c1; ctx.strokeStyle = '#000'; ctx.lineWidth = s * 0.05;
    ctx.beginPath(); ctx.ellipse(0, s * 0.08, s * 0.5, s * 0.17, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = c2; for (var i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(i * s * 0.18, s * 0.1, s * 0.045, 0, 7); ctx.fill(); }
  }
  ctx.restore();
}

/* ---------- Déblocages ---------- */
function niveauxFinis(d) { var n = 0; for (var k in d.parcours.niv) if (d.parcours.niv[k].fini) n++; return n; }
function condCube(i) {
  if (i < 3) return { ok: function () { return true; }, txt: 'De base' };
  if (i < 25) { var n = (i - 2) * 2; return { ok: function (d) { return niveauxFinis(d) >= n; }, txt: 'Finir ' + n + ' niveaux du Parcours' }; }
  if (i < 32) { var e = (i - 24) * 60; return { ok: function (d) { return d.stats.eclats >= e; }, txt: 'Ramasser ' + e + ' éclats au total' }; }
  var g = i - 31; return { ok: function (d) { return d.stats.grandsBoss >= g; }, txt: 'Vaincre ' + g + ' grand' + (g > 1 ? 's' : '') + ' boss' };
}
function condCouleur(i) {
  if (i < 6) return { ok: function () { return true; }, txt: 'De base' };
  var n = (i - 5) * 25; return { ok: function (d) { return d.stats.eclats >= n; }, txt: 'Ramasser ' + n + ' éclats au total' };
}
function condTrainee(i) {
  if (i === 0 || i === 7) return { ok: function () { return true; }, txt: 'De base' };
  var n = i * 150; return { ok: function (d) { return d.stats.essais >= n; }, txt: n + ' essais au total' };
}
function condExplosion(i) {
  if (i === 0) return { ok: function () { return true; }, txt: 'De base' };
  var n = i * 5; return { ok: function (d) { return Object.keys(d.succes).length >= n; }, txt: n + ' succès obtenus' };
}
