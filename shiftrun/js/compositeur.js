/* Phase — compositeur : fabrique des musiques originales (chiptune) à partir d'une graine, sans aucun fichier.
   Chaque morceau : tonalité, mode, tempo, suite d'accords, basse, arpèges, mélodie à motif répété, batterie douce.
   Rendu hors ligne (OfflineAudioContext) puis converti en WAV, joué ensuite comme les autres pistes. */
(function (racine) {
'use strict';
function hasard(graine) {
  let a = graine >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const MODES = { mineur: [0, 2, 3, 5, 7, 8, 10], dorien: [0, 2, 3, 5, 7, 9, 10], majeur: [0, 2, 4, 5, 7, 9, 11], mixo: [0, 2, 4, 5, 7, 9, 10] };
const SUITES = [[0, 5, 3, 4], [0, 3, 4, 4], [0, 6, 5, 4], [0, 4, 5, 3], [0, 2, 3, 4], [5, 3, 0, 4], [0, 5, 6, 4], [0, 3, 6, 4]];
const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);

// plan d'un morceau à partir de sa graine
function plan(graine, humeur) {
  const r = hasard(graine * 7919 + 13);
  const modes = humeur === 'calme' ? ['majeur', 'dorien'] : ['mineur', 'mineur', 'dorien', 'mineur', 'mixo'];      // plus sombre, plus tendu
  const mode = modes[Math.floor(r() * modes.length)];
  const gamme = MODES[mode];
  const tonique = 45 + Math.floor(r() * 10);
  const tempo = humeur === 'calme' ? 92 + Math.floor(r() * 20) : 150 + Math.floor(r() * 26);
  const suiteA = SUITES[Math.floor(r() * SUITES.length)], suiteB = SUITES[Math.floor(r() * SUITES.length)];
  const note = (deg, oct) => tonique + 12 * (oct + Math.floor(deg / 7)) + gamme[((deg % 7) + 7) % 7];
  // motif mélodique de 2 mesures (16 croches), repris et varié
  const motif = [];
  let d = 4 + Math.floor(r() * 3);
  for (let i = 0; i < 16; i++) {
    if (r() < (i % 4 === 0 ? 0.15 : 0.35)) { motif.push(null); continue; }
    d += [-2, -1, -1, 0, 1, 1, 2, 3][Math.floor(r() * 8)];
    d = Math.max(0, Math.min(11, d));
    motif.push(d);
  }
  const arpForme = [[0, 2, 4, 2], [0, 4, 2, 4], [0, 2, 4, 7], [4, 2, 0, 2]][Math.floor(r() * 4)];
  const batterie = humeur === 'calme' ? 0 : 2;
  return { r, gamme, tonique, tempo, suiteA, suiteB, note, motif, arpForme, batterie, ondeLead: r() < 0.5 ? 'square' : 'triangle', ondeArp: r() < 0.6 ? 'square' : 'sawtooth' };
}

// rendu : renvoie une promesse d'URL (blob WAV)
function composer(graine, humeur, mesures) {
  const p = plan(graine, humeur);
  mesures = mesures || 32;
  const croche = 60 / p.tempo / 2, mesure = croche * 8, duree = mesures * mesure + 1.5;
  const SR = 22050;
  const O = racine.OfflineAudioContext || racine.webkitOfflineAudioContext;
  if (!O) return Promise.reject(new Error('pas d’audio hors ligne'));
  const ac = new O(1, Math.ceil(duree * SR), SR);
  const maitre = ac.createGain(); maitre.gain.value = 0.55;
  const filtre = ac.createBiquadFilter(); filtre.type = 'lowpass'; filtre.frequency.value = 5200;
  maitre.connect(filtre); filtre.connect(ac.destination);
  const bruit = ac.createBuffer(1, SR, SR); { const d = bruit.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }

  const ton = (t, f, dur, onde, vol, coupe) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = onde; o.frequency.value = f;
    let sortie = g;
    if (coupe) { const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = coupe; g.connect(lp); sortie = lp; }
    o.connect(g); sortie.connect(maitre);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.setValueAtTime(vol, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    o.start(t); o.stop(t + dur + 0.02);
  };
  const frappe = (t, type) => {
    if (type === 'k') {                       // grosse caisse : sinus qui descend
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      o.connect(g); g.connect(maitre); o.start(t); o.stop(t + 0.2);
      return;
    }
    const s = ac.createBufferSource(); s.buffer = bruit;
    const f = ac.createBiquadFilter(), g = ac.createGain();
    f.type = type === 's' ? 'bandpass' : 'highpass'; f.frequency.value = type === 's' ? 1800 : 7000;
    const v = type === 's' ? 0.22 : 0.06, d = type === 's' ? 0.12 : 0.04;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    s.connect(f); f.connect(g); g.connect(maitre); s.start(t, Math.random() * 0.5); s.stop(t + d + 0.02);
  };

  for (let m = 0; m < mesures; m++) {
    const partie = Math.floor(m / 8) % 4;                  // A A B A
    const suite = partie === 2 ? p.suiteB : p.suiteA;
    const acc = suite[m % 4], t0 = 0.05 + m * mesure;
    const intro = m < 2, calme = partie === 2 && m % 8 < 2;
    // basse : en mode intense, octaves pulsées en dents de scie filtrées (ça pousse)
    for (let k = 0; k < 8; k++) {
      if (p.batterie === 0 && k % 2) continue;
      const f = freq(p.note(acc, -1) + (p.batterie && k % 2 ? 12 : 0) + (k === 6 && p.r() < 0.3 ? 7 : 0));
      ton(t0 + k * croche, f, croche * 0.8, p.batterie ? 'sawtooth' : 'triangle', p.batterie ? 0.2 : 0.32, p.batterie ? 700 + 500 * ((m % 8) / 8) : 900);
    }
    // arpèges (doubles croches en mode intense)
    const sub = p.batterie ? 2 : 1;
    if (!intro) for (let k = 0; k < 8 * sub; k++) {
      const deg = acc + p.arpForme[k % 4] + (k % 8 >= 4 && sub > 1 ? 7 : 0);
      ton(t0 + k * croche / sub, freq(p.note(deg, 1)), croche / sub * 0.7, p.ondeArp, 0.04, 2200 + 1200 * ((m % 8) / 8));
    }
    // mélodie (pas pendant l'intro ni le début du pont)
    if (!intro && !calme) {
      const varie = partie === 3 ? 2 : 0;
      for (let k = 0; k < 8; k++) {
        const d = p.motif[(m % 2) * 8 + k];
        if (d == null) continue;
        let long = 1;
        while (k + long < 8 && p.motif[(m % 2) * 8 + k + long] == null && long < 3) long++;
        ton(t0 + k * croche, freq(p.note(d + varie + (partie === 2 ? 2 : 0), 1)), croche * long * 0.95, p.ondeLead, 0.085, 3200);
      }
    }
    // batterie
    if (p.batterie && !intro) for (let k = 0; k < 8; k++) {
      if (k % 4 === 0) frappe(t0 + k * croche, 'k');
      if (k % 4 === 2) frappe(t0 + k * croche, 's');
      if (p.batterie > 1 || k % 2 === 0) { frappe(t0 + k * croche, 'h'); if (p.batterie > 1) frappe(t0 + (k + 0.5) * croche, 'h'); }
      if (p.batterie > 1 && k % 2 === 0 && k % 4 !== 0) frappe(t0 + k * croche, 'k');      // grosse caisse sur chaque temps
      if (p.batterie > 1 && m % 8 === 7 && k >= 4) frappe(t0 + (k + 0.5) * croche, 's');   // roulement avant chaque reprise
    }
  }
  return ac.startRendering().then(buf => URL.createObjectURL(new Blob([wav(buf)], { type: 'audio/wav' })));
}
function wav(buf) {
  const d = buf.getChannelData(0), n = d.length, ab = new ArrayBuffer(44 + n * 2), v = new DataView(ab);
  const ecrire = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  ecrire(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); ecrire(8, 'WAVE'); ecrire(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, buf.sampleRate, true);
  v.setUint32(28, buf.sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); ecrire(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) { const x = Math.max(-1, Math.min(1, d[i])); v.setInt16(44 + i * 2, x * 32767, true); }
  return ab;
}
racine.Compositeur = { composer, plan };
})(window);
