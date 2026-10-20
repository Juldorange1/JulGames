// Stratajium — version programme (Electron) : le jeu se lance dans sa propre fenêtre, sans navigateur.
// F11 ou Alt+Entrée : plein écran. Les points, records et l'apprentissage du bot sont gardés par le programme.
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

app.setName('Stratajium');
const TEST = process.argv.includes('--test'); // auto-test sans fenêtre, dans un dossier jetable
if (TEST) app.setPath('userData', path.join(app.getPath('temp'), 'stratajium-test-' + process.pid));
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
    width: display.width, height: display.height, minWidth: 900, minHeight: 600,
    fullscreen: TEST ? false : display.fullscreen, backgroundColor: '#0f0d14', title: 'Stratajium',
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
        await new Promise(r => setTimeout(r, 500));
        out.quitButton = await js('!document.getElementById("btnQuit").hidden');
        out.font = await js('document.fonts.check("800 20px Cinzel")');
        out.music = await js('fetch("music/partie.mp3").then(r => r.ok)');
        out.sfx = await js('fetch("sfx/prise.ogg").then(r => r.ok)');
        await js(`localStorage.setItem('stratajium.tutoFait','true'); document.getElementById('tutoModal').hidden = true; document.querySelector('[data-new="0"]').click(); document.querySelector('[data-lv="impossible"]').click(); document.getElementById('btnStart').click(); true`);
        await new Promise(r => setTimeout(r, 300));
        const t0 = Date.now();
        // le premier joueur est tiré au sort : on attend notre tour, on joue, puis on attend la réponse du bot
        while (Date.now() - t0 < 20000 && await js('STRAT.G.s.turn !== 0')) await new Promise(r => setTimeout(r, 200));
        await js(`STRAT.doAction(STRAT.E.gen(STRAT.G.s, true).find(a => a.k === 'rec')); true`);
        while (Date.now() - t0 < 40000 && await js('STRAT.G.s.turn !== 0')) await new Promise(r => setTimeout(r, 200));
        out.botMs = Date.now() - t0;
        out.botPlayed = await js('STRAT.G.s.ply');
        out.decor = await js('document.querySelectorAll("#terrain canvas").length');
        out.creatures = await js('document.querySelectorAll("#board .crit, .pp .crit").length');
        out.languages = await js('I18N.LANGS.map(l => l[0]).join(",")');
        out.english = await js(`I18N.setLang('en'); I18N.L('Victoire !')`);
        out.japanese = await js(`I18N.setLang('ja'); I18N.L('Victoire !')`);
        out.errors = errors.slice(0, 5);
      } catch (err) { out.exception = String(err); }
      console.log('STRATAJIUM_TEST ' + JSON.stringify(out));
      try { fs.rmSync(app.getPath('userData'), { recursive: true, force: true }); } catch (e) { }
      app.exit(0);
    });
  }
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.key === 'Enter' && input.alt)) { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    if (input.key === 'F12' && !app.isPackaged) win.webContents.toggleDevTools();
  });
  // les liens externes ne s'ouvrent pas dans le jeu
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
// (en mode --test, le dossier temporaire est effacé à la fin)
app.on('window-all-closed', () => app.quit());
