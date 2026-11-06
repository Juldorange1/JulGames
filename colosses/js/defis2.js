'use strict';
/* Colosses — défis pour tous les niveaux et cristaux pour tous les modes.
   Survie : la pression monte sans fin (toutes les 10 s : plus de dégâts, moins de répit, des frappes annoncées de plus
   en plus fréquentes autour de toi) : un débutant tient une minute, un très bon joueur bien plus, mais personne
   n'est éternel. Cristaux : chaque mode en donne quand on réussit quelque chose de dur (le mode normal en Cauchemar
   reste celui qui en donne le plus : ×2 par boss). */

// chaque palier (PALIER_S secondes) : plus de dégâts, plus UNE difficulté qui change à chaque fois, toujours dans le même ordre
// (pas de hasard : deux parties de Survie se valent)
const PRESSION_ETAPES = ['frappes', 'vitesse', 'degats', 'repit', 'salves', 'annonces', 'densite'];
const PALIER_S = 8;
const Pression = {
  niveau: 0, frappeT: 0, salveT: 0, n: {},
  raz() { this.niveau = 0; this.frappeT = 3; this.salveT = 4; this.n = {}; },
  temps() { const df = G.defi; return df ? (df.st !== undefined ? df.st : (df.temps || 0) + G.chrono) : 0; },
  monter() {
    this.niveau++;
    const e = PRESSION_ETAPES[(this.niveau - 1) % PRESSION_ETAPES.length], D = G.def.D;
    this.n[e] = (this.n[e] || 0) + 1;
    G.dmgE *= 1.035;
    if (e === 'vitesse') D.S = Math.min(2.4, D.S * 1.11);
    else if (e === 'degats') G.dmgE *= 1.14;
    else if (e === 'repit') G.def.idle = Math.max(.06, G.def.idle * .72);
    else if (e === 'annonces') D.T = Math.max(.55, D.T * .91);
    else if (e === 'densite') D.C = Math.min(2.8, D.C * 1.13);
  },
  maj(dt) {
    const b = G.boss;
    if (G.etat !== 'combat' || !b || b.mort || b.intro > 0 || !G.p) return;
    while (this.niveau < Math.floor(this.temps() / PALIER_S)) this.monter();
    const avant = G.atkCourante; G.atkCourante = 'Pression';
    // frappes annoncées autour de toi (de plus en plus nombreuses et fréquentes)
    const f = this.n.frappes || 0;
    this.frappeT -= dt;
    if (this.frappeT <= 0) {
      this.frappeT = Math.max(.65, 5.5 - 1.05 * f);
      const warn = Math.max(.7, 1.15 - .06 * f), dg = { dmg: DMG(.8) };
      zoneC(G.p.x + R.range(-30, 30), G.p.y + R.range(-30, 30), 58, warn, dg);
      for (let i = 0; i < Math.min(14, 3 * f); i++) { const pt = Arene.pointAuHasard(60); zoneC(pt.x, pt.y, 58, warn, dg); }
    }
    // salves : un anneau de balles autour du boss, avec un trou face à toi
    const sv = this.n.salves || 0;
    if (sv > 0) {
      this.salveT -= dt;
      if (this.salveT <= 0) {
        this.salveT = Math.max(1.3, 6 - .9 * sv);
        const n = 12 + 4 * sv, a0 = ang(b.x, b.y, G.p.x, G.p.y);
        for (let k = 0; k < n; k++) { const a = a0 + k * TAU / n; if (k === 0 || k === 1 || k === n - 1) continue; EB(b.x, b.y, a, Math.min(300, 135 + 16 * sv), { r: 8, dmg: DMG(.8) }); }
        Son.play('salve');
      }
    }
    G.atkCourante = avant;
  }
};
const _entrerPression = G.entrerSalle;
G.entrerSalle = function () { Pression.raz(); return _entrerPression.apply(this, arguments); };
const _majPression = majCombat;
majCombat = function (dt) {
  const t0 = G.t;
  _majPression.apply(this, arguments);
  try { if (G.format() === 'survie') { G.survieT = -1e9; Pression.maj(Math.max(0, G.t - t0)); } } catch (e) { }
};
// cristaux à la fin d'un défi ou des Abysses (en plus du cristal gagné par boss vaincu)
const _finCristaux = G.terminerDefi;
G.terminerDefi = function (reussi) {
  const deja = !!this.finDefi, df = this.defi;
  const r = _finCristaux.apply(this, arguments);
  if (deja || !df || !this.finDefi) return r;
  const res = this.finDefi; let n = 0;
  if (df.format === 'survie') n += Math.floor(Math.max(0, (res.temps || 0) - (df.depart || 0)) / 25); // 1 cristal par 30 s vraiment tenues
  if (df.format === 'deluge') n += Math.floor((res.degats || 0) / 15000);
  if (df.format === 'danse' && reussi) n += Math.max(0, 6 - (res.coups || 0));
  if (reussi && df.type === 'jour') n += 2; // en plus des 2 déjà donnés
  if (reussi && df.type === 'semaine') n += 6;
  if (res.record) n += df.type === 'abysses' ? 3 : 2;
  if (df.type === 'abysses') n += Math.floor(Math.max(0, (res.tues || 0) - (df.depart || 0)) / 3); // seule la profondeur vraiment gagnée paie
  // défi du jour : rejouer ne rapporte que ce qui dépasse ce qui a déjà été gagné aujourd'hui
  if (df.type === 'jour') { const rj = Save.d.defis.jour, tot = n; n = Math.max(0, tot - (rj.payeN || 0)); rj.payeN = Math.max(rj.payeN || 0, tot); }
  if (n > 0) { const k = gagnerEclats(n); if (k) res.cristauxBonus = k; }
  return r;
};
const _mortCristaux = dessinerEcranMort;
dessinerEcranMort = function (c) {
  _mortCristaux(c);
  const res = G.finDefi;
  if (res && res.cristauxBonus) { c.save(); c.textAlign = 'center'; icoDessin(c, 'ui:cristal', W / 2 - 110, 712, 24); texteOmbre(c, '+' + res.cristauxBonus + ' cristaux gagnés', W / 2 + 10, 714, '#bfefff', `800 20px ${POLICE}`, 4); c.restore(); }
};

// ---------- Survie : quitter puis revenir reprend exactement où on en était (même boss, mêmes armes, même temps, même vie) ----------
const SurvieRun = {
  garder() {
    const df = G.defi; if (G.mode !== 'survie' || !df || G.finDefi || !G.p || G.p.hp <= 0) return;
    const b = df.boss[0];
    Save.d.survieRun = { seed: b.seed, esp: b.esp, ars: Object.assign({}, b.ars), ajust: df.ajust, depart: df.depart, temps: Pression.temps(), pv: G.p.hp, coups: df.coups || 0 };
    Save.write();
  },
  effacer() { if (Save.d.survieRun) { delete Save.d.survieRun; Save.write(); } }
};
const _lancerSurvieRun = G.lancerSurvie;
G.lancerSurvie = function () {
  const r = Save.d.survieRun;
  if (!r || !r.ars) return _lancerSurvieRun.apply(this, arguments);
  this.mode = 'survie'; this.finDefi = null;
  this.defi = { type: 'survie', format: 'survie', cle: 'survie', mut: [], boss: [{ salle: 10, seed: r.seed, mega: false, esp: r.esp, ars: Object.assign({}, r.ars) }], i: 0, temps: r.temps, st: r.temps, depart: r.depart, tues: 0, degats: 0, coups: r.coups || 0, ajust: r.ajust };
  if (!Save.d.defis.survie || Save.d.defis.survie.cle !== 'survie') Save.d.defis.survie = { cle: 'survie', best: null, essais: 0 };
  calcStats(); this.p = creerJoueur(DF().pv); this.p.hp = Math.min(this.p.hpMax, r.pv || this.p.hpMax); this.ars = null;
  this.entrerSalle();
  if (this.p) this.p.hp = Math.min(this.p.hpMax, r.pv || this.p.hpMax);
};
// « Recommencer » = une nouvelle partie (nouveau boss, nouvelles armes)
const _recSurvie = G.recommencer;
G.recommencer = function () { if (this.mode === 'survie') SurvieRun.effacer(); return _recSurvie.apply(this, arguments); };
const _finSurvie = G.terminerDefi;
G.terminerDefi = function () { const s = this.defi && this.defi.type === 'survie'; if (s && !this.finDefi && this.defi.st !== undefined) this.defi.temps = this.defi.st; /* le score = exactement le temps affiché */ const r = _finSurvie.apply(this, arguments); if (s) SurvieRun.effacer(); return r; };
const _actSurvie = UI.action;
UI.action = function (a, btn) { if ((a === 'quitter' || a === 'quitterJeu') && G.mode === 'survie') SurvieRun.garder(); return _actSurvie.call(this, a, btn); };
addEventListener('beforeunload', () => { try { if (G.mode === 'survie' && (G.etat === 'combat' || G.etat === 'pause' || G.etat === 'avant')) SurvieRun.garder(); } catch (e) { } });
// et toutes les 3 s pendant le combat (fenêtre fermée brutalement)
let _gardeSurvieT = 0;
const _majSurvieRun = majCombat;
majCombat = function (dt) { _majSurvieRun.apply(this, arguments); try { if (G.mode === 'survie' && G.etat === 'combat' && (_gardeSurvieT -= 1 / 60) <= 0) { _gardeSurvieT = 3; SurvieRun.garder(); } } catch (e) { } };
// le compteur de la Survie avance avec le temps de jeu en combat, et rien d'autre ne le modifie
const _majSurvieSt = majCombat;
majCombat = function (dt) {
  const t0 = G.t;
  _majSurvieSt.apply(this, arguments);
  try { const df = G.defi; if (G.mode === 'survie' && df && G.etat === 'combat' && !G.finDefi && G.p && G.p.hp > 0) { if (df.st === undefined) df.st = df.temps || 0; df.st += Math.max(0, Math.min(.1, G.t - t0)); } } catch (e) { }
};
