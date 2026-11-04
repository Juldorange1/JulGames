'use strict';
/* Colosses — décor détaillé : sols texturés (relief, usure, mousse, lave, glace…), murs en blocs, arrière-plan
   propre à chaque thème autour de l'arène, et ambiance animée (braises, neige, lucioles, rayons de lumière). */

// ---------- Outils de texture ----------
// taches douces : un petit bruit agrandi avec lissage (variation naturelle des couleurs)
function tachesDouces(x, r, cell, alpha, cols) {
  const w = Math.ceil(W / cell), h = Math.ceil(H / cell), t = document.createElement('canvas'); t.width = w; t.height = h;
  const tx = t.getContext('2d'), im = tx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) { const c = cols[Math.floor(r() * cols.length)]; im.data[i * 4] = c[0]; im.data[i * 4 + 1] = c[1]; im.data[i * 4 + 2] = c[2]; im.data[i * 4 + 3] = Math.floor(r() * 255); }
  tx.putImageData(im, 0, 0);
  x.save(); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.globalAlpha = alpha; x.drawImage(t, 0, 0, W, H); x.restore();
}
// une pierre en relief : remplissage, biseau clair en haut à gauche et sombre en bas à droite
function pierre(x, pts, col, r, biseau) {
  x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath();
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9; for (const [a, b] of pts) { minX = Math.min(minX, a); minY = Math.min(minY, b); maxX = Math.max(maxX, a); maxY = Math.max(maxY, b); }
  const g = x.createLinearGradient(minX, minY, maxX, maxY); g.addColorStop(0, col(6 + r() * 3)); g.addColorStop(1, col(-4 - r() * 3));
  x.fillStyle = g; x.fill();
  x.save(); x.clip();
  const gb = x.createLinearGradient(minX, minY, maxX, maxY); gb.addColorStop(0, 'rgba(255,255,255,.22)'); gb.addColorStop(.5, 'rgba(255,255,255,0)'); gb.addColorStop(.5, 'rgba(0,0,0,0)'); gb.addColorStop(1, 'rgba(0,0,0,.5)');
  x.strokeStyle = gb; x.lineWidth = biseau || 5; x.stroke();
  // grain et éclats
  for (let i = 0, n = (maxX - minX) * (maxY - minY) / 120; i < n; i++) { x.fillStyle = `rgba(${r() < .5 ? '255,255,255' : '0,0,0'},${r() * .09})`; x.fillRect(minX + r() * (maxX - minX), minY + r() * (maxY - minY), 1 + r() * 2, 1 + r() * 2); }
  x.restore();
  x.strokeStyle = 'rgba(0,0,0,.55)'; x.lineWidth = 1.5; x.stroke();
}
function fissure(x, r, x0, y0, L, col, w) {
  x.strokeStyle = col; x.lineWidth = w || 1.2; x.beginPath(); x.moveTo(x0, y0);
  let a = r() * TAU, px = x0, py = y0;
  for (let k = 0; k < L; k++) { a += r.range(-.7, .7); px += Math.cos(a) * r.range(6, 14); py += Math.sin(a) * r.range(6, 14); x.lineTo(px, py); if (r() < .15) { x.moveTo(px, py); } }
  x.stroke();
}
function carreauxGrille(cote, dec) { const out = []; for (let gy = AR.y - cote; gy < AR.y + AR.h + cote; gy += cote) for (let gx = AR.x - cote; gx < AR.x + AR.w + cote; gx += cote) out.push([gx + (dec && (gy / cote | 0) % 2 ? cote / 2 : 0), gy]); return out; }
function polyJitter(r, cx, cy, rr, n, j) { const p = []; for (let k = 0; k < n; k++) { const a = k * TAU / n + r() * j, q = rr * r.range(1 - j, 1 + j * .4); p.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); } return p; }

// veines de lave lumineuses (calque animé pour le volcan)
let calqueVeines = null, calqueVeinesCle = '';

// ---------- Sol ----------
texteSol = function () {
  const th = Decor.themeActif(), hue = G.def ? G.def.hue : 260, cle = th + '|' + Arene.version + '|' + hue;
  if (texSol && cle === texSolCle) return texSol;
  texSolCle = cle;
  const c = texSol || document.createElement('canvas'); c.width = W; c.height = H; texSol = c;
  const x = c.getContext('2d'), r = RNG(hashNum(Arene.version * 13 + hue + th.length * 977)), T = THEMES[th], [sh, ss, sl] = T.sol;
  const col = (dl, ds) => hsl(sh + r.range(-5, 5), ss + (ds || 0), Math.max(2, sl + dl));
  x.clearRect(0, 0, W, H);
  x.fillStyle = hsl(sh, ss, sl * .55); x.fillRect(0, 0, W, H);
  if (th === 'volcan') {
    // colonnes de basalte hexagonales, lave qui luit entre elles
    x.fillStyle = '#2a0600'; x.fillRect(0, 0, W, H);
    const s = 44, hx = s * Math.sqrt(3);
    for (let row = -1, y = AR.y - s; y < AR.y + AR.h + s; row++, y += s * 1.5) for (let xx = AR.x - hx + (row % 2 ? hx / 2 : 0); xx < AR.x + AR.w + hx; xx += hx) {
      const rr = s * r.range(.86, .95), pts = []; for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + Math.PI / 6; pts.push([xx + Math.cos(a) * rr + r.range(-2, 2), y + Math.sin(a) * rr + r.range(-2, 2)]); }
      pierre(x, pts, dl => hsl(15, 10 + r() * 6, Math.max(3, 9 + dl)), r, 6);
      if (r() < .35) fissure(x, r, xx, y, 3, 'rgba(0,0,0,.6)', 1);
    }
  } else if (th === 'neant') {
    // vide étoilé, nébuleuses, îlots de roche suspendus
    x.fillStyle = '#05030c'; x.fillRect(0, 0, W, H);
    tachesDouces(x, r, 90, .55, [[80, 40, 160], [30, 60, 140], [140, 40, 120], [10, 5, 30]]);
    for (let i = 0; i < 700; i++) { const b = r(); x.fillStyle = `rgba(255,255,255,${b * .7})`; x.fillRect(AR.x + r() * AR.w, AR.y + r() * AR.h, b < .9 ? 1.2 : 2.2, b < .9 ? 1.2 : 2.2); }
    for (let i = 0; i < 70; i++) { const cx = AR.x + r() * AR.w, cy = AR.y + r() * AR.h, rr = r.range(30, 75); const pts = polyJitter(r, cx, cy, rr, 7, .35); x.fillStyle = 'rgba(0,0,0,.45)'; x.beginPath(); pts.forEach(([a, b], k) => k ? x.lineTo(a + 6, b + 10) : x.moveTo(a + 6, b + 10)); x.fill(); pierre(x, pts, dl => hsl(265, 18, Math.max(4, 14 + dl)), r, 5); x.strokeStyle = 'rgba(170,130,255,.35)'; x.lineWidth = 1; x.stroke(); }
  } else if (th === 'glace') {
    x.fillStyle = hsl(208, 45, 17); x.fillRect(0, 0, W, H);
    tachesDouces(x, r, 60, .35, [[70, 120, 160], [20, 50, 80], [130, 170, 200]]);
    for (let i = 0; i < 46; i++) { const cx = AR.x + r() * AR.w, cy = AR.y + r() * AR.h; const pts = polyJitter(r, cx, cy, r.range(70, 130), 6, .3); x.globalAlpha = .55; pierre(x, pts, dl => hsl(202, 38, Math.max(8, 24 + dl * 1.2)), r, 4); x.globalAlpha = 1; }
    for (let i = 0; i < 90; i++) fissure(x, r, AR.x + r() * AR.w, AR.y + r() * AR.h, r.int(4, 9), 'rgba(220,240,255,.22)', 1);
    // reflets
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 18; i++) { const px = AR.x + r() * AR.w, py = AR.y + r() * AR.h, L = r.range(60, 160); const g = x.createLinearGradient(px, py, px + L, py - L); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.07)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.strokeStyle = g; x.lineWidth = r.range(6, 16); x.beginPath(); x.moveTo(px, py); x.lineTo(px + L, py - L); x.stroke(); }
    x.globalCompositeOperation = 'source-over';
  } else if (th === 'metal') {
    const s = 80;
    for (const [gx, gy] of carreauxGrille(s, false)) {
      const grille = r() < .1;
      pierre(x, [[gx + 2, gy + 2], [gx + s - 2, gy + 2], [gx + s - 2, gy + s - 2], [gx + 2, gy + s - 2]], dl => hsl(215, 8 + (grille ? 0 : r() * 4), Math.max(5, 17 + dl)), r, 4);
      if (grille) { x.fillStyle = '#05070a'; for (let k = 0; k < 6; k++) x.fillRect(gx + 12, gy + 12 + k * 10, s - 24, 5); x.globalCompositeOperation = 'lighter'; x.fillStyle = 'rgba(255,120,30,.18)'; for (let k = 0; k < 6; k++) x.fillRect(gx + 12, gy + 13 + k * 10, s - 24, 3); x.globalCompositeOperation = 'source-over'; }
      else { x.fillStyle = 'rgba(220,230,240,.35)'; for (const [a, b] of [[9, 9], [s - 9, 9], [9, s - 9], [s - 9, s - 9]]) { x.beginPath(); x.arc(gx + a, gy + b, 2.4, 0, TAU); x.fill(); x.fillStyle = 'rgba(0,0,0,.5)'; x.beginPath(); x.arc(gx + a + .8, gy + b + .8, 1.4, 0, TAU); x.fill(); x.fillStyle = 'rgba(220,230,240,.35)'; } }
      if (r() < .18) { const g = x.createRadialGradient(gx + s / 2, gy + s / 2, 2, gx + s / 2, gy + s / 2, s * .6); g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(gx, gy, s, s); }
    }
    // bandes de danger au bord
    x.save(); x.beginPath(); x.rect(AR.x, AR.y, AR.w, 16); x.rect(AR.x, AR.y + AR.h - 16, AR.w, 16); x.clip();
    for (let px = AR.x - 20; px < AR.x + AR.w + 20; px += 28) { x.fillStyle = 'rgba(240,180,20,.55)'; x.beginPath(); x.moveTo(px, AR.y); x.lineTo(px + 14, AR.y); x.lineTo(px - 2, AR.y + AR.h); x.lineTo(px - 16, AR.y + AR.h); x.fill(); }
    x.restore();
  } else {
    // temple et ruines : grandes dalles appareillées, usées, fissurées
    const s = th === 'temple' ? 92 : 78;
    if (th === 'ruines') { x.fillStyle = hsl(30, 25, 12); x.fillRect(0, 0, W, H); tachesDouces(x, r, 30, .6, [[60, 45, 30], [35, 28, 20], [70, 80, 40]]); }
    for (const [gx, gy] of carreauxGrille(s, true)) {
      if (th === 'ruines' && r() < .14) continue; // dalle arrachée : on voit la terre
      const double = th === 'temple' && r() < .25, w = double ? s * 2 : s;
      const j = th === 'ruines' ? 5 : 1.5, pts = [[gx + 3 + r.range(-j, j), gy + 3 + r.range(-j, j)], [gx + w - 3 + r.range(-j, j), gy + 3 + r.range(-j, j)], [gx + w - 3 + r.range(-j, j), gy + s - 3 + r.range(-j, j)], [gx + 3 + r.range(-j, j), gy + s - 3 + r.range(-j, j)]];
      if (th === 'ruines' && r() < .3) pts.splice(r.int(0, 3), 1, [gx + s * r.range(.3, .7), gy + s * r.range(.3, .7)]);
      pierre(x, pts, dl => col(dl), r, 6);
      if (r() < .35) fissure(x, r, gx + r() * w, gy + r() * s, r.int(3, 7), 'rgba(0,0,0,.5)', 1.2);
    }
    if (th === 'temple') {
      // mosaïque centrale gravée
      x.save(); x.translate(CX, CY);
      for (const [rr, w] of [[250, 10], [210, 3], [130, 6]]) { x.strokeStyle = 'rgba(0,0,0,.4)'; x.lineWidth = w + 2; x.beginPath(); x.arc(0, 0, rr, 0, TAU); x.stroke(); x.strokeStyle = 'rgba(210,190,150,.18)'; x.lineWidth = w; x.beginPath(); x.arc(0, 0, rr, 0, TAU); x.stroke(); }
      for (let i = 0; i < 16; i++) { x.rotate(TAU / 16); x.strokeStyle = 'rgba(210,190,150,.16)'; x.lineWidth = 3; x.beginPath(); x.moveTo(130, 0); x.lineTo(210, 0); x.stroke(); x.fillStyle = 'rgba(210,190,150,.14)'; x.beginPath(); x.moveTo(230, -8); x.lineTo(242, 0); x.lineTo(230, 8); x.lineTo(218, 0); x.closePath(); x.fill(); }
      x.restore();
    } else {
      // mousse, herbes, racines
      tachesDouces(x, r, 22, .28, [[60, 110, 40], [40, 80, 30], [0, 0, 0]]);
      for (let i = 0; i < 420; i++) { const px = AR.x + r() * AR.w, py = AR.y + r() * AR.h; x.strokeStyle = hsl(85 + r() * 40, 45, 18 + r() * 18, .8); x.lineWidth = 1.4; for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(px + k * 2, py); x.quadraticCurveTo(px + k * 2 + r.range(-4, 4), py - 6, px + k * 2 + r.range(-6, 6), py - r.range(7, 13)); x.stroke(); } }
      for (let i = 0; i < 8; i++) fissure(x, r, AR.x + r() * AR.w, AR.y + r() * AR.h, r.int(10, 18), 'rgba(50,35,20,.55)', 3);
    }
  }
  // poussière, gravats, taches
  for (let i = 0; i < 160; i++) { const px = AR.x + r() * AR.w, py = AR.y + r() * AR.h, rr = r.range(1.5, 4); x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(px + 1.5, py + 1.5, rr, rr * .7, 0, 0, TAU); x.fill(); x.fillStyle = hsl(sh, ss * .6, sl + 14 + r() * 10, .6); x.beginPath(); x.ellipse(px, py, rr, rr * .7, r() * 3, 0, TAU); x.fill(); }
  tachesDouces(x, r, 120, .25, [[0, 0, 0], [0, 0, 0], [255, 255, 255]]);
  // sceau du boss, discret
  x.strokeStyle = hsl(hue, 80, 55, .08); x.lineWidth = 3;
  x.beginPath(); x.arc(CX, CY, 180, 0, TAU); x.stroke();
  // ombre des murs sur le sol et vignette
  const bb = { x: AR.x, y: AR.y, w: AR.w, h: AR.h };
  for (const [x0, y0, x1, y1, rx, ry, rw, rh] of [[0, bb.y, 0, bb.y + 60, bb.x, bb.y, bb.w, 60], [0, bb.y + bb.h, 0, bb.y + bb.h - 35, bb.x, bb.y + bb.h - 35, bb.w, 35], [bb.x, 0, bb.x + 45, 0, bb.x, bb.y, 45, bb.h], [bb.x + bb.w, 0, bb.x + bb.w - 45, 0, bb.x + bb.w - 45, bb.y, 45, bb.h]]) {
    const g = x.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(rx, ry, rw, rh);
  }
  const v = x.createRadialGradient(CX, CY, 260, CX, CY, 780); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)');
  x.fillStyle = v; x.fillRect(0, 0, W, H);
  // calque de lave (volcan) : les joints entre les colonnes, qui pulsent à l'affichage
  calqueVeines = null;
  if (th === 'volcan') {
    calqueVeines = document.createElement('canvas'); calqueVeines.width = W; calqueVeines.height = H;
    const vx = calqueVeines.getContext('2d'), s = 44, hx = s * Math.sqrt(3);
    vx.strokeStyle = 'rgba(255,110,20,.9)'; vx.lineWidth = 3; vx.shadowColor = '#ff6a00'; vx.shadowBlur = 10;
    for (let row = -1, y = AR.y - s; y < AR.y + AR.h + s; row++, y += s * 1.5) for (let xx = AR.x - hx + (row % 2 ? hx / 2 : 0); xx < AR.x + AR.w + hx; xx += hx) {
      if (r() > .45) continue;
      vx.beginPath(); for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + Math.PI / 6; vx.lineTo(xx + Math.cos(a) * s, y + Math.sin(a) * s); } vx.closePath(); vx.stroke();
    }
  }
  return c;
};

// ---------- Fond autour de l'arène et murs en blocs ----------
texteFond = function () {
  const th = Decor.themeActif(), cle = th + '|' + Arene.kind;
  if (texFond && texFondCle === cle) return texFond;
  texFondCle = cle;
  const c = texFond || document.createElement('canvas'); c.width = W; c.height = H; texFond = c;
  const x = c.getContext('2d'), r = RNG(hashStr(cle)), T = THEMES[th];
  x.clearRect(0, 0, W, H);
  // arrière-plan : ce qui entoure l'arène
  const fonds = {
    volcan: [[40, 6, 0], [90, 20, 0], [10, 2, 0]], temple: [[30, 24, 18], [12, 10, 8], [50, 40, 28]], glace: [[20, 40, 60], [180, 210, 230], [10, 20, 35]],
    neant: [[10, 5, 30], [60, 30, 120], [2, 2, 8]], ruines: [[16, 26, 12], [40, 55, 25], [8, 10, 6]], metal: [[16, 18, 22], [40, 46, 54], [6, 7, 9]]
  };
  x.fillStyle = '#030208'; x.fillRect(0, 0, W, H);
  tachesDouces(x, r, 50, .9, fonds[th] || fonds.temple);
  if (th === 'volcan') { x.globalCompositeOperation = 'lighter'; for (let i = 0; i < 26; i++) { const px = r() * W, py = r() < .5 ? r() * AR.y : AR.y + AR.h + r() * (H - AR.y - AR.h); x.drawImage(glow('rgba(255,90,10,.35)', r.range(20, 60)), px - 40, py - 40); } x.globalCompositeOperation = 'source-over'; }
  if (th === 'neant') for (let i = 0; i < 500; i++) { x.fillStyle = `rgba(255,255,255,${r() * .8})`; x.fillRect(r() * W, r() * H, 1.3, 1.3); }
  if (th === 'glace') for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(240,250,255,${r() * .5})`; x.beginPath(); x.arc(r() * W, r() * H, r.range(.6, 2.2), 0, TAU); x.fill(); }
  if (th === 'ruines') for (let i = 0; i < 160; i++) { const px = r() * W, py = r() * H; x.fillStyle = hsl(90 + r() * 40, 40, 10 + r() * 14, .8); x.beginPath(); x.ellipse(px, py, r.range(6, 18), r.range(4, 10), r() * 3, 0, TAU); x.fill(); }
  // mur d'enceinte : blocs en relief, chaperon clair, ombre vers l'intérieur
  const ep = 26;
  const coulMur = dl => { const m = /#(..)(..)(..)/.exec(T.mur); const v = [1, 2, 3].map(i => parseInt(m[i], 16)); const k = 1 + dl / 25; return `rgb(${v.map(q => Math.max(0, Math.min(255, Math.round(q * k)))).join(',')})`; };
  if (Arene.kind === 'cercle') {
    const R0 = AR.h / 2 - 2, R1 = AR.h / 2 + ep, n = 40;
    for (let i = 0; i < n; i++) { const a0 = i * TAU / n, a1 = (i + 1) * TAU / n - .01, pts = []; for (let k = 0; k <= 4; k++) { const a = a0 + (a1 - a0) * k / 4; pts.push([CX + Math.cos(a) * R1, CY + Math.sin(a) * R1]); } for (let k = 4; k >= 0; k--) { const a = a0 + (a1 - a0) * k / 4; pts.push([CX + Math.cos(a) * R0, CY + Math.sin(a) * R0]); } pierre(x, pts, dl => coulMur(dl + r.range(-4, 4)), r, 5); }
  } else {
    const bloc = (bx, by, bw, bh) => pierre(x, [[bx + 1, by + 1], [bx + bw - 1, by + 1], [bx + bw - 1, by + bh - 1], [bx + 1, by + bh - 1]], dl => coulMur(dl + r.range(-5, 5)), r, 4);
    for (let px = AR.x - ep, k = 0; px < AR.x + AR.w + ep; k++) { const w = r.range(40, 64); bloc(px, AR.y - ep, Math.min(w, AR.x + AR.w + ep - px), ep - 2); bloc(px + 20, AR.y + AR.h + 2, Math.min(w, AR.x + AR.w + ep - px - 20), ep - 2); px += w; }
    for (let py = AR.y - 2, k = 0; py < AR.y + AR.h + 2; k++) { const h = r.range(40, 64); bloc(AR.x - ep, py, ep - 2, Math.min(h, AR.y + AR.h + 2 - py)); bloc(AR.x + AR.w + 2, py, ep - 2, Math.min(h, AR.y + AR.h + 2 - py)); py += h; }
    // ombre portée du mur à l'extérieur
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(AR.x - ep, AR.y + AR.h + ep, AR.w + 2 * ep, 8);
  }
  x.strokeStyle = 'rgba(0,0,0,.7)'; x.lineWidth = 3;
  if (Arene.kind === 'cercle') { x.beginPath(); x.arc(CX, CY, AR.h / 2 - 1, 0, TAU); x.stroke(); }
  else x.strokeRect(AR.x - 1, AR.y - 1, AR.w + 2, AR.h + 2);
  return c;
};

// ---------- Piliers en pierre taillée ----------
dessinerPiliers = function (c) {
  for (const pl of Arene.piliers) {
    const th = Decor.themeActif();
    c.fillStyle = 'rgba(0,0,0,.5)'; c.beginPath(); c.ellipse(pl.x + 14, pl.y + 16, pl.r * 1.08, pl.r * .92, 0, 0, TAU); c.fill();
    const base = th === 'glace' ? 205 : th === 'volcan' ? 15 : th === 'neant' ? 265 : 35;
    const g = c.createRadialGradient(pl.x - pl.r * .4, pl.y - pl.r * .5, 2, pl.x, pl.y, pl.r * 1.1);
    g.addColorStop(0, hsl(base, 12, 46)); g.addColorStop(.55, hsl(base, 14, 22)); g.addColorStop(1, hsl(base, 18, 8));
    c.fillStyle = g; c.beginPath(); c.arc(pl.x, pl.y, pl.r, 0, TAU); c.fill();
    // cannelures et chapiteau
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 2;
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12; c.beginPath(); c.moveTo(pl.x + Math.cos(a) * pl.r * .55, pl.y + Math.sin(a) * pl.r * .55); c.lineTo(pl.x + Math.cos(a) * pl.r * .92, pl.y + Math.sin(a) * pl.r * .92); c.stroke(); }
    c.strokeStyle = hsl(base, 20, 60, .5); c.lineWidth = 3; c.beginPath(); c.arc(pl.x, pl.y, pl.r - 1.5, Math.PI * 1.05, Math.PI * 1.75); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 2; c.beginPath(); c.arc(pl.x, pl.y, pl.r, 0, TAU); c.stroke();
    c.fillStyle = hsl(base, 10, 30); c.beginPath(); c.arc(pl.x, pl.y, pl.r * .45, 0, TAU); c.fill();
    if (pl.tmp !== undefined && pl.tmp < 2) { c.strokeStyle = `rgba(255,255,255,${.3 + .3 * Math.sin(G.t * 20)})`; c.lineWidth = 2; c.beginPath(); c.arc(pl.x, pl.y, pl.r + 3, 0, TAU); c.stroke(); }
  }
};

// ---------- Ambiance animée selon le thème ----------
const AMB = {
  volcan: { n: 60, col: '#ff8a2a', vy: [-60, -25], vx: [-12, 12], taille: [1.2, 2.6], glow: true },
  glace: { n: 90, col: '#f4fbff', vy: [25, 55], vx: [-30, -8], taille: [1, 2.6] },
  neant: { n: 50, col: '#c9a6ff', vy: [-8, 8], vx: [-8, 8], taille: [1, 2.2], glow: true },
  ruines: { n: 26, col: '#d6ff7a', vy: [-14, 14], vx: [-14, 14], taille: [1.4, 2.4], glow: true, luciole: true },
  temple: { n: 45, col: '#f2dcb0', vy: [-6, 4], vx: [-6, 6], taille: [.8, 1.8], rayons: true },
  metal: { n: 30, col: '#ffcf7a', vy: [-20, 40], vx: [-30, 30], taille: [.8, 1.6], glow: true }
};
const _nouvelleSalleDecor = Decor.nouvelleSalle.bind(Decor);
Decor.nouvelleSalle = function () {
  _nouvelleSalleDecor();
  this.amb = [];
  this.rayons = Array.from({ length: 4 }, (_, i) => ({ x: AR.x + (i + .5) * AR.w / 4 + R.range(-80, 80), w: R.range(70, 130), ph: R() * TAU }));
};
Decor.maj = function (dt) {
  if (!G.opts.decorAnime) return;
  for (const b of this.brumes) { b.x += b.vx * dt; b.y += b.vy * dt; if (b.x < AR.x - 200) b.x = AR.x + AR.w + 150; if (b.x > AR.x + AR.w + 200) b.x = AR.x - 150; if (b.y < AR.y - 150) b.y = AR.y + AR.h + 100; if (b.y > AR.y + AR.h + 150) b.y = AR.y - 100; }
  const th = this.themeActif(), A = AMB[th] || AMB.temple, n = Math.round(A.n * QUAL());
  this.amb = this.amb || [];
  if (this.ambTh !== th) { this.ambTh = th; this.amb.length = 0; }
  while (this.amb.length < n) this.amb.push({ x: AR.x + R() * AR.w, y: AR.y + R() * AR.h, vx: R.range(A.vx[0], A.vx[1]), vy: R.range(A.vy[0], A.vy[1]), s: R.range(A.taille[0], A.taille[1]), ph: R() * TAU, v: R.range(.5, 1) });
  for (const q of this.amb) {
    if (A.luciole) { q.vx += R.range(-30, 30) * dt; q.vy += R.range(-30, 30) * dt; q.vx = clamp(q.vx, -20, 20); q.vy = clamp(q.vy, -20, 20); }
    q.x += q.vx * dt; q.y += q.vy * dt; q.ph += dt * 2;
    if (q.y < AR.y - 10) { q.y = AR.y + AR.h; q.x = AR.x + R() * AR.w; } if (q.y > AR.y + AR.h + 10) { q.y = AR.y; q.x = AR.x + R() * AR.w; }
    if (q.x < AR.x - 10) q.x = AR.x + AR.w; if (q.x > AR.x + AR.w + 10) q.x = AR.x;
  }
};
Decor.dessinerAmbiance = function (c) {
  if (!G.opts.decorAnime) return;
  const thN = this.themeActif(), th = THEMES[thN], A = AMB[thN] || AMB.temple;
  c.save(); cheminArene(c); c.clip();
  c.globalCompositeOperation = 'lighter';
  if (calqueVeines) { c.globalAlpha = .45 + .25 * Math.sin(G.t * 1.7); c.drawImage(calqueVeines, 0, 0); c.globalAlpha = 1; }
  for (const b of this.brumes) c.drawImage(glow(th.brume + '.07)', b.r), b.x - b.r, b.y - b.r);
  if (A.rayons && this.rayons) for (const ry of this.rayons) {
    const k = .05 + .03 * Math.sin(G.t * .4 + ry.ph), g = c.createLinearGradient(ry.x, AR.y, ry.x - 260, AR.y + AR.h);
    g.addColorStop(0, `rgba(255,236,190,${k})`); g.addColorStop(1, 'rgba(255,236,190,0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(ry.x - ry.w / 2, AR.y); c.lineTo(ry.x + ry.w / 2, AR.y); c.lineTo(ry.x + ry.w / 2 - 300, AR.y + AR.h); c.lineTo(ry.x - ry.w / 2 - 340, AR.y + AR.h); c.closePath(); c.fill();
  }
  for (const q of this.amb || []) {
    const a = (A.luciole ? .5 + .5 * Math.sin(q.ph * 1.5) : .55 + .35 * Math.sin(q.ph)) * q.v;
    c.globalAlpha = a;
    if (A.glow) c.drawImage(glow(A.col, q.s * 4), q.x - q.s * 4, q.y - q.s * 4);
    c.fillStyle = A.col; c.beginPath(); c.arc(q.x, q.y, q.s * .6, 0, TAU); c.fill();
  }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  c.restore();
};

// ---------- Fond du menu : un vrai boss du jeu (silhouette, armes, aura), mis en scène ----------
const SCENE_MENU = { def: null, b: null, t: 0, vu: 0, braises: [], brumes: [] };
function nouveauBossMenu() {
  const S = SCENE_MENU;
  // le boss de la prochaine salle de la partie choisie (même graine que le vrai combat)
  const rb = G.preparerBoss(), def = genBoss(rb.salle, rb.seed, rb.salle % 5 === 0, rb.eviter);
  def.legendaire = rb.leg; S.cle = Save.d.diff + '|' + rb.salle + '|' + rb.seed;
  const bb = Arene.bb(), b = creerBoss(def);
  b.intro = 0; b.x = 0; b.y = 0; b.armure = 0; b.armureMax = 0;
  S.def = def; S.b = b; S.t = 0;
  S.brumes = Array.from({ length: 7 }, () => ({ x: R() * W, y: H * (.55 + R() * .45), r: R.range(180, 340), v: R.range(-14, 14) }));
}
fondMenu = function () {
  const S = SCENE_MENU, k = cv.width / W;
  const rb = G.preparerBoss();
  if (!S.b || S.cle !== Save.d.diff + '|' + rb.salle + '|' + rb.seed) nouveauBossMenu();
  S.vu = performance.now(); S.t += 1 / 60;
  const b = S.b, def = S.def, h = def.hue, t = S.t;
  ctx.setTransform(k, 0, 0, k, 0, (cv.height - H * k) / 2);
  // ciel et lointain
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, hsl(h, 40, 6)); g.addColorStop(.6, hsl(h, 45, 10)); g.addColorStop(1, '#020106');
  ctx.fillStyle = g; ctx.fillRect(-W, -H, W * 3, H * 3);
  ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glow(hsl(h, 100, 45, .25), 520), W * .7 - 520, H * .42 - 520); ctx.globalCompositeOperation = 'source-over';
  // colonnes en ruine au loin
  ctx.fillStyle = hsl(h, 25, 5);
  for (let i = 0; i < 9; i++) { const x = W * (.38 + i * .08), hh = 180 + ((i * 97) % 5) * 45, w = 34 + (i % 3) * 8; ctx.fillRect(x - w / 2, H * .64 - hh, w, hh); ctx.fillRect(x - w * .7, H * .64 - hh - 12, w * 1.4, 12); if (i % 3 === 1) { ctx.beginPath(); ctx.moveTo(x - w / 2, H * .64 - hh); ctx.lineTo(x + w / 2, H * .64 - hh - 40); ctx.lineTo(x + w / 2, H * .64 - hh); ctx.fill(); } }
  // faisceau de lumière qui tombe sur le boss
  const cx = W * .72, cy = H * .5 + Math.sin(t * .7) * 10;
  const lg = ctx.createLinearGradient(cx, 0, cx, cy + 120); lg.addColorStop(0, hsl(h, 80, 70, .16)); lg.addColorStop(1, hsl(h, 80, 70, 0));
  ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(cx - 70, -20); ctx.lineTo(cx + 70, -20); ctx.lineTo(cx + 260, cy + 140); ctx.lineTo(cx - 260, cy + 140); ctx.closePath(); ctx.fill();
  // estrade : cercle runique couché sous le boss
  ctx.save(); ctx.translate(cx, H * .74); ctx.scale(1, .32);
  const sg = ctx.createRadialGradient(0, 0, 20, 0, 0, 330); sg.addColorStop(0, hsl(h, 30, 18)); sg.addColorStop(.85, hsl(h, 35, 7)); sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, 330, 0, TAU); ctx.fill();
  sprite(ctx, 'circle6', hsl(h, 100, 62), 0, 0, 560, t * .12, .55, true);
  ctx.restore();
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.ellipse(cx, H * .74, 150 - Math.sin(t * .7) * 8, 40, 0, 0, TAU); ctx.fill();
  // le boss, en grand : il regarde vers le joueur et charge régulièrement une attaque (ses armes s'allument)
  const cyc = t % 5;
  b.wind = cyc > 3.6 ? 5 - cyc : 0; b.windMax = 1.4;
  b.main = cyc > 3.6 ? { id: def.phases[0].cycle[Math.floor(t / 5) % def.phases[0].cycle.length].id } : null;
  b.facing = Math.PI * .95 + Math.sin(t * .4) * .25; b.eyesA = b.facing; b.flash = 0;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(1.95, 1.95);
  b.x = 0; b.y = 0;
  try { dessinerBoss(ctx, b); } catch (e) { }
  ctx.restore();
  // brume au sol et braises
  ctx.globalCompositeOperation = 'lighter';
  for (const q of S.brumes) { q.x += q.v / 60; if (q.x < -400) q.x = W + 300; if (q.x > W + 400) q.x = -300; ctx.drawImage(glow(hsl(h, 60, 50, .06), q.r), q.x - q.r, q.y - q.r); }
  if (S.braises.length < 80) S.braises.push({ x: W * .35 + Math.random() * W * .7, y: H + 10, v: 20 + Math.random() * 60, r: 1 + Math.random() * 2.2, p: Math.random() * 6 });
  for (const q of S.braises) { q.y -= q.v / 60; q.x += Math.sin(t + q.p) * .5; ctx.globalAlpha = Math.min(1, (q.y / H) * 1.5); ctx.drawImage(glow(hsl(h + 30, 100, 65), q.r * 3), q.x - q.r * 3, q.y - q.r * 3); }
  S.braises = S.braises.filter(q => q.y > -10);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  // nom du colosse
  ctx.textAlign = 'center'; ctx.globalAlpha = .75;
  texteOmbre(ctx, (def.legendaire ? '✦ ' : '') + def.nom, cx, H * .86, hsl(h, 90, 72), `700 34px ${POLICE_ER}`, 5);
  ctx.font = `600 16px ${POLICE_ER}`; ctx.fillStyle = "#bfae8a"; ctx.fillText(def.titre + (def.mega ? ' — méga boss' : ''), cx, H * .89);
  ctx.globalAlpha = 1;
};

// ---------- Matière des boss : ombrage (lumière venant d'en haut à gauche) et grain, sur toutes les silhouettes ----------
let grainBoss = null;
function motifGrain() {
  if (grainBoss) return grainBoss;
  const t = document.createElement('canvas'); t.width = t.height = 128; const x = t.getContext('2d'), im = x.createImageData(128, 128);
  for (let i = 0; i < 128 * 128; i++) { const v = 100 + Math.random() * 110 | 0; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
  x.putImageData(im, 0, 0);
  // quelques rayures et piqûres
  x.strokeStyle = 'rgba(40,40,40,.5)'; for (let i = 0; i < 14; i++) { x.lineWidth = Math.random() * 1.5 + .5; x.beginPath(); const a = Math.random() * 128, b = Math.random() * 128; x.moveTo(a, b); x.lineTo(a + Math.random() * 30 - 15, b + Math.random() * 30 - 15); x.stroke(); }
  grainBoss = x.createPattern(t, 'repeat');
  return grainBoss;
}
function matiereBoss(c, r) {
  c.save();
  c.beginPath(); c.arc(0, 0, r * 1.02, 0, TAU); c.clip();
  c.globalCompositeOperation = 'soft-light'; c.globalAlpha = .55; c.fillStyle = motifGrain(); c.fillRect(-r * 1.1, -r * 1.1, r * 2.2, r * 2.2);
  c.globalAlpha = 1; c.globalCompositeOperation = 'multiply';
  const g = c.createRadialGradient(-r * .45, -r * .5, r * .1, 0, 0, r * 1.05); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.55, 'rgba(200,200,210,1)'); g.addColorStop(1, 'rgba(70,65,80,1)');
  c.fillStyle = g; c.fillRect(-r * 1.1, -r * 1.1, r * 2.2, r * 2.2);
  c.globalCompositeOperation = 'screen'; c.globalAlpha = .35;
  const s = c.createRadialGradient(-r * .45, -r * .55, 0, -r * .45, -r * .55, r * .55); s.addColorStop(0, 'rgba(255,255,255,.8)'); s.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = s; c.fillRect(-r, -r, r * 2, r * 2);
  c.restore();
}
