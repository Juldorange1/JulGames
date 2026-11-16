// Modèle : classements mondiaux Steam pour Shiftrun. Copier en steam-lb.js et compléter avec une bibliothèque
// qui gère les classements (voir STEAM.md). Le programme l'utilise s'il existe ; sinon le classement reste caché.
module.exports = {
  // true si Steam est lancé et la bibliothèque prête
  ready() { return false; },
  // envoie un temps (images à 60 par seconde : plus petit = meilleur) et le fantôme (texte des entrées)
  async submit(board, temps, fantome) {
    // FindOrCreateLeaderboard(board, tri croissant, affichage temps en ms)
    // UploadLeaderboardScore(KeepBest, temps, détails = fantôme ou contenu UGC attaché)
    return true;
  },
  // les n meilleurs : [{ nom, temps, fantome }]
  async top(board, n) {
    // DownloadLeaderboardEntries(Global, 1, n) puis, pour chaque entrée, le fantôme attaché
    return [];
  }
};
