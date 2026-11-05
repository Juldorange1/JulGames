'use strict';
/* Colosses — deux colosses aux mécanismes inédits.
   • Le Reflet : il se tient toujours à l'opposé de toi (comme ton reflet dans un miroir) et son attaque « Reflet »
     copie ton arme principale (même famille d'arme que la tienne). Pendant qu'il copie, il est fragile (×1,6).
   • L'Inverseur : il annonce un compte à rebours, puis inverse tes commandes de déplacement quelques secondes
     (haut ↔ bas, gauche ↔ droite). Pendant l'inversion, il ne tire que des anneaux lents et encaisse ×1,5. */

// ---------- inversion des commandes (annoncée par un compte à rebours) ----------
G.inverse = 0; G.inversePrep = 0;
const _downInv = Input.down;
Input.down = function (c) {
  if (G.inverse > 0 && G.etat === 'combat') {
    const K = TOUCHES(), o = { ArrowUp: 'ArrowDown', ArrowDown: 'ArrowUp', ArrowLeft: 'ArrowRight', ArrowRight: 'ArrowLeft' };
    o[K.haut] = K.bas; o[K.bas] = K.haut; o[K.gauche] = K.droite; o[K.droite] = K.gauche;
    if (o[c] !== undefined) c = o[c];
  }
  return _downInv.call(this, c);
};
function finInversion() { G.inverse = 0; G.inversePrep = 0; }
const _majInv = majCombat;
majCombat = function (dt) {
  const t0 = G.t;
  _majInv.apply(this, arguments);
  const d = Math.max(0, G.t - t0);
  if (G.inverse > 0) { G.inverse = Math.max(0, G.inverse - d); if (!G.inverse) { G.texte(G.p.x, G.p.y - 30, 'Commandes normales', '#c9b6ff', 17); } }
  if (G.inversePrep > 0) G.inversePrep = Math.max(0, G.inversePrep - d);
  if (G.boss && G.boss.mort) finInversion();
};
const _entrerInv = G.entrerSalle;
G.entrerSalle = function () { finInversion(); return _entrerInv.apply(this, arguments); };
const _mortInv = G.mortJoueur;
G.mortJoueur = function () { finInversion(); return _mortInv.apply(this, arguments); };
// à l'écran : compte à rebours, puis cadre violet + temps restant
const _hudInv = dessinerHUD;
dessinerHUD = function (c) {
  _hudInv(c);
  if (G.etat !== 'combat' && G.etat !== 'pause') return;
  if (G.inversePrep > 0) {
    c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
    const n = Math.ceil(G.inversePrep), k = G.inversePrep % 1;
    c.globalAlpha = .55 + .45 * k;
    texteOmbre(c, '⇄ Commandes inversées dans ' + n, W / 2, H * .3, '#d6b8ff', `900 34px ${POLICE}`, 7);
    c.restore();
  }
  if (G.inverse > 0) {
    c.save();
    const k = .5 + .5 * Math.sin(G.t * 6);
    c.strokeStyle = `rgba(190,120,255,${.45 + .3 * k})`; c.lineWidth = 14; c.strokeRect(7, 7, W - 14, H - 14);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    texteOmbre(c, '⇄ COMMANDES INVERSÉES · ' + G.inverse.toFixed(1) + ' s', W / 2, 112, '#e2ccff', `900 26px ${POLICE}`, 6);
    c.font = `700 16px ${POLICE}`; c.fillStyle = '#ffd86b'; c.fillText('Il encaisse ×1,5 : frappe !', W / 2, 140);
    c.restore();
  }
};

// ---------- déplacement en miroir (Reflet) ----------
// (le cas « miroir » est géré dans bougerBoss : toujours à l'opposé du joueur par rapport au centre de l'arène)

// ---------- Le Reflet ----------
espece('reflet', {
  pv: 1, nom: 'le Reflet', hue: 195, r: 50, mouv: 'miroir', tourne: [2, 2.6],
  forme: { style: 'reflet', cotes: 4, pics: 0, yeux: 1, sats: 0, anneaux: 0, rot: 0, creux: .5 },
  meca: 'Il se tient toujours à l\'opposé de toi, comme ton reflet. Son attaque « Reflet » copie ton arme principale ; pendant qu\'il la copie, son miroir est fragile : ×1,6.',
  init(b) { b.s.copie = false; },
  mult(b) { return b.s.copie && b.main && b.main.id === 'rf_copie' ? 1.6 : 1; },
  phases: [
    { cycle: ['rf_copie', 'rf_symetrie', 'laserCible', 'rf_copie', 'rf_eclats'] },
    { cycle: ['rf_copie', 'rf_eclats', 'rf_symetrie', 'rf_copie', 'vagueZones', 'rf_symetrie'] }
  ]
});
defEsp('rf_copie', { nom: 'Reflet', cat: 'balles', conseil: 'Il copie ton arme : trois volées qui ressemblent à tes propres tirs. Esquive comme si tu te tirais dessus, et frappe-le pendant ce temps (×1,6).',
  params: P0,
  *gen(b, p) {
    const fam = FAMILLE[G.ars.p] || 'fusil', w0 = Math.max(.8, b.D.T);
    b.s.copie = true; b.s.copieFam = fam;
    G.texte(b.x, b.y - b.r - 26, 'Il copie ton arme !', '#9fe8ff', 19); Son.play('tele');
    b.wind = w0; b.windMax = w0; yield* attendre(w0);
    const col = '#9fe8ff';
    for (let v = 0; v < 3; v++) {
      const a = vise(b), t = cible();
      if (fam === 'fusil') { for (let k = 0; k < 6; k++) { EB(b.x, b.y, vise(b) + R.range(-.07, .07), 330 * b.D.S, { r: 6, col }); Son.play('tir1'); yield .08; } }
      else if (fam === 'lame') { const n = 9; for (let k = 0; k < n; k++) EB(b.x, b.y, a + (k - (n - 1) / 2) * .13, 250 * b.D.S, { r: 8, col }); Son.play('epee'); }
      else if (fam === 'trait') { rayon(b.x, b.y, a, 1600, 20, Math.max(.6, .7 * b.D.T), .15, { dmg: DMG(1.2) }); Son.play('tir2'); }
      else if (fam === 'explosif') { for (let k = 0; k < 3; k++) { const pt = G.arene.clampPt(t.x + (k ? R.range(-110, 110) : 0), t.y + (k ? R.range(-110, 110) : 0), 40); zoneC(pt.x, pt.y, 70, Math.max(.8, .95 * b.D.T), { dmg: DMG(1.2) }); } Son.play('tele'); }
      else { const n = 10; for (let k = 0; k < n; k++) EB(b.x, b.y, a + k * TAU / n, 150 * b.D.S, { r: 8, col, angv: v % 2 ? .7 : -.7, life: 5 }); Son.play('salve'); }
      yield* attendre(Math.max(.55, .7 * b.D.T));
    }
    yield* attendre(.5);
    b.s.copie = false;
    yield .3;
  }
});
defEsp('rf_symetrie', { nom: 'Symétrie', cat: 'zone', conseil: 'Trois paires de cercles : un sous toi, l\'autre à l\'endroit exactement opposé de l\'arène. Ne fuis pas vers ton reflet.',
  params: P0,
  *gen(b, p) {
    yield* prep(b, .35);
    const bb = G.arene.bb(), cx = bb.x + bb.w / 2, cy = bb.y + bb.h / 2, w0 = Math.max(.9, 1.05 * b.D.T);
    for (let i = 0; i < 3; i++) {
      const t = cible(), m = G.arene.clampPt(2 * cx - t.x, 2 * cy - t.y, 40);
      zoneC(t.x, t.y, 85, w0, { dmg: DMG(1.2) }); zoneC(m.x, m.y, 85, w0, { dmg: DMG(1.2) });
      Son.play('tele'); yield Math.max(.55, .65 * b.D.T);
    }
    yield w0;
  }
});
defEsp('rf_eclats', { nom: 'Miroir brisé', cat: 'balles', conseil: 'Deux anneaux d\'éclats qui rebondissent une fois sur les murs : le second est décalé, glisse d\'un demi-pas entre deux éclats.',
  params: P0,
  *gen(b, p) {
    yield* prep(b, .45);
    const n = Math.round(14 * Math.min(1.35, b.D.C));
    for (let v = 0; v < 2; v++) {
      const a0 = vise(b) + (v ? Math.PI / n : 0);
      for (let k = 0; k < n; k++) EB(b.x, b.y, a0 + k * TAU / n, 190 * b.D.S, { r: 7, bounce: 1, col: '#d8f4ff', life: 5 });
      Son.play('verre'); yield .7;
    }
    yield .5;
  }
});

// ---------- L'Inverseur ----------
espece('inverseur', {
  pv: .95, nom: 'l\'Inverseur', hue: 275, r: 52, mouv: 'ancre', tourne: [1.4, 1.8],
  forme: { style: 'sablier', cotes: 6, pics: 0, yeux: 1, sats: 0, anneaux: 0, rot: 0, creux: .5 },
  meca: 'Il annonce un compte à rebours, puis tes commandes de déplacement sont inversées 5 s (haut ↔ bas, gauche ↔ droite). Pendant l\'inversion il ne tire que des anneaux lents et encaisse ×1,5.',
  mult(b) { return G.inverse > 0 ? 1.5 : 1; },
  phases: [
    { cycle: ['iv_renverse', 'iv_bascule', 'serres', 'iv_sablier', 'artillerie'] },
    { cycle: ['iv_renverse', 'iv_sablier', 'iv_bascule', 'laserCible', 'iv_renverse', 'piliersFeu'] }
  ]
});
defEsp('iv_renverse', { nom: 'Renversement', cat: 'terrain', conseil: 'Un compte à rebours s\'affiche, puis tes commandes sont inversées 5 s. Bouge par petites touches entre les anneaux lents, et frappe : il encaisse ×1,5.',
  params: P0,
  *gen(b, p) {
    const prep = Math.max(2, 2.6 * b.D.T);
    G.inversePrep = prep; Son.play('tele');
    b.wind = prep; b.windMax = prep;
    yield* attendre(prep);
    const dur = Save.d.diff === 'apprenti' ? 4 : 5;
    G.inversePrep = 0; G.inverse = dur; Son.play('gong'); G.secoue(6);
    G.fx.push({ kind: 'anneau', x: b.x, y: b.y, r0: b.r, r1: 900, t: 0, dur: .6, col: '#c77dff' });
    const n = Math.round(14 * Math.min(1.3, b.D.C)), demi = Math.floor(n / 2);
    for (let v = 0; v < 3; v++) {
      const a0 = R() * TAU;
      for (let k = 0; k < n; k++) { if (k % demi === 0 || k % demi === 1) continue; EB(b.x, b.y, a0 + k * TAU / n, 115 * b.D.S, { r: 8, col: '#c77dff' }); }
      Son.play('salve'); yield* attendre(dur / 3);
    }
  }
});
defEsp('iv_bascule', { nom: 'Bascule', cat: 'zone', conseil: 'Une moitié de l\'arène frappe, puis l\'autre, puis la première : reste près de la ligne du milieu et passe de l\'autre côté juste après chaque frappe.',
  params: P0,
  *gen(b, p) {
    yield* prep(b, .4);
    const bb = G.arene.bb(), w0 = Math.max(1.1, 1.3 * b.D.T), pas = Math.max(.75, .9 * b.D.T), vert = R.chance(.5), t = cible();
    const moities = vert ? [[bb.x, bb.y, bb.w / 2, bb.h], [bb.x + bb.w / 2, bb.y, bb.w / 2, bb.h]] : [[bb.x, bb.y, bb.w, bb.h / 2], [bb.x, bb.y + bb.h / 2, bb.w, bb.h / 2]];
    const ici = vert ? (t.x < bb.x + bb.w / 2 ? 0 : 1) : (t.y < bb.y + bb.h / 2 ? 0 : 1);
    [ici, 1 - ici, ici].forEach((m, i) => { const [x, y, w, h] = moities[m]; zoneR(x, y, w, h, w0 + i * pas, { dmg: DMG(1.3) }); });
    Son.play('tele');
    yield w0 + 3 * pas + .2;
  }
});
defEsp('iv_sablier', { nom: 'Sablier', cat: 'balles', conseil: 'Du sable tombe en colonnes avec une colonne vide, puis remonte d\'un coup : place-toi dans la colonne vide et restes-y jusqu\'à ce qu\'il soit reparti.',
  params: P0,
  *gen(b, p) {
    yield* prep(b, .45);
    const bb = G.arene.bb(), n = 9, t = cible(), list = [];
    const trou = clamp(Math.floor((t.x - bb.x) / (bb.w / n)) + R.pick([-2, 2]), 1, n - 2);
    G.hz.push({ kind: 'apercuC', x: bb.x + (trou + .5) * bb.w / n, y: bb.y + bb.h / 2, r: bb.w / n * .45, t: 0, dur: 1.4 });
    for (let k = 0; k < n; k++) {
      if (k === trou) continue;
      const x = bb.x + (k + .5) * bb.w / n;
      for (let j = 0; j < 4; j++) list.push(EB(x + R.range(-10, 10), bb.y + 6 - j * 34, Math.PI / 2, 170 * b.D.S, { r: 9, col: '#e8c8ff', life: 9, ext: true }));
    }
    Son.play('salve');
    yield* attendre(Math.max(1.9, 2.3 / b.D.S));
    for (const e of list) if (!e.dead) { e.vx = -e.vx; e.vy = -e.vy * 1.15; }
    Son.play('tele'); G.secoue(4);
    yield 1.4;
  }
});
ESP_ORDRE.push('reflet', 'inverseur');
// à partir de quelle salle ils peuvent apparaître (sans changer l'ordre des autres)
Object.assign(ESP_DES, { reflet: 7, inverseur: 11 });
Object.assign(THEME_ESPECE, { reflet: 'temple', inverseur: 'neant' });
Object.assign(ELEM_ESPECE, { reflet: 'lumiere', inverseur: 'arcane' });
Object.assign(MATIERE_ESP, { reflet: 'metal', inverseur: 'ether' });
Object.assign(PHRASES_ESP, {
  reflet: ['Je suis toi, en mieux.', 'Chaque coup que tu donnes, je le rends.'],
  inverseur: ['Ta gauche est ma droite.', 'Tout ce que tu crois savoir s\'inverse.']
});
STYLES_MACHINE.reflet = 1; STYLES_MACHINE.sablier = 1;
Object.assign(POIDS, { rf_copie: 2, rf_symetrie: 2, rf_eclats: 2, iv_renverse: 2, iv_bascule: 2, iv_sablier: 2 });
// titres « Fléau » des nouvelles espèces
if (typeof TITRES !== 'undefined') for (const e of ['reflet', 'inverseur']) TITRES.push({ id: 'fl_' + e, esp: e, nom: 'Fléau ' + deNom(ESPECES[e].nom), desc: 'Réussir les 5 défis de maîtrise ' + deNom(ESPECES[e].nom) + '.', ok: () => { const m = maitriseSave()[e]; return !!m && DEFIS_M.every(D => m[D.k]); } });

// ---------- Silhouettes ----------
// le Reflet : un grand miroir-losange à facettes, avec ton propre reflet à l'intérieur
FORMES.reflet = function (c, b, r, t, h, ph) {
  c.save();
  const cop = b.s.copie, k = .5 + .5 * Math.sin(t * 3);
  // cadre
  c.beginPath(); c.moveTo(0, -r * 1.05); c.lineTo(r * .8, 0); c.lineTo(0, r * 1.05); c.lineTo(-r * .8, 0); c.closePath();
  const g = c.createLinearGradient(-r, -r, r, r); g.addColorStop(0, hsl(h, 40, 80)); g.addColorStop(.5, hsl(h, 50, 30)); g.addColorStop(1, hsl(h, 60, 12));
  c.fillStyle = g; c.fill(); contour(c, h, ph, 3);
  // vitre
  c.beginPath(); c.moveTo(0, -r * .82); c.lineTo(r * .6, 0); c.lineTo(0, r * .82); c.lineTo(-r * .6, 0); c.closePath();
  const v = c.createLinearGradient(0, -r, 0, r); v.addColorStop(0, cop ? 'rgba(170,240,255,.95)' : 'rgba(150,200,230,.75)'); v.addColorStop(1, 'rgba(20,40,70,.9)');
  c.fillStyle = v; c.fill();
  c.save(); c.clip();
  // ton reflet (petit héros vu de l'autre côté)
  if (G.p) {
    const a = ang(b.x, b.y, G.p.x, G.p.y);
    c.fillStyle = 'rgba(10,20,40,.55)'; c.beginPath(); c.arc(0, r * .12, r * .26, 0, TAU); c.fill();
    c.fillStyle = 'rgba(200,240,255,.7)'; c.beginPath(); c.arc(0, -r * .2, r * .14, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(200,240,255,.8)'; c.lineWidth = r * .07; c.beginPath(); c.moveTo(0, r * .05); c.lineTo(Math.cos(Math.PI - a) * r * .4, r * .05 + Math.sin(a) * r * .25); c.stroke();
  }
  // reflet qui balaie la vitre
  const x = ((t * .6) % 2 - 1) * r * 1.6;
  c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(x - r * .1, -r); c.lineTo(x + r * .12, -r); c.lineTo(x - r * .3, r); c.lineTo(x - r * .52, r); c.closePath(); c.fill();
  c.restore();
  // facettes
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(0, -r * 1.05); c.lineTo(0, -r * .82); c.moveTo(r * .8, 0); c.lineTo(r * .6, 0); c.moveTo(0, r * 1.05); c.lineTo(0, r * .82); c.moveTo(-r * .8, 0); c.lineTo(-r * .6, 0); c.stroke();
  // éclats en orbite
  for (let i = 0; i < 4; i++) {
    const a = t * .8 + i * TAU / 4, rr = r * (1.25 + .05 * Math.sin(t * 3 + i));
    c.save(); c.translate(Math.cos(a) * rr, Math.sin(a) * rr); c.rotate(a * 2);
    c.fillStyle = hsl(h, 60, 75, .9); c.beginPath(); c.moveTo(0, -r * .14); c.lineTo(r * .07, 0); c.lineTo(0, r * .14); c.lineTo(-r * .07, 0); c.closePath(); c.fill();
    c.restore();
  }
  if (cop) {
    lueur(c, 'rgba(150,240,255,.75)', r * (1.3 + .2 * k));
    if (G.ars && G.ars.p) { c.fillStyle = 'rgba(10,30,50,.75)'; c.beginPath(); c.arc(0, -r * 1.5, r * .36, 0, TAU); c.fill(); c.strokeStyle = '#9fe8ff'; c.lineWidth = 2; c.stroke(); icoDessin(c, 'p:' + G.ars.p, 0, -r * 1.5, r * .5, '#dff8ff'); }
  } else lueur(c, hsl(h, 100, 70, .25 + .15 * k), r * .9);
  c.restore();
};
// l'Inverseur : un sablier qui se retourne pendant l'inversion
FORMES.sablier = function (c, b, r, t, h, ph) {
  c.save();
  const inv = G.inverse > 0, prep = G.inversePrep > 0;
  b.s.rot = b.s.rot || 0;
  const but = inv ? Math.PI : 0; b.s.rot += (but - b.s.rot) * Math.min(1, G.dtE * 6 || .1);
  c.rotate(b.s.rot + (prep ? Math.sin(t * 30) * .05 : 0));
  // montants
  c.strokeStyle = hsl(h, 30, 22); c.lineWidth = r * .12; c.lineCap = 'round';
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * r * .78, -r * 1.02); c.lineTo(s * r * .78, r * 1.02); c.stroke(); }
  c.lineCap = 'butt';
  // ampoules
  c.beginPath(); c.moveTo(-r * .66, -r * .92); c.lineTo(r * .66, -r * .92); c.quadraticCurveTo(r * .62, -r * .25, r * .08, 0); c.quadraticCurveTo(r * .62, r * .25, r * .66, r * .92); c.lineTo(-r * .66, r * .92); c.quadraticCurveTo(-r * .62, r * .25, -r * .08, 0); c.quadraticCurveTo(-r * .62, -r * .25, -r * .66, -r * .92); c.closePath();
  c.fillStyle = degrade(c, r, h, 38); c.fill(); contour(c, h, ph, 2.5);
  // sable : il coule vers le bas (vu du sablier)
  const s = (t * .15) % 1;
  c.fillStyle = hsl(h, 90, 70, .9);
  c.beginPath(); c.moveTo(-r * .5 * (1 - s), -r * .3 - r * .5 * (1 - s)); c.lineTo(r * .5 * (1 - s), -r * .3 - r * .5 * (1 - s)); c.lineTo(0, -r * .05); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(-r * .55, r * .9); c.lineTo(r * .55, r * .9); c.lineTo(0, r * (.9 - .55 * (.3 + s * .7))); c.closePath(); c.fill();
  c.fillRect(-1.5, -r * .05, 3, r * .75);
  // plateaux
  for (const y of [-1.02, 1.02]) { c.fillStyle = hsl(h, 40, 30); c.fillRect(-r * .95, y * r - r * .09, r * 1.9, r * .18); c.strokeStyle = hsl(h, 100, 66, .8); c.lineWidth = 1.5; c.strokeRect(-r * .95, y * r - r * .09, r * 1.9, r * .18); }
  // œil central
  lueur(c, inv ? 'rgba(255,220,90,.9)' : hsl(h, 100, 65, .7), r * (inv ? .7 : .45));
  c.fillStyle = inv ? '#fff3c0' : hsl(h, 100, 85); c.beginPath(); c.arc(0, 0, r * .1, 0, TAU); c.fill();
  c.restore();
  if (inv || prep) { c.save(); c.strokeStyle = `rgba(200,140,255,${.4 + .3 * Math.sin(t * 8)})`; c.lineWidth = 3; c.setLineDash([10, 8]); c.lineDashOffset = -t * 40; c.beginPath(); c.arc(0, 0, r * 1.45, 0, TAU); c.stroke(); c.restore(); }
};
