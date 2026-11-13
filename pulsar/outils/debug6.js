const C = require('./charger')(['base.js','moteur.js','generateur.js','boss.js']);
const n = +process.argv[2], e = +process.argv[3], d = +process.argv[4];
const graine = C.hashTexte('pulsar-parcours-' + n), D = C.dParcours(n), R0 = C.rngGraine(graine);
const L = C.genNiveau({ graine, D, espece: C.especePour(n, R0), grand: n % 10 === 0 });
const g = L.ghost; const p = C.nouvelEtat(L);
for (let i = 0; i < e - 30; i++) C.pas(p, !!g[i], L, true);
const q = C.copieEtat(p);
for (let i = e - 30; i < e + 200 && !q.mort; i++) { let v = g[i]; if (d > 0 && i >= e && i < e + d) v = g[e - 1]; if (d < 0 && i >= e + d && i < e) v = g[e]; C.pas(q, !!v, L, true); if (i >= e - 6 && i <= e + 6) console.log(i, 'x', q.x.toFixed(2), 'y', q.y.toFixed(2), 'gy', L.gy[i + 1].toFixed(2), 'sol', q.sol, 'vy', q.vy.toFixed(2), 'v', v); }
console.log('mort', q.mort, q.cause, 'x', q.x.toFixed(2), 'y', q.y.toFixed(2));
L.piques.filter(s => Math.abs(s.x - q.x) < 6).forEach(s => console.log('pique', s.x.toFixed(2), s.y, s.dir));
L.blocs.filter(b => b.x < q.x + 6 && b.x + b.w > q.x - 6).forEach(b => console.log('bloc', b.x.toFixed(2), b.y, b.w.toFixed(2), b.h));
