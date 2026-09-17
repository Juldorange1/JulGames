// Gère les 4 compétences tirées pour le combat : recharges (avec charges multiples
// pour Double dash), et exécution de cast() avec un contexte prêt à l'emploi.
const SkillRuntime = {
  initSlots(game, drawnSkills) {
    game.activeSkillSlots = drawnSkills.map(d => {
      const def = SKILLS_BY_ID[d.skillId];
      const maxCharges = def.maxCharges || 1;
      return { skillId: d.skillId, rarityId: d.rarityId, def, maxCharges, charges: maxCharges, cooldownTimer: 0, cooldownMax: def.cooldown };
    });
  },

  update(game, dt) {
    for (const slot of game.activeSkillSlots) {
      if (!slot || slot.charges >= slot.maxCharges) continue;
      slot.cooldownTimer -= dt;
      if (slot.cooldownTimer <= 0) {
        slot.charges++;
        slot.cooldownTimer = slot.charges < slot.maxCharges ? slot.cooldownMax : 0;
      }
    }
  },

  canUse(game, slotIndex) {
    const slot = game.activeSkillSlots[slotIndex];
    return !!slot && slot.charges > 0 && !game.player.isDashing;
  },

  // chargeRatio (0..1) : pour les compétences `charge:true`, la fraction du temps de
  // charge max effectivement maintenue avant relâchement (voir main.js onMouseUp).
  use(game, slotIndex, chargeRatio = 1) {
    const slot = game.activeSkillSlots[slotIndex];
    if (!slot || slot.charges <= 0) return false;
    const def = slot.def;
    const stats = scaleStats(def.baseStats || {}, slot.rarityId, def.noScale || ['cooldown']);
    const player = game.player;
    const origin = originFromPlayer(player);
    const target = game.input.mouseWorld ? game.input.mouseWorld : origin;

    game._castMult = SynergyEngine.computeCastMult(game, def);
    try {
      def.cast({ game, player, stats, rarityId: slot.rarityId, angle: player.aimAngle, origin, target, chargeRatio });
    } finally {
      game._castMult = 1;
    }
    player.attackAnimTimer = 0.22;

    slot.charges--;
    if (slot.charges < slot.maxCharges) slot.cooldownTimer = slot.cooldownMax;
    game.lastSkillUseFlash = slotIndex;
    return true;
  },
};
