const C = require('./charger')(['base.js','moteur.js','generateur.js']);
const D = +process.argv[2], g = +process.argv[3];
const opts = { graine: g * 7919 + Math.round(D * 100), D };
const G = C.creerGenerateur(opts);
const orig = C.avancer;
try {
  while (G.step / G.spb < 62 / (G.spb * C.DT) - 6) { const m = G.P.mesures(); const sec = C.ajouterSection(G, m); console.log('section', sec.mode, 's0', sec.s0, 's1', sec.s1, 'x', sec.x0.toFixed(1), sec.x1.toFixed(1)); }
} catch (e) {
  console.log(e.message);
  const s = G.s, L = G.L;
  console.log('etat', JSON.stringify({ x: s.x, y: s.y, vy: s.vy, mode: s.mode, g: s.g, sol: s.sol, h: G.h, c: G.c }));
  for (const b of L.blocs) if (b.x < s.x + 2 && b.x + b.w > s.x - 2 && b.w > 0) console.log('bloc', b.x.toFixed(2), b.y, b.w.toFixed(2), b.h, 'st', b.st);
  const n = L.xs.length; for (let i = Math.max(0, n - 8); i < n; i++) console.log(i, L.xs[i].toFixed(3), L.gy[i].toFixed(3), C.MODES[L.gmode[i]], L.ghost[i]);
}
