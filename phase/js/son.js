/* Phase — bruitages et petite musique générés (Web Audio). */
(function (racine) {
'use strict';
let ac = null, maitre = null, busSons = null, busMus = null;
let volSons = 0.6, volMus = 0.35;
let musique = { zone: 0, pas: 0, prochain: 0, actif: false };

function demarrer() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const A = window.AudioContext || window.webkitAudioContext;
  if (!A) return;
  ac = new A();
  maitre = ac.createGain(); maitre.gain.value = 0.8; maitre.connect(ac.destination);
  busSons = ac.createGain(); busSons.gain.value = volSons; busSons.connect(maitre);
  busMus = ac.createGain(); busMus.gain.value = volMus; busMus.connect(maitre);
  setInterval(planifier, 60);
}
function volumes(s, m) {
  volSons = s; volMus = m;
  if (busSons) busSons.gain.value = s;
  if (busMus) busMus.gain.value = m;
}
function bip(type, f0, f1, duree, vol, bus, quand) {
  if (!ac) return;
  const t = quand || ac.currentTime;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + duree);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + duree);
  o.connect(g); g.connect(bus || busSons); o.start(t); o.stop(t + duree + 0.02);
}
let bruitBuf = null;
function bruit(duree, vol, filtre, f1) {
  if (!ac) return;
  if (!bruitBuf) {
    bruitBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = bruitBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = ac.currentTime;
  const s = ac.createBufferSource(); s.buffer = bruitBuf;
  const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(filtre, t);
  if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + duree);
  const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + duree);
  s.connect(f); f.connect(g); g.connect(busSons); s.start(t); s.stop(t + duree);
}
const NOTES_PHASE = [196, 392, 523, 784];
function evenements(ev, phase) {
  if (!ac || !ev) return;
  const EV = racine.Moteur.EV;
  if (ev & EV.MORT) { bruit(0.35, 0.5, 2000, 100); bip('sawtooth', 300, 60, 0.3, 0.15); }
  if (ev & EV.SAUT) bip('square', 330, 620, 0.09, 0.07);
  if (ev & EV.REBOND) { bip('square', 260, 900, 0.16, 0.1); bruit(0.1, 0.2, 3000); }
  if (ev & EV.MUR) bip('square', 420, 700, 0.08, 0.07);
  if (ev & EV.CHANGE) bip('triangle', NOTES_PHASE[phase], NOTES_PHASE[phase] * 1.5, 0.12, 0.14);
  if (ev & EV.CASSE) bruit(0.25, 0.45, 1500, 200);
  if (ev & EV.RESSORT) bip('sine', 200, 900, 0.22, 0.2);
  if (ev & EV.BOUM) { bruit(0.5, 0.7, 900, 60); bip('sine', 120, 40, 0.4, 0.3); }
  if (ev & EV.EVAPORE) bruit(0.3, 0.25, 6000, 2000);
  if (ev & EV.CRISTAL) { bip('sine', 1046, 0, 0.18, 0.12); bip('sine', 1568, 0, 0.25, 0.08, null, ac.currentTime + 0.05); }
  if (ev & EV.ECLAT) [1046, 1318, 1568, 2093].forEach((f, i) => bip('triangle', f, 0, 0.2, 0.1, null, ac.currentTime + i * 0.05));
  if (ev & EV.DRAPEAU) { bip('triangle', 660, 0, 0.12, 0.1); bip('triangle', 990, 0, 0.15, 0.1, null, ac.currentTime + 0.08); }
  if (ev & EV.TP) bip('sine', 1200, 200, 0.18, 0.12);
  if (ev & EV.FIN) [523, 659, 784, 1046].forEach((f, i) => bip('square', f, 0, 0.18, 0.08, null, ac.currentTime + i * 0.07));
  if (ev & EV.ECHEC) bip('square', 110, 90, 0.12, 0.08);
  if (ev & EV.FRACAS) bip('sawtooth', 500, 120, 0.14, 0.08);
  if (ev & EV.CONVERSION) bip('sine', 500, 1200, 0.12, 0.08);
  if (ev & EV.JET) bip('sine', 600, 300, 0.12, 0.1);
  if (ev & EV.NAGE) bruit(0.18, 0.15, 1200, 300);
}

/* ---------- musique : une boucle par zone ---------- */
const GAMMES = [
  [0, 3, 5, 7, 10], [0, 2, 3, 7, 9], [0, 1, 5, 7, 8], [0, 3, 6, 7, 10],
  [0, 2, 5, 7, 9], [0, 3, 5, 6, 10], [0, 2, 4, 7, 9], [0, 1, 4, 6, 8]
];
const TEMPO = [138, 132, 146, 160, 118, 150, 128, 170];
const RACINE = [45, 43, 40, 47, 38, 42, 50, 44];
function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }
function jouerMusique(zone) {
  musique.zone = zone; musique.actif = zone > 0;
  if (ac) musique.prochain = ac.currentTime + 0.1;
  musique.pas = 0;
}
function planifier() {
  if (!ac || !musique.actif || volMus <= 0.001) return;
  const z = musique.zone - 1, dt = 60 / TEMPO[z] / 4;
  while (musique.prochain < ac.currentTime + 0.25) {
    const p = musique.pas, t = musique.prochain, gm = GAMMES[z], r = RACINE[z];
    const mesure = Math.floor(p / 16) % 4, deg = [0, 3, 4, 2][mesure];
    if (p % 4 === 0) bip('sine', 110, 40, 0.18, 0.5, busMus, t);                 // grosse caisse
    if (p % 8 === 4) { bip('triangle', 220, 120, 0.08, 0.12, busMus, t); }
    if (p % 2 === 1) bip('square', 6000, 5000, 0.02, 0.015, busMus, t);           // charleston
    if (p % 4 === 0 || p % 16 === 10) bip('sawtooth', midi(r + gm[deg]), 0, dt * 2.5, 0.07, busMus, t);
    const motif = [0, 2, 4, 2, 1, 3, 4, 3];
    if (p % 2 === 0) {
      const k = (motif[(p / 2) % 8] + deg) % gm.length, oct = 24 + (k + deg >= gm.length ? 12 : 0);
      bip('triangle', midi(r + oct + gm[k]), 0, dt * 1.6, 0.045, busMus, t);
    }
    musique.pas++; musique.prochain += dt;
  }
}

racine.Son = { demarrer, evenements, volumes, jouerMusique, bip };
})(window);
