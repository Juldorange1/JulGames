/* Phase — les 24 niveaux de la campagne, construits par le générateur de salles (js/gen.js) avec une graine fixe.
   Dans un niveau, toutes les salles ont la même difficulté : le niveau est aussi dur du début à la fin.
   Légende des cartes : # mur  = grille  ~ tamis  x fragile  ^ pics  f feu  w eau  i glace  s ressort  * cristal
   G arrivée  ! drapeau  - plateforme  [ ] tapis  > < A V vent  P→p Q→q téléporteurs  e éclat  ? panneau  @ départ. */
(function (racine) {
'use strict';
const Gen = (typeof module !== 'undefined' && module.exports) ? require('./gen.js') : racine.Gen;
const S = 0, L = 1, Z = 2, P = 3;

const DEF = [
  { nom: 'Carrière', theme: 'carriere', phases: [S], niveaux: ['Premiers pas', 'Fracas', 'Carrière profonde'],
    intro: ['Courir : Q D ou ← →. Sauter : Espace (garde-le appuyé pour sauter plus haut). Contre un mur en l\'air : saut mural.',
      'En l\'air, Bas : fracas (brise les blocs fêlés). Saute juste après : rebond. Ressort + fracas : très haut.'],
    imposees: ['trous', 'cheminee', 'fracas', 'ressort'] },
  { nom: 'Aqueduc', theme: 'aqueduc', phases: [S, L], niveaux: ['Goutte', 'Conversion', 'Égouts'],
    intro: ['K : liquide. Tu colles aux murs et aux plafonds, tu passes les grilles. J : redevenir solide.',
      'Changer d\'état coûte une charge (2 au plus), rendue au sol. Liquide lancé contre un mur : ta vitesse devient montée.'],
    imposees: ['murLiquide', 'grilles'] },
  { nom: 'Chaufferie', theme: 'chaufferie', phases: [S, L, Z], niveaux: ['Vapeur', 'Explosions', 'Soufflerie'],
    intro: ['L : gaz. Il monte (Bas : descendre), passe les tamis, le vent l\'emporte, puis redevient solide.',
      'Gaz + feu : explosion qui propulse. Liquide + feu : il devient gaz gratuitement. Le feu tue le solide.'],
    imposees: ['tamis', 'feu', 'vent'] },
  { nom: 'Orage', theme: 'orage', phases: [S, L, Z, P], niveaux: ['Éclair', 'Super saut', 'Tempête'],
    intro: ['M : éclair dans la direction tenue (8 directions), il brise les blocs fêlés. Les cristaux rendent les charges.',
      'Éclair en diagonale vers le sol puis saut : super saut, très rapide.'],
    imposees: ['eclair'] },
  { nom: 'Abysses', theme: 'abysses', phases: [S, L, Z, P], niveaux: ['Plongée', 'Geyser', 'Fosse'],
    intro: ['Dans l\'eau, le solide nage lentement, le liquide file partout, le gaz remonte comme une bulle.'],
    imposees: ['eau'] },
  { nom: 'Usine', theme: 'usine', phases: [S, L, Z, P], niveaux: ['Tapis roulants', 'Téléporteurs', 'Chaîne de montage'],
    intro: ['Tapis roulants : saute depuis un tapis pour garder son élan. Les téléporteurs gardent ta vitesse.'],
    imposees: ['tapis', 'teleport'] },
  { nom: 'Glacier', theme: 'glacier', phases: [S, L, Z, P], niveaux: ['Banquise', 'Crevasses', 'Avalanche'],
    intro: ['La glace glisse et le liquide n\'y colle pas. Le saut mural marche encore.'],
    imposees: ['glace', 'cheminee*'] },
  { nom: 'Cœur', theme: 'coeur', phases: [S, L, Z, P], niveaux: ['Fusion', 'Transmutation', 'Phase finale'],
    intro: ['Le cœur de la matière : tout, tout le temps.'], imposees: [] }
];

const ZONES = DEF.map((z, zi) => ({
  id: zi + 1, nom: z.nom, theme: z.theme, phases: z.phases,
  niveaux: z.niveaux.map((nom, k) => {
    const d = 0.12 + zi * 0.12 + k * 0.05;
    const nb = 20 + k * 4;
    const r = Gen.niveau(zi + 1, 1000 + zi * 97 + k * 13, d, nb, k === 0 ? z.intro : [], k === 0 ? z.imposees : null);
    return { id: (zi + 1) + '-' + (k + 1), nom, phases: z.phases, panneaux: k === 0 ? z.intro : [], carte: r.carte, suite: r.suite, d };
  })
}));

const Niveaux = { ZONES, S, L, Z, P };
if (typeof module !== 'undefined' && module.exports) module.exports = Niveaux;
else racine.Niveaux = Niveaux;
})(typeof window !== 'undefined' ? window : globalThis);
