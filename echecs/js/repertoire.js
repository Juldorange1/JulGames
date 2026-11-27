/* Mes parties : un répertoire de dossiers où l'on range ses parties pour les revoir (bilan). */
(function () {
  'use strict';

  const CLE = 'echecs.repertoire';
  const $ = (s) => document.querySelector(s);
  const copie = (o) => JSON.parse(JSON.stringify(o));
  const echap = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function lire() {
    try { const d = JSON.parse(localStorage.getItem(CLE) || 'null'); if (d && Array.isArray(d.dossiers) && Array.isArray(d.parties)) return d; } catch (e) { /* rien */ }
    return { dossiers: [], parties: [] };
  }
  function ecrire(d) {
    try { localStorage.setItem(CLE, JSON.stringify(d)); return true; } catch (e) { window.App.bulle('Plus de place pour enregistrer : supprime quelques parties.'); return false; }
  }
  const nouvelId = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const DERNIERES = '_dernieres';
  const dateTexte = (t) => { const d = new Date(t); return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); };
  const nomParDefaut = (rec) => (rec.blancs || 'Blancs').replace(/ \(.*$/, '') + ' contre ' + (rec.noirs || 'Noirs').replace(/ \(.*$/, '');

  const R = {
    dossier: DERNIERES,
    page: 0,

    // Fenêtre « Enregistrer » : nom + dossier (existant ou nouveau)
    enregistrer(rec) {
      if (!rec || !rec.coups) return;
      const d = lire();
      const opts = d.dossiers.map((x) => '<option value="' + x.id + '">📁 ' + echap(x.nom) + '</option>').join('') + '<option value="_nouveau">➕ Nouveau dossier…</option>';
      const c = window.App.modale(
        '<h2>💾 Enregistrer la partie</h2>' +
        '<label class="champ">Nom de la partie<input type="text" id="rep-nom" maxlength="40"></label>' +
        '<label class="champ">Dossier<select id="rep-dossier">' + opts + '</select></label>' +
        '<label class="champ" id="rep-nouveau-l">Nom du nouveau dossier<input type="text" id="rep-nouveau-nom" maxlength="30" value="Mes parties"></label>',
        [{ texte: '💾 Enregistrer', classe: 'principal', action: () => this._valider(rec, c) }, { texte: 'Annuler' }]);
      c.querySelector('#rep-nom').value = rec.nom || nomParDefaut(rec);
      const sel = c.querySelector('#rep-dossier');
      if (this.dossier !== DERNIERES && d.dossiers.some((x) => x.id === this.dossier)) sel.value = this.dossier;
      else if (d.dossiers.length) sel.value = d.dossiers[0].id;
      else sel.value = '_nouveau';
      const maj = () => { c.querySelector('#rep-nouveau-l').style.display = sel.value === '_nouveau' ? '' : 'none'; };
      sel.onchange = maj; maj();
    },
    _valider(rec, c) {
      const d = lire();
      let dos = c.querySelector('#rep-dossier').value;
      if (dos === '_nouveau') {
        const nom = (c.querySelector('#rep-nouveau-nom').value || '').trim() || 'Mes parties';
        const ex = d.dossiers.find((x) => x.nom.toLowerCase() === nom.toLowerCase());
        if (ex) dos = ex.id;
        else { dos = nouvelId('d'); d.dossiers.push({ id: dos, nom }); }
      }
      const p = copie(rec);
      p.nom = (c.querySelector('#rep-nom').value || '').trim() || nomParDefaut(rec);
      p.dossier = dos;
      p.sauve = Date.now();
      // la même partie déjà rangée dans ce dossier : on la met à jour
      const i = d.parties.findIndex((x) => x.id === rec.id && x.dossier === dos);
      p.rep = i >= 0 ? d.parties[i].rep : nouvelId('p');
      if (i >= 0) d.parties[i] = p; else d.parties.unshift(p);
      if (ecrire(d)) window.App.bulle('Partie enregistrée dans « ' + d.dossiers.find((x) => x.id === dos).nom + ' » (menu 📁 Mes parties).');
      if (window.App.ecranActuel === 'repertoire') this.afficher();
    },
    // le bilan d'une partie rangée garde son analyse dans le répertoire
    maj(rec) {
      const d = lire();
      const i = d.parties.findIndex((x) => x.rep === rec.rep);
      if (i < 0) return;
      d.parties[i] = copie(rec);
      ecrire(d);
    },

    // ---------- écran « Mes parties » ----------
    init() {
      $('#rep-nouveau').addEventListener('click', () => {
        const c = window.App.modale('<h2>📁 Nouveau dossier</h2><label class="champ">Nom<input type="text" id="rep-dos-nom" maxlength="30"></label>', [
          { texte: 'Créer', classe: 'principal', action: () => {
            const nom = (c.querySelector('#rep-dos-nom').value || '').trim();
            if (!nom) return;
            const d = lire(); const id = nouvelId('d'); d.dossiers.push({ id, nom }); ecrire(d);
            this.dossier = id; this.page = 0; this.afficher();
          } },
          { texte: 'Annuler' }]);
        setTimeout(() => c.querySelector('#rep-dos-nom').focus(), 30);
      });
      window.addEventListener('resize', () => { if (window.App.ecranActuel === 'repertoire') this.afficher(); });
    },
    ouvrir() { this.page = 0; this.afficher(); },
    partiesDe(id) {
      if (id === DERNIERES) return window.App.parties();
      return lire().parties.filter((x) => x.dossier === id);
    },
    afficher() {
      const d = lire();
      if (this.dossier !== DERNIERES && !d.dossiers.some((x) => x.id === this.dossier)) this.dossier = DERNIERES;
      // dossiers
      const box = $('#rep-dossiers');
      box.innerHTML = '';
      const ligne = (id, icone, nom, n) => {
        const b = document.createElement('button');
        b.className = 'ps-carte' + (this.dossier === id ? ' choisie' : '');
        b.innerHTML = '<span class="ca-icone">' + icone + '</span><span class="rep-dnom"></span><span class="rep-compte">' + n + '</span>';
        b.querySelector('.rep-dnom').textContent = nom;
        b.onclick = () => { this.dossier = id; this.page = 0; this.afficher(); };
        box.appendChild(b);
      };
      ligne(DERNIERES, '🕘', 'Dernières parties', window.App.parties().length);
      for (const x of d.dossiers) ligne(x.id, '📁', x.nom, d.parties.filter((p) => p.dossier === x.id).length);
      // en-tête du dossier
      const dos = d.dossiers.find((x) => x.id === this.dossier);
      $('#rep-titre').textContent = dos ? '📁 ' + dos.nom : '🕘 Dernières parties';
      const act = $('#rep-actions');
      act.innerHTML = '';
      if (dos) {
        const ren = document.createElement('button'); ren.className = 'bouton'; ren.textContent = '📝 Renommer';
        ren.onclick = () => {
          const c = window.App.modale('<h2>📝 Renommer le dossier</h2><label class="champ">Nom<input type="text" id="rep-dos-nom" maxlength="30"></label>', [
            { texte: 'Renommer', classe: 'principal', action: () => { const n = (c.querySelector('#rep-dos-nom').value || '').trim(); if (!n) return; const dd = lire(); dd.dossiers.find((x) => x.id === dos.id).nom = n; ecrire(dd); this.afficher(); } },
            { texte: 'Annuler' }]);
          c.querySelector('#rep-dos-nom').value = dos.nom;
        };
        const sup = document.createElement('button'); sup.className = 'bouton danger'; sup.textContent = '🗑 Supprimer le dossier';
        sup.onclick = () => {
          const n = d.parties.filter((p) => p.dossier === dos.id).length;
          window.App.modale('<h2>Supprimer « ' + echap(dos.nom) + ' » ?</h2><p>' + (n ? 'Les ' + n + ' partie' + (n > 1 ? 's' : '') + ' de ce dossier seront supprimée' + (n > 1 ? 's' : '') + ' aussi. On ne peut pas revenir en arrière.' : 'Le dossier est vide.') + '</p>', [
            { texte: 'Supprimer', classe: 'danger', action: () => { const dd = lire(); dd.dossiers = dd.dossiers.filter((x) => x.id !== dos.id); dd.parties = dd.parties.filter((p) => p.dossier !== dos.id); ecrire(dd); this.dossier = DERNIERES; this.afficher(); } },
            { texte: 'Annuler' }]);
        };
        act.append(ren, sup);
      }
      // parties (par pages : rien ne défile)
      const liste = $('#rep-liste');
      liste.innerHTML = '';
      const tout = this.partiesDe(this.dossier);
      const H = liste.getBoundingClientRect().height || 400;
      const parPage = Math.max(2, Math.floor((H + 8) / 78));
      const pages = Math.max(1, Math.ceil(tout.length / parPage));
      this.page = Math.min(this.page, pages - 1);
      if (!tout.length) {
        const p = document.createElement('p'); p.className = 'petit-gris';
        p.textContent = dos ? 'Ce dossier est vide. Pour y ranger une partie : bouton « 💾 Enregistrer » pendant la partie, à la fin, ou dans le bilan.' : 'Aucune partie terminée pour l’instant.';
        liste.appendChild(p);
      }
      for (const rec of tout.slice(this.page * parPage, (this.page + 1) * parPage)) liste.appendChild(this.ligneP(rec, !!dos, d));
      const pg = $('#rep-pages');
      pg.innerHTML = '';
      if (pages > 1) {
        const prec = document.createElement('button'); prec.className = 'bouton'; prec.textContent = '◀'; prec.disabled = this.page === 0;
        prec.onclick = () => { this.page--; this.afficher(); };
        const t = document.createElement('span'); t.textContent = 'Page ' + (this.page + 1) + ' / ' + pages;
        const suiv = document.createElement('button'); suiv.className = 'bouton'; suiv.textContent = '▶'; suiv.disabled = this.page >= pages - 1;
        suiv.onclick = () => { this.page++; this.afficher(); };
        pg.append(prec, t, suiv);
      }
    },
    ligneP(rec, range, d) {
      const x = document.createElement('div');
      x.className = 'rep-partie';
      const res = rec.resultat === '1/2-1/2' ? '½–½' : rec.resultat === '*' ? 'en cours' : String(rec.resultat).replace('-', '–');
      const n = Math.ceil((rec.coups || []).length / 2);
      x.innerHTML = '<div class="rep-infos"><b></b><span></span></div><div class="rep-boutons"></div>';
      x.querySelector('b').textContent = rec.nom || nomParDefaut(rec);
      x.querySelector('span').textContent = (rec.varianteNom || (rec.variante && rec.variante.nom) || 'Partie normale') + ' · ' + res + ' · ' + n + ' coup' + (n > 1 ? 's' : '') + ' · ' + dateTexte(rec.sauve || rec.date);
      const bt = x.querySelector('.rep-boutons');
      const bouton = (t, cls, f, titre) => { const b = document.createElement('button'); b.className = 'bouton ' + (cls || ''); b.textContent = t; if (titre) b.title = titre; b.onclick = f; bt.appendChild(b); };
      bouton('📊 Revoir', 'principal', () => window.Bilan.ouvrir(rec), 'Ouvrir le bilan de la partie');
      if (!range) bouton('💾 Ranger', '', () => this.enregistrer(rec), 'Ranger cette partie dans un dossier');
      else {
        bouton('📝', '', () => {
          const c = window.App.modale('<h2>📝 Renommer la partie</h2><label class="champ">Nom<input type="text" id="rep-p-nom" maxlength="40"></label>', [
            { texte: 'Renommer', classe: 'principal', action: () => { const v = (c.querySelector('#rep-p-nom').value || '').trim(); if (!v) return; const dd = lire(); const p = dd.parties.find((y) => y.rep === rec.rep); if (p) p.nom = v; ecrire(dd); this.afficher(); } },
            { texte: 'Annuler' }]);
          c.querySelector('#rep-p-nom').value = rec.nom || '';
        }, 'Renommer');
        if (d.dossiers.length > 1) bouton('📁', '', () => {
          const c = window.App.modale('<h2>📁 Déplacer vers…</h2><label class="champ">Dossier<select id="rep-dep">' + d.dossiers.filter((y) => y.id !== rec.dossier).map((y) => '<option value="' + y.id + '">' + echap(y.nom) + '</option>').join('') + '</select></label>', [
            { texte: 'Déplacer', classe: 'principal', action: () => { const dd = lire(); const p = dd.parties.find((y) => y.rep === rec.rep); if (p) p.dossier = c.querySelector('#rep-dep').value; ecrire(dd); this.afficher(); } },
            { texte: 'Annuler' }]);
        }, 'Déplacer vers un autre dossier');
        bouton('🗑', 'danger', () => {
          window.App.modale('<h2>Supprimer « ' + echap(rec.nom || nomParDefaut(rec)) + ' » ?</h2><p>On ne peut pas revenir en arrière.</p>', [
            { texte: 'Supprimer', classe: 'danger', action: () => { const dd = lire(); dd.parties = dd.parties.filter((y) => y.rep !== rec.rep); ecrire(dd); this.afficher(); } },
            { texte: 'Annuler' }]);
        }, 'Supprimer');
      }
      return x;
    }
  };

  window.Repertoire = R;
})();
