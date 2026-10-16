// Pont entre le jeu (page) et le programme (main.js) : le jeu y voit window.fracasNative.
// Rien d'autre de Node/Electron n'est expose a la page.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fracasNative', {
  isDesktop: true,
  readSave: () => ipcRenderer.sendSync('save-read'),               // texte JSON ou null
  writeSave: (text) => ipcRenderer.send('save-write', String(text)), // ecriture differee
  getDisplay: () => ipcRenderer.sendSync('display-get'),           // { fullscreen, width, height }
  setFullscreen: (on) => ipcRenderer.send('display-fullscreen', !!on),
  setWindowSize: (w, h) => ipcRenderer.send('display-size', w | 0, h | 0),
  quit: () => ipcRenderer.send('quit'),
  isPlaytest: () => ipcRenderer.sendSync('is-playtest'), // programme lance avec --playtest
  exportFile: (name, text) => ipcRenderer.sendSync('export-file', String(name), String(text)), // -> chemin du fichier
});
