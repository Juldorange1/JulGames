/* Shiftrun — équilibre la difficulté de chaque salle SELON LES TRANSFORMATIONS DU NIVEAU.
   Une même salle n'est pas aussi dure avec le plasma qu'avec la plume : on mesure donc chaque paire
   (type de salle, transformations du niveau) telle qu'elle apparaît dans les niveaux.
   Mesure (comme outils/difficulte.js) : un robot « humain » (décisions toutes les 6 images) trouve un passage avec ces
   transformations, puis le rejoue des dizaines de fois avec de petites imprécisions ; taux d'échec = difficulté.
   On mesure à d - 0,15 et d + 0,15 (pente locale), on compare à la difficulté visée pour d (moyenne de toutes les
   paires, rendue croissante), et on écrit js/equilibre.js : le petit décalage de d à appliquer à cette paire.
   node outils/equilibre.js [--travailleurs=11] [--graines=2] */
'use strict';
const path = require('path'), fs = require('fs');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

function robustesse(M, n, ent, j, essais, limite, alea) {
  const blocs = [];
  for (let i = 0; i < ent.length;) { let k = i; while (k < ent.length && ent[k] === ent[i]) k++; blocs.push([ent[i], k - i]); i = k; }
  let ok = 0;
  for (let t = 0; t < essais; t++) {
    const suite = [];
    for (let b = 0; b < blocs.length; b++) {
      const [v, len] = blocs[b], dl = b < blocs.length - 1 ? Math.round((alea() * 2 - 1) * j) : 0;
      for (let k = 0; k < Math.max(1, len + dl); k++) suite.push(v);
    }
    const e = M.nouvelEtat(n);
    for (let i = 0; i < suite.length + 120 && e.temps < limite; i++) {
      M.pas(n, e, suite[i] !== undefined ? suite[i] : suite[suite.length - 1] & ~(M.E.S | M.E.L | M.E.Z | M.E.P));
      if (e.mortT > 0) break;
      if (e.fini) { ok++; break; }
    }
  }
  return ok / essais;
}

if (!isMainThread) {
  const M = require('../js/moteur.js'), Gen = require('../js/gen.js'), bot = require('./bot.js');
  let ga = 777; const alea = () => { ga = (ga * 1103515245 + 12345) & 0x7fffffff; return ga / 0x7fffffff; };
  const mesure = (nom, etats, d, graine) => {
    const glace = nom.endsWith('*'), type = glace ? nom.slice(0, -1) : nom;
    let carte;
    try { carte = Gen.essai(type, graine, d, glace, false, false, etats); } catch (err) { return null; }
    const def = { id: nom, nom, phases: etats.slice(), etats: etats.slice(), carte };
    bot.opt.pasK = 6; bot.opt.faisceau = 250; bot.opt.affiner = 0; bot.opt.verbeux = false; bot.opt.collecter = 24;
    let r; try { r = bot.chercher(def, false); } catch (err) { return null; }
    if (!r.ok) return 1;
    const n = M.charger(def);
    let meilleur = 0;
    for (const ent of r.chemins) {
      const p2 = robustesse(M, n, ent, 2, 16, r.temps + 300, alea);
      if (p2 + 0.5 <= meilleur) continue;
      const p4 = robustesse(M, n, ent, 4, 16, r.temps + 300, alea);
      meilleur = Math.max(meilleur, (p2 + p4) / 2);
      if (meilleur >= 0.99) break;
    }
    return 1 - meilleur;
  };
  for (const job of workerData.jobs) {
    const res = [];
    for (const dd of [job.d - 0.15, job.d + 0.15]) {
      let s = 0, k = 0;
      for (let gr = 1; gr <= workerData.graines; gr++) { const v = mesure(job.type, job.etats, Math.max(0, dd), gr * 7919 + Math.round(dd * 100)); if (v != null) { s += v; k++; } }
      res.push(k ? s / k : null);
    }
    parentPort.postMessage({ cle: job.cle, d: job.d, bas: res[0], haut: res[1] });
  }
} else {
  const args = process.argv.slice(2);
  const tw = +((args.find(a => a.startsWith('--travailleurs=')) || '').split('=')[1] || 11);
  const graines = +((args.find(a => a.startsWith('--graines=')) || '').split('=')[1] || 2);
  // les niveaux construits SANS équilibrage : on mesure les salles telles que le générateur les demande
  process.env.SHIFTRUN_SANS_EQUILIBRE = '1';
  const N = require('../js/niveaux.js');
  const paires = new Map();
  for (const def of N.ZONES.flatMap(z => z.niveaux)) {
    if (!def.suite) continue;
    const et = def.etats.slice().sort((a, b) => a - b);
    for (const t of def.suite) {
      const cle = t + '|' + et.join(',');
      const p = paires.get(cle) || { cle, type: t, etats: def.etats.slice(), ds: [] };
      p.ds.push(def.d || 0); paires.set(cle, p);
    }
  }
  const jobs = [...paires.values()].map(p => ({ cle: p.cle, type: p.type, etats: p.etats, d: p.ds.reduce((a, b) => a + b, 0) / p.ds.length }));
  console.log(jobs.length + ' paires à mesurer, ' + tw + ' travailleurs');
  const res = {}; let fait = 0; const t0 = Date.now();
  const parts = Array.from({ length: tw }, () => []);
  jobs.sort((a, b) => a.cle < b.cle ? -1 : 1).forEach((j, i) => parts[i % tw].push(j));
  let vivants = 0;
  for (const p of parts) {
    if (!p.length) continue;
    vivants++;
    const w = new Worker(__filename, { workerData: { jobs: p, graines } });
    w.on('message', (m) => { res[m.cle] = m; if (++fait % 50 === 0) console.log(fait + '/' + jobs.length + '  (' + Math.round((Date.now() - t0) / 1000) + ' s)'); });
    w.on('error', (err) => console.error('travailleur :', err.message));
    w.on('exit', () => { if (--vivants === 0) fin(); });
  }
  function fin() {
    const L = Object.values(res).filter(r => r.bas != null && r.haut != null);
    // difficulté visée pour d : régression linéaire de toutes les mesures (au milieu), rendue croissante
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (const r of L) { const y = (r.bas + r.haut) / 2; sx += r.d; sy += y; sxx += r.d * r.d; sxy += r.d * y; }
    const nb = L.length, b = Math.max(0.05, (nb * sxy - sx * sy) / Math.max(1e-9, nb * sxx - sx * sx)), a = (sy - b * sx) / nb;
    const vise = (d) => Math.max(0.02, Math.min(0.95, a + b * d));
    const EQ = {}; let plusDur = 0, plusFacile = 0;
    for (const r of L) {
      const m = (r.bas + r.haut) / 2, pente = Math.max(b * 0.5, (r.haut - r.bas) / 0.3);
      let dec = (vise(r.d) - m) / pente;                         // trop dure : dec < 0 ; trop facile : dec > 0
      dec = Math.max(-0.45, Math.min(0.45, dec * 0.8));
      if (Math.abs(dec) >= 0.03) { EQ[r.cle] = +dec.toFixed(3); if (dec < 0) plusDur++; else plusFacile++; }
    }
    const corps = '/* Généré par outils/equilibre.js : décalage de difficulté par (type de salle | transformations du niveau).\n' +
      '   Visée : échec ' + Math.round(vise(0) * 100) + ' % à d=0, ' + Math.round(vise(1) * 100) + ' % à d=1 (joueur imprécis). ' + L.length + ' paires mesurées. */\n' +
      '(function (r) {\nconst EQUILIBRE = ' + JSON.stringify(EQ).replace(/,"/g, ',\n"') + ';\n' +
      "if (typeof module !== 'undefined' && module.exports) module.exports = EQUILIBRE; else r.EQUILIBRE = EQUILIBRE;\n" +
      "})(typeof window !== 'undefined' ? window : globalThis);\n";
    fs.writeFileSync(path.join(__dirname, '..', 'js', 'equilibre.js'), corps);
    fs.writeFileSync(path.join(__dirname, 'equilibre-mesures.json'), JSON.stringify(res));
    console.log('Visée : ' + Math.round(vise(0) * 100) + '% (d=0) -> ' + Math.round(vise(1) * 100) + '% (d=1)');
    console.log(plusDur + ' paires adoucies (trop dures), ' + plusFacile + ' durcies (trop faciles). js/equilibre.js écrit en ' + Math.round((Date.now() - t0) / 60000) + ' min.');
  }
}
