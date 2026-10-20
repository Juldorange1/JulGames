/* Stratajium — langues. Les textes sont écrits en français dans le code : L('texte', {variables}).
   Pour une autre langue, on cherche la traduction dans le dictionnaire de cette langue (clé = le texte français).
   Les noms et descriptions des persos, événements, objectifs, cartes… sont traduits par leur identifiant. */
const I18N = (function () {
  'use strict';
  const LANGS = [['fr', 'Français'], ['en', 'English']];
  const DICT = { fr: null, en: { ui: {}, T: {}, EV: {}, GOAL: {}, MAP: {}, ZONE: {}, PERSO: {}, SPEC: {}, THEME: {}, LEVEL: [] } };
  function get(k, d) { try { const v = localStorage.getItem('stratajium.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  let lang = get('langue', null) || ((navigator.language || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en');
  if (!DICT.hasOwnProperty(lang)) lang = 'fr';
  const D = () => DICT[lang];
  function L(s, vars) {
    const d = D();
    let t = d && d.ui[s] !== undefined ? d.ui[s] : s;
    if (vars) t = t.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
    return t;
  }
  const pickT = (map, id, i, fr) => { const d = D(); return d && d[map][id] && d[map][id][i] !== undefined ? d[map][id][i] : fr; };
  const MAP_LEVELS = ['Plateau classique 8×8', 'La taille de la carte change', 'Formes simples (coins, croix, losange, arène…)', 'Trous, lacs, rivières, colonnes, zones de placement variées', 'Tout est possible : îles, couloirs, escaliers, formes mélangées'];
  let ENG = null;
  const eng = () => ENG || (ENG = StratEngine());
  return {
    LANGS, DICT, L,
    get lang() { return lang; },
    setLang(l) { if (DICT.hasOwnProperty(l)) { lang = l; try { localStorage.setItem('stratajium.langue', JSON.stringify(l)); } catch (e) { } } },
    name: t => pickT('T', t.id, 0, t.name),
    desc: t => pickT('T', t.id, 1, t.desc),
    evName: id => pickT('EV', id, 0, eng().EVENTS.find(e => e.id === id).name),
    evDesc: id => pickT('EV', id, 1, eng().EVENTS.find(e => e.id === id).desc),
    goalName: id => pickT('GOAL', id, 0, eng().GOALS.find(e => e.id === id).name),
    goalDesc: id => pickT('GOAL', id, 1, eng().GOALS.find(e => e.id === id).desc),
    persoName: id => pickT('PERSO', id, 0, eng().PERSOS[id].name),
    persoDesc: id => pickT('PERSO', id, 1, eng().PERSOS[id].desc),
    specName: k => pickT('SPEC', k, 0, eng().SPECIALS[k].name),
    specDesc: k => pickT('SPEC', k, 1, eng().SPECIALS[k].desc),
    mapKind: id => pickT('MAP', id, 0, eng().MAPS.find(m => m[0] === id)[1]),
    mapKindDesc: id => pickT('MAP', id, 1, eng().MAPS.find(m => m[0] === id)[3]),
    zoneName: zk => pickT('ZONE', zk, 0, eng().ZONES[zk]),
    mapLevel: n => { const d = D(); return d && d.LEVEL[n] ? d.LEVEL[n] : MAP_LEVELS[n]; },
    // nom d'une carte : formes + taille + zones
    mapName(g) {
      if (!g.info) return g.name;
      if (g.info.kinds[0] === 'classique') return this.mapKind('classique') + ' 8×8';
      return `${g.info.kinds.map(k => this.mapKind(k)).join(' + ')} ${g.W}×${g.H}, ${L('zones')} ${this.zoneName(g.info.zk)}`;
    },
    themeName: t => pickT('THEME', t, 0, (window.Decor && Decor.THEMES[t] ? Decor.THEMES[t].name : t)),
    themeShort(t) { return this.themeName(t).replace(/^Forêt d’/, '').replace(/^Forêt d'/, ''); },
    why: s => L(s),
  };
})();
