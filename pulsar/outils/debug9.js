const C = require('./charger')(['base.js','moteur.js','generateur.js','boss.js']);
const n = +process.argv[2];
const graine = C.hashTexte('pulsar-parcours-' + n), D = C.dParcours(n), R0 = C.rngGraine(graine);
const L = C.genNiveau({ graine, D, espece: C.especePour(n, R0), grand: n % 10 === 0 });
const p = C.nouvelEtat(L);
for (let i = 0; i < L.ghost.length && !p.mort && !p.fini; i++) {
  const av = C.copieEtat(p);
  C.pas(p, !!L.ghost[i], L, false);
  if (Math.abs(p.y - L.gy[i + 1]) > 1e-6) {
    console.log('divergence pas', i + 1, 'x', p.x.toFixed(3), 'y', p.y.toFixed(4), 'fantôme', L.gy[i + 1].toFixed(4), 'mode', p.mode, 'g', p.g, 'vy', p.vy.toFixed(3), 'sol', p.sol, 'avant', av.y.toFixed(4), av.vy.toFixed(3), av.sol);
    L.blocs.filter(b => b.x < p.x + 2 && b.x + b.w > p.x - 2 && b.w > 0).forEach(b => console.log('bloc', b.x.toFixed(2), b.y, b.w.toFixed(2), b.h.toFixed(2), 'st', b.st, 'id', b.id));
    L.portails.filter(o => Math.abs(o.x - p.x) < 3).forEach(o => console.log('portail', o.x.toFixed(3), o.t, o.v));
    L.orbes.concat(L.tampons).filter(o => Math.abs(o.x - p.x) < 3).forEach(o => console.log('orbe/tampon', o.x.toFixed(2), o.y, o.t));
    break;
  }
}
