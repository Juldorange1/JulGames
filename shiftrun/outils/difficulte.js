/* Phase — robot qui MESURE la difficulté humaine de chaque type de salle.
   1. Il trouve un passage « comme un humain » : décisions toutes les 6 images seulement (pas de précision à l'image près).
   2. Il rejoue ce passage des dizaines de fois en décalant chaque changement de touche de quelques images au hasard
      (comme les petites imprécisions d'un joueur). Taux d'échec = difficulté (0 = facile, 1 = presque impossible).
   3. Avec --calibrer, il écrit js/calibrage.js : pour chaque type, la difficulté demandée est convertie en réglage
      interne pour que toutes les salles d'une même difficulté soient aussi dures entre elles.
   node outils/difficulte.js [types...] [--graines=4] [--calibrer] [--sortie=fichier.json]
   (les résultats bruts sont écrits dans outils/difficulte/<type>.json, la calibration les relit tous) */
'use strict';
const fs = require('fs'), path = require('path');
const M = require('../js/moteur.js');
const Gen = require('../js/gen.js');
const bot = require('./bot.js');
const args = process.argv.slice(2);
let graines = 4, calibrer = false, avecCal = false;
const types = [];
for (const a of args) {
  if (a.startsWith('--graines=')) graines = +a.split('=')[1];
  else if (a === '--calibrer') calibrer = true;
  else if (a === '--avec-calibrage') avecCal = true;
  else types.push(a);
}
const D = [0, 0.3, 0.6, 0.9, 1.2];
const dossier = path.join(__dirname, process.argv.includes('--avec-calibrage') ? 'difficulte-calibree' : 'difficulte');
if (!fs.existsSync(dossier)) fs.mkdirSync(dossier);

let graineA = 777;
const alea = () => { graineA = (graineA * 1103515245 + 12345) & 0x7fffffff; return graineA / 0x7fffffff; };

// rejoue avec des imprécisions : chaque changement d'entrée est décalé de -j..+j images
function robustesse(n, ent, j, essais, limite) {
  // découpe en morceaux d'entrée constante
  const blocs = [];
  for (let i = 0; i < ent.length;) { let k = i; while (k < ent.length && ent[k] === ent[i]) k++; blocs.push([ent[i], k - i]); i = k; }
  let ok = 0;
  for (let t = 0; t < essais; t++) {
    const suite = [];
    for (let b = 0; b < blocs.length; b++) {
      const [v, len] = blocs[b];
      const dl = b < blocs.length - 1 ? Math.round((alea() * 2 - 1) * j) : 0;
      const L = Math.max(1, len + dl);
      for (let k = 0; k < L; k++) suite.push(v);
    }
    const e = M.nouvelEtat(n);
    let fini = false;
    for (let i = 0; i < suite.length + 120 && e.temps < limite; i++) {
      M.pas(n, e, suite[i] !== undefined ? suite[i] : suite[suite.length - 1] & ~(M.E.S | M.E.L | M.E.Z | M.E.P));
      if (e.mortT > 0) break;
      if (e.fini) { fini = true; break; }
    }
    if (fini) ok++;
  }
  return ok / essais;
}

function mesurer(nom) {
  const glace = nom.endsWith('*'), type = glace ? nom.slice(0, -1) : nom;
  const phases = glace ? [0, 1, 2, 3] : Gen.SALLES[type].phases;
  const res = [];
  for (const d of D) {
    let somme = 0, k = 0, tps = 0;
    for (let gr = 1; gr <= graines; gr++) {
      const carte = Gen.essai(type, gr * 7919 + Math.round(d * 100), d, glace, !avecCal);
      const def = { id: nom, nom, phases, carte };
      bot.opt.pasK = 6; bot.opt.faisceau = 250; bot.opt.affiner = 0; bot.opt.verbeux = false; bot.opt.collecter = 24;
      const r = bot.chercher(def, false);
      if (!r.ok) { somme += 1; k++; continue; }
      const n = M.charger(def);
      // le joueur prudent prend le chemin le plus tolérant parmi ceux trouvés
      let meilleur = 0;
      for (const ent of r.chemins) {
        const p2 = robustesse(n, ent, 2, 16, r.temps + 300);
        if (p2 + 0.5 <= meilleur) continue;
        const p4 = robustesse(n, ent, 4, 16, r.temps + 300);
        meilleur = Math.max(meilleur, (p2 + p4) / 2);
        if (meilleur >= 0.99) break;
      }
      somme += 1 - meilleur; k++; tps += r.temps;
    }
    res.push({ d, diff: +(somme / k).toFixed(3), temps: +(tps / 60 / graines).toFixed(2) });
  }
  return res;
}

if (!calibrer || types.length) {
  const liste = types.length ? types : Gen.TOUS.concat(['cheminee*']);
  for (const nom of liste) {
    const r = mesurer(nom);
    fs.writeFileSync(path.join(dossier, nom.replace('*', '_glace') + '.json'), JSON.stringify(r));
    console.log(nom.padEnd(11) + ' ' + r.map(o => 'd' + o.d + ':' + Math.round(o.diff * 100) + '%').join('  '));
  }
}

if (calibrer) {
  const mesures = {};
  for (const f of fs.readdirSync(dossier)) if (f.endsWith('.json')) mesures[f.slice(0, -5).replace('_glace', '*')] = JSON.parse(fs.readFileSync(path.join(dossier, f), 'utf8'));
  const noms = Object.keys(mesures);
  // courbe cible : la difficulté moyenne de tous les types, rendue croissante
  const cible = D.map((d, i) => noms.reduce((a, n) => a + mesures[n][i].diff, 0) / noms.length);
  for (let i = 1; i < cible.length; i++) cible[i] = Math.max(cible[i], cible[i - 1] + 0.02);
  const CAL = {};
  for (const nom of noms) {
    // courbe mesurée de ce type, rendue croissante, puis inversée
    const c = mesures[nom].map(o => o.diff);
    for (let i = 1; i < c.length; i++) c[i] = Math.max(c[i], c[i - 1] + 0.001);
    const inv = D.map((d, i) => {
      const t = cible[i];
      if (t <= c[0]) return -0.6;                 // trop dure même au plus facile
      if (t >= c[c.length - 1]) return 1.8;       // trop facile même au plus dur
      for (let k = 1; k < c.length; k++) if (t <= c[k]) return D[k - 1] + (D[k] - D[k - 1]) * (t - c[k - 1]) / (c[k] - c[k - 1]);
      return 1.8;
    });
    // décalage moyen (sur les difficultés du milieu), adouci et borné : on garde la progression d'un niveau à l'autre
    const delta = Math.max(-0.45, Math.min(0.45, 0.7 * ((inv[1] - D[1]) + (inv[2] - D[2]) + (inv[3] - D[3])) / 3));
    CAL[nom] = D.map(d => [d, +Math.max(0, Math.min(1.2, d + delta)).toFixed(3)]);
  }
  const corps = '/* Généré par outils/difficulte.js --calibrer : difficulté demandée -> réglage interne, par type de salle.\n' +
    '   Difficulté cible mesurée (taux d\'échec d\'un joueur imprécis) : ' + cible.map(v => Math.round(v * 100) + '%').join(' ') + ' */\n' +
    '(function (r) {\nconst CALIBRAGE = ' + JSON.stringify(CAL).replace(/\],"/g, '],\n"') + ';\n' +
    "if (typeof module !== 'undefined' && module.exports) module.exports = CALIBRAGE; else r.CALIBRAGE = CALIBRAGE;\n" +
    "})(typeof window !== 'undefined' ? window : globalThis);\n";
  fs.writeFileSync(path.join(__dirname, '..', 'js', 'calibrage.js'), corps);
  console.log('Cible : ' + cible.map(v => Math.round(v * 100) + '%').join(' '));
  for (const nom of noms) console.log(nom.padEnd(11) + ' ' + mesures[nom].map(o => Math.round(o.diff * 100) + '%').join(' ') + '  ->  ' + CAL[nom].map(p => p[1]).join(' '));
  console.log('js/calibrage.js écrit');
}
