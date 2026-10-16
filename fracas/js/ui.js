// Interface : menus, ecrans, HUD (DOM au dessus du canvas)

const UI = {
  overlay: null,
  hudRefs: null,
  roundEndShown: false,
  _pauseEl: null,

  init() {
    this.overlay = document.getElementById('overlay');
    this.initCursor();
    this.applyAccess();
    // Sons d'interface : clic et survol des elements cliquables des menus.
    const CLICKABLE = '.menu-btn, .rep-tile, .launcher-card, .rep-tab, .lang-btn, .online-mode, .lobby-char, .back-btn, .test-spawn-btn, .test-room-char, .online-lobby-row, .lobby-code, .market-cell, .boon-card';
    document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest(CLICKABLE)) Audio2.uiClick(); }, true);
    let lastHover = null;
    document.addEventListener('mouseover', (e) => {
      const el = e.target.closest && e.target.closest(CLICKABLE);
      if (el && el !== lastHover) Audio2.uiHover();
      lastHover = el;
    });
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

  // Accessibilite : filtre daltonien (jeu + interface) et taille de l'interface.
  applyAccess() {
    const a = (Save.data && Save.data.access) || {};
    const f = a.colorblind && a.colorblind !== 'none' ? `url(#cb-${a.colorblind})` : '';
    const cv = document.getElementById('game');
    if (cv) cv.style.filter = f;
    if (this.overlay) { this.overlay.style.filter = f; this.overlay.style.zoom = String((a.text || 100) / 100); }
  },

  // Accessibilite : reglages compacts (un bouton par reglage, un clic = valeur suivante).
  accessSection() {
    const a = Save.data.access;
    const sec = this.el('div', 'settings-section');
    sec.appendChild(this.el('h3', null, `👁️ ${S('settingsAccess')}`));
    const grid = this.el('div', 'access-grid');
    const cycle = (icon, label, options, cur, set) => {
      const row = this.el('div', 'access-row');
      row.appendChild(this.el('div', 'keybind-name', `${icon} ${label}`));
      let i = Math.max(0, options.findIndex(([v]) => v === cur));
      const b = this.el('div', 'lang-btn active access-btn', options[i][1]);
      b.onclick = () => { i = (i + 1) % options.length; set(options[i][0]); b.textContent = options[i][1]; Save.persist(); this.applyAccess(); };
      row.appendChild(b);
      grid.appendChild(row);
    };
    cycle('🎓', S('accAssist'), [[true, 'ON'], [false, 'OFF']], Save.data.assist !== false, (v) => { Save.data.assist = v; });
    cycle('📳', S('accShake'), [[100, '100%'], [50, '50%'], [0, 'OFF']], a.shake, (v) => { a.shake = v; });
    cycle('🔠', S('accText'), [[100, '100%'], [115, '115%'], [130, '130%'], [90, '90%']], a.text, (v) => { a.text = v; });
    cycle('🎨', S('accColorblind'), [['none', S('cb_none')], ['protan', S('cb_protan')], ['deutan', S('cb_deutan')], ['tritan', S('cb_tritan')]], a.colorblind, (v) => { a.colorblind = v; });
    sec.appendChild(grid);
    return sec;
  },

  // Journal de test (playtests) : exporter / effacer.
  playtestSection() {
    const sec = this.el('div', 'settings-section');
    sec.appendChild(this.el('h3', null, `🐞 ${S('settingsPlaytest')}`));
    sec.appendChild(this.el('div', 'settings-hint', S('ptHint').replace('{n}', Playtest.data().events.length)));
    const row = this.el('div', 'lang-row');
    const exp = this.el('div', 'lang-btn', `⬆️ ${S('ptExport')}`);
    const msg = this.el('div', 'settings-hint', '');
    exp.onclick = () => { Save.persist(); const where = Playtest.export(); msg.textContent = `✔ ${S('ptDone')} ${where || ''}`; };
    const clr = this.el('div', 'lang-btn', `🗑️ ${S('ptClear')}`);
    clr.onclick = () => { if (clr._armed) { Playtest.clear(); this.goSettings(); } else { clr._armed = true; clr.textContent = S('infConfirm'); } };
    row.appendChild(exp); row.appendChild(clr);
    sec.appendChild(row); sec.appendChild(msg);
    return sec;
  },

  // Version programme (Electron) : plein ecran et taille de la fenetre.
  displaySection() {
    const sec = this.el('div', 'settings-section');
    sec.appendChild(this.el('h3', null, `🖥️ ${S('settingsDisplay')}`));
    const d = NATIVE.getDisplay();
    const row1 = this.el('div', 'lang-row');
    row1.appendChild(this.el('div', 'keybind-name', `⛶ ${S('displayFullscreen')}`));
    const fs = this.el('div', 'lang-btn' + (d.fullscreen ? ' active' : ''), d.fullscreen ? 'ON' : 'OFF');
    fs.onclick = () => { NATIVE.setFullscreen(!NATIVE.getDisplay().fullscreen); setTimeout(() => this.goSettings(), 150); };
    row1.appendChild(fs);
    sec.appendChild(row1);
    const row2 = this.el('div', 'lang-row');
    row2.appendChild(this.el('div', 'keybind-name', `🗗 ${S('displayWindow')}`));
    for (const [w, h] of [[1280, 720], [1600, 900], [1920, 1080]]) {
      const on = !d.fullscreen && d.width === w && d.height === h;
      const b = this.el('div', 'lang-btn' + (on ? ' active' : ''), `${w}×${h}`);
      b.onclick = () => { NATIVE.setWindowSize(w, h); setTimeout(() => this.goSettings(), 150); };
      row2.appendChild(b);
    }
    sec.appendChild(row2);
    return sec;
  },

  // Reglages du son (ON/OFF, effets, musique) : Parametres ET menu pause (toutes les versions).
  soundControls() {
    const box = this.el('div', 'sound-controls');
    const soundRow = this.el('div', 'lang-row');
    const soundBtn = this.el('div', 'lang-btn');
    const paint = () => { soundBtn.textContent = Audio2.on ? '🔊 ON' : '🔇 OFF'; soundBtn.classList.toggle('active', Audio2.on); };
    soundBtn.onclick = () => { Audio2.toggle(); paint(); };
    paint();
    soundRow.appendChild(soundBtn);
    box.appendChild(soundRow);
    const slider = (icon, label, get, set, preview) => {
      const row = this.el('div', 'volume-row');
      row.appendChild(this.el('div', 'keybind-name', `${icon} ${label}`));
      const sl = document.createElement('input');
      sl.type = 'range'; sl.min = '0'; sl.max = '100'; sl.step = '1';
      sl.value = String(Math.round(get() * 100));
      sl.className = 'volume-slider';
      const val = this.el('div', 'volume-value', `${Math.round(get() * 100)}%`);
      let deb = null;
      sl.addEventListener('input', () => {
        const v = Number(sl.value) / 100;
        set(v); val.textContent = `${Math.round(v * 100)}%`;
        if (preview) { clearTimeout(deb); deb = setTimeout(preview, 60); }
      });
      row.appendChild(sl); row.appendChild(val);
      box.appendChild(row);
    };
    slider('💥', S('volume'), () => Audio2.volume, (v) => Audio2.setVolume(v), () => Audio2.attack());
    slider('🎵', S('musicVolume'), () => Music.volume, (v) => Music.setVolume(v)); // volume de la musique, separe des effets
    return box;
  },

  // ---------- Parametres / Codex ouverts depuis le menu pause (la partie reste en pause) ----------
  subMenu: null,
  goSettings() { if (this.subMenu) this.openSub('settings'); else Game.setState(STATE.SETTINGS); },
  goCodex() { if (this.subMenu) this.openSub('codex'); else Game.setState(STATE.BESTIARY); },
  openSub(kind) {
    if (this._subEl) { this._subEl.remove(); this._subEl = null; }
    this.stopPortraitAnim();
    this.subMenu = kind;
    if (this._pauseEl) this._pauseEl.style.display = 'none';
    const before = this.overlay.lastElementChild;
    if (kind === 'settings') this.renderSettings(); else this.renderBestiary();
    const el = this.overlay.lastElementChild;
    if (el && el !== before) { el.classList.add('sub-panel'); this._subEl = el; }
  },
  closeSub() {
    if (this._subEl) { this._subEl.remove(); this._subEl = null; }
    this.stopPortraitAnim();
    this.subMenu = null;
    // la langue a pu changer : on reconstruit le menu pause
    if (this._pauseEl) { this._pauseEl.remove(); this._pauseEl = null; }
    if (Game.paused) this.showPause();
  },

  showPause() {
    if (this._pauseEl) return;
    const panel = this.el('div', 'panel pause-panel');
    panel.appendChild(this.el('h2', null, S('pauseTitle')));
    const resume = this.el('div', 'menu-btn menu-btn-small', `▶ ${S('resume')}`);
    resume.onclick = () => Game.togglePause();
    // Fracas Infini : on quitte vers son propre menu, la partie est sauvegardee
    const inf = Game.state === STATE.INFINITE;
    const abandon = this.el('div', 'menu-btn menu-btn-small', `🚪 ${S(inf && !Infinite.daily ? 'infQuitSaved' : 'abandon')}`);
    abandon.onclick = () => (inf ? Game.leaveInfinite() : Game.goToMenu());
    panel.appendChild(resume);
    // Parametres et Codex accessibles en pleine partie (sans la quitter)
    const sub = this.el('div', 'pause-row');
    const st = this.el('div', 'menu-btn menu-btn-small', `⚙️ ${S('settingsTitle')}`);
    st.onclick = () => this.openSub('settings');
    const cx = this.el('div', 'menu-btn menu-btn-small', `📖 ${S('btnBestiary')}`);
    cx.onclick = () => this.openSub('codex');
    sub.appendChild(st); sub.appendChild(cx);
    panel.appendChild(sub);
    panel.appendChild(abandon);
    panel.appendChild(this.soundControls()); // le son se regle aussi en pause
    this.overlay.appendChild(panel);
    this._pauseEl = panel;
  },

  hidePause() {
    if (this._subEl) { this._subEl.remove(); this._subEl = null; this.stopPortraitAnim(); }
    this.subMenu = null;
    if (this._pauseEl) { this._pauseEl.remove(); this._pauseEl = null; }
  },

  onStateChange(state) {
    this.clear();
    if (state === STATE.MENU) this.buildHubOverlay();
    else if (state === STATE.CHAR_SELECT) this.renderCharSelect();
    else if (state === STATE.SETTINGS) this.renderSettings();
    else if (state === STATE.BESTIARY) this.renderBestiary();
    else if (state === STATE.TEST_ROOM) this.buildHUD(state);
    else if (state === STATE.DAILY) Daily.renderMenu();
    else if (state === STATE.INFINITE_MENU) InfiniteUI.beginMenu();
    else if (state === STATE.INFINITE) this.buildHUD(state);
    else if (state === STATE.TUTORIAL) { this.buildHUD(state); Tutorial.renderBox(); }
    else if (state === STATE.ONLINE_MENU) OnlineUI.renderMenu();
    else if (state === STATE.ONLINE_LOBBY) OnlineUI.renderLobby(true);
    else if (state === STATE.ONLINE_GAME) { this.buildHUD(state); OnlineUI.buildGameOverlay(); }
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

  // ---------------- BASE (apres les 3 parties) ----------------
  buildHubOverlay() {
    const hud = this.el('div', 'hud');
    hud.appendChild(this.el('div', 'hub-title', `🏠 ${S('baseTitle')}`));
    hud.appendChild(this.el('div', 'hub-hint', S('baseHint')));
    const leave = this.el('div', 'hub-version', `🚪 ${S('baseLeave')}`);
    leave.onclick = () => Game.leaveBase();
    hud.appendChild(leave);
    this.overlay.appendChild(hud);
  },

  // ---------------- SELECTION / SHOWCASE PERSONNAGES ----------------
  renderCharSelect() {
    // Tous les personnages sur un seul ecran (grille ajustee a la fenetre, sans defilement) :
    // juste l'animation, le nom, la vitesse et le record. Le detail des competences est au Codex.
    const mode = Game.pendingCharSelectMode || 'infinite';
    const panel = this.el('div', 'panel rep-panel');
    panel.appendChild(this.backBtn(() => Game.goToMenu()));
    const head = this.el('div', 'rep-head');
    head.appendChild(this.el('h2', null, S('charSelectTitle')));
    panel.appendChild(head);

    const grid = this.el('div', 'rep-grid fit-grid');
    const portraits = [];
    const ids = allCharacterIds();
    for (const id of ids) {
      const c = getCharacter(id);
      const tile = this.el('div', 'rep-tile');
      tile.style.setProperty('--accent', c.color || '#7fd8ff');
      // perso jamais joue : "?" (on peut quand meme le choisir pour le decouvrir)
      const known = Save.isCharKnown(id);
      const sc = known ? createShowcase('character', id) : createMysteryShowcase(c.color);
      portraits.push(sc);
      tile.appendChild(sc.canvas);
      const cap = this.el('div', 'rep-tile-cap');
      cap.appendChild(this.el('span', 'rep-tile-name', known ? charName(id) : S('unknownName')));
      cap.appendChild(this.el('span', 'rep-tile-sub', known ? `👟 ${c.speedPercent}%` : ''));
      tile.appendChild(cap);
      tile.onclick = () => {
        if (mode === 'infinite') Game.startInfinite(Game.pendingInfiniteSlot || 0, id);
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

  // ---------------- REPERTOIRE & STATISTIQUES (menu unique) ----------------
  renderBestiary() {
    // Onglets + grille compacte a gauche, fiche detaillee de l'element choisi a droite :
    // peu de texte visible d'un coup, tout est range.
    const tab = this._repTab && this._repTab !== 'records' ? this._repTab : 'chars';
    const panel = this.el('div', 'panel rep-panel');
    panel.appendChild(this.backBtn(() => (this.subMenu ? this.closeSub() : Game.goToMenu())));
    const head = this.el('div', 'rep-head');
    head.appendChild(this.el('h2', null, S('bestiaryTitle')));
    const tabs = this.el('div', 'rep-tabs');
    const TAB_ICON = { chars: '🧍', turrets: '🗼', bosses: '👑', elements: '🧩', boons: '⚖️', rules: '📜' };
    for (const [k, label] of [['chars', 'repTabChars'], ['turrets', 'bestiaryTurrets'], ['bosses', 'bestiaryBosses'], ['elements', 'repTabElements'], ['boons', 'repTabBoons'], ['rules', 'repTabRules']]) {
      const b = this.el('div', 'rep-tab' + (k === tab ? ' active' : ''), `${TAB_ICON[k]} ${S(label)}`);
      b.onclick = () => { this._repTab = k; this._repSel = null; this.goCodex(); };
      tabs.appendChild(b);
    }
    head.appendChild(tabs);
    panel.appendChild(head);

    if (tab === 'records' || tab === 'rules' || tab === 'boons') {
      panel.appendChild(tab === 'boons' ? this.renderBoonsBoard() : this.renderRulesBoard());
      this.overlay.appendChild(panel);
      return;
    }

    const TURRETS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
    const items = tab === 'chars' ? allCharacterIds().map((id) => ({ kind: 'character', id }))
        : tab === 'turrets' ? TURRETS.map((id) => ({ kind: 'turret', id }))
          : tab === 'elements' ? CODEX_ELEMENTS.map((el) => ({ kind: 'element', id: el.id }))
            : ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7'].map((id) => ({ kind: 'boss', id }));
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
      const known = isDiscovered(it.kind, it.id);
      const sc = known ? createShowcase(it.kind, it.id) : createMysteryShowcase(this.repColor(it));
      scenes.push(sc);
      tile.appendChild(sc.canvas);
      const cap = this.el('div', 'rep-tile-cap');
      cap.appendChild(this.el('span', 'rep-tile-name', known ? this.repName(it) : S('unknownName')));
      cap.appendChild(this.el('span', 'rep-tile-sub', known ? this.repSub(it) : ''));
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
    if (it.kind === 'element') return elementInfo(it.id).color;
    if (it.kind === 'character') return getCharacter(it.id).color || '#7fd8ff';
    if (it.kind === 'turret') return TURRET_COLOR[it.id] || '#ff5d5d';
    return BOSS_DEFS[it.id].color;
  },
  repName(it) {
    if (it.kind === 'element') return elementInfo(it.id).name;
    if (it.kind === 'character') return charName(it.id);
    if (it.kind === 'turret') return turretInfo(it.id).name;
    return BOSS_DEFS[it.id].name;
  },
  repSub(it) {
    if (it.kind === 'element') return elementInfo(it.id).group;
    if (it.kind === 'character') {
      return `👟 ${getCharacter(it.id).speedPercent}%`;
    }
    if (it.kind === 'turret') return `${it.id} · ${Save.getKillCount(it.id)} ${S('bestiaryKills').toLowerCase()}`;
    return `${Save.getKillCount(it.id)} ${S('bestiaryKills').toLowerCase()}`;
  },

  // Fiche detaillee (colonne de droite).
  renderRepDetail(it) {
    if (!isDiscovered(it.kind, it.id)) {
      // Pas encore decouvert : ni image, ni nom, ni statistiques.
      const node = this.el('div', 'rep-card');
      node.style.setProperty('--accent', this.repColor(it));
      const sc = createMysteryShowcase(this.repColor(it));
      sc.canvas.classList.add('rep-big');
      node.appendChild(sc.canvas);
      const title = this.el('div', 'rep-title');
      title.appendChild(this.el('h3', null, S('unknownName')));
      node.appendChild(title);
      node.appendChild(this.el('div', 'rep-note', S('repUnknown')));
      return { node, scene: sc };
    }
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
      chip(S('speed'), `${c.speedPercent}%`);
      row(keyLabel(Keybinds.attack), charField(it.id, 'attackLabel'));
      for (const n of [1, 2, 3]) row(keyLabel(Keybinds['ability' + n]), `${charField(it.id, 'a' + n + 'Label')}${c['a' + n + 'Cd'] ? ' · ' + c['a' + n + 'Cd'] + 's' : ''}`);
    } else if (it.kind === 'element') {
      title.appendChild(this.el('div', 'rep-epithet', elementInfo(it.id).group));
    } else if (it.kind === 'turret') {
      chip(S('bestiaryHp'), String(Math.round(TURRET_HP[it.id] * ENEMY_HP_MULT)));
      chip(S('bestiaryLoss'), `${+(TURRET_LOSS[it.id] * PLAYER_DAMAGE_TAKEN_MULT * PVE_LOSS_MULT).toFixed(1)}%`); // % reellement perdu
      chip(S('bestiaryKills'), String(Save.getKillCount(it.id)), 'time');
      rows.appendChild(this.el('p', 'rep-desc', turretInfo(it.id).desc));
    } else {
      const def = BOSS_DEFS[it.id];
      chip(S('bestiaryHp'), String(Math.round(def.hp * ENEMY_HP_MULT)));
      chip(S('bestiaryContact'), `${+(def.contact * PLAYER_DAMAGE_TAKEN_MULT * PVE_LOSS_MULT * BOSS_DAMAGE_MULT).toFixed(1)}%`);
      chip(S('bestiaryKills'), String(Save.getKillCount(it.id)), 'time');
      rows.appendChild(this.el('p', 'rep-desc', bossInfo(it.id).desc));
    }
    // Statistiques detaillees (valeurs chiffrees)
    const statList = it.kind === 'character' ? codexCharStats(it.id)
      : it.kind === 'turret' ? (CODEX_TURRET_STATS[it.id] || [])
        : it.kind === 'element' ? elementInfo(it.id).stats
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
    if (it.kind === 'character') {
      const btn = this.el('div', 'menu-btn menu-btn-small rep-action', S('repTestRoom'));
      btn.onclick = () => Game.startTestRoom(it.id);
      node.appendChild(btn);
    }
    return { node, scene: sc };
  },

  // Onglet Regles : cartes courtes, tout sur un ecran.
  // Tous les bonus et malus possibles (fin de partie du Monde / de boss en Infini).
  renderBoonsBoard() {
    const board = this.el('div', 'rep-boons');
    board.appendChild(this.el('div', 'rep-boons-note', `⏳ ${S('boonNextPart')}   ·   ∞ ${S('boonForever')}   ·   ${S('boonsCodexNote')}`));
    const cols = this.el('div', 'rep-boons-cols');
    for (const [kind, table, title] of [['boon', BOON_EFFECTS, `✚ ${S('codexBoons')}`], ['curse', CURSE_EFFECTS, `✖ ${S('codexCurses')}`]]) {
      const col = this.el('div', 'rep-boons-col ' + kind);
      col.appendChild(this.el('h3', null, title));
      const list = this.el('div', 'rep-boons-list');
      col.appendChild(list);
      for (const key of Object.keys(table)) {
        const part = boonParse(boonId(kind, key, 'part'));
        const run = table[key][2] != null ? boonParse(boonId(kind, key, 'run')) : null;
        if (!Save.isBoonKnown(kind, key)) { // pas encore rencontre en partie : cache
          const u = this.el('div', 'rep-boon unknown');
          u.appendChild(this.el('span', 'rep-boon-icon', '❔'));
          u.appendChild(this.el('span', 'rep-boon-label', S('unknownName')));
          list.appendChild(u);
          continue;
        }
        const r = this.el('div', 'rep-boon');
        r.appendChild(this.el('span', 'rep-boon-icon', part.icon));
        r.appendChild(this.el('span', 'rep-boon-label', S(`mod_${key}`)));
        r.appendChild(this.el('b', 'rep-boon-val', `⏳ ${boonValueText(part) || '✔'}`));
        r.appendChild(this.el('b', 'rep-boon-val run', run ? `∞ ${boonValueText(run)}` : '∞ —'));
        if ((table[key][4] || '').includes('heal')) r.title = S('boonsNoHealInf');
        list.appendChild(r);
      }
      cols.appendChild(col);
    }
    board.appendChild(cols);
    return board;
  },

  renderRulesBoard() {
    const board = this.el('div', 'rep-records rep-rules');
    for (const k of CODEX_RULES) {
      const sec = ruleInfo(k);
      const c = this.el('div', 'rep-rec-col');
      c.appendChild(this.el('h3', null, sec.title));
      for (const l of sec.lines) c.appendChild(this.el('p', 'rep-rule', l));
      board.appendChild(c);
    }
    return board;
  },

  // Onglet Records : trois colonnes compactes.


  // ---------------- PARAMETRES ----------------
  renderSettings() {
    const panel = this.el('div', 'panel');
    panel.appendChild(this.backBtn(() => (this.subMenu ? this.closeSub() : Game.goToMenu())));
    const header = this.el('div', 'market-header');
    header.appendChild(this.el('h2', null, S('settingsTitle')));
    panel.appendChild(header);

    const wrap = this.el('div', 'settings-wrap');

    // Langue
    const langSection = this.el('div', 'settings-section');
    langSection.appendChild(this.el('h3', null, `🌐 ${S('settingsLanguage')}`));
    const langRow = this.el('div', 'lang-row');
    langRow.classList.add('lang-grid');
    for (const { code, name } of LANGUAGES) {
      const b = this.el('div', 'lang-btn' + (lang() === code ? ' active' : ''), name);
      b.onclick = () => { Save.setLanguage(code); this.goSettings(); };
      langRow.appendChild(b);
    }
    langSection.appendChild(langRow);
    wrap.appendChild(langSection);

    // Son
    const soundSection = this.el('div', 'settings-section');
    soundSection.appendChild(this.el('h3', null, `🔊 ${S('settingsSound')}`));
    soundSection.appendChild(this.soundControls());
    wrap.appendChild(soundSection);
    wrap.appendChild(this.accessSection());
    if (Playtest.enabled()) wrap.appendChild(this.playtestSection()); // version de test seulement
    if (NATIVE) wrap.appendChild(this.displaySection()); // version programme : plein ecran, taille

    // Curseur (apparence personnalisable)
    const cursorSection = this.el('div', 'settings-section');
    cursorSection.appendChild(this.el('h3', null, `🎯 ${S('settingsCursor')}`));
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
      b.onclick = () => { Save.setCursorStyle(style); this.goSettings(); };
      cursorStyleRow.appendChild(b);
    }
    cursorSection.appendChild(cursorStyleRow);
    wrap.appendChild(cursorSection);

    // Raccourcis
    const keySection = this.el('div', 'settings-section');
    keySection.appendChild(this.el('h3', null, `⌨️ ${S('settingsKeybinds')}`));
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
          this.goSettings();
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
    resetBtn.onclick = () => { Save.resetKeybinds(); this.goSettings(); };
    keySection.appendChild(resetBtn);

    wrap.appendChild(keySection);
    panel.appendChild(wrap);
    this.overlay.appendChild(panel);
  },

  // ---------------- HUD ----------------
  buildHUD(state) {
    const hud = this.el('div', state === STATE.TUTORIAL ? 'hud hud-tutorial' : 'hud');
    const topLeft = this.el('div', 'hud-top-left');
    const nameEl = this.el('div', 'name', '');
    const dmgEl = this.el('div', 'hud-dmg', '');
    const dmgBar = this.el('div', 'hud-dmg-bar');
    const dmgBarFill = this.el('div', 'hud-dmg-bar-fill');
    dmgBar.appendChild(dmgBarFill);
    const progEl = this.el('div', 'hud-progress', '');
    const boonEl = this.el('div', 'hud-boons');
    topLeft.appendChild(nameEl); topLeft.appendChild(dmgEl); topLeft.appendChild(dmgBar); topLeft.appendChild(progEl); topLeft.appendChild(boonEl);
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
    this.hudRefs = { nameEl, dmgEl, dmgBarFill, progEl, boonEl, timeEl, bestEl, slots, msg, roundEndContainer: null };

    if (state === STATE.TEST_ROOM) { this.buildTestRoomBar(); this.buildTestRoomSpawner(); }
  },

  buildTestRoomSpawner() {
    const bar = this.el('div', 'test-spawn-bar');
    bar.style.pointerEvents = 'auto';
    bar.appendChild(this.el('div', 'test-spawn-label', S('testSpawnLabel')));
    const grid = this.el('div', 'test-spawn-grid');
    for (const type of ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7']) {
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

  // Les panneaux du HUD ne doivent jamais cacher le jeu : des qu'un ennemi, un tir ennemi ou le
  // joueur passe dessous, le panneau devient presque transparent.
  hudSeeThrough(world) {
    this._hudTick = (this._hudTick || 0) + 1;
    if (this._hudTick % 4) return;
    const canvas = document.getElementById('game');
    if (!canvas || !this.overlay) return;
    const c = canvas.getBoundingClientRect(), zoom = world.zoom || 1, cam = world.camera || { x: 0, y: 0 };
    const pts = [];
    const add = (x, y, r) => pts.push({ x: c.left + (x - cam.x) * zoom, y: c.top + (y - cam.y) * zoom, r: (r || 12) * zoom });
    if (world.player) add(world.player.x, world.player.y, world.player.radius);
    for (const e of world.enemies) if (!e.dead) add(e.x, e.y, e.radius || 16);
    for (const pr of world.projectiles) if (pr.team === TEAM.ENEMY) add(pr.x, pr.y, pr.radius || 6);
    for (const el of this.overlay.querySelectorAll('.hud-top-left, .hud-top-right, .hud-abilities, .controls-recap, .assist-toasts')) {
      const b = el.getBoundingClientRect();
      if (!b.width) continue;
      const under = pts.some((p) => p.x > b.left - p.r && p.x < b.right + p.r && p.y > b.top - p.r && p.y < b.bottom + p.r);
      el.classList.toggle('see-through', under);
    }
  },

  updateHUD(game) {
    if (!this.hudRefs) return;
    const { world, state } = game;
    const player = world.player;
    if (!player) return;
    const r = this.hudRefs;
    this.hudSeeThrough(world);
    r.nameEl.textContent = `${S('hudPersonnage')} : ${charName(player.character.id)}`;
    // En parcours (et au Foot en ligne), la jauge montre la vitesse : les coups ralentissent.
    const speedGauge = player.speedMode;
    const pct = Math.round((player.speedMode ? player.speedPct : player.damageMultiplier) * 100);
    setTextOnce(r.dmgEl, `${speedGauge ? '👟' : '⚔️'} ${S(speedGauge ? 'hudSpeed' : 'hudDamage')} : ${pct}%`); // seulement si le texte change (icones)
    const dmgColor = pct >= 70 ? '#7fff9c' : (pct >= 35 ? '#ffd23d' : '#ff5d5d');
    r.dmgEl.style.color = dmgColor;
    // Fracas Infini : la barre commence a 40% (le plancher) : vide a 40%, pleine au maximum
    const infFloor = state === STATE.INFINITE && !speedGauge ? INF_DMG_MIN * 100 : 0;
    const barPct = infFloor ? (pct - infFloor) / ((player.dmgMax || DMG_MAX) * 100 - infFloor) * 100 : pct;
    r.dmgBarFill.style.width = `${clamp(barPct, 0, 100)}%`;
    r.dmgBarFill.style.background = dmgColor;

    let timeMs = 0, bestMs = null;
    if (state === STATE.TUTORIAL) {
      r.progEl.textContent = S('tutoReplay');
    } else if (state === STATE.INFINITE) {
      r.progEl.textContent = Infinite.daily
        ? `📅 ${S('dailyTitle')} · ${S('dailyEv_' + Infinite.daily.event.id)} · ${S('infRoom')} ${Infinite.depth}/${DAILY_ROOMS}${world.room && world.room.isBoss ? ' (' + S('hudBoss') + ')' : ''}`
        : `${S('hudPart')} ${Infinite.partOf(Infinite.depth)} · ${S('infRoom')} ${Infinite.depth}${world.room && world.room.isBoss ? ' (' + S('hudBoss') + ')' : ''}`;
    } else if (state === STATE.ONLINE_GAME) {
      r.progEl.textContent = `${S('mpTitle')} · ${OnlineUI.modeName(OnlineGame.mode)}`;
    } else {
      r.progEl.textContent = S('hudTestRoom');
    }
    if (state === STATE.TUTORIAL) { r.timeEl.textContent = ''; r.bestEl.textContent = ''; } else
    if (state === STATE.INFINITE && Infinite.daily) {
      // defi du jour : chrono (penalites comprises) et record du jour
      r.timeEl.textContent = formatTime(Daily.totalMs()) + (Daily.penalty ? `  (+${Daily.penalty} s)` : '');
      const rec = Daily.record();
      r.bestEl.textContent = `🏆 ${rec != null ? formatTime(rec) : '--:--.---'}`;
    } else if (state === STATE.INFINITE) {
      // Aucun chrono ni record dans Fracas Infini : statistiques de la partie en cours.
      r.timeEl.textContent = formatMoney(infMoney()); // argent de CETTE partie
      r.bestEl.textContent = `${S('infUp_damage')} +${Math.round(infBonus('damage') * 100)}% · ${S('infUp_resist')} -${Math.round(infBonus('resist') * 100)}% · ${S('infUp_money')} +${Math.round(infBonus('money') * 100)}%`;
    } else {
      r.timeEl.textContent = formatTime(timeMs);
      r.bestEl.textContent = `${S('hudBest')} : ${bestMs != null ? formatTime(bestMs) : '--:--.---'}`;
    }

    Boons.renderHudChips(r.boonEl); // benedictions (vert) / maledictions (rouge) actives
    const c = player.character;

    // Attaque principale : cooldown reel si le personnage en a un, AUTO si totalement automatique,
    // sinon affichee sans jauge (mecaniques de disponibilite propres a certains persos).
    const atk = r.slots.attack;
    atk.nameLabel.textContent = S('attack');
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

    if (false) {
    } else if (state === STATE.INFINITE && (Infinite.transitionTimer > 0 || Infinite.swapBanner > 0 || Infinite.partBanner > 0 || Infinite.fleeBanner > 0 || Infinite.finalBanner > 0)) {
      r.msg.style.display = 'block';
      const lines = [];
      if (Infinite.fleeBanner > 0 && Infinite.transitionPhase !== 'out') lines.push(`💨 ${S('infBossFled')}`);
      else if (Infinite.finalBanner > 0 && Infinite.transitionPhase !== 'out') lines.push(`👑 ${S('infFinalBoss')} 👑`);
      else if (Infinite.transitionPhase === 'out') lines.push(`${S('infRoom')} ${Infinite.depth + 1}`);
      else {
        if (Infinite.partBanner > 0) lines.push(`${S('hudPart')} ${Infinite.partOf(Infinite.depth)} — C${Infinite.partOf(Infinite.depth)} ${S('infOnlyAbility')}`);
        if (Infinite.swapBanner > 0) lines.push(`${S('infSwap')} : ${charName(Infinite.characterId)} !`);
        if (!lines.length) lines.push(`${S('infRoom')} ${Infinite.depth}`);
      }
      setTextOnce(r.msg, lines.join('   ·   '));
    } else {
      r.msg.style.display = 'none';
    }

  },

  showRoundEnd(title, timeMs, isRecord, onRetry, onMenu) {
    this.roundEndShown = true;
    Music.jingle('victory');
    const panel = this.el('div', 'panel round-end');
    panel.appendChild(this.el('h2', null, title));
    const sub = this.el('div', 'menu-sub round-end-sub', `${S('time')} : ${formatTime(timeMs)}${isRecord ? '  —  ' + S('newRecord') : ''}`);
    panel.appendChild(sub);
    const retry = this.el('div', 'menu-btn menu-btn-small', `🔁 ${S('retry')}`);
    retry.onclick = onRetry;
    const menu = this.el('div', 'menu-btn menu-btn-small', `🏠 ${S('toMenu')}`);
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
