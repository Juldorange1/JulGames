// Interface : menus, ecrans, HUD (DOM au dessus du canvas)

const UI = {
  overlay: null,
  hudRefs: null,
  roundEndShown: false,
  _pauseEl: null,

  init() {
    this.overlay = document.getElementById('overlay');
    this.initCursor();
  },

  // Le meme viseur personnalise (Parametres > Curseur) partout : en jeu comme dans tous les menus.
  // C'est un petit canvas qui suit la souris ; le curseur systeme est masque (style.css).
  initCursor() {
    const c = document.createElement('canvas');
    c.id = 'fx-cursor';
    c.width = 32; c.height = 32;
    document.body.appendChild(c);
    this._cursorCanvas = c;
    this._cursorKey = '';
    window.addEventListener('mousemove', (e) => {
      c.style.transform = `translate(${e.clientX - 16}px, ${e.clientY - 16}px)`;
      c.style.display = 'block';
      this.refreshCursor();
    });
    document.addEventListener('mouseleave', () => { c.style.display = 'none'; });
    this.refreshCursor();
  },

  refreshCursor() {
    const c = this._cursorCanvas;
    if (!c) return;
    const color = (Save.data && Save.data.cursorColor) || '#ffffff';
    const style = (Save.data && Save.data.cursorStyle) || 'cross';
    const key = color + style;
    if (key === this._cursorKey) return;
    this._cursorKey = key;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 32, 32);
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.6;
    ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 3;
    if (style === 'dot') {
      ctx.beginPath(); ctx.arc(16, 16, 3.2, 0, Math.PI * 2); ctx.fill();
    } else if (style === 'circle') {
      ctx.beginPath(); ctx.arc(16, 16, 10, 0, Math.PI * 2); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(8, 16); ctx.lineTo(24, 16); ctx.moveTo(16, 8); ctx.lineTo(16, 24); ctx.stroke();
      ctx.beginPath(); ctx.arc(16, 16, 10, 0, Math.PI * 2); ctx.stroke();
    }
  },

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
    else if (state === STATE.CHALLENGE_EDITOR) Editor.renderToolbar();
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
  // Onglets du menu unique "Fonctionnalites" (Marche + Parametres).
  featureTabs(active) {
    const row = this.el('div', 'rep-tabs feature-tabs');
    for (const [st, key] of [[STATE.MARKET, 'marketTitle'], [STATE.SETTINGS, 'settingsTitle']]) {
      const b = this.el('div', 'rep-tab' + (st === active ? ' active' : ''), S(key));
      b.onclick = () => Game.setState(st);
      row.appendChild(b);
    }
    return row;
  },

  renderMarket() {
    const panel = this.el('div', 'panel market-panel');
    panel.appendChild(this.backBtn(() => Game.setState(STATE.MENU)));

    const header = this.el('div', 'market-header');
    header.appendChild(this.el('h2', null, S('featuresTitle')));
    header.appendChild(this.featureTabs(STATE.MARKET));
    header.appendChild(this.el('div', 'market-money-badge', formatMoney(Save.getMoney())));
    panel.appendChild(header);

    if (!this._marketTab) this._marketTab = 'expand';
    if (!this._marketDecorType) this._marketDecorType = 'teleporter';
    if (!this._marketWallColor) this._marketWallColor = '#7fd8ff';
    if (!this._marketWindDir) this._marketWindDir = 'up';
    if (!this._marketMoveKey) this._marketMoveKey = 'market';

    const tabLabelKey = { expand: 'marketTabExpand', shrink: 'marketTabShrink', move: 'marketTabMove', add: 'marketTabAdd', remove: 'marketTabRemove' };
    const tabCost = { expand: `${HUB_EXPAND_COST}€`, shrink: `+${HUB_EXPAND_COST}€`, move: `${HUB_MOVE_COST}€`, add: `${HUB_DECOR_COST}€`, remove: null };
    const tabRow = this.el('div', 'market-tabs');
    for (const t of ['expand', 'shrink', 'move', 'add', 'remove']) {
      const b = this.el('div', 'market-tab' + (this._marketTab === t ? ' active' : ''));
      b.appendChild(this.el('div', 'market-tab-name', S(tabLabelKey[t])));
      if (tabCost[t] != null) b.appendChild(this.el('div', 'market-tab-cost', tabCost[t]));
      b.onclick = () => { this._marketTab = t; this._pendingTramp = null; Game.setState(STATE.MARKET); };
      tabRow.appendChild(b);
    }
    panel.appendChild(tabRow);
    panel.appendChild(this.el('div', 'market-hint', S(this._pendingTramp ? 'marketHint_trampLand' : 'marketHint_' + this._marketTab)));

    if (this._marketTab === 'add') {
      const options = this.el('div', 'market-options');
      const optRow = this.el('div', 'lang-row');
      for (const dt of ['teleporter', 'wall', 'wind', 'trampoline', 'boost']) {
        const b = this.el('div', 'lang-btn' + (this._marketDecorType === dt ? ' active' : ''), S('marketDecor_' + dt));
        b.onclick = () => { this._marketDecorType = dt; this._pendingTramp = null; Game.setState(STATE.MARKET); };
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
    const landAt = {};
    for (const d of Save.data.hub.decor) if (d.type === 'trampoline') landAt[hubCellKey(d.lgx, d.lgy)] = true;
    const pend = this._pendingTramp;

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
          const glyph = { teleporter: '◎', trampoline: '⤴', boost: '»' };
          cell.textContent = decor.type === 'wind' ? (windGlyph[decor.dir] || '→') : (glyph[decor.type] || '');
        } else if (landAt[key]) {
          cell.classList.add('tramp-land');
          cell.textContent = '⊙';
          cell.title = S('marketTrampLanding');
        }
        if (pend && pend.gx === gx && pend.gy === gy) { cell.classList.add('pending'); cell.textContent = '⤴'; }
        let isCandidate = false;
        if (mode === 'expand') isCandidate = !isOcc && hubAdjacentToExisting(gx, gy);
        else if (mode === 'move' || mode === 'add') isCandidate = isOcc && !doorKey && !decor && !landAt[key] && !(pend && pend.gx === gx && pend.gy === gy);
        else if (mode === 'remove') isCandidate = !!decor;
        else if (mode === 'shrink') isCandidate = this.canRemoveHubCell(gx, gy);
        if (isCandidate) cell.classList.add('candidate');
        cell.onclick = () => this.onMarketCellClick(gx, gy, isOcc, doorKey, decor);
        grid.appendChild(cell);
      }
    }
    board.appendChild(grid);
    return board;
  },

  // Une case achetee peut etre retiree (remboursee) si elle est vide et que la base reste d'un seul tenant.
  canRemoveHubCell(gx, gy) {
    const hub = Save.data.hub;
    if (Math.abs(gx) <= 1 && Math.abs(gy) <= 1) return false; // cases de depart
    if (!hub.cells.some((c) => c.gx === gx && c.gy === gy)) return false;
    if (Object.values(hub.doors).some((p) => p.gx === gx && p.gy === gy)) return false;
    if (hub.decor.some((d) => (d.gx === gx && d.gy === gy) || (d.type === 'trampoline' && d.lgx === gx && d.lgy === gy))) return false;
    const rest = hub.cells.filter((c) => !(c.gx === gx && c.gy === gy));
    const keyOf = (c) => c.gx + ',' + c.gy;
    const set = new Set(rest.map(keyOf));
    const seen = new Set([keyOf(rest[0])]);
    const q = [rest[0]];
    while (q.length) {
      const c = q.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = (c.gx + dx) + ',' + (c.gy + dy);
        if (set.has(k) && !seen.has(k)) { seen.add(k); q.push({ gx: c.gx + dx, gy: c.gy + dy }); }
      }
    }
    return seen.size === rest.length;
  },

  onMarketCellClick(gx, gy, isOcc, doorKey, decor) {
    const mode = this._marketTab;
    const isLanding = Save.data.hub.decor.some((d) => d.type === 'trampoline' && d.lgx === gx && d.lgy === gy);
    if (mode === 'shrink') {
      if (!this.canRemoveHubCell(gx, gy)) return;
      Save.data.hub.cells = Save.data.hub.cells.filter((c) => !(c.gx === gx && c.gy === gy));
      Save.addMoney(HUB_EXPAND_COST); // case remboursee
      Save.persist();
      Game.setState(STATE.MARKET);
      return;
    }
    if (mode === 'add' && this._marketDecorType === 'trampoline') {
      // 1er clic : case du trampoline ; 2e clic : case libre ou il fait atterrir (donc son sens)
      if (!isOcc || doorKey || decor || isLanding) return;
      const pend = this._pendingTramp;
      if (!pend) { this._pendingTramp = { gx, gy }; Game.setState(STATE.MARKET); return; }
      if (pend.gx === gx && pend.gy === gy) { this._pendingTramp = null; Game.setState(STATE.MARKET); return; }
      if (!Save.spendMoney(HUB_DECOR_COST)) return;
      Save.data.hub.decor.push({ id: uid(), type: 'trampoline', gx: pend.gx, gy: pend.gy, lgx: gx, lgy: gy });
      this._pendingTramp = null;
      Save.persist();
      Game.setState(STATE.MARKET);
      return;
    }
    if ((mode === 'add' || mode === 'move') && isLanding) return;
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
    // Tous les personnages sur un seul ecran (grille ajustee a la fenetre, sans defilement) :
    // juste l'animation, le nom, la vitesse et le record. Le detail des competences est au Codex.
    const mode = Game.pendingCharSelectMode || 'expedition';
    const panel = this.el('div', 'panel rep-panel');
    panel.appendChild(this.backBtn(() => Game.setState(STATE.MENU)));
    const head = this.el('div', 'rep-head');
    head.appendChild(this.el('h2', null, S('charSelectTitle')));
    if (mode === 'expedition') {
      const speedRow = this.el('div', 'cs-speed');
      speedRow.appendChild(this.el('span', null, S('settingsSpeedMult')));
      const speedSlider = document.createElement('input');
      speedSlider.type = 'range';
      speedSlider.min = String(SPEED_MULT_MIN); speedSlider.max = String(SPEED_MULT_MAX); speedSlider.step = '10';
      speedSlider.value = String(Save.data.speedMult || SPEED_MULT_DEFAULT);
      speedSlider.className = 'volume-slider';
      const speedValue = this.el('b', null, `${Save.data.speedMult || SPEED_MULT_DEFAULT}%`);
      speedSlider.addEventListener('input', () => {
        const v = Number(speedSlider.value);
        Save.setSpeedMult(v);
        speedValue.textContent = `${v}%`;
      });
      speedRow.appendChild(speedSlider);
      speedRow.appendChild(speedValue);
      head.appendChild(speedRow);
    }
    panel.appendChild(head);

    const grid = this.el('div', 'rep-grid fit-grid');
    const portraits = [];
    const ids = allCharacterIds();
    for (const id of ids) {
      const c = getCharacter(id);
      const tile = this.el('div', 'rep-tile');
      tile.style.setProperty('--accent', c.color || '#7fd8ff');
      const sc = createShowcase('character', id);
      portraits.push(sc);
      tile.appendChild(sc.canvas);
      const cap = this.el('div', 'rep-tile-cap');
      cap.appendChild(this.el('span', 'rep-tile-name', charName(id)));
      const rec = Save.getExpeditionRecord(id);
      cap.appendChild(this.el('span', 'rep-tile-sub', `${c.speedPercent}%${rec != null ? ' · ' + formatTime(rec) : ''}`));
      tile.appendChild(cap);
      tile.onclick = () => {
        if (mode === 'expedition') Game.startExpedition(id);
        else Game.startTestRoom(id);
      };
      grid.appendChild(tile);
    }
    panel.appendChild(grid);
    this.overlay.appendChild(panel);
    this.fitTiles(grid, ids.length);
    this.startPortraitAnim(portraits);
  },

  // Choisit le nombre de colonnes qui donne les plus grandes vignettes possibles SANS defilement
  // (la grille doit avoir une hauteur definie). Recalcule au redimensionnement de la fenetre.
  fitTiles(grid, n) {
    const capH = 30, gap = 8;
    const apply = () => {
      if (!grid.isConnected) return;
      const W = grid.clientWidth, H = grid.clientHeight;
      if (!W || !H) return;
      let best = { w: 0, cols: 1 };
      for (let cols = 1; cols <= n; cols++) {
        const rows = Math.ceil(n / cols);
        const wByW = (W - gap * (cols - 1)) / cols;
        const wByH = ((H - gap * (rows - 1)) / rows - capH) * 240 / 150;
        const w = Math.min(wByW, wByH);
        if (w > best.w) best = { w, cols };
      }
      grid.style.gridTemplateColumns = `repeat(${best.cols}, ${Math.max(80, Math.floor(best.w))}px)`;
    };
    requestAnimationFrame(apply);
    if (this._fitHandler) window.removeEventListener('resize', this._fitHandler);
    this._fitHandler = apply;
    window.addEventListener('resize', apply);
  },

  startPortraitAnim(scenes) {
    this.stopPortraitAnim();
    this._portraits = scenes;
    let last = performance.now();
    const animate = (now) => {
      const dt = clamp((now - last) / 1000, 0, 0.05);
      last = now;
      for (const sc of this._portraits) {
        try { sc.tick(dt); } catch (e) { /* apercu indisponible */ }
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
    createBtn.onclick = () => Editor.open('combat');
    panel.appendChild(createBtn);
    const customList = this.el('div', 'challenge-list');
    for (const c of Save.data.customChallenges.filter((x) => !x.parkour)) {
      const card = this.el('div', 'challenge-card');
      card.style.setProperty('--accent', getCharacter(c.characterId).color || '#7fd8ff');
      card.appendChild(this.el('h4', null, `${c.name} — ${charName(c.characterId)}`));
      const enemyCount = c.placed ? c.placed.enemies.length : Object.values(c.enemies || {}).reduce((a, b) => a + b, 0);
      const bossT = c.placed ? (c.placed.boss && c.placed.boss.type) : c.bossType;
      const summary = `${S('customEnemies')} : ${enemyCount}${bossT ? ' + ' + BOSS_DEFS[bossT].name : ''}   ·   ${S('ability')}${c.abilityGate}   ·   ${S('customNoMoney')}`;
      card.appendChild(this.el('p', null, summary));
      card.appendChild(this.el('div', 'best', `${S('record')} : ${c.record != null ? formatTime(c.record) : '--:--.---'}`));
      const del = this.el('div', 'custom-delete', S('customDelete'));
      del.onclick = (e) => { e.stopPropagation(); Save.removeCustomChallenge(c.id); Game.setState(STATE.CHALLENGE_SELECT); };
      card.appendChild(del);
      const edit = this.el('div', 'custom-delete custom-edit', S('customEdit'));
      edit.onclick = (e) => { e.stopPropagation(); Editor.open(c.parkour ? 'parkour' : 'combat', c); };
      card.appendChild(edit);
      card.onclick = () => Game.startChallenge(c.id);
      customList.appendChild(card);
    }
    if (!Save.data.customChallenges.some((x) => !x.parkour)) customList.appendChild(this.el('div', 'menu-sub', S('customNone')));
    panel.appendChild(customList);

    // ---- Defis de parcours ----
    panel.appendChild(this.el('h3', null, S('parkourTitle')));
    panel.appendChild(this.el('div', 'menu-sub parkour-hint', S('parkourHint')));
    const pkList = this.el('div', 'challenge-list');
    for (const def of PARKOUR_DEFS) {
      const card = this.el('div', 'challenge-card parkour-card');
      card.style.setProperty('--accent', getCharacter(def.characterId).color || '#5dff9d');
      card.appendChild(this.el('h4', null, `${S('parkourLabel')} ${def.id.slice(1)} — ${charName(def.characterId)}`));
      card.appendChild(this.el('p', 'challenge-title', challengeField(def.id, 'title')));
      card.appendChild(this.el('p', null, challengeField(def.id, 'desc')));
      const rec = Save.getChallengeRecord(def.id);
      card.appendChild(this.el('div', 'best', `${S('record')} : ${rec != null ? formatTime(rec) : '--:--.---'}   ·   ${S('parkourLength')} : ${S('parkourLength_' + def.length)}   ·   ${S('challengeReward')} : +${formatMoney(CHALLENGE_REWARD)}`));
      card.onclick = () => Game.startChallenge(def.id);
      pkList.appendChild(card);
    }
    panel.appendChild(pkList);

    panel.appendChild(this.el('h3', null, S('customParkoursTitle')));
    const pkCreate = this.el('div', 'menu-btn menu-btn-small', `+ ${S('parkourCreate')}`);
    pkCreate.onclick = () => Editor.open('parkour');
    panel.appendChild(pkCreate);
    const pkCustom = this.el('div', 'challenge-list');
    for (const c of Save.data.customChallenges.filter((x) => x.parkour)) {
      const card = this.el('div', 'challenge-card parkour-card');
      card.style.setProperty('--accent', getCharacter(c.characterId).color || '#5dff9d');
      card.appendChild(this.el('h4', null, `${c.name} — ${charName(c.characterId)}`));
      card.appendChild(this.el('p', null, `${S('parkourLength')} : ${S('parkourLength_' + c.length)}   ·   ${S('parkourDensity')} : ${S('parkourDensity_' + c.density)}   ·   ${S('customNoMoney')}`));
      card.appendChild(this.el('div', 'best', `${S('record')} : ${c.record != null ? formatTime(c.record) : '--:--.---'}`));
      const del = this.el('div', 'custom-delete', S('customDelete'));
      del.onclick = (e) => { e.stopPropagation(); Save.removeCustomChallenge(c.id); Game.setState(STATE.CHALLENGE_SELECT); };
      card.appendChild(del);
      const edit = this.el('div', 'custom-delete custom-edit', S('customEdit'));
      edit.onclick = (e) => { e.stopPropagation(); Editor.open(c.parkour ? 'parkour' : 'combat', c); };
      card.appendChild(edit);
      card.onclick = () => Game.startChallenge(c.id);
      pkCustom.appendChild(card);
    }
    if (!Save.data.customChallenges.some((x) => x.parkour)) pkCustom.appendChild(this.el('div', 'menu-sub', S('parkourNone')));
    panel.appendChild(pkCustom);
    this.overlay.appendChild(panel);
  },

  // ---------------- REPERTOIRE & STATISTIQUES (menu unique) ----------------
  renderBestiary() {
    // Onglets + grille compacte a gauche, fiche detaillee de l'element choisi a droite :
    // peu de texte visible d'un coup, tout est range.
    const tab = this._repTab && this._repTab !== 'records' ? this._repTab : 'chars';
    const panel = this.el('div', 'panel rep-panel');
    panel.appendChild(this.backBtn(() => Game.setState(STATE.MENU)));
    const head = this.el('div', 'rep-head');
    head.appendChild(this.el('h2', null, S('bestiaryTitle')));
    const tabs = this.el('div', 'rep-tabs');
    for (const [k, label] of [['chars', 'repTabChars'], ['parkour', 'repTabParkour'], ['turrets', 'bestiaryTurrets'], ['bosses', 'bestiaryBosses'], ['elements', 'repTabElements'], ['rules', 'repTabRules']]) {
      const b = this.el('div', 'rep-tab' + (k === tab ? ' active' : ''), S(label));
      b.onclick = () => { this._repTab = k; this._repSel = null; Game.setState(STATE.BESTIARY); };
      tabs.appendChild(b);
    }
    head.appendChild(tabs);
    panel.appendChild(head);

    if (tab === 'records' || tab === 'rules') {
      panel.appendChild(tab === 'records' ? this.renderRecordsBoard() : this.renderRulesBoard());
      this.overlay.appendChild(panel);
      return;
    }

    const TURRETS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
    const items = tab === 'chars' ? allCharacterIds().map((id) => ({ kind: 'character', id }))
      : tab === 'parkour' ? parkourCharacterIds().map((id) => ({ kind: 'character', id }))
        : tab === 'turrets' ? TURRETS.map((id) => ({ kind: 'turret', id }))
          : tab === 'elements' ? CODEX_ELEMENTS.map((el) => ({ kind: 'element', id: el.id }))
            : ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'].map((id) => ({ kind: 'boss', id }));
    if (!items.some((it) => it.id === this._repSel)) this._repSel = items[0].id;

    const scenes = [];
    const wrap = this.el('div', 'rep-wrap');
    const grid = this.el('div', 'rep-grid');
    const detailHolder = this.el('div', 'rep-detail');
    let detailScene = null;
    const showDetail = (it) => {
      if (detailScene) scenes.splice(scenes.indexOf(detailScene), 1);
      detailHolder.innerHTML = '';
      const d = this.renderRepDetail(it);
      detailScene = d.scene;
      scenes.push(detailScene);
      detailHolder.appendChild(d.node);
    };
    for (const it of items) {
      const tile = this.el('div', 'rep-tile' + (it.id === this._repSel ? ' active' : ''));
      tile.style.setProperty('--accent', this.repColor(it));
      const sc = createShowcase(it.kind, it.id);
      scenes.push(sc);
      tile.appendChild(sc.canvas);
      const cap = this.el('div', 'rep-tile-cap');
      cap.appendChild(this.el('span', 'rep-tile-name', this.repName(it)));
      cap.appendChild(this.el('span', 'rep-tile-sub', this.repSub(it)));
      tile.appendChild(cap);
      tile.onclick = () => {
        this._repSel = it.id;
        for (const t of grid.children) t.classList.remove('active');
        tile.classList.add('active');
        showDetail(it);
      };
      grid.appendChild(tile);
    }
    wrap.appendChild(grid);
    wrap.appendChild(detailHolder);
    panel.appendChild(wrap);
    this.overlay.appendChild(panel);
    grid.classList.add('fit-grid');
    this.fitTiles(grid, items.length);
    showDetail(items.find((it) => it.id === this._repSel));
    this.startPortraitAnim(scenes);
  },

  repColor(it) {
    if (it.kind === 'element') return CODEX_ELEMENTS.find((e) => e.id === it.id).color;
    if (it.kind === 'character') return getCharacter(it.id).color || '#7fd8ff';
    if (it.kind === 'turret') return TURRET_COLOR[it.id] || '#ff5d5d';
    return BOSS_DEFS[it.id].color;
  },
  repName(it) {
    if (it.kind === 'element') return CODEX_ELEMENTS.find((e) => e.id === it.id).name;
    if (it.kind === 'character') return charName(it.id);
    if (it.kind === 'turret') return turretInfo(it.id).name;
    return BOSS_DEFS[it.id].name;
  },
  repSub(it) {
    if (it.kind === 'element') return CODEX_ELEMENTS.find((e) => e.id === it.id).group;
    if (it.kind === 'character') {
      if (getCharacter(it.id).parkourOnly) return charEpithet(it.id);
      const rec = Save.getExpeditionRecord(it.id);
      return rec != null ? formatTime(rec) : `${S('speed')} ${getCharacter(it.id).speedPercent}%`;
    }
    if (it.kind === 'turret') return `${it.id} · ${Save.getKillCount(it.id)} ${S('bestiaryKills').toLowerCase()}`;
    return `${Save.getKillCount(it.id)} ${S('bestiaryKills').toLowerCase()}`;
  },

  // Fiche detaillee (colonne de droite).
  renderRepDetail(it) {
    const node = this.el('div', 'rep-card');
    node.style.setProperty('--accent', this.repColor(it));
    const sc = createShowcase(it.kind, it.id);
    sc.canvas.classList.add('rep-big');
    node.appendChild(sc.canvas);
    const title = this.el('div', 'rep-title');
    title.appendChild(this.el('h3', null, this.repName(it)));
    const chips = this.el('div', 'rep-chips');
    const chip = (label, value, cls) => {
      const c = this.el('div', 'rep-chip' + (cls ? ' ' + cls : ''));
      c.appendChild(this.el('span', null, label));
      c.appendChild(this.el('b', null, value));
      chips.appendChild(c);
    };
    const rows = this.el('div', 'rep-rows');
    const row = (key, text) => {
      const r = this.el('div', 'rep-row');
      r.appendChild(this.el('span', 'rep-key', key));
      r.appendChild(this.el('span', null, text));
      rows.appendChild(r);
    };
    if (it.kind === 'character') {
      const c = getCharacter(it.id);
      title.appendChild(this.el('div', 'rep-epithet', charEpithet(it.id)));
      if (c.parkourOnly) {
        for (const d of PARKOUR_DEFS.filter((pd) => pd.characterId === it.id)) {
          const rec = Save.getChallengeRecord(d.id);
          chip(`${S('parkourLabel')} ${d.id.slice(1)}`, rec != null ? formatTime(rec) : '--:--.---', 'time');
        }
        chip(S('repMoney'), formatMoney(Save.getMoneyForChar(it.id)), 'money');
        row(keyLabel(Keybinds.attack), `${charField(it.id, 'attackLabel')}${c.attackCd ? ' · ' + c.attackCd + 's' : ''}`);
        row(keyLabel(Keybinds.ability), `${charField(it.id, 'a1Label')}${c.a1Cd ? ' · ' + c.a1Cd + 's' : ''}`);
      } else {
        chip(S('speed'), `${c.speedPercent}%`);
        const rec = Save.getExpeditionRecord(it.id);
        chip(S('repRecord'), rec != null ? formatTime(rec) : '--:--.---', 'time');
        chip(S('repMoney'), formatMoney(Save.getMoneyForChar(it.id)), 'money');
        // records des defis de ce personnage
        for (const cd of CHALLENGE_DEFS.filter((x) => x.characterId === it.id)) {
          const rc = Save.getChallengeRecord(cd.id);
          chip(`${S('hudDefi')} ${cd.id}`, rc != null ? formatTime(rc) : '--:--.---', 'time');
        }
        row(keyLabel(Keybinds.attack), charField(it.id, 'attackLabel'));
        for (const n of [1, 2, 3]) row(keyLabel(Keybinds['ability' + n]), `${charField(it.id, 'a' + n + 'Label')}${c['a' + n + 'Cd'] ? ' · ' + c['a' + n + 'Cd'] + 's' : ''}`);
      }
    } else if (it.kind === 'element') {
      const el = CODEX_ELEMENTS.find((e) => e.id === it.id);
      title.appendChild(this.el('div', 'rep-epithet', el.group));
    } else if (it.kind === 'turret') {
      chip(S('bestiaryHp'), String(Math.round(TURRET_HP[it.id] * ENEMY_HP_MULT)));
      chip(S('bestiaryLoss'), `${TURRET_LOSS[it.id]}%`);
      chip(S('bestiaryKills'), String(Save.getKillCount(it.id)), 'time');
      rows.appendChild(this.el('p', 'rep-desc', turretInfo(it.id).desc));
    } else {
      const def = BOSS_DEFS[it.id];
      chip(S('bestiaryHp'), String(Math.round(def.hp * ENEMY_HP_MULT)));
      chip(S('bestiaryContact'), `${def.contact}%`);
      chip(S('bestiaryKills'), String(Save.getKillCount(it.id)), 'time');
      rows.appendChild(this.el('p', 'rep-desc', bossInfo(it.id).desc));
    }
    // Statistiques detaillees (valeurs chiffrees)
    const statList = it.kind === 'character' ? codexCharStats(it.id)
      : it.kind === 'turret' ? (CODEX_TURRET_STATS[it.id] || [])
        : it.kind === 'element' ? CODEX_ELEMENTS.find((e) => e.id === it.id).stats
          : [['Phases', '3 (seuils a 70% et 35% de PV)'], ['Vitesse d\'attaque', 'augmente a chaque phase'], ['Rayon', String(BOSS_DEFS[it.id].radius || 34)]];
    const stats = this.el('div', 'rep-stats');
    if (statList.length) stats.appendChild(this.el('div', 'rep-stats-title', S('repStats')));
    for (const [k, v] of statList) {
      const r = this.el('div', 'rep-stat');
      r.appendChild(this.el('span', null, k));
      r.appendChild(this.el('b', null, v));
      stats.appendChild(r);
    }
    node.appendChild(title);
    if (chips.children.length) node.appendChild(chips);
    if (rows.children.length) node.appendChild(rows);
    node.appendChild(stats);
    if (it.kind === 'character' && !getCharacter(it.id).parkourOnly) {
      const btn = this.el('div', 'menu-btn menu-btn-small rep-action', S('repTestRoom'));
      btn.onclick = () => Game.startTestRoom(it.id);
      node.appendChild(btn);
    } else if (it.kind === 'character') {
      node.appendChild(this.el('div', 'rep-note', S('repParkourNote')));
    }
    return { node, scene: sc };
  },

  // Onglet Regles : cartes courtes, tout sur un ecran.
  renderRulesBoard() {
    const board = this.el('div', 'rep-records rep-rules');
    for (const sec of CODEX_RULES) {
      const c = this.el('div', 'rep-rec-col');
      c.appendChild(this.el('h3', null, sec.title));
      for (const l of sec.lines) c.appendChild(this.el('p', 'rep-rule', l));
      board.appendChild(c);
    }
    return board;
  },

  // Onglet Records : trois colonnes compactes.
  renderRecordsBoard() {
    const board = this.el('div', 'rep-records');
    const col = (titleKey, lines) => {
      const c = this.el('div', 'rep-rec-col');
      c.appendChild(this.el('h3', null, S(titleKey)));
      for (const [label, value, extra] of lines) {
        const r = this.el('div', 'rep-rec-row');
        r.appendChild(this.el('span', 'rep-rec-label', label));
        if (extra != null) r.appendChild(this.el('span', 'rep-rec-money', extra));
        r.appendChild(this.el('span', 'rep-rec-time', value));
        c.appendChild(r);
      }
      board.appendChild(c);
    };
    const t = (ms) => (ms != null ? formatTime(ms) : '--:--.---');
    col('recordsExpeditions', allCharacterIds().map((id) => [charName(id), t(Save.getExpeditionRecord(id)), formatMoney(Save.getMoneyForChar(id))]));
    col('recordsChallenges', CHALLENGE_DEFS.map((d) => [`${d.id}. ${challengeField(d.id, 'title')}`, t(Save.getChallengeRecord(d.id))]));
    col('parkourTitle', PARKOUR_DEFS.map((d) => [`${d.id.slice(1)}. ${challengeField(d.id, 'title')}`, t(Save.getChallengeRecord(d.id))]));
    return board;
  },

  // ---------------- PARAMETRES ----------------
  renderSettings() {
    const panel = this.el('div', 'panel');
    panel.appendChild(this.backBtn(() => Game.setState(STATE.MENU)));
    const header = this.el('div', 'market-header');
    header.appendChild(this.el('h2', null, S('featuresTitle')));
    header.appendChild(this.featureTabs(STATE.SETTINGS));
    panel.appendChild(header);

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
    // En parcours, la jauge montre la vitesse (les coups ralentissent au lieu de reduire les degats).
    const pct = Math.round((player.parkour ? (player.parkourSpeed || 1) : player.damageMultiplier) * 100);
    r.dmgEl.textContent = `${S(player.parkour ? 'hudSpeed' : 'hudDamage')} : ${pct}%`;
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
      if (def.parkour) {
        const title = def.custom ? `${S('parkourLabel')} : ${def.title}` : `${S('parkourLabel')} ${def.id.slice(1)} : ${challengeField(def.id, 'title')}`;
        r.progEl.textContent = `${title}   ${S('hudProgress')} : ${Math.round((Challenges.progress || 0) * 100)}%`;
      } else {
        const title = def.custom ? `${S('hudDefi')} : ${def.title}` : `${S('hudDefi')} ${def.id} : ${challengeField(def.id, 'title')}`;
        r.progEl.textContent = `${title}   ${S('hudRoom')} : ${Challenges.roomNum}/${CHALLENGE_ROOMS}`;
      }
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
    // Persos de parcours : l'attaque EST leur 1re competence -> on affiche son nom.
    atk.nameLabel.textContent = c.parkourOnly ? charField(c.id, 'attackLabel') : S('attack');
    atk.slot.classList.remove('locked');
    if (c.attackCd) {
      const cur = player.attackCooldown || 0;
      const ratio = clamp(cur / c.attackCd, 0, 1);
      atk.keyChip.textContent = c.autoAttack ? S('autoLabel') : keyLabel(Keybinds.attack);
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
      // Persos de parcours : 2 competences seulement (attaque + competence unique)
      s.slot.style.display = (c.parkourOnly && key !== 'a1') ? 'none' : '';
      if (c.parkourOnly && key !== 'a1') continue;
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
    } else if (state === STATE.CHALLENGE && Challenges.transitionTimer > 0 && !Challenges.finished) {
      r.msg.style.display = 'block';
      r.msg.textContent = `${S('hudRoom')} ${Challenges.roomNum + 1}/${CHALLENGE_ROOMS} · C${challengeRoomGate(Challenges.get(Challenges.id), Challenges.roomNum + 1)}${Challenges.roomNum + 1 === CHALLENGE_ROOMS && Challenges.get(Challenges.id).bossType ? ' (' + S('hudBoss') + ')' : ''}`;
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
