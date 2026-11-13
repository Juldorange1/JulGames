// node outils/test-combats.js [liste de numéros] [essais]  → le pilote automatique affronte les colosses
var G = require('./charger.js')();
var liste = (process.argv[2] || '1,2,3,5,8,10,15,20,30,40').split(',').map(Number);
var essais = +(process.argv[3] || 3);
vm = null;
var src = 'function lancer(n, graine){ var def = colosseAscension(n); var C = creerCombat(def, {}); var B = creerBot(1);' +
  ' var max = 240/DT, morts = {}; for (var i=0;i<max && !C.fini;i++){ var E = botEntree(C,B); pasCombat(C,E);' +
  ' for (var e=0;e<C.ev.length;e++){ var v=C.ev[e]; if(v.type==="touche") morts[v.cause]=(morts[v.cause]||0)+1; } C.ev.length=0;' +
  ' if (isNaN(C.j.x)||isNaN(C.corps.x)) throw new Error("NaN"); }' +
  ' return { n:n, nom:def.nom, fini:C.fini||"temps", t:C.t.toFixed(0), pct:Math.round(pctCombat(C)*100), touches:C.s.touches, boucles:C.s.boucles, balles:C.s.balles, comboMax:C.s.comboMax, morts:JSON.stringify(morts), att: def.attaques.join(",") }; }';
require('vm').runInContext(src, G);
liste.forEach(function (n) {
  var r = [];
  for (var k = 0; k < essais; k++) r.push(G.lancer(n));
  r.forEach(function (x) { console.log(x.n, x.nom.padEnd(10), x.fini.padEnd(9), 't=' + x.t, x.pct + '%', 'touché ' + x.touches, 'boucles ' + x.boucles, 'balles ' + x.balles, 'combo ' + x.comboMax, x.morts, x.att); });
});
