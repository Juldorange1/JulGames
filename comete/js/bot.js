'use strict';
/* COMÈTE — pilote automatique (démo de l'accueil et tests). Il ne triche pas : il voit ce que voit le joueur
   (les attaques annoncées) et se déplace avec les mêmes règles. */

var TAUS = [0.04, 0.09, 0.15, 0.22, 0.3, 0.4];

function creerBot(niveau) { return { sens: 1, dernier: null, niveau: niveau == null ? 1 : niveau, cpt: 0, dir: { dx: 0, dy: 0 }, changeSens: 0 }; }

function botCible(C) {
  if ((C.phase === 'coeur' || C.phase === 'transition') && C.coeur) return C.coeur;
  var j = C.j, best = null, bd = 1e9;
  for (var i = 0; i < C.noyaux.length; i++) {
    var n = C.noyaux[i]; if (n.mort) continue;
    var dd = dist2(n.x, n.y, j.x, j.y) * (n.prot || bouclierActif(C, n, 0.35) ? 6 : 1);
    if (dd < bd) { bd = dd; best = n; }
  }
  return best;
}

function dangerPoint(C, x, y, tau, an) {
  var dng = 0, i, j = C.j, t = C.t + tau;
  var marge = 0.1;
  for (i = 0; i < C.balles.length; i++) {
    var b = C.balles[i], bx = b.x + b.vx * tau, by = b.y + b.vy * tau;
    var ddx = bx - x, ddy = by - y; if (ddx > 1.2 || ddx < -1.2 || ddy > 1.2 || ddy < -1.2) continue;
    var d = Math.sqrt(ddx * ddx + ddy * ddy), lim = b.r * 0.78 + R_J + marge;
    if (d < lim) dng += 1000; else if (d < lim + 0.3) dng += (lim + 0.3 - d) * 2;
  }
  for (i = 0; i < C.traqueurs.length; i++) {
    var tq = C.traqueurs[i], qx = tq.x + Math.cos(tq.a) * tq.v * tau, qy = tq.y + Math.sin(tq.a) * tq.v * tau;
    var dq = Math.sqrt(dist2(qx, qy, x, y)); if (dq < 0.17 + R_J + marge) dng += 1000; else if (dq < 0.7) dng += (0.7 - dq) * 1.5;
  }
  for (i = 0; i < C.mines.length; i++) { var dm = Math.sqrt(dist2(C.mines[i].x, C.mines[i].y, x, y)); if (dm < 0.3 + R_J) dng += 1000; else if (dm < 1.2 && C.mines[i].tB - t < 0.6) dng += (1.2 - dm) * 8; }
  for (i = 0; i < C.lasers.length; i++) { var L = C.lasers[i]; if (t < L.tE && dansLaser({ x: L.x, y: L.y, a: L.a + L.rot * tau, w: L.w }, x, y, R_J + 0.08)) dng += 1000; }
  for (i = 0; i < C.ondes.length; i++) { var o = C.ondes[i]; if (dansOnde({ x: o.x, y: o.y, r: o.r + o.v * tau, w: o.w, gap: o.gap, larg: o.larg * 0.8 }, x, y, R_J + 0.1)) dng += 1000; }
  for (i = 0; i < C.murs.length; i++) { var mu = C.murs[i]; if (dansMur(C, { cote: mu.cote, pos: mu.pos + mu.v * tau, trou: mu.trou, tr: mu.tr * 0.8, ep: mu.ep }, x, y, R_J + 0.1)) dng += 1000; }
  for (i = 0; i < C.meteores.length; i++) { var m = C.meteores[i]; if (t < m.tE && dist2(x, y, m.x, m.y) < Math.pow(m.r + 0.1, 2)) dng += 1000; }
  // attaques annoncées
  for (i = 0; i < C.annonces.length; i++) {
    var a = C.annonces[i];
    if (a.tF > t + 0.05) {
      var bientot = a.tF - C.t < 0.55;
      if (a.type === 'meteores' && bientot) for (var p = 0; p < a.pts.length; p += 2) if (dist2(x, y, a.pts[p], a.pts[p + 1]) < Math.pow(a.r + 0.25, 2)) dng += 300;
      if (a.lasers && bientot) for (var l0 = 0; l0 < a.lasers.length; l0++) {
        var L0 = a.lasers[l0]; if (L0.rot) continue;
        if (dansLaser({ x: L0.suit ? C.corps.x : L0.x, y: L0.suit ? C.corps.y : L0.y, a: L0.a, w: 0.34 }, x, y, R_J + 0.2)) dng += 300;
      }
      if (a.type === 'onde' && a.tF - C.t < 1.0) {
        var ao = Math.atan2(y - C.corps.y, x - C.corps.x), dgap = Math.abs(angDiff(ao, a.gap));
        if (dgap > a.larg * 0.35) dng += 40 * (dgap - a.larg * 0.35);
      }
      continue;
    }
    if (a.type === 'onde') {
      var ro = C.corps.r + a.v * (t - a.tF);
      if (dansOnde({ x: C.corps.x, y: C.corps.y, r: ro, w: 0.24, gap: a.gap, larg: a.larg * 0.8 }, x, y, R_J + 0.1)) dng += 1000;
    }
    if (a.lasers) for (var l = 0; l < a.lasers.length; l++) {
      var LL = a.lasers[l], lx = LL.suit ? C.corps.x : LL.x, ly = LL.suit ? C.corps.y : LL.y;
      if (dansLaser({ x: lx, y: ly, a: LL.a + (LL.rot || 0) * Math.max(0, t - a.tF), w: 0.34 }, x, y, R_J + 0.1)) dng += 1000;
    }
    if (a.type === 'meteores') for (var q = 0; q < a.pts.length; q += 2) if (dist2(x, y, a.pts[q], a.pts[q + 1]) < Math.pow(a.r + 0.15, 2)) dng += 1000;
  }
  // corps du colosse
  var co = C.corps, vx = an.cvx || 0, vy = an.cvy || 0;
  var cx = co.x + vx * tau, cy = co.y + vy * tau, dc = Math.sqrt(dist2(cx, cy, x, y));
  if (dc < co.r * 0.8 + R_J + 0.12) dng += 1000; else if (dc < co.r + 0.3) dng += (co.r + 0.3 - dc) * 2;
  for (i = 0; i < C.annonces.length; i++) if (C.annonces[i].type === 'ruee' && C.annonces[i].cible) {
    var ru = C.annonces[i].cible; if (distSeg2(x, y, co.x, co.y, ru.x, ru.y) < Math.pow(co.r + 0.3, 2)) dng += 300;
  }
  // bords
  var bord = Math.min(x, y, C.W - x, C.H - y); if (bord < 0.4) dng += (0.4 - bord) * 2;
  return dng;
}

function botEntree(C, B) {
  var j = C.j;
  var co = C.corps;
  var memo = { cvx: 0, cvy: 0 };
  if (B.dernier) { memo.cvx = (co.x - B.dernier.x) / DT; memo.cvy = (co.y - B.dernier.y) / DT; }
  B.dernier = { x: co.x, y: co.y };
  B.cpt++;
  // décision toutes les 2 images
  if (B.cpt % 2 === 0 && B.dec) return B.dec;
  var cible = botCible(C), vx = 0, vy = 0;
  if (cible) {
    var tvx = 0, tvy = 0;
    if (B.cibleP && B.cibleP.o === cible) { tvx = (cible.x - B.cibleP.x) / DT / (B.cpt - B.cibleP.k); tvy = (cible.y - B.cibleP.y) / DT / (B.cpt - B.cibleP.k); }
    B.cibleP = { o: cible, x: cible.x, y: cible.y, k: B.cpt };
    // vise un peu devant une cible qui bouge
    var px = cible.x + tvx * 0.2, py = cible.y + tvy * 0.2;
    var rx = j.x - px, ry = j.y - py, dd = Math.sqrt(rx * rx + ry * ry) || 0.01;
    var r0 = 0.6, ux = rx / dd, uy = ry / dd;
    var vtv = Math.sqrt(tvx * tvx + tvy * tvy);
    var vt = Math.max(2, C.vmax - vtv - 0.5);
    // en restant à r0 de la cible, on tourne autour d'elle (dans son repère)
    var ex = -uy * B.sens * vt - ux * (dd - r0) * 7, ey = ux * B.sens * vt - uy * (dd - r0) * 7;
    vx = (tvx + ex) / C.vmax; vy = (tvy + ey) / C.vmax;
    var l = Math.sqrt(vx * vx + vy * vy); if (l > 1) { vx /= l; vy /= l; }
  }
  var best = null, bs = -1e9, bdanger = 0;
  var cands = [[0, 0]];
  for (var i = 0; i < 16; i++) { var a = TAU * i / 16; cands.push([Math.cos(a), Math.sin(a)]); cands.push([Math.cos(a) * 0.45, Math.sin(a) * 0.45]); }
  if (vx || vy) { cands.push([vx, vy]); cands.push([vx * 0.7, vy * 0.7]); }
  for (var c = 0; c < cands.length; c++) {
    var cx = cands[c][0], cy = cands[c][1], dg = 0;
    for (var k = 0; k < TAUS.length; k++) {
      var tau = TAUS[k];
      var x = clamp(j.x + cx * C.vmax * tau, 0.15, C.W - 0.15), y = clamp(j.y + cy * C.vmax * tau, 0.15, C.H - 0.15);
      dg += dangerPoint(C, x, y, tau, memo) * (1.25 - tau);
    }
    var ecx = cx - vx, ecy = cy - vy;
    var sc = -dg - (ecx * ecx + ecy * ecy) * 8 * B.niveau;
    if (sc > bs) { bs = sc; best = cands[c]; bdanger = dg; }
  }
  var elan = false;
  if (bdanger >= 900 && j.dashCd <= 0) elan = true;
  if (B.changeSens <= C.t && Math.random() < 0.01) { B.sens = -B.sens; B.changeSens = C.t + 2; }
  B.dec = { mode: 'dir', dx: best[0], dy: best[1], elan: elan };
  return B.dec;
}
