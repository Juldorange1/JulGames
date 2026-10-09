# Fracas — repères pour Claude (attentes de l'utilisateur)

À lire avant toute modification du jeu. Ce fichier résume comment l'utilisateur travaille, ce qu'il
attend du jeu, et les pièges techniques déjà rencontrés.

## 1. Comment travailler avec l'utilisateur

- **Toujours répondre en français.** L'utilisateur ne parle pas anglais.
- Il envoie des **listes de changements denses, en une phrase**, souvent avec des fautes de frappe
  (ex : « sich » = switch, « lesse » = laisse). Il faut **interpréter et implémenter directement tout
  ce qui est demandé**, sans poser de questions ni proposer d'options. Pas de simplification.
- Après chaque série : **vérifier dans le navigateur** (voir §5), puis faire un **compte rendu court en
  français** : un point par demande, avec les valeurs chiffrées importantes.
- Terminer chaque compte rendu par les liens :
  - local : http://localhost:5589 (serveur `fracas` dans `.claude/launch.json`, à la racine du dépôt)
  - en ligne : https://juldorange1.github.io/JulGames/ (il transmet ce lien à d'autres IA)
- **La version en ligne n'est à jour qu'après un push GitHub.** Pousser rend le contenu public, donc il faut
  **demander l'accord à chaque fois** (« Dis-moi si je dois mettre à jour GitHub »). Quand il dit oui :
  ne stager que `fracas/` (les autres dossiers du dépôt, comme `adofai/`, `riposte/` ou
  `minecraft-vagues-argent/`, ne sont pas à toi), faire un commit en français, pousser sur `main`,
  puis vérifier que GitHub Pages sert bien la nouvelle version.
- Dépôt : `Juldorange1/JulGames` (dossier local `ruine`, nom historique). JulGame = page d'accueil
  qui liste tous les jeux ; **Fracas ne doit jamais dépendre d'un autre jeu du dépôt**.

## 2. Ce qu'est le jeu

Action 2D en **vue strictement du dessus**, en HTML/Canvas/JS pur (aucune dépendance ni build).
Il s'ouvre en `file://` et tourne aussi en « application bureau » (raccourci qui lance Chrome/Edge en
mode `--app` sur `index.html`) : toute modification vaut donc pour les deux versions.

- **Pas de PV** : chaque coup reçu baisse le `damageMultiplier` du joueur (jamais sous 5 %).
  Moins de multiplicateur = moins de dégâts infligés.
- **Base (hub)** : carte explorable faite de cases. Ses « portails » mènent à :
  - Monde (expédition) ;
  - Défi (en haut à droite) ;
  - CODEX (en bas à gauche) ;
  - FONCTIONNALITÉS (Marché + Paramètres, en bas à droite).

  On y achète des cases, des trampolines ou des boosts, et on peut retirer une case contre remboursement.
- **Monde** : 3 parties de 10 salles, la 10e est un boss. Chaque partie débloque une compétence
  (partie 1 = compétence 1, etc.) sur une touche unique. Salles de taille fixe, zoomées plein écran ;
  la caméra ne suit jamais le joueur dans le Monde.
- **Défis** : 10 défis officiels (un par personnage de combat), chacun en 3 salles de 1000×650 avec
  une compétence différente autorisée par salle et un boss éventuel en salle 3. Vitesse propre à
  chaque défi. Difficulté homogène grâce à un budget de menace. Un défi réussi rapporte 0,05 € et
  un record de temps.
- **Parcours** : P1 à P8, deux par personnage de parcours. Aucun ennemi : piques, lasers,
  tourelles-pièges, vent, trampolines, téléporteurs, boosts. Un coup reçu baisse la **vitesse**.
- **Éditeur de défis dans la carte** : carte vide au départ, placement et suppression d'éléments.
  Les défis perso donnent un record mais pas d'argent.
- **Codex** : onglets Personnages / Parcours / Tourelles / Boss / Éléments / Règles. Chaque fiche a
  une scène animée et des statistiques chiffrées. Records et argent sont affichés sur chaque fiche
  personnage.

### Personnages de combat (ids 1–11, **le 4 = Braise a été supprimé**)
1 Colt (pistolet en orbite, tir auto, balles qui ricochent 3 fois) · 2 Nyx (pose des trampolines ;
atterrir sur n'importe quel trampoline = 4 tirs en croix) · 3 Kip (boomerang) · 5 Ferro (2 couteaux
dos à dos qui rebondissent) · 6 Cendre (météorite chargée, laisse une zone de feu qui brûle aussi
Cendre) · 7 Echo (frappe automatique à sa position d'il y a 3 s) · 8 Vex (attraction
gravitationnelle) · 9 Croc (4 lasers de feu par seconde ; l'attaque bascule croix ↔ diagonales ;
dégâts selon la proximité) · 10 Gemini (deux orbes) · 11 Zephyr (blocs de vent).

### Personnages de parcours (ids 12–15, `parkourOnly`, 2 compétences chacun)
12 Orbis (téléportation sur ses orbes) · 13 Trait (dash chargé) · 14 Janus (téléporteurs + vent
perso) · 15 Elan (bond qui alterne haut/bas + sol glissant rapide).

## 3. Goûts et exigences de l'utilisateur (à respecter sans qu'il le redise)

- **Menus compacts** : peu de texte, bien rangés, **aucun défilement**. Les grilles s'adaptent à la
  place (`UI.fitTiles`), avec de grandes images et sans descriptions dans le choix du personnage.
- **Vue strictement du dessus.** Il a refusé les falaises « 3D » sous les îles flottantes. Les bords
  d'île sont des éclats de roche et de terre avec des morceaux qui tombent, et le ciel se fond dans
  le décor.
- **Visuel soigné et lisible** : sols texturés discrets, effets riches pour les boss (tremblements,
  gros lasers, météores). Les projectiles ennemis ont des apparences variées.
- **Sons cohérents et « réalistes »** avec l'action (synthèse dans `audio.js`).
- **Un seul curseur**, le même partout (DOM `#fx-cursor`) ; le curseur système est masqué.
- Quand un personnage change, **tout mettre à jour** :
  - la logique ;
  - les libellés FR et EN (`i18n.js`, `CHAR_I18N`) ;
  - les statistiques du Codex (`codex_data.js`, qui lit les constantes) ;
  - la scène animée (`showcase.js`).
- Les rééquilibrages sont des **multiplicateurs lisibles dans le code**, accompagnés d'un commentaire
  (ex : `27 * 0.7 * 1.4 // -30% puis +40%`). Garder ce style pour qu'un « +15 % » soit facile à
  retrouver.
- Il aime la variété, par exemple les murs mobiles (`movingwalls.js`) qui ont 10 types de trajectoires.

## 4. Architecture (scripts globaux, ordre dans `index.html`)

constants, utils, input, save, i18n, audio, particles, entities, combat, collision, player,
characters, parkour_chars, turrets, bosses, bossfx, rooms, movingwalls, expedition, challenges,
parkour, hub, floor, island, render, showcase, editor, codex_data, ui, game, main.

- Personnage : `CHARACTERS[id] = { init, update(world,player,dt,realDt), onAttackPress,
  onAttackHeld(world,player,dt,down), onAttackRelease, ability1..3 / ability1Held.., draw }`.
- Salles : `world.room = { bounds, obstacles, terrainZones, parkour }` ; ennemis dans
  `world.enemies` ; zones dans `world.zones` (`makeZone`, `terrainType` 'damage'/'ice'/…).
- Tirs du joueur : `spawnPlayerProjectile(world, player, {…, maxBounces, bounceGrowth, dmgCap})`.
- Dégâts : `damageEnemy(world, e, amount, player)` (multiplié par `damageMultiplier`) ;
  `playerApplyDamage(player, raw)`.
- Sauvegarde : `localStorage` via `Save`.

## 5. Pièges déjà rencontrés

- **Une apostrophe dans une chaîne `'...'`** (par ex. `qu'il`) casse tout le jeu. Écrire `\'` ou
  reformuler, et lancer `node --check js/*.js` après chaque modification.
- **Cache du navigateur** : le serveur local sert souvent du JS périmé. Avant de tester :
  `await Promise.all([...document.scripts].map(s => fetch(s.src, {cache:'reload'})))` puis recharger.
- **La boucle `requestAnimationFrame` est souvent gelée** dans le panneau navigateur. Pour tester,
  piloter à la main avec `Game.update(1/60)` puis `Game.render(performance.now())`, et envoyer un
  événement `resize` après le chargement.
- `onAttackPress` est rappelé **à chaque frame** tant que la touche est maintenue. Pour une
  bascule, utiliser le front montant dans `onAttackHeld` (mémoriser `prevDown`).
- **Les ids ne sont jamais renumérotés** : les records sont sauvegardés sous `challenge${id}`.
  L'affichage passe par `challengeNumber(def)`, et `getCharacter` renvoie Colt pour un id disparu.
- Le hub est sauvegardé : incrémenter `HUB_LAYOUT_VERSION` (hub.js) quand la disposition par défaut
  change. Pour les portes, prévoir une migration dans `Save.load`.
- Parcours générés par graine : incrémenter `PARKOUR_VERSION` si la génération change, ce qui
  réinitialise les records P*.
- Tout contrôle de foule doit rester raisonnable : l'utilisateur rééquilibre souvent Nyx, Vex, etc.
