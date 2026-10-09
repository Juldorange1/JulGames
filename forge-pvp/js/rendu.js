'use strict';
/* Forge PvP — rendu 3D (three.js) : ciel, nuages, soleil, ombres, blocs texturés, joueurs animés,
   main et objet à la première personne, flèches, cristaux, particules, étiquettes. */
(function () {
const FP = window.FP, TX = FP.TX, W = FP.W, DEG = FP.DEG, S = FP.S;
const R = FP.R = {};
let renderer, scene, camera, hudScene, hudCam, sun, hemi, sky, sunSprite, clouds, ground, groundMat, blockRoot, dirLightTarget;
const PX = 1.8 / 32;

function tex(c, repeat) {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  return t;
}
R.tex = tex;
const colLin = hex => new THREE.Color(hex);

// ================================================================ initialisation
R.init = function (canvas) {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.autoClear = false;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, 1, 0.05, 400);
  camera.rotation.order = 'YXZ';
  scene.fog = new THREE.Fog(0xb9d6ff, 40, 170);

  hemi = new THREE.HemisphereLight(0xd8ecff, 0x6b7a4a, 1.9); scene.add(hemi);
  sun = new THREE.DirectionalLight(0xfff1dc, 2.6);
  sun.castShadow = true; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
  const sc = sun.shadow.camera; sc.left = -28; sc.right = 28; sc.top = 28; sc.bottom = -28; sc.near = 1; sc.far = 140;
  dirLightTarget = new THREE.Object3D(); scene.add(dirLightTarget); sun.target = dirLightTarget;
  scene.add(sun);

  // ciel dégradé
  const skyMat = new THREE.ShaderMaterial({
    uniforms: { top: { value: new THREE.Vector3(0.36, 0.58, 1.0) }, hor: { value: new THREE.Vector3(0.73, 0.84, 1.0) }, bot: { value: new THREE.Vector3(0.62, 0.72, 0.86) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }',
    fragmentShader: 'uniform vec3 top; uniform vec3 hor; uniform vec3 bot; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(hor, top, pow(clamp(h,0.0,1.0), 0.55)) : mix(hor, bot, pow(clamp(-h,0.0,1.0), 0.45)); gl_FragColor = vec4(c,1.0); }',
    side: THREE.BackSide, depthWrite: false, fog: false
  });
  sky = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 16), skyMat); sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
  // soleil carré façon Minecraft
  const [sc2, sg] = TX.cnv(32, 32);
  const gr = sg.createRadialGradient(16, 16, 2, 16, 16, 16); gr.addColorStop(0, 'rgba(255,250,210,0.9)'); gr.addColorStop(1, 'rgba(255,240,180,0)');
  sg.fillStyle = gr; sg.fillRect(0, 0, 32, 32); sg.fillStyle = '#fffbe6'; sg.fillRect(10, 10, 12, 12); sg.fillStyle = '#fff3b0'; sg.fillRect(12, 12, 8, 8);
  sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(sc2), fog: false, depthWrite: false, transparent: true }));
  sunSprite.scale.set(46, 46, 1); sunSprite.renderOrder = -9; scene.add(sunSprite);
  // nuages en blocs
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.82, emissive: 0x9aa8b8 });
  const rnd = FP.rng(77), cells = [];
  for (let x = -18; x < 18; x++) for (let z = -18; z < 18; z++) {
    const n = Math.sin(x * 0.45 + 1.3) * Math.cos(z * 0.38 - 0.7) + Math.sin((x + z) * 0.21) * 0.6 + rnd() * 0.5;
    if (n > 0.75) cells.push([x, z]);
  }
  clouds = new THREE.InstancedMesh(new THREE.BoxGeometry(12, 4, 12), cloudMat, cells.length);
  const m4 = new THREE.Matrix4();
  cells.forEach(([x, z], i) => { m4.makeTranslation(x * 12, 0, z * 12); clouds.setMatrixAt(i, m4); });
  clouds.position.y = 62; scene.add(clouds);
  // sol (monde plat)
  groundMat = new THREE.MeshLambertMaterial({ map: tex(TX.BLOCKS.grass_top, 160) });
  ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  blockRoot = new THREE.Group(); scene.add(blockRoot);

  // scène de la main (rendue par-dessus, profondeur effacée)
  hudScene = new THREE.Scene();
  hudCam = new THREE.PerspectiveCamera(70, 1, 0.01, 10);
  hudScene.add(new THREE.HemisphereLight(0xffffff, 0x777777, 2.2));
  const hl = new THREE.DirectionalLight(0xffffff, 1.6); hl.position.set(-1, 2, 1.5); hudScene.add(hl);
  buildViewModel();
  initParticles();
  R.applyQuality();
  addEventListener('resize', R.resize); R.resize();
};
R.applyQuality = function () {
  const q = S.qualite;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q === 'haute' ? 2 : q === 'moyenne' ? 1 : 0.75));
  const sh = S.ombres && q !== 'basse';
  renderer.shadowMap.enabled = sh; sun.castShadow = sh;
  const size = q === 'haute' ? 2048 : 1024;
  if (sun.shadow.mapSize.x !== size) { sun.shadow.mapSize.set(size, size); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  scene.traverse(o => { if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => { m.needsUpdate = true; }); } });
  R.resize();
};
R.resize = function () {
  if (!renderer) return;
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  hudCam.aspect = w / h; hudCam.updateProjectionMatrix();
};

// ================================================================ monde
let worldKind = '';
R.setWorld = function (kind) {
  worldKind = kind;
  ground.visible = kind === 'arena';
  const voidW = kind === 'void';
  scene.fog.color.set(voidW ? 0xaec9f0 : 0xb9d6ff);
  scene.fog.near = voidW ? 30 : 40; scene.fog.far = voidW ? 150 : 170;
  sky.material.uniforms.bot.value.set(voidW ? 0.30 : 0.62, voidW ? 0.36 : 0.72, voidW ? 0.52 : 0.86);
  lastVersion = -1;
};
// arbres et décor autour de l'arène (blocs pleins, donc solides)
R.decorateArena = function () {
  const rnd = FP.rng(4242);
  const tree = (x, z) => {
    const h = 4 + (rnd() * 3 | 0);
    for (let y = 0; y < h; y++) W.set(x, y, z, 'log');
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let dy = h - 2; dy <= h + 1; dy++) {
      const r = Math.abs(dx) + Math.abs(dz) + Math.max(0, dy - h) * 2;
      if ((dx || dz || dy >= h) && r <= (dy >= h ? 2 : 3) && !(Math.abs(dx) === 2 && Math.abs(dz) === 2 && rnd() < 0.7)) W.set(x + dx, dy, z + dz, 'leaves');
    }
  };
  for (let i = 0; i < 26; i++) {
    const a = i / 26 * Math.PI * 2 + rnd() * 0.2, r = 24 + rnd() * 16;
    tree(Math.round(Math.cos(a) * r), Math.round(Math.sin(a) * r));
  }
  for (let i = 0; i < 10; i++) { // petits rochers
    const a = rnd() * Math.PI * 2, r = 16 + rnd() * 8, x = Math.round(Math.cos(a) * r), z = Math.round(Math.sin(a) * r);
    W.set(x, 0, z, 'stone'); if (rnd() < 0.5) W.set(x + 1, 0, z, 'stone'); if (rnd() < 0.3) W.set(x, 1, z, 'stone');
  }
  // obstacles partout jusqu'à ~110 blocs : rochers, gros blocs, ruines, troncs couchés, buissons, arbres
  // (rien à moins de 15 blocs du spawn : la zone de construction et le départ des exercices restent dégagés)
  const free = (x, z, rr) => { for (let dx = -rr; dx <= rr; dx++) for (let dz = -rr; dz <= rr; dz++) for (let y = 0; y < 3; y++) if (W.get(x + dx, y, z + dz)) return false; return true; };
  const kinds = ['rocher', 'rocher', 'bloc', 'ruine', 'ruine', 'tronc', 'buisson', 'buisson', 'arbre', 'arbre', 'tour'];
  for (let i = 0, made = 0; i < 900 && made < 240; i++) {
    const x = Math.round((rnd() * 2 - 1) * 110), z = Math.round((rnd() * 2 - 1) * 110);
    if (Math.hypot(x, z) < 15 || !free(x, z, 3)) continue;
    const k = kinds[(rnd() * kinds.length) | 0]; made++;
    if (k === 'rocher') { W.set(x, 0, z, 'stone'); if (rnd() < 0.6) W.set(x + 1, 0, z, 'stone'); if (rnd() < 0.5) W.set(x, 0, z + 1, 'stone'); if (rnd() < 0.4) W.set(x, 1, z, 'stone'); }
    else if (k === 'bloc') { for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let y = 0; y < 2; y++) if (!(y === 1 && rnd() < 0.3)) W.set(x + a, y, z + b, 'stone'); }
    else if (k === 'ruine') { // muret en pierre taillée, parfois en L
      const len = 3 + (rnd() * 4 | 0), hx = rnd() < 0.5, hgt = 1 + (rnd() * 3 | 0);
      for (let j = 0; j < len; j++) for (let y = 0; y < hgt; y++) if (!(y === hgt - 1 && rnd() < 0.35)) W.set(x + (hx ? j : 0), y, z + (hx ? 0 : j), 'bricks');
      if (rnd() < 0.4) for (let j = 1; j < 3; j++) W.set(x + (hx ? 0 : j), 0, z + (hx ? j : 0), 'bricks');
    }
    else if (k === 'tronc') { const hx = rnd() < 0.5, len = 3 + (rnd() * 2 | 0); for (let j = 0; j < len; j++) W.set(x + (hx ? j : 0), 0, z + (hx ? 0 : j), 'log'); }
    else if (k === 'buisson') { W.set(x, 0, z, 'leaves'); if (rnd() < 0.6) W.set(x + 1, 0, z, 'leaves'); if (rnd() < 0.4) W.set(x, 1, z, 'leaves'); }
    else if (k === 'arbre') tree(x, z);
    else { const hgt = 3 + (rnd() * 3 | 0); for (let y = 0; y < hgt; y++) { W.set(x, y, z, 'bricks'); W.set(x + 1, y, z, 'bricks'); } } // pilier de ruine
  }
};

// matériaux de blocs (ordre des faces : +x, -x, +y, -y, +z, -z)
const BMAT = {};
function bmats(type) {
  if (BMAT[type]) return BMAT[type];
  const L = c => new THREE.MeshLambertMaterial({ map: tex(TX.BLOCKS[c]) });
  let m;
  if (type === 'grass') { const s = L('grass_side'); m = [s, s, L('grass_top'), L('dirt'), s, s]; }
  else if (type === 'log') { const s = L('log_side'), t = L('log_top'); m = [s, s, t, t, s, s]; }
  else if (type === 'pot') { const s = L('terracotta'); m = [s, s, L('dirt'), s, s, s]; }
  else if (type === 'slab') { const s = L('stone_slab'); m = [s, s, L('stone'), s, s, s]; }
  else if (type === 'head') { const s = L('skull'); m = [s, s, s, s, s, s]; }
  else if (type === 'pane') { const s = L('iron_bars'); m = [s, s, s, s, s, s]; }
  else if (type === 'danger') { const a = new THREE.MeshLambertMaterial({ map: tex(TX.BLOCKS.danger), emissive: 0x5a0a06 }); m = [a, a, a, a, a, a]; }
  else if (type === 'leaves') { const l = new THREE.MeshLambertMaterial({ map: tex(TX.BLOCKS.leaves), alphaTest: 0.5, side: THREE.DoubleSide }); m = [l, l, l, l, l, l]; }
  else if (type === 'water') { const a = new THREE.MeshLambertMaterial({ map: tex(TX.BLOCKS.water), transparent: true, opacity: 0.62, depthWrite: false }); m = [a, a, a, a, a, a]; }
  else if (type === 'cobweb' || type === 'ladder' || type === 'glass') { const a = new THREE.MeshLambertMaterial({ map: tex(TX.BLOCKS[type]), alphaTest: 0.4, side: THREE.DoubleSide, transparent: type === 'glass' }); m = [a, a, a, a, a, a]; }
  else if (type === 'slime') { const a = new THREE.MeshLambertMaterial({ map: tex(TX.BLOCKS.slime), transparent: true, opacity: 0.92 }); m = [a, a, a, a, a, a]; }
  else if (type === 'scaffolding') { const a = new THREE.MeshLambertMaterial({ map: tex(TX.BLOCKS.scaffolding), alphaTest: 0.4, side: THREE.DoubleSide }); m = [a, a, a, a, a, a]; }
  else if (type === 'bed') { const s = L('bed_side'), t = L('bed_top'), p = L('planks'); m = [s, s, t, p, s, s]; }
  else if (type === 'tnt') { const s = L('tnt_side'), t = L('tnt_top'); m = [s, s, t, t, s, s]; }
  else if (type === 'hay') { const s = L('hay_side'), t = L('hay_top'); m = [s, s, t, t, s, s]; }
  else if (type === 'ice') { const a = new THREE.MeshLambertMaterial({ map: tex(TX.BLOCKS.ice), transparent: true, opacity: 0.78 }); m = [a, a, a, a, a, a]; }
  else { const name = { obsidian: 'obsidian', stone: 'stone', bricks: 'stone_bricks', gold: 'gold', emerald: 'emerald', planks: 'planks', sand: 'sand' }[type] || type; const a = L(TX.BLOCKS[name] ? name : 'stone'); m = [a, a, a, a, a, a]; }
  return (BMAT[type] = m);
}
const boxGeo = new THREE.BoxGeometry(1, 1, 1), SHAPE_GEO = {};
let lastVersion = -1;
function syncBlocks() {
  if (W.version === lastVersion) return;
  lastVersion = W.version;
  while (blockRoot.children.length) { const c = blockRoot.children.pop(); c.dispose && c.dispose(); }
  const byType = {};
  for (const [k, t] of W.blocks) (byType[t] || (byType[t] = [])).push(k);
  const m4 = new THREE.Matrix4();
  for (const t in byType) {
    const sh = W.shape(t), geo = sh ? (SHAPE_GEO[t] || (SHAPE_GEO[t] = new THREE.BoxGeometry(sh[3] - sh[0], sh[4] - sh[1], sh[5] - sh[2]))) : boxGeo;
    const cx = sh ? (sh[0] + sh[3]) / 2 : 0.5, cy = sh ? (sh[1] + sh[4]) / 2 : 0.5, cz = sh ? (sh[2] + sh[5]) / 2 : 0.5;
    const list = byType[t], im = new THREE.InstancedMesh(geo, bmats(t), list.length);
    list.forEach((k, i) => {
      const [x, y, z] = k.split(',').map(Number);
      // les blocs encastrés dans le sol dépassent d'un cheveu pour ne pas scintiller
      m4.makeTranslation(x + cx, y + cy + (W.flat && y === -1 ? 0.006 : 0), z + cz);
      im.setMatrixAt(i, m4);
    });
    im.castShadow = t !== 'leaves' || true; im.receiveShadow = true;
    blockRoot.add(im);
  }
}

// ================================================================ joueurs
const skinCache = {};
function skinMats(look) {
  const k = [look.shirt, look.pants, look.hair, look.skin].join('|');
  if (!skinCache[k]) {
    const s = TX.skin({ shirt: look.shirt, pants: look.pants, hair: look.hair, skin: look.skin, seed: 3 });
    skinCache[k] = {}; for (const part in s) skinCache[k][part] = s[part].map(c => tex(c));
  }
  return skinCache[k];
}
let armorTex = null;
function boxMesh(w, h, d, maps, inflate, alpha) {
  const i = inflate || 0;
  const geo = new THREE.BoxGeometry((w + i * 2) * PX, (h + i * 2) * PX, (d + i * 2) * PX);
  const mats = maps.map(t => new THREE.MeshLambertMaterial({ map: t, alphaTest: alpha ? 0.5 : 0, transparent: false }));
  const m = new THREE.Mesh(geo, mats); m.castShadow = true; m.receiveShadow = false;
  return m;
}
function makePlayerModel(look) {
  const sm = skinMats(look);
  const root = new THREE.Group(), body = new THREE.Group();
  root.add(body);
  const g = (x, y, z, parent) => { const o = new THREE.Group(); o.position.set(x * PX, y * PX, z * PX); (parent || body).add(o); return o; };
  const torso = boxMesh(8, 12, 4, sm.body); torso.position.y = 18 * PX; body.add(torso);
  const headG = g(0, 24, 0), head = boxMesh(8, 8, 8, sm.head); head.position.y = 4 * PX; headG.add(head);
  const armL = g(6, 22, 0), armR = g(-6, 22, 0), legL = g(2, 12, 0), legR = g(-2, 12, 0);
  [armL, armR].forEach(a => { const m = boxMesh(4, 12, 4, sm.arm); m.position.y = -4 * PX; a.add(m); });
  [legL, legR].forEach(l => { const m = boxMesh(4, 12, 4, sm.leg); m.position.y = -6 * PX; l.add(m); });
  const mats = [];
  root.traverse(o => { if (o.material) mats.push(...o.material); });
  if (look.armor) {
    if (!armorTex) { const a = TX.armor(); armorTex = {}; for (const p in a) armorTex[p] = a[p].map(c => tex(c)); }
    const add = (parent, w, h, d, maps, y, inf) => { const m = boxMesh(w, h, d, maps, inf, true); m.position.y = y * PX; parent.add(m); m.traverse(o => o.material && mats.push(...o.material)); };
    add(headG, 8, 8, 8, armorTex.head, 4, 1); add(body, 8, 12, 4, armorTex.body, 18, 1.01);
    add(armL, 4, 12, 4, armorTex.arm, -4, 1); add(armR, 4, 12, 4, armorTex.arm, -4, 1);
    add(legL, 4, 12, 4, armorTex.leg, -6, 0.5); add(legR, 4, 12, 4, armorTex.leg, -6, 0.5);
  }
  if (look.item === 'sword') { // épée en main (3e personne)
    const s = new THREE.Mesh(itemGeo('sword'), itemMat); s.scale.setScalar(0.6); s.castShadow = true;
    s.position.set(0, -10 * PX, 1.5 * PX); s.rotation.set(-Math.PI / 2 + 0.2, Math.PI / 2, -Math.PI / 4);
    const holder = new THREE.Group(); holder.add(s); armR.add(holder);
  }
  if (look.item === 'bow') { // arc en main (3e personne)
    const b = new THREE.Mesh(itemGeo('bow'), itemMat); b.scale.setScalar(0.7); b.castShadow = true;
    b.position.set(0, -10 * PX, 2 * PX); b.rotation.set(-Math.PI / 2, 0, Math.PI * 0.75);
    armL.add(b);
  }
  let xbow = null;
  if (look.item === 'crossbow') { // arbalète en main droite (3e personne), pointée devant quand le bras est levé
    xbow = crossbowModel(); xbow.scale.setScalar(0.8); xbow.position.set(0, -10 * PX, 0); xbow.rotation.set(-Math.PI / 2, 0, Math.PI);
    xbow.traverse(o => { if (o.isMesh) o.castShadow = true; }); armR.add(xbow);
  }
  let tag = null;
  if (look.name) { tag = makeTag(look.name); tag.position.y = 2.2; root.add(tag); }
  return { root, body, headG, armL, armR, legL, legR, mats, tag, tagText: look.name, xbow };
}
function makeTag(text) {
  const [c, g] = TX.cnv(256, 48);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
  sp.userData = { c, g }; sp.renderOrder = 5; drawTag(sp, text);
  return sp;
}
function drawTag(sp, text) {
  const { c, g } = sp.userData;
  g.clearRect(0, 0, c.width, c.height);
  g.font = 'bold 30px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = Math.min(c.width, g.measureText(text).width + 24);
  g.fillStyle = 'rgba(0,0,0,0.42)'; g.fillRect((c.width - w) / 2, 4, w, 40);
  g.fillStyle = '#fff'; g.fillText(text, c.width / 2, 25);
  sp.material.map.needsUpdate = true; sp.material.map.colorSpace = THREE.SRGBColorSpace;
  sp.scale.set(1.6, 0.3, 1);
}
const models = new Map();
function animateModel(m, e, alpha, t) {
  m.root.position.set(e.rx, e.ry, e.rz);
  m.root.rotation.y = -e.yaw * DEG;
  const amt = e.walkAmt, ph = (e.walkR || 0) * 2.4;
  m.legL.rotation.x = Math.sin(ph) * 0.95 * amt; m.legR.rotation.x = -Math.sin(ph) * 0.95 * amt;
  m.armL.rotation.x = -Math.sin(ph) * 0.75 * amt + Math.sin(t * 1.3) * 0.04;
  m.armR.rotation.x = Math.sin(ph) * 0.75 * amt - Math.sin(t * 1.3) * 0.04;
  m.armL.rotation.z = 0.06 + Math.cos(t * 1.7) * 0.04; m.armR.rotation.z = -0.06 - Math.cos(t * 1.7) * 0.04;
  if (e.swingAnim > 0) { // coup d'épée
    const p = FP.clamp(1 - (e.swingAnim - alpha) / 6, 0, 1), s = Math.sin(Math.sqrt(p) * Math.PI);
    m.armR.rotation.x = -1.5 * s - 0.3 * Math.sin(p * Math.PI); m.armR.rotation.z = -0.35 * s;
    m.body.rotation.y = -Math.sin(Math.sqrt(p) * Math.PI * 2) * 0.22;
  } else m.body.rotation.y = 0;
  if (e.bowPose) { m.armR.rotation.x = -Math.PI / 2; m.armL.rotation.x = -Math.PI / 2; m.armL.rotation.y = 0.5; }
  if (m.xbow) m.xbow.userData.set(e.loaded ? 0 : Math.min(1, (e.drawT || 0) / 25), !!e.loaded);
  m.headG.rotation.x = FP.clamp(e.pitch || 0, -60, 60) * DEG;
  m.headG.rotation.y = -FP.clamp(FP.wrap((e.lookYaw != null ? e.lookYaw : e.yaw) - e.yaw), -80, 80) * DEG;
  const hurt = e.hurtTime > 0 || e.dead > 0;
  for (const mat of m.mats) mat.color.setRGB(1, hurt ? 0.42 : 1, hurt ? 0.42 : 1);
  if (e.dead > 0) { const k = Math.min(1, (e.dead + alpha) / 16); m.root.rotation.z = k * k * Math.PI / 2; m.root.visible = e.dead < 22; }
  else { m.root.rotation.z = 0; m.root.visible = !(e.respawnT > 0); }
  if (m.tag && e.tag !== m.tagText) { drawTag(m.tag, e.tag); m.tagText = e.tag; }
  if (m.tag) m.tag.visible = !!e.tag;
}
R.syncEntities = function (list, alpha, t) {
  const seen = new Set();
  for (const e of list) {
    if (!e) continue;
    let m = models.get(e);
    if (!m) { m = makePlayerModel(e.look); models.set(e, m); scene.add(m.root); }
    e.walkR = FP.lerp(e.walkPrev != null ? e.walkPrev : e.walk, e.walk, alpha);
    animateModel(m, e, alpha, t);
    seen.add(e);
  }
  for (const [e, m] of models) if (!seen.has(e)) { scene.remove(m.root); models.delete(e); }
};
R.clearEntities = function () { for (const [, m] of models) scene.remove(m.root); models.clear(); };

// ================================================================ objets extrudés (pixel → volume)
function extrude(rows, pal, depth) {
  const pos = [], nor = [], colr = [], s = 1 / 16, d = (depth || 1) * s / 2;
  const at = (x, y) => y >= 0 && y < 16 && x >= 0 && x < 16 && rows[y][x] !== '.' && pal[rows[y][x]];
  const c = new THREE.Color();
  const quad = (a, b, cc, dd, n, k) => { for (const v of [a, b, cc, a, cc, dd]) { pos.push(...v); nor.push(...n); colr.push(c.r * k, c.g * k, c.b * k); } };
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (!at(x, y)) continue;
    c.set(pal[rows[y][x]]);
    const x0 = (x - 8) * s, x1 = x0 + s, y1 = (8 - y) * s, y0 = y1 - s;
    quad([x0, y0, d], [x1, y0, d], [x1, y1, d], [x0, y1, d], [0, 0, 1], 1);
    quad([x1, y0, -d], [x0, y0, -d], [x0, y1, -d], [x1, y1, -d], [0, 0, -1], 0.8);
    if (!at(x, y - 1)) quad([x0, y1, d], [x1, y1, d], [x1, y1, -d], [x0, y1, -d], [0, 1, 0], 0.95);
    if (!at(x, y + 1)) quad([x0, y0, -d], [x1, y0, -d], [x1, y0, d], [x0, y0, d], [0, -1, 0], 0.6);
    if (!at(x - 1, y)) quad([x0, y0, -d], [x0, y0, d], [x0, y1, d], [x0, y1, -d], [-1, 0, 0], 0.75);
    if (!at(x + 1, y)) quad([x1, y0, d], [x1, y0, -d], [x1, y1, -d], [x1, y1, d], [1, 0, 0], 0.75);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
  return g;
}
const itemMat = new THREE.MeshLambertMaterial({ vertexColors: true });
const ITEMGEO = {};
function itemGeo(name) {
  if (ITEMGEO[name]) return ITEMGEO[name];
  if (name === 'bow') { // arc sans corde (la corde est animée à part)
    const rows = []; for (let y = 0; y < 16; y++) rows.push('................'.split(''));
    for (let a = -10; a <= 100; a += 2) { const t = a * DEG, x = Math.round(2 + Math.cos(t) * 12), y = Math.round(14 - Math.sin(t) * 12); if (x >= 0 && x < 16 && y >= 0 && y < 16) { rows[y][x] = a % 20 < 10 ? 'u' : 's'; const x2 = Math.round(x - 0.7), y2 = Math.round(y + 0.7); if (rows[y2] && rows[y2][x2] === '.') rows[y2][x2] = 'H'; } }
    return (ITEMGEO[name] = extrude(rows.map(r => r.join('')), TX.PAL, 1.4));
  }
  return (ITEMGEO[name] = extrude(TX.artRows(name), TX.PAL, 1));
}
R.itemGeo = itemGeo;

// ================================================================ vue à la première personne
const VM = { group: null, arm: null, items: {}, kind: 'sword', swing: 0, equip: 1, pull: 0, string: null, arrow: null, bow: null, xk: 0, kick: 0 };
// arc en 3D : la flèche est orientée vers -z, donc vers le centre de l'écran (le viseur)
const BOW_H = 0.36, BOW_C = 0.13;
function bowModel() {
  const g = new THREE.Group(), woodA = new THREE.MeshLambertMaterial({ color: 0x8a5d2e }), woodB = new THREE.MeshLambertMaterial({ color: 0x5a3a1c }), Y = new THREE.Vector3(0, 1, 0);
  const pt = t => new THREE.Vector3(0, t * BOW_H, BOW_C * t * t); // branches qui reviennent vers l'archer aux extrémités
  const N = 14;
  for (let i = 0; i < N; i++) {
    const p0 = pt(-1 + 2 * i / N), p1 = pt(-1 + 2 * (i + 1) / N), len = p0.distanceTo(p1);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.04, len * 1.08, 0.045), i % 4 === 1 ? woodB : woodA);
    m.position.copy(p0).add(p1).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(Y, p1.clone().sub(p0).normalize()); g.add(m);
  }
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.06), woodB); g.add(grip);
  const strMat = new THREE.MeshBasicMaterial({ color: 0xe6e6e6 });
  VM.string = [0, 1].map(() => { const s = new THREE.Mesh(new THREE.BoxGeometry(0.006, 1, 0.006), strMat); g.add(s); return s; });
  VM.arrow = arrowModel(); VM.arrow.scale.setScalar(0.55); VM.arrow.rotation.y = Math.PI; g.add(VM.arrow);
  g.userData.tips = [pt(1), pt(-1)];
  return g;
}
// arbalète en 3D (pointée vers -z) : la corde recule pendant le chargement, la flèche apparaît une fois chargée
function crossbowModel() {
  const g = new THREE.Group(), Y = new THREE.Vector3(0, 1, 0);
  const wood = new THREE.MeshLambertMaterial({ color: 0x7a5230 }), dark = new THREE.MeshLambertMaterial({ color: 0x4a3018 }), iron = new THREE.MeshLambertMaterial({ color: 0x9a9a9a });
  const box = (w, hh, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mat); m.position.set(x, y, z); g.add(m); return m; };
  box(0.06, 0.07, 0.62, wood, 0, 0, 0.04);
  const grip = box(0.055, 0.16, 0.07, dark, 0, -0.09, 0.24); grip.rotation.x = -0.35;
  box(0.08, 0.06, 0.08, iron, 0, 0, -0.25);
  box(0.03, 0.03, 0.05, iron, 0, 0.045, 0.2);
  const LW = 0.3, LB = 0.07, F = -0.24, pt = t => new THREE.Vector3(t * LW, 0, F + LB * t * t), N = 10;
  for (let i = 0; i < N; i++) {
    const p0 = pt(-1 + 2 * i / N), p1 = pt(-1 + 2 * (i + 1) / N), len = p0.distanceTo(p1);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.034, len * 1.08, 0.04), i === 4 || i === 5 ? iron : (i % 3 ? wood : dark));
    m.position.copy(p0).add(p1).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(Y, p1.clone().sub(p0).normalize()); g.add(m);
  }
  const strMat = new THREE.MeshBasicMaterial({ color: 0xe6e6e6 });
  const strings = [0, 1].map(() => { const s = new THREE.Mesh(new THREE.BoxGeometry(0.006, 1, 0.006), strMat); g.add(s); return s; });
  const arrow = arrowModel(); arrow.scale.setScalar(0.5); arrow.rotation.y = Math.PI; arrow.position.set(0, 0.05, F + 0.02); g.add(arrow);
  const tips = [pt(1), pt(-1)];
  g.userData.set = (k, loaded) => {
    const nock = new THREE.Vector3(0, 0.04, loaded ? F + 0.27 : F + LB + 0.01 + k * 0.25);
    tips.forEach((a, i) => { const m = strings[i]; m.scale.y = a.distanceTo(nock); m.position.copy(a).add(nock).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(Y, nock.clone().sub(a).normalize()); });
    arrow.visible = !!loaded;
  };
  g.userData.set(0, false);
  return g;
}
R.crossbowModel = crossbowModel;
function buildViewModel() {
  VM.group = new THREE.Group(); hudScene.add(VM.group);
  const sm = skinMats({ shirt: '#18a7a8', pants: '#383f9a' });
  VM.arm = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), sm.arm.map(t => new THREE.MeshLambertMaterial({ map: t })));
  VM.group.add(VM.arm);
  const sword = new THREE.Mesh(itemGeo('sword'), itemMat); sword.scale.setScalar(0.55);
  VM.items.sword = sword;
  VM.items.bow = VM.bow = bowModel();
  VM.items.crossbow = crossbowModel();
  VM.items.block = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), bmats('wool_white'));
  VM.items.crystal = crystalModel(0.3);
  VM.items.sprite = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.1, side: THREE.DoubleSide }));
  for (const k in VM.items) { VM.items[k].visible = false; VM.group.add(VM.items[k]); }
}
const spriteTex = {};
R.setItem = function (kind, blockType) {
  if (VM.kind !== kind || (kind === 'sprite' && VM.spriteUrl !== blockType)) VM.equip = 0; // l'objet sort de la barre : petite animation de changement d'arme
  VM.kind = kind;
  if (kind === 'sprite' && blockType) {
    VM.spriteUrl = blockType;
    let t = spriteTex[blockType];
    if (!t) { t = spriteTex[blockType] = new THREE.TextureLoader().load(blockType); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace; }
    VM.items.sprite.material.map = t; VM.items.sprite.material.needsUpdate = true;
  }
  for (const k in VM.items) VM.items[k].visible = k === kind;
  if (kind === 'block' && blockType) VM.items.block.material = bmats(blockType);
  VM.arm.visible = kind === 'none';
};
R.swing = function () { VM.swing = 1; };
R.kick = function () { VM.kick = 1; };
function updateViewModel(dt, G) {
  VM.swing = Math.max(0, VM.swing - dt * 3.6);
  const p = 1 - VM.swing, sp = Math.sqrt(p), swingOn = VM.swing > 0 && VM.kind !== 'bow' && VM.kind !== 'crossbow';
  const eq = G && G.equip != null ? G.equip : 1;
  VM.equip += (eq - VM.equip) * Math.min(1, dt * 18);
  const bob = S.bobbing && G && G.p ? Math.sin((G.p.walkR || 0) * 2.4) * 0.03 * G.p.walkAmt : 0;
  const bobY = S.bobbing && G && G.p ? -Math.abs(Math.cos((G.p.walkR || 0) * 2.4)) * 0.03 * G.p.walkAmt : 0;
  const sx = swingOn ? -0.4 * Math.sin(sp * Math.PI) : 0, sy = swingOn ? 0.2 * Math.sin(sp * Math.PI * 2) : 0, sz = swingOn ? -0.2 * Math.sin(p * Math.PI) : 0;
  const g = VM.group, k = VM.kind;
  if (k === 'bow') {
    const pull = G && G.bowPull != null ? G.bowPull : 0;
    VM.pull += (pull - VM.pull) * Math.min(1, dt * 25);
    const shake = pull >= 1 ? Math.sin(performance.now() / 22) * 0.003 : 0;
    // arc tenu légèrement à droite et sous le viseur, flèche pointée vers le centre de l'écran
    g.position.set(0.24 - VM.pull * 0.08 + bob, -0.27 + VM.pull * 0.05 + shake + bobY - (1 - VM.equip) * 0.6, -1.15 + VM.pull * 0.12);
    // l'axe de la flèche vise un point droit devant, au centre de l'écran
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), new THREE.Vector3(-g.position.x, -g.position.y, -2.6 - g.position.z).normalize());
    const b = VM.bow; b.position.set(0, 0, 0); b.rotation.set(0, 0, -0.42);
    const [top, bot] = b.userData.tips, nock = new THREE.Vector3(0, 0, BOW_C * 0.25 + 0.02 + VM.pull * 0.24);
    [[top, VM.string[0]], [bot, VM.string[1]]].forEach(([a, m]) => {
      m.scale.y = a.distanceTo(nock); m.position.copy(a).add(nock).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), nock.clone().sub(a).normalize());
    });
    VM.arrow.visible = VM.pull > 0.02;
    VM.arrow.position.set(0, 0, nock.z - 0.4 * 0.55);
    return;
  }
  if (k === 'crossbow') {
    const loaded = !!(G && G.xLoaded), ch = G && G.xCharge && G.xNeed ? Math.min(1, G.xCharge / G.xNeed) : 0;
    VM.xk += (ch - VM.xk) * Math.min(1, dt * 25); VM.kick = Math.max(0, VM.kick - dt * 5);
    const shake = ch > 0 && ch < 1 ? Math.sin(performance.now() / 30) * 0.004 : 0;
    // tenue à droite sous le viseur, le carreau pointé vers le centre de l'écran ; elle se relève pendant le chargement
    g.position.set(0.26 + bob, -0.3 + bobY + shake - VM.xk * 0.05 - (1 - VM.equip) * 0.6, -0.95 + VM.kick * 0.14);
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), new THREE.Vector3(-g.position.x, -g.position.y, -2.6 - g.position.z).normalize());
    g.rotateX(VM.xk * 0.55 + VM.kick * 0.25); g.rotateZ(-VM.xk * 0.35);
    const x = VM.items.crossbow; x.position.set(0, 0, 0); x.rotation.set(0, 0, 0);
    x.userData.set(VM.xk, loaded);
    return;
  }
  g.position.set(0.56 + sx + bob, -0.52 + sy - (1 - VM.equip) * 0.6 + bobY, -0.72 + sz);
  g.rotation.set(swingOn ? -Math.sin(sp * Math.PI) * 1.2 : 0, swingOn ? -Math.sin(p * p * Math.PI) * 0.35 : 0, swingOn ? -Math.sin(sp * Math.PI) * 0.3 : 0);
  VM.arm.position.set(-0.12, 0.12, 0.12); VM.arm.rotation.set(1.95, -0.35, 0.2);
  if (k === 'sword') { const s = VM.items.sword; s.position.set(-0.05, 0.2, 0.05); s.rotation.set(0.1, -0.35, 0.7); }
  if (k === 'block') { const b = VM.items.block; b.position.set(0.0, 0.1, -0.05); b.rotation.set(0.1, 0.78, 0); }
  if (k === 'sprite') { const s = VM.items.sprite; s.position.set(-0.05, 0.22, 0.02); s.rotation.set(0.15, -0.55, 0.1); }
  if (k === 'crystal') { const c = VM.items.crystal; c.position.set(0, 0.16, -0.1); c.userData.spin(performance.now() / 1000); }
}

// ================================================================ flèches et cristaux
function arrowModel() {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.8), new THREE.MeshLambertMaterial({ color: 0x8a5d2e }));
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 4), new THREE.MeshLambertMaterial({ color: 0x8c8c8c }));
  head.rotation.x = Math.PI / 2; head.position.z = 0.46;
  const fl = new THREE.MeshLambertMaterial({ color: 0xf2f2f2, side: THREE.DoubleSide });
  const f1 = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.18), fl); f1.position.z = -0.32; f1.rotation.y = Math.PI / 2;
  const f2 = f1.clone(); f2.rotation.z = Math.PI / 2;
  g.add(shaft, head, f1, f2);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
function crystalModel(scale) {
  const g = new THREE.Group();
  const [c, gg] = TX.cnv(16, 16);
  gg.fillStyle = 'rgba(230,200,255,0.18)'; gg.fillRect(0, 0, 16, 16);
  gg.fillStyle = 'rgba(255,255,255,0.95)'; gg.fillRect(0, 0, 16, 1); gg.fillRect(0, 15, 16, 1); gg.fillRect(0, 0, 1, 16); gg.fillRect(15, 0, 1, 16);
  gg.fillStyle = 'rgba(255,220,255,0.6)'; gg.fillRect(2, 2, 3, 1); gg.fillRect(2, 2, 1, 3);
  const glass = new THREE.MeshLambertMaterial({ map: tex(c), transparent: true, depthWrite: false, side: THREE.DoubleSide, emissive: 0x442255 });
  const outer = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.62), glass), inner = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), glass);
  const [c2, g2] = TX.cnv(8, 8); const r = FP.rng(9);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g2.fillStyle = TX.col([255, 80, 210], 0.75 + r() * 0.4); g2.fillRect(x, y, 1, 1); }
  const core = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshLambertMaterial({ map: tex(c2), emissive: 0x991177 }));
  g.add(outer, inner, core); g.scale.setScalar(scale || 1);
  g.userData.spin = t => {
    outer.rotation.set(t * 1.6, t * 2.1, 0.785); inner.rotation.set(-t * 2.3, t * 1.2, 0.3); core.rotation.set(t * 2.8, -t * 1.9, t);
  };
  return g;
}
const arrowObjs = new Map();
let crystalObj = null;
// ---------------------------------------------------------------- bateau (chêne), à la position interpolée
let boatObj = null;
function boatModel() {
  const g = new THREE.Group(), wood = new THREE.MeshLambertMaterial({ map: tex(TX.BLOCKS.planks) }), dark = new THREE.MeshLambertMaterial({ color: 0x6b4a22 });
  const box = (w, h, d, x, y, z, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m || wood); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
  box(1.25, 0.12, 2.0, 0, 0.06, 0);                                   // fond
  box(0.12, 0.42, 2.0, -0.62, 0.3, 0); box(0.12, 0.42, 2.0, 0.62, 0.3, 0); // côtés
  box(1.36, 0.42, 0.12, 0, 0.3, 1.0); box(1.36, 0.42, 0.12, 0, 0.3, -1.0); // avant / arrière
  box(1.1, 0.06, 0.32, 0, 0.36, -0.15, dark);                         // banc
  g.userData.oars = [-1, 1].map(s => { const o = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.3), dark); m.position.z = -0.35; o.add(m); const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.34), wood); blade.position.z = -0.95; o.add(blade); o.position.set(s * 0.7, 0.42, 0.1); g.add(o); return o; });
  return g;
}
R.syncBoat = function (b, alpha, t, rowing) {
  if (!b) { if (boatObj) boatObj.visible = false; return; }
  if (!boatObj) { boatObj = boatModel(); scene.add(boatObj); }
  boatObj.visible = true;
  boatObj.position.set(FP.lerp(b.px, b.x, alpha), FP.lerp(b.py, b.y, alpha), FP.lerp(b.pz, b.z, alpha));
  boatObj.rotation.y = -FP.lerp(b.pyaw, b.yaw, alpha) * DEG;
  const ph = rowing ? t * 9 : 0;
  boatObj.userData.oars.forEach((o, i) => { o.rotation.x = rowing ? 0.5 + Math.sin(ph + i * Math.PI) * 0.5 : 0.6; o.rotation.y = (i ? -1 : 1) * (0.5 + (rowing ? Math.cos(ph + i * Math.PI) * 0.4 : 0)); });
};
// ---------------------------------------------------------------- fissures sur le bloc en train d'être cassé (étapes 0 à 9)
let crackObj = null; const crackTex = [];
function syncCrack(c) {
  if (!c) { if (crackObj) crackObj.visible = false; return; }
  if (!crackTex.length) for (let s = 0; s < 10; s++) {
    const [cv, g] = TX.cnv(16, 16), r = FP.rng(77);
    for (let i = 0; i < 6 + s * 9; i++) { let x = 8, y = 8; const a = r() * 6.283; for (let k = 0; k < 2 + (s * 0.9 + r() * 3 | 0); k++) { x += Math.round(Math.cos(a + (r() - 0.5))); y += Math.round(Math.sin(a + (r() - 0.5))); g.fillStyle = `rgba(0,0,0,${0.55 + s * 0.04})`; g.fillRect(((x % 16) + 16) % 16, ((y % 16) + 16) % 16, 1, 1); } }
    crackTex.push(tex(cv));
  }
  if (!crackObj) { crackObj = new THREE.Mesh(new THREE.BoxGeometry(1.004, 1.004, 1.004), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 })); scene.add(crackObj); }
  crackObj.visible = true; crackObj.position.set(c.x + 0.5, c.y + 0.5, c.z + 0.5);
  crackObj.material.map = crackTex[Math.max(0, Math.min(9, c.stage))]; crackObj.material.needsUpdate = true;
}
const tntObjs = new Map();
R.syncTnt = function (list, alpha) {
  const seen = new Set();
  for (const e of (list || [])) {
    let m = tntObjs.get(e);
    if (!m) { m = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.98, 0.98), bmats('tnt').map(x => x.clone())); m.castShadow = true; tntObjs.set(e, m); scene.add(m); }
    m.position.set(FP.lerp(e.px, e.x, alpha), FP.lerp(e.py, e.y, alpha) + 0.49, FP.lerp(e.pz, e.z, alpha));
    const flash = Math.floor(e.fuse / 5) % 2 === 0; for (const mt of m.material) mt.emissive && mt.emissive.setRGB(flash ? 0.9 : 0, flash ? 0.9 : 0, flash ? 0.9 : 0);
    const sc = e.fuse < 10 ? 1 + (10 - e.fuse) * 0.02 : 1; m.scale.setScalar(sc);
    seen.add(e);
  }
  for (const [e, m] of tntObjs) if (!seen.has(e)) { scene.remove(m); tntObjs.delete(e); }
};
R.syncExtras = function (G, alpha, t) {
  R.syncBoat(G.boat, alpha, t, G.boat && G.boatRow);
  R.syncTnt(G.tnts, alpha);
  const seen = new Set();
  for (const a of (G.arrows || [])) {
    let m = arrowObjs.get(a);
    if (!m) { m = arrowModel(); arrowObjs.set(a, m); scene.add(m); }
    const x = FP.lerp(a.px, a.x, alpha), y = FP.lerp(a.py, a.y, alpha), z = FP.lerp(a.pz, a.z, alpha);
    m.position.set(x, y, z);
    if (!a.stuck) { const v = new THREE.Vector3(a.vx, a.vy, a.vz).normalize(); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), v); }
    m.visible = true; seen.add(a);
  }
  for (const [a, m] of arrowObjs) if (!seen.has(a)) { scene.remove(m); arrowObjs.delete(a); }
  if (G.crys) {
    if (!crystalObj) { crystalObj = crystalModel(1.25); crystalObj.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(crystalObj); }
    crystalObj.visible = true;
    crystalObj.position.set(G.crys.x, 1.0 + Math.sin(t * 4) * 0.14, G.crys.z);
    crystalObj.userData.spin(t);
  } else if (crystalObj) crystalObj.visible = false;
};

// ================================================================ particules
const PARTS = [], POOL = 420;
let partTex = {};
function initParticles() {
  for (const k in TX.PART) partTex[k] = tex(TX.PART[k]);
  for (let i = 0; i < POOL; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: partTex.square, transparent: true, depthWrite: false }));
    s.visible = false; scene.add(s); PARTS.push({ s, life: 0 });
  }
}
let partIdx = 0;
function emit(o) {
  const p = PARTS[partIdx = (partIdx + 1) % POOL];
  Object.assign(p, { x: o.x, y: o.y, z: o.z, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, life: o.life, max: o.life, g: o.g || 0, size: o.size, grow: o.grow || 0, drag: o.drag || 0.96, fade: o.fade !== false, spin: o.spin || 0 });
  p.s.material.map = partTex[o.tex || 'square']; p.s.material.color.set(o.color || '#ffffff'); p.s.material.rotation = Math.random() * 6;
  p.s.material.blending = o.add ? THREE.AdditiveBlending : THREE.NormalBlending;
  p.s.visible = true;
}
const rnd = FP.rand;
R.burst = function (type, x, y, z, o) {
  o = o || {};
  const n = o.n || 10;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, el = Math.random() * Math.PI - Math.PI / 2;
    const sp = (o.speed || 1);
    if (type === 'crit') emit({ x, y, z, vx: Math.cos(a) * rnd(1.5, 4) * sp, vy: rnd(0.5, 4) * sp, vz: Math.sin(a) * rnd(1.5, 4) * sp, g: 6, life: rnd(0.4, 0.8), size: rnd(0.1, 0.16), tex: 'crit', color: ['#fff6c9', '#ffe066', '#ffd23a'][i % 3], drag: 0.92 });
    else if (type === 'hit') emit({ x, y, z, vx: Math.cos(a) * rnd(0.5, 2), vy: rnd(0.5, 2.5), vz: Math.sin(a) * rnd(0.5, 2), g: 9, life: rnd(0.3, 0.6), size: rnd(0.06, 0.1), tex: 'square', color: o.color || '#d8d8d8' });
    else if (type === 'heart') emit({ x: x + rnd(-0.3, 0.3), y: y + rnd(-0.2, 0.3), z: z + rnd(-0.3, 0.3), vx: rnd(-0.3, 0.3), vy: rnd(0.6, 1.4), vz: rnd(-0.3, 0.3), life: rnd(0.6, 1), size: rnd(0.14, 0.2), tex: 'heart', color: '#7a0f12' });
    else if (type === 'smoke') emit({ x: x + rnd(-0.4, 0.4), y: y + rnd(0, 1.6), z: z + rnd(-0.4, 0.4), vx: rnd(-0.3, 0.3), vy: rnd(0.4, 1.2), vz: rnd(-0.3, 0.3), life: rnd(0.6, 1.2), size: rnd(0.25, 0.45), grow: 0.4, tex: 'smoke', color: o.color || '#e6e6e6' });
    else if (type === 'explode') emit({ x: x + rnd(-0.6, 0.6), y: y + rnd(-0.3, 0.9), z: z + rnd(-0.6, 0.6), vx: Math.cos(a) * Math.cos(el) * rnd(1, 5), vy: Math.sin(el) * rnd(1, 4) + 1, vz: Math.sin(a) * Math.cos(el) * rnd(1, 5), life: rnd(0.3, 0.6), size: rnd(0.25, 0.55), grow: 0.7, drag: 0.86, tex: 'smoke', color: ['#ffffff', '#dcdcdc', '#bdbdbd', '#ffcf8a'][i % 4] });
    else if (type === 'flash') emit({ x, y, z, life: 0.14, size: 1.6, grow: 3, tex: 'glow', color: '#fff0d8', add: true });
    else if (type === 'totem') emit({ x, y: y + rnd(0, 1.6), z, vx: Math.cos(a) * rnd(1, 4), vy: rnd(1, 6), vz: Math.sin(a) * rnd(1, 4), g: 5, life: rnd(0.8, 1.6), size: rnd(0.08, 0.14), tex: 'crit', color: ['#7dff4f', '#ffe14d', '#3fd36a', '#fff59e'][i % 4], drag: 0.94 });
    else if (type === 'block') emit({ x: x + rnd(-0.4, 0.4), y: y + rnd(0, 0.3), z: z + rnd(-0.4, 0.4), vx: rnd(-1.5, 1.5), vy: rnd(1, 3), vz: rnd(-1.5, 1.5), g: 14, life: rnd(0.4, 0.8), size: rnd(0.06, 0.11), tex: 'square', color: o.color || '#e9ecec' });
    else if (type === 'dust') emit({ x: x + rnd(-0.3, 0.3), y: y + 0.05, z: z + rnd(-0.3, 0.3), vx: rnd(-1, 1), vy: rnd(0.2, 0.8), vz: rnd(-1, 1), g: 2, life: rnd(0.3, 0.6), size: rnd(0.06, 0.12), tex: 'square', color: o.color || '#7d6a4f' });
    else if (type === 'wind') emit({ x, y, z, vx: (o.dir || 1) * rnd(9, 14), vy: rnd(-0.3, 0.3), vz: rnd(-0.5, 0.5), life: rnd(0.35, 0.6), size: rnd(0.07, 0.12), tex: 'square', color: ['#ffffff', '#dff3ff', '#bfe6ff'][i % 3], drag: 1, add: true });
    else if (type === 'trail') emit({ x, y, z, life: 0.35, size: 0.1, tex: 'crit', color: '#ffffff', add: true });
    else if (type === 'sweep') { emit({ x, y, z, life: 0.25, size: 1.6, grow: 2, tex: 'sweep', color: '#ffffff' }); break; }
    else if (type === 'confetti') emit({ x, y: y + 0.5, z, vx: Math.cos(a) * rnd(1, 4), vy: rnd(3, 8), vz: Math.sin(a) * rnd(1, 4), g: 9, life: rnd(1, 2), size: rnd(0.08, 0.14), tex: 'square', color: ['#ff5c7a', '#ffd23f', '#5dd39e', '#5ad0ff', '#c06bff'][i % 5], drag: 0.97 });
    else if (type === 'portal') emit({ x: x + rnd(-0.5, 0.5), y: y + rnd(0, 2), z: z + rnd(-0.5, 0.5), vx: rnd(-0.4, 0.4), vy: rnd(-0.6, 0.2), vz: rnd(-0.4, 0.4), life: rnd(0.6, 1.2), size: rnd(0.06, 0.1), tex: 'square', color: ['#b04cff', '#e070ff', '#7a2aad'][i % 3], add: true });
  }
};
function updateParticles(dt) {
  for (const p of PARTS) {
    if (p.life <= 0) continue;
    p.life -= dt;
    if (p.life <= 0) { p.s.visible = false; continue; }
    p.vy -= p.g * dt; const dr = Math.pow(p.drag, dt * 20);
    p.vx *= dr; p.vy *= dr; p.vz *= dr;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (W.flat && p.y < 0.02 && p.g > 0) { p.y = 0.02; p.vy *= -0.3; p.vx *= 0.6; p.vz *= 0.6; }
    p.size += p.grow * dt;
    p.s.position.set(p.x, p.y, p.z); p.s.scale.set(p.size, p.size, 1);
    p.s.material.opacity = p.fade ? Math.min(1, p.life / p.max * 1.8) : 1;
  }
}
R.clearParticles = () => PARTS.forEach(p => { p.life = 0; p.s.visible = false; });

// ================================================================ hitbox (F3 + B)
let hbLines = null;
function hitboxLines(b, show) {
  if (!hbLines) {
    hbLines = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0xffffff }));
    hbLines.renderOrder = 4; scene.add(hbLines);
  }
  hbLines.visible = !!(show && b);
  if (!b) return;
  hbLines.position.set((b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2);
  hbLines.scale.set(b[3] - b[0], b[4] - b[1], b[5] - b[2]);
}

// ================================================================ image
let tPrev = performance.now() / 1000;
R.frame = function (G, alpha) {
  const t = performance.now() / 1000, dt = Math.min(0.1, t - tPrev); tPrev = t;
  syncBlocks();
  const p = G.p;
  for (const e of [p, ...(G.ents || [])]) { if (!e) continue; e.rx = FP.lerp(e.px, e.x, alpha); e.ry = FP.lerp(e.py, e.y, alpha); e.rz = FP.lerp(e.pz, e.z, alpha); }
  R.syncEntities(G.ents || [], alpha, t);
  R.syncExtras(G, alpha, t);
  G.eyeH = FP.lerp(G.eyeH || 1.62, p.sneaking ? 1.27 : 1.62, Math.min(1, dt * 14));
  G.eye = [p.rx, p.ry + G.eyeH, p.rz];
  camera.position.set(G.eye[0], G.eye[1], G.eye[2]);
  const roll = G.hurtFx > 0 ? Math.sin(G.hurtFx * Math.PI) * 0.09 * G.hurtDir : 0;
  camera.rotation.set(-(G.camPitch != null ? G.camPitch : G.pitch) * DEG, Math.PI - (G.camYaw != null ? G.camYaw : G.yaw) * DEG, roll);
  const fovTarget = S.fov * (1 - (G.fovZoom || 0) * S.fovEffects / 100);
  camera.fov = FP.lerp(camera.fov, fovTarget, Math.min(1, dt * 12)); camera.updateProjectionMatrix();
  // lumière qui suit le joueur
  sun.position.set(p.rx + 30, 60, p.rz + 18); dirLightTarget.position.set(p.rx, 0, p.rz);
  sky.position.copy(camera.position);
  sunSprite.position.set(camera.position.x + 120, camera.position.y + 210, camera.position.z + 72);
  clouds.position.x = ((t * 1.2) % 432) - 216 + Math.round(p.rx / 12) * 12; clouds.position.z = Math.round(p.rz / 12) * 12;
  ground.position.set(Math.round(p.rx), 0, Math.round(p.rz));
  groundMat.map.offset.set(Math.round(p.rx), -Math.round(p.rz));
  hitboxLines(G.hitbox, S.showHitbox);
  syncCrack(G.crack);
  updateParticles(dt);
  updateViewModel(dt, G);
  VM.group.visible = !G.noHand;
  renderer.clear();
  renderer.render(scene, camera);
  renderer.clearDepth();
  if (!G.noHand) renderer.render(hudScene, hudCam);
};
// fond animé du menu : caméra en orbite autour de deux combattants
R.menuFrame = function (M) {
  const t = performance.now() / 1000;
  syncBlocks();
  R.syncEntities(M.ents, 1, t);
  const a = t * 0.08, r = 9;
  camera.position.set(Math.cos(a) * r, 3.2 + Math.sin(t * 0.3) * 0.4, Math.sin(a) * r);
  camera.lookAt(0, 1.2, 0); camera.fov = 60; camera.updateProjectionMatrix();
  sun.position.set(30, 60, 18); dirLightTarget.position.set(0, 0, 0);
  sky.position.copy(camera.position);
  sunSprite.position.set(camera.position.x + 120, camera.position.y + 210, camera.position.z + 72);
  clouds.position.x = ((t * 1.2) % 432) - 216; clouds.position.z = 0;
  ground.position.set(0, 0, 0); groundMat.map.offset.set(0, 0);
  if (hbLines) hbLines.visible = false;
  updateParticles(1 / 60);
  renderer.clear(); renderer.render(scene, camera);
};
R._vm = VM;
const labels = [];
R.addLabel = (text, x, y, z) => { const t = makeTag(text); t.position.set(x, y, z); t.scale.multiplyScalar(1.6); scene.add(t); labels.push(t); };
R.clearLabels = () => { while (labels.length) scene.remove(labels.pop()); };
R.burstAt = (type, e, h, o) => R.burst(type, e.x, e.y + (h || 1), e.z, o);
})();
