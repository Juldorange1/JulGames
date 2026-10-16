// Point d'entrée : nettoie les données abîmées par d'anciennes versions de l'analyseur, puis
// démarre l'interface une fois le DOM prêt.
(function (global) {
  'use strict';

  // Corrige les données déjà enregistrées avant que l'analyseur ne sache éviter ces deux
  // problèmes : un item "phrase" sans traduction (inexploitable), ou un texte démesuré
  // (paragraphe entier avalé comme un seul mot suite à un copié-collé abîmé).
  function cleanupLegacyItems() {
    const all = Store.getAllItems();
    let removed = 0;
    all.forEach((it) => {
      const tooLong = (it.en && it.en.length > 180) || (it.fr && it.fr.length > 180);
      const emptyTranslationSentence = it.type === 'example_sentence' && !it.fr;
      // Un "mot" qui n'en est pas un (ex: "d", reste de numérotation) créé par une ancienne
      // version de l'analyseur. Un élément ajouté à la main et encore vide (en === '') est gardé.
      const notAWord = it.en && !Analyzer.isPlausibleTerm(it.en);
      if (tooLong || emptyTranslationSentence || notAWord) {
        Store.deleteItem(it.id);
        removed++;
      }
    });
    if (removed) Store.markDirty();
    return removed;
  }

  global.cleanupLegacyItems = cleanupLegacyItems;

  document.addEventListener('DOMContentLoaded', () => {
    cleanupLegacyItems();
    UI.init();
  });
})(window);
