'use strict';
// Serveur de jeu Fracas : sessions, lobbys, parties en ligne (simulation autoritaire 60 Hz).
//   node index.js            (PORT=8787 par defaut ; voir config.js / .env.example)

const http = require('node:http');
const config = require('./config');
const { WsTransport } = require('./transport/ws_transport');
const { Sessions } = require('./core/sessions');
const { Lobbies } = require('./core/lobbies');
const { createSimContext } = require('./core/sim_context');
const { TICK_DT } = require('./core/match');

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
function log(level, ...args) {
  if (LEVELS[level] > LEVELS[config.LOG_LEVEL]) return;
  console.log(new Date().toISOString(), level.toUpperCase(), ...args);
}

// Regles du jeu lues dans le code de jeu lui-meme (une seule source de verite).
const ref = createSimContext(config.MP_OVERRIDES);
const rules = {
  MP_MODES: ref.x.MP_MODES,
  MP: ref.x.MP,
  PROTOCOL: ref.x.NET_PROTOCOL_VERSION,
  characterIds: ref.g.allCharacterIds(),
  challengeIds: ref.x.CHALLENGE_DEFS.map((d) => d.id), // defis normaux uniquement (pas de parcours)
};

const sessions = new Sessions(rules.MP.RECONNECT_GRACE_MS, log);
const lobbies = new Lobbies({ log, config, rules });
sessions.onExpire = (s) => lobbies.onSessionExpire(s);

// ---------------- HTTP (sante / supervision) ----------------
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({
      ok: true, protocol: rules.PROTOCOL, uptime: Math.round(process.uptime()),
      connections: transport.count(), sessions: sessions.count(), lobbies: lobbies.byCode.size, matches: lobbies.matches.size,
    }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end('Serveur de jeu Fracas. WebSocket : /ws — etat : /health\n');
});

// ---------------- Messages ----------------
const transport = new WsTransport(server, config, log);
transport.onConnection((conn) => {
  let session = null;
  conn.onMessage((msg) => {
    if (msg.t === 'hello') {
      if (msg.v !== rules.PROTOCOL) { conn.send({ t: 'error', code: 'version', msg: 'Version du jeu differente du serveur : recharge la page.' }); conn.close(4001, 'version'); return; }
      const r = sessions.hello(conn, msg.name, msg.token);
      session = r.session;
      conn.send({ t: 'welcome', you: { id: session.id, name: session.name }, token: session.token, resumed: r.resumed, protocol: rules.PROTOCOL });
      if (r.resumed) lobbies.onSessionResume(session);
      log('debug', `${session.name} (${session.id}) ${r.resumed ? 'reconnecte' : 'connecte'}`);
      return;
    }
    if (!session) return; // rien avant "hello"
    if (session.conn !== conn) return; // connexion remplacee
    const x = lobbies.member(session);
    switch (msg.t) {
      case 'in': if (x && x.lobby.match && !x.lobby.match.ended) x.lobby.match.handleInput(session.id, msg.i); break;
      case 'spr': if (x && x.lobby.match) x.lobby.match.handlePingReply(session.id, msg.s); break;
      case 'ping': conn.send({ t: 'pong', c: msg.c, s: Date.now() }); break;
      case 'resync': if (x && x.lobby.match) x.lobby.match.requestKeyframe(session.id); break;
      case 'lobby.list': conn.send({ t: 'lobby.list', lobbies: lobbies.listPublic() }); break;
      case 'lobby.create': lobbies.create(session, { mode: msg.mode, isPrivate: msg.isPrivate, challengeId: msg.challengeId }); break;
      case 'lobby.join': lobbies.join(session, msg.code); break;
      case 'lobby.leave': case 'match.leave': lobbies.leave(session); break;
      case 'lobby.char': lobbies.setCharacter(session, Number(msg.c)); break;
      case 'lobby.team': lobbies.setTeam(session, String(msg.team || '')); break;
      case 'lobby.ready': lobbies.setReady(session, !!msg.ready); break;
      case 'lobby.challenge': lobbies.setChallenge(session, typeof msg.id === 'string' ? msg.id : Number(msg.id)); break;
      case 'lobby.start': lobbies.start(session); break;
      case 'name': session.name = require('./core/sessions').cleanName(msg.name); if (x) lobbies.broadcast(x.lobby); break;
      default: break;
    }
  });
  conn.onClose(() => {
    if (!session || session.conn !== conn) return;
    sessions.disconnected(session);
    lobbies.onSessionDisconnect(session);
    log('debug', `${session.name} deconnecte (place gardee ${rules.MP.RECONNECT_GRACE_MS / 1000} s)`);
  });
});

// ---------------- Boucle a pas fixe ----------------
let last = performance.now();
let acc = 0;
let housekeepAcc = 0;
setInterval(() => {
  const now = performance.now();
  const elapsed = Math.min(0.25, (now - last) / 1000);
  last = now;
  acc += elapsed;
  let steps = 0;
  while (acc >= TICK_DT && steps < 8) { acc -= TICK_DT; lobbies.tick(); steps++; }
  if (steps === 8) acc = 0; // serveur surcharge : on ne cherche pas a rattraper indefiniment
  housekeepAcc += elapsed;
  if (housekeepAcc >= 0.5) { housekeepAcc = 0; lobbies.housekeeping(); sessions.sweep(Date.now()); }
}, 4);

server.listen(config.PORT, config.HOST, () => {
  log('info', `Serveur Fracas pret : ws://${config.HOST === '0.0.0.0' ? 'localhost' : config.HOST}:${config.PORT}/ws (protocole ${rules.PROTOCOL})`);
  if (config.MP_OVERRIDES) log('warn', `reglages de test actifs : ${JSON.stringify(config.MP_OVERRIDES)}`);
  if (config.DEV_LAG_MS) log('warn', `latence artificielle de developpement : ${config.DEV_LAG_MS} ms par sens`);
});

process.on('uncaughtException', (e) => log('error', 'exception', e && e.stack));
