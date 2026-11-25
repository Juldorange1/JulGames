/* Bots créés : pour chaque coup, le moteur (pleine force) trouve les meilleurs coups dans l'ordre ;
   le bot joue le 1er, le 2e, le 3e… selon les pourcentages qu'on a choisis. */
(function () {
  'use strict';

  const CLE = 'echecs.bots';
  const MAX_RANGS = 10;
  const $ = (s) => document.querySelector(s);
  function el(tag, cls, texte) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (texte != null) e.textContent = texte;
    return e;
  }
  const copie = (o) => JSON.parse(JSON.stringify(o));
  function lire() { try { const l = JSON.parse(localStorage.getItem(CLE) || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; } }
  function ecrire(l) { localStorage.setItem(CLE, JSON.stringify(l)); }
  const rangTexte = (i) => (i === 0 ? '1er meilleur coup' : (i + 1) + 'e meilleur coup');

  const Bots = {
    MAX_RANGS,
    liste: lire,
    trouver(id) { const b = lire().find((x) => x.id === id); return b ? copie(b) : null; },
    enregistrer(b) {
      const l = lire();
      const i = l.findIndex((x) => x.id === b.id);
      if (i >= 0) l[i] = copie(b); else l.push(copie(b));
      ecrire(l);
    },
    supprimer(id) { ecrire(lire().filter((x) => x.id !== id)); },
    total(b) { return b.rangs.reduce((t, x) => t + (+x || 0), 0); },
    // résumé court, ex. « 70 % / 20 % / 10 % »
    resume(b) { return b.rangs.filter((x) => x > 0).length ? b.rangs.map((x) => x + ' %').join(' / ') : 'aucun coup'; },
    // choisit un rang (0 = meilleur) selon les pourcentages, parmi les « n » coups disponibles
    tirer(rangs, n) {
      const poids = rangs.slice(0, n).map((x) => Math.max(0, +x || 0));
      const tot = poids.reduce((a, b) => a + b, 0);
      if (!tot) return 0;
      let r = Math.random() * tot;
      for (let i = 0; i < poids.length; i++) { r -= poids[i]; if (r < 0) return i; }
      return poids.length - 1;
    }
  };

  // =====================================================================
  //  ÉDITEUR DE BOTS
  // =====================================================================
  const E = {
    bot: null,
    init() {
      $('#bo-nouveau').addEventListener('click', () => this.nouveau());
      $('#bo-nom').addEventListener('input', () => { if (!this.bot) return; this.bot.nom = $('#bo-nom').value.trim() || 'Sans nom'; this.sauver(); this.liste(); $('#bo-titre').textContent = this.bot.nom; });
      $('#bo-ajouter').addEventListener('click', () => {
        if (!this.bot || this.bot.rangs.length >= MAX_RANGS) return;
        this.bot.rangs.push(0); this.sauver(); this.remplir();
      });
      $('#bo-retirer').addEventListener('click', () => {
        if (!this.bot || this.bot.rangs.length <= 1) return;
        this.bot.rangs.pop(); this.sauver(); this.remplir();
      });
      $('#bo-repartir').addEventListener('click', () => {
        const b = this.bot; if (!b) return;
        const tot = Bots.total(b);
        if (!tot) { b.rangs = b.rangs.map((x, i) => (i === 0 ? 100 : 0)); }
        else {
          b.rangs = b.rangs.map((x) => Math.round((+x || 0) * 100 / tot));
          const ecart = 100 - Bots.total(b);
          const i = b.rangs.indexOf(Math.max(...b.rangs));
          b.rangs[i] += ecart;
        }
        this.sauver(); this.remplir();
      });
      $('#bo-jouer').addEventListener('click', () => { if (this.bot) window.App.jouerContre(this.bot.id); });
      $('#bo-supprimer').addEventListener('click', () => {
        const b = this.bot; if (!b) return;
        window.App.modale('<h2>Supprimer « ' + b.nom.replace(/</g, '') + ' » ?</h2>', [
          { texte: 'Supprimer', classe: 'danger', action: () => { Bots.supprimer(b.id); const l = Bots.liste(); this.bot = l.length ? l[0] : null; this.liste(); this.remplir(); } },
          { texte: 'Annuler' }
        ]);
      });
    },
    ouvrir() {
      const l = Bots.liste();
      const garde = this.bot && Bots.trouver(this.bot.id);
      this.bot = garde || l[0] || null;
      if (!this.bot) this.nouveau(true); else { this.liste(); this.remplir(); }
    },
    nouveau(silence) {
      const noms = new Set(Bots.liste().map((x) => x.nom));
      let i = 1;
      while (noms.has('Bot ' + i)) i++;
      this.bot = { id: 'b' + Date.now().toString(36), nom: 'Bot ' + i, rangs: [70, 20, 10] };
      this.sauver(); this.liste(); this.remplir();
      if (!silence) window.App.bulle('Nouveau bot : règle ses pourcentages.');
    },
    sauver() { if (this.bot) Bots.enregistrer(this.bot); },
    liste() {
      const box = $('#bo-liste');
      box.innerHTML = '';
      for (const b of Bots.liste()) {
        const x = el('button', 'ps-carte' + (this.bot && b.id === this.bot.id ? ' choisie' : ''));
        x.append(el('span', 'ca-icone', '🤖'), el('span', null, b.nom));
        x.addEventListener('click', () => { this.bot = copie(b); this.liste(); this.remplir(); });
        box.appendChild(x);
      }
    },
    remplir() {
      const b = this.bot;
      $('#bo-editeur').style.display = b ? '' : 'none';
      if (!b) return;
      $('#bo-titre').textContent = b.nom;
      $('#bo-nom').value = b.nom;
      const box = $('#bo-rangs');
      box.innerHTML = '';
      b.rangs.forEach((v, i) => {
        const ligne = el('div', 'bo-rang');
        const input = document.createElement('input');
        input.type = 'text'; input.inputMode = 'numeric'; input.value = v;
        input.addEventListener('input', () => {
          const n = parseInt(input.value.replace(/[^\d]/g, ''), 10);
          b.rangs[i] = isNaN(n) ? 0 : Math.min(100, n);
          this.sauver(); this.majTotal();
        });
        input.addEventListener('change', () => { input.value = b.rangs[i]; });
        const barre = el('div', 'bo-barre'); const plein = el('div', 'bo-plein'); barre.appendChild(plein);
        ligne.append(el('span', 'bo-libelle', rangTexte(i)), input, el('span', null, '%'), barre);
        box.appendChild(ligne);
      });
      $('#bo-ajouter').disabled = b.rangs.length >= MAX_RANGS;
      $('#bo-retirer').disabled = b.rangs.length <= 1;
      this.majTotal();
    },
    majTotal() {
      const b = this.bot;
      const tot = Bots.total(b);
      const t = $('#bo-total');
      t.textContent = 'Total : ' + tot + ' %' + (tot === 100 ? ' ✔' : ' — il faut 100 %');
      t.classList.toggle('faux', tot !== 100);
      document.querySelectorAll('#bo-rangs .bo-plein').forEach((p, i) => { p.style.width = Math.min(100, b.rangs[i] || 0) + '%'; });
    }
  };

  window.Bots = Bots;
  window.EditeurBots = E;
})();
