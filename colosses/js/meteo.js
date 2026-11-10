'use strict';
/* Colosses — météo de saison, sur le décor du menu et dans les arènes : neige en hiver, pétales au printemps,
   lucioles dorées l'été, feuilles qui tombent à l'automne. Discrète en combat (jamais sur l'interface). */

const Meteo = {
  saison(d) { const m = (d || new Date()).getMonth(); return m === 11 || m <= 1 ? 'hiver' : m <= 4 ? 'printemps' : m <= 7 ? 'ete' : 'automne'; },
  // une particule qui part d'en haut (ou d'en bas pour les lucioles)
  nouvelle(W0, H0, x0) {
    const s = this.saison(), r = Math.random;
    const base = { x: x0 !== undefined ? x0 + r() * (W0 - x0) : r() * W0, y: -10, p: r() * 6, s };
    if (s === 'hiver') return Object.assign(base, { vx: -8 + r() * 16, vy: 30 + r() * 40, r: 1.2 + r() * 2.6, col: '#ffffff' });
    if (s === 'printemps') return Object.assign(base, { vx: 10 + r() * 25, vy: 25 + r() * 25, r: 2 + r() * 2.5, col: r() < .5 ? '#ffc4dc' : '#fff0f6' });
    if (s === 'ete') return Object.assign(base, { y: H0 + 10, vx: -6 + r() * 12, vy: -(12 + r() * 22), r: 1.2 + r() * 1.8, col: r() < .5 ? '#ffe58a' : '#fff6c8', luciole: true });
    return Object.assign(base, { vx: 12 + r() * 28, vy: 30 + r() * 30, r: 3 + r() * 3, col: ['#d9822b', '#c8571f', '#e8b23a', '#a8461c'][Math.floor(r() * 4)], feuille: true });
  },
  bouger(q, dt, t) {
    q.x += (q.vx + Math.sin(t * 1.3 + q.p) * (q.feuille ? 22 : 10)) * dt; q.y += q.vy * dt;
  },
  dessiner(c, q, t, alpha) {
    c.globalAlpha = alpha;
    if (q.feuille) { c.save(); c.translate(q.x, q.y); c.rotate(t * 2 + q.p); c.scale(1, .55 + .45 * Math.sin(t * 3 + q.p)); c.fillStyle = q.col; c.beginPath(); c.moveTo(-q.r * 1.6, 0); c.quadraticCurveTo(0, -q.r, q.r * 1.6, 0); c.quadraticCurveTo(0, q.r, -q.r * 1.6, 0); c.fill(); c.strokeStyle = 'rgba(90,40,10,.5)'; c.lineWidth = .6; c.beginPath(); c.moveTo(-q.r * 1.4, 0); c.lineTo(q.r * 1.4, 0); c.stroke(); c.restore(); }
    else if (q.s === 'printemps') { c.save(); c.translate(q.x, q.y); c.rotate(t * 2 + q.p); c.fillStyle = q.col; c.beginPath(); c.ellipse(0, 0, q.r * 1.6, q.r * .9, 0, 0, TAU); c.fill(); c.restore(); }
    else if (q.luciole) { const k = .55 + .45 * Math.sin(t * 4 + q.p * 3); c.globalAlpha = alpha * k; c.globalCompositeOperation = 'lighter'; c.drawImage(glow(q.col, q.r * 4), q.x - q.r * 4, q.y - q.r * 4); c.globalCompositeOperation = 'source-over'; }
    else { c.fillStyle = q.col; c.beginPath(); c.arc(q.x, q.y, q.r, 0, TAU); c.fill(); }
    c.globalAlpha = 1;
  }
};
// au menu : la météo de saison se mêle aux étincelles du décor (sur la partie droite, autour du colosse)
const Meteo_menu = { parts: [], t: 0 };
const _fondMeteo = fondMenu;
fondMenu = function () {
  _fondMeteo.apply(this, arguments);
  try {
    const M = Meteo_menu, sw = cv.width, sh = cv.height, kb = Math.min(sw / W, sh / H), ox = sw - W * kb;
    M.t += 1 / 60;
    if (M.parts.length < 70 && Math.random() < .6) M.parts.push(Meteo.nouvelle(W, H, W * .3));
    ctx.save(); ctx.setTransform(kb, 0, 0, kb, ox, 0);
    for (const q of M.parts) { Meteo.bouger(q, 1 / 60, M.t); Meteo.dessiner(ctx, q, M.t, .85); }
    ctx.restore();
    M.parts = M.parts.filter(q => q.y < H + 20 && q.y > -30 && q.x < W + 30);
  } catch (e) { }
};
// en combat : quelques particules seulement, sous l'interface
const Meteo_jeu = { parts: [] };
const _hudMeteo = dessinerHUD;
dessinerHUD = function (c) {
  try {
    if ((G.etat === 'combat' || G.etat === 'interlude') && G.opts.decorAnime !== false && G.opts.effetsReduits !== true) {
      const M = Meteo_jeu, t = G.t || 0;
      if (M.parts.length < 36 && Math.random() < .25) M.parts.push(Meteo.nouvelle(W, H));
      for (const q of M.parts) { Meteo.bouger(q, 1 / 60, t); Meteo.dessiner(c, q, t, .55); }
      M.parts = M.parts.filter(q => q.y < H + 20 && q.y > -30 && q.x < W + 30);
    }
  } catch (e) { }
  return _hudMeteo.apply(this, arguments);
};
