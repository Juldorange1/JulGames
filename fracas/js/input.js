// Gestion clavier / souris

const Input = {
  down: new Set(),
  pressed: new Set(), // touches appuyees cette frame (edge)
  released: new Set(),
  mouse: { x: CANVAS_W / 2, y: CANVAS_H / 2, down: false, pressedEdge: false, releasedEdge: false },
  _canvas: null,
  rebindCallback: null,

  init(canvas) {
    this._canvas = canvas;
    window.addEventListener('keydown', (e) => {
      // Touches de modification seules : une combinaison systeme (Alt+Tab, Win...) va faire perdre
      // le focus ; on ne les enregistre pas comme touches de jeu.
      if (e.key === 'Alt' || e.key === 'Meta' || e.key === 'OS') return;
      // Saisie de texte (nom d'un defi...) : les touches ne pilotent pas le jeu.
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (this.rebindCallback) {
        e.preventDefault();
        const cb = this.rebindCallback;
        this.rebindCallback = null;
        cb(e.code);
        return;
      }
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
      if (Object.values(Keybinds).includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.down.delete(e.code);
      this.released.add(e.code);
    });
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const sx = canvas.width / rect.width;
      const sy = canvas.height / rect.height;
      this.mouse.x = (e.clientX - rect.left) * sx;
      this.mouse.y = (e.clientY - rect.top) * sy;
    });
    // Capture de rebind au niveau window (pas juste le canvas) : l'ecran des Parametres est un
    // panneau DOM plein ecran qui recouvre le canvas et intercepterait sinon le clic avant lui,
    // rendant tout rebind souris impossible.
    window.addEventListener('mousedown', (e) => {
      if (!this.rebindCallback) return;
      e.preventDefault();
      const cb = this.rebindCallback;
      this.rebindCallback = null;
      cb('Mouse' + e.button);
    });
    window.addEventListener('contextmenu', (e) => { if (this.rebindCallback) e.preventDefault(); });
    canvas.addEventListener('mousedown', (e) => {
      if (this.rebindCallback) return; // deja pris en charge par le listener window ci-dessus
      const code = 'Mouse' + e.button;
      if (!this.down.has(code)) this.pressed.add(code);
      this.down.add(code);
      if (e.button === 0) {
        if (!this.mouse.down) this.mouse.pressedEdge = true;
        this.mouse.down = true;
      }
      if (Object.values(Keybinds).includes(code)) e.preventDefault();
    });
    window.addEventListener('mouseup', (e) => {
      const code = 'Mouse' + e.button;
      this.down.delete(code);
      this.released.add(code);
      if (e.button === 0) {
        this.mouse.down = false;
        this.mouse.releasedEdge = true;
      }
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    // Si la fenetre perd le focus (clic hors du jeu, Alt+Tab...), les relachements de touches ne
    // sont jamais recus : on considere donc tout relache pour qu'aucune direction ne reste bloquee.
    const releaseAll = () => {
      for (const code of this.down) this.released.add(code);
      this.down.clear();
      this.mouse.down = false;
    };
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
    window.addEventListener('pagehide', releaseAll);
    // Filet de securite : une touche de deplacement relachee hors fenetre ne doit jamais rester
    // enfoncee si le navigateur n'a pas tout signale (keyup perdu).
    window.addEventListener('focus', releaseAll);
  },

  isDown(code) { return this.down.has(code); },
  wasPressed(code) { return this.pressed.has(code); },
  wasReleased(code) { return this.released.has(code); },
  ability1Pressed() { return this.pressed.has(Keybinds.ability1) || this.pressed.has(Keybinds.ability1b); },
  ability1Down() { return this.down.has(Keybinds.ability1) || this.down.has(Keybinds.ability1b); },

  moveVector() {
    let x = 0, y = 0;
    if (this.isDown(Keybinds.left)) x -= 1;
    if (this.isDown(Keybinds.right)) x += 1;
    if (this.isDown(Keybinds.up)) y -= 1;
    if (this.isDown(Keybinds.down)) y += 1;
    return normalize(x, y);
  },

  endFrame() {
    this.pressed.clear();
    this.released.clear();
    this.mouse.pressedEdge = false;
    this.mouse.releasedEdge = false;
  },

  startRebind(callback) {
    this.down.clear(); this.pressed.clear(); this.released.clear();
    this.rebindCallback = callback;
  },
};
