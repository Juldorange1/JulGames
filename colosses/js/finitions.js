'use strict';
/* Colosses — finitions :
   • plus de « Point faible dorsal » ;
   • acheter dans un menu ne fait plus remonter l'écran, et aucun texte ne dépasse de son bouton ;
   • affinités : curseur gratuit entre la chance de base et le maximum acheté ;
   • quitter puis revenir, c'est comme une pause : le combat est remis exactement dans son état (boss, balles, zones,
     invocations, ta position, tes recharges, le temps) et le jeu t'attend sur l'écran de pause ;
   • Précision : chaque tir raté et chaque coup reçu la font chuter (dégâts de ×0,8 à ×1,3). */

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
// ---------- aucun texte ne dépasse de son cadre : la police se réduit juste ce qu'il faut ----------
function ajusterTextes() {
  const e = UI.el; if (!e || !e.classList.contains('ouvert')) return;
  for (const el of e.querySelectorAll('.tuile, .pill, .jouer, .defi2 b, .defi2 .dm, .skin b, .skin span, .onglets button, .rang button')) {
    if (!el.offsetParent) continue;
    el.style.fontSize = '';
    let fs = parseFloat(getComputedStyle(el).fontSize), n = 0;
    while (el.scrollWidth > el.clientWidth + 1 && n++ < 12 && fs > 9) { fs -= 1; el.style.fontSize = fs + 'px'; }
  }
}
const _montrerAjuste = UI.montrer;
UI.montrer = function () { const r = _montrerAjuste.apply(this, arguments); setTimeout(ajusterTextes, 0); return r; };
addEventListener('resize', () => setTimeout(ajusterTextes, 50));
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTimeout(ajusterTextes, 0));

// ---------- affinités : curseurs ----------
const _forgeCurseurs = UI.forge;
UI.forge = function () {
  const r = _forgeCurseurs.apply(this, arguments);
  try {
    const tr = t => (typeof Langue !== 'undefined' && Langue.en ? Langue.t(t) : t);
    for (const inp of this.el.querySelectorAll('.aff-r input')) inp.addEventListener('input', () => {
      const R = Save.d.affReglage = Save.d.affReglage || {}; (R[inp.dataset.c] = R[inp.dataset.c] || {})[inp.dataset.v] = +inp.value / 100; Save.write();
      for (const em of this.el.querySelectorAll('.aff-pct')) em.textContent = tr(Math.round(chanceReglee(em.dataset.c, em.dataset.v) * 100) + ' % de chance');
    });
  } catch (e) { }
  return r;
};

// ---------- Précision (chaque joueur a la sienne) ----------
const Precision = {
  get k() { const p = G.p; return p && p.prec !== undefined ? p.prec : .35; },
  set k(v) { if (G.p) G.p.prec = v; },
  mult() { return .8 + .5 * this.k; },
  touche(continu) { this.k = Math.min(1, this.k + (continu ? .003 : .012)); },
  rate() { const now = G.t; if (this.rateT === now) { this.nRate++; if (this.nRate > 2) return; } else { this.rateT = now; this.nRate = 1; } this.k = Math.max(0, this.k - .07); },
  blesse() { this.k = 0; }
};
const _frappePrec = G.frappe;
G.frappe = function (tg, dmg, o) {
  try {
    if (o && o.prim && dmg > 0 && G.format() !== 'survie') {
      const bo = G.boss, cib = tg && (tg === bo || tg.proxy === bo || (G.minions || []).includes(tg));
      if (cib) { dmg *= Precision.mult(); Precision.touche(o.continu); }
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

// ---------- reprise exacte d'un combat ----------
const EXCLUS_BOSS = ['D', 'def', 'esp', 's', 'main', 'fond', 'intro', 'trans', 'wind', 'windMax', 'ctl', 'air', 'haut', 'charge', 'alpha', 'finale', 'retard', 'retardT', 'last', 'atkNomT'];
const EXCLUS_JOUEUR = ['hist', 'dash', 'prim', 'spec', 'tal', 'ancre'];
// copie des valeurs simples d'un objet (plus les petits objets sans lien vers le reste du jeu)
function copieEtat(o, exclus) {
  const r = {};
  for (const k in o) {
    if (exclus && exclus.includes(k)) continue;
    const v = o[k], t = typeof v;
    if (t === 'number') { if (Number.isFinite(v)) r[k] = v; }
    else if (t === 'string' || t === 'boolean') r[k] = v;
    else if (v && t === 'object' && !(v instanceof Set) && !(v instanceof Map) && k !== 'suit' && k !== 'orb') { try { const j = JSON.stringify(v); if (j && j.length < 1500) r[k] = JSON.parse(j); } catch (e) { } }
  }
  return r;
}
const Reprise = {
  R() { return Save.d.reprises = Save.d.reprises || {}; },
  cle() {
    try {
      if (typeof Coop !== 'undefined' && Coop.inscrits.length) return null; // à plusieurs : pas de reprise
      if (G.mode === 'normal') { const rb = PR().run && PR().run.boss; return rb ? 'n:' + Save.d.diff + ':' + rb.salle + ':' + rb.seed : null; }
      const df = G.defi; if (!df) return null;
      const b = df.boss[df.i]; if (!b) return null;
      if (G.mode === 'abysses') return 'a:' + df.i + ':' + b.seed;
      if (G.mode === 'survie') return 's:' + b.seed;
      if (G.mode === 'chasse') return 'c:' + b.seed;
      if (G.mode === 'jour') return 'j:' + df.cle + ':' + df.i + ':' + b.seed;
    } catch (e) { }
    return null;
  },
  garder() {
    const b = G.boss, k = this.cle(), p = G.p;
    if (!k || !b || b.mort || !p || p.hp <= 0 || G.finDefi || !(G.etat === 'combat' || G.etat === 'pause')) return;
    if (b.intro > 0 && !this.R()[G.mode]) return;
    const df = G.defi;
    this.R()[G.mode] = {
      k, chrono: G.chrono || 0, inset: Arene.inset || 0,
      boss: copieEtat(b, EXCLUS_BOSS), bs: (() => { try { const j = JSON.stringify(b.s); return j && j.length < 6000 ? JSON.parse(j) : null; } catch (e) { return null; } })(),
      p: copieEtat(p, EXCLUS_JOUEUR), prim: copieEtat(p.prim, ['vol', 'o']), spec: copieEtat(p.spec), tal: copieEtat(p.tal),
      eb: G.eb.filter(e => !e.dead).slice(0, 300).map(e => { const r = copieEtat(e); if (e.orb) { const o = e.orb; r.orb = { a: o.a, r: o.r, av: o.av, dr: o.dr, surBoss: o.c === b, cx: o.c && o.c.x, cy: o.c && o.c.y }; } return r; }),
      hz: G.hz.filter(h => !h.dead && HZ[h.kind]).slice(0, 120).map(h => { const r = copieEtat(h); if (h.suit === b) r.surBoss = true; return r; }),
      min: G.minions.filter(m => !m.dead).slice(0, 40).map(m => copieEtat(m)),
      defi: df && G.mode === 'jour' ? { type: df.type, cle: df.cle, i: df.i, temps: df.temps, tues: df.tues, degats: df.degats, coups: df.coups } : null
    };
    Save.write();
  },
  effacer() { if (this.R()[G.mode]) { delete this.R()[G.mode]; Save.write(); } },
  appliquer() {
    const r = this.R()[G.mode], b = G.boss, p = G.p;
    if (!r || !b || !p || !r.boss || r.k !== this.cle()) return false;
    const n = b.def.phases.length;
    while (b.phase < Math.min(r.boss.phase || 0, n - 1)) passerPhase(b);
    Object.assign(b, r.boss); if (r.bs) b.s = r.bs;
    Object.assign(b, { intro: 0, trans: 0, wind: 0, ctl: false, air: false, haut: 0, charge: false, alpha: 1, main: null, fond: null });
    b.hp = clamp(b.hp, 1, b.hpMax);
    Object.assign(p, r.p); p.dash = null; p.hist = [];
    Object.assign(p.prim, r.prim); Object.assign(p.spec, r.spec); Object.assign(p.tal, r.tal);
    if (r.inset) Arene.inset = r.inset;
    G.eb = (r.eb || []).map(e => { if (e.orb) { const o = e.orb; e.orb = { a: o.a, r: o.r, av: o.av, dr: o.dr, c: o.surBoss ? b : { x: o.cx, y: o.cy } }; } return e; });
    G.hz = (r.hz || []).map(h => { if (h.surBoss) h.suit = b; return h; });
    G.minions = r.min || [];
    G.chrono = r.chrono || 0; G.toast = null; G.banner = null; G.fondu = 0; G.souvCine = null;
    return true;
  }
};
const _entrerReprise = G.entrerSalle;
G.entrerSalle = function () {
  const rd = this._repDefi;
  if (rd && this.defi && this.defi.cle === rd.cle) Object.assign(this.defi, { i: rd.i, temps: rd.temps, tues: rd.tues, degats: rd.degats, coups: rd.coups });
  this._repDefi = null;
  if (this.p) this.p.prec = .35;
  const r = _entrerReprise.apply(this, arguments);
  try { if (Reprise.appliquer() && G.etat === 'combat') UI.pause(); } catch (e) { console.warn('reprise', e); }
  return r;
};
// une partie terminée (Déluge, Danse : fin au temps) ne se reprend pas
const _finReprise = G.terminerDefi;
G.terminerDefi = function () { const r = _finReprise.apply(this, arguments); Reprise.effacer(); return r; };
const _lancerDefiRep = G.lancerDefi;
G.lancerDefi = function (type) { const r = Reprise.R().jour; this._repDefi = r && r.defi && r.defi.type === type ? r.defi : null; return _lancerDefiRep.apply(this, arguments); };
// la reprise ne vaut que pour le combat en cours : boss vaincu, mort, recommencer ou passer → effacée
for (const nom of ['bossMort', 'mortJoueur', 'passerBoss']) { const f = G[nom]; G[nom] = function () { if (typeof Coop === 'undefined' || !Coop.inscrits.length) Reprise.effacer(); return f.apply(this, arguments); }; }
const _actReprise = UI.action;
UI.action = function (a, btn) {
  if (a === 'quitter' || a === 'quitterJeu') Reprise.garder();
  if (a === 'relancer' || a === 'abandon') Reprise.effacer();
  return _actReprise.call(this, a, btn);
};
addEventListener('beforeunload', () => { try { Reprise.garder(); } catch (e) { } });
addEventListener('pagehide', () => { try { Reprise.garder(); } catch (e) { } });
document.addEventListener('visibilitychange', () => { try { if (document.hidden) Reprise.garder(); } catch (e) { } });
let _repriseT = 0;
const _majReprise = majCombat;
majCombat = function (dt) { _majReprise.apply(this, arguments); try { if (G.etat === 'combat' && (_repriseT -= 1 / 60) <= 0) { _repriseT = 4; Reprise.garder(); } } catch (e) { } };
