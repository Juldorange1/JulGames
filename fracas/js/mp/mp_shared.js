// Multijoueur en ligne : constantes, reglages et format des messages, partages par le client
// (navigateur) et le serveur (charge dans la VM de chaque partie). Aucune dependance au DOM.

const NET_PROTOCOL_VERSION = 1;

// ---------------- Modes ----------------
// kind : famille de regles (voir js/mp/mp_modes.js). players : nombre EXACT de joueurs requis.
const MP_MODES = {
  versus1: { id: 'versus1', kind: 'versus', players: 2, teams: ['A', 'B'], teamSize: 1 },
  versus2: { id: 'versus2', kind: 'versus', players: 4, teams: ['A', 'B'], teamSize: 2 },
  foot: { id: 'foot', kind: 'foot', players: 4, teams: ['A', 'B'], teamSize: 2 },
  survivor: { id: 'survivor', kind: 'survivor', players: 4, teams: null, teamSize: 1 },
};
const MP_MODE_ORDER = ['versus1', 'versus2', 'foot', 'survivor'];

// Couleurs d'equipe (Survivant : une couleur par joueur).
const MP_TEAM_COLORS = { A: '#4fb3ff', B: '#ff5d6c', S1: '#ffd23d', S2: '#5dff9d', S3: '#c77aff', S4: '#ff9d3d' };

// ---------------- Reglages ----------------
const MP = {
  TICK_RATE: 60,            // pas de simulation serveur par seconde
  SNAPSHOT_EVERY: 2,        // un snapshot tous les 2 pas => 30 par seconde
  INTERP_DELAY_MS: 100,     // retard d'affichage des autres entites (interpolation)
  LAG_COMP_MAX_MS: 200,     // compensation de latence maximale ("en faveur du tireur")
  RECONNECT_GRACE_MS: 20000, // un joueur deconnecte garde sa place 20 s

  // JcJ : conversion des degats d'attaque (echelle ennemis) en % perdus par la cible.
  PVP_DAMAGE_TO_PERCENT: 0.12,
  DEATH_AT: 0.05,           // mort a 5% (Versus / Survivant)

  // Versus
  CRYSTAL_START: 2.0,       // cristal a 200%
  CRYSTAL_RADIUS: 30,
  VERSUS_ROUNDS: 2,
  ROUND_TIME: 180,          // au-dela : l'equipe avec le plus de % restants gagne le round
  COUNTDOWN: 3,
  ROUND_END_PAUSE: 4,
  VERSUS_DMG_MAX: 1.5,      // les zones de boost peuvent monter jusqu'a 150%

  // Foot
  FOOT_DEATH_SPEED: 0.4,    // mort a 40% de vitesse
  FOOT_RESPAWN_DELAY: 2,
  FOOT_GOALS_TO_WIN: 5,
  FOOT_TIME: 240,           // puis but en or
  FOOT_BALLS: 2,
  FOOT_THROW_SPEED: 640,
  FOOT_BALL_FRICTION: 0.55, // part de vitesse conservee par seconde
  FOOT_SPEED_MAX: 1.3,
  MOVING_WALL_CHANCE: 0.5,  // arenes Versus / Survivant
  FOOT_MOVING_WALL_CHANCE: 1.0, // Foot : 2x plus de chances

  // Zones (se deplacent lentement) : rester 3 s dedans = +15%.
  CAPZONE_TIME: 3,
  CAPZONE_GAIN: 0.15,
  CAPZONE_RADIUS: 58,
  CAPZONE_RESPAWN: 6,
  SURVIVOR_DMG_MAX: 2.5,    // Survivant : jusqu'a 250%
  SUDDEN_DEATH_AT: 240,     // Survivant : au-dela de 4 min, tout le monde perd 1%/s

  // Coop
};

// Entrees compactes envoyees par le client : [seq, mx, my, ax, ay, bits]
const IN_BITS = {
  attack: 1, attackReleased: 2, a1p: 4, a1d: 8, a2p: 16, a2d: 32, a3p: 64, a3d: 128, abp: 256, abd: 512,
};
const IN_EDGE_MASK = IN_BITS.attackReleased | IN_BITS.a1p | IN_BITS.a2p | IN_BITS.a3p | IN_BITS.abp;

function packInputBits(inp) {
  let b = 0;
  for (const k in IN_BITS) if (inp[k]) b |= IN_BITS[k];
  return b;
}
function unpackInput(mx, my, ax, ay, bits) {
  const o = { mx, my, ax, ay, hasAim: true };
  for (const k in IN_BITS) o[k] = !!(bits & IN_BITS[k]);
  return o;
}

// Categories d'entites synchronisees : cle courte -> champ du monde.
const SNAP_CATS = {
  P: 'players', E: 'enemies', R: 'projectiles', Z: 'zones', W: 'walls', S: 'shields', M: 'mines',
  N: 'winds', T: 'meteors', H: 'hazards', O: 'obstacles', Y: 'terrainZones', B: 'balls', C: 'capzones',
};

function mpTeamColor(team) { return MP_TEAM_COLORS[team] || '#ffffff'; }
