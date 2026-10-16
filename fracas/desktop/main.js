// Fracas - version programme (Electron) pour Windows / Steam.
// - charge le jeu (index.html + js/) sans navigateur ;
// - plein ecran (F11 ou Alt+Entree, et dans Parametres > Affichage) et taille de fenetre ;
// - sauvegarde dans un FICHIER : %APPDATA%/Fracas/save/fracas-save.json (dossier a declarer dans
//   Steam Cloud, voir STEAM.md) ; ecriture differee et atomique (fichier temporaire puis renommage).

const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

app.setName('Fracas');
// --test : verification automatique sans fenetre visible, dans un dossier de sauvegarde jetable
const TEST = process.argv.includes('--test');
if (TEST) app.setPath('userData', path.join(app.getPath('temp'), 'fracas-test-' + process.pid));
if (!TEST && !app.requestSingleInstanceLock()) app.quit(); // une seule fenetre du jeu a la fois

const GAME_DIR = app.isPackaged ? path.join(process.resourcesPath, 'game') : path.join(__dirname, '..');
const USER_DIR = app.getPath('userData');             // %APPDATA%/Fracas
const SAVE_DIR = path.join(USER_DIR, 'save');
const SAVE_FILE = path.join(SAVE_DIR, 'fracas-save.json');
const DISPLAY_FILE = path.join(USER_DIR, 'display.json');
const MUET = TEST || process.argv.includes('--muet'); // tests : aucun son

function readText(file) { try { return fs.readFileSync(file, 'utf8'); } catch (e) { return null; } }
function writeAtomic(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, text, 'utf8');
  fs.renameSync(tmp, file);
}

// ---------- sauvegarde : le jeu peut sauvegarder tres souvent, on regroupe les ecritures ----------
let pendingSave = null, saveTimer = null;
function flushSave() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (pendingSave == null) return;
  try { writeAtomic(SAVE_FILE, pendingSave); } catch (e) { console.error('sauvegarde impossible', e); }
  pendingSave = null;
}
function queueSave(text) {
  pendingSave = text;
  if (!saveTimer) saveTimer = setTimeout(flushSave, 400);
}

// ---------- affichage ----------
let display = { fullscreen: true, width: 1280, height: 720 };
try { Object.assign(display, JSON.parse(readText(DISPLAY_FILE) || '{}')); } catch (e) { /* reglages illisibles */ }
function saveDisplay() { try { writeAtomic(DISPLAY_FILE, JSON.stringify(display)); } catch (e) { /* ignore */ } }

let win = null;
function setFullscreen(on) {
  display.fullscreen = !!on;
  if (win) win.setFullScreen(display.fullscreen);
  saveDisplay();
}

function createWindow() {
  win = new BrowserWindow({
    width: display.width, height: display.height, minWidth: 960, minHeight: 540,
    fullscreen: TEST ? false : display.fullscreen, backgroundColor: '#06060a', title: 'Fracas',
    icon: path.join(GAME_DIR, 'icon.png'), autoHideMenuBar: true, show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false,
      backgroundThrottling: false, // le jeu continue de tourner normalement
    },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(GAME_DIR, 'index.html'), MUET ? { query: { muet: '1' } } : undefined);
  win.once('ready-to-show', () => { if (!TEST) win.show(); });
  if (TEST) win.webContents.once('did-finish-load', () => runSelfTest());
  if (TEST) win.webContents.on('console-message', (e) => { if (e.level === 'error') testErrors.push(String(e.message)); });
  // F11 / Alt+Entree : plein ecran ; F12 : outils de developpement (seulement hors version finale)
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.key === 'Enter' && input.alt)) { setFullscreen(!win.isFullScreen()); e.preventDefault(); }
    if (input.key === 'F12' && !app.isPackaged) win.webContents.toggleDevTools();
  });
  win.on('leave-full-screen', () => { display.fullscreen = false; saveDisplay(); });
  win.on('enter-full-screen', () => { display.fullscreen = true; saveDisplay(); });
  win.on('closed', () => { win = null; });
}

// ---------- auto-test (--test) ----------
const testErrors = [];
async function runSelfTest() {
  const js = (code) => win.webContents.executeJavaScript(code, true);
  const out = {};
  try {
    out.native = await js('!!window.fracasNative && window.fracasNative.isDesktop');
    out.state = await js('typeof Game !== "undefined" ? Game.state : null');
    await new Promise((r) => setTimeout(r, 800));
    out.errors = testErrors.slice(0, 5);
    await js('Save.data.playerName = "TestExe"; Save.persist(); true');
    await new Promise((r) => setTimeout(r, 700));
    const txt = readText(SAVE_FILE);
    out.saveFile = !!txt && JSON.parse(txt).playerName === 'TestExe';
    out.display = await js('JSON.stringify(window.fracasNative.getDisplay())');
    await js('Game.setState(STATE.SETTINGS); true');
    out.displaySection = await js('document.getElementById("overlay").textContent.includes(S("displayFullscreen"))');
    out.icons = await js('new Promise((r) => setTimeout(() => r(document.querySelectorAll("#overlay svg.ico").length), 100))');
    const exported = await js('Playtest.log("test", {}); Playtest.export()');
    out.playtestExport = !!exported && fs.existsSync(exported);
    if (exported) { try { fs.unlinkSync(exported); fs.rmdirSync(path.dirname(exported)); } catch (e) { /* dossier non vide : on le garde */ } }
    // (plus d'ecran de choix de version : le jeu demarre sur le menu principal)
    await js('Game.setState(STATE.INFINITE_MENU); true');
    out.quitButton = await js('document.getElementById("overlay").textContent.includes(S("quitGame"))');
  } catch (e) { out.exception = String(e); }
  console.log('FRACAS_TEST ' + JSON.stringify(out));
  try { fs.rmSync(USER_DIR, { recursive: true, force: true }); } catch (e) { /* ignore */ }
  app.exit(0);
}

// ---------- echanges avec le jeu (voir preload.js) ----------
ipcMain.on('save-read', (e) => { e.returnValue = pendingSave != null ? pendingSave : readText(SAVE_FILE); });
ipcMain.on('save-write', (e, text) => { if (typeof text === 'string' && text.length < 20e6) queueSave(text); });
ipcMain.on('display-get', (e) => { e.returnValue = { fullscreen: win ? win.isFullScreen() : display.fullscreen, width: display.width, height: display.height }; });
ipcMain.on('display-fullscreen', (e, on) => setFullscreen(on));
ipcMain.on('display-size', (e, w, h) => {
  w = Math.max(960, Math.min(7680, w | 0)); h = Math.max(540, Math.min(4320, h | 0));
  display.width = w; display.height = h; display.fullscreen = false;
  if (win) { win.setFullScreen(false); win.setContentSize(w, h); win.center(); }
  saveDisplay();
});
ipcMain.on('quit', () => app.quit());
ipcMain.on('is-playtest', (e) => { e.returnValue = TEST || process.argv.includes('--playtest'); });
// Journal de test exporte dans Documents/Fracas (le dossier s'ouvre pour l'envoyer facilement)
ipcMain.on('export-file', (e, name, text) => {
  try {
    const safe = String(name).replace(/[^a-zA-Z0-9._-]/g, '_');
    const file = path.join(app.getPath('documents'), 'Fracas', safe);
    writeAtomic(file, text);
    if (!TEST) shell.showItemInFolder(file);
    e.returnValue = file;
  } catch (err) { e.returnValue = null; }
});

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(createWindow);
app.on('before-quit', flushSave);
app.on('window-all-closed', () => { flushSave(); app.quit(); });
