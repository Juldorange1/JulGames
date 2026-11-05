'use strict';
/* Colosses — tout le dessin : sol texturé, éclairage dynamique, halos (bloom), entités, effets, interface. */

let cv, ctx, scale = 1, offX = 0, offY = 0, dpr = 1;
function redim() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  scale = Math.min(innerWidth / W, innerHeight / H);
  offX = (innerWidth - W * scale) / 2; offY = (innerHeight - H * scale) / 2;
}
const POLICE = 'Segoe UI, system-ui, sans-serif';

// ---------- Textures d'effets (CC0, dossier img/) : formes blanches teintées à la volée ----------
const TEX = {};
['circle_05', 'fire_01', 'fire_02', 'flame_01', 'flame_03', 'flame_05', 'flare_01', 'light_01', 'light_03', 'magic_01', 'magic_02', 'magic_03', 'magic_04', 'magic_05', 'muzzle_01', 'muzzle_03',
  'scorch_01', 'scorch_02', 'scorch_03', 'slash_01', 'slash_02', 'slash_03', 'smoke_01', 'smoke_03', 'smoke_05', 'smoke_07', 'spark_01', 'spark_03', 'spark_05', 'spark_07', 'star_01', 'star_04',
  'star_06', 'star_08', 'symbol_01', 'symbol_02', 'trace_01', 'trace_04', 'twirl_01', 'twirl_02', 'twirl_03', 'dirt_01', 'dirt_02', 'scratch_01', 'circle4', 'circle5', 'circle6', 'circle7']
  .forEach(n => { const im = new Image(); im.src = 'img/' + n + '.png?v=2'; TEX[n] = im; });
const texCache = {};
function tex(n, col) {
  const im = TEX[n];
  if (!im || !im.complete || !im.naturalWidth) return null;
  if (!col) return im;
  const k = n + '|' + col; let c = texCache[k];
  if (c) return c;
  c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
  const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
  if (Object.keys(texCache).length > 400) for (const q in texCache) delete texCache[q];
  texCache[k] = c; return c;
}
function sprite(c, n, col, x, y, taille, rot, alpha, add) {
  const t = tex(n, col); if (!t) return false;
  c.save(); c.translate(x, y); if (rot) c.rotate(rot);
  c.globalAlpha *= alpha === undefined ? 1 : alpha; if (add) c.globalCompositeOperation = 'lighter';
  c.drawImage(t, -taille / 2, -taille / 2, taille, taille); c.restore(); return true;
}

// ---------- Textures pré-calculées ----------
// ---------- Décor : ambiances, sol, murs, braseros, brûlures, brume ----------
const THEMES = {
  temple: { nom: 'Temple', sol: [38, 14, 15], joint: 'rgba(0,0,0,.55)', mur: '#3a3530', murH: '#6d655a', brume: 'rgba(200,180,150,', feu: true },
  volcan: { nom: 'Volcan', sol: [12, 18, 9], joint: 'rgba(255,90,20,.35)', mur: '#241510', murH: '#4a2a1c', brume: 'rgba(255,120,60,', feu: true },
  glace: { nom: 'Glacier', sol: [205, 40, 20], joint: 'rgba(200,235,255,.25)', mur: '#28405a', murH: '#7ab0d8', brume: 'rgba(200,230,255,', feu: false },
  neant: { nom: 'Néant', sol: [265, 25, 8], joint: 'rgba(160,120,255,.25)', mur: '#16102a', murH: '#3c2c6a', brume: 'rgba(150,110,255,', feu: false },
  ruines: { nom: 'Ruines', sol: [95, 12, 14], joint: 'rgba(0,0,0,.5)', mur: '#2c3324', murH: '#58664a', brume: 'rgba(170,200,150,', feu: true },
  metal: { nom: 'Forge', sol: [215, 8, 15], joint: 'rgba(0,0,0,.6)', mur: '#22262c', murH: '#5c646e', brume: 'rgba(170,190,210,', feu: false }
};
const THEME_ESPECE = { metronome: 'metal', sentinelle: 'temple', hydre: 'ruines', tisseuse: 'neant', spectre: 'neant', forgeron: 'volcan', reine: 'ruines', juge: 'temple', horloger: 'metal', serpent: 'ruines', nebuleuse: 'neant', bourreau: 'volcan', phenix: 'volcan' };
const Decor = {
  theme: 'temple', decal: null, dx: null, brumes: [], poussiere: [],
  nouvelleSalle() {
    const esp = G.def ? G.def.esp : 'chimere';
    this.theme = THEME_ESPECE[esp] || R.pick(Object.keys(THEMES).filter(k => k !== 'glace'));
    if (!this.decal) { this.decal = document.createElement('canvas'); this.decal.width = W; this.decal.height = H; this.dx = this.decal.getContext('2d'); }
    this.dx && this.dx.clearRect(0, 0, W, H);
    this.brumes = Array.from({ length: 5 }, () => ({ x: AR.x + R() * AR.w, y: AR.y + R() * AR.h, r: R.range(160, 300), vx: R.range(-12, 12), vy: R.range(-6, 6) }));
    this.poussiere = Array.from({ length: 40 }, () => ({ x: AR.x + R() * AR.w, y: AR.y + R() * AR.h, vx: R.range(-8, 8), vy: R.range(-10, 2), ph: R() * TAU }));
  },
  themeActif() { return Arene.carte === 'glace' ? 'glace' : Arene.carte === 'lave' ? 'volcan' : Arene.carte === 'tenebres' ? 'neant' : this.theme; },
  brulure(x, y, r) {
    if (!this.dx) return;
    const t = tex(['scorch_01', 'scorch_02', 'scorch_03'][Math.floor(R() * 3)], '#0a0604');
    if (t) { this.dx.save(); this.dx.translate(x, y); this.dx.rotate(R() * TAU); this.dx.globalAlpha = .55; this.dx.drawImage(t, -r * 1.2, -r * 1.2, r * 2.4, r * 2.4); this.dx.restore(); return; }
    const g = this.dx.createRadialGradient(x, y, r * .1, x, y, r);
    g.addColorStop(0, 'rgba(10,6,4,.45)'); g.addColorStop(.6, 'rgba(20,10,6,.22)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    this.dx.fillStyle = g; this.dx.beginPath(); this.dx.arc(x, y, r, 0, TAU); this.dx.fill();
  },
  maj(dt) {
    if (!G.opts.decorAnime) return;
    for (const b of this.brumes) { b.x += b.vx * dt; b.y += b.vy * dt; if (b.x < AR.x - 200) b.x = AR.x + AR.w + 150; if (b.x > AR.x + AR.w + 200) b.x = AR.x - 150; if (b.y < AR.y - 150) b.y = AR.y + AR.h + 100; if (b.y > AR.y + AR.h + 150) b.y = AR.y - 100; }
    for (const q of this.poussiere) { q.x += q.vx * dt; q.y += q.vy * dt; q.ph += dt; if (q.y < AR.y) { q.y = AR.y + AR.h; q.x = AR.x + R() * AR.w; } if (q.x < AR.x) q.x = AR.x + AR.w; if (q.x > AR.x + AR.w) q.x = AR.x; }
  },
  dessinerAmbiance(c) {
    if (!G.opts.decorAnime) return;
    const th = THEMES[this.themeActif()];
    c.save(); cheminArene(c); c.clip();
    c.globalCompositeOperation = 'lighter';
    for (const b of this.brumes) c.drawImage(glow(th.brume + '.06)', b.r), b.x - b.r, b.y - b.r);
    for (const q of this.poussiere) { c.globalAlpha = .25 + .2 * Math.sin(q.ph * 2); c.fillStyle = th.brume + '1)'; c.fillRect(q.x, q.y, 1.6, 1.6); }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.restore();
  }
};

let texSol = null, texSolCle = '', texFond = null, texFondCle = '';
function texteFond() {
  const th = Decor.themeActif(), cle = th + '|' + Arene.kind;
  if (texFond && texFondCle === cle) return texFond;
  texFondCle = cle;
  const c = texFond || document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'), r = RNG(hashStr(cle)), T = THEMES[th];
  x.fillStyle = '#030208'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 6; i++) { const g = x.createRadialGradient(r() * W, r() * H, 0, r() * W, r() * H, 300 + r() * 300); g.addColorStop(0, T.brume + '.08)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H); }
  // mur d'enceinte en relief
  x.save();
  if (Arene.kind === 'cercle') { x.beginPath(); x.arc(CX, CY, AR.h / 2 + 22, 0, TAU); x.arc(CX, CY, AR.h / 2 - 2, 0, TAU, true); }
  else { x.beginPath(); x.rect(AR.x - 22, AR.y - 22, AR.w + 44, AR.h + 44); x.rect(AR.x - 2, AR.y - 2, AR.w + 4, AR.h + 4); }
  const gm = x.createLinearGradient(0, AR.y - 22, 0, AR.y + AR.h + 22);
  gm.addColorStop(0, T.murH); gm.addColorStop(.5, T.mur); gm.addColorStop(1, T.murH);
  x.fillStyle = gm; x.fill('evenodd');
  x.restore();
  if (Arene.kind !== 'cercle') {
    x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = 2;
    for (let px = AR.x - 22; px < AR.x + AR.w + 22; px += 48) { x.beginPath(); x.moveTo(px, AR.y - 22); x.lineTo(px, AR.y - 2); x.moveTo(px + 24, AR.y + AR.h + 2); x.lineTo(px + 24, AR.y + AR.h + 22); x.stroke(); }
    for (let py = AR.y - 22; py < AR.y + AR.h + 22; py += 48) { x.beginPath(); x.moveTo(AR.x - 22, py); x.lineTo(AR.x - 2, py); x.moveTo(AR.x + AR.w + 2, py + 24); x.lineTo(AR.x + AR.w + 22, py + 24); x.stroke(); }
  }
  return c;
}
function texteSol() {
  const th = Decor.themeActif(), hue = G.def ? G.def.hue : 260, cle = th + '|' + Arene.version + '|' + hue;
  if (texSol && cle === texSolCle) return texSol;
  texSolCle = cle;
  const c = texSol || document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'), r = RNG(hashNum(Arene.version * 13 + hue)), T = THEMES[th], [sh, ss, sl] = T.sol;
  x.fillStyle = hsl(sh, ss, sl * .6); x.fillRect(0, 0, W, H);
  if (th === 'volcan' || th === 'neant') {
    // dalles irrégulières (basalte ou îlots flottants)
    for (let i = 0; i < 150; i++) {
      const cx = AR.x + r() * AR.w, cy = AR.y + r() * AR.h, rr = r.range(30, 70);
      x.beginPath(); for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + r() * .4, q = rr * r.range(.8, 1.1); x.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q); } x.closePath();
      const g = x.createLinearGradient(cx - rr, cy - rr, cx + rr, cy + rr);
      g.addColorStop(0, hsl(sh, ss, sl + 6 + r() * 4)); g.addColorStop(1, hsl(sh, ss, sl - 3));
      x.fillStyle = g; x.fill(); x.strokeStyle = T.joint; x.lineWidth = th === 'volcan' ? 2.5 : 1.5; x.stroke();
    }
    if (th === 'neant') for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(255,255,255,${r() * .4})`; x.fillRect(AR.x + r() * AR.w, AR.y + r() * AR.h, 1.4, 1.4); }
  } else {
    const T2 = th === 'metal' ? 80 : 64;
    for (let gx = AR.x - 10; gx < AR.x + AR.w; gx += T2) for (let gy = AR.y - 10; gy < AR.y + AR.h; gy += T2) {
      const dec = th === 'metal' ? 0 : (gy / T2 | 0) % 2 ? T2 / 2 : 0, l = sl + r() * 5;
      if (th === 'ruines' && r() < .12) continue; // dalle manquante : terre
      x.fillStyle = hsl(sh + r.range(-6, 6), ss + r() * 8, l); x.fillRect(gx + dec + 2, gy + 2, T2 - 4, T2 - 4);
      const g = x.createLinearGradient(gx + dec, gy, gx + dec + T2, gy + T2);
      g.addColorStop(0, 'rgba(255,255,255,.06)'); g.addColorStop(1, 'rgba(0,0,0,.22)');
      x.fillStyle = g; x.fillRect(gx + dec + 2, gy + 2, T2 - 4, T2 - 4);
      if (th === 'metal') { x.fillStyle = 'rgba(200,210,220,.25)'; for (const [a, b] of [[8, 8], [T2 - 12, 8], [8, T2 - 12], [T2 - 12, T2 - 12]]) { x.beginPath(); x.arc(gx + a + 2, gy + b + 2, 2.2, 0, TAU); x.fill(); } }
      if (r() < .3) { x.strokeStyle = T.joint; x.lineWidth = 1; x.beginPath(); let px = gx + dec + r() * T2, py = gy + r() * T2; x.moveTo(px, py); for (let k = 0; k < 4; k++) { px += r.range(-18, 18); py += r.range(-18, 18); x.lineTo(px, py); } x.stroke(); }
    }
    if (th === 'ruines') for (let i = 0; i < 260; i++) { const px = AR.x + r() * AR.w, py = AR.y + r() * AR.h; x.strokeStyle = hsl(95 + r() * 30, 50, 22 + r() * 15, .7); x.lineWidth = 1.5; x.beginPath(); x.moveTo(px, py); x.lineTo(px + r.range(-4, 4), py - r.range(4, 10)); x.stroke(); }
    if (th === 'metal') { x.fillStyle = 'rgba(255,200,0,.18)'; for (let px = AR.x; px < AR.x + AR.w; px += 40) { x.beginPath(); x.moveTo(px, AR.y); x.lineTo(px + 20, AR.y); x.lineTo(px + 10, AR.y + 14); x.lineTo(px - 10, AR.y + 14); x.fill(); } }
    if (th === 'glace') for (let i = 0; i < 60; i++) { x.strokeStyle = 'rgba(210,240,255,.16)'; x.lineWidth = 1; x.beginPath(); const px = AR.x + r() * AR.w, py = AR.y + r() * AR.h; x.moveTo(px, py); x.lineTo(px + r.range(-70, 70), py + r.range(-70, 70)); x.stroke(); }
  }
  for (let i = 0; i < 3000; i++) { x.fillStyle = `rgba(${r() < .5 ? '255,255,255' : '0,0,0'},${r() * .06})`; x.fillRect(AR.x + r() * AR.w, AR.y + r() * AR.h, 2, 2); }
  x.strokeStyle = hsl(hue, 80, 55, .1); x.lineWidth = 3;
  x.beginPath(); x.arc(CX, CY, 180, 0, TAU); x.stroke(); x.beginPath(); x.arc(CX, CY, 230, 0, TAU); x.stroke();
  for (let i = 0; i < 12; i++) { const a = i * TAU / 12; x.beginPath(); x.moveTo(CX + Math.cos(a) * 180, CY + Math.sin(a) * 180); x.lineTo(CX + Math.cos(a) * 230, CY + Math.sin(a) * 230); x.stroke(); }
  const v = x.createRadialGradient(CX, CY, 220, CX, CY, 760);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.5)');
  x.fillStyle = v; x.fillRect(0, 0, W, H);
  return c;
}

function cheminArene(c) { const bb = Arene.bb(); c.beginPath(); if (Arene.kind === 'cercle') c.arc(CX, CY, Arene.rad(), 0, TAU); else c.rect(bb.x, bb.y, bb.w, bb.h); }

function brasero(c, x, y) {
  c.fillStyle = '#1a1410'; c.beginPath(); c.arc(x, y, 13, 0, TAU); c.fill();
  c.strokeStyle = '#6a5a48'; c.lineWidth = 3; c.stroke();
  const t = G.t;
  c.globalCompositeOperation = 'lighter';
  c.drawImage(glow('rgba(255,140,40,.35)', 120), x - 120, y - 120);
  for (let i = 0; i < 4; i++) {
    const k = (t * 2.2 + i / 4) % 1, fy = y - k * 26, fx = x + Math.sin(t * 7 + i * 2) * 4 * (1 - k);
    c.globalAlpha = 1 - k; c.drawImage(glow(i % 2 ? '#ffd27a' : '#ff6a1a', 10 * (1 - k * .5)), fx - 10, fy - 10);
  }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
}

function dessinerArene(c) {
  const hue = G.def ? G.def.hue : 260, th = THEMES[Decor.themeActif()];
  c.drawImage(texteFond(), 0, 0);
  c.save(); cheminArene(c); c.clip();
  c.drawImage(texteSol(), 0, 0);
  if (Decor.decal) c.drawImage(Decor.decal, 0, 0);
  for (const l of Arene.lave) {
    c.beginPath();
    for (let i = 0; i <= 24; i++) { const a = i * TAU / 24, rr = l.r * (1 + .06 * Math.sin(a * 5 + l.x) + .03 * Math.sin(a * 9 + G.t)); c.lineTo(l.x + Math.cos(a) * rr, l.y + Math.sin(a) * rr); }
    c.closePath();
    const lg = c.createRadialGradient(l.x, l.y, 4, l.x, l.y, l.r);
    lg.addColorStop(0, '#c8360a'); lg.addColorStop(.75, '#8a1c04'); lg.addColorStop(1, '#3a0a00');
    c.fillStyle = lg; c.fill();
    c.save(); c.clip();
    c.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 4; k++) {
      const a = G.t * (.3 + k * .13) + k * 1.7 + l.x, vx = l.x + Math.cos(a) * l.r * .45, vy = l.y + Math.sin(a * 1.3) * l.r * .4;
      c.globalAlpha = .35; c.drawImage(glow('#ffb347', l.r * .55), vx - l.r * .55, vy - l.r * .55);
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.restore();
    c.strokeStyle = '#2a0800'; c.lineWidth = 5; c.stroke();
    if (R() < .05) G.parts.push({ x: l.x + R.range(-l.r, l.r) * .6, y: l.y + R.range(-l.r, l.r) * .6, vx: R.range(-10, 10), vy: -R.range(30, 70), life: .8, max: .8, col: '#ffb347', r: 2, add: true });
  }
  // ombre portée du mur sur le sol
  const bb = Arene.bb();
  if (Arene.kind !== 'cercle') {
    const g = c.createLinearGradient(0, bb.y, 0, bb.y + 40); g.addColorStop(0, 'rgba(0,0,0,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(bb.x, bb.y, bb.w, 40);
    const g2 = c.createLinearGradient(bb.x, 0, bb.x + 30, 0); g2.addColorStop(0, 'rgba(0,0,0,.4)'); g2.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g2; c.fillRect(bb.x, bb.y, 30, bb.h);
  }
  c.restore();
  c.save();
  c.shadowColor = Arene.insetMax > 0 ? '#ff4d6a' : hsl(hue, 90, 55); c.shadowBlur = 16;
  c.strokeStyle = Arene.insetMax > 0 ? '#ff4d6a' : hsl(hue, 85, 60, .7); c.lineWidth = 2.5;
  cheminArene(c); c.stroke();
  c.restore();
  if (th.feu) {
    if (Arene.kind === 'cercle') for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + Math.PI / 6; brasero(c, CX + Math.cos(a) * (AR.h / 2 + 12), CY + Math.sin(a) * (AR.h / 2 + 12)); }
    else for (const [x, y] of [[AR.x - 10, AR.y - 10], [AR.x + AR.w + 10, AR.y - 10], [AR.x - 10, AR.y + AR.h + 10], [AR.x + AR.w + 10, AR.y + AR.h + 10], [CX, AR.y - 10]]) brasero(c, x, y);
  }
}

function dessinerPiliers(c) {
  for (const pl of Arene.piliers) {
    c.fillStyle = 'rgba(0,0,0,.5)'; c.beginPath(); c.ellipse(pl.x + 12, pl.y + 14, pl.r * 1.05, pl.r * .9, 0, 0, TAU); c.fill();
    const g = c.createRadialGradient(pl.x - pl.r * .4, pl.y - pl.r * .5, 2, pl.x, pl.y, pl.r * 1.1);
    g.addColorStop(0, '#5a5670'); g.addColorStop(.6, '#25222f'); g.addColorStop(1, '#0d0c12');
    c.fillStyle = g; c.beginPath(); c.arc(pl.x, pl.y, pl.r, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(160,150,200,.35)'; c.lineWidth = 2; c.stroke();
  }
}

function dessinerLumieres(c) {
  c.save(); cheminArene(c); c.clip();
  c.globalCompositeOperation = 'lighter';
  const b = G.boss, p = G.p;
  if (b && !b.mort) { const col = b.ouvert > 0 ? 'rgba(255,210,80,.22)' : hsl(b.def.hue, 100, 55, .16); c.drawImage(glow(col, 420), b.x - 420, b.y - 420); }
  if (p && p.hp > 0) c.drawImage(glow('rgba(80,220,255,.12)', 220), p.x - 220, p.y - 220);
  for (const l of G.lumieres) { const k = 1 - l.t / l.dur; c.globalAlpha = k; c.drawImage(glow(l.col, l.r), l.x - l.r, l.y - l.r); }
  c.globalAlpha = 1;
  if (G.portail) { const po = G.portail; c.drawImage(glow('rgba(160,120,255,.4)', 260), po.x - 260, po.y - 260); sprite(c, 'circle6', '#b08aff', po.x, po.y, 150, G.t * .6, .5, true); sprite(c, 'twirl_02', '#d0b0ff', po.x, po.y, 110, -G.t * 3, .8, true); }
  c.restore();
}

// ---------- Entités ----------
function dessinerTirsJoueur(c) {
  c.globalCompositeOperation = 'lighter';
  for (const b of G.pb) {
    if (b.delai > 0) continue;
    if (b.kind === 'flamme') {
      const k = b.t / (b.t + b.life);
      c.globalAlpha = .5 * (1 - k); c.drawImage(glow(k < .4 ? '#ffd27a' : '#ff5a1a', b.r * 1.6), b.x - b.r * 1.6, b.y - b.r * 1.6); c.globalAlpha = 1; continue;
    }
    if (b.kind === 'boom' || b.kind === 'shuriken') {
      c.save(); c.translate(b.x, b.y); c.rotate(b.kind === 'boom' ? (b.rot || 0) : b.t * 20); c.strokeStyle = b.col; c.fillStyle = b.col; c.lineWidth = 4;
      if (b.kind === 'boom') { c.beginPath(); c.arc(0, 0, b.r, -1.2, 1.2); c.stroke(); }
      else { c.beginPath(); for (let i = 0; i < 8; i++) { const rr = i % 2 ? b.r * .35 : b.r, a = i * TAU / 8; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.fill(); }
      c.restore(); continue;
    }
    if (b.kind === 'plasma') { c.drawImage(glow('rgba(180,130,255,.9)', b.r * 2.4), b.x - b.r * 2.4, b.y - b.r * 2.4); c.fillStyle = '#f2e8ff'; c.beginPath(); c.arc(b.x, b.y, b.r * .6, 0, TAU); c.fill(); continue; }
    if (b.kind === 'roquette') {
      const a = Math.atan2(b.vy, b.vx);
      c.drawImage(glow('rgba(255,180,80,.8)', 14), b.x - Math.cos(a) * 10 - 14, b.y - Math.sin(a) * 10 - 14);
      if (R() < .6) G.parts.push({ x: b.x - Math.cos(a) * 10, y: b.y - Math.sin(a) * 10, vx: R.range(-20, 20), vy: R.range(-20, 20), life: .5, max: .5, col: 'rgba(60,55,70,.5)', r: 4, fumee: true });
    }
    if (b.kind === 'fleche' || b.kind === 'trait' || b.kind === 'javelot' || b.kind === 'missile' || b.kind === 'roquette' || b.kind === 'aiguille') {
      const l = b.kind === 'trait' ? 34 : b.kind === 'javelot' ? 40 : b.kind === 'aiguille' ? 12 : 16, a = Math.atan2(b.vy, b.vx);
      c.strokeStyle = b.col; c.lineWidth = b.r * (b.kind === 'javelot' ? 1.1 : .9); c.lineCap = 'round';
      c.beginPath(); c.moveTo(b.x - Math.cos(a) * l, b.y - Math.sin(a) * l); c.lineTo(b.x, b.y); c.stroke(); c.lineCap = 'butt'; continue;
    }
    c.globalAlpha = .9; c.drawImage(glow(b.col, b.r * 2.2), b.x - b.r * 2.2, b.y - b.r * 2.2);
    c.fillStyle = '#fff'; c.beginPath(); c.arc(b.x, b.y, b.r * .55, 0, TAU); c.fill(); c.globalAlpha = 1;
  }
  c.globalCompositeOperation = 'source-over';
}

const VIS_ARME = { blaster: 'fusil', pompe: 'fusil', mitra: 'fusil', sniper: 'long', laser: 'fusil', surchauffe: 'fusil', railgun: 'long', plasma: 'lanceur', aiguilles: 'fusil', jumeaux: 'double', pistolet: 'aucun', epee: 'lame', faux: 'faux', iaido: 'lame', fouet: 'fouet', arc: 'arc', grenades: 'lanceur', roquettes: 'lanceur', meteorite: 'baton', flammes: 'lanceur', orbes: 'baton', foudre: 'baton', echo: 'baton', gravite: 'baton', croix: 'baton', jumelles: 'aucun', boomerang: 'boom', rattrape: 'boom', shuriken: 'boom', ricochets: 'boom' };
function dessinerArmeMain(c, k, type) {
  c.lineCap = 'round';
  const metal = (x, y, l, w) => { const g = c.createLinearGradient(0, y - w / 2, 0, y + w / 2); g.addColorStop(0, '#9aa6b4'); g.addColorStop(.5, '#3a434e'); g.addColorStop(1, '#1a1f26'); c.fillStyle = g; c.fillRect(x, y - w / 2, l, w); };
  switch (type) {
    case 'fusil': metal(3 * k, 6 * k, 19 * k, 4.5 * k); c.fillStyle = '#20262e'; c.fillRect(3 * k, 6 * k, 6 * k, 6 * k); break;
    case 'long': metal(2 * k, 6 * k, 30 * k, 4 * k); c.fillStyle = '#5ad0ff'; c.fillRect(12 * k, 3 * k, 6 * k, 2 * k); break;
    case 'double': metal(3 * k, 7 * k, 14 * k, 4 * k); metal(3 * k, -7 * k, 14 * k, 4 * k); break;
    case 'lanceur': metal(0, 6 * k, 22 * k, 8 * k); c.fillStyle = '#ff8a3c'; c.fillRect(20 * k, 3 * k, 3 * k, 6 * k); break;
    case 'lame': {
      c.strokeStyle = '#2a2018'; c.lineWidth = 3 * k; c.beginPath(); c.moveTo(2 * k, 6 * k); c.lineTo(8 * k, 6 * k); c.stroke();
      const g = c.createLinearGradient(8 * k, 0, 36 * k, 0); g.addColorStop(0, '#e8f2ff'); g.addColorStop(1, '#8a9cb0');
      c.strokeStyle = g; c.lineWidth = 3.5 * k; c.beginPath(); c.moveTo(8 * k, 6 * k); c.lineTo(36 * k, 4 * k); c.stroke();
      c.strokeStyle = '#c9a14a'; c.lineWidth = 2 * k; c.beginPath(); c.moveTo(8 * k, 2 * k); c.lineTo(8 * k, 10 * k); c.stroke();
      break;
    }
    case 'faux':
      c.strokeStyle = '#3a2a1a'; c.lineWidth = 3 * k; c.beginPath(); c.moveTo(-6 * k, 6 * k); c.lineTo(28 * k, 6 * k); c.stroke();
      c.strokeStyle = '#d8e4f0'; c.lineWidth = 3 * k; c.beginPath(); c.arc(22 * k, -6 * k, 12 * k, .4, 1.9); c.stroke();
      break;
    case 'fouet': c.strokeStyle = '#9a8a70'; c.lineWidth = 2 * k; c.beginPath(); c.arc(8 * k, 8 * k, 5 * k, 0, TAU); c.stroke(); break;
    case 'arc':
      c.strokeStyle = '#8a5a2a'; c.lineWidth = 3 * k; c.beginPath(); c.arc(4 * k, 0, 15 * k, -1.2, 1.2); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(4 * k + Math.cos(-1.2) * 15 * k, Math.sin(-1.2) * 15 * k); c.lineTo(4 * k + Math.cos(1.2) * 15 * k, Math.sin(1.2) * 15 * k); c.stroke();
      break;
    case 'baton':
      c.strokeStyle = '#4a3420'; c.lineWidth = 3 * k; c.beginPath(); c.moveTo(-4 * k, 7 * k); c.lineTo(24 * k, 5 * k); c.stroke();
      c.globalCompositeOperation = 'lighter'; c.drawImage(glow('rgba(190,140,255,.9)', 9 * k), 15 * k, -4 * k); c.globalCompositeOperation = 'source-over';
      break;
    case 'boom': c.strokeStyle = '#9fffb0'; c.lineWidth = 4 * k; c.beginPath(); c.arc(10 * k, 6 * k, 6 * k, -1.4, 1.4); c.stroke(); break;
  }
  c.lineCap = 'butt';
}
// le héros vu de dessus : jambes, cape, armure, casque, arme en main
function dessinerVaisseau(c, x, y, a, r, col, al, p) {
  const k = r / 13, bouge = p ? Math.hypot(p.vx, p.vy) > 30 : false, marche = p ? (p.marche || 0) : 0;
  c.save(); c.translate(x, y); c.globalAlpha = al;
  // la cape reste dans le dos (au plus 1 radian de côté), suit le mouvement en douceur et ne passe jamais à travers le corps
  let ca = a + Math.PI;
  if (p) { const dos = a + Math.PI, voulu = dos + clamp(angDiff(dos, bouge ? Math.atan2(p.vy, p.vx) + Math.PI : dos), -1, 1); p.capeA = !Number.isFinite(p.capeA) ? (Number.isFinite(voulu) ? voulu : dos) : p.capeA + angDiff(p.capeA, Number.isFinite(voulu) ? voulu : dos) * .14; ca = dos + clamp(angDiff(dos, p.capeA), -1, 1); }
  const fl = Math.sin(G.t * 9 + x * .01) * 3 * k;
  const per = a + Math.PI / 2, sx = Math.cos(per) * 9 * k, sy = Math.sin(per) * 9 * k;
  const L = (bouge ? 26 : 18) * k, ex = Math.cos(ca) * L, ey = Math.sin(ca) * L;
  const gc = c.createLinearGradient(0, 0, ex, ey);
  const SK = p ? { a: equipe('armure'), c: equipe('cape'), v: equipe('visiere') } : null;
  gc.addColorStop(0, p ? SK.c.c[0] : col); gc.addColorStop(1, p ? SK.c.c[1] : 'rgba(0,0,0,0)');
  c.fillStyle = gc; c.beginPath(); c.moveTo(sx, sy);
  c.quadraticCurveTo(ex * .6 + sx + Math.cos(per) * fl, ey * .6 + sy + Math.sin(per) * fl, ex + Math.cos(per) * 6 * k, ey + Math.sin(per) * 6 * k);
  c.lineTo(ex - Math.cos(per) * 6 * k, ey - Math.sin(per) * 6 * k);
  c.quadraticCurveTo(ex * .6 - sx - Math.cos(per) * fl, ey * .6 - sy - Math.sin(per) * fl, -sx, -sy); c.closePath(); c.fill();
  if (SK && SK.c.motif) {
    c.save(); c.clip();
    if (SK.c.motif === 'etoiles') { c.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 6; i++) { const u = (i * .17 + .1) % 1; c.fillRect(ex * u + Math.sin(i * 7) * 5 * k, ey * u + Math.cos(i * 5) * 5 * k, 1.6, 1.6); } }
    else if (SK.c.motif === 'flammes') { c.globalCompositeOperation = 'lighter'; c.drawImage(glow('rgba(255,140,40,.6)', 14 * k), ex - 14 * k, ey - 14 * k); }
    else { c.strokeStyle = '#ffd86b'; c.lineWidth = 1.5; c.stroke(); }
    c.restore();
  }
  c.rotate(a);
  const sw = bouge ? Math.sin(marche) * 5 * k : 0;
  c.fillStyle = '#1c222a';
  c.beginPath(); c.ellipse(-1 * k + sw, -5 * k, 5.5 * k, 3.2 * k, 0, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(-1 * k - sw, 5 * k, 5.5 * k, 3.2 * k, 0, 0, TAU); c.fill();
  const gt = c.createRadialGradient(-3 * k, -4 * k, 1, 0, 0, 13 * k);
  const AC = SK ? SK.a.c : ['#e6eef8', '#7d8fa3', '#232b36'];
  gt.addColorStop(0, AC[0]); gt.addColorStop(.45, col === '#ff6b7d' ? '#c0505e' : AC[1]); gt.addColorStop(1, AC[2]);
  c.fillStyle = gt; c.beginPath(); c.ellipse(0, 0, 8 * k, 11.5 * k, 0, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1.2; c.stroke();
  for (const s of [-1, 1]) {
    const gp = c.createRadialGradient(-1 * k, s * 10 * k - 1.5 * k, 1, 0, s * 10 * k, 5.5 * k);
    gp.addColorStop(0, '#ffffff'); gp.addColorStop(.5, AC[1]); gp.addColorStop(1, AC[2]);
    c.fillStyle = gp; c.beginPath(); c.arc(0, s * 10 * k, 5 * k, 0, TAU); c.fill();
    // liseré doré et rivet sur chaque épaulière
    c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 1; c.beginPath(); c.arc(0, s * 10 * k, 5 * k, 0, TAU); c.stroke();
    c.strokeStyle = 'rgba(255,214,140,.9)'; c.lineWidth = 1.1 * k; c.beginPath(); c.arc(0, s * 10 * k, 3.9 * k, s > 0 ? .2 : -2.9, s > 0 ? 2.9 : -.2); c.stroke();
  }
  if (p) dessinerArmeMain(c, k, VIS_ARME[G.ars.p] || 'fusil');
  const gh = c.createRadialGradient(-1 * k, -2 * k, 1, 1 * k, 0, 7 * k);
  gh.addColorStop(0, AC[0]); gh.addColorStop(.5, AC[1]); gh.addColorStop(1, AC[2]);
  // plumet qui flotte derrière le casque
  const pl = Math.sin(G.t * 7 + x * .02) * 1.6 * k;
  c.strokeStyle = '#2a0508'; c.lineWidth = 3.6 * k; c.lineCap = 'round'; c.beginPath(); c.moveTo(-3 * k, 0); c.quadraticCurveTo(-9 * k, pl, -14 * k, pl * 2); c.stroke();
  c.strokeStyle = '#c0283a'; c.lineWidth = 2.2 * k; c.beginPath(); c.moveTo(-3 * k, 0); c.quadraticCurveTo(-9 * k, pl, -14 * k, pl * 2); c.stroke(); c.lineCap = 'butt';
  c.fillStyle = gh; c.beginPath(); c.arc(1 * k, 0, 6.2 * k, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.65)'; c.lineWidth = 1; c.stroke();
  // crête du casque
  c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 2.2 * k; c.beginPath(); c.moveTo(-4.5 * k, 0); c.lineTo(5 * k, 0); c.stroke();
  c.strokeStyle = 'rgba(255,230,180,.75)'; c.lineWidth = 1 * k; c.beginPath(); c.moveTo(-4.5 * k, -.6 * k); c.lineTo(5 * k, -.6 * k); c.stroke();
  const vcol = SK && col !== '#ff6b7d' ? SK.v.col : col;
  c.strokeStyle = vcol; c.lineWidth = 2.2 * k; c.lineCap = 'round';
  c.beginPath(); c.arc(1 * k, 0, 4.6 * k, -.7, .7); c.stroke(); c.lineCap = 'butt';
  c.globalCompositeOperation = 'lighter'; c.drawImage(glow(SK ? vcol : col, 7 * k), -2 * k, -7 * k); c.globalCompositeOperation = 'source-over';
  c.restore();
}

function dessinerAllies(c) {
  const p = G.p;
  for (const a of G.allies) {
    if (a.t < 0) continue;
    switch (a.kind) {
      case 'grenade': {
        const k = a.t / a.dur, x = lerp(a.x0, a.tx, k), y = lerp(a.y0, a.ty, k) - Math.sin(k * Math.PI) * 60;
        c.strokeStyle = 'rgba(140,200,255,.35)'; c.setLineDash([4, 6]); c.beginPath(); c.arc(a.tx, a.ty, a.r, 0, TAU); c.stroke(); c.setLineDash([]);
        c.fillStyle = '#8cf'; c.beginPath(); c.arc(x, y, 6, 0, TAU); c.fill();
        break;
      }
      case 'meteore': case 'lameCiel': {
        const k = clamp(a.t / a.dur, 0, 1), col = a.kind === 'lameCiel' ? 'rgba(220,240,255,.8)' : a.petit ? 'rgba(150,200,255,.6)' : 'rgba(255,210,127,.85)';
        if (a.x === undefined) break;
        c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.arc(a.x, a.y, a.r, 0, TAU); c.stroke();
        c.fillStyle = col.replace(/[\d.]+\)$/, '.15)'); c.beginPath(); c.arc(a.x, a.y, a.r * k, 0, TAU); c.fill();
        const hy = a.y - (1 - k) * 260;
        c.globalCompositeOperation = 'lighter'; c.drawImage(glow(col, 22), a.x - 22, hy - 22); c.globalCompositeOperation = 'source-over';
        if (a.kind === 'lameCiel') { c.strokeStyle = '#fff'; c.lineWidth = 4; c.beginPath(); c.moveTo(a.x, hy - 30); c.lineTo(a.x, hy + 8); c.stroke(); }
        if (a.obus) { const ox = lerp(a.x0, a.x, k), oy = lerp(a.y0, a.y, k) - Math.sin(k * Math.PI) * 120; c.fillStyle = '#2a2420'; c.beginPath(); c.arc(ox, oy, 7, 0, TAU); c.fill(); c.strokeStyle = '#ffb347'; c.lineWidth = 2; c.stroke(); }
        break;
      }
      case 'roncier': {
        const fin = Math.min(1, (a.dur - a.t) * 2, a.t * 4);
        c.globalAlpha = fin; c.fillStyle = 'rgba(60,120,40,.35)'; c.beginPath(); c.arc(a.x, a.y, a.r, 0, TAU); c.fill();
        c.strokeStyle = '#7dff5a'; c.lineWidth = 2; for (let i = 0; i < 8; i++) { const an = i * TAU / 8 + a.x; c.beginPath(); c.moveTo(a.x, a.y); c.quadraticCurveTo(a.x + Math.cos(an + .5) * a.r * .6, a.y + Math.sin(an + .5) * a.r * .6, a.x + Math.cos(an) * a.r, a.y + Math.sin(an) * a.r); c.stroke(); }
        c.globalAlpha = 1; break;
      }
      case 'chakram':
        if (a.x !== undefined) { c.save(); c.translate(a.x, a.y); c.rotate(a.t * 25); c.strokeStyle = '#fff2b0'; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 13, 0, TAU); c.stroke(); for (let i = 0; i < 6; i++) { const an = i * TAU / 6; c.beginPath(); c.moveTo(Math.cos(an) * 13, Math.sin(an) * 13); c.lineTo(Math.cos(an + .3) * 20, Math.sin(an + .3) * 20); c.stroke(); } c.restore(); }
        break;
      case 'blizzard': {
        const fin = Math.min(1, (a.dur - a.t) * 2, a.t * 3);
        c.globalAlpha = fin * .5; c.fillStyle = '#bfe6ff'; c.beginPath(); c.arc(a.x, a.y, a.r, 0, TAU); c.fill();
        c.globalAlpha = fin; c.strokeStyle = '#e8f6ff'; c.setLineDash([6, 8]); c.lineDashOffset = -G.t * 40; c.stroke(); c.setLineDash([]); c.globalAlpha = 1; break;
      }
      case 'colonne': {
        const fin = Math.min(1, (a.dur - a.t) * 2, a.t * 4);
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = fin;
        c.drawImage(glow('rgba(255,140,40,.9)', a.r * 1.6), a.x - a.r * 1.6, a.y - a.r * 1.6);
        c.drawImage(glow('rgba(255,240,180,.9)', a.r * .7), a.x - a.r * .7, a.y - a.r * .7);
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; break;
      }
      case 'ombre':
        if (a.t >= 0) dessinerVaisseau(c, a.x, a.y, a.a, 12, '#a070ff', .55);
        break;
      case 'tourelle':
        c.save(); c.translate(a.x, a.y); c.fillStyle = '#1a2a3a'; c.strokeStyle = '#9cf'; c.lineWidth = 2;
        c.beginPath(); c.arc(0, 0, 13, 0, TAU); c.fill(); c.stroke(); c.rotate(a.a); c.fillStyle = '#9cf'; c.fillRect(0, -3, 18, 6); c.restore();
        c.fillStyle = '#9cf'; c.fillRect(a.x - 13, a.y + 17, 26 * (1 - a.t / a.dur), 3);
        break;
      case 'devast':
        if (a.x2 !== undefined) {
          c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
          c.strokeStyle = 'rgba(120,200,255,.45)'; c.lineWidth = a.w * 2; c.beginPath(); c.moveTo(a.x1, a.y1); c.lineTo(a.x2, a.y2); c.stroke();
          c.strokeStyle = '#f0ffff'; c.lineWidth = a.w * .6; c.beginPath(); c.moveTo(a.x1, a.y1); c.lineTo(a.x2, a.y2); c.stroke();
          c.lineCap = 'butt'; c.globalCompositeOperation = 'source-over';
        }
        break;
      case 'lames':
        for (let i = 0; i < a.n; i++) {
          const aa = a.a + i * TAU / a.n, bx = p.x + Math.cos(aa) * a.rad, by = p.y + Math.sin(aa) * a.rad;
          c.save(); c.translate(bx, by); c.rotate(aa * 3); c.fillStyle = '#d8eeff';
          c.beginPath(); for (let k = 0; k < 8; k++) { const r = k % 2 ? 5 : 16, q = k * TAU / 8; c.lineTo(Math.cos(q) * r, Math.sin(q) * r); } c.closePath(); c.fill(); c.restore();
        }
        break;
      case 'trou': {
        const k = Math.min(1, a.t / .3, (a.dur - a.t) / .3);
        c.fillStyle = 'rgba(40,10,70,.4)'; c.beginPath(); c.arc(a.x, a.y, a.r * k, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(190,140,255,.7)'; c.lineWidth = 2;
        for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(a.x, a.y, a.r * k * (.35 + i * .25), G.t * (3 + i), G.t * (3 + i) + 4); c.stroke(); }
        c.fillStyle = '#000'; c.beginPath(); c.arc(a.x, a.y, 18 * k, 0, TAU); c.fill();
        break;
      }
      case 'clones':
        if (a.pos) for (const q of a.pos) dessinerVaisseau(c, q.x, q.y, p.aim, 11, '#7fe0ff', .45 + .1 * Math.sin(G.t * 10));
        break;
      case 'satellite': {
        const k = Math.min(1, a.t / .2, (a.dur - a.t) / .2);
        c.globalCompositeOperation = 'lighter';
        const g = c.createLinearGradient(a.x, a.y - 600, a.x, a.y);
        g.addColorStop(0, 'rgba(255,240,180,0)'); g.addColorStop(1, `rgba(255,240,180,${.5 * k})`);
        c.fillStyle = g; c.fillRect(a.x - a.r * .5, a.y - 600, a.r, 600);
        c.drawImage(glow(`rgba(255,240,180,${.8 * k})`, a.r * 1.4), a.x - a.r * 1.4, a.y - a.r * 1.4);
        c.globalCompositeOperation = 'source-over';
        c.strokeStyle = '#fff2b0'; c.lineWidth = 2; c.beginPath(); c.arc(a.x, a.y, a.r, 0, TAU); c.stroke();
        break;
      }
      case 'mur': {
        const x1 = a.x + Math.cos(a.a) * a.L / 2, y1 = a.y + Math.sin(a.a) * a.L / 2, x2 = a.x - Math.cos(a.a) * a.L / 2, y2 = a.y - Math.sin(a.a) * a.L / 2;
        c.globalAlpha = Math.min(1, (a.dur - a.t) * 2); c.lineCap = 'round';
        c.strokeStyle = 'rgba(120,190,255,.45)'; c.lineWidth = 16; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
        c.strokeStyle = '#e8f6ff'; c.lineWidth = 4; c.stroke(); c.lineCap = 'butt'; c.globalAlpha = 1;
        break;
      }
      case 'supernova': {
        const k = a.t / a.dur;
        c.globalCompositeOperation = 'lighter'; c.drawImage(glow(`rgba(255,242,176,${.3 + .6 * k})`, 40 + k * 120), p.x - 40 - k * 120, p.y - 40 - k * 120); c.globalCompositeOperation = 'source-over';
        c.strokeStyle = 'rgba(255,242,176,.5)'; c.setLineDash([6, 8]); c.beginPath(); c.arc(p.x, p.y, a.r, 0, TAU); c.stroke(); c.setLineDash([]);
        break;
      }
      case 'echoFrappe': {
        const k = a.t / a.dur;
        c.strokeStyle = 'rgba(199,122,255,.85)'; c.lineWidth = 2; c.beginPath(); c.arc(a.x, a.y, a.r, 0, TAU); c.stroke();
        c.beginPath(); c.arc(a.x, a.y, a.r * (1 - k), 0, TAU); c.stroke();
        c.fillStyle = 'rgba(199,122,255,.12)'; c.beginPath(); c.arc(a.x, a.y, a.r, 0, TAU); c.fill();
        break;
      }
      case 'trampo': {
        c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.ellipse(a.x + 3, a.y + 4, 24, 12, 0, 0, TAU); c.fill();
        c.fillStyle = a.pret > 0 ? '#2a4a3a' : '#3d8a5c'; c.strokeStyle = '#7dffb0'; c.lineWidth = 2;
        c.beginPath(); c.ellipse(a.x, a.y, 22, 11, 0, 0, TAU); c.fill(); c.stroke();
        c.strokeStyle = 'rgba(125,255,176,.5)'; c.beginPath(); c.ellipse(a.x, a.y, 14, 6, 0, 0, TAU); c.stroke();
        break;
      }
      case 'trainee': {
        const k = 1 - a.t / a.dur;
        c.lineCap = 'round'; c.strokeStyle = `rgba(150,60,255,${.5 * k})`; c.lineWidth = 26; c.beginPath(); c.moveTo(a.x1, a.y1); c.lineTo(a.x2, a.y2); c.stroke();
        c.strokeStyle = `rgba(230,200,255,${.7 * k})`; c.lineWidth = 6; c.stroke(); c.lineCap = 'butt';
        break;
      }
    }
  }
}

function dessinerJoueur(c) {
  const p = G.p;
  if (!p || p.hp <= 0) return;
  const prim = G.ars.p, w = p.prim;
  if (prim === 'sniper' || (prim === 'railgun' && w.ch > 0)) { c.strokeStyle = prim === 'railgun' ? `rgba(150,255,255,${.15 + .5 * w.ch})` : 'rgba(255,255,255,.12)'; c.lineWidth = prim === 'railgun' ? 1 + 2 * w.ch : 1; const L = Arene.rayMur(p.x, p.y, p.aim, 1500); c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + Math.cos(p.aim) * L, p.y + Math.sin(p.aim) * L); c.stroke(); }
  if (prim === 'laser' && w.beam) {
    const B = w.beam; c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    c.strokeStyle = `rgba(100,255,255,${.25 + .35 * B.ramp})`; c.lineWidth = 10 + 10 * B.ramp; c.beginPath(); c.moveTo(B.x1, B.y1); c.lineTo(B.x2, B.y2); c.stroke();
    c.strokeStyle = '#effffe'; c.lineWidth = 2 + 2 * B.ramp; c.beginPath(); c.moveTo(B.x1, B.y1); c.lineTo(B.x2, B.y2); c.stroke();
    c.drawImage(glow('rgba(150,255,255,.8)', 24 + 20 * B.ramp), B.x2 - 24 - 20 * B.ramp, B.y2 - 24 - 20 * B.ramp);
    c.lineCap = 'butt'; c.globalCompositeOperation = 'source-over';
  }
  if (prim === 'arc' && w.ch > 0) { c.strokeStyle = w.ch >= 1 ? '#fff6a0' : 'rgba(190,255,238,.6)'; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y, 24, p.aim - w.ch * 1.4, p.aim + w.ch * 1.4); c.stroke(); }
  if (G.leurre && !G.leurre.invis) dessinerVaisseau(c, G.leurre.x, G.leurre.y, p.aim, p.r * 1.4, '#7fe0ff', .45 + .15 * Math.sin(G.t * 10));
  if (prim === 'pistolet' && w.gx !== undefined) {
    c.strokeStyle = 'rgba(255,210,60,.18)'; c.lineWidth = 1; c.beginPath(); c.arc(p.x, p.y, 95, 0, TAU); c.stroke();
    c.save(); c.translate(w.gx, w.gy); c.rotate(ang(w.gx, w.gy, G.mx, G.my)); dessinerArmeMain(c, 1.2, 'fusil'); c.restore();
    c.globalCompositeOperation = 'lighter'; c.drawImage(glow('rgba(255,210,60,.6)', 16), w.gx - 16, w.gy - 16); c.globalCompositeOperation = 'source-over';
  }
  if (prim === 'gravite' && w.puits) {
    const q = w.puits; c.strokeStyle = 'rgba(200,150,255,.6)'; c.lineWidth = 2;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(q.x, q.y, 110 * (.4 + i * .3), G.t * 4 + i, G.t * 4 + i + 4); c.stroke(); }
    c.fillStyle = '#0a0014'; c.beginPath(); c.arc(q.x, q.y, 14 + Math.min(16, w.stock * .4), 0, TAU); c.fill();
    if (w.stock) { c.fillStyle = '#e8d0ff'; c.font = '800 13px ' + POLICE; c.textAlign = 'center'; c.fillText(w.stock, q.x, q.y - 26); }
  }
  if (prim === 'surchauffe') {
    // jauge en arc autour du héros : la zone verte s'allume quand on peut relâcher pour le bonus (après 0,8 s de tir)
    const h = Math.min(1, w.heat || 0), R0 = 30, a0 = Math.PI * .75, a1 = Math.PI * 2.25, A = a => a0 + (a1 - a0) * a;
    const pret = (w.tenu || 0) >= .8 && h >= .72 && h <= .9 && !(w.bonus > 0);
    c.lineCap = 'round';
    c.strokeStyle = 'rgba(0,0,0,.65)'; c.lineWidth = 9; c.beginPath(); c.arc(p.x, p.y, R0, a0, a1); c.stroke();
    c.strokeStyle = pret ? '#7dffb0' : 'rgba(80,255,150,.45)'; c.lineWidth = pret ? 8 : 6; c.beginPath(); c.arc(p.x, p.y, R0, A(.72), A(.9)); c.stroke();
    const g = h < .5 ? '#ffd27a' : h < .72 ? '#ff9a3c' : h <= .9 ? '#ff6a2a' : '#ff3030';
    c.strokeStyle = g; c.lineWidth = 4; c.beginPath(); c.arc(p.x, p.y, R0, a0, A(Math.max(.01, h))); c.stroke();
    c.lineCap = 'butt';
    if (pret) {
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = .55 + .45 * Math.sin(G.t * 18); c.drawImage(glow('rgba(120,255,170,.9)', 46), p.x - 46, p.y - 46); c.restore();
      texteOmbre(c, 'RELÂCHE !', p.x, p.y - 44, '#9dffc4', `800 13px ${POLICE}`, 3);
    } else if (w.bonus > 0) texteOmbre(c, '+20 %', p.x, p.y - 44, '#fff17a', `800 12px ${POLICE}`, 3);
  }
  if (prim === 'croix') {
    c.strokeStyle = 'rgba(255,122,61,.13)'; c.lineWidth = 2;
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + (w.mode ? Math.PI / 4 : 0), L = Arene.rayMur(p.x, p.y, a, 1500); c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + Math.cos(a) * L, p.y + Math.sin(a) * L); c.stroke(); }
  }
  if (prim === 'jumelles' && w.o) for (const [ox, oy] of w.o) {
    c.globalCompositeOperation = 'lighter'; c.drawImage(glow('rgba(255,225,77,.9)', 12), ox - 12, oy - 12); c.globalCompositeOperation = 'source-over';
    c.fillStyle = '#fff6c0'; c.beginPath(); c.arc(ox, oy, 5, 0, TAU); c.fill();
  }
  if (prim === 'jumelles' && w.vol && w.vol.t < .4) { c.strokeStyle = 'rgba(255,225,77,.5)'; c.setLineDash([4, 4]); c.beginPath(); c.arc(w.vol.tx, w.vol.ty, 40, 0, TAU); c.stroke(); c.setLineDash([]); }
  if (prim === 'iaido' && w.ch > 0) {
    const ok = w.ch >= .8 && w.ch <= .98;
    c.strokeStyle = ok ? '#ffe14d' : 'rgba(255,255,255,.5)'; c.lineWidth = ok ? 4 : 2;
    c.beginPath(); c.arc(p.x, p.y, 26, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, w.ch / .98)); c.stroke();
    if (ok) { c.globalCompositeOperation = 'lighter'; c.drawImage(glow('rgba(255,225,77,.8)', 40), p.x - 40, p.y - 40); c.globalCompositeOperation = 'source-over'; }
  }
  if (prim === 'meteorite' && w.ch > 0) { c.strokeStyle = w.ch >= 1 ? '#ffd27f' : 'rgba(255,210,127,.5)'; c.setLineDash([6, 6]); c.beginPath(); c.arc(G.mx, G.my, 50 + 65 * w.ch, 0, TAU); c.stroke(); c.setLineDash([]); }
  if (prim === 'lucioles') for (let i = 0; i < 5; i++) if (!w.dispo || w.dispo[i]) { const a = G.t * 3 + i * TAU / 5, x = p.x + Math.cos(a) * 34, y = p.y + Math.sin(a) * 34; c.globalCompositeOperation = 'lighter'; c.drawImage(glow('rgba(200,255,120,.9)', 9), x - 9, y - 9); c.globalCompositeOperation = 'source-over'; }
  if (prim === 'foreuse' && w.beam) { const B = w.beam; c.lineCap = 'round'; c.strokeStyle = 'rgba(200,210,230,.7)'; c.lineWidth = 8 + Math.sin(G.t * 60) * 3; c.beginPath(); c.moveTo(B.x1, B.y1); c.lineTo(B.x2, B.y2); c.stroke(); c.lineCap = 'butt'; }
  if (p.bulle > 0) { c.strokeStyle = 'rgba(160,220,255,.9)'; c.lineWidth = 3; c.fillStyle = 'rgba(160,220,255,.15)'; c.beginPath(); c.arc(p.x, p.y, p.r + 14 + Math.sin(G.t * 8) * 2, 0, TAU); c.fill(); c.stroke(); }
  if (p.contre > 0) { c.strokeStyle = '#ff8a5c'; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y, p.r + 8, 0, TAU); c.stroke(); }
  if (G.boss && G.boss.harpon > 0) { c.strokeStyle = 'rgba(192,200,212,.6)'; c.lineWidth = 2; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(G.boss.x, G.boss.y); c.stroke(); c.setLineDash([]); }
  if (prim === 'rattrape' && w.etat === 'sol') {
    c.strokeStyle = '#9fffb0'; c.lineWidth = 4; c.beginPath(); c.arc(w.sx, w.sy, 12, -1.2, 1.2); c.stroke();
    c.strokeStyle = 'rgba(159,255,176,.4)'; c.setLineDash([3, 5]); c.beginPath(); c.arc(w.sx, w.sy, 22 + Math.sin(G.t * 6) * 3, 0, TAU); c.stroke(); c.setLineDash([]);
  }
  if (p.ancre) { c.strokeStyle = 'rgba(160,255,200,.7)'; c.setLineDash([4, 5]); c.beginPath(); c.arc(p.ancre.x, p.ancre.y, 16, 0, TAU); c.stroke(); c.setLineDash([]); c.beginPath(); c.moveTo(p.ancre.x, p.ancre.y); c.lineTo(p.x, p.y); c.strokeStyle = 'rgba(160,255,200,.2)'; c.stroke(); }
  const haut = p.saut > 0 ? Math.sin((1 - p.saut / p.sautMax) * Math.PI) * 40 : 0, sc = 1 + haut / 60;
  c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.ellipse(p.x + 3, p.y + 10, 13 / sc, 6 / sc, 0, 0, TAU); c.fill();
  let al = 1;
  if (p.iframe > 0 && !p.dash && p.saut <= 0) al = (G.t * 24 | 0) % 2 ? .4 : .95;
  if (p.fantome > 0) al = .35;
  if (p.invis > 0) al = .22;
  c.globalCompositeOperation = 'lighter';
  const au = equipe('aura'), tr = equipe('trainee');
  c.drawImage(glow(au.col || 'rgba(80,230,255,.45)', (au.col ? 48 : 34) * sc), p.x - (au.col ? 48 : 34) * sc, p.y - haut - (au.col ? 48 : 34) * sc);
  if (au.col && au.id === 'r_feu') sprite(c, 'flame_03', '#ff8a3c', p.x, p.y - haut - 6, 46, Math.sin(G.t * 6) * .1, .5, true);
  if (au.couronne) { c.fillStyle = '#ffd86b'; c.beginPath(); const cy = p.y - haut - 34; c.moveTo(p.x - 9, cy + 6); c.lineTo(p.x - 9, cy - 2); c.lineTo(p.x - 4, cy + 2); c.lineTo(p.x, cy - 5); c.lineTo(p.x + 4, cy + 2); c.lineTo(p.x + 9, cy - 2); c.lineTo(p.x + 9, cy + 6); c.fill(); }
  if (tr.col && Math.hypot(p.vx, p.vy) > 40 && R() < (tr.gros ? .9 : .5)) G.parts.push({ x: p.x + R.range(-6, 6), y: p.y + R.range(-6, 6), vx: -p.vx * .1 + R.range(-15, 15), vy: -p.vy * .1 + R.range(-15, 15), life: tr.gros ? .8 : .5, max: tr.gros ? .8 : .5, col: tr.col, r: tr.gros ? 3 : 2, add: tr.add });
  c.globalCompositeOperation = 'source-over';
  // le héros est dessiné plus grand que sa zone de collision (seul le point rouge compte pour les coups)
  dessinerVaisseau(c, p.x, p.y - haut, p.aim, p.r * sc * 1.6, p.rouge > 0 ? '#ff6b7d' : '#34d6ff', al, p);
  c.globalAlpha = al;
  // vraie zone de coup : un peu transparente pour laisser voir le casque, contour net
  c.fillStyle = 'rgba(255,45,85,.72)'; c.beginPath(); c.arc(p.x, p.y - haut, p.hr, 0, TAU); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.stroke();
  c.globalAlpha = 1;
  if (p.bouclier > 0) { c.strokeStyle = 'rgba(140,200,255,.9)'; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y, p.r + 10, 0, TAU); c.stroke(); }
  if (p.miroir > 0) { c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + G.t * 2; c.lineTo(p.x + Math.cos(a) * (p.r + 13), p.y + Math.sin(a) * (p.r + 13)); } c.closePath(); c.stroke(); }
  if (p.parade > 0) { c.strokeStyle = '#ffe9a0'; c.lineWidth = 4; c.beginPath(); c.arc(p.x, p.y, p.r + 7, 0, TAU); c.stroke(); }
  if (p.sprint > 0 && R() < .5) G.fx.push({ kind: 'fantome', x: p.x, y: p.y, t: 0, dur: .2 });
}

function dessinerTirsEnnemis(c) {
  const p = G.p, noir = Arene.noir;
  c.globalCompositeOperation = 'lighter';
  for (const e of G.eb) {
    let al = 1;
    if (noir && p) { const dd = Math.sqrt(d2(e.x, e.y, p.x, p.y)); al = dd < 240 ? 1 : Math.max(.3, 1 - (dd - 240) / 300); }
    if (e.delai > 0) al *= .5 + .5 * Math.sin(G.t * 20);
    c.globalAlpha = al * .9;
    const gr = e.r * 2.8;
    c.drawImage(glow(e.gel > 0 ? '#bfe6ff' : e.col, gr), e.x - gr, e.y - gr);
  }
  c.globalCompositeOperation = 'source-over';
  for (const e of G.eb) {
    let al = 1;
    if (noir && p) { const dd = Math.sqrt(d2(e.x, e.y, p.x, p.y)); al = dd < 240 ? 1 : Math.max(.3, 1 - (dd - 240) / 300); }
    c.globalAlpha = al;
    if (G.opts.contour) { c.strokeStyle = '#000'; c.lineWidth = 3; c.beginPath(); c.arc(e.x, e.y, e.r + 1.5, 0, TAU); c.stroke(); }
    c.fillStyle = '#fff'; c.beginPath(); c.arc(e.x, e.y, e.r * .6, 0, TAU); c.fill();
    c.strokeStyle = e.gel > 0 ? '#bfe6ff' : e.col; c.lineWidth = Math.max(2, e.r * .35); c.beginPath(); c.arc(e.x, e.y, e.r * .8, 0, TAU); c.stroke();
    if (e.hp > 0) { c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.setLineDash([3, 4]); c.beginPath(); c.arc(e.x, e.y, e.r + 4, G.t * 3, G.t * 3 + TAU); c.stroke(); c.setLineDash([]); }
  }
  c.globalAlpha = 1;
}

function dessinerFx(c) {
  for (const f of G.fx) {
    if (f.t < 0) continue;
    const k = f.t / f.dur;
    switch (f.kind) {
      case 'anneau': {
        const x = f.suit ? G.p.x : f.x, y = f.suit ? G.p.y : f.y;
        c.strokeStyle = f.col; c.globalAlpha = 1 - k; c.lineWidth = 5 * (1 - k) + 1;
        c.beginPath(); c.arc(x, y, lerp(f.r0, f.r1, k), 0, TAU); c.stroke(); c.globalAlpha = 1; break;
      }
      case 'boule': {
        f.rot = f.rot || R() * TAU;
        sprite(c, k < .5 ? 'fire_01' : 'fire_02', f.col, f.x, f.y, f.r * (1.6 + 1.2 * k), f.rot, (1 - k) * .9, true);
        sprite(c, 'spark_05', '#fff4d0', f.x, f.y, f.r * (1 + 2 * k), -f.rot, (1 - k) * .7, true);
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = (1 - k) * .45;
        const r = f.r * (.5 + .7 * k);
        c.drawImage(glow('rgba(255,245,220,.9)', r * .5), f.x - r * .5, f.y - r * .5);
        c.drawImage(glow(f.col, r * 1.2), f.x - r * 1.2, f.y - r * 1.2);
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; break;
      }
      case 'taillade': {
        const p = f.fixe || G.p, a0 = f.a - 1.05 * f.sens, a1 = f.a + 1.05 * f.sens, cur = lerp(a0, a1, Math.min(1, k * 1.6));
        c.fillStyle = (f.col || 'rgba(220,250,255,') + (.4 * (1 - k)) + ')'; c.beginPath(); c.moveTo(p.x, p.y);
        c.arc(p.x, p.y, f.reach, Math.min(a0, cur), Math.max(a0, cur)); c.closePath(); c.fill();
        c.strokeStyle = `rgba(255,255,255,${1 - k})`; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y, f.reach, Math.min(a0, cur), Math.max(a0, cur)); c.stroke();
        sprite(c, 'slash_02', f.col ? '#c8a0ff' : '#ffffff', p.x + Math.cos(f.a) * f.reach * .55, p.y + Math.sin(f.a) * f.reach * .55, f.reach * 1.5, f.a + Math.PI / 2 * f.sens, 1 - k, true);
        break;
      }
      case 'moulinet': {
        const p = G.p, a0 = f.a + k * TAU * 1.2;
        c.strokeStyle = `rgba(230,220,255,${1 - k})`; c.lineWidth = 6; c.beginPath(); c.arc(p.x, p.y, f.reach, a0, a0 + 4); c.stroke();
        c.fillStyle = `rgba(200,180,255,${.18 * (1 - k)})`; c.beginPath(); c.arc(p.x, p.y, f.reach, 0, TAU); c.fill();
        break;
      }
      case 'fouet': {
        const p = G.p; c.strokeStyle = `rgba(255,230,200,${1 - k})`; c.lineWidth = 4; c.beginPath(); c.moveTo(p.x, p.y);
        for (let i = 1; i <= 12; i++) { const q = i / 12, off = Math.sin(q * Math.PI) * 30 * f.s * (1 - k); c.lineTo(p.x + Math.cos(f.a) * f.L * q - Math.sin(f.a) * off, p.y + Math.sin(f.a) * f.L * q + Math.cos(f.a) * off); }
        c.stroke(); break;
      }
      case 'trait': {
        c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
        c.strokeStyle = `rgba(120,255,255,${.6 * (1 - k)})`; c.lineWidth = 22 * (1 - k); c.beginPath(); c.moveTo(f.x1, f.y1); c.lineTo(f.x2, f.y2); c.stroke();
        c.strokeStyle = `rgba(255,255,255,${1 - k})`; c.lineWidth = 4; c.stroke();
        c.lineCap = 'butt'; c.globalCompositeOperation = 'source-over'; break;
      }
      case 'cone': {
        c.fillStyle = `rgba(160,210,255,${.35 * (1 - k)})`; c.beginPath(); c.moveTo(f.x, f.y); c.arc(f.x, f.y, f.r * (.4 + .6 * k), f.a - .9, f.a + .9); c.closePath(); c.fill(); break;
      }
      case 'muzzle': sprite(c, 'muzzle_01', '#fff2b0', f.x, f.y, 30, f.a + Math.PI / 2, (1 - k), true); break;
      case 'etoile': sprite(c, 'star_06', f.col || '#ffe14d', f.x, f.y, 40 + 30 * k, k * 2, 1 - k, true); break;
      case 'eclair': {
        c.strokeStyle = `rgba(200,240,255,${1 - k})`; c.lineWidth = 2.5; c.beginPath();
        for (let i = 0; i < f.pts.length - 1; i++) {
          const [x1, y1] = f.pts[i], [x2, y2] = f.pts[i + 1];
          c.moveTo(x1, y1);
          for (let s = 1; s <= 5; s++) { const q = s / 5; c.lineTo(lerp(x1, x2, q) + (s < 5 ? R.range(-9, 9) : 0), lerp(y1, y2, q) + (s < 5 ? R.range(-9, 9) : 0)); }
        }
        c.stroke(); break;
      }
      case 'fantome':
        if (f.r) { c.globalAlpha = .4 * (1 - k); c.fillStyle = G.boss ? G.boss.col : '#fff'; c.beginPath(); c.arc(f.x, f.y, f.r, 0, TAU); c.fill(); c.globalAlpha = 1; }
        else dessinerVaisseau(c, f.x, f.y, G.p ? G.p.aim : 0, 13, '#7fe0ff', .35 * (1 - k));
        break;
      case 'echo':
        c.globalAlpha = .8 * (1 - k * k); c.strokeStyle = G.boss ? G.boss.col : '#fff'; c.lineWidth = 2;
        c.beginPath(); c.arc(f.x, f.y, 18, 0, TAU); c.stroke(); c.fillStyle = c.strokeStyle; c.beginPath(); c.arc(f.x, f.y, 6, 0, TAU); c.fill(); c.globalAlpha = 1; break;
    }
  }
  for (const q of G.parts) {
    const a = q.life / q.max;
    if (q.fumee) { q.rot = q.rot || R() * TAU; if (!sprite(c, q.r > 15 ? 'smoke_05' : 'smoke_01', '#2a2630', q.x, q.y, q.r * 3, q.rot + q.life, a * .7)) { c.globalAlpha = a * .8; c.fillStyle = q.col; c.beginPath(); c.arc(q.x, q.y, q.r, 0, TAU); c.fill(); } continue; }
    c.globalAlpha = a;
    if (q.add) c.globalCompositeOperation = 'lighter';
    c.fillStyle = q.col; c.strokeStyle = q.col;
    if (q.trait) { c.lineWidth = q.r; c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(q.x - q.vx * .035, q.y - q.vy * .035); c.stroke(); }
    else c.fillRect(q.x - q.r, q.y - q.r, q.r * 2, q.r * 2);
    c.globalCompositeOperation = 'source-over';
  }
  c.globalAlpha = 1;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const x of G.textes) {
    c.globalAlpha = 1 - (x.t / x.dur) ** 2; c.font = `800 ${x.size}px ${POLICE}`;
    c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,.75)'; c.strokeText(x.txt, x.x, x.y); c.fillStyle = x.col; c.fillText(x.txt, x.x, x.y);
  }
  c.globalAlpha = 1;
}

function dessinerButin(c) {
  for (const l of G.loot) {
    if (l.t < 0) continue;
    const y = l.y + Math.sin(G.t * 3 + l.x) * 5, k = Math.min(1, l.t * 3);
    if (l.kind === 'soin') {
      c.globalCompositeOperation = 'lighter'; c.drawImage(glow('rgba(70,227,155,.8)', 34 * k), l.x - 34 * k, y - 34 * k); c.globalCompositeOperation = 'source-over';
      c.fillStyle = '#eafff3'; c.fillRect(l.x - 3, y - 10, 6, 20); c.fillRect(l.x - 10, y - 3, 20, 6);
    } else if (l.kind === 'relique') {
      const r = RELIQUES[l.id], col = '#c06bff';
      c.globalCompositeOperation = 'lighter'; c.drawImage(glow('rgba(192,107,255,.8)', 46 * k), l.x - 46 * k, y - 46 * k); c.globalCompositeOperation = 'source-over';
      c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + G.t; c.lineTo(l.x + Math.cos(a) * 26, y + Math.sin(a) * 26); } c.closePath(); c.stroke();
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `24px Segoe UI Emoji, ${POLICE}`; c.fillStyle = '#fff'; c.fillText(r.ico, l.x, y + 1);
      c.font = `800 15px ${POLICE}`; c.fillStyle = '#e2c2ff'; c.fillText(r.nom, l.x, y + 46);
      c.font = `12px ${POLICE}`; c.fillStyle = '#9fffc8'; c.fillText('+ ' + r.desc, l.x, y + 64);
      c.fillStyle = '#ff9aa8'; c.fillText('− ' + r.malus.replace(/^−\s*/, ''), l.x, y + 80);
      c.font = `700 10px ${POLICE}`; c.fillStyle = col; c.fillText('RELIQUE', l.x, y - 40);
    } else {
      const col = { p: '#ff8a5c', s: '#5aa8ff', t: '#46e39b' }[l.cat], u = UPG[l.cat].find(x => x.id === l.id);
      c.globalCompositeOperation = 'lighter'; c.drawImage(glow(col, 50 * k), l.x - 50 * k, y - 50 * k); c.globalCompositeOperation = 'source-over';
      c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.arc(l.x, y, 26, 0, TAU); c.stroke();
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `24px Segoe UI Emoji, ${POLICE}`; c.fillStyle = '#fff'; c.fillText(u.ico, l.x, y + 1);
      c.font = `800 15px ${POLICE}`; c.fillStyle = col; c.fillText(u.nom, l.x, y + 46);
      c.font = `12px ${POLICE}`; c.fillStyle = '#cfc8de'; c.fillText(u.desc, l.x, y + 64);
      c.font = `700 10px ${POLICE}`; c.fillStyle = col; c.fillText({ p: 'ARMES', s: 'SPÉCIALES', t: 'TALENTS' }[l.cat], l.x, y - 40);
    }
  }
  if (G.portail) {
    const po = G.portail, k = Math.min(1, po.t * 2);
    for (let i = 0; i < 4; i++) {
      c.strokeStyle = `hsla(${260 + i * 20},90%,${60 + i * 8}%,${.8 * k})`; c.lineWidth = 4;
      c.beginPath(); c.arc(po.x, po.y, (40 - i * 8) * k, G.t * (2 + i) + i, G.t * (2 + i) + i + 4.5); c.stroke();
    }
    c.fillStyle = `rgba(20,0,40,${.7 * k})`; c.beginPath(); c.arc(po.x, po.y, 14 * k, 0, TAU); c.fill();
  }
}

// ---------- Interface ----------
function barre(c, x, y, w, h, k, col, fond) {
  c.fillStyle = fond || 'rgba(0,0,0,.6)'; c.fillRect(x, y, w, h);
  const g = c.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,.35)');
  c.fillStyle = col; c.fillRect(x, y, w * clamp(k, 0, 1), h);
  c.fillStyle = g; c.globalAlpha = .5; c.fillRect(x, y, w * clamp(k, 0, 1), h); c.globalAlpha = 1;
  c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 1; c.strokeRect(x + .5, y + .5, w - 1, h - 1);
}
function texteOmbre(c, txt, x, y, col, police, ep) { c.font = police; c.lineWidth = ep || 5; c.strokeStyle = 'rgba(0,0,0,.8)'; c.strokeText(txt, x, y); c.fillStyle = col; c.fillText(txt, x, y); }
function lignes(c, txt, maxW) {
  const mots = txt.split(' '), out = []; let l = '';
  for (const m of mots) { const t = l ? l + ' ' + m : m; if (c.measureText(t).width > maxW && l) { out.push(l); l = m; } else l = t; }
  if (l) out.push(l); return out;
}

function dessinerHUD(c) {
  const b = G.boss, p = G.p, def = G.def;
  c.textBaseline = 'middle';
  if (b) {
    const bw = 640, bx = W / 2 - bw / 2, by = 40;
    c.textAlign = 'center';
    texteOmbre(c, (def.legendaire ? 'LÉGENDAIRE · ' : '') + def.nom, W / 2, 15, def.legendaire ? '#ffb43d' : def.mega ? '#ffd86b' : def.col, `700 21px ${POLICE_ER}`, 4);
    c.font = `italic 12px ${POLICE}`; c.fillStyle = '#b8b0cc'; c.fillText(def.titre, W / 2, 31);
    barre(c, bx, by, bw, 14, Math.max(0, b.hp) / b.hpMax, def.mega ? '#ffb43d' : def.col);
    if (b.ouvert > 0) { c.strokeStyle = '#ffd24d'; c.lineWidth = 2; c.strokeRect(bx - 2, by - 2, bw + 4, 18); }
    const n = def.phases.length;
    c.fillStyle = '#000';
    for (let i = 1; i < n; i++) c.fillRect(bx + bw * (1 - i / n) - 1, by, 3, 14);
    c.font = `600 11px ${POLICE}`; c.textAlign = 'left'; c.fillStyle = '#ddd';
    c.fillText('Phase ' + (b.phase + 1) + '/' + n, bx + bw + 10, by + 7);
    const fat = fatigueBoss();
    if (fat > 1 && !b.mort) { c.textAlign = 'right'; texteOmbre(c, 'épuisé ×' + fat.toFixed(1), bx + bw, by + 26, '#ffcf6b', `800 12px ${POLICE}`, 3); icoDessin(c, 'ui:sablier', bx + bw - c.measureText('épuisé ×' + fat.toFixed(1)).width - 12, by + 26, 15, '#ffcf6b'); c.textAlign = 'left'; }
    c.textAlign = 'right'; c.fillText(Math.ceil(Math.max(0, b.hp)).toLocaleString('fr-FR'), bx - 10, by + 7);
    if (b.armureMax) barre(c, bx, by + 17, bw, 4, b.armure / b.armureMax, '#c9c9d6');
    c.textAlign = 'left'; c.font = `14px Segoe UI Emoji, ${POLICE}`;
    let tx = bx + bw + 80;
    for (const t of def.traits) { icoDessin(c, TRAITS[t].ico, tx + 8, by + 7, 18); tx += 22; }
    if (b.atkNomT > 0 && !b.mort && b.last) {
      c.globalAlpha = Math.min(1, b.atkNomT); c.textAlign = 'center';
      texteOmbre(c, ATK[b.main ? b.main.id : b.last].nom, W / 2, by + 32, '#fff', `700 13px ${POLICE}`, 3); c.globalAlpha = 1;
    }
  }
  // ---------- infos en haut à gauche : un cadre, une ligne par info, rien ne se chevauche ----------
  {
    const lignes = [];
    const reste = 5 - ((G.salle - 1) % 5) - 1;
    const rg = typeof Regions !== 'undefined' && Regions.rg;
    if (rg) lignes.push({ txt: romain(rg.num) + ' · ' + rg.nom, col: '#e8c47a', font: `700 15px ${POLICE_ER}` });
    if (G.mode === 'normal') lignes.push({ ico: DF().ico, txt: DF().nom + ' · palier ' + PR().palier, col: '#e6e0f0' });
    else if (G.mode === 'entrainement') lignes.push({ txt: 'Entraînement', col: '#7dffb0' });
    else {
      const df = G.defi, F = FORMATS[df.format];
      let info = F.nom;
      if (df.format === 'abysses') info += ' · profondeur ' + df.i;
      else if (df.format === 'danse') info += ' · ' + df.coups + ' coup(s) · ' + Math.max(0, Math.ceil(F.duree - G.chrono)) + ' s';
      else if (df.format === 'deluge') info += ' · ' + Math.round(df.degats / 100) / 10 + ' k · ' + Math.max(0, Math.ceil(F.duree - G.chrono)) + ' s';
      else if (df.format === 'survie') info += ' · ' + fmtTemps(G.chrono) + (typeof Pression !== 'undefined' ? ' · pression ' + Pression.niveau : '');
      else info += ' · boss ' + (df.i + 1) + '/' + df.boss.length;
      lignes.push({ ico: F.ico, txt: info, col: '#ffd86b' });
      for (const m of df.mut) lignes.push({ ico: MUTATEURS[m].ico, txt: MUTATEURS[m].nom, col: '#d8b8ff', petit: true });
    }
    if (G.mode === 'normal' || G.mode === 'entrainement') lignes.push(G.mega ? { txt: 'MÉGA BOSS du palier ' + (G.salle / 5), col: '#ffd86b', font: `800 14px ${POLICE}` } : { txt: 'Méga boss dans ' + reste + ' salle' + (reste > 1 ? 's' : ''), col: '#b8b0cc' });
    const x0 = 12, y0 = 8, larg = 250, ht = 34 + lignes.reduce((n, l) => n + (l.petit ? 18 : 22), 0) + 6;
    c.save();
    c.fillStyle = 'rgba(8,6,10,.62)'; c.fillRect(x0, y0, larg, ht);
    c.strokeStyle = 'rgba(201,168,101,.45)'; c.lineWidth = 1; c.strokeRect(x0 + .5, y0 + .5, larg - 1, ht - 1);
    c.textAlign = 'left'; c.textBaseline = 'middle';
    texteOmbre(c, 'Salle ' + G.salle, x0 + 12, y0 + 18, '#ffffff', `800 21px ${POLICE_ER}`, 4);
    let y = y0 + 34 + 10;
    for (const l of lignes) {
      let tx = x0 + 12;
      if (l.ico) { icoDessin(c, l.ico, tx + 8, y, l.petit ? 14 : 17); tx += l.petit ? 20 : 24; }
      texteOmbre(c, l.txt, tx, y, l.col, l.font || `${l.petit ? 600 : 700} ${l.petit ? 12 : 14}px ${POLICE}`, 3);
      y += l.petit ? 18 : 22;
    }
    c.restore();
  }
  if (G.opts.fps) { c.textAlign = 'right'; c.fillStyle = '#7dffb0'; c.fillText(Math.round(G.fps || 0) + ' i/s', W - 16, 54); c.textAlign = 'left'; }
  const rels = G.reliques ? G.reliques() : [];
  if (rels.length) { c.textAlign = 'left'; c.font = `16px Segoe UI Emoji, ${POLICE}`; rels.forEach((id, i) => c.fillText(RELIQUES[id].ico, 16 + i * 22, 72)); }
  c.textAlign = 'right'; c.font = `600 15px ${POLICE}`; c.fillStyle = '#ddd';
  if (G.opts.chrono !== false) c.fillText(fmtTemps(G.chrono), W - 16, 18);
  if (false) {
    const s = G.succesFile[0], x = SUCCES[s.id], a = Math.min(1, s.t * 4, (3 - s.t) * 3);
    c.globalAlpha = a; c.fillStyle = 'rgba(20,14,34,.92)'; c.fillRect(W - 330, 70, 314, 54); c.strokeStyle = '#ffd86b'; c.lineWidth = 2; c.strokeRect(W - 330, 70, 314, 54);
    c.textAlign = 'left'; c.font = `26px Segoe UI Emoji, ${POLICE}`; c.fillStyle = '#fff'; c.fillText(x.ico, W - 318, 97);
    c.font = `700 11px ${POLICE}`; c.fillStyle = '#ffd86b'; c.fillText('SUCCÈS DÉBLOQUÉ', W - 280, 86);
    c.font = `800 16px ${POLICE}`; c.fillStyle = '#fff'; c.fillText(x.nom, W - 280, 106); c.globalAlpha = 1;
  }
  c.font = `11px ${POLICE}`; c.fillStyle = '#777'; c.fillText('Échap : pause', W - 16, 36);
  if (p) {
    const y0 = 736;
    c.textAlign = 'left'; c.font = `800 12px ${POLICE}`; c.fillStyle = '#fff';
    icoDessin(c, 'ui:vie', 34, y0 + 7, 16); c.fillText(String(Math.ceil(p.hp)), 46, y0 + 7);
    barre(c, 90, y0, 260, 14, p.hp / p.hpMax, p.hp < p.hpMax * .3 ? '#ff4d6a' : '#46e39b');
    const spec = trouveArme('s', G.ars.s), tal = trouveArme('t', G.ars.t);
    const slots = [
      { a: trouveArme('p', G.ars.p), k: nomToucheCourt(TOUCHES().tir), col: '#ff8a5c' },
      { a: spec, k: nomToucheCourt(TOUCHES().spec) + ' / ' + nomToucheCourt(TOUCHES().spec2), col: '#5aa8ff', cd: p.spec.cd / (spec.rech * ST.sRech) },
      { a: tal, k: nomToucheCourt(TOUCHES().tal) + ' / ' + nomToucheCourt(TOUCHES().tal2), col: '#46e39b', cd: p.tal.charges > 0 ? 0 : p.tal.cd / (tal.rech * ST.tRech), ch: p.tal.charges }
    ];
    let sx = 420;
    const tst = G.toast, tk = tst ? Math.min(1, tst.t * 3, (tst.dur - tst.t) * 2) : 0;
    slots.forEach((s, i) => {
      const w = 230, nouveau = tst && tst.nouveaux[i];
      c.fillStyle = 'rgba(10,8,20,.8)'; c.fillRect(sx, y0 - 6, w, 52);
      c.strokeStyle = tk > 0 ? s.col : 'rgba(255,255,255,.18)'; c.lineWidth = tk > 0 ? 2 : 1; c.strokeRect(sx + .5, y0 - 5.5, w - 1, 51);
      if (s.cd > 0) { c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(sx, y0 - 6, w * clamp(s.cd, 0, 1), 52); }
      c.font = `24px Segoe UI Emoji, ${POLICE}`; c.textAlign = 'center'; c.fillStyle = s.manque || s.cd > 0 ? '#666' : '#fff';
      icoDessin(c, s.a.ico, sx + 26, y0 + 20, 32, s.manque || s.cd > 0 ? '#6e675c' : null);
      c.textAlign = 'left'; c.font = `800 13px ${POLICE}`; c.fillStyle = s.manque || s.cd > 0 ? '#888' : '#fff';
      c.fillText(s.a.nom, sx + 50, y0 + 10);
      c.font = `11px ${POLICE}`; c.fillStyle = s.col; c.fillText(s.k, sx + 50, y0 + 29);
      if (s.ch !== undefined && ST.tCharges > 1) { c.textAlign = 'right'; c.fillStyle = '#ffe9a0'; c.font = `800 13px ${POLICE}`; c.fillText('×' + s.ch, sx + w - 8, y0 + 10); }
      if (s.cd > 0) { c.textAlign = 'right'; c.fillStyle = '#9cf'; c.font = `11px ${POLICE}`; c.fillText(Math.ceil(s.cd * (s === slots[1] ? spec.rech * ST.sRech : tal.rech * ST.tRech)) + ' s', sx + w - 8, y0 + 29); }
      if (tk > 0) {
        c.globalAlpha = tk; c.textAlign = 'center';
        texteOmbre(c, s.a.nom, sx + w / 2 + 12, y0 - 34, s.col, `800 17px ${POLICE}`, 4); icoDessin(c, s.a.ico, sx + w / 2 + 12 - c.measureText(s.a.nom).width / 2 - 16, y0 - 34, 22, s.col);
        if (nouveau) texteOmbre(c, 'NOUVEAU', sx + w / 2, y0 - 54, '#ffe14d', `900 11px ${POLICE}`, 3);
        c.globalAlpha = 1;
      }
      sx += w + 12;
    });
  }
  if (G.banner) {
    const bn = G.banner, k = bn.t / bn.dur, a = Math.min(1, bn.t * 5, (1 - k) * 4);
    c.globalAlpha = a; c.textAlign = 'center';
    texteOmbre(c, bn.txt, W / 2, 150, bn.col, `900 34px ${POLICE}`, 7);
    c.globalAlpha = 1;
  }
}

function dessinerEcranDefi(c) {
  const f = G.finDefi, df = G.defi, F = FORMATS[df.format];
  c.fillStyle = 'rgba(4,2,10,.84)'; c.fillRect(0, 0, W, H);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  const titre = df.type === 'abysses' ? 'LES ABYSSES' : df.type === 'survie' ? 'SURVIE' : (df.type === 'jour' ? 'DÉFI DU JOUR' : 'DÉFI DE LA SEMAINE') + ' — ' + df.cle;
  texteOmbre(c, titre, W / 2, 92, '#b8b0cc', `800 18px ${POLICE}`, 4);
  icoDessin(c, F.ico, W / 2, 140, 40); texteOmbre(c, F.nom, W / 2, 180, '#e8e2f5', `800 24px ${POLICE}`, 4);
  const ok = f.score !== null;
  texteOmbre(c, ok ? F.fmt(f.score) : 'Défi raté', W / 2, 250, ok ? '#ffe14d' : '#ff4d6a', `900 58px ${POLICE}`, 8);
  if (f.record && ok) texteOmbre(c, 'NOUVEAU RECORD', W / 2, 315, '#ffe14d', `900 26px ${POLICE}`, 5);
  else if (f.ancien && f.ancien.score !== undefined) { c.font = `16px ${POLICE}`; c.fillStyle = '#b8b0cc'; c.fillText('Record : ' + F.fmt(f.ancien.score), W / 2, 315); }
  c.font = `15px ${POLICE}`; c.fillStyle = '#9a94ad';
  c.fillText(F.obj, W / 2, 365);
  if (df.mut.length) c.fillText(df.mut.map(m => MUTATEURS[m].nom).join('   ·   '), W / 2, 395);
  const k = .6 + .4 * Math.sin(G.t * 4);
  c.globalAlpha = k; texteOmbre(c, 'ESPACE — recommencer', W / 2, 560, '#fff', `800 24px ${POLICE}`, 5); c.globalAlpha = 1;
  c.font = `14px ${POLICE}`; c.fillStyle = '#9a94ad'; c.fillText('Échap — menu', W / 2, 600);
}
function dessinerEcranMort(c) {
  if (G.finDefi && G.defi) return dessinerEcranDefi(c);
  const r = G.resMort;
  if (!r) return;
  // fond : vignette rouge sombre, le combat reste visible derrière
  const vg = c.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, W * .7); vg.addColorStop(0, 'rgba(10,2,8,.72)'); vg.addColorStop(1, 'rgba(40,0,10,.92)');
  c.fillStyle = vg; c.fillRect(0, 0, W, H);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  const nomSrc = s => ATK[s] ? ATK[s].nom : ({ contact: 'Contact du boss', lave: 'Lave', invocation: 'Invocations', pieges: 'Pièges' }[s] || s);
  bandeauER(c, 150, 120, 1); texteGrave(c, 'MORT', W / 2, 150, 72, '#c8323f', 1, 'rgba(255,40,60,.6)');
  c.font = `600 17px ${POLICE}`; c.fillStyle = '#cfc6e0';
  c.fillText('Dernier coup : ' + nomSrc(G.tueur || 'contact'), W / 2, 200);
  // barre de vie du boss avec les phases
  const bx = W / 2 - 300, by = 238, bw = 600, n = r.def.phases.length;
  c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(bx - 2, by - 2, bw + 4, 22);
  c.fillStyle = '#3a1420'; c.fillRect(bx, by, bw, 18);
  c.fillStyle = '#ff4d6a'; c.fillRect(bx, by, bw * (1 - r.pct), 18);
  if (r.meilleur > 0) { const mx = bx + bw * (1 - r.meilleur); c.fillStyle = '#ffd86b'; c.fillRect(mx - 1, by - 6, 3, 30); }
  c.fillStyle = 'rgba(255,255,255,.6)'; for (let i = 1; i < n; i++) c.fillRect(bx + bw * (1 - i / n) - 1, by, 2, 18);
  c.font = `700 13px ${POLICE}`; c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText(r.def.nom + ' — phase ' + r.phase + '/' + n, bx, by + 36);
  c.textAlign = 'right'; c.fillStyle = r.record ? '#7dffb0' : '#cfc6e0'; c.fillText(Math.round(r.pct * 100) + ' % retirés' + (r.record ? ' · meilleur essai !' : r.meilleur > 0 ? ' · meilleur : ' + Math.round(r.meilleur * 100) + ' %' : ''), bx + bw, by + 36);
  // trois cartes de chiffres utiles
  const carte = (x, titre, val, sous) => {
    c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(x - 130, 300, 260, 92); c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 1; c.strokeRect(x - 129.5, 300.5, 259, 91);
    c.textAlign = 'center'; c.font = `700 12px ${POLICE}`; c.fillStyle = '#9a94ad'; c.fillText(titre.toUpperCase(), x, 320);
    c.font = `900 30px ${POLICE}`; c.fillStyle = '#fff'; c.fillText(val, x, 352);
    c.font = `12px ${POLICE}`; c.fillStyle = '#b8b0cc'; c.fillText(sous, x, 378);
  };
  carte(W / 2 - 280, 'Durée', fmtTemps(r.temps), 'combat parfait : 1 à 2 min');
  carte(W / 2, 'Tes dégâts', Math.round(r.dps) + ' /s', r.pct > 0 && r.dps > 0 ? 'encore ' + fmtTemps((1 - r.pct) * r.def.hpMax / r.dps) + ' à ce rythme' : '—');
  carte(W / 2 + 280, 'Essai', '#' + r.essai, r.essai > 1 ? 'tu progresses à chaque essai' : 'premier essai');
  // ce qui t'a fait le plus mal
  if (r.coups.length) {
    c.textAlign = 'center'; c.font = `700 12px ${POLICE}`; c.fillStyle = '#9a94ad'; c.fillText('CE QUI T\'A FAIT LE PLUS MAL', W / 2, 420);
    const tot = r.coups.reduce((s, x) => s + x[1], 0);
    r.coups.forEach(([s, v], i) => {
      const y = 446 + i * 26, w = 360 * v / tot;
      c.fillStyle = 'rgba(255,77,106,.25)'; c.fillRect(W / 2 - 180, y - 10, w, 20);
      c.textAlign = 'left'; c.font = `600 14px ${POLICE}`; c.fillStyle = '#fff'; c.fillText(nomSrc(s), W / 2 - 172, y);
      c.textAlign = 'right'; c.fillStyle = '#ffb3c0'; c.fillText(Math.round(v / tot * 100) + ' %', W / 2 + 172, y);
    });
    const tu = ATK[r.coups[0][0]];
    if (tu && tu.conseil) { c.textAlign = 'center'; c.font = `italic 14px ${POLICE}`; c.fillStyle = '#ffd86b'; lignes(c, tu.conseil, 720).slice(0, 2).forEach((l, i) => c.fillText(l, W / 2, 540 + i * 19)); }
  }
  c.textAlign = 'center';
  c.globalAlpha = .65 + .35 * Math.sin(G.t * 4);
  texteOmbre(c, 'ESPACE — réessayer', W / 2, 610, '#fff', `800 22px ${POLICE}`, 5);
  c.globalAlpha = 1;
  c.font = `13px ${POLICE}`; c.fillStyle = '#9a94ad'; c.fillText('Le boss et toi repartez à pleine vie, avec les mêmes armes · Échap — menu', W / 2, 642);
}

// ---------- Halo lumineux (bloom) ----------
let bloomCv = null, bloomCtx = null;
function bloom() { if (!cv.width || !cv.height) return;
  const w = Math.max(1, Math.ceil(cv.width / 4)), h = Math.max(1, Math.ceil(cv.height / 4));
  if (!bloomCv) { bloomCv = document.createElement('canvas'); bloomCtx = bloomCv.getContext('2d'); }
  if (bloomCv.width !== w || bloomCv.height !== h) { bloomCv.width = w; bloomCv.height = h; }
  bloomCtx.globalCompositeOperation = 'copy';
  bloomCtx.filter = 'contrast(2.4) brightness(.9) saturate(1.3) blur(3px)';
  bloomCtx.drawImage(cv, 0, 0, w, h);
  bloomCtx.filter = 'none';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .2;
  ctx.drawImage(bloomCv, 0, 0, cv.width, cv.height);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

const SOL_HZ = new Set(['flaque', 'lave', 'fissure', 'abime', 'givre', 'ronce', 'geyser']);
// fond animé de l'accueil : un colosse qui flotte dans la brume
const MENU_FOND = { forme: null, hue: 0, t: 0, braises: [] };
function fondMenu() {
  const F = MENU_FOND, k = cv.width / W;
  if (!F.forme) { const l = Object.keys(FORMES); F.forme = l[Math.floor(Math.random() * l.length)]; F.hue = Math.floor(Math.random() * 360); F.b = { s: {}, wind: 0, ouvert: 0, flash: 0, eyesA: 0 }; }
  F.t += 1 / 60;
  ctx.setTransform(k, 0, 0, k, 0, (cv.height - H * k) / 2);
  const g = ctx.createRadialGradient(W * .68, H * .45, 30, W * .68, H * .45, 700);
  g.addColorStop(0, hsl(F.hue, 50, 14)); g.addColorStop(1, '#030208');
  ctx.fillStyle = g; ctx.fillRect(-W, -H, W * 3, H * 3);
  ctx.save(); ctx.translate(W * .7, H * .48 + Math.sin(F.t * .7) * 14); ctx.globalAlpha = .55;
  ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glow(hsl(F.hue, 100, 50, .35), 320), -320, -320); ctx.globalCompositeOperation = 'source-over';
  ctx.scale(2.6, 2.6); F.b.eyesA = Math.PI * .9 + Math.sin(F.t * .5) * .3;
  try { FORMES[F.forme](ctx, F.b, 60, F.t, F.hue, 0, F.b.eyesA); } catch (e) { }
  ctx.restore();
  if (F.braises.length < 70) F.braises.push({ x: Math.random() * W, y: H + 10, v: 20 + Math.random() * 50, r: 1 + Math.random() * 2, p: Math.random() * 6 });
  ctx.globalCompositeOperation = 'lighter';
  for (const q of F.braises) { q.y -= q.v / 60; q.x += Math.sin(F.t + q.p) * .4; ctx.globalAlpha = Math.min(1, (q.y / H) * 1.5); ctx.fillStyle = hsl(F.hue + 30, 100, 65); ctx.fillRect(q.x, q.y, q.r, q.r); }
  F.braises = F.braises.filter(q => q.y > -10);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function rendu() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#030208'; ctx.fillRect(0, 0, cv.width, cv.height);
  if (G.etat === 'menu' || !G.p) { fondMenu(); return; }
  const sh = G.shake, sx = sh ? R.range(-sh, sh) * .6 : 0, sy = sh ? R.range(-sh, sh) * .6 : 0;
  const base = () => ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offX, dpr * offY);
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (offX + sx * scale), dpr * (offY + sy * scale));
  const c = ctx;
  dessinerArene(c);
  dessinerLumieres(c);
  c.save();
  c.beginPath(); c.rect(AR.x - 40, AR.y - 40, AR.w + 80, AR.h + 80); c.clip();
  for (const h of G.hz) if (SOL_HZ.has(h.kind)) HZ[h.kind].draw(h, c);
  if (G.boss && !G.boss.mort && G.boss.esp.dessinSol) G.boss.esp.dessinSol(c, G.boss);
  dessinerPiliers(c);
  dessinerButin(c);
  dessinerAllies(c);
  for (const m of G.minions) dessinerMinion(c, m);
  dessinerTirsJoueur(c);
  Decor.dessinerAmbiance(c);
  if (Arene.noir && G.p) {
    const p = G.p, g = c.createRadialGradient(p.x, p.y, 110, p.x, p.y, 300);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.93)');
    c.fillStyle = g; c.fillRect(AR.x - 40, AR.y - 40, AR.w + 80, AR.h + 80);
  }
  if (G.boss && !G.boss.mort) dessinerBoss(c, G.boss);
  // effets de tes armes d'abord, puis le héros, puis les dangers par-dessus : une balle du boss n'est jamais cachée
  dessinerFx(c);
  dessinerJoueur(c);
  c.save(); cheminArene(c); c.clip();
  for (const h of G.hz) if (!SOL_HZ.has(h.kind)) HZ[h.kind].draw(h, c);
  c.restore();
  dessinerTirsEnnemis(c);
  c.restore();
  if (G.opts.lumiere && !G.opts.effetsReduits) { bloom(); base(); } else base();
  // voiles d'ambiance
  const p = G.p;
  if (p && p.hp > 0 && p.hp < p.hpMax * .3) {
    const k = .35 + .25 * Math.sin(G.t * 7.4);
    const v = c.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 760);
    v.addColorStop(0, 'rgba(120,0,20,0)'); v.addColorStop(1, `rgba(160,0,30,${k})`);
    c.fillStyle = v; c.fillRect(0, 0, W, H);
  }
  if (p && p.rouge > 0) { c.fillStyle = `rgba(255,30,60,${p.rouge * .5})`; c.fillRect(0, 0, W, H); }
  const vg = c.createRadialGradient(W / 2, H / 2, 380, W / 2, H / 2, 820);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)');
  c.fillStyle = vg; c.fillRect(0, 0, W, H);
  if (G.ralenti > 0) { c.fillStyle = 'rgba(120,160,255,.07)'; c.fillRect(0, 0, W, H); }
  dessinerHUD(c);
  if (G.flash > 0) { c.fillStyle = `rgba(255,255,255,${Math.min(.6, G.flash)})`; c.fillRect(0, 0, W, H); }
  if (G.fondu > 0) { c.fillStyle = `rgba(3,2,8,${Math.min(1, G.fondu)})`; c.fillRect(0, 0, W, H); }
  if (G.etat === 'passage') { const k = G.passage.t / G.passage.dur; c.fillStyle = `rgba(230,220,255,${Math.min(1, k * 1.4)})`; c.fillRect(0, 0, W, H); }
  if (G.etat === 'mort' && G.ecranMort) dessinerEcranMort(c);
  cv.style.cursor = G.opts.viseur && G.opts.viseur !== 'systeme' && (G.etat === 'combat' || G.etat === 'interlude') ? 'none' : '';
  const vs = G.opts.viseur;
  if (vs === 'colosses' && (G.etat === 'combat' || G.etat === 'interlude')) {
    // viseur du jeu : anneau doré à quatre crans, qui se resserre quand on tire
    const x = G.mx, y = G.my, tir = Input.down(TOUCHES().tir) ? 1 : 0; G.viseurK = (G.viseurK || 0) + (tir - (G.viseurK || 0)) * .25;
    const rr = 13 - 3 * G.viseurK, rot = G.t * .6;
    c.save(); c.translate(x, y);
    c.strokeStyle = 'rgba(0,0,0,.75)'; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, rr, 0, TAU); c.stroke();
    c.strokeStyle = '#e8cf8e'; c.lineWidth = 1.6; c.beginPath(); c.arc(0, 0, rr, 0, TAU); c.stroke();
    c.rotate(rot);
    for (let i = 0; i < 4; i++) { c.rotate(TAU / 4); c.fillStyle = 'rgba(0,0,0,.75)'; c.beginPath(); c.moveTo(rr + 2, 0); c.lineTo(rr + 10, -4); c.lineTo(rr + 10, 4); c.closePath(); c.fill(); c.fillStyle = '#f3dea3'; c.beginPath(); c.moveTo(rr + 3, 0); c.lineTo(rr + 9, -2.6); c.lineTo(rr + 9, 2.6); c.closePath(); c.fill(); }
    c.restore();
    c.fillStyle = '#fff4d0'; c.beginPath(); c.arc(x, y, 1.8, 0, TAU); c.fill();
  } else if (vs && vs !== 'systeme' && (G.etat === 'combat' || G.etat === 'interlude')) {
    const x = G.mx, y = G.my, col = G.opts.viseurCol || '#ffffff';
    c.strokeStyle = 'rgba(0,0,0,.7)'; c.lineWidth = 4; c.fillStyle = col;
    const forme = () => { c.beginPath(); if (vs === 'croix') { c.moveTo(x - 12, y); c.lineTo(x - 4, y); c.moveTo(x + 4, y); c.lineTo(x + 12, y); c.moveTo(x, y - 12); c.lineTo(x, y - 4); c.moveTo(x, y + 4); c.lineTo(x, y + 12); } else if (vs === 'cercle') { c.arc(x, y, 10, 0, TAU); } c.stroke(); };
    if (vs === 'point') { c.beginPath(); c.arc(x, y, 4, 0, TAU); c.fillStyle = 'rgba(0,0,0,.7)'; c.fill(); c.beginPath(); c.arc(x, y, 2.6, 0, TAU); c.fillStyle = col; c.fill(); }
    else { forme(); c.strokeStyle = col; c.lineWidth = 2; forme(); }
  }
}
