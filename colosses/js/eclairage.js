'use strict';
/* Colosses — éclairage par la carte graphique (remplace le rendu « cinéma » de cinema.js quand on combat) :
   • une carte de lumière est dessinée à chaque image : ta lumière chaude, la lueur du colosse, chaque balle, chaque
     explosion, la lave, les braseros, les zones de danger et le portail éclairent vraiment le sol et les corps ;
   • relief : les pierres, les dalles et les corps prennent la lumière selon leur forme (ombres et reflets) ;
   • halo lumineux (bloom) : tout ce qui brille déborde doucement dans l'air ;
   • chaleur qui fait onduler l'air près de la lave, légère aberration quand tu es touché ;
   • l'interface est dessinée à part, par-dessus : elle reste nette et n'est jamais assombrie.
   Les dangers brillent toujours (ce qui est vif n'est jamais assombri), la lisibilité du combat ne baisse pas. */

const AMBIANCE_LUM = {
  temple: 'rgb(118,112,104)', volcan: 'rgb(118,104,96)', glace: 'rgb(110,118,130)',
  neant: 'rgb(106,100,124)', ruines: 'rgb(110,118,106)', metal: 'rgb(112,116,124)'
};

const Eclairage = {
  coupe: false, lcv: null, lx: null,
  actif() {
    return PostFX.ok && PostFX.pMonde && G.opts.postfx !== false && G.opts.lumiere !== false && !G.opts.effetsReduits && cv.width > 0;
  },
  // appelé par rendu() quand le monde est dessiné, avant les voiles et l'interface
  separer(menu) {
    this.coupe = false; this.menu = !!menu;
    if (!this.actif() || (!G.p && !menu)) return false;
    // appareil trop lent (moins de 40 images par seconde pendant 5 s de combat) : on revient à l'ancien rendu
    if (!menu && G.etat === 'combat') { this.lent = G.fps < 40 ? (this.lent || 0) + 1 / 60 : Math.max(0, (this.lent || 0) - 1 / 120); if (this.lent > 5) this.trop = true; }
    if (this.trop) return false;
    try {
      const gl = PostFX.gl;
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, PostFX.texMonde);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
      this.carte();
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, PostFX.texLum);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.lcv);
      gl.activeTexture(gl.TEXTURE0);
    } catch (e) { console.warn('Éclairage indisponible', e); PostFX.pMonde = null; return false; }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    this.coupe = true;
    return true;
  },
  // carte de lumière au quart de la taille de l'écran (la moitié de la valeur : 128 = lumière normale, 255 = double)
  carte() {
    const k = .25, w = Math.max(1, Math.ceil(cv.width * k)), h = Math.max(1, Math.ceil(cv.height * k));
    if (!this.lcv) { this.lcv = document.createElement('canvas'); this.lx = this.lcv.getContext('2d'); }
    if (this.lcv.width !== w || this.lcv.height !== h) { this.lcv.width = w; this.lcv.height = h; }
    const x = this.lx, th = Decor.themeActif(), t = G.t || 0;
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    // accueil : lumière neutre (seulement le halo et l'étalonnage)
    if (this.menu) { x.fillStyle = 'rgb(128,128,128)'; x.fillRect(0, 0, w, h); return; }
    x.fillStyle = AMBIANCE_LUM[th] || AMBIANCE_LUM.temple; x.fillRect(0, 0, w, h);
    x.setTransform(dpr * scale * k, 0, 0, dpr * scale * k, dpr * offX * k, dpr * offY * k);
    x.globalCompositeOperation = 'lighter';
    const L = (col, px, py, r, a) => {
      if (!(r > 1) || !Number.isFinite(px) || !Number.isFinite(py) || !(a > 0)) return;
      x.globalAlpha = Math.min(1, a); x.drawImage(glow(col, r), px - r, py - r, r * 2, r * 2);
    };
    const p = G.p, b = G.boss;
    // toi : une lumière chaude qui te suit, et celle de tes alliés
    if (p && p.hp > 0) L('rgba(255,232,200,.34)', p.x, p.y, 300, 1);
    for (const a of G.allies || []) if (a && a.x !== undefined) L('rgba(200,230,255,.4)', a.x, a.y, 220, 1);
    // le colosse : sa couleur, plus forte quand il est ouvert
    if (b && !b.mort && b.def) {
      const ouv = b.ouvert > 0;
      L(ouv ? 'rgba(255,214,110,.42)' : hsl(b.def.hue, 70, 55, .26), b.x, b.y, (b.r || 40) * 3.2 + 140, (b.alpha === undefined ? 1 : b.alpha) * (b.spectral > 0 ? .5 : 1));
    }
    // explosions, impacts, éclairs
    for (const l of G.lumieres) L(l.col, l.x, l.y, l.r * 1.3, (1 - l.t / l.dur) * .55);
    // lave et braseros
    for (const l of Arene.lave || []) L('rgba(255,120,40,.6)', l.x, l.y, l.r * 2, .8 + .1 * Math.sin(t * 2.3 + l.x));
    const T = THEMES[th];
    if (T && T.feu) {
      const pos = Arene.kind === 'cercle'
        ? [0, 1, 2, 3, 4, 5].map(i => { const a = i * TAU / 6 + Math.PI / 6; return [CX + Math.cos(a) * (AR.h / 2 + 12), CY + Math.sin(a) * (AR.h / 2 + 12)]; })
        : [[AR.x - 10, AR.y - 10], [AR.x + AR.w + 10, AR.y - 10], [AR.x - 10, AR.y + AR.h + 10], [AR.x + AR.w + 10, AR.y + AR.h + 10], [CX, AR.y - 10]];
      for (const [bx, by] of pos) L('rgba(255,150,70,.55)', bx, by, 200, .75 + .1 * Math.sin(t * 11 + bx) + .06 * Math.sin(t * 23 + by));
    }
    if (G.portail) L('rgba(170,130,255,.5)', G.portail.x, G.portail.y, 280, 1);
    // zones de danger : elles s'éclairent elles-mêmes (on les voit toujours)
    let n = 0;
    for (const z of G.hz) {
      if (n++ > 60) break;
      if (z.x === undefined || z.y === undefined) continue;
      const r = z.r || z.w || 60; L(z.col && /^#|^rgb|^hsl/.test(z.col) ? z.col : 'rgba(255,70,50,.7)', z.x, z.y, Math.min(400, r * 1.3), .22);
    }
    // balles du colosse et tirs : chaque balle est une petite lumière
    n = 0;
    for (const e of G.eb) { if (n++ > 180) break; L(e.col || '#ff6a5a', e.x, e.y, Math.max(24, (e.r || 6) * 4), .26); }
    n = 0;
    for (const s of G.pb) { if (n++ > 90) break; if (s.delai > 0) continue; L('rgba(255,244,226,.9)', s.x, s.y, Math.max(26, (s.r || 5) * 5), .1); }
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  }
};

// ---------- Shaders : passe lumineuse (halo), flou, image finale ----------
(function () {
  const _init = PostFX.init.bind(PostFX);
  PostFX.init = function () {
    _init();
    if (!this.ok) return;
    try {
      const gl = this.gl, hp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT).precision > 0 ? 'highp' : 'mediump';
      const vs = 'attribute vec2 p; varying vec2 uv; void main(){ uv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }';
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
      const prog = (fs, noms) => {
        const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, `precision ${hp} float; varying vec2 uv;\n` + fs));
        gl.bindAttribLocation(pr, 0, 'p'); gl.linkProgram(pr);
        if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
        const u = {}; for (const nm of noms) u[nm] = gl.getUniformLocation(pr, nm); return { pr, u };
      };
      const COMMUN = `
        float lumi(vec3 c){ return dot(c, vec3(.299, .587, .114)); }
        vec3 eclairer(sampler2D monde, sampler2D lum, vec2 q, vec2 px, float relief, out float emis, out vec3 fac){
          vec3 c0 = texture2D(monde, q).rgb;
          vec2 o = px * 1.5;
          float hL = lumi(texture2D(monde, q - vec2(o.x, 0.)).rgb), hR = lumi(texture2D(monde, q + vec2(o.x, 0.)).rgb);
          float hD = lumi(texture2D(monde, q - vec2(0., o.y)).rgb), hU = lumi(texture2D(monde, q + vec2(0., o.y)).rgb);
          vec3 n = normalize(vec3((hL - hR) * relief, (hD - hU) * relief, 1.));
          vec2 lp = px * 10.;
          vec3 L = texture2D(lum, q).rgb * 2.;
          float gx = lumi(texture2D(lum, q + vec2(lp.x, 0.)).rgb) - lumi(texture2D(lum, q - vec2(lp.x, 0.)).rgb);
          float gy = lumi(texture2D(lum, q + vec2(0., lp.y)).rgb) - lumi(texture2D(lum, q - vec2(0., lp.y)).rgb);
          vec3 ld = normalize(vec3(clamp(vec2(gx, gy) * 9., -1.2, 1.2) + vec2(-.35, .45), .6));
          float ndl = max(dot(n, ld), 0.);
          float spec = pow(max(dot(n, normalize(ld + vec3(0., 0., 1.))), 0.), 34.);
          float m = max(c0.r, max(c0.g, c0.b));
          emis = smoothstep(.62, .96, m);
          fac = L * max(.55, 1. + .7 * (ndl - ld.z));
          vec3 lit = c0 * fac + spec * L * .06 * (1. - emis);
          return mix(lit, max(lit, c0 * 1.06), emis);
        }`;
      // passe lumineuse : le monde éclairé, réduit au quart, on ne garde que ce qui brille
      this.pBri = prog(COMMUN + `
        uniform sampler2D monde, lum; uniform vec2 px; uniform float relief;
        void main(){
          float e; vec3 fa; vec3 c = vec3(0.);
          c += eclairer(monde, lum, uv + px * vec2(-1., -1.), px, relief, e, fa); c += eclairer(monde, lum, uv + px * vec2(1., -1.), px, relief, e, fa);
          c += eclairer(monde, lum, uv + px * vec2(-1., 1.), px, relief, e, fa); c += eclairer(monde, lum, uv + px * vec2(1., 1.), px, relief, e, fa);
          c *= .25;
          gl_FragColor = vec4(max(c - .68, 0.) * 1.25, 1.);
        }`, ['monde', 'lum', 'px', 'relief']);
      // flou gaussien séparé (9 points en 5 lectures)
      this.pFlou = prog(`
        uniform sampler2D src; uniform vec2 dir;
        void main(){
          vec3 s = texture2D(src, uv).rgb * .227027;
          s += (texture2D(src, uv + dir * 1.3846).rgb + texture2D(src, uv - dir * 1.3846).rgb) * .3162162;
          s += (texture2D(src, uv + dir * 3.2308).rgb + texture2D(src, uv - dir * 3.2308).rgb) * .0702703;
          gl_FragColor = vec4(s, 1.);
        }`, ['src', 'dir']);
      // image finale : monde éclairé + halo + étalonnage + vignette, puis l'interface nette par-dessus
      this.pMonde = prog(COMMUN + `
        uniform sampler2D img, monde, lum, flou; uniform vec2 res; uniform float t, force, dalto, chaleur, choc, bloomF, relief;
        vec3 rgb2hsv(vec3 c){ vec4 K = vec4(0., -1./3., 2./3., -1.); vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g)); vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r)); float d = q.x - min(q.w, q.y); float e = 1.0e-10; return vec3(abs(q.z + (q.w - q.y) / (6. * d + e)), d / (q.x + e), q.x); }
        vec3 hsv2rgb(vec3 c){ vec4 K = vec4(1., 2./3., 1./3., 3.); vec3 p = abs(fract(c.xxx + K.xyz) * 6. - K.www); return c.z * mix(K.xxx, clamp(p - K.xxx, 0., 1.), c.y); }
        float h1(vec2 q){ return fract(sin(dot(q, vec2(12.9898, 78.233))) * 43758.5453); }
        void main(){
          vec2 px = 1. / res, d = uv - .5; float r2 = dot(d, d);
          vec2 q = uv;
          // l'air qui ondule près de la lave
          if (chaleur > 0.) q += vec2(sin(uv.y * 85. + t * 3.1) + sin(uv.y * 31. - t * 1.7), cos(uv.x * 70. + t * 2.3)) * px * .7 * chaleur;
          float e; vec3 fac; vec3 col = eclairer(monde, lum, q, px, relief, e, fac);
          // aberration chromatique : très légère sur les bords, plus forte quand tu es touché
          float ab = choc * force;
          if (ab > .02) { vec2 off = d * px * 9. * ab; float rr = texture2D(monde, q + off).r, bb = texture2D(monde, q - off).b; col.r = mix(rr * fac.r, max(rr * fac.r, rr * 1.06), e); col.b = mix(bb * fac.b, max(bb * fac.b, bb * 1.06), e); }
          // étalonnage : un peu désaturé, ombres froides, lumières dorées, contraste, courbe filmique
          float l = lumi(col);
          col = mix(vec3(lumi(col)), col, mix(1., .86, force));
          col *= mix(vec3(1.), mix(vec3(.88, .95, 1.06), vec3(1.08, 1.0, .86), smoothstep(.1, .8, l)), force);
          col = mix(col, (col - .5) * 1.08 + .5, force);
          vec3 f = col * (2.51 * col + .03) / (col * (2.43 * col + .59) + .14);
          col = mix(col, f, .5 * force);
          // halo lumineux
          col += texture2D(flou, uv).rgb * bloomF;
          // vignette et grain très fin
          float v = smoothstep(.85, .2, length(d * vec2(1., .9)));
          col *= mix(1., mix(.66, 1., v), force);
          col += (h1(uv * res + fract(t) * 91.) - .5) * .008 * force;
          // l'interface, nette, par-dessus
          vec4 hud = texture2D(img, uv);
          col = mix(clamp(col, 0., 1.), hud.rgb, hud.a);
          if (dalto > .5) {
            vec3 hsv = rgb2hsv(clamp(col, 0., 1.)); float hh = hsv.x, s = smoothstep(.3, .5, hsv.y) * smoothstep(.12, .25, hsv.z);
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
        }`, ['img', 'monde', 'lum', 'flou', 'res', 't', 'force', 'dalto', 'chaleur', 'choc', 'bloomF', 'relief']);
      const tex = lin => {
        const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, lin ? gl.LINEAR : gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, lin ? gl.LINEAR : gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
        return t;
      };
      this.mkTex = tex;
      gl.activeTexture(gl.TEXTURE1); this.texMonde = tex(true);
      gl.activeTexture(gl.TEXTURE2); this.texLum = tex(true);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex);
      this.fA = null; this.fB = null;
      gl.useProgram(this.prog);
    } catch (e) { console.warn('Éclairage indisponible', e); this.pMonde = null; }
  };

  PostFX.cible = function (w, h) {
    const gl = this.gl, mk = () => {
      gl.activeTexture(gl.TEXTURE3);
      const t = this.mkTex(true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE0);
      return { t, f, w, h };
    };
    const lib = o => { if (o) { gl.deleteTexture(o.t); gl.deleteFramebuffer(o.f); } };
    if (!this.fA || this.fA.w !== w || this.fA.h !== h) { lib(this.fA); lib(this.fB); this.fA = mk(); this.fB = mk(); }
  };

  const _rendre = PostFX.rendre.bind(PostFX);
  PostFX.rendre = function () {
    const monde = Eclairage.coupe; Eclairage.coupe = false;
    if (!monde || !this.pMonde) {
      // pas de monde éclairé (menu, écran de chargement…) : l'ancien rendu, avec son programme
      if (this.ok && this.pMonde) this.gl.useProgram(this.prog);
      return _rendre();
    }
    const gl = this.gl, c = this.cv;
    if (c.width !== cv.width || c.height !== cv.height) { c.width = cv.width; c.height = cv.height; }
    c.style.display = 'block'; cv.style.opacity = '0';
    const force = G.opts.postfx === false ? 0 : (G.opts.postfxForce || 1), dalto = { rv: 1, bj: 2 }[G.opts.dalto] || 0;
    const menu = Eclairage.menu, relief = menu ? 0 : 1.8 / Math.max(1, dpr), th = Decor.themeActif();
    // l'interface (dessinée après la coupe) part dans l'unité 0
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    // halo : passe lumineuse au quart puis deux flous
    const w4 = Math.max(1, Math.ceil(c.width / 4)), h4 = Math.max(1, Math.ceil(c.height / 4));
    this.cible(w4, h4);
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, null);
    gl.useProgram(this.pBri.pr); const ub = this.pBri.u;
    gl.uniform1i(ub.monde, 1); gl.uniform1i(ub.lum, 2); gl.uniform2f(ub.px, 1 / c.width, 1 / c.height); gl.uniform1f(ub.relief, relief);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fA.f); gl.viewport(0, 0, w4, h4); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.useProgram(this.pFlou.pr); gl.uniform1i(this.pFlou.u.src, 3);
    const passe = (de, vers, dx, dy) => { gl.bindFramebuffer(gl.FRAMEBUFFER, vers.f); gl.bindTexture(gl.TEXTURE_2D, de.t); gl.uniform2f(this.pFlou.u.dir, dx, dy); gl.drawArrays(gl.TRIANGLES, 0, 3); };
    passe(this.fA, this.fB, 1 / w4, 0); passe(this.fB, this.fA, 0, 1 / h4);
    passe(this.fA, this.fB, 2.2 / w4, 0); passe(this.fB, this.fA, 0, 2.2 / h4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, c.width, c.height);
    gl.bindTexture(gl.TEXTURE_2D, this.fA.t);
    // image finale
    gl.useProgram(this.pMonde.pr); const u = this.pMonde.u;
    gl.uniform1i(u.img, 0); gl.uniform1i(u.monde, 1); gl.uniform1i(u.lum, 2); gl.uniform1i(u.flou, 3);
    gl.uniform2f(u.res, c.width, c.height); gl.uniform1f(u.t, G.t || performance.now() / 1000);
    gl.uniform1f(u.force, force); gl.uniform1f(u.dalto, dalto); gl.uniform1f(u.relief, relief);
    gl.uniform1f(u.chaleur, menu ? 0 : (Arene.lave && Arene.lave.length ? .8 : 0) * force);
    gl.uniform1f(u.choc, menu ? 0 : Math.min(.5, ((G.p && G.p.rouge) || 0) * 1.2));
    gl.uniform1f(u.bloomF, (menu ? .22 : .4) * force);
    gl.activeTexture(gl.TEXTURE0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
})();

// ---------- ombres douces sous le colosse et sous toi (occlusion au sol) ----------
const _bossOmbreEcl = dessinerBoss;
dessinerBoss = function (c, b) {
  if (c === ctx && b && !b.mort && b.def && !(b.spectral > 0) && G.etat !== 'menu' && !G.opts.effetsReduits) {
    const r = (b.r || 40) * 1.5, a = (b.alpha === undefined ? 1 : b.alpha) * .55 * Math.max(0, 1 - (b.haut || 0) / 300);
    if (a > .02) { c.save(); c.globalAlpha = a; c.translate(b.x + b.r * .18, b.y + b.r * .32); c.scale(1, .72); c.drawImage(glow('rgba(0,0,0,.9)', r), -r, -r, r * 2, r * 2); c.restore(); }
  }
  return _bossOmbreEcl.apply(this, arguments);
};
const _joueurOmbreEcl = dessinerJoueur;
dessinerJoueur = function (c) {
  const p = G.p;
  if (c === ctx && p && p.hp > 0 && !G.opts.effetsReduits) { const r = (p.r || 12) * 2.2; c.save(); c.globalAlpha = .5; c.translate(p.x + 3, p.y + 6); c.scale(1, .7); c.drawImage(glow('rgba(0,0,0,.9)', r), -r, -r, r * 2, r * 2); c.restore(); }
  return _joueurOmbreEcl.apply(this, arguments);
};
