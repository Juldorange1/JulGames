# Triade — version programme (Windows / Steam)

Le jeu reste le même (`../index.html` + `../js/`). Ce dossier l'emballe dans un vrai programme Windows avec
**Electron** (aucun navigateur à ouvrir).

## Commandes (dans `triade/desktop/`)

| Commande | Effet |
|---|---|
| `npm install` | installe Electron (une seule fois) |
| `npm start` | lance le jeu en programme (fenêtre) |
| `npm run start:muet` | idem, sans aucun son (tests) |
| `npm test` | auto-test invisible : chargement, sauvegarde fichier, bouton Quitter (affiche `TRIADE_TEST {...}`) |
| `npm run build` | fabrique `dist/win-unpacked/Triade.exe` (dossier pour Steam) et `dist/Triade-1.0.0-portable.exe` (un seul fichier, pour tester ou partager) |
| `npx electron make-icon.js` | refait `../icon.png` à partir du dessin des héros |

Les dossiers `node_modules/` et `dist/` ne sont jamais envoyés sur GitHub.

## Ce que fait le programme

- **Plein écran** au premier lancement ; **F11** ou **Alt+Entrée** pour basculer, ou *Paramètres > Affichage*.
- Bouton **Quitter le jeu** sur l'écran titre.
- **Sauvegarde dans un fichier** : `%APPDATA%\Triade\save\triade-save.json` (toutes les données du jeu :
  partie, Épreuve du jour, hauts faits, réglages). Écriture groupée et atomique.
- **Manette** : branchée, elle marche tout de suite (menus et combat). **Langues** : français, anglais.
- La version navigateur (GitHub Pages) continue d'utiliser le stockage du navigateur.

## Mise sur Steam (dans Steamworks)

1. Créer l'application (frais Steam Direct : 100 $ par jeu, remboursés après 1 000 $ de ventes).
2. **Dépôt Windows** : envoyer le **contenu** de `dist/win-unpacked/` (avec `Triade.exe`).
3. **Options de lancement** : exécutable `Triade.exe`, système Windows.
4. **Steam Cloud** (*Application > Steam Cloud > Auto-Cloud*) : racine `WinAppDataRoaming`,
   sous-dossier `Triade/save`, motif `*.json`, système Windows. Quota conseillé : 1 Mo, 10 fichiers.
5. **Steam Input** : le jeu lit la manette en mode « manette standard » ; activer la configuration
   par défaut « Manette » pour que toutes les manettes (PlayStation, Switch…) marchent.
6. Plus tard : succès Steam (les 45 hauts faits du jeu peuvent devenir des succès), avec le module
   `steamworks.js` dans `main.js` et l'AppID du jeu.

## Signature

`electron-builder` essaie de signer l'exe ; sans certificat, il n'est pas signé. Steam n'en a pas besoin.
Windows SmartScreen peut avertir pour l'exe *portable* téléchargé hors de Steam.
