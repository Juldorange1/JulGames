// Génère les niveaux du Parcours exactement comme le jeu et vérifie qu'ils sont tous faisables
const C = require('./charger')(['base.js','moteur.js','generateur.js','boss.js']);
const N = +(process.argv[2] || 150);
let err = 0, tt = 0, maxT = 0;
for (let n = 1; n <= N; n++) {
  const graine = C.hashTexte('pulsar-parcours-' + n), D = C.dParcours(n), grand = n % 10 === 0;
  const R = C.rngGraine(graine), esp = C.especePour(n, R);
  const t0 = Date.now();
  let L;
  try { L = C.genNiveau({ graine, D, espece: esp, grand }); } catch (e) { err++; console.log('niveau', n, 'ERREUR', e.message); continue; }
  const dt = Date.now() - t0; tt += dt; maxT = Math.max(maxT, dt);
  const p = C.nouvelEtat(L);
  for (let i = 0; i < L.ghost.length && !p.mort && !p.fini; i++) C.pas(p, !!L.ghost[i], L, true);
  if (!p.fini) { err++; console.log('niveau', n, 'REJEU', p.mort ? 'mort ' + p.cause : 'pas fini', p.x.toFixed(1), p.mode); }
  if (n % 25 === 0) console.log('niveau', n, 'D', D, Math.round(L.duree) + ' s', L.attaques.length + ' attaques', L.eclats.length + ' éclats', dt + ' ms');
}
console.log(err ? err + ' ERREURS' : 'OK', 'moyenne', (tt / N).toFixed(0), 'ms, max', maxT, 'ms');
