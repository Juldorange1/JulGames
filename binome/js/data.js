'use strict';
/* =========================================================
   BINÔME — données du jeu (héros, compétences, améliorations,
   règles, pactes, ennemis, boss, traits de salle, ères)
   ========================================================= */

const GRID_W = 9, GRID_H = 7;
const FLOOR_PCT = 40;      // plancher du % de dégâts
const KILL_HEAL = 5;       // soin (en points de %) pour le héros qui tue

/* ---------- Héros ---------- */
const HEROES = {
  brann: { name: 'Brann', title: 'Le Rempart', color: '#ff8a3d', basic: 'coup', move: 3,
    desc: 'Corps à corps. Son attaque repousse : parfait pour envoyer les ennemis dans les fosses.' },
  lyse:  { name: 'Lyse', title: 'La Flèche', color: '#5ad0ff', basic: 'tir', move: 3,
    desc: 'Tire en ligne droite de loin. Fragile si on la laisse se faire encercler.' },
  kael:  { name: 'Kael', title: "L'Ombre", color: '#c08cff', basic: 'entaille', move: 4,
    desc: 'Très mobile (4 cases) et frappe fort au contact.' },
  mira:  { name: 'Mira', title: "L'Étincelle", color: '#6dffae', basic: 'eclat', move: 3,
    desc: 'Frappe n’importe quelle case à portée, même derrière un mur.' },
};

/* ---------- Compétences ----------
   type : line (projectile en ligne / corps à corps si portée 1), point (case à portée),
          self (autour de soi), dash (fonce), leap (saute), swap (échange), place (pose), ally (allié)
   area : single, plus, square, ring4, ring8, diamond2, vortex, none
   ff   : touche aussi l'allié (moitié des dégâts, en %) */
const SKILLS = {
  // --- attaques de base (une par héros) ---
  coup:      { name: "Coup d'épaule", icon: 'fist',  type: 'line', range: 1, dmg: 11, cd: 0, push: 1, basic: true,
               desc: 'Frappe une case voisine et repousse la cible d’1 case.' },
  tir:       { name: 'Tir', icon: 'arrow', type: 'line', range: 5, dmg: 7, cd: 0, basic: true,
               desc: 'Tire en ligne droite : touche la première cible.' },
  entaille:  { name: 'Entaille', icon: 'blade', type: 'line', range: 1, dmg: 13, cd: 0, basic: true,
               desc: 'Frappe puissante sur une case voisine.' },
  eclat:     { name: 'Éclat', icon: 'spark', type: 'point', area: 'single', range: 3, dmg: 7, cd: 0, basic: true,
               desc: 'Frappe une case à portée, sans ligne de vue.' },

  // --- compétences à découvrir ---
  charge:    { name: 'Charge', icon: 'dash', type: 'dash', range: 4, dmg: 12, cd: 2, push: 1,
               desc: 'Fonce en ligne droite jusqu’au premier obstacle et percute la cible (repousse 1).' },
  tourbillon:{ name: 'Tourbillon', icon: 'spin', type: 'self', area: 'ring8', dmg: 8, cd: 2,
               desc: 'Frappe les 8 cases autour de soi.' },
  onde:      { name: 'Onde de choc', icon: 'wave', type: 'self', area: 'ring8', dmg: 3, push: 2, cd: 3,
               desc: 'Repousse de 2 cases tout ce qui est autour de soi.' },
  percee:    { name: 'Flèche perçante', icon: 'arrow2', type: 'line', range: 6, dmg: 8, pierce: true, cd: 2,
               desc: 'Traverse toutes les cibles sur la ligne.' },
  grappin:   { name: 'Grappin', icon: 'hook', type: 'line', range: 5, dmg: 4, pull: true, cd: 2,
               desc: 'Attire la cible jusqu’à soi (au-dessus d’une fosse, elle tombe !).' },
  meteore:   { name: 'Météore', icon: 'meteor', type: 'point', area: 'plus', range: 4, dmg: 10, cd: 3, ff: true,
               desc: 'Écrase une zone en croix. Touche aussi ton allié.' },
  bond:      { name: 'Bond', icon: 'leap', type: 'leap', area: 'ring4', range: 3, dmg: 7, cd: 2,
               desc: 'Saute sur une case libre et frappe les 4 cases autour de l’atterrissage.' },
  egide:     { name: 'Égide', icon: 'shield', type: 'ally', range: 3, shield: 1, cd: 3,
               desc: 'Donne un bouclier (bloque le prochain coup) à un héros.' },
  permut:    { name: 'Permutation', icon: 'swap', type: 'swap', range: 5, dmg: 3, cd: 2,
               desc: 'Échange de place avec n’importe quelle unité (sauf boss et golems).' },
  dard:      { name: 'Dard venimeux', icon: 'drop', type: 'line', range: 4, dmg: 3, poison: 4, cd: 1,
               desc: 'Empoisonne : 4 dégâts par tour pendant 3 tours.' },
  gel:       { name: 'Gel', icon: 'snow', type: 'point', area: 'single', range: 3, dmg: 4, stun: 1, cd: 3, needUnit: true,
               desc: 'Gèle une cible : elle passe son prochain tour.' },
  execution: { name: 'Exécution', icon: 'skull', type: 'line', range: 1, dmg: 7, exec: 2, cd: 2,
               desc: '×3 dégâts sur une cible sous 50 % de ses PV.' },
  rempart:   { name: 'Mur de pierre', icon: 'wall', type: 'place', place: 'wall', range: 3, cd: 2,
               desc: 'Fait surgir un rocher pendant 3 tours (bloque, sert de mur pour les collisions).' },
  ordre:     { name: 'Ordre', icon: 'flag', type: 'ally', range: 6, order: true, otherOnly: true, cd: 4,
               desc: 'Ton allié peut rejouer : il récupère son action et son déplacement.' },
  foudre:    { name: "Chaîne d'éclairs", icon: 'bolt', type: 'point', area: 'single', range: 4, dmg: 8, chain: 2, cd: 3, needUnit: true,
               desc: 'Frappe une cible puis rebondit sur 2 ennemis proches.' },
  morsure:   { name: 'Morsure', icon: 'fang', type: 'line', range: 1, dmg: 8, lifesteal: 6, cd: 2,
               desc: 'Frappe au contact et te rend 6 %.' },
  piege:     { name: 'Piège à mâchoires', icon: 'trap', type: 'place', place: 'trap', range: 3, dmg: 12, cd: 2,
               desc: 'Pose un piège invisible pour les ennemis : 12 dégâts + étourdit.' },
  bourrasque:{ name: 'Bourrasque', icon: 'wind', type: 'line', range: 4, dmg: 3, push: 3, cd: 2,
               desc: 'Projette la première cible de 3 cases.' },
  brasier:   { name: 'Brasier', icon: 'fire', type: 'point', area: 'plus', range: 3, dmg: 4, fire: 2, cd: 3,
               desc: 'Embrase une zone en croix pendant 2 tours (5 dégâts par tour à qui y reste).' },
  provoc:    { name: 'Provocation', icon: 'taunt', type: 'self', area: 'none', taunt: 4, shield: 1, cd: 3,
               desc: 'Bouclier + les ennemis à 4 cases ou moins ne visent que toi au prochain tour.' },
  ricochet:  { name: 'Ricochet', icon: 'ricochet', type: 'line', range: 5, dmg: 7, chain: 1, cd: 1,
               desc: 'Tir qui rebondit sur un 2e ennemi proche.' },
  bombe:     { name: 'Bombe', icon: 'bomb', type: 'place', place: 'bomb', range: 4, dmg: 16, cd: 3,
               desc: 'Pose une bombe qui explose au début du tour ennemi (3×3, touche aussi les héros).' },
  repli:     { name: 'Repli', icon: 'repli', type: 'leap', area: 'none', range: 3, dmg: 0, shield: 1, cd: 2,
               desc: 'Saute sur une case libre et gagne un bouclier.' },
  vortex:    { name: 'Vortex', icon: 'vortex', type: 'point', area: 'vortex', range: 4, dmg: 3, cd: 3,
               desc: 'Attire d’une case vers le centre tout ce qui est à 2 cases ou moins.' },
  seisme:    { name: 'Séisme', icon: 'quake', type: 'self', area: 'diamond2', dmg: 6, stun: 1, cd: 4, ff: true,
               desc: 'Frappe et étourdit tout à 2 cases ou moins (allié compris).' },
};
const SKILL_POOL = Object.keys(SKILLS).filter(k => !SKILLS[k].basic);

/* ---------- Améliorations (sur une compétence) ----------
   v = multiplicateur de difficulté (1 ou 2) */
const UPGRADES = {
  puissance: { name: 'Puissance', desc: v => `+${30 * v} % de dégâts`, ok: s => s.dmg > 0, apply: (s, v) => { s.dmg *= 1 + 0.3 * v; } },
  allonge:   { name: 'Allonge', desc: v => `+${v} de portée`, ok: s => s.range > 0 && s.type !== 'self', apply: (s, v) => { s.range += v; } },
  rapidite:  { name: 'Rapidité', desc: v => `recharge −${v}`, ok: s => s.cd > 0, apply: (s, v) => { s.cd = Math.max(0, s.cd - v); } },
  recul:     { name: 'Recul', desc: v => `repousse de +${v} case${v > 1 ? 's' : ''}`, ok: s => s.dmg > 0 || s.push > 0, apply: (s, v) => { s.push += v; } },
  venin:     { name: 'Venin', desc: v => `empoisonne (${3 * v} par tour, 3 tours)`, ok: s => s.dmg > 0, apply: (s, v) => { s.poison += 3 * v; } },
  sonnant:   { name: 'Sonnant', desc: v => `étourdit ${v} tour${v > 1 ? 's' : ''}`, ok: s => s.dmg > 0, apply: (s, v) => { s.stun = Math.max(s.stun, v); } },
  percant:   { name: 'Perçant', desc: v => v > 1 ? 'traverse toutes les cibles et +25 % de dégâts' : 'traverse toutes les cibles', ok: s => s.type === 'line' && s.range > 1 && !s.pierce, apply: (s, v) => { s.pierce = true; if (v > 1) s.dmg *= 1.25; } },
  eclats:    { name: 'Éclats', desc: v => `${40 * v} % des dégâts sur les cases voisines de la cible`, ok: s => s.dmg > 0, apply: (s, v) => { s.splash += 0.4 * v; } },
  sangsue:   { name: 'Sangsue', desc: v => `chaque coup te rend ${2 * v} %`, ok: s => s.dmg > 0, apply: (s, v) => { s.lifesteal += 2 * v; } },
  echo:      { name: 'Écho', desc: v => `frappe une 2e fois à ${40 * v} %`, ok: s => s.dmg > 0, apply: (s, v) => { s.echo += 0.4 * v; } },
  vif:       { name: 'Vif', desc: v => `après usage : ${v + 1} cases de déplacement en plus`, ok: s => true, apply: (s, v) => { s.vif += v + 1; } },
  bourreau:  { name: 'Bourreau', desc: v => `×${1 + v} de dégâts sur une cible sous 50 % de ses PV`, ok: s => s.dmg > 0, apply: (s, v) => { s.exec += v; } },
  rebond:    { name: 'Rebond', desc: v => `rebondit sur ${v} autre${v > 1 ? 's' : ''} ennemi${v > 1 ? 's' : ''}`, ok: s => s.dmg > 0 && (s.type === 'line' || s.area === 'single'), apply: (s, v) => { s.chain += v; } },
};

/* ---------- Règles (changent le jeu pour les deux héros) ---------- */
const RULES = {
  diagonales: { name: 'Diagonales', desc: 'Les héros se déplacent aussi en diagonale.' },
  elan:       { name: 'Élan', desc: '+1 case de déplacement pour les deux héros.' },
  adrenaline: { name: 'Adrénaline', desc: 'Tuer un ennemi rend l’action du héros (1 fois par tour).' },
  explosifs:  { name: 'Cadavres explosifs', desc: 'Les ennemis tués explosent (5 dégâts autour d’eux).' },
  gravite:    { name: 'Gravité', desc: 'Toutes les poussées vont 1 case plus loin.' },
  lien:       { name: 'Lien vital', desc: 'Quand un héros tue, l’autre récupère aussi 3 %.' },
  ferveur:    { name: 'Ferveur', desc: 'Tuer un ennemi soigne de +5 % en plus.' },
  percussion: { name: 'Percussion', desc: 'Les collisions font 2× plus de dégâts (10).' },
  souffle:    { name: 'Second souffle', desc: 'Au début de chaque salle : +10 % aux deux héros.' },
  riposte:    { name: 'Riposte', desc: 'Un héros frappé au corps à corps renvoie 6 dégâts.' },
  relais:     { name: 'Relais', desc: 'Un héros peut se déplacer sur son allié pour échanger leurs places.' },
  initiative: { name: 'Initiative', desc: 'Les ennemis sont étourdis au premier tour de chaque salle.' },
  ricochets:  { name: 'Ricochets', desc: 'Les attaques en ligne rebondissent sur un ennemi proche.' },
  vivacite:   { name: 'Vivacité', desc: 'Toutes les recharges −1.' },
  fureur:     { name: 'Fureur', desc: '+30 % de dégâts pour un héros sous 70 %.' },
  pillards:   { name: 'Ennemis fragiles', desc: 'Les ennemis ont 20 % de PV en moins.' },
};

/* ---------- Pactes (bonus + malus temporaires) ----------
   le bonus est multiplié par la difficulté, pas le malus */
const PACTS = {
  verre:    { name: 'Canon de verre', bonus: v => `+${40 * v} % de dégâts infligés`, malus: 'dégâts subis +50 %' },
  frenesie: { name: 'Frénésie', bonus: v => v > 1 ? '2 actions par tour, +1 portée' : '2 actions par tour', malus: 'déplacement limité à 1 case' },
  nuee:     { name: 'Nuée', bonus: v => `tuer soigne +${5 * v} % en plus`, malus: '+2 ennemis par salle' },
  sang:     { name: 'Pacte de sang', bonus: v => `les soins des kills ×${v + 1}`, malus: '−10 % au début de chaque salle' },
  sprint:   { name: 'Sprint', bonus: v => `+${2 * v} cases de déplacement`, malus: 'toutes les recharges +1' },
  tempete:  { name: 'Tempête', bonus: v => `+${30 * v} % de dégâts`, malus: 'la foudre frappe 2 cases au hasard chaque tour (annoncées)' },
  titan:    { name: 'Peau de titan', bonus: v => `−${25 * v} % de dégâts subis`, malus: '−25 % de dégâts infligés' },
  brume:    { name: 'Brume', bonus: v => `+${35 * v} % de dégâts`, malus: 'portée −1 (minimum 1)' },
  hate:     { name: 'Hâte', bonus: v => `recharges −${v}`, malus: 'ennemis +1 déplacement' },
  colere:   { name: 'Colère', bonus: v => `poussées +${v}, collisions ×2`, malus: 'vos héros perdent 3 % au début de chaque tour' },
};

/* ---------- Ennemis ----------
   dmg = points de % retirés à un héros (et PV retirés à un autre ennemi en cas de tir ami) */
const ENEMIES = {
  rodeur:     { name: 'Rôdeur', hp: 12, move: 3, ai: 'melee', dmg: 5, shape: 'circle', color: '#e2574c', minDepth: 0, w: 5,
                desc: 'Fonce et frappe au corps à corps.' },
  archer:     { name: 'Archer', hp: 9, move: 2, ai: 'ranged', range: 5, dmg: 4, shape: 'triangle', color: '#e8a33d', minDepth: 0, w: 4,
                desc: 'Tire en ligne droite (5 cases). Ne tire pas à travers ses alliés.' },
  brute:      { name: 'Brute', hp: 24, move: 2, ai: 'melee', dmg: 8, push: 1, shape: 'square', color: '#b84a45', minDepth: 2, w: 3,
                desc: 'Lente mais robuste. Repousse le héros qu’elle frappe.' },
  artilleur:  { name: 'Artilleur', hp: 12, move: 1, ai: 'artillery', range: 7, dmg: 8, shape: 'diamond', color: '#d97a4a', minDepth: 5, w: 2,
                desc: 'Vise une zone en croix qui explose au tour ennemi suivant. Touche aussi ses alliés !' },
  kamikaze:   { name: 'Bombe rampante', hp: 6, move: 4, ai: 'kamikaze', dmg: 10, shape: 'blob', color: '#ff5d8f', minDepth: 8, w: 2,
                desc: 'S’arme à côté d’un héros et explose au tour suivant (8 cases autour). Explose aussi si on la tue.' },
  chaman:     { name: 'Chaman', hp: 14, move: 2, ai: 'healer', range: 3, dmg: 3, heal: 8, shape: 'hex', color: '#57c785', minDepth: 11, w: 1.5,
                desc: 'Soigne ses alliés blessés, sinon les protège d’un bouclier.' },
  spectre:    { name: 'Spectre', hp: 12, move: 6, ai: 'spectre', dmg: 6, shape: 'ghost', color: '#9fb7ff', minDepth: 14, w: 2,
                desc: 'Se téléporte à côté du héros le plus faible pour le frapper.' },
  golem:      { name: 'Golem', hp: 40, move: 1, ai: 'melee', dmg: 11, immunePush: true, shape: 'square', color: '#8a8f9e', minDepth: 18, w: 1.5,
                desc: 'Énorme, très lent, impossible à pousser.' },
  invocateur: { name: 'Invocateur', hp: 18, move: 2, ai: 'summoner', dmg: 3, shape: 'hex', color: '#b06ad9', minDepth: 22, w: 1,
                desc: 'Reste en retrait et invoque un Rôdeur tous les 2 tours (3 fois au plus).' },
};
const SUMMON_LIMIT = 10;

/* ---------- Boss ---------- */
const BOSSES = {
  colosse:  { name: 'Le Colosse', hp: 95, move: 2, dmg: 10, special: 13, immunePush: true, color: '#c9a227', shape: 'square',
              desc: 'Frappe au corps à corps. Tous les 3 tours, annonce un séisme autour de lui (2 cases).' },
  reine:    { name: 'La Reine des Nuées', hp: 65, move: 2, dmg: 6, range: 5, color: '#e05a9a', shape: 'hex',
              desc: 'Tire en ligne. Tous les 3 tours, invoque des Rôdeurs (1, ou 2 en ★★).' },
  oracle:   { name: "L'Oracle", hp: 50, move: 0, dmg: 10, color: '#7fd6ff', shape: 'diamond',
              desc: 'Chaque tour : annonce un laser sur une ligne ou une colonne entière, puis se téléporte loin.' },
  forgeron: { name: 'Le Forgeron', hp: 88, move: 2, dmg: 9, special: 12, push: 2, color: '#ff7b3a', shape: 'square',
              desc: 'Frappe et repousse de 2. Un tour sur deux, lance son marteau sur une zone 3×3 qui reste en feu.' },
  hydre:    { name: "L'Hydre", hp: 36, move: 0, dmg: 6, range: 5, heads: 3, color: '#4fd18b', shape: 'blob',
              desc: 'Trois têtes immobiles qui tirent en ligne. Chaque tête tranchée rend les autres plus fortes.' },
};
const BOSS_ORDER = ['colosse', 'reine', 'oracle', 'forgeron', 'hydre'];

/* ---------- Traits de salle ---------- */
const TRAITS = {
  brouillard: { name: 'Brouillard', desc: 'Portée des héros −1.', bad: true },
  instable:   { name: 'Sol instable', desc: 'Beaucoup de fosses : pousse les ennemis dedans !', bad: false },
  renforts:   { name: 'Renforts', desc: '2 ennemis arrivent au tour 3.', bad: true },
  frenetique: { name: 'Ennemis frénétiques', desc: 'Ennemis +1 déplacement.', bad: true },
  poudriere:  { name: 'Poudrière', desc: 'Plein de barils explosifs.', bad: false },
  surprise:   { name: 'Surprise', desc: 'Les ennemis sont étourdis au premier tour.', bad: false },
  coulee:     { name: 'Coulée de lave', desc: 'Des cases de lave (dégâts à qui s’y arrête).', bad: true },
  etroit:     { name: 'Couloirs', desc: 'Beaucoup de rochers.', bad: false },
};

/* ---------- Ères (changent toutes les 10 salles) ---------- */
const ERAS = [
  { name: 'Les Cryptes', desc: 'Rochers et fosses.', floor: ['#2b3040', '#262b39'], rock: '#555d75', rockTop: '#6c7591', accent: '#9db3df', bg: '#121521' },
  { name: 'La Forêt Noire', desc: 'Plus de rochers : des couloirs étroits.', floor: ['#203527', '#1c3023'], rock: '#3e6146', rockTop: '#52805c', accent: '#86e39a', bg: '#0d1611' },
  { name: 'La Forge', desc: 'De la lave apparaît dans les salles.', floor: ['#3b2723', '#35231f'], rock: '#674236', rockTop: '#875745', accent: '#ffa064', bg: '#170e0c' },
  { name: 'Les Abysses', desc: 'Beaucoup plus de fosses.', floor: ['#1a2b3e', '#172738'], rock: '#2f4c6b', rockTop: '#3f6690', accent: '#63d4ff', bg: '#09111b' },
  { name: 'Le Néant', desc: 'Chaque salle a un trait particulier.', floor: ['#2b203c', '#261c35'], rock: '#4d3a69', rockTop: '#664e8c', accent: '#cf9bff', bg: '#100b18' },
];

/* ---------- Talents définitifs (achetés avec l'or des boss) ---------- */
const TALENTS = {
  vigueur:    { name: 'Vigueur', desc: '+10 % de maximum pour les deux héros.', base: 14, step: 6, max: 5 },
  agilite:    { name: 'Agilité', desc: '+1 case de déplacement.', base: 28, step: 18, max: 2 },
  soif:       { name: 'Soif', desc: '+2 % de soin par kill.', base: 12, step: 8, max: 4 },
  robustesse: { name: 'Robustesse', desc: '−10 % de dégâts subis.', base: 16, step: 10, max: 3 },
  egide:      { name: 'Égide innée', desc: 'Chaque héros commence chaque salle avec un bouclier.', base: 30, step: 0, max: 1 },
  choix:      { name: 'Clairvoyance', desc: '4 portes au choix au lieu de 3.', base: 34, step: 0, max: 1 },
  prosperite: { name: 'Prospérité', desc: '+25 % d’or gagné sur les boss.', base: 20, step: 15, max: 3 },
  repos:      { name: 'Convalescence', desc: '+3 % aux deux héros après chaque salle.', base: 18, step: 12, max: 3 },
};

/* coût pour graver (rendre définitif) un effet temporaire ; augmente à chaque gravure du même type */
const ENGRAVE_COST = { skill: 10, upgrade: 6, rule: 12 };
const ENGRAVE_STEP = { skill: 3, upgrade: 2, rule: 4 };

/* durées (en salles) des récompenses */
const DUR = { skill: 5, upgrade: 6, rule: 4, pact: 3, haste: 4 };
