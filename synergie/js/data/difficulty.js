// 20 niveaux de difficulté. Chaque stat suit sa propre courbe (pas un simple ×niveau)
// pour que la difficulté progresse de façon non linéaire, comme demandé.
const DIFFICULTY_POOL_STAGES = [
  { minLevel: 1,  pool: ['brute', 'coureur', 'archer', 'mage', 'tank', 'essaim'] },
  { minLevel: 3,  pool: ['brute', 'coureur', 'archer', 'mage', 'tank', 'essaim', 'protecteur', 'chasseur_e', 'sentinelle', 'suintant'] },
  { minLevel: 5,  pool: ['brute', 'coureur', 'archer', 'mage', 'tank', 'essaim', 'protecteur', 'chasseur_e', 'sentinelle', 'suintant', 'explosif', 'mortier'] },
  { minLevel: 7,  pool: ['brute', 'coureur', 'archer', 'mage', 'tank', 'essaim', 'protecteur', 'chasseur_e', 'sentinelle', 'suintant', 'explosif', 'mortier', 'parasite_e', 'spectre'] },
  { minLevel: 9,  pool: ['brute', 'coureur', 'archer', 'mage', 'tank', 'essaim', 'protecteur', 'chasseur_e', 'sentinelle', 'suintant', 'explosif', 'mortier', 'parasite_e', 'spectre', 'invocateur'] },
  { minLevel: 11, pool: Object.keys(ENEMY_ARCHETYPES) },
];

function poolForLevel(level) {
  let pool = DIFFICULTY_POOL_STAGES[0].pool;
  for (const stage of DIFFICULTY_POOL_STAGES) if (level >= stage.minLevel) pool = stage.pool;
  return pool;
}

const DIFFICULTY_LEVELS = Array.from({ length: 20 }, (_, i) => {
  const level = i + 1;
  const pool = poolForLevel(level);
  return {
    level,
    label: level <= 4 ? 'Facile' : level <= 9 ? 'Modérée' : level <= 14 ? 'Difficile' : level <= 18 ? 'Extrême' : 'Cauchemar',
    // Courbe nettement plus raide : la difficulté 20 doit vraiment mordre par
    // rapport à la 1 (avant : ~5.7x PV / ~3.2x dégâts -> maintenant : ~22x / ~11x).
    hpMult: 1 + Math.pow(level - 1, 1.35) * 0.4,
    dmgMult: 1 + Math.pow(level - 1, 1.2) * 0.28,
    // Le nombre d'ennemis (et leur vitesse, fixée par archétype, jamais multipliée
    // ici) ne dépend PAS de la difficulté — seuls les PV/dégâts montent avec le
    // niveau. -35% par rapport à la moyenne précédente (20-24, ~21.5 -> ~14).
    countBase: 13,
    countVariance: 3,
    typesPerFight: Math.min(pool.length, 3 + Math.floor(level / 5)),
    pool,
    // Gain de points de chance ×2 par rapport à la version précédente (qui l'avait
    // divisé par deux) : ça annule ce ÷2, retour à la formule pleine.
    points: Math.round(6 + level * 2.1 + Math.pow(level, 1.4) * 0.6),
  };
});
