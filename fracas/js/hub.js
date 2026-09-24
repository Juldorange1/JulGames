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

// Disposition de depart : bloc de 3x3 cases. Les 5 portes + la case de depart en occupent 6.
// La liste des personnages (et l'acces a la salle de test) est dans le Repertoire.
function defaultHubLayout() {
  const cells = [];
  for (let gx = -1; gx <= 1; gx++) for (let gy = -1; gy <= 1; gy++) cells.push({ gx, gy });
  return {
    version: HUB_LAYOUT_VERSION,
    cells,
    doors: {
      world: { gx: -1, gy: -1 },
      defi: { gx: 1, gy: -1 },      // en haut a droite
      spawn: { gx: 0, gy: 0 },
      bestiary: { gx: -1, gy: 1 },  // Codex en bas a gauche
      market: { gx: 1, gy: 1 },
    },
    decor: [],
  };
}

// Les portes navigables (tout sauf "spawn", qui est un bloc principal mais pas une porte). La
// salle de test n'y figure pas : on y accede uniquement depuis la liste des personnages.
function hubKeyList() { return ['world', 'defi', 'bestiary', 'market']; }

function hubDoorMeta() {
  return {
    world: { labelKey: 'btnMonde', action: () => { Game.pendingCharSelectMode = 'expedition'; Game.setState(STATE.CHAR_SELECT); } },
    defi: { labelKey: 'btnDefi', action: () => Game.setState(STATE.CHALLENGE_SELECT) },
    bestiary: { labelKey: 'btnBestiary', action: () => Game.setState(STATE.BESTIARY) },
    market: { labelKey: 'btnFeatures', action: () => Game.setState(STATE.MARKET) }, // marche + parametres
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
  const trampolines = [], boosts = [];
  for (const d of Save.data.hub.decor) {
    if (d.type === 'trampoline') {
      const a = hubCellCenter(d.gx, d.gy), l = hubCellCenter(d.lgx, d.lgy);
      trampolines.push({ x: a.x, y: a.y, lx: l.x, ly: l.y });
      continue;
    }
    if (d.type === 'boost') { const a = hubCellCenter(d.gx, d.gy); boosts.push({ x: a.x, y: a.y, taken: false, respawn: true }); continue; }
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
  return { bounds, obstacles, doors, teleporters, winds, trampolines, boosts, spawn: spawnPos };
}

const HUB_TELEPORT_COOLDOWN_MS = 1000;

function updateHub(world, dt) {
  if (!world.player) return;
  const doors = world.hubDoors;
  if (doors) {
    for (const d of doors) {
      if (dist(world.player.x, world.player.y, d.x, d.y) <= d.r) { d.action(); return; }
    }
  }
  // Teleporteurs : au plus une teleportation par seconde (temps reel, independant de la vitesse
  // du jeu), et il faut d'abord quitter le teleporteur d'arrivee avant qu'il puisse se redeclencher
  // (sinon le joueur ferait des allers-retours en restant immobile).
  const teleporters = world.hubTeleporters;
  if (teleporters && teleporters.length) {
    const now = performance.now();
    const onPad = teleporters.find((t) => t.pairId && dist(world.player.x, world.player.y, t.x, t.y) <= HUB_CELL * 0.35);
    if (!onPad) world._teleportArmed = true;
    const ready = world._teleportArmed !== false && now - (world._lastTeleportAt || -Infinity) >= HUB_TELEPORT_COOLDOWN_MS;
    if (onPad && ready) {
      const partner = teleporters.find((o) => o.id !== onPad.id && o.pairId === onPad.pairId);
      if (partner) {
        world.player.x = partner.x; world.player.y = partner.y;
        world._lastTeleportAt = now;
        world._teleportArmed = false;
        Particles.burst(partner.x, partner.y, 20, '#7fd8ff', { maxSpeed: 160 });
        Audio2.teleport();
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
// Texture de bruit (value noise multi-octaves, raccordable) partagee par toutes les pierres.
function hubNoiseCanvas() {
  if (hubNoiseCanvas._c) return hubNoiseCanvas._c;
  const N = 256;
  const cv = document.createElement('canvas');
  cv.width = N; cv.height = N;
  const c = cv.getContext('2d');
  const img = c.createImageData(N, N);
  const rnd = floorRng(424242);
  const octave = (cell) => {
    const g = cell + 1, grid = [];
    for (let i = 0; i < g * g; i++) grid.push(rnd());
    const at = (x, y) => grid[(y % cell) * g + (x % cell)];
    return (x, y) => {
      const fx = x / N * cell, fy = y / N * cell;
      const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = at(x0, y0), b = at(x0 + 1, y0), c2 = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
      return (a + (b - a) * sx) + ((c2 + (d - c2) * sx) - (a + (b - a) * sx)) * sy;
    };
  };
  const oct = [[octave(4), 0.45], [octave(8), 0.25], [octave(16), 0.15], [octave(32), 0.1], [octave(64), 0.05]];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let v = 0;
    for (const [f, w] of oct) v += f(x, y) * w;
    const k = Math.floor(clamp(v, 0, 1) * 255);
    const i = (y * N + x) * 4;
    img.data[i] = k; img.data[i + 1] = k; img.data[i + 2] = k; img.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  hubNoiseCanvas._c = cv;
  return cv;
}

// Sol de la base : dallage de pierres taillees realiste (texture de pierre par dalle, aretes
// arrondies, relief eclaire, ombre portee dans les joints, joints sableux, usure, mousse).
// Precalcule une fois par forme de salle, ancre au monde : aucun quadrillage de cases.
function buildHubStoneFloor(minGx, maxGx, minGy, maxGy) {
  const x0 = (minGx - 0.5) * HUB_CELL, y0 = (minGy - 0.5) * HUB_CELL;
  const W = (maxGx - minGx + 1) * HUB_CELL, H = (maxGy - minGy + 1) * HUB_CELL;
  const res = 2;
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(W * res); cv.height = Math.ceil(H * res);
  const c = cv.getContext('2d');
  c.scale(res, res);
  const rnd = floorRng(Math.abs(minGx * 73 + maxGx * 31 + minGy * 17 + maxGy * 7) + 11);
  const noise = c.createPattern(hubNoiseCanvas(), 'repeat');

  // Joints : mortier sombre et sableux
  c.fillStyle = '#1b1915'; c.fillRect(0, 0, W, H);
  for (let i = 0; i < W * H / 18; i++) {
    c.fillStyle = rnd() < 0.5 ? 'rgba(120,105,80,0.25)' : 'rgba(0,0,0,0.35)';
    c.fillRect(rnd() * W, rnd() * H, 0.8, 0.8);
  }

  const stone = (px, py) => {
    // contour a coins arrondis
    const r = 3.5;
    c.beginPath();
    for (let k = 0; k < 4; k++) {
      const a = { x: px[k], y: py[k] }, b = { x: px[(k + 1) % 4], y: py[(k + 1) % 4] }, pr = { x: px[(k + 3) % 4], y: py[(k + 3) % 4] };
      const d1 = Math.hypot(a.x - pr.x, a.y - pr.y) || 1, d2 = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const p1 = { x: a.x + (pr.x - a.x) * r / d1, y: a.y + (pr.y - a.y) * r / d1 };
      const p2 = { x: a.x + (b.x - a.x) * r / d2, y: a.y + (b.y - a.y) * r / d2 };
      if (k === 0) c.moveTo(p1.x, p1.y); else c.lineTo(p1.x, p1.y);
      c.quadraticCurveTo(a.x, a.y, p2.x, p2.y);
    }
    c.closePath();
  };

  let ry = -8;
  while (ry < H + 8) {
    const rowH = 18 + rnd() * 14;
    let x = -rnd() * 30;
    while (x < W + 30) {
      const w = 20 + rnd() * 34, h = rowH;
      const gap = 2.6, j = () => (rnd() - 0.5) * 2.4;
      const px = [x + gap / 2 + j(), x + w - gap / 2 + j(), x + w - gap / 2 + j(), x + gap / 2 + j()];
      const py = [ry + gap / 2 + j(), ry + gap / 2 + j(), ry + h - gap / 2 + j(), ry + h - gap / 2 + j()];
      // teinte de la pierre (gres/granit : gris chaud a beige, parfois bleute)
      // une seule famille de teintes (pierre gris-beige), petites variations naturelles
      const v = 66 + rnd() * 26, warm = rnd() * 7;
      const base = [v + 5 + warm, v + 2 + warm * 0.6, v - 3];
      const col = (m) => `rgb(${Math.round(base[0] * m)},${Math.round(base[1] * m)},${Math.round(base[2] * m)})`;
      // ombre portee dans le joint (relief)
      c.save();
      c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 3; c.shadowOffsetX = 1.2; c.shadowOffsetY = 1.6;
      stone(px, py);
      const g = c.createLinearGradient(x, ry, x + w * 0.6, ry + h);
      g.addColorStop(0, col(1.12)); g.addColorStop(0.55, col(1)); g.addColorStop(1, col(0.82));
      c.fillStyle = g; c.fill();
      c.restore();
      // grain de la pierre (texture de bruit, decalee a chaque dalle)
      c.save();
      stone(px, py); c.clip();
      c.globalCompositeOperation = 'soft-light';
      c.globalAlpha = 0.7;
      c.translate(rnd() * 256, rnd() * 256);
      c.fillStyle = noise; c.fillRect(x - 300, ry - 300, w + 600, h + 600);
      c.setTransform(res, 0, 0, res, 0, 0);
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = 1;
      // mouchetures (mineraux)
      for (let k = 0; k < w * h / 30; k++) {
        const t = rnd();
        c.fillStyle = t < 0.45 ? 'rgba(0,0,0,0.18)' : t < 0.8 ? 'rgba(255,245,225,0.10)' : 'rgba(40,30,20,0.25)';
        c.beginPath(); c.arc(x + rnd() * w, ry + rnd() * h, 0.3 + rnd() * 0.9, 0, Math.PI * 2); c.fill();
      }
      // usure au centre (plus lisse et clair la ou l'on marche)
      const wear = c.createRadialGradient(x + w / 2, ry + h / 2, 0, x + w / 2, ry + h / 2, Math.max(w, h) * 0.6);
      wear.addColorStop(0, 'rgba(255,240,215,0.07)'); wear.addColorStop(1, 'rgba(0,0,0,0.10)');
      c.fillStyle = wear; c.fillRect(x, ry, w, h);
      // fissure fine
      if (rnd() < 0.14) {
        c.strokeStyle = 'rgba(15,10,6,0.55)'; c.lineWidth = 0.7;
        let fx = x + 6 + rnd() * (w - 12), fy = ry + 2;
        c.beginPath(); c.moveTo(fx, fy);
        for (let k = 0; k < 4; k++) { fx += (rnd() - 0.5) * 7; fy += h / 4; c.lineTo(fx, fy); }
        c.stroke();
        c.strokeStyle = 'rgba(255,240,220,0.08)'; c.beginPath(); c.moveTo(fx + 0.8, fy); c.stroke();
      }
      c.restore();
      // arete eclairee en haut/gauche
      c.save();
      stone(px, py);
      c.clip();
      c.strokeStyle = 'rgba(255,248,230,0.16)'; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(px[3], py[3]); c.lineTo(px[0], py[0]); c.lineTo(px[1], py[1]); c.stroke();
      c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(px[1], py[1]); c.lineTo(px[2], py[2]); c.lineTo(px[3], py[3]); c.stroke();
      c.restore();
      // mousse / terre dans un coin de joint
      if (rnd() < 0.1) {
        c.fillStyle = rnd() < 0.6 ? 'rgba(74,104,54,0.45)' : 'rgba(60,48,34,0.5)';
        for (let k = 0; k < 6; k++) { c.beginPath(); c.arc(px[0] + (rnd() - 0.5) * 8, py[0] + (rnd() - 0.5) * 4, 0.8 + rnd() * 1.6, 0, Math.PI * 2); c.fill(); }
      }
      x += w;
    }
    ry += rowH;
  }
  // eclairage d'ensemble : lumiere douce au centre, ombre vers les bords
  const vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(255,235,200,0.05)'); vg.addColorStop(1, 'rgba(0,0,0,0.4)');
  c.fillStyle = vg; c.fillRect(0, 0, W, H);
  return { canvas: cv, x0, y0, W, H };
}

function renderHubFloor(ctx, camera, world) {
  const occ = hubCellsSet();
  const { minGx, maxGx, minGy, maxGy } = hubBounds();
  const key = `${minGx},${maxGx},${minGy},${maxGy}`;
  if (!renderHubFloor._cache || renderHubFloor._cache.key !== key) renderHubFloor._cache = Object.assign({ key }, buildHubStoneFloor(minGx, maxGx, minGy, maxGy));
  const fl = renderHubFloor._cache;
  ctx.save();
  // decoupe : uniquement les cases possedees (un seul chemin -> pas de ligne aux frontieres)
  ctx.beginPath();
  for (let gx = minGx; gx <= maxGx; gx++) {
    for (let gy = minGy; gy <= maxGy; gy++) {
      if (!occ.has(hubCellKey(gx, gy))) continue;
      ctx.rect(gx * HUB_CELL - camera.x - HUB_CELL / 2 - 0.75, gy * HUB_CELL - camera.y - HUB_CELL / 2 - 0.75, HUB_CELL + 1.5, HUB_CELL + 1.5);
    }
  }
  ctx.clip();
  ctx.drawImage(fl.canvas, fl.x0 - camera.x, fl.y0 - camera.y, fl.W, fl.H);
  ctx.restore();
}

// Portes de la base : cercle de pierre grave, portail d'energie tourbillonnant a la couleur du
// menu, runes qui tournent, icone du menu au centre et plaque de nom.
const HUB_DOOR_STYLE = {
  world: { color: [127, 216, 255], icon: 'world' },
  defi: { color: [255, 210, 61], icon: 'defi' },
  bestiary: { color: [199, 122, 255], icon: 'codex' },
  market: { color: [93, 255, 157], icon: 'gear' },
};

function drawHubDoorIcon(ctx, kind, col) {
  ctx.save();
  ctx.strokeStyle = '#fdfdff'; ctx.fillStyle = '#fdfdff'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.shadowColor = `rgb(${col.join(',')})`; ctx.shadowBlur = 10;
  if (kind === 'world') {
    // globe : cercle, meridiens, equateur
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, 5, 11, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(11, 0); ctx.moveTo(-9.5, -5.5); ctx.lineTo(9.5, -5.5); ctx.moveTo(-9.5, 5.5); ctx.lineTo(9.5, 5.5); ctx.stroke();
  } else if (kind === 'defi') {
    // trophee
    ctx.beginPath();
    ctx.moveTo(-8, -10); ctx.lineTo(8, -10); ctx.lineTo(7, -2); ctx.quadraticCurveTo(0, 6, -7, -2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(-9, -6, 4, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(9, -6, 4, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
    ctx.fillRect(-1.5, 2, 3, 5);
    ctx.fillRect(-6, 7, 12, 3);
  } else if (kind === 'codex') {
    // livre ouvert
    ctx.beginPath();
    ctx.moveTo(0, -6); ctx.quadraticCurveTo(-6, -10, -12, -8); ctx.lineTo(-12, 8); ctx.quadraticCurveTo(-6, 6, 0, 10);
    ctx.quadraticCurveTo(6, 6, 12, 8); ctx.lineTo(12, -8); ctx.quadraticCurveTo(6, -10, 0, -6); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, 10); ctx.stroke();
    ctx.lineWidth = 1.2;
    for (const y of [-3, 1, 5]) { ctx.beginPath(); ctx.moveTo(-9, y - 1); ctx.lineTo(-3, y); ctx.moveTo(3, y); ctx.lineTo(9, y - 1); ctx.stroke(); }
  } else {
    // engrenage + piece
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2, r = i % 2 ? 8 : 11;
      const px = Math.cos(a) * r, py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

const HUB_DOOR_SPIN = 0.45;      // tours de spirale (rad/s) au repos
const HUB_DOOR_SPIN_NEAR = 0.3;  // bonus quand le joueur est tout pres (juste un peu plus vite)
function renderHubDoors(ctx, camera, world) {
  const doors = world.hubDoors;
  if (!doors) return;
  const t = performance.now() / 1000;
  const dt = clamp(t - (renderHubDoors._last || t), 0, 0.05);
  renderHubDoors._last = t;
  for (const d of doors) {
    const sx = d.x - camera.x, sy = d.y - camera.y;
    const stl = HUB_DOOR_STYLE[d.key] || HUB_DOOR_STYLE.world;
    const [r, g, b] = stl.color;
    const rgba = (a) => `rgba(${r},${g},${b},${a})`;
    const R = d.r;
    const near = world.player ? clamp(1 - (Math.hypot(world.player.x - d.x, world.player.y - d.y) - R) / 120, 0, 1) : 0;
    // angle cumule : la vitesse change en douceur, sans saut de la spirale
    d._near = lerp(d._near || 0, near, clamp(dt * 3, 0, 1));
    d._spin = (d._spin || 0) + dt * (HUB_DOOR_SPIN + HUB_DOOR_SPIN_NEAR * d._near);
    ctx.save();
    ctx.translate(sx, sy);
    // halo au sol
    const halo = ctx.createRadialGradient(0, 0, R * 0.6, 0, 0, R * 1.9);
    halo.addColorStop(0, rgba(0.22 + 0.2 * near)); halo.addColorStop(1, rgba(0));
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, R * 1.9, 0, Math.PI * 2); ctx.fill();
    // anneau de pierre grave (relief)
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.arc(2, 3, R + 8, 0, Math.PI * 2); ctx.fill();
    const stone = ctx.createLinearGradient(-R, -R, R, R);
    stone.addColorStop(0, '#8d877c'); stone.addColorStop(0.5, '#5d584f'); stone.addColorStop(1, '#34312c');
    ctx.fillStyle = stone;
    ctx.beginPath(); ctx.arc(0, 0, R + 8, 0, Math.PI * 2); ctx.arc(0, 0, R - 2, 0, Math.PI * 2, true); ctx.fill();
    ctx.strokeStyle = 'rgba(255,245,225,0.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, R + 7.5, Math.PI * 1.05, Math.PI * 1.75); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.arc(0, 0, R - 1.5, Math.PI * 1.05, Math.PI * 1.75); ctx.stroke();
    // runes gravees qui s'illuminent en tournant
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2 + t * 0.25;
      const lit = 0.35 + 0.65 * Math.max(0, Math.sin(t * 2 + i * 0.9));
      ctx.save();
      ctx.rotate(a);
      ctx.translate(R + 3, 0);
      ctx.strokeStyle = rgba(0.3 + 0.6 * lit); ctx.lineWidth = 1.4;
      ctx.shadowColor = rgba(1); ctx.shadowBlur = 6 * lit;
      ctx.beginPath();
      if (i % 3 === 0) { ctx.moveTo(-2.5, -2); ctx.lineTo(2.5, 0); ctx.lineTo(-2.5, 2); }
      else if (i % 3 === 1) { ctx.moveTo(0, -2.5); ctx.lineTo(0, 2.5); ctx.moveTo(-2, -1); ctx.lineTo(2, 1); }
      else { ctx.arc(0, 0, 2, 0, Math.PI * 2); }
      ctx.stroke();
      ctx.restore();
    }
    // portail : fond sombre + tourbillon d'energie
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    core.addColorStop(0, rgba(0.55 + 0.25 * near)); core.addColorStop(0.45, `rgba(${r * 0.35 | 0},${g * 0.35 | 0},${b * 0.45 | 0},0.9)`); core.addColorStop(1, 'rgba(8,10,20,0.95)');
    ctx.fillStyle = core; ctx.beginPath(); ctx.arc(0, 0, R - 2, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, R - 2, 0, Math.PI * 2); ctx.clip();
    ctx.lineCap = 'round';
    for (let k = 0; k < 4; k++) {
      ctx.save();
      ctx.rotate(d._spin + k * Math.PI / 2);
      ctx.strokeStyle = rgba(0.35 + 0.2 * near); ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let s = 0; s <= 20; s++) {
        const f = s / 20, rr = f * (R - 4), a = f * 2.6;
        const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
        if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    }
    // etincelles aspirees vers le centre
    for (let k = 0; k < 6; k++) {
      const ph = ((t * 0.3 + k / 6) % 1);
      const a = k * 1.7 + d._spin;
      const rr = (1 - ph) * (R - 4);
      ctx.fillStyle = rgba(0.9 * ph);
      ctx.beginPath(); ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    // liseré lumineux interieur
    ctx.strokeStyle = rgba(0.7 + 0.3 * Math.sin(t * 3)); ctx.lineWidth = 2;
    ctx.shadowColor = rgba(1); ctx.shadowBlur = 12 + 8 * near;
    ctx.beginPath(); ctx.arc(0, 0, R - 2, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
    // icone du menu
    ctx.save();
    ctx.scale(1 + 0.08 * near, 1 + 0.08 * near);
    drawHubDoorIcon(ctx, stl.icon, stl.color);
    ctx.restore();
    ctx.restore();

    // plaque de nom
    const label = S(d.labelKey);
    ctx.save();
    ctx.font = 'bold 12px Segoe UI';
    const tw = ctx.measureText(label).width;
    const pw = tw + 22, ph = 20, px = sx - pw / 2, py = sy - R - 34;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.roundRect(px + 2, py + 3, pw, ph, 6); ctx.fill();
    const plate = ctx.createLinearGradient(0, py, 0, py + ph);
    plate.addColorStop(0, 'rgba(38,36,44,0.95)'); plate.addColorStop(1, 'rgba(18,17,22,0.95)');
    ctx.fillStyle = plate;
    ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 6); ctx.fill();
    ctx.strokeStyle = rgba(0.55 + 0.4 * near); ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = rgba(0.9); ctx.shadowBlur = 6 * near;
    ctx.fillText(label, sx, py + ph / 2 + 0.5);
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
