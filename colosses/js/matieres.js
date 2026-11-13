'use strict';
/* Colosses — atelier de matières : les sols et ce qui entoure l'arène sont peints par la carte graphique, une seule
   fois par salle (puis gardés en image) : vraie pierre taillée aux arêtes usées, basalte aux fissures de lave, glace
   craquelée, tôle rivetée et rouillée, marbre veiné, mousse, boue et eau, dalles flottant dans le ciel…
   Chaque matière a un relief éclairé (lumière en haut à gauche), des joints sombres, de l'usure et du grain.
   Le décor remplit aussi les bords de l'écran (plus de bandes noires sur les écrans larges).
   Les sols restent sombres et peu contrastés : les dangers et les balles ressortent toujours.
   Sans WebGL (ou avec « effets réduits »), l'ancien dessin est gardé. */

const THEME_ID = { temple: 0, volcan: 1, glace: 2, neant: 3, ruines: 4, metal: 5, marais: 6, cathedrale: 7, celeste: 8 };
const MARGE_FOND = { x: 340, y: 210 }; // le fond déborde du monde pour couvrir tout l'écran

const MAT_TETE = `
uniform vec2 res; uniform float k, seed, mode, cercle; uniform vec4 ar; uniform vec2 dec;
float hash1(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031 + seed * .0131); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash2(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973) + seed * .0173); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash1(i), hash1(i + vec2(1., 0.)), u.x), mix(hash1(i + vec2(0., 1.)), hash1(i + vec2(1., 1.)), u.x), u.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= .5; } return s; }
float fbm3(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 3; i++) { s += a * noise(p); p = p * 2.07 + vec2(5.3, 1.7); a *= .5; } return s; }
// voronoï : distance au bord de la cellule, distance au centre, identifiant
vec3 voro(vec2 x){
  vec2 n = floor(x), f = fract(x), mg = vec2(0.), mr = vec2(0.); float md = 8.;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 g = vec2(float(i), float(j)); vec2 o = hash2(n + g) * .8 + .1; vec2 r = g + o - f; float d = dot(r, r); if (d < md) { md = d; mr = r; mg = g; } }
  md = 8.;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 g = mg + vec2(float(i), float(j)); vec2 o = hash2(n + g) * .8 + .1; vec2 r = g + o - f; if (dot(mr - r, mr - r) > .00001) md = min(md, dot(.5 * (mr + r), normalize(r - mr))); }
  return vec3(md, length(mr), hash1(n + mg));
}
// dalles appareillées : distance au joint (px), identifiant, position dans la dalle
vec4 dalles(vec2 p, vec2 s, float bond){
  float row = floor(p.y / s.y);
  float off = bond * (mod(row, 2.) * .5 * s.x + (hash1(vec2(row, 3.7)) - .5) * s.x * .3);
  float col = floor((p.x - off) / s.x);
  vec2 l = vec2(p.x - off - col * s.x, p.y - row * s.y);
  return vec4(min(min(l.x, s.x - l.x), min(l.y, s.y - l.y)), hash1(vec2(col, row) + 7.), l);
}
float fissures(vec2 p, float id, float prob){ vec3 v = voro(p / 48. + id * 9.); return (1. - smoothstep(0., .022, v.x)) * step(1. - prob, fract(id * 7.31)) * smoothstep(.35, .6, noise(p * .03 + id * 4.)); }

`;
const MAT_SOL = `// ---------- sols : relief h, couleur a, lumière propre e, brillance sp ----------
void sol(vec2 p, out float h, out vec3 a, out vec3 e, out float sp){
  e = vec3(0.); sp = 0.;
  
#if TH == 0
  { // temple : grandes dalles de pierre calcaire, usées
    vec4 t = dalles(p, vec2(132., 88.), 1.);
    float d = t.x + (fbm3(p * .07) - .5) * 6.;
    float bev = smoothstep(0., 7., d);
    vec3 base = mix(vec3(.20, .172, .138), vec3(.265, .232, .188), t.y);
    float gr = fbm(p * .045 + t.y * 13.);
    base *= .8 + .4 * gr; base *= .92 + .16 * noise(p * .7);
    float cr = fissures(p, t.y, .45);
    float use = smoothstep(380., 0., length(p - ar.xy - ar.zw * .5)); base *= 1. + use * .1;
    a = mix(vec3(.045, .04, .035), base, smoothstep(0., 3., d)) * (1. - cr * .55);
    h = bev * .9 + gr * .18 - cr * .35; sp = .06;
  }
#elif TH == 1
  { // volcan : colonnes de basalte, cendre, fissures de lave
    vec3 v = voro(p / 46.);
    float d = v.x * 46. + (noise(p * .2) - .5) * 2.5;
    float bev = smoothstep(0., 6.5, d);
    vec3 base = mix(vec3(.072, .062, .058), vec3(.12, .10, .088), v.z) * (.78 + .44 * fbm(p * .06 + v.z * 9.));
    float cendre = smoothstep(.52, .82, fbm(p * .011 + 4.)); base = mix(base, vec3(.2, .185, .17), cendre * .35);
    base += vec3(.05) * step(.985, noise(p * 1.3));
    float lav = smoothstep(.48, .7, fbm3(p * .007 + 2.));
    float jn = 1. - smoothstep(0., 3.2, d);
    e = vec3(1., .3, .04) * jn * lav * (.55 + .45 * noise(p * .05)) * .9;
    a = mix(vec3(.025, .018, .016), base, bev);
    h = bev * .85 + fbm3(p * .09) * .12; sp = .04;
  }
#elif TH == 2
  { // glace : plaques craquelées, profondeur, givre
    vec3 v = voro(p / 120.);
    float d = v.x * 120.;
    vec3 base = mix(vec3(.09, .19, .27), vec3(.15, .28, .38), v.z);
    base = mix(base, base * .6, fbm(p * .01));
    vec3 vc = voro(p / 34. + 11.);
    float cr = (1. - smoothstep(0., .03, vc.x)) * step(.5, noise(p * .01 + 3.));
    float jn = 1. - smoothstep(0., 2.5, d);
    base += vec3(.32, .42, .48) * (cr * .3 + jn * .45);
    float neige = smoothstep(.56, .86, fbm(p * .008 + 3.)); base = mix(base, vec3(.5, .57, .63), neige * .55);
    base += step(.994, hash1(floor(p * .5))) * .12;
    a = base; h = .5 + fbm3(p * .03) * .2 - jn * .3 - cr * .1; sp = .45 * (1. - neige);
  }
#elif TH == 3
  { // néant : îlots de roche au-dessus du vide étoilé
    vec3 v = voro(p / 72.);
    float d = v.x * 72. + (fbm3(p * .05) - .5) * 12.;
    float isl = step(.38, v.z);
    float roc = isl * smoothstep(8., 12., d);
    vec3 ciel = mix(vec3(.012, .008, .03), vec3(.11, .045, .2), fbm(p * .004)) + vec3(.04, .07, .16) * pow(fbm(p * .006 + 7.), 3.) * 2.;
    float st = step(.996, hash1(floor(p * .6))); ciel += st * hash1(floor(p * .6) + 1.) * .8;
    vec3 rk = vec3(.085, .072, .115) * (.75 + .5 * fbm(p * .07 + v.z * 5.));
    a = rk * roc;
    e = ciel * (1. - roc) + isl * (1. - smoothstep(0., 2.5, abs(d - 10.))) * vec3(.42, .28, .85) * .35;
    h = roc * (.6 + fbm3(p * .06) * .3); sp = .05;
  }
#elif TH == 4
  { // ruines : dalles cassées, terre, mousse
    vec4 t = dalles(p, vec2(78.), 1.);
    float manque = step(.86, fract(t.y * 13.7));
    float d = t.x + (fbm3(p * .06) - .5) * 9.;
    float bev = smoothstep(0., 6., d) * (1. - manque);
    vec3 pierre = mix(vec3(.145, .148, .135), vec3(.205, .205, .185), t.y) * (.78 + .44 * fbm(p * .05 + t.y * 9.));
    vec3 terre = vec3(.11, .085, .058) * (.7 + .6 * fbm(p * .08)) + vec3(.06) * step(.93, noise(p * .5));
    float mousse = smoothstep(.45, .75, fbm(p * .014 + 2.));
    float mj = clamp((1. - smoothstep(0., 12., d)) * (.4 + mousse) + mousse * .45, 0., 1.);
    vec3 mcol = vec3(.095, .15, .058) * (.7 + .6 * noise(p * .4));
    float cr = fissures(p, t.y, .4);
    a = mix(terre, pierre, bev) * (1. - cr * .5);
    a = mix(a, mcol, mj * .8);
    h = bev * .8 + mousse * .1 - cr * .3 + fbm3(p * .1) * .08; sp = .03;
  }
#elif TH == 5
  { // forge : tôles brossées, rivets, rouille, grilles chaudes
    vec4 t = dalles(p, vec2(80.), 0.);
    float bev = smoothstep(0., 4., t.x);
    float brosse = noise(vec2(p.x * .03, p.y * 1.4) + t.y * 40.);
    vec3 base = mix(vec3(.10, .112, .128), vec3(.148, .162, .18), t.y) * (.85 + .3 * brosse);
    float rouille = smoothstep(.55, .82, fbm(p * .02 + t.y * 3.)); base = mix(base, vec3(.19, .095, .045), rouille * .45);
    float huile = smoothstep(.66, .9, fbm(p * .01 + 9.)); base *= 1. - huile * .35;
    vec2 q = min(t.zw, 80. - t.zw); float riv = 1. - smoothstep(1.4, 3., length(q - 9.));
    float grille = step(fract(t.y * 17.3), .1);
    vec2 l = t.zw;
    float fente = grille * step(.5, fract(l.y / 10.)) * step(12., l.x) * step(l.x, 68.) * step(12., l.y) * step(l.y, 68.);
    a = mix(vec3(.02, .022, .026), base, bev) * (1. - fente * .85) + vec3(.05) * riv;
    e = vec3(1., .42, .1) * .2 * fente;
    // bandes de danger usées le long des bords haut et bas
    float bande = clamp(step(p.y, ar.y + 16.) + step(ar.y + ar.w - 16., p.y), 0., 1.);
    float raie = step(.5, fract((p.x + p.y) / 28.));
    a = mix(a, mix(vec3(.04), vec3(.5, .38, .06) * (.65 + .45 * fbm3(p * .1)), raie), bande * bev * .85);
    h = bev * .7 + riv * .7 + brosse * .03; sp = .3;
  }
#elif TH == 6
  { // marais : boue luisante, flaques d'eau noire, pierres moussues
    float eau = smoothstep(.52, .56, fbm(p * .0042 + 5.));
    vec3 boue = vec3(.125, .118, .068) * (.7 + .6 * fbm(p * .05));
    vec3 v = voro(p / 95.);
    float pierre = step(.82, v.z) * smoothstep(.0, .12, v.x) * (1. - smoothstep(.28, .34, v.y));
    vec3 pc = mix(vec3(.12, .13, .11), vec3(.09, .14, .06), smoothstep(.4, .7, fbm(p * .05)));
    vec3 wa = vec3(.025, .045, .045) + vec3(.08, .11, .13) * fbm3(p * vec2(.01, .04)) * .6;
    a = mix(mix(boue, wa, eau), pc, pierre * (1. - eau));
    h = (1. - eau) * (.45 + fbm3(p * .05) * .2) + pierre * .4; sp = mix(.12, .6, eau);
  }
#elif TH == 7
  { // cathédrale : damier de marbre veiné, eau qui affleure, lumière des vitraux
    vec4 t = dalles(p, vec2(64.), 0.);
    float cl = mod(floor(p.x / 64.) + floor(p.y / 64.), 2.);
    float w = fbm(p * .012 + t.y * 5.);
    float veine = 1. - smoothstep(0., .05, abs(sin((p.x * .6 + p.y * .8) * .02 + w * 9.)));
    vec3 base = mix(vec3(.055, .055, .075), vec3(.165, .168, .185), cl) * (.88 + .24 * fbm(p * .03));
    base = mix(base, cl > .5 ? vec3(.1, .1, .115) : vec3(.15, .15, .19), veine * .5);
    float eau = smoothstep(.55, .6, fbm(p * .005 + 8.)); base = mix(base, base * .55 + vec3(0., .015, .04), eau);
    a = mix(vec3(.03), base, smoothstep(0., 1.6, t.x));
    vec2 cel = floor(p / 230.); vec2 cen = (cel + .3 + hash2(cel + 4.) * .4) * 230.;
    vec2 dd = abs(p - cen); float fen = (1. - smoothstep(40., 60., max(dd.x, dd.y * 1.4))) * step(.45, hash1(cel + 2.));
    vec3 vc = voro(p / 14. + 3.); vec3 coul = .5 + .5 * cos(6.28 * (vc.z + vec3(0., .33, .67)));
    e = coul * fen * smoothstep(.02, .06, vc.x) * .09;
    h = smoothstep(0., 2., t.x) * .6; sp = mix(.35, .7, eau);
  }
#else
  { // ciel : dalles claires suspendues, ciel doré entre elles, incrustations d'or
    vec4 t = dalles(p, vec2(86.), 1.);
    float d = t.x + (fbm3(p * .07) - .5) * 4.;
    float tuile = smoothstep(3., 5., d);
    vec3 pierre = mix(vec3(.33, .32, .3), vec3(.43, .41, .37), t.y) * (.82 + .32 * fbm(p * .04 + t.y * 7.));
    vec2 l = t.zw - 43.;
    float or1 = step(fract(t.y * 5.3), .22) * (1. - smoothstep(.8, 1.6, abs(length(l) - 19.)));
    pierre = mix(pierre, vec3(.55, .41, .14), or1);
    vec3 ciel = mix(vec3(.3, .43, .6), vec3(.66, .54, .39), clamp((p.y - ar.y) / ar.w * 1.6, 0., 1.)) * .75 + vec3(.25) * smoothstep(.5, .8, fbm(p * .01));
    a = pierre * tuile; e = ciel * (1. - tuile);
    h = tuile * (.75 + fbm3(p * .05) * .12) + smoothstep(5., 9., d) * .1; sp = .08;
  }
#endif

}

`;
const MAT_FOND = `// ---------- autour de l'arène ----------
vec3 fond(vec2 p){
  vec3 c;
  
#if TH == 0
  { float dune = sin(p.x * .02 + fbm(p * .006) * 8.) * .5 + .5; c = vec3(.1, .083, .06) * (.6 + .5 * fbm(p * .01)) * (.85 + .15 * dune); }
#elif TH == 1
  { vec3 v = voro(p / 70. + vec2(fbm3(p * .01) * 1.5)); float lave = (1. - smoothstep(0., .05, v.x)) * smoothstep(.35, .6, fbm3(p * .006)); c = mix(vec3(.045, .03, .026) * (.7 + .6 * fbm(p * .04)), vec3(.85, .3, .05) * (.6 + .4 * noise(p * .03)), lave * .75) + vec3(.16, .04, .0) * pow(fbm(p * .008), 2.); }
#elif TH == 2
  { c = vec3(.34, .39, .45) * (.65 + .4 * fbm(p * .008)) - vec3(.08, .06, .02) * smoothstep(.5, .8, fbm(p * .02)); }
#elif TH == 3
  { c = mix(vec3(.01, .006, .025), vec3(.1, .04, .19), fbm(p * .004)) + vec3(.04, .07, .16) * pow(fbm(p * .006 + 7.), 3.) * 2. + step(.996, hash1(floor(p * .6))) * .7; }
#elif TH == 4
  { c = mix(vec3(.05, .07, .035), vec3(.11, .1, .05), fbm(p * .02)) * (.7 + .5 * noise(p * .3)); c = mix(c, vec3(.07, .11, .045), smoothstep(.5, .7, fbm(p * .008))); }
#elif TH == 5
  { vec4 t = dalles(p, vec2(120.), 0.); c = vec3(.05, .055, .065) * (.7 + .4 * t.y) * smoothstep(0., 4., t.x) + vec3(.6, .3, .05) * step(t.x, 1.5) * step(.8, fract(t.y * 3.1)) * .15; }
#elif TH == 6
  { c = vec3(.025, .045, .035) + vec3(.06, .09, .08) * fbm(p * vec2(.008, .03)) * .7; }
#elif TH == 7
  { c = vec3(.02, .028, .055) + vec3(.05, .07, .11) * fbm(p * vec2(.006, .025)) * .6; }
#else
  { c = mix(vec3(.43, .62, .84), vec3(.92, .76, .55), clamp(p.y / 800., 0., 1.)) * .8 + vec3(.3) * smoothstep(.45, .8, fbm(p * .006)); }
#endif
  // plus sombre en s'éloignant de l'arène
  vec2 q = max(ar.xy - p, p - ar.xy - ar.zw); float dist = length(max(q, 0.));
  if (cercle > .5) dist = max(0., length(p - ar.xy - ar.zw * .5) - ar.w * .5);
  return c * mix(1., TH == 8 ? .8 : .45, smoothstep(30., 260., dist));
}

`;


const MAT_MAIN_SOL = `
void main(){
  vec2 p = vec2(gl_FragCoord.x, res.y - gl_FragCoord.y) / k - dec;
  float h, sp; vec3 a, e; sol(p, h, a, e, sp);
  if (mode > .5) gl_FragColor = vec4(clamp(e * .5, 0., 1.), clamp(sp, 0., 1.));
  else gl_FragColor = vec4(clamp(a, 0., 1.), clamp(h * .8, 0., 1.));
}`;
const MAT_MAIN_FOND = `
void main(){ vec2 p = vec2(gl_FragCoord.x, res.y - gl_FragCoord.y) / k - dec; gl_FragColor = vec4(fond(p), 1.); }`;
// assemblage : relief éclairé à partir de la hauteur (canal alpha), lumière propre et brillance
const MAT_ASSEMBLE = `precision highp float;
uniform sampler2D tA, tB; uniform vec2 res; uniform float k, veines;
void main(){
  vec2 uv = gl_FragCoord.xy / res, px = 1. / res;
  vec4 A = texture2D(tA, uv), B = texture2D(tB, uv);
  if (veines > .5) { gl_FragColor = vec4(B.rgb * 2.8, 1.); return; }
  float h0 = A.a, hx = texture2D(tA, uv + vec2(px.x * k, 0.)).a, hy = texture2D(tA, uv - vec2(0., px.y * k)).a;
  vec3 n = normalize(vec3(-(hx - h0) * 8.75, -(hy - h0) * 8.75, 1.));
  vec3 L = normalize(vec3(-.55, -.65, .8));
  float dif = max(dot(n, L), 0.) / L.z;
  float spec = pow(max(dot(reflect(-L, n), vec3(0., 0., 1.)), 0.), 24.) * B.a;
  gl_FragColor = vec4(A.rgb * (.3 + .7 * dif) + spec * .35 + B.rgb * 2., 1.);
}`;

const Matieres = {
  ok: null, gl: null, cv: null, progs: {}, cibles: null,
  init() {
    if (this.ok !== null) return this.ok;
    this.ok = false;
    try {
      const c = document.createElement('canvas'); c.width = c.height = 4;
      const gl = c.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: true, depth: false });
      if (!gl) return false;
      if (!(gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT).precision > 0)) return false; // besoin de précision (sinon motifs cassés sur certains téléphones)
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      Object.assign(this, { gl, cv: c, ok: true });
      this.progs.assemble = this.compiler(MAT_ASSEMBLE, ['tA', 'tB', 'res', 'k', 'veines']);
    } catch (e) { console.warn('Matières indisponibles', e); this.ok = false; }
    return this.ok;
  },
  compiler(fs, noms) {
    const gl = this.gl;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }'));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(pr, 0, 'p'); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    const u = {}; for (const n of noms) u[n] = gl.getUniformLocation(pr, n);
    return { pr, u };
  },
  // un petit programme par décor (préparé seulement quand on en a besoin)
  prog(genre, th) {
    const cle = genre + th;
    if (!this.progs[cle]) this.progs[cle] = this.compiler('precision highp float;\n#define TH ' + THEME_ID[th] + '\n' + MAT_TETE + (genre === 'sol' ? MAT_SOL + MAT_MAIN_SOL : MAT_FOND + MAT_MAIN_FOND), ['res', 'k', 'seed', 'mode', 'cercle', 'ar', 'dec']);
    return this.progs[cle];
  },
  uniformes(P, w, h, k, seed, mode, dx, dy) {
    const gl = this.gl, u = P.u;
    gl.uniform2f(u.res, w, h); gl.uniform1f(u.k, k); gl.uniform1f(u.seed, seed % 997); gl.uniform1f(u.mode, mode);
    gl.uniform1f(u.cercle, Arene.kind === 'cercle' ? 1 : 0);
    if (Arene.kind === 'cercle') gl.uniform4f(u.ar, CX - AR.h / 2, CY - AR.h / 2, AR.h, AR.h); else gl.uniform4f(u.ar, AR.x, AR.y, AR.w, AR.h);
    gl.uniform2f(u.dec, dx || 0, dy || 0);
  },
  cible(w, h) {
    const gl = this.gl;
    if (this.cibles && this.cibles.w === w && this.cibles.h === h) return this.cibles;
    if (this.cibles) for (const t of this.cibles.l) { gl.deleteTexture(t.t); gl.deleteFramebuffer(t.f); }
    const mk = () => {
      const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); return { t, f };
    };
    const l = [mk(), mk()];
    return (this.cibles = { w, h, l, A: l[0], B: l[1] });
  },
  taille(w, h) { const c = this.cv; if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } this.gl.viewport(0, 0, w, h); },
  // sol : couleur + hauteur, puis lumière propre + brillance, puis assemblage éclairé ; veines : la lumière seule
  peindreSol(th, w, h, k, seed, veines) {
    const gl = this.gl, P = this.prog('sol', th), C = this.cible(w, h);
    this.taille(w, h); gl.useProgram(P.pr);
    if (!veines) for (const [cib, mode] of [[C.A, 0], [C.B, 1]]) { gl.bindFramebuffer(gl.FRAMEBUFFER, cib.f); this.uniformes(P, w, h, k, seed, mode); gl.drawArrays(gl.TRIANGLES, 0, 3); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const Q = this.progs.assemble; gl.useProgram(Q.pr);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, C.A.t); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, C.B.t);
    gl.uniform1i(Q.u.tA, 0); gl.uniform1i(Q.u.tB, 1); gl.uniform2f(Q.u.res, w, h); gl.uniform1f(Q.u.k, k); gl.uniform1f(Q.u.veines, veines ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.activeTexture(gl.TEXTURE0);
    return this.cv;
  },
  peindreFond(th, w, h, k, seed, dx, dy) {
    const gl = this.gl, P = this.prog('fond', th);
    this.taille(w, h); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.useProgram(P.pr);
    this.uniformes(P, w, h, k, seed, 0, dx, dy); gl.drawArrays(gl.TRIANGLES, 0, 3);
    return this.cv;
  },
  // finesse : autant de pixels que l'écran en affiche (au plus 1,5 fois le monde)
  echelle() { return Math.max(1, Math.min(1.5, (typeof dpr !== 'undefined' ? dpr : 1) * (scale || 1))); },
  utilisable(th) { return !G.opts.effetsReduits && THEME_ID[th] !== undefined && this.init(); }
};

// ---------- petits détails dessinés par-dessus (herbes, nénuphars, roseaux) ----------
function detailsSol(x, th, r) {
  if (th === 'ruines') {
    for (let i = 0; i < 150; i++) { const px = AR.x + r() * AR.w, py = AR.y + r() * AR.h; x.strokeStyle = hsl(80 + r() * 30, 28, 16 + r() * 12, .75); x.lineWidth = 1.3; for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(px + k * 2, py); x.quadraticCurveTo(px + k * 2 + r.range(-4, 4), py - 5, px + k * 2 + r.range(-5, 5), py - r.range(6, 11)); x.stroke(); } }
  } else if (th === 'marais') {
    for (let i = 0; i < 34; i++) { const lx = AR.x + r() * AR.w, ly = AR.y + r() * AR.h, lr = r.range(7, 13); x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(lx + 2, ly + 3, lr, lr * .8, 0, 0, TAU); x.fill(); x.fillStyle = hsl(105, 38, 20 + r() * 8); x.beginPath(); x.moveTo(lx, ly); x.arc(lx, ly, lr, r() * TAU, r() * TAU + 5.6); x.closePath(); x.fill(); x.strokeStyle = 'rgba(180,220,140,.18)'; x.lineWidth = 1; x.stroke(); }
    for (let i = 0; i < 120; i++) { const px = AR.x + r() * AR.w, py = AR.y + r() * AR.h; x.strokeStyle = hsl(70 + r() * 30, 28, 15 + r() * 12, .8); x.lineWidth = 1.4; for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + r.range(-5, 5), py - 7, px + r.range(-9, 9), py - r.range(9, 18)); x.stroke(); } }
  }
}
function detailsFond(x, th, r) {
  const dehors = () => { for (let n = 0; n < 40; n++) { const px = -MARGE_FOND.x + r() * (W + 2 * MARGE_FOND.x), py = -MARGE_FOND.y + r() * (H + 2 * MARGE_FOND.y); const loin = Arene.kind === 'cercle' ? Math.hypot(px - CX, py - CY) > AR.h / 2 + 90 : (px < AR.x - 80 || px > AR.x + AR.w + 80 || py < AR.y - 80 || py > AR.y + AR.h + 80); if (loin) return [px, py]; } return null; };
  if (th === 'temple' || th === 'ruines' || th === 'cathedrale') {
    // tronçons de colonnes renversées
    for (let i = 0; i < 9; i++) {
      const q = dehors(); if (!q) continue; const [px, py] = q, rr = r.range(22, 36);
      x.fillStyle = 'rgba(0,0,0,.45)'; x.beginPath(); x.ellipse(px + 10, py + 12, rr * 1.1, rr * .95, 0, 0, TAU); x.fill();
      const g = x.createRadialGradient(px - rr * .4, py - rr * .5, 2, px, py, rr * 1.1); const b = th === 'cathedrale' ? 225 : th === 'ruines' ? 80 : 38;
      g.addColorStop(0, hsl(b, 10, 34)); g.addColorStop(.6, hsl(b, 12, 18)); g.addColorStop(1, hsl(b, 14, 7));
      x.fillStyle = g; x.beginPath(); x.arc(px, py, rr, 0, TAU); x.fill();
      x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2; for (let k = 0; k < 10; k++) { const a = k * TAU / 10; x.beginPath(); x.moveTo(px + Math.cos(a) * rr * .5, py + Math.sin(a) * rr * .5); x.lineTo(px + Math.cos(a) * rr * .9, py + Math.sin(a) * rr * .9); x.stroke(); }
      if (th === 'ruines') { x.fillStyle = 'rgba(70,110,40,.35)'; x.beginPath(); x.ellipse(px - rr * .2, py - rr * .3, rr * .6, rr * .35, r(), 0, TAU); x.fill(); }
    }
  }
  if (th === 'marais' || th === 'ruines') {
    for (let i = 0; i < 140; i++) { const q = dehors(); if (!q) continue; const [px, py] = q; x.strokeStyle = hsl(75 + r() * 30, 30, 12 + r() * 12, .85); x.lineWidth = 2; for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + r.range(-8, 8), py - 12, px + r.range(-12, 12), py - r.range(16, 30)); x.stroke(); } }
  }
}

// ---------- branchement ----------
const _solAvantMat = texteSol;
let _matSol = null, _matSolCle = '', _matVeines = null;
texteSol = function () {
  const th = Decor.themeActif();
  if (!Matieres.utilisable(th)) return _solAvantMat();
  const hue = G.def ? G.def.hue : 260, k = Matieres.echelle(), cle = th + '|' + Arene.version + '|' + hue + '|' + k + '|' + Arene.kind;
  if (_matSol && cle === _matSolCle) return _matSol;
  try {
    const seed = hashNum(Arene.version * 13 + hue + th.length * 977), w = Math.round(W * k), h = Math.round(H * k);
    const c = _matSol || document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.drawImage(Matieres.peindreSol(th, w, h, k, seed), 0, 0);
    x.setTransform(k, 0, 0, k, 0, 0); detailsSol(x, th, RNG(seed + 1));
    // ombre des murs sur le sol
    if (Arene.kind !== 'cercle') for (const [x0, y0, x1, y1, rx, ry, rw, rh] of [[0, AR.y, 0, AR.y + 55, AR.x, AR.y, AR.w, 55], [0, AR.y + AR.h, 0, AR.y + AR.h - 30, AR.x, AR.y + AR.h - 30, AR.w, 30], [AR.x, 0, AR.x + 40, 0, AR.x, AR.y, 40, AR.h], [AR.x + AR.w, 0, AR.x + AR.w - 40, 0, AR.x + AR.w - 40, AR.y, 40, AR.h]]) {
      const g = x.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, 'rgba(0,0,0,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(rx, ry, rw, rh);
    } else { const g = x.createRadialGradient(CX, CY, AR.h / 2 - 50, CX, CY, AR.h / 2); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.5)'); x.fillStyle = g; x.fillRect(0, 0, W, H); }
    x.setTransform(1, 0, 0, 1, 0, 0);
    c.monde = { x: 0, y: 0, w: W, h: H };
    if (th === 'volcan') {
      const vc = _matVeines || document.createElement('canvas'); vc.width = W; vc.height = H;
      vc.getContext('2d').drawImage(Matieres.peindreSol(th, w, h, k, seed, true), 0, 0, W, H); _matVeines = vc; calqueVeines = vc;
    } else calqueVeines = null;
    _matSol = c; _matSolCle = cle;
    return c;
  } catch (e) { console.warn('Sol : ancien dessin', e); Matieres.ok = false; return _solAvantMat(); }
};

const _fondAvantMat = texteFond;
let _matFond = null, _matFondCle = '';
texteFond = function () {
  const ancien = _fondAvantMat(), th = Decor.themeActif();
  if (!Matieres.utilisable(th)) return ancien;
  const k = Math.min(1.2, Matieres.echelle()), cle = th + '|' + Arene.kind + '|' + k + '|' + texFondCle;
  if (_matFond && cle === _matFondCle) return _matFond;
  try {
    const MW = W + 2 * MARGE_FOND.x, MH = H + 2 * MARGE_FOND.y, w = Math.round(MW * k), h = Math.round(MH * k);
    const c = _matFond || document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.drawImage(Matieres.peindreFond(th, w, h, k, hashStr(th + Arene.kind), MARGE_FOND.x, MARGE_FOND.y), 0, 0);
    x.setTransform(k, 0, 0, k, MARGE_FOND.x * k, MARGE_FOND.y * k);
    detailsFond(x, th, RNG(hashStr(th + 'details')));
    // le mur d'enceinte de l'ancien dessin (blocs de pierre en relief), seulement sa bande
    x.save(); x.beginPath();
    if (Arene.kind === 'cercle') { x.arc(CX, CY, AR.h / 2 + 38, 0, TAU); x.arc(CX, CY, AR.h / 2 - 4, 0, TAU); }
    else { x.rect(AR.x - 30, AR.y - 30, AR.w + 60, AR.h + 70); x.rect(AR.x + 4, AR.y + 4, AR.w - 8, AR.h - 8); }
    x.clip('evenodd'); x.drawImage(ancien, 0, 0, W, H); x.restore();
    x.setTransform(1, 0, 0, 1, 0, 0);
    c.monde = { x: -MARGE_FOND.x, y: -MARGE_FOND.y, w: MW, h: MH };
    _matFond = c; _matFondCle = cle;
    return c;
  } catch (e) { console.warn('Fond : ancien dessin', e); Matieres.ok = false; return ancien; }
};

// ---------- préparation à l'avance : sur l'accueil, un décor de plus toutes les 1,5 s (aucun à-coup en combat) ----------
setInterval(() => {
  try {
    if (typeof G === 'undefined' || G.etat !== 'menu' || document.hidden || G.opts.effetsReduits || !Matieres.init()) return;
    for (const th of Object.keys(THEME_ID)) for (const genre of ['sol', 'fond']) if (!Matieres.progs[genre + th]) { Matieres.prog(genre, th); return; }
  } catch (e) { }
}, 1500);
