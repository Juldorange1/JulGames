# Solveur Connect 4 (tiers)

Fichiers repris tels quels depuis :
- Algorithme et donnees d'ouverture : [Connect 4 Game Solver](https://github.com/PascalPons/connect4) par Pascal Pons
- Binaire WebAssembly compile + livre d'ouverture pret a l'emploi : [connect4-solver](https://github.com/Khoding/connect4-solver) par Khoding

## Fichiers
- `c4solver.js` / `c4solver.wasm` : solveur compile en WebAssembly (C++ via Emscripten)
- `7x6.book` : livre d'ouverture precalcule (33 Mo), charge au demarrage du jeu

## Licence

Ces fichiers sont sous licence **GNU Affero General Public License v3.0** (voir `LICENSE`
dans ce dossier). L'AGPL-3.0 impose que le code source de toute application qui integre
ce composant (y compris via un service reseau) soit rendu disponible sous la meme licence.
Cela concerne au minimum le jeu `puissance4/` de ce depot.

Aucune modification n'a ete apportee a ces fichiers.
