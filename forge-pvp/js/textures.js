'use strict';
/* Forge PvP — textures pixel-art procédurales (blocs, skins, armure, objets, particules, icônes). */
(function () {
const FP = window.FP;
const TX = FP.TX = {};

function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; }
function rgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function col(c, k) { return `rgb(${Math.max(0, Math.min(255, c[0] * k)) | 0},${Math.max(0, Math.min(255, c[1] * k)) | 0},${Math.max(0, Math.min(255, c[2] * k)) | 0})`; }
function P(g, x, y, c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); }
TX.cnv = cnv; TX.rgb = rgb; TX.col = col;

// ================================================================ blocs 16×16
const BLOCKS = {};
function block(name, seed, draw) {
  const [c, g] = cnv(16, 16); const r = FP.rng(seed);
  draw(g, r); BLOCKS[name] = c; return c;
}
block('grass_top', 11, (g, r) => { const b = [96, 158, 56]; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) P(g, x, y, col(b, 0.8 + r() * 0.32 - (r() < 0.08 ? 0.15 : 0))); });
block('dirt', 12, (g, r) => { const b = [134, 96, 67]; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const k = r(); P(g, x, y, k < 0.1 ? col([95, 70, 48], 1) : k > 0.93 ? col([160, 120, 88], 1) : col(b, 0.88 + r() * 0.2)); } });
block('grass_side', 13, (g, r) => {
  g.drawImage(BLOCKS.dirt, 0, 0); const b = [96, 158, 56];
  for (let x = 0; x < 16; x++) { const d = 2 + (r() < 0.5 ? 1 : 0) + (r() < 0.2 ? 1 : 0); for (let y = 0; y < d; y++) P(g, x, y, col(b, 0.78 + r() * 0.3)); }
});
block('stone', 14, (g, r) => {
  const b = [126, 126, 126];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) P(g, x, y, col(b, 0.9 + r() * 0.16));
  for (let i = 0; i < 9; i++) { const x = r() * 15 | 0, y = r() * 15 | 0; P(g, x, y, col(b, 0.72)); P(g, x + 1, y, col(b, 0.78)); if (r() < 0.5) P(g, x, y + 1, col(b, 0.75)); }
});
block('stone_bricks', 15, (g, r) => {
  const b = [122, 122, 122], m = [82, 82, 82];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) P(g, x, y, col(b, 0.9 + r() * 0.15));
  for (let x = 0; x < 16; x++) { P(g, x, 7, col(m, 1)); P(g, x, 15, col(m, 1)); P(g, x, 0, col(b, 1.12)); P(g, x, 8, col(b, 1.12)); }
  for (let y = 0; y < 8; y++) { P(g, 15, y, col(m, 1)); P(g, 7, y + 8, col(m, 1)); }
});
block('obsidian', 16, (g, r) => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const k = r(); P(g, x, y, k > 0.94 ? '#5b4187' : k > 0.82 ? '#3a2758' : col([20, 17, 30], 0.85 + r() * 0.3)); }
});
block('gold', 17, (g, r) => {
  const b = [247, 208, 60];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) P(g, x, y, col(b, 0.92 + r() * 0.12));
  for (let i = 0; i < 16; i++) { P(g, i, 0, '#fff6b0'); P(g, 0, i, '#fff6b0'); P(g, i, 15, '#b8891c'); P(g, 15, i, '#b8891c'); }
  for (let i = 2; i < 6; i++) P(g, i, 2, '#fffbe0');
});
block('emerald', 18, (g, r) => {
  const b = [44, 200, 90];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = (Math.abs(x - 7.5) + Math.abs(y - 7.5)) | 0; P(g, x, y, col(b, (d % 4 === 0 ? 0.75 : 1) * (0.92 + r() * 0.12))); }
  for (let i = 0; i < 16; i++) { P(g, i, 0, '#9dffbf'); P(g, 0, i, '#9dffbf'); P(g, i, 15, '#137a3a'); P(g, 15, i, '#137a3a'); }
});
block('danger', 23, (g, r) => { // obstacle mortel : rouge vif, quadrillé, bien visible
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) P(g, x, y, col([226, 38, 30], 0.86 + r() * 0.2));
  for (let i = 0; i < 16; i++) { P(g, i, 0, '#ff8a7a'); P(g, 0, i, '#ff8a7a'); P(g, i, 15, '#7a0c08'); P(g, 15, i, '#7a0c08'); P(g, i, 7, '#9e140e'); P(g, 7, i, '#9e140e'); }
  for (let i = 3; i < 13; i++) { P(g, i, i, '#ffd0c8'); P(g, i, 15 - i, '#ffd0c8'); }
});
block('log_side', 19, (g, r) => {
  const b = [104, 82, 50];
  for (let x = 0; x < 16; x++) { const k = 0.85 + r() * 0.25; for (let y = 0; y < 16; y++) P(g, x, y, col(b, k * (0.92 + r() * 0.12) * (x % 4 === 0 ? 0.8 : 1))); }
});
block('log_top', 20, (g, r) => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    P(g, x, y, d > 6.6 ? col([104, 82, 50], 0.9 + r() * 0.2) : col([176, 142, 88], ((d | 0) % 2 ? 0.86 : 1) * (0.95 + r() * 0.1)));
  }
});
block('leaves', 21, (g, r) => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { if (r() < 0.16) continue; P(g, x, y, col([58, 118, 40], 0.7 + r() * 0.45)); }
});
block('planks', 22, (g, r) => {
  const b = [162, 130, 78];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) P(g, x, y, col(b, (y % 4 === 3 ? 0.7 : 0.92 + r() * 0.12)));
  for (let y = 0; y < 4; y++) { P(g, 4 + (y % 2) * 6, y * 4 + 1, col(b, 0.75)); }
});
block('packed_ice', 26, (g, r) => { // glace compactée : bleu pâle opaque, veines blanches
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) P(g, x, y, col([142, 180, 230], 0.9 + r() * 0.14));
  for (let i = 0; i < 6; i++) { let x = r() * 16 | 0, y = r() * 16 | 0; for (let k = 0; k < 6; k++) { P(g, x & 15, y & 15, col([214, 232, 255], 0.95 + r() * 0.1)); x += r() < 0.5 ? 1 : 0; y += 1; } }
});
block('blue_ice', 27, (g, r) => { // glace bleue : bleu profond, éclats clairs
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) P(g, x, y, col([92, 140, 226], 0.86 + r() * 0.18));
  for (let i = 0; i < 10; i++) { const x = r() * 15 | 0, y = r() * 15 | 0; P(g, x, y, '#cfe4ff'); P(g, x + 1, y, '#a9cbff'); }
});
block('ice', 28, (g, r) => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) P(g, x, y, col([160, 200, 250], 0.92 + r() * 0.1));
  for (let i = 0; i < 16; i++) { P(g, i, 0, '#e8f3ff'); P(g, 0, i, '#e8f3ff'); }
});
block('water', 29, (g, r) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) P(g, x, y, col([48, 92, 220], 0.85 + Math.sin(x * 0.8 + y * 0.4) * 0.08 + r() * 0.08)); });
block('cobweb', 30, (g, r) => { g.clearRect(0, 0, 16, 16); const c = 'rgba(240,240,240,0.95)'; for (let i = 0; i < 16; i++) { P(g, i, i, c); P(g, 15 - i, i, c); P(g, 7, i, c); P(g, i, 8, c); } for (const rr of [3, 6]) for (let a = 0; a < 6.28; a += 0.35) P(g, Math.round(7.5 + Math.cos(a) * rr), Math.round(7.5 + Math.sin(a) * rr), c); });
block('ladder', 31, (g, r) => { g.clearRect(0, 0, 16, 16); for (let y = 0; y < 16; y++) { P(g, 2, y, '#8a5d2e'); P(g, 3, y, '#6b4a22'); P(g, 12, y, '#8a5d2e'); P(g, 13, y, '#6b4a22'); } for (const y of [1, 5, 9, 13]) for (let x = 4; x < 12; x++) { P(g, x, y, '#a8884e'); P(g, x, y + 1, '#6b4a22'); } });
block('slime', 32, (g, r) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) P(g, x, y, `rgba(${110 + (r() * 20 | 0)},${190 + (r() * 30 | 0)},${90 + (r() * 20 | 0)},0.85)`); for (let y = 4; y < 12; y++) for (let x = 4; x < 12; x++) P(g, x, y, 'rgba(80,160,64,0.95)'); });
block('hay_side', 33, (g, r) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) P(g, x, y, col([196, 160, 40], (x % 3 === 0 ? 0.8 : 0.95) + r() * 0.1)); for (let x = 0; x < 16; x++) { P(g, x, 3, '#7a4a1a'); P(g, x, 12, '#7a4a1a'); } });
block('hay_top', 34, (g, r) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) P(g, x, y, col([180, 146, 36], 0.85 + r() * 0.2)); });
block('gravel', 35, (g, r) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const k = r(); P(g, x, y, k < 0.2 ? '#6e6a68' : k < 0.5 ? '#8c8682' : k < 0.8 ? '#a49e99' : '#bcb6b0'); } });
block('glass', 36, (g, r) => { g.clearRect(0, 0, 16, 16); for (let i = 0; i < 16; i++) { P(g, i, 0, '#dcecf5'); P(g, 0, i, '#dcecf5'); P(g, i, 15, '#a8c4d4'); P(g, 15, i, '#a8c4d4'); } P(g, 3, 3, '#ffffff'); P(g, 4, 4, '#ffffff'); P(g, 5, 3, '#ffffff'); });
for (const [n, c, sd] of [['coal_ore', '#1c1c1c', 37], ['iron_ore', '#d8af93', 38], ['gold_ore', '#f5d23c', 39], ['diamond_ore', '#5decf5', 40]]) block(n, sd, (g, r) => { g.drawImage(BLOCKS.stone, 0, 0); for (let i = 0; i < 6; i++) { const x = 1 + (r() * 12 | 0), y = 1 + (r() * 12 | 0); P(g, x, y, c); P(g, x + 1, y, c); P(g, x, y + 1, c); } });
block('scaffolding', 53, (g, r) => { g.clearRect(0, 0, 16, 16); const a = '#d8b45a', b = '#a8843a'; for (let i = 0; i < 16; i++) { P(g, i, 0, a); P(g, i, 1, b); P(g, i, 15, b); P(g, 0, i, a); P(g, 15, i, b); P(g, i, i, a); } });
block('bed_top', 54, (g, r) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) P(g, x, y, y < 5 ? col([236, 236, 236], 0.95 + r() * 0.05) : col([170, 36, 36], 0.9 + r() * 0.12)); });
block('bed_side', 55, (g, r) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) P(g, x, y, y < 7 ? col([170, 36, 36], 0.85 + r() * 0.1) : y < 9 ? '#e8e8e8' : col([162, 130, 78], 0.85 + r() * 0.15)); });
block('glowstone', 24, (g, r) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const k = r(); P(g, x, y, k > 0.8 ? '#ffeaa0' : k > 0.5 ? '#e0b25a' : k > 0.2 ? '#b98a3a' : '#8a6228'); } });
block('skull', 25, (g, r) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) P(g, x, y, col([206, 200, 182], 0.88 + r() * 0.16));
  [[3, 6], [4, 6], [3, 7], [4, 7], [11, 6], [12, 6], [11, 7], [12, 7], [3, 5], [12, 5]].forEach(([x, y]) => P(g, x, y, '#1c1c1c'));
  for (let x = 6; x < 10; x++) P(g, x, 10, '#4a4a4a'); for (let x = 4; x < 12; x += 2) P(g, x, 12, '#3a3a3a'); });
block('terracotta', 26, (g, r) => { const b = [150, 82, 56]; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) P(g, x, y, col(b, (y === 0 || y === 15 ? 0.75 : 0.9 + r() * 0.15))); });
block('iron_bars', 27, (g, r) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) P(g, x, y, col([150, 152, 156], (x % 4 === 1 ? 1.15 : 0.85) * (0.9 + r() * 0.15))); });
block('stone_slab', 28, (g, r) => { g.drawImage(BLOCKS.stone, 0, 0); for (let x = 0; x < 16; x++) { P(g, x, 0, '#a8a8a8'); P(g, x, 15, '#5a5a5a'); } });
block('sand', 23, (g, r) => { const b = [219, 207, 163]; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) P(g, x, y, col(b, 0.9 + r() * 0.14)); });
const WOOL = { white: '#e9ecec', red: '#a12722', blue: '#35399d', yellow: '#f8c627', lime: '#70b919', orange: '#f07613', purple: '#7a2aad', cyan: '#158991' };
Object.entries(WOOL).forEach(([n, h], i) => block('wool_' + n, 40 + i, (g, r) => {
  const b = rgb(h);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) P(g, x, y, col(b, ((x + y * 2) % 5 === 0 ? 0.88 : 1) * (0.93 + r() * 0.1)));
}));
TX.BLOCKS = BLOCKS;
TX.WOOL = WOOL;

// ================================================================ skins de joueur (faces séparées pour BoxGeometry)
// ordre des faces three.js : +x (gauche du perso), -x (droite), +y, -y, +z (devant), -z (dos)
function face(w, h, seed, draw) { const [c, g] = cnv(w, h); draw(g, FP.rng(seed)); return c; }
function fillN(g, w, h, base, r, amt) { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) P(g, x, y, col(base, 1 - amt / 2 + r() * amt)); }
TX.skin = function (o) {
  const skin = rgb(o.skin || '#c9976a'), hair = rgb(o.hair || '#3b2718'), shirt = rgb(o.shirt || '#18a7a8'), pants = rgb(o.pants || '#383f9a'), shoe = rgb('#4d4d52'), eye = rgb(o.eye || '#4a3ca8');
  const s = o.seed || 1;
  const head = [
    face(8, 8, s + 1, (g, r) => { fillN(g, 8, 8, skin, r, 0.1); for (let x = 0; x < 8; x++) { P(g, x, 0, col(hair, 1)); P(g, x, 1, col(hair, 0.95)); } for (let y = 2; y < 4; y++) for (let x = 4; x < 8; x++) P(g, x, y, col(hair, 0.9)); }),
    face(8, 8, s + 2, (g, r) => { fillN(g, 8, 8, skin, r, 0.1); for (let x = 0; x < 8; x++) { P(g, x, 0, col(hair, 1)); P(g, x, 1, col(hair, 0.95)); } for (let y = 2; y < 4; y++) for (let x = 0; x < 4; x++) P(g, x, y, col(hair, 0.9)); }),
    face(8, 8, s + 3, (g, r) => fillN(g, 8, 8, hair, r, 0.18)),
    face(8, 8, s + 4, (g, r) => fillN(g, 8, 8, skin, r, 0.1)),
    face(8, 8, s + 5, (g, r) => {
      fillN(g, 8, 8, skin, r, 0.08);
      for (let x = 0; x < 8; x++) { P(g, x, 0, col(hair, 1)); P(g, x, 1, col(hair, 0.92)); }
      P(g, 0, 2, col(hair, 0.9)); P(g, 7, 2, col(hair, 0.9));
      P(g, 1, 4, '#ffffff'); P(g, 2, 4, col(eye, 1)); P(g, 5, 4, col(eye, 1)); P(g, 6, 4, '#ffffff');
      P(g, 3, 5, col(skin, 0.75)); P(g, 4, 5, col(skin, 0.75));
      for (let x = 2; x < 6; x++) P(g, x, 6, col(hair, 1.15)); P(g, 2, 7, col(hair, 1.2)); P(g, 5, 7, col(hair, 1.2));
    }),
    face(8, 8, s + 6, (g, r) => { fillN(g, 8, 8, hair, r, 0.16); for (let x = 0; x < 8; x++) P(g, x, 7, col(hair, 0.8)); })
  ];
  const torso = (front) => face(8, 12, s + (front ? 7 : 8), (g, r) => {
    fillN(g, 8, 12, shirt, r, 0.14);
    if (front) { P(g, 3, 0, col(skin, 1)); P(g, 4, 0, col(skin, 1)); P(g, 3, 1, col(skin, 0.9)); P(g, 4, 1, col(skin, 0.9)); }
    for (let x = 0; x < 8; x++) P(g, x, 11, col(shirt, 0.75));
  });
  const body = [face(4, 12, s + 9, (g, r) => fillN(g, 4, 12, shirt, r, 0.14)), face(4, 12, s + 10, (g, r) => fillN(g, 4, 12, shirt, r, 0.14)),
    face(8, 4, s + 11, (g, r) => fillN(g, 8, 4, shirt, r, 0.12)), face(8, 4, s + 12, (g, r) => fillN(g, 8, 4, pants, r, 0.12)), torso(true), torso(false)];
  const armFace = (w, sd) => face(w, 12, sd, (g, r) => { fillN(g, w, 12, skin, r, 0.1); for (let y = 0; y < 4; y++) for (let x = 0; x < w; x++) P(g, x, y, col(shirt, 0.9 + r() * 0.15)); });
  const arm = [armFace(4, s + 13), armFace(4, s + 14), face(4, 4, s + 15, (g, r) => fillN(g, 4, 4, shirt, r, 0.12)), face(4, 4, s + 16, (g, r) => fillN(g, 4, 4, skin, r, 0.1)), armFace(4, s + 17), armFace(4, s + 18)];
  const legFace = (sd) => face(4, 12, sd, (g, r) => { fillN(g, 4, 12, pants, r, 0.14); for (let y = 9; y < 12; y++) for (let x = 0; x < 4; x++) P(g, x, y, col(shoe, 0.9 + r() * 0.2)); });
  const leg = [legFace(s + 19), legFace(s + 20), face(4, 4, s + 21, (g, r) => fillN(g, 4, 4, pants, r, 0.12)), face(4, 4, s + 22, (g, r) => fillN(g, 4, 4, shoe, r, 0.15)), legFace(s + 23), legFace(s + 24)];
  return { head, body, arm, leg };
};

// armure diamant (pixels transparents = découpes)
TX.armor = function () {
  const d = rgb('#4fe3d6'), dk = rgb('#1f8f88'), lt = rgb('#b8fff6');
  const plate = (w, h, sd, holes) => face(w, h, sd, (g, r) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (holes && holes(x, y, w, h)) continue;
      const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
      P(g, x, y, edge ? col(dk, 1) : col(r() < 0.12 ? lt : d, 0.9 + r() * 0.15));
    }
  });
  const faceHole = (x, y) => y >= 3 && x >= 1 && x <= 6;
  const sideHole = (x, y) => y >= 5;
  return {
    head: [plate(8, 8, 1, sideHole), plate(8, 8, 2, sideHole), plate(8, 8, 3), plate(8, 8, 4, () => true), plate(8, 8, 5, faceHole), plate(8, 8, 6, (x, y) => y >= 6)],
    body: [plate(4, 12, 7, (x, y) => y > 8), plate(4, 12, 8, (x, y) => y > 8), plate(8, 4, 9), plate(8, 4, 10, () => true), plate(8, 12, 11, (x, y) => y > 9 || (y < 2 && x > 2 && x < 5)), plate(8, 12, 12, (x, y) => y > 9)],
    arm: [plate(4, 12, 13, (x, y) => y > 4), plate(4, 12, 14, (x, y) => y > 4), plate(4, 4, 15), plate(4, 4, 16, () => true), plate(4, 12, 17, (x, y) => y > 4), plate(4, 12, 18, (x, y) => y > 4)],
    leg: [plate(4, 12, 19, (x, y) => y > 5 && y < 9), plate(4, 12, 20, (x, y) => y > 5 && y < 9), plate(4, 4, 21, () => true), plate(4, 4, 22), plate(4, 12, 23, (x, y) => y > 5 && y < 9), plate(4, 12, 24, (x, y) => y > 5 && y < 9)]
  };
};

// ================================================================ pixel-art d'objets (16×16)
const PAL = {
  k: '#0f2724', a: '#33ebcb', w: '#c8fff4', b: '#1b9e8c', g: '#0d4f48', h: '#6b4a22', H: '#3b2810',
  y: '#e8c548', d: '#a8801f', e: '#3fbf5f', p: '#ff6fd8', P: '#ffe0fb', c: '#9c6bd6', o: '#1e1430', v: '#3b2560', B: '#5a3a8a',
  r: '#f2c230', s: '#6b4a1e', l: '#5cba3c', L: '#fff3a0', t: '#1f6e62', q: '#2fb39c', Q: '#a8f5e4',
  u: '#7a5230', i: '#9bd0d8', j: '#58d858', J: '#d0ffd0', x: '#c98d2a', z: '#ffd75e', Z: '#fff7c0', f: '#e9e9e9', n: '#8a8a8a', m: '#555555'
};
TX.PAL = PAL;
const ART = {
  sword: [
    '..............kk', '.............kwk', '............kwak', '...........kwabk', '..........kwabk.', '.........kwabk..', '........kwabk...', '...kk..kwabk....',
    '...kgkkwabk.....', '....kgabk.......', '.....kgk........', '....khkgk.......', '...khk.kk.......', '..khk...........', '.kHk............', '.kk.............'],
  totem: ['................', '.....dyyyyd.....', '....dyyyyyyd....', '....yyeyyeyy....', '....yyyyyyyy....', '.....yydyyy.....', '..dyyyyyyyyyyd..', '.dyyyyyyyyyyyyd.',
    '.d..yyyyyyyy..d.', '....yyddddyy....', '....yyyyyyyy....', '.....yyyyyy.....', '.....yy..yy.....', '.....yd..dy.....', '.....dd..dd.....', '................'],
  crystal: ['................', '.......cc.......', '......cPPc......', '.....cPppPc.....', '....cPppppPc....', '...cPpPPPPpPc...', '..cPpPppppPpPc..', '.cPpPppPPppPpPc.',
    '.cPpPppPPppPpPc.', '..cPpPppppPpPc..', '...cPpPPPPpPc...', '....cPppppPc....', '.....cPppPc.....', '......cPPc......', '.......cc.......', '................'],
  gapple: ['................', '.......sl.......', '......s.ll......', '......s.........', '...rrrrrrrrrr...', '..rLrrrrrrrrrr..', '.rLLrrrrrrrrrrr.', '.rLrrrrrrrrrrrr.',
    '.rrrrrrrrrrrrrr.', '.rrrrrrrrrrrrxr.', '.rrrrrrrrrrrrxr.', '..rrrrrrrrrrxr..', '..rrrrrrrrrxxr..', '...rrrr..rrrr...', '....rr....rr....', '................'],
  pearl: ['................', '.....tttttt.....', '....tqqqqqqt....', '...tqQQqqqqqt...', '..tqQQqqqqqqqt..', '..tqQqqqqqqqqt..', '..tqqqqqqqqqqt..', '..tqqqqttqqqqt..',
    '..tqqqqttqqqqt..', '..tqqqqqqqqqqt..', '..tqqqqqqqqqqt..', '...tqqqqqqqqt...', '....tqqqqqqt....', '.....tttttt.....', '................', '................'],
  xp: ['......uuuu......', '......uuuu......', '.......ii.......', '.......ii.......', '......iiii......', '.....ijjjji.....', '....ijjjjjji....', '...ijJJjjjjji...',
    '...ijJjjjjjji...', '...ijjjjjjjji...', '...ijjjjjjjji...', '...ijjjjjjjji...', '....ijjjjjji.....'.slice(0, 16), '.....iiiiii.....', '................', '................']
};
function artCanvas(rows, scale) {
  const [c, g] = cnv(16 * scale, 16 * scale);
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.' && PAL[ch]) { g.fillStyle = PAL[ch]; g.fillRect(x * scale, y * scale, scale, scale); } }));
  return c;
}
TX.ART = ART;
// arc et flèche dessinés par calcul
function bowCanvas() {
  const [c, g] = cnv(16, 16);
  for (let a = -10; a <= 100; a += 2) {
    const t = a * FP.DEG, x = 2 + Math.cos(t) * 12, y = 14 - Math.sin(t) * 12;
    P(g, Math.round(x), Math.round(y), a % 20 < 10 ? '#7a5230' : '#5a3a1e');
    P(g, Math.round(x - 0.7), Math.round(y + 0.7), '#3b2810');
  }
  for (let i = 0; i < 12; i++) P(g, 2 + i, 2 + i, 'rgba(230,230,230,0.9)');
  return c;
}
function arrowCanvas() {
  const [c, g] = cnv(16, 16);
  for (let i = 0; i < 10; i++) P(g, 3 + i, 12 - i, '#7a5230');
  ['#d8d8d8', '#bfbfbf'].forEach((cc, j) => { P(g, 12 + j, 2, cc); P(g, 13, 1 + j, cc); P(g, 11 + j, 3 - j, cc); });
  P(g, 13, 3, '#8a8a8a'); P(g, 12, 3, '#8a8a8a');
  [[2, 12], [3, 13], [2, 13], [1, 14], [4, 13], [2, 11]].forEach(([x, y]) => P(g, x, y, '#f0f0f0'));
  return c;
}
// arbalète (en diagonale comme dans l'inventaire), chargée ou non
function crossbowCanvas(loaded) {
  const [c, g] = cnv(16, 16), S2 = Math.SQRT1_2, C = [10.5, 4.5];
  const at = (s, b) => [C[0] + s * S2 - b * S2, C[1] + s * S2 + b * S2]; // s : le long des branches, b : vers la crosse
  if (loaded) for (let i = -2; i <= 6; i++) { const [x, y] = at(0, i); P(g, Math.round(x - 0.5), Math.round(y - 1.2), i < 0 ? '#c8c8c8' : '#a07a48'); }
  for (let i = -1; i <= 11; i++) { const [x, y] = at(0, i); P(g, Math.round(x), Math.round(y), i > 8 ? '#4a3018' : '#7a5230'); P(g, Math.round(x + 0.7), Math.round(y + 0.7), '#3b2810'); }
  const nock = loaded ? 5 : 36 * 0.07;
  for (let s = -6; s <= 6; s++) { const [x, y] = at(s, s * s * 0.07); P(g, Math.round(x), Math.round(y), Math.abs(s) < 2 ? '#9a9a9a' : '#6b4a1e'); }
  for (const s of [-6, 6]) for (let k = 0; k <= 10; k++) { const t = k / 10, b0 = 36 * 0.07, [x, y] = at(s * (1 - t), b0 + (nock - b0) * t); P(g, Math.round(x), Math.round(y), 'rgba(230,230,230,0.9)'); }
  return c;
}
// icône isométrique d'un bloc, façon inventaire Minecraft
function isoBlock(top, side) {
  const [c, g] = cnv(32, 32);
  const tTop = BLOCKS[top], tSide = BLOCKS[side || top];
  g.setTransform(15 / 16, 7 / 16, -15 / 16, 7 / 16, 16, 1); g.drawImage(tTop, 0, 0);
  g.setTransform(15 / 16, 7 / 16, 0, 1, 1, 8); g.drawImage(tSide, 0, 0); g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, 0, 16, 16);
  g.setTransform(15 / 16, -7 / 16, 0, 1, 16, 15); g.drawImage(tSide, 0, 0); g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, 0, 16, 16);
  g.setTransform(1, 0, 0, 1, 0, 0);
  return c;
}
const ICONS = {};
TX.icon = function (name) {
  if (ICONS[name]) return ICONS[name];
  let c;
  if (ART[name]) c = artCanvas(ART[name], 2);
  else if (name === 'bow') { c = cnv(32, 32)[0]; c.getContext('2d').imageSmoothingEnabled = false; c.getContext('2d').drawImage(bowCanvas(), 0, 0, 32, 32); }
  else if (name === 'crossbow' || name === 'crossbow_loaded') { c = cnv(32, 32)[0]; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(crossbowCanvas(name === 'crossbow_loaded'), 0, 0, 32, 32); }
  else if (name === 'arrow') { c = cnv(32, 32)[0]; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(arrowCanvas(), 0, 0, 32, 32); }
  else if (name === 'obsidian') c = isoBlock('obsidian');
  else if (name === 'glow') c = isoBlock('glowstone');
  else if (name.startsWith('wool')) c = isoBlock(name);
  else if (name === 'grass') c = isoBlock('grass_top', 'grass_side');
  else if (name === 'bricks') c = isoBlock('stone_bricks');
  else if (BLOCKS[name]) c = isoBlock(name);
  else c = artCanvas(ART.sword, 2);
  return (ICONS[name] = c.toDataURL());
};
TX.artRows = name => ART[name];
TX.bowCanvas = bowCanvas;

// ================================================================ particules (blanches → teintées par la couleur du sprite)
const PART = {};
function part(name, draw) { const [c, g] = cnv(8, 8); draw(g); PART[name] = c; }
part('crit', g => { g.fillStyle = '#fff'; [[3, 0], [4, 0], [3, 1], [4, 1], [3, 6], [4, 6], [3, 7], [4, 7], [0, 3], [0, 4], [1, 3], [1, 4], [6, 3], [6, 4], [7, 3], [7, 4], [2, 2], [5, 2], [2, 5], [5, 5]].forEach(([x, y]) => g.fillRect(x, y, 1, 1)); g.fillRect(3, 3, 2, 2); });
part('square', g => { g.fillStyle = '#fff'; g.fillRect(1, 1, 6, 6); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(4, 4, 3, 3); });
part('smoke', g => { g.fillStyle = '#fff'; g.fillRect(2, 0, 4, 8); g.fillRect(0, 2, 8, 4); g.fillRect(1, 1, 6, 6); g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(4, 4, 3, 3); g.fillRect(1, 5, 2, 2); });
part('heart', g => { g.fillStyle = '#fff'; [[1, 1], [2, 1], [5, 1], [6, 1]].forEach(([x, y]) => g.fillRect(x, y, 1, 1)); g.fillRect(0, 2, 8, 2); g.fillRect(1, 4, 6, 1); g.fillRect(2, 5, 4, 1); g.fillRect(3, 6, 2, 1); });
part('glow', g => { const gr = g.createRadialGradient(4, 4, 0, 4, 4, 4); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 8, 8); });
part('sweep', g => { g.fillStyle = '#fff'; for (let x = 0; x < 8; x++) { const y = Math.round(5 - Math.sin(x / 7 * Math.PI) * 4); g.fillRect(x, y, 1, 2); } });
TX.PART = PART;

// ================================================================ icônes HUD (cœurs, armure)
function hud(draw) { const [c, g] = cnv(9, 9); draw(g); return c.toDataURL(); }
const HEART = ['.kk...kk.', 'kffk.kffk', 'kfffkfffk', 'kfffffffk', 'kfffffffk', '.kfffffk.', '..kfffk..', '...kfk...', '....k....'];
function heartArt(fill, half) {
  return hud(g => HEART.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    if (ch === 'k') { g.fillStyle = '#1a0606'; g.fillRect(x, y, 1, 1); return; }
    const on = fill && (!half || x < 5);
    g.fillStyle = on ? (y === 1 || (y === 2 && x < 4) ? '#ff9a9a' : '#e5251f') : '#3a0c0c'; g.fillRect(x, y, 1, 1);
  })));
}
TX.HUD = { heart: heartArt(true), half: heartArt(true, true), empty: heartArt(false),
  armor: hud(g => { const A = ['.kkk.kkk.', 'kaaakaaak', 'kaaaaaaak', 'kaaaaaaak', '.kaaaaak.', '.kaaaaak.', '.kaaaaak.', '.kkkkkkk.']; A.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '.') return; g.fillStyle = ch === 'k' ? '#1b2b2a' : (y < 3 ? '#e8e8e8' : '#c6c6c6'); g.fillRect(x, y, 1, 1); })); }) };
})();
