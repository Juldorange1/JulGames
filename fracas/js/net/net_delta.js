// Application des snapshots recus du serveur (keyframe ou delta) sur l'etat local.
// Utilise par le jeu (navigateur) ET par les clients de test du serveur (Node).
//
// Etat = { cat: Map(idTexte -> objet) } pour chaque categorie (P joueurs, E ennemis, R projectiles...).
// Chaque snapshot produit un NOUVEL etat : les objets modifies sont copies (les anciens etats,
// gardes pour l'interpolation, ne changent jamais).

function netApplySnapshot(prev, msg) {
  const next = {};
  let desync = false;
  const src = msg.kf || msg.d || {};
  if (msg.kf) {
    for (const cat of Object.keys(src)) {
      const map = new Map();
      const u = src[cat].u || {};
      for (const id of Object.keys(u)) { const o = Object.assign({}, u[id]); delete o.$n; map.set(id, o); }
      next[cat] = map;
    }
    return { state: next, desync };
  }
  for (const cat of Object.keys(prev || {})) next[cat] = prev[cat];
  for (const cat of Object.keys(src)) {
    const ch = src[cat];
    const map = new Map(next[cat] || []);
    const u = ch.u || {};
    for (const id of Object.keys(u)) {
      const v = u[id];
      if (v.$n) { const o = Object.assign({}, v); delete o.$n; map.set(id, o); continue; }
      const base = map.get(id);
      if (!base) { desync = true; continue; } // delta sur une entite inconnue : il faut une keyframe
      map.set(id, Object.assign({}, base, v));
    }
    for (const id of ch.d || []) map.delete(String(id));
    next[cat] = map;
  }
  return { state: next, desync };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { netApplySnapshot };
