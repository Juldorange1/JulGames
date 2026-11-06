// ============================================================================
// ASCENSION — world.js
// Constantes de jeu (physique), construction des niveaux de l'éditeur
// (AS.World.buildCustom) et des pièces libres du générateur (AS.World.addPieces,
// voir gen.js), et pas de simulation commun au jeu et au générateur
// (AS.World.stepLevel).
//
// Toute la géométrie "praticable" est faite de vrais meshes THREE.js ajoutés
// à level.collidables : le contrôleur du joueur (player.js) fait des raycasts
// contre ces meshes pour le sol / les murs.
// ============================================================================
window.AS = window.AS || {};

// ---------------------------------------------------------------------------
// Constantes physiques globales du personnage
// ---------------------------------------------------------------------------
// Tout ce qui est réglable depuis l'écran "Règles" (main.js) — vitesses,
// saut, dash, gravité, glace — vient de AS.Storage.getRules(), PAS d'un
// facteur figé ici : applyRules() copie ces valeurs par-dessus les
// constantes "internes" ci-dessous à chaque chargement et à chaque
// modification d'une règle, EN PLACE (Object.assign sur l'objet AS.CFG
// existant, jamais une réaffectation) — tout le code qui garde `const CFG =
// AS.CFG` en portée continue de lire les valeurs à jour sans rien recharger.
// Les valeurs ci-dessous ne servent que de repli si jamais une règle
// manquait (ne devrait jamais arriver, AS.Storage a ses propres défauts).
AS.CFG = {
  gravityRise: -22,
  gravityFall: -34,
  gravityWallSlide: -6,
  jumpVel: 15.6,
  doubleJumpVel: 13.2,
  wallJumpVelY: 15,
  wallJumpPush: 11.4,
  dashSpeed: 28.8,
  dashDuration: 0.16,
  dashCharges: 1,
  maxSpeed: 10.8,
  boostMaxSpeed: 20.4,
  accelGround: 54,
  accelAir: 24,
  frictionGround: 30,
  frictionAir: 0.6,
  iceAccel: 13.2,
  iceFriction: 3,
  // Jamais réglable depuis l'écran Règles : la hitbox doit rester identique
  // quoi qu'il arrive à la vitesse du jeu.
  playerRadius: 0.42,
  playerHeight: 1.75,
  coyoteTime: 0.11,
  jumpBuffer: 0.13,
  // Distance sous la dernière plateforme solide au-delà de laquelle on
  // considère être tombé dans le vide (voir player.js:_checkVoid). Relatif
  // à l'altitude courante plutôt qu'un seuil absolu fixe : une chute reste
  // courte et quasi instantanée même tout en haut de la zone.
  voidMargin: 20,

  // ---- Rebond parfait : timing d'impact -----------------------------------
  perfectBounceWindow: 0.13,
  perfectBounceMult: 1.05,
  perfectBounceMin: 18,

  // ---- Glisse orbitale : capture sur une structure courbe -------------------
  orbitCaptureSpeed: 8.4,
  orbitCaptureBand: 1.3,
  orbitMaxDuration: 2.2,
  orbitGravityScale: 0.25,

  // ---- Portes de phase -------------------------------------------------
  // Une paire ne peut retéléporter le joueur qu'une fois toutes les 3s (les
  // deux extrémités partagent le même cooldown, posé sur les deux d'un coup
  // à chaque usage) : évite le ping-pong immédiat et donne un vrai rythme
  // d'utilisation plutôt qu'un passage libre.
  phaseGateCooldown: 3.0,
};


// Images d'arrière-plan proposées dans l'éditeur pour un niveau créé.
AS.BACKGROUND_CHOICES = [
  { id: 'easy', label: 'Collines verdoyantes', path: 'assets/hdri/background.jpg' },
  { id: 'normal', label: 'Forêt enneigée', path: 'assets/hdri/background_normal.jpg' },
  { id: 'hard', label: 'Désert rocheux', path: 'assets/hdri/background_hard.jpg' },
  { id: 'extreme', label: 'Pics enneigés', path: 'assets/hdri/background_extreme.jpg' },
];

// Grille utilisée par l'éditeur de niveaux (blocs voxel).
AS.EDITOR_CELL = { x: 3, y: 1.6, z: 3 };

AS.World = (function () {

  // ---- Matériaux PBR (photos CC0 détourées, ambientCG) ---------------------
  // Redimensionnées à une résolution raisonnable pour une texture qui se
  // répète 2-3 fois sur un petit bloc (512/384px au lieu des 1024px
  // d'origine) : ~400 Ko au total pour les 4 matériaux au lieu de 16 Mo,
  // assez léger pour être embarqué tel quel partout (Artifact compris) —
  // plus besoin de détecter l'environnement ni de repli procédural pour ça.
  // Chemins écrits en toutes lettres (pas de concaténation "dossier+fichier")
  // pour que le script de build de l'Artifact puisse les remplacer un par un
  // par des data: URI. Utilisées par customMaterial() ci-dessous : tous les
  // niveaux sont désormais créés dans l'éditeur, donc c'est leur seule
  // consommatrice.
  const PBR_PATHS = {
    grass: { color: 'assets/textures/pbr/grass/color.jpg', normal: 'assets/textures/pbr/grass/normal.jpg', roughness: 'assets/textures/pbr/grass/roughness.jpg' },
    rock: { color: 'assets/textures/pbr/rock/color.jpg', normal: 'assets/textures/pbr/rock/normal.jpg', roughness: 'assets/textures/pbr/rock/roughness.jpg' },
    snow: { color: 'assets/textures/pbr/snow/color.jpg', normal: 'assets/textures/pbr/snow/normal.jpg', roughness: 'assets/textures/pbr/snow/roughness.jpg' },
    wood: { color: 'assets/textures/pbr/wood/color.jpg', normal: 'assets/textures/pbr/wood/normal.jpg', roughness: 'assets/textures/pbr/wood/roughness.jpg' },
  };
  const PBR_CACHE = {};
  function loadPBRMaterial(name, tile) {
    const cacheKey = name + '@' + tile;
    if (PBR_CACHE[cacheKey]) return PBR_CACHE[cacheKey];
    const paths = PBR_PATHS[name];
    const loader = new THREE.TextureLoader();
    const map = loader.load(paths.color);
    map.colorSpace = THREE.SRGBColorSpace;
    const normalMap = loader.load(paths.normal);
    const roughnessMap = loader.load(paths.roughness);
    [map, normalMap, roughnessMap].forEach((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(tile, tile);
      t.anisotropy = 4;
    });
    const mat = new THREE.MeshStandardMaterial({ map, normalMap, roughnessMap, roughness: 1 });
    PBR_CACHE[cacheKey] = mat;
    return mat;
  }

  // ---- Flèche indiquant le sens d'un pad de vitesse -------------------------
  // Un cône couché (pas debout) : une fois tourné à plat, il se lit comme une
  // flèche posée sur la surface plutôt qu'un cône planté dedans.
  const BOOST_ARROW_GEO = new THREE.ConeGeometry(0.38, 1.05, 3);
  BOOST_ARROW_GEO.rotateX(Math.PI / 2);
  const BOOST_ARROW_MAT = new THREE.MeshBasicMaterial({ color: 0xfff6df, transparent: true, opacity: 0.92, depthWrite: false });
  // `parent` (optionnel) : si fourni, la flèche devient un enfant de ce mesh
  // (position exprimée en coordonnées LOCALES à `parent`) au lieu d'être
  // ajoutée telle quelle à la scène — indispensable pour un pad de vitesse
  // mobile, sinon la flèche resterait plantée à sa position de départ
  // pendant que le bloc s'en va sur son trajet.
  function addBoostArrow(scene, x, y, z, dir, parent) {
    const mesh = new THREE.Mesh(BOOST_ARROW_GEO, BOOST_ARROW_MAT);
    if (parent) {
      mesh.position.set(x - parent.position.x, y - parent.position.y + 0.05, z - parent.position.z);
      mesh.rotation.y = Math.atan2(dir.x, dir.z);
      parent.add(mesh);
    } else {
      mesh.position.set(x, y + 0.05, z);
      mesh.rotation.y = Math.atan2(dir.x, dir.z);
      scene.add(mesh);
    }
    return mesh;
  }

  // ---------------------------------------------------------------------
  // ---- Relief géométrique de surface (pas une texture plaquée) -----------
  // ---------------------------------------------------------------------
  // Un bloc plein reste un simple pavé pour la COLLISION (voir le mesh créé
  // dans buildCustom, toujours ajouté tel quel à level.collidables) — mais
  // visuellement il porte maintenant de petits panneaux surélevés, enfants
  // du mesh collidable. player.js raycaste avec intersectObjects(...,
  // false) donc SANS récursion dans les enfants : l'hitbox ne change
  // jamais, seul l'habillage visuel s'ajoute par-dessus. Comme ces
  // panneaux sont enfants du mesh, ils suivent automatiquement un bloc
  // rendu mobile (outil Sélection) sans code spécifique.
  //
  // Deux variantes de FORME (pas seulement de couleur), pilotées par le
  // même thème que la texture de la Roche (Type 1/2 dans l'éditeur) :
  //  - 'rock' (Type 1, "anguleux")  : panneaux alignés en grille nette.
  //  - 'snow' (Type 2, "organique") : panneaux légèrement décalés/pivotés,
  //    selon un motif pseudo-aléatoire mais DÉTERMINISTE (dérivé de la
  //    position du bloc) — un même niveau garde toujours le même rendu
  //    d'une ouverture à l'autre.
  const DETAIL_MAT_CACHE = {};

  // Hash entier -> [0,1) déterministe (xorshift), pour un "aléatoire" stable
  // qui ne dépend que de la position du bloc (jamais de Math.random()).
  function hash01(a, b, c) {
    let x = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
    x = (x ^ (x >>> 13)) * 1274126177;
    x = x ^ (x >>> 16);
    return ((x >>> 0) % 10000) / 10000;
  }

  function detailMaterial(type, theme) {
    const key = type + '@' + (theme || 'rock');
    if (DETAIL_MAT_CACHE[key]) return DETAIL_MAT_CACHE[key];
    let mat;
    if (type === 'normal') {
      // Mêmes photos PBR que le bloc de base : les panneaux se distinguent
      // du fond par le relief (ombres portées), pas par une couleur
      // artificiellement différente.
      mat = loadPBRMaterial(theme === 'snow' ? 'snow' : 'rock', 2.5).clone();
      mat.roughness = theme === 'snow' ? 0.85 : 0.95;
    } else {
      mat = customMaterial(type, theme).clone();
      if (mat.color) mat.color = mat.color.clone().multiplyScalar(0.88);
    }
    DETAIL_MAT_CACHE[key] = mat;
    return mat;
  }

  // Fusionne des géométries indexées en une seule : un bloc et tout son relief
  // ne coûtent que 2 appels de rendu, ce qui compte quand le générateur garde
  // plusieurs centaines de blocs en scène.
  function mergeGeometries(list) {
    let vCount = 0, iCount = 0;
    list.forEach((g) => { vCount += g.attributes.position.count; iCount += g.index.count; });
    const pos = new Float32Array(vCount * 3), nor = new Float32Array(vCount * 3), uv = new Float32Array(vCount * 2);
    const idx = new Uint32Array(iCount);
    let vo = 0, io = 0;
    list.forEach((g) => {
      pos.set(g.attributes.position.array, vo * 3);
      nor.set(g.attributes.normal.array, vo * 3);
      uv.set(g.attributes.uv.array, vo * 2);
      const gi = g.index.array;
      for (let i = 0; i < gi.length; i++) idx[io + i] = gi[i] + vo;
      vo += g.attributes.position.count;
      io += gi.length;
      g.dispose();
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    return out;
  }

  function panelGeo(w, h, d, x, y, z, ry) {
    const g = new THREE.BoxGeometry(w, h, d);
    if (ry) g.rotateY(ry);
    g.translate(x, y, z);
    return g;
  }

  function addDetailMesh(mesh, type, theme, geos) {
    if (!geos.length) return;
    const detail = new THREE.Mesh(mergeGeometries(geos), detailMaterial(type, theme));
    detail.castShadow = true; detail.receiveShadow = true;
    mesh.add(detail);
  }

  // Départ/Arrivée : un cadre surélevé (pas un pavage complet) pour garder
  // la couleur du bloc bien lisible — c'est un signal de gameplay.
  function attachRimDetail(mesh, type, theme, bw, bh, bd) {
    const geos = [];
    [1, -1].forEach((sign) => {
      geos.push(panelGeo(bw - 0.14, 0.05, 0.14, 0, bh / 2 + 0.025, sign * (bd / 2 - 0.07)));
      geos.push(panelGeo(0.14, 0.05, bd - 0.14, sign * (bw / 2 - 0.07), bh / 2 + 0.025, 0));
    });
    addDetailMesh(mesh, type, theme, geos);
  }

  function attachBlockDetail(mesh, type, theme, gx, gy, gz, bw, bh, bd) {
    if (type === 'spawn' || type === 'finish') {
      attachRimDetail(mesh, type, theme, bw, bh, bd);
      return;
    }
    // La glace garde un aspect anguleux même en thème "organique" ; le bloc
    // fragile est toujours irrégulier : il est déjà "cassé" par nature.
    const organic = (theme === 'snow' && type !== 'ice') || type === 'crumble';
    const geos = [];
    function jitter(i, mag) {
      return (hash01(gx + i * 7, gy + i * 13, gz + i * 3) - 0.5) * mag;
    }

    // Dessus : panneaux surélevés (sauf pics : les cônes occupent déjà le dessus).
    if (type !== 'spike') {
      const cols = Math.max(1, Math.min(6, Math.round(bw / 1.44)));
      const rows = Math.max(1, Math.min(6, Math.round(bd / 1.44)));
      const cw = bw / cols, cd = bd / rows;
      let i = 0;
      for (let cx = 0; cx < cols; cx++) {
        for (let cz = 0; cz < rows; cz++) {
          i++;
          geos.push(panelGeo(cw * 0.82, 0.07, cd * 0.82,
            -bw / 2 + cw * (cx + 0.5) + (organic ? jitter(i, cw * 0.18) : 0),
            bh / 2 + 0.03,
            -bd / 2 + cd * (cz + 0.5) + (organic ? jitter(i + 10, cd * 0.18) : 0),
            organic ? jitter(i + 20, 0.5) : 0));
        }
      }
    }

    // 4 faces latérales : 2 panneaux par face.
    [{ axis: 'z', sign: 1 }, { axis: 'z', sign: -1 }, { axis: 'x', sign: 1 }, { axis: 'x', sign: -1 }].forEach((s, si) => {
      const span = s.axis === 'z' ? bw : bd;
      if (span < 0.9 || bh < 0.5) return;
      for (let row = 0; row < 2; row++) {
        const panelW = span * 0.42, panelH = bh * 0.42;
        const along = (row === 0 ? -1 : 1) * 0.24 * span + (organic ? jitter(si * 4 + row, span * 0.06) : 0);
        const y = -bh / 2 + bh * (row === 0 ? 0.3 : 0.7) + (organic ? jitter(si * 4 + row + 30, bh * 0.08) : 0);
        const out = (s.axis === 'z' ? bd : bw) / 2 + 0.03;
        const ry = organic ? jitter(si * 4 + row + 40, 0.25) : 0;
        if (s.axis === 'z') geos.push(panelGeo(panelW, panelH, 0.07, along, y, s.sign * out, ry));
        else geos.push(panelGeo(0.07, panelH, panelW, s.sign * out, y, along, ry));
      }
    });
    addDetailMesh(mesh, type, theme, geos);
  }

  // ---- Pics mortels : décor uniquement (le bloc plein en dessous porte la
  // collision réelle, voir userData.surface='spike' et player.js) — un
  // petit groupe de cônes plutôt qu'un seul, pour bien lire "danger" de loin.
  const SPIKE_MAT = new THREE.MeshStandardMaterial({ color: 0xc9463a, emissive: 0x3a0805, emissiveIntensity: 0.5, roughness: 0.4, metalness: 0.3 });
  // `parent` (optionnel) : voir addBoostArrow — des pics mobiles doivent
  // suivre leur bloc porteur sur son trajet.
  function addSpikeCones(scene, x, topY, z, sx, sz, parent) {
    const ox = parent ? -parent.position.x : 0;
    const oy = parent ? -parent.position.y : 0;
    const oz = parent ? -parent.position.z : 0;
    const mesh = spikeConesMesh(sx, sz, 'top');
    mesh.position.set(ox + x, oy + topY, oz + z);
    (parent || scene).add(mesh);
  }

  // Cônes répartis sur une face de dimensions (a, b) — `face` : top, bottom,
  // +x, -x, +z, -z ; pointent vers l'extérieur depuis l'origine du mesh.
  function spikeConesMesh(a, b, face) {
    const cols = Math.max(2, Math.min(10, Math.round(a / 0.7)));
    const rows = Math.max(1, Math.min(10, Math.round(b / 0.7)));
    const coneH = 0.34, coneR = Math.min(a / cols, b / rows) * 0.42;
    const geos = [];
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const g = new THREE.ConeGeometry(coneR, coneH, 6);
        g.translate((i + 0.5) / cols * a - a / 2, coneH / 2, (j + 0.5) / rows * b - b / 2);
        if (face === 'bottom') g.rotateX(Math.PI);
        else if (face === '+x') g.rotateZ(-Math.PI / 2);
        else if (face === '-x') g.rotateZ(Math.PI / 2);
        else if (face === '+z') g.rotateX(Math.PI / 2);
        else if (face === '-z') g.rotateX(-Math.PI / 2);
        geos.push(g);
      }
    }
    const mesh = new THREE.Mesh(mergeGeometries(geos), SPIKE_MAT);
    mesh.castShadow = true;
    return mesh;
  }

  // ==========================================================================
  // Construction d'un niveau créé dans l'éditeur (liste de blocs voxel).
  // blocks: [{ gx, gy, gz, type, rot }]. C'est désormais la SEULE façon de
  // construire un niveau jouable, qu'il s'agisse d'un niveau personnel ou
  // d'un niveau assigné à une difficulté principale.
  // ==========================================================================
  const CUSTOM_MAT_CACHE = {};
  // `theme` ne change que le bloc "Roche" (le plus courant) : deux thèmes de
  // texture au choix dans l'éditeur, sans dupliquer les blocs au rôle
  // fonctionnel (glace/vitesse/rebond/pics...) qui gardent leur couleur.
  function customMaterial(type, theme) {
    const cacheKey = type + '@' + (theme || 'rock');
    if (CUSTOM_MAT_CACHE[cacheKey]) return CUSTOM_MAT_CACHE[cacheKey];
    let mat;
    if (type === 'ice') {
      mat = new THREE.MeshStandardMaterial({ map: AS.Util.iceTexture(33), roughness: 0.15, metalness: 0.05 });
    } else if (type === 'boost') {
      mat = new THREE.MeshStandardMaterial({ color: 0xff8a4c, emissive: 0x552200, roughness: 0.4 });
    } else if (type === 'bounce') {
      mat = new THREE.MeshStandardMaterial({ color: 0xc86bff, emissive: 0x3d0a55, roughness: 0.35 });
    } else if (type === 'crumble') {
      mat = new THREE.MeshStandardMaterial({ color: 0x9c8060, roughness: 0.9 });
    } else if (type === 'perfectBounce') {
      mat = new THREE.MeshStandardMaterial({ color: 0x5df2c8, emissive: 0x0a5c46, emissiveIntensity: 0.7, roughness: 0.25, metalness: 0.4 });
    } else if (type === 'spike') {
      mat = new THREE.MeshStandardMaterial({ color: 0x3a3a3f, roughness: 0.6, metalness: 0.3 });
    } else if (type === 'spawn') {
      mat = new THREE.MeshStandardMaterial({ color: 0x6ee7a0, emissive: 0x0c3a1e, roughness: 0.6 });
    } else if (type === 'finish') {
      mat = new THREE.MeshStandardMaterial({ color: 0xf3d98a, emissive: 0x442f00, emissiveIntensity: 0.5, roughness: 0.5 });
    } else {
      // Bloc "Roche" par défaut : vraie photo PBR (couleur + normale +
      // rugosité) au lieu de l'ancienne texture procédurale dessinée en
      // canvas — tous les niveaux étant désormais créés dans l'éditeur,
      // c'est le matériau que le joueur voit le plus souvent. Deux thèmes
      // au choix (voir l'éditeur) : Type 1 = roche, Type 2 = neige.
      mat = loadPBRMaterial(theme === 'snow' ? 'snow' : 'rock', 2.5);
    }
    CUSTOM_MAT_CACHE[cacheKey] = mat;
    return mat;
  }

  // Types "pleins" : posent un bloc solide (collidable) à la cellule.
  const SOLID_TYPES = ['normal', 'ice', 'boost', 'bounce', 'crumble', 'perfectBounce', 'spike', 'spawn', 'finish'];
  // Types "marqueurs" : pas de bloc solide — un objet de jeu (déclencheur,
  // zone...) est construit à la position de la cellule. 'phase' est posé PAR
  // PAIRES : le 1er et le 2e marqueur posés dans le niveau se lient
  // ensemble, le 3e et le 4e forment une 2e paire, etc. (un marqueur seul et
  // non apparié est ignoré). 'orb' est une sphère de rebond immatérielle
  // (voir plus bas) : jamais de collision solide, on la traverse librement —
  // seule une chute dedans déclenche le rebond.
  //
  // Il n'y a plus de type "plateforme mobile" dédié : n'IMPORTE QUEL bloc
  // plein peut devenir mobile en lui donnant une liste de points de passage
  // (voir b.waypoints ci-dessous, posés avec l'outil Sélection de l'éditeur)
  // — il garde alors son propre type/matériau/comportement (glace, vitesse,
  // rebond...) tout en se déplaçant.
  const MARKER_TYPES = ['checkpoint', 'wind', 'lowgrav', 'phase', 'orb'];
  const EDITOR_TYPES = SOLID_TYPES.concat(MARKER_TYPES);

  // Plateforme mobile : `points` = arrêts en coordonnées MONDE, parcourus en
  // boucle (dernier -> premier). `speed` en unités/seconde : le temps d'un trajet
  // dépend de la distance réelle. La position est une FONCTION DU TEMPS du
  // niveau (setTime) et non un compteur interne : le générateur peut ainsi
  // calculer d'avance où sera la plateforme à une image donnée, et le jeu
  // reproduit exactement ce que le bot a joué.
  function moverTiming(points, speed, pause) {
    const spd = speed || 2.5;
    const n = points.length;
    const legTimes = points.map((p, i) => Math.max(p.distanceTo(points[(i + 1) % n]) / spd, 0.15));
    const legTotals = legTimes.map((t) => t + pause);
    return { legTimes, legTotals, cycle: legTotals.reduce((a, b) => a + b, 0) };
  }

  function makeMover(mesh, points, speed, pause, phase) {
    const wait = pause == null ? 0.28 : pause;
    const n = points.length;
    const { legTimes, legTotals, cycle } = moverTiming(points, speed, wait);
    const prevPos = mesh.position.clone();
    const mover = {
      mesh,
      delta: new THREE.Vector3(),
      setTime: (time) => {
        prevPos.copy(mesh.position);
        const clock = (((time + (phase || 0)) % cycle) + cycle) % cycle;
        let legIndex = 0, acc = 0;
        while (legIndex < n - 1 && acc + legTotals[legIndex] <= clock) { acc += legTotals[legIndex]; legIndex++; }
        const legClock = clock - acc;
        const legTime = legTimes[legIndex];
        const from = points[legIndex];
        const to = points[(legIndex + 1) % n];
        if (legClock < legTime) mesh.position.lerpVectors(from, to, AS.Util.smoothstep(0, 1, legClock / legTime));
        else mesh.position.copy(to);
        mover.delta.copy(mesh.position).sub(prevPos);
        mesh.updateMatrixWorld(true);
      },
    };
    mesh.userData.isMover = true;
    mesh.userData.moverRef = mover;
    return mover;
  }

  // Une image de simulation du niveau, commune au jeu et au générateur :
  // plateformes mobiles, plateformes fragiles, portes de phase. Renvoie true
  // si une porte de phase vient de téléporter le joueur.
  function stepLevel(level, player, dt) {
    level.frame = (level.frame || 0) + 1;
    const time = level.frame * dt;
    for (const m of level.movers) m.setTime(time);

    for (const c of level.crumbles) {
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
      } else if (st === 'gone') {
        c.userData.crumbleT += dt;
        if (c.userData.crumbleT > 3.2) {
          c.userData.crumbleState = 'idle';
          c.userData.disabled = false;
          c.visible = true;
        }
      }
    }

    let teleported = false;
    for (const t of level.triggers) {
      if (t.type !== 'phaseGate') continue;
      if (t.cooldown > 0) { t.cooldown = Math.max(0, t.cooldown - dt); continue; }
      if (teleported || player.position.distanceTo(t.pos) > t.radius) continue;
      const spd = player.velocity.length();
      player.position.copy(t.pairPos);
      player.velocity.copy(t.dir).multiplyScalar(Math.max(spd, 6));
      player.grounded = false;
      player.jumpsUsed = 0;
      t.cooldown = AS.CFG.phaseGateCooldown;
      for (const other of level.triggers) {
        if (other.type === 'phaseGate' && other.pos === t.pairPos) other.cooldown = AS.CFG.phaseGateCooldown;
      }
      teleported = true;
    }
    return teleported;
  }

  const SURFACE_BY_TYPE = { boost: 'boost', bounce: 'bounce', ice: 'ice', crumble: 'crumble', perfectBounce: 'perfectBounce', spike: 'spike' };

  // Propriétés de jeu d'une pièce du générateur, posées à l'identique sur le
  // mesh de simulation (gen.js) et sur le vrai mesh affiché (addPieces).
  function applySolid(mesh, p) {
    applySurface(mesh, p);
  }
  function applySurface(mesh, p) {
    mesh.userData.surface = SURFACE_BY_TYPE[p.type] || 'normal';
    if (p.type === 'boost') mesh.userData.boostDir = new THREE.Vector3(p.boostDir[0], 0, p.boostDir[1]);
    if (p.type === 'bounce') mesh.userData.bounceForce = p.bounceForce != null ? p.bounceForce : 19;
    if (p.type === 'crumble') mesh.userData.crumbleTime = p.crumbleTime != null ? p.crumbleTime : 0.45;
  }

  function buildCustom(scene, blocks, theme) {
    const cell = AS.EDITOR_CELL;
    const collidables = [];
    let spawnPos = new THREE.Vector3(0, 2, 0);
    let maxAltitude = 4;
    const triggers = [];
    const windZones = [];
    const gravityZones = [];
    const checkpoints = [];
    const movers = [];
    const decorations = [];
    const bounceOrbs = [];

    for (const b of blocks) {
      if (MARKER_TYPES.includes(b.type)) continue;
      // Un "quart de bloc" (outil Construire, éditeur) occupe un quart de
      // la surface au sol d'un bloc plein (X et Z divisés par 2 chacun) —
      // la hauteur, elle, reste toujours sur la grille normale. `step`
      // donne le pas de grille EFFECTIF de CE bloc, `b.gx`/`b.gz` étant
      // alors exprimés dans cette échelle plus fine.
      const step = b.size === 'quarter' ? { x: cell.x / 2, z: cell.z / 2 } : { x: cell.x, z: cell.z };
      const wx = b.gx * step.x, wy = b.gy * cell.y, wz = b.gz * step.z;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(step.x * 0.96, cell.y * 0.92, step.z * 0.96),
        customMaterial(b.type, theme)
      );
      mesh.position.set(wx, wy, wz);
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.userData.surface = SURFACE_BY_TYPE[b.type] || 'normal';
      attachBlockDetail(mesh, b.type, theme, b.gx, b.gy, b.gz, step.x * 0.96, cell.y * 0.92, step.z * 0.96);
      const isMobile = !!(b.waypoints && b.waypoints.length);
      if (b.type === 'boost') {
        const rot = (b.rot || 0) * Math.PI / 2;
        mesh.userData.boostDir = new THREE.Vector3(Math.sin(rot), 0, Math.cos(rot));
        const arrow = addBoostArrow(scene, wx, wy + cell.y * 0.46, wz, mesh.userData.boostDir, isMobile ? mesh : null);
        if (b.size === 'quarter') arrow.scale.set(0.5, 0.5, 0.5);
      }
      // Force de propulsion réglable précisément (outil Sélection, éditeur) —
      // 19 reste la valeur par défaut d'un bloc jamais réglé (comportement
      // d'origine inchangé).
      if (b.type === 'bounce') mesh.userData.bounceForce = b.bounceForce != null ? b.bounceForce : 19;
      // Idem pour le temps avant effondrement d'une plateforme fragile — lu
      // par stepLevel (ci-dessus) et stepCrumbles (analyzer.js), qui
      // doivent rester en accord sur cette valeur pour que le bot analyse
      // exactement le même comportement que le jeu réel.
      if (b.type === 'crumble') mesh.userData.crumbleTime = b.crumbleTime != null ? b.crumbleTime : 0.45;
      if (b.type === 'spike') addSpikeCones(scene, wx, wy + cell.y * 0.46, wz, step.x * 0.9, step.z * 0.9, isMobile ? mesh : null);
      scene.add(mesh);
      collidables.push(mesh);
      maxAltitude = Math.max(maxAltitude, wy + cell.y);

      // N'IMPORTE QUEL bloc plein peut être rendu mobile (voir l'outil
      // Sélection de l'éditeur) : il garde son propre type/matériau/
      // comportement tout en faisant la tournée de ses points de passage,
      // en boucle infinie — plus de type "plateforme mobile" à part. Le
      // premier arrêt vient DIRECTEMENT de mesh.position (déjà placé à la
      // bonne échelle ci-dessus, pleine ou quart) ; les points de passage,
      // eux, sont toujours posés avec l'outil Sélection à l'échelle pleine
      // (voir editor.js) — makeMover ne mélange donc jamais deux
      // pas de grille différents dans un même calcul.
      if (isMobile) {
        const points = [mesh.position.clone()].concat(
          b.waypoints.map((wp) => new THREE.Vector3(wp.gx * cell.x, wp.gy * cell.y, wp.gz * cell.z))
        );
        movers.push(makeMover(mesh, points, b.speed));
        b.waypoints.forEach((wp) => {
          maxAltitude = Math.max(maxAltitude, wp.gy * cell.y + cell.y);
        });
      }

      if (b.type === 'spawn') spawnPos = new THREE.Vector3(wx, wy + cell.y / 2 + 0.6, wz);
      if (b.type === 'finish') {
        // `pos` référence DIRECTEMENT mesh.position (pas une copie) : si ce
        // bloc est rendu mobile (outil Sélection), le déclencheur suit son
        // déplacement sans code particulier. `half` donne les dimensions
        // réelles du pavé de collision (à SA taille, pleine ou quart), pour
        // un contact EXACT (voir processTriggers côté main.js) plutôt
        // qu'une simple proximité — la partie doit se terminer au moment
        // précis où le joueur touche la plateforme, ni avant, ni après.
        triggers.push({
          type: 'finish', pos: mesh.position, radius: 2.4,
          half: { x: step.x * 0.96 / 2, y: cell.y * 0.92 / 2, z: step.z * 0.96 / 2 },
        });
      }
    }

    // ---- Marqueurs : déclencheurs, zones, téléporteurs, plateformes mobiles, décor
    function markerWorldPos(b) {
      return new THREE.Vector3(b.gx * cell.x, b.gy * cell.y, b.gz * cell.z);
    }
    function rotDir(b) {
      const a = (b.rot || 0) * Math.PI / 2;
      return new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
    }

    for (const b of blocks) {
      if (b.type === 'orb') {
        const p = markerWorldPos(b);
        const r = cell.x * 0.42;
        const mat = new THREE.MeshStandardMaterial({
          color: 0xff9ed6, emissive: 0x6b0a45, emissiveIntensity: 0.6, roughness: 0.25, metalness: 0.5,
          transparent: true, opacity: 0.6,
        });
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), mat);
        mesh.position.copy(p);
        scene.add(mesh);
        decorations.push({ mesh, spin: 0.5 });
        bounceOrbs.push({ pos: p, radius: r, force: 22 });
      } else if (b.type === 'checkpoint') {
        const p = markerWorldPos(b);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        pole.position.set(p.x, p.y + 1.2, p.z);
        const flagMat = new THREE.MeshStandardMaterial({ color: 0x2c2c2c, emissive: 0x111111, side: THREE.DoubleSide });
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), flagMat);
        flag.position.set(p.x + 0.5, p.y + 2.0, p.z);
        scene.add(pole, flag);
        const idx = checkpoints.length;
        checkpoints.push({ pos: new THREE.Vector3(p.x, p.y + 0.1, p.z), flagMat, flag, pole });
        triggers.push({ type: 'checkpoint', index: idx, pos: p.clone(), radius: 2.2 });
      } else if (b.type === 'wind') {
        const p = markerWorldPos(b);
        const dir = rotDir(b);
        // 1 = Faible, 2 = Moyen (comportement d'origine), 3 = Fort.
        const powerScale = { 1: 0.55, 2: 1, 3: 1.7 }[b.power || 2] || 1;
        const sx = cell.x * 1.1, sy = cell.y * 4, sz = cell.z * 1.1;
        const min = new THREE.Vector3(p.x - sx / 2, p.y - sy / 2, p.z - sz / 2);
        const max = new THREE.Vector3(p.x + sx / 2, p.y + sy / 2, p.z + sz / 2);
        const force = new THREE.Vector3(dir.x * 3 * powerScale, 9 * powerScale, dir.z * 3 * powerScale);
        windZones.push({ min, max, force });
        const mat = new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.08, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(Math.min(sx, sz) / 2, Math.min(sx, sz) / 2, sy, 16, 1, true), mat);
        mesh.position.copy(p);
        scene.add(mesh);
        decorations.push({ mesh, spin: 0.6 });
      } else if (b.type === 'lowgrav') {
        const p = markerWorldPos(b);
        const sx = cell.x * 2.2, sy = cell.y * 3, sz = cell.z * 2.2;
        const min = new THREE.Vector3(p.x - sx / 2, p.y - sy / 2, p.z - sz / 2);
        const max = new THREE.Vector3(p.x + sx / 2, p.y + sy / 2, p.z + sz / 2);
        gravityZones.push({ min, max, scale: 0.35 });
        const mat = new THREE.MeshBasicMaterial({ color: 0xd9c6ff, transparent: true, opacity: 0.06, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(Math.max(sx, sz) / 2, 20, 14), mat);
        mesh.position.copy(p);
        scene.add(mesh);
      }
    }

    // ---- Paires (posées dans l'ordre) : portes de phase et plateformes mobiles
    function pairsOf(type) {
      const list = blocks.filter((b) => b.type === type);
      const pairs = [];
      for (let i = 0; i + 1 < list.length; i += 2) pairs.push([list[i], list[i + 1]]);
      return pairs;
    }
    function phaseGateVisual(pos, dir, color) {
      const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.7, roughness: 0.3, metalness: 0.5, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.14, 10, 24), mat);
      ring.position.copy(pos);
      ring.lookAt(pos.clone().add(dir));
      const disc = new THREE.Mesh(new THREE.CircleGeometry(1.2, 24), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, side: THREE.DoubleSide }));
      disc.position.copy(pos);
      disc.lookAt(pos.clone().add(dir));
      scene.add(ring, disc);
      decorations.push({ mesh: ring, spin: 0.6 });
    }
    // Une couleur par paire (les deux portes d'une même paire partagent leur
    // couleur, pour que le lien entre elles soit lisible d'un coup d'oeil) —
    // les paires suivantes tournent dans une petite palette pour rester
    // distinguables les unes des autres.
    const PHASE_GATE_COLORS = [0x6ee7ff, 0xff6ea0, 0xffd166, 0x9dff6e, 0xc792ff, 0xff8a5c];
    pairsOf('phase').forEach(([ba, bb], i) => {
      const pa = markerWorldPos(ba), pb = markerWorldPos(bb);
      const da = rotDir(ba), db = rotDir(bb);
      const color = PHASE_GATE_COLORS[i % PHASE_GATE_COLORS.length];
      phaseGateVisual(pa, da, color);
      phaseGateVisual(pb, db, color);
      triggers.push({ type: 'phaseGate', pos: pa, dir: db, radius: 1.6, cooldown: 0, pairPos: pb });
      triggers.push({ type: 'phaseGate', pos: pb, dir: da, radius: 1.6, cooldown: 0, pairPos: pa });
    });
    const env = buildEnvironment(scene);

    return {
      collidables,
      crumbles: collidables.filter((m) => m.userData.surface === 'crumble'),
      movers,
      triggers,
      windZones,
      gravityZones,
      checkpoints,
      decorations,
      orbitals: [],
      bounceOrbs,
      fx: env.fx,
      sky: env.sky,
      mountains: env.mountains,
      sun: env.sun,
      maxAltitude,
      spawn: spawnPos,
      frame: 0,
    };
  }

  function buildEnvironment(scene) {
    const fx = [];
    const sky = AS.Fx.buildSky(scene);
    const mountains = AS.Fx.buildMountainRing(scene, 0, 0, 220, 42);
    fx.push(AS.Fx.buildDust(scene, 150));

    const hemi = new THREE.HemisphereLight(0xbfe0ff, 0x3a3226, 0.8);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff2d9, 1.15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 60;
    sun.shadow.camera.left = -22; sun.shadow.camera.right = 22;
    sun.shadow.camera.top = 22; sun.shadow.camera.bottom = -22;
    sun.shadow.bias = -0.0025;
    sun.target = new THREE.Object3D();
    scene.add(sun, sun.target);
    scene.fog = new THREE.Fog(0x3a2a4a, 40, 200);
    return { fx, sky, mountains, sun };
  }

  // ==========================================================================
  // Niveau généré (voir gen.js) : le niveau arrive partie par partie, sous
  // forme de "pièces" en coordonnées libres, et les parties déjà passées sont
  // retirées de la scène — une partie peut donc durer à l'infini.
  // ==========================================================================
  const SIM_MAT = new THREE.MeshBasicMaterial();

  // Pavé dont la texture garde la même échelle quelle que soit sa taille.
  function worldBox(sx, sy, sz) {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    const uv = g.attributes.uv;
    const sizes = [[sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]];
    for (let f = 0; f < 6; f++) {
      for (let v = 0; v < 4; v++) {
        const i = f * 4 + v;
        uv.setXY(i, uv.getX(i) * sizes[f][0] / 2.88, uv.getY(i) * sizes[f][1] / 2.88);
      }
    }
    return g;
  }

  function moverPoints(p) {
    return p.mover.points.map((q) => new THREE.Vector3(q[0], q[1], q[2]));
  }

  // Version sans rendu d'une pièce pleine, utilisée par le fantôme du
  // générateur : même collision et même comportement que la vraie.
  function simSolid(p) {
    // Vraie géométrie à la bonne taille (pas un cube mis à l'échelle) : les
    // rayons donnent ainsi exactement les mêmes nombres qu'avec le mesh affiché.
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(p.sx, p.sy, p.sz), SIM_MAT);
    mesh.position.set(p.x, p.y, p.z);
    applySolid(mesh, p);
    mesh.updateMatrixWorld(true);
    const mover = p.mover ? makeMover(mesh, moverPoints(p), p.mover.speed, p.mover.pause, p.mover.phase) : null;
    return { mesh, mover };
  }

  function addSolidPiece(level, group, p, theme, section) {
    const mesh = new THREE.Mesh(worldBox(p.sx, p.sy, p.sz), customMaterial(p.type, theme));
    mesh.position.set(p.x, p.y, p.z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    applySolid(mesh, p);
    const cgx = Math.round(p.x * 3), cgy = Math.round(p.y * 3), cgz = Math.round(p.z * 3);
    if (p.type === 'spike') {
      const face = p.spikeFace || 'top';
      const a = face === '+x' || face === '-x' ? p.sz : p.sx;
      const b = face === '+z' || face === '-z' ? p.sy : (face === 'top' || face === 'bottom' ? p.sz : p.sy);
      const cones = spikeConesMesh(a * 0.96, b * 0.96, face);
      const off = { top: [0, p.sy / 2, 0], bottom: [0, -p.sy / 2, 0], '+x': [p.sx / 2, 0, 0], '-x': [-p.sx / 2, 0, 0], '+z': [0, 0, p.sz / 2], '-z': [0, 0, -p.sz / 2] }[face];
      cones.position.set(off[0], off[1], off[2]);
      mesh.add(cones);
    } else if (Math.max(p.sx, p.sz) < 40 && p.sy < 16) {
      attachBlockDetail(mesh, p.type, theme, cgx, cgy, cgz, p.sx, p.sy, p.sz);
    }
    if (p.type === 'boost') {
      const dir = mesh.userData.boostDir;
      const n = Math.max(1, Math.min(6, Math.round(Math.max(p.sx, p.sz) / 3.5)));
      const span = Math.abs(dir.x) * p.sx + Math.abs(dir.z) * p.sz;
      for (let i = 0; i < n; i++) {
        const k = ((i + 0.5) / n - 0.5) * span * 0.8;
        addBoostArrow(null, p.x + dir.x * k, p.y + p.sy / 2 + 0.02, p.z + dir.z * k, dir, mesh);
      }
    }
    group.add(mesh);
    mesh.updateMatrixWorld(true);
    level.collidables.push(mesh);
    if (p.type === 'crumble') level.crumbles.push(mesh);
    section.solids.push(mesh);
    if (p.mover) {
      const mover = makeMover(mesh, moverPoints(p), p.mover.speed, p.mover.pause, p.mover.phase);
      mover.setTime((level.frame || 0) / 60);
      level.movers.push(mover);
      section.movers.push(mover);
    }
    if (p.finish) {
      const t = {
        type: 'finish', pos: mesh.position, radius: Math.hypot(p.sx, p.sz) / 2 + 3,
        half: { x: p.sx / 2, y: p.sy / 2, z: p.sz / 2 },
      };
      level.triggers.push(t);
      section.triggers.push(t);
    }
  }

  function addCheckpointPiece(level, group, p, section) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    pole.position.set(p.x - 1.2, p.y + 1.2, p.z);
    const flagMat = new THREE.MeshStandardMaterial({ color: 0x2c2c2c, emissive: 0x111111, side: THREE.DoubleSide });
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), flagMat);
    flag.position.set(p.x - 0.7, p.y + 2, p.z);
    group.add(pole, flag);
    const cp = { pos: new THREE.Vector3(p.x, p.y + 0.1, p.z), flagMat, flag, pole, sectionIndex: p.sectionIndex };
    const t = {
      type: 'checkpoint', cp, pos: new THREE.Vector3(p.x, p.y, p.z), radius: Math.hypot(p.hx, p.hz) + 3,
      half: { x: p.hx, y: 2.6, z: p.hz },
    };
    level.checkpoints.push(cp);
    level.triggers.push(t);
    section.checkpoints.push(cp);
    section.triggers.push(t);
  }

  function addOrbPiece(level, group, p, section) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff9ed6, emissive: 0x6b0a45, emissiveIntensity: 0.6, roughness: 0.25, metalness: 0.5,
      transparent: true, opacity: 0.6,
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.r, 18, 12), mat);
    mesh.position.set(p.x, p.y, p.z);
    group.add(mesh);
    const deco = { mesh, spin: 0.5 };
    const orb = { pos: mesh.position.clone(), radius: p.r, force: p.force };
    level.decorations.push(deco);
    level.bounceOrbs.push(orb);
    section.decorations.push(deco);
    section.orbs.push(orb);
  }

  function addZonePiece(level, group, p, section) {
    const min = new THREE.Vector3(p.min[0], p.min[1], p.min[2]);
    const max = new THREE.Vector3(p.max[0], p.max[1], p.max[2]);
    const wind = p.k === 'wind';
    const mat = new THREE.MeshBasicMaterial({
      color: wind ? 0xbfe8ff : 0xd9c6ff, transparent: true, opacity: wind ? 0.1 : 0.08, side: THREE.DoubleSide, depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(max.x - min.x, max.y - min.y, max.z - min.z), mat);
    mesh.position.addVectors(min, max).multiplyScalar(0.5);
    group.add(mesh);
    if (wind) {
      const z = { min, max, force: new THREE.Vector3(p.force[0], p.force[1], p.force[2]) };
      level.windZones.push(z);
      section.winds.push(z);
    } else {
      const z = { min, max, scale: p.scale };
      level.gravityZones.push(z);
      section.gravs.push(z);
    }
  }

  function phaseVisual(group, level, section, pos, dir, color) {
    const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.7, roughness: 0.3, metalness: 0.5, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.14, 10, 24), mat);
    ring.position.copy(pos);
    ring.lookAt(pos.clone().add(dir));
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.2, 24), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, side: THREE.DoubleSide }));
    disc.position.copy(pos);
    disc.lookAt(pos.clone().add(dir));
    group.add(ring, disc);
    const deco = { mesh: ring, spin: 0.6 };
    level.decorations.push(deco);
    section.decorations.push(deco);
  }

  function addPhasePiece(level, group, p, section) {
    const pa = new THREE.Vector3(p.a[0], p.a[1], p.a[2]);
    const pb = new THREE.Vector3(p.b[0], p.b[1], p.b[2]);
    const dir = new THREE.Vector3(p.dir[0], 0, p.dir[1]);
    const color = [0x6ee7ff, 0xff6ea0, 0xffd166, 0x9dff6e, 0xc792ff, 0xff8a5c][(p.color || 0) % 6];
    phaseVisual(group, level, section, pa, dir, color);
    phaseVisual(group, level, section, pb, dir, color);
    const ta = { type: 'phaseGate', pos: pa, dir, radius: p.radius, cooldown: 0, pairPos: pb };
    const tb = { type: 'phaseGate', pos: pb, dir: dir.clone().negate(), radius: p.radius, cooldown: 0, pairPos: pa };
    level.triggers.push(ta, tb);
    section.triggers.push(ta, tb);
  }

  function createRunLevel(scene) {
    const env = buildEnvironment(scene);
    return {
      collidables: [], crumbles: [], movers: [], triggers: [], windZones: [], gravityZones: [],
      checkpoints: [], decorations: [], orbitals: [], bounceOrbs: [],
      fx: env.fx, sky: env.sky, mountains: env.mountains, sun: env.sun,
      maxAltitude: 0, spawn: null, frame: 0, generated: true, sections: {}, scene,
    };
  }

  function addPieces(level, pieces, theme, sectionId) {
    // Une partie peut arriver en plusieurs morceaux, pour étaler le travail
    // sur plusieurs images.
    let section = level.sections[sectionId];
    if (!section) {
      const group = new THREE.Group();
      section = {
        group, solids: [], movers: [], triggers: [], checkpoints: [], decorations: [], orbs: [], winds: [], gravs: [],
      };
      level.sections[sectionId] = section;
      level.scene.add(group);
    }
    const group = section.group;
    for (const p of pieces) {
      if (p.k === 'box') addSolidPiece(level, group, p, theme, section);
      else if (p.k === 'checkpoint') addCheckpointPiece(level, group, p, section);
      else if (p.k === 'orb') addOrbPiece(level, group, p, section);
      else if (p.k === 'wind' || p.k === 'lowgrav') addZonePiece(level, group, p, section);
      else if (p.k === 'phase') addPhasePiece(level, group, p, section);
    }
    group.updateMatrixWorld(true);
  }

  // Filtrage EN PLACE : le joueur et la caméra gardent une référence vers ces
  // tableaux, ils ne doivent jamais être remplacés.
  function dropFrom(list, removed) {
    if (!removed.length) return;
    const set = new Set(removed);
    let w = 0;
    for (let i = 0; i < list.length; i++) if (!set.has(list[i])) list[w++] = list[i];
    list.length = w;
  }

  const SHARED_GEOS = new Set([BOOST_ARROW_GEO]);
  function removeSection(level, sectionId) {
    const s = level.sections[sectionId];
    if (!s) return;
    dropFrom(level.collidables, s.solids);
    dropFrom(level.crumbles, s.solids);
    dropFrom(level.movers, s.movers);
    dropFrom(level.triggers, s.triggers);
    dropFrom(level.checkpoints, s.checkpoints);
    dropFrom(level.decorations, s.decorations);
    dropFrom(level.bounceOrbs, s.orbs);
    dropFrom(level.windZones, s.winds);
    dropFrom(level.gravityZones, s.gravs);
    level.scene.remove(s.group);
    s.group.traverse((o) => { if (o.geometry && !SHARED_GEOS.has(o.geometry)) o.geometry.dispose(); });
    delete level.sections[sectionId];
  }

  // Remet les plateformes fragiles d'aplomb (retour à un point de contrôle).
  function resetCrumbles(level) {
    for (const c of level.crumbles) {
      c.userData.crumbleState = 'idle';
      c.userData.disabled = false;
      c.visible = true;
      c.rotation.set(0, 0, 0);
      c.updateMatrixWorld(true);
    }
  }

  return {
    buildCustom, EDITOR_TYPES, stepLevel, simSolid, applySurface, moverTiming, createRunLevel, addPieces, removeSection, resetCrumbles,
  };
})();

// Recopie les règles utilisateur (AS.Storage.getRules(), voir l'écran
// "Règles" dans main.js) sur AS.CFG, EN PLACE (Object.assign sur l'objet
// existant, jamais une réaffectation) : tout le code qui garde `const CFG =
// AS.CFG` en portée (player.js, analyzer.js...) continue de lire les
// valeurs à jour sans rien recharger. Appelée une fois au chargement
// (ci-dessous) et à chaque fois qu'une règle change (voir
// AS.Storage.setRule/resetRules). perfectBounceMin et orbitCaptureSpeed
// suivent maxSpeed/jumpVel plutôt que d'être des règles à part : ce sont
// des seuils internes dérivés de la vitesse générale du jeu, pas des
// réglages qu'un joueur penserait à ajuster séparément.
AS.World.applyRules = function (forced) {
  const rules = forced || AS.Storage.getRules();
  Object.assign(AS.CFG, {
    maxSpeed: rules.maxSpeed, boostMaxSpeed: rules.boostMaxSpeed,
    jumpVel: rules.jumpVel, doubleJumpVel: rules.doubleJumpVel,
    wallJumpVelY: rules.wallJumpVelY, wallJumpPush: rules.wallJumpPush,
    dashSpeed: rules.dashSpeed, dashDuration: rules.dashDuration, dashCharges: rules.dashCharges,
    gravityRise: rules.gravityRise, gravityFall: rules.gravityFall,
    iceAccel: rules.iceAccel, iceFriction: rules.iceFriction,
    perfectBounceMin: rules.jumpVel,
    orbitCaptureSpeed: rules.maxSpeed * 0.78,
  });
};
AS.World.applyRules();
