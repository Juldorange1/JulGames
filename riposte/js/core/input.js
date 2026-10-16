// Système d'input centralisé : clavier (ZQSD/WASD) + souris.
const Input = {
  keys: new Set(),
  mouseScreen: { x: 0, y: 0 },
  mouseDown: false,
  mouseJustPressed: false,
  rightMouseDown: false,

  _keyMap: {
    // direction -> touches acceptées (QWERTY + AZERTY)
    up: ['w', 'z', 'arrowup'],
    down: ['s', 'arrowdown'],
    left: ['a', 'q', 'arrowleft'],
    right: ['d', 'arrowright'],
  },

  init(canvas) {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseScreen.x = e.clientX - rect.left;
      this.mouseScreen.y = e.clientY - rect.top;
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.mouseDown = true;
        this.mouseJustPressed = true;
      } else if (e.button === 2) {
        this.rightMouseDown = true;
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
      if (e.button === 2) this.rightMouseDown = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  },

  isDown(direction) {
    return this._keyMap[direction].some((k) => this.keys.has(k));
  },

  keyPressed(key) {
    return this.keys.has(key.toLowerCase());
  },

  // À appeler une fois par frame après traitement, pour les inputs "edge" (un seul tick).
  consumeFrame() {
    this.mouseJustPressed = false;
  },
};
