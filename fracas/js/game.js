// Boucle de jeu, machine a etats, camera

const Game = {
  canvas: null, ctx: null,
  state: STATE.MENU,
  world: null,
  lastTs: 0,
  testRoomTargets: [],
  pendingCharSelectMode: null, // 'test' | 'infinite'
  paused: false,

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    Input.init(canvas);
    Save.load();
    Audio2.init();
    Music.init();
    Controls.init();
    this.world = this.freshWorld();
    // Au lancement : le menu principal (3 parties). Premier lancement : le tutoriel d'abord.
    if (!Save.data.tutorialDone) Tutorial.start(STATE.INFINITE_MENU); else this.setState(STATE.INFINITE_MENU);
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
    const k = Save.data && Save.data.access ? Save.data.access.shake / 100 : 1; // accessibilite : tremblements reglables (0 = aucun)
    if (k <= 0) return;
    mag *= k;
    this.world.camera.shakeMag = Math.max(this.world.camera.shakeMag, mag);
    this.world.camera.shakeTime = Math.max(this.world.camera.shakeTime, dur);
  },

  setState(s) {
    this.state = s;
    if (s === STATE.MENU) this.enterHub();
    UI.onStateChange(s);
  },

  // La BASE : salle fixe ou l'on arrive apres les 3 parties d'une partie ; on y marche vers des
  // portails (repartir, defi du jour, en ligne, Codex, parametres).
  enterHub() {
    Boons.bind(null);
    const world = this.world;
    const hub = buildHubRoom();
    world.room = {
      bounds: hub.bounds, obstacles: hub.obstacles, terrainZones: [], part: 0, index: 0, isBoss: false,
      // trampolines et boosts achetes au marche (meme logique que dans les parcours)
      props: makeRoomProps({ trampolines: hub.trampolines, boosts: hub.boosts }),
    };
    world.hubDoors = hub.doors;
    world.hubTeleporters = hub.teleporters;
    world.hubWinds = hub.winds;
    world._teleportArmed = true;
    world.enemies = []; world.projectiles = []; world.zones = []; world.walls = [];
    world.shields = []; world.mines = []; world.winds = []; world.meteors = []; world.hazards = [];
    world.abilityGate = null;
    world.decorations = [];
    world.theme = null;
    // La camera ne suit le joueur que sur les grandes cartes (plus de 150 cases).
    if (hubLayout().cells.length > 150) setWorldZoom(world, 13 * HUB_CELL, 9 * HUB_CELL, 0);
    else setWorldZoom(world, hub.bounds.w + 70, hub.bounds.h + 110, 0); // marge : plaques des portes et bord de l'ile visibles
    world.noFollow = false;
    world.userSpeedMult = 1;
    world.player = createPlayer(HUB_CHARACTER, hub.spawn.x, hub.spawn.y);
    this.updateCamera(1);
  },

  // Retour a l'accueil : la base si on y est (partie en cours a la base), sinon le menu principal.
  goToMenu() {
    this.paused = false; UI.hidePause();
    this.setState(Infinite.atBase && Infinite.run ? STATE.MENU : STATE.INFINITE_MENU);
  },
  // Base -> on repart pour les 3 parties suivantes de la meme partie.
  resumeFromBase() {
    if (!Infinite.run) { this.setState(STATE.INFINITE_MENU); return; }
    Infinite.run.atBase = false;
    Infinite.atBase = false;
    Save.persist();
    this.startInfinite(Infinite.slot);
  },
  // Base -> menu principal (la partie reste sauvegardee a la base).
  leaveBase() {
    Infinite.atBase = false;
    this.setState(STATE.INFINITE_MENU);
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
    Boons.bind(null);
    Save.setSelectedCharacter(characterId);
    this.paused = false; UI.hidePause();
    const world = this.world;
    const w = 820, h = 520;
    const bounds = { x: -w / 2, y: -h / 2, w, h };
    const obW = Math.min(120, bounds.w * 0.08);
    world.room = { bounds, obstacles: [{ x: -obW / 2, y: bounds.y + bounds.h * 0.2, w: obW, h: 36 }], terrainZones: [], part: 0, index: 0, isBoss: false };
    world.enemies = []; world.projectiles = []; world.zones = []; world.walls = [];
    world.shields = []; world.mines = []; world.winds = []; world.meteors = []; world.hazards = [];
    world.abilityGate = null;
    world.hubDoors = null;
    // Aucun argent ne doit jamais etre gagne dans la salle de test (pas de callback de recompense).
    world.onEnemyKilled = null;
    world.decorations = [];
    world.theme = null;
    setWorldZoom(world, w, h);
    world.userSpeedMult = 1; // salle de test : rythme fixe, non affecte par le multiplicateur de vitesse
    world.noFollow = false;
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

  // Fracas Infini : reprend la partie de l'emplacement `slot`, ou en cree une nouvelle avec
  // `newCharacterId` (chaque emplacement a sa progression independante).
  startInfinite(slot, newCharacterId) {
    const inf = infData();
    if (newCharacterId != null) { inf.slots[slot] = infNewRun(newCharacterId); Save.persist(); }
    const run = inf.slots[slot];
    if (!run) return;
    this.paused = false; UI.hidePause();
    if (this.world.online) this.world = this.freshWorld();
    const world = this.world;
    world.hubDoors = null;
    if (run.atBase) { Infinite.slot = slot; Infinite.run = run; Infinite.atBase = true; this.setState(STATE.MENU); return; } // partie arretee a la base
    this.spawnPlayerFor(run.characterId, 0, 0);
    Save.markCharPlayed(run.characterId);
    Infinite.start(world, slot);
    this.setState(STATE.INFINITE);
    Assist.briefing(run.characterId, Infinite.partOf(Infinite.depth));
  },

  // Defi du jour : nouvelle tentative (autant qu'on veut).
  startDaily() {
    const cfg = Daily.config();
    if (Infinite.active) Infinite.leave(this.world);
    this.paused = false; UI.hidePause();
    if (this.world.online) this.world = this.freshWorld();
    const world = this.world;
    world.hubDoors = null;
    this.spawnPlayerFor(cfg.chars[0], 0, 0);
    Save.markCharPlayed(cfg.chars[0]);
    Infinite.startDaily(world, cfg);
    this.setState(STATE.INFINITE);
    Assist.briefing(cfg.chars[0], Infinite.partOf(1));
  },
  leaveDaily() {
    Infinite.leave(this.world);
    this.paused = false; UI.hidePause();
    this.setState(STATE.DAILY);
  },

  leaveInfinite() {
    if (Infinite.daily) { this.leaveDaily(); return; }
    Infinite.leave(this.world);
    this.paused = false; UI.hidePause();
    this.setState(STATE.INFINITE_MENU);
  },

  restartCurrent() {
    if (this.state === STATE.TEST_ROOM) { this.startTestRoom(this.world.player.character.id); }
  },

  loop(ts) {
    const realDt = Math.min(0.05, this.lastTs ? (ts - this.lastTs) / 1000 : 0);
    this.lastTs = ts;

    Controls.update(realDt);
    if (this.isGameplayState()) this.update(realDt);
    this.updateMusic();
    this.render(ts);

    Input.endFrame();
    Controls.endFrame();
    requestAnimationFrame((t) => this.loop(t));
  },

  // Morceau selon l'ecran (2 variantes par partie du Monde, boss differents, profondeurs de
  // l'Infini), intensite (combat), pression (peu de % ou boss) et etouffement en pause.
  updateMusic() {
    const s = this.state, w = this.world;
    let track = 'menu';
    if (s === STATE.INFINITE) {
      const cyc = Math.floor((Infinite.depth - 1) / 30);
      track = w.room && w.room.isBoss ? (Infinite.isFinalBoss() ? 'final' : (Infinite.partOf(Infinite.depth) === 2 ? 'boss2' : 'boss')) : 'part' + Infinite.partOf(Infinite.depth) + (cyc % 2 ? 'b' : '');
    } else if (s === STATE.ONLINE_GAME) track = 'arena';
    else if (s === STATE.ONLINE_MENU || s === STATE.ONLINE_LOBBY || s === STATE.BESTIARY) track = 'menu2';
    else if (s === STATE.TEST_ROOM) track = 'part1b';
    else if (s === STATE.TUTORIAL) track = 'tutorial';
    Music.setTrack(track);
    const play = this.isGameplayState() && s !== STATE.MENU;
    const fighting = play && w && w.enemies && w.enemies.some((e) => !e.dead);
    Music.setIntensity(fighting ? 1 : (play ? 0.4 : 0.3));
    // pression : joueur en danger (peu de % de degats ou de vitesse) ou boss en vie
    let pressure = 0;
    const p = w && w.player;
    if (fighting && p) {
      const pct = p.speedMode ? p.speedPct : p.damageMultiplier;
      pressure = clamp((0.45 - pct) / 0.35, 0, 1);
      if (w.enemies.some((e) => !e.dead && e.kind === 'boss')) pressure = Math.max(pressure, 0.45);
    }
    Music.setPressure(pressure);
    Music.setMuffled(!!(this.paused || (s === STATE.INFINITE && Infinite.shopOpen) || (typeof Boons !== 'undefined' && Boons.choosing) || Assist.open));
  },

  isGameplayState() {
    return this.state === STATE.MENU || this.state === STATE.TEST_ROOM || this.state === STATE.ONLINE_GAME || this.state === STATE.INFINITE || this.state === STATE.TUTORIAL;
  },

  update(realDt) {
    const world = this.world;
    // Partie en ligne : le serveur simule, le client envoie ses entrees et affiche.
    if (this.state === STATE.ONLINE_GAME) {
      if (Input.wasPressed(Keybinds.pause)) OnlineUI.toggleLeaveMenu();
      OnlineGame.update(realDt);
      UI.updateHUD(this);
      OnlineUI.updateGameOverlay();
      return;
    }
    if (!world.player) return;

    if (this.state === STATE.TUTORIAL && Input.wasPressed(Keybinds.pause)) { Tutorial.skip(); return; }
    if (this.state === STATE.INFINITE && Infinite.transitionPhase === 'done') { // defi du jour termine : R = rejouer, Echap = menu
      if (Input.wasPressed(Keybinds.restart)) { this.startDaily(); return; }
      if (Input.wasPressed(Keybinds.pause)) { this.leaveDaily(); return; }
    }
    if (UI.subMenu && Input.wasPressed(Keybinds.pause)) { UI.closeSub(); return; } // Echap : retour au menu pause
    if (Assist.open && Input.wasPressed(Keybinds.pause)) { Assist.close(); return; } // Echap : fiche du perso fermee
    if (this.state !== STATE.MENU && Input.wasPressed(Keybinds.pause)) {
      if (this.state === STATE.INFINITE && (Infinite.shopOpen || Boons.choosing)) return; // fin de boss : on choisit d'abord
      if (this.state === STATE.INFINITE) { this.togglePause(); return; }
      this.goToMenu(); return;
    }
    if (this.paused) return;
    if (Input.wasPressed(Keybinds.restart) || Controls.restartPressed()) { this.restartCurrent(); return; }

    let frozen = false;
    if (this.state === STATE.INFINITE && (Infinite.transitionTimer > 0 || Infinite.shopOpen || Infinite.transitionPhase === 'done')) frozen = true;
    if (Boons.choosing || Assist.open) frozen = true;

    const simDt = realDt * GLOBAL_SPEED_MULT * (world.userSpeedMult || 1) * (1 + (world.simSpeedBonus || 0));

    if (!frozen) {
      // Solo : les intentions viennent du clavier/souris locaux ; la simulation est partagee
      // avec le serveur multijoueur (js/sim.js).
      world.player.input = sampleLocalInput(world);
      stepWorld(world, simDt, realDt);
      if (world.mods) updateBoonEffects(world, simDt); // bonus/malus qui changent la facon de jouer
      if (this.state === STATE.MENU) updateHub(world, simDt);
    }
    Particles.update(realDt);

    // Codex : tout ennemi/boss croise en vraie partie devient decouvert.
    if (this.state === STATE.INFINITE) {
      if (!Assist.open) for (const e of world.enemies) if (!e.dead && e.type) { if (!Save.isEnemyKnown(e.type)) Assist.newEnemy(e.type); Save.markEnemySeen(e.type); } // apres la fiche du perso
    }
    if (this.state === STATE.INFINITE && !Assist.open) Infinite.update(world, realDt);
    if (this.state === STATE.TUTORIAL) { Tutorial.update(world, realDt); Tutorial.refreshDevice(); }

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
    let tx = world.player.x - viewW / 2 + (world.camShiftX || 0);
    let ty = world.player.y - viewH / 2;
    // La camera ne suit le joueur que sur les cartes de plus de 150 cases, et jamais dans le Monde :
    // sinon la carte entiere est cadree et fixe.
    const cells = world.hubDoors ? hubLayout().cells.length : (b.w * b.h) / (HUB_CELL * HUB_CELL);
    const shift = world.camShiftX || 0;
    if (world.noFollow || cells <= 150) {
      tx = b.x + b.w / 2 - viewW / 2 + shift;
      ty = b.y + (b.h + (world.islandPad || 0)) / 2 - viewH / 2; // la falaise sous l'ile reste visible
    } else {
      // grande carte : on suit le joueur sans sortir de la carte (la barre de l'editeur ne cache
      // jamais le bord gauche)
      if (b.w > viewW) tx = clamp(tx, b.x + 2 * Math.min(0, shift), b.x + b.w - viewW); else tx = b.x + b.w / 2 - viewW / 2 + shift;
      if (b.h > viewH) ty = clamp(ty, b.y, b.y + b.h - viewH); else ty = b.y + b.h / 2 - viewH / 2;
    }
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
    // Zoom nul/invalide (fenetre de taille 0 au moment du chargement) : recalcule des que possible.
    if (!(this.world.zoom > 0) && this.world.zoomBox && CANVAS_W > 0) this.world.zoom = computeZoom(this.world.zoomBox.w, this.world.zoomBox.h);
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
    if (this.isGameplayState() && this.world.player) renderBossBars(ctx, this.world);
    const fader = this.state === STATE.INFINITE ? Infinite : null;
    if (fader && fader.transitionPhase) {
      const d = fader.transitionDuration;
      const t = clamp(fader.transitionTimer / d, 0, 1);
      const alpha = fader.transitionPhase === 'out' ? (1 - t) : t;
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
