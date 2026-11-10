'use strict';
/* Colosses — revoir la fin : le jeu garde les 3 dernières secondes en images nettes (pleine taille, compressées en
   JPEG pour tenir en mémoire) et une image de chaque coup reçu. Sur l'écran de mort, V (ou Y à la manette) :
   le ralenti de la fin, puis ← → pour passer en revue TOUS les coups reçus pendant le combat (attaque, dégâts, vie). */

const Ralenti = {
  N: 60, images: [], tete: 0, n: 0, compte: 0, lecture: null, enCours: 0, coups: [], prise: false, tampon: null,
  // une image du jeu, compressée sans attendre (le navigateur l'encode à côté)
  photo(cb, prioritaire) {
    if (this.enCours > (prioritaire ? 8 : 2)) return;
    const w = Math.min(cv.width, 1600), h = Math.round(cv.height * w / cv.width);
    const t = this.tampon || (this.tampon = document.createElement('canvas'));
    if (t.width !== w || t.height !== h) { t.width = w; t.height = h; }
    try { t.getContext('2d').drawImage(cv, 0, 0, cv.width, cv.height, 0, 0, w, h); } catch (e) { return; }
    this.enCours++;
    t.toBlob(b => { this.enCours--; if (b) cb(b); }, 'image/jpeg', .86);
  },
  enregistrer() {
    if (!cv || !(G.etat === 'combat' || (G.etat === 'mort' && !G.ecranMort))) return;
    if (this.prise) { this.prise = false; const c = this.coupEnAttente; this.photo(b => { if (this.coups.length < 40) this.coups.push({ b, c }); }, true); }
    if (++this.compte % 3) return;
    const i = this.tete; this.tete = (this.tete + 1) % this.N; this.n = Math.min(this.N, this.n + 1);
    this.photo(b => { this.images[i] = b; });
  },
  vider() { this.n = 0; this.tete = 0; this.images = []; this.coups = []; this.liberer(); this.lecture = null; },
  liberer() { const L = this.lecture; if (L) for (const x of (L.fin || []).concat(L.imgCoups || [])) try { x && x.close && x.close(); } catch (e) { } },
  async lancer() {
    if (this.n < 5) return;
    const ordre = Array.from({ length: this.n }, (_, i) => this.images[(this.tete - this.n + i + this.N) % this.N]).filter(Boolean);
    const L = this.lecture = { t: 0, mode: 'fin', i: 0, pret: false, fin: [], imgCoups: [] };
    Son.play('clic');
    try {
      L.fin = await Promise.all(ordre.map(b => createImageBitmap(b)));
      L.imgCoups = await Promise.all(this.coups.map(x => createImageBitmap(x.b)));
    } catch (e) { }
    L.pret = true;
  },
  nomSrc(s) { return ATK[s] ? ATK[s].nom : ({ contact: 'Contact du boss', lave: 'Lave', invocation: 'Invocations', pieges: 'Pièges', Pression: 'Pression', Renfort: 'Frappe de renfort', 'Dernier souffle': 'Dernier souffle', Effondrement: 'Effondrement', 'Lave montante': 'Lave montante' }[s] || s); },
  dessiner() {
    const L = this.lecture; if (!L) return;
    const c = ctx; c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#000'; c.fillRect(0, 0, cv.width, cv.height);
    const s = cv.width / 1280, j = G.journalCoups || [];
    const image = im => { if (!im) return; const k = Math.min(cv.width / im.width, (cv.height - 70 * s) / im.height), w = im.width * k, h = im.height * k; c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.drawImage(im, (cv.width - w) / 2, (cv.height - 70 * s - h) / 2, w, h); };
    let titre = '', barre = 0;
    if (!L.pret) titre = 'Préparation du ralenti…';
    else if (L.mode === 'fin') {
      L.t += 1 / 60; const vitesse = .35, i = Math.min(L.fin.length - 1, Math.floor(L.t * 20 * vitesse));
      image(L.fin[i]); barre = (i + 1) / Math.max(1, L.fin.length);
      titre = 'RALENTI ×0,35 — les 3 dernières secondes';
      if (i >= L.fin.length - 1 && L.t * 20 * vitesse > L.fin.length + 8) L.t = 0;
    } else {
      const k = clamp(L.i, 0, Math.max(0, this.coups.length - 1)), x = this.coups[k];
      image(L.imgCoups[k]); barre = (k + 1) / Math.max(1, this.coups.length);
      titre = !x && j.length ? `${j.length} coup(s) reçu(s) : la liste est à droite` : x ? `Coup ${k + 1} / ${this.coups.length} · ${fmtTemps(x.c.t)} · ${this.nomSrc(x.c.src)} · −${x.c.dmg} · vie restante ${x.c.hp}` : 'Aucun coup reçu';
    }
    // liste de tous les coups du combat, à droite
    if (L.pret && j.length) {
      const x0 = cv.width - 300 * s, lh = 19 * s; c.fillStyle = 'rgba(0,0,0,.62)'; c.fillRect(x0 - 10 * s, 10 * s, 300 * s, Math.min(cv.height - 90 * s, (j.length + 2) * lh + 10 * s));
      c.font = `700 ${14 * s}px ${POLICE}`; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = '#ffd8a0';
      const tot = j.reduce((a, b) => a + b.dmg, 0); c.fillText(`Tous les coups reçus : ${j.length} (${tot} dégâts)`, x0, 10 * s + lh);
      const max = Math.floor((cv.height - 120 * s) / lh) - 1, deb = Math.max(0, j.length - max);
      j.slice(deb).forEach((e, n) => { const idx = deb + n, sel = L.mode === 'coups' && idx === L.i; c.fillStyle = sel ? '#ffe14d' : '#e6dcc8'; c.font = `${sel ? 800 : 500} ${13 * s}px ${POLICE}`; c.fillText(`${fmtTemps(e.t)}  −${e.dmg}  ${this.nomSrc(e.src)}`.slice(0, 40), x0, 10 * s + lh * (n + 2)); });
    }
    c.fillStyle = 'rgba(0,0,0,.7)'; c.fillRect(0, cv.height - 70 * s, cv.width, 70 * s);
    c.font = `700 ${18 * s}px ${POLICE_ER}`; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = '#ffd8a0'; c.fillText(titre, 24 * s, cv.height - 40 * s);
    c.textAlign = 'right'; c.fillStyle = '#d8ccb4'; c.font = `600 ${14 * s}px ${POLICE}`;
    c.fillText((this.coups.length ? '← → : passer les coups reçus · ' : '') + 'V : arrêter · Espace : recommencer', cv.width - 24 * s, cv.height - 40 * s);
    c.fillStyle = '#c9a865'; c.fillRect(0, cv.height - 4 * s, cv.width * barre, 4 * s);
    c.restore();
  }
};
const _renduRalenti = rendu;
rendu = function () {
  _renduRalenti.apply(this, arguments);
  try { if (Ralenti.lecture && G.etat === 'mort') Ralenti.dessiner(); else { if (Ralenti.lecture) { Ralenti.liberer(); Ralenti.lecture = null; } Ralenti.enregistrer(); } } catch (e) { }
};
// chaque coup reçu : une photo à l'image suivante (on voit ce qui a touché)
const _blesserRalenti = G.blesser;
G.blesser = function () {
  const r = _blesserRalenti.apply(this, arguments);
  try { if (r && this.journalCoups && this.journalCoups.length && (typeof Coop === 'undefined' || !Coop.hote || this.p === Coop.hote)) { Ralenti.prise = true; Ralenti.coupEnAttente = this.journalCoups[this.journalCoups.length - 1]; } } catch (e) { }
  return r;
};
const _pasRalenti = pasBoucle;
pasBoucle = function (now) {
  if (G.etat === 'mort' && G.ecranMort) {
    const L = Ralenti.lecture;
    if (Input.hit('KeyV')) { if (L) { Ralenti.liberer(); Ralenti.lecture = null; } else Ralenti.lancer(); }
    else if (L && L.pret && Ralenti.coups.length) {
      if (Input.hit('ArrowRight') || Input.hit('KeyD')) { if (L.mode === 'fin') { L.mode = 'coups'; L.i = 0; } else L.i = Math.min(Ralenti.coups.length - 1, L.i + 1); }
      if (Input.hit('ArrowLeft') || Input.hit('KeyA') || Input.hit('KeyQ')) { if (L.mode === 'coups') { if (L.i > 0) L.i--; else { L.mode = 'fin'; L.t = 0; } } }
    }
  }
  return _pasRalenti(now);
};
const _entrerRalenti = G.entrerSalle;
G.entrerSalle = function () { Ralenti.vider(); return _entrerRalenti.apply(this, arguments); };
const _ecranMortRalenti = dessinerEcranMort;
dessinerEcranMort = function (c) {
  _ecranMortRalenti(c);
  if (Ralenti.n >= 5 && !G.finDefi) { c.save(); c.textAlign = 'center'; texteOmbre(c, 'V (ou Y à la manette) : revoir la fin au ralenti et tous les coups reçus', W / 2, 676, '#ffd8a0', `700 15px ${POLICE}`, 4); c.restore(); }
};
// manette : Y sur l'écran de mort lance le ralenti, la croix passe les coups
const _menusRalenti = Manette.menus.bind(Manette);
Manette.menus = function (g, nouveau, ly, lx) {
  if (G.etat === 'mort' && G.ecranMort) { if (nouveau(3)) Input.p['KeyV'] = true; if (nouveau(15)) Input.p['ArrowRight'] = true; if (nouveau(14)) Input.p['ArrowLeft'] = true; }
  return _menusRalenti(g, nouveau, ly, lx);
};

// ---------- à la fin de chaque combat : ton efficacité (100 % = dégâts par seconde d'un jeu parfait avec tes armes) ----------
function efficaciteCombat() {
  try {
    if (!G.def || !G.ars || !(G.chrono > 3) || typeof tempsParfait !== 'function') return null;
    const ref = G.def.hpMax / Math.max(1, tempsParfait(G.def, G.ars)), reel = (G.degatsCombat || 0) / G.chrono;
    return Math.max(0, Math.min(100, Math.round(100 * reel / Math.max(1, ref))));
  } catch (e) { return null; }
}
const _mortEff = G.mortJoueur;
G.mortJoueur = function () { this.effFin = efficaciteCombat(); return _mortEff.apply(this, arguments); };
const _bossEff = G.bossMort;
G.bossMort = function () { if (this.boss && !this.boss.finale) this.effFin = efficaciteCombat(); return _bossEff.apply(this, arguments); };
const _hudEff = dessinerHUD;
dessinerHUD = function (c) {
  _hudEff.apply(this, arguments);
  if (G.etat === 'interlude' && G.effFin !== null && G.effFin !== undefined && G.boss && G.boss.mort) {
    c.save(); c.textAlign = 'center'; texteOmbre(c, 'Efficacité : ' + G.effFin + ' % · ' + Math.round((G.degatsCombat || 0) / Math.max(1, G.chrono)) + ' dégâts/s', W / 2, H * .62, G.effFin >= 80 ? '#7dffb0' : '#ffe7a6', `800 20px ${POLICE}`, 5); c.restore();
  }
};

// ---------- les petites arènes rondes : moins d'attaques en même temps (il y a moins de place pour esquiver) ----------
const _appliquerRond = Arene.appliquer.bind(Arene);
Arene.appliquer = function (carte) {
  const r = _appliquerRond(carte);
  try {
    const d = G.def; if (d && d.D) {
      const rond = carte === 'cercle';
      if (rond && !d._rond) { d._rond = 1; d.D.C *= .75; d.D.S *= .9; d.idle *= 1.25; d.D.T *= 1.12; }
      else if (!rond && d._rond) { d._rond = 0; d.D.C /= .75; d.D.S /= .9; d.idle /= 1.25; d.D.T /= 1.12; }
    }
  } catch (e) { }
  return r;
};
