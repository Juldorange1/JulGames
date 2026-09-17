// Toute la couche interface (menus, HUD, panneau d'améliorations, écran de mort).
const UI = (() => {
  const screens = ['menu-screen', 'upgrades-screen', 'rules-screen', 'settings-screen', 'death-screen'];
  let els = {};
  let listeningForRetryKey = false;
  let activeRetryKeyListener = null;

  function cache() {
    els = {
      hudTop: document.getElementById('hud-top'),
      hudBottom: document.getElementById('hud-bottom'),
      hudMoney: document.getElementById('hudMoneyVal'),
      hudDistance: document.getElementById('hudDistanceVal'),
      hudDifficulty: document.getElementById('hudDifficultyVal'),
      hudCombo: document.getElementById('hudComboVal'),
      progressFill: document.getElementById('progress-fill'),
      muteBtn: document.getElementById('muteBtn'),
      offlineBanner: document.getElementById('offlineBanner'),
      offlineAmount: document.getElementById('offlineAmount'),
      menuMoney: document.getElementById('menuMoney'),
      menuBestDist: document.getElementById('menuBestDist'),
      menuBestDifficulty: document.getElementById('menuBestDifficulty'),
      menuBestCombo: document.getElementById('menuBestCombo'),
      menuAscensions: document.getElementById('menuAscensions'),
      difficultyButtons: document.getElementById('difficultyButtons'),
      btnAscend: document.getElementById('btnAscend'),
      ascendGain: document.getElementById('ascendGain'),
      ascendHint: document.getElementById('ascendHint'),
      upMoney: document.getElementById('upMoney'),
      upgradesList: document.getElementById('upgradesList'),
      deathDistance: document.getElementById('deathDistance'),
      deathBest: document.getElementById('deathBest'),
      deathMoney: document.getElementById('deathMoney'),
      deathCombo: document.getElementById('deathCombo'),
      retryKeyHint: document.getElementById('retryKeyHint'),
      runFlash: document.getElementById('run-flash'),
      musicSlider: document.getElementById('musicVolume'),
      musicSliderVal: document.getElementById('musicVolumeVal'),
      sfxSlider: document.getElementById('sfxVolume'),
      sfxSliderVal: document.getElementById('sfxVolumeVal'),
      settingsMuteToggle: document.getElementById('settingsMuteToggle'),
      retryKeyBtn: document.getElementById('retryKeyBtn'),
      modeAnnounce: document.getElementById('modeAnnounce'),
    };
  }

  const MODE_LABELS = {
    wave: '✦ WAVE ✦', ufo: '✦ OVNI ✦', ship: '✦ VAISSEAU ✦', ball: '✦ BALLE ✦',
    cube: '✦ CUBE ✦', robot: '✦ ROBOT ✦', spider: '✦ ARAIGNÉE ✦',
  };
  const MODE_COLORS = {
    wave: '#4dffc0', ufo: '#4dc9ff', ship: '#ff9d4d', ball: '#ff5d9e',
    cube: '#ffe066', robot: '#9d7bff', spider: '#ff4d4d',
  };
  let modeAnnounceTimer = null;

  function announceText(text, color) {
    const el = els.modeAnnounce;
    if (!el) return;
    clearTimeout(modeAnnounceTimer);
    el.textContent = text;
    el.style.color = color || '#fff';
    el.classList.remove('show', 'hidden');
    void el.offsetWidth; // relance l'animation même si elle est déjà en cours
    el.classList.add('show');
    modeAnnounceTimer = setTimeout(() => el.classList.add('hidden'), 1200);
  }

  function announceMode(mode) {
    announceText(MODE_LABELS[mode] || mode, MODE_COLORS[mode] || '#fff');
  }

  function announceModifier(label, color) {
    announceText('✦ ' + label + ' ✦', color || '#fff');
  }

  function showScreen(id) {
    for (const s of screens) {
      const el = document.getElementById(s);
      if (!el) continue;
      el.classList.toggle('hidden', s !== id);
    }
  }

  function showHud(v) {
    els.hudTop.classList.toggle('hidden', !v);
    els.hudBottom.classList.toggle('hidden', !v);
  }

  function updateHud(run) {
    els.hudMoney.textContent = formatNumber(state.money);
    const distDisplay = Math.floor(run.distanceUnits / 24);
    els.hudDistance.textContent = formatInt(distDisplay);
    els.hudDifficulty.textContent = formatMultiplier(run.difficultyMult);
    els.hudCombo.textContent = run.combo;
    // Barre du bas : progression vers (puis au-delà de) la meilleure distance personnelle.
    const recordProgress = state.bestDistance > 0 ? distDisplay / state.bestDistance : 1;
    els.progressFill.style.width = (Math.min(1, recordProgress) * 100).toFixed(1) + '%';
    els.progressFill.classList.toggle('record', recordProgress >= 1);
  }

  function pulsePerfect() {
    els.hudCombo.parentElement.style.transform = 'scale(1.25)';
    setTimeout(() => { els.hudCombo.parentElement.style.transform = 'scale(1)'; }, 120);
    els.runFlash.style.transition = 'none';
    els.runFlash.style.background = getCssVar('--gold');
    els.runFlash.style.opacity = 0.12;
    requestAnimationFrame(() => {
      els.runFlash.style.transition = 'opacity .25s ease';
      els.runFlash.style.opacity = 0;
    });
  }

  function populateDeathScreen(data) {
    els.deathDistance.textContent = formatInt(data.distance);
    els.deathBest.textContent = formatInt(data.best);
    els.deathMoney.textContent = formatMoney(data.money);
    els.deathCombo.textContent = data.combo;
    if (state.retryKey) {
      els.retryKeyHint.textContent = `Touche rapide : ${keyLabel(state.retryKey)}`;
      els.retryKeyHint.classList.remove('hidden');
    } else {
      els.retryKeyHint.classList.add('hidden');
    }
  }

  function refreshMenu() {
    els.menuMoney.textContent = formatMoney(state.money);
    els.menuBestDist.textContent = formatInt(state.bestDistance);
    const tiers = getAvailableDifficultyTiers();
    els.menuBestDifficulty.textContent = formatMultiplier(tiers[Math.min(state.bestDifficultyIndexReached, tiers.length - 1)]);
    els.menuBestCombo.textContent = state.bestCombo;
    els.menuAscensions.textContent = formatInt(state.ascensions);
    els.upMoney.textContent = formatNumber(state.money);
    refreshDifficultyButtons();
    refreshAscend();
  }

  function refreshDifficultyButtons() {
    const tiers = getAvailableDifficultyTiers();
    els.difficultyButtons.innerHTML = '';
    tiers.forEach((mult, i) => {
      const btn = document.createElement('button');
      const locked = i > derived.maxDifficultyTierIndex;
      btn.className = 'speed-btn' + (locked ? ' locked' : '') + (i === state.selectedDifficultyTier ? ' active' : '');
      btn.textContent = formatMultiplier(mult);
      btn.disabled = locked;
      btn.addEventListener('click', () => {
        state.selectedDifficultyTier = i;
        saveState();
        refreshDifficultyButtons();
      });
      els.difficultyButtons.appendChild(btn);
    });
  }

  function refreshAscend() {
    const gain = computeAscensionGain();
    els.ascendGain.textContent = formatInt(gain);
    els.btnAscend.disabled = gain <= 0;
    els.ascendHint.textContent = gain > 0
      ? 'Réinitialise tes améliorations actives, conserve les Ascensions pour toujours.'
      : 'Atteins au moins ~300 de distance en une partie pour pouvoir ascensionner.';
  }

  function renderUpgrades() {
    els.upgradesList.innerHTML = '';
    for (const key of UPGRADE_ORDER) {
      const def = UPGRADE_DEFS[key];
      const locked = def.locked && def.locked();
      const level = state.upgrades[key];
      const maxed = level >= def.maxLevel();
      const card = document.createElement('div');
      card.className = 'upgrade-card' + (locked ? ' locked' : '');

      const icon = document.createElement('div');
      icon.className = 'upgrade-icon';
      icon.textContent = def.icon;

      const info = document.createElement('div');
      info.className = 'upgrade-info';
      info.innerHTML = `<div class="upgrade-name">${def.name} ${locked ? '🔒' : ''}</div>
        <div class="upgrade-desc">${def.desc}</div>
        <div class="upgrade-level">${locked ? `Débloqué à ${ASCENSION_REFLEX_UNLOCK} ascensions` : def.levelLabel()}</div>`;

      const buy = document.createElement('button');
      buy.className = 'upgrade-buy';
      if (locked) {
        buy.textContent = 'Verrouillé';
        buy.disabled = true;
      } else if (maxed) {
        buy.textContent = 'Max';
        buy.disabled = true;
      } else {
        buy.innerHTML = `Niv. ${level + 1}<br>${formatMoney(upgradeCost(key))}`;
        buy.disabled = !canBuyUpgrade(key);
        buy.addEventListener('click', () => {
          if (buyUpgrade(key)) {
            renderUpgrades();
            refreshMenu();
          }
        });
      }

      card.appendChild(icon);
      card.appendChild(info);
      card.appendChild(buy);
      els.upgradesList.appendChild(card);
    }
  }

  function showOfflineEarnings(amount) {
    if (amount < 1) return;
    els.offlineBanner.classList.remove('hidden');
    els.offlineAmount.textContent = '+' + formatMoney(amount);
  }

  function setMuteIcon() {
    els.muteBtn.textContent = state.muted ? '🔇' : '🔊';
    els.settingsMuteToggle.textContent = state.muted ? '🔇 Son coupé' : '🔊 Son activé';
  }

  // Affiche joliment un KeyboardEvent.code ('KeyR' -> 'R', 'Space' -> 'Espace', ...).
  function keyLabel(code) {
    if (!code) return 'Non configurée';
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    const names = {
      Space: 'Espace', Enter: 'Entrée', ShiftLeft: 'Maj (g)', ShiftRight: 'Maj (d)',
      ControlLeft: 'Ctrl (g)', ControlRight: 'Ctrl (d)', AltLeft: 'Alt (g)', AltRight: 'Alt (d)',
      ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Backspace: 'Retour arrière',
      Comma: ',', Period: '.', Semicolon: ';', Quote: "'", Backquote: '`', Slash: '/', Backslash: '\\',
      BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=', Tab: 'Tab', CapsLock: 'Verr. Maj',
    };
    return names[code] || code;
  }

  function refreshRetryKeyBtn() {
    if (listeningForRetryKey) return;
    els.retryKeyBtn.textContent = state.retryKey ? `Touche : ${keyLabel(state.retryKey)} (changer)` : 'Configurer une touche';
  }

  function cancelRetryKeyListening() {
    if (!listeningForRetryKey) return;
    window.removeEventListener('keydown', activeRetryKeyListener, true);
    activeRetryKeyListener = null;
    listeningForRetryKey = false;
    refreshRetryKeyBtn();
  }

  function startListeningForRetryKey() {
    if (listeningForRetryKey) return;
    listeningForRetryKey = true;
    els.retryKeyBtn.textContent = 'Appuie sur une touche… (Échap pour annuler, Suppr pour effacer)';
    const onKey = (e) => {
      if (e.code === 'Escape') {
        e.preventDefault(); e.stopPropagation();
        cancelRetryKeyListening();
        return;
      }
      if (e.code === 'Delete' || e.code === 'Backspace') {
        e.preventDefault(); e.stopPropagation();
        window.removeEventListener('keydown', onKey, true);
        activeRetryKeyListener = null;
        listeningForRetryKey = false;
        state.retryKey = null;
        saveState();
        refreshRetryKeyBtn();
        Audio2.uiClick();
        return;
      }
      if (isExcludedInputKey(e)) return; // touche réservée (Tab, F5, Ctrl+…) : on ignore et on continue d'écouter
      e.preventDefault();
      e.stopPropagation();
      window.removeEventListener('keydown', onKey, true);
      activeRetryKeyListener = null;
      listeningForRetryKey = false;
      state.retryKey = e.code;
      saveState();
      refreshRetryKeyBtn();
      Audio2.uiClick();
    };
    activeRetryKeyListener = onKey;
    window.addEventListener('keydown', onKey, true);
  }

  function refreshSettingsScreen() {
    els.musicSlider.value = Math.round(state.musicVolume * 100);
    els.musicSliderVal.textContent = Math.round(state.musicVolume * 100) + '%';
    els.sfxSlider.value = Math.round(state.sfxVolume * 100);
    els.sfxSliderVal.textContent = Math.round(state.sfxVolume * 100) + '%';
    setMuteIcon();
    refreshRetryKeyBtn();
  }

  function init() {
    cache();
    showScreen('menu-screen');
    showHud(false);
    applyTheme();

    document.getElementById('btnPlay').addEventListener('click', () => Game.startRun());
    document.getElementById('btnUpgrades').addEventListener('click', () => { renderUpgrades(); showScreen('upgrades-screen'); });
    document.getElementById('btnCloseUpgrades').addEventListener('click', () => { refreshMenu(); showScreen('menu-screen'); });
    document.getElementById('rulesBtn').addEventListener('click', () => showScreen('rules-screen'));
    document.getElementById('btnCloseRules').addEventListener('click', () => { refreshMenu(); showScreen('menu-screen'); });
    document.getElementById('btnRetry').addEventListener('click', () => Game.startRun());
    document.getElementById('btnDeathMenu').addEventListener('click', () => { refreshMenu(); showScreen('menu-screen'); });
    document.getElementById('btnAscend').addEventListener('click', () => {
      if (doAscend()) { refreshMenu(); }
    });
    els.muteBtn.addEventListener('click', () => {
      state.muted = !state.muted;
      Audio2.setMuted(state.muted);
      setMuteIcon();
      saveState();
    });

    document.getElementById('settingsBtn').addEventListener('click', () => {
      Audio2.unlock();
      refreshSettingsScreen();
      showScreen('settings-screen');
    });
    document.getElementById('btnCloseSettings').addEventListener('click', () => { cancelRetryKeyListening(); refreshMenu(); showScreen('menu-screen'); });
    els.musicSlider.addEventListener('input', () => {
      state.musicVolume = els.musicSlider.value / 100;
      els.musicSliderVal.textContent = els.musicSlider.value + '%';
      Audio2.setMusicVolume(state.musicVolume);
      saveState();
    });
    els.sfxSlider.addEventListener('input', () => {
      state.sfxVolume = els.sfxSlider.value / 100;
      els.sfxSliderVal.textContent = els.sfxSlider.value + '%';
      Audio2.setSfxVolume(state.sfxVolume);
    });
    els.sfxSlider.addEventListener('change', () => { Audio2.uiClick(); saveState(); });
    els.settingsMuteToggle.addEventListener('click', () => {
      state.muted = !state.muted;
      Audio2.setMuted(state.muted);
      setMuteIcon();
      saveState();
    });
    els.retryKeyBtn.addEventListener('click', () => startListeningForRetryKey());
    document.getElementById('btnResetSave').addEventListener('click', () => {
      if (confirm('Réinitialiser toute la progression (argent, améliorations, ascensions) ? Cette action est définitive.')) {
        const keepMusic = state.musicVolume, keepSfx = state.sfxVolume, keepMuted = state.muted, keepRetryKey = state.retryKey;
        state = defaultState();
        state.musicVolume = keepMusic;
        state.sfxVolume = keepSfx;
        state.muted = keepMuted;
        state.retryKey = keepRetryKey;
        recomputeDerived();
        applyTheme();
        saveState();
        refreshMenu();
        showScreen('menu-screen');
      }
    });

    setMuteIcon();
    refreshMenu();
  }

  return {
    init, showScreen, showHud, updateHud, populateDeathScreen, pulsePerfect,
    refreshMenu, renderUpgrades, showOfflineEarnings, announceMode, announceModifier,
  };
})();
