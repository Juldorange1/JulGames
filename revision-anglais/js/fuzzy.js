// Comparaison de mots tolérante aux fautes de frappe (distance de Levenshtein), utilisée par
// l'analyseur pour reconnaître un mot même mal orthographié (ex: "beComme" -> "become").
//
// Volontairement PRUDENT : une tolérance aveugle sur tout le texte créerait de faux positifs
// dangereux entre mots anglais courants qui se ressemblent (ex: "want"/"went", "close"/"chose",
// "smoke"/"spoke" sont tous à 1 lettre d'écart). On n'autorise donc la tolérance qu'à partir de
// 6 lettres, où ce genre de collision entre deux mots anglais différents devient rare.
(function (global) {
  'use strict';

  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp = new Array(n + 1);
    for (let j = 0; j <= n; j++) dp[j] = j;
    for (let i = 1; i <= m; i++) {
      let prev = dp[0];
      dp[0] = i;
      for (let j = 1; j <= n; j++) {
        const tmp = dp[j];
        dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
        prev = tmp;
      }
    }
    return dp[n];
  }

  // Nombre de fautes toléré selon la longueur du mot et le seuil minimal `minLen` (par défaut 6,
  // le réglage "prudent" utilisé pour le scan aveugle de tout un texte). Un appelant qui a déjà
  // une preuve contextuelle forte (ex: le mot est présenté avec une traduction, ou vient d'un
  // dictionnaire restreint et contrôlé) peut passer un `minLen` plus bas, ex: 4 pour couvrir des
  // mots comme "hello".
  function maxAllowedDistance(len, minLen) {
    minLen = minLen || 6;
    if (len < minLen) return 0;
    if (len <= 8) return 1;
    return 2;
  }

  function isCloseMatch(a, b, minLen) {
    a = (a || '').toLowerCase();
    b = (b || '').toLowerCase();
    if (a === b) return true;
    if (Math.abs(a.length - b.length) > 2) return false;
    // Le PLUS COURT des deux mots doit atteindre le seuil : sinon un mot long banal pourrait
    // "corriger" un petit mot connu sans rapport (ex: "near" ne doit jamais devenir "ear").
    const allowed = maxAllowedDistance(Math.min(a.length, b.length), minLen);
    if (allowed === 0) return false;
    return levenshtein(a, b) <= allowed;
  }

  // Cherche dans `candidates` (tableau de strings) le plus proche de `word`. Retourne le
  // candidat (dans sa casse d'origine) si la distance est tolérable ET sans ambiguïté (si deux
  // candidats différents sont à égale distance, on ne devine pas — mieux vaut ne rien corriger
  // que corriger au hasard), sinon null.
  function findClosestMatch(word, candidates, minLen) {
    const w = (word || '').toLowerCase();
    if (!w) return null;
    let best = null, bestDist = Infinity, ambiguous = false;
    for (const c of candidates) {
      const cl = c.toLowerCase();
      if (cl === w) return c;
      if (Math.abs(cl.length - w.length) > 2) continue;
      const d = levenshtein(w, cl);
      if (d < bestDist) { bestDist = d; best = c; ambiguous = false; }
      else if (d === bestDist && cl !== (best || '').toLowerCase()) { ambiguous = true; }
    }
    if (best === null || ambiguous) return null;
    return isCloseMatch(w, best, minLen) ? best : null;
  }

  global.Fuzzy = { levenshtein, isCloseMatch, findClosestMatch, maxAllowedDistance };
})(window);
