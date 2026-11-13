const C = require('./charger')(['base.js','moteur.js','generateur.js','boss.js']);
const raisons = {};
const src = C.motifGravite.toString();
let n = 0, r = 0;
const G = C.creerGenerateur({ graine: 5, D: 10, modes: ['cube'] });
G.P.pGravite = 1;
for (let k = 0; k < 4; k++) C.ajouterSection(G, 4);
console.log('orbes bleus', G.L.orbes.filter(o => o.t === 'bleu').length);
