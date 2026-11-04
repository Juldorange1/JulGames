// Colosses — mise à jour automatique depuis le site.
// Le programme garde une copie du jeu dans %APPDATA%\Colosses\jeu. Au lancement, il compare la liste des fichiers
// (version.json) avec celle du site, télécharge seulement ce qui a changé (empreinte SHA-1 vérifiée) dans un dossier
// à part, et l'installe au lancement suivant. Sans internet, ou si quoi que ce soit échoue, il garde la version actuelle.
// La sauvegarde ne bouge pas (elle est liée au programme, pas au dossier du jeu).
const { net } = require('electron');
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const EXT_OK = /\.(html|css|js|png|jpg|jpeg|webp|svg|woff2?|ttf|ogg|mp3|wav|json|md|txt)$/i;
function lireManifeste(dir) { try { const m = JSON.parse(fs.readFileSync(path.join(dir, 'version.json'), 'utf8')); return m && m.fichiers && m.date ? m : null; } catch (e) { return null; } }
function sha1(buf) { return crypto.createHash('sha1').update(buf).digest('hex'); }
function sur(base, rel) {
  if (typeof rel !== 'string' || !EXT_OK.test(rel) || rel.includes('..') || rel.includes('\\') || path.isAbsolute(rel)) return null;
  const p = path.resolve(base, rel);
  return p.startsWith(path.resolve(base) + path.sep) ? p : null;
}
async function telecharger(url, ms) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
  try { const r = await net.fetch(url, { signal: ctl.signal, cache: 'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url); return Buffer.from(await r.arrayBuffer()); }
  finally { clearTimeout(t); }
}

function creer(userData, bundle) {
  const CACHE = path.join(userData, 'jeu'), NOUVEAU = CACHE + '-nouveau', ANCIEN = CACHE + '-ancien';
  return {
    CACHE, NOUVEAU,
    // au lancement : installe une mise à jour complète téléchargée la fois d'avant
    installerEnAttente() {
      try {
        const m = lireManifeste(NOUVEAU);
        if (!m || !fs.existsSync(path.join(NOUVEAU, 'index.html'))) { if (fs.existsSync(NOUVEAU)) fs.rmSync(NOUVEAU, { recursive: true, force: true }); return false; }
        fs.rmSync(ANCIEN, { recursive: true, force: true });
        if (fs.existsSync(CACHE)) fs.renameSync(CACHE, ANCIEN);
        fs.renameSync(NOUVEAU, CACHE);
        fs.rmSync(ANCIEN, { recursive: true, force: true });
        return m.date;
      } catch (e) { return false; }
    },
    // dossier à charger : la copie mise à jour si elle est plus récente que celle livrée avec le programme
    dossierActif() {
      const b = lireManifeste(bundle), c = lireManifeste(CACHE);
      if (c && fs.existsSync(path.join(CACHE, 'index.html')) && (!b || c.date > b.date)) return CACHE;
      return bundle;
    },
    versionActive() { const m = lireManifeste(this.dossierActif()); return m ? m.date : null; },
    // vérifie le site ; renvoie { etat: 'a-jour' | 'pret' | 'erreur', ... }
    async verifier(site) {
      try {
        const actif = this.dossierActif(), loc = lireManifeste(actif);
        const dist = JSON.parse((await telecharger(site + 'version.json?t=' + Date.now(), 6000)).toString('utf8'));
        if (!dist || !dist.fichiers || !dist.date) return { etat: 'erreur', msg: 'liste invalide' };
        if (loc && dist.date <= loc.date) return { etat: 'a-jour', date: loc.date };
        const enAttente = lireManifeste(NOUVEAU);
        if (enAttente && enAttente.date === dist.date) return { etat: 'pret', date: dist.date, n: 0 };
        fs.rmSync(NOUVEAU, { recursive: true, force: true });
        let n = 0, octets = 0;
        for (const [rel, h] of Object.entries(dist.fichiers)) {
          const cible = sur(NOUVEAU, rel); if (!cible || !/^[0-9a-f]{40}$/.test(h)) throw new Error('chemin refusé ' + rel);
          fs.mkdirSync(path.dirname(cible), { recursive: true });
          const src = sur(actif, rel);
          if (src && loc && loc.fichiers[rel] === h && fs.existsSync(src)) { fs.copyFileSync(src, cible); continue; }
          const buf = await telecharger(site + rel.split('/').map(encodeURIComponent).join('/') + '?v=' + h.slice(0, 10), 60000);
          if (sha1(buf) !== h) throw new Error('empreinte fausse ' + rel);
          fs.writeFileSync(cible, buf); n++; octets += buf.length;
        }
        // écrit en dernier : un dossier sans version.json est considéré comme incomplet
        fs.writeFileSync(path.join(NOUVEAU, 'version.json'), JSON.stringify(dist));
        return { etat: 'pret', date: dist.date, n, octets };
      } catch (e) {
        try { fs.rmSync(NOUVEAU, { recursive: true, force: true }); } catch (e2) { }
        return { etat: 'erreur', msg: String(e && e.message || e) };
      }
    }
  };
}
module.exports = { creer, lireManifeste };
