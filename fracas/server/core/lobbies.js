'use strict';
// Lobbys : creer / rejoindre (code ou liste publique) / quitter, choisir son personnage et son
// equipe, se declarer pret, lancer la partie quand toutes les conditions sont remplies.
// Prevu pour accueillir plus tard : matchmaking automatique, invitations d'amis, salons Steam
// (un lobby Steam n'aurait qu'a appeler join(session, code)).

const crypto = require('node:crypto');
const { Match } = require('./match');

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeCode() { let s = ''; for (let i = 0; i < 5; i++) s += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)]; return s; }

class Lobbies {
  constructor(refs) {
    this.log = refs.log;
    this.config = refs.config;
    this.rules = refs.rules; // { MP_MODES, characterIds, challengeIds }
    this.byCode = new Map();
    this.matches = new Set();
  }

  err(session, code, msg) { if (session.conn) session.conn.send({ t: 'error', code, msg }); }

  // ---------- etat envoye aux clients ----------
  stateOf(lobby) {
    const mode = this.rules.MP_MODES[lobby.mode];
    const players = [...lobby.members.values()].map((m) => ({
      id: m.session.id, name: m.session.name, team: m.team, characterId: m.characterId, ready: m.ready,
      connected: !!m.session.conn, host: m.session.id === lobby.hostId,
    }));
    const check = this.startCheck(lobby);
    return {
      code: lobby.code, mode: lobby.mode, isPrivate: lobby.isPrivate, hostId: lobby.hostId, challengeId: lobby.challengeId,
      status: lobby.match ? 'playing' : 'waiting', players, capacity: mode.players, teams: mode.teams,
      canStart: check.ok, waitingFor: check.reason,
    };
  }

  broadcast(lobby) {
    const st = { t: 'lobby.state', lobby: this.stateOf(lobby) };
    for (const m of lobby.members.values()) if (m.session.conn) m.session.conn.send(st);
  }

  listPublic() {
    const out = [];
    for (const l of this.byCode.values()) {
      if (l.isPrivate || l.match) continue;
      const mode = this.rules.MP_MODES[l.mode];
      if (l.members.size >= mode.players) continue;
      const host = l.members.get(l.hostId);
      out.push({ code: l.code, mode: l.mode, players: l.members.size, capacity: mode.players, host: host ? host.session.name : '?', challengeId: l.challengeId });
    }
    return out.slice(0, 50);
  }

  // ---------- equipes ----------
  pickTeam(lobby) {
    const teams = this.rules.MP_MODES[lobby.mode].teams;
    if (!teams) return null;
    const count = (t) => [...lobby.members.values()].filter((m) => m.team === t).length;
    return teams.slice().sort((a, b) => count(a) - count(b))[0];
  }

  // ---------- actions ----------
  create(session, opts) {
    const modeId = String(opts.mode || '');
    const mode = this.rules.MP_MODES[modeId];
    if (!mode) return this.err(session, 'bad_mode', 'Mode inconnu.');
    if (this.byCode.size >= this.config.MAX_LOBBIES) return this.err(session, 'full', 'Serveur plein, reessaie plus tard.');
    if (session.lobbyCode) this.leave(session);
    let code = makeCode();
    while (this.byCode.has(code)) code = makeCode();
    const lobby = {
      code, mode: modeId, isPrivate: !!opts.isPrivate, hostId: session.id, members: new Map(), match: null,
      challengeId: null, createdAt: Date.now(),
    };
    if (mode.kind === 'coop') lobby.challengeId = this.validChallenge(opts.challengeId) ? opts.challengeId : this.rules.challengeIds[0];
    this.byCode.set(code, lobby);
    this.addMember(lobby, session);
    this.log('info', `lobby ${code} cree (${modeId}) par ${session.name}`);
    return lobby;
  }

  join(session, codeRaw) {
    const code = String(codeRaw || '').toUpperCase().trim();
    const lobby = this.byCode.get(code);
    if (!lobby) return this.err(session, 'not_found', 'Aucune partie avec ce code.');
    if (lobby.members.has(session.id)) { this.broadcast(lobby); return lobby; }
    if (lobby.match) return this.err(session, 'playing', 'Cette partie a deja commence.');
    const mode = this.rules.MP_MODES[lobby.mode];
    if (lobby.members.size >= mode.players) return this.err(session, 'lobby_full', 'Cette partie est complete.');
    if (session.lobbyCode) this.leave(session);
    this.addMember(lobby, session);
    return lobby;
  }

  addMember(lobby, session) {
    lobby.members.set(session.id, { session, team: this.pickTeam(lobby), characterId: null, ready: false });
    session.lobbyCode = lobby.code;
    this.broadcast(lobby);
  }

  leave(session) {
    const lobby = this.byCode.get(session.lobbyCode);
    session.lobbyCode = null;
    if (!lobby) return;
    if (lobby.match && !lobby.match.ended) lobby.match.forfeit(session.id); // abandon en pleine partie
    lobby.members.delete(session.id);
    if (session.conn) session.conn.send({ t: 'lobby.left' });
    if (!lobby.members.size) {
      if (lobby.match) lobby.match.abort('plus aucun joueur');
      this.byCode.delete(lobby.code);
      return;
    }
    if (lobby.hostId === session.id) lobby.hostId = lobby.members.keys().next().value; // nouvel hote
    this.broadcast(lobby);
  }

  member(session) {
    const lobby = this.byCode.get(session.lobbyCode);
    return lobby ? { lobby, m: lobby.members.get(session.id) } : null;
  }

  setCharacter(session, cid) {
    const x = this.member(session);
    if (!x || x.lobby.match) return;
    if (!this.rules.characterIds.includes(cid)) return this.err(session, 'bad_char', 'Personnage invalide.');
    x.m.characterId = cid; x.m.ready = false;
    this.broadcast(x.lobby);
  }

  setTeam(session, team) {
    const x = this.member(session);
    if (!x || x.lobby.match) return;
    const mode = this.rules.MP_MODES[x.lobby.mode];
    if (!mode.teams || !mode.teams.includes(team)) return;
    const count = [...x.lobby.members.values()].filter((m) => m.team === team).length;
    if (count >= mode.teamSize) return this.err(session, 'team_full', 'Cette equipe est complete.');
    x.m.team = team; x.m.ready = false;
    this.broadcast(x.lobby);
  }

  setReady(session, ready) {
    const x = this.member(session);
    if (!x || x.lobby.match) return;
    if (ready && !x.m.characterId) return this.err(session, 'no_char', 'Choisis d\'abord ton personnage.');
    x.m.ready = !!ready;
    this.broadcast(x.lobby);
  }

  validChallenge(id) { return this.rules.challengeIds.includes(id) || (typeof id === 'string' && /^D\d{8}$/.test(id)); }

  setChallenge(session, id) {
    const x = this.member(session);
    if (!x || x.lobby.match || x.lobby.hostId !== session.id) return;
    if (this.rules.MP_MODES[x.lobby.mode].kind !== 'coop') return;
    // Les parcours restent SOLO : seuls les defis normaux (et le defi du jour) sont acceptes.
    if (!this.validChallenge(id)) return this.err(session, 'bad_challenge', 'Ce defi ne peut pas se jouer en coop.');
    x.lobby.challengeId = id;
    for (const m of x.lobby.members.values()) m.ready = false;
    this.broadcast(x.lobby);
  }

  startCheck(lobby) {
    const mode = this.rules.MP_MODES[lobby.mode];
    const members = [...lobby.members.values()];
    if (members.length < mode.players) return { ok: false, reason: 'players' };
    if (members.some((m) => !m.session.conn)) return { ok: false, reason: 'connection' };
    if (members.some((m) => !m.characterId)) return { ok: false, reason: 'characters' };
    if (mode.teams && mode.teams.some((t) => members.filter((m) => m.team === t).length !== mode.teamSize)) return { ok: false, reason: 'teams' };
    if (mode.kind === 'coop' && !this.validChallenge(lobby.challengeId)) return { ok: false, reason: 'challenge' };
    if (members.some((m) => !m.ready)) return { ok: false, reason: 'ready' };
    return { ok: true, reason: null };
  }

  start(session) {
    const x = this.member(session);
    if (!x) return;
    const lobby = x.lobby;
    if (lobby.hostId !== session.id) return this.err(session, 'not_host', 'Seul l\'hote peut lancer la partie.');
    if (lobby.match) return;
    const check = this.startCheck(lobby);
    if (!check.ok) return this.err(session, 'not_ready', 'La partie ne peut pas encore commencer.');
    try {
      const match = new Match(lobby, [...lobby.members.values()], this.log, this.config.MP_OVERRIDES);
      lobby.match = match;
      this.matches.add(match);
      this.broadcast(lobby);
      match.begin();
      this.log('info', `partie ${match.id} lancee (${lobby.mode}, lobby ${lobby.code})`);
    } catch (e) {
      this.log('error', 'creation de partie', e && e.stack);
      this.err(session, 'start_failed', 'Impossible de lancer la partie.');
    }
  }

  // ---------- connexions ----------
  onSessionDisconnect(session) {
    const lobby = this.byCode.get(session.lobbyCode);
    if (!lobby) return;
    if (lobby.match && !lobby.match.ended) lobby.match.onDisconnect(session.id);
    else { const m = lobby.members.get(session.id); if (m) m.ready = false; }
    this.broadcast(lobby);
  }

  onSessionResume(session) {
    const lobby = this.byCode.get(session.lobbyCode);
    if (!lobby) return;
    if (lobby.match && !lobby.match.ended) lobby.match.onReconnect(session.id);
    this.broadcast(lobby);
  }

  // delai de reconnexion depasse : la place est liberee (abandon si partie en cours)
  onSessionExpire(session) {
    if (session.lobbyCode) this.leave(session);
  }

  // ---------- boucle ----------
  tick() {
    for (const match of this.matches) match.tick();
  }

  housekeeping() {
    const now = Date.now();
    for (const match of this.matches) {
      if (!match.ended && match.connectedCount() === 0 && now - match.startedAt > 5000) {
        // personne n'est connecte : on laisse le delai de reconnexion, puis on arrete
        match._emptySince = match._emptySince || now;
        if (now - match._emptySince > 30000) match.abort('tous les joueurs sont partis');
      } else match._emptySince = 0;
      if (match.ended && now - match.endedAt > 1500) {
        this.matches.delete(match);
        const lobby = match.lobby;
        if (lobby.match === match) {
          lobby.match = null;
          // retour au lobby : on retire les absents, tout le monde doit se remettre pret
          for (const [id, m] of lobby.members) {
            if (!m.session.conn && m.session.disconnectedAt) { lobby.members.delete(id); m.session.lobbyCode = null; } else m.ready = false;
          }
          if (!lobby.members.size) this.byCode.delete(lobby.code);
          else {
            if (!lobby.members.has(lobby.hostId)) lobby.hostId = lobby.members.keys().next().value;
            this.broadcast(lobby);
          }
        }
      }
    }
  }
}

module.exports = { Lobbies };
