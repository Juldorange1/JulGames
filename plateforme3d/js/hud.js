// ============================================================================
// ASCENSION — hud.js
// Petites fonctions d'affichage : progression, vitesse, aptitudes, toasts,
// objectif courant. Pas d'état de jeu ici, juste du DOM.
// ============================================================================
window.AS = window.AS || {};

AS.Hud = (function () {
  const $ = (id) => document.getElementById(id);

  function fmtTime(ms) {
    const s = ms / 1000;
    if (s < 60) return s.toFixed(2) + 's';
    const m = Math.floor(s / 60);
    const r = s - m * 60;
    return m + ':' + (r < 10 ? '0' : '') + r.toFixed(2);
  }

  // Partie générée : numéro de la partie et difficulté à la place de l'altitude.
  function setRunProgress(section, t, label) {
    $('altNow').textContent = section;
    $('altMax').textContent = Math.round(t * 100);
    $('altLabel').textContent = label;
    $('altBarFill').style.width = (t * 100) + '%';
  }

  function setSpeed(speed, maxSpeed) {
    const pct = AS.Util.clamp((speed / (maxSpeed * 1.9)) * 100, 0, 100);
    $('speedFill').style.width = pct + '%';
  }

  function setZoneTimer(ms) {
    $('zoneTimeValue').textContent = (ms / 1000).toFixed(2);
  }

  function setAbility(name, unlocked, justNow) {
    const el = document.querySelector('.ability-icon[data-ability="' + name + '"]');
    if (!el) return;
    if (unlocked) {
      el.classList.remove('locked');
      if (justNow) {
        el.classList.remove('just-unlocked');
        void el.offsetWidth;
        el.classList.add('just-unlocked');
      }
    } else {
      el.classList.add('locked');
    }
  }

  function toast(text) {
    const wrap = $('toastWrap');
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 3100);
  }

  function setObjective(text) {
    const el = $('objective');
    if (!text) { el.classList.remove('show'); return; }
    el.textContent = text;
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('show'));
  }

  return {
    fmtTime, setRunProgress, setSpeed, setZoneTimer, setAbility, toast, setObjective, $,
  };
})();
