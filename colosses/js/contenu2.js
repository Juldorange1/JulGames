'use strict';
/* Colosses — contenu de plus : 6 attaques annoncées, 2 espèces (la Mante, le Titan) avec leur silhouette,
   4 armes principales, 3 attaques spéciales, 2 talents. Tout reste esquivable et rien ne contre un boss précis. */

// ---------- Attaques communes (n'importe quel boss peut les avoir) ----------
nouvelleAttaque('serres', { nom: 'Serres', cat: 'corps', conseil: 'Trois coups en éventail devant le boss, à gauche, à droite puis au centre : recule hors de sa portée ou passe derrière lui.',
  params: (r, D) => ({ R: r.range(240, 290) }),
  *gen(b, p) {
    b.ctl = true;
    const w0 = Math.max(.7, .8 * b.D.T);
    for (const dec of [-.55, .55, 0]) {
      const a = vise(b) + dec; b.facing = a;
      secteur(b.x, b.y, a - .5, a + .5, p.R, w0, { dmg: DMG(1.3) }); b.wind = w0; b.windMax = w0;
      yield* attendre(w0 + .1);
      b.x += Math.cos(a) * 30; b.y += Math.sin(a) * 30; G.arene.contenir(b, b.r); Son.play('epee');
    }
    b.ctl = false; yield .5;
  }
});
nouvelleAttaque('vagueZones', { nom: 'Vague de frappes', cat: 'zone', conseil: 'Des bandes frappent l\'arène d\'un bord à l\'autre, avec toujours un trou au même endroit dans chaque bande : trouve-le et attends-y.',
  params: (r, D) => ({ n: 6, vertical: r.chance(.5) }),
  *gen(b, p) {
    yield* prep(b, .5);
    const bb = G.arene.bb(), w0 = Math.max(1.1, 1.25 * b.D.T), pas = Math.max(.3, .36 * b.D.T), t = cible();
    if (p.vertical) {
      const cw = bb.w / p.n, trou = clamp(t.y + R.range(-120, 120), bb.y + 60, bb.y + bb.h - 60);
      for (let i = 0; i < p.n; i++) { const x = bb.x + i * cw; zoneR(x, bb.y, cw, trou - 55 - bb.y, w0 + i * pas); zoneR(x, trou + 55, cw, bb.y + bb.h - trou - 55, w0 + i * pas); }
    } else {
      const ch = bb.h / p.n, trou = clamp(t.x + R.range(-160, 160), bb.x + 60, bb.x + bb.w - 60);
      for (let i = 0; i < p.n; i++) { const y = bb.y + i * ch; zoneR(bb.x, y, trou - 55 - bb.x, ch, w0 + i * pas); zoneR(trou + 55, y, bb.x + bb.w - trou - 55, ch, w0 + i * pas); }
    }
    Son.play('tele');
    yield w0 + p.n * pas + .3;
  }
});
nouvelleAttaque('piliersFeu', { nom: 'Piliers de flammes', cat: 'terrain', conseil: 'Cinq cercles s\'allument puis deviennent des colonnes de feu pendant 4 s : sors des cercles, puis contourne les colonnes.',
  params: (r, D) => ({ n: r.int(4, 6) }),
  *gen(b, p) {
    yield* prep(b, .45);
    const t = cible();
    for (let i = 0; i < p.n; i++) {
      const a = i * TAU / p.n + R() * .6, d = i === 0 ? 0 : R.range(140, 260), pt = G.arene.clampPt(t.x + Math.cos(a) * d, t.y + Math.sin(a) * d, 50);
      zoneC(pt.x, pt.y, 58, Math.max(.9, 1.05 * b.D.T), { dmg: DMG(1.2), apres: h => G.hz.push({ kind: 'flaque', x: h.x, y: h.y, r: 58, life: 4, t: .41, dmg: DMG(.7), src: 'piliersFeu', feu: true }) });
    }
    Son.play('tele');
    yield 1.6;
  }
});
nouvelleAttaque('laserCible', { nom: 'Visée laser', cat: 'rayon', conseil: 'Trois tirs : le trait te suit puis se fige (il devient blanc). À ce moment, fais un pas de côté.',
  params: (r, D) => ({ n: 3 }),
  *gen(b, p) {
    b.ctl = true;
    for (let i = 0; i < p.n; i++) {
      const w0 = Math.max(1, 1.2 * b.D.T);
      rayon(b.x, b.y, vise(b), 1500, 30, w0, .25, { suit: b, track: 3.5, lock: .5, dmg: DMG(1.3) });
      b.wind = w0; b.windMax = w0;
      yield w0 + .35;
    }
    b.ctl = false; yield .3;
  }
});
nouvelleAttaque('pluieEtoiles', { nom: 'Pluie d\'étoiles', cat: 'zone', conseil: 'Des lignes d\'étoiles tombent en travers de l\'arène, une ligne après l\'autre : marche dans le même sens qu\'elles, entre deux lignes.',
  params: (r, D) => ({ lignes: r.int(4, 5), a: r() * TAU }),
  *gen(b, p) {
    yield* prep(b, .45);
    const t = cible(), dx = Math.cos(p.a), dy = Math.sin(p.a), nx = -dy, ny = dx, w0 = Math.max(.9, 1.05 * b.D.T);
    for (let l = 0; l < p.lignes; l++) {
      const off = (l - (p.lignes - 1) / 2) * 170;
      for (let k = -5; k <= 5; k++) { const pt = { x: t.x + dx * off + nx * k * 95, y: t.y + dy * off + ny * k * 95 }; if (!G.arene.dedans(pt.x, pt.y, 10)) continue; zoneC(pt.x, pt.y, 46, w0, { dmg: DMG(1.1) }); }
      yield Math.max(.35, .45 * b.D.T);
    }
    yield 1;
  }
});
nouvelleAttaque('ecrasements', { nom: 'Écrasements numérotés', cat: 'corps', conseil: 'Le boss marque trois points d\'atterrissage numérotés puis saute de l\'un à l\'autre : ne reste sur aucun des trois.',
  params: (r, D) => ({ n: 3 }),
  *gen(b, p) {
    b.ctl = true;
    const t = cible(), pts = [], w0 = Math.max(1.2, 1.4 * b.D.T), pas = Math.max(.6, .7 * b.D.T);
    for (let i = 0; i < p.n; i++) { const a = R() * TAU, d = i ? R.range(160, 300) : 0; pts.push(G.arene.clampPt(t.x + Math.cos(a) * d, t.y + Math.sin(a) * d, b.r)); }
    pts.forEach((pt, i) => zoneC(pt.x, pt.y, b.r + 50, w0 + i * pas, { num: i + 1, dmg: DMG(1.4) }));
    yield .2;
    let depart = { x: b.x, y: b.y };
    for (let i = 0; i < p.n; i++) {
      const fin = pts[i], dur = (i ? pas : w0 - .2); let tt = 0; b.air = true;
      while (tt < dur) { tt += G.dtE; const k = Math.min(1, tt / dur); b.x = lerp(depart.x, fin.x, k); b.y = lerp(depart.y, fin.y, k); b.haut = Math.sin(k * Math.PI) * 110; yield 0; }
      b.air = false; b.haut = 0; G.secoue(9); depart = { x: b.x, y: b.y };
    }
    b.ctl = false; yield .5;
  }
});
Object.assign(POIDS, { serres: 2, vagueZones: 2.5, piliersFeu: 2, laserCible: 2, pluieEtoiles: 2, ecrasements: 2 });
Object.assign(MIN_SALLE, { vagueZones: 3, piliersFeu: 3, ecrasements: 2 });
HZ.flaque.draw = (function (orig) { return function (h, c) { if (!h.feu) return orig.call(this, h, c); const k = Math.min(1, (h.life - h.t) * 2); c.globalAlpha = k; sprite(c, 'flame_0' + (1 + ((G.t * 12 | 0) % 2) * 2), '#ff7a2a', h.x, h.y - 10, h.r * 2.2, Math.sin(G.t * 5) * .1, .9, true); c.globalCompositeOperation = 'lighter'; c.drawImage(glow('rgba(255,120,30,.5)', h.r * 1.2), h.x - h.r * 1.2, h.y - h.r * 1.2); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; }; })(HZ.flaque.draw);

// ---------- La Mante ----------
espece('mante', {
  pv: .85, nom: 'la Mante', hue: 95, r: 46, mouv: 'traqueur', tourne: [2.2, 2.8],
  forme: { style: 'mante', cotes: 6, pics: 0, yeux: 2, sats: 0, anneaux: 0, rot: 0, creux: .5 },
  meca: 'Elle fauche trois fois devant elle. Si aucun de ses trois coups ne t\'a touché, elle reste en garde ouverte : ×2,5 pendant 2,5 s. Touché, rien.',
  phases: [
    { cycle: ['ma_fauchage', 'frappeChaine', 'ma_bond', 'ma_fauchage', 'artillerie'] },
    { cycle: ['ma_fauchage', 'ma_bond', 'croixFeu', 'ma_fauchage', 'laserCible', 'ma_bond'] }
  ]
});
defEsp('ma_fauchage', { nom: 'Fauchage', cat: 'corps', conseil: 'Trois coups de faux en cône, chacun annoncé : esquive les trois sans être touché et elle s\'ouvre en grand.',
  params: P0,
  *gen(b, p) {
    b.ctl = true;
    const c0 = G.coupsPris, w0 = Math.max(.6, .7 * b.D.T);
    for (let i = 0; i < 3; i++) {
      const a = vise(b); b.facing = a;
      secteur(b.x, b.y, a - .7, a + .7, 270, w0, { dmg: DMG(1.3) }); b.wind = w0; b.windMax = w0;
      yield* attendre(w0 + .12);
      b.x += Math.cos(a) * 45; b.y += Math.sin(a) * 45; G.arene.contenir(b, b.r); Son.play('epee'); G.secoue(4);
    }
    b.ctl = false;
    if (G.coupsPris === c0) { ouvrir(b, 2.5, 2.5, 'GARDE OUVERTE !'); G.etourdir(b, 2.5, ''); }
    yield .4;
  }
});
defEsp('ma_bond', { nom: 'Bond de la mante', cat: 'corps', conseil: 'Elle bondit sur l\'endroit marqué : sors du cercle, puis méfie-toi de la faux qui suit.',
  params: P0,
  *gen(b, p) {
    b.ctl = true;
    const t = cible(), pt = G.arene.clampPt(t.x, t.y, b.r), w0 = Math.max(.85, b.D.T);
    zoneC(pt.x, pt.y, b.r + 45, w0, { dmg: DMG(1.3) });
    const sx = b.x, sy = b.y; let tt = 0; b.air = true;
    while (tt < w0) { tt += G.dtE; const k = Math.min(1, tt / w0); b.x = lerp(sx, pt.x, k); b.y = lerp(sy, pt.y, k); b.haut = Math.sin(k * Math.PI) * 130; yield 0; }
    b.air = false; b.haut = 0; G.secoue(8);
    const a = vise(b); secteur(b.x, b.y, a - .6, a + .6, 220, Math.max(.55, .65 * b.D.T), { dmg: DMG(1.1) });
    yield .9; b.ctl = false;
  }
});

// ---------- Le Titan ----------
// quatre plaques d'armure (avant, droite, arrière, gauche) : un côté blindé n'encaisse que 35 %, et sa plaque s'use ;
// une plaque brisée laisse ce côté à nu (×1,3) jusqu'à la fin du combat
espece('titan', {
  pv: .95, nom: 'le Titan', hue: 30, r: 58, mouv: 'traqueur', tourne: [.8, 1.1],
  forme: { style: 'titan', cotes: 4, pics: 0, yeux: 1, sats: 0, anneaux: 0, rot: 0, creux: .5 },
  meca: 'Quatre plaques d\'armure le protègent (×0,35). Chaque côté que tu frappes use sa plaque ; brisée, ce côté encaisse ×1,3. Concentre-toi sur un seul côté.',
  init(b) { b.s.plaques = [0, 1, 2, 3].map(() => ({ hp: b.hpMax * .07, max: b.hpMax * .07 })); },
  mult(b, o) { let a = ang(b.x, b.y, o.x, o.y) - b.facing; a = ((a % TAU) + TAU + Math.PI / 4) % TAU; const i = Math.floor(a / (Math.PI / 2)) % 4; b.s.cote = i; return b.s.plaques[i].hp > 0 ? .35 : 1.3; },
  absorbe(b, d) { const pl = b.s.plaques[b.s.cote]; if (pl && pl.hp > 0) { pl.hp -= d / .35; if (pl.hp <= 0) { G.annonce('Plaque brisée !', '#ffd24d', 1.2); Son.play('verre'); G.secoue(10); for (let k = 0; k < 12; k++) G.etincelle(b.x, b.y, '#ffcf8a', 2); } } return false; },
  phases: [
    { cycle: ['tn_poings', 'laserCible', 'tn_canon', 'tn_poings', 'piliersFeu'] },
    { cycle: ['tn_poings', 'tn_canon', 'vagueZones', 'tn_poings', 'ecrasements', 'tn_canon'] }
  ]
});
defEsp('tn_poings', { nom: 'Poings du Titan', cat: 'zone', conseil: 'Quatre grands poings s\'abattent l\'un après l\'autre sur les carrés marqués, à gauche puis à droite : va dans un carré qui vient d\'être frappé.',
  params: P0,
  *gen(b, p) {
    yield* prep(b, .4);
    const w0 = Math.max(1, 1.15 * b.D.T), pas = Math.max(.45, .55 * b.D.T), t = cible(), s = 200;
    for (let i = 0; i < 4; i++) { const cx = t.x + (i % 2 ? 1 : -1) * 110, cy = t.y + (i < 2 ? -1 : 1) * 60; zoneR(cx - s / 2, cy - s / 2, s, s, w0 + i * pas, { dmg: DMG(1.5) }); }
    yield w0 + 4 * pas + .2;
  }
});
defEsp('tn_canon', { nom: 'Canon d\'épaule', cat: 'rayon', conseil: 'Il charge longtemps puis balaie un petit arc : la zone pâle montre l\'arc entier, sors-en par le côté.',
  params: P0,
  *gen(b, p) {
    b.ctl = true;
    const a = vise(b), s = R.sign(), w0 = Math.max(1.4, 1.5 * b.D.T), arc = .9;
    b.wind = w0; b.windMax = w0;
    rayon(b.x, b.y, a - s * arc / 2, 1500, 60, w0, 1.1, { suit: b, balaye: { de: a - s * arc / 2, vers: a + s * arc / 2, dur: 1.1 }, dmg: DMG(1.5) });
    yield* attendre(w0 + 1.2);
    b.ctl = false; yield .4;
  }
});
ESP_ORDRE.splice(5, 0, 'mante'); ESP_ORDRE.splice(10, 0, 'titan');
Object.assign(THEME_ESPECE, { mante: 'ruines', titan: 'metal' });

// ---------- Silhouettes ----------
FORMES.mante = function (c, b, r, t, h, ph, f) {
  const fa = b.facing;
  c.save(); c.rotate(fa);
  // pattes fines
  c.strokeStyle = hsl(h, 50, 22); c.lineWidth = r * .06; c.lineCap = 'round';
  for (const s of [-1, 1]) for (const k of [0, 1]) { const x0 = -r * (.1 + k * .35), m = Math.sin(t * 6 + k + s) * r * .08; c.beginPath(); c.moveTo(x0, s * r * .2); c.lineTo(x0 - r * .15 + m, s * r * .7); c.lineTo(x0 - r * .35, s * r * 1.05); c.stroke(); }
  // abdomen segmenté
  for (let i = 3; i >= 0; i--) { const x = -r * (.45 + i * .26), rr = r * (.38 - i * .05); c.fillStyle = degrade(c, rr, h, 46 - i * 4); c.beginPath(); c.ellipse(x, 0, rr * 1.1, rr * .85, 0, 0, TAU); c.fill(); c.strokeStyle = hsl(h, 70, 40, .6); c.lineWidth = 1.5; c.stroke(); }
  // thorax
  c.fillStyle = degrade(c, r * .4, h, 40); c.beginPath(); c.ellipse(r * .05, 0, r * .45, r * .26, 0, 0, TAU); c.fill(); contour(c, h, ph, 2);
  // faux : bras ravisseurs repliés, qui se déploient pendant l'annonce
  const dep = b.wind > 0 ? 1 - b.wind / (b.windMax || 1) : .15 + .1 * Math.sin(t * 3);
  for (const s of [-1, 1]) {
    const ex = r * .55, ey = s * r * .32, cx = ex + r * (.35 + .55 * dep), cy = s * r * (.55 - .2 * dep);
    c.strokeStyle = hsl(h, 55, 34); c.lineWidth = r * .19; c.lineCap = 'round'; c.beginPath(); c.moveTo(r * .15, s * r * .15); c.lineTo(ex, ey); c.lineTo(cx, cy); c.stroke(); c.strokeStyle = hsl(h, 70, 55, .6); c.lineWidth = r * .05; c.stroke();
    c.fillStyle = '#e8f0d8'; c.strokeStyle = hsl(h, 40, 18); c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(cx, cy); c.quadraticCurveTo(cx + r * .8, cy - s * r * .05, cx + r * 1.05, cy - s * r * .8); c.quadraticCurveTo(cx + r * .45, cy - s * r * .15, cx - r * .05, cy + s * r * .1); c.closePath(); c.fill(); c.stroke(); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(cx + r * .1, cy); c.quadraticCurveTo(cx + r * .7, cy - s * r * .1, cx + r * .95, cy - s * r * .7); c.stroke();
  }
  c.lineCap = 'butt';
  // tête triangulaire, grands yeux
  c.fillStyle = degrade(c, r * .3, h, 46); c.beginPath(); c.moveTo(r * .95, 0); c.lineTo(r * .5, -r * .3); c.lineTo(r * .45, r * .3); c.closePath(); c.fill(); contour(c, h, ph, 1.5);
  for (const s of [-1, 1]) { c.fillStyle = '#0a0f05'; c.beginPath(); c.ellipse(r * .55, s * r * .24, r * .12, r * .09, s * .5, 0, TAU); c.fill(); lueur(c, b.ouvert > 0 ? 'rgba(255,220,90,.9)' : hsl(h, 100, 60, .8), r * .14, r * .57, s * r * .24); }
  c.restore();
};
FORMES.titan = function (c, b, r, t, h, ph) {
  const fa = b.facing, pl = b.s.plaques || [];
  c.save(); c.rotate(fa);
  // coque
  c.fillStyle = degrade(c, r, h, 30); c.beginPath(); c.rect(-r * .75, -r * .75, r * 1.5, r * 1.5); c.fill(); contour(c, h, ph, 2.5);
  // noyau
  const ch = .5 + .3 * Math.sin(t * 4) + (b.ouvert > 0 ? .5 : 0);
  lueur(c, b.ouvert > 0 ? 'rgba(255,220,90,.9)' : hsl(h, 100, 55, .5 + .3 * ch), r * .6);
  c.fillStyle = hsl(h, 100, 70); c.beginPath(); c.arc(0, 0, r * .2, 0, TAU); c.fill();
  c.strokeStyle = hsl(h, 20, 15); c.lineWidth = 3; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; c.beginPath(); c.moveTo(Math.cos(a) * r * .25, Math.sin(a) * r * .25); c.lineTo(Math.cos(a) * r * .7, Math.sin(a) * r * .7); c.stroke(); }
  // plaques : avant, droite, arrière, gauche
  for (let i = 0; i < 4; i++) {
    const p = pl[i]; if (p && p.hp <= 0) { c.fillStyle = 'rgba(255,200,120,.25)'; c.save(); c.rotate(i * Math.PI / 2); c.fillRect(r * .72, -r * .55, r * .12, r * 1.1); c.restore(); continue; }
    const k = p ? p.hp / p.max : 1;
    c.save(); c.rotate(i * Math.PI / 2);
    const g = c.createLinearGradient(r * .7, 0, r * 1.15, 0); g.addColorStop(0, hsl(h, 12, 26)); g.addColorStop(1, hsl(h, 10, 55));
    c.fillStyle = g; c.beginPath(); c.moveTo(r * .72, -r * .8); c.lineTo(r * 1.08, -r * .62); c.lineTo(r * 1.08, r * .62); c.lineTo(r * .72, r * .8); c.closePath(); c.fill();
    c.strokeStyle = hsl(h, 90, 60, .9); c.lineWidth = 2; c.stroke();
    c.fillStyle = 'rgba(0,0,0,.35)'; for (const y of [-.5, 0, .5]) { c.beginPath(); c.arc(r * .9, y * r, r * .045, 0, TAU); c.fill(); }
    if (k < .6) { c.strokeStyle = 'rgba(0,0,0,.7)'; c.lineWidth = 2; c.beginPath(); c.moveTo(r * .78, -r * .4); c.lineTo(r * .95, -r * .05); c.lineTo(r * .82, r * .3); c.stroke(); }
    c.fillStyle = k > .5 ? '#7dffb0' : k > .25 ? '#ffd24d' : '#ff4d6a'; c.fillRect(r * 1.12, -r * .5, r * .05, r * k);
    c.restore();
  }
  c.restore();
};
STYLES_MACHINE.titan = 1;

// ---------- Armes principales ----------
PRIM.push(
  { id: 'arbalete', nom: 'Arbalète lourde', ico: '🏹', desc: 'Lents carreaux très puissants qui traversent deux cibles.',
    tick(w, p, dt, held) { const n = cadence(w, dt, held, .75 / ST.pCad); for (let i = 0; i < n; i++) { const o = bout(p, 16); pShot(o.x, o.y, p.aim, 1250 * ST.pVel, { dmg: 88, r: 6, life: .9, pierce: 2, kind: 'fleche', col: '#e8d8b0' }); G.recul(p, 60); Son.play('tir2'); } } },
  { id: 'dagues', nom: 'Éventail de dagues', ico: '🗡', desc: 'Cinq dagues en éventail, courte portée : colle-toi au boss pour tout faire toucher.',
    tick(w, p, dt, held) { const n = cadence(w, dt, held, .38 / ST.pCad); for (let i = 0; i < n; i++) { for (let k = -2; k <= 2; k++) { const o = bout(p, 14); pShot(o.x, o.y, p.aim + k * .16, 780 * ST.pVel, { dmg: 9, r: 5, life: .32, kind: 'shuriken', col: '#cfd6e6' }); } Son.play('epee'); } } },
  { id: 'sismique', nom: 'Marteau sismique', ico: '🔨', desc: 'Frappe le sol : trois explosions avancent en ligne vers le viseur.',
    tick(w, p, dt, held) { const n = cadence(w, dt, held, .7 / ST.pCad); for (let i = 0; i < n; i++) { for (let k = 1; k <= 3; k++) { const pt = G.arene.clampPt(p.x + Math.cos(p.aim) * k * 85, p.y + Math.sin(p.aim) * k * 85, 0); G.allies.push({ kind: 'meteore', petit: true, prim: true, x: pt.x, y: pt.y, t: 0, dur: .08 * k, r: 58, dmg: 40 * ST.pDmg }); } G.secoue(2); Son.play('choc'); } } },
  { id: 'trident', nom: 'Arc à trois cordes', ico: '⫶', desc: 'Trois flèches parallèles : précises de loin, elles touchent toutes un gros boss.',
    tick(w, p, dt, held) { const n = cadence(w, dt, held, .3 / ST.pCad); for (let i = 0; i < n; i++) { const px = -Math.sin(p.aim), py = Math.cos(p.aim); for (let k = -1; k <= 1; k++) { const o = bout(p, 14); pShot(o.x + px * k * 12, o.y + py * k * 12, p.aim, 980 * ST.pVel, { dmg: 12, r: 4, life: .9, kind: 'fleche', col: '#bfffd0' }); } Son.play('tir1'); } } }
);
Object.assign(ELEM_ARME, { arbalete: 'acier', dagues: 'acier', sismique: 'nature', trident: 'nature' });
Object.assign(FAMILLE, { arbalete: 'trait', dagues: 'lame', sismique: 'explosif', trident: 'trait' });
Object.assign(PRIM_EQ, { arbalete: 1, dagues: 1, sismique: 1, trident: 1 });

// ---------- Attaques spéciales ----------
SPEC.push(
  { id: 'pluieMeteores', nom: 'Pluie de météores', ico: '☄', cout: 55, rech: 10, desc: 'Six météores s\'écrasent autour du viseur pendant une seconde.',
    use(p) { for (let i = 0; i < 6; i++) { const a = R() * TAU, d = R.range(0, 120), pt = G.arene.clampPt(G.mx + Math.cos(a) * d, G.my + Math.sin(a) * d, 0); G.allies.push({ kind: 'meteore', x: pt.x, y: pt.y, t: -i * .16, dur: .45, r: 80 * Math.sqrt(ST.sAmp), dmg: 120 * ST.sDmg }); } } },
  { id: 'volee', nom: 'Volée de flèches', ico: '🎯', cout: 40, rech: 8, desc: 'Une volée de 14 flèches tombe sur la zone visée en une seconde.',
    use(p) { const cx = G.mx, cy = G.my; for (let i = 0; i < 14; i++) G.allies.push({ kind: 'retarde', t: -i * .07, dur: .01, f: () => { const a = R() * TAU, d = R.range(0, 90) * Math.sqrt(ST.sAmp), x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d; G.etincelle(x, y, '#e8d8b0', 3); for (const tg of G.cibles()) if (Math.sqrt(d2(x, y, tg.x, tg.y)) - tg.r < 26) G.frappe(tg, 34 * ST.sDmg, { spec: true, x, y }); } }); } },
  { id: 'repousse', nom: 'Onde repoussante', ico: '◎', cout: 45, rech: 9, desc: 'Une onde autour de toi efface les balles proches et frappe ce qu\'elle touche.',
    use(p) { const R0 = 230 * Math.sqrt(ST.sAmp); for (const e of G.eb) if (d2(e.x, e.y, p.x, p.y) < R0 * R0) e.dead = true; for (const tg of G.cibles()) if (Math.sqrt(d2(p.x, p.y, tg.x, tg.y)) - tg.r < R0) G.frappe(tg, 150 * ST.sDmg, { spec: true, x: tg.x, y: tg.y }); G.fx.push({ kind: 'anneau', x: p.x, y: p.y, r0: 20, r1: R0, t: 0, dur: .35, col: '#bdf' }); G.secoue(5); } }
);
Object.assign(ELEM_ARME, { pluieMeteores: 'feu', volee: 'acier', repousse: 'arcane' });

// ---------- Talents ----------
TAL.push(
  { id: 'belier', nom: 'Charge du bélier', ico: '🐏', rech: 1.8, desc: 'Une ruée vers le viseur (invincible) qui fait mal à ce que tu percutes.',
    use(p) { const a = p.aim, L = 300 * ST.tPort; p.dash = { t: 0, dur: .3, vx: Math.cos(a) * L / .3, vy: Math.sin(a) * L / .3 }; p.iframe = Math.max(p.iframe, .3 + ST.tIntan); Son.play('dash'); for (let i = 1; i <= 3; i++) G.allies.push({ kind: 'retarde', t: -i * .09, dur: .01, f: () => { for (const tg of G.cibles()) if (Math.sqrt(d2(p.x, p.y, tg.x, tg.y)) - tg.r < 40) G.frappe(tg, 30, { x: tg.x, y: tg.y }); } }); } },
  { id: 'pasCote', nom: 'Pas de côté', ico: '↔', rech: .75, desc: 'Un tout petit saut sur le côté, très rapide à recharger.',
    use(p) { const d = G.dirMouv(p), L = 120 * ST.tPort; p.dash = { t: 0, dur: .12, vx: d.x * L / .12, vy: d.y * L / .12 }; p.iframe = Math.max(p.iframe, .14 + ST.tIntan); Son.play('dash'); } }
);

// ---------- Équilibrage des espèces, mesuré au robot (9 combats chacune) ----------
// [vie, dégâts] : chaque espèce dure à peu près autant (~1 min 45 au robot) et fait à peu près aussi mal que les autres
const EQUILIBRE = {
  bourreau: [1, 1.14], metronome: [1.15, .89], sentinelle: [.9, 1.25], forgeron: [1.13, .84], hydre: [.95, 1.06], spectre: [.69, .88],
  juge: [1.07, 1.14], tisseuse: [.65, .95], horloger: [.91, .93], serpent: [1.3, .87], reine: [.81, .6], nebuleuse: [1, .81],
  mante: [1.15, 1.04], titan: [1.14, 1.25], chimere: [1.07, .82]
};
for (const [e, [pv, dg]] of Object.entries(EQUILIBRE)) if (ESPECES[e]) { ESPECES[e].pv = (ESPECES[e].pv || 1) * pv; ESPECES[e].degats = dg; }
