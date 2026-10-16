// Porte de sortie des salles (facon Hades) : une vraie porte a deux battants, au milieu du bord
// DROIT de la salle.
// Fermee tant qu'il reste des ennemis ; une fois la salle videe elle s'ouvre, et il faut la
// traverser pour passer a la salle suivante (Monde, defis, coop en ligne, Fracas Infini).

const EXIT_DOOR_W = 34, EXIT_DOOR_H = 108;
const EXIT_CLEARANCE = 140; // zone devant la porte gardee libre (obstacles, tourelles)

function makeRoomExit(room) {
  const b = room.bounds;
  return { x: b.x + b.w - EXIT_DOOR_W / 2, y: b.y + b.h / 2, w: EXIT_DOOR_W, h: EXIT_DOOR_H, open: false, openT: 0 };
}
function ensureRoomExit(room) {
  if (room && !room.exit) room.exit = makeRoomExit(room);
  return room ? room.exit : null;
}
// Rectangle devant la porte : aucun obstacle ne doit s'y trouver.
function exitClearRect(bounds) {
  return { x: bounds.x + bounds.w - EXIT_CLEARANCE, y: bounds.y + bounds.h / 2 - EXIT_DOOR_H, w: EXIT_CLEARANCE, h: EXIT_DOOR_H * 2 };
}
function exitAvoidPoint(bounds) { return { x: bounds.x + bounds.w - 40, y: bounds.y + bounds.h / 2, r: 130 }; }

// Hitbox de la porte : les troncons de mur + piliers de part et d'autre sont solides, les battants
// fermes bloquent le passage, et une fois ouverts ils restent plaques contre le mur interieur.
function exitColliders(room) {
  const ex = room && room.exit;
  if (!ex) return null;
  const key = (ex.open ? 1 : 0) + ':' + ex.x + ':' + ex.y;
  if (ex._col && ex._colKey === key) return ex._col;
  const right = room.bounds.x + room.bounds.w, hh = ex.h / 2;
  const x0 = ex.x - 15, wOut = right - x0 + 40;
  const col = [
    { x: x0, y: ex.y - hh - 70, w: wOut, h: 70, exitPart: true }, // mur + pilier du haut
    { x: x0, y: ex.y + hh, w: wOut, h: 70, exitPart: true },      // mur + pilier du bas
  ];
  if (!ex.open) col.push({ x: ex.x - 8, y: ex.y - hh, w: right - (ex.x - 8) + 40, h: ex.h, exitPart: true });
  else {
    const L = hh - 1; // battants pivotes de ~82 degres, contre le mur
    col.push({ x: ex.x - 2 - L, y: ex.y - hh - 4, w: L, h: 13, exitPart: true });
    col.push({ x: ex.x - 2 - L, y: ex.y + hh - 9, w: L, h: 13, exitPart: true });
  }
  ex._col = col; ex._colKey = key;
  return col;
}
// Tout ce qui est solide dans la salle pour les deplacements (obstacles + porte).
function roomSolids(room) {
  const col = exitColliders(room);
  return col ? room.obstacles.concat(col) : room.obstacles;
}

function openRoomExit(world) {
  const ex = ensureRoomExit(world.room);
  if (!ex || ex.open) return;
  ex.open = true;
  ex.openT = 0;
  // les battants s'ouvrent : un peu de poussiere, bruit sourd (pas d'effet lumineux)
  Particles.burst(ex.x - 14, ex.y, 18, '#b8a98c', { maxSpeed: 90, life: 0.6 });
  Audio2.doorOpen();
}

function updateRoomExit(world, dt) {
  const ex = world.room && world.room.exit;
  if (ex && ex.open) ex.openT += dt;
}

// Joueur qui traverse la porte ouverte (en coop : n'importe lequel des joueurs).
function playerAtExit(world) {
  const ex = world.room && world.room.exit;
  if (!ex || !ex.open) return null;
  const b = world.room.bounds;
  return worldPlayers(world).find((p) => !p.airborne && p.x >= b.x + b.w - 50 && Math.abs(p.y - ex.y) <= ex.h / 2 + 8) || null;
}

// Vraie porte (vue de dessus) : encadrement de pierre pris dans un bout de mur, deux battants en
// bois cercles de fer. Fermee : battants joints + cadenas. Ouverte : les battants pivotent sur
// leurs gonds vers la salle et laissent voir le passage ; panneau "SORTIE" a cote.
function drawRoomExit(ctx, camera, world) {
  const ex = world.room && world.room.exit;
  if (!ex) return;
  const sx = ex.x - camera.x, sy = ex.y - camera.y;
  const hh = ex.h / 2;
  const k = ex.open ? Math.min(1, ex.openT / 0.6) : 0;
  const swing = (1 - Math.pow(1 - k, 3)) * (Math.PI / 180) * 82; // ouverture amortie
  ctx.save();
  ctx.translate(sx, sy);

  // --- passage derriere la porte (sol de dalles qui s'enfonce dans l'ombre) ---
  const pass = ctx.createLinearGradient(-6, 0, 30, 0);
  pass.addColorStop(0, '#3a332c'); pass.addColorStop(1, '#0d0b0a');
  ctx.fillStyle = pass;
  ctx.fillRect(-6, -hh, 36, ex.h);
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1;
  for (let y = -hh + 18; y < hh; y += 18) { ctx.beginPath(); ctx.moveTo(-6, y); ctx.lineTo(30, y); ctx.stroke(); }
  for (let x = 6; x < 30; x += 12) { ctx.beginPath(); ctx.moveTo(x, -hh); ctx.lineTo(x, hh); ctx.stroke(); }

  // --- troncons de mur de part et d'autre (la porte est prise dans un mur) ---
  const wallPiece = (y0, y1) => {
    const g = ctx.createLinearGradient(-12, 0, 16, 0);
    g.addColorStop(0, '#7b7681'); g.addColorStop(0.5, '#5d5964'); g.addColorStop(1, '#3d3a43');
    ctx.fillStyle = g;
    ctx.fillRect(-12, y0, 28, y1 - y0);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1;
    for (let y = y0 + 14; y < y1; y += 14) { ctx.beginPath(); ctx.moveTo(-12, y); ctx.lineTo(16, y); ctx.stroke(); }
    for (let y = y0, i = 0; y < y1; y += 14, i++) { const x = i % 2 ? -2 : 6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, Math.min(y + 14, y1)); ctx.stroke(); }
    ctx.strokeRect(-12, y0, 28, y1 - y0);
  };
  wallPiece(-hh - 70, -hh - 12);
  wallPiece(hh + 12, hh + 70);

  // --- seuil ---
  ctx.fillStyle = '#8c8577';
  ctx.fillRect(-14, -hh, 6, ex.h);
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.strokeRect(-14, -hh, 6, ex.h);

  // --- battants en bois ---
  const leaf = (hingeY, dir) => {
    // dir = +1 : battant du haut (pend vers le bas) ; -1 : battant du bas
    ctx.save();
    ctx.translate(-2, hingeY);
    ctx.rotate(dir * swing); // pivote vers l'interieur de la salle (vers la gauche)
    const L = hh - 1, T = 11;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(-T / 2 + 3, dir > 0 ? 2 : -L + 2, T, L); // ombre portee
    const wood = ctx.createLinearGradient(-T / 2, 0, T / 2, 0);
    wood.addColorStop(0, '#8a5a34'); wood.addColorStop(0.5, '#a8713f'); wood.addColorStop(1, '#6a4225');
    ctx.fillStyle = wood;
    const y0 = dir > 0 ? 0 : -L;
    ctx.fillRect(-T / 2, y0, T, L);
    // planches
    ctx.strokeStyle = 'rgba(40,22,10,0.6)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-T / 6, y0); ctx.lineTo(-T / 6, y0 + L); ctx.moveTo(T / 6, y0); ctx.lineTo(T / 6, y0 + L); ctx.stroke();
    // ferrures
    ctx.fillStyle = '#3b3b42';
    for (const f of [0.18, 0.5, 0.82]) ctx.fillRect(-T / 2 - 1, y0 + L * f - 2, T + 2, 4);
    ctx.fillStyle = '#9a9aa6';
    for (const f of [0.18, 0.5, 0.82]) { ctx.beginPath(); ctx.arc(0, y0 + L * f, 1.2, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = '#2a1a0c'; ctx.lineWidth = 1.5;
    ctx.strokeRect(-T / 2, y0, T, L);
    ctx.restore();
  };
  leaf(-hh, 1);
  leaf(hh, -1);

  // --- cadenas (porte fermee) ---
  if (!ex.open) {
    ctx.save();
    ctx.translate(-10, 0);
    ctx.strokeStyle = '#3b3b42'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, -5, 5, Math.PI, 0); ctx.stroke();
    const lg = ctx.createLinearGradient(-7, -5, 7, 7);
    lg.addColorStop(0, '#e2c46a'); lg.addColorStop(1, '#8a6a1f');
    ctx.fillStyle = lg; ctx.strokeStyle = '#3a2a08'; ctx.lineWidth = 1.2;
    ctx.fillRect(-7, -5, 14, 12); ctx.strokeRect(-7, -5, 14, 12);
    ctx.fillStyle = '#2a1c05'; ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(-0.8, 0, 1.6, 4);
    ctx.restore();
  }

  // --- piliers de pierre (gonds) ---
  for (const py of [-hh - 12, hh + 12]) {
    const g = ctx.createLinearGradient(-15, py - 12, 15, py + 12);
    g.addColorStop(0, '#b3adb8'); g.addColorStop(1, '#5b5762');
    ctx.fillStyle = g; ctx.strokeStyle = '#2a2830'; ctx.lineWidth = 1.5;
    ctx.fillRect(-15, py - 12, 30, 24); ctx.strokeRect(-15, py - 12, 30, 24);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(-13, py - 10, 26, 4);
  }

  // --- panneau "SORTIE" en bois (porte ouverte) ---
  if (ex.open) {
    ctx.globalAlpha = k;
    const px = -44, py = -hh - 30;
    ctx.fillStyle = '#5a3a1e'; ctx.fillRect(px - 1, py + 8, 3, 18); // piquet
    ctx.fillStyle = '#9b6a3a'; ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px - 26, py - 9); ctx.lineTo(px + 18, py - 9); ctx.lineTo(px + 28, py); ctx.lineTo(px + 18, py + 9); ctx.lineTo(px - 26, py + 9); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff3d6'; ctx.font = '800 10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(S('exitSign'), px, py + 0.5);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
