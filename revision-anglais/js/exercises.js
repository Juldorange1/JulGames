// Génération des exercices. Un seul mode désormais : la flashcard (voir décision utilisateur —
// la correction automatique par comparaison de texte n'était pas fiable ; on lui préfère
// l'auto-évaluation, modifiable jusqu'au moment de passer à la suite).
(function (global) {
  'use strict';

  // ---------- Précision d'usage (remplace l'ancienne astuce de découpage syllabique) ----------
  // Gabarits de phrase (une par grande catégorie), pour donner un vrai contexte d'usage à un mot
  // qui n'a pas de phrase d'exemple issue de la leçon elle-même. Présenté explicitement comme un
  // "exemple" (pas comme un fait tiré de la leçon), donc pas trompeur.
  const USAGE_TEMPLATES = {
    verb: [
      { fr: 'Il est important de ___ chaque jour.', en: 'It is important to ___ every day.' },
      { fr: 'Elle a réussi à ___.', en: 'She managed to ___.' },
    ],
    phrasal_verb: [
      { fr: 'Il ne faut jamais ___.', en: 'You should never ___.' },
      { fr: 'Ils ont décidé de ___.', en: 'They decided to ___.' },
    ],
    noun: [
      { fr: "C'est un sujet lié à ___.", en: 'This is a topic related to ___.' },
      { fr: '___ est très important pour eux.', en: '___ is very important to them.' },
    ],
    adjective: [
      { fr: 'Cette situation est ___.', en: 'This situation is ___.' },
      { fr: "Il se sent ___ aujourd'hui.", en: 'He feels ___ today.' },
    ],
    expression: [
      { fr: "On utilise souvent l'expression « ___ ».", en: 'People often use the expression "___".' },
    ],
  };

  function fillWord(str, word) { return str.replace('___', word); }
  function hashCode(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i); return h; }

  // Retourne {en, fr, fromLesson} pour illustrer l'usage du mot, ou null quand ça n'a pas de
  // sens (phrase d'exemple déjà affichée telle quelle, famille de formes déjà explicite...).
  // Priorité à une vraie phrase de la leçon si elle existe (`item.example`).
  function getUsageExample(item) {
    if (item.type === 'example_sentence' || item.forms) return null;
    if (item.example && item.example.en && item.example.fr) {
      return { en: item.example.en, fr: item.example.fr, fromLesson: true };
    }
    const bank = USAGE_TEMPLATES[item.type] || USAGE_TEMPLATES.noun;
    const t = bank[Math.abs(hashCode(item.id)) % bank.length];
    const enWord = item.en.replace(/^to\s+/, '');
    const frWord = item.fr.split('/')[0].trim();
    return { en: fillWord(t.en, enWord), fr: fillWord(t.fr, frWord), fromLesson: false };
  }

  function genFlashcard(item, direction) {
    direction = direction || 'en_fr';
    const enSide = item.forms ? item.forms.join('  →  ') : item.en;
    const front = direction === 'en_fr' ? enSide : item.fr;
    const back = direction === 'en_fr' ? item.fr : enSide;
    return { kind: 'flashcard', item, direction, front, back };
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Sens à demander : celui dont l'échéance est la plus proche (chaque sens a son propre délai
  // de répétition) ; à égalité (mot neuf), on alterne avec le sens demandé la dernière fois.
  function pickDirection(item) {
    const a = item.skills.en_fr.due, b = item.skills.fr_en.due;
    if (a === b) return item.lastSkillUsed === 'en_fr' ? 'fr_en' : 'en_fr';
    return a < b ? 'en_fr' : 'fr_en';
  }

  // Construit une session : uniquement des flashcards, CHAQUE MOT UNE SEULE FOIS. Un mot ne
  // revient ensuite que selon la note donnée (❌ quelques questions plus tard dans la même
  // session, 😐 un peu plus tard, ✅ pas avant sa prochaine échéance) — on ne le répète plus en
  // boucle juste pour remplir la session, ce qui annulait l'effet de la note.
  function buildSession(items, pool, targetCount) {
    const queue = [];
    // Un item sans traduction (ou dont le "mot" n'en est pas un) ne peut pas être révisé : il
    // reste éditable dans la leçon mais absent des sessions. Les règles/notes culturelles (sans
    // "en") sont traitées à part.
    const usable = items.filter((it) => Analyzer.isReviewable(it));
    const noEnItems = items.filter((it) => !it.en && it.fr);
    usable.slice(0, targetCount).forEach((item) => queue.push(genFlashcard(item, pickDirection(item))));
    // Insère les règles/notes de grammaire/culture en fin, présentées comme rappels courts.
    noEnItems.slice(0, Math.max(0, targetCount - queue.length)).forEach((it) => {
      queue.push({ kind: 'note', item: it });
    });
    return queue.slice(0, targetCount);
  }

  global.Exercises = { genFlashcard, shuffle, buildSession, getUsageExample };
})(window);
