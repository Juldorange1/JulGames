'use strict';
/* =========================================================
   TRIADE — Codex animé : une petite scène jouée en boucle pour
   chaque ennemi, boss, compétence, héros, terrain et objet.
   Les scènes utilisent le vrai rendu du jeu (Render.drawDemo).
   ========================================================= */
const Codex = (() => {
  let tab = 'ennemis', sel = null, raf = 0, demo = null;
  let uidN = 900000;

  /* ---------- construction d'une scène ---------- */
  function mk(o) {
    return Object.assign({ uid: uidN++, stun: 0, poison: null, shield: 0, taunt: null, dead: false, ox: 0, oy: 0, flash: 0, alpha: 1, scale: 1, actions: 0, hasMove: false, moveBudget: 0 }, o, { rx: o.x, ry: o.y });
  }
  function emptyWorld(W, H) {
    const grid = []; for (let y = 0; y < H; y++) { const row = []; for (let x = 0; x < W; x++) row.push({ t: 'floor', fire: 0, trap: null, ttl: 0, z: null, zd: null, zp: null }); grid.push(row); }
    return { demo: true, W, H, grid, units: [], telegraphs: [], bombs: [], fx: [], texts: [], shake: 0, phase: 'demo', busy: true, ended: false,
      card: { seed: 1 }, kind: 'normal', incoming: [], preview: null, ver: 0, gs: {}, boost: null, flash: 0, pbanner: null, banner: null, sel: -1, turn: 1 };
  }
  function demoS() {
    return { depth: S ? S.depth : 0, level: 1, heroes: [{ key: 'brann', pct: 100, slots: [] }, { key: 'lyse', pct: 100, slots: [] }, { key: 'kael', pct: 100, slots: [] }],
      talents: { vigueur: 0, soif: 0, robustesse: 0, egide: 0, choix: 0, prosperite: 0, repos: 0 }, rules: [], pacts: [], seen: {} };
  }
  const hero = (x, y, i) => mk({ team: 'hero', kind: 'hero', hero: i || 0, x, y });
  const foe = (kind, x, y, extra) => { const E = ENEMIES[kind] || {}; return mk(Object.assign({ team: 'enemy', kind, x, y, hp: E.hp || 20, maxHp: E.hp || 20, dmg: E.dmg || 5, move: E.move || 2, ai: E.ai }, extra || {})); };
  const boss = (kind, x, y) => { const B = BOSSES[kind]; return mk({ team: 'enemy', kind, x, y, hp: B.hp, maxHp: B.hp, dmg: B.dmg, boss: true, ai: 'boss', phase: 0, enr: 1 }); };
  const dummy = (x, y) => foe('rodeur', x, y, { hp: 30, maxHp: 30 });
  const at = (D, uid) => D.units.find(u => u.uid === uid);
  const hit = (u, txt, col) => { u.flash = 1; ftext(u.x, u.y, txt, col || '#ffffff', true); };

  /* chaque scène : { W, H, period, setup(D) → données, ev: [[t, fn(D, s)]] } */
  function enemyScene(k) {
    const E = ENEMIES[k], col = E.color;
    const base = (W, H) => ({ W: W || 5, H: H || 3, period: 3 });
    const sc = base();
    const walkHit = (path, dmg) => [
      ...path.map((p, i) => [0.35 + i * 0.35, (D, s) => { s.e.x = p[0]; s.e.y = p[1]; }]),
      [0.35 + path.length * 0.35 + 0.15, (D, s) => { lunge(s.e, s.h.x, s.h.y); fx({ type: 'slash', x: s.h.x, y: s.h.y, color: '#ff6b6b', dur: 260 }); hit(s.h, `−${dmg}%`, '#ff6b6b'); }],
    ];
    switch (k) {
      case 'archer': case 'chaman': case 'miroitier':
        if (k === 'chaman') {
          sc.setup = D => { const e = foe(k, 4, 1), a = foe('brute', 3, 0, { hp: 10, maxHp: 24 }), h = hero(0, 1); D.units.push(e, a, h); return { e, a, h }; };
          sc.ev = [[0.6, (D, s) => fx({ type: 'proj', x: s.e.x, y: s.e.y, x2: s.a.x, y2: s.a.y, color: '#6dffae', dur: 300 })], [0.95, (D, s) => { s.a.hp = 18; ftext(s.a.x, s.a.y, '+8', '#6dffae', true); }], [1.8, (D, s) => { s.a.shield = 1; ftext(s.a.x, s.a.y, 'Bouclier', '#9fe0ff'); }]];
          return sc;
        }
        if (k === 'miroitier') {
          sc.setup = D => { const e = foe(k, 3, 1), h = hero(0, 1); D.units.push(e, h); return { e, h }; };
          sc.ev = [[0.8, (D, s) => { const o = foe('ombre', 4, 1, { mirror: 0, alpha: 0 }); D.units.push(o); s.o = o; fx({ type: 'ring', x: 4, y: 1, color: '#9aa3ff', dur: 450 }); ftext(4, 1, 'Ombre !', '#b9c0ff', true); }],
            [1.6, (D, s) => { s.h.y = 0; s.o.y = 0; }], [2.2, (D, s) => { s.h.x = 1; s.o.x = 3; }]];
          return sc;
        }
        sc.setup = D => { const e = foe(k, 4, 1), h = hero(0, 1); D.units.push(e, h); return { e, h }; };
        sc.ev = [[0.6, (D, s) => { fx({ type: 'proj', x: 4, y: 1, x2: 0, y2: 1, color: '#ffb36b', dur: 250 }); }], [0.9, (D, s) => hit(s.h, `−${E.dmg}%`, '#ff6b6b')]];
        return sc;
      case 'artilleur': case 'pyromane':
        sc.setup = D => { const e = foe(k, 4, 0), h = hero(1, 1); D.units.push(e, h); return { e, h }; };
        sc.ev = [[0.5, D => { D.telegraphs.push({ tiles: areaTiles(1, 1, 'plus'), center: [1, 1], pct: E.dmg, color: k === 'pyromane' ? '#ff7a2a' : '#ff7a4a', label: '' }); fx({ type: 'proj', x: 4, y: 0, x2: 1, y2: 1, color: '#ff7a4a', dur: 300, arc: true }); }],
          [1.8, (D, s) => { D.telegraphs = []; fx({ type: 'boom', x: 1, y: 1, color: '#ff7a4a', dur: 500, r: 1.4 }); hit(s.h, `−${E.dmg}%`, '#ff6b6b'); if (k === 'pyromane') for (const [x, y] of areaTiles(1, 1, 'plus')) D.grid[y][x].fire = 3; }]];
        return sc;
      case 'kamikaze':
        sc.setup = D => { const e = foe(k, 4, 1), h = hero(0, 1), b = foe('rodeur', 1, 0); D.units.push(e, h, b); return { e, h, b }; };
        sc.ev = [[0.4, (D, s) => { s.e.x = 3; }], [0.8, (D, s) => { s.e.x = 2; }], [1.1, (D, s) => { s.e.x = 1; s.e.armed = true; ftext(1, 1, 'Armée !', '#ff5d8f'); }],
          [2.2, (D, s) => { s.e.dead = true; fx({ type: 'boom', x: 1, y: 1, color: '#ff5d8f', dur: 600, r: 1.6 }); hit(s.h, `−${E.dmg}%`, '#ff6b6b'); hit(s.b, `−${E.dmg}`); }]];
        return sc;
      case 'spectre':
        sc.setup = D => { const e = foe(k, 4, 0), h = hero(0, 1); D.units.push(e, h); return { e, h }; };
        sc.ev = [[0.6, (D, s) => { s.e.alpha = 0.15; }], [0.95, (D, s) => { s.e.x = 1; s.e.y = 1; s.e.rx = 1; s.e.ry = 1; s.e.alpha = 1; }], [1.3, (D, s) => { lunge(s.e, 0, 1); hit(s.h, `−${E.dmg}%`, '#ff6b6b'); }]];
        return sc;
      case 'invocateur':
        sc.setup = D => { const e = foe(k, 4, 1), h = hero(0, 1); D.units.push(e, h); return { e, h }; };
        sc.ev = [[0.8, D => { D.units.push(foe('rodeur', 3, 1, { alpha: 0 })); fx({ type: 'ring', x: 3, y: 1, color: '#b06ad9', dur: 450 }); ftext(3, 1, 'Invoqué', '#c79bff'); }], [1.8, D => { D.units.push(foe('rodeur', 4, 0, { alpha: 0 })); fx({ type: 'ring', x: 4, y: 0, color: '#b06ad9', dur: 450 }); }]];
        return sc;
      case 'totem':
        sc.setup = D => { const e = foe(k, 3, 1), a = foe('rodeur', 3, 0), h = hero(0, 0); D.units.push(e, a, h); return { e, a, h }; };
        sc.ev = [[0.7, (D, s) => fx({ type: 'proj', x: 0, y: 0, x2: 3, y2: 0, color: '#ff8a3d', dur: 250 })], [0.95, (D, s) => hit(s.a, '−3 (½)')]];
        return sc;
      case 'lancier':
        sc.setup = D => { const e = foe(k, 3, 1), h = hero(1, 1), h2 = hero(2, 0, 1); D.units.push(e, h, h2); return { e, h }; };
        sc.ev = [[0.8, (D, s) => { lunge(s.e, 2, 1); fx({ type: 'slash', x: 2, y: 1, color: '#ffe08a', dur: 260 }); fx({ type: 'slash', x: 1, y: 1, color: '#ffe08a', dur: 260 }); hit(s.h, `−${E.dmg}%`, '#ff6b6b'); ftext(2, 1, '2 cases', '#ffe08a'); }]];
        return sc;
      case 'souffleur':
        sc.setup = D => { D.grid[1][0].t = 'pit'; const e = foe(k, 4, 1), h = hero(2, 1); D.units.push(e, h); return { e, h }; };
        sc.ev = [[0.6, () => fx({ type: 'proj', x: 4, y: 1, x2: 2, y2: 1, color: '#bfe8ff', dur: 250 })], [0.9, (D, s) => { s.h.x = 1; }], [1.15, (D, s) => { s.h.x = 0; s.h.falling = performance.now(); ftext(0, 1, 'Chute −12%', '#c9b6ff', true); }],
          [1.6, (D, s) => { s.h.falling = 0; s.h.x = 1; s.h.y = 0; s.h.rx = 1; s.h.ry = 0; }]];
        return sc;
      case 'grappineur':
        sc.setup = D => { const e = foe(k, 4, 1), h = hero(0, 1); D.units.push(e, h); return { e, h }; };
        sc.ev = [[0.6, () => fx({ type: 'proj', x: 4, y: 1, x2: 0, y2: 1, color: '#e0a060', dur: 250 })], [0.9, (D, s) => { s.h.x = 1; }], [1.1, (D, s) => { s.h.x = 2; }], [1.3, (D, s) => { s.h.x = 3; ftext(3, 1, 'Attiré', '#e0a060'); }]];
        return sc;
      case 'tisseur':
        sc.setup = D => { const e = foe(k, 4, 1), h = hero(1, 1); D.units.push(e, h); return { e, h }; };
        sc.ev = [[0.8, D => { D.grid[1][2].t = 'rock'; D.grid[1][2].ttl = 2; fx({ type: 'burst', x: 2, y: 1, color: '#9ad1a0', dur: 400 }); ftext(2, 1, 'Mur !', '#9ad1a0', true); }]];
        return sc;
      case 'semeur':
        sc.setup = D => { const e = foe(k, 4, 1), h = hero(1, 1); D.units.push(e, h); return { e, h }; };
        sc.ev = [[0.7, D => { D.grid[0][1].z = 'piques'; fx({ type: 'burst', x: 1, y: 0, color: '#8fbf4a', dur: 400 }); }], [1.4, D => { D.grid[1][2].z = 'piques'; fx({ type: 'burst', x: 2, y: 1, color: '#8fbf4a', dur: 400 }); }], [2.1, D => { D.grid[2][1].z = 'piques'; fx({ type: 'burst', x: 1, y: 2, color: '#8fbf4a', dur: 400 }); }]];
        return sc;
      case 'gardien':
        sc.setup = D => { const e = foe(k, 3, 1), h = hero(1, 1); D.units.push(e, h); return { e, h }; };
        sc.ev = [[0.8, (D, s) => ftext(s.h.x, s.h.y, '−2 déplacement', '#9fe0ff', true)]];
        return sc;
      case 'voleur':
        sc.setup = D => { const e = foe(k, 2, 1), h = hero(0, 1); D.units.push(e, h); return { e, h }; };
        sc.ev = [[0.5, (D, s) => { s.e.x = 3; }], [0.8, (D, s) => { s.e.x = 4; s.h.x = 1; }], [1.4, (D, s) => { s.e.y = 0; s.h.x = 2; }], [2, (D, s) => ftext(4, 0, 'Fuit !', '#ffd166')]];
        return sc;
      case 'coureur':
        sc.setup = D => { const e = foe(k, 4, 1), h = hero(0, 1); D.units.push(e, h); return { e, h }; };
        sc.ev = [...walkHit([[3, 1], [2, 1], [1, 1]], E.dmg), [1.9, (D, s) => { s.e.x = 2; }], [2.2, (D, s) => { s.e.x = 3; ftext(3, 1, 'Recule', '#f7c948'); }]];
        return sc;
      case 'ombre':
        sc.setup = D => { const h = hero(0, 0), e = foe(k, 4, 2, { mirror: 0 }); D.units.push(e, h); return { e, h }; };
        sc.ev = [[0.6, (D, s) => { s.h.x = 1; s.e.x = 3; }], [1.1, (D, s) => { s.h.x = 2; s.e.x = 2; ftext(2, 1, 'Miroir', '#b9c0ff'); }], [1.8, (D, s) => { s.h.y = 1; s.e.y = 1; }]];
        sc.period = 2.6;
        return sc;
      case 'eveille':
        sc.setup = D => { const e = foe(k, 3, 1), h = hero(0, 1); D.units.push(e, h); return { e, h }; };
        sc.ev = [0.6, 1.3, 2.0].map((t, i) => [t, (D, s) => { s.e.scale = 1 + (i + 1) * 0.12; s.e.maxHp += 3; s.e.hp += 3; ftext(3, 1, 'Grandit', '#f08a5a', true); }]);
        return sc;
      case 'enrage':
        sc.setup = D => { const e = foe(k, 3, 1), h = hero(0, 1, 1); D.units.push(e, h); return { e, h }; };
        sc.ev = [0.6, 1.5].map(t => [t, (D, s) => { fx({ type: 'proj', x: 0, y: 1, x2: 3, y2: 1, color: '#5ad0ff', dur: 220 }); setTimeout(() => { }, 0); s.e.hp -= 4; s.e.flash = 1; ftext(3, 1, 'Rage +2', '#ff5a5a', true); }]);
        return sc;
      case 'martyr':
        sc.setup = D => { const e = foe(k, 3, 1), a = foe('brute', 3, 0, { hp: 10, maxHp: 24 }), b = foe('rodeur', 4, 1, { hp: 5, maxHp: 12 }), h = hero(0, 1, 1); D.units.push(e, a, b, h); return { e, a, b, h }; };
        sc.ev = [[0.6, () => fx({ type: 'proj', x: 0, y: 1, x2: 3, y2: 1, color: '#5ad0ff', dur: 220 })], [0.85, (D, s) => { s.e.dead = true; fx({ type: 'burst', x: 3, y: 1, color: '#f2e6b0', dur: 500 }); }],
          [1.1, (D, s) => { fx({ type: 'ring', x: 3, y: 1, color: '#f2e6b0', dur: 600, r: 3 }); s.a.hp += 8; s.b.hp += 8; s.a.shield = 1; s.b.shield = 1; ftext(3, 0, '+8', '#f2e6b0'); ftext(4, 1, '+8', '#f2e6b0'); }]];
        return sc;
      case 'miroir':
        sc.setup = D => { const e = foe(k, 3, 1), h = hero(0, 1, 1); D.units.push(e, h); return { e, h }; };
        sc.ev = [[0.6, () => fx({ type: 'proj', x: 0, y: 1, x2: 3, y2: 1, color: '#5ad0ff', dur: 220 })], [0.85, (D, s) => { hit(s.e, '−8'); }], [1.1, (D, s) => { fx({ type: 'bolt', x: 3, y: 1, x2: 0, y2: 1, color: '#c9d6ff', dur: 300 }); hit(s.h, '−3%', '#ff6b6b'); }]];
        return sc;
      case 'scissipare':
        sc.setup = D => { const e = foe(k, 3, 1), h = hero(0, 1, 1); D.units.push(e, h); return { e, h }; };
        sc.ev = [[0.6, () => fx({ type: 'proj', x: 0, y: 1, x2: 3, y2: 1, color: '#5ad0ff', dur: 220 })], [0.85, (D, s) => { s.e.hp = 6; hit(s.e, '−4'); }], [1.1, D => { D.units.push(foe('scissipare', 4, 1, { hp: 6, maxHp: 8, piece: true, alpha: 0.3 })); ftext(3, 1, 'Division !', '#c6e05a', true); }]];
        return sc;
      case 'jumeau':
        sc.setup = D => { const a = foe(k, 3, 0), b = foe(k, 3, 2), h = hero(0, 1, 1); a.twin = b.uid; b.twin = a.uid; D.units.push(a, b, h); return { a, b, h }; };
        sc.ev = [[0.6, () => fx({ type: 'proj', x: 0, y: 1, x2: 3, y2: 0, color: '#5ad0ff', dur: 220 })], [0.85, (D, s) => { s.a.dead = true; fx({ type: 'burst', x: 3, y: 0, color: '#ff9ad5', dur: 500 }); s.b.reviving = true; }],
          [2.0, D => { const n = foe('jumeau', 4, 1, { alpha: 0 }); D.units.push(n); fx({ type: 'ring', x: 4, y: 1, color: '#ff9ad5', dur: 450 }); ftext(4, 1, 'Renaissance !', '#ff9ad5', true); }]];
        return sc;
      case 'carapace':
        sc.setup = D => { const e = foe(k, 3, 1), h = hero(0, 1, 1); D.units.push(e, h); return { e, h }; };
        sc.ev = [[0.6, () => fx({ type: 'proj', x: 0, y: 1, x2: 3, y2: 1, color: '#5ad0ff', dur: 220 })], [0.85, (D, s) => hit(s.e, '−2 Carapace', '#7fe0d8')]];
        return sc;
      case 'charognard':
        sc.setup = D => { const e = foe(k, 4, 1), a = foe('rodeur', 3, 0, { hp: 3 }), h = hero(0, 0, 1); D.units.push(e, a, h); return { e, a, h }; };
        sc.ev = [[0.6, () => fx({ type: 'proj', x: 0, y: 0, x2: 3, y2: 0, color: '#5ad0ff', dur: 220 })], [0.85, (D, s) => { s.a.dead = true; fx({ type: 'burst', x: 3, y: 0, color: '#e2574c', dur: 500 }); }], [1.1, (D, s) => { s.e.scale = 1.15; ftext(4, 1, 'Festin ! +4', '#d8d870', true); }]];
        return sc;
      case 'sapeur':
        sc.setup = D => { const e = foe(k, 4, 1), h = hero(1, 1); D.units.push(e, h); return { e, h }; };
        sc.ev = [[0.5, D => { D.telegraphs.push({ tiles: [[1, 1]], center: [1, 1], pct: 12, color: '#d8a060', label: 'Fosse' }); fx({ type: 'proj', x: 4, y: 1, x2: 1, y2: 1, color: '#d8a060', dur: 260, arc: true }); }],
          [1.7, (D, s) => { D.telegraphs = []; D.grid[1][1].t = 'pit'; fx({ type: 'boom', x: 1, y: 1, color: '#b08a5a', dur: 500, r: 0.9 }); s.h.falling = performance.now(); hit(s.h, '−12%', '#ff6b6b'); }], [2.1, (D, s) => { s.h.falling = 0; s.h.x = 0; s.h.rx = 0; }]];
        return sc;
      case 'etendard':
        sc.setup = D => { const e = foe(k, 4, 1), a = foe('rodeur', 3, 1), h = hero(1, 1); D.units.push(e, a, h); return { e, a, h }; };
        sc.ev = [[0.6, (D, s) => ftext(4, 0, '+30 %', '#e0b84a', true)], [1.2, (D, s) => { s.a.x = 2; }], [1.5, (D, s) => { lunge(s.a, 1, 1); fx({ type: 'slash', x: 1, y: 1, color: '#ff6b6b', dur: 260 }); hit(s.h, '−7%', '#ff6b6b'); }]];
        return sc;
      case 'sentinelle':
        sc.setup = D => { const e = foe(k, 4, 1), h = hero(1, 0); D.units.push(e, h); return { e, h }; };
        sc.ev = [[0.6, (D, s) => { s.h.y = 1; }], [0.9, (D, s) => { ftext(4, 0, 'Guet !', '#ff8f6b', true); fx({ type: 'proj', x: 4, y: 1, x2: 1, y2: 1, color: '#ff8f6b', dur: 220 }); }], [1.15, (D, s) => hit(s.h, `−${E.dmg}%`, '#ff6b6b')], [2.0, (D, s) => { s.h.y = 2; }]];
        return sc;
      case 'brute':
        sc.setup = D => { const e = foe(k, 3, 1), h = hero(1, 1); D.units.push(e, h); return { e, h }; };
        sc.ev = [[0.4, (D, s) => { s.e.x = 2; }], [0.8, (D, s) => { lunge(s.e, 1, 1); hit(s.h, `−${E.dmg}%`, '#ff6b6b'); }], [1.0, (D, s) => { s.h.x = 0; ftext(0, 1, 'Repoussé', '#ffb36b'); }]];
        return sc;
    }
    sc.setup = D => { const e = foe(k, 4, 1), h = hero(0, 1); D.units.push(e, h); return { e, h }; };
    sc.ev = walkHit(E.move >= 3 ? [[3, 1], [2, 1], [1, 1]] : [[3, 1], [2, 1], [1, 1]], E.dmg);
    return sc;
  }
  function bossScene(k) {
    const B = BOSSES[k];
    const sc = { W: 6, H: 4, period: 3.6 };
    sc.setup = D => {
      const h = hero(0, 1), h2 = hero(0, 3, 1); D.units.push(h, h2);
      if (k === 'hydre') { const hs = [[4, 0], [5, 2], [4, 3]].map(([x, y]) => boss(k, x, y)); D.units.push(...hs); return { h, h2, b: hs[0], heads: hs }; }
      const b = boss(k, 4, 1); D.units.push(b); return { h, h2, b };
    };
    const ph = (t) => [t, (D, s) => { s.b.phase = 1; D.pbanner = { txt: 'PHASE 2', sub: (B.phases && B.phases[0] ? B.phases[0].name : 'Rage'), tip: B.phases && B.phases[0] ? B.phases[0].tip : '', color: B.color, t0: performance.now() }; D.flash = 1; }];
    switch (k) {
      case 'colosse': sc.ev = [[0.4, D => D.telegraphs.push({ tiles: areaTiles(4, 1, 'diamond2'), center: [4, 1], pct: B.special, color: '#ffcf4a' })], [1.4, (D, s) => { D.telegraphs = []; fx({ type: 'boom', x: 4, y: 1, color: '#ffcf4a', dur: 600, r: 2.2 }); D.shake = 8; }], ph(2.2)]; break;
      case 'reine': sc.ev = [[0.4, D => { D.units.push(foe('rodeur', 3, 0, { alpha: 0 }), foe('rodeur', 3, 2, { alpha: 0 })); ftext(4, 1, 'Nuée !', '#e05a9a', true); }], [1.2, (D, s) => { s.b.y = 3; }], [1.6, (D, s) => { fx({ type: 'proj', x: 4, y: 3, x2: 0, y2: 3, color: '#ff7ab8', dur: 250 }); hit(s.h2, `−${B.dmg}%`, '#ff6b6b'); }], ph(2.4)]; break;
      case 'oracle': sc.ev = [[0.4, D => D.telegraphs.push({ tiles: [0, 1, 2, 3, 5].map(x => [x, 1]), pct: B.dmg, color: '#7fd6ff', kind: 'laser' })], [0.8, (D, s) => { s.b.alpha = 0.2; }], [1.1, (D, s) => { s.b.x = 3; s.b.y = 3; s.b.rx = 3; s.b.ry = 3; s.b.alpha = 1; }],
        [1.8, (D, s) => { D.telegraphs = []; fx({ type: 'laser', x: 0, y: 1, x2: 5, y2: 1, color: '#7fd6ff', dur: 500 }); hit(s.h, `−${B.dmg}%`, '#ff6b6b'); }], ph(2.5)]; break;
      case 'forgeron': sc.ev = [[0.4, D => { D.telegraphs.push({ tiles: areaTiles(0, 1, 'square'), center: [0, 1], pct: B.special, color: '#ff7b3a' }); fx({ type: 'proj', x: 4, y: 1, x2: 0, y2: 1, color: '#ff7b3a', dur: 300, arc: true }); }],
        [1.5, (D, s) => { D.telegraphs = []; fx({ type: 'boom', x: 0, y: 1, color: '#ff7b3a', dur: 600, r: 1.5 }); hit(s.h, `−${B.special}%`, '#ff6b6b'); for (const [x, y] of areaTiles(0, 1, 'square')) D.grid[y][x].fire = 3; }], ph(2.3)]; break;
      case 'hydre': sc.ev = [[0.5, (D, s) => { fx({ type: 'proj', x: 4, y: 0, x2: 0, y2: 1, color: '#4fd18b', dur: 250 }); }], [0.8, (D, s) => hit(s.h, `−${B.dmg}%`, '#ff6b6b')], [1.4, (D, s) => { s.heads[1].dead = true; fx({ type: 'burst', x: 5, y: 2, color: '#4fd18b', dur: 500 }); ftext(4, 0, 'Rage !', '#ff6b6b', true); ftext(4, 3, 'Rage !', '#ff6b6b', true); }],
        [2.4, (D, s) => { s.heads[0].alpha = 0.2; }], [2.7, (D, s) => { s.heads[0].x = 1; s.heads[0].y = 1; s.heads[0].rx = 1; s.heads[0].ry = 1; s.heads[0].alpha = 1; ftext(1, 1, 'Traque !', '#ff5a5a', true); }]]; break;
      case 'geolier': sc.ev = [[0.5, (D, s) => { fx({ type: 'bolt', x: 4, y: 1, x2: 0, y2: 3, color: '#cfd6ea', dur: 350 }); s.h2.chain = 2; s.h2.chainBy = s.b.uid; ftext(0, 3, 'Enchaîné !', '#cfd6ea', true); }], ph(1.3), [1.5, (D, s) => { s.h2.x = 1; s.h2.rx = 1; ftext(1, 3, 'Traction', '#cfd6ea'); }],
        [2.4, (D, s) => { fx({ type: 'slash', x: 4, y: 1, color: '#ff8a3d', dur: 250 }); hit(s.b, '−10'); s.h2.chain = 0; ftext(1, 3, 'Chaîne brisée !', '#cfd6ea', true); }]]; break;
      case 'reflet': sc.ev = [[0.5, D => { D.units.push(foe('ombre', 5, 1, { mirror: 0, alpha: 0 })); ftext(5, 1, 'Reflet !', '#b9c0ff', true); }], [1.3, (D, s) => { fx({ type: 'proj', x: 4, y: 1, x2: 0, y2: 1, color: '#9aa3ff', dur: 250 }); hit(s.h, `−${B.dmg}%`, '#ff6b6b'); }], ph(2.2)]; break;
    }
    return sc;
  }
  function skillScene(k, heroIdx) {
    const s0 = SKILLS[k];
    const sc = { W: 5, H: 3, period: 2.8 };
    const dmg = s0.dmg || 0;
    const col = HEROES[S && S.heroes ? S.heroes[heroIdx || 0].key : 'brann'] ? '#ffd166' : '#ffd166';
    switch (s0.type) {
      case 'line':
        if ((s0.range || 1) <= 1) {
          sc.setup = D => { const h = hero(0, 1, heroIdx), e = dummy(1, 1); D.units.push(h, e); return { h, e }; };
          sc.ev = [[0.6, (D, s) => { lunge(s.h, 1, 1); fx({ type: 'slash', x: 1, y: 1, color: col, dur: 260 }); hit(s.e, `−${dmg}`); }],
            ...(s0.push ? [[0.8, (D, s) => { s.e.x = Math.min(4, 1 + s0.push); }]] : []), ...(s0.lifesteal ? [[0.8, (D, s) => ftext(0, 1, `+${s0.lifesteal}%`, '#6dffae', true)]] : [])];
        } else {
          sc.setup = D => { const h = hero(0, 1, heroIdx), e = dummy(3, 1), e2 = s0.pierce ? dummy(2, 1) : null; D.units.push(h, e); if (e2) D.units.push(e2); if (s0.chain) D.units.push(dummy(4, 0)); return { h, e, e2 }; };
          sc.ev = [[0.5, (D, s) => { fx({ type: 'proj', x: 0, y: 1, x2: s0.pull ? 3 : (s0.pierce ? 4 : 3), y2: 1, color: col, dur: 220 }); }],
            [0.75, (D, s) => { hit(s.e, `−${dmg}`); if (s.e2) hit(s.e2, `−${dmg}`); if (s0.poison) ftext(3, 1, 'Poison', '#9dff6b'); }],
            ...(s0.push ? [[0.95, (D, s) => { s.e.x = 4; }]] : []), ...(s0.pull ? [[0.95, (D, s) => { s.e.x = 2; }], [1.15, (D, s) => { s.e.x = 1; }]] : []),
            ...(s0.chain ? [[1.0, () => { fx({ type: 'bolt', x: 3, y: 1, x2: 4, y2: 0, color: '#bfe6ff', dur: 300 }); ftext(4, 0, `−${Math.round(dmg * 0.75)}`, '#fff'); }]] : [])];
        }
        return sc;
      case 'point': {
        const area = s0.area || 'single';
        sc.setup = D => { const h = hero(0, 1, heroIdx); D.units.push(h, dummy(3, 1)); if (area !== 'single') D.units.push(dummy(3, 0), dummy(4, 1)); return { h }; };
        sc.ev = [[0.5, D => { if (area === 'vortex') { fx({ type: 'vortex', x: 3, y: 1, color: col, dur: 600 }); } else if (area === 'single') fx({ type: 'proj', x: 0, y: 1, x2: 3, y2: 1, color: col, dur: 200, arc: true }); else fx({ type: 'boom', x: 3, y: 1, color: col, dur: 500, r: 1.3 }); }],
          [0.8, D => { for (const u of D.units) if (u.team === 'enemy') { if (area === 'vortex') { u.x += Math.sign(3 - u.x); u.y += Math.sign(1 - u.y) * (u.x === 3 ? 1 : 0); } if (dmg) hit(u, `−${dmg}`); if (s0.stun) u.stun = 1; } if (s0.fire) for (const [x, y] of areaTiles(3, 1, 'plus')) D.grid[y][x].fire = 3; }]];
        return sc;
      }
      case 'self':
        sc.setup = D => { const h = hero(2, 1, heroIdx); D.units.push(h); if (!s0.taunt) D.units.push(dummy(1, 1), dummy(3, 0), dummy(3, 2)); else D.units.push(foe('rodeur', 4, 1), foe('archer', 0, 0)); return { h }; };
        sc.ev = [[0.5, D => fx({ type: 'ring', x: 2, y: 1, color: s0.taunt ? '#ff6b6b' : col, dur: 500, r: s0.area === 'diamond2' ? 2.2 : 1.4 })],
          [0.75, (D, s) => { for (const u of D.units) if (u.team === 'enemy') { if (s0.taunt) { u.taunt = s.h.uid; ftext(u.x, u.y, '!', '#ff6b6b', true); } else { if (dmg) hit(u, `−${dmg}`); if (s0.push) { u.x = clamp(u.x + Math.sign(u.x - 2) * s0.push, 0, 4); u.y = clamp(u.y + Math.sign(u.y - 1), 0, 2); } if (s0.stun) u.stun = 1; } } if (s0.shield) s.h.shield = 1; }]];
        return sc;
      case 'dash':
        sc.setup = D => { const h = hero(0, 1, heroIdx), e = dummy(3, 1); D.units.push(h, e); return { h, e }; };
        sc.ev = [[0.5, (D, s) => { s.h.x = 1; }], [0.65, (D, s) => { s.h.x = 2; }], [0.8, (D, s) => { lunge(s.h, 3, 1); hit(s.e, `−${dmg}`); }], [0.95, (D, s) => { s.e.x = 4; }]];
        return sc;
      case 'leap':
        sc.setup = D => { const h = hero(0, 1, heroIdx); D.units.push(h); if (dmg) D.units.push(dummy(3, 1), dummy(2, 0)); return { h }; };
        sc.ev = [[0.5, (D, s) => { s.h.jump = performance.now(); s.h.x = 2; s.h.y = 1; }], [0.8, (D, s) => { if (dmg) { fx({ type: 'ring', x: 2, y: 1, color: col, dur: 400, r: 1.2 }); for (const u of D.units) if (u.team === 'enemy') hit(u, `−${dmg}`); } if (s0.shield) { s.h.shield = 1; ftext(2, 1, 'Bouclier', '#9fe0ff'); } }]];
        return sc;
      case 'swap':
        sc.setup = D => { const h = hero(0, 1, heroIdx), e = foe('archer', 3, 1); D.units.push(h, e); return { h, e }; };
        sc.ev = [[0.6, (D, s) => { fx({ type: 'ring', x: 0, y: 1, color: col, dur: 300 }); fx({ type: 'ring', x: 3, y: 1, color: col, dur: 300 }); s.h.x = 3; s.e.x = 0; }], [0.9, (D, s) => { if (dmg) hit(s.e, `−${dmg}`); }]];
        return sc;
      case 'place':
        sc.setup = D => { const h = hero(0, 1, heroIdx); D.units.push(h); if (s0.place !== 'wall') D.units.push(foe('rodeur', 4, 1)); return { h }; };
        sc.ev = s0.place === 'wall' ? [[0.6, D => { D.grid[1][2].t = 'rock'; D.grid[1][2].ttl = 3; fx({ type: 'burst', x: 2, y: 1, color: '#bbb', dur: 350 }); }]]
          : s0.place === 'trap' ? [[0.5, D => { D.grid[1][2].trap = { dmg }; }], [1.0, D => { D.units[1].x = 3; }], [1.3, D => { D.units[1].x = 2; }], [1.5, D => { D.grid[1][2].trap = null; hit(D.units[1], `−${dmg}`); D.units[1].stun = 1; ftext(2, 1, 'Piège !', '#ffd166'); }]]
          : [[0.5, D => { D.bombs.push({ x: 3, y: 1, dmg }); }], [1.6, D => { D.bombs = []; fx({ type: 'boom', x: 3, y: 1, color: '#ffb347', dur: 600, r: 1.5 }); hit(D.units[1], `−${dmg}`); }]];
        return sc;
      case 'ally':
        sc.setup = D => { const h = hero(0, 1, heroIdx), a = hero(2, 1, 1 - (heroIdx || 0)); D.units.push(h, a); return { h, a }; };
        sc.ev = [[0.6, (D, s) => { if (s0.shield) { s.a.shield = 1; fx({ type: 'ring', x: 2, y: 1, color: '#9fe0ff', dur: 450 }); ftext(2, 1, 'Bouclier', '#9fe0ff'); } if (s0.order) ftext(2, 1, 'Rejoue !', '#ffd166', true); }]];
        return sc;
    }
    return null;
  }
  function zoneScene(k) {
    const sc = { W: 5, H: 3, period: 2.8 };
    const walk = (D, s, x, y) => { s.u.x = x; s.u.y = y; };
    switch (k) {
      case 'portail':
        sc.setup = D => { D.grid[1][2].z = 'portail'; D.grid[1][2].zp = 0; D.grid[0][4].z = 'portail'; D.grid[0][4].zp = 0; const u = hero(0, 1); D.units.push(u); return { u }; };
        sc.ev = [[0.5, (D, s) => walk(D, s, 1, 1)], [0.9, (D, s) => walk(D, s, 2, 1)], [1.1, (D, s) => { s.u.x = 4; s.u.y = 0; s.u.rx = 4; s.u.ry = 0; fx({ type: 'ring', x: 4, y: 0, color: '#d68bff', dur: 400 }); }]];
        return sc;
      case 'glace':
        sc.setup = D => { for (const x of [2, 3]) D.grid[1][x].z = 'glace'; const h = hero(0, 1), u = foe('rodeur', 1, 1); D.units.push(h, u); return { h, u }; };
        sc.ev = [[0.5, (D, s) => { lunge(s.h, 1, 1); hit(s.u, '−9'); }], [0.7, (D, s) => { s.u.x = 2; }], [0.9, (D, s) => { s.u.x = 3; ftext(3, 1, 'Glisse', '#bfeaff'); }], [1.1, (D, s) => { s.u.x = 4; }]];
        return sc;
      case 'courant':
        sc.setup = D => { for (const x of [1, 2, 3]) { D.grid[1][x].z = 'courant'; D.grid[1][x].zd = [1, 0]; } D.grid[1][4].t = 'pit'; const u = foe('rodeur', 3, 1); D.units.push(u); return { u }; };
        sc.ev = [[1.0, (D, s) => { s.u.x = 4; s.u.falling = performance.now(); ftext(4, 1, 'Chute !', '#c9b6ff', true); }]];
        return sc;
      case 'trampoline':
        sc.setup = D => { D.grid[1][2].z = 'trampoline'; const u = hero(0, 1); D.units.push(u); return { u }; };
        sc.ev = [[0.5, (D, s) => walk(D, s, 1, 1)], [0.9, (D, s) => walk(D, s, 2, 1)], [1.1, (D, s) => { s.u.jump = performance.now(); s.u.x = 4; ftext(2, 1, 'Boing !', '#ff9ad5', true); }]];
        return sc;
      case 'boue':
        sc.setup = D => { D.grid[1][2].z = 'boue'; const u = hero(0, 1); D.units.push(u); return { u }; };
        sc.ev = [[0.5, (D, s) => walk(D, s, 1, 1)], [0.9, (D, s) => walk(D, s, 2, 1)], [1.2, (D, s) => ftext(2, 1, 'Bloqué', '#c9a070', true)]];
        return sc;
      case 'buisson':
        sc.setup = D => { D.grid[1][1].z = 'buisson'; const u = hero(1, 1), e = foe('archer', 4, 1); D.units.push(u, e); return { u, e }; };
        sc.ev = [[0.8, () => { fx({ type: 'proj', x: 4, y: 1, x2: 0, y2: 1, color: '#ffb36b', dur: 300 }); }], [1.1, () => ftext(1, 1, 'Raté !', '#86e39a', true)]];
        return sc;
      case 'rune':
        sc.setup = D => { D.grid[1][0].z = 'rune'; const u = hero(0, 1, 1), e = dummy(3, 1); D.units.push(u, e); return { u, e }; };
        sc.ev = [[0.6, () => fx({ type: 'proj', x: 0, y: 1, x2: 3, y2: 1, color: '#ffd166', dur: 220 })], [0.85, (D, s) => hit(s.e, '−12 (×1,75)', '#ffd166')]];
        return sc;
      case 'cercle':
        sc.setup = D => { D.grid[1][2].z = 'cercle'; D.grid[1][2].prog = 0; const u = hero(2, 1); D.units.push(u); return { u }; };
        sc.ev = [[0.8, D => { D.grid[1][2].prog = 1; ftext(2, 1, '1/2', '#ffd166', true); }], [1.8, D => { D.grid[1][2].prog = 2; ftext(2, 1, '+3 or · +8 %', '#ffd166', true); }], [2.3, D => { D.grid[1][2].z = null; }]];
        return sc;
      case 'machoire':
        sc.setup = D => { D.grid[1][2].z = 'machoire'; const u = foe('rodeur', 4, 1); D.units.push(u); return { u }; };
        sc.ev = [[0.5, (D, s) => walk(D, s, 3, 1)], [0.9, (D, s) => { walk(D, s, 2, 1); D.grid[1][2].z = null; s.u.stun = 1; hit(s.u, '−3 Étourdi'); }]];
        return sc;
      case 'soin':
        sc.setup = D => { D.grid[1][2].z = 'soin'; const u = hero(0, 1); D.units.push(u); return { u }; };
        sc.ev = [[0.5, (D, s) => walk(D, s, 1, 1)], [0.9, (D, s) => { walk(D, s, 2, 1); D.grid[1][2].z = null; ftext(2, 1, '+6%', '#6dffae', true); }]];
        return sc;
    }
    // cases à effet sur place (piques, autel, foyer, fosse, lave…)
    const T = { piques: ['z', 'piques', '−5%', '#ff6b6b'], autel: ['z', 'autel', '+5%', '#6dffae'], foyer: ['z', 'foyer', '−5%', '#ff9a3d'], fosse: ['t', 'pit', 'Chute −12%', '#c9b6ff'], lave: ['t', 'lava', '−8%', '#ff9a3d'], vide: ['t', 'void', 'Chute −12%', '#c9b6ff'] }[k];
    if (!T) return null;
    sc.setup = D => { if (T[0] === 'z') D.grid[1][2].z = k; else D.grid[1][2].t = T[1]; const u = hero(0, 1); D.units.push(u); return { u }; };
    sc.ev = [[0.5, (D, s) => walk(D, s, 1, 1)], [0.9, (D, s) => { walk(D, s, 2, 1); if (T[0] === 't' && T[1] !== 'lava') s.u.falling = performance.now(); hit(s.u, T[2], T[3]); }], [1.6, (D, s) => { if (s.u.falling) { s.u.falling = 0; s.u.x = 1; s.u.y = 0; s.u.rx = 1; s.u.ry = 0; } }]];
    return sc;
  }
  function objScene(k) {
    const sc = { W: 5, H: 3, period: 2.6 };
    sc.setup = D => {
      const h = hero(0, 1, 1); D.units.push(h);
      const o = k === 'orbe' ? mk({ team: 'obj', kind: 'orbe', orb: 'fureur', x: 3, y: 1, hp: 7, maxHp: 7 }) : mk({ team: 'obj', kind: k, x: 3, y: 1, hp: k === 'baril' ? 1 : 8, maxHp: k === 'baril' ? 1 : 8 });
      D.units.push(o); if (k === 'baril') D.units.push(foe('rodeur', 4, 0), foe('rodeur', 3, 2)); if (k === 'cristal') { D.kind = 'rituel'; D.units.push(foe('brute', 4, 0), foe('rodeur', 4, 2)); }
      return { h, o };
    };
    sc.ev = [[0.6, () => fx({ type: 'proj', x: 0, y: 1, x2: 3, y2: 1, color: '#5ad0ff', dur: 220 })], [0.85, (D, s) => {
      s.o.dead = true;
      if (k === 'baril') { fx({ type: 'boom', x: 3, y: 1, color: '#ffb347', dur: 600, r: 1.5 }); for (const u of D.units) if (u.team === 'enemy') hit(u, '−10'); }
      else if (k === 'coffre') { fx({ type: 'burst', x: 3, y: 1, color: '#ffd166', dur: 500 }); ftext(3, 1, '+3 or', '#ffd166', true); }
      else if (k === 'orbe') { fx({ type: 'ring', x: 3, y: 1, color: '#ff6b6b', dur: 600, r: 2.5 }); ftext(3, 1, 'Fureur ! +40 %', '#ff6b6b', true); }
      else { fx({ type: 'burst', x: 3, y: 1, color: '#d68bff', dur: 500 }); ftext(3, 1, 'Cristal brisé', '#d68bff', true); }
    }]];
    return sc;
  }

  /* pouvoirs d'élite et mutations de boss */
  function modScene(k) {
    const sc = { W: 5, H: 3, period: 2.8 };
    const M = MODS[k];
    sc.setup = D => {
      const h = hero(k === 'epines' ? 2 : 0, 1, 0); D.units.push(h);
      const e = M.bossOnly ? boss('colosse', 3, 1) : foe('brute', 3, 1, { elite: true });
      e.mods = [k]; if (k === 'protege') e.shield = 1;
      D.units.push(e);
      if (k === 'escorte') { const a = foe('rodeur', 4, 0, { elite: true, mods: ['vif'] }), b = foe('archer', 4, 2, { elite: true, mods: ['blinde'] }); D.units.push(a, b); }
      if (k === 'explosif') D.units.push(foe('rodeur', 4, 0), foe('archer', 4, 2));
      return { h, e };
    };
    const shot = (D, s) => fx({ type: 'proj', x: s.h.x, y: s.h.y, x2: s.e.x, y2: s.e.y, color: '#ff8a3d', dur: 220 });
    switch (k) {
      case 'blinde': sc.ev = [[0.5, shot], [0.75, (D, s) => { hit(s.e, '−6 au lieu de 10', '#9fb7d9'); }]]; break;
      case 'vif': sc.ev = [[0.5, (D, s) => { s.e.x = 1; s.e.y = 1; }], [1.0, (D, s) => { fx({ type: 'slash', x: 0, y: 1, color: '#ff6b6b', dur: 250 }); hit(s.h, '−8%', '#ff6b6b'); ftext(2, 0, '+1 case', '#f7c948', true); }]]; break;
      case 'vampire': sc.ev = [[0.5, (D, s) => { s.e.x = 1; }], [0.9, (D, s) => { fx({ type: 'slash', x: 0, y: 1, color: '#ff6b6b', dur: 250 }); hit(s.h, '−8%', '#ff6b6b'); }], [1.2, (D, s) => { s.e.hp = s.e.maxHp; ftext(1, 0, '+15 % PV', '#ff5a7a', true); }]]; break;
      case 'explosif': sc.ev = [[0.5, shot], [0.75, (D, s) => { s.e.dead = true; fx({ type: 'boom', x: 3, y: 1, color: '#ff9a3d', dur: 600, r: 1.5 }); for (const u of D.units) if (u.team === 'enemy' && !u.dead) hit(u, '−8'); }]]; break;
      case 'lourd': sc.ev = [[0.5, shot], [0.75, (D, s) => { hit(s.e, 'Inébranlable', '#a8adbd'); }]]; break;
      case 'regen': sc.ev = [[0.5, shot], [0.75, (D, s) => { s.e.hp = Math.round(s.e.maxHp * 0.6); hit(s.e, '−10'); }], [1.6, (D, s) => { s.e.hp = Math.round(s.e.maxHp * 0.7); ftext(3, 0, '+10 % PV', '#6dffae', true); }]]; break;
      case 'epines': sc.ev = [[0.5, (D, s) => { fx({ type: 'slash', x: 3, y: 1, color: '#ff8a3d', dur: 250 }); hit(s.e, '−11'); }], [0.8, (D, s) => { hit(s.h, '−3% Épines', '#c6e05a'); }]]; break;
      case 'protege': sc.ev = [[0.5, shot], [0.75, (D, s) => { s.e.shield = 0; ftext(3, 1, 'Bloqué', '#9fe0ff', true); }], [1.3, shot], [1.55, (D, s) => hit(s.e, '−10')]]; break;
      case 'escorte': sc.ev = [[0.6, () => ftext(3, 0, '+2 élites', '#ffd166', true)]]; break;
      case 'furie': sc.ev = [[0.5, (D, s) => { s.e.x = 1; }], [0.9, (D, s) => { fx({ type: 'slash', x: 0, y: 1, color: '#ff6b6b', dur: 250 }); hit(s.h, '−13% (+25 %)', '#ff6b6b'); }]]; break;
    }
    return sc;
  }

  /* ---------- entrées du Codex ---------- */
  const TERRAIN = ['piques', 'courant', 'autel', 'glace', 'rune', 'portail', 'buisson', 'boue', 'cercle', 'soin', 'foyer', 'trampoline', 'machoire', 'fosse', 'lave', 'vide'];
  const TERRAIN_INFO = {
    fosse: ['Fosse', 'Un ennemi qui tombe dedans meurt (le kill compte). Un héros perd 12 % et remonte à côté.'],
    lave: ['Lave', '10 dégâts aux ennemis qui y sont au tour ennemi, −8 % aux héros qui y commencent leur tour.'],
    vide: ['Vide (bord de la salle)', 'Les salles ont des formes variées : le vide autour se comporte comme une fosse. Pousse les ennemis dans le vide !'],
  };
  function entries(t) {
    switch (t) {
      case 'heros': return Object.keys(HEROES).map(k => ({ id: k, name: HEROES[k].name, color: HEROES[k].color, desc: HEROES[k].desc, chips: chip(SKILLS[HEROES[k].basic].icon, SKILLS[HEROES[k].basic].name) + chip('blade', SKILLS[HEROES[k].basic].dmg, 'red') + chip('foot', HEROES[k].move, 'blue'), scene: () => Object.assign(skillScene(HEROES[k].basic, 0), { heroKey: k }) }));
      case 'ennemis': return Object.keys(ENEMIES).map(k => { const E = ENEMIES[k]; return { id: k, name: E.name, color: E.color, desc: E.desc, chips: chip('heart', E.hp) + (E.dmg ? chip('blade', E.dmg + '%', 'red') : '') + chip('foot', E.move, 'blue') + (E.range > 1 ? chip('target', E.range) : '') + (E.minDepth < 999 ? chip('door', 'dès la salle ' + (E.minDepth + 1)) : chip('swap', 'créé par d’autres')), scene: () => enemyScene(k) }; });
      case 'boss': return BOSS_ORDER.map(k => { const B = BOSSES[k]; return { id: k, name: B.name, color: B.color, desc: B.desc, chips: chip('heart', B.hp) + chip('blade', B.dmg + '%', 'red') + (B.phases || []).map(p => chip('skullx', `${Math.round(p.at * 100)} % : ${p.name}`, 'red', p.tip)).join(''), scene: () => bossScene(k) }; });
      case 'competences': return Object.keys(SKILLS).map(k => { const s = SKILLS[k]; return { id: k, name: s.name, icon: s.icon, desc: s.desc, chips: (s.dmg ? chip('blade', s.dmg, 'red') + chip('up', 'max ' + Math.round(s.dmg * CAP_MULT)) : '') + chip('target', skillKindText(s)) + (s.cd ? chip('hourglass', s.cd) : '') + (s.basic ? chip('star', 'base', 'gold') : ''), scene: () => skillScene(k, 0) }; });
      case 'terrain': return TERRAIN.map(k => { const Z = ZONES[k]; const I = TERRAIN_INFO[k]; return { id: k, name: Z ? Z.name : I[0], icon: ZONE_ICON[k] || (k === 'lave' ? 'lava' : 'pit'), desc: Z ? Z.desc : I[1], chips: Z && Z.tip ? chip(null, Z.tip) : '', scene: () => zoneScene(k) }; })
        .concat(['coffre', 'orbe', 'baril', 'cristal'].map(k => ({ id: k, name: { coffre: 'Coffre', orbe: 'Orbe', baril: 'Baril explosif', cristal: 'Cristal (Rituel)' }[k], icon: { coffre: 'gold', orbe: 'star', baril: 'barrel', cristal: 'gem' }[k],
          desc: { coffre: 'Casse-le avec un héros : de l’or.', orbe: 'Casse-la : bonus pour toute la salle. ' + Object.keys(ORBS).map(o => ORBS[o].name + ' : ' + ORBS[o].tip).join(' · '), baril: 'Explose quand on le touche : 10 dégâts (−8 % aux héros) autour.', cristal: 'Tant qu’un cristal tient, les ennemis font +30 % de dégâts et récupèrent 3 PV par tour.' }[k], chips: '', scene: () => objScene(k) })));
      case 'pouvoirs': return Object.keys(MODS).map(k => ({ id: k, name: MODS[k].name, icon: MODS[k].icon, desc: MODS[k].desc + (MODS[k].bossOnly ? ' (mutation de boss uniquement)' : MODS[k].noBoss ? ' (élites uniquement)' : ' (élites et boss)'), chips: chip(MODS[k].icon, MODS[k].tip, 'mod'), scene: () => modScene(k) }))
        .concat([{ id: '_elite', name: 'Élites', icon: 'star', desc: 'Une élite (étoile) a plus de PV et frappe plus fort. Dès la salle 8, chaque élite a un pouvoir (deux en difficulté 5 et plus). Ses pouvoirs sont dessinés en bas à gauche de sa case.', chips: '' },
          { id: '_mut', name: 'Mutations des boss', icon: 'crown', desc: 'Chaque fois que tu as battu les 6 boss, ils gagnent une mutation de plus (jusqu’à 3). Elles sont affichées sur la porte du boss et dans sa barre de vie.', chips: '' }]);
      case 'ameliorations': return Object.keys(UPGRADES).map(k => ({ id: k, name: UPGRADES[k].name, icon: 'up', desc: `★ : ${UPGRADES[k].desc(1)} · ★★ : ${UPGRADES[k].desc(2)}`, chips: '' }));
      case 'salles': return Object.keys(ROOM_KINDS).map(k => ({ id: k, name: ROOM_KINDS[k].name, icon: ROOM_KINDS[k].icon, desc: ROOM_KINDS[k].tip, chips: '' }))
        .concat(Object.keys(TRAITS).map(k => ({ id: 't_' + k, name: TRAITS[k].name, icon: TRAITS[k].bad ? 'taunt' : 'star', desc: TRAITS[k].desc, chips: chip(null, 'particularité de salle') })));
      case 'regles': return Object.keys(RULES).map(k => ({ id: k, name: RULES[k].name, icon: 'rule', desc: RULES[k].desc, chips: chip(null, 'règle') }))
        .concat(Object.keys(PACTS).map(k => ({ id: 'p_' + k, name: PACTS[k].name, icon: 'pact', desc: `+ ${PACTS[k].bonus(1)} (★★ : ${PACTS[k].bonus(2)}) · − ${PACTS[k].malus}`, chips: chip(null, 'pacte') })))
        .concat(Object.keys(TALENTS).map(k => ({ id: 'ta_' + k, name: TALENTS[k].name, icon: 'star', desc: TALENTS[k].desc + ' Aucun maximum : chaque niveau coûte plus cher.', chips: chip(null, 'talent') })));
      case 'mecaniques': return [
        ['arrow', 'Prévision', 'Flèches rouges = qui frappe qui. Silhouettes = où vont les ennemis. Croix jaune = va mourir. Numéros = ordre d’action. Sous chaque héros : son % après le tour ennemi.'],
        ['heart', '% de dégâts', 'Pas de PV : chaque coup reçu baisse ton %, et tes attaques font ce % de leurs dégâts. Jamais sous 40 %. Tuer = +5 %.'],
        ['up', 'Dégâts maximum', 'Chaque compétence a un plafond par coup (2× ses dégâts de base). « 40/16 » = elle ferait 40 mais est limitée à 16. Relève le plafond avec l’amélioration Plafond (+30 %) ou en attaquant depuis une Rune (+50 %). Le bonus d’Exécution / Bourreau relève aussi le plafond.'],
        ['snow', 'Étourdissement', 'Une unité étourdie passe son tour. En sortant d’un étourdissement, elle résiste au suivant jusqu’à ce qu’elle ait rejoué (un boss résiste deux tours). Impossible de bloquer un ennemi pour toujours.'],
        ['star', 'Élites et mutations', 'Les élites ont des pouvoirs (Blindé, Vampire, Explosif…), les boss gagnent des mutations à chaque tour complet des 6 boss. Voir l’onglet Pouvoirs.'],
        ['door', 'Épreuve du jour', `Chaque jour, une partie identique pour tout le monde : mêmes héros, mêmes portes, mêmes salles. ${DAILY_ROOMS} salles, puis le score : 10 × ★ par salle gagnée, 60 × ★ par boss, +10 par défi, +5 par salle sans perte.`],
        ['crown', 'Hauts faits', 'Des objectifs pour toute ta vie de joueur (écran titre). Ils ne donnent aucun pouvoir : seul l’or rend les choses définitives.'],
        ['dash', 'Ordre d’action', 'Les ennemis jouent de gauche à droite puis de haut en bas, les boss en dernier.'],
        ['hourglass', 'Début du tour ennemi', '1) arrivées 2) courants 3) bombes 4) attaques annoncées 5) poison, feu, lave, autels 6) chaque ennemi joue.'],
        ['push', 'Collisions', 'Poussé contre un obstacle ou une unité : 5 dégâts aux deux (−4 % pour un héros).'],
        ['crown', 'Boss', 'Phases sous certains seuils de PV. Traque : un boss qui ne t’a pas touché depuis 3 tours se téléporte à côté du héros le plus faible et frappe.'],
        ['skullx', 'Difficulté', 'De 1 à l’infini. Changeable toutes les 10 salles. Niveau N+1 débloqué en battant un boss au niveau N.'],
        ['gold', 'Or', 'Boss, coffres et cercles de pouvoir. Sert à graver (garder pour toujours) et aux talents.'],
      ].map(([ic, n, d]) => ({ id: n, name: n, icon: ic, desc: d, chips: '' }));
    }
    return [];
  }
  const TABS = { heros: ['star', 'Héros'], ennemis: ['skullx', 'Ennemis'], boss: ['crown', 'Boss'], competences: ['blade', 'Compétences'], terrain: ['spikes', 'Terrain & objets'], ameliorations: ['up', 'Améliorations'], salles: ['door', 'Salles'], pouvoirs: ['bolt', 'Pouvoirs'], regles: ['rule', 'Règles & talents'], mecaniques: ['cog', 'Mécaniques'] };

  /* ---------- fenêtre ---------- */
  function open(t, id) {
    if (t) tab = t;
    const list = entries(tab);
    if (!sel || !list.some(e => e.id === sel)) sel = list[0] && list[0].id;
    const tabsHtml = Object.keys(TABS).map(k => `<button class="cx-tab ${k === tab ? 'on' : ''}" data-tab="${k}">${icon(TABS[k][0], 16)} ${TABS[k][1]}</button>`).join('');
    const items = list.map(e => `<button class="cx-item ${e.id === sel ? 'on' : ''}" data-id="${esc(e.id)}">${e.color ? `<i class="cx-dot" style="background:${e.color}"></i>` : icon(e.icon || 'star', 18)}<span>${esc(e.name)}</span></button>`).join('');
    const m = UI.modal(`${icon('rule', 26)} Codex`, `<div class="cx-tabs">${tabsHtml}</div><div class="cx2"><div class="cx-items">${items}</div><div class="cx-detail" id="cx-detail"></div></div>`, [{ label: 'Fermer', cls: 'ghost', fn: stop }], { wide: true, huge: true });
    m.querySelectorAll('.cx-tab').forEach(b => b.onclick = () => { tab = b.dataset.tab; sel = null; open(); });
    m.querySelectorAll('.cx-item').forEach(b => b.onclick = () => { sel = b.dataset.id; m.querySelectorAll('.cx-item').forEach(x => x.classList.toggle('on', x === b)); showDetail(list.find(e => e.id === sel)); });
    showDetail(list.find(e => e.id === sel));
  }
  function showDetail(e) {
    const box = document.getElementById('cx-detail'); if (!box || !e) return;
    const sc = e.scene ? e.scene() : null;
    box.innerHTML = `${sc ? '<canvas class="cx-canvas"></canvas>' : `<div class="cx-big">${icon(e.icon || 'star', 64)}</div>`}
      <h3>${e.color ? `<i class="cx-dot" style="background:${e.color}"></i>` : ''}${esc(e.name)}</h3>
      ${e.chips ? `<div class="cx-c">${e.chips}</div>` : ''}<p>${esc(e.desc || '')}</p>`;
    stop();
    if (sc) start(box.querySelector('canvas'), sc);
  }
  function reset(sc) {
    const D = emptyWorld(sc.W, sc.H);
    const st = sc.setup ? sc.setup(D) || {} : {};
    return { D, st, done: new Set() };
  }
  function start(canvas, sc) {
    const DS = demoS(); if (sc.heroKey) DS.heroes[0].key = sc.heroKey;
    let t0 = performance.now(), last = t0, run = null, loopN = -1;
    const tick = now => {
      if (!canvas.isConnected) { raf = 0; return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const lt = ((now - t0) / 1000) % sc.period, n = Math.floor((now - t0) / 1000 / sc.period);
      Render.drawDemo(canvas, run ? run.D : emptyWorld(sc.W, sc.H), DS, now, dt, () => {
        if (n !== loopN) { loopN = n; run = reset(sc); C = run.D; }
        (sc.ev || []).forEach(([t, fn], i) => { if (!run.done.has(i) && lt >= t) { run.done.add(i); try { fn(run.D, run.st); } catch (e) { } } });
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  /* petite scène animée hors du Codex (écran de choix des héros) */
  function playHero(canvas, k) { stop(); start(canvas, Object.assign(skillScene(HEROES[k].basic, 0), { heroKey: k })); }
  return { open, stop, playHero };
})();
