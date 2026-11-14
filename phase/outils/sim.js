/* node outils/sim.js 2-1 "D*20,DL,DH*100" : rejoue une suite d'entrées et affiche la position */
const M = require('../js/moteur.js'), N = require('../js/niveaux.js');
const id = process.argv[2], prog = process.argv[3];
let def; for (const z of N.ZONES) for (const n of z.niveaux) if (n.id === id) def = n;
const n = M.charger(def), e = M.nouvelEtat(n);
const B = { G: M.E.G, D: M.E.D, H: M.E.H, B: M.E.B, J: M.E.SAUT, s: M.E.S, l: M.E.L, z: M.E.Z, p: M.E.P };
let f = 0;
for (const m of prog.split(',')) {
  const [k, r] = m.split('*'); let inp = 0; for (const c of k) if (B[c]) inp |= B[c];
  for (let i = 0; i < (+r || 1); i++) {
    M.pas(n, e, inp); f++;
    if (f % 5 === 0 || e.ev) console.log(f, 'x', (e.x / 16).toFixed(2), 'y', (e.y / 16).toFixed(2), 'v', e.vx.toFixed(2), e.vy.toFixed(2), 'SLZP'[e.phase], 'att', e.att, 'sol', e.sol, 'ch', e.charges, e.mortT ? 'MORT' : '', e.fini ? 'FINI' : '');
  }
}
