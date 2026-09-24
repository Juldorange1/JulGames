// Sauvegarde localStorage : records, personnage selectionne, parametres audio

const SAVE_KEY = 'fracas_save_v1';

const Save = {
  data: null,

  load() {
    let raw = null;
    try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { raw = null; }
    let parsed = null;
    if (raw) {
      try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
    }
    const defaults = {
      soundOn: true,
      volume: 0.7,
      speedMult: SPEED_MULT_DEFAULT,
      selectedCharacter: 1,
      language: 'fr',
      keybinds: Object.assign({}, DEFAULT_KEYS),
      records: {
        character1: null, character2: null, character3: null, character4: null,
        character5: null, character6: null, character7: null, character8: null,
        character9: null, character10: null, character11: null,
      },
      challenges: {
        challenge1: null, challenge2: null, challenge3: null, challenge4: null,
        challenge5: null, challenge6: null, challenge7: null, challenge8: null,
        challenge9: null, challenge10: null, challenge11: null,
      },
      kills: {},
      money: 0,
      moneyByChar: {},
      cursorColor: '#ffffff',
      cursorStyle: 'cross',
      customChallenges: [],
      hub: null,
    };
    this.data = Object.assign({}, defaults, parsed || {});
    this.data.records = Object.assign({}, defaults.records, (parsed && parsed.records) || {});
    this.data.challenges = Object.assign({}, defaults.challenges, (parsed && parsed.challenges) || {});
    this.data.keybinds = Object.assign({}, defaults.keybinds, (parsed && parsed.keybinds) || {});
    this.data.kills = Object.assign({}, (parsed && parsed.kills) || {});
    this.data.moneyByChar = Object.assign({}, (parsed && parsed.moneyByChar) || {});
    // Une sauvegarde dont le hub est absent ou d'une version perimee (disposition par defaut
    // changee depuis) est regeneree a neuf plutot que de garder une ancienne structure figee.
    this.data.hub = (parsed && parsed.hub && parsed.hub.version === HUB_LAYOUT_VERSION) ? parsed.hub : defaultHubLayout();
    // Parcours regeneres (nouvelle version) : leurs anciens records ne correspondent plus au trace.
    if (typeof PARKOUR_VERSION !== 'undefined' && this.data.parkourVersion !== PARKOUR_VERSION) {
      for (const k of Object.keys(this.data.challenges)) if (/^challengeP\d+$/.test(k)) this.data.challenges[k] = null;
      for (const c of this.data.customChallenges || []) if (c.parkour) c.record = null;
      this.data.parkourVersion = PARKOUR_VERSION;
      this.persist();
    }
    for (const gone of ['perso', 'settings']) {
      // Menus fusionnes : Personnages -> Codex, Parametres -> Fonctionnalites (avec le Marche)
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
      moveDoor('defi', 1, -1);
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
    Keybinds = Object.assign({}, DEFAULT_KEYS, this.data.keybinds);
    return this.data;
  },

  persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); } catch (e) { /* stockage indisponible */ }
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

  submitChallengeRecord(challengeId, timeMs) {
    const custom = this.getCustomChallenge(challengeId);
    const cur = custom ? custom.record : this.data.challenges[`challenge${challengeId}`];
    if (cur == null || timeMs < cur) {
      if (custom) custom.record = timeMs;
      else this.data.challenges[`challenge${challengeId}`] = timeMs;
      this.persist();
      return true;
    }
    return false;
  },

  getExpeditionRecord(charId) { return this.data.records[`character${charId}`]; },
  getChallengeRecord(challengeId) {
    const custom = this.getCustomChallenge(challengeId);
    return custom ? custom.record : this.data.challenges[`challenge${challengeId}`];
  },

  // Defis personnalises : identifiants "c<horodatage>" (stables d'une session a l'autre).
  getCustomChallenge(id) {
    if (typeof id !== 'string') return null;
    return this.data.customChallenges.find((c) => c.id === id) || null;
  },
  addCustomChallenge(def) {
    const entry = Object.assign({ id: 'c' + Date.now(), record: null }, def);
    this.data.customChallenges.push(entry);
    this.persist();
    return entry;
  },
  updateCustomChallenge(id, fields) {
    const entry = this.getCustomChallenge(id);
    if (!entry) return this.addCustomChallenge(fields);
    Object.assign(entry, fields, { record: null }); // defi modifie : l'ancien record ne vaut plus
    this.persist();
    return entry;
  },
  removeCustomChallenge(id) {
    this.data.customChallenges = this.data.customChallenges.filter((c) => c.id !== id);
    this.persist();
  },

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
};
