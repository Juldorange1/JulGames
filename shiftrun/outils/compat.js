/* Phase — compatibilité des salles avec les états de base (Solide, Liquide, Plume, Caoutchouc, Métal).
   Pour chaque salle, le robot essaie de la franchir avec un seul état de base + les états qu'elle exige (req).
   node outils/compat.js [salle ...] [--sortie=fichier.json]   puis   node outils/compat.js --fusion fichiers...
   Le résultat va dans js/compat.js : une salle n'apparaît dans un niveau que si un de ses états de base y est. */
'use strict';
const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2);
const FICHIER = path.join(__dirname, '..', 'js', 'compat.js');

if (args[0] === '--fusion') {
  const tout = {};
  for (const f of args.slice(1)) Object.assign(tout, JSON.parse(fs.readFileSync(f, 'utf8')));
  const lignes = Object.keys(tout).sort().map(k => '  ' + JSON.stringify(k) + ': ' + JSON.stringify(tout[k]));
  fs.writeFileSync(FICHIER, '/* GÉNÉRÉ par outils/compat.js : états de base avec lesquels chaque salle est faisable. */\n' +
    '(function (racine) {\nconst COMPAT = {\n' + lignes.join(',\n') + '\n};\nif (typeof module !== \'undefined\' && module.exports) module.exports = COMPAT;\nelse racine.COMPAT = COMPAT;\n})(typeof window !== \'undefined\' ? window : globalThis);\n');
  console.log('js/compat.js écrit (' + Object.keys(tout).length + ' salles)');
  process.exit(0);
}

const Gen = require('../js/gen.js');
const bot = require('./bot.js');
bot.opt.faisceau = 250; bot.opt.affiner = 0; bot.opt.verbeux = false; bot.opt.max = 2400;
let sortie = null;
const types = [];
for (const a of args) { if (a.startsWith('--sortie=')) sortie = a.split('=')[1]; else types.push(a); }
const liste = types.length ? types : Object.keys(Gen.SALLES);
const res = {};
for (const nom of liste) {
  const req = Gen.SALLES[nom].req || [];
  const ok = [];
  for (const b of Gen.STABLES) {
    const phases = [b].concat(req.filter(r => r !== b));
    const etats = phases.concat([b, b, b]).slice(0, 4);
    let bon = true;
    for (const [d, gr] of [[0.2, 1], [1.0, 2]]) {
      const carte = Gen.essai(nom, gr * 7919 + Math.round(d * 100), d, false, false, false, phases);
      const r = bot.chercher({ id: nom + '/' + b, nom, phases, etats, carte }, nom.startsWith('alcove'));
      if (!r.ok) { bon = false; break; }
    }
    if (bon) ok.push(b);
  }
  res[nom] = ok;
  console.log(nom.padEnd(12) + ' ' + JSON.stringify(ok.map(b => ['S', 'L', 'Z', 'P', 'PL', 'CA', 'ME', 'OM', 'GL', 'MA'][b])));
}
if (sortie) fs.writeFileSync(sortie, JSON.stringify(res));
