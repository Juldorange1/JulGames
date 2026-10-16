// Répétition espacée "maison" : paliers courts au début, dynamiques selon la difficulté,
// + suivi de plusieurs compétences par mot (pas un simple score global).
(function (global) {
  'use strict';

  const MIN = 60 * 1000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  // Tous les intervalles sont allongés de 40 % (demande utilisateur).
  const BASE_SCALE = 1.4;

  // Paliers d'intervalle (en ms) : quelques minutes -> plus tard dans la session -> demain -> ...
  const STEPS = [2 * MIN, 8 * MIN, 30 * MIN, 4 * HOUR, 1 * DAY, 3 * DAY, 7 * DAY, 14 * DAY, 30 * DAY, 60 * DAY, 120 * DAY]
    .map((ms) => ms * BASE_SCALE);

  // Une seule compétence par direction : plus de 3e compétence "écoute" séparée depuis que
  // l'appli n'a plus qu'un seul type d'exercice (flashcard, qui alterne les 2 directions).
  const SKILLS = ['en_fr', 'fr_en'];

  function newSkillState() {
    return { stepIndex: -1, due: Date.now(), ease: 1.0, reps: 0, success: 0, errors: 0, streak: 0, lastResult: null, lastDate: null };
  }

  function newSrsState() {
    const skills = {};
    SKILLS.forEach((s) => { skills[s] = newSkillState(); });
    return skills;
  }

  // Facteur de difficulté du mot (0 = facile, 1 = très difficile) basé sur son historique global.
  function difficultyFactor(item) {
    let success = 0, errors = 0;
    SKILLS.forEach((s) => { const sk = item.skills[s]; success += sk.success; errors += sk.errors; });
    const total = success + errors;
    if (total === 0) return 0.3; // inconnu -> prudence moyenne
    return Math.min(1, errors / total);
  }

  // Calcule le niveau de maîtrise agrégé 0-3 à partir des compétences.
  // 0 nouveau / 1 reconnu (anglais->français réussi) / 2 mémorisé (français->anglais réussi)
  // / 3 solide (intervalle long dans les deux sens)
  function computeMasteryLevel(item) {
    const s = item.skills;
    const seen = SKILLS.some((k) => s[k].reps > 0);
    if (!seen) return 0;
    if (s.en_fr.success === 0) return 1;
    if (s.fr_en.success === 0) return 2;
    const longEnough = SKILLS.every((k) => s[k].stepIndex >= 5);
    return longEnough ? 3 : 2;
  }

  // Lit le multiplicateur configuré dans les Réglages (par défaut 1 = comportement normal),
  // borné pour éviter un réglage aberrant (mots ne revenant jamais, ou revenant en boucle).
  function intervalMultiplier() {
    const v = (typeof Store !== 'undefined' && Store.getSettings().intervalMultiplier) || 1;
    return Math.min(5, Math.max(0.1, v));
  }

  // Trois notes, trois effets franchement différents sur le délai avant que le mot revienne :
  //   ❌ "again" : retour au tout début, le mot revient dans quelques minutes, facilité en forte baisse.
  //   😐 "hard"  : avance d'un seul palier, intervalle divisé par deux, facilité en baisse.
  //   ✅ "good"  : avance de deux paliers (un seul si le mot est globalement difficile), bonus
  //              d'intervalle, facilité en hausse.
  // Ex. pour un mot au palier "~6 h" : ✅ -> ~5 jours, 😐 -> ~17 h, ❌ -> ~3 min.
  const GRADE = {
    good:  { advance: 2, factor: 1.2, ease: +0.10 },
    hard:  { advance: 1, factor: 0.5, ease: -0.15 },
    again: { advance: 0, factor: 1.0, ease: -0.30 },
  };

  function applyResult(item, skillName, correct, opts) {
    opts = opts || {};
    const grade = !correct ? 'again' : (opts.hesitant ? 'hard' : 'good');
    const g = GRADE[grade];
    const sk = item.skills[skillName];
    sk.reps += 1;
    sk.lastDate = Date.now();
    sk.lastResult = correct;
    const diff = difficultyFactor(item); // 0 = mot connu dans l'ensemble, 1 = mot souvent raté
    sk.ease = Math.min(2.5, Math.max(0.6, sk.ease + g.ease));

    if (grade === 'again') {
      sk.errors += 1;
      sk.streak = 0;
      sk.stepIndex = -1; // repart de zéro
    } else {
      sk.success += 1;
      sk.streak = grade === 'good' ? sk.streak + 1 : 0;
      const advance = grade === 'good' && diff > 0.5 ? 1 : g.advance;
      sk.stepIndex = Math.min(STEPS.length - 1, sk.stepIndex + advance);
    }

    // Multiplicateur réglable par l'utilisateur (Réglages) : >1 espace davantage les révisions
    // (les mots reviennent moins souvent), <1 les rapproche (ils reviennent plus vite).
    const userMultiplier = intervalMultiplier();
    const jitter = 0.9 + Math.random() * 0.2;
    let interval;
    if (grade === 'again') {
      interval = STEPS[0] * userMultiplier * jitter;
    } else {
      // Un mot globalement mal connu revient plus souvent : intervalle réduit jusqu'à -50 %.
      const difficultyPenalty = 1 - diff * 0.5;
      interval = STEPS[Math.max(0, sk.stepIndex)] * sk.ease * difficultyPenalty * g.factor * userMultiplier * jitter;
      // 😐 doit toujours revenir plus tard que ❌, jamais plus tôt (cas d'un mot tout neuf).
      if (grade === 'hard') interval = Math.max(interval, STEPS[0] * 2 * userMultiplier);
    }
    sk.due = Date.now() + interval;
    // Le mot entier attend ce délai, dans les deux sens : sinon l'autre sens (jamais demandé ou
    // déjà échu) le ferait revenir aussitôt et la note donnée n'aurait aucun effet (comme Anki
    // qui "enterre" les cartes sœurs). À l'échéance, c'est l'autre sens qui sera demandé.
    SKILLS.forEach((k) => {
      if (k !== skillName) item.skills[k].due = Math.max(item.skills[k].due, sk.due);
    });

    item.masteryLevel = computeMasteryLevel(item);
    return sk;
  }

  // Prochaine échéance la plus proche parmi les compétences pertinentes pour cet item.
  function nextDue(item) {
    return Math.min(...SKILLS.map((k) => item.skills[k].due));
  }

  function isDue(item, now) {
    now = now || Date.now();
    return nextDue(item) <= now;
  }

  global.SRS = { SKILLS, STEPS, newSrsState, applyResult, computeMasteryLevel, difficultyFactor, nextDue, isDue };
})(window);
