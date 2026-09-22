# JulGame

Dépôt regroupant tous les jeux JulGame. Chaque jeu est **isolé dans son propre dossier**
à la racine, avec son propre `index.html` pour le lancer directement (aucune dépendance
entre les jeux, sauf mention contraire).

## Jeux disponibles

| Dossier | Jeu | Description |
|---|---|---|
| [`hexdefense/`](hexdefense/) | **Hex Défense** | Tower defense hexagonal, plusieurs héros, Mode Infini (prestige, cristaux, Choses aléatoires) |
| [`geodash/`](geodash/) | **GeoDash** | Éditeur de niveaux façon Geometry Dash (piques, blocs, portails) + mode test/jeu |
| [`puissance4/`](puissance4/) | **Puissance 4** | Solveur exact (moteur WASM + livre d'ouverture de reference, voir `puissance4/js/vendor/`) : affiche pour chaque colonne le nombre de coups jusqu'à la victoire/défaite/nul, en quelques millisecondes. ⚠️ Sous licence **AGPL-3.0** (dépendance tierce) — voir `puissance4/LICENSE` |
| [`fracas/`](fracas/) | **Fracas** | Action 2D vue du dessus : 11 personnages radicalement différents (33 compétences), 12 tourelles, 6 boss, expédition speedrun en 3 parties de 10 salles, 10 défis fixes, multiplicateur de dégâts au lieu de PV |
| [`adofai/`](adofai/) | **ADOFAI** | Clone maison (fan-made) façon A Dance of Fire and Ice : bille en orbite qu'on propulse au tempo vers la case suivante, 5 niveaux principaux (difficulté 1 à 5) + mode entraînement (checkpoints, vitesse réglable au %, morts sans pénalité) + éditeur de niveaux intégré (angles, BPM, export/import JSON), 100 % local |

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
├── puissance4/          Jeu "Puissance 4" (solveur exact)
├── fracas/              Jeu "Fracas"
├── revision-anglais/    Outil "Révision Anglais"
└── pokedex/             Outil "Pokédex"
```
