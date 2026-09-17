const PORTAL_COLORS = {
  wave: '#4dffc0', ufo: '#4dc9ff', ship: '#ff9d4d', ball: '#ff5d9e',
  cube: '#ffe066', robot: '#9d7bff', spider: '#ff4d4d',
};

// --- Zones de décor ---
// Le décor change au fil de la distance parcourue (pas du hasard, pas du mode de jeu), avec une
// transition en fondu entre deux zones — purement visuel, aucun impact sur la géométrie des couloirs
// ni la collision (colonnes générées indépendamment de tout ça).
const ZONE_LENGTH_UNITS = 2600;
const ZONE_BLEND_UNITS = 550;
const ZONE_THEMES = [
  { name: 'Forêt', skyTop: '#081a12', skyBottom: '#0e2b1c', silhouette: '#0c3322', shape: 'tree' },
  { name: 'Désert', skyTop: '#1c1206', skyBottom: '#2f1f0c', silhouette: '#3a2510', shape: 'dune' },
  { name: 'Glacier', skyTop: '#081420', skyBottom: '#122a3c', silhouette: '#173248', shape: 'peak' },
  { name: 'Volcan', skyTop: '#170607', skyBottom: '#2c0a0a', silhouette: '#3a1010', shape: 'ember' },
];

function pseudoRandom(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function lerpHex(hexA, hexB, t) {
  const a = hexA.replace('#', ''), b = hexB.replace('#', '');
  const ar = parseInt(a.substring(0, 2), 16), ag = parseInt(a.substring(2, 4), 16), ab = parseInt(a.substring(4, 6), 16);
  const br = parseInt(b.substring(0, 2), 16), bg = parseInt(b.substring(2, 4), 16), bb = parseInt(b.substring(4, 6), 16);
  const r = Math.round(ar + (br - ar) * t), g = Math.round(ag + (bg - ag) * t), bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}

function currentZoneBlend(camX) {
  const t = Math.max(0, camX) / ZONE_LENGTH_UNITS;
  const idx = Math.floor(t);
  const progress = t - idx;
  const a = ZONE_THEMES[idx % ZONE_THEMES.length];
  const b = ZONE_THEMES[(idx + 1) % ZONE_THEMES.length];
  const blendStart = 1 - ZONE_BLEND_UNITS / ZONE_LENGTH_UNITS;
  const blendT = progress > blendStart ? (progress - blendStart) / (1 - blendStart) : 0;
  return { a, b, blendT, zoneIndex: idx };
}

// Rendu Canvas 2D : caméra suit le joueur horizontalement, le champ de jeu occupe toute la hauteur.
function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let cssW = 0, cssH = 0, px = 1, anchorX = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cssW = canvas.clientWidth;
    cssH = canvas.clientHeight;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    px = cssH / FIELD_HEIGHT;
    anchorX = cssW * 0.27;
  }

  function worldToScreenX(wx, camX) { return anchorX + (wx - camX) * px; }
  function worldToScreenY(wy) { return wy * px; }

  function drawBackground(camX) {
    const { a, b, blendT } = currentZoneBlend(camX);
    const skyTop = blendT > 0 ? lerpHex(a.skyTop, b.skyTop, blendT) : a.skyTop;
    const skyBottom = blendT > 0 ? lerpHex(a.skyBottom, b.skyBottom, blendT) : a.skyBottom;
    const grad = ctx.createLinearGradient(0, 0, 0, cssH);
    grad.addColorStop(0, skyTop);
    grad.addColorStop(1, skyBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cssW, cssH);
    drawDecorSilhouettes(camX, a, b, blendT);
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;
    const spacing = ROW_UNIT * px;
    const offsetX = -((camX * px) % spacing);
    for (let x = offsetX; x < cssW; x += spacing) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, cssH); ctx.stroke();
    }
    for (let y = 0; y <= cssH; y += spacing) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cssW, y); ctx.stroke();
    }
  }

  // Silhouettes de décor en parallaxe (défilent plus lentement que le premier plan) — un motif par
  // thème (arbres/dunes/pics/braises), teinte mélangée en fondu à la frontière entre deux zones.
  // Purement décoratif : dessiné avant les colonnes, donc uniquement visible à travers les passages,
  // jamais interprété comme un obstacle.
  function drawDecorSilhouettes(camX, a, b, blendT) {
    const color = blendT > 0 ? lerpHex(a.silhouette, b.silhouette, blendT) : a.silhouette;
    const shape = blendT > 0.5 ? b.shape : a.shape;
    const parallax = 0.35;
    const slotWidth = 130;
    const scrollX = camX * parallax;
    const firstSlot = Math.floor((scrollX - anchorX / parallax) / slotWidth) - 1;
    const lastSlot = Math.ceil((scrollX + (cssW - anchorX) / parallax) / slotWidth) + 1;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = color;
    for (let i = firstSlot; i <= lastSlot; i++) {
      const sx = i * slotWidth - scrollX + anchorX * (1 - parallax);
      const h = 40 + pseudoRandom(i) * 90;
      const baseY = cssH * (0.32 + pseudoRandom(i * 7.3) * 0.4);
      if (shape === 'tree') {
        ctx.beginPath();
        ctx.moveTo(sx, baseY + h);
        ctx.lineTo(sx + 22, baseY);
        ctx.lineTo(sx + 44, baseY + h);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(sx + 19, baseY + h, 6, 14);
      } else if (shape === 'dune') {
        ctx.beginPath();
        ctx.moveTo(sx - 10, baseY + h);
        ctx.quadraticCurveTo(sx + 45, baseY - h * 0.5, sx + 100, baseY + h);
        ctx.lineTo(sx + 100, baseY + h + 30);
        ctx.lineTo(sx - 10, baseY + h + 30);
        ctx.closePath();
        ctx.fill();
      } else if (shape === 'peak') {
        ctx.beginPath();
        ctx.moveTo(sx, baseY + h);
        ctx.lineTo(sx + 30, baseY - h * 0.4);
        ctx.lineTo(sx + 60, baseY + h);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.moveTo(sx + 20, baseY - h * 0.1);
        ctx.lineTo(sx + 30, baseY - h * 0.4);
        ctx.lineTo(sx + 40, baseY - h * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = color;
      } else if (shape === 'ember') {
        ctx.beginPath();
        ctx.moveTo(sx, baseY + h);
        ctx.lineTo(sx + 15, baseY);
        ctx.lineTo(sx + 32, baseY + h * 0.6);
        ctx.lineTo(sx + 48, baseY);
        ctx.lineTo(sx + 62, baseY + h);
        ctx.closePath();
        ctx.fill();
        ctx.save();
        ctx.globalAlpha = 0.35 + pseudoRandom(i * 3.1) * 0.35;
        ctx.fillStyle = '#ff7a4d';
        ctx.beginPath();
        ctx.arc(sx + 30, baseY + h * 0.4, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  function drawColumns(levelGen, camX) {
    const fromX = camX - anchorX / px - COL_WIDTH;
    const toX = camX + (cssW - anchorX) / px + COL_WIDTH;
    const cols = levelGen.getColumnsInRange(fromX, toX);
    const spikeH = ROW_UNIT * 0.42;
    const isGroundMode = (m) => m === MODE_CUBE || m === MODE_ROBOT || m === MODE_SPIDER;
    for (const col of cols) {
      const x0 = worldToScreenX(col.index * COL_WIDTH, camX);
      const w = COL_WIDTH * px + 1.5;
      const topPx = worldToScreenY(col.top);
      const bottomPx = worldToScreenY(col.bottom);
      const ground = isGroundMode(col.mode);

      // Plafond : même traitement "mur" quel que soit le mode (couloir volant ou plafond au sol).
      const fadeReach = Math.min(90, topPx);
      const topGrad = ctx.createLinearGradient(0, topPx, 0, topPx - fadeReach);
      topGrad.addColorStop(0, hexToRgba(getCssVar('--wall-edge'), 0.35));
      topGrad.addColorStop(1, getCssVar('--wall'));
      ctx.fillStyle = topGrad;
      ctx.fillRect(x0, 0, w, topPx);
      const edgeColor = col.perfect ? getCssVar('--gold') : getCssVar('--wall-edge');
      ctx.fillStyle = edgeColor;
      ctx.fillRect(x0, topPx - 2, w, 2.5);
      if (col.spikeTop) drawSpikeDown(x0, topPx, w, spikeH * px);

      if (ground) {
        if (!col.isPit) {
          // Sol/plateforme solide : couleur pleine et distincte d'un mur de couloir, pour bien lire
          // "on peut se tenir dessus" plutôt que "mur à éviter".
          ctx.fillStyle = getCssVar('--ground');
          ctx.fillRect(x0, bottomPx, w, cssH - bottomPx);
          ctx.fillStyle = col.groundHazard ? getCssVar('--spike-edge') : getCssVar('--ground-edge');
          ctx.fillRect(x0, bottomPx - 2, w, 2.5);
          if (col.spikeBottom) drawSpikeUp(x0, bottomPx, w, spikeH * px * 0.85);
        }
        // Trou (isPit) : rien à dessiner, le vide se lit par l'absence de sol entre deux plateformes.
      } else {
        const fadeReachB = Math.min(90, cssH - bottomPx);
        const bottomGrad = ctx.createLinearGradient(0, bottomPx, 0, bottomPx + fadeReachB);
        bottomGrad.addColorStop(0, hexToRgba(getCssVar('--wall-edge'), 0.35));
        bottomGrad.addColorStop(1, getCssVar('--wall'));
        ctx.fillStyle = bottomGrad;
        ctx.fillRect(x0, bottomPx, w, cssH - bottomPx);
        ctx.fillStyle = edgeColor;
        ctx.fillRect(x0, bottomPx - 0.5, w, 2.5);
        if (col.spikeBottom) drawSpikeUp(x0, bottomPx, w, spikeH * px);
      }

      if (col.portalGate) {
        const color = PORTAL_COLORS[col.portalGate] || '#ffffff';
        ctx.fillStyle = hexToRgba(color, 0.32);
        ctx.fillRect(x0, topPx, w, bottomPx - topPx);
        ctx.fillStyle = hexToRgba(color, 0.85);
        ctx.fillRect(x0, topPx, Math.max(3, w * 0.12), bottomPx - topPx);
        ctx.fillRect(x0 + w - Math.max(3, w * 0.12), topPx, Math.max(3, w * 0.12), bottomPx - topPx);
        drawGateLabel(MODE_NAMES[col.portalGate] || col.portalGate, x0, w, topPx, bottomPx, color);
      }

      if (col.modifierGate) {
        const color = col.modifierGate === 'gravity' ? '#b06bff' : (col.speedMult >= 1 ? '#4dffc0' : '#ff9d4d');
        ctx.fillStyle = hexToRgba(color, 0.28);
        ctx.fillRect(x0, topPx, w, bottomPx - topPx);
        ctx.fillStyle = hexToRgba(color, 0.8);
        ctx.fillRect(x0, topPx, w, Math.max(3, (bottomPx - topPx) * 0.06));
        ctx.fillRect(x0, bottomPx - Math.max(3, (bottomPx - topPx) * 0.06), w, Math.max(3, (bottomPx - topPx) * 0.06));
        drawGateLabel(col.modifierLabel || '', x0, w, topPx, bottomPx, color);
      }

      if (col.coinSide && !col.coinCollected) {
        const coinWorldY = col.coinSide === 'top' ? col.top + COIN_WALL_OFFSET_ROWS * ROW_UNIT : col.bottom - COIN_WALL_OFFSET_ROWS * ROW_UNIT;
        drawCoinBag(x0 + w / 2, worldToScreenY(coinWorldY), ROW_UNIT * 0.3 * px);
      }
    }
  }

  // Nom écrit sur une colonne-portail (mode, gravité ou vitesse) — lecture verticale pour tenir dans
  // la largeur étroite d'une colonne, taille de police adaptée à la longueur du texte et à la place
  // verticale disponible (hauteur du couloir à cet endroit).
  function drawGateLabel(text, x0, w, topPx, bottomPx, color) {
    if (!text) return;
    const avail = Math.max(20, bottomPx - topPx);
    const fontSize = Math.max(9, Math.min(w * 0.8, avail / (text.length * 0.62)));
    ctx.save();
    ctx.translate(x0 + w / 2, (topPx + bottomPx) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = `700 ${fontSize}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#0a0d16';
    ctx.shadowColor = '#0a0d16';
    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(2, fontSize * 0.22);
    ctx.strokeStyle = 'rgba(6,8,16,0.75)';
    ctx.strokeText(text, 0, 0);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  function drawCoinBag(cx, cy, r) {
    ctx.save();
    ctx.shadowColor = getCssVar('--gold');
    ctx.shadowBlur = 10;
    // corps du sac
    ctx.fillStyle = getCssVar('--gold');
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.15, r * 0.95, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    // noeud du sac
    ctx.fillStyle = '#a9781f';
    ctx.beginPath();
    ctx.ellipse(cx, cy - r * 0.65, r * 0.38, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    // symbole €
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `${Math.max(7, r * 1.1)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('€', cx, cy + r * 0.2);
    ctx.restore();
  }

  function drawSpikeDown(x0, boundaryY, w, h) {
    ctx.fillStyle = getCssVar('--spike-edge');
    ctx.beginPath();
    ctx.moveTo(x0 + w * 0.5, boundaryY);
    ctx.lineTo(x0, boundaryY - h);
    ctx.lineTo(x0 + w, boundaryY - h);
    ctx.closePath();
    ctx.fill();
  }
  function drawSpikeUp(x0, boundaryY, w, h) {
    ctx.fillStyle = getCssVar('--spike-edge');
    ctx.beginPath();
    ctx.moveTo(x0 + w * 0.5, boundaryY);
    ctx.lineTo(x0, boundaryY + h);
    ctx.lineTo(x0 + w, boundaryY + h);
    ctx.closePath();
    ctx.fill();
  }

  function drawTrail(player, camX) {
    if (player.trail.length < 2) return;
    ctx.lineWidth = Math.max(2, PLAYER_RADIUS * 0.6 * px);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (let i = 1; i < player.trail.length; i++) {
      const a = player.trail[i - 1], b = player.trail[i];
      const alpha = i / player.trail.length;
      ctx.strokeStyle = hexToRgba(getCssVar('--theme-accent'), alpha * 0.5);
      ctx.beginPath();
      ctx.moveTo(worldToScreenX(a.x, camX), worldToScreenY(a.y));
      ctx.lineTo(worldToScreenX(b.x, camX), worldToScreenY(b.y));
      ctx.stroke();
    }
  }

  function drawPlayer(player, camX) {
    const sx = worldToScreenX(player.x, camX);
    const sy = worldToScreenY(player.y);
    const r = PLAYER_RADIUS * px;
    const squash = 1 + (player.squash || 0) * 0.35;
    const color = PORTAL_COLORS[player.mode] || getCssVar('--theme-accent');
    ctx.save();
    ctx.translate(sx, sy);
    if (player.mode === MODE_SPIDER) {
      // bascule à 180° entre le sol (pattes vers le bas) et le plafond (pattes vers le haut).
      const target = player.attachedTo === 'ceiling' ? Math.PI : 0;
      const from = target === Math.PI ? 0 : Math.PI;
      const t = Math.min(1, player.spiderVisualT || 1);
      ctx.rotate(from + (target - from) * t);
    } else if (player.mode === MODE_BALL) {
      ctx.rotate((player.x / (ROW_UNIT * 0.5)) % (Math.PI * 2));
    } else {
      ctx.rotate(player.angle);
    }
    ctx.scale(1 / squash, squash);
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.fillStyle = color;
    ctx.beginPath();
    if (player.mode === MODE_UFO) {
      // soucoupe : dôme + disque
      ctx.ellipse(0, r * 0.05, r * 1.25, r * 0.7, 0, 0, Math.PI * 2);
      ctx.moveTo(r * 0.6, -r * 0.15);
      ctx.arc(0, -r * 0.15, r * 0.6, 0, Math.PI, true);
    } else if (player.mode === MODE_SHIP) {
      // vaisseau : silhouette allongée et basse
      ctx.moveTo(r * 1.7, 0);
      ctx.lineTo(-r * 0.6, r * 0.8);
      ctx.lineTo(-r * 1.5, r * 0.3);
      ctx.lineTo(-r * 1.5, -r * 0.3);
      ctx.lineTo(-r * 0.6, -r * 0.8);
      ctx.closePath();
    } else if (player.mode === MODE_BALL) {
      ctx.arc(0, 0, r * 1.05, 0, Math.PI * 2);
    } else if (player.mode === MODE_CUBE) {
      const s = r * 0.95;
      ctx.rect(-s, -s, s * 2, s * 2);
    } else if (player.mode === MODE_ROBOT) {
      const s = r * 0.85;
      ctx.rect(-s, -s * 0.9, s * 2, s * 1.9); // corps
      ctx.rect(-s * 0.5, -s * 1.6, s * 1.0, s * 0.6); // "tête"/antenne
    } else if (player.mode === MODE_SPIDER) {
      // corps anguleux + pattes courtes, pointe toujours dans le sens de la surface d'attache.
      ctx.moveTo(0, -r * 1.1);
      ctx.lineTo(r * 1.0, 0);
      ctx.lineTo(0, r * 1.1);
      ctx.lineTo(-r * 1.0, 0);
      ctx.closePath();
    } else {
      ctx.moveTo(r * 1.5, 0);
      ctx.lineTo(-r * 1.0, r * 1.05);
      ctx.lineTo(-r * 0.45, 0);
      ctx.lineTo(-r * 1.0, -r * 1.05);
      ctx.closePath();
    }
    ctx.fill();
    if (player.mode === MODE_SPIDER) {
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, r * 0.18);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * r * 0.5, r * 0.6);
        ctx.lineTo(side * r * 1.5, r * 1.3);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawFloatingTexts(list, camX) {
    if (!list) return;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const ft of list) {
      const t = ft.age / ft.life;
      const alpha = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
      const yOffset = -FLOATING_TEXT_RISE_UNITS * Math.min(1, t * 1.4);
      const sx = worldToScreenX(ft.x, camX);
      const sy = worldToScreenY(ft.y + yOffset);
      ctx.font = `700 ${Math.max(13, ROW_UNIT * 0.42 * px)}px 'Segoe UI', sans-serif`;
      ctx.fillStyle = hexToRgba(ft.color, Math.max(0, Math.min(1, alpha)));
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 6;
      ctx.fillText(ft.text, sx, sy);
      ctx.shadowBlur = 0;
    }
  }

  function drawSpeedLines(camX, intensityMult) {
    const intensity = Math.min(1, Math.max(0, (intensityMult - 1) / 20));
    if (intensity <= 0.02) return;
    const count = Math.round(6 + intensity * 18);
    const spacing = cssH / count;
    ctx.strokeStyle = hexToRgba(getCssVar('--theme-accent'), 0.05 + intensity * 0.12);
    ctx.lineWidth = 1.5;
    const len = 40 + intensity * 140;
    const scroll = (camX * px * (0.6 + intensity)) % (cssW + len);
    for (let i = 0; i < count; i++) {
      const y = i * spacing + (spacing / 2);
      let x = cssW - scroll + (i % 3) * 90;
      x = ((x % (cssW + len)) + (cssW + len)) % (cssW + len) - len;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len, y);
      ctx.stroke();
    }
  }

  function drawParticles(sys, camX) {
    for (const p of sys.list) {
      const a = 1 - p.age / p.life;
      ctx.fillStyle = hexToRgba(p.color, a);
      ctx.beginPath();
      ctx.arc(worldToScreenX(p.x, camX), worldToScreenY(p.y), Math.max(0.5, p.size * px * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function frame(state2) {
    const { levelGen, player, particles, camX, shake } = state2;
    ctx.save();
    if (shake) {
      ctx.translate((Math.random() * 2 - 1) * shake, (Math.random() * 2 - 1) * shake);
    }
    drawBackground(camX);
    drawSpeedLines(camX, state2.intensityMult);
    drawColumns(levelGen, camX);
    drawParticles(particles, camX);
    drawTrail(player, camX);
    if (player.alive) drawPlayer(player, camX);
    drawFloatingTexts(state2.floatingTexts, camX);
    ctx.restore();
  }

  return { resize, frame, get px() { return px; }, get anchorX() { return anchorX; } };
}

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function hexToRgba(hex, alpha) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
