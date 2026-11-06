// Colosses — version programme (Electron) : le jeu se lance dans sa propre fenêtre, sans navigateur.
// F11 ou Alt+Entrée : plein écran. La sauvegarde est gardée par le programme (%APPDATA%\Colosses).
// « Colosses.exe --test » : lance une partie sans son dans un dossier jetable et affiche le résultat.
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

app.setName('Colosses');
const TEST = process.argv.includes('--test');
if (TEST) app.setPath('userData', path.join(app.getPath('temp'), 'colosses-test-' + process.pid));
if (!TEST && !process.argv.includes('--maj-seule') && !app.requestSingleInstanceLock()) app.quit();

const GAME_DIR = app.isPackaged ? path.join(process.resourcesPath, 'game') : path.join(__dirname, '..');
// mise à jour automatique depuis le site (voir maj.js) ; « --site=URL » pour tester avec un autre serveur
const argSite = process.argv.find(a => a.startsWith('--site='));
const SITE = argSite ? argSite.slice(7).replace(/\/?$/, '/') : 'https://juldorange1.github.io/JulGames/colosses/';
const MAJ_SEULE = process.argv.includes('--maj-seule');
const MAJ = require('./maj').creer(app.getPath('userData'), GAME_DIR);
const DISPLAY_FILE = path.join(app.getPath('userData'), 'affichage.json');
const MUET = TEST || process.argv.includes('--muet');

let display = { fullscreen: false, maximized: true, width: 1400, height: 860 };
try { Object.assign(display, JSON.parse(fs.readFileSync(DISPLAY_FILE, 'utf8'))); } catch (e) { }
function saveDisplay() { try { fs.mkdirSync(path.dirname(DISPLAY_FILE), { recursive: true }); fs.writeFileSync(DISPLAY_FILE, JSON.stringify(display)); } catch (e) { } }

let win = null;
function createWindow() {
  win = new BrowserWindow({
    width: display.width, height: display.height, minWidth: 960, minHeight: 600,
    fullscreen: TEST ? false : display.fullscreen, backgroundColor: '#030208', title: 'Colosses',
    icon: path.join(GAME_DIR, 'icon.png'), autoHideMenuBar: true, show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, backgroundThrottling: false, autoplayPolicy: 'no-user-gesture-required' },
  });
  Menu.setApplicationMenu(null);
  if (!TEST) MAJ.installerEnAttente();
  win.loadFile(path.join(MAJ.dossierActif(), 'index.html'), MUET ? { query: { muet: '1' } } : undefined);
  if (!TEST) win.webContents.once('did-finish-load', () => setTimeout(verifierMaj, 4000));
  // le bouton « Redémarrer » de l'avis de mise à jour change juste l'ancre de la page
  win.webContents.on('did-navigate-in-page', (e, url) => { if (/#maj-redemarrer$/.test(url)) { app.relaunch(); app.exit(0); } });
  win.once('ready-to-show', () => { if (TEST) return; if (display.maximized && !display.fullscreen) win.maximize(); win.show(); });
  if (TEST) {
    const errors = [];
    win.webContents.on('console-message', (e) => { if (e.level === 'error' || e.level === 3) errors.push(String(e.message)); });
    win.webContents.once('did-finish-load', async () => {
      const js = c => win.webContents.executeJavaScript(c, true), out = {};
      try {
        await new Promise(r => setTimeout(r, 1500));
        out.menu = await js('!!document.querySelector("[data-a=jouerDiff]")');
        out.police = await js('document.fonts.check("700 30px Cinzel")');
        out.shaders = await js('PostFX.ok');
        out.combat = await js(`(() => { UI.cacher(); G.nouvellePartie(); if (G.etat === 'avant' && typeof Avant !== 'undefined') Avant.entrer(); for (let i = 0; i < 600; i++) { G.p.iframe = 1; G.mx = G.boss.x; G.my = G.boss.y; Input.k = { Mouse0: true }; majCombat(1 / 60); if (i % 10 === 0) rendu(); Input.endFrame(); } return G.etat + ' ' + G.def.nom + ' ' + Math.round((1 - G.boss.hp / G.boss.hpMax) * 100) + ' %'; })()`);
        out.musique = await js('fetch("music/menu.ogg").then(r => r.ok)');
        out.errors = errors.slice(0, 5);
      } catch (err) { out.exception = String(err); out.errors = errors.slice(0, 5); }
      console.log('COLOSSES_TEST ' + JSON.stringify(out));
      try { fs.rmSync(app.getPath('userData'), { recursive: true, force: true }); } catch (e) { }
      app.exit(0);
    });
  }
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.key === 'Enter' && input.alt)) { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    if (input.key === 'F12' && !app.isPackaged) win.webContents.toggleDevTools();
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.on('enter-full-screen', () => { display.fullscreen = true; saveDisplay(); });
  win.on('leave-full-screen', () => { display.fullscreen = false; saveDisplay(); });
  win.on('maximize', () => { display.maximized = true; saveDisplay(); });
  win.on('unmaximize', () => { display.maximized = false; saveDisplay(); });
  win.on('resize', () => { if (!win.isFullScreen() && !win.isMaximized()) { const [w, h] = win.getSize(); display.width = w; display.height = h; saveDisplay(); } });
  win.on('closed', () => { win = null; });
}

async function verifierMaj() {
  const r = await MAJ.verifier(SITE);
  if (r.etat !== 'pret' || !win) return;
  const js = `(() => { if (document.getElementById('avis-maj')) return; const d = document.createElement('div'); d.id = 'avis-maj';
    d.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:9999;padding:12px 16px;background:linear-gradient(180deg,rgba(30,26,20,.96),rgba(12,11,9,.96));border:1px solid #c9a865;border-radius:6px;color:#eadcbc;font:14px Cinzel,Georgia,serif;box-shadow:0 6px 24px rgba(0,0,0,.6);user-select:none;display:flex;gap:12px;align-items:center';
    d.innerHTML = '<span>Nouvelle version téléchargée</span><a href="#maj-redemarrer" style="color:#1a1206;background:#d9b46a;padding:6px 12px;border-radius:4px;text-decoration:none;font-weight:700">Redémarrer</a><a href="javascript:void 0" onclick="this.parentNode.remove()" style="color:#9a8c6c;text-decoration:none">Plus tard</a>';
    document.body.appendChild(d); })()`;
  try { await win.webContents.executeJavaScript(js); } catch (e) { }
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
if (MAJ_SEULE) {
  // outil de test : vérifie et télécharge la mise à jour, affiche le résultat, puis quitte
  app.whenReady().then(async () => {
    const installe = MAJ.installerEnAttente();
    const r = await MAJ.verifier(SITE);
    console.log('COLOSSES_MAJ ' + JSON.stringify({ installe, actif: MAJ.dossierActif() === GAME_DIR ? 'livre' : 'copie', version: MAJ.versionActive(), r }));
    app.exit(0);
  });
} else app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
