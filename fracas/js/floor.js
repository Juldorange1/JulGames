// Sol des salles : texture riche mais DISCRETE (faible contraste, aucune petite tache vive qui
// pourrait etre confondue avec un projectile), calculee une seule fois par salle dans un canvas
// hors-ecran puis simplement recopiee a chaque frame.

const FLOOR_PALETTES = {
  prairie: { base: '#132016', base2: '#0f1a12', light: '#243d27', dark: '#0a120b', dirt: '#2e2618' },
  usine:   { base: '#131b25', base2: '#0f161e', light: '#1e2a38', dark: '#070b10', dirt: '#05080c' },
  ruines:  { base: '#1b100c', base2: '#150c09', light: '#2e1c15', dark: '#0b0605', dirt: '#2a2420' },
};

function floorBlotch(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function floorTuft(ctx, x, y, size, alpha) {
  const greens = ['#2f5634', '#386640', '#437548', '#2a4c2f', '#4d7f4c'];
  ctx.save();
  ctx.globalAlpha = alpha * 0.35;
  ctx.fillStyle = '#060c07';
  ctx.beginPath(); ctx.ellipse(x, y + 1, size * 0.9, size * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  const blades = 4 + Math.floor(Math.random() * 5);
  for (let i = 0; i < blades; i++) {
    const bx = x + (Math.random() - 0.5) * size * 1.2;
    const h = size * (0.7 + Math.random() * 0.8);
    const lean = (Math.random() - 0.5) * size * 0.9;
    ctx.strokeStyle = choice(greens);
    ctx.lineWidth = 0.9 + Math.random() * 0.8;
    ctx.beginPath(); ctx.moveTo(bx, y);
    ctx.quadraticCurveTo(bx + lean * 0.3, y - h * 0.6, bx + lean, y - h);
    ctx.stroke();
  }
  ctx.restore();
}

function floorPebble(ctx, x, y, r, base) {
  ctx.save();
  ctx.globalAlpha = 0.35; ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(x + r * 0.25, y + r * 0.35, r, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.8;
  const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  g.addColorStop(0, base.light); g.addColorStop(1, base.dark);
  ctx.fillStyle = g;
  ctx.beginPath();
  const n = 6, rot = Math.random() * 6;
  for (let i = 0; i < n; i++) {
    const a = rot + i * Math.PI * 2 / n, rr = r * (0.75 + Math.random() * 0.3);
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.75;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 0.18; ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(x - r * 0.25, y - r * 0.3, r * 0.4, r * 0.2, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function floorRng(seed) {
  let v = Math.abs(Math.floor(seed)) % 2147483647 || 1; // graine toujours positive
  return () => { v = (v * 16807) % 2147483647; return (v - 1) / 2147483646; };
}

// rng optionnel : deux appels avec la meme graine tracent exactement la meme fissure.
function floorCrack(ctx, x, y, len, width, color, alpha, rng) {
  const rand = rng || Math.random;
  ctx.save();
  ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  let a = rand() * Math.PI * 2, px = x, py = y;
  ctx.beginPath(); ctx.moveTo(px, py);
  const steps = 4 + Math.floor(rand() * 4);
  for (let i = 0; i < steps; i++) {
    a += (rand() - 0.5) * 1.1;
    px += Math.cos(a) * len / steps; py += Math.sin(a) * len / steps;
    ctx.lineTo(px, py);
    if (rand() < 0.25) { // petite ramification
      ctx.moveTo(px, py);
      const ba = a + (rand() < 0.5 ? 1 : -1) * (0.6 + rand() * 0.6);
      ctx.lineTo(px + Math.cos(ba) * len * 0.2, py + Math.sin(ba) * len * 0.2);
      ctx.moveTo(px, py);
    }
  }
  ctx.stroke();
  ctx.restore();
}

// Construit le canvas de sol d'une salle (repere : coin haut-gauche des bounds, en unites monde).
function buildRoomFloor(room, theme, decorations, res, opts) {
  const b = Object.assign({}, room.bounds);
  const maxPx = 8000000; // parcours tres longs : budget plus large, sinon sol flou
  let r = res;
  if (b.w * b.h * r * r > maxPx) r = Math.sqrt(maxPx / (b.w * b.h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(b.w * r); canvas.height = Math.ceil(b.h * r);
  const ctx = canvas.getContext('2d');
  ctx.scale(r, r);
  const W = b.w, H = b.h, area = W * H;
  const name = (theme && theme.name) || 'neutre';
  const p = FLOOR_PALETTES[name] || { base: '#13131c', base2: '#0f0f16', light: '#20202c', dark: '#08080c', dirt: '#1a1a22' };
  const rx = () => Math.random() * W, ry = () => Math.random() * H;

  // Fond : degrade doux + grandes nuances (le sol n'est jamais d'une couleur plate)
  const g = ctx.createLinearGradient(0, 0, W * 0.3, H);
  g.addColorStop(0, p.base); g.addColorStop(1, p.base2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < area / 9000; i++) floorBlotch(ctx, rx(), ry(), 40 + Math.random() * 110, Math.random() < 0.55 ? p.light : p.dark, 0.35);

  if (name === 'prairie') {
    for (let i = 0; i < area / 40000; i++) floorBlotch(ctx, rx(), ry(), 25 + Math.random() * 45, p.dirt, 0.45);
    // herbe rase : milliers de micro-traits tres peu contrastes
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < area / 160; i++) {
      const x = rx(), y = ry(), h = 2 + Math.random() * 3;
      ctx.globalAlpha = 0.18 + Math.random() * 0.2;
      ctx.strokeStyle = Math.random() < 0.5 ? '#2c4a30' : '#1f3823';
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (Math.random() - 0.5) * 2, y - h); ctx.stroke();
    }
    ctx.restore();
    // touffes regroupees en bosquets
    for (let c = 0; c < area / 30000; c++) {
      const cx = rx(), cy = ry();
      const n = 3 + Math.floor(Math.random() * 6);
      for (let i = 0; i < n; i++) floorTuft(ctx, cx + (Math.random() - 0.5) * 50, cy + (Math.random() - 0.5) * 34, 5 + Math.random() * 5, 0.75);
    }
    // petites fleurs pastel tres ternes, en grappes
    for (let c = 0; c < area / 70000; c++) {
      const cx = rx(), cy = ry(), col = choice(['#b8b08a', '#9a8fb8', '#b89494', '#a8b8c8']);
      for (let i = 0; i < 3 + Math.random() * 5; i++) {
        const fx = cx + (Math.random() - 0.5) * 30, fy = cy + (Math.random() - 0.5) * 20;
        ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = col;
        for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; ctx.beginPath(); ctx.arc(fx + Math.cos(a) * 1.3, fy + Math.sin(a) * 1.3, 1.1, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#8a7a3a'; ctx.beginPath(); ctx.arc(fx, fy, 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
    for (let i = 0; i < area / 30000; i++) floorPebble(ctx, rx(), ry(), 2 + Math.random() * 3.5, { light: '#4d5549', dark: '#1e231c' });
  } else if (name === 'usine') {
    // grandes plaques de metal posees irregulierement (pas de quadrillage)
    for (let i = 0; i < area / 26000; i++) {
      const w = 70 + Math.random() * 120, h = 50 + Math.random() * 90, x = rx() - w / 2, y = ry() - h / 2;
      ctx.save();
      ctx.globalAlpha = 0.55; ctx.fillStyle = Math.random() < 0.5 ? '#17212c' : '#111922';
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y); ctx.lineTo(x + w, y); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.stroke();
      ctx.globalAlpha = 0.5; ctx.fillStyle = '#2a3846';
      for (const [bx, by] of [[x + 5, y + 5], [x + w - 5, y + 5], [x + 5, y + h - 5], [x + w - 5, y + h - 5]]) { ctx.beginPath(); ctx.arc(bx, by, 1.6, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    // taches d'huile avec reflet irise tres leger
    for (let i = 0; i < area / 30000; i++) {
      const x = rx(), y = ry(), rr = 12 + Math.random() * 30;
      floorBlotch(ctx, x, y, rr, p.dirt, 0.75);
      ctx.save(); ctx.globalAlpha = 0.07; ctx.strokeStyle = '#9a7ad8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, y, rr * 0.55, rr * 0.4, Math.random() * 3, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    // marquages de peinture uses
    for (let i = 0; i < 2 + area / 150000; i++) {
      const x = rx(), y = ry(), horiz = Math.random() < 0.5, len = 80 + Math.random() * 160;
      ctx.save(); ctx.globalAlpha = 0.1; ctx.fillStyle = '#c8a832';
      for (let k = 0; k < len; k += 14) if (Math.random() > 0.15) { if (horiz) ctx.fillRect(x + k, y, 9, 3); else ctx.fillRect(x, y + k, 3, 9); }
      ctx.restore();
    }
    // rayures fines
    ctx.save(); ctx.globalAlpha = 0.06; ctx.strokeStyle = '#c8d8e8'; ctx.lineWidth = 0.6;
    for (let i = 0; i < area / 4000; i++) { const x = rx(), y = ry(), a = Math.random() * 6, l = 6 + Math.random() * 16; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke(); }
    ctx.restore();
  } else if (name === 'ruines') {
    for (let i = 0; i < area / 25000; i++) floorBlotch(ctx, rx(), ry(), 20 + Math.random() * 50, p.dirt, 0.4);
    // dalles fissurees
    for (let i = 0; i < area / 3500; i++) floorCrack(ctx, rx(), ry(), 25 + Math.random() * 45, 1.3, '#060302', 0.55);
    // fissures qui rougeoient faiblement (halo large tres transparent, pas de point brillant)
    for (let i = 0; i < area / 40000; i++) {
      const x = rx(), y = ry(), len = 40 + Math.random() * 60;
      const seed = Math.floor(Math.random() * 1e6) + 1;
      floorCrack(ctx, x, y, len, 6, '#ff5a1e', 0.05, floorRng(seed));
      floorCrack(ctx, x, y, len, 1.2, '#d8662a', 0.3, floorRng(seed));
    }
    for (let i = 0; i < area / 14000; i++) floorPebble(ctx, rx(), ry(), 2.5 + Math.random() * 4, { light: '#3e2a20', dark: '#140c08' });
  }

  // Decors ponctuels de la salle, dessines "a plat" dans la meme palette sourde
  for (const d of decorations) {
    const x = d.x - b.x, y = d.y - b.y, s = d.scale || 1;
    switch (d.type) {
      case 'grass': for (let i = 0; i < 4; i++) floorTuft(ctx, x + (Math.random() - 0.5) * 22 * s, y + (Math.random() - 0.5) * 14 * s, 6 * s + Math.random() * 3, 0.8); break;
      case 'rock': floorPebble(ctx, x, y, 7 * s, { light: '#555d52', dark: '#1e231c' }); break;
      case 'ashrock': floorPebble(ctx, x, y, 7 * s, { light: '#402b21', dark: '#140c08' }); break;
      case 'pipe': {
        ctx.save(); ctx.translate(x, y); ctx.rotate(d.rot || 0); ctx.globalAlpha = 0.7;
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.roundRect(-18, -3, 38, 11, 5); ctx.fill();
        const pg = ctx.createLinearGradient(0, -5, 0, 5); pg.addColorStop(0, '#34424f'); pg.addColorStop(1, '#18202a');
        ctx.fillStyle = pg; ctx.beginPath(); ctx.roundRect(-18, -5, 36, 10, 5); ctx.fill();
        ctx.fillStyle = '#243240'; ctx.fillRect(-6, -6, 4, 12); ctx.fillRect(8, -6, 4, 12);
        ctx.restore();
        break;
      }
      case 'rivet': {
        ctx.save(); ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#0c1218'; ctx.fillRect(x - 10, y - 7, 20, 14);
        ctx.strokeStyle = '#26323e'; ctx.lineWidth = 1; ctx.strokeRect(x - 10, y - 7, 20, 14);
        ctx.strokeStyle = '#1a242e';
        for (let k = -6; k <= 6; k += 4) { ctx.beginPath(); ctx.moveTo(x + k, y - 5); ctx.lineTo(x + k, y + 5); ctx.stroke(); }
        ctx.restore();
        break;
      }
      case 'stripe': {
        ctx.save(); ctx.translate(x, y); ctx.rotate(d.rot || 0); ctx.globalAlpha = 0.14;
        ctx.fillStyle = '#b8962a'; ctx.fillRect(-20, -5, 40, 10);
        ctx.fillStyle = '#0a0a0a'; for (let k = -18; k < 20; k += 9) ctx.fillRect(k, -5, 4, 10);
        ctx.restore();
        break;
      }
      case 'crack': floorCrack(ctx, x, y, 30 * s, 1.4, '#d8662a', 0.25); break;
      case 'ember': floorBlotch(ctx, x, y, 14 * s, '#8a2e10', 0.35); break;
      default: break;
    }
  }

  if (opts && opts.noEdge) return { canvas, bounds: b };
  // Ombre portee le long des murs (profondeur) : le centre, ou se deroulent les combats, reste clair
  const edge = 46;
  const shade = (x0, y0, x1, y1) => { const lg = ctx.createLinearGradient(x0, y0, x1, y1); lg.addColorStop(0, 'rgba(0,0,0,0.5)'); lg.addColorStop(1, 'rgba(0,0,0,0)'); return lg; };
  ctx.fillStyle = shade(0, 0, 0, edge); ctx.fillRect(0, 0, W, edge);
  ctx.fillStyle = shade(0, H, 0, H - edge); ctx.fillRect(0, H - edge, W, edge);
  ctx.fillStyle = shade(0, 0, edge, 0); ctx.fillRect(0, 0, edge, H);
  ctx.fillStyle = shade(W, 0, W - edge, 0); ctx.fillRect(W - edge, 0, edge, H);

  return { canvas, bounds: b };
}

function renderRoomFloor(ctx, camera, world) {
  const room = world.room;
  if (!room || world.hubDoors) return;
  // Parcours : un sol par troncon, calcule seulement quand il devient visible.
  if (room.floorRects) {
    const zoom = world.zoom || 1;
    const vw = CANVAS_W / zoom, vh = CANVAS_H / zoom;
    for (const r of room.floorRects) {
      if (r.x > camera.x + vw || r.x + r.w < camera.x || r.y > camera.y + vh || r.y + r.h < camera.y) continue;
      if (!r._floor) {
        const decos = (world.decorations || []).filter((d) => d.x > r.x && d.x < r.x + r.w && d.y > r.y && d.y < r.y + r.h);
        r._floor = buildRoomFloor({ bounds: r }, world.theme, decos, clamp(zoom, 1, 2), { noEdge: true });
      }
      ctx.drawImage(r._floor.canvas, r.x - camera.x, r.y - camera.y, r.w, r.h);
    }
    return;
  }
  let f = room._floor;
  if (!f) {
    f = buildRoomFloor(room, world.theme, world.decorations || [], clamp(world.zoom || 1, 1, 2.5));
    room._floor = f;
  }
  const b = room.bounds, b0 = f.bounds;
  ctx.save();
  ctx.beginPath(); ctx.rect(b.x - camera.x, b.y - camera.y, b.w, b.h); ctx.clip();
  ctx.drawImage(f.canvas, b0.x - camera.x, b0.y - camera.y, b0.w, b0.h);
  ctx.restore();
}
