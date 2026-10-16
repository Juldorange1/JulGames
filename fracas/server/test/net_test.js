'use strict';
// Tests reseau de bout en bout : le serveur est lance dans un PROCESSUS SEPARE et des clients
// WebSocket reels (bots) s'y connectent, creent/rejoignent des lobbys, choisissent leurs persos
// et jouent des parties completes en envoyant des entrees comme un vrai joueur.
//   node test/net_test.js            (tous les scenarios)
//   node test/net_test.js foot       (un seul)
// Les reglages sont accelerees (MP_OVERRIDES) pour que les parties durent quelques secondes.

const { spawn } = require('node:child_process');
const path = require('node:path');
const WebSocket = require('ws');
const { netApplySnapshot } = require('../../js/net/net_delta.js');

const PORT = 8799;
const URL = `ws://127.0.0.1:${PORT}/ws`;
const PROTOCOL = 1;
const OVERRIDES = {
  ROUND_TIME: 25, COUNTDOWN: 0.5, ROUND_END_PAUSE: 0.8, PVP_DAMAGE_TO_PERCENT: 0.6,
  FOOT_TIME: 45, FOOT_GOALS_TO_WIN: 2, FOOT_RESPAWN_DELAY: 1, SUDDEN_DEATH_AT: 20,
  RECONNECT_GRACE_MS: 3000, CAPZONE_TIME: 1,
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? '  OK  ' : '  ECHEC'} ${name}${detail ? ' — ' + detail : ''}`);
}

// ---------------- serveur ----------------
function startServer(extraEnv) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['index.js'], {
      cwd: path.join(__dirname, '..'),
      env: Object.assign({}, process.env, { PORT: String(PORT), LOG_LEVEL: 'info', MP_OVERRIDES: JSON.stringify(OVERRIDES) }, extraEnv || {}),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    const onData = (d) => { out += d; if (out.includes('pret')) resolve(child); };
    child.stdout.on('data', onData);
    child.stderr.on('data', (d) => process.stderr.write('[serveur] ' + d));
    child.on('exit', (code) => { if (!out.includes('pret')) reject(new Error('serveur arrete ' + code)); });
    setTimeout(() => reject(new Error('serveur trop long a demarrer')), 8000);
  });
}

// ---------------- bot ----------------
class Bot {
  constructor(name) {
    this.name = name; this.state = {}; this.lastN = 0; this.desyncs = 0; this.snaps = 0; this.events = 0;
    this.g = null; this.lobby = null; this.result = null; this.matchStarts = 0; this.errors = [];
    this.seq = 0; this.strategy = null; this.timer = null; this.frame = 0; this.stuck = { t: 0, x: 0, y: 0, until: 0, dir: null };
    this.snapLog = new Map(); // n -> positions des joueurs (verification de coherence entre clients)
  }
  connect(token) {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(URL);
      this.ws.on('open', () => this.send({ t: 'hello', v: PROTOCOL, name: this.name, token }));
      this.ws.on('message', (raw) => {
        const m = JSON.parse(raw.toString());
        this.onMessage(m);
        if (m.t === 'welcome') resolve(this);
      });
      this.ws.on('error', reject);
      this.ws.on('close', () => { this.closed = true; });
    });
  }
  send(o) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(o)); }
  close() { this.stopInputs(); try { this.ws.close(); } catch (e) { /* */ } }
  onMessage(m) {
    switch (m.t) {
      case 'welcome': this.id = m.you.id; this.token = m.token; break;
      case 'lobby.state': this.lobby = m.lobby; break;
      case 'lobby.left': this.lobby = null; break;
      case 'error': this.errors.push(m.code); break;
      case 'match.start': this.matchStarts++; this.state = {}; this.lastN = 0; this.room = m.room; this.result = null; this.roster = m.roster; break;
      case 'sp': this.send({ t: 'spr', s: m.s }); break;
      case 's': {
        if (!m.kf && this.lastN && m.n !== this.lastN + 1) { this.desyncs++; this.send({ t: 'resync' }); }
        const r = netApplySnapshot(this.state, m);
        if (r.desync) { this.desyncs++; this.send({ t: 'resync' }); }
        this.state = r.state; this.lastN = m.n; this.snaps++;
        if (m.g) this.g = m.g;
        if (m.rm) this.room = m.rm;
        if (m.ev) this.events += m.ev.length;
        if (m.pings) this.pings = m.pings;
        const P = this.state.P;
        if (P) this.snapLog.set(m.n, JSON.stringify([...P.values()].map((p) => [p.id, Math.round(p.x), Math.round(p.y), p.dead ? 1 : 0]).sort()));
        break;
      }
      case 'match.end': this.result = m.result; this.g = m.g; break;
      default: break;
    }
  }
  me() { return this.state.P ? this.state.P.get('p_' + this.id) : null; }
  list(cat) { return this.state[cat] ? [...this.state[cat].values()] : []; }
  startInputs(strategy) {
    this.strategy = strategy;
    this.stopInputs();
    this.timer = setInterval(() => this.inputTick(), 16);
  }
  stopInputs() { if (this.timer) clearInterval(this.timer); this.timer = null; }
  inputTick() {
    this.frame++;
    const me = this.me();
    if (!me || me.dead) { this.send({ t: 'in', i: [++this.seq, 0, 0, 0, 0, 0] }); return; }
    const o = this.strategy(this, me) || {};
    let mx = o.mx || 0, my = o.my || 0;
    // anti-blocage : si on ne bouge plus, direction aleatoire un court instant
    const now = Date.now();
    if (Math.hypot(me.x - this.stuck.x, me.y - this.stuck.y) > 6) { this.stuck.x = me.x; this.stuck.y = me.y; this.stuck.t = now; }
    else if (now - this.stuck.t > 700 && (mx || my)) { this.stuck.until = now + 450; this.stuck.dir = [Math.cos(Math.random() * 6.28), Math.sin(Math.random() * 6.28)]; this.stuck.t = now; }
    if (now < this.stuck.until) { mx = this.stuck.dir[0]; my = this.stuck.dir[1]; }
    let bits = 0;
    if (o.attack) bits |= 1;
    if (o.attackEdge && this.frame % 2 === 0) bits |= 1;
    if (o.a1 && this.frame % 150 === 0) bits |= 4;
    if (o.a2 && this.frame % 190 === 0) bits |= 16;
    if (o.a3 && this.frame % 230 === 0) bits |= 64;
    this.send({ t: 'in', i: [++this.seq, mx, my, o.ax != null ? o.ax : me.x + 50, o.ay != null ? o.ay : me.y, bits] });
  }
}

function toward(me, x, y, stopAt) {
  const dx = x - me.x, dy = y - me.y, d = Math.hypot(dx, dy) || 1;
  if (d < (stopAt || 0)) return { mx: 0, my: 0 };
  return { mx: dx / d, my: dy / d };
}
const hunt = (bot, me) => {
  const foes = bot.list('P').filter((p) => !p.dead && p.team !== me.team);
  foes.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
  const t = foes[0];
  if (!t) return { attack: true };
  return Object.assign(toward(me, t.x, t.y, 120), { ax: t.x, ay: t.y, attack: true, a1: true, a2: true, a3: true });
};
const crystalHunter = (bot, me) => {
  const c = bot.list('E').find((e) => e.kind === 'crystal' && e.team !== me.team && !e.dead);
  if (!c) return hunt(bot, me);
  return Object.assign(toward(me, c.x, c.y, 70), { ax: c.x, ay: c.y, attack: true });
};
const hideInCorner = (bot, me) => {
  const b = bot.room.bounds;
  return toward(me, me.team === 'A' ? b.x + 40 : b.x + b.w - 40, b.y + 40, 10);
};
const enemyHunter = (bot, me) => {
  const foes = bot.list('E').filter((e) => !e.dead && e.kind !== 'crystal');
  foes.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
  const t = foes[0];
  // salle videe : on traverse la porte de sortie (bord droit)
  if (!t) { const ex = bot.g && bot.g.exit; return ex && ex.open ? toward(me, ex.x + 30, ex.y) : {}; }
  return Object.assign(toward(me, t.x, t.y, 110), { ax: t.x, ay: t.y, attack: true, a1: true, a2: true, a3: true });
};
const footPlayer = (bot, me) => {
  const g = bot.g && bot.g.goals;
  if (!g) return {};
  const foeGoal = me.team === 'A' ? g.B : g.A;
  const balls = bot.list('B');
  const mine = balls.find((b) => b.holderId === me.id);
  if (mine) {
    const gx = foeGoal.x + foeGoal.w / 2, gy = foeGoal.y + foeGoal.h / 2;
    const d = Math.hypot(gx - me.x, gy - me.y);
    return Object.assign(toward(me, gx, gy), { ax: gx, ay: gy, attackEdge: d < 380 });
  }
  const free = balls.filter((b) => !b.holderId && !b.hidden);
  free.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
  if (free[0]) return Object.assign(toward(me, free[0].x, free[0].y), { ax: free[0].x, ay: free[0].y });
  return hunt(bot, me);
};
const camper = (bot, me) => {
  const z = bot.list('C').filter((c) => c.active)[0];
  if (!z) return hunt(bot, me);
  return Object.assign(toward(me, z.x, z.y, 8), { ax: z.x + 100, ay: z.y });
};

async function waitFor(pred, ms, label) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (pred()) return true; await sleep(30); }
  console.log(`       (delai depasse : ${label})`);
  return false;
}

async function makeLobby(mode, chars, extra) {
  const bots = [];
  for (let i = 0; i < chars.length; i++) bots.push(await new Bot(`${mode}-${i}`).connect());
  bots[0].send({ t: 'lobby.create', mode });
  await waitFor(() => bots[0].lobby, 3000, 'lobby cree');
  const code = bots[0].lobby.code;
  for (let i = 1; i < bots.length; i++) bots[i].send({ t: 'lobby.join', code });
  await waitFor(() => bots.every((b) => b.lobby && b.lobby.players.length === chars.length), 3000, 'tous dans le lobby');
  bots.forEach((b, i) => b.send({ t: 'lobby.char', c: chars[i] }));
  await sleep(150);
  bots.forEach((b) => b.send({ t: 'lobby.ready', ready: true }));
  await waitFor(() => bots[0].lobby && bots[0].lobby.canStart, 3000, 'lobby pret');
  return { bots, code };
}
async function launch(bots) {
  bots[0].send({ t: 'lobby.start' });
  return waitFor(() => bots.every((b) => b.matchStarts > 0 && b.snaps > 3), 5000, 'debut de partie');
}
function teamOf(bot) { return bot.lobby.players.find((p) => p.id === bot.id).team; }
function consistent(bots) {
  // pour chaque snapshot recu par tous, les positions des joueurs doivent etre IDENTIQUES
  let compared = 0, diff = 0;
  for (const [n, s] of bots[0].snapLog) {
    for (const b of bots.slice(1)) { const o = b.snapLog.get(n); if (o == null) continue; compared++; if (o !== s) diff++; }
  }
  return { compared, diff };
}

// ---------------- scenarios ----------------
const SCENARIOS = {
  async versus1() {
    console.log('\n[Versus 1v1] elimination + round 2 avec persos echanges');
    const { bots } = await makeLobby('versus1', [1, 9]);
    check('lobby : 2 joueurs, equipes A/B', bots[0].lobby.players.map((p) => p.team).sort().join('') === 'AB');
    await launch(bots);
    bots.forEach((b) => b.startInputs(hunt));
    await waitFor(() => bots[0].g && bots[0].g.round === 2, 40000, 'round 2');
    const r1 = bots[0].g.roundResults[0];
    check('round 1 termine', !!r1, r1 && `gagnant ${r1.winner} (${r1.reason})`);
    // pendant le round 1 : aucune reapparition (un mort reste mort)
    const ros = bots[0].g.roster;
    const a = ros.find((r) => r.team === 'A'), b = ros.find((r) => r.team === 'B');
    check('round 2 : persos echanges (A prend celui de B et inversement)', a.c2 === b.c1 && b.c2 === a.c1, `A ${a.c1}->${a.c2}, B ${b.c1}->${b.c2}`);
    await waitFor(() => bots[0].list('P').every((p) => !p.dead) && bots[0].g.phase === 'playing', 5000, 'round 2 en jeu');
    const p2 = bots[0].list('P');
    check('round 2 : les joueurs utilisent bien les persos echanges', p2.every((p) => { const r = ros.find((x) => 'p_' + x.netId === p.id); return r && p.characterId === r.c2; }));
    await waitFor(() => bots.every((x) => x.result), 40000, 'fin de partie');
    check('resultat de partie recu par les 2 clients', bots.every((x) => x.result && x.result.kind === 'versus'), JSON.stringify(bots[0].result && bots[0].result.roundWins));
    const c = consistent(bots);
    check('les 2 clients voient la meme realite (positions identiques)', c.compared > 100 && c.diff === 0, `${c.compared} snapshots compares, ${c.diff} differences`);
    check('aucune desynchronisation de delta', bots.every((x) => x.desyncs === 0));
    bots.forEach((x) => x.close());
  },

  async versusNoRespawn() {
    console.log('\n[Versus 1v1] victoire par cristal + absence de reapparition');
    const { bots } = await makeLobby('versus1', [3, 5]);
    await launch(bots);
    const A = bots.find((x) => teamOf(x) === 'A'), B = bots.find((x) => teamOf(x) === 'B');
    A.startInputs(crystalHunter); B.startInputs(hideInCorner);
    await waitFor(() => A.g && A.g.roundResults && A.g.roundResults.length >= 1, 30000, 'fin du round 1');
    const r = A.g.roundResults[0];
    check('victoire du round par destruction du cristal', r && r.winner === 'A' && r.reason === 'crystal', JSON.stringify(r));
    // elimination sans reapparition : on tue B au round 2 et on verifie qu'il ne revient pas
    A.startInputs(hunt); B.startInputs(hideInCorner);
    await waitFor(() => A.g.round === 2 && A.g.phase === 'playing', 8000, 'round 2');
    await waitFor(() => A.list('P').some((p) => p.dead) || A.result, 30000, 'un mort');
    const deadId = (A.list('P').find((p) => p.dead) || {}).id;
    await sleep(1500);
    const stillDead = !deadId || (A.list('P').find((p) => p.id === deadId) || { dead: true }).dead || A.result;
    check('mort en Versus : pas de reapparition', deadId && stillDead);
    await waitFor(() => bots.every((x) => x.result), 20000, 'fin');
    check('victoire par elimination au round 2', A.result && A.result.rounds.some((x) => x.reason === 'elimination'), JSON.stringify(A.result && A.result.rounds));
    bots.forEach((x) => x.close());
  },

  async versus2() {
    console.log('\n[Versus 2v2] 4 clients, tirage aleatoire serveur des persos au round 2');
    const { bots } = await makeLobby('versus2', [1, 2, 9, 8]);
    const teams = bots.map(teamOf);
    check('lobby 2v2 : 2 joueurs par equipe', teams.filter((t) => t === 'A').length === 2 && teams.filter((t) => t === 'B').length === 2, teams.join(''));
    await launch(bots);
    bots.forEach((b) => b.startInputs(hunt));
    await waitFor(() => bots[0].g && bots[0].g.round === 2, 45000, 'round 2');
    const ros = bots[0].g.roster;
    const setOf = (t, k) => ros.filter((r) => r.team === t).map((r) => r[k]).sort().join(',');
    check('equipe A recoit les 2 persos de B', setOf('A', 'c2') === setOf('B', 'c1'), `A: ${setOf('A', 'c2')} / B round1: ${setOf('B', 'c1')}`);
    check('equipe B recoit les 2 persos de A', setOf('B', 'c2') === setOf('A', 'c1'));
    const same = bots.every((b) => JSON.stringify(b.g.roster.map((r) => [r.netId, r.c2])) === JSON.stringify(ros.map((r) => [r.netId, r.c2])));
    check('tous les clients ont exactement le meme tirage', same);
    await waitFor(() => bots.every((x) => x.result), 45000, 'fin');
    check('fin de partie 2v2', bots.every((x) => x.result), JSON.stringify(bots[0].result && bots[0].result.roundWins));
    const c = consistent(bots);
    check('4 clients synchronises', c.diff === 0 && c.compared > 200, `${c.compared} comparaisons`);
    bots.forEach((x) => x.close());
  },

  async foot() {
    console.log('\n[Foot 2v2] 2 ballons, possession, lancer, buts, vitesse, mort a 40%, reapparition dans sa cage');
    const { bots } = await makeLobby('foot', [1, 9, 2, 8]);
    await launch(bots);
    check('2 ballons au centre', bots[0].list('B').length === 2 && bots[0].list('B').every((b) => Math.abs(b.x) < 5));
    const obst0 = new Map(bots[0].list('O').map((o) => [String(o.id), { x: o.x, y: o.y }]));
    const byTeam = { A: bots.filter((b) => teamOf(b) === 'A'), B: bots.filter((b) => teamOf(b) === 'B') };
    byTeam.A[0].startInputs(footPlayer); byTeam.B[0].startInputs(footPlayer);
    byTeam.A[1].startInputs(hunt); byTeam.B[1].startInputs(hunt);
    let sawHolder = false, sawDeath = null, respawnOk = false, minSpeed = 1;
    const watcher = setInterval(() => {
      const bot = bots[0];
      if (bot.list('B').some((b) => b.holderId)) sawHolder = true;
      for (const p of bot.list('P')) {
        if (!p.dead) minSpeed = Math.min(minSpeed, p.speedPct);
        if (p.dead && !sawDeath) sawDeath = { id: p.id, team: p.team };
        if (sawDeath && !p.dead && p.id === sawDeath.id && !respawnOk) {
          const goal = bot.g.goals[p.team];
          respawnOk = Math.abs(p.x - (goal.x + goal.w / 2)) < 60 && p.speedPct === 1;
          if (respawnOk) sawDeath.respawn = { x: Math.round(p.x), speed: p.speedPct };
        }
      }
    }, 20);
    await waitFor(() => bots.every((x) => x.result), 60000, 'fin du foot');
    clearInterval(watcher);
    check('possession d\'un ballon observee', sawHolder);
    check('les coups baissent la vitesse (% de vitesse)', minSpeed < 1, `vitesse min vue ${minSpeed}`);
    check('mort a 40% de vitesse', !!sawDeath, sawDeath && JSON.stringify(sawDeath));
    check('reapparition a 100% dans sa propre cage', respawnOk);
    const r = bots[0].result;
    check('buts marques et partie gagnee', r && r.score && (r.score.A + r.score.B) >= 1, JSON.stringify(r));
    const moved = bots[0].list('O').filter((o) => { const s0 = obst0.get(String(o.id)); return s0 && (Math.abs(s0.x - o.x) > 1 || Math.abs(s0.y - o.y) > 1); }).length;
    check('murs mobiles en mouvement au Foot (toujours presents : 2x plus frequents)', moved >= 1, `${moved} mur(s) mobile(s) sur ${bots[0].list('O').length} obstacles`);
    bots.forEach((x) => x.close());
  },

  async survivor() {
    console.log('\n[Survivant] 4 joueurs, chacun pour soi, zones +15%, dernier vivant');
    const { bots } = await makeLobby('survivor', [1, 9, 11, 7]);
    await launch(bots);
    const teams = new Set(bots[0].list('P').map((p) => p.team));
    check('4 joueurs independants (4 equipes)', teams.size === 4);
    check('zones mobiles de soin presentes', bots[0].list('C').length >= 1);
    bots[0].startInputs(camper);
    bots.slice(1).forEach((b) => b.startInputs(hunt));
    let maxMult = 0;
    const w = setInterval(() => { for (const p of bots[0].list('P')) if (!p.dead) maxMult = Math.max(maxMult, p.damageMultiplier); }, 30);
    await waitFor(() => maxMult > 1.0001, 15000, 'depasse 100%');
    check('zone : +15% et depassement de 100%', maxMult > 1.0001, `max ${Math.round(maxMult * 100)}%`);
    bots[0].startInputs(hunt);
    await waitFor(() => bots.every((x) => x.result), 60000, 'dernier survivant');
    clearInterval(w);
    const r = bots[0].result;
    check('un gagnant (dernier vivant) + classement', r && r.winners && r.winners.length >= 1 && r.placements.length === 4, JSON.stringify(r));
    bots.forEach((x) => x.close());
  },

  async disconnect() {
    console.log('\n[Deconnexions] reconnexion pendant la partie, puis abandon');
    const { bots } = await makeLobby('versus1', [6, 10]);
    await launch(bots);
    bots.forEach((b) => b.startInputs(hideInCorner));
    await sleep(800);
    const B = bots[1];
    const token = B.token, id = B.id;
    B.close();
    await sleep(600);
    const B2 = await new Bot('retour').connect(token);
    check('reconnexion : meme identite', B2.id === id);
    await waitFor(() => B2.matchStarts > 0 && B2.snaps > 3, 4000, 'reprise');
    check('reconnexion : la partie reprend (keyframe recue)', B2.snaps > 3 && B2.me() != null);
    // abandon : on ferme sans revenir -> apres le delai de grace, l'autre equipe gagne
    B2.close();
    await waitFor(() => bots[0].result, 12000, 'victoire par abandon');
    check('abandon : la partie ne reste pas bloquee (victoire de l\'autre equipe)', bots[0].result && bots[0].result.winner === teamOf(bots[0]), JSON.stringify(bots[0].result));
    bots[0].close();
  },

  async parallel() {
    console.log('\n[Serveur] 2 parties independantes en meme temps');
    const [l1, l2] = await Promise.all([makeLobby('versus1', [1, 2]), makeLobby('versus1', [3, 9])]);
    await Promise.all([launch(l1.bots), launch(l2.bots)]);
    check('codes de lobby differents', l1.code !== l2.code);
    const ids1 = l1.bots[0].list('P').map((p) => p.id).sort().join(), ids2 = l2.bots[0].list('P').map((p) => p.id).sort().join();
    check('chaque partie ne contient que ses joueurs', ids1 !== ids2 && l1.bots[0].list('P').length === 2 && l2.bots[0].list('P').length === 2);
    l1.bots.forEach((b) => b.startInputs(hunt)); l2.bots.forEach((b) => b.startInputs(hideInCorner));
    await sleep(3000);
    const dmg1 = l1.bots[0].list('P').some((p) => p.damageMultiplier < 1), dmg2 = l2.bots[0].list('P').some((p) => p.damageMultiplier < 1);
    check('ce qui se passe dans une partie n\'affecte pas l\'autre', dmg1 && !dmg2, `partie 1 degats: ${dmg1}, partie 2 degats: ${dmg2}`);
    [...l1.bots, ...l2.bots].forEach((b) => b.close());
  },
};

async function latencyScenario() {
  console.log('\n[Latence] serveur avec 80 ms de latence artificielle par sens');
  const srv = await startServer({ DEV_LAG_MS: '80' });
  try {
    const { bots } = await makeLobby('versus1', [1, 9]);
    await launch(bots);
    bots.forEach((b) => b.startInputs(hunt));
    await sleep(4000);
    const ping = bots[0].pings ? bots[0].pings[bots[0].id] : null;
    check('ping mesure par le serveur (~160 ms aller-retour)', ping != null && ping >= 140 && ping < 400, `${ping} ms`);
    check('snapshots toujours recus ~30/s malgre la latence', bots[0].snaps > 90, `${bots[0].snaps} en ~4,5 s`);
    check('le jeu progresse (degats infliges)', bots[0].list('P').some((p) => p.damageMultiplier < 1));
    bots.forEach((b) => b.close());
  } finally { srv.kill(); await sleep(300); }
}

(async () => {
  const only = process.argv[2];
  const srv = await startServer();
  try {
    for (const [name, fn] of Object.entries(SCENARIOS)) {
      if (only && only !== name) continue;
      try { await fn(); } catch (e) { check(`${name} : exception`, false, e.stack); }
    }
  } finally { srv.kill(); await sleep(300); }
  if (!only || only === 'latency') await latencyScenario();
  const ok = results.filter((r) => r.ok).length;
  console.log(`\n${ok}/${results.length} verifications reussies`);
  process.exit(ok === results.length ? 0 : 1);
})();
