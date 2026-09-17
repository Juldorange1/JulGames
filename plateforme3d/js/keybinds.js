// ============================================================================
// ASCENSION — keybinds.js
// Raccourcis clavier reconfigurables : liste des actions, formatage lisible
// d'un code clavier, et l'UI de réassignation (écran Contrôles).
// ============================================================================
window.AS = window.AS || {};

AS.Keybinds = (function () {
  const ACTIONS = [
    { id: 'forward', label: 'Avancer' },
    { id: 'back', label: 'Reculer' },
    { id: 'left', label: 'Aller à gauche' },
    { id: 'right', label: 'Aller à droite' },
    { id: 'jump', label: 'Sauter / double saut / wall-jump' },
    { id: 'dash', label: 'Dash' },
    { id: 'pause', label: 'Pause' },
  ];

  // Deuxième jeu, entièrement séparé : les raccourcis de l'éditeur de
  // niveaux (voir editor.js, qui lit AS.Storage.getEditorKeybinds() au lieu
  // de littéraux figés — plus de raccourcis qu'avant : bascule d'outil,
  // retrait de point au clavier, test rapide, sauvegarde rapide...).
  const EDITOR_ACTIONS = [
    { id: 'panForward', label: 'Caméra : avancer' },
    { id: 'panBack', label: 'Caméra : reculer' },
    { id: 'panLeft', label: 'Caméra : gauche' },
    { id: 'panRight', label: 'Caméra : droite' },
    { id: 'panDown', label: 'Caméra : descendre' },
    { id: 'panUp', label: 'Caméra : monter' },
    { id: 'rotate', label: 'Orienter le bloc / la puissance du vent' },
    { id: 'power', label: 'Puissance (vent) / vitesse (bloc mobile)' },
    { id: 'toggleTool', label: 'Basculer Construire ↔ Sélectionner' },
    { id: 'deselect', label: 'Désélectionner / annuler' },
    { id: 'removeWaypoint', label: 'Retirer le dernier point de passage' },
    { id: 'testLevel', label: 'Tester le niveau' },
    { id: 'quickSave', label: 'Sauvegarder (avec Ctrl)' },
  ];

  // Noms de touches lisibles : traduits via AS.I18n (clé 'key.<code>') pour
  // que le réassignement affiche "Space"/"Esc" en anglais plutôt que
  // "Espace"/"Échap" figés — c'est l'un des points relevés en testant le
  // nouveau sélecteur de langue (voir js/i18n.js pour la liste complète).
  const KNOWN_CODES = [
    'Space', 'Escape', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight',
    'AltLeft', 'AltRight', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'Tab', 'Enter', 'Backquote',
  ];

  function labelForCode(code) {
    if (!code) return '—';
    if (KNOWN_CODES.includes(code)) return AS.I18n.t('key.' + code);
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    return code;
  }

  // Construit une liste de réassignation générique dans `container`, pour
  // n'importe quel jeu d'actions/stockage (jeu ou éditeur — voir buildUI et
  // buildEditorUI plus bas, deux fines enveloppes autour de cette même
  // logique). `onChange(action,code)` est appelé après chaque modification.
  function buildGeneric(actions, getBinds, setBind, resetBinds, container, onChange) {
    if (container.__cleanup) container.__cleanup();
    container.innerHTML = '';
    const binds = getBinds();
    let listeningRow = null;

    actions.forEach((action) => {
      const row = document.createElement('div');
      row.className = 'keybind-row';

      const label = document.createElement('span');
      label.className = 'keybind-label';
      label.textContent = AS.I18n.t('kb.' + action.id);

      const btn = document.createElement('button');
      btn.className = 'keybind-btn';
      btn.type = 'button';
      btn.textContent = labelForCode(binds[action.id]);

      btn.addEventListener('click', () => {
        if (listeningRow && listeningRow !== btn) listeningRow.classList.remove('listening');
        listeningRow = btn;
        btn.classList.add('listening');
        btn.textContent = '...';
      });

      row.appendChild(label);
      row.appendChild(btn);
      container.appendChild(row);

      row.__btn = btn;
      row.__action = action.id;
    });

    function captureKey(e) {
      if (!listeningRow) return;
      e.preventDefault();
      if (e.code === 'Escape' && listeningRow.textContent === '...') {
        // Échap pendant l'écoute : annule (garde l'ancienne touche)
        const binds2 = getBinds();
        const actionId = [...container.children].find((r) => r.__btn === listeningRow).__action;
        listeningRow.textContent = labelForCode(binds2[actionId]);
        listeningRow.classList.remove('listening');
        listeningRow = null;
        return;
      }
      const rowEl = [...container.children].find((r) => r.__btn === listeningRow);
      const actionId = rowEl.__action;
      setBind(actionId, e.code);
      listeningRow.textContent = labelForCode(e.code);
      listeningRow.classList.remove('listening');
      listeningRow = null;
      if (onChange) onChange(actionId, e.code);
    }

    window.addEventListener('keydown', captureKey, true);
    container.__cleanup = () => window.removeEventListener('keydown', captureKey, true);

    return {
      resetAll: () => {
        resetBinds();
        buildGeneric(actions, getBinds, setBind, resetBinds, container, onChange);
      },
    };
  }

  // Jeu de raccourcis "Général" (déplacement/saut/dash/pause en jeu).
  function buildUI(container, onChange) {
    return buildGeneric(ACTIONS, AS.Storage.getKeybinds, AS.Storage.setKeybind, AS.Storage.resetKeybinds, container, onChange);
  }

  // Jeu de raccourcis "Éditeur de niveaux" — entièrement séparé du premier.
  function buildEditorUI(container, onChange) {
    return buildGeneric(EDITOR_ACTIONS, AS.Storage.getEditorKeybinds, AS.Storage.setEditorKeybind, AS.Storage.resetEditorKeybinds, container, onChange);
  }

  return { ACTIONS, EDITOR_ACTIONS, labelForCode, buildUI, buildEditorUI };
})();
