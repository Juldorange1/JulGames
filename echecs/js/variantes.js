/* Catalogue des variantes.
   Pour AJOUTER une variante : ajouter un objet ici. Si elle n'existe pas déjà dans
   Fairy-Stockfish, lui donner un champ « ini » (format variants.ini de Fairy-Stockfish) :
   les règles ET les deux bots la comprennent automatiquement.
   Les variantes créées dans l'Atelier du jeu sont rangées dans le navigateur (localStorage). */
(function () {
  'use strict';

  const CLE_PERSO = 'echecs.variantes';

  const BASE = [
    {
      id: 'classique', uci: 'chess', moteur: 'sf', nom: 'Classique',
      court: 'Les échecs normaux.',
      regles: 'Les règles officielles des échecs : mat, pat, roque, prise en passant, promotion, nulle par répétition ou par la règle des 50 coups.'
    },
    {
      id: 'aleatoire', uci: 'chess', is960: true, moteur: 'sf', nom: 'Aléatoire (960)',
      court: 'Pièces de derrière mélangées à chaque partie.',
      regles: 'Comme les échecs classiques, mais les pièces de la première rangée sont mélangées (960 départs possibles, les fous sur des couleurs différentes, le roi entre ses tours). Pour roquer, pose ton roi sur la tour avec laquelle tu veux roquer.'
    },
    {
      id: 'troisechecs', uci: '3check', nom: 'Trois échecs',
      court: 'Le premier qui donne 3 échecs gagne.',
      regles: 'Règles classiques, mais on gagne aussi en mettant le roi adverse en échec trois fois. Le compteur s’affiche à côté du plateau.',
      but: 'Trois échecs donnés'
    },
    {
      id: 'colline', uci: 'kingofthehill', nom: 'Roi de la colline',
      court: 'Amène ton roi au centre pour gagner.',
      regles: 'Règles classiques, mais on gagne aussi en amenant son roi sur une des quatre cases du centre (d4, e4, d5, e5).',
      but: 'Roi arrivé au centre'
    },
    {
      id: 'atomique', uci: 'atomic', nom: 'Atomique',
      court: 'Chaque prise fait tout exploser autour.',
      regles: 'Quand une pièce en prend une autre, les deux disparaissent ainsi que toutes les pièces (sauf les pions) des 8 cases autour. On gagne en faisant exploser le roi adverse. Les rois ne peuvent pas prendre.',
      but: 'Roi explosé'
    },
    {
      id: 'renfort', uci: 'crazyhouse', nom: 'Renfort',
      court: 'Les pièces prises changent de camp.',
      regles: 'Une pièce que tu prends va dans ta réserve. À la place d’un coup, tu peux la poser sur n’importe quelle case vide (un pion ne se pose pas sur la première ni la dernière rangée). Clique une pièce de ta réserve puis une case.'
    },
    {
      id: 'horde', uci: 'horde', nom: 'Horde',
      court: '36 pions blancs contre une armée normale.',
      regles: 'Les blancs n’ont que des pions (36). Les noirs ont une armée normale. Les noirs gagnent en prenant tous les pions, les blancs en matant le roi noir.',
      but: 'Toute la horde a été prise'
    },
    {
      id: 'course', uci: 'racingkings', nom: 'Course de rois',
      court: 'Le premier roi sur la dernière rangée gagne.',
      regles: 'Les deux camps commencent sur les deux premières rangées. Le but est d’amener son roi sur la 8e rangée. Il est interdit de mettre un roi en échec. Si les blancs arrivent, les noirs ont encore un coup pour arriver aussi (nulle).',
      but: 'Roi arrivé en haut'
    },
    {
      id: 'quiperd', uci: 'antichess', nom: 'Qui perd gagne',
      court: 'Perds toutes tes pièces pour gagner.',
      regles: 'Prendre est obligatoire. Le roi n’est pas royal (on peut le prendre et le promouvoir). On gagne en perdant toutes ses pièces ou en n’ayant plus aucun coup possible.',
      but: 'Plus de pièces ou plus de coup'
    },
    {
      id: 'capablanca', uci: 'capablanca', nom: 'Capablanca',
      court: 'Plateau 10×8 avec deux nouvelles pièces.',
      regles: 'Plateau de 10 colonnes. Chaque camp a en plus un Archevêque (fou + cavalier) et un Chancelier (tour + cavalier). Le roque déplace le roi de 3 cases.'
    },
    {
      id: 'grand', uci: 'grand', nom: 'Grand',
      court: 'Plateau 10×10, tours dans les coins.',
      regles: 'Plateau de 10×10 avec Archevêque et Chancelier, sans roque. Les pions avancent de deux cases au premier coup, se promeuvent dès la 8e rangée (obligatoire sur la 10e), mais seulement en une pièce déjà perdue.'
    },
    {
      id: 'cavalierroi', uci: 'knightmate', nom: 'Roi-cavalier',
      court: 'Le roi saute comme un cavalier.',
      regles: 'Le roi se déplace comme un cavalier. Les cavaliers sont remplacés par des Hommes, qui se déplacent comme un roi mais ne sont pas royaux. Il faut mater le roi-cavalier.',
      pieces: {
        k: { base: 'n', insigne: 'k', nom: 'Roi-cavalier', desc: 'Pièce royale qui saute comme un cavalier.' },
        m: { base: 'k', insigne: 'p', nom: 'Homme', desc: 'Se déplace comme un roi, mais n’est pas royal.' }
      }
    },
    {
      id: 'tempete', uci: 'tempete', nom: 'Tempête', original: true,
      court: 'Tours et fous remplacés par des pièces géantes.',
      regles: 'Variante JulGame. Les tours deviennent des Chanceliers (tour + cavalier) et les fous des Archevêques (fou + cavalier). Pas de roque. Les pions se promeuvent en dame, chancelier, archevêque ou cavalier.',
      ini: '[tempete:chess]\narchbishop = a\nchancellor = c\nstartFen = cnaqkanc/pppppppp/8/8/8/8/PPPPPPPP/CNAQKANC w - - 0 1\npromotionPieceTypes = qcan\ncastling = false\n'
    },
    {
      id: 'amazones', uci: 'amazones', nom: 'Amazones', original: true,
      court: 'La dame devient une amazone.',
      regles: 'Variante JulGame. Chaque dame est remplacée par une Amazone (dame + cavalier). Les pions peuvent se promouvoir en amazone.',
      ini: '[amazones:chess]\namazon = z\nstartFen = rnbzkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBZKBNR w KQkq - 0 1\npromotionPieceTypes = zrbn\n'
    }
  ];

  function lirePerso() {
    try { return JSON.parse(localStorage.getItem(CLE_PERSO) || '[]'); } catch (e) { return []; }
  }
  function ecrirePerso(liste) {
    localStorage.setItem(CLE_PERSO, JSON.stringify(liste));
  }

  const Variantes = {
    BASE,
    toutes() { return BASE.concat(lirePerso().map(v => Object.assign({ perso: true }, v))); },
    perso: lirePerso,
    trouver(id) { return this.toutes().find(v => v.id === id) || BASE[0]; },
    // Toutes les définitions .ini (variantes originales + créées), pour les règles et le moteur.
    iniTotal() {
      return this.toutes().filter(v => v.ini).map(v => v.ini.trim()).join('\n\n') + '\n';
    },
    enregistrer(v) {
      const l = lirePerso().filter(x => x.id !== v.id);
      l.push(v);
      ecrirePerso(l);
    },
    supprimer(id) { ecrirePerso(lirePerso().filter(x => x.id !== id)); },
    // Quel moteur fait jouer les bots : Stockfish 19 (classique, 960) ou Fairy-Stockfish (variantes).
    moteurDe(v) { return v.moteur === 'sf' ? 'sf' : 'fairy'; }
  };

  window.Variantes = Variantes;
})();
