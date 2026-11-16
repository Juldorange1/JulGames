/* Affiche la carte d'un niveau : node outils/voir.js 1-2 */
const NIV = require('../js/niveaux.js');
const M = require('../js/moteur.js');
for (const z of NIV.ZONES) for (const n of z.niveaux) if (process.argv.slice(2).includes(n.id)) {
  console.log(n.id + ' ' + n.nom); M.charger(n);
  n.carte.forEach((l, i) => console.log(String(i).padStart(2) + ' ' + l));
}
