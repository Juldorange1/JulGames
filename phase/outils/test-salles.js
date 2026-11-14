/* Phase — vérifie que chaque type de salle est faisable, à plusieurs difficultés et graines, avec le robot.
   node outils/test-salles.js [type ...] [--graines=6] [--faisceau=250]
   Une salle qui échoue est affichée avec sa carte : à corriger dans js/gen.js. */
'use strict';
const Gen = require('../js/gen.js');
const bot = require('./bot.js');
const args = process.argv.slice(2);
let graines = 6;
const types = [];
for (const a of args) {
  if (a.startsWith('--graines=')) graines = +a.split('=')[1];
  else if (a.startsWith('--faisceau=')) bot.opt.faisceau = +a.split('=')[1];
  else types.push(a);
}
if (!args.some(a => a.startsWith('--faisceau='))) bot.opt.faisceau = 250;
bot.opt.affiner = 0;
bot.opt.verbeux = false;
const liste = types.length ? types : Object.keys(Gen.SALLES).concat(['cheminee*']);
let echecs = 0;
const t0 = Date.now();
for (const nom of liste) {
  const glace = nom.endsWith('*'), type = glace ? nom.slice(0, -1) : nom;
  const phases = glace ? [0, 1, 2, 3] : Gen.SALLES[type].phases;
  const tps = [];
  for (const d of [0, 0.4, 0.8, 1.2]) for (let gr = 1; gr <= graines; gr++) {
    const carte = Gen.essai(type, gr * 7919 + Math.round(d * 100), d, glace);
    const r = bot.chercher({ id: nom + '/' + d + '/' + gr, nom, phases, carte }, false);
    if (!r.ok) {
      echecs++;
      console.log('ÉCHEC ' + nom + ' d=' + d + ' graine ' + gr + ' (' + r.meilleur + ')');
      carte.forEach((l, i) => console.log(String(i).padStart(2) + ' ' + l));
    } else tps.push(r.temps / 60);
  }
  console.log(nom.padEnd(11) + ' ' + tps.length + ' réussies, ' + (tps.reduce((a, b) => a + b, 0) / Math.max(1, tps.length)).toFixed(2) + ' s en moyenne');
}
console.log('Total : ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s, ' + echecs + ' échec(s)');
process.exitCode = echecs ? 1 : 0;
