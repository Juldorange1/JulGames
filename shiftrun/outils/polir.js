/* Shiftrun — polit le robot Parfait pour qu'il soit vraiment imbattable.
   Pour chaque niveau : on part du MEILLEUR parcours connu (Parfait, Professionnel ou Difficile : le Parfait n'est
   jamais plus lent qu'un autre robot), puis on l'affine très longtemps, en plusieurs passes avec des hasards différents
   (petites modifications de touches gardées seulement si l'arrivée est plus tôt). Écrit outils/parfaits/<id>.json
   seulement si c'est mieux, puis reconstruit js/parfaits.js (node outils/bot.js --fusion).
   node outils/polir.js [--travailleurs=11] [--passes=4] [--iter=60000] [id ...] */
'use strict';
const path = require('path'), fs = require('fs');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

if (!isMainThread) {
  const M = require('../js/moteur.js'), N = require('../js/niveaux.js'), bot = require('./bot.js');
  const tous = N.ZONES.flatMap(z => z.niveaux);
  const lireJ = (d, id) => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, d, id + '.json'), 'utf8')); } catch (e) { return null; } };
  for (const id of workerData.ids) {
    const def = tous.find(x => x.id === id), n = M.charger(def);
    const temps = (ent) => { const e = M.nouvelEtat(n); for (let i = 0; i < ent.length; i++) { M.pas(n, e, ent[i]); if (e.fini) return { t: e.temps, ent: ent.slice(0, i + 1) }; } return null; };
    let best = null, depart = '';
    for (const d of ['parfaits', 'humains', 'faciles']) {
      const j = lireJ(d, id);
      if (!j || !j.f) continue;
      const r = temps(M.decompresser(j.f));
      if (r && (!best || r.t < best.t)) { best = r; depart = d; }
    }
    if (!best) { parentPort.postMessage({ id, ok: false }); continue; }
    const t0 = best.t, A = bot.actions(n);
    bot.opt.affiner = workerData.iter; bot.opt.simplifier = 4000; bot.opt.verbeux = false;
    for (let p = 0; p < workerData.passes; p++) {
      bot.opt.graine = 1000 + p * 7919 + id.charCodeAt(0) * 31 + id.charCodeAt(2);
      const r = bot.affiner(n, best.ent, A, false);
      const v = temps(r.entrees);                          // on revérifie toujours sur le vrai moteur
      if (v && v.t <= best.t) best = v;
    }
    parentPort.postMessage({ id, ok: true, t0, t: best.t, depart, f: M.compresser(best.ent) });
  }
} else {
  const args = process.argv.slice(2);
  const val = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? +a.split('=')[1] : d; };
  const tw = val('travailleurs', 11), passes = val('passes', 4), iter = val('iter', 60000);
  const N = require('../js/niveaux.js');
  const ids = args.filter(a => !a.startsWith('--'));
  const liste = N.ZONES.flatMap(z => z.niveaux).map(d => d.id).filter(id => !ids.length || ids.includes(id));
  const parts = Array.from({ length: tw }, () => []);
  liste.forEach((id, i) => parts[i % tw].push(id));
  const dossier = path.join(__dirname, 'parfaits');
  let vivants = 0, gagne = 0; const t0 = Date.now();
  for (const p of parts) {
    if (!p.length) continue;
    vivants++;
    const w = new Worker(__filename, { workerData: { ids: p, passes, iter } });
    w.on('message', (m) => {
      if (!m.ok) { console.log(m.id.padEnd(5) + ' aucun parcours valable'); return; }
      const f = path.join(dossier, m.id + '.json');
      let d = {}; try { d = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { d = {}; }
      const avant = d.t;
      if (d.t === undefined || m.t < d.t) { d.t = m.t; d.f = m.f; fs.writeFileSync(f, JSON.stringify(d)); }
      if (avant !== undefined && m.t < avant) gagne++;
      console.log(m.id.padEnd(5) + ' ' + (avant !== undefined ? (avant / 60).toFixed(3) : '—') + ' s -> ' + (Math.min(m.t, avant ?? Infinity) / 60).toFixed(3) + ' s  (départ : ' + m.depart + ')');
    });
    w.on('error', (err) => console.error('travailleur :', err.message));
    w.on('exit', () => {
      if (--vivants) return;
      require('child_process').execFileSync(process.execPath, [path.join(__dirname, 'bot.js'), '--fusion'], { stdio: 'inherit' });
      console.log(gagne + ' niveau(x) amélioré(s) en ' + Math.round((Date.now() - t0) / 60000) + ' min');
    });
  }
}
