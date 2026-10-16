// Fabrique ../icon.png (512×512) avec le vrai dessin des héros du jeu : npx electron make-icon.js
const { app, BrowserWindow } = require('electron');
const path = require('path'), fs = require('fs');
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 800, height: 600 });
  await win.loadFile(path.join(__dirname, '..', 'index.html'), { query: { muet: '1' } });
  await new Promise(r => setTimeout(r, 1500));
  const data = await win.webContents.executeJavaScript(`(async () => {
    const N = 512, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, N); g.addColorStop(0, '#1d2340'); g.addColorStop(1, '#0a0d15');
    x.fillStyle = g; x.beginPath(); x.roundRect(16, 16, N - 32, N - 32, 96); x.fill();
    x.strokeStyle = 'rgba(255,209,102,0.85)'; x.lineWidth = 10; x.stroke();
    const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
    const im = await Promise.all(['brann', 'lyse', 'kael'].map(k => load(Render.portrait(k))));
    const s = 250; x.drawImage(im[0], N / 2 - s / 2, 56, s, s); x.drawImage(im[1], 64, 200, s, s); x.drawImage(im[2], N - 64 - s, 200, s, s);
    await document.fonts.ready;
    x.font = '900 72px Cinzel, Georgia, serif'; x.textAlign = 'center'; x.fillStyle = '#ffd166'; x.shadowColor = 'rgba(0,0,0,0.8)'; x.shadowBlur = 12; x.fillText('TRIADE', N / 2, N - 44);
    return c.toDataURL('image/png').split(',')[1];
  })()`, true);
  fs.writeFileSync(path.join(__dirname, '..', 'icon.png'), Buffer.from(data, 'base64'));
  console.log('icon.png écrite');
  app.exit(0);
});
