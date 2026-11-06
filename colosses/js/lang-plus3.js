'use strict';
/* Colosses — traductions : toile des affinités, Chasse et Abysses à débloquer. */
(function () {
const T = {
  en: [
    ['Déplace les pointes de la toile. Monter une chance fait baisser les autres, baisser une chance fait monter les autres : le total reste à 100 %. Tu bouges librement chaque chance entre le minimum et le maximum achetés, et chaque niveau élargit ces deux limites. Une arme n\'a jamais plus de 2 fois plus de chance que la moins probable. La puissance des armes ne change jamais.',
      'Drag the points of the web. Raising one chance lowers the others and lowering one raises the others: the total stays at 100%. You can freely move each chance between the minimum and maximum you bought, and each level widens both limits. A weapon never has more than twice the chance of the least likely one. Weapon power never changes.'],
    ['Tout remettre à égalité', 'Reset everything'], ['Armes principales', 'Main weapons'], ['Attaques spéciales', 'Special attacks'], ['Pas encore croisées', 'Not met yet'],
    ['un boss par semaine, de plus en plus vite', 'one boss a week, faster and faster'], ['boss sans fin, toujours plus fous · 1 vie', 'endless bosses, ever wilder · 1 life'],
    ['Débloquer', 'Unlock'], ['Acheter', 'Buy']
  ],
  es: [
    ['Déplace les pointes de la toile. Monter une chance fait baisser les autres, baisser une chance fait monter les autres : le total reste à 100 %. Tu bouges librement chaque chance entre le minimum et le maximum achetés, et chaque niveau élargit ces deux limites. Une arme n\'a jamais plus de 2 fois plus de chance que la moins probable. La puissance des armes ne change jamais.',
      'Arrastra las puntas de la telaraña. Subir una probabilidad baja las demás y bajarla sube las demás: el total sigue en 100 %. Mueves libremente cada probabilidad entre el mínimo y el máximo comprados, y cada nivel amplía ambos límites. Un arma nunca tiene más del doble de probabilidad que la menos probable. El poder de las armas nunca cambia.'],
    ['Tout remettre à égalité', 'Igualar todo'], ['Armes principales', 'Armas principales'], ['Attaques spéciales', 'Ataques especiales'], ['Pas encore croisées', 'Aún sin descubrir'],
    ['un boss par semaine, de plus en plus vite', 'un jefe por semana, cada vez más rápido'], ['boss sans fin, toujours plus fous · 1 vie', 'jefes sin fin, cada vez más locos · 1 vida'],
    ['Débloquer', 'Desbloquear'], ['Acheter', 'Comprar']
  ],
  de: [
    ['Déplace les pointes de la toile. Monter une chance fait baisser les autres, baisser une chance fait monter les autres : le total reste à 100 %. Tu bouges librement chaque chance entre le minimum et le maximum achetés, et chaque niveau élargit ces deux limites. Une arme n\'a jamais plus de 2 fois plus de chance que la moins probable. La puissance des armes ne change jamais.',
      'Ziehe die Spitzen des Netzes. Hebst du eine Chance an, sinken die anderen, senkst du sie, steigen die anderen: Die Summe bleibt bei 100 %. Du bewegst jede Chance frei zwischen dem gekauften Minimum und Maximum, und jede Stufe erweitert beide Grenzen. Eine Waffe hat nie mehr als die doppelte Chance der unwahrscheinlichsten. Die Stärke der Waffen ändert sich nie.'],
    ['Tout remettre à égalité', 'Alles angleichen'], ['Armes principales', 'Hauptwaffen'], ['Attaques spéciales', 'Spezialangriffe'], ['Pas encore croisées', 'Noch nicht entdeckt'],
    ['un boss par semaine, de plus en plus vite', 'ein Boss pro Woche, immer schneller'], ['boss sans fin, toujours plus fous · 1 vie', 'endlose Bosse, immer verrückter · 1 Leben'],
    ['Débloquer', 'Freischalten'], ['Acheter', 'Kaufen']
  ]
};
for (const code of Object.keys(T)) { const L = LANGS[code]; if (L) L.frag = T[code].concat(L.frag || []); }
})();
