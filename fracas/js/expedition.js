// Deroulement d'une expedition : 3 parties x 10 salles (10/20/30 = boss)
// Le changement de salle se fait via un fondu (noir) : la salle suivante est chargee
// pendant que l'ecran est noir, invisible pour le joueur (pas de "pop" instantane).

const Expedition = {
  active: false,
  characterId: null,
  part: 1,
  roomIndex: 1,
  elapsedMs: 0,
  transitionTimer: 0,
  transitionPhase: null, // null | 'out' | 'in'
  transitionDuration: 0.32,
  finished: false,
  finalTimeMs: null,
  newRecord: false,

  start(world, characterId) {
    this.active = true;
    this.characterId = characterId;
    this.part = 1;
    this.roomIndex = 1;
    this.elapsedMs = 0;
    this.transitionTimer = 0;
    this.transitionPhase = null;
    this.finished = false;
    this.finalTimeMs = null;
    this.newRecord = false;
    this.loadCurrentRoom(world);
  },

  restart(world) { this.start(world, this.characterId); },

  loadCurrentRoom(world) {
    const layout = generateRoomLayout(this.part, this.roomIndex);
    const room = instantiateRoom(world, layout);
    world.player.x = layout.spawnPoint.x;
    world.player.y = layout.spawnPoint.y;
    Game.updateCamera(1);
    // Tuer un boss rapporte de l'argent (utilisable dans le marche du hub), selon la partie.
    world.onEnemyKilled = (enemy) => {
      if (enemy.kind === 'boss') {
        const reward = BOSS_REWARD_BY_PART[this.part] || 0;
        if (reward) Save.addMoneyForChar(this.characterId, reward);
      }
    };
    world.abilityGate = this.part;
  },

  update(world, realDt) {
    if (!this.active || this.finished) return;
    this.elapsedMs += realDt * 1000;

    if (this.transitionPhase === 'out') {
      this.transitionTimer -= realDt;
      if (this.transitionTimer <= 0) {
        this._completeAdvance(world);
      }
      return;
    }
    if (this.transitionPhase === 'in') {
      this.transitionTimer -= realDt;
      if (this.transitionTimer <= 0) {
        this.transitionTimer = 0;
        this.transitionPhase = null;
      }
      return;
    }

    const allDead = world.enemies.length > 0 && world.enemies.every((e) => e.dead);
    if (allDead) {
      this.advance(world);
    }
  },

  // Lance le fondu de sortie ; le vrai changement de salle se fait dans _completeAdvance
  // une fois l'ecran completement noir (voir update()).
  advance(world) {
    if (world.player) {
      const isBoss = world.room && world.room.isBoss;
      playerHeal(world.player, isBoss ? 20 : 6);
    }
    this.transitionPhase = 'out';
    this.transitionTimer = this.transitionDuration;
  },

  _completeAdvance(world) {
    if (this.roomIndex >= ROOMS_PER_PART) {
      if (this.part >= 3) {
        this.finish(world);
        this.transitionPhase = null;
        this.transitionTimer = 0;
        return;
      }
      this.part += 1;
      this.roomIndex = 1;
    } else {
      this.roomIndex += 1;
    }
    this.loadCurrentRoom(world);
    this.transitionPhase = 'in';
    this.transitionTimer = this.transitionDuration;
  },

  finish(world) {
    this.finished = true;
    this.finalTimeMs = this.elapsedMs;
    this.newRecord = Save.submitExpeditionRecord(this.characterId, this.elapsedMs);
    if (this.newRecord) Audio2.record();
  },

  progressLabel() { return `${this.part}/3`; },
  roomLabel() { return `${this.roomIndex}/10`; },
};
