// Panthéa — pont entre le jeu et le programme : seulement le classement en ligne du défi du jour (Steam).
// Le jeu le voit comme window.pantheaSteam ; sans Steam, ready() répond false et le classement reste caché.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('pantheaSteam', {
  ready: () => ipcRenderer.invoke('lb:ready'),
  submit: (board, score) => ipcRenderer.invoke('lb:submit', String(board), Number(score) | 0),
  top: (board, n) => ipcRenderer.invoke('lb:top', String(board), Number(n) | 0),
});
