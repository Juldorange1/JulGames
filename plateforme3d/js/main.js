// ============================================================================
// ASCENSION — main.js
// Bootstrap : scène/rendu, entrées clavier (raccourcis reconfigurables),
// machine d'états des écrans (menu, jeu, pause, résultat, éditeur), boucle de
// jeu (physique joueur, plateformes mobiles, déclencheurs, HUD), personnage
// visuel avec un peu de "jus" (squash/stretch, particules).
//
// La caméra est à AXE FIXE (AS.FixedCamera) : pas de pointer lock, pas de
// contrôle souris — juste un suivi lissé du joueur, toujours sous le même
// angle. Les déplacements de l'éditeur utilisent leur propre caméra à
// l'orbite (voir editor.js), pilotée à la souris normale (pas de lock).
// ============================================================================
(function () {
  const $ = AS.Hud.$;
  const canvas = document.getElementById('gameCanvas');

  // ---------------------------------------------------------------------
  // Rendu THREE.js (persistant, partagé entre le jeu et l'éditeur)
  // ---------------------------------------------------------------------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Tone mapping filmique : sans lui, les surfaces émissives (pads, portes de
  // phase...) et le ciel en plein jour "cramaient" en blanc pur au lieu de
  // garder un dégradé de hautes lumières — un rendu bien plus réaliste pour
  // un coût nul (juste une passe de tonemap intégrée au renderer).
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 400);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    AS.Editor.resize();
  });

  // Un seul écouteur global plutôt qu'un appel dans chaque gestionnaire de
  // bouton : couvre tous les boutons de l'interface (menu, éditeur, pause...)
  // y compris ceux créés dynamiquement (liste des niveaux) sans rien oublier.
  document.addEventListener('click', (e) => {
    if (e.target.closest('button')) AS.Sound.play('uiClick');
  });

  AS.Sound.preload();
  AS.Sound.setMasterVolume(AS.Storage.getSfxVolume());

  // ---------------------------------------------------------------------
  // Skins — variantes d'apparence complètes : corpulence (largeur des
  // épaules/hanches/membres), couleur de peau, coupe de cheveux et couleurs
  // de tenue. Seule la LARGEUR varie avec `build` (jamais la hauteur des
  // segments dérivés de AS.CFG.playerHeight) : la silhouette reste toujours
  // dans le rayon de la capsule de collision, donc la hitbox ne bouge pas
  // d'un skin à l'autre — voir buildPlayerMesh.
  // ---------------------------------------------------------------------
  const SKINS = [
    { id: 'bleu', label: 'Bleu', build: 1.0, skinTone: 0xe8b48c, hairStyle: 'short', hairColor: 0x2b1e18, shirt: 0x3fb7e8, shirtEmissive: 0x0a2230, pants: 0x33455c, shoe: 0x201a16 },
    { id: 'rouge', label: 'Rouge', build: 1.22, skinTone: 0xd79b6e, hairStyle: 'short', hairColor: 0x1a1512, shirt: 0xe8503f, shirtEmissive: 0x330a05, pants: 0x3a2422, shoe: 0x201212 },
    { id: 'foret', label: 'Forêt', build: 0.88, skinTone: 0xf0d3ab, hairStyle: 'long', hairColor: 0x3a2a18, shirt: 0x4fae5c, shirtEmissive: 0x0f2a10, pants: 0x2e3a24, shoe: 0x1c1c16 },
    { id: 'or', label: 'Doré', build: 1.05, skinTone: 0x8a5a3c, hairStyle: 'bald', hairColor: 0x2b1e18, shirt: 0xe8c23f, shirtEmissive: 0x332a05, pants: 0x4a4028, shoe: 0x2a2010 },
    { id: 'ombre', label: 'Ombre', build: 0.92, skinTone: 0xcac2c9, hairStyle: 'mohawk', hairColor: 0x141414, shirt: 0x3a3f52, shirtEmissive: 0x08081a, pants: 0x1c1e28, shoe: 0x101012 },
  ];
  function getSkinById(id) { return SKINS.find((s) => s.id === id) || SKINS[0]; }

  // Coupe de cheveux : renvoie un tableau de meshes (vide pour "bald").
  function buildHair(style, headRadius, headY, mat, cast) {
    const meshes = [];
    if (style === 'bald') return meshes;
    if (style === 'long') {
      const cap = cast(new THREE.Mesh(new THREE.SphereGeometry(headRadius * 1.02, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), mat));
      cap.position.set(0, headY, 0);
      const tail = cast(new THREE.Mesh(new THREE.CapsuleGeometry(headRadius * 0.3, headRadius * 1.5, 3, 6), mat));
      tail.position.set(0, headY - headRadius * 1.15, -headRadius * 0.7);
      tail.rotation.x = 0.3;
      meshes.push(cap, tail);
    } else if (style === 'mohawk') {
      const cap = cast(new THREE.Mesh(new THREE.SphereGeometry(headRadius * 0.98, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.32), mat));
      cap.position.set(0, headY, 0);
      const ridge = cast(new THREE.Mesh(new THREE.BoxGeometry(headRadius * 0.26, headRadius * 0.85, headRadius * 1.25), mat));
      ridge.position.set(0, headY + headRadius * 0.7, 0);
      meshes.push(cap, ridge);
    } else {
      // 'short' (par défaut)
      const cap = cast(new THREE.Mesh(new THREE.SphereGeometry(headRadius * 1.02, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), mat));
      cap.position.set(0, headY, 0);
      meshes.push(cap);
    }
    return meshes;
  }

  // ---------------------------------------------------------------------
  // Personnage visuel — silhouette humaine construite à partir de formes
  // primitives (tête/cou/torse/bras/jambes), pas un modèle 3D externe : un
  // fichier .obj chargé par OBJLoader/MTLLoader s'est déjà avéré peu fiable
  // (invisible dans le bundle Artifact, casse d'autres réglages si on force
  // les loaders à s'y charger quand même — voir historique). Une géométrie
  // 100% générée en code tourne à l'identique partout, sans dépendance
  // externe ni cas particulier selon l'environnement.
  // ---------------------------------------------------------------------
  function buildPlayerMesh(skinId) {
    const skin = getSkinById(skinId);
    // Proportions calées sur AS.CFG.playerHeight (pieds à y=0, sommet de la
    // tête à playerHeight) : ce que le joueur voit correspond à son hitbox
    // (capsule de rayon playerRadius), sans le dépasser aux épaules/hanches.
    // Ces proportions sont IDENTIQUES pour tous les skins (voir SKINS
    // ci-dessus) : seules les couleurs de matériaux changent.
    const H = AS.CFG.playerHeight;
    const legLength = H * 0.457;
    const torsoLength = H * 0.303;
    const neckLength = H * 0.029;
    const headRadius = (H - legLength - torsoLength - neckLength) / 2;

    const hipY = legLength;
    const shoulderY = hipY + torsoLength;
    const headY = H - headRadius;

    // Seule la largeur (hanches/épaules/membres) suit la corpulence du skin
    // (skin.build) : les longueurs ci-dessus restent fixes, donc la hitbox
    // capsule (playerRadius/playerHeight) ne change jamais.
    const bw = skin.build;
    const hipHalf = 0.16 * bw;
    const shoulderHalf = 0.20 * bw;
    const legRadius = 0.075 * bw;
    const armRadius = 0.058 * bw;
    const armLength = torsoLength + neckLength + headRadius * 0.4;

    const skinMat = new THREE.MeshStandardMaterial({ color: skin.skinTone, roughness: 0.75 });
    const hairMat = new THREE.MeshStandardMaterial({ color: skin.hairColor, roughness: 0.6 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: skin.shirt, roughness: 0.65, emissive: skin.shirtEmissive, emissiveIntensity: 0.2 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: skin.pants, roughness: 0.75 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: skin.shoe, roughness: 0.7 });
    const soleMat = new THREE.MeshStandardMaterial({ color: 0x161311, roughness: 0.85 });
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x1c1a18, roughness: 0.8 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x14100e, roughness: 0.4 });

    const g = new THREE.Group();
    const cast = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };

    // ---- jambes + pieds (semelle + tige, deux tons) -------------------------
    [-1, 1].forEach((side) => {
      const legX = side * hipHalf * 0.6;
      const leg = cast(new THREE.Mesh(
        new THREE.CapsuleGeometry(legRadius, Math.max(0.05, legLength - 2 * legRadius), 3, 6),
        pantsMat
      ));
      leg.position.set(legX, legLength / 2, 0);
      const shoe = cast(new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.075, 0.2), shoeMat));
      shoe.position.set(legX, 0.055, 0.035);
      const sole = cast(new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.03, 0.22), soleMat));
      sole.position.set(legX, 0.015, 0.04);
      g.add(leg, shoe, sole);
    });

    // ---- bassin + ceinture -----------------------------------------------
    const hip = cast(new THREE.Mesh(new THREE.BoxGeometry(hipHalf * 2, 0.14, 0.18), pantsMat));
    hip.position.set(0, hipY, 0);
    const belt = cast(new THREE.Mesh(new THREE.BoxGeometry(hipHalf * 2.08, 0.05, 0.185), beltMat));
    belt.position.set(0, hipY + 0.08, 0);

    // ---- torse (conique : plus large aux épaules qu'aux hanches) -----------
    const torso = cast(new THREE.Mesh(
      new THREE.CylinderGeometry(shoulderHalf, hipHalf, torsoLength, 8),
      shirtMat
    ));
    torso.position.set(0, hipY + torsoLength / 2, 0);

    // ---- cou + tête + visage + cheveux --------------------------------------
    const neck = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, neckLength, 8), skinMat));
    neck.position.set(0, shoulderY + neckLength / 2, 0);
    const head = cast(new THREE.Mesh(new THREE.SphereGeometry(headRadius, 16, 12), skinMat));
    head.position.set(0, headY, 0);
    const hairMeshes = buildHair(skin.hairStyle, headRadius, headY, hairMat, cast);
    // Deux points sombres sur l'avant du crâne (+Z, le sens "de face" par
    // défaut — voir la convention de yaw dans _horizontal côté player.js) :
    // un visage lisible d'un coup d'oeil, sans viser un rendu facial complet.
    const eyeGeo = new THREE.SphereGeometry(headRadius * 0.11, 8, 6);
    const eyes = [-1, 1].map((side) => {
      const eye = cast(new THREE.Mesh(eyeGeo, eyeMat));
      eye.position.set(side * headRadius * 0.38, headY + headRadius * 0.05, headRadius * 0.88);
      return eye;
    });

    // ---- bras (légèrement écartés, pose naturelle) + mains -------------------
    const arms = [];
    const hands = [];
    [-1, 1].forEach((side) => {
      const arm = cast(new THREE.Mesh(
        new THREE.CapsuleGeometry(armRadius, Math.max(0.05, armLength - 2 * armRadius), 3, 6),
        shirtMat
      ));
      arm.position.set(side * (shoulderHalf + armRadius * 0.7), shoulderY - armLength / 2, 0);
      arm.rotation.z = side * 0.12;
      // La main est un enfant du bras (dans son repère local, à l'extrémité
      // basse de la capsule) : elle suit donc sa rotation sans code séparé —
      // essentiel pour l'animation d'accroche au mur (voir updateGame), où
      // c'est justement la position de la main qui doit se lire clairement.
      const hand = cast(new THREE.Mesh(new THREE.SphereGeometry(armRadius * 1.2, 10, 8), skinMat));
      hand.position.set(0, -armLength / 2 + armRadius * 0.3, 0);
      arm.add(hand);
      // ---- petite capsule d'épaule : adoucit le raccord bras/torse ----------
      const shoulderCap = cast(new THREE.Mesh(new THREE.SphereGeometry(armRadius * 1.15, 10, 8), shirtMat));
      shoulderCap.position.set(side * shoulderHalf * 0.92, shoulderY, 0);
      g.add(shoulderCap);
      arms.push(arm);
      hands.push(hand);
      g.add(arm);
    });

    g.add(hip, belt, torso, neck, head, ...eyes, ...hairMeshes);
    g.userData.arms = arms;
    g.userData.hands = hands;
    return g;
  }

  // ---------------------------------------------------------------------
  // État global
  // ---------------------------------------------------------------------
  let scene = null, level = null, player = null, tpCam = null, playerMesh = null;
  let abilities = null, difficulty = 'court-1';
  let appState = 'menu'; // menu | playing | paused | result | finish | editor
  let squash = new THREE.Vector3(1, 1, 1);
  let bursts = [];
  // Durée de la poussée visible des mains contre le mur au moment du
  // wall-jump (voir updateGame) — volontairement courte et vive, contraste
  // avec la lenteur de l'accroche qui la précède.
  const WALL_PUSH_DURATION = 0.22;
  let wallPushTimer = 0;

  const state = {
    checkpointIndex: 0,
    lastCheckpointPos: new THREE.Vector3(),
    // Temps de jeu écoulé : additionné image par image, donc sans les pauses.
    elapsedMs: 0,
    finished: false,
    customLevel: false,
    customLevelName: '',
    // Partie générée en cours : { cfg, stream, section, queue, ... } — null
    // pour un niveau personnel. Voir startRun.
    run: null,
    // Vrai seulement si la partie en cours a été lancée par "Tester le
    // niveau" depuis l'éditeur (pas depuis l'écran titre) — détermine où
    // "Quitter" ramène (voir quitBtn/returnToEditorFromTest).
    fromEditor: false,
    // Position réelle (hitbox) du joueur, un point par image, pendant un
    // niveau personnel — affichée en rouge dans l'éditeur au retour d'un
    // test (voir returnToEditorFromTest), avec le même rendu que la
    // trajectoire du bot d'analyse (AS.Editor.showAnalysisTrail).
    testTrajectory: [],
  };

  // ---------------------------------------------------------------------
  // Sélection de difficulté (écran titre)
  // ---------------------------------------------------------------------
  const saved = AS.Storage.load();
  AS.I18n.apply();
  difficulty = [1, 2, 3, 4].includes(+saved.settings.difficulty) ? +saved.settings.difficulty : 1;
  document.querySelectorAll('.diff-btn').forEach((btn) => {
    btn.classList.toggle('selected', +btn.dataset.diff === difficulty);
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diff-btn').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      difficulty = +btn.dataset.diff;
      AS.Storage.setDifficulty(difficulty);
    });
  });

  // La meilleure partie atteinte s'affiche directement sur chaque difficulté.
  function renderTitleRecords() {
    [1, 2, 3, 4].forEach((k) => {
      const el = document.querySelector('[data-diff-best="' + k + '"]');
      if (!el) return;
      const best = AS.Storage.getRunBest(k);
      el.textContent = best ? AS.I18n.t('hud.part') + ' ' + best : '—';
    });
    renderTitleLevels();
  }
  renderTitleRecords();

  // Jouer un niveau créé dans l'éditeur directement depuis le menu principal,
  // sans avoir à ouvrir l'éditeur puis chercher "Tester le niveau" — c'est ce
  // détour caché qui rendait la fonctionnalité difficile à trouver.
  function renderTitleLevels() {
    const levels = AS.Storage.loadLevels();
    const names = Object.keys(levels).sort();
    const wrap = $('titleLevels');
    const list = $('titleLevelsList');
    if (names.length === 0) { wrap.hidden = true; return; }
    wrap.hidden = false;
    list.innerHTML = '';
    names.forEach((name) => {
      const lvl = levels[name];
      const row = document.createElement('div');
      row.className = 'title-level-row';
      const nameEl = document.createElement('span');
      nameEl.className = 'title-level-name';
      nameEl.textContent = name;
      const bestEl = document.createElement('span');
      bestEl.className = 'title-level-best';
      bestEl.textContent = lvl.best != null ? AS.Hud.fmtTime(lvl.best) : '—';
      const playBtn = document.createElement('button');
      playBtn.className = 'title-level-play';
      playBtn.textContent = 'Jouer';
      playBtn.addEventListener('click', () => startCustomLevel(lvl.blocks, name, lvl.background, lvl.theme));
      const editBtn = document.createElement('button');
      editBtn.className = 'title-level-edit';
      editBtn.textContent = 'Modifier';
      editBtn.addEventListener('click', () => openEditor(name));
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'title-level-delete hold-confirm';
      deleteBtn.textContent = 'Supprimer';
      deleteBtn.title = 'Maintenir 0,7s pour supprimer';
      AS.Util.holdToConfirm(deleteBtn, 700, () => {
        AS.Storage.deleteLevel(name);
        renderTitleLevels();
      });
      const actions = document.createElement('div');
      actions.className = 'title-level-actions';
      actions.appendChild(editBtn);
      actions.appendChild(playBtn);
      actions.appendChild(deleteBtn);
      row.appendChild(nameEl);
      row.appendChild(bestEl);
      row.appendChild(actions);
      list.appendChild(row);
    });
  }

  // ---------------------------------------------------------------------
  // Écran Contrôles / raccourcis clavier
  // ---------------------------------------------------------------------
  $('controlsBtn').addEventListener('click', () => {
    AS.Keybinds.buildUI($('keybindList'));
    AS.Keybinds.buildEditorUI($('editorKeybindList'));
    syncVolumeUI();
    buildSkinPickerUI();
    $('languageSelect').value = AS.Storage.getLanguage();
    $('controlsScreen').hidden = false;
  });
  $('languageSelect').addEventListener('change', () => {
    AS.Storage.setLanguage($('languageSelect').value);
    AS.I18n.apply();
    renderTitleRecords();
    AS.Keybinds.buildUI($('keybindList'));
    AS.Keybinds.buildEditorUI($('editorKeybindList'));
  });

  // ---------------------------------------------------------------------
  // Écran Règles — TOUT ce qui règle l'équilibrage du jeu ET de l'éditeur,
  // en un seul endroit (voir AS.Storage.getRules/setRule/resetRules et
  // AS.World.applyRules). Des nombres libres (pas de glissière bornée) :
  // aucune limite artificielle sur ce qu'on peut taper ici.
  // ---------------------------------------------------------------------
  const RULE_FIELDS = [
    { section: 'Déplacement', key: 'maxSpeed', label: 'Vitesse de course max', step: 0.2 },
    { key: 'boostMaxSpeed', label: 'Vitesse sur pad de vitesse', step: 0.5 },
    { section: 'Saut', key: 'jumpVel', label: 'Puissance du saut', step: 0.2 },
    { key: 'doubleJumpVel', label: 'Puissance du double saut', step: 0.2 },
    { section: 'Mur (wall-jump)', key: 'wallJumpVelY', label: 'Poussée verticale', step: 0.2 },
    { key: 'wallJumpPush', label: 'Poussée horizontale', step: 0.2 },
    { section: 'Dash', key: 'dashSpeed', label: 'Vitesse', step: 0.5 },
    { key: 'dashDuration', label: 'Durée (s)', step: 0.01 },
    { key: 'dashCharges', label: 'Charges', step: 1 },
    { section: 'Gravité (valeurs négatives)', key: 'gravityRise', label: 'En montée', step: 1 },
    { key: 'gravityFall', label: 'En chute', step: 1 },
    { section: 'Glace', key: 'iceAccel', label: 'Accélération', step: 0.5 },
    { key: 'iceFriction', label: 'Adhérence (plus haut = moins glissant)', step: 0.2 },
    { section: 'Éditeur — bornes des glissières par bloc', key: 'bounceForceMin', label: 'Rebond — force min', step: 0.5 },
    { key: 'bounceForceMax', label: 'Rebond — force max', step: 0.5 },
    { key: 'crumbleTimeMin', label: 'Fragile — temps min (s)', step: 0.05 },
    { key: 'crumbleTimeMax', label: 'Fragile — temps max (s)', step: 0.1 },
    { key: 'moverSpeedMin', label: 'Plateforme mobile — vitesse min', step: 0.05 },
    { key: 'moverSpeedMax', label: 'Plateforme mobile — vitesse max', step: 0.5 },
    { section: 'Éditeur — caméra', key: 'cameraMaxDist', label: 'Distance de vue max', step: 10 },
  ];
  function buildRulesUI() {
    const body = $('rulesBody');
    body.innerHTML = '';
    const rules = AS.Storage.getRules();
    RULE_FIELDS.forEach((f) => {
      if (f.section) {
        const h = document.createElement('h3');
        h.className = 'settings-subhead';
        h.textContent = f.section;
        body.appendChild(h);
      }
      const row = document.createElement('div');
      row.className = 'settings-row';
      const label = document.createElement('label');
      label.textContent = f.label;
      label.setAttribute('for', 'rule_' + f.key);
      const input = document.createElement('input');
      input.type = 'number';
      input.id = 'rule_' + f.key;
      input.step = f.step;
      input.value = rules[f.key];
      input.addEventListener('change', () => {
        const v = parseFloat(input.value);
        if (!isFinite(v)) return;
        AS.Storage.setRule(f.key, v);
      });
      row.appendChild(label);
      row.appendChild(input);
      body.appendChild(row);
    });
  }
  $('rulesBtn').addEventListener('click', () => {
    buildRulesUI();
    $('rulesScreen').hidden = false;
  });
  $('closeRulesBtn').addEventListener('click', () => { $('rulesScreen').hidden = true; });
  $('resetRulesBtn').addEventListener('click', () => {
    AS.Storage.resetRules();
    buildRulesUI();
  });

  // Sélecteur de skin : tous les skins partagent la même hitbox, seule
  // l'apparence (couleurs) change (voir SKINS/buildPlayerMesh plus haut).
  function buildSkinPickerUI() {
    const wrap = $('skinPicker');
    wrap.innerHTML = '';
    const current = AS.Storage.getSkin();
    SKINS.forEach((skin) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'skin-swatch' + (skin.id === current ? ' selected' : '');
      const dot = document.createElement('span');
      dot.className = 'skin-swatch-dot';
      dot.style.background = '#' + skin.shirt.toString(16).padStart(6, '0');
      const label = document.createElement('span');
      label.className = 'skin-swatch-label';
      label.textContent = skin.label;
      btn.appendChild(dot);
      btn.appendChild(label);
      btn.addEventListener('click', () => {
        AS.Storage.setSkin(skin.id);
        buildSkinPickerUI();
      });
      wrap.appendChild(btn);
    });
  }
  $('closeControlsBtn').addEventListener('click', () => { $('controlsScreen').hidden = true; });
  $('resetKeybindsBtn').addEventListener('click', () => {
    AS.Storage.resetKeybinds();
    AS.Keybinds.buildUI($('keybindList'));
  });
  $('resetEditorKeybindsBtn').addEventListener('click', () => {
    AS.Storage.resetEditorKeybinds();
    AS.Keybinds.buildEditorUI($('editorKeybindList'));
  });

  function syncVolumeUI() {
    const pct = Math.round(AS.Storage.getSfxVolume() * 100);
    $('sfxVolumeRange').value = pct;
    $('sfxVolumeValue').textContent = pct + '%';
  }
  $('sfxVolumeRange').addEventListener('input', (e) => {
    const v = Number(e.target.value) / 100;
    AS.Storage.setSfxVolume(v);
    AS.Sound.setMasterVolume(v);
    $('sfxVolumeValue').textContent = Math.round(v * 100) + '%';
  });
  // Un aperçu au relâchement, pas à chaque cran glissé (sinon rafale de sons
  // qui se chevauchent pendant qu'on fait glisser le curseur).
  $('sfxVolumeRange').addEventListener('change', () => AS.Sound.play('checkpoint'));

  // ---------------------------------------------------------------------
  // Entrées clavier
  // ---------------------------------------------------------------------
  const keys = new Set();

  window.addEventListener('keydown', (e) => {
    keys.add(e.code);
    const kb = AS.Storage.getKeybinds();
    if (appState === 'playing') {
      if (e.code === kb.pause) {
        appState = 'paused';
        $('pauseScreen').hidden = false;
      }
      if (Object.values(kb).includes(e.code)) e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  $('resumeBtn').addEventListener('click', () => {
    appState = 'playing';
    $('pauseScreen').hidden = true;
  });
  $('respawnBtn').addEventListener('click', () => {
    respawnPlayer();
    // Nouvel essai : la trajectoire affichée au retour dans l'éditeur ne
    // doit montrer que CELUI-CI, pas l'empiler avec les tentatives ratées
    // précédentes (voir updateGame/returnToEditorFromTest).
    if (state.customLevel) state.testTrajectory = [];
    appState = 'playing';
    $('pauseScreen').hidden = true;
  });
  $('quitBtn').addEventListener('click', () => {
    if (state.customLevel && state.fromEditor) returnToEditorFromTest();
    else backToMenu();
  });

  // Blocs à utiliser pour rejouer/revenir sur le niveau personnel en cours :
  // l'état EN MÉMOIRE de l'éditeur (édits pas forcément sauvegardés
  // compris) si la partie vient bien de là, sinon la version sauvegardée
  // (l'éditeur n'a peut-être jamais chargé ce niveau cette session — ex.
  // lancé directement depuis "Mes niveaux créés" à l'écran titre).
  function currentTestBlocks() {
    if (state.fromEditor) return AS.Editor.exportBlocks();
    const levels = AS.Storage.loadLevels();
    const saved = state.customLevelName && levels[state.customLevelName];
    return saved ? saved.blocks : AS.Editor.exportBlocks();
  }

  function returnToEditorFromTest() {
    $('hud').hidden = true;
    $('pauseScreen').hidden = true;
    $('finishScreen').hidden = true;
    if (state.fromEditor) openEditor();
    else openEditor(state.customLevelName);
    if (state.testTrajectory.length) {
      // showPlayerTrail (pas showAnalysisTrail) : cette trajectoire ne doit
      // disparaître qu'au clic explicite sur "Effacer la trajectoire",
      // jamais toute seule en modifiant le niveau (voir editor.js).
      AS.Editor.showPlayerTrail(state.testTrajectory);
      $('editorAnalysisBody').innerHTML = '<div class="editor-analysis-line">Trajectoire (en rouge) de ton dernier essai.</div>';
      $('editorAnalysis').hidden = false;
    }
  }

  $('finishReplayBtn').addEventListener('click', () => {
    $('finishScreen').hidden = true;
    if (state.customLevel) startCustomLevel(currentTestBlocks(), state.customLevelName, state.customLevelBackground, state.customLevelTheme, state.fromEditor);
    else startRun(state.run.cfg);
  });
  $('finishEditorBtn').addEventListener('click', () => returnToEditorFromTest());
  $('finishMenuBtn').addEventListener('click', () => {
    $('finishScreen').hidden = true;
    backToMenu();
  });

  function backToMenu() {
    appState = 'menu';
    leaveRun();
    $('hud').hidden = true;
    $('pauseScreen').hidden = true;
    $('finishScreen').hidden = true;
    $('editorScreen').hidden = true;
    AS.Editor.close();
    $('titleScreen').hidden = false;
    renderTitleRecords();
  }

  // ---------------------------------------------------------------------
  // Démarrage d'une partie (Zone 1)
  // ---------------------------------------------------------------------
  $('playBtn').addEventListener('click', () => {
    const typed = $('seedInput').value.trim();
    startRun({ kind: 'run', difficulty, seed: typed || randomSeed() });
  });
  function randomSeed() {
    return Math.floor(Math.random() * 2176782336).toString(36);
  }

  // ---------------------------------------------------------------------
  // Écran des défis
  // ---------------------------------------------------------------------
  const CHALLENGE_GROUPS = ['day', 'week', 'month', 'year', 'eternal'];
  function challengeName(ch) {
    const label = AS.I18n.t('ch.' + ch.group);
    return ch.group === 'day' || ch.group === 'week' ? label : label + ' ' + ch.index;
  }
  function renderChallenges() {
    const list = $('challengesList');
    list.innerHTML = '';
    const all = AS.Gen.challenges();
    CHALLENGE_GROUPS.forEach((group) => {
      const head = document.createElement('div');
      head.className = 'challenge-group';
      head.textContent = AS.I18n.t('ch.group.' + group);
      list.appendChild(head);
      all.filter((ch) => ch.group === group).forEach((ch) => {
        const row = document.createElement('div');
        row.className = 'challenge-row';
        const name = document.createElement('div');
        name.className = 'challenge-name';
        name.textContent = challengeName(ch);
        const info = document.createElement('span');
        info.className = 'challenge-info';
        info.textContent = AS.I18n.t('ch.length').replace('{min}', Math.round(ch.seconds / 60))
          .replace('{a}', Math.round(ch.t0 * 100)).replace('{b}', Math.round(ch.t1 * 100));
        name.appendChild(info);
        const best = document.createElement('div');
        best.className = 'challenge-best';
        const ms = AS.Storage.getChallengeBest(ch.id);
        best.textContent = ms != null ? AS.Hud.fmtTime(ms) : '—';
        const play = document.createElement('button');
        play.className = 'challenge-play';
        play.textContent = AS.I18n.t('ch.play');
        play.addEventListener('click', () => {
          $('challengesScreen').hidden = true;
          startRun({ kind: 'challenge', challenge: ch, name: challengeName(ch) });
        });
        row.appendChild(name);
        row.appendChild(best);
        row.appendChild(play);
        list.appendChild(row);
      });
    });
  }
  $('challengesBtn').addEventListener('click', () => {
    renderChallenges();
    $('titleScreen').hidden = true;
    $('challengesScreen').hidden = false;
  });
  $('challengesBackBtn').addEventListener('click', () => {
    $('challengesScreen').hidden = true;
    $('titleScreen').hidden = false;
  });

  // Le ciel/les montagnes peints à la main servent de repli immédiat pendant
  // le chargement (async) de la vraie photo de paysage ; une fois prête, les
  // meshes procéduraux inutiles sont masqués et level.sky pointe vers la
  // nouvelle carte plane (updateGame() la fait suivre le joueur avec un
  // décalage fixe au lieu d'une copie exacte de position — voir followOffset).
  function activateRealSky(currentScene, currentLevel, imagePath) {
    AS.Fx.loadRealSky(currentScene, (bgMesh) => {
      if (currentLevel.sky) currentLevel.sky.visible = false;
      if (currentLevel.mountains) currentLevel.mountains.visible = false;
      currentLevel.sky = bgMesh;
      // Le brouillard violet sombre était calé sur le ciel peint procédural ;
      // sur la photo de paysage (ciel de jour, lumière chaude), il jurerait.
      if (currentScene.fog) currentScene.fog.color.setHex(0xcfe0e8);
    }, imagePath);
  }

  // ---------------------------------------------------------------------
  // Partie générée : le niveau arrive partie par partie depuis AS.Gen, en
  // tâche de fond, et les parties passées sont retirées : c'est sans fin.
  // ---------------------------------------------------------------------
  function startRun(cfg) {
    // Un défi se court toujours avec les règles officielles, pour que les
    // temps restent comparables.
    if (cfg.kind === 'challenge') AS.World.applyRules(AS.Storage.RULE_DEFAULTS);
    else AS.World.applyRules();
    const options = cfg.kind === 'challenge' ? AS.Gen.challengeOptions(cfg.challenge) : AS.Gen.runOptions(cfg.difficulty, cfg.seed);
    const stream = AS.Gen.createStream(options);
    stream.pump(1e9, 2);

    scene = new THREE.Scene();
    level = AS.World.createRunLevel(scene);
    const seedHash = AS.Gen.hashSeed(String(options.seed));
    const bg = AS.BACKGROUND_CHOICES[seedHash % AS.BACKGROUND_CHOICES.length];
    activateRealSky(scene, level, bg.path);

    abilities = { doubleJump: true, wallJump: true, dash: true };
    state.run = { cfg, stream, section: 0, next: 0, queue: null, seen: {}, bot: null };
    realizeRun(1e9);
    realizeRun(1e9);
    scene.updateMatrixWorld(true);

    const startPos = stream.spawn.clone();
    state.checkpointIndex = 0;
    state.lastCheckpointPos = startPos.clone();
    state.finished = false;
    state.customLevel = false;
    state.customLevelName = '';
    state.fromEditor = false;
    state.elapsedMs = 0;
    bursts = [];

    player = new AS.Player(level, startPos, abilities);
    tpCam = new AS.FixedCamera(camera, level.collidables);
    playerMesh = buildPlayerMesh(AS.Storage.getSkin());
    scene.add(playerMesh);
    squash.set(1, 1, 1);
    wallPushTimer = 0;
    renderPrev.copy(player.position);
    stepAccumulator = 0;

    const seedEl = $('pauseSeed');
    seedEl.hidden = cfg.kind !== 'run';
    if (cfg.kind === 'run') seedEl.textContent = AS.I18n.t('run.seed') + ' : ' + cfg.seed;
    showSectionHint(0);

    $('titleScreen').hidden = true;
    $('controlsScreen').hidden = true;
    $('editorScreen').hidden = true;
    $('hud').hidden = false;
    document.querySelector('.altitude').hidden = false;
    appState = 'playing';
  }

  function leaveRun() {
    // Les règles du joueur reviennent après un défi.
    if (state.run && state.run.cfg.kind === 'challenge') AS.World.applyRules();
    state.run = null;
  }

  const PIECES_PER_FRAME = 10;
  // Pose dans le monde au plus `budget` pièces de la prochaine partie prête.
  function realizeRun(budget) {
    const run = state.run;
    const wanted = run.section + 3;
    if (!run.queue) {
      if (run.next >= wanted || !run.stream.sections[run.next]) return;
      const sec = run.stream.sections[run.next];
      run.queue = { sec, i: 0 };
    }
    const { sec } = run.queue;
    const end = Math.min(sec.pieces.length, run.queue.i + budget);
    AS.World.addPieces(level, sec.pieces.slice(run.queue.i, end), sec.theme, sec.index);
    run.queue.i = end;
    if (end >= sec.pieces.length) {
      run.queue = null;
      run.next++;
    }
  }

  // À chaque image : la génération avance un peu, jamais assez pour saccader.
  function serviceRun() {
    const run = state.run;
    if (run.stream.sections.length < run.section + 4 && !run.stream.isFinished()) run.stream.pump(3, run.section + 4);
    realizeRun(PIECES_PER_FRAME);
  }

  function enterSection(index) {
    const run = state.run;
    run.section = index;
    showSectionHint(index);
    if (run.cfg.kind === 'run') AS.Storage.recordRun(run.cfg.difficulty, index + 1);
    // On garde la partie d'avant : le point de contrôle en cours s'y trouve.
    for (const key of Object.keys(level.sections)) {
      if (+key < index - 1) AS.World.removeSection(level, +key);
    }
  }

  function showSectionHint(index) {
    const sec = state.run.stream.sections[index];
    if (!sec) return;
    const fresh = sec.mods.find((m) => !state.run.seen[m] && AS.I18n.t('hint.' + m) !== 'hint.' + m);
    sec.mods.forEach((m) => { state.run.seen[m] = true; });
    if (!fresh) return;
    AS.Hud.setObjective(AS.I18n.t('hint.' + fresh));
    clearTimeout(showSectionHint._timer);
    showSectionHint._timer = setTimeout(() => AS.Hud.setObjective(null), 5000);
  }

  function finishRun() {
    const run = state.run;
    state.finished = true;
    const ms = state.elapsedMs;
    $('finishTime').textContent = AS.Hud.fmtTime(ms);
    $('finishTitle').textContent = run.cfg.name + ' — ' + AS.I18n.t('finish.done');
    const improved = AS.Storage.recordChallenge(run.cfg.challenge.id, ms);
    const bot = AS.Hud.fmtTime(run.stream.totalFrames() / 60 * 1000);
    const best = AS.Hud.fmtTime(AS.Storage.getChallengeBest(run.cfg.challenge.id));
    $('finishTeaser').textContent = AS.I18n.t('finish.best') + ' : ' + best + ' · ' + AS.I18n.t('finish.bot') + ' : ' + bot;
    $('finishEditorBtn').hidden = true;
    AS.Sound.play(improved ? 'victory' : 'finish');
    $('finishScreen').hidden = false;
    appState = 'finish';
  }

  function respawnPlayer() {
    player.respawn(state.lastCheckpointPos);
    renderPrev.copy(player.position);
    if (state.run) AS.World.resetCrumbles(level);
  }

  // ---------------------------------------------------------------------
  // Éditeur de niveaux
  // ---------------------------------------------------------------------
  $('editorBtn').addEventListener('click', () => openEditor());

  // `loadName` : ouvre directement sur un niveau existant, prêt à modifier
  // (utilisé par le bouton "Modifier" du menu principal) — sans ça, il
  // fallait ouvrir l'éditeur puis chercher soi-même "Charger" dans la liste.
  function openEditor(loadName) {
    $('titleScreen').hidden = true;
    $('hud').hidden = true;
    $('editorScreen').hidden = false;
    scene = null; // l'éditeur gère sa propre scène/caméra
    AS.Editor.open(renderer, canvas);
    if (loadName) {
      AS.Editor.loadIntoEditor(loadName);
      $('editorNameInput').value = loadName;
      $('editorLevelSelect').value = loadName;
    }
    refreshTestFromSelect();
    appState = 'editor';
  }

  // Liste "Tester depuis" (Départ + un choix par checkpoint posé) : reflète
  // toujours le niveau actuellement en mémoire dans l'éditeur — rafraîchie
  // à l'ouverture de l'éditeur et à chaque modification de blocs (voir
  // l'évènement 'as:editor-changed' émis par editor.js).
  function refreshTestFromSelect() {
    const sel = $('editorTestFromSelect');
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = '<option value="">Départ</option>';
    let cpCount = 0;
    AS.Editor.exportBlocks().forEach((b) => {
      if (b.type !== 'checkpoint') return;
      const opt = document.createElement('option');
      opt.value = String(cpCount);
      opt.textContent = 'Checkpoint ' + (cpCount + 1);
      sel.appendChild(opt);
      cpCount++;
    });
    if ([...sel.options].some((o) => o.value === prev)) sel.value = prev;
  }
  document.addEventListener('as:editor-changed', refreshTestFromSelect);

  // window.confirm()/alert() sont peu fiables une fois le jeu embarqué dans
  // un contexte en bac à sable (ex. l'Artifact publié) — ils peuvent être
  // bloqués et renvoyer faux silencieusement, ce qui empêchait ces boutons
  // d'aller au bout de leur action. Remplacés par un "maintenir pour
  // confirmer" (actions destructives) ou un toast (actions informatives).
  $('editorNewBtn').classList.add('hold-confirm');
  $('editorNewBtn').title = 'Maintenir 0,7s pour effacer et repartir de zéro';
  AS.Util.holdToConfirm($('editorNewBtn'), 700, () => {
    AS.Editor.newLevel();
    $('editorNameInput').value = '';
  });

  $('editorSaveBtn').addEventListener('click', () => {
    const name = $('editorNameInput').value.trim() || AS.Editor.currentLevelName;
    if (!name) { AS.Hud.toast('Donne un nom à ton niveau avant de sauvegarder.'); return; }
    if (!AS.Editor.hasSpawn()) { AS.Hud.toast('Place un bloc "Départ" avant de sauvegarder.'); return; }
    AS.Editor.currentLevelName = name;
    AS.Storage.saveLevel(name, { blocks: AS.Editor.exportBlocks(), background: AS.Editor.currentBackground, theme: AS.Editor.currentTheme });
    AS.Editor.refreshLevelSelect($('editorLevelSelect'));
    $('editorLevelSelect').value = name;
    AS.Hud.toast('Niveau sauvegardé');
  });

  $('editorLoadBtn').addEventListener('click', () => {
    const name = $('editorLevelSelect').value;
    if (!name) return;
    AS.Editor.loadIntoEditor(name);
    $('editorNameInput').value = name;
  });

  $('editorDeleteBtn').classList.add('hold-confirm');
  $('editorDeleteBtn').title = 'Maintenir 0,7s pour supprimer';
  AS.Util.holdToConfirm($('editorDeleteBtn'), 700, () => {
    const name = $('editorLevelSelect').value;
    if (!name) return;
    AS.Storage.deleteLevel(name);
    AS.Editor.refreshLevelSelect($('editorLevelSelect'));
    if (AS.Editor.currentLevelName === name) {
      AS.Editor.currentLevelName = '';
      $('editorNameInput').value = '';
    }
    renderTitleRecords();
  });

  $('editorTestBtn').addEventListener('click', () => {
    if (!AS.Editor.hasSpawn()) { AS.Hud.toast('Place un bloc "Départ" avant de tester.'); return; }
    if (!AS.Editor.hasFinish()) AS.Hud.toast('Pas de bloc "Arrivée" — test lancé quand même');
    $('editorScreen').hidden = true;
    const cpSel = $('editorTestFromSelect').value;
    const startCp = cpSel === '' ? null : parseInt(cpSel, 10);
    startCustomLevel(AS.Editor.exportBlocks(), AS.Editor.currentLevelName || '', AS.Editor.currentBackground, AS.Editor.currentTheme, true, startCp);
  });

  $('editorAnalyzeBtn').addEventListener('click', () => {
    AS.Hud.toast('Analyse en cours…');
    const analyzeBtn = $('editorAnalyzeBtn');
    analyzeBtn.disabled = true;
    // Un setTimeout laisse le toast s'afficher avant le calcul synchrone
    // (potentiellement quelques centaines de ms sur un gros niveau).
    setTimeout(() => {
      let result;
      try {
        result = AS.Analyzer.analyze(AS.Editor.exportBlocks());
      } finally {
        analyzeBtn.disabled = false;
      }
      renderAnalysisResult(result);
    }, 20);
  });

  $('editorAnalysisClearBtn').addEventListener('click', () => {
    $('editorAnalysis').hidden = true;
    AS.Editor.clearAnalysisTrail();
  });

  function renderAnalysisResult(result) {
    const panel = $('editorAnalysis');
    const body = $('editorAnalysisBody');
    panel.hidden = false;
    if (!result.possible) {
      body.innerHTML = '<div class="editor-analysis-impossible">' + result.message + '</div>';
      AS.Editor.showAnalysisTrail(result.trajectory, result.stuckAt);
      AS.Hud.toast('Niveau impossible');
      return;
    }
    const mins = Math.floor(result.timeSeconds / 60);
    const secs = (result.timeSeconds % 60).toFixed(2);
    const timeStr = (mins > 0 ? mins + ':' + secs.padStart(5, '0') : secs + 's');
    body.innerHTML =
      '<div class="editor-analysis-line">Difficulté : ' + result.difficulty +
        ' points <span class="editor-analysis-badge diff-' + result.difficultyLabel + '">' + result.difficultyLabel + '</span></div>' +
      '<div class="editor-analysis-line">Temps parfait estimé : ' + timeStr + '</div>';
    AS.Editor.showAnalysisTrail(result.trajectory, null);
    AS.Hud.toast('Analyse terminée');
  }

  $('editorQuitBtn').addEventListener('click', () => backToMenu());

  function startCustomLevel(blocks, name, background, theme, fromEditor, startCheckpointIndex) {
    AS.Editor.close();
    leaveRun();
    $('pauseSeed').hidden = true;
    document.querySelector('.altitude').hidden = true;
    scene = new THREE.Scene();
    level = AS.World.buildCustom(scene, blocks, theme);
    scene.updateMatrixWorld(true);
    const bgChoice = AS.BACKGROUND_CHOICES.find((b) => b.id === background);
    activateRealSky(scene, level, bgChoice ? bgChoice.path : AS.BACKGROUND_CHOICES[0].path);

    abilities = { doubleJump: true, wallJump: true, dash: true };

    // Test depuis un checkpoint précis (voir editorTestFromSelect) plutôt
    // que systématiquement depuis le Départ : pratique pour retravailler
    // une section sans se retaper tout ce qui précède à chaque essai.
    const hasStartCp = startCheckpointIndex != null && level.checkpoints[startCheckpointIndex];
    const startPos = hasStartCp ? level.checkpoints[startCheckpointIndex].pos.clone() : level.spawn.clone();
    if (hasStartCp) {
      // Ce checkpoint (et ceux qui le précèdent) comptent déjà comme
      // activés : sinon rien ne les distinguerait visuellement, et un
      // retour en arrière fortuit vers l'un d'eux le "activerait" pour la
      // première fois au lieu de simplement y respawn.
      level.triggers.forEach((t) => {
        if (t.type !== 'checkpoint' || t.index > startCheckpointIndex) return;
        t.activated = true;
        const cp = level.checkpoints[t.index];
        cp.flagMat.color.setHex(0x3fa0ff);
        cp.flagMat.emissive.setHex(0x113355);
      });
    }

    state.checkpointIndex = hasStartCp ? startCheckpointIndex : 0;
    state.lastCheckpointPos = startPos.clone();
    state.finished = false;
    state.customLevel = true;
    state.customLevelName = name;
    state.customLevelTheme = theme;
    state.customLevelBackground = background;
    state.fromEditor = !!fromEditor;
    state.testTrajectory = [];
    state.elapsedMs = 0;
    bursts = [];

    player = new AS.Player(level, startPos, abilities);
    tpCam = new AS.FixedCamera(camera, level.collidables);
    playerMesh = buildPlayerMesh(AS.Storage.getSkin());
    scene.add(playerMesh);
    squash.set(1, 1, 1);
    wallPushTimer = 0;
    renderPrev.copy(player.position);
    stepAccumulator = 0;

    AS.Hud.setObjective(name ? ('Test : ' + name) : 'Test du niveau');
    setTimeout(() => AS.Hud.setObjective(null), 3000);

    $('titleScreen').hidden = true;
    $('editorScreen').hidden = true;
    $('hud').hidden = false;
    appState = 'playing';
  }

  // ---------------------------------------------------------------------
  // Déclencheurs (checkpoints, orbes, défis, secrets, arrivée)
  // ---------------------------------------------------------------------
  function touchesBox(p, t) {
    const half = t.half;
    return !half || (
      Math.abs(p.x - t.pos.x) <= half.x + player.radius &&
      Math.abs(p.z - t.pos.z) <= half.z + player.radius &&
      p.y <= t.pos.y + half.y + 0.02 && p.y + player.height >= t.pos.y - half.y
    );
  }

  function processTriggers() {
    const p = player.position;
    for (const t of level.triggers) {
      if (t.type === 'phaseGate') continue; // gérées par AS.World.stepLevel
      const d = p.distanceTo(t.pos);
      if (d > t.radius) continue;

      if (t.type === 'checkpoint' && !t.activated) {
        if (!touchesBox(p, t)) continue;
        // Un checkpoint s'active dès le premier contact, quel que soit son
        // index — utile pour un ordre de passage non linéaire (raccourci,
        // niveau créé où les checkpoints ne sont pas posés dans l'ordre du
        // parcours) — contrairement à avant, où seul un index STRICTEMENT
        // supérieur au dernier activé comptait.
        t.activated = true;
        const cp = t.cp || level.checkpoints[t.index];
        state.checkpointIndex = t.index != null ? t.index : cp.sectionIndex;
        state.lastCheckpointPos = cp.pos.clone();
        cp.flagMat.color.setHex(0x3fa0ff);
        cp.flagMat.emissive.setHex(0x113355);
        AS.Hud.toast(AS.I18n.t('run.checkpoint'));
        AS.Sound.play('checkpoint');
        if (state.run) enterSection(cp.sectionIndex);
      } else if (t.type === 'finish' && !state.finished) {
        // Contact EXACT avec le pavé de la plateforme d'arrivée (pas une
        // simple proximité au rayon généreux utilisé ci-dessus pour le
        // premier tri) : chevauchement horizontal (rayon du joueur) et
        // vertical (pieds/tête) avec son volume réel — la partie se
        // termine pile à l'instant où le joueur la touche, ni avant, ni
        // après.
        if (!touchesBox(p, t)) continue;
        if (state.run) { finishRun(); continue; }
        state.finished = true;
        const ms = state.elapsedMs;
        $('finishTime').textContent = AS.Hud.fmtTime(ms);
        let improved = false;
        if (state.customLevel) {
          $('finishTitle').textContent = (state.customLevelName || 'Niveau') + ' terminé';
          $('finishTeaser').textContent = 'Retourne à l\'éditeur pour l\'améliorer, ou rejoue pour battre ton temps.';
          $('finishEditorBtn').hidden = false;
          if (state.customLevelName) improved = AS.Storage.recordLevelBest(state.customLevelName, ms);
        }
        // Un vrai bruit de victoire distinct quand on bat son record, plutôt
        // que le même son d'arrivée à chaque fois.
        AS.Sound.play(improved ? 'victory' : 'finish');
        $('finishScreen').hidden = false;
        appState = 'finish';
      }
    }
  }

  // Tremblement d'une plateforme fragile : seul le relief bouge, jamais le bloc
  // de collision, pour que le jeu reste identique à ce que le bot a joué.
  function animateCrumbles() {
    const shake = Math.sin(level.frame * 0.9) * 0.05;
    for (const c of level.crumbles) {
      const on = c.userData.crumbleState === 'shaking';
      for (const child of c.children) child.position.x = on ? shake : 0;
    }
  }

  // ---------------------------------------------------------------------
  // Boucle de jeu
  // ---------------------------------------------------------------------
  let prevJumpHeld = false, prevDashHeld = false;

  function buildInput() {
    const kb = AS.Storage.getKeybinds();
    const f = keys.has(kb.forward) ? 1 : 0;
    const b = keys.has(kb.back) ? 1 : 0;
    const l = keys.has(kb.left) ? 1 : 0;
    const r = keys.has(kb.right) ? 1 : 0;
    const fwd = tpCam.forwardFlat(), right = tpCam.rightFlat();
    const moveDir = new THREE.Vector3()
      .addScaledVector(fwd, f - b)
      .addScaledVector(right, r - l);
    if (moveDir.lengthSq() > 1) moveDir.normalize();

    const jumpHeld = keys.has(kb.jump);
    const jumpPressedEdge = jumpHeld && !prevJumpHeld;
    prevJumpHeld = jumpHeld;

    const dashHeld = keys.has(kb.dash);
    const dashPressedEdge = dashHeld && !prevDashHeld;
    prevDashHeld = dashHeld;

    return {
      moveDir,
      jumpHeld,
      jumpPressedEdge,
      dashPressedEdge,
      facingFlat: fwd,
      holdingIntoWall: moveDir.lengthSq() > 0.0004,
    };
  }

  // La physique tourne à pas fixe, comme dans le générateur : le jeu se comporte
  // à l'identique quel que soit l'écran, et ce que le bot a réussi reste
  // faisable. L'image affichée est interpolée entre deux pas (voir tick).
  const STEP = AS.Gen.DT;
  const renderPrev = new THREE.Vector3();
  const renderPos = new THREE.Vector3();
  let stepAccumulator = 0;
  const botInput = AS.Gen.makeInput();

  // Rejeu des touches du fantôme sur le vrai niveau (tests uniquement).
  function nextBotInput() {
    const bot = state.run.bot;
    const sec = state.run.stream.sections[bot.k];
    if (!sec) return AS.Gen.decode(0, botInput);
    const prevHeld = botInput.jumpHeld;
    const code = sec.codes[bot.i++];
    if (bot.i >= sec.codes.length) { bot.k++; bot.i = 0; }
    AS.Gen.decode(code, botInput);
    botInput.prevHeld = prevHeld;
    return botInput;
  }

  function updateGame(dt) {
    const input = state.run && state.run.bot ? nextBotInput() : buildInput();
    renderPrev.copy(player.position);
    player.update(dt, input);

    // Trace de la hitbox réellement parcourue, pour l'afficher en rouge au
    // retour dans l'éditeur (voir returnToEditorFromTest) — plafonnée pour
    // ne pas grossir indéfiniment sur une très longue session de test.
    if (state.customLevel && state.testTrajectory.length < 20000) {
      state.testTrajectory.push(player.position.clone());
    }

    if (AS.World.stepLevel(level, player, dt)) {
      renderPrev.copy(player.position);
      squash.set(0.7, 1.4, 0.7);
      AS.Hud.toast(AS.I18n.t('run.phase'));
      AS.Sound.play('phaseGate');
    }
    animateCrumbles();
    state.elapsedMs += dt * 1000;
    for (const dcor of level.decorations) dcor.mesh.rotation.y += (dcor.spin || 0) * dt;
    for (const fx of level.fx) fx.update(dt, player.position);

    level.sun.position.set(player.position.x + 16, player.position.y + 28, player.position.z + 12);
    level.sun.target.position.copy(player.position);
    level.sun.target.updateMatrixWorld();

    // Le ciel et les montagnes suivent le joueur : la zone jouable peut s'étendre
    // bien au-delà de leur rayon fixe (surtout en difficulté élevée), sans quoi
    // le joueur finirait par sortir du décor et voir le vide derrière. La
    // photo de fond (un panneau plat, pas une sphère) a sa propre logique de
    // suivi géométrique — voir AS.Fx.loadRealSky — plutôt qu'une copie brute.
    if (level.sky) {
      if (level.sky.userData.updateFollow) level.sky.userData.updateFollow(player.position);
      else level.sky.position.copy(player.position);
    }
    if (level.mountains) level.mountains.position.set(player.position.x, level.mountains.position.y, player.position.z);

    // Un seul son de saut pour les 3 variantes (saut/double saut/wall-jump) :
    // moins d'effets sonores différents, mais chacun reste reconnaissable et
    // le léger tremblé de hauteur (rateJitter) évite la répétition identique.
    if (player.justJumped || player.justDoubleJumped || player.justWallJumped) {
      squash.set(0.82, 1.32, 0.82);
      AS.Sound.play('jump', 0.94 + Math.random() * 0.12);
    }
    if (player.justDoubleJumped) {
      // Le double saut doit se voir, pas seulement s'entendre : un anneau
      // d'étincelles qui s'écarte à l'horizontale, bien distinct du nuage
      // d'atterrissage (blanc, retombe) et de la traînée de dash (des
      // traits, derrière le joueur).
      bursts.push(AS.Fx.doubleJumpBurst(scene, player.position));
    }
    if (player.justWallJumped) {
      // Poussée courte et vive des mains contre le mur, bien distincte de la
      // lente accroche qui précède (voir la branche wallSliding plus bas) —
      // ne se déclenche QUE sur l'appui du saut, jamais juste en s'approchant
      // d'un mur.
      wallPushTimer = WALL_PUSH_DURATION;
    }
    if (player.justDash) {
      // Étirement marqué dans le sens du dash (largeur réduite, longueur
      // étirée) + une traînée dans le monde : le dash doit se voir, pas
      // seulement s'entendre.
      squash.set(0.6, 0.78, 1.75);
      playerMesh.rotation.y = player.yaw;
      bursts.push(AS.Fx.dashTrail(scene, player.position.clone(), player.dashDir.clone()));
      AS.Sound.play('dash', 0.95 + Math.random() * 0.1);
    }
    if (player.justLanded) {
      squash.set(1.22, 0.72, 1.22);
      bursts.push(AS.Fx.landingBurst(scene, player.position));
      AS.Sound.play('land', 0.94 + Math.random() * 0.12);
    }
    // Rebond simple et rebond parfait partagent le même son d'impact ; le
    // rebond parfait est joué un ton nettement plus haut (vitesse de lecture
    // fixe) pour se distinguer sans ajouter un fichier supplémentaire.
    if (player.justBounced) {
      squash.set(1.22, 0.72, 1.22);
      bursts.push(AS.Fx.landingBurst(scene, player.position));
      AS.Sound.play('bounce', 0.94 + Math.random() * 0.12);
    }
    if (player.justPerfectBounce) {
      squash.set(0.62, 1.55, 0.62);
      bursts.push(AS.Fx.landingBurst(scene, player.position));
      AS.Hud.toast('🎯 Rebond parfait !');
      AS.Sound.play('bounce', 1.3);
    }
    if (player.justOrbitExit) {
      squash.set(0.85, 1.2, 0.85);
      AS.Hud.toast('Sortie de glisse orbitale');
    }
    squash.x = AS.Util.damp(squash.x, 1, 9, dt);
    squash.y = AS.Util.damp(squash.y, 1, 9, dt);
    squash.z = AS.Util.damp(squash.z, 1, 9, dt);
    playerMesh.scale.copy(squash);
    if (wallPushTimer > 0) {
      // ---- Phase 2 : poussée — les mains repartent vivement du mur ---------
      // Contraste volontaire avec la lenteur de l'accroche : cette phase est
      // courte (WALL_PUSH_DURATION) et va decrescendo vers la pose normale.
      wallPushTimer = Math.max(0, wallPushTimer - dt);
      const t = wallPushTimer / WALL_PUSH_DURATION; // 1 -> 0
      if (playerMesh.userData.arms) {
        playerMesh.userData.arms.forEach((arm) => { arm.rotation.x = -1.9 * t; });
      }
      playerMesh.rotation.y = AS.Util.damp(playerMesh.rotation.y, player.yaw, 10, dt);
    } else if (player.wallSliding) {
      // ---- Phase 1 : accroche — lente et bien visible -----------------------
      // Le personnage se tourne face au mur et plaque progressivement ses
      // deux mains dessus (au lieu de suivre l'orientation de déplacement) :
      // un lambda de damp bien plus faible qu'ailleurs (5 au lieu de 16-22)
      // pour qu'on ait le temps de VOIR la prise se former, pas un instantané.
      const wn = player.wallNormal;
      const faceYaw = Math.atan2(-wn.x, -wn.z);
      playerMesh.rotation.y = AS.Util.damp(playerMesh.rotation.y, faceYaw, 5, dt);
      if (playerMesh.userData.arms) {
        playerMesh.userData.arms.forEach((arm) => {
          arm.rotation.x = AS.Util.damp(arm.rotation.x, -1.35, 5, dt);
        });
      }
    } else {
      playerMesh.rotation.y = AS.Util.damp(playerMesh.rotation.y, player.yaw, 16, dt);
      if (playerMesh.userData.arms) {
        // Bras qui remontent légèrement en l'air (chute/saut) : un peu de vie
        // sans animation de marche complète.
        const swing = Math.min(0.6, Math.max(-0.2, -player.velocity.y * 0.025));
        playerMesh.userData.arms.forEach((arm, i) => { arm.rotation.x = swing * (i === 0 ? 1 : -1) * 0.4; });
      }
    }

    bursts = bursts.filter((burst) => !burst.update(dt));

    processTriggers();

    if (player.dead) {
      respawnPlayer();
      if (state.customLevel) state.testTrajectory = [];
      AS.Hud.toast(AS.I18n.t('run.respawn'));
    }

    if (state.run) {
      const sec = state.run.stream.sections[state.run.section];
      AS.Hud.setRunProgress(state.run.section + 1, sec ? sec.t : 0, AS.I18n.t('hud.part').toUpperCase());
    }
    AS.Hud.setSpeed(player.speed(), AS.CFG.maxSpeed);
    AS.Hud.setZoneTimer(state.elapsedMs);
  }

  function renderPlayer(dt) {
    renderPos.lerpVectors(renderPrev, player.position, stepAccumulator / STEP);
    playerMesh.position.copy(renderPos);
    tpCam.update(dt, renderPos);
  }

  const clock = new THREE.Clock();
  function tick() {
    requestAnimationFrame(tick);
    const dt = clock.getDelta();
    if (appState === 'playing' && player) {
      stepAccumulator += Math.min(dt, 0.1);
      while (stepAccumulator >= STEP && appState === 'playing') {
        stepAccumulator -= STEP;
        updateGame(STEP);
      }
      renderPlayer(dt);
    }
    if (state.run && appState === 'playing') serviceRun();
    if (appState === 'editor') AS.Editor.tick(Math.min(dt, 0.05));
    else if (scene) renderer.render(scene, camera);
  }
  tick();

  // Petit crochet de debug (lecture seule + avance manuelle d'une image) —
  // pratique en développement, sans effet sur le déroulement normal du jeu.
  window.__AS_DEBUG__ = {
    getState: () => ({ appState, difficulty, checkpointIndex: state.checkpointIndex, customLevel: state.customLevel, testTrajectoryLength: state.testTrajectory.length }),
    getPlayer: () => player,
    getLevel: () => level,
    getPlayerMesh: () => playerMesh,
    getCam: () => tpCam,
    setKey: (code, down) => { if (down) keys.add(code); else keys.delete(code); },
    getRun: () => state.run,
    startBot: () => { state.run.bot = { k: 0, i: 0 }; },
    // Avance de n pas fixes sans passer par l'affichage.
    steps: (n) => {
      for (let i = 0; i < n && appState === 'playing'; i++) {
        updateGame(STEP);
        if (state.run) serviceRun();
      }
      if (player) renderPlayer(STEP);
    },
    step: (dt) => {
      if (appState === 'playing' && player) { updateGame(STEP); stepAccumulator = 0; renderPlayer(dt); }
      if (appState === 'editor') AS.Editor.tick(dt);
      else if (scene) renderer.render(scene, camera);
    },
  };
})();
