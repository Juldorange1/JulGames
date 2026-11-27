/* La seule partie du jeu : les échecs classiques. Apparence fixe : plateau « Nocturne » (couleurs dans
   css/jeu.css), pièces « Classique », fond « Nuit sobre », curseur « Flèche noire ». */
(function () {
  'use strict';

  const STD = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  function variante() {
    const pieces = {};
    for (const l in window.Pieces.TYPES) pieces[l] = Object.assign({ marque: '' }, window.Pieces.TYPES[l]);
    return { uci: 'chess', ini: '', moteur: 'sf', fen0: STD, nom: 'Partie normale', pieces, but: '', regles: 'Les règles classiques des échecs : plateau de 8 × 8, on gagne par mat.' };
  }
  // une partie enregistrée est-elle bien une partie d'échecs classiques ? (les anciennes variantes sont ignorées)
  function estClassique(v) { return !!v && v.uci === 'chess' && v.moteur === 'sf' && !v.is960; }

  // curseur « Flèche noire »
  const FLECHE = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M3 2 L3 25 L9 19.5 L13 29 L17.5 27 L13.5 17.8 L21 17.8 Z" fill="#111111" stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  const st = document.createElement('style');
  st.textContent = 'html, html * { cursor: url("data:image/svg+xml,' + encodeURIComponent(FLECHE) + '") 3 2, auto !important; }';
  document.head.appendChild(st);

  // ---------- jeu servi par le programme Windows (http://localhost:57613/) ----------
  // Le site et le programme Windows n'ont pas la même mémoire : le lien « jouer avec le moteur Windows »
  // emporte les bots, les pendules, les parties et les dossiers dans l'adresse (#import=…), fusionnés ici.
  const CLES = ['echecs.bots', 'echecs.options', 'echecs.parties', 'echecs.repertoire', 'echecs.encours'];
  const sansAnalyse = (r) => { const c = Object.assign({}, r); delete c.analyse; return c; };
  function exporter() {
    const out = {};
    for (const k of CLES) {
      let v; try { v = JSON.parse(localStorage.getItem(k)); } catch (e) { v = null; }
      if (v == null) continue;
      if (k === 'echecs.parties' && Array.isArray(v)) v = v.map(sansAnalyse);
      if (k === 'echecs.repertoire' && v && Array.isArray(v.parties)) v = Object.assign({}, v, { parties: v.parties.map(sansAnalyse) });
      out[k] = v;
    }
    return out;
  }
  function fusionParId(a, b) { const ids = new Set((a || []).map((x) => x && x.id)); return (a || []).concat((b || []).filter((x) => x && !ids.has(x.id))); }
  function importer(d) {
    for (const k of CLES) {
      if (d[k] == null) continue;
      let ici; try { ici = JSON.parse(localStorage.getItem(k)); } catch (e) { ici = null; }
      let v = d[k];
      if (ici != null) {
        if (Array.isArray(ici) && Array.isArray(v)) v = fusionParId(ici, v);
        else if (k === 'echecs.repertoire') v = { dossiers: fusionParId(ici.dossiers, v.dossiers), parties: fusionParId(ici.parties, v.parties) };
        else continue; // options et partie en cours : celles d'ici restent
      }
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* plein */ }
    }
  }
  const surPC = location.hostname === 'localhost' && location.port === '57613';
  if (surPC && location.hash.startsWith('#import=')) {
    try { importer(JSON.parse(decodeURIComponent(location.hash.slice(8)))); } catch (e) { console.warn('Import impossible', e); }
    history.replaceState(null, '', location.pathname + location.search);
  }
  function lienPC() { return 'http://localhost:57613/#import=' + encodeURIComponent(JSON.stringify(exporter())); }

  window.Config = { STD, variante, estClassique, surPC, lienPC };
})();
