// ============================================================================
// ASCENSION — storage.js
// Sauvegarde locale : meilleurs temps, réglages, raccourcis clavier et
// niveaux créés dans l'éditeur. Toutes les mécaniques (double saut,
// wall-jump, dash...) sont disponibles dès le départ, il n'y a rien à
// débloquer. Chaque lancement d'un niveau repart du tout début — aucune
// progression de checkpoint n'est donc persistée d'une partie à l'autre.
// Tout est conservé dans localStorage sous deux clés JSON (partie et niveaux).
// ============================================================================
window.AS = window.AS || {};

AS.Storage = (function () {
  const KEY = 'ascension_save_v1';
  const LEVELS_KEY = 'ascension_levels_v1';

  const DEFAULT_KEYBINDS = {
    forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD',
    jump: 'Space', dash: 'ShiftLeft', pause: 'Escape',
  };

  // Second jeu de raccourcis, entièrement séparé du premier : celui de
  // l'éditeur de niveaux (déplacement de caméra, outils...) — voir
  // AS.Keybinds.EDITOR_ACTIONS côté keybinds.js et editor.js qui lit ces
  // codes au lieu de littéraux figés.
  const DEFAULT_EDITOR_KEYBINDS = {
    panForward: 'KeyW', panBack: 'KeyS', panLeft: 'KeyA', panRight: 'KeyD',
    panDown: 'KeyQ', panUp: 'KeyE',
    rotate: 'KeyR', power: 'KeyP',
    deselect: 'Escape',
    removeWaypoint: 'Backspace',
    toggleTool: 'Tab',
    testLevel: 'KeyT',
    quickSave: 'KeyS',
  };

  const LANGUAGES = ['fr', 'en', 'es', 'de', 'it', 'pt', 'ja', 'ko'];

  // ---- Règles du jeu et de l'éditeur -----------------------------------
  // TOUT ce qui règle l'équilibrage (physique du joueur, bornes des
  // réglages par bloc dans l'éditeur) vit ICI, en un seul endroit, plutôt
  // qu'éparpillé en constantes figées dans le code — voir l'écran "Règles"
  // (main.js) qui les affiche/modifie, et AS.World.applyRules() qui les
  // applique à AS.CFG. Ces valeurs par défaut sont celles du jeu "d'origine"
  // (déjà 20% plus rapide que la toute première version — voir jumpVel etc.
  // ci-dessous, qui reflètent ce réglage plutôt que de le ré-appliquer par
  // un facteur cascadé) : les modifier ici ne change QUE le point de départ
  // avant réglage utilisateur, jamais une valeur déjà personnalisée.
  const RULE_DEFAULTS = {
    // ---- Déplacement / saut / dash / mur -----------------------------
    maxSpeed: 10.8, boostMaxSpeed: 20.4,
    jumpVel: 15.6, doubleJumpVel: 13.2,
    wallJumpVelY: 15, wallJumpPush: 11.4,
    dashSpeed: 28.8, dashDuration: 0.16, dashCharges: 1,
    // ---- Gravité (négatif = vers le bas ; "montée" freine le saut tenu,
    // "chute" accélère la descente) -------------------------------------
    gravityRise: -22, gravityFall: -34,
    // ---- Glace : accélération (prise de vitesse) et adhérence (plus
    // haut = moins glissant, freine plus vite) --------------------------
    iceAccel: 13.2, iceFriction: 3,
    // ---- Bornes des glissières par bloc dans l'éditeur (outil
    // Sélection) : jusqu'où la valeur d'UN bloc peut être poussée ------
    bounceForceMin: 5, bounceForceMax: 45,
    crumbleTimeMin: 0.1, crumbleTimeMax: 3,
    moverSpeedMin: 0.3, moverSpeedMax: 6,
    // ---- Distance de vue max de la caméra d'édition (molette) : la
    // grille elle-même n'a pas de limite (juste des nombres), c'est cette
    // distance qui empêchait de voir/atteindre un niveau très étendu -----
    cameraMaxDist: 240,
  };

  function defaultSave() {
    return {
      settings: { difficulty: 'court-1', sfxVolume: 0.8, skin: 'bleu', language: 'fr' },
      keybinds: Object.assign({}, DEFAULT_KEYBINDS),
      editorKeybinds: Object.assign({}, DEFAULT_EDITOR_KEYBINDS),
      rules: Object.assign({}, RULE_DEFAULTS),
      zoneBest: {},      // { [difficulty]: ms }  temps total du niveau
    };
  }

  let data = null;

  function load() {
    if (data) return data;
    try {
      const raw = localStorage.getItem(KEY);
      data = raw ? Object.assign(defaultSave(), JSON.parse(raw)) : defaultSave();
      const d = defaultSave();
      data.settings = Object.assign(d.settings, data.settings);
      data.keybinds = Object.assign({}, d.keybinds, data.keybinds);
      data.editorKeybinds = Object.assign({}, d.editorKeybinds, data.editorKeybinds);
      data.rules = Object.assign({}, d.rules, data.rules);
      data.zoneBest = data.zoneBest || {};
    } catch (e) {
      data = defaultSave();
    }
    return data;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
  }

  function recordZone(difficulty, ms) {
    load();
    const prev = data.zoneBest[difficulty];
    if (prev == null || ms < prev) {
      data.zoneBest[difficulty] = ms;
      save();
      return true;
    }
    return false;
  }

  function setDifficulty(d) { load(); data.settings.difficulty = d; save(); }

  // ---- Volume des effets sonores --------------------------------------------
  function getSfxVolume() { load(); return data.settings.sfxVolume; }
  function setSfxVolume(v) { load(); data.settings.sfxVolume = AS.Util.clamp(v, 0, 1); save(); }

  // ---- Skin du personnage ----------------------------------------------------
  // Tous les skins partagent exactement la même hitbox (capsule dérivée de
  // AS.CFG.playerHeight/playerRadius) : seule l'apparence change, jamais la
  // collision — voir buildPlayerMesh dans main.js.
  function getSkin() { load(); return data.settings.skin; }
  function setSkin(id) { load(); data.settings.skin = id; save(); }

  // ---- Raccourcis clavier --------------------------------------------------
  function getKeybinds() { load(); return data.keybinds; }
  function setKeybind(action, code) {
    load();
    data.keybinds[action] = code;
    save();
  }
  function resetKeybinds() {
    load();
    data.keybinds = Object.assign({}, DEFAULT_KEYBINDS);
    save();
  }

  // ---- Raccourcis clavier de l'ÉDITEUR (jeu séparé du précédent) -----------
  function getEditorKeybinds() { load(); return data.editorKeybinds; }
  function setEditorKeybind(action, code) {
    load();
    data.editorKeybinds[action] = code;
    save();
  }
  function resetEditorKeybinds() {
    load();
    data.editorKeybinds = Object.assign({}, DEFAULT_EDITOR_KEYBINDS);
    save();
  }

  // ---- Langue -----------------------------------------------------------
  function getLanguage() { load(); return data.settings.language || 'fr'; }
  function setLanguage(code) { load(); data.settings.language = code; save(); }

  // ---- Règles du jeu et de l'éditeur (voir RULE_DEFAULTS ci-dessus) -------
  function getRules() { load(); return data.rules; }
  function setRule(key, value) {
    load();
    data.rules[key] = value;
    save();
    if (AS.World && AS.World.applyRules) AS.World.applyRules();
  }
  function resetRules() {
    load();
    data.rules = Object.assign({}, RULE_DEFAULTS);
    save();
    if (AS.World && AS.World.applyRules) AS.World.applyRules();
  }

  // ---- Niveaux créés dans l'éditeur -----------------------------------------
  function loadLevels() {
    try {
      const raw = localStorage.getItem(LEVELS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveLevel(name, levelData) {
    const levels = loadLevels();
    const prevBest = levels[name] ? levels[name].best : null;
    // Une ré-sauvegarde (édition d'un niveau existant) ne doit jamais effacer
    // son assignation à une difficulté principale (voir setLevelMainDifficulty).
    const prevMainDifficulty = levels[name] ? levels[name].mainDifficulty : null;
    levels[name] = Object.assign({}, levelData, { savedAt: Date.now(), best: prevBest, mainDifficulty: prevMainDifficulty });
    try { localStorage.setItem(LEVELS_KEY, JSON.stringify(levels)); } catch (e) { /* ignore */ }
  }

  // ---- Niveaux principaux ----------------------------------------------------
  // Un niveau créé dans l'éditeur peut être assigné à une difficulté
  // (easy/normal/hard/extreme) : c'est ce niveau qui se lance depuis l'écran
  // titre pour cette difficulté. Une seule difficulté par niveau, et un seul
  // niveau par difficulté (assigner en retire l'ancien titulaire du poste).
  function setLevelMainDifficulty(name, diff) {
    const levels = loadLevels();
    if (!levels[name]) return;
    if (diff) {
      Object.keys(levels).forEach((n) => {
        if (levels[n].mainDifficulty === diff) delete levels[n].mainDifficulty;
      });
      levels[name].mainDifficulty = diff;
    } else {
      delete levels[name].mainDifficulty;
    }
    try { localStorage.setItem(LEVELS_KEY, JSON.stringify(levels)); } catch (e) { /* ignore */ }
  }

  function getMainLevelFor(diff) {
    const levels = loadLevels();
    for (const name of Object.keys(levels)) {
      if (levels[name].mainDifficulty === diff) return Object.assign({ name }, levels[name]);
    }
    return null;
  }

  function deleteLevel(name) {
    const levels = loadLevels();
    delete levels[name];
    try { localStorage.setItem(LEVELS_KEY, JSON.stringify(levels)); } catch (e) { /* ignore */ }
  }

  function recordLevelBest(name, ms) {
    const levels = loadLevels();
    const lvl = levels[name];
    if (!lvl) return false;
    if (lvl.best == null || ms < lvl.best) {
      lvl.best = ms;
      try { localStorage.setItem(LEVELS_KEY, JSON.stringify(levels)); } catch (e) { /* ignore */ }
      return true;
    }
    return false;
  }

  return {
    load, save, recordZone,
    setDifficulty, getSfxVolume, setSfxVolume, getSkin, setSkin, DEFAULT_KEYBINDS,
    getKeybinds, setKeybind, resetKeybinds,
    DEFAULT_EDITOR_KEYBINDS, getEditorKeybinds, setEditorKeybind, resetEditorKeybinds,
    LANGUAGES, getLanguage, setLanguage,
    RULE_DEFAULTS, getRules, setRule, resetRules,
    loadLevels, saveLevel, deleteLevel, recordLevelBest,
    setLevelMainDifficulty, getMainLevelFor,
  };
})();
