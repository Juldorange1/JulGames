'use strict';
/* =========================================================
   TRIADE — manette (Xbox, PlayStation, Switch… via l'API Gamepad du navigateur)
   En combat : croix / stick gauche = curseur, A = valider, B = annuler, X = fin du tour,
               Y = annuler le déplacement, LB / RB = héros, LT / RT = compétence,
               Start = menu, Select = prévision.
   Ailleurs (écrans, fenêtres) : croix / stick = passer d'un bouton à l'autre, A = appuyer, B = retour.
   ========================================================= */
const Pad = (() => {
  const prev = {}; let rep = {}, active = false, focusEl = null;
  const key = k => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
  const modalOpen = () => document.getElementById('modal').classList.contains('on');
  const screen = () => document.body.dataset.screen;
  const visible = el => { const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth && getComputedStyle(el).visibility !== 'hidden'; };
  function candidates() {
    const root = modalOpen() ? document.getElementById('modal') : document.querySelector('.screen.on') || document.body;
    const sel = 'button:not([disabled]), .door, .pick-card, .opt, input[type=range], input[type=number], a.back';
    return [...root.querySelectorAll(sel)].filter(visible);
  }
  function setFocus(el) {
    if (focusEl) focusEl.classList.remove('pad-focus');
    focusEl = el; if (!el) return;
    el.classList.add('pad-focus'); el.focus({ preventScroll: true });
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (el.title || el.dataset.tip) UI.genericTip(el);
  }
  function move(dx, dy) {
    const list = candidates(); if (!list.length) return;
    if (!focusEl || !list.includes(focusEl)) { const pref = ['.opt', '.modal-btns .btn:not(.ghost)', '.door', '.pick-card', '#btn-continue:not([style*=none])', '#btn-new']; let el = null; for (const s of pref) { el = list.find(x => x.matches(s)); if (el) break; } setFocus(el || list[0]); return; }
    const a = focusEl.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let best = null, bs = 1e9;
    for (const el of list) {
      if (el === focusEl) continue;
      const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      const along = (x - ax) * dx + (y - ay) * dy; if (along <= 4) continue;
      const across = Math.abs((x - ax) * dy) + Math.abs((y - ay) * dx);
      const sc = along + across * 2.2;
      if (sc < bs) { bs = sc; best = el; }
    }
    if (best) setFocus(best);
  }
  function press() {
    if (!focusEl || !document.body.contains(focusEl)) { move(0, 1); return; }
    if (focusEl.type === 'range') return;
    focusEl.click();
    setTimeout(() => { if (focusEl && !document.body.contains(focusEl)) { focusEl = null; move(0, 1); } }, 60);
  }
  function back() {
    if (modalOpen()) { key('Escape'); return; }
    const scr = screen();
    if (scr === 'scr-pick') { document.getElementById('btn-pick-back').click(); return; }
    if (scr === 'scr-choice') { UI.showMenu(); return; }
  }
  function adjustRange(d) { if (focusEl && focusEl.type === 'range') { focusEl.value = +focusEl.value + d * (+focusEl.step || 0.05); focusEl.dispatchEvent(new Event('input')); } }
  function cycleSkill(d) {
    if (!C || C.phase !== 'hero') return;
    const h = S.heroes[C.sel]; if (!h) return;
    const slots = [0, 1, 2, 3].filter(i => h.slots[i]);
    const cur = C.mode === 'skill' ? slots.indexOf(C.slot) : (d > 0 ? -1 : 0);
    const n = slots[(cur + d + slots.length) % slots.length];
    if (n != null) UI.selectSkill(C.sel, n);
  }
  function edge(i, down) { const was = prev[i]; prev[i] = down; return down && !was; }
  function repeat(id, down, t) {   // répétition quand on maintient une direction
    if (!down) { delete rep[id]; return false; }
    if (!rep[id]) { rep[id] = t + 380; return true; }
    if (t >= rep[id]) { rep[id] = t + 120; return true; }
    return false;
  }
  function poll(t) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const p = [...pads].find(g => g && g.connected);
    if (p) {
      if (!active) { active = true; document.body.classList.add('pad-on'); UI.toast(tr('Manette connectée'), 'good', 1600); }
      const b = i => !!(p.buttons[i] && p.buttons[i].pressed);
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      const L = b(14) || ax < -0.55, R = b(15) || ax > 0.55, U = b(12) || ay < -0.55, D = b(13) || ay > 0.55;
      const inCombat = screen() === 'scr-combat' && !modalOpen() && C;
      if (inCombat) {
        if (repeat('l', L, t)) key('ArrowLeft'); if (repeat('r', R, t)) key('ArrowRight');
        if (repeat('u', U, t)) key('ArrowUp'); if (repeat('d', D, t)) key('ArrowDown');
        if (edge(0, b(0))) key('e');
        if (edge(1, b(1))) { if (C.mode) key('Escape'); }
        if (edge(2, b(2))) key(' ');
        if (edge(3, b(3))) key('z');
        if (edge(4, b(4))) { const hs = heroUnits().map(u => u.hero).sort((a, c) => a - c); if (hs.length) UI.selectHero(hs[(hs.indexOf(C.sel) - 1 + hs.length) % hs.length]); }
        if (edge(5, b(5))) key('Tab');
        if (edge(6, b(6))) cycleSkill(-1);
        if (edge(7, b(7))) cycleSkill(1);
        if (edge(8, b(8))) key('p');
        if (edge(9, b(9))) UI.showMenu();
      } else {
        if (repeat('l', L, t)) { if (focusEl && focusEl.type === 'range') adjustRange(-1); else move(-1, 0); }
        if (repeat('r', R, t)) { if (focusEl && focusEl.type === 'range') adjustRange(1); else move(1, 0); }
        if (repeat('u', U, t)) move(0, -1); if (repeat('d', D, t)) move(0, 1);
        if (edge(0, b(0))) press();
        if (edge(1, b(1))) back();
        for (const i of [2, 3, 4, 5, 6, 7, 8]) edge(i, b(i));
        if (edge(9, b(9))) { if (modalOpen()) key('Escape'); else if (screen() === 'scr-choice') UI.showMenu(); }
      }
    } else if (active) { active = false; document.body.classList.remove('pad-on'); setFocus(null); }
  }
  function frame(t) { poll(t); requestAnimationFrame(frame); }
  window.addEventListener('gamepadconnected', () => { });
  requestAnimationFrame(frame);
  // la souris reprend la main : on enlève la surbrillance de la manette
  window.addEventListener('mousemove', () => { if (focusEl) setFocus(null); }, { passive: true });
  return { poll, get active() { return active; } };
})();
