/* Rejoue chaque fantôme Parfait sur le niveau actuel : affiche ceux qui ne finissent plus au même temps. */
const M = require('../js/moteur.js'), N = require('../js/niveaux.js'), P = require('../js/parfaits.js');
const mauvais = [];
for (const z of N.ZONES) for (const def of z.niveaux) {
  const p = P[def.id];
  if (!p) { mauvais.push(def.id); continue; }
  const n = M.charger(def), e = M.nouvelEtat(n);
  for (const inp of M.decompresser(p.f)) { M.pas(n, e, inp); if (e.fini) break; }
  if (!e.fini || e.temps !== p.t) mauvais.push(def.id);
  if (p.fe) {
    const e2 = M.nouvelEtat(n);
    for (const inp of M.decompresser(p.fe)) { M.pas(n, e2, inp); if (e2.fini && e2.eclat) break; if (e2.fini) e2.fini = false; }
    if (!e2.fini || !e2.eclat || e2.temps !== p.te) mauvais.push(def.id + '◆');
  } else mauvais.push(def.id + '◆ (absent)');
}
console.log(mauvais.length ? 'À recalculer : ' + mauvais.join(' ') : 'Tous les Parfaits sont valables');
