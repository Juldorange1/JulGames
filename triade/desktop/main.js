// Triade — version programme (Electron) pour Windows / Steam.
// - charge le jeu (../index.html + ../js) sans navigateur ;
// - plein écran (F11 ou Alt+Entrée, ou Paramètres > Affichage) ;
// - sauvegarde dans un FICHIER : %APPDATA%/Triade/save/triade-save.json (à déclarer dans Steam Cloud,
//   voir STEAM.md) ; écriture groupée et atomique (fichier temporaire puis renommage).

const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

app.setName('Triade');
const TEST = process.argv.includes('--test');   // auto-test sans fenêtre, dans un dossier jetable
if (TEST) app.setPath('userData', path.join(app.getPath('temp'), 'triade-test-' + process.pid));
if (!TEST && !app.requestSingleInstanceLock()) app.quit();

const GAME_DIR = app.isPackaged ? path.join(process.resourcesPath, 'game') : path.join(__dirname, '..');
const USER_DIR = app.getPath('userData');
const SAVE_FILE = path.join(USER_DIR, 'save', 'triade-save.json');
const DISPLAY_FILE = path.join(USER_DIR, 'display.json');
const MUET = TEST || process.argv.includes('--muet');

function readText(f) { try { return fs.readFileSync(f, 'utf8'); } catch (e) { return null; } }
function writeAtomic(f, text) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f + '.tmp', text, 'utf8'); fs.renameSync(f + '.tmp', f); }

// ---------- sauvegarde (le jeu envoie toutes ses données ; on regroupe les écritures) ----------
let pending = null, timer = null;
function flush() { if (timer) { clearTimeout(timer); timer = null; } if (pending == null) return; try { writeAtomic(SAVE_FILE, pending); } catch (e) { console.error('sauvegarde impossible', e); } pending = null; }
function queue(text) { pending = text; if (!timer) timer = setTimeout(flush, 500); }

// ---------- affichage ----------
let display = { fullscreen: true, width: 1600, height: 900 };
try { Object.assign(display, JSON.parse(readText(DISPLAY_FILE) || '{}')); } catch (e) { }
function saveDisplay() { try { writeAtomic(DISPLAY_FILE, JSON.stringify(display)); } catch (e) { } }

let win = null;
function setFullscreen(on) { display.fullscreen = !!on; if (win) win.setFullScreen(display.fullscreen); saveDisplay(); }

function createWindow() {
  win = new BrowserWindow({
    width: display.width, height: display.height, minWidth: 960, minHeight: 540,
    fullscreen: TEST ? false : display.fullscreen, backgroundColor: '#0a0d15', title: 'Triade',
    icon: path.join(GAME_DIR, 'icon.png'), autoHideMenuBar: true, show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, backgroundThrottling: false },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(GAME_DIR, 'index.html'), MUET ? { query: { muet: '1' } } : undefined);
  win.once('ready-to-show', () => { if (!TEST) win.show(); });
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.key === 'Enter' && input.alt)) { setFullscreen(!win.isFullScreen()); e.preventDefault(); }
    if (input.key === 'F12' && !app.isPackaged) win.webContents.toggleDevTools();
  });
  win.on('leave-full-screen', () => { display.fullscreen = false; saveDisplay(); });
  win.on('enter-full-screen', () => { display.fullscreen = true; saveDisplay(); });
  win.on('resize', () => { if (!win.isFullScreen() && !win.isMaximized()) { const [w, h] = win.getContentSize(); display.width = w; display.height = h; saveDisplay(); } });
  win.on('closed', () => { win = null; });
  if (TEST) {
    const errors = [];
    win.webContents.on('console-message', (e) => { if (e.level === 'error' || e.level === 3) errors.push(String(e.message)); });
    win.webContents.once('did-finish-load', async () => {
      const js = c => win.webContents.executeJavaScript(c, true), out = {};
      try {
        await new Promise(r => setTimeout(r, 1200));
        out.native = await js('!!(window.triadeNative && window.triadeNative.isDesktop)');
        out.title = await js('document.body.dataset.screen');
        await js('newGame(["brann","lyse","kael"], 1); UI.showChoice(); true');
        await new Promise(r => setTimeout(r, 2600));
        const txt = readText(SAVE_FILE); out.saveFile = !!txt && JSON.parse(txt).binome_save_v1 != null;
        out.quitButton = await js('getComputedStyle(document.getElementById("btn-quit")).display !== "none"');
        out.errors = errors.slice(0, 5);
      } catch (err) { out.exception = String(err); }
      console.log('TRIADE_TEST ' + JSON.stringify(out));
      try { fs.rmSync(USER_DIR, { recursive: true, force: true }); } catch (e) { }
      app.exit(0);
    });
  }
}

// ---------- échanges avec le jeu (voir preload.js) ----------
ipcMain.on('save-read', e => { e.returnValue = pending != null ? pending : readText(SAVE_FILE); });
ipcMain.on('save-write', (e, text) => { if (typeof text === 'string' && text.length < 20e6) queue(text); });
ipcMain.on('save-flush', (e, text) => { if (typeof text === 'string') pending = text; flush(); e.returnValue = true; });
ipcMain.on('display-get', e => { e.returnValue = { fullscreen: win ? win.isFullScreen() : display.fullscreen }; });
ipcMain.on('display-fullscreen', (e, on) => setFullscreen(on));
ipcMain.on('quit', () => { flush(); app.quit(); });

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(createWindow);
app.on('before-quit', flush);
app.on('window-all-closed', () => { flush(); app.quit(); });
