// Point d'entrée : charge la sauvegarde, calcule la production hors-ligne, démarre l'UI et la boucle.
(function boot() {
  loadState();
  recomputeDerived();
  applyTheme();
  Audio2.setMuted(state.muted);
  Audio2.setMusicVolume(state.musicVolume);
  Audio2.setSfxVolume(state.sfxVolume);

  const offline = computeOfflineEarnings();
  if (offline > 0) {
    state.money += offline;
    saveState();
  }

  UI.init();
  if (offline > 0) UI.showOfflineEarnings(offline);

  Game.init();

  let musicStarted = false;
  const startMusicOnce = () => {
    if (musicStarted) return;
    musicStarted = true;
    Audio2.unlock();
    Audio2.startMusic();
    window.removeEventListener('pointerdown', startMusicOnce);
    window.removeEventListener('keydown', startMusicOnce);
  };
  window.addEventListener('pointerdown', startMusicOnce);
  window.addEventListener('keydown', startMusicOnce);

  setInterval(() => { saveState(); }, AUTOSAVE_INTERVAL_MS);
  window.addEventListener('beforeunload', () => saveState());
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveState(); });
})();
