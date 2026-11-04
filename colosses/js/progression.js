'use strict';
/* Colosses — reliques (bonus d'un palier), succès, maîtrise des espèces (étoiles) et statistiques. */

// ---------- Reliques : on en choisit une après chaque boss, elles durent jusqu'au méga boss ----------
// Chacune ÉCHANGE quelque chose contre autre chose : elles changent la façon de jouer, jamais la puissance totale.
const RELIQUES = {
  vampire: { nom: 'Vampirisme', ico: '🩸', desc: '+1 PV tous les 250 dégâts', malus: '−25 PV max' },
  colere: { nom: 'Colère', ico: '😡', desc: '+30 % de dégâts sous 40 % de vie', malus: '−15 % au-dessus' },
  precision: { nom: 'Œil du chasseur', ico: '🎯', desc: '+12 % de coups critiques', malus: '−15 % de cadence' },
  frenesie: { nom: 'Frénésie', ico: '⚡', desc: '+15 % de cadence', malus: '−15 % de dégâts' },
  batterie: { nom: 'Batterie', ico: '🔋', desc: 'Énergie 40 % plus vite', malus: 'arme −12 % de dégâts' },
  economie: { nom: 'Économie', ico: '💠', desc: 'Spéciales −25 % de coût', malus: 'rechargement +35 %' },
  plumes: { nom: 'Plumes', ico: '🪶', desc: '+12 % de vitesse de course', malus: '−15 PV max' },
  second: { nom: 'Second souffle', ico: '💖', desc: 'Une fois par salle, un coup mortel te laisse à 1 PV', malus: '−25 PV max' },
  egide: { nom: 'Égide', ico: '🛡', desc: 'Chaque salle commence avec un bouclier', malus: 'talents +30 % plus lents' },
  reserve: { nom: 'Réserve', ico: '➕', desc: '+1 charge de talent', malus: 'talents +45 % plus lents' },
  assassin: { nom: 'Assassin', ico: '🗡', desc: '+40 % dans le dos du boss', malus: '−20 % de face' },
  chasseur: { nom: 'Élan', ico: '🏹', desc: '+18 % de dégâts en courant', malus: '−20 % à l\'arrêt' },
  reflexes: { nom: 'Réflexes', ico: '💨', desc: 'Talents 25 % plus vite', malus: '−10 % de dégâts' },
  opportun: { nom: 'Opportuniste', ico: '👁', desc: '+50 % quand le boss est ouvert ou étourdi', malus: '−15 % le reste du temps' },
  epines: { nom: 'Épines', ico: '🌵', desc: 'Chaque coup reçu inflige 200 dégâts au boss', malus: 'coups reçus +20 %' },
  regen: { nom: 'Régénération', ico: '💚', desc: '+1 PV toutes les 3 s', malus: '−40 PV max' },
  verre: { nom: 'Canon de verre', ico: '🔮', desc: '+25 % de dégâts', malus: '−35 PV max' },
  brise: { nom: 'Brise-phase', ico: '💥', desc: '+20 PV à chaque nouvelle phase', malus: '−20 PV max' },
  tempete: { nom: 'Tempête', ico: '🌩', desc: 'Un éclair frappe le boss toutes les 6 s', malus: 'arme −12 % de dégâts' },
  aimant: { nom: 'Champ de force', ico: '🧲', desc: 'Les balles ennemies ralentissent près de toi', malus: '−12 % de vitesse de course' }
};
const MALUS_PV = { vampire: 25, plumes: 15, second: 25, regen: 40, verre: 35, brise: 20 };
function malusPV() { let n = 0; try { for (const k of G.reliques()) n += MALUS_PV[k] || 0; } catch (e) { } return n; }
function offrirReliques(r) {
  const deja = G.reliques();
  const dispo = Object.keys(RELIQUES).filter(k => !deja.includes(k));
  return (r || R).shuffle(dispo.slice()).slice(0, 2);
}

// ---------- Succès ----------
const SUCCES = {
  premier: { nom: 'Premier sang', ico: '🩸', desc: 'Vaincre un boss' },
  dix: { nom: 'Chasseur', ico: '⚔', desc: 'Vaincre 10 boss', obj: () => Save.d.stats.boss / 10 },
  cent: { nom: 'Fléau des colosses', ico: '👑', desc: 'Vaincre 100 boss', obj: () => Save.d.stats.boss / 100 },
  mille: { nom: 'Légende', ico: '🌟', desc: 'Vaincre 1000 boss', obj: () => Save.d.stats.boss / 1000 },
  mega1: { nom: 'Tueur de géants', ico: '★', desc: 'Vaincre un méga boss' },
  mega10: { nom: 'Briseur de paliers', ico: '✪', desc: 'Vaincre 10 méga boss', obj: () => Save.d.stats.mega / 10 },
  intouchable: { nom: 'Intouchable', ico: '✨', desc: 'Vaincre un boss sans être touché' },
  eclair: { nom: 'Éclair', ico: '⏱', desc: 'Vaincre un boss en moins de 45 s' },
  fil: { nom: 'Sur le fil', ico: '❤', desc: 'Vaincre un boss avec moins de 10 PV' },
  frugal: { nom: 'Ascète', ico: '🧘', desc: 'Vaincre un boss sans spéciale ni talent' },
  revanche: { nom: 'Obstiné', ico: '🔁', desc: 'Vaincre un boss après 5 essais ou plus' },
  cauchemar: { nom: 'Cauchemar éveillé', ico: '☠', desc: 'Vaincre un boss en Cauchemar' },
  cauchMega: { nom: 'Roi du cauchemar', ico: '💀', desc: 'Vaincre un méga boss en Cauchemar' },
  palier5: { nom: 'Ascension', ico: '⛰', desc: 'Atteindre le palier 5', obj: () => maxPalier() / 5 },
  palier10: { nom: 'Sommet', ico: '🏔', desc: 'Atteindre le palier 10', obj: () => maxPalier() / 10 },
  palier20: { nom: 'Au-delà', ico: '🌌', desc: 'Atteindre le palier 20', obj: () => maxPalier() / 20 },
  parade10: { nom: 'Bretteur', ico: '⛨', desc: 'Réussir 10 parades', obj: () => Save.d.stats.parades / 10 },
  parade100: { nom: 'Mur vivant', ico: '🛡', desc: 'Réussir 100 parades', obj: () => Save.d.stats.parades / 100 },
  bestiaire: { nom: 'Naturaliste', ico: '📖', desc: 'Rencontrer toutes les espèces', obj: () => Object.keys(Save.d.codex.especes).length / (ESP_ORDRE.length + 1) },
  maitre: { nom: 'Maître', ico: '⭐', desc: '3 étoiles sur une espèce' },
  grandMaitre: { nom: 'Grand maître', ico: '🌠', desc: '3 étoiles sur toutes les espèces', obj: () => ESP_ORDRE.filter(e => etoiles(e) >= 3).length / ESP_ORDRE.length },
  arsenal: { nom: 'Collectionneur', ico: '🧰', desc: 'Utiliser 30 armes principales', obj: () => PRIM.filter(a => Save.d.codex.arm['p:' + a.id]).length / 30 },
  reliques5: { nom: 'Reliquaire', ico: '🏺', desc: 'Porter 5 reliques à la fois' },
  defiJour: { nom: 'Défi relevé', ico: '☀', desc: 'Réussir un défi du jour' },
  defiSemaine: { nom: 'Semaine parfaite', ico: '🗓', desc: 'Réussir un défi de la semaine' },
  oeuf: { nom: 'Omelette', ico: '🥚', desc: 'Casser l\'œuf du Phénix à temps' },
  carapace: { nom: 'Casse-noix', ico: '🔨', desc: 'Briser une carapace' },
  legende: { nom: 'Chasseur de légendes', ico: '✦', desc: 'Vaincre un boss légendaire' },
  abysses10: { nom: 'Plongée', ico: '🌌', desc: 'Atteindre la profondeur 10 des Abysses' },
  marathon: { nom: 'Marathon', ico: '⌛', desc: 'Jouer 10 heures', obj: () => Save.d.stats.temps / 36000 }
};
function maxPalier() { return Math.max(...Object.values(Save.d.prog).map(p => p.palier)); }
function succes(id) {
  const s = Save.d.succes = Save.d.succes || {};
  if (s[id] || !SUCCES[id]) return;
  s[id] = Date.now(); Save.write();
}
function verifierSucces() {
  for (const [id, x] of Object.entries(SUCCES)) if (x.obj && x.obj() >= 1) succes(id);
}

// ---------- Maîtrise des espèces : ★ vaincue · ★★ sans être touché ou en moins d'une minute · ★★★ en Cauchemar ----------
function etoiles(esp) { const m = (Save.d.maitrise || {})[esp]; return m ? (m.v ? 1 : 0) + (m.pur ? 1 : 0) + (m.cauch ? 1 : 0) : 0; }
function noterMaitrise(esp, pur, cauch) {
  const M = Save.d.maitrise = Save.d.maitrise || {}, m = M[esp] = M[esp] || {};
  const avant = etoiles(esp);
  m.v = 1; if (pur) m.pur = 1; if (cauch) m.cauch = 1;
  const apres = etoiles(esp);
  if (apres > avant) G.annonce('★'.repeat(apres) + ' Maîtrise : ' + ESPECES[esp].nom, '#ffd86b', 2.2);
  if (apres >= 3) succes('maitre');
}

// ---------- Statistiques détaillées ----------
function statPlus(cle, sous, n) {
  const s = Save.d.stats;
  if (sous === undefined) { s[cle] = (s[cle] || 0) + (n || 1); return; }
  const o = s[cle] = s[cle] || {}; o[sous] = (o[sous] || 0) + (n || 1);
}

// ---------- Apparences : fragments à collectionner (aucun bonus de puissance) ----------
const RARETES = { commun: { nom: 'Commun', col: '#b8c4d0', frags: 3, poids: 60 }, rare: { nom: 'Rare', col: '#5aa8ff', frags: 5, poids: 30 }, epique: { nom: 'Épique', col: '#c06bff', frags: 8, poids: 10 }, legendaire: { nom: 'Légendaire', col: '#ffb43d', frags: 1, poids: 0 } };
const SLOTS = { armure: 'Armure', cape: 'Cape', visiere: 'Visière', trainee: 'Traînée', aura: 'Aura' };
const SKINS = [
  { id: 'a_acier', slot: 'armure', nom: 'Acier', rar: 'commun', c: ['#e6eef8', '#7d8fa3', '#232b36'], base: true },
  { id: 'a_bronze', slot: 'armure', nom: 'Bronze', rar: 'commun', c: ['#ffe2b8', '#b07a3c', '#3a2414'] },
  { id: 'a_jade', slot: 'armure', nom: 'Jade', rar: 'commun', c: ['#dfffe8', '#4fa07a', '#143224'] },
  { id: 'a_obsidienne', slot: 'armure', nom: 'Obsidienne', rar: 'rare', c: ['#9a8fb8', '#2c2440', '#08060e'] },
  { id: 'a_sang', slot: 'armure', nom: 'Sang', rar: 'rare', c: ['#ffc2c8', '#a02434', '#2a0610'] },
  { id: 'a_givre', slot: 'armure', nom: 'Givre', rar: 'rare', c: ['#ffffff', '#8fd0f0', '#24506a'] },
  { id: 'a_or', slot: 'armure', nom: 'Or', rar: 'epique', c: ['#fff6c8', '#e0a830', '#5a3a08'] },
  { id: 'a_neant', slot: 'armure', nom: 'Néant', rar: 'epique', c: ['#e0c8ff', '#5a2aa0', '#10041e'] },
  { id: 'a_soleil', slot: 'armure', nom: 'Soleil noir', rar: 'legendaire', c: ['#fff0a0', '#ff7a1a', '#1a0400'] },
  { id: 'c_pourpre', slot: 'cape', nom: 'Pourpre', rar: 'commun', c: ['#8a1430', '#2a0410'], base: true },
  { id: 'c_nuit', slot: 'cape', nom: 'Nuit', rar: 'commun', c: ['#1e2a5a', '#060a1a'] },
  { id: 'c_foret', slot: 'cape', nom: 'Forêt', rar: 'commun', c: ['#2a6a34', '#0a1a0c'] },
  { id: 'c_braise', slot: 'cape', nom: 'Braise', rar: 'rare', c: ['#ff6a1a', '#3a0800'], motif: 'flammes' },
  { id: 'c_azur', slot: 'cape', nom: 'Azur étoilé', rar: 'rare', c: ['#2a7aff', '#08143a'], motif: 'etoiles' },
  { id: 'c_royale', slot: 'cape', nom: 'Royale', rar: 'epique', c: ['#7a1aa0', '#1a0428'], motif: 'liseré' },
  { id: 'c_aurore', slot: 'cape', nom: 'Aurore', rar: 'epique', c: ['#3affc0', '#c040ff'], motif: 'etoiles' },
  { id: 'c_dragon', slot: 'cape', nom: 'Ailes de dragon', rar: 'legendaire', c: ['#ffb43d', '#5a0a00'], motif: 'flammes' },
  { id: 'v_cyan', slot: 'visiere', nom: 'Cyan', rar: 'commun', col: '#34d6ff', base: true },
  { id: 'v_rouge', slot: 'visiere', nom: 'Rouge', rar: 'commun', col: '#ff3a4a' },
  { id: 'v_vert', slot: 'visiere', nom: 'Émeraude', rar: 'commun', col: '#3aff8a' },
  { id: 'v_or', slot: 'visiere', nom: 'Doré', rar: 'rare', col: '#ffd24d' },
  { id: 'v_violet', slot: 'visiere', nom: 'Améthyste', rar: 'rare', col: '#c06bff' },
  { id: 'v_blanc', slot: 'visiere', nom: 'Lumière pure', rar: 'epique', col: '#ffffff' },
  { id: 't_aucune', slot: 'trainee', nom: 'Aucune', rar: 'commun', base: true },
  { id: 't_poussiere', slot: 'trainee', nom: 'Poussière', rar: 'commun', col: 'rgba(200,190,170,.6)' },
  { id: 't_braises', slot: 'trainee', nom: 'Braises', rar: 'rare', col: '#ff8a3c', add: true },
  { id: 't_givre', slot: 'trainee', nom: 'Givre', rar: 'rare', col: '#bfe9ff', add: true },
  { id: 't_ombre', slot: 'trainee', nom: 'Ombre', rar: 'epique', col: '#a070ff', add: true, gros: true },
  { id: 't_etoiles', slot: 'trainee', nom: 'Poussière d\'étoiles', rar: 'legendaire', col: '#fff2b0', add: true, gros: true },
  { id: 'r_aucune', slot: 'aura', nom: 'Aucune', rar: 'commun', base: true },
  { id: 'r_cyan', slot: 'aura', nom: 'Lueur', rar: 'rare', col: 'rgba(80,230,255,.35)' },
  { id: 'r_feu', slot: 'aura', nom: 'Flammes', rar: 'epique', col: 'rgba(255,120,40,.45)' },
  { id: 'r_couronne', slot: 'aura', nom: 'Couronne', rar: 'legendaire', col: 'rgba(255,210,80,.5)', couronne: true }
];
function skin(id) { return SKINS.find(s => s.id === id); }
function skinsSave() { const s = Save.d.skins = Save.d.skins || { frag: {}, equip: {} }; for (const k in SLOTS) if (!s.equip[k]) s.equip[k] = SKINS.find(x => x.slot === k && x.base).id; return s; }
function possede(id) { const s = skin(id); return s.base || (skinsSave().frag[id] || 0) >= RARETES[s.rar].frags; }
function equipe(slot) { return skin(skinsSave().equip[slot]) || SKINS.find(x => x.slot === slot && x.base); }
// donne un fragment d'une apparence de la rareté tirée (ou au-dessus) ; renvoie le texte affiché
function donnerFragment(rarMin) {
  const ordre = ['commun', 'rare', 'epique', 'legendaire'], min = ordre.indexOf(rarMin || 'commun');
  const dispo = SKINS.filter(s => !s.base && !possede(s.id) && ordre.indexOf(s.rar) >= min && s.rar !== 'legendaire');
  if (!dispo.length) { gagnerEclats(2); return '+2 éclats'; }
  const s = R.weighted(dispo, x => RARETES[x.rar].poids || 1), S = skinsSave();
  S.frag[s.id] = (S.frag[s.id] || 0) + 1; Save.write();
  const n = S.frag[s.id], tot = RARETES[s.rar].frags;
  return (n >= tot ? '✔ ' : '') + SLOTS[s.slot] + ' « ' + s.nom + ' » ' + Math.min(n, tot) + '/' + tot;
}
function donnerLegendaire() {
  const dispo = SKINS.filter(s => s.rar === 'legendaire' && !possede(s.id));
  if (!dispo.length) { gagnerEclats(5); return '+5 éclats'; }
  const s = R.pick(dispo); skinsSave().frag[s.id] = 1; Save.write();
  return '★ ' + SLOTS[s.slot] + ' légendaire : « ' + s.nom + ' »';
}

// ---------- Forge : chaque famille d'armes peut prendre une évolution (échange, pas de bonus gratuit) ----------
const FORGE = {
  fusil: [
    { id: 'perforant', nom: 'Perforant', desc: 'Les balles traversent une cible de plus · −15 % de dégâts', mod: { pierce: 1, dmg: .85 } },
    { id: 'rafale', nom: 'Rafale', desc: '+30 % de cadence · −25 % de dégâts', mod: { cad: 1.3, dmg: .75 } },
    { id: 'calibre', nom: 'Gros calibre', desc: '−35 % de cadence · +55 % de dégâts, balles plus grosses', mod: { cad: .65, dmg: 1.55, taille: 1.5 } },
    { id: 'tete', nom: 'Tête chercheuse', desc: 'Les balles s\'orientent un peu vers la cible · −15 % de dégâts', mod: { hom: 1.6, dmg: .85 } },
    { id: 'shrapnel', nom: 'Shrapnel', desc: 'Les balles éclatent en deux à l\'impact · −22 % de dégâts', mod: { eclat: 1, dmg: .78 } }
  ],
  lame: [
    { id: 'allonge', nom: 'Allonge', desc: '+25 % de portée · −15 % de dégâts', mod: { portee: 1.25, dmg: .85 } },
    { id: 'vampire', nom: 'Vampire', desc: 'Les coups rendent 1 PV (au plus 1 par seconde) · −20 % de dégâts', mod: { dmg: .8, vampire: 1 } },
    { id: 'tempo', nom: 'Tempo', desc: '+25 % de vitesse de frappe · −20 % de dégâts', mod: { cad: 1.25, dmg: .8 } },
    { id: 'siphon', nom: 'Siphon', desc: 'Les coups rendent 60 % d\'énergie en plus · −15 % de dégâts', mod: { energie: 1.6, dmg: .85 } },
    { id: 'lente', nom: 'Lame lourde', desc: '−25 % de vitesse de frappe · +40 % de dégâts', mod: { cad: .75, dmg: 1.4 } }
  ],
  trait: [
    { id: 'chercheur', nom: 'Chercheur', desc: 'Les projectiles s\'orientent un peu vers la cible · −15 % de dégâts', mod: { hom: 2.2, dmg: .85 } },
    { id: 'lourd', nom: 'Lourd', desc: '+40 % de dégâts · projectiles 30 % plus lents, cadence −15 %', mod: { dmg: 1.4, vit: .7, cad: .85 } },
    { id: 'eclat', nom: 'Éclatement', desc: 'À l\'impact, deux éclats repartent · −20 % de dégâts', mod: { dmg: .8, eclat: 1 } },
    { id: 'perceur', nom: 'Perceur', desc: 'Traverse une cible de plus, 20 % plus rapide · −18 % de dégâts', mod: { pierce: 1, vit: 1.2, dmg: .82 } },
    { id: 'salve', nom: 'Salve', desc: '+25 % de cadence · −20 % de dégâts', mod: { cad: 1.25, dmg: .8 } }
  ],
  explosif: [
    { id: 'large', nom: 'Grande zone', desc: '+30 % de zone · −15 % de dégâts', mod: { zone: 1.3, dmg: .85 } },
    { id: 'grappe', nom: 'Grappe', desc: 'Chaque explosion en lâche trois petites · −30 % de dégâts', mod: { dmg: .7, grappe: 1 } },
    { id: 'vif', nom: 'Vif', desc: '+25 % de cadence · −20 % de dégâts', mod: { cad: 1.25, dmg: .8 } },
    { id: 'obus', nom: 'Obus', desc: '−30 % de cadence · +25 % de zone · +35 % de dégâts', mod: { cad: .7, zone: 1.25, dmg: 1.35 } },
    { id: 'recup', nom: 'Récupération', desc: 'Les explosions rendent 50 % d\'énergie en plus · −15 % de dégâts', mod: { energie: 1.5, dmg: .85 } }
  ],
  magie: [
    { id: 'echo', nom: 'Écho', desc: '15 % de chance de lancer deux fois · −10 % de dégâts', mod: { echo: .15, dmg: .9 } },
    { id: 'canal', nom: 'Canalisation', desc: '+25 % de dégâts immobile · −15 % en mouvement', mod: { canal: 1 } },
    { id: 'drain', nom: 'Drain', desc: 'Les coups rendent 50 % d\'énergie en plus · −15 % de dégâts', mod: { dmg: .85, energie: 1.5 } },
    { id: 'sang', nom: 'Magie de sang', desc: 'Les coups rendent 1 PV (au plus 1 par seconde) · −20 % de dégâts', mod: { vampire: 1, dmg: .8 } },
    { id: 'ample', nom: 'Ampleur', desc: 'Projectiles 40 % plus gros, 20 % plus lents', mod: { taille: 1.4, vit: .8 } }
  ]
};
const COUT_FORGE = 6;
function forgeSave() { return Save.d.forge = Save.d.forge || { eclats: 0, debloque: {}, actif: {} }; }
function gagnerEclats(n) { forgeSave().eclats += n; Save.write(); }
function modForge() {
  try {
    const fam = FAMILLE[G.ars.p], id = forgeSave().actif[fam];
    if (!id || G.mode === 'jour' || G.mode === 'semaine') return {};
    const e = (FORGE[fam] || []).find(x => x.id === id); return e ? e.mod : {};
  } catch (e) { return {}; }
}

// ---------- Chasse de la semaine : une espèce à battre de plus en plus vite ----------
const CHASSE_PALIERS = [180, 120, 90];
function chasseCourante() {
  const cle = cleSemaine(), r = RNG(hashStr('chasse-' + cle));
  const c = Save.d.chasseH = Save.d.chasseH && Save.d.chasseH.cle === cle ? Save.d.chasseH : { cle, esp: r.pick(ESP_ORDRE), best: 0, paliers: [] };
  return c;
}
function noterChasse(esp, temps) {
  const c = chasseCourante();
  if (c.esp !== esp) return;
  if (!c.best || temps < c.best) c.best = Math.round(temps);
  CHASSE_PALIERS.forEach((lim, i) => {
    if (temps <= lim && !c.paliers.includes(i)) {
      c.paliers.push(i);
      const txt = donnerFragment(i === 2 ? 'epique' : 'rare');
      G.annonce('Chasse : palier ' + (i + 1) + ' réussi !', '#ffd86b', 2.2); G.texte(G.p.x, G.p.y - 70, txt, '#ffd86b', 14);
    }
  });
  Save.write();
}

// ---------- Affinités : on paie des éclats pour qu'un type d'arme tombe plus souvent (même puissance) ----------
const AFF_PRIX = [3, 6, 10], AFF_MULT = [1, 1.6, 2.2, 2.8];
function affSave() {
  let A = Save.d.affinites;
  if (!A || Array.isArray(A.p)) { const v = A || {}; A = Save.d.affinites = { p: {}, s: {}, t: {} }; for (const c of ['p', 's', 't']) for (const k of (v[c] || [])) A[c][k] = 1; }
  for (const c of ['p', 's', 't']) A[c] = A[c] || {};
  return A;
}
function correspond(a, cible) { return elemArme(a.id) === cible || FAMILLE[a.id] === cible || a.id === cible; }
function multAff(cat, a) { const A = affSave()[cat]; let m = 1; for (const k in A) if (A[k] > 0 && correspond(a, k)) m = Math.max(m, AFF_MULT[A[k]]); return m; }
// chance qu'une arme tirée corresponde à la cible : sans affinité, et avec le niveau donné
function chanceAff(cat, cible, niv) {
  const l = ARS[cat]; let tot = 0, ok = 0, tot0 = 0, ok0 = 0;
  for (const a of l) {
    const m = correspond(a, cible) ? AFF_MULT[niv] : multAff(cat, a), c = correspond(a, cible);
    tot += m; if (c) ok += m; tot0 += 1; if (c) ok0 += 1;
  }
  return { avant: ok0 / tot0, apres: ok / tot };
}
