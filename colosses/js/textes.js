'use strict';
/* Colosses — textes plus gros et lisibles : sur l'écran de jeu, chaque petit texte (moins de 16 px) grossit de 2 à
   3 px ; les menus sont agrandis de 10 % par défaut (réglable dans Paramètres → Jeu → Taille des menus). */

(function () {
  const d = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'font');
  if (!d || !d.set) return;
  const cache = new Map();
  const grossir = v => {
    let r = cache.get(v); if (r !== undefined) return r;
    r = String(v).replace(/(\d+(?:\.\d+)?)px/, (m, n) => { n = +n; const p = n <= 10 ? n + 3 : n <= 13 ? n + 2.5 : n < 16 ? n + 1.5 : n; return p + 'px'; });
    if (cache.size > 500) cache.clear(); cache.set(v, r); return r;
  };
  Object.defineProperty(CanvasRenderingContext2D.prototype, 'font', {
    configurable: true, enumerable: d.enumerable,
    get() { return d.get.call(this); },
    // seulement sur l'écran principal du jeu (pas sur les petites animations ni les calques)
    set(v) { d.set.call(this, (typeof cv !== 'undefined' && this.canvas === cv) ? grossir(v) : v); }
  });
})();
// menus : 10 % plus grands par défaut (une seule fois, l'utilisateur peut changer ensuite)
try { if (!Save.d.opts.zoomTextes) { if (!Save.d.opts.zoomMenu || Save.d.opts.zoomMenu <= 1) Save.d.opts.zoomMenu = 1.1; Save.d.opts.zoomTextes = 1; Save.write(); } } catch (e) { }
