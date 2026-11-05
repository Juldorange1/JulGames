'use strict';
/* Colosses — défis pour tous les niveaux et cristaux pour tous les modes.
   Survie : la pression monte sans fin (toutes les 10 s : plus de dégâts, moins de répit, des frappes annoncées de plus
   en plus fréquentes autour de toi) : un débutant tient une minute, un très bon joueur bien plus, mais personne
   n'est éternel. Cristaux : chaque mode en donne quand on réussit quelque chose de dur (le mode normal en Cauchemar
   reste celui qui en donne le plus : ×2 par boss). */

const Pression = {
  niveau: 0, frappeT: 0,
  raz() { this.niveau = 0; this.frappeT = 3; },
  maj(dt) {
    const b = G.boss;
    if (G.etat !== 'combat' || !b || b.mort || b.intro > 0) return;
    const n = Math.floor(G.chrono / 10);
    while (this.niveau < n) {
      this.niveau++;
      G.dmgE *= 1.07; // de plus en plus mal
      G.def.idle = Math.max(.12, G.def.idle * .9); // de moins en moins de répit
      G.def.D.S = Math.min(2.2, G.def.D.S * 1.04);
      G.def.D.T = Math.max(.6, G.def.D.T * .97);
    }
    // frappes annoncées autour de toi, de plus en plus serrées
    this.frappeT -= dt;
    if (this.frappeT <= 0 && G.p) {
      const k = this.niveau;
      this.frappeT = Math.max(1.1, 6 - .4 * k);
      const avant = G.atkCourante; G.atkCourante = 'Pression';
      const warn = Math.max(.7, 1.2 - .03 * k), dg = { dmg: DMG(.8) };
      zoneC(G.p.x + R.range(-30, 30), G.p.y + R.range(-30, 30), 58, warn, dg);
      for (let i = 0; i < Math.min(7, 1 + Math.floor(k / 2)); i++) { const pt = Arene.pointAuHasard(60); zoneC(pt.x, pt.y, 58, warn, dg); }
      G.atkCourante = avant;
    }
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
  if (df.format === 'survie') n += Math.floor((res.temps || 0) / 30); // 1 cristal par 30 s tenues
  if (df.format === 'deluge') n += Math.floor((res.degats || 0) / 15000);
  if (df.format === 'danse' && reussi) n += Math.max(0, 6 - (res.coups || 0));
  if (reussi && df.type === 'jour') n += 2; // en plus des 2 déjà donnés
  if (reussi && df.type === 'semaine') n += 6;
  if (res.record) n += df.type === 'abysses' ? 3 : 2;
  if (df.type === 'abysses') n += Math.floor((res.tues || 0) / 3); // la profondeur paie
  if (n > 0) { gagnerEclats(n); res.cristauxBonus = n; }
  return r;
};
const _mortCristaux = dessinerEcranMort;
dessinerEcranMort = function (c) {
  _mortCristaux(c);
  const res = G.finDefi;
  if (res && res.cristauxBonus) { c.save(); c.textAlign = 'center'; icoDessin(c, 'ui:cristal', W / 2 - 110, 712, 24); texteOmbre(c, '+' + res.cristauxBonus + ' cristaux gagnés', W / 2 + 10, 714, '#bfefff', `800 20px ${POLICE}`, 4); c.restore(); }
};
