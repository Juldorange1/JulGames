# JulGame

Dépôt regroupant tous les jeux JulGame. Chaque jeu est **isolé dans son propre dossier**
à la racine, avec son propre `index.html` pour le lancer directement (aucune dépendance
entre les jeux, sauf mention contraire).

## Jeux disponibles

| Dossier | Jeu | Description |
|---|---|---|
| [`hexdefense/`](hexdefense/) | **Hex Défense** | Tower defense hexagonal, plusieurs héros, Mode Infini (prestige, cristaux, Choses aléatoires) |
| [`geodash/`](geodash/) | **GeoDash** | Éditeur de niveaux façon Geometry Dash (piques, blocs, portails) + mode test/jeu |
| [`fracas/`](fracas/) | **Fracas** | Action 2D vue du dessus : 10 personnages radicalement différents (30 compétences) + 4 persos de parcours, 12 tourelles, 6 boss, expédition speedrun en 3 parties de 10 salles, 10 défis fixes, multiplicateur de dégâts au lieu de PV |
| [`triade/`](triade/) | **Triade** (ex-Binôme) | Stratégie tour par tour sans fin, salles générées aléatoirement (taille 8×6 à 12×9, formes variées : coins, trous, caverne, croix, ravin ; le vide fait tomber) : 3 héros (au choix parmi 4) qui n'ont que leur attaque de base au départ et jusqu'à 4 compétences (29 au total : 4 de base + 25 à découvrir). Pas de PV : un **% de dégâts** qui baisse quand on est touché (plancher 40 %), tuer un ennemi rend +5 % au tueur. Après chaque salle, 3 portes ★ ou ★★ (gains ×2) : nouvelle compétence, amélioration (13), règle du jeu (16), pacte bonus/malus (10), repos, mutation, transfert, sablier — **tout est temporaire** (durée en salles). Seuls les **boss** (5) donnent de l'or (perdu si un héros tombe à 40 % pendant le combat) ; l'or sert à **graver** un effet pour toujours ou à acheter des talents définitifs. **Prévision exacte du tour ennemi** (simulation à graine : flèches d'attaque, positions, morts, % après le tour, ordre d'action). **Difficulté de 1 à l'infini** (PV/dégâts/nombre d'ennemis, or des boss × niveau ; changeable toutes les 10 salles, niveau N+1 débloqué en battant un boss au niveau N), dégâts maximum par compétence (affichés « 40/16 », relevables avec l'amélioration Plafond), aucun bonus de déplacement, talents sans limite (prix croissant), bonus à aller chercher dans les salles (coffres d'or, orbes, cercles de pouvoir), boss qui viennent te traquer si tu restes hors de portée, mélodie générée en secours, fin de tour automatique, musiques CC0 d'OpenGameArt (voir `binome/music/CREDITS.md`), boss à **2-3 phases**, 5 types de salles (combat, vagues, survie, chasse au voleur, rituel à cristaux), 12 terrains (piques, courants, autels, glace, runes, téléporteurs, buissons, boue, petits soins, foyers, trampolines, pièges à mâchoires ; les héros peuvent tomber dans les fosses), 29 ennemis dont des clones, des ennemis qui grandissent (Éveillé, Enragé) et des contrôleurs de zone (Gardien de givre, Semeur, Pyromane) (Ombres qui copient les mouvements du héros en miroir, Scissipares qui se divisent, Jumeaux qui se ressuscitent), Carapaces et Totems, 6 boss, défis de salle facultatifs, Codex animé (une scène jouée par le vrai moteur pour chaque ennemi, boss, compétence, héros, terrain et objet), infobulles flottantes, nombreux raccourcis clavier. Attaques annoncées, poussées/collisions/fosses, 5 ères. Sauvegarde locale |
| [`stratajium/`](stratajium/) | **Stratajium** | Stratégie au tour par tour façon échecs, **programme Windows** (Electron, `stratajium/desktop/` : `npm install` puis `npm run build` ; raccourci « Stratajium » sur le Bureau). Une **partie** = une suite d'affrontements contre un bot dont on choisit l'intelligence (facile, normal, impossible) ou à deux, en temps infini, 3 emplacements de sauvegarde. On commence avec 3 dieux, 4 sortes de gardes, le plateau classique et sans événement ; chaque affrontement gagné fait choisir une **évolution** (nouveau dieu, nouveau garde, cartes plus sauvages jusqu'au niveau 4, +25 % de chance d'événement). 15 dieux, 18 gardes et le soldat (noms clairs, équilibrés par des centaines de parties entre bots), 12 événements. À chaque tour : recruter, placer OU activer un perso ; but : tuer tous les dieux adverses ou 4 gardes. Clairière en forêt dessinée autour du plateau, animations (glissements, morts qui éclatent, éclairs, séismes…), vraies musiques et bruitages CC0 (voir `music/CREDITS.md` et `sfx/CREDITS.md`). Retour d'un coup en arrière, choix de qui commence, points (facile 1, normal 2, impossible 5) et 3 meilleurs temps par bot ; le bot impossible (alpha-bêta dans un Web Worker) apprend les habitudes du joueur |
| [`echos/`](echos/) | **Échos** | Jeu de rythme sur TES musiques : import d'un fichier audio ou d'un titre Spotify (lien → titre/pochette, puis enregistrement du son de l'onglet ou de l'appli pendant qu'il joue, silences coupés automatiquement). De 1 à 24 touches au choix (personnalisables ; au-delà de 8, disposition « piano » sur deux rangées) : le morceau est analysé en 24 bandes fines (échelle ERB) regroupées en une bande par touche (aigu → grave ; jusqu'à 8 bandes filtres Linkwitz-Riley compensés, au-delà filtres RIF complémentaires dont le retard de 46 ms est compensé dans l'horloge : toutes les bandes réunies = le morceau d'origine) ; chaque touche fait sonner sa bande jusqu'à sa note suivante, mauvaise touche = silence. Partitions générées automatiquement (attaques détectées par bande) : style Couches ou Mélodie (une note à la fois, touche selon la hauteur du passage), 4 difficultés. Modes Entraînement (score, records), Solo libre (sans notes) et Écouter (démo parfaite), vitesse de 25 % à 200 % sans changer la hauteur (WSOLA), départ à n'importe quel passage, guide sonore. Notes longues à tenir (détectées quand le son reste fort ; lâcher trop tôt coupe le son), désactivables (« relâchement ignoré » : que des appuis). Son et vaisseaux désactivables. Clavier de notes au centre ; à sa gauche (écran large), 4 mini-niveaux « vaisseau » façon Geometry Dash, un par touche (tenir = monter, lâcher = descendre), générés depuis la partition : pics là où il faut voler, plafond qui descend hors des notes, construits pour qu'un jeu correct (±0,12 s, appuis de 0,03 à 0,2 s) ne s'écrase jamais. Bibliothèque en IndexedDB, 100 % local |
| [`forge-pvp/`](forge-pvp/) | **Forge PvP** | Entraînement PvP Minecraft en 3D (three.js vendorisé, licence MIT, voir `forge-pvp/vendor/`) : déplacements, sauts, sprint, accroupi, effet Vitesse, flèches et combat calqués sur Minecraft. 7 exercices entièrement configurables (durée libre ou infinie, difficulté 0–100 %, sets enregistrables) : boxing & ciblage, réflexes, arc (option : les cibles ripostent et il faut esquiver), construction rapide (échafaudage autorisé autour de la parcelle), bridge, parkour (chaque saut validé par le planificateur `js/plan.js` sur la vraie physique, trajectoires protégées : toujours finissable), test de CPS. **Mode regarder** dans chaque exercice : l'ordinateur joue parfaitement à ta place sans connaître l'avenir (`js/ia.js`). Interface sans défilement |
| [`forge-serveur/`](forge-serveur/) | **Forge PvP — serveur Minecraft** | Version **serveur Minecraft Java 26.3** de Forge PvP (Fabric, mod côté serveur seulement : on se connecte avec un Minecraft normal). Hub avec une plaque par exercice, menus en coffre, 15 exercices avec bots (vrais joueurs simulés par le serveur) et mode « regarder le bot ». Lancement : `serveur/Lancer le serveur.bat` ; mise en ligne avec playit.gg (voir son README). Pas un jeu web : pas de lien sur la page d'accueil |

## Outils (pas des jeux)

| Dossier | Outil | Description |
|---|---|---|
| [`revision-anglais/`](revision-anglais/) | **Révision Anglais** | Import de leçon (analyse auto), 8 types d'exercices, révision espacée intelligente, 100 % local |
| [`pokedex/`](pokedex/) | **Pokédex — Apprentissage** | Appli perso d'apprentissage du Pokédex (quiz, révision espacée, 100 % hors-ligne) |

> **Avidité** a été déplacé dans son propre dépôt indépendant
> (`C:\Users\juldorange\avidite`, hors de ce monorepo) le 2026-08-29, pour
> pouvoir sortir de la contrainte "scripts classiques / compatible file://"
> commune aux autres jeux ici et explorer un rendu 3D plus poussé (modules ES,
> chargement de modèles, post-traitement).

## Lancer un jeu

Chaque jeu peut s'ouvrir directement en local (`file://<dossier>/index.html`), ou via un
petit serveur HTTP (voir `.claude/launch.json` pour les configurations existantes) :

```bash
python -m http.server 5500 --directory geodash
```

La page [`index.html`](index.html) à la racine est un simple sommaire qui pointe vers
chaque jeu — ce n'est pas un jeu en soi.

## Arborescence

```
ruine/                  (dépôt = "JulGame")
├── index.html          Page d'accueil (liste des jeux)
├── README.md           Ce fichier
├── CLAUDE.md           Instructions générales du dépôt
├── hexdefense/         Jeu "Hex Défense"
├── geodash/             Jeu "GeoDash"
├── fracas/              Jeu "Fracas"
├── triade/              Jeu "Triade" (stratégie tour par tour infinie à 3 héros ; binome/ redirige ici)
├── revision-anglais/    Outil "Révision Anglais"
├── stratajium/        Jeu "Stratajium" (stratégie façon échecs, recruter/placer/activer, bot)
├── echos/             Jeu "Échos" (rythme sur ses propres musiques, import Spotify)
├── forge-pvp/         Entraînement PvP Minecraft (3D)
├── forge-serveur/    Forge PvP en serveur Minecraft Java (mod Fabric côté serveur)
└── pokedex/             Outil "Pokédex"
```
