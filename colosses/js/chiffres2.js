'use strict';
/* Colosses — chiffres de dégâts lisibles : les coups rapprochés sur la même cible s'additionnent dans un seul chiffre
   qui grossit un peu (au lieu d'une pile de petits chiffres qui se chevauchent). Un coup critique le passe en jaune. */
const _chiffreSeul = G.chiffre;
G.chiffre = function (tg, d, crit, o, m) {
  if (!this.opts.chiffres || !tg) return;
  if (o && o.continu) return _chiffreSeul.apply(this, arguments); // les armes continues ont déjà leur propre cumul
  const cur = tg._cumul;
  if (cur && cur.t < .45 && this.textes.includes(cur)) {
    cur.val += d; cur.n++; cur.crit = cur.crit || crit;
    cur.txt = Math.round(cur.val) + (cur.crit ? '!' : '');
    cur.size = Math.min(26, cur.base + Math.log2(1 + cur.n) * 2.2);
    if (crit) cur.col = '#ffe14d';
    cur.t = Math.min(cur.t, .1);
    return;
  }
  const avant = this.textes.length;
  _chiffreSeul.apply(this, arguments);
  if (this.textes.length > avant) { const t = this.textes[this.textes.length - 1]; t.val = d; t.n = 1; t.crit = crit; t.base = t.size; tg._cumul = t; }
};
