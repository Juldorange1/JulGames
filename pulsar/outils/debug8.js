const C = require('./charger')(['base.js','moteur.js','generateur.js','boss.js']);
const n = +process.argv[2];
const graine = C.hashTexte('pulsar-parcours-' + n), D = C.dParcours(n), R0 = C.rngGraine(graine);
const L = C.genNiveau({ graine, D, espece: C.especePour(n, R0), grand: n % 10 === 0 });
const p = C.nouvelEtat(L);
for (let i = 0; i < L.ghost.length && !p.mort && !p.fini; i++) C.pas(p, !!L.ghost[i], L, true);
const t = p.step * C.DT;
console.log('mort', p.cause, p.step, 'x', p.x.toFixed(2), 'y', p.y.toFixed(3), 'gy', L.gy[p.step].toFixed(3), L.gy[p.step-1].toFixed(3), 'mode', p.mode);
for (const a of L.attaques) if (t >= a.ta - 0.01 && t <= a.tb + 0.01 && C.ATTAQUES[a.type].touche(a, t, p.x, p.y, C.PHYS[p.mode].hz, L)) console.log(JSON.stringify(a));
