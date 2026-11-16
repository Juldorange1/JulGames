// Shiftrun — version programme (Electron) : le jeu dans sa propre fenêtre, hors ligne, avec Steam si présent.
// F11 ou Alt+Entrée : plein écran. --muet : sans son. --test : auto-test sans fenêtre. --vitrine : fabrique les images
// et la bande-annonce pour la page Steam (dans desktop/vitrine/).
const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

app.setName('Shiftrun');
const TEST = process.argv.includes('--test');
const VITRINE = process.argv.includes('--vitrine');
if (TEST || VITRINE) app.setPath('userData', path.join(app.getPath('temp'), 'shiftrun-outil-' + process.pid));
if (!TEST && !VITRINE && !app.requestSingleInstanceLock()) app.quit();

const GAME_DIR = app.isPackaged ? path.join(process.resourcesPath, 'game') : path.join(__dirname, '..');
const DISPLAY_FILE = path.join(app.getPath('userData'), 'affichage.json');
const MUET = TEST || VITRINE || process.argv.includes('--muet');

/* ---------- Steam (facultatif) : succès et sauvegarde dans le cloud via steamworks.js ---------- */
let steam = null;
function appId() {
  try { return parseInt(fs.readFileSync(path.join(path.dirname(process.execPath), 'steam_appid.txt'), 'utf8'), 10) || null; } catch (e) { }
  try { return parseInt(fs.readFileSync(path.join(__dirname, 'steam_appid.txt'), 'utf8'), 10) || null; } catch (e) { }
  return parseInt(process.env.SHIFTRUN_APPID, 10) || null;
}
if (!TEST && !VITRINE) {
  try {
    const sw = require('steamworks.js');
    const id = appId();
    if (id) { steam = sw.init(id); sw.electronEnableSteamOverlay(); }
  } catch (e) { steam = null; }      // pas de Steam : le jeu marche normalement, sans succès Steam ni cloud
}
ipcMain.handle('steam:pret', () => !!steam);
ipcMain.handle('steam:succes', (e, id) => { try { return steam ? steam.achievement.activate(String(id)) : false; } catch (err) { return false; } });
ipcMain.handle('steam:cloudEcrire', (e, txt) => { try { return steam && steam.cloud.isEnabledForApp() ? steam.cloud.writeFile('sauvegarde.json', String(txt)) : false; } catch (err) { return false; } });
ipcMain.handle('steam:cloudLire', () => { try { return steam && steam.cloud.isEnabledForApp() && steam.cloud.fileExists('sauvegarde.json') ? steam.cloud.readFile('sauvegarde.json') : null; } catch (err) { return null; } });
// classements mondiaux par niveau (temps + fantôme) : branchés seulement si steam-lb.js existe (voir STEAM.md)
let LB = null;
try { LB = require('./steam-lb.js'); } catch (e) { LB = null; }
const lbCall = async (f, ...a) => { try { return LB && LB.ready() ? await LB[f](...a) : null; } catch (e) { return null; } };
ipcMain.handle('lb:pret', () => { try { return !!(LB && LB.ready()); } catch (e) { return false; } });
ipcMain.handle('lb:envoyer', (e, board, temps, fantome) => lbCall('submit', String(board), Number(temps) | 0, String(fantome || '')));
ipcMain.handle('lb:top', (e, board, n) => lbCall('top', String(board), Math.min(50, Math.max(1, n | 0 || 10))));
// mode vitrine : la page envoie ses images et sa vidéo, on les écrit sur le disque
ipcMain.handle('vitrine:ecrire', (e, nom, octets) => {
  const dir = path.join(__dirname, 'vitrine'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, path.basename(String(nom))), Buffer.from(octets)); return true;
});
ipcMain.handle('vitrine:fini', () => { setTimeout(() => app.exit(0), 200); return true; });

let display = { fullscreen: false, maximized: true, width: 1400, height: 860 };
try { Object.assign(display, JSON.parse(fs.readFileSync(DISPLAY_FILE, 'utf8'))); } catch (e) { }
function saveDisplay() { try { fs.mkdirSync(path.dirname(DISPLAY_FILE), { recursive: true }); fs.writeFileSync(DISPLAY_FILE, JSON.stringify(display)); } catch (e) { } }

let win = null;
function createWindow() {
  win = new BrowserWindow({
    width: VITRINE ? 1920 : display.width, height: VITRINE ? 1080 : display.height, useContentSize: VITRINE, minWidth: 900, minHeight: 600,
    fullscreen: TEST || VITRINE ? false : display.fullscreen, backgroundColor: '#0b0812', title: 'Shiftrun',
    icon: path.join(GAME_DIR, 'icon.png'), autoHideMenuBar: true, show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, backgroundThrottling: false, autoplayPolicy: 'no-user-gesture-required',
      preload: path.join(__dirname, 'preload.js'), offscreen: VITRINE },
  });
  if (VITRINE) win.webContents.setFrameRate(60);
  Menu.setApplicationMenu(null);
  const query = {}; if (MUET) query.muet = '1'; if (VITRINE) query.vitrine = '1';
  win.loadFile(path.join(GAME_DIR, 'index.html'), { query });
  win.once('ready-to-show', () => { if (TEST || VITRINE) return; if (display.maximized && !display.fullscreen) win.maximize(); win.show(); });
  if (TEST) {
    const errors = [];
    win.webContents.on('console-message', (e) => { if (e.level === 'error' || e.level === 3) errors.push(String(e.message)); });
    win.webContents.once('did-finish-load', async () => {
      const js = c => win.webContents.executeJavaScript(c, true), out = {};
      try {
        await new Promise(r => setTimeout(r, 1500));
        out.menu = await js('document.querySelectorAll(".btn.carte").length');
        out.police = await js('document.fonts.check("700 20px \\"Chakra Petch\\"")');
        out.niveau = await js('Jeu.lancerNiveau(0); for (let i = 0; i < 120; i++) Jeu.pas(); Jeu.J.mode');
        out.steam = await js('window.shiftrunSteam ? window.shiftrunSteam.pret() : "absent"');
        out.erreurs = errors.slice(0, 5);
      } catch (err) { out.exception = String(err); out.erreurs = errors.slice(0, 5); }
      console.log('SHIFTRUN_TEST ' + JSON.stringify(out));
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
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
