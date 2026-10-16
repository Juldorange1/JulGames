// Système centralisé de gestion du "potentiel offensif" du joueur.
// Toute modification de damageMultiplier / offenseBonus DOIT passer par ici
// (voir section "DamageModifier" des critères d'acceptation).
const DamageSystem = {
  clamp01(v) {
    return Math.max(0, Math.min(1, v));
  },

  init(entity) {
    entity.damageMultiplier = 1; // 100%, clamp [0,1]
    entity.offenseBonus = 0; // additif, >= 0
    entity.invincible = false;
    entity.lastChangeAt = 0;
    entity.lastChangeType = null; // 'loss' | 'heal' | null, pour le feedback HUD
  },

  // Une attaque ennemie touche l'entité : perte multiplicative.
  applyLoss(entity, pct, now) {
    if (entity.invincible) return 0;
    const before = entity.damageMultiplier;
    entity.damageMultiplier = this.clamp01(entity.damageMultiplier * (1 - pct));
    const delta = before - entity.damageMultiplier;
    if (delta > 0) {
      entity.lastChangeAt = now;
      entity.lastChangeType = 'loss';
    }
    return delta;
  },

  // Restauration explicite (pickup de soin, compétence dédiée). Jamais de régén passive.
  applyHeal(entity, amount, now) {
    const before = entity.damageMultiplier;
    entity.damageMultiplier = this.clamp01(entity.damageMultiplier + amount);
    const delta = entity.damageMultiplier - before;
    if (delta > 0) {
      entity.lastChangeAt = now;
      entity.lastChangeType = 'heal';
    }
    return delta;
  },

  addOffenseBonus(entity, amount) {
    entity.offenseBonus = Math.max(0, entity.offenseBonus + amount);
  },

  // Appelé au changement de salle (Expédition/Défi/Salle de test).
  resetForRoom(entity) {
    entity.damageMultiplier = 1;
    entity.offenseBonus = 0;
  },

  // Dégâts réellement infligés par une attaque de dégâts de base "baseDamage".
  computeDamage(entity, baseDamage) {
    return baseDamage * entity.damageMultiplier * (1 + entity.offenseBonus);
  },
};
