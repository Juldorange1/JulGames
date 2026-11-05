'use strict';
/* Colosses — sensations des armes : chaque arme a son propre son, sa secousse, son impact et, pour les gros coups,
   un très court arrêt sur image. Plus trois armes à risque : plus tu prends de risques, plus elles frappent fort.
   (Le volume reste celui réglé par l'utilisateur : les bruitages passent tous par Son et son gain général.) */

// ---------- trois armes à risque ----------
PRIM.push(
  { id: 'calice', nom: 'Calice de sang', ico: '🩸', desc: 'Rafale rapide qui frappe d\'autant plus fort que ta vie est basse : ×1 à pleine vie, jusqu\'à ×2,2 presque mort. Risqué.',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .13 / ST.pCad), k = 1 + 1.2 * clamp(1 - p.hp / p.hpMax, 0, 1);
      for (let i = 0; i < n; i++) { const o = bout(p, 16); pShot(o.x, o.y, p.aim + R.range(-.035, .035), 880 * ST.pVel, { dmg: 10.5 * k, r: 3.5 + k, life: 1.1, col: k > 1.5 ? '#ff2d4a' : '#ff7a8a' }); Son.play('tir'); }
    } },
  { id: 'froleur', nom: 'Frôleur', ico: '🤹', desc: 'Chaque balle ennemie que tu frôles sans être touché charge un tir doré (×3,5, perçant). Jusqu\'à 6 charges. Plus tu passes près, plus tu frappes fort.',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .14 / ST.pCad);
      for (let i = 0; i < n; i++) {
        const o = bout(p, 16), or = (w.charges || 0) > 0;
        if (or) w.charges--;
        pShot(o.x, o.y, p.aim + R.range(-.025, .025), (or ? 1150 : 900) * ST.pVel, { dmg: or ? 45 : 13, r: or ? 6 : 4, life: 1.1, pierce: or ? 2 : 0, col: or ? '#ffe27a' : '#cfe8ff' });
        Son.play(or ? 'tirLourd' : 'tir');
      }
    } },
  { id: 'couleuvrine', nom: 'Couleuvrine', ico: '💣', desc: 'Boulet énorme qui explose, mais chaque tir te projette en arrière : attention à ce qu\'il y a derrière toi.',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .55 / ST.pCad);
      for (let i = 0; i < n; i++) {
        const o = bout(p, 18);
        pShot(o.x, o.y, p.aim, 820 * ST.pVel, { dmg: 82, r: 8, life: 1.1, col: '#ffb15a' });
        // le recul : une vraie poussée d'environ 120 px vers l'arrière
        p.pousseC = { a: p.aim + Math.PI, t: .2, v: 620 }; Son.play('tirLourd');
      }
    } }
);
Object.assign(ELEM_ARME, { calice: 'ombre', froleur: 'lumiere', couleuvrine: 'feu' });
Object.assign(FAMILLE, { calice: 'fusil', froleur: 'fusil', couleuvrine: 'explosif' });
Object.assign(PRIM_EQ, { calice: 1, froleur: 1, couleuvrine: .85 });
Object.assign(ICO_CLE, { 'p:calice': 'glass-heart', 'p:froleur': 'juggler', 'p:couleuvrine': 'cannon-shot' });

// ---------- profils : son, secousse au tir, impact, arrêt sur image ----------
// son : [échantillons], volume, hauteur [min, max] ; sec : secousse à chaque tir ; imp : couleur/forme de l'impact ; lourd : arrêt sur image
const SENS_FAMILLE = {
  fusil: { son: [['tir1', 'tir2'], .05, [1, 1.15]], sec: 0, imp: 'etincelles' },
  lame: { son: [['swish1', 'swish2', 'swish3'], .26, [.95, 1.15]], sec: .8, imp: 'tranche' },
  trait: { son: [['swish1', 'swish2'], .14, [1.4, 1.7]], sec: 0, imp: 'eclats' },
  explosif: { son: [['tir_lourd'], .1, [1.1, 1.3]], sec: 2, imp: 'souffle' },
  magie: { son: [['tele'], .06, [1.6, 2.1]], sec: 0, imp: 'arcane' }
};
const SENS_ARME = {
  blaster: { son: [['tir1', 'tir2'], .05, [1.15, 1.3]] },
  pompe: { son: [['tir_lourd'], .13, [1.25, 1.45]], sec: 4, imp: 'eclats' },
  mitra: { son: [['tir1'], .035, [1.3, 1.55]] },
  sniper: { son: [['tir_lourd'], .15, [.8, .9]], sec: 4, lourd: true },
  railgun: { son: [['rayon'], .12, [1.5, 1.7]], sec: 5, lourd: true },
  surchauffe: { son: [['tir2'], .05, [.75, .9]], sec: .6 },
  pistolet: { son: [['tir2'], .06, [.9, 1]], sec: 1 },
  jumeaux: { son: [['tir1', 'tir2'], .045, [1.2, 1.4]] },
  arc: { son: [['swish2'], .2, [.8, .95]], lourd: true },
  arbalete: { son: [['swish3'], .22, [.7, .8]], sec: 2, lourd: true },
  iaido: { son: [['swish1'], .3, [.75, .85]], sec: 3, lourd: true },
  marteau: { son: [['choc2'], .18, [1.2, 1.4]], sec: 4, lourd: true, imp: 'souffle' },
  epee: { son: [['swish1', 'swish2', 'swish3'], .28, [.95, 1.1]] },
  faux: { son: [['swish3'], .3, [.65, .8]], sec: 1.5 },
  roquettes: { son: [['missile'], .1, [1.1, 1.3]], sec: 2.5 },
  grenades: { son: [['swish1'], .12, [1.6, 1.8]], sec: 1 },
  mortier: { son: [['tir_lourd'], .12, [.7, .8]], sec: 3 },
  meteorite: { sec: 4, lourd: true },
  sismique: { son: [['choc1'], .16, [1.1, 1.3]], sec: 4 },
  foudre: { son: [['rayon'], .06, [1.9, 2.3]], imp: 'arcane' },
  plasma: { son: [['tele'], .07, [.9, 1.1]], sec: 1.5 },
  calice: { son: [['tir2'], .05, [.8, .95]], imp: 'sang' },
  froleur: { son: [['tir1'], .045, [1.4, 1.6]], imp: 'etincelles' },
  couleuvrine: { son: [['tir_lourd'], .16, [.6, .7]], sec: 6, lourd: true, imp: 'souffle' }
};
function sensDe(id) { return Object.assign({}, SENS_FAMILLE[FAMILLE[id]] || SENS_FAMILLE.fusil, SENS_ARME[id] || {}); }

const Feel = { dans: null, impT: 0, gelT: 0, sonT: 0 };
// pendant le tir d'une arme principale, on sait laquelle tire
for (const a of PRIM) {
  const t = a.tick;
  a.tick = function () { Feel.dans = a.id; try { return t.apply(this, arguments); } finally { Feel.dans = null; } };
}
const _playSens = Son.play.bind(Son);
Son.play = function (n) {
  if (Feel.dans && (n === 'tir' || n === 'tirLourd' || n === 'epee')) {
    const S = sensDe(Feel.dans), now = performance.now();
    if (S.sec) G.secoue(S.sec);
    if (S.son && this.c && now - Feel.sonT > 45) {
      const [l, v, [r0, r1]] = S.son;
      if (this.ech(l[Math.floor(Math.random() * l.length)], v * (n === 'tirLourd' && Feel.dans === 'froleur' ? 2.4 : 1), r0 + Math.random() * (r1 - r0))) { Feel.sonT = now; return; }
    }
  }
  return _playSens(n);
};

// impacts : forme et couleur selon l'arme, arrêt sur image pour les gros coups
const COUL_IMP = { etincelles: '#fff1c4', tranche: '#ffffff', eclats: '#e8d8b0', souffle: '#ffb15a', arcane: '#d8a6ff', sang: '#ff3a52' };
const _frappeSens = G.frappe;
G.frappe = function (tg, dmg, o) {
  const b = this.boss, cible = tg && tg.proxy ? tg.proxy : tg, hp0 = b ? b.hp : 0;
  const r = _frappeSens.apply(this, arguments);
  if (!b || cible !== b || b.mort || !(b.hp < hp0) || !o) return r;
  const perdu = hp0 - b.hp, x = o.x !== undefined ? o.x : b.x, y = o.y !== undefined ? o.y : b.y;
  const id = o.spec ? null : this.ars && this.ars.p, S = id ? sensDe(id) : { imp: 'souffle', lourd: perdu > 120 };
  const col = id && COUL_ELEM[ELEM_ARME[id]] || COUL_IMP[S.imp] || '#fff';
  const now = G.t;
  if (now - Feel.impT > .05 && !G.opts.effetsReduits) {
    Feel.impT = now;
    const taille = clamp(8 + perdu * .22, 10, 70);
    if (S.imp === 'tranche') { const a = R() * Math.PI; G.fx.push({ kind: 'anneau', x, y, r0: 2, r1: taille, t: 0, dur: .1, col: '#fff' }); for (let i = 0; i < 4; i++) { const s = R.range(260, 420), d = a + (i % 2 ? Math.PI : 0) + R.range(-.15, .15); G.parts.push({ x, y, vx: Math.cos(d) * s, vy: Math.sin(d) * s, life: .14, max: .14, col: '#fff', r: 2.2, trait: true, add: true }); } }
    else if (S.imp === 'souffle') { G.fx.push({ kind: 'anneau', x, y, r0: taille * .3, r1: taille * 1.2, t: 0, dur: .18, col }); G.lumiere(x, y, taille * 2.5, col, .15); }
    else if (S.imp === 'eclats') { for (let i = 0; i < 5; i++) { const d = R() * TAU, s = R.range(120, 260); G.parts.push({ x, y, vx: Math.cos(d) * s, vy: Math.sin(d) * s, life: .3, max: .3, col, r: R.range(1.5, 2.6) }); } }
    else if (S.imp === 'arcane') { G.fx.push({ kind: 'anneau', x, y, r0: 2, r1: taille * .8, t: 0, dur: .2, col }); }
    else if (S.imp === 'sang') { for (let i = 0; i < 4; i++) { const d = R() * TAU, s = R.range(60, 180); G.parts.push({ x, y, vx: Math.cos(d) * s, vy: Math.sin(d) * s + 40, life: .4, max: .4, col: '#c8102e', r: R.range(1.8, 3) }); } }
    else G.fx.push({ kind: 'anneau', x, y, r0: 2, r1: taille * .6, t: 0, dur: .09, col });
  }
  // gros coup : son sourd, secousse et arrêt sur image très court (jamais plus d'un tous les 0,3 s)
  if ((S.lourd && perdu > 60) || perdu > 160) {
    if (now - Feel.gelT > .3) { Feel.gelT = now; G.gel = Math.max(G.gel, perdu > 200 ? .06 : .04); G.secoue(5); Son.ech && Son.ech('choc' + (1 + (Math.random() * 3 | 0)), .13, 1.5 + Math.random() * .3); }
  }
  return r;
};

// ---------- Frôleur : on compte les balles frôlées ----------
const _majSens = majCombat;
majCombat = function (dt) {
  _majSens.apply(this, arguments);
  const p = G.p;
  if (p && p.pousseC) {
    const q = p.pousseC, dtr = Math.min(q.t, Math.max(0, dt));
    if (!p.dash && p.saut <= 0) { p.x += Math.cos(q.a) * q.v * dtr; p.y += Math.sin(q.a) * q.v * dtr; Arene.contenir(p, p.r); Arene.sortirPiliers(p, p.r); }
    q.t -= dt; if (q.t <= 0 || G.etat !== 'combat') p.pousseC = null;
  }
  if (!p || G.etat !== 'combat' || !G.ars || G.ars.p !== 'froleur' || p.hp <= 0) return;
  const w = p.prim; w.charges = w.charges || 0;
  for (const e of G.eb) {
    if (e.frole || e.dead) continue;
    const r = (e.r || 5) + p.hr, d = Math.sqrt(d2(e.x, e.y, p.x, p.y));
    if (d > r + 1 && d < r + 24 && p.iframe <= 0) {
      e.frole = true;
      if (w.charges < 6) { w.charges++; G.fx.push({ kind: 'anneau', x: p.x, y: p.y, r0: 10, r1: 30, t: 0, dur: .2, col: '#ffe27a' }); Son.ech && Son.ech('tele', .04, 2.4); }
    }
  }
};
const _joueurSens = dessinerJoueur;
dessinerJoueur = function (c) {
  _joueurSens(c);
  const p = G.p; if (!p || p.hp <= 0 || !G.ars) return;
  if (G.ars.p === 'froleur') {
    const n = p.prim.charges || 0;
    for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * .32; c.fillStyle = i < n ? '#ffe27a' : 'rgba(255,255,255,.18)'; c.strokeStyle = 'rgba(0,0,0,.8)'; c.lineWidth = 1.5; c.beginPath(); c.arc(p.x + Math.cos(a) * 30, p.y + Math.sin(a) * 30, 3.2, 0, TAU); c.fill(); c.stroke(); }
  } else if (G.ars.p === 'calice') {
    const k = 1 + 1.2 * clamp(1 - p.hp / p.hpMax, 0, 1);
    if (k > 1.15) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = (k - 1) * .5; c.drawImage(glow('rgba(255,30,60,.8)', 40), p.x - 40, p.y - 40); c.restore(); texteOmbre(c, '×' + k.toFixed(1), p.x, p.y - 40, '#ff6a7e', `800 12px ${POLICE}`, 3); }
  }
};
