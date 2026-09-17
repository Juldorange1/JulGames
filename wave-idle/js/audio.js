// Effets sonores et musique d'ambiance générés en WebAudio (aucun fichier externe requis).
const Audio2 = (() => {
  let ctx = null;
  let muted = false;
  let sfxVol = 0.8;
  let musicVol = 0.45;
  let musicNodes = null;
  let musicTimer = null;

  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function sfxGain() { return muted ? 0 : sfxVol; }

  function tone(freq, dur, type, gainVal, delay, glide) {
    const g = sfxGain();
    if (g <= 0) return;
    const c = ensureCtx();
    const t0 = c.currentTime + (delay || 0);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (glide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + glide), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(gainVal * g, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, gainVal, delay) {
    const g = sfxGain();
    if (g <= 0) return;
    const c = ensureCtx();
    const t0 = c.currentTime + (delay || 0);
    const bufferSize = Math.floor(c.sampleRate * dur);
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = c.createBufferSource();
    src.buffer = buffer;
    const gain = c.createGain();
    gain.gain.setValueAtTime(gainVal * g, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    src.connect(filter).connect(gain).connect(c.destination);
    src.start(t0);
  }

  function updateMusicGain() {
    if (!musicNodes) return;
    const c = ensureCtx();
    const target = muted ? 0 : musicVol * 0.16;
    musicNodes.master.gain.setTargetAtTime(target, c.currentTime, 0.15);
  }

  const PENTA = [220, 246.94, 293.66, 329.63, 392, 440, 523.25];

  function scheduleArpeggio() {
    if (!musicNodes) return;
    const c = ensureCtx();
    if (!muted && musicVol > 0) {
      const note = PENTA[Math.floor(Math.random() * PENTA.length)];
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'triangle';
      osc.frequency.value = note * (Math.random() < 0.3 ? 2 : 1);
      const t0 = c.currentTime;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.5, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
      osc.connect(g).connect(musicNodes.master);
      osc.start(t0);
      osc.stop(t0 + 1);
    }
    musicTimer = setTimeout(scheduleArpeggio, 480 + Math.random() * 340);
  }

  return {
    setMuted(v) { muted = v; updateMusicGain(); },
    isMuted() { return muted; },
    setSfxVolume(v) { sfxVol = Math.max(0, Math.min(1, v)); },
    setMusicVolume(v) { musicVol = Math.max(0, Math.min(1, v)); updateMusicGain(); },
    unlock() { ensureCtx(); },
    flip(up) { tone(up ? 560 : 340, 0.055, 'square', 0.05); tone(up ? 840 : 240, 0.05, 'sine', 0.02, 0.01); },
    hop() { tone(520, 0.07, 'sine', 0.07, 0, 180); },
    portal() {
      [0, 0.05, 0.1].forEach((d, i) => tone(300 * Math.pow(1.5, i), 0.16, 'triangle', 0.07, d));
    },
    perfect() { tone(880, 0.09, 'sine', 0.09); tone(1320, 0.12, 'sine', 0.06, 0.03); tone(1760, 0.14, 'sine', 0.04, 0.07); },
    coin() {
      tone(988, 0.05, 'square', 0.07); tone(1480, 0.09, 'sine', 0.07, 0.045);
      tone(1760, 0.14, 'sine', 0.05, 0.09); tone(2200, 0.16, 'sine', 0.04, 0.13);
    },
    combo(tier) { tone(600 + Math.min(tier, 30) * 18, 0.06, 'triangle', 0.045); },
    collision() { noise(0.4, 0.4); tone(90, 0.32, 'sawtooth', 0.14, 0, -60); tone(55, 0.4, 'sine', 0.1, 0.03, -20); },
    purchase() { tone(700, 0.06, 'square', 0.06); tone(1000, 0.08, 'square', 0.05, 0.05); },
    upgrade() { tone(500, 0.08, 'sine', 0.06); tone(750, 0.1, 'sine', 0.06, 0.06); tone(1000, 0.14, 'sine', 0.06, 0.12); },
    ascend() {
      [0, 0.09, 0.18, 0.3].forEach((d, i) => tone(440 * Math.pow(1.26, i), 0.28, 'sine', 0.07, d));
    },
    speedUp() { tone(300, 0.16, 'sawtooth', 0.07, 0, 260); },
    uiClick() { tone(500, 0.045, 'square', 0.035); },
    startMusic() {
      if (musicNodes) return;
      const c = ensureCtx();
      const master = c.createGain();
      master.gain.value = 0;
      master.connect(c.destination);
      const notes = [110, 130.81, 146.83, 164.81];
      const oscs = notes.map((f) => {
        const osc = c.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f;
        const g = c.createGain();
        g.gain.value = 0.5;
        osc.connect(g).connect(master);
        osc.start();
        return osc;
      });
      musicNodes = { master, oscs };
      updateMusicGain();
      scheduleArpeggio();
    },
    stopMusic() {
      if (musicTimer) { clearTimeout(musicTimer); musicTimer = null; }
      if (!musicNodes) return;
      musicNodes.oscs.forEach(o => { try { o.stop(); } catch (e) {} });
      musicNodes.master.disconnect();
      musicNodes = null;
    },
  };
})();
