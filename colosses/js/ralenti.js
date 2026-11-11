'use strict';
/* Colosses — revoir le combat : chaque combat est filmé (une vraie vidéo, sans le son). À la fin de chaque boss,
   victoire ou mort, dans tous les modes : un bilan (durée, dégâts par seconde, efficacité, dégâts reçus) et
   V (ou Y à la manette) pour revoir le combat — au ralenti si on veut, et en sautant directement à chaque coup reçu.
   Pour la mémoire, on garde au plus les 5 dernières minutes d'un combat (en deux morceaux). */

const Video = {
  rec: null, morceaux: [], parts: [], t0: 0, type: '', coups: [], partT0: 0,
  demarrer() {
    this.arreter(true); this.liberer(); this.parts = []; this.coups = [];
    this.lancerMorceau();
  },
  lancerMorceau() {
    if (!window.MediaRecorder || !cv || !cv.captureStream) return;
    try {
      const st = cv.captureStream(30);
      const types = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
      this.type = types.find(t => MediaRecorder.isTypeSupported(t)) || '';
      const r = this.rec = new MediaRecorder(st, this.type ? { mimeType: this.type, videoBitsPerSecond: 1600000 } : { videoBitsPerSecond: 1600000 });
      const morceaux = []; r.ondataavailable = e => { if (e.data && e.data.size) morceaux.push(e.data); };
      r.onstop = () => { try { st.getTracks().forEach(t => t.stop()); } catch (e) { } if (r._jeter) return; this.parts.push({ url: URL.createObjectURL(new Blob(morceaux, { type: this.type || 'video/webm' })), t0: r._t0 }); if (this.parts.length > 2) { const x = this.parts.shift(); URL.revokeObjectURL(x.url); } };
      r._t0 = performance.now(); this.partT0 = r._t0; if (!this.t0 || !this.parts.length) this.t0 = r._t0;
      r.start(1000);
    } catch (e) { this.rec = null; }
  },
  // pendant le combat : on coupe en morceaux de 2 min 30 pour ne garder que la fin
  tic() { if (this.rec && performance.now() - this.partT0 > 150000) { const r = this.rec; this.rec = null; try { r.stop(); } catch (e) { } this.lancerMorceau(); } },
  arreter(jeter) { const r = this.rec; this.rec = null; if (!r) return; r._jeter = !!jeter; try { r.stop(); } catch (e) { } },
  liberer() { for (const p of this.parts) URL.revokeObjectURL(p.url); this.parts = []; },
  noterCoup(c) { if (this.rec) this.coups.push(Object.assign({ w: performance.now() }, c)); },
  dispo() { return this.parts.length > 0; }
};
// on filme à chaque nouveau combat, et on coupe un peu après la fin (pour voir l'explosion ou la chute)
const _entrerVideo = G.entrerSalle;
G.entrerSalle = function () { const r = _entrerVideo.apply(this, arguments); try { Video.demarrer(); fermerRevoir(); } catch (e) { } return r; };
const _bossVideo = G.bossMort;
G.bossMort = function () {
  const vivant = this.boss && !this.boss.mort, r = _bossVideo.apply(this, arguments);
  try { if (vivant && this.boss && this.boss.mort) { this.statsFin = bilanCombat(true); setTimeout(() => Video.arreter(), 1500); } } catch (e) { }
  return r;
};
const _mortVideo = G.mortJoueur;
G.mortJoueur = function () {
  const r = _mortVideo.apply(this, arguments);
  try { if (this.etat === 'mort') { this.statsFin = bilanCombat(false); setTimeout(() => Video.arreter(), 1800); } } catch (e) { }
  return r;
};
const _blesserVideo = G.blesser;
G.blesser = function () {
  const r = _blesserVideo.apply(this, arguments);
  try { if (r && this.journalCoups && this.journalCoups.length && (typeof Coop === 'undefined' || !Coop.hote || this.p === Coop.hote)) Video.noterCoup(this.journalCoups[this.journalCoups.length - 1]); } catch (e) { }
  return r;
};
const _majVideo = majCombat;
majCombat = function () { const r = _majVideo.apply(this, arguments); try { Video.tic(); } catch (e) { } return r; };

// ---------- le bilan du combat (victoire ou mort) ----------
function efficaciteCombat() {
  try {
    if (!G.def || !G.ars || !(G.chrono > 3) || typeof tempsParfait !== 'function') return null;
    const ref = G.def.hpMax / Math.max(1, tempsParfait(G.def, G.ars)), reel = (G.degatsCombat || 0) / G.chrono;
    return Math.max(0, Math.min(100, Math.round(100 * reel / Math.max(1, ref))));
  } catch (e) { return null; }
}
function bilanCombat(victoire) {
  const j = G.journalCoups || [];
  G.effFin = efficaciteCombat();
  return { victoire, duree: G.chrono || 0, dps: Math.round((G.degatsCombat || 0) / Math.max(1, G.chrono || 1)), eff: G.effFin, recus: j.reduce((a, b) => a + b.dmg, 0), coups: j.length, pire: j.reduce((m, x) => x.dmg > (m ? m.dmg : 0) ? x : m, null) };
}
const nomSourceCoup = s => ATK[s] ? ATK[s].nom : ({ contact: 'Contact du boss', lave: 'Lave', invocation: 'Invocations', pieges: 'Pièges', Pression: 'Pression', Renfort: 'Frappe de renfort', 'Dernier souffle': 'Dernier souffle', Effondrement: 'Effondrement', 'Lave montante': 'Lave montante' }[s] || s);
// un panneau de bilan, dessiné sur l'écran de victoire, de mort et de fin de défi
function dessinerBilan(c, x, y) {
  const S = G.statsFin; if (!S) return;
  c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
  const w = 760, h = 92; c.fillStyle = 'rgba(8,6,16,.78)'; c.fillRect(x - w / 2, y, w, h); c.strokeStyle = 'rgba(255,216,107,.4)'; c.strokeRect(x - w / 2 + .5, y + .5, w - 1, h - 1);
  const cases = [[fmtTemps(S.duree), 'durée'], [S.dps + ' /s', 'dégâts par seconde'], [S.eff === null ? '—' : S.eff + ' %', 'efficacité (100 % = parfait)'], [S.recus, 'dégâts reçus'], [S.coups, 'coups reçus']];
  cases.forEach(([v, l], i) => { const cx = x - w / 2 + w * (i + .5) / cases.length; texteOmbre(c, String(v), cx, y + 30, i === 2 ? (S.eff >= 80 ? '#7dffb0' : S.eff >= 50 ? '#ffe7a6' : '#ffb3c0') : '#fff', `900 22px ${POLICE}`, 4); c.font = `600 12px ${POLICE}`; c.fillStyle = '#b8b0cc'; c.fillText(l, cx, y + 56); });
  if (Video.dispo() || Video.rec) { c.font = `700 14px ${POLICE}`; c.fillStyle = '#ffd8a0'; c.fillText('V (ou Y à la manette) : revoir le combat en vidéo, au ralenti, coup par coup', x, y + 80); }
  c.restore();
}
const _hudBilan = dessinerHUD;
dessinerHUD = function (c) {
  _hudBilan.apply(this, arguments);
  try { if (G.etat === 'interlude' && G.boss && G.boss.mort && G.statsFin && G.statsFin.victoire) dessinerBilan(c, W / 2, H * .64); } catch (e) { }
};
const _mortBilan = dessinerEcranMort;
dessinerEcranMort = function (c) {
  _mortBilan(c);
  try { if (G.statsFin) dessinerBilan(c, W / 2, G.finDefi ? 616 : 652); } catch (e) { }
};

// ---------- le lecteur ----------
function fermerRevoir() { const d = document.getElementById('revoir'); if (d) { const v = d.querySelector('video'); try { v.pause(); } catch (e) { } d.remove(); Input.clear && Input.clear(); } G.revoirOuvert = false; }
function ouvrirRevoir() {
  if (!Video.dispo()) return;
  fermerRevoir(); G.revoirOuvert = true;
  const parts = Video.parts, coups = Video.coups;
  const d = document.createElement('div'); d.id = 'revoir';
  d.innerHTML = `<div class="rv-haut"><b>🎬 ${T2('Revoir le combat')}</b>
      <span class="rv-vit">${[.25, .5, 1].map(v => `<button data-v="${v}" class="${v === .5 ? 'actif' : ''}">×${String(v).replace('.', ',')}</button>`).join('')}</span>
      ${parts.length > 1 ? `<span class="rv-parts">${parts.map((p, i) => `<button data-p="${i}" class="${i === parts.length - 1 ? 'actif' : ''}">${T2('Partie')} ${i + 1}</button>`).join('')}</span>` : ''}
      <button class="rv-fin">⏪ ${T2('La fin au ralenti')}</button><button class="rv-x">✕</button></div>
    <div class="rv-corps"><video playsinline muted controls></video>
      <div class="rv-coups"><b>${T2('Tous les coups reçus')} (${coups.length})</b>${coups.length ? coups.map((x, i) => `<button data-c="${i}"><span>${fmtTemps(x.t)}</span> −${x.dmg} <small>${nomSourceCoup(x.src)}</small></button>`).join('') : `<p class="mini">${T2('Aucun coup reçu : bravo !')}</p>`}</div></div>`;
  document.body.appendChild(d);
  const v = d.querySelector('video'); let part = parts.length - 1, vitesse = .5;
  const charger = (i, ensuite) => {
    part = i; v.src = parts[i].url; v.playbackRate = vitesse;
    d.querySelectorAll('[data-p]').forEach(b => b.classList.toggle('actif', +b.dataset.p === i));
    v.onloadedmetadata = () => {
      // les vidéos du navigateur n'ont parfois pas de durée : on va au bout pour qu'il la calcule, puis on revient
      if (!Number.isFinite(v.duration)) { v.currentTime = 1e9; v.ondurationchange = () => { v.ondurationchange = null; v.currentTime = 0; if (ensuite) ensuite(); else v.play().catch(() => { }); }; }
      else if (ensuite) ensuite(); else v.play().catch(() => { });
    };
  };
  const finRalenti = () => { vitesse = .35; v.playbackRate = .35; v.currentTime = Math.max(0, (v.duration || 0) - 4); v.play().catch(() => { }); };
  d.querySelector('.rv-x').addEventListener('click', fermerRevoir);
  d.querySelector('.rv-fin').addEventListener('click', () => { if (part !== parts.length - 1) charger(parts.length - 1, finRalenti); else finRalenti(); });
  d.querySelectorAll('[data-v]').forEach(b => b.addEventListener('click', () => { vitesse = +b.dataset.v; v.playbackRate = vitesse; d.querySelectorAll('[data-v]').forEach(x => x.classList.toggle('actif', x === b)); }));
  d.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => charger(+b.dataset.p)));
  d.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => {
    const x = coups[+b.dataset.c]; let i = parts.length - 1; while (i > 0 && parts[i].t0 > x.w) i--;
    const aller = () => { v.currentTime = Math.max(0, (x.w - parts[i].t0) / 1000 - 1.5); v.playbackRate = vitesse = .35; v.play().catch(() => { }); };
    d.querySelectorAll('[data-c]').forEach(y => y.classList.toggle('actif', y === b));
    if (i !== part) charger(i, aller); else aller();
  }));
  charger(part, G.etat === 'mort' && !G.statsFin?.victoire ? finRalenti : null);
}
// V ouvre et ferme le lecteur ; pendant qu'il est ouvert, le jeu attend
const _pasRevoir = pasBoucle;
pasBoucle = function (now) {
  const fin = (G.etat === 'mort' && G.ecranMort) || (G.etat === 'interlude' && G.boss && G.boss.mort);
  if (G.revoirOuvert) { if (Input.hit('KeyV') || Input.hit('Escape')) fermerRevoir(); else { rendu(); return; } }
  else if (fin && Input.hit('KeyV')) { ouvrirRevoir(); if (G.revoirOuvert) return; }
  return _pasRevoir(now);
};
const _menuRevoir = UI.menu;
UI.menu = function () { fermerRevoir(); return _menuRevoir.apply(this, arguments); };
const _menusRevoir = Manette.menus.bind(Manette);
Manette.menus = function (g, nouveau, ly, lx) { if ((G.etat === 'mort' && G.ecranMort) || G.etat === 'interlude' || G.revoirOuvert) { if (nouveau(3)) Input.p['KeyV'] = true; } return _menusRevoir(g, nouveau, ly, lx); };

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
