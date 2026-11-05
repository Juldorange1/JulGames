'use strict';
/* Colosses — apparences dessinées (remplace les effets à base de particules) :
   • traînées : un vrai ruban qui suit le héros, avec des formes propres à chacune (feuilles, éclats de givre,
     éclair, pétales, étoiles, chauves-souris, flocons…), plus riches pour les raretés hautes ;
   • auras : chacune a son dessin animé (brume, flammes, flocon, bulles, runes, planètes, rayons…) ;
   • armures et visières épiques, mythiques et légendaires : reflets, arcs lumineux, braises, éclat de lentille.
   Le point rouge (zone de coup) n'est jamais recouvert. */

const Trace = { pts: [], id: 0 };
// plus c'est rare, plus c'est grand et lumineux
const VIS_RAR = { commun: 1.3, rare: 1.65, epique: 1.95, mythique: 2.15, legendaire: 2.4, saison: 1.95 };
const VIS_AURA = { commun: 1.2, rare: 1.4, epique: 1.6, mythique: 1.7, legendaire: 1.85, saison: 1.6 };
let visK = 1, visT = 1;
const DUREE_TRACE = { commun: .38, rare: .45, epique: .55, mythique: .65, legendaire: .75, saison: .55 };
function alphaCol(col, a) {
  if (col.startsWith('#')) { const n = parseInt(col.length === 4 ? col.replace(/#(.)(.)(.)/, '$1$1$2$2$3$3') : col.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
  return col.replace(/rgba?\(([^)]+)\)/, (m, x) => { const v = x.split(',').slice(0, 3).join(','); return `rgba(${v},${a})`; });
}
// ruban qui s'affine vers la queue ; P = [{x, y, k}] du plus vieux (k≈0) au plus récent (k=1)
function ruban(c, P, wTete, fill, onde) {
  if (P.length < 3) return;
  const g = [], d = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
    let nx = -(b.y - a.y), ny = b.x - a.x; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const w = wTete * visK * Math.pow(P[i].k, .8) * (onde ? 1 + onde * Math.sin(P[i].id * .7 + G.t * 9) : 1) / 2;
    g.push([P[i].x + nx * w, P[i].y + ny * w]); d.push([P[i].x - nx * w, P[i].y - ny * w]);
  }
  c.beginPath(); c.moveTo(g[0][0], g[0][1]);
  for (const q of g) c.lineTo(q[0], q[1]);
  for (let i = d.length - 1; i >= 0; i--) c.lineTo(d[i][0], d[i][1]);
  c.closePath(); c.fillStyle = fill; c.fill();
}
function gradTrace(c, P, colQueue, colTete) {
  const a = P[0], b = P[P.length - 1];
  if (Math.hypot(b.x - a.x, b.y - a.y) < 1) return colTete;
  const g = c.createLinearGradient(a.x, a.y, b.x, b.y); g.addColorStop(0, colQueue); g.addColorStop(1, colTete); return g;
}
function etoileForme(c, x, y, r, n, rot, creux) {
  r *= visT; c.beginPath();
  for (let i = 0; i < n * 2; i++) { const rr = i % 2 ? r * (creux || .45) : r, a = rot + i * Math.PI / n; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath();
}
function feuille(c, x, y, s, a, col) { s *= visT; c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = col; c.beginPath(); c.moveTo(-s, 0); c.quadraticCurveTo(0, -s * .7, s, 0); c.quadraticCurveTo(0, s * .7, -s, 0); c.fill(); c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-s, 0); c.lineTo(s, 0); c.stroke(); c.restore(); }
function flocon(c, x, y, s, a) { s *= visT; c.save(); c.translate(x, y); c.rotate(a); c.beginPath(); for (let i = 0; i < 6; i++) { const u = Math.cos(i * Math.PI / 3), v = Math.sin(i * Math.PI / 3); c.moveTo(0, 0); c.lineTo(u * s, v * s); const m = .55, b = .3; c.moveTo(u * s * m, v * s * m); c.lineTo(u * s * m + Math.cos(i * Math.PI / 3 + .8) * s * b, v * s * m + Math.sin(i * Math.PI / 3 + .8) * s * b); c.moveTo(u * s * m, v * s * m); c.lineTo(u * s * m + Math.cos(i * Math.PI / 3 - .8) * s * b, v * s * m + Math.sin(i * Math.PI / 3 - .8) * s * b); } c.stroke(); c.restore(); }
function chauveSouris(c, x, y, s, bat) { s *= visT; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x - s * .5, y - s * .6 * bat, x - s, y - s * .15 * bat); c.quadraticCurveTo(x - s * .6, y + s * .1, x - s * .3, y + s * .15); c.lineTo(x, y + s * .25); c.lineTo(x + s * .3, y + s * .15); c.quadraticCurveTo(x + s * .6, y + s * .1, x + s, y - s * .15 * bat); c.quadraticCurveTo(x + s * .5, y - s * .6 * bat, x, y); c.fill(); }
function lueurPt(c, col, r, x, y) { c.drawImage(glow(col, r), x - r, y - r); }

// ---------- traînées ----------
const TRAINEES = {
  t_poussiere(c, P) { ruban(c, P, 16, gradTrace(c, P, 'rgba(200,190,170,0)', 'rgba(220,205,180,.35)'), .25); },
  t_cendres(c, P) {
    ruban(c, P, 20, gradTrace(c, P, 'rgba(90,85,85,0)', 'rgba(120,112,108,.45)'), .35);
    c.fillStyle = 'rgba(255,140,60,.8)'; for (const q of P) if (q.id % 7 === 0) { c.beginPath(); c.arc(q.x + Math.sin(q.id) * 5, q.y + Math.cos(q.id) * 5, 1.6 * q.k + .4, 0, TAU); c.fill(); }
  },
  t_feuilles(c, P) {
    ruban(c, P, 10, gradTrace(c, P, 'rgba(120,190,70,0)', 'rgba(140,210,90,.25)'));
    for (const q of P) if (q.id % 4 === 0) feuille(c, q.x + Math.sin(q.id * 1.7) * 9 * (1 - q.k), q.y + Math.cos(q.id * 1.3) * 9 * (1 - q.k), 4 + 2 * q.k, q.id + G.t * 3 * (1 - q.k), q.id % 8 ? `rgba(120,200,70,${q.k})` : `rgba(200,180,60,${q.k})`);
  },
  t_braises(c, P) {
    c.globalCompositeOperation = 'lighter';
    ruban(c, P, 18, gradTrace(c, P, 'rgba(255,60,0,0)', 'rgba(255,120,30,.55)'), .2);
    ruban(c, P, 7, gradTrace(c, P, 'rgba(255,200,80,0)', 'rgba(255,240,170,.8)'));
    for (const q of P) if (q.id % 5 === 0) { const f = .5 + .5 * Math.sin(G.t * 20 + q.id); c.fillStyle = `rgba(255,${180 + 60 * f | 0},90,${q.k})`; c.beginPath(); c.arc(q.x + Math.sin(q.id * 2.1) * 8, q.y - (1 - q.k) * 14, 1.5 + f, 0, TAU); c.fill(); }
  },
  t_givre(c, P) {
    c.globalCompositeOperation = 'lighter';
    ruban(c, P, 14, gradTrace(c, P, 'rgba(150,220,255,0)', 'rgba(190,235,255,.45)'));
    for (let i = 1; i < P.length; i++) {
      const q = P[i]; if (q.id % 3) continue;
      const a = Math.atan2(q.y - P[i - 1].y, q.x - P[i - 1].x) + (q.id % 6 ? Math.PI / 2 : -Math.PI / 2), L = 12 * q.k + 3;
      c.fillStyle = `rgba(220,245,255,${.8 * q.k})`; c.beginPath(); c.moveTo(q.x + Math.cos(a + 1.4) * 3, q.y + Math.sin(a + 1.4) * 3); c.lineTo(q.x + Math.cos(a) * L, q.y + Math.sin(a) * L); c.lineTo(q.x + Math.cos(a - 1.4) * 3, q.y + Math.sin(a - 1.4) * 3); c.closePath(); c.fill();
    }
  },
  t_sang(c, P) {
    ruban(c, P, 16, gradTrace(c, P, 'rgba(90,0,10,0)', 'rgba(170,10,30,.7)'), .3);
    c.fillStyle = 'rgba(120,0,15,.85)'; for (const q of P) if (q.id % 6 === 0) { c.beginPath(); c.ellipse(q.x, q.y + (1 - q.k) * 6, 2.5 + 2 * (1 - q.k), 3 + 3 * (1 - q.k), 0, 0, TAU); c.fill(); }
  },
  t_foudre(c, P) {
    if (P.length < 3) return;
    c.globalCompositeOperation = 'lighter';
    const r = RNG((G.t * 30 | 0) + 7);
    const pts = P.filter((q, i) => i % 2 === 0 || i === P.length - 1).map(q => ({ x: q.x + (r() - .5) * 14 * (1 - q.k * .5), y: q.y + (r() - .5) * 14 * (1 - q.k * .5), k: q.k }));
    for (const [w, col] of [[7, 'rgba(255,240,120,.35)'], [2.5, 'rgba(255,255,220,.95)']]) {
      c.strokeStyle = col; c.lineWidth = w; c.lineJoin = 'round'; c.beginPath(); pts.forEach((q, i) => i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)); c.stroke();
    }
    c.strokeStyle = 'rgba(255,250,170,.7)'; c.lineWidth = 1.5;
    for (let i = 2; i < pts.length; i += 3) { const q = pts[i], a = r() * TAU; c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(q.x + Math.cos(a) * 12, q.y + Math.sin(a) * 12); c.lineTo(q.x + Math.cos(a + .6) * 20, q.y + Math.sin(a + .6) * 20); c.stroke(); }
  },
  t_ombre(c, P) {
    ruban(c, P, 22, gradTrace(c, P, 'rgba(40,0,70,0)', 'rgba(90,40,160,.5)'), .4);
    c.globalCompositeOperation = 'lighter';
    for (const s of [-1, 1]) { c.strokeStyle = 'rgba(190,140,255,.55)'; c.lineWidth = 2; c.beginPath(); P.forEach((q, i) => { const o = s * 9 * q.k * Math.sin(q.id * .5 + G.t * 6); i ? c.lineTo(q.x + o, q.y - o) : c.moveTo(q.x + o, q.y - o); }); c.stroke(); }
  },
  t_petales(c, P) {
    ruban(c, P, 12, gradTrace(c, P, 'rgba(255,170,215,0)', 'rgba(255,190,225,.3)'));
    for (const q of P) if (q.id % 3 === 0) { c.save(); c.translate(q.x + Math.sin(q.id * 1.9) * 12 * (1 - q.k), q.y + Math.cos(q.id * 1.1) * 12 * (1 - q.k)); c.rotate(q.id + G.t * 2); c.fillStyle = q.id % 2 ? `rgba(255,170,215,${q.k})` : `rgba(255,225,240,${q.k})`; c.beginPath(); c.ellipse(0, 0, 5, 2.6, 0, 0, TAU); c.fill(); c.restore(); }
  },
  t_comete(c, P) {
    c.globalCompositeOperation = 'lighter';
    ruban(c, P, 30, gradTrace(c, P, 'rgba(60,140,255,0)', 'rgba(140,230,255,.45)'));
    ruban(c, P, 12, gradTrace(c, P, 'rgba(160,240,255,0)', 'rgba(255,255,255,.9)'));
    for (const q of P) if (q.id % 4 === 0) { c.fillStyle = `rgba(220,250,255,${q.k})`; etoileForme(c, q.x + Math.sin(q.id * 2.3) * 13, q.y + Math.cos(q.id * 1.7) * 13, 4 * q.k + 1, 4, G.t * 2 + q.id, .3); c.fill(); }
  },
  t_etoiles(c, P) {
    c.globalCompositeOperation = 'lighter';
    ruban(c, P, 20, gradTrace(c, P, 'rgba(255,200,80,0)', 'rgba(255,225,140,.45)'));
    for (const q of P) if (q.id % 3 === 0) { const tw = .6 + .4 * Math.sin(G.t * 10 + q.id); c.fillStyle = `rgba(255,245,190,${q.k * tw})`; etoileForme(c, q.x + Math.sin(q.id * 2.7) * 12, q.y + Math.cos(q.id * 1.9) * 12, (3 + 4 * q.k) * tw, 5, q.id, .42); c.fill(); }
    if (P.length) { const h = P[P.length - 1]; lueurPt(c, 'rgba(255,220,120,.6)', 22, h.x, h.y); }
  },
  t_aurore(c, P) {
    c.globalCompositeOperation = 'lighter';
    [[150, 0], [185, 2], [280, 4]].forEach(([hu, ph]) => {
      const Q = P.map(q => ({ x: q.x + Math.sin(q.id * .35 + G.t * 3 + ph) * 10 * q.k, y: q.y + Math.cos(q.id * .3 + G.t * 2.5 + ph) * 10 * q.k, k: q.k, id: q.id }));
      ruban(c, Q, 14, gradTrace(c, Q, `hsla(${hu + 20 * Math.sin(G.t)},100%,60%,0)`, `hsla(${hu},100%,70%,.4)`), .3);
    });
  },
  t_chauvesouris(c, P) {
    ruban(c, P, 10, gradTrace(c, P, 'rgba(255,120,20,0)', 'rgba(255,140,40,.3)'));
    for (const q of P) if (q.id % 5 === 0) { c.fillStyle = `rgba(30,8,36,${.3 + .7 * q.k})`; chauveSouris(c, q.x + Math.sin(q.id * 1.3) * 10 * (1 - q.k), q.y - (1 - q.k) * 18, 7, Math.sin(G.t * 22 + q.id)); }
  },
  t_neige(c, P) {
    c.globalCompositeOperation = 'lighter';
    ruban(c, P, 14, gradTrace(c, P, 'rgba(255,255,255,0)', 'rgba(235,248,255,.35)'));
    c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 1.2;
    for (const q of P) if (q.id % 4 === 0) { c.globalAlpha = q.k; flocon(c, q.x + Math.sin(q.id * 2.1) * 11 * (1 - q.k), q.y + (1 - q.k) * 10, 3 + 3 * q.k, q.id + G.t); }
    c.globalAlpha = 1;
  },
  t_pollen(c, P) {
    c.globalCompositeOperation = 'lighter';
    ruban(c, P, 10, gradTrace(c, P, 'rgba(255,230,120,0)', 'rgba(255,240,150,.35)'));
    for (const q of P) if (q.id % 2 === 0) { const x = q.x + Math.sin(q.id * 3.1 + G.t) * 12 * (1 - q.k), y = q.y + Math.cos(q.id * 2.3 + G.t) * 12 * (1 - q.k); c.fillStyle = `rgba(255,245,160,${q.k})`; c.beginPath(); c.arc(x, y, 1.6, 0, TAU); c.fill(); }
  },
  t_lucioles(c, P) {
    c.globalCompositeOperation = 'lighter';
    for (const q of P) if (q.id % 3 === 0) { const al = q.k * (.4 + .6 * Math.max(0, Math.sin(G.t * 7 + q.id))); const x = q.x + Math.sin(q.id * 2.2 + G.t * 2) * 14, y = q.y + Math.cos(q.id * 1.6 + G.t * 2) * 14; c.globalAlpha = al; lueurPt(c, 'rgba(210,255,110,.6)', 10, x, y); c.globalAlpha = 1; c.fillStyle = `rgba(245,255,190,${al})`; c.beginPath(); c.arc(x, y, 2, 0, TAU); c.fill(); }
  }
};
// apparences ajoutées plus tard sans dessin propre : un ruban à leur couleur
function traineeDefaut(c, P, s) { const col = s.col || '#fff'; if (s.add) c.globalCompositeOperation = 'lighter'; ruban(c, P, s.gros ? 22 : 14, gradTrace(c, P, alphaCol(col, 0), alphaCol(col, .5)), .2); }

// ---------- auras ----------
const AURAS = {
  r_brume(c, x, y, t) { for (let i = 0; i < 3; i++) { const a = t * .6 + i * 2.1; c.globalAlpha = .5; lueurPt(c, 'rgba(210,210,230,.35)', 30, x + Math.cos(a) * 14, y + Math.sin(a) * 9); } c.globalAlpha = 1; },
  r_cyan(c, x, y, t) { lueurPt(c, 'rgba(80,230,255,.4)', 46, x, y); for (let i = 0; i < 2; i++) { const k = ((t * .7 + i * .5) % 1); c.strokeStyle = `rgba(120,240,255,${(1 - k) * .8})`; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 18 + k * 30, 0, TAU); c.stroke(); } },
  r_givre(c, x, y, t) { lueurPt(c, 'rgba(170,230,255,.35)', 46, x, y); c.strokeStyle = 'rgba(220,245,255,.8)'; c.lineWidth = 1.6; flocon(c, x, y, 34, t * .4); },
  r_venin(c, x, y, t) {
    lueurPt(c, 'rgba(140,255,80,.3)', 44, x, y);
    for (let i = 0; i < 7; i++) { const k = (t * .5 + i / 7) % 1, a = i * 2.4; const bx = x + Math.cos(a) * (14 + 10 * Math.sin(i)), by = y + 12 - k * 34; c.strokeStyle = `rgba(170,255,110,${(1 - k) * .9})`; c.lineWidth = 1.5; c.beginPath(); c.arc(bx, by, 2 + 3 * k, 0, TAU); c.stroke(); }
  },
  r_feu(c, x, y, t) {
    lueurPt(c, 'rgba(255,120,40,.45)', 50, x, y);
    for (let i = 0; i < 9; i++) {
      const a = i * TAU / 9 + t * .8, h = 14 + 6 * Math.sin(t * 9 + i * 1.7), bx = x + Math.cos(a) * 24, by = y + Math.sin(a) * 17;
      const g = c.createLinearGradient(bx, by, bx, by - h); g.addColorStop(0, 'rgba(255,90,20,.85)'); g.addColorStop(1, 'rgba(255,230,120,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(bx - 5, by); c.quadraticCurveTo(bx - 3, by - h * .6, bx + Math.sin(t * 7 + i) * 2, by - h); c.quadraticCurveTo(bx + 3, by - h * .6, bx + 5, by); c.closePath(); c.fill();
    }
  },
  r_sang(c, x, y, t) {
    lueurPt(c, 'rgba(255,30,50,.35)', 48, x, y);
    c.strokeStyle = 'rgba(255,60,80,.85)'; c.lineWidth = 2.5; c.setLineDash([10, 7]); c.lineDashOffset = -t * 30; c.beginPath(); c.arc(x, y, 30, 0, TAU); c.stroke(); c.setLineDash([]);
    c.fillStyle = 'rgba(255,90,100,.9)'; for (let i = 0; i < 3; i++) { const a = -t * .9 + i * TAU / 3; c.save(); c.translate(x + Math.cos(a) * 30, y + Math.sin(a) * 30); c.rotate(a); c.fillRect(-1, -5, 2, 10); c.fillRect(-4, -1, 8, 2); c.restore(); }
  },
  r_astral(c, x, y, t) {
    lueurPt(c, 'rgba(255,120,230,.4)', 50, x, y);
    const st = []; for (let i = 0; i < 5; i++) { const a = t * .25 + i * TAU / 5; st.push([x + Math.cos(a) * 32, y + Math.sin(a) * 22]); }
    c.strokeStyle = 'rgba(255,190,245,.45)'; c.lineWidth = 1; c.beginPath(); st.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.closePath(); c.stroke();
    c.fillStyle = '#ffe6fb'; for (const q of st) { etoileForme(c, q[0], q[1], 3.5, 4, t, .35); c.fill(); }
    for (let i = 0; i < 2; i++) { const a = t * (1.3 + i * .7) + i * 3, px = x + Math.cos(a) * (20 + i * 22), py = y + Math.sin(a) * (10 + i * 9); c.fillStyle = i ? '#9fd8ff' : '#ffb0e8'; c.beginPath(); c.arc(px, py, 3.5 - i, 0, TAU); c.fill(); }
  },
  r_couronne(c, x, y, t) { auraRayons(c, x, y, t, 'rgba(255,210,80,', 10); lueurPt(c, 'rgba(255,210,80,.45)', 52, x, y); },
  r_divine(c, x, y, t) { auraRayons(c, x, y, t, 'rgba(255,248,210,', 14); lueurPt(c, 'rgba(255,245,200,.5)', 56, x, y); c.strokeStyle = 'rgba(255,250,220,.9)'; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y - 30, 12, 4, 0, 0, TAU); c.stroke(); },
  r_lanterne(c, x, y, t) { lueurPt(c, 'rgba(255,140,30,.4)', 46, x, y); const a = t * 1.4; if (typeof citrouilleMini === 'function') citrouilleMini(c, x + Math.cos(a) * 30, y + Math.sin(a) * 18 - 6, 7, t); },
  r_boreale(c, x, y, t) { c.lineWidth = 4; for (let i = 0; i < 24; i++) { const a0 = i * TAU / 24, a1 = a0 + TAU / 24 + .02, rr = 28 + 4 * Math.sin(t * 3 + i * .8); c.strokeStyle = `hsla(${150 + 120 * (.5 + .5 * Math.sin(t + i * .4)) | 0},100%,65%,.55)`; c.beginPath(); c.arc(x, y, rr, a0, a1); c.stroke(); } },
  r_eclosion(c, x, y, t) { const o = .75 + .25 * Math.sin(t * 1.5); for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + t * .2; c.save(); c.translate(x + Math.cos(a) * 18 * o, y + Math.sin(a) * 13 * o); c.rotate(a); c.fillStyle = i % 2 ? 'rgba(255,170,215,.6)' : 'rgba(255,215,235,.6)'; c.beginPath(); c.ellipse(0, 0, 13 * o, 6, 0, 0, TAU); c.fill(); c.restore(); } },
  r_canicule(c, x, y, t) { auraRayons(c, x, y, t, 'rgba(255,190,60,', 9); for (let i = 0; i < 3; i++) { const k = (t * .6 + i / 3) % 1; c.strokeStyle = `rgba(255,200,90,${(1 - k) * .5})`; c.lineWidth = 1.5; c.beginPath(); for (let j = 0; j <= 30; j++) { const a = j * TAU / 30, rr = 16 + k * 30 + Math.sin(a * 6 + t * 8) * 2; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * .8); } c.stroke(); } }
};
function auraRayons(c, x, y, t, base, n) {
  for (let i = 0; i < n; i++) { const a = t * .5 + i * TAU / n, L = 46 + 8 * Math.sin(t * 3 + i); const g = c.createLinearGradient(x, y, x + Math.cos(a) * L, y + Math.sin(a) * L); g.addColorStop(0, base + '.55)'); g.addColorStop(1, base + '0)'); c.fillStyle = g; c.beginPath(); c.moveTo(x + Math.cos(a - .09) * 12, y + Math.sin(a - .09) * 12); c.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); c.lineTo(x + Math.cos(a + .09) * 12, y + Math.sin(a + .09) * 12); c.closePath(); c.fill(); }
}
function citrouilleMini(c, x, y, r, t) {
  c.fillStyle = '#e0701c'; c.strokeStyle = '#6a2a04'; c.lineWidth = 1;
  for (const dx of [-.4, .4, 0]) { c.beginPath(); c.ellipse(x + dx * r, y, r * .6, r * .75, 0, 0, TAU); c.fill(); c.stroke(); }
  c.fillStyle = '#3a6a1a'; c.fillRect(x - 1, y - r - 2, 2, 3);
  c.fillStyle = `rgba(255,230,120,${.7 + .3 * Math.sin(t * 9)})`; c.beginPath(); c.moveTo(x - r * .4, y - r * .1); c.lineTo(x - r * .15, y - r * .35); c.lineTo(x - r * .1, y - r * .05); c.moveTo(x + r * .4, y - r * .1); c.lineTo(x + r * .15, y - r * .35); c.lineTo(x + r * .1, y - r * .05); c.fill(); c.fillRect(x - r * .35, y + r * .2, r * .7, r * .15);
}
function auraDefaut(c, x, y, t, s) { const col = s.col; lueurPt(c, col, 46, x, y); c.strokeStyle = alphaCol(col, .7); c.lineWidth = 2; c.beginPath(); c.arc(x, y, 28 + 3 * Math.sin(t * 3), 0, TAU); c.stroke(); }

// ---------- armures et visières des raretés hautes ----------
function effetArmure(c, p, s, t) {
  if (!s || !s.c || !['rare', 'epique', 'mythique', 'legendaire', 'saison'].includes(s.rar)) return;
  const [c0, c1] = s.c;
  if (s.rar === 'rare') { const a = t * 2; c.strokeStyle = alphaCol(c1, .9); c.lineWidth = 2.5; c.beginPath(); c.arc(p.x, p.y, 19, a, a + .7); c.stroke(); c.beginPath(); c.arc(p.x, p.y, 19, a + Math.PI, a + Math.PI + .7); c.stroke(); return; }
  if (s.rar === 'epique' || s.rar === 'saison') { lueurPt(c, alphaCol(c1, .35), 30, p.x, p.y); for (const d of [0, Math.PI]) { const a = t * 2.5 + d; c.strokeStyle = alphaCol(c0, .95); c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y, 20, a, a + 1.1); c.stroke(); } }
  if (s.rar === 'mythique') { for (const [sg, col] of [[1, c0], [-1, c1]]) { const a = sg * t * 2.2; c.strokeStyle = alphaCol(col, .95); c.lineWidth = 3.2; c.beginPath(); c.arc(p.x, p.y, 21, a, a + 1.6); c.stroke(); c.beginPath(); c.arc(p.x, p.y, 25, -a, -a + 1); c.stroke(); } lueurPt(c, alphaCol(c1, .45), 38, p.x, p.y); }
  if (s.rar === 'legendaire') {
    c.globalAlpha = .75 + .25 * Math.sin(t * 4); lueurPt(c, alphaCol(c1, .45), 34, p.x, p.y); c.globalAlpha = 1;
    for (let i = 0; i < 4; i++) { const a = t * 1.8 + i * TAU / 4, x = p.x + Math.cos(a) * 27, y = p.y + Math.sin(a) * 20; lueurPt(c, alphaCol(c0, .95), 12, x, y); c.fillStyle = '#fffbe6'; c.beginPath(); c.arc(x, y, 2.6, 0, TAU); c.fill(); }
    c.strokeStyle = alphaCol(c0, .8); c.lineWidth = 2.5; c.beginPath(); c.arc(p.x, p.y, 21 + 2 * Math.sin(t * 5), 0, TAU); c.stroke();
  }
}
function effetVisiere(c, p, s, t) {
  if (!s || !s.col || p.ko) return;
  const hx = p.x + Math.cos(p.aim) * 9, hy = p.y + Math.sin(p.aim) * 9;
  const col = s.id === 'v_prisme' ? `hsl(${(t * 120) % 360},100%,72%)` : s.col;
  c.globalAlpha = .7 + .3 * Math.sin(t * 6); lueurPt(c, s.id === 'v_prisme' ? 'rgba(255,160,240,.85)' : alphaCol(s.col, .85), { commun: 12, rare: 16, epique: 19, mythique: 21, legendaire: 24 }[s.rar] || 14, hx, hy); c.globalAlpha = 1;
  if (['epique', 'mythique', 'legendaire'].includes(s.rar)) {
    const L = s.rar === 'epique' ? 13 : 19, a = p.aim + t * (s.rar === 'legendaire' ? .8 : 0);
    c.strokeStyle = col; c.lineWidth = 2; c.globalAlpha = .8 + .2 * Math.sin(t * 8);
    const n = s.rar === 'legendaire' ? 4 : 2;
    c.beginPath(); for (let i = 0; i < n; i++) { const b = a + i * Math.PI / n; c.moveTo(hx - Math.cos(b) * L, hy - Math.sin(b) * L); c.lineTo(hx + Math.cos(b) * L, hy + Math.sin(b) * L); } c.stroke();
    c.globalAlpha = 1;
  }
}

// ---------- branchement ----------
const _joueurSkins3 = dessinerJoueur;
dessinerJoueur = function (c) {
  const p = G.p;
  if (!p || p.hp <= 0 || typeof equipe !== 'function') { Trace.pts.length = 0; return _joueurSkins3(c); }
  const au = equipe('aura'), tr = equipe('trainee'), vi = equipe('visiere'), ar = equipe('armure');
  const t = G.t;
  // traînée : un point par image, effacé selon sa durée
  if (tr && tr.col) {
    visK = VIS_RAR[tr.rar] || 1.3; visT = Math.sqrt(visK);
    const dur = (DUREE_TRACE[tr.rar] || .45) * (1 + (visK - 1) * .45), last = Trace.pts[Trace.pts.length - 1];
    if (!last || last.t !== t) Trace.pts.push({ x: p.x, y: p.y, t, id: Trace.id++ });
    while (Trace.pts.length && t - Trace.pts[0].t > dur) Trace.pts.shift();
    const P = Trace.pts.map(q => ({ x: q.x, y: q.y, id: q.id, k: 1 - (t - q.t) / dur }));
    const mobile = P.length > 2 && Math.hypot(P[P.length - 1].x - P[0].x, P[P.length - 1].y - P[0].y) > 6;
    if (mobile) {
      c.save();
      try {
        if (visK > 1.5 && tr.col) { c.globalCompositeOperation = 'lighter'; ruban(c, P, 22, gradTrace(c, P, alphaCol(tr.col, 0), alphaCol(tr.col, .2 + .05 * (visK - 1.5)))); c.globalCompositeOperation = 'source-over'; }
        (TRAINEES[tr.id] || ((c2, P2) => traineeDefaut(c2, P2, tr)))(c, P, tr);
      } catch (e) { }
      c.restore();
    }
  } else Trace.pts.length = 0;
  // aura (sous le héros)
  if (au && au.col) {
    const m = VIS_AURA[au.rar] || 1.2; visT = 1;
    c.save(); c.globalCompositeOperation = 'lighter'; c.translate(p.x, p.y); c.scale(m, m);
    try {
      (AURAS[au.id] || ((c2, x, y, t2) => auraDefaut(c2, x, y, t2, au)))(c, 0, 0, t, au);
      if (au.rar !== 'commun') { c.strokeStyle = alphaCol(au.col, .75); c.lineWidth = 2; c.beginPath(); c.ellipse(0, 10, 30 + 3 * Math.sin(t * 2.5), 10, 0, 0, TAU); c.stroke(); }
    } catch (e) { }
    c.restore();
  }
  _joueurSkins3(c);
  // par-dessus, loin du point rouge : armure et visière des raretés hautes
  c.save(); c.globalCompositeOperation = 'lighter';
  try { effetArmure(c, p, ar, t); effetVisiere(c, p, vi, t); } catch (e) { }
  c.restore();
};
