'use strict';
/* Colosses — conseils intégrés : une petite bulle la première fois qu'on rencontre quelque chose
   (commandes, zones, rayons, ondes, traits, phases, cristaux, joker…). Chaque conseil n'apparaît qu'une fois
   (Save.d.conseils) ; on peut les couper ou les revoir dans Paramètres → Jeu. Le jeu ne s'arrête jamais. */

const Conseils = {
  file: [], cour: null, t: 0, combatT: 0, mortVue: false,
  vus() { return Save.d.conseils || (Save.d.conseils = {}); },
  actifs() { return Save.d.opts.conseils !== false && G.mode !== 'entrainement'; },
  // ajoute un conseil (une seule fois pour toute la sauvegarde)
  dire(cle, titre, texte, ico) {
    if (!this.actifs() || this.vus()[cle] || this.file.some(x => x.cle === cle) || (this.cour && this.cour.cle === cle)) return;
    this.file.push({ cle, titre, texte, ico: ico || 'ui:idee' });
  },
  reinitialiser() { Save.d.conseils = {}; this.file = []; this.cour = null; Save.write(); },
  vider() { this.file = []; this.cour = null; },
  // durée d'affichage selon la longueur du texte
  duree(cs) { return clamp(3.2 + cs.texte.length / 26, 5, 9.5); },
  maj(dt) {
    if (!this.cour && this.file.length) { this.cour = this.file.shift(); this.t = 0; this.vus()[this.cour.cle] = 1; Save.write(); }
    if (this.cour) { this.t += dt; if (this.t > this.duree(this.cour)) this.cour = null; }
  },
  // découpe un texte en lignes qui tiennent dans la largeur donnée
  lignes(c, txt, w) {
    const out = []; let l = '';
    for (const mot of txt.split(' ')) { const e = l ? l + ' ' + mot : mot; if (c.measureText(e).width > w && l) { out.push(l); l = mot; } else l = e; }
    if (l) out.push(l); return out;
  },
  dessiner(c) {
    const cs = this.cour; if (!cs) return;
    const dur = this.duree(cs), k = Math.min(1, this.t * 4, (dur - this.t) * 2.5);
    if (k <= 0) return;
    const w = 380, x = 16 - (1 - k) * 40, y = 92;
    c.save(); c.globalAlpha = k;
    c.font = `13px ${POLICE}`;
    const L = this.lignes(c, cs.texte, w - 64), h = 46 + L.length * 18;
    // cadre pierre + liseré doré
    const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(28,22,16,.94)'); g.addColorStop(1, 'rgba(12,9,7,.94)');
    c.fillStyle = g; c.fillRect(x, y, w, h);
    c.strokeStyle = 'rgba(0,0,0,.9)'; c.lineWidth = 4; c.strokeRect(x, y, w, h);
    c.strokeStyle = '#c9a865'; c.lineWidth = 1.5; c.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
    // barre de temps restant
    c.fillStyle = 'rgba(201,168,101,.55)'; c.fillRect(x + 4, y + h - 6, (w - 8) * Math.max(0, 1 - this.t / dur), 2);
    icoDessin(c, cs.ico, x + 28, y + 28, 30);
    c.textAlign = 'left'; c.textBaseline = 'middle';
    texteOmbre(c, cs.titre, x + 52, y + 20, '#ffd98a', `700 15px ${POLICE_ER || POLICE}`, 3);
    c.font = `13px ${POLICE}`; c.fillStyle = '#e8dcc4';
    L.forEach((l, i) => c.fillText(l, x + 52, y + 42 + i * 18));
    c.restore();
  }
};
function T_(k) { return nomTouche(TOUCHES()[k]); }

// ---------- déclencheurs ----------
function verifierConseils(dt) {
  const b = G.boss, p = G.p, C = Conseils;
  if (G.etat === 'combat' && b && !b.mort && b.intro <= 0) {
    C.combatT += dt;
    C.dire('commandes', 'Commandes', `Déplace-toi avec ${T_('haut')} ${T_('gauche')} ${T_('bas')} ${T_('droite')} et vise à la souris. Maintiens ${T_('tir')} pour tirer : garder le bouton enfoncé donne toujours la meilleure cadence.`, 'ui:arme');
    if (C.combatT > 7) C.dire('speciale', 'Spéciale et talent', `${T_('spec')} lance ton attaque spéciale, ${T_('tal')} ton talent. Ils ont seulement un temps de recharge, affiché en secondes sur leur case en bas.`, 'ui:special');
    for (const t of b.def.traits) if (TRAITS[t]) C.dire('trait:' + t, TRAITS[t].nom, TRAITS[t].desc, 'tr:' + t);
    if (G.mega) C.dire('mega', 'Méga boss', 'Toutes les 5 salles : un boss plus résistant, avec un halo. Il rapporte trois fois plus de cristaux et deux fragments rares.', 'ui:trophee');
    for (const h of G.hz) {
      if (h.kind === 'cercle' || h.kind === 'rect' || h.kind === 'secteur' || h.kind === 'couronne') { if (h.t < h.warn) C.dire('zone', 'Zones annoncées', 'Une zone qui se remplit frappe quand elle est pleine. Sors-en avant : seul l\'instant où elle se remplit compte.', 'ui:idee'); }
      else if (h.kind === 'rayon') { if (h.warn > 0 && h.t < h.warn) C.dire('rayon', 'Rayons', 'Une ligne fine annonce un rayon : écarte-toi de son axe avant qu\'il ne s\'épaississe. Certains rayons tournent, suis leur sens.', 'ui:idee'); }
      else if (h.kind === 'onde') C.dire('onde', 'Ondes', 'L\'onde grandit sur toute l\'arène. Elle a toujours un trou qui s\'ouvre de ton côté : glisse-toi dedans.', 'ui:idee');
    }
    if (G.minions.some(m => !m.dead && m.type !== 'cristal' && m.type !== 'tete' && m.type !== 'noeud')) C.dire('invocations', 'Invocations', 'Le boss appelle des créatures. Abats-les vite ou tiens-les à distance : elles disparaissent quand le boss meurt.', 'ui:idee');
    if (p && p.hp < p.hpMax * .35) C.dire('vie', 'Vie basse', 'Ta vie revient entièrement après chaque boss vaincu. Ici, mieux vaut esquiver que tirer.', 'ui:vie');
    if (fatigueBoss() > 1) C.dire('fatigue', 'Boss épuisé', 'Après 1 min 30, le boss s\'épuise : il encaisse de plus en plus de dégâts. Aucun combat ne dure éternellement.', 'ui:sablier');
    if (b.phase > 0) C.dire('phase', 'Nouvelle phase', 'Le boss change de phase : nouvelles attaques, parfois une nouvelle arène. Les traits du boss sont rappelés à droite de sa barre de vie.', 'ui:idee');
    if (C.mortVue && G.mode === 'normal') {
      C.dire('retour', 'Même boss', 'Après une mort, tu retrouves exactement le même boss, avec les mêmes armes : apprends ses attaques.', 'ui:recommencer');
      if (C.combatT > 12) C.dire('joker', 'Joker de passage', `Bloqué ? ${T_('pause')} puis « Passer ce boss ». Le joker est commun aux 3 difficultés et revient après 3 boss vaincus, dans n'importe quelle difficulté.`, 'ui:passer');
    }
  }
  if (G.etat === 'interlude') {
    if (G.gainCristaux && G.gainCristaux.t > 1.2) C.dire('cristaux', 'Cristaux', 'Les cristaux achètent des affinités (tes armes préférées sortent plus souvent) et des apparences, au menu. Jamais de puissance. Cauchemar en donne 2×, Apprenti ½.', 'ui:cristal');
    if (G.portail) C.dire('portail', 'Salle suivante', 'Ramasse le butin s\'il y en a, puis entre dans le portail. Le menu montre toujours le prochain boss.', 'ui:jouer');
  }
  if (G.etat === 'mort' && G.mode === 'normal') C.mortVue = true;
  C.maj(dt);
}

// ---------- branchements ----------
const _entrerConseils = G.entrerSalle;
G.entrerSalle = function () { Conseils.combatT = 0; Conseils.vider(); return _entrerConseils.apply(this, arguments); };
const _hudConseils = dessinerHUD;
dessinerHUD = function (c) {
  _hudConseils(c);
  try {
    if (G.etat === 'combat' || G.etat === 'interlude' || G.etat === 'mort') verifierConseils(1 / 60);
    if (G.etat !== 'mort' || !G.ecranMort) Conseils.dessiner(c);
  } catch (e) { console.warn('conseils', e); }
};
