// Ecrans du jeu en ligne : menu (connexion, creer / rejoindre), lobby (equipes, persos, pret),
// surimpression pendant la partie (score, chrono, joueurs, fil des eliminations) et resultats.

const OnlineUI = {
  _listTimer: null,
  _gameRefs: null,

  modeName(id) { return S('mpMode_' + id); },
  teamName(t) { return t === 'A' || t === 'B' ? S(TEAM_NAME_KEY[t]) : ''; },

  // ================= MENU EN LIGNE =================
  renderMenu() {
    const panel = UI.el('div', 'panel online-panel');
    panel.appendChild(UI.backBtn(() => { this.stopListPolling(); if (NetClient.lobby) NetClient.leaveLobby(); Game.setState(STATE.MENU); }));
    panel.appendChild(UI.el('h2', null, S('mpTitle')));

    const status = UI.el('div', 'online-status');
    this._statusEl = status;
    panel.appendChild(status);

    // pseudo
    const nameRow = UI.el('div', 'online-row');
    nameRow.appendChild(UI.el('span', 'online-label', S('mpName')));
    const nameIn = document.createElement('input');
    nameIn.className = 'online-input'; nameIn.maxLength = 16;
    nameIn.value = (Save.data && Save.data.playerName) || '';
    nameIn.placeholder = S('mpNamePh');
    nameIn.addEventListener('change', () => NetClient.setName(nameIn.value));
    nameRow.appendChild(nameIn);
    panel.appendChild(nameRow);

    // creer
    const createBox = UI.el('div', 'online-box');
    createBox.appendChild(UI.el('h3', null, S('mpCreate')));
    const priv = UI.el('label', 'online-check');
    const privIn = document.createElement('input'); privIn.type = 'checkbox';
    priv.appendChild(privIn); priv.appendChild(document.createTextNode(' ' + S('mpPrivate')));
    const modes = UI.el('div', 'online-modes');
    for (const id of MP_MODE_ORDER) {
      const def = MP_MODES[id];
      const b = UI.el('div', 'online-mode');
      b.appendChild(UI.el('b', null, this.modeName(id)));
      b.appendChild(UI.el('span', null, S('mpModeDesc_' + id)));
      b.appendChild(UI.el('em', null, `${def.players} ${S('mpPlayers')}`));
      b.onclick = () => {
        if (NetClient.status !== 'online') return;
        NetClient.createLobby(id, privIn.checked, def.kind === 'coop' ? CHALLENGE_DEFS[0].id : undefined);
      };
      modes.appendChild(b);
    }
    createBox.appendChild(modes);
    createBox.appendChild(priv);
    panel.appendChild(createBox);

    // rejoindre
    const joinBox = UI.el('div', 'online-box');
    joinBox.appendChild(UI.el('h3', null, S('mpJoin')));
    const joinRow = UI.el('div', 'online-row');
    const codeIn = document.createElement('input');
    codeIn.className = 'online-input online-code'; codeIn.maxLength = 5; codeIn.placeholder = 'CODE';
    codeIn.addEventListener('input', () => { codeIn.value = codeIn.value.toUpperCase(); });
    const joinBtn = UI.el('div', 'menu-btn menu-btn-small', S('mpJoinBtn'));
    joinBtn.onclick = () => { if (codeIn.value.trim().length >= 4) NetClient.joinLobby(codeIn.value.trim()); };
    codeIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') joinBtn.onclick(); });
    joinRow.appendChild(codeIn); joinRow.appendChild(joinBtn);
    joinBox.appendChild(joinRow);
    joinBox.appendChild(UI.el('div', 'online-sub', S('mpPublicList')));
    const list = UI.el('div', 'online-list');
    this._listEl = list;
    joinBox.appendChild(list);
    panel.appendChild(joinBox);

    // serveur
    const srvRow = UI.el('div', 'online-row online-server');
    srvRow.appendChild(UI.el('span', 'online-label', S('mpServer')));
    const srvIn = document.createElement('input');
    srvIn.className = 'online-input'; srvIn.value = NetConfig.url();
    const srvBtn = UI.el('div', 'menu-btn menu-btn-small', S('mpConnect'));
    srvBtn.onclick = () => {
      const v = srvIn.value.trim();
      Save.data.serverUrl = v && v !== NetConfig.DEV_URL && v !== NetConfig.PRODUCTION_URL ? v : '';
      Save.persist();
      NetClient.disconnect();
      NetClient.connect();
    };
    srvRow.appendChild(srvIn); srvRow.appendChild(srvBtn);
    panel.appendChild(srvRow);

    UI.overlay.appendChild(panel);
    this.renderMenuStatus();
    this.refreshList();
    if (NetClient.status === 'offline') NetClient.connect();
    this.startListPolling();
  },

  startListPolling() {
    this.stopListPolling();
    this._listTimer = setInterval(() => { if (Game.state === STATE.ONLINE_MENU && NetClient.status === 'online') NetClient.send({ t: 'lobby.list' }); else this.stopListPolling(); }, 2000);
  },
  stopListPolling() { clearInterval(this._listTimer); this._listTimer = null; },

  renderMenuStatus() {
    const el = this._statusEl;
    if (!el || !el.isConnected) return;
    const st = NetClient.status;
    const txt = st === 'online' ? `${S('mpOnline')} · ${NetClient.url}${NetClient.rtt ? ' · ' + Math.round(NetClient.rtt) + ' ms' : ''}`
      : st === 'connecting' ? S('mpConnecting') : st === 'reconnecting' ? S('mpReconnecting') : S('mpOffline');
    el.textContent = txt + (NetClient.lastError ? ` — ${NetClient.lastError}` : '');
    el.className = 'online-status ' + st + (NetClient.lastError ? ' err' : '');
  },

  refreshList() {
    const el = this._listEl;
    if (!el || !el.isConnected) return;
    el.innerHTML = '';
    if (!NetClient.lobbyList.length) { el.appendChild(UI.el('div', 'online-empty', S('mpNoPublic'))); return; }
    for (const l of NetClient.lobbyList) {
      const row = UI.el('div', 'online-lobby-row');
      row.appendChild(UI.el('b', null, this.modeName(l.mode)));
      row.appendChild(UI.el('span', null, `${l.host} · ${l.players}/${l.capacity}`));
      row.appendChild(UI.el('code', null, l.code));
      row.onclick = () => NetClient.joinLobby(l.code);
      el.appendChild(row);
    }
  },

  // ================= LOBBY =================
  renderLobby(full) {
    if (Game.state !== STATE.ONLINE_LOBBY) return;
    const L = NetClient.lobby;
    if (!L) { Game.setState(STATE.ONLINE_MENU); return; }
    UI.clear();
    const panel = UI.el('div', 'panel online-panel lobby-panel');
    panel.appendChild(UI.backBtn(() => { NetClient.leaveLobby(); Game.setState(STATE.ONLINE_MENU); }));
    const head = UI.el('div', 'lobby-head');
    head.appendChild(UI.el('h2', null, this.modeName(L.mode)));
    const code = UI.el('div', 'lobby-code', `${S('mpCode')} ${L.code}`);
    code.title = S('mpCopy');
    code.onclick = () => { try { navigator.clipboard.writeText(L.code); code.classList.add('copied'); } catch (e) { /* */ } };
    head.appendChild(code);
    head.appendChild(UI.el('span', 'online-sub', L.isPrivate ? S('mpPrivateTag') : S('mpPublicTag')));
    panel.appendChild(head);
    if (NetClient.lastError) panel.appendChild(UI.el('div', 'online-status err', NetClient.lastError));
    if (NetClient.status !== 'online') panel.appendChild(UI.el('div', 'online-status reconnecting', S('mpReconnecting')));

    const me = NetClient.me();
    const isHost = L.hostId === (NetClient.you && NetClient.you.id);

    // joueurs (par equipe)
    const teamsBox = UI.el('div', 'lobby-teams');
    const groups = L.teams ? L.teams.map((t) => ({ t, list: L.players.filter((p) => p.team === t) })) : [{ t: null, list: L.players }];
    for (const grp of groups) {
      const col = UI.el('div', 'lobby-team');
      if (grp.t) col.style.setProperty('--team', mpTeamColor(grp.t));
      const title = UI.el('div', 'lobby-team-title', grp.t ? this.teamName(grp.t) : S('mpPlayersTitle'));
      col.appendChild(title);
      const cap = L.teams ? MP_MODES[L.mode].teamSize : L.capacity;
      for (let i = 0; i < cap; i++) {
        const p = grp.list[i];
        const row = UI.el('div', 'lobby-player' + (p ? '' : ' empty'));
        if (p) {
          const known = p.characterId && (p.id === (NetClient.you && NetClient.you.id) ? true : Save.isCharKnown(p.characterId));
          row.appendChild(UI.el('span', 'lp-name', `${p.host ? '★ ' : ''}${p.name}`));
          row.appendChild(UI.el('span', 'lp-char', p.characterId ? (known ? charName(p.characterId) : S('unknownName')) : '—'));
          row.appendChild(UI.el('span', 'lp-ready ' + (p.ready ? 'on' : 'off'), p.ready ? S('mpReady') : (p.connected ? S('mpNotReady') : S('mpDisconnected'))));
        } else row.appendChild(UI.el('span', 'lp-name', S('mpWaitingSlot')));
        col.appendChild(row);
      }
      if (grp.t && me && me.team !== grp.t && grp.list.length < MP_MODES[L.mode].teamSize) {
        const sw = UI.el('div', 'menu-btn menu-btn-small lobby-switch', S('mpJoinTeam'));
        sw.onclick = () => NetClient.pickTeam(grp.t);
        col.appendChild(sw);
      }
      teamsBox.appendChild(col);
    }
    panel.appendChild(teamsBox);

    // coop : choix du defi (les parcours ne sont jamais proposes : ils restent en solo)
    if (MP_MODES[L.mode].kind === 'coop') {
      const cbox = UI.el('div', 'lobby-challenge');
      cbox.appendChild(UI.el('span', 'online-label', S('mpChallenge')));
      if (isHost) {
        const sel = document.createElement('select');
        sel.className = 'online-input';
        const opts = [[dailyChallengeId(), S('dailyTitle')]].concat(CHALLENGE_DEFS.map((d) => [d.id, `${S('hudDefi')} ${challengeNumber(d)} — ${challengeField(d.id, 'title')}`]));
        for (const [id, label] of opts) {
          const o = document.createElement('option'); o.value = String(id); o.textContent = label;
          if (String(id) === String(L.challengeId)) o.selected = true;
          sel.appendChild(o);
        }
        sel.addEventListener('change', () => NetClient.pickChallenge(/^D/.test(sel.value) ? sel.value : Number(sel.value)));
        cbox.appendChild(sel);
      } else {
        const d = Challenges.get(L.challengeId);
        cbox.appendChild(UI.el('b', null, d ? (d.daily ? S('dailyTitle') : `${S('hudDefi')} ${challengeNumber(d)} — ${challengeField(d.id, 'title')}`) : '—'));
      }
      cbox.appendChild(UI.el('div', 'online-sub', S('mpCoopNote')));
      panel.appendChild(cbox);
    }

    // choix du personnage (vignettes ; "?" si jamais joue, mais on peut le choisir)
    panel.appendChild(UI.el('div', 'online-sub', S('mpPickChar')));
    const grid = UI.el('div', 'lobby-chars');
    const scenes = [];
    for (const id of allCharacterIds()) {
      const c = getCharacter(id);
      const known = Save.isCharKnown(id);
      const tile = UI.el('div', 'lobby-char' + (me && me.characterId === id ? ' active' : ''));
      tile.style.setProperty('--accent', c.color || '#7fd8ff');
      const sc = known ? createShowcase('character', id) : createMysteryShowcase(c.color);
      scenes.push(sc);
      tile.appendChild(sc.canvas);
      tile.appendChild(UI.el('span', null, known ? charName(id) : S('unknownName')));
      tile.onclick = () => NetClient.pickCharacter(id);
      grid.appendChild(tile);
    }
    panel.appendChild(grid);

    // pret / lancer
    const actions = UI.el('div', 'lobby-actions');
    const ready = UI.el('div', 'menu-btn menu-btn-small' + (me && me.ready ? ' active' : ''), me && me.ready ? S('mpUnready') : S('mpSetReady'));
    ready.onclick = () => NetClient.setReady(!(me && me.ready));
    actions.appendChild(ready);
    if (isHost) {
      const start = UI.el('div', 'menu-btn menu-btn-small lobby-start' + (L.canStart ? '' : ' disabled'), S('mpStart'));
      start.onclick = () => { if (L.canStart) NetClient.startMatch(); };
      actions.appendChild(start);
    }
    actions.appendChild(UI.el('div', 'online-sub', L.canStart ? (isHost ? S('mpCanStart') : S('mpHostStarts')) : S('mpWait_' + (L.waitingFor || 'players'))));
    panel.appendChild(actions);

    UI.overlay.appendChild(panel);
    UI.startPortraitAnim(scenes);
    if (full) NetClient.lastError = '';
  },

  // ================= PENDANT LA PARTIE =================
  buildGameOverlay() {
    const root = UI.el('div', 'online-hud');
    const score = UI.el('div', 'ohud-score');
    const banner = UI.el('div', 'ohud-banner');
    const feed = UI.el('div', 'ohud-feed');
    const roster = UI.el('div', 'ohud-roster');
    const conn = UI.el('div', 'ohud-conn');
    root.appendChild(score); root.appendChild(banner); root.appendChild(feed); root.appendChild(roster); root.appendChild(conn);
    UI.overlay.appendChild(root);
    this._gameRefs = { root, score, banner, feed, roster, conn, lastFeed: '' };
    this.updateConnectionBanner();
  },

  updateConnectionBanner() {
    const r = this._gameRefs;
    if (!r || !r.conn.isConnected) return;
    r.conn.style.display = NetClient.status === 'online' ? 'none' : 'block';
    r.conn.textContent = S('mpReconnecting');
  },

  nameOf(netId) {
    const g = OnlineGame.g;
    const r = (g && g.roster || []).find((x) => x.netId === netId) || OnlineGame.roster.find((x) => x.netId === netId);
    return r ? r.name : '?';
  },

  updateGameOverlay() {
    const r = this._gameRefs, g = OnlineGame.g;
    if (!r || !g) return;
    const fmt = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
    const me = OnlineGame.view && OnlineGame.view.player;
    // --- score / chrono ---
    let top = '';
    if (g.kind === 'versus') {
      const crys = (t) => { const c = (OnlineGame.view.enemies || []).find((e) => e.kind === 'crystal' && e.team === t); return c ? Math.round(c.pct * 100) : 0; };
      top = `<span style="color:${mpTeamColor('A')}">${this.teamName('A')} ${g.roundWins.A}</span> · ${S('mpRound')} ${g.round}/${g.rounds} · <span style="color:${mpTeamColor('B')}">${g.roundWins.B} ${this.teamName('B')}</span><small>${S('mpCrystal')} ${crys('A')}% / ${crys('B')}% · ${fmt(g.roundLimit - (g.roundTime || 0))}</small>`;
    } else if (g.kind === 'foot') {
      top = `<span style="color:${mpTeamColor('A')}">${this.teamName('A')} ${g.score.A}</span> — <span style="color:${mpTeamColor('B')}">${g.score.B} ${this.teamName('B')}</span><small>${g.overtime ? S('mpGoldenGoal') : fmt(g.limit - g.time)} · ${S('mpFirstTo')} ${g.goalsToWin}</small>`;
    } else if (g.kind === 'survivor') {
      const alive = (OnlineGame.view.players || []).filter((p) => !p.dead).length;
      top = `${S('mpSurvivors')} : ${alive}/${g.roster.length}<small>${g.time >= g.suddenDeathAt ? S('mpSuddenDeath') : fmt(g.suddenDeathAt - g.time) + ' ' + S('mpBeforeSudden')}</small>`;
    } else if (g.kind === 'coop') {
      const d = Challenges.get(g.challengeId);
      top = `${d ? (d.daily ? S('dailyTitle') : S('hudDefi') + ' ' + challengeNumber(d)) : ''} · ${S('hudRoom')} ${g.roomNum}/${g.rooms}<small>${formatTime(g.elapsedMs)}</small>`;
    }
    if (r._top !== top) { r.score.innerHTML = top; r._top = top; }
    // --- bandeau central ---
    let banner = '';
    if (g.phase === 'countdown') banner = g.kind === 'versus' ? `${S('mpRound')} ${g.round} — ${Math.ceil(g.timer)}` : String(Math.ceil(g.timer));
    else if (g.phase === 'roundEnd') {
      const last = g.roundResults[g.roundResults.length - 1];
      banner = last ? (last.winner ? `${this.teamName(last.winner)} ${S('mpWinsRound')} (${S('mpReason_' + last.reason)})` : S('mpRoundDraw')) : '';
      if (g.round < g.rounds) banner += `<small>${S('mpSwapNext')}</small>`;
    } else if (me && me.dead && !OnlineGame.over) {
      const resp = g.respawns && g.respawns.find((q) => q.netId === OnlineGame.you);
      banner = resp ? `${S('mpRespawnIn')} ${Math.ceil(resp.t)}` : S('mpSpectator');
    }
    if (r._banner !== banner) { r.banner.innerHTML = banner; r.banner.style.display = banner ? 'block' : 'none'; r._banner = banner; }
    // --- joueurs ---
    const rows = (OnlineGame.view.players || []).map((p) => {
      const pct = Math.round((p.speedMode ? p.speedPct : p.damageMultiplier) * 100);
      const ping = OnlineGame.pings[p.netId];
      return `<div class="ohud-p${p.dead ? ' dead' : ''}${p.id === OnlineGame.myId() ? ' me' : ''}"><i style="background:${mpTeamColor(p.team)}"></i><b>${escapeHtml(p.name || '?')}</b><span>${charName(p.characterId)}</span><em>${p.dead ? '✖' : pct + '%'}</em>${ping != null ? `<small>${ping} ms</small>` : ''}</div>`;
    }).join('');
    if (r._rows !== rows) { r.roster.innerHTML = rows; r._rows = rows; }
    // --- fil des evenements ---
    const fj = JSON.stringify(g.feed || []);
    if (fj !== r.lastFeed) {
      r.lastFeed = fj;
      r.feed.innerHTML = (g.feed || []).slice(-4).map((f) => {
        if (f.goal) return `<div>⚽ ${escapeHtml(this.nameOf(f.by))} → ${this.teamName(f.goal)}</div>`;
        if (f.crystal) return `<div>💎 ${S('mpCrystalOf')} ${this.teamName(f.crystal)} ${S('mpDestroyed')}</div>`;
        return `<div>✖ ${escapeHtml(this.nameOf(f.victim))}${f.by ? ' ← ' + escapeHtml(this.nameOf(f.by)) : ''}${f.cause === 'forfeit' ? ' (' + S('mpForfeit') + ')' : ''}</div>`;
      }).join('');
    }
  },

  // Echap pendant la partie : quitter (abandon) ou reprendre.
  toggleLeaveMenu() {
    if (this._leaveEl && this._leaveEl.isConnected) { this._leaveEl.remove(); this._leaveEl = null; return; }
    const p = UI.el('div', 'panel round-end online-leave');
    p.appendChild(UI.el('h2', null, S('mpLeaveTitle')));
    p.appendChild(UI.el('div', 'menu-sub round-end-sub', OnlineGame.over ? '' : S('mpLeaveWarn')));
    const stay = UI.el('div', 'menu-btn menu-btn-small', S('mpResume'));
    stay.onclick = () => this.toggleLeaveMenu();
    const quit = UI.el('div', 'menu-btn menu-btn-small', S('mpQuit'));
    quit.onclick = () => { this._leaveEl = null; OnlineGame.leave(true); };
    p.appendChild(stay); p.appendChild(quit);
    UI.overlay.appendChild(p);
    this._leaveEl = p;
  },

  showResults(res) {
    const r = res || {};
    const g = OnlineGame.g || {};
    const myTeam = (g.roster || []).find((x) => x.netId === OnlineGame.you);
    let title = S('mpDraw'), sub = '';
    if (r.kind === 'versus' || r.kind === 'foot') {
      if (r.winner) title = myTeam && myTeam.team === r.winner ? S('mpVictory') : S('mpDefeat');
      if (r.kind === 'versus') sub = (r.rounds || []).map((x) => `${S('mpRound')} ${x.round} : ${x.winner ? this.teamName(x.winner) + ' (' + S('mpReason_' + x.reason) + ')' : S('mpRoundDraw')}`).join(' · ') + (r.tiebreak ? ` · ${S('mpTiebreak')}` : '') + (r.forfeit ? ` · ${S('mpForfeitWin')}` : '');
      else sub = `${this.teamName('A')} ${r.score.A} — ${r.score.B} ${this.teamName('B')}${r.forfeit ? ' · ' + S('mpForfeitWin') : ''}`;
    } else if (r.kind === 'survivor') {
      const won = (r.winners || []).includes(OnlineGame.you);
      title = won ? (r.winners.length > 1 ? S('mpDraw') : S('mpVictory')) : S('mpDefeat');
      sub = (r.placements || []).map((id, i) => `${i + 1}. ${this.nameOf(id)}`).join('   ');
    } else if (r.kind === 'coop') {
      title = r.abandoned ? S('mpAbandoned') : S('challengeDone');
      sub = r.timeMs ? `${S('time')} : ${formatTime(r.timeMs)}${OnlineGame.isRecord ? '  —  ' + S('newRecord') : ''}` : '';
    }
    const p = UI.el('div', 'panel round-end online-results');
    p.appendChild(UI.el('h2', null, title));
    p.appendChild(UI.el('div', 'menu-sub round-end-sub', sub));
    const back = UI.el('div', 'menu-btn menu-btn-small', S('mpBackLobby'));
    back.onclick = () => OnlineGame.leave(false);
    const quit = UI.el('div', 'menu-btn menu-btn-small', S('mpQuit'));
    quit.onclick = () => { NetClient.leaveLobby(); OnlineGame.leave(false); };
    p.appendChild(back); p.appendChild(quit);
    UI.overlay.appendChild(p);
  },
};

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
