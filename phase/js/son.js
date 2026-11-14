/* Phase — musiques (fichiers CC0, voir music/CREDITS.md) et bruitages (sfx/, CC0), avec fondus. */
(function (racine) {
'use strict';
let ac = null, busSons = null, volSons = 0.6, volMus = 0.35;
const tampons = {};
const NOMS = ['saut', 'rebond', 'mur', 'atterrit', 'change', 'mort', 'casse', 'boum', 'cristal', 'fin', 'eclat', 'drapeau',
  'tp', 'echec', 'fracas', 'ressort', 'fleche', 'bouton', 'porte', 'menu', 'valider'];
const PISTES = { 0: 'menu.mp3', 1: 'zone1.ogg', 2: 'zone2.ogg', 3: 'zone3.mp3', 4: 'zone4.mp3', 5: 'zone5.mp3', 6: 'zone6.ogg',
  7: 'zone7.mp3', 8: 'zone8.ogg', infini: 'infini.ogg', defi: 'defi.mp3', fin: 'fin.mp3' };

function demarrer() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); if (piste && piste.paused && voulu) piste.play().catch(() => {}); return; }
  const A = window.AudioContext || window.webkitAudioContext;
  if (!A) return;
  ac = new A();
  busSons = ac.createGain(); busSons.gain.value = volSons; busSons.connect(ac.destination);
  for (const nom of NOMS) {
    fetch('sfx/' + nom + '.wav').then(r => r.arrayBuffer()).then(b => ac.decodeAudioData(b)).then(t => { tampons[nom] = t; }).catch(() => {});
  }
  if (voulu) jouerMusique(voulu, true);
}
function volumes(s, m) {
  volSons = s; volMus = m;
  if (busSons) busSons.gain.value = s;
  if (piste) piste.volume = Math.min(1, m);
}
function jouer(nom, vol, hauteur) {
  if (!ac || !tampons[nom]) return false;
  const s = ac.createBufferSource(); s.buffer = tampons[nom];
  if (hauteur) s.playbackRate.value = hauteur;
  const g = ac.createGain(); g.gain.value = vol === undefined ? 0.6 : vol;
  s.connect(g); g.connect(busSons); s.start();
  return true;
}
function evenements(ev, phase) {
  if (!ac || !ev) return;
  const EV = racine.Moteur.EV;
  if (ev & EV.MORT) jouer('mort', 0.55);
  if (ev & EV.SAUT) jouer('saut', 0.35);
  if (ev & EV.REBOND) jouer('rebond', 0.5);
  if (ev & EV.MUR) jouer('mur', 0.35);
  if (ev & EV.ATTERRIT) jouer('atterrit', 0.18);
  if (ev & EV.CHANGE) jouer('change', 0.3, [0.8, 1, 1.25, 1.5][phase] || 1);
  if (ev & EV.CASSE) jouer('casse', 0.45);
  if (ev & (EV.RESSORT | EV.BOND)) jouer('ressort', 0.4);
  if (ev & EV.BOUM) jouer('boum', 0.6);
  if (ev & EV.EVAPORE) jouer('change', 0.3, 1.6);
  if (ev & EV.CRISTAL) jouer('cristal', 0.4);
  if (ev & EV.ECLAT) jouer('eclat', 0.5);
  if (ev & EV.DRAPEAU) jouer('drapeau', 0.3);
  if (ev & EV.TP) jouer('tp', 0.4);
  if (ev & EV.FIN) jouer('fin', 0.5);
  if (ev & EV.ECHEC) jouer('echec', 0.3);
  if (ev & EV.FRACAS) jouer('fracas', 0.3);
  if (ev & EV.JET) jouer('mur', 0.3, 1.3);
  if (ev & EV.BOUTON) { jouer('bouton', 0.5); jouer('porte', 0.4); }
  if (ev & EV.CRAQUE) jouer('casse', 0.2, 1.8);
}
function bruitMenu(quoi) { jouer(quoi === 'valider' ? 'valider' : 'menu', 0.3); }

/* ---------- musique : une piste à la fois, en fondu ---------- */
let piste = null, voulu = null, fondu = null;
function jouerMusique(cle, force) {
  if (cle === undefined || cle === null) cle = 0;
  if (cle === voulu && !force && piste) return;
  voulu = cle;
  if (!ac) return;                      // attend un premier geste du joueur
  const fichier = PISTES[cle] || PISTES[0];
  const ancienne = piste;
  const a = new Audio('music/' + fichier);
  a.loop = cle !== 'fin'; a.volume = 0;
  a.play().catch(() => {});
  piste = a;
  clearInterval(fondu);
  let k = 0;
  fondu = setInterval(() => {
    k++;
    a.volume = Math.min(volMus, volMus * k / 20);
    if (ancienne) { ancienne.volume = Math.max(0, ancienne.volume - volMus / 20); if (k >= 20) { ancienne.pause(); } }
    if (k >= 20) clearInterval(fondu);
  }, 40);
}

racine.Son = { demarrer, evenements, volumes, jouerMusique, jouer, bruitMenu };
})(window);
