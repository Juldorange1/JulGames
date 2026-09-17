// Orchestrateur de l'application : machine à états entre les écrans, entrées clavier
// / souris pendant le combat, et boucle de rendu.
const App = {
  profile: null,
  screen: 'title',
  game: null,
  canvas: null, ctx: null,
  selectedDifficulty: 1,
  draftSkills: [], draftSpecs: [], chosenSpecIdx: [],
  loadoutSelection: null,
  wheelConfig: null,
  rewardDone: false,
  lastTs: 0,
  keybinds: null,
  rebindingAction: null,
  rulesReturnScreen: 'titleScreen',

  init() {
    this.profile = Progression.load();
    this.keybinds = KeyBindings.load();
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    window.addEventListener('resize', () => this.resizeCanvas());
    this.resizeCanvas();
    this.wireStaticButtons();
    this.showScreen('titleScreen');
    requestAnimationFrame(ts => this.loop(ts));
  },

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  showScreen(id) {
    for (const el of document.querySelectorAll('.screen')) el.hidden = (el.id !== id);
    this.screen = id;
  },

  wireStaticButtons() {
    document.getElementById('btnPlay').onclick = () => this.goDifficulty();
    document.getElementById('btnLoadout').onclick = () => this.goLoadout();
    document.getElementById('btnLoadoutBack').onclick = () => this.showScreen('titleScreen');
    document.getElementById('btnDiffBack').onclick = () => this.showScreen('titleScreen');
    document.getElementById('btnRules').onclick = () => this.goRules('titleScreen');
    document.getElementById('btnRulesBack').onclick = () => { this.rebindingAction = null; this.showScreen(this.rulesReturnScreen); };
    document.getElementById('btnResetKeybinds').onclick = () => { this.keybinds = KeyBindings.reset(); if (this.game) this.game.input.binds = this.keybinds; this.renderKeybinds(); };
    document.getElementById('btnStartFight').onclick = () => this.startFight();
    document.getElementById('btnResume').onclick = () => { this.game.paused = false; document.getElementById('pauseOverlay').hidden = true; };
    document.getElementById('btnAbandon').onclick = () => { this.game = null; document.getElementById('pauseOverlay').hidden = true; this.showScreen('titleScreen'); };
    document.getElementById('btnPauseRules').onclick = () => this.goRules('fightScreen');
    document.getElementById('btnBackToMenu').onclick = () => { this.game = null; this.showScreen('titleScreen'); };
    document.getElementById('btnRollSkill').onclick = () => this.rollWheel('skill');
    document.getElementById('btnRollSpec').onclick = () => this.rollWheel('spec');
    document.getElementById('detailModal').onclick = e => { if (e.target.id === 'detailModal') this.hideDetail(); };

    // Un seul geste utilisateur suffit à débloquer l'audio (politique des navigateurs) ;
    // un seul écouteur délégué couvre tous les boutons/cartes sans instrumenter chaque handler.
    document.body.addEventListener('pointerdown', () => Audio.unlock(), { once: true });
    document.body.addEventListener('click', e => {
      if (e.target.closest('.stepper button, .card-info-btn')) return;
      if (e.target.closest('.card, .diff-card, .keybind-btn')) SFX.play('uiSelect');
      else if (e.target.closest('.btn')) SFX.play('uiClick');
    });

    window.addEventListener('keydown', e => this.onKeyDown(e));
    window.addEventListener('keyup', e => { if (this.game) this.game.input.keys[e.key.toLowerCase()] = false; });
    this.canvas.addEventListener('mousemove', e => this.onMouseMove(e));
    this.canvas.addEventListener('mousedown', e => this.onMouseDown(e));
    window.addEventListener('mouseup', e => { if (e.button === 0) this.onMouseUp(e); });
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    this.canvas.addEventListener('wheel', e => this.onWheel(e), { passive: false });
  },

  onKeyDown(e) {
    const k = e.key.toLowerCase();
    if (this.rebindingAction) {
      e.preventDefault();
      const conflict = KeyBindings.rebind(this.keybinds, this.rebindingAction, k);
      this.rebindingAction = null;
      if (this.game) this.game.input.binds = this.keybinds;
      this.renderKeybinds();
      if (conflict) ScreenParts.toast(`« ${KeyBindings.keyDisplay(k)} » était utilisée par ${KeyBindings.actionLabels[conflict]} — les deux touches ont été échangées.`);
      return;
    }
    if (!this.game || this.screen !== 'fightScreen') return;
    this.game.input.keys[k] = true;
    if (e.repeat) return;
    const binds = this.game.input.binds;
    if (k === binds.pause) { this.togglePause(); return; }
    // La touche ÉQUIPE la compétence (change la sélection) ; seul le clic gauche l'active.
    const slotKey = Object.keys(binds).find(a => a.startsWith('skill') && binds[a] === k);
    if (slotKey && !this.game.paused && !this.game.result) this.game.selectedSlot = parseInt(slotKey.slice(-1), 10) - 1;
  },

  onMouseMove(e) {
    if (!this.game) return;
    const rect = this.canvas.getBoundingClientRect();
    this.game.input.mouseWorld = Render.screenToWorld(this.game, this.canvas, e.clientX - rect.left, e.clientY - rect.top);
  },

  onMouseDown(e) {
    if (!this.game || this.screen !== 'fightScreen' || e.button !== 0 || this.game.paused || this.game.result) return;
    this.game.input.mouseDown = true;
    const slot = this.game.activeSkillSlots[this.game.selectedSlot];
    if (!SkillRuntime.canUse(this.game, this.game.selectedSlot)) return;
    if (slot.def.charge) {
      // Compétence à charge (Tir chargé, Foudre ciblée...) : maintenir enfoncé
      // accumule la charge, le tir part au relâchement (onMouseUp).
      this.game.player.charging = { slotIndex: this.game.selectedSlot, startTime: this.game.time };
    } else {
      SkillRuntime.use(this.game, this.game.selectedSlot);
    }
  },

  onMouseUp() {
    if (!this.game) { return; }
    this.game.input.mouseDown = false;
    const charging = this.game.player.charging;
    if (!charging) return;
    this.game.player.charging = null;
    const slot = this.game.activeSkillSlots[charging.slotIndex];
    if (!slot || slot.charges <= 0) return;
    const maxTime = (slot.def.baseStats && slot.def.baseStats.maxChargeTime) || 1;
    const ratio = clamp((this.game.time - charging.startTime) / maxTime, 0, 1);
    SkillRuntime.use(this.game, charging.slotIndex, ratio);
  },

  // Seule la molette change la compétence équipée en dehors des touches dédiées.
  onWheel(e) {
    if (!this.game || this.screen !== 'fightScreen') return;
    e.preventDefault();
    const dir = e.deltaY > 0 ? 1 : -1;
    this.game.selectedSlot = (this.game.selectedSlot + dir + 4) % 4;
  },

  togglePause() {
    if (!this.game || this.game.result) return;
    this.game.paused = !this.game.paused;
    document.getElementById('pauseOverlay').hidden = !this.game.paused;
  },

  // ---------------- Détail d'une compétence / spécificité ----------------
  showDetail(kind, id, rarityId) {
    document.getElementById('detailModalContent').innerHTML = ScreenParts.detailHTML(kind, id, rarityId) +
      '<button class="btn btn-primary" id="btnDetailClose" style="margin-top:14px">Fermer</button>';
    document.getElementById('btnDetailClose').onclick = () => this.hideDetail();
    document.getElementById('detailModal').hidden = false;
  },

  hideDetail() { document.getElementById('detailModal').hidden = true; },

  // ---------------- Règles & touches ----------------
  goRules(returnScreen) {
    this.rulesReturnScreen = returnScreen || this.screen;
    this.rebindingAction = null;
    this.renderKeybinds();
    this.showScreen('rulesScreen');
  },

  renderKeybinds() {
    const el = document.getElementById('keybindList');
    el.innerHTML = KeyBindings.actionOrder.map(action => `
      <div class="keybind-row">
        <span>${KeyBindings.actionLabels[action]}</span>
        <button class="btn keybind-btn ${this.rebindingAction === action ? 'listening' : ''}" data-action="${action}">
          ${this.rebindingAction === action ? 'Appuie sur une touche…' : KeyBindings.keyDisplay(this.keybinds[action])}
        </button>
      </div>`).join('');
    for (const btn of el.querySelectorAll('.keybind-btn')) {
      btn.onclick = () => { this.rebindingAction = btn.dataset.action; this.renderKeybinds(); };
    }
  },

  // ---------------- Loadout ----------------
  goLoadout() {
    this.loadoutSelection = null;
    this.renderLoadout();
    this.showScreen('loadoutScreen');
  },

  renderLoadout() {
    const p = this.profile;
    document.getElementById('skillCount').textContent = `(${p.equippedSkills.length}/10)`;
    document.getElementById('specCount').textContent = `(${p.equippedSpecs.length}/10)`;

    const eqSkills = document.getElementById('equippedSkills');
    eqSkills.innerHTML = p.equippedSkills.map(id => ScreenParts.skillCard(id, p.ownedSkills[id], { equipped: true, selected: this.loadoutSelection?.kind === 'skill' && this.loadoutSelection.id === id })).join('');
    const poolSkills = document.getElementById('poolSkills');
    const benchedSkills = Progression.ownedList(p, 'skill').filter(o => !p.equippedSkills.includes(o.id));
    poolSkills.innerHTML = benchedSkills.length
      ? benchedSkills.map(o => ScreenParts.skillCard(o.id, o.rarityId, { selected: this.loadoutSelection?.kind === 'skill' && this.loadoutSelection.id === o.id })).join('')
      : '<p class="card-desc">Aucune compétence en réserve pour le moment.</p>';

    const eqSpecs = document.getElementById('equippedSpecs');
    eqSpecs.innerHTML = p.equippedSpecs.map(id => ScreenParts.specCard(id, p.ownedSpecs[id], { equipped: true, selected: this.loadoutSelection?.kind === 'spec' && this.loadoutSelection.id === id })).join('');
    const poolSpecs = document.getElementById('poolSpecs');
    const benchedSpecs = Progression.ownedList(p, 'spec').filter(o => !p.equippedSpecs.includes(o.id));
    poolSpecs.innerHTML = benchedSpecs.length
      ? benchedSpecs.map(o => ScreenParts.specCard(o.id, o.rarityId, { selected: this.loadoutSelection?.kind === 'spec' && this.loadoutSelection.id === o.id })).join('')
      : '<p class="card-desc">Aucune spécificité en réserve pour le moment.</p>';

    for (const el of eqSkills.querySelectorAll('[data-skill-id]')) el.onclick = () => this.clickLoadoutCard('skill', el.dataset.skillId, true);
    for (const el of poolSkills.querySelectorAll('[data-skill-id]')) el.onclick = () => this.clickLoadoutCard('skill', el.dataset.skillId, false);
    for (const el of eqSpecs.querySelectorAll('[data-spec-id]')) el.onclick = () => this.clickLoadoutCard('spec', el.dataset.specId, true);
    for (const el of poolSpecs.querySelectorAll('[data-spec-id]')) el.onclick = () => this.clickLoadoutCard('spec', el.dataset.specId, false);
  },

  clickLoadoutCard(kind, id, isEquipped) {
    const sel = this.loadoutSelection;
    if (!sel) { this.loadoutSelection = { kind, id, isEquipped }; this.renderLoadout(); return; }
    if (sel.kind !== kind) { this.loadoutSelection = { kind, id, isEquipped }; this.renderLoadout(); return; }
    if (sel.id === id) { this.loadoutSelection = null; this.renderLoadout(); return; }
    if (sel.isEquipped === isEquipped) { this.loadoutSelection = { kind, id, isEquipped }; this.renderLoadout(); return; }
    // un équipé + un en réserve sélectionnés : on échange leurs emplacements
    const list = kind === 'skill' ? this.profile.equippedSkills : this.profile.equippedSpecs;
    const equippedId = sel.isEquipped ? sel.id : id;
    const benchedId = sel.isEquipped ? id : sel.id;
    const idx = list.indexOf(equippedId);
    if (idx >= 0) list[idx] = benchedId;
    Progression.save(this.profile);
    this.loadoutSelection = null;
    this.renderLoadout();
  },

  // ---------------- Difficulté ----------------
  goDifficulty() {
    const tierColor = { Facile: '#4ade80', Modérée: '#f5e042', Difficile: '#ff8a4a', Extrême: '#f87171', Cauchemar: '#c084fc' };
    const grid = document.getElementById('diffGrid');
    grid.innerHTML = DIFFICULTY_LEVELS.map(d => {
      const c = tierColor[d.label];
      return `<div class="diff-card" data-level="${d.level}" style="border-left:3px solid ${c}">
        <div class="diff-num" style="color:${c}">${d.level}</div>
        <div class="diff-label" style="color:${c}">${d.label}</div>
        <div class="diff-pts">+${d.points} pts</div>
      </div>`;
    }).join('');
    for (const el of grid.querySelectorAll('.diff-card')) {
      el.onclick = () => this.startPrefight(parseInt(el.dataset.level, 10));
    }
    this.showScreen('difficultyScreen');
  },

  // ---------------- Pré-combat ----------------
  startPrefight(level) {
    this.selectedDifficulty = level;
    const p = this.profile;
    const skillIds = shuffle(p.equippedSkills).slice(0, 4);
    this.draftSkills = skillIds.map(id => ({ skillId: id, rarityId: p.ownedSkills[id] }));
    const specIds = shuffle(p.equippedSpecs).slice(0, 4);
    this.draftSpecs = specIds.map(id => ({ specId: id, rarityId: p.ownedSpecs[id] }));
    this.chosenSpecIdx = [];
    document.getElementById('pfDiff').textContent = level;
    this.renderPrefight();
    this.showScreen('prefightScreen');
  },

  renderPrefight() {
    document.getElementById('pfSkills').innerHTML = this.draftSkills.map(s => ScreenParts.skillCard(s.skillId, s.rarityId)).join('');
    const specsEl = document.getElementById('pfSpecs');
    specsEl.innerHTML = this.draftSpecs.map((s, i) => ScreenParts.specCard(s.specId, s.rarityId, { selected: this.chosenSpecIdx.includes(i) })).join('');
    [...specsEl.children].forEach((el, i) => { el.onclick = () => this.toggleSpecDraft(i); });
    document.getElementById('btnStartFight').disabled = this.chosenSpecIdx.length !== 2;
  },

  toggleSpecDraft(i) {
    const idx = this.chosenSpecIdx.indexOf(i);
    if (idx >= 0) this.chosenSpecIdx.splice(idx, 1);
    else if (this.chosenSpecIdx.length < 2) this.chosenSpecIdx.push(i);
    this.renderPrefight();
  },

  startFight() {
    const chosenSpecs = this.chosenSpecIdx.map(i => this.draftSpecs[i]);
    this.game = Combat.createGame({ difficultyLevel: this.selectedDifficulty, drawnSkills: this.draftSkills, chosenSpecs });
    this.game.chosenSpecsForHud = chosenSpecs;
    this.game.input.mouseWorld = { x: this.game.player.x + 100, y: this.game.player.y };
    HUD.init(this.game);
    document.getElementById('pauseOverlay').hidden = true;
    this.showScreen('fightScreen');
  },

  // ---------------- Boucle ----------------
  // Le jeu entier tourne 8% plus vite : un seul point de mise à l'échelle du temps
  // simulé (déplacements, cooldowns, projectiles, durées de statut, animations —
  // tout dérive de dt/game.time) plutôt que de retoucher chaque système un par un.
  // Le clamp de sécurité s'applique AVANT le multiplicateur, sur le vrai temps écoulé.
  GAME_SPEED_MULT: 1.08,

  loop(ts) {
    const rawDt = Math.min(0.05, (ts - this.lastTs) / 1000 || 0);
    const dt = rawDt * this.GAME_SPEED_MULT;
    this.lastTs = ts;
    if (this.game && this.screen === 'fightScreen') {
      Combat.update(this.game, dt);
      Render.draw(this.ctx, this.canvas, this.game);
      HUD.update(this.game);
      if (this.game.result && !this._endingHandled) { this._endingHandled = true; setTimeout(() => this.onCombatEnd(), 550); }
    }
    requestAnimationFrame(t => this.loop(t));
  },

  // ---------------- Fin de combat ----------------
  onCombatEnd() {
    this._endingHandled = false;
    const won = this.game.result === 'victory';
    const title = document.getElementById('endTitle');
    title.textContent = won ? 'VICTOIRE' : 'DÉFAITE';
    title.className = won ? 'victory' : 'defeat';
    SFX.play(won ? 'victory' : 'defeat');
    document.getElementById('endDiff').textContent = `Difficulté : ${this.selectedDifficulty}`;
    document.getElementById('endPoints').textContent = `Points gagnés : ${this.game.pointsEarned}`;
    document.getElementById('endWheelSection').hidden = !won;
    document.getElementById('rewardSection').hidden = true;
    document.getElementById('rewardSection').innerHTML = '';
    document.getElementById('btnRollSkill').disabled = false;
    document.getElementById('btnRollSpec').disabled = false;

    if (won) {
      this.wheelConfig = Wheel.createConfig();
      this.renderWheelConfig();
    }
    this.showScreen('endScreen');
  },

  renderWheelConfig() {
    const pts = this.game.pointsEarned;
    document.getElementById('wheelPointsAvail').textContent = pts - this.wheelConfig.pointsSpent;
    const el = document.getElementById('wheelConfig');
    el.innerHTML = RARITIES.map((r, i) => {
      const prob = this.wheelConfig.probs[i];
      const cost = RARITY_UPGRADE_COST[i];
      return `<div class="wheel-row">
        <span style="color:${r.color}">${r.name}</span>
        <div class="wheel-bar-track"><div class="wheel-bar-fill" style="width:${prob}%;background:${r.color}"></div></div>
        <span>${prob}%</span>
        <span>${i === 0 ? '—' : `coût ${cost}`}</span>
        <div class="stepper">
          <button data-act="dec" data-i="${i}" ${i === 0 ? 'disabled' : ''}>−</button>
          <button data-act="inc" data-i="${i}" ${i === 0 ? 'disabled' : ''}>+</button>
        </div>
      </div>`;
    }).join('');
    for (const btn of el.querySelectorAll('button')) {
      btn.onclick = () => {
        const i = parseInt(btn.dataset.i, 10);
        if (btn.dataset.act === 'inc') Wheel.increase(this.wheelConfig, pts, i);
        else Wheel.decrease(this.wheelConfig, i);
        SFX.play('wheelTick');
        this.renderWheelConfig();
      };
    }
  },

  rollWheel(kind) {
    document.getElementById('btnRollSkill').disabled = true;
    document.getElementById('btnRollSpec').disabled = true;
    const rarityId = Wheel.roll(this.wheelConfig);
    const id = kind === 'skill' ? Progression.randomSkillId() : Progression.randomSpecId();
    const { bestRarity } = Progression.grantReward(this.profile, kind, id, rarityId);
    SFX.play('reward', { rarityId });
    this.showReward(kind, id, rarityId, bestRarity);
  },

  showReward(kind, id, rolledRarity, bestRarity) {
    const section = document.getElementById('rewardSection');
    section.hidden = false;
    const card = kind === 'skill' ? ScreenParts.skillCard(id, bestRarity) : ScreenParts.specCard(id, bestRarity);
    const alreadyEquipped = Progression.isEquipped(this.profile, kind, id);
    let html = `<h3>Récompense (tirage : ${RARITIES[rolledRarity].name})</h3><div class="reward-card">${card}</div>`;
    if (alreadyEquipped) {
      html += `<p class="card-desc">Déjà équipée — rareté actuelle : ${RARITIES[bestRarity].name}.</p>`;
      section.innerHTML = html;
    } else {
      const list = kind === 'skill' ? this.profile.equippedSkills : this.profile.equippedSpecs;
      html += `<p class="card-desc">Nouvel élément ! Remplace un emplacement équipé, ou garde-le en réserve.</p>
        <div class="replace-grid">${list.map(eqId => (kind === 'skill' ? ScreenParts.skillCard(eqId, this.profile.ownedSkills[eqId]) : ScreenParts.specCard(eqId, this.profile.ownedSpecs[eqId]))).join('')}</div>
        <button class="btn" id="btnKeepBench" style="margin-top:10px">Garder en réserve</button>`;
      section.innerHTML = html;
      const grid = section.querySelector('.replace-grid');
      [...grid.children].forEach((el, i) => {
        el.onclick = () => {
          Progression.equip(this.profile, kind, id, list[i]);
          ScreenParts.toast('Équipement mis à jour.');
          section.innerHTML = `<h3>Récompense (tirage : ${RARITIES[rolledRarity].name})</h3><div class="reward-card">${card}</div><p class="card-desc">Équipée !</p>`;
        };
      });
      document.getElementById('btnKeepBench').onclick = () => { ScreenParts.toast('Gardée en réserve.'); };
    }
  },
};

window.addEventListener('DOMContentLoaded', () => App.init());
