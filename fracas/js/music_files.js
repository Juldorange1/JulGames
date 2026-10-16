// Vraies pistes musicales (fichiers audio) — voir music/README.md.
//
// Pour chaque morceau du jeu, on peut donner un fichier (OGG conseille, MP3 accepte) qui
// REMPLACE la musique synthetisee. Un morceau absent de cette liste (ou dont le fichier manque)
// garde la musique synthetisee : on peut donc ajouter les pistes une par une.
//
// Deux formes possibles :
//   menu: 'music/menu.ogg'                                   -> une seule piste en boucle
//   part1: { base: 'music/part1.ogg', combat: 'music/part1_combat.ogg' }
//       -> deux couches calees l'une sur l'autre (meme duree) : la couche "combat" monte
//          pendant les combats et redescend au calme (musique adaptative).
//
// Morceaux du jeu : menu, menu2, tutorial, part1, part1b, part2, part2b, part3, part3b,
// boss, boss2, final, arena.
const MUSIC_FILES = {
  // menu: 'music/menu.ogg',
  // part1: { base: 'music/part1.ogg', combat: 'music/part1_combat.ogg' },
};
