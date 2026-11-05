'use strict';
/* Colosses — Abysses : quitter puis revenir reprend exactement où on en était (même boss, mêmes armes, mêmes
   mutations, même vie). La descente en cours est gardée dans Save.d.abyssesRun ; elle n'est effacée qu'à la mort
   (on repart alors 2 boss avant son record). */

const AbyssesRun = {
  garder(pv) {
    const df = G.defi; if (!df || df.type !== 'abysses' || G.finDefi) return;
    Save.d.abyssesRun = { i: df.i, tues: df.tues, temps: df.temps, mut: df.mut.slice(), boss: df.boss.map(b => b ? { salle: b.salle, seed: b.seed, mega: b.mega, ars: Object.assign({}, b.ars) } : null), depart: df.depart || 0, degats: df.degats || 0, coups: df.coups || 0, pv: Math.max(1, Math.round(pv !== undefined ? pv : (G.p ? G.p.hp : DF().pv))) };
    Save.write();
  },
  effacer() { if (Save.d.abyssesRun) { delete Save.d.abyssesRun; Save.write(); } }
};
// reprendre une descente en cours
const _lancerAbyssesRun = G.lancerAbysses;
G.lancerAbysses = function () {
  const r = Save.d.abyssesRun;
  if (!r || !Array.isArray(r.boss)) return _lancerAbyssesRun.apply(this, arguments);
  this.mode = 'abysses'; this.finDefi = null;
  this.defi = { type: 'abysses', format: 'abysses', cle: '∞', mut: r.mut.slice(), boss: r.boss.map(b => b ? { salle: b.salle, seed: b.seed, mega: b.mega, ars: Object.assign({}, b.ars) } : undefined), i: r.i, temps: r.temps || 0, tues: r.tues, degats: r.degats || 0, coups: r.coups || 0, depart: r.depart || 0 };
  calcStats(); this.p = creerJoueur(DF().pv); this.p.hp = Math.min(this.p.hpMax, r.pv || this.p.hpMax); this.ars = null;
  this.entrerSalle();
};
// à chaque salle des Abysses : on garde la descente (vie du début de la salle)
const _entrerRun = G.entrerSalle;
G.entrerSalle = function () {
  const r = _entrerRun.apply(this, arguments);
  if (this.mode === 'abysses') AbyssesRun.garder(this.p ? this.p.hp : undefined);
  return r;
};
// on quitte (pause → menu, ou fenêtre fermée) : on garde la vie actuelle
const _actionRun = UI.action;
UI.action = function (a, btn) {
  if ((a === 'quitter' || a === 'quitterJeu') && G.mode === 'abysses' && G.p && G.p.hp > 0) AbyssesRun.garder(G.p.hp);
  return _actionRun.call(this, a, btn);
};
addEventListener('beforeunload', () => { try { if (G.mode === 'abysses' && G.p && G.p.hp > 0 && (G.etat === 'combat' || G.etat === 'interlude' || G.etat === 'pause' || G.etat === 'avant')) AbyssesRun.garder(G.p.hp); } catch (e) { } });
// la mort met fin à la descente
const _finRun = G.terminerDefi;
G.terminerDefi = function (reussi) {
  const abysses = this.defi && this.defi.type === 'abysses';
  const r = _finRun.apply(this, arguments);
  if (abysses) AbyssesRun.effacer();
  return r;
};
