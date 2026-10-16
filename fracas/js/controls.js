// Manette et ecran tactile (telephone, tablette), en plus du clavier/souris.
//
// MANETTE (Xbox / PlayStation / standard) :
//   stick gauche / croix : se deplacer      stick droit : viser (plus on pousse, plus on vise loin)
//   R2 (ou RB) : attaque                    L2 (ou LB) : competence de la touche unique (Monde, Infini)
//   X : competence 1   A : competence 2   Y : competence 3
//   Start : pause / menu                    Select : recommencer
//   Dans les menus : stick/croix = choisir, A = valider, B = retour.
//
// TACTILE : joystick gauche = deplacement ; joystick droit = viser ET attaquer (tant qu'on le
// touche) ; gros bouton = competence ; petits boutons C1/C2/C3 ; bouton pause en haut.
//
// Ces commandes alimentent sampleLocalInput() (input.js) : la simulation ne voit qu'un joueur.

const PAD = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, SELECT: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const PAD_DEAD = 0.22;

const Controls = {
  device: 'keyboard', // dernier peripherique utilise : keyboard | gamepad | touch
  pad: { move: { x: 0, y: 0 }, aim: { x: 0, y: 0, mag: 0 }, down: {}, prev: {}, aimDir: { x: 1, y: 0 } },
  touch: { move: { x: 0, y: 0 }, aim: { x: 0, y: 0, mag: 0 }, attack: false, btn: {}, btnPrev: {}, ids: {} },
  _menuRepeat: 0,
  _focus: null,

  init() {
    window.addEventListener('keydown', () => this.setDevice('keyboard'));
    window.addEventListener('mousemove', (e) => { if (e.movementX || e.movementY) this.setDevice('keyboard'); });
    window.addEventListener('touchstart', () => this.setDevice('touch'), { passive: true });
    window.addEventListener('gamepadconnected', () => this.setDevice('gamepad'));
    this.buildTouchUI();
  },

  setDevice(d) {
    if (this.device === d) return;
    this.device = d;
    document.body.classList.toggle('touch-mode', d === 'touch');
    document.body.classList.toggle('pad-mode', d === 'gamepad');
    if (d !== 'gamepad') this.clearFocus();
  },

  // ---------------- manette ----------------
  pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null;
    for (const p of pads) if (p && p.connected) { gp = p; break; }
    const P = this.pad;
    P.prev = P.down;
    P.down = {};
    if (!gp) { P.move = { x: 0, y: 0 }; P.aim = { x: 0, y: 0, mag: 0 }; return; }
    const ax = (i) => { const v = gp.axes[i] || 0; return Math.abs(v) < PAD_DEAD ? 0 : v; };
    let mx = ax(0), my = ax(1);
    gp.buttons.forEach((b, i) => { if (b && (b.pressed || b.value > 0.45)) P.down[i] = true; });
    if (P.down[PAD.LEFT]) mx = -1; if (P.down[PAD.RIGHT]) mx = 1;
    if (P.down[PAD.UP]) my = -1; if (P.down[PAD.DOWN]) my = 1;
    const ml = Math.hypot(mx, my);
    P.move = ml > 1 ? { x: mx / ml, y: my / ml } : { x: mx, y: my };
    const rx = ax(2), ry = ax(3), rl = Math.hypot(rx, ry);
    P.aim = { x: rx, y: ry, mag: Math.min(1, rl) };
    if (rl > 0.3) P.aimDir = { x: rx / rl, y: ry / rl };
    if (ml > 0 || rl > 0 || Object.keys(P.down).length) this.setDevice('gamepad');
  },
  padDown(b) { return !!this.pad.down[b]; },
  padPressed(b) { return !!this.pad.down[b] && !this.pad.prev[b]; },
  padReleased(b) { return !this.pad.down[b] && !!this.pad.prev[b]; },

  // Commandes de partie fusionnees (manette + tactile) pour sampleLocalInput.
  gameInput(world) {
    const P = this.pad, T = this.touch;
    const out = { mx: 0, my: 0, aim: null, attack: false, attackReleased: false, a1p: false, a1d: false, a2p: false, a2d: false, a3p: false, a3d: false, abp: false, abd: false };
    // deplacement
    if (P.move.x || P.move.y) { out.mx = P.move.x; out.my = P.move.y; }
    if (T.move.x || T.move.y) { out.mx = T.move.x; out.my = T.move.y; }
    // visee : point du monde devant le joueur, distance selon l'inclinaison du stick
    const p = world && world.player;
    const aimFrom = (dx, dy, mag) => (p ? { x: p.x + dx * (70 + mag * 280), y: p.y + dy * (70 + mag * 280) } : null);
    if (T.aim.mag > 0.15) { T.lastDir = { x: T.aim.x / T.aim.mag, y: T.aim.y / T.aim.mag }; out.aim = aimFrom(T.lastDir.x, T.lastDir.y, T.aim.mag); }
    else if (this.device === 'touch' && p) { const d = T.lastDir || { x: Math.cos(p.facing || 0), y: Math.sin(p.facing || 0) }; out.aim = aimFrom(d.x, d.y, 0.55); }
    else if (this.device === 'gamepad' && p) out.aim = aimFrom(P.aimDir.x, P.aimDir.y, P.aim.mag > 0.3 ? P.aim.mag : 0.55);
    // boutons
    out.attack = this.padDown(PAD.RT) || this.padDown(PAD.RB) || T.attack;
    out.attackReleased = this.padReleased(PAD.RT) || this.padReleased(PAD.RB) || (T.attackPrev && !T.attack);
    out.abp = this.padPressed(PAD.LT) || this.padPressed(PAD.LB) || this.touchPressed('ab');
    out.abd = this.padDown(PAD.LT) || this.padDown(PAD.LB) || !!T.btn.ab;
    out.a1p = this.padPressed(PAD.X) || this.touchPressed('a1'); out.a1d = this.padDown(PAD.X) || !!T.btn.a1;
    out.a2p = this.padPressed(PAD.A) || this.touchPressed('a2'); out.a2d = this.padDown(PAD.A) || !!T.btn.a2;
    out.a3p = this.padPressed(PAD.Y) || this.touchPressed('a3'); out.a3d = this.padDown(PAD.Y) || !!T.btn.a3;
    // gros bouton tactile "C" : la competence disponible (touche unique) ou, sans verrou, la C1
    if (world && world.abilityGate) { out.abp = out.abp || out.a1p; out.abd = out.abd || out.a1d; }
    else { out.a1p = out.a1p || this.touchPressed('ab'); out.a1d = out.a1d || !!T.btn.ab; }
    return out;
  },
  pausePressed() { return this.padPressed(PAD.START) || this.touchPressed('pause'); },
  restartPressed() { return this.padPressed(PAD.SELECT); },
  touchPressed(k) { return !!this.touch.btn[k] && !this.touch.btnPrev[k]; },

  // Appele en fin d'image (comme Input.endFrame).
  endFrame() {
    this.touch.btnPrev = Object.assign({}, this.touch.btn);
    this.touch.attackPrev = this.touch.attack;
  },

  // ---------------- navigation des menus a la manette ----------------
  CLICKABLE: '.menu-btn:not(.disabled), .rep-tile, .launcher-card, .rep-tab, .lang-btn, .online-mode, .lobby-char, .back-btn, .test-room-char, .online-lobby-row, .inf-slot .menu-btn, .boon-card, input[type=range], select',
  menuNav(dt) {
    if (this.device !== 'gamepad') return;
    const overlay = document.getElementById('overlay');
    const els = [...overlay.querySelectorAll(this.CLICKABLE)].filter((e) => e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden');
    // un panneau par-dessus le jeu (pause, marchand, resultats) : on ne navigue que dedans
    const top = [...overlay.querySelectorAll('.panel')].pop();
    const list = top ? els.filter((e) => top.contains(e)) : els;
    if (!list.length) { this.clearFocus(); return; }
    if (!this._focus || !list.includes(this._focus)) this.setFocus(list[0]);
    const P = this.pad;
    const dirX = P.move.x, dirY = P.move.y;
    this._menuRepeat -= dt;
    if ((Math.abs(dirX) > 0.5 || Math.abs(dirY) > 0.5) && this._menuRepeat <= 0) {
      const f = this._focus;
      if (f.tagName === 'INPUT' && Math.abs(dirX) > 0.5 && Math.abs(dirY) < 0.5) {
        f.value = String(Number(f.value) + Math.sign(dirX) * (Number(f.step) || 1) * 5);
        f.dispatchEvent(new Event('input'));
      } else {
        const next = this.neighbor(list, f, Math.abs(dirX) > Math.abs(dirY) ? Math.sign(dirX) : 0, Math.abs(dirY) >= Math.abs(dirX) ? Math.sign(dirY) : 0);
        if (next) { this.setFocus(next); Audio2.uiHover(); }
      }
      this._menuRepeat = 0.18;
    }
    if (!(Math.abs(dirX) > 0.5 || Math.abs(dirY) > 0.5)) this._menuRepeat = 0;
    if (this.padPressed(PAD.A) && this._focus) this._focus.click();
    if (this.padPressed(PAD.B)) {
      const back = (top || overlay).querySelector('.back-btn');
      if (back) back.click();
      else if (Game.state === STATE.INFINITE && Infinite.shopOpen) Infinite.closeShop();
      else if (Game.paused) Game.togglePause();
    }
  },
  neighbor(list, from, dx, dy) {
    const r0 = from.getBoundingClientRect();
    const c0 = { x: r0.left + r0.width / 2, y: r0.top + r0.height / 2 };
    let best = null, bestS = Infinity;
    for (const e of list) {
      if (e === from) continue;
      const r = e.getBoundingClientRect();
      const c = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      const vx = c.x - c0.x, vy = c.y - c0.y;
      const along = vx * dx + vy * dy;
      if (along <= 4) continue;
      const across = Math.abs(vx * dy - vy * dx);
      const s = along + across * 2.2;
      if (s < bestS) { bestS = s; best = e; }
    }
    return best;
  },
  setFocus(el) {
    if (this._focus) this._focus.classList.remove('pad-focus');
    this._focus = el;
    if (el) { el.classList.add('pad-focus'); el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  },
  clearFocus() { if (this._focus) this._focus.classList.remove('pad-focus'); this._focus = null; },

  // A appeler a chaque image (Game.loop) : manette, navigation des menus, viseur.
  update(dt) {
    this.pollPad();
    const inGameplay = Game.isGameplayState() && !Game.paused && !(Game.state === STATE.INFINITE && Infinite.shopOpen) && !UI.roundEndShown && !document.querySelector('#overlay .panel');
    if (!inGameplay) this.menuNav(dt);
    else this.clearFocus();
    if (inGameplay && this.pausePressed()) {
      if (Game.state === STATE.ONLINE_GAME) OnlineUI.toggleLeaveMenu();
      else if ([STATE.INFINITE].includes(Game.state)) Game.togglePause();
      else if (Game.state === STATE.TUTORIAL) Tutorial.skip();
      else if (Game.state !== STATE.MENU) Game.goToMenu();
    } else if (!inGameplay && this.padPressed(PAD.START) && Game.paused) Game.togglePause();
    const tui = document.getElementById('touch-ui');
    tui.classList.toggle('show', this.device === 'touch' && inGameplay);
    tui.classList.toggle('gated', !!(Game.world && Game.world.abilityGate) || Game.state === STATE.MENU);
    // viseur DOM : suit le point vise a la manette / au doigt
    if (this.device !== 'keyboard' && inGameplay && Game.world && Game.world.player && UI._cursorCanvas) {
      const w = Game.world, z = w.zoom || 1, a = w.player.aim;
      UI._cursorCanvas.style.display = 'block';
      UI._cursorCanvas.style.transform = `translate(${(a.x - w.camera.x) * z - 16}px, ${(a.y - w.camera.y) * z - 16}px)`;
    }
  },

  // ---------------- commandes tactiles ----------------
  buildTouchUI() {
    const root = document.createElement('div');
    root.id = 'touch-ui';
    root.innerHTML = `
      <div class="tj tj-left"><div class="tj-knob"></div></div>
      <div class="tj tj-right"><div class="tj-knob"></div><span>⌖</span></div>
      <div class="tb tb-ab" data-k="ab">C</div>
      <div class="tb tb-small tb-a1" data-k="a1">1</div>
      <div class="tb tb-small tb-a2" data-k="a2">2</div>
      <div class="tb tb-small tb-a3" data-k="a3">3</div>
      <div class="tb tb-pause" data-k="pause">❚❚</div>`;
    document.body.appendChild(root);
    const T = this.touch;
    const sticks = { left: root.querySelector('.tj-left'), right: root.querySelector('.tj-right') };
    const knob = (side, x, y) => { sticks[side].querySelector('.tj-knob').style.transform = `translate(${x * 38}px, ${y * 38}px)`; };
    const stickVec = (el, t) => {
      const r = el.getBoundingClientRect();
      let x = (t.clientX - (r.left + r.width / 2)) / (r.width / 2), y = (t.clientY - (r.top + r.height / 2)) / (r.height / 2);
      const l = Math.hypot(x, y);
      if (l > 1) { x /= l; y /= l; }
      return { x, y, mag: Math.min(1, l) };
    };
    const onStart = (e) => {
      for (const t of e.changedTouches) {
        const el = document.elementFromPoint(t.clientX, t.clientY);
        if (!el) continue;
        const stick = el.closest('.tj'), btn = el.closest('.tb');
        if (stick) { T.ids[t.identifier] = stick === sticks.left ? 'left' : 'right'; }
        else if (btn) { T.ids[t.identifier] = 'btn:' + btn.dataset.k; T.btn[btn.dataset.k] = true; btn.classList.add('on'); }
        else continue;
        e.preventDefault();
        onMove({ changedTouches: [t], preventDefault() {} });
      }
    };
    const onMove = (e) => {
      for (const t of e.changedTouches) {
        const who = T.ids[t.identifier];
        if (who === 'left') { const v = stickVec(sticks.left, t); T.move = { x: v.mag > 0.15 ? v.x : 0, y: v.mag > 0.15 ? v.y : 0 }; knob('left', v.x, v.y); }
        else if (who === 'right') { const v = stickVec(sticks.right, t); T.aim = v; T.attack = v.mag > 0.15; knob('right', v.x, v.y); }
        else continue;
        e.preventDefault();
      }
    };
    const onEnd = (e) => {
      for (const t of e.changedTouches) {
        const who = T.ids[t.identifier];
        if (!who) continue;
        delete T.ids[t.identifier];
        if (who === 'left') { T.move = { x: 0, y: 0 }; knob('left', 0, 0); }
        else if (who === 'right') { T.aim = { x: 0, y: 0, mag: 0 }; T.attack = false; knob('right', 0, 0); }
        else { const k = who.slice(4); T.btn[k] = false; const b = root.querySelector(`[data-k="${k}"]`); if (b) b.classList.remove('on'); }
      }
    };
    root.addEventListener('touchstart', onStart, { passive: false });
    root.addEventListener('touchmove', onMove, { passive: false });
    root.addEventListener('touchend', onEnd);
    root.addEventListener('touchcancel', onEnd);
    // toucher le terrain ne doit pas simuler de clic souris (sinon attaque au mauvais endroit)
    const canvas = document.getElementById('game');
    canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  },
};
