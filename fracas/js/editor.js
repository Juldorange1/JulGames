// Editeur de defis DANS la carte : on se promene avec le personnage choisi et on place/efface
// directement les elements au curseur. Une nouvelle carte est TOUJOURS vide au depart.
// Clic gauche = placer l'outil choisi, clic droit (ou Gomme) = effacer, ZQSD = se deplacer.

const EDITOR_TOOLBAR_W = 270;
const EDITOR_MAX_ENEMIES = 30;
const EDITOR_MAX_ITEMS = 160;
const COMBAT_ROOM_W = 1000, COMBAT_ROOM_H = 650; // salles de defi : pas trop grandes
const ED_DIRS = { E: 0, S: Math.PI / 2, W: Math.PI, N: -Math.PI / 2 };
const ED_WALLS = { wallS: { w: 48, h: 48 }, wallH: { w: 192, h: 40 }, wallV: { w: 40, h: 192 } };

// Largeur a cadrer pour que la zone utile tienne a droite de la barre d'outils.
function editorWidthFor(w) { return w * CANVAS_W / Math.max(300, CANVAS_W - EDITOR_TOOLBAR_W); }

const Editor = {
  mode: 'combat',
  draft: null,
  editId: null,
  tool: 'T1',
  dir: 'E',
  pendingTp: null,
  history: [],
  msg: '', msgTimer: 0,
  _floorKey: null, _floor: null,

  open(mode, entry) {
    this.mode = mode;
    this.editId = entry ? entry.id : null;
    this.history = [];
    this.pendingTp = null;
    this.dir = 'E';
    if (mode === 'combat') {
      const pl = entry && entry.placed ? JSON.parse(JSON.stringify(entry.placed)) : {};
      this.draft = {
        name: entry ? entry.name : '', characterId: entry ? entry.characterId : 1, abilityGate: entry ? (entry.abilityGate || 1) : 1,
        theme: entry ? (entry.theme || 1) : 1, speed: entry && entry.speed ? entry.speed : 1,
        placed: { enemies: pl.enemies || [], boss: pl.boss || null, obstacles: pl.obstacles || [], zones: pl.zones || [], teleporters: pl.teleporters || [], trampolines: pl.trampolines || [] },
      };
      this.tool = 'T1';
    } else {
      const manual = entry && entry.manual;
      this.draft = {
        name: entry ? entry.name : '', characterId: entry && (getCharacter(entry.characterId) || {}).parkourOnly ? entry.characterId : 12,
        theme: entry ? (entry.theme || 1) : 1, length: entry ? (entry.length || 1) : 1, straight: manual ? !!entry.straight : false,
        shapeSeed: manual ? entry.shapeSeed : 1 + Math.floor(Math.random() * 2000000000), speed: entry && entry.speed ? entry.speed : 1,
        items: manual ? JSON.parse(JSON.stringify(entry.items || [])) : [], // nouvelle carte : totalement vide
      };
      this.tool = 'wallS';
    }
    Game.paused = false; UI.hidePause();
    Game.world.hubDoors = null;
    Game.world.userSpeedMult = 1;
    this._floorKey = null;
    this.build(true);
    Game.setState(STATE.CHALLENGE_EDITOR);
  },

  snapshot() { this.history.push(JSON.stringify(this.draft)); if (this.history.length > 60) this.history.shift(); },
  undo() {
    if (!this.history.length) return;
    this.draft = JSON.parse(this.history.pop());
    this.pendingTp = null;
    this.build(false); this.refreshToolbar();
  },
  clearAll() {
    this.snapshot();
    if (this.mode === 'combat') this.draft.placed = { enemies: [], boss: null, obstacles: [], zones: [], teleporters: [], trampolines: [] };
    else this.draft.items = [];
    this.pendingTp = null;
    this.build(false); this.renderCounts();
  },

  build(resetPlayer) {
    const world = Game.world;
    const d = this.draft;
    const prev = world.player && !resetPlayer ? { x: world.player.x, y: world.player.y } : null;
    world.enemies = []; world.projectiles = []; world.zones = []; world.walls = []; world.shields = [];
    world.mines = []; world.winds = []; world.meteors = []; world.hazards = [];
    world.onEnemyKilled = null;
    world.abilityGate = null;
    world.theme = ROOM_THEMES[d.theme] || ROOM_THEMES[1];
    let spawn;
    if (this.mode === 'combat') {
      const bounds = { x: -COMBAT_ROOM_W / 2, y: -COMBAT_ROOM_H / 2, w: COMBAT_ROOM_W, h: COMBAT_ROOM_H };
      spawn = { x: bounds.x + SPAWN_FRAC.fx * bounds.w, y: bounds.y + SPAWN_FRAC.fy * bounds.h };
      const pl = d.placed;
      const room = {
        bounds, obstacles: pl.obstacles.map((o) => Object.assign({}, o)), part: 0, index: 0, isBoss: false,
        terrainZones: pl.zones.map((z) => editorZone(z)),
        parkour: { time: world.room && world.room.parkour ? world.room.parkour.time : 0, spikes: [], lasers: [], boosts: [], shooters: [], teleporters: pl.teleporters, trampolines: pl.trampolines },
      };
      world.room = room;
      for (const e of pl.enemies) world.enemies.push(createTurret(e.type, e.x, e.y));
      if (pl.boss) world.enemies.push(createBoss(pl.boss.type, room, { weakened: true, x: pl.boss.x, y: pl.boss.y }));
      setWorldZoom(world, editorWidthFor(COMBAT_ROOM_W), COMBAT_ROOM_H);
      const key = 'c' + d.theme;
      if (this._floorKey !== key) { this._floorKey = key; this._floor = null; world.decorations = generateDecorations(bounds, [], [{ x: spawn.x, y: spawn.y, r: 130 }], d.theme, 22); }
      if (this._floor) room._floor = this._floor;
    } else {
      const L = buildParkourLayout({ seed: d.shapeSeed, length: d.length, straight: d.straight, contentless: true });
      applyParkourExtras(L, d.items);
      const key = `p${d.theme}-${d.length}-${d.shapeSeed}-${d.straight}`;
      const sameShape = this._floorKey === key && world.room && world.room.floorRects;
      const room = {
        bounds: L.bounds, obstacles: L.obstacles,
        terrainZones: L.zones.map((z) => editorZone({ type: z.type, x: z.x, y: z.y, r: z.radius, windAngle: z.windAngle })),
        part: 0, index: 0, isBoss: false,
        parkourGoal: Object.assign({ dir: L.goalDir }, L.goal), parkourStart: L.start,
        floorRects: sameShape ? world.room.floorRects : L.rects.map((r) => Object.assign({}, r)),
        parkour: {
          time: world.room && world.room.parkour ? world.room.parkour.time : 0,
          spikes: L.spikes, lasers: L.lasers, trampolines: L.trampolines, teleporters: L.teleporters,
          boosts: L.boosts.map((b) => ({ x: b.x, y: b.y })), shooters: L.shooters.map((sh) => Object.assign({}, sh, { fired: [] })),
        },
      };
      world.room = room;
      setWorldZoom(world, editorWidthFor(1000), PARKOUR_HEIGHT + 60, 0);
      if (!sameShape) { this._floorKey = key; world.decorations = generateDecorations(L.bounds, [], [], d.theme, Math.round(L.pathLen / 40)); }
      spawn = L.start;
      this.layout = L;
    }
    this.spawn = spawn;
    if (!world.player || resetPlayer || world.player.character.id !== d.characterId) {
      Game.spawnPlayerFor(d.characterId, spawn.x, spawn.y);
      if (prev) { world.player.x = prev.x; world.player.y = prev.y; }
    } else if (prev) { world.player.x = prev.x; world.player.y = prev.y; }
    world.player.parkour = this.mode === 'parkour';
    world.player.parkourSpeed = 1;
    world.editorMode = true;
    world.noFollow = false;
    Game.updateCamera(1);
  },

  flash(text) { this.msg = text; this.msgTimer = 2.2; const m = document.querySelector('.ed-msg'); if (m) m.textContent = text; },

  update(world, realDt) {
    if (this.msgTimer > 0) { this.msgTimer -= realDt; if (this.msgTimer <= 0) { this.msg = ''; const m = document.querySelector('.ed-msg'); if (m) m.textContent = ''; } }
    if (world.room && world.room._floor) this._floor = world.room._floor;
    if (world.room && world.room.parkour) world.room.parkour.time += realDt;
    world.camShiftX = -(EDITOR_TOOLBAR_W / 2) / (world.zoom || 1);
    const p = world.player;
    if (!p) return;
    if (Input.mouse.pressedEdge) this.place(p.aim.x, p.aim.y, this.tool);
    if (Input.wasPressed('Mouse2')) this.place(p.aim.x, p.aim.y, 'erase');
  },

  isOpen(x, y, r) {
    const room = Game.world.room, b = room.bounds;
    if (x < b.x + r || x > b.x + b.w - r || y < b.y + r || y > b.y + b.h - r) return false;
    return !room.obstacles.some((o) => circleRect(x, y, r, o.x, o.y, o.w, o.h));
  },

  place(x, y, tool) {
    if (tool === 'erase') { this.erase(x, y); return; }
    const d = this.draft;
    if (Math.hypot(x - this.spawn.x, y - this.spawn.y) < (this.mode === 'combat' ? 110 : 80)) { this.flash(S('edTooClose')); return; }
    const ang = ED_DIRS[this.dir];
    const land = (dist) => ({ x: x + Math.cos(ang) * dist, y: y + Math.sin(ang) * dist });
    // Teleporteur : 1er clic = entree, 2e clic = sortie
    if (tool === 'teleporter') {
      if (!this.isOpen(x, y, 22)) { this.flash(S('edBlocked')); return; }
      if (!this.pendingTp) { this.pendingTp = { x, y }; this.flash(S('edTpExit')); return; }
      this.snapshot();
      const tp = { ax: this.pendingTp.x, ay: this.pendingTp.y, bx: x, by: y };
      this.pendingTp = null;
      if (this.mode === 'combat') d.placed.teleporters.push(tp); else d.items.push(Object.assign({ kind: 'teleporter' }, tp));
      return this.commit();
    }
    if (tool === 'trampoline') {
      const l = land(220);
      if (!this.isOpen(x, y, 22) || !this.isOpen(l.x, l.y, 24)) { this.flash(S('edBlocked')); return; }
      this.snapshot();
      const tr = { x, y, lx: l.x, ly: l.y };
      if (this.mode === 'combat') d.placed.trampolines.push(tr); else d.items.push(Object.assign({ kind: 'trampoline' }, tr));
      return this.commit();
    }
    if (ED_WALLS[tool]) {
      const sz = ED_WALLS[tool];
      const o = { x: x - sz.w / 2, y: y - sz.h / 2, w: sz.w, h: sz.h };
      const b = Game.world.room.bounds;
      if (o.x < b.x || o.y < b.y || o.x + o.w > b.x + b.w || o.y + o.h > b.y + b.h) return;
      if (this.mode === 'parkour') {
        const L = this.layout;
        if (parkourReach(L.bounds, L.obstacles.concat([o]), [], L.start, L.goal) !== Infinity) { this.flash(S('edWouldBlock')); return; }
        this.snapshot();
        d.items.push({ kind: 'wall', x, y, w: sz.w, h: sz.h });
      } else {
        if (circleRect(this.spawn.x, this.spawn.y, 90, o.x, o.y, o.w, o.h)) { this.flash(S('edTooClose')); return; }
        this.snapshot();
        d.placed.obstacles.push(o);
      }
      return this.commit();
    }
    if (tool.startsWith('z:')) {
      this.snapshot();
      const z = { type: tool.slice(2), x, y, r: 60, windAngle: ang };
      if (this.mode === 'combat') d.placed.zones.push(z); else d.items.push(Object.assign({ kind: 'zone' }, z));
      return this.commit();
    }
    if (this.mode === 'combat') {
      const pl = d.placed;
      if (/^B\d$/.test(tool)) {
        if (!this.isOpen(x, y, 40)) { this.flash(S('edBlocked')); return; }
        this.snapshot(); pl.boss = { type: tool, x, y };
      } else {
        if (pl.enemies.length >= EDITOR_MAX_ENEMIES) { this.flash(S('edLimit')); return; }
        if (!this.isOpen(x, y, 22)) { this.flash(S('edBlocked')); return; }
        this.snapshot(); pl.enemies.push({ type: tool, x, y });
      }
      return this.commit();
    }
    // parcours : pieges et bonus
    if (d.items.length >= EDITOR_MAX_ITEMS) { this.flash(S('edLimit')); return; }
    if (!this.isOpen(x, y, 14)) { this.flash(S('edBlocked')); return; }
    this.snapshot();
    if (tool === 'laserV' || tool === 'laserH') d.items.push({ kind: 'laser', x, y, orient: tool === 'laserV' ? 'v' : 'h' });
    else if (tool === 'shooter') d.items.push({ kind: 'shooter', x, y, angle: ang });
    else d.items.push({ kind: tool, x, y });
    this.commit();
  },

  commit() {
    Audio2.spark();
    this.build(false);
    this.renderCounts();
  },

  // Efface l'element le plus proche du curseur (n'importe lequel).
  erase(x, y) {
    const d = this.draft;
    if (this.pendingTp) { this.pendingTp = null; return; }
    let best = null, bestD = 50;
    const consider = (list, item, px, py, inside) => {
      const dd = inside ? 0 : Math.hypot(px - x, py - y);
      if (dd < bestD) { bestD = dd; best = { list, item }; }
    };
    const inRect = (o) => x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h;
    if (this.mode === 'combat') {
      const pl = d.placed;
      for (const e of pl.enemies) consider(pl.enemies, e, e.x, e.y);
      for (const o of pl.obstacles) consider(pl.obstacles, o, o.x + o.w / 2, o.y + o.h / 2, inRect(o));
      for (const z of pl.zones) consider(pl.zones, z, z.x, z.y, Math.hypot(z.x - x, z.y - y) < z.r);
      for (const t of pl.trampolines) consider(pl.trampolines, t, t.x, t.y);
      for (const t of pl.teleporters) { consider(pl.teleporters, t, t.ax, t.ay); consider(pl.teleporters, t, t.bx, t.by); }
      if (pl.boss && Math.hypot(pl.boss.x - x, pl.boss.y - y) < Math.max(bestD, 55)) { this.snapshot(); pl.boss = null; this.commit(); return; }
    } else {
      for (const e of d.items) {
        if (e.kind === 'wall') consider(d.items, e, e.x, e.y, Math.abs(x - e.x) <= (e.w || 44) / 2 && Math.abs(y - e.y) <= (e.h || 44) / 2);
        else if (e.kind === 'zone') consider(d.items, e, e.x, e.y, Math.hypot(e.x - x, e.y - y) < (e.r || 60));
        else if (e.kind === 'teleporter') { consider(d.items, e, e.ax, e.ay); consider(d.items, e, e.bx, e.by); }
        else consider(d.items, e, e.x, e.y);
      }
    }
    if (!best) return;
    this.snapshot();
    best.list.splice(best.list.indexOf(best.item), 1);
    Audio2.impact();
    this.build(false);
    this.renderCounts();
  },

  canSave() {
    if (this.mode === 'parkour') return true;
    return this.draft.placed.enemies.length > 0 || !!this.draft.placed.boss;
  },

  save(thenPlay) {
    if (!this.canSave()) { this.flash(S('customNeedEnemy')); return; }
    const d = this.draft;
    let fields;
    if (this.mode === 'combat') {
      fields = { name: d.name.trim() || `${S('customDefaultName')} ${Save.data.customChallenges.length + 1}`,
        characterId: d.characterId, abilityGate: d.abilityGate, theme: d.theme, speed: d.speed,
        placed: JSON.parse(JSON.stringify(d.placed)), enemies: null, bossType: null };
    } else {
      fields = { parkour: true, manual: true, name: d.name.trim() || `${S('parkourDefaultName')} ${Save.data.customChallenges.filter((x) => x.parkour).length + 1}`,
        characterId: d.characterId, theme: d.theme, length: d.length, straight: d.straight, shapeSeed: d.shapeSeed, speed: d.speed,
        items: JSON.parse(JSON.stringify(d.items)), zones: [], extras: null, seed: null };
    }
    const entry = this.editId ? Save.updateCustomChallenge(this.editId, fields) : Save.addCustomChallenge(fields);
    if (thenPlay) Game.startChallenge(entry.id);
    else Game.setState(STATE.CHALLENGE_SELECT);
  },

  // ---------- Barre d'outils ----------
  renderToolbar() {
    const d = this.draft;
    const isP = this.mode === 'parkour';
    const bar = UI.el('div', 'ed-bar');
    const top = UI.el('div', 'ed-top');
    const back = UI.el('div', 'ed-back', '‹');
    back.onclick = () => Game.setState(STATE.CHALLENGE_SELECT);
    top.appendChild(back);
    top.appendChild(UI.el('div', 'ed-title', S(isP ? (this.editId ? 'edEditParkour' : 'parkourCreate') : (this.editId ? 'edEditCombat' : 'customCreate'))));
    bar.appendChild(top);

    const name = document.createElement('input');
    name.type = 'text'; name.maxLength = 32; name.className = 'editor-name ed-name';
    name.placeholder = S('customNamePlaceholder'); name.value = d.name;
    name.addEventListener('input', () => { d.name = name.value; });
    bar.appendChild(name);

    const group = (labelKey, items, isActive, onPick, cls) => {
      const g = UI.el('div', 'ed-group');
      g.appendChild(UI.el('div', 'ed-label', S(labelKey)));
      const row = UI.el('div', 'ed-chips' + (cls ? ' ' + cls : ''));
      for (const it of items) {
        const b = UI.el('div', 'ed-chip' + (isActive(it.value) ? ' active' : ''), it.label);
        if (it.title) b.title = it.title;
        if (it.color) b.style.setProperty('--chip', it.color);
        b.onclick = () => { onPick(it.value); this.refreshToolbar(); };
        row.appendChild(b);
      }
      g.appendChild(row);
      bar.appendChild(g);
    };
    group('customCharacter', (isP ? parkourCharacterIds() : allCharacterIds()).map((id) => ({ value: id, label: charName(id), color: getCharacter(id).color })),
      (v) => d.characterId === v, (v) => { d.characterId = v; this.build(false); });
    if (!isP) {
      group('customAbility', [1, 2, 3].map((n) => ({ value: n, label: `C${n}`, title: charField(d.characterId, 'a' + n + 'Label') })),
        (v) => d.abilityGate === v, (v) => { d.abilityGate = v; });
    }
    group('customTheme', [1, 2, 3].map((n) => ({ value: n, label: S('customTheme_' + n) })), (v) => d.theme === v, (v) => { d.theme = v; this._floorKey = null; if (Game.world.room) Game.world.room.floorRects = null; this.build(false); });
    group('edSpeed', [0.8, 1, 1.2, 1.4].map((v) => ({ value: v, label: `${Math.round(v * 100)}%` })), (v) => d.speed === v, (v) => { d.speed = v; });
    if (isP) {
      group('parkourLength', [1, 2, 3].map((n) => ({ value: n, label: S('parkourLength_' + n) })), (v) => d.length === v,
        (v) => { this.snapshot(); d.length = v; d.items = []; this.build(true); });
      group('edShape', [{ value: false, label: S('edShapeTurns') }, { value: true, label: S('edShapeStraight') }], (v) => d.straight === v,
        (v) => { this.snapshot(); d.straight = v; d.items = []; this.build(true); });
      const reroll = UI.el('div', 'ed-btn', S('edReroll'));
      reroll.onclick = () => { this.snapshot(); d.shapeSeed = 1 + Math.floor(Math.random() * 2000000000); d.items = []; this.build(true); this.refreshToolbar(); };
      bar.appendChild(reroll);
    }

    const zoneTools = PARKOUR_ZONE_TYPES.map((t) => ({ value: 'z:' + t, label: terrainLabelI18n(t), color: terrainEdgeColor(t) }));
    const common = [
      { value: 'wallS', label: S('edWallS'), color: '#8a8a9a' }, { value: 'wallH', label: S('edWallH'), color: '#8a8a9a' }, { value: 'wallV', label: S('edWallV'), color: '#8a8a9a' },
      { value: 'teleporter', label: S('edTeleporter'), color: '#7fd8ff' }, { value: 'trampoline', label: S('edTrampoline'), color: '#ffd23d' },
    ];
    const tools = isP
      ? common.concat([{ value: 'spike', label: S('edSpike'), color: '#ff6a6a' }, { value: 'laserV', label: S('edLaserV'), color: '#ff3d5a' }, { value: 'laserH', label: S('edLaserH'), color: '#ff3d5a' },
        { value: 'shooter', label: S('edShooter'), color: '#ff9d3d' }, { value: 'boost', label: S('edBoost'), color: '#ffd23d' }])
      : ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'].map((t) => ({ value: t, label: t, title: turretInfo(t).name, color: TURRET_COLOR[t] }))
        .concat(['B1', 'B2', 'B3', 'B4', 'B5', 'B6'].map((t) => ({ value: t, label: t, title: BOSS_DEFS[t].name, color: BOSS_DEFS[t].color })))
        .concat(common);
    group('edTools', tools.concat(zoneTools).concat([{ value: 'erase', label: S('edErase'), color: '#9aa0b4' }]), (v) => this.tool === v, (v) => { this.tool = v; this.pendingTp = null; }, 'ed-tools');
    if (['trampoline', 'shooter', 'z:wind'].includes(this.tool)) {
      group('edDirection', [['N', '↑'], ['S', '↓'], ['W', '←'], ['E', '→']].map(([v, l]) => ({ value: v, label: l })), (v) => this.dir === v, (v) => { this.dir = v; });
    }
    bar.appendChild(UI.el('div', 'ed-counts', ''));
    bar.appendChild(UI.el('div', 'ed-hint', S('edHint')));
    bar.appendChild(UI.el('div', 'ed-msg', this.msg || ''));
    const row = UI.el('div', 'ed-row2');
    const undo = UI.el('div', 'ed-btn', S('edUndo'));
    undo.onclick = () => this.undo();
    const clear = UI.el('div', 'ed-btn', S('edClear'));
    clear.onclick = () => this.clearAll();
    row.appendChild(undo); row.appendChild(clear);
    bar.appendChild(row);
    const actions = UI.el('div', 'ed-actions');
    const save = UI.el('div', 'ed-btn primary', S('customSave'));
    save.onclick = () => this.save(false);
    const play = UI.el('div', 'ed-btn primary', S('customSavePlay'));
    play.onclick = () => this.save(true);
    actions.appendChild(save); actions.appendChild(play);
    bar.appendChild(actions);
    UI.overlay.appendChild(bar);
    this.renderCounts();
  },

  refreshToolbar() {
    const old = document.querySelector('.ed-bar');
    const scroll = old ? old.scrollTop : 0;
    if (old) old.remove();
    this.renderToolbar();
    const bar = document.querySelector('.ed-bar');
    if (bar) bar.scrollTop = scroll;
  },

  renderCounts() {
    const el = document.querySelector('.ed-counts');
    if (!el) return;
    const d = this.draft;
    if (this.mode === 'combat') {
      const pl = d.placed;
      el.textContent = `${S('customEnemies')} : ${pl.enemies.length}/${EDITOR_MAX_ENEMIES}${pl.boss ? ' + ' + BOSS_DEFS[pl.boss.type].name : ''} · ${S('edWalls')} : ${pl.obstacles.length} · ${S('edZones')} : ${pl.zones.length}`;
    } else el.textContent = `${S('edAdded')} : ${d.items.length}/${EDITOR_MAX_ITEMS}`;
  },

  // Apercu de l'outil sous le curseur, depart, teleporteur en attente.
  renderOverlay(ctx, camera, world) {
    const p = world.player;
    if (!p) return;
    const x = p.aim.x - camera.x, y = p.aim.y - camera.y;
    const t = this.tool, now = performance.now() / 1000;
    const ang = ED_DIRS[this.dir];
    ctx.save();
    if (this.mode === 'combat' && this.spawn) {
      ctx.strokeStyle = 'rgba(127,216,255,0.35)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(this.spawn.x - camera.x, this.spawn.y - camera.y, 110, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    if (this.pendingTp) {
      drawTeleporterPad(ctx, this.pendingTp.x - camera.x, this.pendingTp.y - camera.y, now, true);
      ctx.strokeStyle = 'rgba(127,216,255,0.5)'; ctx.setLineDash([5, 6]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(this.pendingTp.x - camera.x, this.pendingTp.y - camera.y); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.globalAlpha = 0.55;
    if (t === 'erase') {
      ctx.strokeStyle = '#ff5d5d'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.moveTo(x - 10, y - 10); ctx.lineTo(x + 10, y + 10); ctx.moveTo(x + 10, y - 10); ctx.lineTo(x - 10, y + 10); ctx.stroke();
    } else if (ED_WALLS[t]) {
      const s = ED_WALLS[t];
      ctx.fillStyle = '#8a8a9a'; ctx.fillRect(x - s.w / 2, y - s.h / 2, s.w, s.h);
    } else if (/^T\d+$/.test(t)) {
      scDrawTurretBody(ctx, { type: t, aimAngle: Math.PI }, x, y, 1);
    } else if (/^B\d$/.test(t)) {
      ctx.translate(x, y); ctx.scale(0.8, 0.8);
      try { (BOSS_BODY[t] || drawBossBody6)(ctx, { type: t, radius: BOSS_DEFS[t].radius || 34, color: BOSS_DEFS[t].color, charging: false, state: {} }); } catch (e) { /* apercu */ }
    } else if (t.startsWith('z:')) {
      drawTerrainZone(ctx, x, y, { x: 0, y: 0, radius: 60, terrainType: t.slice(2), windAngle: ang });
    } else if (t === 'spike') {
      drawSpikePad(ctx, x - 30, y - 30, { w: 60, h: 60 }, 'out', 0);
    } else if (t === 'laserV' || t === 'laserH') {
      ctx.strokeStyle = '#ff3d5a'; ctx.lineWidth = 4;
      ctx.beginPath();
      if (t === 'laserV') { ctx.moveTo(x, y - 90); ctx.lineTo(x, y + 90); } else { ctx.moveTo(x - 90, y); ctx.lineTo(x + 90, y); }
      ctx.stroke();
    } else if (t === 'shooter') {
      drawShooterTrap(ctx, x, y, ang, true);
    } else if (t === 'boost') {
      drawBoostPickup(ctx, x, y, now, 0);
    } else if (t === 'trampoline') {
      drawTrampoline(ctx, { x: p.aim.x, y: p.aim.y, lx: p.aim.x + Math.cos(ang) * 220, ly: p.aim.y + Math.sin(ang) * 220, bounce: 0 }, camera, now);
    } else if (t === 'teleporter') {
      drawTeleporterPad(ctx, x, y, now, !this.pendingTp);
    }
    ctx.restore();
  },
};

function editorZone(z) {
  return makeZone({
    x: z.x, y: z.y, radius: z.r || 60, duration: 9999, persistent: true, tickInterval: 999,
    color: terrainColor(z.type), edgeColor: terrainEdgeColor(z.type), terrainType: z.type, windAngle: z.windAngle || 0, id: uid(),
  });
}

// Elements places a la main dans un parcours personnalise (editeur), ajoutes au trace.
function applyParkourExtras(L, items) {
  if (!items) return;
  items.forEach((e, i) => {
    if (e.kind === 'wall') { const w = e.w || 44, h = e.h || 44; L.obstacles.push({ x: e.x - w / 2, y: e.y - h / 2, w, h }); }
    else if (e.kind === 'spike') L.spikes.push({ x: e.x - 30, y: e.y - 30, w: 60, h: 60, period: 2.2, out: 0.9, warn: 0.45, offset: (i * 0.37) % 2.2 });
    else if (e.kind === 'boost') L.boosts.push({ x: e.x, y: e.y });
    else if (e.kind === 'trampoline') L.trampolines.push({ x: e.x, y: e.y, lx: e.lx != null ? e.lx : e.x + 220, ly: e.ly != null ? e.ly : e.y });
    else if (e.kind === 'teleporter') L.teleporters.push({ ax: e.ax, ay: e.ay, bx: e.bx, by: e.by });
    else if (e.kind === 'zone') L.zones.push({ type: e.type, x: e.x, y: e.y, radius: e.r || 60, windAngle: e.windAngle || 0 });
    else if (e.kind === 'laser') {
      const h = e.orient === 'h';
      L.lasers.push({ ax: h ? e.x - 90 : e.x, ay: h ? e.y : e.y - 90, bx: h ? e.x + 90 : e.x, by: h ? e.y : e.y + 90, period: 2.6, on: 0.8, warn: 0.55, offset: (i * 0.5) % 2.6 });
    } else if (e.kind === 'shooter') {
      L.shooters.push({ x: e.x, y: e.y, angle: e.angle != null ? e.angle : Math.PI / 2, period: 1.8, offset: (i * 0.3) % 1.8, burst: 2, speed: 240, fired: [] });
    }
  });
}
