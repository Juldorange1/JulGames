// Constantes globales du monde / de la simulation.
const ROWS = 10;                    // hauteur du couloir de jeu, en "rangées"
const ROW_UNIT = 48;                 // unités-monde par rangée
const FIELD_HEIGHT = ROWS * ROW_UNIT; // hauteur totale du champ de jeu, en unités-monde
const COL_WIDTH = ROW_UNIT;          // largeur d'une colonne = 1 rangée -> pente max du Wave (45°) toujours franchissable

const PLAYER_DIAMETER_ROWS = 0.36;
const PLAYER_RADIUS = (PLAYER_DIAMETER_ROWS * ROW_UNIT) / 2;

// Vitesse de déplacement fixe : le Wave avance toujours à la même vitesse, quelle que soit la
// difficulté choisie. Ce qui change avec la difficulté, c'est le niveau réel des patterns et les
// gains d'or — jamais la vitesse.
const BASE_SPEED_UNITS_S = 204; // unités-monde/seconde (~4.25 colonnes/s)

// Paliers de multiplicateur de difficulté débloquables. Plus le multiplicateur est élevé, plus les
// patterns générés sont difficiles, et plus l'or gagné est important. Plafond fixe : 15×.
const DIFFICULTY_TIERS = [1, 1.3, 1.7, 2.2, 3, 4, 5.3, 7, 9.5, 12, 15];
const MAX_DIFFICULTY_MULT = 15;

const MIN_GAP_ROWS_FLOOR = 2.0; // garde-fou absolu : jamais un couloir plus étroit que ça
const GAP_EASE = 1.28; // multiplicateur global d'aisance appliqué à tous les couloirs générés

// Aucun pattern ne demande jamais le décalage maximum théorique (1 rangée/colonne) : tout mouvement
// est réduit à 60 % de ce maximum. Combiné au plancher de largeur ci-dessus, ça garantit une marge
// RÉELLE (pas juste théorique) entre deux colonnes consécutives, même en visant simplement le
// centre du couloir suivant sans calcul optimal — jamais un passage "tout juste" franchissable.
const MOVEMENT_SLACK = 0.6;

const COLLISION_MARGIN = 3; // unités-monde de tolérance visuelle sur les bords

const SAVE_KEY = 'julgame-wave-idle-save-v1';
const AUTOSAVE_INTERVAL_MS = 8000;
const MAX_OFFLINE_MS = 12 * 60 * 60 * 1000; // plafond de production hors-ligne : 12h

const ASCENSION_THEME_UNLOCK = 25;
const ASCENSION_REFLEX_UNLOCK = 10;

// Difficulté des patterns générés : constante du début à la fin d'une partie. Le seul levier qui la
// fait varier est le multiplicateur de difficulté choisi avant de jouer (jamais la distance parcourue).
const MAX_DIFFICULTY_SCORE = 7.4;

// Fréquence des pics décoratifs sur les colonnes qu'un pattern n'a pas explicitement décorées
// (couloirs larges, tampons de respiration...) : probabilité qu'un pic apparaisse d'un côté ou
// l'autre. Un pic ne rétrécit jamais le passage réel (collision basée sur top/bottom uniquement) —
// c'est un élément de décor/menace visuelle, jamais un piège caché.
const AMBIENT_SPIKE_CHANCE = 0.6;

// Début de partie garanti sans obstacle (quelle que soit la difficulté choisie) : large couloir
// plat, aucun pic, le temps de s'orienter avant que la difficulté choisie ne s'applique pleinement.
const INTRO_SAFE_SECONDS = 3;
const INTRO_SAFE_UNITS = BASE_SPEED_UNITS_S * INTRO_SAFE_SECONDS;

// --- Portails de mode (façon Geometry Dash) ---
// Le Wave reste le mode par défaut, mais des portails apparaissent aléatoirement en cours de
// partie et font basculer temporairement vers l'OVNI ou le vaisseau, avec leur propre physique,
// avant de repasser en Wave.
const MODE_WAVE = 'wave';
const MODE_UFO = 'ufo';
const MODE_SHIP = 'ship';
const MODE_BALL = 'ball';
const MODE_CUBE = 'cube';
const MODE_ROBOT = 'robot';
const MODE_SPIDER = 'spider';
// Tous les modes qu'un portail peut ouvrir (jamais Wave lui-même : Wave est le retour par défaut).
const ALL_PORTAL_MODES = [MODE_UFO, MODE_SHIP, MODE_BALL, MODE_CUBE, MODE_ROBOT, MODE_SPIDER];
// Tous les modes jouables, y compris Wave — utilisé pour tirer le mode de départ au hasard.
const ALL_PLAYABLE_MODES = [MODE_WAVE, MODE_UFO, MODE_SHIP, MODE_BALL, MODE_CUBE, MODE_ROBOT, MODE_SPIDER];

// OVNI : chaque appui (front montant) donne un bond vertical fixe, la gravité fait le reste.
// La hauteur d'un bond est volontairement bien plus petite que la moitié du couloir généré (voir
// pushPortalSegment), pour qu'un bond déclenché n'importe quand ne puisse jamais taper un bord.
const UFO_GRAVITY = 1050;   // unités/s² vers le bas, toujours actif
const UFO_HOP_VY = 340;     // vitesse verticale (vers le haut) donnée par un appui
const UFO_MAX_FALL_VY = 520; // vitesse de chute max (vitesse terminale)

// Vaisseau : maintenir = poussée vers le haut, relâcher = la gravité reprend le dessus. Physique
// lisse à accélération (courbes), contrairement aux lignes droites à 45° du Wave. La vitesse max
// est plafonnée bas exprès : à pleine vitesse, inverser la direction prend un peu de temps (inertie)
// — le plafond garantit que ce délai de retournement reste toujours bien inférieur à la largeur
// du couloir généré, même dans le pire des cas.
const SHIP_GRAVITY = 620;   // unités/s² vers le bas, toujours actif
const SHIP_THRUST = 1300;   // unités/s² vers le haut quand on maintient
const SHIP_MAX_VY = 220;    // vitesse verticale max dans les deux sens

// Balle : chaque appui (front montant) inverse le sens de la gravité — elle roule en arcs entre le
// sol et le plafond du couloir plutôt que de suivre une trajectoire rigide. Vole dans un couloir
// (comme OVNI/vaisseau), pas au sol.
const BALL_GRAVITY = 1000;    // unités/s² dans le sens courant, toujours actif
const BALL_MAX_VY = 460;      // vitesse verticale max, pour ne jamais "rater" un retournement

// Cube : plateforme classique. Un appui = un saut à hauteur fixe, seulement possible au sol.
const CUBE_GRAVITY = 1500;
const CUBE_JUMP_VY = 460;

// Robot : comme le Cube, mais la hauteur du saut est légèrement variable — maintenir un peu plus
// longtemps pendant la montée pousse un peu plus haut (dans une fenêtre courte et plafonnée).
const ROBOT_GRAVITY = 1350;
const ROBOT_JUMP_VY = 400;
const ROBOT_HOLD_BOOST = 1100;      // accélération additionnelle vers le haut pendant le maintien
const ROBOT_HOLD_BOOST_MAX_S = 0.14; // durée max de cette poussée additionnelle

// Araignée : bascule INSTANTANÉE entre le sol et le plafond à chaque appui — pas de chute, pas
// d'arc, juste un changement de surface immédiat (comme dans Geometry Dash). Le lissage visuel est
// purement cosmétique, la logique de jeu bascule d'un coup.
const SPIDER_VISUAL_FLIP_S = 0.08;

// --- Modes au sol (Cube, Robot, Araignée) : un nouveau type de colonne où "bottom" représente une
// surface SOLIDE (sol ou plateforme) sur laquelle on peut se tenir sans mourir, plutôt qu'un mur à
// éviter. Une colonne au sol garde le même champ "bottom", mais y atterrir dessus est sûr sauf si
// elle est marquée "groundHazard" (pic au sol — il faut alors sauter par-dessus).
const GROUND_BASELINE_ROW = 7.3;       // hauteur du sol "normal", en rangées depuis le haut
const GROUND_CEILING_ROW = 0.6;        // plafond par défaut, très haut au-dessus (rarement gênant)
const GROUND_SPIKE_HEIGHT_ROWS = 0.9;  // hauteur d'un pic au sol (réduit "bottom" d'autant)
const GROUND_MIN_SAFETY_MARGIN = 6;    // unités-monde de marge de sécurité pure en plus (voir usage)
// Portée de saut réelle (Cube) : apogée ≈1,47 rangée, temps de vol total ≈0,61s ⇒ ≈2,6 colonnes
// parcourues. On reste très en dessous de ce maximum pour que même un timing imparfait passe.
const GROUND_MAX_PIT_COLUMNS = 2;   // largeur max d'un trou à sauter
const GROUND_MAX_STEP_ROWS = 0.85;  // changement de hauteur de sol max entre deux colonnes voisines

// Fréquence et longueur des portails, en nombre de colonnes.
const PORTAL_MIN_GAP_COLUMNS = 16;   // ~3,8s de Wave entre deux portails, au minimum
const PORTAL_MAX_GAP_COLUMNS = 32;   // ~7,5s au maximum
const PORTAL_SEGMENT_MIN_COLUMNS = 20;
const PORTAL_SEGMENT_MAX_COLUMNS = 34;

// Zone calme garantie juste après CHAQUE portail (en entrant en OVNI/vaisseau, et en revenant en
// Wave) : large, plate, sans pic — le temps de s'adapter à la nouvelle physique avant tout obstacle.
const PORTAL_SAFE_BUFFER_COLUMNS = 8;

// Noms affichés sur les colonnes-portails (tous les portails doivent porter leur nom).
const MODE_NAMES = {
  wave: 'WAVE', ufo: 'OVNI', ship: 'VAISSEAU', ball: 'BALLE',
  cube: 'CUBE', robot: 'ROBOT', spider: 'ARAIGNÉE',
};

// --- Portails d'inversion de gravité ---
// N'affectent QUE Wave/OVNI/Vaisseau (jamais Cube/Robot/Araignée/Balle : la Balle a déjà son propre
// mécanisme d'inversion par appui, et une inversion "de zone" au sol ou en Araignée n'aurait pas de
// sens). Purement un changement de SENS des commandes — la géométrie des couloirs générés ne change
// pas d'un pixel, donc la garantie de franchissabilité déjà en place reste valable telle quelle.
const GRAVITY_GATE_MIN_GAP_COLUMNS = 45;
const GRAVITY_GATE_MAX_GAP_COLUMNS = 90;

// --- Portails de vitesse ---
// Modifient la vitesse de déplacement horizontale (jamais la géométrie générée) de -15% à +25%.
// S'appliquent aux modes "couloir" (Wave/OVNI/Vaisseau/Balle) uniquement — jamais Cube/Robot
// (le timing d'un saut dépend du temps réel, pas de la distance : changer la vitesse casserait la
// marge de franchissabilité calculée pour les obstacles au sol) ni Araignée (pas concernée).
const SPEED_GATE_MIN_GAP_COLUMNS = 40;
const SPEED_GATE_MAX_GAP_COLUMNS = 80;
const SPEED_ZONE_LEVELS = [
  { mult: 0.85, label: '-15%' },
  { mult: 1.0, label: 'NORMALE' },
  { mult: 1.15, label: '+15%' },
  { mult: 1.25, label: '+25%' },
];

// --- Sacs d'or ramassables ---
// Apparaissent aléatoirement près d'un mur (haut ou bas) : un petit détour volontaire vers le bord
// du couloir pour un bonus d'or, plutôt qu'un revenu garanti. Purement bonus, jamais nécessaire.
const COIN_CHANCE = 0.05;          // probabilité par colonne éligible
const COIN_MIN_SPACING_COLUMNS = 7; // jamais deux sacs trop rapprochés
const COIN_MIN_GAP_ROWS = 3.0;     // n'apparaît que si le couloir est assez large pour rester sûr
const COIN_WALL_OFFSET_ROWS = 0.72; // distance depuis le mur (vers l'intérieur du couloir)
const COIN_COLLECT_RADIUS = ROW_UNIT * 0.55;
// Un sac équivaut à ~20s de revenu passif à la même difficulté (204 u/s × 0,05 × 20s ≈ 200) — un
// vrai bonus qui vaut le petit détour vers le mur, pas un pourboire.
const COIN_VALUE_BASE = 220; // or de base par sac, avant multiplicateurs de revenus/combo/difficulté

// Texte flottant "+45 €" affiché à l'endroit exact où un gain ponctuel a été obtenu (sac d'or...).
const FLOATING_TEXT_LIFE_S = 1.1;
const FLOATING_TEXT_RISE_UNITS = 70;
