'use strict';
/* Petits sons synthétisés (WebAudio), coupables dans le menu. */
const Sfx = (() => {
  let ctx = null, master = null;
  let muted = false;
  try { muted = localStorage.getItem('binome_muet') === '1'; } catch (e) { }
  function ac() {
    if (muted) return null;
    if (!ctx) {
      const A = window.AudioContext || window.webkitAudioContext; if (!A) return null;
      ctx = new A(); master = ctx.createGain(); master.gain.value = 0.35; master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(f, dur, type, vol, slide, delay) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, freq, q, delay) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + (delay || 0);
    const len = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource(); s.buffer = b;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 1200; f.Q.value = q || 0.8;
    const g = c.createGain(); g.gain.value = vol || 0.3;
    s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }
  return {
    get muted() { return muted; },
    setMuted(v) { muted = v; try { localStorage.setItem('binome_muet', v ? '1' : '0'); } catch (e) { } if (v && ctx) ctx.suspend(); },
    click() { tone(660, 0.05, 'triangle', 0.12); },
    select() { tone(520, 0.06, 'triangle', 0.15); tone(780, 0.06, 'triangle', 0.1, null, 0.04); },
    step() { noise(0.04, 0.08, 500, 1.5); },
    swing() { noise(0.12, 0.25, 2200, 0.7); },
    shoot(k) { if (k === 'eclat' || k === 'gel' || k === 'foudre') { tone(1200, 0.12, 'sine', 0.15, 2); } else { noise(0.08, 0.2, 3200, 1); tone(900, 0.07, 'square', 0.05, 0.5); } },
    dash() { noise(0.18, 0.2, 900, 0.6); },
    spin() { noise(0.25, 0.22, 1600, 0.5); tone(300, 0.2, 'sawtooth', 0.05, 2); },
    swap() { tone(400, 0.1, 'sine', 0.15, 2); tone(800, 0.1, 'sine', 0.12, 0.5, 0.08); },
    hit() { noise(0.08, 0.3, 900, 1); },
    enemyHit() { noise(0.1, 0.3, 700, 1); tone(140, 0.12, 'square', 0.08, 0.6); },
    enemyShoot() { noise(0.07, 0.15, 2600, 1); },
    hurt() { tone(220, 0.18, 'sawtooth', 0.15, 0.5); noise(0.1, 0.2, 500, 1); },
    block() { tone(1400, 0.12, 'triangle', 0.14, 0.7); },
    kill() { tone(330, 0.15, 'triangle', 0.15, 0.5); noise(0.15, 0.2, 1200, 0.6); },
    boom(small) { noise(small ? 0.25 : 0.45, small ? 0.3 : 0.5, 180, 0.6); tone(90, small ? 0.2 : 0.4, 'sine', 0.3, 0.4); },
    thud() { tone(110, 0.12, 'sine', 0.3, 0.5); noise(0.06, 0.2, 400, 1); },
    fall() { tone(500, 0.45, 'sine', 0.15, 0.15); },
    trap() { tone(900, 0.06, 'square', 0.08); tone(600, 0.08, 'square', 0.08, null, 0.05); },
    zap() { noise(0.15, 0.25, 4000, 2); tone(1600, 0.1, 'sawtooth', 0.06, 0.3); },
    vortex() { tone(200, 0.4, 'sine', 0.15, 3); noise(0.4, 0.15, 800, 0.5); },
    taunt() { tone(180, 0.3, 'sawtooth', 0.12, 1.5); },
    order() { tone(660, 0.08, 'triangle', 0.15); tone(990, 0.12, 'triangle', 0.15, null, 0.08); },
    heal() { tone(700, 0.15, 'sine', 0.1, 1.5); },
    summon() { tone(260, 0.3, 'triangle', 0.12, 1.8); },
    ghost() { tone(800, 0.25, 'sine', 0.08, 0.4); },
    mark() { tone(1000, 0.08, 'square', 0.07); tone(1000, 0.08, 'square', 0.07, null, 0.12); },
    laser() { tone(1800, 0.35, 'sawtooth', 0.08, 0.2); noise(0.3, 0.2, 3000, 1); },
    win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.13, null, i * 0.08)); },
    fail() { [392, 330, 262].forEach((f, i) => tone(f, 0.25, 'triangle', 0.13, null, i * 0.12)); },
    gold() { [988, 1318].forEach((f, i) => tone(f, 0.12, 'triangle', 0.12, null, i * 0.07)); },
    door() { tone(180, 0.3, 'sine', 0.2, 1.5); noise(0.3, 0.1, 600, 0.6); },
  };
})();
