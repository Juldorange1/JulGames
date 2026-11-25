/* Moteur « maison » de Custom Chess : règles + recherche, pour les parties avec des personnages créés
   que Fairy-Stockfish ne sait pas jouer exactement (téléportation n'importe où, chemins qui contournent).
   Fonctionne dans la page (règles) et dans un Worker (bot, barre d'avantage, pronostic).

   Définition d'une partie (def) :
   { cols, lignes, promos: ['q','r',...], multi: bool, types: { lettre: { perso: {cases, tele, lignes, saute} | null, royal } } }
   Les lettres p n b r q k sans perso sont les pièces classiques. */
(function (racine) {
  'use strict';

  const FICH = 'abcdefghijkl';
  const VIDE = 0, TROU = 1;
  const MAT = 1000000;
  const DIRS8 = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];
  const DIRS_LIGNE = { N: [0, 1], NE: [1, 1], E: [1, 0], SE: [1, -1], S: [0, -1], SO: [-1, -1], O: [-1, 0], NO: [-1, 1] };

  // ---------- types de pièces ----------
  // Chaque type : { lettre, pion, royal, sauts:[[dx,dy]], glisses:[[dx,dy]], chemin: {noeuds, voisins, cibles} | null }
  function cles(o) { return Object.keys(o || {}).filter((k) => o[k]).map((k) => k.split(',').map(Number)); }
  function typeDepuisPerso(lettre, p, royal) {
    const t = { lettre, pion: false, royal: !!royal, sauts: [], glisses: [], chemin: null };
    for (const k in p.lignes || {}) if (p.lignes[k] && DIRS_LIGNE[k]) t.glisses.push(DIRS_LIGNE[k]);
    const cases = cles(p.cases), tele = cles(p.tele);
    const vus = new Set();
    const ajSaut = (d) => { const k = d[0] + ',' + d[1]; if (!vus.has(k) && (d[0] || d[1])) { vus.add(k); t.sauts.push(d); } };
    tele.forEach(ajSaut);
    if (p.saute) cases.forEach(ajSaut);
    else if (cases.length) {
      // chemin : il peut passer par n'importe quelles cases de son déplacement (cases vides) pour arriver à destination
      const cle = (x, y) => x + ',' + y;
      const dansM = new Set(cases.map((d) => cle(d[0], d[1])));
      const noeuds = new Map();
      noeuds.set('0,0', [0, 0]);
      cases.forEach((d) => noeuds.set(cle(d[0], d[1]), d));
      // cases que l'on ne peut atteindre par ses propres cases (ex. le « L ») : le plus court chemin pas à pas
      const atteint = new Set(['0,0']), file = [[0, 0]];
      while (file.length) {
        const [x, y] = file.shift();
        for (const [a, b] of DIRS8) { const k = cle(x + a, y + b); if (dansM.has(k) && !atteint.has(k)) { atteint.add(k); file.push([x + a, y + b]); } }
      }
      for (const [dx, dy] of cases) {
        if (atteint.has(cle(dx, dy))) continue;
        const x0 = Math.min(0, dx), x1 = Math.max(0, dx), y0 = Math.min(0, dy), y1 = Math.max(0, dy);
        for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
          // seulement les cases sur un plus court chemin de roi
          const d1 = Math.max(Math.abs(x), Math.abs(y)), d2 = Math.max(Math.abs(dx - x), Math.abs(dy - y));
          if (d1 + d2 === Math.max(Math.abs(dx), Math.abs(dy)) && !noeuds.has(cle(x, y))) noeuds.set(cle(x, y), [x, y]);
        }
      }
      const liste = [...noeuds.values()];
      const index = new Map(liste.map((d, i) => [cle(d[0], d[1]), i]));
      const voisins = liste.map(([x, y]) => DIRS8.map(([a, b]) => index.get(cle(x + a, y + b))).filter((i) => i != null));
      const cibles = liste.map((d) => dansM.has(cle(d[0], d[1])));
      t.chemin = { noeuds: liste, voisins, cibles, origine: index.get('0,0') };
    }
    return t;
  }
  const CAV = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
  function typeClassique(l) {
    const t = { lettre: l, pion: l === 'p', royal: l === 'k', sauts: [], glisses: [], chemin: null };
    if (l === 'n') t.sauts = CAV;
    if (l === 'k') t.sauts = DIRS8;
    if (l === 'b' || l === 'q') t.glisses.push([1, 1], [1, -1], [-1, -1], [-1, 1]);
    if (l === 'r' || l === 'q') t.glisses.push([0, 1], [1, 0], [0, -1], [-1, 0]);
    return t;
  }

  // ---------- jeu ----------
  class Jeu {
    constructor(def, fen) {
      this.def = def;
      this.C = def.cols; this.L = def.lignes; this.N = this.C * this.L;
      this.multi = !!def.multi;
      this.types = [];
      this.parLettre = {};
      for (const l in def.types) {
        const d = def.types[l];
        const t = d && d.perso ? typeDepuisPerso(l, d.perso, d.royal || l === 'k') : typeClassique(l);
        if (l === 'k') t.royal = true;
        t.id = this.types.length;
        this.parLettre[l] = t.id;
        this.types.push(t);
      }
      for (const l of 'pnbrqk') if (this.parLettre[l] == null) { const t = typeClassique(l); t.id = this.types.length; this.parLettre[l] = t.id; this.types.push(t); }
      this.promos = (def.promos || ['q', 'r', 'b', 'n']).filter((l) => this.parLettre[l] != null);
      this._valeurs();
      this._zobrist();
      this.lireFen(fen);
    }
    code(t, coul) { return 2 + t * 2 + coul; }
    typeDe(v) { return (v - 2) >> 1; }
    coulDe(v) { return (v - 2) & 1; }

    _zobrist() {
      let s = 0x9e3779b9;
      const r = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return s >>> 0; };
      const n = (this.types.length * 2 + 2) * this.N;
      this.z1 = new Uint32Array(n); this.z2 = new Uint32Array(n);
      for (let i = 0; i < n; i++) { this.z1[i] = r(); this.z2[i] = r(); }
      this.zTrait = [r(), r()];
      this.zRoque = new Uint32Array(32); this.zRoque2 = new Uint32Array(32);
      for (let i = 0; i < 32; i++) { this.zRoque[i] = r(); this.zRoque2[i] = r(); }
      this.zEp = new Uint32Array(this.N + 1); this.zEp2 = new Uint32Array(this.N + 1);
      for (let i = 0; i <= this.N; i++) { this.zEp[i] = r(); this.zEp2[i] = r(); }
    }
    _hPiece(v, sq) { const i = v * this.N + sq; this.h1 ^= this.z1[i]; this.h2 ^= this.z2[i]; }

    // valeur des pièces : selon le nombre de cases atteintes sur un plateau vide (cavalier 300, dame 900)
    _valeurs() {
      const moy = (t) => {
        const C = 8, L = 8;
        let tot = 0;
        for (let x = 0; x < C; x++) for (let y = 0; y < L; y++) {
          const vus = new Set();
          for (const [dx, dy] of t.sauts) { if (x + dx >= 0 && x + dx < C && y + dy >= 0 && y + dy < L) vus.add((x + dx) + ',' + (y + dy)); }
          for (const [dx, dy] of t.glisses) { let a = x + dx, b = y + dy; while (a >= 0 && a < C && b >= 0 && b < L) { vus.add(a + ',' + b); a += dx; b += dy; } }
          if (t.chemin) t.chemin.noeuds.forEach(([dx, dy], i) => { if (t.chemin.cibles[i] && x + dx >= 0 && x + dx < C && y + dy >= 0 && y + dy < L) vus.add((x + dx) + ',' + (y + dy)); });
          tot += vus.size;
        }
        return tot / (C * L);
      };
      const mN = moy(typeClassique('n')), mQ = moy(typeClassique('q'));
      const FIXE = { p: 100, n: 300, b: 320, r: 500, q: 900 };
      this.valeurs = this.types.map((t) => {
        if (t.royal) return this.multi ? 1500 : 0;
        if (!this.def.types[t.lettre] || !this.def.types[t.lettre].perso) return FIXE[t.lettre] || 300;
        return Math.max(60, Math.round(300 + (moy(t) - mN) * 600 / (mQ - mN)));
      });
    }

    // ---------- FEN ----------
    lireFen(fen) {
      const ch = fen.trim().split(/\s+/);
      this.b = new Uint8Array(this.N);
      const rangs = ch[0].replace(/\[.*\]$/, '').split('/');
      this.nbRois = [0, 0];
      this.h1 = 0; this.h2 = 0;
      for (let i = 0; i < rangs.length; i++) {
        const r = this.L - 1 - i;
        let c = 0, s = rangs[i], j = 0;
        while (j < s.length) {
          const x = s[j];
          if (/\d/.test(x)) { let n = x; while (j + 1 < s.length && /\d/.test(s[j + 1])) n += s[++j]; c += +n; }
          else if (x === '*') { this.b[r * this.C + c] = TROU; c++; }
          else if (/[a-z]/i.test(x)) {
            const l = x.toLowerCase(), coul = x === l ? 1 : 0;
            const t = this.parLettre[l];
            if (t != null) { const v = this.code(t, coul); this.b[r * this.C + c] = v; this._hPiece(v, r * this.C + c); if (this.types[t].royal) this.nbRois[coul]++; }
            c++;
          }
          j++;
        }
      }
      this.trait = ch[1] === 'b' ? 1 : 0;
      this.roque = 0;
      const rq = ch[2] || '-';
      if (rq.includes('K')) this.roque |= 1; if (rq.includes('Q')) this.roque |= 2;
      if (rq.includes('k')) this.roque |= 4; if (rq.includes('q')) this.roque |= 8;
      this.ep = -1;
      if (ch[3] && ch[3] !== '-') { const s = this.caseDe(ch[3]); if (s != null) this.ep = s; }
      this.demi = +(ch[4] || 0) || 0;
      this.plein = +(ch[5] || 1) || 1;
      this.h1 ^= this.zTrait[this.trait]; this.h1 ^= this.zRoque[this.roque]; this.h2 ^= this.zRoque2[this.roque];
      this.h1 ^= this.zEp[this.ep + 1]; this.h2 ^= this.zEp2[this.ep + 1];
      this.pile = [];
      this.hist = [];
    }
    fen() {
      const rangs = [];
      for (let r = this.L - 1; r >= 0; r--) {
        let s = '', v = 0;
        for (let c = 0; c < this.C; c++) {
          const x = this.b[r * this.C + c];
          if (x === VIDE) { v++; continue; }
          if (v) { s += v; v = 0; }
          if (x === TROU) { s += '*'; continue; }
          const l = this.types[this.typeDe(x)].lettre;
          s += this.coulDe(x) ? l : l.toUpperCase();
        }
        if (v) s += v;
        rangs.push(s);
      }
      let rq = (this.roque & 1 ? 'K' : '') + (this.roque & 2 ? 'Q' : '') + (this.roque & 4 ? 'k' : '') + (this.roque & 8 ? 'q' : '');
      return rangs.join('/') + ' ' + (this.trait ? 'b' : 'w') + ' ' + (rq || '-') + ' ' + (this.ep >= 0 ? this.nom(this.ep) : '-') + ' ' + this.demi + ' ' + this.plein;
    }
    cleRepetition() { return this.h1 + ':' + this.h2; }
    nom(sq) { return FICH[sq % this.C] + (Math.floor(sq / this.C) + 1); }
    caseDe(s) {
      const m = /^([a-l])(\d+)$/.exec(s);
      if (!m) return null;
      const c = FICH.indexOf(m[1]), r = +m[2] - 1;
      return c < this.C && r < this.L ? r * this.C + c : null;
    }

    // ---------- coups ----------
    // coup = { de, vers, promo (id type ou -1), roque: 0|1|2, ep: bool, double: bool }
    _ajout(liste, de, vers, extra) {
      liste.push(Object.assign({ de, vers, promo: -1, roque: 0, ep: false, double: false }, extra));
    }
    // cases atteintes par la pièce en « de » (prises comprises) ; si prisesSeules, seulement les cases occupées par l'adversaire
    _cibles(de, v, liste, prisesSeules, pourAttaque) {
      const C = this.C, L = this.L, b = this.b;
      const t = this.types[this.typeDe(v)], coul = this.coulDe(v);
      const x0 = de % C, y0 = (de / C) | 0, sens = coul ? -1 : 1;
      const ok = (x, y) => x >= 0 && x < C && y >= 0 && y < L;
      if (t.pion) {
        const y1 = y0 + sens;
        if (y1 < 0 || y1 >= L) return;
        for (const dx of [-1, 1]) {
          const x1 = x0 + dx;
          if (x1 < 0 || x1 >= C) continue;
          const s = y1 * C + x1, q = b[s];
          if (pourAttaque) { liste.push(s); continue; }
          if (q > TROU && this.coulDe(q) !== coul) this._pionVers(liste, de, s, y1);
          else if (s === this.ep && q === VIDE) this._ajout(liste, de, s, { ep: true });
        }
        if (pourAttaque || prisesSeules) {
          if (prisesSeules) { const s = y1 * C + x0; if (b[s] === VIDE && (y1 === L - 1 || y1 === 0)) this._pionVers(liste, de, s, y1); }
          return;
        }
        const s1 = y1 * C + x0;
        if (b[s1] !== VIDE) return;
        this._pionVers(liste, de, s1, y1);
        const depart = coul ? L - 2 : 1;
        if (y0 === depart) {
          const y2 = y1 + sens;
          if (y2 >= 0 && y2 < L && b[y2 * C + x0] === VIDE) this._ajout(liste, de, y2 * C + x0, { double: true });
        }
        return;
      }
      const pousse = (s) => {
        if (pourAttaque) { liste.push(s); return; }
        const q = b[s];
        if (q === VIDE) { if (!prisesSeules) this._ajout(liste, de, s); }
        else if (q > TROU && this.coulDe(q) !== coul) this._ajout(liste, de, s);
      };
      for (const [dx, dy0] of t.sauts) {
        const dy = dy0 * sens, x = x0 + dx, y = y0 + dy;
        if (!ok(x, y)) continue;
        const s = y * C + x;
        if (b[s] !== TROU) pousse(s);
      }
      for (const [dx, dy0] of t.glisses) {
        const dy = dy0 * sens;
        let x = x0 + dx, y = y0 + dy;
        while (ok(x, y)) {
          const s = y * C + x, q = b[s];
          if (q === TROU) break;
          pousse(s);
          if (q !== VIDE) break;
          x += dx; y += dy;
        }
      }
      if (t.chemin) {
        const ch = t.chemin, n = ch.noeuds.length;
        const vu = new Uint8Array(n);
        const file = [ch.origine];
        vu[ch.origine] = 1;
        while (file.length) {
          const i = file.pop();
          for (const j of ch.voisins[i]) {
            if (vu[j]) continue;
            vu[j] = 1;
            const [dx, dy0] = ch.noeuds[j];
            const x = x0 + dx, y = y0 + dy0 * sens;
            if (!ok(x, y)) continue;
            const s = y * C + x, q = b[s];
            if (q === TROU) continue;
            if (ch.cibles[j]) pousse(s);
            if (q === VIDE) file.push(j);
          }
        }
      }
    }
    _pionVers(liste, de, s, y1) {
      const fin = this.coulDe(this.b[de]) ? 0 : this.L - 1;
      if (y1 === fin && this.promos.length) for (const l of this.promos) this._ajout(liste, de, s, { promo: this.parLettre[l] });
      else this._ajout(liste, de, s);
    }
    attaquee(s, par) {
      const C = this.C, L = this.L, b = this.b;
      const x0 = s % C, y0 = (s / C) | 0, sens = par ? -1 : 1;
      let chemins = null;
      for (let ti = 0; ti < this.types.length; ti++) {
        const t = this.types[ti], v = this.code(ti, par);
        if (t.pion) {
          const y = y0 - sens;
          if (y >= 0 && y < L) { if (x0 > 0 && b[y * C + x0 - 1] === v) return true; if (x0 < C - 1 && b[y * C + x0 + 1] === v) return true; }
          continue;
        }
        for (const [dx, dy0] of t.sauts) {
          const x = x0 - dx, y = y0 - dy0 * sens;
          if (x >= 0 && x < C && y >= 0 && y < L && b[y * C + x] === v) return true;
        }
        for (const [dx, dy0] of t.glisses) {
          const ddx = -dx, ddy = -dy0 * sens;
          let x = x0 + ddx, y = y0 + ddy;
          while (x >= 0 && x < C && y >= 0 && y < L) {
            const q = b[y * C + x];
            if (q !== VIDE) { if (q === v) return true; break; }
            x += ddx; y += ddy;
          }
        }
        if (t.chemin) (chemins || (chemins = [])).push(v);
      }
      if (chemins) {
        const tmp = [];
        for (let i = 0; i < this.N; i++) {
          if (!chemins.includes(b[i])) continue;
          tmp.length = 0;
          this._cibles(i, b[i], tmp, false, true);
          if (tmp.includes(s)) return true;
        }
      }
      return false;
    }
    caseRoi(coul) {
      for (let i = 0; i < this.N; i++) { const v = this.b[i]; if (v > TROU && this.coulDe(v) === coul && this.types[this.typeDe(v)].royal) return i; }
      return -1;
    }
    // le roi n'est « royal » (échec) que s'il en reste un seul
    enEchec(coul) {
      if (coul == null) coul = this.trait;
      if (this.nbRois[coul] !== 1) return false;
      const k = this.caseRoi(coul);
      return k >= 0 && this.attaquee(k, coul ^ 1);
    }
    pseudo(prisesSeules) {
      const l = [], me = this.trait;
      for (let i = 0; i < this.N; i++) {
        const v = this.b[i];
        if (v > TROU && this.coulDe(v) === me) this._cibles(i, v, l, prisesSeules, false);
      }
      if (!prisesSeules) this._roques(l);
      return l;
    }
    _roques(l) {
      if (this.multi) return;
      const me = this.trait, C = this.C, rang = me ? this.L - 1 : 0;
      const droits = me ? this.roque >> 2 : this.roque & 3;
      if (!droits) return;
      const k = this.caseRoi(me);
      if (k < 0 || ((k / C) | 0) !== rang) return;
      const kx = k % C;
      for (const cote of [1, 2]) {
        if (!(droits & cote)) continue;
        const tx = cote === 1 ? C - 1 : 0;
        const t = rang * C + tx, tv = this.b[t];
        if (tv <= TROU || this.coulDe(tv) !== me || this.types[this.typeDe(tv)].lettre !== 'r') continue;
        const kDest = cote === 1 ? C - 2 : 2, tDest = cote === 1 ? C - 3 : 3;
        if (Math.abs(kDest - kx) < 2 && kDest !== kx) continue;
        if ((cote === 1 && kx >= tx) || (cote === 2 && kx <= tx)) continue;
        let libre = true;
        const a = Math.min(kx, kDest, tx, tDest), z = Math.max(kx, kDest, tx, tDest);
        for (let x = a; x <= z; x++) { const s = rang * C + x; if (s !== k && s !== t && this.b[s] !== VIDE) { libre = false; break; } }
        if (!libre) continue;
        if (this.enEchec(me)) continue;
        let sur = true;
        for (let x = Math.min(kx, kDest); x <= Math.max(kx, kDest); x++) if (this.attaquee(rang * C + x, me ^ 1)) { sur = false; break; }
        if (!sur) continue;
        if (kDest === kx) continue;
        this._ajout(l, k, rang * C + kDest, { roque: cote, tour: t, tourVers: rang * C + tDest });
      }
    }
    jouerCoup(m) {
      const b = this.b, me = this.trait;
      const u = { m, pris: VIDE, prisCase: m.vers, roque: this.roque, ep: this.ep, demi: this.demi, h1: this.h1, h2: this.h2, rois: this.nbRois.slice() };
      this.hist.push(this.h1 + ':' + this.h2);
      const v = b[m.de];
      this.h1 ^= this.zRoque[this.roque] ^ this.zEp[this.ep + 1] ^ this.zTrait[me];
      this.h2 ^= this.zRoque2[this.roque] ^ this.zEp2[this.ep + 1];
      if (m.ep) u.prisCase = m.vers + (me ? this.C : -this.C);
      u.pris = b[u.prisCase];
      if (u.pris > TROU) { this._hPiece(u.pris, u.prisCase); b[u.prisCase] = VIDE; if (this.types[this.typeDe(u.pris)].royal) this.nbRois[me ^ 1]--; }
      this._hPiece(v, m.de); b[m.de] = VIDE;
      const nv = m.promo >= 0 ? this.code(m.promo, me) : v;
      b[m.vers] = nv; this._hPiece(nv, m.vers);
      if (m.roque) { const tv = b[m.tour]; this._hPiece(tv, m.tour); b[m.tour] = VIDE; b[m.tourVers] = tv; this._hPiece(tv, m.tourVers); }
      const t = this.types[this.typeDe(v)];
      this.ep = m.double ? m.de + (me ? -this.C : this.C) : -1;
      if (t.royal) this.roque &= me ? 3 : 12;
      const coin = (s) => {
        if (s === 0) this.roque &= ~2; if (s === this.C - 1) this.roque &= ~1;
        if (s === (this.L - 1) * this.C) this.roque &= ~8; if (s === this.N - 1) this.roque &= ~4;
      };
      coin(m.de); coin(m.vers);
      this.demi = t.pion || u.pris > TROU ? 0 : this.demi + 1;
      if (me) this.plein++;
      this.trait = me ^ 1;
      this.h1 ^= this.zRoque[this.roque] ^ this.zEp[this.ep + 1] ^ this.zTrait[this.trait];
      this.h2 ^= this.zRoque2[this.roque] ^ this.zEp2[this.ep + 1];
      this.pile.push(u);
    }
    annulerCoup() {
      if (this.pile.length && this.pile[this.pile.length - 1].nul) { this.annulerNul(); return; }
      const u = this.pile.pop(), m = u.m, b = this.b;
      this.hist.pop();
      this.trait ^= 1;
      const me = this.trait;
      if (me) this.plein--;
      let tv = 0;
      if (m.roque) { tv = b[m.tourVers]; b[m.tourVers] = VIDE; }
      const nv = b[m.vers];
      b[m.vers] = VIDE;
      b[m.de] = m.promo >= 0 ? this.code(this.parLettre.p, me) : nv;
      if (m.roque) b[m.tour] = tv;
      if (u.pris > TROU || m.ep) b[u.prisCase] = u.pris;
      this.roque = u.roque; this.ep = u.ep; this.demi = u.demi; this.h1 = u.h1; this.h2 = u.h2; this.nbRois = u.rois;
    }
    // coup nul (pour la recherche) : on passe son tour
    jouerNul() {
      this.pile.push({ nul: true, ep: this.ep, h1: this.h1, h2: this.h2 });
      this.hist.push(this.h1 + ':' + this.h2);
      this.h1 ^= this.zEp[this.ep + 1] ^ this.zTrait[this.trait] ^ this.zTrait[this.trait ^ 1] ^ this.zEp[0];
      this.h2 ^= this.zEp2[this.ep + 1] ^ this.zEp2[0];
      this.ep = -1; this.trait ^= 1;
    }
    annulerNul() {
      const u = this.pile.pop(); this.hist.pop();
      this.trait ^= 1; this.ep = u.ep; this.h1 = u.h1; this.h2 = u.h2;
    }
    pieces(coul) {
      let n = 0;
      for (let i = 0; i < this.N; i++) { const v = this.b[i]; if (v > TROU && this.coulDe(v) === coul && !this.types[this.typeDe(v)].pion && !this.types[this.typeDe(v)].royal) n++; }
      return n;
    }
    legaux() {
      const l = [], me = this.trait;
      if (!this.nbRois[me] && this.multi) return l;
      for (const m of this.pseudo(false)) {
        this.jouerCoup(m);
        const ok = !this.enEchec(me);
        this.annulerCoup();
        if (ok) l.push(m);
      }
      return l;
    }
    uci(m) { return this.nom(m.de) + this.nom(m.vers) + (m.promo >= 0 ? this.types[m.promo].lettre : ''); }
    trouverUci(u) { return this.legaux().find((m) => this.uci(m) === u) || null; }

    // ---------- fin de partie ----------
    // renvoie null (pas finie) ou { res: '1-0'|'0-1'|'1/2-1/2', raison }
    finPartie(nbRep) {
      const me = this.trait;
      const perd = me ? '1-0' : '0-1';
      if (this.multi && !this.nbRois[me]) return { res: perd, raison: 'Tous les rois pris' };
      if (!this.legaux().length) {
        if (this.enEchec(me)) return { res: perd, raison: 'Échec et mat' };
        return { res: '1/2-1/2', raison: 'Pat' };
      }
      if (this.demi >= 100) return { res: '1/2-1/2', raison: 'Règle des 50 coups' };
      if (nbRep >= 3) return { res: '1/2-1/2', raison: 'Répétition de la position' };
      let autres = 0;
      for (let i = 0; i < this.N; i++) { const v = this.b[i]; if (v > TROU && !this.types[this.typeDe(v)].royal) { autres++; break; } }
      if (!autres) return { res: '1/2-1/2', raison: 'Matériel insuffisant' };
      return null;
    }

    // notation (anglaise : K Q R B N + lettres des personnages créés en majuscule)
    san(m) {
      if (m.roque) return m.roque === 1 ? 'O-O' : 'O-O-O';
      const v = this.b[m.de], t = this.types[this.typeDe(v)];
      let s = '';
      const prise = this.b[m.vers] > TROU || m.ep;
      if (t.pion) { if (prise) s = FICH[m.de % this.C] + 'x'; }
      else {
        s = t.lettre.toUpperCase();
        const autres = this.legaux().filter((x) => x.vers === m.vers && x.de !== m.de && this.b[x.de] === v);
        if (autres.length) {
          const col = (sq) => sq % this.C, lig = (sq) => (sq / this.C) | 0;
          if (!autres.some((x) => col(x.de) === col(m.de))) s += FICH[col(m.de)];
          else if (!autres.some((x) => lig(x.de) === lig(m.de))) s += (lig(m.de) + 1);
          else s += this.nom(m.de);
        }
        if (prise) s += 'x';
      }
      s += this.nom(m.vers);
      if (m.promo >= 0) s += '=' + this.types[m.promo].lettre.toUpperCase();
      this.jouerCoup(m);
      const fin = this.multi && !this.nbRois[this.trait];
      if (fin || this.enEchec(this.trait)) s += (fin || !this.legaux().length) ? '#' : '+';
      this.annulerCoup();
      return s;
    }

    // ---------- évaluation (vue du camp au trait) ----------
    evaluer() {
      const C = this.C, L = this.L, cx = (C - 1) / 2, cy = (L - 1) / 2;
      let s = 0;
      for (let i = 0; i < this.N; i++) {
        const v = this.b[i];
        if (v <= TROU) continue;
        const ti = this.typeDe(v), coul = this.coulDe(v), t = this.types[ti];
        const x = i % C, y = (i / C) | 0;
        let val = this.valeurs[ti];
        if (t.pion) val += 8 * (coul ? L - 1 - y : y);
        else if (!t.royal || this.multi) val += Math.round(10 - 3 * (Math.abs(x - cx) + Math.abs(y - cy)) / 2);
        s += coul ? -val : val;
      }
      return this.trait ? -s : s;
    }
  }

  // ---------- recherche ----------
  // o = { temps, profondeur, multipv, surInfo(lignes), histo: [clés des positions déjà jouées] }
  function chercher(j, o) {
    const fin = Date.now() + Math.max(50, o.temps || 1000);
    const profMax = Math.min(64, o.profondeur || 64);
    const multipv = Math.max(1, o.multipv || 1);
    const TT = new Map();
    const deja = new Set(o.histo || []);
    let noeuds = 0;
    const STOP = {};
    const tueurs = [];
    const valeurDe = (v) => (v > TROU ? j.valeurs[j.typeDe(v)] + 1 : 0);
    function ordonner(liste, meilleur, ply) {
      const k = tueurs[ply];
      for (const m of liste) {
        let sc = 0;
        const pris = j.b[m.vers];
        if (pris > TROU) sc = 100000 + valeurDe(pris) * 16 - valeurDe(j.b[m.de]) / 8;
        if (m.promo >= 0) sc += 90000 + j.valeurs[m.promo];
        if (k && k.de === m.de && k.vers === m.vers) sc += 50000;
        if (meilleur && meilleur.de === m.de && meilleur.vers === m.vers && meilleur.promo === m.promo) sc = 1e9;
        m.sc = sc;
      }
      liste.sort((a, b) => b.sc - a.sc);
    }
    function terminal(ply) {
      const me = j.trait;
      if (j.multi && !j.nbRois[me]) return -MAT + ply;
      return null;
    }
    function quiesce(alpha, beta, ply) {
      if ((++noeuds & 1023) === 0 && Date.now() > fin) throw STOP;
      const t = terminal(ply);
      if (t != null) return t;
      const me = j.trait;
      const echec = j.enEchec(me);
      if (!echec) {
        const st = j.evaluer();
        if (st >= beta) return st;
        if (st > alpha) alpha = st;
      }
      const liste = echec ? j.pseudo(false) : j.pseudo(true);
      ordonner(liste, null, ply);
      let legal = 0;
      for (const m of liste) {
        j.jouerCoup(m);
        if (j.enEchec(me)) { j.annulerCoup(); continue; }
        legal++;
        const sc = -quiesce(-beta, -alpha, ply + 1);
        j.annulerCoup();
        if (sc >= beta) return sc;
        if (sc > alpha) alpha = sc;
      }
      if (echec && !legal) return -MAT + ply;
      return alpha;
    }
    function ab(prof, alpha, beta, ply, pv) {
      if ((++noeuds & 1023) === 0 && Date.now() > fin) throw STOP;
      pv.length = 0;
      const t = terminal(ply);
      if (t != null) return t;
      const cle = j.h1 + ':' + j.h2;
      if (ply && (deja.has(cle) || j.hist.includes(cle))) return 0;
      if (j.demi >= 100) return 0;
      const me = j.trait;
      const echec = j.enEchec(me);
      if (echec) prof++;
      if (prof <= 0) return quiesce(alpha, beta, ply);
      const e = TT.get(cle);
      if (e && e.prof >= prof && ply) {
        if (e.type === 0) return e.sc;
        if (e.type === 1 && e.sc >= beta) return e.sc;
        if (e.type === 2 && e.sc <= alpha) return e.sc;
      }
      // coup nul : si même en passant son tour on reste au-dessus de beta, inutile de chercher plus
      if (!echec && prof >= 3 && ply && beta < MAT - 1000 && j.pieces(me) > 0 && !j.multi) {
        j.jouerNul();
        let sn;
        try { sn = -ab(prof - 3, -beta, -beta + 1, ply + 1, []); } finally { j.annulerNul(); }
        if (sn >= beta) return beta;
      }
      const liste = j.pseudo(false);
      ordonner(liste, e && e.m, ply);
      let meilleur = -Infinity, mm = null, legal = 0;
      const a0 = alpha;
      const sous = [];
      for (const m of liste) {
        const calme = j.b[m.vers] === VIDE && !m.ep && m.promo < 0;
        j.jouerCoup(m);
        if (j.enEchec(me)) { j.annulerCoup(); continue; }
        legal++;
        let sc;
        // coups tardifs et calmes : d'abord une recherche moins profonde, refaite en entier s'ils semblent bons
        if (legal > 4 && calme && prof >= 3 && !echec && !j.enEchec(j.trait)) {
          sc = -ab(prof - 2, -alpha - 1, -alpha, ply + 1, sous);
          if (sc > alpha) sc = -ab(prof - 1, -beta, -alpha, ply + 1, sous);
        } else sc = -ab(prof - 1, -beta, -alpha, ply + 1, sous);
        j.annulerCoup();
        if (sc > meilleur) {
          meilleur = sc; mm = m;
          if (sc > alpha) { alpha = sc; pv.length = 0; pv.push(m); for (const x of sous) pv.push(x); }
        }
        if (alpha >= beta) { if (j.b[m.vers] === VIDE) tueurs[ply] = m; break; }
      }
      if (!legal) return echec ? -MAT + ply : 0;
      TT.set(cle, { prof, sc: meilleur, type: meilleur <= a0 ? 2 : meilleur >= beta ? 1 : 0, m: mm });
      if (TT.size > 400000) TT.clear();
      return meilleur;
    }
    const versScore = (sc) => {
      if (Math.abs(sc) > MAT - 1000) { const plies = MAT - Math.abs(sc); const n = Math.ceil(plies / 2); return { mate: sc > 0 ? n : -n }; }
      return { cp: sc };
    };
    // racine
    const racine = j.legaux();
    if (!racine.length) return { coup: null, lignes: [] };
    let resultats = racine.map((m) => ({ m, sc: 0, pv: [m] }));
    let lignes = [];
    const base = j.pile.length;
    for (let prof = 1; prof <= profMax; prof++) {
      const nouveaux = [];
      try {
        let alphaK = -Infinity;
        const tri = resultats.slice();
        for (const r of tri) {
          j.jouerCoup(r.m);
          const sous = [];
          let sc;
          // fenêtre : seulement savoir si le coup entre dans les « multipv » meilleurs
          sc = -ab(prof - 1, -Infinity, alphaK === -Infinity ? Infinity : -alphaK + 1, 1, sous);
          j.annulerCoup();
          nouveaux.push({ m: r.m, sc, pv: [r.m].concat(sous) });
          const top = nouveaux.map((x) => x.sc).sort((a, b) => b - a);
          if (top.length >= multipv) alphaK = top[multipv - 1];
          if (Date.now() > fin && prof > 1) throw STOP;
        }
      } catch (e) {
        while (j.pile.length > base) j.annulerCoup();
        if (e !== STOP) throw e;
        break;
      }
      nouveaux.sort((a, b) => b.sc - a.sc);
      resultats = nouveaux;
      lignes = resultats.slice(0, multipv).map((r, i) => ({ multipv: i + 1, profondeur: prof, score: versScore(r.sc), pv: r.pv.map((m) => j.uci(m)) }));
      if (o.surInfo) o.surInfo(lignes);
      if (Math.abs(resultats[0].sc) > MAT - 1000 && prof > MAT - Math.abs(resultats[0].sc)) break;
      if (Date.now() > fin) break;
      if (resultats.length === 1 && prof >= 3) break;
    }
    return { coup: lignes[0] ? lignes[0].pv[0] : j.uci(racine[0]), lignes };
  }

  const Maison = { Jeu, chercher, typeDepuisPerso };
  racine.Maison = Maison;

  // ---------- Worker ----------
  if (typeof WorkerGlobalScope !== 'undefined' && racine instanceof WorkerGlobalScope) {
    racine.onmessage = (e) => {
      const d = e.data;
      const j = new Jeu(d.def, d.fen0);
      const histo = [j.cleRepetition()];
      for (const u of d.coups || []) {
        const m = j.trouverUci(u);
        if (!m) break;
        j.jouerCoup(m);
        histo.push(j.cleRepetition());
      }
      histo.pop();
      j.hist = [];
      j.pile = [];
      const r = chercher(j, {
        temps: d.temps, profondeur: d.profondeur, multipv: d.multipv, histo,
        surInfo: (lignes) => racine.postMessage({ id: d.id, type: 'info', lignes })
      });
      racine.postMessage({ id: d.id, type: 'fin', coup: r.coup, lignes: r.lignes });
    };
  }
})(typeof self !== 'undefined' ? self : window);
