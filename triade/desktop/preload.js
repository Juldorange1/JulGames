// Pont entre le jeu et le programme. Le jeu garde ses données dans localStorage (clés « binome_* ») ;
// ici on les recopie dans un fichier (pour Steam Cloud) et on les remet au démarrage.
const { contextBridge, ipcRenderer } = require('electron');

const PREFIX = 'binome_';
function collect() {
  const o = {};
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(PREFIX)) o[k] = localStorage.getItem(k); } } catch (e) { }
  return JSON.stringify(o);
}
// 1) au démarrage : le fichier de sauvegarde fait foi
try {
  const text = ipcRenderer.sendSync('save-read');
  if (text) {
    const o = JSON.parse(text);
    for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX) && !(k in o)) localStorage.removeItem(k);
    for (const k in o) if (k.startsWith(PREFIX)) localStorage.setItem(k, o[k]);
  }
} catch (e) { }
// 2) ensuite : copie régulière dans le fichier quand quelque chose change
let last = collect();
setInterval(() => { const now = collect(); if (now !== last) { last = now; ipcRenderer.send('save-write', now); } }, 1500);
window.addEventListener('beforeunload', () => { const now = collect(); if (now !== last) ipcRenderer.sendSync('save-flush', now); });

contextBridge.exposeInMainWorld('triadeNative', {
  isDesktop: true,
  quit: () => { ipcRenderer.sendSync('save-flush', collect()); ipcRenderer.send('quit'); },
  isFullscreen: () => ipcRenderer.sendSync('display-get').fullscreen,
  setFullscreen: on => ipcRenderer.send('display-fullscreen', !!on),
});
