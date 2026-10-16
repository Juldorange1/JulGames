'use strict';
/* =========================================================
   TRIADE — démarrage et entrées (souris, tactile, clavier)
   ========================================================= */
(function () {
  try { const a = parseFloat(localStorage.getItem('binome_anim')); if (a > 0) ANIM = a; } catch (e) { }
  try { UI.autoEnd = localStorage.getItem('binome_auto') !== '0'; UI.showPreview = localStorage.getItem('binome_prev') !== '0'; } catch (e) { }
  UI.reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  Render.init($('#board'));
  $('#btn-ch-help').innerHTML = icon('help', 18);
  $('#btn-ch-codex').innerHTML = icon('rule', 18);
  $('#btn-cb-codex').innerHTML = icon('rule', 16);
  $('#btn-ch-menu').innerHTML = icon('menu', 18);
  $('#btn-cb-menu').innerHTML = icon('menu', 18);
  $('#btn-atelier').innerHTML = `${icon('anvil', 16)} Atelier`;
  $('#btn-danger').innerHTML = `${icon('eye', 16)} Danger`;
  $('#btn-preview').innerHTML = `${icon('arrow', 16)} Prévision`;
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
  $('#btn-daily').onclick = () => { Sfx.click(); UI.showDaily(); };
  $('#btn-feats').onclick = () => { Sfx.click(); UI.showFeats(); };
  $('#btn-pick-back').onclick = () => UI.showTitle();
  $('#btn-start').onclick = () => {
    if (UI.pickSel.length !== NB_HEROES) return;
    Sfx.door();
    newGame(UI.pickSel.slice(), UI.pickLevel);
    try { localStorage.setItem('binome_level', String(UI.pickLevel)); } catch (e) { }
    UI.showChoice([{ t: 'Chaque porte mène à une salle et donne une récompense. Les récompenses durent un certain nombre de salles.', c: 'dim' }]);
    let seen = false; try { seen = localStorage.getItem('binome_aide') === '1'; localStorage.setItem('binome_aide', '1'); } catch (e) { }
    if (!seen) UI.showHelp();
  };
  $('#btn-atelier').onclick = () => { Sfx.click(); UI.showAtelier(); };
  $('#ch-level').onclick = () => { Sfx.click(); UI.showSettings(); };
  // descriptions au survol de tout élément de l'interface
  document.addEventListener('mouseover', ev => {
    const el = ev.target.closest && ev.target.closest('[title],[data-tip]');
    if (!el || el === UI.tipEl) return;
    UI.genericTip(el);
  });
  document.addEventListener('mouseout', ev => {
    if (UI.tipEl && !(ev.relatedTarget && UI.tipEl.contains(ev.relatedTarget))) { UI.tipEl = null; UI.placeTip('', null); if (C) UI.updateInfo(); }
  });
  $('#btn-ch-help').onclick = () => UI.showHelp();
  $('#btn-ch-codex').onclick = () => UI.showCodex();
  $('#btn-cb-codex').onclick = () => UI.showCodex();
  $('#btn-ch-menu').onclick = () => UI.showMenu();
  $('#btn-cb-menu').onclick = () => UI.showMenu();

  /* ---------- combat : boutons ---------- */
  const endTurn = () => {
    if (!C || C.busy || C.phase !== 'hero' || C.ended) return;
    Sfx.click(); enemyPhase();
  };
  const undo = () => {
    if (!C || C.busy || C.phase !== 'hero' || !UNDO) return;
    undoMove(); Sfx.click(); UI.refreshCombat();
  };
  const togglePreview = () => {
    if (!C) return;
    C.showPreview = UI.showPreview = !C.showPreview;
    try { localStorage.setItem('binome_prev', UI.showPreview ? '1' : '0'); } catch (e) { }
    Sfx.click(); UI.refreshCombat();
  };
  $('#btn-end').onclick = endTurn;
  $('#btn-undo').onclick = undo;
  $('#btn-preview').onclick = togglePreview;
  $('#btn-danger').onclick = () => { if (!C) return; C.danger = !C.danger; Sfx.click(); UI.refreshCombat(); };
  $('#btn-flee').onclick = () => {
    if (!C || C.busy || C.ended) return;
    const boss = C.boss;
    UI.modal(boss ? 'Abandonner le boss ?' : 'Fuir la salle ?', boss ? '<p>Le boss s’enfuit avec son or.</p>' : '<p>Tu quittes la salle sans récompense (la salle compte quand même, et les durées avancent).</p>',
      [{ label: 'Rester', cls: 'ghost' }, { label: boss ? 'Abandonner' : 'Fuir', cls: 'danger', fn: () => { if (!C) return; C.ended = boss ? 'fail' : 'flee'; finishCombat(); } }]);
  };

  // panneaux des héros (délégation, le HTML est reconstruit)
  for (const id of ['#hp-0', '#hp-1', '#hp-2']) {
    const el = $(id);
    el.addEventListener('click', ev => {
      const b = ev.target.closest('.skb'); const p = ev.target.closest('.hp-in');
      if (b && b.dataset.s != null) { UI.selectSkill(+b.dataset.h, +b.dataset.s); return; }
      if (p) UI.selectHero(+p.dataset.h);
    });
    el.addEventListener('mouseover', ev => {
      const b = ev.target.closest('.skb');
      const v = b && b.dataset.s != null ? { hi: +b.dataset.h, slot: +b.dataset.s } : null;
      if (JSON.stringify(v) !== JSON.stringify(UI.hoverSkill)) { UI.hoverSkill = v; UI.hoverEl = b; UI.updateInfo(); }
    });
    el.addEventListener('mouseleave', () => { UI.hoverSkill = null; UI.updateInfo(); });
  }

  /* ---------- plateau ---------- */
  async function clickTile(x, y) {
    if (!C || C.busy || C.phase !== 'hero' || C.ended) return;
    const hu = heroUnit(C.sel); const o = unitAt(x, y);
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
  }
  const cv = $('#board');
  cv.addEventListener('pointermove', ev => {
    if (!C) return;
    const t = Render.tileAt(ev.clientX, ev.clientY);
    const same = (t && C.hover && t[0] === C.hover[0] && t[1] === C.hover[1]) || (!t && !C.hover);
    if (!same) { C.hover = t; UI.updateInfo(); }
  });
  cv.addEventListener('pointerleave', () => { if (C) { C.hover = null; UI.updateInfo(); } });
  cv.addEventListener('contextmenu', ev => { ev.preventDefault(); if (C && C.mode) { C.mode = null; C.slot = -1; UI.refreshCombat(); } });
  cv.addEventListener('pointerdown', ev => {
    if (!C || ev.button === 2) return;
    const t = Render.tileAt(ev.clientX, ev.clientY); if (!t) return;
    // sur écran tactile : premier appui = aperçu, second = confirmation
    if (ev.pointerType === 'touch' && C.mode === 'skill' && !(C.hover && C.hover[0] === t[0] && C.hover[1] === t[1])) { C.hover = t; UI.updateInfo(); return; }
    C.hover = t;
    clickTile(t[0], t[1]);
  });

  // le son ne peut démarrer qu'après une action de l'utilisateur
  const unlock = () => { Sfx.unlock(); Music.unlock(); };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  /* ---------- clavier ---------- */
  window.addEventListener('keydown', ev => {
    const k = ev.key.toLowerCase();
    if (ev.ctrlKey || ev.altKey || ev.metaKey) return;
    if (ev.target && ev.target.tagName === 'INPUT') { if (k === 'enter') ev.target.blur(); return; }
    // fenêtre ouverte : chiffres = options, Échap = fermer
    if ($('#modal').classList.contains('on')) {
      if (k === 'escape') { const g = $('#modal .modal-btns .ghost') || $('#modal .modal-btns .btn'); if (g) g.click(); }
      else if (k >= '1' && k <= '9') { const o = $('#modal').querySelectorAll('.opt')[+k - 1]; if (o && !o.disabled) { ev.preventDefault(); o.click(); } }
      else if (k === 'enter') { const b = $('#modal .modal-btns .btn:not(.ghost)') || $('#modal .modal-btns .btn'); if (b) { ev.preventDefault(); b.click(); } }
      return;
    }
    const scr = document.body.dataset.screen;
    if (k === 'm') { Sfx.setMuted(!Sfx.muted); UI.toast(Sfx.muted ? 'Son coupé' : 'Son activé', '', 1000); return; }
    if (k === 'v') { UI.cycleSpeed(); return; }
    if (k === 'h') { UI.showHelp(); return; }
    if (k === 'k' && S) { UI.showCodex(); return; }
    if (scr === 'scr-choice') {
      if (k >= '1' && k <= '9') { const d = document.querySelectorAll('#ch-doors .door')[+k - 1]; if (d) { ev.preventDefault(); d.click(); } }
      else if (k === 'a') $('#btn-atelier').click();
      else if (k === 'escape') UI.showMenu();
      return;
    }
    if (scr === 'scr-title' && k === 'enter') { const c = $('#btn-continue'); (c.style.display !== 'none' ? c : $('#btn-new')).click(); return; }
    if (!C || scr !== 'scr-combat') return;
    if (ev.repeat && !k.startsWith('arrow')) return;
    if (k >= '1' && k <= '4') { UI.selectSkill(C.sel, +k - 1); ev.preventDefault(); }
    else if (k === 'tab' || k === 'q') { ev.preventDefault(); const hs = heroUnits().map(u => u.hero).sort((a, b) => a - b); if (hs.length) UI.selectHero(hs[(hs.indexOf(C.sel) + 1) % hs.length]); }
    else if (k === ' ' || k === 'enter' || k === 'f') { ev.preventDefault(); endTurn(); }
    else if (k === 'escape') { if (C.mode) { C.mode = null; C.slot = -1; UI.refreshCombat(); } else UI.showMenu(); }
    else if (k === 'd') { C.danger = !C.danger; UI.refreshCombat(); }
    else if (k === 'p') togglePreview();
    else if (k === 'z' || k === 'u') undo();
    else if (k.startsWith('arrow')) {
      ev.preventDefault();
      const hu = heroUnit(C.sel);
      const h = C.hover || (hu ? [hu.x, hu.y] : [0, 0]);
      const d = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] }[k];
      C.hover = [clamp(h[0] + d[0], 0, GRID_W - 1), clamp(h[1] + d[1], 0, GRID_H - 1)];
      UI.updateInfo();
    }
    else if (k === 'e' && C.hover) clickTile(C.hover[0], C.hover[1]);
  });

  // rafraîchissement léger des panneaux pendant les animations
  setInterval(() => { if (C && document.body.dataset.screen === 'scr-combat') UI.refreshCombat(); }, 160);

  UI.showTitle();
})();
