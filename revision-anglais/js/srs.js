// Répétition espacée "maison" : paliers courts au début, dynamiques selon la difficulté,
// + suivi de plusieurs compétences par mot (pas un simple score global).
(function (global) {
  'use strict';

  const MIN = 60 * 1000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  // Paliers d'intervalle (en ms) : quelques minutes -> plus tard dans la session -> demain -> ...
  const STEPS = [2 * MIN, 8 * MIN, 30 * MIN, 4 * HOUR, 1 * DAY, 3 * DAY, 7 * DAY, 14 * DAY, 30 * DAY, 60 * DAY, 120 * DAY];

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

  function applyResult(item, skillName, correct, opts) {
    opts = opts || {};
    const sk = item.skills[skillName];
    sk.reps += 1;
    sk.lastDate = Date.now();
    sk.lastResult = correct;
    const diff = difficultyFactor(item);

    if (correct) {
      sk.success += 1;
      sk.streak += 1;
      sk.ease = Math.min(2.2, sk.ease + 0.05);
      // recul d'un palier de plus si le mot est difficile, pour revoir plus souvent
      const advance = diff > 0.5 ? 1 : 2;
      sk.stepIndex = Math.min(STEPS.length - 1, sk.stepIndex + advance);
    } else {
      sk.errors += 1;
      sk.streak = 0;
      sk.ease = Math.max(0.6, sk.ease - 0.2);
      sk.stepIndex = Math.max(-1, sk.stepIndex - 2);
    }

    const baseIndex = Math.max(0, sk.stepIndex);
    const baseInterval = STEPS[baseIndex];
    // Un mot difficile revient plus souvent : on réduit l'intervalle jusqu'à -50%.
    const difficultyPenalty = 1 - diff * 0.5;
    const jitter = 0.9 + Math.random() * 0.2;
    // Multiplicateur réglable par l'utilisateur (Réglages) : >1 espace davantage les révisions
    // (les mots reviennent moins souvent), <1 les rapproche (ils reviennent plus vite).
    const userMultiplier = intervalMultiplier();
    let interval = baseInterval * sk.ease * difficultyPenalty * jitter * userMultiplier;
    if (!correct) interval = Math.min(interval, STEPS[1] * userMultiplier); // un échec revient vite, quoi qu'il arrive
    sk.due = Date.now() + interval;

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
