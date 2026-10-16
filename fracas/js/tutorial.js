// Tutoriel : prend le temps d'expliquer TOUT ce qu'il faut savoir, mais reste clair et passable a
// tout moment (bouton "Passer", Echap ou Start).
// Propose automatiquement au premier lancement, rejouable depuis l'ecran de choix de version.
//   Partie jouable (8 etapes) : se deplacer -> viser/attaquer -> competence -> pas de points de vie
//   (le %) -> zones au sol -> trampoline -> murs mobiles -> porte de sortie.
//   Puis des cartes a icones (bouton Suivant) : Monde et boss (argent), bonus/malus entre les
//   parties, defis et defi du jour, base et marche, Codex, Fracas Infini, jeu en ligne.
// Les consignes s'adaptent au peripherique : clavier/souris, manette ou ecran tactile.

const TUTO_CHAR = 3; // Retour : attaque visee simple (boomerang) et competence 1 bien visible

const TUTO_INFO_CARDS = [
  { icon: '🗺️', key: 'world' },
  { icon: '💰', key: 'money' },
  { icon: '⚖️', key: 'boons' },
  { icon: '🏠', key: 'base' },
  { icon: '📅', key: 'daily' },
  { icon: '📖', key: 'codex' },
  { icon: '🌐', key: 'online' },
];

const Tutorial = {
  active: false,
  step: 0,
  returnTo: STATE.INFINITE_MENU,
  marker: null,
  nextTimer: 0,
  waitTimer: 0,
  hitSeen: false,
  jumped: false,
  infoIndex: -1,
  _box: null,

  steps: ['move', 'attack', 'ability', 'damage', 'zones', 'trampoline', 'walls', 'door'],

  start(returnTo) {
    this.returnTo = returnTo || STATE.INFINITE_MENU;
    if (Game.world.online) Game.world = Game.freshWorld();
    Boons.bind(null);
    const world = Game.world;
    const w = 980, h = 580;
    const bounds = { x: -w / 2, y: -h / 2, w, h };
    const obstacles = [{ x: -40, y: -60, w: 56, h: 120, id: uid() }];
    world.room = { bounds, obstacles, terrainZones: [], part: 1, index: 0, isBoss: false, props: makeRoomProps() };
    world.enemies = []; world.projectiles = []; world.zones = []; world.walls = []; world.shields = [];
    world.mines = []; world.winds = []; world.meteors = []; world.hazards = [];
    world.hubDoors = null;
    world.theme = ROOM_THEMES[1];
    world.decorations = generateDecorations(bounds, obstacles, [{ x: bounds.x + 80, y: 0, r: 100 }, exitAvoidPoint(bounds)], 1, 16);
    setWorldZoom(world, w, h);
    world.noFollow = true;
    world.abilityGate = 1; // comme dans le Monde : la touche unique de competence
    world.userSpeedMult = 1;
    world.onEnemyKilled = null;
    world.onlineUnder = drawTutorialMarks;
    Game.paused = false; UI.hidePause();
    Game.spawnPlayerFor(TUTO_CHAR, bounds.x + 80, 0);
    ensureRoomExit(world.room);
    this.active = true;
    this.infoIndex = -1;
    this.step = -1;
    this.next(world);
    Game.updateCamera(1);
    Game.setState(STATE.TUTORIAL);
  },

  next(world) {
    this.step += 1;
    this.nextTimer = 0;
    this.waitTimer = 0;
    const key = this.steps[this.step];
    const b = world.room.bounds;
    this.marker = null;
    if (key === 'move') this.marker = { x: b.x + 260, y: b.y + 120, r: 34 };
    if (key === 'attack') {
      for (const [x, y] of [[170, -130], [170, 130]]) {
        const t = createTurret('DUMMY', x, y, { hp: 45, maxHp: 45 });
        t.noRespawn = true; // une fois detruite, la cible reste detruite
        world.enemies.push(t);
      }
    }
    if (key === 'damage') {
      const t = createTurret('T1', b.x + b.w - 190, 0);
      t.hp *= 0.7; t.maxHp = t.hp;
      world.enemies.push(t);
      this.hitSeen = false;
    }
    if (key === 'zones') {
      // couloir de zones : acceleration, glace, puis boue ; objectif au bout
      const y = b.y + b.h - 110;
      world.room.terrainZones.push(makeTerrainZone('accel', -250, y, 52, b, false));
      world.room.terrainZones.push(makeTerrainZone('ice', -80, y, 52, b, false));
      world.room.terrainZones.push(makeTerrainZone('mud', 90, y, 52, b, false));
      for (const z of world.room.terrainZones) if (z.id == null) z.id = uid();
      this.marker = { x: 240, y, r: 34 };
    }
    if (key === 'trampoline') {
      const p = world.player;
      const tx = clamp(p.x + 90, b.x + 60, b.x + b.w - 300), ty = clamp(p.y, b.y + 80, b.y + b.h - 80);
      world.room.props.trampolines.push({ x: tx, y: ty, lx: tx + 220, ly: ty });
      this.jumped = false;
    }
    if (key === 'walls') {
      const m = makeMover('line', 200, -40, 50, 50);
      const ob = { x: 0, y: 0, w: 50, h: 50, mover: m, id: uid() };
      placeMover(ob);
      world.room.obstacles.push(ob);
    }
    if (key === 'door') openRoomExit(world);
    if (this.step > 0) { Audio2.pickup(); const p = world.player; if (p) Particles.ring(p.x, p.y, 40, '#7fff9c', 0.4); }
    this.renderBox();
  },

  update(world, dt) {
    if (!this.active) return;
    const p = world.player;
    if (!p) return;
    if (this.infoIndex >= 0) return; // cartes d'explication : le jeu attend
    updateRoomExit(world, dt);
    if (p.jump) this.jumped = true;
    if (this.nextTimer > 0) { this.nextTimer -= dt; if (this.nextTimer <= 0) this.next(world); return; }
    const key = this.steps[this.step];
    let done = false;
    if (key === 'move' || key === 'zones') done = dist(p.x, p.y, this.marker.x, this.marker.y) < this.marker.r + p.radius;
    else if (key === 'attack') done = world.enemies.every((e) => e.dead);
    else if (key === 'ability') done = (p.cooldowns.a1 || 0) > 0;
    else if (key === 'damage') {
      if (!this.hitSeen && p.damageMultiplier < 0.999) { this.hitSeen = true; this.renderBox(); }
      done = world.enemies.every((e) => e.dead);
    } else if (key === 'trampoline') done = this.jumped && !p.jump;
    else if (key === 'walls') { this.waitTimer += dt; done = this.waitTimer > 4.5; }
    else if (key === 'door') {
      if (playerAtExit(world)) { Audio2.doorPass(); this.showInfo(0); return; }
    }
    if (done) this.nextTimer = 0.7;
    if (this._box) {
      this._box.classList.toggle('done', done || this.nextTimer > 0);
      this._box.classList.toggle('faded', this.boxCovers(world));
    }
  },

  // Les instructions ne doivent jamais gener : le bandeau s'efface presque quand le joueur,
  // un ennemi ou l'objectif passe dessous.
  boxCovers(world) {
    const canvas = document.querySelector('canvas');
    if (!canvas || !this._box) return false;
    const r = this._box.getBoundingClientRect(), c = canvas.getBoundingClientRect();
    const zoom = world.zoom || 1, cam = world.camera || { x: 0, y: 0 };
    const sx = c.width / (canvas.clientWidth || c.width || 1);
    const under = (x, y, rad) => {
      const px = c.left + (x - cam.x) * zoom * sx, py = c.top + (y - cam.y) * zoom * sx, pr = rad * zoom * sx + 24;
      return px > r.left - pr && px < r.right + pr && py > r.top - pr && py < r.bottom + pr;
    };
    const p = world.player;
    if (p && under(p.x, p.y, p.radius || 14)) return true;
    if (this.marker && under(this.marker.x, this.marker.y, this.marker.r)) return true;
    return world.enemies.some((e) => !e.dead && under(e.x, e.y, e.radius || 16));
  },

  // ---------------- cartes d'explication ----------------
  showInfo(i) {
    this.infoIndex = i;
    if (this._box) { this._box.remove(); this._box = null; }
    if (this._info) this._info.remove();
    if (i >= TUTO_INFO_CARDS.length) { this.finish(true); return; }
    const c = TUTO_INFO_CARDS[i];
    const panel = UI.el('div', 'panel tuto-info');
    const dots = UI.el('div', 'tuto-dots');
    TUTO_INFO_CARDS.forEach((_, k) => dots.appendChild(UI.el('i', k < i ? 'ok' : (k === i ? 'cur' : ''))));
    panel.appendChild(dots);
    panel.appendChild(UI.el('div', 'tuto-info-icon', c.icon));
    panel.appendChild(UI.el('h2', null, S(`tutoInfo_${c.key}_title`)));
    const ul = UI.el('div', 'tuto-info-lines');
    for (const line of S(`tutoInfo_${c.key}`).split('|')) ul.appendChild(UI.el('p', null, line));
    panel.appendChild(ul);
    const nav = UI.el('div', 'tuto-info-nav');
    if (i > 0) { const prev = UI.el('div', 'menu-btn menu-btn-small', `◀ ${S('tutoPrev')}`); prev.onclick = () => this.showInfo(i - 1); nav.appendChild(prev); }
    const next = UI.el('div', 'menu-btn menu-btn-small tuto-next', i === TUTO_INFO_CARDS.length - 1 ? `✔ ${S('tutoPlay')}` : `${S('tutoNext')} ▶`);
    next.onclick = () => this.showInfo(i + 1);
    nav.appendChild(next);
    panel.appendChild(nav);
    UI.overlay.appendChild(panel);
    this._info = panel;
    Audio2.uiClick();
  },

  finish(completed) {
    this.active = false;
    this.infoIndex = -1;
    if (this._info) { this._info.remove(); this._info = null; }
    Save.data.tutorialDone = true;
    Save.persist();
    if (completed) Music.jingle('victory');
    Game.world = Game.freshWorld();
    Game.setState(this.returnTo);
  },
  skip() { this.finish(false); },

  // Texte de l'etape selon le peripherique (clavier, manette, tactile).
  text(key) {
    const dev = Controls.device === 'gamepad' ? 'pad' : (Controls.device === 'touch' ? 'touch' : 'kb');
    let t = S(`tuto_${key}_${dev}`);
    if (t === `tuto_${key}_${dev}`) t = S(`tuto_${key}`);
    if (key === 'damage' && this.hitSeen) t = S('tuto_damage_hit');
    const def = Keybinds.up === 'KeyW' && Keybinds.left === 'KeyA' && Keybinds.down === 'KeyS' && Keybinds.right === 'KeyD';
    const move = def ? 'ZQSD / WASD' : [Keybinds.up, Keybinds.left, Keybinds.down, Keybinds.right].map(keyLabel).join(' ');
    return t.replace('{atk}', keyLabel(Keybinds.attack)).replace('{ab}', keyLabel(Keybinds.ability)).replace('{move}', move);
  },

  renderBox() {
    if (!UI.overlay || this.infoIndex >= 0) return;
    if (this._box) this._box.remove();
    const key = this.steps[this.step];
    const box = UI.el('div', 'tuto-box');
    const dots = UI.el('div', 'tuto-dots');
    this.steps.forEach((_, i) => dots.appendChild(UI.el('i', i < this.step ? 'ok' : (i === this.step ? 'cur' : ''))));
    box.appendChild(dots);
    box.appendChild(UI.el('h3', null, S(`tuto_${key}_title`)));
    box.appendChild(UI.el('p', null, this.text(key)));
    UI.overlay.appendChild(box);
    this._box = box;
    if (!this._skip || !this._skip.isConnected) {
      const skip = UI.el('div', 'menu-btn menu-btn-small tuto-skip', `⏭ ${S('tutoSkip')}`);
      skip.onclick = () => this.skip();
      UI.overlay.appendChild(skip);
      this._skip = skip;
    }
  },
  _lastDevice: null,
  refreshDevice() { if (this._lastDevice !== Controls.device) { this._lastDevice = Controls.device; if (this.active) this.renderBox(); } },
};

// Marque d'objectif : cercle lumineux au sol.
function drawTutorialMarks(ctx, camera) {
  const m = Tutorial.active && Tutorial.marker;
  if (!m || Game.state !== STATE.TUTORIAL) return;
  const x = m.x - camera.x, y = m.y - camera.y, t = performance.now() / 1000;
  ctx.save();
  const g = ctx.createRadialGradient(x, y, 4, x, y, m.r + 14);
  g.addColorStop(0, 'rgba(127,255,156,0.45)'); g.addColorStop(1, 'rgba(127,255,156,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, m.r + 14, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#7fff9c'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.lineDashOffset = -t * 30;
  ctx.beginPath(); ctx.arc(x, y, m.r + Math.sin(t * 4) * 3, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
