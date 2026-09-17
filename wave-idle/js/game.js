// Touches qu'on ne laisse jamais capturer (raccourcis navigateur/OS) — ni pour le Wave, ni pour une
// touche configurable comme "Rejouer".
function isExcludedInputKey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return true;
  if (e.key === 'Tab' || e.key === 'Escape' || e.key === 'F5' || e.key === 'F11' || e.key === 'F12') return true;
  return /^F\d{1,2}$/.test(e.key);
}

// Boucle de jeu : cycle de vie d'une tentative (run), physique à pas fixe, score, mort.
// La vitesse de déplacement est toujours la même : seule la difficulté choisie change (patterns +
// durs, or multiplié), jamais la vitesse du Wave.
const Game = (() => {
  let canvas, renderer, particles;
  let run = null;
  let rafId = null;
  let lastFrameTime = 0;

  const MONEY_PER_UNIT = 0.05;
  const PERFECT_BONUS = 15;
  const PHYSICS_DT = Math.min(1 / 240, (COL_WIDTH * 0.4) / BASE_SPEED_UNITS_S);

  function init() {
    canvas = document.getElementById('game-canvas');
    renderer = createRenderer(canvas);
    particles = createParticleSystem();
    window.addEventListener('resize', () => renderer.resize());
    renderer.resize();
    bindInput();
  }

  // Place le joueur à une position de départ cohérente avec le mode choisi (sol pour Cube/Robot,
  // surface fixe pour Araignée, centre du couloir pour les autres).
  function placePlayerForMode(player, mode) {
    player.mode = mode;
    if (mode === MODE_CUBE || mode === MODE_ROBOT) {
      player.y = GROUND_BASELINE_ROW * ROW_UNIT - COLLISION_MARGIN - (derived.reflexMargin || 0) - PLAYER_RADIUS;
      player.grounded = true;
    } else if (mode === MODE_SPIDER) {
      player.attachedTo = 'floor';
      player.y = GROUND_BASELINE_ROW * ROW_UNIT - COLLISION_MARGIN - PLAYER_RADIUS;
    } else {
      player.y = FIELD_HEIGHT / 2;
    }
  }

  function startRun() {
    const tiers = getAvailableDifficultyTiers();
    const tierIndex = Math.min(state.selectedDifficultyTier, tiers.length - 1);
    const difficultyMult = tiers[tierIndex];
    const startMode = ALL_PLAYABLE_MODES[Math.floor(Math.random() * ALL_PLAYABLE_MODES.length)];
    const player = createPlayer();
    placePlayerForMode(player, startMode);
    run = {
      levelGen: makeLevelGenerator(difficultyMult, startMode),
      player,
      camX: 0,
      alive: true,
      dying: false,
      dyingTimer: 0,
      accumulator: 0,
      difficultyTierIndex: tierIndex,
      difficultyMult,
      distanceUnits: 0,
      moneyEarned: 0,
      combo: 0,
      maxCombo: 0,
      coinsCollected: 0,
      lastCheckedColumn: -1,
      timeScale: 1,
      shake: 0,
      floatingTexts: [],
      lastModifierGateIndex: -1,
    };
    particles.list.length = 0;
    UI.showHud(true);
    UI.showScreen(null);
    Audio2.unlock();
    if (difficultyMult > 1) Audio2.speedUp();
    if (!rafId) {
      lastFrameTime = performance.now();
      rafId = requestAnimationFrame(loop);
    }
  }

  function endRun() {
    run.alive = false;
    run.dying = true;
    run.dyingTimer = 0;
    run.player.alive = false;
    run.shake = 16;
    spawnBurst(particles, run.player.x, run.player.y, 40, getCssVar('--danger'), 260);
    Audio2.collision();
    flashScreen(getCssVar('--danger'), 0.35);

    const distDisplay = Math.floor(run.distanceUnits / 24);
    state.money += run.moneyEarned;
    if (distDisplay > state.bestDistance) state.bestDistance = distDisplay;
    if (run.difficultyTierIndex > state.bestDifficultyIndexReached) state.bestDifficultyIndexReached = run.difficultyTierIndex;
    if (run.maxCombo > state.bestCombo) state.bestCombo = run.maxCombo;
    if (distDisplay > state.cycleBestDistance) state.cycleBestDistance = distDisplay;
    if (run.difficultyTierIndex > state.cycleBestDifficultyIndex) state.cycleBestDifficultyIndex = run.difficultyTierIndex;
    saveState();

    setTimeout(() => {
      UI.showHud(false);
      UI.populateDeathScreen({
        distance: distDisplay,
        best: state.bestDistance,
        money: run.moneyEarned,
        combo: run.maxCombo,
      });
      UI.showScreen('death-screen');
    }, 420);
  }

  function flashScreen(color, intensity) {
    const el = document.getElementById('run-flash');
    el.style.background = color;
    el.style.transition = 'none';
    el.style.opacity = intensity;
    requestAnimationFrame(() => {
      el.style.transition = 'opacity .4s ease';
      el.style.opacity = 0;
    });
  }

  // Texte flottant "+45 €" affiché à l'endroit exact d'un gain ponctuel (sac d'or...).
  function spawnFloatingText(x, y, text, color) {
    run.floatingTexts.push({ x, y, text, color: color || getCssVar('--gold'), age: 0, life: FLOATING_TEXT_LIFE_S });
  }

  function triggerPerfect(col) {
    run.combo++;
    if (run.combo > run.maxCombo) run.maxCombo = run.combo;
    const bonus = PERFECT_BONUS * derived.revenueMult * (1 + run.combo * derived.comboPerPoint) * run.difficultyMult;
    run.moneyEarned += bonus;
    state.money += bonus;
    spawnBurst(particles, run.player.x, run.player.y, 10, getCssVar('--gold'), 90);
    Audio2.perfect();
    UI.pulsePerfect();
  }

  function checkCoinPickup() {
    const colIdx = Math.floor(run.player.x / COL_WIDTH);
    const col = run.levelGen.getColumnAt(colIdx * COL_WIDTH);
    if (!col || !col.coinSide || col.coinCollected) return;
    const coinY = col.coinSide === 'top'
      ? col.top + COIN_WALL_OFFSET_ROWS * ROW_UNIT
      : col.bottom - COIN_WALL_OFFSET_ROWS * ROW_UNIT;
    if (Math.abs(run.player.y - coinY) < COIN_COLLECT_RADIUS) {
      col.coinCollected = true;
      const comboMult = 1 + run.combo * derived.comboPerPoint;
      const bonus = COIN_VALUE_BASE * derived.revenueMult * comboMult * run.difficultyMult;
      run.moneyEarned += bonus;
      run.coinsCollected++;
      state.money += bonus;
      spawnBurst(particles, run.player.x, coinY, 22, getCssVar('--gold'), 160);
      spawnFloatingText(run.player.x, coinY, '+' + formatNumber(bonus) + ' €', getCssVar('--gold'));
      Audio2.coin();
    }
  }

  const MODE_COLORS = {
    wave: '#4dffc0', ufo: '#4dc9ff', ship: '#ff9d4d', ball: '#ff5d9e',
    cube: '#ffe066', robot: '#9d7bff', spider: '#ff4d4d',
  };

  function checkPortalCrossing() {
    const colIdx = Math.floor(run.player.x / COL_WIDTH);
    const col = run.levelGen.getColumnAt(colIdx * COL_WIDTH);
    if (col && col.portalGate && col.portalGate !== run.player.mode) {
      run.player.vy = 0;
      run.player.jumpBoostActive = false;
      run.player.gravityDir = 1;
      if (col.portalGate === MODE_CUBE || col.portalGate === MODE_ROBOT) {
        run.player.y = col.bottom - COLLISION_MARGIN - (derived.reflexMargin || 0) - PLAYER_RADIUS;
        run.player.grounded = true;
      } else if (col.portalGate === MODE_SPIDER) {
        run.player.attachedTo = 'floor';
        run.player.y = col.bottom - COLLISION_MARGIN - PLAYER_RADIUS;
      } else {
        // Couloir (Wave/OVNI/Vaisseau/Balle) : le joueur peut arriver de n'importe où (sol/plafond
        // fixe de l'Araignée, ou hauteur quelconque en vol) — sans recalage, sa position précédente
        // peut tomber hors du couloir, plus étroit, de CETTE colonne-portail et le tuer instantanément.
        const margin = COLLISION_MARGIN + (derived.reflexMargin || 0) + PLAYER_RADIUS;
        run.player.y = Math.max(col.top + margin, Math.min(col.bottom - margin, run.player.y));
      }
      run.player.mode = col.portalGate;
      Audio2.portal();
      const color = MODE_COLORS[col.portalGate] || '#ffffff';
      flashScreen(color, 0.3);
      UI.announceMode(col.portalGate);
      spawnBurst(particles, run.player.x, run.player.y, 24, color, 140);
    }
  }

  // Cube/Robot : recale le joueur sur le sol/la plateforme courante (jamais sur un pic, voir
  // groundHazard) et renvoie true si le joueur est tombé hors du monde (dans un trou trop large ou
  // raté) — un cas que checkPlayerCollision seul ne peut pas détecter puisque les trous n'ont
  // délibérément aucune limite basse.
  // On regarde TOUTE la largeur du joueur (comme checkPlayerCollision), pas juste la colonne
  // centrale : sur une rampe montante, le bord avant du joueur touche la colonne suivante (plus
  // stricte) avant que son centre n'y soit — un recalage centré uniquement le ferait mourir sur une
  // marche pourtant parfaitement franchissable.
  function applyGroundCollision() {
    const cols = run.levelGen.getColumnsInRange(run.player.x - PLAYER_RADIUS, run.player.x + PLAYER_RADIUS);
    if (!cols.length) return false;
    const hazard = cols.some((c) => c.groundHazard);
    if (!hazard) {
      const margin = COLLISION_MARGIN + (derived.reflexMargin || 0);
      const tightestBottom = Math.min(...cols.map((c) => c.bottom));
      const groundLimit = tightestBottom - margin - PLAYER_RADIUS;
      if (run.player.y >= groundLimit) {
        run.player.y = groundLimit;
        run.player.vy = 0;
        run.player.grounded = true;
      } else {
        run.player.grounded = false;
      }
    } else {
      run.player.grounded = false;
    }
    return run.player.y - PLAYER_RADIUS > FIELD_HEIGHT + 30;
  }

  // Portails de modificateur (gravité/vitesse) : jamais de changement de mode ni de recalage de
  // position (contrairement à checkPortalCrossing) — juste une annonce visuelle au moment où le
  // joueur atteint physiquement la colonne-portail. L'effet réel (sens des commandes, vitesse) est
  // déjà lu en continu depuis la colonne courante à chaque tick, pas depuis un état à activer ici.
  function checkModifierGateCrossing() {
    const colIdx = Math.floor(run.player.x / COL_WIDTH);
    const col = run.levelGen.getColumnAt(colIdx * COL_WIDTH);
    if (col && col.modifierGate && col.index !== run.lastModifierGateIndex) {
      run.lastModifierGateIndex = col.index;
      // Portail de gravité : sans ce reset, la vélocité verticale acquise SOUS L'ANCIEN sens de
      // gravité continue de porter le joueur pendant que la nouvelle accélération (inversée) met un
      // instant à la freiner — s'il est déjà proche d'un mur au moment du franchissement, cette
      // inertie résiduelle peut suffire à le faire percuter un mur qu'il n'a matériellement pas eu le
      // temps d'anticiper. Un reset net, comme pour tout changement de mode, l'élimine complètement.
      if (col.modifierGate === 'gravity') run.player.vy = 0;
      const color = col.modifierGate === 'gravity' ? '#b06bff' : (col.speedMult >= 1 ? '#4dffc0' : '#ff9d4d');
      flashScreen(color, 0.22);
      UI.announceModifier(col.modifierLabel, color);
      Audio2.portal();
      spawnBurst(particles, run.player.x, run.player.y, 18, color, 120);
    }
  }

  // Araignée : la position est toujours exactement sur une surface fixe — la seule question est de
  // savoir si CETTE surface est dangereuse à la colonne courante (sur toute la largeur du joueur).
  function checkSpiderDanger() {
    const cols = run.levelGen.getColumnsInRange(run.player.x - PLAYER_RADIUS, run.player.x + PLAYER_RADIUS);
    for (const col of cols) {
      if (run.player.attachedTo === 'floor' && col.spiderFloorDanger) return true;
      if (run.player.attachedTo === 'ceiling' && col.spiderCeilingDanger) return true;
    }
    return false;
  }

  function physicsStep(dt) {
    checkPortalCrossing();
    checkModifierGateCrossing();
    checkCoinPickup();
    // Vitesse et inversion de gravité sont lues en continu sur la colonne courante (comme
    // groundHazard, coinSide...) — jamais un état à "activer" séparément, donc jamais de risque de
    // désynchronisation avec ce que le joueur voit réellement sous ses pieds.
    // Cube/Robot/Araignée ignorent TOUJOURS speedMult : le timing d'un saut (Cube/Robot) dépend du
    // TEMPS réel (vy/gravité, indépendants de la vitesse de défilement), pas de la distance — changer
    // la vitesse casserait la marge de franchissabilité déjà calculée pour les obstacles au sol (voir
    // [[feedback_wave_idle_passability]]). L'Araignée n'a de toute façon aucune physique de timing.
    const isGroundFamily = run.player.mode === MODE_CUBE || run.player.mode === MODE_ROBOT || run.player.mode === MODE_SPIDER;
    const modCol = run.levelGen.getColumnAt(run.player.x);
    const speedMult = isGroundFamily ? 1 : (modCol ? modCol.speedMult : 1);
    const gravityInverted = !!(modCol && modCol.gravityInverted);
    const dist = BASE_SPEED_UNITS_S * speedMult * dt;
    let fellOffWorld = false;
    let spiderDied = false;
    if (run.player.mode === MODE_UFO) {
      stepPlayerUfo(run.player, dist, dt, gravityInverted);
    } else if (run.player.mode === MODE_SHIP) {
      stepPlayerShip(run.player, dist, dt, gravityInverted);
    } else if (run.player.mode === MODE_BALL) {
      stepPlayerBall(run.player, dist, dt);
    } else if (run.player.mode === MODE_CUBE) {
      stepPlayerCube(run.player, dist, dt);
      fellOffWorld = applyGroundCollision();
    } else if (run.player.mode === MODE_ROBOT) {
      stepPlayerRobot(run.player, dist, dt);
      fellOffWorld = applyGroundCollision();
    } else if (run.player.mode === MODE_SPIDER) {
      const col = run.levelGen.getColumnAt(run.player.x);
      const floorY = (col ? col.bottom : GROUND_BASELINE_ROW * ROW_UNIT) - COLLISION_MARGIN - PLAYER_RADIUS;
      const ceilingY = (col ? col.top : GROUND_CEILING_ROW * ROW_UNIT) + COLLISION_MARGIN + PLAYER_RADIUS;
      stepPlayerSpider(run.player, dist, dt, floorY, ceilingY);
      spiderDied = checkSpiderDanger();
    } else {
      stepPlayerWave(run.player, dist, gravityInverted);
    }
    run.distanceUnits += dist;

    const perfMult = 1 + derived.performanceLevel * 0.05 * (run.distanceUnits / 2000);
    const comboMult = 1 + run.combo * derived.comboPerPoint;
    const gain = dist * MONEY_PER_UNIT * derived.revenueMult * comboMult * perfMult * run.difficultyMult;
    run.moneyEarned += gain;
    state.money += gain;

    const collided = run.player.mode === MODE_SPIDER
      ? spiderDied
      : (checkPlayerCollision(run.player, run.levelGen, derived.reflexMargin) || fellOffWorld);
    if (collided) {
      endRun();
      return false;
    }

    const trailingCol = Math.floor((run.player.x - PLAYER_RADIUS) / COL_WIDTH);
    for (let c = run.lastCheckedColumn + 1; c < trailingCol; c++) {
      const col = run.levelGen.getColumnAt(c * COL_WIDTH + 1);
      if (col && col.perfect && !col.perfectDone) {
        col.perfectDone = true;
        triggerPerfect(col);
      }
    }
    if (trailingCol - 1 > run.lastCheckedColumn) run.lastCheckedColumn = trailingCol - 1;
    return true;
  }

  function loop(now) {
    rafId = requestAnimationFrame(loop);
    let dtReal = (now - lastFrameTime) / 1000;
    lastFrameTime = now;
    dtReal = Math.min(dtReal, 0.05);

    if (run) {
      run.shake *= Math.max(0, 1 - dtReal * 7);
      if (run.shake < 0.05) run.shake = 0;
      run.player.squash *= Math.max(0, 1 - dtReal * 9);
      const targetAngle = run.player.mode === MODE_WAVE
        ? (run.player.holding ? -0.55 : 0.55)
        : Math.max(-0.6, Math.min(0.6, run.player.vy / 800));
      run.player.angle += (targetAngle - run.player.angle) * Math.min(1, dtReal * 18);

      if (run.dying) {
        run.dyingTimer += dtReal;
        run.timeScale = Math.max(0.08, 1 - run.dyingTimer * 3);
        updateParticles(particles, dtReal);
        run.player.trail.length = 0;
      } else if (run.alive) {
        run.accumulator += dtReal;
        let guard = 0;
        while (run.accumulator >= PHYSICS_DT && guard < 4000) {
          if (!physicsStep(PHYSICS_DT)) break;
          run.accumulator -= PHYSICS_DT;
          guard++;
        }
        run.player.trail.push({ x: run.player.x, y: run.player.y });
        if (run.player.trail.length > 26) run.player.trail.shift();
        updateParticles(particles, dtReal);
        for (let i = run.floatingTexts.length - 1; i >= 0; i--) {
          const ft = run.floatingTexts[i];
          ft.age += dtReal;
          if (ft.age >= ft.life) run.floatingTexts.splice(i, 1);
        }
        run.levelGen.trimBehind(run.player.x);
        UI.updateHud(run);
      }
      run.camX = run.player.x;
      renderer.frame({ levelGen: run.levelGen, player: run.player, particles, floatingTexts: run.floatingTexts, camX: run.camX, intensityMult: run.difficultyMult, shake: run.shake });
    } else {
      renderer.frame({ levelGen: { getColumnsInRange: () => [] }, player: { x: 0, y: FIELD_HEIGHT / 2, alive: false, trail: [], angle: 0.5, squash: 0 }, particles, floatingTexts: [], camX: 0, intensityMult: 1, shake: 0 });
    }
  }

  function setHolding(v) {
    if (run && run.alive && !run.dying) {
      if (run.player.holding !== v) {
        run.player.squash = 1;
        const mode = run.player.mode;
        if (v && mode === MODE_UFO) {
          const col = run.levelGen.getColumnAt(run.player.x);
          ufoHop(run.player, !!(col && col.gravityInverted));
          Audio2.hop();
        }
        else if (v && mode === MODE_CUBE) { cubeJump(run.player); if (run.player.vy < 0) Audio2.hop(); }
        else if (v && mode === MODE_ROBOT) { robotJump(run.player); if (run.player.vy < 0) Audio2.hop(); }
        else if (v && mode === MODE_BALL) { ballFlip(run.player); Audio2.flip(true); }
        else if (v && mode === MODE_SPIDER) { spiderFlip(run.player); Audio2.hop(); }
        else if (mode === MODE_WAVE) { Audio2.flip(v); }
      }
      run.player.holding = v;
    }
  }

  function isDeathScreenVisible() {
    const el = document.getElementById('death-screen');
    return el && !el.classList.contains('hidden');
  }

  // N'importe quelle touche du clavier, et n'importe quel bouton de la souris, font monter le Wave.
  const activeKeys = new Set();
  let pointerDown = false;

  function refreshHolding() {
    setHolding(activeKeys.size > 0 || pointerDown);
  }

  function bindInput() {
    window.addEventListener('keydown', (e) => {
      if (isExcludedInputKey(e)) return;
      if (state.retryKey && e.code === state.retryKey && isDeathScreenVisible()) {
        e.preventDefault();
        startRun();
        return;
      }
      if (!activeKeys.has(e.code)) {
        activeKeys.add(e.code);
        if (run && run.alive && !run.dying) e.preventDefault();
        refreshHolding();
      }
    });
    window.addEventListener('keyup', (e) => {
      activeKeys.delete(e.code);
      refreshHolding();
    });
    canvas.addEventListener('mousedown', (e) => { e.preventDefault(); pointerDown = true; refreshHolding(); });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('mouseup', () => { pointerDown = false; refreshHolding(); });
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); pointerDown = true; refreshHolding(); }, { passive: false });
    window.addEventListener('touchend', () => { pointerDown = false; refreshHolding(); });
    window.addEventListener('touchcancel', () => { pointerDown = false; refreshHolding(); });
    window.addEventListener('blur', () => { activeKeys.clear(); pointerDown = false; refreshHolding(); });
  }

  return { init, startRun };
})();
