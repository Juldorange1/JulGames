'use strict';
/* Colosses — silhouettes de boss : chaque forme dessine le corps entier autour de (0,0),
   déjà mis à l'échelle. f = facing (angle vers le joueur), h = teinte, ph = phase. */

function degrade(c, r, h, lum) {
  const g = c.createRadialGradient(-r * .35, -r * .4, r * .05, 0, 0, r * 1.15);
  g.addColorStop(0, hsl(h, 55, (lum || 42))); g.addColorStop(.5, hsl(h, 65, 18)); g.addColorStop(1, hsl(h, 80, 7));
  return g;
}
function contour(c, h, ph, w) { c.strokeStyle = hsl(h, 100, 66); c.lineWidth = (w || 3) + ph; c.stroke(); }
function lueur(c, col, r, x, y) { c.globalCompositeOperation = 'lighter'; c.drawImage(glow(col, r), (x || 0) - r, (y || 0) - r); c.globalCompositeOperation = 'source-over'; }
function oeilSimple(c, x, y, er, f, col) {
  c.fillStyle = '#05030a'; c.beginPath(); c.arc(x, y, er, 0, TAU); c.fill();
  lueur(c, col, er * 1.7, x, y);
  c.fillStyle = col; c.beginPath(); c.arc(x + Math.cos(f) * er * .35, y + Math.sin(f) * er * .35, er * .5, 0, TAU); c.fill();
}

const FORMES = {
  meduse(c, b, r, t, h, ph, f) {
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * .15 + i * Math.PI * .7 / 8, bx = Math.cos(a) * r * .8, by = Math.sin(a) * r * .5;
      c.strokeStyle = hsl(h, 90, 55, .55); c.lineWidth = 4 - i % 3; c.lineCap = 'round';
      c.beginPath(); c.moveTo(bx, by);
      let x = bx, y = by;
      for (let k = 1; k <= 5; k++) { x += Math.sin(t * 2.5 + i + k) * 7 + (bx * .05); y += r * .3; c.lineTo(x, y); }
      c.stroke();
    }
    c.lineCap = 'butt';
    c.beginPath(); c.ellipse(0, 0, r * 1.05, r * (.85 + .05 * Math.sin(t * 3)), 0, Math.PI, 0); c.quadraticCurveTo(0, r * .55, -r * 1.05, 0); c.closePath();
    c.fillStyle = degrade(c, r, h, 50); c.globalAlpha *= .92; c.fill(); c.globalAlpha /= .92; contour(c, h, ph, 2);
    for (let i = 0; i < 6; i++) { const a = Math.PI + .3 + i * .5; lueur(c, hsl(h, 100, 70, .8), 8, Math.cos(a) * r * .6, Math.sin(a) * r * .5); }
  },
  oeil(c, b, r, t, h, ph, f) {
    c.beginPath(); c.arc(0, 0, r * 1.08, 0, TAU); c.fillStyle = hsl(h, 50, 14); c.fill(); contour(c, h, ph, 3);
    const g = c.createRadialGradient(-r * .3, -r * .35, 2, 0, 0, r);
    g.addColorStop(0, '#fff8ee'); g.addColorStop(.7, '#e8d8d0'); g.addColorStop(1, '#a88a84');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, r * .92, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(180,30,40,.55)'; c.lineWidth = 1.5;
    for (let i = 0; i < 10; i++) { const a = i * TAU / 10 + .2; c.beginPath(); c.moveTo(Math.cos(a) * r * .9, Math.sin(a) * r * .9); c.quadraticCurveTo(Math.cos(a + .2) * r * .7, Math.sin(a + .2) * r * .7, Math.cos(a + .05) * r * .55, Math.sin(a + .05) * r * .55); c.stroke(); }
    const ix = Math.cos(f) * r * .35, iy = Math.sin(f) * r * .35, ir = r * .42;
    const gi = c.createRadialGradient(ix, iy, 2, ix, iy, ir);
    gi.addColorStop(0, hsl(h, 100, 70)); gi.addColorStop(.7, hsl(h, 90, 40)); gi.addColorStop(1, hsl(h, 80, 15));
    c.fillStyle = gi; c.beginPath(); c.arc(ix, iy, ir, 0, TAU); c.fill();
    const ouvert = b.wind > 0 || b.ouvert > 0;
    c.fillStyle = '#000'; c.beginPath(); c.ellipse(ix, iy, ir * (ouvert ? .5 : .18), ir * .7, f, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.arc(ix - ir * .35, iy - ir * .35, ir * .15, 0, TAU); c.fill();
    const cl = Math.max(0, Math.sin(t * .9) > .985 ? 1 : 0);
    if (cl) { c.fillStyle = hsl(h, 50, 14); c.beginPath(); c.arc(0, 0, r * .93, 0, TAU); c.fill(); }
  },
  araignee(c, b, r, t, h, ph, f) {
    const pas = Math.sin(t * 8) * .25;
    c.strokeStyle = hsl(h, 60, 30); c.lineWidth = 5; c.lineCap = 'round';
    for (let s = -1; s <= 1; s += 2) for (let i = 0; i < 4; i++) {
      const a = f + s * (.6 + i * .45) + (i % 2 ? pas : -pas) * s;
      const kx = Math.cos(a) * r * 1.2, ky = Math.sin(a) * r * 1.2, ex = Math.cos(a + s * .5) * r * 1.9, ey = Math.sin(a + s * .5) * r * 1.9;
      c.beginPath(); c.moveTo(Math.cos(a) * r * .4, Math.sin(a) * r * .4); c.lineTo(kx, ky); c.lineTo(ex, ey); c.stroke();
    }
    c.lineCap = 'butt';
    const ax = -Math.cos(f) * r * .75, ay = -Math.sin(f) * r * .75;
    c.beginPath(); c.ellipse(ax, ay, r * .85, r * .7, f, 0, TAU); c.fillStyle = degrade(c, r, h, 38); c.fill(); contour(c, h, ph, 2);
    c.strokeStyle = hsl(h, 100, 60, .5); c.lineWidth = 2; c.beginPath(); c.moveTo(ax - Math.cos(f) * r * .5, ay - Math.sin(f) * r * .5); c.lineTo(ax + Math.cos(f) * r * .4, ay + Math.sin(f) * r * .4); c.stroke();
    c.beginPath(); c.arc(Math.cos(f) * r * .25, Math.sin(f) * r * .25, r * .55, 0, TAU); c.fillStyle = degrade(c, r * .6, h, 45); c.fill(); contour(c, h, ph, 2);
    for (let i = 0; i < 4; i++) { const a = f + (i - 1.5) * .35; oeilSimple(c, Math.cos(f) * r * .4 + Math.cos(a) * r * .2, Math.sin(f) * r * .4 + Math.sin(a) * r * .2, r * .07, f, b.ouvert > 0 ? '#ffe14d' : hsl(h, 100, 70)); }
  },
  crabe(c, b, r, t, h, ph, f) {
    c.strokeStyle = hsl(h, 60, 28); c.lineWidth = 6; c.lineCap = 'round';
    for (let s = -1; s <= 1; s += 2) for (let i = 0; i < 3; i++) {
      const a = f + Math.PI + s * (.9 + i * .4) + Math.sin(t * 7 + i) * .12;
      c.beginPath(); c.moveTo(Math.cos(a) * r * .6, Math.sin(a) * r * .6); c.lineTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3); c.lineTo(Math.cos(a + s * .4) * r * 1.6, Math.sin(a + s * .4) * r * 1.6); c.stroke();
    }
    for (let s = -1; s <= 1; s += 2) {
      const a = f + s * .55, px = Math.cos(a) * r * 1.35, py = Math.sin(a) * r * 1.35, ou = .3 + .25 * Math.sin(t * 4 + s);
      c.beginPath(); c.moveTo(Math.cos(a) * r * .7, Math.sin(a) * r * .7); c.lineTo(px, py); c.stroke();
      c.fillStyle = degrade(c, r * .5, h, 45);
      c.beginPath(); c.arc(px, py, r * .38, f - ou, f + ou + Math.PI * 1.1, false); c.lineTo(px, py); c.fill(); contour(c, h, ph, 2);
    }
    c.lineCap = 'butt';
    c.beginPath(); c.ellipse(0, 0, r * 1.05, r * .8, f + Math.PI / 2, 0, TAU); c.fillStyle = degrade(c, r, h, 42); c.fill(); contour(c, h, ph, 3);
    for (let i = 0; i < 5; i++) { const a = f + Math.PI / 2 + (i - 2) * .35; c.fillStyle = hsl(h, 80, 60); c.beginPath(); c.arc(Math.cos(a) * r * .55, Math.sin(a) * r * .55, 3, 0, TAU); c.fill(); }
    for (let s = -1; s <= 1; s += 2) { const a = f + s * .25; oeilSimple(c, Math.cos(a) * r * .75, Math.sin(a) * r * .75, r * .1, f, b.ouvert > 0 ? '#ffe14d' : hsl(h, 100, 72)); }
  },
  cristal(c, b, r, t, h, ph) {
    const n = 7 + ph, pts = [];
    for (let i = 0; i < n; i++) { const a = i * TAU / n + t * .2, rr = r * (i % 2 ? .82 : 1.12); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
    for (let i = 0; i < n; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % n];
      c.beginPath(); c.moveTo(0, 0); c.lineTo(x1, y1); c.lineTo(x2, y2); c.closePath();
      c.fillStyle = hsl(h, 70, 18 + (i % 3) * 10 + 8 * Math.sin(t * 2 + i)); c.fill();
      c.strokeStyle = hsl(h, 100, 80, .6); c.lineWidth = 1; c.stroke();
    }
    c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); contour(c, h, ph, 3);
    for (let i = 0; i < 4; i++) { const a = -t * .8 + i * TAU / 4, rr = r * 1.55; c.save(); c.translate(Math.cos(a) * rr, Math.sin(a) * rr); c.rotate(a * 2); c.fillStyle = hsl(h, 80, 60, .8); c.beginPath(); c.moveTo(0, -9); c.lineTo(5, 0); c.lineTo(0, 9); c.lineTo(-5, 0); c.fill(); c.restore(); }
  },
  anneau(c, b, r, t, h, ph) {
    c.lineWidth = r * .42; c.strokeStyle = hsl(h, 60, 22);
    c.beginPath(); c.arc(0, 0, r * .8, 0, TAU); c.stroke();
    const g = c.createLinearGradient(-r, -r, r, r); g.addColorStop(0, hsl(h, 70, 55, .55)); g.addColorStop(1, hsl(h, 70, 10, 0));
    c.strokeStyle = g; c.lineWidth = r * .22; c.beginPath(); c.arc(0, 0, r * .86, Math.PI * 1.1, Math.PI * 1.7); c.stroke();
    c.strokeStyle = hsl(h, 100, 66); c.lineWidth = 2 + ph;
    c.beginPath(); c.arc(0, 0, r * 1.01, 0, TAU); c.stroke(); c.beginPath(); c.arc(0, 0, r * .59, 0, TAU); c.stroke();
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12 + t * .3; c.lineWidth = i % 3 ? 2 : 4; c.beginPath(); c.moveTo(Math.cos(a) * r * .66, Math.sin(a) * r * .66); c.lineTo(Math.cos(a) * r * (i % 3 ? .8 : .92), Math.sin(a) * r * (i % 3 ? .8 : .92)); c.stroke(); }
    const pulse = .3 + .1 * Math.sin(t * 5);
    c.fillStyle = degrade(c, r * pulse * 1.3, h, 60); c.beginPath(); c.arc(0, 0, r * pulse, 0, TAU); c.fill();
  },
  insecte(c, b, r, t, h, ph, f) {
    const bat = Math.abs(Math.sin(t * 22));
    c.save(); c.rotate(f + Math.PI / 2);
    for (const s of [-1, 1]) for (const k of [0, 1]) {
      c.save(); c.scale(s, 1); c.rotate(-.5 + k * .55);
      c.fillStyle = hsl(h, 80, 80, .22 + .1 * bat); c.strokeStyle = hsl(h, 100, 80, .5); c.lineWidth = 1;
      c.beginPath(); c.ellipse(r * .9, 0, r * (.95 - k * .2) * (.6 + .4 * bat), r * .32, 0, 0, TAU); c.fill(); c.stroke();
      c.restore();
    }
    const seg = [[0, r * .75, r * .62, r * .8], [0, 0, r * .48, r * .45], [0, -r * .62, r * .36, r * .34]];
    for (const [x, y, rx, ry] of seg) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fillStyle = degrade(c, r * .7, h, 42); c.fill(); contour(c, h, ph, 2); }
    c.strokeStyle = hsl(h, 100, 60, .45); c.lineWidth = 2; for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(0, r * .75, r * .62, r * .8 - i * r * .18, 0, Math.PI * .15, Math.PI * .85); c.stroke(); }
    c.restore();
    for (const s of [-1, 1]) { const a = f + s * .45; oeilSimple(c, Math.cos(a) * r * .66, Math.sin(a) * r * .66, r * .13, f, b.ouvert > 0 ? '#ffe14d' : hsl(h, 100, 70)); }
  },
  crane(c, b, r, t, h, ph, f) {
    c.save(); c.rotate(f - Math.PI / 2);
    c.beginPath(); c.arc(0, -r * .15, r * .95, Math.PI * .85, Math.PI * .15); c.lineTo(r * .45, r * .85); c.lineTo(-r * .45, r * .85); c.closePath();
    const g = c.createRadialGradient(-r * .3, -r * .5, 2, 0, 0, r * 1.2); g.addColorStop(0, '#efe6d8'); g.addColorStop(.6, '#9c8f80'); g.addColorStop(1, '#3a3028');
    c.fillStyle = g; c.fill(); contour(c, h, ph, 2);
    c.fillStyle = '#0a0608'; c.beginPath(); c.moveTo(0, r * .3); c.lineTo(-r * .12, r * .48); c.lineTo(r * .12, r * .48); c.fill();
    c.fillStyle = '#e8dfd2'; for (let i = -3; i <= 3; i++) c.fillRect(i * r * .12 - r * .05, r * .68, r * .09, r * .16);
    c.strokeStyle = 'rgba(40,20,20,.6)'; c.lineWidth = 2; c.beginPath(); c.moveTo(r * .2, -r * .9); c.lineTo(r * .3, -r * .55); c.lineTo(r * .18, -r * .4); c.stroke();
    for (const s of [-1, 1]) {
      c.fillStyle = '#0a0608'; c.beginPath(); c.ellipse(s * r * .36, r * .02, r * .24, r * .2, 0, 0, TAU); c.fill();
      lueur(c, b.ouvert > 0 ? 'rgba(255,225,77,.9)' : hsl(h, 100, 60, .9), r * .2, s * r * .36, r * .04);
    }
    c.restore();
  },
  astre(c, b, r, t, h, ph) {
    for (let i = 0; i < 18; i++) {
      const a = i * TAU / 18 + t * .2, l = r * (1.25 + .25 * Math.sin(t * 4 + i * 1.7) + .1 * ph);
      c.fillStyle = hsl(h + (i % 2) * 15, 100, 55, .55);
      c.beginPath(); c.moveTo(Math.cos(a - .12) * r * .9, Math.sin(a - .12) * r * .9); c.quadraticCurveTo(Math.cos(a) * l * 1.05, Math.sin(a) * l * 1.05, Math.cos(a + .12) * r * .9, Math.sin(a + .12) * r * .9); c.fill();
    }
    const g = c.createRadialGradient(0, 0, 2, 0, 0, r);
    g.addColorStop(0, '#fffbe8'); g.addColorStop(.35, hsl(h, 100, 65)); g.addColorStop(1, hsl(h, 90, 30));
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
    c.fillStyle = hsl(h, 90, 25, .4);
    for (let i = 0; i < 6; i++) { const a = i * 1.9 + t * .15, d = r * (.35 + .3 * ((i * 7) % 5) / 5); c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d, r * .1, 0, TAU); c.fill(); }
  },
  golem(c, b, r, t, h, ph) {
    const blocs = b.s.blocs || (b.s.blocs = Array.from({ length: 7 }, (_, i) => ({ a: i * TAU / 7 + (i % 2) * .3, d: i ? .62 : 0, s: i ? .5 + ((i * 37) % 10) / 40 : .7, rot: i * 1.3 })));
    lueur(c, b.ouvert > 0 ? 'rgba(255,200,80,.9)' : hsl(h, 100, 55, .8), r * .9);
    for (const k of blocs) {
      const x = Math.cos(k.a + Math.sin(t + k.rot) * .05) * r * k.d, y = Math.sin(k.a) * r * k.d, s = r * k.s;
      c.save(); c.translate(x, y); c.rotate(k.rot + Math.sin(t * .7 + k.rot) * .08);
      c.beginPath(); for (let i = 0; i < 5; i++) { const a = i * TAU / 5, rr = s * (i % 2 ? .9 : 1.05); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath();
      c.fillStyle = degrade(c, s, h, 30); c.fill(); c.strokeStyle = hsl(h, 30, 45); c.lineWidth = 2; c.stroke();
      c.strokeStyle = hsl(h, 100, 60, .5); c.lineWidth = 1.5; c.beginPath(); c.moveTo(-s * .4, -s * .2); c.lineTo(0, s * .1); c.lineTo(s * .3, -s * .3); c.stroke();
      c.restore();
    }
  },
  oiseau(c, b, r, t, h, ph, f) {
    const bat = Math.sin(t * 6);
    c.save(); c.rotate(f + Math.PI / 2);
    for (const s of [-1, 1]) {
      c.save(); c.rotate(bat * .25 * s);
      for (let i = 0; i < 6; i++) {
        c.fillStyle = hsl(h + i * 4, 100, 50 + i * 4, .85);
        c.beginPath(); c.moveTo(s * r * .2, -r * .1); c.quadraticCurveTo(s * r * (1.2 + i * .12), -r * (.9 - i * .15), s * r * (1.5 + i * .1), r * (-.3 + i * .18)); c.lineTo(s * r * .3, r * .2); c.closePath(); c.fill();
      }
      c.restore();
    }
    for (let i = -2; i <= 2; i++) { c.fillStyle = hsl(h + 10, 100, 55, .7); c.beginPath(); c.moveTo(0, r * .4); c.quadraticCurveTo(i * r * .3, r * 1.3, i * r * .45 + Math.sin(t * 5 + i) * 5, r * 1.7); c.lineTo(i * r * .2, r * .5); c.fill(); }
    c.beginPath(); c.ellipse(0, 0, r * .45, r * .75, 0, 0, TAU); c.fillStyle = degrade(c, r * .7, h, 55); c.fill(); contour(c, h, ph, 2);
    c.beginPath(); c.arc(0, -r * .7, r * .32, 0, TAU); c.fill(); contour(c, h, ph, 2);
    c.fillStyle = '#ffd86b'; c.beginPath(); c.moveTo(-r * .08, -r * .95); c.lineTo(0, -r * 1.2); c.lineTo(r * .08, -r * .95); c.fill();
    c.restore();
    for (const s of [-1, 1]) { const a = f + s * .35; oeilSimple(c, Math.cos(a) * r * .72, Math.sin(a) * r * .72, r * .07, f, '#fff'); }
  },
  fantome(c, b, r, t, h, ph, f) {
    const dir = f + Math.PI;
    c.save(); c.rotate(dir - Math.PI / 2);
    c.beginPath(); c.arc(0, -r * .1, r * .85, Math.PI, 0);
    for (let i = 0; i <= 8; i++) { const x = r * .85 - i * r * 1.7 / 8, y = r * (.7 + .35 * Math.sin(t * 6 + i * 1.2)) + (i % 2 ? r * .25 : 0); c.lineTo(x, y); }
    c.closePath();
    const g = c.createLinearGradient(0, -r, 0, r * 1.2); g.addColorStop(0, hsl(h, 60, 70, .9)); g.addColorStop(1, hsl(h, 80, 20, 0));
    c.fillStyle = g; c.fill();
    c.restore();
    for (const s of [-1, 1]) { const a = f + s * .4; c.fillStyle = '#05030a'; c.beginPath(); c.ellipse(Math.cos(a) * r * .38, Math.sin(a) * r * .38, r * .14, r * .2, f, 0, TAU); c.fill(); lueur(c, hsl(h, 100, 75, .9), r * .16, Math.cos(a) * r * .38, Math.sin(a) * r * .38); }
  },
  nautile(c, b, r, t, h, ph) {
    c.save(); c.rotate(t * .4);
    for (let k = 0; k < 3; k++) {
      c.strokeStyle = hsl(h + k * 20, 100, 60, .5 - k * .12); c.lineWidth = r * (.28 - k * .07);
      c.beginPath();
      for (let i = 0; i <= 60; i++) { const a = i * .18 + k * 2.1, rr = r * .12 * Math.exp(i * .03); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      c.stroke();
    }
    c.restore();
    const g = c.createRadialGradient(0, 0, 1, 0, 0, r * .55); g.addColorStop(0, '#fff'); g.addColorStop(.4, hsl(h, 100, 70)); g.addColorStop(1, hsl(h, 100, 40, 0));
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, r * .55, 0, TAU); c.fill();
    for (let i = 0; i < 30; i++) { const a = i * 2.4 + t * (.3 + (i % 3) * .1), d = r * (.3 + (i * 13 % 10) / 10 * .9); c.fillStyle = `rgba(255,255,255,${.3 + .4 * ((i * 7) % 3) / 3})`; c.fillRect(Math.cos(a) * d, Math.sin(a) * d, 2, 2); }
  }
};
const FORMES_CHIMERE = ['poly', 'etoile', 'blob', 'meduse', 'crabe', 'cristal', 'astre', 'golem', 'insecte', 'oeil', 'nautile', 'araignee'];

// ---------- Armement : chaque boss porte les armes de ses attaques (créature ou machine de guerre) ----------
// balles → canons (machine) ou tubes à venin (créature) ; rayon → lentille frontale ; corps → cornes / lames ;
// zone et terrain → bras et poings ; invocations → poches de ponte ; et toujours des mâchoires ou un blindage.
const STYLES_MACHINE = { cristal: 1, anneau: 1, astre: 1, golem: 1, oeil: 1, poly: 1 };
function armesBoss(b) {
  if (b.def.armesC) return b.def.armesC;
  const cats = {};
  for (const ph of b.def.phases) for (const a of ph.cycle) { const c = ATK[a.id] && ATK[a.id].cat; if (c) cats[c] = (cats[c] || 0) + 1; }
  return (b.def.armesC = cats);
}
function armement(c, b, r, t, h, ph, couche) {
  if (b.esp && b.esp.id === 'serpent') return;
  const st = b.def.look.style, cats = Object.assign({}, armesBoss(b)), mach = !!STYLES_MACHINE[st], f = b.facing;
  if (st === 'mante') delete cats.corps; // ses faux sont déjà ses armes de corps
  const cur = b.main && ATK[b.main.id] ? ATK[b.main.id].cat : null, prep = b.wind > 0 ? 1 - b.wind / (b.windMax || 1) : 0;
  const metal = l => hsl(h, 14, l), chair = l => hsl(h, 40, l), vif = a => hsl(h, 100, 64, a);
  c.save(); c.rotate(f);
  if (couche === 'dessous') {
    // bras et poings (zone / terrain) : ils se lèvent pendant l'annonce puis frappent
    if (cats.zone || cats.terrain) {
      const leve = (cur === 'zone' || cur === 'terrain') ? prep : 0;
      for (const s of [-1, 1]) {
        const fx = r * (.75 + .45 * leve), fy = s * r * (1.4 - .3 * leve + .05 * Math.sin(t * 2.5 + s));
        c.lineCap = 'round';
        c.strokeStyle = mach ? metal(14) : chair(12); c.lineWidth = r * .3;
        c.beginPath(); c.moveTo(-r * .1, s * r * .5); c.quadraticCurveTo(r * .1, s * r * 1.35, fx, fy); c.stroke();
        c.strokeStyle = mach ? metal(34) : chair(26); c.lineWidth = r * .13; c.stroke();
        c.lineCap = 'butt';
        c.save(); c.translate(fx, fy);
        if (mach) {
          // pince d'acier
          c.fillStyle = metal(26); c.strokeStyle = vif(.9); c.lineWidth = 2;
          c.beginPath(); c.arc(0, 0, r * .27, 0, TAU); c.fill(); c.stroke();
          for (const q of [-1, 1]) { c.fillStyle = metal(55); c.beginPath(); c.moveTo(r * .1, q * r * .12); c.quadraticCurveTo(r * .55, q * r * .3, r * .62, q * r * .04); c.lineTo(r * .3, q * r * .08); c.closePath(); c.fill(); c.strokeStyle = metal(12); c.lineWidth = 1.5; c.stroke(); }
          lueur(c, vif(.5 + .4 * leve), r * .16);
        } else {
          // main griffue
          c.fillStyle = chair(20); c.beginPath(); c.ellipse(0, 0, r * .26, r * .22, 0, 0, TAU); c.fill();
          for (let k = -1; k <= 1; k++) { const a = k * .5; c.fillStyle = '#efe6d6'; c.strokeStyle = '#4a3a2c'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(Math.cos(a) * r * .18, Math.sin(a) * r * .18 - r * .06); c.quadraticCurveTo(Math.cos(a) * r * .5, Math.sin(a) * r * .5, Math.cos(a + .25) * r * .62, Math.sin(a + .25) * r * .62); c.lineTo(Math.cos(a) * r * .2, Math.sin(a) * r * .2 + r * .06); c.closePath(); c.fill(); c.stroke(); }
        }
        c.restore();
      }
    }
    // poches de ponte (invocations)
    if (cats.invoc) for (let k = -1; k <= 1; k++) {
      const x = -r * .92, y = k * r * .42, pu = .5 + .5 * Math.sin(t * 4 + k * 2);
      c.fillStyle = mach ? metal(18) : chair(16); c.strokeStyle = vif(.7); c.lineWidth = 2;
      c.beginPath(); c.ellipse(x, y, r * .26, r * .19, 0, 0, TAU); c.fill(); c.stroke();
      lueur(c, vif(.3 + .5 * pu), r * .26, x, y);
    }
  } else {
    // canons (machines) ou tubes à venin (créatures) : ce qui tire les balles
    if (cats.balles) for (const s of [-1, 1]) {
      const y = s * r * .55, x0 = r * .45, rec = cur === 'balles' ? .06 * Math.max(0, Math.sin(t * 30)) : 0, x1 = r * (1.6 - rec), w = r * .26;
      const g = c.createLinearGradient(0, y - w / 2, 0, y + w / 2);
      g.addColorStop(0, mach ? metal(62) : chair(36)); g.addColorStop(.45, mach ? metal(30) : chair(20)); g.addColorStop(1, mach ? metal(10) : chair(8));
      c.fillStyle = g; c.strokeStyle = mach ? metal(8) : chair(6); c.lineWidth = 1.5;
      c.beginPath();
      if (mach) c.rect(x0, y - w / 2, x1 - x0, w);
      else { c.moveTo(x0, y - w * .6); c.quadraticCurveTo((x0 + x1) / 2, y - w * .25, x1, y - w * .45); c.lineTo(x1, y + w * .45); c.quadraticCurveTo((x0 + x1) / 2, y + w * .25, x0, y + w * .6); c.closePath(); }
      c.fill(); c.stroke();
      c.fillStyle = vif(.85);
      if (mach) for (const xb of [.62, 1.05, 1.45]) c.fillRect(r * xb - rec * r, y - w / 2, r * .06, w);
      c.fillStyle = mach ? metal(36) : chair(24); c.beginPath(); c.arc(x0, y, w * .62, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#05030a'; c.beginPath(); c.ellipse(x1, y, r * .06, w * .36, 0, 0, TAU); c.fill();
      if (cur === 'balles' || (prep > .4 && cur === 'balles')) lueur(c, vif(.9), r * .3, x1 + r * .05, y);
    }
    // cornes ou lames frontales (attaques de corps)
    if (cats.corps) for (const s of [-1, 1]) {
      const k = cur === 'corps' ? .12 : 0;
      const g = c.createLinearGradient(r * .5, 0, r * 1.8, 0); g.addColorStop(0, mach ? metal(40) : '#bfae90'); g.addColorStop(1, mach ? metal(85) : '#fff6e6');
      c.fillStyle = g; c.strokeStyle = mach ? vif(.9) : '#5a4a36'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(r * .55, s * r * .16); c.quadraticCurveTo(r * (1.3 + k), s * r * .75, r * (1.8 + k), s * r * .3);
      c.quadraticCurveTo(r * 1.2, s * r * .42, r * .5, s * r * .52); c.closePath(); c.fill(); c.stroke();
    }
    // lentille frontale (rayons) : elle se charge pendant l'annonce
    if (cats.rayon) {
      const x = r * .9, ch = cur === 'rayon' ? .45 + .55 * prep : .3;
      c.fillStyle = mach ? metal(16) : chair(12); c.strokeStyle = mach ? metal(60) : chair(40); c.lineWidth = r * .07;
      c.beginPath(); c.arc(x, 0, r * .3, 0, TAU); c.fill(); c.stroke();
      c.strokeStyle = vif(.9); c.lineWidth = 2; c.beginPath(); c.arc(x, 0, r * .3, 0, TAU); c.stroke();
      lueur(c, hsl(h, 100, 78, ch), r * (.35 + .4 * ch), x, 0);
      c.fillStyle = cur === 'rayon' && prep > .7 && (t * 20 | 0) % 2 ? '#fff' : hsl(h, 100, 85); c.beginPath(); c.arc(x, 0, r * .13, 0, TAU); c.fill();
    }
    // mâchoires (créatures) ou rivets lumineux (machines)
    if (!mach && st !== 'oiseau' && st !== 'crane' && st !== 'mante') {
      const ouv = .2 + .16 * Math.max(0, Math.sin(t * 5)) + (b.wind > 0 ? .22 : 0);
      for (const s of [-1, 1]) {
        c.fillStyle = '#efe6d6'; c.strokeStyle = '#3a2a20'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(r * .72, s * r * .14); c.quadraticCurveTo(r * 1.15, s * r * (.14 + ouv), r * 1.35, s * r * .04); c.lineTo(r * 1.0, s * r * .12); c.closePath(); c.fill(); c.stroke();
      }
    } else if (mach) {
      c.fillStyle = vif(.9);
      for (let i = 0; i < 6; i++) { const a = Math.PI * .3 + i * Math.PI * 1.4 / 5, rr = r * .86; c.beginPath(); c.arc(Math.cos(a) * rr, Math.sin(a) * rr, Math.max(1.5, r * .04), 0, TAU); c.fill(); }
    }
  }
  c.restore();
}
// la Chimère prend une silhouette qui va avec ses attaques
function formePourAttaques(cats, r) {
  const best = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];
  const choix = { balles: ['golem', 'insecte', 'crabe'], rayon: ['oeil', 'cristal', 'astre'], corps: ['crane', 'crabe', 'golem'], zone: ['golem', 'crabe', 'araignee'], terrain: ['golem', 'crabe'], invoc: ['insecte', 'araignee'] };
  return r.pick(choix[best ? best[0] : 'balles'] || ['golem']);
}
