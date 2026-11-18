/* Phase — lance le robot sur tous les niveaux, sur tous les cœurs du processeur.
   - file d'attente : dès qu'un robot finit, le suivant démarre (pas de groupe fixe qui attend le plus lent) ;
   - les niveaux les plus longs partent en premier (ils ne finissent pas seuls à la fin) ;
   - seuls les niveaux qui ont changé (carte, états ou moteur) sont recalculés, sauf avec --tout.
   node outils/robots.js [--tout] [--travailleurs=11] [id ...]
   À la fin : js/parfaits.js est reconstruit et vérifié. */
'use strict';
const { spawn, execFileSync } = require('child_process');
const os = require('os');
const path = require('path');
const NIV = require('../js/niveaux.js');
const args = process.argv.slice(2);
const tout = args.includes('--tout'), humain = args.includes('--humain');
const tw = args.find(a => a.startsWith('--travailleurs='));
const N = tw ? +tw.split('=')[1] : Math.max(1, os.cpus().length - 1);
const ids = args.filter(a => !a.startsWith('--'));
const niveaux = [];
for (const z of NIV.ZONES) for (const nv of z.niveaux) if (!ids.length || ids.includes(nv.id)) niveaux.push(nv);
niveaux.sort((a, b) => b.carte[0].length - a.carte[0].length);
const file = niveaux.map(nv => nv.id);
const bot = path.join(__dirname, 'bot.js');
const t0 = Date.now();
let actifs = 0, echecs = 0;
const lignes = [];
function suivant() {
  while (actifs < N && file.length) {
    const id = file.shift();
    actifs++;
    const p = spawn(process.execPath, [bot, id, '--ecrire', '--remplacer'].concat(humain ? ['--humain'] : ['--eclat'], tout ? [] : ['--changes']), { stdio: ['ignore', 'pipe', 'pipe'] });
    let sortie = '';
    p.stdout.on('data', d => { sortie += d; });
    p.stderr.on('data', d => { sortie += d; });
    p.on('close', () => {
      actifs--;
      const l = sortie.split('\n').find(x => x.startsWith(id + ' ')) || (id + ' ??? ' + sortie.slice(-300));
      if (/ÉCHEC|\?\?\?/.test(l)) echecs++;
      lignes.push(l);
      console.log(l + '   [' + ((Date.now() - t0) / 1000).toFixed(0) + ' s, reste ' + (file.length + actifs) + ']');
      if (file.length) suivant();
      else if (!actifs) terminer();
    });
  }
}
function terminer() {
  execFileSync(process.execPath, [bot, '--fusion'].concat(humain ? ['--humain'] : []), { stdio: 'inherit' });
  if (!humain) try { execFileSync(process.execPath, [path.join(__dirname, 'verifier-parfaits.js')], { stdio: 'inherit' }); } catch (e) { /* il signale lui-même */ }
  console.log('Fini en ' + ((Date.now() - t0) / 60000).toFixed(1) + ' min, ' + echecs + ' niveau(x) avec un échec.');
  process.exitCode = echecs ? 1 : 0;
}
console.log(niveaux.length + ' niveaux, ' + N + ' robots en parallèle' + (tout ? '' : ' (les niveaux inchangés sont sautés)'));
suivant();
