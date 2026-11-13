// Charge les scripts du jeu dans Node (sans navigateur) pour les tests
const fs = require('fs'), path = require('path'), vm = require('vm');
module.exports = function charger(fichiers) {
  const ctx = { console, Math, Date, JSON, Map, Set, Float32Array, Uint8Array, Array, Object, Error, performance: { now: () => Date.now() },
    localStorage: { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = String(v); } } };
  ctx.window = ctx; vm.createContext(ctx);
  for (const f of fichiers) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), ctx, { filename: f });
  return ctx;
};
