// État persistant du joueur (sauvegardé en localStorage) + état runtime de la partie en cours.
function defaultState() {
  return {
    money: 0,
    upgrades: {
      difficulty: 0,  // niveaux achetés -> débloque DIFFICULTY_TIERS[1..]
      revenue: 0,
      combo: 0,
      performance: 0,
      idle: 0,
      reflex: 0,
    },
    ascensions: 0,
    selectedDifficultyTier: 0, // index dans DIFFICULTY_TIERS choisi pour la prochaine partie
    bestDistance: 0,
    bestDifficultyIndexReached: 0,
    bestCombo: 0,
    cycleBestDistance: 0,          // meilleure distance depuis la dernière ascension (sert au calcul du gain)
    cycleBestDifficultyIndex: 0,
    muted: false,
    musicVolume: 0.45,
    sfxVolume: 0.8,
    retryKey: null,       // e.code de la touche configurée pour "Rejouer" sur l'écran de mort
    themeUnlocked: false,
    lastTimestamp: Date.now(),
  };
}

let state = defaultState();

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    const fresh = defaultState();
    const defaultUpgrades = fresh.upgrades;
    state = Object.assign(fresh, saved);
    state.upgrades = Object.assign({}, defaultUpgrades, saved.upgrades || {});
  } catch (e) {
    console.warn('Sauvegarde illisible, reset.', e);
    state = defaultState();
  }
}

function saveState() {
  state.lastTimestamp = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Sauvegarde impossible', e);
  }
}
