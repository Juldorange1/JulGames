'use strict';
// Une partie en cours : contexte de simulation isole, entrees des joueurs, snapshots, latence,
// deconnexions. Le serveur est l'autorite : les clients n'envoient que leurs intentions.

const crypto = require('node:crypto');
const { createSimContext } = require('./sim_context');
const { collectCategories, DeltaEncoder, keyframeFrom, compactEvents } = require('./snapshot');

const TICK_DT = 1 / 60;

class Match {
  constructor(lobby, members, log, mpOverrides) {
    this.id = 'm_' + crypto.randomBytes(5).toString('base64url');
    this.lobby = lobby;
    this.log = log;
    this.sc = createSimContext(mpOverrides);
    const X = this.sc.x;
    this.MP = X.MP;
    this.EDGE_MASK = X.IN_EDGE_MASK;
    this.BITS = X.IN_BITS;
    this.mode = lobby.mode;
    const players = members.map((m) => ({ netId: m.session.id, name: m.session.name, team: m.team, characterId: m.characterId, connected: !!m.session.conn }));
    this.ctl = this.sc.g.mpCreateMatch({ mode: lobby.mode, players, challengeId: lobby.challengeId, seed: crypto.randomInt(1 << 30) });
    this.clients = new Map();
    for (const m of members) {
      this.clients.set(m.session.id, { session: m.session, latest: null, edges: 0, lastSeq: 0, needKey: true, rtt: 0, lastPingAt: 0 });
    }
    this.enc = new DeltaEncoder();
    this.snapSeq = 0;
    this.ticks = 0;
    this.lastModeJson = '';
    this.lastRoomVersion = -1;
    this.ended = false;
    this.endedAt = 0;
    this.startedAt = Date.now();
  }

  startMessage(netId) {
    return {
      t: 'match.start', matchId: this.id, mode: this.mode, you: netId, challengeId: this.lobby.challengeId || null,
      roster: this.ctl.roster.map((r) => ({ netId: r.netId, name: r.name, team: r.team, characterId: r.characterId })),
      room: this.ctl.roomPayload(),
    };
  }

  begin() {
    for (const [netId, c] of this.clients) if (c.session.conn) c.session.conn.send(this.startMessage(netId));
  }

  // ---- Entrees : [seq, mx, my, ax, ay, bits] ----
  handleInput(netId, arr) {
    const c = this.clients.get(netId);
    if (!c || !Array.isArray(arr) || arr.length < 6) return;
    const [seq, mx0, my0, ax, ay, bits] = arr;
    if (![seq, mx0, my0, ax, ay, bits].every(Number.isFinite)) return;
    if (seq <= c.lastSeq) return;
    // direction bornee (anti-triche : impossible d'aller plus vite que les regles)
    let mx = mx0, my = my0;
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    const b = this.ctl.world.room ? this.ctl.world.room.bounds : { x: -2000, y: -2000, w: 4000, h: 4000 };
    c.latest = {
      mx, my,
      ax: Math.max(b.x - 400, Math.min(b.x + b.w + 400, ax)),
      ay: Math.max(b.y - 400, Math.min(b.y + b.h + 400, ay)),
      bits: bits & 1023,
    };
    c.edges |= bits & this.EDGE_MASK; // un appui n'est jamais perdu, meme si 2 messages arrivent entre 2 pas
    c.lastSeq = seq;
  }

  applyInputs() {
    for (const [netId, c] of this.clients) {
      if (!c.session.conn || !c.latest) { this.ctl.setInput(netId, null); continue; }
      const L = c.latest;
      const bits = (L.bits & ~this.EDGE_MASK) | c.edges;
      c.edges = 0;
      L.bits &= ~this.EDGE_MASK; // les appuis ne comptent qu'une fois
      const inp = { mx: L.mx, my: L.my, ax: L.ax, ay: L.ay, hasAim: true };
      for (const k of Object.keys(this.BITS)) inp[k] = !!(bits & this.BITS[k]);
      this.ctl.setInput(netId, inp);
      c.ackSeq = c.lastSeq;
    }
  }

  // ---- Boucle ----
  tick() {
    if (this.ended) return;
    this.applyInputs();
    try {
      this.ctl.step(TICK_DT);
    } catch (e) {
      this.log('error', `partie ${this.id} : erreur de simulation`, e && e.stack);
    }
    this.ticks++;
    if (this.ticks % this.MP.SNAPSHOT_EVERY === 0) this.sendSnapshots();
    if (this.ticks % 60 === 0) this.pingClients();
    if (this.ctl.over && !this.ended) this.finish();
  }

  sendSnapshots() {
    const world = this.ctl.world;
    const cats = collectCategories(world);
    const delta = this.enc.encode(cats);
    const body = { t: 's', n: ++this.snapSeq, tm: Math.round(world.time * 1000), tk: world.tick || 0, gate: world.abilityGate || 0, sm: world.userSpeedMult || 1 };
    const g = this.ctl.modeState();
    const gj = JSON.stringify(g);
    if (gj !== this.lastModeJson) { body.g = g; this.lastModeJson = gj; }
    if (this.ctl.roomVersion !== this.lastRoomVersion) { body.rm = this.ctl.roomPayload(); this.lastRoomVersion = this.ctl.roomVersion; }
    const ev = this.sc.drainEvents();
    if (ev.length) body.ev = compactEvents(ev);
    if (this.ticks % 60 === 0) {
      body.pings = {};
      for (const [id, c] of this.clients) body.pings[id] = Math.round(c.rtt);
    }
    body.d = delta;
    const deltaStr = JSON.stringify(body).slice(1);
    let keyStr = null;
    for (const [, c] of this.clients) {
      const conn = c.session.conn;
      if (!conn) continue;
      if (c.needKey) {
        if (!keyStr) {
          const kb = Object.assign({}, body, { d: undefined, kf: keyframeFrom(cats), g, rm: this.ctl.roomPayload() });
          keyStr = JSON.stringify(kb).slice(1);
        }
        conn.send(`{"a":${c.ackSeq || 0},${keyStr}`);
        c.needKey = false;
      } else {
        // client trop en retard (connexion saturee) : on saute ce delta et on renverra une keyframe
        if (conn.bufferedAmount && conn.bufferedAmount() > 512 * 1024) { c.needKey = true; continue; }
        conn.send(`{"a":${c.ackSeq || 0},${deltaStr}`);
      }
    }
  }

  pingClients() {
    const now = Date.now();
    for (const [, c] of this.clients) if (c.session.conn) c.session.conn.send({ t: 'sp', s: now });
  }

  handlePingReply(netId, s) {
    const c = this.clients.get(netId);
    if (!c || !Number.isFinite(s)) return;
    const rtt = Math.max(0, Date.now() - s);
    c.rtt = c.rtt ? c.rtt * 0.7 + rtt * 0.3 : rtt;
    this.ctl.setLatency(netId, c.rtt / 2);
  }

  // ---- Connexions ----
  onDisconnect(netId) { this.ctl.onDisconnect(netId); const c = this.clients.get(netId); if (c) c.latest = null; }
  onReconnect(netId) {
    const c = this.clients.get(netId);
    if (!c) return;
    c.needKey = true; c.lastSeq = 0; c.latest = null; c.edges = 0;
    this.ctl.onReconnect(netId);
    if (c.session.conn) c.session.conn.send(this.startMessage(netId));
  }
  forfeit(netId) { this.ctl.onForfeit(netId); }
  requestKeyframe(netId) { const c = this.clients.get(netId); if (c) c.needKey = true; }
  connectedCount() { let n = 0; for (const [, c] of this.clients) if (c.session.conn) n++; return n; }

  finish() {
    this.ended = true;
    this.endedAt = Date.now();
    this.sendSnapshots();
    const msg = { t: 'match.end', matchId: this.id, result: this.ctl.result, g: this.ctl.modeState() };
    for (const [, c] of this.clients) if (c.session.conn) c.session.conn.send(msg);
    this.log('info', `partie ${this.id} (${this.mode}) terminee : ${JSON.stringify(this.ctl.result)}`);
  }

  // Tout le monde est parti : la partie s'arrete (jamais de partie bloquee).
  abort(reason) {
    if (this.ended) return;
    this.ended = true;
    this.endedAt = Date.now();
    this.log('info', `partie ${this.id} arretee : ${reason}`);
  }
}

module.exports = { Match, TICK_DT };
