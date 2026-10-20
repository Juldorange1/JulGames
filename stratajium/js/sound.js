/* Stratajium — musique (vrais morceaux CC0, voir music/CREDITS.md) et bruitages (sfx/CREDITS.md).
   Pas d'à-coups : les morceaux montent et descendent en fondus lents (environ 3 s), et chaque morceau en boucle
   repart en fondu enchaîné avec lui-même avant sa fin (aucune coupure au bouclage).
   Avec ?muet dans l'adresse, le script du <head> rend toute lecture muette. */
const Sound = (function () {
  'use strict';
  function get(k, d) { try { const v = localStorage.getItem('stratajium.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem('stratajium.' + k, JSON.stringify(v)); } catch (e) { } }
  let musicOn = get('musique', true), sfxOn = get('effets', true), musicVol = get('volMusique', .8), sfxVol = get('volEffets', .9);
  // ambiances : chacune a plusieurs morceaux, joués au hasard l'un après l'autre (fondu enchaîné)
  const GROUPS = { menu: ['menu', 'menu2', 'menu3'], partie: ['partie', 'partie2', 'partie3'], foret: ['foret'], tension: ['tension', 'tension2'], boss: ['boss'], victoire: ['victoire', 'victoire2'], defaite: ['defaite'] };
  const MUSIC_VOL = { menu: .45, menu2: .45, menu3: .42, partie: .38, partie2: .34, partie3: .36, foret: .28, tension: .4, tension2: .38, boss: .4, victoire: .5, victoire2: .5, defaite: .5 };
  const LOOP = { menu: 1, partie: 1, foret: 1, tension: 1, boss: 1 };
  const groupOf = {}; for (const g in GROUPS) for (const f of GROUPS[g]) groupOf[f] = g;
  const curFile = {}; // ambiance -> morceau en cours
  const pickFile = (g, not) => { const l = GROUPS[g].filter(f => f !== not); return l.length ? l[Math.floor(Math.random() * l.length)] : GROUPS[g][0]; };
  const FADE_S = 3;        // durée d'un fondu de changement de morceau
  const XFADE_S = 4;       // fondu enchaîné au bouclage
  // chaque piste a 2 lecteurs pour pouvoir se fondre en elle-même au bouclage
  const tracks = {};
  function track(name) {
    if (!tracks[name]) {
      const mk = () => { const a = new Audio('music/' + name + '.mp3'); a.preload = 'auto'; a.volume = 0; a.loop = false; return a; };
      tracks[name] = { name, a: [mk(), mk()], cur: 0, gain: 0, xf: null };
    }
    return tracks[name];
  }
  let wanted = [], tick = 0, unlocked = /Electron/i.test(navigator.userAgent), last = performance.now();
  function startTick() { if (!tick) { last = performance.now(); tick = setInterval(step, 50); } }
  function want(groups) {
    // une ambiance qu'on (re)demande garde son morceau en cours ; sinon on en tire un au hasard
    const list = [];
    for (const g of groups) {
      if (!GROUPS[g]) continue;
      if (!curFile[g] || !wanted.includes(curFile[g])) { const t0 = curFile[g] && tracks[curFile[g]]; if (!t0 || t0.gain < .05) curFile[g] = pickFile(g); }
      list.push(curFile[g]);
    }
    wanted = list;
    if (!unlocked) return;
    for (const n of list) {
      const t = track(n), a = t.a[t.cur];
      if (musicOn && a.paused) { if (!LOOP[groupOf[n]] && t.gain < .05) a.currentTime = 0; a.play().catch(() => { }); }
    }
    startTick();
  }
  const ease = x => x * x * (3 - 2 * x);
  function step() {
    const now = performance.now(), dt = Math.min(.2, (now - last) / 1000); last = now;
    let busy = false;
    for (const n in tracks) {
      const t = tracks[n];
      const target = musicOn && wanted.includes(n) ? 1 : 0;
      if (t.gain !== target) { const d = dt / FADE_S; t.gain = target > t.gain ? Math.min(target, t.gain + d) : Math.max(target, t.gain - d); }
      const base = (MUSIC_VOL[n] || .4) * musicVol * ease(t.gain);
      const a = t.a[t.cur], b = t.a[1 - t.cur];
      // bouclage en fondu enchaîné
      if (LOOP[groupOf[n]] && t.gain > 0 && !a.paused && a.duration && a.currentTime > a.duration - XFADE_S - 1 && !t.xf && wanted.includes(n)) {
        const g = groupOf[n];
        if (GROUPS[g].length > 1) {
          // au lieu de reboucler : on passe en fondu à un autre morceau de la même ambiance
          const next = pickFile(g, n);
          curFile[g] = next; wanted = wanted.map(f => f === n ? next : f);
          const nt = track(next), na = nt.a[nt.cur]; na.currentTime = 0; if (musicOn) na.play().catch(() => { });
        } else { t.xf = now; b.currentTime = 0; b.volume = 0; b.play().catch(() => { }); }
      }
      if (t.xf) {
        const k = Math.min(1, (now - t.xf) / (XFADE_S * 1000));
        a.volume = base * (1 - ease(k)); b.volume = base * ease(k);
        if (k >= 1) { a.pause(); t.cur = 1 - t.cur; t.xf = null; }
      } else a.volume = base;
      if (t.gain > 0 || t.xf) busy = true;
      else for (const x of t.a) if (!x.paused) x.pause();
      if (t.gain > 0 && musicOn && a.paused && !a.ended && wanted.includes(n) && unlocked) a.play().catch(() => { });
    }
    if (!busy && !wanted.length) { clearInterval(tick); tick = 0; }
  }
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
    setMusic(on) { musicOn = !!on; set('musique', musicOn); want(wanted); startTick(); },
    setEffects(on) { sfxOn = !!on; set('effets', sfxOn); },
    get musicVol() { return musicVol; }, get sfxVol() { return sfxVol; },
    setMusicVol(v) { musicVol = Math.max(0, Math.min(1, v)); set('volMusique', musicVol); startTick(); },
    setSfxVol(v) { sfxVol = Math.max(0, Math.min(1, v)); set('volEffets', sfxVol); },
  };
})();
