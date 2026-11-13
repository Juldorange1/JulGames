// node outils/test-robustesse.js : fait tourner beaucoup de colosses (Ascension, Odyssée, défis, formes) pour chercher des erreurs
var G = require('./charger.js')();
require('vm').runInContext([
  'function essai(def, opts, sec){ var C = creerCombat(def, opts); var B = creerBot(1); for (var i=0;i<sec/DT && !C.fini;i++){ pasCombat(C, botEntree(C,B)); C.ev.length=0;',
  '  if (!isFinite(C.j.x)||!isFinite(C.corps.x)||C.balles.length>2000) throw new Error("etat invalide "+def.d); }',
  '  return C; }',
  'var muts=["rapide","courte","fragile","fureur","nuit","boucliers","sansComp"]; var nb=0;',
  'for (var n=1;n<=120;n+=3){ essai(colosseAscension(n),{invincible:true, forme:["comete","lame","tisseuse","reflet"][n%4]},25); nb++; }',
  'for (var k=1;k<=30;k+=2){ essai(genColosse({n:1+(k-1)*1.6, titan:k%5===0, graine:k*1013+5}),{mods:{longue:1,echo:1,braise:1,souffle:1,aimant:1,rythme:1,nova:2,egide:1}, invincible:true, forme:["reflet","tisseuse","lame"][k%3]},20); nb++; }',
  'for (var m=0;m<muts.length;m++){ var mu={}; mu[muts[m]]=true; essai(genColosse({n:15,graine:m}),{mut:mu, invincible:true},20); nb++; }',
  'for (var t in TRAITS){ for (var g=0; g<40; g++){ var df=genColosse({n:16,graine:g*31+7}); if (df.traits.indexOf(t)>=0){ essai(df,{invincible:true, forme:"tisseuse"},20); nb++; break; } } }',
  'var C2 = essai(colosseAscension(8),{invincible:true, forme:"lame"},200); if(!C2.fini) console.log("lame 8 pas fini", pctCombat(C2));',
  'essai(colosseAscension(5),{W:9,H:14, invincible:true},30); nb++;',
  'console.log("OK", nb, "combats sans erreur");'
].join('\n'), G);
