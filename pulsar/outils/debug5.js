const C = require('./charger')(['base.js','moteur.js','generateur.js','boss.js']);
const n = +process.argv[2], modeV = process.argv[3] || 'cube';
const graine = C.hashTexte('pulsar-parcours-' + n), D = C.dParcours(n), R0 = C.rngGraine(graine);
const L = C.genNiveau({ graine, D, espece: C.especePour(n, R0), grand: n % 10 === 0 });
const g = L.ghost, N = g.length; const edges = []; for (let i = 1; i < N; i++) if (g[i] !== g[i - 1]) edges.push(i);
const etats = {}; const p = C.nouvelEtat(L); const set = new Set(edges.map(e => e - 30));
for (let i = 0; i < N; i++) { if (set.has(i)) etats[i] = C.copieEtat(p); C.pas(p, !!g[i], L, true); }
for (let k = 0; k < edges.length; k++) {
  const e = edges[k], s0 = e - 30; if (!etats[s0]) continue; if (C.MODES[L.gmode[e]] !== modeV) continue;
  const fin = Math.min(N - 1, (edges[k + 1] || e + 60) + 30);
  const tester = (d) => { const q = C.copieEtat(etats[s0]); for (let i = s0; i < fin && !q.mort; i++) { let v = g[i]; if (d > 0 && i >= e && i < e + d) v = g[e - 1]; if (d < 0 && i >= e + d && i < e) v = g[e]; C.pas(q, !!v, L, true); } return q.mort ? q.cause : ''; };
  let tard = 0, ct = ''; while (tard < 40 && !(ct = tester(tard + 1))) tard++;
  let tot = 0, co = ''; while (tot < 40 && !(co = tester(-(tot + 1)))) tot++;
  if ((tard + tot) * 4.17 < 120) console.log('pas', e, g[e] ? 'APPUI' : 'relâche', 'x', L.xs[e].toFixed(1), 'y', L.gy[e].toFixed(2), 'tôt', (tot * 4.17).toFixed(0), co, 'tard', (tard * 4.17).toFixed(0), ct, 'durée tenue', (() => { let j = e; while (j < N && g[j] === g[e]) j++; return j - e; })());
}
