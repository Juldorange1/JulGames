'use strict';
// Test de fumee de la simulation serveur (sans reseau) : chaque mode tourne 20 s avec des
// entrees pseudo-aleatoires pour tous les joueurs ; on verifie l'absence d'erreur et la taille
// moyenne des snapshots delta.  Usage : node test/sim_smoke.js
const { createSimContext } = require('../core/sim_context');
const { collectCategories, DeltaEncoder } = require('../core/snapshot');

const CHARS = [1, 2, 3, 5, 6, 7, 8, 9, 10, 11];
let failed = 0;
for (const mode of ['versus1', 'versus2', 'foot', 'survivor']) {
  try {
    const sc = createSimContext();
    const def = sc.x.MP_MODES[mode];
    const players = [];
    for (let i = 0; i < def.players; i++) {
      players.push({ netId: 'u' + i, name: 'J' + i, team: def.teams ? def.teams[i % def.teams.length] : null, characterId: CHARS[(i * 3 + mode.length) % CHARS.length] });
    }
    const t0 = Date.now();
    const ctl = sc.g.mpCreateMatch({ mode, players, challengeId: 5 });
    const enc = new DeltaEncoder();
    let bytes = 0, snaps = 0;
    for (let k = 0; k < 60 * 20; k++) {
      for (const p of players) {
        const ph = p.netId.charCodeAt(1);
        ctl.setInput(p.netId, {
          mx: Math.cos(k / 40 + ph), my: Math.sin(k / 30 + ph), ax: Math.cos(k / 20) * 300, ay: Math.sin(k / 25) * 200, hasAim: true,
          attack: (k % 20) < 10, attackReleased: (k % 20) === 10, a1p: k % 120 === 0, a1d: false, a2p: k % 150 === 0, a2d: false,
          a3p: k % 200 === 0, a3d: (k % 200) < 30, abp: k % 90 === 0, abd: false,
        });
      }
      ctl.step(1 / 60);
      if (k % 2 === 0) {
        const d = enc.encode(collectCategories(ctl.world));
        bytes += JSON.stringify({ d, g: ctl.modeState(), ev: sc.drainEvents() }).length; snaps++;
      }
      if (ctl.over) break;
    }
    const w = ctl.world;
    console.log(mode.padEnd(9), `${Date.now() - t0}ms`, 'phase', ctl.phase, 'snap moyen', Math.round(bytes / snaps), 'o',
      '|', w.players.map((p) => `${p.name}:${p.character.name}:${(p.speedMode ? p.speedPct : p.damageMultiplier).toFixed(2)}${p.dead ? '(mort)' : ''}`).join(' '),
      '| obstacles', w.room.obstacles.length, JSON.stringify(ctl.result || {}).slice(0, 140));
  } catch (e) {
    failed++;
    console.log(mode, 'ERREUR', e.stack);
  }
}
process.exit(failed ? 1 : 0);
