// Partie en ligne cote client.
//
// Le serveur simule ; le client :
//   - envoie ses intentions 60 fois par seconde (direction, visee, touches) ;
//   - applique les snapshots (keyframe / delta) et garde ~1 s d'historique ;
//   - affiche les autres entites avec 100 ms de retard, INTERPOLEES entre deux snapshots ;
//   - PREDIT son propre deplacement (meme code de collision que le serveur) puis se recale sur
//     le serveur en rejouant les entrees non encore confirmees (erreur lissee) ;
//   - rejoue particules, sons et tremblements d'ecran envoyes par le serveur.

const OnlineGame = {
  active: false,
  over: false,
  showingResults: false,
  matchId: null, mode: null, modeDef: null, you: null, roster: [], challengeId: null,
  view: null,
  frames: [],
  state: null,
  lastN: 0,
  waitingKey: true,
  g: null,
  pings: {},
  clockOffset: null,
  roomVersion: -1,
  seq: 0,
  pending: [],
  edgeAcc: 0,
  lastSendAt: 0,
  pred: null,
  histories: new Map(),
  result: null,
  isRecord: false,
  _seenTimer: 0,

  // ---------------- cycle de vie ----------------
  begin(m) {
    const resume = this.active && this.matchId === m.matchId;
    this.active = true;
    this.over = false;
    this.showingResults = false;
    this.result = null;
    this.matchId = m.matchId;
    this.mode = m.mode;
    this.modeDef = MP_MODES[m.mode];
    this.you = m.you;
    this.roster = m.roster || [];
    this.challengeId = m.challengeId;
    this.frames = [];
    this.state = null;
    this.lastN = 0;
    this.waitingKey = true;
    this.clockOffset = null;
    this.pending = [];
    this.pred = null;
    this.edgeAcc = 0;
    if (!resume) { this.seq = 0; this.g = null; this.histories = new Map(); }
    this.view = this.makeView();
    this.roomVersion = -1;
    this.applyRoom(m.room);
    const mine = this.roster.find((r) => r.netId === this.you);
    if (mine) Save.markCharPlayed(mine.characterId); // Codex : perso joue
    Game.world = this.view;
    Game.paused = false;
    Game.setState(STATE.ONLINE_GAME);
  },

  // Quitter l'ecran de partie (abandon si la partie tourne encore).
  leave(forfeit) {
    if (forfeit && this.active && !this.over) NetClient.send({ t: 'match.leave' });
    this.active = false;
    this.showingResults = false;
    Game.world = Game.freshWorld();
    if (forfeit) { NetClient.lobby = null; Game.setState(STATE.ONLINE_MENU); return; }
    Game.setState(NetClient.lobby ? STATE.ONLINE_LOBBY : STATE.ONLINE_MENU);
  },

  makeView() {
    return {
      online: true, camera: { x: 0, y: 0, shakeTime: 0, shakeMag: 0 }, room: null,
      enemies: [], projectiles: [], zones: [], walls: [], shields: [], mines: [], winds: [], meteors: [], hazards: [],
      players: [], player: null, balls: [], capzones: [], decorations: [], theme: null,
      noFollow: true, abilityGate: null, userSpeedMult: 1,
      onlineUnder: drawOnlineUnder, onlineOver: drawOnlineOver,
    };
  },

  applyRoom(rm) {
    if (!rm || rm.version === this.roomVersion) return;
    this.roomVersion = rm.version;
    const v = this.view;
    v.room = {
      bounds: rm.bounds, obstacles: [], terrainZones: [], part: 0, index: 0, isBoss: !!rm.isBoss,
      parkour: rm.parkour ? { time: 0, spikes: [], lasers: [], boosts: [], shooters: [], teleporters: rm.parkour.teleporters || [], trampolines: rm.parkour.trampolines || [] } : null,
    };
    v.theme = ROOM_THEMES[rm.theme] || ROOM_THEMES[1];
    v.decorations = rm.decorations || [];
    setWorldZoom(v, rm.bounds.w, rm.bounds.h);
    this.pred = null;
    this.histories = new Map();
    if (Game.world === v) Game.updateCamera(1);
  },

  requestResync() {
    this.waitingKey = true;
    NetClient.send({ t: 'resync' });
  },

  // ---------------- reception ----------------
  onSnapshot(m) {
    if (!this.active) return;
    if (m.kf) this.waitingKey = false;
    else if (this.waitingKey) return;
    else if (m.n !== this.lastN + 1) { this.requestResync(); return; }
    const r = netApplySnapshot(this.state, m);
    if (r.desync) { this.requestResync(); return; }
    this.state = r.state;
    this.lastN = m.n;
    if (m.rm) this.applyRoom(m.rm);
    if (m.g) this.g = m.g;
    if (m.pings) this.pings = m.pings;
    // horloge : decalage (heure locale - heure serveur) du snapshot arrive le plus vite,
    // relache doucement pour suivre les variations de latence
    const sample = performance.now() - m.tm;
    this.clockOffset = this.clockOffset == null ? sample : Math.min(sample, this.clockOffset + 1.5);
    this.frames.push({ n: m.n, tm: m.tm, st: this.state, gate: m.gate || null, sm: m.sm || 1, ev: m.ev || null, fired: false });
    while (this.frames.length > 40) { const f = this.frames.shift(); if (!f.fired) this.fireEvents(f); }
    this.reconcile(m.a || 0, m.sm || 1);
  },

  onEnd(m) {
    this.over = true;
    this.result = m.result;
    if (m.g) this.g = m.g;
    this.isRecord = false;
    if (m.result && m.result.kind === 'coop' && m.result.timeMs) this.isRecord = Save.submitChallengeRecord(MP.COOP_RECORD_PREFIX + m.result.challengeId, m.result.timeMs);
    this.showingResults = true;
    OnlineUI.showResults(m.result);
  },

  onConnectionChange() { OnlineUI.updateConnectionBanner(); },

  // ---------------- prediction du joueur local ----------------
  myId() { return 'p_' + this.you; },
  latestMe() { return this.state && this.state.P ? this.state.P.get(this.myId()) : null; },

  canPredict(me) {
    if (!me || me.dead || me.absent || me.airborne || me.frozen > 0 || me.jump) return false;
    if (me.state && (me.state.movementOverride || me.state.jump || me.state.charging)) return false;
    return !this.g || this.g.phase === 'playing';
  },

  // Un pas de deplacement = exactement ce que fera le serveur avec cette entree (meme vitesse,
  // memes collisions : bords, obstacles, murs poses, entites solides).
  predictStep(sim, inp, me, speedMult) {
    const dt = (1 / MP.TICK_RATE) * GLOBAL_SPEED_MULT * (speedMult || 1);
    const ch = getCharacter(me.characterId);
    const speed = BASE_SPEED * (ch.speedPercent / 100) * (me.speedMult || 1);
    let vx = inp.mx * speed, vy = inp.my * speed;
    if (me.onIce) { const k = clamp(dt * 2.2, 0, 1); vx = lerp(sim.vx, vx, k); vy = lerp(sim.vy, vy, k); }
    if (me.boostTimer > 0) { vx *= PARKOUR_BOOST_MULT; vy *= PARKOUR_BOOST_MULT; }
    if (me.speedMode) { vx *= me.speedPct; vy *= me.speedPct; }
    sim.vx = vx; sim.vy = vy;
    const n = Math.max(1, Math.ceil(Math.hypot(vx * dt, vy * dt) / 8));
    let nx = sim.x, ny = sim.y;
    for (let s = 0; s < n; s++) {
      const px = nx, py = ny;
      nx += vx * dt / n; ny += vy * dt / n;
      const r = resolvePlayerPosition(this.view, sim, nx, ny, px, py);
      nx = r.x; ny = r.y;
    }
    for (const e of this.solids) {
      const R = (e.radius || 16) + sim.radius;
      const dx = nx - e.x, dy = ny - e.y;
      if (dx * dx + dy * dy >= R * R) continue;
      const d = Math.hypot(dx, dy) || 1;
      nx = e.x + dx / d * R; ny = e.y + dy / d * R;
    }
    sim.x = nx; sim.y = ny;
  },

  reconcile(ack, speedMult) {
    const me = this.latestMe();
    this.pending = this.pending.filter((p) => p.seq > ack);
    if (!this.canPredict(me)) { this.pred = null; return; }
    this.refreshSolids(me);
    const sim = { x: me.x, y: me.y, vx: me.vx || 0, vy: me.vy || 0, radius: me.radius || PLAYER_RADIUS };
    for (const inp of this.pending) this.predictStep(sim, inp, me, speedMult);
    const p = this.pred;
    if (p) {
      // erreur de prediction : lissee (pas de saut visible), sauf gros ecart (teleportation)
      const shownX = p.x + p.errX, shownY = p.y + p.errY;
      const ex = shownX - sim.x, ey = shownY - sim.y;
      if (Math.hypot(ex, ey) > 90) { p.errX = 0; p.errY = 0; } else { p.errX = ex; p.errY = ey; }
      p.x = sim.x; p.y = sim.y; p.vx = sim.vx; p.vy = sim.vy;
    } else {
      this.pred = { x: sim.x, y: sim.y, vx: sim.vx, vy: sim.vy, radius: sim.radius, errX: 0, errY: 0 };
    }
  },

  refreshSolids(me) {
    const out = [];
    if (this.state && this.state.E) for (const e of this.state.E.values()) if (!e.dead) out.push(e);
    if (this.state && this.state.P) for (const q of this.state.P.values()) if (q.id !== me.id && !q.dead && !q.absent && !q.airborne) out.push(q);
    this.solids = out;
  },

  // ---------------- boucle locale ----------------
  update(realDt) {
    if (!this.active || !this.view) return;
    const now = performance.now();
    // 1) entrees : echantillonnees chaque image, envoyees 60 fois par seconde
    const inp = sampleLocalInput(this.view);
    const bits = packInputBits(inp);
    this.edgeAcc |= bits & IN_EDGE_MASK;
    if (now - this.lastSendAt >= 1000 / MP.TICK_RATE - 1 && NetClient.status === 'online') {
      this.lastSendAt = now;
      const sendBits = (bits & ~IN_EDGE_MASK) | this.edgeAcc;
      this.edgeAcc = 0;
      const seq = ++this.seq;
      const r2 = (v) => Math.round(v * 100) / 100;
      NetClient.send({ t: 'in', i: [seq, r2(inp.mx), r2(inp.my), Math.round(inp.ax), Math.round(inp.ay), sendBits] });
      const rec = { seq, mx: inp.mx, my: inp.my };
      this.pending.push(rec);
      if (this.pending.length > 120) this.pending.shift();
      const me = this.latestMe();
      if (this.pred && me && this.canPredict(me)) {
        this.refreshSolids(me);
        const lastFrame = this.frames[this.frames.length - 1];
        this.predictStep(this.pred, rec, me, lastFrame ? lastFrame.sm : 1);
      }
    }
    if (this.pred) { const k = Math.exp(-12 * realDt); this.pred.errX *= k; this.pred.errY *= k; }
    // 2) monde affiche
    this.buildView(now);
    // 3) effets
    Particles.update(realDt);
    Game.updateCamera(realDt);
    // Codex : ennemis croises en coop
    this._seenTimer -= realDt;
    if (this._seenTimer <= 0) { this._seenTimer = 1; for (const e of this.view.enemies) if (!e.dead && e.type && e.kind !== 'crystal') Save.markEnemySeen(e.type); }
  },

  renderTime(now) { return this.clockOffset == null ? 0 : now - this.clockOffset - MP.INTERP_DELAY_MS; },

  fireEvents(f) {
    f.fired = true;
    if (!f.ev) return;
    for (const [kind, name, args] of f.ev) {
      try {
        if (kind === 'P' && typeof Particles[name] === 'function') Particles[name](...(args || []));
        else if (kind === 'A' && typeof Audio2[name] === 'function') Audio2[name](...(args || []));
        else if (kind === 'S') Game.shakeCamera(args[0], args[1]);
      } catch (e) { /* effet illisible : ignore */ }
    }
  },

  buildView(now) {
    const frames = this.frames;
    if (!frames.length) return;
    const rt = this.renderTime(now);
    for (const f of frames) if (!f.fired && f.tm <= rt) this.fireEvents(f);
    let bi = frames.findIndex((f) => f.tm >= rt);
    if (bi < 0) bi = frames.length - 1;
    const b = frames[bi], a = frames[Math.max(0, bi - 1)];
    const k = b.tm > a.tm ? clamp((rt - a.tm) / (b.tm - a.tm), 0, 1) : 1;
    const latest = frames[frames.length - 1];
    const interp = (cat) => {
      const B = b.st[cat], A = a.st[cat];
      if (!B) return [];
      const out = [];
      for (const [id, o] of B) {
        const p = A && A !== B ? A.get(id) : null;
        if (p && k < 1 && Math.abs(p.x - o.x) + Math.abs(p.y - o.y) < 260) out.push(Object.assign({}, o, { x: lerp(p.x, o.x, k), y: lerp(p.y, o.y, k) }));
        else out.push(Object.assign({}, o));
      }
      return out;
    };
    const v = this.view;
    v.enemies = interp('E');
    v.projectiles = interp('R');
    v.zones = interp('Z');
    v.walls = interp('W');
    v.shields = interp('S');
    v.mines = interp('M');
    v.winds = interp('N');
    v.meteors = interp('T');
    v.hazards = interp('H');
    v.balls = interp('B');
    v.capzones = interp('C');
    if (v.room) { v.room.obstacles = interp('O'); v.room.terrainZones = interp('Y'); }
    v.abilityGate = latest.gate || null;
    v.userSpeedMult = latest.sm || 1;
    // joueurs : les autres interpoles ; soi-meme = etat le plus recent + position predite
    const t = now / 1000;
    const players = [];
    const B = b.st.P, A = a.st.P, L = latest.st.P;
    if (B) {
      for (const [id, o0] of B) {
        let o = o0;
        if (id === this.myId() && L && L.get(id)) o = L.get(id);
        const po = A ? A.get(id) : null;
        let x = o0.x, y = o0.y;
        if (po && k < 1 && Math.abs(po.x - o0.x) + Math.abs(po.y - o0.y) < 260) { x = lerp(po.x, o0.x, k); y = lerp(po.y, o0.y, k); }
        if (id === this.myId() && this.pred) { x = this.pred.x + this.pred.errX; y = this.pred.y + this.pred.errY; }
        let h = this.histories.get(id);
        if (!h) { h = []; this.histories.set(id, h); }
        h.push({ t, x, y });
        while (h.length > 2 && t - h[0].t > 4) h.shift();
        const view = Object.assign({}, o, {
          x, y, character: getCharacter(o.characterId), history: h, totalTime: t,
          aim: o.aim || { x, y }, state: o.state || {}, cooldowns: o.cooldowns || { a1: 0, a2: 0, a3: 0 },
        });
        players.push(view);
        if (id === this.myId()) v.player = view;
      }
    }
    v.players = players;
    if (!v.player && players.length) v.player = players[0]; // spectateur (mort) : on garde une camera valide
  },
};

// ---------------- Dessin des elements propres aux modes en ligne ----------------
const TEAM_NAME_KEY = { A: 'mpTeamA', B: 'mpTeamB' };

function drawCrystal(ctx, camera, e) {
  const sx = e.x - camera.x, sy = e.y - camera.y;
  const col = mpTeamColor(e.team);
  const t = performance.now() / 1000;
  const frac = clamp((e.pct || 0) / (e.maxPct || 2), 0, 1);
  ctx.save();
  ctx.translate(sx, sy);
  // socle
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(0, 22, 26, 9, 0, 0, Math.PI * 2); ctx.fill();
  // halo
  const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 60);
  g.addColorStop(0, col + 'aa'); g.addColorStop(1, col + '00');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, 60, 0, Math.PI * 2); ctx.fill();
  // gemme (flotte)
  ctx.translate(0, Math.sin(t * 2) * 3);
  ctx.shadowColor = col; ctx.shadowBlur = 18;
  const gg = ctx.createLinearGradient(-18, -30, 18, 30);
  gg.addColorStop(0, '#ffffff'); gg.addColorStop(0.35, col); gg.addColorStop(1, '#101020');
  ctx.fillStyle = gg;
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, -32); ctx.lineTo(18, -6); ctx.lineTo(10, 26); ctx.lineTo(-10, 26); ctx.lineTo(-18, -6); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.5; ctx.strokeStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(0, -32); ctx.lineTo(0, 26); ctx.moveTo(-18, -6); ctx.lineTo(18, -6); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();
  // barre + pourcentage
  const w = 70;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(sx - w / 2, sy - 52, w, 7);
  ctx.fillStyle = col; ctx.fillRect(sx - w / 2, sy - 52, w * frac, 7);
  ctx.font = '800 12px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff'; ctx.fillText(`${Math.round((e.pct || 0) * 100)}%`, sx, sy - 57);
  ctx.restore();
}

function drawOnlineUnder(ctx, camera, world) {
  const G = OnlineGame.g;
  // cages (Foot)
  if (G && G.goals) {
    for (const t of ['A', 'B']) {
      const gl = G.goals[t];
      if (!gl) continue;
      const col = mpTeamColor(t);
      const x = gl.x - camera.x, y = gl.y - camera.y;
      ctx.save();
      ctx.fillStyle = col + '33'; ctx.fillRect(x, y, gl.w, gl.h);
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.strokeRect(x, y, gl.w, gl.h);
      ctx.globalAlpha = 0.35; ctx.lineWidth = 1; ctx.strokeStyle = '#ffffff';
      for (let yy = 12; yy < gl.h; yy += 12) { ctx.beginPath(); ctx.moveTo(x, y + yy); ctx.lineTo(x + gl.w, y + yy); ctx.stroke(); }
      for (let xx = 12; xx < gl.w; xx += 12) { ctx.beginPath(); ctx.moveTo(x + xx, y); ctx.lineTo(x + xx, y + gl.h); ctx.stroke(); }
      ctx.restore();
    }
    // ligne mediane + rond central
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-camera.x, world.room.bounds.y - camera.y); ctx.lineTo(-camera.x, world.room.bounds.y + world.room.bounds.h - camera.y); ctx.stroke();
    ctx.beginPath(); ctx.arc(-camera.x, -camera.y, 90, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  // zones de boost / soin (se deplacent lentement)
  const t = performance.now() / 1000;
  const me = OnlineGame.myId();
  for (const z of world.capzones || []) {
    if (!z.active) continue;
    const x = z.x - camera.x, y = z.y - camera.y;
    const prog = clamp(((z.progress && z.progress[me]) || 0) / MP.CAPZONE_TIME, 0, 1);
    ctx.save();
    const g = ctx.createRadialGradient(x, y, 4, x, y, z.radius);
    g.addColorStop(0, 'rgba(127,255,156,0.35)'); g.addColorStop(1, 'rgba(127,255,156,0.06)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, z.radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#7fff9c'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.lineDashOffset = -t * 20;
    ctx.beginPath(); ctx.arc(x, y, z.radius, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    if (prog > 0) {
      ctx.lineWidth = 5; ctx.strokeStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(x, y, z.radius + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog); ctx.stroke();
    }
    ctx.font = '800 13px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#eafff0';
    ctx.fillText(`+${Math.round(MP.CAPZONE_GAIN * 100)}%`, x, y + 5);
    ctx.restore();
  }
}

function drawOnlineOver(ctx, camera, world) {
  // ballons
  for (const b of world.balls || []) {
    if (b.hidden > 0) continue;
    const x = b.x - camera.x, y = b.y - camera.y;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, y + b.radius * 0.8, b.radius, b.radius * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(x, y); ctx.rotate(b.spin || 0);
    ctx.fillStyle = '#f4f4f4'; ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, b.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; const px = Math.cos(a) * 5, py = Math.sin(a) * 5; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
    ctx.closePath(); ctx.fill();
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; ctx.beginPath(); ctx.arc(Math.cos(a) * 11, Math.sin(a) * 11, 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  // joueurs : anneau d'equipe, nom, jauge de % (degats ou vitesse)
  for (const p of world.players || []) {
    if (p.dead || p.absent) continue;
    const x = p.x - camera.x, y = p.y - camera.y;
    const col = mpTeamColor(p.team);
    const mine = p.id === OnlineGame.myId();
    ctx.save();
    ctx.strokeStyle = col; ctx.globalAlpha = 0.9; ctx.lineWidth = mine ? 3 : 2;
    ctx.beginPath(); ctx.ellipse(x, y + 12, 20, 8, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    const pct = p.speedMode ? p.speedPct : p.damageMultiplier;
    const w = 44, frac = clamp(pct / (p.speedMode ? 1 : 1), 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - w / 2, y - 36, w, 5);
    ctx.fillStyle = pct >= 0.7 ? '#7fff9c' : (pct >= (p.speedMode ? 0.55 : 0.35) ? '#ffd23d' : '#ff5d5d');
    ctx.fillRect(x - w / 2, y - 36, w * frac, 5);
    if (pct > 1) { ctx.fillStyle = '#7fd8ff'; ctx.fillRect(x - w / 2, y - 36, w * clamp(pct - 1, 0, 1), 5); }
    ctx.font = `${mine ? 800 : 700} 11px system-ui, sans-serif`; ctx.textAlign = 'center';
    ctx.fillStyle = col;
    ctx.fillText(`${p.name || '?'} ${Math.round(pct * 100)}%`, x, y - 40);
    if (p.disconnected) { ctx.fillStyle = '#ffb14d'; ctx.fillText(S('mpDisconnected'), x, y + 34); }
    ctx.restore();
  }
}
