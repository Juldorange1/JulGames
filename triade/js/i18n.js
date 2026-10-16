'use strict';
/* =========================================================
   TRIADE — langues
   Le jeu est écrit en français. Pour une autre langue, chaque texte affiché
   (écrans, fenêtres, infobulles, textes du plateau) passe par tr() :
   1) traduction exacte du texte ;
   2) sinon, modèle avec nombres : « Salle 12 » → clé « Salle {#} » → « Room {#} ».
   Les dictionnaires sont dans js/lang/<code>.js (I18N.packs.<code> = { ... }).
   ========================================================= */
const I18N = (() => {
  const LANGS = { fr: 'Français', en: 'English' };
  const packs = {};
  let lang = 'fr';
  try { lang = localStorage.getItem('binome_lang') || ''; } catch (e) { }
  if (!LANGS[lang]) { const n = (navigator.language || 'fr').slice(0, 2).toLowerCase(); lang = LANGS[n] ? n : (n === 'fr' ? 'fr' : 'en'); }
  const harvest = /[?&]harvest\b/.test(location.search);   // outil : liste les textes non traduits
  const missing = new Map();
  let dict = null, pats = null;
  const NUM = /[+−-]?\d+(?:[.,]\d+)?/g;
  const norm = s => s.replace(/[\s\u00a0\u202f]+/g, ' ').replace(/[’‘]/g, "'").trim();
  /* typographie anglaise : pas d'espace avant « : ! ? % » */
  const typo = s => lang === 'fr' ? s : s.replace(/(\S)[ \u00a0\u202f]+([:!?;])/g, '$1$2').replace(/(\d)[ \u00a0\u202f]+%/g, '$1%');
  function build() {
    if (dict) return;
    const p = packs[lang] || {};
    dict = new Map(); pats = new Map();
    for (const k0 in p) { const k = norm(k0); if (k.includes('{#}')) pats.set(k, p[k0]); else dict.set(k, p[k0]); }
  }
  function note(s) { if (harvest && /[a-zà-ÿ]{2}/i.test(s) && !missing.has(s)) missing.set(s, 1); }
  /* traduit une chaîne (garde les espaces autour) */
  function tr(s) {
    if (lang === 'fr' || s == null) return s;
    s = String(s);
    const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/); const core = norm(m[2]);
    if (!core || !/[A-Za-zÀ-ÿ]/.test(core)) return s;
    build();
    let out = dict.get(core);
    if (out == null) {
      const nums = core.match(NUM) || [];
      if (nums.length) { const key = core.replace(NUM, '{#}'); const tpl = pats.get(key); if (tpl != null) { let i = 0; out = tpl.replace(/\{#\}/g, () => nums[i++] != null ? nums[i - 1] : ''); } }
    }
    if (out == null) { note(core.replace(NUM, '{#}')); return typo(s); }
    return m[1] + out + m[3];
  }
  const ATTRS = ['title', 'data-tip', 'placeholder', 'aria-label'];
  const done = new WeakSet(), mine = new WeakSet();   // mine : textes que l'on vient d'écrire soi-même
  function node(n) {
    if (n.nodeType === 3) { if (done.has(n)) return; const v = n.nodeValue, t = tr(v); if (t !== v) { mine.add(n); n.nodeValue = t; } done.add(n); return; }
    if (n.nodeType !== 1) return;
    const tag = n.tagName; if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA') return;
    for (const a of ATTRS) if (n.hasAttribute(a)) { const v = n.getAttribute(a), t = tr(v); if (t !== v) n.setAttribute(a, t); }
    for (let c = n.firstChild; c; c = c.nextSibling) node(c);
  }
  function start() {
    document.documentElement.lang = lang;
    if (lang === 'fr') return;
    node(document.body); document.title = tr(document.title);
    new MutationObserver(list => {
      for (const r of list) {
        if (r.type === 'characterData') { if (mine.has(r.target)) { mine.delete(r.target); continue; } done.delete(r.target); node(r.target); }
        else if (r.type === 'attributes') { const v = r.target.getAttribute(r.attributeName); if (v != null) { const t = tr(v); if (t !== v) r.target.setAttribute(r.attributeName, t); } }
        else for (const n of r.addedNodes) node(n);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  return {
    LANGS, packs, tr, start,
    get lang() { return lang; },
    set(l) { if (!LANGS[l]) return; try { localStorage.setItem('binome_lang', l); } catch (e) { } location.reload(); },
    missing() { return [...missing.keys()]; },
  };
})();
const tr = I18N.tr;
