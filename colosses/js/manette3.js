'use strict';
/* Colosses — la manette partout : on se déplace d'un élément à l'autre dans la direction poussée (et plus seulement
   dans l'ordre), dans toutes les fenêtres (menus, salle des trophées, lecteur vidéo, avis, salle d'attente…).
   A valide · B revient · LB / RB changent d'onglet · ← → règlent les curseurs et les listes · stick droit fait défiler
   (et parcourt la salle des trophées) · Y revoit le combat sur les écrans de fin. */

const NAV_SEL = 'button:not([disabled]), select, input[type=range], input[type=checkbox], label.interr, [data-a].succes, .titre-joueur, .af-n, [data-c], [data-v], [data-p], [data-ami]';
function coucheActive() {
  const tu = document.getElementById('tuto-accueil'); if (tu) return tu;
  const r = document.getElementById('revoir'); if (r) return r;
  const avis = [...document.querySelectorAll('.avis-aff')].filter(a => a.querySelector('button')); if (avis.length) return avis[avis.length - 1];
  const e = document.getElementById('ecran'); if (e && e.classList.contains('ouvert')) return e;
  return null;
}
function elementsNav(c) { return [...c.querySelectorAll(NAV_SEL)].filter(b => b.offsetParent !== null || b.closest('#revoir')).filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; }); }
// le voisin le plus proche dans une direction (dx, dy)
function voisin(l, cur, dx, dy) {
  const a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best = null, bs = 1e18;
  for (const b of l) {
    if (b === cur) continue;
    const r = b.getBoundingClientRect(), bx = r.left + r.width / 2, by = r.top + r.height / 2, vx = bx - ax, vy = by - ay;
    const avant = vx * dx + vy * dy; if (avant <= 4) continue;
    const cote = Math.abs(vx * dy - vy * dx), s = avant + cote * 2.2;
    if (s < bs) { bs = s; best = b; }
  }
  return best;
}
const NavM = { cur: null, repT: 0, dir: '' };
Manette.menus = function (g, nouveau, ly, lx) {
  const B = i => this.bouton(g, i);
  // écrans de fin : A recommence, B revient au menu, Y revoit la vidéo
  if (G.etat === 'mort' && G.ecranMort && !G.revoirOuvert && !coucheActive()) { if (nouveau(0)) this.frapper('Enter'); if (nouveau(1)) this.frapper('Escape'); if (nouveau(3)) Input.p['KeyV'] = true; return; }
  if (G.etat === 'interlude' && nouveau(3)) Input.p['KeyV'] = true;
  const c = coucheActive(); if (!c) return;
  const l = elementsNav(c); if (!l.length) return;
  if (!NavM.cur || !l.includes(NavM.cur)) { NavM.cur = l.find(b => b.hasAttribute('data-def') || b.classList.contains('choisi')) || l[0]; marquer(NavM.cur); }
  const cur = NavM.cur;
  const dx = lx > .5 || B(15) ? 1 : lx < -.5 || B(14) ? -1 : 0, dy = ly > .5 || B(13) ? 1 : ly < -.5 || B(12) ? -1 : 0, dir = dx + ',' + dy, t = performance.now();
  if ((dx || dy) && (dir !== NavM.dir || t > NavM.repT)) {
    NavM.repT = t + (dir === NavM.dir ? 150 : 380);
    // les curseurs et les listes se règlent avec ← →
    if (dx && !dy && cur.matches('input[type=range]')) { const st = +cur.step || .05; cur.value = clamp(+cur.value + dx * st, +cur.min, +cur.max); cur.dispatchEvent(new Event('input', { bubbles: true })); cur.dispatchEvent(new Event('change', { bubbles: true })); }
    else if (dx && !dy && cur.matches('select')) { cur.selectedIndex = clamp(cur.selectedIndex + dx, 0, cur.options.length - 1); cur.dispatchEvent(new Event('change', { bubbles: true })); }
    else { const v = voisin(l, cur, dx, dy); if (v) { NavM.cur = v; marquer(v); try { Son.play('clic'); } catch (e) { } } }
  }
  NavM.dir = dir;
  // stick droit : défiler, et marcher dans la salle des trophées
  const rx = g.axes[2] || 0, ry = g.axes[3] || 0;
  if (Math.abs(ry) > .3) { const p = cur.closest('.panneau, .rv-coups, .mo-liste, .mt-liste') || c; p.scrollTop += ry * 14; }
  if (Math.abs(rx) > .3 && typeof Musee !== 'undefined' && Musee.cv && Musee.cv.isConnected) Musee.vise += rx * 22;
  // LB / RB : onglet précédent / suivant
  if (nouveau(4) || nouveau(5)) { const o = [...c.querySelectorAll('.onglets button')]; if (o.length) { let i = o.findIndex(b => b.classList.contains('actif')); i = clamp(i + (nouveau(5) ? 1 : -1), 0, o.length - 1); o[i].click(); NavM.cur = null; } }
  if (nouveau(0)) {
    if (cur.matches('input[type=checkbox]')) cur.click();
    else if (cur.matches('label.interr')) { const i = cur.querySelector('input'); if (i) i.click(); }
    else if (!cur.matches('input[type=range], select')) { cur.click(); NavM.cur = null; }
  }
  if (nouveau(1)) {
    if (c.id === 'revoir') { fermerRevoir(); }
    else if (c.classList.contains('avis-aff')) { const b = c.querySelectorAll('button'); if (b.length) b[b.length - 1].click(); }
    else this.frapper('Escape');
    NavM.cur = null;
  }
  if (nouveau(3) && G.revoirOuvert) Input.p['KeyV'] = true;
  if (nouveau(9) && G.etat === 'pause') this.frapper('Escape');
};
function marquer(b) { document.querySelectorAll('.focus-manette').forEach(x => x.classList.remove('focus-manette')); b.classList.add('focus-manette'); try { b.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { } }
// le lecteur vidéo bloque le jeu : la manette doit pouvoir s'y promener même en combat (interlude)
const _lireNav = Manette.lire.bind(Manette);
Manette.lire = function () {
  if (G.revoirOuvert) { const g = this.pourJ1(); if (g) { const B = i => this.bouton(g, i), nouveau = i => B(i) && !this.avant[i], ax = g.axes; this.menus(g, nouveau, Math.abs(ax[1]) > .3 ? ax[1] : 0, Math.abs(ax[0]) > .3 ? ax[0] : 0); this.avant = {}; g.buttons.forEach((b, i) => { this.avant[i] = b.pressed || b.value > .5; }); } return; }
  const g0 = this.pourJ1(); if (g0 && G.etat === 'interlude' && this.bouton(g0, 3) && !this.avant[3]) Input.p['KeyV'] = true; // Y : revoir après une victoire
  return _lireNav();
};
// la souris reprend la main : on enlève le cadre de la manette
addEventListener('mousemove', () => { if (NavM.cur) { NavM.cur.classList.remove('focus-manette'); NavM.cur = null; } });
