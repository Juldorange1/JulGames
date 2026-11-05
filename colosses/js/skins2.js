'use strict';
/* Colosses — effets des apparences bien plus visibles : la traînée devient un vrai ruban lumineux avec plus de
   particules, l'aura pulse et a des éclats qui tournent, la visière brille, l'armure a un liseré de sa couleur.
   Tout est dessiné sous le héros (sauf de petits éclats) : le point rouge de la zone de coup reste bien visible. */

const RubanSkin = { pts: [] };
function couleurSkin(s) { return s && (s.col || (s.c && s.c[0])) || null; }
const _joueurSkins = dessinerJoueur;
dessinerJoueur = function (c) {
  const p = G.p;
  if (!p || p.hp <= 0 || typeof equipe !== 'function') return _joueurSkins(c);
  const au = equipe('aura'), tr = equipe('trainee'), vi = equipe('visiere'), ar = equipe('armure');
  const t = G.t, v = Math.hypot(p.vx, p.vy);
  // --- dessous du héros ---
  c.save(); c.globalCompositeOperation = 'lighter';
  // ruban de traînée
  const tc = tr && tr.col;
  if (tc) {
    RubanSkin.pts.push({ x: p.x, y: p.y, t });
    RubanSkin.pts = RubanSkin.pts.filter(q => t - q.t < (tr.gros ? .55 : .4));
    const L = RubanSkin.pts;
    for (let i = 1; i < L.length; i++) {
      const k = 1 - (t - L[i].t) / (tr.gros ? .55 : .4);
      c.strokeStyle = tc; c.globalAlpha = Math.max(0, k) * .55; c.lineWidth = (tr.gros ? 14 : 9) * k; c.lineCap = 'round';
      c.beginPath(); c.moveTo(L[i - 1].x, L[i - 1].y); c.lineTo(L[i].x, L[i].y); c.stroke();
    }
    // plus de particules, plus grosses, même à l'arrêt
    if (R() < (v > 40 ? 1 : .25) && G.parts.length < 800) for (let k = 0; k < (v > 40 ? 2 : 1); k++) G.parts.push({ x: p.x + R.range(-8, 8), y: p.y + R.range(-8, 8), vx: -p.vx * .15 + R.range(-25, 25), vy: -p.vy * .15 + R.range(-25, 25) - 10, life: tr.gros ? 1.1 : .8, max: tr.gros ? 1.1 : .8, col: tc, r: tr.gros ? 4 : 3, add: true });
  } else RubanSkin.pts.length = 0;
  // aura : grand halo qui pulse + anneau
  const ac = au && au.col;
  if (ac) {
    const puls = 1 + .12 * Math.sin(t * 3);
    c.globalAlpha = .9; c.drawImage(glow(ac, 70 * puls), p.x - 70 * puls, p.y - 70 * puls);
    c.globalAlpha = .55 + .25 * Math.sin(t * 3); c.strokeStyle = ac.replace(/[\d.]+\)$/, '1)'); c.lineWidth = 2.5;
    c.beginPath(); c.arc(p.x, p.y, 30 * puls, 0, TAU); c.stroke();
  }
  // liseré de couleur de l'armure, au sol
  const acol = ar && ar.c && ar.c[1];
  if (acol) { c.globalAlpha = .35; c.drawImage(glow(acol, 30), p.x - 30, p.y - 30); }
  c.restore();
  _joueurSkins(c);
  // --- par-dessus : éclats qui tournent (aura) et étincelle de la visière ---
  c.save(); c.globalCompositeOperation = 'lighter';
  if (ac) for (let i = 0; i < 5; i++) { const a = t * 1.8 + i * TAU / 5, rr = 34 + 4 * Math.sin(t * 4 + i); const x = p.x + Math.cos(a) * rr, y = p.y + Math.sin(a) * rr * .8; c.globalAlpha = .9; c.drawImage(glow(ac.replace(/[\d.]+\)$/, '1)'), 6), x - 6, y - 6); }
  const vc = vi && vi.col;
  if (vc && !p.ko) { const hx = p.x + Math.cos(p.aim) * 9, hy = p.y + Math.sin(p.aim) * 9; c.globalAlpha = .7 + .3 * Math.sin(t * 6); c.drawImage(glow(vc, 12), hx - 12, hy - 12); }
  c.restore();
};
