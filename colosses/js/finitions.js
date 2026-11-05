'use strict';
/* Colosses — finitions :
   • plus de « Point faible dorsal » (le point jaune et l'arc gris autour des boss) ;
   • acheter dans un menu (affinités, garde-robe…) ne fait plus remonter l'écran tout en haut ;
   • quitter puis revenir reprend EXACTEMENT le combat : vie et phase du boss, ta vie, le chrono (partie normale et
     Abysses ; la Survie a sa propre reprise) ;
   • Précision : chaque tir qui touche fait monter ta précision, chaque tir raté et chaque coup reçu la fait chuter.
     Elle change les dégâts de ×0,8 à ×1,3 : jouer parfaitement (tout toucher sans jamais être touché) est très dur. */

// ---------- plus de point faible dorsal ----------
delete TRAITS.dos;

// ---------- les menus gardent leur défilement après un achat ----------
const _actionDefil = UI.action;
UI.action = function (a, btn) {
  const el = this.el, cle = () => el ? ((el.querySelector('h2') || {}).textContent || '') + '|' + ((el.querySelector('.onglets .actif') || {}).textContent || '') : '';
  const avant = cle(), y = el ? el.scrollTop : 0;
  const r = _actionDefil.call(this, a, btn);
  try { if (el && el.classList.contains('ouvert') && y > 0 && cle() === avant) el.scrollTop = y; } catch (e) { }
  return r;
};

// ---------- reprise exacte d'un combat ----------
const Reprise = {
  cle() {
    try {
      if (G.mode === 'normal') { const rb = PR().run && PR().run.boss; return rb ? 'n:' + Save.d.diff + ':' + rb.salle + ':' + rb.seed : null; }
      if (G.mode === 'abysses' && G.defi) { const b = G.defi.boss[G.defi.i]; return b ? 'a:' + G.defi.i + ':' + b.seed : null; }
    } catch (e) { }
    return null;
  },
  garder() {
    const b = G.boss, k = this.cle();
    if (!k || !b || b.mort || !G.p || G.p.hp <= 0 || G.finDefi || !(G.etat === 'combat' || G.etat === 'pause')) return;
    Save.d.reprise = { k, hp: b.hp, phase: b.phase, pv: G.p.hp, chrono: G.chrono || 0, armure: b.armure, pres: Precision.k };
    Save.write();
  },
  effacer() { if (Save.d.reprise) { delete Save.d.reprise; Save.write(); } },
  appliquer() {
    const r = Save.d.reprise, b = G.boss;
    if (!r || !b || r.k !== this.cle()) return;
    const n = b.def.phases.length;
    while (b.phase < Math.min(r.phase, n - 1)) passerPhase(b);
    b.trans = 0; G.eb.length = 0; G.hz.length = 0; G.banner = null;
    b.hp = clamp(r.hp, 1, b.hpMax);
    if (r.armure !== undefined && b.armureMax) b.armure = Math.min(b.armureMax, r.armure);
    if (G.p) G.p.hp = clamp(r.pv, 1, G.p.hpMax);
    G.chrono = r.chrono || 0;
    if (r.pres !== undefined) Precision.k = r.pres;
  }
};
const _entrerReprise = G.entrerSalle;
G.entrerSalle = function () {
  const r = _entrerReprise.apply(this, arguments);
  try { Reprise.appliquer(); } catch (e) { console.warn('reprise', e); }
  return r;
};
// la reprise ne vaut que pour le combat en cours : boss vaincu, mort, recommencer ou passer → effacée
for (const nom of ['bossMort', 'mortJoueur', 'passerBoss']) { const f = G[nom]; G[nom] = function () { Reprise.effacer(); return f.apply(this, arguments); }; }
const _actReprise = UI.action;
UI.action = function (a, btn) {
  if (a === 'quitter' || a === 'quitterJeu') Reprise.garder();
  if (a === 'relancer' || a === 'abandon') Reprise.effacer();
  return _actReprise.call(this, a, btn);
};
addEventListener('beforeunload', () => { try { Reprise.garder(); } catch (e) { } });
let _repriseT = 0;
const _majReprise = majCombat;
majCombat = function (dt) { _majReprise.apply(this, arguments); try { if ((G.mode === 'normal' || G.mode === 'abysses') && G.etat === 'combat' && (_repriseT -= 1 / 60) <= 0) { _repriseT = 3; Reprise.garder(); } } catch (e) { } };

// ---------- Précision ----------
const Precision = {
  k: .35,
  mult() { return .8 + .5 * this.k; },
  touche(continu) { this.k = Math.min(1, this.k + (continu ? .003 : .012)); },
  rate() { const now = G.t; if (this.rateT === now) { this.nRate++; if (this.nRate > 2) return; } else { this.rateT = now; this.nRate = 1; } this.k = Math.max(0, this.k - .07); },
  blesse() { this.k = 0; }
};
const _frappePrec = G.frappe;
G.frappe = function (tg, dmg, o) {
  try {
    if (o && o.prim && dmg > 0 && G.format() !== 'survie') {
      const bo = G.boss, cible = tg && (tg === bo || tg.proxy === bo || (G.minions || []).includes(tg));
      if (cible) { dmg *= Precision.mult(); Precision.touche(o.continu); }
    }
  } catch (e) { }
  return _frappePrec.call(this, tg, dmg, o);
};
// un tir principal qui disparaît sans avoir rien touché = un tir raté
const _tirsPrec = majTirsJoueur;
majTirsJoueur = function (dt) {
  // on marque chaque tir dès qu'il touche quelque chose (même s'il rebondit ensuite et oublie ses cibles)
  for (const b of G.pb) if (!b._prec && b.hits instanceof Set) { b._prec = true; const add = b.hits.add.bind(b.hits); b.hits.add = v => { b._t = true; return add(v); }; }
  const vivants = G.pb.filter(b => !b.dead && !b.spec && !b.fils && b._prec && !b._t);
  const r = _tirsPrec.apply(this, arguments);
  try { if (G.etat === 'combat' && G.boss && !G.boss.mort) for (const b of vivants) if (b.dead && !b._t) Precision.rate(); } catch (e) { }
  return r;
};
const _blessePrec = G.blesser;
G.blesser = function () { const p = this.p, hp0 = p ? p.hp : 0; const r = _blessePrec.apply(this, arguments); try { if (p && p.hp < hp0) Precision.blesse(); } catch (e) { } return r; };
const _entrerPrec = G.entrerSalle;
G.entrerSalle = function () { Precision.k = .35; return _entrerPrec.apply(this, arguments); };
// jauge au-dessus de l'arme principale
const _hudPrec = dessinerHUD;
dessinerHUD = function (c) {
  _hudPrec(c);
  try {
    if (!G.p || !G.boss || G.etat === 'menu' || G.format() === 'survie' || G.format() === 'danse') return;
    const x = 420, y = 724, w = 230, k = Precision.k, m = Precision.mult();
    c.save();
    c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(x, y, w, 6);
    c.fillStyle = k >= .99 ? '#ffd24d' : k > .6 ? '#7dffb0' : k > .3 ? '#cfc6e0' : '#ff7a8a'; c.fillRect(x, y, w * k, 6);
    c.textAlign = 'right'; c.textBaseline = 'bottom';
    texteOmbre(c, 'Précision ×' + m.toFixed(2).replace('.', ','), x + w, y - 1, k >= .99 ? '#ffd24d' : '#e6e0f0', `800 12px ${POLICE}`, 3);
    c.restore();
  } catch (e) { }
};
