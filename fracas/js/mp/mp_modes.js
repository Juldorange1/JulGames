// Regles des modes en ligne (Versus, Foot, Survivant, Coop). Execute UNIQUEMENT par le serveur,
// dans le contexte isole de chaque partie, par-dessus la simulation normale de Fracas
// (stepWorld). Le serveur est la seule autorite : degats, morts, ballons, cristaux, buts,
// rounds, tirages aleatoires et resultats sont decides ici.
//
// Interface utilisee par le serveur Node (server/core/match.js) :
//   const ctl = mpCreateMatch(cfg)  cfg = { mode, seed, players: [{ netId, name, team, characterId }] }
//   ctl.setInput(netId, input)     intentions du joueur pour le prochain pas
//   ctl.setLatency(netId, ms)      latence mesuree (compensation de latence)
//   ctl.step(dt)                   un pas de simulation (1/60 s)
//   ctl.modeState()                etat du mode a synchroniser (score, round, chrono...)
//   ctl.roomPayload()              partie statique de la salle (envoyee a chaque changement de salle)
//   ctl.onDisconnect / onReconnect / onForfeit(netId)
//   ctl.over, ctl.result

function mpFreshWorld() {
  return {
    player: null, players: [], camera: { x: 0, y: 0, shakeTime: 0, shakeMag: 0 },
    room: null, enemies: [], projectiles: [], zones: [], walls: [], shields: [], mines: [], winds: [],
    meteors: [], hazards: [], balls: [], capzones: [], decorations: [], theme: null,
    simSpeedBonus: 0, userSpeedMult: 1, onEnemyKilled: null, abilityGate: null,
    tick: 0, time: 0, pvp: false, multiplayer: true,
  };
}

// ---------------- Joueurs ----------------
function mpSpawnPlayer(world, info, characterId, x, y, opts) {
  const character = getCharacter(characterId);
  const p = createPlayer(character, x, y);
  if (character.init) character.init(p);
  // identifiant stable pour tout le match (continuite cote client, meme apres un round)
  p.id = 'p_' + info.netId;
  p.netId = info.netId;
  p.name = info.name;
  p.team = info.team;
  p.color = mpTeamColor(info.team);
  p.dmgMax = (opts && opts.dmgMax) || DMG_MAX;
  p.absent = !!info.absent;
  p._posHist = [];
  if (opts && opts.speedMode) { p.speedMode = true; p.speedPct = 1; p.speedMax = MP.FOOT_SPEED_MAX; }
  p.input = null;
  world.players.push(p);
  return p;
}

function mpKill(ctl, p, cause) {
  if (p.dead) return;
  p.dead = true;
  p.airborne = false;
  Particles.burst(p.x, p.y, 34, p.color || '#ffffff', { maxSpeed: 260, life: 0.7 });
  Particles.ring(p.x, p.y, 60, p.color || '#ffffff', 0.5);
  Audio2.explosion(1);
  Game.shakeCamera(6, 0.25);
  ctl.feed.push({ t: ctl.world.time, victim: p.netId, by: p.lastHitBy || null, cause: cause || 'hit' });
  if (ctl.feed.length > 8) ctl.feed.shift();
  if (ctl.onPlayerKilled) ctl.onPlayerKilled(p);
}

// Degats d'un joueur sur un adversaire humain ou un cristal (appele par damageEnemy).
function mpOnHostileHit(ctl, world, target, amount, attacker) {
  if (ctl.phase !== 'playing') return;
  const pct = amount * MP.PVP_DAMAGE_TO_PERCENT;
  if (target.kind === 'crystal') {
    if (target.dead) return;
    target.pct = Math.max(0, target.pct - pct / 100);
    target.hitFx = 0.2;
    Particles.text(target.x, target.y - 40, `-${Math.round(pct)}%`, '#ffd23d');
    Particles.burst(target.x, target.y, 6, mpTeamColor(target.team), { maxSpeed: 120, life: 0.3 });
    if (target.pct <= MP.DEATH_AT) {
      target.pct = 0; target.dead = true;
      Particles.burst(target.x, target.y, 60, mpTeamColor(target.team), { maxSpeed: 340, life: 0.9 });
      Particles.ring(target.x, target.y, 120, '#ffffff', 0.6);
      Audio2.explosion(1.8);
      Game.shakeCamera(12, 0.5);
      ctl.feed.push({ t: world.time, crystal: target.team, by: attacker ? attacker.netId : null });
    }
    return;
  }
  if (target.dead || target.invincible) return;
  target.lastHitBy = attacker ? attacker.netId : null;
  if (target.speedMode) {
    target.speedPct = Math.max(0, target.speedPct - pct / 100);
    Particles.text(target.x, target.y - 26, `-${Math.round(pct)}% ${S('hudSpeedShort')}`, '#ff5d5d');
  } else {
    target.damageMultiplier = Math.max(MP.DEATH_AT, target.damageMultiplier - pct / 100);
    Particles.text(target.x, target.y - 26, `-${Math.round(pct)}%`, '#ff5d5d');
  }
  Particles.burst(target.x, target.y, 8, '#ff5d5d', { maxSpeed: 130 });
  Audio2.hurt();
}

// ---------------- Arenes ----------------
const MP_ARENA_SIZE = { versus1: [1120, 690], versus2: [1300, 780], foot: [1400, 800], survivor: [1300, 820] };

function mpBuildArena(ctl) {
  const world = ctl.world;
  const [w, h] = MP_ARENA_SIZE[ctl.mode.id];
  const bounds = { x: -w / 2, y: -h / 2, w, h };
  const kind = ctl.mode.kind;
  const themeIndex = randInt(1, 3);
  const obstacles = [];
  const overlaps = (o) => obstacles.some((q) => rectsOverlap(o.x - 40, o.y - 40, o.w + 80, o.h + 80, q.x, q.y, q.w, q.h));
  // Obstacles SYMETRIQUES (equite) : moitie gauche miroitee a droite ; Survivant : 4 quarts.
  const nHalf = kind === 'survivor' ? randInt(1, 2) : randInt(2, 3);
  const xMin = bounds.x + (kind === 'foot' ? 240 : 190);
  for (let i = 0; i < nHalf; i++) {
    for (let tries = 0; tries < 30; tries++) {
      const ow = randRange(40, 90), oh = randRange(40, 120);
      const o = { x: randRange(xMin, -ow - 40), y: kind === 'survivor' ? randRange(bounds.y + 150, -oh - 40) : randRange(bounds.y + 60, bounds.y + h - 60 - oh), w: ow, h: oh };
      const mirrors = kind === 'survivor'
        ? [o, { x: -(o.x + o.w), y: o.y, w: ow, h: oh }, { x: o.x, y: -(o.y + o.h), w: ow, h: oh }, { x: -(o.x + o.w), y: -(o.y + o.h), w: ow, h: oh }]
        : [o, { x: -(o.x + o.w), y: o.y, w: ow, h: oh }];
      if (mirrors.some(overlaps)) continue;
      obstacles.push(...mirrors);
      break;
    }
  }
  // Points d'apparition, cristaux, cages
  const spawns = {};
  const avoid = [];
  if (kind === 'survivor') {
    const ix = w / 2 - 120, iy = h / 2 - 110;
    ctl.spawnPoints = [{ x: -ix, y: -iy }, { x: ix, y: iy }, { x: ix, y: -iy }, { x: -ix, y: iy }];
    for (const s of ctl.spawnPoints) avoid.push({ x: s.x, y: s.y, r: 150 });
  } else {
    const sx = w / 2 - (kind === 'foot' ? 150 : 150);
    spawns.A = { x: -sx, y: 0 }; spawns.B = { x: sx, y: 0 };
    ctl.spawns = spawns;
    avoid.push({ x: -sx, y: 0, r: 190 }, { x: sx, y: 0, r: 190 });
    if (kind === 'versus') {
      ctl.crystalPos = { A: { x: bounds.x + 62, y: 0 }, B: { x: bounds.x + w - 62, y: 0 } };
      avoid.push({ x: ctl.crystalPos.A.x, y: 0, r: 110 }, { x: ctl.crystalPos.B.x, y: 0, r: 110 });
    }
    if (kind === 'foot') {
      const gh = 200, gw = 54;
      ctl.goals = {
        A: { team: 'A', x: bounds.x, y: -gh / 2, w: gw, h: gh },
        B: { team: 'B', x: bounds.x + w - gw, y: -gh / 2, w: gw, h: gh },
      };
      avoid.push({ x: bounds.x + 60, y: 0, r: 200 }, { x: bounds.x + w - 60, y: 0, r: 200 }, { x: 0, y: 0, r: 110 });
    }
  }
  // Murs mobiles (trajectoires jamais indiquees) : 2x plus frequents au Foot.
  const wallChance = kind === 'foot' ? MP.FOOT_MOVING_WALL_CHANCE : MP.MOVING_WALL_CHANCE;
  if (Math.random() < wallChance) obstacles.push(...makeMovingWalls(bounds, obstacles.slice(), avoid, kind === 'foot' ? randInt(1, 3) : randInt(1, 2)));
  for (const o of obstacles) o.id = uid();
  // Zone de terrain mobile (parfois) passant par le centre
  const terrainZones = [];
  if (kind !== 'foot' && Math.random() < 0.45) {
    const z = makeTerrainZone(choice(['ice', 'mud', 'accel', 'slow', 'wind']), 0, 0, 58, bounds, true);
    z.id = uid();
    terrainZones.push(z);
  }
  world.room = {
    bounds, obstacles, terrainZones, part: 0, index: 0, isBoss: false,
    props: makeRoomProps(),
  };
  world.themeIndex = themeIndex;
  world.theme = ROOM_THEMES[themeIndex] || ROOM_THEMES[1];
  world.decorations = generateDecorations(bounds, obstacles, avoid, themeIndex, 28);
  ctl.roomVersion++;
}

// Zones de boost/soin : se deplacent lentement ; y rester 3 s = +15%.
function mpSpawnCapzone(ctl, index) {
  const world = ctl.world, b = world.room.bounds;
  const centered = ctl.mode.kind !== 'survivor';
  const cx = centered ? 0 : randRange(b.x + b.w * 0.25, b.x + b.w * 0.75);
  const cy = centered ? 0 : randRange(b.y + b.h * 0.25, b.y + b.h * 0.75);
  const z = { id: uid(), x: cx, y: cy, radius: MP.CAPZONE_RADIUS, active: true, progress: {}, respawn: 0, slot: index };
  attachZoneMover(z, b, 0.4);
  return z;
}

function mpUpdateCapzones(ctl, dt) {
  const world = ctl.world;
  for (let i = 0; i < world.capzones.length; i++) {
    const z = world.capzones[i];
    if (!z.active) {
      z.respawn -= dt;
      if (z.respawn <= 0) world.capzones[i] = mpSpawnCapzone(ctl, z.slot);
      continue;
    }
    if (z.mover) { moverAdvance(z.mover, dt); const c = moverCenter(z.mover); z.x = c.x; z.y = c.y; }
    for (const p of worldPlayers(world)) {
      const inside = !p.airborne && dist2(p.x, p.y, z.x, z.y) <= z.radius * z.radius;
      if (!inside) { if (z.progress[p.id]) z.progress[p.id] = 0; continue; }
      z.progress[p.id] = (z.progress[p.id] || 0) + dt;
      if (z.progress[p.id] >= MP.CAPZONE_TIME) {
        if (p.speedMode) {
          p.speedPct = Math.min(p.speedMax || 1, p.speedPct + MP.CAPZONE_GAIN);
          Particles.text(p.x, p.y - 34, `+${Math.round(MP.CAPZONE_GAIN * 100)}% ${S('hudSpeedShort')}`, '#7fff9c');
        } else {
          p.damageMultiplier = Math.min(p.dmgMax || DMG_MAX, p.damageMultiplier + MP.CAPZONE_GAIN);
          Particles.text(p.x, p.y - 34, `+${Math.round(MP.CAPZONE_GAIN * 100)}%`, '#7fff9c');
        }
        p.healFx = 0.4;
        Particles.ring(z.x, z.y, z.radius, '#7fff9c', 0.5);
        Particles.burst(z.x, z.y, 24, '#7fff9c', { maxSpeed: 180 });
        Audio2.heal();
        z.active = false; z.respawn = MP.CAPZONE_RESPAWN; z.progress = {};
        break;
      }
    }
  }
}

// ---------------- Compensation de latence ("en faveur du tireur") ----------------
function mpSampleHist(hist, t) {
  if (!hist || !hist.length) return null;
  if (t <= hist[0].t) return hist[0];
  for (let i = 1; i < hist.length; i++) {
    if (hist[i].t >= t) {
      const a = hist[i - 1], b = hist[i], k = (t - a.t) / ((b.t - a.t) || 1);
      return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) };
    }
  }
  return hist[hist.length - 1];
}
function mpInstallLagComp(world) {
  world.beginLagComp = (w, p) => {
    if (!w.pvp) return null;
    const delay = Math.min(MP.LAG_COMP_MAX_MS, (p.netLatencyMs || 0) + MP.INTERP_DELAY_MS) / 1000;
    if (delay < 0.005) return null;
    const saved = [];
    for (const q of w.players) {
      if (q === p || q.dead || q.absent || (q.team != null && q.team === p.team)) continue;
      const h = mpSampleHist(q._posHist, w.time - delay);
      if (!h) continue;
      saved.push({ q, x: q.x, y: q.y, rx: h.x, ry: h.y });
      q.x = h.x; q.y = h.y;
    }
    return saved;
  };
  // Les deplacements subis pendant l'action (poussee, attraction...) sont conserves.
  world.endLagComp = (w, p, saved) => {
    for (const s of saved) { s.q.x = s.x + (s.q.x - s.rx); s.q.y = s.y + (s.q.y - s.ry); }
  };
}
function mpRecordHistory(world) {
  for (const p of world.players) {
    const h = p._posHist || (p._posHist = []);
    h.push({ t: world.time, x: p.x, y: p.y });
    while (h.length > 2 && world.time - h[0].t > 0.5) h.shift();
  }
}

// ---------------- Creation d'une partie ----------------
function mpCreateMatch(cfg) {
  const mode = MP_MODES[cfg.mode];
  if (!mode) throw new Error('mode inconnu ' + cfg.mode);
  const ctl = {
    mode, world: mpFreshWorld(), roster: cfg.players.map((p) => Object.assign({}, p)),
    phase: 'countdown', phaseTimer: MP.COUNTDOWN, elapsed: 0, round: 1,
    feed: [], over: false, result: null, roomVersion: 0,
  };
  const world = ctl.world;
  world.onHostileHit = (w, target, amount, attacker) => mpOnHostileHit(ctl, w, target, amount, attacker);
  mpInstallLagComp(world);

  ctl.setInput = (netId, input) => { const p = world.players.find((q) => q.netId === netId); if (p) p.input = input; };
  ctl.setLatency = (netId, ms) => { const p = world.players.find((q) => q.netId === netId); if (p) p.netLatencyMs = ms; ctl.roster.forEach((r) => { if (r.netId === netId) r.latency = ms; }); };
  ctl.playerByNet = (netId) => world.players.find((q) => q.netId === netId) || null;
  ctl.roomPayload = () => ({
    bounds: world.room.bounds, theme: world.themeIndex || 1, decorations: world.decorations || [],
    props: world.room.props ? { teleporters: world.room.props.teleporters || [], trampolines: world.room.props.trampolines || [] } : null,
    isBoss: !!world.room.isBoss, version: ctl.roomVersion,
  });

  if (mode.kind === 'versus') mpSetupVersus(ctl);
  else if (mode.kind === 'foot') mpSetupFoot(ctl);
  else mpSetupSurvivor(ctl);

  ctl.step = (dt) => {
    if (ctl.over) return;
    ctl.elapsed += dt;
    world.time += dt;
    if (ctl.phase === 'countdown') {
      ctl.phaseTimer -= dt;
      if (ctl.phaseTimer <= 0) { ctl.phase = 'playing'; ctl.phaseTimer = 0; Audio2.ability(); }
      mpRecordHistory(world);
      return;
    }
    if (ctl.phase === 'roundEnd') {
      ctl.phaseTimer -= dt;
      if (ctl.phaseTimer <= 0 && ctl.nextRound) ctl.nextRound();
      mpRecordHistory(world);
      return;
    }
    ctl.stepPlaying(dt);
    mpRecordHistory(world);
  };

  ctl.onDisconnect = (netId) => {
    const p = ctl.playerByNet(netId);
    if (p) { p.disconnected = true; p.input = null; }
    const r = ctl.roster.find((x) => x.netId === netId); if (r) r.connected = false;
  };
  ctl.onReconnect = (netId) => {
    const p = ctl.playerByNet(netId);
    if (p) p.disconnected = false;
    const r = ctl.roster.find((x) => x.netId === netId); if (r) r.connected = true;
  };
  // Deconnexion definitive (delai de reconnexion depasse) ou abandon : selon le mode.
  ctl.onForfeit = (netId) => {
    const r = ctl.roster.find((x) => x.netId === netId);
    if (r) { r.forfeit = true; r.connected = false; }
    const p = ctl.playerByNet(netId);
    if (p) {
      if (ctl.mode.kind === 'foot') { p.absent = true; if (ctl.dropBallOf) ctl.dropBallOf(p); }
      else { p.absent = true; mpKill(ctl, p, 'forfeit'); }
    }
    if (ctl.checkForfeitEnd) ctl.checkForfeitEnd();
  };
  return ctl;
}

function mpFinish(ctl, result) {
  if (ctl.over) return;
  ctl.over = true;
  ctl.phase = 'over';
  ctl.result = result;
  Audio2.record();
}

function mpActiveRoster(ctl) { return ctl.roster.filter((r) => !r.forfeit); }

// ================= VERSUS (1v1 / 2v2, 2 rounds, cristaux, pas de reapparition) =================
function mpSetupVersus(ctl) {
  const world = ctl.world;
  world.pvp = true;
  mpBuildArena(ctl);
  ctl.roundWins = { A: 0, B: 0 };
  ctl.roundResults = [];
  // Round 2 : personnages echanges. Le tirage (2v2) est fait ICI, une seule fois, par le serveur.
  const byTeam = (t) => ctl.roster.filter((r) => r.team === t);
  const A = byTeam('A'), B = byTeam('B');
  if (A.length === 1 && B.length === 1) { A[0].round2Char = B[0].characterId; B[0].round2Char = A[0].characterId; }
  else {
    const fromB = shuffle(B.map((r) => r.characterId)), fromA = shuffle(A.map((r) => r.characterId));
    A.forEach((r, i) => { r.round2Char = fromB[i % fromB.length]; });
    B.forEach((r, i) => { r.round2Char = fromA[i % fromA.length]; });
  }
  ctl.startRound = () => {
    world.players = []; world.enemies = []; world.projectiles = []; world.zones = []; world.walls = [];
    world.shields = []; world.mines = []; world.winds = []; world.meteors = []; world.hazards = [];
    world.capzones = [mpSpawnCapzone(ctl, 0)];
    for (const t of ['A', 'B']) {
      const c = ctl.crystalPos[t];
      world.enemies.push({ id: 'cr_' + t, kind: 'crystal', type: 'CRYSTAL', team: t, x: c.x, y: c.y, anchorX: c.x, anchorY: c.y, anchored: true, radius: MP.CRYSTAL_RADIUS, pct: MP.CRYSTAL_START, maxPct: MP.CRYSTAL_START, hp: 1e9, maxHp: 1e9, dead: false });
    }
    for (const t of ['A', 'B']) {
      const team = ctl.roster.filter((r) => r.team === t);
      team.forEach((r, i) => {
        const s = ctl.spawns[t];
        const y = s.y + (i - (team.length - 1) / 2) * 90;
        const cid = ctl.round === 1 ? r.characterId : r.round2Char;
        r.currentChar = cid;
        const p = mpSpawnPlayer(world, r, cid, s.x, y, { dmgMax: MP.VERSUS_DMG_MAX });
        p.facing = t === 'A' ? 0 : Math.PI;
        if (r.forfeit) { p.absent = true; p.dead = true; }
        if (r.connected === false) p.disconnected = true;
      });
    }
    ctl.phase = 'countdown'; ctl.phaseTimer = MP.COUNTDOWN; ctl.roundTime = 0;
  };
  ctl.stepPlaying = (dt) => {
    stepWorld(world, dt * GLOBAL_SPEED_MULT, dt);
    mpUpdateCapzones(ctl, dt);
    for (const p of world.players) if (!p.dead && p.damageMultiplier <= MP.DEATH_AT + 1e-6) mpKill(ctl, p);
    ctl.roundTime += dt;
    const alive = (t) => world.players.some((p) => p.team === t && !p.dead);
    const crystal = (t) => world.enemies.find((e) => e.kind === 'crystal' && e.team === t);
    const down = { A: !alive('A') || crystal('A').dead, B: !alive('B') || crystal('B').dead };
    const total = (t) => world.players.filter((p) => p.team === t && !p.dead).reduce((a, p) => a + p.damageMultiplier, 0) + (crystal(t).dead ? 0 : crystal(t).pct);
    if (down.A || down.B) {
      const winner = down.A && down.B ? null : (down.A ? 'B' : 'A');
      const reason = winner && crystal(winner === 'A' ? 'B' : 'A').dead ? 'crystal' : 'elimination';
      ctl.endRound(winner, reason, winner ? total(winner) : 0);
    } else if (ctl.roundTime >= MP.ROUND_TIME) {
      const ta = total('A'), tb = total('B');
      const winner = Math.abs(ta - tb) < 1e-6 ? null : (ta > tb ? 'A' : 'B');
      ctl.endRound(winner, 'time', Math.abs(ta - tb));
    }
  };
  ctl.endRound = (winner, reason, margin) => {
    ctl.roundResults.push({ round: ctl.round, winner, reason, margin: Math.round(margin * 100) });
    if (winner) ctl.roundWins[winner]++;
    ctl.phase = 'roundEnd'; ctl.phaseTimer = MP.ROUND_END_PAUSE;
    ctl.nextRound = ctl.round < MP.VERSUS_ROUNDS ? () => { ctl.round++; ctl.startRound(); } : () => ctl.finishVersus();
  };
  ctl.finishVersus = () => {
    const wa = ctl.roundWins.A, wb = ctl.roundWins.B;
    let winner = wa === wb ? null : (wa > wb ? 'A' : 'B'), tiebreak = false;
    if (!winner) {
      // 1 round partout : l'equipe qui a gagne son round avec la plus grande marge l'emporte.
      const m = { A: 0, B: 0 };
      for (const r of ctl.roundResults) if (r.winner) m[r.winner] += r.margin;
      if (m.A !== m.B) { winner = m.A > m.B ? 'A' : 'B'; tiebreak = true; }
    }
    mpFinish(ctl, { kind: 'versus', winner, rounds: ctl.roundResults, roundWins: ctl.roundWins, tiebreak });
  };
  ctl.checkForfeitEnd = () => {
    for (const t of ['A', 'B']) {
      if (ctl.roster.filter((r) => r.team === t).every((r) => r.forfeit)) {
        mpFinish(ctl, { kind: 'versus', winner: t === 'A' ? 'B' : 'A', rounds: ctl.roundResults, roundWins: ctl.roundWins, forfeit: true });
      }
    }
  };
  ctl.modeState = () => ({
    kind: 'versus', phase: ctl.phase, timer: ctl.phaseTimer, round: ctl.round, rounds: MP.VERSUS_ROUNDS,
    roundTime: ctl.roundTime, roundLimit: MP.ROUND_TIME, roundWins: ctl.roundWins, roundResults: ctl.roundResults,
    roster: ctl.roster.map((r) => ({ netId: r.netId, name: r.name, team: r.team, c1: r.characterId, c2: r.round2Char, cur: r.currentChar, connected: r.connected !== false, forfeit: !!r.forfeit })),
    feed: ctl.feed, result: ctl.result,
  });
  ctl.startRound();
}

// ================= FOOT (2v2, 2 ballons, % de vitesse, reapparition dans sa cage) =================
function mpSetupFoot(ctl) {
  const world = ctl.world;
  world.pvp = true;
  mpBuildArena(ctl);
  ctl.score = { A: 0, B: 0 };
  ctl.footTime = 0;
  ctl.overtime = false;
  ctl.respawnQueue = [];
  const b = world.room.bounds;
  const goalCenter = (t) => ({ x: ctl.goals[t].x + ctl.goals[t].w / 2, y: 0 });
  const spawnBall = (i) => ({ id: 'ball' + i, x: 0, y: i === 0 ? -70 : 70, vx: 0, vy: 0, radius: 13, holderId: null, block: null, blockT: 0, hidden: 0, lastTouch: null, spin: 0 });
  world.balls = [];
  for (let i = 0; i < MP.FOOT_BALLS; i++) world.balls.push(spawnBall(i));
  world.capzones = [mpSpawnCapzone(ctl, 0)];

  const placePlayer = (r, atGoal) => {
    const team = ctl.roster.filter((x) => x.team === r.team);
    const i = team.indexOf(r);
    const s = atGoal ? goalCenter(r.team) : ctl.spawns[r.team];
    const y = s.y + (i - (team.length - 1) / 2) * (atGoal ? 50 : 110);
    const old = ctl.playerByNet(r.netId);
    if (old) world.players.splice(world.players.indexOf(old), 1);
    const p = mpSpawnPlayer(world, r, r.characterId, s.x + (atGoal ? (r.team === 'A' ? 30 : -30) : 0), y, { speedMode: true });
    p.facing = r.team === 'A' ? 0 : Math.PI;
    if (r.forfeit) p.absent = true;
    if (r.connected === false) p.disconnected = true;
    return p;
  };
  for (const r of ctl.roster) { r.currentChar = r.characterId; placePlayer(r, false); }

  ctl.dropBallOf = (p) => {
    for (const ball of world.balls) if (ball.holderId === p.id) { ball.holderId = null; ball.vx = 0; ball.vy = 0; ball.block = p.id; ball.blockT = 0.5; }
  };
  ctl.onPlayerKilled = (p) => {
    ctl.dropBallOf(p);
    ctl.respawnQueue.push({ netId: p.netId, t: MP.FOOT_RESPAWN_DELAY });
  };
  // Avec un ballon, l'attaque devient le lancer (appui) ; sans ballon, attaque normale.
  world.attackOverride = (w, p, attackDown) => {
    const ball = w.balls.find((bl) => bl.holderId === p.id);
    const edge = attackDown && !p._atkPrev;
    p._atkPrev = attackDown;
    if (!ball) return false;
    if (edge && ctl.phase === 'playing') {
      const d0 = normalize(p.aim.x - p.x, p.aim.y - p.y);
      const d = (d0.x || d0.y) ? d0 : vecFromAngle(p.facing);
      ball.holderId = null;
      ball.x = p.x + d.x * (p.radius + ball.radius + 3); ball.y = p.y + d.y * (p.radius + ball.radius + 3);
      ball.vx = d.x * MP.FOOT_THROW_SPEED; ball.vy = d.y * MP.FOOT_THROW_SPEED;
      ball.block = p.id; ball.blockT = 0.35; ball.lastTouch = p.netId;
      Audio2.whoosh();
      Particles.burst(ball.x, ball.y, 8, '#ffffff', { maxSpeed: 120, life: 0.25 });
    }
    return true;
  };

  const inGoal = (ball) => {
    for (const t of ['A', 'B']) {
      const g = ctl.goals[t];
      if (pointInRect(ball.x, ball.y, g.x, g.y, g.w, g.h)) return t;
    }
    return null;
  };

  ctl.stepPlaying = (dt) => {
    stepWorld(world, dt * GLOBAL_SPEED_MULT, dt);
    mpUpdateCapzones(ctl, dt);
    // morts (40% de vitesse) puis reapparition a 100% dans SA cage
    for (const p of world.players) if (!p.dead && !p.absent && p.speedPct <= MP.FOOT_DEATH_SPEED + 1e-6) mpKill(ctl, p);
    for (let i = ctl.respawnQueue.length - 1; i >= 0; i--) {
      const q = ctl.respawnQueue[i];
      q.t -= dt;
      if (q.t > 0) continue;
      ctl.respawnQueue.splice(i, 1);
      const r = ctl.roster.find((x) => x.netId === q.netId);
      if (!r || r.forfeit) continue;
      const p = placePlayer(r, true);
      playerSetInvincible(p, 1);
      Particles.ring(p.x, p.y, 40, p.color, 0.4);
      Audio2.teleport();
    }
    // ballons
    for (const ball of world.balls) {
      if (ball.hidden > 0) {
        ball.hidden -= dt;
        if (ball.hidden <= 0) { ball.hidden = 0; ball.x = 0; ball.y = ball.id === 'ball0' ? -70 : 70; ball.vx = 0; ball.vy = 0; Particles.ring(ball.x, ball.y, 30, '#ffffff', 0.4); }
        continue;
      }
      if (ball.blockT > 0) { ball.blockT -= dt; if (ball.blockT <= 0) ball.block = null; }
      const holder = ball.holderId ? world.players.find((p) => p.id === ball.holderId) : null;
      if (ball.holderId && (!holder || holder.dead || holder.absent)) ball.holderId = null;
      if (holder && !holder.dead) {
        const d = vecFromAngle(holder.facing || 0);
        ball.x = holder.x + d.x * (holder.radius + 8); ball.y = holder.y + d.y * (holder.radius + 8);
        ball.vx = 0; ball.vy = 0;
      } else {
        ball.prevX = ball.x; ball.prevY = ball.y;
        ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        const k = Math.pow(MP.FOOT_BALL_FRICTION, dt);
        ball.vx *= k; ball.vy *= k;
        ball.spin += Math.hypot(ball.vx, ball.vy) * dt * 0.05;
        // rebonds : bords, obstacles (fixes et mobiles), murs poses
        if (ball.x - ball.radius < b.x) { ball.x = b.x + ball.radius; ball.vx = Math.abs(ball.vx) * 0.8; }
        if (ball.x + ball.radius > b.x + b.w) { ball.x = b.x + b.w - ball.radius; ball.vx = -Math.abs(ball.vx) * 0.8; }
        if (ball.y - ball.radius < b.y) { ball.y = b.y + ball.radius; ball.vy = Math.abs(ball.vy) * 0.8; }
        if (ball.y + ball.radius > b.y + b.h) { ball.y = b.y + b.h - ball.radius; ball.vy = -Math.abs(ball.vy) * 0.8; }
        const pr = { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy, radius: ball.radius, prevX: ball.prevX, prevY: ball.prevY, maxBounces: 0, bounces: 0 };
        for (const ob of world.room.obstacles) if (reflectProjectileOnRect(world, pr, ob.x, ob.y, ob.w, ob.h, false)) break;
        for (const wl of world.walls) reflectProjectileOnRect(world, pr, wl.x - wl.w / 2, wl.y - wl.h / 2, wl.w, wl.h, false);
        ball.x = pr.x; ball.y = pr.y; ball.vx = pr.vx; ball.vy = pr.vy;
        // ramassage (interception possible) : un seul ballon par joueur
        for (const p of worldPlayers(world)) {
          if (p.airborne || p.id === ball.block) continue;
          if (world.balls.some((o) => o.holderId === p.id)) continue;
          if (circleCircle(ball.x, ball.y, ball.radius, p.x, p.y, p.radius + 2)) {
            ball.holderId = p.id; ball.lastTouch = p.netId;
            Audio2.spark();
            break;
          }
        }
      }
      // but (porte ou lance dans la cage adverse)
      const g = inGoal(ball);
      if (g) {
        const scorer = g === 'A' ? 'B' : 'A';
        ctl.score[scorer]++;
        ball.holderId = null; ball.hidden = 1.2;
        Particles.burst(ball.x, ball.y, 50, mpTeamColor(scorer), { maxSpeed: 320, life: 0.8 });
        Particles.ring(ball.x, ball.y, 110, '#ffffff', 0.5);
        Audio2.record();
        Game.shakeCamera(8, 0.35);
        ctl.feed.push({ t: world.time, goal: scorer, by: ball.lastTouch });
        if (ctl.feed.length > 8) ctl.feed.shift();
        if (ctl.score[scorer] >= MP.FOOT_GOALS_TO_WIN || ctl.overtime) {
          mpFinish(ctl, { kind: 'foot', winner: scorer, score: ctl.score });
          return;
        }
      }
    }
    ctl.footTime += dt;
    if (!ctl.overtime && ctl.footTime >= MP.FOOT_TIME) {
      if (ctl.score.A !== ctl.score.B) mpFinish(ctl, { kind: 'foot', winner: ctl.score.A > ctl.score.B ? 'A' : 'B', score: ctl.score });
      else ctl.overtime = true; // but en or
    }
  };
  ctl.checkForfeitEnd = () => {
    for (const t of ['A', 'B']) {
      if (ctl.roster.filter((r) => r.team === t).every((r) => r.forfeit)) mpFinish(ctl, { kind: 'foot', winner: t === 'A' ? 'B' : 'A', score: ctl.score, forfeit: true });
    }
  };
  ctl.modeState = () => ({
    kind: 'foot', phase: ctl.phase, timer: ctl.phaseTimer, score: ctl.score, time: ctl.footTime, limit: MP.FOOT_TIME,
    overtime: ctl.overtime, goals: ctl.goals, goalsToWin: MP.FOOT_GOALS_TO_WIN,
    respawns: ctl.respawnQueue.map((q) => ({ netId: q.netId, t: q.t })),
    roster: ctl.roster.map((r) => ({ netId: r.netId, name: r.name, team: r.team, cur: r.characterId, connected: r.connected !== false, forfeit: !!r.forfeit })),
    feed: ctl.feed, result: ctl.result,
  });
}

// ================= SURVIVANT (4 joueurs, chacun pour soi, dernier vivant) =================
function mpSetupSurvivor(ctl) {
  const world = ctl.world;
  world.pvp = true;
  ctl.roster.forEach((r, i) => { r.team = 'S' + (i + 1); });
  mpBuildArena(ctl);
  world.capzones = [mpSpawnCapzone(ctl, 0), mpSpawnCapzone(ctl, 1)];
  ctl.roster.forEach((r, i) => {
    const s = ctl.spawnPoints[i % ctl.spawnPoints.length];
    r.currentChar = r.characterId;
    const p = mpSpawnPlayer(world, r, r.characterId, s.x, s.y, { dmgMax: MP.SURVIVOR_DMG_MAX });
    p.facing = Math.atan2(-s.y, -s.x);
  });
  ctl.survTime = 0;
  ctl.placements = []; // ordre d'elimination
  ctl.onPlayerKilled = (p) => { ctl.placements.unshift(p.netId); };
  ctl.stepPlaying = (dt) => {
    stepWorld(world, dt * GLOBAL_SPEED_MULT, dt);
    mpUpdateCapzones(ctl, dt);
    ctl.survTime += dt;
    // Mort subite apres 4 min : tout le monde perd 1% par seconde (une partie ne peut pas durer indefiniment).
    if (ctl.survTime >= MP.SUDDEN_DEATH_AT) for (const p of worldPlayers(world)) p.damageMultiplier -= 0.01 * dt;
    const dying = world.players.filter((p) => !p.dead && p.damageMultiplier <= MP.DEATH_AT + 1e-6);
    const aliveBefore = world.players.filter((p) => !p.dead);
    for (const p of dying) mpKill(ctl, p);
    const alive = world.players.filter((p) => !p.dead);
    if (alive.length <= 1) {
      const winners = alive.length === 1 ? [alive[0].netId] : aliveBefore.map((p) => p.netId); // tous morts ensemble : egalite
      mpFinish(ctl, { kind: 'survivor', winners, placements: winners.concat(ctl.placements.filter((n) => !winners.includes(n))) });
    }
  };
  ctl.checkForfeitEnd = () => {};
  ctl.modeState = () => ({
    kind: 'survivor', phase: ctl.phase, timer: ctl.phaseTimer, time: ctl.survTime, suddenDeathAt: MP.SUDDEN_DEATH_AT,
    roster: ctl.roster.map((r) => ({ netId: r.netId, name: r.name, team: r.team, cur: r.characterId, connected: r.connected !== false, forfeit: !!r.forfeit })),
    feed: ctl.feed, result: ctl.result,
  });
}

