// Fenêtre de timing de chaque appui : de combien de ms peut-on appuyer trop tôt / trop tard (les autres appuis parfaits) ?
const C = require('./charger')(['base.js','moteur.js','generateur.js','boss.js']);
const niveaux = (process.argv[2] || '1,3,5,10,20,30,50,80').split(',').map(Number);
const modeArg = process.argv[3];
function fenetres(L) {
  const g = L.ghost, N = g.length;
  const edges = []; for (let i = 1; i < N; i++) if (g[i] !== g[i - 1]) edges.push(i);
  // états du fantôme
  const etats = new Array(N); const p = C.nouvelEtat(L);
  for (let i = 0; i < N; i++) { if (i % 1 === 0) etats[i] = null; if (edges.includes(i + 30)) etats[i] = C.copieEtat(p); C.pas(p, !!g[i], L, true); }
  const res = [];
  for (let k = 0; k < edges.length; k++) {
    const e = edges[k], s0 = e - 30; if (s0 < 0 || !etats[s0]) continue;
    const fin = Math.min(N - 1, (edges[k + 1] || e + 60) + 30);
    const mode = C.MODES[L.gmode[e]];
    const tester = (d) => {
      const q = C.copieEtat(etats[s0]);
      for (let i = s0; i < fin && !q.mort; i++) {
        let v = g[i];
        if (d > 0 && i >= e && i < e + d) v = g[e - 1];       // en retard : on garde l'ancien état
        if (d < 0 && i >= e + d && i < e) v = g[e];           // en avance
        C.pas(q, !!v, L, true);
      }
      return !q.mort;
    };
    let tard = 0; while (tard < 40 && tester(tard + 1)) tard++;
    let tot = 0; while (tot < 40 && tester(-(tot + 1))) tot++;
    res.push({ mode, appui: g[e] === 1, tot: tot * 4.17, tard: tard * 4.17, total: (tot + tard) * 4.17 });
  }
  return res;
}
for (const n of niveaux) {
  const graine = C.hashTexte('pulsar-parcours-' + n), D = C.dParcours(n), R0 = C.rngGraine(graine);
  const L = C.genNiveau({ graine, D, espece: C.especePour(n, R0), grand: n % 10 === 0 });
  let f = fenetres(L).filter(x => !modeArg || x.mode === modeArg);
  const parMode = {};
  f.forEach(x => { (parMode[x.mode] = parMode[x.mode] || []).push(x.total); });
  const q = (a, p) => { a = a.slice().sort((x, y) => x - y); return a[Math.floor(p * (a.length - 1))]; };
  console.log('niveau ' + n + ' D=' + D + ' | ' + Object.keys(parMode).map(m => m + ' min ' + q(parMode[m], 0).toFixed(0) + ' p10 ' + q(parMode[m], 0.1).toFixed(0) + ' med ' + q(parMode[m], 0.5).toFixed(0) + ' ms (' + parMode[m].length + ')').join(' | '));
}
