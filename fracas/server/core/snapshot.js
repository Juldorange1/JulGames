'use strict';
// Serialisation des entites + encodage DELTA des snapshots.
//
// - Chaque entite est convertie en objet simple (fonctions, Set/Map, champs internes "_x" et
//   references lourdes retires ; une reference vers une autre entite devient { $ref: id }).
// - Le delta ne contient, pour chaque entite, QUE les champs modifies depuis le snapshot
//   precedent (+ la liste des entites disparues). WebSocket etant fiable et ordonne, chaque delta
//   s'applique sur le precedent ; un client qui arrive (ou se reconnecte) recoit une keyframe.

// Champs jamais envoyes : internes au serveur, trop lourds, ou secrets de gameplay (la trajectoire
// des murs/zones mobiles ne doit PAS etre connue des joueurs : "mover").
const SKIP_KEYS = new Set([
  'history', 'input', 'character', 'room', 'owner', 'target', 'boss', 'follow', 'mover',
  'onTick', 'onExpire', 'onImpact', 'onActivate', 'onBounce', 'onHitEnemy', 'onHitPlayer',
  'netLatencyMs', 'lastHitBy', 'spawnX', 'spawnY', 'prevX', 'prevY',
]);
const TYPE_TAG = Object.prototype.toString;

function ser(v, depth, seen) {
  if (v === null || v === undefined) return null;
  const t = typeof v;
  if (t === 'number') return Number.isFinite(v) ? Math.round(v * 100) / 100 : null;
  if (t === 'string' || t === 'boolean') return v;
  if (t !== 'object') return undefined; // fonctions, symboles...
  const tag = TYPE_TAG.call(v);
  if (tag === '[object Set]' || tag === '[object Map]' || tag === '[object WeakMap]') return undefined;
  if (Array.isArray(v)) {
    if (depth > 6) return undefined;
    const n = Math.min(v.length, 300);
    const out = new Array(n);
    for (let i = 0; i < n; i++) { const s = ser(v[i], depth + 1, seen); out[i] = s === undefined ? null : s; }
    return out;
  }
  if (depth > 0 && v.id != null && typeof v.kind === 'string') return { $ref: v.id };
  if (depth > 6 || seen.has(v)) return undefined;
  seen.add(v);
  const o = {};
  for (const k of Object.keys(v)) {
    if (k.charCodeAt(0) === 95 || SKIP_KEYS.has(k)) continue;
    const s = ser(v[k], depth + 1, seen);
    if (s !== undefined) o[k] = s;
  }
  return o;
}

function serializeEntity(e) {
  const o = ser(e, 0, new WeakSet()) || {};
  if (e.character && e.character.id != null) o.characterId = e.character.id;
  // mur/zone mobile : on dit seulement qu'il bouge (sa trajectoire reste secrete)
  if (e.mover) { o.moving = 1; o.seed = Math.round((e.mover.seed || 0) * 100) / 100; }
  return o;
}

// Monde -> categories (voir SNAP_CATS dans js/mp/mp_shared.js)
function collectCategories(world) {
  const room = world.room || { obstacles: [], terrainZones: [] };
  const list = (arr) => (arr || []).filter((x) => x && x.id != null).map(serializeEntity);
  return {
    P: list(world.players),
    E: list(world.enemies),
    R: list(world.projectiles),
    Z: list(world.zones),
    W: list(world.walls),
    S: list(world.shields),
    M: list(world.mines),
    N: list(world.winds),
    T: list(world.meteors),
    H: list(world.hazards),
    O: list(room.obstacles),
    Y: list(room.terrainZones),
    B: list(world.balls),
    C: list(world.capzones),
  };
}

class DeltaEncoder {
  constructor() { this.prev = {}; }

  // Renvoie { cat: { u: { id: champsModifies }, d: [idsSupprimes] } }. Une nouvelle entite est
  // envoyee entiere avec $n = 1 (le client la remplace au lieu de la fusionner).
  encode(cats) {
    const out = {};
    for (const cat of Object.keys(cats)) {
      const prevMap = this.prev[cat] || new Map();
      const nextMap = new Map();
      const upd = {};
      let any = false;
      for (const obj of cats[cat]) {
        const id = obj.id;
        const enc = {};
        for (const k of Object.keys(obj)) enc[k] = JSON.stringify(obj[k]);
        nextMap.set(id, enc);
        const before = prevMap.get(id);
        if (!before) { upd[id] = Object.assign({ $n: 1 }, obj); any = true; continue; }
        let ch = null;
        for (const k of Object.keys(enc)) if (before[k] !== enc[k]) (ch || (ch = {}))[k] = obj[k];
        for (const k of Object.keys(before)) if (!(k in enc)) (ch || (ch = {}))[k] = null;
        if (ch) { upd[id] = ch; any = true; }
      }
      const del = [];
      for (const id of prevMap.keys()) if (!nextMap.has(id)) del.push(id);
      if (any || del.length) out[cat] = del.length ? { u: upd, d: del } : { u: upd };
      this.prev[cat] = nextMap;
    }
    return out;
  }
}

// Keyframe : etat complet (meme format que le delta, toutes les entites en $n).
function keyframeFrom(cats) {
  const out = {};
  for (const cat of Object.keys(cats)) {
    const u = {};
    for (const obj of cats[cat]) u[obj.id] = Object.assign({ $n: 1 }, obj);
    out[cat] = { u, full: 1 };
  }
  return out;
}

// Les evenements (particules, sons) : nombres arrondis pour alleger.
function compactEvents(events) {
  return events.map(([k, n, a]) => [k, n, ser(a, 1, new WeakSet())]);
}

module.exports = { serializeEntity, collectCategories, DeltaEncoder, keyframeFrom, compactEvents, ser };
