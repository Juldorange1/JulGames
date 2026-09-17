// 10 niveaux de rareté. La rareté ne change JAMAIS l'effet fondamental d'un élément,
// seulement sa puissance via `mult`.
const RARITIES = [
  { id: 0, name: 'Commun',       mult: 1.0,  color: '#9ca3af' },
  { id: 1, name: 'Peu commun',   mult: 1.4,  color: '#4ade80' },
  { id: 2, name: 'Rare',         mult: 2.0,  color: '#38bdf8' },
  { id: 3, name: 'Épique',       mult: 3.0,  color: '#a78bfa' },
  { id: 4, name: 'Élite',        mult: 3.5,  color: '#f472b6' },
  { id: 5, name: 'Légendaire',   mult: 4.5,  color: '#fb923c' },
  { id: 6, name: 'Mythique',     mult: 5.5,  color: '#f87171' },
  { id: 7, name: 'Antique',      mult: 6.5,  color: '#fbbf24' },
  { id: 8, name: 'Transcendant', mult: 8.0,  color: '#22d3ee' },
  { id: 9, name: 'Divin',        mult: 10.0, color: '#ffffff' },
];

// Coût en points de chance pour gagner +1 point de pourcentage sur cette rareté.
const RARITY_UPGRADE_COST = [0, 1, 2, 3, 4, 5, 7, 9, 12, 16];

function rarityScale(base, rarityId) {
  return base * RARITIES[rarityId].mult;
}

// Tire une rareté aléatoire selon une distribution de probabilités (tableau de 10 % qui totalise 100).
function rollRarity(probs) {
  let roll = Math.random() * 100;
  for (let i = 0; i < probs.length; i++) {
    if (roll < probs[i]) return i;
    roll -= probs[i];
  }
  return 0;
}
