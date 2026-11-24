/* Petits bruits de pièces, synthétisés (aucun fichier), volume discret. Aucune musique. */
(function () {
  'use strict';
  let ctx = null, sortie = null;
  let actif = true;

  function contexte() {
    if (!ctx) {
      const A = window.AudioContext || window.webkitAudioContext;
      if (!A) return null;
      ctx = new A();
      sortie = ctx.createGain();
      sortie.gain.value = 0.22;
      sortie.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // Petit « toc » de bois : bruit filtré très court.
  function toc(freq, duree, fort) {
    const c = contexte();
    if (!c) return;
    const t = c.currentTime;
    const n = Math.floor(c.sampleRate * duree);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 6);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 3;
    const g = c.createGain(); g.gain.value = fort;
    src.connect(f); f.connect(g); g.connect(sortie);
    src.start(t);
  }
  function note(freq, duree, fort) {
    const c = contexte();
    if (!c) return;
    const t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(fort, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    o.connect(g); g.connect(sortie);
    o.start(t); o.stop(t + duree + 0.05);
  }

  window.Son = {
    regler(oui) { actif = oui; },
    coup() { if (actif) toc(900, 0.07, 1.2); },
    prise() { if (actif) { toc(650, 0.09, 1.6); setTimeout(() => toc(1100, 0.05, 0.8), 35); } },
    echec() { if (actif) { toc(900, 0.07, 1.1); note(740, 0.25, 0.12); } },
    pose() { if (actif) toc(1200, 0.06, 1.0); },
    fin() { if (actif) note(523, 0.6, 0.08); }
  };
})();
