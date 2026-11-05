'use strict';
/* Colosses — manette (Xbox, PlayStation… via l'API Gamepad du navigateur).
   Combat : stick gauche = bouger, stick droit = viser, gâchette droite (RT/R2) = tirer, RB/R1 ou gâchette gauche
   = spéciale, A/Croix ou LB/L1 = talent, Start/Options = pause.
   Menus : croix directionnelle ou stick = choisir, A = valider, B/Rond = retour.
   La manette « appuie » sur les touches réglées dans Paramètres → Touches : rien d'autre ne change dans le jeu. */

const Manette = {
  avant: {}, tenues: new Set(), visee: null, focus: -1, repetT: 0, dernierAxe: 0, utilisee: false,
  // manettes branchées (la 1re sert au joueur 1, sauf en coop où la dernière sert au joueur 2)
  liste() { try { return [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(g => g && g.connected); } catch (e) { return []; } },
  pourJ1() { const l = this.liste(); if (typeof Coop !== 'undefined' && Coop.actif() && l.length < 2) return null; return l[0] || null; },
  bouton(g, i) { const b = g.buttons[i]; return !!b && (b.pressed || b.value > .5); },
  // appuie ou relâche une touche réglée, comme si le joueur le faisait au clavier
  tenir(code, oui) {
    if (!code) return;
    if (oui) { if (!Input.k[code]) Input.p[code] = true; Input.k[code] = true; this.tenues.add(code); }
    else if (this.tenues.has(code)) { Input.k[code] = false; this.tenues.delete(code); }
  },
  frapper(code) { Input.p[code] = true; },
  lire() {
    const g = this.pourJ1();
    if (!g) { for (const c of [...this.tenues]) this.tenir(c, false); this.visee = null; return; }
    const K = TOUCHES(), ax = g.axes, mort = .3;
    const lx = Math.abs(ax[0]) > mort ? ax[0] : 0, ly = Math.abs(ax[1]) > mort ? ax[1] : 0;
    const rx = ax[2] || 0, ry = ax[3] || 0;
    const B = i => this.bouton(g, i), nouveau = i => B(i) && !this.avant[i];
    if (lx || ly || B(0) || B(7) || Math.hypot(rx, ry) > .4) this.utilisee = true;
    const enJeu = G.etat === 'combat' || G.etat === 'interlude';
    if (enJeu) {
      this.tenir(K.gauche, lx < -.3 || B(14)); this.tenir(K.droite, lx > .3 || B(15));
      this.tenir(K.haut, ly < -.3 || B(12)); this.tenir(K.bas, ly > .3 || B(13));
      const C = MANETTE_CFG(), A = act => (C[act] || []).some(i => B(i));
      this.tenir(K.tir, A('tir'));
      this.tenir(K.spec, A('spec'));
      this.tenir(K.tal, A('tal'));
      if ((C.pause || []).some(i => nouveau(i))) this.frapper('Escape');
      // visée au stick droit : un point devant le héros, converti en position d'écran (comme la souris)
      // visée douce : le viseur tourne vers la direction du stick à une vitesse réglable, à une distance selon l'inclinaison
      const inc = Math.hypot(rx, ry), sens = MANETTE_CFG().sens || .5;
      if (inc > .35 && G.p) { const voulu = Math.atan2(ry, rx); if (this.visee === null) this.visee = voulu; else this.visee += clamp(angDiff(this.visee, voulu), -sens * 9 / 60, sens * 9 / 60); this.portee = 110 + 150 * Math.min(1, inc); }
      if (this.visee !== null && G.p && typeof scale !== 'undefined') {
        const wx = G.p.x + Math.cos(this.visee) * (this.portee || 220), wy = G.p.y + Math.sin(this.visee) * (this.portee || 220);
        Input.sx = offX + wx * scale; Input.sy = offY + wy * scale;
      }
    } else {
      for (const c of [...this.tenues]) this.tenir(c, false);
      this.visee = null;
      this.menus(g, nouveau, ly, lx);
    }
    this.avant = {}; g.buttons.forEach((b, i) => { this.avant[i] = b.pressed || b.value > .5; });
  },
  // menus : on passe d'un bouton à l'autre, A clique, B revient
  menus(g, nouveau, ly, lx) {
    const e = document.getElementById('ecran');
    if (G.etat === 'mort' && G.ecranMort) { if (nouveau(0)) this.frapper('Enter'); if (nouveau(1)) this.frapper('Escape'); return; }
    if (!e || !e.classList.contains('ouvert')) return;
    const btns = [...e.querySelectorAll('button:not([disabled]), [data-a].succes, .titre-joueur')].filter(b => b.offsetParent !== null);
    if (!btns.length) return;
    const axe = (ly > .5 || this.bouton(g, 13) || lx > .5 || this.bouton(g, 15)) ? 1 : (ly < -.5 || this.bouton(g, 12) || lx < -.5 || this.bouton(g, 14)) ? -1 : 0;
    const t = performance.now();
    if (axe && (axe !== this.dernierAxe || t > this.repetT)) {
      if (this.focus < 0 || this.focus >= btns.length || !btns[this.focus].classList.contains('focus-manette')) { const d = btns.findIndex(b => b.hasAttribute('data-def')); this.focus = d >= 0 ? d : 0; }
      else this.focus = (this.focus + axe + btns.length) % btns.length;
      btns.forEach(b => b.classList.remove('focus-manette')); btns[this.focus].classList.add('focus-manette'); btns[this.focus].scrollIntoView({ block: 'nearest' });
      this.repetT = t + (axe === this.dernierAxe ? 140 : 380); Son.play('clic');
    }
    this.dernierAxe = axe;
    if (nouveau(0)) { const f = btns.find(b => b.classList.contains('focus-manette')); if (f) f.click(); else this.frapper('Enter'); }
    if (nouveau(1)) this.frapper('Escape');
    if (nouveau(9) && G.etat === 'pause') this.frapper('Escape');
  }
};
// lue juste avant chaque image du jeu
const _pasManette = pasBoucle;
pasBoucle = function (now) { try { Manette.lire(); } catch (e) { } return _pasManette(now); };
addEventListener('gamepadconnected', () => { Manette.utilisee = true; });
