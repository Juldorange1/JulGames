'use strict';
/* Colosses — apparence des attaques des boss : balles à traînée et noyau brillant, zones annoncées avec chevrons qui se
   resserrent puis impact (éclair, onde de choc, brûlure au sol), rayons à cœur blanc et halo, ondes aux trous bien marqués. */

// ---------- Balles ----------
const _fxCacheBalle = {};
function spriteBalle(col, r) {
  const rr = Math.max(3, Math.round(r)), k = col + '|' + rr;
  if (_fxCacheBalle[k]) return _fxCacheBalle[k];
  const S = rr * 2 + 6, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d'), m = S / 2;
  x.fillStyle = 'rgba(8,4,6,.9)'; x.beginPath(); x.arc(m, m, rr + 2, 0, TAU); x.fill();          // liseré sombre : lisible sur tous les sols
  const g = x.createRadialGradient(m - rr * .3, m - rr * .35, 0, m, m, rr);
  g.addColorStop(0, '#ffffff'); g.addColorStop(.35, '#fff6ea'); g.addColorStop(.6, col); g.addColorStop(1, col);
  x.fillStyle = g; x.beginPath(); x.arc(m, m, rr, 0, TAU); x.fill();
  x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 1; x.beginPath(); x.arc(m, m, rr - .5, Math.PI * 1.1, Math.PI * 1.6); x.stroke();
  if (Object.keys(_fxCacheBalle).length > 300) for (const q in _fxCacheBalle) delete _fxCacheBalle[q];
  return (_fxCacheBalle[k] = c);
}
dessinerTirsEnnemis = function (c) {
  const p = G.p, noir = Arene.noir;
  const alpha = e => { let al = 1; if (noir && p) { const dd = Math.sqrt(d2(e.x, e.y, p.x, p.y)); al = dd < 240 ? 1 : Math.max(.3, 1 - (dd - 240) / 300); } if (e.delai > 0) al *= .5 + .5 * Math.sin(G.t * 20); return al; };
  // traînées et halo (lumière additive)
  c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
  for (const e of G.eb) {
    const al = alpha(e), col = e.gel > 0 ? '#bfe6ff' : e.col, v = Math.hypot(e.vx, e.vy);
    if (v > 40 && !e.gel) {
      const L = Math.min(e.r * 5, v * .07), ux = e.vx / v, uy = e.vy / v;
      const g = c.createLinearGradient(e.x, e.y, e.x - ux * L, e.y - uy * L); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.globalAlpha = al * .7; c.strokeStyle = g; c.lineWidth = e.r * 1.5; c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.x - ux * L, e.y - uy * L); c.stroke();
    }
    c.globalAlpha = al * .55; const gr = e.r * 2.2; c.drawImage(glow(col, gr), e.x - gr, e.y - gr);
  }
  c.lineCap = 'butt'; c.globalCompositeOperation = 'source-over';
  // corps de la balle
  for (const e of G.eb) {
    const al = alpha(e), col = e.gel > 0 ? '#bfe6ff' : e.col;
    c.globalAlpha = al;
    if (e.r >= 10) { // grosses balles : une étoile à pointes qui tourne
      c.save(); c.translate(e.x, e.y); c.rotate(G.t * 4 + e.x * .01);
      c.fillStyle = 'rgba(8,4,6,.85)'; c.beginPath(); for (let i = 0; i < 12; i++) { const rr = i % 2 ? e.r * .7 : e.r * 1.3; c.lineTo(Math.cos(i * TAU / 12) * rr, Math.sin(i * TAU / 12) * rr); } c.closePath(); c.fill();
      c.fillStyle = col; c.beginPath(); for (let i = 0; i < 12; i++) { const rr = i % 2 ? e.r * .58 : e.r * 1.15; c.lineTo(Math.cos(i * TAU / 12) * rr, Math.sin(i * TAU / 12) * rr); } c.closePath(); c.fill();
      c.restore();
    }
    const sp = spriteBalle(col, e.r); c.drawImage(sp, e.x - sp.width / 2, e.y - sp.height / 2);
    if (e.hp > 0) { c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.setLineDash([3, 4]); c.beginPath(); c.arc(e.x, e.y, e.r + 5, G.t * 3, G.t * 3 + TAU); c.stroke(); c.setLineDash([]); }
  }
  c.globalAlpha = 1;
};

// ---------- Zones rondes : chevrons qui se resserrent, puis impact ----------
function chevronsVersCentre(c, x, y, r, k, col) {
  const n = Math.max(6, Math.min(16, Math.round(r / 14))), d = r * (1 - .35 * k);
  c.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const a = i * TAU / n + G.t * .4, cx = x + Math.cos(a) * d, cy = y + Math.sin(a) * d, s = Math.min(9, r * .1);
    c.save(); c.translate(cx, cy); c.rotate(a + Math.PI); c.beginPath(); c.moveTo(s, 0); c.lineTo(-s * .6, -s * .7); c.lineTo(-s * .2, 0); c.lineTo(-s * .6, s * .7); c.closePath(); c.fill(); c.restore();
  }
}
const _fxCercleUp = HZ.cercle.up, _fxCercleDraw = HZ.cercle.draw;
HZ.cercle.up = function (h, dt) {
  const avant = h.boom; _fxCercleUp.call(this, h, dt);
  if (h.boom && !avant) { Decor.brulure(h.x, h.y, h.r * .75); G.fx.push({ kind: 'anneau', x: h.x, y: h.y, r0: h.r * .6, r1: h.r * 1.35, t: 0, dur: .32, col: '#ffd0b0' }); }
};
HZ.cercle.draw = function (h, c) {
  if (!h.boom) {
    const k = clamp(h.t / h.warn, 0, 1), urg = k > .8;
    // sol assombri + bord brillant épais
    const g = c.createRadialGradient(h.x, h.y, h.r * .2, h.x, h.y, h.r);
    g.addColorStop(0, `rgba(${AL},.05)`); g.addColorStop(1, `rgba(${AL},${.22 + .2 * k})`);
    c.fillStyle = g; c.beginPath(); c.arc(h.x, h.y, h.r, 0, TAU); c.fill();
    c.fillStyle = `rgba(${AL},${.18 + .15 * k})`; c.beginPath(); c.arc(h.x, h.y, h.r * k, 0, TAU); c.fill();
    if (h.r > 40) sprite(c, 'circle5', ROUGE, h.x, h.y, h.r * 2.15, G.t * .7 + h.x, .25 + .35 * k, true);
    chevronsVersCentre(c, h.x, h.y, h.r, k, urg && (G.t * 20 | 0) % 2 ? '#ffffff' : ROUGE);
    c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = urg && (G.t * 20 | 0) % 2 ? '#ffffff' : ROUGE; c.lineWidth = 3 + 2 * k; c.shadowColor = ROUGE; c.shadowBlur = 10;
    c.beginPath(); c.arc(h.x, h.y, h.r, 0, TAU); c.stroke(); c.restore();
    if (h.num) texteOmbre(c, String(h.num), h.x, h.y + 10, '#fff', `900 ${Math.min(34, 14 + h.r * .12)}px ${POLICE}`, 4);
  } else {
    const q = 1 - h.at / h.act;
    c.save(); c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.r); g.addColorStop(0, `rgba(255,250,235,${.9 * q})`); g.addColorStop(.6, `rgba(255,170,120,${.6 * q})`); g.addColorStop(1, `rgba(${AL},${.4 * q})`);
    c.fillStyle = g; c.beginPath(); c.arc(h.x, h.y, h.r, 0, TAU); c.fill(); c.restore();
  }
};

// ---------- Zones rectangulaires : bandes de danger qui défilent ----------
const _fxRectUp = HZ.rect.up;
HZ.rect.up = function (h, dt) { const avant = h.boom; _fxRectUp.call(this, h, dt); if (h.boom && !avant && h.w * h.h < 260000) Decor.brulure(h.x + h.w / 2, h.y + h.h / 2, Math.min(h.w, h.h) * .45); };
HZ.rect.draw = function (h, c) {
  if (!h.boom) {
    const k = clamp(h.t / h.warn, 0, 1), urg = k > .8;
    c.fillStyle = `rgba(${AL},${.1 + .18 * k})`; c.fillRect(h.x, h.y, h.w, h.h);
    c.save(); c.beginPath(); c.rect(h.x, h.y, h.w, h.h); c.clip();
    c.strokeStyle = `rgba(${AL},${.18 + .2 * k})`; c.lineWidth = 8; const dec = (G.t * 40) % 28;
    for (let s = -h.h; s < h.w + h.h; s += 28) { c.beginPath(); c.moveTo(h.x + s + dec, h.y); c.lineTo(h.x + s + dec - h.h, h.y + h.h); c.stroke(); }
    c.restore();
    c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = urg && (G.t * 20 | 0) % 2 ? '#fff' : ROUGE; c.lineWidth = 3; c.shadowColor = ROUGE; c.shadowBlur = 8;
    c.strokeRect(h.x + 1.5, h.y + 1.5, h.w - 3, h.h - 3); c.restore();
  } else {
    const q = 1 - h.at / h.act;
    c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(255,236,210,${.85 * q})`; c.fillRect(h.x, h.y, h.w, h.h); c.restore();
  }
};

// ---------- Rayons : chevrons pendant l'annonce, puis faisceau à cœur blanc ----------
const _fxRayonDraw = HZ.rayon.draw;
HZ.rayon.draw = function (h, c) {
  const ex = h.x + Math.cos(h.a) * h.L, ey = h.y + Math.sin(h.a) * h.L;
  if (h.t < h.warn) {
    _fxRayonDraw.call(this, h, c);
    if (!h.alerte) { // flèches qui filent le long du futur rayon
      const k = h.t / h.warn, n = Math.floor(h.L / 70), ca = Math.cos(h.a), sa = Math.sin(h.a);
      c.fillStyle = `rgba(${AL},${.35 + .4 * k})`;
      for (let i = 0; i < n; i++) { const d = ((i * 70 + G.t * 260) % h.L), x = h.x + ca * d, y = h.y + sa * d, s = Math.min(9, h.w * .3); c.save(); c.translate(x, y); c.rotate(h.a); c.beginPath(); c.moveTo(s, 0); c.lineTo(-s * .6, -s * .8); c.lineTo(-s * .6, s * .8); c.closePath(); c.fill(); c.restore(); }
    }
    return;
  }
  if (h.alerte) return;
  const fl = .85 + .15 * Math.sin(G.t * 60), col = h.col || ROUGE;
  c.save(); c.lineCap = 'round'; c.globalCompositeOperation = 'lighter';
  c.strokeStyle = col; c.globalAlpha = .28; c.lineWidth = h.w * 2.2 * fl; c.beginPath(); c.moveTo(h.x, h.y); c.lineTo(ex, ey); c.stroke();
  c.globalAlpha = .7; c.lineWidth = h.w * 1.1 * fl; c.stroke();
  c.globalAlpha = 1; c.strokeStyle = '#fff8f0'; c.lineWidth = h.w * .42; c.stroke();
  c.drawImage(glow(col, h.w * 2.4), ex - h.w * 2.4, ey - h.w * 2.4);
  c.drawImage(glow('#ffffff', h.w * 1.4), h.x - h.w * 1.4, h.y - h.w * 1.4);
  c.restore();
  if (Math.random() < .5) G.parts.push({ x: ex, y: ey, vx: (Math.random() - .5) * 160, vy: (Math.random() - .5) * 160, life: .3, max: .3, col: '#fff0d0', r: 1.6, add: true });
};

// ---------- Ondes : anneau lumineux, trous bordés de repères clairs ----------
HZ.onde.draw = function (h, c) {
  const col = h.col || (G.boss ? G.boss.col : ROUGE), vie = Math.min(1, (h.life - h.t) * 2);
  const arcs = []; if (!h.gaps.length) arcs.push([0, TAU]);
  else { const g = h.gaps.map(x => [x[0] - x[1] / 2, x[0] + x[1] / 2]).sort((a, b) => a[0] - b[0]); for (let i = 0; i < g.length; i++) arcs.push([g[i][1], i + 1 < g.length ? g[i + 1][0] : g[0][0] + TAU]); }
  c.save(); c.globalAlpha = vie;
  c.strokeStyle = 'rgba(8,4,6,.85)'; c.lineWidth = h.th + 6; for (const [a0, a1] of arcs) if (a1 > a0) { c.beginPath(); c.arc(h.x, h.y, h.r, a0, a1); c.stroke(); }
  c.globalCompositeOperation = 'lighter';
  c.strokeStyle = col; c.lineWidth = h.th * 1.6; c.globalAlpha = vie * .35; for (const [a0, a1] of arcs) if (a1 > a0) { c.beginPath(); c.arc(h.x, h.y, h.r, a0, a1); c.stroke(); }
  c.globalAlpha = vie; c.lineWidth = h.th; for (const [a0, a1] of arcs) if (a1 > a0) { c.beginPath(); c.arc(h.x, h.y, h.r, a0, a1); c.stroke(); }
  c.strokeStyle = '#fff6ea'; c.lineWidth = Math.max(2, h.th * .3); for (const [a0, a1] of arcs) if (a1 > a0) { c.beginPath(); c.arc(h.x, h.y, h.r, a0, a1); c.stroke(); }
  c.globalCompositeOperation = 'source-over';
  // repères verts aux bords de chaque trou : le passage se voit tout de suite
  for (const g of h.gaps) for (const s of [-1, 1]) {
    const a = g[0] + s * g[1] / 2, x = h.x + Math.cos(a) * h.r, y = h.y + Math.sin(a) * h.r;
    c.fillStyle = '#0a1a10'; c.beginPath(); c.arc(x, y, h.th * .75 + 2, 0, TAU); c.fill();
    c.fillStyle = '#7dffb0'; c.beginPath(); c.arc(x, y, h.th * .6, 0, TAU); c.fill();
  }
  c.restore();
};

// ---------- Effets réduits : on garde les dangers, on coupe le décor animé et la fumée des boss ----------
const _ambianceFx = Decor.dessinerAmbiance.bind(Decor);
Decor.dessinerAmbiance = function (c) { if (G.opts.effetsReduits) return; _ambianceFx(c); };

// ---------- Touché : d'où vient le coup ----------
const _blesserFx = G.blesser;
G.blesser = function (dmg, src) {
  const r = _blesserFx.call(this, dmg, src);
  if (r && this.p) {
    const p = this.p; let sx = null, sy = null, best = 70 * 70;
    for (const e of this.eb) { const q = d2(e.x, e.y, p.x, p.y); if (q < best) { best = q; sx = e.x - e.vx * .05; sy = e.y - e.vy * .05; } }
    if (sx === null) for (const h of this.hz) if (h.x !== undefined && h.src === src) { sx = h.x; sy = h.y; break; }
    if (sx === null && this.boss) { sx = this.boss.x; sy = this.boss.y; }
    if (sx !== null) this.coupInfo = { a: ang(p.x, p.y, sx, sy), t: 0 };
  }
  return r;
};
const _hudCoup = dessinerHUD;
dessinerHUD = function (c) {
  const ci = G.coupInfo, p = G.p;
  if (ci && p) {
    ci.t += 1 / 60;
    const k = Math.max(0, 1 - ci.t / .8);
    if (k <= 0) G.coupInfo = null;
    else {
      // arc rouge autour du héros, tourné vers ce qui l'a touché
      c.save(); c.lineCap = 'round';
      c.strokeStyle = `rgba(0,0,0,${.6 * k})`; c.lineWidth = 9; c.beginPath(); c.arc(p.x, p.y, 44, ci.a - .55, ci.a + .55); c.stroke();
      c.strokeStyle = `rgba(255,60,80,${k})`; c.lineWidth = 5; c.beginPath(); c.arc(p.x, p.y, 44, ci.a - .55, ci.a + .55); c.stroke();
      const ex = p.x + Math.cos(ci.a) * 58, ey = p.y + Math.sin(ci.a) * 58;
      c.fillStyle = `rgba(255,80,100,${k})`; c.beginPath(); c.moveTo(ex + Math.cos(ci.a) * 10, ey + Math.sin(ci.a) * 10); c.lineTo(ex + Math.cos(ci.a + 2.4) * 8, ey + Math.sin(ci.a + 2.4) * 8); c.lineTo(ex + Math.cos(ci.a - 2.4) * 8, ey + Math.sin(ci.a - 2.4) * 8); c.closePath(); c.fill();
      // bord de l'écran qui rougit du côté du coup
      const bx = W / 2 + Math.cos(ci.a) * W * .55, by = H / 2 + Math.sin(ci.a) * H * .55, g = c.createRadialGradient(bx, by, 0, bx, by, 520);
      g.addColorStop(0, `rgba(255,30,50,${.35 * k})`); g.addColorStop(1, 'rgba(255,30,50,0)');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.restore();
    }
  }
  _hudCoup(c);
};
