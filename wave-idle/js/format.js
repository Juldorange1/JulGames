// Formatage des nombres (affichage lisible, style FR).
const NUMBER_SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

function formatNumber(n) {
  if (!isFinite(n)) return '∞';
  const sign = n < 0 ? '-' : '';
  n = Math.abs(n);
  if (n < 1000) return sign + (Number.isInteger(n) ? n.toString() : n.toFixed(1));
  let tier = 0;
  while (n >= 1000 && tier < NUMBER_SUFFIXES.length - 1) {
    n /= 1000;
    tier++;
  }
  const digits = n < 10 ? 2 : n < 100 ? 1 : 0;
  return sign + n.toFixed(digits) + NUMBER_SUFFIXES[tier];
}

function formatMoney(n) {
  return formatNumber(n) + ' €';
}

function formatInt(n) {
  n = Math.floor(Math.abs(n)) * Math.sign(n || 1);
  return Math.trunc(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function formatMultiplier(mult) {
  return mult.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '×';
}
