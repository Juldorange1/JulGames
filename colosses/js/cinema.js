'use strict';
/* Colosses — rendu « cinéma » : passe de shaders WebGL sur toute l'image (étalonnage sombre et doré, halo, aberration
   chromatique, grain, vignette), typographie gravée, titre du boss à son entrée, barre de vie à dégâts retardés,
   bannière « ENNEMI ABATTU », et aura des boss (fumée, cercle runique, braises). */

const POLICE_ER = 'Cinzel, "Trajan Pro", Georgia, "Times New Roman", serif';
try { document.fonts && document.fonts.load('900 40px Cinzel'); } catch (e) { }

// ---------- Shaders ----------
const PostFX = {
  ok: false, gl: null, cv: null, prog: null, tex: null, u: {},
  init() {
    try {
      const c = document.createElement('canvas'); c.id = 'fx';
      c.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;display:block;pointer-events:none;';
      const gl = c.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
      if (!gl) return;
      const vs = 'attribute vec2 p; varying vec2 uv; void main(){ uv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }';
      const hp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT).precision > 0 ? 'highp' : 'mediump';
      const fs = `precision ${hp} float;
        varying vec2 uv; uniform sampler2D img; uniform vec2 res; uniform float t; uniform float force; uniform float dalto;
        vec3 rgb2hsv(vec3 c){ vec4 K = vec4(0., -1./3., 2./3., -1.); vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g)); vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r)); float d = q.x - min(q.w, q.y); float e = 1.0e-10; return vec3(abs(q.z + (q.w - q.y) / (6. * d + e)), d / (q.x + e), q.x); }
        vec3 hsv2rgb(vec3 c){ vec4 K = vec4(1., 2./3., 1./3., 3.); vec3 p = abs(fract(c.xxx + K.xyz) * 6. - K.www); return c.z * mix(K.xxx, clamp(p - K.xxx, 0., 1.), c.y); }
        float h(vec2 q){ return fract(sin(dot(q, vec2(12.9898, 78.233))) * 43758.5453); }
        vec3 lum3(vec3 c){ return vec3(dot(c, vec3(.299, .587, .114))); }
        void main(){
          vec2 d = uv - .5; float r2 = dot(d, d);
          // image nette : un seul échantillon, pixel pour pixel
          vec3 col = texture2D(img, uv).rgb;
          // étalonnage : un peu désaturé, ombres froides, lumières dorées, contraste
          float l = dot(col, vec3(.299, .587, .114));
          col = mix(lum3(col), col, mix(1., .82, force));
          vec3 ombre = vec3(.86, .95, 1.06), lumiere = vec3(1.1, 1.0, .82);
          col *= mix(vec3(1.), mix(ombre, lumiere, smoothstep(.1, .7, l)), force);
          col = mix(col, (col - .5) * 1.1 + .5, force);
          // courbe filmique douce
          vec3 f = col * (2.51 * col + .03) / (col * (2.43 * col + .59) + .14);
          col = mix(col, f, .45 * force);
          // vignette et brume des coins
          float v = smoothstep(.85, .2, length(d * vec2(1., .9)));
          col *= mix(1., mix(.42, 1., v), force);
          // mode daltonien : les rouges (dangers) deviennent bleus et les verts jaunes ; ou les bleus deviennent roses
          if (dalto > .5) {
            vec3 hsv = rgb2hsv(clamp(col, 0., 1.)); float hh = hsv.x, s = smoothstep(.3, .5, hsv.y) * smoothstep(.12, .25, hsv.z);
            // on remplace la couleur (mélange en RVB, jamais de dégradé de teinte qui ferait un arc-en-ciel)
            if (dalto < 1.5) {
              float rouge = (1. - smoothstep(.025, .05, hh)) + smoothstep(.92, .95, hh);
              float vert = smoothstep(.22, .27, hh) * (1. - smoothstep(.42, .47, hh));
              col = mix(col, hsv2rgb(vec3(.58, hsv.y, hsv.z)), clamp(rouge * s, 0., 1.));
              col = mix(col, hsv2rgb(vec3(.15, hsv.y, hsv.z)), clamp(vert * s, 0., 1.));
            } else {
              float bleu = smoothstep(.52, .56, hh) * (1. - smoothstep(.7, .74, hh));
              col = mix(col, hsv2rgb(vec3(.9, hsv.y, hsv.z)), clamp(bleu * s, 0., 1.));
            }
          }
          gl_FragColor = vec4(clamp(col, 0., 1.), 1.);
        }`;
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
      const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
      gl.useProgram(pr);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      this.u = { res: gl.getUniformLocation(pr, 'res'), t: gl.getUniformLocation(pr, 't'), force: gl.getUniformLocation(pr, 'force'), img: gl.getUniformLocation(pr, 'img'), dalto: gl.getUniformLocation(pr, 'dalto') };
      gl.uniform1i(this.u.img, 0);
      cv.after(c);
      Object.assign(this, { gl, cv: c, prog: pr, tex, ok: true });
    } catch (e) { console.warn('Effets cinématiques indisponibles', e); this.ok = false; }
  },
  rendre() {
    const dalto = { rv: 1, bj: 2 }[G.opts.dalto] || 0;
    const actif = this.ok && (G.opts.postfx !== false || dalto) && cv.width > 0; // le mode daltonien a besoin du shader
    if (!actif) { if (this.cv) this.cv.style.display = 'none'; cv.style.opacity = '1'; return; }
    const gl = this.gl, c = this.cv;
    if (c.width !== cv.width || c.height !== cv.height) { c.width = cv.width; c.height = cv.height; gl.viewport(0, 0, c.width, c.height); }
    c.style.display = 'block'; cv.style.opacity = '0';
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    gl.uniform2f(this.u.res, c.width, c.height); gl.uniform1f(this.u.t, G.t || performance.now() / 1000);
    gl.uniform1f(this.u.force, G.opts.postfx === false ? 0 : (G.opts.postfxForce || 1)); gl.uniform1f(this.u.dalto, dalto);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
};
window.addEventListener('load', () => PostFX.init());

// ---------- Aura des boss : fumée sombre, cercle runique au sol, braises ----------
const _dessinerBossBase = dessinerBoss;
dessinerBoss = function (c, b) {
  if (!b || b.mort || !b.def) return _dessinerBossBase(c, b);
  const h = b.def.hue, t = G.t || 0, r = b.r, menu = !G.p || G.etat === 'menu';
  if (!(b.spectral > 0) && b.alpha > .3 && !G.opts.effetsReduits) {
    c.save(); c.translate(b.x, b.y);
    // lueur au sol et cercle runique qui tourne lentement
    c.globalCompositeOperation = 'lighter';
    c.drawImage(glow(hsl(h, 90, 45, .22), r * 3.2), -r * 3.2, -r * 3.2);
    sprite(c, 'circle4', hsl(h, 100, 60), 0, 0, r * 4.4, t * .15, b.def.mega ? .25 : .14, true);
    c.globalCompositeOperation = 'source-over';
    // fumée noire qui s'enroule autour de lui (une silhouette qui écrase la lumière)
    for (let i = 0; i < 5; i++) {
      const a = t * (.25 + i * .05) + i * 1.26, d = r * (1 + .15 * Math.sin(t + i));
      sprite(c, ['smoke_03', 'smoke_05', 'smoke_07'][i % 3], '#07040a', Math.cos(a) * d, Math.sin(a) * d * .8, r * 2.3, a, .5, false);
    }
    // liseré de sa couleur dans la fumée
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) { const a = -t * .4 + i * 2.1; sprite(c, 'smoke_05', hsl(h, 100, 55), Math.cos(a) * r * .9, Math.sin(a) * r * .7, r * 2, a, .16, true); }
    c.globalCompositeOperation = 'source-over';
    c.restore();
  }
  _dessinerBossBase(c, b);
  // braises et cendres qui montent de lui
  if (!menu && !G.opts.effetsReduits && G.parts.length < 700 && Math.random() < .5 * QUAL()) {
    const a = Math.random() * TAU, d = r * (.4 + Math.random() * .8);
    G.parts.push({ x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d, vx: (Math.random() - .5) * 20, vy: -30 - Math.random() * 50, life: 1.4, max: 1.4, col: Math.random() < .5 ? '#ffb347' : hsl(h, 100, 70), r: 1.2 + Math.random() * 1.6, add: true });
  }
};

// ---------- Typographie gravée : titre du boss, barre façon dark fantasy, bannières ----------
function bandeauER(c, y, haut, alpha) {
  const g = c.createLinearGradient(0, y - haut / 2, 0, y + haut / 2);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.5, `rgba(0,0,0,${.72 * alpha})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, y - haut / 2, W, haut);
}
function texteGrave(c, txt, x, y, taille, col, alpha, lueur) {
  c.save(); c.globalAlpha = alpha; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = `700 ${taille}px ${POLICE_ER}`;
  if (lueur) { c.shadowColor = lueur; c.shadowBlur = taille * .6; }
  c.fillStyle = col; c.fillText(txt, x, y);
  c.shadowBlur = 0; c.lineWidth = 1; c.strokeStyle = 'rgba(0,0,0,.6)'; c.strokeText(txt, x, y);
  c.restore();
}
const _dessinerHUD = dessinerHUD;
dessinerHUD = function (c) {
  _dessinerHUD(c);
  const b = G.boss, def = G.def;
  // dégâts retardés : un segment doré suit la vie du boss avec un temps de retard
  if (b && def && !b.mort) {
    const bw = 640, bx = W / 2 - bw / 2, by = 40, k = Math.max(0, b.hp) / b.hpMax;
    b.retard = b.retard === undefined ? k : b.retard;
    if (b.retard > k) { b.retardT = (b.retardT || 0) + 1 / 60; if (b.retardT > .6) b.retard = Math.max(k, b.retard - .35 / 60); } else { b.retard = k; b.retardT = 0; }
    if (b.retard > k + .001) { c.fillStyle = 'rgba(255,214,120,.85)'; c.fillRect(bx + bw * k, by, bw * (b.retard - k), 14); }
    // filet doré autour de la barre
    c.strokeStyle = 'rgba(214,180,110,.75)'; c.lineWidth = 1; c.strokeRect(bx - 3.5, by - 3.5, bw + 7, 21);
    for (const s of [-1, 1]) { const x = W / 2 + s * (bw / 2 + 12); c.fillStyle = 'rgba(214,180,110,.9)'; c.beginPath(); c.moveTo(x, by + 7 - 5); c.lineTo(x + s * 6, by + 7); c.lineTo(x, by + 7 + 5); c.lineTo(x - s * 6, by + 7); c.closePath(); c.fill(); }
  }
  // titre du boss à son entrée
  if (b && def && b.intro > 0) {
    const k = clamp(b.intro > 1.6 ? (2.1 - b.intro) / .5 : b.intro < .4 ? b.intro / .4 : 1, 0, 1), y = H * .62;
    bandeauER(c, y, 150, k);
    texteGrave(c, def.nom.toUpperCase(), W / 2, y - 12, 58, def.legendaire ? '#ffcf6b' : '#e9dcc0', k, def.mega || def.legendaire ? 'rgba(255,190,80,.7)' : hsl(def.hue, 90, 50, .6));
    texteGrave(c, (def.mega ? 'Seigneur du palier — ' : '') + def.titre, W / 2, y + 34, 20, '#bfae8a', k * .9);
    c.save(); c.globalAlpha = k * .8; c.strokeStyle = '#bfae8a'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(W / 2 - 260, y + 14); c.lineTo(W / 2 + 260, y + 14); c.stroke(); c.restore();
  }
  // bannière de victoire
  const bn = G.banniere;
  if (bn) {
    bn.t += 1 / 60;
    const k = Math.min(1, bn.t * 2.2, Math.max(0, (3.2 - bn.t) * 1.5));
    if (k <= 0 && bn.t > 1) G.banniere = null;
    else {
      const y = H * .42, ech = 1 + Math.max(0, .12 - bn.t * .1);
      bandeauER(c, y, 130, k);
      c.save(); c.translate(W / 2, y); c.scale(ech, ech);
      texteGrave(c, bn.txt, 0, 0, bn.grand ? 60 : 54, '#f1d99a', k, 'rgba(255,200,90,.85)');
      c.restore();
    }
  }
};
const _bossMort = G.bossMort;
G.bossMort = function () {
  const avant = this.boss && !this.boss.mort;
  _bossMort.call(this);
  if (avant) { this.banniere = { txt: this.def.mega ? 'GRAND ENNEMI ABATTU' : this.def.legendaire ? 'LÉGENDE ABATTUE' : 'ENNEMI ABATTU', t: 0, grand: !!this.def.mega }; this.annonceT = 0; }
};
const _entrerSalleCinema = G.entrerSalle;
G.entrerSalle = function () { this.banniere = null; return _entrerSalleCinema.apply(this, arguments); };

// ---------- Auréole dorée des méga boss et des légendaires ----------
const _dessinerBossCinema = dessinerBoss;
dessinerBoss = function (c, b) {
  if (b && b.def && (b.def.mega || b.def.legendaire) && !b.mort && !(b.spectral > 0)) {
    const t = G.t || 0, r = b.r;
    c.save(); c.translate(b.x, b.y - (b.haut || 0)); c.rotate(t * .08);
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 24; i++) {
      const a = i * TAU / 24, L = r * (1.9 + (i % 2 ? .35 : .8) + .1 * Math.sin(t * 2 + i));
      const g = c.createLinearGradient(Math.cos(a) * r * 1.2, Math.sin(a) * r * 1.2, Math.cos(a) * L, Math.sin(a) * L);
      g.addColorStop(0, 'rgba(255,214,130,.45)'); g.addColorStop(1, 'rgba(255,214,130,0)');
      c.strokeStyle = g; c.lineWidth = i % 2 ? 2 : 4; c.beginPath(); c.moveTo(Math.cos(a) * r * 1.2, Math.sin(a) * r * 1.2); c.lineTo(Math.cos(a) * L, Math.sin(a) * L); c.stroke();
    }
    c.strokeStyle = 'rgba(255,220,150,.35)'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, r * 1.75, 0, TAU); c.stroke();
    c.globalCompositeOperation = 'source-over';
    c.restore();
  }
  _dessinerBossCinema(c, b);
};

// ---------- Changement de phase : ralenti, onde de choc et assombrissement ----------
const _passerPhase = passerPhase;
passerPhase = function (b) {
  _passerPhase(b);
  G.cine = { t: 0, x: b.x, y: b.y, col: b.def.hue, nom: phaseCourante(b).nom };
  G.ralentir(.3, .9);
  Decor.brulure(b.x, b.y, b.r * 3);
};
const _dessinerHUDCinema = dessinerHUD;
dessinerHUD = function (c) {
  const ci = G.cine;
  if (ci) {
    ci.t += 1 / 60;
    const k = Math.max(0, 1 - ci.t / 1.8);
    if (k <= 0) G.cine = null;
    else {
      c.fillStyle = `rgba(0,0,0,${.45 * k})`; c.fillRect(0, 0, W, H);
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) { const rr = (ci.t * 900 - i * 120); if (rr <= 0) continue; c.strokeStyle = hsl(ci.col, 100, 65, .5 * k); c.lineWidth = 10 - i * 3; c.beginPath(); c.arc(ci.x, ci.y, rr, 0, TAU); c.stroke(); }
      c.restore();
      texteGrave(c, ci.nom.toUpperCase(), W / 2, H * .3, 40, '#e9dcc0', Math.min(1, ci.t * 3) * k, hsl(ci.col, 90, 50, .7));
    }
  }
  _dessinerHUDCinema(c);
};

// ---------- Cristaux : compteur en haut à gauche, les cristaux gagnés y volent ----------
const _dessinerHUDCristaux = dessinerHUD;
dessinerHUD = function (c) {
  _dessinerHUDCristaux(c);
  if (!G.p || G.mode !== 'normal') return;
  const gc = G.gainCristaux, cx = 204, cy = 26; // à droite de « Salle N », dans le cadre
  let puls = 0;
  if (gc) {
    gc.t += 1 / 60;
    const k = Math.min(1, Math.max(0, (gc.t - .5) / 1.1)), e = k * k * (3 - 2 * k);
    if (gc.t < 1.6) {
      const x = lerp(gc.x, cx, e), y = lerp(gc.y, cy, e) - Math.sin(e * Math.PI) * 120;
      c.save(); c.globalCompositeOperation = 'lighter'; c.drawImage(glow('rgba(140,220,255,.8)', 26), x - 26, y - 26); c.restore();
      icoDessin(c, 'ui:cristal', x, y, 26);
      texteGrave(c, gc.demi ? '+½ cristal' : '+' + gc.n + ' cristal' + (gc.n > 1 ? 'x' : ''), gc.x, gc.y - 70 - gc.t * 20, 24, '#bfefff', Math.min(1, gc.t * 3) * Math.max(0, 1.6 - gc.t), 'rgba(120,210,255,.8)');
    } else if (gc.t < 2.2) puls = 1 - (gc.t - 1.6) / .6;
    else G.gainCristaux = null;
  }
  c.save(); c.textAlign = 'left'; c.textBaseline = 'middle';
  icoDessin(c, 'ui:cristal', cx, cy, 18 + puls * 6);
  texteOmbre(c, String(forgeSave().eclats), cx + 16, cy + 1, puls > 0 ? '#ffffff' : '#bfefff', `700 ${15 + puls * 4}px ${POLICE_ER}`, 3);
  c.restore();
};
