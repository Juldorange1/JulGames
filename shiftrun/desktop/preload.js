// Shiftrun — pont entre le jeu et le programme : Steam (succès, cloud, classements) et outil de vitrine.
// Le jeu le voit comme window.shiftrunSteam ; sans Steam, pret() répond false et le jeu fait comme dans le navigateur.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('shiftrunSteam', {
  pret: () => ipcRenderer.invoke('steam:pret'),
  succes: (id) => ipcRenderer.invoke('steam:succes', String(id)),
  cloudEcrire: (txt) => ipcRenderer.invoke('steam:cloudEcrire', String(txt)),
  cloudLire: () => ipcRenderer.invoke('steam:cloudLire'),
  classementPret: () => ipcRenderer.invoke('lb:pret'),
  classementEnvoyer: (board, temps, fantome) => ipcRenderer.invoke('lb:envoyer', String(board), Number(temps) | 0, String(fantome || '')),
  classementTop: (board, n) => ipcRenderer.invoke('lb:top', String(board), Number(n) | 0),
  vitrineEcrire: (nom, octets) => ipcRenderer.invoke('vitrine:ecrire', String(nom), octets),
  vitrineFini: () => ipcRenderer.invoke('vitrine:fini'),
  programme: true
});
