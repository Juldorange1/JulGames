'use strict';
/* Colosses — écrans (menu, arsenal, victoire, choix d'amélioration, mort, pause, codex, options). */

const UI = {
  el: null, retour: null,
  montrer(html, classe) {
    const e = this.el || (this.el = document.getElementById('ecran'));
    e.className = 'ouvert ' + (classe || '');
    e.innerHTML = html;
    e.scrollTop = 0;
    e.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); Son.init(); Son.play('clic'); this.action(b.dataset.a, b); }));
  },
  cacher() { const e = this.el || (this.el = document.getElementById('ecran')); e.className = ''; e.innerHTML = ''; },
  clavier() {
    if (!this.el || !this.el.classList.contains('ouvert')) return;
    if (Input.hit('Space') || Input.hit('Enter') || Input.hit('NumpadEnter')) { const b = this.el.querySelector('[data-def]'); if (b) b.click(); }
    if (Input.hit('Escape')) { const b = this.el.querySelector('[data-echap]'); if (b) b.click(); }
    for (let i = 1; i <= 3; i++) if (Input.hit('Digit' + i) || Input.hit('Numpad' + i)) { const b = this.el.querySelector('[data-n="' + i + '"]'); if (b) b.click(); }
  },
  action(a, btn) {
    switch (a) {
      case 'jouer': this.cacher(); if (!Save.d.run) Save.d.run = { salle: Save.d.palier * 5 + 1, pv: 100 }; G.preparerSalle(); break;
      case 'combat': this.cacher(); G.commencer(); break;
      case 'suivante': this.cacher(); G.preparerSalle(); break;
      case 'menu': this.menu(); break;
      case 'ameliorations': this.ameliorations(); break;
      case 'codex': this.codex(btn.dataset.o || 'att'); break;
      case 'chasse': this.chasse(); break;
      case 'aide': this.aide(); break;
      case 'options': this.options(btn.dataset.o); break;
      case 'retour': (this.retour || (() => this.menu()))(); break;
      case 'reprendre': this.reprendre(); break;
      case 'abandon': this.cacher(); G.abandonner(); break;
      case 'choisir': {
        const cat = btn.dataset.cat, id = btn.dataset.id, up = Save.d.up[cat];
        up[id] = (up[id] || 0) + 1; Save.write(); calcStats(); Son.play('soin');
        this.apresChoix(cat, id);
        break;
      }
      case 'effacer':
        if (confirm('Effacer TOUTE ta progression (améliorations, paliers, codex) ?')) { localStorage.removeItem(SAVE_KEY); Save.load(); G.opts = Save.d.opts; calcStats(); this.menu(); }
        break;
    }
  },

  menu() {
    G.etat = 'menu';
    const d = Save.d, s = d.stats;
    if (!d.run) d.run = { salle: d.palier * 5 + 1, pv: 100 };
    const nbUp = ['p', 's', 't'].reduce((n, c) => n + Object.values(d.up[c]).reduce((a, b) => a + b, 0), 0);
    this.retour = () => this.menu();
    this.montrer(`
      <div class="panneau menu">
        <h1 class="titre">COLOSSES</h1>
        <p class="sous">Des boss à l'infini. Chaque salle, un nouveau colosse, et des armes tirées au hasard.</p>
        <button class="gros" data-a="jouer" data-def>⚔ Combattre — salle ${d.run.salle}${d.run.salle % 5 === 0 ? ' (méga boss)' : ''}</button>
        <div class="stats">
          <div><b>${d.palier}</b><span>palier</span></div>
          <div><b>${d.record}</b><span>record (salle)</span></div>
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
          <button data-a="options">Options</button>
        </div>
        <p class="note">Tous les 5 salles, un <b>méga boss</b> (toujours le même pour un palier donné : apprends-le). Le vaincre te donne une amélioration
        définitive et un point de reprise. Si tu meurs, tu repars au début de ton palier.</p>
      </div>`, 'fond');
  },

  carteArme(cat, a) {
    let extra = '';
    if (cat === 's') extra = `<div class="mini">${Math.round(a.cout * ST.sCout)} énergie · recharge ${(a.rech * ST.sRech).toFixed(1)} s</div>`;
    if (cat === 't') extra = `<div class="mini">recharge ${(a.rech * ST.tRech).toFixed(1)} s${ST.tCharges > 1 ? ' · ×' + ST.tCharges : ''}</div>`;
    const k = { p: 'Clic gauche', s: 'Clic droit ou E', t: 'Espace ou Maj' }[cat];
    return `<div class="carte arme c-${cat}"><div class="ico">${a.ico}</div><div class="cat">${{ p: 'Type 1 · Arme principale', s: 'Type 2 · Attaque spéciale', t: 'Type 3 · Talent' }[cat]}</div>
      <h3>${a.nom}</h3><p>${a.desc}</p>${extra}<div class="touche">${k}</div></div>`;
  },
  arsenal() {
    const d = G.def, run = Save.d.run;
    const traits = d.traits.map(t => `<li><b>${TRAITS[t].ico} ${TRAITS[t].nom}</b> — ${TRAITS[t].desc}</li>`).join('');
    const inv = d.invoc ? `<li><b>🜲 Invocateur</b> — ${INVOC[d.invoc].nom} : ${INVOC[d.invoc].desc}</li>` : '';
    const cartes = [...new Set(d.phases.map(p => p.carte))].filter(c => c !== 'normale');
    const best = Save.d.megaTemps[String(G.salle)];
    this.montrer(`
      <div class="panneau">
        <div class="entete"><span>Salle ${G.salle}</span><span>Vie ${Math.ceil(run.pv)} / 100</span></div>
        <div class="boss-carte ${d.mega ? 'mega' : ''}" style="--bc:${d.col}">
          ${d.mega ? '<div class="etiquette">★ MÉGA BOSS ★</div>' : ''}
          <h2>${d.nom}</h2><div class="epi">${d.titre}</div>
          <div class="infos"><span>${d.phases.length} phase${d.phases.length > 1 ? 's' : ''}</span><span>${Math.round(d.hpMax).toLocaleString('fr-FR')} PV</span><span>${MOUVS[d.mouv]}</span>
          ${cartes.length ? '<span>Arènes : ' + cartes.map(c => CARTES[c].nom).join(', ') + '</span>' : ''}</div>
          ${traits || inv ? '<ul>' + traits + inv + '</ul>' : '<p class="mini">Aucun trait particulier : un duel pur.</p>'}
          ${d.mega ? `<p class="mini">Ce méga boss est toujours le même à cette salle : chaque essai t'apprend ses attaques.${best ? ' Ton record : ' + fmtTemps(best) + '.' : ''}</p>` : ''}
        </div>
        <h4>Ton arsenal pour cette salle</h4>
        <div class="cartes">${this.carteArme('p', trouveArme('p', G.ars.p))}${this.carteArme('s', trouveArme('s', G.ars.s))}${this.carteArme('t', trouveArme('t', G.ars.t))}</div>
        <div class="rang"><button class="gros" data-a="combat" data-def>Entrer dans l'arène (Espace)</button><button data-a="menu" data-echap>Menu</button></div>
      </div>`);
  },

  victoire(res) {
    this.montrer(`
      <div class="panneau court">
        <h2 class="ok">Salle ${G.salle} vaincue</h2>
        <p>${G.def.nom} est tombé en <b>${fmtTemps(res.temps)}</b>. Coups encaissés : <b>${res.coups}</b>.</p>
        ${res.soin ? `<p class="soin">+${res.soin} points de vie récupérés</p>` : ''}
        <p class="mini">Vie : ${Math.ceil(Save.d.run.pv)} / 100 · ${5 - (G.salle % 5)} salle(s) avant le méga boss.</p>
        <div class="rang"><button class="gros" data-a="suivante" data-def>Salle suivante (Espace)</button><button data-a="menu" data-echap>Menu</button></div>
      </div>`);
  },

  choix(res) {
    const cartes = ['p', 's', 't'].map((cat, i) => {
      const dispo = UPG[cat].filter(u => !u.max || lv(cat, u.id) < u.max);
      const u = R.pick(dispo);
      return `<button class="carte up c-${cat}" data-a="choisir" data-cat="${cat}" data-id="${u.id}" data-n="${i + 1}">
        <div class="cat">${i + 1} · ${CAT_NOM[cat]}</div><div class="ico">${u.ico}</div><h3>${u.nom}</h3><p>${u.desc}</p>
        <div class="mini">niveau ${lv(cat, u.id)} → ${lv(cat, u.id) + 1}</div></button>`;
    }).join('');
    this.montrer(`
      <div class="panneau">
        <h2 class="ok">★ Méga boss vaincu ! ★</h2>
        <p>${G.def.nom} terrassé en <b>${fmtTemps(res.temps)}</b>${res.record ? ' — <b class="ok">nouveau record !</b>' : ''}. Tu atteins le <b>palier ${Save.d.palier}</b> : si tu meurs, tu reprendras ici.</p>
        <h4>Choisis une amélioration définitive (pour toutes tes futures armes de ce type)</h4>
        <div class="cartes">${cartes}</div>
      </div>`);
  },
  apresChoix(cat, id) {
    const u = UPG[cat].find(x => x.id === id);
    this.montrer(`
      <div class="panneau court">
        <h2 class="ok">${u.ico} ${u.nom} niveau ${lv(cat, id)}</h2>
        <p>${CAT_NOM[cat]} : ${u.desc}. C'est pour toujours.</p>
        <p class="soin">Vie entièrement restaurée.</p>
        <div class="rang"><button class="gros" data-a="suivante" data-def>Salle ${Save.d.run.salle} (Espace)</button><button data-a="menu" data-echap>Menu</button></div>
      </div>`);
  },

  mort(r) {
    const tueur = G.tueur && ATK[G.tueur] ? ATK[G.tueur] : null;
    const conseil = tueur ? `<div class="conseil"><b>Tué par « ${tueur.nom} »</b><br>${tueur.conseil}</div>`
      : G.tueur === 'contact' ? '<div class="conseil"><b>Tué au contact du boss</b><br>Ne reste pas collé à lui : son corps fait mal. Garde ton talent pour sortir d\'un mauvais pas.</div>'
      : G.tueur === 'lave' ? '<div class="conseil"><b>Brûlé par la lave</b><br>Les bassins de lave ne bougent pas : repère-les avant d\'esquiver.</div>' : '';
    this.montrer(`
      <div class="panneau court">
        <h2 class="ko">Tu es tombé</h2>
        <p>${r.def.nom} (${r.def.titre}) — phase ${r.phase}/${r.def.phases.length}, <b>${Math.round(r.pct * 100)} %</b> de sa vie arrachée en ${fmtTemps(r.temps)}.</p>
        ${conseil}
        <p>Tu repars au <b>palier ${Save.d.palier}</b> : salle ${Save.d.run.salle}, vie pleine.</p>
        <div class="rang"><button class="gros" data-a="jouer" data-def>Recommencer (Espace)</button><button data-a="menu" data-echap>Menu</button></div>
      </div>`);
  },

  pause() {
    G.etat = 'pause';
    this.retour = () => this.pause();
    this.montrer(`
      <div class="panneau court">
        <h2>Pause</h2>
        <div class="rang col"><button class="gros" data-a="reprendre" data-def>Reprendre (Échap)</button>
        <button data-a="options" data-o="pause">Options</button>
        <button data-a="aide" data-o="pause">Comment jouer</button>
        <button data-a="abandon">Abandonner ce combat (compte comme une mort)</button></div>
      </div>`);
  },
  reprendre() { this.cacher(); G.etat = 'combat'; Input.clear(); },

  ameliorations() {
    this.retour = () => this.menu();
    const bloc = cat => `<div class="bloc c-${cat}"><h3>${CAT_NOM[cat]}</h3>${UPG[cat].map(u => `<div class="ligne"><span>${u.ico} ${u.nom}</span><b>niv. ${lv(cat, u.id)}${u.max ? ' / ' + u.max : ''}</b><em>${u.desc}</em></div>`).join('')}</div>`;
    const s = calcStats();
    this.montrer(`
      <div class="panneau">
        <h2>Améliorations définitives</h2>
        <p class="mini">Gagnées en battant les méga boss (une par méga boss). Elles s'appliquent à toutes les armes du type, quelles qu'elles soient.</p>
        <div class="blocs">${bloc('p')}${bloc('s')}${bloc('t')}</div>
        <p class="mini">Bilan : dégâts des armes ×${s.pDmg.toFixed(2)}, cadence ×${s.pCad.toFixed(2)}, critique ${Math.round(s.pCrit * 100)} % · spéciales ×${s.sDmg.toFixed(2)}, coût ×${s.sCout.toFixed(2)}, recharge ×${s.sRech.toFixed(2)}, énergie ${s.eMax} · talents : recharge ×${s.tRech.toFixed(2)}, ${s.tCharges} charge(s).</p>
        <div class="rang"><button data-a="menu" data-def data-echap>Retour</button></div>
      </div>`);
  },

  codex(o) {
    const cx = Save.d.codex;
    const onglets = [['att', 'Attaques'], ['traits', 'Traits'], ['cartes', 'Arènes'], ['invoc', 'Invocations'], ['arm', 'Arsenal']];
    let corps = '';
    if (o === 'att') {
      const ids = ATK_IDS;
      const n = ids.filter(i => cx.att[i]).length;
      corps = `<p class="mini">${n} / ${ids.length} attaques découvertes. Chaque boss en tire 3 par phase au hasard, avec des réglages différents.</p><div class="liste">` +
        ids.map(i => cx.att[i] ? `<div class="entree"><b>${ATK[i].nom}</b><span class="cpt">vue ${cx.att[i]}×</span><p>${ATK[i].conseil}</p></div>` : `<div class="entree inconnu"><b>???</b><p>Pas encore rencontrée.</p></div>`).join('') + '</div>';
    } else if (o === 'traits') {
      corps = '<div class="liste">' + Object.keys(TRAITS).map(t => cx.traits[t] ? `<div class="entree"><b>${TRAITS[t].ico} ${TRAITS[t].nom}</b><p>${TRAITS[t].desc}</p></div>` : '<div class="entree inconnu"><b>???</b><p>Pas encore rencontré.</p></div>').join('') + '</div>';
    } else if (o === 'cartes') {
      corps = '<div class="liste">' + Object.keys(CARTES).map(t => cx.cartes[t] ? `<div class="entree"><b>${CARTES[t].nom}</b><p>${CARTES[t].desc}</p></div>` : '<div class="entree inconnu"><b>???</b><p>Pas encore visitée.</p></div>').join('') + '</div>';
    } else if (o === 'invoc') {
      corps = '<div class="liste">' + Object.keys(INVOC).map(t => cx.invoc[t] ? `<div class="entree"><b>${INVOC[t].nom}</b><p>${INVOC[t].desc} (${Math.round(INVOC[t].hp)} PV de base)</p></div>` : '<div class="entree inconnu"><b>???</b><p>Pas encore rencontrées.</p></div>').join('') + '</div>';
    } else {
      corps = ['p', 's', 't'].map(cat => `<h4>${CAT_NOM[cat]}</h4><div class="liste">` + ARS[cat].map(a => cx.arm[cat + ':' + a.id] ? `<div class="entree"><b>${a.ico} ${a.nom}</b><p>${a.desc}</p></div>` : '<div class="entree inconnu"><b>???</b><p>Jamais tirée au sort.</p></div>').join('') + '</div>').join('');
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
    const d = Save.d;
    const megas = Object.keys(d.megaTemps).map(Number).sort((a, b) => a - b);
    this.retour = () => this.menu();
    this.montrer(`
      <div class="panneau">
        <h2>Tableau de chasse</h2>
        ${megas.length ? '<h4>Records des méga boss</h4><div class="liste">' + megas.map(s => { const def = genBoss(s, hashNum(s * 7919 + 13), true); return `<div class="entree"><b style="color:${def.col}">★ ${def.nom}</b><span class="cpt">salle ${s}</span><p>${def.titre} — record ${fmtTemps(d.megaTemps[s])}</p></div>`; }).join('') + '</div>' : ''}
        <h4>Derniers boss vaincus</h4>
        ${d.chasse.length ? '<div class="liste">' + d.chasse.map(c => `<div class="entree"><b style="color:${hsl(c.hue, 100, 66)}">${c.mega ? '★ ' : ''}${c.nom}</b><span class="cpt">salle ${c.salle}</span><p>${c.titre} · ${c.phases} phase(s) · ${fmtTemps(c.temps)}</p></div>`).join('') + '</div>' : '<p class="mini">Aucun pour l\'instant.</p>'}
        <div class="rang"><button data-a="menu" data-def data-echap>Retour</button></div>
      </div>`);
  },

  aide(o) {
    const ret = this.retour;
    this.montrer(`
      <div class="panneau">
        <h2>Comment jouer</h2>
        <div class="blocs">
          <div class="bloc"><h3>Commandes</h3>
            <div class="ligne"><span>Se déplacer</span><b>ZQSD / WASD / flèches</b></div>
            <div class="ligne"><span>Viser</span><b>Souris</b></div>
            <div class="ligne"><span>Arme principale (type 1)</span><b>Clic gauche maintenu</b></div>
            <div class="ligne"><span>Attaque spéciale (type 2)</span><b>Clic droit ou E</b></div>
            <div class="ligne"><span>Talent (type 3)</span><b>Espace ou Maj</b></div>
            <div class="ligne"><span>Pause</span><b>Échap ou P</b></div>
          </div>
          <div class="bloc"><h3>Survivre</h3>
            <p>Seul le <b>point rouge</b> au centre de ton vaisseau peut être touché : les balles peuvent frôler le reste.</p>
            <p>Tout ce qui fait très mal est <b>annoncé en rouge</b> avant de frapper : cercles, lignes, cases. Quand ça clignote blanc, ça part.</p>
            <p>Le boss <b>brille</b> juste avant chaque attaque et son nom s'affiche sous sa barre de vie.</p>
            <p>Les talents d'esquive rendent <b>invincible</b> un court instant : passe à travers les ondes et les rayons.</p>
          </div>
          <div class="bloc"><h3>Progresser</h3>
            <p>Chaque salle tire au hasard une <b>arme</b>, une <b>attaque spéciale</b> (énergie + recharge ; l'énergie remonte toute seule et en frappant) et un <b>talent</b>.</p>
            <p>Les boss ont 3 attaques par phase, tirées parmi ${ATK_IDS.length}, et parfois des <b>traits</b> qui changent la façon de les tuer (cristaux, point faible, carapace…).</p>
            <p>Tous les 5 salles, un <b>méga boss</b> : battu, il donne une amélioration définitive au choix et un point de reprise. Le jeu ne s'arrête jamais.</p>
          </div>
        </div>
        <div class="rang"><button data-a="retour" data-def data-echap>Retour</button></div>
      </div>`);
    this.retour = ret;
  },

  options(o) {
    const op = Save.d.opts, ret = o === 'pause' ? () => this.pause() : () => this.menu();
    this.retour = ret;
    this.montrer(`
      <div class="panneau court">
        <h2>Options</h2>
        <label class="opt">Volume <input type="range" min="0" max="1" step="0.05" value="${op.vol}" id="o-vol"></label>
        <label class="opt"><input type="checkbox" id="o-tremble" ${op.tremble ? 'checked' : ''}> Tremblements de l'écran</label>
        <label class="opt"><input type="checkbox" id="o-auto" ${op.auto ? 'checked' : ''}> Tir automatique (plus besoin de maintenir le clic)</label>
        <label class="opt"><input type="checkbox" id="o-chiffres" ${op.chiffres ? 'checked' : ''}> Chiffres de dégâts</label>
        <div class="rang"><button data-a="retour" data-def data-echap>Retour</button>${o === 'pause' ? '' : '<button class="danger" data-a="effacer">Effacer la progression</button>'}</div>
      </div>`);
    const q = id => document.getElementById(id);
    q('o-vol').addEventListener('input', e => { op.vol = +e.target.value; Son.init(); Son.setVol(op.vol); Save.write(); });
    q('o-tremble').addEventListener('change', e => { op.tremble = e.target.checked; Save.write(); });
    q('o-auto').addEventListener('change', e => { op.auto = e.target.checked; Save.write(); });
    q('o-chiffres').addEventListener('change', e => { op.chiffres = e.target.checked; Save.write(); });
  }
};
