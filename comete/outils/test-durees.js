// durée des combats avec le pilote invincible (sert à régler les points de vie)
var G = require('./charger.js')();
var liste = (process.argv[2] || '1,3,5,10,15,20,30,40').split(',').map(Number);
require('vm').runInContext('function duree(n){ var def = colosseAscension(n); var C = creerCombat(def, {invincible:true}); var B = creerBot(1); var tc=null, coups=0;' +
  ' for (var i=0;i<400/DT && !C.fini;i++){ pasCombat(C, botEntree(C,B)); for (var e=0;e<C.ev.length;e++){ if(C.ev[e].type==="coeurSort") tc=C.t; if(C.ev[e].type==="touche") coups++; } C.ev.length=0; }' +
  ' return n+" noyaux "+def.noyaux.length+"x"+def.noyaux[0].hp+" coeur "+def.coeur.hp+" bpm "+def.bpm+" -> coeur a "+(tc&&tc.toFixed(0))+"s, fin "+C.t.toFixed(0)+"s ("+(C.fini||"pas fini")+") touché "+coups+" boucles "+C.s.boucles+" combo "+C.s.comboMax+" att "+def.attaques.join(","); }', G);
liste.forEach(function (n) { console.log(G.duree(n)); });
