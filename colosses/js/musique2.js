'use strict';
/* Colosses — musique qui suit le combat : chaque morceau passe par un filtre. Au début du combat il est un peu
   feutré ; il s'ouvre à chaque phase et devient plein (et un peu plus fort) à la dernière phase, pendant le dernier
   souffle ou quand ta vie est basse. Au menu et entre deux salles, la musique est normale. */

const MusiqueVive = { I: 1, cible: 1 };
function brancherPiste(p) {
  if (!p || p.chaine || !Son.c || !p.el) return;
  try {
    const src = Son.c.createMediaElementSource(p.el), f = Son.c.createBiquadFilter(), g = Son.c.createGain();
    f.type = 'lowpass'; f.frequency.value = 20000; f.Q.value = .7; g.gain.value = p.el.volume;
    src.connect(f); f.connect(g); g.connect(Son.c.destination); if (Son.fluxSortie) g.connect(Son.fluxSortie);
    p.chaine = { f, g };
  } catch (e) { p.chaine = { erreur: true }; }
}
const _jouerVive = Musique.jouer.bind(Musique);
Musique.jouer = function (fichier, fondu) { const r = _jouerVive(fichier, fondu); try { for (const p of this.pistes) brancherPiste(p); } catch (e) { } return r; };
function intensiteVoulue() {
  const b = G.boss, p = G.p;
  if (G.etat !== 'combat' || !b || !b.def || b.mort) return 1;
  if (b.finale) return 1;
  const n = b.def.phases.length, f = n > 1 ? b.phase / (n - 1) : 1;
  let I = .5 + .5 * f;
  if (p && p.hp < p.hpMax * .35) I = Math.max(I, .9);
  if (b.trans > 0 && b.trans < 999) I = Math.max(I, .95); // le changement de phase fait monter la musique
  return clamp(I, 0, 1);
}
const _majVive = Musique.maj.bind(Musique);
Musique.maj = function (dt) {
  _majVive(dt);
  try {
    const M = MusiqueVive; M.cible = intensiteVoulue();
    M.I += clamp(M.cible - M.I, -dt * .35, dt * .8);
    const freq = 1100 * Math.pow(2, M.I * 4.2), gain = .82 + .18 * M.I;
    for (const p of this.pistes) {
      if (!p.chaine && Son.c) brancherPiste(p);
      if (p.chaine && p.chaine.f) { p.chaine.f.frequency.setTargetAtTime(Math.min(20000, freq), Son.c.currentTime, .15); p.chaine.g.gain.setTargetAtTime(gain * p.el.volume, Son.c.currentTime, .05); } // le volume du lecteur ne compte plus une fois branché : on l'applique ici
    }
  } catch (e) { }
};
