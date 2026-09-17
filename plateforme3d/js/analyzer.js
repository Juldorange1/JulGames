// ============================================================================
// ASCENSION — analyzer.js
// Bot d'analyse de niveau (éditeur) : construit le niveau exactement comme en
// jeu (AS.World.buildCustom) puis fait "jouer" un AS.Player réel, piloté par
// un script, pour vérifier que le Départ mène bien à l'Arrivée.
//
// Principe : chaque bloc solide, chaque orbe de rebond et chaque porte de
// phase est un noeud. Entre deux noeuds, on teste par SIMULATION RÉELLE (pas
// une formule à la main) si un saut/double-saut/dash/enchaînement de
// wall-jumps suffit à relier l'un à l'autre, en démarrant le joueur simulé
// déjà à pleine vitesse au bord du premier noeud — comme un joueur qui
// aurait pris son élan (ou, pour un orbe, déjà en train de rebondir). La
// combinaison la plus simple qui réussit est retenue (marche < saut < double
// saut < dash < wall-jumps enchaînés) : c'est ce qu'un joueur parfait ferait
// aussi, pas la solution la plus difficile. Le graphe n'est PAS construit à
// l'avance en testant toutes les paires de noeuds (ça explosait en O(n²) —
// voir lazyDijkstra) : la recherche du plus court chemin (Dijkstra, coût =
// temps) et la construction du graphe se font en même temps, un noeud à la
// fois. Un noeud ne se voit simuler ses sauts sortants QUE quand la
// progression depuis le Départ l'atteint vraiment ("il regarde tout ce qui
// est à sa portée" depuis LÀ où il est rendu, pas depuis n'importe où dans
// le niveau) — et dès que l'Arrivée est atteinte, la recherche s'arrête
// immédiatement (Dijkstra garantit que c'est déjà le chemin le plus court,
// inutile d'explorer le reste). Si l'Arrivée n'est pas atteignable, on
// renvoie le noeud le plus proche d'elle parmi ceux qui restent
// accessibles : c'est là que ça bloque.
//
// La simulation elle-même tourne hors-écran (pas de rendu, pas de délai
// temps réel) : chaque tentative s'exécute à la vitesse d'exécution du
// JavaScript, pas à 60 im/s réelles — mais tout se passe sur le fil
// d'exécution principal, donc le NOMBRE d'images simulées se traduit
// directement en temps où la page ne répond plus (c'est ce qui, sans
// garde-fous, donnait un écran noir de très longue durée sur un niveau
// chargé en blocs mobiles). Trois garde-fous, du plus structurel au plus
// direct :
//  1. hasHeadroom exclut du graphe un bloc directement surmonté d'un autre
//     (moins d'une hauteur de joueur de dégagement) : sans ça, un mur de
//     wall-jump haut de N blocs empilés ajouterait N noeuds inutiles
//     (grimper le long du mur se joue en une seule arête simulée, jamais
//     noeud par noeud).
//  2. La recherche paresseuse (lazyDijkstra) ne simule les sauts sortants
//     d'un noeud QUE s'il est vraiment atteint depuis le Départ, et
//     s'arrête dès que l'Arrivée l'est — un niveau avec beaucoup de blocs
//     mobiles à plusieurs points de passage (chacun ajoute un noeud) mais
//     dont la plupart ne sont jamais empruntés ne coûte presque rien.
//  3. Un budget global d'images simulées (MAX_TOTAL_FRAMES), partagé par
//     tout l'appel à analyze() : même un niveau où BEAUCOUP de noeuds sont
//     réellement à portée les uns des autres (donc tous explorés par le
//     garde-fou précédent) ne peut plus dépasser quelques secondes — passé
//     le budget, l'analyse rend la main avec le meilleur verdict trouvé
//     jusque-là plutôt que de continuer indéfiniment (voir `cutShort` dans
//     le résultat).
//
// Couvert par la simulation réelle (donc pas besoin de cas particuliers) :
// vent, gravité faible, glace (accélération/friction), pads de vitesse,
// rebond simple/parfait, plateformes fragiles qui s'effondrent réellement
// sous le joueur simulé pendant la tentative (voir stepCrumbles), portes de
// phase (déclencheur volumique), plateformes mobiles (arête "trajet" dédiée).
//
// Stratégies d'entrée testées par paire de noeuds, de la plus simple à la
// plus difficile : marche, saut simple, double saut, saut+dash, saut+double
// saut+dash, et enfin un enchaînement de sauts contre les murs (wall-jumps
// répétés + double saut + dash) pour les écarts qu'aucune des précédentes ne
// franchit — c'est la seule façon de valider un niveau qui EXIGE du
// wall-jump entre deux parois, ce qu'une simple parabole ne peut pas
// représenter.
//
// Limite assumée (pour rester dans un temps de dev raisonnable) : un niveau
// qui ne serait franchissable qu'en enchaînant PLUSIEURS rebonds volontaires
// depuis un seul et même pad de rebond immobile (sans jamais s'en éloigner)
// n'est pas modélisé — seul un rebond "en passant" (arrivée -> rebond ->
// nouvelle cible) est testé, ce qui couvre l'immense majorité des usages
// réels d'un pad de rebond.
// ============================================================================
window.AS = window.AS || {};

AS.Analyzer = (function () {
  const DT = 1 / 60;
  const MAX_FRAMES = 300;           // 5s de simulation max par tentative normale
  const MAX_FRAMES_WALLCLIMB = 360; // 6s : un enchaînement de wall-jumps peut prendre plus de temps qu'un simple saut
  // Marges volontairement larges : une zone de vent/gravité faible, ou un
  // enchaînement de wall-jumps, peut donner bien plus de portée qu'un
  // saut/dash nu — ce pré-filtrage n'est qu'une optimisation (éviter de
  // simuler des paires manifestement hors de portée), la simulation reste
  // seule juge de la faisabilité réelle.
  const MAX_HORIZ = 35;
  const MAX_RISE = 40;
  const MAX_DROP = 19;    // au-delà, chute mortelle (voidMargin = 20)
  // Nombre de directions candidates (parmi les 8 possibles) essayées par
  // paire de noeuds — voir candidateMoveDirs. Réduit de 5 à 3 : les 2
  // directions les moins bien alignées avec la cible changent presque
  // jamais le verdict (voir trySimulateEdge) et coûtent cher à essayer en
  // pure perte sur chaque paire.
  const DIR_CANDIDATES_COUNT = 3;

  // ---- Budget global de simulation -----------------------------------------
  // Filet de sécurité contre les niveaux pathologiques (des dizaines de
  // blocs mobiles à plusieurs points de passage, tous proches les uns des
  // autres et donc tous réellement explorés par lazyDijkstra) : même en ne
  // simulant que depuis les noeuds vraiment atteints, le nombre de paires
  // à essayer peut rester énorme. Un compteur d'images simulées, partagé
  // par TOUTES les tentatives de tout l'appel à analyze(), est vérifié à
  // chaque image ; une fois épuisé, toute nouvelle tentative échoue
  // immédiatement sans simuler une seule image de plus — l'analyse rend
  // alors la main avec le meilleur chemin trouvé jusque-là plutôt que de
  // continuer indéfiniment. Choisi pour tenir sous ~3-4s même dans le pire
  // cas mesuré (un niveau à 75 points de passage rapprochés prenait 20s+
  // sans ce garde-fou).
  const MAX_TOTAL_FRAMES = 1000000;
  let frameBudget = { used: 0, exhausted: false };

  function fixedControlBasis() {
    const yaw = AS.CAMERA_YAW;
    return {
      fwd: new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)),
      right: new THREE.Vector3(Math.sin(yaw - Math.PI / 2), 0, Math.cos(yaw - Math.PI / 2)),
    };
  }

  // Le joueur ne peut viser que 8 directions (avant/arrière/gauche/droite du
  // repère fixe, combinées) — jamais un angle libre. Sur une grille d'éditeur,
  // beaucoup d'écarts ne sont ALIGNÉS ni sur un axe ni sur une diagonale à 45°
  // (ex. décalage de 1 cellule sur un axe et 2 sur l'autre) : aucune des 8
  // directions ne pointe alors exactement sur la cible. On renvoie les 8
  // candidates triées par alignement (produit scalaire décroissant) pour que
  // l'appelant puisse en essayer plusieurs plutôt qu'une seule, comme un
  // joueur choisirait la touche qui rapproche le plus de la cible.
  function candidateMoveDirs(desired, basis) {
    const combos = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    const dirs = combos.map(([f, r]) => new THREE.Vector3().addScaledVector(basis.fwd, f).addScaledVector(basis.right, r).normalize());
    dirs.sort((a, b) => b.dot(desired) - a.dot(desired));
    return dirs;
  }

  // Pas de grille horizontal EFFECTIF d'un bloc — un quart de bloc (outil
  // Construire, éditeur) occupe la moitié de cell.x/cell.z chacun (un quart
  // de la surface au sol) ; b.gx/b.gz sont alors exprimés dans cette
  // échelle plus fine. Même formule que world.js/editor.js.
  function blockStepXZ(b, cell) {
    return b.size === 'quarter' ? { x: cell.x / 2, z: cell.z / 2 } : { x: cell.x, z: cell.z };
  }

  // Un bloc directement surmonté d'un autre bloc (même colonne, un ou
  // plusieurs niveaux au-dessus, moins que playerHeight de dégagement) n'est
  // PAS un point d'arrivée valable : le joueur s'y cognerait la tête en
  // arrivant. C'est le cas de la quasi-totalité des segments d'un mur de
  // wall-jump empilés les uns sur les autres — les exclure du graphe évite
  // de tester des milliers de paires de noeuds sans intérêt (aucun joueur
  // ne "vise" le sommet d'un segment de mur au milieu d'une paroi), sans
  // perdre la capacité à grimper le long de ce mur : l'enchaînement de
  // wall-jumps se joue en UNE seule arête simulée (voir trySimulateEdge /
  // l'option wallClimb), il n'a jamais besoin de "noeuds" intermédiaires.
  //
  // "Même colonne" se compare en position MONDE (pas en gx/gz bruts) : un
  // bloc plein et un quart de bloc n'utilisent pas la même échelle de
  // grille, deux gx/gz identiques ne tombent alors pas forcément au même
  // endroit réel.
  function hasHeadroom(b, blocks, cell, topY) {
    const margin = 0.15;
    const bStep = blockStepXZ(b, cell);
    const bx = b.gx * bStep.x, bz = b.gz * bStep.z;
    return !blocks.some((o) => {
      if (o === b || o.gy <= b.gy) return false;
      const oStep = blockStepXZ(o, cell);
      if (Math.abs(o.gx * oStep.x - bx) > 0.05 || Math.abs(o.gz * oStep.z - bz) > 0.05) return false;
      const otherBottom = o.gy * cell.y - (cell.y * 0.92) / 2;
      return (otherBottom - topY) < AS.CFG.playerHeight + margin;
    });
  }

  function buildNodes(blocks, level) {
    const cell = AS.EDITOR_CELL;
    const SOLID = new Set(['normal', 'ice', 'boost', 'bounce', 'crumble', 'perfectBounce', 'spawn', 'finish']);
    const nodes = [];
    blocks.forEach((b, i) => {
      if (!SOLID.has(b.type)) return;
      const step = blockStepXZ(b, cell);
      const topY = b.gy * cell.y + (cell.y * 0.92) / 2;
      // Départ et arrivée sont toujours conservés même sans dégagement
      // "normal" détecté (cas limite en bord de niveau) : ce sont les deux
      // seuls noeuds qu'on ne peut jamais se permettre de perdre.
      if (b.type !== 'spawn' && b.type !== 'finish' && !hasHeadroom(b, blocks, cell, topY)) return;
      const node = {
        id: 'b' + i, kind: 'platform', surface: b.type,
        pos: new THREE.Vector3(b.gx * step.x, topY, b.gz * step.z),
        half: { x: step.x * 0.96 / 2, z: step.z * 0.96 / 2 },
      };
      if (b.type === 'boost') {
        const rot = (b.rot || 0) * Math.PI / 2;
        node.boostDir = new THREE.Vector3(Math.sin(rot), 0, Math.cos(rot));
      }
      // Retrouve le mesh réel correspondant (même formule de position que
      // AS.World.buildCustom) : nécessaire pour simuler correctement une
      // plateforme fragile qui s'effondre sous le joueur (voir
      // stepCrumbles) et pour que le joueur simulé démarre avec la bonne
      // surface de sol (glace/vitesse) dès la première image.
      node.mesh = level.collidables.find((m) =>
        Math.abs(m.position.x - node.pos.x) < 0.01 &&
        Math.abs(m.position.z - node.pos.z) < 0.01 &&
        Math.abs(m.position.y - b.gy * cell.y) < 0.01
      ) || null;
      nodes.push(node);
    });

    // Blocs mobiles : un bloc (de n'importe quel type solide) portant des
    // points de passage (b.waypoints) forme un circuit fermé — son noeud
    // habituel ('b'+i, position de base) sert de premier arrêt, un noeud
    // supplémentaire est créé par point de passage, et des arêtes relient
    // la boucle UNIQUEMENT dans le sens de parcours (base -> wp1 -> wp2 ->
    // ... -> wpN -> base) puisque la plateforme ne fait jamais demi-tour.
    const extraEdges = [];
    blocks.forEach((b, i) => {
      if (!b.waypoints || !b.waypoints.length) return;
      const baseNode = nodes.find((n) => n.id === 'b' + i);
      if (!baseNode) return; // pas de dégagement au repos : hors graphe
      const stops = [{ id: baseNode.id, pos: baseNode.pos }];
      b.waypoints.forEach((wp, wi) => {
        const topY = wp.gy * cell.y + (cell.y * 0.92) / 2;
        const pos = new THREE.Vector3(wp.gx * cell.x, topY, wp.gz * cell.z);
        const node = {
          id: 'wp' + i + '_' + wi, kind: 'platform', surface: b.type,
          pos, half: { x: cell.x * 0.96 / 2, z: cell.z * 0.96 / 2 },
        };
        if (b.type === 'boost') {
          const rot = (b.rot || 0) * Math.PI / 2;
          node.boostDir = new THREE.Vector3(Math.sin(rot), 0, Math.cos(rot));
        }
        nodes.push(node);
        stops.push({ id: node.id, pos });
      });
      // Même formule que AS.World.buildWaypointMover (voir world.js) : le
      // temps de trajet dépend de la distance RÉELLE entre les deux arrêts
      // et de la vitesse (en unités/seconde) réglée précisément dans
      // l'éditeur (outil Sélection), plus la pause à chaque arrêt — sinon le
      // temps "parfait" annoncé serait faux dès qu'une plateforme n'est pas
      // à sa vitesse par défaut ou que ses arrêts ne sont pas équidistants.
      const spd = b.speed || 2.5;
      const n = stops.length;
      for (let s = 0; s < n; s++) {
        const from = stops[s], to = stops[(s + 1) % n];
        const legTime = Math.max(from.pos.distanceTo(to.pos) / spd, 0.15) + 0.28;
        extraEdges.push({ from: from.id, to: to.id, time: legTime, difficulty: 1, trajectory: [from.pos.clone(), to.pos.clone()] });
      }
    });

    return { nodes, extraEdges };
  }

  function addPhaseGateNodes(nodes, extraEdges, level) {
    const gates = (level.triggers || []).filter((t) => t.type === 'phaseGate');
    const gateNodes = gates.map((t, i) => ({
      id: 'gate' + i, kind: 'phase', surface: 'normal',
      pos: t.pos.clone(), half: { x: 0.9, z: 0.9 }, trigger: t, triggerRadius: t.radius,
    }));
    gateNodes.forEach((n) => nodes.push(n));
    gateNodes.forEach((n, i) => {
      const j = gates.findIndex((t) => t.pos.distanceTo(n.trigger.pairPos) < 0.05);
      if (j >= 0 && j !== i) {
        extraEdges.push({
          from: n.id, to: gateNodes[j].id, time: 0.25, difficulty: 2,
          trajectory: [n.pos.clone(), gateNodes[j].pos.clone()],
        });
      }
    });
  }

  // Un orbe de rebond devient lui aussi un noeud à part entière : on peut le
  // viser délibérément (arrivée = passer dans son rayon en tombant, comme le
  // vrai déclencheur — voir player.js) puis repartir de là avec la vitesse
  // verticale du rebond (voir le cas A.kind==='orb' dans trySimulateEdge).
  // Avant, un orbe n'était utilisé que "par hasard" si un saut normal
  // passait dedans ; il est maintenant explicitement routé comme les
  // plateformes de rebond.
  function addBounceOrbNodes(nodes, level) {
    (level.bounceOrbs || []).forEach((orb, i) => {
      nodes.push({
        id: 'orb' + i, kind: 'orb', surface: 'orb',
        pos: orb.pos.clone(), half: { x: orb.radius * 0.6, z: orb.radius * 0.6 },
        orbForce: orb.force, orbRadius: orb.radius,
      });
    });
  }

  // ---- Plateformes fragiles : simule exactement le même automate que
  // updateCrumbles (main.js), pour que le bot ne considère pas une
  // plateforme fragile comme éternellement solide pendant sa tentative.
  function resetCrumbles(level) {
    (level.crumbles || []).forEach((c) => {
      c.userData.crumbleState = 'idle';
      c.userData.crumbleT = 0;
      c.userData.disabled = false;
      c.visible = true;
    });
  }
  function stepCrumbles(level, player, dt) {
    for (const c of (level.crumbles || [])) {
      const st = c.userData.crumbleState || 'idle';
      if (st === 'idle') {
        if (player.grounded && player.groundObject === c) {
          c.userData.crumbleState = 'shaking';
          c.userData.crumbleT = 0;
        }
      } else if (st === 'shaking') {
        c.userData.crumbleT += dt;
        if (c.userData.crumbleT > (c.userData.crumbleTime != null ? c.userData.crumbleTime : 0.45)) {
          c.userData.crumbleState = 'gone';
          c.userData.crumbleT = 0;
          c.userData.disabled = true;
          c.visible = false;
        }
      }
      // 'gone' -> 'idle' (repousse à 3.2s dans le vrai jeu) volontairement
      // pas simulé ici : une tentative dure au plus quelques secondes, et
      // rester pessimiste (la plateforme ne revient jamais pendant l'essai)
      // est plus sûr qu'y compter par erreur.
    }
  }

  // Durée totale d'un saut tenu "th" secondes puis relâché (le jeu réduit la
  // gravité en montée tant que le saut est maintenu — relâcher tôt donne un
  // petit saut, cf. player.js). Renvoie le temps total en l'air pour
  // retomber à une hauteur relative dyTarget, ou null si le sommet atteint
  // est plus bas que dyTarget (saut trop court pour même atteindre la cible).
  function tApexFullSeconds() { return AS.CFG.jumpVel / -AS.CFG.gravityRise; }

  function analyticAirtime(th, dyTarget) {
    const CFG = AS.CFG;
    const tFull = CFG.jumpVel / -CFG.gravityRise;
    th = Math.max(0, Math.min(th, tFull));
    const vRelease = CFG.jumpVel + CFG.gravityRise * th;
    const hTh = CFG.jumpVel * th + 0.5 * CFG.gravityRise * th * th;
    let H, tApexTotal;
    if (vRelease <= 0) {
      H = hTh; tApexTotal = th;
    } else {
      const gReleased = CFG.gravityRise * 2.6;
      const t2 = vRelease / -gReleased;
      H = hTh + (vRelease * vRelease) / (2 * -gReleased);
      tApexTotal = th + t2;
    }
    if (H < dyTarget) return null;
    const t3 = Math.sqrt(2 * (H - dyTarget) / -CFG.gravityFall);
    return tApexTotal + t3;
  }

  // Un joueur parfait ne saute pas toujours au maximum : il relâche le saut
  // au bon moment pour atterrir pile sur la cible (sauter à fond sur un
  // petit écart le ferait systématiquement atterrir trop loin). On cherche
  // par dichotomie la durée de maintien qui donne la bonne portée, puisque
  // la portée croît avec la durée de maintien (fonction monotone).
  function findHoldSeconds(targetDist, runSpeed, dyTarget) {
    const tFull = AS.CFG.jumpVel / -AS.CFG.gravityRise;
    const reachAt = (th) => { const a = analyticAirtime(th, dyTarget); return a == null ? null : a * runSpeed; };
    const reachHi = reachAt(tFull);
    if (reachHi == null || reachHi < targetDist) return tFull; // hors de portée même à fond -> tenter avec assistance
    const reachLo = reachAt(0);
    if (reachLo != null && reachLo >= targetDist) return 0; // même une pichenette suffit/dépasse déjà
    let lo = 0, hi = tFull;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      const r = reachAt(mid);
      if (r == null || r < targetDist) lo = mid; else hi = mid;
    }
    return hi;
  }

  // Stratégies d'entrée essayées par paire de noeuds, de la plus simple à la
  // plus difficile — la première qui réussit est retenue (voir
  // trySimulateEdge). `spamJump` (wallClimb) presse le saut à CHAQUE image
  // au lieu d'une seule fois : combiné à la mécanique de wall-jump réelle du
  // contrôleur (qui ne consomme le saut tamponné que si on est au sol, en
  // contact d'un mur, ou qu'il reste un double saut), ça produit
  // naturellement un enchaînement de wall-jumps quand deux parois sont assez
  // proches — sans avoir à coder la cinématique du wall-jump à la main ici.
  const OPTIONS = [
    { label: 'walk', jump: false, doubleJump: false, dash: false, difficulty: 0 },
    { label: 'jump', jump: true, doubleJump: false, dash: false, difficulty: 1 },
    { label: 'jumpDouble', jump: true, doubleJump: true, dash: false, difficulty: 2 },
    { label: 'jumpDash', jump: true, doubleJump: false, dash: true, difficulty: 3 },
    { label: 'jumpDoubleDash', jump: true, doubleJump: true, dash: true, difficulty: 4 },
    { label: 'wallClimb', jump: true, doubleJump: true, dash: true, difficulty: 5, spamJump: true },
  ];

  // Simule une tentative réelle (vrai AS.Player, vrai niveau) pour relier A à
  // B : démarre déjà à pleine vitesse au bord de A (comme un joueur qui a
  // pris son élan), ou déjà en plein rebond si A est un orbe. La durée de
  // maintien du saut est ajustée pour ne pas systématiquement dépasser la
  // cible ; pour wallClimb, le saut est maintenu tant qu'on monte (hauteur
  // maximale par saut) et re-pressé en boucle.
  function trySimulateEdge(level, A, B, basis) {
    if (frameBudget.exhausted) return null;
    const horiz = new THREE.Vector3(B.pos.x - A.pos.x, 0, B.pos.z - A.pos.z);
    const horizDist = horiz.length();
    const dy = B.pos.y - A.pos.y;
    if (horizDist < 0.05 && Math.abs(dy) < 0.05) return null;

    const desiredDir = A.boostDir ? A.boostDir.clone() : (horizDist > 1e-4 ? horiz.clone().normalize() : new THREE.Vector3(0, 0, -1));
    // Sur une grille, l'écart n'est pas toujours aligné sur une des 8
    // directions disponibles (ex. 1 cellule sur un axe, 2 sur l'autre) :
    // on essaie les meilleures candidates plutôt qu'une seule, sinon un
    // saut réellement faisable serait signalé à tort comme impossible.
    const dirCandidates = A.boostDir ? [A.boostDir.clone()] : candidateMoveDirs(desiredDir, basis).slice(0, DIR_CANDIDATES_COUNT);

    const runSpeed = A.surface === 'boost' ? AS.CFG.boostMaxSpeed : AS.CFG.maxSpeed;
    const tol = Math.max(B.half.x, B.half.z) * 0.9 + 0.3;

    for (let dirIdx = 0; dirIdx < dirCandidates.length; dirIdx++) {
      const dir = dirCandidates[dirIdx];
      if (dir.lengthSq() < 0.01) continue; // inatteignable dans cette direction

      // ---- État de départ : au bord de A en pleine course, ou déjà en
      // l'air en train de rebondir si A est un orbe.
      let startPos, initialVel, initialGrounded, initialGroundObj, initialGroundSurf;
      if (A.kind === 'orb') {
        startPos = A.pos.clone();
        initialVel = new THREE.Vector3(dir.x * runSpeed, A.orbForce, dir.z * runSpeed);
        initialGrounded = false;
        initialGroundObj = null;
        initialGroundSurf = 'normal';
      } else {
        const edgeStartOffset = Math.min(A.half.x, A.half.z) * 0.85;
        startPos = A.pos.clone().addScaledVector(dir, edgeStartOffset);
        startPos.y = A.pos.y + 0.03;
        initialVel = new THREE.Vector3(dir.x * runSpeed, 0, dir.z * runSpeed);
        initialGrounded = true;
        initialGroundObj = A.mesh || null;
        // Sans ceci, un départ depuis la glace/un pad de vitesse utiliserait
        // par erreur l'accélération/friction "normale" du contrôleur dès la
        // 1re image (AS.Player démarre toujours avec groundSurface='normal').
        initialGroundSurf = A.surface || 'normal';
      }

      const flightDist = Math.hypot(B.pos.x - startPos.x, B.pos.z - startPos.z);
      const dyTarget = B.pos.y - startPos.y;
      const tunedHold = findHoldSeconds(flightDist, runSpeed, dyTarget);
      // Pour les options avec assistance (double saut/dash), un saut tenu à
      // fond laisse le plus de marge à combler ensuite ; si ça ne suffit pas
      // non plus, plusieurs fractions de maintien plus courtes sont
      // tentées — un éventail plus large qu'un simple "à fond ou ajusté"
      // pour ne pas rater une combinaison qui marcherait à mi-course.
      const tFull = tApexFullSeconds();
      // 3 candidats (pas 5) : à fond, ajusté pour la cible, et une fraction
      // intermédiaire — suffisant dans l'immense majorité des cas, pour un
      // tiers du coût des 5 précédents sur chaque paire.
      const HOLD_CANDIDATES_BY_OPTION = {
        walk: [0], jump: [tunedHold],
        jumpDouble: [tFull, tunedHold, tFull * 0.6],
        jumpDash: [tFull, tunedHold, tFull * 0.6],
        jumpDoubleDash: [tFull, tunedHold, tFull * 0.6],
        wallClimb: [0],
      };

      for (const opt of OPTIONS) {
        if (frameBudget.exhausted) return null;
        // Un enchaînement de wall-jumps ne sert qu'à grimper — inutile de le
        // tenter (jusqu'à 360 images x 3 directions, l'option la plus chère
        // de toutes) pour une paire qui ne monte pas vraiment : les options
        // plus simples déjà essayées avant celle-ci suffisent ou échouent
        // pour d'autres raisons que le manque de hauteur.
        if (opt.spamJump && dy < 4) continue;
        const holdCandidates = HOLD_CANDIDATES_BY_OPTION[opt.label];
        const maxFrames = opt.spamJump ? MAX_FRAMES_WALLCLIMB : MAX_FRAMES;

        for (const holdSeconds of holdCandidates) {
          if (frameBudget.exhausted) return null;
          const holdFrames = Math.max(1, Math.round(holdSeconds * 60));
          (level.bounceOrbs || []).forEach((o) => { o._playerWasInside = false; });
          resetCrumbles(level);

          const player = new AS.Player(level, startPos, { doubleJump: true, wallJump: true, dash: true });
          player.velocity.copy(initialVel);
          player.grounded = initialGrounded;
          player.groundObject = initialGroundObj;
          player.groundSurface = initialGroundSurf;

          let jumped = false, doubleJumped = false, dashed = false;
          const trajectory = [player.position.clone()];
          let success = false, frames = 0;
          for (frames = 0; frames < maxFrames; frames++) {
            frameBudget.used++;
            if (frameBudget.used >= MAX_TOTAL_FRAMES) { frameBudget.exhausted = true; success = false; break; }
            // Direction "poursuite" recalculée chaque image (comme un joueur
            // qui corrige sa trajectoire en l'air) plutôt qu'une direction
            // figée au décollage : sur une grille, la cible n'est presque
            // jamais exactement sur une des 8 directions disponibles, un
            // joueur réel rectifie donc en vol via l'air-control.
            let liveDir;
            if (opt.spamJump && Math.abs(player.position.y - B.pos.y) > 3) {
              // Tant qu'on est encore loin de l'altitude de B, viser B
              // directement recentrerait sans arrêt vers son axe et
              // annulerait la dérive latérale nécessaire pour toucher un
              // mur (cas courant : cible pile à la verticale du départ,
              // typique d'un couloir de wall-jump). On "surfe" plutôt sur
              // l'élan horizontal courant (donné par le dernier wall-jump,
              // ou par la direction de départ tant qu'aucun mur n'a encore
              // été touché) : ça laisse le ping-pong entre les deux parois
              // se poursuivre naturellement au lieu de le combattre.
              const horizVel = new THREE.Vector3(player.velocity.x, 0, player.velocity.z);
              liveDir = horizVel.lengthSq() > 0.25 ? candidateMoveDirs(horizVel.normalize(), basis)[0] : dir;
            } else {
              const toTarget = new THREE.Vector3(B.pos.x - player.position.x, 0, B.pos.z - player.position.z);
              liveDir = toTarget.lengthSq() > 0.01 ? candidateMoveDirs(toTarget.normalize(), basis)[0] : dir;
            }
            const input = {
              moveDir: liveDir.clone(),
              facingFlat: liveDir.lengthSq() > 0.0004 ? liveDir.clone() : new THREE.Vector3(0, 0, -1),
              jumpHeld: false,
              jumpPressedEdge: false,
              dashPressedEdge: false,
              holdingIntoWall: liveDir.lengthSq() > 0.0004,
            };

            if (opt.spamJump) {
              // Ne presse que quand une vraie occasion de saut/wall-jump se
              // présente (sol, coyote, contact mural) — PAS le double saut
              // "gratuit" : jumpsUsed repasse à 1 après un wall-jump, donc
              // sans cette restriction le contrôleur consommait le double
              // saut (doubleJumpVel=11) une image après CHAQUE wall-jump
              // (wallJumpVelY=12.5) — un double saut est plus faible qu'un
              // wall-jump, ça remplaçait donc systématiquement une bonne
              // impulsion par une moins bonne et plafonnait la montée en
              // boucle stable au lieu de vraiment grimper. Le double saut
              // reste disponible (voir plus bas) mais seulement en dernier
              // recours, s'il ne reste vraiment aucun mur à portée.
              const canJump = player.grounded || player.coyoteTimer > 0 || player.wallContactTimer > 0;
              input.jumpPressedEdge = canJump;
              input.jumpHeld = player.velocity.y > 0;
              if (canJump) jumped = true;
            } else {
              input.jumpHeld = opt.jump && frames < holdFrames;
              if (opt.jump && !jumped) { input.jumpPressedEdge = true; jumped = true; }
              if (opt.doubleJump && jumped && !doubleJumped && !player.grounded && player.velocity.y <= 0.5) {
                input.jumpPressedEdge = true; doubleJumped = true;
              }
            }
            if (opt.dash && jumped && !dashed && !player.grounded) {
              input.dashPressedEdge = true; dashed = true;
            }

            player.update(DT, input);
            stepCrumbles(level, player, DT);
            trajectory.push(player.position.clone());

            if (player.dead) { success = false; break; }

            // Une porte de phase / un orbe de rebond sont des déclencheurs
            // volumiques (jamais de sol) : il suffit de passer à portée
            // (en tombant, pour l'orbe — comme le vrai déclencheur), pas de
            // s'y "poser".
            if (B.kind === 'phase') {
              if (player.position.distanceTo(B.pos) < B.triggerRadius) { success = true; break; }
              if (player.grounded && frames > 1) { success = false; break; }
              continue;
            }
            if (B.kind === 'orb') {
              if (player.velocity.y <= 0 && player.position.distanceTo(B.pos) < B.orbRadius + player.radius) { success = true; break; }
              if (player.grounded && frames > 1) { success = false; break; }
              continue;
            }

            const nearB = player.position.distanceTo(B.pos) < tol && Math.abs(player.position.y - B.pos.y) < 0.7;
            if (nearB && (player.grounded || player.justBounced || player.justPerfectBounce)) { success = true; break; }
            if (player.grounded && !nearB && frames > 1) { success = false; break; }
          }

          if (success) {
            let difficulty = opt.difficulty;
            if (A.surface === 'ice') difficulty += 1;
            if (B.surface === 'ice') difficulty += 1;
            if (A.surface === 'crumble' || B.surface === 'crumble') difficulty += 2;
            const d = player.position.distanceTo(B.pos);
            if (tol - d < tol * 0.3) difficulty += 1; // atterrissage précis
            return { time: frames * DT, difficulty, trajectory };
          }
        }
      }
    }
    return null;
  }

  // ---- Dijkstra "paresseux" : ne simule les sauts qu'AU MOMENT où un noeud
  // est vraiment réglé (sa distance la plus courte est connue), jamais pour
  // les autres. Avant, buildEdges testait TOUTES les paires de noeuds à
  // l'avance (O(n²)) — chaque paire pouvant coûter jusqu'à 5 directions x 6
  // stratégies x 5 durées de maintien de simulations réelles, ça explosait
  // dès qu'un niveau avait beaucoup de noeuds (un bloc mobile avec plusieurs
  // points de passage en ajoute un par point, voir buildNodes) : la plupart
  // de ces paires ne servent jamais au plus court chemin, mais étaient
  // simulées quand même. Ici, un noeud n'a ses sauts sortants calculés QUE
  // s'il est vraiment atteint par la progression depuis le Départ ("il
  // regarde tout ce qui est à sa portée" depuis LÀ où il est, pas depuis
  // partout à la fois), et la recherche s'arrête dès que l'Arrivée est
  // réglée (Dijkstra garantit que sa distance est alors déjà minimale — pas
  // besoin d'explorer le reste du niveau). Résultat identique à l'ancienne
  // version (mêmes arêtes, même notion de plus court chemin) mais sans le
  // travail inutile sur les noeuds jamais empruntés.
  function lazyDijkstra(level, nodes, extraEdges, basis, startId, finishId) {
    const dist = new Map(), prevEdge = new Map(), visited = new Set();
    nodes.forEach((n) => dist.set(n.id, Infinity));
    dist.set(startId, 0);

    // Arêtes déterministes (trajet d'une plateforme mobile, porte de phase) :
    // bon marché, connues d'avance, jamais besoin d'être "paresseuses".
    const extraByFrom = new Map();
    extraEdges.forEach((e) => {
      if (!extraByFrom.has(e.from)) extraByFrom.set(e.from, []);
      extraByFrom.get(e.from).push(e);
    });
    const nodeById = new Map(nodes.map((n) => [n.id, n]));

    while (true) {
      let u = null, best = Infinity;
      for (const n of nodes) {
        if (!visited.has(n.id) && dist.get(n.id) < best) { best = dist.get(n.id); u = n.id; }
      }
      if (u === null) break;
      visited.add(u);
      if (u === finishId) break; // trouvé : sa distance est déjà minimale, inutile d'aller plus loin

      const A = nodeById.get(u);
      for (const B of nodes) {
        if (B === A || visited.has(B.id)) continue;
        const dy = B.pos.y - A.pos.y;
        if (dy > MAX_RISE || dy < -MAX_DROP) continue;
        const dxFlat = Math.hypot(B.pos.x - A.pos.x, B.pos.z - A.pos.z);
        if (dxFlat > MAX_HORIZ) continue;
        const r = trySimulateEdge(level, A, B, basis);
        if (r) {
          const nd = dist.get(u) + r.time;
          if (nd < dist.get(B.id)) {
            dist.set(B.id, nd);
            prevEdge.set(B.id, { from: u, to: B.id, time: r.time, difficulty: r.difficulty, trajectory: r.trajectory });
          }
        }
      }
      for (const e of (extraByFrom.get(u) || [])) {
        const nd = dist.get(u) + e.time;
        if (nd < dist.get(e.to)) { dist.set(e.to, nd); prevEdge.set(e.to, e); }
      }
    }
    return { dist, prevEdge, reached: visited };
  }

  function scoreLabel(points) {
    if (points <= 5) return 'Facile';
    if (points <= 12) return 'Modéré';
    if (points <= 22) return 'Difficile';
    return 'Extrême';
  }

  function analyze(blocks) {
    frameBudget = { used: 0, exhausted: false };
    if (!blocks.some((b) => b.type === 'spawn')) {
      return { possible: false, message: 'Place un bloc "Départ" avant d\'analyser.' };
    }
    if (!blocks.some((b) => b.type === 'finish')) {
      return { possible: false, message: 'Place un bloc "Arrivée" avant d\'analyser.' };
    }

    const scene = new THREE.Scene();
    const level = AS.World.buildCustom(scene, blocks);
    // Sans ça, les matrices monde des meshes ajoutés restent à l'identité
    // (jamais recalculées hors boucle de rendu) et tous les raycasts du
    // contrôleur (sol/murs) testent une géométrie mal positionnée.
    scene.updateMatrixWorld(true);
    const basis = fixedControlBasis();

    const { nodes, extraEdges } = buildNodes(blocks, level);
    addPhaseGateNodes(nodes, extraEdges, level);
    addBounceOrbNodes(nodes, level);

    const spawnNode = nodes.find((n) => n.surface === 'spawn');
    const finishNode = nodes.find((n) => n.surface === 'finish');
    if (!spawnNode || !finishNode) {
      return { possible: false, message: 'Départ ou Arrivée introuvable dans le niveau.' };
    }

    const { dist, prevEdge, reached } = lazyDijkstra(level, nodes, extraEdges, basis, spawnNode.id, finishNode.id);

    if (!reached.has(finishNode.id) || dist.get(finishNode.id) === Infinity) {
      // Le noeud accessible le plus proche (à vol d'oiseau) de l'Arrivée :
      // c'est là que la progression s'arrête.
      let frontier = spawnNode, bestD = Infinity;
      for (const n of nodes) {
        if (!reached.has(n.id)) continue;
        const d = n.pos.distanceTo(finishNode.pos);
        if (d < bestD) { bestD = d; frontier = n; }
      }
      const trail = [];
      let cur = frontier.id;
      const chain = [];
      while (prevEdge.has(cur)) { const e = prevEdge.get(cur); chain.unshift(e); cur = e.from; }
      chain.forEach((e) => e.trajectory.forEach((p) => trail.push(p)));
      const budgetNote = frameBudget.exhausted
        ? ' Niveau trop complexe pour être analysé entièrement (trop de blocs mobiles/points de passage) : ce verdict n\'est peut-être pas définitif, simplifie le niveau pour une analyse fiable.'
        : '';
      return {
        possible: false,
        stuckAt: frontier.pos.clone(),
        trajectory: trail,
        cutShort: frameBudget.exhausted,
        message: 'Niveau impossible : aucun chemin trouvé au-delà de (' +
          frontier.pos.x.toFixed(1) + ', ' + frontier.pos.y.toFixed(1) + ', ' + frontier.pos.z.toFixed(1) + ').' + budgetNote,
      };
    }

    // Reconstruit le chemin complet depuis l'Arrivée.
    const chain = [];
    let cur = finishNode.id;
    while (prevEdge.has(cur)) { const e = prevEdge.get(cur); chain.unshift(e); cur = e.from; }
    const trajectory = [];
    chain.forEach((e) => e.trajectory.forEach((p) => trajectory.push(p)));
    const difficulty = chain.reduce((s, e) => s + e.difficulty, 0);
    const timeSeconds = dist.get(finishNode.id);

    return {
      possible: true,
      difficulty,
      difficultyLabel: scoreLabel(difficulty),
      timeSeconds,
      trajectory,
      message: null,
    };
  }

  return { analyze };
})();
