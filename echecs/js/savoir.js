/* Ce que le jeu « sait » en plus du calcul de Stockfish :
   - le livre d'ouvertures (hors ligne) : 3 865 ouvertures de Lichess (moteurs/ouvertures/livre.json, CC0) ;
   - les parties de maîtres (en ligne, explorer.lichess.ovh) : ce que jouent les meilleurs joueurs du monde ;
   - les analyses très profondes de Lichess (en ligne, cloud-eval) : positions déjà calculées à profondeur 30 à 60 ;
   - les tables de finales (en ligne, tablebase.lichess.ovh) : résultat parfait à 7 pièces ou moins.
   Sans internet, tout continue avec le livre et Stockfish. */
(function () {
  'use strict';

  let livre = null, promesse = null;
  function charger() {
    if (!promesse) promesse = fetch('moteurs/ouvertures/livre.json').then((r) => r.json()).then((j) => { livre = j; }).catch(() => { livre = {}; });
    return promesse;
  }
  const cle = (fen) => fen.trim().split(/\s+/).slice(0, 4).join(' ');
  // nom de l'ouverture si la position est dans le livre
  function ouverture(fen) { const x = livre && livre[cle(fen)]; return x && x[1] ? { eco: x[0], nom: x[1] } : null; }
  // coups de la théorie depuis cette position (livre hors ligne)
  function coupsLivre(fen) { const x = livre && livre[cle(fen)]; return x ? x[2].slice() : []; }

  // ---------- services en ligne (jamais plus de 3 s ; pause d'une minute si Lichess demande d'attendre) ----------
  let pauseJusqua = 0;
  async function lire(url) {
    if (Date.now() < pauseJusqua || !navigator.onLine) return null;
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const minut = setTimeout(() => ctrl && ctrl.abort(), 3000);
    try {
      const r = await fetch(url, ctrl ? { signal: ctrl.signal } : {});
      if (r.status === 429) { pauseJusqua = Date.now() + 61000; return null; }
      if (r.status === 404) return { absent: true };
      if (!r.ok) return null;
      return await r.json();
    } catch (e) { return null; } finally { clearTimeout(minut); }
  }

  // Les coups UCI de Lichess écrivent le roque « roi prend sa tour » (e1h1) : on les remet en e1g1.
  function remettreRoques(fen, coups) {
    const out = [];
    let p = null;
    try {
      p = new window.Regles.Partie(window.Config.variante(), fen, []);
      for (const u of coups) {
        let x = u;
        if (!p.legaux().includes(x)) {
          const m = { e1h1: 'e1g1', e1a1: 'e1c1', e8h8: 'e8g8', e8a8: 'e8c8' }[u];
          if (!m || !p.legaux().includes(m)) break;
          x = m;
        }
        p.jouer(x); out.push(x);
      }
    } catch (e) { /* rien */ }
    if (p) p.detruire();
    return out;
  }

  // Parties de maîtres : { total, coups: [{ uci, n, score }] } ; score = points moyens pour le camp au trait (0 à 1).
  const cacheM = {};
  async function maitres(fen) {
    const k = cle(fen);
    if (k in cacheM) return cacheM[k];
    const d = await lire('https://explorer.lichess.ovh/masters?fen=' + encodeURIComponent(fen) + '&moves=12&topGames=0');
    if (!d || !d.moves) return null;
    const blanc = fen.split(/\s+/)[1] !== 'b';
    const total = (d.white || 0) + (d.draws || 0) + (d.black || 0);
    const coups = d.moves.map((m) => {
      const n = m.white + m.draws + m.black;
      const g = blanc ? m.white : m.black;
      return { uci: remettreRoques(fen, [m.uci])[0] || m.uci, n, score: n ? (g + m.draws / 2) / n : 0.5, san: m.san };
    }).filter((m) => m.n > 0);
    cacheM[k] = { total, coups };
    return cacheM[k];
  }

  // Analyse profonde de Lichess : { profondeur, lignes: [{ score (vu du camp au trait), pv, profondeur }] } ou null.
  const cacheN = {};
  async function nuage(fen, multipv) {
    const k = cle(fen) + '|' + multipv;
    if (k in cacheN) return cacheN[k];
    const d = await lire('https://lichess.org/api/cloud-eval?fen=' + encodeURIComponent(fen) + '&multiPv=' + multipv);
    if (d && d.absent) { cacheN[k] = null; return null; }
    if (!d || !d.pvs || !d.pvs.length) return null;
    const blanc = fen.split(/\s+/)[1] !== 'b';
    const lignes = d.pvs.map((x) => {
      const s = x.mate != null ? { mate: blanc ? x.mate : -x.mate } : { cp: blanc ? x.cp : -x.cp };
      return { score: s, pv: remettreRoques(fen, x.moves.split(' ').slice(0, 12)), profondeur: d.depth, multipv: 1 };
    }).filter((l) => l.pv.length);
    lignes.forEach((l, i) => { l.multipv = i + 1; });
    cacheN[k] = lignes.length ? { profondeur: d.depth, lignes } : null;
    return cacheN[k];
  }

  // Tables de finales (7 pièces ou moins) : le meilleur coup exact, ou null.
  async function finale(fen) {
    const plac = fen.split(' ')[0];
    if ((plac.match(/[a-z]/gi) || []).length > 7 || (fen.split(' ')[2] || '-') !== '-') return null;
    const d = await lire('https://tablebase.lichess.ovh/standard?fen=' + encodeURIComponent(fen));
    if (!d || !d.moves || !d.moves.length || !d.category || d.category === 'unknown') return null;
    return { categorie: d.category, coup: remettreRoques(fen, [d.moves[0].uci])[0] || null };
  }

  window.Savoir = { charger, ouverture, coupsLivre, maitres, nuage, finale };
})();
