// Configuration des probabilités de rareté après un combat, et tirage. Les deux
// roues (compétence / spécificité) partagent exactement la même config ; une seule
// des deux peut être lancée.
const Wheel = {
  createConfig() {
    return { probs: [100, 0, 0, 0, 0, 0, 0, 0, 0, 0], pointsSpent: 0 };
  },

  costToIncrease(i) { return RARITY_UPGRADE_COST[i]; },

  canIncrease(config, pointsAvailable, i) {
    return config.probs[0] > 0 && config.pointsSpent + this.costToIncrease(i) <= pointsAvailable;
  },

  increase(config, pointsAvailable, i) {
    if (!this.canIncrease(config, pointsAvailable, i)) return false;
    config.probs[i]++; config.probs[0]--; config.pointsSpent += this.costToIncrease(i);
    return true;
  },

  decrease(config, i) {
    if (config.probs[i] <= 0) return false;
    config.probs[i]--; config.probs[0]++; config.pointsSpent -= this.costToIncrease(i);
    return true;
  },

  roll(config) { return rollRarity(config.probs); },
};
