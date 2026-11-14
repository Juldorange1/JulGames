/* Teste un morceau de niveau : node outils/morceau.js 6-2 120 175  (colonnes de début et de fin) */
const N = require('../js/niveaux.js'), bot = require('./bot.js');
const [id, a, b] = process.argv.slice(2);
let def; for (const z of N.ZONES) for (const n of z.niveaux) if (n.id === id) def = n;
const carte = def.carte.map((l, y) => { let s = '#' + l.slice(+a, +b) + '#'; s = s.replace(/[@G!]/g, '.'); return s.split(''); });
carte[19][2] = '@'; carte[19][carte[0].length - 3] = 'G';
bot.opt.faisceau = 300; bot.opt.affiner = 0; bot.opt.trace = true;
const r = bot.chercher({ id: 'morceau', nom: 'm', phases: def.phases, carte: carte.map(l => l.join('')) }, false);
console.log(r.ok ? 'OK ' + r.temps / 60 : 'ÉCHEC ' + r.meilleur);
