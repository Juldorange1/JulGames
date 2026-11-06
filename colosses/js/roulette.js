'use strict';
/* Colosses — roulette des achats au hasard : quand on achète un fragment au hasard dans la garde-robe, une bande
   d'apparences défile, ralentit et s'arrête sur celle qu'on a gagnée, qui s'illumine (couleur de sa rareté).
   Le tirage est fait avant l'animation (même hasard qu'avant) : la roulette montre seulement le résultat. */

function apercuSkin(s) {
  const fond = s.c ? `linear-gradient(135deg,${s.c.join(',')})` : (s.col || '#333');
  return `<span class="rl-pastille" style="background:${fond}"></span>`;
}
const Roulette = {
  lancer(slot) {
    const F = forgeSave(); if (F.eclats < PRIX_HASARD) return;
    const S = skinsSave(), avant = Object.assign({}, S.frag);
    F.eclats -= PRIX_HASARD;
    const texte = donnerFragment(null, null); // toutes catégories : on ne choisit pas ce qu'on obtient
    const gagne = SKINS.find(s => (S.frag[s.id] || 0) > (avant[s.id] || 0));
    if (!gagne) { UI.garderobe(slot); return; } // plus rien à gagner : des cristaux à la place
    // la bande : des apparences possibles de cet emplacement, mélangées, avec la gagnante à la bonne place
    const pool = SKINS.filter(s => !s.base && s.rar !== 'legendaire' && (!s.saison || saisonOk(s.saison)));
    const bande = []; for (let i = 0; i < 34; i++) bande.push(pool[Math.floor(Math.random() * pool.length)]);
    const cible = 28; bande[cible] = gagne;
    const LARG = 120;
    const ov = document.createElement('div'); ov.className = 'roulette';
    ov.innerHTML = `<div class="rl-cadre"><h3>⟦ui:cadeau⟧ Fragment au hasard</h3><div class="rl-fenetre"><div class="rl-bande">${bande.map(s => `<div class="rl-case" style="--r:${RARETES[s.rar].col}">${apercuSkin(s)}<b>${s.nom}</b><small>${RARETES[s.rar].nom}</small></div>`).join('')}</div><div class="rl-repere"></div></div><p class="rl-res"></p><p class="mini rl-passer">Clic ou Espace : passer l'animation</p><div class="rang"><button class="rl-ok" disabled>OK</button></div></div>`;
    UI.el.appendChild(ov);
    try { iconiser(ov); } catch (e) { } try { if (typeof Langue !== 'undefined') Langue.dom(ov); } catch (e) { }
    const bandeEl = ov.querySelector('.rl-bande'), fen = ov.querySelector('.rl-fenetre');
    const fin = cible * LARG - (fen.clientWidth / 2 - LARG / 2) + (Math.random() * 60 - 30);
    const duree = 1500, t0 = performance.now(); let derniere = -1, passe = false;
    // passer l'animation : un clic n'importe où (ou Espace / Entrée) va directement au résultat
    ov.addEventListener('click', ev => { if (!ev.target.classList.contains('rl-ok')) { ev.stopPropagation(); passe = true; } });
    const touche = ev => { if (ev.code === 'Space' || ev.code === 'Enter' || ev.code === 'Escape') { passe = true; } }; addEventListener('keydown', touche);
    const pas = () => {
      const k = passe ? 1 : Math.min(1, (performance.now() - t0) / duree), e = 1 - Math.pow(1 - k, 4); // ralentit à la fin
      const x = fin * e; bandeEl.style.transform = `translateX(${-x}px)`;
      const caseIdx = Math.floor((x + fen.clientWidth / 2) / LARG); if (caseIdx !== derniere) { derniere = caseIdx; Son.play('clic'); }
      if (k < 1) requestAnimationFrame(pas);
      else {
        bandeEl.style.transform = `translateX(${-(cible * LARG - (fen.clientWidth / 2 - LARG / 2))}px)`;
        removeEventListener('keydown', touche);
        const c = bandeEl.children[cible]; c.classList.add('gagne'); Son.play('ramasse');
        const res = ov.querySelector('.rl-res'); res.textContent = texte; res.style.color = RARETES[gagne.rar].col;
        try { if (typeof Langue !== 'undefined') Langue.dom(ov); } catch (e) { }
        const ok = ov.querySelector('.rl-ok'); ok.disabled = false; ok.setAttribute('data-def', '');
        ok.addEventListener('click', ev => { ev.stopPropagation(); Son.play('clic'); ov.remove(); UI.garderobe(gagne.slot); const p = document.createElement('p'); p.className = 'mini gain'; p.textContent = texte; const g = UI.el.querySelector('.grille-skins'); if (g) { g.before(p); try { if (typeof Langue !== 'undefined') Langue.dom(p); } catch (e) { } } });
      }
    };
    requestAnimationFrame(pas);
  }
};
const _actionRoulette = UI.action;
UI.action = function (a, btn) {
  if (a === 'fragHasard') return Roulette.lancer(btn.dataset.o);
  return _actionRoulette.call(this, a, btn);
};
