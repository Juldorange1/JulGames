// Interface : menus, ecrans, HUD (DOM au dessus du canvas)

const UI = {
  overlay: null,
  hudRefs: null,
  roundEndShown: false,
  _pauseEl: null,

  init() { this.overlay = document.getElementById('overlay'); },

  clear() {
    this.overlay.innerHTML = '';
    this.hudRefs = null;
    this.roundEndShown = false;
    this._pauseEl = null;
    this.stopPortraitAnim();
  },

  stopPortraitAnim() {
    if (this._portraitAnimId != null) { cancelAnimationFrame(this._portraitAnimId); this._portraitAnimId = null; }
    this._portraits = null;
  },

  showPause() {
    if (this._pauseEl) return;
    const panel = this.el('div', 'panel pause-panel');
    panel.appendChild(this.el('h2', null, S('pauseTitle')));
    const resume = this.el('div', 'menu-btn menu-btn-small', S('resume'));
    resume.onclick = () => Game.togglePause();
    const abandon = this.el('div', 'menu-btn menu-btn-small', S('abandon'));
    abandon.onclick = () => Game.goToMenu();
    panel.appendChild(resume);
    panel.appendChild(abandon);
    this.overlay.appendChild(panel);
    this._pauseEl = panel;
  },

  hidePause() {
    if (this._pauseEl) { this._pauseEl.remove(); this._pauseEl = null; }
  },

  onStateChange(state) {
    this.clear();
    if (state === STATE.MENU) this.buildHubOverlay();
    else if (state === STATE.MARKET) this.renderMarket();
    else if (state === STATE.CHAR_SELECT) this.renderCharSelect();
    else if (state === STATE.CHALLENGE_SELECT) this.renderChallengeSelect();
    else if (state === STATE.CHALLENGE_EDITOR) this.renderChallengeEditor();
    else if (state === STATE.SETTINGS) this.renderSettings();
    else if (state === STATE.BESTIARY) this.renderBestiary();
    else if (state === STATE.TEST_ROOM || state === STATE.EXPEDITION || state === STATE.CHALLENGE) this.buildHUD(state);
  },

  el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  },

  backBtn(onClick) {
    const back = this.el('div', 'back-btn', `‹ ${S('back')}`);
    back.onclick = onClick;
    return back;
  },

  // ---------------- HUB (salle d'accueil) ----------------
  buildHubOverlay() {
    const hud = this.el('div', 'hud');
    hud.appendChild(this.el('div', 'hub-title', S('menuTitle')));
    hud.appendChild(this.el('div', 'hub-money', formatMoney(Save.getMoney())));
    hud.appendChild(this.el('div', 'hub-hint', S('hubHint')));
    this.overlay.appendChild(hud);
  },

  // ---------------- MARCHE (agrandir/amenager le hub) ----------------
  renderMarket() {
    const panel = this.el('div', 'panel market-panel');
    panel.appendChild(this.backBtn(() => Game.setState(STATE.MENU)));

    const header = this.el('div', 'market-header');
    header.appendChild(this.el('h2', null, S('marketTitle')));
    header.appendChild(this.el('div', 'market-money-badge', formatMoney(Save.getMoney())));
    panel.appendChild(header);

    if (!this._marketTab) this._marketTab = 'expand';
    if (!this._marketDecorType) this._marketDecorType = 'teleporter';
    if (!this._marketWallColor) this._marketWallColor = '#7fd8ff';
    if (!this._marketWindDir) this._marketWindDir = 'up';
    if (!this._marketMoveKey) this._marketMoveKey = 'market';

    const tabLabelKey = { expand: 'marketTabExpand', move: 'marketTabMove', add: 'marketTabAdd', remove: 'marketTabRemove' };
    const tabCost = { expand: HUB_EXPAND_COST, move: HUB_MOVE_COST, add: HUB_DECOR_COST, remove: null };
    const tabRow = this.el('div', 'market-tabs');
    for (const t of ['expand', 'move', 'add', 'remove']) {
      const b = this.el('div', 'market-tab' + (this._marketTab === t ? ' active' : ''));
      b.appendChild(this.el('div', 'market-tab-name', S(tabLabelKey[t])));
      if (tabCost[t] != null) b.appendChild(this.el('div', 'market-tab-cost', `${tabCost[t]}€`));
      b.onclick = () => { this._marketTab = t; Game.setState(STATE.MARKET); };
      tabRow.appendChild(b);
    }
    panel.appendChild(tabRow);
    panel.appendChild(this.el('div', 'market-hint', S('marketHint_' + this._marketTab)));

    if (this._marketTab === 'add') {
      const options = this.el('div', 'market-options');
      const optRow = this.el('div', 'lang-row');
      for (const dt of ['teleporter', 'wall', 'wind']) {
        const b = this.el('div', 'lang-btn' + (this._marketDecorType === dt ? ' active' : ''), S('marketDecor_' + dt));
        b.onclick = () => { this._marketDecorType = dt; Game.setState(STATE.MARKET); };
        optRow.appendChild(b);
      }
      options.appendChild(optRow);
      if (this._marketDecorType === 'wall') {
        const colorRow = this.el('div', 'volume-row');
        colorRow.appendChild(this.el('div', 'keybind-name', S('marketWallColor')));
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.className = 'market-color-input';
        colorInput.value = this._marketWallColor;
        colorInput.addEventListener('input', () => { this._marketWallColor = colorInput.value; });
        colorRow.appendChild(colorInput);
        options.appendChild(colorRow);
      }
      if (this._marketDecorType === 'wind') {
        const dirRow = this.el('div', 'lang-row');
        for (const d of ['up', 'down', 'left', 'right']) {
          const b = this.el('div', 'lang-btn' + (this._marketWindDir === d ? ' active' : ''), S('marketDir_' + d));
          b.onclick = () => { this._marketWindDir = d; Game.setState(STATE.MARKET); };
          dirRow.appendChild(b);
        }
        options.appendChild(dirRow);
      }
      panel.appendChild(options);
    }

    if (this._marketTab === 'move') {
      const options = this.el('div', 'market-options');
      const meta = hubDoorMeta();
      const keyRow = this.el('div', 'lang-row');
      for (const key of hubKeyList().concat(['spawn'])) {
        const label = meta[key] ? S(meta[key].labelKey) : S('hubSpawn');
        const b = this.el('div', 'lang-btn' + (this._marketMoveKey === key ? ' active' : ''), label);
        b.onclick = () => { this._marketMoveKey = key; Game.setState(STATE.MARKET); };
        keyRow.appendChild(b);
      }
      options.appendChild(keyRow);
      panel.appendChild(options);
    }

    const legend = this.el('div', 'market-legend');
    legend.appendChild(this.legendItem('has-block', S('marketLegendBlock')));
    legend.appendChild(this.legendItem('has-decor', S('marketLegendDecor')));
    legend.appendChild(this.legendItem('candidate', S('marketLegendCandidate')));
    panel.appendChild(legend);

    panel.appendChild(this.buildMarketGrid());
    this.overlay.appendChild(panel);
  },

  legendItem(cls, text) {
    const item = this.el('div', 'market-legend-item');
    item.appendChild(this.el('div', 'market-legend-swatch ' + cls));
    item.appendChild(this.el('div', null, text));
    return item;
  },

  buildMarketGrid() {
    const mode = this._marketTab;
    const occ = hubCellsSet();
    const { minGx, maxGx, minGy, maxGy } = hubBounds();
    const pad = 1;
    const gMinGx = minGx - pad, gMaxGx = maxGx + pad, gMinGy = minGy - pad, gMaxGy = maxGy + pad;
    const cols = gMaxGx - gMinGx + 1;
    const board = this.el('div', 'market-board');
    const grid = this.el('div', 'market-grid');
    grid.style.gridTemplateColumns = `repeat(${cols}, 36px)`;
    const meta = hubDoorMeta();
    const decorAt = {};
    for (const d of Save.data.hub.decor) decorAt[hubCellKey(d.gx, d.gy)] = d;
    const doorAt = {};
    for (const [key, pos] of Object.entries(Save.data.hub.doors)) doorAt[hubCellKey(pos.gx, pos.gy)] = key;
    const windGlyph = { up: '↑', down: '↓', left: '←', right: '→' };

    for (let gy = gMinGy; gy <= gMaxGy; gy++) {
      for (let gx = gMinGx; gx <= gMaxGx; gx++) {
        const key = hubCellKey(gx, gy);
        const isOcc = occ.has(key);
        const doorKey = doorAt[key];
        const decor = decorAt[key];
        const cell = this.el('div', 'market-cell' + (isOcc ? ' occ' : ''));
        if (doorKey) {
          const label = meta[doorKey] ? S(meta[doorKey].labelKey) : S('hubSpawn');
          cell.classList.add('has-block');
          cell.title = label;
          cell.textContent = label.slice(0, 2);
        } else if (decor) {
          cell.classList.add('has-decor', 'decor-' + decor.type);
          if (decor.type === 'wall') cell.style.background = decor.color;
          cell.title = S('marketDecor_' + decor.type);
          cell.textContent = decor.type === 'teleporter' ? '◎' : (decor.type === 'wind' ? (windGlyph[decor.dir] || '→') : '');
        }
        let isCandidate = false;
        if (mode === 'expand') isCandidate = !isOcc && hubAdjacentToExisting(gx, gy);
        else if (mode === 'move' || mode === 'add') isCandidate = isOcc && !doorKey && !decor;
        else if (mode === 'remove') isCandidate = !!decor;
        if (isCandidate) cell.classList.add('candidate');
        cell.onclick = () => this.onMarketCellClick(gx, gy, isOcc, doorKey, decor);
        grid.appendChild(cell);
      }
    }
    board.appendChild(grid);
    return board;
  },

  onMarketCellClick(gx, gy, isOcc, doorKey, decor) {
    const mode = this._marketTab;
    if (mode === 'expand') {
      if (isOcc || !hubAdjacentToExisting(gx, gy)) return;
      if (!Save.spendMoney(HUB_EXPAND_COST)) return;
      Save.data.hub.cells.push({ gx, gy });
      Save.persist();
    } else if (mode === 'move') {
      if (!isOcc || doorKey || decor) return;
      if (!Save.spendMoney(HUB_MOVE_COST)) return;
      Save.data.hub.doors[this._marketMoveKey] = { gx, gy };
      Save.persist();
    } else if (mode === 'add') {
      if (!isOcc || doorKey || decor) return;
      if (!Save.spendMoney(HUB_DECOR_COST)) return;
      const entry = { id: uid(), gx, gy, type: this._marketDecorType };
      if (this._marketDecorType === 'wall') entry.color = this._marketWallColor;
      if (this._marketDecorType === 'wind') entry.dir = this._marketWindDir;
      if (this._marketDecorType === 'teleporter') {
        const unpaired = Save.data.hub.decor.find((d) => d.type === 'teleporter' && !d.pairId);
        if (unpaired) { entry.pairId = uid(); unpaired.pairId = entry.pairId; }
      }
      Save.data.hub.decor.push(entry);
      Save.persist();
    } else if (mode === 'remove') {
      if (!decor) return;
      if (decor.type === 'teleporter' && decor.pairId) {
        const partner = Save.data.hub.decor.find((d) => d.pairId === decor.pairId && d.id !== decor.id);
        if (partner) partner.pairId = null;
      }
      Save.data.hub.decor = Save.data.hub.decor.filter((d) => d.id !== decor.id);
      Save.addMoney(HUB_DECOR_COST);
      Save.persist();
    }
    Game.setState(STATE.MARKET);
  },

  // ---------------- SELECTION / SHOWCASE PERSONNAGES ----------------
  renderCharSelect() {
    const mode = Game.pendingCharSelectMode || 'showcase';
    const panel = this.el('div', 'panel');
    panel.appendChild(this.backBtn(() => Game.setState(STATE.MENU)));
    panel.appendChild(this.el('h2', null, mode === 'expedition' ? S('charSelectTitle') : S('charShowcaseTitle')));

    // Le multiplicateur de vitesse du jeu se choisit en meme temps que le personnage, juste avant
    // de lancer l'expedition (et non plus dans un ecran de parametres separe).
    if (mode === 'expedition') {
      const speedSection = this.el('div', 'settings-section speed-inline');
      speedSection.appendChild(this.el('h3', null, S('settingsSpeedMult')));
      const speedRow = this.el('div', 'volume-row');
      const speedSlider = document.createElement('input');
      speedSlider.type = 'range';
      speedSlider.min = String(SPEED_MULT_MIN); speedSlider.max = String(SPEED_MULT_MAX); speedSlider.step = '10';
      speedSlider.value = String(Save.data.speedMult || SPEED_MULT_DEFAULT);
      speedSlider.className = 'volume-slider';
      const speedValue = this.el('div', 'volume-value', `${Save.data.speedMult || SPEED_MULT_DEFAULT}%`);
      speedSlider.addEventListener('input', () => {
        const v = Number(speedSlider.value);
        Save.setSpeedMult(v);
        speedValue.textContent = `${v}%`;
      });
      speedRow.appendChild(speedSlider);
      speedRow.appendChild(speedValue);
      speedSection.appendChild(speedRow);
      panel.appendChild(speedSection);
    }

    const grid = this.el('div', 'char-grid');
    const portraits = [];
    for (const id of allCharacterIds()) {
      const c = getCharacter(id);
      const card = this.el('div', 'char-card');
      card.style.setProperty('--accent', c.color || '#7fd8ff');
      const portrait = this.el('div', 'char-portrait');
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 128;
      const cx = canvas.getContext('2d');
      if (c.draw) {
        const fake = { state: {}, x: 0, y: 0, aim: { x: 20, y: 0 }, facing: 0, radius: PLAYER_RADIUS, totalTime: 0, history: [{ t: 0, x: 0, y: 0 }], character: c };
        if (c.init) c.init(fake);
        portraits.push({ ctx: cx, canvas, character: c, fake });
      }
      portrait.appendChild(canvas);
      card.appendChild(portrait);
      const body = this.el('div', 'char-card-body');
      body.appendChild(this.el('h3', null, `${id}. ${charName(id)}`));
      body.appendChild(this.el('div', 'char-epithet', charEpithet(id)));
      body.appendChild(this.el('div', 'stat-line', `${S('speed')} : ${c.speedPercent}%`));
      body.appendChild(mkAbilityLine(S('attack'), charField(id, 'attackLabel')));
      body.appendChild(mkAbilityLine(`${S('ability')}1 (${keyLabel(Keybinds.ability1)})`, `${charField(id, 'a1Label')}${c.a1Cd ? ' — ' + c.a1Cd + 's' : ''}`));
      body.appendChild(mkAbilityLine(`${S('ability')}2 (${keyLabel(Keybinds.ability2)})`, `${charField(id, 'a2Label')}${c.a2Cd ? ' — ' + c.a2Cd + 's' : ''}`));
      body.appendChild(mkAbilityLine(`${S('ability')}3 (${keyLabel(Keybinds.ability3)})`, `${charField(id, 'a3Label')}${c.a3Cd ? ' — ' + c.a3Cd + 's' : ''}`));
      const rec = Save.getExpeditionRecord(id);
      body.appendChild(this.el('div', 'best', `${S('recordExpedition')} : ${rec != null ? formatTime(rec) : '--:--.---'}`));
      card.appendChild(body);
      card.onclick = () => {
        if (mode === 'expedition') Game.startExpedition(id);
        else Game.startTestRoom(id);
      };
      grid.appendChild(card);
    }
    panel.appendChild(grid);
    this.overlay.appendChild(panel);

    // Portraits animes : les persos ont des idles/rotations/pulsations basees sur le temps
    // (idleBob, orbes qui tournent...), invisibles sur un rendu fige a l'ouverture de l'ecran.
    this.stopPortraitAnim();
    this._portraits = portraits;
    const animate = () => {
      for (const p of this._portraits) {
        p.ctx.setTransform(1, 0, 0, 1, 0, 0);
        p.ctx.clearRect(0, 0, p.canvas.width, p.canvas.height);
        p.ctx.translate(64, 68);
        p.ctx.scale(2.1, 2.1);
        try { p.character.draw(p.ctx, p.fake, null); } catch (e) { /* apercu indisponible pour ce personnage */ }
      }
      this._portraitAnimId = requestAnimationFrame(animate);
    };
    this._portraitAnimId = requestAnimationFrame(animate);
  },

  // ---------------- DEFIS ----------------
  renderChallengeSelect() {
    const panel = this.el('div', 'panel');
    panel.appendChild(this.backBtn(() => Game.setState(STATE.MENU)));
    panel.appendChild(this.el('h2', null, S('challengesTitle')));
    const list = this.el('div', 'challenge-list');
    for (const def of CHALLENGE_DEFS) {
      const card = this.el('div', 'challenge-card');
      card.style.setProperty('--accent', getCharacter(def.characterId).color || '#7fd8ff');
      card.appendChild(this.el('h4', null, `${S('hudDefi')} ${def.id} — ${charName(def.characterId)}`));
      card.appendChild(this.el('p', 'challenge-title', challengeField(def.id, 'title')));
      card.appendChild(this.el('p', null, challengeField(def.id, 'desc')));
      const rec = Save.getChallengeRecord(def.id);
      card.appendChild(this.el('div', 'best', `${S('record')} : ${rec != null ? formatTime(rec) : '--:--.---'}   ·   ${S('challengeReward')} : +${formatMoney(CHALLENGE_REWARD)}`));
      card.onclick = () => Game.startChallenge(def.id);
      list.appendChild(card);
    }
    panel.appendChild(list);

    // Defis personnalises : crees par le joueur, avec record de temps mais sans gain d'argent.
    panel.appendChild(this.el('h3', null, S('customChallengesTitle')));
    const createBtn = this.el('div', 'menu-btn menu-btn-small', `+ ${S('customCreate')}`);
    createBtn.onclick = () => { this._draft = null; this._editorScroll = 0; Game.setState(STATE.CHALLENGE_EDITOR); };
    panel.appendChild(createBtn);
    const customList = this.el('div', 'challenge-list');
    for (const c of Save.data.customChallenges) {
      const card = this.el('div', 'challenge-card');
      card.style.setProperty('--accent', getCharacter(c.characterId).color || '#7fd8ff');
      card.appendChild(this.el('h4', null, `${c.name} — ${charName(c.characterId)}`));
      const enemyCount = Object.values(c.enemies || {}).reduce((a, b) => a + b, 0);
      const summary = `${S('customEnemies')} : ${enemyCount}${c.bossType ? ' + ' + BOSS_DEFS[c.bossType].name : ''}   ·   ${S('ability')}${c.abilityGate}   ·   ${S('customNoMoney')}`;
      card.appendChild(this.el('p', null, summary));
      card.appendChild(this.el('div', 'best', `${S('record')} : ${c.record != null ? formatTime(c.record) : '--:--.---'}`));
      const del = this.el('div', 'custom-delete', S('customDelete'));
      del.onclick = (e) => { e.stopPropagation(); Save.removeCustomChallenge(c.id); Game.setState(STATE.CHALLENGE_SELECT); };
      card.appendChild(del);
      card.onclick = () => Game.startChallenge(c.id);
      customList.appendChild(card);
    }
    if (!Save.data.customChallenges.length) customList.appendChild(this.el('div', 'menu-sub', S('customNone')));
    panel.appendChild(customList);
    this.overlay.appendChild(panel);
  },

  // ---------------- EDITEUR DE DEFI PERSONNALISE ----------------
  renderChallengeEditor() {
    if (!this._draft) this._draft = { name: '', characterId: 1, abilityGate: 1, theme: 1, enemies: { T1: 2 }, bossType: null };
    const d = this._draft;
    const panel = this.el('div', 'panel');
    const refresh = () => { this._editorScroll = panel.scrollTop; Game.setState(STATE.CHALLENGE_EDITOR); };
    panel.appendChild(this.backBtn(() => Game.setState(STATE.CHALLENGE_SELECT)));
    panel.appendChild(this.el('h2', null, S('customCreate')));
    const wrap = this.el('div', 'settings-wrap');

    const section = (titleKey) => {
      const s = this.el('div', 'settings-section');
      s.appendChild(this.el('h3', null, S(titleKey)));
      wrap.appendChild(s);
      return s;
    };
    const choiceRow = (parent, items, isActive, onPick) => {
      const row = this.el('div', 'lang-row editor-row');
      for (const it of items) {
        const b = this.el('div', 'lang-btn' + (isActive(it.value) ? ' active' : ''), it.label);
        b.onclick = () => { onPick(it.value); refresh(); };
        row.appendChild(b);
      }
      parent.appendChild(row);
    };

    const nameSec = section('customName');
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.maxLength = 32;
    nameInput.className = 'editor-name';
    nameInput.placeholder = S('customNamePlaceholder');
    nameInput.value = d.name;
    nameInput.addEventListener('input', () => { d.name = nameInput.value; });
    nameSec.appendChild(nameInput);

    choiceRow(section('customCharacter'), allCharacterIds().map((id) => ({ value: id, label: charName(id) })),
      (v) => d.characterId === v, (v) => { d.characterId = v; });

    const c = getCharacter(d.characterId);
    choiceRow(section('customAbility'), [1, 2, 3].map((n) => ({ value: n, label: `${S('ability')}${n} : ${charField(c.id, 'a' + n + 'Label')}` })),
      (v) => d.abilityGate === v, (v) => { d.abilityGate = v; });

    choiceRow(section('customTheme'), [1, 2, 3].map((n) => ({ value: n, label: S('customTheme_' + n) })),
      (v) => d.theme === v, (v) => { d.theme = v; });

    const enemySec = section('customEnemies');
    const grid = this.el('div', 'editor-enemy-grid');
    for (const type of ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12']) {
      const cell = this.el('div', 'editor-enemy');
      cell.appendChild(this.el('div', 'editor-enemy-name', `${type} — ${turretInfo(type).name}`));
      const ctr = this.el('div', 'editor-counter');
      const minus = this.el('div', 'editor-counter-btn', '−');
      const count = this.el('div', 'editor-counter-val', String(d.enemies[type] || 0));
      const plus = this.el('div', 'editor-counter-btn', '+');
      minus.onclick = () => { d.enemies[type] = Math.max(0, (d.enemies[type] || 0) - 1); if (!d.enemies[type]) delete d.enemies[type]; refresh(); };
      plus.onclick = () => { d.enemies[type] = Math.min(6, (d.enemies[type] || 0) + 1); refresh(); };
      ctr.appendChild(minus); ctr.appendChild(count); ctr.appendChild(plus);
      cell.appendChild(ctr);
      grid.appendChild(cell);
    }
    enemySec.appendChild(grid);

    choiceRow(section('customBoss'), [{ value: null, label: S('customNoBoss') }].concat(['B1', 'B2', 'B3', 'B4', 'B5', 'B6'].map((t) => ({ value: t, label: BOSS_DEFS[t].name }))),
      (v) => d.bossType === v, (v) => { d.bossType = v; });

    const total = Object.values(d.enemies).reduce((a, b) => a + b, 0) + (d.bossType ? 1 : 0);
    const actions = this.el('div', 'editor-actions');
    const save = (thenPlay) => {
      if (total === 0) return;
      const entry = Save.addCustomChallenge({
        name: d.name.trim() || `${S('customDefaultName')} ${Save.data.customChallenges.length + 1}`,
        characterId: d.characterId, abilityGate: d.abilityGate, theme: d.theme,
        enemies: Object.assign({}, d.enemies), bossType: d.bossType,
      });
      this._draft = null;
      if (thenPlay) Game.startChallenge(entry.id);
      else Game.setState(STATE.CHALLENGE_SELECT);
    };
    const saveBtn = this.el('div', 'menu-btn menu-btn-small' + (total === 0 ? ' disabled' : ''), S('customSave'));
    saveBtn.onclick = () => save(false);
    const playBtn = this.el('div', 'menu-btn menu-btn-small' + (total === 0 ? ' disabled' : ''), S('customSavePlay'));
    playBtn.onclick = () => save(true);
    actions.appendChild(saveBtn); actions.appendChild(playBtn);
    if (total === 0) actions.appendChild(this.el('div', 'menu-sub', S('customNeedEnemy')));
    wrap.appendChild(actions);

    panel.appendChild(wrap);
    this.overlay.appendChild(panel);
    panel.scrollTop = this._editorScroll || 0;
  },

  // ---------------- REPERTOIRE & STATISTIQUES (menu unique) ----------------
  renderBestiary() {
    const panel = this.el('div', 'panel');
    panel.appendChild(this.backBtn(() => Game.setState(STATE.MENU)));
    panel.appendChild(this.el('h2', null, S('bestiaryTitle')));

    panel.appendChild(this.el('h3', null, S('recordsExpeditions')));
    const list1 = this.el('div', 'record-list');
    for (const id of allCharacterIds()) {
      const row = this.el('div', 'record-row');
      row.appendChild(this.el('span', null, `${id}. ${charName(id)}`));
      const money = this.el('span', 'money', formatMoney(Save.getMoneyForChar(id)));
      row.appendChild(money);
      const rec = Save.getExpeditionRecord(id);
      row.appendChild(this.el('span', 'time', rec != null ? formatTime(rec) : '--:--.---'));
      list1.appendChild(row);
    }
    panel.appendChild(list1);

    panel.appendChild(this.el('h3', null, S('recordsChallenges')));
    const list2 = this.el('div', 'record-list');
    for (const def of CHALLENGE_DEFS) {
      const row = this.el('div', 'record-row');
      row.appendChild(this.el('span', null, `${S('hudDefi')} ${def.id} — ${challengeField(def.id, 'title')}`));
      const rec = Save.getChallengeRecord(def.id);
      row.appendChild(this.el('span', 'time', rec != null ? formatTime(rec) : '--:--.---'));
      list2.appendChild(row);
    }
    panel.appendChild(list2);

    panel.appendChild(this.el('h3', null, S('bestiaryTurrets')));
    const tGrid = this.el('div', 'char-grid');
    for (const type of ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12']) {
      const info = turretInfo(type);
      const card = this.el('div', 'char-card');
      const accent = TURRET_COLOR[type] || '#7fd8ff';
      card.style.setProperty('--accent', accent);
      const portrait = this.el('div', 'char-portrait');
      const canvas = document.createElement('canvas');
      canvas.width = 110; canvas.height = 110;
      const cx = canvas.getContext('2d');
      cx.translate(55, 55); cx.scale(2.4, 2.4);
      try { (TURRET_BODY[type] || bodyT1)(cx, { type, aimAngle: -Math.PI / 2, phase: -Math.PI / 2, charging: false }, accent); } catch (e) { /* apercu indisponible */ }
      portrait.appendChild(canvas);
      card.appendChild(portrait);
      const body = this.el('div', 'char-card-body');
      body.appendChild(this.el('h3', null, `${type} — ${info.name}`));
      body.appendChild(this.el('div', 'stat-line', `${S('bestiaryHp')} : ${Math.round(TURRET_HP[type] * ENEMY_HP_MULT)}   ${S('bestiaryLoss')} : ${TURRET_LOSS[type]}%`));
      body.appendChild(this.el('div', 'ability-line', info.desc));
      body.appendChild(this.el('div', 'best', `${S('bestiaryKills')} : ${Save.getKillCount(type)}`));
      card.appendChild(body);
      tGrid.appendChild(card);
    }
    panel.appendChild(tGrid);

    panel.appendChild(this.el('h3', null, S('bestiaryBosses')));
    const bGrid = this.el('div', 'char-grid');
    for (const type of ['B1', 'B2', 'B3', 'B4', 'B5', 'B6']) {
      const def = BOSS_DEFS[type];
      const info = bossInfo(type);
      const card = this.el('div', 'char-card');
      card.style.setProperty('--accent', def.color);
      const portrait = this.el('div', 'char-portrait');
      const canvas = document.createElement('canvas');
      canvas.width = 110; canvas.height = 110;
      const cx = canvas.getContext('2d');
      cx.translate(55, 60); cx.scale(1.35, 1.35);
      try { drawBoss(cx, { x: 0, y: 0 }, { type, x: 0, y: 0, radius: def.radius || 34, hp: def.hp * ENEMY_HP_MULT, maxHp: def.hp * ENEMY_HP_MULT, color: def.color, phase: 1, name: def.name, state: {} }); } catch (e) { /* apercu indisponible */ }
      portrait.appendChild(canvas);
      card.appendChild(portrait);
      const body = this.el('div', 'char-card-body');
      body.appendChild(this.el('h3', null, def.name));
      body.appendChild(this.el('div', 'stat-line', `${S('bestiaryHp')} : ${Math.round(def.hp * ENEMY_HP_MULT)}   ${S('bestiaryContact')} : ${def.contact}%`));
      body.appendChild(this.el('div', 'ability-line', info.desc));
      body.appendChild(this.el('div', 'best', `${S('bestiaryKills')} : ${Save.getKillCount(type)}`));
      card.appendChild(body);
      bGrid.appendChild(card);
    }
    panel.appendChild(bGrid);
    this.overlay.appendChild(panel);
  },

  // ---------------- PARAMETRES ----------------
  renderSettings() {
    const panel = this.el('div', 'panel');
    panel.appendChild(this.backBtn(() => Game.setState(STATE.MENU)));
    panel.appendChild(this.el('h2', null, S('settingsTitle')));

    const wrap = this.el('div', 'settings-wrap');

    // Langue
    const langSection = this.el('div', 'settings-section');
    langSection.appendChild(this.el('h3', null, S('settingsLanguage')));
    const langRow = this.el('div', 'lang-row');
    for (const code of ['fr', 'en']) {
      const b = this.el('div', 'lang-btn' + (lang() === code ? ' active' : ''), code.toUpperCase());
      b.onclick = () => { Save.setLanguage(code); Game.setState(STATE.SETTINGS); };
      langRow.appendChild(b);
    }
    langSection.appendChild(langRow);
    wrap.appendChild(langSection);

    // Son
    const soundSection = this.el('div', 'settings-section');
    soundSection.appendChild(this.el('h3', null, S('settingsSound')));
    const soundRow = this.el('div', 'lang-row');
    const soundBtn = this.el('div', 'lang-btn' + (Audio2.on ? ' active' : ''), Audio2.on ? 'ON' : 'OFF');
    soundBtn.onclick = () => { Audio2.toggle(); Game.setState(STATE.SETTINGS); };
    soundRow.appendChild(soundBtn);
    soundSection.appendChild(soundRow);

    const volRow = this.el('div', 'volume-row');
    volRow.appendChild(this.el('div', 'keybind-name', S('volume')));
    const volSlider = document.createElement('input');
    volSlider.type = 'range';
    volSlider.min = '0'; volSlider.max = '100'; volSlider.step = '1';
    volSlider.value = String(Math.round(Audio2.volume * 100));
    volSlider.className = 'volume-slider';
    const volValue = this.el('div', 'volume-value', `${Math.round(Audio2.volume * 100)}%`);
    let previewDebounce = null;
    volSlider.addEventListener('input', () => {
      const v = Number(volSlider.value) / 100;
      Audio2.setVolume(v);
      volValue.textContent = `${Math.round(v * 100)}%`;
      clearTimeout(previewDebounce);
      previewDebounce = setTimeout(() => Audio2.attack(), 60);
    });
    volRow.appendChild(volSlider);
    volRow.appendChild(volValue);
    soundSection.appendChild(volRow);
    wrap.appendChild(soundSection);

    // Curseur (apparence personnalisable)
    const cursorSection = this.el('div', 'settings-section');
    cursorSection.appendChild(this.el('h3', null, S('settingsCursor')));
    const cursorRow = this.el('div', 'volume-row');
    cursorRow.appendChild(this.el('div', 'keybind-name', S('marketWallColor')));
    const cursorColorInput = document.createElement('input');
    cursorColorInput.type = 'color';
    cursorColorInput.className = 'market-color-input';
    cursorColorInput.value = Save.data.cursorColor || '#ffffff';
    cursorColorInput.addEventListener('input', () => { Save.setCursorColor(cursorColorInput.value); });
    cursorRow.appendChild(cursorColorInput);
    cursorSection.appendChild(cursorRow);
    const cursorStyleRow = this.el('div', 'lang-row');
    for (const style of ['cross', 'circle', 'dot']) {
      const b = this.el('div', 'lang-btn' + ((Save.data.cursorStyle || 'cross') === style ? ' active' : ''), S('cursorStyle_' + style));
      b.onclick = () => { Save.setCursorStyle(style); Game.setState(STATE.SETTINGS); };
      cursorStyleRow.appendChild(b);
    }
    cursorSection.appendChild(cursorStyleRow);
    wrap.appendChild(cursorSection);

    // Raccourcis
    const keySection = this.el('div', 'settings-section');
    keySection.appendChild(this.el('h3', null, S('settingsKeybinds')));
    keySection.appendChild(this.el('div', 'menu-sub settings-hint', S('settingsKeybindsHint')));

    const codes = REBINDABLE_ACTIONS.map((a) => Keybinds[a]);
    const keyList = this.el('div', 'keybind-list');
    for (const action of REBINDABLE_ACTIONS) {
      const row = this.el('div', 'keybind-row');
      row.appendChild(this.el('div', 'keybind-name', S(ACTION_LABEL_KEY[action])));
      const chip = this.el('div', 'keybind-chip', keyLabel(Keybinds[action]));
      const isDup = codes.filter((c) => c === Keybinds[action]).length > 1;
      if (isDup) chip.classList.add('conflict');
      chip.onclick = () => {
        chip.textContent = S('settingsPressKey');
        chip.classList.add('listening');
        Input.startRebind((code) => {
          Save.setKeybind(action, code);
          Game.setState(STATE.SETTINGS);
        });
      };
      row.appendChild(chip);
      if (isDup) row.appendChild(this.el('div', 'keybind-conflict', S('settingsConflict')));
      keyList.appendChild(row);
    }
    keySection.appendChild(keyList);

    const resetBtn = this.el('div', 'menu-btn menu-btn-small');
    const resetTxt = this.el('div', 'btn-text');
    resetTxt.appendChild(this.el('div', 'btn-title', S('settingsReset')));
    resetBtn.appendChild(resetTxt);
    resetBtn.onclick = () => { Save.resetKeybinds(); Game.setState(STATE.SETTINGS); };
    keySection.appendChild(resetBtn);

    wrap.appendChild(keySection);
    panel.appendChild(wrap);
    this.overlay.appendChild(panel);
  },

  // ---------------- HUD ----------------
  buildHUD(state) {
    const hud = this.el('div', 'hud');
    const topLeft = this.el('div', 'hud-top-left');
    const nameEl = this.el('div', 'name', '');
    const dmgEl = this.el('div', 'hud-dmg', '');
    const dmgBar = this.el('div', 'hud-dmg-bar');
    const dmgBarFill = this.el('div', 'hud-dmg-bar-fill');
    dmgBar.appendChild(dmgBarFill);
    const progEl = this.el('div', 'hud-progress', '');
    topLeft.appendChild(nameEl); topLeft.appendChild(dmgEl); topLeft.appendChild(dmgBar); topLeft.appendChild(progEl);
    hud.appendChild(topLeft);

    const topRight = this.el('div', 'hud-top-right');
    const timeEl = this.el('div', 'time', '00:00.000');
    const bestEl = this.el('div', 'best', '');
    topRight.appendChild(timeEl); topRight.appendChild(bestEl);
    hud.appendChild(topRight);

    const abilities = this.el('div', 'hud-abilities');
    const slots = {};
    for (const key of ['attack', 'a1', 'a2', 'a3']) {
      const slot = this.el('div', 'ability-slot ready');
      const keyChip = this.el('div', 'key', '');
      slot.appendChild(keyChip);
      const nameLabel = this.el('div', 'label', '');
      slot.appendChild(nameLabel);
      const fill = this.el('div', 'cd-fill');
      fill.style.height = '0%';
      slot.appendChild(fill);
      const cdText = this.el('div', 'cd-text', '');
      slot.appendChild(cdText);
      abilities.appendChild(slot);
      slots[key] = { slot, fill, nameLabel, keyChip, cdText };
    }
    hud.appendChild(abilities);

    const msg = this.el('div', 'hud-message', '');
    msg.style.display = 'none';
    hud.appendChild(msg);

    const recap = this.el('div', 'controls-recap', S('controlsRecap'));
    hud.appendChild(recap);

    this.overlay.appendChild(hud);
    this.hudRefs = { nameEl, dmgEl, dmgBarFill, progEl, timeEl, bestEl, slots, msg, roundEndContainer: null };

    if (state === STATE.TEST_ROOM) { this.buildTestRoomBar(); this.buildTestRoomSpawner(); }
  },

  buildTestRoomSpawner() {
    const bar = this.el('div', 'test-spawn-bar');
    bar.style.pointerEvents = 'auto';
    bar.appendChild(this.el('div', 'test-spawn-label', S('testSpawnLabel')));
    const grid = this.el('div', 'test-spawn-grid');
    for (const type of ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6']) {
      const isBoss = type.charAt(0) === 'B';
      const b = this.el('div', 'test-spawn-btn' + (isBoss ? ' boss' : ''), type);
      b.title = isBoss ? BOSS_DEFS[type].name : turretInfo(type).name;
      b.onclick = () => Game.spawnTestEnemy(type);
      grid.appendChild(b);
    }
    bar.appendChild(grid);
    this.overlay.appendChild(bar);
  },

  buildTestRoomBar() {
    const bar = this.el('div', 'test-room-bar');
    bar.style.pointerEvents = 'auto';
    for (const id of allCharacterIds()) {
      const b = this.el('div', 'test-room-char', id);
      b.title = `${charName(id)} — ${charEpithet(id)}`;
      if (Game.world.player && Game.world.player.character.id === id) b.classList.add('active');
      b.onclick = () => Game.startTestRoom(id);
      bar.appendChild(b);
    }
    const backBtn = this.el('div', 'test-room-back', `‹ ${S('back')}`);
    backBtn.onclick = () => Game.goToMenu();
    bar.appendChild(backBtn);
    this.overlay.appendChild(bar);
  },

  updateHUD(game) {
    if (!this.hudRefs) return;
    const { world, state } = game;
    const player = world.player;
    if (!player) return;
    const r = this.hudRefs;
    r.nameEl.textContent = `${S('hudPersonnage')} : ${charName(player.character.id)}`;
    const pct = Math.round(player.damageMultiplier * 100);
    r.dmgEl.textContent = `${S('hudDamage')} : ${pct}%`;
    const dmgColor = pct >= 70 ? '#7fff9c' : (pct >= 35 ? '#ffd23d' : '#ff5d5d');
    r.dmgEl.style.color = dmgColor;
    r.dmgBarFill.style.width = `${pct}%`;
    r.dmgBarFill.style.background = dmgColor;

    let timeMs = 0, bestMs = null;
    if (state === STATE.EXPEDITION) {
      r.progEl.textContent = `${S('hudPart')} : ${Expedition.progressLabel()}   ${S('hudRoom')} : ${Expedition.roomLabel()}`;
      timeMs = Expedition.elapsedMs; bestMs = Save.getExpeditionRecord(Expedition.characterId);
    } else if (state === STATE.CHALLENGE) {
      const def = Challenges.get(Challenges.id);
      r.progEl.textContent = def.custom ? `${S('hudDefi')} : ${def.title}` : `${S('hudDefi')} ${def.id} : ${challengeField(def.id, 'title')}`;
      timeMs = Challenges.elapsedMs; bestMs = Save.getChallengeRecord(Challenges.id);
    } else {
      r.progEl.textContent = S('hudTestRoom');
    }
    r.timeEl.textContent = formatTime(timeMs);
    r.bestEl.textContent = `${S('hudBest')} : ${bestMs != null ? formatTime(bestMs) : '--:--.---'}`;

    const c = player.character;

    // Attaque principale : cooldown reel si le personnage en a un, AUTO si totalement automatique,
    // sinon affichee sans jauge (mecaniques de disponibilite propres a certains persos).
    const atk = r.slots.attack;
    atk.nameLabel.textContent = S('attack');
    atk.slot.classList.remove('locked');
    if (c.attackCd) {
      const cur = player.attackCooldown || 0;
      const ratio = clamp(cur / c.attackCd, 0, 1);
      atk.keyChip.textContent = keyLabel(Keybinds.attack);
      atk.fill.style.height = `${ratio * 100}%`;
      atk.cdText.textContent = cur > 0.05 ? cur.toFixed(1) : '';
      atk.slot.classList.toggle('ready', cur <= 0);
      atk.slot.classList.remove('auto');
    } else if (!c.onAttackPress && !c.onAttackHeld) {
      atk.keyChip.textContent = S('autoLabel');
      atk.fill.style.height = '0%';
      atk.cdText.textContent = '';
      atk.slot.classList.add('ready', 'auto');
    } else {
      atk.keyChip.textContent = keyLabel(Keybinds.attack);
      atk.fill.style.height = '0%';
      atk.cdText.textContent = '';
      atk.slot.classList.add('ready');
      atk.slot.classList.remove('auto');
    }

    const gate = world.abilityGate;
    const gateNum = { a1: 1, a2: 2, a3: 3 };
    const ownKeyCode = { a1: Keybinds.ability1, a2: Keybinds.ability2, a3: Keybinds.ability3 };
    const abilityKeyCode = gate
      ? { a1: Keybinds.ability, a2: Keybinds.ability, a3: Keybinds.ability }
      : ownKeyCode;
    const downCheck = {
      a1: () => Input.ability1Down(), a2: () => Input.isDown(Keybinds.ability2), a3: () => Input.isDown(Keybinds.ability3),
    };
    const unifiedDown = () => Input.isDown(Keybinds.ability);
    for (const key of ['a1', 'a2', 'a3']) {
      const cd = c[`${key}Cd`] || 0;
      const cur = player.cooldowns[key] || 0;
      const s = r.slots[key];
      const locked = gate && gate !== gateNum[key];
      const fnName = 'ability' + key.slice(1);
      const automatic = !c[fnName] && !c[`${fnName}Held`];
      s.nameLabel.textContent = locked ? S('locked') : (charField(c.id, `${key}Label`) || '');
      s.slot.classList.toggle('locked', !!locked);
      if (locked) {
        s.keyChip.textContent = keyLabel(abilityKeyCode[key]);
        s.fill.style.height = '0%';
        s.cdText.textContent = '';
        s.slot.classList.remove('ready', 'active');
        continue;
      }
      if (automatic) {
        s.keyChip.textContent = S('autoLabel');
        s.fill.style.height = '0%';
        s.cdText.textContent = '';
        s.slot.classList.add('ready', 'auto');
        s.slot.classList.remove('active');
        continue;
      }
      s.slot.classList.remove('auto');
      s.keyChip.textContent = keyLabel(abilityKeyCode[key]);
      if (cd > 0) {
        const ratio = clamp(cur / cd, 0, 1);
        s.fill.style.height = `${ratio * 100}%`;
        s.cdText.textContent = cur > 0.05 ? cur.toFixed(1) : '';
        s.slot.classList.toggle('ready', cur <= 0);
        s.slot.classList.remove('active');
      } else {
        s.fill.style.height = '0%';
        s.cdText.textContent = '';
        const down = gate ? (gate === gateNum[key] && unifiedDown()) : downCheck[key]();
        s.slot.classList.toggle('active', !!down);
        s.slot.classList.add('ready');
      }
    }

    if (state === STATE.EXPEDITION && Expedition.transitionTimer > 0 && !Expedition.finished) {
      r.msg.style.display = 'block';
      r.msg.textContent = `${S('hudPart')} ${Expedition.part} — ${S('hudRoom')} ${Expedition.roomIndex}${Expedition.roomIndex === 10 ? ' (' + S('hudBoss') + ')' : ''}`;
    } else {
      r.msg.style.display = 'none';
    }

    if (state === STATE.EXPEDITION && Expedition.finished && !this.roundEndShown) {
      this.showRoundEnd(S('expeditionDone'), Expedition.finalTimeMs, Expedition.newRecord, () => Game.restartCurrent(), () => Game.goToMenu());
    }
    if (state === STATE.CHALLENGE && Challenges.finished && !this.roundEndShown) {
      this.showRoundEnd(S('challengeDone'), Challenges.elapsedMs, Challenges.newRecord, () => Game.restartCurrent(), () => Game.goToMenu());
    }
  },

  showRoundEnd(title, timeMs, isRecord, onRetry, onMenu) {
    this.roundEndShown = true;
    const panel = this.el('div', 'panel round-end');
    panel.appendChild(this.el('h2', null, title));
    const sub = this.el('div', 'menu-sub round-end-sub', `${S('time')} : ${formatTime(timeMs)}${isRecord ? '  —  ' + S('newRecord') : ''}`);
    panel.appendChild(sub);
    const retry = this.el('div', 'menu-btn menu-btn-small', S('retry'));
    retry.onclick = onRetry;
    const menu = this.el('div', 'menu-btn menu-btn-small', S('toMenu'));
    menu.onclick = onMenu;
    panel.appendChild(retry);
    panel.appendChild(menu);
    this.overlay.appendChild(panel);
  },
};

function mkAbilityLine(label, text) {
  const div = document.createElement('div');
  div.className = 'ability-line';
  div.innerHTML = `<b>${label} :</b> ${text}`;
  return div;
}
