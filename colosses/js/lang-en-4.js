'use strict';
/* Colosses — English translation, part 4: interface texts and the engine that applies the translation.
   Data (attacks, weapons, colossi…) is replaced when the game loads; interface and combat texts are translated
   when they are displayed (menus and canvas), with a cache. Paramètres → Jeu → Langue. */

// textes entiers (un nœud de texte ou une chaîne entière, sans rien autour)
LANG_EN.code = 'en';
LANG_EN.catAtk = { zone: ['Telegraphed zones', 'A zone fills up, then strikes.'], balles: ['Projectiles', 'Bullets, volleys and swarms.'], rayon: ['Beams', 'A thin line announces the beam.'], corps: ['Melee', 'Charges, leaps and blows from the colossus itself.'], terrain: ['Terrain', 'The ground changes: lava, frost, brambles…'], invoc: ['Summons', 'Creatures join the fight.'] };
LANG_EN.catNom = { p: 'Main weapons', s: 'Special attacks', t: 'Talents' };
LANG_EN.exact = {
  'Son': 'Sound', 'Image': 'Graphics', 'Jeu': 'Game', 'Touches': 'Controls', 'Haut': 'Up', 'Bas': 'Down', 'Gauche': 'Left', 'Droite': 'Right', 'Arme': 'Weapon', 'Spéciale': 'Special', 'Talent': 'Talent',
  'Spéciale (2e)': 'Special (2nd)', 'Talent (2e)': 'Talent (2nd)', 'Pause': 'Pause', 'Codex': 'Codex', 'Retour': 'Back', 'Musique': 'Music', 'Général': 'Master', 'Bruitages': 'Sound effects',
  'Bestiaire': 'Bestiary', 'Attaques': 'Attacks', 'Mutations': 'Mutations', 'Régions': 'Regions', 'Arènes': 'Arenas', 'Invocations': 'Summons', 'Arsenal': 'Arsenal', 'Légendaires': 'Legendaries',
  'Maîtrise': 'Mastery', 'Titres': 'Titles', 'Journal': 'Journal', 'JOUER': 'PLAY', 'Affinités': 'Affinities', 'Garde-robe': 'Wardrobe', 'Hauts faits': 'Achievements', 'Statistiques': 'Statistics',
  'Paramètres': 'Settings', 'Talents': 'Talents', 'Rapide': 'Fast', 'Propre': 'Clean', 'Parfait': 'Perfect', 'Vaincue': 'Defeated', 'Vaincu.': 'Defeated.', 'porté': 'worn', 'porter': 'wear',
  'test': 'test', 'Désactivé': 'Off', 'MORT': 'DEAD', 'DURÉE': 'TIME', 'Durée': 'Time', 'ESSAI': 'ATTEMPT', 'touché': 'hit', 'Raté': 'Missed', 'Protégé': 'Protected', 'Bloqué': 'Blocked',
  'Harponné': 'Harpooned', 'Légendaire': 'Legendary', 'Entraînement': 'Training', 'Espèces': 'Species', 'Luminosité': 'Brightness', 'Tremblements': 'Screen shake', 'Croix': 'Cross', 'Cercle': 'Circle', 'Point': 'Dot', 'Français': 'Français', 'English': 'English'
};
// morceaux de texte (du plus long au plus court) ; « # » = un nombre
LANG_EN.frag = [
  ['Voici ce que tu vas découvrir dans cette salle. Le combat ne commence que quand tu entres.', 'Here is what you will discover in this room. The fight only starts when you enter.'],
  ['Parfois, quand sa vie tombe à zéro, le colosse lance une dernière attaque spectaculaire, jamais deux fois la même. Il ne peut plus te tuer, mais chaque coup reçu compte pour les défis de maîtrise.', 'Sometimes, when its health drops to zero, the colossus unleashes one last spectacular attack, never the same twice. It can no longer kill you, but every hit you take counts for the mastery challenges.'],
  ['Après une mort, tu retrouves exactement le même colosse avec les mêmes armes. Bloqué ? ', 'After a death, you face exactly the same colossus with the same weapons. Stuck? '],
  [' puis « Passer ce boss » : le joker est commun aux 3 difficultés et revient après 3 boss vaincus.', ' then "Skip this boss": the joker is shared by all 3 difficulties and comes back after 3 bosses defeated.'],
  ['Déplace-toi avec ', 'Move with '], [', vise à la souris, maintiens ', ', aim with the mouse, hold '],
  [' pour tirer (garder le bouton donne toujours la meilleure cadence). ', ' to shoot (holding the button always gives the best fire rate). '],
  [' : attaque spéciale, ', ': special attack, '], [' : talent. Tout ce qui frappe est annoncé : une zone qui se remplit, une ligne fine, une onde avec un trou de ton côté.', ': talent. Everything that hits is telegraphed: a filling zone, a thin line, a wave with a gap on your side.'],
  ['Les cristaux se gagnent en battant des boss (#, ou # pour un méga boss). Ils servent seulement ici (rendre un type d\'arme plus fréquent) et dans la garde-robe (apparences). Paie des cristaux pour qu\'un type d\'arme tombe plus souvent (# niveaux, # affinités au plus par catégorie). La chance affichée est celle qu\'une arme tirée soit de ce type. Ça ne change jamais leur puissance.', 'Crystals are earned by defeating bosses (#, or # for a mega boss). They are only used here (making a weapon type more frequent) and in the wardrobe (cosmetics). Pay crystals so that a weapon type drops more often (# levels, at most # affinities per category). The chance shown is the chance that a drawn weapon is of this type. It never changes their power.'],
  ['Pas de serveur : donne ton code à un ami (message, mail…), il le colle dans son jeu, et vous comparez. Le code ne contient que tes scores et ton pseudo. Les défis du jour et de la semaine ne se comparent que s\'ils sont du même jour ou de la même semaine. En doré : le meilleur.', 'No server: give your code to a friend (message, email…), they paste it into their game, and you compare. The code only contains your scores and your nickname. Daily and weekly challenges only compare if they are from the same day or week. In gold: the best.'],
  ['Clique sur une apparence verrouillée pour acheter un de ses fragments. Les fragments tombent des boss (# %), des méga boss, des défis réussis et de la chasse. Les apparences légendaires viennent des boss légendaires.', 'Click a locked cosmetic to buy one of its fragments. Fragments drop from bosses (# %), mega bosses, completed challenges and the hunt. Legendary cosmetics come from legendary bosses.'],
  [' étoiles · ', ' stars · '], [' espèce(s) vaincue(s) sans être touché. Chaque défi réussi rapporte des cristaux, une seule fois. Les 5 défis d\'une espèce donnent son titre de « Fléau ».', ' species defeated without being hit. Each completed challenge gives crystals, only once. The 5 challenges of a species give its "Bane" title.'],
  [' titres. Clique sur un titre obtenu pour le porter : il s\'affiche sur l\'accueil.', ' titles. Click a title you have earned to wear it: it is shown on the home screen.'],
  ['Tous les 5 salles, on change de région : son décor, ses musiques et son piège.', 'Every 5 rooms, you change region: its scenery, its music and its trap.'],
  ['Parfois, rarement, un boss est LÉGENDAIRE : doré, plus coriace, il donne une apparence légendaire.', 'Sometimes, rarely, a boss is LEGENDARY: golden, tougher, it gives a legendary cosmetic.'],
  ['Rien n\'est audible ? Vérifie la sortie audio de Windows (ton casque doit être la sortie par défaut).', 'Nothing audible? Check the Windows audio output (your headset must be the default output).'],
  [' : stick gauche = bouger, stick droit = viser, gâchette droite = tirer, RB ou gâchette gauche = spéciale, A ou LB = talent, Start = pause. Dans les menus : croix ou stick = choisir, A = valider, B = retour. En coop, le joueur 2 joue à la manette.', ': left stick = move, right stick = aim, right trigger = shoot, RB or left trigger = special, A or LB = talent, Start = pause. In menus: D-pad or stick = choose, A = confirm, B = back. In co-op, player 2 plays with the controller.'], ['Manette', 'Controller'],
  ['Aucune manette détectée : branche-la puis appuie sur un bouton.', 'No controller detected: plug it in, then press a button.'], ['Manette détectée.', 'Controller detected.'],
  [' Clique sur une action puis appuie sur le bouton voulu (chaque action peut avoir 2 boutons : le 2e clic ajoute un bouton, le 3e remplace).', ' Click an action, then press the button you want (each action can have 2 buttons: the 2nd click adds a button, the 3rd replaces).'],
  ['Plus bas = le viseur tourne plus lentement et plus précisément. Déplacement : stick gauche ou croix (toujours).', 'Lower = the crosshair turns more slowly and precisely. Movement: left stick or D-pad (always).'],
  ['Sensibilité de la visée', 'Aim sensitivity'], ['Manette par défaut', 'Default controller'], ['… appuie sur un bouton', '… press a button'], ['Attaque spéciale', 'Special attack'], ['Tirer', 'Shoot'],
  ['A / Croix', 'A / Cross'], ['B / Rond', 'B / Circle'], ['X / Carré', 'X / Square'], ['Stick gauche (clic)', 'Left stick (click)'], ['Stick droit (clic)', 'Right stick (click)'], ['Croix ', 'D-pad '], ['Bouton central', 'Home button'],
  ['Réessayer', 'Retry'], ['Ralenti', 'Slow-mo'], ['Débloqué : ', 'Unlocked: '], ['Fragment au hasard', 'Random fragment'],
  ['Clique sur une case puis appuie sur une touche', 'Click a box, then press a key'], ['ou un bouton de la souris', 'or a mouse button'],
  ['(Échap : annuler). Les mêmes touches servent partout : parties, défis, Abysses, entraînement.', '(Esc: cancel). The same keys are used everywhere: runs, challenges, Abyss, training.'],
  ['Le boss et toi repartez à pleine vie, avec les mêmes armes · Échap — menu', 'You and the boss start again at full health, with the same weapons · Esc — menu'],
  ['Bats cette espèce en mode normal en moins de ', 'Beat this species in normal mode in under '], [' pour gagner des fragments d\'apparence.', ' to earn cosmetic fragments.'],
  ['Le joueur 2 joue à la manette (le joueur 1 au clavier et à la souris, ou avec une 2e manette)', 'Player 2 plays with a controller (player 1 with keyboard and mouse, or with a 2nd controller)'],
  ['Expliquer les nouveautés avant d\'entrer dans une salle (avec animations)', 'Explain new things before entering a room (with animations)'],
  ['Effets réduits (plus lisible : moins de fumée, de particules et de halos)', 'Reduced effects (more readable: less smoke, particles and glows)'],
  ['Rouge-vert (protanopie, deutéranopie) : dangers en bleu', 'Red-green (protanopia, deuteranopia): dangers in blue'], ['Bleu-jaune (tritanopie) : bleus en rose', 'Blue-yellow (tritanopia): blues in pink'],
  ['vaincue · rapide (moins de ', 'defeated · fast (under '], [') · propre (', ') · clean ('], [' coups ou moins) · en Cauchemar. Détails dans Hauts faits.', ' hits or fewer) · in Nightmare. Details in Achievements.'],
  ['Étoiles · part des combats gagnés · meilleur temps.', 'Stars · share of fights won · best time.'],
  ['Part des combats gagnés (victoires ÷ combats joués)', 'Share of fights won (victories ÷ fights played)'], ['Attaques du boss passées sans te toucher', 'Boss attacks that missed you'],
  ['Boss battus dès le premier essai', 'Bosses beaten on the first try'], ['Victoires sans prendre un seul coup', 'Victories without taking a single hit'], ['Durée moyenne d\'un combat gagné', 'Average length of a won fight'],
  ['Le plus de boss battus d\'affilée sans mourir', 'Most bosses beaten in a row without dying'], ['Ce qui te bat (part des défaites)', 'What beats you (share of defeats)'],
  ['La vaincre en difficulté Cauchemar', 'Defeat it in Nightmare difficulty'], ['La vaincre en moins de 1 min 30', 'Defeat it in under 1:30'], ['La vaincre en prenant 3 coups ou moins', 'Defeat it taking 3 hits or fewer'],
  ['La vaincre sans être touché une seule fois', 'Defeat it without being hit even once'], ['La vaincre une fois', 'Defeat it once'],
  ['Atteins la salle # pour la découvrir.', 'Reach room # to discover it.'], ['Pas encore rencontrée.', 'Not met yet.'], ['Pas encore rencontré.', 'Not met yet.'], ['Pas encore rencontrées.', 'Not met yet.'], ['Pas encore visitée.', 'Not visited yet.'],
  ['Jamais tirée au sort.', 'Never drawn.'], ['Seulement sur un boss légendaire', 'Only on a legendary boss'], ['Découvre des attaques spéciales en jouant.', 'Discover special attacks by playing.'], ['Découvre des talents en jouant.', 'Discover talents by playing.'],
  ['Découvre des armes en jouant : une famille apparaît ici dès que tu as croisé une de ses armes.', 'Discover weapons by playing: a family appears here as soon as you have come across one of its weapons.'],
  ['V (ou Y à la manette) : revoir la fin au ralenti', 'V (or Y on a controller): watch the end in slow motion'], ['RALENTI ×0,35 — les 3 dernières secondes', 'SLOW MOTION ×0.35 — the last 3 seconds'], ['V : arrêter · Espace : recommencer', 'V: stop · Space: restart'],
  ['Au bout des six régions…', 'At the end of the six regions…'], ['…le Souverain des Colosses t\'attend.', '…the Sovereign of the Colossi awaits you.'], ['Souverain des Colosses', 'Sovereign of the Colossi'],
  ['Un œuf ! Casse-le avant qu\'il éclose', 'An egg! Break it before it hatches'], ['Reflets ! Ne tire plus', 'Reflections! Stop shooting'], ['Les reliques se dissipent', 'The relics fade away'],
  ['Le boss et toi', 'You and the boss'], ['CE QUI T\'A FAIT LE PLUS MAL', 'WHAT HURT YOU THE MOST'], ['DERNIER SOUFFLE : rentre vers lui', 'LAST BREATH: move in towards it'], ['DERNIER SOUFFLE', 'LAST BREATH'],
  ['GRAND ENNEMI ABATTU', 'GREAT ENEMY FELLED'], ['ENNEMI ABATTU', 'ENEMY FELLED'], ['NOUVEAU RECORD', 'NEW RECORD'], ['SUCCÈS DÉBLOQUÉ', 'ACHIEVEMENT UNLOCKED'], ['ESPACE — recommencer', 'SPACE — restart'], ['ESPACE — réessayer', 'SPACE — try again'],
  ['LES ABYSSES', 'THE ABYSS'], ['DÉFI DU JOUR', 'DAILY CHALLENGE'], ['DÉFI DE LA SEMAINE', 'WEEKLY CHALLENGE'], ['TES DÉGÂTS', 'YOUR DAMAGE'], ['MÉGA BOSS du palier ', 'MEGA BOSS of tier '], ['Seigneur du palier — ', 'Lord of the tier — '],
  ['Méga boss dans ', 'Mega boss in '], ['Dernier coup : ', 'Final blow: '], ['Nouveau colosse : ', 'New colossus: '], ['Piège de la région : ', 'Region trap: '], [' Ses attaques fétiches : ', ' Signature attacks: '], [' Recharge : ', ' Cooldown: '],
  ['Nouveau titre : ', 'New title: '], ['Chasse : palier ', 'Hunt: tier '], ['Chasse : ', 'Hunt: '], ['Abysses · profondeur ', 'Abyss · depth '], ['Record : profondeur ', 'Record: depth '], ['Record : ', 'Record: '],
  ['boss sans fin, toujours plus fous · 1 vie', 'endless bosses, ever crazier · 1 life'], [' · en cours : profondeur ', ' · in progress: depth '], [' (reprendre)', ' (resume)'], [' · reprise : ', ' · restart: '], [' boss vaincus', ' bosses defeated'],
  ['Le joker de passage', 'The skip joker'], ['Passer ce boss (encore ', 'Skip this boss ('], [' boss, toutes difficultés)', ' more bosses, all difficulties)'], ['Passer ce boss', 'Skip this boss'], ['Recommencer le combat', 'Restart the fight'],
  ['Échap : reprendre · ta partie est gardée', 'Esc: resume · your run is saved'], ['Échap : reprendre', 'Esc: resume'], ['Échap : pause', 'Esc: pause'], ['Échap — menu', 'Esc — menu'],
  ['Menu principal', 'Main menu'], ['Quitter le jeu', 'Quit game'], ['Reprendre', 'Resume'], ['Entrer dans l\'arène', 'Enter the arena'], ['Avant d\'entrer', 'Before entering'], ['Comment survivre', 'How to survive'], ['Même boss', 'Same boss'],
  ['Coop à deux : oui · branche une manette', 'Two-player co-op: on · plug in a controller'], ['Coop à deux : oui', 'Two-player co-op: on'], ['Coop à deux : non', 'Two-player co-op: off'], ['Entre amis', 'With friends'],
  ['Ton pseudo', 'Your nickname'], ['Ton code de score', 'Your score code'], ['Code d\'un ami', 'A friend\'s code'], ['Colle ici le code COLOSSES-…', 'Paste the COLOSSES-… code here'], ['Copier le code', 'Copy the code'], ['Ajouter / mettre à jour', 'Add / update'],
  ['Pseudo enregistré.', 'Nickname saved.'], ['Code copié : colle-le dans un message à ton ami.', 'Code copied: paste it into a message to your friend.'], ['Code copié.', 'Code copied.'], ['Ce code n\'est pas valide (vérifie qu\'il est complet).', 'This code is not valid (check that it is complete).'], [' ajouté.', ' added.'], ['Code de ', 'Code from '],
  ['Enregistrer', 'Save'], ['Joueur', 'Player'], ['Boss vaincus', 'Bosses defeated'], ['code du ', 'code from '],
  ['Effets cinématiques (shaders)', 'Cinematic effects (shaders)'], ['Force des effets', 'Effect strength'], ['Halos lumineux', 'Light glows'], ['Brume et poussière', 'Mist and dust'], ['Mode daltonien', 'Colorblind mode'],
  ['Contour noir autour des balles ennemies', 'Black outline around enemy bullets'], ['Viseur du jeu', 'Game crosshair'], ['Curseur du système', 'System cursor'], ['Couleur du viseur', 'Crosshair colour'], ['Images par seconde', 'Frames per second'],
  ['Tir automatique', 'Auto fire'], ['Chiffres de dégâts', 'Damage numbers'], ['Nom des attaques du boss', 'Boss attack names'], ['Chronomètre', 'Timer'], ['Pause quand la fenêtre est quittée', 'Pause when the window loses focus'],
  ['Vitesse du jeu', 'Game speed'], ['(plus facile)', '(easier)'], ['Taille des menus', 'Menu size'], ['Plein écran', 'Fullscreen'], ['Revoir les explications', 'Show explanations again'], ['Touches par défaut', 'Default controls'], ['Tester le son', 'Test sound'],
  ['Langue / Language', 'Language / Langue'], ['Particules', 'Particles'], ['Viseur', 'Crosshair'],
  ['Armes principales', 'Main weapons'], ['Attaques spéciales', 'Special attacks'], ['Arme principale — familles', 'Main weapon — families'], ['Armes qui gagnent', 'Winning weapons'], ['Par difficulté', 'By difficulty'],
  ['Plus loin atteint', 'Furthest reached'], ['Victoire la plus rapide', 'Fastest victory'], ['Titre porté', 'Title worn'], ['Derniers combats gagnés', 'Latest fights won'], ['Changer de titre', 'Change title'],
  ['combats gagnés', 'fights won'], ['du premier coup', 'on the first try'], ['sans être touché', 'without being hit'], ['attaques esquivées', 'attacks dodged'], ['durée d\'une victoire', 'length of a victory'],
  ['meilleure série', 'best streak'], ['méga boss vaincus', 'mega bosses defeated'], ['défis réussis', 'challenges completed'], ['victoires sans être touché', 'victories without being hit'], ['boss vaincus', 'bosses defeated'],
  ['meilleur temps ', 'best time '], ['moins de coups ', 'fewest hits '], [' vaincu(s) · ', ' defeated · '], [' rencontre(s)', ' encounter(s)'], [' vaincu(s)', ' defeated'], [' colosses rencontrés.', ' colossi met.'], [' attaques découvertes.', ' attacks discovered.'],
  ['nouveau(x) titre(s)', 'new title(s)'], [' fragments', ' fragments'], [' fragment · ', ' fragment · '], ['Fragment au hasard', 'Random fragment'], ['Acheter · ', 'Buy · '], [' de chance (au lieu de ', ' chance (instead of '], [' de chance', ' chance'], ['Passe à ', 'Goes to '],
  ['2 affinités au plus par type', 'At most 2 affinities per type'], ['Retirer (les éclats ne sont pas rendus)', 'Remove (crystals are not refunded)'], ['Retirer', 'Remove'],
  [' · meilleur essai !', ' · best attempt!'], [' · meilleur : ', ' · best: '], [' gagnés', ' won'], [' retirés', ' removed'], [' absorbées', ' absorbed'], [' renvoyés', ' sent back'], ['palier ', 'tier '], [' · record salle ', ' · record room '], ['record salle ', 'record room '],
  ['combat parfait : ', 'perfect fight: '], [' à ', ' to '], ['revanche ×', 'rematch ×'], ['premier essai', 'first try'], ['tu progresses à chaque essai', 'you improve with every attempt'], ['encore ', 'still '], [' à ce rythme', ' at this pace'],
  ['Vie restaurée', 'Health restored'], ['Boss passé', 'Boss skipped'], ['Bouclier brisé !', 'Shield broken!'], ['Carapace brisée !', 'Carapace broken!'], ['La carapace repousse', 'The carapace grows back'], ['Les têtes repoussent', 'The heads grow back'],
  ['Le boss accélère !', 'The boss speeds up!'], ['Le vent tourne', 'The wind turns'], ['Il renaît plus fort !', 'It is reborn stronger!'], ['Plaque brisée !', 'Plate broken!'], ['Second souffle !', 'Second wind!'], ['Reflété !', 'Reflected!'],
  ['CONTRE !', 'COUNTER!'], ['PARADE !', 'PARRY!'], ['OUVERT !', 'OPEN!'], ['RELÂCHE !', 'RELEASE!'], ['MIDI !', 'NOON!'], ['Étourdi !', 'Stunned!'], ['Invincible', 'Invincible'], ['Prise ×', 'Catch ×'], ['Défi raté', 'Challenge failed'],
  ['Bourrasque ', 'Gust '], ['épuisé ×', 'exhausted ×'], ['J1 à terre', 'P1 down'], ['J2 à terre', 'P2 down'], ['RÉGION ', 'REGION '], ['Piège : ', 'Trap: '], ['Maîtrise · ', 'Mastery · '], [' cristaux gagnés', ' crystals earned'], [' · pression ', ' · pressure '], [' cristaux)', ' crystals)'], [' cristaux', ' crystals'], ['+½ cristal', '+½ crystal'], [' cristal', ' crystal'],
  ['la zone se remplit…', 'the zone fills up…'], ['sors-en avant qu\'elle frappe', 'leave it before it strikes'], ['rentre vers lui', 'move in towards it'], ['toutes les 5 salles', 'every 5 rooms'], ['même boss…', 'same boss…'], ['…mêmes attaques : apprends-les', '…same attacks: learn them'],
  ['affinités et apparences, jamais de puissance', 'affinities and cosmetics, never power'], ['casse ses cristaux d\'abord', 'break its crystals first'], ['bouclier brisé !', 'shield broken!'], ['×2,5 dans le dos', '×2.5 in the back'], ['×0,4 de face', '×0.4 from the front'],
  ['l\'armure absorbe : vise avec tes spéciales', 'the armor absorbs: use your specials'], ['carapace brisée !', 'carapace broken!'], ['il brille : arrête de tirer !', 'it shines: stop shooting!'], ['tire quand il ne brille pas', 'shoot when it does not shine'],
  ['tu le frappes…', 'you hit it…'], ['tu arrêtes 3 s : il se soigne', 'you stop for 3 s: it heals'], ['contour doré : ×2,2 !', 'golden outline: ×2.2!'], ['il attaque : ×0,5', 'it attacks: ×0.5'], ['moins il a de vie, plus il enchaîne', 'the less health, the faster it chains'],
  ['transparent : tes tirs passent', 'transparent: your shots pass through'], ['visible : tu le touches', 'visible: you hit it'], ['quitte la case qui brille', 'leave the glowing square'], ['la grille souffle : sors de la bande', 'the grate blows: leave the strip'],
  ['la vase ralentit, et des bulles de gaz éclatent', 'the mud slows you, and gas bubbles burst'], ['trois cercles, dont un sous toi', 'three circles, one under you'], ['une ligne fine annonce le rayon', 'a thin line announces the beam'], ['marche contre le vent', 'walk against the wind'],
  ['Arme : ', 'Weapon: '], ['Spéciale : ', 'Special: '], ['Talent : ', 'Talent: '], ['Trait : ', 'Trait: '], ['Région ', 'Region '], ['Dernier souffle', 'Last Breath'], ['Méga boss', 'Mega boss'], ['méga boss', 'mega boss'], ['boss légendaire', 'legendary boss'],
  [' légendaire', ' (legendary)'], ['Défi du jour', 'Daily challenge'], ['Défi de la semaine', 'Weekly challenge'], ['Abysses', 'Abyss'], ['Salles ', 'Rooms '], ['Salle ', 'Room '], [' salles', ' rooms'], ['salle ', 'room '], [' salle', ' room'], [' · méga', ' · mega'],
  ['profondeur ', 'depth '], ['prof. ', 'depth '], ['Phase ', 'Phase '], [' — phase ', ' — phase '], [' — méga boss', ' — mega boss'], ['Zones annoncées', 'Telegraphed zones'], ['Zones dangereuses', 'Dangerous zones'], ['Corps à corps', 'Melee'],
  ['Balles, salves et nuées.', 'Bullets, volleys and swarms.'], ['Charges, sauts et coups du colosse lui-même.', 'Charges, leaps and blows from the colossus itself.'], ['Des créatures rejoignent le combat.', 'Creatures join the fight.'],
  ['Le sol change : lave, givre, ronces…', 'The ground changes: lava, frost, brambles…'], ['Une ligne fine annonce le rayon.', 'A thin line announces the beam.'], ['Une zone se remplit, puis frappe.', 'A zone fills up, then strikes.'],
  ['Projectiles', 'Projectiles'], ['Rayons', 'Beams'], ['Terrain', 'Terrain'], ['Clic gauche', 'Left click'], ['Clic droit', 'Right click'], ['Clic molette', 'Middle click'], ['Clic G', 'L-click'], ['Clic D', 'R-click'], ['Molette', 'Wheel'],
  ['Espace', 'Space'], ['Maj droite', 'Right Shift'], ['Maj', 'Shift'], ['Ctrl droit', 'Right Ctrl'], ['Verr. maj', 'Caps Lock'], ['Entrée', 'Enter'], ['Échap', 'Esc'], ['Souris ', 'Mouse '], ['… appuie', '… press'],
  ['le Métronome', 'the Metronome'], ['la Sentinelle', 'the Sentinel'], ['l\'Hydre', 'the Hydra'], ['la Tisseuse', 'the Weaver'], ['le Spectre', 'the Specter'], ['le Forgeron', 'the Smith'], ['la Reine de l\'essaim', 'the Swarm Queen'],
  ['le Juge', 'the Judge'], ['l\'Horloger', 'the Clockmaker'], ['le Serpent', 'the Serpent'], ['la Nébuleuse', 'the Nebula'], ['le Bourreau', 'the Executioner'], ['le Phénix', 'the Phoenix'], ['la Chimère', 'the Chimera'], ['la Mante', 'the Mantis'], ['le Titan', 'the Titan'],
  ['Apprenti', 'Apprentice'], ['Guerrier', 'Warrior'], ['Cauchemar', 'Nightmare'], ['Novice', 'Novice'], ['Bane', 'Bane'], ['Fléau de la ', 'Bane of the '], ['Fléau du ', 'Bane of the '], ['Fléau de l’', 'Bane of the '], ['Fléau', 'Bane'], ['« Fléau »', '"Bane"']
];

// ---------- moteur ----------
const Langue = {
  en: false, L: LANG_EN, cache: new Map(), regles: [],
  preparer() {
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // un morceau qui commence ou finit par une lettre ne remplace qu'un mot entier (« Apprenti » ne touche pas « Apprentice »)
    this.regles = this.L.frag.slice().sort((a, b) => b[0].length - a[0].length).map(([fr, en]) => {
      let n = 0;
      let src = esc(fr).replace(/#/g, '(\\d+(?:[.,]\\d+)?)');
      if (/^\p{L}/u.test(fr)) src = '(?<!\\p{L})' + src;
      if (/\p{L}$/u.test(fr)) src = src + '(?!\\p{L})';
      const rep = en.replace(/\$/g, '$$$$').replace(/#/g, () => '$' + (++n));
      return { re: new RegExp(src, 'gu'), rep };
    });
  },
  t(s) {
    if (!this.en || typeof s !== 'string' || !s || !/[a-zA-Zéèàç]/.test(s)) return s;
    const c = this.cache.get(s); if (c !== undefined) return c;
    const brut = s.trim();
    let r;
    if (this.L.exact[brut] !== undefined) r = s.replace(brut, this.L.exact[brut]);
    else { r = s; for (const g of this.regles) r = r.replace(g.re, g.rep); }
    if (this.cache.size > 4000) this.cache.clear();
    this.cache.set(s, r); return r;
  },
  dom(racine) {
    if (!this.en || !racine) return;
    const w = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT), l = [];
    while (w.nextNode()) l.push(w.currentNode);
    for (const n of l) { const v = n.nodeValue; if (v && v.trim()) { const t = this.t(v); if (t !== v) n.nodeValue = t; } }
    for (const e of racine.querySelectorAll('[title],[placeholder]')) { if (e.title) e.title = this.t(e.title); if (e.placeholder) e.placeholder = this.t(e.placeholder); }
    for (const e of racine.querySelectorAll('option')) e.textContent = this.t(e.textContent);
  },
  // remplace les textes des données du jeu
  donnees() {
    const L = this.L, set = (o, k, v) => { if (o && v !== undefined) o[k] = v; };
    for (const [id, [n, c]] of Object.entries(L.atk)) if (ATK[id]) { ATK[id].nom = n; ATK[id].conseil = c; }
    for (const [cat, liste] of [['p', PRIM], ['s', SPEC], ['t', TAL]]) for (const a of liste) { const x = L.arme[cat][a.id]; if (x) { a.nom = x[0]; a.desc = x[1]; } }
    for (const [id, [n, m]] of Object.entries(L.esp)) if (ESPECES[id]) { ESPECES[id].nom = n; ESPECES[id].meca = m; }
    for (const [id, [n, d]] of Object.entries(L.traits)) if (TRAITS[id]) { TRAITS[id].nom = n; TRAITS[id].desc = d; }
    for (const [id, [n, d]] of Object.entries(L.mut)) if (MUTATEURS[id]) { MUTATEURS[id].nom = n; MUTATEURS[id].desc = d; }
    for (const [id, [n, d]] of Object.entries(L.fmt)) if (FORMATS[id]) { FORMATS[id].nom = n; FORMATS[id].obj = d; }
    for (const [id, [n, d]] of Object.entries(L.cartes)) if (CARTES[id]) { CARTES[id].nom = n; CARTES[id].desc = d; }
    for (const [id, [n, d]] of Object.entries(L.invoc)) if (INVOC[id]) { INVOC[id].nom = n; INVOC[id].desc = d; }
    for (const s of SKINS) set(s, 'nom', L.skins[s.id]);
    for (const t of TITRES) { const x = L.titres[t.id]; if (x) { t.nom = x[0]; t.desc = x[1]; } else if (t.esp && ESPECES[t.esp]) { const nm = ESPECES[t.esp].nom; t.nom = (L.fleau || (n => 'Bane of ' + n))(nm); t.desc = (L.fleauDesc || (n => 'Complete the 5 mastery challenges of ' + n + '.'))(nm); } }
    REGIONS.forEach((r, i) => { const x = L.regions[i]; if (x) { r.nom = x[0]; r.pnom = x[1]; r.pdesc = x[2]; } });
    for (const [id, l] of Object.entries(L.phrases)) if (PHRASES_ESP[id]) PHRASES_ESP[id] = l;
    if (typeof NOMS_PHASES !== 'undefined') L.phases.forEach((n, i) => { NOMS_PHASES[i] = n; });
    for (const [k, n] of Object.entries(L.rar)) if (RARETES[k]) RARETES[k].nom = n;
    for (const [k, n] of Object.entries(L.slots)) if (SLOTS[k] !== undefined) SLOTS[k] = n;
    for (const [k, n] of Object.entries(L.fam)) if (FAMILLES[k]) FAMILLES[k].nom = n;
    for (const [k, [n, d]] of Object.entries(L.diffs)) if (DIFFS[k]) { DIFFS[k].nom = n; DIFFS[k].desc = d; }
    L.defisM.forEach(([n, d], i) => { if (DEFIS_M[i]) { DEFIS_M[i].nom = n; DEFIS_M[i].desc = d; } });
    // (catégories d'attaques : voir L.catAtk)
    if (typeof deNom === 'function') deNom = L.deNom || (n => 'of ' + n);
    if (L.catAtk && typeof CAT_ATK !== 'undefined') for (const [k, v] of Object.entries(L.catAtk)) if (CAT_ATK[k]) Object.assign(CAT_ATK[k], { nom: v[0], desc: v[1] });
    if (L.catNom && typeof CAT_NOM !== 'undefined') Object.assign(CAT_NOM, L.catNom);
    document.documentElement.lang = L.code || 'en';
  }
};
// ---------- branchements (lancés par lang-go.js, une fois toutes les langues chargées) ----------
Langue.demarrer = function () {
  try { const code = Save.d.opts.langue; if (code && code !== 'fr' && LANGS[code]) { Langue.en = true; Langue.L = LANGS[code]; } } catch (e) { }
  if (!Langue.en) return;
  Langue.preparer();
  try { Langue.donnees(); } catch (e) { console.warn('langue', e); }
  const P = CanvasRenderingContext2D.prototype, f = P.fillText, s = P.strokeText, m = P.measureText;
  P.fillText = function (t, ...a) { return f.call(this, Langue.t(t), ...a); };
  P.strokeText = function (t, ...a) { return s.call(this, Langue.t(t), ...a); };
  P.measureText = function (t) { return m.call(this, Langue.t(t)); };
  const mo = UI.montrer.bind(UI);
  UI.montrer = function (html, classe) { mo(html, classe); try { Langue.dom(this.el); } catch (e) { } };
};
