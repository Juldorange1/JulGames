const Hud = {
  el: {},

  init() {
    this.el.damageValue = document.getElementById('hudDamageValue');
    this.el.damageBarFill = document.getElementById('hudDamageBarFill');
    this.el.timer = document.getElementById('hudTimer');
    this.el.slotAttack = document.getElementById('slotAttack');
    this._lastFlashAt = 0;
  },

  update(player, timer) {
    const pct = Math.round(player.damageMultiplier * 100);
    this.el.damageValue.textContent = `${pct}%`;
    this.el.damageBarFill.style.width = `${pct}%`;

    if (player.lastChangeAt !== this._lastFlashAt && player.lastChangeType) {
      this._lastFlashAt = player.lastChangeAt;
      const cls = player.lastChangeType === 'loss' ? 'flash-loss' : 'flash-heal';
      this.el.damageValue.classList.remove('flash-loss', 'flash-heal');
      // force reflow pour rejouer l'animation même si la même classe est réappliquée
      void this.el.damageValue.offsetWidth;
      this.el.damageValue.classList.add(cls);
    }

    this.el.timer.textContent = timer.format();

    const cooldownRatio = 1 - player.attackReadyRatio;
    this.el.slotAttack.classList.toggle('on-cooldown', cooldownRatio > 0.02);
    this.el.slotAttack.style.setProperty('--cd', cooldownRatio);
  },
};
