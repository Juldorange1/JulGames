// Définition des améliorations, coûts, effets, et valeurs dérivées recalculées à chaque achat/chargement.
const DIFFICULTY_COSTS = [150, 400, 1100, 3000, 9000, 30000, 100000, 400000, 1800000, 9000000];

function getAvailableDifficultyTiers() {
  return DIFFICULTY_TIERS; // plafond fixe à 15×, toujours le même palier disponible pour tout le monde
}

function maxDifficultyLevel() {
  return getAvailableDifficultyTiers().length - 1;
}

const UPGRADE_DEFS = {
  difficulty: {
    name: 'Difficulté',
    icon: '☠',
    desc: 'Débloque le palier de difficulté suivant (jusqu\'à 15×) : patterns bien plus durs, mais or gagné multiplié d\'autant.',
    maxLevel: () => maxDifficultyLevel(),
    cost: (level) => DIFFICULTY_COSTS[level] !== undefined ? DIFFICULTY_COSTS[level] : Infinity,
    levelLabel: () => {
      const tiers = getAvailableDifficultyTiers();
      return formatMultiplier(tiers[Math.min(state.upgrades.difficulty, tiers.length - 1)]) + ' débloqué';
    },
  },
  revenue: {
    name: 'Revenus',
    icon: '€',
    desc: '+5 % d\'argent gagné par partie, par niveau.',
    maxLevel: () => Infinity,
    cost: (level) => Math.floor(100 * Math.pow(1.32, level)),
    levelLabel: () => `+${(state.upgrades.revenue * 5)}% argent`,
  },
  combo: {
    name: 'Combo',
    icon: '✦',
    desc: 'Chaque point de combo rapporte davantage d\'argent.',
    maxLevel: () => Infinity,
    cost: (level) => Math.floor(200 * Math.pow(1.35, level)),
    levelLabel: () => `+${(state.upgrades.combo * 0.4).toFixed(1)}% argent / point de combo`,
  },
  performance: {
    name: 'Performance',
    icon: '▲',
    desc: 'Bonus d\'argent croissant sur les grandes distances.',
    maxLevel: () => Infinity,
    cost: (level) => Math.floor(300 * Math.pow(1.4, level)),
    levelLabel: () => `Niveau ${state.upgrades.performance}`,
  },
  idle: {
    name: 'Automatisation',
    icon: '◷',
    desc: 'Produit un peu d\'argent même hors ligne (toujours bien moins qu\'une partie active).',
    maxLevel: () => Infinity,
    cost: (level) => Math.floor(500 * Math.pow(1.5, level)),
    levelLabel: () => `${formatNumber(state.upgrades.idle * 2)} €/s hors-ligne`,
  },
  reflex: {
    name: 'Réflexes',
    icon: '◆',
    desc: 'Ascension ≥ 10 requise. Légère marge de tolérance sur les collisions.',
    maxLevel: () => 10,
    cost: (level) => Math.floor(1000 * Math.pow(1.6, level)),
    levelLabel: () => `Marge +${(state.upgrades.reflex * 0.3).toFixed(1)}u`,
    locked: () => state.ascensions < ASCENSION_REFLEX_UNLOCK,
  },
};

const UPGRADE_ORDER = ['difficulty', 'revenue', 'combo', 'performance', 'idle', 'reflex'];

function upgradeCost(key) {
  const def = UPGRADE_DEFS[key];
  const level = state.upgrades[key];
  return def.cost(level);
}

function canBuyUpgrade(key) {
  const def = UPGRADE_DEFS[key];
  if (def.locked && def.locked()) return false;
  if (state.upgrades[key] >= def.maxLevel()) return false;
  return state.money >= upgradeCost(key);
}

function buyUpgrade(key) {
  if (!canBuyUpgrade(key)) return false;
  state.money -= upgradeCost(key);
  state.upgrades[key]++;
  recomputeDerived();
  Audio2.upgrade();
  saveState();
  return true;
}

// Valeurs dérivées, recalculées après tout changement d'upgrades ou d'ascensions.
let derived = {};

function recomputeDerived() {
  const ascRevenueBonus = state.ascensions * 0.02;
  derived.revenueMult = (1 + state.upgrades.revenue * 0.05) * (1 + ascRevenueBonus);
  derived.comboPerPoint = state.upgrades.combo * 0.004;
  derived.performanceLevel = state.upgrades.performance;
  derived.idleRatePerSec = state.upgrades.idle * 2 * derived.revenueMult;
  derived.reflexMargin = state.ascensions >= ASCENSION_REFLEX_UNLOCK ? state.upgrades.reflex * 0.3 : 0;
  derived.maxDifficultyTierIndex = Math.min(state.upgrades.difficulty, maxDifficultyLevel());
  if (state.selectedDifficultyTier > derived.maxDifficultyTierIndex) state.selectedDifficultyTier = derived.maxDifficultyTierIndex;
}
