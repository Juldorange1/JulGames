// Fonctions utilitaires generiques

function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
function randRange(lo, hi) { return lo + Math.random() * (hi - lo); }
function randInt(lo, hi) { return Math.floor(randRange(lo, hi + 1)); }
function choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pickN(arr, n) { return shuffle(arr).slice(0, Math.min(n, arr.length)); }

function circleCircle(ax, ay, ar, bx, by, br) {
  return dist2(ax, ay, bx, by) <= (ar + br) * (ar + br);
}

function circleRect(cx, cy, cr, rx, ry, rw, rh) {
  const nx = clamp(cx, rx, rx + rw);
  const ny = clamp(cy, ry, ry + rh);
  return dist2(cx, cy, nx, ny) <= cr * cr;
}

function pointInRect(px, py, rx, ry, rw, rh) {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

function formatTime(ms) {
  if (ms == null || ms < 0 || !isFinite(ms)) return '--:--.---';
  const totalMs = Math.floor(ms);
  const m = Math.floor(totalMs / 60000);
  const s = Math.floor((totalMs % 60000) / 1000);
  const cs = totalMs % 1000;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(3, '0')}`;
}

function normalize(dx, dy) {
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { x: 0, y: 0 };
  return { x: dx / len, y: dy / len };
}

function vecFromAngle(a, len = 1) { return { x: Math.cos(a) * len, y: Math.sin(a) * len }; }

function lerpAngle(a, b, t) {
  let diff = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return a + diff * t;
}

// Point d'entree le plus proche (t dans [0,1]) ou le segment (px,py)->(px+dx,py+dy) croise le cercle (cx,cy,r).
// Renvoie null si le segment ne croise pas le cercle sur ce trajet.
function segmentCircleEntry(px, py, dx, dy, cx, cy, r) {
  const fx = px - cx, fy = py - cy;
  const a = dx * dx + dy * dy;
  if (a < 1e-9) return null;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const sq = Math.sqrt(disc);
  const t1 = (-b - sq) / (2 * a);
  const t2 = (-b + sq) / (2 * a);
  if (t1 >= 0 && t1 <= 1) return t1;
  if (t2 >= 0 && t2 <= 1) return t2;
  return null;
}

let __uidCounter = 1;
function uid() { return __uidCounter++; }
