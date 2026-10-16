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

## 2. Ce qu'est le jeu (ATTENTION : structure refaite le 2026-10-13, voir §15 — le mode classique, le Monde et la base personnalisable n'existent plus)

Action 2D en **vue strictement du dessus**, en HTML/Canvas/JS pur (aucune dépendance ni build).
Il s'ouvre en `file://` et tourne aussi en « application bureau » (raccourci qui lance Chrome/Edge en
mode `--app` sur `index.html`) : toute modification vaut donc pour les deux versions.

- **Pas de PV** : chaque coup reçu baisse le `damageMultiplier` du joueur (jamais sous 5 %).
  Moins de multiplicateur = moins de dégâts infligés.
- **Base (hub)** : carte explorable faite de cases. Ses « portails » mènent à :
  - Monde (expédition) ;
  - CODEX (en bas à gauche) ;
  - FONCTIONNALITÉS (Marché + Paramètres, en bas à droite).

  On y achète des cases, des trampolines ou des boosts, et on peut retirer une case contre remboursement.
- **Monde** : 3 parties de 10 salles, la 10e est un boss. Chaque partie débloque une compétence
  (partie 1 = compétence 1, etc.) sur une touche unique. Salles de taille fixe, zoomées plein écran ;
  la caméra ne suit jamais le joueur dans le Monde.
- **Défis, défi du jour, défis coop en ligne, parcours, éditeur : SUPPRIMÉS** (ne pas les réintroduire).
- **Codex** : onglets Personnages / Parcours / Tourelles / Boss / Éléments / Règles. Chaque fiche a
  une scène animée et des statistiques chiffrées. Records et argent sont affichés sur chaque fiche
  personnage.

### Personnages de combat (ids 1–11, **le 4 = Braise a été supprimé**) — RENOMMÉS le 2026-10-13
1 Volte (ex-Colt : pistolet en orbite, tir auto, échange de place) · 2 Rebond (ex-Nyx : trampolines,
atterrissage = 4 tirs en croix) · 3 Retour (ex-Kip : boomerang) · 5 Ricochet (ex-Ferro : 2 lames
rebondissantes) · 6 Cendre (météorite, sol en feu) · 7 Echo (frappe à sa position d'il y a 3 s) ·
8 Vortex (ex-Vex : attraction) · 9 Brasier (ex-Croc : 4 lasers de feu par seconde) · 10 Gémeaux
(ex-Gemini : deux orbes) · 11 Zephyr (blocs de vent). Mêmes noms dans toutes les langues.
Boss B6 « Le Noyau » (ex-Le Centre). Portail « Atelier » (ex-Fonctionnalités).

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

## 6. Versions, portes de sortie (2026-10-12)

- **Au lancement : choix de version** (`STATE.LAUNCHER`, `renderLauncher` dans `js/infinite.js`).
  On peut aussi passer `?classique` ou `?infini` dans l'adresse. Depuis la base, un bouton en haut
  a gauche permet de revenir au choix.
- **Porte de sortie** (`js/exitdoor.js`) : les salles ne s'enchainent plus automatiquement.
  La porte est au milieu du bord droit, fermee tant qu'il reste des ennemis. On la traverse pour
  passer a la salle suivante. C'est le cas dans le Monde, les defis, la coop en ligne et
  l'Infini. Exceptions : la derniere salle d'un defi et la salle 30 du Monde se terminent
  directement. Les obstacles, tourelles et murs mobiles evitent la zone devant la porte.
- **Fracas Infini** (`js/infinite.js`) : pas de base, une partie sans fin.
  - Sauvegarde dans `Save.data.infinite` : run, ameliorations, vitesse, record.
  - Difficulte qui monte avec la profondeur, boss toutes les 10 salles.
  - Argent gagne a chaque salle videe (meme porte-monnaie que la version classique).
  - Marchand accessible A TOUT MOMENT depuis un menu : touche B (`Keybinds.shop`), menu pause
    ou menu Infini. Il n'y a plus de salles de marchand. Ameliorations : gain d'argent, degats
    (`player.dmgBonus`), resistance (`player.resist`), prix x1,6 a chaque achat. Reglage gratuit
    de la vitesse du jeu.
  - 1 chance sur 15 de changer de perso au hasard en entrant dans une salle.
  - Les parties du Monde alternent (1, 2, 3, 1...) toutes les 10 salles. `world.abilityGate` = partie :
    une seule competence par perso, comme dans le Monde.
  - Plancher du % de degats en Infini : 40 % (`INF_DMG_MIN`, `player.dmgMin`) ; la barre du HUD
    est vide a 40 %. AUCUN soin (`player.noHeal`) sauf en TRAVERSANT une porte : +5 %
    (`INF_ROOM_REGEN`), et la porte d'une salle de boss regenere entierement.
    Salle de boss : tomber a 40 % = boss perdu (`Infinite.bossFlees`) : il disparait, la porte
    s'ouvre, la salle ne rapporte AUCUN argent.
  - Vitesse du jeu et PUISSANCE DES ENNEMIS (`run.speed`, `run.power`, 50 a 300 %) se reglent
    UNIQUEMENT a la fin d'un boss, sur l'ecran bonus/malus (`InfiniteUI.buildBossSettings`).
    La puissance multiplie PV et degats des ennemis (`world.enemyPower`) et l'argent gagne
    (150 % = +50 % d'€). Plus de vitesse chez le marchand.
  - Pas de chrono ni de record : seulement les stats de la partie en cours. On peut supprimer la
    partie en cours ou tout reinitialiser depuis le menu Infini (2e clic pour confirmer).
- La porte est une vraie porte (battants en bois, cadenas, piliers de pierre, panneau SORTIE) :
  l'utilisateur ne veut AUCUN effet laser ou lumineux.
- **Tests sans son** : toujours ouvrir le jeu avec `?muet`.

## 7. Grand menage + ajouts (2026-10-12, suite)

- **SUPPRIMES pour de bon** :
  - les defis de parcours (`parkour.js`, P1 a P8) ;
  - les persos de parcours (12 a 15, `parkour_chars.js`) ;
  - l'editeur de defis (`editor.js`, defis perso, `STATE.CHALLENGE_EDITOR`).
  Ce qui reste utile (trampolines, teleporteurs, boosts de la base, `distToSegment`,
  `roomSafeSpot`) est dans `js/roomobjects.js`, sous `room.props`. Ne pas les reintroduire.
- **Fracas Infini** : 3 EMPLACEMENTS de partie (`Save.data.infinite.slots`), chacun avec sa
  progression independante (argent `run.money`, ameliorations `run.upgrades`). Le marchand est
  UNIQUEMENT dans le menu pause. Plus de touche B, plus de marchand dans le menu Infini.
- **Musique** (`js/music.js`) : morceaux composes et sequences en WebAudio (menu, tutorial,
  part1/2/3, boss, arena, jingles victory/defeat), intensite dynamique (combat = batterie + lead).
  Le volume de la musique est separe (Parametres). Pour tester sans son : rendu en
  `OfflineAudioContext`. Effets ajoutes dans `audio.js` : uiClick/uiHover, purchase, denied,
  coins, doorOpen, doorPass, bounce, land, pickup, defeat.
- **Manette + tactile** (`js/controls.js`) : fusionnes dans `sampleLocalInput`. Navigation des
  menus a la manette (classe `.pad-focus`). Commandes tactiles `#touch-ui`. Message « tourne ton
  telephone » en portrait.
- **Tutoriel** (`js/tutorial.js`, `STATE.TUTORIAL`) : voir §8, passable (bouton, Echap ou
  Start). Il se lance au premier choix de version (`Save.data.tutorialDone`) et se rejoue depuis
  l'ecran de choix de version.


## 8. Bonus/malus, tutoriel complet, langues (2026-10-12, suite)

- **Bonus et malus** (`js/boons.js`) : a chaque changement de partie du Monde (et toutes les 10 salles
  en Infini), on choisit 1 bonus parmi 3 et 1 malus parmi 3. ⏳ = partie suivante seulement,
  ∞ = pour toujours, TRES faible (~1/5). AUCUNE rarete (pas de carte plus rare ni doree). Les murs
  mobiles ne sont PAS un malus. 15 bonus et 16 malus, bornes dans
  `BOON_CLAMP`. En Infini, aucun bonus de soin (tag `heal` exclu).
- **Tutoriel** (`js/tutorial.js`) : 8 etapes jouables (bouger, attaquer, competence, degats, zones,
  trampoline, murs mobiles, porte) puis 8 fiches d'explication (Monde, argent, bonus/malus, defis,
  base, Codex, Infini, en ligne). Toujours passable. Les instructions sont un bandeau compact en
  haut qui devient presque transparent quand le joueur, un ennemi ou l'objectif passe dessous
  (`Tutorial.boxCovers`) : elles ne doivent JAMAIS gener le jeu.
- **Musique** : une seule voix melodique a la fois (melodie OU arpege), sections A/B/pont, pression
  qui monte quand le % baisse ou contre un boss, musique etouffee (filtre + volume baisse) en pause,
  chez le marchand et pendant le choix bonus/malus.
- **Menus a icones** : chaque bouton/onglet a une icone pour etre compris sans lire.
- **13 langues** : fr et en dans `i18n.js` ; de, es, it, pt (Bresil), ru, uk, pl, tr, zh, ja, ko dans
  `js/lang/<code>.js` (`LANG_PACKS.<code> = { ui, chars, challenges, terrain, turrets, bosses }`),
  charges apres `i18n.js`. `S(cle)` cherche : pack de la langue -> FR/EN -> anglais -> francais.
  **Toute nouvelle cle de texte doit etre ajoutee en FR et EN dans `i18n.js`, et idealement dans
  les 11 packs** (sinon l'anglais s'affiche). Chaines entre guillemets doubles dans les packs.
  Les statistiques detaillees des fiches perso du Codex restent en francais.
  Langue par defaut = langue du navigateur (`detectLanguage`).

## 9. Degats et porte (2026-10-12, fin)

- **Tous les boss font 2x moins de degats** (`BOSS_DAMAGE_MULT` dans combat.js). Les degats des
  ennemis passent par `enemyHitPlayer(world, player, pct, fromBoss)` ; les tirs crees pendant la
  mise a jour d'un boss sont marques `fromBoss` (`BOSS_SCOPE` dans sim.js).
- **La porte de sortie a une vraie hitbox** (`exitColliders`, `roomSolids` dans exitdoor.js) :
  troncons de mur + piliers solides, battants fermes bloquants, battants ouverts plaques au mur.
  Joueurs et ennemis l'utilisent (resolvePlayerPosition, resolveEnemyObstacles).
- Tests reseau (`server/test/net_test.js`) : quelques verifications echouent au hasard d'un
  lancement a l'autre (timing) ; relancer avant de conclure a une regression.

## 10. Suppression des defis, son en pause, Cendre, boss final (2026-10-13)

- **TOUS les defis sont supprimes** : `challenges.js` n'existe plus, ni le portail Defi de la base
  (retire des sauvegardes via la liste `gone` de save.js), ni le defi du jour, ni le mode en ligne
  « Defi coop » (MP_MODES = versus1, versus2, foot, survivor). `Save.data.challenges` est efface.
- **Son reglable dans le menu pause** (Monde et Infini) : `UI.soundControls()` (ON/OFF, effets,
  musique), partage avec les Parametres.
- **Cendre C2** : invisible 1 s (`CENDRE_INVISIBLE_TIME`, `player.invisibleTimer`) + 0,5 s
  d'invincibilite. `nearestPlayer` renvoie alors un « fantome » (`seenPlayer`) a l'endroit ou il a
  disparu : les ennemis tirent la.
- **On perd 2x moins de %** face aux ennemis et pieges (`PVE_LOSS_MULT = 0.5` dans combat.js,
  cumule avec `BOSS_DAMAGE_MULT`). Le PvP en ligne n'est pas touche. Le Codex affiche le % reel.
- **Infini** : toutes les parties aussi dures (`generateRoomLayout(part, index, { uniform: true })`,
  7 a 10 ennemis, plus de bonus de PV en partie 3, plus de montee avec la profondeur : seule la
  puissance choisie compte). Tous les boss ont les memes PV (`INF_BOSS_HP`) et rapportent pareil
  (x10). **Boss final B7 « Le Coeur du Fracas »** a la fin de chaque 3e partie
  (`Infinite.isFinalBoss`) : 2,6x les PV, rapporte x30, change d'aspect toutes les 7,5 s (5 s en
  phase 3) en reprenant les attaques des 6 boss (`updateBoss7`, etat propre a chaque aspect),
  salves dorees en phase 3, entree spectaculaire, barre de vie doree, musique 'final'.

## 11. Version programme (Electron) + reglages (2026-10-13, suite)

- **Version programme Windows / Steam** dans `desktop/` (Electron) : `npm start`, `npm run build`
  (-> `dist/win-unpacked/Fracas.exe` pour Steam + `dist/Fracas-1.0.0-portable.exe`),
  `npx electron . --test` (auto-test invisible, sauvegarde jetable). Mode d'emploi : `desktop/STEAM.md`.
  Le jeu est copie dans `resources/game` au build : **reconstruire apres chaque modif du jeu**.
  `node_modules/` et `dist/` ne vont jamais sur GitHub (`desktop/.gitignore`).
- Dans le programme : `window.fracasNative` (preload.js) -> sauvegarde dans un FICHIER
  `%APPDATA%/Fracas/save/fracas-save.json` (Steam Cloud), plein ecran (F11 / Alt+Entree /
  Parametres > Affichage), tailles de fenetre, bouton QUITTER LE JEU. `NATIVE` (save.js) est null
  dans le navigateur : la version web garde localStorage.
- Cendre : C2 = invisible + invincible 2 s ; attaque rechargee en 1 s (`CENDRE_ATTACK_CD`).
- Infini : regeneration par porte x2,5 (+12,5 %) ; MARCHAND seulement a la fin des boss (apres le
  choix bonus/malus, puis CONTINUER = salle suivante) ; plus dans le menu pause.
- Bonus/malus ∞ divises par 2 (~1/10 de l'effet normal, affichage avec decimales).
- Boss : 650 PV de base MAXIMUM (`BOSS_BASE_HP_MAX`) mais ils ne sont PAS tous egaux : les ecarts
  d'origine sont gardes (`BOSS_HP_SCALE`, B1 271 ... B6 650 ; B7 650). En Infini, le boss final a
  x2 PV (`INF_FINAL_HP_MULT`). Plus d'egalisation des PV des boss en Infini.

## 12. Finitions, image et son (2026-10-13, fin)

- **Icones dessinees** (`js/icons.js`) : jeu d'icones SVG (meme style) ; `Icons.watch(document.body)`
  remplace AUTOMATIQUEMENT tout emoji connu (`EMOJI_ICONS`) dans l'interface. On peut donc continuer
  a ecrire des emojis dans le code des menus : un nouvel emoji doit etre ajoute a `EMOJI_ICONS`
  (+ une icone dans `ICONS`). Balise `<fx-ico>`. Dans le HUD, utiliser `setTextOnce(el, txt)` (sinon
  les icones sont recreees a chaque image). Sur canvas : `Icons.draw(ctx, nom, couleur, x, y, taille)`.
- **Accessibilite** (Parametres) : tremblements 0/50/100 % (`Game.shakeCamera`), daltonisme
  (filtres SVG `#cb-protan/deutan/tritan` dans index.html, appliques au canvas et a l'interface),
  taille de l'interface 90-130 % (`zoom` de #overlay), tirs ennemis tres visibles.
  `Save.data.access`, `UI.applyAccess()`.
- **Vraies musiques** : `js/music_files.js` (`MUSIC_FILES`) + dossier `music/` (README) ; une piste
  ou deux couches base/combat melangees selon l'intensite ; fichier absent -> synthese.
- **Vrais sprites** : `js/sprites.js` (`SPRITE_FILES` char/turret/boss) + dossier `art/` (README =
  direction artistique + liste des images + tailles Steam) ; sans image -> dessin vectoriel.
- **Playtests** : `js/playtest.js` note salles/boss/bonus en local (`Save.data.playtest`), export dans
  Parametres > Test du jeu (programme : Documents/Fracas). Guide : `desktop/PLAYTEST.md`.
- **Relecture des traductions** : `node tools/translations.js export` -> `lang_review/<langue>.csv` ;
  `node tools/translations.js import <langue>` applique la colonne correction.

## 13. Mode assisté, pause, nouveaux bonus/malus, renommages (2026-10-13, fin)

- Boss : PV +30 % (`BOSS_HP_SCALE` ... * 1.3 ; B1 352 ... B6 845, B7 845). Dégâts subis +35 %
  (`PVE_LOSS_MULT = 0.5 * 1.35`, PvE seulement).
- **Mode assisté** (`js/assist.js`, `Save.data.assist`, ACTIVÉ par défaut, Paramètres >
  Accessibilité) : fiche du perso (portrait animé, conseil `charTip_<id>`, attaque + compétences,
  celle de la partie en vert) avant de le jouer (début de partie, changement de perso en Infini) ;
  le jeu est figé (`Assist.open`) jusqu'à JOUER / Entrée / Espace / Échap. Cartes « nouvel ennemi /
  nouveau boss » à la 1re rencontre, rappel de la compétence à chaque nouvelle partie.
- **Menu pause** (Monde et Infini) : boutons PARAMÈTRES et CODEX ouverts PAR-DESSUS la partie
  (`UI.openSub` / `UI.closeSub`, `UI.subMenu`) ; dans ces écrans, rafraîchir avec
  `this.goSettings()` / `this.goCodex()` (jamais `Game.setState(STATE.SETTINGS)`).
- **Bonus/malus qui changent la façon de jouer** (partie suivante seulement, `updateBoonEffects`,
  `drawBoonEffects`, `boonChainBlast` dans boons.js) : bulle de temps, explosions en chaîne,
  bouclier orbital, météorites alliées, trampolines en plus, pied léger / sol glissant, tempête,
  pluie de météorites, ennemis fantômes, visée tremblante, tirs à tête chercheuse (+ brouillard).

## 14. Codex complet, parametres, sons, HUD, decors, equilibrage (2026-10-13, fin)

- **Codex** : onglet « Bonus/Malus » (`renderBoonsBoard`) avec TOUS les effets (⏳ et ∞), sans
  defilement (2 colonnes par cote). Le Codex doit TOUT contenir : ajouter tout nouvel element.
- **Parametres** : titre PARAMETRES (plus « Atelier ») ; accessibilite compacte (1 bouton par
  reglage, un clic = valeur suivante) ; l'option « tirs ennemis tres visibles » est SUPPRIMEE ;
  « Test du jeu » n'apparait que dans une version de test (`?playtest` ou programme lance avec
  `--playtest`), et rien n'est note sinon (`Playtest.enabled()`).
- **Infini** : changement de perso au moins 5 salles, au plus 15 (`INF_SWAP_MIN_ROOMS/MAX`,
  `run.charRooms`), 1 chance sur 6 entre les deux.
- **Sons** : bus des effets filtre a 9 kHz + volume 0,85 ; Gemeaux = `Audio2.orbStrike()` (note
  pentatonique douce) ; echanges de place = `teleport()` ; spark/electric/gunshot adoucis.
- **HUD** : les panneaux deviennent transparents (`.see-through`) quand le joueur, un ennemi ou un
  tir ennemi passe dessous (`UI.hudSeeThrough`).
- **Decors** : plus rien qui ressemble a un element de jeu (plus de fissures/braises orange en
  partie 3, plus de bandes jaunes et noires en partie 2, tuyaux a plat, cailloux peu contrastes).
- **Gemeaux C2** : grosse 3e orbe (taille 28, orbite 120, 2x plus lente, 10 s) ; c'est ELLE seule
  qui detruit les tirs (plus de bouclier circulaire). C1 = orbes projetees au curseur.
- **Equilibrage des competences faibles** : Rebond C3 +1 s invincible, Retour C3 piste de glace
  vers la visee (+60 %), Ricochet C2 mur 150x40 10 s, Vortex C1 mine x2,5, Brasier C1 bouclier 2 s,
  Zephyr C3 vents puissants 4 s.
- **Bonus/malus ⏳** x1,5 (plafonds `BOON_CLAMP` releves).

## 15. NOUVELLE STRUCTURE (2026-10-13) : un seul mode, base fixe, defi du jour

- **Mode classique SUPPRIME** : plus de Monde/expedition (`expedition.js` supprime), plus de
  marche ni de base personnalisable, plus d'ecran de choix de version. Le jeu demarre sur le
  MENU PRINCIPAL (`STATE.INFINITE_MENU`, titre FRACAS) : 3 emplacements de partie + boutons Defi du
  jour, En ligne, Codex, Parametres, Tutoriel (+ Quitter dans le programme). Les regles ne sont
  plus ecrites dans ce menu : elles sont dans le Codex (onglet Regles : principle, run, regen,
  money, base, daily, controls). `Game.goToMenu()` = base si on y est, sinon menu principal.
- **BASE** (`STATE.MENU`, hub.js) : fixe (`hubLayout()`), atteinte apres le boss FINAL de la 3e
  partie (puis bonus/malus et marchand) : `Infinite.goBase`, `run.atBase`. Portails : REPARTIR
  (`Game.resumeFromBase` : 3 parties de plus, meme partie), defi du jour, en ligne, Codex,
  parametres ; bouton « Menu principal » (`Game.leaveBase`).
- **Regeneration** : +2 % par ennemi tue (`INF_KILL_REGEN`, `world.onEnemyKilled`), 100 % en
  finissant une salle de boss ; RIEN en passant une porte (on entre dans la salle du boss avec son %).
- **Defi du jour** (`js/daily.js`, `STATE.DAILY`) : 20 salles (2 parties du jour), tout est tire
  d'une graine de la date (`Daily.config`, `withSeed`) : parties, salles, 3 persos et salles de
  changement, cartes bonus/malus, et un EVENEMENT MAJEUR (`DAILY_EVENTS`, mods ajoutes a toute la
  partie via `Boons.bind(..., eventMods)`). Rejouable a volonte ; chrono ; record par jour
  (`Save.data.dailyRecords`) ; boss enfui = +30 s. Pas d'argent, pas de marchand. R = rejouer,
  Echap = retour, a l'ecran de fin. Moteur : `Infinite.startDaily`, `Infinite.daily`.
- **Codex Bonus/Malus** : seuls les effets deja rencontres (`Save.markBoonSeen`, a chaque offre
  et pour l'evenement du jour) ; les autres sont « ??? ». Ecriture agrandie.
