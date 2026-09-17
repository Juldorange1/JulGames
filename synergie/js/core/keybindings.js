// Touches personnalisables (persistées séparément du profil de jeu, car ce sont des
// préférences d'appareil, pas une progression). Les flèches directionnelles restent
// toujours actives en plus des touches configurées, comme filet de secours.
const KeyBindings = {
  STORAGE_KEY: 'synergie_keybinds_v1',

  defaults: { up: 'w', down: 's', left: 'a', right: 'd', skill1: '1', skill2: '2', skill3: '3', skill4: '4', pause: 'escape' },

  actionLabels: {
    up: 'Avancer', down: 'Reculer', left: 'Gauche', right: 'Droite',
    skill1: 'Compétence 1', skill2: 'Compétence 2', skill3: 'Compétence 3', skill4: 'Compétence 4',
    pause: 'Pause',
  },

  actionOrder: ['up', 'down', 'left', 'right', 'skill1', 'skill2', 'skill3', 'skill4', 'pause'],

  load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? Object.assign({}, this.defaults, JSON.parse(raw)) : Object.assign({}, this.defaults);
    } catch (e) { return Object.assign({}, this.defaults); }
  },

  save(binds) { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(binds)); },
  reset() { localStorage.removeItem(this.STORAGE_KEY); return Object.assign({}, this.defaults); },

  // Assigne `key` à `action`. Si `key` était déjà utilisée ailleurs, les deux actions
  // échangent leurs touches plutôt que de laisser un doublon silencieux.
  rebind(binds, action, key) {
    const prevKey = binds[action];
    const conflictAction = this.actionOrder.find(a => a !== action && binds[a] === key);
    binds[action] = key;
    if (conflictAction) binds[conflictAction] = prevKey;
    this.save(binds);
    return conflictAction || null;
  },

  keyDisplay(key) {
    if (!key) return '—';
    if (key === ' ') return 'Espace';
    if (key === 'escape') return 'Échap';
    if (key === 'arrowup') return '↑';
    if (key === 'arrowdown') return '↓';
    if (key === 'arrowleft') return '←';
    if (key === 'arrowright') return '→';
    return key.length === 1 ? key.toUpperCase() : key;
  },
};
