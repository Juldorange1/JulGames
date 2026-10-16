// Musique de Fracas : morceaux composes (pas de fichiers), joues par un sequenceur WebAudio.
//
// Chaque morceau est ARRANGE en sections de 4 mesures (intro, A, B, A', pont) : les instruments
// entrent et sortent tour a tour au lieu de tous jouer en meme temps (melodie OU arpege, jamais
// les deux), pour une musique lisible et non surchargee.
//   - INTENSITE (0 calme -> 1 combat) : la batterie et la melodie suivent le combat.
//   - PRESSION (0 -> 1) : quand le joueur est en danger (peu de %) ou face a un boss, une
//     pulsation grave, un charleston plus serre et un filtre qui s'ouvre font monter la tension.
//   - En PAUSE (ou boutique, choix de bonus) la musique est etouffee et baisse.

const NOTE_INDEX = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
function noteToMidi(n) {
  const m = /^([A-G](?:#|b)?)(-?\d)$/.exec(n);
  if (!m) return null;
  return 12 * (Number(m[2]) + 1) + NOTE_INDEX[m[1]];
}
function midiToHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
// "E5 - . C5" : note / tenue / silence, une case = une double-croche
function parseLine(str) {
  const toks = str.trim().split(/\s+/);
  const out = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t === '-' || t === '.') continue;
    let len = 1;
    while (i + len < toks.length && toks[i + len] === '-') len++;
    const notes = t.split('+').map(noteToMidi).filter((x) => x != null);
    if (notes.length) out.push({ step: i, len, notes });
  }
  return out;
}
const chord = (s) => s.split(' ').map(noteToMidi);
const root = (s) => noteToMidi(s);

// Forme commune : sections de 4 mesures et instruments presents dans chacune.
const MUSIC_FORM = [
  { name: 'intro', pad: 1, bass: 0.6, hats: 1 },
  { name: 'A', bass: 1, drums: 1, arp: 1 },
  { name: 'B', bass: 1, drums: 1, lead: 'lead', pad: 0.5 },
  { name: "A'", bass: 1, drums: 1, lead: 'leadB' },
  { name: 'pont', pad: 1, bass: 0.6, kick: 1, bell: 1 },
];

// ---------------- Morceaux ----------------
const MUSIC_TRACKS = {
  menu: {
    bpm: 90, swing: 0.05, form: [MUSIC_FORM[0], MUSIC_FORM[1], { name: 'B', bass: 1, hats: 1, lead: 'lead', pad: 0.6 }, MUSIC_FORM[4]],
    chords: [chord('A3 C4 E4'), chord('F3 A3 C4'), chord('C3 E3 G3'), chord('G3 B3 D4')],
    bassRoot: [root('A1'), root('F1'), root('C2'), root('G1')],
    bass: 'x . . . . . x . . . x . . . . .',
    drums: { k: 'x . . . . . . . x . . . . . . .', s: '. . . . x . . . . . . . x . . .', h: '. . x . . . x . . . x . . . x .' },
    arp: [0, 2, 1, 2],
    lead: ['E5 - - - C5 - D5 - E5 - - - G5 - E5 -', 'F5 - - - E5 - C5 - A4 - - - . . . .', 'G4 - - - C5 - E5 - G5 - - - E5 - D5 -', 'D5 - - - B4 - - - G4 - - - . . . .'],
    vol: { pad: 0.55, lead: 0.5, drums: 0.4 },
  },
  menu2: { // menus en ligne / Codex : plus calme (mi mineur)
    bpm: 82, swing: 0.06, form: [MUSIC_FORM[0], { name: 'A', bass: 1, hats: 1, arp: 1 }, { name: 'B', bass: 1, hats: 1, lead: 'lead', pad: 0.5 }, MUSIC_FORM[4]],
    chords: [chord('E3 G3 B3'), chord('C3 E3 G3'), chord('G3 B3 D4'), chord('D3 F#3 A3')],
    bassRoot: [root('E1'), root('C2'), root('G1'), root('D2')],
    bass: 'x . . . . . . . x . . . . . . .',
    drums: { k: 'x . . . . . . . . . . . . . . .', s: '', h: '. . . . x . . . . . . . x . . .' },
    arp: [0, 1, 2, 1],
    lead: ['B4 - - - E5 - - - G5 - - - F#5 - E5 -', 'E5 - - - D5 - - - C5 - - - . . . .', 'D5 - - - G5 - - - B5 - - - A5 - G5 -', 'F#5 - - - D5 - - - A4 - - - . . . .'],
    vol: { pad: 0.6, lead: 0.45, drums: 0.35 },
  },
  tutorial: {
    bpm: 104, swing: 0.05, form: [MUSIC_FORM[0], MUSIC_FORM[1], MUSIC_FORM[2], MUSIC_FORM[4]],
    chords: [chord('C4 E4 G4'), chord('A3 C4 E4'), chord('F3 A3 C4'), chord('G3 B3 D4')],
    bassRoot: [root('C2'), root('A1'), root('F1'), root('G1')],
    bass: 'x . . x . . x . x . . x . . x .',
    drums: { k: 'x . . . . . x . x . . . . . . .', s: '. . . . x . . . . . . . x . . .', h: 'x . x . x . x . x . x . x . x .' },
    arp: [0, 1, 2, 1],
    lead: ['G5 - E5 - C5 - E5 - G5 - - - A5 - G5 -', 'E5 - - - C5 - - - A4 - C5 - E5 - - -', 'F5 - A5 - F5 - C5 - A4 - - - C5 - - -', 'D5 - - - G5 - - - B4 - D5 - G4 - - -'],
    vol: { pad: 0.45, lead: 0.5, drums: 0.45 },
  },
  part1: { // Prairie : aventure (re mineur)
    bpm: 120,
    chords: [chord('D3 F3 A3'), chord('Bb2 D3 F3'), chord('F3 A3 C4'), chord('C3 E3 G3')],
    bassRoot: [root('D2'), root('Bb1'), root('F1'), root('C2')],
    bass: 'x . x o x . x o x . x o x . x o',
    drums: { k: 'x . . . x . . . x . . . x . . .', s: '. . . . x . . . . . . . x . . x', h: 'x . x . x . x . x . x . x . x .', o: '. . . . . . . o . . . . . . . o' },
    arp: [0, 1, 2, 1],
    lead: ['D5 - - A4 - - D5 - E5 - F5 - - - E5 -', 'D5 - - - Bb4 - - - F5 - - - E5 - D5 -', 'C5 - - - A4 - C5 - F5 - - - A5 - - -', 'G5 - - - E5 - - - C5 - D5 - E5 - - -'],
    leadB: ['A5 - - - F5 - A5 - D6 - - - C6 - A5 -', 'Bb5 - - - A5 - F5 - D5 - - - F5 - - -', 'A5 - - - G5 - F5 - E5 - F5 - A5 - - -', 'G5 - E5 - C5 - E5 - G5 - - - . . . .'],
    vol: { pad: 0.4, lead: 0.55, drums: 0.65 },
  },
  part1b: { // Prairie (2) : galop heroique (sol mineur)
    bpm: 126,
    chords: [chord('G3 Bb3 D4'), chord('Eb3 G3 Bb3'), chord('Bb2 D3 F3'), chord('F3 A3 C4')],
    bassRoot: [root('G1'), root('Eb1'), root('Bb1'), root('F1')],
    bass: 'x . x x . x x . x . x x . x x .',
    drums: { k: 'x . . x x . . . x . . x x . . .', s: '. . . . x . . . . . . . x . . .', h: 'x x x . x x x . x x x . x x x .', o: '' },
    arp: [0, 2, 1, 2],
    lead: ['G5 - - - D5 - G5 - Bb5 - - - A5 - G5 -', 'G5 - - - Eb5 - - - Bb4 - - - . . . .', 'F5 - - - D5 - F5 - Bb5 - - - A5 - F5 -', 'A5 - - - F5 - - - C5 - - - . . . .'],
    leadB: ['D6 - - - Bb5 - G5 - D6 - - - C6 - Bb5 -', 'Bb5 - - - G5 - Eb5 - G5 - - - . . . .', 'F5 - Bb5 - D6 - - - C6 - Bb5 - A5 - - -', 'C6 - - - A5 - F5 - A5 - - - . . . .'],
    vol: { pad: 0.35, lead: 0.55, drums: 0.7 },
  },
  part2: { // Usine : mecanique (mi mineur)
    bpm: 128,
    chords: [chord('E3 G3 B3'), chord('E3 G3 B3'), chord('C3 E3 G3'), chord('D3 F#3 A3')],
    bassRoot: [root('E1'), root('E1'), root('C2'), root('D2')],
    bass: 'x . . x . . x . . x . . x . x o',
    drums: { k: 'x . . . x . . x x . . . x . . .', s: '. . . . x . . . . . . . x . x .', h: 'x . x x x . x x x . x x x . x x', o: '. . . . . . . . . . o . . . . .' },
    arp: [0, 2, 1, 2],
    lead: ['E5 - . E5 . G5 - . B5 - - - A5 - G5 -', 'F#5 - - - E5 - . D5 - - B4 - - - . .', 'E5 - . E5 . G5 - . C6 - - - B5 - G5 -', 'A5 - - - F#5 - D5 - E5 - - - . . . .'],
    vol: { pad: 0.3, lead: 0.5, drums: 0.72 },
  },
  part2b: { // Usine (2) : presse hydraulique (la mineur)
    bpm: 132,
    chords: [chord('A2 C3 E3'), chord('A2 C3 E3'), chord('F2 A2 C3'), chord('G2 B2 D3')],
    bassRoot: [root('A1'), root('A1'), root('F1'), root('G1')],
    bass: 'x x . x . x x . x x . x . x . o',
    drums: { k: 'x . . . x . x . x . . . x . x .', s: '. . . . x . . . . . . . x . . .', h: 'x x x x x x x x x x x x x x x x', o: '' },
    arp: [0, 1, 2, 1],
    lead: ['A5 - . . A5 - C6 - B5 - . . G5 - E5 -', 'A5 - - - . . . . E5 - G5 - A5 - . .', 'F5 - . . F5 - A5 - C6 - . . A5 - F5 -', 'G5 - - - B5 - D6 - B5 - - - . . . .'],
    vol: { pad: 0.3, lead: 0.5, drums: 0.75 },
  },
  part3: { // Ruines : sombre et lourd (do mineur)
    bpm: 108,
    chords: [chord('C3 Eb3 G3'), chord('Ab2 C3 Eb3'), chord('Eb3 G3 Bb3'), chord('G2 B2 D3')],
    bassRoot: [root('C2'), root('Ab1'), root('Eb2'), root('G1')],
    bass: 'x . . . x . . x . . x . . . x .',
    drums: { k: 'x . . . . . x . . . x . . . . .', s: '. . . . x . . . . . . . x . . .', h: 'x . x . x . x . x . x . x . x .', o: '. . . . . . . . . . . . . . o .' },
    arp: [0, 1, 2, 1],
    lead: ['G4 - - - C5 - - - Eb5 - D5 - C5 - - -', 'Ab4 - - - C5 - Eb5 - G5 - - - F5 - Eb5 -', 'Bb4 - - - Eb5 - G5 - Bb5 - - - G5 - - -', 'B4 - - - D5 - F5 - Ab5 - G5 - F5 - D5 -'],
    vol: { pad: 0.5, lead: 0.45, drums: 0.65 },
  },
  part3b: { // Ruines (2) : inquietant (fa# mineur)
    bpm: 100,
    chords: [chord('F#3 A3 C#4'), chord('D3 F#3 A3'), chord('B2 D3 F#3'), chord('C#3 F3 G#3')],
    bassRoot: [root('F#1'), root('D2'), root('B1'), root('C#2')],
    bass: 'x . . . . . . x . . x . . . . .',
    drums: { k: 'x . . . . . . . x . x . . . . .', s: '. . . . x . . . . . . . x . . .', h: '. . x . . . x . . . x . . . x .', o: '' },
    arp: [0, 2, 1, 2],
    lead: ['C#5 - - - F#5 - - - A5 - G#5 - F#5 - - -', 'A5 - - - F#5 - D5 - . . . . . . . .', 'D5 - - - F#5 - B5 - A5 - - - F#5 - - -', 'F5 - - - G#5 - C#6 - B5 - G#5 - F5 - - -'],
    vol: { pad: 0.55, lead: 0.45, drums: 0.6 },
  },
  boss: { // Boss : intense (fa mineur)
    bpm: 144,
    form: [{ name: 'A', bass: 1, drums: 1, arp: 1 }, { name: 'B', bass: 1, drums: 1, lead: 'lead' }, { name: "A'", bass: 1, drums: 1, lead: 'leadB' }, { name: 'pont', bass: 1, kick: 1, hats: 1, pad: 0.6 }],
    chords: [chord('F3 Ab3 C4'), chord('Db3 F3 Ab3'), chord('Bb2 Db3 F3'), chord('C3 E3 G3')],
    bassRoot: [root('F1'), root('Db1'), root('Bb1'), root('C2')],
    bass: 'x x o x x x o x x x o x x o x o',
    drums: { k: 'x . . x x . . . x . . x x . . .', s: '. . . . x . . . . . . . x . x x', h: 'x x x x x x x x x x x x x x x x', o: '. . . . . . . o . . . . . . . o' },
    arp: [0, 1, 2, 1],
    lead: ['F5 - - C5 - - F5 - Ab5 - G5 - F5 - E5 -', 'F5 - - - Db5 - - - Ab5 - - - F5 - - -', 'Bb5 - - - F5 - Db5 - F5 - Bb5 - C6 - - -', 'C6 - Bb5 - G5 - E5 - G5 - - - C5 - - -'],
    leadB: ['C6 - - Ab5 - - F5 - C6 - Db6 - C6 - Ab5 -', 'Db6 - - - Ab5 - - - F5 - Ab5 - Db6 - - -', 'Db6 - - - Bb5 - F5 - Bb5 - Db6 - F6 - - -', 'E6 - C6 - G5 - C6 - E6 - - - . . . .'],
    vol: { pad: 0.3, lead: 0.55, drums: 0.82 },
  },
  boss2: { // Boss (2) : implacable (re mineur)
    bpm: 150,
    form: [{ name: 'A', bass: 1, drums: 1, arp: 1 }, { name: 'B', bass: 1, drums: 1, lead: 'lead' }, { name: "A'", bass: 1, drums: 1, lead: 'leadB' }, { name: 'pont', bass: 1, kick: 1, hats: 1, pad: 0.6 }],
    chords: [chord('D3 F3 A3'), chord('Bb2 D3 F3'), chord('C3 E3 G3'), chord('A2 C#3 E3')],
    bassRoot: [root('D1'), root('Bb1'), root('C2'), root('A1')],
    bass: 'x o x o x o x o x o x o x o x o',
    drums: { k: 'x . x . x . . x x . x . x . . .', s: '. . . . x . . . . . . . x . . .', h: 'x x x x x x x x x x x x x x x x', o: '. . . o . . . o . . . o . . . o' },
    arp: [0, 2, 1, 2],
    lead: ['D6 - - - A5 - - - F5 - G5 - A5 - - -', 'Bb5 - - - F5 - - - D5 - F5 - Bb5 - - -', 'C6 - - - G5 - - - E5 - G5 - C6 - - -', 'C#6 - - - A5 - E5 - C#5 - E5 - A5 - - -'],
    leadB: ['F6 - E6 - D6 - A5 - D6 - - - F6 - - -', 'F6 - - - D6 - Bb5 - F5 - - - . . . .', 'G6 - F6 - E6 - C6 - G5 - - - C6 - - -', 'E6 - - - C#6 - A5 - E5 - - - . . . .'],
    vol: { pad: 0.3, lead: 0.55, drums: 0.85 },
  },
  final: { // Profondeurs (Infini) : pression continue (si mineur)
    bpm: 138,
    chords: [chord('B2 D3 F#3'), chord('G2 B2 D3'), chord('E3 G3 B3'), chord('F#3 A#3 C#4')],
    bassRoot: [root('B1'), root('G1'), root('E1'), root('F#1')],
    bass: 'x . x x . x x . x . x x . x . x',
    drums: { k: 'x . . x . . x . x . . x . . x .', s: '. . . . x . . . . . . . x . . x', h: 'x x x x x x x x x x x x x x x x', o: '. . . . . . o . . . . . . . o .' },
    arp: [0, 1, 2, 1],
    lead: ['F#5 - - - B5 - - - D6 - C#6 - B5 - - -', 'D6 - - - B5 - G5 - . . . . . . . .', 'E5 - - - G5 - B5 - E6 - D6 - B5 - - -', 'C#6 - - - A#5 - F#5 - . . . . . . . .'],
    vol: { pad: 0.35, lead: 0.5, drums: 0.8 },
  },
};
MUSIC_TRACKS.arena = Object.assign({}, MUSIC_TRACKS.part2b, { bpm: 136 });

const Music = {
  ctx: null,
  out: null,
  track: null,
  trackName: null,
  pendingName: null,
  intensity: 0.5,
  targetIntensity: 0.5,
  pressure: 0,
  targetPressure: 0,
  muffled: false,
  nextTime: 0,
  step: 0,
  timer: null,
  volume: 0.55,
  on: true,

  init() {
    this.volume = Save.data && Save.data.musicVolume != null ? Save.data.musicVolume : 0.55;
    // les navigateurs n'autorisent le son qu'apres une action du joueur
    const unlock = () => { if (this.pendingName && !this.timer && Audio2._ready()) this.setTrack(this.pendingName, true); };
    for (const ev of ['pointerdown', 'keydown', 'touchstart', 'gamepadconnected']) window.addEventListener(ev, unlock);
  },

  level() { return this.volume * 0.42 * (this.muffled ? 0.35 : 1); },

  setVolume(v) {
    this.volume = clamp(v, 0, 1);
    if (Save.data) { Save.data.musicVolume = this.volume; Save.persist(); }
    if (this.out) this.out.gain.setTargetAtTime(this.level(), this.ctx.currentTime, 0.1);
  },

  // Pause / boutique / choix : musique etouffee et plus basse (et revient doucement).
  setMuffled(m) {
    if (this.muffled === m) return;
    this.muffled = m;
    if (!this.ctx || !this.out) return;
    const t = this.ctx.currentTime;
    this.out.gain.setTargetAtTime(this.level(), t, 0.25);
    this.master.frequency.setTargetAtTime(m ? 650 : 16000, t, 0.25);
  },

  // Chaine de sortie : volume -> filtre global (etouffement en pause) -> compresseur commun ;
  // envois d'echo (melodies) et de reverberation.
  ensure() {
    const ctx = Audio2.ctx;
    if (!ctx) return false;
    if (this.ctx !== ctx) {
      this.ctx = ctx;
      const bus = Audio2._out();
      this.master = ctx.createBiquadFilter(); this.master.type = 'lowpass'; this.master.frequency.value = 16000;
      this.out = ctx.createGain(); this.out.gain.value = this.level();
      this.out.connect(this.master); this.master.connect(bus.dry);
      this.verbSend = ctx.createGain(); this.verbSend.gain.value = 0.18;
      this.master.connect(this.verbSend); this.verbSend.connect(bus.verb);
      this.delay = ctx.createDelay(1.5);
      this.delayFb = ctx.createGain(); this.delayFb.gain.value = 0.22;
      this.delayIn = ctx.createGain(); this.delayIn.gain.value = 0.22;
      const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2600;
      this.delayIn.connect(this.delay); this.delay.connect(dlp); dlp.connect(this.delayFb); this.delayFb.connect(this.delay);
      dlp.connect(this.out);
    }
    return true;
  },

  // ---------- vraies pistes (fichiers, voir js/music_files.js) ----------
  file: null,       // { name, layers: [{ el, gain, kind }] } piste en cours
  badFiles: {},     // fichiers introuvables : on reste sur la musique synthetisee
  fileSpec(name) {
    if (typeof MUSIC_FILES === 'undefined' || this.badFiles[name]) return null;
    const f = MUSIC_FILES[name];
    if (!f) return null;
    return typeof f === 'string' ? { base: f } : f;
  },
  stopFile(fade) {
    const f = this.file;
    if (!f) return;
    this.file = null;
    const now = this.ctx ? this.ctx.currentTime : 0;
    for (const l of f.layers) {
      try { l.gain.gain.cancelScheduledValues(now); l.gain.gain.setTargetAtTime(0, now, (fade || 0.6) / 3); } catch (e) { /* ignore */ }
      setTimeout(() => { try { l.el.pause(); l.el.removeAttribute('src'); l.el.load(); l.src.disconnect(); } catch (e) { /* ignore */ } }, (fade || 0.6) * 1000 + 200);
    }
  },
  playFile(name, spec) {
    if (this.file && this.file.name === name) return;
    this.stopFile(1.2); // fondu croise avec la piste precedente
    const ctx = this.ctx, now = ctx.currentTime;
    const f = { name, layers: [] };
    for (const kind of ['base', 'combat']) {
      if (!spec[kind]) continue;
      const el = new Audio();
      el.src = spec[kind]; el.loop = true; el.preload = 'auto'; el.crossOrigin = 'anonymous';
      const src = ctx.createMediaElementSource(el);
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(gain); gain.connect(this.out); // volume, etouffement en pause : comme la synthese
      el.addEventListener('error', () => {
        if (this.file !== f) return;
        this.badFiles[name] = true; // fichier manquant : retour a la musique synthetisee
        this.stopFile(0.1);
        this.setTrack(name, true);
      });
      f.layers.push({ el, src, gain, kind });
    }
    this.file = f;
    const start = () => {
      for (const l of f.layers) { l.el.currentTime = 0; const p = l.el.play(); if (p && p.catch) p.catch(() => {}); }
      this.applyFileMix(1.2);
    };
    start();
    this.out.gain.setTargetAtTime(this.level(), now, 0.2);
  },
  // couche "combat" selon l'intensite ; tout coupe si le son est desactive
  applyFileMix(fade) {
    const f = this.file;
    if (!f || !this.ctx) return;
    const now = this.ctx.currentTime, on = Audio2.on && Audio2.volume > 0;
    const hasCombat = f.layers.some((l) => l.kind === 'combat');
    for (const l of f.layers) {
      let v = on ? 1 : 0;
      if (hasCombat) v *= l.kind === 'combat' ? clamp((this.targetIntensity - 0.45) / 0.45, 0, 1) : 1;
      l.gain.gain.setTargetAtTime(v, now, (fade || 0.8) / 3);
      if (on && l.el.paused) { const p = l.el.play(); if (p && p.catch) p.catch(() => {}); }
    }
  },

  setTrack(name, force) {
    if (!name) return;
    if (!force && name === this.trackName && (this.timer || (this.file && this.file.name === name))) return;
    this.pendingName = name;
    if (!Audio2._ready() || !this.ensure() || !this.on) return;
    const spec = this.fileSpec(name);
    if (spec) { // vraie piste : la synthese s'arrete
      if (this.timer) { clearInterval(this.timer); this.timer = null; }
      this.trackName = name;
      this.playFile(name, spec);
      return;
    }
    this.stopFile(1.2);
    const t = MUSIC_TRACKS[name];
    if (!t) return;
    const fresh = this.trackName !== name;
    this.trackName = name;
    this.track = Object.assign({ form: MUSIC_FORM, swing: 0, vol: { pad: 0.4, lead: 0.5, drums: 0.6 } }, t, {
      leadParsed: t.lead.map(parseLine), leadBParsed: (t.leadB || t.lead).map(parseLine),
    });
    this.delay.delayTime.value = (60 / t.bpm) * 0.75;
    if (fresh) {
      // fondu entre deux morceaux (les notes deja programmees de l'ancien s'eteignent dans le fondu)
      const now = this.ctx.currentTime;
      this.out.gain.cancelScheduledValues(now);
      this.out.gain.setValueAtTime(Math.max(0.0001, this.out.gain.value), now);
      this.out.gain.linearRampToValueAtTime(0.0001, now + 0.25);
      this.out.gain.linearRampToValueAtTime(this.level(), now + 1.6);
      this.step = 0;
      this.nextTime = now + 0.3;
    }
    this.nextTime = Math.max(this.nextTime, this.ctx.currentTime + 0.08);
    if (!this.timer) this.timer = setInterval(() => this.schedule(), 25);
  },

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null; this.trackName = null;
    this.stopFile(0.5);
  },

  setIntensity(v) {
    const nv = clamp(v, 0, 1);
    if (this.file && Math.abs(nv - this.targetIntensity) > 0.01) { this.targetIntensity = nv; this.applyFileMix(1.5); return; }
    this.targetIntensity = nv;
  },
  setPressure(v) { this.targetPressure = clamp(v, 0, 1); },

  schedule() {
    const ctx = this.ctx, t = this.track;
    if (!ctx || !t) return;
    if (!Audio2.on || Audio2.volume <= 0) return;
    const stepDur = 60 / t.bpm / 4;
    const total = t.form.length * 64;
    while (this.nextTime < ctx.currentTime + 0.18) {
      this.intensity += (this.targetIntensity - this.intensity) * 0.04;
      this.pressure += (this.targetPressure - this.pressure) * 0.03;
      const swing = (this.step % 2 === 1) ? stepDur * (t.swing || 0) : 0;
      this.playStep(this.step, this.nextTime + swing, stepDur);
      this.nextTime += stepDur;
      this.step = (this.step + 1) % total;
    }
  },

  playStep(step, time, sd) {
    const t = this.track;
    const sec = t.form[Math.floor(step / 64) % t.form.length];
    const bar = Math.floor(step / 16) % 4, s = step % 16;
    const I = this.intensity, P = this.pressure;
    const ch = t.chords[bar];
    const at = (str, i) => { if (!str) return false; const a = str.split(' '); return a[i] && a[i] !== '.'; };
    const charAt = (str, i) => (str ? str.split(' ')[i] : '.');
    const calm = I < 0.5;
    // ---- batterie : complete seulement en combat ; au calme, juste le charleston ----
    const dv = (t.vol.drums || 0.6) * (0.4 + 0.6 * I);
    const drumsOn = sec.drums && !calm;
    if ((drumsOn || sec.kick || P > 0.5) && at(t.drums.k, s)) this.kick(time, dv);
    if (drumsOn && at(t.drums.s, s)) this.snare(time, dv * 0.75);
    if ((drumsOn || sec.hats || sec.drums) && at(t.drums.h, s)) this.hat(time, dv * (drumsOn ? 0.3 : 0.18), false);
    if (drumsOn && at(t.drums.o, s)) this.hat(time, dv * 0.25, true);
    if (drumsOn && sec.name === "A'" && bar === 3 && s >= 12) this.snare(time, dv * 0.45); // relance
    // ---- pression : pulsation grave a la noire + charleston serre ----
    if (P > 0.15) {
      if (s % 4 === 0) this.pulse(time, t.bassRoot[bar] - 12, sd * 3, P);
      if (P > 0.45 && s % 2 === 1) this.hat(time, 0.12 * P, false);
    }
    // ---- basse ----
    if (sec.bass) {
      const bc = charAt(t.bass, s);
      if (bc === 'x' || bc === 'o') {
        if (sec.bass >= 1 || s % 8 === 0) this.bass(time, t.bassRoot[bar] + (bc === 'o' ? 12 : 0), sd * 1.8, 0.45 * sec.bass, P);
      }
    }
    // ---- nappe : une par mesure, seulement dans les sections qui en ont ----
    if (sec.pad && s === 0) this.pad(time, ch, sd * 16, (t.vol.pad || 0.4) * sec.pad);
    // ---- melodie OU arpege (jamais les deux) ----
    if (sec.lead && !calm) {
      const lines = sec.lead === 'leadB' ? t.leadBParsed : t.leadParsed;
      for (const ev of lines[bar]) if (ev.step === s) for (const n of ev.notes) this.lead(time, n, sd * ev.len, (t.vol.lead || 0.5) * (0.6 + 0.4 * I));
    } else if ((sec.arp || (sec.lead && calm)) && s % 2 === 0) {
      const idx = t.arp[(s / 2) % t.arp.length] % ch.length;
      this.pluck(time, ch[idx] + 12, sd * 1.5, 0.16);
    }
    if (sec.bell && s === 0 && bar % 2 === 0) this.bell(time, ch[ch.length - 1] + 12, sd * 10, 0.14);
  },

  // ---------------- instruments ----------------
  env(g, time, peak, a, d, sustain, rel) {
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(peak, time + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * sustain), time + a + d);
    g.gain.exponentialRampToValueAtTime(0.0001, time + a + d + rel);
  },
  noise(time, dur, type, freq, q, peak) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = Audio2._noiseBuf('white');
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(peak, time); g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    src.connect(f).connect(g).connect(this.out);
    src.start(time, Math.random()); src.stop(time + dur + 0.02);
  },
  kick(time, v) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(150, time); o.frequency.exponentialRampToValueAtTime(42, time + 0.12);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.85 * v, time); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.3);
    o.connect(g).connect(this.out); o.start(time); o.stop(time + 0.33);
    this.noise(time, 0.012, 'highpass', 3000, 0.7, 0.18 * v);
  },
  snare(time, v) {
    const ctx = this.ctx;
    this.noise(time, 0.16, 'bandpass', 1900, 0.8, 0.45 * v);
    const o = ctx.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(210, time); o.frequency.exponentialRampToValueAtTime(140, time + 0.08);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.3 * v, time); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.1);
    o.connect(g).connect(this.out); o.start(time); o.stop(time + 0.12);
  },
  hat(time, v, open) { this.noise(time, open ? 0.2 : 0.035, 'highpass', 7800, 0.8, 0.3 * v); },
  bass(time, midi, dur, v, pressure) {
    const ctx = this.ctx, f0 = midiToHz(midi);
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = f0;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f0 / 2;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 5;
    const open = 900 + 1200 * (pressure || 0);
    lp.frequency.setValueAtTime(open, time); lp.frequency.exponentialRampToValueAtTime(220, time + Math.min(dur, 0.3));
    const g = ctx.createGain(); this.env(g, time, 0.3 * v, 0.006, 0.08, 0.6, Math.max(0.05, dur));
    const g2 = ctx.createGain(); g2.gain.value = 0.7;
    o1.connect(lp); o2.connect(g2).connect(lp); lp.connect(g).connect(this.out);
    o1.start(time); o2.start(time); o1.stop(time + dur + 0.2); o2.stop(time + dur + 0.2);
  },
  // pulsation de tension : grave sourd qui "bat" comme un coeur
  pulse(time, midi, dur, p) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = midiToHz(midi);
    const g = ctx.createGain(); this.env(g, time, 0.22 * p, 0.01, 0.12, 0.3, dur * 0.6);
    o.connect(g).connect(this.out); o.start(time); o.stop(time + dur + 0.1);
  },
  pad(time, notes, dur, v) {
    const ctx = this.ctx;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1300; lp.Q.value = 0.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time); g.gain.linearRampToValueAtTime(0.07 * v, time + dur * 0.3);
    g.gain.setValueAtTime(0.07 * v, time + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, time + dur * 1.05);
    lp.connect(g).connect(this.out);
    for (const n of notes) for (const det of [-7, 7]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midiToHz(n); o.detune.value = det;
      o.connect(lp); o.start(time); o.stop(time + dur * 1.1);
    }
  },
  pluck(time, midi, dur, v) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = midiToHz(midi);
    const g = ctx.createGain(); this.env(g, time, 0.2 * v, 0.003, 0.1, 0.15, 0.18);
    o.connect(g); g.connect(this.out);
    o.start(time); o.stop(time + dur + 0.35);
  },
  lead(time, midi, dur, v) {
    const ctx = this.ctx, f0 = midiToHz(midi);
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = f0; o1.detune.value = -5;
    const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = f0; o2.detune.value = 5;
    const vib = ctx.createOscillator(); vib.frequency.value = 5.5;
    const vibG = ctx.createGain(); vibG.gain.setValueAtTime(0, time); vibG.gain.linearRampToValueAtTime(f0 * 0.01, time + Math.min(0.35, dur));
    vib.connect(vibG); vibG.connect(o1.frequency); vibG.connect(o2.frequency);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400 + 1600 * this.pressure; lp.Q.value = 1.2;
    const g = ctx.createGain(); this.env(g, time, 0.1 * v, 0.015, 0.1, 0.7, Math.max(0.08, dur));
    const mix = ctx.createGain(); mix.gain.value = 0.5;
    o1.connect(lp); o2.connect(mix).connect(lp); lp.connect(g); g.connect(this.out); g.connect(this.delayIn);
    const end = time + dur + 0.3;
    o1.start(time); o2.start(time); vib.start(time); o1.stop(end); o2.stop(end); vib.stop(end);
  },
  bell(time, midi, dur, v) {
    const ctx = this.ctx, f0 = midiToHz(midi);
    for (const [r, a] of [[1, 1], [2.76, 0.3]]) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f0 * r;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.1 * v * a, time); g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      o.connect(g); g.connect(this.out);
      o.start(time); o.stop(time + dur + 0.05);
    }
  },

  // ---------------- jingles ----------------
  jingle(kind) {
    if (!Audio2._ready() || !this.ensure()) return;
    const t = this.ctx.currentTime + 0.05;
    const seq = kind === 'victory'
      ? [['C5', 0], ['E5', 0.12], ['G5', 0.24], ['C6', 0.36], ['G5', 0.6], ['C6', 0.72]]
      : [['G4', 0], ['Eb4', 0.2], ['C4', 0.4], ['B3', 0.6]];
    for (const [n, d] of seq) this.lead(t + d, noteToMidi(n), kind === 'victory' ? 0.22 : 0.3, 1.1);
    if (kind === 'victory') this.pad(t + 0.72, chord('C4 E4 G4 C5'), 1.6, 1);
  },
};
