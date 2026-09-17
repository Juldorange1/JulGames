// Ascension : reset des améliorations actives contre une monnaie permanente.
function computeAscensionGain() {
  const dist = state.cycleBestDistance;
  const diffIdx = state.cycleBestDifficultyIndex;
  if (dist < 300) return 0;
  return Math.floor(Math.sqrt(dist / 40) * (1 + diffIdx * 0.6));
}

function canAscend() {
  return computeAscensionGain() > 0;
}

function doAscend() {
  const gain = computeAscensionGain();
  if (gain <= 0) return false;
  state.ascensions += gain;
  state.upgrades.difficulty = 0;
  state.upgrades.revenue = 0;
  state.upgrades.combo = 0;
  state.upgrades.performance = 0;
  state.upgrades.idle = 0;
  state.money = 0;
  state.selectedDifficultyTier = 0;
  state.cycleBestDistance = 0;
  state.cycleBestDifficultyIndex = 0;
  state.themeUnlocked = state.ascensions >= ASCENSION_THEME_UNLOCK;
  recomputeDerived();
  applyTheme();
  Audio2.ascend();
  saveState();
  return true;
}

function applyTheme() {
  const root = document.documentElement;
  if (state.themeUnlocked) {
    root.style.setProperty('--theme-accent', '#ff6bd6');
    root.style.setProperty('--theme-accent2', '#9b6bff');
  } else {
    root.style.setProperty('--theme-accent', '#4dffc0');
    root.style.setProperty('--theme-accent2', '#7c6bff');
  }
}
