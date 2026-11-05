'use strict';
/* Colosses — nouvelles attaques de boss (n'importe quel boss peut les avoir) et variantes d'attaques existantes.
   Tout est annoncé et esquivable ; la plupart sont des « zones annoncées puis frappe ». */

nouvelleAttaque('spiraleFrappes', { nom: 'Spirale de frappes', cat: 'zone', conseil: 'Des cercles s\'allument en spirale à partir de toi, l\'un après l\'autre : marche dans le sens inverse de la spirale, vers les cercles qui ont déjà frappé.',
  params: (r, D) => ({ sens: r.sign() }),
  *gen(b, p) {
    yield* prep(b, .4);
    const t = cible(), c0 = { x: t.x, y: t.y }, a0 = R() * TAU, w0 = Math.max(.9, 1.05 * b.D.T), pas = Math.max(.1, .12 * b.D.T);
    for (let i = 0; i < 14; i++) { const a = a0 + p.sens * i * .6, d = 20 + i * 21, pt = G.arene.clampPt(c0.x + Math.cos(a) * d, c0.y + Math.sin(a) * d, 30); zoneC(pt.x, pt.y, 56, w0 + i * pas, { dmg: DMG(1.2) }); }
    Son.play('tele');
    yield w0 + 14 * pas + .3;
  } });
nouvelleAttaque('cible', { nom: 'Cible', cat: 'zone', conseil: 'Trois anneaux autour de toi frappent du centre vers l\'extérieur, puis le centre refrappe : sors juste après la première frappe, puis reviens au centre.',
  params: P0,
  *gen(b, p) {
    yield* prep(b, .4);
    const t = cible(), x = t.x, y = t.y, w0 = Math.max(1, 1.15 * b.D.T), pas = Math.max(.55, .65 * b.D.T), dg = { dmg: DMG(1.3) };
    zoneC(x, y, 100, w0, dg); couronne(x, y, 100, 210, w0 + pas, dg); couronne(x, y, 210, 330, w0 + 2 * pas, dg); zoneC(x, y, 100, w0 + 3 * pas, dg);
    Son.play('tele');
    yield w0 + 3 * pas + .3;
  } });
nouvelleAttaque('cometes', { nom: 'Comètes', cat: 'rayon', conseil: 'Trois comètes traversent l\'arène l\'une après l\'autre, chacune annoncée par une large bande : sors de la bande dès qu\'elle apparaît.',
  params: P0,
  *gen(b, p) {
    yield* prep(b, .3);
    const w0 = Math.max(1.05, 1.2 * b.D.T);
    for (let i = 0; i < 3; i++) {
      const t = cible(), a = R() * TAU, back = G.arene.rayMur(t.x, t.y, a + Math.PI, 2400) - 4, sx = t.x - Math.cos(a) * back, sy = t.y - Math.sin(a) * back;
      rayon(sx, sy, a, 2600, 62, w0, .3, { dmg: DMG(1.4) });
      Son.play('tele'); yield Math.max(.5, .6 * b.D.T);
    }
    yield w0;
  } });
nouvelleAttaque('murMarche', { nom: 'Mur en marche', cat: 'zone', conseil: 'Des bandes frappent d\'un bord à l\'autre et leur trou se décale un peu à chaque bande : suis le trou en marchant.',
  params: (r, D) => ({ vertical: r.chance(.5), sens: r.sign() }),
  *gen(b, p) {
    yield* prep(b, .45);
    const bb = G.arene.bb(), n = 7, w0 = Math.max(1.1, 1.25 * b.D.T), pas = Math.max(.42, .5 * b.D.T), t = cible();
    let trou = p.vertical ? t.y : t.x;
    for (let i = 0; i < n; i++) {
      trou = clamp(trou + p.sens * 70, (p.vertical ? bb.y : bb.x) + 70, (p.vertical ? bb.y + bb.h : bb.x + bb.w) - 70);
      if (p.vertical) { const cw = bb.w / n, x = bb.x + i * cw; zoneR(x, bb.y, cw, trou - 60 - bb.y, w0 + i * pas); zoneR(x, trou + 60, cw, bb.y + bb.h - trou - 60, w0 + i * pas); }
      else { const ch = bb.h / n, y = bb.y + i * ch; zoneR(bb.x, y, trou - 60 - bb.x, ch, w0 + i * pas); zoneR(trou + 60, y, bb.x + bb.w - trou - 60, ch, w0 + i * pas); }
    }
    Son.play('tele');
    yield w0 + n * pas + .3;
  } });
nouvelleAttaque('geyserSuiveur', { nom: 'Geysers en poursuite', cat: 'terrain', conseil: 'Un geyser s\'annonce sous tes pieds toutes les 0,3 s, sept fois : ne t\'arrête pas, change de direction de temps en temps.',
  params: P0,
  *gen(b, p) {
    yield* prep(b, .3);
    const w0 = Math.max(.85, 1 * b.D.T);
    for (let i = 0; i < 7; i++) { const t = cible(); zoneC(t.x, t.y, 62, w0, { dmg: DMG(1.2) }); Son.play('tele'); yield Math.max(.26, .3 * b.D.T); }
    yield w0;
  } });
nouvelleAttaque('etoileFilante', { nom: 'Étoile filante', cat: 'corps', conseil: 'Le boss traverse l\'arène en ligne droite trois fois ; chaque passage est annoncé par une ligne : écarte-toi de la ligne.',
  params: P0,
  *gen(b, p) {
    b.ctl = true;
    for (let i = 0; i < 3; i++) {
      const warn = Math.max(.8, .95 * b.D.T), ray = rayon(b.x, b.y, vise(b), 1500, b.r * 1.7, warn, 0, { alerte: true, suit: b, track: 4 });
      b.wind = warn; b.windMax = warn;
      yield* attendre(warn);
      const a = ray.a, v = 1150 * Math.min(1.3, b.D.S); let d = 0; b.charge = true; Son.play('dash');
      while (true) { const s = v * G.dtE; d += s; b.x += Math.cos(a) * s; b.y += Math.sin(a) * s; if (!G.arene.dedans(b.x, b.y, b.r) || d > 1500) { G.arene.contenir(b, b.r); break; } yield 0; }
      b.charge = false; G.secoue(7); yield .35;
    }
    b.ctl = false; yield .3;
  } });
nouvelleAttaque('tourbillonBalles', { nom: 'Tourbillon', cat: 'balles', conseil: 'Un anneau de balles se forme au bord et tourne en se resserrant vers le boss : place-toi devant le trou et laisse-le passer sur toi.',
  params: (r, D) => ({ sens: r.sign() }),
  *gen(b, p) {
    yield* prep(b, .5);
    const n = Math.round(22 * Math.min(1.3, b.D.C)), a0 = vise(b) + Math.PI;
    for (let k = 0; k < n; k++) { if (k < 3) continue; const a = a0 + k * TAU / n, e = EB(b.x, b.y, 0, 0, { r: 9, life: 7, ext: true }); e.orb = { c: b, a, r: 520, av: .45 * p.sens, dr: -85 }; }
    Son.play('salve'); yield 4;
  } });
nouvelleAttaque('rayonsJumeaux', { nom: 'Rayons jumeaux', cat: 'rayon', conseil: 'Deux rayons partent vers toi puis s\'écartent chacun d\'un côté (la zone pâle montre tout l\'arc) : passe derrière le boss ou sors de l\'arc.',
  params: P0,
  *gen(b, p) {
    b.ctl = true;
    const a = vise(b), w0 = Math.max(1.3, 1.45 * b.D.T), arc = 1.3;
    b.wind = w0; b.windMax = w0;
    for (const s of [-1, 1]) rayon(b.x, b.y, a, 1500, 40, w0, 1.2, { suit: b, balaye: { de: a, vers: a + s * arc, dur: 1.2 }, dmg: DMG(1.4) });
    yield* attendre(w0 + 1.3);
    b.ctl = false; yield .4;
  } });

// ---------- variantes d'attaques existantes ----------
function variante(id, base, o) {
  const B = ATK[base]; if (!B) return;
  nouvelleAttaque(id, { nom: o.nom, cat: B.cat, conseil: o.conseil, params: (r, D) => Object.assign(B.params ? B.params(r, D) : {}, o.extra ? o.extra(r, D) : {}),
    *gen(b, p) { for (const q of (o.passes ? o.passes(p) : [p])) yield* B.gen.call(this, b, Object.assign({}, p, q)); } });
  POIDS[id] = o.poids || 1.5; if (MIN_SALLE[base]) MIN_SALLE[id] = Math.max(MIN_SALLE[base], o.min || 0); else if (o.min) MIN_SALLE[id] = o.min;
}
variante('vagueZonesDouble', 'vagueZones', { nom: 'Double vague de frappes', conseil: 'Une vague de bandes verticales puis une horizontale : trouve le trou de la première, puis celui de la seconde.', passes: p => [{ vertical: true }, { vertical: false }], min: 6 });
variante('piliersCercle', 'piliersFeu', { nom: 'Cercle de piliers', conseil: 'Huit cercles s\'allument autour de toi puis deviennent des colonnes de feu : sors des cercles et garde un chemin libre.', extra: () => ({ n: 8 }), min: 5 });
variante('pluieCroisee', 'pluieEtoiles', { nom: 'Pluie d\'étoiles croisée', conseil: 'Deux pluies d\'étoiles à angle droit, l\'une après l\'autre : glisse entre les lignes de la première, puis de la seconde.', passes: p => [{ a: p.a }, { a: p.a + Math.PI / 2 }], min: 6 });
variante('laserRafale', 'laserCible', { nom: 'Visée laser en rafale', conseil: 'Cinq tirs de suite : le trait te suit puis se fige (blanc). Fais un pas de côté à chaque fois que le trait blanchit.', extra: () => ({ n: 5 }), min: 4 });

Object.assign(POIDS, { spiraleFrappes: 2, cible: 2, cometes: 2, murMarche: 2, geyserSuiveur: 2, etoileFilante: 1.8, tourbillonBalles: 1.6, rayonsJumeaux: 1.8 });
Object.assign(MIN_SALLE, { spiraleFrappes: 2, cible: 3, cometes: 3, murMarche: 4, etoileFilante: 3, tourbillonBalles: 4, rayonsJumeaux: 5 });
