const C = require('./charger')(['base.js','moteur.js','generateur.js','boss.js']);
const n = +process.argv[2];
const graine = C.hashTexte('pulsar-parcours-' + n), D = C.dParcours(n), R0 = C.rngGraine(graine);
const opts = { graine, D, espece: C.especePour(n, R0), grand: n % 10 === 0 };
const G = C.creerGenerateur(opts);
try { for (let k = 0; k < 40; k++) { const sec = C.ajouterSection(G, G.P.mesures()); console.log('section', sec.mode, sec.s0, sec.s1, sec.x0.toFixed(2), 'h', G.h, 'c', G.c); } }
catch (e) {
  console.log(e.message);
  const s = G.s, L = G.L;
  console.log('etat', JSON.stringify({ x: s.x.toFixed(3), y: s.y.toFixed(3), vy: s.vy.toFixed(2), mode: s.mode, g: s.g, sol: s.sol }));
  L.blocs.filter(b => b.x < s.x + 2 && b.x + b.w > s.x - 2 && b.w > 0).forEach(b => console.log('bloc', b.x.toFixed(2), b.y, b.w.toFixed(2), b.h.toFixed(2), 'st', b.st));
  L.piques.filter(b => Math.abs(b.x - s.x) < 3).forEach(b => console.log('pique', b.x.toFixed(2), b.y, b.dir));
  const n2 = L.xs.length; for (let i = Math.max(0, n2 - 6); i < n2; i++) console.log(i, L.xs[i].toFixed(3), L.gy[i].toFixed(3), C.MODES[L.gmode[i]], L.ghost[i]);
}
