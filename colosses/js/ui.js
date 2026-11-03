'use strict';
/* Colosses — écrans hors combat : accueil, entraînement, défis, statistiques, succès, codex, paramètres, pause.
   En combat, tout se passe dans l'arène (pas d'écran entre les salles). */

const nomMaj = s => s.charAt(0).toUpperCase() + s.slice(1);
const UI = {
  el: null, retour: null, capture: null, ongletOpt: null,
  montrer(html, classe) {
    const e = this.el || (this.el = document.getElementById('ecran'));
    e.className = 'ouvert ' + (classe || '');
    e.style.setProperty('--zoom', Save.d.opts.zoomMenu || 1);
    e.innerHTML = html;
    e.scrollTop = 0;
    e.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); Son.init(); Son.play('clic'); this.action(b.dataset.a, b); }));
  },
  cacher() { const e = this.el || (this.el = document.getElementById('ecran')); e.className = ''; e.innerHTML = ''; },
  clavier() {
    if (!this.el || !this.el.classList.contains('ouvert') || this.capture) return;
    if (Input.hit('Space') || Input.hit('Enter') || Input.hit('NumpadEnter')) { const b = this.el.querySelector('[data-def]'); if (b) b.click(); }
    if (Input.hit('Escape')) { const b = this.el.querySelector('[data-echap]'); if (b) b.click(); }
    for (let i = 1; i <= 3; i++) if (Input.hit('Digit' + i) || Input.hit('Numpad' + i)) { const b = this.el.querySelector('[data-n="' + i + '"]'); if (b) b.click(); }
  },
  action(a, btn) {
    switch (a) {
      case 'jouer': this.cacher(); G.nouvellePartie(); break;
      case 'defi': this.cacher(); G.lancerDefi(btn.dataset.t); break;
      case 'diff': Save.d.diff = btn.dataset.d; Save.write(); calcStats(); this.menu(); break;
      case 'menu': G.mode = 'normal'; this.menu(); break;
      case 'ameliorations': this.ameliorations(); break;
      case 'codex': this.codex(btn.dataset.o || 'especes'); break;
      case 'stats': this.stats(); break;
      case 'succes': this.succes(); break;
      case 'entrainement': this.entrainement(); break;
      case 'entrEsp': Save.d.entrCfg.esp = btn.dataset.e; Save.write(); this.entrainement(); break;
      case 'entrGo': this.cacher(); G.lancerEntrainement(Object.assign({ seed: R.int(1, 2e9) }, Save.d.entrCfg)); break;
      case 'aide': this.aide(); break;
      case 'options': this.options(btn.dataset.o, btn.dataset.onglet); break;
      case 'retour': (this.retour || (() => this.menu()))(); break;
      case 'reprendre': this.reprendre(); break;
      case 'abandon': this.cacher(); G.abandonner(); break;
      case 'quitter': G.mode = 'normal'; this.menu(); break;
      case 'plein': if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => { }); break;
      case 'effacer':
        if (confirm('Effacer TOUTE ta progression (difficultés, défis, succès, améliorations, codex) ?')) { localStorage.removeItem(SAVE_KEY); Save.load(); G.opts = Save.d.opts; calcStats(); majAlerte(); this.menu(); }
        break;
    }
  },
  ecran(titre, corps, classe) {
    this.retour = () => this.menu();
    this.montrer(`<div class="panneau ${classe || ''}"><div class="barre-titre"><button class="rond" data-a="menu" data-echap title="Retour">←</button><h2>${titre}</h2></div>${corps}</div>`);
  },

  // ---------- Accueil ----------
  menu() {
    G.etat = 'menu';
    const d = Save.d, pr = PR(), df = DF();
    const salle = pr.run ? pr.run.salle : pr.palier * 5 + 1;
    const revanche = pr.run && pr.run.boss && pr.run.boss.salle === salle;
    const essais = (d.essais || {})[d.diff + ':' + salle] || 0;
    const nbS = Object.keys(d.succes || {}).length, totS = Object.keys(SUCCES).length;
    this.retour = () => this.menu();
    Musique.jouer(MUS.menu);
    const pills = Object.entries(DIFFS).map(([k, v], i) => `<button class="pill ${k === d.diff ? 'actif' : ''} d-${k}" data-a="diff" data-d="${k}" data-n="${i + 1}" title="${v.desc}">${v.ico} ${v.nom}</button>`).join('');
    const defi = type => {
      const x = defiCourant(type), rec = d.defis[type], bon = rec && rec.cle === x.cle && rec.best ? rec.best : null;
      return `<button class="defi2 d-${type}" data-a="defi" data-t="${type}" title="${x.mut.map(m => MUTATEURS[m].nom + ' : ' + MUTATEURS[m].desc).join('\n')}">
        <span class="di">${type === 'jour' ? '☀' : '🗓'}</span>
        <span class="dtx"><b>${type === 'jour' ? 'Défi du jour' : 'Défi de la semaine'}</b><span class="dm">${x.mut.map(m => MUTATEURS[m].ico).join(' ')} · ${x.boss.length} boss</span></span>
        <span class="dr">${bon ? '🏆 ' + bon.tues + '/' + x.boss.length + '<small>' + fmtTemps(bon.temps) + '</small>' : '—'}</span></button>`;
    };
    const tuile = (a, ico, nom, extra) => `<button class="tuile" data-a="${a}"><span>${ico}</span>${nom}${extra ? `<small>${extra}</small>` : ''}</button>`;
    this.montrer(`
      <div class="accueil">
        <h1 class="titre">COLOSSES</h1>
        <div class="pills">${pills}</div>
        <button class="jouer" data-a="jouer" data-def>▶ JOUER<small>${df.ico} Salle ${salle}${salle % 5 === 0 ? ' · méga boss' : ''}${revanche && essais ? ' · revanche ×' + essais : ''} · palier ${pr.palier}</small></button>
        <div class="defis2">${defi('jour')}${defi('semaine')}</div>
        <div class="tuiles">
          ${tuile('entrainement', '🎯', 'Entraînement')}
          ${tuile('ameliorations', '⬆', 'Améliorations')}
          ${tuile('codex', '📖', 'Codex')}
          ${tuile('stats', '📊', 'Statistiques')}
          ${tuile('succes', '🏆', 'Succès', nbS + '/' + totS)}
          ${tuile('options', '⚙', 'Paramètres')}
          ${tuile('aide', '❔', 'Aide')}
        </div>
      </div>`, 'fond');
  },

  // ---------- Pause ----------
  pause() {
    if (G.etat !== 'pause') G.etatAvantPause = G.etat;
    G.etat = 'pause';
    Musique.baisser(.3);
    this.retour = () => this.pause();
    this.montrer(`
      <div class="panneau court pause">
        <h2>Pause</h2>
        <div class="rang col"><button class="gros" data-a="reprendre" data-def>▶ Reprendre</button>
        <button data-a="options" data-o="pause">⚙ Paramètres</button>
        <button data-a="aide" data-o="pause">❔ Aide</button>
        ${G.mode === 'entrainement' ? '<button data-a="quitter">Quitter l\'entraînement</button>' : '<button class="danger" data-a="abandon">Abandonner ce combat</button>'}</div>
      </div>`);
  },
  reprendre() {
    this.cacher();
    const e = G.etatAvantPause;
    G.etat = e === 'combat' || e === 'interlude' ? e : 'combat';
    Musique.baisser(1); Input.clear();
  },

  // ---------- Entraînement ----------
  entrainement() {
    const d = Save.d, cx = d.codex;
    const cfg = d.entrCfg = d.entrCfg || { esp: 'bourreau', salle: 6, p: '', s: '', t: '' };
    const ids = ESP_ORDRE.concat(['chimere']);
    const tuiles = ids.map(i => {
      const e = ESPECES[i], vu = cx.especes[i];
      return `<button class="esp ${cfg.esp === i ? 'actif' : ''} ${vu ? '' : 'verrou'}" ${vu ? `data-a="entrEsp" data-e="${i}"` : 'disabled'} style="--ec:${e.hue != null ? hsl(e.hue, 90, 62) : '#ccc'}">
        <b>${vu ? nomMaj(e.nom) : '???'}</b><span>${'★'.repeat(etoiles(i))}${'☆'.repeat(3 - etoiles(i))}</span></button>`;
    }).join('');
    const sel = (cat, id) => `<label class="opt">${{ p: '🔫 Arme', s: '💥 Spéciale', t: '💨 Talent' }[cat]}<select id="${id}"><option value="">Au hasard</option>${ARS[cat].filter(a => cx.arm[cat + ':' + a.id]).map(a => `<option value="${a.id}" ${cfg[cat] === a.id ? 'selected' : ''}>${a.ico} ${a.nom}</option>`).join('')}</select></label>`;
    this.ecran('🎯 Entraînement', `
      <p class="mini">Affronte l'espèce de ton choix autant que tu veux, sans rien perdre ni gagner.</p>
      <div class="grille-esp">${tuiles}</div>
      <label class="opt">Niveau <input type="range" min="1" max="60" step="1" value="${cfg.salle}" id="e-salle"><span class="val" id="e-salle-v">salle ${cfg.salle}</span></label>
      ${sel('p', 'e-p')}${sel('s', 'e-s')}${sel('t', 'e-t')}
      <div class="rang"><button class="gros" data-a="entrGo" data-def ${cx.especes[cfg.esp] ? '' : 'disabled'}>▶ Lancer</button></div>`);
    const q = id => document.getElementById(id);
    q('e-salle').addEventListener('input', e => { cfg.salle = +e.target.value; q('e-salle-v').textContent = 'salle ' + cfg.salle; Save.write(); });
    for (const c of ['p', 's', 't']) q('e-' + c).addEventListener('change', e => { cfg[c] = e.target.value; Save.write(); });
  },

  // ---------- Statistiques ----------
  stats() {
    const d = Save.d, s = d.stats;
    const h = Math.floor(s.temps / 3600), m = Math.floor(s.temps % 3600 / 60);
    const gros = (v, n) => `<div class="stat"><b>${v}</b><span>${n}</span></div>`;
    const barres = (obj, nom, n) => {
      const l = Object.entries(obj || {}).sort((a, b) => b[1] - a[1]).slice(0, n || 5);
      if (!l.length) return '<p class="mini">Pas encore de données.</p>';
      const max = l[0][1];
      return l.map(([k, v]) => `<div class="barre-st"><span>${nom(k)}</span><i style="width:${Math.max(4, v / max * 100)}%"></i><b>${v}</b></div>`).join('');
    };
    const nomArme = k => { const a = PRIM.find(x => x.id === k); return a ? a.ico + ' ' + a.nom : k; };
    const nomAtk = k => ATK[k] ? ATK[k].nom : { contact: 'Contact du boss', lave: 'Lave', invocation: 'Invocations', abandon: 'Abandon', inconnu: '?' }[k] || k;
    const esp = ESP_ORDRE.concat(['chimere']).filter(e => d.codex.especes[e]);
    this.ecran('📊 Statistiques', `
      <div class="stats-g">
        ${gros(h + ' h ' + m + ' min', 'temps de jeu')}${gros(s.boss, 'boss vaincus')}${gros(s.mega, 'méga boss')}${gros(s.morts, 'morts')}
        ${gros(s.parades || 0, 'parades')}${gros(Math.round((s.degats || 0) / 1000) + ' k', 'dégâts infligés')}${gros(s.coups || 0, 'coups reçus')}${gros(s.defisReussis || 0, 'défis réussis')}
      </div>
      <div class="blocs">
        <div class="bloc"><h3>Par difficulté</h3>${Object.entries(DIFFS).map(([k, v]) => `<div class="ligne"><span>${v.ico} ${v.nom}</span><b>palier ${d.prog[k].palier} · salle ${d.prog[k].record}</b></div>`).join('')}</div>
        <div class="bloc"><h3>Armes favorites</h3>${barres(s.tuesArme, nomArme)}</div>
        <div class="bloc"><h3>Ce qui te tue le plus</h3>${barres(s.mortsAttaque, nomAtk)}</div>
      </div>
      <h4>Espèces</h4>
      <div class="tab-esp">${esp.map(e => { const v = d.codex.especes[e], t = (d.especesTemps || {})[e]; return `<div><b>${nomMaj(ESPECES[e].nom)}</b><span>${'★'.repeat(etoiles(e))}${'☆'.repeat(3 - etoiles(e))}</span><span>${v.tues} / ${v.vus}</span><span>${t ? fmtTemps(t) : '—'}</span></div>`; }).join('') || '<p class="mini">Aucune espèce rencontrée.</p>'}</div>
      <p class="mini">Étoiles · tuées / rencontrées · meilleur temps. ★ vaincue · ★★ sans être touché ou en moins d'une minute · ★★★ en Cauchemar.</p>`);
  },

  // ---------- Succès ----------
  succes() {
    const fait = Save.d.succes || {};
    const n = Object.keys(fait).length, tot = Object.keys(SUCCES).length;
    this.ecran('🏆 Succès <small>' + n + ' / ' + tot + '</small>', `<div class="grille-succes">${Object.entries(SUCCES).map(([id, x]) => {
      const ok = !!fait[id], pr = !ok && x.obj ? Math.min(1, x.obj()) : 0;
      return `<div class="succes ${ok ? 'ok' : ''}"><span class="si">${x.ico}</span><b>${x.nom}</b><span class="sd">${x.desc}</span>${ok ? `<span class="sdate">${new Date(fait[id]).toLocaleDateString('fr-FR')}</span>` : pr ? `<i class="sp"><i style="width:${pr * 100}%"></i></i>` : ''}</div>`;
    }).join('')}</div>`);
  },

  // ---------- Améliorations ----------
  ameliorations() {
    const bloc = cat => `<div class="bloc c-${cat}"><h3>${CAT_NOM[cat]}</h3>${UPG[cat].map(u => `<div class="ligne"><span>${u.ico} ${u.nom}</span><b>niv. ${lv(cat, u.id)}${u.max ? ' / ' + u.max : ''}</b><em>${u.desc}</em></div>`).join('')}</div>`;
    this.ecran('⬆ Améliorations — ' + DF().nom, `<p class="mini">Un méga boss vaincu = une orbe d'amélioration au choix, pour toujours.</p><div class="blocs">${bloc('p')}${bloc('s')}${bloc('t')}</div>`);
  },

  // ---------- Codex ----------
  codex(o) {
    const cx = Save.d.codex;
    const onglets = [['especes', 'Bestiaire'], ['att', 'Attaques'], ['reliques', 'Reliques'], ['traits', 'Mutations'], ['cartes', 'Arènes'], ['invoc', 'Invocations'], ['arm', 'Arsenal']];
    let corps = '';
    const inconnu = t => `<div class="entree inconnu"><b>???</b><p>${t}</p></div>`;
    if (o === 'especes') {
      const ids = ESP_ORDRE.concat(['chimere']);
      corps = `<div class="liste large">` + ids.map(i => {
        const e = ESPECES[i], v = cx.especes[i];
        if (!v) return inconnu('Pas encore rencontrée.');
        const cyc = e.phases.map((ph, k) => `<div class="cyc"><span>Phase ${k + 1}</span> ${ph.cycle.map(id => ATK[id].nom).join(' → ')}</div>`).join('');
        return `<div class="entree"><b style="color:${e.hue != null ? hsl(e.hue, 100, 66) : '#ddd'}">${nomMaj(e.nom)} <span class="etoiles">${'★'.repeat(etoiles(i))}</span></b><span class="cpt">${v.tues} / ${v.vus}</span><p>${e.meca}</p>${cyc}</div>`;
      }).join('') + '</div>';
    } else if (o === 'att') {
      const ids = Object.keys(ATK);
      corps = `<p class="mini">${ids.filter(i => cx.att[i]).length} / ${ids.length} découvertes</p><div class="liste">` + ids.map(i => cx.att[i] ? `<div class="entree"><b>${ATK[i].nom}</b><span class="cpt">${cx.att[i]}×</span><p>${ATK[i].conseil}</p></div>` : inconnu('Pas encore rencontrée.')).join('') + '</div>';
    } else if (o === 'reliques') {
      corps = '<p class="mini">Après chaque boss, deux reliques apparaissent : prends-en une. Elles durent jusqu\'au prochain méga boss.</p><div class="liste">' + Object.values(RELIQUES).map(r => `<div class="entree"><b>${r.ico} ${r.nom}</b><p>${r.desc}</p></div>`).join('') + '</div>';
    } else if (o === 'traits') {
      corps = '<div class="liste">' + Object.keys(TRAITS).map(t => cx.traits[t] ? `<div class="entree"><b>${TRAITS[t].ico} ${TRAITS[t].nom}</b><p>${TRAITS[t].desc}</p></div>` : inconnu('Pas encore rencontrée.')).join('') + '</div>';
    } else if (o === 'cartes') {
      corps = '<div class="liste">' + Object.keys(CARTES).map(t => cx.cartes[t] ? `<div class="entree"><b>${CARTES[t].nom}</b><p>${CARTES[t].desc}</p></div>` : inconnu('Pas encore visitée.')).join('') + '</div>';
    } else if (o === 'invoc') {
      corps = '<div class="liste">' + Object.keys(INVOC).map(t => cx.invoc[t] ? `<div class="entree"><b>${INVOC[t].nom}</b><p>${INVOC[t].desc}</p></div>` : inconnu('Pas encore rencontrées.')).join('') + '</div>';
    } else {
      corps = ['p', 's', 't'].map(cat => `<h4>${CAT_NOM[cat]} (${ARS[cat].filter(a => cx.arm[cat + ':' + a.id]).length} / ${ARS[cat].length})</h4><div class="liste">` + ARS[cat].map(a => cx.arm[cat + ':' + a.id] ? `<div class="entree"><b>${a.ico} ${a.nom}</b><p>${a.desc}</p></div>` : inconnu('Jamais tirée au sort.')).join('') + '</div>').join('');
    }
    this.ecran('📖 Codex', `<div class="onglets">${onglets.map(([k, n]) => `<button data-a="codex" data-o="${k}" class="${k === o ? 'actif' : ''}">${n}</button>`).join('')}</div>${corps}`);
  },

  // ---------- Aide ----------
  aide() {
    const ret = this.retour, K = TOUCHES(), nt = c => c.replace(/^Key/, '').replace('Space', 'Espace').replace('ShiftLeft', 'Maj');
    this.montrer(`
      <div class="panneau">
        <div class="barre-titre"><button class="rond" data-a="retour" data-echap title="Retour">←</button><h2>❔ Aide</h2></div>
        <div class="aide-g">
          <div><kbd>ZQSD</kbd><span>se déplacer</span></div><div><kbd>Souris</kbd><span>viser</span></div>
          <div><kbd>Clic G</kbd><span>arme</span></div><div><kbd>Clic D</kbd> <kbd>${nt(K.spec)}</kbd><span>spéciale</span></div>
          <div><kbd>${nt(K.tal)}</kbd><span>talent</span></div><div><kbd>Échap</kbd><span>pause</span></div>
        </div>
        <div class="blocs">
          <div class="bloc"><h3>🔴 Survivre</h3><p>Seul le <b>point rouge</b> de ton héros est touchable. Tout ce qui fait mal est <b>annoncé</b> avant ; quand ça clignote blanc, ça part.</p></div>
          <div class="bloc"><h3>🧠 Apprendre</h3><p>Chaque espèce répète <b>toujours le même cycle</b>. Contour doré = <b>OUVERT</b> : frappe fort. Si tu meurs, tu rejoues le même boss.</p></div>
          <div class="bloc"><h3>📈 Progresser</h3><p>Après chaque boss : une <b>relique</b> au choix (jusqu'au méga boss). Méga boss : une <b>amélioration</b> pour toujours.</p></div>
        </div>
      </div>`);
    this.retour = ret;
  },

  // ---------- Paramètres ----------
  options(o, onglet) {
    const op = Save.d.opts, depuis = o === 'pause' ? 'pause' : 'menu';
    onglet = onglet || this.ongletOpt || 'son'; this.ongletOpt = onglet;
    this.retour = depuis === 'pause' ? () => this.pause() : () => this.menu();
    const nomTouche = c => ({ Space: 'Espace', ShiftLeft: 'Maj gauche', ShiftRight: 'Maj droite', KeyP: 'P', KeyE: 'E', Escape: 'Échap', ControlLeft: 'Ctrl', AltLeft: 'Alt', Tab: 'Tab' }[c] || c.replace(/^Key/, '').replace(/^Digit/, ''));
    const curseur = (id, nom, val, min, max, pas) => `<label class="opt">${nom}<input type="range" min="${min}" max="${max}" step="${pas}" value="${val}" id="${id}"><span class="val" id="${id}-v">${Math.round(val * 100)} %</span></label>`;
    const coche = (id, nom, val) => `<label class="opt interr"><span>${nom}</span><input type="checkbox" id="${id}" ${val ? 'checked' : ''}><i></i></label>`;
    const choix = (id, nom, val, liste) => `<label class="opt">${nom}<select id="${id}">${liste.map(([k, n]) => `<option value="${k}" ${String(k) === String(val) ? 'selected' : ''}>${n}</option>`).join('')}</select></label>`;
    let corps = '';
    if (onglet === 'son') corps = curseur('o-master', 'Général', op.master, 0, 1, .05) + curseur('o-vol', 'Bruitages', op.vol, 0, 1, .05) + curseur('o-mus', 'Musique', op.musique, 0, 1, .05) +
      `<div class="rang"><button id="o-test">🔊 Tester le son</button></div><p class="mini">Rien n'est audible ? Vérifie la sortie audio de Windows (ton casque doit être la sortie par défaut).</p>`;
    else if (onglet === 'image') corps = coche('o-lum', 'Halos lumineux', op.lumiere) + coche('o-decor', 'Brume et poussière', op.decorAnime) +
      choix('o-part', 'Particules', op.particules, [['faible', 'Peu'], ['normale', 'Normales'], ['elevee', 'Beaucoup']]) +
      curseur('o-tremble', 'Tremblements', +op.tremble, 0, 1, .1) + curseur('o-lumi', 'Luminosité', op.luminosite, .7, 1.4, .05) +
      choix('o-alerte', 'Zones dangereuses', op.alerte, [['rouge', 'Rouge'], ['magenta', 'Magenta'], ['jaune', 'Jaune']]) +
      coche('o-contour', 'Contour noir autour des balles ennemies', op.contour) +
      choix('o-viseur', 'Viseur', op.viseur, [['systeme', 'Curseur normal'], ['croix', 'Croix'], ['cercle', 'Cercle'], ['point', 'Point']]) +
      `<label class="opt">Couleur du viseur<input type="color" id="o-vcol" value="${op.viseurCol}"></label>` + coche('o-fps', 'Images par seconde', op.fps);
    else if (onglet === 'jeu') corps = coche('o-auto', 'Tir automatique', op.auto) + coche('o-chiffres', 'Chiffres de dégâts', op.chiffres) +
      coche('o-noms', 'Nom des attaques du boss', op.nomsAttaques) + coche('o-chrono', 'Chronomètre', op.chrono) + coche('o-pause', 'Pause quand la fenêtre est quittée', op.autoPause) +
      choix('o-vit', 'Vitesse du jeu', op.vitesse, [[1, '100 %'], [.85, '85 %'], [.7, '70 % (plus facile)']]) +
      curseur('o-zoom', 'Taille des menus', op.zoomMenu, .8, 1.4, .05) +
      `<div class="rang"><button data-a="plein">⛶ Plein écran</button></div>`;
    else corps = [['spec', 'Spéciale'], ['tal', 'Talent'], ['tal2', 'Talent (2e touche)'], ['pause', 'Pause']].map(([k, n]) => `<div class="ligne touche-l"><span>${n}</span><button class="tch" data-k="${k}">${this.capture === k ? '… appuie' : nomTouche(op.touches[k])}</button></div>`).join('') + '<p class="mini">Clique puis appuie sur la nouvelle touche.</p>';
    const onglets = [['son', '🔊 Son'], ['image', '🖼 Image'], ['jeu', '🎮 Jeu'], ['commandes', '⌨ Touches']];
    this.montrer(`
      <div class="panneau court">
        <div class="barre-titre"><button class="rond" data-a="retour" data-echap title="Retour">←</button><h2>⚙ Paramètres</h2></div>
        <div class="onglets">${onglets.map(([k, n]) => `<button data-a="options" data-o="${depuis}" data-onglet="${k}" class="${k === onglet ? 'actif' : ''}">${n}</button>`).join('')}</div>
        <div class="opts">${corps}</div>
        ${depuis === 'pause' ? '' : '<div class="rang"><button class="danger petit" data-a="effacer">Effacer la progression</button></div>'}
      </div>`);
    const q = id => document.getElementById(id);
    const lier = (id, fn, ev) => { const e = q(id); if (e) e.addEventListener(ev || 'change', x => { fn(x.target); Save.write(); }); };
    const pct = (id, v) => { const e = q(id + '-v'); if (e) e.textContent = Math.round(v * 100) + ' %'; };
    lier('o-master', t => { op.master = +t.value; pct('o-master', op.master); Son.init(); Son.setVol(); }, 'input');
    lier('o-vol', t => { op.vol = +t.value; pct('o-vol', op.vol); Son.init(); Son.setVol(); }, 'input');
    lier('o-mus', t => { op.musique = +t.value; pct('o-mus', op.musique); }, 'input');
    lier('o-tremble', t => { op.tremble = +t.value; pct('o-tremble', op.tremble); }, 'input');
    lier('o-lumi', t => { op.luminosite = +t.value; pct('o-lumi', op.luminosite); appliquerAffichage(); }, 'input');
    lier('o-zoom', t => { op.zoomMenu = +t.value; pct('o-zoom', op.zoomMenu); this.el.style.setProperty('--zoom', op.zoomMenu); }, 'input');
    lier('o-lum', t => op.lumiere = t.checked); lier('o-decor', t => op.decorAnime = t.checked);
    lier('o-part', t => op.particules = t.value); lier('o-alerte', t => { op.alerte = t.value; majAlerte(); });
    lier('o-contour', t => op.contour = t.checked); lier('o-viseur', t => op.viseur = t.value); lier('o-vcol', t => op.viseurCol = t.value, 'input');
    lier('o-fps', t => op.fps = t.checked); lier('o-auto', t => op.auto = t.checked); lier('o-chiffres', t => op.chiffres = t.checked);
    lier('o-noms', t => op.nomsAttaques = t.checked); lier('o-pause', t => op.autoPause = t.checked); lier('o-chrono', t => op.chrono = t.checked);
    lier('o-vit', t => op.vitesse = +t.value);
    const test = q('o-test');
    if (test) test.addEventListener('click', () => { Son.init(); Son.play('explo'); setTimeout(() => Son.play('parade'), 350); Musique.sting(MUS.victoire); });
    this.el.querySelectorAll('.tch').forEach(b => b.addEventListener('click', ev => {
      ev.stopPropagation(); this.capture = b.dataset.k; b.textContent = '… appuie';
      const ecoute = e => {
        e.preventDefault(); removeEventListener('keydown', ecoute, true);
        if (e.code !== 'Escape') op.touches[this.capture] = e.code;
        this.capture = null; Save.write(); Input.clear(); this.options(o, 'commandes');
      };
      addEventListener('keydown', ecoute, true);
    }));
  }
};
function appliquerAffichage() { const c = document.getElementById('jeu'); if (c) c.style.filter = Save.d.opts.luminosite && Save.d.opts.luminosite !== 1 ? `brightness(${Save.d.opts.luminosite})` : ''; }
