// Physique du joueur, une fonction par mode. Wave = diagonale rigide à 45° (vx == |vy| toujours).
// OVNI/Vaisseau/Balle = physique à gravité/accélération. Cube/Robot = plateforme (sol + saut).
// Araignée = position figée sur une surface (sol ou plafond), bascule instantanée.
function createPlayer() {
  return {
    x: 0,
    y: FIELD_HEIGHT / 2,
    vy: 0,
    mode: MODE_WAVE,
    holding: false,
    alive: true,
    trail: [],
    angle: 0.5,
    squash: 0,
    // Cube/Robot :
    grounded: false,
    jumpBoostActive: false,
    jumpHoldTime: 0,
    // Balle :
    gravityDir: 1,
    // Araignée :
    attachedTo: 'floor', // 'floor' | 'ceiling'
    spiderVisualT: 1, // 0..1, pour le lissage visuel de la bascule (logique = instantanée)
  };
}

function clampToField(player) {
  if (player.y < PLAYER_RADIUS) { player.y = PLAYER_RADIUS; player.vy = 0; }
  if (player.y > FIELD_HEIGHT - PLAYER_RADIUS) { player.y = FIELD_HEIGHT - PLAYER_RADIUS; player.vy = 0; }
}

// `inverted` (portail de gravité, Wave/OVNI/Vaisseau uniquement) ne change JAMAIS la géométrie des
// couloirs générés — seulement le sens des commandes ci-dessous. Voir constants.js.
function stepPlayerWave(player, dist, inverted) {
  player.x += dist;
  const up = inverted ? !player.holding : player.holding;
  player.y += up ? -dist : dist;
  if (player.y < PLAYER_RADIUS) player.y = PLAYER_RADIUS;
  if (player.y > FIELD_HEIGHT - PLAYER_RADIUS) player.y = FIELD_HEIGHT - PLAYER_RADIUS;
}

function stepPlayerUfo(player, dist, dt, inverted) {
  player.x += dist;
  player.vy += (inverted ? -UFO_GRAVITY : UFO_GRAVITY) * dt;
  const maxFall = inverted ? -UFO_MAX_FALL_VY : UFO_MAX_FALL_VY;
  if (inverted ? player.vy < maxFall : player.vy > maxFall) player.vy = maxFall;
  player.y += player.vy * dt;
  clampToField(player);
}

// Appelé sur le front montant de "holding" (chaque appui, pas un maintien continu).
function ufoHop(player, inverted) {
  player.vy = inverted ? UFO_HOP_VY : -UFO_HOP_VY;
}

function stepPlayerShip(player, dist, dt, inverted) {
  player.x += dist;
  const baseAccel = SHIP_GRAVITY - (player.holding ? SHIP_THRUST : 0);
  const accel = inverted ? -baseAccel : baseAccel;
  player.vy += accel * dt;
  if (player.vy > SHIP_MAX_VY) player.vy = SHIP_MAX_VY;
  if (player.vy < -SHIP_MAX_VY) player.vy = -SHIP_MAX_VY;
  player.y += player.vy * dt;
  clampToField(player);
}

// Balle : la gravité est toujours active, mais son SENS s'inverse à chaque appui — la balle roule
// en arcs entre le sol et le plafond du couloir plutôt que de suivre une diagonale rigide.
function stepPlayerBall(player, dist, dt) {
  player.x += dist;
  player.vy += BALL_GRAVITY * player.gravityDir * dt;
  if (player.vy > BALL_MAX_VY) player.vy = BALL_MAX_VY;
  if (player.vy < -BALL_MAX_VY) player.vy = -BALL_MAX_VY;
  player.y += player.vy * dt;
  clampToField(player);
}
function ballFlip(player) {
  player.gravityDir *= -1;
}

// Cube : gravité + saut à hauteur fixe, uniquement déclenchable au sol (voir applyGroundCollision
// dans game.js, qui gère l'atterrissage/décollage en fonction du sol généré).
function stepPlayerCube(player, dist, dt) {
  player.x += dist;
  player.vy += CUBE_GRAVITY * dt;
  player.y += player.vy * dt;
}
function cubeJump(player) {
  if (player.grounded) {
    player.vy = -CUBE_JUMP_VY;
    player.grounded = false;
  }
}

// Robot : comme le Cube, avec une courte fenêtre où maintenir l'appui pendant la montée ajoute un
// peu de poussée supplémentaire — saut légèrement plus haut si on maintient un peu plus longtemps.
function stepPlayerRobot(player, dist, dt) {
  player.x += dist;
  if (player.jumpBoostActive) {
    player.jumpHoldTime += dt;
    if (player.holding && player.vy < 0 && player.jumpHoldTime < ROBOT_HOLD_BOOST_MAX_S) {
      player.vy -= ROBOT_HOLD_BOOST * dt;
    } else {
      player.jumpBoostActive = false;
    }
  }
  player.vy += ROBOT_GRAVITY * dt;
  player.y += player.vy * dt;
}
function robotJump(player) {
  if (player.grounded) {
    player.vy = -ROBOT_JUMP_VY;
    player.grounded = false;
    player.jumpBoostActive = true;
    player.jumpHoldTime = 0;
  }
}

// Araignée : aucune physique libre — la position est TOUJOURS exactement sur la surface actuelle
// (sol ou plafond) de la colonne courante. stepPlayerSpider recale juste la position logique ; le
// lissage visuel (spiderVisualT) est géré séparément au rendu, jamais utilisé pour la collision.
function stepPlayerSpider(player, dist, dt, floorY, ceilingY) {
  player.x += dist;
  player.y = player.attachedTo === 'floor' ? floorY : ceilingY;
  if (player.spiderVisualT < 1) player.spiderVisualT = Math.min(1, player.spiderVisualT + dt / SPIDER_VISUAL_FLIP_S);
}
function spiderFlip(player) {
  player.attachedTo = player.attachedTo === 'floor' ? 'ceiling' : 'floor';
  player.spiderVisualT = 0;
}
