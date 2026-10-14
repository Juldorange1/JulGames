'use strict';
/* =========================================================
   TRIADE — sons (synthèse WebAudio avec réverbération) et musiques (fichiers)
   ========================================================= */
const Sfx = (() => {
  let ctx = null, master = null, dry = null, wet = null, comp = null;
  const store = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  let muted = store('binome_muet') === '1';
  let vol = parseFloat(store('binome_vol_sfx')); if (!(vol >= 0)) vol = 0.7;
  const simOn = () => typeof SIM !== 'undefined' && SIM;
  function ensure() {
    if (!ctx) {
      const A = window.AudioContext || window.webkitAudioContext; if (!A) return null;
      ctx = new A();
      comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.connect(ctx.destination);
      master = ctx.createGain(); master.gain.value = 0.5 * vol; master.connect(comp);
      dry = ctx.createGain(); dry.gain.value = 1; dry.connect(master);
      // réverbération : réponse impulsionnelle générée
      const len = ctx.sampleRate * 1.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
      const conv = ctx.createConvolver(); conv.buffer = ir;
      wet = ctx.createGain(); wet.gain.value = 0.22; wet.connect(conv); conv.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function ac() { if (muted || simOn()) return null; return ensure(); }
  let mbus = null;
  function musicBus() {
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return null;
    const c = ensure(); if (!c) return null;
    if (!mbus) { mbus = c.createGain(); mbus.gain.value = 1; mbus.connect(comp); }
    return { ctx: c, bus: mbus };
  }
  const out = (node, rev) => { node.connect(dry); if (rev) { const g = ctx.createGain(); g.gain.value = rev; node.connect(g); g.connect(wet); } };
  function tone(f, dur, type, v, slide, delay, rev, filt) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f * (0.97 + Math.random() * 0.06), t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(25, f * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v || 0.3, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let last = g; o.connect(g);
    if (filt) { const f2 = c.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = filt; g.connect(f2); last = f2; }
    out(last, rev); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, v, freq, q, delay, rev, type, sweep) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + (delay || 0);
    const len = Math.max(1, Math.floor(c.sampleRate * dur)), b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.6);
    const s = c.createBufferSource(); s.buffer = b;
    const f = c.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.setValueAtTime(freq || 1200, t); f.Q.value = q || 0.8;
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * sweep), t + dur);
    const g = c.createGain(); g.gain.value = v || 0.3;
    s.connect(f); f.connect(g); out(g, rev); s.start(t);
  }
  /* ---------- mélodie de secours, générée en direct (si le fichier n'est pas prêt) ---------- */
  const SONGS = {
    explore: { bpm: 76, chords: [[57, 60, 64], [52, 55, 59], [53, 57, 60], [48, 52, 55]], lead: 'sine', drums: false, pad: true },
    combat:  { bpm: 126, chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], lead: 'triangle', drums: true },
    boss:    { bpm: 146, chords: [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]], lead: 'square', drums: true, hard: true },
  };
  const LEAD = [
    [0, -1, -1, 2, -1, -1, 1, -1, 2, -1, 4, -1, 3, -1, 1, -1],
    [4, -1, 3, -1, 2, -1, -1, 1, 0, -1, -1, -1, 2, -1, 1, -1],
    [0, -1, 2, -1, 4, -1, 5, -1, 4, -1, 2, -1, 3, -1, -1, -1],
    [5, -1, 4, -1, 3, -1, 2, -1, 1, -1, 2, -1, 0, -1, -1, -1],
  ];
  let seq = null;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function mnote(c, bus, m, t, dur, type, v, cutoff) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(mtof(m), t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    if (cutoff) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; g.connect(f); f.connect(bus); } else g.connect(bus);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function mdrum(c, bus, kind, t) {
    if (kind === 'kick') { const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.25); return; }
    const len = Math.floor(c.sampleRate * (kind === 'hat' ? 0.04 : 0.14)), b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource(); s.buffer = b; const f = c.createBiquadFilter();
    f.type = kind === 'hat' ? 'highpass' : 'bandpass'; f.frequency.value = kind === 'hat' ? 7000 : 1800;
    const g = c.createGain(); g.gain.value = kind === 'hat' ? 0.06 : 0.22; s.connect(f); f.connect(g); g.connect(bus); s.start(t);
  }
  function synthStep(c, song, bus, step, t, sd) {
    const bar = Math.floor(step / 16) % 4, s = step % 16, ch = song.chords[bar];
    const tones = [ch[0], ch[1], ch[2], ch[0] + 12, ch[1] + 12, ch[2] + 12];
    if (song.pad && s === 0) for (const m of ch) mnote(c, bus, m, t, sd * 16, 'sine', 0.05, 1200);
    if (s % 4 === 0 || (song.hard && s % 2 === 0)) mnote(c, bus, ch[0] - 12, t, sd * (song.hard ? 1.8 : 3.5), 'sawtooth', 0.16, 700);
    if (!song.pad && s % 2 === 0) mnote(c, bus, tones[(s / 2) % 3] + 12, t, sd * 1.6, 'triangle', 0.05, 3000);
    const li = LEAD[(Math.floor(step / 64) + bar) % 4][s];
    if (li >= 0) mnote(c, bus, tones[li] + 12, t, sd * (song.pad ? 6 : 2.6), song.lead, song.pad ? 0.06 : 0.07, song.hard ? 2600 : 4000);
    if (song.drums) { if (s % 8 === 0 || (song.hard && s === 10)) mdrum(c, bus, 'kick', t); if (s === 4 || s === 12) mdrum(c, bus, 'snare', t); if (s % 2 === 1) mdrum(c, bus, 'hat', t); }
  }
  function synthStop() {
    if (!seq) return;
    const s = seq; seq = null; clearInterval(s.timer);
    try { s.bus.gain.setTargetAtTime(0, ctx.currentTime, 0.9); setTimeout(() => { try { s.bus.disconnect(); } catch (e) { } }, 5000); } catch (e) { }
  }
  function synthPlay(mood, v) {
    if (seq && seq.mood === mood) { seq.bus.gain.setTargetAtTime(v * 0.3, ctx.currentTime, 0.5); return; }
    synthStop();
    const c = ac(); if (!c) return;
    const song = SONGS[mood] || SONGS.combat, sd = 60 / song.bpm / 4;
    const bus = c.createGain(); bus.gain.value = 0.0001; bus.connect(comp);
    const send = c.createGain(); send.gain.value = 0.25; bus.connect(send); send.connect(wet);
    bus.gain.setTargetAtTime(v * 0.3, c.currentTime, 1.2);
    let step = 0, next = c.currentTime + 0.1;
    const timer = setInterval(() => { while (next < c.currentTime + 0.3) { synthStep(c, song, bus, step, next, sd); next += sd; step++; } }, 60);
    seq = { mood, bus, timer };
  }

  return {
    synthPlay, synthStop, musicBus,
    synthVolume(v) { if (seq && ctx) seq.bus.gain.setTargetAtTime(v * 0.3, ctx.currentTime, 0.2); },
    get synthOn() { return !!seq; },
    get muted() { return muted; },
    get volume() { return vol; },
    setVolume(v) { vol = v; try { localStorage.setItem('binome_vol_sfx', String(v)); } catch (e) { } if (master) master.gain.value = 0.5 * vol; },
    setMuted(v) { muted = v; try { localStorage.setItem('binome_muet', v ? '1' : '0'); } catch (e) { } if (v && ctx) ctx.suspend(); Music.refresh(); },
    unlock() { ac(); },
    click() { tone(880, 0.04, 'triangle', 0.1); tone(1320, 0.03, 'sine', 0.05, null, 0.02); },
    select() { tone(523, 0.07, 'triangle', 0.12); tone(784, 0.09, 'triangle', 0.1, null, 0.05, 0.3); },
    step() { noise(0.035, 0.07, 420, 1.2); tone(90, 0.05, 'sine', 0.08, 0.7); },
    swing() { noise(0.14, 0.26, 2600, 0.6, 0, 0.1, 'bandpass', 0.4); },
    shoot(k) {
      if (k === 'eclat' || k === 'gel' || k === 'foudre') { tone(1400, 0.16, 'sine', 0.14, 2.2, 0, 0.4); tone(2100, 0.1, 'triangle', 0.06, 1.5, 0.03, 0.4); }
      else { noise(0.07, 0.24, 3600, 1.2); tone(740, 0.09, 'square', 0.04, 0.45, 0, 0.1, 2400); }
    },
    dash() { noise(0.22, 0.24, 700, 0.7, 0, 0.15, 'bandpass', 3); tone(120, 0.18, 'sawtooth', 0.05, 2, 0, 0, 900); },
    spin() { noise(0.3, 0.22, 1400, 0.5, 0, 0.2, 'bandpass', 2.5); tone(260, 0.25, 'sawtooth', 0.05, 2.5, 0, 0.2, 1500); },
    swap() { tone(420, 0.12, 'sine', 0.14, 2.2, 0, 0.4); tone(840, 0.12, 'sine', 0.1, 0.5, 0.09, 0.4); },
    hit() { noise(0.08, 0.32, 1000, 1); tone(140, 0.09, 'sine', 0.2, 0.6); },
    enemyHit() { noise(0.1, 0.32, 650, 1); tone(110, 0.14, 'square', 0.07, 0.55, 0, 0.1, 900); },
    enemyShoot() { noise(0.08, 0.16, 2800, 1.2, 0, 0.1); tone(500, 0.07, 'triangle', 0.05, 0.6); },
    hurt() { tone(240, 0.22, 'sawtooth', 0.14, 0.45, 0, 0.15, 1800); noise(0.12, 0.24, 480, 1); tone(70, 0.2, 'sine', 0.25, 0.6); },
    block() { tone(1560, 0.18, 'triangle', 0.13, 0.75, 0, 0.5); tone(2340, 0.12, 'sine', 0.06, 0.8, 0.01, 0.5); },
    kill() { tone(330, 0.2, 'triangle', 0.14, 0.4, 0, 0.3); noise(0.18, 0.22, 1600, 0.6, 0, 0.2, 'bandpass', 0.3); tone(1760, 0.12, 'sine', 0.05, 1.3, 0.06, 0.6); },
    boom(small) { noise(small ? 0.3 : 0.6, small ? 0.34 : 0.55, 900, 0.5, 0, 0.35, 'lowpass', 0.12); tone(80, small ? 0.25 : 0.5, 'sine', 0.38, 0.35); if (!small) tone(45, 0.6, 'sine', 0.3, 0.6); },
    thud() { tone(105, 0.14, 'sine', 0.32, 0.5); noise(0.07, 0.22, 380, 1); },
    fall() { tone(620, 0.55, 'sine', 0.13, 0.12, 0, 0.5); noise(0.4, 0.08, 900, 0.6, 0.1, 0.3, 'bandpass', 0.3); },
    trap() { tone(950, 0.05, 'square', 0.08, null, 0, 0, 3000); tone(640, 0.08, 'square', 0.08, null, 0.05, 0, 3000); },
    zap() { noise(0.18, 0.26, 4200, 2, 0, 0.3); tone(1700, 0.14, 'sawtooth', 0.06, 0.3, 0, 0.3, 4000); },
    vortex() { tone(180, 0.5, 'sine', 0.16, 3.2, 0, 0.5); noise(0.5, 0.15, 700, 0.5, 0, 0.4, 'bandpass', 3); },
    taunt() { tone(170, 0.36, 'sawtooth', 0.12, 1.6, 0, 0.3, 1200); tone(255, 0.3, 'sawtooth', 0.08, 1.4, 0.04, 0.3, 1200); },
    order() { [660, 880, 1320].forEach((f, i) => tone(f, 0.12, 'triangle', 0.12, null, i * 0.06, 0.4)); },
    heal() { [784, 988, 1175].forEach((f, i) => tone(f, 0.22, 'sine', 0.08, null, i * 0.05, 0.6)); },
    summon() { tone(220, 0.4, 'triangle', 0.12, 2, 0, 0.5); noise(0.3, 0.1, 500, 0.6, 0.05, 0.4, 'bandpass', 3); },
    ghost() { tone(820, 0.32, 'sine', 0.08, 0.4, 0, 0.7); tone(410, 0.32, 'sine', 0.05, 0.5, 0.03, 0.7); },
    mark() { tone(1046, 0.08, 'square', 0.06, null, 0, 0.2, 3000); tone(1046, 0.08, 'square', 0.06, null, 0.13, 0.2, 3000); },
    laser() { tone(1900, 0.45, 'sawtooth', 0.07, 0.15, 0, 0.3, 5000); noise(0.35, 0.2, 3200, 1, 0, 0.3); },
    wind() { noise(0.45, 0.26, 600, 0.6, 0, 0.3, 'bandpass', 4); },
    hook() { tone(1200, 0.06, 'square', 0.07, 0.6, 0, 0.2, 4000); noise(0.25, 0.16, 1500, 0.8, 0.03, 0.2, 'bandpass', 0.3); },
    shatter() { noise(0.4, 0.26, 5000, 1.5, 0, 0.5, 'highpass'); [2093, 2637, 3136].forEach((f, i) => tone(f, 0.35, 'sine', 0.05, 0.98, i * 0.03, 0.7)); },
    horn() { tone(196, 0.5, 'sawtooth', 0.1, null, 0, 0.5, 900); tone(294, 0.5, 'sawtooth', 0.08, null, 0.18, 0.5, 900); },
    phase() { tone(90, 1.0, 'sawtooth', 0.18, 0.6, 0, 0.6, 700); tone(135, 0.9, 'sawtooth', 0.12, 0.55, 0.05, 0.6, 700); noise(0.9, 0.3, 300, 0.6, 0, 0.6, 'lowpass', 0.3); },
    win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.24, 'triangle', 0.13, null, i * 0.09, 0.5)); tone(2093, 0.5, 'sine', 0.05, null, 0.36, 0.8); },
    fail() { [392, 330, 262].forEach((f, i) => tone(f, 0.3, 'triangle', 0.13, null, i * 0.14, 0.5)); },
    gold() { [988, 1318, 1760].forEach((f, i) => tone(f, 0.16, 'triangle', 0.11, null, i * 0.07, 0.6)); },
    door() { tone(150, 0.4, 'sine', 0.2, 1.6, 0, 0.5); noise(0.35, 0.12, 500, 0.6, 0, 0.4, 'bandpass', 2); },
  };
})();

/* ---------- musiques : fichiers dans music/ (voir music/CREDITS.md) ----------
   Chaque morceau a un gain de normalisation (mesuré : écarts de ~30 dB entre fichiers),
   pour qu'aucune musique ne soit plus forte qu'une autre. Fondus enchaînés longs et doux. */
const Music = (() => {
  const TRACKS = {
    explore: [{ src: 'music/explore.ogg', gain: 7.8 }],
    combat: [{ src: 'music/combat.ogg', gain: 1.26 }, { src: 'music/combat2.ogg', gain: 0.3 }],
    boss: [{ src: 'music/boss.wav', gain: 0.7, intro: 'music/boss_intro.wav', introGain: 0.78 }],
  };
  const FADE = 1.0;            // constante de temps des fondus (s) : ~3 s pour un fondu complet
  const store = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  let vol = parseFloat(store('binome_vol_music')); if (!(vol >= 0)) vol = 0.7;
  let mood = null, cur = null, unlocked = false, combatN = 0;
  const broken = new Set();
  const webaudio = location.protocol !== 'file:';   // en file://, le navigateur interdit de router l'audio
  const level = () => (Sfx.muted ? 0 : vol * 0.55);
  function setGain(p, v, tc) {
    if (p.g) { const c = p.g.context; p.g.gain.cancelScheduledValues(c.currentTime); p.g.gain.setTargetAtTime(Math.max(0.0001, v), c.currentTime, tc); return; }
    // repli sans WebAudio : volume des éléments (max 1)
    const t0 = performance.now(), from = p.vol || 0; p.vol = v;
    clearInterval(p.fadeId);
    p.fadeId = setInterval(() => { const k = Math.min(1, (performance.now() - t0) / (tc * 3000)); for (const a of p.els) try { a.volume = Math.min(1, (from + (v - from) * k) * (a.norm || 1)); } catch (e) { } if (k >= 1) clearInterval(p.fadeId); }, 50);
  }
  function makeEl(p, src, loop, norm, bus) {
    const a = new Audio(); a.preload = 'auto'; a.loop = loop; a.norm = norm; a.src = src;
    if (bus && p.g) { try { const s = bus.ctx.createMediaElementSource(a), ng = bus.ctx.createGain(); ng.gain.value = norm; s.connect(ng); ng.connect(p.g); } catch (e) { } }
    else a.volume = 0;
    a.addEventListener('playing', () => { if (cur === p) { p.ok = true; Sfx.synthStop(); } });
    p.els.push(a);
    return a;
  }
  function start(track) {
    if (!track || broken.has(track.src)) return null;
    const p = { track, ok: false, els: [] };
    const bus = webaudio ? Sfx.musicBus() : null;
    if (bus) { p.g = bus.ctx.createGain(); p.g.gain.value = 0.0001; p.g.connect(bus.bus); }
    const loop = makeEl(p, track.src, true, track.gain || 1, bus);
    loop.addEventListener('error', () => { broken.add(track.src); if (cur === p) fallback(); });
    let first = loop;
    if (track.intro && !broken.has(track.intro)) {
      const intro = makeEl(p, track.intro, false, track.introGain || track.gain || 1, bus);
      intro.addEventListener('ended', () => { if (cur === p) loop.play().catch(() => { }); });   // boucle déjà chargée : enchaînement sans coupure
      intro.addEventListener('error', () => { broken.add(track.intro); if (cur === p) loop.play().catch(() => { }); });
      first = intro;
    }
    first.play().catch(() => { });
    setGain(p, level(), FADE);
    return p;
  }
  function stopPlayer(p) {
    if (!p) return;
    setGain(p, 0, FADE * 0.8);
    setTimeout(() => { for (const a of p.els) try { a.pause(); a.removeAttribute('src'); a.load(); } catch (e) { } if (p.g) try { p.g.disconnect(); } catch (e) { } }, 4500);
  }
  function fallback() { if (mood && unlocked && !Sfx.muted) Sfx.synthPlay(mood, vol); }
  return {
    get volume() { return vol; },
    setVolume(v) { vol = v; try { localStorage.setItem('binome_vol_music', String(v)); } catch (e) { } if (cur) setGain(cur, level(), 0.15); Sfx.synthVolume(v); },
    unlock() { if (unlocked) return; unlocked = true; if (mood) { const m = mood; mood = null; this.play(m); } },
    play(m) {
      if (m === mood && cur) return;
      const list = TRACKS[m] || [];
      let track = list[0];
      if (m === 'combat' && list.length > 1) { track = list[Math.floor(combatN / 3) % list.length]; combatN++; if (broken.has(track.src)) track = list.find(t => !broken.has(t.src)); }
      // même morceau déjà en cours (ex. deux combats de suite) : on ne coupe rien
      if (cur && track && cur.track === track) { mood = m; return; }
      mood = m;
      if (!unlocked) return;
      const old = cur; cur = null;
      stopPlayer(old);
      Sfx.synthStop();
      cur = start(track);
      // toujours une musique : si le fichier n'a pas démarré après 3 s, mélodie générée (fondu doux)
      const p = cur;
      if (!p) fallback();
      else setTimeout(() => { if (cur === p && !p.ok) fallback(); }, 3000);
    },
    refresh() { if (!Sfx.muted) Sfx.musicBus(); if (cur) setGain(cur, level(), 0.3); if (Sfx.muted) Sfx.synthStop(); else if (cur && !cur.ok) fallback(); },
  };
})();
