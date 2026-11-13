const C = require('./charger')(['base.js','moteur.js','generateur.js']);
const D = 1.5, g = 4;
const src = C.motifSaut;
C.motifSaut = function (G, opt) {
  const st = G.step, x = G.s.x, nt = G.L.tampons.length;
  const r = src(G, opt);
  if (opt.type === 'tampon') console.log('motif tampon pas', st, 'x', x.toFixed(2), 'ok', r, 'tampons', nt, '->', G.L.tampons.length, 'pas après', G.step, 'y', G.s.y.toFixed(2), 'sol', G.s.sol, 'h', G.h);
  return r;
};
C.genNiveau({ graine: g * 7919 + Math.round(D * 100), D });
