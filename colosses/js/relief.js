'use strict';
/* Colosses — vrai relief des dalles et des pierres : chaque pierre projette une ombre dans le joint, ses arêtes
   éclairées et ombrées sont plus marquées, ses bords s'assombrissent (occlusion), et elle reçoit un grain de pierre
   réaliste (bruit fractal sur plusieurs échelles). Tout est calculé une fois, quand le sol est dessiné. */

let _bruitPierre = null;
// bruit fractal : 4 couches de bruit doux superposées, en niveaux de gris, qui se répète sans couture
function bruitPierre() {
  if (_bruitPierre !== null) return _bruitPierre;
  if (typeof document === 'undefined') return (_bruitPierre = false);
  const T = 256, cv = document.createElement('canvas'); cv.width = cv.height = T;
  const x = cv.getContext('2d'), r = RNG(hashStr('grain de pierre'));
  x.fillStyle = 'rgb(128,128,128)'; x.fillRect(0, 0, T, T);
  for (const [cell, a] of [[64, .5], [32, .35], [16, .28], [6, .2]]) {
    const n = T / cell, t = document.createElement('canvas'); t.width = t.height = n;
    const tx = t.getContext('2d'), im = tx.createImageData(n, n);
    for (let i = 0; i < n * n; i++) { const v = r() * 255 | 0; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
    tx.putImageData(im, 0, 0);
    x.save(); x.globalAlpha = a; x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    // trois copies décalées pour que la tuile se raccorde
    for (const [ox, oy] of [[0, 0], [-T, 0], [0, -T], [-T, -T]]) x.drawImage(t, 0, 0, n, n, ox, oy, T + cell, T + cell);
    x.restore();
  }
  // quelques taches et veines sombres
  for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(0,0,0,${r() * .18})`; x.beginPath(); x.arc(r() * T, r() * T, r.range(1, 5), 0, TAU); x.fill(); }
  return (_bruitPierre = cv);
}
const _pierreRelief = pierre;
pierre = function (x, pts, col, r, biseau) {
  const chemin = (dx, dy) => { x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(a + dx, b + dy) : x.moveTo(a + dx, b + dy)); x.closePath(); };
  // ombre de la pierre dans le joint (vers le bas à droite)
  x.save(); chemin(2.5, 3.5); x.fillStyle = `rgba(0,0,0,${.5 * (x.globalAlpha || 1)})`; x.fill(); x.restore();
  _pierreRelief(x, pts, col, r, biseau);
  try {
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9; for (const [a, b] of pts) { minX = Math.min(minX, a); minY = Math.min(minY, b); maxX = Math.max(maxX, a); maxY = Math.max(maxY, b); }
    const w = maxX - minX, h = maxY - minY, ep = biseau || 5;
    x.save(); chemin(0, 0); x.clip();
    // grain de pierre (superposition : éclaircit les clairs, assombrit les sombres)
    const B = bruitPierre();
    if (B) { const pat = x.createPattern(B, 'repeat'); if (pat) { if (pat.setTransform && typeof DOMMatrix !== 'undefined') pat.setTransform(new DOMMatrix().translate(r() * 256, r() * 256)); x.globalCompositeOperation = 'overlay'; x.globalAlpha = .5; x.fillStyle = pat; x.fillRect(minX, minY, w, h); } }
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    // occlusion : les bords de la pierre sont plus sombres que son centre
    chemin(0, 0); x.strokeStyle = 'rgba(0,0,0,.3)'; x.lineWidth = ep * 2.6; x.stroke();
    // arête éclairée en haut à gauche, arête dans l'ombre en bas à droite (plus marquées qu'avant)
    const g = x.createLinearGradient(minX, minY, maxX, maxY);
    g.addColorStop(0, 'rgba(255,250,235,.32)'); g.addColorStop(.45, 'rgba(255,250,235,0)'); g.addColorStop(.55, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.45)');
    chemin(0, 0); x.strokeStyle = g; x.lineWidth = Math.max(2, ep * .7); x.stroke();
    // léger bombé : la pierre accroche la lumière au centre
    const cg = x.createRadialGradient(minX + w * .4, minY + h * .35, 1, minX + w * .5, minY + h * .5, Math.max(w, h) * .7);
    cg.addColorStop(0, 'rgba(255,245,225,.08)'); cg.addColorStop(1, 'rgba(0,0,0,.12)');
    x.fillStyle = cg; x.fillRect(minX, minY, w, h);
    x.restore();
  } catch (e) { try { x.restore(); } catch (e2) { } }
};
