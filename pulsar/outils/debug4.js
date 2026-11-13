const C = require('./charger')(['base.js','moteur.js','generateur.js','boss.js']);
const D = +process.argv[2], g = +process.argv[3];
const L = C.genNiveau({ graine: g * 7919 + Math.round(D * 100), D });
const p = C.nouvelEtat(L);
for (let i = 0; i < L.ghost.length && !p.mort && !p.fini; i++) C.pas(p, !!L.ghost[i], L, true);
const t = (p.step - 1) * C.DT;
console.log('mort', p.cause, 'pas', p.step, 't', t.toFixed(3), 'x', p.x.toFixed(2), 'y', p.y.toFixed(2), 'ghost y', L.gy[p.step].toFixed(2), L.gy[p.step-1].toFixed(2));
for (const a of L.attaques) if (t >= a.ta && t <= a.tb && C.ATTAQUES[a.type].touche(a, t, p.x, p.y, C.PHYS[p.mode].hz, L)) console.log(JSON.stringify(a));
