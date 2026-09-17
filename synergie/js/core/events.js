// Bus d'événements générique — permet aux spécificités de réagir à des événements
// de combat sans coupler leur code à celui des compétences.
const EVT = {
  ENEMY_HIT: 'enemy_hit',
  ENEMY_KILLED: 'enemy_killed',
  ENEMY_BURNED: 'enemy_burned',
  ENEMY_FROZEN: 'enemy_frozen',
  ENEMY_POISONED: 'enemy_poisoned',
  ENEMY_BLEEDING: 'enemy_bleeding',
  ENEMY_SHOCKED: 'enemy_shocked',
  EXPLOSION_CREATED: 'explosion_created',
  DASH_STARTED: 'dash_started',
  DASH_FINISHED: 'dash_finished',
  SKILL_USED: 'skill_used',
  PROJECTILE_HIT: 'projectile_hit',
  SHIELD_BROKEN: 'shield_broken',
  ENEMY_MARKED: 'enemy_marked',
  ENEMY_STATUS_CHANGED: 'enemy_status_changed',
  PLAYER_DAMAGED: 'player_damaged',
  PLAYER_HEALED: 'player_healed',
  ZONE_TICK: 'zone_tick',
  COMBAT_STARTED: 'combat_started',
  COMBAT_ENDED: 'combat_ended',
  // ---- Génération 2 : évènements génériques pour laisser émerger des synergies
  // (voir data/skills2.js / data/specificities2.js) sans coder chaque combo à la main.
  PROJECTILE_CREATED: 'projectile_created',
  PROJECTILE_MISSED: 'projectile_missed',
  ENEMY_STATUS_REMOVED: 'enemy_status_removed',
  PERFECT_DODGE: 'perfect_dodge',
  PARRY_SUCCESS: 'parry_success',
  DAMAGE_PREVENTED: 'damage_prevented',
  LOW_HEALTH: 'low_health',
  COMBO_STEP: 'combo_step',
  COMBO_BROKEN: 'combo_broken',
  SKILL_REPEATED: 'skill_repeated',
  SKILL_CHANGED: 'skill_changed',
  RESOURCE_SPENT: 'resource_spent',
  RESOURCE_GENERATED: 'resource_generated',
  SUMMON_CREATED: 'summon_created',
  SUMMON_KILLED: 'summon_killed',
  ZONE_CREATED: 'zone_created',
  ZONE_DESTROYED: 'zone_destroyed',
  ZONE_REACTION: 'zone_reaction',
  ENEMY_RUPTURED: 'enemy_ruptured',
  RESOURCE_FULL: 'resource_full',
};

class EventBus {
  constructor() { this.listeners = {}; }
  on(event, fn) {
    (this.listeners[event] || (this.listeners[event] = [])).push(fn);
    return () => this.off(event, fn);
  }
  off(event, fn) {
    const arr = this.listeners[event];
    if (!arr) return;
    const i = arr.indexOf(fn);
    if (i >= 0) arr.splice(i, 1);
  }
  emit(event, payload) {
    const arr = this.listeners[event];
    if (!arr || arr.length === 0) return;
    // copie défensive : un listener peut se désabonner pendant l'itération
    for (const fn of arr.slice()) {
      try { fn(payload); } catch (e) { console.error(`[events] erreur listener ${event}`, e); }
    }
  }
  clear() { this.listeners = {}; }
}
