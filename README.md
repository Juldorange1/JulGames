# JulGame

Dépôt regroupant tous les jeux JulGame. Chaque jeu est **isolé dans son propre dossier**
à la racine, avec son propre `index.html` pour le lancer directement (aucune dépendance
entre les jeux, sauf mention contraire).

## Jeux disponibles

| Dossier | Jeu | Description |
|---|---|---|
| [`ruines/`](ruines/) | **Ruine** | Top-down desert/ruine, grille 12×12, modes Solo / Coop / PvP |
| [`hexdefense/`](hexdefense/) | **Hex Défense** | Tower defense hexagonal, plusieurs héros, Mode Infini (prestige, cristaux, Choses aléatoires) |
| [`geodash/`](geodash/) | **GeoDash** | Éditeur de niveaux façon Geometry Dash (piques, blocs, portails) + mode test/jeu |
| [`synergie/`](synergie/) | **Synergie** | Roguelike d'action top-down : 50 compétences / 25 spécificités à tags, tirage de build avant chaque combat, roue de rareté |
| [`puissance4/`](puissance4/) | **Puissance 4** | Solveur exact (negamax + alpha-bêta + table de transposition dans un Web Worker) : affiche pour chaque colonne le nombre de coups jusqu'à la victoire/défaite/nul |
| [`wave-idle/`](wave-idle/) | **Wave // Ascension** | Geometry Dash Wave pur (aucun autre mode) × idle/incremental : paliers de vitesse 1× à 89×, combos Perfect, améliorations, prestige Ascension |

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
python -m http.server 5500 --directory ruines
```

La page [`index.html`](index.html) à la racine est un simple sommaire qui pointe vers
chaque jeu — ce n'est pas un jeu en soi.

## Arborescence

```
ruine/                  (dépôt = "JulGame")
├── index.html          Page d'accueil (liste des jeux)
├── README.md           Ce fichier
├── CLAUDE.md           Instructions générales du dépôt
├── ruines/              Jeu "Ruine"
├── hexdefense/         Jeu "Hex Défense"
├── geodash/             Jeu "GeoDash"
├── synergie/            Jeu "Synergie"
├── puissance4/          Jeu "Puissance 4" (solveur exact)
├── wave-idle/           Jeu "Wave // Ascension"
├── revision-anglais/    Outil "Révision Anglais"
└── pokedex/             Outil "Pokédex"
```
