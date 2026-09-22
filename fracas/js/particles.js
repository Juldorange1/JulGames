// Systeme de particules leger (feedback visuel)

const Particles = {
  list: [],

  spawn(x, y, opts) {
    this.list.push(Object.assign({
      x, y, vx: 0, vy: 0, life: 0.4, age: 0, r: 3, color: '#ffffff', gravity: 0, shrink: true,
    }, opts));
  },

  burst(x, y, count, color, opts) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = randRange((opts && opts.minSpeed) || 40, (opts && opts.maxSpeed) || 160);
      this.spawn(x, y, Object.assign({
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        life: randRange(0.25, 0.55), r: randRange(2, 5), color,
      }, opts));
    }
  },

  text(x, y, str, color) {
    this.list.push({ x, y, vx: 0, vy: -40, life: 0.7, age: 0, isText: true, str, color: color || '#ffffff' });
  },

  lightning(x1, y1, x2, y2, color) {
    const segs = 6;
    const points = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const px = lerp(x1, x2, t) + (i > 0 && i < segs ? randRange(-9, 9) : 0);
      const py = lerp(y1, y2, t) + (i > 0 && i < segs ? randRange(-9, 9) : 0);
      points.push({ x: px, y: py });
    }
    this.list.push({ x: x1, y: y1, vx: 0, vy: 0, life: 0.18, age: 0, isBolt: true, points, color: color || '#fff3c8' });
  },

  ring(x, y, maxRadius, color, life) {
    this.list.push({ x, y, vx: 0, vy: 0, life: life || 0.4, age: 0, isRing: true, maxRadius, color: color || '#ffffff' });
  },

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.age += dt;
      if (p.age >= p.life) { this.list.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.gravity) p.vy += p.gravity * dt;
      if (p.friction) { p.vx *= (1 - p.friction * dt); p.vy *= (1 - p.friction * dt); }
    }
  },

  render(ctx, camera) {
    for (const p of this.list) {
      const t = p.age / p.life;
      const alpha = 1 - t;
      const sx = p.x - camera.x, sy = p.y - camera.y;
      ctx.save();
      ctx.globalAlpha = clamp(alpha, 0, 1);
      if (p.isRing) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(sx, sy, p.maxRadius * t, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.isBolt) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.2;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        p.points.forEach((pt, i) => {
          const px = pt.x - camera.x, py = pt.y - camera.y;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        });
        ctx.stroke();
      } else if (p.isText) {
        ctx.fillStyle = p.color;
        ctx.font = 'bold 14px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText(p.str, sx, sy);
      } else {
        const r = p.shrink === false ? p.r : p.r * (1 - t * 0.7);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(0.5, r), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  },

  clear() { this.list.length = 0; },
};
