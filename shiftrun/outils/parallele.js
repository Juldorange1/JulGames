/* Shiftrun — lance les vérifications du robot sur tous les cœurs à la fois, et rassemble les résultats.
   node outils/parallele.js test   [salle ...] [--graines=2] [--varier]   (outils/test-salles.js, en parallèle)
   node outils/parallele.js compat [salle ...]                            (outils/compat.js, puis fusion dans js/compat.js :
                                                                          les salles non mesurées gardent leur valeur)
   Sans salle : toutes. Les salles sont réparties des plus lentes aux plus rapides (temps de la dernière fois). */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Gen = require('../js/gen.js');

const args = process.argv.slice(2);
const quoi = args[0];
if (quoi !== 'test' && quoi !== 'compat') { console.log('usage : node outils/parallele.js test|compat [salle ...] [options]'); process.exit(1); }
const opts = args.slice(1).filter(a => a.startsWith('--'));
let salles = args.slice(1).filter(a => !a.startsWith('--'));
if (!salles.length) salles = Object.keys(Gen.SALLES).concat(quoi === 'test' ? ['cheminee*'] : []);
const nbT = Math.max(1, os.cpus().length - 1);
const TEMPS = path.join(__dirname, '.temps-salles.json');          // durée de chaque salle la dernière fois
let temps = {}; try { temps = JSON.parse(fs.readFileSync(TEMPS, 'utf8')); } catch (e) { /* première fois */ }
const file = salles.slice().sort((a, b) => (temps[b] || 60) - (temps[a] || 60));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shiftrun-'));
const t0 = Date.now();
let actifs = 0, echecs = 0, faits = 0;
const res = {};
function suivant() {
  if (!file.length) { if (!actifs) fin(); return; }
  const nom = file.shift(), debut = Date.now();
  actifs++;
  const script = path.join(__dirname, quoi === 'test' ? 'test-salles.js' : 'compat.js');
  const sortie = path.join(tmp, nom.replace('*', '_') + '.json');
  const a = [script, nom].concat(quoi === 'compat' ? ['--sortie=' + sortie] : opts);
  const p = spawn(process.execPath, a, { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  p.stdout.on('data', d => { out += d; }); p.stderr.on('data', d => { out += d; });
  p.on('close', () => {
    actifs--; faits++;
    temps[nom] = (Date.now() - debut) / 1000;
    const ech = (out.match(/ÉCHEC/g) || []).length;
    echecs += ech;
    if (quoi === 'compat') { try { Object.assign(res, JSON.parse(fs.readFileSync(sortie, 'utf8'))); } catch (e) { echecs++; console.log('!! ' + nom + ' : pas de résultat\n' + out); } }
    const ligne = out.split('\n').filter(l => l.startsWith(nom.padEnd(11).slice(0, nom.length)) || l.startsWith('ÉCHEC')).join('\n');
    console.log(`[${faits}/${salles.length}] ${ligne || nom} (${temps[nom].toFixed(0)} s)` + (ech ? '\n' + out.split('\n').filter(l => /^ *\d+ /.test(l) || l.startsWith('ÉCHEC')).join('\n') : ''));
    suivant();
  });
}
function fin() {
  fs.writeFileSync(TEMPS, JSON.stringify(temps));
  if (quoi === 'compat') {
    const avant = require('../js/compat.js');
    const tout = Object.assign({}, avant, res);
    for (const k of Object.keys(tout)) if (!Gen.SALLES[k]) delete tout[k];      // salles supprimées
    const f = path.join(tmp, 'tout.json');
    fs.writeFileSync(f, JSON.stringify(tout));
    require('child_process').execFileSync(process.execPath, [path.join(__dirname, 'compat.js'), '--fusion', f], { stdio: 'inherit' });
  }
  console.log(`Fini en ${((Date.now() - t0) / 60000).toFixed(1)} min sur ${nbT} cœurs, ${echecs} échec(s).`);
  process.exit(echecs ? 1 : 0);
}
for (let i = 0; i < nbT; i++) suivant();
