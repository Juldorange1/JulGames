// Client reseau : connexion au serveur, session (jeton de reconnexion), lobby, messages.
// Ne contient AUCUNE regle de jeu : le serveur decide, le client affiche.

const NET_TOKEN_KEY = 'fracas_net_token'; // par onglet (sessionStorage) : 2 onglets = 2 joueurs

const NetClient = {
  transport: null,
  status: 'offline', // offline | connecting | online | reconnecting
  url: '',
  you: null,
  lobby: null,
  lobbyList: [],
  lastError: '',
  rtt: 0,
  _pingTimer: null,
  _listTimer: null,
  _retryTimer: null,
  _retryUntil: 0,

  token() { try { return sessionStorage.getItem(NET_TOKEN_KEY); } catch (e) { return null; } },
  setToken(t) { try { sessionStorage.setItem(NET_TOKEN_KEY, t); } catch (e) { /* stockage indisponible */ } },

  async connect() {
    if (this.status === 'online' || this.status === 'connecting') return;
    this.status = 'connecting';
    this.lastError = '';
    this.url = NetConfig.url();
    this.refreshUI();
    const tr = new WsClientTransport();
    tr.onMessage = (m) => this.onMessage(m);
    tr.onClose = () => this.onDisconnected();
    try {
      await tr.connect(this.url);
    } catch (e) {
      this.status = 'offline';
      this.lastError = S('netUnreachable');
      this.refreshUI();
      return;
    }
    this.transport = tr;
    tr.send({ t: 'hello', v: NET_PROTOCOL_VERSION, name: (Save.data && Save.data.playerName) || '', token: this.token() });
  },

  disconnect() {
    clearInterval(this._pingTimer); clearInterval(this._listTimer); clearTimeout(this._retryTimer);
    this._retryUntil = 0;
    if (this.transport) this.transport.close();
    this.transport = null;
    this.status = 'offline';
    this.lobby = null;
  },

  send(obj) { if (this.transport) this.transport.send(obj); },

  // Coupure : on retente automatiquement pendant le delai de reconnexion du serveur (20 s).
  onDisconnected() {
    this.transport = null;
    clearInterval(this._pingTimer);
    const inSomething = this.lobby || OnlineGame.active;
    if (inSomething) {
      this.status = 'reconnecting';
      if (!this._retryUntil) this._retryUntil = Date.now() + MP.RECONNECT_GRACE_MS;
      this.scheduleRetry();
    } else {
      this.status = 'offline';
    }
    this.refreshUI();
  },

  scheduleRetry() {
    clearTimeout(this._retryTimer);
    if (Date.now() > this._retryUntil) {
      this.status = 'offline'; this._retryUntil = 0; this.lobby = null;
      if (OnlineGame.active) OnlineGame.leave(false);
      this.lastError = S('netLost');
      this.refreshUI();
      return;
    }
    this._retryTimer = setTimeout(async () => {
      this.status = 'offline';
      await this.connect();
      if (this.status !== 'online' && this.status !== 'connecting') { this.status = 'reconnecting'; this.scheduleRetry(); }
    }, 1500);
  },

  onMessage(m) {
    switch (m.t) {
      case 'welcome':
        this.status = 'online';
        this._retryUntil = 0;
        this.you = m.you;
        this.setToken(m.token);
        clearInterval(this._pingTimer);
        this._pingTimer = setInterval(() => this.send({ t: 'ping', c: performance.now() }), 2000);
        this.send({ t: 'lobby.list' });
        this.refreshUI();
        break;
      case 'pong': this.rtt = this.rtt ? this.rtt * 0.7 + (performance.now() - m.c) * 0.3 : performance.now() - m.c; break;
      case 'sp': this.send({ t: 'spr', s: m.s }); break;
      case 'error':
        this.lastError = S('netErr_' + m.code) !== 'netErr_' + m.code ? S('netErr_' + m.code) : (m.msg || m.code);
        if (m.code === 'version') this.disconnect();
        this.refreshUI(true);
        break;
      case 'lobby.list': this.lobbyList = m.lobbies || []; if (Game.state === STATE.ONLINE_MENU) OnlineUI.refreshList(); break;
      case 'lobby.state': {
        const had = !!this.lobby;
        this.lobby = m.lobby;
        if (!OnlineGame.active || OnlineGame.over) {
          if (Game.state !== STATE.ONLINE_LOBBY && (!OnlineGame.active || !OnlineGame.showingResults)) Game.setState(STATE.ONLINE_LOBBY);
          else if (Game.state === STATE.ONLINE_LOBBY) OnlineUI.renderLobby(!had);
        }
        break;
      }
      case 'lobby.left': this.lobby = null; if (!OnlineGame.active) Game.setState(STATE.ONLINE_MENU); break;
      case 'match.start': OnlineGame.begin(m); break;
      case 's': OnlineGame.onSnapshot(m); break;
      case 'match.end': OnlineGame.onEnd(m); break;
      default: break;
    }
  },

  refreshUI(errorOnly) {
    if (Game.state === STATE.ONLINE_MENU) OnlineUI.renderMenuStatus(errorOnly);
    else if (Game.state === STATE.ONLINE_LOBBY) OnlineUI.renderLobby(false);
    if (OnlineGame.active) OnlineGame.onConnectionChange();
  },

  // ---- actions de lobby (le serveur valide tout) ----
  createLobby(mode, isPrivate, challengeId) { this.send({ t: 'lobby.create', mode, isPrivate, challengeId }); },
  joinLobby(code) { this.send({ t: 'lobby.join', code }); },
  leaveLobby() { this.send({ t: 'lobby.leave' }); this.lobby = null; },
  pickCharacter(c) { this.send({ t: 'lobby.char', c }); },
  pickTeam(team) { this.send({ t: 'lobby.team', team }); },
  setReady(ready) { this.send({ t: 'lobby.ready', ready }); },
  pickChallenge(id) { this.send({ t: 'lobby.challenge', id }); },
  startMatch() { this.send({ t: 'lobby.start' }); },
  setName(name) { Save.setPlayerName(name); this.send({ t: 'name', name }); },
  me() { return this.lobby ? this.lobby.players.find((p) => p.id === (this.you && this.you.id)) : null; },
};
