// ============================================================================
// ASCENSION — editor.js
// Éditeur de niveaux : pose/retire des blocs voxel sur une grille, caméra à
// l'orbite (glisser la souris, molette pour zoomer, WASD/QE pour déplacer le
// point de visée), palette de types de blocs, sauvegarde/chargement/suppression
// via AS.Storage (localStorage). Le niveau créé se joue avec le même
// contrôleur (AS.Player) via AS.World.buildCustom().
// ============================================================================
window.AS = window.AS || {};

AS.Editor = (function () {
  const CELL = AS.EDITOR_CELL || { x: 3, y: 1.6, z: 3 };
  // Pas de grille horizontal effectif d'un bloc selon sa taille ('quarter' =
  // moitié de la cellule en X ET en Z, soit 4x moins de surface au sol —
  // la hauteur, elle, reste toujours sur la grille normale). `b.size` est
  // absent (undefined) pour un bloc plein classique, jamais besoin d'écrire
  // 'full' explicitement.
  function stepXZ(size) {
    return size === 'quarter' ? { x: CELL.x / 2, z: CELL.z / 2 } : { x: CELL.x, z: CELL.z };
  }

  // Le quart de bloc ne s'applique qu'aux types SOLIDES (plateformes,
  // pics...) — un marqueur (checkpoint, vent, téléporteur...) n'est pas un
  // pavé de collision mais une zone/déclencheur à part, jamais concerné par
  // ce réglage : le forcer en taille pleine évite d'avoir à dupliquer toute
  // la logique de zone (main.js/world.js) pour une échelle différente.
  function effectiveBlockSize() {
    return (currentTool === 'build' && !MARKER_TYPES.has(currentType)) ? currentBlockSize : 'full';
  }
  const TYPE_COLORS = {
    normal: '#9c9484', ice: '#bfe7f2', boost: '#ff8a4c', bounce: '#c86bff',
    crumble: '#9c8060', perfectBounce: '#5df2c8', spike: '#c9463a', orb: '#ff9ed6', spawn: '#6ee7a0', finish: '#f3d98a',
    checkpoint: '#3fa0ff', wind: '#bfe8ff', lowgrav: '#d9c6ff',
    phase: '#6ee7ff',
  };
  const TYPE_LABELS = {
    normal: 'Roche', ice: 'Glace', boost: 'Vitesse', bounce: 'Rebond',
    crumble: 'Fragile', perfectBounce: 'Rebond parfait', spike: 'Pics (mortel)', orb: 'Orbe de rebond', spawn: 'Départ', finish: 'Arrivée',
    checkpoint: 'Checkpoint', wind: 'Vent', lowgrav: 'Gravité faible',
    phase: 'Téléporteur (paire)',
  };
  // Types "marqueurs" : pas de bloc solide, affichés en aperçu translucide
  // dans l'éditeur pour bien les distinguer des blocs qui bloquent le joueur.
  // 'orb' est un marqueur aussi : l'orbe de rebond n'a plus de collision
  // solide (voir world.js), on la traverse librement de côté.
  //
  // Il n'y a plus de type "plateforme mobile" séparé (voir l'outil
  // Sélection, plus bas) : n'importe quel bloc plein peut recevoir des
  // points de passage et se déplacer tout en gardant son propre type.
  const MARKER_TYPES = new Set(['checkpoint', 'wind', 'lowgrav', 'phase', 'orb']);
  // Types dont l'orientation compte (cyclée avec le bouton de rotation) —
  // 'boost' pour indiquer le sens de la poussée dans l'éditeur ET en jeu.
  const ROTATABLE_TYPES = new Set(['boost', 'wind', 'phase']);
  // Types dont l'intensité compte (cyclée avec le bouton de puissance) —
  // pour l'instant seulement la force du vent ; la vitesse d'un bloc rendu
  // mobile (outil Sélection) réutilise le même bouton par un autre chemin
  // (voir syncPowerUI/onKeyDown : currentTool === 'select').
  const POWER_TYPES = new Set(['wind']);
  // Regroupement de la palette par catégorie (au lieu d'une longue liste à
  // plat) : plus facile à parcourir.
  const CATEGORIES = [
    { label: 'Structure', types: ['normal', 'ice', 'boost', 'bounce', 'crumble', 'perfectBounce'] },
    { label: 'Dangers', types: ['spike'] },
    { label: 'Parcours', types: ['spawn', 'finish', 'checkpoint'] },
    { label: 'Mécaniques', types: ['orb', 'wind', 'lowgrav', 'phase'] },
  ];
  const POWER_LABELS = ['Faible', 'Moyen', 'Fort'];
  // Vitesse (en unités/seconde) d'un bloc rendu mobile (outil Sélection) —
  // réglable précisément via une glissière, pas seulement 3 paliers. Les
  // valeurs par défaut d'un bloc TOUT JUSTE posé restent fixes ici (c'est
  // juste un point de départ raisonnable) ; en revanche les BORNES de la
  // glissière (jusqu'où on peut la pousser) viennent de l'écran "Règles"
  // (voir AS.Storage.getRules() / rules() ci-dessous) — plus de plafond
  // figé dans le code, "libre" au sens où l'utilisateur choisit lui-même
  // jusqu'où aller.
  const DEFAULT_SPEED = 2.5;
  const DEFAULT_BOUNCE_FORCE = 19;
  const DEFAULT_CRUMBLE_TIME = 0.45;
  function rules() { return AS.Storage.getRules(); }

  let renderer = null, canvas = null, scene = null, camera = null;
  let blocks = [];           // [{gx,gy,gz,type,rot,power,speed,bounceForce,crumbleTime,waypoints,mesh}]
  let cellMap = {};          // "gx,gy,gz" -> entry
  let currentType = 'normal';
  // Outil actif : 'build' (poser/retirer des blocs, comportement d'origine)
  // ou 'select' (cliquer un bloc existant pour le choisir, puis cliquer
  // ailleurs pour lui ajouter des points de passage — voir plus bas).
  let currentTool = 'build';
  // Taille de pose en mode Construire : 'full' (une cellule de grille,
  // comportement d'origine) ou 'quarter' (un quart de la cellule en X/Z —
  // la hauteur ne change pas) pour un placement bien plus précis. Purement
  // une sous-option du mode Construire, sans effet en mode Sélection.
  let currentBlockSize = 'full';
  let selectedEntry = null;
  let selectionGroup = null;
  let currentRot = 0;        // 0-3, orientation (quart de tour) pour les types directionnels
  let currentPower = 2;      // 1-3, intensité pour les types qui en ont une (vent)
  let currentLevelName = '';
  let currentBackground = AS.BACKGROUND_CHOICES[0].id;
  let currentTheme = 'rock';
  let ghost = null;
  let ghostArrow = null;
  let groundPlane = null;
  let raycaster = null;
  let analysisGroup = null;

  // ---- Caméra orbitale (souris, pas de pointer lock) -----------------------
  const orbit = { az: Math.PI * 0.25, el: 0.55, dist: 26, target: new THREE.Vector3(0, 1, 0) };
  let dragging = false, dragButton = -1, dragMoved = false, lastX = 0, lastY = 0;

  function applyCamera() {
    const el = AS.Util.clamp(orbit.el, -1.3, 1.3);
    const x = orbit.target.x + orbit.dist * Math.cos(el) * Math.sin(orbit.az);
    const y = orbit.target.y + orbit.dist * Math.sin(el);
    const z = orbit.target.z + orbit.dist * Math.cos(el) * Math.cos(orbit.az);
    camera.position.set(x, y, z);
    camera.lookAt(orbit.target);
  }

  // Espace de clés séparé par taille : un bloc plein (gx=1,gz=1) et un
  // quart de bloc (gx=1,gz=1) n'occupent PAS la même position réelle
  // (échelles différentes), donc jamais la même clé — sinon poser un quart
  // de bloc pourrait être bloqué à tort par un bloc plein sans rapport.
  function cellKey(gx, gy, gz, size) { return (size || 'full') + ':' + gx + ',' + gy + ',' + gz; }

  function makeGhost() {
    const geo = new THREE.BoxGeometry(CELL.x * 0.98, CELL.y * 0.98, CELL.z * 0.98);
    const mat = new THREE.MeshBasicMaterial({ color: 0x6ee7ff, transparent: true, opacity: 0.35, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 0.9, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false })
    );
    arrow.rotation.x = Math.PI / 2;
    arrow.position.set(0, 0, CELL.z * 0.55);
    arrow.visible = false;
    mesh.add(arrow);
    ghostArrow = arrow;
    return mesh;
  }

  function blockMaterial(type) {
    if (MARKER_TYPES.has(type)) {
      return new THREE.MeshBasicMaterial({
        color: TYPE_COLORS[type] || '#9c9484', transparent: true, opacity: 0.5,
        depthWrite: false, side: THREE.DoubleSide,
      });
    }
    return new THREE.MeshStandardMaterial({ color: TYPE_COLORS[type] || '#9c9484', roughness: 0.8 });
  }

  // Les marqueurs (checkpoint, vent, gravité, téléporteurs, plateformes
  // mobiles, décor) n'ont pas de collision : un petit repère translucide
  // suffit, plus petit qu'un bloc plein pour bien montrer que
  // le joueur passe au travers.
  function blockGeometry(type, size) {
    const s = stepXZ(size);
    const fx = s.x / CELL.x, fz = s.z / CELL.z; // 1 (plein) ou 0.5 (quart)
    if (type === 'orb') return new THREE.SphereGeometry(CELL.x * 0.42 * fx, 16, 12);
    if (MARKER_TYPES.has(type)) return new THREE.BoxGeometry(CELL.x * 0.5 * fx, CELL.y * 0.5, CELL.z * 0.5 * fz);
    return new THREE.BoxGeometry(CELL.x * 0.96 * fx, CELL.y * 0.92, CELL.z * 0.96 * fz);
  }

  // Une simple rotation de cube ne se voit pas (géométrie symétrique) : les
  // types orientables portent une petite flèche pour que la direction posée
  // reste visible une fois le bloc en place, pas seulement sur l'aperçu.
  function addDirectionArrow(mesh, type, size) {
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.55, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false })
    );
    arrow.rotation.x = Math.PI / 2;
    const fz = stepXZ(size).z / CELL.z;
    const forward = (MARKER_TYPES.has(type) ? CELL.z * 0.5 * fz : CELL.z * 0.96 * fz) / 2 + 0.32;
    arrow.position.set(0, 0, forward);
    mesh.add(arrow);
  }

  function addBlock(gx, gy, gz, type, rot, power, waypoints, speed, bounceForce, crumbleTime, size) {
    const key = cellKey(gx, gy, gz, size);
    if (cellMap[key]) return cellMap[key];
    invalidateAnalysis();
    if (type === 'spawn') {
      // un seul départ à la fois
      for (const b of blocks) if (b.type === 'spawn') removeBlockEntry(b);
    }
    const mesh = new THREE.Mesh(blockGeometry(type, size), blockMaterial(type));
    const s = stepXZ(size);
    mesh.position.set(gx * s.x, gy * CELL.y, gz * s.z);
    if (ROTATABLE_TYPES.has(type)) {
      mesh.rotation.y = (rot || 0) * Math.PI / 2;
      addDirectionArrow(mesh, type, size);
    }
    mesh.castShadow = !MARKER_TYPES.has(type);
    mesh.receiveShadow = !MARKER_TYPES.has(type);
    scene.add(mesh);
    const entry = {
      gx, gy, gz, type, rot: rot || 0, power: power || 2, speed: speed || DEFAULT_SPEED,
      bounceForce: bounceForce != null ? bounceForce : DEFAULT_BOUNCE_FORCE,
      crumbleTime: crumbleTime != null ? crumbleTime : DEFAULT_CRUMBLE_TIME,
      size: size === 'quarter' ? 'quarter' : undefined,
      waypoints: (waypoints || []).map((w) => ({ gx: w.gx, gy: w.gy, gz: w.gz })),
      mesh,
    };
    blocks.push(entry);
    cellMap[key] = entry;
    refreshMobileIndicator(entry);
    return entry;
  }

  function removeBlockEntry(entry) {
    invalidateAnalysis();
    if (entry === selectedEntry) selectBlock(null);
    scene.remove(entry.mesh);
    entry.mesh.geometry.dispose();
    const idx = blocks.indexOf(entry);
    if (idx >= 0) blocks.splice(idx, 1);
    delete cellMap[cellKey(entry.gx, entry.gy, entry.gz, entry.size)];
  }

  function clearAll() {
    for (const b of blocks.slice()) removeBlockEntry(b);
  }

  function updateHint() {
    const el = document.getElementById('editorCount');
    if (el) el.textContent = blocks.length + ' bloc(s)';
    // Signal générique "les blocs ont changé" — main.js s'en sert pour
    // rafraîchir la liste "Tester depuis" (Départ + checkpoints) sans que
    // ce module ait besoin de connaître cet élément d'interface.
    document.dispatchEvent(new CustomEvent('as:editor-changed'));
  }

  // ---- Raycast souris -> cellule ciblée -------------------------------------
  function pickTarget(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(ndc, camera);
    // En mode Sélection, les marqueurs de points de passage (petits cubes
    // dorés du halo, voir refreshSelectionVisuals) sont eux aussi visables :
    // cliquer sur LEUR face du dessus ajoute un nouveau point au-dessus
    // d'EUX (pas seulement au-dessus du bloc de base), ce qui permet
    // d'empiler autant de points verticaux que voulu (ex: un ascenseur à
    // plusieurs étages), exactement comme on empile des blocs en construction.
    const waypointMeshes = (currentTool === 'select' && selectionGroup)
      ? selectionGroup.children.filter((o) => o.userData.waypointRef)
      : [];
    const meshes = blocks.map((b) => b.mesh).concat(waypointMeshes).concat([groundPlane]);
    const hits = raycaster.intersectObjects(meshes, false);
    if (!hits.length) return null;
    const hit = hits[0];
    if (hit.object === groundPlane) {
      const s = currentTool === 'select' ? CELL : stepXZ(effectiveBlockSize());
      return {
        place: { gx: Math.round(hit.point.x / s.x), gy: 0, gz: Math.round(hit.point.z / s.z) },
        removeEntry: null,
      };
    }
    const ref = hit.object.userData.waypointRef || blocks.find((b) => b.mesh === hit.object);
    const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    let place;
    if (currentTool === 'select') {
      place = { gx: ref.gx + Math.round(n.x), gy: ref.gy + Math.round(n.y), gz: ref.gz + Math.round(n.z) };
    } else {
      // Un pas de la grille du bloc CLIQUÉ (sa propre taille), dans le sens
      // de la face touchée, donne une position MONDE juste à l'extérieur —
      // reconvertie ensuite dans la grille du bloc EN COURS DE POSE (qui
      // peut avoir une taille différente, ex. un quart de bloc contre un
      // bloc plein) : ça permet de mélanger les deux tailles sans que
      // l'arithmétique d'indices ne devienne fausse.
      const refStep = stepXZ(ref.size);
      const worldX = ref.gx * refStep.x + n.x * refStep.x;
      const worldY = ref.gy * CELL.y + n.y * CELL.y;
      const worldZ = ref.gz * refStep.z + n.z * refStep.z;
      const newStep = stepXZ(effectiveBlockSize());
      place = {
        gx: Math.round(worldX / newStep.x),
        gy: Math.round(worldY / CELL.y),
        gz: Math.round(worldZ / newStep.z),
      };
    }
    const entry = blocks.find((b) => b.mesh === hit.object) || null;
    return { place, removeEntry: entry };
  }

  // ---- Entrées souris / clavier ---------------------------------------------
  function onPointerDown(e) {
    if (e.target !== canvas) return;
    dragging = true; dragButton = e.button; dragMoved = false;
    lastX = e.clientX; lastY = e.clientY;
  }
  function onPointerMove(e) {
    if (!dragging) {
      // L'outil Sélection n'affiche pas le fantôme de pose (rien ne se
      // construit avec cet outil, seulement des points de passage).
      if (currentTool === 'select') { ghost.visible = false; return; }
      const t = pickTarget(e.clientX, e.clientY);
      if (t && t.place) {
        const s = stepXZ(effectiveBlockSize());
        const fx = s.x / CELL.x, fz = s.z / CELL.z;
        ghost.visible = true;
        ghost.position.set(t.place.gx * s.x, t.place.gy * CELL.y, t.place.gz * s.z);
        ghost.scale.set(fx, 1, fz);
        ghost.material.color.set(TYPE_COLORS[currentType]);
        ghost.material.opacity = MARKER_TYPES.has(currentType) ? 0.55 : 0.35;
        ghost.rotation.y = ROTATABLE_TYPES.has(currentType) ? currentRot * Math.PI / 2 : 0;
        ghostArrow.visible = ROTATABLE_TYPES.has(currentType);
        // Contre-échelle : sans ça, la flèche (enfant du fantôme) serait
        // écrasée en même temps que le cube en mode quart de bloc — elle ne
        // doit rétrécir que sa DISTANCE au centre (déjà donnée par l'échelle
        // du parent), pas sa propre forme.
        ghostArrow.scale.set(1 / fx, 1, 1 / fz);
      } else {
        ghost.visible = false;
      }
      return;
    }
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    if (Math.abs(dx) + Math.abs(dy) > 3) dragMoved = true;
    if (dragButton === 0 || dragButton === 2) {
      orbit.az -= dx * 0.0065;
      orbit.el += dy * 0.0055;
    }
    lastX = e.clientX; lastY = e.clientY;
    applyCamera();
  }
  function onPointerUp(e) {
    if (!dragging) return;
    dragging = false;
    if (dragMoved) return; // c'était un glissé caméra, pas un clic de pose/retrait
    const t = pickTarget(e.clientX, e.clientY);
    if (!t) return;

    if (currentTool === 'select') {
      if (e.button === 2) {
        // Clic droit : retire le dernier point de passage du bloc
        // sélectionné (pas de suppression de bloc avec cet outil, pour ne
        // pas confondre avec le retrait du mode Construire).
        removeLastWaypoint();
        return;
      }
      if (e.button !== 0) return;
      if (!selectedEntry) {
        if (t.removeEntry) selectBlock(t.removeEntry); // clic sur un bloc -> le sélectionne
        return;
      }
      // Un bloc est déjà sélectionné : TOUT clic (y compris sur le bloc lui-
      // même, ou sur un point de passage déjà posé) ajoute un point à la
      // cellule ADJACENTE à la face cliquée — jamais à l'intérieur d'un bloc
      // existant, même logique que la pose normale. Cliquer la face du DESSUS
      // du bloc sélectionné (ou d'un de ses points) pose donc un point
      // directement au-dessus de lui : c'est ce qui permet de faire monter
      // et descendre une plateforme à la verticale. La désélection se fait
      // via Échap (ou l'outil Construire).
      if (t.place) addWaypointToSelected(t.place.gx, t.place.gy, t.place.gz);
      return;
    }

    if (e.button === 2) {
      if (t.removeEntry) removeBlockEntry(t.removeEntry);
    } else if (e.button === 0) {
      if (t.place) addBlock(t.place.gx, t.place.gy, t.place.gz, currentType, currentRot, currentPower, null, null, null, null, effectiveBlockSize());
    }
    updateHint();
  }
  function onWheel(e) {
    if (e.target !== canvas) return;
    e.preventDefault();
    // Distance max réglable depuis l'écran Règles (cameraMaxDist) — plus de
    // plafond figé qui empêcherait de voir/atteindre un très grand niveau.
    orbit.dist = AS.Util.clamp(orbit.dist + e.deltaY * 0.02, 6, rules().cameraMaxDist);
    applyCamera();
  }
  function onContextMenu(e) {
    if (e.target === canvas) e.preventDefault();
  }
  const panKeys = new Set();
  // Jeu de raccourcis "Éditeur" séparé de celui du jeu (voir AS.Storage.
  // getEditorKeybinds / AS.Keybinds.EDITOR_ACTIONS, réassignable dans
  // Paramètres) — plus aucun code clavier n'est en dur ici.
  function onKeyDown(e) {
    const binds = AS.Storage.getEditorKeybinds();
    if ([binds.panForward, binds.panBack, binds.panLeft, binds.panRight, binds.panDown, binds.panUp].includes(e.code)
      && !e.ctrlKey && !e.metaKey) panKeys.add(e.code);
    if (e.code === binds.rotate && !e.repeat) {
      if (currentTool === 'select' && selectedEntry && ROTATABLE_TYPES.has(selectedEntry.type)) {
        rotateSelectedBlock();
      } else if (ROTATABLE_TYPES.has(currentType)) {
        currentRot = (currentRot + 1) % 4;
        syncRotUI();
      }
    }
    if (e.code === binds.power && !e.repeat && currentTool === 'build' && POWER_TYPES.has(currentType)) {
      currentPower = (currentPower % 3) + 1;
      syncPowerUI();
    }
    if (e.code === binds.deselect && currentTool === 'select' && selectedEntry) {
      selectBlock(null);
    }
    if (e.code === binds.removeWaypoint && !e.repeat && currentTool === 'select' && selectedEntry) {
      e.preventDefault();
      removeLastWaypoint();
    }
    if (e.code === binds.toggleTool && !e.repeat) {
      e.preventDefault();
      setTool(currentTool === 'build' ? 'select' : 'build');
    }
    if (e.code === binds.testLevel && !e.repeat && !e.ctrlKey && !e.metaKey) {
      const btn = document.getElementById('editorTestBtn');
      if (btn) btn.click();
    }
    if (e.code === binds.quickSave && !e.repeat && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const btn = document.getElementById('editorSaveBtn');
      if (btn) btn.click();
    }
  }
  function onKeyUp(e) { panKeys.delete(e.code); }
  function rotLabel() {
    const arrows = ['↑ Nord', '→ Est', '↓ Sud', '← Ouest'];
    const rot = (currentTool === 'select' && selectedEntry) ? selectedEntry.rot : currentRot;
    return 'Orientation (R) : ' + arrows[rot];
  }
  function powerLabel() {
    return 'Puissance (P) : ' + POWER_LABELS[currentPower - 1];
  }

  function panStep(dt) {
    const binds = AS.Storage.getEditorKeybinds();
    const speed = 32 * dt;
    const fwd = new THREE.Vector3(Math.sin(orbit.az), 0, Math.cos(orbit.az));
    const right = new THREE.Vector3(Math.sin(orbit.az + Math.PI / 2), 0, Math.cos(orbit.az + Math.PI / 2));
    if (panKeys.has(binds.panForward)) orbit.target.addScaledVector(fwd, -speed);
    if (panKeys.has(binds.panBack)) orbit.target.addScaledVector(fwd, speed);
    if (panKeys.has(binds.panLeft)) orbit.target.addScaledVector(right, -speed);
    if (panKeys.has(binds.panRight)) orbit.target.addScaledVector(right, speed);
    if (panKeys.has(binds.panDown)) orbit.target.y -= speed;
    if (panKeys.has(binds.panUp)) orbit.target.y += speed;
  }

  function syncRotUI() {
    const btn = document.getElementById('editorRotBtn');
    if (!btn) return;
    if (currentTool === 'select' && selectedEntry && ROTATABLE_TYPES.has(selectedEntry.type)) {
      btn.hidden = false;
      btn.textContent = rotLabel();
      return;
    }
    const active = currentTool === 'build' && ROTATABLE_TYPES.has(currentType);
    btn.hidden = !active;
    if (active) btn.textContent = rotLabel();
  }

  function syncPowerUI() {
    const btn = document.getElementById('editorPowerBtn');
    if (!btn) return;
    const active = currentTool === 'build' && POWER_TYPES.has(currentType);
    btn.hidden = !active;
    if (active) btn.textContent = powerLabel();
  }

  // Vitesse précise (unités/seconde) d'un bloc rendu mobile — glissière au
  // lieu de 3 paliers fixes, affichée seulement quand un bloc est
  // sélectionné en mode Sélection.
  function syncSpeedUI() {
    const wrap = document.getElementById('editorSpeedControl');
    if (!wrap) return;
    const active = currentTool === 'select' && !!selectedEntry;
    wrap.hidden = !active;
    if (!active) return;
    const r = rules();
    selectedEntry.speed = AS.Util.clamp(selectedEntry.speed, r.moverSpeedMin, r.moverSpeedMax);
    const range = document.getElementById('editorSpeedRange');
    const val = document.getElementById('editorSpeedValue');
    if (range) { range.min = r.moverSpeedMin; range.max = r.moverSpeedMax; range.value = selectedEntry.speed; }
    if (val) val.textContent = selectedEntry.speed.toFixed(1);
  }

  // Force de rebond précise (unités/seconde) d'un bloc "Rebond" sélectionné —
  // même principe que syncSpeedUI, glissière libre plutôt qu'une valeur figée.
  // Les bornes viennent de l'écran Règles (rules().bounceForceMin/Max), pas
  // d'un plafond figé dans le code.
  function syncBounceUI() {
    const wrap = document.getElementById('editorBounceControl');
    if (!wrap) return;
    const active = currentTool === 'select' && !!selectedEntry && selectedEntry.type === 'bounce';
    wrap.hidden = !active;
    if (!active) return;
    const r = rules();
    selectedEntry.bounceForce = AS.Util.clamp(selectedEntry.bounceForce, r.bounceForceMin, r.bounceForceMax);
    const range = document.getElementById('editorBounceRange');
    const val = document.getElementById('editorBounceValue');
    if (range) { range.min = r.bounceForceMin; range.max = r.bounceForceMax; range.value = selectedEntry.bounceForce; }
    if (val) val.textContent = selectedEntry.bounceForce.toFixed(1);
  }

  // Temps avant effondrement (secondes) d'un bloc "Fragile" sélectionné —
  // bornes venant de rules().crumbleTimeMin/Max.
  function syncCrumbleUI() {
    const wrap = document.getElementById('editorCrumbleControl');
    if (!wrap) return;
    const active = currentTool === 'select' && !!selectedEntry && selectedEntry.type === 'crumble';
    wrap.hidden = !active;
    if (!active) return;
    const r = rules();
    selectedEntry.crumbleTime = AS.Util.clamp(selectedEntry.crumbleTime, r.crumbleTimeMin, r.crumbleTimeMax);
    const range = document.getElementById('editorCrumbleRange');
    const val = document.getElementById('editorCrumbleValue');
    if (range) { range.min = r.crumbleTimeMin; range.max = r.crumbleTimeMax; range.value = selectedEntry.crumbleTime; }
    if (val) val.textContent = selectedEntry.crumbleTime.toFixed(2);
  }

  function syncToolUI() {
    const buildBtn = document.getElementById('editorToolBuildBtn');
    const selectBtn = document.getElementById('editorToolSelectBtn');
    if (buildBtn) buildBtn.classList.toggle('selected', currentTool === 'build');
    if (selectBtn) selectBtn.classList.toggle('selected', currentTool === 'select');
    const hint = document.getElementById('editorSelectHint');
    if (hint) hint.hidden = currentTool !== 'select';
    const sizeWrap = document.getElementById('editorSizeGroup');
    if (sizeWrap) sizeWrap.hidden = currentTool !== 'build';
    syncRotUI();
    syncPowerUI();
    syncSpeedUI();
    syncBounceUI();
    syncCrumbleUI();
    syncBlockSizeUI();
  }

  function setTool(tool) {
    currentTool = tool;
    if (tool !== 'select') selectBlock(null);
    ghost.visible = false;
    syncToolUI();
  }

  // Sous-option du mode Construire (voir currentBlockSize) : bascule entre
  // poser des blocs pleins (comportement d'origine) et des quarts de bloc
  // (un quart de la surface au sol, pour un placement bien plus précis).
  function setBlockSize(size) {
    currentBlockSize = size === 'quarter' ? 'quarter' : 'full';
    syncBlockSizeUI();
  }

  function syncBlockSizeUI() {
    const fullBtn = document.getElementById('editorSizeFullBtn');
    const quarterBtn = document.getElementById('editorSizeQuarterBtn');
    if (fullBtn) fullBtn.classList.toggle('selected', currentBlockSize === 'full');
    if (quarterBtn) quarterBtn.classList.toggle('selected', currentBlockSize === 'quarter');
  }

  function syncBackgroundUI() {
    const bgSelect = document.getElementById('editorBackgroundSelect');
    if (bgSelect) bgSelect.value = currentBackground;
  }

  function syncThemeUI() {
    const themeSelect = document.getElementById('editorThemeSelect');
    if (themeSelect) themeSelect.value = currentTheme;
  }

  // ---- Palette / UI -----------------------------------------------------
  function buildPalette(container) {
    container.innerHTML = '';
    CATEGORIES.forEach((cat) => {
      const section = document.createElement('div');
      section.className = 'editor-palette-section';
      const heading = document.createElement('div');
      heading.className = 'editor-palette-heading';
      heading.textContent = cat.label;
      section.appendChild(heading);
      const group = document.createElement('div');
      group.className = 'editor-palette-group';
      cat.types.forEach((type) => {
        const btn = document.createElement('button');
        btn.className = 'editor-palette-btn' + (type === currentType ? ' selected' : '');
        btn.style.setProperty('--swatch', TYPE_COLORS[type]);
        btn.innerHTML = '<span class="swatch"></span>' + TYPE_LABELS[type];
        btn.addEventListener('click', () => {
          currentType = type;
          container.querySelectorAll('.editor-palette-btn').forEach((b) => b.classList.remove('selected'));
          btn.classList.add('selected');
          syncRotUI();
          syncPowerUI();
        });
        group.appendChild(btn);
      });
      section.appendChild(group);
      container.appendChild(section);
    });
  }

  function refreshLevelSelect(selectEl) {
    const levels = AS.Storage.loadLevels();
    selectEl.innerHTML = '<option value="">— Charger un niveau —</option>';
    Object.keys(levels).sort().forEach((name) => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name + (levels[name].best != null ? ' (' + AS.Hud.fmtTime(levels[name].best) + ')' : '');
      selectEl.appendChild(opt);
    });
  }

  function loadIntoEditor(name) {
    const levels = AS.Storage.loadLevels();
    const lvl = levels[name];
    if (!lvl) return;
    clearAll();
    for (const b of lvl.blocks) addBlock(b.gx, b.gy, b.gz, b.type, b.rot, b.power, b.waypoints, b.speed, b.bounceForce, b.crumbleTime, b.size);
    currentLevelName = name;
    currentBackground = lvl.background || AS.BACKGROUND_CHOICES[0].id;
    currentTheme = lvl.theme || 'rock';
    syncBackgroundUI();
    syncThemeUI();
    setTool('build');
    updateHint();
  }

  function hasSpawn() { return blocks.some((b) => b.type === 'spawn'); }
  function hasFinish() { return blocks.some((b) => b.type === 'finish'); }

  function exportBlocks() {
    return blocks.map((b) => ({
      gx: b.gx, gy: b.gy, gz: b.gz, type: b.type, rot: b.rot, power: b.power,
      speed: b.waypoints && b.waypoints.length ? b.speed : undefined,
      bounceForce: b.type === 'bounce' ? b.bounceForce : undefined,
      crumbleTime: b.type === 'crumble' ? b.crumbleTime : undefined,
      size: b.size,
      waypoints: b.waypoints && b.waypoints.length ? b.waypoints.map((w) => ({ gx: w.gx, gy: w.gy, gz: w.gz })) : undefined,
    }));
  }

  // ---- Outil Sélection : rendre un bloc existant mobile -------------------
  // Plus de type "plateforme mobile" à part (voir world.js) : n'importe quel
  // bloc plein peut recevoir une liste de points de passage et fera la
  // tournée en boucle infinie, tout en gardant son propre type/comportement.
  // Un petit indicateur doré persiste sur les blocs mobiles même hors
  // sélection, pour les repérer d'un coup d'oeil en construisant le reste.
  function refreshMobileIndicator(entry) {
    const isMobile = entry.waypoints && entry.waypoints.length > 0;
    const has = entry.mesh.userData.mobileIndicator;
    if (isMobile && !has) {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xffe066 })
      );
      dot.position.set(0, CELL.y * 0.62, 0);
      entry.mesh.add(dot);
      entry.mesh.userData.mobileIndicator = dot;
    } else if (!isMobile && has) {
      entry.mesh.remove(has);
      has.geometry.dispose(); has.material.dispose();
      entry.mesh.userData.mobileIndicator = null;
    }
  }

  function selectBlock(entry) {
    selectedEntry = entry;
    refreshSelectionVisuals();
    syncSpeedUI();
    syncRotUI();
    syncBounceUI();
    syncCrumbleUI();
  }

  // Oriente le bloc SÉLECTIONNÉ (pas seulement le type en cours dans la
  // palette, voir onKeyDown) : c'était le seul moyen manquant pour corriger
  // le sens d'un vent/pad de vitesse déjà posé sans devoir le supprimer et
  // le reposer — la flèche blanche qui l'indique déjà (voir
  // addDirectionArrow) tourne avec lui, donc le nouveau sens se voit
  // immédiatement.
  function rotateSelectedBlock() {
    if (!selectedEntry) return;
    selectedEntry.rot = (selectedEntry.rot + 1) % 4;
    selectedEntry.mesh.rotation.y = selectedEntry.rot * Math.PI / 2;
    invalidateAnalysis();
    syncRotUI();
  }

  function addWaypointToSelected(gx, gy, gz) {
    if (!selectedEntry) return;
    selectedEntry.waypoints.push({ gx, gy, gz });
    invalidateAnalysis();
    refreshMobileIndicator(selectedEntry);
    refreshSelectionVisuals();
  }

  function removeLastWaypoint() {
    if (!selectedEntry || !selectedEntry.waypoints.length) return;
    selectedEntry.waypoints.pop();
    invalidateAnalysis();
    refreshMobileIndicator(selectedEntry);
    refreshSelectionVisuals();
  }

  function clearSelectionVisuals() {
    if (!selectionGroup) return;
    scene.remove(selectionGroup);
    selectionGroup.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    selectionGroup = null;
  }

  // Halo doré autour du bloc sélectionné + un marqueur par point de passage,
  // reliés par une ligne qui se referme sur le point de départ : la boucle
  // infinie se lit directement, pas seulement le premier aller-retour.
  function refreshSelectionVisuals() {
    clearSelectionVisuals();
    if (!selectedEntry || !scene) return;
    selectionGroup = new THREE.Group();
    const halo = new THREE.Mesh(
      new THREE.BoxGeometry(CELL.x * 1.1, CELL.y * 1.1, CELL.z * 1.1),
      new THREE.MeshBasicMaterial({ color: 0xffe066, wireframe: true, transparent: true, opacity: 0.9 })
    );
    halo.position.set(selectedEntry.gx * CELL.x, selectedEntry.gy * CELL.y, selectedEntry.gz * CELL.z);
    selectionGroup.add(halo);

    const waypoints = selectedEntry.waypoints || [];
    if (waypoints.length) {
      const basePt = new THREE.Vector3(selectedEntry.gx * CELL.x, selectedEntry.gy * CELL.y, selectedEntry.gz * CELL.z);
      const pts = [basePt].concat(waypoints.map((w) => new THREE.Vector3(w.gx * CELL.x, w.gy * CELL.y, w.gz * CELL.z)));
      // Cubes (pas des sphères) : leurs faces planes donnent une normale
      // exploitable par pickTarget, exactement comme un bloc — cliquer leur
      // face du dessus/dessous/côté empile un nouveau point de passage dans
      // cette direction (voir pickTarget/onPointerUp).
      const markerGeo = new THREE.BoxGeometry(0.64, 0.64, 0.64);
      const markerMat = new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.85 });
      waypoints.forEach((w) => {
        const m = new THREE.Mesh(markerGeo, markerMat);
        m.position.set(w.gx * CELL.x, w.gy * CELL.y, w.gz * CELL.z);
        m.userData.waypointRef = { gx: w.gx, gy: w.gy, gz: w.gz };
        selectionGroup.add(m);
      });
      const loopPts = pts.concat([pts[0]]);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(loopPts);
      const lineMat = new THREE.LineBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.85 });
      selectionGroup.add(new THREE.Line(lineGeo, lineMat));
    }
    scene.add(selectionGroup);
  }

  // ---- Trajectoire du bot d'analyse OU du dernier essai réel du joueur -----
  // Une sphère rouge translucide par image échantillonnée, à la taille du
  // hitbox du joueur (rayon CFG.playerRadius) — un "fantôme" du passage
  // plutôt qu'une simple ligne, pour bien voir la vitesse (densité des
  // sphères) et pas seulement le chemin.
  //
  // `trailIsPlayerRun` distingue les deux provenances possibles :
  //  - false : résultat du bot (AS.Analyzer) — une analyse précédente ne
  //    reste pas valable si le niveau change, donc invalidateAnalysis()
  //    l'efface automatiquement à chaque bloc ajouté/retiré.
  //  - true : trajectoire RÉELLEMENT parcourue par le joueur pendant un
  //    test (voir AS.Storage... non, voir main.js/showPlayerTrail) — elle
  //    reste affichée quoi qu'on fasse dans l'éditeur, et ne disparaît que
  //    lorsqu'on clique explicitement "Effacer la trajectoire" : modifier
  //    le niveau ne la rend pas fausse (c'est un fait passé, pas une
  //    prédiction), donc invalidateAnalysis() la laisse tranquille.
  let trailIsPlayerRun = false;

  function clearAnalysisTrail() {
    trailIsPlayerRun = false;
    if (!analysisGroup) return;
    scene.remove(analysisGroup);
    analysisGroup.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    analysisGroup = null;
  }

  // Le niveau a changé (bloc ajouté/retiré) : une analyse du BOT précédente
  // ne serait plus valable — efface la trajectoire ET referme le panneau de
  // résultats (contrairement à showAnalysisTrail, qui ne fait que redessiner
  // la trajectoire sans toucher au panneau que main.js vient de remplir).
  // Ne touche jamais à la trajectoire d'un essai réel du joueur (voir
  // trailIsPlayerRun ci-dessus) : elle persiste jusqu'au clic explicite sur
  // "Effacer la trajectoire".
  function invalidateAnalysis() {
    if (trailIsPlayerRun) return;
    const panel = document.getElementById('editorAnalysis');
    if (panel) panel.hidden = true;
    clearAnalysisTrail();
  }

  function showAnalysisTrail(points, stuckAt) {
    clearAnalysisTrail();
    if (!scene || !points || !points.length) return;
    analysisGroup = new THREE.Group();
    const radius = (AS.CFG && AS.CFG.playerRadius) || 0.42;
    const stride = Math.max(1, Math.floor(points.length / 260));
    const sampled = points.filter((_, i) => i % stride === 0);
    const geo = new THREE.SphereGeometry(radius, 8, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0.35, depthWrite: false });
    const inst = new THREE.InstancedMesh(geo, mat, sampled.length);
    const dummy = new THREE.Object3D();
    sampled.forEach((p, i) => {
      dummy.position.set(p.x, p.y + radius, p.z);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    });
    analysisGroup.add(inst);
    if (stuckAt) {
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.7, 16, 12),
        new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.55, depthWrite: false })
      );
      marker.position.set(stuckAt.x, stuckAt.y + 0.7, stuckAt.z);
      analysisGroup.add(marker);
    }
    scene.add(analysisGroup);
  }

  // Même rendu que showAnalysisTrail, mais marqué comme "essai réel du
  // joueur" (voir trailIsPlayerRun) : reste affiché tant qu'on ne clique
  // pas explicitement sur "Effacer la trajectoire", même en modifiant le
  // niveau.
  function showPlayerTrail(points) {
    showAnalysisTrail(points, null);
    trailIsPlayerRun = true;
  }

  // ---- Cycle de vie ----------------------------------------------------------
  // _initScene() ne s'exécute qu'une fois : la scène/les blocs restent en
  // mémoire quand on quitte temporairement l'éditeur pour tester un niveau,
  // afin de ne pas perdre le travail en cours.
  function _initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a2233);
    scene.fog = new THREE.Fog(0x1a2233, 60, 260);
    camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 500);
    raycaster = new THREE.Raycaster();
    blocks = []; cellMap = {};

    const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x2a2436, 0.9);
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(20, 30, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
    scene.add(hemi, sun);

    // Grille/plan de sol volontairement immenses (quasi "infinis" pour la
    // taille de n'importe quel niveau raisonnable) — voir aussi la distance
    // de vue max de la caméra, réglable dans l'écran Règles (cameraMaxDist),
    // qui était la vraie limite pratique avant (70 unités seulement).
    const grid = new THREE.GridHelper(2400, 800, 0x6ee7ff, 0x33415c);
    grid.position.y = -CELL.y / 2;
    scene.add(grid);

    groundPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(4000, 4000),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.position.y = -CELL.y / 2;
    scene.add(groundPlane);

    ghost = makeGhost();
    scene.add(ghost);

    orbit.az = Math.PI * 0.25; orbit.el = 0.55; orbit.dist = 26;
    orbit.target.set(0, 1, 0);
  }

  function newLevel() {
    if (!scene) return;
    clearAll();
    currentLevelName = '';
    currentBackground = AS.BACKGROUND_CHOICES[0].id;
    currentTheme = 'rock';
    syncBackgroundUI();
    syncThemeUI();
    setTool('build');
    setBlockSize('full');
    orbit.az = Math.PI * 0.25; orbit.el = 0.55; orbit.dist = 26;
    orbit.target.set(0, 1, 0);
    updateHint();
  }

  function open(sharedRenderer, sharedCanvas) {
    renderer = sharedRenderer;
    canvas = sharedCanvas;
    if (!scene) _initScene();
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    applyCamera();

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const palette = document.getElementById('editorPalette');
    if (palette) buildPalette(palette);
    const select = document.getElementById('editorLevelSelect');
    if (select) refreshLevelSelect(select);
    const rotBtn = document.getElementById('editorRotBtn');
    if (rotBtn && !rotBtn.__wired) {
      rotBtn.__wired = true;
      rotBtn.addEventListener('click', () => {
        if (currentTool === 'select' && selectedEntry && ROTATABLE_TYPES.has(selectedEntry.type)) {
          rotateSelectedBlock();
        } else {
          currentRot = (currentRot + 1) % 4;
          syncRotUI();
        }
      });
    }
    const powerBtn = document.getElementById('editorPowerBtn');
    if (powerBtn && !powerBtn.__wired) {
      powerBtn.__wired = true;
      powerBtn.addEventListener('click', () => {
        currentPower = (currentPower % 3) + 1;
        syncPowerUI();
      });
    }
    const speedRange = document.getElementById('editorSpeedRange');
    if (speedRange && !speedRange.__wired) {
      speedRange.__wired = true;
      speedRange.step = 0.1; // min/max : voir syncSpeedUI (dépendent de l'écran Règles)
      speedRange.addEventListener('input', () => {
        if (!selectedEntry) return;
        selectedEntry.speed = parseFloat(speedRange.value);
        const val = document.getElementById('editorSpeedValue');
        if (val) val.textContent = selectedEntry.speed.toFixed(1);
        invalidateAnalysis();
      });
    }
    const bounceRange = document.getElementById('editorBounceRange');
    if (bounceRange && !bounceRange.__wired) {
      bounceRange.__wired = true;
      bounceRange.step = 0.5; // min/max : voir syncBounceUI (dépendent de l'écran Règles)
      bounceRange.addEventListener('input', () => {
        if (!selectedEntry) return;
        selectedEntry.bounceForce = parseFloat(bounceRange.value);
        const val = document.getElementById('editorBounceValue');
        if (val) val.textContent = selectedEntry.bounceForce.toFixed(1);
        invalidateAnalysis();
      });
    }
    const crumbleRange = document.getElementById('editorCrumbleRange');
    if (crumbleRange && !crumbleRange.__wired) {
      crumbleRange.__wired = true;
      crumbleRange.step = 0.05; // min/max : voir syncCrumbleUI (dépendent de l'écran Règles)
      crumbleRange.addEventListener('input', () => {
        if (!selectedEntry) return;
        selectedEntry.crumbleTime = parseFloat(crumbleRange.value);
        const val = document.getElementById('editorCrumbleValue');
        if (val) val.textContent = selectedEntry.crumbleTime.toFixed(2);
        invalidateAnalysis();
      });
    }
    const toolBuildBtn = document.getElementById('editorToolBuildBtn');
    if (toolBuildBtn && !toolBuildBtn.__wired) {
      toolBuildBtn.__wired = true;
      toolBuildBtn.addEventListener('click', () => setTool('build'));
    }
    const toolSelectBtn = document.getElementById('editorToolSelectBtn');
    if (toolSelectBtn && !toolSelectBtn.__wired) {
      toolSelectBtn.__wired = true;
      toolSelectBtn.addEventListener('click', () => setTool('select'));
    }
    const sizeFullBtn = document.getElementById('editorSizeFullBtn');
    if (sizeFullBtn && !sizeFullBtn.__wired) {
      sizeFullBtn.__wired = true;
      sizeFullBtn.addEventListener('click', () => setBlockSize('full'));
    }
    const sizeQuarterBtn = document.getElementById('editorSizeQuarterBtn');
    if (sizeQuarterBtn && !sizeQuarterBtn.__wired) {
      sizeQuarterBtn.__wired = true;
      sizeQuarterBtn.addEventListener('click', () => setBlockSize('quarter'));
    }
    const bgSelect = document.getElementById('editorBackgroundSelect');
    if (bgSelect && !bgSelect.__wired) {
      bgSelect.__wired = true;
      AS.BACKGROUND_CHOICES.forEach((b) => {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = b.label;
        bgSelect.appendChild(opt);
      });
      bgSelect.addEventListener('change', () => { currentBackground = bgSelect.value; });
    }
    const themeSelect = document.getElementById('editorThemeSelect');
    if (themeSelect && !themeSelect.__wired) {
      themeSelect.__wired = true;
      themeSelect.addEventListener('change', () => { currentTheme = themeSelect.value; });
    }
    syncBackgroundUI();
    syncThemeUI();
    syncToolUI();
    updateHint();
  }

  function close() {
    if (!canvas) return; // jamais ouvert cette session : rien à détacher
    canvas.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('contextmenu', onContextMenu);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    panKeys.clear();
    dragging = false;
  }

  function resize() {
    if (!camera) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }

  function tick(dt) {
    panStep(dt);
    applyCamera();
    renderer.render(scene, camera);
  }

  return {
    open, close, resize, tick,
    addBlock, clearAll, newLevel, loadIntoEditor, refreshLevelSelect,
    hasSpawn, hasFinish, exportBlocks, showAnalysisTrail, clearAnalysisTrail, showPlayerTrail,
    get currentLevelName() { return currentLevelName; },
    set currentLevelName(v) { currentLevelName = v; },
    get currentBackground() { return currentBackground; },
    set currentBackground(v) { currentBackground = v; },
    get currentTheme() { return currentTheme; },
    set currentTheme(v) { currentTheme = v; },
    TYPE_LABELS,
  };
})();
