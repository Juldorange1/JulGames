'use strict';
/* Colosses — scores entre amis, sans serveur : chaque joueur a un « code de score » (records, Abysses, défis du jour
   et de la semaine, titre). On colle le code d'un ami pour comparer, dans Hauts faits → Entre amis.
   Le code ne contient que des scores et un pseudo choisi par le joueur. */

const Amis = {
  liste() { return Save.d.amis || (Save.d.amis = []); },
  monScore() {
    const d = Save.d;
    const rec = t => { const x = d.defis[t], c = defiCourant(t); return x && x.cle === c.cle && x.best && x.best.score !== undefined ? { c: c.cle, s: x.best.score } : null; };
    return { v: 1, n: (d.pseudo || 'Moi').slice(0, 16), t: d.titre || 'novice', r: ['apprenti', 'guerrier', 'cauchemar'].map(k => (d.prog[k] || {}).record || 0), a: (d.abysses || {}).best || 0, b: d.stats.boss || 0, dj: rec('jour'), sv: ((d.defis.survie || {}).best || {}).score || 0, j: new Date().toISOString().slice(0, 10) };
  },
  somme(s) { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return (h % 65536).toString(16).padStart(4, '0'); },
  coder(o) { const b = btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); return 'COLOSSES-' + b + '-' + this.somme(b); },
  decoder(code) {
    const m = /^COLOSSES-([A-Za-z0-9_-]+)-([0-9a-f]{4})$/.exec(String(code || '').trim().replace(/\s+/g, ''));
    if (!m || this.somme(m[1]) !== m[2]) return null;
    try {
      const o = JSON.parse(decodeURIComponent(escape(atob(m[1].replace(/-/g, '+').replace(/_/g, '/')))));
      if (!o || o.v !== 1 || !Array.isArray(o.r)) return null;
      const num = x => Math.max(0, Math.min(1e7, +x || 0));
      const def = x => x && typeof x.c === 'string' ? { c: x.c.slice(0, 24), s: +x.s || 0 } : null;
      return { v: 1, n: String(o.n || 'Ami').replace(/[<>&"']/g, '').slice(0, 16), t: String(o.t || '').replace(/[^a-z0-9_]/gi, '').slice(0, 30), r: o.r.slice(0, 3).map(num), a: num(o.a), b: num(o.b), dj: def(o.dj), sv: num(o.sv), j: String(o.j || '').slice(0, 10) };
    } catch (e) { return null; }
  },
  ecran(msg) {
    const moi = this.monScore(), amis = this.liste(), code = this.coder(moi);
    const lignes = [Object.assign({ moi: true }, moi)].concat(amis);
    const dj = defiCourant('jour'), Fj = FORMATS[dj.format];
    const cols = [
      ['Apprenti', l => l.r[0], 1, v => v ? 'salle ' + v : '—'], ['Guerrier', l => l.r[1], 1, v => v ? 'salle ' + v : '—'], ['Cauchemar', l => l.r[2], 1, v => v ? 'salle ' + v : '—'],
      ['Abysses', l => l.a, 1, v => v ? v + ' boss' : '—'], ['Boss vaincus', l => l.b, 1, v => v || '—'],
      ['Défi du jour', l => l.dj && l.dj.c === dj.cle ? l.dj.s : null, Fj.sens || 1, v => v === null ? '—' : Fj.fmt(v)],
      ['Survie', l => l.sv || null, 1, v => v === null ? '—' : fmtTemps(v)]
    ];
    const meilleur = cols.map(([, f, sens]) => { const v = lignes.map(f).filter(x => x !== null && x > 0); return v.length ? (sens > 0 ? Math.max(...v) : Math.min(...v)) : null; });
    const titreNom = id => { const t = TITRES.find(x => x.id === id); return t ? '« ' + t.nom + ' »' : ''; };
    const tableau = `<table class="amis-t"><tr><th>Joueur</th>${cols.map(c => `<th>${c[0]}</th>`).join('')}<th></th></tr>` + lignes.map((l, i) => `<tr class="${l.moi ? 'moi' : ''}"><td><b>${l.moi ? (Save.d.pseudo || 'Toi') : l.n}</b><small>${titreNom(l.t)}${!l.moi && l.j ? ' · code du ' + l.j.split('-').reverse().join('/') : ''}</small></td>${cols.map(([, f], k) => { const v = f(l); return `<td class="${v !== null && v === meilleur[k] && v > 0 ? 'top' : ''}">${cols[k][3](v)}</td>`; }).join('')}<td>${l.moi ? '' : `<button class="petit" data-a="amisSuppr" data-i="${i - 1}" title="Retirer">✕</button>`}</td></tr>`).join('') + '</table>';
    this.onglets = UI._ongletsHF ? UI._ongletsHF('amis') : '';
    UI.retour = () => UI.menu();
    UI.montrer(`<div class="panneau large"><div class="barre-titre"><button class="rond" data-a="menu" data-echap title="Retour">←</button><h2>🏆 Hauts faits</h2></div>${this.onglets}
      <p class="mini">Pas de serveur : donne ton code à un ami (message, mail…), il le colle dans son jeu, et vous comparez. Le code ne contient que tes scores et ton pseudo. Les défis du jour et de la semaine ne se comparent que s'ils sont du même jour ou de la même semaine. En doré : le meilleur.</p>
      ${msg ? `<p class="amis-msg">${msg}</p>` : ''}
      <div class="amis-g">
        <div class="bloc"><h3>Ton pseudo</h3><input id="amis-pseudo" maxlength="16" value="${(Save.d.pseudo || '').replace(/"/g, '')}" placeholder="Ton pseudo"><div class="rang"><button data-a="amisPseudo">Enregistrer</button></div></div>
        <div class="bloc"><h3>Ton code de score</h3><textarea id="amis-code" readonly rows="3">${code}</textarea><div class="rang"><button data-a="amisCopier">Copier le code</button></div></div>
        <div class="bloc"><h3>Code d'un ami</h3><textarea id="amis-ajout" rows="3" placeholder="Colle ici le code COLOSSES-…"></textarea><div class="rang"><button data-a="amisAjout">Ajouter / mettre à jour</button></div></div>
      </div>${tableau}</div>`);
  },
  ajouter(code) {
    const o = this.decoder(code); if (!o) return this.ecran('Ce code n\'est pas valide (vérifie qu\'il est complet).');
    const l = this.liste(), i = l.findIndex(x => x.n === o.n);
    if (i >= 0) l[i] = o; else l.push(o);
    if (l.length > 30) l.shift();
    Save.write(); this.ecran('Code de ' + o.n + ' ajouté.');
  }
};
const _actionAmis = UI.action;
UI.action = function (a, btn) {
  if (a === 'hauts' && btn && btn.dataset && btn.dataset.o === 'amis') return Amis.ecran();
  if (a === 'amisPseudo') { const v = (document.getElementById('amis-pseudo') || {}).value || ''; Save.d.pseudo = v.replace(/[<>&"']/g, '').trim().slice(0, 16); Save.write(); return Amis.ecran('Pseudo enregistré.'); }
  if (a === 'amisCopier') { const t = document.getElementById('amis-code'); try { navigator.clipboard.writeText(t.value).then(() => Amis.ecran('Code copié : colle-le dans un message à ton ami.'), () => { t.select(); document.execCommand('copy'); Amis.ecran('Code copié.'); }); } catch (e) { t.select(); } return; }
  if (a === 'amisAjout') return Amis.ajouter((document.getElementById('amis-ajout') || {}).value);
  if (a === 'amisSuppr') { Amis.liste().splice(+btn.dataset.i, 1); Save.write(); return Amis.ecran(); }
  return _actionAmis.call(this, a, btn);
};
// onglets de Hauts faits : on ajoute « Entre amis »
UI._ongletsHF = o => `<div class="onglets">${[['maitrise', '★ Maîtrise'], ['titres', '🏆 Titres'], ['journal', '📖 Journal'], ['amis', '👥 Entre amis']].map(([k, n]) => `<button data-a="hauts" data-o="${k}" class="${k === o ? 'actif' : ''}">${n}</button>`).join('')}</div>`;
const _hfAmis = UI.hautsFaits;
UI.hautsFaits = function (o) {
  if (o === 'amis') return Amis.ecran();
  _hfAmis.call(this, o);
  try { const on = this.el.querySelector('.onglets'); if (on && !on.querySelector('[data-o=amis]')) { const b = document.createElement('button'); b.dataset.a = 'hauts'; b.dataset.o = 'amis'; b.innerHTML = '👥 Entre amis'; b.addEventListener('click', ev => { ev.stopPropagation(); Son.play('clic'); Amis.ecran(); }); on.appendChild(b); try { iconiser(on); } catch (e) { } } } catch (e) { }
};
