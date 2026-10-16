window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  const game = new Game(canvas);
  window.__game = game; // hook de debug (console / outils de test)

  function fitCanvas() {
    game.resize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', fitCanvas);
  fitCanvas();

  game.start();
});
