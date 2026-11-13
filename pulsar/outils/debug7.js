const C = require('./charger')(['base.js','moteur.js','generateur.js','boss.js']);
const G = C.creerGenerateur({ graine: 77, D: 10, modes: ['boule'] });
for (let i = 0; i < 6; i++) C.ajouterSection(G, 4);
console.log(JSON.stringify(G.stat), 'piques', G.L.piques.length);
