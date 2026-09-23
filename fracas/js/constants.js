// Constantes globales de Fracas

// Resolution du canvas : remplie au demarrage (main.js) avec la taille reelle de la fenetre,
// et tenue a jour a chaque redimensionnement (jeu plein ecran).
let CANVAS_W = 1280;
let CANVAS_H = 720;

const BASE_SPEED = 230; // px/s a 100% de vitesse
const PLAYER_RADIUS = 16;
const GLOBAL_SPEED_MULT = 1.0; // vitesse de reference "100%" = -20% par rapport a l'ancienne vitesse par defaut (1.25)
const ENEMY_HP_MULT = 0.7; // tous les ennemis ont -30% de PV
const ENEMY_FIRE_RATE_MULT = 0.75; // les ennemis attaquent 25% moins vite (cadence de tir/tourelles/boss)
const ENEMY_PROJECTILE_SPEED_MULT = 0.75; // les projectiles ennemis vont 25% moins vite

const DMG_MIN = 0.05;
const DMG_MAX = 1.00;

// Monnaie (€) gagnee en expedition/defi, depensee dans le marche du hub
const BOSS_REWARD_BY_PART = { 1: 2, 2: 3, 3: 4 };
const CHALLENGE_REWARD = 0.05;
const HUB_EXPAND_COST = 40;
const HUB_MOVE_COST = 7;
const HUB_DECOR_COST = 15;

const DEFAULT_KEYS = {
  up: 'KeyW',
  down: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  ability1: 'ShiftLeft',
  ability1b: 'ShiftRight',
  ability2: 'Space',
  ability3: 'KeyE',
  ability: 'KeyF', // touche unique qui active la competence disponible pendant une expedition (partie 1/2/3)
  attack: 'Mouse0', // rebindable : peut aussi etre un bouton de souris (Mouse0/1/2)
  restart: 'KeyR',
  pause: 'Escape',
};

// Liaisons actives (rebindables). Remplacees au chargement par Save.data.keybinds si present.
let Keybinds = Object.assign({}, DEFAULT_KEYS);

// Actions exposees dans l'ecran de configuration des raccourcis (ability1b = alias fixe, non rebindable)
const REBINDABLE_ACTIONS = ['up', 'down', 'left', 'right', 'attack', 'ability1', 'ability2', 'ability3', 'ability', 'restart', 'pause'];

// Multiplicateur global de vitesse de simulation choisi par le joueur avant une partie (50%-200%).
const SPEED_MULT_MIN = 50, SPEED_MULT_MAX = 200, SPEED_MULT_DEFAULT = 100;

function keyLabel(code) {
  if (!code) return '—';
  const en = typeof lang === 'function' && lang() === 'en';
  if (code.startsWith('Mouse')) {
    const idx = Number(code.slice(5));
    const mouseMap = en ? ['LEFT CLICK', 'MIDDLE CLICK', 'RIGHT CLICK'] : ['CLIC GAUCHE', 'CLIC MOLETTE', 'CLIC DROIT'];
    return mouseMap[idx] || `MOUSE ${idx}`;
  }
  const map = en ? {
    KeyW: 'Z / W', KeyA: 'Q / A', KeyS: 'S', KeyD: 'D',
    ShiftLeft: 'SHIFT (L)', ShiftRight: 'SHIFT (R)', Space: 'SPACE', Escape: 'ESC',
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
    ControlLeft: 'CTRL (L)', ControlRight: 'CTRL (R)', AltLeft: 'ALT (L)', AltRight: 'ALT (R)',
  } : {
    KeyW: 'Z / W', KeyA: 'Q / A', KeyS: 'S', KeyD: 'D',
    ShiftLeft: 'MAJ (G)', ShiftRight: 'MAJ (D)', Space: 'ESPACE', Escape: 'ECHAP',
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
    ControlLeft: 'CTRL (G)', ControlRight: 'CTRL (D)', AltLeft: 'ALT (G)', AltRight: 'ALT (D)',
  };
  if (map[code]) return map[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code;
}

const STATE = {
  MENU: 'MENU',
  MARKET: 'MARKET',
  CHAR_SELECT: 'CHAR_SELECT',
  CHALLENGE_SELECT: 'CHALLENGE_SELECT',
  CHALLENGE_EDITOR: 'CHALLENGE_EDITOR',
  SETTINGS: 'SETTINGS',
  BESTIARY: 'BESTIARY',
  TEST_ROOM: 'TEST_ROOM',
  EXPEDITION: 'EXPEDITION',
  CHALLENGE: 'CHALLENGE',
  ROUND_END: 'ROUND_END',
};

const TEAM = {
  PLAYER: 'PLAYER',
  ENEMY: 'ENEMY',
};

const COLORS = {
  player: '#7fd8ff',
  playerOutline: '#e8fbff',
  enemy: '#ff5d5d',
  enemyOutline: '#ffd0d0',
  projPlayer: '#7fd8ff',
  projEnemy: '#ff3d5a',
  danger: 'rgba(255, 61, 90, 0.35)',
  dangerEdge: '#ff3d5a',
  interactive: '#ffd23d',
  ice: '#9de8ff',
  mud: '#8a6a45',
  accel: '#5dff9d',
  slow: '#b47cff',
  dmgZone: '#ff7a3d',
  invertH: '#ff7ad1',
  invertV: '#c77aff',
  wind: '#bfe8ff',
};

const PARTS = [1, 2, 3];
const ROOMS_PER_PART = 10;

const TERRAIN_TYPES = [
  'ice', 'mud', 'accel', 'slow', 'damage', 'invertH', 'invertV', 'wind',
];
