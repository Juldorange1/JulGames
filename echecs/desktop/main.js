// Custom Chess — version programme (Electron) : le jeu dans sa propre fenêtre, sans navigateur.
// Le jeu et le vrai Stockfish sont fournis par MoteurCustomChess.exe (http://localhost:57613/), lancé ici s'il ne tourne pas.
// F11 ou Alt+Entrée : plein écran. Les sauvegardes sont gardées par le programme (%APPDATA%\Custom Chess).
// « Custom Chess.exe --muet » : sans aucun son (tests).
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const net = require('net');
const { spawn } = require('child_process');

app.setName('Custom Chess');
app.setAppUserModelId('com.juldorange.customchess');
if (!app.requestSingleInstanceLock()) app.quit();

const PORT = 57613;
const URL_JEU = 'http://localhost:' + PORT + '/';
const URL_SECOURS = 'https://juldorange1.github.io/JulGames/echecs/';
const MUET = process.argv.includes('--muet');
const LOCAL = process.env.LOCALAPPDATA || path.join(app.getPath('home'), 'AppData', 'Local');
const MOTEURS = [path.join(LOCAL, 'CustomChess', 'MoteurCustomChess.exe'), path.join(process.resourcesPath || __dirname, 'moteur', 'MoteurCustomChess.exe')];
const ICONE = path.join(__dirname, 'icone.png');
const AFFICHAGE = path.join(app.getPath('userData'), 'affichage.json');

// 1er lancement : reprendre les sauvegardes (bots, pendules, parties, dossiers) que Chrome ou Edge gardent pour le site
// du jeu. On copie leur mémoire de site dans un coin à part, on n'y lit QUE les clés du jeu, puis on efface la copie.
const CLES = ['echecs.bots', 'echecs.options', 'echecs.parties', 'echecs.repertoire', 'echecs.encours'];
const SOURCES = [
  path.join(LOCAL, 'Google', 'Chrome', 'User Data', 'Default', 'Local Storage', 'leveldb'),
  path.join(LOCAL, 'Microsoft', 'Edge', 'User Data', 'Default', 'Local Storage', 'leveldb')
];
const MARQUE = () => path.join(app.getPath('userData'), 'sauvegardes-reprises');
async function lireSauvegardes() {
  const { session } = require('electron');
  const trouve = {};
  for (let i = 0; i < SOURCES.length; i++) {
    const src = SOURCES[i];
    if (!fs.existsSync(src)) continue;
    const nom = 'reprise' + i, dest = path.join(app.getPath('userData'), 'Partitions', nom, 'Local Storage', 'leveldb');
    try {
      fs.rmSync(path.dirname(path.dirname(dest)), { recursive: true, force: true });
      fs.mkdirSync(dest, { recursive: true });
      for (const f of fs.readdirSync(src)) if (f !== 'LOCK') { try { fs.writeFileSync(path.join(dest, f), fs.readFileSync(path.join(src, f))); } catch (e) { } }
      const ses = session.fromPartition('persist:' + nom);
      // aucune connexion : la page du site est remplacée par une page vide, juste pour lire sa mémoire
      ses.protocol.handle('https', () => new Response('<!doctype html><title>reprise</title>', { headers: { 'content-type': 'text/html' } }));
      const w = new BrowserWindow({ show: false, webPreferences: { session: ses, contextIsolation: true, nodeIntegration: false, javascript: true } });
      for (const origine of ['https://juldorange1.github.io/JulGames/echecs/']) {
        await w.loadURL(origine);
        const d = await w.webContents.executeJavaScript('(' + JSON.stringify(CLES) + ').reduce((o, k) => { const v = localStorage.getItem(k); if (v != null) o[k] = v; return o; }, {})');
        for (const k of Object.keys(d || {})) if (!(k in trouve)) trouve[k] = d[k];
      }
      w.destroy();
      await ses.clearStorageData();
    } catch (e) { }
    try { fs.rmSync(path.dirname(path.dirname(dest)), { recursive: true, force: true }); } catch (e) { }
  }
  return trouve;
}
async function reprendreSauvegardes(w) {
  if (fs.existsSync(MARQUE())) return;
  try {
    const brut = await lireSauvegardes();
    const d = {};
    for (const k of Object.keys(brut)) { try { d[k] = JSON.parse(brut[k]); } catch (e) { } }
    if (Object.keys(d).length && w && !w.isDestroyed()) {
      await w.webContents.executeJavaScript('window.Config && window.Config.importer ? (window.Config.importer(' + JSON.stringify(d) + '), true) : false');
      w.webContents.reload();
    }
    fs.mkdirSync(path.dirname(MARQUE()), { recursive: true });
    fs.writeFileSync(MARQUE(), JSON.stringify({ date: new Date().toISOString(), cles: Object.keys(d) }));
  } catch (e) { }
}

const portOuvert = () => new Promise((ok) => {
  const s = net.connect(PORT, '127.0.0.1');
  s.once('connect', () => { s.destroy(); ok(true); });
  s.once('error', () => ok(false));
  setTimeout(() => { s.destroy(); ok(false); }, 800);
});
async function moteurPret() {
  if (await portOuvert()) return true;
  const exe = MOTEURS.find((m) => fs.existsSync(m));
  if (!exe) return false;
  try { spawn(exe, ['/demarrage'], { detached: true, stdio: 'ignore', cwd: path.dirname(exe) }).unref(); } catch (e) { return false; }
  for (let i = 0; i < 60; i++) { await new Promise((r) => setTimeout(r, 500)); if (await portOuvert()) return true; }
  return false;
}

let affichage = { plein: false, max: true, l: 1400, h: 880 };
try { Object.assign(affichage, JSON.parse(fs.readFileSync(AFFICHAGE, 'utf8'))); } catch (e) { }
const sauver = () => { try { fs.writeFileSync(AFFICHAGE, JSON.stringify(affichage)); } catch (e) { } };

let win = null;
async function creer() {
  win = new BrowserWindow({
    width: affichage.l, height: affichage.h, minWidth: 900, minHeight: 600, fullscreen: affichage.plein,
    backgroundColor: '#14161a', title: 'Custom Chess', icon: ICONE, autoHideMenuBar: true, show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, backgroundThrottling: false }
  });
  Menu.setApplicationMenu(null);
  win.once('ready-to-show', () => { if (affichage.max && !affichage.plein) win.maximize(); win.show(); });
  win.on('page-title-updated', (e) => { e.preventDefault(); win.setTitle('Custom Chess'); });
  win.webContents.on('before-input-event', (e, i) => {
    if (i.type !== 'keyDown') return;
    if (i.key === 'F11' || (i.key === 'Enter' && i.alt)) { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    if (i.key === 'F5') { win.webContents.reload(); e.preventDefault(); }
  });
  // liens externes (téléchargements, GitHub…) : dans le navigateur habituel, jamais dans le jeu
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url) && !url.startsWith(URL_JEU)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(URL_JEU) && !url.startsWith(URL_SECOURS)) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });
  win.on('enter-full-screen', () => { affichage.plein = true; sauver(); });
  win.on('leave-full-screen', () => { affichage.plein = false; sauver(); });
  win.on('maximize', () => { affichage.max = true; sauver(); });
  win.on('unmaximize', () => { affichage.max = false; sauver(); });
  win.on('resize', () => { if (!win.isFullScreen() && !win.isMaximized()) { const [l, h] = win.getSize(); affichage.l = l; affichage.h = h; sauver(); } });
  win.on('closed', () => { win = null; });
  // écran d'attente pendant que le moteur démarre
  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent('<body style="margin:0;background:#14161a;color:#cfd6e4;font:22px Segoe UI,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;user-select:none">♞&nbsp; Custom Chess se prépare…</body>'));
  const ok = await moteurPret();
  if (!win) return;
  await win.loadURL((ok ? URL_JEU : URL_SECOURS) + (MUET ? '?muet' : ''));
  if (ok) reprendreSauvegardes(win);
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
// la copie temporaire de la mémoire du navigateur (verrouillée pendant la reprise) est effacée au lancement suivant
function nettoyer() { for (const i of [0, 1]) { try { fs.rmSync(path.join(app.getPath('userData'), 'Partitions', 'reprise' + i), { recursive: true, force: true }); } catch (e) { } } }
app.whenReady().then(() => { if (fs.existsSync(MARQUE())) nettoyer(); creer(); });
app.on('window-all-closed', () => app.quit());
