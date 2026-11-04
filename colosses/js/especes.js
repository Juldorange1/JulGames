'use strict';
/* Colosses — les espèces de boss. Chacune a un mécanisme à apprendre et des phases dont les attaques
   reviennent TOUJOURS dans le même ordre (cycle) : quand on connaît un boss, on le bat bien plus vite.
   Les attaques propres à une espèce sont dans le catalogue ATK avec « esp: true ». */

const ESPECES = {};
function espece(id, o) { o.id = id; ESPECES[id] = o; }
function ouvrir(b, t, mul, txt) {
  b.ouvert = Math.max(b.ouvert, t); b.ouvertMul = mul;
  G.texte(b.x, b.y - b.r - 22, txt || 'OUVERT !', '#ffd24d', 20);
}
function defEsp(id, o) { o.esp = true; def(id, o); }
const P0 = () => ({}); // attaques d'espèce : réglages fixes (seule la difficulté les change)

// =============== Le Métronome ===============
function* temps(b, n) { for (let i = 0; i < n; i++) { const reste = b.s.temps - (b.s.bt % b.s.temps); yield reste + .001; } }
espece('metronome', {
  nom: 'le Métronome', hue: 45, r: 56, mouv: 'ancre',
  forme: { style: 'astre', cotes: 8, pics: 8, picL: .25, yeux: 1, sats: 4, anneaux: 2, rot: .25, creux: .5 },
  meca: 'Tout suit son battement (tic + anneau doré). Ses salves décalent leurs trous d\'un demi-cran à chaque temps. Après sa grande salve, son cœur s\'ouvre : ×3 pendant 2 temps.',
  init(b) { b.s.temps = Math.max(.5, .58 / b.D.S); b.s.bt = 0; b.s.n = -1; },
  phaseInit(b, i) { b.s.temps = Math.max(i ? .45 : .5, (i ? .5 : .58) / b.D.S); },
  maj(b, dt) {
    b.s.bt += dt;
    const n = Math.floor(b.s.bt / b.s.temps);
    if (n !== b.s.n) { b.s.n = n; Son.play(n % 4 === 0 ? 'tac' : 'tic'); G.fx.push({ kind: 'anneau', x: b.x, y: b.y, r0: b.r, r1: b.r + (n % 4 ? 30 : 60), t: 0, dur: .25, col: '#ffd86b' }); }
  },
  phases: [
    { cycle: ['me_salve', 'me_croix', 'me_salve', 'me_pluie'] },
    { cycle: ['me_aiguilles', 'me_salve', 'satellites', 'me_pluie', 'pilonnage', 'me_croix'], carte: 'cercle' }
  ]
});
defEsp('me_salve', {
  nom: 'Salves en rythme', cat: 'balles', conseil: 'Une salve par temps, les trous se décalent d\'un demi-cran : fais un petit pas de côté à chaque tic. Puis tire dans son cœur ouvert.',
  params: (r, D) => ({ n: Math.round(16 * Math.min(1.5, D.C)), spd: 200 * D.S }),
  *gen(b, p) {
    yield* temps(b, 1);
    const a0 = vise(b);
    for (let i = 0; i < 4; i++) { anneauTirs(b.x, b.y, p.n, a0 + (i % 2) * Math.PI / p.n, p.spd, { r: 7 }); Son.play('salve'); yield* temps(b, 1); }
    anneauTirs(b.x, b.y, Math.min(26, Math.round(p.n * 1.5)), a0, p.spd * .8, { r: 8 }); G.secoue(5); Son.play('choc');
    yield* temps(b, 1);
    ouvrir(b, b.s.temps * 2.3, 3);
    yield b.s.temps * 2;
  }
});
defEsp('me_croix', {
  nom: 'Croix en rythme', cat: 'rayon', conseil: 'La croix tombe sur toi 2 temps après être apparue. Compte « un, deux » et sors en diagonale.',
  params: P0,
  *gen(b, p) {
    for (let i = 0; i < 2; i++) {
      yield* temps(b, 1);
      const t = cible();
      for (let k = 0; k < 4; k++) rayon(t.x, t.y, (i % 2 ? Math.PI / 4 : 0) + k * Math.PI / 2, 1600, 44, b.s.temps * 2, .2);
      yield* temps(b, 2);
    }
  }
});
defEsp('me_pluie', {
  nom: 'Pluie en rythme', cat: 'zone', conseil: 'Chaque temps, un cercle se pose là où tu es et tombe 2 temps plus tard : ne t\'arrête jamais.',
  params: P0,
  *gen(b, p) {
    for (let i = 0; i < 6; i++) { yield* temps(b, 1); const t = cible(); zoneC(t.x, t.y, 82, b.s.temps * 2, {}); }
    yield* temps(b, 2);
  }
});
defEsp('me_aiguilles', {
  nom: 'Aiguilles du métronome', cat: 'rayon', conseil: 'Quatre rayons qui sautent de 45° à chaque temps. Les lignes pointillées montrent leur prochaine place : glisse dans le trou suivant.',
  params: P0,
  *gen(b, p) {
    b.ctl = true;
    yield* temps(b, 1);
    const a0 = vise(b) + Math.PI / 8, beams = [], T = b.s.temps;
    for (let k = 0; k < 4; k++) beams.push(rayon(b.x, b.y, a0 + k * Math.PI / 2, 1500, 30, T * 2, T * 8.3, { suit: b }));
    yield* temps(b, 2);
    for (let i = 0; i < 8; i++) {
      for (const h of beams) rayon(b.x, b.y, h.a + Math.PI / 4, 1500, 4, T * .95, 0, { alerte: true, suit: b });
      yield* temps(b, 1);
      for (const h of beams) h.a += Math.PI / 4;
    }
    b.ctl = false;
    ouvrir(b, T * 2.3, 2.5);
  }
});

// =============== La Sentinelle ===============
espece('sentinelle', {
  pv: 0.85, nom: 'la Sentinelle', hue: 210, r: 54, mouv: 'traqueur', tourne: [1.0, 1.5],
  forme: { style: 'cristal', cotes: 6, pics: 0, yeux: 1, sats: 0, anneaux: 1, rot: 0, creux: .5 },
  meca: 'Son bouclier frontal arrête tous tes tirs : frappe-la dans le dos (×2). Si sa charge finit dans un mur ou un pilier, elle est assommée et son bouclier tombe.',
  mult(b, o) {
    if (b.stun > 0) return 1.6;
    const d = Math.abs(angDiff(b.facing, ang(b.x, b.y, o.x, o.y)));
    return d < 1.15 ? 0 : d > 2.1 ? 2 : 1;
  },
  dessin(c, b) {
    if (b.stun > 0) return;
    c.save(); c.translate(b.x, b.y);
    c.strokeStyle = '#bfe0ff'; c.lineWidth = 9; c.globalAlpha = .9;
    c.beginPath(); c.arc(0, 0, b.r * 1.25, b.facing - 1.15, b.facing + 1.15); c.stroke();
    c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, b.r * 1.25, b.facing - 1.15, b.facing + 1.15); c.stroke();
    const a = b.facing + Math.PI; c.fillStyle = '#ffd24d'; c.globalAlpha = .6 + .4 * Math.sin(G.t * 6);
    c.beginPath(); c.arc(Math.cos(a) * b.r * .85, Math.sin(a) * b.r * .85, 8, 0, TAU); c.fill();
    c.restore();
  },
  phases: [
    { cycle: ['frappeChaine', 'rochers', 'se_charge', 'eventail', 'se_charge'] },
    { cycle: ['balayage', 'se_charge', 'rochers', 'murEpines', 'se_charge'], carte: 'piliers' }
  ]
});
defEsp('se_charge', {
  nom: 'Charge au bouclier', cat: 'corps', conseil: 'Mets-toi dos à un mur ou à un pilier, attends la charge et esquive au dernier moment : elle s\'y assomme.',
  params: (r, D) => ({ vit: 1000 * D.S }),
  *gen(b, p) {
    b.ctl = true;
    const warn = .8 * b.D.T, ray = rayon(b.x, b.y, vise(b), 1400, b.r * 2, warn, 0, { alerte: true, suit: b, track: 5 });
    b.wind = warn; b.windMax = warn;
    yield* attendre(warn);
    const a = ray.a; let tt = 0; b.charge = true; b.facing = a;
    while (true) {
      const dt = G.dtE; b.x += Math.cos(a) * p.vit * dt; b.y += Math.sin(a) * p.vit * dt; tt += dt;
      if (G.arene.pilierTouche(b.x, b.y, b.r) || !G.arene.dedans(b.x, b.y, b.r)) {
        G.arene.contenir(b, b.r); G.arene.sortirPiliers(b, b.r); b.charge = false; b.ctl = false;
        G.secoue(14); Son.play('choc'); G.etourdir(b, 2.4, 'Assommée !'); return;
      }
      if (tt > 2) break;
      yield 0;
    }
    b.charge = false; b.ctl = false;
  }
});

// =============== L'Hydre ===============
function hydreTetes(b) {
  G.minions = G.minions.filter(m => m.type !== 'tete');
  const n = b.phase > 0 ? 4 : 3;
  for (let i = 0; i < n; i++) { const m = G.invoquer('tete', b.x, b.y); m.idx = i; m.n = n; m.hp = m.hpMax = b.hpMax * .035; }
  b.s.repousse = 0; b.s.vides = false;
}
espece('hydre', {
  pv: 0.8, nom: 'l\'Hydre', hue: 120, r: 50, mouv: 'errant', sansTraits: ['cristaux'],
  forme: { style: 'blob', cotes: 5, pics: 0, yeux: 2, sats: 0, anneaux: 1, rot: .2, creux: .5 },
  meca: 'Son corps est protégé tant qu\'une tête vit. Les têtes crachent chacune leur tour, dans le sens des aiguilles d\'une montre. Coupe-les toutes : le corps s\'effondre (×1,5) avant qu\'elles repoussent.',
  init(b) { b.s.rot = 0; b.s.mi = 0; hydreTetes(b); },
  phaseInit(b) { hydreTetes(b); },
  maj(b, dt) {
    b.s.rot += dt * .45;
    const nt = G.minions.filter(m => m.type === 'tete').length, vivantes = nt > 0;
    // chaque tête coupée arrache un morceau du corps : le combat avance même hors des fenêtres
    if (b.s.nt !== undefined && nt < b.s.nt && !b.trans) { const perte = Math.min(b.hp - 1, b.hpMax * .06 * (b.s.nt - nt)); if (perte > 0) { b.hp -= perte; G.texte(b.x, b.y - b.r - 20, '−' + Math.round(perte), '#7dffb0', 15); } }
    b.s.nt = nt;
    if (!vivantes) {
      if (!b.s.vides) { b.s.vides = true; b.s.repousse = b.phase ? 7 : 9; G.etourdir(b, 1.4, 'Effondrée !'); ouvrir(b, b.s.repousse, 1.5); }
      else { b.s.repousse -= dt; if (b.s.repousse <= 0) { hydreTetes(b); G.annonce('Les têtes repoussent', b.col, 1.2); Son.play('cri'); } }
    }
  },
  bouclier(b) { return G.minions.some(m => m.type === 'tete'); },
  phases: [
    { cycle: ['hy_souffles', 'pilonnage', 'hy_morsure', 'feuxFollets', 'hy_souffles'] },
    { cycle: ['hy_souffles', 'ronces', 'anneaux', 'hy_morsure', 'chercheurs'] }
  ]
});
defEsp('hy_souffles', {
  nom: 'Souffles des têtes', cat: 'balles', conseil: 'Les têtes tirent l\'une après l\'autre dans le sens des aiguilles d\'une montre : tourne dans le même sens pour rester hors de portée de la suivante.',
  params: (r, D) => ({ spd: 230 * D.S, n: Math.round(5 * Math.min(1.4, D.C)) }),
  *gen(b, p) {
    yield* prep(b, .4);
    for (let tour = 0; tour < 2; tour++) {
      const tetes = G.minions.filter(m => m.type === 'tete' && m.spawn <= 0).sort((a, c) => a.idx - c.idx);
      for (const h of tetes) {
        if (h.dead) continue;
        const a = ang(h.x, h.y, cible().x, cible().y);
        for (let k = 0; k < p.n; k++) EB(h.x, h.y, a + (k - (p.n - 1) / 2) * .18, p.spd, { r: 7 });
        h.flash = 1; Son.play('salve'); yield .3;
      }
      yield .3;
    }
  }
});
defEsp('hy_morsure', {
  nom: 'Morsure', cat: 'corps', conseil: 'Une tête s\'allonge vers toi en ligne droite : la ligne annonce la morsure, écarte-toi d\'un pas.',
  params: P0,
  *gen(b, p) {
    for (let i = 0; i < 3; i++) {
      const tetes = G.minions.filter(m => m.type === 'tete' && m.spawn <= 0).sort((a, c) => a.idx - c.idx);
      if (!tetes.length) return;
      const h = tetes[b.s.mi++ % tetes.length];
      const warn = .7 * b.D.T;
      rayon(h.x, h.y, ang(h.x, h.y, cible().x, cible().y), 340, 46, warn, .22, { suit: h, track: 3 });
      yield warn + .4;
    }
  }
});

// =============== La Tisseuse ===============
espece('tisseuse', {
  pv: 0.65, nom: 'la Tisseuse', hue: 285, r: 48, mouv: 'errant',
  forme: { style: 'araignee', cotes: 8, pics: 8, picL: .5, yeux: 4, sats: 0, anneaux: 0, rot: .1, creux: .45 },
  meca: 'Elle tend des fils mortels entre ses nœuds. Casse un nœud pour couper ses fils. Si tous ses nœuds tombent, elle s\'emmêle : assommée et ×2.',
  maj(b) {
    const n = G.minions.filter(m => m.type === 'noeud').length;
    if (b.s.avait && n === 0) { b.s.avait = false; G.etourdir(b, 2.5, 'Emmêlée !'); ouvrir(b, 2.5, 2); }
    if (n > 0) b.s.avait = true;
  },
  phases: [
    { cycle: ['ti_toile', 'ronces', 'artillerie', 'bond', 'rafale'] },
    { cycle: ['ti_toile', 'tourellesLaser', 'ti_toile', 'bond', 'petales'] }
  ]
});
defEsp('ti_toile', {
  nom: 'Toile', cat: 'zone', conseil: 'Trois ou quatre nœuds se posent autour de toi et se relient : sors du piège avant que les fils s\'allument, puis casse les nœuds.',
  params: P0,
  *gen(b, p) {
    yield* prep(b, .4);
    const k = b.phase ? 4 : 3, t = cible(), a0 = R() * TAU, nodes = [];
    const vieux = G.minions.filter(m => m.type === 'noeud');
    if (vieux.length + k > 8) for (const m of vieux.slice(0, vieux.length + k - 8)) m.dead = true;
    for (let i = 0; i < k; i++) { const pt = G.arene.clampPt(t.x + Math.cos(a0 + i * TAU / k) * 210, t.y + Math.sin(a0 + i * TAU / k) * 210, 20); nodes.push(G.invoquer('noeud', pt.x, pt.y)); }
    for (let i = 0; i < k; i++) G.hz.push({ kind: 'fil', a: nodes[i], b: nodes[(i + 1) % k], warn: 1.2 * b.D.T + .6, t: 0, dmg: DMG(), src: 'ti_toile' });
    Son.play('tele');
    yield 1.4;
  }
});

// =============== Le Spectre ===============
function spectreAncres(n) {
  const bb = G.arene.bb(), cx = bb.x + bb.w / 2, cy = bb.y + bb.h / 2, out = [];
  if (n === 4) for (const [fx, fy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) out.push({ x: cx + fx * bb.w * .3, y: cy + fy * bb.h * .28 });
  else for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * TAU / n; out.push({ x: cx + Math.cos(a) * bb.w * .32, y: cy + Math.sin(a) * bb.h * .36 }); }
  return out;
}
espece('spectre', {
  pv: 0.55, nom: 'le Spectre', hue: 265, r: 46, mouv: 'aucun', sansTraits: ['spectral'],
  forme: { style: 'fantome', cotes: 3, pics: 0, yeux: 2, sats: 3, anneaux: 1, rot: .3, creux: .5 },
  meca: 'Intouchable, sauf quand il se matérialise sur une de ses ancres (3 s). Il les visite toujours dans le même ordre et la prochaine luit : attends-le là-bas.',
  init(b) { b.s.anc = spectreAncres(4); b.s.ordre = [0, 1, 2, 3]; b.s.i = 0; b.s.mat = 0; b.spectral = 99; const a = b.s.anc[0]; b.x = a.x; b.y = a.y; },
  phaseInit(b, i) { if (i > 0) { b.s.anc = spectreAncres(6); b.s.ordre = [0, 3, 1, 4, 2, 5]; b.s.i = 0; } },
  maj(b, dt) { if (b.s.mat > 0) { b.s.mat -= dt; b.spectral = 0; } else b.spectral = 99; },
  dessinSol(c, b) {
    const s = b.s, nx = s.ordre[s.i % s.ordre.length];
    s.anc.forEach((a, k) => {
      c.strokeStyle = k === nx ? `rgba(220,200,255,${.5 + .4 * Math.sin(G.t * 6)})` : 'rgba(180,160,255,.18)'; c.lineWidth = k === nx ? 3 : 2;
      c.setLineDash([8, 8]); c.lineDashOffset = -G.t * 20; c.beginPath(); c.arc(a.x, a.y, b.r + 14, 0, TAU); c.stroke(); c.setLineDash([]);
    });
  },
  phases: [
    { cycle: ['sp_saut', 'lunes', 'sp_saut', 'echos'] },
    { cycle: ['sp_saut', 'givre', 'croixFeu', 'sp_saut', 'petales', 'sp_saut', 'frappeChaine'] }
  ]
});
defEsp('sp_saut', {
  nom: 'Matérialisation', cat: 'corps', conseil: 'Il apparaît sur l\'ancre qui luit et lâche un anneau de balles : place-toi près de l\'ancre suivante pour le frapper pendant ses 3 s de présence.',
  params: (r, D) => ({ n: Math.round(18 * Math.min(1.4, D.C)), spd: 190 * D.S }),
  *gen(b, p) {
    const s = b.s, a = s.anc[s.ordre[s.i % s.ordre.length]]; s.i++;
    const warn = .8 * b.D.T;
    zoneC(a.x, a.y, b.r + 20, warn, { dmg: DMG(1.2) });
    let tt = 0; while (tt < warn) { tt += G.dtE; b.alpha = 1 - .7 * tt / warn; yield 0; }
    G.fx.push({ kind: 'fantome', x: b.x, y: b.y, t: 0, dur: .3, r: b.r });
    b.x = a.x; b.y = a.y; b.alpha = 1; s.mat = 3 * (b.phase ? .85 : 1);
    anneauTirs(b.x, b.y, p.n, R() * TAU, p.spd); Son.play('teleporte');
    yield .4;
  }
});

// =============== Le Forgeron ===============
espece('forgeron', {
  nom: 'le Forgeron', hue: 15, r: 60, mouv: 'traqueur',
  forme: { style: 'golem', cotes: 5, pics: 6, picL: .3, yeux: 2, sats: 0, anneaux: 1, rot: .1, creux: .5 },
  meca: 'Chaque frappe le fait chauffer (3 crans). Au 3e, il surchauffe : fuis l\'explosion, puis il refroidit sans défense (×2,5).',
  init(b) { b.s.ch = 0; },
  prochaine(b) { return b.s.ch >= 3 ? 'fo_surchauffe' : null; },
  dessin(c, b) {
    for (let i = 0; i < 3; i++) { c.fillStyle = i < b.s.ch ? '#ff7a1a' : 'rgba(255,255,255,.15)'; c.fillRect(b.x - 24 + i * 17, b.y + b.r + 12, 14, 6); }
  },
  phases: [
    { cycle: ['fo_frappe', 'failles', 'fo_frappe', 'poingCeleste', 'fo_frappe'] },
    { cycle: ['fo_frappe', 'geysers', 'fo_frappe', 'meteoreGeant', 'fo_frappe'], carte: 'lave' }
  ]
});
defEsp('fo_frappe', {
  nom: 'Coup de marteau', cat: 'corps', conseil: 'Il saute sur toi et laisse une flaque de lave : sors du cercle et ne reviens pas dans la lave.',
  params: (r, D) => ({ n: Math.round(12 * Math.min(1.5, D.C)), spd: 190 * D.S }),
  *gen(b, p) {
    b.ctl = true;
    const t = cible(), pt = G.arene.clampPt(t.x, t.y, b.r), warn = Math.max(.85, b.D.T);
    zoneC(pt.x, pt.y, 125, warn, { dmg: DMG(1.4) });
    b.air = true; const sx = b.x, sy = b.y; let tt = 0;
    while (tt < warn) { tt += G.dtE; const k = Math.min(1, tt / warn); b.x = lerp(sx, pt.x, k); b.y = lerp(sy, pt.y, k); b.haut = Math.sin(k * Math.PI) * 130; yield 0; }
    b.air = false; b.haut = 0; G.secoue(12); Son.play('choc');
    G.hz.push({ kind: 'lave', x: pt.x, y: pt.y, r: 80, life: 8, t: 0, dmg: DMG(.6), src: 'fo_frappe' });
    anneauTirs(pt.x, pt.y, p.n, R() * TAU, p.spd);
    b.s.ch++;
    b.ctl = false;
    yield .5;
  }
});
defEsp('fo_surchauffe', {
  nom: 'Surchauffe', cat: 'zone', conseil: 'Quand sa jauge est pleine, il brille puis explose autour de lui : éloigne-toi, puis reviens le frapper pendant qu\'il refroidit.',
  params: (r, D) => ({ n: Math.round(28 * Math.min(1.4, D.C)), spd: 210 * D.S }),
  *gen(b, p) {
    b.ctl = true;
    const warn = Math.max(1.3, 1.6 * b.D.T);
    b.wind = warn; b.windMax = warn; Son.play('alerte');
    zoneC(b.x, b.y, 230, warn, { dmg: DMG(1.4) });
    yield warn;
    // deux couloirs opposés dans les balles ET dans l'onde (avant : une onde pleine, impossible à esquiver sans talent)
    const a0 = R() * TAU, gaps = [[a0, .8], [a0 + Math.PI, .8]];
    for (let k = 0; k < p.n; k++) { const a = a0 + k * TAU / p.n; if (gaps.some(g => Math.abs(angDiff(a, g[0])) < .45)) continue; EB(b.x, b.y, a, p.spd); }
    onde(b.x, b.y, 320, { th: 18, r: 270, life: 2.5, gaps });
    G.secoue(16); b.s.ch = 0; b.ctl = false;
    G.etourdir(b, 3.5, 'Refroidi !'); ouvrir(b, 3.5, 2.5);
  }
});

// =============== La Reine de l'essaim ===============
espece('reine', {
  pv: 0.6, nom: 'la Reine de l\'essaim', hue: 75, r: 52, mouv: 'orbiteur', sansTraits: ['cristaux'], pasInvoc: true,
  forme: { style: 'insecte', cotes: 6, pics: 6, picL: .3, yeux: 3, sats: 6, anneaux: 1, rot: .2, creux: .55 },
  meca: 'Elle est protégée tant qu\'au moins 3 drones vivent. Ils sortent en formation : les armes de zone les balaient vite. Tue l\'essaim, puis frappe la Reine.',
  bouclier(b) { return G.minions.filter(m => m.type !== 'cristal' && m.spawn <= 0).length >= 3; },
  phases: [
    { cycle: ['re_essaim', 'feuxFollets', 'artillerie', 're_essaim', 'rafale'] },
    { cycle: ['re_essaim', 'pics', 'vortex', 're_kamikazes', 'pluie'] }
  ]
});
defEsp('re_essaim', {
  nom: 'Essaim', cat: 'invoc', conseil: 'Cinq drones sortent en V vers toi : recule en tirant dans le paquet, ils meurent vite ensemble.',
  params: P0,
  *gen(b, p) {
    yield* prep(b, .5);
    const a = vise(b), n = Math.min(5, 12 - G.minions.length);
    for (let i = 0; i < n; i++) {
      const k = i - (n - 1) / 2, d = 30 + Math.abs(k) * 34, pa = a + Math.PI + Math.sign(k) * 1.1;
      const pt = G.arene.clampPt(b.x + Math.cos(a) * 40 + Math.cos(pa) * d, b.y + Math.sin(a) * 40 + Math.sin(pa) * d, 14);
      G.invoquer('larve', pt.x, pt.y);
    }
    yield 1;
  }
});
defEsp('re_kamikazes', {
  nom: 'Drones kamikazes', cat: 'invoc', conseil: 'Ils foncent et explosent après un signal : fais-les exploser loin de toi en restant en mouvement.',
  params: P0,
  *gen(b, p) {
    yield* prep(b, .5);
    for (let i = 0; i < 4; i++) { const pt = G.arene.pointAuHasard(40, 260); G.invoquer('kamikaze', pt.x, pt.y); yield .15; }
    yield .8;
  }
});

// =============== Le Juge ===============
espece('juge', {
  pv: 0.9, nom: 'le Juge', hue: 52, r: 54, mouv: 'ancre',
  forme: { style: 'oeil', cotes: 4, pics: 4, picL: .45, yeux: 1, sats: 2, anneaux: 2, rot: .15, creux: .5 },
  meca: 'Il montre une suite de cases numérotées, puis les fait exploser très vite dans le même ordre. Retiens l\'ordre et file sur une case déjà passée. Après chaque sentence il s\'agenouille (×2).',
  phases: [
    { cycle: ['ju_sentence', 'lanceGeante', 'ju_sentence', 'croix'] },
    { cycle: ['ju_sentence', 'effondrement', 'echos', 'ju_sentence', 'grille', 'fractures'] }
  ]
});
defEsp('ju_sentence', {
  nom: 'Sentence', cat: 'zone', conseil: 'Retiens les numéros : l\'exécution va si vite que l\'avertissement ne suffit pas. Va sur la case 1 dès qu\'elle a explosé.',
  params: P0,
  *gen(b, p) {
    yield* prep(b, .4);
    const bb = G.arene.bb(), nc = 4, nr = 3, cw = bb.w / nc, ch = bb.h / nr;
    const k = (b.phase ? 6 : 4) + (Save.d.diff === 'cauchemar' ? 1 : 0), gap = b.phase ? .36 : .45;
    const cells = R.shuffle([...Array(nc * nr).keys()]).slice(0, k);
    for (let i = 0; i < k; i++) {
      const c = cells[i], x = bb.x + (c % nc) * cw, y = bb.y + Math.floor(c / nc) * ch;
      G.hz.push({ kind: 'apercu', x, y, w: cw, h: ch, n: i + 1, t: 0, dur: (k - i) * gap + .5 });
      Son.play('tic'); yield gap;
    }
    yield .55;
    for (let i = 0; i < k; i++) {
      const c = cells[i], x = bb.x + (c % nc) * cw, y = bb.y + Math.floor(c / nc) * ch;
      zoneR(x, y, cw, ch, Math.max(.36, .3 * b.D.T), { dmg: DMG(1.3) });
      yield .3;
    }
    yield .4;
    ouvrir(b, 2.3, 2, 'À GENOUX !'); b.s.genou = 2.3;
    yield 2;
  }
});

// =============== L'Horloger ===============
espece('horloger', {
  nom: 'l\'Horloger', hue: 32, r: 58, mouv: 'centre',
  forme: { style: 'anneau', cotes: 12, pics: 12, picL: .12, yeux: 1, sats: 0, anneaux: 2, rot: .05, creux: .5 },
  meca: 'Ses aiguilles tournent toujours dans le même sens et à vitesse fixe : tourne avec elles. Quand elles se superposent (« midi »), il est ouvert (×2,5).',
  phases: [
    { cycle: ['ho_aiguilles', 'pendule', 'ho_engrenages', 'cadran'] },
    { cycle: ['ho_aiguilles', 'ho_engrenages', 'pics', 'anneaux', 'ho_aiguilles', 'eclats'] }
  ]
});
defEsp('ho_aiguilles', {
  nom: 'Aiguilles', cat: 'rayon', conseil: 'La grande aiguille tourne vite, la petite lentement, toujours dans le même sens. Recule hors du cadran, ou suis la grande juste derrière elle ; à MIDI, fonce frapper.',
  params: (r, D) => ({ s: D.S }),
  *gen(b, p) {
    b.ctl = true;
    const sens = b.phase ? -1 : 1, warn = 1 * b.D.T, dur = 7.5, aM = vise(b) + Math.PI;
    b.wind = warn; b.windMax = warn;
    // aiguilles de longueur limitée : loin du cadran on est à l'abri (avant, la pointe allait plus vite que le héros)
    const min = rayon(b.x, b.y, aM, 560, 22, warn, dur, { suit: b, rot: .5 * sens });
    const heu = rayon(b.x, b.y, aM + Math.PI * .7, 400, 34, warn, dur, { suit: b, rot: .22 * sens });
    if (b.phase) rayon(b.x, b.y, aM + Math.PI * 1.3, 260, 14, warn, dur, { suit: b, rot: 1 * sens, col: '#ffe9a0' });
    let t = 0, lock = 0;
    while (t < warn + dur) {
      t += G.dtE; lock -= G.dtE;
      if (t > warn && lock <= 0 && Math.abs(angDiff(min.a, heu.a)) < .14) { lock = 1.5; ouvrir(b, 1.7, 2.5, 'MIDI !'); Son.play('gong'); }
      yield 0;
    }
    b.ctl = false;
  }
});
defEsp('ho_engrenages', {
  nom: 'Engrenages', cat: 'balles', conseil: 'Deux anneaux tournent en sens contraire en s\'élargissant : attends que les deux trous s\'alignent sur toi.',
  params: (r, D) => ({ m: Math.round(26 * Math.min(1.3, D.C)), av: 1 * D.S, dr: 62 * D.S }),
  *gen(b, p) {
    yield* prep(b, .5);
    for (let i = 0; i < 2; i++) {
      const sens = i ? -1 : 1, trous = [R() * TAU, R() * TAU];
      for (let k = 0; k < p.m; k++) {
        const a = k * TAU / p.m; if (trous.some(t => Math.abs(angDiff(a, t)) < .3)) continue;
        const e = EB(b.x, b.y, 0, 0, { r: 7, life: 9 }); e.orb = { c: b, a, r: b.r + 12 + i * 34, av: p.av * sens, dr: p.dr };
      }
    }
    Son.play('salve'); yield 2.2;
  }
});

// =============== Le Serpent ===============
espece('serpent', {
  nom: 'le Serpent', hue: 150, r: 30, mouv: 'serpent', pv: .7,
  forme: { style: 'poly', cotes: 6, pics: 0, yeux: 2, sats: 0, anneaux: 0, rot: 0, creux: .5 },
  meca: 'Seules sa tête (×1,4) et le bout de sa queue (lumière jaune, ×3) sont vulnérables. Son corps arrête tes tirs et brûle au contact.',
  init(b) { b.s.trace = []; b.s.n = 15; b.s.seg = []; b.s.dir = Math.PI / 2; b.s.oa = 0; },
  maj(b) {
    const s = b.s, tr = s.trace, last = tr[0];
    if (!last || d2(last.x, last.y, b.x, b.y) > 16) tr.unshift({ x: b.x, y: b.y });
    if (tr.length > 260) tr.length = 260;
    s.seg = []; let acc = 0, need = 24;
    for (let i = 1; i < tr.length && s.seg.length < s.n; i++) {
      acc += Math.sqrt(d2(tr[i - 1].x, tr[i - 1].y, tr[i].x, tr[i].y));
      if (acc >= need) { s.seg.push({ x: tr[i].x, y: tr[i].y, r: 20 - s.seg.length * .7 }); need += 24; }
    }
    b.facing = s.dir;
  },
  bouger(b, dt) {
    const s = b.s, t = cible();
    s.oa += dt * .8;
    const tx = t.x + Math.cos(s.oa) * 240, ty = t.y + Math.sin(s.oa) * 240;
    s.dir += clamp(angDiff(s.dir, ang(b.x, b.y, tx, ty)), -2.2 * dt, 2.2 * dt);
    const v = 175 * b.D.S;
    b.x += Math.cos(s.dir) * v * dt; b.y += Math.sin(s.dir) * v * dt;
    if (!G.arene.dedans(b.x, b.y, b.r)) { G.arene.contenir(b, b.r); s.dir += Math.PI * .6; }
    return true;
  },
  mult() { return 1.4; },
  cibles(b) { const q = b.s.seg[b.s.seg.length - 1]; return q ? [{ x: q.x, y: q.y, r: 12, proxy: b, mult: 3, queue: true }] : []; },
  bloque(b, x, y, r) { const sg = b.s.seg; for (let i = 0; i < sg.length - 1; i++) if (d2(x, y, sg[i].x, sg[i].y) < (sg[i].r + r) ** 2) return true; return false; },
  contact(b, p) { const sg = b.s.seg; for (let i = 0; i < sg.length - 1; i++) if (d2(p.x, p.y, sg[i].x, sg[i].y) < (sg[i].r * .8 + p.hr) ** 2) return true; return false; },
  dessinCorps(c, b) {
    const sg = b.s.seg, h = b.def.hue;
    for (let i = sg.length - 1; i >= 0; i--) {
      const q = sg[i];
      if (i === sg.length - 1) { c.drawImage(glow('rgba(255,225,80,.8)', 30), q.x - 30, q.y - 30); c.fillStyle = '#ffe14d'; c.beginPath(); c.arc(q.x, q.y, 11, 0, TAU); c.fill(); continue; }
      const g = c.createRadialGradient(q.x - q.r * .3, q.y - q.r * .3, 2, q.x, q.y, q.r);
      g.addColorStop(0, hsl(h, 60, 40)); g.addColorStop(1, hsl(h, 70, 14));
      c.fillStyle = g; c.beginPath(); c.arc(q.x, q.y, q.r, 0, TAU); c.fill();
      c.strokeStyle = hsl(h, 100, 60, .8); c.lineWidth = 2; c.stroke();
    }
  },
  phases: [
    { cycle: ['sn_ruee', 'sn_salve', 'pics', 'sn_enroule'] },
    { cycle: ['sn_ruee', 'fractures', 'sn_enroule', 'sn_ruee', 'tsunami'], carte: 'cercle' }
  ]
});
defEsp('sn_ruee', {
  nom: 'Ruée du serpent', cat: 'corps', conseil: 'Trois ruées en ligne droite, toujours annoncées : esquive de côté, jamais en arrière, sinon le corps te rattrape.',
  params: (r, D) => ({ vit: 800 * D.S }),
  *gen(b, p) {
    b.ctl = true;
    for (let i = 0; i < 3; i++) {
      const warn = .6 * b.D.T, ray = rayon(b.x, b.y, vise(b), 700, 40, warn, 0, { alerte: true, suit: b, track: 4 });
      b.wind = warn; b.windMax = warn;
      yield* attendre(warn);
      b.s.dir = ray.a; let tt = 0; b.charge = true;
      while (tt < .6) { const dt = G.dtE; tt += dt; b.x += Math.cos(b.s.dir) * p.vit * dt; b.y += Math.sin(b.s.dir) * p.vit * dt; if (!G.arene.dedans(b.x, b.y, b.r)) { G.arene.contenir(b, b.r); break; } yield 0; }
      b.charge = false; yield .2;
    }
    b.ctl = false;
  }
});
defEsp('sn_salve', {
  nom: 'Écailles', cat: 'balles', conseil: 'Chaque anneau du corps tire de chaque côté, de la tête vers la queue : place-toi dans l\'axe du serpent, devant ou derrière.',
  params: (r, D) => ({ spd: 175 * D.S }),
  *gen(b, p) {
    yield* prep(b, .45);
    const sg = (b.s.seg || []).slice();
    for (let i = 0; i < sg.length - 1; i++) {
      const q = sg[i], nq = sg[i + 1] || q, a = ang(nq.x, nq.y, q.x, q.y);
      EB(q.x, q.y, a + Math.PI / 2, p.spd, { r: 6 }); EB(q.x, q.y, a - Math.PI / 2, p.spd, { r: 6 });
      if (i % 3 === 0) Son.play('salve');
      yield .05;
    }
    yield .5;
  }
});
defEsp('sn_enroule', {
  nom: 'Étreinte', cat: 'corps', conseil: 'Il tourne autour de toi en se resserrant : sors du cercle par l\'espace entre sa tête et sa queue avant qu\'il se referme.',
  params: (r, D) => ({ n: Math.round(14 * Math.min(1.4, D.C)) }),
  *gen(b, p) {
    b.ctl = true;
    const t = cible(), cx = t.x, cy = t.y; let a = ang(cx, cy, b.x, b.y), tt = 0, rad = Math.max(200, Math.sqrt(d2(b.x, b.y, cx, cy)));
    while (tt < 3.4) {
      const dt = G.dtE; tt += dt; a += 1.7 * dt * b.D.S; rad = Math.max(140, rad - 35 * dt);
      const nx = cx + Math.cos(a) * rad, ny = cy + Math.sin(a) * rad;
      b.s.dir = ang(b.x, b.y, nx, ny); b.x = nx; b.y = ny; G.arene.contenir(b, b.r);
      yield 0;
    }
    anneauTirs(b.x, b.y, p.n, R() * TAU, 190 * b.D.S); Son.play('salve');
    b.ctl = false;
    yield .4;
  }
});

// =============== La Nébuleuse ===============
espece('nebuleuse', {
  pv: 0.9, nom: 'la Nébuleuse', hue: 315, r: 50, mouv: 'ancre',
  forme: { style: 'nautile', cotes: 7, pics: 0, yeux: 1, sats: 5, anneaux: 2, rot: .4, creux: .5 },
  meca: 'Elle t\'attire en permanence. Quand elle inspire (elle gonfle et aspire fort), son cœur est à nu (×2,5) : tire en courant à contre-sens, puis éloigne-toi avant qu\'elle expire.',
  maj(b) { if (!b.s.inspire) G.aspiration = { x: b.x, y: b.y, f: (b.phase ? 70 : 45) * b.D.S, t: .1 }; },
  phases: [
    { cycle: ['orbites', 'anneauxFeu', 'ne_inspire', 'spirale'] },
    { cycle: ['orbites', 'ne_inspire', 'cercleVide', 'petales', 'poles', 'ne_inspire'], carte: 'tenebres' }
  ]
});
defEsp('ne_inspire', {
  nom: 'Inspiration', cat: 'balles', conseil: 'Pendant qu\'elle t\'aspire, tire-lui dessus : c\'est son moment faible. Garde ton esquive pour l\'expiration.',
  params: (r, D) => ({ f: Math.min(165, 150 * D.S), n: Math.round(28 * Math.min(1.4, D.C)), spd: 210 * D.S }),
  *gen(b, p) {
    yield* prep(b, .6); Son.play('charge');
    b.s.inspire = true; b.ctl = true;
    let t = 0;
    while (t < 2.4) { t += G.dtE; G.aspiration = { x: b.x, y: b.y, f: p.f, t: .1 }; b.ouvert = .2; b.ouvertMul = 2.5; yield 0; }
    b.s.inspire = false;
    anneauTirs(b.x, b.y, p.n, R() * TAU, p.spd); onde(b.x, b.y, 300, { th: 16, r: b.r, life: 3, gaps: [[R() * TAU, .6]] });
    Son.play('choc'); G.secoue(9);
    b.ctl = false;
    yield .5;
  }
});

// =============== Le Bourreau ===============
espece('bourreau', {
  nom: 'le Bourreau', hue: 352, r: 44, mouv: 'traqueur',
  forme: { style: 'crane', cotes: 4, pics: 2, picL: .8, yeux: 2, sats: 0, anneaux: 0, rot: 0, creux: .5 },
  meca: 'Toujours le même combo : des ruées annoncées puis un tourbillon (3 coups, 5 en phase 2). Après le tourbillon, il reprend son souffle (×2). La parade y est reine.',
  phases: [
    { cycle: ['bo_combo', 'pics', 'bo_lames', 'bo_combo', 'bond'] },
    { cycle: ['bo_combo', 'failles', 'bo_combo', 'croixFeu', 'rebondsTerre'] }
  ]
});
defEsp('bo_combo', {
  nom: 'Combo du bourreau', cat: 'corps', conseil: 'Compte les ruées : 2 puis le tourbillon (4 puis le tourbillon en phase 2). Esquive chaque ruée sur le côté, sors du cercle, puis frappe-le.',
  params: (r, D) => ({ vit: 1050 * Math.min(1.15, D.S) }),
  *gen(b, p) {
    b.ctl = true;
    const coups = b.phase ? 5 : 3, w0 = Math.max(.65, (b.phase ? .65 : .75) * b.D.T);
    for (let i = 0; i < coups - 1; i++) {
      const ray = rayon(b.x, b.y, vise(b), 470, b.r * 2, w0, 0, { alerte: true, suit: b, track: 5, lock: .45 });
      b.wind = w0; b.windMax = w0;
      yield* attendre(w0);
      const a = ray.a; let d = 0; b.charge = true; Son.play('epee');
      while (d < 470) { const dt = G.dtE, s = p.vit * dt; d += s; b.x += Math.cos(a) * s; b.y += Math.sin(a) * s; if (!G.arene.dedans(b.x, b.y, b.r)) { G.arene.contenir(b, b.r); break; } yield 0; }
      b.charge = false; yield .1;
    }
    // le tourbillon final laisse le temps de sortir (le boss vient de passer tout près)
    const wz = Math.max(.85, .9 * b.D.T);
    zoneC(b.x, b.y, 150, wz, { dmg: DMG(1.4) });
    yield wz + .2;
    b.ctl = false;
    ouvrir(b, 2, 2, 'ESSOUFFLÉ !');
    yield 2;
  }
});
defEsp('bo_lames', {
  nom: 'Lames tournantes', cat: 'balles', conseil: 'Trois grosses lames partent et reviennent : esquive l\'aller puis surtout le retour.',
  params: (r, D) => ({ spd: 330 * D.S }),
  *gen(b, p) {
    yield* prep(b, .45);
    const a = vise(b);
    for (let k = -1; k <= 1; k++) { const e = EB(b.x, b.y, a + k * .45, p.spd, { r: 13, life: 6, col: '#ff9aa8' }); e.retour = { d: 430, s: p.spd }; }
    Son.play('epee'); yield 1.4;
  }
});

// =============== Le Phénix ===============
espece('phenix', {
  pv: 0.75, nom: 'le Phénix', hue: 28, r: 52, mouv: 'orbiteur',
  forme: { style: 'oiseau', cotes: 7, pics: 10, picL: .5, yeux: 2, sats: 3, anneaux: 1, rot: .3, creux: .5 },
  meca: 'À la fin de sa première phase il devient un œuf pendant 7 s. Casse l\'œuf à temps : il renaît affaibli et étourdi. Sinon il renaît en reprenant des forces.',
  transition(b) {
    if (b.phase === 0 && !b.s.oeufFait) {
      b.s.oeufFait = true; b.s.oeuf = 7; b.s.oeufHp = b.s.oeufMax = b.hpMax * .09;
      b.main = null; b.fond = null; b.ctl = false; b.air = false; b.haut = 0; b.charge = false;
      G.eb.length = 0; G.hz.length = 0;
      G.annonce('Un œuf ! Casse-le avant qu\'il éclose', '#ffb347', 2); Son.play('cri');
      return true;
    }
    return false;
  },
  absorbe(b, d) {
    if (!(b.s.oeuf > 0)) return false;
    b.s.oeufHp -= d;
    if (b.s.oeufHp <= 0) {
      b.s.oeuf = 0; Son.play('verre'); succes('oeuf'); G.explo(b.x, b.y, 140, '#ffb347');
      b.hp = Math.max(1, b.hp - b.hpMax * .08); passerPhase(b); b.trans = .4; G.etourdir(b, 2.5, 'Renaissance ratée !');
    }
    return true;
  },
  maj(b, dt) {
    if (b.s.oeuf > 0) {
      b.s.oeuf -= dt;
      if (b.s.oeuf <= 0) { b.hp = Math.min(b.hpMax * .62, b.hp + b.hpMax * .1); passerPhase(b); G.annonce('Il renaît plus fort !', '#ff7a1a', 1.6); }
      return true;
    }
  },
  dessinCorps(c, b) {
    if (!(b.s.oeuf > 0)) return false;
    const k = 1 - b.s.oeufHp / b.s.oeufMax;
    c.save(); c.translate(b.x, b.y + Math.sin(G.t * 20) * k * 3);
    c.drawImage(glow('rgba(255,150,50,.5)', 90), -90, -90);
    c.fillStyle = '#3a2214'; c.strokeStyle = '#ffb347'; c.lineWidth = 4;
    c.beginPath(); c.ellipse(0, 0, 40, 52, 0, 0, TAU); c.fill(); c.stroke();
    c.strokeStyle = '#ffe9a0'; c.lineWidth = 2; c.beginPath();
    for (let i = 0; i < Math.floor(k * 8); i++) { const a = i * 2.3; c.moveTo(Math.cos(a) * 10, Math.sin(a) * 14); c.lineTo(Math.cos(a) * 36, Math.sin(a) * 46); }
    c.stroke();
    c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 66, -Math.PI / 2, -Math.PI / 2 + TAU * b.s.oeuf / 7); c.stroke();
    c.restore();
    return true;
  },
  phases: [
    { cycle: ['px_plongeon', 'px_plumes', 'grele', 'poingCeleste'] },
    { cycle: ['px_plongeon', 'failles', 'px_plumes', 'eclairsChaine', 'geysers'] }
  ]
});
defEsp('px_plongeon', {
  nom: 'Plongeon de feu', cat: 'corps', conseil: 'Deux piqués en ligne droite qui laissent du feu au sol : esquive de côté et garde une zone sans feu pour la suite.',
  params: (r, D) => ({ vit: 1000 * D.S }),
  *gen(b, p) {
    b.ctl = true;
    for (let i = 0; i < 2; i++) {
      const warn = .75 * b.D.T, ray = rayon(b.x, b.y, vise(b), 1400, b.r * 1.6, warn, 0, { alerte: true, suit: b, track: 5 });
      b.wind = warn; b.windMax = warn;
      yield* attendre(warn);
      const a = ray.a; let d = 0, depot = 0; b.charge = true; Son.play('dash');
      while (true) {
        const dt = G.dtE, s = p.vit * dt; d += s; b.x += Math.cos(a) * s; b.y += Math.sin(a) * s;
        if (d - depot > 60) { depot = d; G.hz.push({ kind: 'lave', x: b.x, y: b.y, r: 50, life: 5, t: 0, dmg: DMG(.6), src: 'px_plongeon' }); }
        if (!G.arene.dedans(b.x, b.y, b.r) || d > 1500) { G.arene.contenir(b, b.r); break; }
        yield 0;
      }
      b.charge = false; G.secoue(6); yield .4;
    }
    b.ctl = false;
  }
});
defEsp('px_plumes', {
  nom: 'Plumes de feu', cat: 'balles', conseil: 'Les plumes s\'enroulent d\'un côté puis de l\'autre à chaque volée : va du côté d\'où elles partent.',
  params: (r, D) => ({ n: Math.round(9 * Math.min(1.5, D.C)), spd: 230 * D.S }),
  *gen(b, p) {
    yield* prep(b, .45);
    for (let v = 0; v < 3; v++) {
      const a = vise(b);
      for (let k = 0; k < p.n; k++) EB(b.x, b.y, a + (k - (p.n - 1) / 2) * .16, p.spd, { r: 7, angv: (v % 2 ? .9 : -.9), col: '#ffb347' });
      Son.play('salve'); yield .5;
    }
  }
});

// =============== La Chimère (attaques tirées au hasard, cycle fixe) ===============
espece('chimere', {
  nom: 'la Chimère', hue: null, r: null, mouv: null, forme: null, chimere: true,
  meca: 'Une créature faite de morceaux d\'autres : ses attaques sont tirées au hasard, mais elle les répète toujours dans le même ordre. Observe son cycle.',
  phases: []
});

const ESP_ORDRE = ['bourreau', 'metronome', 'sentinelle', 'forgeron', 'hydre', 'spectre', 'juge', 'tisseuse', 'horloger', 'serpent', 'reine', 'nebuleuse', 'phenix'];
