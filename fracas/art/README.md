# Fracas — direction artistique et sprites

Le jeu dessine tout en vectoriel (code). On peut remplacer les dessins par de **vraies images**
une par une : déposer le PNG dans ce dossier, puis le déclarer dans `js/sprites.js`.
Sans image déclarée, le dessin actuel est gardé.

```js
const SPRITE_FILES = {
  char:   { 6: 'art/chars/cendre.png' },
  turret: { T1: 'art/turrets/t1.png' },
  boss:   { B7: 'art/bosses/coeur.png' },
};
```
Ensuite, reconstruire le `.exe` (`npm run build` dans `desktop/`).

## Règles de style (à donner à l'artiste)

- **Vue strictement du dessus** : pas de 3/4, pas de falaises en relief.
- **Personnage tourné vers la DROITE** dans l'image : le jeu fait pivoter le sprite vers la visée.
- **PNG transparent**, contour sombre de 2 à 3 px, lumière qui vient d'en haut à gauche.
- Une **couleur dominante par personnage** et par boss (celle du jeu actuel, voir ci-dessous),
  pour que le joueur reconnaisse tout d'un coup d'œil.
- Ennemis : silhouettes mécaniques ou créatures, toujours lisibles sur un sol sombre.
- Projectiles ennemis : clairs et saturés, jamais de la même couleur que le décor.
- Format conseillé : dessin 256×256 px, affiché à environ 40 px (personnages), 40 à 50 px
  (tourelles) et 80 à 160 px (boss).

## Liste des images à faire

| Type | Nom (fichier conseillé) | Couleur |
|---|---|---|
| Personnages | 1 Volte, 2 Rebond, 3 Retour, 5 Ricochet, 6 Cendre, 7 Echo, 8 Vortex, 9 Brasier, 10 Gémeaux, 11 Zephyr (`art/chars/<nom>.png`) | celle du perso dans le Codex |
| Tourelles | T1 Sentinelle … T12 Obélisque, DUMMY (cible) (`art/turrets/t1.png`…) | voir `TURRET_COLOR` (turrets.js) |
| Boss | B1 Le Nœud `#8ad9ff`, B2 Le Jardin `#5dff9d`, B3 La Mitraille `#ffb85d`, B4 Le Rail `#c74dff`, B5 Le Colosse `#8a6a55`, B6 Le Noyau `#ff5d5d`, B7 Le Cœur du Fracas `#ffd23d` | |

Plus tard, pour aller plus loin : animations (marche, attaque), sols par partie, décors et
projectiles. Il faudra alors un peu de code pour les feuilles d'animation.

## Images obligatoires pour la page Steam

| Image | Taille (px) |
|---|---|
| Capsule d'en-tête (header) | 920 × 430 |
| Petite capsule | 462 × 174 |
| Capsule principale | 1232 × 706 |
| Capsule verticale | 748 × 896 |
| Capsule de bibliothèque | 600 × 900 |
| Héros de bibliothèque | 3840 × 1240 |
| Logo de bibliothèque (PNG transparent) | 1280 × 720 |
| Fond de page (facultatif) | 1438 × 810 |
| Captures d'écran (5 minimum) | 1920 × 1080 |
| Icône de la communauté | 184 × 184 |

Vérifier les tailles exactes dans Steamworks au moment de l'envoi : Steam les met parfois à jour.

## Où trouver un artiste ou des images

- Commande à un artiste : Fiverr, ArtStation, communautés Discord de pixel art ou d'art 2D.
  Le contrat doit **céder les droits d'exploitation commerciale**.
- Packs d'images sous licence commerciale ou **CC0** (Kenney.nl, itch.io). Toujours lire la licence
  et noter l'auteur dans `art/CREDITS.txt`.
- Garder **un seul style** : ne pas mélanger plusieurs packs différents.
