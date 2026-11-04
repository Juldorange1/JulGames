'use strict';
/* Colosses — ralenti de la mort : le jeu garde les 3 dernières secondes d'images (petites, 20 par seconde).
   Sur l'écran de mort, V (ou Y à la manette) les rejoue au ralenti pour voir ce qui t'a touché. */

const Ralenti = {
  N: 60, LW: 480, LH: 300, images: [], tete: 0, n: 0, compte: 0, lecture: null,
  enregistrer() {
    if (!cv || !(G.etat === 'combat' || (G.etat === 'mort' && !G.ecranMort))) return;
    if (++this.compte % 3) return;
    let im = this.images[this.tete];
    if (!im) { im = document.createElement('canvas'); im.width = this.LW; im.height = this.LH; this.images[this.tete] = im; }
    try { im.getContext('2d').drawImage(cv, 0, 0, cv.width, cv.height, 0, 0, this.LW, this.LH); } catch (e) { return; }
    this.tete = (this.tete + 1) % this.N; this.n = Math.min(this.N, this.n + 1);
  },
  vider() { this.n = 0; this.tete = 0; this.lecture = null; },
  lancer() { if (this.n < 5) return; this.lecture = { t: 0, ordre: Array.from({ length: this.n }, (_, i) => this.images[(this.tete - this.n + i + this.N) % this.N]) }; Son.play('clic'); },
  dessiner() {
    const L = this.lecture; if (!L) return;
    L.t += 1 / 60;
    const vitesse = .35, i = Math.min(L.ordre.length - 1, Math.floor(L.t * 20 * vitesse));
    const c = ctx; c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#000'; c.fillRect(0, 0, cv.width, cv.height);
    const k = Math.min(cv.width / this.LW, cv.height / this.LH), w = this.LW * k, h = this.LH * k, x = (cv.width - w) / 2, y = (cv.height - h) / 2;
    c.imageSmoothingEnabled = true; c.drawImage(L.ordre[i], x, y, w, h);
    // bandeau
    const s = cv.width / 1280;
    c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(0, cv.height - 60 * s, cv.width, 60 * s);
    c.font = `700 ${18 * s}px ${POLICE_ER}`; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = '#ffd8a0';
    c.fillText('RALENTI ×0,35 — les 3 dernières secondes', 24 * s, cv.height - 30 * s);
    c.textAlign = 'right'; c.fillStyle = '#d8ccb4'; c.font = `600 ${14 * s}px ${POLICE}`; c.fillText('V : arrêter · Espace : recommencer', cv.width - 24 * s, cv.height - 30 * s);
    c.fillStyle = '#c9a865'; c.fillRect(0, cv.height - 4 * s, cv.width * (i + 1) / L.ordre.length, 4 * s);
    c.restore();
    if (i >= L.ordre.length - 1 && L.t * 20 * vitesse > L.ordre.length + 8) L.t = 0; // en boucle
  }
};
const _renduRalenti = rendu;
rendu = function () {
  _renduRalenti.apply(this, arguments);
  try { if (Ralenti.lecture && G.etat === 'mort') Ralenti.dessiner(); else { Ralenti.lecture = null; Ralenti.enregistrer(); } } catch (e) { }
};
const _pasRalenti = pasBoucle;
pasBoucle = function (now) {
  if (G.etat === 'mort' && G.ecranMort && Input.hit('KeyV')) { if (Ralenti.lecture) Ralenti.lecture = null; else Ralenti.lancer(); }
  return _pasRalenti(now);
};
const _entrerRalenti = G.entrerSalle;
G.entrerSalle = function () { Ralenti.vider(); return _entrerRalenti.apply(this, arguments); };
const _ecranMortRalenti = dessinerEcranMort;
dessinerEcranMort = function (c) {
  _ecranMortRalenti(c);
  if (Ralenti.n >= 5) { c.save(); c.textAlign = 'center'; texteOmbre(c, 'V (ou Y à la manette) : revoir la fin au ralenti', W / 2, 676, '#ffd8a0', `700 15px ${POLICE}`, 4); c.restore(); }
};
// manette : Y sur l'écran de mort lance le ralenti
const _menusRalenti = Manette.menus.bind(Manette);
Manette.menus = function (g, nouveau, ly, lx) { if (G.etat === 'mort' && G.ecranMort && nouveau(3)) Input.p['KeyV'] = true; return _menusRalenti(g, nouveau, ly, lx); };
