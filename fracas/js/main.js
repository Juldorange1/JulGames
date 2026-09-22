// Point d'entree : le jeu occupe tout l'ecran, la resolution du canvas suit la fenetre.

function resizeCanvas(canvas) {
  CANVAS_W = window.innerWidth;
  CANVAS_H = window.innerHeight;
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
}

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game');
  resizeCanvas(canvas);
  UI.init();
  Game.init(canvas);
  window.addEventListener('resize', () => resizeCanvas(canvas));
});
