# Fracas — version programme (Windows / Steam)

Le jeu reste le même (`../index.html` + `../js/`). Ce dossier l'emballe dans un vrai programme
Windows avec **Electron**.

## Commandes (dans `fracas/desktop/`)

| Commande | Effet |
|---|---|
| `npm install` | installe Electron (une seule fois, environ 150 Mo) |
| `npm start` | lance le jeu en programme (fenêtre) |
| `npm run start:muet` | idem, sans aucun son (tests) |
| `npx electron . --test` | auto-test invisible : chargement, sauvegarde fichier, menus (affiche `FRACAS_TEST {...}`) |
| `npm run build` | fabrique `dist/win-unpacked/Fracas.exe` (dossier pour Steam) et `dist/Fracas-1.0.0-portable.exe` (un seul fichier, pour tester ou partager) |

Les dossiers `node_modules/` et `dist/` ne sont jamais envoyés sur GitHub.

## Ce que fait le programme

- **Plein écran** au premier lancement. On bascule avec **F11** ou **Alt+Entrée**, ou dans
  *Fonctionnalités > Paramètres > Affichage*. Tailles de fenêtre proposées : 1280×720, 1600×900, 1920×1080.
- Bouton **Quitter le jeu** sur l'écran de choix de version.
- **Sauvegarde dans un fichier** : `%APPDATA%\Fracas\save\fracas-save.json`.
  L'écriture est groupée et atomique (fichier temporaire puis renommage), donc une coupure ne
  corrompt pas la sauvegarde.
- Les réglages d'affichage sont dans `%APPDATA%\Fracas\display.json`. Ils sont propres à chaque
  PC et **ne sont pas** envoyés dans le Cloud.
- La version navigateur (GitHub Pages) continue d'utiliser le stockage du navigateur.

## Mise sur Steam (à faire dans Steamworks)

1. **Dépôt (depot) Windows** : envoyer le **contenu** de `dist/win-unpacked/`, qui contient
   `Fracas.exe`. Pas besoin d'installateur : Steam installe lui-même les fichiers.
2. **Options de lancement** : exécutable `Fracas.exe`, système Windows.
3. **Steam Cloud** (*Application > Steam Cloud > Auto-Cloud*) : ajouter un chemin racine.
   - Racine : `WinAppDataRoaming`
   - Sous-dossier : `Fracas/save`
   - Motif : `*.json`
   - Système : Windows

   Le quota conseillé est d'environ 1 Mo et 10 fichiers ; la sauvegarde fait quelques Ko.
4. Plus tard (succès, overlay Steam, Steam Input, salons en ligne Steam) : ajouter le module
   `steamworks.js` dans `main.js` avec l'AppID du jeu.

## Signature

`electron-builder` essaie de signer l'exe avec `signtool` ; sans certificat, l'exe n'est pas
signé. Steam n'exige pas de signature. Windows SmartScreen peut avertir pour l'exe *portable*
téléchargé hors de Steam.
