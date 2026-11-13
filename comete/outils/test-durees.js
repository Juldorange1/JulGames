// node outils/test-durees.js [numéros] [difficulté] : durée des combats avec le pilote invincible (sert à régler les PV)
var G = require('./charger.js')();
var liste = (process.argv[2] || '1,3,5,8,12,16,20,25,30').split(',').map(Number);
G.DIFF_TEST = process.argv[3] || 'comete';
require('vm').runInContext('function duree(n){ var def = colosseAscension(n); var C = creerCombat(def, {invincible:true, diff: DIFF_TEST}); var B = creerBot(1); var tc=null, coups={}, nc=0;' +
  ' for (var i=0;i<420/DT && !C.fini;i++){ pasCombat(C, botEntree(C,B)); for (var e=0;e<C.ev.length;e++){ var v=C.ev[e]; if(v.type==="coeurSort") tc=C.t; if(v.type==="touche") {nc++; coups[v.cause]=(coups[v.cause]||0)+1;} } C.ev.length=0; }' +
  ' return n+" "+def.espece+" ["+def.types.join(",")+"] -> coeur a "+(tc?tc.toFixed(0):"-")+"s, fin "+C.t.toFixed(0)+"s "+(C.fini||"("+Math.round(pctCombat(C)*100)+"%)")+" touché "+nc+" "+JSON.stringify(coups); }', G);
liste.forEach(function (n) { console.log(G.duree(n)); });
