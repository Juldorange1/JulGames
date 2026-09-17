// Moteur audio 100% synthétisé (Web Audio API) — aucun fichier son externe requis,
// donc aucune dépendance réseau/licence. Chaque effet combine oscillateurs, bruit
// filtré et enveloppes pour approcher un son "réaliste" adapté à son déclencheur.
const Audio = {
  ctx: null, master: null, unlocked: false,

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);
  },

  // Les navigateurs bloquent l'audio tant qu'aucun geste utilisateur n'a eu lieu ;
  // appelé au premier clic/touche (voir main.js).
  unlock() {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.unlocked = true;
  },

  now() { return this.ctx ? this.ctx.currentTime : 0; },

  tone({ freq = 440, type = 'sine', duration = 0.2, volume = 0.25, attack = 0.006, detune = 0, delay = 0 }) {
    if (!this.ctx) return;
    const t = this.now() + delay;
    const osc = this.ctx.createOscillator();
    osc.type = type; osc.frequency.setValueAtTime(Math.max(20, freq), t); osc.detune.value = detune;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(volume, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + duration);
    osc.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + attack + duration + 0.03);
  },

  sweep({ freqFrom = 800, freqTo = 200, type = 'sawtooth', duration = 0.25, volume = 0.2, delay = 0 }) {
    if (!this.ctx) return;
    const t = this.now() + delay;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freqFrom), t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqTo), t + duration);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + duration + 0.03);
  },

  noise({ duration = 0.2, volume = 0.25, filterType = 'lowpass', filterFreq = 1200, Q = 0.7, delay = 0 }) {
    if (!this.ctx) return;
    const t = this.now() + delay;
    const size = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource(); src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter(); filter.type = filterType; filter.frequency.value = filterFreq; filter.Q.value = Q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(filter); filter.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + duration + 0.03);
  },
};

// Bibliothèque de recettes sonores nommées, chacune composée pour évoquer son
// déclencheur (feu = souffle chaud + grondement grave, gel = tintement cristallin,
// électrique = crépitement aigu bref, etc.) — voir core/combat.js pour le câblage
// aux événements de jeu (SFX.attach) et main.js pour les sons d'interface.
const SFX = {
  enabled: true,
  play(name, opts = {}) {
    if (!this.enabled || !Audio.ctx) return;
    const fn = this.LIBRARY[name];
    if (fn) fn(opts);
  },

  LIBRARY: {
    fire() {
      Audio.noise({ duration: 0.32, volume: 0.2, filterType: 'lowpass', filterFreq: 2200 });
      Audio.tone({ freq: 85, type: 'sine', duration: 0.28, volume: 0.16, attack: 0.02 });
    },
    ice() {
      Audio.tone({ freq: 1700, type: 'triangle', duration: 0.16, volume: 0.15 });
      Audio.tone({ freq: 2300, type: 'sine', duration: 0.18, volume: 0.1, delay: 0.04 });
    },
    electric() {
      Audio.sweep({ freqFrom: 2400, freqTo: 350, type: 'square', duration: 0.1, volume: 0.13 });
      Audio.noise({ duration: 0.06, volume: 0.08, filterType: 'highpass', filterFreq: 4000 });
    },
    poison() {
      Audio.noise({ duration: 0.28, volume: 0.16, filterType: 'bandpass', filterFreq: 350, Q: 1.8 });
    },
    blood() {
      Audio.noise({ duration: 0.11, volume: 0.18, filterType: 'highpass', filterFreq: 2200 });
    },
    heal() {
      Audio.tone({ freq: 660, type: 'sine', duration: 0.18, volume: 0.15 });
      Audio.tone({ freq: 880, type: 'sine', duration: 0.24, volume: 0.13, delay: 0.09 });
    },
    shield() {
      Audio.tone({ freq: 200, type: 'sine', duration: 0.3, volume: 0.14, attack: 0.05 });
      Audio.tone({ freq: 400, type: 'sine', duration: 0.25, volume: 0.08, attack: 0.05 });
    },
    dash() {
      Audio.noise({ duration: 0.14, volume: 0.15, filterType: 'highpass', filterFreq: 700 });
    },
    explosion() {
      Audio.noise({ duration: 0.4, volume: 0.28, filterType: 'lowpass', filterFreq: 850 });
      Audio.tone({ freq: 55, type: 'sine', duration: 0.32, volume: 0.26, attack: 0.01 });
    },
    projectile() {
      Audio.sweep({ freqFrom: 950, freqTo: 550, type: 'sine', duration: 0.07, volume: 0.09 });
    },
    melee() {
      Audio.noise({ duration: 0.08, volume: 0.13, filterType: 'highpass', filterFreq: 1500 });
    },
    hit(o = {}) {
      const jitter = (Math.random() - 0.5) * 30;
      Audio.noise({ duration: 0.06, volume: 0.13, filterType: 'lowpass', filterFreq: 1100 });
      Audio.tone({ freq: (o.crit ? 260 : 150) + jitter, type: 'triangle', duration: 0.08, volume: o.crit ? 0.2 : 0.11 });
    },
    death(o = {}) {
      const base = clamp(320 - (o.radius || 15) * 5, 60, 320);
      Audio.sweep({ freqFrom: base, freqTo: base * 0.28, type: 'sawtooth', duration: 0.32, volume: 0.16 });
      Audio.noise({ duration: 0.18, volume: 0.1, filterType: 'lowpass', filterFreq: 700, delay: 0.05 });
    },
    playerHit() {
      Audio.tone({ freq: 110, type: 'sine', duration: 0.16, volume: 0.2 });
      Audio.noise({ duration: 0.1, volume: 0.09, filterType: 'lowpass', filterFreq: 450 });
    },
    shieldBreak() {
      Audio.noise({ duration: 0.22, volume: 0.18, filterType: 'highpass', filterFreq: 2200 });
    },
    teleport() {
      Audio.sweep({ freqFrom: 280, freqTo: 1500, type: 'sine', duration: 0.26, volume: 0.15 });
    },
    trap() {
      Audio.noise({ duration: 0.15, volume: 0.2, filterType: 'bandpass', filterFreq: 1000 });
      Audio.tone({ freq: 180, type: 'square', duration: 0.1, volume: 0.1 });
    },
    uiClick() {
      Audio.tone({ freq: 700, type: 'square', duration: 0.045, volume: 0.08 });
    },
    uiSelect() {
      Audio.tone({ freq: 520, type: 'sine', duration: 0.07, volume: 0.09 });
      Audio.tone({ freq: 760, type: 'sine', duration: 0.08, volume: 0.07, delay: 0.04 });
    },
    wheelTick() {
      Audio.tone({ freq: 900, type: 'square', duration: 0.03, volume: 0.05 });
    },
    reward(o = {}) {
      const p = (o.rarityId != null ? o.rarityId : 0) / 9;
      Audio.tone({ freq: 500 + p * 700, type: 'sine', duration: 0.22, volume: 0.17 });
      Audio.tone({ freq: 750 + p * 900, type: 'sine', duration: 0.26, volume: 0.14, delay: 0.09 });
      if (p > 0.55) Audio.tone({ freq: 1100 + p * 700, type: 'sine', duration: 0.3, volume: 0.12, delay: 0.18 });
    },
    victory() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => Audio.tone({ freq: f, type: 'sine', duration: 0.35, volume: 0.15, delay: i * 0.11 }));
    },
    defeat() {
      [329.63, 293.66, 261.63].forEach((f, i) => Audio.tone({ freq: f, type: 'sine', duration: 0.42, volume: 0.15, delay: i * 0.15 }));
    },
  },
};

// Branche les sons sur le bus d'événements du combat (core/events.js) — même
// principe que les spécificités : on écoute, on ne modifie jamais l'état du jeu.
SFX.attach = function (game) {
  const tagSfx = {
    [TAGS.FEU]: 'fire', [TAGS.GLACE]: 'ice', [TAGS.ELECTRIQUE]: 'electric', [TAGS.POISON]: 'poison',
    [TAGS.SANG]: 'blood', [TAGS.SOINS]: 'heal', [TAGS.BOUCLIER]: 'shield', [TAGS.EXPLOSION]: 'explosion',
    [TAGS.DASH]: 'dash', [TAGS.MOUVEMENT]: 'dash', [TAGS.PROJECTILE]: 'projectile', [TAGS.CORPS_A_CORPS]: 'melee',
  };
  const priority = [TAGS.EXPLOSION, TAGS.FEU, TAGS.GLACE, TAGS.ELECTRIQUE, TAGS.POISON, TAGS.SANG, TAGS.SOINS, TAGS.BOUCLIER, TAGS.DASH, TAGS.MOUVEMENT, TAGS.PROJECTILE, TAGS.CORPS_A_CORPS];

  game.events.on(EVT.SKILL_USED, ({ skill }) => {
    const tag = priority.find(t => skill.tags.includes(t));
    SFX.play(tagSfx[tag] || 'projectile');
  });
  game.events.on(EVT.ENEMY_HIT, ({ isCrit, isDot }) => { if (!isDot) SFX.play('hit', { crit: isCrit }); });
  game.events.on(EVT.ENEMY_KILLED, ({ enemy }) => SFX.play('death', { radius: enemy.radius }));
  game.events.on(EVT.EXPLOSION_CREATED, () => SFX.play('explosion'));
  game.events.on(EVT.DASH_STARTED, () => SFX.play('dash'));
  game.events.on(EVT.SHIELD_BROKEN, () => SFX.play('shieldBreak'));
  game.events.on(EVT.PLAYER_HEALED, () => SFX.play('heal'));
  game.events.on(EVT.PLAYER_DAMAGED, () => SFX.play('playerHit'));
};
