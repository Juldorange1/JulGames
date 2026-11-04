'use strict';
/* Colosses — attaques « il montre où il va frapper, puis il frappe » : zones annoncées, ordres à retenir,
   secteurs, anneaux, fractures. Moins de projectiles partout, plus de lecture du terrain. */

// ---------- Nouveaux dangers : secteur (part de tarte) et couronne (anneau) ----------
function secteur(x, y, a0, a1, R, warn, o) { const h = Object.assign({ kind: 'secteur', x, y, a0, a1, R, warn, t: 0, act: .16, dmg: DMG(1.3), src: G.atkCourante }, o || {}); G.hz.push(h); return h; }
function couronne(x, y, r1, r2, warn, o) { const h = Object.assign({ kind: 'couronne', x, y, r1, r2, warn, t: 0, act: .16, dmg: DMG(1.3), src: G.atkCourante }, o || {}); G.hz.push(h); return h; }
function dansSecteur(h, px, py) { let a = ang(h.x, h.y, px, py) - h.a0; a = ((a % TAU) + TAU) % TAU; return a <= ((h.a1 - h.a0) % TAU + TAU) % TAU || h.a1 - h.a0 >= TAU - .001; }
function explosionZone(h, cx, cy, r) { if (!h.boom) { h.boom = true; h.at = 0; G.explo(cx, cy, r, h.col || ROUGE); Son.play('explo'); G.secoue(r > 150 ? 7 : 4); } }
HZ.secteur = {
  up(h, dt) { h.t += dt; if (h.t >= h.warn) explosionZone(h, h.x + Math.cos((h.a0 + h.a1) / 2) * h.R * .55, h.y + Math.sin((h.a0 + h.a1) / 2) * h.R * .55, 70); if (h.boom) { h.at += dt; if (h.at >= h.act) h.dead = true; } },
  hit(h, p) { return h.boom && !h.touche && d2(h.x, h.y, p.x, p.y) < (h.R + p.hr) ** 2 && dansSecteur(h, p.x, p.y); },
  draw(h, c) {
    c.beginPath(); c.moveTo(h.x, h.y); c.arc(h.x, h.y, h.R, h.a0, h.a1); c.closePath();
    if (!h.boom) {
      const k = clamp(h.t / h.warn, 0, 1);
      c.fillStyle = `rgba(${AL},${.07 + .2 * k})`; c.fill();
      c.strokeStyle = k > .8 && (G.t * 20 | 0) % 2 ? '#fff' : ROUGE; c.lineWidth = 2; c.stroke();
      if (h.num) { const am = (h.a0 + h.a1) / 2; texteOmbre(c, String(h.num), h.x + Math.cos(am) * h.R * .6, h.y + Math.sin(am) * h.R * .6 + 8, '#fff', `900 ${26}px ${POLICE}`, 4); }
    } else { c.fillStyle = `rgba(255,220,200,${.7 * (1 - h.at / h.act)})`; c.fill(); }
  }
};
HZ.couronne = {
  up(h, dt) { h.t += dt; if (h.t >= h.warn && !h.boom) { h.boom = true; h.at = 0; for (let i = 0; i < 10; i++) { const a = i * TAU / 10 + h.t; G.etincelle(h.x + Math.cos(a) * (h.r1 + h.r2) / 2, h.y + Math.sin(a) * (h.r1 + h.r2) / 2, ROUGE, 3); } Son.play('explo'); G.secoue(5); } if (h.boom) { h.at += dt; if (h.at >= h.act) h.dead = true; } },
  hit(h, p) { if (!h.boom || h.touche) return false; const dd = Math.sqrt(d2(h.x, h.y, p.x, p.y)); return dd > h.r1 - p.hr && dd < h.r2 + p.hr; },
  draw(h, c) {
    c.beginPath(); c.arc(h.x, h.y, h.r2, 0, TAU); if (h.r1 > 0) c.arc(h.x, h.y, h.r1, 0, TAU, true);
    if (!h.boom) {
      const k = clamp(h.t / h.warn, 0, 1);
      c.fillStyle = `rgba(${AL},${.07 + .2 * k})`; c.fill('evenodd');
      c.strokeStyle = k > .8 && (G.t * 20 | 0) % 2 ? '#fff' : ROUGE; c.lineWidth = 2; c.stroke();
    } else { c.fillStyle = `rgba(255,220,200,${.7 * (1 - h.at / h.act)})`; c.fill('evenodd'); }
  }
};
// numéro d'ordre affiché sur les cercles (pour les attaques à mémoriser)
const _dessinCercle = HZ.cercle.draw;
HZ.cercle.draw = function (h, c) { _dessinCercle.call(this, h, c); if (h.num && !h.boom) texteOmbre(c, String(h.num), h.x, h.y + 10, '#fff', `900 ${Math.min(34, 14 + h.r * .12)}px ${POLICE}`, 4); };

// ---------- Attaques ----------
nouvelleAttaque('frappeChaine', { nom: 'Frappes en chaîne', cat: 'zone', conseil: 'Des cercles tombent là où tu étais, l\'un après l\'autre : ne t\'arrête pas, cours en ligne droite ou en grand arc.',
  params: (r, D) => ({ n: r.int(6, 8), r: r.range(75, 95), pas: r.range(.2, .26) }),
  *gen(b, p) {
    yield* prep(b, .4);
    for (let i = 0; i < p.n; i++) { const t = cible(); zoneC(t.x, t.y, p.r, Math.max(.75, .9 * b.D.T)); yield p.pas / Math.min(1.25, b.D.S); }
    yield .6;
  }
});
nouvelleAttaque('pilonnage', { nom: 'Pilonnage numéroté', cat: 'zone', conseil: 'Quatre grands cercles numérotés : ils frappent dans l\'ordre. Retiens l\'ordre et va dans le cercle qui vient d\'exploser.',
  params: (r, D) => ({ n: 4, r: r.range(140, 170) }),
  *gen(b, p) {
    yield* prep(b, .5);
    const t = cible(), a0 = R() * TAU, w0 = Math.max(1.3, 1.5 * b.D.T), pas = Math.max(.42, .55 * b.D.T);
    for (let i = 0; i < p.n; i++) { const a = a0 + i * TAU / p.n * (i % 2 ? 1.5 : 1), d = i === 0 ? 0 : 160 + (i % 2) * 40; const pt = G.arene.clampPt(t.x + Math.cos(a) * d, t.y + Math.sin(a) * d, p.r * .6); zoneC(pt.x, pt.y, p.r, w0 + i * pas, { num: i + 1, dmg: DMG(1.4) }); }
    yield w0 + p.n * pas;
  }
});
nouvelleAttaque('croixFeu', { nom: 'Croix au sol', cat: 'zone', conseil: 'Une croix se dessine sur toi : sors des deux bandes. Puis une croix en X tombe là où tu t\'es réfugié.',
  params: (r, D) => ({ w: r.range(100, 130) }),
  *gen(b, p) {
    yield* prep(b, .45);
    const bb = G.arene.bb(), w0 = Math.max(.95, 1.1 * b.D.T);
    let t = cible();
    zoneR(bb.x, t.y - p.w / 2, bb.w, p.w, w0); zoneR(t.x - p.w / 2, bb.y, p.w, bb.h, w0); Son.play('tele');
    yield w0 + .25;
    t = cible();
    for (const a of [Math.PI / 4, -Math.PI / 4]) for (const s of [0, Math.PI]) rayon(t.x, t.y, a + s, 1500, p.w * .7, w0, .2, { dmg: DMG(1.3) });
    yield w0 + .4;
  }
});
nouvelleAttaque('cadran', { nom: 'Cadran', cat: 'zone', conseil: 'L\'arène est coupée en huit parts autour du boss : elles frappent une par une dans le sens des aiguilles d\'une montre. Suis la part qui vient de frapper.',
  params: (r, D) => ({ n: 8, sens: r.sign() }),
  *gen(b, p) {
    b.ctl = true;
    yield* prep(b, .5);
    const a0 = vise(b) + Math.PI / 8, part = TAU / p.n, w0 = Math.max(1.1, 1.3 * b.D.T), pas = Math.max(.3, .38 * b.D.T);
    for (let i = 0; i < p.n - 1; i++) { const a = a0 + p.sens * i * part, lo = p.sens > 0 ? a : a - part; secteur(b.x, b.y, lo, lo + part, 950, w0 + i * pas, { num: i + 1 }); }
    yield w0 + p.n * pas;
    b.ctl = false;
  }
});
nouvelleAttaque('anneauxFeu', { nom: 'Anneaux de feu', cat: 'zone', conseil: 'Les anneaux autour du boss frappent du centre vers l\'extérieur, puis dans l\'autre sens : entre dans l\'anneau qui vient d\'exploser.',
  params: (r, D) => ({ ep: r.range(120, 150), aller: r.chance(.5) }),
  *gen(b, p) {
    b.ctl = true;
    yield* prep(b, .5);
    const w0 = Math.max(1.1, 1.3 * b.D.T), pas = Math.max(.45, .6 * b.D.T), n = 5;
    for (let i = 0; i < n; i++) { const k = p.aller ? i : n - 1 - i; couronne(b.x, b.y, k * p.ep, (k + 1) * p.ep, w0 + i * pas); }
    yield w0 + n * pas + .2;
    b.ctl = false;
  }
});
nouvelleAttaque('artillerie', { nom: 'Barrage d\'artillerie', cat: 'zone', conseil: 'Des obus tombent par vagues autour de toi : regarde les petits cercles qui s\'allument et faufile-toi entre eux.',
  params: (r, D) => ({ n: Math.round(r.int(10, 13) * Math.min(1.3, D.C)), r: r.range(55, 70) }),
  *gen(b, p) {
    yield* prep(b, .45);
    for (let i = 0; i < p.n; i++) { const t = cible(), a = R() * TAU, d = R.range(0, 260), pt = G.arene.clampPt(t.x + Math.cos(a) * d, t.y + Math.sin(a) * d, p.r * .5); zoneC(pt.x, pt.y, p.r, Math.max(.8, .95 * b.D.T)); if (i % 3 === 2) yield .3; }
    yield 1;
  }
});
nouvelleAttaque('fractures', { nom: 'Lignes de fracture', cat: 'zone', conseil: 'Trois longues bandes s\'allument d\'un côté, puis trois dans l\'autre sens : place-toi dans un des trous du quadrillage.',
  params: (r, D) => ({ w: r.range(80, 100) }),
  *gen(b, p) {
    yield* prep(b, .45);
    const bb = G.arene.bb(), w0 = Math.max(1, 1.15 * b.D.T), t = cible();
    for (const k of [-1, 0, 1]) zoneR(bb.x, t.y + k * 230 - p.w / 2, bb.w, p.w, w0);
    yield w0 + .2;
    const t2 = cible();
    for (const k of [-1, 0, 1]) zoneR(t2.x + k * 260 - p.w / 2, bb.y, p.w, bb.h, w0);
    yield w0 + .3;
  }
});
nouvelleAttaque('poingCeleste', { nom: 'Poing céleste', cat: 'zone', conseil: 'Une énorme ombre te suit puis s\'arrête net : à ce moment, sors-en d\'un coup de talent ou en courant.',
  params: (r, D) => ({ r: r.range(190, 220) }),
  *gen(b, p) {
    yield* prep(b, .4);
    const h = zoneC(cible().x, cible().y, p.r, 99, { dmg: DMG(1.8) });
    let t = 0; const suivi = 1.6, fige = Math.max(.75, .9 * b.D.T);
    while (t < suivi) { t += G.dtE; const c0 = cible(); h.x += (c0.x - h.x) * Math.min(1, G.dtE * 2.2); h.y += (c0.y - h.y) * Math.min(1, G.dtE * 2.2); h.t = 0; yield 0; }
    h.warn = fige; h.t = 0; Son.play('tele');
    yield fige + .5;
    G.secoue(14);
  }
});
Object.assign(POIDS, { frappeChaine: 1.5, pilonnage: 2, croixFeu: 2, cadran: 2.5, anneauxFeu: 2.5, artillerie: 2, fractures: 2, poingCeleste: 1.5 });
Object.assign(MIN_SALLE, { pilonnage: 2, cadran: 3, anneauxFeu: 3, fractures: 2 });
const ATK_ZONE_NOUV = ['frappeChaine', 'pilonnage', 'croixFeu', 'cadran', 'anneauxFeu', 'artillerie', 'fractures', 'poingCeleste'];
