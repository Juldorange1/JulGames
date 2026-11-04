'use strict';
/* Colosses — Codex illustré : portraits des colosses (dessinés avec leur vrai rendu), cartes aux couleurs de chaque
   espèce, attaques rangées par type avec leur couleur, grandes icônes colorées pour les armes et les traits, régions
   avec un aperçu de leur sol. Ce qui n'est pas encore découvert reste une silhouette noire. */

const CAT_ATK = {
  zone: { nom: 'Zones annoncées', col: '#ff6a4a', desc: 'Une zone se remplit, puis frappe.' },
  balles: { nom: 'Projectiles', col: '#ffcf6b', desc: 'Balles, salves et nuées.' },
  rayon: { nom: 'Rayons', col: '#ff4d9a', desc: 'Une ligne fine annonce le rayon.' },
  corps: { nom: 'Corps à corps', col: '#c58bff', desc: 'Charges, sauts et coups du colosse lui-même.' },
  terrain: { nom: 'Terrain', col: '#7ddc6a', desc: 'Le sol change : lave, givre, ronces…' },
  invoc: { nom: 'Invocations', col: '#5fd8ff', desc: 'Des créatures rejoignent le combat.' }
};
const _portraits = {};
// dessine un colosse de l'espèce (vrai rendu) dans une image ; noir = silhouette pour les espèces inconnues
function portraitEspece(esp, noir) {
  const cle = esp + (noir ? ':n' : '');
  if (_portraits[cle] !== undefined) return _portraits[cle];
  let url = null;
  const sauve = { boss: G.boss, def: G.def, minions: G.minions, hz: G.hz, eb: G.eb, etat: G.etat };
  try {
    let def = null;
    for (let s = 1; s < 4000 && (!def || def.esp !== esp); s++) def = genBoss(5 + (s % 40), s * 7919 + 17, false, []);
    if (def && def.esp === esp) {
      G.minions = []; G.hz = []; G.eb = [];
      const b = creerBoss(def); initBoss(b); b.intro = 0; b.haut = 0; b.alpha = 1; b.spectral = 0;
      G.boss = b; G.def = def;
      const T = Math.ceil(b.r * 4.4), cv = document.createElement('canvas'); cv.width = cv.height = T;
      b.x = T / 2; b.y = T / 2;
      dessinerBoss(cv.getContext('2d'), b);
      if (noir) { const x = cv.getContext('2d'); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#2c2634'; x.fillRect(0, 0, T, T); }
      url = cv.toDataURL('image/png');
    }
  } catch (e) { url = null; }
  Object.assign(G, sauve);
  return (_portraits[cle] = url);
}
const _apercuSol = {};
function apercuRegion(rg) {
  if (_apercuSol[rg.id] !== undefined) return _apercuSol[rg.id];
  let url = null;
  const sv = { theme: Decor.theme, carte: Arene.carte, def: G.def };
  try {
    Decor.theme = rg.theme; Arene.carte = 'normale'; Arene.version++; G.def = G.def || { hue: 40 };
    const cv = document.createElement('canvas'); cv.width = 320; cv.height = 200;
    const x = cv.getContext('2d'); x.drawImage(texteSol(), AR.x + 200, AR.y + 120, 640, 400, 0, 0, 320, 200);
    url = cv.toDataURL('image/jpeg', .8);
  } catch (e) { url = null; }
  Decor.theme = sv.theme; Arene.carte = sv.carte; Arene.version++; G.def = sv.def;
  return (_apercuSol[rg.id] = url);
}
const icoGrand = (cle, cls) => `<span class="ico-grand ${cls || ''}">${icoSVG(icoCle(cle))}</span>`;

UI.codex = function (o) {
  o = o || 'especes';
  const cx = Save.d.codex;
  const onglets = [['especes', 'Bestiaire'], ['att', 'Attaques'], ['traits', 'Mutations'], ['regions', 'Régions'], ['cartes', 'Arènes'], ['invoc', 'Invocations'], ['arm', 'Arsenal'], ['legend', 'Légendaires']];
  let corps = '';
  const inconnu = (t, img) => `<div class="cx-carte inconnu">${img ? `<img class="cx-portrait" src="${img}" alt="">` : '<div class="cx-portrait vide">?</div>'}<div class="cx-txt"><b>???</b><p>${t}</p></div></div>`;
  if (o === 'especes') {
    const ids = ESP_ORDRE.concat(['chimere']).filter(e => ESPECES[e]);
    corps = `<p class="mini">${ids.filter(i => cx.especes[i]).length} / ${ids.length} colosses rencontrés.</p><div class="cx-grille">` + ids.map(i => {
      const e = ESPECES[i], v = cx.especes[i];
      if (!v) return inconnu('Pas encore rencontré.', portraitEspece(i, true));
      const h = e.hue != null ? e.hue : 40, n = etoiles(i);
      const sig = [...new Set(e.phases.flatMap(ph => ph.cycle).filter(id => ATK[id] && ATK[id].esp))];
      const phr = (PHRASES_ESP[i] || [])[0];
      return `<div class="cx-carte" style="--h:${h}">
        <img class="cx-portrait" src="${portraitEspece(i) || ''}" alt="">
        <div class="cx-txt"><b style="color:${hsl(h, 100, 70)}">${nomMaj(e.nom)}</b><span class="cx-et">${'★'.repeat(n)}${'☆'.repeat(4 - n)}</span>
        ${phr ? `<em class="cx-phrase">« ${phr} »</em>` : ''}
        <p>${e.meca}</p>
        <div class="cx-chips">${sig.map(id => `<span class="chip" style="--c:${(CAT_ATK[ATK[id].cat] || {}).col || '#ccc'}">${ATK[id].nom}</span>`).join('')}</div>
        <span class="cx-cpt">${v.tues} vaincu(s) · ${v.vus} rencontre(s)</span></div></div>`;
    }).join('') + '</div>';
  } else if (o === 'att') {
    const ids = Object.keys(ATK), vus = ids.filter(i => cx.att[i]).length;
    corps = `<p class="mini">${vus} / ${ids.length} attaques découvertes.</p>` + Object.entries(CAT_ATK).map(([cat, C]) => {
      const l = ids.filter(i => ATK[i].cat === cat); if (!l.length) return '';
      return `<h4 class="cx-cat" style="--c:${C.col}">${C.nom} <small>${l.filter(i => cx.att[i]).length} / ${l.length} · ${C.desc}</small></h4><div class="cx-att">` +
        l.map(i => cx.att[i] ? `<div class="cx-a" style="--c:${C.col}"><b>${ATK[i].nom}</b><span>${cx.att[i]}×</span><p>${ATK[i].conseil || ''}</p></div>` : `<div class="cx-a inconnu"><b>???</b></div>`).join('') + '</div>';
    }).join('');
  } else if (o === 'traits') {
    corps = '<div class="cx-grille petite">' + Object.keys(TRAITS).map(t => cx.traits[t] ? `<div class="cx-carte trait">${icoGrand('tr:' + t)}<div class="cx-txt"><b>${TRAITS[t].nom}</b><p>${TRAITS[t].desc}</p></div></div>` : `<div class="cx-carte inconnu">${icoGrand('tr:' + t, 'eteint')}<div class="cx-txt"><b>???</b><p>Pas encore rencontrée.</p></div></div>`).join('') + '</div>';
  } else if (o === 'regions') {
    const rec = Math.max(...Object.keys(DIFFS).map(k => (Save.d.prog[k] || {}).record || 0));
    corps = '<p class="mini">Tous les 5 salles, on change de région : son décor, ses musiques et son piège.</p><div class="cx-grille">' + REGIONS.map((r, i) => {
      const ok = rec > i * 5 || i === 0;
      return ok ? `<div class="cx-carte region"><img class="cx-sol" src="${apercuRegion(r) || ''}" alt=""><div class="cx-txt"><b>${romain(i + 1)} · ${r.nom}</b><p><span class="chip" style="--c:#ff8a5c">Piège : ${r.pnom}</span></p><p>${r.pdesc}</p><span class="cx-cpt">Salles ${i * 5 + 1} à ${i * 5 + 5}</span></div></div>`
        : `<div class="cx-carte inconnu region"><div class="cx-sol vide">?</div><div class="cx-txt"><b>Région ${romain(i + 1)}</b><p>Atteins la salle ${i * 5 + 1} pour la découvrir.</p></div></div>`;
    }).join('') + '</div>';
  } else if (o === 'cartes') {
    const cols = ['#ff8a5c', '#7fd0ff', '#ffcf6b', '#c58bff', '#7ddc6a', '#ff6a8a', '#5fd8ff', '#ffd27a', '#b48cff', '#9fe8c0'];
    corps = '<div class="cx-att">' + Object.keys(CARTES).map((t, i) => cx.cartes[t] ? `<div class="cx-a" style="--c:${cols[i % cols.length]}"><b>${CARTES[t].nom}</b><p>${CARTES[t].desc}</p></div>` : `<div class="cx-a inconnu"><b>???</b><p>Pas encore visitée.</p></div>`).join('') + '</div>';
  } else if (o === 'invoc') {
    corps = '<div class="cx-att">' + Object.keys(INVOC).map(t => cx.invoc[t] ? `<div class="cx-a" style="--c:#5fd8ff"><b>${INVOC[t].nom}</b><p>${INVOC[t].desc}</p></div>` : `<div class="cx-a inconnu"><b>???</b><p>Pas encore rencontrées.</p></div>`).join('') + '</div>';
  } else if (o === 'legend') {
    const L = Save.d.legendaires || {};
    corps = '<p class="mini">Parfois, rarement, un boss est LÉGENDAIRE : doré, plus coriace, il donne une apparence légendaire.</p><div class="cx-grille">' + ESP_ORDRE.map(e => L[e] ? `<div class="cx-carte legende"><img class="cx-portrait" src="${portraitEspece(e) || ''}" alt=""><div class="cx-txt"><b>✦ ${nomMaj(ESPECES[e].nom)} légendaire</b><p>Vaincu.</p></div></div>` : inconnu('Pas encore rencontré.', portraitEspece(e, true))).join('') + '</div>';
  } else {
    corps = ['p', 's', 't'].map(cat => `<h4 class="cx-cat" style="--c:${{ p: '#ffb46a', s: '#7ab8ff', t: '#7dffb0' }[cat]}">${CAT_NOM[cat]} <small>${ARS[cat].filter(a => cx.arm[cat + ':' + a.id]).length} / ${ARS[cat].length}</small></h4><div class="cx-arm">` +
      ARS[cat].map(a => cx.arm[cat + ':' + a.id] ? `<div class="cx-w" style="--c:${icoCouleur(cat + ':' + a.id)}">${icoGrand(a.ico)}<div><b>${a.nom}</b>${cat === 'p' && FAMILLES[FAMILLE[a.id]] ? `<span class="chip" style="--c:#c9a865">${FAMILLES[FAMILLE[a.id]].nom}</span>` : ''}<p>${a.desc}</p></div></div>` : `<div class="cx-w inconnu">${icoGrand(a.ico, 'eteint')}<div><b>???</b><p>Jamais tirée au sort.</p></div></div>`).join('') + '</div>').join('');
  }
  this.ecran('📖 Codex', `<div class="onglets">${onglets.map(([k, n]) => `<button data-a="codex" data-o="${k}" class="${k === o ? 'actif' : ''}">${n}</button>`).join('')}</div>${corps}`, 'large');
};
