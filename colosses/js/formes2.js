'use strict';
/* Colosses — cinq silhouettes de plus (scorpion, chevalier, kraken, dragon, colosse de pierre) et variantes :
   chaque espèce peut prendre une autre apparence cohérente, tirée pour chaque boss. */

function segmentsCourbes(c, pts, w0, w1, col) {
  for (let i = 0; i < pts.length - 1; i++) { const k = i / (pts.length - 1); c.strokeStyle = col; c.lineWidth = w0 + (w1 - w0) * k; c.lineCap = 'round'; c.beginPath(); c.moveTo(pts[i][0], pts[i][1]); c.lineTo(pts[i + 1][0], pts[i + 1][1]); c.stroke(); }
  c.lineCap = 'butt';
}
Object.assign(FORMES, {
  // scorpion : pinces devant, queue recourbée qui se dresse au-dessus du corps
  scorpion(c, b, r, t, h, ph) {
    c.save(); c.rotate(b.facing);
    // pattes
    c.strokeStyle = hsl(h, 40, 18); c.lineWidth = r * .07; c.lineCap = 'round';
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { const x0 = r * (.25 - k * .22), m = Math.sin(t * 8 + k * 1.3 + s) * r * .06; c.beginPath(); c.moveTo(x0, s * r * .25); c.lineTo(x0 + r * .05 + m, s * r * .7); c.lineTo(x0 - r * .1, s * r * .98); c.stroke(); }
    // queue : segments qui remontent en arc au-dessus du dos, dard au bout
    const dard = b.wind > 0 ? 1 - b.wind / (b.windMax || 1) : .3 + .1 * Math.sin(t * 2);
    const q = []; for (let i = 0; i <= 6; i++) { const a = Math.PI + (i / 6) * (Math.PI * (.9 + .25 * dard)); q.push([-r * .45 + Math.cos(a) * r * .75 + r * .55, Math.sin(a) * r * .55 * (1 - i / 9)]); }
    for (let i = 0; i < q.length; i++) { const rr = r * (.2 - i * .018); c.fillStyle = degrade(c, rr, h, 40); c.beginPath(); c.arc(q[i][0], q[i][1], rr, 0, TAU); c.fill(); c.strokeStyle = hsl(h, 60, 30); c.lineWidth = 1.5; c.stroke(); }
    const fin = q[q.length - 1]; c.fillStyle = '#f0e6d2'; c.beginPath(); c.moveTo(fin[0], fin[1] - r * .1); c.lineTo(fin[0] + r * .32, fin[1] + r * .02); c.lineTo(fin[0], fin[1] + r * .12); c.closePath(); c.fill();
    lueur(c, hsl(h, 100, 60, .6 + .4 * dard), r * .18, fin[0] + r * .2, fin[1]);
    // corps segmenté
    for (let i = 3; i >= 0; i--) { const x = -r * .1 - i * r * .22, rr = r * (.42 - i * .04); c.fillStyle = degrade(c, rr, h, 34); c.beginPath(); c.ellipse(x, 0, rr * .7, rr, 0, 0, TAU); c.fill(); c.strokeStyle = hsl(h, 70, 40); c.lineWidth = 2; c.stroke(); }
    c.fillStyle = degrade(c, r * .4, h, 40); c.beginPath(); c.ellipse(r * .25, 0, r * .35, r * .3, 0, 0, TAU); c.fill(); contour(c, h, ph, 2);
    // pinces
    for (const s of [-1, 1]) {
      c.strokeStyle = hsl(h, 50, 24); c.lineWidth = r * .14; c.lineCap = 'round'; c.beginPath(); c.moveTo(r * .4, s * r * .2); c.lineTo(r * .75, s * r * .5); c.lineTo(r * 1.05, s * r * .42); c.stroke(); c.lineCap = 'butt';
      const ouv = .25 + .15 * Math.sin(t * 4 + s);
      c.fillStyle = degrade(c, r * .3, h, 46);
      c.beginPath(); c.moveTo(r * 1.0, s * r * .42); c.quadraticCurveTo(r * 1.35, s * r * (.42 + ouv), r * 1.45, s * r * .3); c.quadraticCurveTo(r * 1.25, s * r * .38, r * 1.05, s * r * .36); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(r * 1.0, s * r * .42); c.quadraticCurveTo(r * 1.35, s * r * (.42 - ouv * .3), r * 1.42, s * r * .5); c.quadraticCurveTo(r * 1.2, s * r * .5, r * 1.02, s * r * .48); c.closePath(); c.fill();
    }
    for (const s of [-1, 1]) oeilSimple(c, r * .42, s * r * .1, r * .06, 0, hsl(h, 100, 70));
    c.restore();
  },
  // chevalier : armure vue de dessus, épaulières, heaume à fente lumineuse, grande lame
  chevalier(c, b, r, t, h, ph) {
    c.save(); c.rotate(b.facing);
    // cape déchirée derrière
    c.fillStyle = hsl(h, 50, 14); c.beginPath(); c.moveTo(-r * .2, -r * .7);
    for (let i = 0; i <= 8; i++) { const y = -r * .7 + i * r * 1.4 / 8; c.lineTo(-r * (1.05 + .12 * Math.sin(t * 3 + i * 1.7) + (i % 2) * .12), y); }
    c.lineTo(-r * .2, r * .7); c.closePath(); c.fill();
    // grande lame
    const lev = b.wind > 0 ? 1 - b.wind / (b.windMax || 1) : 0;
    c.save(); c.rotate(-.6 + lev * .9);
    c.fillStyle = '#d9dde6'; c.beginPath(); c.moveTo(r * .2, r * .62); c.lineTo(r * 1.75, r * .55); c.lineTo(r * 1.95, r * .62); c.lineTo(r * 1.75, r * .7); c.lineTo(r * .2, r * .7); c.closePath(); c.fill();
    c.strokeStyle = hsl(h, 100, 70, .8); c.lineWidth = 1.5; c.beginPath(); c.moveTo(r * .3, r * .66); c.lineTo(r * 1.8, r * .62); c.stroke();
    c.fillStyle = '#6a5230'; c.fillRect(r * .05, r * .52, r * .2, r * .28);
    c.restore();
    // corps et plaques
    c.fillStyle = degrade(c, r * .8, h, 32); c.beginPath(); c.ellipse(0, 0, r * .55, r * .72, 0, 0, TAU); c.fill(); contour(c, h, ph, 2);
    for (const s of [-1, 1]) { c.fillStyle = degrade(c, r * .4, 215, 60); c.beginPath(); c.ellipse(-r * .05, s * r * .62, r * .4, r * .3, 0, 0, TAU); c.fill(); c.strokeStyle = '#1a1c22'; c.lineWidth = 2; c.stroke();
      c.fillStyle = 'rgba(255,255,255,.25)'; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(-r * .3 + k * r * .22, s * r * .62, r * .035, 0, TAU); c.fill(); } }
    // heaume
    c.fillStyle = degrade(c, r * .3, 215, 64); c.beginPath(); c.arc(r * .12, 0, r * .3, 0, TAU); c.fill(); c.strokeStyle = '#1a1c22'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#05050a'; c.fillRect(r * .28, -r * .17, r * .07, r * .34);
    lueur(c, hsl(h, 100, 65, .9), r * .16, r * .32, 0);
    c.fillStyle = hsl(h, 100, 70); c.fillRect(r * .29, -r * .14, r * .05, r * .28);
    c.restore();
  },
  // kraken : tentacules ondulants autour d'un manteau à gros yeux
  kraken(c, b, r, t, h, ph) {
    c.save(); c.rotate(b.facing);
    for (let i = 0; i < 8; i++) {
      const a0 = i * TAU / 8 + .2, pts = [];
      for (let k = 0; k <= 7; k++) { const d = r * (.4 + k * .2), a = a0 + Math.sin(t * 2.2 + i * 1.3 + k * .6) * .35 * (k / 7); pts.push([Math.cos(a) * d, Math.sin(a) * d]); }
      segmentsCourbes(c, pts, r * .2, r * .04, hsl(h, 50, 26));
      for (let k = 2; k < 7; k++) { c.fillStyle = hsl(h, 40, 60, .7); c.beginPath(); c.arc(pts[k][0], pts[k][1], r * .025, 0, TAU); c.fill(); }
    }
    c.fillStyle = degrade(c, r * .7, h, 40); c.beginPath(); c.ellipse(-r * .1, 0, r * .62, r * .5, 0, 0, TAU); c.fill(); contour(c, h, ph, 2);
    c.strokeStyle = hsl(h, 60, 22, .7); c.lineWidth = 2; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(-r * .55, 0, r * (.2 + k * .1), -.9, .9); c.stroke(); }
    for (const s of [-1, 1]) { c.fillStyle = '#f2e8d0'; c.beginPath(); c.ellipse(r * .25, s * r * .22, r * .14, r * .11, 0, 0, TAU); c.fill(); oeilSimple(c, r * .28, s * r * .22, r * .07, 0, hsl(h, 100, 60)); }
    c.restore();
  },
  // dragon : ailes membraneuses, cou et tête cornue, queue
  dragon(c, b, r, t, h, ph) {
    c.save(); c.rotate(b.facing);
    const bat = Math.sin(t * 3) * .18;
    for (const s of [-1, 1]) {
      c.save(); c.scale(1, s); c.rotate(-bat);
      c.fillStyle = hsl(h, 45, 16, .95); c.beginPath(); c.moveTo(0, r * .2);
      c.lineTo(-r * .2, r * 1.6); c.quadraticCurveTo(-r * .45, r * 1.2, -r * .6, r * 1.35); c.quadraticCurveTo(-r * .75, r * .95, -r * .95, r * 1.05); c.quadraticCurveTo(-r * .85, r * .6, -r * .55, r * .3); c.closePath(); c.fill();
      c.strokeStyle = hsl(h, 70, 40); c.lineWidth = r * .05; c.beginPath(); c.moveTo(0, r * .2); c.lineTo(-r * .2, r * 1.6); c.moveTo(-r * .05, r * .3); c.lineTo(-r * .6, r * 1.35); c.moveTo(-r * .1, r * .3); c.lineTo(-r * .95, r * 1.05); c.stroke();
      c.restore();
    }
    // queue
    const q = []; for (let i = 0; i <= 6; i++) q.push([-r * (.4 + i * .22), Math.sin(t * 2 + i * .8) * r * .12 * i / 6]);
    segmentsCourbes(c, q, r * .3, r * .06, hsl(h, 50, 24));
    // corps
    c.fillStyle = degrade(c, r * .6, h, 38); c.beginPath(); c.ellipse(-r * .05, 0, r * .55, r * .4, 0, 0, TAU); c.fill(); contour(c, h, ph, 2);
    c.fillStyle = hsl(h, 60, 55, .5); for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-r * .45 + i * r * .18, -r * .05); c.lineTo(-r * .38 + i * r * .18, -r * .2); c.lineTo(-r * .31 + i * r * .18, -r * .05); c.fill(); }
    // cou et tête
    segmentsCourbes(c, [[r * .35, 0], [r * .6, Math.sin(t * 2.5) * r * .06], [r * .82, 0]], r * .24, r * .2, hsl(h, 50, 30));
    c.fillStyle = degrade(c, r * .3, h, 44); c.beginPath(); c.moveTo(r * 1.25, 0); c.lineTo(r * .85, -r * .2); c.lineTo(r * .75, 0); c.lineTo(r * .85, r * .2); c.closePath(); c.fill(); contour(c, h, ph, 1.5);
    for (const s of [-1, 1]) { c.fillStyle = '#e9dfc8'; c.beginPath(); c.moveTo(r * .85, s * r * .14); c.lineTo(r * .62, s * r * .38); c.lineTo(r * .8, s * r * .2); c.fill(); oeilSimple(c, r * .98, s * r * .09, r * .045, 0, b.wind > 0 ? '#fff' : hsl(h + 30, 100, 65)); }
    if (b.wind > 0) lueur(c, hsl(h + 20, 100, 60, .7), r * .3, r * 1.25, 0);
    c.restore();
  },
  // colosse de pierre : épaules massives, roches flottantes, cœur de magma
  colosse(c, b, r, t, h, ph) {
    c.save(); c.rotate(b.facing);
    for (let i = 0; i < 5; i++) { const a = t * .5 + i * TAU / 5, d = r * 1.35; c.fillStyle = degrade(c, r * .14, 30, 28); c.beginPath(); for (let k = 0; k < 5; k++) { const aa = k * TAU / 5 + i, rr = r * (.12 + .04 * (k % 2)); c.lineTo(Math.cos(a) * d + Math.cos(aa) * rr, Math.sin(a) * d * .8 + Math.sin(aa) * rr); } c.closePath(); c.fill(); }
    for (const s of [-1, 1]) {
      c.fillStyle = degrade(c, r * .45, 30, 32); c.beginPath(); for (let k = 0; k < 7; k++) { const a = k * TAU / 7, rr = r * (.42 + .06 * ((k * 3) % 2)); c.lineTo(-r * .05 + Math.cos(a) * rr, s * r * .7 + Math.sin(a) * rr * .85); } c.closePath(); c.fill(); c.strokeStyle = '#120e0a'; c.lineWidth = 2; c.stroke();
      c.strokeStyle = hsl(h, 100, 55, .7); c.lineWidth = 2; c.beginPath(); c.moveTo(-r * .3, s * r * .6); c.lineTo(-r * .05, s * r * .75); c.lineTo(r * .15, s * r * .62); c.stroke();
    }
    c.fillStyle = degrade(c, r * .7, 30, 30); c.beginPath(); for (let k = 0; k < 8; k++) { const a = k * TAU / 8, rr = r * (.62 + .07 * (k % 2)); c.lineTo(Math.cos(a) * rr * .9, Math.sin(a) * rr * .75); } c.closePath(); c.fill(); c.strokeStyle = '#120e0a'; c.lineWidth = 2.5; c.stroke();
    // fissures de magma
    c.strokeStyle = hsl(h, 100, 58); c.lineWidth = 2.5; c.lineCap = 'round';
    for (let k = 0; k < 5; k++) { const a = k * TAU / 5 + .4; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * r * .3, Math.sin(a) * r * .25); c.lineTo(Math.cos(a + .3) * r * .5, Math.sin(a + .3) * r * .45); c.stroke(); }
    c.lineCap = 'butt';
    lueur(c, b.ouvert > 0 ? 'rgba(255,220,90,.9)' : hsl(h, 100, 55, .7), r * .45);
    c.fillStyle = degrade(c, r * .22, 30, 40); c.beginPath(); c.arc(r * .35, 0, r * .2, 0, TAU); c.fill(); c.strokeStyle = '#120e0a'; c.lineWidth = 2; c.stroke();
    for (const s of [-1, 1]) oeilSimple(c, r * .42, s * r * .07, r * .045, 0, hsl(h, 100, 65));
    c.restore();
  }
});
Object.assign(STYLES_MACHINE, { chevalier: 1, colosse: 1 });
// variantes d'apparence par espèce (cohérentes avec ce qu'elle fait)
const VARIANTES = {
  bourreau: ['chevalier'], sentinelle: ['chevalier', 'colosse'], forgeron: ['colosse'], hydre: ['kraken', 'dragon'], tisseuse: ['scorpion'],
  reine: ['scorpion'], nebuleuse: ['kraken'], phenix: ['dragon'], horloger: ['colosse'], mante: ['scorpion'], titan: ['colosse'], juge: ['chevalier'], metronome: ['colosse']
};
