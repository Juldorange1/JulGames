// charge les scripts du jeu dans Node (sans affichage)
var fs = require('fs'), vm = require('vm'), path = require('path');
module.exports = function () {
  var ctx = { console: console, Math: Math, Date: Date, JSON: JSON, localStorage: { getItem: function () { return null; }, setItem: function () { } } };
  vm.createContext(ctx);
  ['base', 'colosse', 'combat', 'bot'].forEach(function (f) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
  });
  return ctx;
};
