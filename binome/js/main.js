'use strict';
/* =========================================================
   BINÔME — démarrage et entrées (souris, tactile, clavier)
   ========================================================= */
(function () {
  try { const a = parseFloat(localStorage.getItem('binome_anim')); if (a > 0) ANIM = a; } catch (e) { }
  UI.reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  Render.init($('#board'));
  $('#btn-ch-help').innerHTML = icon('help', 18);
  $('#btn-ch-menu').innerHTML = icon('menu', 18);
  $('#btn-cb-menu').innerHTML = icon('menu', 18);
  $('#btn-atelier').innerHTML = `${icon('anvil', 16)} Atelier`;
  $('#btn-danger').innerHTML = `${icon('eye', 16)} Danger`;
  $('#btn-undo').innerHTML = `${icon('undo', 16)} Annuler`;

  /* ---------- écrans ---------- */
  $('#btn-continue').onclick = () => {
    S = load(); if (!S) return UI.showTitle();
    Sfx.click();
    if (S.pending) { const card = S.pending; startCombat(card); UI.show('scr-combat'); UI.refreshCombat(); UI.toast('La salle en cours recommence.', '', 2200); }
    else UI.showChoice();
  };
  $('#btn-new').onclick = () => {
    Sfx.click();
    if (load()) UI.modal('Nouvelle partie ?', '<p>Ta partie actuelle (or, gravures, talents) sera remplacée.</p>', [{ label: 'Annuler', cls: 'ghost' }, { label: 'Recommencer', cls: 'danger', fn: () => UI.showPick() }]);
    else UI.showPick();
  };
  $('#btn-help').onclick = () => UI.showHelp();
  $('#btn-pick-back').onclick = () => UI.showTitle();
  $('#btn-start').onclick = () => {
    if (UI.pickSel.length !== 2) return;
    Sfx.door();
    newGame(UI.pickSel[0], UI.pickSel[1]);
    UI.showChoice([{ t: 'Chaque porte mène à une salle et donne une récompense. Les récompenses durent un certain nombre de salles.', c: 'dim' }]);
    let seen = false; try { seen = localStorage.getItem('binome_aide') === '1'; localStorage.setItem('binome_aide', '1'); } catch (e) { }
    if (!seen) UI.showHelp();
  };
  $('#btn-atelier').onclick = () => { Sfx.click(); UI.showAtelier(); };
  $('#btn-ch-help').onclick = () => UI.showHelp();
  $('#btn-ch-menu').onclick = () => UI.showMenu();
  $('#btn-cb-menu').onclick = () => UI.showMenu();

  /* ---------- combat : boutons ---------- */
  const endTurn = () => {
    if (!C || C.busy || C.phase !== 'hero' || C.ended) return;
    Sfx.click(); enemyPhase();
  };
  $('#btn-end').onclick = endTurn;
  $('#btn-undo').onclick = () => {
    if (!C || C.busy || C.phase !== 'hero') return;
    const hu = heroUnit(C.sel); if (hu && hu.preMove) { undoMove(hu); Sfx.click(); C.mode = null; UI.refreshCombat(); }
  };
  $('#btn-danger').onclick = () => { if (!C) return; C.danger = !C.danger; Sfx.click(); UI.refreshCombat(); };
  $('#btn-flee').onclick = () => {
    if (!C || C.busy || C.ended) return;
    const boss = C.boss;
    UI.modal(boss ? 'Abandonner le boss ?' : 'Fuir la salle ?', boss ? '<p>Le boss s’enfuit avec son or.</p>' : '<p>Tu quittes la salle sans récompense (la salle compte quand même, et les durées avancent).</p>',
      [{ label: 'Rester', cls: 'ghost' }, { label: boss ? 'Abandonner' : 'Fuir', cls: 'danger', fn: () => { if (!C) return; C.ended = boss ? 'fail' : 'flee'; finishCombat(); } }]);
  };

  // panneaux des héros (délégation, le HTML est reconstruit)
  for (const id of ['#hp-0', '#hp-1']) {
    const el = $(id);
    el.addEventListener('click', ev => {
      const b = ev.target.closest('.skb'); const p = ev.target.closest('.hp-in');
      if (b && b.dataset.s != null) { UI.selectSkill(+b.dataset.h, +b.dataset.s); return; }
      if (p) UI.selectHero(+p.dataset.h);
    });
    el.addEventListener('mouseover', ev => {
      const b = ev.target.closest('.skb');
      const v = b && b.dataset.s != null ? { hi: +b.dataset.h, slot: +b.dataset.s } : null;
      if (JSON.stringify(v) !== JSON.stringify(UI.hoverSkill)) { UI.hoverSkill = v; UI.updateInfo(); }
    });
    el.addEventListener('mouseleave', () => { UI.hoverSkill = null; UI.updateInfo(); });
  }

  /* ---------- plateau ---------- */
  const cv = $('#board');
  cv.addEventListener('pointermove', ev => {
    if (!C) return;
    const t = Render.tileAt(ev.clientX, ev.clientY);
    const same = (t && C.hover && t[0] === C.hover[0] && t[1] === C.hover[1]) || (!t && !C.hover);
    if (!same) { C.hover = t; UI.updateInfo(); }
  });
  cv.addEventListener('pointerleave', () => { if (C) { C.hover = null; UI.updateInfo(); } });
  cv.addEventListener('contextmenu', ev => { ev.preventDefault(); if (C && C.mode) { C.mode = null; C.slot = -1; UI.refreshCombat(); } });
  cv.addEventListener('pointerdown', async ev => {
    if (!C || ev.button === 2) return;
    const t = Render.tileAt(ev.clientX, ev.clientY); if (!t) return;
    // sur écran tactile : premier appui = aperçu, second = confirmation
    if (ev.pointerType === 'touch' && C.mode === 'skill' && !(C.hover && C.hover[0] === t[0] && C.hover[1] === t[1])) { C.hover = t; UI.updateInfo(); return; }
    C.hover = t;
    if (C.busy || C.phase !== 'hero' || C.ended) return;
    const [x, y] = t; const hu = heroUnit(C.sel); const o = unitAt(x, y);
    if (C.mode === 'skill' && hu) {
      const s = skillStats(hu.hero, C.slot);
      if (planSkill(hu, s, x, y)) { await useSkill(hu, C.slot, x, y); UI.afterAction(); return; }
      if (o && o.team === 'hero') { UI.selectHero(o.hero); return; }
      C.mode = null; C.slot = -1; UI.refreshCombat(); return;
    }
    if (o && o.team === 'hero' && o !== hu) {
      // déplacement sur l'allié avec la règle Relais
      if (hu && G().relais && hu.hasMove && heroMoveTiles(hu).has(key(x, y))) { await moveHero(hu, x, y); UI.afterAction(); return; }
      UI.selectHero(o.hero); return;
    }
    if (hu && hu.hasMove) {
      const m = heroMoveTiles(hu);
      if (m.has(key(x, y)) && !(x === hu.x && y === hu.y)) { await moveHero(hu, x, y); UI.afterAction(); return; }
    }
  });

  /* ---------- clavier ---------- */
  window.addEventListener('keydown', ev => {
    if ($('#modal').classList.contains('on')) { if (ev.key === 'Escape') { const g = $('#modal .modal-btns .ghost') || $('#modal .modal-btns .btn'); if (g) g.click(); } return; }
    if (!C || document.body.dataset.screen !== 'scr-combat') return;
    const k = ev.key.toLowerCase();
    if (k >= '1' && k <= '4') { UI.selectSkill(C.sel, +k - 1); ev.preventDefault(); }
    else if (k === 'tab') { ev.preventDefault(); UI.selectHero(1 - C.sel); }
    else if (k === ' ' || k === 'enter') { ev.preventDefault(); endTurn(); }
    else if (k === 'escape') { C.mode = null; C.slot = -1; UI.refreshCombat(); }
    else if (k === 'd') { C.danger = !C.danger; UI.refreshCombat(); }
    else if (k === 'z' || k === 'u') $('#btn-undo').click();
  });

  // rafraîchissement léger des panneaux pendant les animations
  setInterval(() => { if (C && document.body.dataset.screen === 'scr-combat') UI.refreshCombat(); }, 160);

  UI.showTitle();
})();
