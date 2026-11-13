const C = require('./charger')(['base.js','moteur.js','generateur.js','boss.js']);
let ok = 0, tot = 0;
const src = C.motifGravite;
for (const D of [6, 10, 20]) for (let g = 1; g <= 6; g++) {
  const L = C.genNiveau({ graine: g * 31 + D, D, espece: 'oeil' });
  const bleus = L.orbes.filter(o => o.t === 'bleu').length, tb = L.tampons.filter(o => o.t === 'bleu').length;
  const p = C.nouvelEtat(L); for (let i = 0; i < L.ghost.length && !p.mort && !p.fini; i++) C.pas(p, !!L.ghost[i], L, true);
  tot++; if (p.fini) ok++; else console.log('MORT', D, g, p.cause, p.x.toFixed(1));
  console.log('D', D, 'graine', g, 'orbes bleus', bleus, 'tampons bleus', tb);
}
console.log(ok + '/' + tot);
