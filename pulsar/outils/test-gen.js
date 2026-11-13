const charger = require('./charger');
const fichiers = process.argv.includes('--boss') ? ['base.js','moteur.js','generateur.js','boss.js'] : ['base.js','moteur.js','generateur.js'];
const C = charger(fichiers);
const Ds = [1, 1.5, 2, 3, 4, 6, 8, 10, 14, 18, 25, 35, 50];
let erreurs = 0;
for (const D of Ds) {
  let t = 0, n = 0, rejoue = 0, stats = { blocs: 0, piques: 0, scies: 0, orbes: 0, tampons: 0, eclats: 0, att: 0 }, modes = {}, dur = 0;
  for (let g = 1; g <= 12; g++) {
    const t0 = Date.now();
    let L;
    try { L = C.genNiveau({ graine: g * 7919 + Math.round(D * 100), D }); }
    catch (e) { erreurs++; console.log('ERREUR D=' + D + ' graine ' + g + ': ' + e.message); continue; }
    t += Date.now() - t0; n++;
    dur += L.duree;
    stats.blocs += L.blocs.length; stats.piques += L.piques.length; stats.scies += L.scies.length; stats.orbes += L.orbes.length; stats.tampons += L.tampons.length; stats.eclats += L.eclats.length; stats.att += L.attaques.length;
    L.sections.forEach(s => modes[s.mode] = (modes[s.mode] || 0) + 1);
    // rejouer le fantôme avec la vraie physique (sans marge), attaques comprises
    const p = C.nouvelEtat(L);
    for (let i = 0; i < L.ghost.length && !p.mort && !p.fini; i++) C.pas(p, !!L.ghost[i], L, true);
    if (p.mort) { erreurs++; console.log('  REJEU MORT D=' + D + ' graine ' + g + ' cause ' + p.cause + ' x=' + p.x.toFixed(2) + ' mode ' + p.mode); }
    else if (p.fini) rejoue++;
    else { console.log('  rejeu pas fini D=' + D + ' x=' + p.x.toFixed(1) + ' fin=' + L.fin.toFixed(1)); }
  }
  const moy = k => (stats[k] / n).toFixed(0);
  console.log(`D=${D}: ${n} niveaux, ${(t / n).toFixed(0)} ms, ${(dur / n).toFixed(0)} s, rejoués ${rejoue}/${n} | blocs ${moy('blocs')} piques ${moy('piques')} scies ${moy('scies')} orbes ${moy('orbes')} tampons ${moy('tampons')} éclats ${moy('eclats')} attaques ${moy('att')} | ${JSON.stringify(modes)}`);
}
console.log(erreurs ? erreurs + ' ERREURS' : 'OK');
