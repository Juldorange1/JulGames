// Boucle principale. Pas de simulation FIXE (accumulateur) découplé du
// framerate d'affichage. Le chrono (Timer) reçoit toujours le delta RÉEL,
// jamais le delta scalé par `timeScale` (cf. Perso 7 compétence 2 plus tard).
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.fixedDt = 1 / 60;
    this.accumulator = 0;
    this.timeScale = 1; // futur hook pour Perso 7 c2 — n'affecte jamais Timer
    this.maxFrameMs = 250; // anti spirale de la mort si tab en arrière-plan

    this.timer = new Timer();
    this.camera = new Camera(canvas.width, canvas.height);
    this.room = new Room();

    Input.init(canvas);
    Hud.init();

    this._lastNow = null;
    this._boundLoop = this.loop.bind(this);
  }

  start() {
    this.timer.start();
    requestAnimationFrame(this._boundLoop);
  }

  resetRoom() {
    this.room = new Room();
    this.accumulator = 0;
    this.timer.reset();
    this.timer.start();
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.camera.resize(width, height);
  }

  loop(nowMs) {
    if (this._lastNow === null) this._lastNow = nowMs;
    // Delta RÉEL non clampé : le chrono doit refléter le vrai temps écoulé,
    // même si un frame a été retardé (onglet en arrière-plan, lag ponctuel).
    const trueRealDtMs = nowMs - this._lastNow;
    this._lastNow = nowMs;

    this.timer.tick(trueRealDtMs);

    if (Input.keyPressed('r')) {
      this.resetRoom();
    }

    // Delta clampé uniquement pour borner le nombre de pas de simulation à
    // rattraper (anti spirale de la mort) — n'affecte jamais le chrono ci-dessus.
    const clampedRealDt = Math.min(trueRealDtMs, this.maxFrameMs) / 1000;
    this.accumulator += clampedRealDt * this.timeScale;
    while (this.accumulator >= this.fixedDt) {
      this.room.update(this.fixedDt, this.camera, performance.now());
      this.accumulator -= this.fixedDt;
    }

    this.camera.follow(this.room.player, this.room, clampedRealDt);

    this.draw();
    Hud.update(this.room.player, this.timer);
    Input.consumeFrame();

    requestAnimationFrame(this._boundLoop);
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.room.draw(ctx, this.camera);
  }
}
