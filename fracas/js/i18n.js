// Internationalisation : FR (langue source) / EN. Voir Save.data.language.

function lang() { return (Save.data && Save.data.language) || 'fr'; }
function isEn() { return lang() === 'en'; }

const UI_STRINGS = {
  fr: {
    menuTitle: 'FRACAS',
    menuHint: 'ZQSD/WASD deplacement · souris visee · clic attaque · Shift/Espace/E competences · R redemarrer',
    hubHint: 'ZQSD/WASD deplacement · marche vers une porte pour y acceder',
    testSpawnLabel: 'INVOQUER (a la visee)',
    btnMonde: 'MONDE', btnMondeSub: 'Expedition — 3 parties, 30 salles',
    btnDefi: 'DEFI', btnDefiSub: '10 epreuves fixes',
    btnPerso: 'PERSONNAGES', btnPersoSub: 'Fiches des 11 combattants',
    btnSettings: 'PARAMETRES', btnSettingsSub: 'Raccourcis, langue, son',
    sound: 'SON',
    back: 'MENU',
    charSelectTitle: 'CHOISIS TON PERSONNAGE',
    charShowcaseTitle: 'PERSONNAGES',
    speed: 'Vitesse',
    attack: 'Attaque',
    ability: 'C',
    recordExpedition: 'Record expedition',
    challengesTitle: 'DEFIS',
    record: 'Record',
    recordsExpeditions: 'Expeditions',
    recordsChallenges: 'Defis',
    moneyEarned: 'Argent gagne',
    hudPersonnage: 'PERSONNAGE',
    hudDamage: 'DEGATS',
    hudPart: 'PARTIE',
    hudRoom: 'SALLE',
    hudTestRoom: 'SALLE DE TEST (libre)',
    hudBest: 'MEILLEUR',
    hudBoss: 'BOSS',
    hudDefi: 'DEFI',
    controlsRecap: 'ZQSD/WASD deplacement · souris visee · clic gauche attaque (maintenir si necessaire) · Shift/Espace/E competences 1/2/3 · R redemarrer · Echap menu',
    expeditionDone: 'EXPEDITION TERMINEE',
    challengeDone: 'DEFI REUSSI',
    time: 'Temps',
    newRecord: 'NOUVEAU RECORD !',
    retry: 'REJOUER (R)',
    toMenu: 'MENU (Echap)',
    settingsTitle: 'PARAMETRES',
    settingsKeybinds: 'Raccourcis clavier',
    settingsKeybindsHint: 'Clique sur une touche puis appuie sur la nouvelle touche (ou clique avec la souris sur la zone de jeu, ex. clic gauche/droit/molette).',
    settingsLanguage: 'Langue',
    settingsReset: 'Reinitialiser les raccourcis',
    settingsPressKey: 'Appuie sur une touche…',
    settingsConflict: 'conflit avec une autre action',
    settingsSound: 'Son',
    settingsSpeedMult: 'Vitesse du jeu',
    settingsCursor: 'Curseur',
    cursorStyle_cross: 'Croix', cursorStyle_circle: 'Cercle', cursorStyle_dot: 'Point',
    actUp: 'Avancer', actDown: 'Reculer', actLeft: 'Aller a gauche', actRight: 'Aller a droite',
    actAttack: 'Attaque',
    actAbility1: 'Competence 1', actAbility2: 'Competence 2', actAbility3: 'Competence 3',
    actAbility: 'Competence (touche unique en expedition)',
    actRestart: 'Redemarrer la tentative', actPause: 'Menu / abandonner',
    locked: 'Verrouillee',
    volume: 'Volume',
    autoLabel: 'AUTO',
    btnBestiary: 'REPERTOIRE', btnBestiarySub: 'Tourelles, boss, records et argent gagne',
    bestiaryTitle: 'REPERTOIRE & STATISTIQUES',
    bestiaryTurrets: 'Tourelles',
    bestiaryBosses: 'Boss',
    bestiaryHp: 'PV', bestiaryLoss: 'Perte', bestiaryContact: 'Contact', bestiaryKills: 'Tues',
    pauseTitle: 'PAUSE',
    resume: 'REPRENDRE (Echap)',
    abandon: 'ABANDONNER',
    btnMarket: 'MARCHE',
    hubSpawn: 'Zone de depart',
    marketTitle: 'MARCHE',
    marketMoney: 'Argent',
    marketTabExpand: 'Agrandir', marketTabMove: 'Deplacer un bloc', marketTabAdd: 'Ajouter un bloc', marketTabRemove: 'Retirer un bloc',
    marketHint_expand: 'Clique une case en surbrillance, adjacente a la salle, pour l\'acheter.',
    marketHint_move: 'Choisis un bloc principal ci-dessus puis clique une case libre de la salle pour l\'y deplacer.',
    marketHint_add: 'Choisis un type de bloc ci-dessus puis clique une case libre de la salle pour le placer.',
    marketHint_remove: 'Clique un bloc decoratif existant pour le retirer (rembourse son cout).',
    marketDecor_teleporter: 'Teleporteur', marketDecor_wall: 'Mur colore', marketDecor_wind: 'Vent',
    marketWallColor: 'Couleur',
    marketDir_up: 'Haut', marketDir_down: 'Bas', marketDir_left: 'Gauche', marketDir_right: 'Droite',
    marketLegendBlock: 'Bloc principal', marketLegendDecor: 'Decor', marketLegendCandidate: 'Disponible',
  },
  en: {
    menuTitle: 'FRACAS',
    menuHint: 'ZQSD/WASD move · mouse aim · click attack · Shift/Space/E abilities · R restart',
    hubHint: 'ZQSD/WASD move · walk into a door to enter it',
    testSpawnLabel: 'SPAWN (at aim)',
    btnMonde: 'WORLD', btnMondeSub: 'Expedition — 3 parts, 30 rooms',
    btnDefi: 'CHALLENGE', btnDefiSub: '10 fixed trials',
    btnPerso: 'CHARACTERS', btnPersoSub: 'Roster of 11 fighters',
    btnSettings: 'SETTINGS', btnSettingsSub: 'Keybinds, language, sound',
    sound: 'SOUND',
    back: 'MENU',
    charSelectTitle: 'CHOOSE YOUR CHARACTER',
    charShowcaseTitle: 'CHARACTERS',
    speed: 'Speed',
    attack: 'Attack',
    ability: 'A',
    recordExpedition: 'Expedition record',
    challengesTitle: 'CHALLENGES',
    record: 'Record',
    recordsExpeditions: 'Expeditions',
    moneyEarned: 'Money earned',
    recordsChallenges: 'Challenges',
    hudPersonnage: 'CHARACTER',
    hudDamage: 'DAMAGE',
    hudPart: 'PART',
    hudRoom: 'ROOM',
    hudTestRoom: 'TRAINING ROOM (free)',
    hudBest: 'BEST',
    hudBoss: 'BOSS',
    hudDefi: 'CHALLENGE',
    controlsRecap: 'ZQSD/WASD move · mouse aim · left click attack (hold if needed) · Shift/Space/E abilities 1/2/3 · R restart · Esc menu',
    expeditionDone: 'EXPEDITION COMPLETE',
    challengeDone: 'CHALLENGE CLEARED',
    time: 'Time',
    newRecord: 'NEW RECORD!',
    retry: 'RETRY (R)',
    toMenu: 'MENU (Esc)',
    settingsTitle: 'SETTINGS',
    settingsKeybinds: 'Keyboard shortcuts',
    settingsKeybindsHint: 'Click a shortcut then press the new key (or click on the game area with the mouse, e.g. left/right/middle click).',
    settingsLanguage: 'Language',
    settingsReset: 'Reset keybinds',
    settingsPressKey: 'Press a key…',
    settingsConflict: 'conflicts with another action',
    settingsSound: 'Sound',
    settingsSpeedMult: 'Game speed',
    settingsCursor: 'Cursor',
    cursorStyle_cross: 'Cross', cursorStyle_circle: 'Circle', cursorStyle_dot: 'Dot',
    actUp: 'Move up', actDown: 'Move down', actLeft: 'Move left', actRight: 'Move right',
    actAttack: 'Attack',
    actAbility1: 'Ability 1', actAbility2: 'Ability 2', actAbility3: 'Ability 3',
    actAbility: 'Ability (single key in expedition)',
    actRestart: 'Restart attempt', actPause: 'Menu / quit run',
    locked: 'Locked',
    volume: 'Volume',
    autoLabel: 'AUTO',
    btnBestiary: 'BESTIARY', btnBestiarySub: 'Turrets, bosses, records and money earned',
    bestiaryTitle: 'BESTIARY & STATISTICS',
    bestiaryTurrets: 'Turrets',
    bestiaryBosses: 'Bosses',
    bestiaryHp: 'HP', bestiaryLoss: 'Loss', bestiaryContact: 'Contact', bestiaryKills: 'Kills',
    pauseTitle: 'PAUSE',
    resume: 'RESUME (Esc)',
    abandon: 'ABANDON',
    btnMarket: 'MARKET',
    hubSpawn: 'Spawn point',
    marketTitle: 'MARKET',
    marketMoney: 'Money',
    marketTabExpand: 'Expand', marketTabMove: 'Move a block', marketTabAdd: 'Add a block', marketTabRemove: 'Remove a block',
    marketHint_expand: 'Click a highlighted cell, adjacent to the room, to buy it.',
    marketHint_move: 'Pick a main block above then click a free cell of the room to move it there.',
    marketHint_add: 'Pick a block type above then click a free cell of the room to place it.',
    marketHint_remove: 'Click an existing decorative block to remove it (refunds its cost).',
    marketDecor_teleporter: 'Teleporter', marketDecor_wall: 'Colored wall', marketDecor_wind: 'Wind',
    marketWallColor: 'Color',
    marketDir_up: 'Up', marketDir_down: 'Down', marketDir_left: 'Left', marketDir_right: 'Right',
    marketLegendBlock: 'Main block', marketLegendDecor: 'Decor', marketLegendCandidate: 'Available',
  },
};

function S(key) {
  const dict = UI_STRINGS[lang()] || UI_STRINGS.fr;
  return dict[key] != null ? dict[key] : (UI_STRINGS.fr[key] != null ? UI_STRINGS.fr[key] : key);
}

const ACTION_LABEL_KEY = {
  up: 'actUp', down: 'actDown', left: 'actLeft', right: 'actRight', attack: 'actAttack',
  ability1: 'actAbility1', ability2: 'actAbility2', ability3: 'actAbility3',
  ability: 'actAbility', restart: 'actRestart', pause: 'actPause',
};

// ---------------- Traductions des personnages (EN) ----------------
const CHAR_I18N = {
  en: {
    1: { name: 'Colt', epithet: 'The Living Gun', attackLabel: 'Swap places with the gun (automatic 360 fire)', a1Label: 'Mobile chaos', a2Label: 'Volley around the gun', a3Label: 'Focus fire (hold)' },
    2: { name: 'Nyx', epithet: 'The Jumper', attackLabel: 'Offensive teleport (420 px)', a1Label: 'Swap with nearest turret', a2Label: 'Fire trail dash', a3Label: 'Rewind 1s' },
    3: { name: 'Kip', epithet: 'The Boomerang', attackLabel: 'Throw the boomerang', a1Label: 'Overcharge (+dmg / -speed)', a2Label: 'Cursor boomerang', a3Label: 'Ice patches x5' },
    4: { name: 'Ember', epithet: 'The Four Orbs', attackLabel: 'Orb contact (automatic)', a1Label: 'Random shield', a2Label: 'Spread out (hold)', a3Label: 'Shrink the arena' },
    5: { name: 'Ferro', epithet: 'The Ricochet', attackLabel: 'Bouncing projectile', a1Label: 'Knockback', a2Label: '1x1 wall', a3Label: 'Twin blades' },
    6: { name: 'Cinder', epithet: 'The Meteor', attackLabel: 'Charge then release a meteor', a1Label: 'Four meteors', a2Label: 'Invincibility (0.5s)', a3Label: 'Charge zone (15/s)' },
    7: { name: 'Echo', epithet: 'The Delayed', attackLabel: 'Delayed strike (position 6s ago)', a1Label: 'Delayed strike (10s ago)', a2Label: 'Time dilation (hold)', a3Label: 'Mark + heal on kill' },
    8: { name: 'Vex', epithet: 'The Gravitator', attackLabel: 'Gravitational pull (automatic)', a1Label: 'Mine', a2Label: 'Repulse', a3Label: 'Central pulse (auto 15s)' },
    9: { name: 'Fang', epithet: 'The Predator', attackLabel: 'Proximity aura (automatic)', a1Label: 'Auto shield (8s)', a2Label: 'Short dash', a3Label: 'Global stop' },
    10: { name: 'Gemini', epithet: 'The Two Orbs', attackLabel: 'Twin orb strike (charges)', a1Label: 'Shuffle the orbs', a2Label: 'Third orb (shield 2s)', a3Label: 'Freeze the two closest' },
    11: { name: 'Zephyr', epithet: 'The Wind', attackLabel: 'Place a warm wind block', a1Label: 'Vertical wind (anti-projectile)', a2Label: 'Powerful wind (3x)', a3Label: 'Reverse all winds' },
  },
};

function charName(id) {
  if (isEn() && CHAR_I18N.en[id]) return CHAR_I18N.en[id].name;
  return getCharacter(id).name;
}
function charEpithet(id) {
  if (isEn() && CHAR_I18N.en[id]) return CHAR_I18N.en[id].epithet;
  return getCharacter(id).epithet;
}
function charField(id, field) {
  if (isEn() && CHAR_I18N.en[id] && CHAR_I18N.en[id][field]) return CHAR_I18N.en[id][field];
  return getCharacter(id)[field];
}

// ---------------- Traductions des defis (EN) ----------------
const CHALLENGE_I18N = {
  en: {
    1: { title: 'Damage system demonstration', desc: 'Destroy the fixed targets then the turrets to understand the multiplier loss.' },
    2: { title: 'Teleport optimisation', desc: 'Chain offensive teleports to reach the distant turrets.' },
    3: { title: 'Boomerang optimisation', desc: 'Use the overcharge to speed up and empower your boomerangs.' },
    4: { title: 'Positioning the four orbs', desc: 'Bring your fire orbs into contact with the turrets arranged in a circle.' },
    5: { title: 'Ricochets', desc: 'Bounce your projectile off the walls and turrets to stack damage. A weakened boss joins the fight.' },
    6: { title: 'Meteor charge', desc: 'Charge your attack fully before releasing it on the distant turrets.' },
    7: { title: 'Using position history', desc: 'Move around then strike past positions to hit the turrets.' },
    8: { title: 'Knockback and collisions', desc: 'Push the turrets into obstacles to destroy them faster. A weakened boss joins the fight.' },
    9: { title: 'Managing the two orbs', desc: 'Alternate your two orb charges to keep up a steady attack rhythm.' },
    10: { title: 'Using the winds', desc: 'Push turrets into walls with the powerful wind.' },
    11: { title: 'Hunt and dodge', desc: 'Stay in range to tick your proximity aura, then dash to dodge between turrets. A weakened boss joins the fight.' },
  },
};

function challengeField(id, field) {
  if (isEn() && CHALLENGE_I18N.en[id] && CHALLENGE_I18N.en[id][field]) return CHALLENGE_I18N.en[id][field];
  const def = Challenges.get(id);
  return def ? def[field] : '';
}

// ---------------- Traductions des terrains (EN) ----------------
const TERRAIN_I18N_EN = {
  ice: 'Ice', mud: 'Mud', accel: 'Accelerator', slow: 'Slow field', damage: 'Damage zone',
  neutral: 'Neutral zone', invertH: 'Horizontal inversion', invertV: 'Vertical inversion', wind: 'Wind',
};

function terrainLabelI18n(type) {
  if (isEn() && TERRAIN_I18N_EN[type]) return TERRAIN_I18N_EN[type];
  return terrainLabel(type);
}

// ---------------- Repertoire (bestiaire) ----------------
const TURRET_INFO_FR = {
  T1: { name: 'Sentinelle', desc: 'Tourelle mecanique fixe. Tir simple lent mais regulier.' },
  T2: { name: 'Detraqueur', desc: 'Insecte mecanique qui detale puis crible en rafale.' },
  T3: { name: 'Oeil-Laser', desc: 'Tourelle fixe. Charge puis balaie un rayon continu.' },
  T4: { name: 'Drone Flottant', desc: 'Oeil mecanique qui derive en tournant, tir continu.' },
  T5: { name: 'Oursin', desc: 'Créature qui se deplace puis libere une salve circulaire.' },
  T6: { name: 'Chariot de Rail', desc: 'Vehicule mecanique qui patrouille un rail et tire au passage.' },
  T7: { name: 'Fouisseur', desc: 'Créature qui se deplace puis enfouit des mines.' },
  T8: { name: 'Gatling', desc: 'Tourelle fixe a trois canons, ligne de tir dense.' },
  T9: { name: 'Grenouille', desc: 'Créature bondissante qui crache un projectile ricochant.' },
  T10: { name: 'Rune Croisee', desc: 'Construct fixe, frappe simultanement les 4 directions.' },
  T11: { name: 'Meduse', desc: 'Créature flottante lente, projectile lent et teleguide.' },
  T12: { name: 'Obelisque', desc: 'Construct fixe qui invoque une zone d\'impact telegraphiee.' },
};
const TURRET_INFO_EN = {
  T1: { name: 'Sentry', desc: 'Fixed mechanical turret. Slow but steady single shot.' },
  T2: { name: 'Skitterer', desc: 'Mechanical insect that darts around then fires a burst.' },
  T3: { name: 'Laser Eye', desc: 'Fixed turret. Charges then sweeps a continuous beam.' },
  T4: { name: 'Hover Drone', desc: 'Mechanical eye drifting while spinning, continuous fire.' },
  T5: { name: 'Urchin', desc: 'Creature that moves then releases a circular volley.' },
  T6: { name: 'Rail Cart', desc: 'Mechanical vehicle patrolling a rail, fires as it passes.' },
  T7: { name: 'Burrower', desc: 'Creature that moves around then plants mines.' },
  T8: { name: 'Gatling', desc: 'Fixed three-barrel turret, dense line of fire.' },
  T9: { name: 'Hopper', desc: 'Bouncing creature spitting a ricocheting projectile.' },
  T10: { name: 'Cross Rune', desc: 'Fixed construct, strikes all 4 directions at once.' },
  T11: { name: 'Jelly', desc: 'Slow floating creature, slow homing projectile.' },
  T12: { name: 'Obelisk', desc: 'Fixed construct summoning a telegraphed impact zone.' },
};
const BOSS_INFO_FR = {
  B1: { desc: 'Creature de glace noueuse. Zones de glace/ralentissement, salves radiales croissantes qui repoussent, ecrase le decor a chaque phase.' },
  B2: { desc: 'Creature vegetale. Cultive des zones de degats/glace qui se multiplient par phase et invoque des gousses hostiles en phase finale.' },
  B3: { desc: 'Machine gatling erratique. Rafales de plus en plus denses, fonce et detruit le decor en chargeant.' },
  B4: { desc: 'Canon blinde sur 4 rails. Tire dans 4 puis 8 directions a chaque changement, defonce le decor en phase finale.' },
  B5: { desc: 'Golem de pierre/fer tres lent mais devastateur : zones et projectiles en nombre, coup de poing qui repousse, defonce le decor et invoque des gravats.' },
  B6: { desc: 'Noyau mecanique central. Motifs circulaires puis lignes puis zones combinees, onde de choc qui repousse en phase finale.' },
  double: { desc: 'Certaines salles de boss opposent les deux boss de la partie en meme temps (PV individuels reduits).' },
};
const BOSS_INFO_EN = {
  B1: { desc: 'Knotted ice creature. Ice/slow zones, growing radial bursts that knock back, crushes the terrain on every phase.' },
  B2: { desc: 'Plant creature. Grows damage/ice zones that multiply per phase and summons hostile pods in the final phase.' },
  B3: { desc: 'Erratic gatling machine. Increasingly dense bursts, rams and destroys the terrain while charging.' },
  B4: { desc: 'Armored rail cannon. Fires in 4 then 8 directions on every switch, smashes the terrain in the final phase.' },
  B5: { desc: 'Very slow but devastating stone/iron golem: many zones and projectiles, a knockback slam, destroys the terrain and summons rubble adds.' },
  B6: { desc: 'Central mechanical core. Circular patterns then lines then combined zones, a knockback shockwave in the final phase.' },
  double: { desc: 'Some boss rooms pit both of the part\'s bosses against you at once (individual HP is reduced).' },
};

function turretInfo(type) { return (isEn() ? TURRET_INFO_EN : TURRET_INFO_FR)[type] || { name: type, desc: '' }; }
function bossInfo(type) { return (isEn() ? BOSS_INFO_EN : BOSS_INFO_FR)[type] || { desc: '' }; }
