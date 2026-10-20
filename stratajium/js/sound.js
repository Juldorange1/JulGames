/* Stratajium — musique (vrais morceaux CC0, voir music/CREDITS.md) et bruitages (sfx/CREDITS.md).
   Avec ?muet dans l'adresse, le script du <head> rend toute lecture muette. */
const Sound = (function () {
  'use strict';
  function get(k, d) { try { const v = localStorage.getItem('stratajium.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem('stratajium.' + k, JSON.stringify(v)); } catch (e) { } }
  let musicOn = get('musique', true), sfxOn = get('effets', true), musicVol = get('volMusique', .8), sfxVol = get('volEffets', .9);
  const MUSIC_VOL = { menu: .45, partie: .38, foret: .28, tension: .4, victoire: .5, defaite: .5 };
  const tracks = {};
  function track(name) {
    if (!tracks[name]) {
      const a = new Audio('music/' + name + '.mp3');
      a.loop = name !== 'victoire' && name !== 'defaite';
      a.preload = 'auto'; a.volume = 0;
      tracks[name] = a;
    }
    return tracks[name];
  }
  // fondu enchaîné entre les pistes voulues (ex. ['partie', 'foret'])
  // dans le programme (Electron), la musique peut démarrer tout de suite ; dans un navigateur il faut un premier clic
  let wanted = [], fadeT = 0, unlocked = /Electron/i.test(navigator.userAgent);
  function want(list) {
    wanted = list;
    if (!unlocked) return;
    for (const n of list) { const a = track(n); if (a.paused && musicOn) { if (!a.loop) a.currentTime = 0; a.play().catch(() => { }); } }
    if (!fadeT) fadeT = setInterval(fadeStep, 60);
  }
  function fadeStep() {
    let busy = false;
    for (const n in tracks) {
      const a = tracks[n], target = musicOn && wanted.includes(n) ? MUSIC_VOL[n] * musicVol : 0;
      const v = a.volume + Math.sign(target - a.volume) * Math.min(.03, Math.abs(target - a.volume));
      a.volume = Math.max(0, Math.min(1, v));
      if (Math.abs(a.volume - target) > .001) busy = true;
      else if (target === 0 && !a.paused) a.pause();
    }
    if (!busy) { clearInterval(fadeT); fadeT = 0; }
  }
  // les navigateurs n'acceptent le son qu'après un premier clic
  function unlock() { if (unlocked) return; unlocked = true; want(wanted); }
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });

  // ----- bruitages -----
  const SFX = ['clic', 'choix', 'erreur', 'annule', 'poser', 'pas', 'coup', 'mur', 'prise', 'recrute', 'mana', 'foudre', 'chute', 'sort', 'echange', 'evolution', 'page'];
  const SFX_VOL = { clic: .5, choix: .5, erreur: .5, annule: .45, poser: .8, pas: .6, coup: .7, mur: .6, prise: .65, recrute: .7, mana: .55, foudre: .7, chute: .5, sort: .6, echange: .6, evolution: .7, page: .6 };
  const pool = {};
  function sfx(name, vol, delay) {
    if (!sfxOn || !SFX.includes(name)) return;
    const go = () => {
      const list = pool[name] || (pool[name] = []);
      let a = list.find(x => x.paused || x.ended);
      if (!a) { if (list.length >= 4) a = list[0]; else { a = new Audio('sfx/' + name + '.ogg'); list.push(a); } }
      a.volume = Math.min(1, (SFX_VOL[name] || .6) * sfxVol * (vol === undefined ? 1 : vol));
      try { a.currentTime = 0; } catch (e) { }
      a.play().catch(() => { });
    };
    if (delay) setTimeout(go, delay); else go();
  }
  return {
    want, sfx,
    get music() { return musicOn; }, get effects() { return sfxOn; },
    setMusic(on) { musicOn = !!on; set('musique', musicOn); want(wanted); if (!fadeT) fadeT = setInterval(fadeStep, 60); },
    setEffects(on) { sfxOn = !!on; set('effets', sfxOn); },
    get musicVol() { return musicVol; }, get sfxVol() { return sfxVol; },
    setMusicVol(v) { musicVol = Math.max(0, Math.min(1, v)); set('volMusique', musicVol); if (!fadeT) fadeT = setInterval(fadeStep, 60); },
    setSfxVol(v) { sfxVol = Math.max(0, Math.min(1, v)); set('volEffets', sfxVol); },
  };
})();
