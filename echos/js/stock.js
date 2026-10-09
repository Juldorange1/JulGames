'use strict';
/* Stockage local : morceaux + analyses dans IndexedDB, réglages et records dans localStorage. */

const Stock = (() => {
  let ouverture = null;
  function base() {
    if (ouverture) return ouverture;
    ouverture = new Promise((ok, ko) => {
      const r = indexedDB.open('echos', 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains('morceaux')) d.createObjectStore('morceaux', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('analyses')) d.createObjectStore('analyses', { keyPath: 'id' });
      };
      r.onsuccess = () => ok(r.result);
      r.onerror = () => ko(r.error);
    });
    return ouverture;
  }
  async function op(magasin, mode, fn) {
    const d = await base();
    return new Promise((ok, ko) => {
      const t = d.transaction(magasin, mode);
      const req = fn(t.objectStore(magasin));
      t.oncomplete = () => ok(req ? req.result : undefined);
      t.onerror = () => ko(t.error);
      t.onabort = () => ko(t.error);
    });
  }
  return {
    tous: () => op('morceaux', 'readonly', s => s.getAll()),
    morceau: id => op('morceaux', 'readonly', s => s.get(id)),
    enregistrer: m => op('morceaux', 'readwrite', s => s.put(m)),
    analyse: id => op('analyses', 'readonly', s => s.get(id)),
    enregistrerAnalyse: a => op('analyses', 'readwrite', s => s.put(a)),
    async supprimer(id) {
      await op('morceaux', 'readwrite', s => s.delete(id));
      await op('analyses', 'readwrite', s => s.delete(id));
    },
  };
})();

function lireLS(cle, defaut) {
  try { const v = localStorage.getItem(cle); return v ? JSON.parse(v) : defaut; } catch (e) { return defaut; }
}
function ecrireLS(cle, v) {
  try { localStorage.setItem(cle, JSON.stringify(v)); } catch (e) { /* stockage plein ou bloqué */ }
}

// Touches par défaut pour 1 à 8 touches (les mêmes lettres en AZERTY et en QWERTY)
const T = (code, nom) => ({ code, nom });
const TOUCHES_DEFAUT = {
  1: [T('Space', 'Espace')],
  2: [T('KeyF', 'F'), T('KeyJ', 'J')],
  3: [T('KeyF', 'F'), T('Space', 'Espace'), T('KeyJ', 'J')],
  4: [T('KeyD', 'D'), T('KeyF', 'F'), T('KeyJ', 'J'), T('KeyK', 'K')],
  5: [T('KeyD', 'D'), T('KeyF', 'F'), T('Space', 'Espace'), T('KeyJ', 'J'), T('KeyK', 'K')],
  6: [T('KeyS', 'S'), T('KeyD', 'D'), T('KeyF', 'F'), T('KeyJ', 'J'), T('KeyK', 'K'), T('KeyL', 'L')],
  7: [T('KeyS', 'S'), T('KeyD', 'D'), T('KeyF', 'F'), T('Space', 'Espace'), T('KeyJ', 'J'), T('KeyK', 'K'), T('KeyL', 'L')],
  8: [T('KeyS', 'S'), T('KeyD', 'D'), T('KeyF', 'F'), T('KeyG', 'G'), T('KeyH', 'H'), T('KeyJ', 'J'), T('KeyK', 'K'), T('KeyL', 'L')],
};
/* Au-delà de 8 touches : disposition « piano » sur deux rangées, de gauche à droite, rangée du milieu
   (touches blanches) et rangée du haut (touches noires) en alternance. Noms QWERTY par défaut, remplacés
   par ceux du vrai clavier (AZERTY…) dès que le navigateur les donne (voir nommerTouches). */
const PIANO = [['KeyQ', 'Q'], ['KeyA', 'A'], ['KeyW', 'W'], ['KeyS', 'S'], ['KeyE', 'E'], ['KeyD', 'D'], ['KeyR', 'R'], ['KeyF', 'F'],
  ['KeyT', 'T'], ['KeyG', 'G'], ['KeyY', 'Y'], ['KeyH', 'H'], ['KeyU', 'U'], ['KeyJ', 'J'], ['KeyI', 'I'], ['KeyK', 'K'],
  ['KeyO', 'O'], ['KeyL', 'L'], ['KeyP', 'P'], ['Semicolon', ';'], ['BracketLeft', '['], ['Quote', "'"], ['BracketRight', ']'], ['Backslash', '\\']];
for (let K = 9; K <= 24; K++) {
  const debut = Math.floor((24 - K) / 2);
  TOUCHES_DEFAUT[K] = PIANO.slice(debut, debut + K).map(([code, nom]) => ({ code, nom, auto: true }));
}
for (const K of Object.keys(TOUCHES_DEFAUT)) TOUCHES_DEFAUT[K].forEach(t => { t.auto = true; });

// Remplace les noms des touches par défaut par ceux du clavier de l'utilisateur (AZERTY : Q↔A, W→Z, ;→M…)
async function nommerTouches() {
  try {
    if (!navigator.keyboard || !navigator.keyboard.getLayoutMap) return false;
    const carte = await navigator.keyboard.getLayoutMap();
    let change = false;
    for (const liste of Object.values(Reglages.d.touchesK)) {
      for (const t of liste) {
        const k = carte.get(t.code);
        if (t.auto && k && t.code !== 'Space' && k.toUpperCase() !== t.nom) { t.nom = k.toUpperCase(); change = true; }
      }
    }
    return change;
  } catch (e) { return false; }
}

const Reglages = {
  defauts: {
    version: 3,
    nbTouches: 4,                 // nombre de touches (1 à 8)
    touchesK: TOUCHES_DEFAUT,     // touches choisies pour chaque nombre de touches
    relachement: true,            // false : pas de notes longues, le relâchement ne compte pas
    aiguGauche: true,
    vitesse: 1.2,
    decalage: 0,
    volume: 0.9,
    son: true,        // false : le jeu ne fait aucun son
    vaisseaux: true,  // false : pas de mini-niveaux Geometry Dash
    // derniers choix sur l'écran du morceau
    mode: 'entrainement', style: 'couches', diff: 'normal', rate: 1, guide: 0,
  },
  d: null,
  charger() {
    const lu = lireLS('echos.reglages', {});
    if (!lu.version || lu.version < 3) delete lu.volume; // volume remis au niveau fort par défaut
    if (lu.touches && !lu.touchesK) lu.touchesK = { 4: lu.touches }; // anciens réglages (4 touches seulement)
    delete lu.touches;
    const d = JSON.parse(JSON.stringify(this.defauts));
    this.d = Object.assign(d, lu, { version: 3 });
    this.d.touchesK = Object.assign(JSON.parse(JSON.stringify(TOUCHES_DEFAUT)), lu.touchesK || {});
  },
  // touches du nombre de touches choisi
  touches() { return this.d.touchesK[this.d.nbTouches] || TOUCHES_DEFAUT[this.d.nbTouches]; },
  sauver() { ecrireLS('echos.reglages', this.d); },
  reinitialiser() {
    const garde = { mode: this.d.mode, style: this.d.style, diff: this.d.diff, rate: this.d.rate, guide: this.d.guide,
      nbTouches: this.d.nbTouches, relachement: this.d.relachement };
    this.d = Object.assign(JSON.parse(JSON.stringify(this.defauts)), garde);
    this.sauver();
  },
};
Reglages.charger();

const Records = {
  // variante : '' pour 4 touches avec relâchement, sinon par ex. '|6t' ou '|4t|tap' (voir variante())
  cle: (id, style, diff, variante) => id + '|' + style + '|' + diff + (variante || ''),
  variante: (K, relachement) => (K !== 4 ? '|' + K + 't' : '') + (relachement === false ? '|tap' : ''),
  tous: () => lireLS('echos.records', {}),
  lire(id, style, diff, variante) { return this.tous()[this.cle(id, style, diff, variante)] || null; },
  // renvoie true si c'est un nouveau record de score
  proposer(id, style, diff, variante, r) {
    const t = this.tous(), k = this.cle(id, style, diff, variante), ancien = t[k];
    if (ancien && ancien.score >= r.score) {
      if (r.precision > ancien.precision) { ancien.precision = r.precision; t[k] = ancien; ecrireLS('echos.records', t); }
      return false;
    }
    t[k] = Object.assign({}, r, { precision: Math.max(r.precision, ancien ? ancien.precision : 0), date: Date.now() });
    ecrireLS('echos.records', t);
    return true;
  },
  meilleureNote(id) {
    const ordre = ['S', 'A', 'B', 'C', 'D'];
    let best = null;
    for (const [k, r] of Object.entries(this.tous())) {
      if (!k.startsWith(id + '|')) continue;
      if (!best || ordre.indexOf(r.note) < ordre.indexOf(best)) best = r.note;
    }
    return best;
  },
  supprimer(id) {
    const t = this.tous();
    for (const k of Object.keys(t)) if (k.startsWith(id + '|')) delete t[k];
    ecrireLS('echos.records', t);
  },
};
