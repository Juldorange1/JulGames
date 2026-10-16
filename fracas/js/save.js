// Sauvegarde : records, personnage selectionne, parametres audio...
// - version navigateur : localStorage ;
// - version programme (Electron, desktop/) : un FICHIER JSON dans le dossier de l'utilisateur
//   (window.fracasNative, voir desktop/preload.js) -> compatible Steam Cloud.

const SAVE_KEY = 'fracas_save_v1';
const NATIVE = typeof window !== 'undefined' && window.fracasNative ? window.fracasNative : null;

const Save = {
  data: null,

  load() {
    let raw = null;
    if (NATIVE) { try { raw = NATIVE.readSave(); } catch (e) { raw = null; } }
    if (!raw) { try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { raw = null; } }
    let parsed = null;
    if (raw) {
      try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
    }
    const defaults = {
      soundOn: true,
      volume: 0.7,
      speedMult: SPEED_MULT_DEFAULT,
      selectedCharacter: 1,
      language: typeof detectLanguage === 'function' ? detectLanguage() : 'fr', // langue du systeme au 1er lancement
      keybinds: Object.assign({}, DEFAULT_KEYS),
      records: {
        character1: null, character2: null, character3: null, character4: null,
        character5: null, character6: null, character7: null, character8: null,
        character9: null, character10: null, character11: null,
      },
      kills: {},
      money: 0,
      moneyByChar: {},
      cursorColor: '#ffffff',
      cursorStyle: 'cross',
      hub: null,
      // Codex a decouvrir : persos deja joues, ennemis/boss deja croises en partie
      discovered: null,
      playerName: '',
      // Accessibilite : tremblements (%), mode daltonien, taille de l'interface (%), tirs ennemis tres visibles
      access: { shake: 100, colorblind: 'none', text: 100 },
      assist: true, // mode assiste (fiches des persos, nouveaux ennemis...)
    };
    this.data = Object.assign({}, defaults, parsed || {});
    this.data.records = Object.assign({}, defaults.records, (parsed && parsed.records) || {});
    this.data.keybinds = Object.assign({}, defaults.keybinds, (parsed && parsed.keybinds) || {});
    this.data.access = Object.assign({}, defaults.access, (parsed && parsed.access) || {});
    this.data.kills = Object.assign({}, (parsed && parsed.kills) || {});
    this.data.moneyByChar = Object.assign({}, (parsed && parsed.moneyByChar) || {});
    // Une sauvegarde dont le hub est absent ou d'une version perimee (disposition par defaut
    // changee depuis) est regeneree a neuf plutot que de garder une ancienne structure figee.
    this.data.hub = (parsed && parsed.hub && parsed.hub.version === HUB_LAYOUT_VERSION) ? parsed.hub : defaultHubLayout();
    // Parcours et defis perso (editeur) supprimes du jeu : on nettoie leurs donnees.
    delete this.data.customChallenges;
    delete this.data.parkourVersion;
    delete this.data.challenges; // defis supprimes du jeu (solo, du jour et coop)
    for (const gone of ['perso', 'settings', 'defi']) {
      // Menus fusionnes (Personnages -> Codex, Parametres -> Fonctionnalites) ; portail Defi supprime
      if (this.data.hub && this.data.hub.doors && this.data.hub.doors[gone]) { delete this.data.hub.doors[gone]; this.persist(); }
    }
    if (this.data.hub && !this.data.hubDoorsV5) {
      const hub = this.data.hub;
      const hasCell = (gx, gy) => hub.cells.some((c) => c.gx === gx && c.gy === gy);
      const hasDecor = (gx, gy) => (hub.decor || []).some((d) => d.gx === gx && d.gy === gy);
      const moveDoor = (key, gx, gy) => {
        if (!hub.doors[key] || !hasCell(gx, gy) || hasDecor(gx, gy)) return;
        const other = Object.keys(hub.doors).find((k) => k !== key && hub.doors[k].gx === gx && hub.doors[k].gy === gy);
        if (other) hub.doors[other] = { gx: hub.doors[key].gx, gy: hub.doors[key].gy }; // echange de place
        hub.doors[key] = { gx, gy };
      };
      moveDoor('bestiary', -1, 1);
      this.data.hubDoorsV5 = true;
      this.persist();
    }
    if (this.data.hub && !this.data.hubDoorsV6) {
      // Fonctionnalites : tout en bas a droite de la base (case la plus a droite de la rangee du bas)
      const hub = this.data.hub;
      const maxGy = Math.max(...hub.cells.map((c) => c.gy));
      const bottomRow = hub.cells.filter((c) => c.gy === maxGy);
      const target = bottomRow.reduce((a, c) => (c.gx > a.gx ? c : a), bottomRow[0]);
      const hasDecor = (gx, gy) => (hub.decor || []).some((d) => d.gx === gx && d.gy === gy);
      if (target && hub.doors.market && !hasDecor(target.gx, target.gy)) {
        const other = Object.keys(hub.doors).find((k) => k !== 'market' && hub.doors[k].gx === target.gx && hub.doors[k].gy === target.gy);
        if (other) hub.doors[other] = { gx: hub.doors.market.gx, gy: hub.doors.market.gy };
        hub.doors.market = { gx: target.gx, gy: target.gy };
      }
      this.data.hubDoorsV6 = true;
      this.persist();
    }
    if (this.data.hub && !this.data.hub.doors.online) {
      // Nouveau portail "En ligne" : premiere case libre (ni porte, ni decor), sinon nouvelle case.
      const hub = this.data.hub;
      const used = (gx, gy) => Object.values(hub.doors).some((d) => d.gx === gx && d.gy === gy) || (hub.decor || []).some((d) => d.gx === gx && d.gy === gy || (d.lgx === gx && d.lgy === gy));
      const prefs = [[0, -1], [-1, 0], [1, 0], [0, 1]];
      let spot = prefs.find(([gx, gy]) => hub.cells.some((c) => c.gx === gx && c.gy === gy) && !used(gx, gy));
      if (!spot) { const c = hub.cells.find((cc) => !used(cc.gx, cc.gy)); if (c) spot = [c.gx, c.gy]; }
      if (!spot) {
        const minGy = Math.min(...hub.cells.map((c) => c.gy));
        spot = [0, minGy - 1];
        hub.cells.push({ gx: 0, gy: minGy - 1 });
      }
      hub.doors.online = { gx: spot[0], gy: spot[1] };
      this.persist();
    }
    if (!this.data.discovered) {
      // Premiere version avec decouverte : on reprend tout ce que la sauvegarde prouve deja
      // (records, argent gagne avec un perso, ennemis deja detruits).
      const d = { chars: {}, enemies: {} };
      for (const [k, v] of Object.entries(this.data.records)) if (v != null) d.chars[k.replace('character', '')] = true;
      for (const k of Object.keys(this.data.moneyByChar)) if (this.data.moneyByChar[k] > 0) d.chars[k.replace('character', '')] = true;
      for (const [k, v] of Object.entries(this.data.kills)) if (v > 0) d.enemies[k] = true;
      this.data.discovered = d;
      this.persist();
    }
    // raccourcis qui n'existent plus (ex : ancienne touche du marchand) : retires
    for (const k of Object.keys(this.data.keybinds)) if (!(k in DEFAULT_KEYS)) delete this.data.keybinds[k];
    Keybinds = Object.assign({}, DEFAULT_KEYS, this.data.keybinds);
    return this.data;
  },

  persist() {
    const json = JSON.stringify(this.data);
    if (NATIVE) { try { NATIVE.writeSave(json); } catch (e) { /* disque indisponible */ } return; }
    try { localStorage.setItem(SAVE_KEY, json); } catch (e) { /* stockage indisponible */ }
  },

  setSoundOn(on) { this.data.soundOn = on; this.persist(); },
  setVolume(v) { this.data.volume = v; this.persist(); },
  setCursorColor(c) { this.data.cursorColor = c; this.persist(); },
  setCursorStyle(s) { this.data.cursorStyle = s; this.persist(); },
  setSpeedMult(v) { this.data.speedMult = clamp(Math.round(v), SPEED_MULT_MIN, SPEED_MULT_MAX); this.persist(); },
  setSelectedCharacter(id) { this.data.selectedCharacter = id; this.persist(); },
  setLanguage(lang) { this.data.language = lang; this.persist(); },

  setKeybind(action, code) {
    this.data.keybinds[action] = code;
    Keybinds[action] = code;
    this.persist();
  },

  resetKeybinds() {
    this.data.keybinds = Object.assign({}, DEFAULT_KEYS);
    Keybinds = Object.assign({}, DEFAULT_KEYS);
    this.persist();
  },

  submitExpeditionRecord(charId, timeMs) {
    const key = `character${charId}`;
    const cur = this.data.records[key];
    if (cur == null || timeMs < cur) {
      this.data.records[key] = timeMs;
      this.persist();
      return true;
    }
    return false;
  },

  getExpeditionRecord(charId) { return this.data.records[`character${charId}`]; },


  recordKill(type) {
    this.data.kills[type] = (this.data.kills[type] || 0) + 1;
    this.persist();
  },
  getKillCount(type) { return this.data.kills[type] || 0; },

  // L'argent est arrondi au centime (recompenses de 0,05€) pour eviter les derives flottantes.
  addMoney(amount) { this.data.money = roundCents(Math.max(0, this.data.money + amount)); this.persist(); },
  addMoneyForChar(charId, amount) {
    const key = `character${charId}`;
    this.data.moneyByChar[key] = roundCents((this.data.moneyByChar[key] || 0) + amount);
    this.addMoney(amount);
  },
  getMoneyForChar(charId) { return this.data.moneyByChar[`character${charId}`] || 0; },
  spendMoney(amount) {
    if (this.data.money < amount) return false;
    this.data.money = roundCents(this.data.money - amount);
    this.persist();
    return true;
  },
  getMoney() { return this.data.money; },

  // ---- Decouverte (Codex, choix de perso/defi) ----
  isCharKnown(id) { return !!(this.data.discovered && this.data.discovered.chars[id]); },
  markCharPlayed(id) {
    if (this.isCharKnown(id)) return;
    this.data.discovered.chars[id] = true;
    this.persist();
  },
  // Bonus/malus deja rencontres (proposes en partie ou evenement du defi du jour) : visibles au Codex.
  isBoonKnown(kind, key) { const d = this.data.discovered; return !!(d && d.boons && d.boons[kind + ':' + key]); },
  markBoonSeen(kind, key) {
    const d = this.data.discovered; if (!d) return;
    if (!d.boons) d.boons = {};
    if (d.boons[kind + ':' + key]) return;
    d.boons[kind + ':' + key] = true; this.persist();
  },
  isEnemyKnown(type) { return !!(this.data.discovered && this.data.discovered.enemies[type]); },
  markEnemySeen(type) {
    if (!type || type === 'DUMMY' || this.isEnemyKnown(type)) return;
    this.data.discovered.enemies[type] = true;
    this.persist();
  },
  setPlayerName(n) { this.data.playerName = String(n || '').slice(0, 16); this.persist(); },
};
