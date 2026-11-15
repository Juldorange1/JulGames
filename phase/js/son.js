/* Phase — musiques (fichiers CC0, voir music/CREDITS.md) et bruitages (sfx/, CC0), avec fondus. */
(function (racine) {
'use strict';
let ac = null, busSons = null, volSons = 0.6, volMus = 0.35;
// tout est volontairement discret : le réglage à fond reste doux
const FACT_SONS = 0.3, FACT_MUS = 0.35;
const tampons = {};
const NOMS = ['saut', 'rebond', 'mur', 'atterrit', 'change', 'mort', 'casse', 'boum', 'cristal', 'fin', 'eclat', 'drapeau',
  'tp', 'echec', 'fracas', 'ressort', 'fleche', 'bouton', 'porte', 'menu', 'valider'];
const PISTES = { 0: 'menu.mp3', 1: 'zone1.ogg', 2: 'zone2.ogg', 3: 'zone3.mp3', 4: 'zone4.mp3', 5: 'zone5.mp3', 6: 'zone6.ogg',
  7: 'zone7.mp3', 8: 'zone8.ogg', infini: 'infini.ogg', defi: 'defi.mp3', fin: 'fin.mp3' };

function demarrer() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const A = window.AudioContext || window.webkitAudioContext;
  if (!A) return;
  ac = new A();
  busSons = ac.createGain(); busSons.gain.value = volSons * FACT_SONS; busSons.connect(ac.destination);
  for (const nom of NOMS) {
    fetch('sfx/' + nom + '.wav').then(r => r.arrayBuffer()).then(b => ac.decodeAudioData(b)).then(t => { tampons[nom] = t; }).catch(() => {});
  }
  if (voulu !== null) { const v = voulu; voulu = null; jouerMusique(v); }
  setInterval(mixer, 33);
}
function volumes(s, m) {
  volSons = s; volMus = m;
  if (busSons) busSons.gain.value = s * FACT_SONS;
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
  if (ev & EV.PIECE) jouer('cristal', 0.35, 1.5);
}
function bruitMenu(quoi) { jouer(quoi === 'valider' ? 'valider' : 'menu', 0.3); }

/* ---------- musique : fondus longs et doux, jamais de coupure ni de redémarrage brusque ----------
   - changer de piste : fondu enchaîné de 3 s (courbes à puissance constante) ;
   - revenir à une piste déjà jouée : elle reprend là où elle en était ;
   - recommencer un niveau ou passer au suivant dans la même zone : la musique continue sans rien changer ;
   - fin d'une piste : elle s'enchaîne sur elle-même par un fondu de 3 s (deux lecteurs en alternance) ;
   - écrans de fin et pause : la musique baisse doucement au lieu de s'arrêter. */
const FONDU = 3;
const lecteurs = {};          // cle -> { a: [Audio, Audio], i: lecteur actif, gain: 0..1, cible: 0..1 }
let voulu = null, baisse = 1, baisseCible = 1;
function lecteur(cle) {
  if (lecteurs[cle]) return lecteurs[cle];
  const f = 'music/' + (PISTES[cle] || PISTES[0]);
  const a = [new Audio(f), new Audio(f)];
  for (const x of a) { x.preload = 'auto'; x.volume = 0; }
  return (lecteurs[cle] = { a, i: 0, gain: 0, cible: 0, trans: null, ancien: null });
}
function jouerMusique(cle) {
  if (cle === undefined || cle === null) cle = 0;
  if (cle === voulu) { attenuer(false); return; }
  voulu = cle;
  attenuer(false);
  if (!ac) return;                      // attend un premier geste du joueur
  for (const k in lecteurs) lecteurs[k].cible = 0;
  const l = lecteur(cle);
  l.cible = 1;
}
function attenuer(oui) { baisseCible = oui ? 0.4 : 1; }
// appelé 30 fois par seconde : rapproche doucement chaque volume de sa cible
function mixer() {
  const pasF = 1 / (FONDU * 30);
  baisse += Math.sign(baisseCible - baisse) * Math.min(Math.abs(baisseCible - baisse), 1 / 45);
  for (const k in lecteurs) {
    const l = lecteurs[k];
    if (l.gain < l.cible) l.gain = Math.min(l.cible, l.gain + pasF);
    else if (l.gain > l.cible) l.gain = Math.max(l.cible, l.gain - pasF);
    const base = Math.max(0, Math.min(1, volMus * FACT_MUS * baisse * Math.sin(l.gain * Math.PI / 2)));
    const x = l.a[l.i];
    if (l.gain <= 0) {                     // silencieuse : en pause, pas remise à zéro (elle reprendra là)
      for (const a of l.a) if (!a.paused) a.pause();
      l.trans = null; continue;
    }
    if (x.paused && l.trans == null) x.play().catch(() => {});
    // fin de piste : l'autre lecteur repart du début et on passe de l'un à l'autre en fondu
    if (l.trans == null && x.duration && x.currentTime > x.duration - FONDU - 0.2) {
      const y = l.a[1 - l.i];
      y.currentTime = 0; y.volume = 0; y.play().catch(() => {});
      l.ancien = x; l.i = 1 - l.i; l.trans = 0;
    }
    if (l.trans != null) {
      l.trans = Math.min(1, l.trans + pasF);
      l.ancien.volume = base * Math.cos(l.trans * Math.PI / 2);
      l.a[l.i].volume = base * Math.sin(l.trans * Math.PI / 2);
      if (l.trans >= 1) { l.ancien.pause(); l.trans = null; }
    } else l.a[l.i].volume = base;
  }
}

racine.Son = { demarrer, evenements, volumes, jouerMusique, attenuer, jouer, bruitMenu };
})(window);
