// Rejoue les niveaux en décalant chaque appui/relâchement au hasard de ±j ms : % moyen atteint
const C = require('./charger')(['base.js','moteur.js','generateur.js','boss.js']);
const niveaux = (process.argv[2] || '1,3,5,10,20,30,50,80').split(',').map(Number);
const jit = [15, 30, 50, 80];
function bruite(ghost, j, R) {
  const out = new Uint8Array(ghost.length); const ev = [];
  for (let i = 0; i < ghost.length; i++) if (i === 0 ? ghost[0] : ghost[i] !== ghost[i - 1]) ev.push([i, ghost[i]]);
  let cur = 0, k = 0; const evs = ev.map(([i, v]) => [Math.max(0, i + Math.round((R() * 2 - 1) * j * 0.24)), v]).sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < ghost.length; i++) { while (k < evs.length && evs[k][0] <= i) { cur = evs[k][1]; k++; } out[i] = cur; }
  // un appui très court ne doit pas disparaître
  return out;
}
for (const n of niveaux) {
  const graine = C.hashTexte('pulsar-parcours-' + n), D = C.dParcours(n), R0 = C.rngGraine(graine);
  const L = C.genNiveau({ graine, D, espece: C.especePour(n, R0), grand: n % 10 === 0 });
  const res = [];
  for (const j of jit) {
    let tot = 0, fini = 0; const R = C.rngGraine(n * 100 + j);
    for (let e = 0; e < 30; e++) {
      const g = bruite(L.ghost, j, R), p = C.nouvelEtat(L);
      for (let i = 0; i < g.length && !p.mort && !p.fini; i++) C.pas(p, !!g[i], L, true);
      tot += Math.min(100, p.x / L.fin * 100); if (p.fini) fini++;
    }
    res.push('±' + j + 'ms: ' + (tot / 30).toFixed(0) + '% (' + fini + '/30 finis)');
  }
  console.log('niveau ' + n + ' D=' + D + ' | ' + res.join(' | '));
}
