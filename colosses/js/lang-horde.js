'use strict';
/* Colosses — traductions de la nouvelle Survie (la horde). */
(function () {
const T = {
  en: [
    ["Des vagues d'ennemis sans fin, toujours plus nombreuses : tiens le plus longtemps possible", 'Endless waves of enemies, ever more numerous: hold out as long as you can'],
    ["des vagues d'ennemis sans fin", 'endless waves of enemies'],
    ['Pas de boss : douze sortes de petits ennemis, de plus en plus nombreux.', 'No boss: twelve kinds of small enemies, more and more of them.'],
    ['Les vagues sont les mêmes pour tout le monde, les armes de zone sont freinées et la vie des ennemis suit la force de tes armes : la chance compte très peu.', 'Waves are the same for everyone, area weapons are held back and enemy health follows the strength of your weapons: luck barely matters.'],
    ['Partie en cours : tu reprends au début de la vague', 'Run in progress: you resume at the start of wave'],
    ['La horde', 'The horde'], ['vagues sans fin', 'endless waves'], ["sortes d'ennemis", 'kinds of enemies'],
    ['Choisis tes trois armes. Tout le monde peut prendre les mêmes et les vagues sont identiques pour tous : la chance ne décide de rien. La vie des ennemis suit la force des armes choisies, chaque choix reste bon.', 'Choose your three weapons. Everyone can take the same ones and the waves are identical for all: luck decides nothing. Enemy health follows the strength of the chosen weapons, so every choice stays good.'],
    ['Lancer la Survie', 'Start Survival'], ['tes armes', 'your weapons'], ['Arme principale', 'Main weapon'], ['Spéciale', 'Special'], ['Talent', 'Talent'],
    ['ennemis restants', 'enemies left'], ['ennemi restant', 'enemy left'], ['La vague arrive…', 'The wave is coming…'], ['ennemis abattus', 'enemies slain'], [' abattus', ' slain'],
    ['VAGUE ', 'WAVE '], ['Vague ', 'Wave '], [' vagues', ' waves'], [' vague', ' wave'], [' · en cours : vague ', ' · in progress: wave ']
  ],
  es: [
    ["Des vagues d'ennemis sans fin, toujours plus nombreuses : tiens le plus longtemps possible", 'Oleadas de enemigos sin fin, cada vez más numerosas: aguanta lo máximo posible'],
    ["des vagues d'ennemis sans fin", 'oleadas de enemigos sin fin'],
    ['Pas de boss : douze sortes de petits ennemis, de plus en plus nombreux.', 'Sin jefe: doce tipos de enemigos pequeños, cada vez más numerosos.'],
    ['Les vagues sont les mêmes pour tout le monde, les armes de zone sont freinées et la vie des ennemis suit la force de tes armes : la chance compte très peu.', 'Las oleadas son iguales para todos, las armas de área se frenan y la vida de los enemigos sigue la fuerza de tus armas: la suerte cuenta muy poco.'],
    ['Partie en cours : tu reprends au début de la vague', 'Partida en curso: retomas al principio de la oleada'],
    ['La horde', 'La horda'], ['vagues sans fin', 'oleadas sin fin'], ["sortes d'ennemis", 'tipos de enemigos'],
    ['Choisis tes trois armes. Tout le monde peut prendre les mêmes et les vagues sont identiques pour tous : la chance ne décide de rien. La vie des ennemis suit la force des armes choisies, chaque choix reste bon.', 'Elige tus tres armas. Todos pueden tomar las mismas y las oleadas son idénticas para todos: la suerte no decide nada. La vida de los enemigos sigue la fuerza de las armas elegidas, toda elección sigue siendo buena.'],
    ['Lancer la Survie', 'Empezar la Supervivencia'], ['tes armes', 'tus armas'], ['Arme principale', 'Arma principal'], ['Spéciale', 'Especial'], ['Talent', 'Talento'],
    ['ennemis restants', 'enemigos restantes'], ['ennemi restant', 'enemigo restante'], ['La vague arrive…', 'Llega la oleada…'], ['ennemis abattus', 'enemigos abatidos'], [' abattus', ' abatidos'],
    ['VAGUE ', 'OLEADA '], ['Vague ', 'Oleada '], [' vagues', ' oleadas'], [' vague', ' oleada'], [' · en cours : vague ', ' · en curso: oleada ']
  ],
  de: [
    ["Des vagues d'ennemis sans fin, toujours plus nombreuses : tiens le plus longtemps possible", 'Endlose Gegnerwellen, immer zahlreicher: halte so lange wie möglich durch'],
    ["des vagues d'ennemis sans fin", 'endlose Gegnerwellen'],
    ['Pas de boss : douze sortes de petits ennemis, de plus en plus nombreux.', 'Kein Boss: zwölf Arten kleiner Gegner, immer mehr davon.'],
    ['Les vagues sont les mêmes pour tout le monde, les armes de zone sont freinées et la vie des ennemis suit la force de tes armes : la chance compte très peu.', 'Die Wellen sind für alle gleich, Flächenwaffen werden gebremst und das Leben der Gegner richtet sich nach der Stärke deiner Waffen: Glück zählt kaum.'],
    ['Partie en cours : tu reprends au début de la vague', 'Laufende Partie: du machst am Anfang der Welle weiter'],
    ['La horde', 'Die Horde'], ['vagues sans fin', 'endlose Wellen'], ["sortes d'ennemis", 'Gegnerarten'],
    ['Choisis tes trois armes. Tout le monde peut prendre les mêmes et les vagues sont identiques pour tous : la chance ne décide de rien. La vie des ennemis suit la force des armes choisies, chaque choix reste bon.', 'Wähle deine drei Waffen. Alle können dieselben nehmen und die Wellen sind für alle gleich: Glück entscheidet nichts. Das Leben der Gegner richtet sich nach der Stärke der gewählten Waffen, jede Wahl bleibt gut.'],
    ['Lancer la Survie', 'Überleben starten'], ['tes armes', 'deine Waffen'], ['Arme principale', 'Hauptwaffe'], ['Spéciale', 'Spezial'], ['Talent', 'Talent'],
    ['ennemis restants', 'Gegner übrig'], ['ennemi restant', 'Gegner übrig'], ['La vague arrive…', 'Die Welle kommt…'], ['ennemis abattus', 'Gegner besiegt'], [' abattus', ' besiegt'],
    ['VAGUE ', 'WELLE '], ['Vague ', 'Welle '], [' vagues', ' Wellen'], [' vague', ' Welle'], [' · en cours : vague ', ' · läuft: Welle ']
  ]
};
for (const code of Object.keys(T)) { const L = LANGS[code]; if (L) L.frag = T[code].concat(L.frag || []); }
})();
