/* Phase — les 24 niveaux de la campagne, construits par le générateur de salles (js/gen.js) avec une graine fixe.
   Dans un niveau, toutes les salles ont la même difficulté : le niveau est aussi dur du début à la fin.
   Légende des cartes : # mur  = grille  ~ tamis  x fragile  ^ pics  f feu  w eau  i glace  s ressort  * cristal
   G arrivée  ! drapeau  - plateforme  [ ] tapis  > < A V vent  P→p Q→q téléporteurs  e éclat  ? panneau  @ départ. */
(function (racine) {
'use strict';
const Gen = (typeof module !== 'undefined' && module.exports) ? require('./gen.js') : racine.Gen;
const S = 0, L = 1, Z = 2, P = 3;

const DEF = [
  { nom: 'Carrière', theme: 'carriere', phases: [S],
    niveaux: ['Premiers pas', 'Éboulis', 'Fracas', 'Galerie', 'Carrière profonde', 'Front de taille'],
    intro: { 0: ['Courir : Q D ou ← →. Sauter : Espace (garde-le appuyé pour sauter plus haut). Contre un mur en l’air : saut mural.',
      'En l’air, Bas : fracas (brise les blocs fêlés). Saute juste après : rebond. Ressort + fracas : très haut.'],
      1: ['Sol cassant : il cède peu après ton passage. Sol rebondissant : il te relance (lâche Espace pour rebondir moins haut).',
        'Les arbalètes tirent à intervalles réguliers. Un bouton ouvre la porte qui le suit.'],
      2: ['Orbe jaune : appuie sur saut en la touchant pour sauter en plein air. Tremplin vert : il te projette sur le côté.',
        'Interrupteur : les blocs rouges et bleus s’échangent. Flèche verte : sauts plus hauts un moment, flèche orange : sauts plus courts. Évite les ennemis hérissés.'] },
    imposees: { 0: ['trous', 'cheminee', 'fracas', 'ressort'], 1: ['cassant', 'rebond', 'fleches', 'bouton'], 2: ['orbes', 'tremplins', 'bascule', 'supersaut', 'ennemis'] } },
  { nom: 'Aqueduc', theme: 'aqueduc', phases: [S, L],
    niveaux: ['Goutte', 'Ruissellement', 'Conversion', 'Siphon', 'Égouts', 'Grand canal'],
    intro: { 1: ['Cristal barré : cet état est interdit pendant quelques secondes. Il faut passer autrement.'], 0: ['K : liquide. Tu colles aux murs et aux plafonds, tu passes les grilles. J : redevenir solide.',
      'Changer d’état coûte une charge (2 au plus), rendue au sol. Liquide lancé contre un mur : ta vitesse devient montée.'] },
    imposees: { 0: ['murLiquide', 'grilles'], 1: ['banni'] } },
  { nom: 'Chaufferie', theme: 'chaufferie', phases: [S, L, Z],
    niveaux: ['Vapeur', 'Chaudière', 'Explosions', 'Ventilation', 'Soufflerie', 'Haut fourneau'],
    intro: { 0: ['L : gaz. Il monte (Bas : descendre), passe les tamis, le vent l’emporte, puis redevient solide.',
      'Gaz + feu : explosion qui propulse. Liquide + feu : il devient gaz gratuitement. Le feu tue le solide.'] },
    imposees: { 0: ['tamis', 'feu', 'vent'] } },
  { nom: 'Orage', theme: 'orage', phases: [S, L, Z, P],
    niveaux: ['Éclair', 'Décharge', 'Super saut', 'Foudre', 'Tempête', 'Œil du cyclone'],
    intro: { 0: ['M : éclair dans la direction tenue (8 directions), il brise les blocs fêlés. Les cristaux rendent les charges.',
      'Éclair en diagonale vers le sol puis saut : super saut, très rapide.'] },
    imposees: { 0: ['eclair'] } },
  { nom: 'Abysses', theme: 'abysses', phases: [S, L, Z, P],
    niveaux: ['Plongée', 'Récif', 'Geyser', 'Courant froid', 'Fosse', 'Abîme'],
    intro: { 0: ['Dans l’eau, le solide nage lentement, le liquide file partout, le gaz remonte comme une bulle.'] },
    imposees: { 0: ['eau'] } },
  { nom: 'Usine', theme: 'usine', phases: [S, L, Z, P],
    niveaux: ['Tapis roulants', 'Engrenages', 'Téléporteurs', 'Presse', 'Chaîne de montage', 'Salle des machines'],
    intro: { 0: ['Tapis roulants : saute depuis un tapis pour garder son élan. Les téléporteurs gardent ta vitesse.'] },
    imposees: { 0: ['tapis', 'teleport'] } },
  { nom: 'Glacier', theme: 'glacier', phases: [S, L, Z, P],
    niveaux: ['Banquise', 'Givre', 'Crevasses', 'Séracs', 'Avalanche', 'Blizzard'],
    intro: { 0: ['La glace glisse et le liquide n’y colle pas. Le saut mural marche encore.'] },
    imposees: { 0: ['glace', 'cheminee*'] } },
  { nom: 'Cœur', theme: 'coeur', phases: [S, L, Z, P],
    niveaux: ['Fusion', 'Noyau', 'Transmutation', 'Singularité', 'Rupture', 'Phase finale'],
    intro: { 0: ['Le cœur de la matière : tout, tout le temps.'] }, imposees: {} }
];

const ZONES = DEF.map((z, zi) => ({
  id: zi + 1, nom: z.nom, theme: z.theme, phases: z.phases,
  niveaux: z.niveaux.map((nom, k) => {
    const d = 0.1 + zi * 0.12 + k * 0.035;
    const nb = Math.min(18 + k * 3, 10 + zi * 3 + k * 3);   // les premières zones sont un peu plus courtes
    const pan = z.intro[k] || [];
    const r = Gen.niveau(zi + 1, 1000 + zi * 97 + k * 13, d, nb, pan, z.imposees[k] || null);
    return { id: (zi + 1) + '-' + (k + 1), nom, phases: z.phases, panneaux: pan, carte: r.carte, suite: r.suite, d };
  })
}));

const Niveaux = { ZONES, S, L, Z, P };
if (typeof module !== 'undefined' && module.exports) module.exports = Niveaux;
else racine.Niveaux = Niveaux;
})(typeof window !== 'undefined' ? window : globalThis);
