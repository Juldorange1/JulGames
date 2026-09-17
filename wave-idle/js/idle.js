// Production hors-ligne : calculée à l'ouverture du jeu à partir du temps écoulé depuis la dernière sauvegarde.
function computeOfflineEarnings() {
  const now = Date.now();
  const elapsed = Math.min(now - (state.lastTimestamp || now), MAX_OFFLINE_MS);
  if (elapsed <= 0 || derived.idleRatePerSec <= 0) return 0;
  return derived.idleRatePerSec * (elapsed / 1000);
}
