// ============================================================================
// ASCENSION — gen.js
// Génération infinie de niveaux, par construction "au fantôme".
//
// Un vrai AS.Player (le fantôme) joue le niveau PENDANT qu'il est construit :
// chaque saut est d'abord simulé dans le vide, on pose la plateforme là où il
// retombe, puis il exécute ce saut pour de bon. Les touches appuyées sont
// enregistrées image par image : le niveau est donc réussissable par
// construction, et chaque partie est rejouée entièrement sur sa géométrie
// finale avant d'être livrée (sinon elle est refaite).
//
// La difficulté t (0 à 1) règle surtout la MARGE EN IMAGES du saut : la
// plateforme est posée pour qu'on ne puisse se tromper que de marginFrames(t)
// images au décollage. À t = 1 cette marge tombe sous l'image : seul un bot
// passe. Le tout se règle sur les vraies valeurs de AS.CFG, donc les niveaux
// suivent automatiquement les règles du jeu.
// ============================================================================
window.AS = window.AS || {};

AS.Gen = (function () {
  const DT = 1 / 60;
  const S2 = Math.SQRT1_2;
  // 0 rien, 1 N (-z), 2 NE, 3 E, 4 SE, 5 S, 6 SO, 7 O, 8 NO
  const DIRV = [[0, 0], [0, -1], [S2, -S2], [1, 0], [S2, S2], [0, 1], [-S2, S2], [-1, 0], [-S2, -S2]];
  const HELD = 16, EDGE = 32, DASH = 64;
  const FAIL = { genFail: true };
  const NO_TOP = -1e9;
  // Images simulées entre deux rendus de main : la génération ne doit jamais
  // faire saccader la partie en cours.
  const SLICE = 40;
  const clamp = AS.Util.clamp, lerp = AS.Util.lerp;

  function hashSeed(str) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 2654435761);
      h2 = Math.imul(h2 ^ c, 1597334677);
    }
    return ((h1 ^ Math.imul(h2 ^ (h1 >>> 15), 2246822507)) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)) >>> 0;
  }

  function makeInput() {
    return {
      moveDir: new THREE.Vector3(), facingFlat: new THREE.Vector3(0, 0, -1),
      jumpHeld: false, jumpPressedEdge: false, dashPressedEdge: false, holdingIntoWall: false,
    };
  }
  function decode(code, input) {
    const d = DIRV[code & 15];
    input.moveDir.set(d[0], 0, d[1]);
    input.jumpHeld = !!(code & HELD);
    input.jumpPressedEdge = !!(code & EDGE);
    input.dashPressedEdge = !!(code & DASH);
    input.holdingIntoWall = (code & 15) !== 0;
    return input;
  }

  // ---- Courbes de difficulté ------------------------------------------------
  const marginFrames = (t) => 40 * Math.exp(-4 * t);
  const depthOf = (t) => Math.max(0.7, 7.5 * Math.exp(-2.4 * t));
  const widthOf = (t) => Math.max(0.7, 8 * Math.exp(-2.4 * t));

  // Tout l'état du joueur qui influence la suite de la simulation.
  const VEC_FIELDS = ['position', 'velocity', 'wallNormal', 'dashDir'];
  const NUM_FIELDS = ['grounded', 'groundObject', 'groundSurface', 'wallContactTimer', 'wallSliding', 'jumpsUsed',
    'coyoteTimer', 'jumpBufferTimer', 'dashActive', 'dashTimer', 'dashCharges', 'perfectWindowTimer',
    'lastImpactSpeed', 'voidY', 'yaw', 'dead'];
  function savePlayer(p) {
    const o = {};
    for (const f of VEC_FIELDS) o[f] = p[f].clone();
    for (const f of NUM_FIELDS) o[f] = p[f];
    return o;
  }
  function loadPlayer(p, o) {
    for (const f of VEC_FIELDS) p[f].copy(o[f]);
    for (const f of NUM_FIELDS) p[f] = o[f];
  }
  function copyPlayer(from, to) {
    for (const f of VEC_FIELDS) to[f].copy(from[f]);
    for (const f of NUM_FIELDS) to[f] = from[f];
  }

  // Modules de niveau : `min` = difficulté à partir de laquelle ils arrivent.
  const MODULES = [
    { id: 'hops', min: 0, w: 6 }, { id: 'stairs', min: 0, w: 3 }, { id: 'beam', min: 0, w: 2 },
    { id: 'long', min: 0.05, w: 4 }, { id: 'crumble', min: 0.04, w: 3 }, { id: 'bounce', min: 0.05, w: 3 },
    { id: 'ice', min: 0.08, w: 3 }, { id: 'boost', min: 0.1, w: 3 }, { id: 'mover', min: 0.1, w: 3 },
    { id: 'lift', min: 0.12, w: 2 }, { id: 'orbs', min: 0.15, w: 3 }, { id: 'wind', min: 0.18, w: 2 },
    { id: 'lowgrav', min: 0.18, w: 2 }, { id: 'wall', min: 0.2, w: 3 }, { id: 'gate', min: 0.22, w: 3 },
    { id: 'perfect', min: 0.28, w: 2 }, { id: 'phase', min: 0.3, w: 2 },
  ];

  // ==========================================================================
  // Flux d'une partie : opts = { seed, tAt(k, frames), targetFrames?, probe? }
  // ==========================================================================
  function createStream(opts) {
    const rng = AS.Util.mulberry32(hashSeed(String(opts.seed)));
    const R = (a, b) => a + (b - a) * rng();
    const RI = (a, b) => Math.floor(R(a, b + 1));
    const chance = (x) => rng() < x;
    const CFG = AS.CFG;
    const abilities = { doubleJump: true, wallJump: true, dash: true };

    // ---- Niveau de simulation et joueurs -----------------------------------
    const L = {
      collidables: [], crumbles: [], movers: [], triggers: [], windZones: [], gravityZones: [],
      bounceOrbs: [], orbitals: [], frame: 0,
    };
    const spawn = new THREE.Vector3(0, 0.6, 0);
    const p = new AS.Player(L, spawn, abilities);
    // Joueur d'essai : il vole dans le vide, au-dessus d'un plan infini qui
    // n'existe que quand il redescend à l'altitude visée.
    const S = {
      collidables: [], windZones: L.windZones, gravityZones: L.gravityZones, bounceOrbs: [], orbitals: [],
    };
    const s = new AS.Player(S, spawn, abilities);
    const plane = AS.World.simSolid({ type: 'normal', x: 0, y: 0, z: 0, sx: 20000, sy: 1, sz: 20000 }).mesh;
    const PLANE_ONLY = [plane], NOTHING = [];
    const inp = makeInput();

    // ---- État de construction ----------------------------------------------
    let codes = [];
    let pieces = [];
    let top = 0;              // altitude de la plateforme sous le fantôme
    let rect = null;          // sa surface
    let air = false;          // le fantôme est en l'air (après rebond, orbe, porte...)
    let plan = { h: 1, ox: 0, oz: 0, r: 0, e: 0 };
    let teleported = false;
    let runStart = null, runStartCode = 0, runDir = 1;
    const sections = [];
    let totalFrames = 0;
    let finished = false;
    const stats = { attempts: 0, rescues: 0, modFails: 0, mods: {} };

    // Échec d'une construction : le module en cours est annulé et refait.
    function bad() {
      if (opts.debug) {
        const line = (new Error().stack.split(String.fromCharCode(10))[2].match(/gen.js:(\d+)/) || [])[1];
        stats.where = stats.where || {};
        stats.where[line] = (stats.where[line] || 0) + 1;
      }
      throw FAIL;
    }

    function step(code) {
      decode(code, inp);
      p.update(DT, inp);
      teleported = AS.World.stepLevel(L, p, DT);
      codes.push(code);
      if (p.dead) bad();
    }
    const lastCode = () => (codes.length ? codes[codes.length - 1] : 0);

    // ---- Pièces --------------------------------------------------------------
    function addBox(q) {
      q.k = 'box';
      const made = AS.World.simSolid(q);
      L.collidables.push(made.mesh);
      if (q.type === 'crumble') L.crumbles.push(made.mesh);
      if (made.mover) {
        made.mover.setTime(L.frame * DT);
        L.movers.push(made.mover);
      }
      pieces.push(q);
      return made;
    }
    function addRectBox(r, topY, type, extra) {
      const sy = extra && extra.sy ? extra.sy : R(0.7, 1.3);
      return addBox(Object.assign({
        type, x: (r.x0 + r.x1) / 2, y: topY - sy / 2, z: (r.z0 + r.z1) / 2,
        sx: r.x1 - r.x0, sy, sz: r.z1 - r.z0,
      }, extra || {}));
    }
    function addSpike(x, y, z, sx, sy, sz, face) {
      return addBox({ type: 'spike', x, y, z, sx, sy, sz, spikeFace: face });
    }

    // ---- Instantanés pour revenir en arrière ---------------------------------
    function snapshot() {
      return {
        ps: savePlayer(p), frame: L.frame, nc: codes.length, np: pieces.length, top, rect, air, teleported,
        plan: Object.assign({}, plan),
        col: L.collidables.length, cru: L.crumbles.length, mov: L.movers.length, trg: L.triggers.length,
        wnd: L.windZones.length, grv: L.gravityZones.length, orb: L.bounceOrbs.length,
        crumbleState: L.crumbles.map((c) => [c.userData.crumbleState, c.userData.crumbleT, c.userData.disabled]),
        orbState: L.bounceOrbs.map((o) => o._playerWasInside),
        cooldowns: L.triggers.map((t) => t.cooldown),
      };
    }
    function restore(sn) {
      loadPlayer(p, sn.ps);
      L.frame = sn.frame;
      codes.length = sn.nc; pieces.length = sn.np;
      top = sn.top; rect = sn.rect; air = sn.air; teleported = sn.teleported;
      plan = Object.assign({}, sn.plan);
      L.collidables.length = sn.col; L.crumbles.length = sn.cru; L.movers.length = sn.mov; L.triggers.length = sn.trg;
      L.windZones.length = sn.wnd; L.gravityZones.length = sn.grv; L.bounceOrbs.length = sn.orb;
      rewindState(sn);
    }
    function rewindState(sn) {
      L.crumbles.forEach((c, i) => {
        const st = sn.crumbleState[i] || ['idle', 0, false];
        c.userData.crumbleState = st[0]; c.userData.crumbleT = st[1]; c.userData.disabled = st[2];
      });
      L.bounceOrbs.forEach((o, i) => { o._playerWasInside = sn.orbState[i] || false; });
      L.triggers.forEach((t, i) => { if (t.type === 'phaseGate') t.cooldown = sn.cooldowns[i] || 0; });
      // Deux appels : le premier recale la position, le second le déplacement
      // de l'image, dont le portage du joueur a besoin.
      for (const m of L.movers) { m.setTime((L.frame - 1) * DT); m.setTime(L.frame * DT); }
    }

    // ---- Programme de vol ----------------------------------------------------
    // Rend, à chaque image, le code à jouer selon l'état du joueur d'essai.
    function makeProg(o) {
      let i = 0, dblDone = false, dashDone = false;
      return function (pl, target) {
        const vy = pl.velocity.y, y = pl.position.y;
        let code = o.dir;
        if (o.coast && Math.hypot(pl.velocity.x, pl.velocity.z) > CFG.maxSpeed + 0.3) code = 0;
        if (i === 0 && o.jump) code = o.dir | HELD | EDGE;
        else if (vy > 0 && i < o.hold) code |= HELD;
        if (o.dashH != null && !dashDone && vy <= 0 && y <= target + o.dashH && pl.dashCharges > 0 && !pl.dashActive) {
          // Le double saut d'abord s'il est prévu : c'est lui qui donne la hauteur.
          if (o.dblH == null || dblDone) { code = (code & ~15) | o.dir | DASH; dashDone = true; }
        }
        if (o.dblH != null && !dblDone && vy <= 0 && y <= target + o.dblH && pl.jumpsUsed < 2 && !pl.dashActive) {
          code = (code & ~15) | o.dir | EDGE | HELD;
          dblDone = true;
        }
        i++;
        return code;
      };
    }

    // Simule un vol depuis l'état actuel du fantôme ; s'arrête à l'atterrissage
    // sur le plan d'altitude `target` (surface `proto`).
    function fly(o, target, proto, maxF, stopOnBounce) {
      copyPlayer(p, s);
      s.voidY = -1e9;
      S.bounceOrbs = L.bounceOrbs.slice(-6).map((q) => ({ pos: q.pos, radius: q.radius, force: q.force, _playerWasInside: q._playerWasInside }));
      if (target !== NO_TOP) {
        plane.position.set(s.position.x, target - 0.5, s.position.z);
        plane.userData = {};
        AS.World.applySurface(plane, proto || { type: 'normal' });
        plane.updateMatrixWorld(true);
      }
      const prog = makeProg(o);
      const out = [], tr = [];
      const limit = maxF || 320;
      let vyPrev = 0;
      for (let i = 0; i < limit; i++) {
        const code = prog(s, target === NO_TOP ? s.position.y - 1e6 : target);
        S.collidables = target !== NO_TOP && s.velocity.y <= 0 && s.position.y >= target - 0.5 ? PLANE_ONLY : NOTHING;
        vyPrev = s.velocity.y;
        decode(code, inp);
        s.update(DT, inp);
        out.push(code);
        tr.push(s.position.x, s.position.y, s.position.z, s.velocity.y);
        if (s.dead) return null;
        if (stopOnBounce && s.justBounced) return { codes: out, tr, open: true };
        if (target !== NO_TOP) {
          if (s.groundObject === plane) {
            const lx = s.position.x, lz = s.position.z;
            const vx = s.velocity.x, vz = s.velocity.z;
            const sp = Math.hypot(vx, vz);
            const mx = sp > 0.05 ? vx / sp : DIRV[o.dir][0], mz = sp > 0.05 ? vz / sp : DIRV[o.dir][1];
            // Recul maximal du bord arrière : avant ce point, le joueur serait
            // encore sous l'altitude d'arrivée et buterait contre le bloc.
            let maxBack = 1e9;
            for (let k = tr.length - 8; k >= 0; k -= 4) {
              if (tr[k + 1] < target + 0.15) {
                maxBack = (lx - tr[k]) * mx + (lz - tr[k + 2]) * mz - 0.9;
                break;
              }
            }
            return {
              codes: out, tr, lx, lz, vx, vz, mx, mz, speed: sp, dir: o.dir, maxBack,
              ext: sp * 0.5 / Math.max(6, Math.abs(vyPrev)),
            };
          }
          if (s.position.y < target - 2.2 && s.velocity.y < 0) return null;
        }
      }
      return target === NO_TOP ? { codes: out, tr, open: true } : null;
    }

    // Suite du vol au sol : course vers le prochain décollage.
    function contRun(hn, r, lx, lz) {
      const d = DIRV[hn];
      const tr = [];
      for (let n = 0; n < 300; n++) {
        if ((s.position.x - lx) * d[0] + (s.position.z - lz) * d[1] >= r) return { tr, frames: n };
        decode(hn, inp);
        s.update(DT, inp);
        tr.push(s.position.x, s.position.z);
        if (s.dead || !s.grounded) return null;
      }
      return null;
    }

    function pickClass(t) {
      if (t < 0.05) return 'jump';
      const hard = t * t;
      const x = rng();
      if (x < hard * 0.75) return 'dd';
      if (x < hard * 0.75 + 0.22 * Math.min(1, t * 3)) return chance(0.5) ? 'dash' : 'dbl';
      if (x < hard * 0.75 + 0.44 * Math.min(1, t * 3)) return 'dbl';
      return 'jump';
    }
    function pickDy(cls, t) {
      const up = Math.min(1, 0.55 + t);
      if (cls === 'dbl') return R(-2, 7 * up);
      if (cls === 'dash') return R(-2, 2.2);
      if (cls === 'dd') return R(-1, 5.5 * up);
      return R(-3, 3.2 * up);
    }
    function baseProg(cls, t, dir, jump) {
      const late = lerp(2.6, 0.5, t) * R(0.7, 1.3);
      const o = { dir, jump, hold: 1e9, coast: t > 0.4 && chance(0.5 + t * 0.4) };
      if (cls === 'dbl' || cls === 'dd') o.dblH = late + (cls === 'dd' ? 1.4 : 0);
      if (cls === 'dash' || cls === 'dd') o.dashH = late;
      return o;
    }
    // Aux hautes difficultés, le fantôme cherche la portée maximale : sinon un
    // humain ferait mieux que lui en utilisant ce qu'il lui reste.
    function bestFlight(cls, t, dir, jump, target, proto) {
      let best = null, bestO = null;
      const tries = t > 0.55 && cls !== 'jump' ? 6 : 1;
      for (let i = 0; i < tries; i++) {
        const o = baseProg(cls, t, dir, jump);
        if (tries > 1) {
          o.coast = i % 2 === 0;
          const h = [0.25, 0.9, 2][Math.floor(i / 2)];
          if (o.dashH != null) o.dashH = h;
          if (o.dblH != null) o.dblH = h + (cls === 'dd' ? 1.2 : 0);
        }
        const f = fly(o, target, proto);
        if (!f) continue;
        const reach = Math.hypot(f.lx - p.position.x, f.lz - p.position.z);
        if (!best || reach > best.reach) { best = f; best.reach = reach; bestO = o; }
      }
      if (best) {
        // `s` doit finir sur le vol retenu : la course au sol repart de là.
        fly(bestO, target, proto);
      }
      return best;
    }

    function nextHeading(cur, t) {
      const keep = lerp(0.35, 0.8, t);
      if (chance(keep)) return cur === 3 || cur === 7 ? 1 : cur;
      const x = rng() * 9.4;
      if (x < 5) return 1;
      if (x < 6.5) return 2;
      if (x < 8) return 8;
      return x < 8.7 ? 3 : 7;
    }

    // Décollage : court jusqu'au point prévu (éventuellement au-delà du bord,
    // dans le temps de grâce du saut).
    function* runTo() {
      const d = DIRV[plan.h];
      if (opts.probe) { runStart = savePlayer(p); runStartCode = codes.length; runDir = plan.h; }
      for (let i = 0; i < 400; i++) {
        const proj = (p.position.x - plan.ox) * d[0] + (p.position.z - plan.oz) * d[1];
        if (proj >= plan.r) break;
        if (!p.grounded && i > 0 && p.coyoteTimer <= 1.5 * DT) break;
        step(plan.h);
        if (i % SLICE === SLICE - 1) yield;
      }
      if (lastCode() & HELD) step(plan.h);
    }

    function overlaps(a, b, m) {
      return a.x0 < b.x1 + m && a.x1 > b.x0 - m && a.z0 < b.z1 + m && a.z1 > b.z0 - m;
    }

    function coyoteDist() { return CFG.maxSpeed * 5.5 / 60; }

    // Calcule la surface d'arrivée d'un vol et le prochain décollage.
    function layout(f, spec, t, speed0, target) {
      const depth = spec.d != null ? spec.d : depthOf(t) * R(0.8, 1.3);
      const w = spec.w != null ? spec.w : widthOf(t) * R(0.8, 1.3);
      const mU = marginFrames(t) * Math.max(speed0, 6) / 60 * (spec.cls === 'jump' ? 1 : 1.4);
      const ec = air ? 0 : plan.e + coyoteDist();
      // Tout en haut, le bord arrière passe même DEVANT le point d'atterrissage :
      // il ne reste que les dernières images de la chute pour l'attraper.
      const minBack = t > 0.7 && !spec.safe ? -f.ext * 0.7 * (t - 0.7) / 0.3 : 0.05;
      let back = clamp(mU - ec - f.ext, minBack, 30);
      back = Math.min(back, f.maxBack);
      if (back < minBack) return null;

      const noRun = spec.type === 'bounce' || spec.stay;
      const hn = spec.h != null ? spec.h : nextHeading(f.dir, t);
      const turn = hn !== f.dir;
      const wanted = spec.run != null ? spec.run : rng() * lerp(4, 0.3, t) + (turn ? lerp(2.5, 1.5, t) : 0);
      const fr = Math.max(wanted, depth - back);
      const ecT = clamp(0.4 * marginFrames(t) * CFG.maxSpeed / 60, 0.03, 1.6);
      const e = ecT - coyoteDist();
      const r = noRun ? 0 : Math.max(0, fr - e);
      const run = noRun ? { tr: [], frames: 0 } : contRun(hn, r, f.lx, f.lz);
      if (!run) return null;

      const d = DIRV[hn];
      const q = { x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9 };
      const add = (x, z) => {
        if (x < q.x0) q.x0 = x; if (x > q.x1) q.x1 = x;
        if (z < q.z0) q.z0 = z; if (z > q.z1) q.z1 = z;
      };
      const { lx, lz, mx, mz } = f;
      if (back > 0) add(lx, lz);
      add(lx - mx * back, lz - mz * back);
      add(lx + mx * (depth - back), lz + mz * (depth - back));
      if (spec.stay) add(lx + mx * 2.2, lz + mz * 2.2);
      add(lx - mz * w / 2, lz + mx * w / 2);
      add(lx + mz * w / 2, lz - mx * w / 2);
      const front = r + Math.min(e, 0);
      for (let i = 0; i < run.tr.length; i += 2) {
        const along = (run.tr[i] - lx) * mx + (run.tr[i + 1] - lz) * mz;
        if (along >= -back && (run.tr[i] - lx) * d[0] + (run.tr[i + 1] - lz) * d[1] <= front) add(run.tr[i], run.tr[i + 1]);
      }
      const fx = lx + d[0] * (r + e), fz = lz + d[1] * (r + e);
      add(fx, fz);
      add(fx - d[1] * w / 2, fz + d[0] * w / 2);
      add(fx + d[1] * w / 2, fz - d[0] * w / 2);
      if (spec.minSize) {
        const gx = spec.minSize - (q.x1 - q.x0), gz = spec.minSize - (q.z1 - q.z0);
        if (gx > 0) { q.x0 -= gx / 2; q.x1 += gx / 2; }
        if (gz > 0) { q.z0 -= gz / 2; q.z1 += gz / 2; }
      }
      if (back > 0 && (q.x0 > lx - 0.02 || q.x1 < lx + 0.02 || q.z0 > lz - 0.02 || q.z1 < lz + 0.02)) return null;
      if (rect && Math.abs(target - top) < 4 && overlaps(q, rect, 0.25)) return null;
      return { q, hn, r, e, dwell: run.frames };
    }

    // ---- Le saut : brique de base de tout le générateur -----------------------
    function* hop(spec) {
      spec = spec || {};
      const t = spec.t != null ? spec.t : current.t;
      if (!air) yield* runTo();
      const dir = spec.dir || plan.h;
      const speed0 = Math.hypot(p.velocity.x, p.velocity.z);
      let cls = spec.cls || (air ? (p.jumpsUsed < 2 ? 'dbl' : 'air') : pickClass(t));
      // Tout en haut, un saut simple laisserait en réserve le double saut et le
      // dash : le joueur s'en servirait pour se rattraper. Plus rien n'est gratuit.
      if (!air && !spec.safe && !spec.keepCls && t > 0.6 && chance((t - 0.6) / 0.4)) { cls = 'dd'; spec = Object.assign({}, spec, { dy: R(-1, 3) }); }
      const baseY = air ? p.position.y : top;
      const apexGain = air && p.velocity.y > 0 ? p.velocity.y * p.velocity.y / (2 * -CFG.gravityRise) : 0;
      let dy = spec.dy != null ? spec.dy : (air ? apexGain - R(0.8, 3.5) : pickDy(cls, t));
      if (air && cls === 'dbl' && spec.dy == null) dy += R(0, 3);

      for (let attempt = 0; attempt < 7; attempt++) {
        if (attempt === 4 && !air) { cls = cls === 'jump' ? 'dbl' : 'dd'; dy = R(-1, 2); }
        const target = baseY + dy;
        const proto = {
          type: spec.type || 'normal', bounceForce: spec.bounceForce, crumbleTime: 9,
          boostDir: spec.type === 'boost' ? [DIRV[spec.h][0], DIRV[spec.h][1]] : null,
        };
        const f = cls === 'air' ? fly({ dir, jump: false, hold: 1e9 }, target, proto)
          : bestFlight(cls, t, dir, !air, target, proto);
        if (f) {
          const lay = layout(f, Object.assign({ cls }, spec), t, speed0, target);
          if (lay) return yield* commit(f, lay, spec, proto, target, t);
        }
        dy = air ? dy - 1.4 : dy * 0.6 - 0.5;
        yield;
      }
      bad();
    }

    function* commit(f, lay, spec, proto, target, t) {
      const extra = {};
      const type = proto.type;
      if (spec.boxExtra) Object.assign(extra, spec.boxExtra);
      if (type === 'bounce') extra.bounceForce = proto.bounceForce;
      if (type === 'boost') extra.boostDir = proto.boostDir;
      if (type === 'crumble') extra.crumbleTime = (lay.dwell + 4) / 60 + lerp(1.2, 0.05, t);
      const made = addRectBox(lay.q, target, type, extra);
      // Le timing se joue surtout là : un couloir de pics serré sur la
      // trajectoire ne se rattrape pas avec un double saut en réserve.
      if (spec.gate) addGate(f, spec.gate, t);
      else if (t > 0.5 && !spec.safe && chance((t - 0.5) / 0.5 * 0.95)) {
        addGate(f, 'window', t);
        if (t > 0.8) addGate(f, 'window', t);
      }
      if (opts.probe) opts.probe(probeInfo(f, made.mesh, t));

      yield;
      for (let i = 0; i < f.codes.length; i++) {
        step(f.codes[i]);
        if (i % SLICE === SLICE - 1) yield;
      }
      for (let i = 0; i < 8 && p.groundObject !== made.mesh; i++) step(f.dir);
      if (p.groundObject !== made.mesh) bad();

      rect = lay.q;
      top = target;
      air = type === 'bounce';
      plan = { h: lay.hn, ox: f.lx, oz: f.lz, r: lay.r, e: lay.e };
      return { f, lay, mesh: made.mesh };
    }

    // Pour les bots de test : ce qu'il faut pour mesurer la vraie fenêtre.
    function probeInfo(f, mesh, t) {
      return { t, level: L, mesh, codes: f.codes.slice(), air, runStart, runDir, runLen: codes.length - runStartCode };
    }

    // Obstacles de pics posés sur la trajectoire exacte du vol.
    function addGate(f, kind, t) {
      const n = f.tr.length / 4;
      if (n < 24) return;
      // Dégagement : à t = 1, environ une image de jeu de chaque côté.
      const c = lerp(2.2, 0.06, Math.pow(t, 0.75));
      const k = RI(Math.floor(n * 0.3), Math.floor(n * 0.7));
      const cx = f.tr[k * 4], cz = f.tr[k * 4 + 2];
      const alongZ = Math.abs(f.mz) > Math.abs(f.mx);
      let lo = 1e9, hi = -1e9;
      const half = kind === 'ceiling' ? 2.2 : 0.5;
      for (let i = 0; i < n; i++) {
        const dist = alongZ ? Math.abs(f.tr[i * 4 + 2] - cz) : Math.abs(f.tr[i * 4] - cx);
        if (dist <= half + 0.9) {
          lo = Math.min(lo, f.tr[i * 4 + 1]);
          hi = Math.max(hi, f.tr[i * 4 + 1]);
        }
      }
      if (lo > hi) return;
      const span = lerp(6, 11, t);
      const sx = alongZ ? span : half * 2, sz = alongZ ? half * 2 : span;
      addSpike(cx, hi + CFG.playerHeight + 0.42 + c + 0.5, cz, sx, 1, sz, 'bottom');
      if (kind === 'window') addSpike(cx, lo - c - 0.5 - 0.5, cz, sx, 1, sz, 'top');
    }

    // ---- Modules ---------------------------------------------------------------
    const MOD = {
      *hops(t) { const n = RI(3, 6); for (let i = 0; i < n; i++) yield* hop(); },

      *stairs(t) {
        const n = RI(4, 7);
        const h = plan.h;
        for (let i = 0; i < n; i++) {
          yield* hop({ cls: t > 0.5 && chance(t) ? 'dbl' : 'jump', dy: R(1.2, 2.6) * (t > 0.5 ? 1.8 : 1), h, run: rng() * lerp(1.5, 0.2, t) });
        }
      },

      *long(t) {
        const n = RI(2, 3);
        for (let i = 0; i < n; i++) yield* hop({ cls: t < 0.2 ? 'dbl' : (chance(0.5) ? 'dd' : (chance(0.5) ? 'dash' : 'dbl')), dy: R(-1.5, 1.5), run: R(1, 4) });
      },

      *beam(t) {
        const h = plan.h;
        yield* hop({ w: Math.max(0.7, widthOf(t) * 0.4), run: R(8, 22), h });
        yield* hop({ h: nextHeading(h, t) });
      },

      *crumble(t) {
        const n = RI(3, 6);
        for (let i = 0; i < n; i++) yield* hop({ type: 'crumble', dy: R(-1.5, 2), run: rng() * lerp(1.5, 0.2, t) });
      },

      *ice(t) {
        const n = RI(2, 3);
        for (let i = 0; i < n; i++) yield* hop({ type: 'ice', cls: 'jump', dy: R(-2, 1.5), run: R(5, 13) });
      },

      *boost(t) {
        const h = chance(0.6) ? 1 : (chance(0.5) ? 2 : 8);
        yield* hop({ type: 'boost', h, run: R(7, 15), cls: 'jump', dy: R(-2, 1) });
        yield* hop({ cls: t > 0.5 ? 'dbl' : 'jump', dy: R(-1, 2.5) });
      },

      *bounce(t) {
        const n = RI(1, 3);
        for (let i = 0; i < n; i++) {
          yield* hop({ type: 'bounce', bounceForce: R(21, 30), dy: R(-3, 1), h: plan.h, stay: true });
          yield* hop({ dir: nextHeading(plan.h, t) });
        }
      },

      *perfect(t) {
        const h = plan.h;
        yield* hop({ cls: 'dbl', dy: R(-7, -4), run: 0.6, keepCls: true });
        yield* hop({ type: 'perfectBounce', cls: 'jump', dy: R(-4, -2), run: 0, h, minSize: 2.2, keepCls: true });
        yield* hop({ cls: 'jump', dy: R(5, 8.5), h, keepCls: true });
      },

      *orbs(t) {
        const n = RI(2, 4);
        if (!air) yield* runTo();
        for (let i = 0; i < n; i++) yield* orbStep(t, !air);
        yield* hop({ dir: plan.h });
      },

      *mover(t) { yield* moverStep(t, false); yield* hop({ cls: t > 0.6 ? 'dbl' : 'jump', dy: R(-1, 2) }); },
      *lift(t) { yield* moverStep(t, true); yield* hop({ dy: R(-2, 1.5) }); },

      *wind(t) {
        if (!air) yield* runTo();
        const d = DIRV[plan.h];
        const len = R(9, 16), wd = R(6, 9);
        const cx = p.position.x + d[0] * (len / 2 + 1), cz = p.position.z + d[1] * (len / 2 + 1);
        const hx = Math.abs(d[0]) * len / 2 + Math.abs(d[1]) * wd / 2 + 0.5;
        const hz = Math.abs(d[1]) * len / 2 + Math.abs(d[0]) * wd / 2 + 0.5;
        const up = R(9, 20);
        const side = R(-4, 4) * Math.min(1, t * 2);
        const min = [cx - hx, p.position.y - 3, cz - hz], max = [cx + hx, p.position.y + 12, cz + hz];
        const force = [d[1] * side, up, -d[0] * side];
        L.windZones.push({
          min: new THREE.Vector3(min[0], min[1], min[2]), max: new THREE.Vector3(max[0], max[1], max[2]),
          force: new THREE.Vector3(force[0], force[1], force[2]),
        });
        pieces.push({ k: 'wind', min, max, force });
        yield* hop({ cls: 'jump', dy: R(1, 5) });
      },

      *lowgrav(t) {
        if (!air) yield* runTo();
        const d = DIRV[plan.h];
        const len = R(14, 22), wd = R(7, 11);
        const cx = p.position.x + d[0] * (len / 2 + 1), cz = p.position.z + d[1] * (len / 2 + 1);
        const hx = Math.abs(d[0]) * len / 2 + Math.abs(d[1]) * wd / 2 + 0.5;
        const hz = Math.abs(d[1]) * len / 2 + Math.abs(d[0]) * wd / 2 + 0.5;
        const min = [cx - hx, p.position.y - 4, cz - hz], max = [cx + hx, p.position.y + 16, cz + hz];
        const scale = R(0.35, 0.6);
        L.gravityZones.push({ min: new THREE.Vector3(min[0], min[1], min[2]), max: new THREE.Vector3(max[0], max[1], max[2]), scale });
        pieces.push({ k: 'lowgrav', min, max, scale });
        yield* hop({ cls: 'jump', dy: R(2, 7) });
      },

      *gate(t) {
        const n = RI(2, 4);
        for (let i = 0; i < n; i++) {
          const kind = chance(0.5) ? 'window' : 'ceiling';
          yield* hop({ gate: kind, cls: chance(t) ? 'dbl' : 'jump', dy: R(-1.5, 1.5) });
        }
      },

      *phase(t) {
        if (!air) yield* runTo();
        const dir = plan.h;
        const f = fly(baseProg('jump', 0, dir, !air), NO_TOP, null, 90);
        if (!f) bad();
        let k = -1;
        for (let i = 8; i < f.tr.length / 4; i++) {
          if (f.tr[i * 4 + 3] < 1) { k = i; break; }
        }
        if (k < 0) bad();
        const d = DIRV[dir];
        const a = [f.tr[k * 4], f.tr[k * 4 + 1] + 0.5, f.tr[k * 4 + 2]];
        const dist = R(9, 18), rise = R(2, 7);
        const b = [a[0] + d[0] * dist, a[1] + rise, a[2] + d[1] * dist];
        const radius = lerp(2.2, 1.1, t);
        const pa = new THREE.Vector3(a[0], a[1], a[2]), pb = new THREE.Vector3(b[0], b[1], b[2]);
        const v = new THREE.Vector3(d[0], 0, d[1]);
        L.triggers.push({ type: 'phaseGate', pos: pa, dir: v, radius, cooldown: 0, pairPos: pb });
        L.triggers.push({ type: 'phaseGate', pos: pb, dir: v.clone().negate(), radius, cooldown: 0, pairPos: pa });
        pieces.push({ k: 'phase', a, b, dir: [d[0], d[1]], radius, color: RI(0, 5) });
        let done = false;
        for (const code of f.codes) { step(code); if (teleported) { done = true; break; } }
        if (!done) bad();
        air = true;
        yield* hop({ dir, cls: 'dbl', dy: R(-3, 1.5) });
      },

      *wall(t) {
        // Plateforme de base, cap au nord : le puits s'élève juste devant.
        yield* hop({ h: 1, stay: true, minSize: 3, dy: R(-1, 1.5), cls: 'jump', keepCls: true });
        brake();
        if (!p.grounded) bad();
        const g = R(3.2, 4.8);
        const height = R(9, 13) + t * R(6, 16);
        const len = R(4, 7);
        const cx = p.position.x, cz = p.position.z - len / 2 + 0.8;
        const wallTop = top + height;
        const midY = top - 1 + (height + 1) / 2;
        addBox({ type: 'normal', x: cx - g / 2 - 0.45, y: midY, z: cz, sx: 0.9, sy: height + 1, sz: len });
        addBox({ type: 'normal', x: cx + g / 2 + 0.45, y: midY, z: cz, sx: 0.9, sy: height + 1, sz: len });
        const contacts = { 3: [], 7: [] };
        let side = chance(0.5) ? 3 : 7;
        step(side | EDGE | HELD);
        let kicks = 0;
        while (p.position.y + 5 < wallTop) {
          let frames = 0;
          const sign = side === 3 ? -1 : 1;
          while (!(p.wallContactTimer > 0 && Math.sign(p.wallNormal.x) === sign)) {
            step(side | (p.velocity.y > 0 ? HELD : 0));
            if (++frames > 90 || p.grounded) bad();
          }
          contacts[side].push(p.position.y);
          if (lastCode() & HELD) step(side);
          side = side === 3 ? 7 : 3;
          step(side | EDGE | HELD);
          if (!p.justWallJumped) bad();
          if (++kicks > 24) bad();
        }
        // Aux hautes difficultés, les murs se couvrent de pics entre les prises.
        if (t > 0.45) {
          const clear = lerp(2.6, 0.5, t);
          [3, 7].forEach((sd) => {
            const ys = contacts[sd].sort((a, b) => a - b);
            const x = cx + (sd === 3 ? g / 2 - 0.05 : -g / 2 + 0.05);
            for (let i = 0; i + 1 < ys.length; i++) {
              const y0 = ys[i] + CFG.playerHeight + clear, y1 = ys[i + 1] - clear;
              if (y1 - y0 > 0.6) addSpike(x, (y0 + y1) / 2, cz, 0.1, y1 - y0, len, sd === 3 ? '-x' : '+x');
            }
          });
        }
        air = true;
        plan = { h: 1, ox: p.position.x, oz: p.position.z, r: 0, e: 0 };
        rect = null;
        yield* hop({ dir: 1, cls: 'dbl', dy: R(-1, 2), h: 1, minSize: 2 });
      },
    };

    function* orbStep(t, jump) {
      const o = { dir: plan.h, jump, hold: 1e9 };
      const f = fly(o, NO_TOP, null, 110);
      if (!f) bad();
      let k = -1;
      const want = R(-3, -8);
      for (let i = 6; i < f.tr.length / 4; i++) {
        if (f.tr[i * 4 + 3] < want) { k = i; break; }
      }
      if (k < 0) bad();
      const r = lerp(1.26, 0.45, t);
      const d = DIRV[plan.h];
      const lat = R(-1, 1) * r * 0.6;
      const pos = new THREE.Vector3(f.tr[k * 4] - d[1] * lat, f.tr[k * 4 + 1] - 0.2, f.tr[k * 4 + 2] + d[0] * lat);
      const force = R(19, 25);
      L.bounceOrbs.push({ pos, radius: r, force });
      pieces.push({ k: 'orb', x: pos.x, y: pos.y, z: pos.z, r, force });
      const f2 = fly(o, NO_TOP, null, 140, true);
      if (!f2 || !s.justBounced) bad();
      for (const code of f2.codes) step(code);
      if (!p.justBounced) bad();
      air = true;
      if (lastCode() & HELD) step(plan.h);
      plan.h = nextHeading(plan.h, t);
      if (plan.h === 3 || plan.h === 7) plan.h = 1;
    }

    function brake() {
      for (let i = 0; i < 50 && Math.hypot(p.velocity.x, p.velocity.z) > 1.2; i++) {
        let best = 1, bestDot = 1e9;
        for (let k = 1; k <= 8; k++) {
          const dot = p.velocity.x * DIRV[k][0] + p.velocity.z * DIRV[k][1];
          if (dot < bestDot) { bestDot = dot; best = k; }
        }
        step(best);
      }
      for (let i = 0; i < 12 && Math.hypot(p.velocity.x, p.velocity.z) > 0.05; i++) step(0);
    }

    function* moverStep(t, vertical) {
      if (!air) yield* runTo();
      const dir = plan.h;
      const speed0 = Math.hypot(p.velocity.x, p.velocity.z);
      const cls = t > 0.4 && chance(0.6) ? 'dbl' : 'jump';
      let target = 0, f = null;
      for (let i = 0; i < 4 && !f; i++) {
        target = (air ? p.position.y - 1.5 * i : top) + R(-1.5, 2 - i);
        f = fly(Object.assign(baseProg(cls, t, dir, !air), { coast: false }), target, null);
      }
      if (!f) bad();
      const mU = marginFrames(t) * Math.max(speed0, 6) / 60;
      const back = clamp(mU - (air ? 0 : plan.e + coyoteDist()) - f.ext, 0.08, Math.min(3, f.maxBack));
      const size = Math.max(lerp(4.4, 2.5, t), back + 3);
      const sx = size, sz = size;
      const ax = f.lx + f.mx * (size / 2 - back), az = f.lz + f.mz * (size / 2 - back);
      const sy = 0.7;
      const A = new THREE.Vector3(ax, target - sy / 2, az);
      const d = DIRV[dir];
      const dist = vertical ? R(5, 12) : R(7, 15);
      const B = vertical ? new THREE.Vector3(ax, A.y + dist, az)
        : new THREE.Vector3(ax + d[0] * dist, A.y + R(-1.5, 3), az + d[1] * dist);
      const speed = lerp(3.2, 8, t) * R(0.85, 1.15);
      const pause = lerp(1.1, 0.3, t);
      const timing = AS.World.moverTiming([A, B], speed, pause);
      const landTime = (L.frame + f.codes.length) * DT;
      const restClock = timing.cycle - pause * 0.6;
      const phase = (((restClock - landTime) % timing.cycle) + timing.cycle) % timing.cycle;
      const made = addBox({
        type: 'normal', x: A.x, y: A.y, z: A.z, sx, sy, sz,
        mover: { points: [[A.x, A.y, A.z], [B.x, B.y, B.z]], speed, pause, phase },
      });
      for (const code of f.codes) step(code);
      if (p.groundObject !== made.mesh) bad();

      // Freine sur la plateforme, puis se laisse porter jusqu'à l'autre bout.
      brake();
      if (p.groundObject !== made.mesh) bad();
      const mesh = made.mesh;
      let off = 0;
      for (let i = 0; i < 1500; i++) {
        if (mesh.position.distanceTo(B) < 0.02) break;
        step(0);
        off = p.groundObject === mesh ? 0 : off + 1;
        if (off > 8) bad();
        if (i % SLICE === SLICE - 1) yield;
      }
      air = false;
      top = B.y + sy / 2;
      rect = { x0: B.x - sx / 2, x1: B.x + sx / 2, z0: B.z - sz / 2, z1: B.z + sz / 2 };
      const front = dir === 1 ? p.position.z - rect.z0 : Math.min(0.8, size / 3);
      plan = { h: dir, ox: p.position.x, oz: p.position.z, r: Math.max(0, front - 0.2), e: 0.2 };
    }

    // ---- Fin de partie : grande plateforme de repos ----------------------------
    function* endSection(k, last) {
      const spec = {
        safe: true, t: Math.min(current.t, 0.5), cls: air ? undefined : 'jump', dy: air ? undefined : R(-1.5, 2.5),
        type: last ? 'finish' : 'spawn', d: 7, w: 7, run: 6, h: 1, minSize: 7,
        boxExtra: last ? { finish: true } : null,
      };
      const res = yield* hop(spec);
      if (!last) {
        const q = res.lay.q;
        pieces.push({
          k: 'checkpoint', x: (q.x0 + q.x1) / 2, y: top, z: (q.z0 + q.z1) / 2,
          hx: (q.x1 - q.x0) / 2, hz: (q.z1 - q.z0) / 2, sectionIndex: k + 1,
        });
      }
    }

    let current = { t: 0 };

    function pickModule(t, prev) {
      const list = MODULES.filter((m) => t >= m.min && m.id !== prev);
      let total = 0;
      for (const m of list) total += m.w;
      let x = rng() * total;
      for (const m of list) { x -= m.w; if (x <= 0) return m.id; }
      return 'hops';
    }

    // Partie de secours, toujours faisable : une longue passerelle.
    function rescue(k, last) {
      stats.rescues++;
      const d = DIRV[1];
      const base = rect;
      const len = 16;
      const q = {
        x0: p.position.x - 3.5, x1: p.position.x + 3.5,
        z0: p.position.z - len - 7, z1: p.position.z + 1,
      };
      addRectBox(q, top, last ? 'finish' : 'spawn', last ? { finish: true } : null);
      const startZ = p.position.z;
      for (let i = 0; i < 300 && p.position.z > startZ - len; i++) step(1);
      rect = q;
      plan = { h: 1, ox: p.position.x, oz: p.position.z, r: 3, e: 2 };
      air = false;
      if (!last) {
        pieces.push({
          k: 'checkpoint', x: (q.x0 + q.x1) / 2, y: top, z: q.z0 + 5,
          hx: 3.5, hz: 4, sectionIndex: k + 1,
        });
      }
      return base && d;
    }

    function* verifySection(start) {
      const endPos = p.position.clone();
      const endFrame = L.frame;
      const all = codes.slice(start.nc);
      const nc = codes.length;
      const air0 = air, plan0 = plan, top0 = top, rect0 = rect;
      loadPlayer(p, start.ps);
      L.frame = start.frame;
      codes.length = start.nc;
      L.crumbles.forEach((c) => { c.userData.crumbleState = 'idle'; c.userData.crumbleT = 0; c.userData.disabled = false; });
      L.bounceOrbs.forEach((o) => { o._playerWasInside = false; });
      L.triggers.forEach((t) => { if (t.type === 'phaseGate') t.cooldown = 0; });
      for (const m of L.movers) { m.setTime((L.frame - 1) * DT); m.setTime(L.frame * DT); }
      let ok = true;
      try {
        for (let i = 0; i < all.length; i++) {
          step(all[i]);
          if (i % (SLICE * 2) === SLICE * 2 - 1) yield;
        }
      } catch (e) {
        if (e !== FAIL) throw e;
        ok = false;
      }
      if (ok && (L.frame !== endFrame || p.position.distanceTo(endPos) > 1e-6)) ok = false;
      if (ok) { air = air0; plan = plan0; top = top0; rect = rect0; return codes.length === nc; }
      return false;
    }

    function* buildSection(k) {
      const t = clamp(opts.tAt(k, totalFrames), 0, 1);
      current = { t };
      const start = snapshot();
      const sectionFrames = lerp(30, 15, t) * 60;
      let mods = [];
      let built = false;
      let last = false;
      for (let attempt = 0; attempt < 4 && !built; attempt++) {
        stats.attempts++;
        restore(start);
        mods = [];
        if (attempt === 3) {
          last = !!opts.targetFrames && totalFrames + 600 >= opts.targetFrames;
          rescue(k, last);
          built = true;
          break;
        }
        try {
          let prev = null;
          while (codes.length - start.nc < sectionFrames) {
            const id = pickModule(t, prev);
            const sn = snapshot();
            try {
              yield* MOD[id](t);
              prev = id;
              mods.push(id);
              stats.mods[id] = (stats.mods[id] || 0) + 1;
            } catch (e) {
              if (e !== FAIL) throw e;
              stats.modFails++;
              stats.fail = stats.fail || {};
              stats.fail[id] = (stats.fail[id] || 0) + 1;
              restore(sn);
              yield* hop({ safe: true, t: Math.min(t, 0.3), cls: air ? undefined : 'jump', dy: air ? undefined : R(-1, 1) });
            }
            yield;
          }
          last = !!opts.targetFrames && totalFrames + codes.length - start.nc >= opts.targetFrames;
          yield* endSection(k, last);
          yield;
          built = yield* verifySection(start);
          yield;
        } catch (e) {
          if (e !== FAIL) throw e;
        }
      }
      const frames = codes.length - start.nc;
      totalFrames += frames;
      // La partie 0 inclut la plateforme de départ et les images d'avant.
      const from = k === 0 ? 0 : start;
      sections[k] = {
        index: k, t, theme: k % 2 ? 'snow' : 'rock', pieces: pieces.slice(from ? from.np : 0),
        codes: Uint8Array.from(codes.slice(from ? from.nc : 0)), frames, mods, last,
      };
      if (last) finished = true;
    }

    function prune() {
      // Le fantôme ne revient jamais en arrière : on ne garde en simulation
      // que le voisinage, pour que le coût reste constant à l'infini.
      const keep = 70;
      for (const list of [L.collidables, L.crumbles]) {
        if (list.length > keep) list.splice(0, list.length - keep);
      }
      if (L.movers.length > 10) L.movers.splice(0, L.movers.length - 10);
      if (L.bounceOrbs.length > 12) L.bounceOrbs.splice(0, L.bounceOrbs.length - 12);
      if (L.windZones.length > 6) L.windZones.splice(0, L.windZones.length - 6);
      if (L.gravityZones.length > 6) L.gravityZones.splice(0, L.gravityZones.length - 6);
      if (L.triggers.length > 12) L.triggers.splice(0, L.triggers.length - 12);
      codes = [];
      pieces = [];
    }

    function* main() {
      // Plateforme de départ.
      const startRect = { x0: -5, x1: 5, z0: -6, z1: 5 };
      addRectBox(startRect, 0, 'spawn', { sy: 1.2 });
      rect = startRect;
      p.position.set(0, 0.6, 0);
      plan = { h: 1, ox: 0, oz: 0, r: 4.6, e: 1.4 };
      for (let i = 0; i < 40 && !p.grounded; i++) step(0);
      for (let k = 0; !finished; k++) {
        yield* buildSection(k);
        prune();
      }
    }

    const it = main();
    let done = false;
    return {
      spawn,
      sections,
      stats,
      isFinished: () => finished,
      totalFrames: () => totalFrames,
      // Avance la génération pendant au plus `ms` millisecondes, jusqu'à avoir
      // `count` parties prêtes.
      pump(ms, count) {
        const t0 = (typeof performance !== 'undefined' ? performance : Date).now();
        while (!done && sections.length < count) {
          if (it.next().done) done = true;
          if ((typeof performance !== 'undefined' ? performance : Date).now() - t0 >= ms) break;
        }
        return sections.length;
      },
    };
  }

  // ==========================================================================
  // Parties (difficulté 1 à 4) : sans fin, de plus en plus dures jusqu'à
  // t = 1, où elles restent ensuite indéfiniment.
  // ==========================================================================
  const RUNS = { 1: { t0: 0, n: 45 }, 2: { t0: 0.18, n: 35 }, 3: { t0: 0.36, n: 26 }, 4: { t0: 0.55, n: 16 } };
  function runOptions(difficulty, seed) {
    const r = RUNS[difficulty] || RUNS[1];
    return {
      seed: 'partie:' + difficulty + ':' + seed,
      tAt: (k) => Math.min(1, r.t0 + (1 - r.t0) * Math.pow(k / r.n, 1.1)),
    };
  }

  // ==========================================================================
  // Défis : même graine pour tout le monde. Tous durent au moins 8 minutes
  // (temps du bot, qui ne se trompe jamais), sauf celui du jour.
  // ==========================================================================
  function isoWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
    return { year: d.getUTCFullYear(), week: Math.ceil(((d - yearStart) / 86400000 + 1) / 7) };
  }
  const pad2 = (n) => (n < 10 ? '0' + n : '' + n);

  function challenges(date) {
    date = date || new Date();
    const y = date.getFullYear(), m = pad2(date.getMonth() + 1), d = pad2(date.getDate());
    const w = isoWeek(date);
    const list = [];
    const add = (group, index, id, seconds, t0, t1) => list.push({ group, index, id, seconds, t0, t1 });
    const dayRng = AS.Util.mulberry32(hashSeed('duree:' + y + m + d));
    add('day', 1, 'jour:' + y + '-' + m + '-' + d, Math.round(120 + dayRng() * 120), 0.15, 0.45);
    add('week', 1, 'semaine:' + w.year + '-S' + pad2(w.week), 490, 0.25, 0.55);
    add('month', 1, 'mois:' + y + '-' + m + ':1', 490, 0.3, 0.6);
    add('month', 2, 'mois:' + y + '-' + m + ':2', 550, 0.4, 0.7);
    for (let i = 0; i < 4; i++) add('year', i + 1, 'annee:' + y + ':' + (i + 1), 490 + i * 40, 0.35 + i * 0.09, 0.62 + i * 0.1);
    for (let i = 0; i < 10; i++) add('eternal', i + 1, 'eternel:' + (i + 1), 490 + i * 45, Math.min(0.8, 0.15 + i * 0.07), Math.min(1, 0.45 + i * 0.06));
    return list;
  }

  function challengeOptions(ch) {
    const targetFrames = ch.seconds * 60;
    let frames = 0;
    return {
      seed: 'defi:' + ch.id,
      targetFrames,
      tAt: (k, total) => {
        frames = total;
        return ch.t0 + (ch.t1 - ch.t0) * Math.min(1, frames / targetFrames);
      },
    };
  }

  return {
    createStream, runOptions, challenges, challengeOptions,
    decode, makeInput, DT, DIRV, HELD, EDGE, DASH, hashSeed, marginFrames,
  };
})();
