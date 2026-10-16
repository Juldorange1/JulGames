# Faire tester Fracas par de vrais joueurs

## 1. Steam Playtest (gratuit, recommandé)

Dans Steamworks, page du jeu : *Playtest* → créer l'application de test. Elle a une page
« Rejoindre le test » sur la fiche Steam du jeu.
- Envoyer le **même dossier** `dist/win-unpacked/` que pour le jeu (même procédure de dépôt).
- Ouvrir l'accès limité (par exemple 100 à 500 joueurs), puis l'augmenter.
- Avantages : les joueurs s'inscrivent eux-mêmes, et ça fait connaître la page Steam (listes de
  souhaits).

En attendant Steam, on peut envoyer `dist/Fracas-1.0.0-portable.exe` à des amis.

## 2. Journal de test intégré

Le jeu note tout seul, **sur l'ordinateur du joueur** (rien n'est envoyé sur Internet) :
- chaque salle vidée : mode, partie, numéro de salle, temps passé, % de dégâts restant, personnage ;
- chaque boss : vaincu (temps) ou enfui (Infini) ;
- les bonus et malus choisis ;
- le début et la fin des parties.

Le joueur va dans *Fonctionnalités > Paramètres > Test du jeu > Exporter le journal*. Le
programme enregistre `Documents\Fracas\fracas-journal-AAAA-MM-JJ.json` et ouvre le dossier, et le
joueur t'envoie ce fichier. Dans le navigateur, le fichier est téléchargé.

Le fichier commence par un **résumé** :
- `byPart` : temps moyen par salle (`secsMoy`) et % moyen en fin de salle (`pctMoy`), par partie ;
- `bosses` : boss vaincus et enfuis, et temps moyen de chaque boss ;
- `boonsPicked`, `cursesPicked` : les bonus et malus les plus choisis.

## 3. Quoi regarder pour l'équilibrage

- **Boss trop dur** : beaucoup de fuites (`fled`) ou un temps moyen très long.
- **Boss trop facile** : battu en quelques secondes.
- **Partie trop dure** : `pctMoy` bas (proche de 40 % en Infini) ou temps par salle qui explose.
- **Bonus toujours pris** (trop fort) ou **jamais pris** (inutile).
- **Malus jamais pris** (trop punitif).
- Les réglages se changent ensuite dans le code : multiplicateurs commentés dans `bosses.js`,
  `boons.js`, `infinite.js` et `characters.js`.

## 4. Questions à poser aux testeurs

1. Qu'est-ce que tu as le plus aimé ? Le moins ?
2. Est-ce que tu as compris le jeu sans lire (icônes, tutoriel) ?
3. Quel personnage préfères-tu, et lequel trouves-tu trop fort ou trop faible ?
4. À quel moment as-tu eu envie d'arrêter ?
5. Combien paierais-tu ce jeu ?
6. Bugs : quoi, où, comment le refaire ? (avec une capture d'écran si possible)
