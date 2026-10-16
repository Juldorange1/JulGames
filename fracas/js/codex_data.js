// Donnees detaillees du Codex : statistiques chiffrees de chaque personnage, ennemi, boss et
// element de jeu, + les regles. Les valeurs reprennent les constantes du jeu quand elles existent
// (elles restent donc justes si l'equilibrage change).

const r1 = (v) => Math.round(v * 10) / 10;

// [libelle, valeur] par personnage ; affiche dans la fiche du Codex sous "Statistiques".
function codexCharStats(id) {
  const c = getCharacter(id);
  const base = [['Vitesse', `${c.speedPercent}% (${Math.round(BASE_SPEED * c.speedPercent / 100)} px/s)`]];
  const T = {
    1: [['Pistolet (orbite)', 'rayon 95, 1,6 tour/s'], ['Tir auto', `toutes les ${COLT_FIRE_INTERVAL}s · ${r1(20 * 1.33)} degats · 360 px/s`], ['Ricochets', `${COLT_BOUNCES} rebonds sur tout (murs, obstacles, ennemis)`],
      ['Echange (attaque)', 'recharge 0,2 s'], ['Concentration', `tir vise toutes les ${COLT_FOCUS_INTERVAL}s · ${r1(36 * 1.33)} degats`],
      ['C1 Chaos mobile', 'teleporte toutes les tourelles · 14 s'], ['C2 Salve', `rayon 110 · ${r1(30 * 1.33)} degats · 6 s`]],
    2: [['Trampoline', `pose a ${NYX_TRAMP_RANGE} px max · fait sauter de ${NYX_JUMP_DIST} px dans le sens de la pose · ${NYX_TRAMP_MAX} max (le 4e en remplace un au hasard) · ${NYX_ATTACK_CD} s`],
      ['Atterrissage (tout trampoline)', `4 projectiles (haut, bas, gauche, droite) · ${NYX_SHOT_DMG} degats chacun`], ['C1 Echange', `avec la tourelle la plus proche · ${r1(30 * NYX_DMG)} degats · 8 s`],
      ['C2 Trainee de feu', `dash 1,4 s · zones ${r1(3 * NYX_DMG)} degats/0,4 s pendant 3 s · 10 s`], ['C3 Retour', 'position d\'il y a 1 s + 1 s invincible · 6 s']],
    3: [['Boomerang', `${Math.round(KIP_BOOM_SPEED)} px/s · 25 degats aller ET retour · portee 620`], ['Recharge', `${KIP_CATCH_CD} s apres l'avoir rattrape`],
      ['C1 Surcharge', '+20% degats / -10% vitesse (cumulable) · 3 s'], ['C2 Boomerang curseur', 'suit le curseur (bascule)'], ['C3 Piste de glace x5', 'en ligne vers la visee · boomerang +60% · 10 s · 12 s']],
    5: [['Couteaux', `2 par tir, dos a dos (vise + oppose) · ${r1(FERRO_KNIFE_DMG)} degats · 380 px/s`], ['Recharge', `${r1(FERRO_ATTACK_CD)} s`], ['Rebonds', 'illimites (murs, obstacles) · +50% degats par rebond (plafonne)'],
      ['Portee', `${r1(FERRO_KNIFE_LIFE)} s de vol`], ['C1 Poussee', 'rayon 220 · recul 60 · 10,5 degats · 12,6 s'], ['C2 Mur', '150x40 en travers de la visee · 10 s · 14 s'], ['C3 Rebonds prolonges', '+0,3 s par rebond · 11,2 s']],
    6: [['Meteorite', `recharge ${CENDRE_ATTACK_CD} s · charge jusqu'a 3 s · jusqu'a ${r1(METEOR_MAX_DMG)} degats · rayon 60 · chute 1 s`], ['Pendant la charge', 'immobile'], ['Sol en feu', `a chaque impact · rayon ${Math.round(60 * CENDRE_FIRE_RADIUS)} · ${CENDRE_FIRE_TIME} s · ${CENDRE_FIRE_DMG} degats / 0,5 s · brule aussi Cendre`],
      ['C1 Quatre meteorites', `${r1(METEOR_MAX_DMG * 0.6)} degats chacune · 9 s`], ['C2 Invisible + invincible', `${CENDRE_INVISIBLE_TIME} s (les ennemis visent ou il a disparu) · 6 s`], ['C3 Zone de charge', `${r1(3 * 0.65)} degats / 0,2 s au curseur · 10 s`]],
    7: [['Frappe retardee', 'position d\'il y a 3 s · rayon 90 · 30 degats · 0,5 s'], ['C1 Frappe lointaine', 'position d\'il y a 10 s · rayon 110 · 45 degats · 7 s'],
      ['C2 Acceleration', 'maintenir : jusqu\'a +50% de vitesse du temps'], ['C3 Marque', 'tuer la cible cree un soin de 15% · 12 s']],
    8: [['Attraction', `rayon 260 · degats = distance tiree x0,08 (${r1(1 * VEX_DMG)} a ${r1(18 * VEX_DMG)}) / 0,4 s`], ['C1 Mine', `${r1(10 * VEX_DMG * 2.5)} degats · declenchement 34 · 7 s`],
      ['C2 Repulsion', `rayon 140 · recul 70 · ${r1(35 * VEX_DMG)} degats contre un mur · 8 s`], ['C3 Pulsation', `toutes les 15 s (competence 3 seulement) · rayon 150 · ${r1(40 * VEX_DMG)} degats · te ramene au centre`]],
    9: [['Lasers de feu', `4 lasers toutes les ${CROC_LASER_INTERVAL} s · longueur ${CROC_LASER_LEN} · jusqu'a ${CROC_LASER_DMG} degats (plus l'ennemi est proche, plus ca fait mal)`], ['Attaque', 'bascule croix (+) / diagonales (x)'], ['C1 Bouclier', 'invincible 2 s · 8 s'], ['C2 Dash', '120 px · 2,5 s'], ['C3 Arret global', 'fige tous les ennemis 1 s · 25 s']],
    10: [['Deux orbes', 'parcours carre de rayon 100 · frappe rayon 48 · 20 degats'], ['Charges', 'se rechargent en 1,5 s'], ['C1 Orbes projetees', '2 x 25 degats au curseur (rayon 60) · recharge les orbes · 6 s'],
      ['C2 Grande 3e orbe', `taille ${GEMINI_THIRD_ORB_SIZE} · orbite ${GEMINI_THIRD_ORB_RADIUS} · ${GEMINI_THIRD_ORB_TIME} s · detruit les tirs qu'elle touche · 12 s`], ['C3 Gel', 'fige les 2 ennemis les plus proches jusqu\'au contact · 16 s']],
    11: [['Bloc de vent chaud', '140x140 · pousse les ennemis · 8 s · 3 max · 0,4 s'], ['C1 Vent vertical', 'bloque les projectiles · 10 s'], ['C2 Vent puissant', '3x plus fort, projette contre les murs · 11 s'], ['C3 Inversion', 'retourne tes vents + puissants 4 s · 6 s']],
  };
  return base.concat(T[id] || []);
}

const CODEX_TURRET_STATS = {
  T1: [['Tir', `1 balle vers toi toutes les ${T1_INTERVAL} s · 150 px/s`], ['Deplacement', 'fixe']],
  T2: [['Tir', `rafale de 4 balles toutes les ${T2_INTERVAL} s · 230 px/s`], ['Deplacement', 'detale entre deux rafales']],
  T3: [['Tir', 'charge puis rayon laser continu qui balaye'], ['Deplacement', 'fixe']],
  T4: [['Tir', 'flux continu (1 balle / 0,42 s) en tournant · 220 px/s'], ['Deplacement', 'derive lentement']],
  T5: [['Tir', `salve circulaire de 8 balles toutes les ${T5_INTERVAL} s · 180 px/s`], ['Deplacement', 'se deplace entre les salves']],
  T6: [['Tir', `1 balle toutes les ${T6_INTERVAL} s · 210 px/s`], ['Deplacement', 'patrouille sur un rail']],
  T7: [['Mines', `pose une mine toutes les ${T7_INTERVAL} s`], ['Deplacement', 'se promene']],
  T8: [['Tir', `rafale dense de 3 canons toutes les ${T8_INTERVAL} s · 260 px/s`], ['Deplacement', 'fixe']],
  T9: [['Tir', `projectile qui ricoche toutes les ${T9_INTERVAL} s`], ['Deplacement', 'bondit']],
  T10: [['Tir', `4 balles en croix toutes les ${T10_INTERVAL} s · 210 px/s`], ['Deplacement', 'fixe']],
  T11: [['Tir', `projectile lent teleguide toutes les ${T11_INTERVAL} s`], ['Deplacement', 'flotte lentement']],
  T12: [['Tir', `zone d'impact annoncee toutes les ${T12_INTERVAL} s`], ['Deplacement', 'fixe']],
};

// Elements de jeu (zones, pieges, aides) : onglet "Elements" du Codex.
// Elements de jeu (onglet "Elements" du Codex). Textes : cles de traduction (voir elementInfo).
const CODEX_ELEMENTS = [
  { id: 'ice', group: 'zone', color: '#9de8ff', stats: ['effect'] },
  { id: 'mud', group: 'zone', color: '#8a6a45', stats: ['effect'] },
  { id: 'accel', group: 'zone', color: '#5dff9d', stats: ['effect'] },
  { id: 'slow', group: 'zone', color: '#b47cff', stats: ['effect'] },
  { id: 'damage', group: 'zone', color: '#ff7a3d', stats: ['effect'] },
  { id: 'wind', group: 'zone', color: '#bfe8ff', stats: ['effect'] },
  { id: 'teleporter', group: 'help', color: '#7fd8ff', stats: ['effect', 'where'] },
  { id: 'trampoline', group: 'help', color: '#ffd23d', stats: ['effect', 'where'] },
  { id: 'mover', group: 'obstacle', color: '#ffb14d', stats: ['effect', 'paths', 'where'] },
  { id: 'boost', group: 'help', color: '#ffd23d', stats: ['effect', 'where'] },
];
function elementInfo(id) {
  const el = CODEX_ELEMENTS.find((e) => e.id === id);
  return {
    id, color: el.color, name: S(`elem_${id}`), group: S(`grp_${el.group}`),
    stats: el.stats.map((k) => [S(`stat_${k}`), S(`elem_${id}_${k}`)]),
  };
}

// Regles (onglet "Regles" du Codex) : titre + lignes separees par "|".
const CODEX_RULES = ['principle', 'run', 'regen', 'money', 'base', 'daily', 'controls'];
function ruleInfo(k) { return { title: S(`rule_${k}_title`), lines: S(`rule_${k}`).split('|') }; }

