'use strict';
/* Colosses — jouer sur tablette (écran tactile). En combat : le doigt gauche fait apparaître un joystick pour se
   déplacer ; le doigt droit vise et tire tant qu'il reste posé (un simple appui sans glisser vise le boss tout seul) ;
   deux boutons ronds lancent la spéciale et le talent, un bouton en haut à droite met en pause.
   Les commandes n'apparaissent qu'après le premier toucher de l'écran ; les menus se touchent comme des boutons. */

const Tactile = {
  actif: false, el: null, gauche: null, droite: null, tenues: new Set(),
  tenir(code, oui) { if (!code) return; if (oui) { if (!Input.k[code]) Input.p[code] = true; Input.k[code] = true; this.tenues.add(code); } else if (this.tenues.has(code)) { Input.k[code] = false; this.tenues.delete(code); } },
  creer() {
    if (this.el) return;
    const d = document.createElement('div'); d.id = 'tactile';
    d.innerHTML = `<div class="tz tz-g"></div><div class="tz tz-d"></div>
      <div class="tjoy" id="tjoy-g"><i></i></div><div class="tjoy" id="tjoy-d"><i></i></div>
      <button class="tb tb-spec">Spéciale</button><button class="tb tb-tal">Talent</button><button class="tb tb-pause">II</button>
      <div class="tmort"><button class="tm-re">Réessayer</button><button class="tm-menu">Menu</button><button class="tm-ral">Ralenti</button></div>`;
    document.body.appendChild(d); this.el = d;
    const K = () => TOUCHES();
    const zone = (sel, cote) => {
      const z = d.querySelector(sel);
      z.addEventListener('pointerdown', e => { e.preventDefault(); Son.init(); z.setPointerCapture(e.pointerId); this[cote] = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY }; this.joy(cote); });
      z.addEventListener('pointermove', e => { const s = this[cote]; if (!s || s.id !== e.pointerId) return; e.preventDefault(); s.x = e.clientX; s.y = e.clientY; this.joy(cote); });
      const fin = e => { const s = this[cote]; if (!s || s.id !== e.pointerId) return; this[cote] = null; this.joy(cote); if (cote === 'gauche') ['haut', 'bas', 'gauche', 'droite'].forEach(k => this.tenir(K()[k], false)); else this.tenir(K().tir, false); };
      z.addEventListener('pointerup', fin); z.addEventListener('pointercancel', fin);
    };
    zone('.tz-g', 'gauche'); zone('.tz-d', 'droite');
    const bouton = (sel, touche) => {
      const b = d.querySelector(sel);
      b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); Son.init(); b.classList.add('appui'); this.tenir(K()[touche], true); });
      const fin = e => { b.classList.remove('appui'); this.tenir(K()[touche], false); };
      b.addEventListener('pointerup', fin); b.addEventListener('pointercancel', fin); b.addEventListener('pointerleave', fin);
    };
    bouton('.tb-spec', 'spec'); bouton('.tb-tal', 'tal');
    d.querySelector('.tb-pause').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); Input.p['Escape'] = true; });
    d.querySelector('.tm-re').addEventListener('click', e => { e.stopPropagation(); Son.init(); if (typeof Ralenti !== 'undefined') Ralenti.lecture = null; G.recommencer(); });
    d.querySelector('.tm-menu').addEventListener('click', e => { e.stopPropagation(); if (typeof Ralenti !== 'undefined') Ralenti.lecture = null; G.mode = 'normal'; UI.menu(); });
    d.querySelector('.tm-ral').addEventListener('click', e => { e.stopPropagation(); Input.p['KeyV'] = true; });
    try { if (typeof Langue !== 'undefined') Langue.dom(d); } catch (e) { }
  },
  // dessin du joystick (un rond et un bouton qui suit le doigt)
  joy(cote) {
    const j = document.getElementById(cote === 'gauche' ? 'tjoy-g' : 'tjoy-d'), s = this[cote]; if (!j) return;
    if (!s) { j.style.display = 'none'; return; }
    j.style.display = 'block'; j.style.left = s.x0 + 'px'; j.style.top = s.y0 + 'px';
    const dx = s.x - s.x0, dy = s.y - s.y0, l = Math.hypot(dx, dy), m = Math.min(l, 55), k = l > 0 ? m / l : 0;
    j.firstChild.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
  },
  // à chaque image : déplacement, visée et tir
  maj() {
    if (!this.el) return;
    const invite = G.etat === 'invite', enJeu = G.etat === 'combat' || G.etat === 'interlude' || G.etat === 'avant' || invite;
    const mort = G.etat === 'mort' && G.ecranMort;
    this.el.style.display = this.actif && (G.etat === 'combat' || G.etat === 'interlude' || mort || invite) ? 'block' : 'none';
    this.el.classList.toggle('invite', invite);
    this.el.classList.toggle('mort', !!mort);
    if (!enJeu || !this.actif) return;
    const K = TOUCHES(), g = this.gauche, dr = this.droite;
    if (g) {
      const dx = g.x - g.x0, dy = g.y - g.y0, m = 16;
      this.tenir(K.gauche, dx < -m); this.tenir(K.droite, dx > m); this.tenir(K.haut, dy < -m); this.tenir(K.bas, dy > m);
    }
    if (invite) { if (dr) { const dx = dr.x - dr.x0, dy = dr.y - dr.y0; Reseau.ang = Math.hypot(dx, dy) > 14 ? Math.atan2(dy, dx) : null; } else Reseau.ang = null; return; }
    if (!dr && G.etat === 'combat' && G.ars && G.boss && !G.boss.mort) { // tir automatique sur le boss (sauf les armes à charger)
      const prim = trouveArme('p', G.ars.p);
      if (prim && !prim.manuel) { Input.sx = offX + G.boss.x * scale; Input.sy = offY + G.boss.y * scale; this.tenir(K.tir, true); this.autoTir = true; }
    } else if (this.autoTir && !dr) { this.tenir(K.tir, false); this.autoTir = false; }
    if (dr && G.p) {
      const dx = dr.x - dr.x0, dy = dr.y - dr.y0;
      let wx, wy;
      if (Math.hypot(dx, dy) > 14) { const a = Math.atan2(dy, dx); wx = G.p.x + Math.cos(a) * 230; wy = G.p.y + Math.sin(a) * 230; }
      else if (G.boss && !G.boss.mort) { wx = G.boss.x; wy = G.boss.y; } // visée automatique sur le boss
      if (wx !== undefined) { Input.sx = offX + wx * scale; Input.sy = offY + wy * scale; }
      this.tenir(K.tir, true);
    }
  }
};
// le premier toucher de l'écran active les commandes tactiles
addEventListener('pointerdown', e => { if (e.pointerType === 'touch' && !Tactile.actif) { Tactile.actif = true; Tactile.creer(); } }, true);
const _pasTactile = pasBoucle;
pasBoucle = function (now) { try { Tactile.maj(); } catch (e) { } return _pasTactile(now); };
