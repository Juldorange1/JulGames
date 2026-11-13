'use strict';
/* COMÈTE — pilote automatique (démo de l'accueil et tests). Il ne triche pas : il voit ce que voit le joueur
   (les attaques annoncées) et se déplace avec les mêmes règles (direction + élan + compétences). */

var TAUS = [0.04, 0.09, 0.15, 0.22, 0.3, 0.4];

function creerBot(niveau) { return { sens: 1, dernier: null, niveau: niveau == null ? 1 : niveau, cpt: 0, changeSens: 0 }; }

function botCible(C) {
  if ((C.phase === 'coeur' || C.phase === 'transition') && C.coeur) return { o: C.coeur, x: C.coeur.x, y: C.coeur.y, r0: 0.6 };
  var j = C.j, best = null, bd = 1e9;
  // il garde sa cible tant qu'elle est frappable (sinon les autres se réparent)
  var f = C.botFixe;
  if (f && C.t - Math.max(f.dernier, C.botFixeT || 0) > 6) { C.botBan = f; f = null; }
  if (f && !f.mort && !f.prot && !f.intang && !bouclierActif(C, f, 0.35) && !intangible(C, f, 0.35)) best = f;
  else for (var i = 0; i < C.noyaux.length; i++) {
    var n = C.noyaux[i]; if (n.mort) continue;
    var pen = (n.prot || bouclierActif(C, n, 0.35) || n.intang || intangible(C, n, 0.35)) ? 6 : 1;
    var dd = dist2(n.x, n.y, j.x, j.y) * pen * (n === C.botBan ? 20 : 1);
    if (dd < bd) { bd = dd; best = n; }
  }
  if (!best) return null;
  if (C.botFixe !== best) C.botFixeT = C.t;
  C.botFixe = best;
  var c = { o: best, x: best.x, y: best.y, r0: best.def.type === 'blinde' ? 0.48 : 0.6, sens: best.def.type === 'sens' ? best.def.sens : 0 };
  if (best.def.type === 'lie' && best.def.lien != null) {
    var p = C.noyaux[best.def.lien];
    if (p && !p.mort) { c.x = (best.x + p.x) / 2; c.y = (best.y + p.y) / 2; c.r0 = Math.sqrt(dist2(best.x, best.y, p.x, p.y)) / 2 + 0.42; }
  }
  return c;
}

function dangerPoint(C, x, y, tau, an) {
  var dng = 0, i, t = C.t + tau, ve = C.lentE;
  var marge = 0.1;
  for (i = 0; i < C.balles.length; i++) {
    var b = C.balles[i], bx = b.x + b.vx * tau * ve, by = b.y + b.vy * tau * ve;
    if (b.ond) { bx = b.x; by = b.y; }
    var ddx = bx - x, ddy = by - y; if (ddx > 1.2 || ddx < -1.2 || ddy > 1.2 || ddy < -1.2) continue;
    var d = Math.sqrt(ddx * ddx + ddy * ddy), lim = b.r * 0.78 + R_J + marge + (b.ond ? 0.25 : 0);
    if (d < lim) dng += 1000; else if (d < lim + 0.3) dng += (lim + 0.3 - d) * 2;
  }
  for (i = 0; i < C.traqueurs.length; i++) {
    var tq = C.traqueurs[i], qx = tq.x + Math.cos(tq.a) * tq.v * tau, qy = tq.y + Math.sin(tq.a) * tq.v * tau;
    var dq = Math.sqrt(dist2(qx, qy, x, y)); if (dq < 0.17 + R_J + marge) dng += 1000; else if (dq < 0.7) dng += (0.7 - dq) * 1.5;
  }
  for (i = 0; i < C.mines.length; i++) { var dm = Math.sqrt(dist2(C.mines[i].x, C.mines[i].y, x, y)); if (dm < 0.3 + R_J) dng += 1000; else if (dm < 1.2 && C.mines[i].tB - t < 0.6) dng += (1.2 - dm) * 8; }
  for (i = 0; i < C.lasers.length; i++) { var L = C.lasers[i]; if (t < L.tE && dansLaser({ x: L.x, y: L.y, a: L.a + L.rot * tau, w: L.w, len: L.len }, x, y, R_J + 0.08)) dng += 1000; }
  for (i = 0; i < C.ondes.length; i++) {
    var o = C.ondes[i]; if (dansOnde({ x: o.x, y: o.y, r: o.r + o.v * tau, w: o.w, gap: o.gap, larg: o.larg * 0.8 }, x, y, R_J + 0.1)) dng += 1000;
    // une onde qui arrive : se placer dans son trou à l'avance
    var dO = Math.sqrt(dist2(x, y, o.x, o.y)), arr = (dO - o.r) / Math.max(0.5, o.v);
    if (arr > 0 && arr < 1.2) { var dgo = Math.abs(angDiff(Math.atan2(y - o.y, x - o.x), o.gap)); if (dgo > o.larg * 0.3) dng += 25 * (dgo - o.larg * 0.3) * (1.3 - arr); }
  }
  for (i = 0; i < C.murs.length; i++) { var mu = C.murs[i]; if (dansMur(C, { cote: mu.cote, pos: mu.pos + mu.v * tau, trou: mu.trou, tr: mu.tr * 0.8, ep: mu.ep }, x, y, R_J + 0.1)) dng += 1000; }
  for (i = 0; i < C.meteores.length; i++) { var m = C.meteores[i]; if (t < m.tE && dist2(x, y, m.x, m.y) < Math.pow(m.r + 0.1, 2)) dng += 1000; }
  for (i = 0; i < C.trous.length; i++) { var dt2 = Math.sqrt(dist2(x, y, C.trous[i].x, C.trous[i].y)); if (dt2 < 0.6) dng += 1000; else if (dt2 < 2) dng += (2 - dt2) * 4; }
  for (i = 0; i < C.bras.length; i++) {
    var br = C.bras[i], ba = br.a + br.rot * tau;
    for (var kk = 0; kk < br.n; kk++) { var rr = 0.7 + kk * br.esp; if (dist2(x, y, br.x + Math.cos(ba) * rr, br.y + Math.sin(ba) * rr) < Math.pow(br.r + R_J + 0.12, 2)) { dng += 1000; break; } }
  }
  if (C.def.rempart && dansRempart(C, x, y, R_J + 0.1)) dng += 1000;
  // attaques annoncées
  for (i = 0; i < C.annonces.length; i++) {
    var a = C.annonces[i];
    if (a.tF > t + 0.05) {
      var bientot = a.tF - C.t < 0.55;
      if (a.type === 'meteores' && bientot) for (var p = 0; p < a.pts.length; p += 2) if (dist2(x, y, a.pts[p], a.pts[p + 1]) < Math.pow(a.r + 0.25, 2)) dng += 300;
      if (a.lasers && bientot) for (var l0 = 0; l0 < a.lasers.length; l0++) {
        var L0 = a.lasers[l0]; if (L0.rot) continue;
        var c0 = corpsDe(C, L0.corps || 0);
        if (dansLaser({ x: L0.suit ? c0.x : L0.x, y: L0.suit ? c0.y : L0.y, a: L0.a, w: L0.w || 0.34, len: L0.len }, x, y, R_J + 0.2)) dng += 300;
      }
      if (a.type === 'onde' && a.tF - C.t < 1.0) {
        var ao = Math.atan2(y - C.corps.y, x - C.corps.x), dgap = Math.abs(angDiff(ao, a.gap));
        if (dgap > a.larg * 0.35) dng += 40 * (dgap - a.larg * 0.35);
      }
      if (a.type === 'cage' && bientot) { var dcg = Math.sqrt(dist2(x, y, a.cx, a.cy)); if (dcg < a.r + 0.4) dng += 30 * (a.r + 0.4 - dcg); }
      continue;
    }
    if (a.type === 'onde') {
      var ro = C.corps.r + a.v * (t - a.tF);
      if (dansOnde({ x: C.corps.x, y: C.corps.y, r: ro, w: 0.24, gap: a.gap, larg: a.larg * 0.8 }, x, y, R_J + 0.1)) dng += 1000;
    }
    if (a.lasers) for (var l = 0; l < a.lasers.length; l++) {
      var LL = a.lasers[l], c1 = corpsDe(C, LL.corps || 0), lx = LL.suit ? c1.x : LL.x, ly = LL.suit ? c1.y : LL.y;
      if (dansLaser({ x: lx, y: ly, a: LL.a + (LL.rot || 0) * Math.max(0, t - a.tF), w: LL.w || 0.34, len: LL.len }, x, y, R_J + 0.1)) dng += 1000;
    }
    if (a.type === 'meteores') for (var q = 0; q < a.pts.length; q += 2) if (dist2(x, y, a.pts[q], a.pts[q + 1]) < Math.pow(a.r + 0.15, 2)) dng += 1000;
  }
  // corps du colosse
  var cs = [C.corps]; if (C.corps2) cs.push(C.corps2);
  for (i = 0; i < cs.length; i++) {
    var co = cs[i], vx = i ? 0 : an.cvx || 0, vy = i ? 0 : an.cvy || 0;
    var cx = co.x + vx * tau, cy = co.y + vy * tau, dc = Math.sqrt(dist2(cx, cy, x, y));
    if (dc < co.r * 0.8 + R_J + 0.12) dng += 1000; else if (dc < co.r + 0.3) dng += (co.r + 0.3 - dc) * 2;
  }
  for (i = 0; i < C.annonces.length; i++) if (C.annonces[i].type === 'ruee' && C.annonces[i].cible) {
    var ru = C.annonces[i].cible; if (distSeg2(x, y, C.corps.x, C.corps.y, ru.x, ru.y) < Math.pow(C.corps.r + 0.3, 2)) dng += 300;
  }
  var bord = Math.min(x, y, C.W - x, C.H - y); if (bord < 0.4) dng += (0.4 - bord) * 2;
  return dng;
}

function botEntree(C, B) {
  var j = C.j, co = C.corps;
  var memo = { cvx: 0, cvy: 0 };
  if (B.dernier) { memo.cvx = (co.x - B.dernier.x) / DT; memo.cvy = (co.y - B.dernier.y) / DT; }
  B.dernier = { x: co.x, y: co.y };
  B.cpt++;
  if (B.cpt % 2 === 0 && B.dec) { var r = B.dec; return { dx: r.dx, dy: r.dy, elan: false, c: [false, false, false] }; }
  var cible = botCible(C), vx = 0, vy = 0, comp = [false, false, false];
  if (cible) {
    var tvx = 0, tvy = 0;
    if (B.cibleP && B.cibleP.o === cible.o) { tvx = (cible.x - B.cibleP.x) / DT / (B.cpt - B.cibleP.k); tvy = (cible.y - B.cibleP.y) / DT / (B.cpt - B.cibleP.k); }
    B.cibleP = { o: cible.o, x: cible.x, y: cible.y, k: B.cpt };
    if (cible.sens) B.sens = cible.sens;
    else if (B.changeSens <= C.t && Math.random() < 0.01) { B.sens = -B.sens; B.changeSens = C.t + 2; }
    var px = cible.x + tvx * 0.2, py = cible.y + tvy * 0.2;
    var rx = j.x - px, ry = j.y - py, dd = Math.sqrt(rx * rx + ry * ry) || 0.01;
    var r0 = cible.r0, ux = rx / dd, uy = ry / dd;
    var vtv = Math.sqrt(tvx * tvx + tvy * tvy);
    var vt = Math.max(2, C.vmax - vtv - 0.5);
    var ex = -uy * B.sens * vt - ux * (dd - r0) * 7, ey = ux * B.sens * vt - uy * (dd - r0) * 7;
    vx = (tvx + ex) / C.vmax; vy = (tvy + ey) / C.vmax;
    // forteresse : passer par une brèche du rempart pour rejoindre la cible
    var rp = C.def.rempart;
    if (rp && C.phase !== 'coeur' && C.phase !== 'transition') {
      var dp = Math.sqrt(dist2(j.x, j.y, co.x, co.y)), dcb = Math.sqrt(dist2(cible.x, cible.y, co.x, co.y));
      if ((dp > rp.r - 0.3) !== (dcb > rp.r - 0.3)) {
        var aj = Math.atan2(j.y - co.y, j.x - co.x), meilleure = 0, md = 9;
        for (var gq = 0; gq < 2; gq++) { var ga = C.rempartA + gq * Math.PI, dga = Math.abs(angDiff(aj, ga)); if (dga < md) { md = dga; meilleure = ga; } }
        var dans = Math.abs(angDiff(aj, meilleure)) < rp.larg * 0.3;
        var rc = dans ? (dcb < rp.r ? rp.r - 0.9 : rp.r + 0.9) : (dp > rp.r ? rp.r + 0.6 : rp.r - 0.6);
        var gx = co.x + Math.cos(meilleure + rp.rot * 0.25) * rc, gy = co.y + Math.sin(meilleure + rp.rot * 0.25) * rc;
        vx = gx - j.x; vy = gy - j.y;
      }
    }
    var l = Math.sqrt(vx * vx + vy * vy); if (l > 1) { vx /= l; vy /= l; }
    // compétences : le lasso quand la traînée entoure déjà la cible
    var T = C.tr;
    if (C.slots[0] === 'lasso' && T.tl > 2.5 && C.en >= coutComp('lasso', C.niv.lasso) && cible.o && !cible.o.prot) {
      var poly = []; for (var i = 0; i < T.tx.length; i += 2) poly.push(T.tx[i], T.ty[i]); poly.push(j.x, j.y);
      if (poly.length >= 8 && dansPoly(cible.x, cible.y, poly) && airePoly(poly) < 6 && Math.random() < 0.3) comp[0] = true;
    }
    if (C.en >= 100 && C.slots[2] && Math.random() < 0.05) comp[2] = true;
    if (C.slots[1] && C.en >= 60 && Math.random() < 0.01) comp[1] = true;
  }
  var best = null, bs = -1e9, bdanger = 0;
  var cands = [[0, 0]];
  for (var c = 0; c < 16; c++) { var a = TAU * c / 16; cands.push([Math.cos(a), Math.sin(a)]); cands.push([Math.cos(a) * 0.45, Math.sin(a) * 0.45]); }
  if (vx || vy) { cands.push([vx, vy]); cands.push([vx * 0.7, vy * 0.7]); }
  for (var k = 0; k < cands.length; k++) {
    var cx = cands[k][0], cy = cands[k][1], dg = 0;
    // la comète accélère : on part de sa vitesse actuelle
    for (var q = 0; q < TAUS.length; q++) {
      var tau = TAUS[q], m = Math.min(1, tau * ACCEL / C.vmax / 2);
      var mvx = j.vx * (1 - m) + cx * C.vmax * m, mvy = j.vy * (1 - m) + cy * C.vmax * m;
      var x = clamp(j.x + mvx * tau, 0.15, C.W - 0.15), y = clamp(j.y + mvy * tau, 0.15, C.H - 0.15);
      dg += dangerPoint(C, x, y, tau, memo) * (1.25 - tau);
    }
    var ecx = cx - vx, ecy = cy - vy;
    var sc = -dg - (ecx * ecx + ecy * ecy) * 8 * B.niveau;
    if (sc > bs) { bs = sc; best = cands[k]; bdanger = dg; }
  }
  var elan = bdanger >= 900 && j.dashCd <= 0;
  // une onde ou un mur va passer sur la comète hors du trou : élan au bon moment pour la traverser
  if (j.dashCd <= 0 && !elan) {
    for (var o = 0; o < C.ondes.length && !elan; o++) { var on = C.ondes[o], dO = Math.sqrt(dist2(j.x, j.y, on.x, on.y)) - on.r; if (dO > 0 && dO < on.v * 0.07 + 0.12 && dansOnde({ x: on.x, y: on.y, r: on.r + dO, w: on.w, gap: on.gap, larg: on.larg }, j.x, j.y, R_J)) elan = true; }
    for (var mm = 0; mm < C.murs.length && !elan; mm++) { var mu = C.murs[mm]; if (dansMur(C, { cote: mu.cote, pos: mu.pos + mu.v * 0.07, trou: mu.trou, tr: mu.tr, ep: mu.ep }, j.x, j.y, R_J + 0.05)) elan = true; }
  }
  B.dec = { dx: best[0], dy: best[1] };
  return { dx: best[0], dy: best[1], elan: elan, c: comp };
}
