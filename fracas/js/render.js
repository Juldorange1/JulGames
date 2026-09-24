// Rendu du monde (arene, terrains, obstacles, entites)

function renderBackground(ctx, camera, room, theme, zoom, world) {
  // Ciel (l'ile flotte dans les airs) : dessine en coordonnees ecran, avec parallaxe.
  if (world) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    IslandSky.render(ctx, world, camera);
    ctx.restore();
    return;
  }
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

// Les decors (herbe, cailloux, tuyaux, fissures...) font partie du sol precalcule de la salle
// (voir floor.js) : discrets, sans animation ni point lumineux qui gene la lecture des combats.
function renderDecorations(ctx, camera, world) {
  renderRoomFloor(ctx, camera, world);
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
  const zoom = (Game.world && Game.world.zoom) || 1;
  const viewW = CANVAS_W / zoom + 40, viewH = CANVAS_H / zoom + 40;
  for (const ob of room.obstacles) {
    if (ob.hubKind === 'void') continue; // le vide hors de la salle du hub ne se dessine pas
    if (ob.pkVoid) {
      // roche autour du trace d'un parcours : masse sombre et nette
      continue; // le vide autour du trace : on voit le ciel (l'ile flotte)
    }
    const sx = ob.x - camera.x, sy = ob.y - camera.y;
    // Hors champ (parcours tres longs, des centaines de murs) : inutile de le dessiner.
    if (sx + ob.w < -40 || sy + ob.h < -40 || sx > viewW || sy > viewH) continue;
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
  for (const z of room.terrainZones) drawTerrainZone(ctx, z.x - camera.x, z.y - camera.y, z);
}

// Petit generateur pseudo-aleatoire deterministe (motifs stables d'une frame a l'autre).
function zoneRng(seed) {
  let s = Math.abs(Math.floor(seed)) % 2147483647 || 1;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

const TERRAIN_STYLE = {
  ice:     { core: 'rgba(225,248,255,0.55)', mid: 'rgba(140,215,250,0.38)', rim: '#bff0ff', glow: '#9de8ff' },
  mud:     { core: 'rgba(92,64,34,0.85)',    mid: 'rgba(120,86,50,0.7)',    rim: '#6b4a26', glow: '#8a6a45' },
  accel:   { core: 'rgba(120,255,170,0.35)', mid: 'rgba(40,200,110,0.22)',  rim: '#5dff9d', glow: '#5dff9d' },
  slow:    { core: 'rgba(120,70,210,0.45)',  mid: 'rgba(80,40,160,0.32)',   rim: '#b47cff', glow: '#b47cff' },
  damage:  { core: 'rgba(255,190,80,0.55)',  mid: 'rgba(230,60,20,0.42)',   rim: '#ff7a3d', glow: '#ff5a1e' },
  invertH: { core: 'rgba(255,140,220,0.35)', mid: 'rgba(200,60,160,0.24)',  rim: '#ff7ad1', glow: '#ff7ad1' },
  invertV: { core: 'rgba(210,150,255,0.35)', mid: 'rgba(140,70,220,0.24)',  rim: '#c77aff', glow: '#c77aff' },
  wind:    { core: 'rgba(220,245,255,0.28)', mid: 'rgba(150,210,240,0.16)', rim: '#bfe8ff', glow: '#bfe8ff' },
};

function drawArrowHead(ctx, x, y, ang, size) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.beginPath(); ctx.moveTo(size, 0); ctx.lineTo(-size * 0.6, -size * 0.75); ctx.lineTo(-size * 0.2, 0); ctx.lineTo(-size * 0.6, size * 0.75);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// Zone de terrain : sol texture propre a chaque type, anime, avec un bord lumineux net
// (lisible d'un coup d'oeil, sans etiquette de texte).
function drawTerrainZone(ctx, sx, sy, z) {
  const st = TERRAIN_STYLE[z.terrainType];
  if (!st) return;
  const r = z.radius;
  const t = performance.now() / 1000;
  const rnd = zoneRng(z.x * 31 + z.y * 17 + 7);
  ctx.save();

  // Halo exterieur doux
  const halo = ctx.createRadialGradient(sx, sy, r * 0.7, sx, sy, r * 1.25);
  halo.addColorStop(0, st.glow + '40'); halo.addColorStop(1, st.glow + '00');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(sx, sy, r * 1.25, 0, Math.PI * 2); ctx.fill();

  // Sol
  const g = ctx.createRadialGradient(sx - r * 0.25, sy - r * 0.3, r * 0.1, sx, sy, r);
  g.addColorStop(0, st.core); g.addColorStop(1, st.mid);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();

  // Motif interne (clippe au disque)
  ctx.save();
  ctx.beginPath(); ctx.arc(sx, sy, r - 1, 0, Math.PI * 2); ctx.clip();
  switch (z.terrainType) {
    case 'ice': {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.2;
      for (let i = 0; i < 6; i++) {
        let a = rnd() * Math.PI * 2, px = sx + Math.cos(a) * r * 0.15, py = sy + Math.sin(a) * r * 0.15;
        ctx.beginPath(); ctx.moveTo(px, py);
        for (let k = 0; k < 4; k++) { a += (rnd() - 0.5) * 0.9; px += Math.cos(a) * r * 0.25; py += Math.sin(a) * r * 0.25; ctx.lineTo(px, py); }
        ctx.stroke();
      }
      // reflet qui balaie la glace
      const sweep = ((t * 0.35) % 1.6 - 0.3) * r * 2;
      const lg = ctx.createLinearGradient(sx - r + sweep - 20, sy - r, sx - r + sweep + 20, sy + r);
      lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,0.35)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = lg; ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
      for (let i = 0; i < 5; i++) {
        const gx = sx + (rnd() - 0.5) * r * 1.5, gy = sy + (rnd() - 0.5) * r * 1.5;
        const tw = Math.max(0, Math.sin(t * 3 + i * 2.1));
        ctx.fillStyle = `rgba(255,255,255,${0.8 * tw})`;
        ctx.beginPath(); ctx.arc(gx, gy, 1.6 * tw + 0.3, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'mud': {
      for (let i = 0; i < 9; i++) {
        const bx = sx + (rnd() - 0.5) * r * 1.5, by = sy + (rnd() - 0.5) * r * 1.5;
        const rr = 3 + rnd() * 7;
        ctx.fillStyle = 'rgba(60,40,18,0.55)';
        ctx.beginPath(); ctx.ellipse(bx, by, rr * 1.4, rr, rnd() * 3, 0, Math.PI * 2); ctx.fill();
      }
      for (let i = 0; i < 4; i++) {
        const ph = (t * 0.6 + i * 0.27) % 1;
        const bx = sx + Math.cos(i * 2.4) * r * 0.45, by = sy + Math.sin(i * 1.7) * r * 0.45;
        ctx.strokeStyle = `rgba(190,150,100,${0.7 * (1 - ph)})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(bx, by, 2 + ph * 7, 0, Math.PI * 2); ctx.stroke();
      }
      break;
    }
    case 'wind': {
      ctx.translate(sx, sy); ctx.rotate(z.windAngle || 0);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (let i = 0; i < 10; i++) {
        const ly = (rnd() - 0.5) * r * 1.7, len = 14 + rnd() * 20;
        const lx = ((rnd() * r * 2 + t * 90 * (0.8 + rnd() * 0.6)) % (r * 2.6)) - r * 1.3;
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + len, ly); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      drawArrowHead(ctx, r * 0.35, 0, 0, 9);
      break;
    }
    case 'accel': {
      ctx.translate(sx, sy);
      const gap = 22, off = (t * 60) % gap;
      ctx.fillStyle = 'rgba(200,255,220,0.55)';
      for (let x = -r - gap + off; x < r + gap; x += gap) {
        ctx.beginPath(); ctx.moveTo(x, -r * 0.35); ctx.lineTo(x + 9, 0); ctx.lineTo(x, r * 0.35); ctx.lineTo(x - 6, r * 0.35); ctx.lineTo(x + 3, 0); ctx.lineTo(x - 6, -r * 0.35); ctx.closePath(); ctx.fill();
      }
      break;
    }
    case 'slow': {
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const ph = 1 - ((t * 0.25 + i / 4) % 1);
        ctx.strokeStyle = `rgba(220,190,255,${0.55 * (1 - ph) + 0.1})`;
        ctx.beginPath(); ctx.arc(sx, sy, r * ph, 0, Math.PI * 2); ctx.stroke();
      }
      // aiguille d'horloge lente
      ctx.strokeStyle = 'rgba(240,225,255,0.8)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      const ha = t * 0.4;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(ha) * r * 0.5, sy + Math.sin(ha) * r * 0.5); ctx.stroke();
      ctx.fillStyle = 'rgba(240,225,255,0.9)'; ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'damage': {
      const pulse = 0.5 + 0.5 * Math.sin(t * 5);
      const hg = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
      hg.addColorStop(0, `rgba(255,240,160,${0.35 + 0.25 * pulse})`); hg.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.fillStyle = hg; ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
      ctx.strokeStyle = 'rgba(60,10,0,0.55)'; ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        let a = rnd() * Math.PI * 2, px = sx, py = sy;
        ctx.beginPath(); ctx.moveTo(px, py);
        for (let k = 0; k < 3; k++) { a += (rnd() - 0.5) * 1.2; px += Math.cos(a) * r * 0.33; py += Math.sin(a) * r * 0.33; ctx.lineTo(px, py); }
        ctx.stroke();
      }
      for (let i = 0; i < 8; i++) {
        const ex = sx + (rnd() - 0.5) * r * 1.6;
        const ph = (t * (0.5 + rnd() * 0.5) + rnd()) % 1;
        const ey = sy + r * 0.8 - ph * r * 1.6;
        ctx.fillStyle = `rgba(255,${170 + Math.floor(80 * (1 - ph))},60,${1 - ph})`;
        ctx.beginPath(); ctx.arc(ex, ey, 1.8, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'invertH': case 'invertV': {
      ctx.translate(sx, sy); if (z.terrainType === 'invertV') ctx.rotate(Math.PI / 2);
      const sw = Math.sin(t * 2.5) * r * 0.18;
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-r * 0.45 + sw, -6); ctx.lineTo(r * 0.4 + sw, -6); ctx.stroke();
      drawArrowHead(ctx, r * 0.45 + sw, -6, 0, 9);
      ctx.beginPath(); ctx.moveTo(r * 0.45 - sw, 6); ctx.lineTo(-r * 0.4 - sw, 6); ctx.stroke();
      drawArrowHead(ctx, -r * 0.45 - sw, 6, Math.PI, 9);
      break;
    }
    default: break;
  }
  ctx.restore();

  // Bord lumineux
  ctx.strokeStyle = st.rim; ctx.lineWidth = 2.5;
  ctx.shadowColor = st.glow; ctx.shadowBlur = 10 + 4 * Math.sin(t * 3);
  ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
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
  renderBackground(ctx, camera, world.room, world.theme, world.zoom, world);
  renderIslandUnderside(ctx, camera, world);
  if (world.hubDoors) {
    renderHubFloor(ctx, camera, world);
    renderHubDoors(ctx, camera, world);
    renderHubDecorIcons(ctx, camera, world);
  }
  renderDecorations(ctx, camera, world);
  renderIslandRims(ctx, camera, world);
  renderTerrainZones(ctx, camera, world.room);
  renderParkourMarks(ctx, camera, world);
  renderObstacles(ctx, camera, world.room, world.theme);
  renderParkourLasers(ctx, camera, world);
  drawWinds(ctx, camera, world);
  drawZones(ctx, camera, world);
  renderHazardsGround(ctx, camera, world);
  drawWalls(ctx, camera, world);
  drawMines(ctx, camera, world);
  drawMeteors(ctx, camera, world);
  drawShields(ctx, camera, world);
  renderEnemies(ctx, camera, world);
  drawProjectiles(ctx, camera, world);
  renderHazardsTop(ctx, camera, world);
  if (world.player) drawPlayer(ctx, camera, world, world.player);
  Particles.render(ctx, camera);
  if (Game.state === STATE.CHALLENGE_EDITOR) Editor.renderOverlay(ctx, camera, world);
}
