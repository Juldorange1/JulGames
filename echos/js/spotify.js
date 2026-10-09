'use strict';
/* Import depuis Spotify.
   Spotify chiffre ses morceaux (DRM) : impossible de récupérer le fichier. On récupère donc le titre
   et la pochette depuis le lien, puis on ENREGISTRE le son de l'appli ou du site Spotify (capture audio
   de l'onglet ou du système, fonction standard du navigateur) pendant que le titre entier joue. */

const Spotify = (() => {
  function lireLien(texte) {
    const s = (texte || '').trim();
    let m = s.match(/open\.spotify\.com\/(?:intl-[a-z]{2}(?:-[a-z]{2})?\/)?(?:embed\/)?(track|album|playlist|episode)\/([A-Za-z0-9]{10,})/i);
    if (!m) m = s.match(/spotify:(track|album|playlist|episode):([A-Za-z0-9]{10,})/i);
    return m ? { type: m[1].toLowerCase(), id: m[2] } : null;
  }
  const estLienCourt = s => /spotify\.link\/|spoti\.fi\//i.test(s || '');

  async function infos(l) {
    try {
      const url = 'https://open.spotify.com/oembed?url=' + encodeURIComponent('https://open.spotify.com/' + l.type + '/' + l.id);
      const r = await fetch(url);
      if (!r.ok) return null;
      const j = await r.json();
      return { titre: j.title || '', pochette: j.thumbnail_url || '' };
    } catch (e) { return null; }
  }

  // Demande au navigateur l'autorisation de capturer le son (cet onglet, un autre onglet ou tout l'écran)
  async function capturer(ici) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) throw new Error('nonSupporte');
    const opts = {
      video: true,
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, suppressLocalAudioPlayback: false },
      systemAudio: 'include',
      surfaceSwitching: 'exclude',
      selfBrowserSurface: ici ? 'include' : 'exclude',
      preferCurrentTab: !!ici,
    };
    const flux = await navigator.mediaDevices.getDisplayMedia(opts);
    if (!flux.getAudioTracks().length) {
      flux.getTracks().forEach(t => t.stop());
      throw new Error('pasDeSon');
    }
    return flux;
  }

  /* Enregistre le son du flux. Rappels : duree (s, facultatif), niveau(0..1), etat(texte), temps(s), fini(blob|null).
     S'arrête tout seul à la fin du titre si sa durée est connue, sinon après 10 s de silence. */
  function enregistrer(flux, rappels) {
    const pistes = flux.getAudioTracks();
    const fluxAudio = new MediaStream(pistes);
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    const type = types.find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || '';
    const rec = new MediaRecorder(fluxAudio, type ? { mimeType: type, audioBitsPerSecond: 256000 } : {});
    const morceaux = [];
    let annule = false, fini = false;
    rec.ondataavailable = e => { if (e.data && e.data.size) morceaux.push(e.data); };
    rec.onstop = () => {
      flux.getTracks().forEach(t => t.stop());
      try { noeud.disconnect(); } catch (e) { /* rien */ }
      clearInterval(minuteur);
      rappels.fini(annule || !morceaux.length ? null : new Blob(morceaux, { type: rec.mimeType || type || 'audio/webm' }));
    };

    const ctx = Son.contexte();
    const noeud = ctx.createMediaStreamSource(fluxAudio);
    const an = ctx.createAnalyser();
    an.fftSize = 2048;
    noeud.connect(an); // pas relié aux haut-parleurs : aucun écho
    const buf = new Float32Array(an.fftSize);

    const debut = performance.now();
    let premierSon = null, dernierSon = null;
    const minuteur = setInterval(() => {
      an.getFloatTimeDomainData(buf);
      let s = 0;
      for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
      const rms = Math.sqrt(s / buf.length), db = 20 * Math.log10(rms + 1e-9);
      const now = performance.now();
      rappels.niveau(Math.max(0, Math.min(1, (db + 60) / 60)));
      if (db > -50) { if (premierSon == null) premierSon = now; dernierSon = now; }
      const duree = rappels.duree;
      if (premierSon == null) rappels.etat('En attente du son… lance le titre depuis le début dans Spotify ▶');
      else if (now - dernierSon > 1500) rappels.etat(duree ? 'Silence… (l’enregistrement continue jusqu’à la fin du titre)' : 'Silence… (arrêt automatique si la musique est finie)');
      else rappels.etat('Enregistrement en cours — laisse jouer jusqu’au bout');
      // temps écoulé depuis le début de la musique (et pas depuis le clic)
      rappels.temps(premierSon == null ? 0 : (now - premierSon) / 1000);
      if (duree && premierSon != null && now - premierSon > (duree + 1.5) * 1000) arreter(); // fin du titre atteinte
      else if (premierSon != null && dernierSon - premierSon > 8000 && now - dernierSon > (duree ? 20000 : 10000)) arreter();
      if (now - debut > 20 * 60 * 1000) arreter();
    }, 100);

    pistes.forEach(p => p.addEventListener('ended', () => arreter()));
    rec.start(1000);

    function arreter() { if (fini) return; fini = true; try { rec.stop(); } catch (e) { /* rien */ } }
    function annuler() { annule = true; arreter(); }
    return { arreter, annuler };
  }

  return { lireLien, estLienCourt, infos, capturer, enregistrer };
})();
