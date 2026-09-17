// Petits utilitaires partagés par la définition des compétences (data/skills.js) et
// des spécificités (data/specificities.js). Volontairement minces : la vraie logique
// vit dans core/effects.js et core/status.js.

// Met à l'échelle toutes les valeurs numériques d'un objet de stats de base selon la
// rareté, sauf les clés listées dans noScale (ex: cooldown, count).
const INT_STAT_KEYS = new Set(['count', 'maxJumps', 'targets', 'projectiles', 'summonsCount', 'stacks', 'pierce', 'bounces', 'hits']);
// Une aire (rayon/longueur/largeur) grandit en surface avec le carré du rayon : on
// amortit donc sa mise à l'échelle (racine carrée du multiplicateur) pour qu'une
// compétence de zone Divine reste puissante sans engloutir toute la carte.
const AREA_STAT_KEYS = new Set(['radius', 'shardRadius', 'length', 'width', 'range', 'bounceRange']);

function scaleStats(base, rarityId, noScale = ['cooldown']) {
  const mult = RARITIES[rarityId].mult;
  const out = {};
  for (const k in base) {
    if (typeof base[k] !== 'number' || noScale.includes(k)) { out[k] = base[k]; continue; }
    let v = base[k] * (AREA_STAT_KEYS.has(k) ? Math.sqrt(mult) : mult);
    if (INT_STAT_KEYS.has(k)) v = Math.max(1, Math.round(v));
    out[k] = v;
  }
  return out;
}

function angleTo(x1, y1, x2, y2) { return Math.atan2(y2 - y1, x2 - x1); }

function originFromPlayer(player, forwardOffset = 22) {
  return { x: player.x + Math.cos(player.aimAngle) * forwardOffset, y: player.y + Math.sin(player.aimAngle) * forwardOffset };
}

function pickRandom(arr, n) {
  const copy = arr.slice();
  const out = [];
  while (out.length < n && copy.length) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Fabriques d'effets de zone réutilisées par de nombreuses compétences (feu au sol,
// blizzard, nuage toxique...) : une seule implémentation générique de "tick de zone".
const Kits = {
  zoneDamageStatus({ damage = 0, tags = [], status, statusOpts = {}, source }) {
    return function (game, zone) {
      for (const e of Effects.enemiesInZone(game, zone)) {
        if (damage) Effects.damageEnemy(game, e, damage, { tags, source, isDot: true });
        if (status) Effects.applyStatus(game, e, status, statusOpts);
      }
    };
  },
  zoneOnEnter({ status, statusOpts = {}, source }) {
    return function (game, zone, enemy) {
      Effects.applyStatus(game, enemy, status, statusOpts);
    };
  },
};

// Certaines compétences ont une composante passive tant qu'elles sont dans les 4
// tirées (ex: Contamination, Projection sanguine). On l'enregistre une seule fois
// par combat, même si la compétence est recastée plusieurs fois.
function registerOncePerCombat(game, key, fn) {
  if (!game._passiveRegistry) game._passiveRegistry = new Set();
  if (game._passiveRegistry.has(key)) return;
  game._passiveRegistry.add(key);
  fn();
}

// Enchaîne des ticks périodiques pendant `duration`, en rappelant `onTick(t)` toutes
// les `interval` secondes via game.schedule (utilisé pour les canalisations : lance-flammes, arcs...).
function channelOverTime(game, duration, interval, onTick) {
  let elapsed = 0;
  const step = () => {
    onTick(elapsed);
    elapsed += interval;
    if (elapsed < duration) game.schedule(interval, step);
  };
  step();
}
