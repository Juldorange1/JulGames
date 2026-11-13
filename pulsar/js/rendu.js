'use strict';
/* PULSAR — rendu canvas : décor néon, obstacles, boss, attaques, joueur, effets, interface en jeu */

var Rendu = {
  cv: null, ctx: null, W: 0, H: 0, dpr: 1, k: 40, oy: 0, camX: 0, secousse: 0, flash: 0, pulse: 0,
  parts: [], sprites: {},
  init: function (cv) {
    this.cv = cv; this.ctx = cv.getContext('2d');
    var self = this; window.addEventListener('resize', function () { self.redim(); }); this.redim();
  },
  redim: function () {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = Math.round(window.innerWidth * this.dpr); this.H = Math.round(window.innerHeight * this.dpr);
    this.cv.width = this.W; this.cv.height = this.H;
    this.k = Math.min(this.H / 12.2, this.W / 19.5);
    this.oy = (this.H - 12.2 * this.k) / 2;
  },
  sx: function (x) { return (x - this.camX) * this.k; },
  sy: function (y) { return this.oy + (10.8 - y) * this.k; },
  lueur: function (c) {   // sprite de halo coloré
    var s = this.sprites[c]; if (s) return s;
    s = document.createElement('canvas'); s.width = s.height = 128;
    var g = s.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, c); gr.addColorStop(0.25, c); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    this.sprites[c] = s; return s;
  },
  halo: function (x, y, r, c, a) {
    var ctx = this.ctx; ctx.globalAlpha = a; ctx.drawImage(this.lueur(c), x - r, y - r, 2 * r, 2 * r); ctx.globalAlpha = 1;
  }
};

/* ---------- Couleurs du niveau ---------- */
function couleursSection(L, i) {
  if (!L.teintes) L.teintes = [];
  if (L.teintes[i]) return L.teintes[i];
  var R = rngGraine((L.graine || 1) * 31 + i * 977);
  var base = (L.teinte != null ? L.teinte : (L.graine % 360));
  var h = (base + [0, 38, -40, 75, 150, -90, 200, 110][i % 8] + R() * 20) % 360;
  var c = { h: h };
  L.teintes[i] = c; return c;
}
function hsl(h, s, l, a) { return 'hsla(' + ((h % 360 + 360) % 360).toFixed(0) + ',' + s + '%,' + l + '%,' + (a == null ? 1 : a) + ')'; }
function teinteA(L, x) {
  var S = L.sections, i = 0;
  for (var k = 0; k < S.length; k++) if (S[k].x0 <= x) i = k;
  var h = couleursSection(L, i).h;
  var s = S[i];
  if (s && s.x1 != null && i + 1 < S.length) {
    var reste = s.x1 - x;
    if (reste < 6) { var h2 = couleursSection(L, i + 1).h; var d = ((h2 - h + 540) % 360) - 180; h = h + d * (1 - reste / 6); }
  }
  return h;
}

/* ---------- Image complète ---------- */
function dessinerJeu(J, dtr) {
  var R = Rendu, ctx = R.ctx, L = J.L, p = J.p, W = R.W, H = R.H, k = R.k;
  var t = J.temps;
  R.camX = p.x - 6;
  var beat = L.spb * DT, ph = (t / beat) % 1;
  R.pulse = Math.pow(1 - ph, 3);
  var h = teinteA(L, p.x + 4);
  J.teinte = h;
  // secousse
  var sx = 0, sy = 0;
  if (R.secousse > 0 && Sauve.d.reglages.secousses) { sx = (Math.random() - 0.5) * R.secousse * k * 0.4; sy = (Math.random() - 0.5) * R.secousse * k * 0.4; R.secousse = Math.max(0, R.secousse - dtr * 3); }
  else R.secousse = 0;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // fond
  var gr = ctx.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, hsl(h, 70, 16 + R.pulse * 4)); gr.addColorStop(0.65, hsl(h + 25, 75, 8)); gr.addColorStop(1, hsl(h + 40, 80, 4));
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  // transformation monde (miroir / inversé)
  var mir = J.mutateur === 'miroir', inv = J.mutateur === 'inverse';
  ctx.setTransform(mir ? -1 : 1, 0, 0, inv ? -1 : 1, (mir ? W : 0) + sx, (inv ? H : 0) + sy);
  dessinerArrierePlan(J, h, t);
  dessinerBoss(J, t, h);
  var x0 = R.camX - 2, x1 = R.camX + W / k + 3;
  dessinerSol(J, h, x0, x1);
  dessinerObjets(J, h, x0, x1, t);
  dessinerAttaques(J, t, h);
  if (J.guide && (J.pratique || Jeu.auto)) dessinerGuide(J, t);
  dessinerPointsControle(J);
  dessinerJoueurJeu(J, t, dtr);
  dessinerParticules(J, dtr);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (J.mutateur === 'penombre') {
    var px = (mir ? W - R.sx(p.x) : R.sx(p.x)), py = inv ? H - R.sy(p.y) : R.sy(p.y);
    var gp = ctx.createRadialGradient(px + k * 3, py, k * 2.5, px + k * 3, py, k * 10);
    gp.addColorStop(0, 'rgba(0,0,0,0)'); gp.addColorStop(1, 'rgba(0,0,0,0.93)');
    ctx.fillStyle = gp; ctx.fillRect(0, 0, W, H);
  }
  // flash
  if (R.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.6, R.flash) + ')'; ctx.fillRect(0, 0, W, H); R.flash = Math.max(0, R.flash - dtr * 2.5); }
  // vignette
  var vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  dessinerHUD(J, h);
}

/* ---------- Arrière-plan ---------- */
function dessinerArrierePlan(J, h, t) {
  var R = Rendu, ctx = R.ctx, k = R.k, W = R.W;
  // grands carrés qui tournent (parallaxe lente)
  var par = 0.15, base = R.camX * par;
  ctx.lineWidth = Math.max(1, k * 0.06);
  for (var i = Math.floor(base / 6) - 1; i < Math.floor(base / 6) + W / k / 6 / 0.9 + 3; i++) {
    var rr = rngGraine(i * 7 + 3);
    var cx = (i * 6 - base) * k, cy = R.sy(rr.entre(1, 9.5));
    var s = rr.entre(1.5, 4) * k * (1 + R.pulse * 0.06);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * rr.entre(-0.3, 0.3) + i);
    ctx.strokeStyle = hsl(h + rr.entre(-30, 30), 80, 60, 0.06 + R.pulse * 0.05);
    ctx.strokeRect(-s / 2, -s / 2, s, s);
    ctx.restore();
  }
  // silhouettes (parallaxe moyenne)
  par = 0.4; base = R.camX * par;
  ctx.fillStyle = hsl(h + 30, 60, 7, 0.75);
  var y0 = R.sy(0);
  ctx.beginPath(); ctx.moveTo(-10, y0);
  for (var j = Math.floor(base / 2) - 1; j < Math.floor(base / 2) + W / k / 2 + 3; j++) {
    var r2 = rngGraine(j * 13 + 1), hh = r2.entre(1, 4.5);
    var xa = (j * 2 - base) * k, xb = ((j + 1) * 2 - base) * k;
    ctx.lineTo(xa, R.sy(hh)); ctx.lineTo(xb, R.sy(hh));
  }
  ctx.lineTo(W + 10, y0); ctx.closePath(); ctx.fill();
  // particules de poussière lumineuse
  for (var q = 0; q < 26; q++) {
    var r3 = rngGraine(q * 101);
    var px = ((r3() * 40 - R.camX * 0.25 - t * r3.entre(0.2, 0.8)) % 40 + 40) % 40;
    var py = (r3() * 11 + Math.sin(t * 0.6 + q) * 0.3);
    R.halo(px * k, R.sy(py), k * r3.entre(0.08, 0.2) * (1 + R.pulse), hsl(h + 60, 100, 75), 0.35);
  }
}

/* ---------- Sol, plafond ---------- */
function dessinerSol(J, h, x0, x1) {
  var R = Rendu, ctx = R.ctx, k = R.k, W = R.W, H = R.H;
  var yg = R.sy(0);
  var gr = ctx.createLinearGradient(0, yg, 0, H);
  gr.addColorStop(0, hsl(h, 75, 22)); gr.addColorStop(1, hsl(h, 80, 6));
  ctx.fillStyle = gr; ctx.fillRect(-10, yg, W + 20, H - yg + 10);
  // dalles du sol
  ctx.strokeStyle = hsl(h, 80, 45, 0.25); ctx.lineWidth = 1;
  for (var x = Math.floor(x0 / 2) * 2; x < x1; x += 2) { var sx = R.sx(x); ctx.beginPath(); ctx.moveTo(sx, yg); ctx.lineTo(sx - k * 0.6, H); ctx.stroke(); }
  neon(ctx, -10, yg, W + 10, yg, hsl(h, 100, 70), k);
  // plafond du monde
  var yc = R.sy(HAUT);
  ctx.fillStyle = hsl(h, 60, 6, 0.85); ctx.fillRect(-10, -10, W + 20, yc + 10);
  neon(ctx, -10, yc, W + 10, yc, hsl(h, 100, 70, 0.5), k * 0.6);
}
function neon(ctx, xa, ya, xb, yb, c, k) {
  ctx.strokeStyle = c; ctx.globalAlpha = 0.22; ctx.lineWidth = k * 0.22;
  ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(xb, yb); ctx.stroke();
  ctx.globalAlpha = 1; ctx.lineWidth = Math.max(1.5, k * 0.06); ctx.stroke();
}

/* ---------- Objets du niveau ---------- */
function dessinerObjets(J, h, x0, x1, t) {
  var R = Rendu, ctx = R.ctx, k = R.k, L = J.L, p = J.p;
  var murs = [], blocs = [], piques = [], autres = [];
  Grille.tour++;
  L.g.pres(x0, x1, function (o) {
    if (o.k === 'm') murs.push(o); else if (o.k === 'b') { if (o.w > 0.001) blocs.push(o); } else if (o.k === 'p') piques.push(o); else autres.push(o);
  });
  var acc = hsl(h, 100, 68), sombre = hsl(h, 70, 9), moyen = hsl(h, 60, 18);
  // murs (couloirs)
  for (var i = 0; i < murs.length; i++) dessinerMur(murs[i], h, x0, x1);
  // blocs
  for (var b = 0; b < blocs.length; b++) {
    var o = blocs[b];
    var X = R.sx(o.x), Y = R.sy(o.y + o.h), w = o.w * k, hh = Math.min(o.h, 30) * k;
    if (o.y + o.h > HAUT + 0.5) { Y = R.sy(HAUT + 0.5); hh = (HAUT + 0.5 - o.y) * k; }
    var gr = ctx.createLinearGradient(0, Y, 0, Y + hh);
    gr.addColorStop(0, moyen); gr.addColorStop(1, sombre);
    ctx.fillStyle = gr; ctx.fillRect(X, Y, w, hh);
    // grille intérieure
    ctx.strokeStyle = hsl(h, 80, 50, 0.12); ctx.lineWidth = 1; ctx.beginPath();
    for (var gx = Math.ceil(o.x); gx < o.x + o.w; gx++) { ctx.moveTo(R.sx(gx), Y); ctx.lineTo(R.sx(gx), Y + hh); }
    for (var gy = Math.ceil(o.y); gy < Math.min(o.y + o.h, HAUT); gy++) { ctx.moveTo(X, R.sy(gy)); ctx.lineTo(X + w, R.sy(gy)); }
    ctx.stroke();
    ctx.strokeStyle = acc; ctx.lineWidth = Math.max(1.5, k * 0.055); ctx.strokeRect(X, Y, w, hh);
    // arête utile (dessus ou dessous) plus lumineuse
    if (o.st === 2) neon(ctx, X, Y + hh, X + w, Y + hh, acc, k * 0.8);
    else neon(ctx, X, Y, X + w, Y, acc, k * 0.8);
  }
  // piques
  for (var q = 0; q < piques.length; q++) {
    var sp = piques[q], d = sp.dir, ht = 0.85 * sp.t;
    var bx = R.sx(sp.x), by = R.sy(sp.y), ax = R.sx(sp.x + 0.5), ay = R.sy(sp.y + ht * d);
    var grp = ctx.createLinearGradient(0, by, 0, ay);
    grp.addColorStop(0, '#000'); grp.addColorStop(1, hsl(h, 50, 22));
    ctx.fillStyle = grp; ctx.beginPath(); ctx.moveTo(bx + k * 0.04, by); ctx.lineTo(ax, ay); ctx.lineTo(bx + k * 0.96, by); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1, k * 0.045); ctx.stroke();
    R.halo(ax, ay, k * 0.3, hsl(h + 180, 100, 70), 0.25 + R.pulse * 0.2);
  }
  // autres
  for (var a = 0; a < autres.length; a++) {
    var o2 = autres[a];
    if (o2.k === 's') dessinerScie(o2, t, h);
    else if (o2.k === 'o') dessinerOrbe(o2, t, p);
    else if (o2.k === 't') dessinerTampon(o2, t);
    else if (o2.k === 'po') dessinerPortail(o2, t);
    else if (o2.k === 'e' && !p.eclatsPris[o2.id]) dessinerEclat(o2, t);
  }
}
function dessinerMur(m, h, x0, x1) {
  var R = Rendu, ctx = R.ctx, k = R.k;
  var i0 = Math.max(0, Math.floor((x0 - m.x0) / m.dx)), i1 = Math.min(m.f.length - 1, Math.ceil((x1 - m.x0) / m.dx));
  if (i1 <= i0) return;
  var acc = hsl(h + 15, 100, 66);
  var bas = R.H + 10, haut = -10;
  var tabs = [m.f, m.c];
  for (var w = 0; w < 2; w++) {
    var tab = tabs[w], lim = w === 0 ? bas : haut;
    ctx.beginPath();
    ctx.moveTo(R.sx(m.x0 + i0 * m.dx), lim);
    for (var i = i0; i <= i1; i++) { var v = tab[i]; if (w === 0 && v <= 0.02) v = -0.02; if (w === 1 && v >= HAUT - 0.02) v = HAUT + 0.02; ctx.lineTo(R.sx(m.x0 + i * m.dx), R.sy(v)); }
    ctx.lineTo(R.sx(m.x0 + i1 * m.dx), lim); ctx.closePath();
    var gr = ctx.createLinearGradient(0, w === 0 ? R.sy(5) : R.sy(5), 0, lim);
    gr.addColorStop(0, hsl(h, 65, 16)); gr.addColorStop(1, hsl(h, 70, 5));
    ctx.fillStyle = gr; ctx.fill();
    // bord lumineux
    ctx.beginPath(); var dans = false;
    for (var j = i0; j <= i1; j++) {
      var v2 = tab[j], actif = w === 0 ? v2 > 0.02 : v2 < HAUT - 0.02;
      if (!actif) { dans = false; continue; }
      var X = R.sx(m.x0 + j * m.dx), Y = R.sy(v2);
      if (!dans) { ctx.moveTo(X, Y); dans = true; } else ctx.lineTo(X, Y);
    }
    ctx.strokeStyle = acc; ctx.globalAlpha = 0.25; ctx.lineWidth = k * 0.25; ctx.stroke();
    ctx.globalAlpha = 1; ctx.lineWidth = Math.max(1.5, k * 0.07); ctx.stroke();
    // dents (danger) le long du bord
    ctx.fillStyle = hsl(h + 15, 100, 80, 0.55);
    for (var z = i0; z <= i1; z += 2) {
      var vz = tab[z]; if (w === 0 ? vz <= 0.02 : vz >= HAUT - 0.02) continue;
      var zx = R.sx(m.x0 + z * m.dx), zy = R.sy(vz), dz = (w === 0 ? 1 : -1) * k * 0.14;
      ctx.beginPath(); ctx.moveTo(zx - k * 0.08, zy + dz * 0.2); ctx.lineTo(zx, zy - dz); ctx.lineTo(zx + k * 0.08, zy + dz * 0.2); ctx.fill();
    }
  }
}
function dessinerScie(o, t, h) {
  var R = Rendu, ctx = R.ctx, k = R.k, X = R.sx(o.x), Y = R.sy(o.y), r = o.r * k;
  R.halo(X, Y, r * 1.9, hsl(h + 180, 100, 60), 0.35);
  ctx.save(); ctx.translate(X, Y); ctx.rotate(-t * 6);
  ctx.beginPath();
  var n = 12;
  for (var i = 0; i < n * 2; i++) { var a = i * Math.PI / n, rr = i % 2 ? r * 0.78 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  ctx.closePath();
  var gr = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
  gr.addColorStop(0, '#333'); gr.addColorStop(1, '#0a0a0a');
  ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1, k * 0.04); ctx.stroke();
  ctx.strokeStyle = hsl(h + 180, 100, 65); ctx.beginPath(); ctx.arc(0, 0, r * 0.45, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-r * 0.45, 0); ctx.lineTo(r * 0.45, 0); ctx.moveTo(0, -r * 0.45); ctx.lineTo(0, r * 0.45); ctx.stroke();
  ctx.restore();
}
function dessinerOrbe(o, t, p) {
  var R = Rendu, ctx = R.ctx, k = R.k, X = R.sx(o.x), Y = R.sy(o.y);
  var c = o.t === 'bleu' ? '#4dc3ff' : o.t === 'rose' ? '#ff6fd8' : '#ffe14d';
  var used = p.utilises[o.id];
  R.halo(X, Y, k * 1.1, c, used ? 0.15 : 0.5 + R.pulse * 0.3);
  ctx.strokeStyle = c; ctx.lineWidth = k * 0.08; ctx.globalAlpha = used ? 0.3 : 1;
  ctx.beginPath(); ctx.arc(X, Y, k * 0.36, 0, 7); ctx.stroke();
  ctx.fillStyle = c; ctx.beginPath(); ctx.arc(X, Y, k * 0.2, 0, 7); ctx.fill();
  var a = (t * 1.6) % 1; ctx.globalAlpha = (1 - a) * (used ? 0.1 : 0.6); ctx.lineWidth = k * 0.04;
  ctx.beginPath(); ctx.arc(X, Y, k * (0.4 + a * 0.5), 0, 7); ctx.stroke();
  ctx.globalAlpha = 1;
}
function dessinerTampon(o, t) {
  var R = Rendu, ctx = R.ctx, k = R.k;
  var c = o.t === 'bleu' ? '#4dc3ff' : o.t === 'rose' ? '#ff6fd8' : '#ffe14d';
  var X = R.sx(o.x + 0.5), Y = R.sy(o.y);
  R.halo(X, Y - k * 0.2 * o.dir, k * 0.9, c, 0.5 + R.pulse * 0.3);
  ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(X, Y, k * 0.45, k * 0.2, 0, o.dir === 1 ? Math.PI : 0, o.dir === 1 ? 2 * Math.PI : Math.PI); ctx.fill();
  for (var i = 0; i < 3; i++) { var a = ((t * 1.5 + i / 3) % 1); ctx.globalAlpha = 1 - a; ctx.fillRect(X - k * 0.05, Y - (a * 1.6 * o.dir + 0.2 * o.dir) * k, k * 0.1, k * 0.1); }
  ctx.globalAlpha = 1;
}
var COUL_MODE = { cube: '#5dff8a', vaisseau: '#ff6fd8', boule: '#ff8a3d', onde: '#5ad0ff', ovni: '#ffd23f' };
var COUL_VIT = ['#ffb000', '#5ad0ff', '#5dff8a', '#ff6fd8', '#ff3d3d'];
function dessinerPortail(o, t) {
  var R = Rendu, ctx = R.ctx, k = R.k, X = R.sx(o.x);
  var c = o.t === 'mode' ? COUL_MODE[o.v] : o.t === 'vit' ? COUL_VIT[o.v] : '#fff';
  var y0 = R.sy(HAUT), y1 = R.sy(0);
  var gr = ctx.createLinearGradient(X - k * 0.8, 0, X + k * 0.8, 0);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, c); gr.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.28 + R.pulse * 0.2; ctx.fillStyle = gr; ctx.fillRect(X - k * 0.8, y0, k * 1.6, y1 - y0);
  ctx.globalAlpha = 1; ctx.strokeStyle = c; ctx.lineWidth = Math.max(2, k * 0.08);
  ctx.beginPath(); ctx.moveTo(X, y0); ctx.lineTo(X, y1); ctx.stroke();
  // anneaux qui défilent
  for (var i = 0; i < 6; i++) {
    var yy = ((i / 6 + t * 0.35) % 1) * HAUT;
    ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.ellipse(X, R.sy(yy), k * 0.35, k * 0.12, 0, 0, 7); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // icône
  var ys = [2.2, 5, 7.8];
  for (var j = 0; j < 3; j++) {
    var Y = R.sy(ys[j]);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.arc(X, Y, k * 0.55, 0, 7); ctx.fill();
    ctx.strokeStyle = c; ctx.lineWidth = k * 0.06; ctx.stroke();
    if (o.t === 'mode') dessinerJoueur(ctx, o.v, { cube: 0, c1: 5, c2: 15 }, X, Y, k * 0.75, 0, 1);
    else if (o.t === 'vit') {
      ctx.fillStyle = c; var n = o.v + 1;
      for (var a = 0; a < n; a++) { var ox = (a - (n - 1) / 2) * k * 0.2; ctx.beginPath(); ctx.moveTo(X + ox - k * 0.1, Y - k * 0.22); ctx.lineTo(X + ox + k * 0.1, Y); ctx.lineTo(X + ox - k * 0.1, Y + k * 0.22); ctx.lineTo(X + ox - k * 0.02, Y); ctx.fill(); }
    }
  }
}
function dessinerEclat(o, t) {
  var R = Rendu, ctx = R.ctx, k = R.k, X = R.sx(o.x), Y = R.sy(o.y + Math.sin(t * 3 + o.n) * 0.08);
  R.halo(X, Y, k * 0.75, '#bff8ff', 0.45 + R.pulse * 0.3);
  ctx.save(); ctx.translate(X, Y); ctx.rotate(t * 1.5 + o.n);
  var s = k * 0.24;
  ctx.fillStyle = '#e8fdff'; ctx.strokeStyle = '#2bd9ff'; ctx.lineWidth = Math.max(1, k * 0.04);
  ctx.beginPath(); ctx.moveTo(0, -s * 1.3); ctx.lineTo(s * 0.8, 0); ctx.lineTo(0, s * 1.3); ctx.lineTo(-s * 0.8, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

/* ---------- Joueur ---------- */
function dessinerJoueurJeu(J, t, dtr) {
  var R = Rendu, ctx = R.ctx, k = R.k, p = J.p;
  if (J.explose) return;
  var X = R.sx(p.x), Y = R.sy(p.y);
  var ic = Sauve.d.icone, c1 = COULEURS[ic.c1], c2 = COULEURS[ic.c2];
  // traînée
  var tr = J.trace;
  tr.push({ x: p.x, y: p.y, m: p.mode });
  while (tr.length > 60) tr.shift();
  var type = ic.trainee;
  if (p.mode === 'onde') {
    ctx.strokeStyle = c2 === '#202030' ? c1 : c2; ctx.lineJoin = 'round';
    ctx.beginPath(); var deb = false;
    for (var i = 0; i < tr.length; i++) { if (tr[i].m !== 'onde') { deb = false; continue; } var tx = R.sx(tr[i].x), ty = R.sy(tr[i].y); if (!deb) { ctx.moveTo(tx, ty); deb = true; } else ctx.lineTo(tx, ty); }
    ctx.globalAlpha = 0.3; ctx.lineWidth = k * 0.35; ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = k * 0.12; ctx.stroke();
  } else if (type !== 7) {
    for (var j = 1; j < tr.length; j += 1) {
      var a = j / tr.length, P = tr[j], Q = tr[j - 1];
      var c = type === 2 ? hsl(j * 12 + t * 200, 100, 65) : type === 3 ? hsl(20 + a * 30, 100, 50 + a * 20) : type === 5 ? (j % 2 ? c1 : c2) : c1;
      ctx.strokeStyle = c; ctx.globalAlpha = a * (type === 1 ? 0.25 : 0.5);
      ctx.lineWidth = k * (type === 6 ? 0.6 * a : 0.32 * a);
      if (type === 4) { ctx.fillStyle = c; ctx.fillRect(R.sx(P.x) - k * 0.08, R.sy(P.y) - k * 0.08, k * 0.16 * a, k * 0.16 * a); continue; }
      ctx.beginPath(); ctx.moveTo(R.sx(Q.x), R.sy(Q.y)); ctx.lineTo(R.sx(P.x), R.sy(P.y)); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (type === 1 && Math.random() < 0.6) particule(p.x - 0.3, p.y + (Math.random() - 0.5) * 0.4, -2 - Math.random() * 2, (Math.random() - 0.5) * 2, 0.4, c2, 0.08);
  }
  // halo
  R.halo(X, Y, k * 1.1, c1, 0.35 + R.pulse * 0.2);
  // angle
  var ang = 0;
  if (p.mode === 'cube') {
    if (!p.sol) J.rot += dtr * 7.5 * p.g; else { var cible = Math.round(J.rot / (Math.PI / 2)) * (Math.PI / 2); J.rot += (cible - J.rot) * Math.min(1, dtr * 25); }
    ang = J.rot;
  } else if (p.mode === 'vaisseau') ang = -Math.atan2(p.vy, VITESSES[p.vit] * 1.6);
  else if (p.mode === 'onde') ang = -Math.atan2(p.vy, VITESSES[p.vit]);
  else if (p.mode === 'boule') { J.rot += dtr * 9 * p.g; ang = J.rot; }
  else if (p.mode === 'ovni') ang = -p.vy * 0.025;
  if (J.mutateur === 'miroir') { }
  dessinerJoueur(ctx, p.mode, ic, X, Y, k, ang, p.g);
  // vaisseau / ovni : petites flammes
  if ((p.mode === 'vaisseau' && J.tenu) || (p.mode === 'ovni' && p.vy * p.g > 4)) particule(p.x - 0.5, p.y - 0.1 * p.g, -4, -p.g * 1.5 + (Math.random() - 0.5), 0.35, '#ffb04d', 0.1);
}
function dessinerGuide(J, t) {
  var R = Rendu, ctx = R.ctx, k = R.k, L = J.L, st = J.p.step;
  if (st >= L.gy.length) return;
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = Math.max(1, k * 0.05); ctx.setLineDash([k * 0.15, k * 0.15]);
  ctx.beginPath();
  for (var s = st; s < Math.min(L.gy.length, st + 480); s += 6) { var X = R.sx(L.xs[s]), Y = R.sy(L.gy[s]); if (s === st) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); }
  ctx.stroke(); ctx.setLineDash([]);
  // appuis du fantôme à venir
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (var s2 = st + 1; s2 < Math.min(L.ghost.length, st + 480); s2++) {
    if (L.ghost[s2] && !L.ghost[s2 - 1]) { ctx.beginPath(); ctx.arc(R.sx(L.xs[s2]), R.sy(L.gy[s2]), k * 0.1, 0, 7); ctx.fill(); }
  }
}
function dessinerPointsControle(J) {
  if (!J.pratique) return;
  var R = Rendu, ctx = R.ctx, k = R.k;
  for (var i = 0; i < J.points.length; i++) {
    var c = J.points[i], X = R.sx(c.p.x), Y = R.sy(c.p.y);
    ctx.save(); ctx.translate(X, Y); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = 'rgba(93,255,138,0.85)'; ctx.strokeStyle = '#003a12'; ctx.lineWidth = 2;
    ctx.fillRect(-k * 0.2, -k * 0.2, k * 0.4, k * 0.4); ctx.strokeRect(-k * 0.2, -k * 0.2, k * 0.4, k * 0.4);
    ctx.restore();
  }
}

/* ---------- Particules ---------- */
function particule(x, y, vx, vy, vie, c, taille, g) { var P = Rendu.parts; if (P.length > 900) return; P.push({ x: x, y: y, vx: vx, vy: vy, vie: vie, v0: vie, c: c, s: taille || 0.12, g: g || 0 }); }
function dessinerParticules(J, dt) {
  if (!Sauve.d.reglages.particules) { Rendu.parts.length = 0; return; }
  var R = Rendu, ctx = R.ctx, k = R.k, P = R.parts;
  ctx.globalCompositeOperation = 'lighter';
  for (var i = P.length - 1; i >= 0; i--) {
    var q = P[i]; q.vie -= dt; if (q.vie <= 0) { P.splice(i, 1); continue; }
    q.vy -= q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt;
    var a = q.vie / q.v0; ctx.globalAlpha = a; ctx.fillStyle = q.c;
    var s = q.s * k * (0.5 + a * 0.5);
    ctx.fillRect(R.sx(q.x) - s / 2, R.sy(q.y) - s / 2, s, s);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function explosionJoueur(p, style) {
  var ic = Sauve.d.icone, c1 = COULEURS[ic.c1], c2 = COULEURS[ic.c2];
  var n = 60;
  for (var i = 0; i < n; i++) {
    var a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 9;
    if (style === 1) { a = i / n * Math.PI * 2; v = 8; }
    if (style === 5) { a = i / n * Math.PI * 6; v = 2 + i / n * 9; }
    var c = style === 4 ? hsl(Math.random() * 360, 100, 60) : (i % 2 ? c1 : c2);
    particule(p.x, p.y, Math.cos(a) * v, Math.sin(a) * v, 0.5 + Math.random() * 0.6, c, style === 2 ? 0.25 : style === 3 ? 0.2 : 0.14, style === 4 ? 12 : 0);
  }
  if (style === 3) for (var j = 0; j < 40; j++) { var b = Math.random() * 7; particule(p.x, p.y, Math.cos(b) * 14, Math.sin(b) * 14, 0.35, '#fff', 0.1); }
  Rendu.secousse = 1; Rendu.flash = 0.25;
}

/* ---------- Boss ---------- */
function dessinerBoss(J, t, h) {
  var L = J.L; if (!L.espece || J.sansBoss) return;
  var R = Rendu, ctx = R.ctx, k = R.k;
  var bp = bossPos(L, Math.min(t, (L.xs.length - 1) * DT));
  var X = R.sx(J.p.x + BOSS_DX), Y = R.sy(bp.y);
  var esp = J.especeActuelle || L.espece;
  var E = ESPECES[esp];
  var vie = J.vieBoss != null ? J.vieBoss : 1;
  var etat = { t: t, pulse: R.pulse, vie: vie, coup: J.coupBoss || 0, mort: J.bossMort || 0, regard: Math.atan2(R.sy(J.p.y) - Y, R.sx(J.p.x) - X), charge: J.chargeBoss || 0 };
  if (etat.mort >= 1) return;
  ctx.save();
  ctx.translate(X, Y);
  var sc = k * (1 + R.pulse * 0.04) * (1 - etat.mort * 0.3);
  if (etat.mort > 0) { ctx.rotate(etat.mort * 0.5); ctx.globalAlpha = 1 - etat.mort; }
  R.halo(0, 0, sc * 5, E.c1, 0.22 + R.pulse * 0.1 + etat.charge * 0.25);
  if (etat.coup > 0) { ctx.translate((Math.random() - 0.5) * k * 0.3 * etat.coup, 0); }
  (DESSINS_BOSS[esp] || DESSINS_BOSS.oeil)(ctx, sc, etat, E);
  if (etat.coup > 0) { ctx.globalCompositeOperation = 'lighter'; R.halo(0, 0, sc * 3.5, '#ffffff', etat.coup * 0.5); ctx.globalCompositeOperation = 'source-over'; }
  ctx.restore();
  J.coupBoss = Math.max(0, (J.coupBoss || 0) - 0.05);
}

var DESSINS_BOSS = {
  oeil: function (ctx, s, e, E) {
    // éclats en orbite
    for (var i = 0; i < 8; i++) {
      var a = e.t * 0.6 + i * Math.PI / 4, r = s * (3.1 + Math.sin(e.t * 2 + i) * 0.15);
      ctx.save(); ctx.translate(Math.cos(a) * r, Math.sin(a) * r); ctx.rotate(a * 2);
      ctx.fillStyle = E.c2; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(0, -s * 0.3); ctx.lineTo(s * 0.12, 0); ctx.lineTo(0, s * 0.3); ctx.lineTo(-s * 0.12, 0); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    var R0 = s * 2.4;
    var g = ctx.createRadialGradient(-R0 * 0.3, -R0 * 0.3, R0 * 0.1, 0, 0, R0);
    g.addColorStop(0, '#fff'); g.addColorStop(0.7, '#ffe0e6'); g.addColorStop(1, '#b0485e');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R0, 0, 7); ctx.fill();
    // veines
    ctx.strokeStyle = 'rgba(200,30,60,0.45)'; ctx.lineWidth = s * 0.05;
    for (var v = 0; v < 9; v++) { var av = v * 0.7 + 0.3; ctx.beginPath(); ctx.moveTo(Math.cos(av) * R0, Math.sin(av) * R0); ctx.quadraticCurveTo(Math.cos(av + 0.3) * R0 * 0.75, Math.sin(av + 0.3) * R0 * 0.75, Math.cos(av + 0.1) * R0 * 0.62, Math.sin(av + 0.1) * R0 * 0.62); ctx.stroke(); }
    // iris
    var ix = Math.cos(e.regard) * R0 * 0.35, iy = Math.sin(e.regard) * R0 * 0.35;
    var gi = ctx.createRadialGradient(ix, iy, 0, ix, iy, R0 * 0.6);
    gi.addColorStop(0, E.c2); gi.addColorStop(0.6, E.c1); gi.addColorStop(1, '#300010');
    ctx.fillStyle = gi; ctx.beginPath(); ctx.arc(ix, iy, R0 * 0.58, 0, 7); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(ix * 1.1, iy * 1.1, R0 * (0.12 + e.charge * 0.1), R0 * (0.34 + e.pulse * 0.05), 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(ix - R0 * 0.18, iy - R0 * 0.2, R0 * 0.09, 0, 7); ctx.fill();
    // paupières (clignement)
    var cl = Math.max(0, Math.sin(e.t * 0.9) - 0.96) * 25;
    if (cl > 0) { ctx.fillStyle = '#5a1020'; ctx.beginPath(); ctx.ellipse(0, 0, R0 * 1.02, R0 * cl, 0, 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#000'; ctx.lineWidth = s * 0.12; ctx.beginPath(); ctx.arc(0, 0, R0, 0, 7); ctx.stroke();
  },
  meduse: function (ctx, s, e, E) {
    var R0 = s * 2.2;
    // tentacules
    for (var i = 0; i < 9; i++) {
      var bx = (i - 4) * R0 * 0.22;
      ctx.strokeStyle = i % 2 ? E.c1 : E.c2; ctx.globalAlpha = 0.8; ctx.lineWidth = s * (0.22 - Math.abs(i - 4) * 0.015); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx, R0 * 0.3);
      for (var j = 1; j <= 8; j++) { var yy = R0 * 0.3 + j * s * 0.5, xx = bx + Math.sin(e.t * 2.5 + j * 0.7 + i) * s * 0.3 * j / 4; ctx.lineTo(xx, yy); }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    var g = ctx.createRadialGradient(0, -R0 * 0.3, R0 * 0.1, 0, 0, R0 * 1.2);
    g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.4, E.c1); g.addColorStop(1, 'rgba(60,20,120,0.9)');
    ctx.fillStyle = g;
    var sq = 1 + e.pulse * 0.08;
    ctx.beginPath(); ctx.ellipse(0, 0, R0 * sq, R0 * 0.85 / sq, 0, Math.PI, 0);
    for (var b = 0; b <= 8; b++) { var xb = R0 * sq - b * R0 * sq / 4; ctx.lineTo(xb, R0 * 0.35 + (b % 2) * s * 0.25); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = s * 0.06; ctx.stroke();
    for (var q = 0; q < 6; q++) { var a = q * 1.1 + e.t * 0.4; Rendu.halo(Math.cos(a) * R0 * 0.55, -R0 * 0.25 + Math.sin(a) * R0 * 0.25, s * 0.5, E.c2, 0.7); }
    // yeux
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-R0 * 0.3, -R0 * 0.1, s * 0.32, 0, 7); ctx.arc(R0 * 0.3, -R0 * 0.1, s * 0.32, 0, 7); ctx.fill();
    ctx.fillStyle = '#1a0033'; var ox = Math.cos(e.regard) * s * 0.12, oy = Math.sin(e.regard) * s * 0.12;
    ctx.beginPath(); ctx.arc(-R0 * 0.3 + ox, -R0 * 0.1 + oy, s * 0.16, 0, 7); ctx.arc(R0 * 0.3 + ox, -R0 * 0.1 + oy, s * 0.16, 0, 7); ctx.fill();
  },
  prisme: function (ctx, s, e, E) {
    var R0 = s * 2.5, a0 = e.t * 0.5;
    // rayons réfractés
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < 6; i++) { var a = a0 * 0.7 + i * Math.PI / 3; ctx.strokeStyle = hsl(i * 60 + e.t * 40, 100, 60, 0.25); ctx.lineWidth = s * 0.3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * R0 * 2, Math.sin(a) * R0 * 2); ctx.stroke(); }
    ctx.globalCompositeOperation = 'source-over';
    var pts = [];
    for (var j = 0; j < 6; j++) { var b = a0 + j * Math.PI / 3; pts.push([Math.cos(b) * R0, Math.sin(b) * R0 * 1.15]); }
    for (var f = 0; f < 6; f++) {
      var A = pts[f], B = pts[(f + 1) % 6];
      ctx.fillStyle = f % 2 ? E.c1 : ombre(E.c1, -0.35);
      ctx.globalAlpha = 0.75 + 0.25 * Math.sin(e.t * 2 + f);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = s * 0.07;
    ctx.beginPath(); pts.forEach(function (P, i) { if (i) ctx.lineTo(P[0], P[1]); else ctx.moveTo(P[0], P[1]); }); ctx.closePath(); ctx.stroke();
    pts.forEach(function (P) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(P[0], P[1]); ctx.globalAlpha = 0.4; ctx.stroke(); }); ctx.globalAlpha = 1;
    var gc = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.9);
    gc.addColorStop(0, '#fff'); gc.addColorStop(1, E.c2);
    ctx.fillStyle = gc; ctx.beginPath(); ctx.arc(Math.cos(e.regard) * s * 0.3, Math.sin(e.regard) * s * 0.3, s * (0.55 + e.pulse * 0.15 + e.charge * 0.2), 0, 7); ctx.fill();
  },
  crane: function (ctx, s, e, E) {
    var R0 = s * 2.2;
    var mach = e.charge * s * 0.6 + e.pulse * s * 0.15;
    // mâchoire
    ctx.fillStyle = '#d9d6c3'; ctx.strokeStyle = '#000'; ctx.lineWidth = s * 0.1;
    ctx.beginPath(); ctx.moveTo(-R0 * 0.6, R0 * 0.45 + mach); ctx.lineTo(R0 * 0.6, R0 * 0.45 + mach); ctx.lineTo(R0 * 0.45, R0 * 0.95 + mach); ctx.lineTo(-R0 * 0.45, R0 * 0.95 + mach); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; for (var d = -3; d <= 3; d++) { ctx.fillRect(d * R0 * 0.14 - s * 0.1, R0 * 0.45 + mach - s * 0.28, s * 0.2, s * 0.28); }
    // crâne
    var g = ctx.createRadialGradient(-R0 * 0.3, -R0 * 0.5, R0 * 0.1, 0, 0, R0 * 1.1);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#a8a38a');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -R0 * 0.1, R0, Math.PI * 0.85, Math.PI * 0.15);
    ctx.lineTo(R0 * 0.6, R0 * 0.5); ctx.lineTo(-R0 * 0.6, R0 * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (var d2 = -3; d2 <= 3; d2++) { ctx.fillStyle = '#fff'; ctx.fillRect(d2 * R0 * 0.14 - s * 0.1, R0 * 0.5, s * 0.2, s * 0.3); }
    // fissure
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = s * 0.06; ctx.beginPath(); ctx.moveTo(R0 * 0.1, -R0 * 1.05); ctx.lineTo(R0 * 0.25, -R0 * 0.75); ctx.lineTo(R0 * 0.12, -R0 * 0.55); ctx.lineTo(R0 * 0.3, -R0 * 0.35); ctx.stroke();
    // orbites
    ctx.fillStyle = '#100'; ctx.beginPath(); ctx.ellipse(-R0 * 0.38, -R0 * 0.05, R0 * 0.26, R0 * 0.3, 0.2, 0, 7); ctx.ellipse(R0 * 0.38, -R0 * 0.05, R0 * 0.26, R0 * 0.3, -0.2, 0, 7); ctx.fill();
    var ox = Math.cos(e.regard) * s * 0.15, oy = Math.sin(e.regard) * s * 0.15;
    Rendu.halo(-R0 * 0.38 + ox, -R0 * 0.05 + oy, s * 0.9, E.c2, 0.9); Rendu.halo(R0 * 0.38 + ox, -R0 * 0.05 + oy, s * 0.9, E.c2, 0.9);
    ctx.fillStyle = '#100'; ctx.beginPath(); ctx.moveTo(0, R0 * 0.18); ctx.lineTo(-s * 0.25, R0 * 0.4); ctx.lineTo(s * 0.25, R0 * 0.4); ctx.fill();
  },
  horloge: function (ctx, s, e, E) {
    var R0 = s * 2.4;
    // engrenages
    var eng = function (x, y, r, n, a) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = ombre(E.c1, -0.4); ctx.beginPath();
      for (var i = 0; i < n * 2; i++) { var b = i * Math.PI / n, rr = i % 2 ? r * 0.82 : r; ctx.lineTo(Math.cos(b) * rr, Math.sin(b) * rr); }
      ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = s * 0.06; ctx.stroke(); ctx.restore();
    };
    eng(-R0 * 0.9, -R0 * 0.8, s * 1.1, 10, e.t * 0.8); eng(R0 * 0.95, R0 * 0.75, s * 0.9, 8, -e.t * 1.1); eng(R0 * 0.8, -R0 * 0.95, s * 0.6, 7, e.t * 1.4);
    var g = ctx.createRadialGradient(0, 0, R0 * 0.2, 0, 0, R0);
    g.addColorStop(0, '#fff8e0'); g.addColorStop(1, '#d9a63a');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#3a2600'; ctx.lineWidth = s * 0.18; ctx.stroke();
    ctx.fillStyle = '#3a2600';
    for (var i = 0; i < 12; i++) { var a = i * Math.PI / 6; ctx.save(); ctx.rotate(a); ctx.fillRect(-s * 0.06, -R0 * 0.92, s * 0.12, i % 3 ? s * 0.25 : s * 0.45); ctx.restore(); }
    // aiguilles calées sur le rythme
    var tour = (e.t * 0.5) % 1;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2a1a00'; ctx.lineWidth = s * 0.22; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(e.t * 0.2) * R0 * 0.5, -Math.cos(e.t * 0.2) * R0 * 0.5); ctx.stroke();
    var ab = Math.floor(e.t * 2) * Math.PI / 6 + (1 - e.pulse) * 0.08;
    ctx.strokeStyle = E.c2; ctx.lineWidth = s * 0.12; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(ab) * R0 * 0.82, -Math.cos(ab) * R0 * 0.82); ctx.stroke();
    ctx.fillStyle = '#2a1a00'; ctx.beginPath(); ctx.arc(0, 0, s * 0.3, 0, 7); ctx.fill();
    Rendu.halo(0, 0, s * 1.2, E.c2, 0.3 + e.charge * 0.5);
  },
  serpent: function (ctx, s, e, E) {
    var n = 14, pts = [];
    for (var i = 0; i < n; i++) pts.push([s * 2.6 - i * s * 0.6 + s * 1.5, Math.sin(e.t * 3 - i * 0.55) * s * (0.6 + i * 0.08) + s * 0.8]);
    for (var j = n - 1; j >= 0; j--) {
      var r = s * (0.95 - j * 0.04);
      var g = ctx.createRadialGradient(pts[j][0] - r * 0.3, pts[j][1] - r * 0.3, r * 0.1, pts[j][0], pts[j][1], r);
      g.addColorStop(0, ombre(E.c1, 0.4)); g.addColorStop(1, ombre(E.c1, -0.45));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(pts[j][0], pts[j][1], r, 0, 7); ctx.fill();
      ctx.fillStyle = E.c2; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(pts[j][0], pts[j][1] - r * 0.3, r * 0.25, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    }
    // tête
    var hx = pts[0][0] - s * 1.6, hy = pts[0][1] - s * 0.4;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(Math.sin(e.t * 3) * 0.15);
    var gh = ctx.createRadialGradient(-s * 0.4, -s * 0.4, s * 0.2, 0, 0, s * 1.6);
    gh.addColorStop(0, ombre(E.c1, 0.4)); gh.addColorStop(1, ombre(E.c1, -0.5));
    ctx.fillStyle = gh; ctx.beginPath(); ctx.ellipse(0, 0, s * 1.6, s * 1.1, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = s * 0.08; ctx.stroke();
    var bo = e.charge * s * 0.5 + e.pulse * s * 0.1;
    ctx.fillStyle = '#300'; ctx.beginPath(); ctx.moveTo(-s * 1.6, 0); ctx.lineTo(-s * 0.4, -bo * 0.3); ctx.lineTo(-s * 0.4, bo + s * 0.1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = E.c2; ctx.beginPath(); ctx.ellipse(-s * 0.5, -s * 0.45, s * 0.3, s * 0.2, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(-s * 0.55, -s * 0.45, s * 0.06, s * 0.18, 0, 0, 7); ctx.fill();
    ctx.restore();
  },
  forge: function (ctx, s, e, E) {
    var W0 = s * 4.2, H0 = s * 3.6;
    // pistons
    for (var i = -1; i <= 1; i += 2) {
      var ext = Math.max(0, Math.sin(e.t * 4 + i)) * s * 0.6;
      ctx.fillStyle = '#555c66'; ctx.fillRect(i * W0 * 0.32 - s * 0.25, -H0 / 2 - s * 1.2 - ext, s * 0.5, s * 1.4 + ext);
      ctx.fillStyle = '#2b2f36'; ctx.fillRect(i * W0 * 0.32 - s * 0.45, -H0 / 2 - s * 1.4 - ext, s * 0.9, s * 0.35);
    }
    var g = ctx.createLinearGradient(0, -H0 / 2, 0, H0 / 2);
    g.addColorStop(0, '#6d7480'); g.addColorStop(1, '#2a2d33');
    ctx.fillStyle = g; ctx.beginPath(); arrondi(ctx, -W0 / 2, -H0 / 2, W0, H0, s * 0.4); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = s * 0.12; ctx.stroke();
    // rivets
    ctx.fillStyle = '#9aa2ad';
    for (var r = 0; r < 8; r++) { ctx.beginPath(); ctx.arc(-W0 / 2 + s * 0.35 + r * (W0 - s * 0.7) / 7, -H0 / 2 + s * 0.3, s * 0.09, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(-W0 / 2 + s * 0.35 + r * (W0 - s * 0.7) / 7, H0 / 2 - s * 0.3, s * 0.09, 0, 7); ctx.fill(); }
    // gueule du four
    var gf = ctx.createRadialGradient(0, s * 0.3, s * 0.1, 0, s * 0.3, s * 1.6);
    gf.addColorStop(0, '#fff6c0'); gf.addColorStop(0.4, E.c1); gf.addColorStop(1, '#3a0a00');
    ctx.fillStyle = gf; ctx.beginPath(); ctx.ellipse(0, s * 0.35, s * (1.3 + e.charge * 0.3), s * (0.7 + e.pulse * 0.15), 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = s * 0.1; ctx.stroke();
    // grille
    ctx.strokeStyle = 'rgba(20,10,0,0.8)'; ctx.lineWidth = s * 0.1;
    for (var b = -2; b <= 2; b++) { ctx.beginPath(); ctx.moveTo(b * s * 0.45, -s * 0.25); ctx.lineTo(b * s * 0.45, s * 0.95); ctx.stroke(); }
    // yeux
    var ox = Math.cos(e.regard) * s * 0.1;
    Rendu.halo(-s * 0.9 + ox, -s * 0.9, s * 0.7, E.c2, 0.95); Rendu.halo(s * 0.9 + ox, -s * 0.9, s * 0.7, E.c2, 0.95);
    ctx.fillStyle = '#fff'; ctx.fillRect(-s * 1.2 + ox, -s * 1.0, s * 0.6, s * 0.18); ctx.fillRect(s * 0.6 + ox, -s * 1.0, s * 0.6, s * 0.18);
  },
  neant: function (ctx, s, e, E) {
    var R0 = s * 2.2;
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < 5; i++) {
      ctx.save(); ctx.rotate(e.t * (0.3 + i * 0.15) * (i % 2 ? -1 : 1)); ctx.scale(1, 0.35 + i * 0.05);
      ctx.strokeStyle = hsl(260 + i * 25 + e.t * 30, 100, 65, 0.5); ctx.lineWidth = s * (0.25 - i * 0.03);
      ctx.beginPath(); ctx.arc(0, 0, R0 * (1.2 + i * 0.25), 0, Math.PI * 1.6); ctx.stroke(); ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';
    var g = ctx.createRadialGradient(0, 0, R0 * 0.2, 0, 0, R0 * 1.1);
    g.addColorStop(0, '#000'); g.addColorStop(0.75, '#05000f'); g.addColorStop(0.92, E.c1); g.addColorStop(1, 'rgba(180,140,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R0 * (1.05 + e.pulse * 0.05), 0, 7); ctx.fill();
    var ox = Math.cos(e.regard) * R0 * 0.3, oy = Math.sin(e.regard) * R0 * 0.3;
    Rendu.halo(ox, oy, s * (0.8 + e.charge), '#ffffff', 0.9);
    for (var q = 0; q < 10; q++) { var a = q * 0.63 - e.t * 2, rr = R0 * (1.5 - ((e.t * 0.5 + q * 0.1) % 1) * 1.2); Rendu.halo(Math.cos(a) * rr, Math.sin(a) * rr, s * 0.2, E.c2, 0.7); }
  }
};

/* ---------- Attaques ---------- */
function dessinerAttaques(J, t, h) {
  var L = J.L, R = Rendu, ctx = R.ctx, k = R.k, W = R.W;
  if (!L.attaques.length || J.sansBoss) return;
  var E = ESPECES[J.especeActuelle || L.espece || 'oeil'];
  var dangerC = '#ff3d5a', coeur = '#ffffff';
  J.chargeBoss = 0;
  for (var i = 0; i < L.attaques.length; i++) {
    var a = L.attaques[i];
    if (a.t0 > t + 0.05) break;
    if (t > a.tb + 0.4) continue;
    var annonce = t < a.ta, actif = t >= a.ta && t <= a.tb;
    var clign = 0.5 + 0.5 * Math.sin(t * 30);
    var pr = annonce ? (t - a.t0) / Math.max(0.01, a.ta - a.t0) : 1;
    if (annonce) J.chargeBoss = Math.max(J.chargeBoss, pr);
    switch (a.type) {
      case 'laser': {
        var y0 = R.sy(a.y + a.e), y1 = R.sy(a.y - a.e);
        if (annonce) {
          ctx.fillStyle = dangerC; ctx.globalAlpha = 0.08 + 0.15 * pr * clign; ctx.fillRect(-10, y0, W + 20, y1 - y0);
          ctx.globalAlpha = 0.7; ctx.strokeStyle = dangerC; ctx.setLineDash([k * 0.3, k * 0.2]); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(W, y0); ctx.moveTo(0, y1); ctx.lineTo(W, y1); ctx.stroke(); ctx.setLineDash([]);
          // avertissement
          signe(ctx, R.sx(J.p.x + BOSS_DX - 3.5), (y0 + y1) / 2, k * 0.4, dangerC, pr);
          ctx.globalAlpha = 1;
        } else if (actif) {
          var gr = ctx.createLinearGradient(0, y0 - k * 0.5, 0, y1 + k * 0.5);
          gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.3, E.c1); gr.addColorStop(0.5, coeur); gr.addColorStop(0.7, E.c1); gr.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = gr; ctx.fillRect(-10, y0 - k * 0.5, W + 20, y1 - y0 + k);
          R.secousse = Math.max(R.secousse, 0.15);
        } else { ctx.globalAlpha = Math.max(0, 1 - (t - a.tb) / 0.3) * 0.5; ctx.fillStyle = E.c1; ctx.fillRect(-10, y0, W + 20, y1 - y0); ctx.globalAlpha = 1; }
        break;
      }
      case 'porte': {
        var X = R.sx(a.x); if (X < -k * 2 || X > W + k * 2) break;
        var app = Math.min(1, (t - a.t0) / 0.35);
        ctx.globalAlpha = app;
        var segs = [[-0.5, a.g0], [a.g1, HAUT + 0.5]];
        for (var sI = 0; sI < 2; sI++) {
          var ya = R.sy(segs[sI][1]), yb = R.sy(segs[sI][0]);
          if (yb - ya < 1) continue;
          var gp = ctx.createLinearGradient(X - k * 0.45, 0, X + k * 0.45, 0);
          gp.addColorStop(0, 'rgba(0,0,0,0)'); gp.addColorStop(0.5, E.c1); gp.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = gp; ctx.fillRect(X - k * 0.45, ya, k * 0.9, yb - ya);
          ctx.fillStyle = coeur; ctx.fillRect(X - k * 0.07, ya, k * 0.14, yb - ya);
        }
        ctx.strokeStyle = E.c2; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(X - k * 0.4, R.sy(a.g0)); ctx.lineTo(X + k * 0.4, R.sy(a.g0)); ctx.moveTo(X - k * 0.4, R.sy(a.g1)); ctx.lineTo(X + k * 0.4, R.sy(a.g1)); ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      }
      case 'balle': {
        if (annonce) {
          var bp = { x: a.x0, y: a.y0 };
          R.halo(R.sx(bp.x), R.sy(bp.y), k * (0.5 + pr), E.c2, 0.8 * pr);
          ctx.strokeStyle = dangerC; ctx.globalAlpha = 0.25 * pr; ctx.setLineDash([k * 0.2, k * 0.25]); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(R.sx(a.x0), R.sy(a.y0)); ctx.lineTo(R.sx(a.x0 + a.vx * 2), R.sy(a.y0 + a.vy * 2)); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
        } else if (actif) {
          var P = ATTAQUES.balle.pos(a, t), PX = R.sx(P.x), PY = R.sy(P.y);
          for (var q = 1; q <= 5; q++) { var P2 = ATTAQUES.balle.pos(a, t - q * 0.025); R.halo(R.sx(P2.x), R.sy(P2.y), k * a.r * (1.4 - q * 0.15), E.c1, 0.35 - q * 0.05); }
          R.halo(PX, PY, k * a.r * 2.4, E.c1, 0.8);
          ctx.fillStyle = coeur; ctx.beginPath(); ctx.arc(PX, PY, k * a.r * 0.75, 0, 7); ctx.fill();
          ctx.strokeStyle = E.c1; ctx.lineWidth = k * 0.08; ctx.stroke();
        }
        break;
      }
      case 'pluie': {
        var MX = R.sx(a.x);
        if (annonce) {
          ctx.fillStyle = dangerC; ctx.globalAlpha = 0.06 + 0.1 * pr * clign; ctx.fillRect(MX - k * a.r, R.sy(HAUT), k * a.r * 2, R.sy(0) - R.sy(HAUT));
          ctx.globalAlpha = 1; signe(ctx, MX, R.sy(HAUT - 0.6), k * 0.35, dangerC, pr);
        } else if (actif) {
          var M = ATTAQUES.pluie.pos(a, t);
          if (M.y > -1) {
            ctx.strokeStyle = E.c1; ctx.globalAlpha = 0.5; ctx.lineWidth = k * a.r; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(MX, R.sy(M.y + 1.6)); ctx.lineTo(MX, R.sy(M.y)); ctx.stroke(); ctx.globalAlpha = 1;
            R.halo(MX, R.sy(M.y), k * a.r * 2.5, E.c1, 0.8);
            ctx.fillStyle = coeur; ctx.beginPath(); ctx.arc(MX, R.sy(M.y), k * a.r * 0.8, 0, 7); ctx.fill();
            if (M.y < 0.4 && Math.random() < 0.6) particule(a.x, 0.1, (Math.random() - 0.5) * 6, Math.random() * 5, 0.4, E.c1, 0.12, 15);
          }
        }
        break;
      }
      case 'anneau': {
        var CX = R.sx(a.cx), CY = R.sy(a.cy);
        if (annonce) { R.halo(R.sx(J.p.x + BOSS_DX), R.sy(a.cy), k * (2 + pr * 2), E.c2, 0.4 * pr); }
        else if (actif) {
          var RR = a.v * (t - a.ts) * k;
          ctx.strokeStyle = E.c1; ctx.lineWidth = k * a.w * 4; ctx.globalAlpha = 0.3;
          var gA = -a.ga, gl = a.gl;
          ctx.beginPath(); ctx.arc(CX, CY, RR, gA + gl, gA - gl + 2 * Math.PI); ctx.stroke();
          ctx.globalAlpha = 1; ctx.strokeStyle = coeur; ctx.lineWidth = k * a.w * 1.6;
          ctx.beginPath(); ctx.arc(CX, CY, RR, gA + gl, gA - gl + 2 * Math.PI); ctx.stroke();
        }
        break;
      }
      case 'faisceau': {
        var bc = bossPos(L, t), BX = R.sx(J.p.x + BOSS_DX), BY = R.sy(bc.y);
        var ang = ATTAQUES.faisceau.angle(a, Math.max(t, a.ta));
        var ex = BX + Math.cos(ang) * k * 40, ey = BY - Math.sin(ang) * k * 40;
        if (annonce) {
          ctx.strokeStyle = dangerC; ctx.globalAlpha = 0.25 + 0.4 * pr * clign; ctx.lineWidth = 2; ctx.setLineDash([k * 0.3, k * 0.2]);
          ctx.beginPath(); ctx.moveTo(BX, BY); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
          // sens de rotation
          var a2 = ang + a.w * 0.35, ex2 = BX + Math.cos(a2) * k * 8, ey2 = BY - Math.sin(a2) * k * 8;
          ctx.globalAlpha = 0.5 * pr; ctx.beginPath(); ctx.moveTo(BX + Math.cos(ang) * k * 8, BY - Math.sin(ang) * k * 8); ctx.lineTo(ex2, ey2); ctx.stroke();
          ctx.globalAlpha = 1;
        } else if (actif) {
          ctx.lineCap = 'round';
          ctx.strokeStyle = E.c1; ctx.globalAlpha = 0.35; ctx.lineWidth = k * a.e * 5; ctx.beginPath(); ctx.moveTo(BX, BY); ctx.lineTo(ex, ey); ctx.stroke();
          ctx.globalAlpha = 1; ctx.strokeStyle = coeur; ctx.lineWidth = k * a.e * 1.8; ctx.stroke();
          R.secousse = Math.max(R.secousse, 0.12);
        }
        break;
      }
      case 'mine': {
        var NX = R.sx(a.x), NY = R.sy(a.y);
        if (t < a.te) {
          var pm = (t - a.t0) / (a.te - a.t0);
          ctx.strokeStyle = dangerC; ctx.globalAlpha = 0.3 + 0.5 * pm; ctx.lineWidth = 2; ctx.setLineDash([k * 0.15, k * 0.15]);
          ctx.beginPath(); ctx.arc(NX, NY, k * a.re, 0, 7); ctx.stroke(); ctx.setLineDash([]);
          ctx.beginPath(); ctx.arc(NX, NY, k * a.re * (1 - pm), 0, 7); ctx.globalAlpha = 0.6; ctx.stroke(); ctx.globalAlpha = 1;
          R.halo(NX, NY, k * 0.9, E.c1, 0.6 + 0.4 * clign * pm);
          ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(NX, NY, k * 0.3, 0, 7); ctx.fill(); ctx.strokeStyle = E.c1; ctx.lineWidth = k * 0.06; ctx.stroke();
        } else if (t <= a.tb + 0.25) {
          var pe = (t - a.te) / 0.43;
          R.halo(NX, NY, k * a.re * 2.2, E.c1, 1 - pe);
          ctx.fillStyle = coeur; ctx.globalAlpha = Math.max(0, 1 - pe * 1.5); ctx.beginPath(); ctx.arc(NX, NY, k * a.re * (0.6 + pe * 0.5), 0, 7); ctx.fill(); ctx.globalAlpha = 1;
          if (pe < 0.1) R.secousse = Math.max(R.secousse, 0.4);
        }
        break;
      }
      case 'pilon': {
        var PXX = R.sx(a.x), lw = a.l * k;
        if (annonce) {
          ctx.fillStyle = dangerC; ctx.globalAlpha = 0.08 + 0.14 * pr * clign;
          if (a.haut) ctx.fillRect(PXX - lw, R.sy(HAUT), lw * 2, R.sy(a.yb) - R.sy(HAUT)); else ctx.fillRect(PXX - lw, R.sy(a.yb), lw * 2, R.sy(0) - R.sy(a.yb));
          ctx.globalAlpha = 1;
          signe(ctx, PXX, a.haut ? R.sy(HAUT - 0.6) : R.sy(0.6), k * 0.35, dangerC, pr);
        } else if (t <= a.tb + 0.3) {
          var sl = actif ? Math.min(1, (t - a.ta) / 0.06) : Math.max(0, 1 - (t - a.tb) / 0.3);
          var yA = a.haut ? R.sy(HAUT + 0.5) : R.sy(a.yb), yB = a.haut ? R.sy(a.yb) : R.sy(-0.5);
          if (a.haut) yB = R.sy(HAUT + 0.5) + (yB - R.sy(HAUT + 0.5)) * sl; else yA = R.sy(-0.5) - (R.sy(-0.5) - yA) * sl;
          var gpl = ctx.createLinearGradient(PXX - lw, 0, PXX + lw, 0);
          gpl.addColorStop(0, '#2a2d33'); gpl.addColorStop(0.5, '#8a929e'); gpl.addColorStop(1, '#2a2d33');
          ctx.fillStyle = gpl; ctx.fillRect(PXX - lw, yA, lw * 2, yB - yA);
          ctx.strokeStyle = E.c1; ctx.lineWidth = k * 0.08; ctx.strokeRect(PXX - lw, yA, lw * 2, yB - yA);
          if (actif && sl >= 1 && t - a.ta < 0.1) R.secousse = Math.max(R.secousse, 0.5);
        }
        break;
      }
    }
  }
}
function signe(ctx, x, y, r, c, a) {
  ctx.save(); ctx.globalAlpha = Math.min(1, 0.4 + a);
  ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.95, y + r * 0.75); ctx.lineTo(x - r * 0.95, y + r * 0.75); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#000'; ctx.fillRect(x - r * 0.09, y - r * 0.45, r * 0.18, r * 0.7); ctx.fillRect(x - r * 0.09, y + r * 0.35, r * 0.18, r * 0.18);
  ctx.restore();
}

/* ---------- Interface en jeu ---------- */
function dessinerHUD(J, h) {
  var R = Rendu, ctx = R.ctx, W = R.W, H = R.H, d = R.dpr;
  var L = J.L, p = J.p;
  if (J.demo) return;
  ctx.textBaseline = 'middle';
  // barre de progression
  if (!J.infini) {
    var pc = Math.min(100, Math.max(0, p.x / L.fin * 100));
    var bw = Math.min(W * 0.36, 520 * d), bx = (W - bw) / 2, by = 16 * d, bh = 12 * d;
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(bx - 2 * d, by - 2 * d, bw + 4 * d, bh + 4 * d);
    var gb = ctx.createLinearGradient(bx, 0, bx + bw, 0); gb.addColorStop(0, hsl(h, 100, 60)); gb.addColorStop(1, hsl(h + 60, 100, 70));
    ctx.fillStyle = gb; ctx.fillRect(bx, by, bw * pc / 100, bh);
    if (J.meilleur > 0) { ctx.fillStyle = '#fff'; ctx.fillRect(bx + bw * J.meilleur / 100 - 1 * d, by - 3 * d, 2 * d, bh + 6 * d); }
    if (J.pratique) for (var i = 0; i < J.points.length; i++) { ctx.fillStyle = '#5dff8a'; ctx.fillRect(bx + bw * Math.min(1, J.points[i].p.x / L.fin) - d, by + bh, 2 * d, 4 * d); }
    ctx.font = 'bold ' + (16 * d) + 'px "Segoe UI", sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff';
    ctx.fillText(Math.floor(pc) + ' %', bx + bw + 10 * d, by + bh / 2);
  } else {
    ctx.font = 'bold ' + (22 * d) + 'px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
    ctx.fillText(Math.floor(p.x) + ' m', W / 2, 24 * d);
    ctx.font = (13 * d) + 'px "Segoe UI", sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText('Difficulté ' + (J.dInfini || 0).toFixed(1) + ' · ' + etiquetteD(J.dInfini || 1).nom + (J.recordInfini ? ' · record ' + J.recordInfini + ' m' : ''), W / 2, 48 * d);
  }
  // éclats
  ctx.textAlign = 'left'; ctx.font = 'bold ' + (15 * d) + 'px "Segoe UI", sans-serif';
  var ne = L.eclats.length;
  if (ne) {
    var ex = 16 * d, ey = 22 * d;
    ctx.fillStyle = '#bff8ff'; ctx.beginPath(); ctx.moveTo(ex, ey - 8 * d); ctx.lineTo(ex + 5 * d, ey); ctx.lineTo(ex, ey + 8 * d); ctx.lineTo(ex - 5 * d, ey); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(p.eclats + (J.infini ? '' : ' / ' + ne), ex + 12 * d, ey);
  }
  // essai / entraînement
  ctx.font = (14 * d) + 'px "Segoe UI", sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText((J.pratique ? 'ENTRAÎNEMENT · ' : '') + 'Essai ' + J.essai, 16 * d, 46 * d);
  if (J.mutateur) { ctx.fillStyle = '#ffd23f'; ctx.fillText('Variante : ' + ({ miroir: 'Miroir', inverse: 'Tête en bas', penombre: 'Pénombre' })[J.mutateur], 16 * d, 68 * d); }
  // boss
  if (L.espece && !J.sansBoss) {
    var nm = (J.grand ? 'GRAND BOSS · ' : '') + (J.nomBoss || '');
    ctx.textAlign = 'right'; ctx.font = 'bold ' + (14 * d) + 'px "Segoe UI", sans-serif'; ctx.fillStyle = '#fff';
    var place = W / 2 + Math.min(W * 0.36, 520 * d) / 2 + 60 * d, decal = 0;
    if (!J.infini && W - 16 * d - ctx.measureText(nm).width < place) decal = 40 * d;
    ctx.fillText(nm, W - 16 * d, 22 * d + decal);
    if (!J.infini) {
      var vw = Math.min(220 * d, W * 0.25), vx = W - 16 * d - vw, vy = 34 * d + decal;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(vx, vy, vw, 8 * d);
      var v = J.vieBoss != null ? J.vieBoss : 1;
      ctx.fillStyle = ESPECES[L.espece].c1; ctx.fillRect(vx + vw * (1 - v), vy, vw * v, 8 * d);
      for (var ph = 1; ph < 3; ph++) { ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(vx + vw * ph / 3 - d, vy, 2 * d, 8 * d); }
    }
  }
  // « Essai N » dans le décor au départ
  if (p.x < 14 && !J.infini) {
    var X = R.sx(3.5); ctx.textAlign = 'left'; ctx.globalAlpha = Math.max(0, 1 - p.x / 14);
    ctx.font = 'bold ' + (R.k * 0.9) + 'px "Segoe UI", sans-serif'; ctx.fillStyle = '#fff';
    ctx.fillText('Essai ' + J.essai, X, R.sy(5.6)); ctx.globalAlpha = 1;
  }
  // pourcentage atteint à la mort
  if (J.explose && !J.victoire && !L.infini && J.mortA) {
    var am = Math.max(0, 1 - (performance.now() - J.mortA) / 750);
    ctx.globalAlpha = am; ctx.textAlign = 'center'; ctx.font = '900 ' + (54 * d) + 'px "Segoe UI", sans-serif';
    ctx.fillStyle = '#fff'; ctx.fillText(Math.floor(Math.min(100, p.x / L.fin * 100)) + ' %', W / 2, H * 0.45);
    ctx.globalAlpha = 1;
  }
  if (Sauve.d.reglages.fps && J.fps) { ctx.textAlign = 'right'; ctx.font = (12 * d) + 'px monospace'; ctx.fillStyle = '#0f0'; ctx.fillText(J.fps.toFixed(0) + ' i/s', W - 10 * d, H - 12 * d); }
  // message
  if (J.message && J.message.t > 0) {
    var a = Math.min(1, J.message.t);
    ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.font = 'bold ' + (24 * d) + 'px "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; var tw = ctx.measureText(J.message.txt).width;
    ctx.fillRect(W / 2 - tw / 2 - 18 * d, H * 0.2 - 22 * d, tw + 36 * d, 44 * d);
    ctx.fillStyle = J.message.c || '#fff'; ctx.fillText(J.message.txt, W / 2, H * 0.2);
    if (J.message.sous) { ctx.font = (15 * d) + 'px "Segoe UI", sans-serif'; ctx.fillStyle = 'rgba(0,0,0,0.55)'; var tw2 = ctx.measureText(J.message.sous).width; ctx.fillRect(W / 2 - tw2 / 2 - 12 * d, H * 0.2 + 26 * d, tw2 + 24 * d, 26 * d); ctx.fillStyle = '#fff'; ctx.fillText(J.message.sous, W / 2, H * 0.2 + 39 * d); }
    ctx.globalAlpha = 1;
  }
}
