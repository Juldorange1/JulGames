'use strict';
// Charge le code de jeu de Fracas (les memes fichiers que le navigateur) dans un contexte
// JavaScript ISOLE (node:vm). Une partie = un contexte : aucune variable globale partagee entre
// deux parties simultanees (compteurs, Math.random...).
//
// Les effets visuels/sonores appeles par la simulation (Particles.*, Audio2.*, tremblements de
// camera) sont enregistres comme evenements puis envoyes aux clients, qui les rejouent.

const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const GAME_ROOT = path.resolve(__dirname, '..', '..');
const SIM_SCRIPTS = [
  'js/constants.js', 'js/utils.js', 'js/i18n.js', 'js/entities.js', 'js/combat.js', 'js/collision.js',
  'js/player.js', 'js/characters.js', 'js/roomobjects.js', 'js/turrets.js', 'js/bosses.js',
  'js/bossfx.js', 'js/rooms.js', 'js/movingwalls.js', 'js/exitdoor.js',
  'js/sim.js', 'js/mp/mp_shared.js', 'js/mp/mp_modes.js',
];

let compiled = null;
function compileScripts() {
  compiled = SIM_SCRIPTS.map((f) => new vm.Script(fs.readFileSync(path.join(GAME_ROOT, f), 'utf8'), { filename: f }));
}

function createSimContext(mpOverrides) {
  if (!compiled) compileScripts();
  const events = [];
  const rec = (kind, name, args) => { events.push([kind, name, args]); };
  const particles = {
    list: [],
    spawn: (...a) => rec('P', 'spawn', a),
    burst: (...a) => rec('P', 'burst', a),
    text: (...a) => rec('P', 'text', a),
    lightning: (...a) => rec('P', 'lightning', a),
    ring: (...a) => rec('P', 'ring', a),
    update() {}, render() {},
  };
  // Tout appel Audio2.xxx(...) devient un evenement 'A' (le client joue le son).
  const audio = new Proxy({}, { get: (_, k) => (typeof k === 'string' ? (...a) => rec('A', k, a) : undefined) });
  const sandbox = {
    console,
    performance: { now: () => performance.now() },
    Particles: particles,
    Audio2: audio,
    Game: { state: 'ONLINE', world: null, shakeCamera: (m, d) => rec('S', '', [m, d]), updateCamera() {} },
    // Sauvegarde : n'existe que chez les joueurs (records, Codex). Le serveur n'ecrit rien.
    Save: {
      data: { language: 'fr', discovered: null },
      recordKill() {}, submitChallengeRecord() { return false; },
      addMoneyForChar() {}, isCharKnown() { return true; }, markEnemySeen() {},
    },
    UI: {},
  };
  vm.createContext(sandbox);
  for (const s of compiled) s.runInContext(sandbox);
  // Les "const" de haut niveau des scripts ne sont pas des proprietes de l'objet global :
  // on expose explicitement ce dont le serveur a besoin.
  if (mpOverrides) vm.runInContext(`Object.assign(MP, ${JSON.stringify(mpOverrides)})`, sandbox);
  const exportsObj = vm.runInContext('({ MP, MP_MODES, IN_BITS, IN_EDGE_MASK, NET_PROTOCOL_VERSION })', sandbox);
  return {
    g: sandbox,
    x: exportsObj,
    eval: (code) => vm.runInContext(code, sandbox),
    drainEvents() { return events.splice(0, events.length); },
  };
}

module.exports = { createSimContext, SIM_SCRIPTS, GAME_ROOT };
