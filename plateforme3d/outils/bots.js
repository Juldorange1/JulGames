// ============================================================================
// ASCENSION — outils/bots.js
// Bots de test du générateur, sans navigateur :
//   node plateforme3d/outils/bots.js        (rapport complet)
//   node plateforme3d/outils/bots.js 200    (nombre de parties à générer)
// Vérifie : déterminisme, vitesse, absence d'échec à l'infini, et mesure la
// vraie fenêtre de décollage (en images) selon la difficulté.
// ============================================================================
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const store = {};
global.window = global;
global.localStorage = { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = String(v); } };
global.document = { createElement: () => ({ getContext: () => null, style: {} }), addEventListener() {} };
global.navigator = { language: 'fr' };
for (const f of ['vendor/three.min.js', 'js/utils.js', 'js/storage.js', 'js/world.js', 'js/player.js', 'js/gen.js']) {
  vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
}
const AS = global.AS, Gen = AS.Gen;
module.exports = { AS, Gen };

function tRamp(t0, n) { return (k) => Math.min(1, t0 + (1 - t0) * Math.pow(k / n, 1.1)); }

function genStream(seed, tAt, count, opts) {
  const st = Gen.createStream(Object.assign({ seed, tAt }, opts || {}));
  const t0 = Date.now();
  let worst = 0, n = 0;
  while (st.sections.length < count) {
    const a = process.hrtime.bigint();
    st.pump(1e9, st.sections.length + 1);
    const ms = Number(process.hrtime.bigint() - a) / 1e6;
    worst = Math.max(worst, ms);
    n++;
    if (st.isFinished()) break;
  }
  return { st, ms: Date.now() - t0, worst };
}

// Rejoue toutes les touches sur la géométrie complète, sans élagage.
function replay(st) {
  const L = { collidables: [], crumbles: [], movers: [], triggers: [], windZones: [], gravityZones: [], bounceOrbs: [], orbitals: [], frame: 0 };
  const sim = { };
  const p = new AS.Player(L, st.spawn, { doubleJump: true, wallJump: true, dash: true });
  const inp = Gen.makeInput();
  for (const sec of st.sections) {
    for (const q of sec.pieces) {
      if (q.k === 'box') {
        const m = AS.World.simSolid(q);
        L.collidables.push(m.mesh);
        if (q.type === 'crumble') L.crumbles.push(m.mesh);
        if (m.mover) { m.mover.setTime(L.frame / 60); L.movers.push(m.mover); }
      } else if (q.k === 'orb') {
        L.bounceOrbs.push({ pos: new THREE.Vector3(q.x, q.y, q.z), radius: q.r, force: q.force });
      } else if (q.k === 'wind') {
        L.windZones.push({ min: new THREE.Vector3(...q.min), max: new THREE.Vector3(...q.max), force: new THREE.Vector3(...q.force) });
      } else if (q.k === 'lowgrav') {
        L.gravityZones.push({ min: new THREE.Vector3(...q.min), max: new THREE.Vector3(...q.max), scale: q.scale });
      } else if (q.k === 'phase') {
        const pa = new THREE.Vector3(...q.a), pb = new THREE.Vector3(...q.b), v = new THREE.Vector3(q.dir[0], 0, q.dir[1]);
        L.triggers.push({ type: 'phaseGate', pos: pa, dir: v, radius: q.radius, cooldown: 0, pairPos: pb });
        L.triggers.push({ type: 'phaseGate', pos: pb, dir: v.clone().negate(), radius: q.radius, cooldown: 0, pairPos: pa });
      }
    }
    for (const c of sec.codes) {
      Gen.decode(c, inp);
      p.update(1 / 60, inp);
      AS.World.stepLevel(L, p, 1 / 60);
      if (p.dead) return { ok: false, section: sec.index, y: p.position.y };
    }
    // Comme le jeu : les parties loin derrière ne restent pas en mémoire.
    if (L.collidables.length > 400) L.collidables.splice(0, L.collidables.length - 400);
    if (L.crumbles.length > 100) L.crumbles.splice(0, L.crumbles.length - 100);
    if (L.movers.length > 30) L.movers.splice(0, L.movers.length - 30);
  }
  return { ok: true, pos: p.position.clone() };
}

// Vraie fenêtre de décollage d'un saut : combien d'images de décalage de
// l'appui passent encore ? (avec un joueur qui garde le même programme de vol)
function jumpWindow(info) {
  const q = new AS.Player(info.level, new THREE.Vector3(), { doubleJump: true, wallJump: true, dash: true });
  const inp = Gen.makeInput();
  const fields = Object.keys(info.runStart);
  let ok = 0, early = 0, late = 0;
  const attempt = (delta) => {
    for (const f of fields) {
      if (q[f] && q[f].isVector3) q[f].copy(info.runStart[f]); else q[f] = info.runStart[f];
    }
    q.voidY = -1e9;
    const n = info.runLen + delta;
    if (n < 0) return false;
    for (let i = 0; i < n; i++) { Gen.decode(info.runDir, inp); q.update(1 / 60, inp); }
    for (const c of info.codes) {
      Gen.decode(c, inp); q.update(1 / 60, inp);
      if (q.dead) return false;
      if (q.groundObject === info.mesh) return true;
    }
    for (let i = 0; i < 30; i++) {
      Gen.decode(info.codes[info.codes.length - 1] & 15, inp); q.update(1 / 60, inp);
      if (q.dead) return false;
      if (q.groundObject === info.mesh) return true;
    }
    return false;
  };
  for (let d = 0; d <= 40 && attempt(d); d++) { ok++; late = d; }
  for (let d = -1; d >= -40 && attempt(d); d--) { ok++; early = -d; }
  return { ok, early, late };
}

// Joueur humain simulé : chaque appui (saut, double saut, dash) tombe avec une
// erreur gaussienne de sigma images. Renvoie sa chance de réussir ce saut.
function gauss(rng) { return Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng()); }
function humanHop(info, sigma, rng, tries) {
  const q = new AS.Player(info.level, new THREE.Vector3(), { doubleJump: true, wallJump: true, dash: true });
  const inp = Gen.makeInput();
  const fields = Object.keys(info.runStart);
  let wins = 0;
  for (let n = 0; n < tries; n++) {
    for (const f of fields) {
      if (q[f] && q[f].isVector3) q[f].copy(info.runStart[f]); else q[f] = info.runStart[f];
    }
    q.voidY = -1e9;
    const codes = Array.from(info.codes);
    for (let i = 1; i < info.codes.length; i++) {
      const c = info.codes[i];
      if (!(c & (Gen.EDGE | Gen.DASH))) continue;
      const bits = c & (Gen.EDGE | Gen.DASH);
      codes[i] &= ~bits;
      const j = Math.max(1, Math.min(codes.length - 1, i + Math.round(gauss(rng) * sigma)));
      codes[j] |= bits;
    }
    const delay = Math.max(-info.runLen, Math.round(gauss(rng) * sigma));
    for (let i = 0; i < info.runLen + delay; i++) { Gen.decode(info.runDir, inp); q.update(1 / 60, inp); }
    let ok = false;
    for (let i = 0; i < codes.length + 30 && !ok && !q.dead; i++) {
      Gen.decode(i < codes.length ? codes[i] : codes[codes.length - 1] & 15, inp);
      q.update(1 / 60, inp);
      if (q.groundObject === info.mesh) ok = true;
    }
    if (ok) wins++;
  }
  return wins / tries;
}

function measureHuman() {
  const rng = AS.Util.mulberry32(7);
  for (const sigma of [2.5, 1]) {
    console.log('--- humain, erreur sigma =', sigma, 'images ---');
    for (const t of [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]) {
      const list = [];
      const st = Gen.createStream({
        seed: 'humain-' + t, tAt: () => t,
        probe: (info) => { if (!info.air && info.runStart) list.push(humanHop(info, sigma, rng, 16)); },
      });
      st.pump(1e9, 5);
      const mean = list.reduce((a, b) => a + b, 0) / list.length;
      const perSection = list.length / 5;
      let logp = 0;
      for (const v of list) logp += Math.log(Math.max(v, 0.01));
      console.log('t=' + t, 'sauts', list.length, 'réussite moyenne', (mean * 100).toFixed(0) + '%',
        'partie sans mourir', (Math.exp(logp / 5) * 100).toFixed(3) + '%', '(' + perSection.toFixed(0) + ' sauts/partie)');
    }
  }
}

function measureWindows() {
  const buckets = {};
  for (const t of [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]) {
    const list = [];
    const st = Gen.createStream({
      seed: 'fenetre-' + t, tAt: () => t,
      probe: (info) => { if (!info.air && info.runStart) list.push(jumpWindow(info).ok); },
    });
    st.pump(1e9, 6);
    list.sort((a, b) => a - b);
    buckets[t] = { n: list.length, med: list[list.length >> 1], p10: list[Math.floor(list.length * 0.1)], p90: list[Math.floor(list.length * 0.9)] };
    console.log('t=' + t, 'sauts', list.length, 'fenêtre médiane', buckets[t].med, 'images  (10% :', buckets[t].p10, ', 90% :', buckets[t].p90 + ')');
  }
}

function hashStream(st) {
  let h = 2166136261;
  for (const sec of st.sections) {
    for (const c of sec.codes) h = Math.imul(h ^ c, 16777619);
    h = Math.imul(h ^ sec.pieces.length, 16777619);
  }
  return h >>> 0;
}

function testChallenges() {
  const list = Gen.challenges(new Date(2026, 10, 5));
  let bad = 0;
  for (const ch of list) {
    const t0 = Date.now();
    const st = Gen.createStream(Gen.challengeOptions(ch));
    st.pump(1e9, 1e6);
    const seconds = st.totalFrames() / 60;
    const rep = replay(st);
    const min = ch.group === 'day' ? 60 : 480;
    const ok = rep.ok && seconds >= min && st.isFinished();
    if (!ok) bad++;
    console.log(ok ? 'ok ' : 'KO ', ch.id.padEnd(24), 'bot', (seconds / 60).toFixed(1) + 'min', 'parties', st.sections.length, 'génération', (Date.now() - t0) + 'ms', 'secours', st.stats.rescues, 'rejeu', rep.ok ? 'OK' : 'MORT');
  }
  // Même graine = même défi, pour tout le monde.
  const again = list[1];
  const a = Gen.createStream(Gen.challengeOptions(again)); a.pump(1e9, 4);
  const b = Gen.createStream(Gen.challengeOptions(again)); b.pump(1e9, 4);
  const sa = { sections: a.sections.slice(0, 4) }, sb = { sections: b.sections.slice(0, 4) };
  console.log('déterminisme', hashStream(sa) === hashStream(sb) ? 'OK' : 'KO');
  console.log(bad ? bad + ' défi(s) en échec' : 'tous les défis sont bons');
}

function testRules() {
  const R = AS.Storage.RULE_DEFAULTS;
  const variants = [
    { name: 'lent', maxSpeed: 6, jumpVel: 11 }, { name: 'rapide', maxSpeed: 22, boostMaxSpeed: 34 },
    { name: 'lunaire', gravityRise: -9, gravityFall: -12 }, { name: 'lourd', gravityRise: -40, gravityFall: -60, jumpVel: 22 },
    { name: 'sans dash', dashCharges: 0 }, { name: 'glace extrême', iceFriction: 0.2, iceAccel: 3 },
  ];
  for (const v of variants) {
    AS.World.applyRules(Object.assign({}, R, v));
    const r = genStream('regles-' + v.name, tRamp(0.1, 12), 12);
    const rep = replay(r.st);
    console.log('règles', v.name.padEnd(14), 'parties', r.st.sections.length, r.ms + 'ms', 'secours', r.st.stats.rescues, 'rejeu', rep.ok ? 'OK' : 'MORT partie ' + rep.section);
  }
  AS.World.applyRules(R);
}

if (require.main === module) {
  if (process.argv[2] === 'defis') { testChallenges(); process.exit(0); }
  if (process.argv[2] === 'regles') { testRules(); process.exit(0); }
  if (process.argv[2] === 'fenetres') { measureWindows(); process.exit(0); }
  if (process.argv[2] === 'humain') { measureHuman(); process.exit(0); }
  const count = +process.argv[2] || 60;
  console.log('--- génération (' + count + ' parties par flux) ---');
  for (const [name, t0, n] of [['D1', 0, 45], ['D2', 0.18, 35], ['D3', 0.36, 26], ['D4', 0.55, 16]]) {
    const r = genStream('bot-' + name, tRamp(t0, n), count, { debug: true });
    const frames = r.st.totalFrames();
    const rep = replay(r.st);
    console.log(name, 'parties', r.st.sections.length, 'en', r.ms + 'ms', 'pire', r.worst.toFixed(0) + 'ms', 'moy', (r.ms / r.st.sections.length).toFixed(0) + 'ms',
      'durée bot', (frames / 3600).toFixed(1) + 'min', 'secours', r.st.stats.rescues, 'essais', r.st.stats.attempts, 'échecs modules', r.st.stats.modFails,
      'rejeu', rep.ok ? 'OK' : 'MORT partie ' + rep.section);
    console.log('   modules', JSON.stringify(r.st.stats.mods));
    console.log('   échecs', JSON.stringify(r.st.stats.fail || {}), 'lignes', JSON.stringify(r.st.stats.where || {}));
  }
}
