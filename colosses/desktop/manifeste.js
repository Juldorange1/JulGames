// Colosses — écrit colosses/version.json : la liste des fichiers du jeu avec leur empreinte (SHA-1).
// Le programme compare ce fichier avec celui du site pour ne télécharger que ce qui a changé.
// À lancer après chaque modification du jeu (fait automatiquement avant « npm run build »).
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const JEU = path.join(__dirname, '..');
const DOSSIERS = ['css', 'js', 'img', 'fonts', 'music', 'sfx'], RACINE = ['index.html', 'icon.png'];
const fichiers = {};
const ajouter = rel => { const buf = fs.readFileSync(path.join(JEU, rel)); fichiers[rel.split(path.sep).join('/')] = crypto.createHash('sha1').update(buf).digest('hex'); };
const parcourir = rel => { for (const n of fs.readdirSync(path.join(JEU, rel)).sort()) { const r = path.join(rel, n); if (fs.statSync(path.join(JEU, r)).isDirectory()) parcourir(r); else ajouter(r); } };
for (const f of RACINE) ajouter(f);
for (const d of DOSSIERS) if (fs.existsSync(path.join(JEU, d))) parcourir(d);
// la « date » sert de numéro de version : elle ne change que si le contenu change
const empreinte = crypto.createHash('sha1').update(JSON.stringify(fichiers)).digest('hex');
const ancien = (() => { try { return JSON.parse(fs.readFileSync(path.join(JEU, 'version.json'), 'utf8')); } catch (e) { return null; } })();
const date = ancien && ancien.empreinte === empreinte ? ancien.date : new Date().toISOString();
fs.writeFileSync(path.join(JEU, 'version.json'), JSON.stringify({ date, empreinte, fichiers }, null, 0) + '\n');
console.log('version.json :', Object.keys(fichiers).length, 'fichiers,', date, ancien && ancien.empreinte === empreinte ? '(inchangé)' : '(nouvelle version)');
