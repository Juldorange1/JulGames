'use strict';
/* Colosses — défis pour tous les niveaux et cristaux pour tous les modes.
   Survie : la pression monte sans fin (toutes les 10 s : plus de dégâts, moins de répit, des frappes annoncées de plus
   en plus fréquentes autour de toi) : un débutant tient une minute, un très bon joueur bien plus, mais personne
   n'est éternel. Cristaux : chaque mode en donne quand on réussit quelque chose de dur (le mode normal en Cauchemar
   reste celui qui en donne le plus : ×2 par boss). */

// chaque palier (10 s) : un peu plus de dégâts, plus UNE difficulté qui change à chaque fois, toujours dans le même ordre
// (pas de hasard : deux parties de Survie se valent)
const PRESSION_ETAPES = ['frappes', 'vitesse', 'degats', 'repit', 'salves', 'annonces', 'densite'];
const Pression = {
  niveau: 0, frappeT: 0, salveT: 0, n: {},
  raz() { this.niveau = 0; this.frappeT = 3; this.salveT = 4; this.n = {}; },
  temps() { return ((G.defi && G.defi.temps) || 0) + G.chrono; },
  monter() {
    this.niveau++;
    const e = PRESSION_ETAPES[(this.niveau - 1) % PRESSION_ETAPES.length], D = G.def.D;
    this.n[e] = (this.n[e] || 0) + 1;
    G.dmgE *= 1.03;
    if (e === 'vitesse') D.S = Math.min(2.2, D.S * 1.08);
    else if (e === 'degats') G.dmgE *= 1.12;
    else if (e === 'repit') G.def.idle = Math.max(.12, G.def.idle * .78);
    else if (e === 'annonces') D.T = Math.max(.6, D.T * .93);
    else if (e === 'densite') D.C = Math.min(2.4, D.C * 1.1);
  },
  maj(dt) {
    const b = G.boss;
    if (G.etat !== 'combat' || !b || b.mort || b.intro > 0 || !G.p) return;
    while (this.niveau < Math.floor(this.temps() / 10)) this.monter();
    const avant = G.atkCourante; G.atkCourante = 'Pression';
    // frappes annoncées autour de toi (de plus en plus nombreuses et fréquentes)
    const f = this.n.frappes || 0;
    this.frappeT -= dt;
    if (this.frappeT <= 0) {
      this.frappeT = Math.max(1.1, 6 - .9 * f);
      const warn = Math.max(.75, 1.2 - .05 * f), dg = { dmg: DMG(.8) };
      zoneC(G.p.x + R.range(-30, 30), G.p.y + R.range(-30, 30), 58, warn, dg);
      for (let i = 0; i < Math.min(8, 2 * f); i++) { const pt = Arene.pointAuHasard(60); zoneC(pt.x, pt.y, 58, warn, dg); }
    }
    // salves : un anneau de balles autour du boss, avec un trou face à toi
    const sv = this.n.salves || 0;
    if (sv > 0) {
      this.salveT -= dt;
      if (this.salveT <= 0) {
        this.salveT = Math.max(2.2, 6.5 - .7 * sv);
        const n = 12 + 3 * sv, a0 = ang(b.x, b.y, G.p.x, G.p.y);
        for (let k = 0; k < n; k++) { const a = a0 + k * TAU / n; if (k === 0 || k === 1 || k === n - 1) continue; EB(b.x, b.y, a, 130 + 10 * sv, { r: 8, dmg: DMG(.8) }); }
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
  if (df.format === 'survie') n += Math.floor(Math.max(0, (res.temps || 0) - (df.depart || 0)) / 30); // 1 cristal par 30 s vraiment tenues
  if (df.format === 'deluge') n += Math.floor((res.degats || 0) / 15000);
  if (df.format === 'danse' && reussi) n += Math.max(0, 6 - (res.coups || 0));
  if (reussi && df.type === 'jour') n += 2; // en plus des 2 déjà donnés
  if (reussi && df.type === 'semaine') n += 6;
  if (res.record) n += df.type === 'abysses' ? 3 : 2;
  if (df.type === 'abysses') n += Math.floor((res.tues || 0) / 3); // la profondeur paie
  if (n > 0) { const k = gagnerEclats(n); if (k) res.cristauxBonus = k; }
  return r;
};
const _mortCristaux = dessinerEcranMort;
dessinerEcranMort = function (c) {
  _mortCristaux(c);
  const res = G.finDefi;
  if (res && res.cristauxBonus) { c.save(); c.textAlign = 'center'; icoDessin(c, 'ui:cristal', W / 2 - 110, 712, 24); texteOmbre(c, '+' + res.cristauxBonus + ' cristaux gagnés', W / 2 + 10, 714, '#bfefff', `800 20px ${POLICE}`, 4); c.restore(); }
};
