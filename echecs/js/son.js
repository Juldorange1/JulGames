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

  // ---------- sons d'ambiance des décors (synthétisés, en boucle, fondus de 3 s) ----------
  let ambiance = null; // { type, gain, arreter() }
  function bruit(c, secondes, brun) {
    const n = Math.floor(c.sampleRate * secondes), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    let dernier = 0;
    for (let i = 0; i < n; i++) {
      const b = Math.random() * 2 - 1;
      if (brun) { dernier = (dernier + 0.02 * b) / 1.02; d[i] = dernier * 3.5; } else d[i] = b;
    }
    // fondu des bords pour que la boucle ne claque pas
    const f = Math.floor(c.sampleRate * 0.5);
    for (let i = 0; i < f; i++) { const k = i / f; d[i] *= k; d[n - 1 - i] *= k; }
    return buf;
  }
  function source(c, buf) {
    const s = c.createBufferSource(); s.buffer = buf; s.loop = true; return s;
  }
  function lfo(c, freq, ampl, cible) {
    const o = c.createOscillator(); o.frequency.value = freq;
    const g = c.createGain(); g.gain.value = ampl;
    o.connect(g); g.connect(cible); o.start();
    return o;
  }
  // construit une ambiance branchée sur « dest » ; renvoie la liste des choses à arrêter
  function construire(c, type, dest) {
    const arr = [], minuteurs = [];
    const bb = bruit(c, 6, true), bn = bruit(c, 6, false);
    const chaine = (buf, typeF, freq, q, vol) => {
      const s = source(c, buf), f = c.createBiquadFilter(); f.type = typeF; f.frequency.value = freq; if (q) f.Q.value = q;
      const g = c.createGain(); g.gain.value = vol;
      s.connect(f); f.connect(g); g.connect(dest); s.start(c.currentTime + Math.random());
      arr.push(s); return { f, g };
    };
    const ponctuel = (fn, min, max) => {
      const boucle = () => { fn(); minuteurs.push(setTimeout(boucle, min + Math.random() * (max - min))); };
      minuteurs.push(setTimeout(boucle, min + Math.random() * (max - min)));
    };
    const tictac = (freq, duree, fort, q) => {
      const t = c.currentTime, n = Math.floor(c.sampleRate * duree), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 4);
      const s = c.createBufferSource(); s.buffer = buf;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q || 2;
      const g = c.createGain(); g.gain.value = fort;
      s.connect(f); f.connect(g); g.connect(dest); s.start(t);
    };
    const chant = (f0, f1, duree, fort, t) => {
      const o = c.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + duree);
      const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(fort, t + duree * 0.3); g.gain.linearRampToValueAtTime(0, t + duree);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + duree + 0.05);
    };
    if (type === 'vagues') {
      const a = chaine(bb, 'lowpass', 500, 0, 0.55); arr.push(lfo(c, 0.085, 0.45, a.g.gain));
      const b = chaine(bn, 'bandpass', 1400, 0.6, 0.06); arr.push(lfo(c, 0.085, 0.05, b.g.gain));
    } else if (type === 'vent') {
      const a = chaine(bn, 'bandpass', 380, 1.2, 0.22); arr.push(lfo(c, 0.05, 220, a.f.frequency)); arr.push(lfo(c, 0.031, 0.12, a.g.gain));
      chaine(bb, 'lowpass', 220, 0, 0.35);
    } else if (type === 'foret') {
      const a = chaine(bn, 'lowpass', 900, 0, 0.06); arr.push(lfo(c, 0.04, 0.04, a.g.gain));
      ponctuel(() => {
        const t = c.currentTime, f = 2400 + Math.random() * 1600, n = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) chant(f, f * (1.1 + Math.random() * 0.3), 0.11, 0.035, t + i * 0.16);
      }, 2500, 7000);
    } else if (type === 'grillons') {
      chaine(bb, 'lowpass', 300, 0, 0.12);
      ponctuel(() => {
        const t = c.currentTime;
        for (let i = 0; i < 3; i++) { chant(4300, 4250, 0.045, 0.02, t + i * 0.07); }
      }, 700, 1600);
    } else if (type === 'feu') {
      chaine(bb, 'lowpass', 350, 0, 0.5);
      ponctuel(() => tictac(1800 + Math.random() * 2500, 0.02 + Math.random() * 0.03, 0.35 + Math.random() * 0.4, 3), 60, 420);
    } else if (type === 'ordinateur') {
      chaine(bb, 'lowpass', 180, 0, 0.45);
      chaine(bn, 'bandpass', 2200, 4, 0.012);
    }
    return () => { arr.forEach((x) => { try { x.stop(); } catch (e) { /* déjà arrêté */ } }); minuteurs.forEach(clearTimeout); };
  }
  function changerAmbiance(type, volume) {
    const c = contexte();
    if (!c) return;
    const t = c.currentTime, FONDU = 3;
    const cible = Math.max(0, Math.min(1, volume == null ? 0.4 : volume)) * 0.35;
    if (ambiance && ambiance.type === type) {
      ambiance.gain.gain.cancelScheduledValues(t);
      ambiance.gain.gain.setValueAtTime(ambiance.gain.gain.value, t);
      ambiance.gain.gain.linearRampToValueAtTime(cible, t + 0.6);
      return;
    }
    if (ambiance) {
      const vieille = ambiance;
      vieille.gain.gain.cancelScheduledValues(t);
      vieille.gain.gain.setValueAtTime(vieille.gain.gain.value, t);
      vieille.gain.gain.linearRampToValueAtTime(0, t + FONDU);
      setTimeout(() => vieille.arreter(), FONDU * 1000 + 200);
      ambiance = null;
    }
    if (!type) return;
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(cible, t + FONDU);
    g.connect(c.destination);
    ambiance = { type, gain: g, arreter: construire(c, type, g) };
  }

  window.Son = {
    regler(oui) { actif = oui; },
    ambiance: changerAmbiance,
    roque() { if (actif) { toc(900, 0.07, 1.1); setTimeout(() => toc(760, 0.07, 1.0), 110); } },
    // léger souffle quand on change d'écran
    ecran() {
      if (!actif) return;
      const c = contexte(); if (!c) return;
      const t = c.currentTime, n = Math.floor(c.sampleRate * 0.22), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / n);
      const s = c.createBufferSource(); s.buffer = buf;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.5;
      f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(1800, t + 0.22);
      const g = c.createGain(); g.gain.value = 0.18;
      s.connect(f); f.connect(g); g.connect(sortie); s.start(t);
    },
    coup() { if (actif) toc(900, 0.07, 1.2); },
    prise() { if (actif) { toc(650, 0.09, 1.6); setTimeout(() => toc(1100, 0.05, 0.8), 35); } },
    echec() { if (actif) { toc(900, 0.07, 1.1); note(740, 0.25, 0.12); } },
    pose() { if (actif) toc(1200, 0.06, 1.0); },
    // petit « tic » quand on choisit une pièce ou une case
    clic() { if (actif) toc(2200, 0.035, 0.45); },
    debut() { if (actif) { note(392, 0.25, 0.06); setTimeout(() => note(523, 0.35, 0.06), 120); } },
    promotion() { if (actif) [784, 988, 1175].forEach((f, i) => setTimeout(() => note(f, 0.22, 0.05), i * 70)); },
    victoire() { if (actif) [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => note(f, 0.5, 0.06), i * 110)); },
    defaite() { if (actif) { note(392, 0.5, 0.06); setTimeout(() => note(330, 0.7, 0.06), 180); } },
    nulle() { if (actif) { note(440, 0.45, 0.05); setTimeout(() => note(440, 0.45, 0.04), 200); } },
    fin() { if (actif) note(523, 0.6, 0.08); }
  };
})();
