// Colosses — version programme (Electron) : le jeu se lance dans sa propre fenêtre, sans navigateur.
// F11 ou Alt+Entrée : plein écran. La sauvegarde est gardée par le programme (%APPDATA%\Colosses).
// « Colosses.exe --test » : lance une partie sans son dans un dossier jetable et affiche le résultat.
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

app.setName('Colosses');
const TEST = process.argv.includes('--test');
if (TEST) app.setPath('userData', path.join(app.getPath('temp'), 'colosses-test-' + process.pid));
if (!TEST && !app.requestSingleInstanceLock()) app.quit();

const GAME_DIR = app.isPackaged ? path.join(process.resourcesPath, 'game') : path.join(__dirname, '..');
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
  win.loadFile(path.join(GAME_DIR, 'index.html'), MUET ? { query: { muet: '1' } } : undefined);
  win.once('ready-to-show', () => { if (TEST) return; if (display.maximized && !display.fullscreen) win.maximize(); win.show(); });
  if (TEST) {
    const errors = [];
    win.webContents.on('console-message', (e) => { if (e.level === 'error' || e.level === 3) errors.push(String(e.message)); });
    win.webContents.once('did-finish-load', async () => {
      const js = c => win.webContents.executeJavaScript(c, true), out = {};
      try {
        await new Promise(r => setTimeout(r, 1500));
        out.menu = await js('!!document.querySelector("[data-a=jouer]")');
        out.police = await js('document.fonts.check("700 30px Cinzel")');
        out.shaders = await js('PostFX.ok');
        out.combat = await js(`(() => { UI.cacher(); G.nouvellePartie(); for (let i = 0; i < 600; i++) { G.p.iframe = 1; G.mx = G.boss.x; G.my = G.boss.y; Input.k = { Mouse0: true }; majCombat(1 / 60); if (i % 10 === 0) rendu(); Input.endFrame(); } return G.etat + ' ' + G.def.nom + ' ' + Math.round((1 - G.boss.hp / G.boss.hpMax) * 100) + ' %'; })()`);
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

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
