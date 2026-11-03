'use strict';
/* Colosses — écrans hors combat : menu (difficulté), pause, codex, tableau de chasse, aide, options.
   En combat, tout se passe dans l'arène (pas d'écran entre les salles). */

const UI = {
  el: null, retour: null, capture: null, ongletOpt: null,
  montrer(html, classe) {
    const e = this.el || (this.el = document.getElementById('ecran'));
    e.className = 'ouvert ' + (classe || '');
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
      case 'menu': this.menu(); break;
      case 'ameliorations': this.ameliorations(); break;
      case 'codex': this.codex(btn.dataset.o || 'especes'); break;
      case 'chasse': this.chasse(); break;
      case 'aide': this.aide(); break;
      case 'options': this.options(btn.dataset.o, btn.dataset.onglet); break;
      case 'retour': (this.retour || (() => this.menu()))(); break;
      case 'reprendre': this.reprendre(); break;
      case 'abandon': this.cacher(); G.abandonner(); break;
      case 'effacer':
        if (confirm('Effacer TOUTE ta progression (toutes difficultés, défis, améliorations, codex) ?')) { localStorage.removeItem(SAVE_KEY); Save.load(); G.opts = Save.d.opts; calcStats(); majAlerte(); this.menu(); }
        break;
    }
  },

  carteDefi(type) {
    const df = defiCourant(type), rec = Save.d.defis[type], bon = rec && rec.cle === df.cle ? rec : null;
    const fin = new Date(); let reste;
    if (type === 'jour') { const d = new Date(fin); d.setHours(24, 0, 0, 0); reste = (d - fin) / 36e5; }
    else { const d = new Date(fin); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); reste = (d - fin) / 36e5; }
    const resteTxt = reste >= 48 ? Math.floor(reste / 24) + ' j' : Math.floor(reste) + ' h ' + Math.floor((reste % 1) * 60) + ' min';
    return `<div class="defi d-${type}">
      <div class="dtete"><b>${type === 'jour' ? '☀ Défi du jour' : '🗓 Défi de la semaine'}</b><span>encore ${resteTxt}</span></div>
      <div class="dmut">${df.mut.map(m => `<span title="${MUTATEURS[m].desc}">${MUTATEURS[m].ico} ${MUTATEURS[m].nom}</span>`).join('')}</div>
      <p class="mini">${df.boss.length} boss d'affilée${df.boss.some(b => b.mega) ? ' dont un méga boss' : ''}, armes imposées, sans améliorations, une seule vie. ${df.mut.map(m => MUTATEURS[m].desc).join(' ')}</p>
      <div class="drec">${bon && bon.best ? `Record : <b>${bon.best.tues}/${df.boss.length}</b> en <b>${fmtTemps(bon.best.temps)}</b>` : 'Pas encore de record'}${bon ? ` · ${bon.essais} essai(s)` : ''}</div>
      <button data-a="defi" data-t="${type}">Relever le défi</button>
    </div>`;
  },

  menu() {
    G.etat = 'menu';
    const d = Save.d, s = d.stats, pr = PR();
    const salle = pr.run ? pr.run.salle : pr.palier * 5 + 1;
    const nbUp = ['p', 's', 't'].reduce((n, c) => n + Object.values(pr.up[c]).reduce((a, b) => a + b, 0), 0);
    const revanche = pr.run && pr.run.boss && pr.run.boss.salle === salle;
    const essais = (d.essais || {})[d.diff + ':' + salle] || 0;
    this.retour = () => this.menu();
    Musique.jouer(MUS.menu);
    const diffs = Object.entries(DIFFS).map(([k, v], i) => {
      const p = d.prog[k];
      return `<button class="diff ${k === d.diff ? 'actif' : ''} d-${k}" data-a="diff" data-d="${k}" data-n="${i + 1}">
        <span class="dico">${v.ico}</span><b>${v.nom}</b><span class="ddesc">${v.desc}</span>
        <span class="dprog">palier ${p.palier} · record salle ${p.record}</span></button>`;
    }).join('');
    this.montrer(`
      <div class="panneau menu">
        <h1 class="titre">COLOSSES</h1>
        <p class="sous">Des boss à l'infini. Apprends-les, ou meurs en essayant.</p>
        <div class="diffs">${diffs}</div>
        <button class="gros" data-a="jouer" data-def>⚔ Combattre — salle ${salle}${salle % 5 === 0 ? ' (méga boss)' : ''}</button>
        ${revanche && essais ? `<p class="mini">Revanche : même boss, mêmes armes (${essais} essai${essais > 1 ? 's' : ''}).</p>` : ''}
        <div class="defis">${this.carteDefi('jour')}${this.carteDefi('semaine')}</div>
        <div class="stats">
          <div><b>${pr.palier}</b><span>palier</span></div>
          <div><b>${pr.record}</b><span>record</span></div>
          <div><b>${s.boss}</b><span>boss vaincus</span></div>
          <div><b>${s.mega}</b><span>méga boss</span></div>
          <div><b>${s.morts}</b><span>morts</span></div>
          <div><b>${nbUp}</b><span>améliorations</span></div>
        </div>
        <div class="rang">
          <button data-a="ameliorations">Améliorations</button>
          <button data-a="codex">Codex</button>
          <button data-a="chasse">Tableau de chasse</button>
          <button data-a="aide">Comment jouer</button>
          <button data-a="options">⚙ Paramètres</button>
        </div>
      </div>`, 'fond');
  },

  pause() {
    G.etatAvantPause = G.etat;
    G.etat = 'pause';
    Musique.baisser(.3);
    this.retour = () => this.pause();
    this.montrer(`
      <div class="panneau court">
        <h2>Pause</h2>
        <div class="rang col"><button class="gros" data-a="reprendre" data-def>Reprendre (Échap)</button>
        <button data-a="options" data-o="pause">Paramètres</button>
        <button data-a="aide" data-o="pause">Comment jouer</button>
        <button data-a="abandon">Abandonner ce combat (compte comme une mort)</button></div>
      </div>`);
  },
  reprendre() { this.cacher(); G.etat = G.etatAvantPause || 'combat'; Musique.baisser(1); Input.clear(); },

  ameliorations() {
    this.retour = () => this.menu();
    const bloc = cat => `<div class="bloc c-${cat}"><h3>${CAT_NOM[cat]}</h3>${UPG[cat].map(u => `<div class="ligne"><span>${u.ico} ${u.nom}</span><b>niv. ${lv(cat, u.id)}${u.max ? ' / ' + u.max : ''}</b><em>${u.desc}</em></div>`).join('')}</div>`;
    const s = calcStats();
    this.montrer(`
      <div class="panneau">
        <h2>Améliorations — ${DF().nom}</h2>
        <p class="mini">Chaque méga boss vaincu laisse 3 orbes (une par type) : tu en prends une. Elles valent pour toutes les armes de ce type, dans cette difficulté.</p>
        <div class="blocs">${bloc('p')}${bloc('s')}${bloc('t')}</div>
        <p class="mini">Bilan : dégâts des armes ×${s.pDmg.toFixed(2)}, cadence ×${s.pCad.toFixed(2)}, critique ${Math.round(s.pCrit * 100)} % · spéciales ×${s.sDmg.toFixed(2)}, coût ×${s.sCout.toFixed(2)}, recharge ×${s.sRech.toFixed(2)}, énergie ${s.eMax} · talents : recharge ×${s.tRech.toFixed(2)}, ${s.tCharges} charge(s).</p>
        <div class="rang"><button data-a="menu" data-def data-echap>Retour</button></div>
      </div>`);
  },

  codex(o) {
    const cx = Save.d.codex;
    const onglets = [['especes', 'Bestiaire'], ['att', 'Attaques'], ['traits', 'Mutations'], ['cartes', 'Arènes'], ['invoc', 'Invocations'], ['arm', 'Arsenal']];
    let corps = '';
    const inconnu = t => `<div class="entree inconnu"><b>???</b><p>${t}</p></div>`;
    if (o === 'especes') {
      const ids = ESP_ORDRE.concat(['chimere']);
      corps = `<p class="mini">${ids.filter(i => cx.especes[i]).length} / ${ids.length} espèces rencontrées. Chaque espèce a un mécanisme et un cycle d'attaques fixe : la connaître, c'est la battre.</p><div class="liste large">` +
        ids.map(i => {
          const e = ESPECES[i], v = cx.especes[i];
          if (!v) return inconnu('Pas encore rencontrée.');
          const cyc = e.phases.map((ph, k) => `<div class="cyc"><span>Phase ${k + 1}</span> ${ph.cycle.map(id => ATK[id].nom).join(' → ')}</div>`).join('');
          return `<div class="entree"><b style="color:${e.hue != null ? hsl(e.hue, 100, 66) : '#ddd'}">${e.nom.charAt(0).toUpperCase() + e.nom.slice(1)}</b><span class="cpt">vue ${v.vus}× · tuée ${v.tues}×</span><p>${e.meca}</p>${cyc}</div>`;
        }).join('') + '</div>';
    } else if (o === 'att') {
      const ids = Object.keys(ATK);
      corps = `<p class="mini">${ids.filter(i => cx.att[i]).length} / ${ids.length} attaques découvertes.</p><div class="liste">` +
        ids.map(i => cx.att[i] ? `<div class="entree"><b>${ATK[i].nom}</b><span class="cpt">vue ${cx.att[i]}×</span><p>${ATK[i].conseil}</p></div>` : inconnu('Pas encore rencontrée.')).join('') + '</div>';
    } else if (o === 'traits') {
      corps = '<p class="mini">Des mutations qui s\'ajoutent à n\'importe quelle espèce, de plus en plus souvent en avançant.</p><div class="liste">' + Object.keys(TRAITS).map(t => cx.traits[t] ? `<div class="entree"><b>${TRAITS[t].ico} ${TRAITS[t].nom}</b><p>${TRAITS[t].desc}</p></div>` : inconnu('Pas encore rencontrée.')).join('') + '</div>';
    } else if (o === 'cartes') {
      corps = '<div class="liste">' + Object.keys(CARTES).map(t => cx.cartes[t] ? `<div class="entree"><b>${CARTES[t].nom}</b><p>${CARTES[t].desc}</p></div>` : inconnu('Pas encore visitée.')).join('') + '</div>';
    } else if (o === 'invoc') {
      corps = '<div class="liste">' + Object.keys(INVOC).map(t => cx.invoc[t] ? `<div class="entree"><b>${INVOC[t].nom}</b><p>${INVOC[t].desc}</p></div>` : inconnu('Pas encore rencontrées.')).join('') + '</div>';
    } else {
      corps = '<p class="mini">Chaque salle tire au sort une arme de chaque type. Leur description ne se lit qu\'ici : en combat, on les découvre en s\'en servant.</p>' +
        ['p', 's', 't'].map(cat => `<h4>${CAT_NOM[cat]} (${ARS[cat].filter(a => cx.arm[cat + ':' + a.id]).length} / ${ARS[cat].length})</h4><div class="liste">` + ARS[cat].map(a => cx.arm[cat + ':' + a.id] ? `<div class="entree"><b>${a.ico} ${a.nom}</b><p>${a.desc}</p></div>` : inconnu('Jamais tirée au sort.')).join('') + '</div>').join('');
    }
    this.retour = () => this.menu();
    this.montrer(`
      <div class="panneau">
        <h2>Codex</h2>
        <div class="onglets">${onglets.map(([k, n]) => `<button data-a="codex" data-o="${k}" class="${k === o ? 'actif' : ''}">${n}</button>`).join('')}</div>
        ${corps}
        <div class="rang"><button data-a="menu" data-def data-echap>Retour</button></div>
      </div>`);
  },

  chasse() {
    const d = Save.d, pr = PR();
    const megas = Object.keys(pr.megaTemps).map(Number).sort((a, b) => a - b);
    this.retour = () => this.menu();
    this.montrer(`
      <div class="panneau">
        <h2>Tableau de chasse</h2>
        ${megas.length ? '<h4>Records des méga boss (' + DF().nom + ')</h4><div class="liste">' + megas.map(s => `<div class="entree"><b style="color:#ffd86b">★ Méga boss de la salle ${s}</b><p>record ${fmtTemps(pr.megaTemps[s])}</p></div>`).join('') + '</div>' : ''}
        <h4>Derniers boss vaincus</h4>
        ${d.chasse.length ? '<div class="liste">' + d.chasse.map(c => `<div class="entree"><b style="color:${hsl(c.hue, 100, 66)}">${c.mega ? '★ ' : ''}${c.nom}</b><span class="cpt">salle ${c.salle}${c.diff ? ' · ' + DIFFS[c.diff].nom : ''}</span><p>${c.titre} · ${c.phases} phase(s) · ${fmtTemps(c.temps)}</p></div>`).join('') + '</div>' : '<p class="mini">Aucun pour l\'instant.</p>'}
        <div class="rang"><button data-a="menu" data-def data-echap>Retour</button></div>
      </div>`);
  },

  aide() {
    const ret = this.retour;
    this.montrer(`
      <div class="panneau">
        <h2>Comment jouer</h2>
        <div class="blocs">
          <div class="bloc"><h3>Commandes</h3>
            <div class="ligne"><span>Se déplacer</span><b>ZQSD / WASD / flèches</b></div>
            <div class="ligne"><span>Viser</span><b>Souris</b></div>
            <div class="ligne"><span>Arme (type 1)</span><b>Clic gauche maintenu</b></div>
            <div class="ligne"><span>Spéciale (type 2)</span><b>Clic droit ou E</b></div>
            <div class="ligne"><span>Talent (type 3)</span><b>Espace ou Maj</b></div>
            <div class="ligne"><span>Pause</span><b>Échap ou P</b></div>
          </div>
          <div class="bloc"><h3>Survivre</h3>
            <p>Seul le <b>point rouge</b> au centre de ton vaisseau peut être touché.</p>
            <p>Tout ce qui fait très mal est <b>annoncé en rouge</b> avant de frapper. Quand ça clignote blanc, ça part.</p>
            <p>Le boss <b>brille</b> juste avant chaque attaque ; son nom s'affiche sous sa barre de vie.</p>
            <p>Contour doré « OUVERT » : c'est le moment de tout lui envoyer.</p>
          </div>
          <div class="bloc"><h3>Apprendre</h3>
            <p>Chaque boss appartient à une <b>espèce</b> (${ESP_ORDRE.length} + la Chimère) qui répète <b>toujours le même cycle</b> d'attaques et a son point faible. Le Bestiaire du Codex garde tout ce que tu as vu.</p>
            <p>Tous les 5 salles, un <b>méga boss</b>, toujours le même pour un palier. Battu, il laisse 3 orbes : prends-en une pour améliorer tes armes pour toujours. Le portail t'emmène à la suite.</p>
          </div>
        </div>
        <div class="rang"><button data-a="retour" data-def data-echap>Retour</button></div>
      </div>`);
    this.retour = ret;
  },

  options(o, onglet) {
    const op = Save.d.opts, depuis = o === 'pause' ? 'pause' : 'menu';
    onglet = onglet || this.ongletOpt || 'son'; this.ongletOpt = onglet;
    this.retour = depuis === 'pause' ? () => this.pause() : () => this.menu();
    const nomTouche = c => ({ Space: 'Espace', ShiftLeft: 'Maj gauche', ShiftRight: 'Maj droite', KeyP: 'P', KeyE: 'E', Escape: 'Échap', ControlLeft: 'Ctrl', AltLeft: 'Alt', Tab: 'Tab' }[c] || c.replace(/^Key/, '').replace(/^Digit/, ''));
    const curseur = (id, nom, val, min, max, pas) => `<label class="opt">${nom}<input type="range" min="${min}" max="${max}" step="${pas}" value="${val}" id="${id}"><span class="val" id="${id}-v">${Math.round(val * 100)} %</span></label>`;
    const coche = (id, nom, val) => `<label class="opt"><input type="checkbox" id="${id}" ${val ? 'checked' : ''}> ${nom}</label>`;
    const choix = (id, nom, val, liste) => `<label class="opt">${nom}<select id="${id}">${liste.map(([k, n]) => `<option value="${k}" ${k === val ? 'selected' : ''}>${n}</option>`).join('')}</select></label>`;
    let corps = '';
    if (onglet === 'son') corps = curseur('o-master', 'Volume général', op.master, 0, 1, .05) + curseur('o-vol', 'Bruitages', op.vol, 0, 1, .05) + curseur('o-mus', 'Musique', op.musique, 0, 1, .05) +
      `<div class="rang"><button id="o-test">🔊 Tester le son</button></div>
       <p class="mini">Tu n'entends rien ? Vérifie la sortie audio de ton ordinateur (le casque doit être la sortie par défaut) et que l'onglet n'est pas coupé. Le son démarre au premier clic ou à la première touche.</p>`;
    else if (onglet === 'image') corps = coche('o-lum', 'Halos lumineux (plus beau, un peu plus lourd)', op.lumiere) + coche('o-decor', 'Décor animé (brume, poussière)', op.decorAnime) +
      choix('o-part', 'Particules', op.particules, [['faible', 'Peu'], ['normale', 'Normales'], ['elevee', 'Beaucoup']]) +
      curseur('o-tremble', 'Tremblements de l\'écran', +op.tremble, 0, 1, .1) +
      choix('o-alerte', 'Couleur des zones dangereuses', op.alerte, [['rouge', 'Rouge'], ['magenta', 'Magenta (daltoniens)'], ['jaune', 'Jaune (daltoniens)']]) +
      coche('o-fps', 'Afficher les images par seconde', op.fps);
    else if (onglet === 'jeu') corps = coche('o-auto', 'Tir automatique (sauf armes à charger)', op.auto) + coche('o-chiffres', 'Chiffres de dégâts', op.chiffres) +
      coche('o-noms', 'Nom de l\'attaque du boss sous sa barre de vie', op.nomsAttaques) + coche('o-pause', 'Pause automatique quand la fenêtre n\'est plus active', op.autoPause);
    else corps = `<p class="mini">Clique sur une touche puis appuie sur la nouvelle. Déplacements : ZQSD / WASD / flèches. Arme : clic gauche. Échap met toujours en pause.</p>` +
      [['spec', 'Attaque spéciale (en plus du clic droit)'], ['tal', 'Talent'], ['tal2', 'Talent (2e touche)'], ['pause', 'Pause']].map(([k, n]) => `<div class="ligne touche-l"><span>${n}</span><button class="tch" data-k="${k}">${this.capture === k ? '… appuie sur une touche' : nomTouche(op.touches[k])}</button></div>`).join('');
    const onglets = [['son', '🔊 Son'], ['image', '🖼 Image'], ['jeu', '🎮 Jeu'], ['commandes', '⌨ Commandes']];
    this.montrer(`
      <div class="panneau court">
        <h2>Paramètres</h2>
        <div class="onglets">${onglets.map(([k, n]) => `<button data-a="options" data-o="${depuis}" data-onglet="${k}" class="${k === onglet ? 'actif' : ''}">${n}</button>`).join('')}</div>
        ${corps}
        <div class="rang"><button data-a="retour" data-def data-echap>Retour</button>${depuis === 'pause' ? '' : '<button class="danger" data-a="effacer">Effacer la progression</button>'}</div>
      </div>`);
    const q = id => document.getElementById(id);
    const lier = (id, fn, ev) => { const e = q(id); if (e) e.addEventListener(ev || 'change', x => { fn(x.target); Save.write(); }); };
    const pct = (id, v) => { const e = q(id + '-v'); if (e) e.textContent = Math.round(v * 100) + ' %'; };
    lier('o-master', t => { op.master = +t.value; pct('o-master', op.master); Son.init(); Son.setVol(); }, 'input');
    lier('o-vol', t => { op.vol = +t.value; pct('o-vol', op.vol); Son.init(); Son.setVol(); }, 'input');
    lier('o-mus', t => { op.musique = +t.value; pct('o-mus', op.musique); }, 'input');
    lier('o-tremble', t => { op.tremble = +t.value; pct('o-tremble', op.tremble); }, 'input');
    lier('o-lum', t => op.lumiere = t.checked); lier('o-decor', t => op.decorAnime = t.checked);
    lier('o-part', t => op.particules = t.value); lier('o-alerte', t => { op.alerte = t.value; majAlerte(); });
    lier('o-fps', t => op.fps = t.checked); lier('o-auto', t => op.auto = t.checked); lier('o-chiffres', t => op.chiffres = t.checked);
    lier('o-noms', t => op.nomsAttaques = t.checked); lier('o-pause', t => op.autoPause = t.checked);
    const test = q('o-test');
    if (test) test.addEventListener('click', () => { Son.init(); Son.play('explo'); setTimeout(() => Son.play('parade'), 350); Musique.sting(MUS.victoire); });
    this.el.querySelectorAll('.tch').forEach(b => b.addEventListener('click', ev => {
      ev.stopPropagation(); this.capture = b.dataset.k; b.textContent = '… appuie sur une touche';
      const ecoute = e => {
        e.preventDefault(); removeEventListener('keydown', ecoute, true);
        if (e.code !== 'Escape') op.touches[this.capture] = e.code;
        this.capture = null; Save.write(); Input.clear(); this.options(o, 'commandes');
      };
      addEventListener('keydown', ecoute, true);
    }));
  }
};
