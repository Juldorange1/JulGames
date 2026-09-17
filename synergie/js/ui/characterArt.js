// Rendu "personnage" détaillé pour le joueur et chacun des 12 archétypes d'ennemis :
// ombre au sol, dégradés de volume (lumière en haut à gauche), membres animés,
// arme/accessoire avec reflet, plutôt qu'un simple disque de couleur plat.
// Repère local : +x = direction regardée (voir CharacterArt.draw).
const CharacterArt = {
  shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = clamp((n >> 16) + amt, 0, 255), g = clamp(((n >> 8) & 255) + amt, 0, 255), b = clamp((n & 255) + amt, 0, 255);
    return `rgb(${r},${g},${b})`;
  },

  // Dégradé radial simulant une lumière venant du haut-gauche : donne du volume à
  // une tête/un torse au lieu d'un aplat de couleur.
  sphereGradient(ctx, cx, cy, r, color) {
    const g = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.45, r * 0.1, cx, cy, r * 1.2);
    g.addColorStop(0, this.shade(color, 80));
    g.addColorStop(0.45, color);
    g.addColorStop(1, this.shade(color, -55));
    return g;
  },

  limb(ctx, x1, y1, x2, y2, width, color) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  },

  // ---- Détails "créature" partagés : rendent les silhouettes moins géométriques,
  // plus organiques (yeux vivants, crocs, griffes, cicatrices/écailles). ----
  glowEye(ctx, x, y, r, color) {
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = r * 3;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(x + r * 0.25, y, r * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.22, 0, Math.PI * 2); ctx.fill();
  },

  fangs(ctx, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + size * 0.5, y); ctx.lineTo(x + size * 0.25, y + size); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x, y + size * 0.5); ctx.lineTo(x + size * 0.45, y + size * 0.5); ctx.lineTo(x + size * 0.22, y + size * 1.4); ctx.closePath(); ctx.fill();
  },

  claw(ctx, x, y, angle, size, color) {
    ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, size * 0.22); ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      const a = angle + i * 0.28;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * size, y + Math.sin(a) * size); ctx.stroke();
    }
  },

  // Petites taches/écailles/cicatrices disposées de façon stable pour CETTE entité
  // (seed = son id) : pas de scintillement d'une frame à l'autre, silhouette moins lisse.
  skinTexture(ctx, seed, r, color, count = 4) {
    let s = seed % 2147483647; if (s <= 0) s += 2147483646;
    const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
    ctx.fillStyle = color;
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2, d = rand() * r * 0.6;
      ctx.globalAlpha = 0.35 + rand() * 0.25;
      ctx.beginPath(); ctx.ellipse(Math.cos(a) * d, Math.sin(a) * d, r * (0.08 + rand() * 0.08), r * (0.05 + rand() * 0.05), a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  },

  // Ombre au sol : dessinée en amont, en repère MONDE (pas de rotation avec le
  // personnage), sinon l'ombre tournerait avec lui ce qui casse l'illusion.
  drawShadow(ctx, x, y, rx, ry) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(x, y + ry * 0.35, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  draw(ctx, entity, kind, t) {
    ctx.save();
    ctx.translate(entity.x, entity.y);
    ctx.rotate(entity.facing || 0);
    const breathe = 1 + Math.sin(t * 2.4 + (entity.animPhase || 0)) * 0.03;
    ctx.scale(breathe, breathe);
    // Élan d'attaque : une petite avancée-retour vers la cible (0.2s), commune à
    // tous les archétypes plutôt que ré-implémentée à la main dans chacun.
    const atk = entity.attackAnimTimer || 0;
    if (atk > 0) ctx.translate(Math.sin((0.2 - atk) / 0.2 * Math.PI) * (entity.radius || 15) * 0.35, 0);
    const fn = this[kind] || this.circle;
    fn.call(this, ctx, entity, t);
    // Flash de dégâts : silhouette blanche superposée, s'estompe en ~0.12s.
    const flash = entity.hitFlashTimer || 0;
    if (flash > 0) {
      ctx.globalAlpha = Math.min(1, flash / 0.12) * 0.65;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(0, 0, (entity.radius || 15) * 1.05, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  },

  // ---------------- Joueur : aventurier encapuchonné, cape, orbe d'énergie ----------------
  player(ctx, p, t) {
    const r = p.radius, phase = t * 7;
    const legSwing = p.isDashing ? 0 : Math.sin(phase) * 3;
    const base = '#6d8dff', dark = this.shade(base, -60), skin = '#e8c39e';
    // jambes (visibles sous la cape, alternent en marchant)
    this.limb(ctx, -2, r * 0.5, -2 + legSwing, r * 1.15, 4.5, this.shade(base, -35));
    this.limb(ctx, 2, r * 0.5, 2 - legSwing, r * 1.15, 4.5, this.shade(base, -45));
    // cape flottante
    ctx.fillStyle = this.shade(base, -45);
    ctx.beginPath();
    ctx.moveTo(-6, -10); ctx.quadraticCurveTo(-24, 0, -16 - Math.abs(legSwing), 16); ctx.quadraticCurveTo(-8, 6, -6, 10);
    ctx.closePath(); ctx.fill();
    // bras arrière (tient le bâton)
    this.limb(ctx, -3, -r * 0.5, r * 0.6, -r * 0.85, 4, skin);
    // torse (dégradé de volume)
    ctx.fillStyle = this.sphereGradient(ctx, 0, 0, r * 0.85, base);
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.72, r * 0.92, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 1.6; ctx.stroke();
    // ceinture
    ctx.strokeStyle = this.shade(base, -70); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-r * 0.6, r * 0.15); ctx.lineTo(r * 0.6, r * 0.15); ctx.stroke();
    // bras avant tenant l'orbe
    this.limb(ctx, 4, r * 0.35, r * 0.95, r * 0.15, 4, skin);
    // capuche
    ctx.fillStyle = this.sphereGradient(ctx, 3, 0, r * 0.56, dark);
    ctx.beginPath(); ctx.arc(3, 0, r * 0.56, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#04060a'; ctx.lineWidth = 1; ctx.stroke();
    // visage dans l'ombre de la capuche
    ctx.fillStyle = 'rgba(5,7,12,.88)';
    ctx.beginPath(); ctx.ellipse(8, 0, r * 0.3, r * 0.24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#bcd0ff';
    ctx.beginPath(); ctx.arc(11, -2.5, 1.4, 0, Math.PI * 2); ctx.arc(11, 2.5, 1.4, 0, Math.PI * 2); ctx.fill();
    // orbe d'énergie
    const pulse = 2 + Math.sin(t * 6) * 1;
    ctx.fillStyle = this.sphereGradient(ctx, r + 6, r * 0.15, 4 + pulse * 0.3, '#eef2ff');
    ctx.beginPath(); ctx.arc(r + 6, r * 0.15, 3.6 + pulse * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(232,236,244,.55)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(r + 6, r * 0.15, 7 + pulse * 0.4, 0, Math.PI * 2); ctx.stroke();
  },

  // ---------------- Ennemis ----------------
  brute(ctx, e, t) {
    const r = e.radius, c = e.color, dark = this.shade(c, -55), swing = Math.sin(t * 4 + e.animPhase) * 2;
    this.limb(ctx, -2, r * 0.55, -2 + swing, r * 1.2, 6, dark);
    this.limb(ctx, 2, r * 0.55, 2 - swing, r * 1.2, 6, this.shade(c, -45));
    // torse massif, musculeux (dégradé + cicatrices/écailles)
    ctx.fillStyle = this.sphereGradient(ctx, 0, 0, r * 0.95, c);
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.98, r * 0.88, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 2; ctx.stroke();
    this.skinTexture(ctx, e.id, r * 0.9, dark, 5);
    // ceinturon
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-r * 0.7, r * 0.2); ctx.lineTo(r * 0.7, r * 0.2); ctx.stroke();
    // tête brutale, petite vs le corps
    ctx.fillStyle = this.sphereGradient(ctx, r * 0.55, 0, r * 0.38, dark);
    ctx.beginPath(); ctx.arc(r * 0.55, 0, r * 0.38, 0, Math.PI * 2); ctx.fill();
    this.glowEye(ctx, r * 0.72, -0.13 * r, r * 0.09, '#ff5a5a');
    this.glowEye(ctx, r * 0.72, 0.13 * r, r * 0.09, '#ff5a5a');
    this.fangs(ctx, r * 0.78, r * 0.2, r * 0.22, '#f0ead6');
    // bras + massue cloutée, léger balancement
    const armSwing = Math.sin(t * 4 + e.animPhase + Math.PI) * 4;
    this.limb(ctx, r * 0.2, r * 0.5, r * 1.1, r * 0.75 + armSwing, 5, this.shade(c, -30));
    ctx.strokeStyle = '#5a4632'; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(r * 0.4, r * 0.55); ctx.lineTo(r * 1.55, r * 0.9 + armSwing); ctx.stroke();
    const hx = r * 1.55, hy = r * 0.9 + armSwing;
    ctx.fillStyle = this.sphereGradient(ctx, hx, hy, 6, '#4a3d2c');
    ctx.beginPath(); ctx.arc(hx, hy, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a8a8a';
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; ctx.beginPath(); ctx.arc(hx + Math.cos(a) * 4, hy + Math.sin(a) * 4, 1.1, 0, Math.PI * 2); ctx.fill(); }
  },

  coureur(ctx, e, t) {
    const r = e.radius, c = e.color, dark = this.shade(c, -50), swing = Math.sin(t * 12 + e.animPhase) * 4;
    ctx.save(); ctx.rotate(0.1);
    this.limb(ctx, -r * 0.3, r * 0.4, -r * 0.3 + swing, r * 1.1, 3.5, dark);
    this.limb(ctx, r * 0.1, r * 0.4, r * 0.1 - swing, r * 1.1, 3.5, this.shade(c, -35));
    ctx.fillStyle = this.sphereGradient(ctx, 0, 0, r, c);
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.68, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = this.sphereGradient(ctx, r * 0.72, -r * 0.12, r * 0.34, dark);
    ctx.beginPath(); ctx.arc(r * 0.72, -r * 0.12, r * 0.34, 0, Math.PI * 2); ctx.fill();
    this.glowEye(ctx, r * 0.88, -0.18 * r, r * 0.07, '#ffe27a');
    // deux poignards
    ctx.strokeStyle = '#cfd6e0'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(r * 0.3, -r * 0.55); ctx.lineTo(r * 1.2, -r * 0.85); ctx.moveTo(r * 0.3, r * 0.4); ctx.lineTo(r * 1.1, r * 0.65); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = c; ctx.globalAlpha = 0.35; ctx.lineWidth = 2;
    for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(-r * i * 0.9, -3 + i * 2); ctx.lineTo(-r * (i * 0.9 + 0.7), -3 + i * 2); ctx.stroke(); }
    ctx.globalAlpha = 1;
  },

  archer(ctx, e, t) {
    const r = e.radius, c = e.color, dark = this.shade(c, -50), swing = Math.sin(t * 5 + e.animPhase) * 2;
    this.limb(ctx, -1, r * 0.45, -1 + swing, r * 1.15, 3.5, this.shade(c, -35));
    this.limb(ctx, 3, r * 0.45, 3 - swing, r * 1.15, 3.5, dark);
    // cape courte + tunique triangulaire (dégradé)
    const grad = ctx.createLinearGradient(0, -r, 0, r);
    grad.addColorStop(0, this.shade(c, 40)); grad.addColorStop(1, dark);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.moveTo(-r * 0.7, r); ctx.lineTo(r * 0.7, r); ctx.lineTo(0, -r * 0.7); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 1.2; ctx.stroke();
    // carquois dans le dos
    ctx.fillStyle = '#5a4530';
    ctx.fillRect(-r * 0.9, -r * 0.5, r * 0.28, r * 0.9);
    ctx.strokeStyle = '#caa46a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-r * 0.76, -r * 0.5); ctx.lineTo(-r * 0.9, -r * 0.9); ctx.moveTo(-r * 0.62, -r * 0.5); ctx.lineTo(-r * 0.76, -r * 0.9); ctx.stroke();
    // tête
    ctx.fillStyle = this.sphereGradient(ctx, r * 0.3, -r * 0.15, r * 0.4, c);
    ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.15, r * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a2a1a'; ctx.beginPath(); ctx.arc(r * 0.44, -0.22 * r, 1.3, 0, Math.PI * 2); ctx.fill();
    // arc bandé, corde tendue vers l'arrière (tir imminent)
    ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(r * 0.6, 0, r * 0.9, -1.15, 1.15); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1;
    const bx = r * 0.6 + Math.cos(-1.15) * r * 0.9, by = Math.sin(-1.15) * r * 0.9;
    const bx2 = r * 0.6 + Math.cos(1.15) * r * 0.9, by2 = Math.sin(1.15) * r * 0.9;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(r * 1.75, 0); ctx.lineTo(bx2, by2); ctx.stroke();
    ctx.strokeStyle = '#e8c088'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(r * 0.9, 0); ctx.lineTo(r * 1.75, 0); ctx.stroke();
  },

  mage(ctx, e, t) {
    const r = e.radius, c = e.color, dark = this.shade(c, -50), sway = Math.sin(t * 2.4 + e.animPhase) * 2;
    // robe en dégradé (large en bas, étroite en haut)
    const grad = ctx.createLinearGradient(-r, 0, r, 0);
    grad.addColorStop(0, dark); grad.addColorStop(0.5, c); grad.addColorStop(1, dark);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.moveTo(-r + sway * 0.3, r); ctx.lineTo(r + sway * 0.3, r); ctx.lineTo(r * 0.3, -r * 0.9); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 1.2; ctx.stroke();
    // capuchon pointu
    ctx.fillStyle = this.sphereGradient(ctx, r * 0.3, -r * 0.4, r * 0.3, dark);
    ctx.beginPath(); ctx.moveTo(r * 0.3, -r * 0.9); ctx.lineTo(-r * 0.4, -r * 0.05); ctx.lineTo(r * 0.85, -r * 0.25); ctx.closePath(); ctx.fill();
    // yeux lumineux sous le capuchon
    ctx.fillStyle = '#e8ffff';
    ctx.beginPath(); ctx.arc(r * 0.35, -r * 0.18, 1.6, 0, Math.PI * 2); ctx.fill();
    // bâton + orbe flottant
    ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(r * 0.5, r * 0.8); ctx.lineTo(r * 1.3, -r * 0.6); ctx.stroke();
    const pulse = 1.6 + Math.sin(t * 5) * 1.1;
    ctx.fillStyle = this.sphereGradient(ctx, r * 1.3, -r * 0.7, 3 + pulse * 0.3, c);
    ctx.beginPath(); ctx.arc(r * 1.3, -r * 0.7, 2.8 + pulse * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `${c}88`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(r * 1.3, -r * 0.7, 5.5 + pulse * 0.4, 0, Math.PI * 2); ctx.stroke();
    // runes flottantes
    for (let i = 0; i < 3; i++) { const a = t * 1.6 + i * 2.1; ctx.fillStyle = c; ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 1.1, Math.sin(a) * r * 0.5, 1.4, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
  },

  tank(ctx, e, t) {
    const r = e.radius, c = e.color, dark = this.shade(c, -55), light = this.shade(c, 45);
    const grad = ctx.createLinearGradient(-r, -r, r, r);
    grad.addColorStop(0, light); grad.addColorStop(0.5, c); grad.addColorStop(1, dark);
    ctx.fillStyle = dark;
    ctx.fillRect(-r * 0.95, -r * 0.95, r * 1.9, r * 1.9);
    ctx.fillStyle = grad;
    ctx.fillRect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
    ctx.strokeStyle = light; ctx.lineWidth = 1.5;
    ctx.strokeRect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
    // rivets d'armure
    ctx.fillStyle = light;
    for (const [dx, dy] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) { ctx.beginPath(); ctx.arc(dx * r, dy * r, 1.6, 0, Math.PI * 2); ctx.fill(); }
    // éraflures de combat
    ctx.strokeStyle = dark; ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.6); ctx.lineTo(-r * 0.1, -r * 0.2); ctx.moveTo(-r * 0.15, -r * 0.65); ctx.lineTo(r * 0.05, -r * 0.25); ctx.stroke();
    ctx.globalAlpha = 1;
    // visière lumineuse
    ctx.fillStyle = '#04060a';
    ctx.fillRect(r * 0.05, -r * 0.2, r * 0.55, r * 0.4);
    ctx.fillStyle = '#ff5a4a';
    ctx.fillRect(r * 0.12, -r * 0.1, r * 0.4, r * 0.08);
    // grand bouclier avant (dégradé métallique)
    const sg = ctx.createLinearGradient(r * 0.85, -r * 0.75, r * 1.35, r * 0.75);
    sg.addColorStop(0, light); sg.addColorStop(1, dark);
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.ellipse(r * 1.1, 0, r * 0.3, r * 0.78, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#0b0e14'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.strokeStyle = light; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(r * 1.1, -r * 0.6); ctx.lineTo(r * 1.1, r * 0.6); ctx.stroke();
  },

  essaim(ctx, e, t) {
    const r = e.radius, c = e.color, bob = Math.sin(t * 10 + e.animPhase) * 1.5;
    ctx.fillStyle = this.sphereGradient(ctx, 0, bob, r, c);
    ctx.beginPath(); ctx.ellipse(0, bob, r, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = this.shade(c, -60); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.strokeStyle = this.shade(c, -60); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-2, bob - r * 0.7); ctx.lineTo(-5, bob - r * 1.3); ctx.moveTo(2, bob - r * 0.7); ctx.lineTo(5, bob - r * 1.3); ctx.stroke();
    this.glowEye(ctx, r * 0.4, bob - r * 0.12, r * 0.11, '#fff4a0');
    this.glowEye(ctx, r * 0.4, bob + r * 0.12, r * 0.11, '#fff4a0');
    this.fangs(ctx, r * 0.4, bob + r * 0.12, r * 0.18, '#3a2a10');
    // pattes minuscules
    ctx.strokeStyle = this.shade(c, -40); ctx.lineWidth = 1;
    for (const dy of [-0.5, 0.5]) { ctx.beginPath(); ctx.moveTo(-r * 0.6, bob + dy * r * 0.8); ctx.lineTo(-r * 1.1, bob + dy * r * 1.3); ctx.stroke(); }
  },

  protecteur(ctx, e, t) {
    const r = e.radius, c = e.color, dark = this.shade(c, -50);
    ctx.strokeStyle = 'rgba(52,152,219,.22)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, 0, e.behavior.auraRadius || 100, 0, Math.PI * 2); ctx.stroke();
    const legSwing = Math.sin(t * 3 + e.animPhase) * 2;
    this.limb(ctx, -1, r * 0.5, -1 + legSwing, r * 1.15, 4, dark);
    this.limb(ctx, 1, r * 0.5, 1 - legSwing, r * 1.15, 4, this.shade(c, -35));
    ctx.fillStyle = this.sphereGradient(ctx, 0, 0, r * 0.9, c);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = this.sphereGradient(ctx, r * 0.4, 0, r * 0.4, dark);
    ctx.beginPath(); ctx.arc(r * 0.4, 0, r * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7fd4ff'; ctx.beginPath(); ctx.arc(r * 0.55, -0.1 * r, 1.2, 0, Math.PI * 2); ctx.fill();
    // petit écusson tenu devant
    const sg = ctx.createLinearGradient(r * 0.5, -r * 0.5, r * 0.9, r * 0.4);
    sg.addColorStop(0, this.shade(c, 40)); sg.addColorStop(1, dark);
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.moveTo(r * 0.5, -r * 0.45); ctx.lineTo(r * 0.95, -r * 0.25); ctx.lineTo(r * 0.9, r * 0.2); ctx.lineTo(r * 0.6, r * 0.4); ctx.lineTo(r * 0.35, r * 0.05); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#eaf6ff'; ctx.lineWidth = 1; ctx.stroke();
  },

  chasseur_e(ctx, e, t) {
    const r = e.radius, c = e.color, dark = this.shade(c, -55), swing = Math.sin(t * 8 + e.animPhase) * 3;
    this.limb(ctx, -1, r * 0.4, -1 + swing, r * 1.1, 3.4, dark);
    this.limb(ctx, 2, r * 0.4, 2 - swing, r * 1.1, 3.4, this.shade(c, -35));
    ctx.fillStyle = this.sphereGradient(ctx, 0, 0, r * 0.9, dark);
    ctx.beginPath(); ctx.moveTo(-r * 0.8, r * 0.9); ctx.lineTo(r * 0.9, 0); ctx.lineTo(-r * 0.8, -r * 0.9); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#ff4757'; ctx.shadowColor = '#ff4757'; ctx.shadowBlur = 4;
    ctx.beginPath(); ctx.arc(r * 0.15, -r * 0.2, 1.7, 0, Math.PI * 2); ctx.arc(r * 0.15, r * 0.2, 1.7, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = c; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(r * 0.3, -r * 0.5); ctx.lineTo(r * 1.3, -r * 0.95); ctx.moveTo(r * 0.3, r * 0.5); ctx.lineTo(r * 1.3, r * 0.95); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(r * 0.3, -r * 0.5); ctx.lineTo(r * 1.3, -r * 0.95); ctx.stroke();
    this.claw(ctx, r * 1.3, -r * 0.95, -0.5, r * 0.3, '#e8e8e8');
    this.claw(ctx, r * 1.3, r * 0.95, 0.5, r * 0.3, '#e8e8e8');
  },

  explosif(ctx, e, t) {
    const r = e.radius, pulse = 0.5 + Math.abs(Math.sin(t * 6));
    ctx.fillStyle = this.sphereGradient(ctx, 0, 0, r, this.shade(e.color, -20));
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1a0f0c'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = `rgba(255,110,60,${0.45 + pulse * 0.5})`;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255,220,150,${0.5 + pulse * 0.5})`;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2a1a14'; ctx.lineWidth = 1.4;
    for (let i = 0; i < 6; i++) { const a = i * 1.05; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.35, Math.sin(a) * r * 0.35); ctx.lineTo(Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98); ctx.stroke(); }
    // mèche
    ctx.strokeStyle = '#caa46a'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.8); ctx.quadraticCurveTo(-r * 0.6, -r * 1.3, -r * 0.2, -r * 1.5); ctx.stroke();
    ctx.fillStyle = pulse > 1 ? '#ffdd88' : '#ff8844';
    ctx.beginPath(); ctx.arc(-r * 0.2, -r * 1.5, 1.8, 0, Math.PI * 2); ctx.fill();
  },

  parasite_e(ctx, e, t) {
    const r = e.radius, c = e.color;
    ctx.fillStyle = this.sphereGradient(ctx, 0, 0, r * 0.85, c);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = this.shade(c, -50); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + t * 1.5;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7);
      ctx.quadraticCurveTo(Math.cos(a) * r * 1.4, Math.sin(a) * r * 1.4, Math.cos(a + 0.4) * r * 1.7, Math.sin(a + 0.4) * r * 1.7);
      ctx.stroke();
    }
    this.glowEye(ctx, r * 0.35, -r * 0.12, r * 0.1, '#e8d0ff');
    this.glowEye(ctx, r * 0.35, r * 0.14, r * 0.08, '#e8d0ff');
    this.skinTexture(ctx, e.id, r * 0.8, this.shade(c, -60), 3);
  },

  invocateur(ctx, e, t) {
    const r = e.radius, c = e.color, dark = this.shade(c, -50);
    ctx.strokeStyle = 'rgba(22,160,133,.3)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, r * 0.9, r * 1.3, 0, Math.PI * 2); ctx.stroke();
    const grad = ctx.createLinearGradient(-r, 0, r, 0);
    grad.addColorStop(0, dark); grad.addColorStop(0.5, c); grad.addColorStop(1, dark);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.moveTo(-r * 0.9, r); ctx.lineTo(r * 0.9, r); ctx.lineTo(r * 0.25, -r * 0.8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = this.sphereGradient(ctx, r * 0.25, -r * 0.85, r * 0.32, dark);
    ctx.beginPath(); ctx.arc(r * 0.25, -r * 0.85, r * 0.32, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8affea'; ctx.beginPath(); ctx.arc(r * 0.36, -r * 0.9, 1.2, 0, Math.PI * 2); ctx.fill();
    const bob = Math.sin(t * 3) * 2;
    ctx.strokeStyle = `${c}55`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(r * 0.25, -r * 1.1); ctx.lineTo(r * 0.25, -r * 1.5 + bob); ctx.stroke();
    ctx.fillStyle = this.sphereGradient(ctx, r * 0.25, -r * 1.5 + bob, 3.2, c);
    ctx.beginPath(); ctx.arc(r * 0.25, -r * 1.5 + bob, 3.2, 0, Math.PI * 2); ctx.fill();
  },

  vampire(ctx, e, t) {
    const r = e.radius, c = e.color, dark = this.shade(c, -55), sway = Math.sin(t * 3 + e.animPhase) * 2;
    ctx.fillStyle = this.shade('#c0392b', -35);
    ctx.beginPath(); ctx.moveTo(-r + sway * 0.2, r * 0.9); ctx.quadraticCurveTo(-r * 0.3, 0, -r + sway * 0.2, -r * 0.9); ctx.lineTo(0, -r * 0.3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = this.sphereGradient(ctx, r * 0.15, 0, r * 0.7, dark);
    ctx.beginPath(); ctx.arc(r * 0.15, 0, r * 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1a0a0a'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#f4e4e4';
    ctx.beginPath(); ctx.ellipse(r * 0.35, 0, r * 0.32, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    this.glowEye(ctx, r * 0.48, -0.11 * r, r * 0.08, '#ff2d3a');
    this.glowEye(ctx, r * 0.48, 0.11 * r, r * 0.08, '#ff2d3a');
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(r * 0.42, r * 0.14); ctx.lineTo(r * 0.55, r * 0.32); ctx.lineTo(r * 0.32, r * 0.28); ctx.closePath(); ctx.fill();
    this.claw(ctx, -r + sway * 0.2, r * 0.75, 1.6, r * 0.28, '#e8dede');
  },

  // Ne bouge jamais : socle planté au sol, "œil" lumineux braqué sur sa cible.
  sentinelle(ctx, e, t) {
    const r = e.radius, c = e.color, dark = this.shade(c, -50), light = this.shade(c, 45);
    ctx.strokeStyle = dark; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (const dy of [-0.8, 0, 0.8]) { ctx.beginPath(); ctx.moveTo(-r * 0.3, dy * r * 0.5); ctx.lineTo(-r * 1.1, dy * r); ctx.stroke(); }
    ctx.fillStyle = this.sphereGradient(ctx, 0, 0, r * 0.85, c);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ctx.lineTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 1.6; ctx.stroke();
    const pulse = 0.5 + Math.sin(t * 4) * 0.5;
    ctx.fillStyle = this.shade('#ff5a4a', pulse * 40);
    ctx.beginPath(); ctx.arc(r * 0.35, 0, r * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = light; ctx.lineWidth = 1; ctx.stroke();
  },

  // Ne bouge jamais : gros tube incliné vers sa cible, base renforcée.
  mortier(ctx, e, t) {
    const r = e.radius, c = e.color, dark = this.shade(c, -50), light = this.shade(c, 35);
    ctx.fillStyle = this.sphereGradient(ctx, 0, 0, r * 0.95, dark);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = light;
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7, 1.8, 0, Math.PI * 2); ctx.fill(); }
    // tube
    const tubeGrad = ctx.createLinearGradient(0, -r * 0.35, r * 1.4, r * 0.35);
    tubeGrad.addColorStop(0, light); tubeGrad.addColorStop(1, dark);
    ctx.strokeStyle = tubeGrad; ctx.lineWidth = r * 0.55; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 1.3, 0); ctx.stroke();
    ctx.fillStyle = '#1a0f0a'; ctx.beginPath(); ctx.arc(r * 1.3, 0, r * 0.28, 0, Math.PI * 2); ctx.fill();
  },

  // Corps gluant qui goutte, laisse une traînée derrière lui (rendue en zone, voir
  // enemyAI.js "trail") — silhouette translucide et irrégulière.
  suintant(ctx, e, t) {
    const r = e.radius, c = e.color, wob = Math.sin(t * 5 + e.animPhase) * 0.08;
    ctx.globalAlpha = 0.88;
    ctx.fillStyle = this.sphereGradient(ctx, 0, 0, r, c);
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const a = i / 10 * Math.PI * 2;
      const rr = r * (1 + Math.sin(a * 3 + t * 4) * 0.1 + wob);
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.85);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = this.shade(c, -50); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0f2a15';
    ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.1, 1.4, 0, Math.PI * 2); ctx.arc(r * 0.3, r * 0.2, 1.4, 0, Math.PI * 2); ctx.fill();
    // goutte qui tombe
    const dripY = ((t * 40 + e.animPhase * 20) % 20);
    ctx.fillStyle = this.shade(c, -20); ctx.globalAlpha = Math.max(0, 1 - dripY / 20);
    ctx.beginPath(); ctx.arc(-r * 0.4, r * 0.6 + dripY, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  },

  // Silhouette fantomatique semi-transparente : traverse les murs (voir enemyAI.js
  // "phasing" / ignoresObstacles), contours ondulants plutôt que nets.
  spectre(ctx, e, t) {
    const r = e.radius, c = e.color, swing = Math.sin(t * 8 + e.animPhase) * 3;
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = this.sphereGradient(ctx, 0, 0, r * 0.85, c);
    ctx.beginPath();
    ctx.arc(0, -r * 0.1, r * 0.75, Math.PI, 0);
    const wave = 4;
    for (let i = 0; i <= wave; i++) {
      const x = r * 0.75 - (i / wave) * r * 1.5;
      const y = r * 0.55 + Math.sin(t * 6 + i * 1.6) * 3;
      ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = c; ctx.lineWidth = 1; ctx.stroke();
    ctx.globalAlpha = 1;
    this.glowEye(ctx, r * 0.25, -r * 0.15, r * 0.09, '#c9baff');
    this.glowEye(ctx, r * 0.25, r * 0.12, r * 0.09, '#c9baff');
    this.limb(ctx, -r * 0.2, r * 0.3, -r * 0.5 + swing, r * 0.9, 3, `${c}88`);
    this.claw(ctx, -r * 0.5 + swing, r * 0.9, 2.3, r * 0.22, `${c}aa`);
  },

  circle(ctx, e) {
    ctx.fillStyle = this.sphereGradient(ctx, 0, 0, e.radius, e.color);
    ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
  },
};
