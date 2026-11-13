const C = require('./charger')(['base.js','moteur.js','generateur.js']);
const D = +process.argv[2], g = +process.argv[3];
const L = C.genNiveau({ graine: g * 7919 + Math.round(D * 100), D });
const p = C.nouvelEtat(L);
let i = 0;
for (; i < L.ghost.length && !p.mort && !p.fini; i++) {
  C.pas(p, !!L.ghost[i], L, true);
  if (Math.abs(p.y - L.gy[i + 1]) > 1e-6 && !p.mort) { console.log('divergence au pas', i + 1, 'y', p.y, 'fantome', L.gy[i + 1], 'x', p.x.toFixed(3), L.xs[i+1].toFixed(3), 'mode', p.mode, 'sol', p.sol, 'vy', p.vy); break; }
}
console.log('fin', i, p.mort, p.cause, p.x.toFixed(3), p.y.toFixed(3));
for (const b of L.blocs) if (b.x < p.x + 2 && b.x + b.w > p.x - 2 && b.w > 0) console.log('bloc', b.x.toFixed(2), b.y, b.w.toFixed(2), b.h, 'st', b.st);
for (let k = i - 5; k < i + 3; k++) console.log(k, L.xs[k] && L.xs[k].toFixed(3), L.gy[k] && L.gy[k].toFixed(3), L.ghost[k], L.gsol[k]);
for (const t of L.tampons) { let k = 0; while (L.xs[k] < t.x) k++; console.log('tampon', t.x.toFixed(3), t.y, 'fantome au pas', k, 'y', L.gy[k].toFixed(3), 'vy?', (L.gy[k+5]-L.gy[k]).toFixed(3)); }
