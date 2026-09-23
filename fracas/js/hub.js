// Salle d'accueil (hub) : le "menu principal" est une salle a cases (une case = HUB_CELL px),
// tres petite au depart, que l'on agrandit/amenage via le marche (argent gagne en jeu). On y
// incarne un personnage blanc sans aucune competence, qui ne peut que se deplacer ; marcher dans
// une porte y suffit pour naviguer.

const HUB_CELL = 105;
const HUB_DOOR_RADIUS = 34;
// Incremente a chaque fois que la forme de defaultHubLayout() change : une sauvegarde dont le hub
// porte un ancien numero de version est regeneree a neuf (sinon les joueurs qui ont deja une
// sauvegarde ne verraient jamais les changements de disposition par defaut).
const HUB_LAYOUT_VERSION = 4;

const HUB_CHARACTER = {
  id: 'hub', name: '', epithet: '', speedPercent: 118, color: '#f2f2f7',
  draw(ctx, player) {
    drawGroundShadow(ctx, 10, 16);
    glowOutline(ctx, 'rgba(255,255,255,0.4)', 8);
    ctx.fillStyle = radialBodyGradient(ctx, 15, '#ffffff', '#d7d7e2', '#54545f');
    ctx.strokeStyle = '#2c2c34';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // Visage simple, tourne vers la direction visee/deplacee (aucune competence, juste "vivant").
    const a = player.facing || 0;
    const fx = Math.cos(a), fy = Math.sin(a);
    const px = -fy, py = fx;
    ctx.fillStyle = '#232329';
    ctx.beginPath(); ctx.arc(fx * 7 + px * 4, fy * 7 + py * 4, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(fx * 7 - px * 4, fy * 7 - py * 4, 1.8, 0, Math.PI * 2); ctx.fill();
  },
};

// Disposition de depart : bloc de 3x3 cases. Les 6 portes + la case de depart en occupent 7,
// les 2 cases laterales du milieu sont libres. La salle de test n'a pas de porte : on y accede
// uniquement depuis la liste des personnages.
function defaultHubLayout() {
  const cells = [];
  for (let gx = -1; gx <= 1; gx++) for (let gy = -1; gy <= 1; gy++) cells.push({ gx, gy });
  return {
    version: HUB_LAYOUT_VERSION,
    cells,
    doors: {
      world: { gx: -1, gy: -1 },
      defi: { gx: 0, gy: -1 },
      perso: { gx: 1, gy: -1 },
      spawn: { gx: 0, gy: 0 },
      market: { gx: -1, gy: 1 },
      bestiary: { gx: 0, gy: 1 },
      settings: { gx: 1, gy: 1 },
    },
    decor: [],
  };
}

// Les portes navigables (tout sauf "spawn", qui est un bloc principal mais pas une porte). La
// salle de test n'y figure pas : on y accede uniquement depuis la liste des personnages.
function hubKeyList() { return ['world', 'defi', 'perso', 'bestiary', 'settings', 'market']; }

function hubDoorMeta() {
  return {
    world: { labelKey: 'btnMonde', action: () => { Game.pendingCharSelectMode = 'expedition'; Game.setState(STATE.CHAR_SELECT); } },
    defi: { labelKey: 'btnDefi', action: () => Game.setState(STATE.CHALLENGE_SELECT) },
    perso: { labelKey: 'btnPerso', action: () => { Game.pendingCharSelectMode = 'showcase'; Game.setState(STATE.CHAR_SELECT); } },
    bestiary: { labelKey: 'btnBestiary', action: () => Game.setState(STATE.BESTIARY) },
    settings: { labelKey: 'btnSettings', action: () => Game.setState(STATE.SETTINGS) },
    market: { labelKey: 'btnMarket', action: () => Game.setState(STATE.MARKET) },
  };
}

function hubCellKey(gx, gy) { return gx + ',' + gy; }
function hubCellsSet() {
  const set = new Set();
  for (const c of Save.data.hub.cells) set.add(hubCellKey(c.gx, c.gy));
  return set;
}
function hubBounds() {
  const cells = Save.data.hub.cells;
  let minGx = Infinity, maxGx = -Infinity, minGy = Infinity, maxGy = -Infinity;
  for (const c of cells) {
    minGx = Math.min(minGx, c.gx); maxGx = Math.max(maxGx, c.gx);
    minGy = Math.min(minGy, c.gy); maxGy = Math.max(maxGy, c.gy);
  }
  return { minGx, maxGx, minGy, maxGy };
}
function hubAdjacentToExisting(gx, gy) {
  const occ = hubCellsSet();
  return occ.has(hubCellKey(gx - 1, gy)) || occ.has(hubCellKey(gx + 1, gy)) ||
    occ.has(hubCellKey(gx, gy - 1)) || occ.has(hubCellKey(gx, gy + 1));
}
function hubCellCenter(gx, gy) { return { x: gx * HUB_CELL, y: gy * HUB_CELL }; }

function buildHubRoom() {
  const occ = hubCellsSet();
  const { minGx, maxGx, minGy, maxGy } = hubBounds();
  const bounds = {
    x: (minGx - 0.5) * HUB_CELL, y: (minGy - 0.5) * HUB_CELL,
    w: (maxGx - minGx + 1) * HUB_CELL, h: (maxGy - minGy + 1) * HUB_CELL,
  };
  const obstacles = [];
  // Tout ce qui n'est pas une case possedee, a l'interieur du rectangle englobant, bloque le passage
  // (invisible : ce n'est pas un vrai "obstacle" de jeu, juste le vide hors de la salle).
  for (let gx = minGx; gx <= maxGx; gx++) {
    for (let gy = minGy; gy <= maxGy; gy++) {
      if (!occ.has(hubCellKey(gx, gy))) {
        obstacles.push({ x: (gx - 0.5) * HUB_CELL, y: (gy - 0.5) * HUB_CELL, w: HUB_CELL, h: HUB_CELL, hubKind: 'void' });
      }
    }
  }
  const teleporters = [];
  const winds = [];
  for (const d of Save.data.hub.decor) {
    const c = hubCellCenter(d.gx, d.gy);
    if (d.type === 'wall') {
      obstacles.push({ x: c.x - HUB_CELL / 2, y: c.y - HUB_CELL / 2, w: HUB_CELL, h: HUB_CELL, hubKind: 'wall', color: d.color });
    } else if (d.type === 'teleporter') {
      teleporters.push(Object.assign({ x: c.x, y: c.y }, d));
    } else if (d.type === 'wind') {
      winds.push(Object.assign({ x: c.x, y: c.y }, d));
    }
  }
  const meta = hubDoorMeta();
  const doors = hubKeyList().map((key) => {
    const pos = Save.data.hub.doors[key];
    const c = hubCellCenter(pos.gx, pos.gy);
    return Object.assign({ key, x: c.x, y: c.y, r: HUB_DOOR_RADIUS }, meta[key]);
  });
  const spawnPos = hubCellCenter(Save.data.hub.doors.spawn.gx, Save.data.hub.doors.spawn.gy);
  return { bounds, obstacles, doors, teleporters, winds, spawn: spawnPos };
}

function updateHub(world, dt) {
  if (!world.player) return;
  const doors = world.hubDoors;
  if (doors) {
    for (const d of doors) {
      if (dist(world.player.x, world.player.y, d.x, d.y) <= d.r) { d.action(); return; }
    }
  }
  if (world._teleportGrace > 0) world._teleportGrace -= dt;
  const teleporters = world.hubTeleporters;
  if (teleporters && teleporters.length && !(world._teleportGrace > 0)) {
    for (const t of teleporters) {
      if (!t.pairId) continue;
      if (dist(world.player.x, world.player.y, t.x, t.y) <= HUB_CELL * 0.35) {
        const partner = teleporters.find((o) => o.id !== t.id && o.pairId === t.pairId);
        if (partner) {
          world.player.x = partner.x; world.player.y = partner.y;
          world._teleportGrace = 0.5;
          Particles.burst(partner.x, partner.y, 20, '#7fd8ff', { maxSpeed: 160 });
          Audio2.teleport();
        }
        break;
      }
    }
  }
  const winds = world.hubWinds;
  if (winds && winds.length) {
    const dirVec = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
    for (const w of winds) {
      if (dist(world.player.x, world.player.y, w.x, w.y) > HUB_CELL * 0.5) continue;
      const dir = dirVec[w.dir] || { x: 0, y: 0 };
      world.player.x += dir.x * 220 * dt;
      world.player.y += dir.y * 220 * dt;
      for (const ob of world.room.obstacles) {
        if (!circleRect(world.player.x, world.player.y, world.player.radius, ob.x, ob.y, ob.w, ob.h)) continue;
        const cx = clamp(world.player.x, ob.x, ob.x + ob.w);
        const cy = clamp(world.player.y, ob.y, ob.y + ob.h);
        const ddx = world.player.x - cx, ddy = world.player.y - cy;
        const dd = Math.hypot(ddx, ddy);
        if (dd > 0.001) {
          const push = world.player.radius - dd + 0.5;
          world.player.x += (ddx / dd) * push;
          world.player.y += (ddy / dd) * push;
        }
      }
    }
  }
}

// Le sol occupe est simplement teinte, sans aucune ligne de separation entre cases : les
// delimitations de cases ne doivent jamais se voir en jeu, uniquement dans l'ecran du Marche
// (sa propre grille, separee, sert a placer/deplacer des blocs).
function renderHubFloor(ctx, camera, world) {
  const occ = hubCellsSet();
  const { minGx, maxGx, minGy, maxGy } = hubBounds();
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.035)';
  // Un seul chemin compose (toutes les cases), rempli en un seul appel fill() : deux fillRect()
  // separes se chevauchant produiraient une ligne plus sombre a chaque frontiere (double mélange
  // alpha), ce qui recreerait exactement le quadrillage qu'on cherche a eviter.
  ctx.beginPath();
  for (let gx = minGx; gx <= maxGx; gx++) {
    for (let gy = minGy; gy <= maxGy; gy++) {
      if (!occ.has(hubCellKey(gx, gy))) continue;
      const cx = gx * HUB_CELL - camera.x, cy = gy * HUB_CELL - camera.y;
      // Legere marge (+0.75px) : un seul fill() ne re-cree pas la ligne de double-melange, mais
      // ca absorbe tout interstice d'anti-crenelage pile a la frontiere entre deux cases.
      ctx.rect(cx - HUB_CELL / 2 - 0.75, cy - HUB_CELL / 2 - 0.75, HUB_CELL + 1.5, HUB_CELL + 1.5);
    }
  }
  ctx.fill();
  ctx.restore();
}

function renderHubDoors(ctx, camera, world) {
  const doors = world.hubDoors;
  if (!doors) return;
  const t = performance.now() / 500;
  for (const d of doors) {
    const sx = d.x - camera.x, sy = d.y - camera.y;
    const pulse = 0.6 + 0.4 * Math.sin(t + d.x * 0.01);
    ctx.save();
    ctx.translate(sx, sy);
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, d.r);
    grad.addColorStop(0, `rgba(127,216,255,${0.28 + 0.14 * pulse})`);
    grad.addColorStop(1, 'rgba(127,216,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0, 0, d.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(127,216,255,${0.55 + 0.3 * pulse})`;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([7, 5]);
    ctx.beginPath(); ctx.arc(0, 0, d.r, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Segoe UI';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 4;
    ctx.fillText(S(d.labelKey), sx, sy - d.r - 10);
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

function renderHubDecorIcons(ctx, camera, world) {
  const t = performance.now() / 500;
  if (world.hubTeleporters) {
    for (const tp of world.hubTeleporters) {
      const sx = tp.x - camera.x, sy = tp.y - camera.y;
      const pulse = 0.6 + 0.4 * Math.sin(t + tp.x * 0.01);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.strokeStyle = tp.pairId ? `rgba(127,216,255,${0.6 + 0.3 * pulse})` : 'rgba(255,93,93,0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }
  if (world.hubWinds) {
    const angleFor = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 };
    for (const w of world.hubWinds) {
      const sx = w.x - camera.x, sy = w.y - camera.y;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(angleFor[w.dir] || 0);
      ctx.strokeStyle = 'rgba(191,232,255,0.75)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(18, 0); ctx.lineTo(8, -10); ctx.moveTo(18, 0); ctx.lineTo(8, 10); ctx.stroke();
      ctx.restore();
    }
  }
}
