// Sauvegarde locale du joueur : compétences/spécificités possédées (avec leur
// meilleure rareté obtenue) et les 10+10 actuellement équipées. Pas de "banque" au
// sens strict : tout ce qui est possédé est immédiatement disponible pour l'équipement.
const Progression = {
  STORAGE_KEY: 'synergie_save_v1',

  load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return this.createDefault();
      const profile = JSON.parse(raw);
      if (!profile.ownedSkills || !profile.equippedSkills || profile.equippedSkills.length !== 10) return this.createDefault();
      const skillIdsValid = Object.keys(profile.ownedSkills).every(id => id in SKILLS_BY_ID)
        && profile.equippedSkills.every(id => id in SKILLS_BY_ID);
      const specIdsValid = Object.keys(profile.ownedSpecs).every(id => id in SPECIFICITIES_BY_ID)
        && profile.equippedSpecs.every(id => id in SPECIFICITIES_BY_ID);
      if (!skillIdsValid || !specIdsValid) return this.createDefault();
      return profile;
    } catch (e) { return this.createDefault(); }
  },

  createDefault() {
    const skillIds = shuffle(SKILLS.map(s => s.id)).slice(0, 10);
    const specIds = shuffle(SPECIFICITIES.map(s => s.id)).slice(0, 10);
    const profile = {
      ownedSkills: Object.fromEntries(skillIds.map(id => [id, 0])),
      ownedSpecs: Object.fromEntries(specIds.map(id => [id, 0])),
      equippedSkills: skillIds,
      equippedSpecs: specIds,
    };
    this.save(profile);
    return profile;
  },

  save(profile) { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(profile)); },

  grantReward(profile, kind, id, rarityId) {
    const owned = kind === 'skill' ? profile.ownedSkills : profile.ownedSpecs;
    const isNew = !(id in owned);
    owned[id] = Math.max(owned[id] != null ? owned[id] : -1, rarityId);
    this.save(profile);
    return { isNew, bestRarity: owned[id] };
  },

  equip(profile, kind, id, replaceId) {
    const list = kind === 'skill' ? profile.equippedSkills : profile.equippedSpecs;
    const idx = list.indexOf(replaceId);
    if (idx >= 0) { list[idx] = id; this.save(profile); }
  },

  ownedList(profile, kind) {
    const owned = kind === 'skill' ? profile.ownedSkills : profile.ownedSpecs;
    return Object.keys(owned).map(id => ({ id, rarityId: owned[id] }));
  },

  isEquipped(profile, kind, id) {
    return (kind === 'skill' ? profile.equippedSkills : profile.equippedSpecs).includes(id);
  },

  randomSkillId() { return SKILLS[Math.floor(Math.random() * SKILLS.length)].id; },
  randomSpecId() { return SPECIFICITIES[Math.floor(Math.random() * SPECIFICITIES.length)].id; },
};
