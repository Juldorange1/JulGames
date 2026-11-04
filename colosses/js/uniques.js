'use strict';
/* Colosses — boss uniques : chaque espèce a ses phrases d'entrée et son thème musical (quelques notes jouées à
   son arrivée, toujours les mêmes pour la reconnaître), et chaque boss lance une attaque finale spectaculaire,
   « Dernier souffle », quand sa vie tombe à zéro. Pendant ce dernier souffle il ne peut plus être blessé et
   ne peut pas te tuer (tu restes au moins à 1 PV), mais chaque coup reçu compte pour les défis de maîtrise. */

const PHRASES_ESP = {
  bourreau: ['Ta tête roulera comme les autres.', 'La hache ne se trompe jamais deux fois.'],
  metronome: ['Un, deux… et tu tombes au trois.', 'Le temps bat. Toi, plus pour longtemps.'],
  sentinelle: ['Nul ne franchit la porte que je garde.', 'Mes yeux ne se ferment jamais.'],
  forgeron: ['Je forgerai une lame avec tes os.', 'Le feu de ma forge a faim.'],
  hydre: ['Coupe une tête, il en reste toujours une pour te mordre.', 'Nous sommes plusieurs. Tu es seul.'],
  spectre: ['Tu ne peux pas tuer ce qui est déjà mort.', 'Je suis l\'ombre derrière ton épaule.'],
  juge: ['La sentence est déjà rendue.', 'Coupable. Avant même d\'entrer.'],
  tisseuse: ['Chaque pas te prend un peu plus dans ma toile.', 'Viens… la toile est douce.'],
  horloger: ['Tes secondes m\'appartiennent.', 'Tic. Tac. Fin.'],
  serpent: ['Je t\'enlacerai jusqu\'au dernier souffle.', 'Le sol tremble quand je glisse.'],
  reine: ['Mes enfants ont faim.', 'Agenouille-toi devant la ruche.'],
  nebuleuse: ['Je suis née d\'une étoile morte.', 'Les astres se sont éteints pour moi.'],
  phenix: ['Je renais toujours. Toi, non.', 'Brûle avec moi.'],
  mante: ['Je prie avant de frapper.', 'Un seul geste suffit.'],
  titan: ['Les montagnes se sont agenouillées.', 'Je suis le poids du monde.'],
  chimere: ['Trois bêtes, une seule faim.', 'Je suis tous tes cauchemars à la fois.']
};
function phraseDe(def) { const l = PHRASES_ESP[def.esp]; return l ? l[(def.seed >>> 0) % l.length] : null; }

// ---------- thème musical de chaque espèce : toujours les mêmes notes ----------
const GAMME = [0, 1, 3, 5, 7, 8, 10, 12, 13, 15];
function themeDe(esp) {
  const r = RNG(hashStr('theme:' + esp)), n = 5, notes = [], durees = [];
  let i = r.int(0, 4);
  for (let k = 0; k < n; k++) { notes.push(GAMME[i]); durees.push(k === n - 1 ? .7 : r.pick([.2, .2, .32])); i = clamp(i + r.pick([-2, -1, 1, 2, 3]), 0, GAMME.length - 1); }
  return { base: 110 * Math.pow(2, r.int(0, 5) / 12), notes, durees };
}
function jouerTheme(esp, lent) {
  if (!Son.c || !esp) return;
  const T = themeDe(esp), k = lent ? 1.6 : 1;
  let t = .05;
  T.notes.forEach((n, i) => {
    const f = T.base * 2 * Math.pow(2, n / 12), d = T.durees[i] * k;
    Son.tone(f, d * 2.4, 'triangle', .045, null, t, .5);
    Son.tone(f / 2, d * 2.6, 'sine', .06, null, t, .4);
    Son.tone(f * 2, d * 1.2, 'sine', .012, null, t, .3);
    t += d;
  });
}

// ---------- phrase d'entrée sous le titre du boss ----------
const _hudUniques = dessinerHUD;
dessinerHUD = function (c) {
  _hudUniques(c);
  const b = G.boss, def = G.def;
  if (b && def && b.intro > 0 && G.etat === 'combat') {
    const ph = phraseDe(def); if (!ph) return;
    const k = b.intro > 1.6 ? (2.1 - b.intro) / .5 : b.intro < .4 ? b.intro / .4 : 1;
    c.save(); c.globalAlpha = Math.max(0, k) * .95; c.textAlign = 'center'; c.textBaseline = 'middle';
    texteOmbre(c, '« ' + ph + ' »', W / 2, H * .62 + 66, '#d9c9a6', `italic 600 17px ${POLICE_ER}`, 4);
    c.restore();
  }
  const F = b && b.finale;
  if (F) {
    // le dernier souffle : bord de l'écran teinté de la couleur du boss, qui pulse
    const a = .18 + .1 * Math.sin(G.t * 9);
    const g = c.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .9); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, hsl(def.hue, 90, 45, a));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    if (F.t < 2.2) { c.save(); c.globalAlpha = Math.min(1, F.t * 3, (2.2 - F.t) * 2); texteGrave(c, 'DERNIER SOUFFLE', W / 2, H * .2, 40, '#ffd8a0', 1, hsl(def.hue, 90, 50, .7)); c.restore(); }
  }
};

// ---------- attaque finale ----------
function scriptFinale(b) {
  const r = RNG((b.seed || 1) * 13 + 5), s = [];
  // anneaux qui partent du boss : rentre vers lui dès que l'anneau intérieur a frappé (0,7 s pour 160 px)
  const anneaux = t0 => { const pas = 160; for (let i = 0; i < 5; i++) s.push([t0 + i * .85, () => couronne(b.x, b.y, i * pas, (i + 1) * pas, 1.1, { dmg: DMG(1.1) })]); return t0 + 4 * .85 + 1.4; };
  const ondes = t0 => { for (let i = 0; i < 2; i++) s.push([t0 + i * .8, () => onde(b.x, b.y, 250, { gaps: [[0, 1]], dmg: DMG(1.1) })]); return t0 + .8 + 1.6; };
  const etoile = t0 => {
    const dec = r() * TAU, n = 6, l = TAU / n;
    s.push([t0, () => { for (let i = 0; i < n; i += 2) secteur(b.x, b.y, dec + i * l, dec + (i + 1) * l, 1400, 1.05, { dmg: DMG(1.1) }); }]);
    s.push([t0 + 1.15, () => { for (let i = 1; i < n; i += 2) secteur(b.x, b.y, dec + i * l, dec + (i + 1) * l, 1400, 1.05, { dmg: DMG(1.1) }); }]);
    return t0 + 2.6;
  };
  const blocs = r.shuffle([anneaux, ondes, etoile]).slice(0, 2); // deux des trois figures, dans un ordre propre à chaque boss
  let t = .9;
  for (const f of blocs) t = f(t);
  s.push([t + .2, 'fin']);
  return s.sort((a, b2) => a[0] - b2[0]);
}
const _bossMortUniques = G.bossMort;
G.bossMort = function () {
  const b = this.boss;
  const peut = b && !b.mort && !b.finaleFaite && this.etat === 'combat' && this.mode !== 'entrainement' && this.p && this.p.hp > 0 && !(this.def.invincible || this.def.indestructible);
  if (!peut) return _bossMortUniques.apply(this, arguments);
  b.finaleFaite = true; b.hp = 1; b.trans = 999; b.main = null; b.fond = null; b.wind = 0; b.alpha = 1; b.spectral = 0; b.air = false; b.haut = 0;
  b.finale = { t: 0, script: scriptFinale(b), i: 0 };
  this.eb.length = 0; this.hz = this.hz.filter(h => h.kind === 'vase');
  for (const m of this.minions) if (!m.dead && m.type !== 'tete') { m.dead = true; this.explo(m.x, m.y, 30, b.col); }
  this.ralentir(.35, .6); this.flash = .4; this.secoue(16);
  Son.play('cri'); jouerTheme(this.def.esp, true);
  this.fx.push({ kind: 'anneau', x: b.x, y: b.y, r0: b.r, r1: 900, t: 0, dur: .8, col: b.col });
};
const _majUniques = majCombat;
majCombat = function (dt) {
  const t0 = G.t;
  _majUniques.apply(this, arguments);
  const b = G.boss, ddt = Math.max(0, G.t - t0);
  if (!b) return;
  // thème de l'espèce à son arrivée
  if (b.intro > 0 && !b.themeJoue && G.etat === 'combat') { b.themeJoue = true; jouerTheme(G.def.esp); }
  const F = b.finale;
  if (!F || b.mort) return;
  if (G.etat !== 'combat') { b.finale = null; return; }
  F.t += ddt;
  G.chrono = Math.max(0, G.chrono - ddt); // le dernier souffle ne compte pas dans le temps du combat
  b.trans = 999;
  if (R() < ddt * 20) G.etincelle(b.x + R.range(-b.r, b.r), b.y + R.range(-b.r, b.r), b.col, 2);
  while (F.i < F.script.length && F.script[F.i][0] <= F.t) {
    const [, act] = F.script[F.i++];
    if (act === 'fin') { b.finale = null; b.trans = 0; b.hp = 0; G.bossMort(); return; }
    const avant = G.atkCourante; G.atkCourante = 'Dernier souffle';
    try { act(); } catch (e) { console.warn('finale', e); }
    G.atkCourante = avant;
  }
};
// pendant le dernier souffle, le boss ne peut pas te tuer (mais le coup compte)
const _blesserUniques = G.blesser;
G.blesser = function (dmg, src) {
  if (this.boss && this.boss.finale && this.p) dmg = Math.min(dmg, Math.max(0, this.p.hp - 1));
  return _blesserUniques.call(this, dmg, src);
};
