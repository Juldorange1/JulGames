// Triade — fonctionnement hors ligne (application installée sur téléphone / tablette).
// Les fichiers du jeu sont gardés en cache ; une nouvelle version remplace l'ancienne au lancement suivant.
const VERSION = 'triade-v1';
const CORE = ['./', 'index.html', 'style.css', 'icon.png', 'manifest.webmanifest',
  'js/i18n.js', 'js/lang/en.js', 'js/data.js', 'js/audio.js', 'js/engine.js', 'js/render.js', 'js/ui.js', 'js/codex.js', 'js/main.js', 'js/gamepad.js'];

self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// réseau d'abord (toujours la dernière version en ligne), cache si pas de réseau ; la musique : cache d'abord
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const music = /\/music\//.test(req.url);
  if (music) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { if (res.ok && res.status === 200) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return res; })));
    return;
  }
  e.respondWith(fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return res; }).catch(() => caches.match(req).then(hit => hit || caches.match('index.html'))));
});
