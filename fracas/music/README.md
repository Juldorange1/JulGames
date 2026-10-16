# Musique de Fracas — vraies pistes

Le jeu sait jouer de **vrais fichiers audio** à la place de la musique synthétisée.
Chaque piste ajoutée remplace la synthèse pour ce morceau. Les morceaux sans fichier gardent la
synthèse, donc on peut les ajouter un par un.

## Ajouter une piste

1. Mettre le fichier dans ce dossier (`fracas/music/`).
   - Format conseillé : **OGG Vorbis**, 44,1 kHz, environ 160 kb/s. Le MP3 marche aussi.
   - La piste doit **boucler sans coupure** : prévoir une fin qui enchaîne sur le début.
2. Le déclarer dans `js/music_files.js` :
   ```js
   const MUSIC_FILES = {
     menu: 'music/menu.ogg',
     part1: { base: 'music/part1.ogg', combat: 'music/part1_combat.ogg' },
   };
   ```
   - Forme simple : une piste en boucle.
   - Forme « adaptative » : deux couches **de même durée** jouées ensemble. La couche
     `combat` (batterie, lead, etc.) monte pendant les combats et redescend au calme.
3. Pour la version programme, reconstruire le `.exe` (`npm run build` dans `desktop/`).

## Morceaux du jeu

| Nom | Quand |
|---|---|
| `menu`, `menu2` | base, menus |
| `tutorial` | tutoriel |
| `part1`, `part1b` | Monde partie 1 (b = 2e moitié) / Infini |
| `part2`, `part2b` | partie 2 |
| `part3`, `part3b` | partie 3 |
| `boss`, `boss2` | combats de boss |
| `final` | boss final (Le Cœur du Fracas) |
| `arena` | parties en ligne |

Les jingles de victoire et de défaite, et tous les bruitages, restent synthétisés.

## Droits (important pour Steam)

N'utiliser que de la musique dont on a le **droit de vendre** le jeu avec :
- **composée pour le jeu**, sur commande (contrat qui cède les droits d'exploitation) ;
- **sous licence commerciale** achetée (packs de musique de jeu) ;
- **CC0** (domaine public) ;
- **CC-BY** : autorisé, avec le **nom de l'auteur dans les crédits** du jeu.

Interdit : musique du commerce, de YouTube, ou sous licence « NC » (non commerciale).
Garder dans ce dossier un fichier `CREDITS.txt` avec, pour chaque piste, l'auteur, la licence
et le lien d'origine.
