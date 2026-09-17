// Active les 2 spécificités choisies pour le combat et fournit les calculs
// transverses qui doivent regarder "tout le build" (multiplicateur de cast, historique
// de compétences, combo) plutôt qu'un seul événement isolé.
const SynergyEngine = {
  activate(game, chosenSpecs) {
    game.specFlags = {};
    for (const { specId, rarityId } of chosenSpecs) {
      const def = SPECIFICITIES_BY_ID[specId];
      if (!def) continue;
      const cfg = scaleStats(def.baseConfig || {}, rarityId, def.noScale || []);
      def.register(game, cfg);
    }
  },

  // Nombre de familles de tags distinctes dans le build actif du combat (compétences
  // tirées + spécificités choisies) — alimente les compétences de type "Résonance".
  computeBuildTagCount(game, drawnSkillIds, chosenSpecIds) {
    const set = new Set();
    for (const id of drawnSkillIds) (SKILLS_BY_ID[id]?.tags || []).forEach(t => set.add(t));
    for (const id of chosenSpecIds) (SPECIFICITIES_BY_ID[id]?.tags || []).forEach(t => set.add(t));
    game.buildTagCount = set.size;
  },

  // Multiplicateur composite appliqué à toute la prochaine compétence lancée. C'est
  // aussi ICI qu'on tient à jour tout l'état "méta-build" générique (historique
  // d'actions, combo, variété, dernier élément) dont plusieurs compétences ET
  // spécificités ont besoin — un seul point d'entrée par cast, pas 100 crochets épars.
  computeCastMult(game, skillDef) {
    const p = game.player;
    const sf = game.specFlags;
    let mult = 1;

    // ---- Combo / historique (générique, toujours actif) ----
    const isRepeat = p.lastSkillId === skillDef.id;
    if (isRepeat) { game.events.emit(EVT.SKILL_REPEATED, { skill: skillDef }); }
    else {
      if (p.lastSkillId != null) game.events.emit(EVT.SKILL_CHANGED, { from: p.lastSkillId, to: skillDef.id });
      p.comboCount++;
      game.events.emit(EVT.COMBO_STEP, { count: p.comboCount, skill: skillDef });
    }
    p.lastSkillId = skillDef.id;
    p.lastSkillFamily = skillDef.tags[0] || null;
    p.actionHistory.push({ skillId: skillDef.id, tags: skillDef.tags, t: game.time });
    if (p.actionHistory.length > 12) p.actionHistory.shift();
    const wasNew = !p.distinctSkillsUsed.has(skillDef.id);
    p.distinctSkillsUsed.add(skillDef.id);

    // Dernier élément utilisé (toujours suivi — Transmutation, Alternance, Polyvalent...).
    const element = skillDef.tags.find(t => ELEMENT_TAGS.includes(t));

    // ---- Buff ponctuel générique consommé ici (Danseur, Acrobate, Contretemps...) ----
    if (p.buffs.nextSkillMult) { mult *= p.buffs.nextSkillMult.mult; delete p.buffs.nextSkillMult; }

    // ---- Spécificités ----
    if (sf.polyvalent && element && p.lastElementTag && element !== p.lastElementTag) mult *= sf.polyvalent.mult;
    if (sf.specialiste && element) {
      const key = 'spec_' + element;
      const v = Effects.addResource(game, key, 1, sf.specialiste.threshold);
      if (v >= sf.specialiste.threshold) { mult *= sf.specialiste.mult; game.player.resources[key].value = 0; }
    }
    if (sf.comboAddict) mult *= 1 + Math.min(2, p.comboCount * sf.comboAddict.perStep);
    if (sf.momentumSpec) mult *= 1 + (p.momentum / 100) * sf.momentumSpec.maxBonus;
    if (sf.immobileSpec) mult *= 1 + Math.min(1, (p.stillTime || 0) / sf.immobileSpec.time) * sf.immobileSpec.maxBonus;
    if (sf.risqueCalcule) {
      const nearest = Effects.getNearestEnemy(game, p.x, p.y, sf.risqueCalcule.range);
      if (nearest) mult *= 1 + (1 - Effects.dist(p.x, p.y, nearest.x, nearest.y) / sf.risqueCalcule.range) * sf.risqueCalcule.maxBonus;
    }
    if (sf.zoneurSpec && Effects.findZone(game, p.x, p.y, 4)) mult *= sf.zoneurSpec.mult;
    if (sf.adaptatif && game.lastAppliedStatusElement && skillDef.tags.includes(game.lastAppliedStatusElement)) mult *= sf.adaptatif.mult;
    if (sf.archiviste && wasNew && p.distinctSkillsUsed.size === sf.archiviste.threshold) {
      Effects.explosionAt(game, { x: p.x, y: p.y, radius: sf.archiviste.radius, damage: sf.archiviste.damage, tags: [TAGS.COMBO], color: '#c9a8ff', source: 'archiviste' });
    }
    if (sf.briseurDeCombo && isRepeat && p.comboCount >= 3) {
      Effects.explosionAt(game, { x: p.x, y: p.y, radius: sf.briseurDeCombo.radius, damage: sf.briseurDeCombo.damage * p.comboCount, tags: [TAGS.COMBO], color: '#fbbf24', source: 'briseur_de_combo' });
      p.comboCount = 0;
    }
    if (sf.resonateur) {
      const nearby = Effects.getEnemiesInRadius(game, p.x, p.y, 220);
      const activeTypes = new Set();
      for (const e of nearby) for (const t of Object.keys(e.statuses || {})) activeTypes.add(t);
      for (const z of game.zones) if (!z.dead && z.element) activeTypes.add(z.element);
      const overlap = skillDef.tags.filter(t => activeTypes.has(t) || activeTypes.has(String(t).toLowerCase())).length;
      if (overlap >= sf.resonateur.threshold) Effects.explosionAt(game, { x: p.x, y: p.y, radius: 90, damage: sf.resonateur.damage, tags: [TAGS.REACTION], color: '#7fffe0', source: 'resonateur' });
    }
    if (sf.architecteSynergies) {
      const nearby = Effects.getEnemiesInRadius(game, p.x, p.y, 220);
      const activeTypes = new Set();
      for (const e of nearby) for (const t of Object.keys(e.statuses || {})) activeTypes.add(t);
      const overlap = skillDef.tags.filter(t => activeTypes.has(t)).length;
      if (overlap >= sf.architecteSynergies.threshold) {
        Effects.heal(game, sf.architecteSynergies.heal);
        Effects.explosionAt(game, { x: p.x, y: p.y, radius: 110, damage: sf.architecteSynergies.damage, tags: [TAGS.REACTION], color: '#ffe9a8', source: 'architecte_synergies' });
      }
    }
    if (sf.essaimSpec) mult *= 1 + game.summons.length * sf.essaimSpec.perSummonMult;
    if (sf.familier && game.summons.length) {
      for (const s of game.summons) {
        if (Math.random() > sf.familier.chance) continue;
        const target = Effects.getNearestEnemy(game, s.x, s.y, 250);
        if (target) Effects.damageEnemy(game, target, s.damage * sf.familier.mult, { tags: skillDef.tags, source: 'familier', noProc: true });
      }
    }
    if (sf.miroirSpec && game.summons.length) {
      const summonsSnapshot = game.summons.slice();
      game.schedule(sf.miroirSpec.delay, () => {
        for (const s of summonsSnapshot) {
          if (s.dead) continue;
          const target = Effects.getNearestEnemy(game, s.x, s.y, 250);
          if (target) Effects.damageEnemy(game, target, s.damage * sf.miroirSpec.mult, { tags: skillDef.tags, source: 'miroir_spec', noProc: true });
        }
      });
    }

    if (element) p.lastElementTag = element;
    game.events.emit(EVT.SKILL_USED, { skill: skillDef });
    return mult;
  },

  // Réduction/altération passive des dégâts entrants. Actuellement neutre par défaut
  // (aucune spécificité de la 2e génération ne réduit les dégâts de façon générique) ;
  // conservé comme point d'extension pour de futures spécificités défensives.
  incomingDamageMultiplier(game) {
    return 1;
  },
};
