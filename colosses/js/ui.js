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
      case 'ameliorations': case 'forge': this.forge(btn.dataset.o); break;
      case 'garderobe': this.garderobe(btn.dataset.o); break;
      case 'abysses': this.cacher(); G.lancerAbysses(); break;
      case 'forgeAch': { const F = forgeSave(), k = btn.dataset.k; if (F.eclats >= COUT_FORGE) { F.eclats -= COUT_FORGE; F.debloque[k] = 1; Save.write(); Son.play('ramasse'); } this.forge('forge'); break; }
      case 'forgeEq': { const F = forgeSave(), [fam, id] = btn.dataset.k.split(':'); F.actif[fam] = F.actif[fam] === id ? null : id; Save.write(); this.forge('forge'); break; }
      case 'affNiv': { const A = affSave(), c = btn.dataset.c, v = btn.dataset.v, F = forgeSave(), n = A[c][v] || 0, prix = AFF_PRIX[n]; if (n < 3 && F.eclats >= prix && (n > 0 || Object.keys(A[c]).filter(k => A[c][k] > 0).length < 2)) { F.eclats -= prix; A[c][v] = n + 1; Save.write(); Son.play('ramasse'); } this.forge('affinites'); break; }
      case 'affOff': { const A = affSave(); delete A[btn.dataset.c][btn.dataset.v]; Save.write(); this.forge('affinites'); break; }
      case 'fragAch': { const F = forgeSave(); if (F.eclats >= 4) { F.eclats -= 4; const t = donnerFragment(); Son.play('ramasse'); this.forge('forge'); const p = document.createElement('p'); p.className = 'mini gain'; p.textContent = '🎁 ' + t; this.el.querySelector('.eclats').after(p); } break; }
      case 'aff': { const A = Save.d.affinites = Save.d.affinites || { p: [], s: [], t: [] }, c = btn.dataset.c, v = btn.dataset.v, l = A[c]; const i = l.indexOf(v); if (i >= 0) l.splice(i, 1); else { l.push(v); if (l.length > 2) l.shift(); } Save.write(); this.forge('affinites'); break; }
      case 'skin': { const S = skinsSave(), s = skin(btn.dataset.k); if (possede(s.id)) { S.equip[s.slot] = s.id; Save.write(); Son.play('clic'); } this.garderobe(s.slot); break; }
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
      case 'abandon': case 'relancer': this.cacher(); G.relancer(); break;
      case 'passer': this.cacher(); G.passerBoss(); break;
      case 'quitter': G.mode = 'normal'; this.menu(); break;
      case 'touchesDef': Save.d.opts.touches = Save.defaut().opts.touches; Save.write(); this.options(this.ongletOptDepuis || 'menu', 'commandes'); break;
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
      const x = defiCourant(type), F = FORMATS[x.format], rec = d.defis[type], bon = rec && rec.cle === x.cle && rec.best && rec.best.score !== undefined ? rec.best : null;
      return `<button class="defi2 d-${type}" data-a="defi" data-t="${type}" title="${F.obj}${x.mut.length ? '\n' + x.mut.map(m => MUTATEURS[m].nom + ' : ' + MUTATEURS[m].desc).join('\n') : ''}">
        <span class="di">${F.ico}</span>
        <span class="dtx"><b>${type === 'jour' ? 'Défi du jour' : 'Défi de la semaine'}</b><span class="dm">${F.nom}${x.mut.length ? ' · ' + x.mut.map(m => MUTATEURS[m].ico).join(' ') : ''}</span></span>
        <span class="dr">${bon ? '🏆<small>' + F.fmt(bon.score) + '</small>' : '—'}</span></button>`;
    };
    const tuile = (a, ico, nom, extra) => `<button class="tuile" data-a="${a}"><span>${ico}</span>${nom}${extra ? `<small>${extra}</small>` : ''}</button>`;
    this.montrer(`
      <div class="accueil">
        <h1 class="titre">COLOSSES</h1>
        <div class="pills">${pills}</div>
        <button class="jouer" data-a="jouer" data-def>▶ JOUER<small>${df.ico} Salle ${salle}${salle % 5 === 0 ? ' · méga boss' : ''}${revanche && essais ? ' · revanche ×' + essais : ''} · palier ${pr.palier}</small></button>
        <div class="defis2">${defi('jour')}${defi('semaine')}
          <button class="defi2 d-abysses" data-a="abysses" title="${FORMATS.abysses.obj}"><span class="di">🌌</span><span class="dtx"><b>Abysses</b><span class="dm">sans fin · une vie</span></span><span class="dr">${(d.abysses || {}).best ? '🏆<small>prof. ' + d.abysses.best + '</small>' : '—'}</span></button>
          ${(() => { const c = chasseCourante(), e = ESPECES[c.esp]; return `<div class="defi2 d-chasse" title="Bats cette espèce en mode normal en moins de 3:00, 2:00 puis 1:30 pour gagner des fragments d'apparence."><span class="di">🎯</span><span class="dtx"><b>Chasse : ${e.nom}</b><span class="dm">${CHASSE_PALIERS.map((l, i) => (c.paliers.includes(i) ? '★' : '☆') + fmtTemps(l)).join(' ')}</span></span><span class="dr">${c.best ? '<small>' + fmtTemps(c.best) + '</small>' : '—'}</span></div>`; })()}
        </div>
        <div class="tuiles">
          ${tuile('forge', '⚒', 'Forge', forgeSave().eclats + ' éclats')}
          ${tuile('garderobe', '👕', 'Garde-robe')}
          ${tuile('codex', '📖', 'Codex')}
          ${tuile('stats', '📊', 'Statistiques')}
          ${tuile('options', '⚙', 'Paramètres')}
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
        <button data-a="relancer">↻ Recommencer le combat</button>
        ${G.passeDispo() === 0 ? '<button data-a="passer">⏭ Passer ce boss</button>' : G.passeDispo() > 0 ? `<button disabled>⏭ Passer ce boss (encore ${G.passeDispo()} boss)</button>` : ''}
        <button data-a="quitter">🏠 Menu principal</button></div>
        <p class="mini centre">Échap : reprendre${G.mode === 'normal' ? ' · ta partie est gardée' : ''}</p>
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
    const pct = (a, b) => b > 0 ? Math.round(a / b * 100) + ' %' : '—';
    const gros = (v, n, t) => `<div class="stat" ${t ? `title="${t}"` : ''}><b>${v}</b><span>${n}</span></div>`;
    const barres = (obj, nom, n, enPct) => {
      const l = Object.entries(obj || {}).sort((a, b) => b[1] - a[1]).slice(0, n || 5);
      if (!l.length) return '<p class="mini">Pas encore de données.</p>';
      const max = l[0][1], tot = Object.values(obj).reduce((x, y) => x + y, 0);
      return l.map(([k, v]) => `<div class="barre-st"><span>${nom(k)}</span><i style="width:${Math.max(4, v / max * 100)}%"></i><b>${enPct ? Math.round(v / tot * 100) + ' %' : v}</b></div>`).join('');
    };
    const nomArme = k => { const a = PRIM.find(x => x.id === k); return a ? a.ico + ' ' + a.nom : k; };
    const nomAtk = k => ATK[k] ? ATK[k].nom : { contact: 'Contact du boss', lave: 'Lave', invocation: 'Invocations', pieges: 'Pièges', abandon: 'Abandon', inconnu: '?' }[k] || k;
    const combats = s.boss + s.morts, esp = ESP_ORDRE.concat(['chimere']).filter(e => d.codex.especes[e]);
    const moy = s.boss ? fmtTemps((s.tempsVictoires || 0) / s.boss) : '—';
    this.ecran('📊 Statistiques', `
      <div class="stats-g">
        ${gros(pct(s.boss, combats), 'combats gagnés', 'Part des combats gagnés (victoires ÷ combats joués)')}
        ${gros(pct(s.premierEssai || 0, s.boss), 'du premier coup', 'Boss battus dès le premier essai')}
        ${gros(pct(s.sansCoup || 0, s.boss), 'sans être touché', 'Victoires sans prendre un seul coup')}
        ${gros(pct((s.atkLancees || 0) - (s.atkTouche || 0), s.atkLancees || 0), 'attaques esquivées', 'Attaques du boss passées sans te toucher')}
        ${gros(moy, 'durée d\'une victoire', 'Durée moyenne d\'un combat gagné')}
        ${gros(s.serieMax || 0, 'meilleure série', 'Le plus de boss battus d\'affilée sans mourir')}
        ${gros(s.mega, 'méga boss vaincus')}
        ${gros(s.defisReussis || 0, 'défis réussis')}
      </div>
      <div class="blocs">
        <div class="bloc"><h3>Par difficulté</h3>${Object.entries(DIFFS).map(([k, v]) => `<div class="ligne"><span>${v.ico} ${v.nom}</span><b>palier ${d.prog[k].palier} · record salle ${d.prog[k].record}</b></div>`).join('')}</div>
        <div class="bloc"><h3>Armes qui gagnent</h3>${barres(s.tuesArme, nomArme)}</div>
        <div class="bloc"><h3>Ce qui te bat (part des défaites)</h3>${barres(s.mortsAttaque, nomAtk, 5, true)}</div>
      </div>
      <h4>Espèces</h4>
      <div class="tab-esp">${esp.map(e => { const v = d.codex.especes[e], t = (d.especesTemps || {})[e], m = ((s.mortsEsp || {})[e]) || 0; return `<div><b>${nomMaj(ESPECES[e].nom)}</b><span>${'★'.repeat(etoiles(e))}${'☆'.repeat(3 - etoiles(e))}</span><span>${pct(v.tues, v.tues + m)} gagnés</span><span>${t ? fmtTemps(t) : '—'}</span></div>`; }).join('') || '<p class="mini">Aucune espèce rencontrée.</p>'}</div>
      <p class="mini">Étoiles · part des combats gagnés · meilleur temps. ★ vaincue · ★★ sans être touché ou en moins d'une minute · ★★★ en Cauchemar.</p>`);
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

  // ---------- Forge et affinités ----------
  forge(o) {
    o = o || 'forge';
    const F = forgeSave(), A = Save.d.affinites = Save.d.affinites || { p: [], s: [], t: [] };
    const onglets = `<div class="onglets"><button data-a="forge" data-o="forge" class="${o === 'forge' ? 'actif' : ''}">⚒ Forge</button><button data-a="forge" data-o="affinites" class="${o === 'affinites' ? 'actif' : ''}">🎲 Affinités</button></div>`;
    let corps = '';
    if (o === 'forge') {
      corps = `<p class="mini">Les éclats (un par boss, trois par méga boss) débloquent des <b>évolutions</b> pour une famille d'armes. Chacune change la façon de jouer sans rendre plus fort : on gagne d'un côté, on perd de l'autre. Une seule active par famille.</p>
        <div class="eclats">💎 ${F.eclats} éclats · ${COUT_FORGE} par évolution</div>
        <div class="rang"><button data-a="fragAch" ${F.eclats >= 4 ? '' : 'disabled'}>🎁 Fragment d'apparence au hasard · 4 💎</button></div><div class="blocs forge">` +
        Object.entries(FORGE).map(([fam, evos]) => `<div class="bloc"><h3>${FAMILLES[fam].ico} ${FAMILLES[fam].nom}</h3>${evos.map(e => {
          const k = fam + ':' + e.id, ok = F.debloque[k], actif = F.actif[fam] === e.id;
          return `<div class="evo ${actif ? 'actif' : ''}"><b>${e.nom}</b><em>${e.desc}</em>${ok ? `<button data-a="forgeEq" data-k="${k}">${actif ? '✔ Équipée' : 'Équiper'}</button>` : `<button data-a="forgeAch" data-k="${k}" ${F.eclats >= COUT_FORGE ? '' : 'disabled'}>Débloquer · ${COUT_FORGE} 💎</button>`}</div>`;
        }).join('')}</div>`).join('') + '</div>';
    } else {
      const A = affSave(), F2 = forgeSave();
      const ligne = (c, v, nom) => {
        const n = A[c][v] || 0, plein = Object.keys(A[c]).filter(k => A[c][k] > 0).length >= 2 && !n;
        const ch = chanceAff(c, v, Math.min(3, n + 1)), ch0 = chanceAff(c, v, n);
        const pct = x => Math.round(x * 100) + ' %';
        const etat = n ? `<span class="niv">${'◆'.repeat(n)}${'◇'.repeat(3 - n)}</span><em>${pct(ch0.apres)} de chance (au lieu de ${pct(ch0.avant)})</em>` : `<em>${pct(ch0.avant)} de chance</em>`;
        const btnA = n >= 3 ? '<button disabled>Max</button>' : `<button data-a="affNiv" data-c="${c}" data-v="${v}" ${plein || F2.eclats < AFF_PRIX[n] ? 'disabled' : ''} title="${plein ? '2 affinités au plus par type' : 'Passe à ' + pct(ch.apres)}">${n ? '+' : 'Acheter'} · ${AFF_PRIX[n]} 💎</button>`;
        return `<div class="aff-l ${n ? 'actif' : ''}"><b>${nom}</b><div>${etat}</div>${btnA}${n ? `<button class="petit" data-a="affOff" data-c="${c}" data-v="${v}" title="Retirer (les éclats ne sont pas rendus)">✕</button>` : ''}</div>`;
      };
      corps = `<p class="mini">Paie des éclats pour qu'un type d'arme tombe plus souvent (3 niveaux, 2 affinités au plus par catégorie). La chance affichée est celle qu'une arme tirée soit de ce type. Ça ne change jamais leur puissance.</p>
        <div class="eclats">💎 ${F2.eclats} éclats</div>
        <h4>🔫 Arme principale — familles</h4>${Object.entries(FAMILLES).map(([k, v]) => ligne('p', k, v.ico + ' ' + v.nom)).join('')}
        <h4>🔫 Arme principale — éléments</h4>${Object.entries(ELEMENTS).map(([k, v]) => ligne('p', k, v.ico + ' ' + v.nom)).join('')}
        <h4>💥 Attaque spéciale — éléments</h4>${Object.entries(ELEMENTS).map(([k, v]) => ligne('s', k, v.ico + ' ' + v.nom)).join('')}
        <h4>💨 Talents</h4>${TAL.filter(a => Save.d.codex.arm['t:' + a.id]).map(a => ligne('t', a.id, a.ico + ' ' + a.nom)).join('') || '<p class="mini">Découvre des talents en jouant.</p>'}`;
    }
    this.ecran('⚒ Forge', onglets + corps);
  },

  // ---------- Garde-robe ----------
  garderobe(slot) {
    slot = slot || 'armure';
    const S = skinsSave();
    const onglets = '<div class="onglets">' + Object.entries(SLOTS).map(([k, n]) => `<button data-a="garderobe" data-o="${k}" class="${k === slot ? 'actif' : ''}">${n}</button>`).join('') + '</div>';
    const cartes = SKINS.filter(s => s.slot === slot).map(s => {
      const R0 = RARETES[s.rar], ok = possede(s.id), n = S.frag[s.id] || 0, eq = S.equip[slot] === s.id;
      const apercu = s.c ? `<span class="pastille" style="background:linear-gradient(135deg,${s.c.join(',')})"></span>` : `<span class="pastille" style="background:${s.col || '#333'}"></span>`;
      return `<button class="skin ${eq ? 'actif' : ''} ${ok ? '' : 'verrou'}" data-a="skin" data-k="${s.id}" style="--rc:${R0.col}">${apercu}<b>${s.nom}</b><span class="rar">${R0.nom}</span>${ok ? (eq ? '<span>✔ porté</span>' : '<span>porter</span>') : `<span>${n} / ${R0.frags} fragments</span>`}</button>`;
    }).join('');
    this.ecran('👕 Garde-robe', onglets + `<p class="mini">Les fragments tombent des boss (30 %), des méga boss, des défis réussis et de la chasse. Les apparences légendaires viennent des boss légendaires.</p><div class="grille-skins">${cartes}</div>`);
  },

  // ---------- Codex ----------
  codex(o) {
    const cx = Save.d.codex;
    const onglets = [['especes', 'Bestiaire'], ['att', 'Attaques'], ['reliques', 'Reliques'], ['legend', 'Légendaires'], ['traits', 'Mutations'], ['cartes', 'Arènes'], ['invoc', 'Invocations'], ['arm', 'Arsenal']];
    let corps = '';
    const inconnu = t => `<div class="entree inconnu"><b>???</b><p>${t}</p></div>`;
    if (o === 'especes') {
      const ids = ESP_ORDRE.concat(['chimere']);
      corps = `<div class="liste large">` + ids.map(i => {
        const e = ESPECES[i], v = cx.especes[i];
        if (!v) return inconnu('Pas encore rencontrée.');
        const sig = [...new Set(e.phases.flatMap(ph => ph.cycle).filter(id => ATK[id].esp))];
        const cyc = sig.length ? `<div class="cyc"><span>Signature</span> ${sig.map(id => ATK[id].nom).join(' · ')} <em>+ attaques tirées au sort pour chaque boss</em></div>` : '<div class="cyc"><em>Toutes ses attaques sont tirées au sort.</em></div>';
        return `<div class="entree"><b style="color:${e.hue != null ? hsl(e.hue, 100, 66) : '#ddd'}">${nomMaj(e.nom)} <span class="etoiles">${'★'.repeat(etoiles(i))}</span></b><span class="cpt">${v.tues} / ${v.vus}</span><p>${e.meca}</p>${cyc}</div>`;
      }).join('') + '</div>';
    } else if (o === 'att') {
      const ids = Object.keys(ATK);
      corps = `<p class="mini">${ids.filter(i => cx.att[i]).length} / ${ids.length} découvertes</p><div class="liste">` + ids.map(i => cx.att[i] ? `<div class="entree"><b>${ATK[i].nom}</b><span class="cpt">${cx.att[i]}×</span><p>${ATK[i].conseil}</p></div>` : inconnu('Pas encore rencontrée.')).join('') + '</div>';
    } else if (o === 'legend') {
      const L = Save.d.legendaires || {};
      corps = '<p class="mini">Parfois (rarement) un boss est LÉGENDAIRE : doré, plus coriace, il donne une apparence légendaire.</p><div class="liste">' + ESP_ORDRE.map(e => L[e] ? `<div class="entree"><b style="color:#ffb43d">✦ ${nomMaj(ESPECES[e].nom)} légendaire</b><p>Vaincu.</p></div>` : inconnu('Pas encore rencontré.')).join('') + '</div>';
    } else if (o === 'reliques') {
      corps = '<p class="mini">Après chaque boss, deux reliques apparaissent : prends-en une (ou aucune). Chacune donne un avantage ET un défaut : elles changent ta façon de jouer, pas ta puissance. Elles durent jusqu\'au prochain méga boss.</p><div class="liste">' + Object.values(RELIQUES).map(r => `<div class="entree"><b>${r.ico} ${r.nom}</b><p><span style="color:#7dffb0">+ ${r.desc}</span><br><span style="color:#ff9aa8">${r.malus}</span></p></div>`).join('') + '</div>';
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
    const ret = this.retour, K = TOUCHES(), nt = nomToucheCourt;
    this.montrer(`
      <div class="panneau">
        <div class="barre-titre"><button class="rond" data-a="retour" data-echap title="Retour">←</button><h2>❔ Aide</h2></div>
        <div class="aide-g">
          <div><kbd>${nt(K.haut)}${nt(K.gauche)}${nt(K.bas)}${nt(K.droite)}</kbd><span>se déplacer</span></div><div><kbd>Souris</kbd><span>viser</span></div>
          <div><kbd>${nt(K.tir)}</kbd><span>arme</span></div><div><kbd>${nt(K.spec)}</kbd> <kbd>${nt(K.spec2)}</kbd><span>spéciale</span></div>
          <div><kbd>${nt(K.tal)}</kbd> <kbd>${nt(K.tal2)}</kbd><span>talent</span></div><div><kbd>Échap</kbd><span>pause</span></div>
        </div>
        <div class="blocs">
          <div class="bloc"><h3>🔴 Survivre</h3><p>Seul le <b>point rouge</b> de ton héros est touchable. Tout ce qui fait mal est <b>annoncé</b> avant ; quand ça clignote blanc, ça part.</p></div>
          <div class="bloc"><h3>🧠 Apprendre</h3><p>Chaque espèce répète <b>toujours le même cycle</b>. Contour doré = <b>OUVERT</b> : frappe fort. Si tu meurs, tu rejoues le même boss.</p></div>
          <div class="bloc"><h3>📈 Progresser</h3><p>Rien ne te rend plus fort : seulement <b>meilleur</b>. Les <b>reliques</b> et la <b>forge</b> changent ton style (un avantage, un défaut) ; la <b>garde-robe</b> change ton look.</p></div>
        </div>
      </div>`);
    this.retour = ret;
  },

  // ---------- Paramètres ----------
  options(o, onglet) {
    const op = Save.d.opts, depuis = o === 'pause' ? 'pause' : 'menu';
    onglet = onglet || this.ongletOpt || 'son'; this.ongletOpt = onglet; this.ongletOptDepuis = depuis;
    this.retour = depuis === 'pause' ? () => this.pause() : () => this.menu();
    const curseur = (id, nom, val, min, max, pas) => `<label class="opt">${nom}<input type="range" min="${min}" max="${max}" step="${pas}" value="${val}" id="${id}"><span class="val" id="${id}-v">${Math.round(val * 100)} %</span></label>`;
    const coche = (id, nom, val) => `<label class="opt interr"><span>${nom}</span><input type="checkbox" id="${id}" ${val ? 'checked' : ''}><i></i></label>`;
    const choix = (id, nom, val, liste) => `<label class="opt">${nom}<select id="${id}">${liste.map(([k, n]) => `<option value="${k}" ${String(k) === String(val) ? 'selected' : ''}>${n}</option>`).join('')}</select></label>`;
    let corps = '';
    if (onglet === 'son') corps = curseur('o-master', 'Général', op.master, 0, 1, .05) + curseur('o-vol', 'Bruitages', op.vol, 0, 1, .05) + curseur('o-mus', 'Musique', op.musique, 0, 1, .05) +
      `<div class="rang"><button id="o-test">🔊 Tester le son</button></div><p class="mini">Rien n'est audible ? Vérifie la sortie audio de Windows (ton casque doit être la sortie par défaut).</p>`;
    else if (onglet === 'image') corps = coche('o-fx', 'Effets cinématiques (shaders)', op.postfx !== false) + curseur('o-fxf', 'Force des effets', op.postfxForce || 1, .3, 1.3, .05) + coche('o-lum', 'Halos lumineux', op.lumiere) + coche('o-decor', 'Brume et poussière', op.decorAnime) +
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
    else corps = [['haut', '⬆ Haut'], ['bas', '⬇ Bas'], ['gauche', '⬅ Gauche'], ['droite', '➡ Droite'], ['tir', '🔫 Arme'], ['spec', '💥 Spéciale'], ['spec2', '💥 Spéciale (2e)'], ['tal', '💨 Talent'], ['tal2', '💨 Talent (2e)'], ['pause', '⏸ Pause']].map(([k, n]) => `<div class="ligne touche-l"><span>${n}</span><button class="tch" data-k="${k}">${this.capture === k ? '… appuie' : nomTouche(op.touches[k])}</button></div>`).join('') + '<p class="mini">Clique sur une case puis appuie sur une touche <b>ou un bouton de la souris</b> (Échap : annuler). Les mêmes touches servent partout : parties, défis, Abysses, entraînement.</p><div class="rang"><button data-a="touchesDef">Touches par défaut</button></div>';
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
    lier('o-fx', t => op.postfx = t.checked); lier('o-fxf', t => { op.postfxForce = +t.value; pct('o-fxf', op.postfxForce); }, 'input');
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
      const fini = code => {
        removeEventListener('keydown', clavier, true); removeEventListener('mousedown', souris, true);
        if (code) {
          // si la touche servait déjà ailleurs, on échange les deux
          const k = this.capture, ancien = op.touches[k];
          for (const a in op.touches) if (a !== k && op.touches[a] === code) op.touches[a] = ancien;
          op.touches[k] = code;
        }
        this.capture = null; Save.write(); Input.clear(); this.options(o, 'commandes');
      };
      const clavier = e => { e.preventDefault(); e.stopPropagation(); fini(e.code === 'Escape' ? null : e.code); };
      const souris = e => {
        e.preventDefault(); e.stopPropagation();
        // le clic qui suit ce bouton ne doit rien déclencher dans le menu
        const bloque = x => { x.stopPropagation(); x.preventDefault(); removeEventListener('click', bloque, true); };
        addEventListener('click', bloque, true); setTimeout(() => removeEventListener('click', bloque, true), 400);
        fini('Mouse' + e.button);
      };
      setTimeout(() => { addEventListener('keydown', clavier, true); addEventListener('mousedown', souris, true); }, 0);
    }));
  }
};
function appliquerAffichage() { const c = document.getElementById('jeu'); if (c) c.style.filter = Save.d.opts.luminosite && Save.d.opts.luminosite !== 1 ? `brightness(${Save.d.opts.luminosite})` : ''; }
