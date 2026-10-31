# Panthéa — version Steam

## Classement mondial du défi du jour (préparé, pas encore branché)

Le jeu est prêt : dès que le programme sait parler aux classements Steam, un bouton
**🌐 Classement mondial** apparaît dans le cadre du défi du jour, et chaque score du jour est envoyé
(Steam garde le meilleur de chaque joueur). Sans Steam, rien ne change : le bouton reste caché.

### Comment c'est câblé

- `preload.js` donne au jeu `window.pantheaSteam` : `ready()`, `submit(board, score)`, `top(board, n)`.
- `main.js` charge **`steam-lb.js`** s'il existe (sinon le classement est coupé).
- Un classement par jour : `defi-AAAA-MM-JJ` (ex. `defi-2026-10-31`), score numérique, **le plus haut en premier**,
  méthode **KeepBest**.

### Ce qu'il reste à faire pour la sortie sur Steam

1. Avoir l'**App ID** du jeu (Steamworks → ton jeu) et le mettre dans `steam_appid.txt` à côté de `Panthea.exe`
   pour les tests.
2. Choisir une bibliothèque Node pour Steam **qui gère les classements**. `steamworks.js` (la plus connue)
   ne les gère pas pour l'instant ; des choix possibles : `steamworks-ffi-node`, `ez-steam-api`
   (utilisé dans un jeu Electron publié), ou un petit module natif maison sur le SDK Steamworks.
3. Écrire `desktop/steam-lb.js` (une vingtaine de lignes) qui exporte :
   ```js
   module.exports = {
     ready() { /* true si Steam est lancé */ },
     async submit(board, score) { /* FindOrCreateLeaderboard(board, descendant, numérique) puis UploadLeaderboardScore(KeepBest) */ },
     async top(board, n) { /* DownloadLeaderboardEntries(Global, 1, n) → [{ name, score }] */ },
   };
   ```
4. Ajouter la bibliothèque choisie dans `package.json` (dépendance) et refaire `npm run build`.

Les classements quotidiens se créent tout seuls au premier score (FindOrCreateLeaderboard) : rien à créer à la main
dans Steamworks.
