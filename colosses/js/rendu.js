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

// ---------- Textures pré-calculées ----------
let texSol = null, texSolCle = '', texFond = null;
function texteFond() {
  if (texFond) return texFond;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'), r = RNG(42);
  x.fillStyle = '#030208'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 6; i++) { const g = x.createRadialGradient(r() * W, r() * H, 0, r() * W, r() * H, 300 + r() * 300); g.addColorStop(0, `hsla(${260 + r() * 80},60%,20%,.18)`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H); }
  for (let i = 0; i < 220; i++) { x.fillStyle = `rgba(255,255,255,${r() * .5})`; x.fillRect(r() * W, r() * H, r() * 1.6, r() * 1.6); }
  return (texFond = c);
}
function texteSol() {
  const hue = G.def ? G.def.hue : 260, cle = Arene.carte + '|' + Arene.version + '|' + hue;
  if (texSol && cle === texSolCle) return texSol;
  texSolCle = cle;
  const c = texSol || document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'), r = RNG(hashNum(Arene.version * 13 + hue));
  const glace = Arene.glace;
  x.fillStyle = glace ? '#0f1a2c' : hsl(hue, 18, 8); x.fillRect(0, 0, W, H);
  // dalles de pierre
  const T = 64;
  for (let gx = AR.x - 10; gx < AR.x + AR.w; gx += T) for (let gy = AR.y - 10; gy < AR.y + AR.h; gy += T) {
    const l = (glace ? 14 : 9) + r() * 5, dec = (gy / T | 0) % 2 ? T / 2 : 0;
    x.fillStyle = glace ? hsl(210, 40, l + 4) : hsl(hue, 12 + r() * 8, l);
    x.fillRect(gx + dec + 2, gy + 2, T - 4, T - 4);
    const g = x.createLinearGradient(gx + dec, gy, gx + dec + T, gy + T);
    g.addColorStop(0, 'rgba(255,255,255,.05)'); g.addColorStop(1, 'rgba(0,0,0,.18)');
    x.fillStyle = g; x.fillRect(gx + dec + 2, gy + 2, T - 4, T - 4);
    if (r() < .28) { x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = 1; x.beginPath(); let px = gx + dec + r() * T, py = gy + r() * T; x.moveTo(px, py); for (let k = 0; k < 4; k++) { px += r.range(-18, 18); py += r.range(-18, 18); x.lineTo(px, py); } x.stroke(); }
  }
  for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(${r() < .5 ? '255,255,255' : '0,0,0'},${r() * .06})`; x.fillRect(AR.x + r() * AR.w, AR.y + r() * AR.h, 2, 2); }
  // runes au centre
  x.strokeStyle = hsl(hue, 80, 50, .12); x.lineWidth = 3;
  x.beginPath(); x.arc(CX, CY, 180, 0, TAU); x.stroke(); x.beginPath(); x.arc(CX, CY, 230, 0, TAU); x.stroke();
  for (let i = 0; i < 12; i++) { const a = i * TAU / 12; x.beginPath(); x.moveTo(CX + Math.cos(a) * 180, CY + Math.sin(a) * 180); x.lineTo(CX + Math.cos(a) * 230, CY + Math.sin(a) * 230); x.stroke(); }
  if (glace) for (let i = 0; i < 40; i++) { x.strokeStyle = 'rgba(200,230,255,.12)'; x.beginPath(); const px = AR.x + r() * AR.w, py = AR.y + r() * AR.h; x.moveTo(px, py); x.lineTo(px + r.range(-60, 60), py + r.range(-60, 60)); x.stroke(); }
  // vignette intérieure
  const v = x.createRadialGradient(CX, CY, 200, CX, CY, 760);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)');
  x.fillStyle = v; x.fillRect(0, 0, W, H);
  return c;
}

function cheminArene(c) { const bb = Arene.bb(); c.beginPath(); if (Arene.kind === 'cercle') c.arc(CX, CY, Arene.rad(), 0, TAU); else c.rect(bb.x, bb.y, bb.w, bb.h); }

function dessinerArene(c) {
  const hue = G.def ? G.def.hue : 260;
  c.drawImage(texteFond(), 0, 0);
  c.save(); cheminArene(c); c.clip();
  c.drawImage(texteSol(), 0, 0);
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
  c.restore();
  // halo du bord
  c.save();
  c.shadowColor = Arene.insetMax > 0 ? '#ff4d6a' : hsl(hue, 90, 55); c.shadowBlur = 18;
  c.strokeStyle = Arene.insetMax > 0 ? '#ff4d6a' : hsl(hue, 85, 60, .85); c.lineWidth = 3;
  cheminArene(c); c.stroke();
  c.restore();
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
  if (G.portail) { const po = G.portail; c.drawImage(glow('rgba(160,120,255,.4)', 260), po.x - 260, po.y - 260); }
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

function dessinerVaisseau(c, x, y, a, r, col, al) {
  c.save(); c.translate(x, y); c.rotate(a); c.globalAlpha = al;
  const g = c.createLinearGradient(-r, -r, r, r);
  g.addColorStop(0, '#effcff'); g.addColorStop(1, col);
  c.fillStyle = g; c.strokeStyle = '#0a3a4a'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(r * 1.5, 0); c.lineTo(-r * .8, -r * 1.05); c.lineTo(-r * .35, 0); c.lineTo(-r * .8, r * 1.05); c.closePath(); c.fill(); c.stroke();
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
        break;
      }
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
  if (G.leurre) dessinerVaisseau(c, G.leurre.x, G.leurre.y, p.aim, p.r, '#7fe0ff', .45 + .15 * Math.sin(G.t * 10));
  if (p.ancre) { c.strokeStyle = 'rgba(160,255,200,.7)'; c.setLineDash([4, 5]); c.beginPath(); c.arc(p.ancre.x, p.ancre.y, 16, 0, TAU); c.stroke(); c.setLineDash([]); c.beginPath(); c.moveTo(p.ancre.x, p.ancre.y); c.lineTo(p.x, p.y); c.strokeStyle = 'rgba(160,255,200,.2)'; c.stroke(); }
  const haut = p.saut > 0 ? Math.sin((1 - p.saut / p.sautMax) * Math.PI) * 40 : 0, sc = 1 + haut / 60;
  c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.ellipse(p.x + 3, p.y + 10, 13 / sc, 6 / sc, 0, 0, TAU); c.fill();
  let al = 1;
  if (p.iframe > 0 && !p.dash && p.saut <= 0) al = (G.t * 24 | 0) % 2 ? .4 : .95;
  if (p.fantome > 0) al = .35;
  c.globalCompositeOperation = 'lighter';
  c.drawImage(glow('rgba(80,230,255,.45)', 34 * sc), p.x - 34 * sc, p.y - haut - 34 * sc);
  c.globalCompositeOperation = 'source-over';
  dessinerVaisseau(c, p.x, p.y - haut, p.aim, p.r * sc, p.rouge > 0 ? '#ff6b7d' : '#34d6ff', al);
  c.globalAlpha = al;
  c.fillStyle = '#ff2d55'; c.beginPath(); c.arc(p.x, p.y - haut, p.hr, 0, TAU); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.stroke();
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
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = (1 - k) * .6;
        const r = f.r * (.5 + .7 * k);
        c.drawImage(glow('rgba(255,245,220,.9)', r * .5), f.x - r * .5, f.y - r * .5);
        c.drawImage(glow(f.col, r * 1.2), f.x - r * 1.2, f.y - r * 1.2);
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; break;
      }
      case 'taillade': {
        const p = G.p, a0 = f.a - 1.05 * f.sens, a1 = f.a + 1.05 * f.sens, cur = lerp(a0, a1, Math.min(1, k * 1.6));
        c.fillStyle = `rgba(220,250,255,${.4 * (1 - k)})`; c.beginPath(); c.moveTo(p.x, p.y);
        c.arc(p.x, p.y, f.reach, Math.min(a0, cur), Math.max(a0, cur)); c.closePath(); c.fill();
        c.strokeStyle = `rgba(255,255,255,${1 - k})`; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y, f.reach, Math.min(a0, cur), Math.max(a0, cur)); c.stroke();
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
    if (q.fumee) { c.globalAlpha = a * .8; c.fillStyle = q.col; c.beginPath(); c.arc(q.x, q.y, q.r, 0, TAU); c.fill(); continue; }
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
    texteOmbre(c, (def.mega ? '★ ' : '') + def.nom + (def.mega ? ' ★' : ''), W / 2, 15, def.mega ? '#ffd86b' : def.col, `800 19px ${POLICE}`, 4);
    c.font = `italic 12px ${POLICE}`; c.fillStyle = '#b8b0cc'; c.fillText(def.titre, W / 2, 31);
    barre(c, bx, by, bw, 14, Math.max(0, b.hp) / b.hpMax, def.mega ? '#ffb43d' : def.col);
    if (b.ouvert > 0) { c.strokeStyle = '#ffd24d'; c.lineWidth = 2; c.strokeRect(bx - 2, by - 2, bw + 4, 18); }
    const n = def.phases.length;
    c.fillStyle = '#000';
    for (let i = 1; i < n; i++) c.fillRect(bx + bw * (1 - i / n) - 1, by, 3, 14);
    c.font = `600 11px ${POLICE}`; c.textAlign = 'left'; c.fillStyle = '#ddd';
    c.fillText('Phase ' + (b.phase + 1) + '/' + n, bx + bw + 10, by + 7);
    c.textAlign = 'right'; c.fillText(Math.ceil(Math.max(0, b.hp)).toLocaleString('fr-FR'), bx - 10, by + 7);
    if (b.armureMax) barre(c, bx, by + 17, bw, 4, b.armure / b.armureMax, '#c9c9d6');
    c.textAlign = 'left'; c.font = `14px Segoe UI Emoji, ${POLICE}`;
    let tx = bx + bw + 80;
    for (const t of def.traits) { c.fillText(TRAITS[t].ico, tx, by + 7); tx += 22; }
    if (b.atkNomT > 0 && !b.mort && b.last) {
      c.globalAlpha = Math.min(1, b.atkNomT); c.textAlign = 'center';
      texteOmbre(c, '▶ ' + ATK[b.main ? b.main.id : b.last].nom, W / 2, by + 32, '#fff', `700 13px ${POLICE}`, 3); c.globalAlpha = 1;
    }
  }
  c.textAlign = 'left';
  texteOmbre(c, 'Salle ' + G.salle, 16, 18, '#fff', `800 16px ${POLICE}`, 3);
  c.font = `12px ${POLICE}`; c.fillStyle = '#9a94ad';
  const reste = 5 - ((G.salle - 1) % 5) - 1;
  c.fillText(G.mega ? 'MÉGA BOSS du palier ' + (G.salle / 5) : 'Méga boss dans ' + reste + ' salle' + (reste > 1 ? 's' : ''), 16, 37);
  c.fillText(DF().ico + ' ' + DF().nom + ' · palier ' + PR().palier, 16, 54);
  c.textAlign = 'right'; c.font = `600 15px ${POLICE}`; c.fillStyle = '#ddd';
  c.fillText(fmtTemps(G.chrono), W - 16, 18);
  c.font = `11px ${POLICE}`; c.fillStyle = '#777'; c.fillText('Échap : pause', W - 16, 36);
  if (p) {
    const y0 = 736;
    c.textAlign = 'left'; c.font = `800 12px ${POLICE}`; c.fillStyle = '#fff';
    c.fillText('♥ ' + Math.ceil(p.hp), 30, y0 + 7);
    barre(c, 90, y0, 260, 14, p.hp / p.hpMax, p.hp < p.hpMax * .3 ? '#ff4d6a' : '#46e39b');
    c.fillStyle = '#9cf'; c.font = `800 12px ${POLICE}`; c.fillText('⚡', 34, y0 + 30);
    barre(c, 90, y0 + 24, 260, 11, p.energie / ST.eMax, '#5aa8ff');
    const spec = trouveArme('s', G.ars.s), tal = trouveArme('t', G.ars.t), cout = spec.cout * ST.sCout;
    c.fillStyle = '#fff'; c.fillRect(90 + 260 * Math.min(1, cout / ST.eMax) - 1, y0 + 22, 2, 15);
    const slots = [
      { a: trouveArme('p', G.ars.p), k: 'Clic G', col: '#ff8a5c' },
      { a: spec, k: 'Clic D / E', col: '#5aa8ff', cd: p.spec.cd / (spec.rech * ST.sRech), manque: p.energie < cout },
      { a: tal, k: 'Espace', col: '#46e39b', cd: p.tal.charges > 0 ? 0 : p.tal.cd / (tal.rech * ST.tRech), ch: p.tal.charges }
    ];
    let sx = 420;
    const tst = G.toast, tk = tst ? Math.min(1, tst.t * 3, (tst.dur - tst.t) * 2) : 0;
    slots.forEach((s, i) => {
      const w = 230, nouveau = tst && tst.nouveaux[i];
      c.fillStyle = 'rgba(10,8,20,.8)'; c.fillRect(sx, y0 - 6, w, 52);
      c.strokeStyle = tk > 0 ? s.col : 'rgba(255,255,255,.18)'; c.lineWidth = tk > 0 ? 2 : 1; c.strokeRect(sx + .5, y0 - 5.5, w - 1, 51);
      if (s.cd > 0) { c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(sx, y0 - 6, w * clamp(s.cd, 0, 1), 52); }
      c.font = `24px Segoe UI Emoji, ${POLICE}`; c.textAlign = 'center'; c.fillStyle = s.manque || s.cd > 0 ? '#666' : '#fff';
      c.fillText(s.a.ico, sx + 26, y0 + 20);
      c.textAlign = 'left'; c.font = `800 13px ${POLICE}`; c.fillStyle = s.manque || s.cd > 0 ? '#888' : '#fff';
      c.fillText(s.a.nom, sx + 50, y0 + 10);
      c.font = `11px ${POLICE}`; c.fillStyle = s.col; c.fillText(s.k, sx + 50, y0 + 29);
      if (s.ch !== undefined && ST.tCharges > 1) { c.textAlign = 'right'; c.fillStyle = '#ffe9a0'; c.font = `800 13px ${POLICE}`; c.fillText('×' + s.ch, sx + w - 8, y0 + 10); }
      if (s.manque && !(s.cd > 0)) { c.textAlign = 'right'; c.fillStyle = '#5aa8ff'; c.font = `11px ${POLICE}`; c.fillText(Math.round(cout) + ' ⚡', sx + w - 8, y0 + 29); }
      if (tk > 0) {
        c.globalAlpha = tk; c.textAlign = 'center';
        texteOmbre(c, s.a.ico + ' ' + s.a.nom, sx + w / 2, y0 - 34, s.col, `800 17px Segoe UI Emoji, ${POLICE}`, 4);
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
  // présentation du boss
  if (b && b.intro > 0) {
    const k = Math.min(1, (2.1 - b.intro) * 3, b.intro * 2.5);
    c.globalAlpha = k; c.textAlign = 'center';
    c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(0, H / 2 - 70, W, 140);
    if (def.mega) texteOmbre(c, '★ MÉGA BOSS ★', W / 2, H / 2 - 48, '#ffd86b', `900 16px ${POLICE}`, 4);
    texteOmbre(c, def.nom, W / 2, H / 2 - 8, def.col, `900 58px ${POLICE}`, 8);
    texteOmbre(c, def.titre, W / 2, H / 2 + 40, '#e8e2f5', `italic 600 20px ${POLICE}`, 4);
    c.globalAlpha = 1;
  }
}

function dessinerEcranMort(c) {
  const r = G.resMort;
  if (!r) return;
  c.fillStyle = 'rgba(8,0,4,.78)'; c.fillRect(0, 0, W, H);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  texteOmbre(c, 'TU ES TOMBÉ', W / 2, 200, '#ff4d6a', `900 64px ${POLICE}`, 8);
  c.font = `600 18px ${POLICE}`; c.fillStyle = '#e8e2f5';
  c.fillText(r.def.nom + ', ' + r.def.titre + ' — phase ' + r.phase + '/' + r.def.phases.length + ' — ' + Math.round(r.pct * 100) + ' % de sa vie arrachée', W / 2, 270);
  const tu = G.tueur && ATK[G.tueur] ? ATK[G.tueur] : null;
  let titre = '', conseil = '';
  if (tu) { titre = 'Tué par « ' + tu.nom + ' »'; conseil = tu.conseil; }
  else if (G.tueur === 'contact') { titre = 'Tué au contact'; conseil = 'Son corps fait mal : ne reste pas collé à lui et garde ton talent pour sortir d\'un mauvais pas.'; }
  else if (G.tueur === 'lave') { titre = 'Brûlé par la lave'; conseil = 'Les bassins ne bougent pas : repère-les avant d\'esquiver.'; }
  else if (G.tueur === 'invocation') { titre = 'Tué par ses invocations'; conseil = 'Élimine les invocations dès qu\'elles apparaissent : les armes de zone les balaient.'; }
  if (titre) {
    c.fillStyle = 'rgba(255,216,107,.08)'; c.fillRect(W / 2 - 360, 310, 720, 120);
    c.strokeStyle = '#ffd86b'; c.lineWidth = 2; c.beginPath(); c.moveTo(W / 2 - 360, 310); c.lineTo(W / 2 - 360, 430); c.stroke();
    c.font = `800 18px ${POLICE}`; c.fillStyle = '#ffd86b'; c.fillText(titre, W / 2, 334);
    c.font = `15px ${POLICE}`; c.fillStyle = '#e8e2f5';
    lignes(c, conseil, 660).forEach((l, i) => c.fillText(l, W / 2, 362 + i * 21));
  }
  const esp = ESPECES[r.def.esp];
  if (esp && esp.meca) {
    c.font = `italic 14px ${POLICE}`; c.fillStyle = '#b8b0cc';
    lignes(c, esp.nom.charAt(0).toUpperCase() + esp.nom.slice(1) + ' : ' + esp.meca, 760).forEach((l, i) => c.fillText(l, W / 2, 462 + i * 19));
  }
  const k = .6 + .4 * Math.sin(G.t * 4);
  c.globalAlpha = k;
  texteOmbre(c, 'ESPACE — recommencer (salle ' + PR().run.salle + ')', W / 2, 580, '#fff', `800 24px ${POLICE}`, 5);
  c.globalAlpha = 1;
  c.font = `14px ${POLICE}`; c.fillStyle = '#9a94ad'; c.fillText('Échap — menu', W / 2, 620);
}

// ---------- Halo lumineux (bloom) ----------
let bloomCv = null, bloomCtx = null;
function bloom() {
  const w = Math.max(1, Math.ceil(cv.width / 4)), h = Math.max(1, Math.ceil(cv.height / 4));
  if (!bloomCv) { bloomCv = document.createElement('canvas'); bloomCtx = bloomCv.getContext('2d'); }
  if (bloomCv.width !== w || bloomCv.height !== h) { bloomCv.width = w; bloomCv.height = h; }
  bloomCtx.globalCompositeOperation = 'copy';
  bloomCtx.filter = 'contrast(2.4) brightness(.9) saturate(1.3) blur(3px)';
  bloomCtx.drawImage(cv, 0, 0, w, h);
  bloomCtx.filter = 'none';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .5;
  ctx.drawImage(bloomCv, 0, 0, cv.width, cv.height);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

function rendu() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#030208'; ctx.fillRect(0, 0, cv.width, cv.height);
  if (!G.p || G.etat === 'menu') return;
  const sh = G.shake, sx = sh ? R.range(-sh, sh) * .6 : 0, sy = sh ? R.range(-sh, sh) * .6 : 0;
  const base = () => ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offX, dpr * offY);
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (offX + sx * scale), dpr * (offY + sy * scale));
  const c = ctx;
  dessinerArene(c);
  dessinerLumieres(c);
  c.save();
  c.beginPath(); c.rect(AR.x - 40, AR.y - 40, AR.w + 80, AR.h + 80); c.clip();
  for (const h of G.hz) if (h.kind === 'flaque' || h.kind === 'lave') HZ[h.kind].draw(h, c);
  if (G.boss && !G.boss.mort && G.boss.esp.dessinSol) G.boss.esp.dessinSol(c, G.boss);
  dessinerPiliers(c);
  dessinerButin(c);
  dessinerAllies(c);
  for (const m of G.minions) dessinerMinion(c, m);
  dessinerTirsJoueur(c);
  if (Arene.noir && G.p) {
    const p = G.p, g = c.createRadialGradient(p.x, p.y, 110, p.x, p.y, 300);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.93)');
    c.fillStyle = g; c.fillRect(AR.x - 40, AR.y - 40, AR.w + 80, AR.h + 80);
  }
  if (G.boss && !G.boss.mort) dessinerBoss(c, G.boss);
  c.save(); cheminArene(c); c.clip();
  for (const h of G.hz) if (h.kind !== 'flaque' && h.kind !== 'lave') HZ[h.kind].draw(h, c);
  c.restore();
  dessinerTirsEnnemis(c);
  dessinerJoueur(c);
  dessinerFx(c);
  c.restore();
  if (G.opts.lumiere) { bloom(); base(); } else base();
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
}
