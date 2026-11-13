const C = require('./charger')(['base.js','moteur.js','generateur.js','boss.js']);
const n = 111, graine = C.hashTexte('pulsar-parcours-' + n), D = C.dParcours(n), R0 = C.rngGraine(graine);
const G = C.creerGenerateur({ graine, D, espece: C.especePour(n, R0) });
C.DEBUG_BOULE = 1; const orig = C.avancer;
C.avancer = function (G2, k, f) { if (G2.step > 2300 && G2.step < 2480) console.log('avancer de', G2.step, 'pendant', k, (new Error()).stack.split('\n')[2].trim()); return orig(G2, k, f); };
try { for (let k = 0; k < 5; k++) C.ajouterSection(G, G.P.mesures()); } catch (e) { console.log(e.message); }
