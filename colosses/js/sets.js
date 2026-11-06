'use strict';
/* Colosses — sets d'apparences : chaque thème existe dans les 5 catégories (armure, cape, visière, traînée, aura),
   pour s'habiller entièrement aux couleurs d'un thème. Les pièces qui manquaient sont créées à partir de la palette
   et des styles du thème. La garde-robe est rangée par rareté et a un onglet « Sets ». */

// [id, nom, nom anglais, rareté, palette [clair, principal, sombre], motif de cape, style de traînée, style d'aura, [armure, cape, visière, traînée, aura] ('' = à créer)]
const SETS_DEF = [
  ['recrue', 'Recrue', 'Recruit', 'commun', ['#e6eef8', '#7d8fa3', '#232b36'], '', 'ruban', 'ondes', ['a_acier', 'c_pourpre', 'v_cyan', 't_aucune', 'r_aucune']],
  ['bronze', 'Bronze', 'Bronze', 'commun', ['#ffe2b8', '#b07a3c', '#3a2414'], '', 'perles', 'bulles', ['a_bronze', 'c4_ocre', 'v_ambre', 't_poussiere', 'r4_poussiere']],
  ['foret', 'Forêt', 'Forest', 'commun', ['#dfffe8', '#4fa07a', '#143224'], '', 'bulles', 'feuilles', ['a_jade', 'c_foret', 'v_vert', 't_feuilles', 'r4_feuilles']],
  ['ossuaire', 'Ossuaire', 'Ossuary', 'commun', ['#fffaf0', '#cfc4a8', '#4a4232'], '', 'plumes', 'bulles', ['a_os', '', '', '', '']],
  ['rouille', 'Rouille', 'Rust', 'commun', ['#f0c8a0', '#9a5a32', '#2e180c'], '', 'fumee', 'braises', ['a_rouille', '', 'v4_orange', '', 'r4_braises']],
  ['cendre', 'Cendre', 'Cinder', 'commun', ['#c8d0dc', '#4c5462', '#14181e'], '', 'fumee', 'ondes', ['a_ardoise', 'c_cendree', '', 't_cendres', 'r_brume']],
  ['cuivre', 'Cuivre', 'Copper', 'commun', ['#ffe0c0', '#c06a3a', '#3a1a0a'], '', 'perles', 'ondes', ['a4_cuivre', 'c4_corail', 'v_rouge', '', '']],
  ['ivoire', 'Ivoire', 'Ivory', 'commun', ['#fffdf2', '#e0d6b8', '#5a5040'], '', 'plumes', 'bulles', ['a4_ivoire', 'c4_brume', 'v4_argent', '', '']],
  ['mousse', 'Mousse', 'Moss', 'commun', ['#e8ffd8', '#8ac04a', '#1a2a0a'], '', 'bulles', 'spirale', ['a4_mousse', 'c4_olive', 'v4_menthe', '', '']],
  ['sable', 'Sable', 'Sand', 'commun', ['#fff4d8', '#e0c080', '#4a3418'], '', 'perles', 'bulles', ['a4_gres', 'c_sable', 'v4_citron', 't4_sable', '']],
  ['marine', 'Marine', 'Navy', 'commun', ['#d8e4f4', '#4a6aa0', '#10182a'], '', 'fumee', 'ondes', ['a4_ardoise', 'c4_marine', 'v4_ciel', 't4_vapeur', 'r4_ondes']],
  ['lilas', 'Lilas', 'Lilac', 'commun', ['#f6e8ff', '#c0a0e8', '#2a1a40'], '', 'ruban', 'bulles', ['a4_lilas', '', 'v4_lavande', 't4_soie', '']],
  ['fer', 'Fer', 'Iron', 'commun', ['#c8c8d0', '#8a94a4', '#0a0a10'], '', 'fumee', 'ondes', ['a4_fer', 'c4_gris', '', 't4_encre', '']],
  ['terre', 'Terre cuite', 'Terracotta', 'commun', ['#ffd8c0', '#d0704a', '#3a1408'], '', 'fumee', 'braises', ['a4_terre', 'c4_vin', 'v_rose', '', '']],
  ['nuit', 'Nuit', 'Night', 'commun', ['#c8d0f0', '#4a6aff', '#060a1a'], '', 'bulles', 'ondes', ['', 'c_nuit', '', 't4_bulles', '']],
  ['pixel', 'Pixel', 'Pixel', 'commun', ['#d8ffe0', '#2ad07a', '#062a14'], '', 'pixels', 'hexa', ['', '', '', 't4_pixels', '']],
  ['givre', 'Givre', 'Frost', 'rare', ['#ffffff', '#8fd0f0', '#24506a'], 'etoiles', 'eclats', 'flocon', ['a_givre', 'c_givree', 'v_glace', 't_givre', 'r_givre']],
  ['sang', 'Sang', 'Blood', 'rare', ['#ffc2c8', '#d02040', '#2a0610'], 'liseré', 'fumee', 'runes', ['a_sang', 'c_sangroyal', 'v_sang', 't_sang', 'r_sang']],
  ['venin', 'Venin', 'Venom', 'rare', ['#e8ffd0', '#7ae04a', '#0a2a04'], 'liseré', 'bulles', 'bulles', ['', 'c_venin', 'v_toxique', '', 'r_venin']],
  ['braise', 'Braise', 'Ember', 'rare', ['#ffe0b0', '#ff6a1a', '#3a0800'], 'flammes', 'flammes', 'braises', ['', 'c_braise', 'v4_braise', 't_braises', '']],
  ['obsidienne', 'Obsidienne', 'Obsidian', 'rare', ['#9a8fb8', '#6a5a9a', '#08060e'], 'liseré', 'fumee', 'runes', ['a_obsidienne', '', 'v_violet', '', '']],
  ['corail', 'Corail', 'Coral', 'rare', ['#ffd8cc', '#ff7a5a', '#4a1208'], 'liseré', 'coeurs', 'bulles', ['a_corail', '', 'v4_magenta', 't4_coeurs', '']],
  ['saphir', 'Saphir', 'Sapphire', 'rare', ['#d8e8ff', '#5a8aff', '#081838'], 'etoiles', 'perles', 'hexa', ['a_saphir', 'c_azur', 'v4_cobalt', '', 'r4_hexa']],
  ['foudre', 'Foudre', 'Thunder', 'rare', ['#ffffff', '#fff36a', '#3a4250'], 'etoiles', 'foudre', 'eclairs', ['a4_argent', 'c4_tempete', '', 't_foudre', 'r4_eclairs']],
  ['turquoise', 'Turquoise', 'Turquoise', 'rare', ['#e0fffa', '#2ac0b0', '#063a36'], 'liseré', 'eclats', 'ondes', ['a4_turquoise', 'c4_jade', 'v4_jade', '', '']],
  ['rubis', 'Rubis', 'Ruby', 'rare', ['#ffd0d8', '#ff3a5a', '#3a0410'], 'liseré', 'eclats', 'cristaux', ['a4_rubis', '', '', '', '']],
  ['ambre', 'Ambre', 'Amber', 'rare', ['#fff0c0', '#ffb03a', '#4a2a04'], 'flammes', 'flammes', 'braises', ['a4_ambre', 'c4_couchant', 'v_or', 't4_flammes', '']],
  ['ocean', 'Océan', 'Ocean', 'rare', ['#d0f0ff', '#3ab0ff', '#04203a'], 'etoiles', 'bulles', 'ondes', ['a4_ocean', 'c4_glacier', '', '', 'r_cyan']],
  ['poison', 'Poison', 'Poison', 'rare', ['#f0ffd0', '#c0ff3a', '#1a3a00'], 'liseré', 'fumee', 'bulles', ['', 'c4_poison', '', '', '']],
  ['melodie', 'Mélodie', 'Melody', 'rare', ['#f0e8ff', '#bfa8ff', '#2a1a4a'], 'etoiles', 'notes', 'orbites', ['', '', '', 't4_notes', 'r4_orbites']],
  ['plume', 'Plume', 'Feather', 'rare', ['#ffffff', '#e8eef8', '#4a5060'], 'liseré', 'plumes', 'spirale', ['', '', '', 't4_plumes', '']],
  ['cristal', 'Cristal', 'Crystal', 'rare', ['#f4e8ff', '#c080ff', '#2a0a4a'], 'etoiles', 'eclats', 'spirale', ['', '', '', 't4_cristaux', 'r4_spirale']],
  ['runes', 'Runes', 'Runes', 'epique', ['#e0fffa', '#7affe0', '#04201a'], 'liseré', 'runes', 'runes', ['', '', '', 't4_runes', 'r4_runes']],
  ['or', 'Or', 'Gold', 'epique', ['#fff6c8', '#ffd86b', '#5a3a08'], 'liseré', 'perles', 'cristaux', ['a_or', 'c_royale', '', '', '']],
  ['neant', 'Néant', 'Void', 'epique', ['#e0c8ff', '#a070ff', '#10041e'], 'etoiles', 'double', 'spirale', ['a_neant', '', 'v4_neant', 't_ombre', '']],
  ['fumee', 'Fumée noire', 'Black Smoke', 'epique', ['#e0dcd8', '#8a827c', '#0c0a0a'], 'flammes', 'fumee', 'braises', ['a_cendre', '', '', '', '']],
  ['emeraude', 'Émeraude', 'Emerald', 'epique', ['#e8fff0', '#3aff8a', '#042a16'], 'liseré', 'eclats', 'hexa', ['a_emeraude', '', '', '', '']],
  ['aurore', 'Aurore', 'Aurora', 'epique', ['#e0fff4', '#3affc0', '#4a1a7a'], 'etoiles', 'double', 'spirale', ['', 'c_aurore', '', 't_aurore', '']],
  ['nebuleuse', 'Nébuleuse', 'Nebula', 'epique', ['#f0d8ff', '#b070ff', '#0a0430'], 'etoiles', 'galaxie', 'galaxie', ['', 'c_nebuleuse', '', '', '']],
  ['jadedragon', 'Dragon de jade', 'Jade Dragon', 'epique', ['#d8ffd0', '#4ad06a', '#3a0a0a'], 'flammes', 'flammes', 'flammes', ['a4_dragon', '', '', '', '']],
  ['astral', 'Astral', 'Astral', 'epique', ['#ffffff', '#7a6aff', '#0a0430'], 'etoiles', 'double', 'cristaux', ['a4_astral', 'c4_abysse', 'v4_nova', 't4_helice', 'r4_cristaux']],
  ['volcan', 'Volcan', 'Volcano', 'epique', ['#fff0a0', '#ff4a10', '#1a0400'], 'flammes', 'flammes', 'flammes', ['a4_magma', 'c4_volcan', '', '', 'r_feu']],
  ['imperial', 'Impérial', 'Imperial', 'epique', ['#fff0c0', '#d0a030', '#3a0a0a'], 'liseré', 'ruban', 'runes', ['', 'c4_imperiale', '', '', '']],
  ['orage', 'Orage violet', 'Violet Storm', 'epique', ['#f0e0ff', '#d08aff', '#2a0a4a'], 'etoiles', 'foudre', 'eclairs', ['', '', '', 't4_eclair', '']],
  ['lotus', 'Lotus', 'Lotus', 'epique', ['#fff0f6', '#ff9ad0', '#7a2a5a'], 'liseré', 'coeurs', 'fleur', ['', '', '', 't_petales', 'r4_lotus']],
  ['flammebleue', 'Flamme bleue', 'Blue Flame', 'epique', ['#e0f0ff', '#3a8aff', '#04103a'], 'flammes', 'flammes', 'flammes', ['', '', '', '', 'r4_flammesbleues']],
  ['lumiere', 'Lumière pure', 'Pure Light', 'epique', ['#ffffff', '#fffbe0', '#8a8aa0'], 'liseré', 'ruban', 'ondes', ['', '', 'v_blanc', '', '']],
  ['celeste', 'Voile céleste', 'Celestial Veil', 'mythique', ['#e8f8ff', '#7fd8ff', '#2a0a5a'], 'etoiles', 'galaxie', 'orbites', ['', 'c_voile', '', 't_comete', 'r_astral']],
  ['eclipse', 'Éclipse', 'Eclipse', 'mythique', ['#fff8e0', '#ff4dd2', '#14001a'], 'etoiles', 'double', 'orbites', ['a_eclipse', '', 'v_prisme', '', '']],
  ['obsdoree', 'Obsidienne dorée', 'Golden Obsidian', 'mythique', ['#fff1b0', '#c9a865', '#050403'], 'liseré', 'ruban', 'cristaux', ['a_obsidienne_doree', '', '', '', '']],
  ['brasier', 'Brasier éternel', 'Eternal Blaze', 'mythique', ['#fff06a', '#ff3a00', '#1a0000'], 'flammes', 'flammes', 'flammes', ['', 'c_brasier', '', '', '']],
  ['prisme', 'Prisme', 'Prism', 'mythique', ['#ffffff', '#ff7ae0', '#3a8aff'], 'etoiles', 'arcenciel', 'galaxie', ['a4_prisme', 'c4_cosmos', 'v4_arcenciel', 't4_arcenciel', 'r4_galaxie']],
  ['spectre', 'Spectre', 'Wraith', 'mythique', ['#e0fff8', '#40e0c0', '#000a0a'], 'etoiles', 'fumee', 'spirale', ['a4_spectre', '', '', '', '']],
  ['dragon', 'Ailes de dragon', 'Dragon Wings', 'legendaire', ['#ffe0a0', '#ffb43d', '#5a0a00'], 'flammes', 'flammes', 'soleil', ['', 'c_dragon', '', '', '']],
  ['phenix', 'Phénix', 'Phoenix', 'legendaire', ['#fff0a0', '#ffd04a', '#a01800'], 'flammes', 'plumes', 'soleil', ['', 'c_phenix', '', '', '']],
  ['soleilnoir', 'Soleil noir', 'Black Sun', 'legendaire', ['#fff0a0', '#ff7a1a', '#1a0400'], 'flammes', 'galaxie', 'soleil', ['a_soleil', '', 'v_soleil', '', 'r_couronne']],
  ['aube', 'Aube', 'Dawn', 'legendaire', ['#fffaf0', '#ffc8a0', '#a04a6a'], 'etoiles', 'galaxie', 'soleil', ['a_aube', '', '', 't_etoiles', 'r_divine']],
  ['divin', 'Colosse céleste', 'Celestial Colossus', 'legendaire', ['#ffffff', '#a0e8ff', '#ffd86b'], 'flammes', 'galaxie', 'soleil', ['a4_celeste', 'c4_eclipse', 'v4_oeil', 't4_galaxie', 'r4_soleil']],
  ['halloween', 'Nuit des citrouilles', 'Night of Pumpkins', 'saison', ['#ffe0a8', '#ff8a1a', '#2a0c00'], 'etoiles', 'flammes', 'braises', ['a_citrouille', 'c_sorciere', '', 't_chauvesouris', 'r_lanterne'], 'halloween'],
  ['hiver', 'Fêtes du givre', 'Frost Festival', 'saison', ['#ffffff', '#ff2a3a', '#1a3a5a'], 'etoiles', 'eclats', 'flocon', ['a_givrefete', 'c_flocons', '', 't_neige', 'r_boreale'], 'hiver'],
  ['printemps', 'Éveil des fleurs', 'Blossom Awakening', 'saison', ['#fff0f6', '#ffb0d8', '#5a1a3a'], 'liseré', 'coeurs', 'fleur', ['a_sakura', 'c_floraison', '', 't_pollen', 'r_eclosion'], 'printemps'],
  ['ete', 'Feux de l\'été', 'Summer Fires', 'saison', ['#fff8d0', '#ffd24d', '#5a2a00'], 'etoiles', 'perles', 'soleil', ['a_soleilete', 'c_lagon', '', 't_lucioles', 'r_canicule'], 'ete']
];
STYLE_AURA.flocon = function (c, x, y, t, s) { const a = s.k[0]; lueurPt(c, alphaCol(a, .35), 44, x, y); c.strokeStyle = alphaCol(a, .85); c.lineWidth = 1.6; flocon(c, x, y, 32, t * .4); };
const ORDRE_RAR = ['commun', 'rare', 'epique', 'mythique', 'legendaire', 'saison'];
const SETS = [], SET_DE = {}, SETS_EN = {};
for (const [id, nom, en, rar, pal, motif, tSt, rSt, pieces, saison] of SETS_DEF) {
  const set = { id, nom, rar, pieces: {}, saison };
  ['armure', 'cape', 'visiere', 'trainee', 'aura'].forEach((slot, i) => {
    let sid = pieces[i];
    if (!sid || !skin(sid)) {
      sid = 'st_' + id + '_' + slot;
      const o = { id: sid, slot, nom, rar, gen: true };
      if (saison) o.saison = saison;
      if (slot === 'armure') o.c = pal.slice();
      else if (slot === 'cape') { o.c = [pal[1], pal[2]]; if (motif) o.motif = motif; }
      else if (slot === 'visiere') o.col = pal[1];
      else if (slot === 'trainee') Object.assign(o, { style: tSt, k: [pal[1], pal[0]], col: pal[1], add: true, gros: rar !== 'commun' });
      else Object.assign(o, { style: rSt, k: [pal[1], pal[0]], col: alphaCol(pal[1], .4) });
      SKINS.push(o); SKINS_EN4[sid] = en;
    }
    set.pieces[slot] = sid; SET_DE[sid] = id;
  });
  SETS.push(set); SETS_EN[id] = en;
}
for (const s of SKINS) {
  if (s.gen && s.slot === 'trainee' && STYLE_TRAINEE[s.style]) TRAINEES[s.id] = (c, P) => STYLE_TRAINEE[s.style](c, P, s);
  if (s.gen && s.slot === 'aura' && STYLE_AURA[s.style]) AURAS[s.id] = (c, x, y, t) => STYLE_AURA[s.style](c, x, y, t, s);
}
// 24 apparences par catégorie : on garde 24 sets (5 communs, 6 rares, 4 épiques, 2 mythiques, 3 légendaires, 4 de saison).
// Ce que le joueur avait déjà sur une apparence retirée lui est rendu en cristaux.
const SETS_GARDES = ['recrue', 'bronze', 'foret', 'cendre', 'marine', 'givre', 'sang', 'venin', 'braise', 'foudre', 'saphir', 'neant', 'volcan', 'lotus', 'astral', 'prisme', 'celeste', 'dragon', 'phenix', 'divin', 'halloween', 'hiver', 'printemps', 'ete'];
{
  const S0 = Save.d && Save.d.skins; let rendu = 0;
  for (const st of SETS.slice()) {
    if (SETS_GARDES.includes(st.id)) continue;
    for (const [slot, id] of Object.entries(st.pieces)) {
      const k = SKINS.findIndex(x => x.id === id); if (k < 0) continue;
      const sk = SKINS[k];
      if (S0 && S0.frag && S0.frag[id] > 0) { rendu += Math.min(S0.frag[id], RARETES[sk.rar].frags) * (PRIX_FRAG[sk.rar] || 12); delete S0.frag[id]; }
      if (S0 && S0.equip && S0.equip[slot] === id) delete S0.equip[slot];
      SKINS.splice(k, 1); delete SET_DE[id];
    }
    SETS.splice(SETS.indexOf(st), 1);
  }
  if (rendu) { forgeSave().eclats += rendu; Save.d.cristauxRendus = (Save.d.cristauxRendus || 0) + rendu; Save.write(); }
}
// plus d'apparences de visière ni de curseur : la catégorie disparaît, les fragments sont remboursés
RARETES.saison.frags = 6; RARETES.saison.poids = 8;
{
  const S0 = Save.d && Save.d.skins; let rendu = 0;
  try { if (S0 && S0.frag && !Save.d.migSaison) { for (const s of SKINS) if (s.saison && S0.frag[s.id] >= 1) S0.frag[s.id] = 6; Save.d.migSaison = 1; } } catch (e) { }
  for (const sk of SKINS.filter(x => x.slot === 'visiere' && !x.base)) {
    if (S0 && S0.frag && S0.frag[sk.id] > 0) { rendu += Math.min(S0.frag[sk.id], RARETES[sk.rar].frags) * PRIX_HASARD; delete S0.frag[sk.id]; }
    SKINS.splice(SKINS.indexOf(sk), 1); delete SET_DE[sk.id];
  }
  if (S0 && S0.equip) delete S0.equip.visiere;
  delete SLOTS.visiere;
  for (const st of SETS) delete st.pieces.visiere;
  if (rendu) forgeSave().eclats += rendu;
  if (S0) Save.write();
}
function setDe(id) { return SETS.find(x => x.id === SET_DE[id]); }
function nomSet(st) { const L = typeof Langue !== 'undefined' && Langue.en; return L && SETS_EN[st.id] ? SETS_EN[st.id] : st.nom; }
function setVisible(st) { return !st.saison || saisonOk(st.saison) || Object.values(st.pieces).some(id => possede(id)); }

// ---------- garde-robe : rangée par rareté, nom du set sur chaque carte, onglet « Sets » ----------
const _gardeSets = UI.garderobe;
UI.garderobe = function (slot) {
  if (slot === 'sets') return this.gardeSets();
  const r = _gardeSets.apply(this, arguments);
  try {
    const grille = this.el.querySelector('.grille-skins');
    if (grille) {
      const cartes = [...grille.children];
      const rang = el => { const s = skin(el.dataset.k); return s ? ORDRE_RAR.indexOf(s.rar) * 1000 + (s.base ? -500 : 0) + SETS.indexOf(setDe(s.id)) : 99999; };
      cartes.sort((a, b) => rang(a) - rang(b)).forEach(el => grille.appendChild(el));
      for (const el of cartes) { const st = setDe(el.dataset.k); if (st) { const t = document.createElement('span'); t.className = 'set-tag'; t.textContent = 'Set ' + nomSet(st); el.appendChild(t); } }
    }
  } catch (e) { console.warn('sets', e); }
  return r;
};
UI.gardeSets = function () {
  const S = skinsSave();
  const onglets = '<div class="onglets">' + Object.entries(SLOTS).map(([k, n]) => `<button data-a="garderobe" data-o="${k}">${n}</button>`).join('') + '<button class="actif" data-a="garderobe" data-o="sets">★ Sets</button></div>';
  const liste = SETS.filter(setVisible).sort((a, b) => ORDRE_RAR.indexOf(a.rar) - ORDRE_RAR.indexOf(b.rar)).map(st => {
    const ids = Object.values(st.pieces), n = ids.filter(id => possede(id)).length, porte = Object.entries(st.pieces).every(([sl, id]) => S.equip[sl] === id), R0 = RARETES[st.rar];
    const pastilles = Object.entries(st.pieces).map(([sl, id]) => { const s = skin(id), col = s.c ? `linear-gradient(135deg,${s.c.join(',')})` : (s.col || '#333'); return `<span class="set-p ${possede(id) ? '' : 'manque'}" title="${SLOTS[sl]} : ${s.nom}" style="background:${col}"></span>`; }).join('');
    return `<div class="set-l" style="--rc:${R0.col}"><b>${nomSet(st)}</b><span class="rar">${R0.nom}</span><span class="set-ps">${pastilles}</span><span class="set-n">${n} / 5</span>${porte ? '<span class="set-n">✔ porté</span>' : `<button data-a="setEquiper" data-k="${st.id}" ${n ? '' : 'disabled'}>${n === 5 ? 'Porter le set' : 'Porter les pièces obtenues'}</button>`}</div>`;
  }).join('');
  this.ecran('👕 Garde-robe', onglets + `<p class="mini">Chaque thème existe en armure, cape, visière, traînée et aura : porte un set complet pour être aux couleurs d'un thème. Les pièces s'achètent une par une dans leur onglet.</p><div class="sets">${liste}</div>`, 'large');
};
const _actSets = UI.action;
UI.action = function (a, btn) {
  if (a === 'setEquiper') { const st = SETS.find(x => x.id === btn.dataset.k), S = skinsSave(); if (st) { for (const [sl, id] of Object.entries(st.pieces)) if (possede(id)) S.equip[sl] = id; Save.write(); Son.play('ramasse'); } this.gardeSets(); return; }
  return _actSets.call(this, a, btn);
};
