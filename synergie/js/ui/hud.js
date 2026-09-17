// Met à jour le HUD DOM pendant le combat (tout ce qui n'est pas dessiné sur le canvas).
const HUD = {
  init(game) {
    const bar = document.getElementById('skillBar');
    bar.innerHTML = '';
    game.activeSkillSlots.forEach((slot, i) => {
      const def = slot.def;
      const keyLabel = KeyBindings.keyDisplay(game.input.binds[`skill${i + 1}`]);
      const el = document.createElement('div');
      el.className = 'skill-slot';
      el.id = `skillSlot${i}`;
      el.innerHTML = `<span class="key">${keyLabel}</span>${ScreenParts.icon('skill', slot.skillId, slot.rarityId, 22)}<span class="skill-slot-name">${def.name}</span><div class="cd-overlay" style="display:none"></div>`;
      bar.appendChild(el);
    });

    const specsEl = document.getElementById('hudSpecs');
    specsEl.innerHTML = '';
    for (const { specId, rarityId } of game.chosenSpecsForHud || []) {
      const def = SPECIFICITIES_BY_ID[specId];
      const chip = document.createElement('div');
      chip.className = 'hud-spec-chip';
      chip.style.borderColor = RARITIES[rarityId].color;
      chip.textContent = `${def.name} (${RARITIES[rarityId].name})`;
      specsEl.appendChild(chip);
    }
  },

  update(game) {
    const p = game.player;
    document.getElementById('playerHpFill').style.width = `${Math.max(0, p.hpRatio() * 100)}%`;
    document.getElementById('playerHpText').textContent = `${Math.max(0, Math.round(p.hp))}/${p.maxHp}`;
    const shieldEl = document.getElementById('playerShieldText');
    if (p.shield > 0) { shieldEl.hidden = false; shieldEl.textContent = `🛡 ${Math.round(p.shield)}`; }
    else shieldEl.hidden = true;
    document.getElementById('enemyCount').textContent = `Ennemis restants : ${game.enemies.filter(e => !e.dead).length}`;

    game.activeSkillSlots.forEach((slot, i) => {
      const el = document.getElementById(`skillSlot${i}`);
      if (!el) return;
      const overlay = el.querySelector('.cd-overlay');
      const ready = slot.charges > 0;
      el.classList.toggle('ready', ready);
      el.classList.toggle('selected', game.selectedSlot === i);
      if (slot.charges < slot.maxCharges) {
        overlay.style.display = 'flex';
        overlay.textContent = slot.cooldownTimer > 0 ? slot.cooldownTimer.toFixed(1) : '';
        if (slot.maxCharges > 1) overlay.textContent = `${slot.charges}/${slot.maxCharges}`;
      } else overlay.style.display = 'none';
    });

    const statusesEl = document.getElementById('hudStatuses');
    const chips = [];
    if (p.shield > 0) chips.push({ label: 'Bouclier', color: '#7fd4ff' });
    if (game.time < p.speedDebuffUntil) chips.push({ label: 'Ralenti', color: '#c084fc' });
    if (p.parryActive) chips.push({ label: 'Contre actif', color: '#fbbf24' });
    if (p.preyTargetId != null) chips.push({ label: 'Proie marquée', color: '#ff8fa3' });
    statusesEl.innerHTML = chips.map(c => `<div class="status-chip" style="border-color:${c.color};color:${c.color}">${c.label}</div>`).join('');
  },
};
