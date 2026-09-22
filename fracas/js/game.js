// Boucle de jeu, machine a etats, camera

const Game = {
  canvas: null, ctx: null,
  state: STATE.MENU,
  world: null,
  lastTs: 0,
  testRoomTargets: [],
  pendingCharSelectMode: null, // 'test' | 'expedition'
  paused: false,

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    Input.init(canvas);
    Save.load();
    Audio2.init();
    this.world = this.freshWorld();
    this.setState(STATE.MENU);
    requestAnimationFrame((ts) => this.loop(ts));
  },

  freshWorld() {
    return {
      player: null, camera: { x: 0, y: 0, shakeTime: 0, shakeMag: 0 },
      room: null, enemies: [], projectiles: [], zones: [], walls: [], shields: [],
      mines: [], winds: [], meteors: [], simSpeedBonus: 0, userSpeedMult: 1, onEnemyKilled: null, abilityGate: null,
    };
  },

  // Multiplicateur de vitesse globale choisi dans les parametres, applique au debut de chaque partie.
  applyUserSpeedMult() {
    this.world.userSpeedMult = (Save.data.speedMult || SPEED_MULT_DEFAULT) / 100;
  },

  shakeCamera(mag, dur) {
    this.world.camera.shakeMag = Math.max(this.world.camera.shakeMag, mag);
    this.world.camera.shakeTime = Math.max(this.world.camera.shakeTime, dur);
  },

  setState(s) {
    this.state = s;
    if (s === STATE.MENU) this.enterHub();
    UI.onStateChange(s);
  },

  // Le "menu principal" est une salle a cases amenageable (marche) : on y marche vers des portes
  // (ou des blocs decoratifs achetes) pour naviguer/interagir.
  enterHub() {
    const world = this.world;
    const hub = buildHubRoom();
    world.room = { bounds: hub.bounds, obstacles: hub.obstacles, terrainZones: [], part: 0, index: 0, isBoss: false };
    world.hubDoors = hub.doors;
    world.hubTeleporters = hub.teleporters;
    world.hubWinds = hub.winds;
    world._teleportGrace = 0;
    world.enemies = []; world.projectiles = []; world.zones = []; world.walls = [];
    world.shields = []; world.mines = []; world.winds = []; world.meteors = [];
    world.abilityGate = null;
    world.decorations = [];
    world.theme = null;
    world.zoom = computeZoom(hub.bounds.w, hub.bounds.h);
    world.userSpeedMult = 1;
    world.player = createPlayer(HUB_CHARACTER, hub.spawn.x, hub.spawn.y);
    this.updateCamera(1);
  },

  goToMenu() {
    Expedition.active = false;
    Challenges.active = false;
    this.paused = false;
    this.setState(STATE.MENU);
  },

  togglePause() {
    this.paused = !this.paused;
    if (this.paused) UI.showPause(); else UI.hidePause();
  },

  spawnPlayerFor(characterId, x, y) {
    const character = getCharacter(characterId);
    const player = createPlayer(character, x, y);
    if (character.init) character.init(player);
    this.world.player = player;
    return player;
  },

  startTestRoom(characterId) {
    Save.setSelectedCharacter(characterId);
    this.paused = false; UI.hidePause();
    const world = this.world;
    const w = 820, h = 520;
    const bounds = { x: -w / 2, y: -h / 2, w, h };
    const obW = Math.min(120, bounds.w * 0.08);
    world.room = { bounds, obstacles: [{ x: -obW / 2, y: bounds.y + bounds.h * 0.2, w: obW, h: 36 }], terrainZones: [], part: 0, index: 0, isBoss: false };
    world.enemies = []; world.projectiles = []; world.zones = []; world.walls = [];
    world.shields = []; world.mines = []; world.winds = []; world.meteors = [];
    world.abilityGate = null;
    world.hubDoors = null;
    // Aucun argent ne doit jamais etre gagne dans la salle de test (pas de callback de recompense).
    world.onEnemyKilled = null;
    world.decorations = [];
    world.theme = null;
    world.zoom = computeZoom(w, h);
    world.userSpeedMult = 1; // salle de test : rythme fixe, non affecte par le multiplicateur de vitesse
    const dummyPositions = [
      [bounds.w * 0.22, -bounds.h * 0.2], [bounds.w * 0.35, 0],
      [bounds.w * 0.22, bounds.h * 0.2], [-bounds.w * 0.28, -bounds.h * 0.25],
    ];
    for (const [dx, dy] of dummyPositions) world.enemies.push(createTurret('DUMMY', dx, dy, { hp: 400, maxHp: 400 }));
    // Tourelle fixe : tire toujours et uniquement droit devant elle (jamais orientee vers le joueur)
    const straightTurret = createTurret('T1', -bounds.w * 0.28, bounds.h * 0.28);
    straightTurret.aimAngle = 0;
    straightTurret.fixedAim = true;
    straightTurret.respawnDelay = 2.2; // reapparait au meme endroit apres sa mort
    world.enemies.push(straightTurret);
    this.spawnPlayerFor(characterId, bounds.x + bounds.w * 0.12, 0);
    this.updateCamera(1);
    Expedition.active = false; Challenges.active = false;
    this.setState(STATE.TEST_ROOM);
  },

  // Invoque n'importe quelle tourelle (T1-T12) ou boss (B1-B6) a l'endroit vise, uniquement
  // depuis la salle de test (aucun argent n'y est jamais verse, cf. world.onEnemyKilled = null).
  spawnTestEnemy(type) {
    if (this.state !== STATE.TEST_ROOM) return;
    const world = this.world;
    if (!world.room || !world.player) return;
    const b = world.room.bounds;
    const margin = 40;
    const x = clamp(world.player.aim.x, b.x + margin, b.x + b.w - margin);
    const y = clamp(world.player.aim.y, b.y + margin, b.y + b.h - margin);
    if (type.charAt(0) === 'B') {
      world.enemies.push(createBoss(type, world.room, { x, y }));
    } else {
      world.enemies.push(createTurret(type, x, y));
    }
  },

  startExpedition(characterId) {
    Save.setSelectedCharacter(characterId);
    this.paused = false; UI.hidePause();
    const world = this.world;
    world.hubDoors = null;
    this.applyUserSpeedMult();
    this.spawnPlayerFor(characterId, 0, 0);
    Challenges.active = false;
    Expedition.start(world, characterId);
    this.setState(STATE.EXPEDITION);
  },

  startChallenge(challengeId) {
    const def = Challenges.get(challengeId);
    this.paused = false; UI.hidePause();
    const world = this.world;
    world.hubDoors = null;
    this.applyUserSpeedMult();
    this.spawnPlayerFor(def.characterId, 0, 0);
    Expedition.active = false;
    Challenges.start(world, challengeId);
    this.setState(STATE.CHALLENGE);
  },

  restartCurrent() {
    if (this.state === STATE.EXPEDITION) { Expedition.restart(this.world); this.spawnPlayerFor(Expedition.characterId, 0, 0); Expedition.start(this.world, Expedition.characterId); }
    else if (this.state === STATE.CHALLENGE) { const id = Challenges.id; this.spawnPlayerFor(Challenges.get(id).characterId, 0, 0); Challenges.start(this.world, id); }
    else if (this.state === STATE.TEST_ROOM) { this.startTestRoom(this.world.player.character.id); }
  },

  loop(ts) {
    const realDt = Math.min(0.05, this.lastTs ? (ts - this.lastTs) / 1000 : 0);
    this.lastTs = ts;

    if (this.isGameplayState()) this.update(realDt);
    this.render(ts);

    Input.endFrame();
    requestAnimationFrame((t) => this.loop(t));
  },

  isGameplayState() {
    return this.state === STATE.MENU || this.state === STATE.TEST_ROOM || this.state === STATE.EXPEDITION || this.state === STATE.CHALLENGE;
  },

  update(realDt) {
    const world = this.world;
    if (!world.player) return;

    if (this.state !== STATE.MENU && Input.wasPressed(Keybinds.pause)) {
      if (this.state === STATE.EXPEDITION || this.state === STATE.CHALLENGE) { this.togglePause(); return; }
      this.goToMenu(); return;
    }
    if (this.paused) return;
    if (Input.wasPressed(Keybinds.restart)) { this.restartCurrent(); return; }

    let frozen = false;
    if (this.state === STATE.EXPEDITION && (Expedition.finished || Expedition.transitionTimer > 0)) frozen = true;
    if (this.state === STATE.CHALLENGE && Challenges.finished) frozen = true;

    const simDt = realDt * GLOBAL_SPEED_MULT * (world.userSpeedMult || 1) * (1 + (world.simSpeedBonus || 0));

    if (!frozen) {
      updatePlayer(world, world.player, simDt, realDt);
      updateProjectiles(world, simDt);
      updateZones(world, simDt);
      updateWalls(world, simDt);
      updateShields(world, simDt);
      updateWinds(world, simDt);
      updateMeteors(world, simDt);
      updateFrozenTimers(world, simDt);
      for (const e of world.enemies) {
        if (e.kind === 'turret') updateTurret(world, e, simDt);
        else if (e.kind === 'boss') updateBoss(world, e, simDt);
      }
      resolveCollisions(world, simDt, realDt);
      if (this.state === STATE.MENU) updateHub(world, simDt);
    }
    Particles.update(realDt);

    if (this.state === STATE.EXPEDITION) Expedition.update(world, realDt);
    if (this.state === STATE.CHALLENGE) Challenges.update(world, realDt);

    this.updateCamera(realDt);
    UI.updateHUD(this);
  },

  updateCamera(realDt) {
    const world = this.world;
    const cam = world.camera;
    if (!world.room || !world.player) return;
    const b = world.room.bounds;
    const zoom = world.zoom || 1;
    const viewW = CANVAS_W / zoom, viewH = CANVAS_H / zoom;
    let tx = world.player.x - viewW / 2;
    let ty = world.player.y - viewH / 2;
    if (b.w > viewW) tx = clamp(tx, b.x, b.x + b.w - viewW); else tx = b.x + b.w / 2 - viewW / 2;
    if (b.h > viewH) ty = clamp(ty, b.y, b.y + b.h - viewH); else ty = b.y + b.h / 2 - viewH / 2;
    cam.x = lerp(cam.x, tx, clamp(realDt * 8, 0, 1));
    cam.y = lerp(cam.y, ty, clamp(realDt * 8, 0, 1));
    if (cam.shakeTime > 0) {
      cam.shakeTime -= realDt;
      cam.renderOffsetX = randRange(-cam.shakeMag, cam.shakeMag);
      cam.renderOffsetY = randRange(-cam.shakeMag, cam.shakeMag);
    } else { cam.renderOffsetX = 0; cam.renderOffsetY = 0; cam.shakeMag = 0; }
  },

  render(ts) {
    const ctx = this.ctx;
    ctx.save();
    if (this.world.camera.renderOffsetX) ctx.translate(this.world.camera.renderOffsetX, this.world.camera.renderOffsetY);
    if (this.isGameplayState() && this.world.player) {
      const zoom = this.world.zoom || 1;
      ctx.scale(zoom, zoom);
      renderWorld(ctx, this.world);
    } else {
      renderMenuBackdrop(ctx, ts || performance.now());
    }
    ctx.restore();

    // Fondu noir de transition entre les salles d'une expedition : dessine par-dessus
    // tout le reste (hors zoom/tremblement de camera) pour masquer le changement de salle.
    if (this.state === STATE.EXPEDITION && Expedition.transitionPhase) {
      const d = Expedition.transitionDuration;
      const t = clamp(Expedition.transitionTimer / d, 0, 1);
      const alpha = Expedition.transitionPhase === 'out' ? (1 - t) : t;
      if (alpha > 0.001) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.restore();
      }
    }
  },
};
