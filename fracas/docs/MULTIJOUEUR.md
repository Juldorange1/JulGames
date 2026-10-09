# Fracas — Architecture multijoueur en ligne

Ce document décrit l'analyse du code existant, l'architecture réseau retenue, les fichiers
concernés et le fonctionnement de chaque mode. Il sert de référence pour faire évoluer le
multijoueur (et, plus tard, l'intégrer à Steam).

---------------------------------------------------------------------------------------------------

## 1. Analyse du code existant (avant le réseau)

Fracas est un jeu en JavaScript pur, découpé en scripts globaux chargés par `index.html`.
La simulation et l'affichage sont mélangés dans les mêmes fichiers, mais **la logique de jeu
elle-même ne touche jamais au DOM**. C'est ce qui permet de la faire tourner côté serveur.

| Fichiers | Rôle | Dépend du navigateur ? |
|---|---|---|
| constants, utils, entities, combat, collision, player, characters, parkour_chars, turrets, bosses, bossfx, rooms, movingwalls, challenges, parkour | **Simulation** (+ fonctions `draw*`, jamais appelées côté serveur) | Non |
| particles, audio | Effets visuels et sonores | Oui (canvas / WebAudio) |
| save, i18n, ui, hub, editor, island, floor, render, showcase, game, main, input | Client : menus, sauvegarde, rendu, clavier/souris | Oui |

### 1.1 Ce qui ne marchait qu'avec UN joueur

- `world.player` est **unique**. Il est utilisé par les tourelles et les boss (visée,
  zones qui touchent le joueur), les collisions (tirs ennemis, contact), les pièges de parcours,
  les murs mobiles et `damageEnemy` (qui multipliait par les dégâts de `world.player`, quel que
  soit l'attaquant).
- `updatePlayer` lisait **directement le clavier et la souris** (`Input.*`). Nyx C2 et Croc C2
  aussi (`Input.moveVector()`).
- Les personnages frappent `world.enemies`. Un **adversaire humain** n'y figure jamais : aucune
  attaque ne pouvait toucher un autre joueur.
- Echo modifie la vitesse du temps **du monde entier** (`world.simSpeedBonus`).
- Les mines touchaient le joueur quelle que soit leur équipe : une mine de Vex pouvait blesser
  Vex. C'est corrigé.
- `Game` (boucle, caméra, états, HUD) est un singleton client.
- La génération des salles utilise `Math.random()` : deux machines obtiendraient des salles
  différentes.

### 1.2 Ce qui doit être synchronisé

Joueurs (position, pourcentage, cooldowns, état propre au personnage, invincibilité, saut…),
ennemis, boss, projectiles, zones, murs posés, boucliers, mines, vents, météores, dangers de boss,
murs et zones mobiles, trampolines et téléporteurs de salle, ballons, cristaux, zones de soin,
score, rounds, chronomètres, morts, réapparitions, résultats.

### 1.3 Ce qui est calculé par le SERVEUR (autorité)

**Tout le gameplay** :
- déplacements selon les règles de déplacement ;
- attaques, compétences, cooldowns ;
- projectiles, collisions, dégâts, pourcentages de dégâts et de vitesse ;
- morts, réapparitions ;
- ballons (possession, lancer, buts), cristaux ;
- zones, murs mobiles (génération et mouvement) ;
- rounds, tirage aléatoire des personnages, résultats.

Le serveur fait tourner **exactement le même code de simulation** que le jeu solo : pas de
réécriture, donc pas de simplification des personnages.

### 1.4 Ce qui reste côté CLIENT

- clavier/souris → envoi d'**intentions** (direction, visée, touches) ;
- rendu, interpolation, prédiction du déplacement local ;
- particules, sons, tremblements d'écran : rejoués à partir d'événements envoyés par le serveur ;
- menus, lobby, sauvegarde locale (Codex, records).

### 1.5 Sources de désynchronisation identifiées (et traitement)

| Risque | Traitement |
|---|---|
| `Math.random()` (salles, tirages, IA) | Tout est tiré **uniquement sur le serveur**. Les clients reçoivent le résultat. |
| `performance.now()` dans la logique | Utilisé seulement pour l'animation (dessin). |
| Temps variable entre machines | Le serveur avance à pas fixe (60 Hz). |
| Particules / sons | Capturés sur le serveur et renvoyés comme événements. |
| Etat interne des persos (boomerang, trampolines de Nyx, orbes…) | Sérialisé dans les snapshots (`player.state`). |
| Historique de position (Echo, Nyx C3) | Tenu par le serveur ; le client reconstruit le sien pour l'affichage. |

### 1.6 Refactorisations faites avant d'ajouter le réseau

1. **Plusieurs joueurs dans le monde** : `world.players[]` (le solo garde `world.player`), plus
   les aides `worldPlayers`, `nearestPlayer` et `ownerOf` (qui a tiré ce projectile ?).
2. **Entrées abstraites** : `player.input` (`sampleLocalInput()` en solo, messages réseau en ligne).
3. **Cibles hostiles** : `hostiles(world, owner)` (ennemis + joueurs adverses + cristal adverse).
   Chaque attaque passe par là, et chaque projectile, mine ou vent connaît son propriétaire.
4. **Boucle de simulation partagée** : `stepWorld()` (`js/sim.js`), utilisée par le solo ET le
   serveur.
5. Tourelles et boss visent le **joueur le plus proche** et leurs attaques de zone touchent
   **tous** les joueurs.

---------------------------------------------------------------------------------------------------

## 2. Architecture réseau

```
 ┌──────────── Client (navigateur / futur exécutable Steam) ─────────────┐
 │  Input → (seq, direction, visée, touches) ──────────────┐             │
 │  Prédiction du déplacement local + réconciliation       │             │
 │  Interpolation des autres entités (100 ms)              │             │
 │  Rendu (code existant) + particules/sons rejoués        │             │
 └──────────────────────────────▲──────────────────────────┼─────────────┘
                                │ snapshots delta 30 Hz    │ entrées 60 Hz
                                │ + événements             ▼
 ┌──────────────────────── Serveur de jeu (Node.js) ─────────────────────┐
 │ Transport (WebSocket aujourd'hui, Steam Networking demain)            │
 │ Sessions (id joueur abstrait + jeton de reconnexion)                   │
 │ Lobbys (créer / rejoindre / prêt / équipes / persos)                   │
 │ Matchs : 1 contexte isolé (vm) par partie, simulation 60 Hz            │
 │   = code de jeu Fracas + règles des modes (js/mp/mp_modes.js)          │
 └────────────────────────────────────────────────────────────────────────┘
```

- **Serveur autoritaire à pas fixe (60 Hz)**. Chaque partie tourne dans son **propre contexte
  JavaScript isolé** (`node:vm`). Les parties simultanées ne partagent donc aucune variable
  globale.
- **Le client n'envoie que des intentions** : direction (normalisée et bornée par le serveur),
  point visé, touches enfoncées et appuis. Il ne peut pas dire « j'ai touché », « je suis à
  100 % », « j'ai le ballon » ou « j'ai gagné » : ces messages n'existent pas dans le protocole.
- **Snapshots delta** 30 fois par seconde : seuls les champs modifiés sont envoyés. Un snapshot
  complet (« keyframe ») part à l'arrivée ou à la reconnexion d'un joueur. WebSocket est fiable
  et ordonné, donc chaque delta s'applique sur le précédent (numéro de séquence vérifié ; en cas
  de trou, le client redemande une keyframe).
- **Événements** : les appels `Particles.*`, `Audio2.*` et les tremblements d'écran faits pendant
  un tick sont enregistrés puis rejoués par les clients au bon moment.
- **Latence** :
  - prédiction du déplacement du joueur local, avec le même code de collision que le serveur ;
  - réconciliation avec rejeu des entrées non confirmées, puis lissage de l'erreur ;
  - interpolation des autres entités (tampon de 100 ms) ;
  - **compensation de latence « en faveur du tireur »** pour les effets instantanés : pendant
    le traitement des actions d'un joueur, le serveur replace les adversaires là où ce joueur les
    voyait (≤ 200 ms en arrière).
  - Les projectiles restent simulés en temps serveur (comportement standard).

### Pourquoi WebSocket (bibliothèque `ws`) sur Node.js

- Le jeu est en JavaScript : le serveur exécute **le même code** de gameplay. C'est la seule
  façon de garantir un résultat identique sans réécrire les 10 personnages.
- WebSocket fonctionne dans tous les navigateurs, derrière les pare-feux d'entreprise et avec
  TLS (`wss://`). C'est indispensable puisque le jeu est publié en HTTPS (GitHub Pages).
- `ws` est le serveur WebSocket de référence sur Node : maintenu, performant, sans dépendance.
- Les alternatives ont été écartées :
  - **Colyseus** impose son propre modèle d'état et le lie au gameplay, ce qui gêne le futur
    portage Steam ;
  - **WebRTC/UDP (geckos.io)** complique le NAT et le déploiement ;
  - **Socket.IO** ajoute un surcoût inutile.
- Le transport est **isolé derrière une interface** (`server/transport/`, `js/net/net_transport.js`).
  Steam Networking Sockets pourra le remplacer sans toucher au gameplay.

---------------------------------------------------------------------------------------------------

## 3. Fichiers

### Créés
| Fichier | Rôle |
|---|---|
| `js/sim.js` | `stepWorld()` : un pas de simulation (solo + serveur) |
| `js/mp/mp_modes.js` | Règles serveur des modes : Versus, Foot, Survivant, Coop (chargé dans la VM serveur) |
| `js/mp/mp_shared.js` | Constantes et aides partagées client/serveur (modes, équipes, sérialisation) |
| `js/net/net_config.js` | URL du serveur (dev / prod / réglage manuel) |
| `js/net/net_transport.js` | Transport WebSocket côté client (interface remplaçable) |
| `js/net/net_client.js` | Session, lobby, ping, réception des snapshots |
| `js/net/online_game.js` | Partie en ligne côté client : snapshots, interpolation, prédiction, rendu |
| `js/net/online_ui.js` | Écrans : menu En ligne, lobby, choix du perso, résultats |
| `server/package.json` | Dépendance `ws`, scripts |
| `server/index.js` | Point d'entrée : HTTP (santé) + WebSocket |
| `server/config.js` | Variables d'environnement |
| `server/transport/ws_transport.js` | Transport WebSocket (interface `Transport`) |
| `server/core/sim_context.js` | Charge le code de jeu dans un contexte `vm` isolé |
| `server/core/sessions.js` | Identité abstraite des joueurs + reconnexion |
| `server/core/lobbies.js` | Lobbys |
| `server/core/match.js` | Boucle de partie, entrées, snapshots, déconnexions |
| `server/core/snapshot.js` | Sérialisation + delta |
| `server/test/*.js` | Tests réseau avec de vrais clients WebSocket |
| `server/Dockerfile`, `server/.env.example` | Déploiement |

### Modifiés
`combat.js`, `collision.js`, `player.js`, `characters.js`, `turrets.js`, `bosses.js`,
`bossfx.js`, `parkour.js`, `movingwalls.js`, `entities.js`, `input.js`, `game.js`, `render.js`,
`ui.js`, `hub.js`, `save.js`, `i18n.js`, `index.html`, `style.css`.

---------------------------------------------------------------------------------------------------

## 4. Modes

| Mode | Joueurs | Règles |
|---|---|---|
| Versus 1v1 / 2v2 | 2 / 4 | 2 rounds. Cristal par équipe à 200 %. Pas de réapparition. Victoire du round : équipe adverse éliminée OU cristal adverse détruit. Round 2 : personnages échangés (tirage serveur en 2v2). |
| Foot 2v2 | 4 | 2 ballons au centre, 2 cages. Avec un ballon, l'attaque = lancer. % de vitesse au lieu de % de dégâts : mort à 40 %, réapparition à 100 % dans sa cage. Murs mobiles 2× plus fréquents. |
| Survivant | 4 | Chacun pour soi, pas de réapparition, dernier vivant gagne. Zones mobiles : rester 3 s = +15 % (peut dépasser 100 %). |
| Coop | 2 | Les défis normaux (pas les parcours, qui restent solo) à deux. |

Voir la section « Réglages » de `js/mp/mp_shared.js` pour toutes les valeurs.

---------------------------------------------------------------------------------------------------

## 5. Lancer / tester / déployer

Voir `server/README.md`.

## 6. Vers Steam

Voir la fin de `server/README.md`.
