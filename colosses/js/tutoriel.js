'use strict';
/* Colosses — tutoriel du premier lancement : six étapes jouées pour de vrai contre un colosse d'entraînement
   (se déplacer, viser et tirer, l'attaque spéciale, le talent, esquiver les zones annoncées, puis un vrai petit
   combat). Les explications s'adaptent à ce que tu utilises : clavier et souris, manette, ou écran tactile.
   On ne peut pas mourir pendant le tutoriel. Il se refait depuis Paramètres → Jeu. */

const Tuto = {
  actif: false, etape: 0, t: 0, n: 0, base: 0, zoneT: 0, coups0: 0, esquives: 0, essais: 0, fini: false,
  appareil() { if (typeof Tactile !== 'undefined' && Tactile.actif) return 'tactile'; if (Manette.utilisee && Manette.pourJ1()) return 'manette'; return 'clavier'; },
  touches() {
    const K = TOUCHES(), nt = c => typeof nomTouche === 'function' ? nomTouche(c) : c, a = this.appareil();
    if (a === 'manette') return { bouger: T2('le stick gauche'), viser: T2('le stick droit'), tirer: T2('la gâchette droite (RT / R2)'), spec: T2('RB / R1'), tal: T2('A / Croix') };
    if (a === 'tactile') return { bouger: T2('le joystick à gauche de l\'écran'), viser: T2('ton doigt à droite de l\'écran'), tirer: T2('ton doigt posé à droite (il vise et tire)'), spec: T2('le bouton ✦'), tal: T2('le bouton ➜') };
    return { bouger: [K.haut, K.gauche, K.bas, K.droite].map(nt).join(' ') + ' ' + T2('ou les flèches'), viser: T2('la souris'), tirer: nt(K.tir), spec: nt(K.spec), tal: nt(K.tal) };
  },
  ETAPES: [
    { titre: 'Bienvenue, chasseur de colosses', txt: k => T2('Déplace-toi avec') + ' ' + k.bouger + '.' },
    { titre: 'Vise et tire', txt: k => T2('Vise le colosse avec') + ' ' + k.viser + ' ' + T2('et tire avec') + ' ' + k.tirer + '.' },
    { titre: 'L\'attaque spéciale', txt: k => T2('Ton attaque spéciale fait très mal mais se recharge lentement. Lance-la avec') + ' ' + k.spec + '.' },
    { titre: 'Le talent', txt: k => T2('Ton talent sert surtout à esquiver. Utilise-le avec') + ' ' + k.tal + '.' },
    { titre: 'Esquive', txt: k => T2('Le colosse annonce toujours ses attaques : une zone rouge apparaît, puis elle frappe. Sors de la zone avant qu\'elle explose !') },
    { titre: 'Ton premier combat', txt: k => T2('Le colosse se réveille. Esquive ses attaques et abats-le ! (Tu ne peux pas mourir pendant le tutoriel.)') }
  ],
  lancer() {
    this.actif = true; this.etape = 0; this.fini = false; Save.d.tutoFait = 1; Save.write();
    const cfg = { seed: 4242, esp: 'bourreau', salle: 1, p: 'blaster', s: 'missiles', t: 'dash' };
    this.ancOpts = { conseils: Save.d.opts.conseils }; Save.d.opts.conseils = false;
    ESP_FORCE = 'bourreau'; try { G.lancerEntrainement(cfg); } finally { ESP_FORCE = null; }
    UI.cacher(); if (G.etat === 'avant' && typeof Avant !== 'undefined') Avant.entrer();
    this.debutEtape(0);
  },
  debutEtape(i) {
    this.etape = i; this.t = 0; this.n = 0; this.base = G.degatsCombat || 0; this.zoneT = 1; this.esquives = 0; this.essais = 0;
    if (G.p) { this.px = G.p.x; this.py = G.p.y; this.spec0 = G.p.spec.cd || 0; }
    if (i === 5 && G.boss) { G.boss.hp = G.boss.hpMax = 2600; G.dmgE = (G.dmgE || 1) * .35; G.boss.idle = 1.5; }
    if (i > 0) { try { Son.play('ramasse'); } catch (e) { } }
  },
  maj(dt) {
    if (!this.actif || G.mode !== 'entrainement' || G.etat !== 'combat' || !G.p || !G.boss) return;
    const p = G.p, b = G.boss; this.t += dt;
    if (this.etape < 5) { b.idle = 99; b.main = null; b.fond = null; G.eb.length = 0; if (b.hp < b.hpMax * .5) b.hp = b.hpMax; } // il reste sage tant qu'on apprend
    p.hp = Math.max(p.hp, 1);
    const fait = () => this.debutEtape(this.etape + 1);
    switch (this.etape) {
      case 0: this.n += Math.hypot(p.x - this.px, p.y - this.py); this.px = p.x; this.py = p.y; if (this.n > 500) fait(); break;
      case 1: if ((G.degatsCombat || 0) - this.base > 600) fait(); break;
      case 2: if ((p.spec.cd || 0) > this.spec0 + .5 || this.t > 25) fait(); this.spec0 = Math.max(0, Math.min(this.spec0, p.spec.cd || 0)); break;
      case 3: if (p.dash || p.fantome > 0 || (p.tal && p.tal.cd > 0) || this.t > 20) fait(); break;
      case 4: {
        this.zoneT -= dt;
        if (this.zoneT <= 0 && this.essais < 6) {
          this.essais++; this.zoneT = 2.4; this.coups0 = G.coupsPris || 0;
          const avant = G.atkCourante; G.atkCourante = 'Tutoriel'; zoneC(p.x, p.y, 75, 1.3, { dmg: 1, apres: () => { if ((G.coupsPris || 0) === this.coups0) { this.esquives++; G.texte(p.x, p.y - 30, T2('Esquivé !'), '#7dffb0', 18); } } }); G.atkCourante = avant;
        }
        if (this.esquives >= 3 || (this.essais >= 6 && this.zoneT <= 0)) fait();
        break;
      }
      case 5: break; // le combat : la victoire termine le tutoriel
    }
  },
  terminer(bravo) {
    this.actif = false; Save.d.opts.conseils = this.ancOpts ? this.ancOpts.conseils : Save.d.opts.conseils; Save.d.tutoFait = 1; Save.write();
    if (bravo && typeof avis === 'function') setTimeout(() => avis('🎓 ' + T2('Tutoriel terminé ! Choisis une difficulté pour commencer ta chasse.')), 300);
  }
};
// on ne peut pas mourir pendant le tutoriel
const _blesserTuto = G.blesser;
G.blesser = function (dmg, src) { if (Tuto.actif && this.p) dmg = Math.min(dmg, Math.max(0, this.p.hp - 1)); return _blesserTuto.call(this, dmg, src); };
const _majTuto = majCombat;
majCombat = function (dt) { const t0 = G.t; _majTuto.apply(this, arguments); try { Tuto.maj(Math.max(0, Math.min(.1, G.t - t0))); } catch (e) { console.warn('tuto', e); } };
const _bossTuto = G.bossMort;
G.bossMort = function () { const r = _bossTuto.apply(this, arguments); if (Tuto.actif && this.boss && this.boss.mort) { Tuto.fini = true; setTimeout(() => { if (Tuto.actif) { Tuto.terminer(true); G.mode = 'normal'; UI.menu(); } }, 3500); } return r; };
const _menuTuto = UI.menu;
UI.menu = function () {
  if (Tuto.actif && !Tuto.fini) Tuto.terminer(false);
  const r = _menuTuto.apply(this, arguments);
  // premier lancement : on propose le tutoriel
  try {
    if (!Save.d.tutoFait && !(Save.d.stats && Save.d.stats.boss) && !document.getElementById('tuto-accueil')) {
      const d = document.createElement('div'); d.id = 'tuto-accueil'; d.className = 'tuto-accueil';
      d.innerHTML = `<div class="panneau court"><h2>🎓 ${T2('Bienvenue dans Colosses !')}</h2><p>${T2('Deux minutes pour apprendre à te déplacer, tirer, esquiver et abattre ton premier colosse.')}</p><div class="rang"><button data-t="oui" data-def>▶ ${T2('Faire le tutoriel')}</button><button data-t="non">${T2('Passer')}</button></div></div>`;
      document.body.appendChild(d);
      d.querySelector('[data-t=oui]').addEventListener('click', () => { d.remove(); Tuto.lancer(); });
      d.querySelector('[data-t=non]').addEventListener('click', () => { d.remove(); Save.d.tutoFait = 1; Save.write(); });
    }
  } catch (e) { }
  return r;
};
// la proposition disparaît dès qu'on ouvre autre chose que l'accueil
const _montrerTuto = UI.montrer;
UI.montrer = function () { const d = document.getElementById('tuto-accueil'); if (d) d.remove(); return _montrerTuto.apply(this, arguments); };
const _cacherTuto = UI.cacher;
UI.cacher = function () { const d = document.getElementById('tuto-accueil'); if (d) d.remove(); return _cacherTuto.apply(this, arguments); };
// les explications à l'écran
const _hudTuto = dessinerHUD;
dessinerHUD = function (c) {
  _hudTuto.apply(this, arguments);
  if (!Tuto.actif || G.mode !== 'entrainement' || !G.p) return;
  try {
    const E = Tuto.ETAPES[Tuto.etape], k = Tuto.touches(), w = 760, x = W / 2 - w / 2, y = 96;
    c.save(); c.fillStyle = 'rgba(10,8,20,.86)'; c.strokeStyle = 'rgba(255,216,107,.6)'; c.lineWidth = 2;
    c.beginPath(); c.roundRect ? c.roundRect(x, y, w, 96, 10) : c.rect(x, y, w, 96); c.fill(); c.stroke();
    c.textAlign = 'center'; c.textBaseline = 'middle';
    texteOmbre(c, (Tuto.fini ? '🏆 ' + T2('Bravo !') : T2('Étape') + ' ' + (Tuto.etape + 1) + ' / 6 · ' + T2(E.titre)), W / 2, y + 26, '#ffd86b', `800 20px ${POLICE_ER}`, 4);
    c.font = `600 16px ${POLICE}`; c.fillStyle = '#f2ead8';
    const txt = Tuto.fini ? T2('Tu as abattu ton premier colosse. La vraie chasse commence !') : E.txt(k);
    const mots = txt.split(' '); let l1 = '', l2 = ''; for (const m of mots) { if (c.measureText(l1 + ' ' + m).width < w - 40 && !l2) l1 += (l1 ? ' ' : '') + m; else l2 += (l2 ? ' ' : '') + m; }
    c.fillText(l1, W / 2, y + 56); if (l2) c.fillText(l2, W / 2, y + 78);
    // la barre de progression de l'étape
    const prog = [Math.min(1, Tuto.n / 500), Math.min(1, ((G.degatsCombat || 0) - Tuto.base) / 600), 0, 0, Tuto.esquives / 3, G.boss ? 1 - G.boss.hp / G.boss.hpMax : 0][Tuto.etape] || 0;
    c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(x + 20, y + 90, w - 40, 3); c.fillStyle = '#ffd86b'; c.fillRect(x + 20, y + 90, (w - 40) * prog, 3);
    c.restore();
  } catch (e) { }
};
// Paramètres → Jeu : refaire le tutoriel
const _actTuto = UI.action;
UI.action = function (a, btn) { if (a === 'tutoriel') { Tuto.lancer(); return; } return _actTuto.call(this, a, btn); };
const _optTuto = UI.options;
UI.options = function (o, onglet) {
  const r = _optTuto.apply(this, arguments);
  try {
    if ((onglet || this.ongletOpt) === 'jeu' && this.el && !this.el.querySelector('[data-a=tutoriel]')) {
      const rang = this.el.querySelector('.opts .rang'); const b = document.createElement('button'); b.dataset.a = 'tutoriel'; b.textContent = '🎓 ' + T2('Refaire le tutoriel');
      b.addEventListener('click', ev => { ev.stopPropagation(); UI.action('tutoriel', b); });
      if (rang) rang.appendChild(b);
    }
  } catch (e) { }
  return r;
};
