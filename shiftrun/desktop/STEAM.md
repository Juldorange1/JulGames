# Shiftrun — version programme et Steam

## Lancer et fabriquer le programme

```
cd shiftrun/desktop
npm install
npm start            (le jeu dans sa fenêtre ; F11 = plein écran)
npm test             (auto-test sans fenêtre)
npm run vitrine      (fabrique images, icônes de succès et bande-annonce dans desktop/vitrine/)
npm run build        (Shiftrun.exe dans desktop/dist/ : dossier + version portable)
```

Le jeu marche entièrement hors ligne (police embarquée, musiques et bruitages fabriqués par le jeu).

## Ce qui est déjà branché

| Fonction Steam | État | Comment |
|---|---|---|
| **Succès** | ✅ prêt | Chaque rang de succès (20 familles × 5 rangs = 100) débloque le succès Steam `famille_rang` (ex. `niveaux_3`). La liste complète (noms, descriptions, icônes) est dans `vitrine/succes.csv` et `vitrine/succes-*.jpg`. |
| **Sauvegarde dans le cloud** | ✅ prêt | La sauvegarde est écrite dans le Steam Cloud (`sauvegarde.json`) quelques secondes après chaque modification ; au lancement, la plus récente est reprise. Activer « Steam Cloud » dans Steamworks (quota : 1 Mo, 1 fichier). |
| **Superposition Steam** | ✅ prêt | `electronEnableSteamOverlay()`. |
| **Manette Steam** | ✅ | Le jeu lit les manettes (API Gamepad) ; raccourcis réglables dans le jeu. |
| **Classements mondiaux + fantômes** | ⏳ préparé | Voir plus bas. |

Steam n'est utilisé que si le programme trouve l'**App ID** : fichier `steam_appid.txt` (un seul nombre) à côté de
`Shiftrun.exe` ou dans `desktop/`, ou variable d'environnement `SHIFTRUN_APPID`. Sans App ID ou sans Steam lancé,
le jeu marche normalement (sans succès Steam ni cloud).

## Classements mondiaux par niveau, avec fantômes (préparé)

Le jeu est prêt : à la fin d'un niveau, si les classements répondent, le temps est envoyé avec le **fantôme**
(les entrées compressées, quelques centaines de caractères) et un bouton **🌐 Classement mondial** montre les
10 meilleurs avec un bouton **▶ fantôme** pour revoir leur course.

`steamworks.js` ne gère pas encore les classements : il faut une bibliothèque qui les gère
(`steamworks-ffi-node`, `ez-steam-api`, ou un petit module natif sur le SDK Steamworks), puis copier
`steam-lb.exemple.js` en **`steam-lb.js`** et le compléter. Un classement par niveau : `niveau-1-1`, `niveau-1-2`…
(plus petit = meilleur, méthode **KeepBest**, le fantôme en « détails » ou en contenu attaché UGC).

## À faire de ton côté (administratif)

1. Créer le compte Steamworks et payer le Steam Direct (100 $), récupérer l'App ID.
2. Dans Steamworks : créer les 100 succès avec `vitrine/succes.csv` (+ icônes), activer le Cloud.
3. Mettre en ligne la page avec les images de `vitrine/` (en-tête, capsules, captures, bande-annonce).
4. Envoyer le dossier `desktop/dist/win-unpacked/` comme dépôt (SteamPipe).
