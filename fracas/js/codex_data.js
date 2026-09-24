// Donnees detaillees du Codex : statistiques chiffrees de chaque personnage, ennemi, boss et
// element de jeu, + les regles. Les valeurs reprennent les constantes du jeu quand elles existent
// (elles restent donc justes si l'equilibrage change).

const r1 = (v) => Math.round(v * 10) / 10;

// [libelle, valeur] par personnage ; affiche dans la fiche du Codex sous "Statistiques".
function codexCharStats(id) {
  const c = getCharacter(id);
  const base = [['Vitesse', `${c.speedPercent}% (${Math.round(BASE_SPEED * c.speedPercent / 100)} px/s)`]];
  const T = {
    1: [['Pistolet (orbite)', 'rayon 95, 1,6 tour/s'], ['Tir auto', `toutes les ${COLT_FIRE_INTERVAL}s · ${r1(20 * 1.33)} degats · 360 px/s`],
      ['Echange (attaque)', 'recharge 0,2 s'], ['Concentration', `tir vise toutes les ${COLT_FOCUS_INTERVAL}s · ${r1(36 * 1.33)} degats`],
      ['C1 Chaos mobile', 'teleporte toutes les tourelles · 14 s'], ['C2 Salve', `rayon 110 · ${r1(30 * 1.33)} degats · 6 s`]],
    2: [['Trampoline', `pose a ${NYX_TRAMP_RANGE} px max · fait sauter de ${NYX_JUMP_DIST} px dans le sens de la pose · ${NYX_TRAMP_MAX} max (le 4e en remplace un au hasard) · ${NYX_ATTACK_CD} s`],
      ['Atterrissage (tout trampoline)', `4 projectiles (haut, bas, gauche, droite) · ${NYX_SHOT_DMG} degats chacun`], ['C1 Echange', `avec la tourelle la plus proche · ${r1(30 * NYX_DMG)} degats · 8 s`],
      ['C2 Trainee de feu', `dash 1,4 s · zones ${r1(3 * NYX_DMG)} degats/0,4 s pendant 3 s · 10 s`], ['C3 Retour', 'position d\'il y a 1 s · 7 s']],
    3: [['Boomerang', `${Math.round(KIP_BOOM_SPEED)} px/s · 25 degats aller ET retour · portee 620`], ['Recharge', `${KIP_CATCH_CD} s apres l'avoir rattrape`],
      ['C1 Surcharge', '+20% degats / -10% vitesse (cumulable) · 3 s'], ['C2 Boomerang curseur', 'suit le curseur (bascule)'], ['C3 Glace x5', 'zones qui accelerent le boomerang de 30% · 12 s']],
    4: [['Orbes de feu', `4 orbes · ${BRAISE_ORB_DMG} degats toutes les 0,35 s au contact`], ['Orbite', 'rayon 84 (216 ecartees) · melange toutes les 20 s'],
      ['C1 Bouclier', 'aleatoire, rayon 46, 6 s · 14 s'], ['C2 Ecartement', 'maintenir'], ['C3 Arene reduite', '-15% de salle · 80 degats hors zone · 16 s']],
    5: [['Couteaux', `2 par tir · ${r1(FERRO_KNIFE_DMG)} degats · 380 px/s`], ['Recharge', `${r1(FERRO_ATTACK_CD)} s`], ['Rebonds', 'illimites (murs, obstacles) · +50% degats par rebond (plafonne)'],
      ['Portee', `${r1(FERRO_KNIFE_LIFE)} s de vol`], ['C1 Poussee', 'rayon 220 · recul 60 · 10,5 degats · 12,6 s'], ['C2 Mur', '48x48 pendant 8 s · 14 s'], ['C3 Rebonds prolonges', '+0,3 s par rebond · 11,2 s']],
    6: [['Meteorite', `charge jusqu'a 3 s · jusqu'a ${r1(METEOR_MAX_DMG)} degats · rayon 60 · chute 1 s`], ['Pendant la charge', 'immobile'],
      ['C1 Quatre meteorites', `${r1(METEOR_MAX_DMG * 0.6)} degats chacune · 9 s`], ['C2 Invincibilite', '0,5 s · 6 s'], ['C3 Zone de charge', `${r1(3 * 0.65)} degats / 0,2 s au curseur · 10 s`]],
    7: [['Frappe retardee', 'position d\'il y a 3 s · rayon 90 · 30 degats · 0,5 s'], ['C1 Frappe lointaine', 'position d\'il y a 10 s · rayon 110 · 45 degats · 7 s'],
      ['C2 Acceleration', 'maintenir : jusqu\'a +50% de vitesse du temps'], ['C3 Marque', 'tuer la cible cree un soin de 15% · 12 s']],
    8: [['Attraction', `rayon 260 · degats = distance tiree x0,08 (${r1(1 * VEX_DMG)} a ${r1(18 * VEX_DMG)}) / 0,4 s`], ['C1 Mine', `${r1(10 * VEX_DMG)}% · 7 s`],
      ['C2 Repulsion', `rayon 140 · recul 70 · ${r1(35 * VEX_DMG)} degats contre un mur · 8 s`], ['C3 Pulsation', `toutes les 15 s (competence 3 seulement) · rayon 150 · ${r1(40 * VEX_DMG)} degats · te ramene au centre`]],
    9: [['Aura', 'rayon 250 · vague toutes les 1,2 s · jusqu\'a 30 degats (selon proximite)'], ['C1 Bouclier', 'invincible 1 s · 8 s'], ['C2 Dash', '120 px · 2,5 s'], ['C3 Arret global', 'fige tous les ennemis 1 s · 25 s']],
    10: [['Deux orbes', 'parcours carre de rayon 100 · frappe rayon 48 · 20 degats'], ['Charges', 'se rechargent en 1,5 s'], ['C1 Melange', 'repositionne les orbes · 5 s'],
      ['C2 Troisieme orbe', `bouclier rayon ${GEMINI_THIRD_ORB_RADIUS} · 6 s · bloque tout · 12 s`], ['C3 Gel', 'fige les 2 ennemis les plus proches jusqu\'au contact · 16 s']],
    11: [['Bloc de vent chaud', '140x140 · pousse les ennemis · 8 s · 3 max · 0,4 s'], ['C1 Vent vertical', 'bloque les projectiles · 10 s'], ['C2 Vent puissant', '3x plus fort, projette contre les murs · 11 s'], ['C3 Inversion', 'retourne tes vents · 6 s']],
    12: [['Orbes', `rayon ${ORBIS_RADIUS} · tournent en permanence`], ['Teleportation', `incantation ${ORBIS_CAST} s immobile · recharge ${ORBIS_CD} s (chaque orbe)`]],
    13: [['Dash charge', `charge max ${TRAIT_MAX_CHARGE} s (immobile) · vers le curseur`], ['Portee', `${Math.round(traitDash(0).speed * traitDash(0).dur)} a ${Math.round(traitDash(1).speed * traitDash(1).dur)} px`],
      ['Pendant le dash', 'invulnerable aux pieges'], ['Recharge', `${TRAIT_CD} s`], ['Invincibilite', `0,5 s · ${TRAIT_INV_CD} s`]],
    14: [['Teleporteurs', `paire ici + curseur (${JANUS_PORTAL_RANGE} max) · durent ${JANUS_PORTAL_LIFE} s · ${JANUS_PORTAL_CD} s`], ['Bloc de vent', `ne pousse que lui · force ${JANUS_WIND_FORCE} · ${JANUS_WIND_LIFE} s · 1 max · ${JANUS_WIND_CD} s`]],
    15: [['Bond vers le haut', `${ELAN_MIN_DIST} a ${ELAN_MAX_DIST} px selon le maintien (${ELAN_MAX_HOLD} s max) · ${ELAN_CD} s`], ['Sol glissant', `+${Math.round((PARKOUR_SLIDE_SPEED - 1) * 100)}% de vitesse, forte inertie · ${ELAN_SLIDE_MAX} s max · ${ELAN_SLIDE_CD} s`]],
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
const CODEX_ELEMENTS = [
  { id: 'ice', group: 'Zone', name: 'Glace', color: '#9de8ff', stats: [['Effet', '+30% de vitesse mais forte inertie (tu glisses)']] },
  { id: 'mud', group: 'Zone', name: 'Boue', color: '#8a6a45', stats: [['Effet', '-60% de vitesse']] },
  { id: 'accel', group: 'Zone', name: 'Accelerateur', color: '#5dff9d', stats: [['Effet', '+65% de vitesse']] },
  { id: 'slow', group: 'Zone', name: 'Ralentisseur', color: '#b47cff', stats: [['Effet', '-30% de vitesse, recharges 2,5x plus lentes']] },
  { id: 'damage', group: 'Zone', name: 'Zone de degats', color: '#ff7a3d', stats: [['Effet', '~ -7% de multiplicateur par seconde (en parcours : de vitesse)']] },
  { id: 'wind', group: 'Zone', name: 'Vent', color: '#bfe8ff', stats: [['Effet', 'te pousse dans la direction des fleches (150 px/s, -35% en parcours)']] },
  { id: 'spike', group: 'Piege', name: 'Piques', color: '#ff6a6a', stats: [['Effet', 'sortent en rythme (clignotent avant) · -8,4% de vitesse'], ['Ou', 'parcours']] },
  { id: 'laser', group: 'Piege', name: 'Laser', color: '#ff3d5a', stats: [['Effet', 's\'allume a intervalles (pointille avant) · -10,8% de vitesse'], ['Ou', 'parcours']] },
  { id: 'shooter', group: 'Piege', name: 'Tourelle-piege', color: '#ff9d3d', stats: [['Effet', 'rafales de 1 a 3 tirs en travers · -7,2% de vitesse · arretes par les murs'], ['Ou', 'parcours']] },
  { id: 'teleporter', group: 'Aide', name: 'Teleporteur', color: '#7fd8ff', stats: [['Effet', 'entree bleue -> sortie violette, sens unique'], ['Ou', 'parcours et salles du Monde']] },
  { id: 'trampoline', group: 'Aide', name: 'Trampoline', color: '#ffd23d', stats: [['Effet', 'saut de 0,6 s par-dessus murs, pieges et tirs'], ['Ou', 'parcours et salles du Monde']] },
  { id: 'boost', group: 'Aide', name: 'Boost de vitesse', color: '#ffd23d', stats: [['Effet', '+60% de vitesse pendant 3 s'], ['Ou', 'parcours']] },
];

const CODEX_RULES = [
  { title: 'Principe', lines: ['Pas de points de vie : chaque coup recu baisse ton multiplicateur de degats (jamais sous 5%).',
    'Plus tu es touche, moins tu fais mal : il faut esquiver pour garder ta puissance.'] },
  { title: 'Monde (expedition)', lines: ['3 parties de 10 salles ; la 10e salle de chaque partie est un boss.',
    'Chaque partie debloque UNE competence (partie 1 = C1, partie 2 = C2, partie 3 = C3) sur la touche unique.',
    'Vider une salle soigne un peu ; teleporteurs et trampolines aident a se deplacer.'] },
  { title: 'Defis', lines: ['11 defis en 3 salles : une competence differente autorisee dans chaque salle (boss eventuel dans la 3e).', 'Chaque defi reussi rapporte 0,05 EUR ; record de temps enregistre.',
    'Tes propres defis se creent dans la carte (editeur) : records oui, argent non.'] },
  { title: 'Parcours', lines: ['Atteins l\'arrivee a droite le plus vite possible, jeu accelere.', 'Pas d\'ennemis : piques, lasers, tourelles-pieges. Chaque coup baisse ta VITESSE (+25% rendus a mi-parcours).',
    '4 personnages dedies : attaque = competence 1, touche de competence unique = competence 2.'] },
  { title: 'Argent et base', lines: ['L\'argent (boss, defis) se depense au Marche (menu Fonctionnalites) :', 'agrandir la base, deplacer les portes, ajouter teleporteurs, murs colores et vents.'] },
  { title: 'Commandes', lines: ['ZQSD / WASD : se deplacer · souris : viser · clic : attaque.', 'Maj / Espace / E : competences (touche unique en expedition) · R : recommencer · Echap : menu.'] },
];
