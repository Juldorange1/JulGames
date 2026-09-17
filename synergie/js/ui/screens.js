// Traduction des clés de stats brutes (baseStats/baseConfig) en libellés lisibles pour
// le panneau de détails (ScreenParts.detailHTML). Tout ce qui n'est pas listé retombe
// sur humanizeKey() plutôt que de planter ou d'afficher une clé technique brute.
const STAT_LABELS = {
  damage: 'Dégâts', dps: 'Dégâts/s', burnDps: 'Dégâts brûlure/s', burnDuration: 'Durée brûlure',
  poisonDps: 'Dégâts poison/s', poisonDuration: 'Durée poison', poisonStacks: 'Charges poison',
  bleedValue: 'Dégâts saignement/s', bleedDuration: 'Durée saignement', bleedStacks: 'Charges saignement',
  bleedBonusMult: 'Multiplicateur vs saignement', bonusMult: 'Multiplicateur de dégâts',
  speed: 'Vitesse du projectile', radius: 'Rayon', range: 'Portée', duration: 'Durée',
  tickInterval: 'Intervalle de tic', count: 'Nombre', spreadDeg: 'Angle de dispersion',
  pierce: 'Perforation', maxJumps: 'Rebonds max', bounces: 'Rebonds', bounceRange: 'Portée de rebond',
  distance: 'Distance', iframes: 'Invincibilité (s)', knockback: 'Repoussement',
  stacks: 'Charges', value: 'Valeur', shardDamage: 'Dégâts éclats', shardRadius: 'Rayon éclats',
  amount: 'Montant', healAmount: 'Soin', healPerBleeder: 'Soin par ennemi', minBleeders: 'Minimum requis',
  window: 'Fenêtre (s)', shieldOnBlock: 'Bouclier au blocage', stunDuration: 'Étourdissement (s)',
  strength: 'Force', executeThreshold: 'Seuil d\'exécution (% PV)', executeDamage: 'Dégâts d\'exécution',
  baseDamage: 'Dégâts de base', perTagDamage: 'Dégâts par tag', effectsCount: 'Nombre d\'effets',
  mult: 'Multiplicateur', threshold: 'Seuil', chance: 'Chance', reduction: 'Réduction',
  noDashTime: 'Sans dash depuis (s)', maxBonus: 'Bonus max', perSkillBonus: 'Bonus par compétence',
  windowSec: 'Fenêtre (s)', bonusDamage: 'Dégâts bonus', travelTime: 'Temps de vol',
  sprayDamage: 'Dégâts projection', maxCharges: 'Charges max', attackCooldown: 'Recharge d\'attaque',
  refreshInterval: 'Rafraîchissement (s)', radiusMult: 'Multiplicateur de rayon', chainChance: 'Chance de chaîne',
  stackOnHit: 'Charges par coup', length: 'Longueur', width: 'Largeur', targets: 'Cibles',
  poisonDps2: 'Dégâts poison/s', bonusVsBleed: 'Multiplicateur vs saignement', charges: 'Charges',
  hpCost: 'Coût en PV', hpCostPerEnemy: 'Coût en PV par ennemi', damageMult: 'Multiplicateur de dégâts',
  durationBonus: 'Bonus de durée', ratio: 'Ratio', perComboDamage: 'Dégâts par cran de combo',
  perComboHeal: 'Soin par cran de combo', idealInterval: 'Intervalle idéal (s)', tolerance: 'Tolérance (s)',
  bonusMult: 'Multiplicateur bonus', secondsAgo: 'Secondes dans le passé', secondaryMult: 'Multiplicateur secondaire',
  secondaryCount: 'Cibles secondaires', secondaryRadius: 'Rayon secondaire', releaseMult: 'Multiplicateur de libération',
  minCount: 'Ennemis minimum', minMaturity: 'Maturité minimum', perSummonMult: 'Bonus par invocation',
  minStatuses: 'Altérations minimum', damagePerEnemy: 'Dégâts par ennemi', aheadTime: 'Anticipation (s)',
  maxChargeTime: 'Temps de charge max (s)', curve: 'Courbure', pullSpeed: 'Vitesse de traction',
  heatPerUse: 'Chaleur par utilisation', maxHeat: 'Chaleur max', perHeatDamage: 'Dégâts par chaleur',
  freezeDuration: 'Durée de gel', slowDuration: 'Durée de ralentissement', shareRatio: 'Ratio de partage',
  splitDamage: 'Dégâts de scission', splitSpeed: 'Vitesse de scission', markDamage: 'Dégâts de marque',
  lifeBonus: 'Bonus de portée', force: 'Force', perEvent: 'Charge par action', speedMult: 'Multiplicateur de vitesse',
  orbitRadius: 'Rayon orbital', tethered: 'Relié',
};

// Petits aides de rendu HTML réutilisées par main.js pour les différents écrans.
const ScreenParts = {
  humanizeKey(key) {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
  },
  tagChips(tags) {
    return tags.map(t => `<span class="tag-chip tag-${t}">${t}</span>`).join('');
  },

  rarityBadge(rarityId) {
    const r = RARITIES[rarityId];
    return `<span class="rarity-badge" style="background:${r.color}22;color:${r.color};border:1px solid ${r.color}">${r.name}</span>`;
  },

  // Icône construite à partir des tags + d'un hash de l'id (voir data/skillIcons.js) :
  // la forme identifie l'effet, sa COULEUR vient uniquement de la rareté.
  icon(kind, id, rarityId, size = 26) {
    const color = RARITIES[rarityId].color;
    const def = kind === 'skill' ? SKILLS_BY_ID[id] : SPECIFICITIES_BY_ID[id];
    const inner = def ? buildIcon(def.tags, id, color) : ICON_SHAPES.DEFAULT(color);
    return `<span class="card-icon"><svg width="${size}" height="${size}" viewBox="0 0 28 28">${inner}</svg></span>`;
  },

  infoButton(kind, id, rarityId) {
    return `<button class="card-info-btn" onclick="event.stopPropagation(); App.showDetail('${kind}','${id}',${rarityId})" title="Voir le détail précis">ⓘ</button>`;
  },

  skillCard(skillId, rarityId, { equipped = false, selected = false, disabled = false } = {}) {
    const def = SKILLS_BY_ID[skillId];
    const cls = ['card'];
    if (equipped) cls.push('equipped');
    if (selected) cls.push('selected');
    if (disabled) cls.push('disabled');
    return `<div class="${cls.join(' ')}" style="border-left:4px solid ${RARITIES[rarityId].color}" data-skill-id="${skillId}">
      ${this.infoButton('skill', skillId, rarityId)}
      ${this.rarityBadge(rarityId)}
      <div class="card-head">${this.icon('skill', skillId, rarityId)}<span class="card-name">${def.name}</span></div>
      <div class="card-desc">${def.desc}</div>
      <div class="card-tags">${this.tagChips(def.tags)}</div>
    </div>`;
  },

  specCard(specId, rarityId, { equipped = false, selected = false, disabled = false } = {}) {
    const def = SPECIFICITIES_BY_ID[specId];
    const cls = ['card'];
    if (equipped) cls.push('equipped');
    if (selected) cls.push('selected');
    if (disabled) cls.push('disabled');
    return `<div class="${cls.join(' ')}" style="border-left:4px solid ${RARITIES[rarityId].color}" data-spec-id="${specId}">
      ${this.infoButton('spec', specId, rarityId)}
      ${this.rarityBadge(rarityId)}
      <div class="card-head">${this.icon('spec', specId, rarityId)}<span class="card-name">${def.name}</span></div>
      <div class="card-desc">${def.desc}</div>
      <div class="card-tags">${this.tagChips(def.tags)}</div>
    </div>`;
  },

  // Panneau de détails : valeurs de stats déjà mises à l'échelle pour la rareté donnée
  // (mêmes fonctions que celles réellement utilisées en combat, scaleStats()).
  detailHTML(kind, id, rarityId) {
    const def = kind === 'skill' ? SKILLS_BY_ID[id] : SPECIFICITIES_BY_ID[id];
    const baseStats = kind === 'skill' ? (def.baseStats || {}) : (def.baseConfig || {});
    const noScale = def.noScale || (kind === 'skill' ? ['cooldown'] : []);
    const scaled = scaleStats(baseStats, rarityId, noScale);
    const fmt = v => (typeof v !== 'number' ? v : Number.isInteger(v) ? v : Math.round(v * 10) / 10);
    const rows = Object.keys(scaled).length
      ? Object.keys(scaled).map(k => `<div class="stat-row"><span>${STAT_LABELS[k] || this.humanizeKey(k)}</span><b>${fmt(scaled[k])}</b></div>`).join('')
      : '<p class="card-desc">Aucun paramètre numérique — effet purement qualitatif.</p>';
    const cooldownRow = kind === 'skill' ? `<div class="stat-row"><span>Recharge</span><b>${def.cooldown.toFixed(2)}s</b></div>` : '';
    const maxChargesRow = kind === 'skill' && def.maxCharges ? `<div class="stat-row"><span>Charges</span><b>${def.maxCharges}</b></div>` : '';
    return `
      <div class="detail-header">${this.icon(kind, id, rarityId, 42)}<div><h3>${def.name}</h3>${this.rarityBadge(rarityId)}</div></div>
      <p class="card-desc">${def.desc}</p>
      <div class="card-tags">${this.tagChips(def.tags)}</div>
      <h4>À la rareté ${RARITIES[rarityId].name}</h4>
      <div class="stat-grid">${cooldownRow}${maxChargesRow}${rows}</div>
    `;
  },

  toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg; el.hidden = false;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
  },
};
