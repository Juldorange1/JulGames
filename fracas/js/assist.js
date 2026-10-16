// MODE ASSISTE (active par defaut, Parametres > Accessibilite) : aide le joueur sans le gener.
// - avant de jouer un personnage (debut de partie, changement de perso en Infini) : fiche du
//   personnage, ses competences (celle disponible dans cette partie en avant) et comment le jouer ;
//   la partie attend que le joueur appuie sur JOUER ;
// - premiere rencontre d'un ennemi ou d'un boss : petite carte en haut avec sa description ;
// - nouvelle partie du Monde : rappel de la competence disponible.

const Assist = {
  open: false,        // fiche de personnage affichee : le jeu est fige
  _el: null,
  _cb: null,
  _raf: null,
  _toasts: null,

  on() { return !(Save.data && Save.data.assist === false); },

  // Fiche du personnage avant de le jouer. gate = competence disponible (1, 2, 3) ou null (toutes).
  briefing(charId, gate, onDone) {
    if (!this.on() || typeof UI === 'undefined' || !UI.overlay) { if (onDone) onDone(); return; }
    this.close(true);
    this.open = true;
    this._cb = onDone || null;
    const c = getCharacter(charId);
    const panel = UI.el('div', 'panel assist-panel');
    panel.appendChild(UI.el('div', 'assist-kicker', `🎓 ${S('assistTitle')}`));
    const body = UI.el('div', 'assist-body');
    const sc = createShowcase('character', charId);
    sc.canvas.classList.add('assist-portrait');
    body.appendChild(sc.canvas);
    const info = UI.el('div', 'assist-info');
    const name = UI.el('h2', 'assist-name', charName(charId));
    name.style.color = c.color || '#fff';
    info.appendChild(name);
    info.appendChild(UI.el('div', 'assist-epithet', charEpithet(charId)));
    info.appendChild(UI.el('p', 'assist-tip', `💡 ${S('charTip_' + charId)}`));
    const list = UI.el('div', 'assist-moves');
    const row = (key, label, extra, cls) => {
      const r = UI.el('div', 'assist-move' + (cls ? ' ' + cls : ''));
      r.appendChild(UI.el('b', 'assist-key', key));
      r.appendChild(UI.el('span', null, label));
      if (extra) r.appendChild(UI.el('em', null, extra));
      list.appendChild(r);
    };
    row(keyLabel(Keybinds.attack), charField(charId, 'attackLabel'), c.attackCd ? `${c.attackCd} s` : '', 'atk');
    for (const n of [1, 2, 3]) {
      const label = charField(charId, `a${n}Label`);
      const cd = c[`a${n}Cd`] ? `${c[`a${n}Cd`]} s` : '';
      if (gate == null) row(keyLabel(Keybinds['ability' + n]), label, cd);
      else if (n === gate) row(keyLabel(Keybinds.ability), label, cd, 'now');
      else row('🔒', label, `${S('hudPart')} ${n}`, 'locked');
    }
    info.appendChild(list);
    body.appendChild(info);
    panel.appendChild(body);
    const go = UI.el('div', 'menu-btn assist-go', `▶ ${S('tutoPlay')}`);
    go.onclick = () => this.close();
    panel.appendChild(go);
    panel.appendChild(UI.el('div', 'assist-off', S('assistOffHint')));
    UI.overlay.appendChild(panel);
    this._el = panel;
    // petite scene animee du personnage
    let last = performance.now();
    const loop = (now) => {
      try { sc.tick(clamp((now - last) / 1000, 0, 0.05)); } catch (e) { /* apercu indisponible */ }
      last = now;
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
    this._key = (e) => { if (e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter') { e.preventDefault(); this.close(); } };
    window.addEventListener('keydown', this._key);
    Audio2.uiClick();
  },

  close(silent) {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
    if (this._key) { window.removeEventListener('keydown', this._key); this._key = null; }
    if (this._el) { this._el.remove(); this._el = null; }
    const was = this.open;
    this.open = false;
    const cb = this._cb; this._cb = null;
    if (was && !silent && cb) cb();
  },

  // Petite carte non bloquante en haut de l'ecran (5 s).
  toast(icon, title, text, color) {
    if (!this.on() || typeof UI === 'undefined' || !UI.overlay) return;
    if (!this._toasts || !this._toasts.isConnected) {
      this._toasts = UI.el('div', 'assist-toasts');
      UI.overlay.appendChild(this._toasts);
    }
    const t = UI.el('div', 'assist-toast');
    if (color) t.style.borderColor = color;
    t.appendChild(UI.el('b', null, `${icon} ${title}`));
    if (text) t.appendChild(UI.el('span', null, text));
    this._toasts.appendChild(t);
    while (this._toasts.children.length > 3) this._toasts.firstChild.remove();
    setTimeout(() => t.classList.add('out'), 4600);
    setTimeout(() => t.remove(), 5200);
  },

  // Premiere rencontre d'un ennemi / boss (appele avant que le Codex ne le marque comme vu).
  newEnemy(type) {
    if (!type || type === 'DUMMY') return;
    const isBoss = /^B\d$/.test(type);
    const name = isBoss ? BOSS_DEFS[type].name : turretInfo(type).name;
    const desc = isBoss ? bossInfo(type).desc : turretInfo(type).desc;
    this.toast(isBoss ? '👑' : '⚠', `${S(isBoss ? 'assistNewBoss' : 'assistNewEnemy')} : ${name}`, desc, isBoss ? '#ffd23d' : '#ff9d5d');
  },

  // Nouvelle partie du Monde : quelle competence on a maintenant.
  newPart(charId, part) {
    this.toast('✨', `${S('hudPart')} ${part}`, `${S('assistAbilityNow')} : ${charField(charId, 'a' + part + 'Label')} (${keyLabel(Keybinds.ability)})`, '#7fff9c');
  },
};
