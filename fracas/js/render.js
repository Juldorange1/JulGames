// Rendu du monde (arene, terrains, obstacles, entites)

function renderBackground(ctx, camera, room, theme, zoom) {
  // Le repere de rendu est ancre a l'origine (0,0) puis mis a l'echelle par Game.render.
  // On dessine donc le fond depuis (0,0) sur toute la fenetre visible pre-zoom (= CANVAS / zoom),
  // avec une marge (via Math.min(z,1)) pour ne jamais laisser de vide si zoom < 1.
  const z = zoom || 1;
  const fillW = CANVAS_W / Math.min(z, 1);
  const fillH = CANVAS_H / Math.min(z, 1);
  const fx0 = 0, fy0 = 0;

  ctx.save();
  ctx.fillStyle = (theme && theme.bg) || '#0e0e16';
  ctx.fillRect(fx0, fy0, fillW, fillH);
  if (theme && theme.floorTint) {
    ctx.fillStyle = theme.floorTint;
    ctx.fillRect(fx0, fy0, fillW, fillH);
  }
  // Aucun quadrillage/delimitation de case nulle part dans le jeu (expedition, defi, salle de
  // test, hub) : seul l'ecran DOM du Marche a sa propre grille, separee de ce rendu-ci.
  ctx.restore();

  if (room) {
    const b = room.bounds;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 4;
    ctx.strokeRect(b.x - camera.x, b.y - camera.y, b.w, b.h);
    ctx.restore();
  }
}

function renderDecorations(ctx, camera, world) {
  const list = world.decorations;
  if (!list || list.length === 0) return;
  const t = performance.now() / 1000;
  for (const d of list) {
    const sx = d.x - camera.x, sy = d.y - camera.y;
    if (sx < -30 || sx > CANVAS_W + 30 || sy < -30 || sy > CANVAS_H + 30) continue;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(d.rot);
    ctx.scale(d.scale, d.scale);
    switch (d.type) {
      case 'grass': {
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#3a6a42';
        ctx.beginPath(); ctx.ellipse(0, 4, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.9;
        const blades = ['#3d7a46', '#4a8a52', '#5fa062', '#6fb56a'];
        for (let i = -2; i <= 2; i++) {
          const sway = Math.sin(t * 1.4 + d.seed + i) * 3;
          const h = 10 + Math.abs(Math.sin(d.seed + i * 1.7)) * 6;
          ctx.strokeStyle = blades[(i + 2) % blades.length];
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(i * 4, 6);
          ctx.quadraticCurveTo(i * 4 + sway, 6 - h * 0.6, i * 4 + sway * 1.6, 6 - h);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        break;
      }
      case 'rock': {
        const rg = ctx.createLinearGradient(-8, -6, 8, 6);
        rg.addColorStop(0, '#565f52'); rg.addColorStop(0.5, '#3a3f38'); rg.addColorStop(1, '#22261f');
        ctx.fillStyle = rg;
        ctx.strokeStyle = '#161915';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-8, 4); ctx.lineTo(-4, -5); ctx.lineTo(5, -6); ctx.lineTo(8, 3); ctx.lineTo(2, 6); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-2, -3); ctx.lineTo(1, 2); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath(); ctx.ellipse(-2, -3, 3, 1.4, 0.5, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'pipe': {
        ctx.fillStyle = '#2a3440';
        ctx.strokeStyle = '#485868';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(-16, -5, 32, 10, 5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#5a7a8a';
        ctx.beginPath(); ctx.arc(-10, 0, 1.6, 0, Math.PI * 2); ctx.arc(0, 0, 1.6, 0, Math.PI * 2); ctx.arc(10, 0, 1.6, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'rivet': {
        ctx.fillStyle = '#232b34';
        ctx.strokeStyle = '#3a4a58';
        ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#6a8494';
        ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'stripe': {
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#ffd23d';
        ctx.fillRect(-18, -4, 36, 8);
        ctx.fillStyle = '#0a0a0a';
        for (let i = -16; i < 18; i += 8) { ctx.fillRect(i, -4, 4, 8); }
        break;
      }
      case 'crack': {
        ctx.strokeStyle = 'rgba(255,110,40,0.45)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-14, 0); ctx.lineTo(-4, -5); ctx.lineTo(2, 2); ctx.lineTo(14, -3);
        ctx.stroke();
        break;
      }
      case 'ashrock': {
        ctx.fillStyle = '#241410';
        ctx.strokeStyle = '#3a231a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-9, 5); ctx.lineTo(-5, -6); ctx.lineTo(6, -5); ctx.lineTo(9, 4); ctx.lineTo(0, 7); ctx.closePath();
        ctx.fill(); ctx.stroke();
        break;
      }
      case 'ember': {
        const flick = 0.4 + 0.4 * Math.sin(t * 3 + d.seed * 4);
        const rise = (t * 12 + d.seed * 20) % 30;
        ctx.globalAlpha = Math.max(0, 0.7 - rise / 30) * flick + 0.15;
        ctx.fillStyle = '#ff9d3d';
        ctx.shadowColor = '#ff7a3d'; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(0, -rise, 1.8, 0, Math.PI * 2); ctx.fill();
        break;
      }
    }
    ctx.restore();
  }
}

// Bruit deterministe (memes deux nombres -> meme resultat) : sert a texturer les obstacles sans
// que le grain ne scintille d'une frame a l'autre.
function hashSeed(x, y) {
  const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return h - Math.floor(h);
}

const OBSTACLE_PALETTES = {
  usine: { light: '#5a6a7a', base: '#3a4552', dark: '#1c232c' },
  ruines: { light: '#6a5240', base: '#4a382c', dark: '#241a12' },
  prairie: { light: '#6a7458', base: '#4a5240', dark: '#242a1c' },
};

// Murs/obstacles avec une texture propre a chaque decor (pierre moussue, metal rivete, pierre
// fissuree...) plutot qu'un simple rectangle gris plat.
function drawTexturedObstacle(ctx, sx, sy, w, h, themeName, seedX, seedY) {
  const p = OBSTACLE_PALETTES[themeName] || OBSTACLE_PALETTES.prairie;
  const grad = ctx.createLinearGradient(sx, sy, sx, sy + h);
  grad.addColorStop(0, p.light);
  grad.addColorStop(0.55, p.base);
  grad.addColorStop(1, p.dark);
  ctx.fillStyle = grad;
  ctx.fillRect(sx, sy, w, h);

  // Grain procedural (taches claires/sombres) : donne une matiere "reelle" a la surface.
  const dots = Math.max(8, Math.min(40, Math.floor((w * h) / 200)));
  ctx.globalAlpha = 0.2;
  for (let i = 0; i < dots; i++) {
    const rx = hashSeed(seedX + i * 3.7, seedY - i * 1.3);
    const ry = hashSeed(seedX - i * 2.1, seedY + i * 4.9);
    const px = sx + rx * w, py = sy + ry * h;
    const rr = 0.6 + hashSeed(seedX + i, seedY + i) * 1.7;
    ctx.fillStyle = hashSeed(seedX + i * 9.3, seedY - i * 2.7) > 0.5 ? p.dark : p.light;
    ctx.beginPath(); ctx.arc(px, py, rr, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (themeName === 'usine') {
    // Panneau metallique rivete
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx + 3, sy + 3, Math.max(0, w - 6), Math.max(0, h - 6));
    ctx.fillStyle = p.dark;
    const inX = Math.min(7, w * 0.2), inY = Math.min(7, h * 0.2);
    for (const [cx2, cy2] of [[sx + inX, sy + inY], [sx + w - inX, sy + inY], [sx + inX, sy + h - inY], [sx + w - inX, sy + h - inY]]) {
      ctx.beginPath(); ctx.arc(cx2, cy2, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath(); ctx.arc(cx2 - 0.5, cy2 - 0.5, 0.7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = p.dark;
    }
  } else if (themeName === 'ruines') {
    // Fissures lumineuses (braises) courant sur la pierre
    ctx.strokeStyle = 'rgba(255,122,61,0.5)';
    ctx.lineWidth = 1.3;
    ctx.shadowColor = '#ff7a3d'; ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(sx + w * 0.15, sy); ctx.lineTo(sx + w * 0.4, sy + h * 0.35);
    ctx.lineTo(sx + w * 0.18, sy + h * 0.65); ctx.lineTo(sx + w * 0.35, sy + h);
    ctx.stroke();
    ctx.shadowBlur = 0;
  } else {
    // Prairie : mousse/touffes d'herbe sur l'arete superieure du bloc de pierre
    const blades = Math.max(3, Math.floor(w / 13));
    for (let i = 0; i < blades; i++) {
      const bx = sx + (i + 0.5) * (w / blades);
      const lean = hashSeed(seedX + i, seedY) * 3 - 1.5;
      ctx.strokeStyle = i % 2 === 0 ? '#7fbf6a' : '#5a8f4a';
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(bx, sy + 1); ctx.lineTo(bx + lean, sy - 6 - hashSeed(seedX - i, seedY + i) * 4); ctx.stroke();
    }
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(sx, sy, w, h);
}

function renderObstacles(ctx, camera, room, theme) {
  if (!room) return;
  const themeName = theme && theme.name;
  for (const ob of room.obstacles) {
    if (ob.hubKind === 'void') continue; // le vide hors de la salle du hub ne se dessine pas
    const sx = ob.x - camera.x, sy = ob.y - camera.y;
    ctx.save();
    if (ob.hubKind === 'wall') {
      // Mur colore du hub : reste net, couleur exacte choisie par le joueur (pas de texture).
      ctx.fillStyle = ob.color || '#33333f';
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 2;
      ctx.fillRect(sx, sy, ob.w, ob.h);
      ctx.strokeRect(sx, sy, ob.w, ob.h);
    } else {
      drawTexturedObstacle(ctx, sx, sy, ob.w, ob.h, themeName, ob.x, ob.y);
    }
    ctx.restore();
  }
}

function renderTerrainZones(ctx, camera, room) {
  if (!room || !room.terrainZones) return;
  for (const z of room.terrainZones) {
    const sx = z.x - camera.x, sy = z.y - camera.y;
    ctx.save();
    ctx.fillStyle = z.color;
    ctx.strokeStyle = z.edgeColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.arc(sx, sy, z.radius, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '10px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText(terrainLabelI18n(z.terrainType), sx, sy + 3);
    ctx.restore();
  }
}

function renderEnemies(ctx, camera, world) {
  for (const e of world.enemies) {
    if (e.dead) continue;
    if (e.kind === 'boss') drawBoss(ctx, camera, e);
    else drawTurret(ctx, camera, e);
    if (e.frozen > 0 || e.frozenUntilTouched) {
      const sx = e.x - camera.x, sy = e.y - camera.y;
      ctx.save();
      ctx.strokeStyle = '#7fd8ff';
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sx, sy, (e.radius || 16) + 6, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }
}

function renderMenuBackdrop(ctx, ts) {
  const t = ts / 1000;
  const g = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H * 0.32, 40, CANVAS_W / 2, CANVAS_H * 0.4, CANVAS_W * 0.75);
  g.addColorStop(0, '#1c1c2a');
  g.addColorStop(0.55, '#0c0c13');
  g.addColorStop(1, '#050507');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  const step = 64;
  for (let x = 0; x < CANVAS_W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke(); }
  for (let y = 0; y < CANVAS_H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke(); }
  ctx.restore();

  const blobs = [
    { x: 0.2, y: 0.25, r: 220, c: '255,61,90', spd: 0.06 },
    { x: 0.8, y: 0.7, r: 260, c: '127,216,255', spd: -0.05 },
    { x: 0.65, y: 0.15, r: 170, c: '255,210,61', spd: 0.08 },
    { x: 0.15, y: 0.8, r: 200, c: '199,122,255', spd: -0.07 },
  ];
  for (const b of blobs) {
    const bx = (b.x + Math.sin(t * b.spd + b.r) * 0.05) * CANVAS_W;
    const by = (b.y + Math.cos(t * b.spd * 1.3 + b.r) * 0.05) * CANVAS_H;
    const bg = ctx.createRadialGradient(bx, by, 0, bx, by, b.r);
    bg.addColorStop(0, `rgba(${b.c},0.10)`);
    bg.addColorStop(1, `rgba(${b.c},0)`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  if (!renderMenuBackdrop._particles) {
    const list = [];
    for (let i = 0; i < 46; i++) {
      list.push({ x: Math.random() * CANVAS_W, y: Math.random() * CANVAS_H, r: randRange(0.8, 2.4), s: randRange(6, 18), phase: Math.random() * 10 });
    }
    renderMenuBackdrop._particles = list;
  }
  ctx.save();
  for (const p of renderMenuBackdrop._particles) {
    const y = (p.y - t * p.s) % (CANVAS_H + 20);
    const yy = y < -20 ? y + CANVAS_H + 20 : y;
    const alpha = 0.15 + 0.15 * Math.sin(t + p.phase);
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(p.x, yy, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function renderWorld(ctx, world) {
  const camera = world.camera;
  renderBackground(ctx, camera, world.room, world.theme, world.zoom);
  if (world.hubDoors) {
    renderHubFloor(ctx, camera, world);
    renderHubDoors(ctx, camera, world);
    renderHubDecorIcons(ctx, camera, world);
  }
  renderDecorations(ctx, camera, world);
  renderTerrainZones(ctx, camera, world.room);
  renderObstacles(ctx, camera, world.room, world.theme);
  drawWinds(ctx, camera, world);
  drawZones(ctx, camera, world);
  drawWalls(ctx, camera, world);
  drawMines(ctx, camera, world);
  drawMeteors(ctx, camera, world);
  drawShields(ctx, camera, world);
  renderEnemies(ctx, camera, world);
  drawProjectiles(ctx, camera, world);
  if (world.player) drawPlayer(ctx, camera, world, world.player);
  Particles.render(ctx, camera);
}
