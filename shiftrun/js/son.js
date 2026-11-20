/* Phase — musiques (fichiers CC0, voir music/CREDITS.md) et bruitages (sfx/, CC0), avec fondus. */
(function (racine) {
'use strict';
let ac = null, busSons = null, volSons = 0.6, volMus = 0.35;
// tout est volontairement discret : le réglage à fond reste doux
const FACT_SONS = 0.06, FACT_MUS = 0.1;
const tampons = {};
const NOMS = ['saut', 'rebond', 'mur', 'atterrit', 'change', 'mort', 'casse', 'boum', 'cristal', 'fin', 'eclat', 'drapeau',
  'tp', 'echec', 'fracas', 'ressort', 'fleche', 'bouton', 'porte', 'menu', 'valider'];
const PISTES = { 0: 'menu.mp3', 1: 'zone1.ogg', 2: 'zone2.ogg', 3: 'zone3.mp3', 4: 'zone4.mp3', 5: 'zone5.mp3', 6: 'zone6.ogg',
  7: 'zone7.mp3', 8: 'zone8.ogg', infini: 'infini.ogg', defi: 'defi.mp3', fin: 'fin.mp3' };
// chaque niveau a sa propre musique (clé « n1 » à « n54 », voir music/CREDITS.md)
const NIVEAUX_MUS = ['n01.ogg', 'n02.ogg', 'n03.mp3', 'n04.mp3', 'n05.mp3', 'n06.mp3', 'n07.ogg', 'n08.ogg', 'n09.ogg', 'n10.ogg', 'n11.ogg', 'n12.ogg', 'n13.ogg', 'n14.ogg', 'n15.ogg', 'n16.mp3', 'n17.mp3', 'n18.ogg', 'n19.ogg', 'n20.ogg', 'n21.ogg', 'n22.ogg', 'n23.mp3', 'n24.ogg', 'n25.mp3', 'n26.mp3', 'n27.ogg', 'n28.ogg', 'n29.ogg', 'n30.ogg', 'n31.mp3', 'n32.ogg', 'n33.ogg', 'n34.mp3', 'n35.mp3', 'n36.ogg', 'n37.mp3', 'n38.ogg', 'n39.mp3', 'n40.mp3', 'n41.ogg', 'n42.ogg', 'n43.mp3', 'n44.ogg', 'n45.ogg', 'n46.ogg', 'n47.ogg', 'n48.ogg', 'n49.mp3', 'n50.mp3', 'n51.ogg', 'n52.ogg', 'n53.mp3', 'n54.mp3'];
NIVEAUX_MUS.forEach((f, i) => { PISTES['n' + (i + 1)] = 'niveaux/' + f; });

function demarrer() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const A = window.AudioContext || window.webkitAudioContext;
  if (!A) return;
  ac = new A();
  // bus des bruitages : filtre passe-bas (rien d'aigu ni de criard) et compresseur doux (aucun pic)
  busSons = ac.createGain(); busSons.gain.value = volSons * FACT_SONS;
  const doux = ac.createBiquadFilter(); doux.type = 'lowpass'; doux.frequency.value = 3800; doux.Q.value = 0.5;
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -24; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
  busSons.connect(doux); doux.connect(comp); comp.connect(ac.destination);

  // bruitages : fichiers CC0 (packs Kenney) ; tant qu'un fichier n'est pas chargé, le son fabriqué le remplace
  for (const nom of NOMS.concat(['capa'])) fetch('sfx/' + nom + '.ogg').then(r => r.ok ? r.arrayBuffer() : null).then(b => b && ac.decodeAudioData(b)).then(t => { if (t) tampons[nom] = t; }).catch(() => {});
  if (voulu !== null) { const v = voulu; voulu = null; jouerMusique(v); }
  setInterval(mixer, 33);
}
function volumes(s, m) {
  volSons = s; volMus = m;
  if (busSons) busSons.gain.value = s * FACT_SONS;
}
const DUREE_MAX = { mort: 0.6, boum: 0.6, casse: 0.45, fracas: 0.45, echec: 0.4, porte: 0.5, fin: 1.4, eclat: 1.0, capa: 0.34, tp: 0.6, change: 0.14 };
const derniers = {};
// Bruitages originaux, fabriqués par le jeu (oscillateurs + bruit filtré, enveloppes douces) : aucun fichier extérieur
let bruitBuf = null;
function synth(nom, vol, h) {
  if (!ac) return false;
  const t = ac.currentTime; h = h || 1; vol = vol === undefined ? 0.5 : vol;
  if (!bruitBuf) { bruitBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = bruitBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const env = (g, a, d, v) => { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };
  const ton = (type, f0, f1, a, d, v, delai) => {
    const o = ac.createOscillator(), g = ac.createGain(), t0 = t + (delai || 0);
    o.type = type; o.frequency.setValueAtTime(f0 * h, t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1 * h, t0 + a + d);
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(v * vol, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    o.connect(g); g.connect(busSons); o.start(t0); o.stop(t0 + a + d + 0.05);
  };
  const souffle = (fType, f0, f1, a, d, v, q) => {
    const b = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    b.buffer = bruitBuf; f.type = fType; f.Q.value = q || 1; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + a + d);
    env(g, a, d, v * vol); b.connect(f); f.connect(g); g.connect(busSons); b.start(t, Math.random() * 0.5); b.stop(t + a + d + 0.05);
  };
  switch (nom) {
    case 'saut': ton('triangle', 330, 620, 0.005, 0.09, 0.7); souffle('bandpass', 900, 2200, 0.005, 0.06, 0.25, 2); break;
    case 'mur': ton('triangle', 300, 520, 0.005, 0.08, 0.6); souffle('highpass', 1800, 0, 0.002, 0.05, 0.3); break;
    case 'rebond': ton('sine', 220, 660, 0.005, 0.14, 0.7); break;
    case 'atterrit': souffle('lowpass', 500, 200, 0.002, 0.07, 0.6); break;
    case 'mort': ton('triangle', 440, 110, 0.01, 0.35, 0.6); souffle('lowpass', 1200, 200, 0.01, 0.3, 0.4); break;
    case 'casse': souffle('bandpass', 1400, 400, 0.002, 0.18, 0.8, 0.8); ton('square', 140, 70, 0.002, 0.1, 0.25); break;
    case 'boum': ton('sine', 120, 40, 0.005, 0.35, 0.9); souffle('lowpass', 900, 120, 0.005, 0.4, 0.6); break;
    case 'cristal': [0, 0.06].forEach((dl, k) => ton('sine', [1320, 1760][k], 0, 0.003, 0.35, 0.45, dl)); break;
    case 'eclat': [0, 0.07, 0.14, 0.21].forEach((dl, k) => ton('sine', [880, 1109, 1319, 1760][k], 0, 0.004, 0.4, 0.4, dl)); break;
    case 'drapeau': ton('triangle', 660, 0, 0.005, 0.2, 0.45); ton('triangle', 990, 0, 0.005, 0.3, 0.4, 0.09); break;
    case 'fin': [0, 0.1, 0.2, 0.32].forEach((dl, k) => ton('triangle', [523, 659, 784, 1047][k], 0, 0.01, 0.5, 0.45, dl)); break;
    case 'tp': ton('sine', 300, 1400, 0.01, 0.2, 0.4); souffle('bandpass', 600, 3000, 0.01, 0.2, 0.25, 3); break;
    case 'echec': ton('square', 150, 120, 0.005, 0.1, 0.18); break;
    case 'fracas': ton('sine', 90, 45, 0.002, 0.2, 0.9); souffle('lowpass', 600, 150, 0.002, 0.18, 0.5); break;
    case 'ressort': ton('triangle', 180, 900, 0.005, 0.22, 0.6); ton('sine', 360, 1200, 0.005, 0.18, 0.25); break;
    case 'bouton': ton('square', 700, 500, 0.002, 0.05, 0.25); break;
    case 'porte': souffle('lowpass', 300, 120, 0.02, 0.35, 0.5); break;
    case 'menu': ton('sine', 880, 0, 0.002, 0.05, 0.25); break;
    case 'valider': ton('sine', 660, 0, 0.003, 0.08, 0.35); ton('sine', 990, 0, 0.003, 0.12, 0.3, 0.05); break;
    case 'capa': ton('sine', 520, 1040, 0.005, 0.12, 0.45); ton('triangle', 780, 1560, 0.005, 0.1, 0.25, 0.03); break;
    default: return false;
  }
  return true;
}
function jouer(nom, vol, hauteur) {
  if (!ac) return false;
  if (!tampons[nom]) return synth(nom, vol, hauteur);             // fichier pas encore chargé : son de secours
  const t = ac.currentTime;
  if (derniers[nom] && t - derniers[nom] < 0.05) return false;   // pas de doublons qui claquent
  derniers[nom] = t;
  const s = ac.createBufferSource(); s.buffer = tampons[nom];
  if (hauteur) s.playbackRate.value = hauteur;
  const g = ac.createGain(), v = vol === undefined ? 0.5 : vol;
  // enveloppe : petite attaque douce, et les sons longs s'éteignent en fondu
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.008);
  const d = Math.min(DUREE_MAX[nom] || 0.6, s.buffer.duration / (hauteur || 1));
  g.gain.setValueAtTime(v, t + d * 0.55); g.gain.linearRampToValueAtTime(0.0001, t + d);
  s.connect(g); g.connect(busSons); s.start(t); s.stop(t + d + 0.02);
  return true;
}
// changement d'état : un petit « bloup » court et rond, plus aigu selon l'état
const NOTES = [392, 523, 659, 784, 880, 587, 330, 466];
function bloup(phase) {
  if (!ac) return;
  if (tampons.change) { jouer('change', 0.38, 0.92 + ((NOTES[phase] || 523) - 330) / 2200); return; }   // à peine plus aigu selon l'état
  const t = ac.currentTime, f = NOTES[phase] || 523;
  if (derniers.bloup && t - derniers.bloup < 0.04) return;
  derniers.bloup = t;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(f * 0.8, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.04);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.22, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  o.connect(g); g.connect(busSons); o.start(t); o.stop(t + 0.1);
}
function evenements(ev, phase) {
  if (!ac || !ev) return;
  const EV = racine.Moteur.EV;
  if (ev & EV.MORT) jouer('mort', 0.3, 0.9);
  if (ev & EV.SAUT) jouer('saut', 0.3);
  if (ev & EV.REBOND) jouer('rebond', 0.35);
  if (ev & EV.MUR) jouer('mur', 0.35);
  if (ev & EV.ATTERRIT) jouer('atterrit', 0.18);
  if (ev & EV.CHANGE) bloup(phase);
  if (ev & EV.CASSE) jouer('casse', 0.3);
  if (ev & (EV.RESSORT | EV.BOND)) jouer('ressort', 0.4);
  if (ev & EV.BOUM) jouer('boum', 0.35);
  if (ev & EV.EVAPORE) bloup(0);
  if (ev & EV.CRISTAL) jouer('cristal', 0.4);
  if (ev & EV.ECLAT) jouer('eclat', 0.4);
  if (ev & EV.DRAPEAU) jouer('drapeau', 0.3);
  if (ev & EV.TP) jouer('tp', 0.4);
  if (ev & EV.FIN) jouer('fin', 0.35);
  if (ev & EV.ECHEC) jouer('echec', 0.3);
  if (ev & EV.FRACAS) jouer('fracas', 0.3);
  if (ev & EV.JET) jouer('mur', 0.3, 1.3);
  if (ev & EV.BOUTON) { jouer('bouton', 0.35); jouer('porte', 0.25); }
  if (ev & EV.CRAQUE) jouer('casse', 0.2, 1.8);
  if (ev & EV.PIECE) jouer('cristal', 0.35, 1.5);
  if (ev & EV.ORBE) jouer('saut', 0.4, 1.4);
  if (ev & EV.BASCULE) jouer('bouton', 0.4, 1.2);
  if (ev & EV.BANNI) jouer('echec', 0.35, 0.8);
  if (ev & EV.BONUS) jouer('ressort', 0.35, 1.3);
  if (ev & EV.CAPA) jouer('capa', 0.4, [1, 1.1, 0.9, 1.25, 1.2, 1, 0.8, 0.9, 1.3, 0.75][phase] || 1);
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
// chaque ambiance a une liste de morceaux : le fichier, puis des morceaux composés par le jeu (js/compositeur.js)
function liste(cle) {
  const f = 'music/' + (PISTES[cle] || PISTES[0]);
  const k = typeof cle === 'number' ? cle : ({ infini: 20, defi: 30, fin: 40 })[cle] || 50;
  if (cle === 'fin' || /^n\d+$/.test(cle)) return [f];          // la musique d'un niveau s'enchaîne sur elle-même
  if (cle === 0) return [f, { g: 900, h: 'calme' }, { g: 901, h: 'calme' }];
  const n = cle === 'infini' ? 5 : 3;
  const l = [f];
  for (let i = 1; i <= n; i++) l.push({ g: k * 17 + i * 101, h: 'vif' });
  return l;
}
const composees = {};
function url(item) {               // promesse de l'adresse d'un morceau
  if (typeof item === 'string') return Promise.resolve(item);
  const c = item.g + item.h;
  if (!composees[c]) composees[c] = racine.Compositeur ? racine.Compositeur.composer(item.g, item.h, item.h === 'calme' ? 24 : 40).catch(() => null) : Promise.resolve(null);
  return composees[c];
}
function lecteur(cle) {
  if (lecteurs[cle]) return lecteurs[cle];
  const l = liste(cle);
  const a = [new Audio(l[0]), new Audio(l[0])];
  for (const x of a) { x.preload = 'auto'; x.volume = 0; }
  for (const x of a) { try { x.preservesPitch = true; x.playbackRate = tempos[cle] || 1; } catch (e) { /* */ } }
  const lec = { a, i: 0, gain: 0, cible: 0, trans: null, ancien: null, liste: l, piste: 0, suivante: null };
  preparerSuivante(lec);
  return (lecteurs[cle] = lec);
}
// on compose à l'avance le morceau suivant de la liste
function preparerSuivante(lec) {
  const k = (lec.piste + 1) % lec.liste.length;
  lec.suivante = null;
  setTimeout(() => url(lec.liste[k]).then(u => { if (u) lec.suivante = { k, u }; }), 8000);   // un peu plus tard : pas d'à-coup au début d'un niveau
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
let baisseMenu = 1, baisseFenetre = 1;
function attenuer(oui) { baisseMenu = oui ? 0.25 : 1; baisseCible = Math.min(baisseMenu, baisseFenetre); }
// la fenêtre du jeu n'est plus au premier plan (autre fenêtre, autre onglet) : le son baisse beaucoup
function fenetre(active) { baisseFenetre = active ? 1 : 0.12; baisseCible = Math.min(baisseMenu, baisseFenetre); }
if (typeof addEventListener === 'function' && typeof document !== 'undefined') {
  addEventListener('blur', () => fenetre(false)); addEventListener('focus', () => fenetre(true));
  document.addEventListener('visibilitychange', () => fenetre(!document.hidden));
}
// fin de niveau proche : la musique accélère un peu et monte doucement (0 = normal, 1 = tout près de l'arrivée)
let intens = 0;
// tempo propre à chaque musique de niveau (plus rapide pour les niveaux courts et durs), sans changer la hauteur des notes
const tempos = {};
function tempoMusique(cle, v) { tempos[cle] = v; intensite(intens); }
function intensite(k) { intens = Math.max(0, Math.min(1, k || 0)); for (const c in lecteurs) for (const au of lecteurs[c].a) { try { au.preservesPitch = true; au.playbackRate = (tempos[c] || 1) + intens * 0.06; } catch (e) { /* lecteur sans vitesse */ } } }
// appelé 30 fois par seconde : rapproche doucement chaque volume de sa cible
function mixer() {
  const pasF = 1 / (FONDU * 30);
  baisse += Math.sign(baisseCible - baisse) * Math.min(Math.abs(baisseCible - baisse), 1 / 45);
  for (const k in lecteurs) {
    const l = lecteurs[k];
    if (l.gain < l.cible) l.gain = Math.min(l.cible, l.gain + pasF);
    else if (l.gain > l.cible) l.gain = Math.max(l.cible, l.gain - pasF);
    const base = Math.max(0, Math.min(1, volMus * FACT_MUS * baisse * (1 + intens * 0.15) * Math.sin(l.gain * Math.PI / 2)));
    const x = l.a[l.i];
    if (l.gain <= 0) {                     // silencieuse : en pause, pas remise à zéro (elle reprendra là)
      for (const a of l.a) if (!a.paused) a.pause();
      l.trans = null; continue;
    }
    if (x.paused && l.trans == null) x.play().catch(() => {});
    // fin de piste : l'autre lecteur repart du début et on passe de l'un à l'autre en fondu
    if (l.trans == null && x.duration && x.currentTime > x.duration - FONDU - 0.2) {
      const y = l.a[1 - l.i];
      if (l.suivante) {                          // morceau suivant de la liste (sinon le même recommence)
        if (!y.src.endsWith(l.suivante.u)) y.src = l.suivante.u;
        l.piste = l.suivante.k; preparerSuivante(l);
      } else if (y.src !== x.src) y.src = x.src;
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

racine.Son = { tempoMusique, intensite, demarrer, evenements, volumes, jouerMusique, attenuer, fenetre, jouer, bruitMenu };
})(window);
