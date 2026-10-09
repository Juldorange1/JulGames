'use strict';
/* Forge PvP — artisanat à l'établi : fabrique le plus vite possible l'objet demandé.
   Interface et règles d'inventaire de Minecraft : clic gauche (prendre / poser tout / échanger), clic droit (prendre
   la moitié / poser un), glisser clic gauche (répartir) ou clic droit (un par case), maj + clic (envoyer ailleurs,
   fabriquer en série depuis le résultat), double-clic (tout rassembler), touches 1–9 (échanger avec la barre).
   Vraies recettes (formes, symétrie gauche-droite, quantités produites). */
(function () {
const FP = window.FP, TX = FP.TX, $ = FP.$;
const clamp = FP.clamp;

// ================================================================ textures des blocs propres à ce mode
function blk(name, seed, draw) { if (TX.BLOCKS[name]) return; const [c, g] = TX.cnv(16, 16), r = FP.rng(seed); draw(g, r); TX.BLOCKS[name] = c; }
const px = (g, x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
function initTex() {
  blk('cobblestone', 41, (g, r) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) px(g, x, y, TX.col([120, 120, 120], 0.75 + r() * 0.4)); for (let i = 0; i < 14; i++) { const x = r() * 15 | 0, y = r() * 15 | 0; px(g, x, y, '#4a4a4a'); px(g, x + 1, y, '#5a5a5a'); } });
  blk('ct_top', 42, (g, r) => { g.drawImage(TX.BLOCKS.planks, 0, 0); g.fillStyle = '#6b4a22'; g.fillRect(1, 1, 14, 1); g.fillRect(1, 14, 14, 1); g.fillRect(1, 1, 1, 14); g.fillRect(14, 1, 1, 14); g.fillRect(5, 1, 1, 14); g.fillRect(10, 1, 1, 14); g.fillRect(1, 5, 14, 1); g.fillRect(1, 10, 14, 1); });
  blk('ct_side', 43, (g, r) => { g.drawImage(TX.BLOCKS.planks, 0, 0); g.fillStyle = '#8a8a8a'; g.fillRect(3, 3, 3, 1); g.fillRect(4, 4, 1, 4); g.fillStyle = '#6b4a22'; g.fillRect(10, 3, 1, 6); g.fillRect(9, 3, 3, 1); g.fillStyle = '#5e4421'; g.fillRect(0, 0, 16, 2); });
  blk('furnace_top', 44, (g, r) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) px(g, x, y, TX.col([130, 130, 130], 0.85 + r() * 0.2)); });
  blk('furnace_front', 45, (g, r) => { g.drawImage(TX.BLOCKS.furnace_top, 0, 0); g.fillStyle = '#2a2a2a'; g.fillRect(4, 8, 8, 6); g.fillStyle = '#555'; g.fillRect(3, 3, 10, 2); g.fillRect(3, 7, 10, 1); });
  blk('chest_top', 46, (g, r) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) px(g, x, y, TX.col([172, 120, 52], 0.85 + r() * 0.2)); g.fillStyle = '#3b2810'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 15, 16, 1); g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16); });
  blk('chest_front', 47, (g, r) => { g.drawImage(TX.BLOCKS.chest_top, 0, 0); g.fillStyle = '#3b2810'; g.fillRect(0, 5, 16, 1); g.fillStyle = '#c8c8c8'; g.fillRect(7, 4, 2, 4); g.fillStyle = '#5a5a5a'; g.fillRect(7, 7, 2, 1); });
  blk('tnt_side', 48, (g, r) => { g.fillStyle = '#db2b1c'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#9e1a10'; for (let x = 0; x < 16; x += 4) g.fillRect(x, 0, 1, 16); g.fillStyle = '#eeeeee'; g.fillRect(0, 5, 16, 6); g.fillStyle = '#222'; [[2, 7], [3, 7], [4, 7], [3, 8], [3, 9], [6, 7], [6, 8], [6, 9], [7, 8], [8, 7], [8, 8], [8, 9], [10, 7], [11, 7], [12, 7], [11, 8], [11, 9]].forEach(([x, y]) => g.fillRect(x, y, 1, 1)); });
  blk('tnt_top', 49, (g, r) => { g.fillStyle = '#c0281a'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#e8e8e8'; g.fillRect(4, 4, 8, 8); g.fillStyle = '#555'; g.fillRect(7, 7, 2, 2); });
  blk('iron_block', 50, (g, r) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) px(g, x, y, TX.col([220, 220, 220], 0.9 + r() * 0.12)); g.fillStyle = '#9a9a9a'; g.fillRect(0, 15, 16, 1); g.fillRect(15, 0, 1, 16); });
  blk('diamond_block', 51, (g, r) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) px(g, x, y, TX.col([98, 230, 220], 0.88 + r() * 0.14)); g.fillStyle = '#d8fffa'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 0, 1, 16); });
  blk('bookshelf', 52, (g, r) => { g.drawImage(TX.BLOCKS.planks, 0, 0); });
}
initTex(); // textures disponibles aussi pour le monde 3D (roche, établi, four…)
function iso(top, left, right) {
  const [c, g] = TX.cnv(32, 32), B = TX.BLOCKS;
  g.setTransform(15 / 16, 7 / 16, -15 / 16, 7 / 16, 16, 1); g.drawImage(B[top], 0, 0);
  g.setTransform(15 / 16, 7 / 16, 0, 1, 1, 8); g.drawImage(B[left || top], 0, 0); g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, 0, 16, 16);
  g.setTransform(15 / 16, -7 / 16, 0, 1, 16, 15); g.drawImage(B[right || left || top], 0, 0); g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, 0, 16, 16);
  g.setTransform(1, 0, 0, 1, 0, 0);
  return c.toDataURL();
}
// ================================================================ dessins des objets (16×16, agrandis ×2)
function draw(fn) { const [c, g] = TX.cnv(16, 16); fn(g); const [c2, g2] = TX.cnv(32, 32); g2.imageSmoothingEnabled = false; g2.drawImage(c, 0, 0, 32, 32); return c2.toDataURL(); }
const MAT = { wood: ['#a8884e', '#8a6a3c', '#5e4421'], stone: ['#b0b0b0', '#8a8a8a', '#555555'], iron: ['#ffffff', '#d8d8d8', '#8a8a8a'], gold: ['#fff3a0', '#f5d23c', '#b8891c'], diamond: ['#c8fff4', '#33ebcb', '#1b9e8c'] };
function stick(g, len) { for (let i = 0; i < len; i++) { px(g, 2 + i, 13 - i, i % 2 ? '#6b4a22' : '#8a5d2e'); px(g, 2 + i, 14 - i, '#3b2810'); } }
function tool(kind, m) {
  const [L, M, D] = MAT[m];
  return draw(g => {
    if (kind === 'sword') {
      for (let i = 0; i < 9; i++) { px(g, 5 + i, 10 - i, M); px(g, 6 + i, 10 - i, L); px(g, 5 + i, 11 - i, D); }
      px(g, 14, 1, D); [[3, 9], [4, 10], [5, 11], [6, 12], [7, 13]].forEach(([x, y]) => px(g, x, y, '#3b2810'));
      [[3, 13], [4, 12], [2, 14]].forEach(([x, y]) => px(g, x, y, '#6b4a22'));
      return;
    }
    stick(g, kind === 'shovel' ? 9 : 9);
    if (kind === 'pickaxe') { for (let x = 5; x <= 12; x++) { px(g, x, 2, M); px(g, x, 1, x > 5 && x < 12 ? L : D); px(g, x, 3, D); } for (let y = 2; y <= 10; y++) { px(g, 12, y, M); px(g, 13, y, y > 2 && y < 10 ? L : D); px(g, 11, y, y > 3 ? D : M); } px(g, 4, 3, D); px(g, 12, 11, D); }
    else if (kind === 'axe') { for (let y = 2; y <= 7; y++) for (let x = 8; x <= 12; x++) if (!(x === 12 && (y === 2 || y === 7)) && !(x === 8 && y > 5)) px(g, x, y, x === 8 || y === 7 ? D : x === 12 ? L : M); }
    else if (kind === 'shovel') { [[11, 2], [12, 2], [10, 3], [11, 3], [12, 3], [13, 3], [10, 4], [11, 4], [12, 4], [13, 4], [11, 5], [12, 5]].forEach(([x, y]) => px(g, x, y, M)); px(g, 12, 2, L); px(g, 13, 3, L); px(g, 10, 5, D); px(g, 11, 6, D); }
    else if (kind === 'hoe') { for (let x = 8; x <= 12; x++) { px(g, x, 3, M); px(g, x, 4, D); } px(g, 12, 2, L); px(g, 11, 2, L); }
  });
}
const ingot = (L, M, D) => draw(g => { for (let y = 6; y <= 10; y++) for (let x = 3 + (10 - y); x <= 11 + (10 - y) - 2; x++) px(g, x, y, y === 6 ? L : y === 10 ? D : M); px(g, 13, 6, D); px(g, 12, 7, D); });
const ICONS = {
  log: () => iso('log_top', 'log_side'), planks: () => iso('planks'), cobblestone: () => iso('cobblestone'), stone: () => iso('stone'), sand: () => iso('sand'),
  wool: () => iso('wool_white'), crafting_table: () => iso('ct_top', 'ct_side', 'ct_side'), furnace: () => iso('furnace_top', 'furnace_front', 'furnace_top'),
  chest: () => iso('chest_top', 'chest_front', 'chest_top'), tnt: () => iso('tnt_top', 'tnt_side'), iron_block: () => iso('iron_block'), gold_block: () => iso('gold'),
  diamond_block: () => iso('diamond_block'), stone_bricks: () => iso('stone_bricks'),
  stick: () => draw(g => { for (let i = 0; i < 10; i++) { px(g, 3 + i, 12 - i, i % 2 ? '#6b4a22' : '#8a5d2e'); px(g, 3 + i, 13 - i, '#3b2810'); } }),
  coal: () => draw(g => { [[5, 5], [6, 4], [7, 4], [8, 4], [9, 5], [10, 6], [10, 7], [10, 8], [9, 9], [8, 10], [7, 10], [6, 10], [5, 9], [4, 8], [4, 7], [4, 6]].forEach(([x, y]) => px(g, x, y, '#1a1a1a')); for (let y = 5; y <= 9; y++) for (let x = 5; x <= 9; x++) px(g, x, y, (x + y) % 3 ? '#2e2e2e' : '#4a4a4a'); px(g, 6, 5, '#6a6a6a'); }),
  iron_ingot: () => ingot('#ffffff', '#d8d8d8', '#8a8a8a'), gold_ingot: () => ingot('#fffbd0', '#f5d23c', '#b8891c'),
  diamond: () => draw(g => { const pts = []; for (let y = 3; y <= 12; y++) { const w = y <= 6 ? (y - 3) * 2 + 2 : (12 - y) + 1; for (let x = 8 - w; x <= 7 + w; x++) pts.push([x, y]); } pts.forEach(([x, y]) => px(g, x, y, y < 6 ? '#c8fff4' : (x + y) % 4 ? '#33ebcb' : '#1b9e8c')); }),
  string: () => draw(g => { for (let i = 0; i < 12; i++) px(g, 2 + i, Math.round(8 + Math.sin(i * 0.9) * 3), '#f0f0f0'); }),
  feather: () => draw(g => { for (let i = 0; i < 11; i++) { px(g, 3 + i, 13 - i, '#c8c8c8'); if (i > 2) { px(g, 3 + i, 12 - i, '#ffffff'); px(g, 4 + i, 13 - i, '#e8e8e8'); } } }),
  flint: () => draw(g => { [[7, 3], [8, 4], [6, 4], [9, 5], [5, 6], [6, 5], [7, 5], [8, 5], [5, 7], [6, 7], [7, 7], [8, 7], [9, 7], [6, 8], [7, 8], [8, 8], [9, 8], [6, 9], [7, 9], [8, 9], [7, 10], [7, 6], [8, 6], [6, 6], [9, 6]].forEach(([x, y]) => px(g, x, y, (x + y) % 3 ? '#3a3a3a' : '#5a5a5a')); }),
  gunpowder: () => draw(g => { const r = FP.rng(3); for (let i = 0; i < 40; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * 5; px(g, Math.round(8 + Math.cos(a) * d), Math.round(9 + Math.sin(a) * d * 0.7), r() < 0.5 ? '#5a5a5a' : '#808080'); } }),
  wheat: () => draw(g => { for (const s of [5, 8, 11]) { for (let y = 6; y < 15; y++) px(g, s, y, '#9a7a2a'); for (let y = 2; y < 8; y++) { px(g, s - 1, y, '#e8c548'); px(g, s + 1, y, '#d8b030'); } } }),
  apple: () => draw(g => { for (let y = 5; y <= 13; y++) for (let x = 3; x <= 12; x++) if ((x - 7.5) ** 2 / 22 + (y - 9) ** 2 / 18 <= 1) px(g, x, y, x < 6 && y < 8 ? '#ff6a5a' : '#d41f1f'); px(g, 8, 3, '#5a3a1c'); px(g, 8, 4, '#5a3a1c'); px(g, 9, 3, '#3fbf5f'); px(g, 10, 2, '#3fbf5f'); }),
  golden_apple: () => draw(g => { for (let y = 5; y <= 13; y++) for (let x = 3; x <= 12; x++) if ((x - 7.5) ** 2 / 22 + (y - 9) ** 2 / 18 <= 1) px(g, x, y, x < 6 && y < 8 ? '#fff3a0' : '#f5c522'); px(g, 8, 3, '#5a3a1c'); px(g, 8, 4, '#5a3a1c'); px(g, 9, 3, '#3fbf5f'); }),
  bread: () => draw(g => { for (let y = 7; y <= 11; y++) for (let x = 2; x <= 13; x++) if ((x - 7.5) ** 2 / 36 + (y - 9) ** 2 / 5 <= 1) px(g, x, y, y < 9 ? '#c98d2a' : '#9a6418'); for (const x of [5, 8, 11]) px(g, x, 8, '#e8b860'); }),
  torch: () => draw(g => { for (let y = 6; y < 15; y++) { px(g, 7, y, '#8a5d2e'); px(g, 8, y, '#5a3a1c'); } px(g, 7, 4, '#ffe14d'); px(g, 8, 4, '#ffb52e'); px(g, 7, 5, '#ffcf3e'); px(g, 8, 5, '#ff9a1e'); px(g, 7, 3, '#fff3a0'); }),
  ladder: () => draw(g => { for (let y = 1; y < 15; y++) { px(g, 3, y, '#8a5d2e'); px(g, 12, y, '#8a5d2e'); } for (const y of [3, 7, 11]) for (let x = 4; x < 12; x++) px(g, x, y, '#a8884e'); }),
  bucket: () => draw(g => { for (let y = 4; y <= 13; y++) { const w = 6 - Math.floor((y - 4) / 3); for (let x = 8 - w; x <= 7 + w; x++) px(g, x, y, y === 4 ? '#5a5a5a' : x === 8 - w || x === 7 + w ? '#8a8a8a' : '#c8c8c8'); } for (let x = 3; x <= 12; x++) px(g, x, 5, '#3a3a3a'); }),
  shears: () => draw(g => { for (let i = 0; i < 7; i++) { px(g, 4 + i, 4 + i, '#d8d8d8'); px(g, 11 - i, 4 + i, '#c0c0c0'); } [[3, 12], [4, 13], [12, 12], [11, 13], [3, 13], [12, 13]].forEach(([x, y]) => px(g, x, y, '#b8322a')); }),
  boat: () => draw(g => { for (let x = 1; x <= 14; x++) { px(g, x, 8, '#a8884e'); px(g, x, 11, '#5e4421'); } for (let y = 9; y <= 10; y++) for (let x = 2; x <= 13; x++) px(g, x, y, '#8a6a3c'); px(g, 1, 7, '#a8884e'); px(g, 14, 7, '#a8884e'); for (let x = 3; x <= 12; x++) px(g, x, 12, '#5e4421'); }),
  bed: () => draw(g => { for (let y = 7; y <= 10; y++) for (let x = 1; x <= 14; x++) px(g, x, y, x < 5 ? '#f0f0f0' : '#e2e2e2'); for (let x = 1; x <= 14; x++) px(g, x, 11, '#a8884e'); [[1, 12], [2, 12], [13, 12], [14, 12]].forEach(([x, y]) => px(g, x, y, '#5e4421')); }),
  fishing_rod: () => draw(g => { for (let i = 0; i < 12; i++) { px(g, 2 + i, 14 - i, i % 2 ? '#6b4a22' : '#8a5d2e'); } for (let y = 3; y < 13; y++) px(g, 13, y, '#e0e0e0'); px(g, 13, 13, '#8a8a8a'); }),
  shield: () => draw(g => { for (let y = 2; y <= 13; y++) for (let x = 3; x <= 12; x++) if (y < 10 || Math.abs(x - 7.5) < 13 - y) px(g, x, y, x === 3 || x === 12 || y === 2 ? '#8a8a8a' : (x + y) % 5 ? '#8a6a3c' : '#6b4a22'); }),
  oak_door: () => draw(g => { for (let y = 1; y <= 14; y++) for (let x = 4; x <= 11; x++) px(g, x, y, x === 4 || x === 11 || y === 1 || y === 14 ? '#5e4421' : '#a8884e'); for (let y = 3; y <= 5; y++) for (let x = 6; x <= 9; x++) px(g, x, y, '#3b2810'); px(g, 10, 8, '#3b2810'); }),
  oak_fence: () => draw(g => { for (let y = 2; y <= 14; y++) { px(g, 3, y, '#a8884e'); px(g, 12, y, '#a8884e'); } for (const y of [5, 9]) for (let x = 4; x < 12; x++) px(g, x, y, '#8a6a3c'); }),
  oak_slab: () => draw(g => { for (let y = 8; y <= 13; y++) for (let x = 2; x <= 13; x++) px(g, x, y, y === 8 ? '#c8a868' : y === 13 ? '#5e4421' : '#a8884e'); }),
  oak_stairs: () => draw(g => { for (let y = 2; y <= 13; y++) for (let x = 2; x <= 13; x++) if (y >= 8 || x <= 7) px(g, x, y, (y === 2 || (y === 8 && x > 7)) ? '#c8a868' : '#a8884e'); }),
  bow: () => TX.icon('bow'), arrow: () => TX.icon('arrow'),
  water_bucket: () => draw(g => { for (let y = 4; y <= 13; y++) { const w = 6 - Math.floor((y - 4) / 3); for (let x = 8 - w; x <= 7 + w; x++) px(g, x, y, y === 4 ? '#5a5a5a' : x === 8 - w || x === 7 + w ? '#8a8a8a' : '#c8c8c8'); } for (let x = 3; x <= 12; x++) { px(g, x, 5, '#2f5fd8'); px(g, x, 6, '#3f74ea'); } }),
  wind_charge: () => draw(g => { for (let a = 0; a < 6.28 * 2.2; a += 0.12) { const r = 1 + a * 0.45; px(g, Math.round(8 + Math.cos(a) * r), Math.round(8 + Math.sin(a) * r), a < 7 ? '#e8f8ff' : '#a8dcff'); } px(g, 8, 8, '#ffffff'); }),
  mace: () => draw(g => { for (let i = 0; i < 8; i++) { px(g, 3 + i, 13 - i, '#6b4a22'); px(g, 3 + i, 14 - i, '#3b2810'); } for (let y = 1; y <= 6; y++) for (let x = 9; x <= 14; x++) if ((x - 11.5) ** 2 + (y - 3.5) ** 2 < 8) px(g, x, y, (x + y) % 3 ? '#4a4a52' : '#7a7a86'); px(g, 11, 0, '#9a9aa8'); px(g, 15, 3, '#9a9aa8'); px(g, 8, 4, '#9a9aa8'); }),
  cobweb: () => draw(g => { const c = '#f0f0f0'; for (let i = 1; i < 15; i++) { px(g, i, i, c); px(g, 15 - i, i, c); px(g, 7, i, c); px(g, i, 8, c); } for (const rr of [3, 6]) for (let a = 0; a < 6.28; a += 0.3) px(g, Math.round(7.5 + Math.cos(a) * rr), Math.round(7.5 + Math.sin(a) * rr), c); }),
  slime: () => iso('slime'), hay: () => iso('hay_top', 'hay_side'), scaffolding: () => iso('scaffolding'),
  flint_and_steel: () => draw(g => { for (let y = 3; y <= 9; y++) for (let x = 3; x <= 8; x++) if ((x - 5.5) ** 2 + (y - 6) ** 2 < 9) px(g, x, y, (x + y) % 3 ? '#3a3a3a' : '#5a5a5a'); for (let i = 0; i < 6; i++) { px(g, 8 + i, 9 + Math.round(i * 0.5), '#c8c8c8'); px(g, 8 + i, 10 + Math.round(i * 0.5), '#8a8a8a'); } px(g, 9, 8, '#ffcf3e'); px(g, 10, 7, '#ff9a1e'); }),
  tnt_item: () => iso('tnt_top', 'tnt_side')
};
for (const m of ['wood', 'stone', 'iron', 'gold', 'diamond']) for (const k of ['pickaxe', 'axe', 'shovel', 'sword', 'hoe']) ICONS[m + '_' + k] = () => tool(k, m);
const iconCache = {};
const icon = id => iconCache[id] || (iconCache[id] = ICONS[id] ? ICONS[id]() : TX.icon('sword'));

// ================================================================ objets et recettes (Minecraft)
const NOMS = { log: 'Bûche de chêne', planks: 'Planches de chêne', stick: 'Bâton', cobblestone: 'Roche', stone: 'Pierre', sand: 'Sable', wool: 'Laine blanche', coal: 'Charbon',
  iron_ingot: 'Lingot de fer', gold_ingot: 'Lingot d’or', diamond: 'Diamant', string: 'Ficelle', feather: 'Plume', flint: 'Silex', gunpowder: 'Poudre à canon', wheat: 'Blé', apple: 'Pomme',
  crafting_table: 'Établi', furnace: 'Four', chest: 'Coffre', torch: 'Torche', ladder: 'Échelle', bow: 'Arc', arrow: 'Flèche', bucket: 'Seau', shears: 'Cisailles', boat: 'Bateau en chêne',
  bed: 'Lit blanc', fishing_rod: 'Canne à pêche', bread: 'Pain', golden_apple: 'Pomme dorée', tnt: 'TNT', iron_block: 'Bloc de fer', gold_block: 'Bloc d’or', diamond_block: 'Bloc de diamant',
  shield: 'Bouclier', stone_bricks: 'Pierres taillées', oak_slab: 'Dalle de chêne', oak_stairs: 'Escalier en chêne', oak_door: 'Porte en chêne', oak_fence: 'Barrière en chêne' };
const MATN = { wood: ['bois', 'planks'], stone: ['pierre', 'cobblestone'], iron: ['fer', 'iron_ingot'], gold: ['or', 'gold_ingot'], diamond: ['diamant', 'diamond'] };
const TOOLN = { pickaxe: 'Pioche', axe: 'Hache', shovel: 'Pelle', sword: 'Épée', hoe: 'Houe' };
for (const m in MATN) for (const k in TOOLN) NOMS[m + '_' + k] = `${TOOLN[k]} en ${MATN[m][0]}`;
const STACK1 = new Set(['bow', 'bucket', 'shears', 'boat', 'bed', 'fishing_rod', 'shield']);
const maxStack = id => STACK1.has(id) || /_(pickaxe|axe|shovel|sword|hoe)$/.test(id) ? 1 : 64;
// forme (lignes, ' ' = vide), clé → objet, quantité produite, palier de difficulté
const R = [];
const shaped = (out, n, rows, key, tier) => R.push({ out, n, rows, key, tier });
const shapeless = (out, n, items, tier) => R.push({ out, n, items, tier });
shapeless('planks', 4, ['log'], 0);
shaped('stick', 4, ['P', 'P'], { P: 'planks' }, 0);
shaped('crafting_table', 1, ['PP', 'PP'], { P: 'planks' }, 0);
shaped('torch', 4, ['c', 's'], { c: 'coal', s: 'stick' }, 0);
shaped('oak_slab', 6, ['PPP'], { P: 'planks' }, 0);
shaped('chest', 1, ['PPP', 'P P', 'PPP'], { P: 'planks' }, 1);
shaped('furnace', 1, ['CCC', 'C C', 'CCC'], { C: 'cobblestone' }, 1);
shaped('ladder', 3, ['s s', 'sss', 's s'], { s: 'stick' }, 1);
shaped('boat', 1, ['P P', 'PPP'], { P: 'planks' }, 1);
shaped('oak_door', 3, ['PP', 'PP', 'PP'], { P: 'planks' }, 1);
shaped('oak_stairs', 4, ['P  ', 'PP ', 'PPP'], { P: 'planks' }, 1);
shaped('oak_fence', 3, ['PsP', 'PsP'], { P: 'planks', s: 'stick' }, 1);
shaped('stone_bricks', 4, ['SS', 'SS'], { S: 'stone' }, 1);
shaped('bread', 1, ['www'], { w: 'wheat' }, 1);
for (const m in MATN) {
  const M = MATN[m][1], t = m === 'wood' ? 1 : 2;
  shaped(m + '_pickaxe', 1, ['MMM', ' s ', ' s '], { M, s: 'stick' }, t);
  shaped(m + '_axe', 1, ['MM', 'Ms', ' s'], { M, s: 'stick' }, t);
  shaped(m + '_shovel', 1, ['M', 's', 's'], { M, s: 'stick' }, t - 1);
  shaped(m + '_sword', 1, ['M', 'M', 's'], { M, s: 'stick' }, t);
  shaped(m + '_hoe', 1, ['MM', ' s', ' s'], { M, s: 'stick' }, t + 1);
}
shaped('bow', 1, [' sT', 's T', ' sT'], { s: 'stick', T: 'string' }, 3);
shaped('arrow', 4, ['f', 's', 'F'], { f: 'flint', s: 'stick', F: 'feather' }, 2);
shaped('bucket', 1, ['I I', ' I '], { I: 'iron_ingot' }, 2);
shaped('shears', 1, [' I', 'I '], { I: 'iron_ingot' }, 2);
shaped('bed', 1, ['WWW', 'PPP'], { W: 'wool', P: 'planks' }, 2);
shaped('fishing_rod', 1, ['  s', ' sT', 's T'], { s: 'stick', T: 'string' }, 3);
shaped('golden_apple', 1, ['GGG', 'GaG', 'GGG'], { G: 'gold_ingot', a: 'apple' }, 3);
shaped('tnt', 1, ['gSg', 'SgS', 'gSg'], { g: 'gunpowder', S: 'sand' }, 3);
shaped('shield', 1, ['PIP', 'PPP', ' P '], { P: 'planks', I: 'iron_ingot' }, 3);
shaped('iron_block', 1, ['III', 'III', 'III'], { I: 'iron_ingot' }, 2);
shaped('gold_block', 1, ['III', 'III', 'III'], { I: 'gold_ingot' }, 2);
shaped('diamond_block', 1, ['III', 'III', 'III'], { I: 'diamond' }, 2);
const BASIC = ['log', 'planks', 'stick', 'cobblestone', 'stone', 'sand', 'wool', 'coal', 'iron_ingot', 'gold_ingot', 'diamond', 'string', 'feather', 'flint', 'gunpowder', 'wheat', 'apple'];
// grille (9 cases) → recette correspondante : formes déplaçables et symétriques gauche-droite, comme dans Minecraft
function cellsOf(rows) { const out = []; rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== ' ') out.push([x, y, ch]); })); return out; }
function matchRecipe(grid) {
  const items = grid.map(s => s && s.id);
  const filled = []; items.forEach((id, i) => { if (id) filled.push([i % 3, Math.floor(i / 3), id]); });
  if (!filled.length) return null;
  const x0 = Math.min(...filled.map(f => f[0])), y0 = Math.min(...filled.map(f => f[1])), x1 = Math.max(...filled.map(f => f[0])), y1 = Math.max(...filled.map(f => f[1]));
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  for (const rc of R) {
    if (rc.items) {
      const a = filled.map(f => f[2]).sort(), b = rc.items.slice().sort();
      if (a.length === b.length && a.every((v, i) => v === b[i])) return rc;
      continue;
    }
    if (rc.rows.length !== h || Math.max(...rc.rows.map(r => r.length)) !== w) continue;
    for (const mirror of [false, true]) {
      let ok = true;
      for (let y = 0; y < h && ok; y++) for (let x = 0; x < w && ok; x++) {
        const row = rc.rows[y].padEnd(w, ' '), ch = row[mirror ? w - 1 - x : x], want = ch === ' ' ? null : rc.key[ch];
        if ((items[(y0 + y) * 3 + x0 + x] || null) !== want) ok = false;
      }
      if (ok) return rc;
    }
  }
  return null;
}
// ingrédients d'une recette (pour 1 fabrication)
function needs(rc) {
  const n = {};
  if (rc.items) rc.items.forEach(i => { n[i] = (n[i] || 0) + 1; });
  else cellsOf(rc.rows).forEach(([, , ch]) => { const id = rc.key[ch]; n[id] = (n[id] || 0) + 1; });
  return n;
}
FP.CRAFT = { R, matchRecipe, NOMS, icon, has: id => !!ICONS[id], initTex, tableIcon: () => { initTex(); return icon('crafting_table'); } };

// ================================================================ l'exercice
FP.Drills = FP.Drills || {};
FP.Drills.craft = function (register, cfg) {
  initTex();
  const box = $('#ecran2d'), d = clamp(cfg.diff == null ? 50 : cfg.diff, 0, 100) / 100, total = cfg.crafts ? cfg.crafts : Infinity;
  const S = { slots: new Array(45).fill(null), cursor: null, result: null, rc: null, target: null, round: 0, t0: 0, times: [], clicks: 0, running: false, alive: true, hover: -1, lastClick: { t: 0, i: -1 }, drag: null, mouse: [0, 0], cd: 0, pause: 0 };
  // ---------------------------------------------------------------- interface (fenêtre de l'établi)
  const slotHtml = i => `<div class="mc-slot" data-s="${i}"></div>`;
  box.innerHTML = `<div class="drill craft">
    <div class="drill-top glass"><div><b>Artisanat</b>${cfg.regarder ? ' · 👁 l’ordinateur joue' : ''} · <span id="crRound"></span></div><div id="crTime" class="cr-time">0.00 s</div><div><button class="btn" data-act="cfg">Configurer</button> <button class="btn" data-act="quit">Quitter</button></div></div>
    <div class="cr-target glass"><img id="crIcon" alt=""><div><div class="dim small">Fabrique :</div><b id="crName"></b> <span id="crCount" class="dim"></span></div><div id="crHelp" class="cr-help"></div></div>
    <div class="mc-win" id="crWin">
      <div class="mc-title">Fabrication</div>
      <div class="mc-craft"><div class="mc-grid">${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(slotHtml).join('')}</div><div class="mc-arrow">➜</div><div class="mc-slot mc-res" data-s="R"></div></div>
      <div class="mc-title">Inventaire</div>
      <div class="mc-inv">${Array.from({ length: 27 }, (_, k) => slotHtml(9 + k)).join('')}</div>
      <div class="mc-hot">${Array.from({ length: 9 }, (_, k) => slotHtml(36 + k)).join('')}</div>
      <div class="mc-cursor" id="crCursor"></div><div class="mc-pointer" id="crPointer" hidden></div>
      <div class="mc-tip" id="crTip" hidden></div>
      <div class="cr-cd" id="crCd"></div>
    </div>
    <p class="tips"><b>Clic gauche</b> prendre / poser tout · <b>clic droit</b> prendre la moitié / poser un · <b>glisser</b> (gauche : répartir, droit : un par case) · <b>Maj + clic</b> envoyer (sur le résultat : en série) · <b>double-clic</b> tout rassembler · <b>1–9</b> échanger avec la barre.</p>
  </div>`;
  const win = $('#crWin'), el = i => win.querySelector(`[data-s="${i}"]`);
  const stackHtml = s => s ? `<img src="${icon(s.id)}" alt="">${s.n > 1 ? `<span>${s.n}</span>` : ''}` : '';
  function render() {
    for (let i = 0; i < 45; i++) { const e = el(i); if (e) e.innerHTML = stackHtml(S.slots[i]); }
    el('R').innerHTML = stackHtml(S.result);
    $('#crCursor').innerHTML = stackHtml(S.cursor);
    const hv = S.hover === 'R' ? S.result : S.hover >= 0 ? S.slots[S.hover] : null, tip = $('#crTip');
    if (hv && !S.cursor) { tip.hidden = false; tip.textContent = NOMS[hv.id] || hv.id; } else tip.hidden = true;
    win.querySelectorAll('.mc-slot').forEach(e => e.classList.toggle('hov', String(S.hover) === e.dataset.s));
  }
  function placeCursorAt(x, y) { S.mouse = [x, y]; const c = $('#crCursor'), t = $('#crTip'); c.style.left = (x - 16) + 'px'; c.style.top = (y - 16) + 'px'; t.style.left = (x + 14) + 'px'; t.style.top = (y - 26) + 'px'; }
  // ---------------------------------------------------------------- règles d'inventaire de Minecraft
  const grid = () => S.slots.slice(0, 9);
  function updateResult() { const rc = matchRecipe(grid()); S.rc = rc; S.result = rc ? { id: rc.out, n: rc.n } : null; }
  function consume() { for (let i = 0; i < 9; i++) { const s = S.slots[i]; if (s) { s.n--; if (s.n <= 0) S.slots[i] = null; } } updateResult(); }
  // ajoute une pile dans des cases (d'abord les piles du même objet, puis les cases vides) ; renvoie ce qui reste
  function insert(st, order) {
    const m = maxStack(st.id);
    for (const i of order) { const s = S.slots[i]; if (s && s.id === st.id && s.n < m) { const t = Math.min(m - s.n, st.n); s.n += t; st.n -= t; if (!st.n) return 0; } }
    for (const i of order) { if (!S.slots[i]) { const t = Math.min(m, st.n); S.slots[i] = { id: st.id, n: t }; st.n -= t; if (!st.n) return 0; } }
    return st.n;
  }
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, k) => a + k);
  const INV_REV = range(9, 44).reverse(), HOT = range(36, 44), MAIN = range(9, 35), INV = range(9, 44);
  function quickMove(i) { // maj + clic
    const s = S.slots[i]; if (!s) return;
    const order = i < 9 ? INV : i < 36 ? HOT : MAIN; // grille → inventaire ; inventaire → barre ; barre → inventaire
    const left = insert({ id: s.id, n: s.n }, order);
    S.slots[i] = left ? { id: s.id, n: left } : null;
    if (i < 9) updateResult();
  }
  function took(id) { if (S.running && id === S.target.out) roundDone(); }
  function clickResult(btn, shift) {
    if (!S.result) return;
    const id = S.result.id;
    if (shift) { // fabrique en série tant que ça rentre dans l'inventaire (rangé en commençant par la fin de la barre)
      let made = 0;
      while (S.result && S.result.id === id) { const st = { id, n: S.result.n }, before = JSON.stringify(S.slots.slice(9)); const left = insert(st, INV_REV); if (left) { S.slots.splice(9, 36, ...JSON.parse(before)); break; } consume(); made++; }
      if (made) took(id);
      return;
    }
    if (!S.cursor) { S.cursor = { id, n: S.result.n }; consume(); took(id); }
    else if (S.cursor.id === id && S.cursor.n + S.result.n <= maxStack(id)) { S.cursor.n += S.result.n; consume(); took(id); }
  }
  function clickSlot(i, btn, shift) {
    if (shift && !S.cursor) { quickMove(i); return; }
    const s = S.slots[i], c = S.cursor, m = c ? maxStack(c.id) : 64;
    if (btn === 0) {
      if (!c) { if (s) { S.cursor = s; S.slots[i] = null; } }
      else if (!s) { S.slots[i] = c; S.cursor = null; }
      else if (s.id === c.id) { const t = Math.min(m - s.n, c.n); s.n += t; c.n -= t; if (c.n <= 0) S.cursor = null; }
      else { S.slots[i] = c; S.cursor = s; }
    } else {
      if (!c) { if (s) { const take = Math.ceil(s.n / 2); S.cursor = { id: s.id, n: take }; s.n -= take; if (!s.n) S.slots[i] = null; } }
      else if (!s) { S.slots[i] = { id: c.id, n: 1 }; c.n--; if (!c.n) S.cursor = null; }
      else if (s.id === c.id) { if (s.n < m) { s.n++; c.n--; if (!c.n) S.cursor = null; } }
      else { S.slots[i] = c; S.cursor = s; }
    }
    if (i < 9) updateResult();
  }
  function collectAll() { // double-clic : rassemble cet objet sur le curseur
    const c = S.cursor; if (!c) return; const m = maxStack(c.id);
    for (const i of INV) { const s = S.slots[i]; if (s && s.id === c.id && c.n < m) { const t = Math.min(m - c.n, s.n); c.n += t; s.n -= t; if (!s.n) S.slots[i] = null; } }
  }
  function applyDrag(slots, btn) { // glisser : gauche = répartir à parts égales, droit = un par case
    const c = S.cursor; if (!c) return;
    const ok = slots.filter(i => !S.slots[i] || (S.slots[i].id === c.id && S.slots[i].n < maxStack(c.id)));
    if (!ok.length) return;
    const per = btn === 0 ? Math.floor(c.n / ok.length) : 1;
    if (per < 1) return;
    for (const i of ok) { if (!c.n) break; const s = S.slots[i], room = s ? maxStack(c.id) - s.n : maxStack(c.id), t = Math.min(per, room, c.n); if (s) s.n += t; else S.slots[i] = { id: c.id, n: t }; c.n -= t; }
    if (!c.n) S.cursor = null;
    if (slots.some(i => i < 9)) updateResult();
  }
  function hotkey(n) { // touche 1–9 sur une case survolée
    if (S.cursor || S.hover === 'R' || S.hover < 0) return;
    const h = 36 + n, a = S.slots[S.hover]; S.slots[S.hover] = S.slots[h]; S.slots[h] = a; if (S.hover < 9 || h < 9) updateResult();
  }
  // ---------------------------------------------------------------- souris (joueur)
  const slotOf = t => { const e = t && t.closest && t.closest('.mc-slot'); return e ? (e.dataset.s === 'R' ? 'R' : +e.dataset.s) : -1; };
  const act = (fn) => { if (!S.running) return; S.clicks++; fn(); render(); };
  function onDown(e) {
    if (cfg.regarder || !S.running) return;
    const i = slotOf(e.target); if (i === -1) return;
    e.preventDefault();
    if (i === 'R') { act(() => clickResult(e.button, e.shiftKey)); return; }
    if (S.cursor && !e.shiftKey && (e.button === 0 || e.button === 2)) { S.drag = { btn: e.button, slots: [i], start: i }; return; }
    const now = performance.now(), dbl = e.button === 0 && now - S.lastClick.t < 300 && S.lastClick.i === i;
    S.lastClick = { t: now, i };
    act(() => { clickSlot(i, e.button, e.shiftKey); });
    if (dbl) act(() => collectAll());
  }
  function onMove(e) {
    const r = win.getBoundingClientRect(), k = r.width / win.offsetWidth || 1;
    if (!cfg.regarder) placeCursorAt((e.clientX - r.left) / k, (e.clientY - r.top) / k);
    const i = slotOf(document.elementFromPoint(e.clientX, e.clientY));
    if (!cfg.regarder && i !== S.hover) { S.hover = i; render(); }
    if (S.drag && typeof i === 'number' && i >= 0 && !S.drag.slots.includes(i)) S.drag.slots.push(i);
  }
  function onUp(e) {
    if (!S.drag) return;
    const dr = S.drag; S.drag = null;
    if (dr.slots.length === 1) { // simple clic avec un objet en main
      const now = performance.now(), dbl = dr.btn === 0 && now - S.lastClick.t < 300 && S.lastClick.i === dr.start;
      S.lastClick = { t: now, i: dr.start };
      if (dbl && S.cursor) act(() => collectAll()); else act(() => clickSlot(dr.start, dr.btn, false));
    } else act(() => applyDrag(dr.slots, dr.btn));
  }
  win.addEventListener('mousedown', onDown);
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
  win.addEventListener('contextmenu', e => e.preventDefault());
  // ---------------------------------------------------------------- manches
  function pickRecipe() {
    const maxTier = d < 0.2 ? 0 : d < 0.45 ? 1 : d < 0.7 ? 2 : 3;
    const pool = R.filter(rc => rc.tier <= maxTier && (d > 0.35 || rc.tier >= maxTier - 1));
    return pool[(Math.random() * pool.length) | 0];
  }
  function newRound() {
    S.slots.fill(null); S.cursor = null; updateResult();
    const rc = pickRecipe(); S.target = rc; S.round++;
    const need = needs(rc), give = {};
    // difficile : il faut d'abord fabriquer les planches (depuis des bûches) et les bâtons
    let chain = d > 0.55 && Math.random() < (d - 0.55) * 2.2, conv = false;
    for (const id in need) give[id] = (give[id] || 0) + need[id];
    if (chain && give.stick && rc.out !== 'stick') { const sticks = give.stick; delete give.stick; give.planks = (give.planks || 0) + Math.ceil(sticks / 4) * 2; conv = true; }
    if (chain && give.planks && rc.out !== 'planks') { const pl = give.planks; delete give.planks; give.log = (give.log || 0) + Math.ceil(pl / 4); conv = true; }
    chain = conv;
    const free = range(9, 44).sort(() => Math.random() - 0.5);
    for (const id in give) { const n = Math.min(maxStack(id), give[id] + (Math.random() < 0.6 ? (Math.random() * 20 | 0) : 0)); S.slots[free.pop()] = { id, n: maxStack(id) === 1 ? 1 : n }; }
    const distract = Math.round(d * 9 + Math.random() * 2);
    for (let k = 0; k < distract && free.length; k++) { const id = BASIC[(Math.random() * BASIC.length) | 0]; if (give[id]) continue; S.slots[free.pop()] = { id, n: 1 + (Math.random() * 63 | 0) }; }
    $('#crIcon').src = icon(rc.out); $('#crName').textContent = NOMS[rc.out] || rc.out; $('#crCount').textContent = rc.n > 1 ? `(×${rc.n})` : '';
    $('#crRound').textContent = `Objet ${S.round}${isFinite(total) ? '/' + total : ''}${chain ? ' · ⛓ fabrique d’abord les planches / bâtons' : ''}`;
    $('#crHelp').innerHTML = '';
    S.t0 = performance.now(); S.running = true; S.helpShown = false;
    render();
    if (cfg.regarder) botStart();
  }
  function showHelp() {
    const rc = S.target; if (!rc) return;
    let cells = new Array(9).fill(null);
    if (rc.items) rc.items.forEach((id, i) => { cells[i] = id; }); else rc.rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== ' ') cells[y * 3 + x] = rc.key[ch]; }));
    $('#crHelp').innerHTML = `<div class="dim small">Recette :</div><div class="cr-mini">${cells.map(id => `<div>${id ? `<img src="${icon(id)}" title="${NOMS[id]}">` : ''}</div>`).join('')}</div>`;
    S.helpShown = true;
  }
  function roundDone() {
    const t = (performance.now() - S.t0) / 1000; S.times.push(t); S.running = false;
    FP.sfx('ok'); $('#crTime').textContent = t.toFixed(2) + ' s ✔';
    win.classList.add('ok'); setTimeout(() => win.classList.remove('ok'), 250);
    botStop();
    if (S.times.length >= total) { setTimeout(finish, 700); return; }
    S.pause = setTimeout(() => S.alive && newRound(), 650);
  }
  function finish() {
    if (!S.alive) return;
    const t = S.times, avg = t.reduce((a, b) => a + b, 0) / Math.max(1, t.length);
    FP.logSession('craft', avg.toFixed(2) + ' s / objet');
    box.innerHTML = '';
    const stat = (l, v, good) => ({ l, v, good });
    FP.UI.showResults({ id: 'craft', title: 'Session terminée', big: avg.toFixed(2) + ' s / objet', win: undefined,
      rows: [stat('Objets fabriqués', t.length), stat('Plus rapide', t.length ? Math.min(...t).toFixed(2) + ' s' : '—'), stat('Plus lent', t.length ? Math.max(...t).toFixed(2) + ' s' : '—'), stat('Clics', S.clicks), stat('Clics par objet', t.length ? (S.clicks / t.length).toFixed(1) : '—', t.length ? S.clicks / t.length < 12 : undefined)],
      advice: ['Pour plusieurs cases du même objet : prends la pile, puis glisse avec le clic droit enfoncé sur toutes les cases (un par case) — un seul geste.',
        'Maj + clic sur le résultat fabrique en série et range tout dans l’inventaire (idéal pour les planches et les bâtons).',
        'Les formes peuvent être placées n’importe où dans la grille, et en miroir gauche-droite : choisis la position la plus proche de ta souris.'] });
    S.alive = false;
  }
  // ---------------------------------------------------------------- chrono, aide, décompte
  let raf = 0;
  function loop() {
    if (!S.alive) return;
    raf = requestAnimationFrame(loop);
    if (S.running) {
      const t = (performance.now() - S.t0) / 1000; $('#crTime').textContent = t.toFixed(2) + ' s';
      if (!S.helpShown && (cfg.aide === 'toujours' || (cfg.aide !== 'jamais' && t > 5))) showHelp();
    }
  }
  // ---------------------------------------------------------------- mode regarder : l'ordinateur joue parfaitement
  // Il calcule la suite de gestes la plus courte (prendre la pile, glisser clic droit sur toutes les cases, reposer le
  // reste ; maj + clic sur le résultat pour les étapes intermédiaires) et l'exécute avec un curseur visible.
  const B = { q: [], timer: 0, pos: [0, 0] };
  function slotCenter(i) { const e = el(i), r = e.getBoundingClientRect(), w = win.getBoundingClientRect(), k = w.width / win.offsetWidth || 1; return [(r.left + r.width / 2 - w.left) / k, (r.top + r.height / 2 - w.top) / k]; }
  const findItem = id => { let best = -1; for (const i of INV) { const s = S.slots[i]; if (s && s.id === id && (best < 0 || s.n > S.slots[best].n)) best = i; } return best; };
  // pose « k » exemplaires de l'objet id dans chaque case de cells
  function planPlace(id, cells, k) {
    const src = findItem(id); if (src < 0) return [];
    const q = [{ t: 'click', s: src, b: 0 }];
    for (let r = 0; r < k; r++) q.push(cells.length > 1 ? { t: 'drag', s: cells, b: 1 } : { t: 'click', s: cells[0], b: 1 });
    q.push({ t: 'click', s: src, b: 0 });
    return q;
  }
  function layout(rc) { // cases de la grille pour une recette (coin haut-gauche)
    const out = {};
    if (rc.items) rc.items.forEach((id, i) => { (out[id] || (out[id] = [])).push(i); });
    else rc.rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== ' ') { const id = rc.key[ch]; (out[id] || (out[id] = [])).push(y * 3 + x); } }));
    return out;
  }
  function botPlan() {
    const rc = S.target, need = needs(rc), have = id => INV.reduce((a, i) => a + (S.slots[i] && S.slots[i].id === id ? S.slots[i].n : 0), 0);
    // étapes intermédiaires : bâtons depuis les planches, planches depuis les bûches
    const wantSticks = (need.stick || 0) - have('stick');
    const wantPlanks = (need.planks || 0) - have('planks') + (wantSticks > 0 ? Math.ceil(wantSticks / 4) * 2 : 0);
    if (rc.out !== 'planks' && wantPlanks > 0 && have('log')) { const n = Math.ceil(wantPlanks / 4); return [...planPlace('log', [4], n), { t: 'shift', s: 'R' }]; }
    if (rc.out !== 'stick' && wantSticks > 0 && have('planks')) { const n = Math.ceil(wantSticks / 4); return [...planPlace('planks', [1, 4], n), { t: 'shift', s: 'R' }]; }
    const L = layout(rc), q = [];
    for (const id in L) q.push(...planPlace(id, L[id], 1));
    q.push({ t: 'click', s: 'R', b: 0 });
    return q;
  }
  function botStart() { botStop(); B.q = []; B.timer = setInterval(botStep, 16); B.busy = null; }
  function botStop() { clearInterval(B.timer); B.timer = 0; B.busy = null; }
  function botStep() {
    if (!S.alive || !S.running) return;
    if (!B.busy) { if (!B.q.length) B.q = botPlan(); B.busy = B.q.shift(); if (!B.busy) return; B.busy.k = 0; B.busy.path = (B.busy.t === 'drag' ? B.busy.s : [B.busy.s]).map(slotCenter); }
    const a = B.busy, tgt = a.path[a.k], dx = tgt[0] - B.pos[0], dy = tgt[1] - B.pos[1], dist = Math.hypot(dx, dy), stepLen = 26; // ≈ 1600 px/s
    if (dist > stepLen) { B.pos = [B.pos[0] + dx / dist * stepLen, B.pos[1] + dy / dist * stepLen]; }
    else {
      B.pos = tgt;
      if (a.t === 'drag') { if (a.k === 0) S.drag = { btn: 1, slots: [], start: a.s[0] }; S.drag.slots.push(a.s[a.k]); a.k++; if (a.k >= a.path.length) { const dr = S.drag; S.drag = null; act(() => applyDrag(dr.slots, dr.btn)); B.busy = null; } }
      else { const i = a.s; if (i === 'R') act(() => clickResult(0, a.t === 'shift')); else act(() => clickSlot(i, a.b, false)); B.busy = null; }
    }
    placeCursorAt(B.pos[0], B.pos[1]); const p = $('#crPointer'); p.hidden = false; p.style.left = B.pos[0] + 'px'; p.style.top = B.pos[1] + 'px';
    S.hover = -1; render();
  }
  // ---------------------------------------------------------------- démarrage (décompte 2, 1, 0)
  box.onclick = e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    if (b.dataset.act === 'quit') FP.closeGame();
    else if (b.dataset.act === 'cfg') { FP.closeGame(); FP.UI.showConfig('craft'); }
  };
  register({ onKey: e => {
    if (e.code === 'Escape') { FP.closeGame(); return; }
    const m = /^Digit([1-9])$/.exec(e.code); if (m && S.running && !cfg.regarder) { act(() => hotkey(+m[1] - 1)); }
  }, cleanup: () => { S.alive = false; botStop(); clearTimeout(S.pause); cancelAnimationFrame(raf); document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); box.onclick = null; } });
  render(); loop();
  let n = 2; const cdEl = $('#crCd');
  const tickCd = () => { if (!S.alive) return; cdEl.textContent = n; cdEl.classList.remove('pop'); void cdEl.offsetWidth; cdEl.classList.add('pop'); FP.sfx(n ? 'tick' : 'go'); if (n === 0) { setTimeout(() => { cdEl.textContent = ''; }, 400); newRound(); return; } n--; setTimeout(tickCd, 1000); };
  tickCd();
  FP._craft = S; // pour les tests
};
})();
