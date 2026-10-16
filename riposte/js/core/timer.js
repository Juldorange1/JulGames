// Chrono de speedrun : mesure le temps RÉEL écoulé, indépendamment de la
// vitesse de simulation (voir Perso 7 compétence 2 : accélérer le jeu ne doit
// jamais accélérer ce chrono). tick() doit toujours recevoir un dt non scalé.
class Timer {
  constructor() {
    this.reset();
  }

  reset() {
    this.elapsedMs = 0;
    this.running = false;
  }

  start() {
    this.running = true;
  }

  stop() {
    this.running = false;
  }

  // dtRealMs : delta de temps réel (non affecté par timeScale) en millisecondes.
  tick(dtRealMs) {
    if (!this.running) return;
    this.elapsedMs += dtRealMs;
  }

  format() {
    const totalMs = Math.max(0, this.elapsedMs);
    const minutes = Math.floor(totalMs / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const centis = Math.floor((totalMs % 1000) / 10);
    const pad = (n, len) => String(n).padStart(len, '0');
    return `${pad(minutes, 2)}:${pad(seconds, 2)}.${pad(centis, 2)}`;
  }
}
