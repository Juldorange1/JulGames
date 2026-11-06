'use strict';
/* Colosses — vraiment jouable sur tablette et téléphone :
   • les commandes tactiles sont prêtes dès le début sur un écran tactile ;
   • tir automatique sur le boss : le pouce gauche déplace, les boutons lancent spéciale et talent, et le doigt droit
     sert seulement si on veut viser soi-même (les armes à charger se tirent au doigt droit) ;
   • plein écran et paysage demandés au premier toucher, message si le téléphone est tenu en portrait ;
   • menus plus compacts sur petit écran ; les textes du jeu grossissent quand l'écran est petit (voir textes.js). */

const Mobile = {
  tactile: !!(window.matchMedia && matchMedia('(pointer: coarse)').matches),
  petit() { return Math.min(innerWidth, innerHeight) < 560; },
  zoom() { const h = Math.min(innerHeight, innerWidth * .8); return h < 420 ? .68 : h < 560 ? .8 : h < 700 ? .92 : null; }
};
function pleinEcran() {
  try {
    const e = document.documentElement;
    if (!document.fullscreenElement && e.requestFullscreen) { const p = e.requestFullscreen(); if (p && p.then) p.then(() => { try { const o = screen.orientation; if (o && o.lock) o.lock('landscape').catch(() => { }); } catch (x) { } }).catch(() => { }); }
  } catch (e) { }
}
addEventListener('load', () => {
  if (Mobile.tactile) { Tactile.actif = true; Tactile.creer(); document.body.classList.add('tactile'); }
  const d = document.createElement('div'); d.id = 'tourne'; d.innerHTML = '<div>⟳</div><p>Tourne ton appareil</p>'; document.body.appendChild(d);
  try { if (typeof Langue !== 'undefined') Langue.dom(d); } catch (e) { }
});
// le premier toucher sur un petit écran : plein écran
addEventListener('pointerup', e => { if (e.pointerType === 'touch' && Mobile.petit() && !Mobile.fait) { Mobile.fait = true; pleinEcran(); } }, true);
// menus compacts
const _montrerMobile = UI.montrer;
UI.montrer = function () {
  const r = _montrerMobile.apply(this, arguments);
  try { const z = Mobile.zoom(); if (z) this.el.style.setProperty('--zoom', Math.min(z, Save.d.opts.zoomMenu || 1)); } catch (e) { }
  return r;
};
// en combat, tenu en portrait : on demande de tourner l'appareil
const _pasMobile = pasBoucle;
pasBoucle = function (now) {
  try {
    const jeu = G.etat === 'combat' || G.etat === 'interlude' || G.etat === 'invite' || G.etat === 'pause';
    document.body.classList.toggle('en-jeu', !!jeu);
    if (jeu && G.etat === 'combat' && Mobile.tactile && innerHeight > innerWidth && Mobile.petit() && !(typeof Coop !== 'undefined' && Coop.inscrits.length)) UI.pause();
  } catch (e) { }
  return _pasMobile(now);
};
