// Système de particules minimal (traînée, éclats de mort, flash Perfect).
function createParticleSystem() {
  return { list: [] };
}

function spawnParticle(sys, p) {
  sys.list.push(Object.assign({ life: 1, age: 0, vx: 0, vy: 0, size: 3, color: '#4dffc0' }, p));
  if (sys.list.length > 400) sys.list.shift();
}

function spawnBurst(sys, x, y, count, color, speed) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const s = speed * (0.3 + Math.random() * 0.7);
    spawnParticle(sys, {
      x, y,
      vx: Math.cos(angle) * s,
      vy: Math.sin(angle) * s,
      life: 0.5 + Math.random() * 0.5,
      size: 2 + Math.random() * 3,
      color,
    });
  }
}

function updateParticles(sys, dt) {
  for (let i = sys.list.length - 1; i >= 0; i--) {
    const p = sys.list[i];
    p.age += dt;
    if (p.age >= p.life) { sys.list.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= (1 - Math.min(1, dt * 2));
    p.vy *= (1 - Math.min(1, dt * 2));
  }
}
