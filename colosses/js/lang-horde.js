'use strict';
/* Colosses — traductions de la Survie (la horde). */
(function () {
const T = {
  en: [
    ["Tu commences à ton record moins 2 minutes (même temps, même menace) :", "You start at your record minus 2 minutes (same time, same threat):"], ["Départ à ", "Start at "], ["Pas de boss : dix-huit sortes d'ennemis, chacune avec son attaque et sa façon d'être battue.", "No boss: eighteen kinds of enemies, each with its own attack and its own way to be beaten."],
    ['Des ennemis arrivent sans arrêt, toujours plus vite et plus nombreux : tiens le plus longtemps possible', 'Enemies keep coming, ever faster and more numerous: hold out as long as you can'],
    ['des ennemis sans fin, toujours plus nombreux', 'endless enemies, more and more of them'],
    ["Pas de boss : douze sortes d'ennemis, chacune avec son attaque et sa façon d'être battue.", 'No boss: twelve kinds of enemies, each with its own attack and its own way to be beaten.'],
    ['Armes au hasard, mais la vie des ennemis suit leur force ; les ennemis arrivent dans le même ordre pour tout le monde et les armes de zone sont freinées : la chance compte très peu.', 'Random weapons, but enemy health follows their strength; enemies come in the same order for everyone and area weapons are held back: luck barely matters.'],
    ['La horde', 'The horde'], ['sans fin', 'endless'], ["sortes d'ennemis", 'kinds of enemies'],
    ['Ils arrivent…', 'Here they come…'], ['Reprise : ', 'Resumed: '], ['Menace ', 'Threat '], [' ennemis', ' enemies'], [' ennemi', ' enemy'], ['ennemis abattus', 'enemies slain'], [' abattus', ' slain']
  ],
  es: [
    ["Tu commences à ton record moins 2 minutes (même temps, même menace) :", "Empiezas en tu récord menos 2 minutos (mismo tiempo, misma amenaza):"], ["Départ à ", "Salida en "], ["Pas de boss : dix-huit sortes d'ennemis, chacune avec son attaque et sa façon d'être battue.", "Sin jefe: dieciocho tipos de enemigos, cada uno con su ataque y su forma de vencerlo."],
    ['Des ennemis arrivent sans arrêt, toujours plus vite et plus nombreux : tiens le plus longtemps possible', 'Los enemigos llegan sin parar, cada vez más rápido y más numerosos: aguanta lo máximo posible'],
    ['des ennemis sans fin, toujours plus nombreux', 'enemigos sin fin, cada vez más'],
    ["Pas de boss : douze sortes d'ennemis, chacune avec son attaque et sa façon d'être battue.", 'Sin jefe: doce tipos de enemigos, cada uno con su ataque y su forma de vencerlo.'],
    ['Armes au hasard, mais la vie des ennemis suit leur force ; les ennemis arrivent dans le même ordre pour tout le monde et les armes de zone sont freinées : la chance compte très peu.', 'Armas al azar, pero la vida de los enemigos sigue su fuerza; los enemigos llegan en el mismo orden para todos y las armas de área se frenan: la suerte cuenta muy poco.'],
    ['La horde', 'La horda'], ['sans fin', 'sin fin'], ["sortes d'ennemis", 'tipos de enemigos'],
    ['Ils arrivent…', 'Ya vienen…'], ['Reprise : ', 'Reanudado: '], ['Menace ', 'Amenaza '], [' ennemis', ' enemigos'], [' ennemi', ' enemigo'], ['ennemis abattus', 'enemigos abatidos'], [' abattus', ' abatidos']
  ],
  de: [
    ["Tu commences à ton record moins 2 minutes (même temps, même menace) :", "Du startest bei deinem Rekord minus 2 Minuten (gleiche Zeit, gleiche Bedrohung):"], ["Départ à ", "Start bei "], ["Pas de boss : dix-huit sortes d'ennemis, chacune avec son attaque et sa façon d'être battue.", "Kein Boss: achtzehn Gegnerarten, jede mit eigenem Angriff und eigener Art, sie zu besiegen."],
    ['Des ennemis arrivent sans arrêt, toujours plus vite et plus nombreux : tiens le plus longtemps possible', 'Gegner kommen ohne Pause, immer schneller und zahlreicher: halte so lange wie möglich durch'],
    ['des ennemis sans fin, toujours plus nombreux', 'endlose Gegner, immer mehr'],
    ["Pas de boss : douze sortes d'ennemis, chacune avec son attaque et sa façon d'être battue.", 'Kein Boss: zwölf Gegnerarten, jede mit eigenem Angriff und eigener Art, sie zu besiegen.'],
    ['Armes au hasard, mais la vie des ennemis suit leur force ; les ennemis arrivent dans le même ordre pour tout le monde et les armes de zone sont freinées : la chance compte très peu.', 'Zufällige Waffen, aber das Leben der Gegner richtet sich nach ihrer Stärke; die Gegner kommen für alle in derselben Reihenfolge und Flächenwaffen werden gebremst: Glück zählt kaum.'],
    ['La horde', 'Die Horde'], ['sans fin', 'endlos'], ["sortes d'ennemis", 'Gegnerarten'],
    ['Ils arrivent…', 'Sie kommen…'], ['Reprise : ', 'Fortgesetzt: '], ['Menace ', 'Bedrohung '], [' ennemis', ' Gegner'], [' ennemi', ' Gegner'], ['ennemis abattus', 'Gegner besiegt'], [' abattus', ' besiegt']
  ]
};
for (const code of Object.keys(T)) { const L = LANGS[code]; if (L) L.frag = T[code].concat(L.frag || []); }
})();
