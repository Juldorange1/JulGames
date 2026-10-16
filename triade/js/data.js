'use strict';
/* =========================================================
   TRIADE — données du jeu (héros, compétences, améliorations,
   règles, pactes, ennemis, boss, traits de salle, ères)
   ========================================================= */

let GRID_W = 9, GRID_H = 7;   // taille de la salle en cours (change à chaque salle)
const FLOOR_PCT = 40;      // plancher du % de dégâts
const KILL_HEAL = 5;       // soin (en points de %) pour le héros qui tue

/* ---------- Héros ---------- */
const HEROES = {
  brann: { name: 'Brann', title: 'Le Rempart', color: '#ff8a3d', basic: 'coup', move: 3,
    desc: 'Corps à corps. Son attaque repousse : parfait pour envoyer les ennemis dans les fosses.',
    tips: ['Pousse un ennemi dans une fosse ou le vide : il meurt sur le coup.', 'Pousse-le contre un mur ou un autre ennemi : collision, dégâts aux deux.', 'Place-le devant tes héros fragiles.'] },
  lyse:  { name: 'Lyse', title: 'La Flèche', color: '#5ad0ff', basic: 'tir', move: 3,
    desc: 'Tire en ligne droite de loin. Fragile si on la laisse se faire encercler.',
    tips: ['Garde des alliés entre elle et les ennemis.', 'Ses tirs s’arrêtent sur la première cible : vise les lignes dégagées.', 'Elle ne voit pas dans les buissons (sauf au contact).'] },
  kael:  { name: 'Kael', title: "L'Ombre", color: '#c08cff', basic: 'entaille', move: 4,
    desc: 'Très mobile (4 cases) et frappe fort au contact.',
    tips: ['Va finir les ennemis isolés et les archers en retrait.', 'Ses 4 cases de déplacement lui permettent de frapper puis de rester hors d’atteinte… si tu calcules bien.', 'Parfait pour tuer le Voleur des salles de Chasse.'] },
  mira:  { name: 'Mira', title: "L'Étincelle", color: '#6dffae', basic: 'eclat', move: 3,
    desc: 'Frappe n’importe quelle case à portée, même derrière un mur.',
    tips: ['Touche les ennemis cachés derrière les rochers et dans les buissons.', 'Reste à 3 cases : hors de portée des corps à corps, à portée de tir.', 'Idéale pour casser coffres, orbes et cristaux de loin.'] },
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
  eclat:     { name: 'Éclat', icon: 'spark', type: 'point', area: 'single', range: 3, dmg: 8, cd: 0, basic: true,
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
               desc: 'Écrase une zone en croix. Touche aussi tes alliés.' },
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
               desc: 'Un allié peut rejouer : il récupère son action et son déplacement.' },
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
  sonnant:   { name: 'Sonnant', desc: v => `étourdit ${v} tour${v > 1 ? 's' : ''}`, ok: s => s.dmg > 0 && s.cd >= 2, apply: (s, v) => { s.stun = Math.max(s.stun, v); } },
  percant:   { name: 'Perçant', desc: v => v > 1 ? 'traverse toutes les cibles et +25 % de dégâts' : 'traverse toutes les cibles', ok: s => s.type === 'line' && s.range > 1 && !s.pierce, apply: (s, v) => { s.pierce = true; if (v > 1) s.dmg *= 1.25; } },
  eclats:    { name: 'Éclats', desc: v => `${40 * v} % des dégâts sur les cases voisines de la cible`, ok: s => s.dmg > 0, apply: (s, v) => { s.splash += 0.4 * v; } },
  sangsue:   { name: 'Sangsue', desc: v => `chaque coup te rend ${2 * v} %`, ok: s => s.dmg > 0, apply: (s, v) => { s.lifesteal += 2 * v; } },
  echo:      { name: 'Écho', desc: v => `frappe une 2e fois à ${40 * v} %`, ok: s => s.dmg > 0, apply: (s, v) => { s.echo += 0.4 * v; } },
  bourreau:  { name: 'Bourreau', desc: v => `×${1 + v} de dégâts sur une cible sous 50 % de ses PV`, ok: s => s.dmg > 0, apply: (s, v) => { s.exec += v; } },
  plafond:   { name: 'Plafond', desc: v => `+${30 * v} % de dégâts maximum`, ok: s => s.dmg > 0, apply: (s, v) => { s.capMult += 0.3 * v; } },
  rebond:    { name: 'Rebond', desc: v => `rebondit sur ${v} autre${v > 1 ? 's' : ''} ennemi${v > 1 ? 's' : ''}`, ok: s => s.dmg > 0 && (s.type === 'line' || s.area === 'single'), apply: (s, v) => { s.chain += v; } },
};

/* ---------- Règles (changent le jeu pour tous les héros) ---------- */
const RULES = {
  diagonales: { name: 'Diagonales', desc: 'Les héros se déplacent aussi en diagonale.' },
  adrenaline: { name: 'Adrénaline', desc: 'Tuer un ennemi rend l’action du héros (1 fois par tour).' },
  explosifs:  { name: 'Cadavres explosifs', desc: 'Les ennemis tués explosent : 5 dégâts aux ennemis autour (les héros ne sont pas touchés).' },
  gravite:    { name: 'Gravité', desc: 'Toutes les poussées vont 1 case plus loin.' },
  lien:       { name: 'Lien vital', desc: 'Quand un héros tue, les autres récupèrent aussi 3 %.' },
  ferveur:    { name: 'Ferveur', desc: 'Tuer un ennemi soigne de +5 % en plus.' },
  percussion: { name: 'Percussion', desc: 'Les collisions font 2× plus de dégâts (10).' },
  souffle:    { name: 'Second souffle', desc: 'Au début de chaque salle : +10 % à tous les héros.' },
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
  nuee:     { name: 'Nuée', bonus: v => `tuer soigne +${5 * v} % en plus`, malus: '+1 ennemi par salle' },
  sang:     { name: 'Pacte de sang', bonus: v => `les soins des kills ×${v + 1}`, malus: '−10 % au début de chaque salle' },
  tempete:  { name: 'Tempête', bonus: v => `+${30 * v} % de dégâts`, malus: 'la foudre frappe 2 cases au hasard chaque tour (annoncées)' },
  titan:    { name: 'Peau de titan', bonus: v => `−${25 * v} % de dégâts subis`, malus: '−15 % de dégâts infligés' },
  brume:    { name: 'Brume', bonus: v => `+${35 * v} % de dégâts`, malus: 'portée −1 (minimum 1)' },
  hate:     { name: 'Hâte', bonus: v => `recharges −${v}`, malus: 'ennemis +1 déplacement' },
  colere:   { name: 'Colère', bonus: v => `poussées +${v}, collisions ×2`, malus: 'un héros qui n’a pas attaqué à son tour perd 2 %' },
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
  scissipare: { name: 'Scissipare', hp: 16, move: 2, ai: 'melee', dmg: 5, shape: 'blob', color: '#c6e05a', minDepth: 5, w: 2, split: true,
                desc: 'Touché sans mourir, il se divise en deux (PV partagés). Tue-le d’un seul coup, ou fais-le tomber.' },
  totem:      { name: 'Totem', hp: 16, move: 0, ai: 'totem', dmg: 0, shape: 'totem', color: '#d9b55a', minDepth: 7, w: 1.3, immunePush: true,
                desc: 'Immobile, n’attaque pas. Les ennemis sur les 8 cases autour de lui ne subissent que la moitié des dégâts.' },
  carapace:   { name: 'Carapace', hp: 18, move: 2, ai: 'melee', dmg: 6, shape: 'shell', color: '#4fb0a8', minDepth: 9, w: 1.8, armor: 2,
                desc: 'Les attaques directes ne lui font que 2 dégâts. Collisions, chutes, explosions, feu, poison et pièges font des dégâts normaux.' },
  jumeau:     { name: 'Jumeau', hp: 12, move: 3, ai: 'melee', dmg: 5, shape: 'circle', color: '#ff9ad5', minDepth: 12, w: 1.6,
                desc: 'Arrivent par deux. Si un seul meurt, l’autre le fait revenir au tour ennemi suivant (sans soin pour toi). Tue les deux dans le même tour.' },
  miroitier:  { name: 'Miroitier', hp: 14, move: 2, ai: 'mirror', range: 3, dmg: 4, shape: 'diamond', color: '#a0a8ff', minDepth: 16, w: 1.2,
                desc: 'Tous les 3 tours (dès son 1er tour), crée l’Ombre d’un héros à sa position en miroir (2 Ombres au plus).' },
  ombre:      { name: 'Ombre', hp: 8, move: 0, ai: 'ombre', dmg: 6, shape: 'ghost', color: '#2e3247', minDepth: 999, w: 0,
                desc: 'Clone d’un héros. Quand CE héros bouge (marche, saut, poussée…), l’Ombre fait le même mouvement en miroir (gauche ↔ droite). Si elle tombe dans une fosse, elle meurt et le kill compte. À la fin de ton tour, elle frappe les héros à côté d’elle.' },
  lancier:    { name: 'Lancier', hp: 14, move: 2, ai: 'lance', range: 2, dmg: 6, shape: 'spear', color: '#d9c46a', minDepth: 3, w: 2.2,
                desc: 'Frappe les 2 cases devant lui en ligne droite (ses alliés aussi).' },
  souffleur:  { name: 'Souffleur', hp: 12, move: 2, ai: 'blow', range: 4, dmg: 3, push: 2, shape: 'circle', color: '#8fd6ff', minDepth: 4, w: 2,
                desc: 'Souffle à distance : repousse un héros de 2 cases (fosses, lave, piques…).' },
  grappineur: { name: 'Grappineur', hp: 12, move: 2, ai: 'hook', range: 5, dmg: 3, shape: 'hex', color: '#c98f5a', minDepth: 6, w: 1.6,
                desc: 'Lance un crochet à distance : attire un héros jusqu’à lui.' },
  tisseur:    { name: 'Tisseur', hp: 10, move: 2, ai: 'weaver', range: 3, dmg: 3, shape: 'diamond', color: '#9ad1a0', minDepth: 10, w: 1.3,
                desc: 'Fait surgir un rocher à côté d’un héros (2 tours) pour lui bloquer le passage.' },
  charognard: { name: 'Charognard', hp: 14, move: 3, ai: 'melee', dmg: 5, shape: 'blob', color: '#a3a35a', minDepth: 13, w: 1.5, scav: true,
                desc: 'Chaque fois qu’un autre ennemi meurt, il gagne +4 PV et +1 dégât. Tue-le en premier !' },
  eveille:    { name: 'Éveillé', hp: 14, move: 2, ai: 'melee', dmg: 4, shape: 'circle', color: '#f08a5a', minDepth: 4, w: 1.8, grows: true,
                desc: 'Devient plus fort à chaque tour : +12 % de dégâts et +3 PV par tour. Tue-le vite !' },
  enrage:     { name: 'Enragé', hp: 20, move: 2, ai: 'melee', dmg: 5, shape: 'square', color: '#d94040', minDepth: 6, w: 1.6,
                desc: 'Chaque coup reçu le rend plus fort (+2 dégâts) et plus rapide (jusqu’à +2 déplacement). Tue-le d’un coup.' },
  gardien:    { name: 'Gardien de givre', hp: 18, move: 1, ai: 'frost', dmg: 0, shape: 'hex', color: '#9fe0ff', minDepth: 8, w: 1.3,
                desc: 'N’attaque pas. Les héros qui commencent leur tour à 2 cases ou moins de lui ont −2 déplacement.' },
  semeur:     { name: 'Semeur', hp: 12, move: 2, ai: 'sower', range: 3, dmg: 0, shape: 'diamond', color: '#8fbf4a', minDepth: 9, w: 1.4,
                desc: 'Fait pousser des piques à côté d’un héros chaque tour : le terrain devient de plus en plus dangereux.' },
  pyromane:   { name: 'Pyromane', hp: 12, move: 2, ai: 'pyro', range: 6, dmg: 5, shape: 'triangle', color: '#ff7a2a', minDepth: 11, w: 1.5,
                desc: 'Annonce un embrasement en croix sur un héros : ça brûle au tour suivant puis reste en feu 2 tours.' },
  martyr:     { name: 'Martyr', hp: 10, move: 3, ai: 'melee', dmg: 3, shape: 'circle', color: '#f2e6b0', minDepth: 10, w: 1.3,
                desc: 'En mourant, soigne tous ses alliés de 8 PV et donne un bouclier à ceux qui le touchent.' },
  miroir:     { name: 'Miroir', hp: 16, move: 2, ai: 'melee', dmg: 4, shape: 'diamond', color: '#c9d6ff', minDepth: 15, w: 1.3,
                desc: 'Renvoie 40 % des dégâts directs reçus au héros qui l’attaque (en %). Utilise les collisions, le feu, les chutes…' },
  coureur:    { name: 'Coureur', hp: 11, move: 4, ai: 'skirmish', dmg: 5, shape: 'triangle', color: '#f7c948', minDepth: 7, w: 1.6,
                desc: 'Frappe puis recule de 2 cases. Difficile à coincer.' },
  sapeur:     { name: 'Sapeur', hp: 13, move: 2, ai: 'sapper', range: 4, dmg: 0, shape: 'square', color: '#b08a5a', minDepth: 16, w: 1.3,
                desc: 'Annonce l’effondrement de la case d’un héros : au tour ennemi suivant, elle devient une fosse (qui y est encore tombe : −12 %). 4 fosses au plus.' },
  etendard:   { name: 'Porte-étendard', hp: 16, move: 1, ai: 'banner', dmg: 0, shape: 'spear', color: '#e0b84a', minDepth: 12, w: 1.3,
                desc: 'N’attaque pas. Les ennemis à 2 cases ou moins de lui frappent 30 % plus fort. Il reste derrière ses alliés : va le chercher.' },
  sentinelle: { name: 'Sentinelle', hp: 12, move: 2, ai: 'ranged', range: 5, dmg: 4, shape: 'triangle', color: '#ff8f6b', minDepth: 19, w: 1.3, watch: true,
                desc: 'Fait le guet sur sa ligne et sa colonne (5 cases) : un héros qui s’arrête dans sa ligne de mire PENDANT TON TOUR se fait tirer dessus (une fois par tour). Tire aussi à son tour.' },
  voleur:     { name: 'Voleur', hp: 10, move: 2, ai: 'flee', dmg: 0, shape: 'triangle', color: '#ffd166', minDepth: 999, w: 0,
                desc: 'Ne se bat pas : il fuit. Tue-le avant la fin du compte à rebours.' },
};
const SUMMON_LIMIT = 10;
const MAX_OMBRES = 2;

/* ---------- Boss ---------- */
const BOSSES = {
  colosse:  { name: 'Le Colosse', hp: 95, move: 2, dmg: 10, special: 13, immunePush: true, color: '#c9a227', shape: 'square',
              desc: 'Frappe au corps à corps. Tous les 3 tours, annonce un séisme autour de lui (2 cases).' },
  reine:    { name: 'La Reine des Nuées', hp: 65, move: 2, dmg: 6, range: 5, color: '#e05a9a', shape: 'hex',
              desc: 'Tire en ligne. Tous les 3 tours, invoque des Rôdeurs (1, ou 2 en ★★).' },
  oracle:   { name: "L'Oracle", hp: 80, move: 2, dmg: 11, color: '#7fd6ff', shape: 'diamond',
              desc: 'Chaque tour : annonce un laser sur une ligne ou une colonne entière. Un tour sur deux, il se téléporte (toujours à 3-4 cases d’un héros).' },
  forgeron: { name: 'Le Forgeron', hp: 88, move: 2, dmg: 9, special: 12, push: 2, color: '#ff7b3a', shape: 'square',
              desc: 'Frappe et repousse de 2. Un tour sur deux, lance son marteau sur une zone 3×3 qui reste en feu.' },
  hydre:    { name: "L'Hydre", hp: 36, move: 0, dmg: 6, range: 5, heads: 3, color: '#4fd18b', shape: 'blob',
              desc: 'Trois têtes immobiles qui tirent en ligne (elles se téléportent si tu restes hors de portée). Chaque tête tranchée rend les autres plus fortes.' },
};
BOSSES.reflet = { name: 'Le Reflet', hp: 70, move: 2, dmg: 8, range: 4, color: '#9aa3ff', shape: 'diamond',
  desc: 'Tire en ligne. Au début puis tous les 3 tours, crée l’Ombre d’un héros (elle copie ses mouvements en miroir).' };
BOSSES.geolier = { name: 'Le Geôlier', hp: 85, move: 2, dmg: 9, color: '#9aa0b4', shape: 'hex',
  desc: 'Frappe au corps à corps. Tous les 2 tours, enchaîne le héros le plus loin de lui : il ne peut plus bouger pendant 2 tours (il peut encore attaquer). Un héros enchaîné qui frappe le Geôlier brise sa chaîne.' };
const BOSS_ORDER = ['colosse', 'reine', 'oracle', 'forgeron', 'hydre', 'reflet', 'geolier'];

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
  reflets:    { name: 'Reflets', desc: 'Chaque héros commence avec son Ombre (clone en miroir).', bad: true },
  glacier:    { name: 'Glacier', desc: 'Beaucoup de glace : les poussées glissent loin.', bad: false },
  portails:   { name: 'Portails', desc: 'Deux paires de portails.', bad: false },
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
/* aucun niveau maximum : chaque achat coûte plus cher (base × croissance^niveau) */
const TALENTS = {
  vigueur:    { name: 'Vigueur', desc: '+10 % de maximum pour tous les héros.', base: 14, grow: 1.55 },
  soif:       { name: 'Soif', desc: '+2 % de soin par kill.', base: 12, grow: 1.5 },
  robustesse: { name: 'Robustesse', desc: '−10 % des dégâts subis restants.', base: 16, grow: 1.55 },
  egide:      { name: 'Égide innée', desc: '+1 bouclier au début de chaque salle.', base: 30, grow: 2 },
  choix:      { name: 'Clairvoyance', desc: '+1 porte au choix.', base: 34, grow: 2.4 },
  prosperite: { name: 'Prospérité', desc: '+25 % d’or gagné.', base: 20, grow: 1.6 },
  repos:      { name: 'Convalescence', desc: '+3 % à tous les héros après chaque salle.', base: 18, grow: 1.55 },
};

/* coût pour graver (rendre définitif) un effet temporaire ; augmente à chaque gravure du même type */
const ENGRAVE_COST = { skill: 10, upgrade: 6, rule: 12 };
const ENGRAVE_STEP = { skill: 3, upgrade: 2, rule: 4 };

/* durées (en salles) des récompenses */
const DUR = { skill: 5, upgrade: 6, rule: 4, pact: 3, haste: 4 };

/* ---------- Zones de carte ---------- */
const ZONES = {
  piques:  { name: 'Piques', minDepth: 1, w: 3, color: '#b9bcc9', tip: '−6 PV / −5 % en entrant',
             desc: 'Toute unité qui entre dessus (en marchant, poussée, attirée, téléportée…) subit 6 dégâts (−5 % pour un héros).' },
  buisson: { name: 'Buisson', minDepth: 0, w: 2.5, color: '#4c9a52', tip: 'Invisible aux tirs à distance',
             desc: 'Une unité dans un buisson ne peut pas être visée par les tirs en ligne, sauf au contact (les tirs passent au-dessus).' },
  boue:    { name: 'Boue', minDepth: 1, w: 2, color: '#7a5a3a', tip: 'Arrête tout mouvement',
             desc: 'Entrer dans la boue arrête le déplacement (marche, poussée, glissade).' },
  courant: { name: 'Courant', minDepth: 2, w: 3, color: '#4fa8ff', tip: 'Emporte d’1 case au tour ennemi',
             desc: 'Au début du tour ennemi, ce qui s’y trouve avance d’une case dans le sens de la flèche. Une fosse au bout = chute (héros compris).' },
  autel:   { name: 'Autel', minDepth: 4, w: 1.5, color: '#6dffae', tip: '+5 % / +5 PV par tour',
             desc: 'Un héros qui commence son tour dessus récupère 5 %. Un ennemi dessus récupère 5 PV au tour ennemi.' },
  glace:   { name: 'Glace', minDepth: 5, w: 2.5, color: '#bfeaff', tip: 'Poussé dessus = glisse loin',
             desc: 'Une unité poussée sur la glace continue de glisser jusqu’au premier obstacle (on marche dessus normalement).' },
  rune:    { name: 'Rune de puissance', minDepth: 5, w: 1.8, color: '#ffd166', tip: 'Maximum des compétences ×1,5',
             desc: 'Un héros qui attaque depuis cette case a le MAXIMUM de dégâts de ses compétences augmenté de 50 % (ses dégâts normaux ne changent pas). Utile quand une compétence affiche « 40/16 ».' },
  portail: { name: 'Téléporteurs', minDepth: 2, w: 2, color: '#d68bff', tip: 'Ressort par le portail jumeau',
             desc: 'Entrer dans un téléporteur fait ressortir par son jumeau (même lettre), s’il est libre. Marche, poussée et glissade comprises.' },
  soin:    { name: 'Petit soin', minDepth: 0, w: 2, color: '#6dffae', tip: '+6 % (ou +5 PV), une fois',
             desc: 'Le premier qui marche dessus récupère 6 % (un ennemi : 5 PV). Disparaît ensuite.' },
  foyer:   { name: 'Foyer', minDepth: 1, w: 2, color: '#ff7a2a', tip: 'Brûle en permanence',
             desc: 'Toujours en feu : −5 % au héros qui y commence son tour, 6 dégâts à l’ennemi qui y est au tour ennemi.' },
  trampoline: { name: 'Trampoline', minDepth: 0, w: 2.5, color: '#ff9ad5', tip: 'Fait rebondir 2 cases plus loin',
             desc: 'Une unité qui arrive dessus rebondit 2 cases plus loin dans le même sens (par-dessus tout). Si elle retombe dans un trou : chute !' },
  machoire: { name: 'Piège à mâchoires', minDepth: 1, w: 2, color: '#d9b55a', tip: 'Étourdit et blesse, une fois',
             desc: 'La première unité qui entre dessus est étourdie 1 tour et subit 3 dégâts (−3 %). Le piège se referme ensuite.' },
};

/* ---------- Défis de salle (facultatifs) ---------- */
const GOALS = {
  intact: { name: 'Intouchable', desc: () => 'Aucun héros ne perd de %.' },
  rapide: { name: 'Éclair', desc: n => `Finir en ${n} tour${n > 1 ? 's' : ''} ou moins.` },
  chute:  { name: 'Gravité', desc: () => 'Tuer au moins un ennemi en le faisant tomber.' },
  fracas: { name: 'Fracas', desc: () => 'Tuer 2 ennemis par collision ou explosion.' },
  combo:  { name: 'Combo', desc: () => 'Tuer 2 ennemis avec une seule action.' },
  econome:{ name: 'Économe', desc: () => 'Ne jamais utiliser les attaques de base.' },
};
const GOAL_HEAL = 10;

/* ---------- Phases des boss (déclenchées sous un seuil de PV) ---------- */
BOSSES.colosse.phases  = [{ at: 0.6, name: 'Fureur', tip: 'Séisme tous les 2 tours' }, { at: 0.3, name: 'Éboulement', tip: 'Des rochers tombent sur vous' }];
BOSSES.reine.phases    = [{ at: 0.6, name: 'Essaim', tip: 'Invoque plus souvent' }, { at: 0.3, name: 'Rafale', tip: 'Tire deux fois' }];
BOSSES.oracle.phases   = [{ at: 0.6, name: 'Croisée', tip: 'Laser en croix' }, { at: 0.3, name: 'Clairvoyance', tip: 'Un laser par héros' }];
BOSSES.forgeron.phases = [{ at: 0.6, name: 'Forge ardente', tip: 'Marteau à chaque tour' }, { at: 0.3, name: 'Fournaise', tip: 'Anneau de feu autour de lui' }];
BOSSES.reflet.phases   = [{ at: 0.6, name: 'Miroirs', tip: 'Ombre tous les 2 tours' }, { at: 0.3, name: 'Échange', tip: 'Prend la place d’une Ombre' }];
BOSSES.hydre.phases    = [];
BOSSES.geolier.phases  = [{ at: 0.6, name: 'Traction', tip: 'Les chaînes attirent les héros vers lui' }, { at: 0.3, name: 'Cachot', tip: 'Enferme un héros entre des murs' }];

/* ---------- Types de salles ---------- */
const ROOM_KINDS = {
  normal:  { name: 'Combat', icon: 'blade', tip: 'Tue tous les ennemis.' },
  vagues:  { name: 'Vagues', icon: 'wave', tip: 'Plusieurs vagues d’ennemis arrivent.' },
  survie:  { name: 'Survie', icon: 'hourglass', tip: 'Tiens bon jusqu’à la fin du compte à rebours.' },
  chasse:  { name: 'Chasse', icon: 'run', tip: 'Tue le Voleur avant qu’il s’enfuie.' },
  rituel:  { name: 'Rituel', icon: 'gem', tip: 'Tant qu’un cristal tient, les ennemis sont plus forts et se soignent.' },
};

/* ---------- Infobulles courtes (moins à lire) ---------- */
const TIPS = {
  rodeur: 'Corps à corps', archer: 'Tire en ligne', brute: 'Frappe et repousse', artilleur: 'Bombarde une croix (annoncée)',
  kamikaze: 'Explose à côté de toi', chaman: 'Soigne / protège', spectre: 'Se téléporte sur le plus faible', golem: 'Énorme, inamovible',
  invocateur: 'Invoque des Rôdeurs', scissipare: 'Se divise si touché', totem: '½ dégâts autour de lui', carapace: 'Attaques directes : 2 max',
  jumeau: 'Tuer les deux le même tour', miroitier: 'Crée des Ombres', ombre: 'Copie ton héros en miroir', lancier: 'Frappe 2 cases en ligne',
  souffleur: 'Te repousse de 2 cases', grappineur: 'T’attire à lui', tisseur: 'Crée des murs près de toi', charognard: 'Grandit à chaque mort',
  voleur: 'Fuit : tue-le vite', eveille: 'Plus fort chaque tour', enrage: 'Plus fort à chaque coup reçu', gardien: '−2 déplacement autour',
  semeur: 'Fait pousser des piques', pyromane: 'Embrase une croix (annoncée)', martyr: 'Soigne ses alliés en mourant', miroir: 'Renvoie 40 % des dégâts',
  coureur: 'Frappe et recule', sapeur: 'Creuse une fosse sous toi', etendard: '+30 % de dégâts autour de lui', sentinelle: 'Tire si tu t’arrêtes dans sa ligne',
};

/* ---------- Bonus dans les salles ---------- */
const BONUS = {
  coffre: { name: 'Coffre', desc: 'Casse-le pour gagner de l’or.' },
  orbe:   { name: 'Orbe', desc: 'Casse-la : bonus pour toute la salle.' },
  cercle: { name: 'Cercle de pouvoir', desc: 'Commence 2 tours dedans (pas forcément d’affilée) : or + soin.' },
};
const ORBS = {
  fureur:   { name: 'Fureur', tip: '+40 % de dégâts pour la salle', color: '#ff6b6b' },
  portee:   { name: 'Portée', tip: '+1 portée des compétences pour la salle', color: '#7cc4ff' },
  soin:     { name: 'Soin', tip: '+12 % à tous les héros', color: '#6dffae' },
  egide:    { name: 'Égide', tip: '+1 bouclier à tous les héros', color: '#9fe0ff' },
};
ZONES.cercle = { name: 'Cercle de pouvoir', minDepth: 999, w: 0, color: '#ffd166', tip: '2 tours dedans = or + soin',
  desc: 'Un héros qui commence son tour dans le cercle le charge. Après 2 tours de charge : or et +8 % à tous les héros.' };
/* chaque compétence a des dégâts maximum (par coup), relevables (amélioration Plafond, talent Maîtrise) */
const CAP_MULT = 2;
const RUNE_CAP = 1.5;  // une rune relève le maximum de 50 %
const NB_HEROES = 3;  // taille de l'équipe

/* ---------- Pouvoirs d'élite et mutations de boss ----------
   une élite (étoile) reçoit un pouvoir à partir de la salle 8 (deux en difficulté 5+) ;
   les boss reçoivent une mutation de plus chaque fois que tu as battu tous les boss */
const MODS = {
  blinde:   { name: 'Blindé', icon: 'shield', color: '#9fb7d9', tip: 'Attaques directes −40 %',
              desc: 'Les attaques directes des héros lui font 40 % de dégâts en moins. Collisions, chutes, explosions, feu, poison et pièges font des dégâts normaux.' },
  vif:      { name: 'Vif', icon: 'run', color: '#f7c948', tip: '+1 déplacement',
              desc: 'Se déplace d’une case de plus que les autres de son espèce.' },
  vampire:  { name: 'Vampire', icon: 'drop', color: '#ff5a7a', tip: 'Se soigne en frappant',
              desc: 'Chaque coup qu’il porte à un héros lui rend 15 % de ses PV max (5 % pour un boss).' },
  explosif: { name: 'Explosif', icon: 'bomb', color: '#ff9a3d', tip: 'Explose en mourant', noBoss: true,
              desc: 'En mourant, il explose sur les 8 cases autour : 8 PV aux ennemis, 6 % aux héros. Tue-le au milieu de ses alliés, loin de toi.' },
  lourd:    { name: 'Inébranlable', icon: 'anchor', color: '#a8adbd', tip: 'Impossible à pousser', noBoss: true,
              desc: 'Ne peut être ni poussé, ni attiré. Il faut le frapper.' },
  regen:    { name: 'Régénérant', icon: 'revive', color: '#6dffae', tip: '+10 % PV par tour',
              desc: 'Récupère 10 % de ses PV max à chaque tour ennemi (4 % pour un boss). Concentre tes coups sur lui.' },
  epines:   { name: 'Épineux', icon: 'spikes', color: '#c6e05a', tip: 'Le frapper au contact coûte 3 %',
              desc: 'Un héros qui le frappe depuis une case voisine perd 3 %. Frappe-le de loin.' },
  protege:  { name: 'Protégé', icon: 'gem', color: '#9fe0ff', tip: 'Bouclier tous les 3 tours',
              desc: 'Commence avec un bouclier et en regagne un tous les 3 tours. Un bouclier bloque un coup entier : casse-le d’abord avec une petite attaque.' },
  escorte:  { name: 'Escorte', icon: 'crown', color: '#ffd166', tip: '2 élites en plus', bossOnly: true,
              desc: 'Le boss arrive avec 2 élites en plus.' },
  furie:    { name: 'Furieux', icon: 'bolt', color: '#ff6b6b', tip: '+25 % de dégâts', bossOnly: true,
              desc: 'Le boss frappe 25 % plus fort.' },
};
const ELITE_MODS = Object.keys(MODS).filter(k => !MODS[k].bossOnly);
const BOSS_MODS = Object.keys(MODS).filter(k => !MODS[k].noBoss);

/* ---------- Hauts faits (objectifs à long terme, gardés d'une partie à l'autre) ----------
   ils ne donnent aucune puissance : seul l'or rend les choses définitives */
const FEATS = [
  ['boss1', 'Premier trophée', 'Battre un boss.', 'bosses', 1],
  ['boss10', 'Chasseur', 'Battre 10 boss.', 'bosses', 10],
  ['boss50', 'Fléau des boss', 'Battre 50 boss.', 'bosses', 50],
  ['boss250', 'Légende', 'Battre 250 boss.', 'bosses', 250],
  ['boss1000', 'Mythe', 'Battre 1000 boss.', 'bosses', 1000],
  ['allboss', 'Collection', 'Battre chacun des 7 boss.', 'kinds', 7],
  ['mut1', 'Mutant', 'Battre un boss qui a une mutation.', 'mutBoss', 1],
  ['mut2', 'Chimère', 'Battre un boss qui a 2 mutations.', 'mutBoss', 2],
  ['mut3', 'Abomination', 'Battre un boss qui a 3 mutations.', 'mutBoss', 3],
  ['pboss', 'Sans une égratignure', 'Battre un boss sans perdre le moindre %.', 'perfectBoss', 1],
  ['pboss10', 'Danseur', 'Battre 10 boss sans perdre le moindre %.', 'perfectBoss', 10],
  ['d25', 'Explorateur', 'Atteindre la salle 25.', 'maxDepth', 25],
  ['d50', 'Aventurier', 'Atteindre la salle 50.', 'maxDepth', 50],
  ['d100', 'Pionnier', 'Atteindre la salle 100.', 'maxDepth', 100],
  ['d250', 'Abyssal', 'Atteindre la salle 250.', 'maxDepth', 250],
  ['d500', 'Sans fond', 'Atteindre la salle 500.', 'maxDepth', 500],
  ['d1000', 'Infini', 'Atteindre la salle 1000.', 'maxDepth', 1000],
  ['l3', 'Aguerri', 'Battre un boss en difficulté 3.', 'maxLvlBoss', 3],
  ['l5', 'Vétéran', 'Battre un boss en difficulté 5.', 'maxLvlBoss', 5],
  ['l10', 'Maître', 'Battre un boss en difficulté 10.', 'maxLvlBoss', 10],
  ['l20', 'Grand maître', 'Battre un boss en difficulté 20.', 'maxLvlBoss', 20],
  ['l35', 'Inhumain', 'Battre un boss en difficulté 35.', 'maxLvlBoss', 35],
  ['l50', 'Divin', 'Battre un boss en difficulté 50.', 'maxLvlBoss', 50],
  ['k100', 'Combattant', 'Tuer 100 ennemis.', 'kills', 100],
  ['k1000', 'Massacre', 'Tuer 1 000 ennemis.', 'kills', 1000],
  ['k10000', 'Armée à toi seul', 'Tuer 10 000 ennemis.', 'kills', 10000],
  ['k100000', 'Apocalypse', 'Tuer 100 000 ennemis.', 'kills', 100000],
  ['p10', 'Intouchable', 'Finir 10 salles sans perdre de %.', 'perfect', 10],
  ['p100', 'Fantôme', 'Finir 100 salles sans perdre de %.', 'perfect', 100],
  ['p1000', 'Insaisissable', 'Finir 1 000 salles sans perdre de %.', 'perfect', 1000],
  ['g25', 'Perfectionniste', 'Réussir 25 défis de salle.', 'goals', 25],
  ['g250', 'Virtuose', 'Réussir 250 défis de salle.', 'goals', 250],
  ['g2500', 'Génie tactique', 'Réussir 2 500 défis de salle.', 'goals', 2500],
  ['f50', 'Gravité', 'Faire tomber 50 ennemis dans le vide.', 'falls', 50],
  ['f500', 'Le grand vide', 'Faire tomber 500 ennemis dans le vide.', 'falls', 500],
  ['s50', 'Téméraire', 'Gagner 50 salles ★★.', 'd2', 50],
  ['s500', 'Inconscient', 'Gagner 500 salles ★★.', 'd2', 500],
  ['e10', 'Graveur', 'Graver 10 effets.', 'engraved', 10],
  ['e100', 'Orfèvre', 'Graver 100 effets.', 'engraved', 100],
  ['j1', 'Épreuve', 'Finir une Épreuve du jour.', 'daily', 1],
  ['j30', 'Assidu', 'Finir 30 Épreuves du jour.', 'daily', 30],
  ['j365', 'Une année', 'Finir 365 Épreuves du jour.', 'daily', 365],
  ['js300', 'Bon score', 'Faire 300 points à une Épreuve du jour.', 'dailyBest', 300],
  ['js550', 'Excellent', 'Faire 550 points à une Épreuve du jour.', 'dailyBest', 550],
  ['js800', 'Parfait', 'Faire 800 points à une Épreuve du jour.', 'dailyBest', 800],
].map(([id, name, desc, stat, goal]) => ({ id, name, desc, stat, goal }));
const DAILY_ROOMS = 20;
