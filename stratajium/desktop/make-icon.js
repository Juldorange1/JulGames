// Fabrique ../icon.png (512×512) avec le vrai jeton d'un mage du jeu : npm run icon
const { app, BrowserWindow } = require('electron');
const path = require('path'), fs = require('fs');
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 800, height: 600 });
  await win.loadFile(path.join(__dirname, '..', 'index.html'), { query: { muet: '1' } });
  await new Promise(r => setTimeout(r, 800));
  const data = await win.webContents.executeJavaScript(`(async () => {
    const N = 512, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, N, N); g.addColorStop(0, '#2a1f3a'); g.addColorStop(1, '#0f0d14');
    x.fillStyle = g; x.beginPath(); x.roundRect(12, 12, N - 24, N - 24, 100); x.fill();
    x.strokeStyle = '#f2c14e'; x.lineWidth = 10; x.stroke();
    const svgOf = (ti, o) => { const d = document.createElement('div'); d.innerHTML = window.STRAT_TOKEN(ti, o); const s = d.firstChild; s.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); s.setAttribute('width', 300); s.setAttribute('height', 300);
      const defs = document.querySelector('svg defs').outerHTML; s.insertAdjacentHTML('afterbegin', defs); return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s.outerHTML); };
    const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
    const E = window.STRAT.E;
    const a = await load(svgOf(E.TI.ma, 0)), b = await load(svgOf(E.TI.g2, 1));
    x.drawImage(b, 210, 150, 260, 260); x.drawImage(a, 40, 70, 330, 330);
    return c.toDataURL('image/png').split(',')[1];
  })()`, true);
  fs.writeFileSync(path.join(__dirname, '..', 'icon.png'), Buffer.from(data, 'base64'));
  console.log('icon.png écrite');
  app.exit(0);
});
