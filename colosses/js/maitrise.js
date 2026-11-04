'use strict';
/* Colosses — hauts faits (aucune puissance) : défis de maîtrise par espèce de boss, titres à porter, journal des records.
   Les seules récompenses sont des cristaux (affinités et apparences) et des titres. */

const DEFIS_M = [
  { k: 'v', nom: 'Vaincue', desc: 'La vaincre une fois', cristaux: 1 },
  { k: 'rapide', nom: 'Rapide', desc: 'La vaincre en moins de 1 min 30', cristaux: 2 },
  { k: 'propre', nom: 'Propre', desc: 'La vaincre en prenant 3 coups ou moins', cristaux: 2 },
  { k: 'cauch', nom: 'Cauchemar', desc: 'La vaincre en difficulté Cauchemar', cristaux: 3 },
  { k: 'parfait', nom: 'Parfait', desc: 'La vaincre sans être touché une seule fois', cristaux: 5, or: true }
];
const ESP_TOUTES = () => ESP_ORDRE.concat(['chimere']).filter(e => ESPECES[e]);
function maitriseSave() {
  const M = Save.d.maitrise = Save.d.maitrise || {};
  if (!Save.d.maitriseV2) { for (const m of Object.values(M)) if (m.pur && !m.propre) m.propre = 1; Save.d.maitriseV2 = 1; }
  return M;
}
// 4 étoiles : vaincue, rapide, propre, Cauchemar (le « parfait » est une marque dorée à part)
etoiles = function (esp) { const m = maitriseSave()[esp]; return m ? ['v', 'rapide', 'propre', 'cauch'].filter(k => m[k]).length : 0; };
noterMaitrise = function (esp) {
  if (G.mode === 'entrainement' || !ESPECES[esp]) return;
  const m = maitriseSave()[esp] = maitriseSave()[esp] || {}, d = Save.d, s = d.stats;
  const coups = G.coupsPris || 0, t = G.chrono || 0;
  const ok = { v: true, rapide: t < 90, propre: coups <= 3, cauch: G.mode === 'normal' && d.diff === 'cauchemar', parfait: coups === 0 };
  const nouveaux = DEFIS_M.filter(D => ok[D.k] && !m[D.k]);
  nouveaux.forEach(D => m[D.k] = 1);
  m.tues = (m.tues || 0) + 1;
  if (!m.best || t < m.best) m.best = Math.round(t);
  if (m.minCoups === undefined || coups < m.minCoups) m.minCoups = coups;
  if (coups === 0) statPlus('parfaits');
  if (!s.plusRapide || t < s.plusRapide.t) s.plusRapide = { t: Math.round(t), nom: G.def.nom, esp, salle: G.salle };
  const gain = nouveaux.reduce((n, D) => n + D.cristaux, 0);
  if (gain) gagnerEclats(gain);
  if (nouveaux.length) {
    G.annonce('Maîtrise · ' + nomMaj(ESPECES[esp].nom) + ' : ' + nouveaux.map(D => D.nom).join(', ') + '  (+' + gain + ' cristaux)', '#ffd86b', 2.6);
    Son.play('ramasse');
  }
  Save.write();
  const titres = verifierTitres();
  if (titres.length) setTimeout(() => { if (G.etat === 'interlude' || G.etat === 'combat') G.annonce('Nouveau titre : ' + titres.map(x => x.nom).join(', '), '#ffcf6b', 2.6); }, nouveaux.length ? 2700 : 600);
};

// ---------- titres ----------
function deNom(n) {
  n = String(n);
  if (/^le /i.test(n)) return 'du ' + n.slice(3);
  if (/^la /i.test(n)) return 'de la ' + n.slice(3);
  if (/^les /i.test(n)) return 'des ' + n.slice(4);
  if (/^l['’]/i.test(n)) return 'de l’' + n.slice(2);
  return 'de ' + n;
}
const _S = () => Save.d.stats;
const recordMax = () => Math.max(...Object.keys(DIFFS).map(k => (Save.d.prog[k] || {}).record || 0));
const TITRES = [
  { id: 'novice', nom: 'Novice', desc: 'Le titre de départ.', ok: () => true },
  { id: 'chasseur', nom: 'Chasseur', desc: 'Vaincre 10 boss.', ok: () => (_S().boss || 0) >= 10 },
  { id: 'tueur', nom: 'Tueur de colosses', desc: 'Vaincre 100 boss.', ok: () => (_S().boss || 0) >= 100 },
  { id: 'legende', nom: 'Légende vivante', desc: 'Vaincre 500 boss.', ok: () => (_S().boss || 0) >= 500 },
  { id: 'intouchable', nom: 'Intouchable', desc: 'Vaincre un boss sans être touché.', ok: () => Math.max(_S().parfaits || 0, _S().sansCoup || 0) >= 1 },
  { id: 'fantome', nom: 'Fantôme', desc: '25 victoires sans être touché.', ok: () => Math.max(_S().parfaits || 0, _S().sansCoup || 0) >= 25 },
  { id: 'eclair', nom: 'Éclair', desc: 'Vaincre un boss en moins de 45 secondes.', ok: () => _S().plusRapide && _S().plusRapide.t < 45 },
  { id: 'inarretable', nom: 'Inarrêtable', desc: 'Vaincre 15 boss d\'affilée sans mourir.', ok: () => (_S().serieMax || 0) >= 15 },
  { id: 'megas', nom: 'Briseur de géants', desc: 'Vaincre 10 méga boss.', ok: () => (_S().mega || 0) >= 10 },
  { id: 'marais', nom: 'Marcheur des marais', desc: 'Atteindre la région III, le Marais des noyés.', ok: () => recordMax() >= 11 },
  { id: 'pelerin', nom: 'Pèlerin du ciel', desc: 'Atteindre la région VI, les Ruines célestes.', ok: () => recordMax() >= 26 },
  { id: 'eternel', nom: 'Éternel', desc: 'Faire le tour des 6 régions et revenir au Temple (salle 31).', ok: () => recordMax() >= 31 },
  { id: 'cauchemar', nom: 'Enfant du cauchemar', desc: 'Atteindre la salle 11 en Cauchemar.', ok: () => ((Save.d.prog.cauchemar || {}).record || 0) >= 11 },
  { id: 'erudit', nom: 'Érudit', desc: 'Rencontrer toutes les espèces de boss.', ok: () => ESP_TOUTES().every(e => Save.d.codex.especes[e]) },
  { id: 'grandmaitre', nom: 'Grand maître', desc: 'Obtenir les 4 étoiles sur toutes les espèces.', ok: () => ESP_TOUTES().every(e => etoiles(e) >= 4) },
  { id: 'dieu', nom: 'Sans égal', desc: 'Réussir les 5 défis de maîtrise sur toutes les espèces.', ok: () => ESP_TOUTES().every(e => { const m = maitriseSave()[e]; return m && DEFIS_M.every(D => m[D.k]); }) }
];
for (const e of ESP_TOUTES()) TITRES.push({ id: 'fl_' + e, esp: e, nom: 'Fléau ' + deNom(ESPECES[e].nom), desc: 'Réussir les 5 défis de maîtrise ' + deNom(ESPECES[e].nom) + '.', ok: () => { const m = maitriseSave()[e]; return !!m && DEFIS_M.every(D => m[D.k]); } });
function titresSave() { return Save.d.titres = Save.d.titres || { novice: Date.now() }; }
function verifierTitres() {
  const T = titresSave(), out = [];
  for (const t of TITRES) { try { if (!T[t.id] && t.ok()) { T[t.id] = Date.now(); out.push(t); } } catch (e) { } }
  if (out.length) { Save.d.titresNouveaux = (Save.d.titresNouveaux || 0) + out.length; Save.write(); }
  return out;
}
function titrePorte() { const t = TITRES.find(x => x.id === Save.d.titre && titresSave()[x.id]); return t || TITRES[0]; }

// ---------- écran « Hauts faits » ----------
UI.hautsFaits = function (o) {
  o = o || 'maitrise';
  verifierTitres();
  const d = Save.d, M = maitriseSave(), s = d.stats, ids = ESP_TOUTES();
  const totEt = ids.reduce((n, e) => n + etoiles(e), 0), parf = ids.filter(e => M[e] && M[e].parfait).length;
  const onglets = [['maitrise', '★ Maîtrise'], ['titres', '🏆 Titres'], ['journal', '📖 Journal']];
  let corps = '';
  if (o === 'maitrise') {
    corps = `<p class="mini">${totEt} / ${ids.length * 4} étoiles · ${parf} espèce(s) vaincue(s) sans être touché. Chaque défi réussi rapporte des cristaux, une seule fois. Les 5 défis d'une espèce donnent son titre de « Fléau ».</p><div class="liste large">` + ids.map(e => {
      const E = ESPECES[e], m = M[e] || {}, v = d.codex.especes[e];
      if (!v) return '<div class="entree inconnu"><b>???</b><p>Pas encore rencontrée.</p></div>';
      const n = etoiles(e);
      return `<div class="entree maitrise"><b style="color:${E.hue != null ? hsl(E.hue, 100, 66) : '#ddd'}">${nomMaj(E.nom)}</b><span class="cpt">${'★'.repeat(n)}${'☆'.repeat(4 - n)}${m.parfait ? ' <i class="or">✦</i>' : ''}</span>
        <div class="defis-m">${DEFIS_M.map(D => `<span class="dm ${m[D.k] ? 'fait' : ''} ${D.or ? 'or' : ''}" title="${D.desc} · +${D.cristaux} cristaux">${m[D.k] ? '✔' : '·'} ${D.nom}</span>`).join('')}</div>
        <div class="rec-m"><span>${m.tues || v.tues || 0} vaincu(s)</span><span>meilleur temps ${m.best ? fmtTemps(m.best) : '—'}</span><span>moins de coups ${m.minCoups !== undefined ? m.minCoups : '—'}</span></div></div>`;
    }).join('') + '</div>';
  } else if (o === 'titres') {
    const T = titresSave(), porte = titrePorte().id;
    d.titresNouveaux = 0; Save.write();
    const liste = TITRES.filter(t => !t.esp || d.codex.especes[t.esp]);
    corps = `<p class="mini">${Object.keys(T).length} / ${TITRES.length} titres. Clique sur un titre obtenu pour le porter : il s'affiche sur l'accueil.</p><div class="grille-succes">` + liste.map(t => {
      const ok = !!T[t.id];
      return `<div class="succes titre-c ${ok ? 'ok' : ''} ${t.id === porte ? 'porte' : ''}" ${ok ? `data-a="hfTitre" data-k="${t.id}"` : ''}><b>${ok ? '« ' + t.nom + ' »' : '???'}</b><span class="sd">${t.desc}</span>${t.id === porte ? '<span class="sdate">porté</span>' : ok ? `<span class="sdate">${new Date(T[t.id]).toLocaleDateString('fr-FR')}</span>` : ''}</div>`;
    }).join('') + '</div>';
  } else {
    const pr = s.plusRapide;
    const parDiff = Object.entries(DIFFS).map(([k, v]) => { const rec = (d.prog[k] || {}).record || 0, rg = rec > 1 ? regionDe(rec) : null; return `<div class="ligne"><span>${v.ico} ${v.nom}</span><b>salle ${rec || '—'}${rg ? ' · ' + romain(rg.num) + ' ' + rg.nom : ''}</b></div>`; }).join('');
    const derniers = (d.chasse || []).slice(0, 15).map(c => `<div class="ligne"><span><b style="color:${c.hue != null ? hsl(c.hue, 90, 70) : '#ddd'}">${c.nom}</b> ${c.titre ? '<small>' + c.titre + '</small>' : ''}</span><b>salle ${c.salle}${c.mega ? ' · méga' : ''} · ${fmtTemps(c.temps)}${DIFFS[c.diff] ? ' · ' + DIFFS[c.diff].nom : ''}</b></div>`).join('') || '<p class="mini">Aucun combat gagné pour l\'instant.</p>';
    corps = `<div class="stats-g">
        <div class="stat"><b>${s.boss || 0}</b><span>boss vaincus</span></div>
        <div class="stat"><b>${s.mega || 0}</b><span>méga boss</span></div>
        <div class="stat"><b>${Math.max(s.parfaits || 0, s.sansCoup || 0)}</b><span>victoires sans être touché</span></div>
        <div class="stat"><b>${s.serieMax || 0}</b><span>meilleure série</span></div>
      </div>
      <div class="blocs">
        <div class="bloc"><h3>Plus loin atteint</h3>${parDiff}</div>
        <div class="bloc"><h3>Victoire la plus rapide</h3>${pr ? `<p><b>${pr.nom}</b></p><p>${fmtTemps(pr.t)} · salle ${pr.salle}</p>` : '<p class="mini">—</p>'}</div>
        <div class="bloc"><h3>Titre porté</h3><p><b>« ${titrePorte().nom} »</b></p><p class="mini">${titrePorte().desc}</p></div>
      </div>
      <h4>Derniers combats gagnés</h4><div class="journal">${derniers}</div>`;
  }
  this.retour = () => this.menu();
  this.montrer(`<div class="panneau"><div class="barre-titre"><button class="rond" data-a="menu" data-echap title="Retour">←</button><h2>🏆 Hauts faits</h2></div>
    <div class="onglets">${onglets.map(([k, n]) => `<button data-a="hauts" data-o="${k}" class="${k === o ? 'actif' : ''}">${n}</button>`).join('')}</div>${corps}</div>`);
};
const _actionHF = UI.action;
UI.action = function (a, btn) {
  if (a === 'hauts') return this.hautsFaits(btn && btn.dataset.o);
  if (a === 'hfTitre') { Save.d.titre = btn.dataset.k; Save.write(); return this.hautsFaits('titres'); }
  return _actionHF.call(this, a, btn);
};
try { verifierTitres(); } catch (e) { }
